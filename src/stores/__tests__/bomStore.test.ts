import { describe, it, expect, beforeEach } from 'vitest';
import { useBOMStore, BOMItem } from '../bomStore';

describe('bomStore', () => {
  beforeEach(() => {
    useBOMStore.setState({
      items: useBOMStore.getState().items.slice(),
      searchQuery: '',
      projectId: 'VK-2024-08',
    });
  });

  const mockBOMItem: Omit<BOMItem, 'id'> = {
    quantity: 5,
    code: 'VLC-CAB-800-R',
    description: 'Alt Dolap 800mm Sağ Versiyon',
    status: 'inStock' as const,
    unitPrice: 550,
    category: 'furniture',
  };

  describe('addItem', () => {
    it('should add new BOM item', () => {
      const initialCount = useBOMStore.getState().items.length;
      useBOMStore.getState().addItem(mockBOMItem);
      expect(useBOMStore.getState().items.length).toBe(initialCount + 1);
    });
  });

  describe('removeItem', () => {
    it('should remove item from BOM', () => {
      useBOMStore.getState().addItem(mockBOMItem);
      const items = useBOMStore.getState().items;
      const itemId = items[items.length - 1].id;
      useBOMStore.getState().removeItem(itemId);
      expect(useBOMStore.getState().items.find(i => i.id === itemId)).toBeUndefined();
    });
  });

  describe('getTotalItems', () => {
    it('should sum all quantities', () => {
      useBOMStore.setState({ items: [] });
      useBOMStore.getState().addItem({ ...mockBOMItem, quantity: 5 });
      useBOMStore.getState().addItem({ ...mockBOMItem, quantity: 3, code: 'NEW-CODE' });
      expect(useBOMStore.getState().getTotalItems()).toBe(8);
    });
  });

  describe('getUniqueSKUs', () => {
    it('should count unique SKU codes', () => {
      useBOMStore.setState({ items: [] });
      useBOMStore.getState().addItem({ ...mockBOMItem, code: 'SKU-001' });
      useBOMStore.getState().addItem({ ...mockBOMItem, code: 'SKU-002' });
      expect(useBOMStore.getState().getUniqueSKUs()).toBe(2);
    });
  });
});
