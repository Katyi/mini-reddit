package user

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

func (r *Repository) CreateUser(ctx context.Context, user User) (User, error) {
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
	query := `SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1`

	err := r.db.QueryRow(ctx, query, email).
		Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt)

	return u, err
}

func (r *Repository) GetByUsername(ctx context.Context, username string) (User, error) {
	var u User
	query := `SELECT id, username, email, created_at FROM users WHERE username = $1`

	err := r.db.QueryRow(ctx, query, username).
		Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt)

	return u, err
}

func (r *Repository) GetAllUsers(ctx context.Context) ([]User, error) {
	query := `SELECT id, username, email, created_at FROM users ORDER BY username ASC`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}
