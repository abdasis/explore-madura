package api_test

import (
	"net/http"
	"testing"
)

func TestHealth(t *testing.T) {
	application := newTestApp(t, newFakeRepo(t))

	res := doRequest(t, application, http.MethodGet, "/health", "", "")
	if res.status != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
	}

	got := decodeData[struct {
		Status string `json:"status"`
	}](t, res)
	if got.Status != "ok" {
		t.Fatalf("status = %q, want ok", got.Status)
	}
}

func TestRouterErrors(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		path        string
		wantStatus  int
		wantCode    string
		wantMessage string
	}{
		{
			name:        "endpoint tidak ada",
			method:      http.MethodGet,
			path:        "/api/v1/tidak-ada",
			wantStatus:  http.StatusNotFound,
			wantCode:    "not_found",
			wantMessage: "Endpoint tidak ditemukan.",
		},
		{
			name:        "metode tidak didukung",
			method:      http.MethodDelete,
			path:        "/health",
			wantStatus:  http.StatusMethodNotAllowed,
			wantCode:    "method_not_allowed",
			wantMessage: "Metode tidak didukung.",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			application := newTestApp(t, newFakeRepo(t))

			res := doRequest(t, application, test.method, test.path, "", "")
			if res.status != test.wantStatus {
				t.Fatalf("status = %d, want %d (body=%s)", res.status, test.wantStatus, res.body)
			}
			got := decodeError(t, res)
			if got.Error.Code != test.wantCode || got.Error.Message != test.wantMessage {
				t.Fatalf("error = %+v, want code=%q message=%q", got.Error, test.wantCode, test.wantMessage)
			}
		})
	}
}
