-- ─────────────────────────────────────────────────────────────────────
-- 041_fix_agent_rpcs.sql
-- Otomatik düzeltme ajanının sunucu tarafı: kuyruk, atomik claim, sonuç
-- yazımı, dağıtım duyurusu ve bakım.
--
-- TASARIM İLKESİ: Ajan hangi kaydın işleneceğine KARAR VERMEZ, sunucu verir.
-- Ajanın gönderdiği hiçbir alana güvenilmez — kapsam ve boyut sınırları
-- record_fix_result içinde tekrar doğrulanır.
--
-- Edge function: supabase/functions/fix-agent · Panel: src/lib/fixAgent.ts
-- Ön koşul: 037 (fix_*), 038 (audit), 039 (changelog), 040 (notifications)
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

-- ─── 1. Ayarlar ────────────────────────────────────────────────────────
INSERT INTO public.app_settings (key, value) VALUES
  ('fix_agent_enabled',    'false'),          -- kill switch (kurulum bitene kadar kapalı)
  ('fix_agent_secret',     ''),
  ('fix_agent_mode',       'auto'),           -- 'auto' | 'approved_only'
  ('fix_agent_max_files',  '8'),
  ('fix_agent_max_lines',  '400'),
  ('fix_agent_max_per_run','1'),
  ('fix_agent_max_per_day','10'),
  ('fix_agent_lease_min',  '90'),
  ('fix_agent_notify_reporter', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_setting(p_key TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT value FROM public.app_settings WHERE key = p_key), p_default);
$$;

-- ─── 2. Kuyruk view'ı — "bekleyen iş" tanımı TEK yerde ─────────────────
CREATE OR REPLACE VIEW public.fix_agent_queue
WITH (security_invoker = true) AS
SELECT 'error_report'::text            AS target,
       r.id::text                      AS id,
       r.severity,
       r.status,
       1                               AS occurrences,
       r.page_path, r.page_url, r.screen_size, r.user_agent,
       r.description                   AS raw_description,
       r.description_ai                AS detailed_description,
       NULL::text                      AS stack,
       r.console_errors,
       r.ai_model, r.ai_prompt,
       r.fix_status, r.fix_attempt_count, r.fix_claimed_at,
       r.created_at                    AS seen_at
  FROM public.error_reports r
 WHERE r.deleted_at IS NULL
   AND r.status IN ('new', 'in_progress')
   AND r.ai_status = 'ok'
   AND r.ai_prompt IS NOT NULL
   AND r.fix_attempt_count < 2
UNION ALL
SELECT 'error_log'::text,
       l.id::text,
       l.severity,
       l.status,
       l.occurrences,
       l.page_path, l.page_url, l.screen_size, l.user_agent,
       l.message,
       l.description_ai,
       l.stack,
       NULL::text,
       l.ai_model, l.ai_prompt,
       l.fix_status, l.fix_attempt_count, l.fix_claimed_at,
       l.last_seen_at
  FROM public.error_logs l
 WHERE l.deleted_at IS NULL
   AND l.status IN ('new', 'in_progress')
   AND l.level = 'error'
   AND l.ai_status = 'ok'
   AND l.ai_prompt IS NOT NULL
   AND l.fix_attempt_count < 2;

COMMENT ON VIEW public.fix_agent_queue IS
  'Ajanın işleyebileceği aday kayıtlar. Uygunluk (fix_status/mod) claim_fix_targets içinde süzülür.';

-- ─── 3. Bakım: bayat lease, terfi, doğrulama, regresyon ────────────────
CREATE OR REPLACE FUNCTION public.fix_agent_housekeeping()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease   INTERVAL := (COALESCE(public.app_setting('fix_agent_lease_min', '90'), '90') || ' minutes')::interval;
  v_released INTEGER := 0;
  v_promoted INTEGER := 0;
  v_verified INTEGER := 0;
  v_regressed INTEGER := 0;
  v_closed   INTEGER := 0;
  n INTEGER;
BEGIN
  -- 3.1 Ölü koşudan kalan claim'leri serbest bırak.
  UPDATE public.error_reports SET fix_status = 'eligible', fix_claimed_at = NULL, fix_run_id = NULL
   WHERE fix_status = 'claimed' AND fix_claimed_at < now() - v_lease;
  GET DIAGNOSTICS n = ROW_COUNT; v_released := v_released + n;

  UPDATE public.error_logs SET fix_status = 'eligible', fix_claimed_at = NULL, fix_run_id = NULL
   WHERE fix_status = 'claimed' AND fix_claimed_at < now() - v_lease;
  GET DIAGNOSTICS n = ROW_COUNT; v_released := v_released + n;

  -- 3.2 Dağıtım bildirimi kaçmışsa 45 dk sonra committed → deployed terfi.
  UPDATE public.error_reports SET fix_status = 'deployed', deployed_at = COALESCE(deployed_at, now())
   WHERE fix_status = 'committed' AND committed_at < now() - interval '45 minutes';
  GET DIAGNOSTICS n = ROW_COUNT; v_promoted := v_promoted + n;

  UPDATE public.error_logs SET fix_status = 'deployed', deployed_at = COALESCE(deployed_at, now())
   WHERE fix_status = 'committed' AND committed_at < now() - interval '45 minutes';
  GET DIAGNOSTICS n = ROW_COUNT; v_promoted := v_promoted + n;

  -- 3.3 Regresyon: log dağıtımdan SONRA tekrar görüldüyse geri alma iste.
  UPDATE public.error_logs SET fix_status = 'revert_requested'
   WHERE fix_status IN ('deployed', 'verified')
     AND deployed_at IS NOT NULL
     AND last_seen_at > deployed_at + interval '2 minutes';
  GET DIAGNOSTICS n = ROW_COUNT; v_regressed := n;

  -- 3.4 60 dk temiz kaldıysa doğrulandı say ve kaydı kapat.
  UPDATE public.error_logs
     SET fix_status = 'verified', verified_at = now(),
         status = 'resolved', resolved_at = COALESCE(resolved_at, now())
   WHERE fix_status = 'deployed'
     AND deployed_at < now() - interval '60 minutes'
     AND (last_seen_at IS NULL OR last_seen_at <= deployed_at);
  GET DIAGNOSTICS n = ROW_COUNT; v_verified := v_verified + n;

  UPDATE public.error_reports
     SET fix_status = 'verified', verified_at = now(),
         status = 'resolved', resolved_at = COALESCE(resolved_at, now())
   WHERE fix_status = 'deployed' AND deployed_at < now() - interval '60 minutes';
  GET DIAGNOSTICS n = ROW_COUNT; v_verified := v_verified + n;

  -- 3.5 Asılı queued izlerini kapat (038).
  v_closed := public.close_stale_fix_events('30 minutes');

  RETURN jsonb_build_object(
    'stale_claims_released', v_released,
    'promoted_to_deployed',  v_promoted,
    'verified',              v_verified,
    'revert_requested',      v_regressed,
    'queued_fixes_closed',   v_closed
  );
END $$;

-- ─── 4. Atomik claim ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_fix_targets(p_run_id TEXT, p_limit INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled  BOOLEAN := public.app_setting('fix_agent_enabled', 'false') = 'true';
  v_mode     TEXT    := COALESCE(public.app_setting('fix_agent_mode', 'auto'), 'auto');
  v_per_run  INTEGER := LEAST(GREATEST(COALESCE(p_limit, 1), 1),
                              COALESCE(public.app_setting('fix_agent_max_per_run', '1')::int, 1));
  v_per_day  INTEGER := COALESCE(public.app_setting('fix_agent_max_per_day', '10')::int, 10);
  v_today    INTEGER;
  v_states   TEXT[];
  v_house    JSONB;
  v_claimed  JSONB := '[]'::jsonb;
  v_reverts  JSONB := '[]'::jsonb;
BEGIN
  v_house := public.fix_agent_housekeeping();

  -- Geri alma istekleri her zaman öncelikli — kill switch'ten bağımsız,
  -- çünkü bunlar zaten canlıdaki bir bozukluğu geri almak için.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'target', 'error_log', 'id', id::text,
           'commit_sha', fix_commit_sha,
           'reason', 'Hata dağıtımdan sonra tekrar etti'
         )), '[]'::jsonb)
    INTO v_reverts
    FROM public.error_logs
   WHERE fix_status = 'revert_requested' AND fix_commit_sha IS NOT NULL;

  IF NOT v_enabled THEN
    RETURN jsonb_build_object('ok', true, 'enabled', false, 'mode', v_mode,
                              'claimed', '[]'::jsonb, 'revert_requests', v_reverts,
                              'housekeeping', v_house);
  END IF;

  -- Günlük kap.
  SELECT count(*) INTO v_today
    FROM public.error_fixes
   WHERE kind = 'agent_fix' AND status = 'ok' AND created_at > now() - interval '24 hours';
  IF v_today >= v_per_day THEN
    RETURN jsonb_build_object('ok', true, 'enabled', true, 'mode', v_mode,
                              'claimed', '[]'::jsonb, 'revert_requests', v_reverts,
                              'capped', true, 'housekeeping', v_house);
  END IF;

  v_states := CASE WHEN v_mode = 'approved_only'
                   THEN ARRAY['eligible', 'failed']
                   ELSE ARRAY['none', 'eligible', 'failed'] END;

  -- error_reports
  WITH picked AS (
    SELECT r.id
      FROM public.error_reports r
      JOIN public.fix_agent_queue q ON q.target = 'error_report' AND q.id = r.id
     WHERE r.fix_status = ANY(v_states)
     ORDER BY (r.severity = 'high') DESC, r.created_at ASC
     LIMIT v_per_run
     FOR UPDATE OF r SKIP LOCKED
  ), upd AS (
    UPDATE public.error_reports r
       SET fix_status = 'claimed', fix_claimed_at = now(), fix_run_id = p_run_id,
           fix_attempt_count = r.fix_attempt_count + 1
      FROM picked p WHERE r.id = p.id
      RETURNING r.*
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'target','error_report','id',u.id,'attempt',u.fix_attempt_count,
           'severity',u.severity,'status',u.status,'occurrences',1,
           'page_path',u.page_path,'page_url',u.page_url,
           'screen_size',u.screen_size,'user_agent',u.user_agent,
           'raw_description',u.description,'detailed_description',u.description_ai,
           'stack',NULL,'console_errors',u.console_errors,
           'ai_model',u.ai_model,'ai_prompt',u.ai_prompt
         )), '[]'::jsonb) INTO v_claimed FROM upd u;

  -- Kota dolmadıysa error_logs'tan tamamla.
  IF jsonb_array_length(v_claimed) < v_per_run THEN
    WITH picked AS (
      SELECT l.id
        FROM public.error_logs l
        JOIN public.fix_agent_queue q ON q.target = 'error_log' AND q.id = l.id::text
       WHERE l.fix_status = ANY(v_states)
       ORDER BY (l.severity = 'high') DESC, l.occurrences DESC, l.last_seen_at DESC
       LIMIT (v_per_run - jsonb_array_length(v_claimed))
       FOR UPDATE OF l SKIP LOCKED
    ), upd AS (
      UPDATE public.error_logs l
         SET fix_status = 'claimed', fix_claimed_at = now(), fix_run_id = p_run_id,
             fix_attempt_count = l.fix_attempt_count + 1
        FROM picked p WHERE l.id = p.id
        RETURNING l.*
    )
    SELECT v_claimed || COALESCE(jsonb_agg(jsonb_build_object(
             'target','error_log','id',u.id::text,'attempt',u.fix_attempt_count,
             'severity',u.severity,'status',u.status,'occurrences',u.occurrences,
             'page_path',u.page_path,'page_url',u.page_url,
             'screen_size',u.screen_size,'user_agent',u.user_agent,
             'raw_description',u.message,'detailed_description',u.description_ai,
             'stack',u.stack,'console_errors',NULL,
             'ai_model',u.ai_model,'ai_prompt',u.ai_prompt
           )), '[]'::jsonb) INTO v_claimed FROM upd u;
  END IF;

  -- Claim izleri.
  INSERT INTO public.error_fixes (report_id, log_id, target_kind, target_ref, kind, status, title, actor, payload)
  SELECT CASE WHEN e->>'target' = 'error_report' THEN e->>'id' END,
         CASE WHEN e->>'target' = 'error_log'    THEN (e->>'id')::uuid END,
         CASE WHEN e->>'target' = 'error_report' THEN 'report' ELSE 'log' END,
         e->>'id', 'agent_claim', 'queued', 'Ajan işi aldı', 'fix-agent',
         jsonb_build_object('run_id', p_run_id, 'attempt', e->>'attempt')
    FROM jsonb_array_elements(v_claimed) e;

  RETURN jsonb_build_object('ok', true, 'enabled', true, 'mode', v_mode,
                            'run_id', p_run_id,
                            'claimed', v_claimed, 'revert_requests', v_reverts,
                            'housekeeping', v_house);
END $$;

-- ─── 5. Sonuç yazımı (ajanın gönderdiğine GÜVENİLMEZ) ──────────────────
CREATE OR REPLACE FUNCTION public.record_fix_result(p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target    TEXT := p->>'target';
  v_id        TEXT := p->>'id';
  v_outcome   TEXT := p->>'outcome';
  v_sha       TEXT := p->>'commit_sha';
  v_files     JSONB := COALESCE(p->'files_changed', '[]'::jsonb);
  v_lines     INTEGER := COALESCE((p->>'insertions')::int, 0) + COALESCE((p->>'deletions')::int, 0);
  v_max_files INTEGER := COALESCE(public.app_setting('fix_agent_max_files', '8')::int, 8);
  v_max_lines INTEGER := COALESCE(public.app_setting('fix_agent_max_lines', '400')::int, 400);
  v_bad       TEXT;
  v_chg       UUID;
  v_slug      TEXT;
BEGIN
  IF v_target NOT IN ('error_report', 'error_log') OR v_id IS NULL THEN
    RAISE EXCEPTION 'Geçersiz hedef';
  END IF;

  IF v_outcome = 'applied' THEN
    -- Kapsam kapısı: her yol src/ altında olmalı.
    SELECT string_agg(f, ', ') INTO v_bad
      FROM jsonb_array_elements_text(v_files) f
     WHERE f !~ '^src/' OR f LIKE '%..%';
    IF v_bad IS NOT NULL THEN
      v_outcome := 'failed';
      p := p || jsonb_build_object('reason_code', 'scope_violation',
                                   'reason', 'Kapsam dışı dosya: ' || v_bad);
    ELSIF jsonb_array_length(v_files) = 0 THEN
      v_outcome := 'failed';
      p := p || jsonb_build_object('reason_code', 'no_change', 'reason', 'Değişen dosya bildirilmedi');
    ELSIF jsonb_array_length(v_files) > v_max_files OR v_lines > v_max_lines THEN
      v_outcome := 'failed';
      p := p || jsonb_build_object('reason_code', 'too_large',
                                   'reason', format('Boyut sınırı aşıldı (%s dosya, %s satır)',
                                                    jsonb_array_length(v_files), v_lines));
    ELSIF v_sha IS NULL OR v_sha !~ '^[0-9a-f]{7,40}$' THEN
      v_outcome := 'failed';
      p := p || jsonb_build_object('reason_code', 'unknown', 'reason', 'Geçersiz commit sha');
    ELSIF COALESCE(p#>>'{checks,tsc}', '') <> 'pass'
       OR COALESCE(p#>>'{checks,build}', '') <> 'pass' THEN
      v_outcome := 'failed';
      p := p || jsonb_build_object('reason_code', 'unknown', 'reason', 'Doğrulama kapıları geçilmemiş');
    END IF;
  END IF;

  -- Kaydı güncelle.
  IF v_target = 'error_report' THEN
    UPDATE public.error_reports SET
      fix_status = CASE v_outcome WHEN 'applied' THEN 'committed'
                                  WHEN 'skipped' THEN 'skipped' ELSE 'failed' END,
      fix_commit_sha = CASE WHEN v_outcome = 'applied' THEN v_sha ELSE fix_commit_sha END,
      fix_commit_url = CASE WHEN v_outcome = 'applied' THEN p->>'commit_url' ELSE fix_commit_url END,
      fix_files      = CASE WHEN v_outcome = 'applied' THEN v_files ELSE fix_files END,
      fix_lines_changed = CASE WHEN v_outcome = 'applied' THEN v_lines ELSE fix_lines_changed END,
      fix_summary    = COALESCE(p->>'fix_summary', fix_summary),
      fix_technical  = COALESCE(p->>'fix_technical', fix_technical),
      fix_skip_reason = CASE WHEN v_outcome = 'skipped' THEN p->>'reason' ELSE fix_skip_reason END,
      fix_error      = CASE WHEN v_outcome = 'failed' THEN p->>'reason' ELSE NULL END,
      committed_at   = CASE WHEN v_outcome = 'applied' THEN now() ELSE committed_at END,
      fix_claimed_at = NULL, fix_run_id = NULL,
      status = CASE WHEN v_outcome = 'applied' THEN 'in_progress' ELSE status END
    WHERE id = v_id;
  ELSE
    UPDATE public.error_logs SET
      fix_status = CASE v_outcome WHEN 'applied' THEN 'committed'
                                  WHEN 'skipped' THEN 'skipped' ELSE 'failed' END,
      fix_commit_sha = CASE WHEN v_outcome = 'applied' THEN v_sha ELSE fix_commit_sha END,
      fix_commit_url = CASE WHEN v_outcome = 'applied' THEN p->>'commit_url' ELSE fix_commit_url END,
      fix_files      = CASE WHEN v_outcome = 'applied' THEN v_files ELSE fix_files END,
      fix_lines_changed = CASE WHEN v_outcome = 'applied' THEN v_lines ELSE fix_lines_changed END,
      fix_summary    = COALESCE(p->>'fix_summary', fix_summary),
      fix_technical  = COALESCE(p->>'fix_technical', fix_technical),
      fix_skip_reason = CASE WHEN v_outcome = 'skipped' THEN p->>'reason' ELSE fix_skip_reason END,
      fix_error      = CASE WHEN v_outcome = 'failed' THEN p->>'reason' ELSE NULL END,
      committed_at   = CASE WHEN v_outcome = 'applied' THEN now() ELSE committed_at END,
      fix_claimed_at = NULL, fix_run_id = NULL,
      status = CASE WHEN v_outcome = 'applied' THEN 'in_progress' ELSE status END
    WHERE id = v_id::uuid;
  END IF;

  -- Geçmiş izi.
  INSERT INTO public.error_fixes (report_id, log_id, target_kind, target_ref, kind, status,
                                  title, detail, actor, payload)
  VALUES (
    CASE WHEN v_target = 'error_report' THEN v_id END,
    CASE WHEN v_target = 'error_log'    THEN v_id::uuid END,
    CASE WHEN v_target = 'error_report' THEN 'report' ELSE 'log' END,
    v_id,
    CASE v_outcome WHEN 'applied' THEN 'agent_fix' WHEN 'skipped' THEN 'agent_skip' ELSE 'agent_fix' END,
    CASE v_outcome WHEN 'applied' THEN 'ok' WHEN 'skipped' THEN 'skipped' ELSE 'failed' END,
    CASE v_outcome
      WHEN 'applied' THEN 'Ajan düzeltti → ' || left(COALESCE(v_sha, ''), 7)
      WHEN 'skipped' THEN 'Ajan vazgeçti: ' || COALESCE(p->>'reason_code', '?')
      ELSE 'Ajan başarısız: ' || COALESCE(p->>'reason_code', '?') END,
    COALESCE(p->>'fix_technical', p->>'reason', p->>'log_tail'),
    'fix-agent',
    p - 'log_tail'
  );

  -- Başarılı düzeltme → changelog taslağı (dağıtımda yayınlanır).
  IF v_outcome = 'applied' AND COALESCE(p->>'fix_summary', '') <> '' THEN
    v_slug := 'fix-' || left(v_sha, 7) || '-' || left(md5(v_id), 4);
    INSERT INTO public.changelog_entries (
      slug, title, summary, detail, category, source_kind,
      report_id, log_id, commit_sha, commit_url, files, status
    ) VALUES (
      v_slug,
      COALESCE(NULLIF(left(p->>'fix_summary', 80), ''), 'Düzeltme'),
      p->>'fix_summary',
      p->>'fix_technical',
      'fix',
      v_target,
      CASE WHEN v_target = 'error_report' THEN v_id END,
      CASE WHEN v_target = 'error_log'    THEN v_id::uuid END,
      v_sha, p->>'commit_url', v_files, 'pending'
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_chg;
  END IF;

  -- Kapsam ihlali admin'e anında bildirilsin.
  IF v_outcome = 'failed' AND p->>'reason_code' IN ('scope_violation', 'too_large') THEN
    INSERT INTO public.notifications (audience, type, title, message, entity_type, entity_id)
    VALUES ('admin', 'error', 'Ajan kapsam ihlali',
            COALESCE(p->>'reason', 'Ajan sınır dışına çıktı'), v_target, v_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'outcome', v_outcome, 'changelog_id', v_chg);
END $$;

-- ─── 6. Dağıtım duyurusu ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publish_fix_deploy(p_sha TEXT, p_url TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promoted INTEGER := 0;
  v_published INTEGER := 0;
  v_emails JSONB := '[]'::jsonb;
  n INTEGER;
BEGIN
  IF p_sha IS NULL OR length(p_sha) < 7 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'commit_sha gerekli');
  END IF;

  UPDATE public.error_reports
     SET fix_status = 'deployed', deployed_at = now()
   WHERE fix_status = 'committed' AND fix_commit_sha LIKE left(p_sha, 7) || '%';
  GET DIAGNOSTICS n = ROW_COUNT; v_promoted := v_promoted + n;

  UPDATE public.error_logs
     SET fix_status = 'deployed', deployed_at = now()
   WHERE fix_status = 'committed' AND fix_commit_sha LIKE left(p_sha, 7) || '%';
  GET DIAGNOSTICS n = ROW_COUNT; v_promoted := v_promoted + n;

  UPDATE public.changelog_entries
     SET status = 'published', published_at = now(), deployed_at = now()
   WHERE status = 'pending' AND commit_sha LIKE left(p_sha, 7) || '%';
  GET DIAGNOSTICS v_published = ROW_COUNT;

  -- Herkese açık duyuru.
  INSERT INTO public.notifications (audience, type, title, message, link, entity_type, entity_id)
  SELECT 'all', 'success', c.title, c.summary, '/degisiklikler', 'changelog', c.id::text
    FROM public.changelog_entries c
   WHERE c.status = 'published' AND c.published_at > now() - interval '1 minute';

  -- Bildirene özel bildirim + e-posta hedefleri.
  IF public.app_setting('fix_agent_notify_reporter', 'true') = 'true' THEN
    INSERT INTO public.notifications (user_id, audience, type, title, message, link, entity_type, entity_id)
    SELECT pr.id, 'user', 'success',
           'Bildirdiğiniz sorun düzeltildi',
           r.fix_summary, '/degisiklikler', 'error_report', r.id
      FROM public.error_reports r
      JOIN public.profiles pr ON lower(pr.email) = lower(r.reporter_email)
     WHERE r.fix_status = 'deployed' AND r.fix_notified_at IS NULL
       AND r.fix_summary IS NOT NULL;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'email', r.reporter_email, 'name', r.reporter_name,
             'summary', r.fix_summary, 'id', r.id, 'reported_at', r.created_at)), '[]'::jsonb)
      INTO v_emails
      FROM public.error_reports r
     WHERE r.fix_status = 'deployed' AND r.fix_notified_at IS NULL
       AND r.reporter_email IS NOT NULL AND r.fix_summary IS NOT NULL;

    UPDATE public.error_reports SET fix_notified_at = now()
     WHERE fix_status = 'deployed' AND fix_notified_at IS NULL AND fix_summary IS NOT NULL;
  END IF;

  INSERT INTO public.error_fixes (target_kind, target_ref, kind, status, title, detail, actor, payload)
  VALUES ('report', left(p_sha, 7), 'deploy', 'ok',
          'Canlıya alındı → ' || left(p_sha, 7), p_url, 'github-actions',
          jsonb_build_object('sha', p_sha, 'promoted', v_promoted, 'published', v_published));

  RETURN jsonb_build_object('ok', true, 'promoted', v_promoted,
                            'published', v_published, 'emails', v_emails);
END $$;

-- ─── 7. Geri alma kaydı ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_fix_revert(p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target TEXT := p->>'target';
  v_id     TEXT := p->>'id';
BEGIN
  IF v_target = 'error_log' THEN
    UPDATE public.error_logs
       SET fix_status = 'reverted', reverted_at = now(), status = 'new'
     WHERE id = v_id::uuid;
  ELSE
    UPDATE public.error_reports
       SET fix_status = 'reverted', reverted_at = now(), status = 'new'
     WHERE id = v_id;
  END IF;

  UPDATE public.changelog_entries SET status = 'reverted'
   WHERE commit_sha = p->>'reverted_sha';

  INSERT INTO public.error_fixes (report_id, log_id, target_kind, target_ref, kind, status,
                                  title, detail, actor, payload)
  VALUES (CASE WHEN v_target = 'error_report' THEN v_id END,
          CASE WHEN v_target = 'error_log'    THEN v_id::uuid END,
          CASE WHEN v_target = 'error_report' THEN 'report' ELSE 'log' END,
          v_id, 'agent_revert',
          CASE WHEN p->>'revert_commit_sha' IS NULL THEN 'failed' ELSE 'ok' END,
          'Düzeltme geri alındı', p->>'reason', 'fix-agent', p);

  INSERT INTO public.notifications (audience, type, title, message, entity_type, entity_id)
  VALUES ('admin', 'warning', 'Otomatik düzeltme geri alındı',
          COALESCE(p->>'reason', 'Hata tekrar etti'), v_target, v_id);

  RETURN jsonb_build_object('ok', true);
END $$;

-- Bu RPC'leri yalnızca service_role (edge function) çağırır.
REVOKE ALL ON FUNCTION public.claim_fix_targets(TEXT, INTEGER)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_fix_result(JSONB)              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_fix_deploy(TEXT, TEXT)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_fix_revert(JSONB)              FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_fix_targets(TEXT, INTEGER)   TO service_role;
GRANT EXECUTE ON FUNCTION public.record_fix_result(JSONB)           TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_fix_deploy(TEXT, TEXT)     TO service_role;
GRANT EXECUTE ON FUNCTION public.record_fix_revert(JSONB)           TO service_role;
-- Bakım fonksiyonunu admin panel de çağırabilsin.
GRANT EXECUTE ON FUNCTION public.fix_agent_housekeeping()           TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
