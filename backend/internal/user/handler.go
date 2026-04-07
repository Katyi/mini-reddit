package user

import (
	"encoding/json"
	"net/http"
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

	user, token, err := h.service.RegisterUser(r.Context(), input.Username, input.Email, input.Password)
	if err != nil {
		http.Error(w, "registration failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// json.NewEncoder(w).Encode(user)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":  user,
		"token": token,
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

	token, err := h.service.LoginUser(r.Context(), input.Email, input.Password)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token": token,
	})
}
