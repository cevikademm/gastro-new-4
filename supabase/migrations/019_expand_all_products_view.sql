-- 019 — all_products view'ını genişlet: kod + ölçü + stok kolonları ekle.
-- "Tümü" sekmesindeki ürün kartlarının (AllProductsGrid) marka çipi + KOD + ÖLÇÜ
-- gösterebilmesi ve "projeye ekle"nin doğru boyutla çalışabilmesi için.
-- Eski view yalnızca id/source/brand/name/image/price/category veriyordu.
--
-- DROP + CREATE kullanıyoruz (CREATE OR REPLACE tip/kolon sırası kısıtına takılmasın);
-- ardından anon/authenticated SELECT grant'lerini yeniden veriyoruz (PostgREST erişimi).

drop view if exists public.all_products;

create view public.all_products as
  -- ── Diamond ──
  select
    id::text                          as id,
    'diamond'::text                   as source,
    'Diamond'::text                   as brand,
    name                              as name,
    image_big                         as image,
    price_catalog                     as price,
    product_family_name               as category,
    id::text                          as code,
    length_mm::numeric                as length_mm,
    width_mm::numeric                 as width_mm,
    height_mm::numeric                as height_mm,
    null::numeric                     as depth_mm,
    stock::text                       as stock
  from public.diamond_products
  union all
  -- ── CombiSteel ──
  select
    id::text,
    'combisteel',
    coalesce(brand, 'CombiSteel'),
    coalesce(title, description),
    image_url,
    price,
    category_name,
    sku                               as code,
    length_mm::numeric,
    width_mm::numeric,
    height_mm::numeric,
    depth_mm::numeric,
    stock::text
  from public.combisteel_products
  union all
  -- ── HENDI ──
  select
    id::text,
    'handi',
    coalesce(brand, 'HENDI'),
    name,
    image_url,
    price,
    category_name,
    coalesce(ean, id)                 as code,
    length_mm::numeric,
    width_mm::numeric,
    height_mm::numeric,
    null::numeric,
    stock::text
  from public.handi_products;

grant select on public.all_products to anon, authenticated;
