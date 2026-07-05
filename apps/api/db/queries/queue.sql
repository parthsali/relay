-- name: CreateQueueItem :one
INSERT INTO queue_items (user_id, title, source, duration_s, position)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetQueueByUser :many
SELECT * FROM queue_items WHERE user_id = $1 ORDER BY position ASC, created_at ASC;

-- name: DeleteQueueItem :exec
DELETE FROM queue_items WHERE id = $1 AND user_id = $2;

-- name: ClearQueue :exec
DELETE FROM queue_items WHERE user_id = $1;
