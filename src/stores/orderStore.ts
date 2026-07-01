import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { sendOrderWhatsapp } from '../lib/orderWhatsapp';

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  category: string;
  brand?: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total_price: number;
  total_items: number;
  notes: string;
  shipping_address: string;
  created_at: string;
  updated_at: string;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  createOrder: (items: OrderItem[], totalPrice: number, totalItems: number, notes?: string) => Promise<Order | null>;
  deleteOrder: (id: string) => Promise<boolean>;
  getOrderById: (id: string) => Order | undefined;
}

function getUserId(): string | null {
  try {
    const raw = localStorage.getItem('2mc-gastro-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.id || null;
  } catch { return null; }
}

function getUserInfo(): { fullName: string; company: string; email: string } {
  try {
    const raw = localStorage.getItem('2mc-gastro-auth');
    if (!raw) return { fullName: '', company: '', email: '' };
    const parsed = JSON.parse(raw);
    const user = parsed?.state?.user;
    return {
      fullName: user?.fullName || '',
      company: user?.company || '',
      email: user?.email || '',
    };
  } catch { return { fullName: '', company: '', email: '' }; }
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `ORD-${date}-${rand}`;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      loading: false,
      error: null,

      fetchOrders: async () => {
        const userId = getUserId();
        if (!supabase || !userId) return;
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('gastro_orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (data) set({ orders: data as Order[] });
        } catch (err: any) {
          console.warn('fetchOrders error (table may not exist yet):', err?.message);
        }
        set({ loading: false });
      },

      createOrder: async (items, totalPrice, totalItems, notes = '') => {
        const userId = getUserId();
        if (!userId) {
          set({ error: 'Sipariş vermek için giriş yapmalısınız.' });
          return null;
        }

        const now = new Date().toISOString();
        const orderBase = {
          user_id: userId,
          order_number: generateOrderNumber(),
          status: 'pending' as const,
          items,
          total_price: totalPrice,
          total_items: totalItems,
          notes,
          shipping_address: '',
          created_at: now,
          updated_at: now,
        };

        // Try Supabase first
        if (supabase) {
          try {
            const { data, error } = await supabase
              .from('gastro_orders')
              .insert(orderBase)
              .select()
              .single();

            if (!error && data) {
              // Log event
              try {
                await supabase.from('gastro_order_events').insert({
                  order_id: data.id,
                  event_type: 'created',
                  new_value: 'pending',
                });
              } catch { /* ignore */ }

              const order = data as Order;
              set((state) => ({ orders: [order, ...state.orders], error: null }));
              // Ekibe WhatsApp bildirimi (fire-and-forget) — siparişi ASLA bloke etmez.
              try { void sendOrderWhatsapp(order); } catch { /* bildirim hatası yutulur */ }
              return order;
            }
            console.warn('Supabase insert failed, falling back to local:', error?.message);
          } catch (err) {
            console.warn('Supabase insert error, falling back to local:', err);
          }
        }

        // Fallback: local-only order
        const localOrder: Order = {
          ...orderBase,
          id: crypto.randomUUID(),
        };
        set((state) => ({ orders: [localOrder, ...state.orders], error: null }));
        try { void sendOrderWhatsapp(localOrder); } catch { /* bildirim hatası yutulur */ }
        return localOrder;
      },

      deleteOrder: async (id) => {
        // Optimistik: önce yerel listeden çıkar (UI anında güncellensin).
        const prev = get().orders;
        set({ orders: prev.filter((o) => o.id !== id), error: null });

        const userId = getUserId();
        if (supabase && userId) {
          try {
            // Önce siparişe bağlı olayları sil (FK kısıtı varsa engel olmasın).
            try { await supabase.from('gastro_order_events').delete().eq('order_id', id); } catch { /* ignore */ }
            const { error } = await supabase
              .from('gastro_orders')
              .delete()
              .eq('id', id)
              .eq('user_id', userId); // yalnızca kendi siparişini silebilsin
            if (error) throw error;
          } catch (err: any) {
            // Supabase silme başarısızsa yerel değişikliği geri al ve hata bildir.
            console.warn('deleteOrder error:', err?.message);
            set({ orders: prev, error: 'Sipariş silinemedi. Lütfen tekrar deneyin.' });
            return false;
          }
        }
        return true;
      },

      getOrderById: (id) => get().orders.find((o) => o.id === id),
    }),
    {
      name: '2mc-orders',
      partialize: (state) => ({ orders: state.orders }),
    }
  )
);

// Export user info helper for OrdersPage
export { getUserInfo };
