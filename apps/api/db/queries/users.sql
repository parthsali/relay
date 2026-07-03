-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByGoogleID :one
SELECT * FROM users WHERE google_id = $1;

-- name: CreateUser :one
INSERT INTO users (email, name, avatar_url, google_id)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ActivateUser :one
UPDATE users SET is_activated = true, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET name       = $1,
    avatar_url = $2,
    google_id  = $3,
    updated_at = NOW()
WHERE id = $4
RETURNING *;
