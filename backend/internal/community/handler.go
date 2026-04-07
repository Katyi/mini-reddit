package community

import (
	"encoding/json"
	"net/http"

	"github.com/Katyi/mini-reddit/backend/internal/user"
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
