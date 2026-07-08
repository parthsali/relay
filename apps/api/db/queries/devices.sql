-- name: CreateDevice :one
INSERT INTO devices (user_id, name, secret_hash)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetDevice :one
SELECT * FROM devices WHERE id = $1 LIMIT 1;

-- name: GetDevicesByUser :many
SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC;

-- name: DeleteDevice :exec
DELETE FROM devices WHERE id = $1 AND user_id = $2;

-- name: UpdateDeviceLastSeen :exec
UPDATE devices
SET last_seen_at = NOW(), agent_version = $2
WHERE id = $1;

-- name: UpsertDeviceState :exec
INSERT INTO device_states (
    device_id, is_online, display_mode, brightness,
    cpu_percent, mem_mb, temp_c, uptime_s, wifi_dbm, ip_address, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
ON CONFLICT (device_id) DO UPDATE SET
    is_online    = EXCLUDED.is_online,
    display_mode = EXCLUDED.display_mode,
    brightness   = EXCLUDED.brightness,
    cpu_percent  = EXCLUDED.cpu_percent,
    mem_mb       = EXCLUDED.mem_mb,
    temp_c       = EXCLUDED.temp_c,
    uptime_s     = EXCLUDED.uptime_s,
    wifi_dbm     = EXCLUDED.wifi_dbm,
    ip_address   = EXCLUDED.ip_address,
    updated_at   = NOW();

-- name: GetDeviceState :one
SELECT * FROM device_states WHERE device_id = $1 LIMIT 1;

-- name: SetDeviceOffline :exec
UPDATE device_states SET is_online = FALSE, updated_at = NOW()
WHERE device_id = $1;

-- name: RenameDevice :one
UPDATE devices SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *;
