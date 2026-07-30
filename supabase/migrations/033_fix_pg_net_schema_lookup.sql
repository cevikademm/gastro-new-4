-- ─────────────────────────────────────────────────────────────────────
-- 033_fix_pg_net_schema_lookup.sql
-- DÜZELTME: pg_net'in şeması yanlış yerden okunuyordu.
--
-- Sorun: pg_extension.extnamespace bu projede 'public' gösteriyor, ama pg_net
-- yer değiştiremez (non-relocatable) — http_post gerçekte 'net' şemasında.
-- Bu yüzden trigger her seferinde
--   "function public.http_post(...) does not exist"
-- hatası alıp (EXCEPTION handler'ı sayesinde sessizce) webhook'u atlıyordu.
--
-- Çözüm: şemayı uzantının KENDİ http_post fonksiyonundan (pg_depend → pg_proc)
-- bul. Uzantı hangi şemaya kurulursa kurulsun doğru çalışır.
--
-- Etkilenen: public.notify_error_webhook() (031) · public.error_webhook_diagnostics() (032)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

-- ─── Ortak yardımcı: pg_net'in http_post'u hangi şemada? ──────────────
CREATE OR REPLACE FUNCTION public.pg_net_schema()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.nspname
    FROM pg_depend d
    JOIN pg_extension e  ON e.oid = d.refobjid AND e.extname = 'pg_net'
    JOIN pg_proc p       ON p.oid = d.objid AND d.classid = 'pg_proc'::regclass
    JOIN pg_namespace n  ON n.oid = p.pronamespace
   WHERE p.proname = 'http_post'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.pg_net_schema() FROM PUBLIC;

-- ─── notify_error_webhook — düzeltilmiş şema tespiti ──────────────────
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

  EXECUTE format(
    'SELECT %I.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 20000)',
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

-- ─── error_webhook_diagnostics — aynı düzeltme ────────────────────────
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
    'pg_net_schema',    v_schema,
    'pg_net_installed', v_schema IS NOT NULL,
    'enabled',          coalesce(v_enabled, 'false') = 'true',
    'url_set',          coalesce(btrim(coalesce(v_url, '')), '') <> '',
    'url',              v_url,
    'secret_len',       length(coalesce(v_secret, '')),
    'triggers',         v_triggers,
    'sent',             v_req_id IS NOT NULL,
    'send_error',       v_send_err,
    'response_status',  v_status,
    'response_body',    v_body,
    'response_error',   v_net_err
  );
END $$;

REVOKE ALL ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.error_webhook_diagnostics(BOOLEAN) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
