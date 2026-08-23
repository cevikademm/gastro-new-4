// ─── Neler Düzeldi (müşteri portalı) ─────────────────────────────────
// Rota: /degisiklikler · Herkese açık (AdminGuard yok)
//
// Otomatik düzeltme ajanı bir hatayı çözüp canlıya aldığında buraya sade
// dilde bir kayıt düşer. Amaç: bir sorun bildiren kişinin sonucu
// öğrenebilmesi. Teknik detay yalnızca isteyene, katlanmış hâlde.
//
// Veri: src/lib/changelog.ts · Tablo: migration 039
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, RefreshCw, Undo2 } from 'lucide-react';
import {
  fetchChangelog, fmtChangelogDate,
  type ChangelogEntry, type ChangelogCategory,
} from '../../lib/changelog';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

const CATEGORY: Record<ChangelogCategory, { label: string; color: string }> = {
  fix:         { label: 'Düzeltme',  color: '#16A34A' },
  improvement: { label: 'İyileştirme', color: '#0EA5E9' },
  feature:     { label: 'Yenilik',   color: '#931315' },
};

export default function ChangelogPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error: err } = await fetchChangelog(60);
    setEntries(data);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Bir kayıt yayınlandığı anda sayfa kendini tazelesin — kullanıcı F5'e
  // basmadan görsün (changelog_entries realtime yayınında, migration 039).
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('changelog-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'changelog_entries' },
        () => { void load(true); })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 w-full">
      <SEO
        title={t('changelog.title', 'Neler Düzeldi')}
        description={t('changelog.subtitle', 'Bildirdiğiniz sorunlar için yaptığımız düzeltmeler.')}
      />

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-2">
            <Sparkles size={26} /> {t('changelog.title', 'Neler Düzeldi')}
          </h1>
          <p className="text-on-surface-variant mt-1">
            {t('changelog.subtitle', 'Bildirdiğiniz sorunlar için yaptığımız düzeltmeler burada listelenir.')}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low inline-flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw size={14} /> {t('common.refresh', 'Yenile')}
        </button>
      </header>

      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant">
          <Loader2 className="animate-spin mx-auto mb-2" /> {t('common.loading', 'Yükleniyor…')}
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-2xl">
          <div className="text-4xl mb-2">✨</div>
          <p className="font-semibold">{t('changelog.empty', 'Henüz yayınlanmış bir düzeltme yok.')}</p>
        </div>
      ) : (
        <ol className="relative border-l border-outline-variant/30 ml-3 space-y-5">
          {entries.map((e) => {
            const cat = CATEGORY[e.category] || CATEGORY.fix;
            const reverted = e.status === 'reverted';
            return (
              <li key={e.id} className="ml-5">
                <span
                  className="absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest"
                  style={{ background: reverted ? '#DC2626' : cat.color }}
                />
                <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span
                      className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border"
                      style={{ background: `${cat.color}1a`, color: cat.color, borderColor: `${cat.color}44` }}
                    >
                      {cat.label}
                    </span>
                    {reverted && (
                      <span
                        title={t('changelog.revertedHint', 'Bu düzeltme sorun çıkardığı için geri alındı.')}
                        className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border inline-flex items-center gap-1"
                        style={{ background: '#DC26261a', color: '#DC2626', borderColor: '#DC262644' }}
                      >
                        <Undo2 size={11} /> {t('changelog.reverted', 'Geri alındı')}
                      </span>
                    )}
                    <span className="ml-auto text-[11.5px] text-on-surface-variant">
                      {fmtChangelogDate(e.published_at || e.created_at)}
                    </span>
                  </div>

                  <p className="text-[15px] leading-relaxed text-on-surface">{e.summary}</p>

                  {e.detail && (
                    <details className="mt-2">
                      <summary className="cursor-pointer select-none text-[11.5px] font-semibold text-on-surface-variant">
                        {t('changelog.technical', 'Teknik detay')}
                      </summary>
                      <p className="mt-1 pl-2 border-l-2 border-outline-variant/40 text-[12px] text-on-surface-variant leading-relaxed">
                        {e.detail}
                      </p>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
