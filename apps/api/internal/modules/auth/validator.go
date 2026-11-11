package auth

import (
	"net/mail"
	"strings"

	"github.com/abdasis/explore-madura/api/internal/shared"
)

// validateLogin memeriksa body login dan mengembalikan error 422 berisi field
// yang bermasalah.
func validateLogin(req LoginRequest) error {
	fields := make(map[string]string)

	email := strings.TrimSpace(req.Email)
	switch {
	case email == "":
		fields["email"] = "Email wajib diisi."
	case !validEmail(email):
		fields["email"] = "Format email tidak valid."
	}

	if req.Password == "" {
		fields["password"] = "Kata sandi wajib diisi."
	}

	if len(fields) > 0 {
		return shared.Validation(fields)
	}
	return nil
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value
}
