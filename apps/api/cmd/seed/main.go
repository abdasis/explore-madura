package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/abdasis/explore-madura/api/internal/config"
	"github.com/abdasis/explore-madura/api/internal/infrastructure"
	"github.com/abdasis/explore-madura/api/internal/modules/auth"
	"github.com/abdasis/explore-madura/api/internal/modules/destinations"
	"github.com/abdasis/explore-madura/api/internal/modules/posts"
	"github.com/abdasis/explore-madura/api/migrations"
)

const (
	adminEmail    = "admin@exploremadura.test"
	adminName     = "Admin Explore Madura"
	adminPassword = "Admin#12345"
)

func main() {
	if err := run(); err != nil {
		slog.Error("seed gagal", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := infrastructure.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := infrastructure.Migrate(ctx, pool, migrations.FS); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	service := auth.NewService(auth.NewRepository(pool), cfg.SessionTTL)
	permissions := []string{
		"destination:read", "destination:write",
		posts.PermissionRead, posts.PermissionWrite,
	}
	err = service.EnsureAdmin(ctx, adminEmail, adminName, adminPassword, permissions)
	if err != nil {
		return err
	}

	if err := destinations.EnsureSeed(ctx, destinations.NewRepository(pool)); err != nil {
		return fmt.Errorf("seed destinasi: %w", err)
	}

	if err := posts.EnsureSeed(ctx, posts.NewRepository(pool)); err != nil {
		return fmt.Errorf("seed artikel: %w", err)
	}

	slog.Info("seed selesai", "email", adminEmail)
	return nil
}
