/**
 * content-policy.ts — Content sanitization and policy enforcement
 * - Review/comment content sanitization
 * - Chat message sanitization
 * - URL detection in user content
 * - Length enforcement
 * - Spam detection patterns
 */

import { sanitizeHTML, sanitizeInput, containsSuspiciousPatterns } from './security';

// ============ Content Types ============

export interface SanitizedContent {
  original: string;
  sanitized: string;
  hasHTML: boolean;
  hasSuspiciousPatterns: boolean;
  urls: string[];
}

// ============ URL Detection ============

const URL_PATTERN = /(https?:\/\/[^\s<>"{}|\\^`\]]*[^\s<>"{}|\\^`\]\.,;:'!?\)])/g;

export function extractURLs(text: string): string[] {
  const matches = text.match(URL_PATTERN) || [];
  return matches.filter(url => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
}

// ============ Spam Detection ============

const SPAM_PATTERNS = [
  /viagra|cialis|casino|lottery|winner|click here|buy now/gi,
  /bit\.ly|tinyurl|short\.link|go\.to/gi,
  /\b(?:[a-z0-9]{40,})\b/i, // Long random strings
  /(?:admin|root|test|demo|backup|config|wp-admin|phpmyadmin)/gi,
];

export function isLikelySpam(text: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(text));
}

// ============ Chat Message Sanitization ============

export interface SanitizeChatOptions {
  maxLength?: number;
  allowHTML?: boolean;
  detectSpam?: boolean;
}

export function sanitizeChatMessage(
  message: string,
  options: SanitizeChatOptions = {}
): SanitizedContent {
  const {
    maxLength = 1000,
    allowHTML = false,
    detectSpam = true,
  } = options;

  const original = message;
  const hasSuspiciousPatterns = containsSuspiciousPatterns(message);
  const hasHTML = /<[^>]*>/g.test(message);

  // Extract URLs before sanitization
  const urls = extractURLs(message);

  // Sanitize based on options
  let sanitized = allowHTML
    ? sanitizeHTML(message).slice(0, maxLength)
    : sanitizeInput(message, { maxLength, stripTags: true });

  return {
    original,
    sanitized,
    hasHTML,
    hasSuspiciousPatterns,
    urls,
  };
}

// ============ Review/Comment Sanitization ============

export interface SanitizeReviewOptions {
  maxLength?: number;
  allowURLs?: boolean;
  detectSpam?: boolean;
  minLength?: number;
}

export function sanitizeReview(
  content: string,
  options: SanitizeReviewOptions = {}
): SanitizedContent {
  const {
    maxLength = 2000,
    minLength = 10,
    allowURLs = true,
    detectSpam = true,
  } = options;

  const original = content.trim();

  if (original.length < minLength) {
    return {
      original,
      sanitized: '',
      hasHTML: false,
      hasSuspiciousPatterns: false,
      urls: [],
    };
  }

  const hasSuspiciousPatterns = containsSuspiciousPatterns(content);
  const hasHTML = /<[^>]*>/g.test(content);
  const urls = allowURLs ? extractURLs(content) : [];

  let sanitized = sanitizeHTML(content).slice(0, maxLength);

  // Remove suspicious patterns if detected
  if (detectSpam && isLikelySpam(sanitized)) {
    return {
      original,
      sanitized: '[REJECTED: Possible spam content]',
      hasHTML,
      hasSuspiciousPatterns: true,
      urls,
    };
  }

  return {
    original,
    sanitized,
    hasHTML,
    hasSuspiciousPatterns,
    urls,
  };
}

// ============ User Generated Content Policy ============

export interface ContentPolicy {
  maxLength: number;
  minLength?: number;
  allowHTML: boolean;
  allowURLs: boolean;
  detectSpam: boolean;
  blockedKeywords?: string[];
}

const DEFAULT_POLICIES: Record<string, ContentPolicy> = {
  chat: {
    maxLength: 1000,
    minLength: 1,
    allowHTML: false,
    allowURLs: false,
    detectSpam: true,
  },
  review: {
    maxLength: 2000,
    minLength: 10,
    allowHTML: false,
    allowURLs: true,
    detectSpam: true,
  },
  comment: {
    maxLength: 500,
    minLength: 1,
    allowHTML: false,
    allowURLs: false,
    detectSpam: true,
  },
  bio: {
    maxLength: 160,
    minLength: 0,
    allowHTML: false,
    allowURLs: false,
    detectSpam: false,
  },
};

export function getSanitizedContent(
  type: keyof typeof DEFAULT_POLICIES,
  content: string
): SanitizedContent {
  const policy = DEFAULT_POLICIES[type];

  if (!policy) {
    throw new Error(`Unknown content type: ${type}`);
  }

  const sanitized = sanitizeInput(content, {
    maxLength: policy.maxLength,
    stripTags: !policy.allowHTML,
  });

  const urls = policy.allowURLs ? extractURLs(sanitized) : [];
  const isSpam = policy.detectSpam && isLikelySpam(sanitized);

  return {
    original: content,
    sanitized: isSpam ? '' : sanitized,
    hasHTML: /<[^>]*>/g.test(content),
    hasSuspiciousPatterns: isSpam,
    urls,
  };
}

// ============ Content Validation ============

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: SanitizedContent;
}

export function validateContent(
  type: keyof typeof DEFAULT_POLICIES,
  content: string
): ContentValidationResult {
  const policy = DEFAULT_POLICIES[type];
  const errors: string[] = [];

  if (!policy) {
    return { valid: false, errors: [`Unknown content type: ${type}`] };
  }

  if (policy.minLength && content.length < policy.minLength) {
    errors.push(`Content must be at least ${policy.minLength} characters`);
  }

  if (content.length > policy.maxLength) {
    errors.push(`Content exceeds ${policy.maxLength} character limit`);
  }

  if (containsSuspiciousPatterns(content)) {
    errors.push('Content contains suspicious patterns');
  }

  if (policy.detectSpam && isLikelySpam(content)) {
    errors.push('Content appears to be spam');
  }

  if (!policy.allowHTML && /<[^>]*>/g.test(content)) {
    errors.push('HTML tags are not allowed');
  }

  const sanitized = getSanitizedContent(type, content);

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

// ============ Export policy registry ============

export { DEFAULT_POLICIES };
