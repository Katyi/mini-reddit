package user

import "time"

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	Password     string    `json:"password,omitempty"` // omitempty, чтобы не светить в ответах
	PasswordHash string    `json:"-"`                  // вообще не выводим в JSON
	CreatedAt    time.Time `json:"created_at"`
}
