package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/Katyi/mini-reddit/backend/internal/ai"
	"github.com/gorilla/websocket"
)

const AI_BOT_ID = "00000000-0000-0000-0000-000000000000" // Тот самый фиксированный ID

// Client представляет собой одно активное соединение
type Client struct {
	ID   string
	Conn *websocket.Conn
	Send chan []byte
}

type Hub struct {
	// Подключенные клиенты: карта [userID] -> *Client
	clients    map[string]*Client
	register   chan *Client
	unregister chan *Client
	broadcast  chan Message
	repo       *Repository
	mu         sync.Mutex
	aiService  *ai.Service
}

func NewHub(repo *Repository, aiService *ai.Service) *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Message),
		repo:       repo,
		aiService:  aiService,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()
			fmt.Printf("User %s connected\n", client.ID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				delete(h.clients, client.ID)
				close(client.Send)
			}
			h.mu.Unlock()
			fmt.Printf("User %s disconnected\n", client.ID)

		case msg := <-h.broadcast:
			// fmt.Printf("DEBUG: Saving message. Sender: %s, Receiver: %s\n", msg.SenderID, msg.ReceiverID)

			// 1. Сохраняем в базу (чтобы не пропало)
			savedMsg, err := h.repo.SaveMessage(context.Background(), msg)
			if err != nil {
				fmt.Printf("Error saving message: %v\n", err)
				continue
			}

			// 2. Рассылаем сообщение (отправителю и получателю, если онлайн)
			h.distributeMessage(savedMsg)

			// 3. ПРОВЕРКА НА AI: Если получатель сообщения — наш бот
			if savedMsg.ReceiverID == AI_BOT_ID {
				go func(userMsg Message) {
					// Вызываем Groq через наш сервис
					answer, err := h.aiService.AskAI(userMsg.Content)
					if err != nil {
						fmt.Printf("AI Error: %v\n", err)
						answer = "Извини, мой искусственный мозг временно недоступен."
					}

					// Создаем ответное сообщение от бота
					aiMsg := Message{
						SenderID:   AI_BOT_ID,
						ReceiverID: userMsg.SenderID,
						Content:    answer,
					}

					// Сохраняем ответ бота в БД
					savedAiMsg, _ := h.repo.SaveMessage(context.Background(), aiMsg)

					// Отправляем ответ пользователю через сокет
					h.distributeMessage(savedAiMsg)
				}(savedMsg)
			}
		}
	}
}

func (h *Hub) BroadcastToUser(userID string, payload []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if client, ok := h.clients[userID]; ok {
		client.Send <- payload
	}
}

func (h *Hub) Broadcast(payload []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Просто проходим циклом по всем подключенным и отправляем им данные
	for _, client := range h.clients {
		select {
		case client.Send <- payload:
		default:
			// Если канал клиента забит, закрываем его, чтобы не тормозить остальных
			close(client.Send)
			delete(h.clients, client.ID)
		}
	}
}

func (h *Hub) distributeMessage(msg Message) {
	h.mu.Lock()
	defer h.mu.Unlock()

	payload, _ := json.Marshal(msg)

	// Отправляем получателю
	if recipient, ok := h.clients[msg.ReceiverID]; ok {
		recipient.Send <- payload
	}
	// Отправляем отправителю (для подтверждения)
	if sender, ok := h.clients[msg.SenderID]; ok {
		sender.Send <- payload
	}
}
