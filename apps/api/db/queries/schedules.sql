-- name: CreateSchedule :one
INSERT INTO schedules (user_id, name, cron, mode, active)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetSchedulesByUser :many
SELECT * FROM schedules WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateScheduleActive :exec
UPDATE schedules SET active = $2 WHERE id = $1 AND user_id = $3;

-- name: DeleteSchedule :exec
DELETE FROM schedules WHERE id = $1 AND user_id = $2;
