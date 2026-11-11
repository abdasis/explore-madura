package infrastructure

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

const tokenBytes = 32

// GenerateToken membuat token sesi opaque 32 byte acak dalam bentuk hex.
func GenerateToken() (string, error) {
	buf := make([]byte, tokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

// Expiry menghitung waktu kedaluwarsa sesi dari now dan ttl.
func Expiry(now time.Time, ttl time.Duration) time.Time {
	return now.Add(ttl)
}

// BearerToken mengambil token dari header Authorization; string kosong bila
// header tidak memakai skema Bearer.
func BearerToken(c fiber.Ctx) string {
	const prefix = "bearer "
	header := c.Get(fiber.HeaderAuthorization)
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return ""
	}
	return strings.TrimSpace(header[len(prefix):])
}
