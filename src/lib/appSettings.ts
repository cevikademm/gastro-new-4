// ─── app_settings — admin'e açık anahtar/değer ayar deposu ───────────
// Şimdilik yalnızca otomatik hata giderme webhook'u kullanıyor.
// Tablo + RLS: supabase/migrations/031_error_logs_and_webhook.sql (admin-only)
import { supabase } from './supabase';

export const WEBHOOK_KEYS = {
  enabled: 'error_webhook_enabled',
  url: 'error_webhook_url',
  secret: 'error_webhook_secret',
} as const;

export interface WebhookSettings {
  enabled: boolean;
  url: string;
  secret: string;
}

/** Bu proje için beklenen edge function URL'i (kullanıcıya öneri olarak gösterilir). */
export function suggestedWebhookUrl(): string {
  const base = String(import.meta.env?.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  return base ? `${base}/functions/v1/error-webhook` : '';
}

/** Rastgele, paylaşılabilir bir sır üretir (trigger ↔ edge function arasında). */
export function generateSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function fetchWebhookSettings(): Promise<{ data: WebhookSettings; error: string }> {
  const empty: WebhookSettings = { enabled: false, url: '', secret: '' };
  if (!supabase) return { data: empty, error: 'Supabase yapılandırılmamış.' };

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [WEBHOOK_KEYS.enabled, WEBHOOK_KEYS.url, WEBHOOK_KEYS.secret]);

  if (error) {
    return {
      data: empty,
      error: /does not exist|schema cache/i.test(error.message)
        ? 'app_settings tablosu bulunamadı — migration 031 SQL\'ini çalıştırın.'
        : error.message,
    };
  }

  const map = new Map((data || []).map((r) => [r.key as string, (r.value as string) || '']));
  return {
    data: {
      enabled: map.get(WEBHOOK_KEYS.enabled) === 'true',
      url: map.get(WEBHOOK_KEYS.url) || '',
      secret: map.get(WEBHOOK_KEYS.secret) || '',
    },
    error: '',
  };
}

// ─── Webhook teşhisi (migrations 032/033/035/036) ────────────────────

export interface WebhookDiagnostics {
  pg_net_installed: boolean;
  pg_net_schema: string | null;
  enabled: boolean;
  url_set: boolean;
  url: string | null;
  secret_len: number;
  triggers: number;
  sent: boolean;
  request_id: number | null;
  send_error: string | null;
}

/**
 * Zinciri kontrol eder; p_send=true ise gerçek bir PING POST'u kuyruğa atar.
 * pg_net isteği ancak COMMIT sonrası gönderdiği için yanıt AYRI çağrıyla
 * (checkWebhookTestResult) okunur.
 */
export async function runWebhookDiagnostics(send = false): Promise<WebhookDiagnostics> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await supabase.rpc('error_webhook_diagnostics', { p_send: send });
  if (error) {
    throw new Error(/does not exist|schema cache/i.test(error.message)
      ? 'Teşhis fonksiyonu yok — migration 032/033/035/036 SQL\'lerini çalıştırın.'
      : error.message);
  }
  return data as WebhookDiagnostics;
}

export interface WebhookTestResult {
  pending: boolean;
  status: number | null;
  body: string | null;
  error: string | null;
}

export async function checkWebhookTestResult(requestId: number): Promise<WebhookTestResult> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const { data, error } = await supabase.rpc('error_webhook_test_result', { p_request_id: requestId });
  if (error) throw new Error(error.message);
  return data as WebhookTestResult;
}

export async function saveWebhookSettings(s: WebhookSettings): Promise<string> {
  if (!supabase) return 'Supabase yapılandırılmamış.';
  const now = new Date().toISOString();
  const rows = [
    { key: WEBHOOK_KEYS.enabled, value: s.enabled ? 'true' : 'false', updated_at: now },
    { key: WEBHOOK_KEYS.url, value: s.url.trim(), updated_at: now },
    { key: WEBHOOK_KEYS.secret, value: s.secret.trim(), updated_at: now },
  ];
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  return error ? error.message : '';
}
