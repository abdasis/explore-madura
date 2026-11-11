package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/abdasis/explore-madura/api/internal/app"
	"github.com/abdasis/explore-madura/api/internal/config"
	"github.com/abdasis/explore-madura/api/internal/infrastructure"
	"github.com/abdasis/explore-madura/api/internal/modules/auth"
	"github.com/abdasis/explore-madura/api/internal/modules/destinations"
	"github.com/abdasis/explore-madura/api/internal/modules/posts"
	"github.com/abdasis/explore-madura/api/migrations"
)

func main() {
	if err := run(); err != nil {
		slog.Error("api berhenti", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	connectCtx, cancelConnect := context.WithTimeout(ctx, 10*time.Second)
	defer cancelConnect()

	pool, err := infrastructure.Connect(connectCtx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := infrastructure.Migrate(ctx, pool, migrations.FS); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}

	authService := auth.NewService(auth.NewRepository(pool), cfg.SessionTTL)
	destinationsService := destinations.NewService(destinations.NewRepository(pool))
	postsService := posts.NewService(posts.NewRepository(pool))
	server := app.New(cfg, authService, destinationsService, postsService)

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.ShutdownWithContext(shutdownCtx)
	}()

	addr := ":" + cfg.Port
	slog.Info("api mendengarkan", "addr", addr)
	if err := server.Listen(addr, fiber.ListenConfig{DisableStartupMessage: true}); err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	return nil
}
