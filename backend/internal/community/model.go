package community

import "time"

type Community struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	OwnerID       string    `json:"owner_id"`
	OwnerUsername string    `json:"owner_username"` // Только здесь и в JSON
	CreatedAt     time.Time `json:"created_at"`
}
