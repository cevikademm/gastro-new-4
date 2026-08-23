// Changelog — "Neler Düzeldi" akışı (müşteri portalı).
// Otomatik düzeltme ajanı bir hatayı çözüp canlıya aldığında buraya sade dilde
// bir kayıt düşer. Yazan taraf: supabase/functions/fix-agent (publish_fix_deploy).
// Tablo + RLS: supabase/migrations/039_changelog.sql
// Sayfa: src/pages/changelog/ChangelogPage.tsx
import { supabase } from './supabase';

export type ChangelogCategory = 'fix' | 'improvement' | 'feature';
export type ChangelogStatus = 'pending' | 'published' | 'reverted' | 'hidden';

export interface ChangelogEntry {
  id: string;
  slug: string | null;
  title: string;
  /** Kullanıcıya gösterilen sade dil özeti — teknik terim/dosya adı içermez. */
  summary: string;
  /** Teknik not; yalnızca admin'e gösterilir. */
  detail: string | null;
  category: ChangelogCategory;
  severity: string | null;
  source_kind: string | null;
  commit_sha: string | null;
  commit_url: string | null;
  files: string[] | null;
  status: ChangelogStatus;
  created_at: string;
  published_at: string | null;
}

/**
 * Yayınlanmış girdileri getirir. RLS yalnızca published/reverted olanları
 * dışarı veriyor, yani anonim ziyaretçi de görebilir.
 */
export async function fetchChangelog(limit = 50): Promise<{ data: ChangelogEntry[]; error: string }> {
  if (!supabase) return { data: [], error: 'Supabase yapılandırılmamış.' };
  const { data, error } = await supabase
    .from('changelog_entries')
    .select('*')
    .in('status', ['published', 'reverted'])
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return {
      data: [],
      error: /does not exist|schema cache/i.test(error.message)
        ? 'changelog_entries tablosu bulunamadı — migration 039 SQL\'ini çalıştırın.'
        : error.message,
    };
  }
  return { data: (data as ChangelogEntry[]) || [], error: '' };
}

// ─── Elle çözüm → portal yayını (migration 043) ──────────────────────
// Admin panelinde "Çözüldü" denince buradan geçilir. Eskiden yalnızca
// error_reports.status güncelleniyordu; changelog'a hiçbir şey düşmediği için
// sorunu bildiren kişi sonucu göremiyordu.

export type ResolutionKind = 'report' | 'log';

export interface PublishResolutionInput {
  kind: ResolutionKind;
  id: string;
  /** Kullanıcıya gösterilecek sade dil özeti (yayınlanacaksa zorunlu). */
  summary: string;
  /** Teknik not — yalnızca admin görür. */
  detail?: string | null;
  category?: ChangelogCategory;
  /** false → kayıt kapanır ama portalda yayınlanmaz. */
  publish?: boolean;
}

const MISSING_RPC = /function .* does not exist|schema cache|could not find the function/i;

const rpcError = (msg: string): string =>
  MISSING_RPC.test(msg)
    ? 'publish_manual_resolution bulunamadı — migration 043 SQL\'ini çalıştırın.'
    : msg;

/**
 * Kaydı "çözüldü" yapar ve (publish ise) /degisiklikler sayfasında yayınlar,
 * bildirene bildirim düşer. Aynı kayıt için tekrar çağrılırsa girdi güncellenir
 * — kopya satır oluşmaz.
 */
export async function publishManualResolution(
  input: PublishResolutionInput,
): Promise<{ ok: boolean; published: boolean; error?: string }> {
  if (!supabase) return { ok: false, published: false, error: 'Supabase yapılandırılmamış.' };
  try {
    const { data, error } = await supabase.rpc('publish_manual_resolution', {
      p_kind: input.kind,
      p_id: input.id,
      p_summary: input.summary,
      p_detail: input.detail || null,
      p_category: input.category || 'fix',
      p_publish: input.publish !== false,
    });
    if (error) return { ok: false, published: false, error: rpcError(error.message) };
    const res = (data || {}) as { ok?: boolean; published?: boolean; error?: string };
    if (!res.ok) return { ok: false, published: false, error: res.error || 'İşlem tamamlanamadı.' };
    return { ok: true, published: !!res.published };
  } catch (e) {
    return { ok: false, published: false, error: (e as Error)?.message || 'İşlem hatası' };
  }
}

/** "Yeniden Aç": kaydı geri açar, portaldaki girdiyi gizler (silmez). */
export async function unpublishResolution(
  kind: ResolutionKind,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase yapılandırılmamış.' };
  try {
    const { data, error } = await supabase.rpc('unpublish_manual_resolution', { p_kind: kind, p_id: id });
    if (error) return { ok: false, error: rpcError(error.message) };
    const res = (data || {}) as { ok?: boolean; error?: string };
    return res.ok ? { ok: true } : { ok: false, error: res.error || 'İşlem tamamlanamadı.' };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'İşlem hatası' };
  }
}

/**
 * Portalda yayında olan kayıtların kimlikleri — panelde "Yayında" rozeti için.
 * Admin RLS'i tüm girdileri görür; hata durumunda boş küme döner (rozet yok).
 */
export async function fetchPublishedTargets(
  kind: ResolutionKind = 'report',
): Promise<Set<string>> {
  if (!supabase) return new Set();
  const col = kind === 'report' ? 'report_id' : 'log_id';
  const { data, error } = await supabase
    .from('changelog_entries')
    .select(col)
    .eq('status', 'published')
    .not(col, 'is', null);
  if (error || !data) return new Set();
  return new Set(
    (data as Array<Record<string, string | null>>)
      .map((r) => r[col])
      .filter((v): v is string => !!v),
  );
}

/** Tarihi "1 Ağustos 2026" biçiminde verir; bozuksa ham değeri döndürür. */
export function fmtChangelogDate(iso: string | null, locale = 'tr-TR'): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}
