/**
 * IBAN Validation and Formatting
 * Supports international IBAN standards
 */

interface IBANValidationResult {
  valid: boolean;
  country: string;
  bankCode?: string;
}

// IBAN country code to country name mapping
const IBAN_COUNTRIES: Record<string, string> = {
  AD: 'Andorra',
  AE: 'United Arab Emirates',
  AL: 'Albania',
  AT: 'Austria',
  AZ: 'Azerbaijan',
  BA: 'Bosnia and Herzegovina',
  BE: 'Belgium',
  BG: 'Bulgaria',
  BH: 'Bahrain',
  BR: 'Brazil',
  CH: 'Switzerland',
  CR: 'Costa Rica',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  DO: 'Dominican Republic',
  EE: 'Estonia',
  ES: 'Spain',
  FI: 'Finland',
  FO: 'Faroe Islands',
  FR: 'France',
  GB: 'United Kingdom',
  GE: 'Georgia',
  GI: 'Gibraltar',
  GR: 'Greece',
  HR: 'Croatia',
  HU: 'Hungary',
  IE: 'Ireland',
  IL: 'Israel',
  IS: 'Iceland',
  IT: 'Italy',
  JO: 'Jordan',
  KW: 'Kuwait',
  KZ: 'Kazakhstan',
  LB: 'Lebanon',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Montenegro',
  MK: 'North Macedonia',
  MR: 'Mauritania',
  MT: 'Malta',
  MU: 'Mauritius',
  NL: 'Netherlands',
  NO: 'Norway',
  PK: 'Pakistan',
  PL: 'Poland',
  PS: 'Palestine',
  PT: 'Portugal',
  QA: 'Qatar',
  RO: 'Romania',
  RS: 'Serbia',
  SA: 'Saudi Arabia',
  SE: 'Sweden',
  SI: 'Slovenia',
  SK: 'Slovakia',
  SM: 'San Marino',
  TN: 'Tunisia',
  TR: 'Turkey',
  UA: 'Ukraine',
  VA: 'Vatican',
  VG: 'British Virgin Islands',
  XK: 'Kosovo',
};

// IBAN length by country
const IBAN_LENGTH: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22,
  BR: 29, CH: 21, CR: 21, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GR: 27, HR: 21,
  HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
  MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26,
  UA: 29, VA: 22, VG: 24, XK: 20,
};

/**
 * Validates an IBAN
 */
export function validateIBAN(iban: string): IBANValidationResult {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  if (!cleaned || cleaned.length < 15) {
    return { valid: false, country: '' };
  }

  const countryCode = cleaned.substring(0, 2);

  if (!IBAN_COUNTRIES[countryCode]) {
    return { valid: false, country: '' };
  }

  const expectedLength = IBAN_LENGTH[countryCode];
  if (cleaned.length !== expectedLength) {
    return { valid: false, country: countryCode };
  }

  // Check numeric pattern (positions 0-3 contain country code and check digits, rest are alphanumeric)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
    return { valid: false, country: countryCode };
  }

  // Perform mod-97 check
  if (!performMod97Check(cleaned)) {
    return { valid: false, country: countryCode };
  }

  return {
    valid: true,
    country: countryCode,
    bankCode: extractBankCode(cleaned, countryCode),
  };
}

/**
 * Formats IBAN with spaces every 4 characters
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  const parts: string[] = [];

  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.substring(i, i + 4));
  }

  return parts.join(' ');
}

/**
 * Validates a BIC (Bank Identifier Code)
 */
export function validateBIC(bic: string): boolean {
  // BIC format: 4 letters (bank code) + 2 letters (country) + 2 letters (location) + 3 letters optional (branch)
  const cleaned = bic.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
}

/**
 * Performs MOD-97 checksum validation
 */
function performMod97Check(iban: string): boolean {
  // Move the first 4 characters to the end
  const rearranged = iban.substring(4) + iban.substring(0, 4);

  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  let numeric = '';
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged[i];
    if (char >= '0' && char <= '9') {
      numeric += char;
    } else {
      numeric += (char.charCodeAt(0) - 55).toString();
    }
  }

  // Calculate mod 97
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }

  return remainder === 1;
}

/**
 * Extracts bank code based on country
 */
function extractBankCode(iban: string, country: string): string | undefined {
  // German IBANs: positions 4-8 contain the bank code
  if (country === 'DE') {
    return iban.substring(4, 8);
  }

  // Other countries may have different positions, add as needed
  return undefined;
}
