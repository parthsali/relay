package assets

import (
	"context"
	"fmt"
	"mime"
	"time"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	"google.golang.org/api/option"

	"github.com/parthsali/relay/apps/api/internal/store"
)

type Service struct {
	queries   *store.Queries
	gcsBucket string // empty if GCS not configured
	gcsClient *storage.Client
}

// NewService creates the assets service.
// gcsBucket may be empty — GCS features are disabled but listing/deleting DB records still works.
func NewService(ctx context.Context, queries *store.Queries, gcsBucket string) (*Service, error) {
	svc := &Service{queries: queries, gcsBucket: gcsBucket}
	if gcsBucket != "" {
		// Uses Application Default Credentials automatically.
		// Set GOOGLE_APPLICATION_CREDENTIALS for local dev; on GCP the attached SA is used.
		c, err := storage.NewClient(ctx, option.WithScopes(storage.ScopeReadWrite))
		if err != nil {
			return nil, fmt.Errorf("gcs client: %w", err)
		}
		svc.gcsClient = c
	}
	return svc, nil
}

func (s *Service) GCSEnabled() bool { return s.gcsBucket != "" && s.gcsClient != nil }

// UploadURLResult is returned to the browser so it can PUT the file directly to GCS.
type UploadURLResult struct {
	UploadURL string `json:"upload_url"` // signed PUT URL — valid for 15 min
	GCSPath   string `json:"gcs_path"`   // object path to store in DB after upload
}

// GenerateUploadURL produces a signed GCS PUT URL the browser can use directly.
// gcsPath: "assets/<userID>/<uuid>-<filename>"
func (s *Service) GenerateUploadURL(ctx context.Context, userID, filename, mimeType string) (*UploadURLResult, error) {
	if !s.GCSEnabled() {
		return nil, fmt.Errorf("GCS not configured")
	}
	if mimeType == "" {
		mimeType = mime.TypeByExtension(filename)
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
	}
	gcsPath := fmt.Sprintf("assets/%s/%s-%s", userID, uuid.New().String()[:8], filename)
	opts := &storage.SignedURLOptions{
		Method:      "PUT",
		Expires:     time.Now().Add(15 * time.Minute),
		ContentType: mimeType,
		Scheme:      storage.SigningSchemeV4,
	}
	url, err := s.gcsClient.Bucket(s.gcsBucket).SignedURL(gcsPath, opts)
	if err != nil {
		return nil, fmt.Errorf("sign url: %w", err)
	}
	return &UploadURLResult{UploadURL: url, GCSPath: gcsPath}, nil
}

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

// CreateMeta records asset metadata after the browser has uploaded the file to GCS.
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
	// Remove from DB first so the UI responds immediately.
	// GCS object cleanup can be done via lifecycle rules or a background job.
	return s.queries.DeleteAsset(ctx, store.DeleteAssetParams{ID: id, UserID: userID})
}

// PublicURL returns the GCS HTTPS URL for an asset.
// Requires the bucket to have uniform public access or a public IAM binding on allUsers.
func (s *Service) PublicURL(gcsPath string) string {
	if s.gcsBucket == "" {
		return ""
	}
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.gcsBucket, gcsPath)
}
