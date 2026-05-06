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

func (s *Service) Vote(ctx context.Context, userID, commentID string, value int) (int, error) {
	// 1. Выполняем голосование
	newRating, err := s.repo.Vote(ctx, userID, commentID, value)
	if err != nil {
		return 0, err
	}

	// 2. Уведомляем ВСЕХ об изменении рейтинга комментария
	publicMsg := map[string]interface{}{
		"type":       "COMMENT_RATING_UPDATE",
		"comment_id": commentID,
		"new_rating": newRating,
	}
	publicPayload, _ := json.Marshal(publicMsg)
	s.chatHub.Broadcast(publicPayload) // Отправляем всем онлайн-пользователям

	// 3. Получаем автора комментария и считаем его новую карму
	authorID, err := s.repo.GetCommentAuthor(ctx, commentID)
	if err == nil {
		totalKarma, err := s.repo.CalculateUserTotalKarma(ctx, authorID)
		if err == nil {
			// Отправляем уведомление автору через WebSocket
			msg := map[string]interface{}{
				"type":      "KARMA_UPDATE",
				"new_karma": totalKarma,
			}
			payload, _ := json.Marshal(msg)
			s.chatHub.BroadcastToUser(authorID, payload)
		}
	}

	return newRating, nil
}
