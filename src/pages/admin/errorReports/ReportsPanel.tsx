// ─── Bildirimler (error_reports) ─────────────────────────────────────
// Adminlerin "Hata Bildir" widget'ıyla elle ilettiği hatalar: ekran görüntüsü,
// açıklama, önem, durum. Otomatik yakalanan sistem hataları ayrı sekmede
// (LogsPanel · error_logs).
//
// Widget: src/components/ErrorReportWidget.tsx · SQL: migrations/018, 030, 031
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Sparkles, Bot, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  buildWhatsAppText, openWhatsApp, archiveReport,
  type ErrorReport, type ErrorStatus, type ErrorSeverity,
} from '../../../lib/errorReport';
import { generateFixPrompt, saveFixPrompt, markFixPromptFailed } from '../../../lib/fixPrompt';
import { markEligible, requestRevert } from '../../../lib/fixAgent';
import FixStatusBadge from './FixStatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PromptModal from './PromptModal';

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

export default function ReportsPanel() {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ErrorStatus | 'all'>('all');
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // AI düzeltme prompt'u: hangi kayıt için üretiliyor + açık olan prompt modalı.
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [promptView, setPromptView] = useState<ErrorReport | null>(null);
  const [toDelete, setToDelete] = useState<ErrorReport | null>(null);

  const fetchReports = useCallback(async () => {
    if (!supabase) { setError('Supabase yapılandırılmamış.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('error_reports')
      .select('*')
      // Arşive alınanlar (soft delete, migration 038) listede görünmez —
      // geçmişleri İşlem Geçmişi sekmesinde durmaya devam eder.
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (err) {
      setError(/does not exist|schema cache/i.test(err.message)
        ? 'error_reports tablosu bulunamadı — migration 018 SQL\'ini çalıştırın.'
        : err.message);
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
    const { error: err } = await supabase.from('error_reports').update({ status, resolved_at }).eq('id', id);
    if (!err) {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status, resolved_at } : r)));
    }
    setBusy(null);
  }, []);

  const doDelete = useCallback(async () => {
    if (!toDelete) return;
    setBusy(toDelete.id);
    // Soft delete: kayıt arşive alınır, işlem geçmişi korunur (migration 038).
    const res = await archiveReport(toDelete.id);
    if (res.ok) setReports((prev) => prev.filter((r) => r.id !== toDelete.id));
    else setError(res.error || 'Silinemedi.');
    setBusy(null);
    setToDelete(null);
  }, [toDelete]);

  /**
   * Claude Haiku ile düzeltme prompt'u üretir, kayda yazar ve modalda gösterir.
   * Kayıtta prompt varsa doğrudan gösterir (force=true ile yeniden üretilir).
   */
  const buildPrompt = useCallback(async (r: ErrorReport, force = false) => {
    if (aiBusy) return;
    if (r.ai_prompt && !force) { setPromptView(r); return; }
    setAiBusy(r.id);
    setError('');
    try {
      const res = await generateFixPrompt({
        kind: 'report',
        description: r.description,
        pagePath: r.page_path,
        pageUrl: r.page_url,
        severity: r.severity,
        screenSize: r.screen_size,
        userAgent: r.user_agent,
        consoleErrors: r.console_errors,
        reporter: r.reporter_name,
      });
      const next: ErrorReport = {
        ...r,
        ai_prompt: res.prompt,
        ai_prompt_at: new Date().toISOString(),
        ai_model: res.model,
        // Ham `description` ezilmez — AI'ın detaylandırdığı hali ayrı sütunda.
        description_ai: res.detailedDescription || r.description_ai || null,
      };
      await saveFixPrompt(r.id, res);
      setReports((prev) => prev.map((x) => (x.id === r.id ? next : x)));
      setPromptView(next);
    } catch (e) {
      const msg = (e as Error)?.message || 'Prompt üretilemedi.';
      setError(msg);
      // Kayıt "AI hatası" olarak işaretlensin — yoksa panelde eski durum kalıyor.
      await markFixPromptFailed(r.id, msg);
      setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, ai_status: 'failed', ai_error: msg } : x)));
    } finally {
      setAiBusy(null);
    }
  }, [aiBusy]);

  /** Kaydı ajan kuyruğuna sokar (onaylı modda zorunlu adım). */
  const giveToAgent = useCallback(async (r: ErrorReport) => {
    setBusy(r.id);
    const err = await markEligible('report', r.id);
    if (err) setError(err);
    else setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, fix_status: 'eligible' } : x)));
    setBusy(null);
  }, []);

  /** Canlıdaki düzeltmenin geri alınmasını ister; ajan sıradaki koşuda yapar. */
  const askRevert = useCallback(async (r: ErrorReport) => {
    setBusy(r.id);
    const err = await requestRevert('report', r.id);
    if (err) setError(err);
    else setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, fix_status: 'revert_requested' } : x)));
    setBusy(null);
  }, []);

  const imgSrc = (r: ErrorReport) => r.screenshot_url || r.screenshot_data || null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* Filtre sekmeleri */}
      <div className="flex flex-wrap items-center gap-2">
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
        <button
          onClick={fetchReports}
          className="ml-auto px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low inline-flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Yenile
        </button>
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
                    {r.ai_prompt && (
                      <span title="AI analizi hazır" className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: '#931315' }}>
                        <Bot size={12} /> AI
                      </span>
                    )}
                    {r.ai_status === 'failed' && (
                      <span title={r.ai_error || 'AI analizi başarısız'} className="inline-flex items-center gap-1 text-[11px] font-bold text-error">
                        <AlertCircle size={12} /> AI hatası
                      </span>
                    )}
                    <FixStatusBadge status={r.fix_status} commitSha={r.fix_commit_sha} commitUrl={r.fix_commit_url} />
                    <span className="ml-auto text-[11.5px] text-on-surface-variant">{fmtDate(r.created_at)}</span>
                  </div>

                  {/* Ajan düzeltmeyi yaptıysa ne yaptığını burada anlat. */}
                  {r.fix_summary && (
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: '#16A34A44', background: '#16A34A0f' }}>
                      <div className="text-[10.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#15803D' }}>
                        Yapılan düzeltme
                      </div>
                      <p className="text-[12.5px] leading-relaxed">{r.fix_summary}</p>
                      {r.fix_technical && (
                        <p className="mt-1 text-[11.5px] text-on-surface-variant leading-relaxed">{r.fix_technical}</p>
                      )}
                    </div>
                  )}
                  {r.fix_skip_reason && (
                    <div className="rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed" style={{ borderColor: '#B4530944', background: '#B453090f', color: '#92400E' }}>
                      <b>Ajan vazgeçti:</b> {r.fix_skip_reason}
                    </div>
                  )}

                  {/* AI detaylandırdıysa onu göster; bildirenin kendi cümlesi
                      HER ZAMAN altında dursun — yanlış yorum yakalanabilsin. */}
                  {r.description_ai ? (
                    <div className="space-y-2">
                      <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{r.description_ai}</p>
                      <details className="text-[11.5px]">
                        <summary className="cursor-pointer select-none text-on-surface-variant font-semibold">
                          Bildirenin kendi ifadesi
                        </summary>
                        <p className="mt-1 pl-2 border-l-2 border-outline-variant/40 text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                          {r.description}
                        </p>
                      </details>
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{r.description}</p>
                  )}

                  <div className="text-[11.5px] text-on-surface-variant leading-relaxed border-t border-outline-variant/20 pt-2">
                    <div><b>Sayfa:</b> {r.page_path || '—'}</div>
                    <div><b>Bildiren:</b> {r.reporter_name || '—'} {r.reporter_email ? `· ${r.reporter_email}` : ''}</div>
                    <div><b>Ekran:</b> {r.screen_size || '—'}</div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap mt-auto pt-1">
                    <button
                      disabled={aiBusy === r.id}
                      onClick={() => buildPrompt(r)}
                      title={r.ai_prompt ? 'Üretilen düzeltme prompt\'unu göster' : 'Claude Haiku ile düzeltme prompt\'u üret'}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-wait"
                      style={{ borderColor: '#93131555', background: '#93131512', color: '#931315' }}
                    >
                      {aiBusy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {aiBusy === r.id ? 'Üretiliyor…' : r.ai_prompt ? 'Prompt\'u Gör' : 'AI Prompt'}
                    </button>
                    {/* Ajan akışı: kuyruğa ver / canlıdaki düzeltmeyi geri al */}
                    {r.ai_prompt && (!r.fix_status || r.fix_status === 'none') && (
                      <button
                        disabled={busy === r.id}
                        onClick={() => giveToAgent(r)}
                        title="Otomatik düzeltme ajanının kuyruğuna ekle"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1"
                        style={{ borderColor: '#6366F155', background: '#6366F112', color: '#4F46E5' }}
                      >
                        <Bot size={13} /> Ajana Ver
                      </button>
                    )}
                    {(r.fix_status === 'deployed' || r.fix_status === 'verified') && (
                      <button
                        disabled={busy === r.id}
                        onClick={() => askRevert(r)}
                        title="Bu düzeltmeyi geri al — ajan sıradaki koşuda git revert atar"
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border"
                        style={{ borderColor: '#EA580C55', background: '#EA580C12', color: '#C2410C' }}
                      >
                        Geri Al
                      </button>
                    )}
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
                    <button disabled={busy === r.id} onClick={() => setToDelete(r)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: '#EF444455', background: '#EF444412', color: '#DC2626' }}>Sil</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI düzeltme prompt'u — kopyala / yeniden üret */}
      {promptView?.ai_prompt && (
        <PromptModal
          prompt={promptView.ai_prompt}
          model={promptView.ai_model}
          subtitle={promptView.page_path}
          busy={aiBusy === promptView.id}
          onRegenerate={() => buildPrompt(promptView, true)}
          onClose={() => setPromptView(null)}
        />
      )}

      {/* Görüntü büyütme */}
      {zoom && (
        <div onClick={() => setZoom(null)} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={zoom} alt="Hata ekran görüntüsü (büyük)" className="max-w-full max-h-full rounded-lg shadow-2xl" />
          <button onClick={() => setZoom(null)} className="fixed top-4 right-4 w-10 h-10 rounded-lg bg-white/15 text-white text-2xl">✕</button>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Bu hata bildirimi silinsin mi?"
        description="Bildirim ve ekran görüntüsü bağlantısı kalıcı olarak silinir."
        busy={!!toDelete && busy === toDelete.id}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
