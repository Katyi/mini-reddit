package user

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo *Repository
}

var jwtSecret = []byte("your-very-secret-key")

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Вспомогательная функция (с маленькой буквы, чтобы была доступна только внутри сервиса)
func (s *Service) generateToken(userID string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
		"iat": time.Now().Unix(),
	})

	return token.SignedString(jwtSecret)
}

func (s *Service) RegisterUser(ctx context.Context, username, email, password string) (User, string, error) {
	// Хешируем пароль
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, "", err
	}

	// Создаем модель
	user := User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedBytes),
	}

	// Создаем юзера в базе
	createdUser, err := s.repo.CreateUser(ctx, user)
	if err != nil {
		return User{}, "", err
	}

	// Генерируем токен для нового юзера
	token, err := s.generateToken(createdUser.ID)
	if err != nil {
		return User{}, "", err
	}

	return createdUser, token, nil
}

func (s *Service) LoginUser(ctx context.Context, email, password string) (User, string, error) {
	// 1. Ищем юзера
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return User{}, "", err
	}

	// 2. Сравниваем хеш пароля из базы с тем, что ввел пользователь
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return User{}, "", err
	}

	token, err := s.generateToken(user.ID)
	if err != nil {
		return User{}, "", err
	}

	return user, token, nil
}
