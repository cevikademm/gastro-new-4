/**
 * EU VAT Handling System
 * Implements MOSS (Mini One-Stop Shop) and reverse charge rules
 */

// VAT rates by country (standard and reduced)
export const EU_VAT_RATES: Record<string, { standard: number; reduced: number }> = {
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
  GB: { standard: 20, reduced: 5 },
  CH: { standard: 8.1, reduced: 2.5 },
  NO: { standard: 25, reduced: 15 },
  IS: { standard: 24, reduced: 11 },
  TR: { standard: 18, reduced: 8 },
};

/**
 * Get VAT rate for country
 */
export function getVATRate(countryCode: string, isReduced: boolean = false): number {
  const rates = EU_VAT_RATES[countryCode] || { standard: 19, reduced: 7 };
  return isReduced ? rates.reduced : rates.standard;
}

/**
 * Check if reverse charge applies
 * Reverse charge (0% VAT on supplier) applies to:
 * - EU B2B cross-border supplies
 * - Buyer has valid VAT ID
 * - Different member states
 *
 * Does NOT apply to:
 * - Same country supplies (normal VAT)
 * - B2C supplies
 * - Supplies to countries outside EU
 */
export function isReverseCharge(
  sellerCountry: string,
  buyerCountry: string,
  buyerVATId?: string,
  isB2B: boolean = false
): boolean {
  const euCountries = Object.keys(EU_VAT_RATES);

  // Must be B2B
  if (!isB2B) return false;

  // Must be different countries
  if (sellerCountry === buyerCountry) return false;

  // Both must be EU
  if (!euCountries.includes(sellerCountry) || !euCountries.includes(buyerCountry)) {
    return false;
  }

  // Buyer must have valid VAT ID
  if (!buyerVATId) return false;

  return true;
}

/**
 * Format VAT ID with country code prefix and standardized spacing
 * e.g., DE 123 456 789 → DE123456789
 */
export function formatVATId(vatId: string): string {
  // Remove spaces
  const cleaned = vatId.replace(/\s/g, '').toUpperCase();
  // Add country prefix if missing
  if (cleaned.length < 4) return cleaned;
  return cleaned;
}

/**
 * Calculate net price from gross (VAT-inclusive) price
 * Formula: net = gross / (1 + VAT% / 100)
 */
export function calculateNetFromGross(gross: number, vatRate: number): number {
  if (vatRate < 0 || vatRate > 100) {
    throw new Error('Invalid VAT rate');
  }
  return Math.round((gross / (1 + vatRate / 100)) * 100) / 100;
}

/**
 * Calculate gross (VAT-inclusive) price from net price
 * Formula: gross = net * (1 + VAT% / 100)
 */
export function calculateGrossFromNet(net: number, vatRate: number): number {
  if (vatRate < 0 || vatRate > 100) {
    throw new Error('Invalid VAT rate');
  }
  return Math.round(net * (1 + vatRate / 100) * 100) / 100;
}

/**
 * Calculate VAT amount from net price
 * Formula: VAT = net * (VAT% / 100)
 */
export function calculateVATFromNet(net: number, vatRate: number): number {
  if (vatRate < 0 || vatRate > 100) {
    throw new Error('Invalid VAT rate');
  }
  return Math.round((net * vatRate) / 100);
}

/**
 * Calculate VAT amount from gross price
 * Formula: VAT = gross - net, where net = gross / (1 + VAT% / 100)
 */
export function calculateVATFromGross(gross: number, vatRate: number): number {
  const net = calculateNetFromGross(gross, vatRate);
  return Math.round((gross - net) * 100) / 100;
}

/**
 * Check if VAT ID is valid format (basic check)
 * Real validation requires VIES API call
 */
export function isValidVATIdFormat(vatId: string): boolean {
  if (!vatId || typeof vatId !== 'string') return false;

  const cleaned = vatId.replace(/\s/g, '').toUpperCase();
  const countryPatterns: Record<string, RegExp> = {
    DE: /^DE\d{9}$/,
    AT: /^AT[A-Z]{1}\d{7}$/,
    FR: /^FR[A-Z0-9]{2}\d{9}$/,
    IT: /^IT\d{11}$/,
    ES: /^ES[A-Z0-9]{9}$/,
    BE: /^BE\d{10}$/,
    NL: /^NL[A-Z0-9]{12}$/,
    PL: /^PL\d{10}$/,
    CZ: /^CZ\d{8,10}$/,
    SE: /^SE\d{12}$/,
    DK: /^DK\d{8}$/,
    FI: /^FI\d{8}$/,
    GR: /^GR\d{9}$/,
    IE: /^IE[A-Z0-9]{8,9}$/,
    LU: /^LU\d{13}$/,
    PT: /^PT\d{9}$/,
    SK: /^SK\d{10}$/,
    SI: /^SI\d{8}$/,
    HU: /^HU\d{8}$/,
    RO: /^RO\d{2,10}$/,
    BG: /^BG\d{9,10}$/,
    HR: /^HR\d{11}$/,
    LT: /^LT(\d{9}|\d{12})$/,
    LV: /^LV\d{11}$/,
    EE: /^EE\d{9}$/,
    CY: /^CY\d{8}[A-Z]$/,
    MT: /^MT\d{8}$/,
    GB: /^GB(\d{9}|\d{12}|[A-Z]{2}\d{3})$/,
    CH: /^CHE\d{9}$/,
    NO: /^NO\d{9}$/,
  };

  if (cleaned.length < 4) return false;

  const country = cleaned.substring(0, 2);
  const pattern = countryPatterns[country];

  if (!pattern) return false;
  return pattern.test(cleaned);
}

/**
 * Get company VAT information display
 */
export interface VATInfo {
  country: string;
  vatId: string;
  standardRate: number;
  reducedRate: number;
  isValid: boolean;
  companyName?: string;
}

/**
 * Format price with VAT information for display
 */
export function formatPriceWithVAT(
  net: number,
  vatRate: number,
  locale: string = 'de-DE'
): string {
  const gross = calculateGrossFromNet(net, vatRate);
  const vat = calculateVATFromNet(net, vatRate);

  return `€${net.toLocaleString(locale, { minimumFractionDigits: 2 })} + €${vat.toLocaleString(locale, { minimumFractionDigits: 2 })} MwSt. = €${gross.toLocaleString(locale, { minimumFractionDigits: 2 })}`;
}
