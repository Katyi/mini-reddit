package comment

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

func (r *Repository) GetByPostID(ctx context.Context, postID string) ([]Comment, error) {
	query := `
		SELECT 
			c.id, 
			c.post_id, 
			COALESCE(c.author_id::text, '') as author_id,
			COALESCE(u.username, '[deleted]') as username,
			c.content, c.created_at, c.parent_id,
			COALESCE(SUM(cv.vote_value), 0) as rating
		FROM comments c
		LEFT JOIN users u ON c.author_id = u.id
		LEFT JOIN comment_votes cv ON c.id = cv.comment_id
		WHERE c.post_id = $1
		GROUP BY c.id, u.username
		ORDER BY c.created_at ASC`

	rows, err := r.db.Query(ctx, query, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		err := rows.Scan(
			&c.ID, &c.PostID, &c.AuthorID, &c.AuthorUsername,
			&c.Content, &c.CreatedAt, &c.ParentID, &c.Rating,
		)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}

	// if err := rows.Err(); err != nil {
	// 	return nil, err
	// }

	return comments, nil
}

func (r *Repository) Update(ctx context.Context, id string, content string) error {
	query := `UPDATE comments SET content = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, content, id)
	return err
}

// func (r *Repository) Delete(ctx context.Context, id string) error {
// 	query := `DELETE FROM comments WHERE id = $1`
// 	_, err := r.db.Exec(ctx, query, id)
// 	return err
// }

func (r *Repository) SoftDelete(ctx context.Context, id string) error {
	query := `UPDATE comments SET content = '[deleted]', author_id = NULL WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
