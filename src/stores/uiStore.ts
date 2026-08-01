import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debouncedSyncUserPrefs, loadUserPrefs } from '../lib/gastroSync';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/notifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  /** Tıklanınca gidilecek yol (ör. /degisiklikler). */
  link?: string | null;
}

interface UIState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  cookieConsent: boolean | null;
  notifications: Notification[];
  notificationPanelOpen: boolean;
  showPromoProducts: boolean;
  setShowPromoProducts: (v: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setCookieConsent: (value: boolean) => void;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  /** Sunucudan (my_notifications view'ı) tazeler. */
  loadNotifications: () => Promise<void>;
  notificationsLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toggleNotificationPanel: () => void;
  unreadCount: () => number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      mobileMenuOpen: false,
      cookieConsent: null,
      // Kaynak sunucu (notifications tablosu). Sabit demo kayıtları kaldırıldı.
      notifications: [],
      notificationsLoading: false,
      notificationPanelOpen: false,
      showPromoProducts: true,
      setShowPromoProducts: (v) => set({ showPromoProducts: v }),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
      setCookieConsent: (value) => set({ cookieConsent: value }),

      addNotification: (n) => {
        set((state) => ({
          notifications: [
            { ...n, id: Date.now().toString(), read: false, createdAt: new Date().toISOString() },
            ...state.notifications,
          ],
        }));
      },

      loadNotifications: async () => {
        set({ notificationsLoading: true });
        const rows = await fetchNotifications();
        set({
          notifications: rows.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message || '',
            type: n.type,
            read: n.read,
            createdAt: n.created_at,
            link: n.link,
          })),
          notificationsLoading: false,
        });
      },

      // Okundu bilgisi sunucuda tutulur; ekranı hemen güncelleyip arkadan yazıyoruz.
      markRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        void markNotificationRead(id);
      },

      markAllRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
        void markAllNotificationsRead();
      },

      toggleNotificationPanel: () => set((s) => ({ notificationPanelOpen: !s.notificationPanelOpen })),

      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: '2mc-gastro-ui',
      // v2: bildirimler artık sunucudan geliyor. v1'de sabit demo kayıtları
      // localStorage'a yazılmıştı; migrate onları temizlemezse ekranda kalırlar.
      version: 2,
      migrate: (persisted, version) => {
        const s = (persisted || {}) as Record<string, unknown>;
        if (version < 2) delete s.notifications;
        return s as never;
      },
      partialize: (state) => ({
        cookieConsent: state.cookieConsent,
        showPromoProducts: state.showPromoProducts,
      }),
    }
  )
);

// Kullanıcı tercihlerini Supabase'e yaz. Bildirimler ARTIK BURADAN GİTMİYOR:
// sunucu üretiyor, gastro_user_prefs'e kopyalamak eski demo kayıtların geri
// gelmesine yol açıyordu.
useUIStore.subscribe((state) => {
  debouncedSyncUserPrefs({ cookieConsent: state.cookieConsent });
});

loadUserPrefs().then((remote) => {
  if (!remote) return;
  if (typeof remote.cookieConsent === 'boolean') {
    useUIStore.setState({ cookieConsent: remote.cookieConsent });
  }
});
