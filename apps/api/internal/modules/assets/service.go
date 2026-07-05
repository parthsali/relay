package assets

import (
	"context"
	"fmt"
	"mime"
	"net/http"

	"github.com/parthsali/relay/apps/api/internal/store"
)

type Service struct {
	queries   *store.Queries
	gcsBucket string // may be empty if GCS not configured
}

func NewService(queries *store.Queries, gcsBucket string) *Service {
	return &Service{queries: queries, gcsBucket: gcsBucket}
}

func (s *Service) GCSEnabled() bool { return s.gcsBucket != "" }

func (s *Service) List(ctx context.Context, userID string) ([]store.Asset, error) {
	rows, err := s.queries.GetAssetsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list assets: %w", err)
	}
	return rows, nil
}

func (s *Service) Get(ctx context.Context, id, userID string) (store.Asset, error) {
	return s.queries.GetAsset(ctx, store.GetAssetParams{ID: id, UserID: userID})
}

// CreateMeta records asset metadata after the caller has uploaded the file.
func (s *Service) CreateMeta(ctx context.Context, userID, name, filename, gcsPath, mimeType string, sizeBytes int64) (store.Asset, error) {
	if mimeType == "" {
		mimeType = mime.TypeByExtension(filename)
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
	}
	return s.queries.CreateAsset(ctx, store.CreateAssetParams{
		UserID:    userID,
		Name:      name,
		Filename:  filename,
		GcsPath:   gcsPath,
		MimeType:  mimeType,
		SizeBytes: sizeBytes,
	})
}

func (s *Service) Delete(ctx context.Context, id, userID string) error {
	return s.queries.DeleteAsset(ctx, store.DeleteAssetParams{ID: id, UserID: userID})
}

// PublicURL returns the GCS public URL for an asset (unauthenticated bucket required).
func (s *Service) PublicURL(gcsPath string) string {
	if s.gcsBucket == "" {
		return ""
	}
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.gcsBucket, gcsPath)
}

// DetectMIME sniffs the MIME type from the first 512 bytes of data.
func DetectMIME(data []byte) string {
	return http.DetectContentType(data)
}
