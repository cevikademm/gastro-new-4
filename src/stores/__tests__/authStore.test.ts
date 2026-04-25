import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, User } from '../authStore';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      pendingApproval: false,
    });
    localStorage.clear();
  });

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
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

  describe('logout', () => {
    it('should clear user data and reset state', () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile data', () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      useAuthStore.getState().updateProfile({ company: 'Updated Company' });
      const updatedUser = useAuthStore.getState().user;
      expect(updatedUser?.company).toBe('Updated Company');
    });
  });
});
