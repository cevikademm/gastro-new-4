-- 020 — all_products view'ına "uzun isim" (description) kolonu ekle.
-- Kartlarda kısa/jenerik ad + KOD yanında ürünün uzun/açıklayıcı adını da göstermek
-- için (ör. Diamond'da name="Cabinets frigorifiques" jenerik; asıl ayırt edici metin
-- description_tech_spec içinde). Böylece ~15k ürünün hepsi tekil olarak tanınabilir.
--
-- Kaynak alanlar:
--   Diamond    → description_tech_spec
--   CombiSteel → long_description varsa o, yoksa description  (HTML olabilir → frontend htmlToText ile temizler)
--   HENDI      → description
--
-- parse_mm() 019'da tanımlandı; ölçü kolonları güvenli çeviriyle korunuyor.
-- DROP + CREATE (kolon eklendiği için) + grant yenileme.

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
    description_tech_spec                as description
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
