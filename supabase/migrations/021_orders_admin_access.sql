-- 021_orders_admin_access.sql
-- Amaç: "Admin bütün siparişleri görür; kullanıcı yalnız kendi siparişlerini görür"
-- kuralını sunucu tarafında GARANTİYE almak. 008'deki admin sipariş politikaları
-- burada idempotent biçimde yeniden dayatılır (008 zaten canlıysa no-op olur).
--
-- Ön koşul: public.is_admin() helper'ı (migration 008'de tanımlı) — profiles.role = 'admin'.
-- Kullanıcı sahip-kapsamlı (owner-scoped) politikaları (003) DEĞİŞMEDEN kalır.

ALTER TABLE gastro_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastro_order_events ENABLE ROW LEVEL SECURITY;

-- Güvenlik ağı: is_admin() yoksa (008 uygulanmadıysa) burada da tanımla.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── gastro_orders — admin tüm siparişleri okur/günceller ─────
DROP POLICY IF EXISTS "Admins read all orders" ON gastro_orders;
CREATE POLICY "Admins read all orders" ON gastro_orders
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update all orders" ON gastro_orders;
CREATE POLICY "Admins update all orders" ON gastro_orders
  FOR UPDATE USING (public.is_admin());

-- ── gastro_order_events — admin tüm olayları okur/ekler ──────
DROP POLICY IF EXISTS "Admins read all order events" ON gastro_order_events;
CREATE POLICY "Admins read all order events" ON gastro_order_events
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert order events" ON gastro_order_events;
CREATE POLICY "Admins insert order events" ON gastro_order_events
  FOR INSERT WITH CHECK (public.is_admin());

-- adminStore.updateOrderStatus / addOrderNote olay kaydına `note` yazıyor
-- ancak 003'te bu sütun yoktu → sessizce başarısız oluyordu. Ekleyelim.
ALTER TABLE gastro_order_events ADD COLUMN IF NOT EXISTS note TEXT;
