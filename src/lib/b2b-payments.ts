/**
 * B2B Payment Methods and Leasing Calculations
 * Supports Invoice, SEPA, Bank Transfer, Credit Card, PayPal, and Leasing
 */

import type { Order } from '../stores/orderStore';

export interface PaymentMethod {
  id: string;
  type: 'invoice' | 'sepa' | 'bank_transfer' | 'credit_card' | 'paypal' | 'leasing';
  label: string;
  description: string;
  available: boolean;
  minOrder?: number; // minimum order amount in EUR
  requiresApproval?: boolean;
}

export interface InvoicePayment {
  orderId: string;
  paymentTerms: 'net-30' | 'net-60';
  dueDate: string;
  requiresCreditCheck: boolean;
}

export interface SEPAPayment {
  iban: string;
  bic?: string;
  mandate: string;
  mandateDate: string;
}

export interface BankTransferDetails {
  orderId: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  bic: string;
  amount: number;
  currency: string;
  reference: string;
}

export interface LeasingOption {
  months: 24 | 36 | 48 | 60;
  monthlyRate: number;
  totalCost: number;
  interestRate: number;
}

/**
 * Create an invoice payment
 */
export function createInvoicePayment(order: Order, paymentTerms: 'net-30' | 'net-60' = 'net-30'): InvoicePayment {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (paymentTerms === 'net-30' ? 30 : 60));

  return {
    orderId: order.id,
    paymentTerms,
    dueDate: dueDate.toISOString().split('T')[0],
    requiresCreditCheck: order.total_price > 5000, // Credit check for orders > €5000
  };
}

/**
 * Create a SEPA payment
 */
export function createSEPAPayment(iban: string, bic?: string): SEPAPayment {
  return {
    iban,
    bic,
    mandate: `MANDATE-${Date.now()}`,
    mandateDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Create bank transfer details
 */
export function createBankTransferPayment(order: Order): BankTransferDetails {
  return {
    orderId: order.id,
    bankName: '2MC Gastro Bank',
    accountHolder: '2MC Gastro GmbH',
    iban: 'DE89 3704 0044 0532 0130 00',
    bic: 'COBADEFF',
    amount: order.total_price,
    currency: 'EUR',
    reference: order.order_number,
  };
}

/**
 * Calculate leasing options for an amount
 * Interest rates based on typical commercial leasing: 3.5% - 6.5% per annum
 */
export function calculateLeasing(amount: number, months: 24 | 36 | 48 | 60): LeasingOption {
  // Typical commercial leasing rates (annual APR)
  const interestRates: Record<number, number> = {
    24: 0.035, // 3.5% for 24 months
    36: 0.04,  // 4.0% for 36 months
    48: 0.045, // 4.5% for 48 months
    60: 0.05,  // 5.0% for 60 months
  };

  const interestRate = interestRates[months];
  const monthlyRate = (interestRate / 12);

  // Calculate monthly payment using loan amortization formula
  // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  const monthlyPayment = amount * (numerator / denominator);

  const totalCost = monthlyPayment * months;

  return {
    months,
    monthlyRate: Math.round(monthlyPayment * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    interestRate,
  };
}

/**
 * Get available payment methods based on customer tier and order total
 */
export function getAvailablePaymentMethods(customerTier: string, orderTotal: number): PaymentMethod[] {
  const methods: PaymentMethod[] = [
    {
      id: 'credit_card',
      type: 'credit_card',
      label: 'Credit Card / Debit Card',
      description: 'Visa, Mastercard, American Express',
      available: true,
    },
    {
      id: 'paypal',
      type: 'paypal',
      label: 'PayPal',
      description: 'Secure payment via PayPal',
      available: true,
    },
    {
      id: 'sepa',
      type: 'sepa',
      label: 'SEPA Direct Debit',
      description: 'Direct debit from your bank account',
      available: true,
      minOrder: 100,
    },
  ];

  // B2B methods available for business accounts and orders over €500
  if (customerTier === 'business' || orderTotal >= 500) {
    methods.push(
      {
        id: 'invoice',
        type: 'invoice',
        label: 'Invoice (Rechnung)',
        description: 'Net 30/60 - Payment after delivery',
        available: true,
        minOrder: 500,
        requiresApproval: true,
      },
      {
        id: 'bank_transfer',
        type: 'bank_transfer',
        label: 'Bank Transfer (Vorkasse)',
        description: 'Prepayment via bank transfer',
        available: true,
        minOrder: 100,
      }
    );
  }

  // Leasing available for orders over €2000
  if (orderTotal >= 2000) {
    methods.push({
      id: 'leasing',
      type: 'leasing',
      label: 'Equipment Leasing',
      description: 'Flexible monthly payments',
      available: true,
      minOrder: 2000,
      requiresApproval: true,
    });
  }

  // Filter based on minimum order requirements
  return methods.filter((m) => !m.minOrder || orderTotal >= m.minOrder);
}

/**
 * Check if a payment method requires approval
 */
export function requiresPaymentApproval(methodId: string): boolean {
  const approvalMethods = ['invoice', 'leasing'];
  return approvalMethods.includes(methodId);
}

/**
 * Get payment method configuration
 */
export function getPaymentMethodConfig(methodId: string): PaymentMethod | null {
  const allMethods: Record<string, PaymentMethod> = {
    credit_card: {
      id: 'credit_card',
      type: 'credit_card',
      label: 'Credit Card',
      description: 'Visa, Mastercard, Amex',
      available: true,
    },
    paypal: {
      id: 'paypal',
      type: 'paypal',
      label: 'PayPal',
      description: 'Secure payment via PayPal',
      available: true,
    },
    sepa: {
      id: 'sepa',
      type: 'sepa',
      label: 'SEPA',
      description: 'Direct bank debit',
      available: true,
      minOrder: 100,
    },
    invoice: {
      id: 'invoice',
      type: 'invoice',
      label: 'Invoice',
      description: 'Net 30/60 terms',
      available: true,
      minOrder: 500,
      requiresApproval: true,
    },
    bank_transfer: {
      id: 'bank_transfer',
      type: 'bank_transfer',
      label: 'Bank Transfer',
      description: 'Prepayment',
      available: true,
      minOrder: 100,
    },
    leasing: {
      id: 'leasing',
      type: 'leasing',
      label: 'Equipment Leasing',
      description: 'Monthly payments',
      available: true,
      minOrder: 2000,
      requiresApproval: true,
    },
  };

  return allMethods[methodId] || null;
}
