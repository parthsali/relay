CREATE TABLE IF NOT EXISTS automations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    trigger_type    TEXT        NOT NULL,
    trigger_value   TEXT,
    action_type     TEXT        NOT NULL,
    action_value    TEXT        NOT NULL,
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
