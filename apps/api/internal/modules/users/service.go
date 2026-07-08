package users

import (
	"context"

	"github.com/parthsali/relay/apps/api/internal/store"
)

// Service contains business logic for the users domain.
// It delegates all DB work to the sqlc-generated store.Queries.
type Service struct {
	queries *store.Queries
}

func NewService(queries *store.Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) GetByID(ctx context.Context, id string) (store.User, error) {
	return s.queries.GetUserByID(ctx, id)
}

func (s *Service) UpdateName(ctx context.Context, id, name string) (store.User, error) {
	return s.queries.UpdateUserName(ctx, store.UpdateUserNameParams{Name: name, ID: id})
}
