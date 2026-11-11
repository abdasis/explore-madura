package posts

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"

	"github.com/abdasis/explore-madura/api/internal/modules/auth"
	"github.com/abdasis/explore-madura/api/internal/shared"
)

// Handler menangani endpoint artikel publik dan admin.
type Handler struct {
	svc     *Service
	uploads *uploader
}

// NewHandler merakit handler artikel.
func NewHandler(svc *Service, uploads *uploader) *Handler {
	return &Handler{svc: svc, uploads: uploads}
}

// PublicList mengembalikan artikel terbit tanpa isi.
func (h *Handler) PublicList(c fiber.Ctx) error {
	list, err := h.svc.PublicList(c.Context())
	if err != nil {
		return serviceError(err)
	}
	return shared.Data(c, toPublicListResponses(list))
}

// PublicGet mengembalikan detail artikel terbit beserta isinya.
func (h *Handler) PublicGet(c fiber.Ctx) error {
	post, err := h.svc.PublicBySlug(c.Context(), c.Params("slug"))
	if err != nil {
		return serviceError(err)
	}
	return shared.Data(c, toPublicDetailResponse(post))
}

// List mengembalikan artikel berpaginasi untuk admin.
func (h *Handler) List(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))

	list, meta, err := h.svc.List(c.Context(), page, perPage, c.Query("q"))
	if err != nil {
		return serviceError(err)
	}
	return shared.DataWithMeta(c, toPostResponses(list), meta)
}

// Get mengembalikan detail artikel.
func (h *Handler) Get(c fiber.Ctx) error {
	id, err := postID(c)
	if err != nil {
		return err
	}

	post, err := h.svc.Get(c.Context(), id)
	if err != nil {
		return serviceError(err)
	}
	return shared.Data(c, toPostResponse(post))
}

// Create menambah artikel baru.
func (h *Handler) Create(c fiber.Ctx) error {
	var req postRequest
	if err := c.Bind().Body(&req); err != nil {
		return shared.InvalidBody()
	}

	post, err := h.svc.Create(c.Context(), req.toInput(), actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	c.Status(fiber.StatusCreated)
	return shared.Data(c, toPostResponse(post))
}

// Update mengubah artikel.
func (h *Handler) Update(c fiber.Ctx) error {
	id, err := postID(c)
	if err != nil {
		return err
	}

	var req postRequest
	if err := c.Bind().Body(&req); err != nil {
		return shared.InvalidBody()
	}

	post, err := h.svc.Update(c.Context(), id, req.toInput(), actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	return shared.Data(c, toPostResponse(post))
}

// Delete menghapus artikel beserta file cover.
func (h *Handler) Delete(c fiber.Ctx) error {
	id, err := postID(c)
	if err != nil {
		return err
	}

	path, err := h.svc.Delete(c.Context(), id, actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	h.uploads.remove(path)
	return c.SendStatus(fiber.StatusNoContent)
}

// UploadCover menyimpan file multipart lalu memasangnya sebagai cover.
func (h *Handler) UploadCover(c fiber.Ctx) error {
	id, err := postID(c)
	if err != nil {
		return err
	}

	header, err := c.FormFile("file")
	if err != nil {
		return shared.Validation(map[string]string{"file": "File wajib diunggah."})
	}

	filePath, err := h.uploads.saveCover(header)
	if err != nil {
		return err
	}

	oldPath, err := h.svc.SetCover(c.Context(), id, filePath, actorFrom(c))
	if err != nil {
		h.uploads.remove(filePath)
		return serviceError(err)
	}
	h.uploads.remove(oldPath)

	c.Status(fiber.StatusCreated)
	return shared.Data(c, coverResponse{CoverURL: coverURL(filePath)})
}

// DeleteCover menghapus cover artikel beserta file di disk.
func (h *Handler) DeleteCover(c fiber.Ctx) error {
	id, err := postID(c)
	if err != nil {
		return err
	}

	oldPath, err := h.svc.DeleteCover(c.Context(), id, actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	h.uploads.remove(oldPath)
	return c.SendStatus(fiber.StatusNoContent)
}

func postID(c fiber.Ctx) (int64, error) {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, shared.NotFound("Artikel tidak ditemukan.")
	}
	return id, nil
}

func actorFrom(c fiber.Ctx) Actor {
	user := auth.CurrentUser(c)
	return Actor{UserID: user.ID, Name: user.Name}
}

// serviceError memetakan sentinel error modul ke envelope HTTP.
func serviceError(err error) error {
	switch {
	case err == nil:
		return nil
	case errors.Is(err, ErrNotFound):
		return shared.NotFound("Artikel tidak ditemukan.")
	case errors.Is(err, ErrSlugTaken):
		return &shared.AppError{
			Status:  fiber.StatusConflict,
			Code:    "conflict",
			Message: "Judul artikel sudah dipakai. Coba judul lain.",
		}
	}
	return err
}
