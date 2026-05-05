package vote

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

func (s *Service) Vote(ctx context.Context, userID, postID string, value int) (int, error) {
	// 1. Проводим голосование как обычно
	newRating, err := s.repo.Vote(ctx, userID, postID, value)
	if err != nil {
		return 0, err
	}

	// 2. Получаем автора поста (нужно добавить такой метод в репозиторий или здесь)
	authorID, _ := s.repo.GetPostAuthor(ctx, postID)

	// 3. Считаем новую общую карму автора
	// Используем тот же метод CalculateTotalKarma, который мы обсуждали для репозитория user
	totalKarma, _ := s.repo.CalculateUserTotalKarma(ctx, authorID)

	// 4. Отправляем автору уведомление через WebSocket хаб
	msg := map[string]interface{}{
		"type":      "KARMA_UPDATE",
		"new_karma": totalKarma,
	}
	payload, _ := json.Marshal(msg)
	s.chatHub.BroadcastToUser(authorID, payload)

	return newRating, nil
}
