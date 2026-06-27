-- product_3d_models: MeshAI iki-aşamalı (preview/refine) üretim sütunları
-- ----------------------------------------------------------------------------
-- 004_product_3d_models.sql tabloyu tek-task şemasıyla kurmuştu. meshy-3d edge
-- function sonradan preview/refine aşamalarına ve ek dosya formatlarına geçti;
-- ama yeni Supabase projesine (vwuqvweorjbqxcebnaym) bu sütunlar gelmemişti.
-- Eksik sütunlar olmadan insert "Could not find the 'meshy_preview_id' column"
-- hatasıyla düşüyordu. Idempotent — tekrar çalıştırmak güvenli.

alter table public.product_3d_models
  add column if not exists meshy_preview_id text,
  add column if not exists meshy_refine_id  text,
  add column if not exists stage            text
    check (stage in ('preview','refine','done')),
  add column if not exists fbx_url          text,
  add column if not exists obj_url          text;
