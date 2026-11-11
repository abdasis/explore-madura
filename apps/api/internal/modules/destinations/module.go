package destinations

import (
	"github.com/gofiber/fiber/v3"

	"github.com/abdasis/explore-madura/api/internal/modules/auth"
)

const (
	readPermission  = "destination:read"
	writePermission = "destination:write"
)

// Register memasang route publik dan admin modul destinasi.
func Register(router fiber.Router, svc *Service, authService *auth.Service, uploadDir string, maxUploadMB, maxVideoMB int) {
	handler := NewHandler(svc, newUploader(uploadDir, maxUploadMB, maxVideoMB))

	router.Get("/public/categories", handler.PublicCategories)
	router.Get("/public/destinations", handler.PublicList)

	admin := router.Group("/destinations", auth.RequireAuth(authService))
	admin.Get("", auth.RequirePermission(readPermission), handler.List)
	admin.Get("/:id", auth.RequirePermission(readPermission), handler.Get)
	admin.Post("", auth.RequirePermission(writePermission), handler.Create)
	admin.Put("/:id", auth.RequirePermission(writePermission), handler.Update)
	admin.Delete("/:id", auth.RequirePermission(writePermission), handler.Delete)
	admin.Post("/:id/photos", auth.RequirePermission(writePermission), handler.UploadPhoto)
	admin.Delete("/:id/photos/:photoId", auth.RequirePermission(writePermission), handler.DeletePhoto)
	admin.Put("/:id/photos/:photoId/cover", auth.RequirePermission(writePermission), handler.SetCover)
	admin.Post("/:id/video", auth.RequirePermission(writePermission), handler.UploadVideo)
	admin.Delete("/:id/video", auth.RequirePermission(writePermission), handler.DeleteVideo)
}
