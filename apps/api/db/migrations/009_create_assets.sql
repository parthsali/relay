CREATE TABLE IF NOT EXISTS assets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    filename    TEXT        NOT NULL,
    gcs_path    TEXT        NOT NULL,
    mime_type   TEXT        NOT NULL DEFAULT 'application/octet-stream',
    size_bytes  BIGINT      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
