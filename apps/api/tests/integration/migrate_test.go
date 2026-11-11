package integration_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/abdasis/explore-madura/api/internal/infrastructure"
	"github.com/abdasis/explore-madura/api/migrations"
)

// TestMigrateIdempotent butuh PostgreSQL nyata lewat DATABASE_URL_TEST.
func TestMigrateIdempotent(t *testing.T) {
	url := os.Getenv("DATABASE_URL_TEST")
	if url == "" {
		t.Skip("DATABASE_URL_TEST kosong; test integrasi dilewati")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := infrastructure.Connect(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	for round := 1; round <= 2; round++ {
		if err := infrastructure.Migrate(ctx, pool, migrations.FS); err != nil {
			t.Fatalf("migrate putaran %d: %v", round, err)
		}
	}

	var applied int
	if err := pool.QueryRow(ctx, `select count(*) from schema_migrations`).Scan(&applied); err != nil {
		t.Fatalf("hitung schema_migrations: %v", err)
	}
	if applied == 0 {
		t.Fatal("schema_migrations kosong setelah migrasi")
	}

	var users int
	if err := pool.QueryRow(ctx, `select count(*) from information_schema.tables where table_name = 'users'`).Scan(&users); err != nil {
		t.Fatalf("cek tabel users: %v", err)
	}
	if users != 1 {
		t.Fatalf("tabel users tidak ada")
	}

	var destinations int
	if err := pool.QueryRow(ctx, `select count(*) from information_schema.tables where table_name = 'destinations'`).Scan(&destinations); err != nil {
		t.Fatalf("cek tabel destinations: %v", err)
	}
	if destinations != 1 {
		t.Fatalf("tabel destinations tidak ada")
	}

	var categories int
	if err := pool.QueryRow(ctx, `select count(*) from destination_categories`).Scan(&categories); err != nil {
		t.Fatalf("hitung destination_categories: %v", err)
	}
	if categories != 5 {
		t.Fatalf("destination_categories = %d, want 5", categories)
	}

	var videoColumns int
	if err := pool.QueryRow(ctx, `
		select count(*)
		from information_schema.columns
		where table_name = 'destinations'
		  and column_name in ('video_kind', 'video_url')`).Scan(&videoColumns); err != nil {
		t.Fatalf("cek kolom video: %v", err)
	}
	if videoColumns != 2 {
		t.Fatalf("kolom video = %d, want 2", videoColumns)
	}

	var videoCheck int
	if err := pool.QueryRow(ctx, `
		select count(*)
		from pg_constraint
		where conname = 'destinations_video_kind_check'
		  and conrelid = 'destinations'::regclass`).Scan(&videoCheck); err != nil {
		t.Fatalf("cek constraint video_kind: %v", err)
	}
	if videoCheck != 1 {
		t.Fatalf("constraint destinations_video_kind_check tidak ada")
	}

	var posts int
	if err := pool.QueryRow(ctx, `select count(*) from information_schema.tables where table_name = 'blog_posts'`).Scan(&posts); err != nil {
		t.Fatalf("cek tabel blog_posts: %v", err)
	}
	if posts != 1 {
		t.Fatalf("tabel blog_posts tidak ada")
	}

	var postColumns int
	if err := pool.QueryRow(ctx, `
		select count(*)
		from information_schema.columns
		where table_name = 'blog_posts'
		  and column_name in (
			'id', 'title', 'slug', 'excerpt', 'content', 'tag', 'cover_path',
			'is_published', 'published_at', 'created_at', 'updated_at'
		  )`).Scan(&postColumns); err != nil {
		t.Fatalf("cek kolom blog_posts: %v", err)
	}
	if postColumns != 11 {
		t.Fatalf("kolom blog_posts = %d, want 11", postColumns)
	}

	var slugUnique int
	if err := pool.QueryRow(ctx, `
		select count(*)
		from pg_constraint
		where conname = 'blog_posts_slug_key'
		  and conrelid = 'blog_posts'::regclass`).Scan(&slugUnique); err != nil {
		t.Fatalf("cek unique slug blog_posts: %v", err)
	}
	if slugUnique != 1 {
		t.Fatalf("constraint blog_posts_slug_key tidak ada")
	}

	var publishedIndex int
	if err := pool.QueryRow(ctx, `
		select count(*)
		from pg_indexes
		where tablename = 'blog_posts'
		  and indexname = 'blog_posts_published_at_idx'`).Scan(&publishedIndex); err != nil {
		t.Fatalf("cek index blog_posts: %v", err)
	}
	if publishedIndex != 1 {
		t.Fatalf("index blog_posts_published_at_idx tidak ada")
	}
}
