// Package posts berisi domain, repository, service, handler, dan seed artikel
// blog fakta unik Madura.
package posts

import (
	"errors"
	"time"
)

// Post adalah satu artikel blog.
type Post struct {
	ID          int64
	Title       string
	Slug        string
	Excerpt     string
	Content     string
	Tag         string
	CoverPath   string
	IsPublished bool
	PublishedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// PostInput adalah data yang dikirim admin untuk create/update.
type PostInput struct {
	Title       string
	Excerpt     string
	Content     string
	Tag         string
	IsPublished *bool
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
	// ErrNotFound menandai artikel yang tidak ada.
	ErrNotFound = errors.New("post not found")

	// ErrSlugTaken menandai slug yang tidak bisa dibuat unik.
	ErrSlugTaken = errors.New("post slug taken")
)
