package devices

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/jackc/pgx/v5/pgtype"
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

// SafeDevice is a JSON-safe view of store.Device that omits secret_hash.
type SafeDevice struct {
	ID           string             `json:"id"`
	UserID       string             `json:"user_id"`
	Name         string             `json:"name"`
	AgentVersion *string            `json:"agent_version"`
	LastSeenAt   pgtype.Timestamptz `json:"last_seen_at"`
	CreatedAt    time.Time          `json:"created_at"`
}

func safeDevice(d store.Device) SafeDevice {
	return SafeDevice{
		ID:           d.ID,
		UserID:       d.UserID,
		Name:         d.Name,
		AgentVersion: d.AgentVersion,
		LastSeenAt:   d.LastSeenAt,
		CreatedAt:    d.CreatedAt,
	}
}

// RegisterResult holds the plain secret shown once on registration.
type RegisterResult struct {
	Device      SafeDevice `json:"device"`
	PlainSecret string     `json:"secret"` // shown once — not stored
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
	return &RegisterResult{Device: safeDevice(device), PlainSecret: plain}, nil
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
			SafeDevice: safeDevice(d),
			IsOnline:   s.hub.DeviceOnline(d.ID),
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

// DeviceWithStatus combines a safe device view with its live online status.
type DeviceWithStatus struct {
	SafeDevice
	IsOnline bool `json:"is_online"`
}

// SendCommand forwards a typed command to the device agent with the appropriate payload.
func (s *Service) SendCommand(deviceID, msgType, mode string, brightness *int, version, url, sha256 string) error {
	var data any
	switch msgType {
	case hub.TypeAgentRestart:
		// no payload needed
	case hub.TypeAgentUpdate:
		if url == "" || sha256 == "" {
			return fmt.Errorf("url and sha256 are required for agent.update")
		}
		data = hub.AgentUpdatePayload{Version: version, URL: url, SHA256: sha256}
	case hub.TypeDisplaySetMode:
		if mode == "" {
			return fmt.Errorf("mode is required for display.set_mode")
		}
		data = hub.DisplaySetModePayload{Mode: mode}
	case hub.TypeDisplaySetBrightness:
		if brightness == nil {
			return fmt.Errorf("brightness is required for display.set_brightness")
		}
		data = hub.DisplaySetBrightnessPayload{Brightness: *brightness}
	case hub.TypeSpotifySync:
		// sync payload is built from stored tokens by the caller; send empty trigger
	default:
		return fmt.Errorf("unknown command type: %s", msgType)
	}
	s.hub.SendToDevice(deviceID, hub.Msg{Type: msgType, Data: data})
	return nil
}

// generateSecret returns a 32-byte hex-encoded random string.
func generateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
