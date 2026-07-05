-- name: CreateAsset :one
INSERT INTO assets (user_id, name, filename, gcs_path, mime_type, size_bytes)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetAssetsByUser :many
SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC;

-- name: GetAsset :one
SELECT * FROM assets WHERE id = $1 AND user_id = $2 LIMIT 1;

-- name: DeleteAsset :exec
DELETE FROM assets WHERE id = $1 AND user_id = $2;
