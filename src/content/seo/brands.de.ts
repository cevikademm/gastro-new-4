/**
 * brands.de.ts — Almanca marka sayfaları (/marke/{slug}).
 * `brandKeys`: products.json / product_seo'daki `brand` alanını bu markaya eşlemek için
 * küçük-harf anahtarlar (alt markalar dahil).
 */
export interface SeoBrand {
  slug: string;
  name: string;
  /** Ürün verisindeki brand değerlerinin küçük harf ön ekleri. */
  brandKeys: string[];
  source: 'diamond' | 'combisteel' | 'handi';
  country: string;
  founded?: string;
  website: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  sections: Array<{ h2: string; html: string }>;
  subBrands: Array<{ name: string; note: string }>;
  faqs: Array<{ q: string; a: string }>;
  keywords: string[];
}

const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join('');

export const BRANDS_DE: SeoBrand[] = [
  {
    slug: 'diamond',
    name: 'Diamond',
    brandKeys: ['diamond', '01-diverso', 'diverso', '02-diamond silver', '03-diamond gold', '04-diamond platinum'],
    source: 'diamond',
    country: 'Belgien',
    website: 'https://www.diamond-europe.com',
    h1: 'Diamond Gastrogeräte – Kochtechnik, Kühlung & Edelstahl aus Belgien',
    title: 'Diamond Gastro Geräte kaufen – Händler Deutschland',
    description: 'Diamond Europe Großküchentechnik: Serie 600/700/900 Kochgeräte, Kombidämpfer, Kühltechnik, Spültechnik und Edelstahlmöbel. Über 6.900 Diamond-Produkte netto bei 2MC Gastro, Lieferung in ganz Deutschland.',
    intro: 'Diamond Europe aus Belgien ist einer der großen europäischen Hersteller für professionelle Küchentechnik. Das Programm reicht von modularen Kochzeilen der Serien 600, 700 und 900 über Kombidämpfer, Kühlschränke und Kühltische bis zu Spülmaschinen, Pizzaöfen und Edelstahlmöbeln. 2MC Gastro führt über 6.900 Diamond-Artikel in den Qualitätslinien Diverso, Silver, Gold und Platinum – mit deutschen Produktdaten, Netto-Preisen und Lieferung aus dem Zentrallager.',
    sections: [
      {
        h2: 'Diamond Qualitätslinien: Diverso, Silver, Gold, Platinum',
        html: p(
          '<strong>Diverso</strong> ist die Einstiegslinie für Imbiss, Bistro und Start-ups: solide Geräte zum günstigen Preis. <strong>Silver</strong> ist das breite Standardsortiment für Restaurants – Kühlschränke, Kühltische, Fritteusen, Spülmaschinen. <strong>Gold</strong> umfasst die modularen Kochserien 700 und 900 sowie Kombidämpfer und Kühlzellen für den Dauerbetrieb. <strong>Platinum</strong> steht für Großküchentechnik der Serie 900+ mit Kochkesseln, Kippbratpfannen und Bandspülmaschinen.',
        ),
      },
      {
        h2: 'Warum Diamond über 2MC Gastro?',
        html: p(
          'Wir pflegen die Diamond-Daten täglich (Preise, Lagerbestand, Maße, technische Daten) und stellen jedes Gerät mit deutscher Beschreibung, Anschlusswerten und 3D-Modell im Küchenplaner bereit. Kochzeilen der Serien 700 und 900 planen wir modulweise – inklusive Untergestellen, Neutralelementen und Abzugshaube.',
        ),
      },
    ],
    subBrands: [
      { name: 'Diverso', note: 'Einstiegslinie – Imbiss, Bistro, Start-up' },
      { name: 'Diamond Silver', note: 'Standardsortiment Restaurant' },
      { name: 'Diamond Gold', note: 'Modulare Kochserien 700/900, Kombidämpfer' },
      { name: 'Diamond Platinum', note: 'Großküchentechnik Serie 900+' },
    ],
    faqs: [
      { q: 'Woher kommt Diamond?', a: 'Diamond Europe hat seinen Sitz in Belgien und beliefert Fachhändler in ganz Europa. 2MC Gastro ist Diamond-Händler in Deutschland mit Sitz in Köln.' },
      { q: 'Gibt es Ersatzteile für Diamond-Geräte?', a: 'Ja. Ersatzteile und Zubehör bestellen wir über den Hersteller; die passenden Zubehörartikel sind auf jeder Produktseite verlinkt.' },
    ],
    keywords: ['diamond gastro', 'diamond europe', 'diamond gastrogeräte', 'diamond kombidämpfer', 'diamond kühlschrank', 'diamond serie 700'],
  },
  {
    slug: 'combisteel',
    name: 'CombiSteel',
    brandKeys: ['combisteel', 'c0mbisteel', 'combsiteel', 'cs professional', 'cs budget line', 'chefs heat', 'giorik', 'klarco', 'creative kitchen', 'ecofrost', 'isa', 'linum', 'chaysol'],
    source: 'combisteel',
    country: 'Niederlande',
    website: 'https://www.combisteel.com',
    h1: 'CombiSteel Gastrogeräte – Kühltechnik, Edelstahl & Kochgeräte',
    title: 'CombiSteel kaufen – Gastro Geräte Händler Deutschland',
    description: 'CombiSteel Großküchentechnik aus den Niederlanden: Gastro-Kühlschränke, Kühltische, Edelstahlmöbel, Spülmaschinen, Fritteusen und Grills. Über 3.500 CombiSteel-Produkte netto bei 2MC Gastro.',
    intro: 'CombiSteel aus den Niederlanden steht für ein sehr breites Sortiment zu wettbewerbsfähigen Preisen: Kühlschränke und Kühltische, Edelstahl-Arbeitstische und Regale, Fritteusen, Grillplatten, Spülmaschinen, Abzugshauben und Kleingeräte. 2MC Gastro führt über 3.500 CombiSteel-Artikel inklusive der Linien CS Professional, Budget Line, Ecofrost (Kühlung) und Chef’s Heat (Kochgeräte).',
    sections: [
      {
        h2: 'CombiSteel Sortiment im Überblick',
        html: p(
          'Die Stärke von CombiSteel liegt in der Kühltechnik (Ecofrost: Kühlschränke, Kühltische, Tiefkühlschränke mit R290) und den Edelstahlmöbeln (Arbeitstische, Spültische, Regale, Wandschränke im 100-mm-Raster). Dazu kommen Kochgeräte der Serien 600/700 (Chef’s Heat), Spülmaschinen, Pizzaöfen, Lüftungstechnik und ein großes Kleingeräte-Programm für Imbiss und Snackbar.',
        ),
      },
      {
        h2: 'Preis-Leistung für Imbiss, Restaurant und Start-up',
        html: p(
          'CombiSteel ist die richtige Wahl, wenn Budget und Lieferzeit zählen: viele Geräte sind ab Lager in wenigen Werktagen lieferbar. Für Neueröffnungen kombinieren wir CombiSteel-Kühlung und -Möbel mit Diamond-Kochtechnik zu einer kompletten Küche – und planen alles im 3D-Küchenplaner.',
        ),
      },
    ],
    subBrands: [
      { name: 'Ecofrost', note: 'Kühl- und Tiefkühltechnik' },
      { name: 'Chef’s Heat', note: 'Kochgeräte Serie 600/700' },
      { name: 'CS Professional', note: 'Profilinie Edelstahl & Geräte' },
      { name: 'CS Budget Line', note: 'Einstiegslinie' },
      { name: 'Giorik', note: 'Kombidämpfer & Öfen (Italien)' },
    ],
    faqs: [
      { q: 'Ist CombiSteel eine gute Marke für die Gastronomie?', a: 'CombiSteel ist in den Niederlanden und Deutschland eine der meistverkauften Marken für Gastro-Kühlung und Edelstahlmöbel – solide Qualität zu günstigen Preisen, gute Ersatzteilversorgung.' },
      { q: 'Wie schnell liefert 2MC Gastro CombiSteel-Geräte?', a: 'Lagerware in der Regel innerhalb von 3–7 Werktagen per Spedition; die Lieferzeit wird bei jedem Produkt angezeigt.' },
    ],
    keywords: ['combisteel', 'combisteel kühlschrank', 'combisteel kühltisch', 'combisteel händler', 'combisteel gastro', 'combisteel arbeitstisch'],
  },
  {
    slug: 'hendi',
    name: 'HENDI',
    brandKeys: ['hendi', 'handi', 'barup', 'arktic', 'amerbox', 'stöckel', 'stoeckel', 'fine dine'],
    source: 'handi',
    country: 'Niederlande',
    website: 'https://www.hendi.eu',
    h1: 'HENDI Gastronomiebedarf – Kleingeräte, Bar & Küchenhelfer',
    title: 'HENDI kaufen – Gastro Kleingeräte & Küchenbedarf Händler',
    description: 'HENDI Gastronomiebedarf: Kontaktgrills, Fritteusen, Bain-Maries, Bartechnik (BarUp), GN-Behälter (Arktic), Buffetzubehör (AmerBox) und Küchenhelfer. Über 3.700 HENDI-Produkte netto bei 2MC Gastro.',
    intro: 'HENDI aus den Niederlanden ist Europas bekannteste Marke für Gastro-Kleingeräte und Küchenbedarf: Kontaktgrills, Tischfritteusen, Bain-Maries, Toaster, Waffeleisen, Saftpressen, GN-Behälter, Buffetzubehör und Bartechnik. 2MC Gastro führt über 3.700 HENDI-Artikel inklusive der Eigenmarken BarUp (Bar), Arktic (GN & Lagerung), AmerBox (Buffet) und Fine Dine (Geschirr).',
    sections: [
      {
        h2: 'HENDI Marken: BarUp, Arktic, AmerBox, Fine Dine',
        html: p(
          '<strong>BarUp</strong> bündelt Barzubehör und Bartechnik von Shaker bis Eiswürfelbereiter. <strong>Arktic</strong> steht für GN-Behälter, Lagerboxen und Thermoboxen. <strong>AmerBox</strong> liefert Buffet- und Präsentationszubehör, <strong>Fine Dine</strong> Porzellan und Tischkultur. Zusammen mit den HENDI-Elektrokleingeräten deckt das Sortiment die komplette Ausstattung von Bar, Buffet und Imbiss ab.',
        ),
      },
      {
        h2: 'Artikelnummern schnell finden',
        html: p(
          'HENDI-Artikel sind unter ihrer sechsstelligen Artikelnummer (z. B. 263600) bekannt. Geben Sie die Nummer in die Suche ein oder nutzen Sie die Kategorieseiten – jede Produktseite zeigt Artikelnummer, EAN, Maße und Anschlusswerte.',
        ),
      },
    ],
    subBrands: [
      { name: 'BarUp', note: 'Bartechnik & Barzubehör' },
      { name: 'Arktic', note: 'GN-Behälter, Thermoboxen, Lagerung' },
      { name: 'AmerBox', note: 'Buffet- & Präsentationszubehör' },
      { name: 'Fine Dine', note: 'Porzellan & Tischkultur' },
      { name: 'Stöckel', note: 'Nudel- und Teigmaschinen' },
    ],
    faqs: [
      { q: 'Wo finde ich HENDI-Ersatzteile?', a: 'Ersatzteile bestellen wir über die HENDI-Artikelnummer beim Hersteller. Senden Sie uns Artikelnummer und Seriennummer des Geräts.' },
      { q: 'Sind HENDI-Geräte für den Dauerbetrieb geeignet?', a: 'HENDI-Profigeräte sind für den gewerblichen Einsatz ausgelegt; für Dauerbetrieb mit sehr hohem Durchsatz (z. B. Fritteusen in Fast-Food-Ketten) empfehlen wir Standgeräte der Serien 700/900 von Diamond.' },
    ],
    keywords: ['hendi', 'hendi gastro', 'hendi kontaktgrill', 'hendi fritteuse', 'hendi händler', 'hendi gastronomiebedarf', 'barup', 'arktic gn behälter'],
  },
];

export function findBrand(slug: string): SeoBrand | undefined {
  return BRANDS_DE.find((b) => b.slug === slug);
}

/** Ürün verisindeki ham marka adını /marke slug'ına eşler. */
export function brandSlugFor(rawBrand: string | null | undefined, source?: string): string {
  const b = (rawBrand || '').toLowerCase().trim();
  for (const br of BRANDS_DE) {
    if (br.brandKeys.some((k) => b === k || b.startsWith(k))) return br.slug;
  }
  if (source === 'combisteel') return 'combisteel';
  if (source === 'handi') return 'hendi';
  return 'diamond';
}

/** Ürün verisindeki ham marka adını temiz görünen ada çevirir (Diamond Silver → Diamond). */
export function cleanBrandName(rawBrand: string | null | undefined, source?: string): string {
  const slug = brandSlugFor(rawBrand, source);
  const raw = (rawBrand || '').trim();
  const lower = raw.toLowerCase();
  if (slug === 'diamond') return lower.includes('diverso') ? 'Diverso' : 'Diamond';
  if (slug === 'combisteel') {
    if (/^(giorik|klarco|isa|linum|chaysol)/.test(lower)) return raw.replace(/\b\w/g, (c) => c.toUpperCase());
    return 'CombiSteel';
  }
  if (/^barup/.test(lower)) return 'BarUp';
  if (/^arktic/.test(lower)) return 'Arktic';
  if (/^amerbox/.test(lower)) return 'AmerBox';
  if (/^st(ö|oe)ckel/.test(lower)) return 'Stöckel';
  if (/^fine dine/.test(lower)) return 'Fine Dine';
  return 'HENDI';
}
