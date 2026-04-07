package vote

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) Vote(ctx context.Context, userID, postID string, value int) error {
	query := `
        INSERT INTO votes (user_id, post_id, vote_value)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, post_id) 
        DO UPDATE SET vote_value = EXCLUDED.vote_value`

	_, err := r.db.Exec(ctx, query, userID, postID, value)
	return err
}
