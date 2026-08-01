import { supabase } from "./supabase";

export type EmailTemplate =
  | "order-confirmation"
  | "welcome"
  | "order-shipped"
  | "approval-granted"
  | "lead-followup"
  | "quote-ready"
  | "lead-magnet"
  /** Bildirilen sorun düzeltilip canlıya alındığında bildirene gider. */
  | "fix-deployed";

export interface SendEmailParams {
  template: EmailTemplate;
  to: string;
  data: Record<string, unknown>;
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase client not initialized" };

  const { data, error } = await supabase.functions.invoke("send-email", { body: params });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true };
}
