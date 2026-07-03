package spotify

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/parthsali/relay/apps/api/internal/store"
)

const (
	spotifyAuthURL  = "https://accounts.spotify.com/authorize"
	spotifyTokenURL = "https://accounts.spotify.com/api/token"
	spotifyAPIBase  = "https://api.spotify.com/v1"
	spotifyScopes   = "user-read-currently-playing user-read-playback-state user-read-recently-played"
)

// Service handles all Spotify OAuth and API interactions.
type Service struct {
	queries      *store.Queries
	clientID     string
	clientSecret string
	redirectURL  string
}

func NewService(queries *store.Queries, clientID, clientSecret, redirectURL string) *Service {
	return &Service{
		queries:      queries,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURL:  redirectURL,
	}
}

// AuthURL builds the Spotify OAuth2 authorization URL.
// The userID is passed as the state parameter so the callback can identify the user.
func (s *Service) AuthURL(userID string) string {
	params := url.Values{
		"client_id":     {s.clientID},
		"response_type": {"code"},
		"redirect_uri":  {s.redirectURL},
		"scope":         {spotifyScopes},
		"state":         {userID},
	}
	return spotifyAuthURL + "?" + params.Encode()
}

// tokenResponse is the shape of Spotify's /api/token response.
type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
}

// ExchangeCode trades an authorization code for access+refresh tokens and persists them.
func (s *Service) ExchangeCode(ctx context.Context, userID, code string) error {
	tok, err := s.requestToken(url.Values{
		"grant_type":   {"authorization_code"},
		"code":         {code},
		"redirect_uri": {s.redirectURL},
	})
	if err != nil {
		return fmt.Errorf("token exchange: %w", err)
	}
	return s.saveToken(ctx, userID, tok)
}

// RefreshToken refreshes the access token using the stored refresh token.
func (s *Service) RefreshToken(ctx context.Context, userID, refreshToken string) error {
	tok, err := s.requestToken(url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {refreshToken},
	})
	if err != nil {
		return fmt.Errorf("token refresh: %w", err)
	}
	// Spotify may not return a new refresh token on refresh — keep the old one.
	if tok.RefreshToken == "" {
		tok.RefreshToken = refreshToken
	}
	return s.saveToken(ctx, userID, tok)
}

func (s *Service) requestToken(params url.Values) (*tokenResponse, error) {
	req, _ := http.NewRequest(http.MethodPost, spotifyTokenURL, strings.NewReader(params.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(s.clientID, s.clientSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("spotify returned %d: %s", resp.StatusCode, body)
	}
	var tok tokenResponse
	if err := json.Unmarshal(body, &tok); err != nil {
		return nil, err
	}
	return &tok, nil
}

func (s *Service) saveToken(ctx context.Context, userID string, tok *tokenResponse) error {
	_, err := s.queries.UpsertSpotifyToken(ctx, store.UpsertSpotifyTokenParams{
		UserID:       userID,
		AccessToken:  tok.AccessToken,
		RefreshToken: tok.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(tok.ExpiresIn) * time.Second),
		Scope:        tok.Scope,
	})
	return err
}

// GetValidToken returns a valid access token, refreshing it first if it expires within 60s.
func (s *Service) GetValidToken(ctx context.Context, userID string) (string, error) {
	row, err := s.queries.GetSpotifyToken(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", fmt.Errorf("spotify not connected")
		}
		return "", err
	}
	if time.Until(row.ExpiresAt) < 60*time.Second {
		if err := s.RefreshToken(ctx, userID, row.RefreshToken); err != nil {
			return "", err
		}
		row, err = s.queries.GetSpotifyToken(ctx, userID)
		if err != nil {
			return "", err
		}
	}
	return row.AccessToken, nil
}

// IsConnected returns true when the user has stored Spotify tokens.
func (s *Service) IsConnected(ctx context.Context, userID string) bool {
	_, err := s.queries.GetSpotifyToken(ctx, userID)
	return err == nil
}

// Disconnect removes stored tokens for the user.
func (s *Service) Disconnect(ctx context.Context, userID string) error {
	return s.queries.DeleteSpotifyToken(ctx, userID)
}

// NowPlayingResult holds the currently playing track data.
type NowPlayingResult struct {
	IsPlaying  bool     `json:"is_playing"`
	TrackName  string   `json:"track_name"`
	Artists    []string `json:"artists"`
	AlbumName  string   `json:"album_name"`
	AlbumArt   string   `json:"album_art"`
	ProgressMs int      `json:"progress_ms"`
	DurationMs int      `json:"duration_ms"`
	TrackURL   string   `json:"track_url"`
}

// NowPlaying fetches the currently playing track from Spotify.
// Returns nil result (no error) when nothing is playing.
func (s *Service) NowPlaying(ctx context.Context, userID string) (*NowPlayingResult, error) {
	accessToken, err := s.GetValidToken(ctx, userID)
	if err != nil {
		return nil, err
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		spotifyAPIBase+"/me/player/currently-playing", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// 204 = nothing playing
	if resp.StatusCode == http.StatusNoContent {
		return &NowPlayingResult{IsPlaying: false}, nil
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("spotify API returned %d: %s", resp.StatusCode, body)
	}

	var data struct {
		IsPlaying  bool `json:"is_playing"`
		ProgressMs int  `json:"progress_ms"`
		Item       struct {
			Name         string `json:"name"`
			DurationMs   int    `json:"duration_ms"`
			ExternalURLs struct {
				Spotify string `json:"spotify"`
			} `json:"external_urls"`
			Album struct {
				Name   string `json:"name"`
				Images []struct {
					URL string `json:"url"`
				} `json:"images"`
			} `json:"album"`
			Artists []struct {
				Name string `json:"name"`
			} `json:"artists"`
		} `json:"item"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	artists := make([]string, len(data.Item.Artists))
	for i, a := range data.Item.Artists {
		artists[i] = a.Name
	}
	albumArt := ""
	if len(data.Item.Album.Images) > 0 {
		albumArt = data.Item.Album.Images[0].URL
	}

	return &NowPlayingResult{
		IsPlaying:  data.IsPlaying,
		TrackName:  data.Item.Name,
		Artists:    artists,
		AlbumName:  data.Item.Album.Name,
		AlbumArt:   albumArt,
		ProgressMs: data.ProgressMs,
		DurationMs: data.Item.DurationMs,
		TrackURL:   data.Item.ExternalURLs.Spotify,
	}, nil
}
