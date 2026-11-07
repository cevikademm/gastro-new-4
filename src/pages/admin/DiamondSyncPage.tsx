/**
 * /admin/diamond-sync — Diamond gece senkronu raporu.
 * Veri: diamond_sync_runs + diamond_sync_changes (scripts/diamond-nightly.mjs yazar, RLS: admin okur).
 */
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Loader2, TrendingUp, TrendingDown, ImageIcon, Trash2, Sparkles, Ruler, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type ChangeType = 'price' | 'image' | 'removed' | 'new' | 'updated';

interface SyncRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  feed_count: number | null;
  totals: Record<string, number | string>;
  error: string | null;
  trigger: string | null;
}

interface SyncChange {
  id: number;
  product_id: string;
  product_name: string | null;
  change_type: ChangeType;
  details: Record<string, any> | null;
}

const TABS: { type: ChangeType; label: string; icon: typeof TrendingUp; hint: string }[] = [
  { type: 'price', label: 'Fiyat', icon: TrendingUp, hint: 'Diamond fiyatı değişti; site fiyatı aynı oranda güncellendi.' },
  { type: 'removed', label: 'Kaldırılan', icon: Trash2, hint: 'Diamond listesinden çıktı; siteden kaldırıldı, ürün sayfası kategoriye yönlendiriliyor.' },
  { type: 'new', label: 'Yeni', icon: Sparkles, hint: "Diamond'a yeni eklendi; sitede yok — eklenip eklenmeyeceğine sen karar ver." },
  { type: 'updated', label: 'Ad / Ölçü', icon: Ruler, hint: 'Diamond ürün adını veya ölçülerini değiştirdi (bilgi amaçlı).' },
  { type: 'image', label: 'Resim', icon: ImageIcon, hint: 'Ürün görseli Diamond’ın güncel görseliyle değiştirildi.' },
];

const eur = (n: unknown) =>
  n == null || n === '' ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(n));
const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function DiamondSyncPage() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [runId, setRunId] = useState<number | null>(null);
  const [changes, setChanges] = useState<SyncChange[]>([]);
  const [tab, setTab] = useState<ChangeType>('price');
  const [q, setQ] = useState('');
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = async () => {
    setLoadingRuns(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('diamond_sync_runs')
      .select('id,started_at,finished_at,status,feed_count,totals,error,trigger')
      .order('started_at', { ascending: false })
      .limit(60);
    if (e) setError(e.message);
    const list = (data as SyncRun[]) || [];
    setRuns(list);
    setRunId((cur) => cur ?? list[0]?.id ?? null);
    setLoadingRuns(false);
  };

  useEffect(() => { void loadRuns(); }, []);

  useEffect(() => {
    if (runId == null) { setChanges([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingChanges(true);
      const all: SyncChange[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error: e } = await supabase
          .from('diamond_sync_changes')
          .select('id,product_id,product_name,change_type,details')
          .eq('run_id', runId)
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (e) { if (!cancelled) setError(e.message); break; }
        all.push(...((data as SyncChange[]) || []));
        if (!data || data.length < 1000) break;
      }
      if (!cancelled) { setChanges(all); setLoadingChanges(false); }
    })();
    return () => { cancelled = true; };
  }, [runId]);

  const counts = useMemo(() => {
    const c: Record<ChangeType, number> = { price: 0, image: 0, removed: 0, new: 0, updated: 0 };
    for (const ch of changes) c[ch.change_type]++;
    return c;
  }, [changes]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return changes.filter((c) => c.change_type === tab && (!s || c.product_id.toLowerCase().includes(s) || (c.product_name || '').toLowerCase().includes(s)));
  }, [changes, tab, q]);

  const run = runs.find((r) => r.id === runId) || null;
  const activeTab = TABS.find((t) => t.type === tab)!;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 text-[#0F2440]">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Diamond Senkron</h1>
          <p className="text-sm text-slate-500 mt-1">
            Her gece Diamond kataloğu ile site karşılaştırılır: fiyat ve resimler güncellenir, listeden çıkan ürünler kaldırılır, yeni ürünler onayına sunulur.
          </p>
        </div>
        <button
          onClick={() => void loadRuns()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:border-[#931315] hover:text-[#931315]"
        >
          <RefreshCw size={14} className={loadingRuns ? 'animate-spin' : ''} /> Yenile
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Gece listesi */}
        <aside className="rounded-xl border border-slate-200 bg-white p-2 h-fit max-h-[75vh] overflow-y-auto">
          {loadingRuns && !runs.length && <div className="p-4 text-sm text-slate-500">Yükleniyor…</div>}
          {!loadingRuns && !runs.length && <div className="p-4 text-sm text-slate-500">Henüz senkron çalışmadı.</div>}
          {runs.map((r) => {
            const t = r.totals || {};
            return (
              <button
                key={r.id}
                onClick={() => setRunId(r.id)}
                className={`w-full text-left rounded-lg px-3 py-2.5 mb-1 border transition ${r.id === runId ? 'border-[#931315]/30 bg-[#931315]/5' : 'border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {r.status === 'success' && <CheckCircle2 size={14} className="text-green-600" />}
                  {r.status === 'error' && <XCircle size={14} className="text-red-600" />}
                  {r.status === 'running' && <Loader2 size={14} className="animate-spin text-slate-500" />}
                  {dt(r.started_at)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {r.status === 'error'
                    ? <span className="text-red-600">{(r.error || 'Hata').slice(0, 80)}</span>
                    : <>{Number(t.price || 0)} fiyat · {Number(t.removed || 0)} kaldırılan · {Number(t.new || 0)} yeni</>}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Seçili gecenin detayı */}
        <section className="min-w-0">
          {run && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.type}
                    onClick={() => setTab(t.type)}
                    className={`rounded-xl border p-3 text-left transition ${tab === t.type ? 'border-[#931315] bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Icon size={13} /> {t.label}</div>
                    <div className={`mt-1 text-2xl font-black ${tab === t.type ? 'text-[#931315]' : ''}`}>{counts[t.type]}</div>
                  </button>
                );
              })}
            </div>
          )}

          {run && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">{activeTab.hint}</p>
                <label className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Kod veya ürün ara"
                    className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[#931315]"
                  />
                </label>
              </div>

              {loadingChanges ? (
                <div className="p-6 text-sm text-slate-500">Yükleniyor…</div>
              ) : visible.length === 0 ? (
                <div className="p-6 text-sm text-slate-500">Bu gece bu türde değişiklik yok.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {tab === 'new' && <th className="px-3 py-2">Görsel</th>}
                        <th className="px-3 py-2">Kod</th>
                        <th className="px-3 py-2">Ürün</th>
                        <th className="px-3 py-2">Değişiklik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.slice(0, 1000).map((c) => (
                        <tr key={c.id} className="border-t border-slate-100 align-top">
                          {tab === 'new' && (
                            <td className="px-3 py-2">
                              {c.details?.image
                                ? <img src={c.details.image} alt="" loading="lazy" className="h-12 w-12 rounded object-contain bg-white border border-slate-100" />
                                : <div className="h-12 w-12 rounded bg-slate-100" />}
                            </td>
                          )}
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{c.product_id}</td>
                          <td className="px-3 py-2">{c.product_name || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap"><ChangeCell c={c} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visible.length > 1000 && <p className="p-3 text-xs text-slate-500">İlk 1000 kayıt gösteriliyor ({visible.length} toplam) — aramayla daraltın.</p>}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ChangeCell({ c }: { c: SyncChange }) {
  const d = c.details || {};
  switch (c.change_type) {
    case 'price': {
      const up = Number(d.pct) > 0;
      const Arrow = up ? TrendingUp : TrendingDown;
      return (
        <span className="inline-flex items-center gap-2">
          {eur(d.site_old ?? d.diamond_old)} → <b>{eur(d.site_new ?? d.diamond_new)}</b>
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-red-700' : 'text-green-700'}`}>
            <Arrow size={12} />{up ? '+' : ''}{d.pct}%
          </span>
          <span className="text-xs text-slate-400">(Diamond {eur(d.diamond_old)} → {eur(d.diamond_new)})</span>
        </span>
      );
    }
    case 'removed':
      return <span className="text-slate-600">{d.from === 'site' ? `Siteden kaldırıldı${d.price ? ` · ${eur(d.price)}` : ''}` : 'Diamond tablosundan silindi'}</span>;
    case 'new':
      return <span>{eur(d.price_catalog)} <span className="text-xs text-slate-400">{d.family || ''}</span></span>;
    case 'updated':
      return (
        <span className="text-xs">
          {Object.entries(d).map(([k, v]: [string, any]) => (
            <div key={k}><span className="text-slate-400">{k}:</span> {String(v?.old)} → <b>{String(v?.new)}</b></div>
          ))}
        </span>
      );
    case 'image':
      return d.new ? <img src={d.new} alt="" loading="lazy" className="h-12 w-12 rounded object-contain border border-slate-100" /> : <span>—</span>;
    default:
      return null;
  }
}
