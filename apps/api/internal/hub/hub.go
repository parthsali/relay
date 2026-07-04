// Package hub manages in-memory WebSocket connections.
// One web dashboard connection is tracked alongside N device (Pi) connections.
// All fields are protected by a mutex. Writes are serialised through per-Conn
// buffered send channels so goroutines never write to the same ws.Conn concurrently.
package hub

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

// ── Message types ─────────────────────────────────────────────────────────────

type Msg struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

const (
	// Spotify (backend → web)
	TypeSpotifyNowPlaying = "spotify.now_playing"
	TypeSpotifyIdle       = "spotify.idle"
	TypeSpotifyError      = "spotify.error"

	// Device lifecycle (backend → web)
	TypeDeviceOnline     = "device.online"
	TypeDeviceOffline    = "device.offline"
	TypeDeviceTelemetry  = "device.telemetry"
	TypeDeviceNowPlaying = "device.now_playing"

	// Commands (backend → agent)
	TypeDisplaySetMode       = "display.set_mode"
	TypeDisplaySetBrightness = "display.set_brightness"
	TypeSpotifySync          = "spotify.sync"
	TypeAgentRestart         = "agent.restart"
	TypeAgentUpdate          = "agent.update"

	TypePing  = "ping"
	TypePong  = "pong"
	TypeError = "error"
)

// ── Typed payloads ────────────────────────────────────────────────────────────
// Use these structs when calling Enqueue/SendTo* so callers are not dealing
// with ad-hoc map[string]any. The JSON field names are the canonical protocol.

// ErrorPayload is carried in Msg.Data for Type == TypeError.
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// DeviceOnlinePayload is sent to web when an agent connects.
type DeviceOnlinePayload struct {
	DeviceID string `json:"device_id"`
	Name     string `json:"name"`
}

// DeviceOfflinePayload is sent to web when an agent disconnects.
type DeviceOfflinePayload struct {
	DeviceID string `json:"device_id"`
}

// TelemetryPayload is forwarded to web from agent.telemetry messages.
type TelemetryPayload struct {
	DeviceID     string  `json:"device_id"`
	AgentVersion string  `json:"agent_version,omitempty"`
	DisplayMode  string  `json:"display_mode"`
	Brightness   int32   `json:"brightness"`
	CPUPercent   float64 `json:"cpu_percent"`
	MemMB        float64 `json:"mem_mb"`
	TempC        float64 `json:"temp_c"`
	UptimeS      int64   `json:"uptime_s"`
	WiFiDBM      int32   `json:"wifi_dbm"`
	IPAddress    string  `json:"ip_address"`
}

// NowPlayingPayload is forwarded to web from agent.now_playing messages.
type NowPlayingPayload struct {
	DeviceID string          `json:"device_id"`
	Track    json.RawMessage `json:"track"`
}

// SpotifySyncPayload is sent to the agent to sync Spotify credentials.
type SpotifySyncPayload struct {
	AccessToken string `json:"access_token"`
}

// DisplaySetModePayload is sent to an agent to change its display mode.
type DisplaySetModePayload struct {
	Mode string `json:"mode"`
}

// DisplaySetBrightnessPayload is sent to an agent to change brightness.
type DisplaySetBrightnessPayload struct {
	Brightness int `json:"brightness"`
}

// ── Conn ──────────────────────────────────────────────────────────────────────

// Conn wraps a WebSocket with a buffered send channel.
// Only the writePump goroutine may call WS.WriteMessage.
type Conn struct {
	WS   *websocket.Conn
	Send chan []byte
}

func newConn(ws *websocket.Conn) *Conn {
	return &Conn{WS: ws, Send: make(chan []byte, 64)}
}

func (c *Conn) Enqueue(m Msg) {
	b, err := json.Marshal(m)
	if err != nil {
		return
	}
	select {
	case c.Send <- b:
	default: // slow consumer — drop frame
	}
}

// ── DeviceConn ────────────────────────────────────────────────────────────────

// DeviceConn pairs a Conn with its device and user identity.
type DeviceConn struct {
	*Conn
	DeviceID string
	UserID   string
}

// ── Hub ───────────────────────────────────────────────────────────────────────

type Hub struct {
	mu      sync.RWMutex
	web     *Conn
	webUID  string
	devices map[string]*DeviceConn // keyed by device_id
}

func New() *Hub { return &Hub{devices: make(map[string]*DeviceConn)} }

// ── Web client ────────────────────────────────────────────────────────────────

func (h *Hub) SetWeb(ws *websocket.Conn, userID string) *Conn {
	c := newConn(ws)
	h.mu.Lock()
	if h.web != nil {
		close(h.web.Send)
	}
	h.web = c
	h.webUID = userID
	h.mu.Unlock()
	return c
}

func (h *Hub) RemoveWeb(c *Conn) {
	h.mu.Lock()
	if h.web == c {
		h.web = nil
		h.webUID = ""
	}
	h.mu.Unlock()
}

func (h *Hub) SendToWeb(m Msg) {
	h.mu.RLock()
	c := h.web
	h.mu.RUnlock()
	if c != nil {
		c.Enqueue(m)
	}
}

func (h *Hub) WebUserID() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.webUID
}

// ── Device (Pi agent) connections ────────────────────────────────────────────

func (h *Hub) SetDevice(ws *websocket.Conn, deviceID, userID string) *DeviceConn {
	dc := &DeviceConn{Conn: newConn(ws), DeviceID: deviceID, UserID: userID}
	h.mu.Lock()
	if old, ok := h.devices[deviceID]; ok {
		close(old.Send) // evict stale connection
	}
	h.devices[deviceID] = dc
	h.mu.Unlock()
	return dc
}

func (h *Hub) RemoveDevice(dc *DeviceConn) {
	h.mu.Lock()
	if cur, ok := h.devices[dc.DeviceID]; ok && cur == dc {
		delete(h.devices, dc.DeviceID)
	}
	h.mu.Unlock()
}

// SendToDevice pushes a message to a specific device (no-op if offline).
func (h *Hub) SendToDevice(deviceID string, m Msg) {
	h.mu.RLock()
	dc := h.devices[deviceID]
	h.mu.RUnlock()
	if dc != nil {
		dc.Enqueue(m)
	}
}

// DeviceOnline reports whether a device with the given ID is connected.
func (h *Hub) DeviceOnline(deviceID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	_, ok := h.devices[deviceID]
	return ok
}

// OnlineDeviceIDs returns the IDs of all currently connected devices.
func (h *Hub) OnlineDeviceIDs() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	ids := make([]string, 0, len(h.devices))
	for id := range h.devices {
		ids = append(ids, id)
	}
	return ids
}
