/**
 * companyInfo — 2MC Gastro firma / iletişim / vergi / banka bilgileri TEK kaynak (NAP).
 *
 * Buradan okuyanlar: sipariş + teklif PDF'leri (angebotPdf.ts), Impressum/yasal
 * sayfalar (pages/info), footer, SEO şemaları (lib/seo.ts → Organization/Store)
 * ve sunucu tarafı HTML üretici (src/seo). Elle kopyalama YOK — Google yerel
 * SEO'da ad/adres/telefon tutarsızlığını cezalandırır.
 *
 * Yasal kimlik (karar 2026-11-06): GmbH DEĞİL — sitede "2MC Gastro" yazılır,
 * altında Inhaber: Metehan Çevik. Sicil bilgileri (HRB, Amtsgericht) boş kaldığı
 * sürece Impressum bu satırları göstermez.
 */
export const COMPANY_INFO = {
  /** PDF başlığı/altbilgisinde ve sitede görünen marka adı. */
  name: '2MC Gastro',
  /** Yasal unvan (Impressum, AGB, Organization.legalName). */
  legalName: '2MC Gastro',
  /** İşletme sahibi (Inhaber) — footer, Impressum, SEO adres bloğu. */
  owner: 'Metehan Çevik',
  street: 'Bergisch Gladbacher Str. 172',
  zip: '51063',
  city: 'Köln',
  region: 'NRW',
  country: 'DE',
  zipCity: '51063 Köln',
  /** Geriye dönük tek satır adres. */
  address: 'Bergisch Gladbacher Str. 172, 51063 Köln',
  /** Kullanıcıya gösterilen ulusal biçim. */
  phone: '0176 70295844',
  /** Uluslararası (E.164) — tel: linkleri, JSON-LD, dizin kayıtları. */
  phoneE164: '+4917670295844',
  /** Okunabilir uluslararası biçim. */
  phoneDisplay: '+49 176 70295844',
  email: 'info@2mcgastro.de',
  website: 'https://www.2mcgastro.de',
  /** USt-IdNr. */
  vat: 'DE365660948',
  /** Steuernummer. */
  taxNumber: '217/5338/1052',
  /** Ticaret sicili — Adem'den gelince doldurulacak (boş = Impressum'da gösterilmez). */
  register: {
    court: '',
    number: '',     // örn. 'HRB 123456'
    managingDirector: '',
  },
  geo: { lat: 50.9648, lng: 7.0273 },
  /** Google/Schema açılış saatleri. */
  openingHours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '18:00' },
  ],
  /** YALNIZ 2MC Gastro'ya ait profiller (kardeş marka 2MC Werbung hesapları buraya YAZILMAZ). */
  sameAs: [] as string[],
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
  /** Kuruluş yılı (Organization.foundingDate). */
  foundingYear: '2010',
} as const;

/** Impressum için sicil satırı hazır mı? */
export function hasRegisterInfo(): boolean {
  const r = COMPANY_INFO.register;
  return !!(r.court && r.number);
}
