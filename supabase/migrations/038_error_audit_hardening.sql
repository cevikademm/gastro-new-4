-- ─────────────────────────────────────────────────────────────────────
-- 038_error_audit_hardening.sql
-- İşlem geçmişini (error_fixes) kalıcı ve eksiksiz hâle getirir.
--
-- ÜÇ SORUN:
--  1) FK'ler ON DELETE CASCADE idi → bir hata kaydını silmek TÜM audit
--     geçmişini de siliyordu. "Bu neydi, kim çözdü, ne yapıldı" sorusu
--     kayıt silinince sonsuza dek cevapsız kalıyordu.
--  2) Silme işlemi hiçbir yere yazılmıyordu (kim, ne zaman, neden).
--  3) error_fixes.status='queued' satırları asılı kalıyordu: error-webhook
--     "ai_prompt zaten var" / "açıklama çok kısa" yollarında erken return
--     ediyor, kapatma kodu hiç çalışmıyordu.
--
-- ÇÖZÜM: FK'ler ON DELETE SET NULL + denormalize target_kind/target_ref
-- (kayıt silinse bile geçmiş satırı hangi kayda ait olduğunu bilir),
-- tombstone soft-delete, ve bayat queued satırlarını kapatan yardımcı.
--
-- Ön koşul: 031 (error_fixes), 037 (fix_* kolonları)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

-- ─── 1. error_fixes: kind genişletme ───────────────────────────────────
ALTER TABLE public.error_fixes DROP CONSTRAINT IF EXISTS error_fixes_kind_check;
ALTER TABLE public.error_fixes
  ADD CONSTRAINT error_fixes_kind_check CHECK (kind IN (
    'webhook', 'ai_prompt', 'status_change', 'note',
    -- 038 ile gelenler
    'whatsapp', 'email', 'notify', 'delete',
    'agent_claim', 'agent_fix', 'agent_skip', 'agent_revert', 'deploy'
  ));

-- ─── 2. Kayıt silinse bile geçmiş hayatta kalsın ───────────────────────
ALTER TABLE public.error_fixes
  ADD COLUMN IF NOT EXISTS target_kind TEXT,
  ADD COLUMN IF NOT EXISTS target_ref  TEXT;

-- Mevcut satırları doldur.
UPDATE public.error_fixes
   SET target_kind = CASE WHEN report_id IS NOT NULL THEN 'report' ELSE 'log' END,
       target_ref  = COALESCE(report_id, log_id::text)
 WHERE target_ref IS NULL;

-- FK'leri CASCADE → SET NULL olarak yeniden kur.
ALTER TABLE public.error_fixes DROP CONSTRAINT IF EXISTS error_fixes_report_id_fkey;
ALTER TABLE public.error_fixes
  ADD CONSTRAINT error_fixes_report_id_fkey
  FOREIGN KEY (report_id) REFERENCES public.error_reports(id) ON DELETE SET NULL;

ALTER TABLE public.error_fixes DROP CONSTRAINT IF EXISTS error_fixes_log_id_fkey;
ALTER TABLE public.error_fixes
  ADD CONSTRAINT error_fixes_log_id_fkey
  FOREIGN KEY (log_id) REFERENCES public.error_logs(id) ON DELETE SET NULL;

-- Eski kısıt "report_id veya log_id dolu olmalı" diyordu; SET NULL sonrası
-- ikisi de boşalabilir. Artık target_ref taşıyıcı.
ALTER TABLE public.error_fixes DROP CONSTRAINT IF EXISTS error_fixes_target_chk;
ALTER TABLE public.error_fixes
  ADD CONSTRAINT error_fixes_target_chk CHECK (
    target_ref IS NOT NULL OR report_id IS NOT NULL OR log_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS error_fixes_target_idx ON public.error_fixes (target_kind, target_ref);

-- target_kind/target_ref'i otomatik dolduran trigger — çağıranların
-- unutmasına izin verme.
CREATE OR REPLACE FUNCTION public.fill_error_fix_target()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.target_ref IS NULL THEN
    NEW.target_kind := CASE WHEN NEW.report_id IS NOT NULL THEN 'report' ELSE 'log' END;
    NEW.target_ref  := COALESCE(NEW.report_id, NEW.log_id::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS error_fixes_fill_target ON public.error_fixes;
CREATE TRIGGER error_fixes_fill_target
  BEFORE INSERT ON public.error_fixes
  FOR EACH ROW EXECUTE FUNCTION public.fill_error_fix_target();

-- ─── 3. Tombstone (soft delete) ────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['error_reports', 'error_logs'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format($f$
      ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS deleted_by    TEXT,
        ADD COLUMN IF NOT EXISTS delete_reason TEXT
    $f$, t);
    -- Zaman kolonu tabloya göre: error_reports=created_at, error_logs=last_seen_at.
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I DESC) WHERE deleted_at IS NULL',
      t || '_live_idx', t,
      CASE WHEN t = 'error_logs' THEN 'last_seen_at' ELSE 'created_at' END);
  END LOOP;
END $$;

/**
 * Kaydı silinmiş işaretler ve geçmişe iz bırakır. Gerçek DELETE yapmaz —
 * audit zinciri korunur. Panel bu RPC'yi çağırır.
 */
CREATE OR REPLACE FUNCTION public.soft_delete_error_record(
  p_kind   TEXT,          -- 'report' | 'log'
  p_id     TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor TEXT := COALESCE(auth.jwt() ->> 'email', 'admin');
  v_hit   INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;

  IF p_kind = 'report' THEN
    UPDATE public.error_reports
       SET deleted_at = now(), deleted_by = v_actor, delete_reason = p_reason
     WHERE id = p_id AND deleted_at IS NULL;
    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit > 0 THEN
      INSERT INTO public.error_fixes (report_id, target_kind, target_ref, kind, status, title, detail, actor)
      VALUES (p_id, 'report', p_id, 'delete', 'ok', 'Kayıt silindi (arşive alındı)', p_reason, v_actor);
    END IF;
  ELSIF p_kind = 'log' THEN
    UPDATE public.error_logs
       SET deleted_at = now(), deleted_by = v_actor, delete_reason = p_reason
     WHERE id = p_id::uuid AND deleted_at IS NULL;
    GET DIAGNOSTICS v_hit = ROW_COUNT;
    IF v_hit > 0 THEN
      INSERT INTO public.error_fixes (log_id, target_kind, target_ref, kind, status, title, detail, actor)
      VALUES (p_id::uuid, 'log', p_id, 'delete', 'ok', 'Kayıt silindi (arşive alındı)', p_reason, v_actor);
    END IF;
  ELSE
    RAISE EXCEPTION 'Geçersiz p_kind: %', p_kind;
  END IF;

  RETURN v_hit > 0;
END $$;

GRANT EXECUTE ON FUNCTION public.soft_delete_error_record(TEXT, TEXT, TEXT) TO authenticated;

-- ─── 4. Asılı queued satırlarını kapat ─────────────────────────────────
/**
 * error-webhook'un erken dönüş yollarında kapatılamayan 'queued' izlerini
 * zaman aşımına uğratır. fix-agent claim'i her koşuda bunu çağırır.
 */
CREATE OR REPLACE FUNCTION public.close_stale_fix_events(p_older_than INTERVAL DEFAULT '30 minutes')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.error_fixes
     SET status = 'failed',
         title  = COALESCE(title, '') || ' · zaman aşımı (yanıtsız kaldı)'
   WHERE status = 'queued'
     AND created_at < now() - p_older_than;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- Geçmiş kalıntıları tek seferlik temizle.
SELECT public.close_stale_fix_events('30 minutes');

NOTIFY pgrst, 'reload schema';
