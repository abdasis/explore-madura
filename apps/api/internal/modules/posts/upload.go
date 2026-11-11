package posts

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

const (
	sniffBytes         = 512
	defaultMaxUploadMB = 5
	coverSubdir        = "blog"
)

// allowedImageTypes memetakan tipe hasil deteksi isi file ke ekstensi simpanan.
var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// uploader menyimpan cover artikel ke disk lokal.
type uploader struct {
	dir      string
	maxBytes int64
}

func newUploader(dir string, maxUploadMB int) *uploader {
	if maxUploadMB <= 0 {
		maxUploadMB = defaultMaxUploadMB
	}
	return &uploader{dir: dir, maxBytes: int64(maxUploadMB) << 20}
}

// saveCover menyimpan gambar ke blog/<hex>.<ext>.
func (u *uploader) saveCover(header *multipart.FileHeader) (string, error) {
	if header.Size > u.maxBytes {
		return "", tooLarge(u.maxBytes)
	}

	source, err := header.Open()
	if err != nil {
		return "", shared.Validation(map[string]string{"file": "File tidak bisa dibaca."})
	}
	defer source.Close()

	head := make([]byte, sniffBytes)
	read, err := io.ReadFull(source, head)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return "", fmt.Errorf("read upload head: %w", err)
	}
	head = head[:read]

	contentType := http.DetectContentType(head)
	extension, ok := allowedImageTypes[contentType]
	if !ok {
		return "", shared.Validation(map[string]string{
			"file": "File harus berupa gambar JPEG, PNG, atau WebP.",
		})
	}

	name, err := randomName()
	if err != nil {
		return "", err
	}
	relativePath := path.Join(coverSubdir, name+extension)
	fullPath := filepath.Join(u.dir, filepath.FromSlash(relativePath))

	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return "", fmt.Errorf("create upload directory: %w", err)
	}

	target, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("create upload file: %w", err)
	}

	written, copyErr := writeFile(target, head, source, u.maxBytes)
	closeErr := target.Close()
	if copyErr != nil {
		u.remove(relativePath)
		return "", copyErr
	}
	if closeErr != nil {
		u.remove(relativePath)
		return "", fmt.Errorf("close upload file: %w", closeErr)
	}
	if written > u.maxBytes {
		u.remove(relativePath)
		return "", tooLarge(u.maxBytes)
	}

	return relativePath, nil
}

func writeFile(target io.Writer, head []byte, source io.Reader, maxBytes int64) (int64, error) {
	headSize, err := target.Write(head)
	if err != nil {
		return 0, fmt.Errorf("write upload head: %w", err)
	}

	written, err := io.Copy(target, io.LimitReader(source, maxBytes+1-int64(headSize)))
	if err != nil {
		return 0, fmt.Errorf("write upload body: %w", err)
	}
	return int64(headSize) + written, nil
}

// remove menghapus file upload berdasarkan path relatif (best-effort).
func (u *uploader) remove(relativePath string) {
	if relativePath == "" {
		return
	}
	_ = os.Remove(filepath.Join(u.dir, filepath.FromSlash(relativePath)))
}

func tooLarge(maxBytes int64) *shared.AppError {
	return shared.Validation(map[string]string{
		"file": fmt.Sprintf("Ukuran file maksimal %d MB.", maxBytes>>20),
	})
}

func randomName() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate upload name: %w", err)
	}
	return hex.EncodeToString(buf), nil
}
