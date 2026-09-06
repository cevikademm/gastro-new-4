-- 045 — product_seo: SEO ürün sayfaları için tek, markalar-arası normalize tablo.
--
-- Doldurulur: scripts/seo/build-product-seo.ts (products.json sınıflandırması +
-- diamond/combisteel/handi tablolarından zengin alanlar). Okur: api/render.ts
-- (sunucu HTML), src/pages/seo/* (React), api/sitemap.ts, api/feed-gmc.ts.
--
-- slug: /produkt/{slug} — anahtar kelimeli, benzersiz, ≤ 96 karakter.
-- indexable: görsel var, aksesuar değil → sitemap + index; aksi noindex.

create table if not exists public.product_seo (
  source            text not null check (source in ('diamond','combisteel','handi')),
  source_id         text not null,
  sku               text not null,
  slug              text not null,
  brand             text not null,
  brand_slug        text not null,
  name_de           text not null,
  description_de    text,
  category_slug     text,
  subcategory_slug  text,
  taxonomy_cat      text,
  taxonomy_sub      text,
  price_net         numeric,
  image             text,
  images            jsonb default '[]'::jsonb,
  in_stock          boolean not null default true,
  kw                numeric,
  width_mm          numeric,
  depth_mm          numeric,
  height_mm         numeric,
  weight_kg         numeric,
  ean               text,
  specs             jsonb default '[]'::jsonb,
  is_accessory      boolean not null default false,
  indexable         boolean not null default true,
  -- Önemli fiyat bandı (1.500–5.000 €) listelerde önce (all_products.sort_rank ile aynı mantık)
  sort_rank         smallint generated always as (case when price_net >= 1500 and price_net <= 5000 then 0 else 1 end) stored,
  updated_at        timestamptz not null default now(),
  primary key (source, source_id)
);

create unique index if not exists product_seo_slug_key on public.product_seo (slug);
create index if not exists product_seo_cat_idx on public.product_seo (category_slug, subcategory_slug, indexable);
create index if not exists product_seo_brand_idx on public.product_seo (brand_slug, indexable);
create index if not exists product_seo_sku_idx on public.product_seo (sku);
create index if not exists product_seo_list_idx on public.product_seo (sort_rank, price_net desc nulls last);

alter table public.product_seo enable row level security;

drop policy if exists "product_seo public read" on public.product_seo;
create policy "product_seo public read" on public.product_seo
  for select to anon, authenticated using (true);

-- Yazma yalnızca service role (RLS bypass) — ek policy gerekmez.

-- Kategori / alt kategori / marka sayıları (kategori sayfası kartları, hub sayfaları)
create or replace view public.product_seo_counts as
  select category_slug, subcategory_slug, brand_slug, count(*)::int as n
  from public.product_seo
  where indexable
  group by 1, 2, 3;

grant select on public.product_seo to anon, authenticated;
grant select on public.product_seo_counts to anon, authenticated;
