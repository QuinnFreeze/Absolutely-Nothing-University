-- Additive only: retain all existing students, archives, and import receipts.
-- Deployment gate: registration remains closed until real production acceptance.
UPDATE system_flags SET enabled = 0,
  updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), updated_by = 'security-migration',
  note = 'Closed pending production security acceptance'
WHERE flag_key = 'registration_enabled';
INSERT OR IGNORE INTO system_flags (flag_key, enabled, note)
VALUES ('registration_enabled', 0, 'Closed pending production security acceptance');

CREATE TABLE IF NOT EXISTS turnstile_tokens (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_turnstile_expiry ON turnstile_tokens(expires_at);

-- A payload fingerprint prevents reusing an import key for different archives.
-- Receipt reservation, every archive write and summary commit share one D1 batch.
ALTER TABLE idempotency_keys ADD COLUMN request_hash TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_import_receipts_created ON idempotency_keys(created_at);

-- Detect simultaneous profile updates instead of silently overwriting them.
ALTER TABLE students ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
