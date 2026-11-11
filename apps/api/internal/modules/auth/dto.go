package auth

// LoginRequest adalah body POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// UserResponse adalah representasi user yang dikirim ke klien.
type UserResponse struct {
	ID          int64    `json:"id"`
	Name        string   `json:"name"`
	Email       string   `json:"email"`
	Permissions []string `json:"permissions"`
}

// LoginResponse adalah payload sukses login.
type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// MeResponse adalah payload GET /auth/me.
type MeResponse struct {
	User UserResponse `json:"user"`
}

func toUserResponse(user User) UserResponse {
	permissions := user.Permissions
	if permissions == nil {
		permissions = []string{}
	}
	return UserResponse{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		Permissions: permissions,
	}
}
