/**
 * security.ts — Comprehensive security utilities for 2MC Gastro
 * - Input sanitization (HTML/text)
 * - Validation helpers (email, phone, postal codes)
 * - File upload validation
 * - Rate limiting
 * - URL validation for safe redirects
 * - Secure token generation
 */

// ============ HTML Sanitization ============
// Lightweight HTML sanitizer using regex (no DOM purify dependency)
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove iframe, embed, object tags
    .replace(/<(iframe|embed|object|frame|frameset|link|meta|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Allow only safe tags: p, br, strong, em, u, a (with href validation), ul, ol, li
    .replace(/<(?!(?:\/?(p|br|strong|em|u|a|ul|ol|li|blockquote|h[1-6])(?:\s|>|$))[^>]*>)/gi, '&lt;');

  // Clean up href attributes to prevent XSS
  sanitized = sanitized.replace(/<a\s+href=["']?javascript:/gi, '<a href="javascript:void(0)');

  return sanitized;
}

// ============ Text Input Sanitization ============
export function sanitizeInput(
  input: string,
  options: { maxLength?: number; stripTags?: boolean } = {}
): string {
  const { maxLength = 1000, stripTags = true } = options;

  if (typeof input !== 'string') return '';

  let sanitized = input
    .trim()
    .slice(0, maxLength);

  if (stripTags) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

// ============ Email Validation ============
// RFC 5322 simplified pattern
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const normalized = email.toLowerCase().trim();

  if (normalized.length > 254) return false; // RFC 5321
  if (!EMAIL_PATTERN.test(normalized)) return false;

  return true;
}

// ============ Phone Validation (European formats) ============
// Supports E.164, international, and regional formats
export function validatePhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;

  const cleaned = phone.replace(/\D/g, '');

  // Must be 10-15 digits (E.164 standard)
  if (cleaned.length < 10 || cleaned.length > 15) return false;

  // If starts with 0 (regional), convert to country code
  // Germany: +49, France: +33, Spain: +34, Italy: +39, Turkey: +90, etc.
  if (!cleaned.match(/^(\+)?[1-9]\d{1,14}$/)) return false;

  return true;
}

// ============ Postal Code Validation (European formats) ============
export function validatePostalCode(postalCode: string, countryCode?: string): boolean {
  if (typeof postalCode !== 'string') return false;

  const code = postalCode.trim().toUpperCase();

  // Country-specific patterns
  const patterns: Record<string, RegExp> = {
    'DE': /^\d{5}$/,                    // Germany: 5 digits
    'FR': /^(?:\d{5})?$/,               // France: 5 digits
    'ES': /^\d{5}$/,                    // Spain: 5 digits
    'IT': /^\d{5}$/,                    // Italy: 5 digits
    'AT': /^\d{4}$/,                    // Austria: 4 digits
    'BE': /^\d{4}$/,                    // Belgium: 4 digits
    'NL': /^\d{4}\s?[A-Z]{2}$/,         // Netherlands: 4 digits + 2 letters
    'CH': /^\d{4}$/,                    // Switzerland: 4 digits
    'GB': /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, // UK postcodes
    'TR': /^\d{5}$/,                    // Turkey: 5 digits
    'PL': /^\d{2}-\d{3}$/,              // Poland: XX-XXX
  };

  if (countryCode && patterns[countryCode]) {
    return patterns[countryCode].test(code);
  }

  // Generic fallback: 3-10 alphanumeric chars with optional space/dash
  return /^[A-Z0-9\s\-]{3,10}$/i.test(code);
}

// ============ VAT ID Validation (European) ============
export function validateVATID(vatId: string): boolean {
  if (typeof vatId !== 'string') return false;

  const code = vatId.trim().toUpperCase();

  // Basic format: 2-letter country code + 2-12 alphanumeric chars
  const pattern = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

  return pattern.test(code);
}

// ============ File Upload Validation ============
export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimes?: string[];
  allowedExtensions?: string[];
}

const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB for B2B app
  allowedMimes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'],
};

export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const opts = { ...DEFAULT_FILE_OPTIONS, ...options };

  // Check size
  if (file.size > (opts.maxSizeBytes || DEFAULT_FILE_OPTIONS.maxSizeBytes!)) {
    return {
      valid: false,
      error: `File size exceeds ${(opts.maxSizeBytes! / 1024 / 1024).toFixed(1)}MB limit`,
    };
  }

  // Check MIME type
  if (opts.allowedMimes && !opts.allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed`,
    };
  }

  // Check extension
  if (opts.allowedExtensions) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!opts.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension .${ext} not allowed`,
      };
    }
  }

  return { valid: true };
}

// ============ Rate Limiter ============
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Create new window
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.maxAttempts - 1, resetIn: this.windowMs };
    }

    entry.count++;
    const allowed = entry.count <= this.maxAttempts;
    const remaining = Math.max(0, this.maxAttempts - entry.count);
    const resetIn = entry.resetTime - now;

    return { allowed, remaining, resetIn };
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// ============ URL Validation (Safe Redirects) ============
export function validateRedirectURL(url: string, allowedOrigins: string[] = []): boolean {
  if (!url || typeof url !== 'string') return false;

  // Prevent protocol-relative URLs (//evil.com)
  if (url.startsWith('//')) return false;

  // Only allow relative URLs or URLs from allowed origins
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);

      // Check against allowed origins
      if (!allowedOrigins.includes(parsed.origin)) {
        return false;
      }
    } catch {
      return false;
    }
  } else if (!url.startsWith('/')) {
    // Relative URL must start with /
    return false;
  }

  // Block javascript: and data: protocols
  if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
    return false;
  }

  return true;
}

// ============ Secure Token Generation ============
export function generateSecureToken(length = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint8Array(length);

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(values);
  } else {
    // Fallback for non-browser environments
    for (let i = 0; i < length; i++) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }

  let token = '';
  for (let i = 0; i < length; i++) {
    token += charset[values[i] % charset.length];
  }

  return token;
}

// ============ XSS Detection ============
export function containsSuspiciousPatterns(input: string): boolean {
  if (typeof input !== 'string') return false;

  const suspiciousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\(/gi,
    /expression\(/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}
