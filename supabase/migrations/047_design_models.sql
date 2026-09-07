-- 047_design_models.sql
-- 3D Tasarım — kalıcı kullanıcı model kütüphanesi (GLB).
--
-- SORUN: /3d-design'a yüklenen GLB'ler yalnızca oturumluktu (blob: URL) —
-- sayfa yenilenince model kayboluyor, gri kutuya düşüyordu. Bu migration
-- modelleri kalıcı hâle getirir: dosya `design-models` kovasında, meta veri
-- `public.design_models` tablosunda.
--
-- SAHİPLİK: Her satır bir auth kullanıcısına aittir (user_id = auth.uid()).
-- Admin bir modeli `is_shared = true` yaparak ORTAK kütüphaneye açabilir;
-- ortak modelleri herkes görür ama yalnız sahibi veya admin siler.
--
-- ANONİM KULLANICI: Supabase oturumu yoksa (bağımsız /3d-design ziyaretçisi)
-- kütüphaneye yazamaz — istemci bu durumda oturumluk `importGlbFile` akışına
-- düşer ve "kaydetmek için giriş yapın" ipucu gösterir. Bu bilinçli bir
-- karardır: design-renders kovasının "allow all" modeli burada KULLANILMAZ,
-- çünkü kütüphane kullanıcıya özeldir ve anon paylaşımı herkesin dosyasını
-- birbirine karıştırırdı.
--
-- Ön koşullar: public.is_admin() (008), public.set_updated_at() (004/016).
-- Idempotent'tir.

-- ─── Tablo ────────────────────────────────────────────────────────────────
create table if not exists public.design_models (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null check (length(btrim(name)) between 1 and 120),
  category       text not null default 'other',
  -- Storage yolları: '{user_id}/{model_id}.glb' ve '..._thumb.png'
  glb_path       text not null unique,
  glb_url        text not null,
  thumbnail_path text,
  thumbnail_url  text,
  -- Gerçek dünya ölçüleri (mm) — yerleştirme/çarpışma/otomatik ölçek kullanır.
  width_mm       numeric not null check (width_mm  > 0 and width_mm  <= 20000),
  depth_mm       numeric not null check (depth_mm  > 0 and depth_mm  <= 20000),
  height_mm      numeric not null check (height_mm > 0 and height_mm <= 20000),
  -- 'y': Meshy/Blender çıktısı (yan yatık gelir → +90° X eğimi gerekir)
  -- 'z': sahnemizle aynı yönelim (statik katalog GLB'leri gibi)
  up_axis        text not null default 'y' check (up_axis in ('y','z')),
  is_shared      boolean not null default false,
  size_bytes     bigint check (size_bytes > 0 and size_bytes <= 83886080), -- 80 MB
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists design_models_user_idx    on public.design_models (user_id, created_at desc);
create index if not exists design_models_shared_idx  on public.design_models (created_at desc) where is_shared;
create index if not exists design_models_cat_idx     on public.design_models (category);

drop trigger if exists design_models_set_updated_at on public.design_models;
create trigger design_models_set_updated_at
  before update on public.design_models
  for each row execute function public.set_updated_at();

-- ─── is_shared koruması ───────────────────────────────────────────────────
-- Ortak kütüphaneye açma/kapama YALNIZ admin'in yetkisidir. RLS WITH CHECK
-- ifadesi eski satırı göremediğinden bu kural BEFORE UPDATE trigger'ıyla
-- uygulanır: admin değilse is_shared eski değerinde sabitlenir (sessizce geri
-- alınır, güncellemenin geri kalanı geçerli kalır).
create or replace function public.design_models_guard_shared()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_shared is distinct from old.is_shared and not public.is_admin() then
    new.is_shared := old.is_shared;
  end if;
  -- Sahiplik devri de yasak (admin hariç).
  if new.user_id is distinct from old.user_id and not public.is_admin() then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists design_models_guard_shared_trg on public.design_models;
create trigger design_models_guard_shared_trg
  before update on public.design_models
  for each row execute function public.design_models_guard_shared();

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.design_models enable row level security;

-- Okuma: kendi modellerim + ortak kütüphane + admin her şeyi görür.
drop policy if exists design_models_select on public.design_models;
create policy design_models_select on public.design_models
  for select to authenticated
  using (user_id = auth.uid() or is_shared or public.is_admin());

-- Anonim ziyaretçi yalnız ortak kütüphaneyi görür (yazamaz).
drop policy if exists design_models_select_anon on public.design_models;
create policy design_models_select_anon on public.design_models
  for select to anon
  using (is_shared);

-- Ekleme: yalnız kendi adına.
drop policy if exists design_models_insert on public.design_models;
create policy design_models_insert on public.design_models
  for insert to authenticated
  with check (user_id = auth.uid());

-- Güncelleme: kendi satırım veya admin (is_shared'ı trigger korur).
drop policy if exists design_models_update on public.design_models;
create policy design_models_update on public.design_models
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Silme: kendi satırım veya admin.
drop policy if exists design_models_delete on public.design_models;
create policy design_models_delete on public.design_models
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select on public.design_models to anon, authenticated;
grant insert, update, delete on public.design_models to authenticated;

-- ─── Storage kovası (design-models) ───────────────────────────────────────
-- Public read: GLB'ler <model-viewer>/GLTFLoader tarafından imzasız çekilir.
-- Yazma: yalnız oturum açmış kullanıcı ve YALNIZ kendi '{uid}/...' klasörüne.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'design-models',
  'design-models',
  true,
  83886080, -- 80 MB
  array[
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists design_models_storage_read on storage.objects;
create policy design_models_storage_read on storage.objects
  for select
  using (bucket_id = 'design-models');

-- Kendi klasörüne yazma: yol '{auth.uid()}/...' ile başlamalı.
drop policy if exists design_models_storage_insert on storage.objects;
create policy design_models_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'design-models'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists design_models_storage_update on storage.objects;
create policy design_models_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'design-models'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists design_models_storage_delete on storage.objects;
create policy design_models_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'design-models'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

notify pgrst, 'reload schema';
