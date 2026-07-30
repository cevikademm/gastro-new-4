// ─── Otomasyon (webhook) ─────────────────────────────────────────────
// Yeni hata düşünce Postgres trigger'ı → error-webhook edge function →
// Claude Haiku → düzeltme prompt'u kayda yazılır. Buradan açılıp kapatılır.
//
// Ayarlar public.app_settings'te tutulur (admin-only RLS):
//   error_webhook_enabled / error_webhook_url / error_webhook_secret
// Sır, edge function'ın ERROR_WEBHOOK_SECRET secret'ı ile AYNI olmalı.
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Wand2, Copy, Check, Zap, ShieldCheck, Eye, EyeOff, Activity, X } from 'lucide-react';
import {
  fetchWebhookSettings, saveWebhookSettings, suggestedWebhookUrl, generateSecret,
  runWebhookDiagnostics, checkWebhookTestResult,
  type WebhookSettings,
} from '../../../lib/appSettings';
import { copyText } from '../../../lib/fixPrompt';

const BRAND = '#931315';

export default function AutomationPanel() {
  const [s, setS] = useState<WebhookSettings>({ enabled: false, url: '', secret: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<Array<{ ok: boolean; text: string }> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchWebhookSettings();
    // URL boşsa bu projenin beklenen adresini öner.
    setS({ ...data, url: data.url || suggestedWebhookUrl() });
    setError(err);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    const err = await saveWebhookSettings(s);
    setSaving(false);
    if (err) { setError(err); return; }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }, [s]);

  /**
   * Zincirin her halkasını sırayla doğrular: pg_net → ayarlar → trigger'lar →
   * gerçek bir PING POST'u → edge function yanıtı. pg_net isteği COMMIT sonrası
   * gönderdiği için yanıt ayrı çağrılarla yoklanır.
   */
  const runTest = useCallback(async () => {
    setTesting(true);
    setTest(null);
    const out: Array<{ ok: boolean; text: string }> = [];
    try {
      const d = await runWebhookDiagnostics(true);
      out.push({ ok: d.pg_net_installed, text: d.pg_net_installed ? `pg_net kurulu (${d.pg_net_schema} şeması)` : 'pg_net kurulu değil — webhook çalışamaz' });
      out.push({ ok: d.triggers === 2, text: `Trigger: ${d.triggers}/2 kurulu` });
      out.push({ ok: d.enabled, text: d.enabled ? 'Otomatik triyaj açık' : 'Otomatik triyaj kapalı — kaydedip açın' });
      out.push({ ok: d.url_set, text: d.url_set ? 'Webhook URL tanımlı' : 'Webhook URL boş' });
      out.push({ ok: d.secret_len > 0, text: d.secret_len > 0 ? `Sır tanımlı (${d.secret_len} karakter)` : 'Sır boş' });

      if (d.send_error) {
        out.push({ ok: false, text: `İstek gönderilemedi: ${d.send_error}` });
      } else if (d.sent && d.request_id != null) {
        let res = await checkWebhookTestResult(d.request_id);
        for (let i = 0; i < 20 && res.pending; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          res = await checkWebhookTestResult(d.request_id);
        }
        if (res.pending) {
          out.push({ ok: false, text: 'Edge function yanıt vermedi (zaman aşımı)' });
        } else if (res.error) {
          out.push({ ok: false, text: `Ağ hatası: ${res.error}` });
        } else if (res.status === 200) {
          out.push({ ok: true, text: 'Edge function yanıt verdi (HTTP 200) — zincir çalışıyor ✓' });
        } else if (res.status === 401) {
          out.push({ ok: false, text: 'HTTP 401 — sır eşleşmiyor. supabase secrets set ERROR_WEBHOOK_SECRET=<üstteki sır>' });
        } else if (res.status === 503) {
          out.push({ ok: false, text: 'HTTP 503 — function\'da ERROR_WEBHOOK_SECRET tanımlı değil' });
        } else {
          out.push({ ok: false, text: `HTTP ${res.status} — ${res.body || 'yanıt gövdesi yok'}` });
        }
      } else {
        out.push({ ok: false, text: 'İstek gönderilmedi (URL boş ya da pg_net yok)' });
      }
    } catch (e) {
      out.push({ ok: false, text: (e as Error)?.message || 'Test başarısız' });
    }
    setTest(out);
    setTesting(false);
  }, []);

  const copy = useCallback(async (key: string, text: string) => {
    const ok = await copyText(text);
    if (ok) { setCopiedKey(key); window.setTimeout(() => setCopiedKey(''), 2000); }
  }, []);

  const deployCmd = 'supabase functions deploy error-webhook --no-verify-jwt';
  const secretCmd = s.secret
    ? `supabase secrets set ERROR_WEBHOOK_SECRET=${s.secret}`
    : 'supabase secrets set ERROR_WEBHOOK_SECRET=<önce sır üretin>';

  if (loading) {
    return (
      <div className="p-12 text-center text-on-surface-variant">
        <Loader2 className="animate-spin mx-auto mb-2" /> Yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* Akış özeti */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5">
        <h2 className="font-black text-lg flex items-center gap-2">
          <Zap size={18} style={{ color: BRAND }} /> Otomatik Hata Giderme Akışı
        </h2>
        <ol className="mt-3 space-y-1.5 text-sm text-on-surface-variant list-decimal list-inside leading-relaxed">
          <li>Uygulamada hata oluşur (ya da admin elle bildirir).</li>
          <li>Kayıt <b>error_logs</b> / <b>error_reports</b> tablosuna düşer.</li>
          <li>Postgres trigger'ı <b>error-webhook</b> edge function'ını çağırır.</li>
          <li>Claude Haiku hatayı yorumlar, düzeltme prompt'u üretir.</li>
          <li>Prompt kayda yazılır; panelde <b>"Prompt'u Gör"</b> ile kopyalanır ve Claude Code'a verilir.</li>
        </ol>
      </div>

      {/* Ayarlar */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => setS((p) => ({ ...p, enabled: e.target.checked }))}
            className="mt-1 w-4 h-4 accent-[#931315]"
          />
          <span>
            <span className="font-bold text-sm">Otomatik triyaj açık</span>
            <span className="block text-[12px] text-on-surface-variant mt-0.5">
              Kapalıyken kayıtlar yine tutulur, sadece AI otomatik çalışmaz —
              her kayıtta "AI Prompt" butonuyla elle üretebilirsiniz.
            </span>
          </span>
        </label>

        <div>
          <label htmlFor="wh-url" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
            Webhook URL
          </label>
          <div className="flex gap-2">
            <input
              id="wh-url"
              value={s.url}
              onChange={(e) => setS((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://<proje>.supabase.co/functions/v1/error-webhook"
              className="flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setS((p) => ({ ...p, url: suggestedWebhookUrl() }))}
              title="Bu projenin beklenen adresini doldur"
              className="px-3 rounded-xl border border-outline-variant/20 text-sm font-semibold hover:bg-surface-container-low"
            >
              Öner
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="wh-secret" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
            Paylaşılan Sır
          </label>
          <div className="flex gap-2">
            <input
              id="wh-secret"
              type={showSecret ? 'text' : 'password'}
              value={s.secret}
              onChange={(e) => setS((p) => ({ ...p, secret: e.target.value }))}
              placeholder="Üret'e basın"
              className="flex-1 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              title={showSecret ? 'Gizle' : 'Göster'}
              className="px-3 rounded-xl border border-outline-variant/20 hover:bg-surface-container-low"
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={() => { setS((p) => ({ ...p, secret: generateSecret() })); setShowSecret(true); }}
              className="px-3 rounded-xl border border-outline-variant/20 text-sm font-semibold hover:bg-surface-container-low inline-flex items-center gap-1.5"
            >
              <Wand2 size={15} /> Üret
            </button>
          </div>
          <p className="text-[11.5px] text-on-surface-variant mt-1.5 flex items-start gap-1.5">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" />
            Bu sır trigger ile edge function arasındaki tek yetki kontrolüdür.
            Aynı değeri aşağıdaki komutla function secret'ına da yazın.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center gap-2 disabled:opacity-70"
            style={{ background: BRAND }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            onClick={runTest}
            disabled={testing}
            className="px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-semibold hover:bg-surface-container-low disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2"
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />}
            {testing ? 'Test ediliyor…' : 'Bağlantıyı Test Et'}
          </button>
          {saved && <span className="text-sm font-bold text-green-700 inline-flex items-center gap-1"><Check size={15} /> Kaydedildi</span>}
        </div>

        {test && (
          <ul className="rounded-xl border border-outline-variant/20 bg-surface-container px-4 py-3 space-y-1.5">
            {test.map((row, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                {row.ok
                  ? <Check size={14} className="mt-0.5 shrink-0 text-green-600" />
                  : <X size={14} className="mt-0.5 shrink-0 text-error" />}
                <span className={row.ok ? 'text-on-surface' : 'text-error font-semibold'}>{row.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tek seferlik kurulum adımları */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 space-y-3">
        <h3 className="font-black">Tek Seferlik Kurulum</h3>
        <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
          Aşağıdakiler terminalden bir kez çalıştırılır. <code>ANTHROPIC_API_KEY</code> zaten
          tanımlıysa 2. adımı atlayın.
        </p>
        {[
          { label: '1 · Migration', cmd: 'supabase db push --linked' },
          { label: '2 · Claude anahtarı', cmd: 'supabase secrets set ANTHROPIC_API_KEY=sk-ant-...' },
          { label: '3 · Webhook sırrı', cmd: secretCmd },
          { label: '4 · Function dağıtımı', cmd: deployCmd },
        ].map((step) => (
          <div key={step.label}>
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wide mb-1">{step.label}</div>
            <div className="flex gap-2">
              <code className="flex-1 rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2 text-[11.5px] font-mono break-all">
                {step.cmd}
              </code>
              <button
                onClick={() => copy(step.label, step.cmd)}
                title="Kopyala"
                className="px-2.5 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low shrink-0"
              >
                {copiedKey === step.label ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        ))}
        <p className="text-[11.5px] text-on-surface-variant leading-relaxed pt-1">
          <b>Not:</b> <code>--no-verify-jwt</code> zorunlu — trigger JWT göndermez,
          yetki paylaşılan sır ile sağlanır.
        </p>
      </div>
    </div>
  );
}
