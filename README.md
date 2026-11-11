# Jelajah Bangkalan

Web informasi wisata Kabupaten Bangkalan. Halaman utama adalah peta 3D penuh layar
(MapLibre GL JS) dengan marker berikon, animasi kamera ke titik wisata, panel
informasi lengkap, rating, harga, dan galeri foto. Admin mengelola destinasi lewat
panel bergaya Plane.

Monorepo: frontend React 19 + Vite di [`apps/web/`](./apps/web), API Go Fiber v3 +
pgx + PostgreSQL 16 di [`apps/api/`](./apps/api).

## Fitur

- Peta 3D miring dan bisa diputar, terrain, bangunan 3D.
- Marker per kategori: pantai, religi, alam, budaya, kuliner.
- Klik marker: kamera terbang turun mendekati titik, panel detail terbuka.
- Pencarian dan filter kategori di halaman peta.
- Admin CRUD destinasi: rating, harga, jam buka, kontak, fasilitas, status terbit.
- Galeri foto per destinasi, unggah banyak file, pilih cover.
- Video per destinasi: unggah file atau link YouTube, tampil sebagai overlay saat marker diklik.
- Header publik modern + blog fakta unik Madura (`/blog`), dikelola admin di `/posts`.
- Autentikasi Bearer + permission `destination:*` dan `blog:*`.
- DataTable server-side, command palette, tema terang/gelap.

## Menjalankan

Prasyarat: Bun, Go 1.26+, dan Docker.

```bash
# 1. PostgreSQL di port 5439 (dari root repo)
docker compose up -d

# 2. API (migrasi otomatis saat start)
cp apps/api/.env.example apps/api/.env
set -a && . apps/api/.env && set +a
cd apps/api && go run ./cmd/server

# 3. Seed admin + 8 destinasi + 5 artikel blog (terminal lain, idempoten)
cd apps/api && set -a && . ./.env && set +a && go run ./cmd/seed

# 4. Frontend (terminal lain, dari root repo)
cd apps/web
bun install
bun run dev
```

- Web: `http://localhost:5180`
- API: `http://localhost:8091`
- Admin: `http://localhost:5180/login`
- Kredensial seed: `admin@jelajahbangkalan.test` / `Admin#12345`

Vite memproxy `/api` dan `/uploads` ke API. Ubah target lewat `API_PROXY_TARGET`.

## Struktur

```text
apps/
  api/
    cmd/{server,seed}
    internal/modules/{auth,destinations}
    migrations/
    uploads/                 # foto unggahan, tidak di-commit
  web/
    src/pages/public/        # peta publik
    src/pages/destinations/  # admin destinasi
    src/lib/                 # api, auth, ikon, format
```

## Verifikasi

```bash
cd apps/api && go test ./...
cd apps/web && bun run typecheck
```

Dokumen desain dan rencana ada di `docs/superpowers/`.
