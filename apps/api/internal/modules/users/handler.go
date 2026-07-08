package users

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/parthsali/relay/apps/api/internal/middleware"
	"github.com/parthsali/relay/apps/api/internal/response"
)

// Handler wires HTTP routes to the users service.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes attaches user routes to the provided router group.
// The JWT middleware must already be applied by the caller.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/me", h.GetMe)
	rg.PATCH("/me", h.UpdateMe)
}

// GetMe returns the currently authenticated user's profile.
//
//	GET /users/me
func (h *Handler) GetMe(c *gin.Context) {
	userID := c.GetString(middleware.UserIDKey)
	if userID == "" {
		response.Unauthorized(c, "unauthorized")
		return
	}

	user, err := h.service.GetByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(c, "user not found")
			return
		}
		response.Internal(c, err)
		return
	}

	response.OK(c, user)
}

// UpdateMe updates the authenticated user's display name.
//
//	PATCH /users/me
func (h *Handler) UpdateMe(c *gin.Context) {
	userID := c.GetString(middleware.UserIDKey)
	if userID == "" {
		response.Unauthorized(c, "unauthorized")
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	user, err := h.service.UpdateName(c.Request.Context(), userID, req.Name)
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.OK(c, user)
}
