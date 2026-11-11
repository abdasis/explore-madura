// Package config membaca environment sekali di awal dan memvalidasinya.
package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"time"
)

// Config menampung pengaturan runtime dari environment.
type Config struct {
	Port        string
	DatabaseURL string
	WebOrigin   string
	SessionTTL  time.Duration
	UploadDir   string
	MaxUploadMB int
	MaxVideoMB  int
}

// Load membaca environment dengan default lokal yang siap pakai dan menolak
// nilai yang tidak valid.
func Load() (Config, error) {
	port, err := envPort("PORT", "8091")
	if err != nil {
		return Config{}, err
	}

	webOrigin, err := envOrigin("WEB_ORIGIN", "http://localhost:5180")
	if err != nil {
		return Config{}, err
	}

	ttlHours, err := envPositiveInt("SESSION_TTL_HOURS", 24)
	if err != nil {
		return Config{}, err
	}

	maxUploadMB, err := envPositiveInt("MAX_UPLOAD_MB", 5)
	if err != nil {
		return Config{}, err
	}

	maxVideoMB, err := envPositiveInt("MAX_VIDEO_MB", 50)
	if err != nil {
		return Config{}, err
	}

	return Config{
		Port:        port,
		DatabaseURL: env("DATABASE_URL", "postgres://starter:starter@localhost:5439/starter?sslmode=disable"),
		WebOrigin:   webOrigin,
		SessionTTL:  time.Duration(ttlHours) * time.Hour,
		UploadDir:   env("UPLOAD_DIR", "./uploads"),
		MaxUploadMB: maxUploadMB,
		MaxVideoMB:  maxVideoMB,
	}, nil
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envPort(key, fallback string) (string, error) {
	value := env(key, fallback)
	port, err := strconv.Atoi(value)
	if err != nil || port <= 0 || port > 65535 {
		return "", fmt.Errorf("%s bukan port valid: %q", key, value)
	}
	return value, nil
}

func envOrigin(key, fallback string) (string, error) {
	value := env(key, fallback)
	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("%s bukan URL valid: %q", key, value)
	}
	return value, nil
}

func envPositiveInt(key string, fallback int) (int, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s harus bilangan bulat positif: %q", key, raw)
	}
	return value, nil
}
