package devices

import (
	"github.com/gin-gonic/gin"
	"github.com/parthsali/relay/apps/api/internal/middleware"
	"github.com/parthsali/relay/apps/api/internal/response"
)

func userIDFrom(c *gin.Context) string {
	return c.GetString(middleware.UserIDKey)
}

// Handler exposes device management endpoints.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes mounts device routes under a protected group.
//
//	POST   /devices/register
//	GET    /devices
//	DELETE /devices/:id
//	GET    /devices/:id/state
//	POST   /devices/:id/command
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/register", h.Register)
	rg.GET("", h.List)
	rg.DELETE("/:id", h.Delete)
	rg.GET("/:id/state", h.State)
	rg.POST("/:id/command", h.Command)
}

type registerRequest struct {
	Name string `json:"name" binding:"required"`
}

// Register creates a new device and returns the one-time plain secret.
func (h *Handler) Register(c *gin.Context) {
	userID := userIDFrom(c)
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	result, err := h.svc.Register(c.Request.Context(), userID, req.Name)
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.Created(c, result)
}

// List returns all devices for the authenticated user.
func (h *Handler) List(c *gin.Context) {
	userID := userIDFrom(c)
	devices, err := h.svc.List(c.Request.Context(), userID)
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.OK(c, gin.H{"devices": devices})
}

// Delete removes a device owned by the authenticated user.
func (h *Handler) Delete(c *gin.Context) {
	userID := userIDFrom(c)
	deviceID := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), userID, deviceID); err != nil {
		response.Internal(c, err)
		return
	}
	response.NoContent(c)
}

// State returns the latest telemetry state for a device.
func (h *Handler) State(c *gin.Context) {
	deviceID := c.Param("id")
	state, err := h.svc.GetState(c.Request.Context(), deviceID)
	if err != nil {
		response.NotFound(c, "device state not found")
		return
	}
	response.OK(c, state)
}

type commandRequest struct {
	Type string `json:"type" binding:"required"`
}

// Command forwards a typed command to the device agent via the hub.
// Supported types: agent.restart, agent.update, display.set_mode, display.set_brightness
func (h *Handler) Command(c *gin.Context) {
	deviceID := c.Param("id")
	var req commandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.SendCommand(deviceID, req.Type); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.OK(c, gin.H{"sent": true})
}
