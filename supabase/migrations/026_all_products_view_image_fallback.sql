-- 025 — all_products view: Diamond görsel fallback (image_big boş → thumb/full).
-- SORUN: Diamond senkronu image_big'i BOŞ ('') bırakıyor; asıl görsel image_thumb'da
-- (geçerli https S3 URL'i). 019/020 view'ı `image_big as image` yazdığından "Tümü"
-- sekmesindeki (AllProductsGrid) TÜM Diamond ürünleri görselsiz (placeholder) çıkıyordu.
-- Standalone Diamond sayfası çalışıyordu çünkü orada `image_big || image_thumb` fallback var.
--
-- ÇÖZÜM: view'da Diamond görselini coalesce(nullif(...)) zinciriyle seç:
--   image_big (varsa) → image_full → image_thumb.
-- nullif(x,'') şart: coalesce boş string'i ('') NULL saymaz, atlamaz.
-- CombiSteel/HENDI image_url dolu; yine de nullif ile boşları normalize ediyoruz.
--
-- 020'nin birebir aynısı; SADECE image ifadeleri değişti. DROP + CREATE + grant.

drop view if exists public.all_products;

create view public.all_products as
  -- ── Diamond ──
  select
    id::text                             as id,
    'diamond'::text                      as source,
    'Diamond'::text                      as brand,
    name                                 as name,
    coalesce(nullif(image_big, ''), nullif(image_full, ''), nullif(image_thumb, '')) as image,
    price_catalog                        as price,
    product_family_name                  as category,
    id::text                             as code,
    public.parse_mm(length_mm::text)     as length_mm,
    public.parse_mm(width_mm::text)      as width_mm,
    public.parse_mm(height_mm::text)     as height_mm,
    null::numeric                        as depth_mm,
    stock::text                          as stock,
    description_tech_spec                as description
  from public.diamond_products
  union all
  -- ── CombiSteel ──
  select
    id::text,
    'combisteel',
    coalesce(brand, 'CombiSteel'),
    coalesce(title, description),
    nullif(image_url, ''),
    price,
    category_name,
    sku                                  as code,
    public.parse_mm(length_mm::text),
    public.parse_mm(width_mm::text),
    public.parse_mm(height_mm::text),
    public.parse_mm(depth_mm::text),
    stock::text,
    coalesce(long_description, description)
  from public.combisteel_products
  union all
  -- ── HENDI ──
  select
    id::text,
    'handi',
    coalesce(brand, 'HENDI'),
    name,
    nullif(image_url, ''),
    price,
    category_name,
    coalesce(ean, id)                    as code,
    public.parse_mm(length_mm::text),
    public.parse_mm(width_mm::text),
    public.parse_mm(height_mm::text),
    null::numeric,
    stock::text,
    description
  from public.handi_products;

grant select on public.all_products to anon, authenticated;
