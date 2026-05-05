package user

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	// user, err := h.service.RegisterUser(r.Context(), input.Username, input.Email, input.Password)
	// if err != nil {
	// 	http.Error(w, "could not register user", http.StatusInternalServerError)
	// 	return
	// }

	user, access, refresh, err := h.service.RegisterUser(r.Context(), input.Username, input.Email, input.Password)
	if err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "users_email_key") {
			http.Error(w, "Email is already taken", http.StatusConflict) // 409
			return
		}
		if strings.Contains(errMsg, "users_username_key") {
			http.Error(w, "Username is already taken", http.StatusConflict) // 409
			return
		}

		http.Error(w, "could not register user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// json.NewEncoder(w).Encode(user)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":          user,
		"access_token":  access,  // Добавляем в ответ
		"refresh_token": refresh, // Добавляем в ответ
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	user, access, refresh, err := h.service.LoginUser(r.Context(), input.Email, input.Password)
	if err != nil {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":          user,
		"access_token":  access,
		"refresh_token": refresh,
	})
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	access, refresh, err := h.service.RefreshToken(input.RefreshToken)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access_token":  access,
		"refresh_token": refresh,
	})
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]

	user, err := h.service.GetUserProfile(r.Context(), username)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.service.GetAllUsers(r.Context())
	if err != nil {
		http.Error(w, "Could not fetch users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *Handler) UpdateAvatar(w http.ResponseWriter, r *http.Request) {
	// 1. Извлекаем ID текущего юзера из контекста (спасибо AuthMiddleware)
	userID, ok := r.Context().Value(UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Читаем URL аватарки из тела запроса
	var input struct {
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid input", http.StatusBadRequest)
		return
	}

	// 3. Вызываем сервис
	err := h.service.UpdateAvatar(r.Context(), userID, input.AvatarURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 4. Отвечаем успехом
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":    "Avatar updated successfully",
		"avatar_url": input.AvatarURL,
	})
}
