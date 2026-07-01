-- 019 — all_products view'ını genişlet: kod + ölçü + stok kolonları ekle.
-- "Tümü" sekmesindeki ürün kartlarının (AllProductsGrid) marka çipi + KOD + ÖLÇÜ
-- gösterebilmesi ve "projeye ekle"nin doğru boyutla çalışabilmesi için.
-- Eski view yalnızca id/source/brand/name/image/price/category veriyordu.
--
-- ÖNEMLİ: diamond_products ölçü kolonları TEXT'tir ve boş string ("") / "1300 mm"
-- gibi sayısal olmayan değerler içerebilir. Doğrudan `::numeric` cast'i bu satırlar
-- SELECT edilince RUNTIME'da patlar ve tüm katalog sorgusunu kırar. Bu yüzden
-- parse_mm() güvenli çevirici kullanıyoruz: yalnız tam sayısal (ondalıklı olabilir)
-- metinleri numeric'e çevirir, geri kalan her şeyi NULL yapar — asla hata vermez.
-- (::text sarmalı sayesinde kaynak kolon ister TEXT ister INT olsun çalışır.)
--
-- DROP + CREATE kullanıyoruz (CREATE OR REPLACE tip/kolon sırası kısıtına takılmasın);
-- ardından anon/authenticated SELECT grant'lerini yeniden veriyoruz (PostgREST erişimi).

create or replace function public.parse_mm(v text)
returns numeric
language sql
immutable
as $$
  select case
    when btrim(coalesce(v, '')) ~ '^\d+([.,]\d+)?$'
    then replace(btrim(v), ',', '.')::numeric
    else null
  end
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
    stock::text                          as stock
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
    coalesce(ean, id)                    as code,
    public.parse_mm(length_mm::text),
    public.parse_mm(width_mm::text),
    public.parse_mm(height_mm::text),
    null::numeric,
    stock::text
  from public.handi_products;

grant select on public.all_products to anon, authenticated;
