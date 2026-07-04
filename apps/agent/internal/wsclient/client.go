package wsclient

import (
	"context"
	"encoding/json"
	"log"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
	minBackoff = 2 * time.Second
	maxBackoff = 60 * time.Second
)

// Handler is called on every inbound message from the backend.
type Handler func(msg Msg)

// Client manages a persistent, auto-reconnecting WebSocket connection.
type Client struct {
	backendURL   string
	deviceID     string
	deviceSecret string
	handler      Handler

	mu   sync.Mutex
	send chan []byte
}

func New(backendURL, deviceID, deviceSecret string, handler Handler) *Client {
	return &Client{
		backendURL:   backendURL,
		deviceID:     deviceID,
		deviceSecret: deviceSecret,
		handler:      handler,
		send:         make(chan []byte, 64),
	}
}

// Send enqueues a message for the backend. Non-blocking — drops if buffer full.
func (c *Client) Send(msg Msg) {
	b, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.send <- b:
	default:
		log.Println("wsclient: send buffer full, dropping")
	}
}

// Run connects and reconnects with exponential backoff until ctx is cancelled.
func (c *Client) Run(ctx context.Context) {
	backoff := minBackoff
	for {
		if err := c.connect(ctx); err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("wsclient: connection lost (%v), retry in %s", err, backoff)
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return
			}
			if backoff < maxBackoff {
				backoff *= 2
			}
		} else {
			backoff = minBackoff
		}
	}
}

func (c *Client) connect(ctx context.Context) error {
	u, err := url.Parse(c.backendURL)
	if err != nil {
		return err
	}
	q := u.Query()
	q.Set("type", "agent")
	q.Set("device_id", c.deviceID)
	q.Set("secret", c.deviceSecret)
	u.RawQuery = q.Encode()

	conn, _, err := websocket.DefaultDialer.DialContext(ctx, u.String(), nil)
	if err != nil {
		return err
	}
	defer conn.Close()
	log.Printf("wsclient: connected to %s", c.backendURL)

	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// write pump
	go func() {
		ticker := time.NewTicker(pingPeriod)
		defer ticker.Stop()
		for {
			select {
			case msg, ok := <-c.send:
				conn.SetWriteDeadline(time.Now().Add(writeWait))
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(writeWait))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	// read pump (blocks until disconnect)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		var msg Msg
		if json.Unmarshal(raw, &msg) == nil && c.handler != nil {
			c.handler(msg)
		}
	}
}
