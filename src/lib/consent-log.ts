/**
 * Consent Logging and TCF 2.2 Compliance
 * Tracks user consent decisions with timestamps and version information
 */

export interface ConsentRecord {
  id: string;
  timestamp: string;
  version: string;
  status: boolean; // true = accepted, false = declined
  mode: 'essential' | 'granular';
  vendors?: Record<string, boolean>;
  purposes?: Record<string, boolean>;
}

interface ConsentState {
  cookieConsent: boolean | null;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  vendorConsent: Record<string, boolean>;
  timestamp: string;
  version: string;
}

const CURRENT_POLICY_VERSION = '2.2';
const CONSENT_STORAGE_KEY = 'tcf-consent-log';

/**
 * Create a new consent record
 */
export function createConsentRecord(
  accepted: boolean,
  mode: 'essential' | 'granular' = 'essential',
  vendors?: Record<string, boolean>,
  purposes?: Record<string, boolean>
): ConsentRecord {
  return {
    id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    version: CURRENT_POLICY_VERSION,
    status: accepted,
    mode,
    vendors,
    purposes,
  };
}

/**
 * Save consent record to localStorage
 */
export function saveConsentRecord(record: ConsentRecord): void {
  if (typeof window === 'undefined') return;

  try {
    const logs = loadConsentLogs();
    logs.push(record);

    // Keep last 50 records
    if (logs.length > 50) {
      logs.shift();
    }

    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(logs));

    // Also save current consent state
    const state: ConsentState = {
      cookieConsent: record.status,
      analyticsConsent: record.purposes?.analytics ?? record.status,
      marketingConsent: record.purposes?.marketing ?? record.status,
      vendorConsent: record.vendors || {},
      timestamp: record.timestamp,
      version: record.version,
    };

    localStorage.setItem('consent-state', JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save consent record:', error);
  }
}

/**
 * Load all consent records
 */
export function loadConsentLogs(): ConsentRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(CONSENT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Failed to load consent logs:', error);
    return [];
  }
}

/**
 * Get the most recent consent state
 */
export function getCurrentConsentState(): ConsentState | null {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem('consent-state');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to load consent state:', error);
    return null;
  }
}

/**
 * Check if user needs to re-consent due to policy updates
 */
export function needsReconsent(): boolean {
  const currentState = getCurrentConsentState();
  if (!currentState) return true;

  return currentState.version !== CURRENT_POLICY_VERSION;
}

/**
 * Granular consent for specific vendors
 */
export interface VendorConsent {
  google_analytics: boolean;
  stripe: boolean;
  posthog: boolean;
  hotjar: boolean;
  intercom: boolean;
}

export const DEFAULT_VENDORS: VendorConsent = {
  google_analytics: false,
  stripe: true, // Always required for payments
  posthog: false,
  hotjar: false,
  intercom: false,
};

export const VENDOR_DESCRIPTIONS: Record<keyof VendorConsent, string> = {
  google_analytics: 'Analytics & Performance Tracking',
  stripe: 'Payment Processing (Required)',
  posthog: 'Product Analytics & Behavior Tracking',
  hotjar: 'Session Recording & User Feedback',
  intercom: 'Customer Support Chat & Messages',
};

/**
 * Create granular consent record with vendor selection
 */
export function createGranularConsentRecord(
  vendorConsent: Partial<VendorConsent>
): ConsentRecord {
  const vendors = {
    ...DEFAULT_VENDORS,
    ...vendorConsent,
  };

  return createConsentRecord(Object.values(vendors).some(v => v), 'granular', vendors);
}

/**
 * Save TCF 2.2 compliant consent string
 * Format: TCFv2~consent~purpose~vendor
 */
export function saveTCFConsentString(
  vendorConsent: Partial<VendorConsent>
): void {
  if (typeof window === 'undefined') return;

  const vendors = {
    ...DEFAULT_VENDORS,
    ...vendorConsent,
  };

  // Simplified TCF string (in production, use official TCF library)
  const consentString = [
    'TCFv2',
    CURRENT_POLICY_VERSION,
    Object.entries(vendors)
      .map(([vendor, allowed]) => `${vendor}:${allowed ? '1' : '0'}`)
      .join(','),
    new Date().toISOString(),
  ].join('~');

  localStorage.setItem('tcf-consent-string', consentString);
}

/**
 * Check if a vendor has consent
 */
export function hasVendorConsent(vendor: keyof VendorConsent): boolean {
  if (vendor === 'stripe') return true; // Always required

  const state = getCurrentConsentState();
  if (!state) return false;

  return state.vendorConsent[vendor] ?? false;
}

/**
 * Get consent audit trail (last 10 records)
 */
export function getConsentAuditTrail(): ConsentRecord[] {
  const logs = loadConsentLogs();
  return logs.slice(-10).reverse();
}

/**
 * Export user's consent data (GDPR export requirement)
 */
export function exportConsentData(): string {
  const logs = loadConsentLogs();
  const state = getCurrentConsentState();
  const auditTrail = getConsentAuditTrail();

  const data = {
    currentState: state,
    auditTrail,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Clear all consent records (user requested data deletion)
 */
export function clearConsentRecords(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CONSENT_STORAGE_KEY);
  localStorage.removeItem('consent-state');
  localStorage.removeItem('tcf-consent-string');
}
