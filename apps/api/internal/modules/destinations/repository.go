package destinations

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

const destinationColumns = `
	d.id, d.category_id, c.slug, c.name, c.icon,
	d.name, d.slug, d.description, d.address, d.latitude, d.longitude,
	d.rating, d.is_free, d.price_min, d.price_max, d.opening_hours,
	d.contact, d.facilities, d.is_published, d.video_kind, d.video_url,
	d.created_at, d.updated_at`

const listFilter = `
	where ($1 = '' or d.name ilike '%' || $1 || '%')
	  and ($2 = '' or c.slug = $2)`

// Repository mengakses tabel destinasi, kategori, foto, dan activity log.
type Repository struct {
	conn shared.Conn
}

// NewRepository membuat repository destinasi di atas koneksi yang diberikan.
func NewRepository(conn shared.Conn) *Repository {
	return &Repository{conn: conn}
}

// List mengembalikan destinasi berpaginasi beserta cover dan jumlah foto.
func (r *Repository) List(ctx context.Context, page, perPage int, q, category string) ([]Destination, PaginationMeta, error) {
	var total int
	err := r.conn.QueryRow(ctx, `
		select count(*)
		from destinations d
		join destination_categories c on c.id = d.category_id`+listFilter, q, category).Scan(&total)
	if err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("count destinations: %w", err)
	}

	offset := (page - 1) * perPage
	rows, err := r.conn.Query(ctx, `
		select `+destinationColumns+`,
			(select count(*) from destination_photos p where p.destination_id = d.id),
			coalesce(cover.id, 0), coalesce(cover.file_path, ''), coalesce(cover.caption, ''),
			coalesce(cover.is_cover, false), coalesce(cover.sort_order, 0)
		from destinations d
		join destination_categories c on c.id = d.category_id
		left join lateral (
			select p.id, p.file_path, p.caption, p.is_cover, p.sort_order
			from destination_photos p
			where p.destination_id = d.id
			order by p.is_cover desc, p.sort_order, p.id
			limit 1
		) cover on true`+listFilter+`
		order by d.updated_at desc, d.id desc
		limit $3 offset $4`, q, category, perPage, offset)
	if err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("query destinations: %w", err)
	}
	defer rows.Close()

	list := make([]Destination, 0, perPage)
	for rows.Next() {
		destination, err := scanDestinationWithCover(rows)
		if err != nil {
			return nil, PaginationMeta{}, fmt.Errorf("scan destination: %w", err)
		}
		list = append(list, destination)
	}
	if err := rows.Err(); err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("iterate destinations: %w", err)
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + perPage - 1) / perPage
	}
	return list, PaginationMeta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages}, nil
}

// PublicList mengembalikan semua destinasi terbit (maksimal 500) dengan foto.
func (r *Repository) PublicList(ctx context.Context) ([]Destination, error) {
	rows, err := r.conn.Query(ctx, `
		select `+destinationColumns+`
		from destinations d
		join destination_categories c on c.id = d.category_id
		where d.is_published
		order by d.name, d.id
		limit 500`)
	if err != nil {
		return nil, fmt.Errorf("query public destinations: %w", err)
	}
	defer rows.Close()

	list := make([]Destination, 0)
	ids := make([]int64, 0)
	for rows.Next() {
		destination, err := scanDestination(rows)
		if err != nil {
			return nil, fmt.Errorf("scan public destination: %w", err)
		}
		list = append(list, destination)
		ids = append(ids, destination.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public destinations: %w", err)
	}

	photos, err := r.photosForMany(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range list {
		list[i].Photos = append([]Photo{}, photos[list[i].ID]...)
	}
	return list, nil
}

// Get mengembalikan detail destinasi lengkap dengan seluruh foto.
func (r *Repository) Get(ctx context.Context, id int64) (Destination, error) {
	destination, err := scanDestination(r.conn.QueryRow(ctx, `
		select `+destinationColumns+`
		from destinations d
		join destination_categories c on c.id = d.category_id
		where d.id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Destination{}, ErrNotFound
	}
	if err != nil {
		return Destination{}, fmt.Errorf("get destination %d: %w", id, err)
	}

	photos, err := r.photosFor(ctx, id)
	if err != nil {
		return Destination{}, err
	}
	destination.Photos = photos
	return destination, nil
}

// CategoryByID mengambil kategori berdasarkan id.
func (r *Repository) CategoryByID(ctx context.Context, id int64) (Category, error) {
	var category Category
	err := r.conn.QueryRow(ctx, `
		select id, slug, name, icon
		from destination_categories
		where id = $1`, id).
		Scan(&category.ID, &category.Slug, &category.Name, &category.Icon)
	if errors.Is(err, pgx.ErrNoRows) {
		return Category{}, ErrCategoryNotFound
	}
	if err != nil {
		return Category{}, fmt.Errorf("get category %d: %w", id, err)
	}
	return category, nil
}

// Categories mengembalikan semua kategori referensi.
func (r *Repository) Categories(ctx context.Context) ([]Category, error) {
	rows, err := r.conn.Query(ctx, `
		select id, slug, name, icon
		from destination_categories
		order by id`)
	if err != nil {
		return nil, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	categories := make([]Category, 0)
	for rows.Next() {
		var category Category
		if err := rows.Scan(&category.ID, &category.Slug, &category.Name, &category.Icon); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		categories = append(categories, category)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories: %w", err)
	}
	return categories, nil
}

// SlugExists memeriksa apakah slug sudah dipakai destinasi lain.
func (r *Repository) SlugExists(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := r.conn.QueryRow(ctx, `select exists (select 1 from destinations where slug = $1)`, slug).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check slug %q: %w", slug, err)
	}
	return exists, nil
}

// Create menyimpan destinasi baru beserta activity log dalam satu transaksi.
func (r *Repository) Create(ctx context.Context, destination Destination, actor Actor) (Destination, error) {
	created := destination
	videoKind, videoURL := videoValues(destination.Video)

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			insert into destinations (
				category_id, name, slug, description, address, latitude, longitude,
				rating, is_free, price_min, price_max, opening_hours, contact,
				facilities, is_published, video_kind, video_url
			) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
			returning id, created_at, updated_at`,
			destination.CategoryID, destination.Name, destination.Slug,
			destination.Description, destination.Address, destination.Latitude,
			destination.Longitude, destination.Rating, destination.IsFree,
			destination.PriceMin, destination.PriceMax, destination.OpeningHours,
			destination.Contact, destination.Facilities, destination.IsPublished,
			videoKind, videoURL,
		).Scan(&created.ID, &created.CreatedAt, &created.UpdatedAt)
		if isSlugConflict(err) {
			return ErrSlugTaken
		}
		if err != nil {
			return fmt.Errorf("insert destination: %w", err)
		}

		return logActivity(ctx, tx, actor, "create", "destination", created.ID,
			fmt.Sprintf("Menambahkan destinasi %s (id: %d).", created.Name, created.ID))
	})
	if err != nil {
		return Destination{}, err
	}

	created.Photos = []Photo{}
	return created, nil
}

// Update menyimpan perubahan destinasi dan mencatat selisih nilai pada log.
func (r *Repository) Update(ctx context.Context, destination Destination, actor Actor) (Destination, error) {
	updated := destination
	videoKind, videoURL := videoValues(destination.Video)
	videoSet := destination.Video != nil

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		before, err := loadSnapshot(ctx, tx, destination.ID)
		if err != nil {
			return err
		}

		var storedVideoKind string
		var storedVideoURL *string

		err = tx.QueryRow(ctx, `
			update destinations set
				category_id = $2, name = $3, description = $4, address = $5,
				latitude = $6, longitude = $7, rating = $8, is_free = $9,
				price_min = $10, price_max = $11, opening_hours = $12,
				contact = $13, facilities = $14, is_published = $15,
				video_kind = case when $16 then $17 else video_kind end,
				video_url = case when $16 then $18 else video_url end,
				updated_at = now()
			where id = $1
			returning created_at, updated_at, coalesce(video_kind, ''), video_url`,
			destination.ID, destination.CategoryID, destination.Name,
			destination.Description, destination.Address, destination.Latitude,
			destination.Longitude, destination.Rating, destination.IsFree,
			destination.PriceMin, destination.PriceMax, destination.OpeningHours,
			destination.Contact, destination.Facilities, destination.IsPublished,
			videoSet, videoKind, videoURL,
		).Scan(&updated.CreatedAt, &updated.UpdatedAt, &storedVideoKind, &storedVideoURL)
		if err != nil {
			return fmt.Errorf("update destination %d: %w", destination.ID, err)
		}
		updated.Video = nil
		if storedVideoKind != "" && storedVideoURL != nil {
			updated.Video = &Video{Kind: storedVideoKind, URL: *storedVideoURL}
		}

		return logActivity(ctx, tx, actor, "update", "destination", destination.ID,
			describeUpdate(before, updated))
	})
	if err != nil {
		return Destination{}, err
	}

	photos, err := r.photosFor(ctx, updated.ID)
	if err != nil {
		return Destination{}, err
	}
	updated.Photos = photos
	return updated, nil
}

// Delete menghapus destinasi (foto ikut cascade) dan mengembalikan path file.
func (r *Repository) Delete(ctx context.Context, id int64, actor Actor) ([]string, error) {
	paths := make([]string, 0)

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var name, videoKind string
		var videoURL *string
		err := tx.QueryRow(ctx, `
			select name, coalesce(video_kind, ''), video_url
			from destinations
			where id = $1
			for update`, id).Scan(&name, &videoKind, &videoURL)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load destination %d: %w", id, err)
		}

		rows, err := tx.Query(ctx, `select file_path from destination_photos where destination_id = $1`, id)
		if err != nil {
			return fmt.Errorf("load destination photos %d: %w", id, err)
		}
		for rows.Next() {
			var path string
			if err := rows.Scan(&path); err != nil {
				rows.Close()
				return fmt.Errorf("scan destination photo: %w", err)
			}
			paths = append(paths, path)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return fmt.Errorf("iterate destination photos: %w", err)
		}

		if videoKind == VideoKindFile && videoURL != nil {
			paths = append(paths, *videoURL)
		}

		if _, err := tx.Exec(ctx, `delete from destinations where id = $1`, id); err != nil {
			return fmt.Errorf("delete destination %d: %w", id, err)
		}

		return logActivity(ctx, tx, actor, "delete", "destination", id,
			fmt.Sprintf("Menghapus destinasi %s (id: %d).", name, id))
	})
	if err != nil {
		return nil, err
	}
	return paths, nil
}

// AddPhoto menambahkan foto; foto pertama otomatis menjadi cover.
func (r *Repository) AddPhoto(ctx context.Context, photo Photo, actor Actor) (Photo, error) {
	created := photo

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var destinationName string
		err := tx.QueryRow(ctx, `select name from destinations where id = $1 for update`, photo.DestinationID).Scan(&destinationName)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load destination %d: %w", photo.DestinationID, err)
		}

		err = tx.QueryRow(ctx, `
			insert into destination_photos (destination_id, file_path, caption, is_cover, sort_order)
			values (
				$1, $2, $3,
				not exists (select 1 from destination_photos where destination_id = $1 and is_cover),
				coalesce((select max(sort_order) + 1 from destination_photos where destination_id = $1), 1)
			)
			returning id, is_cover, sort_order`,
			photo.DestinationID, photo.FilePath, photo.Caption,
		).Scan(&created.ID, &created.IsCover, &created.SortOrder)
		if err != nil {
			return fmt.Errorf("insert destination photo: %w", err)
		}

		return logActivity(ctx, tx, actor, "upload_photo", "destination_photo", created.ID,
			fmt.Sprintf("Menambahkan foto pada destinasi %s (id: %d).", destinationName, photo.DestinationID))
	})
	if err != nil {
		return Photo{}, err
	}
	return created, nil
}

// DeletePhoto menghapus foto, mempromosikan cover pengganti, dan mengembalikan
// path file untuk dibersihkan.
func (r *Repository) DeletePhoto(ctx context.Context, destinationID, photoID int64, actor Actor) (string, error) {
	path := ""

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var destinationName string
		var wasCover bool
		err := tx.QueryRow(ctx, `
			select d.name, p.file_path, p.is_cover
			from destination_photos p
			join destinations d on d.id = p.destination_id
			where p.id = $2 and p.destination_id = $1
			for update of p`, destinationID, photoID).Scan(&destinationName, &path, &wasCover)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPhotoNotFound
		}
		if err != nil {
			return fmt.Errorf("load photo %d of destination %d: %w", photoID, destinationID, err)
		}

		if _, err := tx.Exec(ctx, `delete from destination_photos where id = $1`, photoID); err != nil {
			return fmt.Errorf("delete photo %d: %w", photoID, err)
		}

		if wasCover {
			_, err := tx.Exec(ctx, `
				update destination_photos set is_cover = true
				where id = (
					select id from destination_photos
					where destination_id = $1
					order by sort_order, id
					limit 1
				)`, destinationID)
			if err != nil {
				return fmt.Errorf("promote cover photo of destination %d: %w", destinationID, err)
			}
		}

		return logActivity(ctx, tx, actor, "delete_photo", "destination_photo", photoID,
			fmt.Sprintf("Menghapus foto pada destinasi %s (id: %d).", destinationName, destinationID))
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// SetCover menjadikan satu foto sebagai cover dan mencabut cover lama.
func (r *Repository) SetCover(ctx context.Context, destinationID, photoID int64, actor Actor) error {
	return shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var destinationName string
		err := tx.QueryRow(ctx, `select name from destinations where id = $1 for update`, destinationID).Scan(&destinationName)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load destination %d: %w", destinationID, err)
		}

		var exists bool
		err = tx.QueryRow(ctx, `
			select exists (
				select 1 from destination_photos where id = $2 and destination_id = $1
			)`, destinationID, photoID).Scan(&exists)
		if err != nil {
			return fmt.Errorf("check photo %d of destination %d: %w", photoID, destinationID, err)
		}
		if !exists {
			return ErrPhotoNotFound
		}

		if _, err := tx.Exec(ctx, `
			update destination_photos set is_cover = false
			where destination_id = $1 and is_cover`, destinationID); err != nil {
			return fmt.Errorf("clear cover photo of destination %d: %w", destinationID, err)
		}
		if _, err := tx.Exec(ctx, `
			update destination_photos set is_cover = true
			where id = $2 and destination_id = $1`, destinationID, photoID); err != nil {
			return fmt.Errorf("set cover photo %d: %w", photoID, err)
		}

		return logActivity(ctx, tx, actor, "set_cover", "destination_photo", photoID,
			fmt.Sprintf("Menjadikan foto #%d sebagai cover destinasi %s (id: %d).", photoID, destinationName, destinationID))
	})
}

// SetVideo menyimpan video destinasi; video nil berarti menghapus kolom video.
// Path file lama dikembalikan agar bisa dibersihkan pemanggil.
func (r *Repository) SetVideo(ctx context.Context, id int64, video *Video, actor Actor) (string, error) {
	oldPath := ""

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var name, oldKind string
		var oldURL *string
		err := tx.QueryRow(ctx, `
			select name, coalesce(video_kind, ''), video_url
			from destinations
			where id = $1
			for update`, id).Scan(&name, &oldKind, &oldURL)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load destination %d: %w", id, err)
		}

		videoKind, videoURL := videoValues(video)
		if _, err := tx.Exec(ctx, `
			update destinations set video_kind = $2, video_url = $3, updated_at = now()
			where id = $1`, id, videoKind, videoURL); err != nil {
			return fmt.Errorf("set video of destination %d: %w", id, err)
		}

		if oldKind == VideoKindFile && oldURL != nil {
			oldPath = *oldURL
		}

		action := "delete_video"
		description := fmt.Sprintf("Menghapus video dari destinasi %s (id: %d).", name, id)
		if video != nil {
			action = "upload_video"
			description = fmt.Sprintf("Menambahkan video pada destinasi %s (id: %d).", name, id)
		}
		return logActivity(ctx, tx, actor, action, "destination", id, description)
	})
	if err != nil {
		return "", err
	}
	return oldPath, nil
}

// SeedCategory menyisipkan kategori referensi secara idempoten.
func (r *Repository) SeedCategory(ctx context.Context, category Category) error {
	_, err := r.conn.Exec(ctx, `
		insert into destination_categories (slug, name, icon)
		values ($1, $2, $3)
		on conflict (slug) do nothing`,
		category.Slug, category.Name, category.Icon)
	if err != nil {
		return fmt.Errorf("seed category %q: %w", category.Slug, err)
	}
	return nil
}

// SeedDestination menyisipkan destinasi contoh secara idempoten berdasarkan slug.
func (r *Repository) SeedDestination(ctx context.Context, destination Destination) error {
	_, err := r.conn.Exec(ctx, `
		insert into destinations (
			category_id, name, slug, description, address, latitude, longitude,
			rating, is_free, price_min, price_max, opening_hours, contact,
			facilities, is_published
		)
		select c.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		from destination_categories c
		where c.slug = $1
		on conflict (slug) do nothing`,
		destination.Category.Slug, destination.Name, destination.Slug,
		destination.Description, destination.Address, destination.Latitude,
		destination.Longitude, destination.Rating, destination.IsFree,
		destination.PriceMin, destination.PriceMax, destination.OpeningHours,
		destination.Contact, destination.Facilities, destination.IsPublished)
	if err != nil {
		return fmt.Errorf("seed destination %q: %w", destination.Slug, err)
	}
	return nil
}

func (r *Repository) photosFor(ctx context.Context, destinationID int64) ([]Photo, error) {
	rows, err := r.conn.Query(ctx, `
		select id, destination_id, file_path, caption, is_cover, sort_order
		from destination_photos
		where destination_id = $1
		order by is_cover desc, sort_order, id`, destinationID)
	if err != nil {
		return nil, fmt.Errorf("query photos of destination %d: %w", destinationID, err)
	}
	defer rows.Close()

	photos := make([]Photo, 0)
	for rows.Next() {
		photo, err := scanPhoto(rows)
		if err != nil {
			return nil, fmt.Errorf("scan photo: %w", err)
		}
		photos = append(photos, photo)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate photos: %w", err)
	}
	return photos, nil
}

func (r *Repository) photosForMany(ctx context.Context, destinationIDs []int64) (map[int64][]Photo, error) {
	grouped := make(map[int64][]Photo, len(destinationIDs))
	if len(destinationIDs) == 0 {
		return grouped, nil
	}

	rows, err := r.conn.Query(ctx, `
		select id, destination_id, file_path, caption, is_cover, sort_order
		from destination_photos
		where destination_id = any($1)
		order by is_cover desc, sort_order, id`, destinationIDs)
	if err != nil {
		return nil, fmt.Errorf("query photos for destinations: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		photo, err := scanPhoto(rows)
		if err != nil {
			return nil, fmt.Errorf("scan photo: %w", err)
		}
		grouped[photo.DestinationID] = append(grouped[photo.DestinationID], photo)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate photos: %w", err)
	}
	return grouped, nil
}

func scanDestination(row pgx.Row) (Destination, error) {
	var destination Destination
	var videoKind, videoURL *string
	if err := row.Scan(destinationTargets(&destination, &videoKind, &videoURL)...); err != nil {
		return Destination{}, err
	}
	destination.Category.ID = destination.CategoryID
	destination.Video = videoFrom(videoKind, videoURL)
	return destination, nil
}

func scanDestinationWithCover(row pgx.Row) (Destination, error) {
	var destination Destination
	var cover Photo
	var videoKind, videoURL *string
	targets := append(destinationTargets(&destination, &videoKind, &videoURL), &destination.PhotoCount,
		&cover.ID, &cover.FilePath, &cover.Caption, &cover.IsCover, &cover.SortOrder)
	if err := row.Scan(targets...); err != nil {
		return Destination{}, err
	}

	destination.Category.ID = destination.CategoryID
	if cover.ID != 0 {
		cover.DestinationID = destination.ID
		destination.Cover = &cover
	}
	destination.Video = videoFrom(videoKind, videoURL)
	return destination, nil
}

func destinationTargets(destination *Destination, videoKind, videoURL **string) []any {
	return []any{
		&destination.ID, &destination.CategoryID,
		&destination.Category.Slug, &destination.Category.Name, &destination.Category.Icon,
		&destination.Name, &destination.Slug, &destination.Description,
		&destination.Address, &destination.Latitude, &destination.Longitude,
		&destination.Rating, &destination.IsFree, &destination.PriceMin,
		&destination.PriceMax, &destination.OpeningHours, &destination.Contact,
		&destination.Facilities, &destination.IsPublished, videoKind, videoURL,
		&destination.CreatedAt, &destination.UpdatedAt,
	}
}

// videoFrom menyusun Video dari kolom nullable hasil query.
func videoFrom(kind, url *string) *Video {
	if kind == nil || *kind == "" {
		return nil
	}
	video := &Video{Kind: *kind}
	if url != nil {
		video.URL = *url
	}
	return video
}

// videoValues mengubah Video menjadi pasangan nilai kolom video_kind dan
// video_url. Video nil atau berkind kosong berarti kolom dikosongkan.
func videoValues(video *Video) (*string, *string) {
	if video == nil || video.Kind == "" {
		return nil, nil
	}
	return &video.Kind, &video.URL
}

func scanPhoto(row pgx.Row) (Photo, error) {
	var photo Photo
	err := row.Scan(&photo.ID, &photo.DestinationID, &photo.FilePath,
		&photo.Caption, &photo.IsCover, &photo.SortOrder)
	if err != nil {
		return Photo{}, err
	}
	return photo, nil
}

type destinationSnapshot struct {
	name        string
	rating      float64
	isFree      bool
	priceMin    *int
	priceMax    *int
	isPublished bool
}

func loadSnapshot(ctx context.Context, tx pgx.Tx, id int64) (destinationSnapshot, error) {
	var snapshot destinationSnapshot
	err := tx.QueryRow(ctx, `
		select d.name, d.rating, d.is_free, d.price_min, d.price_max, d.is_published
		from destinations d
		where d.id = $1`, id).
		Scan(&snapshot.name, &snapshot.rating, &snapshot.isFree,
			&snapshot.priceMin, &snapshot.priceMax, &snapshot.isPublished)
	if errors.Is(err, pgx.ErrNoRows) {
		return destinationSnapshot{}, ErrNotFound
	}
	if err != nil {
		return destinationSnapshot{}, fmt.Errorf("load destination %d: %w", id, err)
	}
	return snapshot, nil
}

func logActivity(ctx context.Context, tx pgx.Tx, actor Actor, action, subjectType string, subjectID int64, description string) error {
	var actorUserID *int64
	if actor.UserID > 0 {
		actorUserID = &actor.UserID
	}

	_, err := tx.Exec(ctx, `
		insert into activity_logs (actor_user_id, actor_name, action, subject_type, subject_id, description)
		values ($1, $2, $3, $4, $5, $6)`,
		actorUserID, actor.Name, action, subjectType, subjectID, description)
	if err != nil {
		return fmt.Errorf("insert activity log: %w", err)
	}
	return nil
}

func describeUpdate(before destinationSnapshot, after Destination) string {
	changes := make([]string, 0, 4)

	if before.name != after.Name {
		changes = append(changes, fmt.Sprintf("nama berubah dari %s ke %s", before.name, after.Name))
	}
	if before.rating != after.Rating {
		changes = append(changes, fmt.Sprintf("rating berubah dari %s ke %s",
			formatRating(before.rating), formatRating(after.Rating)))
	}
	if before.isFree != after.IsFree || !equalPrice(before.priceMin, after.PriceMin) || !equalPrice(before.priceMax, after.PriceMax) {
		changes = append(changes, fmt.Sprintf("harga berubah dari %s ke %s",
			formatPrice(before.isFree, before.priceMin, before.priceMax),
			formatPrice(after.IsFree, after.PriceMin, after.PriceMax)))
	}
	if before.isPublished != after.IsPublished {
		changes = append(changes, fmt.Sprintf("status terbit berubah dari %s ke %s",
			publishLabel(before.isPublished), publishLabel(after.IsPublished)))
	}

	base := fmt.Sprintf("Memperbarui destinasi %s (id: %d)", after.Name, after.ID)
	if len(changes) == 0 {
		return base + "."
	}
	return base + ", " + strings.Join(changes, "; ") + "."
}

func formatRating(rating float64) string {
	return strconv.FormatFloat(rating, 'f', 1, 64)
}

func formatPrice(isFree bool, min, max *int) string {
	if isFree {
		return "gratis"
	}
	switch {
	case min == nil:
		return "-"
	case max == nil:
		return fmt.Sprintf("Rp %d (mulai dari)", *min)
	default:
		return fmt.Sprintf("Rp %d - Rp %d", *min, *max)
	}
}

func publishLabel(published bool) string {
	if published {
		return "terbit"
	}
	return "draf"
}

func equalPrice(left, right *int) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return *left == *right
}

func isSlugConflict(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "destinations_slug_key"
}
