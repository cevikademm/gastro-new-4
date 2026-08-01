-- ─────────────────────────────────────────────────────────────────────
-- 039_changelog.sql
-- Müşteri portalındaki "Neler Düzeldi" akışı.
--
-- Otomatik düzeltme ajanı bir hatayı çözüp canlıya aldığında buraya sade
-- dilde bir kayıt düşer. Amaç: bir hatayı bildiren kişinin sonucu
-- öğrenebilmesi — bugün bunun hiçbir yolu yok.
--
--   summary → kullanıcıya gösterilen metin (teknik terim, dosya adı YOK)
--   detail  → geliştirici notu (yalnızca admin görür)
--
-- status akışı: pending (commit'lendi) → published (canlıya çıktı)
--                                      → reverted (geri alındı — silinmez,
--                                        dürüstlük kaydı olarak kalır)
--
-- Sayfa: src/pages/changelog/ChangelogPage.tsx · İstemci: src/lib/changelog.ts
-- Ön koşul: 018, 031, 037
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.changelog_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE,
  title        TEXT NOT NULL,
  -- Kullanıcıya gösterilen sade dil özeti. "X yaparken Y oluyordu, artık Z."
  summary      TEXT NOT NULL,
  -- Teknik not (admin görür).
  detail       TEXT,
  category     TEXT NOT NULL DEFAULT 'fix'
                 CHECK (category IN ('fix', 'improvement', 'feature')),
  severity     TEXT,
  source_kind  TEXT CHECK (source_kind IN ('error_report', 'error_log', 'manual')),
  report_id    TEXT REFERENCES public.error_reports(id) ON DELETE SET NULL,
  log_id       UUID REFERENCES public.error_logs(id)    ON DELETE SET NULL,
  commit_sha   TEXT,
  commit_url   TEXT,
  files        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'published', 'reverted', 'hidden')),
  actor        TEXT NOT NULL DEFAULT 'fix-agent',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  deployed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS changelog_published_idx
  ON public.changelog_entries (status, published_at DESC);
CREATE INDEX IF NOT EXISTS changelog_commit_idx
  ON public.changelog_entries (commit_sha);

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- Yayınlananları herkes okuyabilir (portal sayfası + SEO).
DROP POLICY IF EXISTS changelog_public_read ON public.changelog_entries;
CREATE POLICY changelog_public_read ON public.changelog_entries FOR SELECT
  USING (status IN ('published', 'reverted'));

-- Admin tam erişim.
DROP POLICY IF EXISTS changelog_admin_all ON public.changelog_entries;
CREATE POLICY changelog_admin_all ON public.changelog_entries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Panelde/zilde canlı akış.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'changelog_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.changelog_entries;
  END IF;
END $$;

COMMENT ON TABLE public.changelog_entries IS
  'Müşteriye dönük "Neler Düzeldi" akışı. summary sade dilde, detail teknik.';

NOTIFY pgrst, 'reload schema';
