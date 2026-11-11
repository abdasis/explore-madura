package api_test

import (
	"encoding/hex"
	"net/http"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"

	"github.com/abdasis/explore-madura/api/internal/modules/auth"
)

func TestLogin(t *testing.T) {
	t.Run("kredensial valid menerbitkan token hex", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := login(t, application, adminEmail, adminPassword)
		if res.status != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
		}

		data := decodeData[auth.LoginResponse](t, res)
		if len(data.Token) != 64 {
			t.Fatalf("panjang token = %d, want 64", len(data.Token))
		}
		if _, err := hex.DecodeString(data.Token); err != nil {
			t.Fatalf("token bukan hex: %v", err)
		}
		if data.User.ID != 1 || data.User.Email != adminEmail || data.User.Name != adminName {
			t.Fatalf("user tidak sesuai: %+v", data.User)
		}
		if data.User.Permissions == nil {
			t.Fatal("permissions null, harus array")
		}
		if len(data.User.Permissions) != 2 {
			t.Fatalf("permissions = %v, want 2 item", data.User.Permissions)
		}
	})

	t.Run("email dinormalisasi", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := login(t, application, " Admin@JelajahBangkalan.Test ", adminPassword)
		if res.status != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
		}
	})

	t.Run("kata sandi salah", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := login(t, application, adminEmail, "salah")
		assertUnauthorized(t, res, "Email atau kata sandi salah.")
	})

	t.Run("email tidak terdaftar", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := login(t, application, "tidak-ada@jelajahbangkalan.test", adminPassword)
		assertUnauthorized(t, res, "Email atau kata sandi salah.")
	})

	t.Run("body bukan json", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := doRequest(t, application, http.MethodPost, "/api/v1/auth/login", "{", "")
		if res.status != http.StatusUnprocessableEntity {
			t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
		}
		got := decodeError(t, res)
		if got.Error.Code != "validation_error" || got.Error.Message != "Body permintaan tidak valid." {
			t.Fatalf("error = %+v", got.Error)
		}
	})

	t.Run("validasi field wajib", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := doRequest(t, application, http.MethodPost, "/api/v1/auth/login", `{"email":"bukan-email"}`, "")
		if res.status != http.StatusUnprocessableEntity {
			t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
		}
		got := decodeError(t, res)
		if got.Error.Code != "validation_error" || got.Error.Message != "Data yang dikirim belum valid." {
			t.Fatalf("error = %+v", got.Error)
		}
		if got.Error.Fields["email"] == "" || got.Error.Fields["password"] == "" {
			t.Fatalf("fields = %v, want email dan password", got.Error.Fields)
		}
	})

	t.Run("duplikat sesi jadi 409", func(t *testing.T) {
		repo := newFakeRepo(t)
		repo.createSessionErr = &pgconn.PgError{Code: "23505"}
		application := newTestApp(t, repo)

		res := login(t, application, adminEmail, adminPassword)
		if res.status != http.StatusConflict {
			t.Fatalf("status = %d, want 409 (body=%s)", res.status, res.body)
		}
		got := decodeError(t, res)
		if got.Error.Code != "conflict" || got.Error.Message != "Data sudah ada." {
			t.Fatalf("error = %+v", got.Error)
		}
	})
}

func TestMe(t *testing.T) {
	t.Run("token valid", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		token := decodeData[auth.LoginResponse](t, login(t, application, adminEmail, adminPassword)).Token
		res := doRequest(t, application, http.MethodGet, "/api/v1/auth/me", "", token)
		if res.status != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
		}

		data := decodeData[auth.MeResponse](t, res)
		if data.User.Email != adminEmail {
			t.Fatalf("email = %q, want %q", data.User.Email, adminEmail)
		}
		if data.User.Permissions == nil {
			t.Fatal("permissions null, harus array")
		}
	})

	t.Run("tanpa token", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := doRequest(t, application, http.MethodGet, "/api/v1/auth/me", "", "")
		assertUnauthorized(t, res, "Sesi tidak valid atau sudah berakhir.")
	})

	t.Run("token tidak dikenal", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := doRequest(t, application, http.MethodGet, "/api/v1/auth/me", "", "deadbeef")
		assertUnauthorized(t, res, "Sesi tidak valid atau sudah berakhir.")
	})
}

func TestLogout(t *testing.T) {
	t.Run("menghapus sesi", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		token := decodeData[auth.LoginResponse](t, login(t, application, adminEmail, adminPassword)).Token
		res := doRequest(t, application, http.MethodPost, "/api/v1/auth/logout", "", token)
		if res.status != http.StatusNoContent {
			t.Fatalf("status = %d, want 204 (body=%s)", res.status, res.body)
		}
		if len(res.body) != 0 {
			t.Fatalf("body logout = %q, want kosong", res.body)
		}

		after := doRequest(t, application, http.MethodGet, "/api/v1/auth/me", "", token)
		assertUnauthorized(t, after, "Sesi tidak valid atau sudah berakhir.")
	})

	t.Run("tanpa token", func(t *testing.T) {
		application := newTestApp(t, newFakeRepo(t))

		res := doRequest(t, application, http.MethodPost, "/api/v1/auth/logout", "", "")
		assertUnauthorized(t, res, "Sesi tidak valid atau sudah berakhir.")
	})
}

func assertUnauthorized(t *testing.T, res response, message string) {
	t.Helper()

	if res.status != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Code != "unauthorized" || got.Error.Message != message {
		t.Fatalf("error = %+v, want code=unauthorized message=%q", got.Error, message)
	}
}
