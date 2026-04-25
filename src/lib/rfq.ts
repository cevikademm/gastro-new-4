/**
 * RFQ (Request for Quote) System
 * B2B quote request and management
 */

import { CartItem } from '../stores/cartStore';

export interface QuoteItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface QuoteRequest {
  id: string;
  customerId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  items: QuoteItem[];
  message: string;
  requestedDeliveryDate?: Date;
  status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags?: string[];
}

export interface Quote {
  id: string;
  requestId: string;
  quoteNumber: string;
  items: QuoteItem[];
  subtotal: number;
  volumeDiscount: number; // percentage
  discountAmount: number;
  subtotalAfterDiscount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  validFrom: Date;
  validUntil: Date; // typically 30 days
  paymentTerms: string; // 'net-30', 'net-60', 'prepaid'
  deliveryTerms: string; // 'ex works', 'fob', 'cif', etc.
  deliveryAddress?: string;
  deliveryDate?: Date;
  notes?: string;
  internalNotes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
}

/**
 * Create a quote request from cart items
 */
export function createQuoteRequestFromCart(
  cartItems: CartItem[],
  customerId: string,
  companyName: string,
  contactName: string,
  contactEmail: string,
  contactPhone: string,
  message: string,
  requestedDeliveryDate?: Date
): QuoteRequest {
  const items = cartItems.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    quantity: item.quantity,
    unitPrice: item.product.price || 0,
  }));

  return {
    id: crypto.randomUUID(),
    customerId,
    companyName,
    contactName,
    contactEmail,
    contactPhone,
    items,
    message,
    requestedDeliveryDate,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
}

/**
 * Generate quote number (Q-YYYY-XXXXX)
 */
export function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0');
  return `Q-${year}-${sequence}`;
}

/**
 * Create a quote from a quote request
 */
export function createQuoteFromRequest(
  request: QuoteRequest,
  volumeDiscountPercent: number = 0,
  paymentTerms: string = 'net-30',
  deliveryTerms: string = 'ex works',
  deliveryDate?: Date,
  notes?: string
): Quote {
  const subtotal = request.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const discountAmount = Math.round((subtotal * volumeDiscountPercent) / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;

  const vatRate = 19; // Standard German VAT
  const vatAmount = Math.round((subtotalAfterDiscount * vatRate) / 100);
  const total = subtotalAfterDiscount + vatAmount;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30); // 30-day validity

  return {
    id: crypto.randomUUID(),
    requestId: request.id,
    quoteNumber: generateQuoteNumber(),
    items: request.items,
    subtotal,
    volumeDiscount: volumeDiscountPercent,
    discountAmount,
    subtotalAfterDiscount,
    vatRate,
    vatAmount,
    total,
    currency: 'EUR',
    validFrom: new Date(),
    validUntil,
    paymentTerms,
    deliveryTerms,
    deliveryDate,
    notes,
    status: 'draft',
    createdAt: new Date(),
  };
}

/**
 * Check if quote is still valid
 */
export function isQuoteValid(quote: Quote): boolean {
  return new Date() <= quote.validUntil && quote.status !== 'expired';
}

/**
 * Check if quote request is expired
 */
export function isQuoteRequestExpired(request: QuoteRequest): boolean {
  if (!request.expiresAt) return false;
  return new Date() > request.expiresAt;
}

/**
 * Convert accepted quote to order
 */
export interface QuoteConvertedOrder {
  orderId: string;
  quoteId: string;
  items: QuoteItem[];
  total: number;
  paymentTerms: string;
  deliveryTerms: string;
  createdAt: Date;
}

export function convertQuoteToOrder(quote: Quote): QuoteConvertedOrder {
  return {
    orderId: crypto.randomUUID(),
    quoteId: quote.id,
    items: quote.items,
    total: quote.total,
    paymentTerms: quote.paymentTerms,
    deliveryTerms: quote.deliveryTerms,
    createdAt: new Date(),
  };
}

/**
 * Calculate quote expiration status
 */
export interface QuoteExpirationStatus {
  isExpired: boolean;
  daysRemaining: number;
  expiresAt: Date;
  isExpiringSoon: boolean; // within 7 days
}

export function getQuoteExpirationStatus(quote: Quote): QuoteExpirationStatus {
  const now = new Date();
  const expiresAt = quote.validUntil;
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  return {
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
    expiresAt,
    isExpiringSoon,
  };
}

/**
 * Quote status labels
 */
export const QUOTE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: 'bg-slate-100 text-slate-700' },
  sent: { label: 'Versendet', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Akzeptiert', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Abgelaufen', color: 'bg-gray-100 text-gray-700' },
};

export const REQUEST_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-700' },
  quoted: { label: 'Angeboten', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Akzeptiert', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Abgelaufen', color: 'bg-gray-100 text-gray-700' },
};
