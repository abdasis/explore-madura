# Explore Madura — API

API Go Fiber v3 + pgx v5 + PostgreSQL 16 untuk Jelajah Bangkalan. Modul per domain
di `internal/modules`: `auth`, `destinations`, dan `posts`. Alur dependensi satu
arah: handler -> service -> repository -> domain.

## Menjalankan

Prasyarat: Go 1.26 (toolchain otomatis) dan Docker.

```bash
# PostgreSQL di port 5439 (dari root repo)
docker compose up -d

cp apps/api/.env.example apps/api/.env
set -a && . apps/api/.env && set +a
cd apps/api && go run ./cmd/server
```

Migrasi berjalan otomatis saat start. Seed idempoten:

```bash
cd apps/api && set -a && . ./.env && set +a && go run ./cmd/seed
```

Kredensial seed: `admin@jelajahbangkalan.test` / `Admin#12345`, permission
`destination:read`, `destination:write`, `blog:read`, `blog:write`.

## Environment

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `8091` | Port HTTP |
| `DATABASE_URL` | `postgres://starter:starter@localhost:5439/starter?sslmode=disable` | DSN pgx |
| `WEB_ORIGIN` | `http://localhost:5180` | Origin CORS |
| `SESSION_TTL_HOURS` | `24` | Umur token sesi |
| `UPLOAD_DIR` | `./uploads` | Direktori foto dan video |
| `MAX_UPLOAD_MB` | `5` | Batas foto/cover |
| `MAX_VIDEO_MB` | `50` | Batas video |

## Endpoint

Base `/api/v1`. Envelope sukses `{data}` / `{data,meta}`; error
`{error:{code,message,fields}}`.

Publik tanpa auth:

- `GET /public/destinations`, `GET /public/categories`
- `GET /public/posts`, `GET /public/posts/:slug`

Admin (Bearer + permission):

- `GET|POST /destinations`, `GET|PUT|DELETE /destinations/:id`
- `POST /destinations/:id/photos`, `DELETE /destinations/:id/photos/:photoId`,
  `PUT /destinations/:id/photos/:photoId/cover`
- `POST|DELETE /destinations/:id/video`
- `GET|POST /posts`, `GET|PUT|DELETE /posts/:id`
- `POST|DELETE /posts/:id/cover`

File upload disajikan di `/uploads/*`.

## Test

```bash
cd apps/api && go test ./...
DATABASE_URL_TEST='postgres://starter:starter@localhost:5439/bangkalan_tourism_test?sslmode=disable' \
  go test ./tests/integration -count=1
```
