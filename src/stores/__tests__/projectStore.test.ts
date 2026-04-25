import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore, ProductItem } from '../projectStore';

vi.mock('../../lib/gastroSync', () => ({
  debouncedSyncProjects: vi.fn(),
  syncProjectsNow: vi.fn(),
  loadProjects: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: { getState: vi.fn(() => ({ user: { id: 'user-123' } })) },
}));

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], selectedProject: null, activities: [] });
  });

  const mockProduct: ProductItem = {
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
  };

  const mockProjectData = {
    name: 'Test Kitchen',
    type: 'commercial' as const,
    area: '418',
    lead: 'Test Lead',
    status: 'drafting' as const,
    progress: 50,
    clientName: 'Test Client',
    startDate: '2024-01-01',
    deadline: '2024-12-31',
    notes: 'Test notes',
    roomWidthCm: 1000,
    roomHeightCm: 600,
  };

  describe('addProject', () => {
    it('should add a new project', () => {
      const id = useProjectStore.getState().addProject(mockProjectData);
      expect(id).toBeDefined();
      expect(useProjectStore.getState().projects).toHaveLength(1);
    });
  });

  describe('selectProject', () => {
    it('should select a project by id', () => {
      const id = useProjectStore.getState().addProject(mockProjectData);
      useProjectStore.getState().selectProject(id);
      expect(useProjectStore.getState().selectedProject?.id).toBe(id);
    });
  });

  describe('product management', () => {
    it('should add product to project', () => {
      const projectId = useProjectStore.getState().addProject(mockProjectData);
      useProjectStore.getState().addProductToProject(projectId, mockProduct);
      const project = useProjectStore.getState().projects.find(p => p.id === projectId);
      expect(project?.products).toHaveLength(1);
    });
  });
});
