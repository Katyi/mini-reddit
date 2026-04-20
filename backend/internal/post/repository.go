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

// Вспомогательный метод для очистки кэша (инвалидации)
func (r *Repository) clearCache(ctx context.Context, communityID string, postID string) {
	// 1. Очищаем кэш конкретного поста
	r.rdb.Del(ctx, "post:"+postID)

	// 2. Очищаем все списки постов для этого сообщества (для всех юзеров и гостей)
	patternComm := fmt.Sprintf("community:posts:%s:*", communityID)
	r.clearByPattern(ctx, patternComm)

	// 3. Очищаем общий список всех постов (GetAll)
	r.clearByPattern(ctx, "posts:all:*")
}

func (r *Repository) clearByPattern(ctx context.Context, pattern string) {
	iter := r.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		r.rdb.Del(ctx, iter.Val())
	}
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
	r.clearCache(ctx, post.CommunityID, post.ID)

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

func (r *Repository) GetAll(ctx context.Context, userID string, search string, sortBy string, limit, offset int) ([]Post, error) {
	uid := userID
	if uid == "" {
		uid = "guest"
	}
	cacheKey := fmt.Sprintf("posts:all:u:%s:q:%s:s:%s:l:%d:o:%d",
		uid,    // %s
		search, // %s
		sortBy, // %s
		limit,  // %d
		offset, // %d
	)

	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var posts []Post
		if err := json.Unmarshal([]byte(val), &posts); err == nil {
			return posts, nil
		}
	}

	// ORDER BY p.created_at DESC`
	query := `
        SELECT p.id, p.title, p.content, p.author_id, u.username, 
				p.community_id, comm.name as community_name, -- Достаем имя!
				p.created_at, p.rating,
						COALESCE(v.vote_value, 0) as user_vote
        FROM posts p
				JOIN users u ON p.author_id = u.id
				JOIN communities comm ON p.community_id = comm.id -- Добавляем JOIN
				LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = NULLIF($1, '')::uuid
        WHERE 1=1`

	args := []interface{}{userID}
	paramIdx := 2

	// SEARCH
	if search != "" {
		query += fmt.Sprintf(" AND (p.title ILIKE $%d OR p.content ILIKE $%d)", paramIdx, paramIdx)
		args = append(args, "%"+search+"%")
		paramIdx++
	}

	// SORTING
	if sortBy == "top" {
		query += " ORDER BY p.rating DESC, p.created_at DESC"
	} else {
		query += " ORDER BY p.created_at DESC"
	}

	// PAGINATION
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", paramIdx, paramIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query error: %w", err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(
			&p.ID, &p.Title, &p.Content, &p.AuthorID, &p.AuthorUsername,
			&p.CommunityID, &p.CommunityName,
			&p.CreatedAt, &p.Rating, &p.UserVote,
		); err != nil {
			fmt.Printf("GetAll scan error: %v\n", err)
			return nil, err
		}
		posts = append(posts, p)
	}

	if data, err := json.Marshal(posts); err == nil {
		r.rdb.Set(ctx, cacheKey, data, 5*time.Minute)
	}
	return posts, nil
}

func (r *Repository) GetByCommunityID(ctx context.Context, communityID string, userID string, search string, sortBy string, limit, offset int) ([]Post, error) {
	uid := userID
	if uid == "" {
		uid = "guest"
	}
	cacheKey := fmt.Sprintf("community:posts:%s:u:%s:q:%s:s:%s:l:%d:o:%d",
		communityID, // 1 (%s)
		uid,         // 2 (%s)
		search,      // 3 (%s)
		sortBy,      // 4 (%s)
		limit,       // 5 (%d)
		offset,      // 6 (%d)
	)

	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var posts []Post
		if err := json.Unmarshal([]byte(val), &posts); err == nil {
			return posts, nil // Возвращаем кэшированные данные
		}
	}

	query := `
        SELECT p.id, p.title, p.content, p.author_id, u.username, 
				p.community_id, comm.name as community_name,
				p.created_at, p.rating,
						COALESCE(v.vote_value, 0) as user_vote
        FROM posts p
				JOIN users u ON p.author_id = u.id
				JOIN communities comm ON p.community_id = comm.id
				LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = NULLIF($2, '')::uuid
				WHERE p.community_id = $1`

	args := []interface{}{communityID, userID}
	paramIdx := 3

	if search != "" {
		query += fmt.Sprintf(" AND (p.title ILIKE $%d OR p.content ILIKE $%d)", paramIdx, paramIdx)
		args = append(args, "%"+search+"%")
		paramIdx++
	}

	if sortBy == "top" {
		query += " ORDER BY p.rating DESC, p.created_at DESC"
	} else {
		query += " ORDER BY p.created_at DESC"
	}

	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", paramIdx, paramIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query community error: %w", err)
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.ID, &p.Title, &p.Content, &p.AuthorID, &p.AuthorUsername,
			&p.CommunityID, &p.CommunityName,
			&p.CreatedAt, &p.Rating, &p.UserVote,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}

	if data, err := json.Marshal(posts); err == nil {
		r.rdb.Set(ctx, cacheKey, data, 10*time.Minute)
	}

	return posts, nil
}

func (r *Repository) GetByID(ctx context.Context, id string, userID string) (Post, error) {
	uid := userID
	if uid == "" {
		uid = "guest"
	}
	cacheKey := fmt.Sprintf("post:%s:u:%s", id, uid)

	val, err := r.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var p Post
		if err := json.Unmarshal([]byte(val), &p); err == nil {
			return p, nil
		}
	}

	var p Post
	query := `
        SELECT p.id, p.title, p.content, p.author_id, u.username, p.community_id, p.created_at, p.rating,
					COALESCE(v.vote_value, 0) as user_vote
        FROM posts p
				JOIN users u ON p.author_id = u.id
				LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = NULLIF($2, '')::uuid
        WHERE p.id = $1`

	err = r.db.QueryRow(ctx, query, id, userID).Scan(
		&p.ID, &p.Title, &p.Content, &p.AuthorID, &p.AuthorUsername,
		&p.CommunityID, &p.CreatedAt, &p.Rating, &p.UserVote,
	)
	if err != nil {
		return Post{}, err
	}

	if data, err := json.Marshal(p); err == nil {
		r.rdb.Set(ctx, cacheKey, data, 10*time.Minute)
	}

	return p, nil
}

func (r *Repository) Update(ctx context.Context, id string, post Post) (Post, error) {
	query := `UPDATE posts SET title = $1, content = $2 WHERE id = $3 RETURNING community_id`
	var communityID string
	err := r.db.QueryRow(ctx, query, post.Title, post.Content, id).Scan(&communityID)
	if err != nil {
		return Post{}, err
	}

	r.clearCache(ctx, communityID, id)
	return r.GetByID(ctx, id, "")
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	var communityID string
	r.db.QueryRow(ctx, "SELECT community_id FROM posts WHERE id = $1", id).Scan(&communityID)

	_, err := r.db.Exec(ctx, "DELETE FROM posts WHERE id = $1", id)
	if err == nil {
		r.clearCache(ctx, communityID, id)
	}
	return err
}
