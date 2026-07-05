-- name: CreateAPIKey :one
INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetAPIKeysByUser :many
SELECT * FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC;

-- name: DeleteAPIKey :exec
DELETE FROM api_keys WHERE id = $1 AND user_id = $2;
