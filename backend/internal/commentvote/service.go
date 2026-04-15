package commentvote

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Vote(ctx context.Context, userID, commentID string, value int) error {
	// Здесь можно добавить проверку: существует ли вообще такой пост,
	// но наш SQL с foreign key и так выдаст ошибку, если поста нет.
	return s.repo.Vote(ctx, userID, commentID, value)
}
