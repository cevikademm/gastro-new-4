import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import { supabase } from '../lib/supabase';
import { useOrderStore } from './orderStore';

export interface User {
  id: string;
  email: string;
  fullName: string;
  company: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  sector?: string;
  language: string;
  region: string;
  currency: string;
  dateFormat: string;
  approved: boolean;
  /** Abonelik planı — premium özellikleri (PDF Teklif vb.) bununla gate'lenir */
  subscription: 'free' | 'pro';
  notifications: {
    email: boolean;
    push: boolean;
    projectUpdates: boolean;
    bomChanges: boolean;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingApproval: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; pendingApproval?: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  register: (data: Partial<User> & { password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  checkSession: () => Promise<void>;
  /** Mevcut oturumun şifresini değiştirir (kullanıcının kendi Supabase oturumuyla). */
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  /** Mevcut şifreyi doğrulayıp yeni şifreyi ayarlar (Profil sayfası formu). */
  changePasswordWithCurrent: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  /** Bu cihaz HARİÇ diğer tüm oturumları (cihazları) kapatır. */
  logoutOtherSessions: () => Promise<{ success: boolean; error?: string }>;
}

const defaultUserSettings = {
  role: 'User',
  language: 'tr',
  region: 'EU',
  currency: 'EUR',
  dateFormat: 'DD.MM.YYYY',
  notifications: {
    email: true,
    push: true,
    projectUpdates: true,
    bomChanges: true,
  },
};

async function fetchProfile(userId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

function buildUser(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }, profile: Record<string, unknown> | null): User {
  return {
    ...defaultUserSettings,
    id: authUser.id,
    email: authUser.email || '',
    fullName: (profile?.full_name as string) || (authUser.user_metadata?.full_name as string) || (authUser.user_metadata?.name as string) || '',
    role: (profile?.role as string) || 'User',
    company: (profile?.company as string) || '',
    avatar: (authUser.user_metadata?.avatar_url as string) || undefined,
    phone: (profile?.phone as string) || '',
    taxId: (profile?.tax_id as string) || '',
    sector: (profile?.sector as string) || '',
    approved: (profile?.approved as boolean) ?? false,
    subscription: (profile?.subscription as 'free' | 'pro') || 'free',
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      pendingApproval: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        if (!supabase) {
          set({ isLoading: false });
          return { success: false, error: i18n.t('common.error.supabaseNotConfigured') };
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          set({ isLoading: false });
          return { success: false, error: i18n.t('auth.invalidCredentials') };
        }

        const profile = await fetchProfile(data.user.id);
        const user = buildUser(data.user, profile);

        if (!user.approved) {
          await supabase.auth.signOut();
          set({ isLoading: false, pendingApproval: true });
          return { success: false, pendingApproval: true };
        }

        set({ user, isAuthenticated: true, isLoading: false, pendingApproval: false });
        return { success: true };
      },

      loginWithGoogle: async () => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}${window.location.pathname}`,
          },
        });
      },

      register: async (data) => {
        set({ isLoading: true });
        if (!supabase) {
          set({ isLoading: false });
          return { success: false, error: i18n.t('common.error.supabaseNotConfigured') };
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email || '',
          password: data.password,
          options: {
            data: {
              full_name: data.fullName || '',
            },
          },
        });

        if (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }

        // Update profile with extra fields
        if (authData.user) {
          await supabase.from('profiles').update({
            full_name: data.fullName,
            company: data.company,
            tax_id: data.taxId,
            sector: data.sector,
          }).eq('id', authData.user.id);
        }

        // Sign out - user must wait for approval
        await supabase.auth.signOut();
        set({ isLoading: false, pendingApproval: true });
        return { success: true };
      },

      logout: () => {
        if (supabase) supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, pendingApproval: false });
        // Paylaşılan cihazda başka kullanıcının siparişleri sızmasın.
        try { useOrderStore.getState().reset(); } catch { /* ignore */ }
      },

      updateProfile: (data) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        }));
      },

      changePassword: async (newPassword) => {
        if (!supabase) return { success: false, error: i18n.t('common.error.supabaseNotConfigured') };
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },

      changePasswordWithCurrent: async (currentPassword, newPassword) => {
        if (!supabase) return { success: false, error: 'Supabase yapılandırılmamış' };
        const email = get().user?.email;
        if (!email) return { success: false, error: 'Oturum bulunamadı, lütfen yeniden giriş yapın.' };
        // 1) Mevcut şifreyi doğrula (Supabase updateUser mevcut şifreyi sormaz;
        //    bu yüzden yeniden giriş ile doğruluyoruz).
        const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (verifyErr) return { success: false, error: 'Mevcut şifreniz hatalı.' };
        // 2) Yeni şifreyi ayarla
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },

      // scope: 'others' → mevcut cihaz açık kalır, diğer tüm oturumlar kapanır.
      logoutOtherSessions: async () => {
        if (!supabase) return { success: false, error: 'Supabase yapılandırılmamış' };
        const { error } = await supabase.auth.signOut({ scope: 'others' });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },

      // Called on app load to check OAuth callback & existing session
      checkSession: async () => {
        if (!supabase) return;
        set({ isLoading: true });

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          // Geçerli oturum yok (süresi dolmuş / iptal edilmiş) → kaydedilmiş "girişli"
          // durumu temizle. Aksi halde panel girişli görünür ama DB sorguları RLS'e
          // takılıp boş döner ("hayalet admin"). Böylece login'e yönlendirilir.
          set({ isLoading: false, user: null, isAuthenticated: false });
          return;
        }

        const profile = await fetchProfile(session.user.id);
        const user = buildUser(session.user, profile);

        if (!user.approved) {
          await supabase.auth.signOut();
          set({ isLoading: false, pendingApproval: true, isAuthenticated: false, user: null });
          return;
        }

        set({ user, isAuthenticated: true, isLoading: false, pendingApproval: false });
      },
    }),
    {
      name: '2mc-gastro-auth',
      version: 2,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Supabase oturumu iptal edilirse (ör. şifre değişti / başka cihazdan "diğer
// oturumları kapat" / token süresi doldu) uygulama state'ini anında temizle.
// Aksi halde kaydedilmiş "admin" durumu kalır, panel açık görünür ama RLS
// sorguları boş döner ("hayalet admin"). Böylece login'e yönlendirilir.
if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      const st = useAuthStore.getState();
      if (st.isAuthenticated || st.user) {
        useAuthStore.setState({ user: null, isAuthenticated: false, pendingApproval: false });
      }
      // Oturum her kapandığında (token süresi doldu / başka cihazdan çıkış)
      // yerel sipariş listesini de temizle — kullanıcı yalnız kendi verisini görsün.
      try { useOrderStore.getState().reset(); } catch { /* ignore */ }
    }
  });
}
