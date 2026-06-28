/**
 * Order Confirmation Email Generation
 * Generates legally compliant order confirmation with all required information
 */

import type { Order, OrderItem } from '../stores/orderStore';

export interface OrderConfirmationContent {
  subject: string;
  plainText: string;
  html: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  hrb: string;
  ustIdNr: string;
  taxOffice: string;
  ceo: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: '2MC Gastro GmbH',
  address: 'Beispielstraße 123',
  city: 'Berlin',
  zipCode: '10115',
  phone: '+49 30 123456789',
  email: 'info@2mcgastro.de',
  hrb: 'HRB 234567 Amtsgericht Berlin',
  ustIdNr: 'DE365660948',
  taxOffice: 'Finanzamt Berlin-Mitte',
  ceo: 'John Doe',
};

/**
 * Generate order confirmation HTML
 */
export function generateOrderConfirmationHTML(
  order: Order,
  customerName: string,
  customerCompany: string,
  companyInfo: CompanyInfo = DEFAULT_COMPANY_INFO
): string {
  const items = order.items as OrderItem[];
  const subtotal = Math.round(order.total_price * 100) / 100;
  const vatRate = 0.19;
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const itemsHTML = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: left;">${item.name}</td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right;">€ ${(item.price || 0).toFixed(2)}</td>
      <td style="padding: 12px; text-align: right;">€ ${((item.price || 0) * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #334155; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .content { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .footer { background: white; padding: 20px; border-radius: 8px; font-size: 12px; color: #64748b; }
    h1 { font-size: 24px; margin: 0 0 10px 0; color: #1e293b; }
    h2 { font-size: 16px; margin: 20px 0 10px 0; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; }
    .summary { background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total { font-size: 18px; font-weight: 700; color: #0f172a; padding-top: 8px; border-top: 2px solid #e2e8f0; }
    .legal { font-size: 11px; color: #64748b; background: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 20px; }
    .company-info { font-size: 12px; color: #64748b; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Auftragsbestätigung</h1>
      <p style="margin: 10px 0; color: #64748b;">
        Vielen Dank für Ihre Bestellung. Dies ist Ihre Auftragsbestätigung.
      </p>
    </div>

    <div class="content">
      <h2>Bestelldetails</h2>
      <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <strong>Bestellnummer:</strong>
          <span style="font-family: monospace;">${order.order_number}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <strong>Bestelldatum:</strong>
          <span>${new Date(order.created_at).toLocaleDateString('de-DE')}</span>
        </div>
      </div>

      <h2>Rechnungsadresse</h2>
      <p style="margin: 0;">
        ${customerName}<br>
        ${customerCompany}<br>
        ${order.shipping_address || '[Lieferadresse wird nach Zahlungsabschluss angefordert]'}
      </p>

      <h2>Bestellte Artikel</h2>
      <table>
        <thead>
          <tr>
            <th>Artikel</th>
            <th>Menge</th>
            <th>Einzelpreis</th>
            <th>Gesamtpreis</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <span>Netto:</span>
          <span>€ ${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>MwSt. (19%):</span>
          <span>€ ${vatAmount.toFixed(2)}</span>
        </div>
        <div class="summary-row total">
          <span>Gesamtbetrag:</span>
          <span>€ ${total.toFixed(2)}</span>
        </div>
      </div>

      <h2>Zahlungsbedingungen</h2>
      <p style="margin: 0;">
        Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum, sofern keine abweichende Vereinbarung getroffen wurde.
      </p>

      <h2>Versandinformationen</h2>
      <p style="margin: 0;">
        Die Lieferung erfolgt nach Zahlungsabschluss. Sie erhalten eine separate Versandbestätigung mit Verfolgungsinformationen.
      </p>

      <div class="legal">
        <strong>Widerrufsrecht für Verbraucher:</strong>
        Gemäß § 355 BGB besteht ein Widerrufsrecht. Nähere Informationen entnehmen Sie unserer Widerrufsbelehrung.
        <br><br>
        <strong>Datenschutz:</strong>
        Ihre Daten werden gemäß DSGVO behandelt. Siehe unsere Datenschutzerklärung.
      </div>
    </div>

    <div class="footer">
      <h2 style="font-size: 14px;">Kontakt & Impressum</h2>
      <div class="company-info">
        <strong>${companyInfo.name}</strong><br>
        ${companyInfo.address}<br>
        ${companyInfo.zipCode} ${companyInfo.city}<br>
        <br>
        Telefon: <a href="tel:${companyInfo.phone}" style="color: #0284c7;">${companyInfo.phone}</a><br>
        E-Mail: <a href="mailto:${companyInfo.email}" style="color: #0284c7;">${companyInfo.email}</a><br>
        <br>
        <strong>Registrierungsinformationen:</strong><br>
        ${companyInfo.hrb}<br>
        Finanzamt: ${companyInfo.taxOffice}<br>
        Umsatz-ID: ${companyInfo.ustIdNr}<br>
        <br>
        <strong>Geschäftsführer:</strong> ${companyInfo.ceo}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text confirmation
 */
export function generateOrderConfirmationText(
  order: Order,
  customerName: string,
  customerCompany: string,
  companyInfo: CompanyInfo = DEFAULT_COMPANY_INFO
): string {
  const items = order.items as OrderItem[];
  const subtotal = order.total_price;
  const vatRate = 0.19;
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const itemsText = items
    .map(
      (item) =>
        `${item.name.padEnd(40)} x${item.quantity.toString().padStart(3)} @ €${(item.price || 0).toFixed(2).padStart(8)} = €${((item.price || 0) * item.quantity).toFixed(2).padStart(8)}`
    )
    .join('\n');

  return `
AUFTRAGSBESTÄTIGUNG
═══════════════════════════════════════════════════════

Bestellnummer: ${order.order_number}
Bestelldatum: ${new Date(order.created_at).toLocaleDateString('de-DE')}

RECHNUNGSADRESSE
═══════════════════════════════════════════════════════
${customerName}
${customerCompany}
${order.shipping_address || '[Lieferadresse wird nach Zahlungsabschluss angefordert]'}

BESTELLTE ARTIKEL
═══════════════════════════════════════════════════════
${itemsText}

ZAHLUNGSÜBERSICHT
═══════════════════════════════════════════════════════
Netto:              €${subtotal.toFixed(2)}
MwSt. (19%):        €${vatAmount.toFixed(2)}
───────────────────────────────────────────────────────
GESAMTBETRAG:       €${total.toFixed(2)}

ZAHLUNGSBEDINGUNGEN
═══════════════════════════════════════════════════════
Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum.

WIDERRUFSRECHT
═══════════════════════════════════════════════════════
Als Verbraucher haben Sie das Recht, Ihre Bestellung
innerhalb von 14 Tagen zu widerrufen. Weitere
Informationen siehe unsere Widerrufsbelehrung.

KONTAKT
═══════════════════════════════════════════════════════
${companyInfo.name}
${companyInfo.address}
${companyInfo.zipCode} ${companyInfo.city}
Telefon: ${companyInfo.phone}
E-Mail: ${companyInfo.email}

${companyInfo.hrb}
Finanzamt: ${companyInfo.taxOffice}
Umsatz-ID: ${companyInfo.ustIdNr}
  `;
}

/**
 * Create complete confirmation content
 */
export function createOrderConfirmation(
  order: Order,
  customerName: string,
  customerCompany: string,
  companyInfo?: CompanyInfo
): OrderConfirmationContent {
  const info = companyInfo || DEFAULT_COMPANY_INFO;

  return {
    subject: `Auftragsbestätigung ${order.order_number} | ${info.name}`,
    plainText: generateOrderConfirmationText(order, customerName, customerCompany, info),
    html: generateOrderConfirmationHTML(order, customerName, customerCompany, info),
  };
}
