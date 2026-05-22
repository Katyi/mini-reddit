package user

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestService_RefreshToken_Success(t *testing.T) {
	// 1. Подготовка: Инициализируем сервис. Нам не нужен настоящий репозиторий,
	// так как RefreshToken не обращается к БД. Передаем nil.
	s := NewService(nil)

	// Задаем тестовый ID пользователя
	expectedUserID := "user-123-test"

	// 2. Генерируем валидный старый токен, который мы попробуем обновить
	oldToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": expectedUserID,
		"exp": time.Now().Add(time.Hour * 1).Unix(), // Действителен еще 1 час
		"iat": time.Now().Unix(),
	}).SignedString(jwtSecret)

	if err != nil {
		t.Fatalf("Failed to generate setup token: %v", err)
	}

	// 3. Выполняем действие: Вызываем тестируемый метод
	newAccess, newRefresh, err := s.RefreshToken(oldToken)

	// 4. Проверки (Assertions)
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}

	if newAccess == "" {
		t.Error("Expected new access token to be non-empty")
	}

	if newRefresh == "" {
		t.Error("Expected new refresh token to be non-empty")
	}

	// Дополнительно проверим, что новый токен содержит правильный userID ("sub")
	parsedToken, err := jwt.Parse(newAccess, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		t.Fatalf("Failed to parse new access token: %v", err)
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok || !parsedToken.Valid {
		t.Error("New access token is invalid")
	}

	if claims["sub"] != expectedUserID {
		t.Errorf("Expected encoded userID to be %s, got %v", expectedUserID, claims["sub"])
	}
}

func TestService_RefreshToken_InvalidToken(t *testing.T) {
	s := NewService(nil)

	// Передаем заведомо сломанную строку вместо токена
	_, _, err := s.RefreshToken("this-is-not-a-valid-jwt-token")

	// Проверяем, что метод вернул ошибку, как и должен был
	if err == nil {
		t.Error("Expected error for invalid token, but got nil")
	}
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	expectedUserID := "user-999"

	// 1. Создаем валидный токен для теста
	tokenStr, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": expectedUserID,
		"exp": time.Now().Add(time.Hour).Unix(),
	}).SignedString(jwtSecret)
	if err != nil {
		t.Fatalf("Failed to sign token: %v", err)
	}

	// 2. Создаем фейковый "следующий" обработчик (next handler), к которому должен перейти запрос.
	// Внутри него мы проверим, положил ли Middleware правильный userID в контекст.
	innerHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxUserID, ok := r.Context().Value(UserIDKey).(string)
		if !ok {
			t.Error("Expected userID to be present in context, but it was missing")
		}
		if ctxUserID != expectedUserID {
			t.Errorf("Expected userID in context to be %s, got %s", expectedUserID, ctxUserID)
		}
		w.WriteHeader(http.StatusOK)
	})

	// 3. Оборачиваем наш фейковый обработчик в тестируемый Middleware
	middlewareToTest := AuthMiddleware(innerHandler)

	// 4. Эмулируем HTTP-запрос с заголовком Authorization Bearer
	req := httptest.NewRequest(http.MethodGet, "/any-secure-route", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)

	// Создаем объект для записи HTTP-ответа
	rec := httptest.NewRecorder()

	// 5. Запускаем
	middlewareToTest.ServeHTTP(rec, req)

	// 6. Проверяем статус-код ответа
	if rec.Code != http.StatusOK {
		t.Errorf("Expected status code 200, got %d", rec.Code)
	}
}

func TestAuthMiddleware_InvalidTokenFormat(t *testing.T) {
	// Создаем фейковый обработчик. Если Middleware работает правильно,
	// этот код ВООБЩЕ не должен выполниться при плохом токене.
	innerHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Next handler should not be called for malformed token")
	})

	middlewareToTest := AuthMiddleware(innerHandler)

	// Передаем некорректный формат (без слова Bearer)
	req := httptest.NewRequest(http.MethodGet, "/any-secure-route", nil)
	req.Header.Set("Authorization", "MalformedTokenString")

	rec := httptest.NewRecorder()

	// Запускаем
	middlewareToTest.ServeHTTP(rec, req)

	// Проверяем, что Middleware отбросил запрос с кодом 401 Unauthorized
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("Expected status code 401 for bad token format, got %d", rec.Code)
	}
}

func TestService_RegisterUser_ValidationTable(t *testing.T) {
	emptyRepo := &Repository{}
	s := NewService(emptyRepo)
	// s := NewService(nil) // База данных нам тут тоже не нужна для базовых проверок на пустые поля

	// Определяем структуру для нашей "таблицы" тест-кейсов
	tests := []struct {
		name        string // Имя подтеста
		username    string // Входной юзернейм
		email       string // Входной имейл
		password    string // Входной пароль
		expectError bool   // Должен ли сервис вернуть ошибку?
	}{
		{
			name:        "Empty username",
			username:    "",
			email:       "test@example.com",
			password:    "password123",
			expectError: true,
		},
		{
			name:        "Empty email",
			username:    "alexandra",
			email:       "",
			password:    "password123",
			expectError: true,
		},
		{
			name:        "Empty password",
			username:    "alexandra",
			email:       "test@example.com",
			password:    "",
			expectError: true,
		},
	}

	// Пробегаем по таблице циклом
	for _, tt := range tests {
		// t.Run запускает изолированный подтест, который будет виден в консоли по имени tt.name
		t.Run(tt.name, func(t *testing.T) {
			_, _, _, err := s.RegisterUser(context.Background(), tt.username, tt.email, tt.password)

			if tt.expectError && err == nil {
				t.Errorf("Expected error for case '%s', but got nil", tt.name)
			}
			if !tt.expectError && err != nil {
				t.Errorf("Expected no error for case '%s', but got: %v", tt.name, err)
			}
		})
	}
}
