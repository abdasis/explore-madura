// Package infrastructure menyediakan koneksi database dan helper lintas modul.
package infrastructure

import (
	"context"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

// migrationLockKey menyerialkan runner migrasi yang berjalan bersamaan.
const migrationLockKey int64 = 0x706c616e656d6967 // "planemig"

const createMigrationsTable = `
create table if not exists schema_migrations (
	version text primary key,
	applied_at timestamptz not null default now()
)`

// Connect membuka pool dan memastikan database bisa dijangkau.
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// Migrate menerapkan setiap *.sql di fsys satu kali, urut leksikal. Satu file
// berjalan dalam transaksi bersama baris schema_migrations-nya.
func Migrate(ctx context.Context, conn shared.Conn, fsys fs.FS) error {
	versions, err := sqlFiles(fsys)
	if err != nil {
		return err
	}

	if err := withMigrationLock(ctx, conn, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, createMigrationsTable)
		return err
	}); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for _, version := range versions {
		if err := applyMigration(ctx, conn, fsys, version); err != nil {
			return err
		}
	}
	return nil
}

func sqlFiles(fsys fs.FS) ([]string, error) {
	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	versions := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			versions = append(versions, entry.Name())
		}
	}
	sort.Strings(versions)
	return versions, nil
}

func applyMigration(ctx context.Context, conn shared.Conn, fsys fs.FS, version string) error {
	script, err := fs.ReadFile(fsys, version)
	if err != nil {
		return fmt.Errorf("read migration %s: %w", version, err)
	}

	return withMigrationLock(ctx, conn, func(tx pgx.Tx) error {
		applied, err := migrationApplied(ctx, tx, version)
		if err != nil {
			return err
		}
		if applied {
			return nil
		}

		if _, err := tx.Exec(ctx, string(script)); err != nil {
			return fmt.Errorf("apply migration %s: %w", version, err)
		}
		if _, err := tx.Exec(ctx, `insert into schema_migrations (version) values ($1)`, version); err != nil {
			return fmt.Errorf("record migration %s: %w", version, err)
		}
		return nil
	})
}

func withMigrationLock(ctx context.Context, conn shared.Conn, fn func(tx pgx.Tx) error) error {
	return shared.WithTx(ctx, conn, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `select pg_advisory_xact_lock($1)`, migrationLockKey); err != nil {
			return fmt.Errorf("acquire migration lock: %w", err)
		}
		return fn(tx)
	})
}

func migrationApplied(ctx context.Context, conn shared.Conn, version string) (bool, error) {
	var exists bool
	err := conn.QueryRow(ctx, `select exists (select 1 from schema_migrations where version = $1)`, version).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check migration %s: %w", version, err)
	}
	return exists, nil
}
