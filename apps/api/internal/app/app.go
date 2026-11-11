// Package app merakit seluruh modul HTTP menjadi satu *fiber.App.
package app

import (
	"log/slog"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/static"

	"github.com/abdasis/explore-madura/api/internal/config"
	"github.com/abdasis/explore-madura/api/internal/modules/auth"
	"github.com/abdasis/explore-madura/api/internal/modules/destinations"
	"github.com/abdasis/explore-madura/api/internal/modules/posts"
	"github.com/abdasis/explore-madura/api/internal/shared"
)

const (
	fallbackUploadMB = 5
	fallbackVideoMB  = 50
)

type healthResponse struct {
	Status string `json:"status"`
}

// New merakit aplikasi lengkap dengan middleware dasar, modul auth, modul
// destinasi, modul artikel, dan penyajian file upload.
func New(cfg config.Config, authService *auth.Service, destinationsService *destinations.Service, postsService *posts.Service) *fiber.App {
	maxUploadMB := uploadLimitMB(cfg)
	maxVideoMB := videoLimitMB(cfg)
	app := fiber.New(fiber.Config{
		ErrorHandler: shared.HandleError,
		BodyLimit:    (max(maxUploadMB, maxVideoMB) + 2) << 20,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{cfg.WebOrigin},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Authorization", "Content-Type"},
	}))

	app.Get("/health", func(c fiber.Ctx) error {
		return shared.Data(c, healthResponse{Status: "ok"})
	})

	if cfg.UploadDir != "" {
		if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
			slog.Warn("gagal membuat direktori upload", "dir", cfg.UploadDir, "err", err)
		}
		app.Use("/uploads", static.New(cfg.UploadDir))
	}

	v1 := app.Group("/api/v1")
	auth.Register(v1, authService)
	if destinationsService != nil {
		destinations.Register(v1, destinationsService, authService, cfg.UploadDir, maxUploadMB, maxVideoMB)
	}
	if postsService != nil {
		posts.Register(v1, postsService, authService, cfg.UploadDir, maxUploadMB)
	}

	return app
}

func uploadLimitMB(cfg config.Config) int {
	if cfg.MaxUploadMB <= 0 {
		return fallbackUploadMB
	}
	return cfg.MaxUploadMB
}

func videoLimitMB(cfg config.Config) int {
	if cfg.MaxVideoMB <= 0 {
		return fallbackVideoMB
	}
	return cfg.MaxVideoMB
}
