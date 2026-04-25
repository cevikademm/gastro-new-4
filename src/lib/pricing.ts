/**
 * B2B Pricing System
 * Volume discounts, customer tiers, and B2B price formatting
 */

import { CartItem } from '../stores/cartStore';

/**
 * Calculate volume discount based on total item count
 * - 5-9 items: 3% discount
 * - 10-24 items: 5% discount
 * - 25-49 items: 8% discount
 * - 50+ items: 10% discount
 */
export function calculateVolumeDiscount(items: CartItem[]): number {
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  if (totalQty >= 50) return 10;
  if (totalQty >= 25) return 8;
  if (totalQty >= 10) return 5;
  if (totalQty >= 5) return 3;
  return 0;
}

/**
 * Calculate customer tier discount
 * Tiers: standard (0%), silver (3%), gold (5%), platinum (8%)
 */
export function calculateCustomerDiscount(customerTier: string): number {
  const discounts: Record<string, number> = {
    standard: 0,
    silver: 3,
    gold: 5,
    platinum: 8,
  };
  return discounts[customerTier] || 0;
}

/**
 * Apply cumulative discounts (volume + tier)
 * Uses best-of approach: customer gets the higher single discount
 * or a combination if both apply
 */
export function calculateTotalDiscount(
  volumeDiscount: number,
  tierDiscount: number
): number {
  // Use best-of approach for fairness
  // In practice, could implement tiered stacking rules
  return Math.max(volumeDiscount, tierDiscount);
}

/**
 * Format B2B price with net/gross breakdown
 * @param net Net price (without VAT)
 * @param vatRate VAT percentage
 * @param showNet Whether to show net prices (B2B) or gross (B2C)
 * @returns Formatted price string
 */
export function formatB2BPrice(
  net: number,
  vatRate: number = 19,
  showNet: boolean = true
): string {
  const vat = Math.round((net * vatRate) / 100);
  const gross = net + vat;

  if (showNet) {
    return `€${net.toLocaleString('de-DE', { minimumFractionDigits: 2 })} zzgl. MwSt.`;
  }

  return `€${gross.toLocaleString('de-DE', { minimumFractionDigits: 2 })} (inkl. MwSt.)`;
}

/**
 * Get price tier for bulk ordering
 */
export interface PriceTier {
  minQty: number;
  maxQty?: number;
  pricePerUnit: number;
  discount: number;
}

/**
 * Calculate tiered pricing for a product
 */
export function calculateTieredPrice(
  basePrice: number,
  quantity: number,
  tiers: PriceTier[]
): { price: number; tier: PriceTier; discount: number } {
  const applicableTier = tiers.find(
    (t) => quantity >= t.minQty && (!t.maxQty || quantity <= t.maxQty)
  ) || tiers[tiers.length - 1];

  const discount = applicableTier?.discount || 0;
  const discountedPrice = basePrice * (1 - discount / 100);

  return {
    price: discountedPrice * quantity,
    tier: applicableTier,
    discount,
  };
}

/**
 * Format discount display
 */
export function formatDiscount(
  discountPercent: number,
  originalPrice: number
): { amount: number; formatted: string } {
  const amount = Math.round((originalPrice * discountPercent) / 100);
  return {
    amount,
    formatted: `-€${amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} (-${discountPercent}%)`,
  };
}

/**
 * Apply promotional codes
 */
export interface PromoCode {
  code: string;
  description: string;
  discountPercent: number;
  maxUses?: number;
  minOrderValue?: number;
  validFrom: Date;
  validTo: Date;
  applicableToCustomerTiers?: string[]; // empty = all tiers
}

/**
 * Validate and apply promo code
 */
export function validatePromoCode(
  code: string,
  orderValue: number,
  customerTier: string,
  promoCodes: PromoCode[]
): { valid: boolean; discount: number; message?: string } {
  const promo = promoCodes.find(
    (p) =>
      p.code.toUpperCase() === code.toUpperCase() &&
      new Date() >= p.validFrom &&
      new Date() <= p.validTo
  );

  if (!promo) {
    return { valid: false, discount: 0, message: 'Ungültiger Promocode' };
  }

  if (promo.minOrderValue && orderValue < promo.minOrderValue) {
    return {
      valid: false,
      discount: 0,
      message: `Mindestbestellwert: €${promo.minOrderValue.toFixed(2)}`,
    };
  }

  if (
    promo.applicableToCustomerTiers &&
    promo.applicableToCustomerTiers.length > 0 &&
    !promo.applicableToCustomerTiers.includes(customerTier)
  ) {
    return { valid: false, discount: 0, message: 'Promocode nicht für diese Kundengruppe gültig' };
  }

  return { valid: true, discount: promo.discountPercent };
}

/**
 * Common promo codes (example)
 */
export const EXAMPLE_PROMO_CODES: PromoCode[] = [
  {
    code: 'NEUKUNDE2024',
    description: 'Willkommensrabatt für Neukunden',
    discountPercent: 5,
    minOrderValue: 100,
    validFrom: new Date('2026-01-01'),
    validTo: new Date('2026-12-31'),
    applicableToCustomerTiers: ['standard'],
  },
  {
    code: 'LOYAL10',
    description: 'Loyalitätsrabatt für Gold-Kunden',
    discountPercent: 10,
    validFrom: new Date('2026-01-01'),
    validTo: new Date('2026-12-31'),
    applicableToCustomerTiers: ['gold', 'platinum'],
  },
];
