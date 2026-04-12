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

func (r *Repository) Update(ctx context.Context, c Community) error {
	query := `UPDATE communities SET description = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, c.Description, c.ID)
	return err
}

func (r *Repository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM communities WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

// Понадобится для проверки прав
func (r *Repository) GetByID(ctx context.Context, id string) (Community, error) {
	var c Community
	query := `SELECT id, owner_id FROM communities WHERE id = $1`
	err := r.db.QueryRow(ctx, query, id).Scan(&c.ID, &c.OwnerID)
	return c, err
}

func (r *Repository) GetByName(ctx context.Context, name string) (Community, error) {
	var c Community
	query := `
		SELECT c.id, c.name, c.description, c.owner_id, u.username, c.created_at
		FROM communities c
		JOIN users u ON c.owner_id = u.id
		WHERE c.name = $1`

	err := r.db.QueryRow(ctx, query, name).Scan(
		&c.ID, &c.Name, &c.Description, &c.OwnerID, &c.OwnerUsername, &c.CreatedAt,
	)

	return c, err
}
