import { describe, it, expect, beforeEach } from 'vitest';
import { useCompareStore, CompareItem } from '../compareStore';

describe('compareStore', () => {
  beforeEach(() => {
    useCompareStore.setState({ items: [], showPanel: false });
  });

  const mockItem1: CompareItem = {
    id: 'diamond-1',
    sku: 'DIA-001',
    name: 'Professional Fryer',
    brand: 'Diamond',
    image: 'fryer1.jpg',
    price: 4500,
    promoPrice: 4200,
    stock: 'In Stock',
    width_mm: 800,
    height_mm: 700,
    depth_mm: 900,
    length_mm: null,
    weight: 120,
    kw: 18,
    connection: '3 x 380V',
    category: 'fryer',
    source: 'diamond',
  };

  describe('addItem', () => {
    it('should add item to compare list', () => {
      useCompareStore.getState().addItem(mockItem1);
      expect(useCompareStore.getState().items).toHaveLength(1);
    });

    it('should not add duplicate items', () => {
      useCompareStore.getState().addItem(mockItem1);
      useCompareStore.getState().addItem(mockItem1);
      expect(useCompareStore.getState().items).toHaveLength(1);
    });

    it('should enforce maximum 6 items', () => {
      for (let i = 0; i < 10; i++) {
        useCompareStore.getState().addItem({ ...mockItem1, id: `item-${i}`, sku: `SKU-${i}` });
      }
      expect(useCompareStore.getState().items.length).toBeLessThanOrEqual(6);
    });
  });

  describe('removeItem', () => {
    it('should remove item from compare list', () => {
      useCompareStore.getState().addItem(mockItem1);
      useCompareStore.getState().removeItem('diamond-1');
      expect(useCompareStore.getState().items).toHaveLength(0);
    });
  });

  describe('isComparing', () => {
    it('should return true for item in compare list', () => {
      useCompareStore.getState().addItem(mockItem1);
      expect(useCompareStore.getState().isComparing('diamond-1')).toBe(true);
    });

    it('should return false for item not in compare list', () => {
      expect(useCompareStore.getState().isComparing('diamond-1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all items and hide panel', () => {
      useCompareStore.getState().addItem(mockItem1);
      useCompareStore.getState().setShowPanel(true);
      useCompareStore.getState().clear();
      expect(useCompareStore.getState().items).toHaveLength(0);
      expect(useCompareStore.getState().showPanel).toBe(false);
    });
  });
});
