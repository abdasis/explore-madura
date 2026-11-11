package posts

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

const (
	maxTitleLength    = 150
	maxTagLength      = 50
	maxExcerptLength  = 300
	maxContentLength  = 20000
	maxSlugLength     = 100
	defaultPerPage    = 20
	maxPerPage        = 100
	maxSlugAttempts   = 50
	defaultSlugSource = "artikel"
)

var slugSeparator = regexp.MustCompile(`[^a-z0-9]+`)

// store adalah dependensi persistensi yang dibutuhkan Service. Interface
// didefinisikan di sisi pemakai agar service bisa diuji dengan fake.
type store interface {
	List(ctx context.Context, page, perPage int, q string) ([]Post, PaginationMeta, error)
	PublicList(ctx context.Context) ([]Post, error)
	PublicBySlug(ctx context.Context, slug string) (Post, error)
	Get(ctx context.Context, id int64) (Post, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	Create(ctx context.Context, post Post, actor Actor) (Post, error)
	Update(ctx context.Context, post Post, actor Actor) (Post, error)
	Delete(ctx context.Context, id int64, actor Actor) (string, error)
	SetCover(ctx context.Context, id int64, path string, actor Actor) (string, error)
	DeleteCover(ctx context.Context, id int64, actor Actor) (string, error)
}

// Service memegang aturan validasi, slug, dan paginasi artikel.
type Service struct {
	store store
}

// NewService merakit service artikel di atas repository.
func NewService(store store) *Service {
	return &Service{store: store}
}

// List mengembalikan daftar artikel berpaginasi untuk admin.
func (s *Service) List(ctx context.Context, page, perPage int, q string) ([]Post, PaginationMeta, error) {
	page, perPage = normalizePagination(page, perPage)
	list, meta, err := s.store.List(ctx, page, perPage, strings.TrimSpace(q))
	if err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("list posts: %w", err)
	}
	return list, meta, nil
}

// PublicList mengembalikan artikel terbit untuk halaman blog.
func (s *Service) PublicList(ctx context.Context) ([]Post, error) {
	list, err := s.store.PublicList(ctx)
	if err != nil {
		return nil, fmt.Errorf("list public posts: %w", err)
	}
	return list, nil
}

// PublicBySlug mengembalikan detail artikel terbit berdasarkan slug.
func (s *Service) PublicBySlug(ctx context.Context, slug string) (Post, error) {
	post, err := s.store.PublicBySlug(ctx, strings.TrimSpace(slug))
	if err != nil {
		return Post{}, fmt.Errorf("get public post %q: %w", slug, err)
	}
	return post, nil
}

// Get mengembalikan detail artikel untuk admin.
func (s *Service) Get(ctx context.Context, id int64) (Post, error) {
	post, err := s.store.Get(ctx, id)
	if err != nil {
		return Post{}, fmt.Errorf("get post %d: %w", id, err)
	}
	return post, nil
}

// Create memvalidasi input, menurunkan slug unik, lalu menyimpan artikel.
func (s *Service) Create(ctx context.Context, input PostInput, actor Actor) (Post, error) {
	post, fields := validatePost(input)
	if len(fields) > 0 {
		return Post{}, shared.Validation(fields)
	}

	slug, err := s.uniqueSlug(ctx, post.Title)
	if err != nil {
		return Post{}, err
	}
	post.Slug = slug

	created, err := s.store.Create(ctx, post, actor)
	if err != nil {
		return Post{}, fmt.Errorf("create post: %w", err)
	}
	return created, nil
}

// Update memvalidasi input lalu menyimpan perubahan artikel.
func (s *Service) Update(ctx context.Context, id int64, input PostInput, actor Actor) (Post, error) {
	post, fields := validatePost(input)
	if len(fields) > 0 {
		return Post{}, shared.Validation(fields)
	}

	post.ID = id
	updated, err := s.store.Update(ctx, post, actor)
	if err != nil {
		return Post{}, fmt.Errorf("update post %d: %w", id, err)
	}
	return updated, nil
}

// Delete menghapus artikel dan mengembalikan path cover untuk dibersihkan.
func (s *Service) Delete(ctx context.Context, id int64, actor Actor) (string, error) {
	path, err := s.store.Delete(ctx, id, actor)
	if err != nil {
		return "", fmt.Errorf("delete post %d: %w", id, err)
	}
	return path, nil
}

// SetCover memasang cover baru dan mengembalikan path file lama.
func (s *Service) SetCover(ctx context.Context, id int64, path string, actor Actor) (string, error) {
	oldPath, err := s.store.SetCover(ctx, id, path, actor)
	if err != nil {
		return "", fmt.Errorf("set cover of post %d: %w", id, err)
	}
	return oldPath, nil
}

// DeleteCover menghapus cover dan mengembalikan path file lama.
func (s *Service) DeleteCover(ctx context.Context, id int64, actor Actor) (string, error) {
	oldPath, err := s.store.DeleteCover(ctx, id, actor)
	if err != nil {
		return "", fmt.Errorf("delete cover of post %d: %w", id, err)
	}
	return oldPath, nil
}

func normalizePagination(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	switch {
	case perPage < 1:
		perPage = defaultPerPage
	case perPage > maxPerPage:
		perPage = maxPerPage
	}
	return page, perPage
}

// uniqueSlug mencoba slug dasar lalu suffix -2, -3, dst sampai batas percobaan.
func (s *Service) uniqueSlug(ctx context.Context, title string) (string, error) {
	base := slugify(title)

	for attempt := 1; attempt <= maxSlugAttempts; attempt++ {
		slug := base
		if attempt > 1 {
			suffix := fmt.Sprintf("-%d", attempt)
			slug = strings.Trim(slugify(base[:min(len(base), maxSlugLength-len(suffix))]), "-") + suffix
		}

		exists, err := s.store.SlugExists(ctx, slug)
		if err != nil {
			return "", fmt.Errorf("check slug %q: %w", slug, err)
		}
		if !exists {
			return slug, nil
		}
	}
	return "", ErrSlugTaken
}

func slugify(title string) string {
	slug := slugSeparator.ReplaceAllString(strings.ToLower(strings.TrimSpace(title)), "-")
	slug = strings.Trim(slug, "-")
	if len(slug) > maxSlugLength {
		slug = strings.Trim(slug[:maxSlugLength], "-")
	}
	if slug == "" {
		return defaultSlugSource
	}
	return slug
}

// validatePost mengembalikan artikel ternormalisasi atau peta field bermasalah.
func validatePost(input PostInput) (Post, map[string]string) {
	fields := make(map[string]string)

	title := strings.TrimSpace(input.Title)
	switch {
	case title == "":
		fields["title"] = "Judul artikel wajib diisi."
	case len([]rune(title)) > maxTitleLength:
		fields["title"] = fmt.Sprintf("Judul artikel maksimal %d karakter.", maxTitleLength)
	}

	tag := strings.TrimSpace(input.Tag)
	switch {
	case tag == "":
		fields["tag"] = "Tag artikel wajib diisi."
	case len([]rune(tag)) > maxTagLength:
		fields["tag"] = fmt.Sprintf("Tag artikel maksimal %d karakter.", maxTagLength)
	}

	excerpt := strings.TrimSpace(input.Excerpt)
	if len([]rune(excerpt)) > maxExcerptLength {
		fields["excerpt"] = fmt.Sprintf("Ringkasan maksimal %d karakter.", maxExcerptLength)
	}

	content := strings.TrimSpace(input.Content)
	if len([]rune(content)) > maxContentLength {
		fields["content"] = fmt.Sprintf("Isi artikel maksimal %d karakter.", maxContentLength)
	}

	isPublished := false
	if input.IsPublished != nil {
		isPublished = *input.IsPublished
	}

	return Post{
		Title:       title,
		Excerpt:     excerpt,
		Content:     content,
		Tag:         tag,
		IsPublished: isPublished,
	}, fields
}
