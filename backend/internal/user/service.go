package user

import (
	"context"
	"errors"
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
func (s *Service) generateToken(userID string) (string, string, error) {
	// Access Token на 24 часа (1 сутки)
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
		"iat": time.Now().Unix(),
	}).SignedString(jwtSecret)

	if err != nil {
		return "", "", err
	}

	// Refresh Token на 30 дней (~1 месяц)
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 24 * 30).Unix(),
		"iat": time.Now().Unix(),
	}).SignedString(jwtSecret)
	return accessToken, refreshToken, err
}

func (s *Service) RefreshToken(tokenString string) (string, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", errors.New("invalid claims")
	}

	userID := claims["sub"].(string)
	return s.generateToken(userID)
}

func (s *Service) RegisterUser(ctx context.Context, username, email, password string) (User, string, string, error) {
	// Хешируем пароль
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, "", "", err
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
		return User{}, "", "", err
	}

	// Генерируем токен для нового юзера
	accessToken, refreshToken, err := s.generateToken(createdUser.ID)
	if err != nil {
		return User{}, "", "", err
	}

	return createdUser, accessToken, refreshToken, nil
}

func (s *Service) LoginUser(ctx context.Context, email, password string) (User, string, string, error) {
	// 1. Ищем юзера
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return User{}, "", "", err
	}

	// 2. Сравниваем хеш пароля из базы с тем, что ввел пользователь
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return User{}, "", "", err
	}

	accessToken, refreshToken, err := s.generateToken(user.ID)
	if err != nil {
		return User{}, "", "", err
	}

	return user, accessToken, refreshToken, nil
}

func (s *Service) GetUserProfile(ctx context.Context, username string) (User, error) {
	return s.repo.GetByUsername(ctx, username)
}

func (s *Service) GetAllUsers(ctx context.Context) ([]User, error) {
	return s.repo.GetAllUsers(ctx)
}

func (s *Service) UpdateAvatar(ctx context.Context, userID string, avatarURL string) error {
	// Здесь можно добавить проверку, если нужно (например, не пустая ли строка)
	if avatarURL == "" {
		return errors.New("avatar URL cannot be empty")
	}
	return s.repo.UpdateAvatar(ctx, userID, avatarURL)
}
