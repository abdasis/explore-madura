package destinations

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	slugTaken             map[string]bool
	categories            map[int64]Category
	lastPage              int
	lastPerPage           int
	createdSlug           string
	deletePaths           []string
	deleteErr             error
	createErr             error
	updateErr             error
	categoryErr           error
	addPhotoDestinationID int64
	setVideoID            int64
	setVideoValue         *Video
	setVideoOldPath       string
	setVideoErr           error
	updated               *Destination
}

func (f *fakeStore) List(_ context.Context, page, perPage int, _, _ string) ([]Destination, PaginationMeta, error) {
	f.lastPage = page
	f.lastPerPage = perPage
	return []Destination{{Name: "Contoh"}}, PaginationMeta{Page: page, PerPage: perPage, Total: 1, TotalPages: 1}, nil
}

func (f *fakeStore) PublicList(context.Context) ([]Destination, error) {
	return nil, nil
}

func (f *fakeStore) Get(context.Context, int64) (Destination, error) {
	return Destination{}, ErrNotFound
}

func (f *fakeStore) CategoryByID(_ context.Context, id int64) (Category, error) {
	if f.categoryErr != nil {
		return Category{}, f.categoryErr
	}
	category, ok := f.categories[id]
	if !ok {
		return Category{}, ErrCategoryNotFound
	}
	return category, nil
}

func (f *fakeStore) Categories(context.Context) ([]Category, error) {
	return nil, nil
}

func (f *fakeStore) SlugExists(_ context.Context, slug string) (bool, error) {
	return f.slugTaken[slug], nil
}

func (f *fakeStore) Create(_ context.Context, destination Destination, _ Actor) (Destination, error) {
	if f.createErr != nil {
		return Destination{}, f.createErr
	}
	f.createdSlug = destination.Slug
	destination.ID = 1
	return destination, nil
}

func (f *fakeStore) Update(_ context.Context, destination Destination, _ Actor) (Destination, error) {
	if f.updateErr != nil {
		return Destination{}, f.updateErr
	}
	f.updated = &destination
	return destination, nil
}

func (f *fakeStore) Delete(context.Context, int64, Actor) ([]string, error) {
	if f.deleteErr != nil {
		return nil, f.deleteErr
	}
	return f.deletePaths, nil
}

func (f *fakeStore) AddPhoto(_ context.Context, photo Photo, _ Actor) (Photo, error) {
	f.addPhotoDestinationID = photo.DestinationID
	photo.ID = 9
	return photo, nil
}

func (f *fakeStore) DeletePhoto(_ context.Context, _, _ int64, _ Actor) (string, error) {
	return "", nil
}

func (f *fakeStore) SetCover(context.Context, int64, int64, Actor) error {
	return nil
}

func (f *fakeStore) SetVideo(_ context.Context, id int64, video *Video, _ Actor) (string, error) {
	if f.setVideoErr != nil {
		return "", f.setVideoErr
	}
	f.setVideoID = id
	f.setVideoValue = video
	return f.setVideoOldPath, nil
}

func validInput() DestinationInput {
	latitude := -7.0894
	longitude := 112.745
	rating := 4.5
	published := true
	return DestinationInput{
		Name:        "Bukit Jaddih",
		CategoryID:  1,
		Description: "Tebing kapur bekas tambang.",
		Address:     "Desa Jaddih, Socah",
		Latitude:    &latitude,
		Longitude:   &longitude,
		Rating:      &rating,
		IsFree:      true,
		IsPublished: &published,
	}
}

func TestValidateDestinationRejectsEmptyName(t *testing.T) {
	input := validInput()
	input.Name = "   "

	_, fields := validateDestination(input)
	if fields["name"] == "" {
		t.Fatalf("fields = %v, want error pada name", fields)
	}
}

func TestValidateDestinationRejectsRatingOutOfRange(t *testing.T) {
	tests := []struct {
		name   string
		rating float64
	}{
		{name: "di atas lima", rating: 5.1},
		{name: "negatif", rating: -0.1},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validInput()
			input.Rating = &test.rating

			_, fields := validateDestination(input)
			if fields["rating"] == "" {
				t.Fatalf("fields = %v, want error pada rating", fields)
			}
		})
	}
}

func TestValidateDestinationRejectsInconsistentPrice(t *testing.T) {
	paid := func(min, max *int) DestinationInput {
		input := validInput()
		input.IsFree = false
		input.PriceMin = min
		input.PriceMax = max
		return input
	}

	tests := []struct {
		name      string
		input     DestinationInput
		wantField string
	}{
		{
			name: "gratis tapi harga terisi",
			input: func() DestinationInput {
				input := validInput()
				input.PriceMin = intPtr(5000)
				return input
			}(),
			wantField: "price_min",
		},
		{
			name:      "berbayar tanpa harga minimum",
			input:     paid(nil, nil),
			wantField: "price_min",
		},
		{
			name:      "harga maksimum di bawah minimum",
			input:     paid(intPtr(10000), intPtr(5000)),
			wantField: "price_max",
		},
		{
			name:      "harga minimum negatif",
			input:     paid(intPtr(-1), nil),
			wantField: "price_min",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, fields := validateDestination(test.input)
			if fields[test.wantField] == "" {
				t.Fatalf("fields = %v, want error pada %s", fields, test.wantField)
			}
		})
	}
}

func TestSlugifyProducesUniqueFriendlySlug(t *testing.T) {
	if got := slugify("  Bukit Jaddih!!  "); got != "bukit-jaddih" {
		t.Fatalf("slugify = %q, want bukit-jaddih", got)
	}

	store := &fakeStore{slugTaken: map[string]bool{
		"bukit-jaddih":   true,
		"bukit-jaddih-2": true,
	}}
	slug, err := NewService(store).uniqueSlug(context.Background(), "Bukit Jaddih")
	if err != nil {
		t.Fatalf("uniqueSlug: %v", err)
	}
	if slug != "bukit-jaddih-3" {
		t.Fatalf("slug = %q, want bukit-jaddih-3", slug)
	}
}

func TestListNormalizesPagination(t *testing.T) {
	store := &fakeStore{}
	service := NewService(store)

	_, meta, err := service.List(context.Background(), 0, 0, "  ", " ")
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if store.lastPage != 1 || store.lastPerPage != 20 {
		t.Fatalf("pagination = %d/%d, want 1/20", store.lastPage, store.lastPerPage)
	}
	if meta.Page != 1 || meta.PerPage != 20 {
		t.Fatalf("meta = %+v, want page 1 per_page 20", meta)
	}

	if _, _, err := service.List(context.Background(), 2, 500, "", ""); err != nil {
		t.Fatalf("List: %v", err)
	}
	if store.lastPerPage != maxPerPage {
		t.Fatalf("perPage = %d, want %d", store.lastPerPage, maxPerPage)
	}
}

func TestValidateDestinationAcceptsEmbedVideo(t *testing.T) {
	input := validInput()
	input.VideoKind = textPtr(VideoKindEmbed)
	input.VideoURL = textPtr("  https://www.youtube.com/watch?v=abc123  ")

	destination, fields := validateDestination(input)
	if len(fields) > 0 {
		t.Fatalf("fields = %v, want kosong", fields)
	}
	if destination.Video == nil || destination.Video.Kind != VideoKindEmbed {
		t.Fatalf("video = %+v, want embed", destination.Video)
	}
	if destination.Video.URL != "https://www.youtube.com/watch?v=abc123" {
		t.Fatalf("url = %q, want sudah di-trim", destination.Video.URL)
	}
}

func TestValidateDestinationRejectsInvalidEmbedURL(t *testing.T) {
	tests := []struct {
		name string
		url  string
	}{
		{name: "kosong", url: ""},
		{name: "tanpa skema", url: "www.youtube.com/watch?v=abc123"},
		{name: "skema lain", url: "ftp://contoh.test/video.mp4"},
		{name: "javascript", url: "javascript:alert(1)"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validInput()
			input.VideoKind = textPtr(VideoKindEmbed)
			input.VideoURL = textPtr(test.url)

			_, fields := validateDestination(input)
			if fields["video_url"] == "" {
				t.Fatalf("fields = %v, want error pada video_url", fields)
			}
		})
	}
}

func TestValidateDestinationRejectsVideoKindFromPayload(t *testing.T) {
	tests := []struct {
		name string
		kind string
	}{
		{name: "file hanya dari unggahan", kind: VideoKindFile},
		{name: "jenis tak dikenal", kind: "youtube"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validInput()
			input.VideoKind = textPtr(test.kind)
			input.VideoURL = textPtr("https://www.youtube.com/watch?v=abc123")

			_, fields := validateDestination(input)
			if fields["video_kind"] == "" {
				t.Fatalf("fields = %v, want error pada video_kind", fields)
			}
		})
	}
}

func TestValidateDestinationKeepsVideoWhenKindOmitted(t *testing.T) {
	input := validInput()

	destination, fields := validateDestination(input)
	if len(fields) > 0 {
		t.Fatalf("fields = %v, want kosong", fields)
	}
	if destination.Video != nil {
		t.Fatalf("video = %+v, want nil (tidak dikirim)", destination.Video)
	}
}

func TestValidateDestinationClearsVideoWhenKindEmpty(t *testing.T) {
	input := validInput()
	input.VideoKind = textPtr("   ")
	input.VideoURL = textPtr("https://www.youtube.com/watch?v=abc123")

	destination, fields := validateDestination(input)
	if len(fields) > 0 {
		t.Fatalf("fields = %v, want kosong", fields)
	}
	if destination.Video == nil || destination.Video.Kind != "" || destination.Video.URL != "" {
		t.Fatalf("video = %+v, want video kosong eksplisit", destination.Video)
	}
}

func TestUpdateWithoutVideoLeavesVideoUntouched(t *testing.T) {
	store := &fakeStore{categories: map[int64]Category{1: {ID: 1}}}
	service := NewService(store)

	if _, err := service.Update(context.Background(), 7, validInput(), Actor{}); err != nil {
		t.Fatalf("Update: %v", err)
	}
	if store.updated == nil || store.updated.Video != nil {
		t.Fatalf("store menerima video = %+v, want nil (dipertahankan)", store.updated)
	}
}

func textPtr(value string) *string {
	return &value
}

func TestSetVideoReturnsPreviousFilePath(t *testing.T) {
	store := &fakeStore{setVideoOldPath: "videos/lama.mp4"}
	service := NewService(store)

	path, err := service.SetVideo(context.Background(), 7, nil, Actor{})
	if err != nil {
		t.Fatalf("SetVideo: %v", err)
	}
	if path != "videos/lama.mp4" {
		t.Fatalf("path = %q, want videos/lama.mp4", path)
	}
	if store.setVideoID != 7 || store.setVideoValue != nil {
		t.Fatalf("store menerima id=%d video=%+v, want id 7 video nil", store.setVideoID, store.setVideoValue)
	}
}

func TestDeleteMapsMissingDestinationToNotFound(t *testing.T) {
	store := &fakeStore{deleteErr: ErrNotFound}

	_, err := NewService(store).Delete(context.Background(), 7, Actor{})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("err = %v, want ErrNotFound", err)
	}
}
