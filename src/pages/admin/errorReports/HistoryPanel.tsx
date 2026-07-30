// ─── İşlem Geçmişi (error_fixes) ─────────────────────────────────────
// Her hata kaydına ne olduğunun zaman çizelgesi: webhook tetiklendi mi,
// AI analizi üretildi mi, durumu kim değiştirdi.
// SQL: migrations/031_error_logs_and_webhook.sql (trigger'lar + edge function yazar)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Webhook, Sparkles, ArrowRightLeft, StickyNote } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import PromptModal from './PromptModal';

type FixKind = 'webhook' | 'ai_prompt' | 'status_change' | 'note';
type FixStatus = 'queued' | 'ok' | 'failed' | 'skipped';

interface ErrorFix {
  id: string;
  report_id: string | null;
  log_id: string | null;
  kind: FixKind;
  status: FixStatus;
  title: string | null;
  detail: string | null;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  payload: Record<string, unknown> | null;
  actor: string;
  created_at: string;
}

const KIND_META: Record<FixKind, { label: string; icon: typeof Webhook; color: string }> = {
  webhook: { label: 'Webhook', icon: Webhook, color: '#3B82F6' },
  ai_prompt: { label: 'AI analizi', icon: Sparkles, color: '#931315' },
  status_change: { label: 'Durum', icon: ArrowRightLeft, color: '#F59E0B' },
  note: { label: 'Not', icon: StickyNote, color: '#94A3B8' },
};
const STATUS_META: Record<FixStatus, { label: string; color: string }> = {
  queued: { label: 'Kuyrukta', color: '#F59E0B' },
  ok: { label: 'Tamam', color: '#16A34A' },
  failed: { label: 'Başarısız', color: '#EF4444' },
  skipped: { label: 'Atlandı', color: '#94A3B8' },
};
const FILTERS: Array<{ key: FixKind | 'all'; label: string }> = [
  { key: 'all', label: 'Tümü' },
  { key: 'ai_prompt', label: 'AI analizi' },
  { key: 'webhook', label: 'Webhook' },
  { key: 'status_change', label: 'Durum değişimi' },
];

const fmtDate = (s: string) => { try { return new Date(s).toLocaleString('tr-TR'); } catch { return s; } };

export default function HistoryPanel() {
  const [rows, setRows] = useState<ErrorFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FixKind | 'all'>('all');
  const [detail, setDetail] = useState<ErrorFix | null>(null);

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase yapılandırılmamış.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('error_fixes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (err) {
      setError(/does not exist|schema cache/i.test(err.message)
        ? 'error_fixes tablosu bulunamadı — migration 031 SQL\'ini çalıştırın.'
        : err.message);
      setRows([]);
    } else {
      setRows((data as ErrorFix[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.kind === filter)),
    [rows, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = f.key === 'all' ? rows.length : rows.filter((r) => r.kind === f.key).length;
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
              {f.label} · {n}
            </button>
          );
        })}
        <button
          onClick={load}
          className="ml-auto px-3 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low inline-flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Yenile
        </button>
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
          <div className="text-4xl mb-2">🗒️</div>
          <p className="font-semibold">Henüz işlem kaydı yok.</p>
          <p className="text-sm mt-1">Webhook açıldıktan sonra her yeni hata burada iz bırakır.</p>
        </div>
      ) : (
        <ol className="relative border-l border-outline-variant/25 ml-3 space-y-3">
          {filtered.map((r) => {
            const km = KIND_META[r.kind] || KIND_META.note;
            const sm = STATUS_META[r.status] || STATUS_META.ok;
            const Icon = km.icon;
            return (
              <li key={r.id} className="ml-5">
                <span
                  className="absolute -left-[13px] w-6 h-6 rounded-full flex items-center justify-center border"
                  style={{ background: `${km.color}1a`, borderColor: `${km.color}55`, color: km.color }}
                >
                  <Icon size={13} />
                </span>
                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold" style={{ color: km.color }}>{km.label}</span>
                    <span
                      className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border"
                      style={{ background: `${sm.color}1a`, color: sm.color, borderColor: `${sm.color}44` }}
                    >
                      {sm.label}
                    </span>
                    <span className="ml-auto text-[11.5px] text-on-surface-variant">{fmtDate(r.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface mt-1 break-words">{r.title || '—'}</p>
                  <p className="text-[11.5px] text-on-surface-variant mt-0.5 break-all">
                    {r.log_id ? `log · ${r.log_id.slice(0, 8)}…` : `bildirim · ${r.report_id}`}
                    {' · '}{r.actor}
                    {r.model ? ` · ${r.model}` : ''}
                    {r.tokens_in != null ? ` · ${r.tokens_in}→${r.tokens_out} token` : ''}
                  </p>
                  {r.detail && (
                    <button
                      onClick={() => setDetail(r)}
                      className="mt-2 px-2.5 py-1 rounded-lg text-xs font-bold border border-outline-variant/20 hover:bg-surface-container-low"
                    >
                      {r.kind === 'ai_prompt' && r.status === 'ok' ? 'Prompt\'u Gör' : 'Ayrıntı'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {detail?.detail && (
        <PromptModal
          prompt={detail.detail}
          model={detail.model || KIND_META[detail.kind]?.label}
          subtitle={fmtDate(detail.created_at)}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
