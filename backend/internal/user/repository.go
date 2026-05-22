package user

import (
	"context"
	"errors"

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

func (r *Repository) CreateUser(ctx context.Context, user User) (User, error) {
	if r.db == nil {
		return User{}, errors.New("database connection is nil")
	}

	query := `
		INSERT INTO users (username, email, password_hash) 
		VALUES ($1, $2, $3) 
		RETURNING id, created_at`

	err := r.db.QueryRow(ctx, query, user.Username, user.Email, user.PasswordHash).
		Scan(&user.ID, &user.CreatedAt)

	return user, err
}

func (r *Repository) GetByEmail(ctx context.Context, email string) (User, error) {
	var u User
	query := `SELECT id, username, email, password_hash, avatar_url, karma, created_at FROM users WHERE email = $1`

	err := r.db.QueryRow(ctx, query, email).
		Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.AvatarURL, &u.Karma, &u.CreatedAt)

	return u, err
}

func (r *Repository) GetByUsername(ctx context.Context, username string) (User, error) {
	var u User
	// Считаем сумму рейтингов постов и комментариев автора
	query := `
		SELECT 
			u.id, u.username, u.email, u.avatar_url, u.created_at,
			(
				COALESCE((SELECT SUM(rating) FROM posts WHERE author_id = u.id), 0) +
				COALESCE((SELECT SUM(rating) FROM comments WHERE author_id = u.id), 0)
			) as total_karma
		FROM users u
		WHERE u.username = $1`

	err := r.db.QueryRow(ctx, query, username).
		Scan(&u.ID, &u.Username, &u.Email, &u.AvatarURL, &u.CreatedAt, &u.Karma)

	return u, err
}

func (r *Repository) GetAllUsers(ctx context.Context) ([]User, error) {
	query := `SELECT id, username, email, avatar_url, karma, created_at FROM users ORDER BY username ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.AvatarURL, &u.Karma, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func (r *Repository) UpdateAvatar(ctx context.Context, userID string, avatarURL string) error {
	query := `UPDATE users SET avatar_url = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, avatarURL, userID)
	return err
}
