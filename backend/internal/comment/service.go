package comment

import (
	"context"
	"errors"
	"fmt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateComment(ctx context.Context, content string, authorID string, postID string, parentID *string) (Comment, error) {
	return s.repo.Create(ctx, Comment{Content: content, AuthorID: authorID, PostID: postID, ParentID: parentID})
}

func (s *Service) GetCommentsByPostID(ctx context.Context, postId string) ([]Comment, error) {
	return s.repo.GetByPostID(ctx, postId)
}

func (s *Service) DeleteComment(ctx context.Context, commentID string, requesterID string) error {
	// 1. Находим коммент
	c, err := s.repo.GetByID(ctx, commentID)
	if err != nil {
		return err
	}

	// 2. Проверяем автора
	if c.AuthorID != requesterID {
		return fmt.Errorf("you are not the author of this comment")
	}

	// 3. Удаляем
	return s.repo.Delete(ctx, commentID)
}

func (s *Service) UpdateComment(ctx context.Context, commentID string, content string, requesterID string) (Comment, error) {
	c, err := s.repo.GetByID(ctx, commentID)
	if err != nil {
		return Comment{}, err
	}

	if c.AuthorID != requesterID {
		return Comment{}, errors.New("you are not the author of this post")
	}

	err = s.repo.Update(ctx, commentID, content)
	if err != nil {
		return Comment{}, err
	}

	c.Content = content
	return c, nil
}
