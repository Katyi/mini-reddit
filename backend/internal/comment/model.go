package comment

import "time"

type Comment struct {
	ID             string    `json:"id"`
	PostID         string    `json:"post_id"`
	AuthorID       string    `json:"author_id"`
	AuthorUsername string    `json:"author_username"` // Только здесь и в JSON
	ParentID       *string   `json:"parent_id"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
}
