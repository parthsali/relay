package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"

	"github.com/parthsali/relay/apps/api/internal/hub"
	spotifyModule "github.com/parthsali/relay/apps/api/internal/modules/spotify"
	"github.com/parthsali/relay/apps/api/internal/response"
	"github.com/parthsali/relay/apps/api/internal/store"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// incomingMsg is the envelope the agent sends to the backend.
type incomingMsg struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

// telemetryData matches what the agent sends in agent.telemetry messages.
type telemetryData struct {
	AgentVersion string  `json:"agent_version"`
	DisplayMode  string  `json:"display_mode"`
	Brightness   int32   `json:"brightness"`
	CPUPercent   float64 `json:"cpu_percent"`
	MemMB        float64 `json:"mem_mb"`
	TempC        float64 `json:"temp_c"`
	UptimeS      int64   `json:"uptime_s"`
	WiFiDBM      int32   `json:"wifi_dbm"`
	IPAddress    string  `json:"ip_address"`
}

// Handler manages WebSocket upgrades and connection lifecycle.
type Handler struct {
	hub            *hub.Hub
	queries        *store.Queries
	jwtSecret      string
	spotifyService *spotifyModule.Service
}

func NewHandler(h *hub.Hub, queries *store.Queries, jwtSecret string, svc *spotifyModule.Service) *Handler {
	return &Handler{hub: h, queries: queries, jwtSecret: jwtSecret, spotifyService: svc}
}

// RegisterRoutes mounts the single WebSocket endpoint.
//
//	GET /ws?type=web&token=<jwt>
//	GET /ws?type=agent&device_id=<uuid>&secret=<plain>
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/ws", h.Handle)
}

// Handle upgrades the HTTP connection and dispatches based on client type.
func (h *Handler) Handle(c *gin.Context) {
	switch c.Query("type") {
	case "web":
		h.handleWeb(c)
	case "agent":
		h.handleAgent(c)
	default:
		response.BadRequest(c, "type must be 'web' or 'agent'")
	}
}

// handleWeb authenticates via JWT, registers the connection, starts the Spotify worker.
func (h *Handler) handleWeb(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		response.Unauthorized(c, "token required")
		return
	}

	claims := jwt.MapClaims{}
	if _, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		return []byte(h.jwtSecret), nil
	}); err != nil {
		response.Unauthorized(c, "invalid token")
		return
	}
	userID, _ := claims["user_id"].(string)
	if userID == "" {
		response.Unauthorized(c, "token missing user_id")
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws: web upgrade error: %v", err)
		return
	}

	conn := h.hub.SetWeb(ws, userID)
	log.Printf("ws: web connected (user=%s)", userID)

	ctx, cancel := context.WithCancel(context.Background())
	go h.writePump(conn, cancel)
	go startSpotifyWorker(ctx, h.hub, h.spotifyService, userID)

	h.readPumpWeb(conn, func() {
		cancel()
		h.hub.RemoveWeb(conn)
		log.Printf("ws: web disconnected (user=%s)", userID)
	})
}

// handleAgent authenticates via device_id + plain secret (bcrypt-checked against DB),
// then manages the agent connection lifecycle and telemetry ingestion.
func (h *Handler) handleAgent(c *gin.Context) {
	deviceID := c.Query("device_id")
	secret := c.Query("secret")
	if deviceID == "" || secret == "" {
		response.BadRequest(c, "device_id and secret required")
		return
	}

	ctx := c.Request.Context()
	device, err := h.queries.GetDevice(ctx, deviceID)
	if err != nil {
		response.Unauthorized(c, "device not found")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(device.SecretHash), []byte(secret)); err != nil {
		response.Unauthorized(c, "invalid secret")
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws: agent upgrade error: %v", err)
		return
	}

	dc := h.hub.SetDevice(ws, deviceID, device.UserID)
	log.Printf("ws: agent connected (device=%s user=%s)", deviceID, device.UserID)

	// Mark online
	_ = h.queries.UpsertDeviceState(context.Background(), store.UpsertDeviceStateParams{
		DeviceID: deviceID, IsOnline: true,
		DisplayMode: "clock", Brightness: 80,
	})
	h.hub.SendToWeb(hub.Msg{
		Type: hub.TypeDeviceOnline,
		Data: hub.DeviceOnlinePayload{DeviceID: deviceID, Name: device.Name},
	})

	// Sync Spotify tokens if the user has connected Spotify
	h.syncSpotify(context.Background(), dc)

	connCtx, cancel := context.WithCancel(context.Background())
	go h.writePump(dc.Conn, cancel)

	h.readPumpAgent(dc, connCtx, func() {
		cancel()
		h.hub.RemoveDevice(dc)
		_ = h.queries.SetDeviceOffline(context.Background(), deviceID)
		h.hub.SendToWeb(hub.Msg{
			Type: hub.TypeDeviceOffline,
			Data: hub.DeviceOfflinePayload{DeviceID: deviceID},
		})
		log.Printf("ws: agent disconnected (device=%s)", deviceID)
	})
}

// syncSpotify pushes Spotify tokens to the agent if available.
func (h *Handler) syncSpotify(ctx context.Context, dc *hub.DeviceConn) {
	if !h.spotifyService.IsConnected(ctx, dc.UserID) {
		return
	}
	accessToken, err := h.spotifyService.GetValidToken(ctx, dc.UserID)
	if err != nil {
		return
	}
	dc.Enqueue(hub.Msg{
		Type: hub.TypeSpotifySync,
		Data: hub.SpotifySyncPayload{AccessToken: accessToken},
	})
}

// writePump drains the send channel and sends protocol-level pings.
func (h *Handler) writePump(c *hub.Conn, cancel context.CancelFunc) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		cancel()
		c.WS.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			c.WS.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.WS.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.WS.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.WS.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.WS.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPumpWeb discards messages from the web client (it only listens, never sends).
func (h *Handler) readPumpWeb(c *hub.Conn, onClose func()) {
	defer onClose()
	c.WS.SetReadLimit(512)
	c.WS.SetReadDeadline(time.Now().Add(pongWait))
	c.WS.SetPongHandler(func(string) error {
		c.WS.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		if _, _, err := c.WS.ReadMessage(); err != nil {
			return
		}
	}
}

// readPumpAgent processes structured messages from the Pi agent.
func (h *Handler) readPumpAgent(dc *hub.DeviceConn, ctx context.Context, onClose func()) {
	defer onClose()
	dc.WS.SetReadLimit(4096)
	dc.WS.SetReadDeadline(time.Now().Add(pongWait))
	dc.WS.SetPongHandler(func(string) error {
		dc.WS.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := dc.WS.ReadMessage()
		if err != nil {
			return
		}
		var msg incomingMsg
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}
		h.handleAgentMessage(ctx, dc, msg)
	}
}

func (h *Handler) handleAgentMessage(ctx context.Context, dc *hub.DeviceConn, msg incomingMsg) {
	switch msg.Type {
	case "agent.telemetry":
		var td telemetryData
		if err := json.Unmarshal(msg.Data, &td); err != nil {
			return
		}
		_ = h.queries.UpsertDeviceState(ctx, store.UpsertDeviceStateParams{
			DeviceID:    dc.DeviceID,
			IsOnline:    true,
			DisplayMode: td.DisplayMode,
			Brightness:  td.Brightness,
			CpuPercent:  td.CPUPercent,
			MemMb:       td.MemMB,
			TempC:       td.TempC,
			UptimeS:     td.UptimeS,
			WifiDbm:     td.WiFiDBM,
			IpAddress:   td.IPAddress,
		})
		if td.AgentVersion != "" {
			v := td.AgentVersion
			_ = h.queries.UpdateDeviceLastSeen(ctx, store.UpdateDeviceLastSeenParams{
				ID: dc.DeviceID, AgentVersion: &v,
			})
		}
		// Forward telemetry to web dashboard
		h.hub.SendToWeb(hub.Msg{
			Type: hub.TypeDeviceTelemetry,
			Data: hub.TelemetryPayload{
				DeviceID:     dc.DeviceID,
				AgentVersion: td.AgentVersion,
				DisplayMode:  td.DisplayMode,
				Brightness:   td.Brightness,
				CPUPercent:   td.CPUPercent,
				MemMB:        td.MemMB,
				TempC:        td.TempC,
				UptimeS:      td.UptimeS,
				WiFiDBM:      td.WiFiDBM,
				IPAddress:    td.IPAddress,
			},
		})

	case "agent.now_playing":
		h.hub.SendToWeb(hub.Msg{
			Type: hub.TypeDeviceNowPlaying,
			Data: hub.NowPlayingPayload{DeviceID: dc.DeviceID, Track: msg.Data},
		})

	case "ping":
		dc.Enqueue(hub.Msg{Type: hub.TypePong})
	}
}
