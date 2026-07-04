// Package spotify polls the Spotify Web API for the currently-playing track.
// The access token is provided by the backend via a spotify.sync WS message.
package spotify

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
)

const apiBase = "https://api.spotify.com/v1"

// NowPlaying holds the current playback state.
type NowPlaying struct {
	IsPlaying  bool
	Title      string
	Artist     string
	AlbumArt   string
	ProgressMs int
	DurationMs int
}

// Client holds the Spotify access token and polls the API.
type Client struct {
	mu    sync.RWMutex
	token string
}

func New() *Client { return &Client{} }

// SetToken stores a fresh access token (called on spotify.sync from backend).
func (c *Client) SetToken(token string) {
	c.mu.Lock()
	c.token = token
	c.mu.Unlock()
}

// HasToken reports whether a token is available.
func (c *Client) HasToken() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.token != ""
}

// CurrentlyPlaying fetches the playing track. Returns nil if nothing is playing.
// On 401, clears the token so the caller stops polling until re-synced.
func (c *Client) CurrentlyPlaying(ctx context.Context) (*NowPlaying, error) {
	c.mu.RLock()
	token := c.token
	c.mu.RUnlock()
	if token == "" {
		return nil, fmt.Errorf("no token")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		apiBase+"/me/player/currently-playing", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusNoContent:
		return nil, nil // nothing playing
	case http.StatusUnauthorized:
		c.mu.Lock()
		c.token = "" // expired — wait for backend to re-sync
		c.mu.Unlock()
		return nil, fmt.Errorf("token expired")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("spotify %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var raw struct {
		IsPlaying  bool `json:"is_playing"`
		ProgressMs int  `json:"progress_ms"`
		Item       struct {
			Name       string             `json:"name"`
			DurationMs int                `json:"duration_ms"`
			Artists    []struct{ Name string `json:"name"` } `json:"artists"`
			Album      struct {
				Images []struct {
					URL   string `json:"url"`
					Width int    `json:"width"`
				} `json:"images"`
			} `json:"album"`
		} `json:"item"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	artist := ""
	if len(raw.Item.Artists) > 0 {
		artist = raw.Item.Artists[0].Name
	}
	// prefer smallest image that is still at least 64px wide
	albumArt := ""
	for i := len(raw.Item.Album.Images) - 1; i >= 0; i-- {
		img := raw.Item.Album.Images[i]
		albumArt = img.URL
		if img.Width >= 64 {
			break
		}
	}

	return &NowPlaying{
		IsPlaying:  raw.IsPlaying,
		Title:      raw.Item.Name,
		Artist:     artist,
		AlbumArt:   albumArt,
		ProgressMs: raw.ProgressMs,
		DurationMs: raw.Item.DurationMs,
	}, nil
}
