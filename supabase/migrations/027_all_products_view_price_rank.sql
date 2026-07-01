-- 027 — all_products view: "önemli fiyat bandı" sıralama rütbesi (sort_rank).
-- İSTEK: Ürünler > Tümü (AllProductsGrid) İLK SAYFALARDA €1500–€5000 arası ürünleri
-- göstersin (ana sayfadaki gibi değerli cihazlar önce). Şu an view name'e göre
-- sıralı olduğundan €1 gibi önemsiz ürünler ilk sayfaya düşüyordu.
--
-- ÇÖZÜM: her satıra sort_rank ekle → 0 = fiyat [1500,5000] bandında, 1 = diğerleri
-- (banttan ucuz/pahalı + fiyatsız/NULL). Store `order(sort_rank).order(price desc)`
-- ile sıralar → ilk sayfalar bant ürünleri (pahalıdan ucuza), sonrası kalanlar.
-- NULL fiyat: `NULL >= 1500` → NULL → CASE else → 1 (otomatik sona düşer).
--
-- 026'nın birebir aynısı; SADECE her SELECT'e son kolon olarak sort_rank eklendi.
-- DROP + CREATE + grant.

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
    description_tech_spec                as description,
    case when price_catalog >= 1500 and price_catalog <= 5000 then 0 else 1 end as sort_rank
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
    coalesce(long_description, description),
    case when price >= 1500 and price <= 5000 then 0 else 1 end
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
    description,
    case when price >= 1500 and price <= 5000 then 0 else 1 end
  from public.handi_products;

grant select on public.all_products to anon, authenticated;
