// AI Düzeltme Prompt'u — kullanıcının anlattığı hatayı yorumlayıp, sistemin
// düzeltilmesi için gereken geliştirici prompt'unu üretir.
// Model: Claude Haiku (edge function: supabase/functions/fix-prompt)
// Kolonlar: error_reports.ai_prompt / ai_prompt_at / ai_model (migration 030)
import { supabase } from './supabase';
import i18n from '../i18n';

const FN_NAME = 'fix-prompt';

export interface FixPromptInput {
  description: string;
  pagePath?: string | null;
  pageUrl?: string | null;
  severity?: string | null;
  screenSize?: string | null;
  userAgent?: string | null;
  consoleErrors?: string | null;
  reporter?: string | null;
  /** Çıktı dili — varsayılan olarak arayüzün aktif dili. */
  locale?: string;
  /** Otomatik loglarda (error_logs): JS stack trace. */
  stack?: string | null;
  /** Otomatik loglarda: hatanın kaç kez tekrarladığı. */
  occurrences?: number | null;
  /** 'report' = elle bildirim · 'log' = otomatik yakalama. */
  kind?: 'report' | 'log';
}

export interface FixPromptResult {
  prompt: string;
  /**
   * Kullanıcının anlatımının AI ile detaylandırılmış hali (description_ai).
   * Ham metin hiçbir zaman ezilmez — description sütununda aynen kalır.
   */
  detailedDescription: string;
  model: string;
  usage?: { input: number; output: number; cacheRead: number };
}

/** Edge function'ın döndürdüğü hata gövdesini okunur mesaja çevirir. */
async function readInvokeError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* gövde JSON değil — genel mesaja düş */
    }
  }
  return (error as Error)?.message || 'Bilinmeyen hata';
}

/**
 * Ham hata bildirimini Claude Haiku'ya yorumlatır ve markdown geliştirici
 * prompt'unu döndürür. Yalnızca admin kullanıcılar çağırabilir (edge function
 * is_admin() ile doğrular).
 * @throws Hata mesajı içeren Error — çağıran tarafta toast ile gösterilmeli.
 */
export async function generateFixPrompt(input: FixPromptInput): Promise<FixPromptResult> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');
  const description = String(input.description || '').trim();
  if (description.length < 5) throw new Error('Önce hatayı birkaç kelimeyle açıklayın.');

  const { data, error } = await supabase.functions.invoke(FN_NAME, {
    body: {
      description,
      pagePath: input.pagePath || '',
      pageUrl: input.pageUrl || '',
      severity: input.severity || 'normal',
      screenSize: input.screenSize || '',
      userAgent: input.userAgent || '',
      consoleErrors: input.consoleErrors || '',
      reporter: input.reporter || '',
      locale: input.locale || i18n.language || 'tr',
      stack: input.stack || '',
      occurrences: input.occurrences || 1,
      kind: input.kind || 'report',
    },
  });

  if (error) throw new Error(await readInvokeError(error));
  if (!data?.prompt) throw new Error(data?.error || 'Prompt üretilemedi.');

  return {
    prompt: String(data.prompt),
    detailedDescription: String(data.fields?.detailedDescription || ''),
    model: String(data.model || ''),
    usage: data.usage,
  };
}

/**
 * Üretilen prompt'u ve detaylandırılmış açıklamayı kayda yazar.
 * `description` sütununa ASLA dokunmaz — kullanıcının yazdığı ham metin orada
 * korunur, AI'ın detaylandırdığı hali `description_ai`'ye gider (migration 032).
 * Migration uygulanmamışsa sessizce false döner — çıktı yine de ekranda görünür.
 */
export async function saveFixPrompt(
  reportId: string,
  result: Pick<FixPromptResult, 'prompt' | 'detailedDescription' | 'model'>,
  table = 'error_reports',
): Promise<boolean> {
  if (!supabase || !reportId) return false;
  try {
    const patch: Record<string, unknown> = {
      ai_prompt: result.prompt,
      ai_prompt_at: new Date().toISOString(),
      ai_model: result.model || '',
    };
    if (result.detailedDescription) patch.description_ai = result.detailedDescription;

    const { error } = await supabase.from(table).update(patch).eq('id', reportId);
    if (error) {
      console.warn('[fixPrompt] Kayıt güncellenemedi:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[fixPrompt] Kayıt exception:', (e as Error)?.message || e);
    return false;
  }
}

/** Panoya metin kopyalar; Clipboard API yoksa textarea fallback'i dener. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* izin reddedildi — fallback'e düş */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
