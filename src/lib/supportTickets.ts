// Destek biletleri — /support formunun KALICI kaydı.
//
// Form eskiden yalnızca send-email edge function'ını çağırıyordu; e-posta
// düşerse bilet kaybolurdu. Artık kayıt önce support_tickets'a yazılır,
// e-posta ikincil bildirimdir. Tablo + RLS + yönetici bildirimi trigger'ı:
// supabase/migrations/050_support_tickets.sql
import { supabase } from './supabase';

export interface SupportTicket {
  id: string;
  user_id: string | null;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_company: string | null;
  created_at: string;
}

export interface NewSupportTicket {
  subject: string;
  message: string;
  priority: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterCompany?: string;
}

/**
 * Bileti kaydeder. user_id'yi RLS auth.uid()'e sabitlediği için burada
 * oturumdaki kullanıcıyı okuyup gönderiyoruz; oturumsuzda NULL kalır.
 * Hata durumunda fırlatır — çağıran formu KORUMALI, "gönderildi" dememeli.
 *
 * Bilerek `.select()` YOK: /support oturumsuz ziyaretçiye de açık ve SELECT
 * politikası yalnızca authenticated'a veriliyor. Insert'e select eklenirse
 * kayıt başarıyla yazılsa bile geri okuma boş döner ve ziyaretçi hata görür.
 */
export async function createSupportTicket(input: NewSupportTicket): Promise<void> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış.');

  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: auth?.user?.id ?? null,
      subject: input.subject,
      message: input.message,
      priority: input.priority,
      reporter_name: input.reporterName || null,
      reporter_email: input.reporterEmail || null,
      reporter_company: input.reporterCompany || null,
    });

  if (error) throw new Error(error.message);
}

/**
 * Bilet listesi. Ne döneceğini RLS belirler: yönetici hepsini, normal
 * kullanıcı yalnızca kendi biletlerini görür.
 * Migration uygulanmamışsa uygulama patlamasın diye boş döner.
 */
export async function fetchSupportTickets(limit = 50): Promise<SupportTicket[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (!/does not exist|schema cache/i.test(error.message)) {
        console.warn('[supportTickets] okunamadı:', error.message);
      }
      return [];
    }
    return (data as SupportTicket[]) || [];
  } catch (e) {
    console.warn('[supportTickets] exception:', (e as Error)?.message || e);
    return [];
  }
}
