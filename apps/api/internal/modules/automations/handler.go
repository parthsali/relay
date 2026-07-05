package automations

import (
	"github.com/gin-gonic/gin"
	"github.com/parthsali/relay/apps/api/internal/middleware"
	"github.com/parthsali/relay/apps/api/internal/response"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func userIDFrom(c *gin.Context) string { return c.GetString(middleware.UserIDKey) }

// RegisterRoutes mounts automation routes.
//
//	GET    /automations
//	POST   /automations
//	PATCH  /automations/:id/active
//	DELETE /automations/:id
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.List)
	rg.POST("", h.Create)
	rg.PATCH("/:id/active", h.SetActive)
	rg.DELETE("/:id", h.Delete)
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context(), userIDFrom(c))
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.OK(c, gin.H{"automations": items})
}

type createRequest struct {
	Name         string  `json:"name"          binding:"required"`
	TriggerType  string  `json:"trigger_type"  binding:"required"`
	TriggerValue *string `json:"trigger_value"`
	ActionType   string  `json:"action_type"   binding:"required"`
	ActionValue  string  `json:"action_value"  binding:"required"`
}

func (h *Handler) Create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	a, err := h.svc.Create(c.Request.Context(), userIDFrom(c), req.Name, req.TriggerType, req.TriggerValue, req.ActionType, req.ActionValue)
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.Created(c, a)
}

type activeRequest struct {
	Active bool `json:"active"`
}

func (h *Handler) SetActive(c *gin.Context) {
	var req activeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	if err := h.svc.SetActive(c.Request.Context(), c.Param("id"), userIDFrom(c), req.Active); err != nil {
		response.Internal(c, err)
		return
	}
	response.NoContent(c)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id"), userIDFrom(c)); err != nil {
		response.Internal(c, err)
		return
	}
	response.NoContent(c)
}
