// ─── Otomatik Hata Kaydı (error_logs) ────────────────────────────────
// Uygulamanın KENDİ yakaladığı hataları Supabase'e yazar. Adminlerin elle
// doldurduğu bildirimler ayrı tabloda tutulur (error_reports · lib/errorReport.ts).
//
// Yazma tek kapıdan: public.log_client_error() RPC (SECURITY DEFINER).
// Tabloya doğrudan INSERT yetkisi yok — böylece anon spam'i engellenir,
// tekrar eden hata yeni satır açmaz (occurrences artar).
//
// SQL: supabase/migrations/031_error_logs_and_webhook.sql
// Panel: src/pages/admin/ErrorReportsPage.tsx → "Sistem Logları" sekmesi
import { supabase } from './supabase';

export type LogLevel = 'error' | 'warning' | 'info';
export type LogSource = 'window' | 'promise' | 'console' | 'react' | 'network' | 'supabase' | 'manual';
export type LogStatus = 'new' | 'in_progress' | 'resolved' | 'ignored';
export type AiStatus = 'queued' | 'ok' | 'failed' | 'skipped';

export interface ErrorLog {
  id: string;
  fingerprint: string;
  level: LogLevel;
  source: LogSource;
  /** Yakalanan ham hata mesajı — AI bunu ASLA ezmez. */
  message: string;
  /** Aynı hatanın AI ile detaylandırılmış hali (migration 034). */
  description_ai?: string | null;
  stack: string | null;
  file_name: string | null;
  line_no: number | null;
  col_no: number | null;
  page_url: string | null;
  page_path: string | null;
  user_agent: string | null;
  screen_size: string | null;
  app_version: string | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  meta: Record<string, unknown>;
  occurrences: number;
  severity: 'low' | 'normal' | 'high';
  status: LogStatus;
  ai_prompt: string | null;
  ai_prompt_at: string | null;
  ai_model: string | null;
  ai_status: AiStatus | null;
  ai_error: string | null;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
}

export interface ClientErrorInput {
  message: string;
  level?: LogLevel;
  source?: LogSource;
  stack?: string | null;
  fileName?: string | null;
  lineNo?: number | null;
  colNo?: number | null;
  meta?: Record<string, unknown>;
}

// ─── Gürültü filtresi ─────────────────────────────────────────────────
// Bu kalıplar ya tarayıcı gürültüsü ya da bize bilgi vermeyen (cross-origin)
// hatalar. Kaydedilirse panel çöplüğe döner.
const IGNORE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Non-Error promise rejection/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /safari-extension:\/\//i,
  /\[vite\]/i,                       // dev sunucusu HMR mesajları
  /The play\(\) request was interrupted/i,
  /AbortError/i,                     // kullanıcı sayfadan ayrıldı
];

// ─── Sel freni ────────────────────────────────────────────────────────
const MAX_PER_MINUTE = 12;
const MAX_PER_SESSION = 40;
const REPEAT_WINDOW_MS = 60_000;

let installed = false;
let sessionCount = 0;
let minuteStamp = 0;
let minuteCount = 0;
/** İstemci tarafı tekilleme — aynı hata 60 sn içinde tekrar gönderilmez. */
const recent = new Map<string, number>();
/** RPC'nin kendi hatasını loglayıp sonsuz döngüye girmeyelim. */
let sending = false;

function allowed(key: string): boolean {
  const now = Date.now();

  const minute = Math.floor(now / 60_000);
  if (minute !== minuteStamp) { minuteStamp = minute; minuteCount = 0; }
  if (minuteCount >= MAX_PER_MINUTE) return false;
  if (sessionCount >= MAX_PER_SESSION) return false;

  const last = recent.get(key);
  if (last && now - last < REPEAT_WINDOW_MS) return false;

  // Harita şişmesin — pencere dışındakileri temizle.
  if (recent.size > 200) {
    recent.forEach((t, k) => { if (now - t > REPEAT_WINDOW_MS) recent.delete(k); });
  }

  recent.set(key, now);
  minuteCount += 1;
  sessionCount += 1;
  return true;
}

function meta() {
  if (typeof window === 'undefined') return { pageUrl: '', pagePath: '', userAgent: '', screenSize: '', appVersion: '' };
  return {
    pageUrl: window.location?.href || '',
    pagePath: (window.location?.pathname || '') + (window.location?.hash || ''),
    userAgent: navigator?.userAgent || '',
    screenSize: `${window.innerWidth}×${window.innerHeight}`,
    appVersion: String(import.meta.env?.VITE_APP_VERSION || '0.1.0'),
  };
}

/**
 * Tek bir hatayı error_logs'a yazar. Asla throw etmez — log yazamamak
 * uygulamayı etkilememeli.
 * @returns yazıldıysa satır id'si, atlandıysa null.
 */
export async function logClientError(input: ClientErrorInput): Promise<string | null> {
  const message = String(input?.message || '').trim();
  if (!message || !supabase || sending) return null;
  if (IGNORE.some((re) => re.test(message))) return null;

  const m = meta();
  // İstemci tarafı anahtar; kesin tekilleme sunucuda (fingerprint) yapılıyor.
  const key = `${input.source || 'window'}|${message.slice(0, 200)}|${input.fileName || ''}|${m.pagePath}`;
  if (!allowed(key)) return null;

  sending = true;
  try {
    const { data, error } = await supabase.rpc('log_client_error', {
      p_message: message.slice(0, 2000),
      p_level: input.level || 'error',
      p_source: input.source || 'window',
      p_stack: input.stack ? String(input.stack).slice(0, 8000) : null,
      p_file_name: input.fileName || null,
      p_line_no: input.lineNo ?? null,
      p_col_no: input.colNo ?? null,
      p_page_url: m.pageUrl,
      p_page_path: m.pagePath,
      p_user_agent: m.userAgent,
      p_screen_size: m.screenSize,
      p_app_version: m.appVersion,
      p_meta: input.meta || {},
    });
    if (error) {
      // Migration 031 uygulanmadıysa burası konuşur — sessizce geç.
      console.warn('[errorLog] RPC başarısız:', error.message);
      return null;
    }
    return (data as string) || null;
  } catch (e) {
    console.warn('[errorLog] RPC exception:', (e as Error)?.message || e);
    return null;
  } finally {
    sending = false;
  }
}

/**
 * Global yakalayıcıları kurar (window.onerror + unhandledrejection).
 * main.tsx'ten bir kez çağrılır; tekrar çağrılırsa hiçbir şey yapmaz.
 */
export function installErrorLogging(): () => void {
  if (installed || typeof window === 'undefined') return () => {};
  installed = true;

  const onError = (e: ErrorEvent) => {
    void logClientError({
      message: e.message || String(e.error?.message || 'Bilinmeyen hata'),
      level: 'error',
      source: 'window',
      stack: e.error?.stack || null,
      fileName: e.filename || null,
      lineNo: e.lineno ?? null,
      colNo: e.colno ?? null,
    });
  };

  const onRejection = (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === 'string' ? reason : JSON.stringify(reason)?.slice(0, 500) || 'Promise reddedildi';
    void logClientError({
      message,
      level: 'error',
      source: 'promise',
      stack: reason instanceof Error ? reason.stack || null : null,
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    installed = false;
  };
}

/** React ErrorBoundary'den çağrılır — componentStack ile birlikte. */
export function logReactError(error: Error, componentStack?: string): void {
  void logClientError({
    message: error?.message || 'React render hatası',
    level: 'error',
    source: 'react',
    stack: error?.stack || null,
    meta: componentStack ? { componentStack: componentStack.slice(0, 4000) } : undefined,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Admin panel sorguları (yalnızca admin RLS'i geçer)
// ─────────────────────────────────────────────────────────────────────

export async function fetchErrorLogs(limit = 200): Promise<{ data: ErrorLog[]; error: string }> {
  if (!supabase) return { data: [], error: 'Supabase yapılandırılmamış.' };
  const { data, error } = await supabase
    .from('error_logs')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(limit);
  if (error) {
    return {
      data: [],
      error: /does not exist|schema cache/i.test(error.message)
        ? 'error_logs tablosu bulunamadı — migration 031 SQL\'ini çalıştırın.'
        : error.message,
    };
  }
  return { data: (data as ErrorLog[]) || [], error: '' };
}

export async function setErrorLogStatus(id: string, status: LogStatus): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('error_logs')
    .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', id);
  return !error;
}

export async function deleteErrorLog(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('error_logs').delete().eq('id', id);
  return !error;
}

/** Çözülmüş/yoksayılmış logları toplu temizler. @returns silinen satır sayısı */
export async function purgeClosedLogs(): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from('error_logs')
    .delete()
    .in('status', ['resolved', 'ignored'])
    .select('id');
  return error ? 0 : (data?.length || 0);
}

// Not: AI prompt'unu kaydetmek için lib/fixPrompt.ts → saveFixPrompt(id, res, 'error_logs')
// kullanılır; error_reports ile tek kod yolunu paylaşsın diye burada ayrı bir
// yardımcı tutulmuyor.
