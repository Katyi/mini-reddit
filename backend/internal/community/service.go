package community

import (
	"context"
	"fmt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateCommunity(ctx context.Context, name, description, ownerID string) (Community, error) {
	existing, _ := s.repo.GetByName(ctx, name)
	if existing.ID != "" {
		return Community{}, fmt.Errorf("community with name '%s' already exists", name)
	}

	return s.repo.Create(ctx, Community{
		Name:        name,
		Description: description,
		OwnerID:     ownerID,
	})
}

func (s *Service) GetAllCommunities(ctx context.Context) ([]Community, error) {
	return s.repo.GetAll(ctx)
}

func (s *Service) UpdateCommunity(ctx context.Context, id, description, userID string) error {
	comm, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if comm.OwnerID != userID {
		return fmt.Errorf("forbidden")
	}
	return s.repo.Update(ctx, Community{ID: id, Description: description})
}

func (s *Service) DeleteCommunity(ctx context.Context, id, userID string) error {
	comm, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if comm.OwnerID != userID {
		return fmt.Errorf("forbidden")
	}
	return s.repo.Delete(ctx, id)
}

func (s *Service) GetCommunityByName(ctx context.Context, name string) (Community, error) {
	return s.repo.GetByName(ctx, name)
}
