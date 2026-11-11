package auth

import "github.com/gofiber/fiber/v3"

// Register memasang seluruh route modul auth pada router yang diberikan.
func Register(router fiber.Router, svc *Service) {
	handler := NewHandler(svc)

	router.Post("/auth/login", handler.Login)

	authenticated := router.Group("/auth", RequireAuth(svc))
	authenticated.Get("/me", handler.Me)
	authenticated.Post("/logout", handler.Logout)
}
