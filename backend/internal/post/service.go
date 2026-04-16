package post

import (
	"context"
	"errors"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreatePost(ctx context.Context, title, content string, authorID string, communityID string) (Post, error) {
	return s.repo.Create(ctx, Post{Title: title, Content: content, AuthorID: authorID, CommunityID: communityID})
}

func (s *Service) GetAllPosts(ctx context.Context, userID string) ([]Post, error) {
	return s.repo.GetAll(ctx, userID)
}

func (s *Service) GetPostByID(ctx context.Context, id string, userID string) (Post, error) {
	return s.repo.GetByID(ctx, id, userID) // Передаем id правильно
}

func (s *Service) UpdatePost(ctx context.Context, id string, title, content string, requesterID string) (Post, error) {
	post, err := s.repo.GetByID(ctx, id, requesterID)
	if err != nil {
		return Post{}, err
	}

	if post.AuthorID != requesterID {
		return Post{}, errors.New("you are not the author of this post")
	}

	return s.repo.Update(ctx, id, Post{Title: title, Content: content})
}

func (s *Service) DeletePost(ctx context.Context, id string, requesterID string) error {
	post, err := s.repo.GetByID(ctx, id, requesterID)
	if err != nil {
		return err
	}

	if post.AuthorID != requesterID {
		return errors.New("you are not the author of this post")
	}

	return s.repo.Delete(ctx, id)
}

func (s *Service) GetPostsByCommunity(ctx context.Context, communityID string, userID string) ([]Post, error) {
	return s.repo.GetByCommunityID(ctx, communityID, userID)
}
