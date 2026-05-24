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
	Rating         int       `json:"rating"`
	UserVote       int       `json:"user_vote"`
}

type CommentNotificationEvent struct {
	CommentID      string    `json:"comment_id"`
	PostID         string    `json:"post_id"`
	CommentAuthor  string    `json:"comment_author_username"` // Кто написал комментарий
	CommunityName  string    `json:"community_name"`
	PostAuthorID   string    `json:"post_author_id"`  // Кому доставлять уведомление
	CommentContent string    `json:"comment_content"` // Превью текста
	CreatedAt      time.Time `json:"created_at"`
}
