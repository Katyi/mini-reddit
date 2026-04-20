package comment

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

func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID := vars["id"]

	// var input Comment
	var input struct {
		Content  string  `json:"content"`
		ParentID *string `json:"parent_id"`
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

	comment, err := h.service.CreateComment(r.Context(), input.Content, authorID, postID, input.ParentID)
	if err != nil {
		http.Error(w, "failed to create post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

func (h *Handler) GetCommentsByPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID := vars["id"]

	q := r.URL.Query()
	search := q.Get("search")
	sort := q.Get("sort")

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}

	// limit := 20 // Для комментариев можно лимит побольше, чем для постов
	limit, err := strconv.Atoi(q.Get("limit"))
	if err != nil || limit <= 0 {
		limit = 20 // дефолт, если в запросе пусто или абракадабра
	}
	if limit > 100 {
		limit = 100 // защита: не даем юзеру запросить миллион строк за раз
	}

	offset := (page - 1) * limit

	userID, _ := r.Context().Value(user.UserIDKey).(string)

	comments, err := h.service.GetCommentsByPostID(r.Context(), postID, userID, search, sort, limit, offset)
	if err != nil {
		http.Error(w, "failed to fetch comments", http.StatusInternalServerError)
		return
	}

	if comments == nil {
		comments = []Comment{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

func (h *Handler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"] // ID комментария

	var input Comment
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	comment, err := h.service.UpdateComment(r.Context(), id, input.Content, userID)
	if err != nil {
		// Если сервис вернул ошибку про автора, отдаем 403 Forbidden
		if err.Error() == "you are not the author of this comment" {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, "comment not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comment)
}

func (h *Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	err := h.service.DeleteComment(r.Context(), id, userID)
	if err != nil {
		if err.Error() == "you are not the author of this comment" {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, "comment not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
