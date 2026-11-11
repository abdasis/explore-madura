package posts

import (
	"github.com/gofiber/fiber/v3"

	"github.com/abdasis/explore-madura/api/internal/modules/auth"
)

const (
	// PermissionRead adalah kode izin baca artikel.
	PermissionRead = "blog:read"

	// PermissionWrite adalah kode izin tulis artikel.
	PermissionWrite = "blog:write"
)

// Register memasang route publik dan admin modul artikel.
func Register(router fiber.Router, svc *Service, authService *auth.Service, uploadDir string, maxUploadMB int) {
	handler := NewHandler(svc, newUploader(uploadDir, maxUploadMB))

	router.Get("/public/posts", handler.PublicList)
	router.Get("/public/posts/:slug", handler.PublicGet)

	admin := router.Group("/posts", auth.RequireAuth(authService))
	admin.Get("", auth.RequirePermission(PermissionRead), handler.List)
	admin.Get("/:id", auth.RequirePermission(PermissionRead), handler.Get)
	admin.Post("", auth.RequirePermission(PermissionWrite), handler.Create)
	admin.Put("/:id", auth.RequirePermission(PermissionWrite), handler.Update)
	admin.Delete("/:id", auth.RequirePermission(PermissionWrite), handler.Delete)
	admin.Post("/:id/cover", auth.RequirePermission(PermissionWrite), handler.UploadCover)
	admin.Delete("/:id/cover", auth.RequirePermission(PermissionWrite), handler.DeleteCover)
}
