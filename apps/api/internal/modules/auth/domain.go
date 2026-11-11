// Package auth berisi domain, service, repository, dan HTTP handler autentikasi.
package auth

import (
	"errors"
	"time"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

// User adalah akun yang bisa masuk ke aplikasi.
type User struct {
	ID           int64
	Email        string
	Name         string
	PasswordHash string
	Permissions  []string
	CreatedAt    time.Time
}

var (
	// ErrUserNotFound menandai baris user yang tidak ada atau sesi kedaluwarsa.
	ErrUserNotFound = errors.New("user not found")

	// ErrInvalidCredentials menandai email atau kata sandi yang tidak cocok.
	ErrInvalidCredentials = shared.ErrInvalidCredentials

	// ErrUnauthorized menandai token sesi yang tidak valid atau kedaluwarsa.
	ErrUnauthorized = shared.ErrUnauthorized
)
