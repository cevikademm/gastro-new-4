-- 015_customer_leads_whatsapp.sql
-- Müşteri Bulma — WhatsApp ile iletişim durumu takibi.
-- wa.me tıkla-konuş bağlantısı açıldığında "gonderildi" olarak işaretlenir,
-- böylece kime WhatsApp üzerinden ulaşıldığı görülebilir.

ALTER TABLE customer_leads ADD COLUMN IF NOT EXISTS whatsapp_durumu text DEFAULT 'gonderilmedi';
ALTER TABLE customer_leads ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz;
