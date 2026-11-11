// Package destinations berisi domain, repository, service, handler, dan seed
// destinasi wisata.
package destinations

import (
	"errors"
	"time"
)

// Category adalah kategori referensi destinasi.
type Category struct {
	ID   int64
	Slug string
	Name string
	Icon string
}

const (
	// VideoKindFile menandai video hasil unggahan; URL berisi path relatif
	// di direktori uploads.
	VideoKindFile = "file"

	// VideoKindEmbed menandai tautan embed (URL http/https).
	VideoKindEmbed = "embed"
)

// Video adalah video destinasi: unggahan berkas atau tautan embed.
type Video struct {
	Kind string
	URL  string
}

// Photo adalah satu foto galeri destinasi.
type Photo struct {
	ID            int64
	DestinationID int64
	FilePath      string
	Caption       string
	IsCover       bool
	SortOrder     int
}

// Destination adalah satu destinasi wisata.
type Destination struct {
	ID           int64
	CategoryID   int64
	Category     Category
	Name         string
	Slug         string
	Description  string
	Address      string
	Latitude     float64
	Longitude    float64
	Rating       float64
	IsFree       bool
	PriceMin     *int
	PriceMax     *int
	OpeningHours string
	Contact      string
	Facilities   string
	IsPublished  bool
	Video        *Video
	Photos       []Photo
	PhotoCount   int
	Cover        *Photo
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// DestinationInput adalah data yang dikirim admin untuk create/update.
type DestinationInput struct {
	Name         string
	CategoryID   int64
	Description  string
	Address      string
	Latitude     *float64
	Longitude    *float64
	Rating       *float64
	IsFree       bool
	PriceMin     *int
	PriceMax     *int
	OpeningHours string
	Contact      string
	Facilities   string
	IsPublished  *bool
	VideoKind    *string
	VideoURL     *string
}

// Actor adalah admin yang melakukan perubahan untuk activity log.
type Actor struct {
	UserID int64
	Name   string
}

// PaginationMeta adalah metadata daftar berpaginasi.
type PaginationMeta struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

var (
	// ErrNotFound menandai destinasi yang tidak ada.
	ErrNotFound = errors.New("destination not found")

	// ErrSlugTaken menandai slug yang tidak bisa dibuat unik.
	ErrSlugTaken = errors.New("destination slug taken")

	// ErrCategoryNotFound menandai category_id yang tidak ada.
	ErrCategoryNotFound = errors.New("destination category not found")

	// ErrPhotoNotFound menandai foto yang tidak ada pada destinasi tersebut.
	ErrPhotoNotFound = errors.New("destination photo not found")
)
