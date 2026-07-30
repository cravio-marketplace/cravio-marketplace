-- ============================================================
-- Cravio Marketplace — fake-account flagging columns
-- Version: 2.1
-- Date: 2026-07-28
-- ============================================================
-- Adds the columns the backend risk service writes to and an
-- admin-only RLS policy so flagged vendors can be reviewed.

ALTER TABLE vendors
    ADD COLUMN IF NOT EXISTS risk_score       INTEGER     DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_reasons     TEXT[]      DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS is_suspicious    BOOLEAN     DEFAULT false,
    ADD COLUMN IF NOT EXISTS risk_checked_at  TIMESTAMP WITH TIME ZONE;

-- Index so the admin view "Suspicious vendors" is fast.
CREATE INDEX IF NOT EXISTS idx_vendors_is_suspicious
    ON vendors (is_suspicious)
    WHERE is_suspicious = true;

-- View that joins risk + verification so the admin dashboard can render
-- one query instead of two. The backend uses the service-role key so RLS
-- doesn't apply, but the view is also useful for ad-hoc SQL inspection.
CREATE OR REPLACE VIEW v_suspicious_vendors AS
SELECT
    id,
    business_name,
    email,
    phone,
    verification_status,
    risk_score,
    risk_reasons,
    risk_checked_at,
    created_at
FROM vendors
WHERE is_suspicious = true
   OR risk_score   >= 50;

-- Optional: notify admin via Formspree-style outbound webhook when a
-- suspicious vendor appears. Out of scope for the SQL file — handled in
-- the backend services layer.
