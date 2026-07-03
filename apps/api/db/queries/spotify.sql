-- name: UpsertSpotifyToken :one
INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at, scope)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE
  SET access_token  = EXCLUDED.access_token,
      refresh_token = CASE
                          WHEN EXCLUDED.refresh_token = '' THEN spotify_tokens.refresh_token
                          ELSE EXCLUDED.refresh_token
                      END,
      expires_at    = EXCLUDED.expires_at,
      scope         = EXCLUDED.scope,
      updated_at    = NOW()
RETURNING *;

-- name: GetSpotifyToken :one
SELECT * FROM spotify_tokens WHERE user_id = $1;

-- name: DeleteSpotifyToken :exec
DELETE FROM spotify_tokens WHERE user_id = $1;
