-- 023_design_renders_bucket.sql
-- 3D Tasarım — yüksek kaliteli render (görüntü) depolama kovası.
--
-- SORUN: /3d-design sahnesinden alınan render'ler "proje dosyasının içinde"
-- kalmalı. Görüntü verisi büyük olduğundan doküman JSONB'sine base64 gömmek her
-- autosave'i şişirir. Bunun yerine PNG'yi bu kovaya yükleyip dokümanda yalnızca
-- küçük URL metadata'sı (project.renders) tutuyoruz.
--
-- KRİTİK: Uygulama HERKES için Supabase anon anahtarını kullanır; bağımsız
-- (/3d-design) kullanıcıda user_id='anonymous', yani auth.role() = 'anon'. Bu
-- yüzden yazma politikası anon'a da izin VERMELİDİR (error-screenshots'un
-- authenticated-only politikası gibi DEĞİL) — aksi halde bağımsız yüklemeler
-- RLS ile reddedilir. gastro_design_projects'in "allow all" güven modeliyle aynı.
--
-- Idempotent'tir.

-- ─── Storage bucket (design-renders, public, 10 MB, png/jpeg) ────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-renders',
  'design-renders',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Herkese açık okuma.
DROP POLICY IF EXISTS design_renders_public_read ON storage.objects;
CREATE POLICY design_renders_public_read ON storage.objects FOR SELECT
  USING (bucket_id = 'design-renders');

-- anon + authenticated yazma/güncelleme/silme (uygulama anon anahtarı kullanır).
-- Kova bazlı "allow all" — gastro_design_projects ile aynı güven modeli.
DROP POLICY IF EXISTS design_renders_write ON storage.objects;
CREATE POLICY design_renders_write ON storage.objects FOR ALL
  USING (bucket_id = 'design-renders')
  WITH CHECK (bucket_id = 'design-renders');

NOTIFY pgrst, 'reload schema';
