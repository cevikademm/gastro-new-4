// ─── Hata Bildirimleri Paneli (Admin) ────────────────────────────────
// error_reports kayıtlarını Supabase'den listeler: ekran görüntüsü, açıklama,
// önem, durum. Admin durumu değiştirebilir, görüntüyü büyütebilir, WhatsApp'tan
// iletebilir, silebilir. Widget: components/ErrorReportWidget.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Bug, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  buildWhatsAppText, openWhatsApp,
  type ErrorReport, type ErrorStatus, type ErrorSeverity,
} from '../../lib/errorReport';

const SEV: Record<ErrorSeverity, { label: string; color: string }> = {
  low: { label: 'Düşük', color: '#16A34A' },
  normal: { label: 'Normal', color: '#F59E0B' },
  high: { label: 'Yüksek/Acil', color: '#EF4444' },
};
const STATUS: Record<ErrorStatus, { label: string; color: string }> = {
  new: { label: 'Yeni', color: '#EF4444' },
  in_progress: { label: 'İnceleniyor', color: '#F59E0B' },
  resolved: { label: 'Çözüldü', color: '#16A34A' },
};
const FILTERS: Array<{ key: ErrorStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'new', label: 'Yeni' },
  { key: 'in_progress', label: 'İnceleniyor' },
  { key: 'resolved', label: 'Çözüldü' },
];

const fmtDate = (s: string) => { try { return new Date(s).toLocaleString('tr-TR'); } catch { return s || ''; } };

export default function ErrorReportsPage() {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ErrorStatus | 'all'>('all');
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!supabase) { setError('Supabase yapılandırılmamış.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('error_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message.includes('does not exist')
        ? 'error_reports tablosu bulunamadı — migration 018 SQL\'ini çalıştırın.'
        : error.message);
      setReports([]);
    } else {
      setReports((data as ErrorReport[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filtered = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => (r.status || 'new') === filter)),
    [reports, filter],
  );

  const counts = useMemo(() => ({
    all: reports.length,
    new: reports.filter((r) => (r.status || 'new') === 'new').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }), [reports]);

  const setStatus = useCallback(async (id: string, status: ErrorStatus) => {
    if (!supabase) return;
    setBusy(id);
    const resolved_at = status === 'resolved' ? new Date().toISOString() : null;
    const { error } = await supabase.from('error_reports').update({ status, resolved_at }).eq('id', id);
    if (!error) {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status, resolved_at } : r)));
    }
    setBusy(null);
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!supabase) return;
    if (!confirm('Bu hata bildirimini silmek istediğinize emin misiniz?')) return;
    setBusy(id);
    const { error } = await supabase.from('error_reports').delete().eq('id', id);
    if (!error) setReports((prev) => prev.filter((r) => r.id !== id));
    setBusy(null);
  }, []);

  const imgSrc = (r: ErrorReport) => r.screenshot_url || r.screenshot_data || null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-2">
            <Bug size={28} /> Hata Bildirimleri
          </h1>
          <p className="text-on-surface-variant mt-1">Adminlerin WhatsApp ile ilettiği hatalar, ekran görüntüsü ve açıklamasıyla burada toplanır.</p>
        </div>
        <button
          onClick={fetchReports}
          className="px-4 py-2 text-sm font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low inline-flex items-center gap-2"
        >
          <RefreshCw size={15} /> Yenile
        </button>
      </header>

      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Filtre sekmeleri */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/20 hover:bg-surface-container-low'
              }`}
            >
              {f.label} · {counts[f.key] ?? 0}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant">
          <Loader2 className="animate-spin mx-auto mb-2" /> Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-2xl">
          <div className="text-4xl mb-2">🐛</div>
          <p className="font-semibold">Bu filtrede hata bildirimi yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {filtered.map((r) => {
            const sev = SEV[r.severity] || SEV.normal;
            const st = STATUS[r.status || 'new'] || STATUS.new;
            const src = imgSrc(r);
            return (
              <div key={r.id} className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden flex flex-col shadow-sm">
                {src ? (
                  <button onClick={() => setZoom(src)} title="Büyüt" className="block bg-slate-100 cursor-zoom-in">
                    <img src={src} alt="Hata ekran görüntüsü" className="block w-full h-40 object-cover" />
                  </button>
                ) : (
                  <div className="h-40 flex items-center justify-center bg-slate-100 text-on-surface-variant text-sm">
                    Ekran görüntüsü yok
                  </div>
                )}

                <div className="p-4 flex flex-col gap-2.5 flex-1">
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border" style={{ background: `${st.color}1a`, color: st.color, borderColor: `${st.color}44` }}>{st.label}</span>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border" style={{ background: `${sev.color}1a`, color: sev.color, borderColor: `${sev.color}44` }}>{sev.label}</span>
                    <span className="ml-auto text-[11.5px] text-on-surface-variant">{fmtDate(r.created_at)}</span>
                  </div>

                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{r.description}</p>

                  <div className="text-[11.5px] text-on-surface-variant leading-relaxed border-t border-outline-variant/20 pt-2">
                    <div><b>Sayfa:</b> {r.page_path || '—'}</div>
                    <div><b>Bildiren:</b> {r.reporter_name || '—'} {r.reporter_email ? `· ${r.reporter_email}` : ''}</div>
                    <div><b>Ekran:</b> {r.screen_size || '—'}</div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap mt-auto pt-1">
                    {(r.status || 'new') !== 'in_progress' && (r.status || 'new') !== 'resolved' && (
                      <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'in_progress')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: '#F59E0B55', background: '#F59E0B12', color: '#B45309' }}>İncele</button>
                    )}
                    {(r.status || 'new') !== 'resolved' && (
                      <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'resolved')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: '#16A34A55', background: '#16A34A12', color: '#15803D' }}>Çözüldü</button>
                    )}
                    {r.status === 'resolved' && (
                      <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'new')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low">Yeniden Aç</button>
                    )}
                    <button onClick={() => openWhatsApp(buildWhatsAppText(r))} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: '#128C7E55', background: '#128C7E12', color: '#128C7E' }}>WhatsApp</button>
                    {r.page_url && (
                      <button onClick={() => window.open(r.page_url as string, '_blank', 'noopener')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low">Sayfaya Git</button>
                    )}
                    <button disabled={busy === r.id} onClick={() => remove(r.id)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: '#EF444455', background: '#EF444412', color: '#DC2626' }}>Sil</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Görüntü büyütme */}
      {zoom && (
        <div onClick={() => setZoom(null)} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={zoom} alt="Hata ekran görüntüsü (büyük)" className="max-w-full max-h-full rounded-lg shadow-2xl" />
          <button onClick={() => setZoom(null)} className="fixed top-4 right-4 w-10 h-10 rounded-lg bg-white/15 text-white text-2xl">✕</button>
        </div>
      )}
    </div>
  );
}
