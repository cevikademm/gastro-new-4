// ─── Hata Bildir Widget ──────────────────────────────────────────────
// Ekranın sol-altında WhatsApp ikonu (FAB). YALNIZCA admin (role === 'admin')
// girişinde görünür. Tıklayınca:
//   1) Görünür sayfanın ekran görüntüsünü alır (html2canvas)
//   2) Açan modalda görüntüyü gösterir
//   3) Admin hatayı açıklar, önem derecesi seçer
//   4) Kayıt error_reports tablosuna yazılır (Supabase) + Storage'a görüntü
//   5) WhatsApp destek hattı önceden doldurulmuş metinle açılır
//
// SQL: supabase/migrations/018_error_reports.sql · Yardımcı: lib/errorReport.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import {
  captureScreenshot, uploadScreenshot, makeReportId, persistReport,
  buildWhatsAppText, openWhatsApp, downloadDataUrl, getAdminPhone,
  dataUrlToFile, shareScreenshotFile, copyImageToClipboard, sendReportWhatsApp,
  type ErrorReport, type ErrorSeverity,
} from '../lib/errorReport';
import { generateFixPrompt, copyText } from '../lib/fixPrompt';

const WA_GREEN = '#25D366';
const WA_GREEN_DARK = '#128C7E';

const SEVERITIES: Array<{ key: ErrorSeverity; labelKey: string; color: string }> = [
  { key: 'low', labelKey: 'admin.errorReport.sevLow', color: '#16A34A' },
  { key: 'normal', labelKey: 'admin.errorReport.sevNormal', color: '#F59E0B' },
  { key: 'high', labelKey: 'admin.errorReport.sevHigh', color: '#EF4444' },
];

function WhatsAppGlyph({ size = 28, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function collectMeta() {
  if (typeof window === 'undefined') return {};
  return {
    page_url: window.location?.href || '',
    page_path: (window.location?.pathname || '') + (window.location?.hash || ''),
    user_agent: navigator?.userAgent || '',
    screen_size: `${window.innerWidth}×${window.innerHeight}`,
    app_version: (import.meta.env?.VITE_APP_VERSION || '0.1.0'),
  };
}

type Meta = ReturnType<typeof collectMeta>;
type Toast = { type: 'ok' | 'warn'; text: string } | null;
/** Claude Haiku çıktısı: detaylandırılmış açıklama + geliştirici prompt'u. */
type AiResult = { prompt: string; detail: string; model: string };

export default function ErrorReportWidget() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ErrorSeverity>('normal');
  const [meta, setMeta] = useState<Meta>({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  // AI düzeltme prompt'u (Claude Haiku) — üretilirse kayıtla birlikte saklanır.
  const [aiPrompt, setAiPrompt] = useState('');
  // AI'ın detaylandırdığı açıklama — description_ai olarak kaydedilir.
  const [aiDetail, setAiDetail] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setScreenshot(null);
    setDescription('');
    setSeverity('normal');
    setSending(false);
    setAiPrompt('');
    setAiDetail('');
    setAiModel('');
    setAiBusy(false);
  }, []);

  const showToast = useCallback((type: 'ok' | 'warn', text: string, ms = 4200) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), ms);
  }, []);

  const closeModal = useCallback(() => { setOpen(false); reset(); }, [reset]);

  // ESC ile kapat
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, sending, closeModal]);

  // FAB → önce görüntü al, sonra modalı aç (modal görüntüde çıkmasın diye).
  const handleOpen = useCallback(async () => {
    if (open || capturing) return;
    setCapturing(true);
    setMeta(collectMeta());
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const shot = await captureScreenshot();
    setScreenshot(shot);
    setCapturing(false);
    setOpen(true);
    if (!shot) showToast('warn', t('admin.errorReport.autoShotFail'));
  }, [open, capturing, showToast, t]);

  const handleRecapture = useCallback(async () => {
    setOpen(false);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const shot = await captureScreenshot();
    setScreenshot(shot);
    setMeta(collectMeta());
    setOpen(true);
    if (!shot) showToast('warn', t('admin.errorReport.shotFail'));
  }, [showToast, t]);

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  /**
   * Kaydetme anında üretilen AI çıktısı. State'e yazmayı beklemek yerine
   * doğrudan buildRecord'a geçilir — setState asenkron olduğu için aynı tur
   * içinde okunamaz.
   */
  const buildRecord = useCallback(async (
    preset?: { id?: string; created_at?: string },
    ai?: AiResult | null,
  ): Promise<ErrorReport> => {
    const id = preset?.id || makeReportId();
    const created_at = preset?.created_at || new Date().toISOString();
    let screenshot_url: string | null = null;
    let screenshot_path: string | null = null;
    let screenshot_data: string | null = null;

    if (screenshot) {
      const up = await uploadScreenshot(screenshot, id);
      if (up) {
        screenshot_url = up.url;
        screenshot_path = up.path;
      } else {
        screenshot_data = screenshot; // base64 fallback — kayıp olmasın.
      }
    }

    return {
      id,
      reporter_name: user?.fullName || user?.email || 'Admin',
      reporter_email: user?.email || null,
      reporter_role: user?.role || 'admin',
      // Kullanıcının yazdığı ham metin — AI üretse bile ASLA ezilmez.
      description: description.trim(),
      // AI'ın detaylandırdığı hali ayrı sütunda (migration 034).
      description_ai: ai?.detail || aiDetail || null,
      page_url: meta.page_url || null,
      page_path: meta.page_path || null,
      user_agent: meta.user_agent || null,
      screen_size: meta.screen_size || null,
      app_version: meta.app_version || null,
      severity,
      status: 'new',
      screenshot_path,
      screenshot_url,
      screenshot_data,
      console_errors: null,
      created_at,
      resolved_at: null,
      ai_prompt: ai?.prompt || aiPrompt || null,
      ai_prompt_at: (ai?.prompt || aiPrompt) ? new Date().toISOString() : null,
      ai_model: (ai?.prompt || aiPrompt) ? (ai?.model || aiModel || null) : null,
    };
  }, [screenshot, user, description, meta, severity, aiPrompt, aiDetail, aiModel]);

  /**
   * Claude Haiku çağrısı — açıklamayı DETAYLANDIRIR + geliştirici prompt'u üretir.
   * State'e yazmaz, sonucu döndürür; hata durumunda null (bildirim kaydı asla
   * AI yüzünden bloklanmaz).
   */
  const runAi = useCallback(async (): Promise<AiResult | null> => {
    if (description.trim().length < 5) return null;
    try {
      const res = await generateFixPrompt({
        description,
        pagePath: meta.page_path,
        pageUrl: meta.page_url,
        severity,
        screenSize: meta.screen_size,
        userAgent: meta.user_agent,
        reporter: user?.fullName || user?.email || 'Admin',
      });
      return { prompt: res.prompt, detail: res.detailedDescription, model: res.model };
    } catch (e) {
      console.warn('[HataBildir] AI detaylandırma başarısız:', (e as Error)?.message || e);
      return null;
    }
  }, [description, meta, severity, user]);

  // "AI ile Üret" butonu — kaydetmeden önce çıktıyı görmek/düzenlemek isteyene.
  // Kaydetme zaten otomatik çalıştırıyor; bu yol yalnızca ön izleme.
  const handleGeneratePrompt = useCallback(async () => {
    if (aiBusy) return;
    if (description.trim().length < 5) {
      showToast('warn', 'Önce hatayı birkaç kelimeyle açıklayın.');
      return;
    }
    setAiBusy(true);
    const res = await runAi();
    if (res) {
      setAiPrompt(res.prompt);
      setAiDetail(res.detail);
      setAiModel(res.model);
      showToast('ok', 'Açıklama detaylandırıldı — kayıtla birlikte saklanacak.');
    } else {
      showToast('warn', 'Detaylandırma başarısız. Kaydederken tekrar denenecek.');
    }
    setAiBusy(false);
  }, [aiBusy, description, runAi, showToast]);

  // WhatsApp ile gönder
  const handleSend = useCallback(async () => {
    if (sending) return;
    if (!description.trim()) { showToast('warn', 'Lütfen hatayı kısaca açıklayın.'); return; }
    setSending(true);
    const shot = screenshot;
    const id = makeReportId();
    const created_at = new Date().toISOString();

    // AI detaylandırmayı HEMEN başlat ama BEKLEME. Aşağıdaki pano/paylaşım
    // çağrıları kullanıcı jestinin tazeliğine bağlı; araya await koyarsak
    // tarayıcı clipboard.write / share iznini reddeder. Sonucu kayıttan
    // hemen önce topluyoruz. Elle üretilmişse tekrar çağırma.
    const aiPending: Promise<AiResult | null> = aiPrompt
      ? Promise.resolve({ prompt: aiPrompt, detail: aiDetail, model: aiModel })
      : runAi();

    // Native dosya paylaşımı mümkün mü? (genelde mobil) — senkron kontrol.
    const file = shot ? dataUrlToFile(shot, `hata-${id}.jpg`) : null;
    const canShareFile = !!(
      shot && file && typeof navigator !== 'undefined' &&
      navigator.share && navigator.canShare && navigator.canShare({ files: [file] })
    );

    // Masaüstü (dosya paylaşımı yok): görüntüyü HEMEN panoya kopyala — kullanıcı
    // jesti hâlâ taze olmalı ki tarayıcı clipboard.write'a izin versin.
    let copied = false;
    if (shot && !canShareFile) {
      copied = await copyImageToClipboard(shot);
    }

    try {
      // 1) Mümkünse native paylaşım: ekran görüntüsünü DOSYA olarak mesaja iliştir.
      let shareOutcome: 'shared' | 'aborted' | false = false;
      if (canShareFile && file) {
        const baseRec = {
          id, created_at,
          reporter_name: user?.fullName || user?.email || 'Admin',
          reporter_role: user?.role || 'admin',
          description: description.trim(),
          page_url: meta.page_url || null,
          page_path: meta.page_path || null,
          screen_size: meta.screen_size || null,
          severity,
          screenshot_url: null,
        };
        shareOutcome = await shareScreenshotFile({
          file,
          text: buildWhatsAppText(baseRec, { attached: true }),
        });
      }

      // 2) Kalıcı kayıt: AI çıktısını topla, Storage'a yükle, DB'ye yaz.
      //    AI başarısızsa (null) kayıt yine de tam olarak yazılır.
      const ai = await aiPending;
      const rec = await buildRecord({ id, created_at }, ai);
      await persistReport(rec);

      // 3) Mesajı SUNUCUDAN otomatik gönder — kimsenin "gönder"e basması gerekmez.
      const wa = await sendReportWhatsApp(rec);

      // 4) Görüntü zaten native paylaşıldıysa ya da linki mesaja girdiyse iş bitti.
      //    Yalnızca görüntü hiçbir şekilde iletilemediyse wa.me'yi açıyoruz ki
      //    admin dosyayı elle iliştirebilsin (aksi halde çift mesaj giderdi).
      let needsManualImage = false;
      if (shot && shareOutcome !== 'shared' && !rec.screenshot_url) {
        needsManualImage = true;
        if (!copied) downloadDataUrl(shot, `hata-${rec.id}.jpg`);
        openWhatsApp(buildWhatsAppText(rec, { copied }));
      }

      const to = `+${getAdminPhone()}`;
      showToast(
        wa.ok ? 'ok' : 'warn',
        wa.ok
          ? needsManualImage
            ? `Kaydedildi ve ${to} numarasına iletildi. Görüntüyü açılan sohbete ${copied ? 'Ctrl+V ile yapıştırın' : 'ek olarak iliştirin'}.`
            : `Kaydedildi ve ${to} numarasına WhatsApp'tan iletildi.`
          : `Kaydedildi ancak WhatsApp'a iletilemedi (${wa.error || 'bilinmeyen hata'}).`,
        wa.ok ? 4200 : 6000,
      );
      setOpen(false);
      reset();
    } catch (e) {
      console.error('[HataBildir] gönderim hatası:', e);
      showToast('warn', 'Bir sorun oluştu, tekrar deneyin.');
      setSending(false);
    }
  }, [sending, description, screenshot, meta, severity, user, buildRecord, reset, showToast,
      aiPrompt, aiDetail, aiModel, runAi]);

  // Yalnızca kaydet (WhatsApp açmadan) — AI detaylandırma burada da otomatik.
  const handleSaveOnly = useCallback(async () => {
    if (sending) return;
    if (!description.trim()) { showToast('warn', 'Lütfen hatayı kısaca açıklayın.'); return; }
    setSending(true);
    try {
      const ai = aiPrompt
        ? { prompt: aiPrompt, detail: aiDetail, model: aiModel }
        : await runAi();
      const rec = await buildRecord(undefined, ai);
      const ok = await persistReport(rec);
      // Kaydedildiği anda otomatik WhatsApp — wa.me sekmesi açılmaz.
      const wa = await sendReportWhatsApp(rec);
      setOpen(false);
      reset();
      const to = `+${getAdminPhone()}`;
      showToast(
        ok && wa.ok ? 'ok' : 'warn',
        !ok
          ? 'Kaydedilemedi — DB erişilemedi.'
          : wa.ok
            ? `Kaydedildi ve ${to} numarasına WhatsApp'tan iletildi.`
            : `Kaydedildi ancak WhatsApp'a iletilemedi (${wa.error || 'bilinmeyen hata'}).`,
        ok && wa.ok ? 4200 : 6000,
      );
    } catch (e) {
      console.error('[HataBildir] kayıt hatası:', e);
      showToast('warn', 'Kaydedilemedi, tekrar deneyin.');
      setSending(false);
    }
  }, [sending, description, buildRecord, reset, showToast, aiPrompt, aiDetail, aiModel, runAi]);

  if (!isAdmin) return null;

  const phonePretty = `+${getAdminPhone()}`;

  return (
    <div data-hata-bildir-skip="1">
      {/* ─── FAB (sol-alt; LiveChat sağ-altta olduğu için çakışmaz) ─── */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={capturing}
          title="Hata Bildir (WhatsApp)"
          aria-label="Hata Bildir"
          className="fixed left-4 bottom-20 md:bottom-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_28px_rgba(18,140,126,0.45)] transition-transform hover:scale-105 disabled:cursor-wait"
          style={{ background: `linear-gradient(145deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}
        >
          {capturing
            ? <span className="w-5 h-5 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
            : <WhatsAppGlyph size={28} />}
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-extrabold flex items-center justify-center border-2 border-white">!</span>
        </button>
      )}

      {/* ─── Modal ─── */}
      {open && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => !sending && closeModal()} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Hata Bildir"
            className="relative w-full sm:max-w-[460px] max-h-[92vh] overflow-y-auto bg-surface-container-lowest text-on-surface rounded-t-3xl sm:rounded-3xl border border-outline-variant/20 shadow-2xl"
          >
            <div className="h-1 rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }} />
            <div className="p-5">
              {/* Başlık */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${WA_GREEN}1f`, border: `1px solid ${WA_GREEN}55` }}>
                  <WhatsAppGlyph size={22} color={WA_GREEN_DARK} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black leading-tight">Hata Bildir</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Destek hattına iletilir · {phonePretty}</p>
                </div>
                <button onClick={() => !sending && closeModal()} aria-label="Kapat" className="w-8 h-8 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low shrink-0">✕</button>
              </div>

              {/* Ekran görüntüsü eki */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">📸 Ekran Görüntüsü</span>
                  <div className="flex gap-2">
                    <button onClick={handleRecapture} className="px-2.5 py-1 rounded-lg border border-outline-variant/20 text-xs font-semibold hover:bg-surface-container-low">Yeniden Çek</button>
                    <button onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 rounded-lg border border-outline-variant/20 text-xs font-semibold hover:bg-surface-container-low">Dosya Ekle</button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
                {screenshot ? (
                  <div className="relative rounded-xl overflow-hidden border border-outline-variant/20 bg-slate-100">
                    <img src={screenshot} alt="Ekran görüntüsü" className="block w-full max-h-56 object-contain bg-slate-100" />
                    <button onClick={() => setScreenshot(null)} title="Kaldır" className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white text-base">✕</button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-outline-variant/40 px-4 py-5 text-center text-on-surface-variant text-sm">
                    Ekran görüntüsü yok. <b>Yeniden Çek</b> veya <b>Dosya Ekle</b> ile ekleyin.
                  </div>
                )}
              </div>

              {/* Açıklama */}
              <div className="mb-4">
                <label htmlFor="hb-desc" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  📝 Hata Açıklaması <span className="text-error">*</span>
                </label>
                <textarea
                  id="hb-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ne yapıyordunuz? Hata tam olarak nerede / ne zaman oluştu?"
                  rows={4}
                  autoFocus
                  className="w-full resize-y min-h-[90px] rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Önem derecesi */}
              <div className="mb-4">
                <span className="block text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">⚠️ Önem Derecesi</span>
                <div className="flex gap-2">
                  {SEVERITIES.map((s) => {
                    const active = severity === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setSeverity(s.key)}
                        className="flex-1 py-2 rounded-lg text-sm font-bold border transition-all"
                        style={{
                          borderColor: active ? s.color : 'var(--md-outline-variant, #cbd5e1)',
                          background: active ? `${s.color}1a` : 'transparent',
                          color: active ? s.color : undefined,
                        }}
                      >
                        {t(s.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI: detaylandırılmış açıklama + düzeltme prompt'u (Claude Haiku) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">🤖 AI Detaylandırma</span>
                  <div className="flex gap-2">
                    {aiPrompt && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyText(aiPrompt);
                          showToast(ok ? 'ok' : 'warn', ok ? 'Prompt panoya kopyalandı.' : 'Kopyalanamadı.');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-outline-variant/20 text-xs font-semibold hover:bg-surface-container-low"
                      >
                        Kopyala
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleGeneratePrompt}
                      disabled={aiBusy}
                      className="px-2.5 py-1 rounded-lg border border-outline-variant/20 text-xs font-semibold hover:bg-surface-container-low disabled:opacity-60 disabled:cursor-wait"
                    >
                      {aiBusy ? 'Üretiliyor…' : aiPrompt ? 'Yeniden Üret' : 'Şimdi Önizle'}
                    </button>
                  </div>
                </div>
                {aiPrompt ? (
                  <div className="space-y-2">
                    {aiDetail && (
                      <div className="rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2.5">
                        <div className="text-[10.5px] font-bold text-on-surface-variant uppercase tracking-wide mb-1">
                          Detaylandırılmış açıklama
                        </div>
                        <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{aiDetail}</p>
                        <p className="mt-2 pt-2 border-t border-outline-variant/20 text-[11px] text-on-surface-variant leading-snug">
                          Sizin yazdığınız metin de aynen kaydedilir — bu detay onun yerine geçmez.
                        </p>
                      </div>
                    )}
                    <details className="rounded-xl border border-outline-variant/20 bg-surface-container overflow-hidden">
                      <summary className="px-3 py-2 text-[11.5px] font-bold cursor-pointer select-none">
                        Geliştirici prompt'u
                      </summary>
                      <pre className="px-3 pb-2.5 text-[11.5px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                        {aiPrompt}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-outline-variant/40 px-3 py-2.5 text-[11.5px] text-on-surface-variant leading-snug">
                    <b>Kaydederken otomatik çalışır.</b> Yapay zekâ açıklamanızı detaylandırır
                    (ne yapılıyordu, ne bekleniyordu, ne oldu) ve geliştirici için sisteme uygun
                    bir düzeltme prompt'u yazar. Yazdığınız metin aynen korunur, detay ayrı alana
                    kaydedilir. Şimdi görmek isterseniz <b>Şimdi Önizle</b>'ye basın.
                  </p>
                )}
              </div>

              {/* Otomatik meta */}
              <div className="mb-4 rounded-lg bg-surface-container px-3 py-2.5 border border-outline-variant/20 text-[11.5px] text-on-surface-variant leading-relaxed">
                <div className="flex gap-1.5"><b className="min-w-[54px]">Sayfa</b><span className="break-all">{meta.page_path || '—'}</span></div>
                <div className="flex gap-1.5"><b className="min-w-[54px]">Ekran</b><span>{meta.screen_size || '—'}</span></div>
                <div className="flex gap-1.5"><b className="min-w-[54px]">Bildiren</b><span>{user?.fullName || user?.email || 'Admin'}</span></div>
              </div>

              {/* Aksiyonlar */}
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full py-3 rounded-xl text-white text-[15px] font-extrabold flex items-center justify-center gap-2.5 shadow-[0_8px_22px_rgba(18,140,126,0.4)] disabled:opacity-70"
                style={{ background: `linear-gradient(145deg, ${WA_GREEN}, ${WA_GREEN_DARK})` }}
              >
                {sending ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <WhatsAppGlyph size={20} />}
                {sending ? (aiPrompt ? 'Gönderiliyor…' : 'AI detaylandırıyor…') : 'WhatsApp ile Gönder'}
              </button>
              <button
                onClick={handleSaveOnly}
                disabled={sending}
                className="w-full mt-2.5 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface text-sm font-semibold hover:bg-surface-container-low disabled:opacity-70"
              >
                {sending ? (aiPrompt ? 'Kaydediliyor…' : 'AI detaylandırıyor…') : 'Sadece Kaydet'}
              </button>
              <p className="mt-2.5 text-[11px] text-on-surface-variant text-center leading-snug">
                Kaydedince bildirim <b>otomatik olarak {phonePretty}</b> numarasına WhatsApp'tan
                iletilir.<br />
                Mobilde görüntü <b>doğrudan mesaja eklenir</b>. Masaüstünde <b>panoya kopyalanır</b> —
                WhatsApp sohbetinde <b>Ctrl+V</b> ile yapıştırın.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div
          className="fixed left-1/2 bottom-24 -translate-x-1/2 z-[96] max-w-[calc(100vw-32px)] px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg flex items-center gap-2"
          style={{ background: toast.type === 'ok' ? WA_GREEN_DARK : '#B45309' }}
        >
          <span>{toast.type === 'ok' ? '✓' : '⚠'}</span>{toast.text}
        </div>
      )}
    </div>
  );
}
