-- ─────────────────────────────────────────────────────────────────────
-- 031_error_logs_and_webhook.sql
-- Otomatik hata giderme altyapısı — üç yeni tablo + RPC + webhook trigger'ı.
--
--   public.error_logs   → uygulamanın KENDİ yakaladığı hatalar (JS exception,
--                         unhandled promise, network/supabase hatası). Elle
--                         yazılan bildirimler (error_reports) ile karışmaz.
--   public.error_fixes  → her kayda ait işlem geçmişi: AI analizi, durum
--                         değişimi, webhook tetiklemesi (audit log).
--   public.app_settings → webhook URL + shared secret (admin'e açık ayar deposu).
--
--   public.log_client_error()   → anon/authenticated'ın güvenle yazabildiği TEK
--                                 kapı (SECURITY DEFINER + parmak izi ile tekilleme).
--   public.notify_error_webhook() → yeni hata düşünce pg_net ile edge function'ı
--                                 (supabase/functions/error-webhook) tetikler.
--
-- İstemci: src/lib/errorLog.ts · Panel: src/pages/admin/ErrorReportsPage.tsx
-- Ön koşul: public.is_admin() (migration 008) + error_reports (018, 030)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

-- ─── 0. pg_net (webhook için) ──────────────────────────────────────────
-- Yetki yoksa migration düşmesin; trigger zaten eklentiyi runtime'da arıyor.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net kurulamadı (%). Webhook devre dışı kalır.', SQLERRM;
END $$;

-- ─── 1. error_logs — otomatik yakalanan sistem hataları ────────────────
CREATE TABLE IF NOT EXISTS public.error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Aynı hatanın tekrarını tek satırda toplayan imza (mesaj + dosya + rota).
  fingerprint   TEXT NOT NULL,
  level         TEXT NOT NULL DEFAULT 'error'
                  CHECK (level IN ('error', 'warning', 'info')),
  source        TEXT NOT NULL DEFAULT 'window'
                  CHECK (source IN ('window', 'promise', 'console', 'react', 'network', 'supabase', 'manual')),
  message       TEXT NOT NULL,
  stack         TEXT,
  file_name     TEXT,
  line_no       INTEGER,
  col_no        INTEGER,
  page_url      TEXT,
  page_path     TEXT,
  user_agent    TEXT,
  screen_size   TEXT,
  app_version   TEXT,
  user_id       UUID,
  user_email    TEXT,
  user_role     TEXT,
  meta          JSONB   NOT NULL DEFAULT '{}'::jsonb,
  occurrences   INTEGER NOT NULL DEFAULT 1,
  severity      TEXT    NOT NULL DEFAULT 'normal'
                  CHECK (severity IN ('low', 'normal', 'high')),
  status        TEXT    NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'in_progress', 'resolved', 'ignored')),
  -- AI triyaj (error-webhook edge function doldurur)
  ai_prompt     TEXT,
  ai_prompt_at  TIMESTAMPTZ,
  ai_model      TEXT,
  ai_status     TEXT CHECK (ai_status IN ('queued', 'ok', 'failed', 'skipped')),
  ai_error      TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS error_logs_fingerprint_key ON public.error_logs (fingerprint);
CREATE INDEX IF NOT EXISTS error_logs_last_seen_idx ON public.error_logs (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_status_idx    ON public.error_logs (status);
CREATE INDEX IF NOT EXISTS error_logs_level_idx     ON public.error_logs (level);

COMMENT ON TABLE public.error_logs IS
  'Uygulamanın otomatik yakaladığı hatalar. Elle bildirimler için error_reports kullanılır.';

-- error_reports da aynı AI alan setine sahip olsun (030 ai_prompt''u eklemişti).
ALTER TABLE public.error_reports
  ADD COLUMN IF NOT EXISTS ai_status TEXT,
  ADD COLUMN IF NOT EXISTS ai_error  TEXT;

-- ─── 2. error_fixes — işlem geçmişi / audit ────────────────────────────
CREATE TABLE IF NOT EXISTS public.error_fixes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  TEXT REFERENCES public.error_reports(id) ON DELETE CASCADE,
  log_id     UUID REFERENCES public.error_logs(id)    ON DELETE CASCADE,
  kind       TEXT NOT NULL
               CHECK (kind IN ('webhook', 'ai_prompt', 'status_change', 'note')),
  status     TEXT NOT NULL DEFAULT 'ok'
               CHECK (status IN ('queued', 'ok', 'failed', 'skipped')),
  title      TEXT,
  detail     TEXT,
  model      TEXT,
  tokens_in  INTEGER,
  tokens_out INTEGER,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor      TEXT  NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT error_fixes_target_chk CHECK (report_id IS NOT NULL OR log_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS error_fixes_created_idx ON public.error_fixes (created_at DESC);
CREATE INDEX IF NOT EXISTS error_fixes_report_idx  ON public.error_fixes (report_id);
CREATE INDEX IF NOT EXISTS error_fixes_log_idx     ON public.error_fixes (log_id);

COMMENT ON TABLE public.error_fixes IS
  'Hata kayıtlarının işlem geçmişi: AI analizi, durum değişimi, webhook tetiklemesi.';

-- ─── 3. app_settings — webhook yapılandırması ──────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES
  ('error_webhook_enabled', 'false'),
  ('error_webhook_url',     ''),
  ('error_webhook_secret',  '')
ON CONFLICT (key) DO NOTHING;

-- ─── 4. RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.error_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_fixes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Yalnızca admin okur/yönetir. Yazma anon/authenticated için log_client_error()
-- RPC'si üzerinden yapılır (SECURITY DEFINER) — tabloya doğrudan insert yok.
DROP POLICY IF EXISTS error_logs_admin_all ON public.error_logs;
CREATE POLICY error_logs_admin_all ON public.error_logs FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS error_fixes_admin_all ON public.error_fixes;
CREATE POLICY error_fixes_admin_all ON public.error_fixes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS app_settings_admin_all ON public.app_settings;
CREATE POLICY app_settings_admin_all ON public.app_settings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─── 5. log_client_error() — istemcinin tek yazma kapısı ───────────────
-- Neden RPC? Tabloya anon INSERT açmak spam'e davetiye. Burada mesaj kırpılır,
-- imza üretilir, tekrar eden hata yeni satır açmaz (occurrences artar) ve
-- dakikalık sel freni vardır.
CREATE OR REPLACE FUNCTION public.log_client_error(
  p_message     TEXT,
  p_level       TEXT    DEFAULT 'error',
  p_source      TEXT    DEFAULT 'window',
  p_stack       TEXT    DEFAULT NULL,
  p_file_name   TEXT    DEFAULT NULL,
  p_line_no     INTEGER DEFAULT NULL,
  p_col_no      INTEGER DEFAULT NULL,
  p_page_url    TEXT    DEFAULT NULL,
  p_page_path   TEXT    DEFAULT NULL,
  p_user_agent  TEXT    DEFAULT NULL,
  p_screen_size TEXT    DEFAULT NULL,
  p_app_version TEXT    DEFAULT NULL,
  p_meta        JSONB   DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg    TEXT := NULLIF(btrim(left(coalesce(p_message, ''), 2000)), '');
  v_norm   TEXT;
  v_fp     TEXT;
  v_level  TEXT;
  v_source TEXT;
  v_sev    TEXT;
  v_recent INTEGER;
  v_email  TEXT;
  v_role   TEXT;
  v_id     UUID;
BEGIN
  IF v_msg IS NULL THEN RETURN NULL; END IF;

  v_level  := CASE WHEN p_level  IN ('error', 'warning', 'info') THEN p_level ELSE 'error' END;
  v_source := CASE WHEN p_source IN ('window', 'promise', 'console', 'react', 'network', 'supabase', 'manual')
                   THEN p_source ELSE 'manual' END;
  v_sev    := CASE v_level WHEN 'error' THEN 'high' WHEN 'warning' THEN 'normal' ELSE 'low' END;

  -- Sel freni: son 1 dakikada 200'den fazla YENİ imza açıldıysa yut.
  SELECT count(*) INTO v_recent
    FROM public.error_logs
   WHERE first_seen_at > now() - interval '1 minute';
  IF v_recent > 200 THEN RETURN NULL; END IF;

  -- Parmak izi: değişken kısımlar (id, sayı, uuid) sabitlenir ki "aynı hata"
  -- her seferinde yeni satır açmasın.
  v_norm := lower(v_msg);
  v_norm := regexp_replace(v_norm, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<uuid>', 'g');
  v_norm := regexp_replace(v_norm, '0x[0-9a-f]+', '<hex>', 'g');
  v_norm := regexp_replace(v_norm, '\d+', '<n>', 'g');
  v_fp   := md5(v_norm || '|' || coalesce(p_file_name, '') || '|' || coalesce(p_page_path, '') || '|' || v_source);

  -- Oturum açmışsa kim olduğunu da yaz (profiles yoksa sessizce geç).
  IF auth.uid() IS NOT NULL THEN
    BEGIN
      SELECT p.email, p.role::text INTO v_email, v_role
        FROM public.profiles p WHERE p.id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_email := NULL; v_role := NULL;
    END;
  END IF;

  INSERT INTO public.error_logs (
    fingerprint, level, source, message, stack, file_name, line_no, col_no,
    page_url, page_path, user_agent, screen_size, app_version,
    user_id, user_email, user_role, meta, severity
  ) VALUES (
    v_fp, v_level, v_source, v_msg,
    NULLIF(left(coalesce(p_stack, ''), 8000), ''),
    NULLIF(left(coalesce(p_file_name, ''), 500), ''),
    p_line_no, p_col_no,
    NULLIF(left(coalesce(p_page_url, ''), 1000), ''),
    NULLIF(left(coalesce(p_page_path, ''), 500), ''),
    NULLIF(left(coalesce(p_user_agent, ''), 500), ''),
    NULLIF(left(coalesce(p_screen_size, ''), 40), ''),
    NULLIF(left(coalesce(p_app_version, ''), 40), ''),
    auth.uid(), v_email, v_role, coalesce(p_meta, '{}'::jsonb), v_sev
  )
  ON CONFLICT (fingerprint) DO UPDATE SET
    occurrences  = error_logs.occurrences + 1,
    last_seen_at = now(),
    page_url     = COALESCE(EXCLUDED.page_url, error_logs.page_url),
    -- Çözüldü işaretlenmiş hata tekrar ederse yeniden açılır.
    status       = CASE WHEN error_logs.status = 'resolved' THEN 'new' ELSE error_logs.status END,
    resolved_at  = CASE WHEN error_logs.status = 'resolved' THEN NULL ELSE error_logs.resolved_at END
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Log yazamamak uygulamayı asla etkilememeli.
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.log_client_error(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_client_error(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- ─── 6. Webhook: yeni hata → error-webhook edge function ───────────────
-- pg_net'in hangi şemaya kurulduğu projeden projeye değişiyor (net / extensions),
-- bu yüzden çalışma anında bulunup dinamik çağrılıyor.
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

  SELECT n.nspname INTO v_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'pg_net';
  IF v_schema IS NULL THEN RETURN NEW; END IF;

  -- screenshot_data (base64) payload'ı şişirir — gönderme.
  v_body := jsonb_build_object(
    'type',   'INSERT',
    'table',  TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW) - 'screenshot_data'
  );
  v_headers := jsonb_build_object(
    'Content-Type',    'application/json',
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

DROP TRIGGER IF EXISTS error_reports_webhook ON public.error_reports;
CREATE TRIGGER error_reports_webhook
  AFTER INSERT ON public.error_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_error_webhook();

DROP TRIGGER IF EXISTS error_logs_webhook ON public.error_logs;
CREATE TRIGGER error_logs_webhook
  AFTER INSERT ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION public.notify_error_webhook();

-- ─── 7. Durum değişimlerini geçmişe yaz ────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_error_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  BEGIN
    v_actor := coalesce(auth.jwt() ->> 'email', 'system');
  EXCEPTION WHEN OTHERS THEN
    v_actor := 'system';
  END;

  IF TG_TABLE_NAME = 'error_reports' THEN
    INSERT INTO public.error_fixes (report_id, kind, status, title, actor)
    VALUES (NEW.id, 'status_change', 'ok', OLD.status || ' → ' || NEW.status, v_actor);
  ELSE
    INSERT INTO public.error_fixes (log_id, kind, status, title, actor)
    VALUES (NEW.id, 'status_change', 'ok', OLD.status || ' → ' || NEW.status, v_actor);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS error_reports_status_log ON public.error_reports;
CREATE TRIGGER error_reports_status_log
  AFTER UPDATE OF status ON public.error_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_error_status_change();

DROP TRIGGER IF EXISTS error_logs_status_log ON public.error_logs;
CREATE TRIGGER error_logs_status_log
  AFTER UPDATE OF status ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION public.log_error_status_change();

-- ─── 8. Realtime (panelde canlı akış) ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND tablename = 'error_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'error_logs realtime publication''a eklenemedi: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
