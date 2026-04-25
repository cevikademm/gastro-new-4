/**
 * csrf.ts — CSRF token generation and validation
 * Implements double-submit cookie pattern
 */

import { generateSecureToken } from './security';
import { CookieManager } from './secure-storage';

const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_LOCAL_STORAGE_KEY = 'csrf_token';

// ============ CSRF Token Manager ============

export class CSRFTokenManager {
  static generateToken(): string {
    return generateSecureToken(32);
  }

  static setToken(token?: string): string {
    const finalToken = token || this.generateToken();

    // Store in memory/localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CSRF_LOCAL_STORAGE_KEY, finalToken);
    }

    // Store in secure HttpOnly cookie (server should set this)
    // Client-side: set in localStorage, server should set HttpOnly cookie
    CookieManager.set(CSRF_COOKIE_NAME, finalToken, {
      path: '/',
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return finalToken;
  }

  static getToken(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return localStorage.getItem(CSRF_LOCAL_STORAGE_KEY);
  }

  static validateToken(token: string): boolean {
    const storedToken = this.getToken();
    if (!storedToken || !token) return false;

    // Constant-time comparison to prevent timing attacks
    return this.timingSafeEqual(storedToken, token);
  }

  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  static clearToken(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CSRF_LOCAL_STORAGE_KEY);
    }
    CookieManager.remove(CSRF_COOKIE_NAME);
  }
}

// ============ CSRF Middleware for Fetch ============

export function createCSRFInterceptor() {
  return {
    request: (config: any) => {
      const token = CSRFTokenManager.getToken();
      if (token && config.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
        config.headers = config.headers || {};
        config.headers[CSRF_HEADER_NAME] = token;
      }
      return config;
    },
  };
}

// ============ Wrap Fetch with CSRF ============

export const secureFetch = async (url: string, options: RequestInit = {}) => {
  const token = CSRFTokenManager.getToken();

  const method = (options.method || 'GET').toUpperCase();

  // Add CSRF token to mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    options.headers = {
      ...options.headers,
      [CSRF_HEADER_NAME]: token || '',
    };
  }

  const response = await fetch(url, options);

  // If CSRF token is invalid (401/403), refresh it
  if (response.status === 403) {
    const newToken = CSRFTokenManager.generateToken();
    CSRFTokenManager.setToken(newToken);
  }

  return response;
};

// ============ Initialize CSRF on app start ============

export function initializeCSRF(): void {
  if (typeof window === 'undefined') return;

  // Generate and store CSRF token if not present
  if (!CSRFTokenManager.getToken()) {
    CSRFTokenManager.setToken();
  }
}
