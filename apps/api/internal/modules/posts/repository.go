package posts

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

const postColumns = `
	id, title, slug, excerpt, content, tag, coalesce(cover_path, ''),
	is_published, published_at, created_at, updated_at`

const listFilter = `
	where ($1 = ''
		or title ilike '%' || $1 || '%'
		or excerpt ilike '%' || $1 || '%'
		or tag ilike '%' || $1 || '%')`

// Repository mengakses tabel blog_posts dan activity log.
type Repository struct {
	conn shared.Conn
}

// NewRepository membuat repository artikel di atas koneksi yang diberikan.
func NewRepository(conn shared.Conn) *Repository {
	return &Repository{conn: conn}
}

// List mengembalikan artikel berpaginasi untuk admin.
func (r *Repository) List(ctx context.Context, page, perPage int, q string) ([]Post, PaginationMeta, error) {
	var total int
	err := r.conn.QueryRow(ctx, `select count(*) from blog_posts`+listFilter, q).Scan(&total)
	if err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("count posts: %w", err)
	}

	offset := (page - 1) * perPage
	rows, err := r.conn.Query(ctx, `
		select `+postColumns+`
		from blog_posts`+listFilter+`
		order by updated_at desc, id desc
		limit $2 offset $3`, q, perPage, offset)
	if err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("query posts: %w", err)
	}
	defer rows.Close()

	list := make([]Post, 0, perPage)
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			return nil, PaginationMeta{}, fmt.Errorf("scan post: %w", err)
		}
		list = append(list, post)
	}
	if err := rows.Err(); err != nil {
		return nil, PaginationMeta{}, fmt.Errorf("iterate posts: %w", err)
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + perPage - 1) / perPage
	}
	return list, PaginationMeta{Page: page, PerPage: perPage, Total: total, TotalPages: totalPages}, nil
}

// PublicList mengembalikan artikel terbit, urut terbaru.
func (r *Repository) PublicList(ctx context.Context) ([]Post, error) {
	rows, err := r.conn.Query(ctx, `
		select `+postColumns+`
		from blog_posts
		where is_published
		order by published_at desc nulls last, created_at desc, id desc
		limit 500`)
	if err != nil {
		return nil, fmt.Errorf("query public posts: %w", err)
	}
	defer rows.Close()

	list := make([]Post, 0)
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			return nil, fmt.Errorf("scan public post: %w", err)
		}
		list = append(list, post)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public posts: %w", err)
	}
	return list, nil
}

// Get mengembalikan detail artikel berdasarkan id.
func (r *Repository) Get(ctx context.Context, id int64) (Post, error) {
	post, err := scanPost(r.conn.QueryRow(ctx, `
		select `+postColumns+`
		from blog_posts
		where id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Post{}, ErrNotFound
	}
	if err != nil {
		return Post{}, fmt.Errorf("get post %d: %w", id, err)
	}
	return post, nil
}

// PublicBySlug mengembalikan artikel terbit berdasarkan slug.
func (r *Repository) PublicBySlug(ctx context.Context, slug string) (Post, error) {
	post, err := scanPost(r.conn.QueryRow(ctx, `
		select `+postColumns+`
		from blog_posts
		where slug = $1 and is_published`, slug))
	if errors.Is(err, pgx.ErrNoRows) {
		return Post{}, ErrNotFound
	}
	if err != nil {
		return Post{}, fmt.Errorf("get public post %q: %w", slug, err)
	}
	return post, nil
}

// SlugExists memeriksa apakah slug sudah dipakai artikel lain.
func (r *Repository) SlugExists(ctx context.Context, slug string) (bool, error) {
	var exists bool
	err := r.conn.QueryRow(ctx, `select exists (select 1 from blog_posts where slug = $1)`, slug).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check slug %q: %w", slug, err)
	}
	return exists, nil
}

// Create menyimpan artikel baru beserta activity log dalam satu transaksi.
// Artikel yang langsung terbit mendapat published_at saat dibuat.
func (r *Repository) Create(ctx context.Context, post Post, actor Actor) (Post, error) {
	created := post

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		err := tx.QueryRow(ctx, `
			insert into blog_posts (title, slug, excerpt, content, tag, is_published, published_at)
			values ($1, $2, $3, $4, $5, $6, case when $6 then now() end)
			returning id, published_at, created_at, updated_at`,
			post.Title, post.Slug, post.Excerpt, post.Content, post.Tag, post.IsPublished,
		).Scan(&created.ID, &created.PublishedAt, &created.CreatedAt, &created.UpdatedAt)
		if isSlugConflict(err) {
			return ErrSlugTaken
		}
		if err != nil {
			return fmt.Errorf("insert post: %w", err)
		}

		return logActivity(ctx, tx, actor, "create", "blog_post", created.ID,
			fmt.Sprintf("Menambahkan artikel %s (id: %d).", created.Title, created.ID))
	})
	if err != nil {
		return Post{}, err
	}
	return created, nil
}

// Update menyimpan perubahan artikel dan mencatat selisih nilai pada log.
func (r *Repository) Update(ctx context.Context, post Post, actor Actor) (Post, error) {
	updated := post

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		before, err := loadSnapshot(ctx, tx, post.ID)
		if err != nil {
			return err
		}

		err = tx.QueryRow(ctx, `
			update blog_posts set
				title = $2, excerpt = $3, content = $4, tag = $5,
				is_published = $6,
				published_at = case when $6 and published_at is null then now() else published_at end,
				updated_at = now()
			where id = $1
			returning slug, coalesce(cover_path, ''), published_at, created_at, updated_at`,
			post.ID, post.Title, post.Excerpt, post.Content, post.Tag, post.IsPublished,
		).Scan(&updated.Slug, &updated.CoverPath, &updated.PublishedAt, &updated.CreatedAt, &updated.UpdatedAt)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("update post %d: %w", post.ID, err)
		}

		return logActivity(ctx, tx, actor, "update", "blog_post", post.ID,
			describeUpdate(before, updated))
	})
	if err != nil {
		return Post{}, err
	}
	return updated, nil
}

// Delete menghapus artikel dan mengembalikan path cover untuk dibersihkan.
func (r *Repository) Delete(ctx context.Context, id int64, actor Actor) (string, error) {
	coverPath := ""

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var title string
		err := tx.QueryRow(ctx, `
			select title, coalesce(cover_path, '')
			from blog_posts
			where id = $1
			for update`, id).Scan(&title, &coverPath)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load post %d: %w", id, err)
		}

		if _, err := tx.Exec(ctx, `delete from blog_posts where id = $1`, id); err != nil {
			return fmt.Errorf("delete post %d: %w", id, err)
		}

		return logActivity(ctx, tx, actor, "delete", "blog_post", id,
			fmt.Sprintf("Menghapus artikel %s (id: %d).", title, id))
	})
	if err != nil {
		return "", err
	}
	return coverPath, nil
}

// SetCover menyimpan cover baru dan mengembalikan path file lama.
func (r *Repository) SetCover(ctx context.Context, id int64, path string, actor Actor) (string, error) {
	oldPath := ""

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var title string
		err := tx.QueryRow(ctx, `
			select title, coalesce(cover_path, '')
			from blog_posts
			where id = $1
			for update`, id).Scan(&title, &oldPath)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load post %d: %w", id, err)
		}

		if _, err := tx.Exec(ctx, `
			update blog_posts set cover_path = $2, updated_at = now()
			where id = $1`, id, path); err != nil {
			return fmt.Errorf("set cover of post %d: %w", id, err)
		}

		return logActivity(ctx, tx, actor, "upload_cover", "blog_post", id,
			fmt.Sprintf("Mengganti cover artikel %s (id: %d).", title, id))
	})
	if err != nil {
		return "", err
	}
	return oldPath, nil
}

// DeleteCover mengosongkan cover dan mengembalikan path file lama.
func (r *Repository) DeleteCover(ctx context.Context, id int64, actor Actor) (string, error) {
	oldPath := ""

	err := shared.WithTx(ctx, r.conn, func(tx pgx.Tx) error {
		var title string
		err := tx.QueryRow(ctx, `
			select title, coalesce(cover_path, '')
			from blog_posts
			where id = $1
			for update`, id).Scan(&title, &oldPath)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("load post %d: %w", id, err)
		}

		if _, err := tx.Exec(ctx, `
			update blog_posts set cover_path = null, updated_at = now()
			where id = $1`, id); err != nil {
			return fmt.Errorf("delete cover of post %d: %w", id, err)
		}

		return logActivity(ctx, tx, actor, "delete_cover", "blog_post", id,
			fmt.Sprintf("Menghapus cover artikel %s (id: %d).", title, id))
	})
	if err != nil {
		return "", err
	}
	return oldPath, nil
}

// SeedPost menyisipkan artikel contoh secara idempoten berdasarkan slug.
func (r *Repository) SeedPost(ctx context.Context, post Post) error {
	_, err := r.conn.Exec(ctx, `
		insert into blog_posts (title, slug, excerpt, content, tag, is_published, published_at)
		values ($1, $2, $3, $4, $5, $6, $7)
		on conflict (slug) do nothing`,
		post.Title, post.Slug, post.Excerpt, post.Content, post.Tag,
		post.IsPublished, post.PublishedAt)
	if err != nil {
		return fmt.Errorf("seed post %q: %w", post.Slug, err)
	}
	return nil
}

func scanPost(row pgx.Row) (Post, error) {
	var post Post
	err := row.Scan(
		&post.ID, &post.Title, &post.Slug, &post.Excerpt, &post.Content,
		&post.Tag, &post.CoverPath, &post.IsPublished, &post.PublishedAt,
		&post.CreatedAt, &post.UpdatedAt,
	)
	if err != nil {
		return Post{}, err
	}
	return post, nil
}

type postSnapshot struct {
	title       string
	tag         string
	isPublished bool
}

func loadSnapshot(ctx context.Context, tx pgx.Tx, id int64) (postSnapshot, error) {
	var snapshot postSnapshot
	err := tx.QueryRow(ctx, `
		select title, tag, is_published
		from blog_posts
		where id = $1`, id).Scan(&snapshot.title, &snapshot.tag, &snapshot.isPublished)
	if errors.Is(err, pgx.ErrNoRows) {
		return postSnapshot{}, ErrNotFound
	}
	if err != nil {
		return postSnapshot{}, fmt.Errorf("load post %d: %w", id, err)
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

func describeUpdate(before postSnapshot, after Post) string {
	changes := make([]string, 0, 3)

	if before.title != after.Title {
		changes = append(changes, fmt.Sprintf("judul berubah dari %s ke %s", before.title, after.Title))
	}
	if before.tag != after.Tag {
		changes = append(changes, fmt.Sprintf("tag berubah dari %s ke %s", before.tag, after.Tag))
	}
	if before.isPublished != after.IsPublished {
		changes = append(changes, fmt.Sprintf("status terbit berubah dari %s ke %s",
			publishLabel(before.isPublished), publishLabel(after.IsPublished)))
	}

	base := fmt.Sprintf("Memperbarui artikel %s (id: %d)", after.Title, after.ID)
	if len(changes) == 0 {
		return base + "."
	}
	return base + ", " + strings.Join(changes, "; ") + "."
}

func publishLabel(published bool) string {
	if published {
		return "terbit"
	}
	return "draf"
}

func isSlugConflict(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "blog_posts_slug_key"
}
