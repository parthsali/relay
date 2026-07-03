package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"

	"github.com/parthsali/relay/apps/api/internal/response"
)

// Handler exposes the Google OAuth flow and logout.
type Handler struct {
	service     *Service
	oauthConfig *oauth2.Config
	frontendURL string
}

func NewHandler(service *Service, oauthConfig *oauth2.Config, frontendURL string) *Handler {
	return &Handler{service: service, oauthConfig: oauthConfig, frontendURL: frontendURL}
}

// RegisterRoutes mounts auth endpoints on the given router group.
//
//	GET  /auth/google           → redirect to Google consent screen
//	GET  /auth/google/callback  → exchange code, redirect to frontend with token or error
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
// checks is_activated, then redirects to the frontend with a token or an error.
//
//	GET /auth/google/callback?code=...
//
// Success  → FRONTEND_URL/auth/callback?token=<jwt>
// Inactive → FRONTEND_URL/login?error=not_activated
func (h *Handler) GoogleCallback(c *gin.Context) {
	redirect := func(path string) {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendURL+path)
	}

	code := c.Query("code")
	if code == "" {
		redirect("/login?error=auth_failed")
		return
	}

	oauthToken, err := h.oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		redirect("/login?error=auth_failed")
		return
	}

	resp, err := h.oauthConfig.Client(context.Background(), oauthToken).
		Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		redirect("/login?error=auth_failed")
		return
	}
	defer resp.Body.Close()

	var info GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		redirect("/login?error=auth_failed")
		return
	}

	user, err := h.service.FindOrCreateUser(c.Request.Context(), &info)
	if err != nil {
		redirect("/login?error=auth_failed")
		return
	}

	// Block unactivated accounts — admin must set is_activated = true in DB.
	if !user.IsActivated {
		redirect("/login?error=not_activated")
		return
	}

	token, err := h.service.GenerateJWT(user)
	if err != nil {
		redirect("/login?error=auth_failed")
		return
	}

	redirect(fmt.Sprintf("/auth/callback?token=%s", token))
}

// Logout is a stateless hint — the client must discard the JWT.
//
//	POST /auth/logout
func (h *Handler) Logout(c *gin.Context) {
	response.OKMessage(c, "logged out successfully")
}
