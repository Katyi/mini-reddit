package commentvote

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

func (r *Repository) Vote(ctx context.Context, userID, commentID string, value int) error {
	// ШАГ 0: Проверяем существование комментария, его статус (не удален ли)
	// и получаем post_id для последующей очистки кэша
	var content string
	var postID string
	// err := r.db.QueryRow(ctx, "SELECT post_id FROM comments WHERE id = $1", commentID).Scan(&postID)
	err := r.db.QueryRow(ctx, "SELECT content, post_id FROM comments WHERE id = $1", commentID).Scan(&content, &postID)
	if err != nil {
		return err
	}

	// Если комментарий помечен как удаленный, голосовать нельзя
	if content == "[deleted]" {
		return fmt.Errorf("cannot vote on a deleted comment")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Шаг 1: Работаем с таблицей голосов
	if value == 0 {
		// Отмена голоса
		_, err = tx.Exec(ctx, "DELETE FROM comment_votes WHERE user_id = $1 AND comment_id = $2", userID, commentID)
	} else {
		// Ставим или меняем голос
		_, err = tx.Exec(ctx, `
            INSERT INTO comment_votes (user_id, comment_id, vote_value)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, comment_id) DO UPDATE SET vote_value = EXCLUDED.vote_value`,
			userID, commentID, value)
	}
	if err != nil {
		return err
	}

	// Шаг 2: Атомарный пересчет рейтинга в таблице комментариев
	// Мы суммируем все голоса из comment_votes и записываем результат в comment
	_, err = tx.Exec(ctx, `
		UPDATE comments 
		SET rating = (SELECT COALESCE(SUM(vote_value), 0) FROM comment_votes WHERE comment_id = $1)
		WHERE id = $1`,
		commentID)

	if err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	// ШАГ 3: Инвалидация кэша Redis
	// Мы запускаем это в горутине, чтобы не заставлять пользователя ждать выполнения SCAN
	go func() {
		// Используем Background контекст, так как основной ctx может закрыться после ответа клиенту
		refreshCtx := context.Background()

		// Паттерн соответствует структуре в comment/repository.go -> "comments:POST_ID:*"
		pattern := fmt.Sprintf("comments:%s:*", postID)
		iter := r.rdb.Scan(refreshCtx, 0, pattern, 0).Iterator()
		for iter.Next(refreshCtx) {
			r.rdb.Del(refreshCtx, iter.Val())
		}
	}()

	return nil
}
