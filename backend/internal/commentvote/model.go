package commentvote

type Vote struct {
	UserID    string `json:"user_id"`
	CommentID string `json:"comment_id"`
	VoteValue int    `json:"vote_value"` // 1 или -1
}
