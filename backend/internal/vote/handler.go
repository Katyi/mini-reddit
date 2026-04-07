package vote

import (
	"encoding/json"
	"net/http"

	"github.com/Katyi/mini-reddit/backend/internal/user"
	"github.com/gorilla/mux"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Vote(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID := vars["id"]

	// Получаем ID пользователя из контекста (через AuthMiddleware)
	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var input struct {
		Value int `json:"value"` // Ждем 1 или -1
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация: разрешаем только 1 и -1
	if input.Value != 1 && input.Value != -1 {
		http.Error(w, "value must be 1 or -1", http.StatusBadRequest)
		return
	}

	err := h.service.Vote(r.Context(), userID, postID, input.Value)
	if err != nil {
		http.Error(w, "failed to vote", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success"}`))
}
