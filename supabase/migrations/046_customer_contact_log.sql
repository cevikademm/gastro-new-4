-- 046_customer_contact_log.sql
-- Müşteri Bulma: e-posta dışında başlatılan iletişimleri şeffaf biçimde izler.
-- WhatsApp için kayıt "taslak açıldı" anlamına gelir; kullanıcının WhatsApp içinde
-- gerçekten gönder tuşuna basıp basmadığı teknik olarak doğrulanamaz.

CREATE TABLE IF NOT EXISTS customer_contact_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid REFERENCES customer_leads(id) ON DELETE SET NULL,
  lead_isim     text,
  channel       text NOT NULL CHECK (channel IN ('whatsapp', 'phone')),
  destination   text,
  message       text,
  status        text NOT NULL CHECK (status IN ('taslak_acildi', 'arama_baslatildi')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS customer_contact_log_created_at_idx
  ON customer_contact_log (created_at DESC);
CREATE INDEX IF NOT EXISTS customer_contact_log_lead_idx
  ON customer_contact_log (lead_id);

ALTER TABLE customer_contact_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contact log" ON customer_contact_log;
CREATE POLICY "Admins manage contact log" ON customer_contact_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
