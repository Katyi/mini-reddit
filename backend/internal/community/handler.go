package community

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Katyi/mini-reddit/backend/internal/user"
	"github.com/gorilla/mux"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	c, err := h.service.CreateCommunity(r.Context(), input.Name, input.Description, userID)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			http.Error(w, err.Error(), http.StatusConflict) // 409
			return
		}
		http.Error(w, "failed to create community", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func (h *Handler) GetAll(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.GetAllCommunities(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch communities", http.StatusInternalServerError)
		return
	}

	// Тот самый "маленький совет": возвращаем [] вместо null
	if list == nil {
		list = []Community{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

// func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
// 	id := mux.Vars(r)["id"]

// 	var input struct {
// 		Description string `json:"description"`
// 	}
// 	json.NewDecoder(r.Body).Decode(&input)

// 	userID := r.Context().Value(user.UserIDKey).(string)

// 	if err := h.service.UpdateCommunity(r.Context(), id, input.Description, userID); err != nil {
// 		http.Error(w, err.Error(), http.StatusForbidden)
// 		return
// 	}
// 	w.WriteHeader(http.StatusNoContent)
// }

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	var input struct {
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	// Достаем ID юзера, который прислал запрос
	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Передаем ID сообщества, новое описание И того, кто пытается это сделать
	err := h.service.UpdateCommunity(r.Context(), id, input.Description, userID)
	if err != nil {
		if err.Error() == "forbidden" {
			http.Error(w, "not an owner", http.StatusForbidden)
			return
		}
		http.Error(w, "failed update", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	// 1. Получаем ID из URL (например, /communities/123)
	vars := mux.Vars(r)
	id := vars["id"]

	// 2. Получаем ID текущего юзера из контекста (спасибо AuthMiddleware)
	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 3. Вызываем сервис (в сервисе мы проверим, является ли юзер владельцем)
	err := h.service.DeleteCommunity(r.Context(), id, userID)
	if err != nil {
		// Если сервис вернул ошибку "forbidden", отправляем 403
		if err.Error() == "forbidden" {
			http.Error(w, "you are not the owner of this community", http.StatusForbidden)
			return
		}
		http.Error(w, "failed to delete community", http.StatusInternalServerError)
		return
	}

	// 4. Возвращаем 204 No Content (успешное удаление без тела ответа)
	w.WriteHeader(http.StatusNoContent)
}

// Полезный метод: получить инфо о сообществе по имени
func (h *Handler) GetByName(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["name"]

	c, err := h.service.GetCommunityByName(r.Context(), name)
	if err != nil {
		http.Error(w, "community not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
}

func (h *Handler) GetById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	c, err := h.service.GetCommunityByID(r.Context(), id)
	if err != nil {
		http.Error(w, "community not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)

}
