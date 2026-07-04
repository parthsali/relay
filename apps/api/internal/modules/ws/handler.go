package ws

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/parthsali/relay/apps/api/internal/hub"
	spotifyModule "github.com/parthsali/relay/apps/api/internal/modules/spotify"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, // CORS handled by gin middleware
}

// Handler manages WebSocket upgrades and connection lifecycle.
type Handler struct {
	hub            *hub.Hub
	jwtSecret      string
	piSecret       string
	spotifyService *spotifyModule.Service
}

func NewHandler(h *hub.Hub, jwtSecret, piSecret string, svc *spotifyModule.Service) *Handler {
	return &Handler{hub: h, jwtSecret: jwtSecret, piSecret: piSecret, spotifyService: svc}
}

// RegisterRoutes mounts the single WebSocket endpoint.
//
//	GET /ws?type=web&token=<jwt>
//	GET /ws?type=pi&secret=<pi-secret>
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/ws", h.Handle)
}

// Handle upgrades the HTTP connection and dispatches based on client type.
func (h *Handler) Handle(c *gin.Context) {
	clientType := c.Query("type")
	switch clientType {
	case "web":
		h.handleWeb(c)
	case "pi":
		h.handlePi(c)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'web' or 'pi'"})
	}
}

// handleWeb authenticates via JWT, registers the connection, starts the Spotify worker.
func (h *Handler) handleWeb(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}

	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		return []byte(h.jwtSecret), nil
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	userID, _ := claims["user_id"].(string)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token missing user_id"})
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws: web upgrade error: %v", err)
		return
	}

	conn := h.hub.SetWeb(ws, userID)
	log.Printf("ws: web connected (user=%s)", userID)

	// Notify Pi that web is connected (if Pi is online)
	h.hub.SendToPi(hub.Msg{Type: "web.connected"})

	// Context tied to this connection's lifetime
	ctx, cancel := context.WithCancel(context.Background())

	go h.writePump(conn, cancel)
	go startSpotifyWorker(ctx, h.hub, h.spotifyService, userID)

	h.readPump(conn, func() {
		cancel()
		h.hub.RemoveWeb(conn)
		h.hub.SendToPi(hub.Msg{Type: "web.disconnected"})
		log.Printf("ws: web disconnected (user=%s)", userID)
	})
}

// handlePi authenticates via shared secret and registers the Pi connection.
func (h *Handler) handlePi(c *gin.Context) {
	if c.Query("secret") != h.piSecret {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid pi secret"})
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws: pi upgrade error: %v", err)
		return
	}

	conn := h.hub.SetPi(ws)
	log.Printf("ws: pi connected")
	h.hub.SendToWeb(hub.Msg{Type: hub.TypePiConnected})

	_, cancel := context.WithCancel(context.Background())

	go h.writePump(conn, cancel)

	h.readPump(conn, func() {
		cancel()
		h.hub.RemovePi(conn)
		h.hub.SendToWeb(hub.Msg{Type: hub.TypePiDisconnected})
		log.Printf("ws: pi disconnected")
	})
}

// writePump drains the send channel and writes frames to the WebSocket.
// It also sends protocol-level pings to keep the connection alive.
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

// readPump blocks reading client messages. It resets the read deadline on
// every pong so dead connections are detected within pongWait seconds.
// onClose is called exactly once when the loop exits.
func (h *Handler) readPump(c *hub.Conn, onClose func()) {
	defer onClose()
	c.WS.SetReadLimit(512)
	c.WS.SetReadDeadline(time.Now().Add(pongWait))
	c.WS.SetPongHandler(func(string) error {
		c.WS.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, _, err := c.WS.ReadMessage()
		if err != nil {
			return // client closed or timed out
		}
	}
}
