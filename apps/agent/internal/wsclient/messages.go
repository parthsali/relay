// Package wsclient contains the WebSocket client and the canonical message
// protocol shared between the Pi agent and the Relay backend.
//
// Every frame is a JSON object with this envelope:
//
//	{"type": "<domain>.<action>", "data": { ... }}
//
// Error frames (sent by the backend on bad input) follow:
//
//	{"type": "error", "data": {"code": "AUTH_FAILED", "message": "..."}}
package wsclient

import "encoding/json"

// ── Envelope ─────────────────────────────────────────────────────────────────

// Msg is the canonical WebSocket envelope used in both directions.
type Msg struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// ── Message type constants ────────────────────────────────────────────────────
// These must stay in sync with hub/hub.go in the API.

const (
	// Agent → Backend
	TypeAgentTelemetry  = "agent.telemetry"
	TypeAgentNowPlaying = "agent.now_playing"
	TypePing            = "ping"

	// Backend → Agent
	TypeSpotifySync          = "spotify.sync"
	TypeDisplaySetMode       = "display.set_mode"
	TypeDisplaySetBrightness = "display.set_brightness"
	TypeAgentRestart         = "agent.restart"
	TypeAgentUpdate          = "agent.update"
	TypePong                 = "pong"
	TypeError                = "error"
)

// ── Outbound payloads (Agent → Backend) ──────────────────────────────────────

// TelemetryPayload is sent by the agent every ~30 seconds.
type TelemetryPayload struct {
	AgentVersion string  `json:"agent_version"`
	DisplayMode  string  `json:"display_mode"`
	Brightness   int     `json:"brightness"`
	CPUPercent   float64 `json:"cpu_percent"`
	MemMB        float64 `json:"mem_mb"`
	TempC        float64 `json:"temp_c"`
	UptimeS      int64   `json:"uptime_s"`
	WiFiDBM      int     `json:"wifi_dbm"`
	IPAddress    string  `json:"ip_address"`
}

// NowPlayingPayload is sent when the currently-playing Spotify track changes.
type NowPlayingPayload struct {
	IsPlaying  bool   `json:"is_playing"`
	Title      string `json:"title"`
	Artist     string `json:"artist"`
	AlbumArt   string `json:"album_art,omitempty"`
	ProgressMs int    `json:"progress_ms"`
	DurationMs int    `json:"duration_ms"`
}

// ── Inbound payloads (Backend → Agent) ───────────────────────────────────────

// SpotifySyncPayload carries a fresh Spotify access token from the backend.
type SpotifySyncPayload struct {
	AccessToken string `json:"access_token"`
}

// DisplaySetModePayload tells the agent to switch display mode.
type DisplaySetModePayload struct {
	Mode string `json:"mode"` // "clock" | "spotify" | "weather"
}

// DisplaySetBrightnessPayload tells the agent to adjust LED brightness.
type DisplaySetBrightnessPayload struct {
	Brightness int `json:"brightness"` // 0–100
}

// AgentUpdatePayload carries the URL and checksum of a new agent binary.
type AgentUpdatePayload struct {
	Version    string `json:"version"`
	URL        string `json:"url"`
	SHA256     string `json:"sha256"`
}

// ErrorPayload is received from the backend when a message is rejected.
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Encode marshals a typed payload into a Msg ready to send.
func Encode(msgType string, payload any) (Msg, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return Msg{}, err
	}
	return Msg{Type: msgType, Data: b}, nil
}

// Decode unmarshals Msg.Data into the provided pointer target.
func Decode[T any](m Msg) (T, error) {
	var v T
	err := json.Unmarshal(m.Data, &v)
	return v, err
}
