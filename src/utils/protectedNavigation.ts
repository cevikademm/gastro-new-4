import { NavigateFunction } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Determines if a route requires authentication
 */
const PROTECTED_ROUTES = new Set([
  '/diamond',
  '/combisteel',
  '/design',
  '/compare',
  '/payment',
  '/projects',
  '/cart',
  '/profile',
  '/dashboard',
  '/admin',
  '/pending-approval',
]);

export function isProtectedRoute(path: string): boolean {
  // Extract the base path without query params
  const basePath = path.split('?')[0];
  return PROTECTED_ROUTES.has(basePath);
}

/**
 * Navigate to a route with auth protection
 * If the user is not authenticated and the route is protected,
 * redirect to login with a redirect param to return to the intended page
 */
export function navigateWithAuth(
  navigate: NavigateFunction,
  targetPath: string,
  isAuthenticated: boolean
): void {
  if (!isAuthenticated && isProtectedRoute(targetPath)) {
    // Redirect to login with the target path as a redirect param
    const loginUrl = `/login?redirect=${encodeURIComponent(targetPath)}`;
    navigate(loginUrl);
  } else {
    // Navigate directly
    navigate(targetPath);
  }
}

/**
 * Hook to get a protected navigation function
 */
export function useProtectedNavigate(navigate: NavigateFunction): (path: string) => void {
  const { isAuthenticated } = useAuthStore();

  return (targetPath: string) => {
    navigateWithAuth(navigate, targetPath, isAuthenticated);
  };
}
