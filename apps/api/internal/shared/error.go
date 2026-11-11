package shared

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgconn"
)

// AppError adalah error yang sudah dipetakan ke status HTTP dan envelope error.
type AppError struct {
	Status  int
	Code    string
	Message string
	Fields  map[string]string
}

// Error memenuhi kontrak error.
func (e *AppError) Error() string {
	return e.Message
}

var (
	// ErrInvalidCredentials dipakai saat email atau kata sandi tidak cocok.
	ErrInvalidCredentials = &AppError{
		Status:  fiber.StatusUnauthorized,
		Code:    "unauthorized",
		Message: "Email atau kata sandi salah.",
	}
	// ErrUnauthorized dipakai saat token sesi tidak valid atau kedaluwarsa.
	ErrUnauthorized = &AppError{
		Status:  fiber.StatusUnauthorized,
		Code:    "unauthorized",
		Message: "Sesi tidak valid atau sudah berakhir.",
	}
)

// Validation membuat error 422 dengan detail field yang bermasalah.
func Validation(fields map[string]string) *AppError {
	return &AppError{
		Status:  fiber.StatusUnprocessableEntity,
		Code:    "validation_error",
		Message: "Data yang dikirim belum valid.",
		Fields:  fields,
	}
}

// NotFound membuat error 404 untuk resource yang tidak ditemukan.
func NotFound(message string) *AppError {
	return &AppError{
		Status:  fiber.StatusNotFound,
		Code:    "not_found",
		Message: message,
	}
}

// Forbidden membuat error 403 saat user tidak punya izin untuk aksi tersebut.
func Forbidden(message string) *AppError {
	if message == "" {
		message = "Anda tidak memiliki izin untuk aksi ini."
	}
	return &AppError{
		Status:  fiber.StatusForbidden,
		Code:    "forbidden",
		Message: message,
	}
}

// InvalidBody membuat error 422 saat body tidak bisa di-bind.
func InvalidBody() *AppError {
	return &AppError{
		Status:  fiber.StatusUnprocessableEntity,
		Code:    "validation_error",
		Message: "Body permintaan tidak valid.",
	}
}

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// HandleError adalah satu-satunya mapper error ke envelope HTTP aplikasi.
func HandleError(c fiber.Ctx, err error) error {
	var appErr *AppError
	var fiberErr *fiber.Error
	var pgErr *pgconn.PgError

	switch {
	case errors.As(err, &appErr):
		return respondError(c, appErr.Status, appErr.Code, appErr.Message, appErr.Fields)
	case errors.As(err, &pgErr) && pgErr.Code == "23505":
		return respondError(c, fiber.StatusConflict, "conflict", "Data sudah ada.", nil)
	case errors.As(err, &fiberErr):
		return respondFiberError(c, fiberErr)
	}

	slog.Error("unhandled request error", "err", err, "path", c.Path())
	return respondError(c, fiber.StatusInternalServerError, "internal_error",
		"Terjadi kesalahan pada server.", nil)
}

func respondFiberError(c fiber.Ctx, err *fiber.Error) error {
	switch err.Code {
	case fiber.StatusNotFound:
		return respondError(c, err.Code, "not_found", "Endpoint tidak ditemukan.", nil)
	case fiber.StatusMethodNotAllowed:
		return respondError(c, err.Code, "method_not_allowed", "Metode tidak didukung.", nil)
	default:
		return respondError(c, err.Code, "request_error", "Permintaan tidak dapat diproses.", nil)
	}
}

func respondError(c fiber.Ctx, status int, code, message string, fields map[string]string) error {
	return c.Status(status).JSON(errorEnvelope{Error: errorBody{
		Code:    code,
		Message: message,
		Fields:  fields,
	}})
}
