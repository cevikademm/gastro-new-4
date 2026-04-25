/**
 * error-reporting.ts — Structured error logging and reporting
 * - Capture and structure errors
 * - Rate limiting (max 10 per minute)
 * - Placeholder for Sentry integration
 * - Local storage fallback
 */

// ============ Types ============

export interface StructuredError {
  id: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
}

export interface ErrorReport {
  errors: StructuredError[];
  totalCount: number;
  lastReportTime?: number;
}

// ============ Constants ============

const MAX_ERRORS_PER_MINUTE = 10;
const ERROR_STORAGE_KEY = 'error_reports';
const MAX_STORED_ERRORS = 50;

// ============ Error Logger ============

function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class ErrorLogger {
  private static errorQueue: StructuredError[] = [];
  private static errorCounts: Map<number, number> = new Map();
  private static reportCallback: ((error: StructuredError) => Promise<void>) | null = null;

  static configure(callback?: (error: StructuredError) => Promise<void>): void {
    this.reportCallback = callback || null;
  }

  static structureError(
    error: Error | string,
    level: 'error' | 'warning' | 'info' = 'error',
    context?: Record<string, unknown>
  ): StructuredError {
    const message = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'object' ? error.stack : undefined;

    return {
      id: generateErrorId(),
      timestamp: Date.now(),
      level,
      message,
      stackTrace,
      context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
  }

  private static isRateLimited(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old counts
    Array.from(this.errorCounts.entries()).forEach(([key, _]) => {
      if (key < oneMinuteAgo) {
        this.errorCounts.delete(key);
      }
    });

    // Count errors in last minute
    let count = 0;
    Array.from(this.errorCounts.entries()).forEach(([_, value]) => {
      count += value;
    });

    if (count >= MAX_ERRORS_PER_MINUTE) {
      return true;
    }

    // Increment count for this minute
    const minute = Math.floor(now / 60000) * 60000;
    this.errorCounts.set(minute, (this.errorCounts.get(minute) || 0) + 1);

    return false;
  }

  static async log(
    error: Error | string,
    level: 'error' | 'warning' | 'info' = 'error',
    context?: Record<string, unknown>
  ): Promise<void> {
    // Check rate limit
    if (this.isRateLimited()) {
      console.warn('Error reporting rate limited');
      return;
    }

    const structuredError = this.structureError(error, level, context);
    this.errorQueue.push(structuredError);

    // Store locally
    this.storeError(structuredError);

    // Call external callback (e.g., Sentry)
    if (this.reportCallback) {
      try {
        await this.reportCallback(structuredError);
      } catch (e) {
        console.error('Failed to report error:', e);
      }
    }

    // Console output for development
    if (level === 'error') {
      console.error(`[${structuredError.id}]`, error, context);
    } else if (level === 'warning') {
      console.warn(`[${structuredError.id}]`, error, context);
    } else {
      console.log(`[${structuredError.id}]`, error, context);
    }
  }

  private static storeError(error: StructuredError): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const stored = JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]') as StructuredError[];
      stored.push(error);

      // Keep only recent errors
      if (stored.length > MAX_STORED_ERRORS) {
        stored.splice(0, stored.length - MAX_STORED_ERRORS);
      }

      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
      console.error('Failed to store error:', e);
    }
  }

  static getStoredErrors(): StructuredError[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];

    try {
      return JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  static clearStoredErrors(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(ERROR_STORAGE_KEY);
  }

  static getRecentErrors(count = 10): StructuredError[] {
    return this.errorQueue.slice(-count);
  }
}

// ============ Global Error Handler ============

export function setupGlobalErrorHandler(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event: ErrorEvent) => {
    ErrorLogger.log(event.error || event.message, 'error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const message = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason);

    ErrorLogger.log(new Error(`Unhandled Promise Rejection: ${message}`), 'error', {
      reason: event.reason,
    });
  });
}

// ============ Sentry Integration Placeholder ============

export function initializeSentry(dsn?: string): void {
  if (!dsn) {
    console.warn('Sentry DSN not provided');
    return;
  }

  // Placeholder for Sentry SDK initialization
  // In production, install @sentry/react and initialize here
  console.log('Sentry initialized with DSN:', dsn);

  ErrorLogger.configure(async (error: StructuredError) => {
    // Send to Sentry
    // Example: Sentry.captureException(error);
    console.log('Reporting to Sentry:', error);
  });
}

// ============ Export singleton logger ============

export const errorLogger = ErrorLogger;
