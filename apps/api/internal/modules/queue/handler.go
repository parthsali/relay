package queue

import (
	"github.com/gin-gonic/gin"
	"github.com/parthsali/relay/apps/api/internal/middleware"
	"github.com/parthsali/relay/apps/api/internal/response"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func userIDFrom(c *gin.Context) string { return c.GetString(middleware.UserIDKey) }

// RegisterRoutes mounts queue routes.
//
//	GET    /queue
//	POST   /queue
//	DELETE /queue/:id
//	DELETE /queue   (clear all)
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.List)
	rg.POST("", h.Create)
	rg.DELETE("/:id", h.Delete)
	rg.DELETE("", h.Clear)
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context(), userIDFrom(c))
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.OK(c, gin.H{"items": items})
}

type createRequest struct {
	Title     string  `json:"title"    binding:"required"`
	Source    string  `json:"source"   binding:"required"`
	DurationS *int32  `json:"duration_s"`
	Position  int32   `json:"position"`
}

func (h *Handler) Create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	item, err := h.svc.Create(c.Request.Context(), userIDFrom(c), req.Title, req.Source, req.DurationS, req.Position)
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.Created(c, item)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id"), userIDFrom(c)); err != nil {
		response.Internal(c, err)
		return
	}
	response.NoContent(c)
}

func (h *Handler) Clear(c *gin.Context) {
	if err := h.svc.Clear(c.Request.Context(), userIDFrom(c)); err != nil {
		response.Internal(c, err)
		return
	}
	response.NoContent(c)
}
