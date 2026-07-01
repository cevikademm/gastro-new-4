-- 028 — Diamond/CombiSteel/HENDI HAM tablolarına sort_rank (fiyat bandı rütbesi).
-- İSTEK: marka sekmeleri de "Tümü" gibi €1500–€5000 ürünleri önce göstersin;
-- küçük/ucuz ürünler ilk sayfalara gelmesin.
--
-- all_products view'ında sort_rank 027'de vardı; ama marka store'ları (diamondStore,
-- combisteelStore, handiStore) HAM tabloları okuyor. Aynı rütbeyi tablolara GENERATED
-- kolon olarak ekliyoruz ki PostgREST order('sort_rank') ile bant-önce sıralayabilsin.
--   0 = fiyat [1500,5000] bandında · 1 = diğerleri (ucuz/pahalı/fiyatsız). NULL → 1.
--
-- STORED generated: insert/update'te otomatik hesaplanır; sync objeleri sort_rank
-- GÖNDERMEDİĞİ için mevcut senkron (diamond-sync.mjs vb.) bozulmaz.
-- Fiyat kolonları: diamond → price_catalog, combisteel/handi → price (numeric).

alter table public.diamond_products
  add column if not exists sort_rank integer
  generated always as (case when price_catalog >= 1500 and price_catalog <= 5000 then 0 else 1 end) stored;

alter table public.combisteel_products
  add column if not exists sort_rank integer
  generated always as (case when price >= 1500 and price <= 5000 then 0 else 1 end) stored;

alter table public.handi_products
  add column if not exists sort_rank integer
  generated always as (case when price >= 1500 and price <= 5000 then 0 else 1 end) stored;
