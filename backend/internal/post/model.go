package post

import "time"

type Post struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Content        string    `json:"content"`
	ImageURL       string    `json:"image_url"`
	AuthorID       string    `json:"author_id"`
	AuthorUsername string    `json:"author_username"` // Только здесь и в JSON
	CommunityID    string    `json:"community_id"`
	CommunityName  string    `json:"community_name"` // Только здесь и в JSON
	CreatedAt      time.Time `json:"created_at"`
	Rating         int       `json:"rating"`
	UserVote       int       `json:"user_vote"`
}
