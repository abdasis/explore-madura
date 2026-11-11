package posts

import "time"

// postRequest adalah body create/update artikel.
type postRequest struct {
	Title       string `json:"title"`
	Excerpt     string `json:"excerpt"`
	Content     string `json:"content"`
	Tag         string `json:"tag"`
	IsPublished *bool  `json:"is_published"`
}

func (r postRequest) toInput() PostInput {
	return PostInput{
		Title:       r.Title,
		Excerpt:     r.Excerpt,
		Content:     r.Content,
		Tag:         r.Tag,
		IsPublished: r.IsPublished,
	}
}

// publicPostPayload dipakai daftar publik; content sengaja tidak disertakan.
type publicPostPayload struct {
	ID          int64      `json:"id"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Excerpt     string     `json:"excerpt"`
	CoverURL    *string    `json:"cover_url"`
	Tag         string     `json:"tag"`
	PublishedAt *time.Time `json:"published_at"`
}

// publicPostDetailResponse menambahkan isi artikel pada detail publik.
type publicPostDetailResponse struct {
	publicPostPayload
	Content string `json:"content"`
}

// postResponse adalah payload admin: seluruh field termasuk isi dan status.
type postResponse struct {
	ID          int64      `json:"id"`
	Title       string     `json:"title"`
	Slug        string     `json:"slug"`
	Excerpt     string     `json:"excerpt"`
	Content     string     `json:"content"`
	Tag         string     `json:"tag"`
	CoverURL    *string    `json:"cover_url"`
	IsPublished bool       `json:"is_published"`
	PublishedAt *time.Time `json:"published_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func toPublicPostPayload(post Post) publicPostPayload {
	return publicPostPayload{
		ID:          post.ID,
		Title:       post.Title,
		Slug:        post.Slug,
		Excerpt:     post.Excerpt,
		CoverURL:    coverURL(post.CoverPath),
		Tag:         post.Tag,
		PublishedAt: post.PublishedAt,
	}
}

func toPublicListResponses(list []Post) []publicPostPayload {
	responses := make([]publicPostPayload, 0, len(list))
	for _, post := range list {
		responses = append(responses, toPublicPostPayload(post))
	}
	return responses
}

func toPublicDetailResponse(post Post) publicPostDetailResponse {
	return publicPostDetailResponse{
		publicPostPayload: toPublicPostPayload(post),
		Content:           post.Content,
	}
}

func toPostResponse(post Post) postResponse {
	return postResponse{
		ID:          post.ID,
		Title:       post.Title,
		Slug:        post.Slug,
		Excerpt:     post.Excerpt,
		Content:     post.Content,
		Tag:         post.Tag,
		CoverURL:    coverURL(post.CoverPath),
		IsPublished: post.IsPublished,
		PublishedAt: post.PublishedAt,
		CreatedAt:   post.CreatedAt,
		UpdatedAt:   post.UpdatedAt,
	}
}

func toPostResponses(list []Post) []postResponse {
	responses := make([]postResponse, 0, len(list))
	for _, post := range list {
		responses = append(responses, toPostResponse(post))
	}
	return responses
}

// coverResponse adalah hasil unggah cover artikel.
type coverResponse struct {
	CoverURL *string `json:"cover_url"`
}

// coverURL mengubah path simpanan "blog/<file>" menjadi URL /uploads.
func coverURL(path string) *string {
	if path == "" {
		return nil
	}
	url := "/uploads/" + path
	return &url
}
