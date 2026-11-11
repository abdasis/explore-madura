package posts

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type fakeStore struct {
	slugTaken       map[string]bool
	alwaysTaken     bool
	created         *Post
	createdSlug     string
	createErr       error
	updated         *Post
	updateErr       error
	deletedID       int64
	deleteErr       error
	setCoverOld     string
	setCoverPath    string
	setCoverID      int64
	setCoverErr     error
	deleteCoverOld  string
	deleteCoverID   int64
	deleteCoverErr  error
	lastPage        int
	lastPerPage     int
	lastQuery       string
	publicBySlugArg string
}

func (f *fakeStore) List(_ context.Context, page, perPage int, q string) ([]Post, PaginationMeta, error) {
	f.lastPage = page
	f.lastPerPage = perPage
	f.lastQuery = q
	return []Post{{Title: "Contoh"}}, PaginationMeta{Page: page, PerPage: perPage, Total: 1, TotalPages: 1}, nil
}

func (f *fakeStore) PublicList(context.Context) ([]Post, error) {
	return nil, nil
}

func (f *fakeStore) PublicBySlug(_ context.Context, slug string) (Post, error) {
	f.publicBySlugArg = slug
	return Post{}, ErrNotFound
}

func (f *fakeStore) Get(context.Context, int64) (Post, error) {
	return Post{}, ErrNotFound
}

func (f *fakeStore) SlugExists(_ context.Context, slug string) (bool, error) {
	if f.alwaysTaken {
		return true, nil
	}
	return f.slugTaken[slug], nil
}

func (f *fakeStore) Create(_ context.Context, post Post, _ Actor) (Post, error) {
	if f.createErr != nil {
		return Post{}, f.createErr
	}
	f.created = &post
	f.createdSlug = post.Slug
	post.ID = 1
	return post, nil
}

func (f *fakeStore) Update(_ context.Context, post Post, _ Actor) (Post, error) {
	if f.updateErr != nil {
		return Post{}, f.updateErr
	}
	f.updated = &post
	return post, nil
}

func (f *fakeStore) Delete(_ context.Context, id int64, _ Actor) (string, error) {
	f.deletedID = id
	if f.deleteErr != nil {
		return "", f.deleteErr
	}
	return "blog/lama.jpg", nil
}

func (f *fakeStore) SetCover(_ context.Context, id int64, path string, _ Actor) (string, error) {
	f.setCoverID = id
	f.setCoverPath = path
	if f.setCoverErr != nil {
		return "", f.setCoverErr
	}
	return f.setCoverOld, nil
}

func (f *fakeStore) DeleteCover(_ context.Context, id int64, _ Actor) (string, error) {
	f.deleteCoverID = id
	if f.deleteCoverErr != nil {
		return "", f.deleteCoverErr
	}
	return f.deleteCoverOld, nil
}

func validInput() PostInput {
	published := true
	return PostInput{
		Title:       "Karapan Sapi, Balapan Tradisi dari Tanah Madura",
		Excerpt:     "Tradisi balapan sapi khas Madura.",
		Content:     "Karapan sapi adalah balapan tradisional khas Madura.",
		Tag:         "Budaya",
		IsPublished: &published,
	}
}

func TestValidatePostRequiresTitleAndTag(t *testing.T) {
	input := validInput()
	input.Title = "   "
	input.Tag = ""

	_, fields := validatePost(input)
	if fields["title"] == "" || fields["tag"] == "" {
		t.Fatalf("fields = %v, want error pada title dan tag", fields)
	}
}

func TestValidatePostRejectsOversizeFields(t *testing.T) {
	tests := []struct {
		name      string
		mutate    func(*PostInput)
		wantField string
	}{
		{
			name:      "judul terlalu panjang",
			mutate:    func(input *PostInput) { input.Title = strings.Repeat("a", maxTitleLength+1) },
			wantField: "title",
		},
		{
			name:      "tag terlalu panjang",
			mutate:    func(input *PostInput) { input.Tag = strings.Repeat("a", maxTagLength+1) },
			wantField: "tag",
		},
		{
			name:      "ringkasan terlalu panjang",
			mutate:    func(input *PostInput) { input.Excerpt = strings.Repeat("a", maxExcerptLength+1) },
			wantField: "excerpt",
		},
		{
			name:      "isi terlalu panjang",
			mutate:    func(input *PostInput) { input.Content = strings.Repeat("a", maxContentLength+1) },
			wantField: "content",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validInput()
			test.mutate(&input)

			_, fields := validatePost(input)
			if fields[test.wantField] == "" {
				t.Fatalf("fields = %v, want error pada %s", fields, test.wantField)
			}
		})
	}
}

func TestValidatePostDefaultsToDraft(t *testing.T) {
	input := validInput()
	input.IsPublished = nil

	post, fields := validatePost(input)
	if len(fields) != 0 {
		t.Fatalf("fields = %v, want kosong", fields)
	}
	if post.IsPublished {
		t.Fatal("IsPublished = true, want draf secara default")
	}
}

func TestSlugifyProducesFriendlySlug(t *testing.T) {
	if got := slugify("  Karapan Sapi, Balapan!  "); got != "karapan-sapi-balapan" {
		t.Fatalf("slugify = %q, want karapan-sapi-balapan", got)
	}
	if got := slugify("!!!"); got != defaultSlugSource {
		t.Fatalf("slugify = %q, want %q", got, defaultSlugSource)
	}
}

func TestUniqueSlugAddsSuffix(t *testing.T) {
	store := &fakeStore{slugTaken: map[string]bool{
		"karapan-sapi":   true,
		"karapan-sapi-2": true,
	}}
	slug, err := NewService(store).uniqueSlug(context.Background(), "Karapan Sapi")
	if err != nil {
		t.Fatalf("uniqueSlug: %v", err)
	}
	if slug != "karapan-sapi-3" {
		t.Fatalf("slug = %q, want karapan-sapi-3", slug)
	}
}

func TestUniqueSlugFailsWhenAllAttemptsTaken(t *testing.T) {
	store := &fakeStore{alwaysTaken: true}
	_, err := NewService(store).uniqueSlug(context.Background(), "Karapan Sapi")
	if !errors.Is(err, ErrSlugTaken) {
		t.Fatalf("err = %v, want ErrSlugTaken", err)
	}
}

func TestCreateUsesUniqueSlug(t *testing.T) {
	store := &fakeStore{slugTaken: map[string]bool{"karapan-sapi": true}}
	input := validInput()
	input.Title = "Karapan Sapi"
	post, err := NewService(store).Create(context.Background(), input, Actor{})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if post.Slug != "karapan-sapi-2" || store.createdSlug != "karapan-sapi-2" {
		t.Fatalf("slug = %q / %q, want karapan-sapi-2", post.Slug, store.createdSlug)
	}
}

func TestCreateReturnsValidationError(t *testing.T) {
	_, err := NewService(&fakeStore{}).Create(context.Background(), PostInput{}, Actor{})
	if err == nil {
		t.Fatal("err = nil, want validation error")
	}
}

func TestListNormalizesPagination(t *testing.T) {
	store := &fakeStore{}
	if _, _, err := NewService(store).List(context.Background(), 0, 0, "  budaya  "); err != nil {
		t.Fatalf("List: %v", err)
	}
	if store.lastPage != 1 || store.lastPerPage != defaultPerPage {
		t.Fatalf("page/perPage = %d/%d, want 1/%d", store.lastPage, store.lastPerPage, defaultPerPage)
	}
	if store.lastQuery != "budaya" {
		t.Fatalf("q = %q, want budaya", store.lastQuery)
	}
}

func TestUpdatePassesIDAndFields(t *testing.T) {
	store := &fakeStore{}
	post, err := NewService(store).Update(context.Background(), 7, validInput(), Actor{})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if post.ID != 7 || store.updated == nil || store.updated.ID != 7 {
		t.Fatalf("post = %+v, want id 7", post)
	}
	if store.updated.Title != validInput().Title {
		t.Fatalf("title = %q", store.updated.Title)
	}
}

func TestSetCoverAndDeleteCoverDelegate(t *testing.T) {
	store := &fakeStore{setCoverOld: "blog/lama.jpg", deleteCoverOld: "blog/lain.jpg"}
	service := NewService(store)

	oldPath, err := service.SetCover(context.Background(), 3, "blog/baru.jpg", Actor{})
	if err != nil || oldPath != "blog/lama.jpg" {
		t.Fatalf("SetCover = %q, %v", oldPath, err)
	}
	if store.setCoverID != 3 || store.setCoverPath != "blog/baru.jpg" {
		t.Fatalf("SetCover dipanggil dengan id=%d path=%q", store.setCoverID, store.setCoverPath)
	}

	oldPath, err = service.DeleteCover(context.Background(), 3, Actor{})
	if err != nil || oldPath != "blog/lain.jpg" {
		t.Fatalf("DeleteCover = %q, %v", oldPath, err)
	}
}
