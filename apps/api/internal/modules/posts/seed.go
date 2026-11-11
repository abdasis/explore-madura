package posts

import (
	"context"
	"time"
)

// seedPosts adalah artikel fakta unik Madura yang ditanam saat seed. Semua
// artikel terbit dan memakai tanggal terbit yang masuk akal.
var seedPosts = []Post{
	{
		Title:       "Karapan Sapi, Balapan Tradisi dari Tanah Madura",
		Slug:        "karapan-sapi",
		Excerpt:     "Karapan sapi bukan sekadar balapan. Tradisi turun-temurun ini menyatukan warga Madura dalam kerja bersama merawat sapi, kaleles, dan lintasan tempat adu cepat berlangsung.",
		Tag:         "Budaya",
		PublishedAt: timePtr(2026, time.October, 14),
		Content: `Karapan sapi adalah balapan tradisional khas Madura yang mempertemukan sepasang sapi jantan penarik kaleles, kereta kayu kecil tempat joki berdiri. Tradisi ini tumbuh dari kehidupan agraris warga dan diwariskan dari generasi ke generasi.

Sebelum bertanding, sapi dirawat dengan pakan dan jamu serta dilatih berlari di sawah atau lapangan. Perawatan bisa berlangsung berbulan-bulan, dan pemilik biasanya melibatkan tetangga serta keluarga.

Di lintasan, dua pasang sapi berlari berdampingan. Joki berdiri di atas kaleles sambil mengendalikan sapi dengan tali; keseimbangan dan keberanian joki ikut menentukan hasil.

Karapan biasanya digelar pada musim tertentu dan dirangkai dengan keramaian pasar, musik, serta warung warga. Ada juga karapan yang khusus menampilkan sapi muda sebagai ajang latihan.

Bagi warga Madura, karapan bukan hanya soal menang. Tradisi ini menjadi ruang gotong royong, kebanggaan kampung, dan bagian dari identitas budaya yang dijaga bersama.`,
	},
	{
		Title:       "Sate Madura dan Rahasia Bumbu Kacangnya",
		Slug:        "sate-madura-bumbu-kacang",
		Excerpt:     "Sate Madura dikenal lewat potongan daging yang kecil, bumbu kacang yang pekat, dan aroma pembakaran arang. Kuliner ini sudah menjadi bagian dari keseharian warga Bangkalan.",
		Tag:         "Kuliner",
		PublishedAt: timePtr(2026, time.October, 21),
		Content: `Sate Madura dikenal dari potongan daging ayam atau kambing berukuran kecil yang ditusuk bambu, lalu dibakar di atas arang sambil diolesi bumbu.

Bumbu kacang menjadi ciri utamanya: kacang tanah yang digoreng dan dihaluskan, dicampur bawang, cabai, gula jawa, dan sedikit kecap manis. Rasanya gurih, manis, dan pedas secukupnya.

Sebelum dibakar, daging dibumbui dan didiamkan supaya meresap. Saat dibakar, sate dibolak-balik dan diolesi kecap serta bumbu agar tidak kering.

Sate disajikan dengan lontong atau nasi, irisan bawang merah, acar, dan terkadang sambal kecap. Penjual sate Madura bisa ditemukan di warung maupun gerobak keliling.

Setiap penjual punya racikan sendiri. Perbedaan kecil pada takaran kacang, gula, dan cabai membuat rasa satu warung berbeda dari warung lain, dan itulah yang membuat sate Madura tetap dicari.`,
	},
	{
		Title:       "Jembatan Suramadu, Penghubung Jawa dan Madura",
		Slug:        "jembatan-suramadu",
		Excerpt:     "Jembatan Suramadu membentang di atas Selat Madura dan menghubungkan Surabaya dengan Bangkalan. Jembatan ini menjadi penanda penting konektivitas Pulau Madura dengan Jawa.",
		Tag:         "Destinasi",
		PublishedAt: timePtr(2026, time.October, 28),
		Content: `Jembatan Nasional Suramadu membentang di atas Selat Madura dan menghubungkan Surabaya dengan Bangkalan. Jembatan ini menjadi salah satu jalur utama yang menyatukan Pulau Madura dengan Pulau Jawa.

Jembatan diresmikan pada 10 Juni 2009. Bentangannya dikenal sebagai jembatan terpanjang di Indonesia, dengan bagian tengah berupa jembatan cable-stayed yang ditopang kabel dari menara.

Panjang keseluruhan jembatan sekitar 5,4 kilometer. Di atasnya terdapat jalan tol yang dipakai kendaraan pribadi maupun angkutan barang.

Sebelum Suramadu ada, perjalanan menyeberang Selat Madura bergantung pada kapal feri. Kehadiran jembatan mempersingkat waktu tempuh dan mengubah pola perjalanan warga di kedua sisi.

Pengendara tidak diperbolehkan berhenti di bahu jalan. Meski begitu, pemandangan laut dari atas jembatan tetap menjadi bagian yang paling diingat banyak orang saat melintas.`,
	},
	{
		Title:       "Rokat Tase', Syukuran Nelayan Pesisir Madura",
		Slug:        "tradisi-rokat-tase",
		Excerpt:     "Rokat Tase' adalah tradisi syukuran nelayan Madura atas hasil laut yang melimpah. Perahu dihias, doa dipanjatkan, dan warga berbagi makanan di tepi pantai.",
		Tag:         "Budaya",
		PublishedAt: timePtr(2026, time.November, 3),
		Content: `Rokat Tase' adalah tradisi syukuran masyarakat nelayan di pesisir Madura, termasuk di Bangkalan. Kata rokat merujuk pada selamatan, sedangkan tase' berarti laut.

Tradisi ini digelar sebagai ungkapan syukur atas hasil laut dan permohonan keselamatan bagi nelayan yang melaut. Warga berkumpul di tepi pantai atau di sekitar perahu.

Perahu sering dihias, dan warga membawa ambeng berisi hasil bumi serta makanan untuk didoakan bersama. Di beberapa desa, sesaji dilarung ke laut dengan perahu.

Prosesi dipimpin tokoh agama dan tokoh adat setempat. Setelah doa, makanan dibagikan dan warga makan bersama sebagai lambang kebersamaan.

Tata cara Rokat Tase' tidak persis sama di setiap desa, tetapi maknanya tetap serupa: rasa syukur, keselamatan, dan hubungan yang erat antara warga dengan laut yang menghidupi mereka.`,
	},
	{
		Title:       "Clurit, Bilah Melengkung Khas Madura",
		Slug:        "clurit-madura",
		Excerpt:     "Clurit adalah bilah melengkung khas Madura yang akrab dengan kehidupan petani. Bentuknya sederhana, tetapi menyimpan keterampilan tempa dan makna budaya.",
		Tag:         "Budaya",
		PublishedAt: timePtr(2026, time.November, 8),
		Content: `Clurit adalah bilah tajam tradisional Madura yang bentuknya melengkung seperti sabit dengan gagang pendek. Bentuk itu membuatnya mudah diayun untuk menebas.

Dalam kehidupan sehari-hari, clurit dikenal sebagai alat pertanian. Petani memakainya untuk memangkas rumput, membersihkan lahan, atau memanen hasil kebun.

Clurit dibuat oleh pandai besi melalui penempaan. Besi dipanaskan, ditempa berulang kali, lalu dibentuk dan diasah hingga melengkung tajam; gagangnya biasa dibuat dari kayu.

Clurit juga muncul dalam sejarah dan cerita rakyat Madura sebagai benda yang lekat dengan kehidupan warga. Karena itu, clurit sering dipandang sebagai bagian dari identitas budaya, bukan sekadar alat kerja.

Hingga kini clurit masih dibuat oleh pengrajin dan dipakai di beberapa daerah. Keberadaannya mengingatkan pada keterampilan tempa dan pengetahuan lokal yang diwariskan turun-temurun.`,
	},
}

// EnsureSeed menyisipkan artikel contoh secara idempoten berdasarkan slug.
func EnsureSeed(ctx context.Context, repo *Repository) error {
	for _, post := range seedPosts {
		post.IsPublished = true
		if err := repo.SeedPost(ctx, post); err != nil {
			return err
		}
	}
	return nil
}

func timePtr(year int, month time.Month, day int) *time.Time {
	value := time.Date(year, month, day, 9, 0, 0, 0, time.UTC)
	return &value
}
