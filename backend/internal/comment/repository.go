package comment

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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

// Вспомогательный метод для очистки кэша
func (r *Repository) clearCache(ctx context.Context, postID string) {
	// Кэш комментариев зависит от postID и того, кто смотрит (из-за user_vote)
	// Самый простой и надежный способ — удалить все ключи, связанные с этим постом
	pattern := fmt.Sprintf("comments:%s:*", postID)
	iter := r.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		r.rdb.Del(ctx, iter.Val())
	}
}

func (r *Repository) Create(ctx context.Context, c Comment) (Comment, error) {
	query := `
		WITH inserted_comment AS (
			INSERT INTO comments (post_id, author_id, content, parent_id)
			VALUES ($1, $2, $3, $4)
			RETURNING id, post_id, author_id, content, created_at, parent_id
		)
		SELECT 
			ic.id, ic.post_id, ic.author_id, u.username, 
			ic.content, ic.created_at, ic.parent_id
		FROM inserted_comment ic
		JOIN users u ON ic.author_id = u.id`

	err := r.db.QueryRow(ctx, query, c.PostID, c.AuthorID, c.Content, c.ParentID).
		Scan(&c.ID, &c.PostID, &c.AuthorID, &c.AuthorUsername, &c.Content, &c.CreatedAt, &c.ParentID)

	r.clearCache(ctx, c.PostID)
	return c, err
}

// Этот метод понадобится позже, чтобы показать комменты под постом
func (r *Repository) GetByID(ctx context.Context, id string) (Comment, error) {
	var c Comment
	query :=
		`SELECT
				c.id, c.post_id,
				COALESCE(c.author_id::text, '') as author_id,
				COALESCE(u.username, '[deleted]') as username,
				c.content, c.created_at, c.parent_id,
				COALESCE(SUM(cv.vote_value), 0) as rating
		FROM comments c
		LEFT JOIN users u ON c.author_id = u.id
		LEFT JOIN comment_votes cv ON c.id = cv.comment_id
		WHERE c.id = $1
		GROUP BY c.id, u.username`

	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.PostID, &c.AuthorID, &c.AuthorUsername, &c.Content, &c.CreatedAt, &c.ParentID, &c.Rating)
	if err != nil {
		return Comment{}, err
	}

	return c, nil
}

func (r *Repository) GetByPostID(ctx context.Context, postID string, userID string) ([]Comment, error) {
	// 1. Пытаемся взять из кэша
	// Ключ уникален для пары Пост + Юзер (так как лайки у каждого свои)
	cacheKey := fmt.Sprintf("comments:%s:u:%s", postID, userID)
	if userID == "" {
		cacheKey = fmt.Sprintf("comments:%s:u:guest", postID)
	}

	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var comments []Comment
		if err := json.Unmarshal([]byte(val), &comments); err == nil {
			return comments, nil
		}
	}

	// 2. Если в кэше нет — идем в базу (твой существующий код)
	query := `
		SELECT 
			c.id, c.post_id, 
			COALESCE(c.author_id::text, '') as author_id,
			COALESCE(u.username, '[deleted]') as username,
			c.content, c.created_at, c.parent_id,
			c.rating,
			COALESCE(cv.vote_value, 0) as user_vote
		FROM comments c
		LEFT JOIN users u ON c.author_id = u.id
		LEFT JOIN comment_votes cv ON c.id = cv.comment_id 
            AND cv.user_id = NULLIF($2, '')::uuid
		WHERE c.post_id = $1
		ORDER BY c.created_at ASC`

	rows, err := r.db.Query(ctx, query, postID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		err := rows.Scan(
			&c.ID, &c.PostID, &c.AuthorID, &c.AuthorUsername,
			&c.Content, &c.CreatedAt, &c.ParentID, &c.Rating, &c.UserVote,
		)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}

	// 3. Сохраняем результат в кэш на 5-10 минут
	data, _ := json.Marshal(comments)
	r.rdb.Set(ctx, cacheKey, data, 10*time.Minute)

	return comments, nil
}

func (r *Repository) Update(ctx context.Context, id string, content string) (Comment, error) {
	var c Comment
	query := `
		UPDATE comments 
		SET content = $1 
		WHERE id = $2 
		RETURNING id, post_id, author_id, content, created_at, parent_id`

	err := r.db.QueryRow(ctx, query, content, id).
		Scan(&c.ID, &c.PostID, &c.AuthorID, &c.Content, &c.CreatedAt, &c.ParentID)

	if err != nil {
		return Comment{}, err
	}

	// Очищаем кэш для этого поста, так как текст комментария изменился
	r.clearCache(ctx, c.PostID)

	return c, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id string) error {
	// Нам нужно узнать post_id перед или во время удаления
	var postID string
	query := `
		UPDATE comments 
		SET content = '[deleted]', author_id = NULL 
		WHERE id = $1 
		RETURNING post_id`

	err := r.db.QueryRow(ctx, query, id).Scan(&postID)
	if err != nil {
		return err
	}

	// Сбрасываем кэш ветки комментариев этого поста
	r.clearCache(ctx, postID)

	return nil
}
