// Bildirimler — portal zil ikonunun GERÇEK veri kaynağı.
//
// Önceden uiStore.ts içine gömülü 4 adet sabit demo kaydı gösteriliyordu ve
// addNotification hiçbir yerden çağrılmıyordu. Artık bildirimleri sunucu
// üretiyor (publish_fix_deploy → notifications).
//
// Tablolar + RLS + RPC'ler: supabase/migrations/040_notifications.sql
//   notifications      → bildirimin kendisi (audience: user | all | admin)
//   notification_reads → kim neyi okudu (audience='all' için kullanıcı başına
//                        satır çoğaltmadan okundu takibi)
//   my_notifications   → ikisini birleştiren view (read boolean ekler)
import { supabase } from './supabase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  audience: 'user' | 'all' | 'admin';
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  read: boolean;
}

/**
 * Oturumdaki kullanıcının görebildiği bildirimleri getirir.
 * Oturum yoksa boş döner — zil sessizce boş görünür.
 */
export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('my_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      // Migration uygulanmamışsa zil boş kalsın, uygulama patlamasın.
      if (!/does not exist|schema cache/i.test(error.message)) {
        console.warn('[notifications] okunamadı:', error.message);
      }
      return [];
    }
    return (data as AppNotification[]) || [];
  } catch (e) {
    console.warn('[notifications] exception:', (e as Error)?.message || e);
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('mark_notification_read', { p_id: id });
  return !error;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('mark_all_notifications_read');
  return !error;
}

/**
 * Yeni bildirimleri canlı dinler (realtime).
 * @returns aboneliği kapatan fonksiyon
 */
export function subscribeNotifications(onChange: () => void): () => void {
  if (!supabase) return () => {};
  try {
    const channel = supabase
      .channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  } catch {
    return () => {};
  }
}
