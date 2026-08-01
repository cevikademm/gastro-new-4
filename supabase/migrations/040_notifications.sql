-- ─────────────────────────────────────────────────────────────────────
-- 040_notifications.sql
-- Gerçek bildirim altyapısı.
--
-- Bugün portaldaki zil ikonu src/stores/uiStore.ts içine gömülü 4 adet
-- 2024 tarihli SAHTE demo kaydını gösteriyor; addNotification hiçbir yerden
-- çağrılmıyor ve notifications tablosu yok. Bu migration zili gerçek veriye
-- bağlar.
--
-- İki tablo:
--   notifications      → bildirimin kendisi. audience='all' olanlar tek satır
--                        olarak durur (kullanıcı başına çoğaltılmaz).
--   notification_reads → kim neyi okudu. audience='all' yayınları da böylece
--                        kullanıcı başına okundu işaretlenebilir.
--
-- İstemci: src/lib/notifications.ts · Panel: src/components/NotificationPanel.tsx
-- Ön koşul: 008 (is_admin), 039 (changelog — link hedefi)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- audience='user' ise dolu; 'all'/'admin' yayınlarında NULL.
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audience    TEXT NOT NULL DEFAULT 'user'
                CHECK (audience IN ('user', 'all', 'admin')),
  type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'success', 'warning', 'error')),
  title       TEXT NOT NULL,
  message     TEXT,
  link        TEXT,
  entity_type TEXT,
  entity_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_user_chk CHECK (
    (audience = 'user' AND user_id IS NOT NULL) OR audience <> 'user'
  )
);

CREATE INDEX IF NOT EXISTS notifications_user_idx     ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_audience_idx ON public.notifications (audience, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

-- ─── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT
  USING (
    (audience = 'user'  AND user_id = auth.uid())
    OR audience = 'all'
    OR (audience = 'admin' AND public.is_admin())
  );

DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS notification_reads_own ON public.notification_reads;
CREATE POLICY notification_reads_own ON public.notification_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Okuma view'ı: bildirim + bu kullanıcının okundu bilgisi ───────────
CREATE OR REPLACE VIEW public.my_notifications
WITH (security_invoker = true) AS
SELECT n.id,
       n.audience,
       n.type,
       n.title,
       n.message,
       n.link,
       n.entity_type,
       n.entity_id,
       n.created_at,
       (r.read_at IS NOT NULL) AS read,
       r.read_at
  FROM public.notifications n
  LEFT JOIN public.notification_reads r
         ON r.notification_id = n.id AND r.user_id = auth.uid();

GRANT SELECT ON public.my_notifications TO authenticated;

-- ─── Okundu işaretleme RPC'leri ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  INSERT INTO public.notification_reads (notification_id, user_id)
  VALUES (p_id, auth.uid())
  ON CONFLICT (notification_id, user_id) DO NOTHING;
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.notification_reads (notification_id, user_id)
  SELECT n.id, auth.uid()
    FROM public.notifications n
   WHERE (n.audience = 'user' AND n.user_id = auth.uid())
      OR n.audience = 'all'
      OR (n.audience = 'admin' AND public.is_admin())
  ON CONFLICT (notification_id, user_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read()     TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
