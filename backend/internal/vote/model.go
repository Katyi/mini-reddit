package vote

type Vote struct {
	UserID    string `json:"user_id"`
	PostID    string `json:"post_id"`
	VoteValue int    `json:"vote_value"` // 1 или -1
}
