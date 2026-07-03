package auth

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"

	"github.com/parthsali/relay/apps/api/internal/response"
)

// Handler exposes the Google OAuth flow and logout.
type Handler struct {
	service     *Service
	oauthConfig *oauth2.Config
}

func NewHandler(service *Service, oauthConfig *oauth2.Config) *Handler {
	return &Handler{service: service, oauthConfig: oauthConfig}
}

// RegisterRoutes mounts auth endpoints on the given router group.
//
//	GET  /auth/google           → redirect to Google consent screen
//	GET  /auth/google/callback  → exchange code, return JWT + user
//	POST /auth/logout           → client-side logout hint (JWT is stateless)
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/google", h.GoogleLogin)
	rg.GET("/google/callback", h.GoogleCallback)
	rg.POST("/logout", h.Logout)
}

// GoogleLogin redirects the user to Google's OAuth2 consent page.
func (h *Handler) GoogleLogin(c *gin.Context) {
	url := h.oauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOnline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GoogleCallback handles the redirect from Google, finds or creates the user,
// and returns a signed JWT with the user profile.
//
//	GET /auth/google/callback?code=...
func (h *Handler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.BadRequest(c, "missing authorization code")
		return
	}

	oauthToken, err := h.oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		response.Internal(c, err)
		return
	}

	resp, err := h.oauthConfig.Client(context.Background(), oauthToken).
		Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		response.Internal(c, err)
		return
	}
	defer resp.Body.Close()

	var info GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		response.Internal(c, err)
		return
	}

	user, err := h.service.FindOrCreateUser(c.Request.Context(), &info)
	if err != nil {
		response.Internal(c, err)
		return
	}

	token, err := h.service.GenerateJWT(user)
	if err != nil {
		response.Internal(c, err)
		return
	}

	response.OK(c, gin.H{
		"token": token,
		"user":  user,
	})
}

// Logout is a stateless hint — the client must discard the JWT.
//
//	POST /auth/logout
func (h *Handler) Logout(c *gin.Context) {
	response.OKMessage(c, "logged out successfully")
}
