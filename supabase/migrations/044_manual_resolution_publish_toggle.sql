-- ─────────────────────────────────────────────────────────────────────
-- 044_manual_resolution_publish_toggle.sql
-- 043'ün küçük tutarlılık düzeltmesi.
--
-- SORUN: "Portalda yayınla" kutusu kapatılarak yeniden kaydedilen bir kayıt
-- daha önce yayınlanmışsa girdi portalda kalmaya devam ediyordu — pencerede
-- "kullanıcı tarafında görünmez" yazdığı hâlde görünüyordu.
--
-- ÇÖZÜM: p_publish = false → varsa mevcut girdi gizlenir (silinmez).
-- Yalnızca fonksiyon gövdesi değişir; imza ve yetkiler 043'teki gibi.
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.publish_manual_resolution(
  p_kind     TEXT,                       -- 'report' | 'log'
  p_id       TEXT,
  p_summary  TEXT DEFAULT NULL,          -- kullanıcıya görünen sade dil özeti
  p_detail   TEXT DEFAULT NULL,          -- teknik not (yalnızca admin görür)
  p_category TEXT DEFAULT 'fix',
  p_publish  BOOLEAN DEFAULT TRUE        -- false → kapat ama portalda gösterme
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary  TEXT := NULLIF(btrim(COALESCE(p_summary, '')), '');
  v_detail   TEXT := NULLIF(btrim(COALESCE(p_detail, '')), '');
  v_category TEXT := CASE WHEN p_category IN ('fix', 'improvement', 'feature')
                          THEN p_category ELSE 'fix' END;
  v_slug     TEXT := 'cozuldu-' || left(md5(p_kind || ':' || COALESCE(p_id, '')), 10);
  v_chg      UUID;
  v_found    BOOLEAN := FALSE;
  v_email    TEXT;
  v_notified TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bu işlem için admin yetkisi gerekiyor.');
  END IF;

  IF p_kind NOT IN ('report', 'log') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Geçersiz kayıt türü.');
  END IF;

  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kayıt kimliği gerekli.');
  END IF;

  -- Yayınlanacaksa özet zorunlu: changelog_entries.summary kullanıcıya
  -- gösterilen metin, boş bırakılırsa sayfa anlamsız görünür.
  IF p_publish AND (v_summary IS NULL OR length(v_summary) < 5) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Yayınlamak için en az birkaç kelimelik bir açıklama yazın.');
  END IF;

  -- ── Kaydı çözüldü yap ────────────────────────────────────────────────
  IF p_kind = 'report' THEN
    UPDATE public.error_reports
       SET status        = 'resolved',
           resolved_at   = COALESCE(resolved_at, now()),
           fix_summary   = COALESCE(v_summary, fix_summary),
           fix_technical = COALESCE(v_detail, fix_technical),
           -- Ajan akışındaki kayıtların durumu ezilmesin; yalnızca boşta
           -- olanlar "manual" olur.
           fix_status    = CASE WHEN COALESCE(fix_status, 'none')
                                     IN ('none', 'eligible', 'failed', 'skipped')
                                THEN 'manual' ELSE fix_status END
     WHERE id = p_id
       AND deleted_at IS NULL
    RETURNING reporter_email, fix_notified_at INTO v_email, v_notified;
    v_found := FOUND;
  ELSE
    UPDATE public.error_logs
       SET status        = 'resolved',
           resolved_at   = COALESCE(resolved_at, now()),
           fix_summary   = COALESCE(v_summary, fix_summary),
           fix_technical = COALESCE(v_detail, fix_technical),
           fix_status    = CASE WHEN COALESCE(fix_status, 'none')
                                     IN ('none', 'eligible', 'failed', 'skipped')
                                THEN 'manual' ELSE fix_status END
     WHERE id = p_id::uuid
       AND deleted_at IS NULL
    RETURNING user_email, fix_notified_at INTO v_email, v_notified;
    v_found := FOUND;
  END IF;

  IF NOT v_found THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kayıt bulunamadı (silinmiş olabilir).');
  END IF;

  -- ── Portal girdisi (/degisiklikler) ──────────────────────────────────
  IF p_publish THEN
    -- Slug kayıt başına sabit → tekrar "Çözüldü" denince kopya değil güncelleme.
    INSERT INTO public.changelog_entries (
      slug, title, summary, detail, category, source_kind,
      report_id, log_id, status, actor, published_at
    ) VALUES (
      v_slug,
      left(v_summary, 80),
      v_summary,
      v_detail,
      v_category,
      CASE WHEN p_kind = 'report' THEN 'error_report' ELSE 'error_log' END,
      CASE WHEN p_kind = 'report' THEN p_id END,
      CASE WHEN p_kind = 'log'    THEN p_id::uuid END,
      'published',
      'admin',
      now()
    )
    ON CONFLICT (slug) DO UPDATE
      SET title        = EXCLUDED.title,
          summary      = EXCLUDED.summary,
          detail       = EXCLUDED.detail,
          category     = EXCLUDED.category,
          status       = 'published',
          published_at = COALESCE(changelog_entries.published_at, now())
    RETURNING id INTO v_chg;

    -- Herkese açık duyuru — kayıt başına bir kez.
    IF v_chg IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.notifications
       WHERE entity_type = 'changelog' AND entity_id = v_chg::text
    ) THEN
      INSERT INTO public.notifications (audience, type, title, message, link, entity_type, entity_id)
      VALUES ('all', 'success', 'Bildirilen bir sorun düzeltildi',
              v_summary, '/degisiklikler', 'changelog', v_chg::text);
    END IF;

    -- Bildirene özel bildirim (hesabı varsa) — bir kez.
    IF v_email IS NOT NULL AND v_notified IS NULL THEN
      INSERT INTO public.notifications (
        user_id, audience, type, title, message, link, entity_type, entity_id)
      SELECT pr.id, 'user', 'success', 'Bildirdiğiniz sorun düzeltildi',
             v_summary, '/degisiklikler',
             CASE WHEN p_kind = 'report' THEN 'error_report' ELSE 'error_log' END,
             p_id
        FROM public.profiles pr
       WHERE lower(pr.email) = lower(v_email);

      IF p_kind = 'report' THEN
        UPDATE public.error_reports SET fix_notified_at = now() WHERE id = p_id;
      ELSE
        UPDATE public.error_logs SET fix_notified_at = now() WHERE id = p_id::uuid;
      END IF;
    END IF;
  ELSE
    -- Yayın kapatıldı: daha önce yayınlanmış girdi varsa gizle (silme).
    UPDATE public.changelog_entries
       SET status = 'hidden'
     WHERE slug = v_slug AND status <> 'hidden';
  END IF;

  -- ── İşlem geçmişi ────────────────────────────────────────────────────
  INSERT INTO public.error_fixes (report_id, log_id, kind, status, title, detail, actor, payload)
  VALUES (
    CASE WHEN p_kind = 'report' THEN p_id END,
    CASE WHEN p_kind = 'log'    THEN p_id::uuid END,
    'status_change', 'ok',
    CASE WHEN p_publish THEN 'Çözüldü — /degisiklikler sayfasında yayınlandı'
         ELSE 'Çözüldü olarak işaretlendi (yayınlanmadı)' END,
    v_summary, 'admin',
    jsonb_build_object('published', p_publish, 'changelog_id', v_chg, 'category', v_category)
  );

  RETURN jsonb_build_object(
    'ok', true, 'published', p_publish AND v_chg IS NOT NULL, 'changelog_id', v_chg);
END $$;

NOTIFY pgrst, 'reload schema';
