package automations

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

func (s *Service) List(ctx context.Context, userID string) ([]store.Automation, error) {
	rows, err := s.queries.GetAutomationsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list automations: %w", err)
	}
	return rows, nil
}

func (s *Service) Create(ctx context.Context, userID, name, triggerType string, triggerValue *string, actionType, actionValue string) (store.Automation, error) {
	return s.queries.CreateAutomation(ctx, store.CreateAutomationParams{
		UserID:       userID,
		Name:         name,
		TriggerType:  triggerType,
		TriggerValue: triggerValue,
		ActionType:   actionType,
		ActionValue:  actionValue,
		Active:       true,
	})
}

func (s *Service) SetActive(ctx context.Context, id, userID string, active bool) error {
	return s.queries.UpdateAutomationActive(ctx, store.UpdateAutomationActiveParams{
		ID:     id,
		UserID: userID,
		Active: active,
	})
}

func (s *Service) Delete(ctx context.Context, id, userID string) error {
	return s.queries.DeleteAutomation(ctx, store.DeleteAutomationParams{
		ID:     id,
		UserID: userID,
	})
}
