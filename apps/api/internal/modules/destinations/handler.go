package destinations

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"

	"github.com/abdasis/explore-madura/api/internal/modules/auth"
	"github.com/abdasis/explore-madura/api/internal/shared"
)

// Handler menangani endpoint destinasi publik dan admin.
type Handler struct {
	svc     *Service
	uploads *uploader
}

// NewHandler merakit handler destinasi.
func NewHandler(svc *Service, uploads *uploader) *Handler {
	return &Handler{svc: svc, uploads: uploads}
}

// PublicCategories mengembalikan seluruh kategori referensi.
func (h *Handler) PublicCategories(c fiber.Ctx) error {
	categories, err := h.svc.Categories(c.Context())
	if err != nil {
		return serviceError(err)
	}
	return shared.Data(c, toCategoryResponses(categories))
}

// PublicList mengembalikan semua destinasi terbit beserta foto.
func (h *Handler) PublicList(c fiber.Ctx) error {
	list, err := h.svc.PublicList(c.Context())
	if err != nil {
		return serviceError(err)
	}

	responses := make([]destinationResponse, 0, len(list))
	for _, destination := range list {
		responses = append(responses, toDestinationResponse(destination))
	}
	return shared.Data(c, responses)
}

// List mengembalikan destinasi berpaginasi untuk admin.
func (h *Handler) List(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))

	list, meta, err := h.svc.List(c.Context(), page, perPage, c.Query("q"), c.Query("category"))
	if err != nil {
		return serviceError(err)
	}
	return shared.DataWithMeta(c, toListResponses(list), meta)
}

// Get mengembalikan detail destinasi.
func (h *Handler) Get(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}

	destination, err := h.svc.Get(c.Context(), id)
	if err != nil {
		return serviceError(err)
	}
	return shared.Data(c, toDestinationResponse(destination))
}

// Create menambah destinasi baru.
func (h *Handler) Create(c fiber.Ctx) error {
	var req destinationRequest
	if err := c.Bind().Body(&req); err != nil {
		return shared.InvalidBody()
	}

	destination, err := h.svc.Create(c.Context(), req.toInput(), actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	c.Status(fiber.StatusCreated)
	return shared.Data(c, toDestinationResponse(destination))
}

// Update mengubah destinasi.
func (h *Handler) Update(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}

	var req destinationRequest
	if err := c.Bind().Body(&req); err != nil {
		return shared.InvalidBody()
	}

	destination, err := h.svc.Update(c.Context(), id, req.toInput(), actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	return shared.Data(c, toDestinationResponse(destination))
}

// Delete menghapus destinasi beserta file fotonya.
func (h *Handler) Delete(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}

	paths, err := h.svc.Delete(c.Context(), id, actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	for _, path := range paths {
		h.uploads.remove(path)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// UploadPhoto menyimpan file multipart lalu menautkannya ke destinasi.
func (h *Handler) UploadPhoto(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}

	header, err := c.FormFile("file")
	if err != nil {
		return shared.Validation(map[string]string{"file": "File wajib diunggah."})
	}

	filePath, err := h.uploads.savePhoto(header)
	if err != nil {
		return err
	}

	photo, err := h.svc.AddPhoto(c.Context(), id, filePath, c.FormValue("caption"), actorFrom(c))
	if err != nil {
		h.uploads.remove(filePath)
		return serviceError(err)
	}
	c.Status(fiber.StatusCreated)
	return shared.Data(c, toPhotoResponse(photo))
}

// DeletePhoto menghapus foto destinasi dan file di disk.
func (h *Handler) DeletePhoto(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}
	photoID, err := photoID(c)
	if err != nil {
		return err
	}

	filePath, err := h.svc.DeletePhoto(c.Context(), id, photoID, actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	h.uploads.remove(filePath)
	return c.SendStatus(fiber.StatusNoContent)
}

// SetCover menjadikan satu foto sebagai cover destinasi.
func (h *Handler) SetCover(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}
	photoID, err := photoID(c)
	if err != nil {
		return err
	}

	if err := h.svc.SetCover(c.Context(), id, photoID, actorFrom(c)); err != nil {
		return serviceError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// UploadVideo menyimpan file video multipart lalu menyimpannya ke destinasi.
func (h *Handler) UploadVideo(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}

	header, err := c.FormFile("file")
	if err != nil {
		return shared.Validation(map[string]string{"file": "File wajib diunggah."})
	}

	filePath, err := h.uploads.saveVideo(header)
	if err != nil {
		return err
	}

	video := Video{Kind: VideoKindFile, URL: filePath}
	oldPath, err := h.svc.SetVideo(c.Context(), id, &video, actorFrom(c))
	if err != nil {
		h.uploads.remove(filePath)
		return serviceError(err)
	}
	h.uploads.remove(oldPath)

	c.Status(fiber.StatusCreated)
	return shared.Data(c, toVideoResponse(&video))
}

// DeleteVideo menghapus video destinasi beserta file di disk.
func (h *Handler) DeleteVideo(c fiber.Ctx) error {
	id, err := destinationID(c)
	if err != nil {
		return err
	}

	oldPath, err := h.svc.SetVideo(c.Context(), id, nil, actorFrom(c))
	if err != nil {
		return serviceError(err)
	}
	h.uploads.remove(oldPath)
	return c.SendStatus(fiber.StatusNoContent)
}

func destinationID(c fiber.Ctx) (int64, error) {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, shared.NotFound("Destinasi tidak ditemukan.")
	}
	return id, nil
}

func photoID(c fiber.Ctx) (int64, error) {
	id, err := strconv.ParseInt(c.Params("photoId"), 10, 64)
	if err != nil || id <= 0 {
		return 0, shared.NotFound("Foto tidak ditemukan.")
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
		return shared.NotFound("Destinasi tidak ditemukan.")
	case errors.Is(err, ErrPhotoNotFound):
		return shared.NotFound("Foto tidak ditemukan.")
	case errors.Is(err, ErrCategoryNotFound):
		return shared.Validation(map[string]string{"category_id": "Kategori tidak ditemukan."})
	case errors.Is(err, ErrSlugTaken):
		return &shared.AppError{
			Status:  fiber.StatusConflict,
			Code:    "conflict",
			Message: "Nama destinasi sudah dipakai. Coba nama lain.",
		}
	}
	return err
}
