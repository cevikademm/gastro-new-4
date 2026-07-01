-- ─────────────────────────────────────────────────────────────────────
-- 018_error_reports.sql
-- Hata Bildirimi modülü — error_reports tablosu + RLS + Storage bucket.
-- UI: src/components/ErrorReportWidget.tsx · Panel: pages/admin/ErrorReportsPage.tsx
-- Ön koşul: public.is_admin() helper'ı (migration 008'de tanımlı).
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

-- ─── 1. Tablo ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.error_reports (
  id              TEXT PRIMARY KEY,
  reporter_name   TEXT,
  reporter_email  TEXT,
  reporter_role   TEXT,
  description     TEXT NOT NULL,
  page_url        TEXT,
  page_path       TEXT,
  user_agent      TEXT,
  screen_size     TEXT,
  app_version     TEXT,
  severity        TEXT DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high')),
  status          TEXT DEFAULT 'new'    CHECK (status IN ('new', 'in_progress', 'resolved')),
  screenshot_path TEXT,
  screenshot_url  TEXT,
  screenshot_data TEXT,   -- base64 fallback (yalnızca Storage upload başarısızsa)
  console_errors  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS error_reports_created_idx ON public.error_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS error_reports_status_idx  ON public.error_reports (status);

-- ─── 2. RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Admin → tam erişim (okuma/güncelleme/silme). is_admin() = profiles.role = 'admin'.
DROP POLICY IF EXISTS error_reports_admin_all ON public.error_reports;
CREATE POLICY error_reports_admin_all ON public.error_reports FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Authenticated kullanıcı yeni bildirim ekleyebilir (widget yalnızca admin'e görünür,
-- ama insert'i authenticated'e açıyoruz ki RLS reddi yaşanmasın).
DROP POLICY IF EXISTS error_reports_auth_insert ON public.error_reports;
CREATE POLICY error_reports_auth_insert ON public.error_reports FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── 3. Realtime (opsiyonel — panelde canlı güncelleme için) ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'error_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.error_reports;
  END IF;
END $$;

-- ─── 4. Storage bucket (error-screenshots, public) ──────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('error-screenshots', 'error-screenshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS error_screenshots_public_read ON storage.objects;
CREATE POLICY error_screenshots_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'error-screenshots');

DROP POLICY IF EXISTS error_screenshots_auth_upload ON storage.objects;
CREATE POLICY error_screenshots_auth_upload ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'error-screenshots');

DROP POLICY IF EXISTS error_screenshots_admin_manage ON storage.objects;
CREATE POLICY error_screenshots_admin_manage ON storage.objects FOR ALL
  USING (bucket_id = 'error-screenshots' AND public.is_admin())
  WITH CHECK (bucket_id = 'error-screenshots' AND public.is_admin());

NOTIFY pgrst, 'reload schema';
