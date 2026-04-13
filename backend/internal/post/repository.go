package post

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/segmentio/kafka-go"
)

var ErrPostNotFound = errors.New("post not found")

type Repository struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	kw  *kafka.Writer
}

func NewRepository(db *pgxpool.Pool, rdb *redis.Client, kw *kafka.Writer) *Repository {
	return &Repository{db: db, rdb: rdb, kw: kw}
}

func (r *Repository) Create(ctx context.Context, post Post) (Post, error) {
	// 1. Сохраняем в Postgres
	query := `
        INSERT INTO posts (title, content, author_id, community_id) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, title, content, author_id, community_id, created_at`

	err := r.db.QueryRow(ctx, query, post.Title, post.Content, post.AuthorID, post.CommunityID).Scan(
		&post.ID,
		&post.Title,
		&post.Content,
		&post.AuthorID,
		&post.CommunityID,
		&post.CreatedAt,
	)

	if err != nil {
		return post, err
	}

	// 2. Инвалидация Redis (то, что мы обсуждали)
	cacheKey := "community:posts:" + post.CommunityID
	r.rdb.Del(ctx, cacheKey)

	msg := kafka.Message{
		Key:   []byte(post.ID), // ID всегда разный, так что Kafka поймет, что это новый пост
		Value: []byte("New post: " + post.Title),
	}
	if err := r.kw.WriteMessages(ctx, msg); err != nil {
		fmt.Println("❌ Kafka Write Error:", err)
	} else {
		fmt.Println("✅ Kafka Message Sent for post:", post.ID)
	}

	return post, err
}

func (r *Repository) GetAll(ctx context.Context) ([]Post, error) {
	query := `
        SELECT 
            p.id, p.title, p.content, p.author_id, u.username, p.community_id, p.created_at,
            COALESCE(SUM(v.vote_value), 0) as rating
        FROM posts p
				JOIN users u ON p.author_id = u.id
        LEFT JOIN votes v ON p.id = v.post_id
        GROUP BY p.id, u.username
        ORDER BY p.created_at DESC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.ID, &p.Title, &p.Content, &p.AuthorID, &p.AuthorUsername, &p.CommunityID, &p.CreatedAt, &p.Rating); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (Post, error) {
	var p Post
	query := `
        SELECT 
            p.id, p.title, p.content, p.author_id, u.username, p.community_id, p.created_at,
            COALESCE(SUM(v.vote_value), 0) as rating
        FROM posts p
				JOIN users u ON p.author_id = u.id
        LEFT JOIN votes v ON p.id = v.post_id
        WHERE p.id = $1
        GROUP BY p.id, u.username`

	err := r.db.QueryRow(ctx, query, id).Scan(&p.ID, &p.Title, &p.Content, &p.AuthorID, &p.AuthorUsername, &p.CommunityID, &p.CreatedAt, &p.Rating)
	if err != nil {
		return Post{}, ErrPostNotFound
	}
	return p, nil
}

func (r *Repository) Update(ctx context.Context, id string, post Post) (Post, error) {
	query := `
        UPDATE posts 
        SET title = $1, content = $2 
        WHERE id = $3 
        RETURNING id, title, content, author_id, community_id, created_at` // Добавил author_id

	err := r.db.QueryRow(ctx, query, post.Title, post.Content, id).Scan(
		&post.ID,
		&post.Title,
		&post.Content,
		&post.AuthorID, // Добавил получение author_id
		&post.CommunityID,
		&post.CreatedAt,
	)
	return post, err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	var communityID string
	err := r.db.QueryRow(ctx, "SELECT community_id FROM posts WHERE id = $1", id).Scan(&communityID)

	_, err = r.db.Exec(ctx, "DELETE FROM posts WHERE id = $1", id)
	if err != nil {
		return err
	}

	cacheKey := "community:posts:" + communityID
	r.rdb.Del(ctx, cacheKey)

	return err
}

func (r *Repository) GetByCommunityID(ctx context.Context, communityID string) ([]Post, error) {
	cacheKey := "community:posts:" + communityID

	// 1. Попытка достать данные из Redis
	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var posts []Post
		// Если данные в кэше есть, превращаем JSON обратно в слайс структур
		if err := json.Unmarshal([]byte(val), &posts); err == nil {
			return posts, nil // Cache Hit!
		}
	}

	// 2. Если в Redis пусто (или ошибка), идем в Postgres
	query := `
        SELECT 
            p.id, p.title, p.content, p.author_id, u.username, p.community_id, p.created_at,
            COALESCE(SUM(v.vote_value), 0) as rating
        FROM posts p
				JOIN users u ON p.author_id = u.id
        LEFT JOIN votes v ON p.id = v.post_id
        WHERE p.community_id = $1
        GROUP BY p.id, u.username
        ORDER BY p.created_at DESC`

	rows, err := r.db.Query(ctx, query, communityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.ID, &p.Title, &p.Content, &p.AuthorID, &p.AuthorUsername, &p.CommunityID, &p.CreatedAt, &p.Rating); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}

	// 3. Сохраняем результат в Redis на 5 минут, чтобы в следующий раз не дергать БД
	if data, err := json.Marshal(posts); err == nil {
		r.rdb.Set(ctx, cacheKey, data, 5*time.Minute)
	}

	return posts, nil
}
