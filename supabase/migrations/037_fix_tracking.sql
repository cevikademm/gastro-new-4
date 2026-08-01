-- ─────────────────────────────────────────────────────────────────────
-- 037_fix_tracking.sql
-- "Düzeltme uygulandı" kavramını sisteme sokar.
--
-- Bugüne kadar bir hatanın çözüldüğünü gösteren tek sinyal status='resolved'
-- idi: yanında ne commit bağlantısı, ne özet, ne doğrulama kaydı vardı.
-- Bu migration hem error_reports hem error_logs'a ortak bir DÜZELTME DURUM
-- MAKİNESİ ekler ve otomatik düzeltme ajanının kuyruğunu (fix_agent_queue)
-- tanımlar.
--
--   none → eligible → claimed → committed → deployed → verified
--                        ├→ skipped (ajan vazgeçti)
--                        └→ failed  (kapı düştü; 2 denemeden sonra manual)
--   deployed → revert_requested → reverted   (hata dağıtımdan sonra tekrar etti)
--   her durumdan → manual                    (admin devraldı)
--
-- Ayrıca error_reports.ai_status'e CHECK ekler — error_logs'ta vardı, burada yoktu.
--
-- Ajan: supabase/functions/fix-agent · İstemci: src/lib/fixAgent.ts
-- Ön koşul: 018 (error_reports), 031 (error_logs), 034 (description_ai)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

-- ─── 1. Ortak düzeltme kolonları ───────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['error_reports', 'error_logs'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '%: tablo yok, atlandı.', t;
      CONTINUE;
    END IF;

    EXECUTE format($f$
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS fix_status        TEXT NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS fix_attempt_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS fix_claimed_at    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS fix_run_id        TEXT,
        ADD COLUMN IF NOT EXISTS fix_commit_sha    TEXT,
        ADD COLUMN IF NOT EXISTS fix_commit_url    TEXT,
        ADD COLUMN IF NOT EXISTS fix_files         JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS fix_lines_changed INTEGER,
        ADD COLUMN IF NOT EXISTS fix_summary       TEXT,
        ADD COLUMN IF NOT EXISTS fix_technical     TEXT,
        ADD COLUMN IF NOT EXISTS fix_skip_reason   TEXT,
        ADD COLUMN IF NOT EXISTS fix_error         TEXT,
        ADD COLUMN IF NOT EXISTS fix_agent_model   TEXT,
        ADD COLUMN IF NOT EXISTS committed_at      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS deployed_at       TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS verified_at       TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reverted_at       TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS fix_notified_at   TIMESTAMPTZ
    $f$, t);

    -- Durum makinesi kısıtı (önce normalize et — idempotent tekrar çalıştırmada
    -- geçersiz değer kalmış olabilir).
    EXECUTE format(
      'UPDATE public.%I SET fix_status = ''none'' WHERE fix_status IS NULL OR fix_status NOT IN
       (''none'',''eligible'',''claimed'',''committed'',''deployed'',''verified'',
        ''failed'',''skipped'',''revert_requested'',''reverted'',''manual'')', t);

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_fix_status_chk');
    EXECUTE format($f$
      ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (fix_status IN
        ('none','eligible','claimed','committed','deployed','verified',
         'failed','skipped','revert_requested','reverted','manual'))
    $f$, t, t || '_fix_status_chk');

    -- Kuyruk taraması için indeks. Zaman kolonu tabloya göre değişiyor:
    -- error_reports'ta created_at, error_logs'ta last_seen_at.
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (fix_status, severity, %I DESC)',
      t || '_fix_status_idx', t,
      CASE WHEN t = 'error_logs' THEN 'last_seen_at' ELSE 'created_at' END);
  END LOOP;
END $$;

-- ─── 2. error_reports.ai_status CHECK (error_logs'ta var, burada yoktu) ──
UPDATE public.error_reports
   SET ai_status = NULL
 WHERE ai_status IS NOT NULL
   AND ai_status NOT IN ('queued', 'ok', 'failed', 'skipped');

ALTER TABLE public.error_reports DROP CONSTRAINT IF EXISTS error_reports_ai_status_chk;
ALTER TABLE public.error_reports
  ADD CONSTRAINT error_reports_ai_status_chk
  CHECK (ai_status IS NULL OR ai_status IN ('queued', 'ok', 'failed', 'skipped'));

-- ─── 3. error_reports.updated_at (error_logs'ta last_seen_at bu işi görüyor) ──
ALTER TABLE public.error_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS error_reports_touch_updated ON public.error_reports;
CREATE TRIGGER error_reports_touch_updated
  BEFORE UPDATE ON public.error_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON COLUMN public.error_reports.fix_summary IS
  'Kullanıcıya gösterilecek sade dilde özet. Changelog ve bildirim e-postasında AYNEN yayınlanır.';
COMMENT ON COLUMN public.error_reports.fix_commit_sha IS
  'Düzeltmenin commit''i. Geri alma: git revert <sha>.';

NOTIFY pgrst, 'reload schema';
