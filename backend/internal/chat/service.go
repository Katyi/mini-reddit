package chat

import (
	"context"

	"github.com/Katyi/mini-reddit/backend/internal/user"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetHistory(ctx context.Context, user1, user2 string, limit, offset int) ([]Message, error) {
	return s.repo.GetChatHistory(ctx, user1, user2, limit, offset)
}

// Мы не делаем метод SendMessage в сервисе для WebSocket,
// так как Hub сам вызывает repo.SaveMessage, чтобы избежать лишних задержек.

func (s *Service) GetActiveChats(ctx context.Context, userID string) ([]user.User, error) {
	return s.repo.GetActiveChats(ctx, userID)
}
