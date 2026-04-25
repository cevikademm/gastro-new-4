/**
 * Email Footer with Mandatory Company Information
 * German law (HGB, TMG, UStG) requires specific company info in all business emails
 */

export interface CompanyDetails {
  name: string;
  legalForm: string; // GmbH, AG, KG, etc.
  address: string;
  city: string;
  zipCode: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  hrb: string; // Handelsregister B (commercial register)
  courtOfRegistry: string; // Amtsgericht
  ustIdNr: string; // Umsatzsteuer-Identifikationsnummer (VAT ID)
  taxOffice?: string; // Finanzamt
  ceoNames?: string[]; // Geschäftsführer
  procuratorNames?: string[]; // Prokuristen
  ownerNames?: string[]; // Partner or shareholders
}

const DEFAULT_COMPANY: CompanyDetails = {
  name: '2MC Gastro',
  legalForm: 'GmbH',
  address: 'Beispielstraße 123',
  city: 'Berlin',
  zipCode: '10115',
  country: 'Deutschland',
  phone: '+49 30 123456789',
  fax: '+49 30 123456788',
  email: 'info@2mc-gastro.de',
  website: 'https://www.2mc-gastro.de',
  hrb: 'HRB 234567',
  courtOfRegistry: 'Amtsgericht Berlin-Charlottenburg',
  ustIdNr: 'DE123456789',
  taxOffice: 'Finanzamt Berlin-Mitte',
  ceoNames: ['John Doe', 'Jane Smith'],
};

/**
 * Generate plain text email footer (Pflichtangaben)
 */
export function generateEmailFooterText(company: CompanyDetails = DEFAULT_COMPANY): string {
  let footer = `\n\n${'─'.repeat(70)}\n`;
  footer += `${company.name} ${company.legalForm}\n`;
  footer += `${company.address}\n`;
  footer += `${company.zipCode} ${company.city}${company.country ? `, ${company.country}` : ''}\n`;

  if (company.phone) footer += `\nTelefon:  ${company.phone}\n`;
  if (company.fax) footer += `Fax:      ${company.fax}\n`;
  if (company.email) footer += `E-Mail:   ${company.email}\n`;
  if (company.website) footer += `Internet: ${company.website}\n`;

  footer += `\n${company.courtOfRegistry}, ${company.hrb}\n`;
  if (company.ceoNames && company.ceoNames.length > 0) {
    footer += `Geschäftsführer: ${company.ceoNames.join(', ')}\n`;
  }
  if (company.ustIdNr) footer += `Umsatz-ID: ${company.ustIdNr}\n`;
  if (company.taxOffice) footer += `Finanzamt: ${company.taxOffice}\n`;

  return footer;
}

/**
 * Generate HTML email footer
 */
export function generateEmailFooterHTML(company: CompanyDetails = DEFAULT_COMPANY): string {
  return `
<div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; font-size: 11px; color: #64748b; line-height: 1.6;">
  <p style="margin: 0; font-weight: 600;">
    ${company.name} ${company.legalForm}
  </p>
  <p style="margin: 5px 0 0 0;">
    ${company.address}<br>
    ${company.zipCode} ${company.city}${company.country ? `<br>${company.country}` : ''}
  </p>
  <p style="margin: 10px 0 0 0;">
    ${company.phone ? `Telefon: <a href="tel:${company.phone.replace(/\s/g, '')}" style="color: #0284c7; text-decoration: none;">${company.phone}</a><br>` : ''}
    ${company.fax ? `Fax: ${company.fax}<br>` : ''}
    ${company.email ? `E-Mail: <a href="mailto:${company.email}" style="color: #0284c7; text-decoration: none;">${company.email}</a><br>` : ''}
    ${company.website ? `Internet: <a href="${company.website}" style="color: #0284c7; text-decoration: none;">${company.website}</a>` : ''}
  </p>
  <p style="margin: 10px 0 0 0;">
    ${company.courtOfRegistry}, ${company.hrb}${
      company.ceoNames && company.ceoNames.length > 0
        ? `<br>Geschäftsführer: ${company.ceoNames.join(', ')}`
        : ''
    }<br>
    ${company.ustIdNr ? `Umsatz-ID: ${company.ustIdNr}` : ''}${
      company.taxOffice ? `<br>Finanzamt: ${company.taxOffice}` : ''
    }
  </p>
</div>
  `;
}

/**
 * Add footer to existing email body
 */
export function addEmailFooter(
  emailBody: string,
  company?: CompanyDetails,
  htmlMode: boolean = false
): string {
  const footer = htmlMode
    ? generateEmailFooterHTML(company)
    : generateEmailFooterText(company);

  return emailBody + footer;
}

/**
 * Get company legal name with form
 */
export function getCompanyLegalName(company: CompanyDetails = DEFAULT_COMPANY): string {
  return `${company.name} ${company.legalForm}`;
}

/**
 * Validate company details completeness
 */
export function validateCompanyDetails(company: CompanyDetails): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    'name',
    'legalForm',
    'address',
    'city',
    'zipCode',
    'hrb',
    'courtOfRegistry',
    'ustIdNr',
  ];

  const missing = required.filter(
    (field) => !company[field as keyof CompanyDetails]
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create signature block
 */
export function createEmailSignature(
  senderName: string,
  senderTitle: string,
  company: CompanyDetails = DEFAULT_COMPANY,
  htmlMode: boolean = false
): string {
  const signatureLine = htmlMode ? '<br>' : '\n';

  return `${senderName}${signatureLine}${senderTitle}${signatureLine}${signatureLine}${
    htmlMode ? generateEmailFooterHTML(company) : generateEmailFooterText(company)
  }`;
}

/**
 * Get minimal footer for inline emails
 */
export function getMinimalEmailFooter(company: CompanyDetails = DEFAULT_COMPANY): string {
  return `${company.name} ${company.legalForm} | ${company.email} | ${company.phone}`;
}
