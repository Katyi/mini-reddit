package post

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

func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	// var input Post
	var input struct {
		Title       string `json:"title"`
		Content     string `json:"content"`
		CommunityID string `json:"community_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	authorID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	post, err := h.service.CreatePost(r.Context(), input.Title, input.Content, authorID, input.CommunityID)
	if err != nil {
		http.Error(w, "failed to create post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

func (h *Handler) GetAllPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := h.service.GetAllPosts(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch posts", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

func (h *Handler) GetPostByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	// if err != nil {
	// 	http.Error(w, "invalid id format", http.StatusBadRequest)
	// 	return
	// }

	post, err := h.service.GetPostByID(r.Context(), id)
	if err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

func (h *Handler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var input Post
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	post, err := h.service.UpdatePost(r.Context(), id, input.Title, input.Content, userID)
	if err != nil {
		if err.Error() == "you are not the author of this post" {
			http.Error(w, err.Error(), http.StatusForbidden) // 403 Forbidden
			return
		}
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	err := h.service.DeletePost(r.Context(), id, userID)
	if err != nil {
		// Проверяем, какая именно ошибка вернулась
		if err.Error() == "you are not the author of this post" {
			http.Error(w, err.Error(), http.StatusForbidden) // 403 Forbidden
			return
		}
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetPostsByCommunity(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	communityID := vars["id"]

	posts, err := h.service.GetPostsByCommunity(r.Context(), communityID)
	if err != nil {
		http.Error(w, "failed to fetch posts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}
