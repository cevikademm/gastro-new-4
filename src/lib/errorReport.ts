// Hata Bildirimi modülü — yardımcı istemci (screenshot + storage + WhatsApp).
// UI: src/components/ErrorReportWidget.tsx · Tablo: error_reports (migration 018)
// Ekran görüntüsü yakalama, Storage'a yükleme ve WhatsApp metni kurma burada.
// html2canvas-pro: Tailwind v4'ün ürettiği oklch()/color-mix() renklerini
// parse edebilen bakımlı fork (klasik html2canvas bunlarda hata fırlatıyordu).
import html2canvas from 'html2canvas-pro';
import { supabase } from './supabase';
import { logFixEvent } from './fixPrompt';
import i18n from '../i18n';

// WhatsApp mesaj başlığındaki proje adı.
const APP_NAME = '2MC Gastro';
// localStorage override anahtarı (proje bazlı benzersiz).
const PHONE_LS_KEY = '2mc_gastro_hata_admin_phone';
// Admin/destek WhatsApp numarası (uluslararası, + ve boşluksuz).
// Öncelik: localStorage override > env > varsayılan.
const DEFAULT_ADMIN_PHONE = '905324961412';
const SCREENSHOT_BUCKET = 'error-screenshots';

export type ErrorSeverity = 'low' | 'normal' | 'high';
export type ErrorStatus = 'new' | 'in_progress' | 'resolved';

export interface ErrorReport {
  id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_role: string | null;
  /** Kullanıcının kendi yazdığı ham metin — AI bunu ASLA ezmez. */
  description: string;
  /** Aynı bildirimin AI ile detaylandırılmış hali (migration 032). */
  description_ai?: string | null;
  page_url: string | null;
  page_path: string | null;
  user_agent: string | null;
  screen_size: string | null;
  app_version: string | null;
  severity: ErrorSeverity;
  status: ErrorStatus;
  screenshot_path: string | null;
  screenshot_url: string | null;
  screenshot_data: string | null;
  console_errors: string | null;
  created_at: string;
  resolved_at: string | null;
  /** Claude Haiku ile üretilen düzeltme prompt'u (migration 030 · lib/fixPrompt.ts). */
  ai_prompt?: string | null;
  ai_prompt_at?: string | null;
  ai_model?: string | null;
  /** Otomatik triyaj durumu (error-webhook edge function doldurur, migration 031). */
  ai_status?: 'queued' | 'ok' | 'failed' | 'skipped' | null;
  ai_error?: string | null;
  // ─── Düzeltme takibi (migration 037) — otomatik düzeltme ajanı doldurur ───
  fix_status?: FixStatus | null;
  fix_attempt_count?: number | null;
  fix_commit_sha?: string | null;
  fix_commit_url?: string | null;
  fix_files?: string[] | null;
  fix_lines_changed?: number | null;
  /** Kullanıcıya gösterilen sade dil özeti — changelog ve e-postada yayınlanır. */
  fix_summary?: string | null;
  fix_technical?: string | null;
  fix_skip_reason?: string | null;
  fix_error?: string | null;
  committed_at?: string | null;
  deployed_at?: string | null;
  verified_at?: string | null;
  reverted_at?: string | null;
  /** Arşive alındıysa dolu (migration 038 — gerçek DELETE yapılmıyor). */
  deleted_at?: string | null;
}

/** Düzeltme durum makinesi — migration 037. */
export type FixStatus =
  | 'none' | 'eligible' | 'claimed' | 'committed' | 'deployed'
  | 'verified' | 'failed' | 'skipped' | 'revert_requested' | 'reverted' | 'manual';

export function getAdminPhone(): string {
  let ls: string | null = null;
  try { ls = localStorage.getItem(PHONE_LS_KEY); } catch { /* ignore */ }
  const env = (import.meta.env?.VITE_HATA_ADMIN_PHONE || '').trim();
  const raw = (ls && ls.trim()) || env || DEFAULT_ADMIN_PHONE;
  // Sadece rakam — wa.me ülke kodu + numara ister, + ve boşluk istemez.
  return String(raw).replace(/[^\d]/g, '');
}

// Kısa benzersiz id.
export function makeReportId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `err_${Date.now().toString(36)}_${rnd}`;
}

/**
 * Görünür sayfanın ekran görüntüsünü alır (html2canvas).
 * Widget'ın kendi DOM'u (FAB + modal) data-hata-bildir-skip="1" ile atlanır.
 */
export async function captureScreenshot(): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  try {
    // Yüksek çözünürlük (keskin metin): en az 2x supersampling, üst sınır 2.5x.
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5);
    const canvas = await html2canvas(document.body, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      logging: false,
      imageTimeout: 0,
      ignoreElements: (el) => (el as HTMLElement)?.dataset?.hataBildirSkip === '1',
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (e) {
    console.warn('[HataBildir] Ekran görüntüsü alınamadı:', (e as Error)?.message || e);
    return null;
  }
}

// data: URL → Blob (Storage upload için).
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [head, body] = String(dataUrl).split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(body);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch {
    return null;
  }
}

// herhangi bir dataURL (JPEG) → PNG Blob — ClipboardItem yalnızca image/png ister.
function dataUrlToPngBlob(dataUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => resolve(b), 'image/png');
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch { resolve(null); }
  });
}

/**
 * Ekran görüntüsünü panoya (image/png) kopyalar — WhatsApp Web sohbetinde
 * Ctrl+V ile doğrudan yapıştırılabilsin. wa.me deep-link dosya ekleyemediği
 * için masaüstünde görüntüyü mesaja sokmanın en güvenilir yolu budur.
 * ClipboardItem'a Promise<Blob> verilir → `write` kullanıcı jesti içinde çağrılır.
 * @returns kopyalandıysa true.
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }
    const blobPromise = dataUrlToPngBlob(dataUrl).then((b) => b ?? new Blob([], { type: 'image/png' }));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
    return true;
  } catch (e) {
    console.warn('[HataBildir] Panoya kopyalama başarısız:', (e as Error)?.message || e);
    return false;
  }
}

// data: URL → File (Web Share API dosya paylaşımı File nesnesi ister).
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  try {
    return new File([blob], filename || 'hata-ekran-goruntusu.jpg', {
      type: blob.type || 'image/jpeg',
    });
  } catch {
    return null;
  }
}

/**
 * Ekran görüntüsünü Storage'a yükler.
 * @returns başarılıysa {path, url}, aksi halde null.
 */
export async function uploadScreenshot(
  dataUrl: string,
  reportId: string,
): Promise<{ path: string; url: string } | null> {
  if (!supabase || !dataUrl) return null;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  const path = `${reportId}.jpg`;
  try {
    const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg',
    });
    if (error) {
      console.warn('[HataBildir] Storage upload başarısız:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path);
    const url = data?.publicUrl || null;
    if (!url) return null;
    return { path, url };
  } catch (e) {
    console.warn('[HataBildir] Storage upload exception:', (e as Error)?.message || e);
    return null;
  }
}

// Önem etiketleri — dil değişimini yansıtsın diye çağrı anında çözülür.
const severityLabel = (s: ErrorSeverity): string => {
  switch (s) {
    case 'low': return i18n.t('errorReports.severity.low');
    case 'high': return i18n.t('errorReports.severity.high');
    case 'normal':
    default: return i18n.t('errorReports.severity.normal');
  }
};

/**
 * WhatsApp mesaj metnini kurar.
 * attached=true ise görüntü mesaja DOSYA olarak (Web Share API) eklenmiştir.
 */
export function buildWhatsAppText(
  rec: Partial<ErrorReport> & { id: string },
  { attached = false, copied = false }: { attached?: boolean; copied?: boolean } = {},
): string {
  const dt = (() => {
    try { return new Date(rec.created_at || Date.now()).toLocaleString('tr-TR'); }
    catch { return rec.created_at || ''; }
  })();
  const screenshotLine = rec.screenshot_url
    ? i18n.t('errorReports.wa.screenshotUrl', { url: rec.screenshot_url })
    : attached
      ? i18n.t('errorReports.wa.attached')
      : copied
        ? i18n.t('errorReports.wa.copied')
        : i18n.t('errorReports.wa.downloaded');
  const lines = [
    i18n.t('errorReports.wa.title', { appName: APP_NAME }),
    i18n.t('errorReports.wa.reporter', {
      name: rec.reporter_name || '—',
      role: rec.reporter_role ? ` (${rec.reporter_role})` : '',
    }),
    `🕒 ${dt}`,
    i18n.t('errorReports.wa.page', { path: rec.page_path || '—' }),
    rec.page_url ? `🔗 ${rec.page_url}` : null,
    `🖥️ ${rec.screen_size || '—'}`,
    i18n.t('errorReports.wa.severity', {
      severity: severityLabel(rec.severity as ErrorSeverity) || rec.severity || i18n.t('errorReports.severity.normal'),
    }),
    '',
    // AI detaylandırdıysa onu göster; ham metin HER ZAMAN altında kalsın ki
    // yanlış yorumlanmışsa bildirenin asıl cümlesi kaybolmasın.
    i18n.t('errorReports.wa.descriptionHeader'),
    rec.description_ai || rec.description || '—',
    ...(rec.description_ai && rec.description
      ? ['', i18n.t('errorReports.wa.reportedWords'), `"${rec.description}"`]
      : []),
    '',
    screenshotLine,
    `🆔 ${rec.id}`,
  ].filter(Boolean) as string[];
  return lines.join('\n');
}

/**
 * Ekran görüntüsünü Web Share API ile DOSYA olarak paylaşır (WhatsApp/diğer).
 * wa.me deep-link dosya iliştiremediği için, görüntüyü gerçekten mesaja
 * eklemenin tek web yolu budur. Mobilde ve modern masaüstü Chromium'da çalışır.
 */
export async function shareScreenshotFile({
  file,
  text,
  title,
}: { file: File | null; text?: string; title?: string }): Promise<'shared' | 'aborted' | false> {
  if (typeof navigator === 'undefined' || !navigator.share || !file) return false;
  try {
    if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;
  } catch {
    return false;
  }
  try {
    await navigator.share({ files: [file], text: text || '', title: title || 'Hata Bildirimi' });
    return 'shared';
  } catch (e) {
    if (e && (e as Error).name === 'AbortError') return 'aborted';
    console.warn('[HataBildir] Web Share başarısız:', (e as Error)?.message || e);
    return false;
  }
}

/**
 * Bildirimi SUNUCUDAN otomatik WhatsApp mesajı olarak yollar (send-whatsapp
 * edge function · Green-API). Kullanıcının wa.me sekmesinde "gönder"e basmasına
 * gerek kalmaz — kayıt anında Adem'e düşer.
 *
 * Ekran görüntüsü Storage'a yüklendiyse metindeki link üzerinden erişilir;
 * send-whatsapp yalnızca PDF'i belge olarak iliştirebiliyor, görseli değil.
 *
 * Gönderim başarısız olsa bile kayıt tamamdır — çağıran taraf bunu bloklayıcı
 * saymamalı, yalnızca uyarı göstermeli.
 */
export async function sendReportWhatsApp(
  rec: Partial<ErrorReport> & { id: string },
  phone = getAdminPhone(),
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase yapılandırılmamış.' };

  let result: { ok: boolean; error?: string };
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { text: buildWhatsAppText(rec), phones: [phone] },
    });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error) result = { ok: false, error: error.message };
    else if (res?.error) result = { ok: false, error: String(res.error) };
    else result = res?.ok ? { ok: true } : { ok: false, error: 'Mesaj gönderilemedi' };
  } catch (e) {
    result = { ok: false, error: (e as Error)?.message || 'Gönderim hatası' };
  }

  // Gönderim sonucunu işlem geçmişine yaz — eskiden yalnızca toast'ta görünüp
  // kayboluyordu, "bu bildirim iletildi mi" sorusu cevapsızdı.
  void logFixEvent({
    id: rec.id,
    kind: 'whatsapp',
    status: result.ok ? 'ok' : 'failed',
    title: result.ok ? `WhatsApp iletildi → +${phone}` : 'WhatsApp iletilemedi',
    detail: result.error || null,
    payload: { phone },
  });

  return result;
}

/**
 * Hata kaydını arşive alır (soft delete).
 * Gerçek DELETE yapmıyoruz: error_fixes'teki işlem geçmişi kayda bağlı ve
 * silinen bir kaydın "neydi, kim çözdü" bilgisi geri gelmiyordu.
 * SQL: migration 038 → public.soft_delete_error_record
 */
export async function archiveReport(id: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase yapılandırılmamış.' };
  try {
    const { error } = await supabase.rpc('soft_delete_error_record', {
      p_kind: 'report',
      p_id: id,
      p_reason: reason || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Silme hatası' };
  }
}

// WhatsApp'ı (varsa uygulama, yoksa web) önceden doldurulmuş metinle açar.
export function openWhatsApp(text: string, phone = getAdminPhone()): string {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { window.location.href = url; }
  return url;
}

// Ekran görüntüsünü cihaza indirir — kullanıcı WhatsApp sohbetinde
// dosya olarak iliştirebilsin (deep-link otomatik ekleyemez).
export function downloadDataUrl(dataUrl: string, filename: string): void {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'hata-ekran-goruntusu.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.warn('[HataBildir] İndirme başarısız:', (e as Error)?.message || e);
  }
}

/**
 * Kaydı kalıcı olarak Supabase error_reports tablosuna yazar.
 * Migration 018 uygulanmamışsa hata yutulur (WhatsApp akışı yine de çalışsın).
 * @returns insert başarılıysa true.
 */
export async function persistReport(rec: ErrorReport): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('error_reports').insert(rec);
    if (error) {
      console.warn('[HataBildir] DB insert başarısız:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[HataBildir] DB insert exception:', (e as Error)?.message || e);
    return false;
  }
}
