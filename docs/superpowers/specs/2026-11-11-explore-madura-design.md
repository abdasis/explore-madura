# Explore Madura — Desain

Tanggal: 2026-11-11
Status: menunggu persetujuan

## 1. Intent

Web informasi wisata Kabupaten Bangkalan yang berpusat pada peta 3D. Pengunjung
langsung melihat peta penuh layar, memilih titik wisata, lalu kamera turun dan
miring mendekati titik itu sementara panel informasi lengkap terbuka.

Isi destinasi (rating, harga, galeri foto, deskripsi) dikelola admin lewat panel
admin yang sudah ada di starter.

## 2. Goals

- Peta penuh layar sebagai halaman utama, tanpa landing page.
- Peta benar-benar 3D: bisa dimiringkan dan diputar, ada terrain dan bangunan 3D.
- Setiap destinasi punya marker berikon sesuai kategori.
- Klik marker: kamera terbang dari posisi luas turun mendekati titik, lalu panel
  detail terbuka berisi galeri foto, rating, harga, dan informasi lengkap.
- Admin dapat CRUD destinasi, mengisi rating dan harga, serta mengunggah banyak
  foto per destinasi dan memilih foto cover.
- Video per destinasi: unggahan file (MP4/WebM, maksimal 50 MB) atau link
  YouTube/embed. Saat marker diklik, kamera mendekat lalu peta berganti ke
  overlay video dengan transisi halus; video bisa ditutup untuk kembali ke peta.
- Filter kategori dan pencarian destinasi di halaman peta.
- Data awal berisi destinasi nyata Bangkalan supaya peta tidak kosong.

## 3. Non-goals

- Ulasan/rating dari pengunjung. Rating diisi admin.
- Pemesanan tiket, pembayaran, atau transaksi.
- Pendaftaran pengguna publik. Hanya admin yang punya akun.
- Multi-bahasa. Seluruh antarmuka Bahasa Indonesia.
- Aplikasi mobile native.
- Category CRUD di admin. Kategori adalah data referensi tetap dari seed.
- Clustering marker, street view, atau rute perjalanan.
- Object storage (S3/R2). Upload disimpan di disk lokal API.
- Konversi WebP atau pembuatan thumbnail. File asli disimpan apa adanya.
- Deployment produksi. Target saat ini adalah demo lokal yang berjalan lewat
  Vite dev server dengan proxy same-origin.
- Basemap gelap. Peta publik tetap memakai gaya Liberty terang; tombol tema
  hanya ada di admin.

## 4. Constraints

- Starter: `github.com/abdasis/plane-admin-starter`, branch
  `feat/go-fiber-modular-api` (repo privat, clone lewat `gh`).
- Monorepo: `apps/api` (Go 1.26, Fiber v3, pgx v5, PostgreSQL 16) dan
  `apps/web` (React 19, Vite, TypeScript strict, Tailwind v4, shadcn primitives,
  HugeIcons).
- Package manager JS: `bun` saja.
- Konvensi starter dipertahankan: envelope `{data}` / `{data,meta}`, error
  `{error:{code,message,fields}}`, modul `internal/modules/<domain>` dengan alur
  handler -> service -> repository -> domain, migrasi SQL forward-only, auth
  Bearer opaque token.
- UI Bahasa Indonesia semi-formal dan friendly, hardcode (tanpa i18n).
- Nama file/folder/route/identifier Bahasa Inggris, kebab-case untuk web.
- Ikon hanya HugeIcons (`@hugeicons/core-free-icons` + `@hugeicons/react`).
- Admin memakai shell Plane dari starter. Halaman publik memakai layout sendiri.
- Bahasa Go: konteks diteruskan, error dikembalikan, interface kecil di sisi
  pemakai, tanpa `panic` untuk error permintaan.
- Batas ukuran: file komponen React maksimal 900 baris, method Go tetap pendek
  dan fokus.

## 5. Keputusan yang sudah ditetapkan

- Peta memakai **MapLibre GL JS**, bukan Leaflet. Leaflet tidak punya pitch dan
  bearing; kebutuhan "benar-benar miring dan bisa diputar" hanya terpenuhi oleh
  renderer WebGL dengan kamera 3D.
- Basemap memakai gaya **OpenFreeMap Liberty** (`https://tiles.openfreemap.org/styles/liberty`,
  tanpa API key). Gaya ini sudah membawa layer `building-3d` (fill-extrusion).
- Terrain memakai **AWS Terrain Tiles (Terrarium)**
  (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`)
  sebagai `raster-dem`, tanpa API key.
- Peta awal: pusat Bangkalan (-7.0455, 112.7425), zoom 11.5, pitch 60, bearing -20.
- Kamera saat marker diklik: `flyTo` ke titik dengan zoom 15.5, pitch 65,
  bearing dipertahankan, durasi/curve halus; panel detail terbuka setelah
  animasi mulai berjalan.
- Upload foto ke disk lokal `apps/api/uploads/`, disajikan API di `/uploads/*`.
  Vite memproxy `/uploads` sama seperti `/api`.
- Rating: satu nilai 0.0–5.0 diisi admin, ditampilkan dengan ikon bintang.
- Harga: mode gratis atau berbayar; berbayar punya `price_min` dan `price_max`
  (Rupiah, `price_max` boleh kosong untuk "mulai dari").
- Foto seed tidak disertakan. Galeri kosong menampilkan placeholder ikon; admin
  mengunggah foto asli.

## 6. Struktur proyek

Lokasi: `/home/abdasis/Projects/bangkalan-tourism`.

Langkah bootstrap:

1. `gh repo clone abdasis/plane-admin-starter bangkalan-tourism -- --branch feat/go-fiber-modular-api`
2. Hapus `.git` bawaan, lalu `git init` repo baru (tanpa commit otomatis).
3. Ganti branding: judul dokumen, judul login, nama aplikasi di sidebar, seed
   admin menjadi `admin@exploremadura.test` / `Admin#12345`.
4. Ganti module path Go dari `github.com/abdasis/plane-admin-starter/api`
   menjadi `github.com/abdasis/bangkalan-tourism/api` di `go.mod` dan seluruh
   import internal.
5. Hapus modul contoh Notes dari API, web, seed, dan test. Halaman admin
   pertama yang berfungsi adalah Destinasi.
6. Tambah module `destinations` di API dan halaman publik + admin di web.
7. Go lokal 1.25.6 sementara `go.mod` starter menulis 1.26.0. Biarkan
   `GOTOOLCHAIN=auto` mengunduh toolchain 1.26; bila gagal, turunkan direktif
   `go` ke 1.25.0 selama dependency tetap bisa dibangun.

## 7. Model data

Migrasi baru `apps/api/migrations/0003_destinations.sql`.

```sql
destination_categories (
  id bigint identity pk,
  slug text not null unique,          -- beach, religious, nature, culture, culinary
  name text not null,                 -- Pantai, Religi, Alam, Budaya, Kuliner
  icon text not null,                 -- nama ikon HugeIcons yang dipetakan di web
  created_at timestamptz not null default now()
)

destinations (
  id bigint identity pk,
  category_id bigint not null references destination_categories(id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  address text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  is_free boolean not null default false,
  price_min integer check (price_min is null or price_min >= 0),
  price_max integer check (price_max is null or price_max >= 0),
  opening_hours text not null default '',
  contact text not null default '',
  facilities text not null default '',
  is_published boolean not null default true,
  video_kind text check (video_kind in ('file','embed')),
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

destination_photos (
  id bigint identity pk,
  destination_id bigint not null references destinations(id) on delete cascade,
  file_path text not null,            -- contoh: destinations/<random>.jpg
  caption text not null default '',
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
)

activity_logs (
  id bigint identity pk,
  actor_user_id bigint references users(id) on delete set null,
  actor_name text not null,
  action text not null,              -- create, update, delete, upload_photo, delete_photo, set_cover
  subject_type text not null,        -- destination, destination_photo
  subject_id bigint,
  description text not null,         -- narasi Bahasa Indonesia
  created_at timestamptz not null default now()
)
```

Index: `destinations(category_id)`, `destinations(is_published, updated_at desc)`,
`destination_photos(destination_id, sort_order)`, `activity_logs(created_at desc)`.

Kategori referensi disisipkan idempoten di migrasi:

| slug | name | icon |
| --- | --- | --- |
| beach | Pantai | Beach02Icon |
| religious | Religi | Mosque01Icon |
| nature | Alam | TreesIcon |
| culture | Budaya | Castle01Icon |
| culinary | Kuliner | Restaurant01Icon |

Nama ikon diverifikasi dulu di `node_modules/@hugeicons/core-free-icons`
sebelum dipakai; jika tidak ada, pilih ikon terdekat dan perbarui tabel ini.

Aturan data:

- `is_free = true` -> `price_min` dan `price_max` wajib null.
- `is_free = false` -> `price_min` wajib >= 0; `price_max` null atau >= `price_min`.
- Slug dibuat server dari nama (huruf kecil, non-alfanumerik menjadi `-`,
  maksimal 100 karakter) dan dijaga unik. Slug tidak diedit admin.
- Satu destinasi maksimal punya satu foto `is_cover = true`. Menandai cover baru
  otomatis mencabut cover lama.
- Menghapus destinasi menghapus baris foto (cascade) dan file di disk
  (best-effort; kegagalan hapus file dicatat log, tidak menggagalkan request).

## 8. Kontrak API

Base `/api/v1`. Publik tanpa auth. Admin butuh Bearer + permission
`destination:read` / `destination:write` (dicek di backend, bukan hanya UI).

### Publik

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/public/categories` | Semua kategori |
| GET | `/public/destinations` | Semua destinasi `is_published`, maksimal 500, lengkap dengan `photos` (untuk peta + panel) |

Pencarian dan filter kategori di halaman publik dilakukan di browser atas satu
payload ini, bukan refetch ke server. Parameter `q`/`category` tidak dipakai di
endpoint publik.

Response destinasi publik:

```json
{
  "id": 1,
  "name": "Bukit Jaddih",
  "slug": "bukit-jaddih",
  "category": {"slug": "nature", "name": "Alam", "icon": "Mountain01Icon"},
  "description": "...",
  "address": "...",
  "latitude": -7.0894,
  "longitude": 112.745,
  "rating": 4.6,
  "is_free": true,
  "price_min": null,
  "price_max": null,
  "opening_hours": "07.00-17.00",
  "contact": "",
  "facilities": "Area parkir, musala, warung",
  "photos": [{"id": 3, "url": "/uploads/destinations/abc.webp", "caption": "", "is_cover": true}]
}
```

### Admin

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/destinations?page&per_page&q&category` | Daftar berpaginasi + cover + jumlah foto |
| POST | `/destinations` | Buat destinasi |
| GET | `/destinations/:id` | Detail admin lengkap dengan semua foto |
| PUT | `/destinations/:id` | Ubah destinasi |
| DELETE | `/destinations/:id` | Hapus destinasi |
| POST | `/destinations/:id/photos` | Multipart field `file`, opsional `caption` |
| DELETE | `/destinations/:id/photos/:photoId` | Hapus foto |
| PUT | `/destinations/:id/photos/:photoId/cover` | Jadikan cover |
| POST | `/destinations/:id/video` | Multipart field `file`, unggah video |
| DELETE | `/destinations/:id/video` | Hapus video |

Body create/update:

```json
{
  "name": "...",
  "category_id": 3,
  "description": "...",
  "address": "...",
  "latitude": -7.0894,
  "longitude": 112.745,
  "rating": 4.6,
  "is_free": true,
  "price_min": null,
  "price_max": null,
  "opening_hours": "...",
  "contact": "...",
  "facilities": "...",
  "is_published": true
}
```

Validasi (422 dengan `fields`):

- `name` wajib, maksimal 150 karakter.
- `category_id` wajib dan harus ada.
- `description` maksimal 5000, `address` maksimal 300, `facilities` maksimal 1000,
  `opening_hours` maksimal 200, `contact` maksimal 120 karakter.
- `latitude` -90..90, `longitude` -180..180.
- `rating` 0..5.
- Aturan harga seperti bagian model data.

Upload:

- Ukuran maksimal 5 MB.
- Tipe diterima: JPEG, PNG, WebP. Tipe ditentukan dari isi file
  (`http.DetectContentType`), bukan hanya ekstensi.
- Nama file acak (`crypto/rand` hex + ekstensi hasil deteksi), disimpan di
  `uploads/destinations/`. Tidak memakai nama asli dari klien.
- File disimpan apa adanya; tanpa konversi WebP dan tanpa thumbnail. Strip
  thumbnail di panel memakai file asli dengan `loading="lazy"`.
- Respons 422 bila tipe/ukuran tidak valid.

Activity log ditulis untuk create/update/delete destinasi dan setiap perubahan
foto, dengan narasi contoh: "Menambahkan destinasi Bukit Jaddih (id: 12)." /
"Memperbarui destinasi Pantai Rongkang (id: 4), rating berubah dari 4.2 ke 4.5."

## 9. Halaman publik

Rute publik di `apps/web/src/app.tsx`, di luar `RequireAuth`:

- `/` -> `PublicMapPage` (peta penuh layar).
- Halaman admin tetap di dalam shell pada rute `/destinations`,
  `/destinations/new`, `/destinations/:id/edit` dengan `RequirePermission`.

Gaya visual halaman publik memakai **Playful UI**, bukan shell Plane: kanvas
periwinkle, ink navy, indigo untuk aksi, kuning untuk highlight, kartu putih
radius 22-28px, font Fredoka (heading/angka) + Nunito (body), tombol fisik dengan
bayangan bawah yang menekan saat ditekan. Tetap memakai primitive shadcn/ui yang
dikustom lewat token dan className lokal; gaya di-scope `.public-playful` agar
admin tidak berubah. Halaman publik tanpa dark mode.

`PublicMapPage`:

- Kontainer `fixed inset-0` (peta memenuhi viewport, tanpa sidebar).
- Overlay kiri atas: nama "Explore Madura", pencarian, chip filter kategori.
- Overlay kanan atas: tombol reset kamera ke tampilan awal. Tidak ada tombol
  tema di halaman publik; basemap tetap terang.
- Peta MapLibre: `pitch` 60, `maxPitch` 85, drag rotate aktif, terrain aktif
  (`exaggeration` 1.35), bangunan 3D sudah ada dari gaya Liberty.
- Marker HTML custom per destinasi: pin berikon HugeIcons sesuai kategori,
  ukuran ~36px, warna mengikuti kategori, `aria-label` berisi nama destinasi,
  fokus keyboard, Enter/Space memicu aksi klik.
- Marker aktif mendapat state visual berbeda.
- Klik marker -> `flyTo` seperti bagian 5 -> panel detail terbuka.
- Panel detail desktop: kartu di sisi kanan, lebar ~420px, bisa ditutup.
  Mobile: bottom sheet setinggi maksimal ~70vh, bisa ditutup.
- Isi panel: nama, kategori, rating bintang, harga terformat Rupiah, alamat,
  jam buka, kontak, fasilitas, deskripsi, dan galeri (foto utama + strip
  thumbnail; klik thumbnail mengganti foto utama).
- Galeri kosong: kartu placeholder ikon, teks "Belum ada foto".
- Klik marker dengan video: setelah `flyTo` selesai (`moveend`), overlay video
  masuk dengan transisi opacity + scale 240ms ease-out. Overlay menutup peta
  dengan scrim navy, berisi video (file atau iframe embed), judul, chip
  kategori, dan tombol tutup 44px. Escape/tombol tutup mengembalikan peta dengan
  transisi keluar 180ms. Hormati `prefers-reduced-motion`. Destinasi tanpa video
  tetap memakai panel detail biasa.
- Tutup panel dengan tombol, Escape, atau klik peta.
- Pencarian dan filter kategori menyaring marker di peta (tidak ada panel
  daftar hasil terpisah). Saat filter tidak menghasilkan apa pun, tampilkan
  overlay "Destinasi tidak ditemukan" dengan tombol reset.
- Loading: skeleton overlay ringan di atas peta. Error: kartu "Gagal memuat
  destinasi" + tombol coba lagi.
- Tautan kecil ke `/login` untuk admin.

Data publik diambil sekali lewat `api.get` (GET tanpa token tidak mengirim
header Authorization karena token tidak ada). Pencarian dan filter bekerja di
memori atas hasil itu. Tidak memakai React Query; cukup hook
`use-public-destinations.ts`.

## 9b. Header publik dan blog fakta unik Madura

Header publik modern tampil di semua halaman publik (`/`, `/blog`,
`/blog/:slug`): bar putih 64px dengan border bawah halus, brand "Explore
Madura" (mark + teks Fredoka), tautan Peta dan Blog, status aktif indigo, dan
menu ringkas di mobile. Di halaman peta header menjadi overlay di atas kanvas;
toolbar pencarian bergeser ke bawah header.

Blog berisi artikel fakta unik Madura yang dikelola admin:

- Tabel `blog_posts`: `title`, `slug` unik, `excerpt`, `content`, `tag`,
  `cover_path`, `is_published`, `published_at`, `created_at`, `updated_at`.
- Route publik: `GET /public/posts` (hanya terbit, urut `published_at` terbaru)
  dan `GET /public/posts/:slug`.
- Halaman `/blog`: grid kartu artikel (cover/placeholder playful, tag, judul,
  ringkasan, tanggal, estimasi baca) + state loading/empty/error.
- Halaman `/blog/:slug`: artikel dengan cover 16:9, judul, meta, dan isi
  paragraf; tombol kembali ke blog.
- Admin: DataTable `/posts`, form halaman terpisah untuk judul, tag, ringkasan,
  isi, cover, dan status terbit. Permission `blog:read` / `blog:write`.
- Upload cover memakai alur file yang sama, disimpan di `uploads/blog/`,
  maksimal 5 MB (JPEG/PNG/WebP).
- Seed berisi artikel fakta unik Madura (Karapan Sapi, Sate Madura, Suramadu,
  tradisi Rokat Tase', clurit) tanpa gambar.

## 10. Halaman admin

- Nav sidebar: "Destinasi" (ikon lokasi), permission `destination:read`.
- `/destinations`: DataTable server-side dari starter, kolom nama, kategori,
  rating, harga, status terbit, jumlah foto, aksi ubah/hapus. Pencarian dan
  filter kategori memakai query server.
- Tombol "Tambah destinasi" dan aksi baris memakai permission
  `destination:write`.
- Form destinasi memakai **halaman terpisah** (`new` / `edit`), bukan dialog,
  karena lebih dari 5 field. Layout dua kolom: informasi utama dan pengaturan
  publikasi/harga.
- Field: nama, kategori, deskripsi, alamat, latitude, longitude, rating, mode
  harga (gratis/berbayar), harga minimum, harga maksimum, jam buka, kontak,
  fasilitas, status terbit.
- Pemilih lokasi: input latitude/longitude manual plus tombol "Pilih di peta"
  yang membuka peta kecil; klik peta mengisi koordinat. Peta kecil memakai
  MapLibre yang sama.
- Galeri di halaman edit: daftar foto, unggah banyak file, hapus foto, jadikan
  cover. Foto cover ditandai jelas. Setelah unggah/hapus, daftar dimuat ulang.
- Hapus destinasi memakai dialog konfirmasi.
- Semua state form di komponen halaman; hook data terpisah
  (`use-destinations.ts`, `use-destination.ts`).

## 11. Seed

`cmd/seed` idempoten:

- Admin `admin@exploremadura.test` / `Admin#12345`, permission
  `destination:read`, `destination:write`.
- Kategori referensi bila belum ada.
- Destinasi contoh (koordinat perkiraan, admin bisa koreksi), tanpa foto:

| Nama | Kategori | Perkiraan koordinat |
| --- | --- | --- |
| Bukit Jaddih | nature | -7.0894, 112.7450 |
| Pantai Rongkang | beach | -6.8930, 112.9350 |
| Pantai Siring Kemuning | beach | -6.8870, 112.9510 |
| Pantai Banyu Biru | beach | -7.1000, 112.8500 |
| Bukit Geger | nature | -7.1300, 112.9800 |
| Masjid Agung Bangkalan | religious | -7.0290, 112.7420 |
| Makam Syaikhona Kholil | religious | -7.0400, 112.7300 |
| Keraton Bangkalan | culture | -7.0340, 112.7370 |

Rating dan harga seed adalah contoh realistis dan boleh diubah admin. Deskripsi
seed ditulis dalam Bahasa Indonesia, ringkas, faktual, tanpa klaim yang tidak
bisa diverifikasi.

## 12. Konfigurasi

Port lokal disesuaikan karena 5433, 8080, 8090, dan 5173 sudah dipakai proyek
lain di mesin ini:

| Bagian | Port |
| --- | --- |
| PostgreSQL | 5439 |
| API | 8091 |
| Web (Vite) | 5180 |

Tambahan environment API (default aman untuk lokal):

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `8091` | Port API, ubah dari 8080 |
| `DATABASE_URL` | `postgres://starter:starter@localhost:5439/starter?sslmode=disable` | DSN pgx |
| `UPLOAD_DIR` | `./uploads` | Direktori penyimpanan foto dan video |
| `MAX_UPLOAD_MB` | `5` | Batas ukuran satu foto |
| `MAX_VIDEO_MB` | `50` | Batas ukuran satu video |

`.env.example` diperbarui. `docker-compose.yml` diubah agar PostgreSQL memakai
port 5439 (nama container diberi awalan `bangkalan-tourism`), database tetap
`starter`.

Vite: `server.port` 5180 dengan `strictPort: true`, proxy `/api` dan `/uploads`
ke `http://localhost:8091`.

## 13. Verifikasi

- `cd apps/api && go test ./...` (unit service + kontrak HTTP + integrasi
  migrasi bila `DATABASE_URL_TEST` diisi).
- `cd apps/web && bun run typecheck`.
- `cd apps/web && bun run build`.
- Uji manual: buka peta, klik beberapa marker, pastikan kamera miring/turun,
  panel tampil, galeri kosong tampil benar, filter dan pencarian bekerja.
- Uji admin: login, tambah destinasi, unggah dua foto, jadikan cover, ubah
  rating/harga, hapus destinasi.
- Server dijalankan setelah implementasi selesai (docker compose, API, seed,
  web dev) agar pengguna bisa melihat UI.
- Deployment produksi di luar cakupan; yang diverifikasi adalah demo lokal.

## 14. Yang diserahkan ke builder

- Nama ikon HugeIcons final per kategori (verifikasi ketersediaan).
- Detail visual pin marker, panel, dan bottom sheet selama mengikuti token
  starter (border halus, radius, warna kategori).
- Pemecahan file React/Go selama batas ukuran dan konvensi starter dipatuhi.
- Penanganan kasus tepi upload (file rusak, direktori tidak ada).
- Cara menampilkan activity log (boleh hanya tersimpan di DB, tanpa UI).

## 15. Risiko

- OpenFreeMap dan AWS Terrain Tiles adalah layanan publik gratis; bila tidak
  tersedia, peta dasar/terrain gagal dimuat. Sediakan fallback: peta tetap
  tampil dengan raster OSM tanpa terrain, dan tampilkan pesan ringan.
- WebGL2 dibutuhkan MapLibre. Browser tanpa WebGL2 menampilkan pesan yang jelas,
  bukan layar kosong.
- Bangkalan relatif datar, jadi relief terrain halus. Efek 3D terutama terlihat
  dari bangunan dan kemiringan kamera.
- Foto seed tidak ada, sehingga tampilan awal hanya placeholder sampai admin
  mengunggah foto.
