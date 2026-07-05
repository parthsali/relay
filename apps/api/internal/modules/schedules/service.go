package schedules

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

func (s *Service) List(ctx context.Context, userID string) ([]store.Schedule, error) {
	rows, err := s.queries.GetSchedulesByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list schedules: %w", err)
	}
	return rows, nil
}

func (s *Service) Create(ctx context.Context, userID, name, cron, mode string) (store.Schedule, error) {
	return s.queries.CreateSchedule(ctx, store.CreateScheduleParams{
		UserID: userID,
		Name:   name,
		Cron:   cron,
		Mode:   mode,
		Active: true,
	})
}

func (s *Service) SetActive(ctx context.Context, id, userID string, active bool) error {
	return s.queries.UpdateScheduleActive(ctx, store.UpdateScheduleActiveParams{
		ID:     id,
		UserID: userID,
		Active: active,
	})
}

func (s *Service) Delete(ctx context.Context, id, userID string) error {
	return s.queries.DeleteSchedule(ctx, store.DeleteScheduleParams{
		ID:     id,
		UserID: userID,
	})
}
