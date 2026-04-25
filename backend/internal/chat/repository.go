package chat

import (
	"context"
	"fmt"

	"github.com/Katyi/mini-reddit/backend/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// SaveMessage сохраняет сообщение в базу данных
func (r *Repository) SaveMessage(ctx context.Context, msg Message) (Message, error) {
	query := `
		INSERT INTO messages (sender_id, receiver_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, is_read, created_at`

	err := r.db.QueryRow(ctx, query, msg.SenderID, msg.ReceiverID, msg.Content).
		Scan(&msg.ID, &msg.IsRead, &msg.CreatedAt)

	if err != nil {
		return Message{}, fmt.Errorf("failed to save message: %w", err)
	}

	return msg, nil
}

// GetChatHistory возвращает историю сообщений между двумя пользователями
func (r *Repository) GetChatHistory(ctx context.Context, user1, user2 string, limit, offset int) ([]Message, error) {
	query := `
		SELECT id, sender_id, receiver_id, content, is_read, created_at
		FROM messages
		WHERE (sender_id = $1 AND receiver_id = $2)
		   OR (sender_id = $2 AND receiver_id = $1)
		ORDER BY created_at ASC
		LIMIT $3 OFFSET $4`

	rows, err := r.db.Query(ctx, query, user1, user2, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch history: %w", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		err := rows.Scan(&m.ID, &m.SenderID, &m.ReceiverID, &m.Content, &m.IsRead, &m.CreatedAt)
		if err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}

	return messages, nil
}

// MarkAsRead помечает сообщения как прочитанные (пригодится для уведомлений)
func (r *Repository) MarkAsRead(ctx context.Context, senderID, receiverID string) error {
	query := `
		UPDATE messages 
		SET is_read = true 
		WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`

	_, err := r.db.Exec(ctx, query, senderID, receiverID)
	return err
}

// GetActiveChats возвращает список пользователей, с которыми был диалог
func (r *Repository) GetActiveChats(ctx context.Context, userID string) ([]user.User, error) {
	query := `
		SELECT DISTINCT u.id, u.username, u.email, u.created_at
		FROM users u
		JOIN messages m ON (m.sender_id = u.id OR m.receiver_id = u.id)
		WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND u.id != $1
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []user.User
	for rows.Next() {
		var u user.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}
