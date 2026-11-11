package auth

import (
	"github.com/gofiber/fiber/v3"

	"github.com/abdasis/explore-madura/api/internal/infrastructure"
	"github.com/abdasis/explore-madura/api/internal/shared"
)

type userKey struct{}
type tokenKey struct{}

// Handler menangani endpoint autentikasi.
type Handler struct {
	svc *Service
}

// NewHandler merakit handler auth.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Login menukar kredensial menjadi token sesi.
func (h *Handler) Login(c fiber.Ctx) error {
	var req LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return shared.InvalidBody()
	}
	if err := validateLogin(req); err != nil {
		return err
	}

	result, err := h.svc.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return err
	}

	return shared.Data(c, LoginResponse{
		Token: result.Token,
		User:  toUserResponse(result.User),
	})
}

// Me mengembalikan user pemilik sesi aktif.
func (h *Handler) Me(c fiber.Ctx) error {
	return shared.Data(c, MeResponse{User: toUserResponse(CurrentUser(c))})
}

// Logout menghapus sesi aktif.
func (h *Handler) Logout(c fiber.Ctx) error {
	if err := h.svc.Logout(c.Context(), currentToken(c)); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// RequireAuth menolak request tanpa token Bearer yang valid.
func RequireAuth(svc *Service) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := infrastructure.BearerToken(c)
		user, err := svc.Authenticate(c.Context(), token)
		if err != nil {
			return err
		}

		c.Locals(userKey{}, user)
		c.Locals(tokenKey{}, token)
		return c.Next()
	}
}

// RequirePermission menolak user yang tidak memiliki kode izin tertentu.
func RequirePermission(code string) fiber.Handler {
	return func(c fiber.Ctx) error {
		user := CurrentUser(c)
		for _, permission := range user.Permissions {
			if permission == code {
				return c.Next()
			}
		}
		return shared.Forbidden("Anda tidak memiliki izin untuk aksi ini.")
	}
}

// CurrentUser mengembalikan user pemilik sesi aktif; zero value bila tidak ada.
func CurrentUser(c fiber.Ctx) User {
	user, _ := c.Locals(userKey{}).(User)
	return user
}

func currentToken(c fiber.Ctx) string {
	token, _ := c.Locals(tokenKey{}).(string)
	return token
}
