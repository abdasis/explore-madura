package api_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/abdasis/explore-madura/api/internal/modules/posts"
)

type fakePostStore struct {
	public         []posts.Post
	detail         posts.Post
	createErr      error
	setCoverCalls  int
	setCoverID     int64
	setCoverPath   string
	deleteCoverID  int64
	deleteCoverURL string
}

func (f *fakePostStore) List(context.Context, int, int, string) ([]posts.Post, posts.PaginationMeta, error) {
	return f.public, posts.PaginationMeta{Page: 1, PerPage: 20, Total: len(f.public)}, nil
}

func (f *fakePostStore) PublicList(context.Context) ([]posts.Post, error) {
	return f.public, nil
}

func (f *fakePostStore) PublicBySlug(_ context.Context, slug string) (posts.Post, error) {
	if f.detail.ID == 0 || f.detail.Slug != slug {
		return posts.Post{}, posts.ErrNotFound
	}
	return f.detail, nil
}

func (f *fakePostStore) Get(context.Context, int64) (posts.Post, error) {
	if f.detail.ID == 0 {
		return posts.Post{}, posts.ErrNotFound
	}
	return f.detail, nil
}

func (f *fakePostStore) SlugExists(context.Context, string) (bool, error) {
	return false, nil
}

func (f *fakePostStore) Create(_ context.Context, post posts.Post, _ posts.Actor) (posts.Post, error) {
	if f.createErr != nil {
		return posts.Post{}, f.createErr
	}
	post.ID = 1
	return post, nil
}

func (f *fakePostStore) Update(_ context.Context, post posts.Post, _ posts.Actor) (posts.Post, error) {
	return post, nil
}

func (f *fakePostStore) Delete(context.Context, int64, posts.Actor) (string, error) {
	return "blog/lama.jpg", nil
}

func (f *fakePostStore) SetCover(_ context.Context, id int64, path string, _ posts.Actor) (string, error) {
	f.setCoverCalls++
	f.setCoverID = id
	f.setCoverPath = path
	return "blog/lama.jpg", nil
}

func (f *fakePostStore) DeleteCover(_ context.Context, id int64, _ posts.Actor) (string, error) {
	f.deleteCoverID = id
	f.deleteCoverURL = "blog/lama.jpg"
	return f.deleteCoverURL, nil
}

func publishedAt() *time.Time {
	value := time.Date(2026, time.October, 14, 9, 0, 0, 0, time.UTC)
	return &value
}

func TestPublicPostsNeedsNoAuthAndHidesContent(t *testing.T) {
	store := &fakePostStore{public: []posts.Post{
		{
			ID: 1, Title: "Karapan Sapi", Slug: "karapan-sapi",
			Excerpt: "Tradisi balapan sapi khas Madura.", Content: "Isi panjang yang tidak boleh bocor.",
			CoverPath: "blog/cover.jpg", Tag: "Budaya", IsPublished: true, PublishedAt: publishedAt(),
		},
		{
			ID: 2, Title: "Clurit Madura", Slug: "clurit-madura",
			Excerpt: "Bilah melengkung khas Madura.", Tag: "Budaya", IsPublished: true, PublishedAt: publishedAt(),
		},
	}}
	application := newTestApp(t, newFakeRepo(t), posts.NewService(store))

	res := doRequest(t, application, http.MethodGet, "/api/v1/public/posts", "", "")
	if res.status != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
	}

	items := decodeData[[]map[string]any](t, res)
	if len(items) != 2 || items[0]["title"] != "Karapan Sapi" {
		t.Fatalf("daftar publik = %+v", items)
	}
	if _, ok := items[0]["content"]; ok {
		t.Fatal("content ikut terkirim pada daftar publik")
	}
	if cover, _ := items[0]["cover_url"].(string); cover != "/uploads/blog/cover.jpg" {
		t.Fatalf("cover_url = %v, want /uploads/blog/cover.jpg", items[0]["cover_url"])
	}
	if items[1]["cover_url"] != nil {
		t.Fatalf("cover_url = %v, want null", items[1]["cover_url"])
	}
}

func TestPublicPostDetailIncludesContent(t *testing.T) {
	store := &fakePostStore{detail: posts.Post{
		ID: 1, Title: "Karapan Sapi", Slug: "karapan-sapi",
		Excerpt: "Tradisi balapan sapi khas Madura.", Content: "Karapan sapi adalah balapan tradisional.",
		Tag: "Budaya", IsPublished: true, PublishedAt: publishedAt(),
	}}
	application := newTestApp(t, newFakeRepo(t), posts.NewService(store))

	res := doRequest(t, application, http.MethodGet, "/api/v1/public/posts/karapan-sapi", "", "")
	if res.status != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
	}
	got := decodeData[struct {
		Slug    string  `json:"slug"`
		Content string  `json:"content"`
		Cover   *string `json:"cover_url"`
	}](t, res)
	if got.Slug != "karapan-sapi" || got.Content == "" {
		t.Fatalf("detail = %+v, want slug dan content", got)
	}

	missing := doRequest(t, application, http.MethodGet, "/api/v1/public/posts/tidak-ada", "", "")
	if missing.status != http.StatusNotFound {
		t.Fatalf("status = %d, want 404 (body=%s)", missing.status, missing.body)
	}
}

func TestAdminPostsRequiresBearer(t *testing.T) {
	application := newTestApp(t, newFakeRepo(t), posts.NewService(&fakePostStore{}))

	res := doRequest(t, application, http.MethodGet, "/api/v1/posts", "", "")
	if res.status != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401 (body=%s)", res.status, res.body)
	}
}

func TestAdminPostsRequiresWritePermission(t *testing.T) {
	repo := newFakeRepoWithPermissions(t, posts.PermissionRead)
	application := newTestApp(t, repo, posts.NewService(&fakePostStore{}))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	res := doRequest(t, application, http.MethodPost, "/api/v1/posts", `{}`, token)
	if res.status != http.StatusForbidden {
		t.Fatalf("status = %d, want 403 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Code != "forbidden" {
		t.Fatalf("code = %q, want forbidden", got.Error.Code)
	}
}

func TestCreatePostReturnsValidationFields(t *testing.T) {
	repo := newFakeRepoWithPermissions(t, posts.PermissionWrite)
	application := newTestApp(t, repo, posts.NewService(&fakePostStore{}))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	res := doRequest(t, application, http.MethodPost, "/api/v1/posts", `{}`, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Code != "validation_error" {
		t.Fatalf("code = %q, want validation_error", got.Error.Code)
	}
	if got.Error.Fields["title"] == "" || got.Error.Fields["tag"] == "" {
		t.Fatalf("fields = %v, want title dan tag", got.Error.Fields)
	}
}

func TestCreatePostSlugConflictReturns409(t *testing.T) {
	repo := newFakeRepoWithPermissions(t, posts.PermissionWrite)
	store := &fakePostStore{createErr: posts.ErrSlugTaken}
	application := newTestApp(t, repo, posts.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	body := `{"title":"Karapan Sapi","tag":"Budaya","excerpt":"Tradisi balapan sapi.","content":"Isi artikel."}`
	res := doRequest(t, application, http.MethodPost, "/api/v1/posts", body, token)
	if res.status != http.StatusConflict {
		t.Fatalf("status = %d, want 409 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Code != "conflict" {
		t.Fatalf("code = %q, want conflict", got.Error.Code)
	}
}

func TestUploadPostCoverRejectsNonImage(t *testing.T) {
	repo := newFakeRepoWithPermissions(t, posts.PermissionWrite)
	store := &fakePostStore{}
	application := newTestApp(t, repo, posts.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "artikel.txt", []byte("bukan gambar"))
	res := doMultipart(t, application, "/api/v1/posts/1/cover", contentType, body, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Fields["file"] == "" {
		t.Fatalf("fields = %v, want error pada file", got.Error.Fields)
	}
	if store.setCoverCalls != 0 {
		t.Fatalf("SetCover dipanggil %d kali, want 0", store.setCoverCalls)
	}
}

func TestUploadPostCoverStoresFile(t *testing.T) {
	repo := newFakeRepoWithPermissions(t, posts.PermissionWrite)
	store := &fakePostStore{}
	application := newTestApp(t, repo, posts.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "karapan-sapi.png", pngBytes())
	res := doMultipart(t, application, "/api/v1/posts/1/cover", contentType, body, token)
	if res.status != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body=%s)", res.status, res.body)
	}
	got := decodeData[struct {
		CoverURL *string `json:"cover_url"`
	}](t, res)
	if got.CoverURL == nil || !strings.HasPrefix(*got.CoverURL, "/uploads/blog/") || !strings.HasSuffix(*got.CoverURL, ".png") {
		t.Fatalf("cover_url = %v, want /uploads/blog/<hex>.png", got.CoverURL)
	}
	if store.setCoverCalls != 1 || store.setCoverID != 1 || !strings.HasPrefix(store.setCoverPath, "blog/") {
		t.Fatalf("SetCover calls=%d id=%d path=%q", store.setCoverCalls, store.setCoverID, store.setCoverPath)
	}
}

func TestDeletePostCoverReturnsNoContent(t *testing.T) {
	repo := newFakeRepoWithPermissions(t, posts.PermissionWrite)
	store := &fakePostStore{}
	application := newTestApp(t, repo, posts.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	res := doRequest(t, application, http.MethodDelete, "/api/v1/posts/2/cover", "", token)
	if res.status != http.StatusNoContent {
		t.Fatalf("status = %d, want 204 (body=%s)", res.status, res.body)
	}
	if store.deleteCoverID != 2 {
		t.Fatalf("DeleteCover id = %d, want 2", store.deleteCoverID)
	}
}

// pngBytes mengembalikan kepala file PNG minimal yang dikenali
// http.DetectContentType sebagai image/png.
func pngBytes() []byte {
	head := []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")
	return append(head, make([]byte, 32)...)
}
