package destinations

import (
	"context"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

const (
	maxNameLength         = 150
	maxDescriptionLength  = 5000
	maxAddressLength      = 300
	maxFacilitiesLength   = 1000
	maxOpeningHoursLength = 200
	maxContactLength      = 120
	maxSlugLength         = 100
	defaultPerPage        = 20
	maxPerPage            = 100
	maxSlugAttempts       = 50
)

var slugSeparator = regexp.MustCompile(`[^a-z0-9]+`)

// store adalah dependensi persistensi yang dibutuhkan Service. Interface
// didefinisikan di sisi pemakai agar service bisa diuji dengan fake.
type store interface {
	List(ctx context.Context, page, perPage int, q, category string) ([]Destination, PaginationMeta, error)
	PublicList(ctx context.Context) ([]Destination, error)
	Get(ctx context.Context, id int64) (Destination, error)
	CategoryByID(ctx context.Context, id int64) (Category, error)
	Categories(ctx context.Context) ([]Category, error)
	SlugExists(ctx context.Context, slug string) (bool, error)
	Create(ctx context.Context, destination Destination, actor Actor) (Destination, error)
	Update(ctx context.Context, destination Destination, actor Actor) (Destination, error)
	Delete(ctx context.Context, id int64, actor Actor) ([]string, error)
	AddPhoto(ctx context.Context, photo Photo, actor Actor) (Photo, error)
	DeletePhoto(ctx context.Context, destinationID, photoID int64, actor Actor) (string, error)
	SetCover(ctx context.Context, destinationID, photoID int64, actor Actor) error
	SetVideo(ctx context.Context, id int64, video *Video, actor Actor) (string, error)
}

// Service memegang aturan validasi, slug, dan paginasi destinasi.
type Service struct {
	store store
}

// NewService merakit service destinasi di atas repository.
func NewService(store store) *Service {
	return &Service{store: store}
}

// List mengembalikan daftar destinasi berpaginasi untuk admin.
func (s *Service) List(ctx context.Context, page, perPage int, q, category string) ([]Destination, PaginationMeta, error) {
	page, perPage = normalizePagination(page, perPage)
	list, meta, err := s.store.List(ctx, page, perPage, strings.TrimSpace(q), strings.TrimSpace(category))
	if err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("list destinations: %w", err)
	}
	return list, meta, nil
}

// PublicList mengembalikan semua destinasi terbit untuk peta publik.
func (s *Service) PublicList(ctx context.Context) ([]Destination, error) {
	list, err := s.store.PublicList(ctx)
	if err != nil {
		return nil, fmt.Errorf("list public destinations: %w", err)
	}
	return list, nil
}

// Get mengembalikan detail destinasi.
func (s *Service) Get(ctx context.Context, id int64) (Destination, error) {
	destination, err := s.store.Get(ctx, id)
	if err != nil {
		return Destination{}, fmt.Errorf("get destination %d: %w", id, err)
	}
	return destination, nil
}

// Create memvalidasi input, menurunkan slug unik, lalu menyimpan destinasi.
func (s *Service) Create(ctx context.Context, input DestinationInput, actor Actor) (Destination, error) {
	destination, fields := validateDestination(input)
	if len(fields) > 0 {
		return Destination{}, shared.Validation(fields)
	}

	category, err := s.store.CategoryByID(ctx, input.CategoryID)
	if err != nil {
		return Destination{}, fmt.Errorf("get category %d: %w", input.CategoryID, err)
	}

	slug, err := s.uniqueSlug(ctx, destination.Name)
	if err != nil {
		return Destination{}, err
	}
	destination.Slug = slug
	destination.Category = category

	created, err := s.store.Create(ctx, destination, actor)
	if err != nil {
		return Destination{}, fmt.Errorf("create destination: %w", err)
	}
	return created, nil
}

// Update memvalidasi input lalu menyimpan perubahan destinasi.
func (s *Service) Update(ctx context.Context, id int64, input DestinationInput, actor Actor) (Destination, error) {
	destination, fields := validateDestination(input)
	if len(fields) > 0 {
		return Destination{}, shared.Validation(fields)
	}

	category, err := s.store.CategoryByID(ctx, input.CategoryID)
	if err != nil {
		return Destination{}, fmt.Errorf("get category %d: %w", input.CategoryID, err)
	}

	destination.ID = id
	destination.Category = category

	updated, err := s.store.Update(ctx, destination, actor)
	if err != nil {
		return Destination{}, fmt.Errorf("update destination %d: %w", id, err)
	}
	return updated, nil
}

// Delete menghapus destinasi dan mengembalikan path file foto untuk dibersihkan.
func (s *Service) Delete(ctx context.Context, id int64, actor Actor) ([]string, error) {
	paths, err := s.store.Delete(ctx, id, actor)
	if err != nil {
		return nil, fmt.Errorf("delete destination %d: %w", id, err)
	}
	return paths, nil
}

// Categories mengembalikan kategori referensi.
func (s *Service) Categories(ctx context.Context) ([]Category, error) {
	categories, err := s.store.Categories(ctx)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	return categories, nil
}

// AddPhoto menautkan file foto yang sudah tersimpan ke destinasi.
func (s *Service) AddPhoto(ctx context.Context, destinationID int64, filePath, caption string, actor Actor) (Photo, error) {
	photo := Photo{
		DestinationID: destinationID,
		FilePath:      filePath,
		Caption:       strings.TrimSpace(caption),
	}
	created, err := s.store.AddPhoto(ctx, photo, actor)
	if err != nil {
		return Photo{}, fmt.Errorf("add photo to destination %d: %w", destinationID, err)
	}
	return created, nil
}

// DeletePhoto menghapus foto dan mengembalikan path file untuk dibersihkan.
func (s *Service) DeletePhoto(ctx context.Context, destinationID, photoID int64, actor Actor) (string, error) {
	path, err := s.store.DeletePhoto(ctx, destinationID, photoID, actor)
	if err != nil {
		return "", fmt.Errorf("delete photo %d of destination %d: %w", photoID, destinationID, err)
	}
	return path, nil
}

// SetCover menjadikan satu foto sebagai cover destinasi.
func (s *Service) SetCover(ctx context.Context, destinationID, photoID int64, actor Actor) error {
	if err := s.store.SetCover(ctx, destinationID, photoID, actor); err != nil {
		return fmt.Errorf("set cover photo %d of destination %d: %w", photoID, destinationID, err)
	}
	return nil
}

// SetVideo menyimpan video destinasi (nil berarti menghapus) dan
// mengembalikan path file lama untuk dibersihkan.
func (s *Service) SetVideo(ctx context.Context, id int64, video *Video, actor Actor) (string, error) {
	path, err := s.store.SetVideo(ctx, id, video, actor)
	if err != nil {
		return "", fmt.Errorf("set video of destination %d: %w", id, err)
	}
	return path, nil
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
func (s *Service) uniqueSlug(ctx context.Context, name string) (string, error) {
	base := slugify(name)

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

func slugify(name string) string {
	slug := slugSeparator.ReplaceAllString(strings.ToLower(strings.TrimSpace(name)), "-")
	slug = strings.Trim(slug, "-")
	if len(slug) > maxSlugLength {
		slug = strings.Trim(slug[:maxSlugLength], "-")
	}
	if slug == "" {
		return "destinasi"
	}
	return slug
}

// validateDestination mengembalikan destinasi ternormalisasi atau peta field
// yang bermasalah.
func validateDestination(input DestinationInput) (Destination, map[string]string) {
	fields := make(map[string]string)

	name := strings.TrimSpace(input.Name)
	switch {
	case name == "":
		fields["name"] = "Nama destinasi wajib diisi."
	case len([]rune(name)) > maxNameLength:
		fields["name"] = fmt.Sprintf("Nama destinasi maksimal %d karakter.", maxNameLength)
	}

	if input.CategoryID <= 0 {
		fields["category_id"] = "Kategori wajib dipilih."
	}

	description := strings.TrimSpace(input.Description)
	if len([]rune(description)) > maxDescriptionLength {
		fields["description"] = fmt.Sprintf("Deskripsi maksimal %d karakter.", maxDescriptionLength)
	}

	address := strings.TrimSpace(input.Address)
	if len([]rune(address)) > maxAddressLength {
		fields["address"] = fmt.Sprintf("Alamat maksimal %d karakter.", maxAddressLength)
	}

	facilities := strings.TrimSpace(input.Facilities)
	if len([]rune(facilities)) > maxFacilitiesLength {
		fields["facilities"] = fmt.Sprintf("Fasilitas maksimal %d karakter.", maxFacilitiesLength)
	}

	openingHours := strings.TrimSpace(input.OpeningHours)
	if len([]rune(openingHours)) > maxOpeningHoursLength {
		fields["opening_hours"] = fmt.Sprintf("Jam buka maksimal %d karakter.", maxOpeningHoursLength)
	}

	contact := strings.TrimSpace(input.Contact)
	if len([]rune(contact)) > maxContactLength {
		fields["contact"] = fmt.Sprintf("Kontak maksimal %d karakter.", maxContactLength)
	}

	var latitude, longitude float64
	switch {
	case input.Latitude == nil:
		fields["latitude"] = "Latitude wajib diisi."
	case *input.Latitude < -90 || *input.Latitude > 90:
		fields["latitude"] = "Latitude harus di antara -90 dan 90."
	default:
		latitude = *input.Latitude
	}

	switch {
	case input.Longitude == nil:
		fields["longitude"] = "Longitude wajib diisi."
	case *input.Longitude < -180 || *input.Longitude > 180:
		fields["longitude"] = "Longitude harus di antara -180 dan 180."
	default:
		longitude = *input.Longitude
	}

	var rating float64
	if input.Rating != nil {
		rating = *input.Rating
	}
	if rating < 0 || rating > 5 {
		fields["rating"] = "Rating harus di antara 0 dan 5."
	}

	validatePrice(input, fields)

	isPublished := true
	if input.IsPublished != nil {
		isPublished = *input.IsPublished
	}

	destination := Destination{
		CategoryID:   input.CategoryID,
		Name:         name,
		Description:  description,
		Address:      address,
		Latitude:     latitude,
		Longitude:    longitude,
		Rating:       rating,
		IsFree:       input.IsFree,
		PriceMin:     input.PriceMin,
		PriceMax:     input.PriceMax,
		OpeningHours: openingHours,
		Contact:      contact,
		Facilities:   facilities,
		IsPublished:  isPublished,
		Video:        validateVideo(input.VideoKind, input.VideoURL, fields),
	}
	return destination, fields
}

// validateVideo mengubah payload video menjadi Video ternormalisasi atau
// mencatat field bermasalah. Kind nil berarti payload tidak menyertakan video
// (nilai lama dipertahankan); kind kosong berarti video dikosongkan.
func validateVideo(kind *string, rawURL *string, fields map[string]string) *Video {
	if kind == nil {
		return nil
	}

	switch trimmed := strings.TrimSpace(*kind); trimmed {
	case "":
		return &Video{}
	case VideoKindFile:
		fields["video_kind"] = "Video unggahan hanya bisa diatur lewat unggahan berkas."
		return nil
	case VideoKindEmbed:
		raw := ""
		if rawURL != nil {
			raw = *rawURL
		}
		url := strings.TrimSpace(raw)
		if !isHTTPURL(url) {
			fields["video_url"] = "Tautan video harus URL http atau https yang valid."
			return nil
		}
		return &Video{Kind: trimmed, URL: url}
	default:
		fields["video_kind"] = "Jenis video harus embed."
		return nil
	}
}

func isHTTPURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func validatePrice(input DestinationInput, fields map[string]string) {
	if input.IsFree {
		if input.PriceMin != nil || input.PriceMax != nil {
			fields["price_min"] = "Destinasi gratis tidak boleh punya harga."
		}
		return
	}

	switch {
	case input.PriceMin == nil:
		fields["price_min"] = "Harga minimum wajib diisi untuk destinasi berbayar."
	case *input.PriceMin < 0:
		fields["price_min"] = "Harga minimum tidak boleh negatif."
	case input.PriceMax != nil && *input.PriceMax < *input.PriceMin:
		fields["price_max"] = "Harga maksimum tidak boleh lebih kecil dari harga minimum."
	}
}
