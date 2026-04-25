package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

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
}

func NewHub(repo *Repository) *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan Message),
		repo:       repo,
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
			// 1. Сохраняем в базу (чтобы не пропало)
			savedMsg, err := h.repo.SaveMessage(context.Background(), msg)
			if err != nil {
				fmt.Printf("Error saving message: %v\n", err)
				continue
			}

			// 2. Отправляем получателю, если он в сети
			h.mu.Lock()
			if recipient, ok := h.clients[savedMsg.ReceiverID]; ok {
				payload, _ := json.Marshal(savedMsg)
				recipient.Send <- payload
			}

			// 3. Отправляем копию отправителю (чтобы подтвердить доставку)
			if sender, ok := h.clients[savedMsg.SenderID]; ok {
				payload, _ := json.Marshal(savedMsg)
				sender.Send <- payload
			}
			h.mu.Unlock()
		}
	}
}
