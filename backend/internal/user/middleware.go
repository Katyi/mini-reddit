package user

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Определяем свой тип для ключа в контексте, чтобы не было конфликтов
type contextKey string

const UserIDKey contextKey = "userID"

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		tokenStr := ""

		// 1. Пытаемся достать токен из заголовка
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenStr = parts[1]
			} else {
				http.Error(w, "Invalid token format", http.StatusUnauthorized)
				return
			}
		}

		// 2. Если в заголовке пусто, пробуем достать из URL (для WebSocket)
		if tokenStr == "" {
			tokenStr = r.URL.Query().Get("token")
		}

		// 3. Если токена нет нигде — считаем пользователя гостем
		if tokenStr == "" {
			next.ServeHTTP(w, r)
			return
		}

		// 4. Проверяем найденный токен (неважно, откуда он пришел)
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		// Если токен есть, но он просрочен/плохой — ошибка
		if err != nil || !token.Valid {
			http.Error(w, "Session expired", http.StatusUnauthorized)
			return
		}

		// Если всё ок — пишем ID в контекст
		claims, _ := token.Claims.(jwt.MapClaims)
		userID, _ := claims["sub"].(string)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
