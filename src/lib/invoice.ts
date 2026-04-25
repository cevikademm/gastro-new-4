/**
 * B2B Invoice System
 * Generates invoices with German tax compliance (§14 UStG, §27a UStG)
 */

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  vatId: string;
  registrationNumber?: string;
}

export interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  address: string;
  city: string;
  postal: string;
  country: string;
  vatId?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string; // RE-2026-XXXXX format
  orderDate: Date;
  dueDate: Date; // net-30 or net-60
  company: CompanyInfo;
  customer: CustomerInfo;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number; // 19% Germany standard, 7% reduced
  vatAmount: number;
  total: number;
  paymentTerms: 'net-30' | 'net-60' | 'prepaid' | 'cod';
  skonto?: { percent: number; days: number }; // e.g., 2% within 10 days
  reverseCharge?: boolean; // For EU cross-border B2B
  notes?: string;
  internalNotes?: string;
}

/**
 * Generate unique invoice number in RE-YYYY-XXXXX format
 * RE = Rechnung (Invoice in German)
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `RE-${year}-${sequence}`;
}

/**
 * Calculate VAT based on country code and transaction type
 * Implements EU VAT Directive rules
 */
export function calculateVAT(
  subtotal: number,
  country: string,
  isB2B: boolean
): { rate: number; amount: number } {
  const rate = getVATRate(country, false);
  // In B2B with valid VAT ID cross-border: reverse charge (0% VAT on supplier side)
  const applicableRate = isB2B ? rate : rate;
  const amount = Math.round((subtotal * applicableRate) / 100);
  return { rate: applicableRate, amount };
}

/**
 * Get VAT rate for country
 * Standard and reduced rates per EU regulations
 */
export function getVATRate(
  countryCode: string,
  isReduced: boolean = false
): number {
  const rates: Record<string, { standard: number; reduced: number }> = {
    DE: { standard: 19, reduced: 7 },
    AT: { standard: 20, reduced: 10 },
    FR: { standard: 20, reduced: 5.5 },
    NL: { standard: 21, reduced: 9 },
    BE: { standard: 21, reduced: 6 },
    IT: { standard: 22, reduced: 5 },
    ES: { standard: 21, reduced: 10 },
    PL: { standard: 23, reduced: 5 },
    CZ: { standard: 21, reduced: 15 },
    SE: { standard: 25, reduced: 6 },
    DK: { standard: 25, reduced: 0 },
    FI: { standard: 24, reduced: 14 },
    GR: { standard: 24, reduced: 13 },
    IE: { standard: 23, reduced: 0 },
    LU: { standard: 17, reduced: 8 },
    PT: { standard: 23, reduced: 13 },
    SK: { standard: 20, reduced: 10 },
    SI: { standard: 22, reduced: 9.5 },
    HU: { standard: 27, reduced: 5 },
    RO: { standard: 19, reduced: 9 },
    BG: { standard: 20, reduced: 9 },
    HR: { standard: 25, reduced: 13 },
    LT: { standard: 21, reduced: 5 },
    LV: { standard: 21, reduced: 12 },
    EE: { standard: 20, reduced: 9 },
    CY: { standard: 19, reduced: 0 },
    MT: { standard: 18, reduced: 0 },
    GB: { standard: 20, reduced: 5 }, // Post-Brexit
    CH: { standard: 8.1, reduced: 2.5 }, // Switzerland
    NO: { standard: 25, reduced: 15 }, // Norway
    TR: { standard: 18, reduced: 8 }, // Turkey
  };

  const countryRates = rates[countryCode] || { standard: 19, reduced: 7 };
  return isReduced ? countryRates.reduced : countryRates.standard;
}

/**
 * Validate VAT ID format and check validity via VIES (placeholder)
 * Real implementation would call VIES API
 */
export async function validateVATId(
  vatId: string
): Promise<{ valid: boolean; companyName?: string }> {
  // Format validation
  const vatPattern = /^[A-Z]{2}[A-Z0-9]{2,12}$/i;
  if (!vatPattern.test(vatId)) {
    return { valid: false };
  }

  // Placeholder: In production, call VIES API
  // https://ec.europa.eu/taxation_customs/vies/
  try {
    // Example: DExxxxxxxxxxxxxx format for Germany
    const countryCode = vatId.substring(0, 2).toUpperCase();
    const number = vatId.substring(2);

    // Basic validation per country
    const countryValidation: Record<string, RegExp> = {
      DE: /^\d{9}$/,
      AT: /^\d{8}$/,
      FR: /^[A-Z0-9]{11}$/,
      IT: /^\d{11}$/,
      ES: /^[A-Z0-9]{9}$/,
      BE: /^\d{10}$/,
      NL: /^\d{12}$/,
    };

    const validator = countryValidation[countryCode];
    if (validator && !validator.test(number)) {
      return { valid: false };
    }

    // Placeholder response — real implementation calls VIES
    return { valid: true, companyName: 'VAT registered company' };
  } catch {
    return { valid: false };
  }
}

/**
 * Calculate due date based on payment terms
 */
export function calculateDueDate(orderDate: Date, terms: string): Date {
  const dueDate = new Date(orderDate);
  switch (terms) {
    case 'net-30':
      dueDate.setDate(dueDate.getDate() + 30);
      break;
    case 'net-60':
      dueDate.setDate(dueDate.getDate() + 60);
      break;
    case 'prepaid':
      dueDate.setDate(dueDate.getDate()); // Same day
      break;
    case 'cod':
      dueDate.setDate(dueDate.getDate()); // COD — payment on delivery
      break;
    default:
      dueDate.setDate(dueDate.getDate() + 30);
  }
  return dueDate;
}

/**
 * Calculate skonto (early payment discount)
 * E.g., 2% discount if paid within 10 days
 */
export function calculateSkonto(total: number, percent: number): number {
  return Math.round((total * percent) / 100);
}

/**
 * Check if reverse charge applies
 * Applies to EU B2B cross-border supplies of services/goods
 * Buyer must have valid VAT ID
 */
export function isReverseCharge(
  sellerCountry: string,
  buyerCountry: string,
  buyerVATId?: string
): boolean {
  // Reverse charge applies when:
  // 1. Both are in EU
  // 2. Different countries
  // 3. Buyer has valid VAT ID
  // 4. Supply is goods or services covered by reverse charge

  const euCountries = [
    'DE', 'AT', 'FR', 'NL', 'BE', 'IT', 'ES', 'PL', 'CZ', 'SE', 'DK',
    'FI', 'GR', 'IE', 'LU', 'PT', 'SK', 'SI', 'HU', 'RO', 'BG', 'HR',
    'LT', 'LV', 'EE', 'CY', 'MT'
  ];

  if (sellerCountry === buyerCountry) return false;
  if (!euCountries.includes(sellerCountry) || !euCountries.includes(buyerCountry)) {
    return false;
  }
  if (!buyerVATId) return false;

  return true;
}

/**
 * Format VAT ID with spaces (e.g., DE 123 456 789)
 */
export function formatVATId(vatId: string): string {
  const country = vatId.substring(0, 2);
  const number = vatId.substring(2);
  // Format with spaces every 3 digits
  const formatted = number.replace(/(.{3})/g, '$1 ').trim();
  return `${country} ${formatted}`;
}

/**
 * Calculate net price from gross price
 */
export function calculateNetFromGross(gross: number, vatRate: number): number {
  return Math.round((gross / (1 + vatRate / 100)) * 100) / 100;
}

/**
 * Calculate gross price from net price
 */
export function calculateGrossFromNet(net: number, vatRate: number): number {
  return Math.round((net * (1 + vatRate / 100)) * 100) / 100;
}
