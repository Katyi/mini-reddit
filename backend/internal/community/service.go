package community

import "context"

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateCommunity(ctx context.Context, name, description, ownerID string) (Community, error) {
	return s.repo.Create(ctx, Community{
		Name:        name,
		Description: description,
		OwnerID:     ownerID,
	})
}

func (s *Service) GetAllCommunities(ctx context.Context) ([]Community, error) {
	return s.repo.GetAll(ctx)
}
