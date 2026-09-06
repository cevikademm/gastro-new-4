/**
 * branchen.de.ts — İşletme türü (Geschäftsart) sayfaları: /branche/{slug}
 * GGM'nin 23 "Geschäftsart" sayfasına karşılık; her sayfa Planungsgrundlagen,
 * Pflichtausstattung (kategori linkli), 3 örnek konfigürasyon, Vorschriften (dış link)
 * ve FAQ taşır. Metinler AI taslağı; Adem onayı → docs/seo/inceleme-listesi.md
 */
export interface BrancheConfig { name: string; items: string[] }
export interface SeoBranche {
  slug: string;
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  /** Planlama temelleri (m²/Sitzplatz, Zonen …) */
  planning: string[];
  /** Zorunlu ekipman — {label, path} kategori linkleri */
  equipment: Array<{ label: string; path: string; note?: string }>;
  configs: BrancheConfig[];
  /** Vorschriften — dış linkler (otoriter kaynak) */
  regulations: Array<{ label: string; url: string; note: string }>;
  faqs: Array<{ q: string; a: string }>;
  keywords: string[];
  /** Eski /sektor slug'ı (301) */
  legacySegments?: string[];
  published: boolean;
}

const HACCP = { label: 'Verordnung (EG) Nr. 852/2004 – Lebensmittelhygiene', url: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32004R0852', note: 'HACCP-Grundsätze, Trennung rein/unrein, Handwaschbecken' };
const VDI = { label: 'VDI 2052 – Raumlufttechnik Küchen', url: 'https://www.vdi.de/richtlinien/details/vdi-2052-blatt-1-raumlufttechnische-anlagen-fuer-kuechen', note: 'Auslegung von Abzugshauben und Zuluft' };
const DGUV = { label: 'DGUV Regel 110-003 – Arbeiten in Küchenbetrieben', url: 'https://publikationen.dguv.de/regelwerk/dguv-regeln/1029/branche-kuechenbetriebe', note: 'Arbeitssicherheit, Verkehrswege, Fritteusen' };
const LMHV = { label: 'Lebensmittelhygiene-Verordnung (LMHV)', url: 'https://www.gesetze-im-internet.de/lmhv_2007/', note: 'Nationale Hygieneanforderungen und Schulungspflicht' };
const DIN10506 = { label: 'DIN 10506 – Lebensmittelhygiene in der Gemeinschaftsverpflegung', url: 'https://www.din.de/de/mitwirken/normenausschuesse/nal/veroeffentlichungen/wdc-beuth:din21:296581694', note: 'Temperaturen, Warmhaltung, Cook & Chill' };

export const BRANCHEN_DE: SeoBranche[] = [
  {
    slug: 'restaurant',
    name: 'Restaurant',
    h1: 'Restaurantküche einrichten: Ausstattung, Planung, Kosten',
    title: 'Restaurant Küche Ausstattung – Planung & Geräte vom Profi',
    description: 'Restaurantküche einrichten: Grundausstattung nach Sitzplätzen, Kochzeile 700/900, Kühlung, Spültechnik, Lüftung und Edelstahlmöbel – mit Beispielkonfigurationen, Vorschriften und kostenloser 3D-Planung von 2MC Gastro.',
    intro: 'Eine Restaurantküche muss zu Speisekarte, Sitzplätzen und Personal passen – nicht umgekehrt. Als Faustregel gelten 0,5 bis 0,8 m² Küchenfläche pro Sitzplatz und ein Verhältnis von etwa 1:3 zwischen Küche und Gastraum. Auf dieser Seite finden Sie die Grundausstattung für Restaurants mit 40 bis 150 Sitzplätzen, drei Beispielkonfigurationen und die wichtigsten Vorschriften. Alle Geräte planen wir kostenlos in 2D/3D in Ihren Grundriss.',
    planning: [
      'Küchenfläche: 0,5–0,8 m² pro Sitzplatz; bei 80 Plätzen also 40–65 m² inklusive Lager und Spülküche',
      'Zonen in Arbeitsrichtung: Wareneingang → Lager/Kühlung → Vorbereitung → Kochzeile → Pass → Spülküche',
      'Kochzeile Serie 700 für bis ca. 100 Gedecke pro Service, Serie 900 darüber oder bei Bankettgeschäft',
      'Strom: 400 V mit 32–63 A für Kombidämpfer, Spülmaschine und Kühlung; Gas für Herd und Grill wenn vorhanden',
      'Abluft nach VDI 2052 über der gesamten Kochzeile, Zuluft nicht vergessen',
    ],
    equipment: [
      { label: 'Kombidämpfer 10 GN', path: '/kochgeraete/kombidaempfer', note: 'Herzstück für Braten, Gemüse, Regenerieren' },
      { label: 'Gasherd 4–6 Flammen mit Backofen', path: '/kochgeraete/herde-und-kochkessel' },
      { label: 'Doppelfritteuse 2×10 Liter', path: '/kochgeraete/fritteusen' },
      { label: 'Grillplatte & Salamander', path: '/kochgeraete/grillgeraete' },
      { label: 'Kühltisch am Pass, Kühlschränke, Tiefkühlschrank', path: '/kuehlung' },
      { label: 'Haubenspülmaschine mit Zu-/Ablauftisch', path: '/spueltechnik/haubenspuelmaschinen' },
      { label: 'Arbeitstische, Spültisch, Handwaschbecken, Regale', path: '/edelstahlmoebel' },
      { label: 'Wandhaube mit Ventilator', path: '/lueftung/wandhauben' },
      { label: 'Gemüseschneider, Vakuumierer, Stabmixer', path: '/lebensmittelverarbeitung' },
    ],
    configs: [
      { name: 'Bistro / kleines Restaurant (40 Plätze)', items: ['Kombidämpfer 6 GN', 'Elektroherd 4 Platten Serie 600', 'Fritteuse 10 L', 'Kontaktgrill', 'Kühltisch 3 Türen', 'Kühlschrank 700 L + Tiefkühlschrank 700 L', 'Fronteinschub-Spülmaschine', 'Wandhaube 2,0 m'] },
      { name: 'Restaurant Standard (80 Plätze)', items: ['Kombidämpfer 10 GN', 'Gasherd 6 Flammen mit Backofen Serie 700', 'Doppelfritteuse 2×10 L', 'Grillplatte 800 mm + Salamander', 'Kühltisch 4 Türen am Pass', '2× Kühlschrank 1.400 L, Tiefkühlschrank 1.400 L', 'Haubenspülmaschine + Tische', 'Wandhaube 3,5 m', 'Gemüseschneider, Vakuumierer'] },
      { name: 'Restaurant mit Bankett (150 Plätze)', items: ['2× Kombidämpfer 10 GN oder 1× 20 GN', 'Kochzeile Serie 900: Herd, Kippbratpfanne, Kochkessel', 'Schockfroster 10 GN', 'Kühlzelle 10 m³ + Tiefkühlzelle 6 m³', 'Haubenspülmaschine + Topfspüler', 'Inselhaube 4 m', 'Bankettwagen, Hordenwagen'] },
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: 'Was kostet die Kücheneinrichtung für ein Restaurant mit 80 Plätzen?', a: 'Mit Markengeräten (Diamond/CombiSteel) liegt eine komplette Neuausstattung inklusive Kochzeile, Kühlung, Spültechnik, Möbeln und Lüftung typischerweise im mittleren fünfstelligen Bereich netto. Über unseren Küchenplaner erhalten Sie ein exaktes Angebot für Ihren Grundriss.' },
      { q: 'Wie groß muss die Küche für 80 Sitzplätze sein?', a: 'Rechnen Sie mit 40–65 m² inklusive Lager, Kühlung und Spülküche. Bei kleiner Karte und Cook-&-Chill-Produktion kann es weniger sein.' },
      { q: 'Kann ich meine Restaurantküche selbst planen?', a: 'Ja. Mit dem kostenlosen 3D-Küchenplaner von 2MC Gastro zeichnen Sie Wände, Türen und Fenster, platzieren Geräte in Originalmaßen und erzeugen aus dem Projekt ein Angebot.' },
    ],
    keywords: ['restaurantküche einrichten', 'restaurant küche ausstattung', 'restaurant einrichtung küche', 'gastronomieküche planen', 'restaurant eröffnen ausstattung'],
    legacySegments: ['restoran'],
    published: true,
  },
  {
    slug: 'hotel',
    name: 'Hotel',
    h1: 'Hotelküche & Hotelausstattung: Frühstück, Bankett, Wäscherei',
    title: 'Hotelküche Ausstattung – Frühstücksbuffet, Bankett, Wäscherei',
    description: 'Hotelküche einrichten: Frühstücksbuffet, à-la-carte- und Bankettküche, Cook & Chill, Roomservice und Wäschereitechnik für Hotels von 20 bis 200 Zimmern. Beispielkonfigurationen, Vorschriften, 3D-Planung.',
    intro: 'Hotels betreiben mehrere Küchen in einer: Frühstück für alle Gäste in kurzer Zeit, à la carte am Abend, Bankett und Tagung mit Spitzenlast. Dazu kommen Roomservice, Bar und Wäscherei. Die Ausstattung muss diese Spitzen abfangen – mit Cook & Chill, ausreichend Kühlung und einer Ausgabe, die 100 Frühstücksgäste in 90 Minuten bewältigt.',
    planning: [
      'Frühstück: pro 50 Zimmer ein Buffetmodul (gekühlt + warm), Kaffeevollautomat mit Festwasser, Durchlauftoaster, Saftdispenser',
      'Produktion: Kombidämpfer 10/20 GN + Schockfroster für Bankettvorbereitung (Cook & Chill)',
      'Kühlung: Kühlzelle ab 10 m³ und Tiefkühlzelle ab 6 m³ bei über 50 Zimmern',
      'Spülküche: Haubenspülmaschine, bei Bankett Bandspülmaschine; Gläserspüler an der Bar',
      'Wäscherei: 2–3 kg Wäsche pro Zimmer und Tag → gewerbliche Waschmaschine 10–20 kg + Trockner + Mangel',
    ],
    equipment: [
      { label: 'Frühstücksbuffet-Module & Drop-in-Elemente', path: '/ausgabe-und-buffet' },
      { label: 'Kaffeevollautomat, Saftdispenser', path: '/kaffee-und-bar/kaffeemaschinen' },
      { label: 'Kombidämpfer 10/20 GN + Schockfroster', path: '/cook-and-chill' },
      { label: 'Kühlzellen, Kühlschränke, Minibar', path: '/kuehlung' },
      { label: 'Haubenspülmaschine, Gläserspüler', path: '/spueltechnik' },
      { label: 'Roomservice-Wagen, Housekeeping', path: '/hotelbedarf' },
      { label: 'Gewerbliche Waschmaschine, Trockner, Mangel', path: '/waeschereitechnik' },
      { label: 'Edelstahlmöbel & Lüftung', path: '/edelstahlmoebel' },
    ],
    configs: [
      { name: 'Garni-Hotel (30 Zimmer, nur Frühstück)', items: ['Buffetmodul gekühlt 3 GN + warm 2 GN', 'Kaffeevollautomat 200 Tassen/Tag', 'Durchlauftoaster, Eierkocher', 'Kühlschrank 1.400 L', 'Fronteinschub-Spülmaschine', 'Waschmaschine 10 kg + Trockner'] },
      { name: 'Stadthotel (80 Zimmer, Restaurant)', items: ['2 Buffetmodule', 'Kombidämpfer 10 GN + Schockfroster 5 GN', 'Kochzeile Serie 700', 'Kühlzelle 10 m³ + Tiefkühlzelle 6 m³', 'Haubenspülmaschine + Gläserspüler Bar', 'Waschmaschine 20 kg, Trockner, Muldenmangel'] },
      { name: 'Tagungshotel (150 Zimmer, Bankett)', items: ['Kombidämpfer 20 GN + 10 GN, Schockfroster 20 GN', 'Kochzeile Serie 900 mit Kessel und Kippbratpfanne', 'Bandspülmaschine', 'Kühlzellen 20 m³ + 10 m³', 'Bankettwagen, Hordenwagen', '2× Waschmaschine 20 kg, 2× Trockner, Mangel'] },
    ],
    regulations: [HACCP, DIN10506, VDI, DGUV],
    faqs: [
      { q: 'Wie plane ich das Frühstücksbuffet für 100 Gäste?', a: 'Zwei Buffetlinien oder eine Insel mit beidseitigem Zugriff, gekühlte Elemente für Aufschnitt/Milchprodukte, Warmhaltung für Eierspeisen, Kaffeevollautomat mit mindestens 200 Tassen/Tag und ein Durchlauftoaster. Wir planen das Buffet maßstabsgetreu im 3D-Planer.' },
      { q: 'Lohnt sich eine eigene Wäscherei im Hotel?', a: 'Ab etwa 30–40 Zimmern amortisiert sich eine eigene Wäscherei mit gewerblicher Waschmaschine, Trockner und Mangel meist innerhalb von 2–3 Jahren gegenüber externer Wäscherei.' },
    ],
    keywords: ['hotelküche ausstattung', 'hotel küche einrichten', 'hotelausstattung', 'frühstücksbuffet hotel ausstattung', 'hotel wäscherei einrichten'],
    legacySegments: ['otel'],
    published: true,
  },
  {
    slug: 'catering-partyservice',
    name: 'Catering & Partyservice',
    h1: 'Catering-Küche einrichten: Produktion, Transport, Ausgabe',
    title: 'Catering Küche Ausstattung – Cook & Chill, Thermoboxen, Bankett',
    description: 'Cateringküche und Partyservice ausstatten: Kombidämpfer, Schockfroster, Vakuumierer, Thermoboxen, Bankettwagen und mobile Ausgabe – für Caterer von 100 bis 2.000 Portionen pro Tag.',
    intro: 'Catering bedeutet Produktion an einem Ort und Ausgabe an einem anderen. Die Küche ist auf Vorproduktion (Cook & Chill), sichere Lagerung, Verpackung und Transport ausgelegt; vor Ort braucht es mobile Warmhaltung und Ausgabe. Wir stellen Ausstattungen für Partyservice, Eventcatering und Betriebsverpflegung zusammen.',
    planning: [
      'Produktion: Kombidämpfer 20 GN und Schockfroster im GN-Raster mit gemeinsamen Hordenwagen',
      'Verpackung: Kammervakuumierer, Siegelgeräte, GN-Behälter mit Deckeln, Thermoboxen',
      'Lager: Kühlzelle und Tiefkühlzelle nach Wochenproduktion, Trockenlager',
      'Transport: Thermoboxen, Bankettwagen, Kühltransportboxen, Fahrzeugkühlung',
      'Vor Ort: Chafing Dishes, Bain-Maries, mobile Induktion, Kühlvitrinen, Kaffeemaschinen',
    ],
    equipment: [
      { label: 'Kombidämpfer 20 GN & Schockfroster', path: '/cook-and-chill' },
      { label: 'Kammervakuumierer', path: '/lebensmittelverarbeitung/vakuumierer' },
      { label: 'Kühlzellen & Tiefkühlzellen', path: '/kuehlung/kuehlzellen' },
      { label: 'GN-Behälter, Thermoboxen, Bankettwagen', path: '/gn-behaelter-und-wagen' },
      { label: 'Chafing Dishes, Bain-Maries, Wärmebrücken', path: '/kochgeraete/warmhaltegeraete' },
      { label: 'Mobile Kochgeräte, Induktion', path: '/kochgeraete' },
      { label: 'Kaffeemaschinen, Saftdispenser', path: '/kaffee-und-bar' },
    ],
    configs: [
      { name: 'Partyservice (bis 200 Portionen)', items: ['Kombidämpfer 10 GN', 'Schockfroster 5 GN', 'Vakuumierer 10 m³/h', 'Kühlschrank 1.400 L + Tiefkühlschrank', '10 Thermoboxen GN 1/1', 'Chafing Dishes, Induktionsplatten'] },
      { name: 'Eventcatering (bis 800 Portionen)', items: ['Kombidämpfer 20 GN + 10 GN', 'Schockfroster 20 GN', 'Kühlzelle 15 m³, Tiefkühlzelle 8 m³', 'Kippbratpfanne, Kochkessel 100 L', 'Bankettwagen, Thermoboxen', 'Haubenspülmaschine + Topfspüler'] },
      { name: 'Betriebsverpflegung (2.000 Portionen)', items: ['2× Kombidämpfer 20 GN', '2× Schockfroster 20 GN', 'Kochkessel 200 L, Kippbratpfanne 120 L', 'Kühlzellen 30 m³', 'Bandspülmaschine', 'Kühltransportboxen, Fahrzeugausrüstung'] },
    ],
    regulations: [HACCP, DIN10506, LMHV],
    faqs: [
      { q: 'Wie lange darf Catering-Ware warm gehalten werden?', a: 'Warmspeisen müssen über 65 °C gehalten und innerhalb von 3 Stunden nach Erhitzen ausgegeben werden. Kaltspeisen maximal 7 °C. Cook & Chill mit Regenerieren vor Ort ist die sicherere Alternative.' },
      { q: 'Welche Thermoboxen für den Transport?', a: 'GN-1/1-Thermoboxen aus EPP für Frontlader (Kombidämpfer-Ausgabe) oder Toplader (Buffet); für lange Wege Boxen mit Heiz- oder Kühlelement.' },
    ],
    keywords: ['catering küche ausstattung', 'catering ausstattung', 'partyservice ausstattung', 'cateringküche einrichten', 'catering equipment'],
    legacySegments: ['catering'],
    published: true,
  },
  {
    slug: 'cafe-bistro',
    name: 'Café & Bistro',
    h1: 'Café und Bistro einrichten: Kaffeetechnik, Kühlvitrine, Snackküche',
    title: 'Café Ausstattung – Kaffeemaschine, Kuchenvitrine, Snackgeräte',
    description: 'Café oder Bistro eröffnen: Siebträgermaschine, Kaffeemühle, Kuchenvitrine, Gläserspüler, Kontaktgrill und kompakte Snackküche der Serie 600 – Beispielkonfigurationen, Vorschriften und kostenlose Planung.',
    intro: 'Ein Café lebt von Kaffee, Kuchen und schnellen Snacks auf wenig Fläche. Die Ausstattung konzentriert sich auf die Theke (Siebträger, Mühle, Kuchenvitrine, Gläserspüler) und eine kompakte Snackküche mit Kontaktgrill, Heißluftofen und Kühltisch. Serie-600-Geräte mit 600 mm Tiefe passen in enge Ladenlokale.',
    planning: [
      'Theke: Siebträgermaschine 2 Gruppen, Mühle, Milchkühlung, Kuchenvitrine gekühlt, Gläserspüler unter der Theke',
      'Snackküche: Kontaktgrill, Heißluftofen 4 Bleche, Kühltisch 2 Türen, Saladette, Mikrowelle',
      'Strom: viele Geräte mit 230 V erhältlich; Siebträger mit Festwasser ab 50 Tassen/Tag',
      'Lüftung: bei Kontaktgrill/Panini meist Umlufthaube mit Aktivkohle ausreichend',
    ],
    equipment: [
      { label: 'Siebträgermaschine, Mühle, Vollautomat', path: '/kaffee-und-bar/kaffeemaschinen' },
      { label: 'Kuchenvitrine gekühlt', path: '/kuehlung/kuehlvitrinen' },
      { label: 'Gläserspülmaschine', path: '/spueltechnik/glaeserspuelmaschinen' },
      { label: 'Kontaktgrill, Panini, Waffeleisen', path: '/kochgeraete/grillgeraete' },
      { label: 'Heißluftofen 4 Bleche', path: '/kochgeraete/heissluftoefen' },
      { label: 'Kühltisch, Saladette, Getränkekühler', path: '/kuehlung' },
      { label: 'Eiswürfelbereiter, Saftpresse', path: '/kuehlung/eiswuerfelbereiter' },
      { label: 'Edelstahl-Arbeitstisch, Spültisch', path: '/edelstahlmoebel' },
    ],
    configs: [
      { name: 'Coffee-Bar (20 Plätze)', items: ['Siebträger 2 Gruppen + Mühle', 'Kuchenvitrine 900 mm', 'Gläserspüler 230 V', 'Milchkühler, Eiswürfelbereiter 25 kg', 'Kühlschrank Glastür'] },
      { name: 'Café mit Snacks (40 Plätze)', items: ['Siebträger 2 Gruppen + Mühle', 'Kuchenvitrine 1.200 mm', 'Gläserspüler + Fronteinschub-Spülmaschine', 'Kontaktgrill doppelt, Heißluftofen 4 Bleche', 'Kühltisch 2 Türen + Saladette', 'Umlufthaube'] },
      { name: 'Bistro mit warmer Küche (60 Plätze)', items: ['Siebträger 2 Gruppen, Vollautomat', 'Kühlvitrine + Getränkekühler', 'Fronteinschub-Spülmaschine + Gläserspüler', 'Serie 600: Herd 4 Platten, Fritteuse, Grillplatte, Kombidämpfer 6 GN', 'Kühltisch 3 Türen, Kühlschrank 700 L', 'Wandhaube 2,0 m'] },
    ],
    regulations: [HACCP, LMHV, VDI],
    faqs: [
      { q: 'Welche Kaffeemaschine für ein neues Café?', a: 'Für Espresso-Qualität eine 2-gruppige Siebträgermaschine mit separater Mühle; für Personal ohne Barista-Erfahrung ein Profi-Vollautomat mit Festwasser. Beides finden Sie in unserer Kaffeetechnik.' },
      { q: 'Brauche ich im Café eine Abzugshaube?', a: 'Bei Kontaktgrill und Heißluftofen reicht oft eine Umlufthaube mit Aktivkohlefilter. Sobald Fritteuse oder Herd eingesetzt werden, ist eine Abluft nach außen erforderlich.' },
    ],
    keywords: ['café ausstattung', 'café einrichten', 'bistro ausstattung', 'café eröffnen ausstattung', 'kaffeebar ausstattung'],
    legacySegments: ['kafe'],
    published: true,
  },
  {
    slug: 'pizzeria',
    name: 'Pizzeria',
    h1: 'Pizzeria-Ausstattung: Pizzaofen, Teigmaschine, Kühltisch',
    title: 'Pizzeria Ausstattung – Pizzaofen, Teigkneter, Pizzakühltisch',
    description: 'Pizzeria eröffnen: Pizzaofen (Elektro/Gas), Spiralkneter, Teigausrollmaschine, Pizzakühltisch mit Belegstation, Nudelkocher und Thermoboxen für Lieferdienst – Beispielkonfigurationen nach Pizzen pro Tag.',
    intro: 'Die Pizzeria-Küche folgt der Kette Teig → Kühlung → Belegen → Backen → Ausgabe. Entscheidend sind Pizzen pro Abend, Pizzaformat und ob Sie liefern. Von der kleinen Pizzeria mit 100 Pizzen bis zum Lieferdienst mit 500 Pizzen finden Sie hier die passende Ausstattung – inklusive Pasta-Linie mit Nudelkocher.',
    planning: [
      'Pizzaofen: 1 Kammer (4–6 Pizzen) bis 100 Pizzen/Abend, 2 Kammern (2×6 oder 2×9) bis 250, Durchlaufofen darüber',
      'Teig: Spiralkneter 18–40 kg, Teigportionierer, Gärboxen; Teigausroller für gleichmäßige Böden',
      'Belegstation: Pizzakühltisch mit Granitplatte und gekühltem GN-Aufsatz für 8–12 Zutaten',
      'Pasta: Nudelkocher 2 Becken, Kombidämpfer 6 GN, Saladette für Antipasti',
      'Lieferung: Thermoboxen, Pizzataschen, Kartonlager, Ausgabezähler',
    ],
    equipment: [
      { label: 'Pizzaofen Elektro / Gas', path: '/pizza-und-teig/pizzaoefen' },
      { label: 'Spiralkneter 18–40 kg', path: '/pizza-und-teig/teigknetmaschinen' },
      { label: 'Teigausrollmaschine, Teigportionierer', path: '/pizza-und-teig/teigausrollmaschinen' },
      { label: 'Pizzakühltisch & Saladette', path: '/kuehlung/saladetten' },
      { label: 'Kühlschrank, Tiefkühlschrank', path: '/kuehlung/kuehlschraenke' },
      { label: 'Nudelkocher, Fritteuse', path: '/kochgeraete' },
      { label: 'Gläserspüler, Geschirrspüler', path: '/spueltechnik' },
      { label: 'Thermoboxen, GN-Behälter', path: '/gn-behaelter-und-wagen' },
    ],
    configs: [
      { name: 'Kleine Pizzeria (100 Pizzen/Abend)', items: ['Elektro-Pizzaofen 1 Kammer 6× 34 cm', 'Spiralkneter 18 kg', 'Pizzakühltisch 2 Türen mit Aufsatz', 'Kühlschrank 700 L, Tiefkühlschrank 700 L', 'Fronteinschub-Spülmaschine', 'Teigausroller 40 cm'] },
      { name: 'Pizzeria mit Pasta (250 Pizzen/Abend)', items: ['Elektro-Pizzaofen 2 Kammern 2×9', 'Spiralkneter 40 kg + Teigportionierer', 'Pizzakühltisch 3 Türen + Saladette', 'Nudelkocher 2×26 L, Kombidämpfer 6 GN, Fritteuse', 'Kühlschrank 1.400 L, Tiefkühlschrank 1.400 L', 'Haubenspülmaschine', 'Wandhaube 2,5 m'] },
      { name: 'Lieferdienst (500 Pizzen/Abend)', items: ['Durchlaufofen 50 cm Band', '2× Spiralkneter 40 kg', '2× Pizzakühltisch 3 Türen', 'Kühlzelle 8 m³, Tiefkühlzelle 4 m³', '30 Thermoboxen, Warmhalteschrank', 'Fronteinschub-Spülmaschine'] },
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: 'Elektro- oder Gas-Pizzaofen für die Pizzeria?', a: 'Elektro mit Schamottboden ist einfacher zu installieren und präzise regelbar; Gas ist bei fehlender Stromleistung oder sehr hohem Durchsatz günstiger im Betrieb. Beide erreichen 400–500 °C.' },
      { q: 'Welche Teigknetmaschine für 250 Pizzen am Tag?', a: 'Etwa 60 kg Teig am Tag – ein Spiralkneter mit 40 kg Kapazität und zwei Chargen oder zwei Chargen à 25 kg.' },
      { q: 'Was kostet eine komplette Pizzeria-Ausstattung?', a: 'Eine Grundausstattung mit Pizzaofen, Kneter, Kühltisch, Kühlung und Spülmaschine beginnt bei Markengeräten im unteren fünfstelligen Bereich netto. Über den Küchenplaner erhalten Sie ein exaktes Angebot.' },
    ],
    keywords: ['pizzeria ausstattung', 'pizzeria einrichten', 'pizzeria eröffnen ausstattung', 'pizzeria küche', 'pizzaofen pizzeria'],
    published: true,
  },
  {
    slug: 'imbiss-fast-food',
    name: 'Imbiss & Fast Food',
    h1: 'Imbiss-Ausstattung: Fritteusen, Grill, Warmhaltung, Kühlung',
    title: 'Imbiss Ausstattung – Fritteuse, Grillplatte, Pommeswärmer',
    description: 'Imbiss oder Fast-Food-Betrieb einrichten: Standfritteusen, Grillplatte, Kontaktgrill, Pommeswärmer, Kühltisch, Getränkekühler und Lüftung – Beispielkonfigurationen für Imbisswagen, Schnellimbiss und Burger-Laden.',
    intro: 'Im Imbiss zählen Durchsatz und Geschwindigkeit: Fritteusen mit hoher Literleistung, Grillplatte und Kontaktgrill, Warmhaltung für Pommes, ein Kühltisch für Beläge und schnelle Getränkekühlung. Die Geräte müssen Dauerbetrieb bei Spitzenlast aushalten – wir empfehlen Standgeräte der Serie 700 ab mittlerem Umsatz.',
    planning: [
      'Fritteusen: Doppelfritteuse 2×10–2×20 L als Standgerät, bei Pommes-Schwerpunkt zwei Geräte',
      'Grill: Grillplatte 600–800 mm (glatt/geriffelt), Kontaktgrill für Burger, Dönergrill bei Bedarf',
      'Warmhaltung: Pommeswärmer, Wärmebrücke, Warmhaltevitrine für Ausgabe',
      'Kühlung: Kühltisch mit Aufsatz für Beläge, Getränkekühlschrank Glastür, Tiefkühlschrank für Rohware',
      'Lüftung: Abzugshaube mit Fettfilter und Abluft nach außen (Pflicht bei Fritteusen)',
    ],
    equipment: [
      { label: 'Standfritteusen Elektro / Gas', path: '/kochgeraete/fritteusen' },
      { label: 'Grillplatte, Kontaktgrill, Dönergrill', path: '/kochgeraete/grillgeraete' },
      { label: 'Pommeswärmer, Wärmebrücke, Bain-Marie', path: '/kochgeraete/warmhaltegeraete' },
      { label: 'Kühltisch mit Aufsatz, Saladette', path: '/kuehlung/kuehltische' },
      { label: 'Getränkekühlschrank, Tiefkühlschrank', path: '/kuehlung' },
      { label: 'Wandhaube mit Fettfilter', path: '/lueftung/wandhauben' },
      { label: 'Gemüseschneider (Pommesschneider)', path: '/lebensmittelverarbeitung/aufschnitt-und-gemueseschneider' },
    ],
    configs: [
      { name: 'Imbisswagen / Kiosk', items: ['Doppelfritteuse Tischgerät 2×8 L', 'Grillplatte 500 mm', 'Pommeswärmer', 'Kühltisch 2 Türen', 'Getränkekühlschrank', 'Kompakte Haube'] },
      { name: 'Schnellimbiss (Standard)', items: ['Standfritteuse 2×13 L', 'Grillplatte 800 mm + Kontaktgrill', 'Pommeswärmer, Wärmebrücke', 'Kühltisch 3 Türen mit Aufsatz', 'Tiefkühlschrank 700 L, Getränkekühler', 'Wandhaube 2,5 m', 'Fronteinschub-Spülmaschine'] },
      { name: 'Burger-Restaurant (hoher Durchsatz)', items: ['2× Standfritteuse 2×20 L', 'Grillplatte 1.200 mm Chrom, 2× Kontaktgrill', 'Warmhaltevitrine, Bunwärmer', '2× Kühltisch 3 Türen', 'Tiefkühlschrank 1.400 L', 'Wandhaube 4 m', 'Haubenspülmaschine'] },
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: 'Wie viele Liter Fritteuse braucht ein Imbiss?', a: 'Mindestens eine Doppelfritteuse mit 2×10 Litern; bei Pommes als Hauptprodukt 2×13 bis 2×20 Liter als Standgerät. Faustregel: pro Liter Öl ca. 1 kg Frittiergut pro Stunde.' },
      { q: 'Muss ein Imbiss eine Abzugshaube haben?', a: 'Ja, bei Fritteusen und Grill ist eine Abzugshaube mit Fettabscheidung und Abluft nach außen vorgeschrieben (VDI 2052, Brandschutz).' },
    ],
    keywords: ['imbiss ausstattung', 'imbiss einrichten', 'fast food ausstattung', 'imbiss eröffnen ausstattung', 'schnellimbiss geräte', 'burger restaurant ausstattung'],
    published: true,
  },
  {
    slug: 'doener-kebab-betrieb',
    name: 'Dönerladen & Kebab',
    h1: 'Dönerladen einrichten: Dönergrill, Dönerschneider, Kühlung',
    title: 'Dönerladen Ausstattung – Dönergrill, Dönermesser, Kühltisch',
    description: 'Dönerladen und Kebab-Betrieb ausstatten: Dönergrill Gas/Elektro 3–6 Brenner, elektrisches Dönermesser, Kühltisch mit Aufsatz, Fritteuse, Salatkühlung, Fleischwolf und Abzugshaube – Beispielkonfigurationen und Vorschriften.',
    intro: 'Deutschland ist der größte Dönermarkt Europas – und die Ausstattung ist standardisiert: Dönergrill mit 3 bis 6 Brennern für 30 bis 120 kg Spieße, elektrischer Dönerschneider, gekühlte Belegstation, Fritteuse, Getränkekühlung und eine Haube, die Fett und Hitze sicher abführt. Für Betriebe, die selbst Spieße herstellen, kommen Fleischwolf und Spießpresse hinzu.',
    planning: [
      'Dönergrill: 3 Brenner (bis 40 kg) für kleine Läden, 4–5 Brenner (bis 80 kg) Standard, 6 Brenner (120 kg) für hohen Umsatz; Gas oder Elektro',
      'Schneiden: elektrisches Dönermesser mit Akku oder Kabel, Dönerroboter bei sehr hohem Durchsatz',
      'Belegstation: Kühltisch mit GN-Aufsatz (Salat, Soßen), Brotwärmer, Pide-Ofen',
      'Zusatz: Doppelfritteuse, Grillplatte, Ayran-/Getränkekühler, Salatschleuder',
      'Lüftung: Haube direkt über Dönergrill mit Fettfilter, Abluft nach außen zwingend',
    ],
    equipment: [
      { label: 'Dönergrill Gas / Elektro', path: '/kochgeraete/grillgeraete' },
      { label: 'Kühltisch mit Aufsatz (Belegstation)', path: '/kuehlung/kuehltische' },
      { label: 'Doppelfritteuse', path: '/kochgeraete/fritteusen' },
      { label: 'Fleischwolf, Spießpresse', path: '/lebensmittelverarbeitung/fleischwoelfe' },
      { label: 'Getränkekühlschrank, Tiefkühlschrank', path: '/kuehlung/kuehlschraenke' },
      { label: 'Wandhaube mit Fettfilter', path: '/lueftung/wandhauben' },
      { label: 'Pide-/Brotofen, Kontaktgrill', path: '/kochgeraete' },
    ],
    configs: [
      { name: 'Kleiner Dönerladen', items: ['Dönergrill 3 Brenner Gas', 'Dönermesser elektrisch', 'Kühltisch 2 Türen mit Aufsatz', 'Doppelfritteuse 2×8 L', 'Getränkekühlschrank', 'Wandhaube 1,5 m'] },
      { name: 'Döner-Imbiss Standard', items: ['Dönergrill 4–5 Brenner Gas', 'Dönermesser + Ersatzmesser', 'Kühltisch 3 Türen mit Aufsatz', 'Standfritteuse 2×13 L, Grillplatte', 'Tiefkühlschrank 700 L, Getränkekühler', 'Wandhaube 2,5 m', 'Fronteinschub-Spülmaschine'] },
      { name: 'Döner-Restaurant mit Spießproduktion', items: ['2× Dönergrill 6 Brenner', 'Dönerroboter', 'Fleischwolf Größe 32, Spießpresse, Kühlzelle', '2× Kühltisch 3 Türen', 'Standfritteuse 2×20 L, Grillplatte 1.000 mm', 'Haube 4 m', 'Haubenspülmaschine'] },
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: 'Gas- oder Elektro-Dönergrill?', a: 'Gas ist im Betrieb günstiger und heizt schneller; Elektro braucht keinen Gasanschluss und ist in Einkaufszentren oft Pflicht. Beide gibt es mit 3 bis 6 Brennern bzw. Heizzonen.' },
      { q: 'Wie schwer darf der Spieß sein?', a: '3 Brenner: bis ca. 40 kg, 4 Brenner: bis 60 kg, 5 Brenner: bis 80 kg, 6 Brenner: bis 120 kg. Achten Sie auf die Motorleistung des Spießantriebs.' },
    ],
    keywords: ['dönerladen ausstattung', 'dönerladen einrichten', 'dönergrill kaufen', 'döner imbiss ausstattung', 'kebab ausstattung', 'dönerladen eröffnen'],
    published: true,
  },
  {
    slug: 'baeckerei-konditorei',
    name: 'Bäckerei & Konditorei',
    h1: 'Bäckerei einrichten: Backöfen, Gärschrank, Kühlung, Verkauf',
    title: 'Bäckerei Ausstattung – Backofen, Gärschrank, Kuchenvitrine',
    description: 'Bäckerei und Konditorei ausstatten: Bäckereiöfen 600×400, Gärschränke, Spiralkneter, Teigausroller, Kühlvitrinen, Schockfroster und Verkaufstheke – für Backstube, Backstation und Café-Bäckerei.',
    intro: 'Bäckereien arbeiten im Blechmaß 600 × 400 mm und mit Hefeteigen, die Gärschrank und Schockfroster brauchen. Dazu kommt der Verkauf: Kuchenvitrine, Brotregal, Kaffeemaschine. Wir stellen Ausstattungen für Backstationen, Café-Bäckereien und Konditoreien zusammen.',
    planning: [
      'Backen: Konvektionsofen 4–10 Bleche oder Stikkenofen; Etagenofen für Brot',
      'Teig: Spiralkneter 25–60 kg, Teigausroller, Teigteiler; Gärschrank mit Feuchteregelung',
      'Kühlung: Schockfroster 600×400 für Teiglinge, Tiefkühlschrank, Kühlvitrine im Verkauf',
      'Konditorei: Planetenrührmaschine, Schokoladentemperiergerät, Kühlvitrine mit Umluft',
      'Verkauf: Kuchenvitrine, Brotregal, Siebträger oder Vollautomat, Gläserspüler',
    ],
    equipment: [
      { label: 'Bäckereiöfen 600×400', path: '/baeckereitechnik/baeckereioefen' },
      { label: 'Gärschränke', path: '/baeckereitechnik/gaerschraenke' },
      { label: 'Spiralkneter, Teigausroller, Teigportionierer', path: '/pizza-und-teig' },
      { label: 'Schockfroster, Tiefkühlschrank', path: '/kuehlung/schockfroster' },
      { label: 'Kuchenvitrinen gekühlt', path: '/kuehlung/kuehlvitrinen' },
      { label: 'Kaffeemaschinen', path: '/kaffee-und-bar/kaffeemaschinen' },
      { label: 'Backwagen, Blechregale, Arbeitstische', path: '/edelstahlmoebel' },
    ],
    configs: [
      { name: 'Backstation / Aufback-Café', items: ['Konvektionsofen 4 Bleche + Gärunterbau', 'Tiefkühlschrank 700 L', 'Kuchenvitrine 1.200 mm', 'Vollautomat 200 Tassen', 'Gläserspüler'] },
      { name: 'Café-Bäckerei', items: ['Konvektionsofen 10 Bleche + Gärschrank', 'Spiralkneter 25 kg, Teigausroller', 'Schockfroster 10× 600×400', 'Kühlvitrine 1.500 mm, Brotregal', 'Siebträger 2 Gruppen', 'Arbeitstische, Blechregale'] },
      { name: 'Handwerksbäckerei mit Konditorei', items: ['Stikkenofen + Etagenofen', 'Spiralkneter 60 kg, Teigteiler, Rundwirker', 'Gärschrank 2 Wagen', 'Schockfroster 20 Bleche, Tiefkühlzelle', 'Planetenrührmaschine 40 L, Temperiergerät', 'Kühlvitrine Umluft 2.000 mm'] },
    ],
    regulations: [HACCP, LMHV, DGUV],
    faqs: [
      { q: 'Welcher Ofen für eine Backstation im Supermarkt?', a: 'Ein Konvektionsofen für 4–10 Bleche 600 × 400 mm mit Dampfzugabe und Gärunterbau – kompakt, 400 V, mit Programmspeicher für Personal ohne Bäckerausbildung.' },
      { q: 'Brauche ich einen Schockfroster in der Bäckerei?', a: 'Für die Vorproduktion von Teiglingen ja: Schockfrosten erhält Gärstabilität und Qualität und ermöglicht Backen nach Bedarf.' },
    ],
    keywords: ['bäckerei ausstattung', 'bäckerei einrichten', 'konditorei ausstattung', 'backstube ausstattung', 'bäckerei eröffnen ausstattung', 'bäckereitechnik'],
    published: true,
  },
  {
    slug: 'metzgerei',
    name: 'Metzgerei & Fleischerei',
    h1: 'Metzgerei einrichten: Fleischverarbeitung, Kühlung, Verkaufstheke',
    title: 'Metzgerei Ausstattung – Fleischwolf, Cutter, Kühltheke, Vakuumierer',
    description: 'Metzgerei und Fleischerei ausstatten: Fleischwolf, Cutter, Wurstfüller, Knochensäge, Vakuumierer, Kühlzelle, Kühltheke und Reifeschrank – Beispielkonfigurationen für Verkaufsmetzgerei und Produktionsbetrieb.',
    intro: 'Die Metzgerei vereint Produktion (Wolf, Cutter, Füller, Räuchern), Lagerung (Kühlzellen, Reifeschränke) und Verkauf (Kühltheke, Aufschnittmaschine, Waage). Hygienevorschriften sind hier besonders streng: separate Räume für Zerlegung, Produktion und Verkauf, Handwaschbecken in jedem Bereich, lückenlose Kühlkette.',
    planning: [
      'Produktion: Fleischwolf Größe 22/32, Cutter 20–60 L, Wurstfüllmaschine, Knochensäge, Räucherofen',
      'Kühlung: Kühlzelle Zerlegung (0–2 °C), Kühlzelle Fertigware, Tiefkühlzelle, Reifeschrank (Dry Aging)',
      'Verpackung: Kammervakuumierer, Siegelgerät, Etikettenwaage',
      'Verkauf: Kühltheke ventiliert 2–4 m, Aufschnittmaschine 300 mm, Waage, Kühlvitrine Feinkost',
      'Hygiene: Handwaschbecken, Messersterilisator, Hackblock, Edelstahltische 1,2–1,5 mm',
    ],
    equipment: [
      { label: 'Fleischwolf, Wurstfüller, Knochensäge', path: '/lebensmittelverarbeitung/fleischwoelfe' },
      { label: 'Cutter, Aufschnittmaschine', path: '/lebensmittelverarbeitung/aufschnitt-und-gemueseschneider' },
      { label: 'Kammervakuumierer', path: '/lebensmittelverarbeitung/vakuumierer' },
      { label: 'Kühlzellen, Tiefkühlzellen', path: '/kuehlung/kuehlzellen' },
      { label: 'Kühltheken, Fleischtheken', path: '/kuehlung/kuehltheken' },
      { label: 'Edelstahltische, Spültische, Hygiene', path: '/edelstahlmoebel' },
    ],
    configs: [
      { name: 'Verkaufsmetzgerei (ohne Produktion)', items: ['Kühltheke ventiliert 3 m', 'Aufschnittmaschine 300 mm', 'Kühlzelle 8 m³', 'Vakuumierer 10 m³/h', 'Arbeitstische, Handwaschbecken'] },
      { name: 'Metzgerei mit eigener Wurstproduktion', items: ['Fleischwolf Größe 32', 'Cutter 40 L', 'Wurstfüller 25 L hydraulisch', 'Kühlzelle Zerlegung 10 m³ + Fertigware 10 m³', 'Kühltheke 4 m + Feinkostvitrine', 'Kammervakuumierer 20 m³/h', 'Knochensäge, Hackblock'] },
      { name: 'Produktionsbetrieb / Großhandel', items: ['Fleischwolf 32 Industrie, Mischwolf', 'Cutter 60 L', 'Vakuumfüller', 'Tiefkühlzelle 20 m³, Kühlzellen 30 m³', 'Schockfroster 20 GN', 'Bandspülmaschine, Topfspüler'] },
    ],
    regulations: [HACCP, LMHV, DGUV],
    faqs: [
      { q: 'Welcher Fleischwolf für eine Metzgerei?', a: 'Größe 22 mit ca. 300 kg/h ist der Standard für Verkaufsmetzgereien; Größe 32 mit über 400 kg/h für Produktion und Dönerspieß-Herstellung.' },
      { q: 'Welche Temperatur muss die Fleischtheke halten?', a: 'Frischfleisch maximal +4 °C, Hackfleisch +2 °C, Geflügel +4 °C. Ventilierte Theken halten die Temperatur auch bei geöffneten Schiebetüren.' },
    ],
    keywords: ['metzgerei ausstattung', 'metzgerei einrichten', 'fleischerei ausstattung', 'metzgerei eröffnen', 'fleischverarbeitung maschinen'],
    published: true,
  },
  {
    slug: 'kantine-betriebsverpflegung',
    name: 'Kantine & Betriebsverpflegung',
    h1: 'Kantinenküche einrichten: Großküchentechnik für 200–2.000 Essen',
    title: 'Kantine Ausstattung – Großküche, Ausgabe, Bandspülmaschine',
    description: 'Kantine und Betriebsrestaurant ausstatten: Kochkessel, Kippbratpfannen, Kombidämpfer 20 GN, Schockfroster, Ausgabetheken mit Tablettrutsche, Bandspülmaschine und Kühlzellen – dimensioniert nach Essen pro Tag.',
    intro: 'Kantinen produzieren in kurzer Zeit große Mengen und geben sie über Self-Service-Theken aus. Die Küche wird nach Essen pro Tag dimensioniert: Kochkessel und Kippbratpfannen für Mengenkochen, Kombidämpfer mit Hordenwagen, Schockfroster für Cook & Chill, Ausgabelinie mit Tablettrutsche und eine Bandspülmaschine, die den Rücklauf bewältigt.',
    planning: [
      '200 Essen: Kombidämpfer 20 GN, Kochkessel 100 L, Kippbratpfanne 80 L, Ausgabelinie 4 m',
      '500 Essen: 2× Kombidämpfer 20 GN, Kessel 150 + 100 L, Kippbratpfanne 120 L, 2 Ausgabelinien',
      '1.000+ Essen: Cook-&-Chill-Produktion, Schockfroster 40 GN, Kühlzellen 40 m³, Bandspülmaschine',
      'Spülküche: Bandspülmaschine ab 400 Essen; Tablettabräumband; Topfspüler separat',
      'Ausgabe: Self-Service-Module mit Tablettrutsche, Hustenschutz, Kassenplatz; Free-Flow ab 500 Essen',
    ],
    equipment: [
      { label: 'Kochkessel, Kippbratpfannen', path: '/kochgeraete/herde-und-kochkessel' },
      { label: 'Kombidämpfer 20 GN, Schockfroster', path: '/cook-and-chill' },
      { label: 'Self-Service-Theken, Ausgabe', path: '/ausgabe-und-buffet/self-service-module' },
      { label: 'Bandspülmaschine, Topfspüler', path: '/spueltechnik/bandspuelmaschinen' },
      { label: 'Kühlzellen, Tiefkühlzellen', path: '/kuehlung/kuehlzellen' },
      { label: 'Gemüseschneider, Kartoffelschäler', path: '/lebensmittelverarbeitung' },
      { label: 'Hordenwagen, Tablettwagen, GN', path: '/gn-behaelter-und-wagen' },
    ],
    configs: [
      { name: 'Kantine 200 Essen', items: ['Kombidämpfer 20 GN', 'Kochkessel 100 L, Kippbratpfanne 80 L', 'Herd 4 Platten Serie 900', 'Ausgabelinie 4 m (warm/kalt/neutral)', 'Haubenspülmaschine + Topfspüler', 'Kühlzelle 10 m³, Tiefkühlzelle 6 m³'] },
      { name: 'Betriebsrestaurant 500 Essen', items: ['2× Kombidämpfer 20 GN', 'Schockfroster 20 GN', 'Kochkessel 150 + 100 L, Kippbratpfanne 120 L', '2 Ausgabelinien à 5 m, Salatbar', 'Bandspülmaschine', 'Kühlzellen 25 m³'] },
      { name: 'Zentralküche 2.000 Essen', items: ['4× Kombidämpfer 20 GN mit Hordenwagen', '2× Schockfroster 40 GN', 'Kesselstraße 3× 300 L, 2× Kippbratpfanne 200 L', 'Bandspülmaschine 2.000 Teller/h', 'Kühlzellen 60 m³, Tiefkühlzelle 30 m³', 'Verpackung und Verteilung'] },
    ],
    regulations: [HACCP, DIN10506, VDI, DGUV],
    faqs: [
      { q: 'Ab wann brauche ich eine Bandspülmaschine?', a: 'Ab etwa 400 Essen pro Mahlzeit; darunter reicht eine Haubenspülmaschine mit gutem Vorspülplatz. Bandspülmaschinen schaffen 1.000–3.000 Teller pro Stunde.' },
      { q: 'Wie groß muss eine Kantinenküche für 500 Essen sein?', a: 'Rechnen Sie mit 120–180 m² für Küche, Lager, Kühlung und Spülküche plus Ausgabe- und Gastraum.' },
    ],
    keywords: ['kantine ausstattung', 'kantinenküche einrichten', 'betriebsrestaurant ausstattung', 'großküche einrichten', 'gemeinschaftsverpflegung küche'],
    published: true,
  },
  {
    slug: 'krankenhaus-pflegeheim',
    name: 'Krankenhaus & Pflegeheim',
    h1: 'Küche für Krankenhaus & Pflegeheim: Cook & Chill, Verteilung, Hygiene',
    title: 'Krankenhausküche Ausstattung – Cook & Chill, Speisenverteilung',
    description: 'Küchen für Krankenhaus, Pflegeheim und Seniorenresidenz: Cook & Chill mit Kombidämpfer und Schockfroster, Speisenverteilwagen, Tablettsystem, Bandspülmaschine und Hygieneausstattung nach DIN 10506.',
    intro: 'Krankenhäuser und Pflegeheime verpflegen rund um die Uhr, mit Diätformen und strengen Hygienevorgaben. Cook & Chill ist hier Standard: zentrale Produktion, Schnellkühlung, Regenerieren auf Station. Die Ausstattung reicht vom Kombidämpfer über Speisenverteilwagen bis zur Bandspülmaschine mit Tablettrücklauf.',
    planning: [
      'Produktion: Kombidämpfer 20 GN, Schockfroster, Kochkessel; Cook & Chill nach DIN 10536',
      'Verteilung: Tablettsystem mit Bandportionierung, Speisenverteilwagen (kalt/warm), Regenerieröfen auf Station',
      'Hygiene: strikte Trennung rein/unrein, Handwaschbecken, Desinfektionsspender, Bandspülmaschine mit Tablettrücklauf',
      'Kühlung: Kühlzellen mit Temperaturprotokoll, Tiefkühlzelle, Diätkühlung separat',
    ],
    equipment: [
      { label: 'Kombidämpfer, Schockfroster (Cook & Chill)', path: '/cook-and-chill' },
      { label: 'Kochkessel, Kippbratpfannen', path: '/kochgeraete/herde-und-kochkessel' },
      { label: 'Speisenverteilwagen, Thermowagen, Tablettwagen', path: '/gn-behaelter-und-wagen/transportwagen' },
      { label: 'Bandspülmaschine', path: '/spueltechnik/bandspuelmaschinen' },
      { label: 'Kühlzellen mit Protokoll', path: '/kuehlung/kuehlzellen' },
      { label: 'Edelstahlmöbel, Hygiene', path: '/edelstahlmoebel' },
    ],
    configs: [
      { name: 'Pflegeheim 80 Betten', items: ['Kombidämpfer 10 GN + 20 GN', 'Schockfroster 10 GN', 'Kochkessel 100 L, Kippbratpfanne 80 L', '4 Speisenverteilwagen', 'Haubenspülmaschine', 'Kühlzelle 10 m³, Tiefkühlzelle 6 m³'] },
      { name: 'Klinik 300 Betten', items: ['3× Kombidämpfer 20 GN', '2× Schockfroster 20 GN', 'Kesselstraße 2× 200 L', 'Tablettband, 15 Verteilwagen', 'Bandspülmaschine mit Tablettrücklauf', 'Kühlzellen 40 m³'] },
      { name: 'Seniorenresidenz mit Restaurant', items: ['Kombidämpfer 20 GN, Schockfroster 10 GN', 'Kochzeile Serie 900', 'Ausgabetheke 4 m', 'Haubenspülmaschine + Topfspüler', 'Kühlzelle 12 m³'] },
    ],
    regulations: [HACCP, DIN10506, LMHV, DGUV],
    faqs: [
      { q: 'Warum Cook & Chill im Krankenhaus?', a: 'Produktion und Ausgabe werden entkoppelt: gleichbleibende Qualität, HACCP-sichere Temperaturführung, weniger Personal in Randzeiten und einfache Diätsteuerung.' },
    ],
    keywords: ['krankenhausküche ausstattung', 'pflegeheim küche einrichten', 'klinikküche', 'seniorenheim küche ausstattung', 'speisenverteilung krankenhaus'],
    legacySegments: ['hastane'],
    published: true,
  },
  {
    slug: 'schule-kita',
    name: 'Schule & Kita',
    h1: 'Schulküche & Kita-Küche einrichten: Mensa, Ausgabe, Aufwärmküche',
    title: 'Schulküche Ausstattung – Mensa, Kita-Küche, Aufwärmküche',
    description: 'Küchen für Schule, Kita und Mensa: Aufwärmküche mit Kombidämpfer, Frischküche mit Kochkessel, kindgerechte Ausgabe, Spülmaschine und Kühlung – nach DIN 10506 und den Empfehlungen der DGE.',
    intro: 'Schul- und Kita-Küchen reichen von der Aufwärmküche (Anlieferung Cook & Chill, Regenerieren) bis zur Frischküche mit 500 Essen. Die Ausgabe muss kindgerecht (niedrige Theken, Tablettrutsche), die Spülküche schnell und die Hygiene lückenlos sein. Wir stellen Ausstattungen nach Verpflegungssystem und Essenszahl zusammen.',
    planning: [
      'Aufwärmküche (Cook & Chill / Warmanlieferung): Kombidämpfer 10 GN zum Regenerieren, Kühlschrank, Warmhaltewagen, Spülmaschine',
      'Mischküche: Kombidämpfer 20 GN, Kochkessel 100 L, Kühlung, Ausgabe',
      'Frischküche 300–500 Essen: Kesselstraße, Kippbratpfanne, 2× Kombidämpfer 20 GN, Bandspülmaschine',
      'Ausgabe: Thekenhöhe 750–800 mm für Grundschule, Tablettrutsche, Hustenschutz, Wasserspender',
    ],
    equipment: [
      { label: 'Kombidämpfer 10/20 GN', path: '/kochgeraete/kombidaempfer' },
      { label: 'Kochkessel, Kippbratpfanne', path: '/kochgeraete/herde-und-kochkessel' },
      { label: 'Ausgabetheken, Self-Service', path: '/ausgabe-und-buffet' },
      { label: 'Hauben-/Bandspülmaschine', path: '/spueltechnik' },
      { label: 'Kühlschränke, Kühlzelle', path: '/kuehlung' },
      { label: 'Thermowagen, Warmhaltewagen', path: '/gn-behaelter-und-wagen/transportwagen' },
    ],
    configs: [
      { name: 'Kita 60 Kinder (Aufwärmküche)', items: ['Kombidämpfer 6 GN', 'Kühlschrank 700 L', 'Fronteinschub-Spülmaschine', 'Arbeitstisch, Spültisch, Handwaschbecken', 'Warmhaltewagen'] },
      { name: 'Grundschule 250 Essen (Mischküche)', items: ['Kombidämpfer 20 GN', 'Kochkessel 100 L', 'Ausgabetheke 4 m kindgerecht', 'Haubenspülmaschine', 'Kühlzelle 8 m³, Tiefkühlschrank'] },
      { name: 'Schulmensa 500 Essen (Frischküche)', items: ['2× Kombidämpfer 20 GN', 'Kochkessel 150 L, Kippbratpfanne 120 L', '2 Ausgabelinien', 'Bandspülmaschine', 'Kühlzellen 20 m³'] },
    ],
    regulations: [HACCP, DIN10506, LMHV],
    faqs: [
      { q: 'Welche Ausstattung braucht eine Kita-Küche für 60 Kinder?', a: 'Bei Anlieferung: Kombidämpfer 6 GN zum Regenerieren, Kühlschrank 700 L, Spülmaschine, Arbeits- und Spültisch, Handwaschbecken. Bei Frischkochen zusätzlich Herd 4 Platten und Kochkessel 50 L.' },
    ],
    keywords: ['schulküche ausstattung', 'kita küche einrichten', 'mensa ausstattung', 'schulmensa küche', 'aufwärmküche kita'],
    legacySegments: ['okul'],
    published: true,
  },
  {
    slug: 'eisdiele',
    name: 'Eisdiele',
    h1: 'Eisdiele einrichten: Eistheke, Eismaschine, Waffeln, Kaffee',
    title: 'Eisdiele Ausstattung – Eistheke, Eismaschine, Softeis',
    description: 'Eisdiele oder Eiscafé eröffnen: Eistheke 12–24 Behälter, Speiseeismaschine, Pasteurisierer, Softeismaschine, Waffeleisen, Sahnemaschine, Siebträger und Tiefkühllager – Beispielkonfigurationen nach Größe.',
    intro: 'Eine Eisdiele braucht eine Eistheke, die auch bei 35 °C Außentemperatur hält, eine Produktion (Pasteurisierer + Eismaschine) oder Einkauf von Fertigeis, Waffel- und Kaffeetechnik und ausreichend Tiefkühllager. Softeis, Frozen Yogurt und Crêpes erweitern das Angebot im Sommer und Winter.',
    planning: [
      'Theke: Eisvitrine ventiliert 12–24 Behälter à 5 L, Klimaklasse 5 bei Sonneneinstrahlung',
      'Produktion: Pasteurisierer 60 L, Speiseeismaschine 5–10 L/Charge, Reifetank; alternativ Fertigmix',
      'Lager: Tiefkühlschrank/-truhe −25 °C, Tiefkühlzelle bei Eigenproduktion',
      'Zusatz: Softeismaschine, Sahnemaschine, Waffeleisen, Crêpes, Siebträger, Gläserspüler',
    ],
    equipment: [
      { label: 'Eisvitrinen & Eistheken', path: '/eismaschinen-und-eisvitrinen/eisvitrinen' },
      { label: 'Eismaschinen, Softeis, Pasteurisierer', path: '/eismaschinen-und-eisvitrinen/eismaschinen' },
      { label: 'Waffeleisen, Crêpes', path: '/kaffee-und-bar/crepes-und-waffeleisen' },
      { label: 'Siebträgermaschine, Mühle', path: '/kaffee-und-bar/kaffeemaschinen' },
      { label: 'Tiefkühltruhen, Tiefkühlschrank', path: '/kuehlung/tiefkuehltruhen' },
      { label: 'Gläserspüler', path: '/spueltechnik/glaeserspuelmaschinen' },
    ],
    configs: [
      { name: 'Eiskiosk (Fertigeis)', items: ['Eisvitrine 12 Behälter', 'Tiefkühltruhe 400 L', 'Waffeleisen', 'Softeismaschine Tischgerät', 'Kleiner Gläserspüler'] },
      { name: 'Eisdiele mit Eigenproduktion', items: ['Eisvitrine 18 Behälter ventiliert', 'Pasteurisierer 60 L + Eismaschine 8 L', 'Tiefkühlschrank 700 L, Tiefkühltruhe', 'Sahnemaschine, Waffeleisen 2×', 'Siebträger 2 Gruppen', 'Gläserspüler'] },
      { name: 'Eiscafé (60 Plätze)', items: ['Eisvitrine 24 Behälter', 'Produktion: Pasteurisierer 120 L, 2× Eismaschine', 'Tiefkühlzelle 6 m³', 'Softeis 3 Sorten, Crêpes, Waffeln', 'Siebträger 2 Gruppen, Vollautomat', 'Fronteinschub-Spülmaschine + Gläserspüler'] },
    ],
    regulations: [HACCP, LMHV],
    faqs: [
      { q: 'Statische oder ventilierte Eisvitrine?', a: 'Ventilierte Vitrinen halten die Temperatur auch bei Hitze und offenem Verkauf gleichmäßig; statische sind günstiger und leiser, aber empfindlicher gegen Umgebungstemperatur.' },
    ],
    keywords: ['eisdiele ausstattung', 'eisdiele einrichten', 'eiscafé ausstattung', 'eisdiele eröffnen', 'eistheke kaufen'],
    published: true,
  },
  {
    slug: 'bar-club',
    name: 'Bar & Club',
    h1: 'Bar einrichten: Kühlung, Eis, Gläserspüler, Bartechnik',
    title: 'Bar Ausstattung – Barkühlschrank, Eiswürfelmaschine, Gläserspüler',
    description: 'Bar, Club oder Lounge ausstatten: Barkühlschränke, Flaschenkühler, Eiswürfelbereiter, Gläserspülmaschine, Barmixer, Saftpresse, Siebträger und Edelstahl-Bartheke – Beispielkonfigurationen nach Gästezahl.',
    intro: 'Hinter der Bar zählt jeder Zentimeter: Unterbau-Kühlschränke und Flaschenkühler, ein Eiswürfelbereiter mit ausreichender Tagesleistung, ein Gläserspüler mit 2-Minuten-Programm, Barmixer und Zitruspresse. Wir planen Bartheken modular mit Edelstahl-Unterbau, Spülbecken und Ablagen.',
    planning: [
      'Kühlung: Barkühlschrank Unterbau (2–3 Türen), Flaschenkühler, Weinkühlschrank, Fasskühlung',
      'Eis: 25 kg/Tag für kleine Bar, 60–100 kg für Cocktailbar, 150 kg für Club; Vorratsbehälter beachten',
      'Spülen: Gläserspüler 40 cm Korb mit Enthärter, Gläserpoliermaschine bei hohem Aufkommen',
      'Bartechnik: Barmixer, Zitruspresse, Crushed-Ice-Maschine, Siebträger für Kaffee-Cocktails',
    ],
    equipment: [
      { label: 'Barkühlschränke, Flaschenkühler', path: '/kuehlung/kuehlschraenke' },
      { label: 'Eiswürfelbereiter, Crushed Ice', path: '/kuehlung/eiswuerfelbereiter' },
      { label: 'Gläserspülmaschine', path: '/spueltechnik/glaeserspuelmaschinen' },
      { label: 'Barmixer, Saftpressen', path: '/kaffee-und-bar/saftpressen-und-barmixer' },
      { label: 'Siebträgermaschine', path: '/kaffee-und-bar/kaffeemaschinen' },
      { label: 'Edelstahl-Bartheke, Spülbecken', path: '/edelstahlmoebel' },
    ],
    configs: [
      { name: 'Kleine Bar (40 Gäste)', items: ['Barkühlschrank 2 Türen Glas', 'Eiswürfelbereiter 25 kg', 'Gläserspüler 40 cm', 'Barmixer, Zitruspresse', 'Spülbecken mit Brause'] },
      { name: 'Cocktailbar (100 Gäste)', items: ['2× Barkühlschrank 3 Türen', 'Eiswürfelbereiter 80 kg + Crushed-Ice', 'Gläserspüler + Poliermaschine', 'Barmixer 2×, Saftpresse elektrisch', 'Siebträger 1 Gruppe', 'Weinkühlschrank'] },
      { name: 'Club (300+ Gäste)', items: ['4× Barkühlschrank, 2× Flaschenkühler', '2× Eiswürfelbereiter 150 kg mit Vorratsbehälter', '2× Gläserspüler Hauben', 'Fasskühlung, Zapfanlage-Kühlung', 'Lagerkühlzelle Getränke'] },
    ],
    regulations: [HACCP, LMHV],
    faqs: [
      { q: 'Wie viel Eis braucht eine Cocktailbar?', a: 'Rechnen Sie 0,5–1 kg Eis pro Gast und Abend. Für 100 Gäste also 50–100 kg – ein Eiswürfelbereiter mit 80–100 kg Tagesleistung und Vorratsbehälter.' },
    ],
    keywords: ['bar ausstattung', 'bar einrichten', 'bar equipment gastronomie', 'cocktailbar ausstattung', 'club ausstattung gastronomie'],
    published: true,
  },
  {
    slug: 'foodtruck',
    name: 'Foodtruck & Verkaufsanhänger',
    h1: 'Foodtruck ausstatten: kompakte Geräte für Anhänger und Truck',
    title: 'Foodtruck Ausstattung – Geräte für Imbisswagen & Verkaufsanhänger',
    description: 'Foodtruck, Imbisswagen oder Verkaufsanhänger ausstatten: Gas-Fritteuse, Grillplatte, Kühltisch, Getränkekühler, Wasserversorgung, Haube und Stromplanung – kompakte Serie-600-Geräte, gewichts- und anschlussoptimiert.',
    intro: 'Im Foodtruck sind Platz, Gewicht und Energie begrenzt. Gasgeräte machen unabhängig vom Stromanschluss, Serie-600-Geräte mit 600 mm Tiefe passen in die Küchenzeile, und Kühltische mit Aufkantung dienen als Arbeitsfläche. Wir planen die Truck-Küche als Zeile mit Gas- und Stromplan.',
    planning: [
      'Energie: Gas für Fritteuse, Grill und Herd; 230 V (max. 16 A / 3,6 kW) für Kühlung und Kleingeräte oder Generator',
      'Geräte: Tiefe 600 mm, Gewicht beachten (Fritteuse mit Öl ca. 40 kg), Sicherung gegen Verrutschen',
      'Wasser: Frischwasser- und Abwassertank 50–100 L, Boiler für Handwaschbecken (Pflicht)',
      'Lüftung: Kompakthaube mit Fettfilter und Dachventilator; Gasgeräte brauchen Abluft',
    ],
    equipment: [
      { label: 'Gas-Fritteuse Tischgerät', path: '/kochgeraete/fritteusen' },
      { label: 'Grillplatte, Kontaktgrill Gas', path: '/kochgeraete/grillgeraete' },
      { label: 'Kühltisch mit Aufkantung', path: '/kuehlung/kuehltische' },
      { label: 'Getränkekühlschrank Unterbau', path: '/kuehlung/kuehlschraenke' },
      { label: 'Bain-Marie, Pommeswärmer', path: '/kochgeraete/warmhaltegeraete' },
      { label: 'Kompakthaube, Ventilator', path: '/lueftung' },
      { label: 'Handwaschbecken, Spülbecken', path: '/edelstahlmoebel/spuelbecken-und-armaturen' },
    ],
    configs: [
      { name: 'Verkaufsanhänger (Pommes/Bratwurst)', items: ['Gas-Doppelfritteuse 2×8 L', 'Gas-Grillplatte 500 mm', 'Pommeswärmer', 'Kühltisch 2 Türen', 'Getränkekühlschrank', 'Handwaschbecken mit Boiler'] },
      { name: 'Burger-Truck', items: ['Gas-Grillplatte 800 mm', 'Gas-Fritteuse 2×10 L', 'Kühltisch 3 Türen mit Aufsatz', 'Bunwärmer, Bain-Marie 2 GN', 'Kompakthaube 1,5 m', 'Tiefkühlschrank Unterbau'] },
      { name: 'Pizza-Truck', items: ['Gas-Pizzaofen 4 Pizzen', 'Pizzakühltisch 2 Türen', 'Spiralkneter 10 kg', 'Kühlschrank Unterbau', 'Getränkekühler', 'Haube'] },
    ],
    regulations: [HACCP, LMHV, DGUV],
    faqs: [
      { q: 'Gas oder Strom im Foodtruck?', a: 'Gas für alles, was heizt (Fritteuse, Grill, Herd); Strom nur für Kühlung, Licht und Kleingeräte. So reicht ein 16-A-Anschluss oder ein kleiner Generator.' },
    ],
    keywords: ['foodtruck ausstattung', 'foodtruck einrichten', 'imbisswagen ausstattung', 'verkaufsanhänger ausstattung', 'foodtruck geräte'],
    published: true,
  },
];

export function findBranche(slug: string): SeoBranche | undefined {
  return BRANCHEN_DE.find((b) => b.slug === slug);
}

/** Eski /sektor/{seg} slug'ı → yeni /branche yolu (301). */
export const LEGACY_SEGMENT_MAP: Record<string, string> = Object.fromEntries(
  BRANCHEN_DE.flatMap((b) => (b.legacySegments || []).map((s) => [s, `/branche/${b.slug}`])),
);
