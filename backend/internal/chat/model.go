package chat

import (
	"time"

	"github.com/Katyi/mini-reddit/backend/internal/user"
)

type Message struct {
	ID         string    `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}

type ChatSummary struct {
	user.User
	UnreadCount int `json:"unread_count"`
}
