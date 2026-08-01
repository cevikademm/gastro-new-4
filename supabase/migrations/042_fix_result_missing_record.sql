-- ─────────────────────────────────────────────────────────────────────
-- 042_fix_result_missing_record.sql
-- record_fix_result: kayıt yoksa FK hatasıyla patlamasın.
--
-- Ajan bir işi aldıktan sonra kayıt silinirse (ya da geçersiz bir id
-- gönderirse) error_fixes insert'i foreign key kısıtına takılıp tüm çağrıyı
-- düşürüyordu. Bu, ajanın sonucunu bildirememesine ve kaydın sonsuza dek
-- 'claimed' kalmasına yol açar.
--
-- Çözüm: parent satır yoksa FK kolonlarını NULL bırak — target_kind/target_ref
-- zaten hangi kayda ait olduğunu taşıyor (migration 038).
--
-- Idempotent — tekrar çalıştırılabilir.
-- ─────────────────────────────────────────────────────────────────────

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
  v_exists    BOOLEAN := false;
  v_is_report BOOLEAN := (v_target = 'error_report');
BEGIN
  IF v_target NOT IN ('error_report', 'error_log') OR v_id IS NULL THEN
    RAISE EXCEPTION 'Geçersiz hedef';
  END IF;

  -- ─── Kapsam ve boyut kapısı — ajanın iddiasına GÜVENİLMEZ ───────────
  IF v_outcome = 'applied' THEN
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

  -- ─── Kaydı güncelle (varsa) ─────────────────────────────────────────
  IF v_is_report THEN
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
    GET DIAGNOSTICS v_exists = ROW_COUNT;
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
    GET DIAGNOSTICS v_exists = ROW_COUNT;
  END IF;

  -- ─── Geçmiş izi. Kayıt yoksa FK kolonları NULL — target_ref taşıyor ──
  INSERT INTO public.error_fixes (report_id, log_id, target_kind, target_ref, kind, status,
                                  title, detail, actor, payload)
  VALUES (
    CASE WHEN v_is_report AND v_exists THEN v_id END,
    CASE WHEN NOT v_is_report AND v_exists THEN v_id::uuid END,
    CASE WHEN v_is_report THEN 'report' ELSE 'log' END,
    v_id,
    CASE v_outcome WHEN 'skipped' THEN 'agent_skip' ELSE 'agent_fix' END,
    CASE v_outcome WHEN 'applied' THEN 'ok' WHEN 'skipped' THEN 'skipped' ELSE 'failed' END,
    CASE v_outcome
      WHEN 'applied' THEN 'Ajan düzeltti → ' || left(COALESCE(v_sha, ''), 7)
      WHEN 'skipped' THEN 'Ajan vazgeçti: ' || COALESCE(p->>'reason_code', '?')
      ELSE 'Ajan başarısız: ' || COALESCE(p->>'reason_code', '?') END
      || CASE WHEN v_exists THEN '' ELSE ' (kayıt bulunamadı)' END,
    COALESCE(p->>'fix_technical', p->>'reason', p->>'log_tail'),
    'fix-agent',
    p - 'log_tail'
  );

  -- ─── Başarılı düzeltme → changelog taslağı (dağıtımda yayınlanır) ────
  IF v_outcome = 'applied' AND v_exists AND COALESCE(p->>'fix_summary', '') <> '' THEN
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
      CASE WHEN v_is_report THEN v_id END,
      CASE WHEN NOT v_is_report THEN v_id::uuid END,
      v_sha, p->>'commit_url', v_files, 'pending'
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO v_chg;
  END IF;

  -- ─── Kapsam ihlali admin'e anında bildirilsin ───────────────────────
  IF v_outcome = 'failed' AND COALESCE(p->>'reason_code', '') IN ('scope_violation', 'too_large') THEN
    INSERT INTO public.notifications (audience, type, title, message, entity_type, entity_id)
    VALUES ('admin', 'error', 'Ajan kapsam ihlali',
            COALESCE(p->>'reason', 'Ajan sınır dışına çıktı'), v_target, v_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'outcome', v_outcome,
                            'record_found', v_exists, 'changelog_id', v_chg);
END $$;

REVOKE ALL ON FUNCTION public.record_fix_result(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_fix_result(JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
