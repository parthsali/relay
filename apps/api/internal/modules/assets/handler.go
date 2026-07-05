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
//	POST   /assets/upload-url   (get a signed GCS PUT URL)
//	POST   /assets/meta         (register metadata after upload)
//	DELETE /assets/:id
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.List)
	rg.POST("/upload-url", h.UploadURL)
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

type uploadURLRequest struct {
	Filename string `json:"filename" binding:"required"`
	MimeType string `json:"mime_type"`
}

// UploadURL returns a signed GCS PUT URL and the gcs_path the browser should
// pass back to POST /assets/meta after the upload completes.
func (h *Handler) UploadURL(c *gin.Context) {
	if !h.svc.GCSEnabled() {
		response.BadRequest(c, "GCS not configured — set GCS_BUCKET and GOOGLE_APPLICATION_CREDENTIALS")
		return
	}
	var req uploadURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	result, err := h.svc.GenerateUploadURL(c.Request.Context(), userIDFrom(c), req.Filename, req.MimeType)
	if err != nil {
		response.Internal(c, err)
		return
	}
	response.OK(c, result)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id"), userIDFrom(c)); err != nil {
		response.Internal(c, err)
		return
	}
	response.NoContent(c)
}
