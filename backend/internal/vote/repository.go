package vote

import (
	"context"
	"fmt"

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
	// 1. Получаем community_id для очистки кэша
	var communityID string
	err := r.db.QueryRow(ctx, "SELECT community_id FROM posts WHERE id = $1", postID).Scan(&communityID)
	if err != nil {
		return 0, err
	}

	// 2. Используем транзакцию для атомарного обновления
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	// ШАГ 1: Обновляем таблицу голосов (UPSERT или DELETE)
	if value == 0 {
		// Если пришел 0 — значит пользователь отменил любой свой голос
		_, err = tx.Exec(ctx, "DELETE FROM votes WHERE user_id = $1 AND post_id = $2", userID, postID)
	} else {
		// Если 1 или -1 — сохраняем или обновляем
		_, err = tx.Exec(ctx, `
            INSERT INTO votes (user_id, post_id, vote_value)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, post_id) 
            DO UPDATE SET vote_value = EXCLUDED.vote_value`,
			userID, postID, value)
	}
	if err != nil {
		return 0, err
	}

	// ШАГ 2: Пересчитываем рейтинг поста на основе всех голосов в таблице.
	// Это САМЫЙ надежный способ: он исключает любые ошибки "двойного сложения".
	var newRating int
	err = tx.QueryRow(ctx, `
		UPDATE posts 
		SET rating = (SELECT COALESCE(SUM(vote_value), 0) FROM votes WHERE post_id = $1)
		WHERE id = $1
		RETURNING rating`,
		postID).Scan(&newRating)

	if err != nil {
		return 0, err
	}

	// 3. Подтверждаем изменения
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	// 4. Инвалидация кэша (оставляем твою логику)
	r.rdb.Del(ctx, fmt.Sprintf("post:%s:u:%s", postID, userID))
	r.rdb.Del(ctx, fmt.Sprintf("post:%s:u:guest", postID))
	r.clearByPattern(ctx, fmt.Sprintf("community:posts:%s:*", communityID))
	r.clearByPattern(ctx, "posts:all:*")

	return newRating, nil
}

// Вспомогательная функция для удаления по паттерну (так же как в post/repository.go)
func (r *Repository) clearByPattern(ctx context.Context, pattern string) {
	iter := r.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		r.rdb.Del(ctx, iter.Val())
	}
}
