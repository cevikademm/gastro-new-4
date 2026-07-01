-- 021 — İki düzeltme:
-- 1) parse_mm: Diamond yükseklikleri "880/900(+100)" gibi ARALIK/EK içerir; katı
--    regex bunları NULL yapıyordu → kartlarda yükseklik hiç görünmüyordu. Artık
--    metindeki İLK sayıyı alıyoruz (880/900(+100) → 880), böylece ölçü tam görünür.
--    Hâlâ güvenli: hiç rakam yoksa NULL, asla hata vermez.
-- 2) all_products.description: Diamond için NULL yapıldı. Diamond'ın description_tech_spec
--    alanı bir SPEC/ÖLÇÜ metnidir ("mm (W x D x H) : ..."), "uzun isim" değil — ve ölçü
--    çipiyle tekrar oluyordu. Diamond'ın uzun/açıklayıcı adı zaten `name` alanındadır
--    (kart başlığı). CombiSteel/HENDI'de description gerçek ikincil ad/açıklamadır → kalır.

create or replace function public.parse_mm(v text)
returns numeric
language sql
immutable
as $$
  select nullif(replace(coalesce(substring(v from '\d+(?:[.,]\d+)?'), ''), ',', '.'), '')::numeric
$$;

drop view if exists public.all_products;

create view public.all_products as
  -- ── Diamond ──
  select
    id::text                             as id,
    'diamond'::text                      as source,
    'Diamond'::text                      as brand,
    name                                 as name,
    image_big                            as image,
    price_catalog                        as price,
    product_family_name                  as category,
    id::text                             as code,
    public.parse_mm(length_mm::text)     as length_mm,
    public.parse_mm(width_mm::text)      as width_mm,
    public.parse_mm(height_mm::text)     as height_mm,
    null::numeric                        as depth_mm,
    stock::text                          as stock,
    null::text                           as description
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
    image_url,
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
