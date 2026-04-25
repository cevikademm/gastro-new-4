import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore, ProductItem } from '../../stores/projectStore';
import { useBOMStore } from '../../stores/bomStore';

vi.mock('../../lib/gastroSync', () => ({
  debouncedSyncProjects: vi.fn(),
  syncProjectsNow: vi.fn(),
  loadProjects: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: { getState: vi.fn(() => ({ user: { id: 'user-123' } })) },
}));

describe('project flow integration', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], selectedProject: null, activities: [] });
    useBOMStore.setState({ items: [], searchQuery: '' });
  });

  const mockProjectData = {
    name: 'Modern Restaurant Kitchen',
    type: 'commercial' as const,
    area: '450',
    lead: 'John Doe',
    status: 'drafting' as const,
    progress: 0,
    clientName: 'Fine Dining Restaurant AG',
    startDate: '2024-03-01',
    deadline: '2024-09-30',
    notes: 'High-end restaurant',
    roomWidthCm: 1200,
    roomHeightCm: 800,
  };

  const mockProducts: ProductItem[] = [
    {
      id: 'p1',
      name: 'Konveksiyonlu Fırın Pro',
      code: 'VF-OVN-601-EL',
      category: 'cooking',
      icon: 'microwave',
      dimensions: { width: 85, height: 78, depth: 105 },
      kw: 12,
      powerType: 'electric',
      price: 7800,
      description: '10 Tepsi Kapasiteli',
      brand: '2MC',
      series: '60er',
      features: ['Buhar enjeksiyonu'],
    },
  ];

  describe('complete project workflow', () => {
    it('should execute full project: create → add equipment → generate BOM', () => {
      // Step 1: Create project
      const projectId = useProjectStore.getState().addProject(mockProjectData);
      expect(projectId).toBeDefined();
      expect(useProjectStore.getState().projects).toHaveLength(1);

      // Step 2: Select project
      useProjectStore.getState().selectProject(projectId);
      expect(useProjectStore.getState().selectedProject?.id).toBe(projectId);

      // Step 3: Add equipment
      useProjectStore.getState().addProductToProject(projectId, mockProducts[0]);
      const project = useProjectStore.getState().projects.find(p => p.id === projectId)!;
      expect(project.products).toHaveLength(1);

      // Step 4: Generate BOM
      const bomItems = project.products.map(p => ({
        quantity: 1,
        code: p.code,
        description: p.name,
        status: 'inStock' as const,
        unitPrice: p.price,
        category: p.category,
      }));

      bomItems.forEach(item => useBOMStore.getState().addItem(item));
      expect(useBOMStore.getState().getTotalItems()).toBe(1);
    });
  });
});
