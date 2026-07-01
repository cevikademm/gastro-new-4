-- 023 — HENDI kod düzeltmesi (görsel uyum).
-- handi_products.ean çoğunlukla Excel'de bilimsel gösterime bozulmuş ("8,71137E+12").
-- Kartlarda kod olarak bu bozuk EAN görünüyordu. Artık: geçerli bir EAN (yalnız 6–14
-- rakam) varsa onu, yoksa temiz makale numarası `id`'yi kod olarak kullanıyoruz.
-- Diğer her şey 022 ile aynı (parse_mm ölçü + Diamond description NULL).

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
    case when ean ~ '^\d{6,14}$' then ean else id end   as code,
    public.parse_mm(length_mm::text),
    public.parse_mm(width_mm::text),
    public.parse_mm(height_mm::text),
    null::numeric,
    stock::text,
    description
  from public.handi_products;

grant select on public.all_products to anon, authenticated;
