package commentvote

import (
	"context"
	"encoding/json"

	"github.com/Katyi/mini-reddit/backend/internal/chat"
)

type Service struct {
	repo    *Repository
	chatHub *chat.Hub
}

func NewService(repo *Repository, chatHub *chat.Hub) *Service {
	return &Service{
		repo:    repo,
		chatHub: chatHub,
	}
}

func (s *Service) Vote(ctx context.Context, userID, commentID string, value int) error {
	// 1. Выполняем голосование
	err := s.repo.Vote(ctx, userID, commentID, value)
	if err != nil {
		return err
	}

	// 2. Получаем автора комментария и считаем его новую карму
	authorID, err := s.repo.GetCommentAuthor(ctx, commentID)
	if err == nil {
		totalKarma, err := s.repo.CalculateUserTotalKarma(ctx, authorID)
		if err == nil {
			// 3. Отправляем уведомление автору через WebSocket
			msg := map[string]interface{}{
				"type":      "KARMA_UPDATE",
				"new_karma": totalKarma,
			}
			payload, _ := json.Marshal(msg)
			s.chatHub.BroadcastToUser(authorID, payload)
		}
	}

	return nil
}
