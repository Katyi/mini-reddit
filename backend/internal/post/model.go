package post

import "time"

type Post struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	AuthorID    string    `json:"author_id"`
	CommunityID string    `json:"community_id"`
	CreatedAt   time.Time `json:"created_at"`
	Rating      int       `json:"rating"`
}
