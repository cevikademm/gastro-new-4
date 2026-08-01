// Otomatik düzeltme ajanı — admin ayarları ve kuyruk.
// Ayarlar app_settings'te (migration 041), ajanın kendisi bulut rutini olarak
// saatte bir çalışıp supabase/functions/fix-agent'a bağlanır.
// Panel: src/pages/admin/errorReports/AgentPanel.tsx
import { supabase } from './supabase';
import { generateSecret } from './appSettings';

export const AGENT_KEYS = {
  enabled: 'fix_agent_enabled',
  secret: 'fix_agent_secret',
  mode: 'fix_agent_mode',
  maxFiles: 'fix_agent_max_files',
  maxLines: 'fix_agent_max_lines',
  maxPerRun: 'fix_agent_max_per_run',
  maxPerDay: 'fix_agent_max_per_day',
  notifyReporter: 'fix_agent_notify_reporter',
} as const;

export type AgentMode = 'auto' | 'approved_only';

export interface AgentSettings {
  enabled: boolean;
  secret: string;
  /** auto = kuyruğa düşen her kaydı alır · approved_only = admin "Ajana Ver" demeli */
  mode: AgentMode;
  maxFiles: number;
  maxLines: number;
  maxPerRun: number;
  maxPerDay: number;
  notifyReporter: boolean;
}

const DEFAULTS: AgentSettings = {
  enabled: false,
  secret: '',
  mode: 'auto',
  maxFiles: 8,
  maxLines: 400,
  maxPerRun: 1,
  maxPerDay: 10,
  notifyReporter: true,
};

/** Bu proje için beklenen fix-agent URL'i (rutine yapıştırılır). */
export function agentFunctionUrl(): string {
  const base = String(import.meta.env?.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  return base ? `${base}/functions/v1/fix-agent` : '';
}

export { generateSecret };

export async function fetchAgentSettings(): Promise<{ data: AgentSettings; error: string }> {
  if (!supabase) return { data: DEFAULTS, error: 'Supabase yapılandırılmamış.' };
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', Object.values(AGENT_KEYS));

  if (error) {
    return {
      data: DEFAULTS,
      error: /does not exist|schema cache/i.test(error.message)
        ? 'Ajan ayarları bulunamadı — migration 041 SQL\'ini çalıştırın.'
        : error.message,
    };
  }

  const m = new Map((data || []).map((r) => [r.key as string, (r.value as string) || '']));
  const num = (k: string, d: number) => Number(m.get(k)) || d;
  return {
    data: {
      enabled: m.get(AGENT_KEYS.enabled) === 'true',
      secret: m.get(AGENT_KEYS.secret) || '',
      mode: (m.get(AGENT_KEYS.mode) as AgentMode) || 'auto',
      maxFiles: num(AGENT_KEYS.maxFiles, DEFAULTS.maxFiles),
      maxLines: num(AGENT_KEYS.maxLines, DEFAULTS.maxLines),
      maxPerRun: num(AGENT_KEYS.maxPerRun, DEFAULTS.maxPerRun),
      maxPerDay: num(AGENT_KEYS.maxPerDay, DEFAULTS.maxPerDay),
      notifyReporter: m.get(AGENT_KEYS.notifyReporter) !== 'false',
    },
    error: '',
  };
}

export async function saveAgentSettings(s: AgentSettings): Promise<string> {
  if (!supabase) return 'Supabase yapılandırılmamış.';
  const now = new Date().toISOString();
  const rows = [
    { key: AGENT_KEYS.enabled, value: s.enabled ? 'true' : 'false', updated_at: now },
    { key: AGENT_KEYS.secret, value: s.secret.trim(), updated_at: now },
    { key: AGENT_KEYS.mode, value: s.mode, updated_at: now },
    { key: AGENT_KEYS.maxFiles, value: String(s.maxFiles), updated_at: now },
    { key: AGENT_KEYS.maxLines, value: String(s.maxLines), updated_at: now },
    { key: AGENT_KEYS.maxPerRun, value: String(s.maxPerRun), updated_at: now },
    { key: AGENT_KEYS.maxPerDay, value: String(s.maxPerDay), updated_at: now },
    { key: AGENT_KEYS.notifyReporter, value: s.notifyReporter ? 'true' : 'false', updated_at: now },
  ];
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  return error ? error.message : '';
}

/** Ajanın işleyebileceği bekleyen kayıt sayısı (fix_agent_queue view'ı). */
export async function fetchQueueCount(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('fix_agent_queue')
    .select('id', { count: 'exact', head: true });
  return error ? 0 : (count || 0);
}

/**
 * Kaydı ajan kuyruğuna sokar (approved_only modunda zorunlu adım).
 * @param kind 'report' | 'log'
 */
export async function markEligible(kind: 'report' | 'log', id: string): Promise<string> {
  if (!supabase) return 'Supabase yapılandırılmamış.';
  const table = kind === 'log' ? 'error_logs' : 'error_reports';
  const { error } = await supabase
    .from(table)
    .update({ fix_status: 'eligible' })
    .eq('id', id);
  return error ? error.message : '';
}

/** Kaydı ajandan alır, insana devreder. */
export async function markManual(kind: 'report' | 'log', id: string): Promise<string> {
  if (!supabase) return 'Supabase yapılandırılmamış.';
  const table = kind === 'log' ? 'error_logs' : 'error_reports';
  const { error } = await supabase
    .from(table)
    .update({ fix_status: 'manual' })
    .eq('id', id);
  return error ? error.message : '';
}

/** Canlıdaki bir düzeltmenin geri alınmasını ister; ajan sıradaki koşuda yapar. */
export async function requestRevert(kind: 'report' | 'log', id: string): Promise<string> {
  if (!supabase) return 'Supabase yapılandırılmamış.';
  const table = kind === 'log' ? 'error_logs' : 'error_reports';
  const { error } = await supabase
    .from(table)
    .update({ fix_status: 'revert_requested' })
    .eq('id', id);
  return error ? error.message : '';
}

export interface AgentRun {
  id: string;
  kind: string;
  status: string;
  title: string | null;
  detail: string | null;
  actor: string;
  created_at: string;
  payload: Record<string, unknown> | null;
}

/** Son ajan koşuları (error_fixes'teki agent_* ve deploy izleri). */
export async function fetchAgentRuns(limit = 20): Promise<AgentRun[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('error_fixes')
    .select('id, kind, status, title, detail, actor, created_at, payload')
    .in('kind', ['agent_claim', 'agent_fix', 'agent_skip', 'agent_revert', 'deploy'])
    .order('created_at', { ascending: false })
    .limit(limit);
  return error ? [] : ((data as AgentRun[]) || []);
}
