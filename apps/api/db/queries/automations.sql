-- name: CreateAutomation :one
INSERT INTO automations (user_id, name, trigger_type, trigger_value, action_type, action_value, active)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetAutomationsByUser :many
SELECT * FROM automations WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateAutomationActive :exec
UPDATE automations SET active = $2 WHERE id = $1 AND user_id = $3;

-- name: DeleteAutomation :exec
DELETE FROM automations WHERE id = $1 AND user_id = $2;
