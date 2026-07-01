-- 029 — marka tablolarına has_image (görseli olan ürün) generated kolonu.
-- İSTEK: ürün resmi OLMAYAN ürünler listelenmesin (ana sayfadaki !!i.img gibi).
--
-- "Tümü" (all_products view) tarafı image kolonu zaten coalesce(nullif(...)) ile
-- görselsizde NULL döndüğünden query'de `image is not null` ile süzülür (kolon gerekmez).
-- Marka store'ları HAM tabloları okuyor; her kartın GÖSTERDİĞİ görsel alanına göre
-- has_image üretiyoruz ki placeholder'lı ürünler listeden düşsün:
--   diamond    → kart image_big || image_thumb gösterir → ikisinden biri doluysa true
--   combisteel → image_url
--   handi      → image_url
-- '' (boş string) ve NULL ikisi de "görsel yok" sayılır (nullif ile).

alter table public.diamond_products
  add column if not exists has_image boolean
  generated always as (
    nullif(image_big, '') is not null or nullif(image_thumb, '') is not null
  ) stored;

alter table public.combisteel_products
  add column if not exists has_image boolean
  generated always as (nullif(image_url, '') is not null) stored;

alter table public.handi_products
  add column if not exists has_image boolean
  generated always as (nullif(image_url, '') is not null) stored;
