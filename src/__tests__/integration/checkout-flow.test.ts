import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore, User } from '../../stores/authStore';
import type { EquipmentItem } from '../../stores/equipmentStore';

vi.mock('../../lib/gastroSync', () => ({
  debouncedSyncCart: vi.fn(),
  loadCart: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('checkout flow integration', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    useOrderStore.setState({ orders: [], loading: false, error: null });
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, pendingApproval: false });
    localStorage.clear();
  });

  const mockUser: User = {
    id: 'user-123',
    email: 'customer@example.com',
    fullName: 'Test Customer',
    company: 'Test Company',
    role: 'User',
    language: 'en',
    region: 'EU',
    currency: 'EUR',
    dateFormat: 'DD.MM.YYYY',
    approved: true,
    subscription: 'free',
    notifications: { email: true, push: true, projectUpdates: true, bomChanges: true },
  };

  const mockProducts: EquipmentItem[] = [
    {
      id: '1',
      name: 'Doppelfritteuse V-70',
      desc: '2 x 15L Kapasite',
      cat: 'fryer',
      sub: 'fryer-70',
      fam: 'Doppelfritteuse',
      img: '/products/fryer-70.jpg',
      brand: '2MC',
      l: 800,
      w: 700,
      h: '900',
      kw: 18,
      price: 4500,
      line: '70er',
    },
  ];

  describe('complete checkout flow', () => {
    it('should execute full checkout: add items → authenticate → create order', async () => {
      // Step 1: Add items to cart
      useCartStore.getState().addItem(mockProducts[0], 2);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().getTotalItems()).toBe(2);
      expect(useCartStore.getState().getTotalPrice()).toBe(9000);

      // Step 2: Authenticate user
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Step 3: Store user in localStorage for order creation
      localStorage.setItem('2mc-gastro-auth', JSON.stringify({ state: { user: mockUser } }));

      // Step 4: Create order
      const totalPrice = useCartStore.getState().getTotalPrice();
      const totalItems = useCartStore.getState().getTotalItems();

      const order = await useOrderStore.getState().createOrder(
        [{
          product_id: '1',
          name: 'Doppelfritteuse V-70',
          quantity: 2,
          price: 4500,
          image: 'img',
          category: 'fryer',
        }],
        totalPrice,
        totalItems
      );

      expect(order).not.toBeNull();
      expect(order?.total_price).toBe(9000);
      expect(order?.total_items).toBe(2);
    });

    it('should prevent checkout without authentication', async () => {
      useCartStore.getState().addItem(mockProducts[0]);
      localStorage.clear();

      const order = await useOrderStore.getState().createOrder(
        [{ product_id: '1', name: 'Fryer', quantity: 1, price: 4500, image: 'img', category: 'fryer' }],
        4500,
        1
      );

      expect(order).toBeNull();
    });
  });
});
