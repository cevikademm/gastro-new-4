-- ─────────────────────────────────────────────────────────────────────
-- 050_support_tickets.sql
-- Destek biletlerini kalıcı hale getirir.
--
-- Önceden /support formu YALNIZCA send-email edge function'ına gidiyordu:
-- e-posta düşerse bilet tamamen kayboluyordu ve yöneticinin geçmişi
-- görebileceği hiçbir yer yoktu. Artık kayıt önce buraya yazılır, e-posta
-- ikincil bildirimdir.
--
-- /support rotası HERKESE AÇIK (App.tsx'te RequireAuth yok) — oturumsuz
-- ziyaretçi de bilet açabilmeli. Bu yüzden INSERT anon'a da verilir, ama
-- WITH CHECK user_id'yi auth.uid()'e sabitler: kimse başkasının kimliğiyle
-- bilet açamaz, oturumsuz kayıtta user_id NULL kalır.
--
-- Ön koşul: 008 (is_admin), 040 (notifications)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Oturumsuz ziyaretçi biletlerinde NULL.
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject          TEXT NOT NULL,
  message          TEXT NOT NULL,
  priority         TEXT NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reporter_name    TEXT,
  reporter_email   TEXT,
  reporter_company TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_created_idx ON public.support_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx    ON public.support_tickets (user_id, created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- IS NOT DISTINCT FROM: oturumluysa user_id = auth.uid() olmak ZORUNDA,
-- oturumsuzsa (auth.uid() NULL) user_id de NULL olmak zorunda.
DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NOT DISTINCT FROM auth.uid());

-- Kullanıcı yalnızca kendi biletini görür; yönetici hepsini görür.
-- Oturumsuzda auth.uid() NULL olduğu için hiçbir satır dönmez.
DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
CREATE POLICY support_tickets_select ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS support_tickets_admin_write ON public.support_tickets;
CREATE POLICY support_tickets_admin_write ON public.support_tickets FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── Yeni bilet → yöneticilere bildirim ────────────────────────────────
-- 040'taki zil altyapısını kullanır (audience='admin' yayını, tek satır).
CREATE OR REPLACE FUNCTION public.notify_admins_new_support_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (audience, type, title, message, link, entity_type, entity_id)
  VALUES (
    'admin',
    CASE WHEN NEW.priority IN ('high', 'critical') THEN 'warning' ELSE 'info' END,
    'Yeni destek mesajı: ' || NEW.subject,
    left(NEW.message, 160),
    '/support',
    'support_ticket',
    NEW.id::TEXT
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS support_tickets_notify_admins ON public.support_tickets;
CREATE TRIGGER support_tickets_notify_admins
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_support_ticket();

NOTIFY pgrst, 'reload schema';
