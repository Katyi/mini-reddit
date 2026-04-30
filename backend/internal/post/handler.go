package post

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

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
	// Parse multipart form (max file size, for example 10MB)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Error reading form", http.StatusBadRequest)
		return
	}

	// Получаем текстовые данные
	title := r.FormValue("title")
	content := r.FormValue("content")
	communityID := r.FormValue("community_id")

	// Обрабатываем файл
	file, header, err := r.FormFile("image")
	var imageURL string

	if err == nil { // Если файл прикрепили
		defer file.Close()

		// Генерируем уникальное имя файла (timestamp + оригинальное имя)
		fileName := fmt.Sprintf("%d-%s", time.Now().Unix(), header.Filename)
		// filePath := "./uploads/" + fileName

		uploadDir := os.Getenv("UPLOAD_DIR")
		if uploadDir == "" {
			uploadDir = "./uploads"
		}
		filePath := uploadDir + "/" + fileName

		// Создаем файл на диске
		dst, err := os.Create(filePath)
		if err != nil {
			http.Error(w, "Ошибка при сохранении файла", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, "Ошибка при копировании файла", http.StatusInternalServerError)
			return
		}

		// Формируем путь для сохранения в БД
		imageURL = "/uploads/" + fileName
	}

	authorID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	post, err := h.service.CreatePost(r.Context(), title, content, imageURL, authorID, communityID)
	if err != nil {
		http.Error(w, "failed to create post", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(post)
}

func (h *Handler) GetAllPosts(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(user.UserIDKey).(string)

	query := r.URL.Query()
	authorID := query.Get("author_id") // Получаем ID автора из URL
	search := query.Get("search")
	sortBy := query.Get("sort") // "new" или "top"

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 50
	} // ограничиваем максимум

	offset := (page - 1) * limit

	// userID, _ := r.Context().Value(user.UserIDKey).(string)

	posts, err := h.service.GetAllPosts(r.Context(), userID, authorID, search, sortBy, limit, offset)
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

	// 1. Парсим форму (как в CreatePost)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Error reading form", http.StatusBadRequest)
		return
	}

	// 2. Получаем ID пользователя из контекста
	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 3. Сначала получаем текущие данные поста, чтобы узнать старый ImageURL
	oldPost, err := h.service.GetPostByID(r.Context(), id, userID)
	if err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	title := r.FormValue("title")
	if title == "" {
		title = oldPost.Title
	}
	content := r.FormValue("content")
	if content == "" {
		content = oldPost.Content
	}
	deleteImage := r.FormValue("delete_image") == "true" // Проверяем флаг удаления

	newImageURL := oldPost.ImageURL // По умолчанию оставляем старую картинку

	// 4. Обрабатываем новый файл, если он есть
	file, header, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		// Удаляем старую перед записью новой
		if oldPost.ImageURL != "" {
			os.Remove("." + oldPost.ImageURL)
		}

		// Генерируем новое имя
		fileName := fmt.Sprintf("%d-%s", time.Now().Unix(), header.Filename)
		newImageURL = "/uploads/" + fileName

		uploadDir := os.Getenv("UPLOAD_DIR")
		if uploadDir == "" {
			uploadDir = "./uploads"
		}

		// dst, _ := os.Create("./uploads/" + fileName)
		dst, _ := os.Create(uploadDir + "/" + fileName) // Правильно
		defer dst.Close()
		io.Copy(dst, file)

	} else if deleteImage {
		// Если файла нет, но стоит флаг удаления
		if oldPost.ImageURL != "" {
			os.Remove("." + oldPost.ImageURL)
		}
		newImageURL = "" // Записываем в базу пустую строку
	}

	// 5. Вызываем сервис (не забудь обновить сигнатуру UpdatePost в сервисе, если нужно)
	updatedPost, err := h.service.UpdatePost(r.Context(), id, title, content, newImageURL, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedPost)
}

func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 1. Сначала получаем данные поста, чтобы узнать путь к картинке
	post, err := h.service.GetPostByID(r.Context(), id, userID)
	if err != nil {
		http.Error(w, "post not found", http.StatusNotFound)
		return
	}

	// 2. Пытаемся удалить пост из базы
	err = h.service.DeletePost(r.Context(), id, userID)
	if err != nil {
		if err.Error() == "you are not the author of this post" {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		http.Error(w, "failed to delete post", http.StatusInternalServerError)
		return
	}

	// 3. ЕСЛИ удаление из базы прошло успешно — удаляем файл с диска
	if post.ImageURL != "" {
		// Превращаем "/uploads/name.jpg" в "./uploads/name.jpg"
		filePath := "." + post.ImageURL
		err := os.Remove(filePath)
		if err != nil {
			fmt.Printf("Warning: failed to delete file %s: %v\n", filePath, err)
			// Мы не кидаем ошибку клиенту, так как пост в БД уже удален.
			// Просто логируем, что файл остался "мусором".
		}
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
		limit = 50
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
