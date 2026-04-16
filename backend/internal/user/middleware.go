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

		// Если гость (нет заголовка) — просто пропускаем к хендлеру
		if authHeader == "" {
			next.ServeHTTP(w, r)
			return
		}

		// Если пытается косить под юзера (заголовок есть), но формат битый — ошибка
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid token format", http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
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
