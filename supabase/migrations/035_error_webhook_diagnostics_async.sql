-- ─────────────────────────────────────────────────────────────────────
-- 035_error_webhook_diagnostics_async.sql
-- DÜZELTME: teşhis RPC'si kendi işlemi içinde yanıt beklemeye çalışıyordu.
--
-- Sorun: pg_net isteği ancak çağıran işlem COMMIT olduktan sonra arka plan
-- worker'ı tarafından gönderilir. Aynı işlem içinde pg_sleep ile beklemek
-- yanıtı asla göremez; PostgREST'in statement timeout'una takılıp
-- "canceling statement due to statement timeout" verir.
--
-- Çözüm: iki adım.
--   1. error_webhook_diagnostics(p_send) → isteği kuyruğa atar, request_id döner
--   2. error_webhook_test_result(request_id) → birkaç saniye sonra yanıtı okur
--
-- Panel: src/pages/admin/errorReports/AutomationPanel.tsx → "Bağlantıyı Test Et"
-- Ön koşul: 031, 032, 033
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.error_webhook_diagnostics(p_send BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema   TEXT;
  v_enabled  TEXT;
  v_url      TEXT;
  v_secret   TEXT;
  v_triggers INTEGER;
  v_req_id   BIGINT;
  v_send_err TEXT;
BEGIN
  IF NOT (coalesce(auth.role(), '') = 'service_role' OR public.is_admin()) THEN
    RAISE EXCEPTION 'Bu işlem yalnızca admin kullanıcılar içindir';
  END IF;

  v_schema := public.pg_net_schema();

  SELECT value INTO v_enabled FROM public.app_settings WHERE key = 'error_webhook_enabled';
  SELECT value INTO v_url     FROM public.app_settings WHERE key = 'error_webhook_url';
  SELECT value INTO v_secret  FROM public.app_settings WHERE key = 'error_webhook_secret';

  SELECT count(*) INTO v_triggers
    FROM pg_trigger
   WHERE NOT tgisinternal
     AND tgname IN ('error_reports_webhook', 'error_logs_webhook');

  IF p_send AND v_schema IS NOT NULL AND coalesce(btrim(coalesce(v_url, '')), '') <> '' THEN
    BEGIN
      EXECUTE format(
        'SELECT %I.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 20000)',
        v_schema
      )
      INTO v_req_id
      USING
        v_url,
        jsonb_build_object('type', 'PING', 'table', 'error_logs', 'record', jsonb_build_object('id', 'ping')),
        jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(v_secret, ''));
    EXCEPTION WHEN OTHERS THEN
      v_send_err := SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'pg_net_schema',    v_schema,
    'pg_net_installed', v_schema IS NOT NULL,
    'enabled',          coalesce(v_enabled, 'false') = 'true',
    'url_set',          coalesce(btrim(coalesce(v_url, '')), '') <> '',
    'url',              v_url,
    'secret_len',       length(coalesce(v_secret, '')),
    'triggers',         v_triggers,
    'sent',             v_req_id IS NOT NULL,
    'request_id',       v_req_id,
    'send_error',       v_send_err
  );
END $$;

-- ─── Yanıtı ayrı çağrıda oku (istek COMMIT sonrası gönderildiği için) ──
CREATE OR REPLACE FUNCTION public.error_webhook_test_result(p_request_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema TEXT;
  v_status INTEGER;
  v_body   TEXT;
  v_err    TEXT;
  v_found  BOOLEAN := false;
BEGIN
  IF NOT (coalesce(auth.role(), '') = 'service_role' OR public.is_admin()) THEN
    RAISE EXCEPTION 'Bu işlem yalnızca admin kullanıcılar içindir';
  END IF;

  v_schema := public.pg_net_schema();
  IF v_schema IS NULL THEN
    RETURN jsonb_build_object('pending', false, 'error', 'pg_net kurulu değil');
  END IF;

  BEGIN
    EXECUTE format(
      'SELECT true, status_code, left(content, 800), error_msg FROM %I._http_response WHERE id = $1',
      v_schema
    ) INTO v_found, v_status, v_body, v_err USING p_request_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('pending', false, 'error', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'pending', NOT coalesce(v_found, false),
    'status',  v_status,
    'body',    v_body,
    'error',   v_err
  );
END $$;

REVOKE ALL ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.error_webhook_test_result(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.error_webhook_test_result(BIGINT)  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
