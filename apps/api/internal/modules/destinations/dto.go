package destinations

// destinationRequest adalah body create/update destinasi.
type destinationRequest struct {
	Name         string   `json:"name"`
	CategoryID   int64    `json:"category_id"`
	Description  string   `json:"description"`
	Address      string   `json:"address"`
	Latitude     *float64 `json:"latitude"`
	Longitude    *float64 `json:"longitude"`
	Rating       *float64 `json:"rating"`
	IsFree       bool     `json:"is_free"`
	PriceMin     *int     `json:"price_min"`
	PriceMax     *int     `json:"price_max"`
	OpeningHours string   `json:"opening_hours"`
	Contact      string   `json:"contact"`
	Facilities   string   `json:"facilities"`
	IsPublished  *bool    `json:"is_published"`
	VideoKind    *string  `json:"video_kind"`
	VideoURL     *string  `json:"video_url"`
}

func (r destinationRequest) toInput() DestinationInput {
	return DestinationInput{
		Name:         r.Name,
		CategoryID:   r.CategoryID,
		Description:  r.Description,
		Address:      r.Address,
		Latitude:     r.Latitude,
		Longitude:    r.Longitude,
		Rating:       r.Rating,
		IsFree:       r.IsFree,
		PriceMin:     r.PriceMin,
		PriceMax:     r.PriceMax,
		OpeningHours: r.OpeningHours,
		Contact:      r.Contact,
		Facilities:   r.Facilities,
		IsPublished:  r.IsPublished,
		VideoKind:    r.VideoKind,
		VideoURL:     r.VideoURL,
	}
}

type categoryResponse struct {
	ID   int64  `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

type photoResponse struct {
	ID      int64  `json:"id"`
	URL     string `json:"url"`
	Caption string `json:"caption"`
	IsCover bool   `json:"is_cover"`
}

type videoResponse struct {
	Kind string `json:"kind"`
	URL  string `json:"url"`
}

type destinationPayload struct {
	ID           int64            `json:"id"`
	CategoryID   int64            `json:"category_id"`
	Category     categoryResponse `json:"category"`
	Name         string           `json:"name"`
	Slug         string           `json:"slug"`
	Description  string           `json:"description"`
	Address      string           `json:"address"`
	Latitude     float64          `json:"latitude"`
	Longitude    float64          `json:"longitude"`
	Rating       float64          `json:"rating"`
	IsFree       bool             `json:"is_free"`
	PriceMin     *int             `json:"price_min"`
	PriceMax     *int             `json:"price_max"`
	OpeningHours string           `json:"opening_hours"`
	Contact      string           `json:"contact"`
	Facilities   string           `json:"facilities"`
	IsPublished  bool             `json:"is_published"`
	Video        *videoResponse   `json:"video"`
}

// destinationResponse dipakai untuk detail admin dan data publik.
type destinationResponse struct {
	destinationPayload
	Photos []photoResponse `json:"photos"`
}

// destinationListResponse dipakai pada daftar admin: cover + jumlah foto.
type destinationListResponse struct {
	destinationPayload
	Cover      *photoResponse `json:"cover"`
	PhotoCount int            `json:"photo_count"`
}

func toDestinationResponse(destination Destination) destinationResponse {
	photos := make([]photoResponse, 0, len(destination.Photos))
	for _, photo := range destination.Photos {
		photos = append(photos, toPhotoResponse(photo))
	}
	return destinationResponse{
		destinationPayload: toDestinationPayload(destination),
		Photos:             photos,
	}
}

func toListResponses(list []Destination) []destinationListResponse {
	responses := make([]destinationListResponse, 0, len(list))
	for _, destination := range list {
		var cover *photoResponse
		if destination.Cover != nil {
			encoded := toPhotoResponse(*destination.Cover)
			cover = &encoded
		}
		responses = append(responses, destinationListResponse{
			destinationPayload: toDestinationPayload(destination),
			Cover:              cover,
			PhotoCount:         destination.PhotoCount,
		})
	}
	return responses
}

func toDestinationPayload(destination Destination) destinationPayload {
	return destinationPayload{
		ID:         destination.ID,
		CategoryID: destination.CategoryID,
		Category: categoryResponse{
			ID:   destination.Category.ID,
			Slug: destination.Category.Slug,
			Name: destination.Category.Name,
			Icon: destination.Category.Icon,
		},
		Name:         destination.Name,
		Slug:         destination.Slug,
		Description:  destination.Description,
		Address:      destination.Address,
		Latitude:     destination.Latitude,
		Longitude:    destination.Longitude,
		Rating:       destination.Rating,
		IsFree:       destination.IsFree,
		PriceMin:     destination.PriceMin,
		PriceMax:     destination.PriceMax,
		OpeningHours: destination.OpeningHours,
		Contact:      destination.Contact,
		Facilities:   destination.Facilities,
		IsPublished:  destination.IsPublished,
		Video:        toVideoResponse(destination.Video),
	}
}

// toVideoResponse menyusun payload video; URL file diarahkan ke /uploads.
// Video kosong (kind "") berarti destinasi tanpa video.
func toVideoResponse(video *Video) *videoResponse {
	if video == nil || video.Kind == "" {
		return nil
	}
	url := video.URL
	if video.Kind == VideoKindFile {
		url = "/uploads/" + url
	}
	return &videoResponse{Kind: video.Kind, URL: url}
}

func toPhotoResponse(photo Photo) photoResponse {
	return photoResponse{
		ID:      photo.ID,
		URL:     "/uploads/" + photo.FilePath,
		Caption: photo.Caption,
		IsCover: photo.IsCover,
	}
}

func toCategoryResponses(categories []Category) []categoryResponse {
	responses := make([]categoryResponse, 0, len(categories))
	for _, category := range categories {
		responses = append(responses, categoryResponse{
			ID:   category.ID,
			Slug: category.Slug,
			Name: category.Name,
			Icon: category.Icon,
		})
	}
	return responses
}
