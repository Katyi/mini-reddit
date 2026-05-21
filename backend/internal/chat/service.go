package chat

import (
	"context"
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

func (s *Service) GetActiveChats(ctx context.Context, userID string) ([]ChatSummary, error) {
	users, err := s.repo.GetActiveChats(ctx, userID)
	if err != nil {
		return nil, err
	}

	unreadMap, err := s.repo.GetUnreadCounts(ctx, userID)
	if err != nil {
		return nil, err
	}

	var summaries []ChatSummary
	for _, u := range users {
		summaries = append(summaries, ChatSummary{
			User:        u,
			UnreadCount: unreadMap[u.ID],
		})
	}

	return summaries, nil
}

// MarkAsRead помечает сообщения от конкретного отправителя как прочитанные
func (s *Service) MarkAsRead(ctx context.Context, senderID, receiverID string) error {
	return s.repo.MarkAsRead(ctx, senderID, receiverID)
}
