CREATE TABLE IF NOT EXISTS users (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url TEXT         NOT NULL DEFAULT '',
    google_id  VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
