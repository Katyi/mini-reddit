package commentvote

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *pgxpool.Pool
	rdb *redis.Client
}

func NewRepository(db *pgxpool.Pool, rdb *redis.Client) *Repository {
	return &Repository{
		db:  db,
		rdb: rdb,
	}
}

func (r *Repository) Vote(ctx context.Context, userID, commentID string, value int) error {
	// Этот запрос делает всё за один раз:
	// 1. Проверяет текущий голос.
	// 2. Если совпадает с новым — удаляет.
	// 3. Если не совпадает — вставляет или обновляет.
	query := `
        WITH current_vote AS (
            SELECT vote_value FROM comment_votes WHERE user_id = $1 AND comment_id = $2
        ),
        deleted AS (
            DELETE FROM comment_votes 
            WHERE user_id = $1 AND comment_id = $2 AND vote_value = $3
            RETURNING comment_id
        )
        INSERT INTO comment_votes (user_id, comment_id, vote_value)
        SELECT $1, $2, $3
        WHERE NOT EXISTS (SELECT 1 FROM current_vote WHERE vote_value = $3)
        ON CONFLICT (user_id, comment_id) DO UPDATE SET vote_value = EXCLUDED.vote_value`

	_, err := r.db.Exec(ctx, query, userID, commentID, value)
	return err
}
