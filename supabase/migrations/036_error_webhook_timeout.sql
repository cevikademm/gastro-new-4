-- ─────────────────────────────────────────────────────────────────────
-- 036_error_webhook_timeout.sql
-- DÜZELTME: pg_net timeout'u (20 sn) Claude çağrısından kısaydı.
--
-- Gözlem: Haiku triyajı uçtan uca ~25-30 sn sürüyor. Edge function işini
-- bitirip kaydı doğru yazıyordu, ama pg_net 20 sn'de vazgeçtiği için
-- net._http_response'a "Timeout of 20000 ms reached" düşüyor ve
-- error_fixes'teki 'webhook' satırı sonsuza dek 'queued' kalıyordu.
--
-- Çözüm: timeout 55 sn. (Supabase edge function duvar saati sınırından kısa.)
--
-- Etkilenen: public.notify_error_webhook() · public.error_webhook_diagnostics()
-- Ön koşul: 031, 033, 035
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_error_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled TEXT;
  v_url     TEXT;
  v_secret  TEXT;
  v_schema  TEXT;
  v_body    JSONB;
  v_headers JSONB;
BEGIN
  SELECT value INTO v_enabled FROM public.app_settings WHERE key = 'error_webhook_enabled';
  IF coalesce(v_enabled, 'false') <> 'true' THEN RETURN NEW; END IF;

  SELECT value INTO v_url    FROM public.app_settings WHERE key = 'error_webhook_url';
  SELECT value INTO v_secret FROM public.app_settings WHERE key = 'error_webhook_secret';
  IF coalesce(btrim(coalesce(v_url, '')), '') = '' THEN RETURN NEW; END IF;

  v_schema := public.pg_net_schema();
  IF v_schema IS NULL THEN RETURN NEW; END IF;

  -- screenshot_data (base64) payload'ı şişirir — gönderme.
  v_body := jsonb_build_object(
    'type',   'INSERT',
    'table',  TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW) - 'screenshot_data'
  );
  v_headers := jsonb_build_object(
    'Content-Type',     'application/json',
    'x-webhook-secret', coalesce(v_secret, '')
  );

  -- 55 sn: Claude triyajı ~25-30 sn sürebiliyor.
  EXECUTE format(
    'SELECT %I.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 55000)',
    v_schema
  ) USING v_url, v_body, v_headers;

  IF TG_TABLE_NAME = 'error_reports' THEN
    INSERT INTO public.error_fixes (report_id, kind, status, title, actor)
    VALUES (NEW.id, 'webhook', 'queued', 'Webhook tetiklendi → error-webhook', 'system');
  ELSE
    INSERT INTO public.error_fixes (log_id, kind, status, title, actor)
    VALUES (NEW.id, 'webhook', 'queued', 'Webhook tetiklendi → error-webhook', 'system');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Webhook hatası kaydın yazılmasını ASLA engellemez.
  RETURN NEW;
END $$;

-- Teşhis PING'i de aynı süreyi kullansın.
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
        'SELECT %I.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 55000)',
        v_schema
      )
      INTO v_req_id
      USING
        v_url,
        -- type=PING: edge function Claude'u çağırmadan yalnızca sağlık cevabı döner.
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

REVOKE ALL ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
