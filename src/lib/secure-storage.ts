/**
 * secure-storage.ts — Encrypted localStorage wrapper
 * - Session timeout tracking
 * - Activity monitoring
 * - Secure cookie utilities
 * - Safe data storage for sensitive information
 */

// ============ Constants ============
const STORAGE_PREFIX = '2mc_secure_';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes for B2B
const LAST_ACTIVITY_KEY = `${STORAGE_PREFIX}last_activity`;
const SESSION_CREATED_KEY = `${STORAGE_PREFIX}session_created`;

// ============ Session Management ============

export class SessionManager {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly timeoutMs: number;
  private onTimeoutCallback: (() => void) | null = null;

  constructor(timeoutMs = SESSION_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
    this.initializeSession();
    this.trackActivity();
  }

  private initializeSession(): void {
    const now = Date.now();

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SESSION_CREATED_KEY, now.toString());
      this.updateLastActivity();
    }
  }

  private updateLastActivity(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }

  private trackActivity(): void {
    if (typeof window === 'undefined') return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, () => this.updateLastActivity(), { passive: true });
    });
  }

  isSessionValid(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const lastActivityTime = parseInt(lastActivity, 10);
    const now = Date.now();

    return now - lastActivityTime < this.timeoutMs;
  }

  getSessionRemainingTime(): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return 0;

    const lastActivityTime = parseInt(lastActivity, 10);
    const now = Date.now();
    const remaining = this.timeoutMs - (now - lastActivityTime);

    return Math.max(0, remaining);
  }

  onSessionTimeout(callback: () => void): void {
    this.onTimeoutCallback = callback;
  }

  resetSession(): void {
    this.initializeSession();
  }

  clearSession(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    localStorage.removeItem(SESSION_CREATED_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);

    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}

// ============ Encrypted Storage (Client-side obfuscation, not true encryption) ============
// NOTE: This provides obfuscation, not cryptographic security.
// For sensitive data, use server-side encryption or HttpOnly cookies.

function simpleEncrypt(text: string): string {
  // Simple base64 encoding + character shift (NOT cryptographically secure)
  // For production, use libsodium.js or TweetNaCl.js
  if (typeof btoa === 'undefined') return text;

  try {
    const encoded = btoa(text);
    // Additional obfuscation layer
    return 'enc_' + encoded.split('').reverse().join('');
  } catch {
    return text;
  }
}

function simpleDecrypt(encrypted: string): string {
  if (!encrypted.startsWith('enc_')) return encrypted;

  try {
    const reversed = encrypted.slice(4).split('').reverse().join('');
    return atob(reversed);
  } catch {
    return encrypted;
  }
}

export class SecureStorage {
  static set(key: string, value: string, encrypt = false): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const prefixedKey = STORAGE_PREFIX + key;
    const finalValue = encrypt ? simpleEncrypt(value) : value;

    try {
      localStorage.setItem(prefixedKey, finalValue);
    } catch (e) {
      console.error('Storage quota exceeded or private mode', e);
    }
  }

  static get(key: string, encrypted = false): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    const prefixedKey = STORAGE_PREFIX + key;

    try {
      const value = localStorage.getItem(prefixedKey);
      return value ? (encrypted ? simpleDecrypt(value) : value) : null;
    } catch {
      return null;
    }
  }

  static remove(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const prefixedKey = STORAGE_PREFIX + key;
    localStorage.removeItem(prefixedKey);
  }

  static clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// ============ Secure Cookie Utilities ============

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export class CookieManager {
  static set(name: string, value: string, options: CookieOptions = {}): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const {
      maxAge,
      expires,
      path = '/',
      domain,
      secure = true,
      sameSite = 'Lax',
    } = options;

    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (maxAge) {
      cookieString += `; Max-Age=${maxAge}`;
    } else if (expires) {
      cookieString += `; Expires=${expires.toUTCString()}`;
    }

    cookieString += `; Path=${path}`;

    if (domain) {
      cookieString += `; Domain=${domain}`;
    }

    if (secure) {
      cookieString += '; Secure';
    }

    if (sameSite) {
      cookieString += `; SameSite=${sameSite}`;
    }

    document.cookie = cookieString;
  }

  static get(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = encodeURIComponent(name) + '=';
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
      let c = cookie.trim();
      if (c.startsWith(nameEQ)) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }

    return null;
  }

  static remove(name: string, path = '/'): void {
    if (typeof document === 'undefined') return;

    document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${path}`;
  }

  static getAll(): Record<string, string> {
    if (typeof document === 'undefined') return {};

    const cookies: Record<string, string> = {};
    const cookiePairs = document.cookie.split(';');

    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split('=');
      if (name && value) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value);
      }
    }

    return cookies;
  }
}

// ============ Activity Tracking ============

export class ActivityTracker {
  private static events: Array<{ timestamp: number; event: string; data?: unknown }> = [];
  private static readonly MAX_EVENTS = 100;

  static track(event: string, data?: unknown): void {
    const entry = {
      timestamp: Date.now(),
      event,
      data,
    };

    this.events.push(entry);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
  }

  static getEvents(event?: string): Array<{ timestamp: number; event: string; data?: unknown }> {
    if (!event) return this.events;
    return this.events.filter(e => e.event === event);
  }

  static clear(): void {
    this.events = [];
  }

  static getLastActivity(event: string): number | null {
    const last = this.events
      .filter(e => e.event === event)
      .slice(-1)[0];

    return last ? last.timestamp : null;
  }

  static timeSinceLastActivity(event: string): number {
    const lastTime = this.getLastActivity(event);
    if (!lastTime) return -1;
    return Date.now() - lastTime;
  }
}

// ============ Export singleton instances ============

export const sessionManager = typeof window !== 'undefined' ? new SessionManager() : null;
export const activityTracker = new ActivityTracker();
