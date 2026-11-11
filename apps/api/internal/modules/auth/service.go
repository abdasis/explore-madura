package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/abdasis/explore-madura/api/internal/infrastructure"
)

// repository adalah dependensi persistensi yang dibutuhkan Service. Interface
// didefinisikan di sisi pemakai agar service bisa diuji dengan fake.
type repository interface {
	FindByEmail(ctx context.Context, email string) (User, error)
	UpsertUser(ctx context.Context, email, name, passwordHash string, permissions []string) error
	CreateSession(ctx context.Context, token string, userID int64, expiresAt time.Time) error
	DeleteSession(ctx context.Context, token string) error
	FindUserByToken(ctx context.Context, token string) (User, error)
}

// Result adalah hasil login yang dikirim ke klien.
type Result struct {
	Token string
	User  User
}

// Service memegang aturan autentikasi: verifikasi password dan siklus sesi.
type Service struct {
	repo       repository
	sessionTTL time.Duration
}

// NewService merakit service auth di atas repository dan TTL sesi.
func NewService(repo repository, sessionTTL time.Duration) *Service {
	return &Service{repo: repo, sessionTTL: sessionTTL}
}

// Login memverifikasi kredensial lalu menerbitkan token sesi baru.
func (s *Service) Login(ctx context.Context, email, password string) (Result, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return Result{}, ErrInvalidCredentials
	}

	user, err := s.repo.FindByEmail(ctx, email)
	if errors.Is(err, ErrUserNotFound) {
		return Result{}, ErrInvalidCredentials
	}
	if err != nil {
		return Result{}, err
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return Result{}, ErrInvalidCredentials
	}

	token, err := infrastructure.GenerateToken()
	if err != nil {
		return Result{}, err
	}

	expiresAt := infrastructure.Expiry(time.Now().UTC(), s.sessionTTL)
	if err := s.repo.CreateSession(ctx, token, user.ID, expiresAt); err != nil {
		return Result{}, err
	}
	return Result{Token: token, User: user}, nil
}

// Authenticate mengembalikan pemilik token yang masih berlaku.
func (s *Service) Authenticate(ctx context.Context, token string) (User, error) {
	if token == "" {
		return User{}, ErrUnauthorized
	}

	user, err := s.repo.FindUserByToken(ctx, token)
	if errors.Is(err, ErrUserNotFound) {
		return User{}, ErrUnauthorized
	}
	if err != nil {
		return User{}, err
	}
	return user, nil
}

// Logout menghapus sesi; token yang sudah tidak ada tetap dianggap berhasil.
func (s *Service) Logout(ctx context.Context, token string) error {
	return s.repo.DeleteSession(ctx, token)
}

// EnsureAdmin membuat atau menyegarkan akun admin seed secara idempoten.
func (s *Service) EnsureAdmin(ctx context.Context, email, name, password string, permissions []string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return s.repo.UpsertUser(ctx, strings.ToLower(strings.TrimSpace(email)), name, string(hash), permissions)
}
