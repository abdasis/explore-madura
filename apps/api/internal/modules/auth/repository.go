package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

// Repository mengakses tabel users dan sessions.
type Repository struct {
	conn shared.Conn
}

// NewRepository membuat repository auth di atas koneksi yang diberikan.
func NewRepository(conn shared.Conn) *Repository {
	return &Repository{conn: conn}
}

// FindByEmail mengambil user berdasarkan email.
func (r *Repository) FindByEmail(ctx context.Context, email string) (User, error) {
	user, err := scanUser(r.conn.QueryRow(ctx, `
		select id, email, name, password_hash, permissions, created_at
		from users
		where email = $1`, email))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("find user by email: %w", err)
	}
	return user, nil
}

// UpsertUser membuat admin seed atau memperbarui kredensialnya.
func (r *Repository) UpsertUser(ctx context.Context, email, name, passwordHash string, permissions []string) error {
	_, err := r.conn.Exec(ctx, `
		insert into users (email, name, password_hash, permissions)
		values ($1, $2, $3, $4)
		on conflict (email) do update
		set name = excluded.name,
			password_hash = excluded.password_hash,
			permissions = excluded.permissions`,
		email, name, passwordHash, permissions)
	if err != nil {
		return fmt.Errorf("upsert user: %w", err)
	}
	return nil
}

// CreateSession menyimpan token opaque milik user.
func (r *Repository) CreateSession(ctx context.Context, token string, userID int64, expiresAt time.Time) error {
	_, err := r.conn.Exec(ctx, `
		insert into sessions (token, user_id, expires_at)
		values ($1, $2, $3)`, token, userID, expiresAt)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

// DeleteSession menghapus sesi berdasarkan token.
func (r *Repository) DeleteSession(ctx context.Context, token string) error {
	_, err := r.conn.Exec(ctx, `delete from sessions where token = $1`, token)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// FindUserByToken mengambil pemilik sesi yang belum kedaluwarsa.
func (r *Repository) FindUserByToken(ctx context.Context, token string) (User, error) {
	user, err := scanUser(r.conn.QueryRow(ctx, `
		select u.id, u.email, u.name, u.password_hash, u.permissions, u.created_at
		from sessions s
		join users u on u.id = s.user_id
		where s.token = $1 and s.expires_at > now()`, token))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("find user by token: %w", err)
	}
	return user, nil
}

func scanUser(row pgx.Row) (User, error) {
	var user User
	if err := row.Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Permissions, &user.CreatedAt); err != nil {
		return User{}, err
	}
	return user, nil
}
