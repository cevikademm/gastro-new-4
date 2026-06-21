-- 012_customer_leads_reviews.sql
-- Müşteri Bulma — talep üzerine çekilen Google yorumları için önbellek kolonu.
-- Yorumlar yalnızca admin "Yorumları getir" deyince çekilir ve burada saklanır
-- (tekrar açılışta yeniden Apify çağrısı yapılmaz → kredi tasarrufu).

ALTER TABLE customer_leads ADD COLUMN IF NOT EXISTS yorumlar jsonb;
