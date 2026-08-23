// ─── Sistem Logları (error_logs) ─────────────────────────────────────
// Uygulamanın KENDİ yakaladığı hatalar. Elle bildirimlerden ayrı tablo,
// ayrı sekme. Aynı hata tekrarlarsa yeni satır açılmaz — "×N" olarak sayılır.
//
// Kaynak: src/lib/errorLog.ts · SQL: migrations/031_error_logs_and_webhook.sql
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, RefreshCw, Sparkles, ChevronDown, ChevronRight, Trash2, Bot, AlertCircle,
} from 'lucide-react';
import {
  fetchErrorLogs, setErrorLogStatus, deleteErrorLog, purgeClosedLogs,
  type ErrorLog, type LogStatus,
} from '../../../lib/errorLog';
import { generateFixPrompt, saveFixPrompt, markFixPromptFailed } from '../../../lib/fixPrompt';
import { publishManualResolution, unpublishResolution } from '../../../lib/changelog';
import FixStatusBadge from './FixStatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PromptModal from './PromptModal';
import ResolveDialog, { type ResolveResult } from './ResolveDialog';

const LEVEL: Record<string, { label: string; color: string }> = {
  error: { label: 'Hata', color: '#EF4444' },
  warning: { label: 'Uyarı', color: '#F59E0B' },
  info: { label: 'Bilgi', color: '#3B82F6' },
};
const STATUS: Record<LogStatus, { label: string; color: string }> = {
  new: { label: 'Yeni', color: '#EF4444' },
  in_progress: { label: 'İnceleniyor', color: '#F59E0B' },
  resolved: { label: 'Çözüldü', color: '#16A34A' },
  ignored: { label: 'Yoksayıldı', color: '#94A3B8' },
};
const SOURCE_LABEL: Record<string, string> = {
  window: 'JS hatası',
  promise: 'Promise',
  console: 'Konsol',
  react: 'React render',
  network: 'Ağ',
  supabase: 'Supabase',
  manual: 'Elle',
};
const FILTERS: Array<{ key: LogStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'new', label: 'Yeni' },
  { key: 'in_progress', label: 'İnceleniyor' },
  { key: 'resolved', label: 'Çözüldü' },
  { key: 'ignored', label: 'Yoksayıldı' },
];

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('tr-TR'); } catch { return s; }
};

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span
    className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap"
    style={{ background: `${color}1a`, color, borderColor: `${color}44` }}
  >
    {label}
  </span>
);

export default function LogsPanel() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<LogStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [promptView, setPromptView] = useState<ErrorLog | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'one'; log: ErrorLog } | { kind: 'purge' } | null>(null);
  // "Çözüldü" penceresi — sistem loglarında portal yayını varsayılan KAPALI.
  const [toResolve, setToResolve] = useState<ErrorLog | null>(null);
  const [resolveError, setResolveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchErrorLogs();
    setLogs(data);
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? logs : logs.filter((l) => l.status === filter)),
    [logs, filter],
  );

  const counts = useMemo(() => ({
    all: logs.length,
    new: logs.filter((l) => l.status === 'new').length,
    in_progress: logs.filter((l) => l.status === 'in_progress').length,
    resolved: logs.filter((l) => l.status === 'resolved').length,
    ignored: logs.filter((l) => l.status === 'ignored').length,
  }), [logs]);

  const changeStatus = useCallback(async (log: ErrorLog, status: LogStatus) => {
    setBusy(log.id);
    const ok = await setErrorLogStatus(log.id, status);
    if (ok) {
      const resolved_at = status === 'resolved' ? new Date().toISOString() : null;
      setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, status, resolved_at } : l)));
    }
    setBusy(null);
  }, []);

  /**
   * "Çözüldü": kaydı kapatır; istenirse /degisiklikler sayfasında yayınlar
   * (migration 043). Sistem logları teknik olduğu için yayın varsayılan kapalı.
   */
  const doResolve = useCallback(async (v: ResolveResult) => {
    const log = toResolve;
    if (!log) return;
    setBusy(log.id);
    setResolveError('');
    const res = await publishManualResolution({
      kind: 'log',
      id: log.id,
      summary: v.summary,
      detail: v.detail,
      category: v.category,
      publish: v.publish,
    });
    if (!res.ok) {
      setResolveError(res.error || 'İşlem tamamlanamadı.');
      setBusy(null);
      return;
    }
    const now = new Date().toISOString();
    setLogs((prev) => prev.map((l) => (l.id === log.id
      ? {
          ...l,
          status: 'resolved' as LogStatus,
          resolved_at: l.resolved_at || now,
          fix_summary: v.summary || l.fix_summary,
          fix_technical: v.detail || l.fix_technical,
        }
      : l)));
    setBusy(null);
    setToResolve(null);
  }, [toResolve]);

  /** Çözülmüş kaydı yeniden açar; portalda yayınlandıysa girdiyi gizler. */
  const reopen = useCallback(async (log: ErrorLog) => {
    setBusy(log.id);
    const res = await unpublishResolution('log', log.id);
    if (!res.ok) setError(res.error || 'İşlem tamamlanamadı.');
    else {
      setLogs((prev) => prev.map((l) => (l.id === log.id
        ? { ...l, status: 'new' as LogStatus, resolved_at: null }
        : l)));
    }
    setBusy(null);
  }, []);

  const doDelete = useCallback(async () => {
    if (!confirm) return;
    if (confirm.kind === 'one') {
      setBusy(confirm.log.id);
      const ok = await deleteErrorLog(confirm.log.id);
      if (ok) setLogs((prev) => prev.filter((l) => l.id !== confirm.log.id));
      setBusy(null);
    } else {
      setBusy('purge');
      const n = await purgeClosedLogs();
      if (n > 0) setLogs((prev) => prev.filter((l) => l.status !== 'resolved' && l.status !== 'ignored'));
      setBusy(null);
    }
    setConfirm(null);
  }, [confirm]);

  /** Claude Haiku ile düzeltme prompt'u üretir (webhook zaten üretmişse gösterir). */
  const buildPrompt = useCallback(async (log: ErrorLog, force = false) => {
    if (aiBusy) return;
    if (log.ai_prompt && !force) { setPromptView(log); return; }
    setAiBusy(log.id);
    setError('');
    try {
      const res = await generateFixPrompt({
        kind: 'log',
        description: `[${log.level} · ${log.source}] ${log.message}`,
        stack: log.stack,
        occurrences: log.occurrences,
        pagePath: log.page_path,
        pageUrl: log.page_url,
        severity: log.severity,
        screenSize: log.screen_size,
        userAgent: log.user_agent,
        reporter: log.user_email || 'otomatik yakalama',
      });
      const next: ErrorLog = {
        ...log,
        ai_prompt: res.prompt,
        ai_prompt_at: new Date().toISOString(),
        ai_model: res.model,
        ai_status: 'ok',
        // Ham `message` ezilmez — AI'ın detaylandırdığı hali ayrı sütunda.
        description_ai: res.detailedDescription || log.description_ai || null,
      };
      await saveFixPrompt(log.id, res, 'error_logs');
      setLogs((prev) => prev.map((l) => (l.id === log.id ? next : l)));
      setPromptView(next);
    } catch (e) {
      const msg = (e as Error)?.message || 'Prompt üretilemedi.';
      setError(msg);
      // Kayıt "AI hatası" olarak işaretlensin — yoksa panelde eski durum kalıyor.
      await markFixPromptFailed(log.id, msg, 'error_logs');
      setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, ai_status: 'failed', ai_error: msg } : l)));
    } finally {
      setAiBusy(null);
    }
  }, [aiBusy]);

  const closedCount = counts.resolved + counts.ignored;

  return (
    <div className="space-y-4">
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
        <div className="ml-auto flex gap-2">
          {closedCount > 0 && (
            <button
              onClick={() => setConfirm({ kind: 'purge' })}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Kapananları Temizle ({closedCount})
            </button>
          )}
          <button
            onClick={load}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant">
          <Loader2 className="animate-spin mx-auto mb-2" /> Yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-2xl">
          <div className="text-4xl mb-2">✅</div>
          <p className="font-semibold">Bu filtrede sistem hatası yok.</p>
          <p className="text-sm mt-1">
            Uygulamada bir JS hatası oluştuğunda otomatik olarak buraya düşer.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden divide-y divide-outline-variant/15">
          {filtered.map((log) => {
            const lv = LEVEL[log.level] || LEVEL.error;
            const st = STATUS[log.status] || STATUS.new;
            const open = expanded === log.id;
            return (
              <div key={log.id}>
                <button
                  onClick={() => setExpanded(open ? null : log.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-container-low transition-colors"
                >
                  <span className="mt-0.5 text-on-surface-variant shrink-0">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge label={lv.label} color={lv.color} />
                      <Badge label={st.label} color={st.color} />
                      <span className="text-[11px] font-bold text-on-surface-variant">
                        {SOURCE_LABEL[log.source] || log.source}
                      </span>
                      {log.occurrences > 1 && (
                        <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                          ×{log.occurrences}
                        </span>
                      )}
                      {log.ai_prompt && (
                        <span title="AI analizi hazır" className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: '#931315' }}>
                          <Bot size={12} /> AI
                        </span>
                      )}
                      {log.ai_status === 'failed' && (
                        <span title={log.ai_error || 'AI analizi başarısız'} className="inline-flex items-center gap-1 text-[11px] font-bold text-error">
                          <AlertCircle size={12} /> AI hatası
                        </span>
                      )}
                      <FixStatusBadge status={log.fix_status} commitSha={log.fix_commit_sha} commitUrl={log.fix_commit_url} />
                    </div>
                    <p className="text-sm font-semibold text-on-surface break-words line-clamp-2">{log.message}</p>
                    <p className="text-[11.5px] text-on-surface-variant mt-0.5 truncate">
                      {log.page_path || '—'} · son: {fmtDate(log.last_seen_at)}
                    </p>
                  </div>
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 pl-11 space-y-3 bg-surface-container-lowest">
                    <div className="grid gap-x-6 gap-y-1 text-[11.5px] text-on-surface-variant sm:grid-cols-2">
                      <div><b>İlk görülme:</b> {fmtDate(log.first_seen_at)}</div>
                      <div><b>Son görülme:</b> {fmtDate(log.last_seen_at)}</div>
                      <div className="break-all"><b>URL:</b> {log.page_url || '—'}</div>
                      <div><b>Ekran:</b> {log.screen_size || '—'}</div>
                      <div className="break-all"><b>Dosya:</b> {log.file_name || '—'}{log.line_no ? `:${log.line_no}` : ''}</div>
                      <div><b>Kullanıcı:</b> {log.user_email || 'anonim'}{log.user_role ? ` (${log.user_role})` : ''}</div>
                      <div className="break-all sm:col-span-2"><b>Tarayıcı:</b> {log.user_agent || '—'}</div>
                    </div>

                    {/* Ajan düzeltmeyi yaptıysa ne yaptığını burada anlat. */}
                    {log.fix_summary && (
                      <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#16A34A44', background: '#16A34A0f' }}>
                        <div className="text-[10.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#15803D' }}>
                          Yapılan düzeltme
                        </div>
                        <p className="text-[12.5px] leading-relaxed">{log.fix_summary}</p>
                        {log.fix_technical && (
                          <p className="mt-1 text-[11.5px] text-on-surface-variant leading-relaxed">{log.fix_technical}</p>
                        )}
                      </div>
                    )}
                    {log.fix_skip_reason && (
                      <div className="rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed" style={{ borderColor: '#B4530944', background: '#B453090f', color: '#92400E' }}>
                        <b>Ajan vazgeçti:</b> {log.fix_skip_reason}
                      </div>
                    )}

                    {/* AI'ın detaylandırdığı açıklama. Ham hata mesajı yukarıdaki
                        başlıkta aynen duruyor — burası onun yerine geçmez. */}
                    {log.description_ai && (
                      <div className="rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2.5">
                        <div className="text-[10.5px] font-bold text-on-surface-variant uppercase tracking-wide mb-1">
                          Detaylandırılmış açıklama
                        </div>
                        <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{log.description_ai}</p>
                      </div>
                    )}

                    {log.stack && (
                      <pre className="rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-[11px] leading-relaxed whitespace-pre-wrap font-mono max-h-56 overflow-y-auto">
                        {log.stack}
                      </pre>
                    )}

                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <pre className="rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-[11px] leading-relaxed whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    )}

                    {log.ai_status === 'failed' && log.ai_error && (
                      <p className="text-[11.5px] text-error">Otomatik triyaj başarısız: {log.ai_error}</p>
                    )}

                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        disabled={aiBusy === log.id}
                        onClick={() => buildPrompt(log)}
                        title={log.ai_prompt ? 'Üretilen düzeltme prompt\'unu göster' : 'Claude Haiku ile düzeltme prompt\'u üret'}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1 disabled:opacity-60 disabled:cursor-wait"
                        style={{ borderColor: '#93131555', background: '#93131512', color: '#931315' }}
                      >
                        {aiBusy === log.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        {aiBusy === log.id ? 'Üretiliyor…' : log.ai_prompt ? 'Prompt\'u Gör' : 'AI Prompt'}
                      </button>
                      {log.status !== 'in_progress' && log.status !== 'resolved' && (
                        <button disabled={busy === log.id} onClick={() => changeStatus(log, 'in_progress')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: '#F59E0B55', background: '#F59E0B12', color: '#B45309' }}>İncele</button>
                      )}
                      {log.status !== 'resolved' && (
                        <button disabled={busy === log.id} onClick={() => { setResolveError(''); setToResolve(log); }} title="Kaydı kapat — istersen /degisiklikler sayfasında yayınla" className="px-2.5 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: '#16A34A55', background: '#16A34A12', color: '#15803D' }}>Çözüldü</button>
                      )}
                      {log.status !== 'ignored' && (
                        <button disabled={busy === log.id} onClick={() => changeStatus(log, 'ignored')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low">Yoksay</button>
                      )}
                      {log.status === 'resolved' && (
                        <button disabled={busy === log.id} onClick={() => reopen(log)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low">Yeniden Aç</button>
                      )}
                      {log.status === 'ignored' && (
                        <button disabled={busy === log.id} onClick={() => changeStatus(log, 'new')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low">Yeniden Aç</button>
                      )}
                      {log.page_url && (
                        <button onClick={() => window.open(log.page_url as string, '_blank', 'noopener')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low">Sayfaya Git</button>
                      )}
                      <button
                        disabled={busy === log.id}
                        onClick={() => setConfirm({ kind: 'one', log })}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border"
                        style={{ borderColor: '#EF444455', background: '#EF444412', color: '#DC2626' }}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      {/* Çözüldü → (isteğe bağlı) portal yayını */}
      <ResolveDialog
        open={!!toResolve}
        reference={toResolve?.description_ai || toResolve?.message || null}
        defaultSummary={toResolve?.fix_summary || null}
        defaultDetail={toResolve?.fix_technical || null}
        defaultPublish={false}
        busy={!!toResolve && busy === toResolve.id}
        error={resolveError}
        onConfirm={doResolve}
        onCancel={() => { setToResolve(null); setResolveError(''); }}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'purge' ? 'Kapanan kayıtlar silinsin mi?' : 'Bu hata kaydı silinsin mi?'}
        description={
          confirm?.kind === 'purge'
            ? `Çözüldü ve yoksayıldı durumundaki ${closedCount} kayıt kalıcı olarak silinecek.`
            : 'Kayıt kalıcı olarak silinir. Hata tekrar oluşursa yeniden yakalanır.'
        }
        busy={busy === 'purge' || (confirm?.kind === 'one' && busy === confirm.log.id)}
        onConfirm={doDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
