package auth

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/parthsali/relay/apps/api/internal/store"
)

// GoogleUserInfo is the subset of Google's /userinfo response we need.
type GoogleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

// Service handles auth business logic: find-or-create users and JWT issuance.
type Service struct {
	queries   *store.Queries
	jwtSecret string
}

func NewService(queries *store.Queries, jwtSecret string) *Service {
	return &Service{queries: queries, jwtSecret: jwtSecret}
}

// FindOrCreateUser looks up a user by Google ID, falls back to email,
// and creates a new record if neither exists.
func (s *Service) FindOrCreateUser(ctx context.Context, info *GoogleUserInfo) (store.User, error) {
	googleID := info.ID

	// 1. Try by Google ID
	user, err := s.queries.GetUserByGoogleID(ctx, &googleID)
	if err == nil {
		updated, err := s.queries.UpdateUser(ctx, store.UpdateUserParams{
			Name: info.Name, AvatarUrl: info.Picture, GoogleID: &googleID, ID: user.ID,
		})
		return updated, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return store.User{}, err
	}

	// 2. Try by email (link existing account)
	user, err = s.queries.GetUserByEmail(ctx, info.Email)
	if err == nil {
		updated, err := s.queries.UpdateUser(ctx, store.UpdateUserParams{
			Name: info.Name, AvatarUrl: info.Picture, GoogleID: &googleID, ID: user.ID,
		})
		return updated, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return store.User{}, err
	}

	// 3. Create new user
	return s.queries.CreateUser(ctx, store.CreateUserParams{
		Email:     info.Email,
		Name:      info.Name,
		AvatarUrl: info.Picture,
		GoogleID:  &googleID,
	})
}

// GenerateJWT signs a 24-hour HS256 token for the given user.
// Claims include name and avatar so the frontend can render the user without an API call.
func (s *Service) GenerateJWT(user store.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":    user.ID,
		"email":      user.Email,
		"name":       user.Name,
		"avatar_url": user.AvatarUrl,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
		"iat":        time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.jwtSecret))
}
