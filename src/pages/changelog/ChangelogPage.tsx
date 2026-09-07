// ─── Neler Düzeldi (müşteri portalı) ─────────────────────────────────
// Rota: /degisiklikler · Herkese açık (AdminGuard yok)
//
// Otomatik düzeltme ajanı bir hatayı çözüp canlıya aldığında buraya sade
// dilde bir kayıt düşer. Amaç: bir sorun bildiren kişinin sonucu
// öğrenebilmesi.
//
// Kart iki parçalıdır ve bilerek öyledir:
//   1) "Siz ne bildirdiniz"  → bildirenin KENDİ cümlesi (request_text)
//   2) "Biz ne yaptık"       → sade dil çözüm özeti (summary)
// Bildiren kişi kendi cümlesini görmeden "benim sorunum mu düzeldi?"
// sorusunu yanıtlayamıyordu; tek başına özet yetmiyor.
//
// Veri: src/lib/changelog.ts · Tablo: migration 039 + 049 (istek bağlamı)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, Loader2, RefreshCw, Undo2, Wrench, TrendingUp, Rocket,
  MessageSquareQuote, CheckCircle2, MapPin, CalendarDays, Timer, ArrowDown,
} from 'lucide-react';
import {
  fetchChangelog, fmtChangelogDate, daysBetween,
  type ChangelogEntry, type ChangelogCategory,
} from '../../lib/changelog';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

type CatMeta = { labelKey: string; fallback: string; color: string; Icon: typeof Wrench };

// Kategori görselleri: renk + ikon. Etiket i18n'den okunur (eskiden sabit TR'ydi).
const CATEGORY: Record<ChangelogCategory, CatMeta> = {
  fix:         { labelKey: 'changelog.category.fix',         fallback: 'Düzeltme',    color: '#16A34A', Icon: Wrench },
  improvement: { labelKey: 'changelog.category.improvement', fallback: 'İyileştirme', color: '#0EA5E9', Icon: TrendingUp },
  feature:     { labelKey: 'changelog.category.feature',     fallback: 'Yenilik',     color: '#931315', Icon: Rocket },
};

/** Yükleme sırasında düzenin zıplamaması için kart iskeleti. */
function SkeletonCard() {
  return (
    <li className="ml-5">
      <span className="absolute -left-[7px] w-3.5 h-3.5 rounded-full bg-outline-variant/40 border-2 border-surface-container-lowest" />
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 animate-pulse">
        <div className="flex gap-2 mb-4">
          <div className="h-5 w-24 rounded-full bg-surface-container-high" />
          <div className="h-5 w-20 rounded-full bg-surface-container-high ml-auto" />
        </div>
        <div className="h-16 rounded-xl bg-surface-container-high mb-3" />
        <div className="h-12 rounded-xl bg-surface-container-high" />
      </div>
    </li>
  );
}

export default function ChangelogPage() {
  const { t, i18n } = useTranslation();
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

  // Başlıktaki sayaçlar — akışın canlı olduğunu göstermek için.
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = entries.filter((e) => {
      const d = new Date(e.published_at || e.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const durations = entries
      .map((e) => daysBetween(e.requested_at, e.published_at || e.created_at))
      .filter((v): v is number => v !== null);
    const median = durations.length
      ? [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]
      : null;
    return { total: entries.length, thisMonth, median };
  }, [entries]);

  const dateLocale = i18n.language ? `${i18n.language}-${i18n.language.toUpperCase()}` : 'tr-TR';

  return (
    <div className="max-w-3xl mx-auto space-y-6 w-full">
      <SEO
        title={t('changelog.title', 'Neler Düzeldi')}
        description={t('changelog.subtitle', 'Bildirdiğiniz sorunlar için yaptığımız düzeltmeler.')}
      />

      {/* ── Başlık ───────────────────────────────────────────────────── */}
      <header className="rounded-3xl border border-outline-variant/20 bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-2">
              <Sparkles size={26} className="shrink-0" /> {t('changelog.title', 'Neler Düzeldi')}
            </h1>
            <p className="text-on-surface-variant mt-1.5 text-sm leading-relaxed">
              {t('changelog.subtitle', 'Bildirdiğiniz sorunlar için yaptığımız düzeltmeler burada listelenir.')}
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-high inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('common.refresh', 'Yenile')}
          </button>
        </div>

        {!loading && entries.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                {t('changelog.statTotal', 'Toplam düzeltme')}
              </dt>
              <dd className="text-xl font-black text-on-surface mt-0.5">{stats.total}</dd>
            </div>
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                {t('changelog.statThisMonth', 'Bu ay')}
              </dt>
              <dd className="text-xl font-black text-on-surface mt-0.5">{stats.thisMonth}</dd>
            </div>
            {stats.median !== null && (
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 col-span-2 sm:col-span-1">
                <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  {t('changelog.statMedian', 'Ortalama çözüm')}
                </dt>
                <dd className="text-xl font-black text-on-surface mt-0.5">
                  {stats.median === 0
                    ? t('changelog.sameDay', 'Aynı gün')
                    : t('changelog.days', { count: stats.median, defaultValue: '{{count}} gün' })}
                </dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <ol className="relative border-l border-outline-variant/30 ml-3 space-y-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <li className="ml-5 sr-only">
            <Loader2 className="animate-spin" /> {t('common.loading', 'Yükleniyor…')}
          </li>
        </ol>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-3xl">
          <div className="text-4xl mb-2">✨</div>
          <p className="font-semibold">{t('changelog.empty', 'Henüz yayınlanmış bir düzeltme yok.')}</p>
        </div>
      ) : (
        <ol className="relative border-l border-outline-variant/30 ml-3 space-y-5">
          {entries.map((e) => {
            const cat = CATEGORY[e.category] || CATEGORY.fix;
            const CatIcon = cat.Icon;
            const reverted = e.status === 'reverted';
            const dotColor = reverted ? '#DC2626' : cat.color;
            const doneAt = e.published_at || e.created_at;
            const took = daysBetween(e.requested_at, doneAt);

            return (
              <li key={e.id} className="ml-5">
                <span
                  className="absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest"
                  style={{ background: dotColor }}
                />
                <article className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
                  {/* Üst şerit: kategori + nerede + tarih */}
                  <div
                    className="flex items-center gap-2 flex-wrap px-4 sm:px-5 py-3 border-b border-outline-variant/15"
                    style={{ background: `${dotColor}0d` }}
                  >
                    <span
                      className="text-[11px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5"
                      style={{ background: `${cat.color}1a`, color: cat.color, borderColor: `${cat.color}44` }}
                    >
                      <CatIcon size={12} /> {t(cat.labelKey, cat.fallback)}
                    </span>

                    {reverted && (
                      <span
                        title={t('changelog.revertedHint', 'Bu düzeltme sorun çıkardığı için geri alındı.')}
                        className="text-[11px] font-extrabold px-2.5 py-1 rounded-full border inline-flex items-center gap-1"
                        style={{ background: '#DC26261a', color: '#DC2626', borderColor: '#DC262644' }}
                      >
                        <Undo2 size={11} /> {t('changelog.reverted', 'Geri alındı')}
                      </span>
                    )}

                    {e.request_path && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant inline-flex items-center gap-1 max-w-[45%] truncate">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{e.request_path}</span>
                      </span>
                    )}

                    <span className="ml-auto text-[11.5px] text-on-surface-variant inline-flex items-center gap-1 shrink-0">
                      <CalendarDays size={12} /> {fmtChangelogDate(doneAt, dateLocale)}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {/* 1) Bildirenin kendi cümlesi */}
                    {e.request_text && (
                      <>
                        <section className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-3.5">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant inline-flex items-center gap-1.5 mb-1.5">
                            <MessageSquareQuote size={13} /> {t('changelog.reported', 'Siz bildirdiniz')}
                          </h3>
                          <blockquote className="text-[14px] leading-relaxed text-on-surface-variant italic border-l-2 border-outline-variant/40 pl-3 whitespace-pre-line">
                            {e.request_text}
                          </blockquote>
                          {e.requested_at && (
                            <p className="mt-2 text-[11px] text-on-surface-variant/80">
                              {fmtChangelogDate(e.requested_at, dateLocale)}
                            </p>
                          )}
                        </section>

                        <div className="flex justify-center" aria-hidden="true">
                          <ArrowDown size={16} className="text-outline-variant" />
                        </div>
                      </>
                    )}

                    {/* 2) Yapılan düzeltme */}
                    <section
                      className="rounded-xl border p-3.5"
                      style={{ background: `${dotColor}0f`, borderColor: `${dotColor}33` }}
                    >
                      <h3
                        className="text-[10px] font-bold uppercase tracking-[0.16em] inline-flex items-center gap-1.5 mb-1.5"
                        style={{ color: dotColor }}
                      >
                        <CheckCircle2 size={13} /> {t('changelog.done', 'Biz ne yaptık')}
                      </h3>
                      <p className="text-[15px] leading-relaxed text-on-surface font-medium">{e.summary}</p>

                      {took !== null && (
                        <p className="mt-2.5 text-[11px] font-bold inline-flex items-center gap-1" style={{ color: dotColor }}>
                          <Timer size={12} />
                          {took === 0
                            ? t('changelog.solvedSameDay', 'Aynı gün çözüldü')
                            : t('changelog.solvedInDays', { count: took, defaultValue: '{{count}} günde çözüldü' })}
                        </p>
                      )}
                    </section>

                    {e.detail && (
                      <details className="group">
                        <summary className="cursor-pointer select-none text-[11.5px] font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
                          {t('changelog.technical', 'Teknik detay')}
                        </summary>
                        <p className="mt-2 pl-3 border-l-2 border-outline-variant/40 text-[12px] text-on-surface-variant leading-relaxed whitespace-pre-line">
                          {e.detail}
                        </p>
                      </details>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
