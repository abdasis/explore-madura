package api_test

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"strings"
	"testing"

	"github.com/abdasis/explore-madura/api/internal/modules/destinations"
)

type fakeDestinationStore struct {
	public        []destinations.Destination
	categories    []destinations.Category
	addPhotoCalls int
	createErr     error
	setVideoCalls int
	lastVideo     *destinations.Video
	storedVideo   *destinations.Video
}

func (f *fakeDestinationStore) List(context.Context, int, int, string, string) ([]destinations.Destination, destinations.PaginationMeta, error) {
	return f.public, destinations.PaginationMeta{Page: 1, PerPage: 20, Total: len(f.public)}, nil
}

func (f *fakeDestinationStore) PublicList(context.Context) ([]destinations.Destination, error) {
	return f.public, nil
}

func (f *fakeDestinationStore) Get(context.Context, int64) (destinations.Destination, error) {
	return destinations.Destination{}, destinations.ErrNotFound
}

func (f *fakeDestinationStore) CategoryByID(context.Context, int64) (destinations.Category, error) {
	return destinations.Category{ID: 1, Slug: "nature", Name: "Alam", Icon: "TreesIcon"}, nil
}

func (f *fakeDestinationStore) Categories(context.Context) ([]destinations.Category, error) {
	return f.categories, nil
}

func (f *fakeDestinationStore) SlugExists(context.Context, string) (bool, error) {
	return false, nil
}

func (f *fakeDestinationStore) Create(_ context.Context, destination destinations.Destination, _ destinations.Actor) (destinations.Destination, error) {
	if f.createErr != nil {
		return destinations.Destination{}, f.createErr
	}
	destination.ID = 1
	return destination, nil
}

func (f *fakeDestinationStore) Update(_ context.Context, destination destinations.Destination, _ destinations.Actor) (destinations.Destination, error) {
	if destination.Video == nil {
		destination.Video = f.storedVideo
		return destination, nil
	}
	if destination.Video.Kind == "" {
		f.storedVideo = nil
		destination.Video = nil
		return destination, nil
	}
	cloned := *destination.Video
	f.storedVideo = &cloned
	destination.Video = &cloned
	return destination, nil
}

func (f *fakeDestinationStore) Delete(context.Context, int64, destinations.Actor) ([]string, error) {
	return nil, destinations.ErrNotFound
}

func (f *fakeDestinationStore) AddPhoto(_ context.Context, photo destinations.Photo, _ destinations.Actor) (destinations.Photo, error) {
	f.addPhotoCalls++
	photo.ID = 9
	return photo, nil
}

func (f *fakeDestinationStore) DeletePhoto(context.Context, int64, int64, destinations.Actor) (string, error) {
	return "", nil
}

func (f *fakeDestinationStore) SetCover(context.Context, int64, int64, destinations.Actor) error {
	return nil
}

func (f *fakeDestinationStore) SetVideo(_ context.Context, _ int64, video *destinations.Video, _ destinations.Actor) (string, error) {
	f.setVideoCalls++
	if video == nil || video.Kind == "" {
		f.lastVideo = nil
		f.storedVideo = nil
		return "", nil
	}
	cloned := *video
	f.lastVideo = &cloned
	f.storedVideo = &cloned
	return "", nil
}

func TestPublicDestinationsNeedsNoAuth(t *testing.T) {
	store := &fakeDestinationStore{
		public: []destinations.Destination{{
			ID:          1,
			CategoryID:  2,
			Category:    destinations.Category{ID: 2, Slug: "nature", Name: "Alam", Icon: "TreesIcon"},
			Name:        "Bukit Jaddih",
			Slug:        "bukit-jaddih",
			Latitude:    -7.0894,
			Longitude:   112.745,
			Rating:      4.6,
			IsFree:      true,
			IsPublished: true,
			Photos:      []destinations.Photo{},
		}},
		categories: []destinations.Category{{ID: 1, Slug: "beach", Name: "Pantai", Icon: "Beach02Icon"}},
	}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	res := doRequest(t, application, http.MethodGet, "/api/v1/public/destinations", "", "")
	if res.status != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
	}
	list := decodeData[[]struct {
		Name   string `json:"name"`
		Photos []any  `json:"photos"`
	}](t, res)
	if len(list) != 1 || list[0].Name != "Bukit Jaddih" {
		t.Fatalf("daftar publik = %+v", list)
	}
	if list[0].Photos == nil {
		t.Fatal("photos null, harus array")
	}

	categories := doRequest(t, application, http.MethodGet, "/api/v1/public/categories", "", "")
	if categories.status != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", categories.status, categories.body)
	}
	items := decodeData[[]struct {
		Slug string `json:"slug"`
	}](t, categories)
	if len(items) != 1 || items[0].Slug != "beach" {
		t.Fatalf("kategori = %+v", items)
	}
}

func TestAdminDestinationsRequiresBearer(t *testing.T) {
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(&fakeDestinationStore{}))

	res := doRequest(t, application, http.MethodGet, "/api/v1/destinations", "", "")
	if res.status != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401 (body=%s)", res.status, res.body)
	}
}

func TestAdminDestinationsRequiresWritePermission(t *testing.T) {
	repo := newFakeRepoWithPermissions(t, "destination:read")
	application := newTestApp(t, repo, destinations.NewService(&fakeDestinationStore{}))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	res := doRequest(t, application, http.MethodPost, "/api/v1/destinations", `{}`, token)
	if res.status != http.StatusForbidden {
		t.Fatalf("status = %d, want 403 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Code != "forbidden" {
		t.Fatalf("code = %q, want forbidden", got.Error.Code)
	}
}

func TestCreateDestinationReturnsValidationFields(t *testing.T) {
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(&fakeDestinationStore{}))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	res := doRequest(t, application, http.MethodPost, "/api/v1/destinations", `{}`, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Code != "validation_error" {
		t.Fatalf("code = %q, want validation_error", got.Error.Code)
	}
	if got.Error.Fields["name"] == "" || got.Error.Fields["category_id"] == "" {
		t.Fatalf("fields = %v, want name dan category_id", got.Error.Fields)
	}
}

func TestUploadRejectsNonImage(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "foto.txt", []byte("bukan gambar"))
	res := doMultipart(t, application, "/api/v1/destinations/1/photos", contentType, body, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Fields["file"] == "" {
		t.Fatalf("fields = %v, want error pada file", got.Error.Fields)
	}
	if store.addPhotoCalls != 0 {
		t.Fatalf("AddPhoto dipanggil %d kali, want 0", store.addPhotoCalls)
	}
}

func TestUploadRejectsOversize(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "foto.jpg", bytes.Repeat([]byte{'A'}, 5<<20+1))
	res := doMultipart(t, application, "/api/v1/destinations/1/photos", contentType, body, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Fields["file"] == "" {
		t.Fatalf("fields = %v, want error pada file", got.Error.Fields)
	}
	if store.addPhotoCalls != 0 {
		t.Fatalf("AddPhoto dipanggil %d kali, want 0", store.addPhotoCalls)
	}
}

func TestCreateDestinationAcceptsEmbedVideo(t *testing.T) {
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(&fakeDestinationStore{}))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	body := `{
		"name": "Bukit Jaddih",
		"category_id": 1,
		"latitude": -7.0894,
		"longitude": 112.745,
		"is_free": true,
		"video_kind": "embed",
		"video_url": "https://www.youtube.com/watch?v=abc123"
	}`
	res := doRequest(t, application, http.MethodPost, "/api/v1/destinations", body, token)
	if res.status != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body=%s)", res.status, res.body)
	}
	got := decodeData[struct {
		Video *struct {
			Kind string `json:"kind"`
			URL  string `json:"url"`
		} `json:"video"`
	}](t, res)
	if got.Video == nil || got.Video.Kind != destinations.VideoKindEmbed {
		t.Fatalf("video = %+v, want embed", got.Video)
	}
	if got.Video.URL != "https://www.youtube.com/watch?v=abc123" {
		t.Fatalf("url = %q", got.Video.URL)
	}
}

func TestCreateDestinationRejectsFileVideoPayload(t *testing.T) {
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(&fakeDestinationStore{}))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	body := `{
		"name": "Bukit Jaddih",
		"category_id": 1,
		"latitude": -7.0894,
		"longitude": 112.745,
		"is_free": true,
		"video_kind": "file",
		"video_url": "videos/abc.mp4"
	}`
	res := doRequest(t, application, http.MethodPost, "/api/v1/destinations", body, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Fields["video_kind"] == "" {
		t.Fatalf("fields = %v, want error pada video_kind", got.Error.Fields)
	}
}

func TestUploadVideoRejectsNonVideo(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "bukit-jaddih.txt", []byte("bukan video"))
	res := doMultipart(t, application, "/api/v1/destinations/1/video", contentType, body, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Fields["file"] == "" {
		t.Fatalf("fields = %v, want error pada file", got.Error.Fields)
	}
	if store.setVideoCalls != 0 {
		t.Fatalf("SetVideo dipanggil %d kali, want 0", store.setVideoCalls)
	}
}

func TestUploadVideoRejectsOversize(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "bukit-jaddih.mp4", bytes.Repeat([]byte{'A'}, 5<<20+1))
	res := doMultipart(t, application, "/api/v1/destinations/1/video", contentType, body, token)
	if res.status != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 (body=%s)", res.status, res.body)
	}
	got := decodeError(t, res)
	if got.Error.Fields["file"] == "" {
		t.Fatalf("fields = %v, want error pada file", got.Error.Fields)
	}
	if store.setVideoCalls != 0 {
		t.Fatalf("SetVideo dipanggil %d kali, want 0", store.setVideoCalls)
	}
}

func TestUploadVideoStoresFile(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "bukit-jaddih.mp4", mp4Bytes())
	res := doMultipart(t, application, "/api/v1/destinations/1/video", contentType, body, token)
	if res.status != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body=%s)", res.status, res.body)
	}
	got := decodeData[struct {
		Kind string `json:"kind"`
		URL  string `json:"url"`
	}](t, res)
	if got.Kind != destinations.VideoKindFile {
		t.Fatalf("kind = %q, want file", got.Kind)
	}
	if !strings.HasPrefix(got.URL, "/uploads/videos/") || !strings.HasSuffix(got.URL, ".mp4") {
		t.Fatalf("url = %q, want /uploads/videos/<hex>.mp4", got.URL)
	}
	if store.setVideoCalls != 1 || store.lastVideo == nil || store.lastVideo.Kind != destinations.VideoKindFile {
		t.Fatalf("SetVideo calls = %d video = %+v, want satu video file", store.setVideoCalls, store.lastVideo)
	}
}

func TestDeleteVideoClearsVideo(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	res := doRequest(t, application, http.MethodDelete, "/api/v1/destinations/1/video", "", token)
	if res.status != http.StatusNoContent {
		t.Fatalf("status = %d, want 204 (body=%s)", res.status, res.body)
	}
	if store.setVideoCalls != 1 || store.lastVideo != nil {
		t.Fatalf("SetVideo calls = %d video = %+v, want satu pemanggilan tanpa video", store.setVideoCalls, store.lastVideo)
	}
}

func TestCreateDestinationWithoutVideoReturnsNull(t *testing.T) {
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(&fakeDestinationStore{}))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	body := `{
		"name": "Bukit Jaddih",
		"category_id": 1,
		"latitude": -7.0894,
		"longitude": 112.745,
		"is_free": true
	}`
	res := doRequest(t, application, http.MethodPost, "/api/v1/destinations", body, token)
	if res.status != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body=%s)", res.status, res.body)
	}
	got := decodeData[struct {
		Video *struct{} `json:"video"`
	}](t, res)
	if got.Video != nil {
		t.Fatalf("video = %+v, want null", got.Video)
	}
}

func TestUpdateWithoutVideoKeepsUploadedVideo(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "bukit-jaddih.mp4", mp4Bytes())
	uploaded := decodeData[struct {
		Kind string `json:"kind"`
		URL  string `json:"url"`
	}](t, doMultipart(t, application, "/api/v1/destinations/1/video", contentType, body, token))

	update := `{
		"name": "Bukit Jaddih",
		"category_id": 1,
		"latitude": -7.0894,
		"longitude": 112.745,
		"is_free": true
	}`
	res := doRequest(t, application, http.MethodPut, "/api/v1/destinations/1", update, token)
	if res.status != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
	}
	got := decodeData[struct {
		Video *struct {
			Kind string `json:"kind"`
			URL  string `json:"url"`
		} `json:"video"`
	}](t, res)
	if got.Video == nil || got.Video.Kind != destinations.VideoKindFile || got.Video.URL != uploaded.URL {
		t.Fatalf("video = %+v, want tetap %s %s", got.Video, uploaded.Kind, uploaded.URL)
	}
}

func TestUpdateWithEmptyVideoKindClearsVideo(t *testing.T) {
	store := &fakeDestinationStore{}
	application := newTestApp(t, newFakeRepo(t), destinations.NewService(store))

	token := decodeData[struct {
		Token string `json:"token"`
	}](t, login(t, application, adminEmail, adminPassword)).Token

	contentType, body := multipartBody(t, "bukit-jaddih.mp4", mp4Bytes())
	doMultipart(t, application, "/api/v1/destinations/1/video", contentType, body, token)

	update := `{
		"name": "Bukit Jaddih",
		"category_id": 1,
		"latitude": -7.0894,
		"longitude": 112.745,
		"is_free": true,
		"video_kind": "",
		"video_url": ""
	}`
	res := doRequest(t, application, http.MethodPut, "/api/v1/destinations/1", update, token)
	if res.status != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", res.status, res.body)
	}
	got := decodeData[struct {
		Video *struct{} `json:"video"`
	}](t, res)
	if got.Video != nil {
		t.Fatalf("video = %+v, want null", got.Video)
	}
	if store.storedVideo != nil {
		t.Fatalf("storedVideo = %+v, want nil", store.storedVideo)
	}
}

// mp4Bytes mengembalikan kepala file MP4 minimal yang dikenali
// http.DetectContentType sebagai video/mp4.
func mp4Bytes() []byte {
	head := []byte("\x00\x00\x00\x18ftypmp42")
	return append(head, make([]byte, 32)...)
}

func multipartBody(t *testing.T, filename string, content []byte) (string, []byte) {
	t.Helper()

	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart: %v", err)
	}
	return writer.FormDataContentType(), buffer.Bytes()
}
