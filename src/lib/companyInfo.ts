/**
 * companyInfo — 2MC firma/iletişim/vergi/banka bilgileri TEK kaynak.
 * Sipariş + teklif PDF'leri (angebotPdf.ts) ve ilgili UI'lar buradan okur.
 * Veriler ekteki resmi "Angebot/Teklif" dosyasından alınmıştır.
 */
export const COMPANY_INFO = {
  /** PDF başlığı/altbilgisinde görünen marka adı. */
  name: '2MC Gastro',
  /** Yasal kayıt sahibi (Eigentumsvorbehalt vb. resmi metinlerde). */
  legalName: 'Metehan Çevik (2MCWerbung)',
  street: 'Bergisch Gladbacherstraße 172',
  zipCity: '51063 Köln',
  /** Geriye dönük tek satır adres. */
  address: 'Bergisch Gladbacherstraße 172, 51063 Köln',
  phone: '017670295844',
  email: 'info@2mcwerbung.com',
  website: 'www.2mcwerbung.com',
  /** USt-IdNr. */
  vat: 'DE365660948',
  /** Steuernummer. */
  taxNumber: '217/5338/1052',
  bank: {
    holder: 'Metehan Cevik',
    name: 'TARGOBANK',
    iban: 'DE96 3002 0900 5300 8138 98',
    bic: 'CMCIDEDDXXX',
  },
  /** Sol üst köşedeki ana logo (2MC Gastro — WhatsApp marka görseli). */
  logoUrl:
    'https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/WhatsApp_Imagaae_2026-04-06_202604062102.jpeg',
  tagline: 'Alles aus einer Hand. Für deine Küche.',
} as const;
