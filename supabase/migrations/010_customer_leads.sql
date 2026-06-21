-- 010_customer_leads.sql
-- Müşteri Bulma (Customer Finder) — Apify Google Maps lead arama + mini CRM.
-- İki tablo: customer_searches (her arama) + customer_leads (bulunan işletmeler).
-- RLS, mevcut public.is_admin() SECURITY DEFINER helper'ını kullanır (008'de tanımlı,
-- recursion'ı önler). Sadece admin erişebilir.

-- ── customer_searches: her arama bir kayıt ──────────────────
CREATE TABLE IF NOT EXISTS customer_searches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ulke          text,
  sehir         text,
  kategori      text,
  limit_count   int,
  min_puan      numeric,
  results_count int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ── customer_leads: bulunan işletmeler (mini CRM) ───────────
CREATE TABLE IF NOT EXISTS customer_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id    uuid REFERENCES customer_searches(id) ON DELETE SET NULL,
  place_id     text UNIQUE,
  isim         text,
  kategori     text,
  adres        text,
  telefon      text,
  email        text,
  website      text,
  place_url    text,
  puan         numeric,
  yorum_sayisi int,
  lat          numeric,
  lng          numeric,
  durum        text DEFAULT 'yeni',           -- yeni | arandi | ilgilendi | musteri | olumsuz
  mail_durumu  text DEFAULT 'gonderilmedi',   -- gonderilmedi | gonderildi | yanit_geldi
  mail_sent_at timestamptz,
  notlar       text,
  raw_data     jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_leads_durum_idx      ON customer_leads (durum);
CREATE INDEX IF NOT EXISTS customer_leads_search_id_idx  ON customer_leads (search_id);
CREATE INDEX IF NOT EXISTS customer_leads_created_at_idx ON customer_leads (created_at DESC);

-- ── RLS: yalnızca admin ─────────────────────────────────────
ALTER TABLE customer_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_leads    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage searches" ON customer_searches;
CREATE POLICY "Admins manage searches" ON customer_searches
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage leads" ON customer_leads;
CREATE POLICY "Admins manage leads" ON customer_leads
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
