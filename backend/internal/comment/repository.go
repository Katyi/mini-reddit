package comment

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/segmentio/kafka-go"
)

type Repository struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	kw  *kafka.Writer
}

func NewRepository(db *pgxpool.Pool, rdb *redis.Client, kw *kafka.Writer) *Repository {
	return &Repository{
		db:  db,
		rdb: rdb,
		kw:  kw,
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
	// 1. Вытаскиваем сам комментарий, ID автора поста и имя сообщества за ОДИН запрос
	query := `
		WITH inserted_comment AS (
			INSERT INTO comments (post_id, author_id, content, parent_id)
			VALUES ($1, $2, $3, $4)
			RETURNING id, post_id, author_id, content, created_at, parent_id
		)
		SELECT 
			ic.id, ic.post_id, ic.author_id, u.username, ic.content, ic.created_at, ic.parent_id,
			p.author_id AS post_author_id,
			c.name AS community_name
		FROM inserted_comment ic
		JOIN users u ON ic.author_id = u.id
		JOIN posts p ON ic.post_id = p.id
		JOIN communities c ON p.community_id = c.id`

	var insertedComment Comment
	var postAuthorID string // Переменная для ID автора поста
	var communityName string

	err := r.db.QueryRow(ctx, query, c.PostID, c.AuthorID, c.Content, c.ParentID).Scan(
		&insertedComment.ID, &insertedComment.PostID, &insertedComment.AuthorID, &insertedComment.AuthorUsername,
		&insertedComment.Content, &insertedComment.CreatedAt, &insertedComment.ParentID,
		&postAuthorID,
		&communityName,
	)
	if err != nil {
		return Comment{}, err
	}

	// 2. Сбрасываем кэш
	r.clearCache(ctx, insertedComment.PostID)

	// 3. ПРОВЕРКА: отправляем в Kafka ТОЛЬКО если комментирует НЕ автор поста
	if insertedComment.AuthorID != postAuthorID {
		event := CommentNotificationEvent{
			CommentID:      insertedComment.ID,
			PostID:         insertedComment.PostID,
			CommentAuthor:  insertedComment.AuthorUsername,
			CommunityName:  communityName, // <-- Теперь здесь не пустота, а реальное имя!
			PostAuthorID:   postAuthorID,  // <-- Теперь знаем, кому именно слать уведомление
			CommentContent: insertedComment.Content,
			CreatedAt:      insertedComment.CreatedAt,
		}

		// Сериализуем в JSON и отправляем в Kafka
		eventJSON, err := json.Marshal(event)
		if err == nil {
			err = r.kw.WriteMessages(ctx, kafka.Message{
				Key:   []byte(event.PostAuthorID), // Ключ — ID автора поста
				Value: eventJSON,
			})
			if err != nil {
				fmt.Printf("❌ Failed to write message to Kafka: %v\n", err)
			}
		} else {
			fmt.Printf("❌ Failed to marshal comment notification event: %v\n", err)
		}
	}

	return insertedComment, err
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

func (r *Repository) GetByPostID(ctx context.Context, postID string, userID string, search string, sortBy string, limit, offset int) ([]Comment, error) {
	uid := userID
	if uid == "" {
		uid = "guest"
	}

	// 1. Пытаемся взять из кэша
	cacheKey := fmt.Sprintf("comments:%s:u:%s:q:%s:s:%s:l:%d:o:%d",
		postID, // 1 (%s)
		uid,    // 2 (%s)
		search, // 3 (%s)
		sortBy, // 4 (%s)
		limit,  // 5 (%d)
		offset, // 6 (%d)
	)
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var comments []Comment
		if err := json.Unmarshal([]byte(val), &comments); err == nil {
			return comments, nil
		}
	}

	// ORDER BY c.created_at ASC`
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
		WHERE c.post_id = $1`

	// SEARCH
	if search != "" {
		// ILIKE для регистронезависимого поиска
		query += fmt.Sprintf(" AND c.content ILIKE '%%%s%%'", search)
	}

	// SORTING
	if sortBy == "top" {
		query += " ORDER BY c.rating DESC"
	} else if sortBy == "new" {
		query += " ORDER BY c.created_at DESC" // Твой дефолт был ASC
	} else {
		query += " ORDER BY c.created_at ASC"
	}

	// PAGINATION
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)

	rows, err := r.db.Query(ctx, query, postID, userID)
	if err != nil {
		fmt.Printf("SQL Error: %v\nQuery: %s\n", err, query) // Это напечатает ошибку в терминал
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
