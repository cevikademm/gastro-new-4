-- 013_customer_mail_log.sql
-- Müşteri Bulma — gönderilen her mailin kaydı (kime, hangi mesaj, ne zaman, durum).
-- Ayrı "Mail Geçmişi" alanı bu tablodan beslenir. Bir lead'e birden çok mail
-- gönderilebileceği için lead başına çok satır olabilir.

CREATE TABLE IF NOT EXISTS customer_mail_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid REFERENCES customer_leads(id) ON DELETE SET NULL,
  lead_isim   text,
  to_email    text,
  subject     text,
  body        text,
  status      text DEFAULT 'gonderildi',   -- gonderildi | basarisiz
  created_at  timestamptz DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS customer_mail_log_created_at_idx ON customer_mail_log (created_at DESC);
CREATE INDEX IF NOT EXISTS customer_mail_log_lead_idx       ON customer_mail_log (lead_id);

ALTER TABLE customer_mail_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage mail log" ON customer_mail_log;
CREATE POLICY "Admins manage mail log" ON customer_mail_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
