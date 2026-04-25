import { describe, it, expect, beforeEach } from 'vitest';
import { useCatalogStore } from '../catalogStore';

describe('catalogStore', () => {
  beforeEach(() => {
    useCatalogStore.setState({
      filters: {
        search: '',
        series: [],
        category: '',
        powerType: 'all',
        kwMin: 0,
        kwMax: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      },
      currentPage: 1,
      selectedEquipment: null,
      planItems: [],
    });
  });

  describe('equipment catalog', () => {
    it('should have equipment in catalog', () => {
      const equipment = useCatalogStore.getState().equipment;
      expect(equipment.length).toBeGreaterThan(0);
    });
  });

  describe('setFilter', () => {
    it('should set search filter', () => {
      useCatalogStore.getState().setFilter('search', 'Fritteuse');
      expect(useCatalogStore.getState().filters.search).toBe('Fritteuse');
    });

    it('should set category filter', () => {
      useCatalogStore.getState().setFilter('category', 'fryer');
      expect(useCatalogStore.getState().filters.category).toBe('fryer');
    });
  });

  describe('getFilteredEquipment', () => {
    it('should return all equipment with no filters', () => {
      const filtered = useCatalogStore.getState().getFilteredEquipment();
      const all = useCatalogStore.getState().equipment;
      expect(filtered.length).toBe(all.length);
    });

    it('should filter by category', () => {
      useCatalogStore.getState().setFilter('category', 'fryer');
      const filtered = useCatalogStore.getState().getFilteredEquipment();
      expect(filtered.every(e => e.category === 'fryer')).toBe(true);
    });
  });

  describe('planItems management', () => {
    it('should add equipment to plan', () => {
      const firstId = useCatalogStore.getState().equipment[0].id;
      useCatalogStore.getState().addToPlan(firstId);
      expect(useCatalogStore.getState().planItems).toHaveLength(1);
    });

    it('should remove equipment from plan', () => {
      const firstId = useCatalogStore.getState().equipment[0].id;
      useCatalogStore.getState().addToPlan(firstId);
      useCatalogStore.getState().removeFromPlan(firstId);
      expect(useCatalogStore.getState().planItems).toHaveLength(0);
    });
  });
});
