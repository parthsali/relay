package queue

import (
	"context"
	"fmt"

	"github.com/parthsali/relay/apps/api/internal/store"
)

type Service struct {
	queries *store.Queries
}

func NewService(queries *store.Queries) *Service {
	return &Service{queries: queries}
}

func (s *Service) List(ctx context.Context, userID string) ([]store.QueueItem, error) {
	rows, err := s.queries.GetQueueByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list queue: %w", err)
	}
	return rows, nil
}

func (s *Service) Create(ctx context.Context, userID, title, source string, durationS *int32, position int32) (store.QueueItem, error) {
	return s.queries.CreateQueueItem(ctx, store.CreateQueueItemParams{
		UserID:    userID,
		Title:     title,
		Source:    source,
		DurationS: durationS,
		Position:  position,
	})
}

func (s *Service) Delete(ctx context.Context, id, userID string) error {
	return s.queries.DeleteQueueItem(ctx, store.DeleteQueueItemParams{
		ID:     id,
		UserID: userID,
	})
}

func (s *Service) Clear(ctx context.Context, userID string) error {
	return s.queries.ClearQueue(ctx, userID)
}
