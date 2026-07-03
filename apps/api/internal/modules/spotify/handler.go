package spotify

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/parthsali/relay/apps/api/internal/middleware"
	"github.com/parthsali/relay/apps/api/internal/response"
)

// Handler exposes Spotify OAuth and playback endpoints.
type Handler struct {
	service     *Service
	frontendURL string
}

func NewHandler(service *Service, frontendURL string) *Handler {
	return &Handler{service: service, frontendURL: frontendURL}
}

// RegisterPublicRoutes mounts the OAuth callback (no JWT required).
//
//	GET /spotify/callback
func (h *Handler) RegisterPublicRoutes(rg *gin.RouterGroup) {
	rg.GET("/callback", h.Callback)
}

// RegisterProtectedRoutes mounts all other endpoints (JWT required).
//
//	GET    /spotify/connect      → redirect to Spotify consent page
//	GET    /spotify/status       → { connected: bool }
//	GET    /spotify/now-playing  → NowPlayingResult
//	DELETE /spotify/disconnect   → removes tokens
func (h *Handler) RegisterProtectedRoutes(rg *gin.RouterGroup) {
	rg.GET("/connect", h.Connect)
	rg.GET("/status", h.Status)
	rg.GET("/now-playing", h.NowPlaying)
	rg.DELETE("/disconnect", h.Disconnect)
}

// Connect returns the Spotify OAuth authorization URL as JSON.
// The frontend fetches this (with the Bearer token) and then navigates to the URL.
// This avoids the problem of browser redirects dropping the Authorization header.
func (h *Handler) Connect(c *gin.Context) {
	userID := c.GetString(middleware.UserIDKey)
	if userID == "" {
		response.Unauthorized(c, "user not authenticated")
		return
	}
	authURL := h.service.AuthURL(userID)
	c.JSON(http.StatusOK, gin.H{"url": authURL})
}

// Callback handles the redirect from Spotify after the user grants permission.
// Spotify sends: ?code=...&state=<userID>
// On success  → frontend /spotify?connected=true
// On error    → frontend /spotify?error=spotify_auth_failed
func (h *Handler) Callback(c *gin.Context) {
	redirect := func(path string) {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+path)
	}

	code := c.Query("code")
	userID := c.Query("state")

	if code == "" || userID == "" {
		redirect("/spotify?error=spotify_auth_failed")
		return
	}

	if err := h.service.ExchangeCode(c.Request.Context(), userID, code); err != nil {
		redirect("/spotify?error=spotify_auth_failed")
		return
	}

	redirect("/spotify?connected=true")
}

// Status returns whether the authenticated user has connected their Spotify account.
func (h *Handler) Status(c *gin.Context) {
	userID := c.GetString(middleware.UserIDKey)
	connected := h.service.IsConnected(c.Request.Context(), userID)
	c.JSON(http.StatusOK, gin.H{"connected": connected})
}

// NowPlaying returns the currently playing Spotify track for the authenticated user.
func (h *Handler) NowPlaying(c *gin.Context) {
	userID := c.GetString(middleware.UserIDKey)
	result, err := h.service.NowPlaying(c.Request.Context(), userID)
	if err != nil {
		response.Internal(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// Disconnect removes the user's stored Spotify tokens.
func (h *Handler) Disconnect(c *gin.Context) {
	userID := c.GetString(middleware.UserIDKey)
	if err := h.service.Disconnect(c.Request.Context(), userID); err != nil {
		response.Internal(c, err)
		return
	}
	response.OKMessage(c, "disconnected from Spotify")
}
