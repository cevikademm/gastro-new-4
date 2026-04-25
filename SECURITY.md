# 2MC Gastro — Security Implementation Guide

## Overview

This document outlines comprehensive cybersecurity measures implemented for the 2MC Gastro B2B commercial kitchen platform. The implementation covers authentication, payment security, data validation, XSS prevention, CSRF protection, rate limiting, session management, and error handling.

---

## 1. Security Libraries

### 1.1 `src/lib/security.ts`
Foundational security utilities for input handling and validation.

**Features:**
- **HTML Sanitization** (`sanitizeHTML`): Lightweight regex-based HTML sanitizer that removes script tags, event handlers, and dangerous elements
- **Text Sanitization** (`sanitizeInput`): Strips HTML/tags, trims, and enforces length limits
- **Email Validation** (`validateEmail`): RFC 5322 simplified pattern matching
- **Phone Validation** (`validatePhone`): Supports E.164 and regional European formats (10-15 digits)
- **Postal Code Validation** (`validatePostalCode`): Country-specific patterns for EU (Germany, France, Spain, Italy, etc.)
- **VAT ID Validation** (`validateVATID`): European VAT ID format validation
- **File Upload Validation** (`validateFile`):
  - Max size: 10MB (B2B default)
  - Allowed MIME types: PDF, Office docs, images (JPEG, PNG, WebP)
  - Extension whitelist enforcement
- **Rate Limiter** (class): Configurable rate limiting (default: 5 attempts per 15 minutes)
- **URL Validation** (`validateRedirectURL`): Prevents open redirect attacks
- **Secure Token Generation** (`generateSecureToken`): Cryptographically secure token generation
- **XSS Detection** (`containsSuspiciousPatterns`): Detects common XSS payload patterns

**Usage:**
```typescript
import { sanitizeInput, validateEmail, RateLimiter } from '@/lib/security';

const limiter = new RateLimiter(5, 900000); // 5 attempts per 15 min
const result = limiter.check('user-identifier');
if (!result.allowed) {
  console.error(`Rate limited. Retry in ${result.resetIn}ms`);
}
```

---

### 1.2 `src/lib/validation.ts`
Zod-inspired validation schemas without external dependencies.

**Schemas:**
- `validateLogin`: Email + password validation
- `validateRegister`: Full registration data with B2B fields (company, VAT ID, sector)
- `validateCheckout`: B2B checkout form validation (address, billing, contact)
- `validateLeadCapture`: Lead form with name, email, company, phone
- `validateContactForm`: Generic contact form
- `validateProductReview`: Review rating (1-5), title, content
- `validateProject`: Project creation with kitchen type metadata

**Features:**
- Field-level error reporting
- Max length enforcement
- Format validation (email, phone, postal)
- Password strength requirements (8+ chars, uppercase, number)
- Returns structured validation errors

**Usage:**
```typescript
import { validateLogin } from '@/lib/validation';

const result = validateLogin({ email, password });
if (!result.success) {
  result.errors?.forEach(err => {
    console.error(`${err.field}: ${err.message}`);
  });
}
```

---

### 1.3 `src/lib/secure-storage.ts`
Client-side session and data management with timeouts.

**Components:**

**SessionManager Class:**
- Tracks session creation and last activity
- Configurable session timeout (default: 30 minutes for B2B)
- Automatic activity detection on user interaction
- Remaining session time calculation
- Session validation checks

**SecureStorage Class:**
- Encrypted localStorage wrapper (client-side obfuscation, not cryptographic)
- Key prefixing to namespace storage
- Safe get/set/remove/clear operations
- NOTE: For true encryption, use libsodium.js or TweetNaCl.js

**CookieManager Class:**
- Secure cookie utilities with SameSite enforcement
- HttpOnly, Secure, and SameSite=Lax defaults
- Cookie get/set/remove/getAll methods
- Timing-safe comparison for CSRF tokens

**ActivityTracker Class:**
- Event logging with timestamps
- Max 100 events in memory
- Query by event type
- Time-since-last-activity calculations

**Usage:**
```typescript
import { sessionManager, SecureStorage, CookieManager } from '@/lib/secure-storage';

// Check session validity
if (sessionManager && !sessionManager.isSessionValid()) {
  logout();
}

// Store encrypted data
SecureStorage.set('sensitive_key', value, encrypt=true);
const data = SecureStorage.get('sensitive_key', encrypted=true);

// Set secure cookie
CookieManager.set('token', value, {
  secure: true,
  httpOnly: true, // Note: can't set from JS
  sameSite: 'Lax'
});
```

---

### 1.4 `src/lib/csrf.ts`
CSRF token generation and validation using double-submit cookie pattern.

**Components:**

**CSRFTokenManager Class:**
- Generates secure 32-character tokens
- Stores in localStorage and cookies
- Timing-safe token comparison (prevents timing attacks)
- Token refresh on validation failures

**secureFetch Function:**
- Wrapper around fetch() that auto-injects CSRF headers
- Only adds token for mutating requests (POST, PUT, DELETE, PATCH)
- Handles token refresh on 403 responses

**initializeCSRF Function:**
- Initializes CSRF token on app startup
- Should be called in main component or layout

**Usage:**
```typescript
import { CSRFTokenManager, initializeCSRF, secureFetch } from '@/lib/csrf';

// On app load
initializeCSRF();

// Use wrapped fetch
const response = await secureFetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

---

### 1.5 `src/lib/content-policy.ts`
User-generated content sanitization and spam detection.

**Features:**
- URL extraction and validation from user content
- Spam pattern detection (viagra, casino, bit.ly, etc.)
- Content type policies with different rules for chat, reviews, comments, bios
- HTML tag detection
- Suspicious pattern identification

**Content Types:**
- `chat`: Max 1000 chars, no HTML, no URLs, spam detection
- `review`: Max 2000 chars, min 10 chars, no HTML, URLs allowed, spam detection
- `comment`: Max 500 chars, no HTML, no URLs, spam detection
- `bio`: Max 160 chars, no HTML, no URLs, no spam detection

**Policies:**
- Max length enforcement
- Min length validation
- XSS pattern blocking
- Spam keyword detection
- URL extraction for moderation

**Usage:**
```typescript
import { validateContent, getSanitizedContent } from '@/lib/content-policy';

const result = validateContent('review', userContent);
if (result.valid) {
  const sanitized = result.sanitized;
  console.log('Sanitized:', sanitized.sanitized);
  console.log('URLs:', sanitized.urls);
}
```

---

### 1.6 `src/lib/error-reporting.ts`
Structured error logging with rate limiting and Sentry integration.

**Features:**
- Structured error capture with metadata
- Rate limiting (max 10 errors per minute)
- Local storage of last 50 errors
- Browser user agent and URL capture
- Unhandled error and promise rejection handlers
- Sentry SDK integration (placeholder)

**ErrorLogger Class:**
- `log()`: Async error logging with rate limiting
- `structureError()`: Format errors with context
- `getStoredErrors()`: Retrieve cached errors
- `getRecentErrors(count)`: Get last N errors
- `clearStoredErrors()`: Clear cache

**Usage:**
```typescript
import { errorLogger, setupGlobalErrorHandler, initializeSentry } from '@/lib/error-reporting';

// Setup on app load
setupGlobalErrorHandler();
initializeSentry(import.meta.env.VITE_SENTRY_DSN);

// Log errors
await errorLogger.log(
  new Error('Payment failed'),
  'error',
  { amount: 100, reason: 'card_declined' }
);
```

---

## 2. Security Headers

### 2.1 Development (vite.config.ts)
Development server includes security headers:
- **Content-Security-Policy**: Restricts resource loading, allows inline scripts for dev
- **X-Frame-Options**: DENY (prevent clickjacking)
- **X-Content-Type-Options**: nosniff (disable MIME sniffing)
- **X-XSS-Protection**: Enable browser XSS filter
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Deny geolocation, microphone, camera, USB

### 2.2 Production (vercel.json)
Production security headers:
- **CSP**: More restrictive inline script handling
- **HSTS**: max-age=31536000 (1 year, with preload)
- **Cross-Origin-Embedder-Policy**: require-corp
- **Cross-Origin-Resource-Policy**: cross-origin

### 2.3 Netlify Headers (public/_headers)
Netlify-specific header configuration:
- API endpoint caching: no-cache, must-revalidate
- Static assets: 1-year immutable cache
- All security headers from vercel.json

---

## 3. Component Integration

### 3.1 LoginPage.tsx
**Security features:**
- Rate limiting: 5 attempts per 15 minutes
- Input validation via `validateLogin` schema
- Email format validation
- Safe redirect URL validation (prevents open redirects)
- CSRF token initialization
- Secure handling of redirect parameters

**Code:**
```typescript
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000);

const handleSubmit = async (e: React.FormEvent) => {
  const rateLimit = loginLimiter.check(email);
  if (!rateLimit.allowed) {
    setError(`Rate limited for ${rateLimit.resetIn / 1000}s`);
    return;
  }

  const validation = validateLogin({ email, password });
  if (!validation.success) {
    // Handle errors
  }

  const result = await login(email, password);
  const safeRedirect = validateRedirectURL(redirectUrl)
    ? redirectUrl
    : '/dashboard';
  navigate(safeRedirect);
};
```

### 3.2 RegisterPage.tsx
**Security features:**
- Input sanitization on change
- Comprehensive validation schema
- VAT ID validation for B2B
- Password strength requirements (8+ chars, uppercase, number)
- Field-level error reporting
- CSRF token initialization

### 3.3 CheckoutPage.tsx
**Security features:**
- B2B form validation (billing address, company, VAT)
- Phone and postal code format validation
- Email validation
- Field error reporting
- CSRF token initialization
- Safe form submission workflow

### 3.4 LeadCaptureModal.tsx
**Security features:**
- Email input sanitization
- Email format validation
- Rate limiting: 3 submissions per minute
- Lead data validation schema
- CSRF token initialization
- Error handling with user-friendly messages

### 3.5 AdminGuard.tsx
**Security features:**
- Session validity checking
- Automatic logout on session timeout (30 minutes)
- Role-based access control (admin-only)
- Session timeout monitoring (checks every minute)

---

## 4. Environment Configuration

### .env.example
Comprehensive environment variable template:

**Client-side (VITE_ prefix):**
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_STRIPE_PUBLIC_KEY`: Stripe public key
- `VITE_POSTHOG_KEY`: Analytics key
- `VITE_GA_MEASUREMENT_ID`: Google Analytics ID
- `VITE_CLARITY_PROJECT_ID`: Microsoft Clarity ID
- `VITE_MEILI_*`: Meilisearch search keys

**Server-side (no VITE_ prefix):**
- `STRIPE_SECRET_KEY`: Stripe secret (for Supabase edge functions)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing
- `RESEND_API_KEY`: Email service
- `MEILI_ADMIN_KEY`: Meilisearch admin (sync only)
- `ANTHROPIC_API_KEY`: Claude AI
- `SENTRY_DSN`: Error tracking

**Configuration:**
- `SESSION_TIMEOUT_MS`: 30 minutes for B2B
- `NODE_ENV`: development/production
- `APP_URL`: Application origin for redirects

---

## 5. Security Best Practices

### 5.1 Input Validation
1. **Always validate** user input at component level
2. **Sanitize** before storing or rendering
3. **Use schemas** for structured data (checkout, registration)
4. **Validate redirects** to prevent open redirect attacks

### 5.2 Sensitive Data
1. **Never store** passwords, credit cards, or API keys client-side
2. **Use** secure HttpOnly cookies for session tokens (server sets these)
3. **Encrypt** localStorage data if storing sensitive info
4. **Exclude** sensitive data from logs and error reports

### 5.3 Rate Limiting
1. **Auth forms**: 5 attempts per 15 minutes
2. **Lead capture**: 3 submissions per minute
3. **API calls**: Implement server-side rate limiting

### 5.4 Session Management
1. **Default timeout**: 30 minutes (B2B commercial context)
2. **Activity tracking**: Auto-extend on user interaction
3. **Logout**: On timeout or invalid session
4. **Admin panel**: Enforce session checks

### 5.5 CSRF Protection
1. **Initialize** CSRF token on app load (`initializeCSRF()`)
2. **Include** token in all mutating requests (POST, PUT, DELETE)
3. **Use** SameSite cookies (Lax/Strict)
4. **Validate** token on server-side

### 5.6 Content Security
1. **Sanitize** all user-generated content (reviews, comments, chat)
2. **Detect** spam patterns before storage
3. **Extract URLs** for moderation
4. **Limit** content length per type

### 5.7 Error Handling
1. **Log** all errors with context
2. **Rate limit** error reports (10 per minute)
3. **Exclude** sensitive data from error reports
4. **Monitor** errors via Sentry or similar

---

## 6. Implementation Checklist

### Phase 1: Foundation (Complete)
- [x] Create security utilities library
- [x] Implement validation schemas
- [x] Add secure storage and session management
- [x] Implement CSRF protection
- [x] Add content policy enforcement
- [x] Setup error reporting

### Phase 2: Integration (Complete)
- [x] Update LoginPage with rate limiting
- [x] Update RegisterPage with validation
- [x] Update CheckoutPage with B2B validation
- [x] Update LeadCaptureModal with sanitization
- [x] Update AdminGuard with session checks
- [x] Add security headers to vite.config.ts
- [x] Add security headers to vercel.json
- [x] Create Netlify headers file
- [x] Update .env.example

### Phase 3: Testing & Monitoring
- [ ] Run TypeScript compilation check
- [ ] Test rate limiting functionality
- [ ] Test input validation edge cases
- [ ] Test session timeout behavior
- [ ] Verify CSRF token generation
- [ ] Monitor error logs
- [ ] Setup Sentry integration
- [ ] Run OWASP security audit
- [ ] Penetration testing

### Phase 4: Deployment
- [ ] Review all security headers
- [ ] Verify .env.example completeness
- [ ] Setup environment variables in production
- [ ] Configure Supabase edge function secrets
- [ ] Enable HTTPS/HSTS preload
- [ ] Setup monitoring and alerting
- [ ] Document security incident process

---

## 7. Dependencies

The security implementation is designed to minimize external dependencies:

**No new dependencies required** — all security utilities are built-in:
- HTML sanitization: Regex-based (no DOMPurify)
- Validation: Custom schemas (no Zod required, though can be added)
- Encryption: Client-side obfuscation (for production, add libsodium.js)
- Error tracking: Placeholder for Sentry (install @sentry/react when ready)

**To add Zod validation schemas:**
```bash
npm install zod --legacy-peer-deps
```

---

## 8. Future Enhancements

1. **Cryptographic Encryption**: Integrate libsodium.js for true encryption
2. **Sentry Integration**: Implement @sentry/react for production error tracking
3. **Web Security**: Add subresource integrity (SRI) for CDN resources
4. **2FA**: Implement two-factor authentication for admin accounts
5. **API Rate Limiting**: Server-side rate limiting with Redis
6. **WAF**: Deploy Cloudflare WAF rules
7. **Audit Logging**: Enhanced audit trail for sensitive operations
8. **Security Headers**: Add Permissions-Policy for camera/microphone restrictions

---

## 9. References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

---

**Last Updated:** 2026-04-20
**Version:** 1.0.0
**Status:** Implemented and ready for testing
