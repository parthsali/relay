package apikeys

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"

	"github.com/parthsali/relay/apps/api/internal/store"
)

type Service struct {
	queries *store.Queries
}

func NewService(queries *store.Queries) *Service {
	return &Service{queries: queries}
}

// SafeAPIKey omits key_hash from the response.
type SafeAPIKey struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	Name      string `json:"name"`
	KeyPrefix string `json:"key_prefix"`
	CreatedAt string `json:"created_at"`
}

// CreateResult holds the one-time plain key shown on creation.
type CreateResult struct {
	Key    SafeAPIKey `json:"key"`
	PlainKey string   `json:"plain_key"` // shown once
}

func (s *Service) List(ctx context.Context, userID string) ([]SafeAPIKey, error) {
	rows, err := s.queries.GetAPIKeysByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list api keys: %w", err)
	}
	out := make([]SafeAPIKey, len(rows))
	for i, k := range rows {
		out[i] = SafeAPIKey{
			ID:        k.ID,
			UserID:    k.UserID,
			Name:      k.Name,
			KeyPrefix: k.KeyPrefix,
			CreatedAt: k.CreatedAt.String(),
		}
	}
	return out, nil
}

func (s *Service) Create(ctx context.Context, userID, name string) (*CreateResult, error) {
	plain, err := generateKey()
	if err != nil {
		return nil, fmt.Errorf("generate key: %w", err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash key: %w", err)
	}
	prefix := "rk_" + plain[:8]
	k, err := s.queries.CreateAPIKey(ctx, store.CreateAPIKeyParams{
		UserID:    userID,
		Name:      name,
		KeyHash:   string(hash),
		KeyPrefix: prefix,
	})
	if err != nil {
		return nil, fmt.Errorf("create api key: %w", err)
	}
	return &CreateResult{
		Key: SafeAPIKey{
			ID: k.ID, UserID: k.UserID, Name: k.Name, KeyPrefix: k.KeyPrefix,
			CreatedAt: k.CreatedAt.String(),
		},
		PlainKey: plain,
	}, nil
}

func (s *Service) Delete(ctx context.Context, id, userID string) error {
	return s.queries.DeleteAPIKey(ctx, store.DeleteAPIKeyParams{ID: id, UserID: userID})
}

func generateKey() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
