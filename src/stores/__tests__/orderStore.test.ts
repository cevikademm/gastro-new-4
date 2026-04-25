import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOrderStore, OrderItem } from '../orderStore';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('orderStore', () => {
  beforeEach(() => {
    useOrderStore.setState({ orders: [], loading: false, error: null });
    localStorage.clear();
  });

  const mockOrderItems: OrderItem[] = [
    {
      product_id: '1',
      name: 'Doppelfritteuse V-70',
      quantity: 2,
      price: 4500,
      image: 'image1.jpg',
      category: 'fryer',
      brand: '2MC',
    },
  ];

  describe('createOrder', () => {
    it('should create an order with valid items', async () => {
      localStorage.setItem('2mc-gastro-auth', JSON.stringify({
        state: { user: { id: 'user-123', email: 'test@example.com', fullName: 'Test User', company: 'Test Company' } },
      }));

      const result = await useOrderStore.getState().createOrder(mockOrderItems, 9000, 2);
      expect(result).not.toBeNull();
      expect(result?.items).toHaveLength(1);
      expect(result?.total_price).toBe(9000);
    });

    it('should set error if user not logged in', async () => {
      localStorage.clear();
      const result = await useOrderStore.getState().createOrder(mockOrderItems, 9000, 2);
      expect(result).toBeNull();
    });
  });

  describe('getOrderById', () => {
    it('should return undefined for non-existent order', () => {
      const found = useOrderStore.getState().getOrderById('non-existent');
      expect(found).toBeUndefined();
    });
  });
});
