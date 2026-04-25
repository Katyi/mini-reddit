package chat

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/Katyi/mini-reddit/backend/internal/user"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// На этапе разработки разрешаем всем (CORS)
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Handler struct {
	service *Service
	hub     *Hub
}

func NewHandler(service *Service, hub *Hub) *Handler {
	return &Handler{service: service, hub: hub}
}

// WSHandler — точка входа для WebSocket
func (h *Handler) WSHandler(w http.ResponseWriter, r *http.Request) {
	// Достаем ID пользователя из контекста (Middleware уже отработал)
	userID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// «Прокачиваем» соединение
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		ID:   userID,
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	// Регистрируем клиента в хабе
	h.hub.register <- client

	// Запускаем два бесконечных цикла в горутинах:
	// Один слушает, что пишет клиент, другой — отправляет клиенту данные из канала Send
	go h.writePump(client)
	go h.readPump(client)
}

// GetHistory — обычный HTTP запрос для загрузки старых сообщений
func (h *Handler) GetHistory(w http.ResponseWriter, r *http.Request) {
	myID, _ := r.Context().Value(user.UserIDKey).(string)
	vars := mux.Vars(r)
	otherID := vars["userId"]

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 50
	}

	messages, err := h.service.GetHistory(r.Context(), myID, otherID, limit, 0)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *Handler) readPump(c *Client) {
	defer func() {
		h.hub.unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Принудительно ставим ID отправителя из токена (безопасность!)
		msg.SenderID = c.ID

		// Отправляем в Hub на обработку и рассылку
		h.hub.broadcast <- msg
	}
}

func (h *Handler) writePump(c *Client) {
	defer c.Conn.Close()
	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		c.Conn.WriteMessage(websocket.TextMessage, message)
	}
}

// GetActiveChats возвращает список пользователей, с которыми у текущего юзера есть диалоги
func (h *Handler) GetActiveChats(w http.ResponseWriter, r *http.Request) {
	// 1. Извлекаем ID текущего пользователя из контекста (через AuthMiddleware)
	myID, ok := r.Context().Value(user.UserIDKey).(string)
	if !ok || myID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Вызываем сервис (который вызывает ваш репозиторий)
	users, err := h.service.GetActiveChats(r.Context(), myID)
	if err != nil {
		http.Error(w, "Failed to get active chats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 3. Отправляем JSON ответ
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(users); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
