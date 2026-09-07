/**
 * InfoPage — footer'daki bilgi + yasal sayfaların TEK bileşeni.
 *
 * Rotalar (App.tsx): /about /careers /shipping /newsletter /imprint /privacy
 * /terms /cancellation /cookies. Daha önce bu bağlantılar 404'e düşüyordu.
 *
 * Dil: içerik TR + DE olarak tutulur (yasal metinler Almanya için Almanca
 * bağlayıcıdır); arayüz dili tr ise Türkçe, diğer tüm dillerde Almanca gösterilir.
 * Firma verileri tek kaynaktan (lib/companyInfo.ts) gelir — elle kopyalama yok.
 *
 * NOT: Yasal metinler (Datenschutz/AGB/Widerruf) standart şablon niteliğindedir;
 * yayın öncesi hukuk danışmanı incelemesi önerilir.
 */
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { COMPANY_INFO } from '../../lib/companyInfo';

export type InfoSlug =
  | 'about' | 'careers' | 'shipping' | 'newsletter'
  | 'imprint' | 'privacy' | 'terms' | 'cancellation' | 'cookies';

interface Section { h?: string; p: string[]; list?: string[] }
interface PageContent { title: string; subtitle?: string; sections: Section[] }
type Lang = 'tr' | 'de';

const CONTACT_EMAIL = 'info@2mcgastro.de';
const C = COMPANY_INFO;
const ADDRESS = `${C.street}, ${C.zipCity}`;
/** İçerikten sorumlu gerçek kişi — legalName'in parantezsiz hâli ("Metehan Çevik"). */
const RESPONSIBLE_PERSON = C.register.managingDirector || C.legalName;
const UPDATED = '2026-09-06';
/** Sicil satırları — yalnızca dolu alanlar (HRB gelene kadar numara satırı çıkmaz). */
const REGISTER_DE = [
  C.register.managingDirector ? `Vertreten durch den Geschäftsführer: ${C.register.managingDirector}` : '',
  C.register.court ? `Registergericht: ${C.register.court}` : '',
  C.register.number ? `Handelsregisternummer: ${C.register.number}` : '',
].filter(Boolean);
const registerTr = (t: TFunction) => [
  C.register.managingDirector ? t('info.imprint.register.managingDirector', { name: C.register.managingDirector }) : '',
  C.register.court ? t('info.imprint.register.court', { court: C.register.court }) : '',
  C.register.number ? t('info.imprint.register.number', { number: C.register.number }) : '',
].filter(Boolean);

function buildContent(t: TFunction): Record<InfoSlug, Record<Lang, PageContent>> {
  return {
    about: {
      tr: {
        title: t('info.about.title'),
        subtitle: t('info.about.subtitle'),
        sections: [
          { p: [
            t('info.about.intro1'),
            t('info.about.intro2'),
          ] },
          { h: t('info.about.offering.h'), p: [], list: [
            t('info.about.offering.item1'),
            t('info.about.offering.item2'),
            t('info.about.offering.item3'),
            t('info.about.offering.item4'),
          ] },
          { h: t('info.about.company.h'), p: [], list: [
            C.legalName,
            ADDRESS,
            t('info.about.company.phone', { phone: C.phone }),
            t('info.about.company.email', { email: CONTACT_EMAIL }),
            t('info.about.company.vat', { vat: C.vat }),
          ] },
        ],
      },
      de: {
        title: 'Über uns',
        subtitle: 'Alles aus einer Hand für die Profiküche: Produkte, Planung, Angebot.',
        sections: [
          { p: [
            `2MC Gastro ist ein Anbieter für gewerbliche Küchentechnik mit Sitz in Köln. Für Restaurants, Hotels, Cafés, Catering und Gemeinschaftsverpflegung bündeln wir Produkte führender Hersteller – u. a. Diamond, CombiSteel und HENDI – in einem Katalog.`,
            `Wir verkaufen nicht nur Geräte: Mit unserem 2D/3D-Küchenplaner gestalten wir das Layout gemeinsam, erzeugen aus dem Projekt per Klick ein Angebot und begleiten den Prozess von der Bestellung bis zur Lieferung.`,
          ] },
          { h: 'Unsere Leistungen', p: [], list: [
            'Koch-, Kühl-, Vorbereitungs-, Spül- und Lüftungstechnik',
            'Kostenlose 2D/3D-Küchenplanung und Layout-Beratung',
            'Projektbezogene Angebote, Produktvergleich und Stücklisten (BOM)',
            'Paket- und Palettenversand nach Deutschland und Europa',
          ] },
          { h: 'Unternehmen', p: [], list: [`${C.legalName}`, ADDRESS, `Tel.: ${C.phone}`, `E-Mail: ${CONTACT_EMAIL}`, `USt-IdNr.: ${C.vat}`] },
        ],
      },
    },
    careers: {
      tr: {
        title: t('info.careers.title'),
        subtitle: t('info.careers.subtitle'),
        sections: [
          { p: [
            t('info.careers.p1'),
            t('info.careers.p2', { email: CONTACT_EMAIL }),
          ] },
        ],
      },
      de: {
        title: 'Karriere',
        subtitle: 'Wachsen Sie mit uns in der Welt der Profiküche.',
        sections: [
          { p: [
            'Derzeit sind keine offenen Stellen ausgeschrieben. Initiativbewerbungen in den Bereichen Vertrieb, Projektplanung, Logistik und Software sind jederzeit willkommen.',
            `Senden Sie Lebenslauf und ein kurzes Anschreiben an ${CONTACT_EMAIL} (Betreff „Bewerbung“). Bewerberdaten werden ausschließlich für das Bewerbungsverfahren verarbeitet (siehe Datenschutz).`,
          ] },
        ],
      },
    },
    shipping: {
      tr: {
        title: t('info.shipping.title'),
        subtitle: t('info.shipping.subtitle'),
        sections: [
          { h: t('info.shipping.methods.h'), p: [], list: [
            t('info.shipping.methods.item1'),
            t('info.shipping.methods.item2'),
            t('info.shipping.methods.item3'),
          ] },
          { h: t('info.shipping.duration.h'), p: [
            t('info.shipping.duration.p'),
          ] },
          { h: t('info.shipping.acceptance.h'), p: [
            t('info.shipping.acceptance.p'),
          ] },
          { h: t('info.shipping.fees.h'), p: [
            t('info.shipping.fees.p'),
          ] },
        ],
      },
      de: {
        title: 'Versand & Lieferung',
        subtitle: 'Paket- und Palettenversand, Lieferzeiten und Warenannahme.',
        sections: [
          { h: 'Versandarten', p: [], list: [
            'Kleingeräte: Paketversand mit DHL, UPS oder DPD',
            'Großgeräte: Speditionsversand auf Palette, Lieferung frei Bordsteinkante',
            'Auf Wunsch Vertragen, Montage und Altgerätemitnahme – wird im Angebot separat ausgewiesen',
          ] },
          { h: 'Lieferzeit', p: [
            'Lagerware wird in der Regel innerhalb weniger Werktage versandt. Bei Bestellware kann die Lieferzeit abweichen; die voraussichtliche Lieferzeit teilen wir Ihnen mit der Auftragsbestätigung mit.',
          ] },
          { h: 'Warenannahme und Transportschäden', p: [
            'Bitte prüfen Sie die Verpackung bei Anlieferung. Sichtbare Schäden lassen Sie sich auf dem Lieferschein bestätigen, fotografieren Sie diese nach Möglichkeit und melden Sie sie uns umgehend – andernfalls wird eine Reklamation beim Transporteur erschwert.',
          ] },
          { h: 'Versandkosten', p: [
            'Die Versandkosten richten sich nach Größe, Gewicht und Lieferadresse und werden im Angebot bzw. Warenkorb gesondert ausgewiesen. Alle Preise verstehen sich für Gewerbekunden netto zzgl. MwSt.',
          ] },
        ],
      },
    },
    newsletter: {
      tr: {
        title: t('info.newsletter.title'),
        subtitle: t('info.newsletter.subtitle'),
        sections: [
          { p: [
            t('info.newsletter.p1'),
          ] },
        ],
      },
      de: {
        title: 'Newsletter',
        subtitle: 'Neue Produkte, Aktionen und Branchentrends – einmal im Monat per E-Mail.',
        sections: [
          { p: [
            'Tragen Sie Ihre E-Mail-Adresse einfach in das Formular am Seitenende ein. Kein Spam – Sie können sich jederzeit über den Link in jeder E-Mail abmelden.',
          ] },
        ],
      },
    },
    imprint: {
      tr: {
        title: t('info.imprint.title'),
        subtitle: t('info.imprint.subtitle'),
        sections: [
          { h: t('info.imprint.provider.h'), p: [], list: [
            C.legalName,
            ADDRESS,
            ...registerTr(t),
            t('info.imprint.phone', { phone: C.phone }),
            t('info.imprint.email', { email: CONTACT_EMAIL }),
          ] },
          { h: t('info.imprint.tax.h'), p: [], list: [
            t('info.imprint.tax.vat', { vat: C.vat }),
            t('info.imprint.tax.number', { taxNumber: C.taxNumber }),
          ] },
          { h: t('info.imprint.responsible.h'), p: [], list: [RESPONSIBLE_PERSON, ADDRESS] },
          { h: t('info.imprint.odr.h'), p: [
            t('info.imprint.odr.p'),
          ] },
          { h: t('info.imprint.liability.h'), p: [
            t('info.imprint.liability.p'),
          ] },
        ],
      },
      de: {
        title: 'Impressum',
        subtitle: 'Angaben gemäß § 5 DDG.',
        sections: [
          { h: 'Anbieter', p: [], list: [C.legalName, ADDRESS, ...REGISTER_DE, `Telefon: ${C.phone}`, `E-Mail: ${CONTACT_EMAIL}`] },
          { h: 'Steuerangaben', p: [], list: [`Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${C.vat}`, `Steuernummer: ${C.taxNumber}`] },
          { h: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV', p: [], list: [RESPONSIBLE_PERSON, ADDRESS] },
          { h: 'EU-Streitschlichtung', p: [
            'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
          ] },
          { h: 'Haftung für Inhalte und Links', p: [
            'Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Für Inhalte externer Links ist stets der jeweilige Anbieter verantwortlich.',
          ] },
        ],
      },
    },
    privacy: {
      tr: {
        title: t('info.privacy.title'),
        subtitle: t('info.privacy.subtitle'),
        sections: [
          { h: t('info.privacy.controller.h'), p: [], list: [
            C.legalName,
            ADDRESS,
            t('info.privacy.controller.email', { email: CONTACT_EMAIL }),
          ] },
          { h: t('info.privacy.hosting.h'), p: [
            t('info.privacy.hosting.p'),
          ] },
          { h: t('info.privacy.data.h'), p: [
            t('info.privacy.data.p'),
          ] },
          { h: t('info.privacy.payment.h'), p: [
            t('info.privacy.payment.p'),
          ] },
          { h: t('info.privacy.contact.h'), p: [
            t('info.privacy.contact.p'),
          ] },
          { h: t('info.privacy.cookies.h'), p: [
            t('info.privacy.cookies.p'),
          ] },
          { h: t('info.privacy.rights.h'), p: [
            t('info.privacy.rights.p'),
          ] },
        ],
      },
      de: {
        title: 'Datenschutzerklärung',
        subtitle: 'Wie wir Ihre personenbezogenen Daten nach DSGVO verarbeiten.',
        sections: [
          { h: '1. Verantwortlicher', p: [], list: [C.legalName, ADDRESS, `E-Mail: ${CONTACT_EMAIL}`] },
          { h: '2. Hosting und Server-Logfiles', p: [
            'Die Website wird bei Vercel Inc. gehostet. Bei jedem Zugriff werden IP-Adresse, Datum/Uhrzeit, aufgerufene Seite, Browser und Betriebssystem technisch bedingt in Server-Logfiles gespeichert (Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse am sicheren Betrieb) und nach kurzer Zeit gelöscht.',
          ] },
          { h: '3. Konto-, Projekt- und Bestelldaten', p: [
            'Bei der Registrierung speichern wir Name, E-Mail, Firma und Kontaktdaten sowie Ihre Projekte, Angebote und Bestellungen bei Supabase (Datenbank und Authentifizierung). Zweck ist die Anbahnung und Durchführung des Vertrags (Art. 6 Abs. 1 lit. b DSGVO). Die Daten werden bis zur Löschung Ihres Kontos bzw. bis zum Ablauf gesetzlicher Aufbewahrungsfristen gespeichert.',
          ] },
          { h: '4. Zahlung', p: [
            'Kartenzahlungen werden von Stripe Payments Europe Ltd. abgewickelt; Kartendaten erreichen uns nicht. Stripe ist im Rahmen seiner eigenen Datenschutzerklärung Verantwortlicher.',
          ] },
          { h: '5. Kontakt und Support', p: [
            'Angaben aus dem Supportformular oder per E-Mail verarbeiten wir zur Bearbeitung Ihrer Anfrage (Art. 6 Abs. 1 lit. b und f DSGVO) und löschen sie nach Abschluss der Korrespondenz innerhalb einer angemessenen Frist.',
          ] },
          { h: '6. Cookies und Nutzungsanalyse', p: [
            'Technisch notwendige Cookies bzw. Speicherungen (Sitzung, Sprache, Warenkorb, Cookie-Einstellung) benötigen keine Einwilligung. Die Nutzungsanalyse (PostHog) wird nur aktiviert, wenn Sie im Cookie-Banner zustimmen; ohne Einwilligung bleibt das Tracking deaktiviert. Details finden Sie auf der Seite „Cookies".',
          ] },
          { h: '7. Ihre Rechte', p: [
            'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch; eine erteilte Einwilligung können Sie jederzeit widerrufen. Wenden Sie sich dazu an die oben genannte E-Mail-Adresse. Außerdem steht Ihnen ein Beschwerderecht bei einer Aufsichtsbehörde zu (z. B. Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen).',
          ] },
        ],
      },
    },
    terms: {
      tr: {
        title: t('info.terms.title'),
        subtitle: t('info.terms.subtitle'),
        sections: [
          { h: t('info.terms.scope.h'), p: [
            t('info.terms.scope.p', { legalName: C.legalName }),
          ] },
          { h: t('info.terms.contract.h'), p: [
            t('info.terms.contract.p'),
          ] },
          { h: t('info.terms.price.h'), p: [
            t('info.terms.price.p'),
          ] },
          { h: t('info.terms.delivery.h'), p: [
            t('info.terms.delivery.p'),
          ] },
          { h: t('info.terms.warranty.h'), p: [
            t('info.terms.warranty.p'),
          ] },
          { h: t('info.terms.liability.h'), p: [
            t('info.terms.liability.p'),
          ] },
          { h: t('info.terms.platform.h'), p: [
            t('info.terms.platform.p'),
          ] },
          { h: t('info.terms.law.h'), p: [
            t('info.terms.law.p'),
          ] },
        ],
      },
      de: {
        title: 'Allgemeine Geschäftsbedingungen (AGB)',
        subtitle: 'Allgemeine Verkaufs- und Nutzungsbedingungen für Gewerbekunden.',
        sections: [
          { h: '1. Geltungsbereich', p: [
            `Diese Bedingungen gelten für alle Angebote, Bestellungen und Lieferungen zwischen ${C.legalName} („2MC Gastro") und dem Kunden. Die Plattform richtet sich vorrangig an Unternehmer i. S. d. § 14 BGB; Preise werden netto zzgl. MwSt. ausgewiesen.`,
          ] },
          { h: '2. Vertragsschluss', p: [
            'Produktdarstellungen auf der Website sind keine verbindlichen Angebote. Ihre Bestellung stellt ein Angebot dar; der Vertrag kommt durch unsere Auftragsbestätigung oder die Lieferung zustande. Auf der Plattform erzeugte Angebote gelten für die dort genannte Frist.',
          ] },
          { h: '3. Preise und Zahlung', p: [
            'Alle Preise verstehen sich in Euro zuzüglich Versandkosten. Die Zahlung erfolgt per Vorkasse, Karte (Stripe) oder nach Vereinbarung auf Rechnung. Bei Zahlungsverzug gelten die gesetzlichen Verzugszinsen.',
          ] },
          { h: '4. Lieferung und Eigentumsvorbehalt', p: [
            'Lieferzeiten sind unverbindlich und werden mit der Auftragsbestätigung mitgeteilt. Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum. Bei Unternehmern geht die Gefahr mit Übergabe an das Transportunternehmen auf den Kunden über.',
          ] },
          { h: '5. Gewährleistung', p: [
            'Es gelten die gesetzlichen Gewährleistungsrechte. Unternehmer haben die Ware unverzüglich zu untersuchen und offensichtliche Mängel unverzüglich anzuzeigen (§ 377 HGB). Herstellergarantien bleiben unberührt.',
          ] },
          { h: '6. Haftung', p: [
            'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden an Leben, Körper und Gesundheit. Im Übrigen ist die Haftung auf die Verletzung wesentlicher Vertragspflichten und den vorhersehbaren, vertragstypischen Schaden begrenzt.',
          ] },
          { h: '7. Nutzung der Plattform', p: [
            'Zugangsdaten sind vertraulich zu behandeln. Planungswerkzeug und Katalogdaten dürfen nur für eigene Projekte genutzt werden; das massenhafte Kopieren oder automatisierte Auslesen von Inhalten ist untersagt.',
          ] },
          { h: '8. Anwendbares Recht', p: [
            'Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts (CISG). Gerichtsstand für Kaufleute ist Köln.',
          ] },
        ],
      },
    },
    cancellation: {
      tr: {
        title: t('info.cancellation.title'),
        subtitle: t('info.cancellation.subtitle'),
        sections: [
          { h: t('info.cancellation.who.h'), p: [
            t('info.cancellation.who.p'),
          ] },
          { h: t('info.cancellation.info.h'), p: [
            t('info.cancellation.info.p1'),
            t('info.cancellation.info.p2'),
          ] },
          { h: t('info.cancellation.form.h'), p: [], list: [
            t('info.cancellation.form.to', { legalName: C.legalName, address: ADDRESS, email: CONTACT_EMAIL }),
            t('info.cancellation.form.item1'),
            t('info.cancellation.form.item2'),
            t('info.cancellation.form.item3'),
          ] },
        ],
      },
      de: {
        title: 'Widerrufsbelehrung',
        subtitle: 'Vierzehntägiges Widerrufsrecht für Verbraucher.',
        sections: [
          { h: 'Für wen gilt das Widerrufsrecht?', p: [
            'Das gesetzliche Widerrufsrecht steht ausschließlich Verbrauchern (§ 13 BGB) zu. Für Unternehmer (§ 14 BGB), die zu gewerblichen Zwecken bestellen, besteht kein gesetzliches Widerrufsrecht; Rücknahmen erfolgen nur nach gesonderter Vereinbarung.',
          ] },
          { h: 'Widerrufsbelehrung', p: [
            'Verbraucher haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Frist beginnt mit dem Tag, an dem Sie oder ein von Ihnen benannter Dritter die Ware in Besitz genommen haben. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Anschrift und E-Mail unten) mittels einer eindeutigen Erklärung (z. B. E-Mail) über Ihren Entschluss informieren; das Muster-Widerrufsformular kann verwendet werden, ist aber nicht vorgeschrieben.',
            'Im Fall des Widerrufs erstatten wir alle erhaltenen Zahlungen einschließlich der Standard-Lieferkosten binnen vierzehn Tagen ab Zugang des Widerrufs. Wir können die Rückzahlung verweigern, bis wir die Ware zurückerhalten haben oder Sie den Rückversand nachgewiesen haben. Sie haben die Ware binnen vierzehn Tagen zurückzusenden; bei Speditionsware (Palette) tragen Sie die unmittelbaren Kosten der Rücksendung. Für einen Wertverlust, der auf einen zur Prüfung von Beschaffenheit, Eigenschaften und Funktionsweise nicht notwendigen Umgang zurückgeht, kommen Sie auf.',
          ] },
          { h: 'Muster-Widerrufsformular', p: [], list: [
            `An: ${C.legalName}, ${ADDRESS}, ${CONTACT_EMAIL}`,
            'Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden Waren: (Produkt / Bestellnummer)',
            'Bestellt am / erhalten am: …',
            'Name und Anschrift des/der Verbraucher(s), Datum, Unterschrift (nur bei Mitteilung auf Papier)',
          ] },
        ],
      },
    },
    cookies: {
      tr: {
        title: t('info.cookies.title'),
        subtitle: t('info.cookies.subtitle'),
        sections: [
          { p: [
            t('info.cookies.intro'),
          ] },
          { h: t('info.cookies.essential.h'), p: [], list: [
            t('info.cookies.essential.item1'),
            t('info.cookies.essential.item2'),
            t('info.cookies.essential.item3'),
          ] },
          { h: t('info.cookies.functional.h'), p: [], list: [
            t('info.cookies.functional.item1'),
            t('info.cookies.functional.item2'),
          ] },
          { h: t('info.cookies.analytics.h'), p: [], list: [
            t('info.cookies.analytics.item1'),
          ] },
          { h: t('info.cookies.thirdParty.h'), p: [], list: [
            t('info.cookies.thirdParty.item1'),
            t('info.cookies.thirdParty.item2'),
          ] },
          { h: t('info.cookies.changePreference.h'), p: [
            t('info.cookies.changePreference.p'),
          ] },
        ],
      },
      de: {
        title: 'Cookie-Richtlinie',
        subtitle: 'Eingesetzte Cookies und Browser-Speicherung.',
        sections: [
          { p: [
            'Diese Website nutzt neben klassischen Cookies auch den lokalen Speicher Ihres Browsers (localStorage). Nachfolgend die Kategorien und ihre Zwecke.',
          ] },
          { h: 'Notwendig (keine Einwilligung erforderlich)', p: [], list: [
            'Sitzung / Authentifizierung (Supabase Auth, „2mc-gastro-auth") – um Sie nach dem Login zu erkennen',
            'Spracheinstellung („2mc_lang") – zur Anzeige in der gewählten Sprache',
            'Cookie-Einstellung („consent-state") – um Ihre Entscheidung zu speichern',
          ] },
          { h: 'Funktional', p: [], list: [
            'Warenkorb („2mc-cart"), Favoriten, Vergleichsliste und Projektentwürfe („2mc-gastro-projects") – damit Ihre Arbeit beim Neuladen erhalten bleibt',
            'Oberflächeneinstellungen („2mc-gastro-ui") – z. B. Theme und Panel-Zustand',
          ] },
          { h: 'Analyse (nur mit Einwilligung)', p: [], list: [
            'PostHog („ph_*") – Seitenaufrufe und Nutzungsstatistik; wird ohne Zustimmung im Cookie-Banner nicht aktiviert',
          ] },
          { h: 'Drittanbieter', p: [], list: [
            'Stripe – Betrugspräventions-Cookies auf der Zahlungsseite',
            'Supabase Storage / Amazon S3 – Produktbilder und 3D-Modelle (setzt keine Cookies)',
          ] },
          { h: 'Einstellungen ändern', p: [
            'Sie können Cookies und Website-Daten jederzeit in Ihren Browsereinstellungen löschen. Zum Widerruf Ihrer Einwilligung genügt das Löschen der Website-Daten; beim nächsten Besuch erscheint das Cookie-Banner erneut.',
          ] },
        ],
      },
    },
  };
}

const RELATED: Array<{ slug: InfoSlug; tr: string; de: string }> = [
  { slug: 'imprint', tr: 'Künye', de: 'Impressum' },
  { slug: 'privacy', tr: 'Gizlilik', de: 'Datenschutz' },
  { slug: 'terms', tr: 'Kullanım Koşulları', de: 'AGB' },
  { slug: 'cancellation', tr: 'Cayma Hakkı', de: 'Widerruf' },
  { slug: 'cookies', tr: 'Çerezler', de: 'Cookies' },
  { slug: 'shipping', tr: 'Kargo & Teslimat', de: 'Versand' },
];

const PATH: Record<InfoSlug, string> = {
  about: '/about', careers: '/careers', shipping: '/shipping', newsletter: '/newsletter',
  imprint: '/imprint', privacy: '/privacy', terms: '/terms', cancellation: '/cancellation', cookies: '/cookies',
};

export default function InfoPage({ slug }: { slug: InfoSlug }) {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.toLowerCase().startsWith('tr') ? 'tr' : 'de';
  const CONTENT = useMemo(() => buildContent(t), [t, i18n.language]);
  const page = CONTENT[slug][lang];

  useEffect(() => {
    const prev = document.title;
    document.title = `${page.title} | 2MC Gastro`;
    window.scrollTo({ top: 0 });
    return () => { document.title = prev; };
  }, [page.title]);

  const scrollToNewsletter = () => {
    document.getElementById('newsletter')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <article className="max-w-3xl mx-auto w-full py-4 sm:py-8">
      <header className="mb-8 border-b border-outline-variant/20 pb-6">
        <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{page.title}</h1>
        {page.subtitle && <p className="mt-2 text-on-surface-variant">{page.subtitle}</p>}
        <p className="mt-3 text-xs text-on-surface-variant">
          {lang === 'tr' ? 'Son güncelleme' : 'Stand'}: {UPDATED}
        </p>
      </header>

      <div className="space-y-7">
        {page.sections.map((s, i) => (
          <section key={i}>
            {s.h && <h2 className="font-headline font-bold text-lg text-on-surface mb-2">{s.h}</h2>}
            {s.p.map((text, j) => (
              <p key={j} className="text-on-surface leading-relaxed mb-3">{text}</p>
            ))}
            {s.list && (
              <ul className="list-disc pl-5 space-y-1.5 text-on-surface leading-relaxed">
                {s.list.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>

      {slug === 'newsletter' && (
        <button
          type="button"
          onClick={scrollToNewsletter}
          className="mt-6 inline-flex items-center px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {lang === 'tr' ? 'Abonelik formuna git' : 'Zum Anmeldeformular'}
        </button>
      )}

      <nav aria-label={lang === 'tr' ? 'İlgili sayfalar' : 'Weitere Seiten'} className="mt-12 pt-6 border-t border-outline-variant/20 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {RELATED.filter((r) => r.slug !== slug).map((r) => (
          <Link key={r.slug} to={PATH[r.slug]} className="text-primary hover:underline">{r[lang]}</Link>
        ))}
        <Link to="/support" className="text-primary hover:underline">{lang === 'tr' ? 'İletişim' : 'Kontakt'}</Link>
      </nav>
    </article>
  );
}
