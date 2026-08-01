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

/** Tarihi "1 Ağustos 2026" biçiminde verir; bozuksa ham değeri döndürür. */
export function fmtChangelogDate(iso: string | null, locale = 'tr-TR'): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}
