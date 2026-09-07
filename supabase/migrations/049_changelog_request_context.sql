-- ─────────────────────────────────────────────────────────────────────
-- 049_changelog_request_context.sql
-- "Neler Düzeldi" (/degisiklikler) girdisine BİLDİRENİN KENDİ CÜMLESİNİ ekler.
--
-- Sorun: portalda yalnızca bizim yazdığımız çözüm özeti görünüyordu. Bir sorunu
-- bildiren kişi "benim yazdığım şey mi düzeldi?" sorusunu yanıtlayamıyordu.
--
-- Çözüm: girdi kaydedilirken kaynak kayıttan (error_reports / error_logs) ham
-- kullanıcı metni kopyalanır. Kopya BİLİNÇLİDİR: kaynak tablolar admin-only
-- RLS ile korunur, portal ise herkese açıktır — join yerine anlık görüntü.
--
--   request_text  → bildirenin kendi cümlesi (error_reports.description /
--                   error_logs.message). CLAUDE.md: ham metin asla ezilmez.
--   requested_at  → sorunun bildirildiği an (çözüm tarihiyle birlikte "ne kadar
--                   sürdü" gösterilebilsin diye)
--   request_path  → sorunun görüldüğü sayfa (ör. /magaza)
--
-- Doldurma TRIGGER ile yapılır: hem ajan yolu (041 fix_agent_result) hem elle
-- çözüm yolu (043 publish_manual_resolution) aynı tabloya yazdığı için iki RPC'yi
-- ayrı ayrı yamamak yerine tek yerden garanti edilir. Yeni bir yazma yolu
-- eklenirse de otomatik çalışır.
--
-- GİZLİLİK: yalnızca metin + yol kopyalanır. Bildirenin adı/e-postası ASLA
-- portala taşınmaz (error_reports.reporter_email admin tarafında kalır).
--
-- Sayfa: src/pages/changelog/ChangelogPage.tsx · İstemci: src/lib/changelog.ts
-- Ön koşul: 018 (error_reports), 031 (error_logs), 039 (changelog)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.changelog_entries
  ADD COLUMN IF NOT EXISTS request_text TEXT,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS request_path TEXT;

COMMENT ON COLUMN public.changelog_entries.request_text IS
  'Bildirenin kendi cümlesi (error_reports.description / error_logs.message). Portalda gösterilir; ad/e-posta taşınmaz.';
COMMENT ON COLUMN public.changelog_entries.requested_at IS
  'Sorunun bildirildiği an — çözüm tarihiyle birlikte süre gösterimi için.';
COMMENT ON COLUMN public.changelog_entries.request_path IS
  'Sorunun görüldüğü sayfa yolu (ör. /magaza).';

-- ─── Kaynak kayıttan bağlamı kopyalayan trigger ────────────────────────
CREATE OR REPLACE FUNCTION public.changelog_fill_request_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Elle doldurulmuşsa dokunma (ör. ileride düzenlenmiş bir metin).
  IF NEW.request_text IS NOT NULL AND btrim(NEW.request_text) <> '' THEN
    RETURN NEW;
  END IF;

  IF NEW.report_id IS NOT NULL THEN
    SELECT NULLIF(btrim(r.description), ''), r.created_at, r.page_path
      INTO NEW.request_text, NEW.requested_at, NEW.request_path
      FROM public.error_reports r
     WHERE r.id = NEW.report_id;
  ELSIF NEW.log_id IS NOT NULL THEN
    SELECT NULLIF(btrim(l.message), ''), l.first_seen_at, l.page_path
      INTO NEW.request_text, NEW.requested_at, NEW.request_path
      FROM public.error_logs l
     WHERE l.id = NEW.log_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS changelog_request_context ON public.changelog_entries;
CREATE TRIGGER changelog_request_context
  BEFORE INSERT OR UPDATE OF report_id, log_id ON public.changelog_entries
  FOR EACH ROW EXECUTE FUNCTION public.changelog_fill_request_context();

-- ─── Mevcut girdileri doldur (geriye dönük) ────────────────────────────
UPDATE public.changelog_entries c
   SET request_text = NULLIF(btrim(r.description), ''),
       requested_at = r.created_at,
       request_path = r.page_path
  FROM public.error_reports r
 WHERE c.report_id = r.id
   AND c.request_text IS NULL;

UPDATE public.changelog_entries c
   SET request_text = NULLIF(btrim(l.message), ''),
       requested_at = l.first_seen_at,
       request_path = l.page_path
  FROM public.error_logs l
 WHERE c.log_id = l.id
   AND c.request_text IS NULL;

NOTIFY pgrst, 'reload schema';
