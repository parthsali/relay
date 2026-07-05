package assets

import (
	"github.com/gin-gonic/gin"
	"github.com/parthsali/relay/apps/api/internal/middleware"
	"github.com/parthsali/relay/apps/api/internal/response"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func userIDFrom(c *gin.Context) string { return c.GetString(middleware.UserIDKey) }

// RegisterRoutes mounts asset routes.
//
//	GET    /assets
//	POST   /assets/meta   (register metadata for an already-uploaded file)
//	DELETE /assets/:id
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.List)
	rg.POST("/meta", h.CreateMeta)
	rg.DELETE("/:id", h.Delete)
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.svc.List(c.Request.Context(), userIDFrom(c))
	if err != nil {
		response.Internal(c, err)
		return
	}
	// Enrich each asset with a public URL
	type assetView struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		Filename  string `json:"filename"`
		MimeType  string `json:"mime_type"`
		SizeBytes int64  `json:"size_bytes"`
		PublicURL string `json:"public_url"`
		CreatedAt string `json:"created_at"`
	}
	out := make([]assetView, len(items))
	for i, a := range items {
		out[i] = assetView{
			ID:        a.ID,
			Name:      a.Name,
			Filename:  a.Filename,
			MimeType:  a.MimeType,
			SizeBytes: a.SizeBytes,
			PublicURL: h.svc.PublicURL(a.GcsPath),
			CreatedAt: a.CreatedAt.String(),
		}
	}
	response.OK(c, gin.H{"assets": out})
}

type createMetaRequest struct {
	Name      string `json:"name"       binding:"required"`
	Filename  string `json:"filename"   binding:"required"`
	GCSPath   string `json:"gcs_path"   binding:"required"`
	MimeType  string `json:"mime_type"`
	SizeBytes int64  `json:"size_bytes"`
}

func (h *Handler) CreateMeta(c *gin.Context) {
	var req createMetaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	asset, err := h.svc.CreateMeta(c.Request.Context(), userIDFrom(c), req.Name, req.Filename, req.GCSPath, req.MimeType, req.SizeBytes)
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.Created(c, asset)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id"), userIDFrom(c)); err != nil {
		response.Internal(c, err)
		return
	}
	response.NoContent(c)
}
