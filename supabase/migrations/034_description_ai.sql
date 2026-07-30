-- ─────────────────────────────────────────────────────────────────────
-- 034_description_ai.sql
-- AI ile DETAYLANDIRILMIŞ açıklama alanı.
--
--   description      → DOKUNULMAZ. Kullanıcının kendi yazdığı ham metin
--                      (error_logs'ta: yakalanan ham hata mesajı) burada kalır.
--   description_ai   → Claude Haiku'nun aynı bildirimi detaylandırdığı hali:
--                      ne yapılıyordu, ne bekleniyordu, ne oldu, hangi koşulda
--                      tekrarlıyor, işe etkisi.
--
-- Panelde/WhatsApp'ta description_ai varsa o gösterilir, ham metin de altında
-- daima görünür — böylece AI yanlış yorumlarsa asıl ifade kaybolmaz.
--
-- Üretim: supabase/functions/_shared/fixPromptCore.ts (detailedDescription alanı)
-- İstemci: src/lib/fixPrompt.ts · Ön koşul: 018 + 030 (error_logs için 031)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.error_reports
  ADD COLUMN IF NOT EXISTS description_ai TEXT;

COMMENT ON COLUMN public.error_reports.description_ai IS
  'Claude Haiku ile detaylandırılmış açıklama. Ham kullanıcı metni description sütununda korunur.';

-- error_logs migration 031 ile geliyor; henüz uygulanmadıysa bu blok atlanır.
DO $$
BEGIN
  IF to_regclass('public.error_logs') IS NOT NULL THEN
    ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS description_ai TEXT;
    COMMENT ON COLUMN public.error_logs.description_ai IS
      'Claude Haiku ile detaylandırılmış açıklama. Ham hata mesajı message sütununda korunur.';
  ELSE
    RAISE NOTICE 'error_logs yok (migration 031 uygulanmamış) — description_ai atlandı.';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
