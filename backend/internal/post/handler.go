package post

import (
	"encoding/json"
	"net/http"
	"strconv"

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
	query := r.URL.Query()
	search := query.Get("search")
	sortBy := query.Get("sort") // "new" или "top"

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 10
	} // ограничиваем максимум

	offset := (page - 1) * limit

	userID, _ := r.Context().Value(user.UserIDKey).(string)

	posts, err := h.service.GetAllPosts(r.Context(), userID, search, sortBy, limit, offset)
	if err != nil {
		http.Error(w, "failed to fetch posts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if posts == nil {
		posts = []Post{}
	}
	json.NewEncoder(w).Encode(posts)
}

func (h *Handler) GetPostByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	userID, _ := r.Context().Value(user.UserIDKey).(string)

	post, err := h.service.GetPostByID(r.Context(), id, userID)
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

	query := r.URL.Query()
	search := query.Get("search")
	sortBy := query.Get("sort")

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	userID, _ := r.Context().Value(user.UserIDKey).(string)

	posts, err := h.service.GetPostsByCommunity(r.Context(), communityID, userID, search, sortBy, limit, offset)
	if err != nil {
		http.Error(w, "failed to fetch posts", http.StatusInternalServerError)
		return
	}

	if posts == nil {
		posts = []Post{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}
