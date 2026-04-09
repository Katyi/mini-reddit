package community

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, c Community) (Community, error) {
	query := `
		INSERT INTO communities (name, description, owner_id) 
		VALUES ($1, $2, $3) 
		RETURNING id, created_at`

	err := r.db.QueryRow(ctx, query, c.Name, c.Description, c.OwnerID).
		Scan(&c.ID, &c.CreatedAt)

	return c, err
}

func (r *Repository) GetAll(ctx context.Context) ([]Community, error) {
	query :=
		`SELECT c.id, c.name, c.description, c.owner_id, u.username, c.created_at
		FROM communities c
		JOIN users u ON c.owner_id = u.id`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Community
	for rows.Next() {
		var c Community
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.OwnerID, &c.OwnerUsername, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, nil
}
