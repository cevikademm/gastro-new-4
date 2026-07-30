-- ─────────────────────────────────────────────────────────────────────
-- 032_error_webhook_diagnostics.sql
-- Webhook zincirini panelden test edip teşhis edebilmek için tek RPC.
--
--   public.error_webhook_diagnostics(p_send boolean)
--     → pg_net kurulu mu / hangi şemada, ayarlar dolu mu, trigger'lar duruyor mu,
--       ve p_send=true ise gerçek bir test POST'u atıp pg_net yanıtını okur.
--
-- Panel: src/pages/admin/errorReports/AutomationPanel.tsx → "Bağlantıyı Test Et"
-- Ön koşul: migration 031
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.error_webhook_diagnostics(p_send BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema    TEXT;
  v_enabled   TEXT;
  v_url       TEXT;
  v_secret    TEXT;
  v_triggers  INTEGER;
  v_req_id    BIGINT;
  v_send_err  TEXT;
  v_status    INTEGER;
  v_body      TEXT;
  v_net_err   TEXT;
  v_waited    INTEGER := 0;
BEGIN
  -- Admin ya da service_role dışında kimse çağıramaz.
  IF NOT (coalesce(auth.role(), '') = 'service_role' OR public.is_admin()) THEN
    RAISE EXCEPTION 'Bu işlem yalnızca admin kullanıcılar içindir';
  END IF;

  SELECT n.nspname INTO v_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'pg_net';

  SELECT value INTO v_enabled FROM public.app_settings WHERE key = 'error_webhook_enabled';
  SELECT value INTO v_url     FROM public.app_settings WHERE key = 'error_webhook_url';
  SELECT value INTO v_secret  FROM public.app_settings WHERE key = 'error_webhook_secret';

  SELECT count(*) INTO v_triggers
    FROM pg_trigger
   WHERE NOT tgisinternal
     AND tgname IN ('error_reports_webhook', 'error_logs_webhook');

  -- ─── İstenirse gerçek bir test POST'u at ───────────────────────────
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

    -- pg_net asenkron çalışır; yanıtı kısa süre bekleyip okuyoruz.
    IF v_req_id IS NOT NULL THEN
      WHILE v_waited < 20 AND v_status IS NULL AND v_net_err IS NULL LOOP
        PERFORM pg_sleep(0.5);
        v_waited := v_waited + 1;
        BEGIN
          EXECUTE format(
            'SELECT status_code, left(content, 500), error_msg FROM %I._http_response WHERE id = $1',
            v_schema
          ) INTO v_status, v_body, v_net_err USING v_req_id;
        EXCEPTION WHEN OTHERS THEN
          v_net_err := SQLERRM;
        END;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'pg_net_schema',   v_schema,
    'pg_net_installed', v_schema IS NOT NULL,
    'enabled',         coalesce(v_enabled, 'false') = 'true',
    'url_set',         coalesce(btrim(coalesce(v_url, '')), '') <> '',
    'url',             v_url,
    'secret_len',      length(coalesce(v_secret, '')),
    'triggers',        v_triggers,
    'sent',            v_req_id IS NOT NULL,
    'send_error',      v_send_err,
    'response_status', v_status,
    'response_body',   v_body,
    'response_error',  v_net_err
  );
END $$;

REVOKE ALL ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
