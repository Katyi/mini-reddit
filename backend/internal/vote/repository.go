package vote

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

func (r *Repository) Vote(ctx context.Context, userID, postID string, value int) (int, error) {
	// Используем транзакцию, чтобы заблокировать строку поста и избежать двойных прибавлений
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	// 1. Узнаем старый голос и блокируем строку поста (FOR UPDATE)
	// Это заставит второй одновременный запрос подождать доли миллисекунды
	var oldVote int
	err = tx.QueryRow(ctx, `
        SELECT COALESCE((SELECT vote_value FROM votes WHERE user_id = $1 AND post_id = $2), 0)
    `, userID, postID).Scan(&oldVote)

	var diff int
	if oldVote == value {
		// Отмена голоса
		_, err = tx.Exec(ctx, "DELETE FROM votes WHERE user_id = $1 AND post_id = $2", userID, postID)
		diff = -value
	} else {
		// Новый голос или смена (-1 на 1)
		_, err = tx.Exec(ctx, `
            INSERT INTO votes (user_id, post_id, vote_value)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, post_id) DO UPDATE SET vote_value = EXCLUDED.vote_value`,
			userID, postID, value)
		diff = value - oldVote
	}

	// 2. Обновляем рейтинг и возвращаем его
	var newRating int
	err = tx.QueryRow(ctx, `
        UPDATE posts SET rating = rating + $1 WHERE id = $2 RETURNING rating
    `, diff, postID).Scan(&newRating)

	if err != nil {
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return newRating, nil
}
