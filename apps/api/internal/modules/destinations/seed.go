package destinations

import "context"

// seedCategories adalah kategori referensi tetap yang dipakai UI publik.
var seedCategories = []Category{
	{Slug: "beach", Name: "Pantai", Icon: "Beach02Icon"},
	{Slug: "religious", Name: "Religi", Icon: "Mosque01Icon"},
	{Slug: "nature", Name: "Alam", Icon: "TreesIcon"},
	{Slug: "culture", Name: "Budaya", Icon: "Castle01Icon"},
	{Slug: "culinary", Name: "Kuliner", Icon: "Restaurant01Icon"},
}

// seedDestinations adalah destinasi contoh nyata Bangkalan tanpa foto.
var seedDestinations = []Destination{
	{
		Category:     Category{Slug: "nature"},
		Name:         "Bukit Jaddih",
		Slug:         "bukit-jaddih",
		Description:  "Bekas area penambangan kapur yang kini menjadi tujuan wisata dengan tebing putih dan kolam berwarna toska.",
		Address:      "Desa Jaddih, Kecamatan Socah, Bangkalan",
		Latitude:     -7.0894,
		Longitude:    112.7450,
		Rating:       4.6,
		IsFree:       false,
		PriceMin:     intPtr(10000),
		OpeningHours: "07.00-17.00",
		Facilities:   "Area parkir, warung, pemandu lokal",
		IsPublished:  true,
	},
	{
		Category:     Category{Slug: "beach"},
		Name:         "Pantai Rongkang",
		Slug:         "pantai-rongkang",
		Description:  "Pantai berpasir putih di Kecamatan Tanjung Bumi dengan ombak yang relatif tenang dan deretan pohon di bibir pantai.",
		Address:      "Desa Rongkang, Kecamatan Tanjung Bumi, Bangkalan",
		Latitude:     -6.8930,
		Longitude:    112.9350,
		Rating:       4.5,
		IsFree:       false,
		PriceMin:     intPtr(10000),
		OpeningHours: "06.00-18.00",
		Facilities:   "Area parkir, warung makan, toilet",
		IsPublished:  true,
	},
	{
		Category:     Category{Slug: "beach"},
		Name:         "Pantai Siring Kemuning",
		Slug:         "pantai-siring-kemuning",
		Description:  "Pantai di Kecamatan Tanjung Bumi dengan pasir putih dan batu karang, sering dipakai untuk rekreasi keluarga.",
		Address:      "Desa Siring Kemuning, Kecamatan Tanjung Bumi, Bangkalan",
		Latitude:     -6.8870,
		Longitude:    112.9510,
		Rating:       4.4,
		IsFree:       true,
		OpeningHours: "06.00-18.00",
		Facilities:   "Area parkir, gazebo, warung",
		IsPublished:  true,
	},
	{
		Category:     Category{Slug: "beach"},
		Name:         "Pantai Banyu Biru",
		Slug:         "pantai-banyu-biru",
		Description:  "Pantai di pesisir Bangkalan dengan air laut jernih dan area mangrove di sekitarnya.",
		Address:      "Kecamatan Sepulu, Bangkalan",
		Latitude:     -7.1000,
		Longitude:    112.8500,
		Rating:       4.3,
		IsFree:       false,
		PriceMin:     intPtr(5000),
		PriceMax:     intPtr(10000),
		OpeningHours: "07.00-17.00",
		Facilities:   "Area parkir, warung, toilet",
		IsPublished:  true,
	},
	{
		Category:     Category{Slug: "nature"},
		Name:         "Bukit Geger",
		Slug:         "bukit-geger",
		Description:  "Perbukitan kapur di Kecamatan Geger dengan panorama pesisir Bangkalan dan jalur trekking ringan.",
		Address:      "Kecamatan Geger, Bangkalan",
		Latitude:     -7.1300,
		Longitude:    112.9800,
		Rating:       4.5,
		IsFree:       true,
		OpeningHours: "06.00-17.00",
		Facilities:   "Area parkir, jalur trekking",
		IsPublished:  true,
	},
	{
		Category:     Category{Slug: "religious"},
		Name:         "Masjid Agung Bangkalan",
		Slug:         "masjid-agung-bangkalan",
		Description:  "Masjid bersejarah di pusat Kota Bangkalan dekat alun-alun, dengan arsitektur bergaya Jawa dan Timur Tengah.",
		Address:      "Jl. Letnan Abdullah, Kecamatan Bangkalan, Bangkalan",
		Latitude:     -7.0290,
		Longitude:    112.7420,
		Rating:       4.8,
		IsFree:       true,
		OpeningHours: "24 jam",
		Facilities:   "Area parkir, tempat wudu, taman",
		IsPublished:  true,
	},
	{
		Category:     Category{Slug: "religious"},
		Name:         "Makam Syaikhona Kholil",
		Slug:         "makam-syaikhona-kholil",
		Description:  "Kompleks makam ulama Syaikhona Muhammad Kholil di Desa Martajasah, tujuan ziarah yang ramai dikunjungi.",
		Address:      "Desa Martajasah, Kecamatan Bangkalan, Bangkalan",
		Latitude:     -7.0400,
		Longitude:    112.7300,
		Rating:       4.9,
		IsFree:       true,
		OpeningHours: "06.00-21.00",
		Facilities:   "Area parkir, musala, warung",
		IsPublished:  true,
	},
	{
		Category:     Category{Slug: "culture"},
		Name:         "Keraton Bangkalan",
		Slug:         "keraton-bangkalan",
		Description:  "Keraton Bangkalan, peninggalan Kesultanan Bangkalan, dengan koleksi benda bersejarah dan arsitektur tradisional.",
		Address:      "Kecamatan Bangkalan, Bangkalan",
		Latitude:     -7.0340,
		Longitude:    112.7370,
		Rating:       4.2,
		IsFree:       false,
		PriceMin:     intPtr(5000),
		PriceMax:     intPtr(10000),
		OpeningHours: "08.00-16.00",
		Facilities:   "Area parkir, pemandu",
		IsPublished:  true,
	},
}

// EnsureSeed menyisipkan kategori dan destinasi contoh secara idempoten.
func EnsureSeed(ctx context.Context, repo *Repository) error {
	for _, category := range seedCategories {
		if err := repo.SeedCategory(ctx, category); err != nil {
			return err
		}
	}
	for _, destination := range seedDestinations {
		if err := repo.SeedDestination(ctx, destination); err != nil {
			return err
		}
	}
	return nil
}

func intPtr(value int) *int {
	return &value
}
