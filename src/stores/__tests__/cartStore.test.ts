import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore, CartItem } from '../cartStore';
import type { EquipmentItem } from '../equipmentStore';

// Mock the gastroSync module
vi.mock('../../lib/gastroSync', () => ({
  debouncedSyncCart: vi.fn(),
  loadCart: vi.fn(() => Promise.resolve([])),
}));

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
    localStorage.clear();
  });

  const mockProduct: EquipmentItem = {
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
  };

  describe('addItem', () => {
    it('should add a new item to cart', () => {
      useCartStore.getState().addItem(mockProduct);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe('1');
      expect(items[0].quantity).toBe(1);
    });

    it('should add item with custom quantity', () => {
      useCartStore.getState().addItem(mockProduct, 5);
      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().removeItem('1');
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(0);
    });
  });

  describe('getTotalPrice', () => {
    it('should calculate total price', () => {
      useCartStore.getState().addItem(mockProduct, 2);
      const total = useCartStore.getState().getTotalPrice();
      expect(total).toBe(4500 * 2);
    });
  });

  describe('isInCart', () => {
    it('should return true for item in cart', () => {
      useCartStore.getState().addItem(mockProduct);
      const result = useCartStore.getState().isInCart('1');
      expect(result).toBe(true);
    });
  });
});
