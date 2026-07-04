// Package hub manages in-memory WebSocket connections.
// At most two connections exist simultaneously: one from the web dashboard
// and one from the Pi agent. All fields are protected by a mutex.
// Writes to each connection are serialised through a buffered send channel
// so goroutines never write to the same *websocket.Conn concurrently.
package hub

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

// ── Message ───────────────────────────────────────────────────────────────────

// Msg is the canonical JSON envelope sent over every WebSocket connection.
type Msg struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

// Well-known message type constants.
const (
	TypeSpotifyNowPlaying = "spotify.now_playing"
	TypeSpotifyIdle       = "spotify.idle"
	TypeSpotifyError      = "spotify.error"
	TypePiConnected       = "pi.connected"
	TypePiDisconnected    = "pi.disconnected"
	TypePing              = "ping"
	TypePong              = "pong"
	TypeError             = "error"
)

// ── Conn ──────────────────────────────────────────────────────────────────────

// Conn wraps a single WebSocket connection with a buffered send channel.
// Only the writePump goroutine may call ws.WriteMessage — all other callers
// push bytes to Send and the pump flushes them serially.
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
	default: // drop silently if consumer is slow
	}
}

// ── Hub ───────────────────────────────────────────────────────────────────────

// Hub holds at most one web and one pi connection in memory.
type Hub struct {
	mu     sync.RWMutex
	web    *Conn
	webUID string // user_id from the web client's JWT
	pi     *Conn
}

func New() *Hub { return &Hub{} }

// SetWeb registers the web dashboard connection, replacing any previous one.
// Returns the new Conn so the caller can start pump goroutines.
func (h *Hub) SetWeb(ws *websocket.Conn, userID string) *Conn {
	c := newConn(ws)
	h.mu.Lock()
	if h.web != nil {
		close(h.web.Send) // signal old write pump to exit
	}
	h.web = c
	h.webUID = userID
	h.mu.Unlock()
	return c
}

// RemoveWeb unregisters the web connection if it matches c.
func (h *Hub) RemoveWeb(c *Conn) {
	h.mu.Lock()
	if h.web == c {
		h.web = nil
		h.webUID = ""
	}
	h.mu.Unlock()
}

// SetPi registers the Pi agent connection, replacing any previous one.
func (h *Hub) SetPi(ws *websocket.Conn) *Conn {
	c := newConn(ws)
	h.mu.Lock()
	if h.pi != nil {
		close(h.pi.Send)
	}
	h.pi = c
	h.mu.Unlock()
	return c
}

// RemovePi unregisters the Pi connection if it matches c.
func (h *Hub) RemovePi(c *Conn) {
	h.mu.Lock()
	if h.pi == c {
		h.pi = nil
	}
	h.mu.Unlock()
}

// SendToWeb pushes a message to the web client (no-op if not connected).
func (h *Hub) SendToWeb(m Msg) {
	h.mu.RLock()
	c := h.web
	h.mu.RUnlock()
	if c != nil {
		c.Enqueue(m)
	}
}

// SendToPi pushes a message to the Pi agent (no-op if not connected).
func (h *Hub) SendToPi(m Msg) {
	h.mu.RLock()
	c := h.pi
	h.mu.RUnlock()
	if c != nil {
		c.Enqueue(m)
	}
}

// WebUserID returns the user_id of the currently connected web client.
func (h *Hub) WebUserID() string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.webUID
}

// WebConnected reports whether a web dashboard connection is active.
func (h *Hub) WebConnected() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.web != nil
}

// PiConnected reports whether a Pi agent connection is active.
func (h *Hub) PiConnected() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.pi != nil
}
