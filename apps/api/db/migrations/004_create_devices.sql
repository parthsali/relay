-- Registered Relay devices (one Pi per user for now, schema supports multiples).
CREATE TABLE IF NOT EXISTS devices (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL DEFAULT 'My Relay',
    secret_hash   TEXT        NOT NULL,         -- bcrypt hash of the plain secret
    agent_version TEXT,
    last_seen_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Latest known state for each device.
-- Always upserted — never inserted as a second row.
CREATE TABLE IF NOT EXISTS device_states (
    device_id    UUID        PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    is_online    BOOLEAN     NOT NULL DEFAULT FALSE,
    display_mode TEXT        NOT NULL DEFAULT 'clock',
    brightness   INT         NOT NULL DEFAULT 80,
    cpu_percent  FLOAT8      NOT NULL DEFAULT 0,
    mem_mb       FLOAT8      NOT NULL DEFAULT 0,
    temp_c       FLOAT8      NOT NULL DEFAULT 0,
    uptime_s     BIGINT      NOT NULL DEFAULT 0,
    wifi_dbm     INT         NOT NULL DEFAULT 0,
    ip_address   TEXT        NOT NULL DEFAULT '',
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
