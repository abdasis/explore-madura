package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"golang.org/x/crypto/bcrypt"

	"github.com/abdasis/explore-madura/api/internal/app"
	"github.com/abdasis/explore-madura/api/internal/config"
	"github.com/abdasis/explore-madura/api/internal/modules/auth"
	"github.com/abdasis/explore-madura/api/internal/modules/destinations"
	"github.com/abdasis/explore-madura/api/internal/modules/posts"
)

const (
	adminEmail    = "admin@exploremadura.test"
	adminName     = "Admin Explore Madura"
	adminPassword = "Admin#12345"
)

type fakeRepo struct {
	usersByEmail     map[string]auth.User
	usersByID        map[int64]auth.User
	sessions         map[string]int64
	createSessionErr error
}

func newFakeRepo(t *testing.T) *fakeRepo {
	t.Helper()
	return newFakeRepoWithPermissions(t, "destination:read", "destination:write")
}

func newFakeRepoWithPermissions(t *testing.T, permissions ...string) *fakeRepo {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	admin := auth.User{
		ID:           1,
		Email:        adminEmail,
		Name:         adminName,
		PasswordHash: string(hash),
		Permissions:  permissions,
	}

	return &fakeRepo{
		usersByEmail: map[string]auth.User{admin.Email: admin},
		usersByID:    map[int64]auth.User{admin.ID: admin},
		sessions:     make(map[string]int64),
	}
}

func (f *fakeRepo) FindByEmail(_ context.Context, email string) (auth.User, error) {
	user, ok := f.usersByEmail[email]
	if !ok {
		return auth.User{}, auth.ErrUserNotFound
	}
	return user, nil
}

func (f *fakeRepo) UpsertUser(context.Context, string, string, string, []string) error {
	return nil
}

func (f *fakeRepo) CreateSession(_ context.Context, token string, userID int64, _ time.Time) error {
	if f.createSessionErr != nil {
		return f.createSessionErr
	}
	f.sessions[token] = userID
	return nil
}

func (f *fakeRepo) DeleteSession(_ context.Context, token string) error {
	delete(f.sessions, token)
	return nil
}

func (f *fakeRepo) FindUserByToken(_ context.Context, token string) (auth.User, error) {
	userID, ok := f.sessions[token]
	if !ok {
		return auth.User{}, auth.ErrUserNotFound
	}
	return f.usersByID[userID], nil
}

func newTestApp(t *testing.T, repo *fakeRepo, services ...any) *fiber.App {
	t.Helper()

	cfg := config.Config{
		Port:        "8091",
		DatabaseURL: "",
		WebOrigin:   "http://localhost:5180",
		SessionTTL:  time.Hour,
		UploadDir:   t.TempDir(),
		MaxUploadMB: 5,
		MaxVideoMB:  5,
	}

	var destinationsService *destinations.Service
	var postsService *posts.Service
	for _, service := range services {
		switch typed := service.(type) {
		case *destinations.Service:
			destinationsService = typed
		case *posts.Service:
			postsService = typed
		}
	}
	return app.New(cfg, auth.NewService(repo, cfg.SessionTTL), destinationsService, postsService)
}

type dataEnvelope[T any] struct {
	Data T `json:"data"`
}

type errorEnvelope struct {
	Error struct {
		Code    string            `json:"code"`
		Message string            `json:"message"`
		Fields  map[string]string `json:"fields"`
	} `json:"error"`
}

type response struct {
	status int
	body   []byte
}

func doRequest(t *testing.T, application *fiber.App, method, path, body, bearer string) response {
	t.Helper()

	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, reader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}

	res, err := application.Test(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()

	payload, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("baca body %s %s: %v", method, path, err)
	}
	return response{status: res.StatusCode, body: payload}
}

func doMultipart(t *testing.T, application *fiber.App, path, contentType string, body []byte, bearer string) response {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", contentType)
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}

	res, err := application.Test(req)
	if err != nil {
		t.Fatalf("POST %s: %v", path, err)
	}
	defer res.Body.Close()

	payload, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("baca body POST %s: %v", path, err)
	}
	return response{status: res.StatusCode, body: payload}
}

func decodeData[T any](t *testing.T, res response) T {
	t.Helper()

	var envelope dataEnvelope[T]
	if err := json.Unmarshal(res.body, &envelope); err != nil {
		t.Fatalf("decode data envelope: %v (body=%s)", err, res.body)
	}
	return envelope.Data
}

func decodeError(t *testing.T, res response) errorEnvelope {
	t.Helper()

	var envelope errorEnvelope
	if err := json.Unmarshal(res.body, &envelope); err != nil {
		t.Fatalf("decode error envelope: %v (body=%s)", err, res.body)
	}
	return envelope
}

func login(t *testing.T, application *fiber.App, email, password string) response {
	t.Helper()

	body := `{"email":"` + email + `","password":"` + password + `"}`
	return doRequest(t, application, http.MethodPost, "/api/v1/auth/login", body, "")
}
