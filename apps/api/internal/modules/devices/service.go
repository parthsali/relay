package devices

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"

	"github.com/parthsali/relay/apps/api/internal/hub"
	"github.com/parthsali/relay/apps/api/internal/store"
)

// Service handles device registration and management.
type Service struct {
	queries *store.Queries
	hub     *hub.Hub
}

func NewService(queries *store.Queries, h *hub.Hub) *Service {
	return &Service{queries: queries, hub: h}
}

// RegisterResult holds the plain secret shown once on registration.
type RegisterResult struct {
	Device      store.Device `json:"device"`
	PlainSecret string       `json:"secret"` // shown once — not stored
}

// Register creates a new device for the user. Returns the device + one-time plain secret.
func (s *Service) Register(ctx context.Context, userID, name string) (*RegisterResult, error) {
	plain, err := generateSecret()
	if err != nil {
		return nil, fmt.Errorf("generate secret: %w", err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash secret: %w", err)
	}
	device, err := s.queries.CreateDevice(ctx, store.CreateDeviceParams{
		UserID:     userID,
		Name:       name,
		SecretHash: string(hash),
	})
	if err != nil {
		return nil, fmt.Errorf("create device: %w", err)
	}
	return &RegisterResult{Device: device, PlainSecret: plain}, nil
}

// List returns all devices owned by userID, augmenting each with online status from hub.
func (s *Service) List(ctx context.Context, userID string) ([]DeviceWithStatus, error) {
	devices, err := s.queries.GetDevicesByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]DeviceWithStatus, len(devices))
	for i, d := range devices {
		out[i] = DeviceWithStatus{
			Device:   d,
			IsOnline: s.hub.DeviceOnline(d.ID),
		}
	}
	return out, nil
}

// Delete removes a device owned by the user.
func (s *Service) Delete(ctx context.Context, userID, deviceID string) error {
	return s.queries.DeleteDevice(ctx, store.DeleteDeviceParams{
		ID:     deviceID,
		UserID: userID,
	})
}

// GetState returns the latest telemetry state for a device.
func (s *Service) GetState(ctx context.Context, deviceID string) (store.DeviceState, error) {
	return s.queries.GetDeviceState(ctx, deviceID)
}

// DeviceWithStatus combines a device record with its live online status.
type DeviceWithStatus struct {
	store.Device
	IsOnline bool `json:"is_online"`
}

// generateSecret returns a 32-byte hex-encoded random string.
func generateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
