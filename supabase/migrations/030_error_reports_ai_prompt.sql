-- ─────────────────────────────────────────────────────────────────────
-- 030_error_reports_ai_prompt.sql
-- Hata bildirimlerine AI (Claude Haiku) tarafından üretilen "düzeltme
-- prompt'u" alanlarını ekler.
--   ai_prompt     → Claude Code'a yapıştırılmaya hazır, markdown geliştirici prompt'u
--   ai_prompt_at  → prompt'un üretildiği an (yeniden üretimde güncellenir)
--   ai_model      → hangi model ürettiyse (claude-haiku-4-5)
-- Üretim: supabase/functions/fix-prompt · İstemci: src/lib/fixPrompt.ts
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.error_reports
  ADD COLUMN IF NOT EXISTS ai_prompt    TEXT,
  ADD COLUMN IF NOT EXISTS ai_prompt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_model     TEXT;

COMMENT ON COLUMN public.error_reports.ai_prompt IS
  'Claude Haiku ile üretilen, geliştiriciye/Claude Code''a verilecek düzeltme prompt''u (markdown).';

NOTIFY pgrst, 'reload schema';
