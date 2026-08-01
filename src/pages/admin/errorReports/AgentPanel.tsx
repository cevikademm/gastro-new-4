// ─── Otomatik Düzeltme Ajanı (Admin) ─────────────────────────────────
// Saatte bir çalışan bulut ajanının kontrol paneli: aç/kapa, mod, sınırlar,
// paylaşılan sır ve son koşular.
//
// Ajan: supabase/functions/fix-agent (bulut rutini çağırır)
// Ayarlar: app_settings (migration 041) · Yardımcı: src/lib/fixAgent.ts
import { useCallback, useEffect, useState } from 'react';
import { Bot, Loader2, Save, RefreshCw, Copy, Check, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import {
  fetchAgentSettings, saveAgentSettings, fetchQueueCount, fetchAgentRuns,
  agentFunctionUrl, generateSecret,
  type AgentSettings, type AgentRun,
} from '../../../lib/fixAgent';
import { copyText } from '../../../lib/fixPrompt';

const BRAND = '#931315';

const RUN_META: Record<string, { label: string; color: string }> = {
  agent_claim:  { label: 'İş alındı',    color: '#6366F1' },
  agent_fix:    { label: 'Düzeltme',     color: '#16A34A' },
  agent_skip:   { label: 'Vazgeçildi',   color: '#B45309' },
  agent_revert: { label: 'Geri alma',    color: '#DC2626' },
  deploy:       { label: 'Dağıtım',      color: '#0EA5E9' },
};

const fmt = (s: string) => { try { return new Date(s).toLocaleString('tr-TR'); } catch { return s; } };

export default function AgentPanel() {
  const [s, setS] = useState<AgentSettings | null>(null);
  const [queue, setQueue] = useState(0);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchAgentSettings();
    setS(data);
    setError(err);
    setQueue(await fetchQueueCount());
    setRuns(await fetchAgentRuns(20));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async () => {
    if (!s) return;
    setSaving(true);
    setOkMsg('');
    const err = await saveAgentSettings(s);
    setError(err);
    if (!err) { setOkMsg('Kaydedildi.'); window.setTimeout(() => setOkMsg(''), 2500); }
    setSaving(false);
  }, [s]);

  const copy = useCallback(async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 2000);
    }
  }, []);

  if (loading || !s) {
    return (
      <div className="p-12 text-center text-on-surface-variant">
        <Loader2 className="animate-spin mx-auto mb-2" /> Yükleniyor…
      </div>
    );
  }

  const url = agentFunctionUrl();
  const secretCmd = s.secret
    ? `supabase secrets set FIX_AGENT_SECRET=${s.secret}`
    : 'supabase secrets set FIX_AGENT_SECRET=<önce sır üretin>';

  return (
    <div className="space-y-5 max-w-3xl">
      {error && <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">{error}</div>}
      {okMsg && <div className="rounded-xl p-3 text-sm font-semibold" style={{ background: '#16A34A15', color: '#15803D' }}>{okMsg}</div>}

      {/* Akış özeti */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5">
        <h2 className="font-black text-lg flex items-center gap-2">
          <Bot size={18} style={{ color: BRAND }} /> Otomatik Düzeltme Ajanı
        </h2>
        <ol className="mt-3 space-y-1.5 text-sm text-on-surface-variant list-decimal list-inside leading-relaxed">
          <li>Saatte bir bulut ajanı kuyruğu sorar (<b>{queue}</b> kayıt bekliyor).</li>
          <li>Hazır AI prompt'unu alır, <b>yalnızca src/ altında</b> düzeltmeyi yapar.</li>
          <li>tsc ve build geçmeden commit etmez; geçerse doğrudan <b>main</b>'e push eder.</li>
          <li>Canlıya çıkınca sonuç <b>Neler Düzeldi</b> sayfasında yayınlanır ve bildirene e-posta gider.</li>
          <li>Hata dağıtımdan sonra tekrar ederse ajan bir sonraki koşuda <b>geri alır</b>.</li>
        </ol>
      </div>

      {/* Ayarlar */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => setS({ ...s, enabled: e.target.checked })}
            className="mt-1 w-4 h-4 accent-[#931315]"
          />
          <span>
            <span className="font-bold text-sm">Ajan açık</span>
            <span className="block text-[12px] text-on-surface-variant mt-0.5">
              Kapalıyken ajan hiçbir iş almaz (kuyruk birikmeye devam eder).
              Acil durumda buradan kapatmak, rutini silmekten hızlıdır.
            </span>
          </span>
        </label>

        <div>
          <span className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">Çalışma modu</span>
          <div className="flex gap-2">
            {([
              { k: 'auto', label: 'Otomatik', hint: 'Kuyruğa düşen her kaydı kendi alır' },
              { k: 'approved_only', label: 'Onaylı', hint: 'Yalnızca "Ajana Ver" dediğiniz kayıtlar' },
            ] as const).map((m) => {
              const on = s.mode === m.k;
              return (
                <button
                  key={m.k}
                  onClick={() => setS({ ...s, mode: m.k })}
                  title={m.hint}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-all text-left"
                  style={{
                    borderColor: on ? BRAND : 'var(--md-outline-variant, #cbd5e1)',
                    background: on ? `${BRAND}12` : 'transparent',
                    color: on ? BRAND : undefined,
                  }}
                >
                  {m.label}
                  <span className="block text-[11px] font-normal text-on-surface-variant mt-0.5">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { k: 'maxPerRun', label: 'Koşu başına' },
            { k: 'maxPerDay', label: 'Gün başına' },
            { k: 'maxFiles', label: 'Maks. dosya' },
            { k: 'maxLines', label: 'Maks. satır' },
          ] as const).map((f) => (
            <div key={f.k}>
              <label htmlFor={`ag-${f.k}`} className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wide mb-1">
                {f.label}
              </label>
              <input
                id={`ag-${f.k}`}
                type="number"
                min={1}
                value={s[f.k]}
                onChange={(e) => setS({ ...s, [f.k]: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.notifyReporter}
            onChange={(e) => setS({ ...s, notifyReporter: e.target.checked })}
            className="mt-1 w-4 h-4 accent-[#931315]"
          />
          <span>
            <span className="font-bold text-sm">Bildirene e-posta gönder</span>
            <span className="block text-[12px] text-on-surface-variant mt-0.5">
              Düzeltme canlıya çıkınca hatayı bildiren kişiye "sorununuz düzeltildi" maili gider.
            </span>
          </span>
        </label>

        {/* Sır */}
        <div>
          <label htmlFor="ag-secret" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
            Paylaşılan sır
          </label>
          <div className="flex gap-2">
            <input
              id="ag-secret"
              type={showSecret ? 'text' : 'password'}
              value={s.secret}
              onChange={(e) => setS({ ...s, secret: e.target.value })}
              placeholder="Üret'e basın"
              className="flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              aria-label={showSecret ? 'Gizle' : 'Göster'}
              className="px-3 rounded-xl border border-outline-variant/20 hover:bg-surface-container-low"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setS({ ...s, secret: generateSecret() })}
              className="px-3 py-2 rounded-xl border border-outline-variant/20 text-sm font-semibold hover:bg-surface-container-low"
            >
              Üret
            </button>
          </div>
          <p className="mt-1.5 text-[11.5px] text-on-surface-variant leading-snug">
            Bu sır üç yerde <b>aynı</b> olmalı: burada, edge function secret'ında ve bulut rutini ortamında.
            Ajanın Supabase'e başka hiçbir erişimi yok — servis anahtarı ona verilmez.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-70"
          style={{ background: BRAND }}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Kaydet
        </button>
      </div>

      {/* Kurulum komutları */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 space-y-3">
        <h3 className="font-black text-sm flex items-center gap-2">
          <ShieldAlert size={16} style={{ color: BRAND }} /> Tek seferlik kurulum
        </h3>
        {[
          { key: 'url', label: 'Rutine yapıştırılacak URL', text: url },
          { key: 'secret', label: 'Edge function secret', text: secretCmd },
          { key: 'deploy', label: 'Deploy komutu', text: 'supabase functions deploy fix-agent --no-verify-jwt' },
        ].map((c) => (
          <div key={c.key}>
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide mb-1">{c.label}</div>
            <div className="flex gap-2">
              <code className="flex-1 rounded-lg bg-surface-container px-3 py-2 text-[11.5px] font-mono break-all">{c.text}</code>
              <button
                onClick={() => copy(c.key, c.text)}
                className="px-2.5 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low shrink-0"
                aria-label="Kopyala"
              >
                {copiedKey === c.key ? <Check size={14} style={{ color: '#16A34A' }} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Son koşular */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-sm">Son koşular</h3>
          <button onClick={load} className="px-2.5 py-1 rounded-lg border border-outline-variant/20 text-xs font-semibold hover:bg-surface-container-low inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Yenile
          </button>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-6 text-center">Ajan henüz çalışmadı.</p>
        ) : (
          <ul className="space-y-2">
            {runs.map((r) => {
              const m = RUN_META[r.kind] || { label: r.kind, color: '#64748B' };
              return (
                <li key={r.id} className="flex items-start gap-2.5 text-[12.5px] border-b border-outline-variant/10 pb-2 last:border-0">
                  <span
                    className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 mt-0.5"
                    style={{ background: `${m.color}1a`, color: m.color, borderColor: `${m.color}44` }}
                  >
                    {m.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold break-words">{r.title || '—'}</div>
                    {r.detail && <div className="text-on-surface-variant text-[11.5px] line-clamp-2 break-words">{r.detail}</div>}
                  </div>
                  <span className="text-[11px] text-on-surface-variant shrink-0">{fmt(r.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
