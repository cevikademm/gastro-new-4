-- 011_external_api.sql
-- External, multi-tenant, read-only REST API infrastructure.
-- Adds: api_keys (hashed keys), api_usage_counters (atomic rate-limit + monthly quota),
-- and two SECURITY DEFINER functions (api_authenticate, api_consume) that the
-- `api-gateway` edge function calls via the service-role client.
--
-- Tenant model (v1): each API customer = one existing profiles/auth.users account.
-- Reuses: public.is_admin() (008), set_updated_at() (005), enum-creation idiom (005).
-- Catalog tables (products/brands/categories) are NOT modified — the gateway reads
-- them with an explicit `is_active = true` filter.

-- ============================================================
-- 0. Enums
-- ============================================================
DO $$ BEGIN
  CREATE TYPE api_environment AS ENUM ('live', 'sandbox');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE api_period_kind AS ENUM ('minute', 'month');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. api_keys  (only the SHA-256 hash is ever stored)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  key_prefix         TEXT NOT NULL,                      -- non-secret display label, e.g. '2mc_live_a1b2'
  key_hash           TEXT NOT NULL,                      -- SHA-256 hex (64 chars) of the full raw key
  scopes             TEXT[] NOT NULL DEFAULT '{products:read}',
  environment        api_environment NOT NULL DEFAULT 'live',
  allowed_origins    TEXT[] NOT NULL DEFAULT '{}',       -- CORS allowlist; empty = no browser origin echoed
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  quota_monthly      INTEGER,                            -- NULL = unlimited
  revoked            BOOLEAN NOT NULL DEFAULT false,
  expires_at         TIMESTAMPTZ,                        -- NULL = never expires
  last_used_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT api_keys_key_hash_len   CHECK (char_length(key_hash) = 64),
  CONSTRAINT api_keys_rate_positive  CHECK (rate_limit_per_min > 0),
  CONSTRAINT api_keys_quota_positive CHECK (quota_monthly IS NULL OR quota_monthly >= 0)
);

-- O(1) auth lookup + global uniqueness of a key
CREATE UNIQUE INDEX IF NOT EXISTS uq_api_keys_key_hash    ON api_keys(key_hash);
CREATE INDEX        IF NOT EXISTS idx_api_keys_owner      ON api_keys(owner_id);
CREATE INDEX        IF NOT EXISTS idx_api_keys_owner_live ON api_keys(owner_id) WHERE revoked = false;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON api_keys;
CREATE TRIGGER trg_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. api_usage_counters  (one table: minute window + month quota)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage_counters (
  api_key_id   UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  period_kind  api_period_kind NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,                     -- UTC-truncated bucket start
  count        BIGINT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (api_key_id, period_kind, period_start)
);

-- Drives the stale-minute-bucket cleanup
CREATE INDEX IF NOT EXISTS idx_usage_kind_period ON api_usage_counters(period_kind, period_start);

-- ============================================================
-- 3. api_authenticate(p_key_hash)  — validate + fetch policy
-- ============================================================
CREATE OR REPLACE FUNCTION public.api_authenticate(p_key_hash TEXT)
RETURNS TABLE (
  id                 UUID,
  owner_id           UUID,
  scopes             TEXT[],
  environment        api_environment,
  allowed_origins    TEXT[],
  rate_limit_per_min INTEGER,
  quota_monthly      INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT k.id, k.owner_id, k.scopes, k.environment,
         k.allowed_origins, k.rate_limit_per_min, k.quota_monthly
  FROM public.api_keys k
  WHERE k.key_hash = p_key_hash
    AND k.revoked = false
    AND (k.expires_at IS NULL OR k.expires_at > now())
  LIMIT 1;
$$;

-- ============================================================
-- 4. api_consume(...)  — atomic rate-limit + monthly quota meter
--    Race-safe: increment-then-compare via a single ON CONFLICT upsert.
-- ============================================================
CREATE OR REPLACE FUNCTION public.api_consume(
  p_key_id       UUID,
  p_minute_limit INTEGER,
  p_month_quota  INTEGER          -- NULL = unlimited
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now          TIMESTAMPTZ := now();
  v_minute_start TIMESTAMPTZ := date_trunc('minute', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_month_start  TIMESTAMPTZ := date_trunc('month',  v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_next_minute  TIMESTAMPTZ := v_minute_start + interval '1 minute';
  v_retry_after  INTEGER := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_next_minute - v_now)))::int);
  v_minute_count BIGINT;
  v_month_count  BIGINT;
BEGIN
  -- 1) MINUTE WINDOW — atomic increment-then-read (no check-then-increment race)
  INSERT INTO api_usage_counters (api_key_id, period_kind, period_start, count, updated_at)
  VALUES (p_key_id, 'minute', v_minute_start, 1, v_now)
  ON CONFLICT (api_key_id, period_kind, period_start)
  DO UPDATE SET count = api_usage_counters.count + 1, updated_at = v_now
  RETURNING count INTO v_minute_count;

  IF v_minute_count > p_minute_limit THEN
    -- Rate limited: month quota deliberately NOT consumed.
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit',
      'minute_remaining', 0,
      'month_remaining', NULL,
      'retry_after', v_retry_after
    );
  END IF;

  -- 2) MONTH QUOTA — only reached when the minute window passed
  INSERT INTO api_usage_counters (api_key_id, period_kind, period_start, count, updated_at)
  VALUES (p_key_id, 'month', v_month_start, 1, v_now)
  ON CONFLICT (api_key_id, period_kind, period_start)
  DO UPDATE SET count = api_usage_counters.count + 1, updated_at = v_now
  RETURNING count INTO v_month_count;

  IF p_month_quota IS NOT NULL AND v_month_count > p_month_quota THEN
    -- Over quota: roll back the +1 so the stored count == requests actually served.
    UPDATE api_usage_counters
       SET count = count - 1
     WHERE api_key_id = p_key_id
       AND period_kind = 'month'
       AND period_start = v_month_start;

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'minute_remaining', GREATEST(0, p_minute_limit - v_minute_count)::int,
      'month_remaining', 0,
      'retry_after', CEIL(EXTRACT(EPOCH FROM (
                       (date_trunc('month', v_now AT TIME ZONE 'UTC') + interval '1 month')
                       AT TIME ZONE 'UTC' - v_now)))::int
    );
  END IF;

  -- 3) Throttled last_used_at — only on the first request of each minute window
  IF v_minute_count = 1 THEN
    UPDATE api_keys SET last_used_at = v_now WHERE id = p_key_id;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'minute_remaining', GREATEST(0, p_minute_limit - v_minute_count)::int,
    'month_remaining',  CASE WHEN p_month_quota IS NULL
                             THEN NULL
                             ELSE GREATEST(0, p_month_quota - v_month_count)::int END,
    'retry_after', 0
  );
END;
$$;

-- ============================================================
-- 5. RLS + safe view + grants
-- ============================================================
ALTER TABLE api_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_counters ENABLE ROW LEVEL SECURITY;

-- api_keys: no direct base-table grant to clients (RLS can't hide the key_hash column).
-- Owners read their own rows, admins read all — these policies govern the security_invoker
-- view below. All writes go through the service-role edge function (bypasses RLS).
DROP POLICY IF EXISTS "Owners read own api keys" ON api_keys;
CREATE POLICY "Owners read own api keys" ON api_keys
  FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all api keys" ON api_keys;
CREATE POLICY "Admins read all api keys" ON api_keys
  FOR SELECT USING (public.is_admin());

-- Safe projection — excludes key_hash by construction. Runs with the view owner's
-- rights (so callers need no base-table grant) and scopes rows itself: a caller sees
-- only their own keys, admins see all. security_barrier blocks leaky predicates.
CREATE OR REPLACE VIEW api_keys_public
WITH (security_barrier = true) AS
  SELECT id, owner_id, name, key_prefix, scopes, environment,
         allowed_origins, rate_limit_per_min, quota_monthly,
         revoked, expires_at, last_used_at, created_at, updated_at
  FROM api_keys
  WHERE owner_id = auth.uid() OR public.is_admin();

-- api_usage_counters: admins may read for dashboards; no anon/authenticated access.
DROP POLICY IF EXISTS "Admins read api usage" ON api_usage_counters;
CREATE POLICY "Admins read api usage" ON api_usage_counters
  FOR SELECT USING (public.is_admin());

-- Lock down direct table access; expose only the safe view to logged-in users.
REVOKE ALL ON api_keys           FROM anon, authenticated;
REVOKE ALL ON api_usage_counters FROM anon, authenticated;
GRANT  SELECT ON api_keys_public TO authenticated;

-- Metering functions: callable only by the service-role gateway.
REVOKE ALL ON FUNCTION public.api_authenticate(TEXT)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.api_consume(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.api_authenticate(TEXT)            TO service_role;
GRANT EXECUTE ON FUNCTION public.api_consume(UUID, INTEGER, INTEGER) TO service_role;

-- ============================================================
-- 6. Stale minute-bucket cleanup (best-effort; only if pg_cron present)
-- ============================================================
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'api-usage-minute-cleanup',
      '7 * * * *',
      'DELETE FROM public.api_usage_counters WHERE period_kind = ''minute'' AND period_start < now() - interval ''1 day'';'
    );
  END IF;
END
$do$;
