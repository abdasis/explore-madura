# Explore Madura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web informasi wisata Bangkalan dengan peta 3D penuh layar, marker berikon, animasi kamera ke titik, panel informasi + galeri, serta admin CRUD destinasi lengkap dengan rating, harga, dan unggah foto.

**Architecture:** Monorepo starter dipakai apa adanya: API Go Fiber modular (`apps/api`) dan SPA React (`apps/web`). Modul baru `destinations` mengikuti alur handler -> service -> repository -> domain; halaman publik memakai MapLibre GL JS di luar shell admin, halaman admin memakai shell Plane + DataTable server-side.

**Tech Stack:** Go 1.26, Fiber v3, pgx v5, PostgreSQL 16, React 19, Vite, TypeScript strict, Tailwind v4, HugeIcons, MapLibre GL JS, OpenFreeMap Liberty, AWS Terrain Tiles.

**Spec:** `docs/superpowers/specs/2026-11-11-jelajah-bangkalan-design.md`

## Global Constraints

- Package manager JS: `bun` saja.
- Bahasa UI: Bahasa Indonesia semi-formal dan friendly, hardcode, tanpa i18n.
- Nama file/folder/route/identifier: Bahasa Inggris, kebab-case untuk web.
- Ikon hanya HugeIcons.
- Envelope sukses `{data}` / `{data,meta}`; error `{error:{code,message,fields}}`.
- Migrasi SQL forward-only, satu file baru `0003_destinations.sql`.
- Upload maksimal 5 MB; JPEG/PNG/WebP ditentukan dari isi file.
- Port lokal: PostgreSQL 5439, API 8091, web 5180.
- Tidak ada commit otomatis; commit hanya jika pengguna meminta.
- Tidak menjalankan `bun run dev`/`build` sebagai verifikasi kecuali untuk instruksi "jalankan server" dari pengguna (diizinkan di Task 10).

## Review Focus

1. Browser tanpa WebGL2 atau tile gagal dimuat: peta harus menampilkan pesan jelas, bukan kanvas kosong.
2. File upload rusak atau tipe palsu: harus 422 dan tidak tertulis ke disk.
3. Nama destinasi sama: slug unik harus menghasilkan 409 yang jelas, bukan 500.
4. Harga tidak konsisten (gratis tapi `price_min` terisi, atau `price_max < price_min`): harus 422.
5. Foto cover dihapus atau destinasi tanpa foto: panel dan tabel tetap tampil dengan fallback, tanpa error.

---

### Task 1: Bootstrap proyek dan branding

**Files:**
- Modify: `docker-compose.yml`
- Modify: `apps/api/go.mod`, seluruh import `github.com/abdasis/plane-admin-starter/api/...`
- Modify: `apps/api/internal/config/config.go`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/cmd/server/main.go`, `apps/api/internal/app/app.go`, `apps/api/cmd/seed/main.go`
- Modify: `apps/api/tests/api/helpers_test.go`
- Modify: `apps/web/vite.config.ts`, `apps/web/package.json`, `apps/web/index.html`
- Modify: `apps/web/src/lib/navigation.ts`, `apps/web/src/app.tsx`
- Delete: `apps/api/internal/modules/notes/**`, `apps/api/migrations/0002_notes.sql`, `apps/web/src/pages/notes/**`

**Interfaces:**
- Produces: `app.New(cfg config.Config, authService *auth.Service, destinationsService *destinations.Service) *fiber.App` (parameter `notesService` diganti; nil tetap diizinkan untuk test auth).
- Produces: config fields `UploadDir string`, `MaxUploadMB int`.

- [ ] **Step 1: Ganti module path Go**

Jalankan penggantian mekanis `github.com/abdasis/plane-admin-starter/api` -> `github.com/abdasis/bangkalan-tourism/api` di `go.mod` dan semua `.go`.

- [ ] **Step 2: Pastikan API masih bisa dibangun**

Run: `cd apps/api && go build ./...`
Expected: sukses. Bila Go 1.25.6 menolak direktif `go 1.26.0`, ubah direktif menjadi `go 1.25.0` lalu ulangi.

- [ ] **Step 3: Sesuaikan port dan branding backend**

`docker-compose.yml`: service `bangkalan-tourism-postgres`, port `5439:5432`, volume `bangkalan-tourism-postgres-data`.
`config.go`: default `PORT=8091`, `DATABASE_URL=...localhost:5439...`, `WEB_ORIGIN=http://localhost:5180`, tambah `UPLOAD_DIR=./uploads` dan `MAX_UPLOAD_MB=5`.
`.env.example` disamakan.

- [ ] **Step 4: Sesuaikan port dan proxy web**

`vite.config.ts`: port 5180, `strictPort: true`, proxy `/api` dan `/uploads` ke `http://localhost:8091`.
`package.json`: name `explore-madura-web`.
`index.html`: title `Explore Madura`.

- [ ] **Step 5: Hapus modul Notes**

Hapus file modul notes, migrasi `0002_notes.sql`, halaman notes, entri nav, rute notes, dan pemanggilan `notes.NewService`/`EnsureSamples`. `app.New` tidak lagi menerima service notes. Perbarui `tests/api/helpers_test.go` agar memanggil signature baru.

- [ ] **Step 6: Verifikasi**

Run: `cd apps/api && go build ./... && go test ./...`
Run: `cd apps/web && bun install && bun run typecheck`
Expected: build dan typecheck sukses; test auth tetap hijau.

---

### Task 2: Skema database destinasi

**Files:**
- Create: `apps/api/migrations/0003_destinations.sql`
- Test: `apps/api/tests/integration/migrate_test.go`

**Interfaces:**
- Produces tabel: `destination_categories`, `destinations`, `destination_photos`, `activity_logs`.

- [ ] **Step 1: Tulis migrasi**

Isi kolom dan constraint persis seperti bagian 7 spec. Kategori referensi disisipkan idempoten dengan `on conflict (slug) do nothing`.

- [ ] **Step 2: Perluas test integrasi migrasi**

Tambahkan assertion: setelah migrasi, tabel `destinations` ada dan `destination_categories` berisi 5 baris. Jalankan dua kali untuk membuktikan idempoten.

- [ ] **Step 3: Jalankan PostgreSQL dan test migrasi**

Run: `docker compose up -d`
Run: `createdb -h 127.0.0.1 -p 5439 -U starter bangkalan_tourism_test` (abaikan bila sudah ada)
Run: `cd apps/api && DATABASE_URL_TEST='postgres://starter:starter@localhost:5439/bangkalan_tourism_test?sslmode=disable' go test ./tests/integration -run Migrate -count=1 -v`
Expected: PASS dan kategori berjumlah 5.

---

### Task 3: Domain, repository, dan service destinasi

**Files:**
- Create: `apps/api/internal/modules/destinations/domain.go`
- Create: `apps/api/internal/modules/destinations/repository.go`
- Create: `apps/api/internal/modules/destinations/service.go`
- Test: `apps/api/internal/modules/destinations/service_test.go`

**Interfaces:**
- Produces types `Category`, `Photo`, `Destination`, `DestinationInput`, `Actor`.
- Produces `NewService(store store) *Service` dengan method:
  - `List(ctx context.Context, page, perPage int, q, category string) ([]Destination, PaginationMeta, error)`
  - `PublicList(ctx context.Context) ([]Destination, error)`
  - `Get(ctx context.Context, id int64) (Destination, error)`
  - `Create(ctx context.Context, input DestinationInput, actor Actor) (Destination, error)`
  - `Update(ctx context.Context, id int64, input DestinationInput, actor Actor) (Destination, error)`
  - `Delete(ctx context.Context, id int64, actor Actor) error`
  - `Categories(ctx context.Context) ([]Category, error)`
  - `AddPhoto(ctx context.Context, destinationID int64, filePath, caption string, actor Actor) (Photo, error)`
  - `DeletePhoto(ctx context.Context, destinationID, photoID int64, actor Actor) error`
  - `SetCover(ctx context.Context, destinationID, photoID int64, actor Actor) error`
- Produces error sentinel `ErrNotFound`, `ErrSlugTaken`, `ErrCategoryNotFound`, `ErrPhotoNotFound`.
- Produces `NewRepository(conn shared.Conn) *Repository`.

- [ ] **Step 1: Tulis test service yang gagal**

Test table-driven minimal:
- `TestValidateDestinationRejectsEmptyName`
- `TestValidateDestinationRejectsRatingOutOfRange`
- `TestValidateDestinationRejectsInconsistentPrice`
- `TestSlugifyProducesUniqueFriendlySlug`
- `TestListNormalizesPagination`
- `TestDeleteMapsMissingDestinationToNotFound`

Gunakan fake `store` di file test.

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd apps/api && go test ./internal/modules/destinations -count=1`
Expected: FAIL karena package belum ada.

- [ ] **Step 3: Implementasikan domain, service, repository**

Aturan validasi dan slug mengikuti spec bagian 7. Repository memakai pgx dan `shared.WithTx` untuk create/update + activity log. `Create` mencoba slug dasar, lalu `-2`, `-3`, dst bila bentrok; bila tetap bentrok, `ErrSlugTaken`. `Delete` mengembalikan daftar `file_path` untuk dihapus handler.

- [ ] **Step 4: Jalankan test**

Run: `cd apps/api && go test ./internal/modules/destinations -count=1 -v`
Expected: PASS.

---

### Task 4: HTTP handler, permission, upload, dan static files

**Files:**
- Create: `apps/api/internal/modules/destinations/dto.go`
- Create: `apps/api/internal/modules/destinations/handler.go`
- Create: `apps/api/internal/modules/destinations/module.go`
- Create: `apps/api/internal/modules/destinations/upload.go`
- Modify: `apps/api/internal/modules/auth/handler.go` (ekspor `CurrentUser`), tambah `RequirePermission`
- Modify: `apps/api/internal/shared/error.go` (tambah `Forbidden`)
- Modify: `apps/api/internal/app/app.go`
- Modify: `apps/api/cmd/server/main.go`
- Test: `apps/api/tests/api/destinations_test.go`

**Interfaces:**
- Produces routes publik `GET /api/v1/public/categories`, `GET /api/v1/public/destinations`.
- Produces routes admin `GET|POST /api/v1/destinations`, `GET|PUT|DELETE /api/v1/destinations/:id`, `POST /api/v1/destinations/:id/photos`, `DELETE /api/v1/destinations/:id/photos/:photoId`, `PUT /api/v1/destinations/:id/photos/:photoId/cover`.
- Produces `auth.RequirePermission(code string) fiber.Handler`, `auth.CurrentUser(c fiber.Ctx) User`.
- Produces static `GET /uploads/*` dari `cfg.UploadDir`.

- [ ] **Step 1: Tulis test kontrak HTTP yang gagal**

Dengan fake store + fake user permission:
- `TestPublicDestinationsNeedsNoAuth`
- `TestAdminDestinationsRequiresBearer`
- `TestAdminDestinationsRequiresWritePermission`
- `TestCreateDestinationReturnsValidationFields`
- `TestUploadRejectsNonImage` (multipart dengan byte teks)
- `TestUploadRejectsOversize` (header size > 5 MB)

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `cd apps/api && go test ./tests/api -run Destination -count=1`
Expected: FAIL.

- [ ] **Step 3: Implementasikan handler dan wiring**

Handler memetakan error sentinel ke `shared`:
`ErrNotFound` -> 404, `ErrCategoryNotFound` -> 422 field `category_id`, `ErrSlugTaken` -> 409, `ErrPhotoNotFound` -> 404.

Upload: baca maksimal 512 byte pertama untuk `http.DetectContentType`; terima `image/jpeg`, `image/png`, `image/webp`; tolak selain itu dan file > `MAX_UPLOAD_MB`. Simpan ke `<UPLOAD_DIR>/destinations/<hex>.<ext>`.

`app.New`: `os.MkdirAll(cfg.UploadDir, 0o755)`, `app.Static("/uploads", cfg.UploadDir)`, daftarkan modul destinasi. CORS `AllowMethods` tambah `PATCH` bila diperlukan.

- [ ] **Step 4: Jalankan seluruh test API**

Run: `cd apps/api && go build ./... && go test ./... -count=1`
Expected: PASS.

---

### Task 5: Seed admin, kategori, dan destinasi

**Files:**
- Modify: `apps/api/cmd/seed/main.go`
- Modify: `apps/api/internal/modules/auth/repository.go` (bila perlu upsert kategori)
- Create: `apps/api/internal/modules/destinations/seed.go`

**Interfaces:**
- Produces `destinations.EnsureSeed(ctx context.Context, repo *Repository) error` yang idempoten.

- [ ] **Step 1: Ubah admin seed**

Email `admin@exploremadura.test`, nama `Admin Explore Madura`, permission `destination:read`, `destination:write`.

- [ ] **Step 2: Tambah seed destinasi**

Delapan destinasi dari spec bagian 11, dengan deskripsi Bahasa Indonesia dan rating/harga contoh. Idempoten berdasarkan slug.

- [ ] **Step 3: Jalankan seed dan verifikasi**

Run: `cd apps/api && go run ./cmd/seed`
Run: `psql 'postgres://starter:starter@localhost:5439/starter' -c 'select count(*) from destinations;'`
Expected: 8.

---

### Task 6: Fondasi web — dependency, tipe, ikon, hook data

**Files:**
- Modify: `apps/web/package.json` (tambah `maplibre-gl`)
- Create: `apps/web/src/types/destination.ts`
- Create: `apps/web/src/lib/destination-icons.ts`
- Create: `apps/web/src/lib/format.ts` (format Rupiah)
- Create: `apps/web/src/pages/public/use-public-destinations.ts`
- Create: `apps/web/src/pages/destinations/use-destinations.ts`
- Create: `apps/web/src/pages/destinations/use-destination.ts`
- Modify: `apps/web/src/lib/api.ts` (tambah `api.upload`)

**Interfaces:**
- Produces `PublicDestination`, `DestinationCategory`, `DestinationPhoto`, `AdminDestination`, `DestinationInput`.
- Produces `destinationIcon(icon: string)`; nama ikon terverifikasi: `Beach02Icon`, `Mosque01Icon`, `TreesIcon`, `Castle01Icon`, `Restaurant01Icon`, fallback `Location01Icon`.
- Produces `formatPrice(destination: Pick<PublicDestination, 'is_free' | 'price_min' | 'price_max'>): string`.
- Produces `api.upload<T>(path: string, formData: FormData): Promise<T>`.
- Produces `usePublicDestinations()`, `useDestinations(query)`, `useDestination(id)`.

- [ ] **Step 1: Pasang dependency**

Run: `cd apps/web && bun add maplibre-gl`
Verifikasi nama ikon kategori di `node_modules/@hugeicons/core-free-icons/dist/esm/`; ganti nama di `destination-icons.ts` bila tidak tersedia.

- [ ] **Step 2: Tulis tipe, ikon, formatter, hook**

Hook admin mengikuti pola `use-notes.ts`: pagination server-side, `q`, filter kategori, AbortController, reload.

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && bun run typecheck`
Expected: PASS.

---

### Task 7: Halaman admin daftar destinasi

**Files:**
- Create: `apps/web/src/pages/destinations/index.tsx`
- Create: `apps/web/src/pages/destinations/destination-columns.tsx`
- Create: `apps/web/src/pages/destinations/delete-destination-dialog.tsx`
- Modify: `apps/web/src/lib/navigation.ts`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/pages/auth/login.tsx` (redirect ke `/dashboard`)
- Modify: `apps/web/src/pages/dashboard.tsx` (tetap sebagai beranda admin)

**Interfaces:**
- Produces route `/destinations` dengan permission `destination:read`.
- Produces route `/dashboard` untuk shell admin; `/` menjadi peta publik.

- [ ] **Step 1: Daftarkan nav dan rute**

Nav "Destinasi" ikon `Location01Icon`, permission `destination:read`. Pindahkan dashboard admin ke `/dashboard`, login redirect ke `/dashboard`.

- [ ] **Step 2: Bangun halaman list**

DataTable server-side; kolom: cover (fallback ikon), nama, kategori, rating, harga, status, jumlah foto, aksi. Toolbar pencarian + filter kategori.

- [ ] **Step 3: Hapus dengan konfirmasi**

Dialog konfirmasi memanggil `DELETE /destinations/:id`, lalu reload.

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && bun run typecheck`
Expected: PASS.

---

### Task 8: Halaman admin form destinasi dan galeri

**Files:**
- Create: `apps/web/src/pages/destinations/form.tsx`
- Create: `apps/web/src/pages/destinations/map-picker.tsx`
- Create: `apps/web/src/pages/destinations/photo-gallery.tsx`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/lib/navigation.ts` (breadcrumb)

**Interfaces:**
- Produces route `/destinations/new` dan `/destinations/:id/edit`.
- Consumes `useDestination`, `api.upload`, `destinationIcon`.

- [ ] **Step 1: Form halaman terpisah**

Field sesuai spec bagian 10. Validasi klien untuk nama, rating 0–5, koordinat, dan aturan harga. Error field dari `ApiError.fields` ditampilkan di bawah input.

- [ ] **Step 2: Map picker**

Peta MapLibre kecil di form; klik peta mengisi latitude/longitude. Marker mengikuti koordinat saat ini.

- [ ] **Step 3: Galeri foto**

Daftar foto + unggah banyak file + hapus + jadikan cover. Setelah aksi, muat ulang detail.

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && bun run typecheck`
Expected: PASS.

---

### Task 9: Halaman publik peta 3D

**Files:**
- Create: `apps/web/src/pages/public/map.tsx`
- Create: `apps/web/src/pages/public/components/map-canvas.tsx`
- Create: `apps/web/src/pages/public/components/destination-detail-panel.tsx`
- Create: `apps/web/src/pages/public/components/map-toolbar.tsx`
- Create: `apps/web/src/pages/public/components/map-status.tsx`
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/index.css` (import CSS MapLibre atau style panel)

**Interfaces:**
- Produces route `/` tanpa auth.
- `MapCanvas` menerima `destinations`, `selectedId`, `onSelect`, `onMapClick`, dan mengekspos `flyToDestination(destination)`.
- Produces `mapLibreStyle = 'https://tiles.openfreemap.org/styles/liberty'` dan terrain `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`.

- [ ] **Step 1: Kanvas peta**

Inisialisasi MapLibre: center `[112.7425, -7.0455]`, zoom 11.5, pitch 60, bearing -20, maxPitch 85. Setelah `load`, tambah `raster-dem` dan `setTerrain` exaggeration 1.35. Fallback tanpa terrain bila source gagal.

- [ ] **Step 2: Marker berikon**

Marker HTML `<button aria-label="...">` berikon kategori. Klik marker: `map.flyTo({ center, zoom: 15.5, pitch: 65, bearing: map.getBearing(), speed: 0.8, curve: 1.42, essential: true })`, lalu `onSelect`.

- [ ] **Step 3: Overlay dan panel**

Toolbar kiri atas: brand, pencarian, chip kategori, reset kamera. Panel kanan/bottom sheet: galeri (foto utama + thumbnail), rating bintang, harga, alamat, jam buka, kontak, fasilitas, deskripsi. Escape dan klik peta menutup panel. Empty/error/loading state sesuai spec.

- [ ] **Step 4: Filter dan pencarian klien**

Saring array publik di memori; marker yang tidak cocok dihapus dari peta. Bila hasil kosong, tampilkan overlay "Destinasi tidak ditemukan" + tombol reset.

- [ ] **Step 5: Typecheck dan build**

Run: `cd apps/web && bun run typecheck && bun run build`
Expected: PASS.

---

### Task 11: Backend video destinasi

**Files:**
- Create: `apps/api/migrations/0004_destination_videos.sql`
- Modify: `apps/api/internal/modules/destinations/{domain,service,repository,handler,dto,module,upload}.go`
- Modify: `apps/api/internal/config/config.go`, `.env.example`
- Test: `apps/api/internal/modules/destinations/service_test.go`, `apps/api/tests/api/destinations_test.go`

**Interfaces:**
- `Video{Kind string, URL string}`; `Destination.Video *Video`; response `video: {kind,url}|null`.
- Route `POST /destinations/:id/video` multipart `file`; `DELETE /destinations/:id/video`.
- Config `MaxVideoMB int` (default 50); `MAX_VIDEO_MB`.

- [ ] Tambah kolom `video_kind`, `video_url`; kind hanya `file`/`embed`.
- [ ] Validasi payload: `embed` wajib URL http(s); `file` hanya dari endpoint upload.
- [ ] Upload menerima `video/mp4`/`video/webm`, maksimal `MAX_VIDEO_MB`, simpan `uploads/videos/<hex>.<ext>`, set kind `file`.
- [ ] Hapus video menghapus file best-effort dan mengosongkan kolom; activity log naratif.
- [ ] Naikkan `BodyLimit` agar video maksimal sampai handler.
- [ ] Test service + kontrak HTTP (payload video, tolak tipe salah, tolak oversize), lalu `go test ./...`.

### Task 12: Frontend video overlay

**Files:**
- Modify: `apps/web/src/types/destination.ts`
- Modify: `apps/web/src/pages/destinations/form.tsx`
- Modify: `apps/web/src/pages/public/map.tsx`
- Create: `apps/web/src/pages/public/components/destination-video-overlay.tsx`
- Modify: `apps/web/src/pages/public/components/{map-canvas,map-toolbar}.tsx` (bila perlu)
- Modify: `apps/web/src/lib/api.ts` bila perlu helper upload video

**Interfaces:**
- `DestinationVideo { kind: 'file' | 'embed'; url: string }`.
- Form menyediakan pilihan: tanpa video / unggah file / link YouTube.
- `DestinationVideoOverlay` menerima `destination`, `onClose`.

- [x] Saat marker diklik dan destinasi punya video: `flyTo`, lalu pada `moveend` tampilkan overlay video.
- [x] Overlay: scrim navy, kartu video radius 28px, file `<video controls autoPlay muted playsInline loop>`, embed `<iframe>` 16:9, judul + chip kategori, tombol tutup 44px, Escape menutup.
- [x] Transisi masuk opacity + scale 240ms ease-out, keluar 180ms; `prefers-reduced-motion` tanpa animasi.
- [x] Admin form: pilihan sumber video, unggah file setelah simpan, input link embed, hapus video, error field.
- [x] `bun run typecheck` bersih.

### Task 13: Backend blog posts

**Files:**
- Create: `apps/api/migrations/0005_blog_posts.sql`
- Create: `apps/api/internal/modules/posts/{domain,repository,service,dto,handler,module,seed}.go`
- Modify: `apps/api/internal/app/app.go`, `cmd/server/main.go`, `cmd/seed/main.go`
- Test: `apps/api/internal/modules/posts/service_test.go`, `apps/api/tests/api/posts_test.go`

**Interfaces:**
- `Post{ID, Title, Slug, Excerpt, Content, Tag, CoverURL string; IsPublished bool; PublishedAt *time.Time; CreatedAt, UpdatedAt time.Time}`.
- Publik: `GET /api/v1/public/posts`, `GET /api/v1/public/posts/:slug`.
- Admin: `GET|POST /api/v1/posts`, `GET|PUT|DELETE /api/v1/posts/:id`, `POST /api/v1/posts/:id/cover`, `DELETE /api/v1/posts/:id/cover`; permission `blog:read`/`blog:write`.
- Upload cover ke `uploads/blog/<hex>.<ext>`, JPEG/PNG/WebP maks 5 MB.
- Seed 5 artikel fakta unik Madura idempoten berdasarkan slug.

- [ ] Migrasi tabel + index `blog_posts(is_published, published_at desc)` dan slug unik.
- [ ] Service: validasi judul/tag/ringkasan/isi, slug unik, published_at diisi saat pertama terbit.
- [ ] Repository + activity log naratif; delete menghapus cover best-effort.
- [ ] Handler, route publik/admin, wiring app dan seed + permission admin.
- [ ] Test service + kontrak HTTP + migrasi; `go test ./...` hijau.

### Task 14: Header publik dan halaman blog

**Files:**
- Create: `apps/web/src/pages/public/components/public-header.tsx`
- Create: `apps/web/src/pages/public/blog/list.tsx`, `detail.tsx`
- Create: `apps/web/src/types/post.ts`, `apps/web/src/pages/public/use-public-posts.ts`
- Modify: `apps/web/src/app.tsx`, `apps/web/src/pages/public/map.tsx`
- Modify: `apps/web/src/pages/public/components/map-toolbar.tsx` (geser posisi di bawah header)

**Interfaces:**
- `PublicPost{id,title,slug,excerpt,cover_url,tag,published_at}`; `PublicPostDetail` + `content`.
- Route `/blog`, `/blog/:slug` di luar auth.

- [ ] Header 64px, brand + nav Peta/Blog, active indigo, mobile menu, overlay di peta.
- [ ] List blog: grid kartu playful, placeholder cover, tag, estimasi baca, skeleton/empty/error.
- [ ] Detail blog: cover 16:9, meta, isi paragraf, kembali ke blog.
- [ ] `bun run typecheck` bersih.

### Task 15: Admin blog

**Files:**
- Create: `apps/web/src/pages/posts/{index,form,columns,delete-dialog,use-posts,use-post}.tsx/ts`
- Modify: `apps/web/src/app.tsx`, `apps/web/src/lib/navigation.ts`

- [ ] Nav "Blog" path `/posts`, permission `blog:read`; route list/new/edit dengan `blog:write`.
- [ ] DataTable: judul, tag, status, tanggal terbit, aksi.
- [ ] Form halaman terpisah: judul, tag, ringkasan, isi, cover, status terbit; upload/hapus cover.
- [ ] `bun run typecheck` bersih.

### Task 10: Jalankan server dan smoke test

**Files:** tidak ada perubahan kode wajib.

- [ ] **Step 1: Jalankan database dan API**

Run: `cd /home/abdasis/Projects/bangkalan-tourism && docker compose up -d`
Run (background): `cd apps/api && set -a && . ./.env && set +a && go run ./cmd/server`
Expected: log `api mendengarkan addr=:8091`.

- [ ] **Step 2: Seed**

Run: `cd apps/api && set -a && . ./.env && set +a && go run ./cmd/seed`

- [ ] **Step 3: Jalankan web**

Run (background): `cd apps/web && bun run dev`
Expected: Vite di `http://localhost:5180`.

- [ ] **Step 4: Smoke test HTTP**

Run: `curl -s http://localhost:8091/health`
Run: `curl -s http://localhost:8091/api/v1/public/destinations | head -c 400`
Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5180/`
Expected: health `ok`, publik berisi 8 destinasi, web 200.

- [ ] **Step 5: Laporkan ke pengguna**

Sebutkan URL web, kredensial admin, dan perintah menghentikan server. Screenshot/verifikasi visual hanya jika pengguna meminta atau membuka browser sendiri.
