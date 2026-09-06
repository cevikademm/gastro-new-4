/**
 * categoryTree.de.ts — Almanca SEO kategori ağacı (TEK kaynak).
 *
 * `taxonomyCat` / `taxonomySub` → src/lib/categoryTaxonomy.core.ts'teki kategori ve
 * alt-grup id'leri. Ürün sınıflandırması ORADA yapılır; burası yalnızca Almanca
 * URL, başlık, metin ve FAQ taşır. Slug'lar GGM Gastro'nun arama-talebi
 * taksonomisine göre seçildi (`ggmSlug` referans).
 *
 * `published:false` → sayfa `noindex` + sitemap dışı (içerik onaylanana kadar).
 * Metinler: AI taslağı, Adem onayı sonrası canlı (bkz. docs/seo/inceleme-listesi.md).
 */

export interface SeoFaq { q: string; a: string }
export interface SeoSection { h2: string; html: string }

export interface SeoSubcategory {
  slug: string;
  taxonomySub: string;
  name: string;
  h1: string;
  title?: string;
  description: string;
  intro?: string;
  keywords: string[];
  faqs?: SeoFaq[];
  published?: boolean;
}

export interface SeoCategory {
  slug: string;
  taxonomyCat: string;
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
  keywords: string[];
  ggmSlug?: string;
  children: SeoSubcategory[];
  published: boolean;
}

const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join('');
const ul = (...items: string[]) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;

export const CATEGORY_TREE: SeoCategory[] = [
  // ── 1. Kochgeräte ─────────────────────────────────────────────────────────
  {
    slug: 'kochgeraete',
    taxonomyCat: 'cooking',
    name: 'Kochgeräte',
    h1: 'Kochgeräte für Gastronomie & Großküche',
    title: 'Gastro Kochgeräte kaufen – Herde, Fritteusen, Kombidämpfer',
    description: 'Professionelle Kochgeräte für Gastronomie und Großküche: Kombidämpfer, Gastro-Herde, Fritteusen, Grillplatten, Kochkessel und Bain-Maries von Diamond, CombiSteel und HENDI. Netto-Preise, Lieferung in ganz Deutschland.',
    intro: 'Die Kochlinie ist das Herz jeder gewerblichen Küche. Ob à-la-carte-Restaurant, Kantine mit 500 Essen pro Tag oder Imbiss mit hohem Durchsatz – die richtige Kombination aus Herd, Fritteuse, Kombidämpfer und Grillplatte bestimmt Geschwindigkeit, Energieverbrauch und Arbeitsabläufe. Bei 2MC Gastro finden Sie über 1.400 Kochgeräte in den Gerätetiefen 600, 700 und 900 mm, als Gas- oder Elektroausführung, modular kombinierbar zu einer durchgehenden Kochzeile. Alle Preise verstehen sich netto zzgl. MwSt.; auf Wunsch planen wir Ihre Kochzeile kostenlos in 2D und 3D.',
    sections: [
      {
        h2: 'Welche Kochgeräte braucht eine gewerbliche Küche?',
        html: p(
          'Die Grundausstattung richtet sich nach Speisekarte und Kapazität. Ein klassisches Restaurant arbeitet mit einem 4- bis 6-Flammen-Gasherd mit Backofen, einer Doppel-Fritteuse, einer Grillplatte und einem Kombidämpfer mit 6 bis 10 GN-1/1-Einschüben. Kantinen und Großküchen setzen zusätzlich auf Kochkessel, Kippbratpfannen und Kombidämpfer mit 20 Einschüben. Imbiss und Fast Food benötigen vor allem Fritteusen mit hoher Literleistung, Kontaktgrills und Warmhaltegeräte.',
          'Als Faustregel gilt: Serie 600 für Bistro und Café mit wenig Platz, Serie 700 für den klassischen Restaurantbetrieb, Serie 900 für Großküche, Hotel und Catering mit dauerhaft hoher Auslastung. Die Gerätetiefe bestimmt Leistung, Robustheit und Arbeitsfläche – und sie muss innerhalb einer Kochzeile einheitlich sein, damit die Geräte bündig abschließen.',
        ),
      },
      {
        h2: 'Gas oder Elektro – was ist wirtschaftlicher?',
        html: p(
          'Gasgeräte reagieren schneller, sind im Betrieb meist günstiger und funktionieren unabhängig vom Stromnetz. Sie erfordern jedoch einen Gasanschluss, eine ausreichend dimensionierte Ablufthaube und die Abnahme durch einen Fachbetrieb. Elektrogeräte – insbesondere Induktion – sind präziser regelbar, einfacher zu reinigen und erzeugen weniger Abwärme in der Küche. Bei begrenzter Stromleistung (z. B. 32 A in Ladenlokalen) empfiehlt sich ein Mix: Gasherd plus Induktionsplatte und Elektro-Kombidämpfer.',
          'Wir geben bei jedem Gerät Anschlusswert (kW), Anschlussart (230 V / 400 V) und bei Gas die Nennwärmebelastung an, damit Ihr Installateur die Versorgung vorab prüfen kann.',
        ),
      },
      {
        h2: 'Kochgeräte planen: Arbeitsablauf, Lüftung, Hygiene',
        html: p(
          'Eine gute Kochzeile folgt dem Arbeitsfluss: Vorbereitung → Garen → Anrichten → Ausgabe. Geräte mit offener Flamme oder Fettdampf (Herd, Fritteuse, Grillplatte) gehören unter eine Ablufthaube nach VDI 2052; Kombidämpfer benötigen Wasseranschluss, Ablauf und bei hohem Dampfaufkommen eine Kondensationshaube. Alle 2MC-Geräte aus Edelstahl (AISI 304) sind HACCP-konform und lassen sich ohne Werkzeug reinigen.',
          'Nutzen Sie unseren kostenlosen 3D-Küchenplaner, um Kochzeile, Haube und Arbeitswege maßstabsgetreu zu prüfen, bevor Sie bestellen.',
        ),
      },
    ],
    faqs: [
      { q: 'Welche Gerätetiefe (600/700/900) ist die richtige?', a: 'Serie 600 eignet sich für kleine Küchen und Bistros, Serie 700 ist der Standard im Restaurant, Serie 900 ist für Großküchen, Hotels und Catering mit hoher Dauerlast ausgelegt. Innerhalb einer Kochzeile sollte die Tiefe einheitlich sein.' },
      { q: 'Brauche ich für Gas-Kochgeräte eine Abnahme?', a: 'Ja. Gasgeräte müssen von einem zugelassenen Installateur angeschlossen und abgenommen werden. Zusätzlich ist eine Ablufthaube mit ausreichender Absaugleistung erforderlich.' },
      { q: 'Sind die Preise netto oder brutto?', a: 'Alle Preise auf 2MC Gastro sind Netto-Preise für Gewerbekunden zzgl. 19 % MwSt. Sie erhalten eine ordnungsgemäße B2B-Rechnung mit ausgewiesener Umsatzsteuer.' },
      { q: 'Kann ich meine Kochzeile vorab planen lassen?', a: 'Ja. Mit dem kostenlosen 2D/3D-Küchenplaner von 2MC Gastro platzieren Sie Kochgeräte in Ihren Raum, prüfen Maße und Arbeitswege und erhalten aus dem Projekt direkt ein Angebot.' },
    ],
    keywords: ['gastro kochgeräte', 'kochgeräte gastronomie', 'großküchengeräte', 'gastro herd', 'kochzeile gastronomie'],
    ggmSlug: 'kochgeraete',
    published: true,
    children: [
      { slug: 'kombidaempfer', taxonomySub: 'kombidaempfer', name: 'Kombidämpfer', h1: 'Kombidämpfer für Gastronomie kaufen', title: 'Kombidämpfer kaufen – 6, 10 & 20 GN, Elektro & Gas', description: 'Kombidämpfer für Gastronomie und Großküche: 6, 10 und 20 GN-1/1-Einschübe, Elektro oder Gas, mit Waschsystem und Kerntemperaturfühler. Netto-Preise, Beratung, Lieferung deutschlandweit.', intro: 'Der Kombidämpfer ersetzt Backofen, Dampfgarer und Grill in einem Gerät: Heißluft, Dampf und Kombi-Modus für Fleisch, Fisch, Gemüse, Backwaren und Regenerieren. Die Kapazität richtet sich nach den Gedecken pro Service: 6 GN für 50–80 Gedecke, 10 GN für 80–150, 20 GN für Großküche und Catering.', keywords: ['kombidämpfer', 'kombidämpfer kaufen', 'kombidämpfer 10 gn', 'kombidämpfer gastronomie', 'konvektomat'], faqs: [{ q: 'Welche Kombidämpfer-Größe brauche ich?', a: '6 GN 1/1 für bis zu 80 Gedecke pro Service, 10 GN für 80–150 Gedecke, 20 GN für Großküche, Hotel und Catering. Bei Bäckereien wird zusätzlich nach Blechmaß 600 × 400 mm unterschieden.' }, { q: 'Braucht ein Kombidämpfer einen Wasseranschluss?', a: 'Ja, Kombidämpfer benötigen einen Kaltwasseranschluss (idealerweise enthärtet) und einen Ablauf. Modelle mit Waschsystem benötigen zusätzlich Reinigerzufuhr.' }] },
      { slug: 'heissluftoefen', taxonomySub: 'oefen', name: 'Heißluftöfen & Backöfen', h1: 'Heißluftöfen & Backöfen für die Gastronomie', title: 'Heißluftofen Gastro kaufen – Konvektionsöfen & Backöfen', description: 'Heißluftöfen und Backöfen für Gastronomie, Bäckerei und Imbiss: Konvektionsöfen 4–10 Bleche, Umluftöfen mit Dampfzugabe, Regenerieröfen. Netto-Preise, schnelle Lieferung.', keywords: ['heißluftofen gastro', 'konvektionsofen gastronomie', 'backofen gastronomie', 'umluftofen gastro'] },
      { slug: 'fritteusen', taxonomySub: 'friteusen', name: 'Fritteusen', h1: 'Gastro Fritteusen – Elektro & Gas', title: 'Gastro Fritteuse kaufen – Elektro & Gas, 8–2×20 Liter', description: 'Professionelle Fritteusen für Gastronomie und Imbiss: Tisch- und Standgeräte, Einzel- und Doppelbecken, 8 bis 2×20 Liter, Elektro oder Gas. Netto-Preise, Lieferung in ganz Deutschland.', intro: 'Die Fritteuse ist im Imbiss, Fast Food und Restaurant das meistgenutzte Kochgerät. Entscheidend sind Literleistung, Aufheizzeit und Ölwechselkomfort (Ablasshahn, Kaltzone). Für Pommes im Dauerbetrieb empfehlen wir Standgeräte mit mindestens 2×10 Litern und 2×9 kW.', keywords: ['gastro fritteuse', 'fritteuse gastronomie', 'gastro fritteuse gas', 'doppel fritteuse gastro', 'standfritteuse'], faqs: [{ q: 'Wie viel Liter Fritteuse brauche ich?', a: 'Kleine Karte und Bistro: 8–10 Liter Tischgerät. Imbiss und Pommes-Schwerpunkt: Doppelfritteuse 2×10 bis 2×20 Liter als Standgerät. Faustregel: pro Liter Öl ca. 1 kg Frittiergut pro Stunde.' }] },
      { slug: 'grillgeraete', taxonomySub: 'grillgeraete', name: 'Grills & Salamander', h1: 'Gastro Grills, Grillplatten & Salamander', title: 'Gastro Grill kaufen – Kontaktgrill, Grillplatte, Salamander', description: 'Grillgeräte für die Gastronomie: Kontaktgrills, Grillplatten (glatt/geriffelt), Lavasteingrills, Salamander, Dönergrills und Gyrosgrills, Gas oder Elektro. Netto-Preise, Lieferung deutschlandweit.', keywords: ['gastro grill', 'kontaktgrill gastro', 'grillplatte gastronomie', 'salamander gastro', 'dönergrill', 'lavasteingrill'] },
      { slug: 'mikrowellen', taxonomySub: 'mikrowellen', name: 'Mikrowellen', h1: 'Gewerbliche Mikrowellen für die Gastronomie', title: 'Gastro Mikrowelle kaufen – gewerblich, 1000–1800 W', description: 'Gewerbliche Mikrowellen für Gastronomie und Imbiss: Edelstahlgehäuse, 1000–1800 Watt, Programmspeicher, für Dauerbetrieb ausgelegt.', keywords: ['gastro mikrowelle', 'gewerbliche mikrowelle', 'mikrowelle gastronomie'] },
      { slug: 'herde-und-kochkessel', taxonomySub: 'kessel-pfannen', name: 'Herde, Kochkessel & Kippbratpfannen', h1: 'Gastro Herde, Kochkessel & Kippbratpfannen', title: 'Gastro Herd kaufen – Gasherd, Induktion, Kochkessel', description: 'Gastro-Herde mit 4–6 Flammen, Induktionsherde, Kochkessel 50–300 Liter, Kippbratpfannen, Nudelkocher und Sous-Vide-Garer für Restaurant und Großküche. Netto-Preise, Beratung, Lieferung.', intro: 'Herd, Kochkessel und Kippbratpfanne bilden die Basis der Warmküche. Gasherde mit 4 bis 6 Brennern und Backofen sind der Restaurant-Standard; Induktionsherde sparen Energie und erleichtern die Reinigung; Kochkessel und Kippbratpfannen sind die Mengenkocher der Großküche.', keywords: ['gastro herd', 'gasherd gastronomie', 'induktionsherd gastro', 'kochkessel gastronomie', 'kippbratpfanne', 'nudelkocher gastro'], faqs: [{ q: 'Gasherd oder Induktionsherd für die Gastronomie?', a: 'Gas bietet schnelle Reaktion und niedrige Betriebskosten, Induktion präzise Regelung, weniger Abwärme und einfache Reinigung. Bei begrenzter Stromleistung ist Gas oft die einzige Option für 6 Kochstellen.' }] },
      { slug: 'warmhaltegeraete', taxonomySub: 'warmegeraete', name: 'Warmhaltegeräte & Bain-Maries', h1: 'Warmhaltegeräte & Bain-Maries', title: 'Bain-Marie & Warmhaltegeräte Gastro kaufen', description: 'Bain-Maries, Wärmebrücken, Speisenwärmer, Toaster und Hot-Dog-Geräte für Ausgabe und Buffet. Netto-Preise für Gewerbekunden.', keywords: ['bain marie', 'bain marie gastro', 'wärmebrücke', 'speisenwärmer gastronomie', 'warmhaltegerät'] },
    ],
  },

  // ── 2. Kühlung ────────────────────────────────────────────────────────────
  {
    slug: 'kuehlung',
    taxonomyCat: 'cooling',
    name: 'Kühlung',
    h1: 'Kühlung für Gastronomie & Großküche',
    title: 'Gastro Kühlschrank & Kühltechnik kaufen – Kühltische, Kühlzellen',
    description: 'Gastro-Kühltechnik: Kühlschränke und Tiefkühlschränke aus Edelstahl, Kühltische, Saladetten, Kühlvitrinen, Kühlzellen, Schockfroster und Eiswürfelbereiter. Über 1.700 Geräte, Netto-Preise, Lieferung in ganz Deutschland.',
    intro: 'Kühltechnik sichert Warenwert, Hygiene und HACCP-Nachweis. Von der Getränkekühlung an der Bar über den Kühltisch am Pass bis zur begehbaren Kühlzelle im Lager: 2MC Gastro führt über 1.700 Kühlgeräte von Diamond, CombiSteel und HENDI. Wir helfen bei der Auswahl nach Volumen, Klimaklasse, Energieeffizienz und Einbausituation – und planen Kühlräume und Kühlzeilen kostenlos in 2D/3D.',
    sections: [
      {
        h2: 'Welche Kühlgeräte gehören in eine Gastroküche?',
        html: ul(
          '<strong>Kühlschränke & Tiefkühlschränke</strong> (400–1.400 Liter, Volltür oder Glastür) für Lager und Tageskühlung',
          '<strong>Kühltische & Saladetten</strong> als gekühlte Arbeitsfläche direkt am Posten – Pizza, Salat, Belegstation',
          '<strong>Kühlzellen</strong> (begehbar, ab 4 m³) für Wareneingang und Wochenvorrat',
          '<strong>Schockfroster</strong> für Cook & Chill und HACCP-konformes Herunterkühlen von +70 °C auf +3 °C in 90 Minuten',
          '<strong>Kühlvitrinen & Kühltheken</strong> zur Präsentation von Kuchen, Fleisch, Fisch und Getränken',
          '<strong>Eiswürfelbereiter</strong> mit 20–150 kg Tagesleistung für Bar und Café',
        ),
      },
      {
        h2: 'Klimaklasse, Energieeffizienz und Kältemittel',
        html: p(
          'Gewerbliche Kühlgeräte werden nach Klimaklasse (bis 4 = 30 °C/55 % r. F., Klasse 5 = 40 °C/40 % r. F.) für die Umgebungstemperatur der Küche ausgelegt. In heißen Kochbereichen wählen Sie Klimaklasse 4 oder 5, sonst leidet die Kühlleistung. Achten Sie auf das EU-Energielabel: Ein Gerät der Klasse C oder besser spart gegenüber älteren Geräten bis zu 40 % Strom pro Jahr. Moderne Geräte arbeiten mit den natürlichen Kältemitteln R290 (Propan) oder R600a und erfüllen die F-Gase-Verordnung.',
          'Umluftkühlung (ventiliert) hält die Temperatur gleichmäßig und ist Standard für Küchen; statische Kühlung eignet sich für Getränke und empfindliche Waren.',
        ),
      },
      {
        h2: 'HACCP: Temperaturen dokumentieren',
        html: p(
          'Kühlware muss bei maximal +7 °C (Fleisch +4 °C, Hackfleisch +2 °C, Fisch +2 °C) und Tiefkühlware bei −18 °C gelagert werden. Digitale Temperaturanzeigen, optionale Datenlogger und Alarmfunktion erleichtern den Nachweis bei der Lebensmittelkontrolle. Alle Geräte sind aus Edelstahl AISI 304 mit abgerundeten Innenecken und herausnehmbaren Rosten – einfach zu reinigen, dauerhaft hygienisch.',
        ),
      },
    ],
    faqs: [
      { q: 'Welcher Gastro-Kühlschrank ist der richtige für meinen Betrieb?', a: 'Für Tageskühlung am Posten reicht ein 400–700-Liter-Volltürschrank, für das Lager sind 1.200–1.400 Liter oder eine Kühlzelle sinnvoll. Glastürschränke eignen sich zur Präsentation von Getränken und Kuchen im Gastraum.' },
      { q: 'Was bedeutet Klimaklasse 4 oder 5?', a: 'Die Klimaklasse gibt an, bis zu welcher Umgebungstemperatur das Gerät seine Kühlleistung hält: Klasse 4 bis 30 °C, Klasse 5 bis 40 °C. In der Nähe der Kochzeile sollte mindestens Klimaklasse 4 gewählt werden.' },
      { q: 'Brauche ich einen Schockfroster?', a: 'Wer vorproduziert (Cook & Chill), Speisen einfriert oder HACCP-konform abkühlen muss, braucht einen Schockfroster: Er kühlt von +70 °C auf +3 °C in unter 90 Minuten und verhindert Keimwachstum.' },
      { q: 'Liefern Sie Kühlzellen inklusive Montage?', a: 'Kühlzellen werden als Paneelbausatz mit Aggregat geliefert; Montage und Inbetriebnahme durch einen Kältetechniker bieten wir auf Anfrage in NRW und angrenzenden Regionen an.' },
    ],
    keywords: ['gastro kühlschrank', 'gastronomie kühlschrank', 'kühltechnik gastronomie', 'gewerbekühlschrank', 'gastro kühlung'],
    ggmSlug: 'kuehlung',
    published: true,
    children: [
      { slug: 'kuehlschraenke', taxonomySub: 'kuehlschraenke', name: 'Kühlschränke & Tiefkühlschränke', h1: 'Gastro Kühlschränke & Tiefkühlschränke aus Edelstahl', title: 'Gastro Kühlschrank kaufen – Edelstahl, 400–1400 Liter', description: 'Gastro-Kühlschränke und Tiefkühlschränke aus Edelstahl: 400 bis 1.400 Liter, Volltür oder Glastür, Umluft, Klimaklasse 4/5, GN 2/1. Netto-Preise, Lieferung in ganz Deutschland.', intro: 'Der Gastro-Kühlschrank ist das meistverkaufte Kühlgerät: Edelstahl innen und außen, GN-2/1-Roste, Umluftkühlung und digitale Steuerung. Wählen Sie zwischen Volltür (Lager), Glastür (Präsentation), Kühl- oder Tiefkühlausführung sowie 1- oder 2-türigen Modellen mit 700 bis 1.400 Litern.', keywords: ['gastro kühlschrank', 'gastro kühlschrank edelstahl', 'tiefkühlschrank gastro', 'gewerbekühlschrank', 'kühlschrank gastronomie 700 liter'], faqs: [{ q: 'Wie viel Liter sollte ein Gastro-Kühlschrank haben?', a: 'Für den Posten reichen 400–700 Liter (1 Tür), für Lager und Wochenware 1.200–1.400 Liter (2 Türen). Rechnen Sie ca. 15–20 Liter Kühlvolumen pro Gedeck und Tag.' }, { q: 'Was ist der Unterschied zwischen Umluft- und statischer Kühlung?', a: 'Umluft verteilt die Kälte per Ventilator gleichmäßig und ist Standard für Küchen; statische Kühlung ist leiser und trocknet Lebensmittel weniger aus, eignet sich aber eher für Getränke.' }] },
      { slug: 'kuehltische', taxonomySub: 'kuehltische', name: 'Kühltische', h1: 'Kühltische für Gastronomie & Pizzeria', title: 'Kühltisch Gastro kaufen – 2–4 Türen, GN 1/1, Edelstahl', description: 'Kühltische mit 2, 3 oder 4 Türen oder Schubladen, GN 1/1, mit oder ohne Aufkantung, Pizzakühltische und Tiefkühltische. Netto-Preise, Lieferung deutschlandweit.', intro: 'Ein Kühltisch verbindet gekühlten Stauraum mit einer Edelstahl-Arbeitsfläche direkt am Posten. Türen oder Schubladen, Aufkantung, Granitplatte für Pizzerien – die Auswahl richtet sich nach Arbeitsablauf und Platz.', keywords: ['kühltisch', 'kühltisch gastro', 'kühltisch 3 türen', 'tiefkühltisch', 'kühlwerkbank'] },
      { slug: 'saladetten', taxonomySub: 'salatkuehlung', name: 'Saladetten & Pizzakühltische', h1: 'Saladetten & Pizzakühltische', title: 'Saladette kaufen – gekühlte Belegstation, Pizzakühltisch', description: 'Saladetten und Pizzakühltische mit GN-Aufsatz für Salate, Beläge und Zutaten – die gekühlte Belegstation für Pizzeria, Sandwich-Bar und Restaurant.', keywords: ['saladette', 'pizzakühltisch', 'belegstation kühlung', 'salatkühlung'] },
      { slug: 'kuehlvitrinen', taxonomySub: 'vitrinen', name: 'Kühlvitrinen', h1: 'Kühlvitrinen für Kuchen, Sushi & Getränke', title: 'Kühlvitrine Gastro kaufen – Kuchenvitrine, Sushivitrine', description: 'Kühlvitrinen für Café, Bäckerei und Gastronomie: Kuchenvitrinen, Aufsatzvitrinen, Sushivitrinen, Panoramavitrinen und Getränkevitrinen.', keywords: ['kühlvitrine', 'kuchenvitrine gekühlt', 'kühlvitrine gastro', 'sushi vitrine', 'aufsatzkühlvitrine'] },
      { slug: 'kuehltheken', taxonomySub: 'kuehltheken', name: 'Kühltheken', h1: 'Kühltheken für Fleisch, Fisch & Feinkost', title: 'Kühltheke kaufen – Fleischtheke, Fischtheke, Bedientheke', description: 'Kühltheken und Bedientheken für Metzgerei, Fischhandel, Feinkost und Bäckerei: statische und ventilierte Ausführung, gerade oder geschwungene Scheibe.', keywords: ['kühltheke', 'fleischtheke', 'fischtheke', 'bedientheke kühlung', 'verkaufskühlung'] },
      { slug: 'kuehlzellen', taxonomySub: 'kuehlhaeuser', name: 'Kühlzellen', h1: 'Kühlzellen & Tiefkühlzellen (begehbar)', title: 'Kühlzelle kaufen – begehbar, 4–30 m³, inkl. Aggregat', description: 'Begehbare Kühlzellen und Tiefkühlzellen ab 4 m³ als Paneelbausatz mit Aggregat, 80–100 mm Isolierung, mit oder ohne Boden. Planung und Montage auf Anfrage.', intro: 'Kühlzellen sind die wirtschaftlichste Lösung für größere Lagermengen: modulare Paneele, Schnellverschluss, Aggregat aufgesetzt oder abgesetzt. Wir planen Kühlzellen mit Ihnen nach Raummaß und Bedarf.', keywords: ['kühlzelle', 'kühlzelle begehbar', 'tiefkühlzelle', 'kühlraum gastronomie', 'kühlzelle mit aggregat'], faqs: [{ q: 'Welche Größe sollte meine Kühlzelle haben?', a: 'Für ein Restaurant mit 60–100 Sitzplätzen sind 6–10 m³ Kühlzelle plus 4–6 m³ Tiefkühlzelle üblich. Planen Sie ca. 0,1 m³ pro Gedeck und Woche Lagerware.' }] },
      { slug: 'schockfroster', taxonomySub: 'schockfroster', name: 'Schockfroster', h1: 'Schockfroster & Schnellkühler', title: 'Schockfroster kaufen – 3 bis 20 GN, Cook & Chill', description: 'Schockfroster und Schnellkühler mit 3, 5, 10 oder 20 GN-1/1-Einschüben für HACCP-konformes Abkühlen und Schockfrosten. Netto-Preise, Beratung, Lieferung.', keywords: ['schockfroster', 'schnellkühler gastro', 'blast chiller', 'schockfroster gastronomie', 'cook and chill'] },
      { slug: 'eiswuerfelbereiter', taxonomySub: 'eiswuerfel', name: 'Eiswürfelbereiter', h1: 'Eiswürfelbereiter & Eismaschinen', title: 'Eiswürfelmaschine Gastro kaufen – 20–150 kg/Tag', description: 'Eiswürfelbereiter für Bar, Café und Gastronomie: Hohlkegel- und Vollwürfel, Crushed Ice, Nugget-Eis, 20 bis 150 kg Tagesleistung, Luft- oder Wasserkühlung.', keywords: ['eiswürfelmaschine gastro', 'eiswürfelbereiter', 'eismaschine gastronomie', 'crushed ice maschine'] },
      { slug: 'getraenkekuehler', taxonomySub: 'getraenke', name: 'Getränkekühler & Dispenser', h1: 'Getränkekühler, Dispenser & Granita-Maschinen', title: 'Getränkekühler & Saftdispenser Gastro kaufen', description: 'Getränkekühlschränke, Saftdispenser, Granita- und Slush-Maschinen sowie Wasserkühler für Bar, Café und Buffet.', keywords: ['getränkekühlschrank gastro', 'saftdispenser', 'granita maschine', 'slush maschine gastro'] },
      { slug: 'tiefkuehltruhen', taxonomySub: 'truhen', name: 'Tiefkühltruhen', h1: 'Gewerbliche Tiefkühltruhen', title: 'Tiefkühltruhe Gastro kaufen – 200–600 Liter', description: 'Gewerbliche Tiefkühltruhen mit 200 bis 600 Litern, Klappdeckel oder Glasschiebedeckel, für Lager, Eisdiele und Verkauf.', keywords: ['tiefkühltruhe gastro', 'gewerbliche tiefkühltruhe', 'gefriertruhe gastronomie'] },
    ],
  },

  // ── 3. Spültechnik ────────────────────────────────────────────────────────
  {
    slug: 'spueltechnik',
    taxonomyCat: 'dishwash',
    name: 'Spültechnik',
    h1: 'Gewerbliche Spülmaschinen für die Gastronomie',
    title: 'Gastro Spülmaschine kaufen – Haubenspüler, Gläserspüler',
    description: 'Gewerbliche Spülmaschinen für Gastronomie und Großküche: Gläserspülmaschinen, Geschirrspülmaschinen (Fronteinschub), Haubenspülmaschinen, Topfspüler und Bandspülmaschinen mit 2-Minuten-Programmen. Netto-Preise, Lieferung in ganz Deutschland.',
    intro: 'Eine gewerbliche Spülmaschine spült einen Korb in 90 bis 180 Sekunden bei 60–65 °C und klarspült mit 85 °C – hygienisch, schnell und mit weniger Wasser als jede Handspülung. Die richtige Bauart hängt von Geschirrart und Menge ab: Gläserspüler für Bar und Café, Fronteinschub-Geschirrspüler für Restaurants bis ca. 100 Gedecke, Haubenspülmaschine ab 100 Gedecken und Bandspülmaschine für Kantine und Großküche.',
    sections: [
      {
        h2: 'Welche Spülmaschine für welchen Betrieb?',
        html: ul(
          '<strong>Gläserspülmaschine</strong> (Korb 35–40 cm): Bar, Café, Bistro – bis 30 Körbe/Stunde',
          '<strong>Geschirrspülmaschine Fronteinschub</strong> (Korb 50 × 50 cm): Restaurant bis ca. 100 Gedecke – bis 40 Körbe/Stunde',
          '<strong>Haubenspülmaschine</strong> (Korb 50 × 50 cm, Durchschub): Restaurant und Hotel ab 100 Gedecken – bis 60 Körbe/Stunde, mit Zu- und Ablauftisch',
          '<strong>Topfspülmaschine</strong>: GN-Behälter, Töpfe, Bleche – hohe Einschubhöhe',
          '<strong>Bandspülmaschine</strong>: Kantine, Mensa, Krankenhaus – über 1.000 Teller pro Stunde',
        ),
      },
      {
        h2: 'Anschluss, Wasserhärte und Dosierung',
        html: p(
          'Gewerbliche Spülmaschinen benötigen 400 V (kleinere Gläserspüler 230 V), einen Warm- oder Kaltwasseranschluss und einen Ablauf. Bei Wasserhärte über 7 °dH ist ein Enthärter (eingebaut oder extern) Pflicht, sonst verkalken Boiler und Düsen innerhalb weniger Monate. Dosierpumpen für Reiniger und Klarspüler sind bei den meisten Modellen eingebaut; eine Ablaufpumpe ermöglicht die Aufstellung ohne bodennahen Abfluss.',
          'Achten Sie auf die Tankheizung und Boilerleistung: Nur mit ausreichend Heizleistung erreicht das Gerät die 85 °C Klarspültemperatur auch im Dauerbetrieb.',
        ),
      },
      {
        h2: 'Spülküche planen',
        html: p(
          'Die Spülküche folgt dem Prinzip „schmutzig → sauber“ in einer Richtung: Abräumtisch mit Abfallöffnung und Vorspülbrause, Spülmaschine, Ablauftisch, Regal. Für Haubenspülmaschinen benötigen Sie Zu- und Ablauftische aus Edelstahl, die wir passend anbieten. Im 3D-Küchenplaner prüfen Sie die Spülstrecke inklusive Türen und Laufwegen.',
        ),
      },
    ],
    faqs: [
      { q: 'Wie lange dauert ein Spülgang in einer Gastro-Spülmaschine?', a: 'Je nach Programm 90 bis 180 Sekunden. Gläserspüler arbeiten oft mit 2-Minuten-Programmen, Haubenspülmaschinen mit 1–3 Minuten je Korb.' },
      { q: 'Brauche ich einen Enthärter?', a: 'Ab 7 °dH Wasserhärte ja. Viele Modelle sind mit eingebautem Enthärter erhältlich; alternativ wird ein externer Enthärter vorgeschaltet. Ohne Enthärter verkalken Boiler und Heizstäbe und die Garantie kann erlöschen.' },
      { q: 'Kann ich eine gewerbliche Spülmaschine an 230 V betreiben?', a: 'Kleinere Gläserspülmaschinen und einige Fronteinschub-Geräte sind mit 230 V erhältlich. Haubenspülmaschinen und Topfspüler benötigen in der Regel 400 V.' },
      { q: 'Was ist der Unterschied zwischen Haubenspülmaschine und Fronteinschub?', a: 'Beim Fronteinschub wird der Korb von vorn eingeschoben (kompakt, unter der Arbeitsplatte). Die Haubenspülmaschine steht zwischen Zu- und Ablauftisch, der Korb wird durchgeschoben – deutlich schneller bei hohem Aufkommen.' },
    ],
    keywords: ['gastro spülmaschine', 'gewerbliche spülmaschine', 'gastronomie spülmaschine', 'spülmaschine gastro', 'industriespülmaschine'],
    ggmSlug: 'spuelen-und-reinigen',
    published: true,
    children: [
      { slug: 'haubenspuelmaschinen', taxonomySub: 'hauben-spuelmaschinen', name: 'Haubenspülmaschinen', h1: 'Haubenspülmaschinen (Durchschub)', title: 'Haubenspülmaschine kaufen – Durchschubspüler 50×50', description: 'Haubenspülmaschinen für Restaurant und Hotel ab 100 Gedecken: Korb 50 × 50 cm, bis 60 Körbe pro Stunde, Zu- und Ablauftische passend erhältlich.', keywords: ['haubenspülmaschine', 'durchschubspülmaschine', 'haubenspüler gastro'] },
      { slug: 'geschirrspuelmaschinen', taxonomySub: 'geschirrspueler', name: 'Geschirrspülmaschinen', h1: 'Gewerbliche Geschirrspülmaschinen (Fronteinschub)', title: 'Gewerbliche Geschirrspülmaschine kaufen – Fronteinschub', description: 'Geschirrspülmaschinen mit Fronteinschub für Restaurant, Café und Imbiss: Korb 50 × 50 cm, 2–3-Minuten-Programme, mit Ablaufpumpe und Dosierung.', keywords: ['gewerbliche geschirrspülmaschine', 'geschirrspüler gastronomie', 'unterbau spülmaschine gastro'] },
      { slug: 'glaeserspuelmaschinen', taxonomySub: 'glaeserspueler', name: 'Gläserspülmaschinen', h1: 'Gläserspülmaschinen für Bar & Café', title: 'Gläserspülmaschine kaufen – Bar, Café, 230 V', description: 'Gläserspülmaschinen mit Korb 35–40 cm für Bar, Café und Bistro: 230 V, 2-Minuten-Programm, Klarspülung 85 °C.', keywords: ['gläserspülmaschine', 'gläserspüler gastro', 'gläserspülmaschine bar'] },
      { slug: 'bandspuelmaschinen', taxonomySub: 'korbtransport', name: 'Bandspülmaschinen', h1: 'Korbtransport- & Bandspülmaschinen', title: 'Bandspülmaschine kaufen – Kantine, Mensa, Großküche', description: 'Korbtransport- und Bandspülmaschinen für Kantine, Mensa und Krankenhaus mit über 1.000 Tellern pro Stunde.', keywords: ['bandspülmaschine', 'korbtransportspülmaschine', 'spülmaschine großküche'] },
      { slug: 'spuelmaschinen-zubehoer', taxonomySub: 'dishwash-zubehoer', name: 'Spülkörbe & Zubehör', h1: 'Spülkörbe, Enthärter & Zubehör', title: 'Spülkörbe & Spülmaschinen-Zubehör kaufen', description: 'Spülkörbe 50 × 50 cm, Gläserkörbe, Besteckköcher, Enthärter, Osmoseanlagen und Poliermaschinen für die Spülküche.', keywords: ['spülkorb 50x50', 'gläserkorb', 'enthärter spülmaschine', 'gläserpoliermaschine'] },
    ],
  },

  // ── 4. Edelstahlmöbel ─────────────────────────────────────────────────────
  {
    slug: 'edelstahlmoebel',
    taxonomyCat: 'prep_hygiene',
    name: 'Edelstahlmöbel',
    h1: 'Edelstahlmöbel für Gastronomie & Großküche',
    title: 'Edelstahlmöbel Gastro kaufen – Arbeitstische, Spülen, Regale',
    description: 'Edelstahlmöbel für die Gastronomie: Arbeitstische mit und ohne Aufkantung, Spültische und Spülbecken, Wandregale, Schränke und Hygieneausstattung aus Edelstahl AISI 304. Netto-Preise, Lieferung in ganz Deutschland.',
    intro: 'Edelstahlmöbel sind die neutrale Basis jeder gewerblichen Küche: Arbeitstische, Spültische, Wandborde und Schränke aus rostfreiem Edelstahl AISI 304 erfüllen die Hygieneanforderungen der Lebensmittelüberwachung, sind fugenarm und halten Jahrzehnte. 2MC Gastro führt über 600 Edelstahlmöbel in den Standardtiefen 600 und 700 mm sowie in Rasterbreiten von 400 bis 2.400 mm – auf Wunsch fertigen die Hersteller nach Maß.',
    sections: [
      {
        h2: 'Arbeitstische, Spültische, Regale: die Grundausstattung',
        html: p(
          'Arbeitstische gibt es mit Grundboden, Zwischenboden, Aufkantung (Wandanschluss) und Schubladen. Spültische mit ein oder zwei Becken bilden mit Vorspülbrause die Abräumstrecke; Handwaschbecken mit Kniebedienung sind in jeder Küche Pflicht. Wandborde und Regale nutzen die Höhe, Schränke mit Schiebetüren schützen Geschirr und Vorräte vor Verschmutzung.',
          'Alle Möbel werden zerlegt oder verschweißt geliefert; verschweißte Ausführungen sind stabiler und leichter zu reinigen, zerlegte passen durch jede Tür.',
        ),
      },
      {
        h2: 'Materialstärke und Edelstahlqualität',
        html: p(
          'Für Arbeitsflächen sind 0,8–1,2 mm Blechstärke üblich, für Spültische und stark belastete Tische 1,2–1,5 mm. AISI 304 (V2A) ist der Standard für Küchen; AISI 316 (V4A) empfiehlt sich bei aggressiven Reinigern oder Salzwasserkontakt. Wir kennzeichnen Materialstärke und Legierung bei jedem Produkt.',
        ),
      },
      {
        h2: 'Möbel nach Maß und Küchenplanung',
        html: p(
          'Nicht jede Küche passt ins Raster. Diamond und CombiSteel fertigen Arbeitstische, Spültische und Theken in Sondermaßen; Lieferzeit 3–6 Wochen. Mit unserem 3D-Küchenplaner legen Sie Möbelzeilen an Wänden entlang, prüfen Türen und Durchgänge und exportieren die Maßliste für das Angebot.',
        ),
      },
    ],
    faqs: [
      { q: 'Welche Blechstärke sollte ein Edelstahl-Arbeitstisch haben?', a: 'Für normale Arbeitsflächen 0,8–1,0 mm, für stark belastete Tische (Fleischverarbeitung, schwere Geräte) 1,2–1,5 mm. Die Unterkonstruktion ist entscheidend für die Tragkraft.' },
      { q: 'Wo ist ein Handwaschbecken vorgeschrieben?', a: 'Nach EU-Verordnung 852/2004 muss in jedem Vorbereitungs- und Kochbereich ein separates Handwaschbecken mit Warm-/Kaltwasser, Seife und Papierhandtüchern vorhanden sein – idealerweise mit Knie- oder Sensorbedienung.' },
      { q: 'Werden Edelstahlmöbel montiert geliefert?', a: 'Verschweißte Möbel werden montiert geliefert, zerlegte Möbel als Bausatz mit Montageanleitung. Auf Wunsch übernehmen wir in NRW Aufstellung und Ausrichtung.' },
      { q: 'Fertigen Sie Edelstahlmöbel nach Maß?', a: 'Ja, über unsere Hersteller Diamond und CombiSteel. Senden Sie uns Maße und Skizze, wir erstellen ein Angebot; Lieferzeit ca. 3–6 Wochen.' },
    ],
    keywords: ['edelstahlmöbel gastronomie', 'edelstahltisch', 'arbeitstisch edelstahl', 'gastro edelstahl', 'edelstahl küchenmöbel'],
    ggmSlug: 'edelstahlmoebel',
    published: true,
    children: [
      { slug: 'arbeitstische', taxonomySub: 'arbeitstische', name: 'Arbeitstische', h1: 'Edelstahl Arbeitstische für die Gastronomie', title: 'Edelstahltisch kaufen – Arbeitstisch 600/700 mm, mit Aufkantung', description: 'Edelstahl-Arbeitstische in 600 und 700 mm Tiefe, 400–2.400 mm Breite, mit Grundboden, Aufkantung, Schubladen oder Schneidbrett. AISI 304, Netto-Preise, schnelle Lieferung.', intro: 'Der Edelstahl-Arbeitstisch ist das Basismöbel jeder Küche. Wählen Sie Tiefe (600/700 mm), Breite im 100-mm-Raster, mit oder ohne Aufkantung und Grundboden. Verschweißte Tische sind stabiler, zerlegte passen durch enge Türen.', keywords: ['edelstahltisch', 'arbeitstisch edelstahl', 'edelstahl arbeitstisch gastro', 'edelstahltisch mit aufkantung', 'edelstahltisch 200 cm'] },
      { slug: 'spuelbecken-und-armaturen', taxonomySub: 'spuelbecken', name: 'Spültische & Armaturen', h1: 'Spültische, Spülbecken & Armaturen', title: 'Spültisch Edelstahl kaufen – 1 oder 2 Becken, Handwaschbecken', description: 'Spültische und Spülbecken aus Edelstahl mit 1 oder 2 Becken, Abtropffläche links/rechts, Handwaschbecken mit Kniebedienung, Vorspülbrausen und Mischbatterien.', keywords: ['spültisch edelstahl', 'gastro spüle', 'handwaschbecken gastronomie', 'vorspülbrause', 'spülbecken edelstahl'] },
      { slug: 'regale', taxonomySub: 'regale', name: 'Regale & Wandborde', h1: 'Edelstahl Regale & Wandborde', title: 'Edelstahlregal Gastro kaufen – Wandbord, Lagerregal', description: 'Edelstahlregale, Wandborde und Lagerregale für Küche, Lager und Kühlzelle – hygienisch, verstellbar, hoch belastbar.', keywords: ['edelstahlregal', 'wandregal edelstahl gastro', 'wandbord edelstahl', 'lagerregal gastronomie'] },
      { slug: 'schraenke', taxonomySub: 'schraenke', name: 'Schränke', h1: 'Edelstahlschränke & Wandhängeschränke', title: 'Edelstahlschrank Gastro kaufen – Arbeitsschrank, Wandschrank', description: 'Edelstahl-Arbeitsschränke mit Schiebetüren, Wandhängeschränke, Geschirrschränke und Wärmeschränke für Küche und Ausgabe.', keywords: ['edelstahlschrank', 'arbeitsschrank edelstahl', 'wandhängeschrank edelstahl', 'geschirrschrank gastronomie'] },
      { slug: 'abfall-und-hygiene', taxonomySub: 'abfall-hygiene', name: 'Abfall & Hygiene', h1: 'Abfallsysteme & Hygieneausstattung', title: 'Abfalleimer & Hygiene Gastronomie kaufen', description: 'Abfallsammler, Mülltonnenkühler, Insektenvernichter, Ozon-Geräte, Messersterilisatoren und Hygieneausstattung für gewerbliche Küchen.', keywords: ['abfalleimer gastronomie', 'insektenvernichter gastro', 'messersterilisator', 'hygieneausstattung küche'] },
    ],
  },

  // ── 5. Pizza & Teig ───────────────────────────────────────────────────────
  {
    slug: 'pizza-und-teig',
    taxonomyCat: 'pizza_pasta',
    name: 'Pizza & Teig',
    h1: 'Pizzaöfen & Teigmaschinen für Pizzeria und Bäckerei',
    title: 'Pizzaofen Gastro kaufen – Elektro, Gas, Teigknetmaschinen',
    description: 'Pizzaöfen für die Gastronomie (Elektro, Gas, 1–2 Kammern, 4–12 Pizzen), Teigknetmaschinen 10–60 kg, Teigausrollmaschinen, Teigportionierer und Nudelmaschinen. Netto-Preise, Lieferung deutschlandweit.',
    intro: 'Für Pizzeria, Lieferdienst und italienisches Restaurant zählt die Kette Teig → Kühlung → Belegen → Backen. 2MC Gastro führt über 400 Geräte: Elektro-Pizzaöfen mit Schamottboden und 400–500 °C für Pizza in 3–4 Minuten, Gas-Pizzaöfen, Spiralkneter von 10 bis 60 kg Teig, Teigausroller, Portionierer und Nudelmaschinen. Dazu passende Pizzakühltische finden Sie in der Kühlung.',
    sections: [
      {
        h2: 'Elektro- oder Gas-Pizzaofen?',
        html: p(
          'Elektro-Pizzaöfen mit separat regelbarer Ober-/Unterhitze und Schamottboden sind der Standard in Pizzerien: 1 oder 2 Kammern für je 4, 6 oder 9 Pizzen à 30–34 cm, 400 V, Backzeit 3–5 Minuten bei 350–450 °C. Gas-Pizzaöfen sind bei fehlender Stromleistung oder hohem Durchsatz wirtschaftlicher; Holzofen-Optik-Modelle mit Gasbrenner liefern das Kuppelofen-Ergebnis ohne Holzlager.',
          'Für Lieferdienste mit über 300 Pizzen am Abend empfiehlt sich ein Durchlaufofen (Tunnelofen) mit Förderband.',
        ),
      },
      {
        h2: 'Teigknetmaschinen richtig dimensionieren',
        html: p(
          'Spiralkneter werden nach Teigmenge pro Charge angegeben: 10–18 kg für kleine Pizzerien, 25–40 kg für Betriebe mit 150+ Pizzen am Tag, 50–60 kg für Bäckerei und Produktion. Achten Sie auf Kesselvolumen (Liter) versus Teigkapazität (kg) und auf Modelle mit 2 Geschwindigkeiten für hydratisierte Teige. Teigausrollmaschinen und Teigportionierer beschleunigen die Vorbereitung und sorgen für gleichmäßige Böden.',
        ),
      },
    ],
    faqs: [
      { q: 'Welche Größe Pizzaofen brauche ich?', a: 'Bis ca. 100 Pizzen am Abend reicht ein Ofen mit 1 Kammer für 4–6 Pizzen; bei 100–250 Pizzen ein 2-Kammer-Ofen (2×6 oder 2×9); darüber ein Durchlaufofen.' },
      { q: 'Wie heiß wird ein Gastro-Pizzaofen?', a: 'Elektro-Pizzaöfen mit Schamottboden erreichen 400–500 °C. Bei 350–400 °C ist eine neapolitanische Pizza in 3–4 Minuten fertig.' },
      { q: 'Welche Teigknetmaschine für 200 Pizzen am Tag?', a: 'Bei ca. 250 g Teig pro Pizza sind das 50 kg Teig am Tag – ein Spiralkneter mit 25–30 kg Kapazität und zwei Chargen reicht; mit 40 kg haben Sie Reserve.' },
      { q: 'Brauche ich für einen Pizzaofen eine Abzugshaube?', a: 'Elektro-Pizzaöfen benötigen in der Regel keine Fettabscheidung, aber eine Wärmeabführung; Gas-Pizzaöfen und Holzöfen brauchen einen Abzug. Wir beraten nach Ihrer örtlichen Bauordnung.' },
    ],
    keywords: ['pizzaofen gastro', 'pizzaofen gastronomie', 'pizzaofen elektro gastro', 'teigknetmaschine', 'pizzeria ausstattung', 'pizzaofen kaufen'],
    ggmSlug: 'teig-und-mehl',
    published: true,
    children: [
      { slug: 'pizzaoefen', taxonomySub: 'pizzaoefen', name: 'Pizzaöfen', h1: 'Pizzaöfen – Elektro, Gas & Durchlauf', title: 'Pizzaofen kaufen – Elektro & Gas, 4–18 Pizzen', description: 'Gastro-Pizzaöfen: Elektro mit Schamottboden (1–2 Kammern, 4–18 Pizzen, bis 500 °C), Gas-Pizzaöfen und Durchlauföfen für Pizzeria und Lieferdienst. Netto-Preise, Lieferung deutschlandweit.', intro: 'Vom kompakten 4er-Ofen für die Bar bis zum 2-Kammer-Ofen mit 18 Pizzen: Elektro-Pizzaöfen mit separater Ober-/Unterhitze und Schamottstein liefern bei 400–500 °C in 3–5 Minuten eine knusprige Pizza.', keywords: ['pizzaofen', 'pizzaofen gastro', 'pizzaofen elektro', 'pizzaofen gas', 'pizzaofen 2 kammern', 'durchlaufofen pizza'] },
      { slug: 'teigknetmaschinen', taxonomySub: 'teigkneter', name: 'Teigknetmaschinen', h1: 'Teigknetmaschinen & Spiralkneter', title: 'Teigknetmaschine kaufen – Spiralkneter 10–60 kg', description: 'Spiralkneter und Teigknetmaschinen von 10 bis 60 kg Teigkapazität, 1–2 Geschwindigkeiten, feste oder abnehmbare Kessel, für Pizzeria und Bäckerei.', keywords: ['teigknetmaschine', 'spiralkneter', 'teigknetmaschine gastro', 'teigmaschine pizza', 'spiralteigknetmaschine'] },
      { slug: 'teigausrollmaschinen', taxonomySub: 'teigausroller', name: 'Teigausrollmaschinen', h1: 'Teigausrollmaschinen & Pizzapressen', title: 'Teigausrollmaschine kaufen – Pizza 26–45 cm', description: 'Teigausrollmaschinen und Pizzapressen für Böden von 26 bis 45 cm – gleichmäßig, schnell, ohne Kraftaufwand.', keywords: ['teigausrollmaschine', 'pizzateig ausrollmaschine', 'pizzapresse', 'teigausroller'] },
      { slug: 'teigportionierer', taxonomySub: 'teigportionierer', name: 'Teigportionierer', h1: 'Teigportionierer & Teigabrunder', title: 'Teigportionierer kaufen – Teigteiler & Rundwirker', description: 'Teigportionierer, Teigteiler und Rundwirkmaschinen für gleichmäßige Teiglinge in Pizzeria und Bäckerei.', keywords: ['teigportionierer', 'teigteiler', 'teigabrunder', 'rundwirkmaschine'] },
      { slug: 'nudelmaschinen', taxonomySub: 'nudelmaschinen', name: 'Nudelmaschinen', h1: 'Nudelmaschinen für die Gastronomie', title: 'Nudelmaschine Gastro kaufen – Pasta-Extruder', description: 'Elektrische Nudelmaschinen und Pasta-Extruder für frische Pasta im Restaurant: 2–8 kg Teig pro Stunde, wechselbare Matrizen.', keywords: ['nudelmaschine gastro', 'pastamaschine gastronomie', 'nudelmaschine elektrisch profi'] },
      { slug: 'pizza-zubehoer', taxonomySub: 'pizza-zubehoer', name: 'Pizza-Zubehör', h1: 'Pizza-Zubehör: Schaufeln, Bleche, Teigbehälter', title: 'Pizza Zubehör Gastro – Pizzaschaufel, Bleche, Teigboxen', description: 'Pizzaschaufeln, Pizzableche und Screens, Teigbehälter, Pizzaschneider und Mozzarella-Reiben für die Pizzeria.', keywords: ['pizzaschaufel', 'pizzablech gastro', 'teigbehälter pizza', 'pizzaschneider profi'], published: false },
    ],
  },

  // ── 6. Lüftung ────────────────────────────────────────────────────────────
  {
    slug: 'lueftung',
    taxonomyCat: 'ventilation',
    name: 'Lüftung',
    h1: 'Lüftungstechnik & Abzugshauben für die Gastronomie',
    title: 'Dunstabzugshaube Gastro kaufen – Wandhaube, Inselhaube, Abluft',
    description: 'Gastro-Lüftungstechnik: Wandhauben und Inselhauben aus Edelstahl mit Flammschutzfiltern, Abluftventilatoren, Motorboxen, Aktivkohlefilter und Zubehör nach VDI 2052. Netto-Preise, Planung, Lieferung.',
    intro: 'Jede gewerbliche Küche mit Koch- und Bratgeräten benötigt eine Abluftanlage: Sie führt Fettdampf, Wärme und Feuchtigkeit ab, schützt vor Fettbrand und ist Voraussetzung für die Betriebsgenehmigung. 2MC Gastro liefert Edelstahl-Wandhauben und Inselhauben in Breiten von 1.000 bis 4.000 mm, passende Radialventilatoren und Motorboxen sowie Filter und Regler – und berechnet für Sie den nötigen Luftvolumenstrom nach VDI 2052.',
    sections: [
      {
        h2: 'Wandhaube oder Inselhaube – und wie groß?',
        html: p(
          'Steht die Kochzeile an der Wand, ist die Wandhaube (Schrägmodell oder Kastenhaube) die richtige Wahl; freistehende Kochblöcke erhalten eine Inselhaube mit Absaugung von allen Seiten. Die Haube sollte die Geräte an jeder Seite um 200–300 mm überragen und in 1.900–2.100 mm Höhe hängen. Als Faustformel für den Volumenstrom gelten 400–600 m³/h pro laufendem Meter Haube bei Elektrogeräten und 600–1.000 m³/h bei Gasgeräten – die genaue Auslegung erfolgt nach VDI 2052 anhand der Anschlussleistung.',
        ),
      },
      {
        h2: 'Filter, Ventilator, Regelung',
        html: p(
          'Flammschutzfilter aus Edelstahl (Typ A nach DIN 18869-5) halten Fett zurück und sind spülmaschinengeeignet; sie müssen regelmäßig gereinigt werden. Der Radialventilator wird als Motorbox in die Abluftleitung oder auf das Dach gesetzt; ein Drehzahlregler passt die Leistung an den Betrieb an. Wo kein Abluftkanal nach außen möglich ist, bieten Umlufthauben mit Aktivkohle- oder Plasmafilter eine Lösung – mit Einschränkungen bei Gasgeräten.',
          'Zuluft nicht vergessen: Was abgesaugt wird, muss nachströmen, sonst entsteht Unterdruck und Türen lassen sich schwer öffnen.',
        ),
      },
    ],
    faqs: [
      { q: 'Welche Abzugshaube brauche ich für eine 3 Meter lange Kochzeile?', a: 'Eine Wandhaube mit 3.400–3.600 mm Breite (Überstand 200–300 mm je Seite), 1.000–1.200 mm Tiefe und ein Ventilator mit ca. 2.000–3.000 m³/h bei Gasgeräten. Die exakte Auslegung nach VDI 2052 erstellen wir auf Basis Ihrer Geräteliste.' },
      { q: 'Wie oft müssen Flammschutzfilter gereinigt werden?', a: 'Je nach Betrieb wöchentlich bis täglich in der Spülmaschine. Verfettete Filter erhöhen das Brandrisiko und senken die Absaugleistung erheblich.' },
      { q: 'Geht auch eine Umlufthaube ohne Abluftkanal?', a: 'Für Elektrogeräte mit geringer Fettentwicklung ja (Aktivkohle-/Plasmafilter). Für Gasgeräte ist eine Abluftführung nach außen fast immer vorgeschrieben.' },
      { q: 'Planen Sie die Lüftungsanlage mit?', a: 'Ja. Wir berechnen Volumenstrom und Haubengröße für Ihre Kochzeile und platzieren die Haube im 3D-Küchenplaner. Die Installation übernimmt ein Lüftungsbauer vor Ort.' },
    ],
    keywords: ['dunstabzugshaube gastro', 'abzugshaube gastronomie', 'lüftung gastronomie', 'wandhaube edelstahl', 'gastro abluft', 'küchenabluft gewerblich'],
    ggmSlug: 'lueftung',
    published: true,
    children: [
      { slug: 'wandhauben', taxonomySub: 'wandhauben', name: 'Wandhauben', h1: 'Edelstahl Wandhauben für Gastroküchen', title: 'Wandhaube Gastro kaufen – Schräg- & Kastenhaube 1–4 m', description: 'Wandhauben aus Edelstahl (Schrägmodell, Kastenhaube) in 1.000–4.000 mm Breite mit Flammschutzfiltern und LED-Beleuchtung für Kochzeilen an der Wand.', keywords: ['wandhaube', 'wandhaube edelstahl', 'dunstabzugshaube wand gastro', 'kastenhaube'] },
      { slug: 'inselhauben', taxonomySub: 'zentralhauben', name: 'Inselhauben', h1: 'Inselhauben für freistehende Kochblöcke', title: 'Inselhaube Gastro kaufen – Zentralhaube Edelstahl', description: 'Inselhauben und Zentralhauben aus Edelstahl für freistehende Kochblöcke mit Absaugung von allen Seiten.', keywords: ['inselhaube', 'zentralhaube gastro', 'deckenhaube gastronomie'] },
      { slug: 'abluftventilatoren', taxonomySub: 'absaugeinheiten', name: 'Ventilatoren & Filter', h1: 'Abluftventilatoren, Motorboxen & Filter', title: 'Abluftventilator Gastro kaufen – Motorbox, Flammschutzfilter', description: 'Radialventilatoren, Motorboxen, Flammschutzfilter, Aktivkohlefilter und Abluftrohre für gewerbliche Küchenabluft.', keywords: ['abluftventilator gastro', 'motorbox abluft', 'flammschutzfilter', 'radialventilator küche'] },
      { slug: 'lueftung-zubehoer', taxonomySub: 'haube-zubehoer', name: 'Regler & Zubehör', h1: 'Drehzahlregler, Schaltkästen & Beleuchtung', title: 'Lüftung Zubehör – Drehzahlregler, Schaltkasten', description: 'Drehzahlregler, Schaltkästen, Haubenbeleuchtung und Montagezubehör für Gastro-Abzugshauben.', keywords: ['drehzahlregler abluft', 'schaltkasten dunstabzug'], published: false },
    ],
  },

  // ── 7. Lebensmittelverarbeitung ───────────────────────────────────────────
  {
    slug: 'lebensmittelverarbeitung',
    taxonomyCat: 'dynamic_prep',
    name: 'Lebensmittelverarbeitung',
    h1: 'Lebensmittelverarbeitung & Vorbereitungsgeräte',
    title: 'Vorbereitungsgeräte Gastro – Vakuumierer, Fleischwolf, Schneidemaschinen',
    description: 'Geräte zur Lebensmittelverarbeitung: Vakuumiermaschinen, Fleischwölfe, Aufschnittmaschinen, Gemüseschneider, Cutter, Stabmixer und Küchenmaschinen für Gastronomie und Metzgerei. Netto-Preise, Lieferung deutschlandweit.',
    intro: 'Vorbereitung ist Zeit: Gemüseschneider, Aufschnittmaschinen, Fleischwölfe und Vakuumierer ersetzen Stunden Handarbeit und liefern gleichmäßige Ergebnisse. 2MC Gastro führt über 350 Geräte für Küche, Metzgerei und Catering – vom 250-Watt-Stabmixer bis zum Kammervakuumierer mit 20 m³/h Pumpe.',
    sections: [
      {
        h2: 'Die wichtigsten Vorbereitungsgeräte',
        html: ul(
          '<strong>Gemüseschneider</strong> mit Wechselscheiben für Scheiben, Würfel, Stifte und Reibe – 100 bis 400 kg/h',
          '<strong>Aufschnittmaschinen</strong> mit 250–350 mm Messer für Wurst, Käse und Fleisch',
          '<strong>Fleischwölfe</strong> Größe 12, 22 und 32 mit 150–500 kg/h Leistung',
          '<strong>Vakuumiermaschinen</strong> als Kammergerät für Sous-Vide, Lagerung und Marinieren',
          '<strong>Cutter</strong> und Küchenmaschinen für Farcen, Pesto, Dips und Teige',
          '<strong>Stabmixer</strong> mit 250–750 mm Mixstab für Suppen und Saucen im Kessel',
        ),
      },
      {
        h2: 'Kammervakuumierer oder Balkenvakuumierer?',
        html: p(
          'Kammervakuumierer erzeugen ein echtes Vakuum von 99 % und verarbeiten auch Flüssigkeiten und Marinaden – Standard für Sous-Vide und Cook & Chill. Balkengeräte sind günstiger, aber nur für trockene Produkte und geringe Mengen geeignet. Achten Sie auf Pumpenleistung (m³/h), Schweißbalkenlänge und Kammergröße passend zu Ihren Beuteln.',
        ),
      },
    ],
    faqs: [
      { q: 'Welcher Fleischwolf für eine Metzgerei?', a: 'Größe 22 (ca. 300 kg/h) ist der Standard für Metzgereien und Dönerbetriebe; Größe 32 für Produktion über 400 kg/h; Größe 12 für Restaurants mit gelegentlichem Bedarf.' },
      { q: 'Lohnt sich ein Gemüseschneider im Restaurant?', a: 'Ab etwa 20 kg Gemüse am Tag amortisiert sich ein Gemüseschneider innerhalb weniger Monate durch Zeitersparnis und gleichmäßigen Schnitt.' },
      { q: 'Was bedeutet 20 m³/h bei einem Vakuumierer?', a: 'Die Pumpenleistung: Je höher, desto schneller wird die Kammer evakuiert. 8–10 m³/h reichen für Restaurants, 20 m³/h und mehr für Produktion und große Beutel.' },
    ],
    keywords: ['vakuumiermaschine gastro', 'fleischwolf gastro', 'gemüseschneider gastro', 'aufschnittmaschine', 'stabmixer gastronomie', 'küchenmaschine gastro'],
    ggmSlug: 'lebensmittelverarbeitung',
    published: true,
    children: [
      { slug: 'vakuumierer', taxonomySub: 'vakuummaschinen', name: 'Vakuumiermaschinen', h1: 'Vakuumiermaschinen für die Gastronomie', title: 'Vakuumiermaschine Gastro kaufen – Kammervakuumierer', description: 'Kammervakuumierer und Vakuumiergeräte für Gastronomie und Metzgerei: 8–20 m³/h, Schweißbalken 260–420 mm, Vakuumbeutel und Zubehör.', keywords: ['vakuumiermaschine gastro', 'kammervakuumierer', 'vakuumierer gastronomie', 'vakuumiergerät profi'] },
      { slug: 'fleischwoelfe', taxonomySub: 'fleischwoelfe', name: 'Fleischwölfe & Wurstfüller', h1: 'Fleischwölfe, Wurstfüller & Knochensägen', title: 'Fleischwolf Gastro kaufen – Größe 12/22/32', description: 'Profi-Fleischwölfe Größe 12, 22 und 32, Wurstfüllmaschinen, Knochensägen und Fleischmischer für Metzgerei, Dönerbetrieb und Gastronomie.', keywords: ['fleischwolf gastro', 'fleischwolf profi', 'fleischwolf größe 22', 'wurstfüller', 'knochensäge'] },
      { slug: 'aufschnitt-und-gemueseschneider', taxonomySub: 'schneidemaschinen', name: 'Schneidemaschinen', h1: 'Aufschnittmaschinen, Gemüseschneider & Cutter', title: 'Aufschnittmaschine & Gemüseschneider Gastro kaufen', description: 'Aufschnittmaschinen 250–350 mm, Gemüseschneider mit Wechselscheiben, Cutter und Kartoffelschälmaschinen für die Vorbereitung.', keywords: ['aufschnittmaschine gastro', 'gemüseschneider gastro', 'gemüseschneidemaschine', 'cutter gastronomie', 'kartoffelschälmaschine'] },
      { slug: 'mixer-und-stabmixer', taxonomySub: 'mixer', name: 'Mixer & Stabmixer', h1: 'Stabmixer, Standmixer & Rührmaschinen', title: 'Stabmixer Gastro kaufen – Profi Mixer & Rührwerke', description: 'Profi-Stabmixer mit 250–750 mm Stab, Standmixer, Planetenrührmaschinen und Schneebesenaufsätze für die Gastronomie.', keywords: ['stabmixer gastro', 'stabmixer profi', 'standmixer gastronomie', 'rührmaschine gastro'] },
      { slug: 'kuechenkleingeraete', taxonomySub: 'dynamic-kleingeraete', name: 'Küchenkleingeräte', h1: 'Küchenkleingeräte für Profis', title: 'Küchenkleingeräte Gastro – Waagen, Reiben, Pressen', description: 'Waagen, Käsereiben, Zitruspressen, Zentrifugen, Messersterilisatoren und weitere Kleingeräte für die Profiküche.', keywords: ['küchenwaage gastro', 'käsereibe elektrisch', 'zitruspresse gastro'] },
    ],
  },

  // ── 8. Ausgabe & Buffet ───────────────────────────────────────────────────
  {
    slug: 'ausgabe-und-buffet',
    taxonomyCat: 'self_service',
    name: 'Ausgabe & Buffet',
    h1: 'Speisenausgabe, Buffets & Self-Service',
    title: 'Speisenausgabe & Buffet Gastro – Drop-in, Salatbar, Ausgabetheke',
    description: 'Ausgabesysteme und Buffets: Drop-in-Elemente (warm, kalt, neutral), modulare Self-Service-Theken, Salatbars, Buffetinseln und Ausgabevitrinen für Kantine, Hotel und Restaurant. Netto-Preise, Planung, Lieferung.',
    intro: 'Frühstücksbuffet im Hotel, Kantinenausgabe, Salatbar im Restaurant: Ausgabesysteme präsentieren Speisen bei sicherer Temperatur und lenken den Gästefluss. 2MC Gastro bietet über 490 Elemente – Drop-in-Bain-Maries und Kühlwannen für den Einbau in eigene Theken, komplette Self-Service-Module in Modulbreiten sowie Buffetinseln mit Hustenschutz und Beleuchtung.',
    sections: [
      {
        h2: 'Drop-in oder komplette Theke?',
        html: p(
          'Drop-in-Elemente werden in Ihre bestehende oder vom Schreiner gefertigte Theke eingebaut: Bain-Marie mit 2–6 GN 1/1, Kühlwanne, Wärmeplatte, Wärmebrücke, neutrale Elemente. Komplette Self-Service-Theken aus Edelstahl kommen mit Unterbau, Tablettrutsche und Hustenschutz und werden modular aneinandergereiht. Für Kantinen und Mensen empfehlen wir Module in einheitlicher Tiefe mit Tablettrutsche auf Gästeseite.',
        ),
      },
      {
        h2: 'Temperaturen an der Ausgabe',
        html: p(
          'Warmspeisen müssen an der Ausgabe mindestens 65 °C halten, kalte Speisen maximal 7 °C – über den gesamten Serviceverlauf. Ventilierte Kühlwannen und Bain-Maries mit Trocken- oder Wasserbadheizung halten die Temperatur auch bei geöffnetem Hustenschutz. Digitale Anzeigen erleichtern die HACCP-Dokumentation an der Ausgabe.',
        ),
      },
    ],
    faqs: [
      { q: 'Was ist ein Drop-in-Element?', a: 'Ein Einbaugerät (Bain-Marie, Kühlwanne, Wärmeplatte), das von oben in eine Theke eingesetzt wird. Es ermöglicht Buffets in Ihrer eigenen Möbeloptik.' },
      { q: 'Welche Temperatur muss ein Buffet halten?', a: 'Warmhaltung mindestens 65 °C, Kühlung maximal 7 °C. Geräte mit Umluft halten die Temperatur auch bei Zugluft und geöffnetem Hustenschutz.' },
      { q: 'Planen Sie Ausgabetheken nach Maß?', a: 'Ja. Wir kombinieren Module in Standardbreiten oder lassen Theken nach Maß fertigen und stellen die Ausgabestrecke im 3D-Planer dar.' },
    ],
    keywords: ['speisenausgabe', 'buffet gastronomie', 'salatbar gastro', 'drop in bain marie', 'self service theke', 'ausgabetheke'],
    ggmSlug: 'warmhalten',
    published: true,
    children: [
      { slug: 'drop-in-elemente', taxonomySub: 'drop-in', name: 'Drop-in-Elemente', h1: 'Drop-in Bain-Maries, Kühlwannen & Wärmeplatten', title: 'Drop-in Bain-Marie & Kühlwanne kaufen – Einbau-Buffet', description: 'Drop-in-Elemente zum Einbau in Theken: Bain-Maries, Kühlwannen, Wärmeplatten, Wärmebrücken und neutrale Elemente in GN-Maßen.', keywords: ['drop in bain marie', 'einbau kühlwanne', 'drop in kühlwanne', 'einbau wärmeplatte'] },
      { slug: 'self-service-module', taxonomySub: 'modulare-self', name: 'Self-Service-Module', h1: 'Modulare Self-Service-Theken', title: 'Self-Service Theke kaufen – modulare Ausgabe Kantine', description: 'Modulare Self-Service-Theken aus Edelstahl mit Tablettrutsche und Hustenschutz für Kantine, Mensa und Hotel.', keywords: ['self service theke', 'ausgabetheke kantine', 'speisenausgabe modular'] },
      { slug: 'buffets-und-salatbars', taxonomySub: 'buffets', name: 'Buffets & Salatbars', h1: 'Buffetinseln & Salatbars', title: 'Salatbar & Buffetinsel Gastro kaufen', description: 'Salatbars, Buffetinseln und Frühstücksbuffets mit Kühlung, Wärme oder neutral, mit Hustenschutz und Beleuchtung.', keywords: ['salatbar gastro', 'buffetinsel', 'frühstücksbuffet hotel', 'salatbar kühlung'] },
      { slug: 'ausgabevitrinen', taxonomySub: 'self-vitrinen', name: 'Ausgabevitrinen', h1: 'Ausgabevitrinen, Tapas- & Sushi-Vitrinen', title: 'Ausgabevitrine Gastro kaufen – Tapas, Sushi, Snack', description: 'Ausgabevitrinen für Tapas, Sushi, Snacks und Desserts – gekühlt, beheizt oder neutral, für Theke und Buffet.', keywords: ['tapas vitrine', 'sushi vitrine', 'snackvitrine gastro'] },
    ],
  },

  // ── 9. Bäckereitechnik ────────────────────────────────────────────────────
  {
    slug: 'baeckereitechnik',
    taxonomyCat: 'bakery',
    name: 'Bäckereitechnik',
    h1: 'Bäckereitechnik: Backöfen, Gärschränke & Zubehör',
    title: 'Bäckereiofen & Gärschrank kaufen – Bäckereitechnik Gastro',
    description: 'Bäckereitechnik für Bäckerei, Konditorei und Backstation: Bäckereiöfen für Bleche 600 × 400 mm, Stikkenöfen, Gärschränke, Backwagen und Edelstahlmöbel. Netto-Preise, Lieferung deutschlandweit.',
    intro: 'Bäckereiöfen im Blechmaß 600 × 400 mm, Gärschränke mit Feuchteregelung und Backwagen bilden die Aufback- und Produktionsstrecke in Bäckerei, Hotelfrühstück und Supermarkt-Backstation. 2MC Gastro führt Konvektionsöfen mit 4 bis 16 Blechen, Etagenöfen und Gärschränke von Diamond und CombiSteel.',
    sections: [
      {
        h2: 'Konvektionsofen, Etagenofen oder Stikkenofen?',
        html: p(
          'Konvektionsöfen (Heißluft mit Dampfzugabe) für 4–10 Bleche sind die flexible Lösung für Aufbackstationen und kleine Bäckereien. Etagenöfen mit Steinplatte und separater Ober-/Unterhitze backen Brot und Brötchen traditionell. Stikkenöfen nehmen komplette Backwagen mit 15–18 Blechen auf und sind der Produktionsstandard. Gärschränke halten Teiglinge bei 30–35 °C und 80 % Luftfeuchte – als Unterbau unter dem Ofen oder als separater Schrank.',
        ),
      },
    ],
    faqs: [
      { q: 'Welches Blechmaß ist Bäckerei-Standard?', a: '600 × 400 mm (Euronorm). Gastronomie-Kombidämpfer nutzen dagegen GN 1/1 (530 × 325 mm) – achten Sie beim Kauf auf das richtige Einschubmaß.' },
      { q: 'Brauche ich einen Gärschrank?', a: 'Für Hefeteige ja: Ein Gärschrank mit Feuchteregelung sorgt für gleichmäßige Gare und planbare Backzeiten, besonders bei tiefgekühlten Teiglingen.' },
    ],
    keywords: ['bäckereiofen', 'bäckerei ausstattung', 'gärschrank', 'stikkenofen', 'backofen bäckerei 600x400', 'konvektionsofen bäckerei'],
    published: true,
    children: [
      { slug: 'baeckereioefen', taxonomySub: 'baeckereioefen', name: 'Bäckereiöfen', h1: 'Bäckereiöfen & Backstationen', title: 'Bäckereiofen kaufen – Konvektions- & Etagenöfen 600×400', description: 'Bäckereiöfen für Bleche 600 × 400 mm: Konvektionsöfen 4–16 Bleche, Etagenöfen mit Steinplatte, Stikkenöfen und Backstationen.', keywords: ['bäckereiofen', 'backofen bäckerei', 'etagenofen', 'stikkenofen', 'aufbackofen gastro'] },
      { slug: 'gaerschraenke', taxonomySub: 'gaerschraenke', name: 'Gärschränke', h1: 'Gärschränke & Gärunterbauten', title: 'Gärschrank kaufen – Feuchteregelung, 600×400', description: 'Gärschränke und Gärunterbauten mit Temperatur- und Feuchteregelung für 8–16 Bleche 600 × 400 mm.', keywords: ['gärschrank', 'gärschrank bäckerei', 'gärunterbau'] },
      { slug: 'baeckerei-edelstahlmoebel', taxonomySub: 'bakery-moebel', name: 'Bäckerei-Edelstahlmöbel', h1: 'Edelstahlmöbel für die Bäckerei', title: 'Bäckerei Edelstahlmöbel – Backwagen, Blechregale', description: 'Backwagen, Blechregale, Arbeitstische und Schränke im Maß 600 × 400 mm für Bäckerei und Konditorei.', keywords: ['backwagen', 'blechregal 600x400', 'bäckerei arbeitstisch'], published: false },
    ],
  },

  // ── 10. Cook & Chill ──────────────────────────────────────────────────────
  {
    slug: 'cook-and-chill',
    taxonomyCat: 'cook_chill',
    name: 'Cook & Chill',
    h1: 'Cook & Chill Systeme: Kombidämpfer + Schockfroster',
    title: 'Cook & Chill System kaufen – Kombidämpfer & Schockfroster',
    description: 'Cook & Chill Systeme für Großküche, Catering und Gemeinschaftsverpflegung: aufeinander abgestimmte Kombidämpfer und Schockfroster mit Hordenwagen, 10–20 GN. Netto-Preise, Beratung, Lieferung.',
    intro: 'Cook & Chill trennt Produktion und Ausgabe: Speisen werden im Kombidämpfer gegart, im Schockfroster innerhalb von 90 Minuten auf +3 °C gekühlt, gelagert und bei Bedarf regeneriert. Das spart Personal in Stoßzeiten, sichert Qualität und erfüllt HACCP. 2MC Gastro liefert abgestimmte Systeme mit gemeinsamen Hordenwagen für 10 und 20 GN.',
    sections: [
      {
        h2: 'So funktioniert Cook & Chill',
        html: p(
          'Garen (Kombidämpfer) → Schnellkühlen (+70 °C auf +3 °C in ≤ 90 Minuten) → Lagern bei 0–3 °C bis zu 5 Tage → Regenerieren (Kombidämpfer oder Regenerierofen) → Ausgabe. Für Tiefkühlung wird auf −18 °C schockgefrostet (Cook & Freeze). Hordenwagen wechseln zwischen den Geräten ohne Umladen – Voraussetzung ist ein gemeinsames GN-Raster und passende Wagenaufnahmen.',
        ),
      },
    ],
    faqs: [
      { q: 'Für welche Betriebe lohnt sich Cook & Chill?', a: 'Für Kantinen, Krankenhäuser, Pflegeheime, Caterer und Hotels mit Bankettgeschäft – überall, wo große Mengen vorproduziert und zeitversetzt ausgegeben werden.' },
      { q: 'Wie lange darf Cook-&-Chill-Ware gelagert werden?', a: 'Nach DIN 10536 bei 0 bis +3 °C in der Regel bis zu 5 Tage inklusive Produktions- und Verzehrtag.' },
    ],
    keywords: ['cook and chill', 'cook & chill system', 'schockfroster kombidämpfer', 'cook chill großküche'],
    published: true,
    children: [
      { slug: 'kombidaempfer', taxonomySub: 'cc-kombidaempfer', name: 'Cook & Chill Kombidämpfer', h1: 'Kombidämpfer für Cook & Chill Systeme', title: 'Cook & Chill Kombidämpfer – 10 & 20 GN mit Hordenwagen', description: 'Kombidämpfer mit 10 und 20 GN für Cook & Chill, mit Hordenwagen-Aufnahme und Kerntemperaturfühler.', keywords: ['kombidämpfer hordenwagen', 'kombidämpfer 20 gn'] },
      { slug: 'schockfroster', taxonomySub: 'cc-schockfroster', name: 'Cook & Chill Schockfroster', h1: 'Schockfroster für Cook & Chill Systeme', title: 'Schockfroster mit Hordenwagen – 10 & 20 GN', description: 'Schockfroster und Schnellkühler mit Hordenwagen-Einfahrt für 10 und 20 GN, abgestimmt auf Kombidämpfer.', keywords: ['schockfroster hordenwagen', 'schnellkühler 20 gn'] },
      { slug: 'zubehoer', taxonomySub: 'cc-zubehoer', name: 'Hordenwagen & Zubehör', h1: 'Hordenwagen & Cook & Chill Zubehör', title: 'Hordenwagen kaufen – 10/20 GN für Kombidämpfer', description: 'Hordenwagen, Bankettwagen und Zubehör für Cook & Chill Systeme.', keywords: ['hordenwagen', 'hordenwagen kombidämpfer'], published: false },
    ],
  },

  // ── 11. Kaffee & Bar ──────────────────────────────────────────────────────
  {
    slug: 'kaffee-und-bar',
    taxonomyCat: 'coffee_tea',
    name: 'Kaffee & Bar',
    h1: 'Kaffeemaschinen & Bartechnik für die Gastronomie',
    title: 'Gastro Kaffeemaschine kaufen – Siebträger, Vollautomat, Bar',
    description: 'Kaffee- und Bartechnik: Siebträgermaschinen, Kaffeevollautomaten, Filterkaffeemaschinen, Kaffeemühlen, Saftpressen, Barmixer, Crêpes- und Waffeleisen. Netto-Preise, Lieferung deutschlandweit.',
    intro: 'Kaffee ist die margenstärkste Position auf fast jeder Karte. Ob Siebträgermaschine mit zwei Brühgruppen für das Café, Vollautomat für Hotelfrühstück und Büro oder Filtermaschine für die Kantine – 2MC Gastro führt Kaffeemaschinen, Mühlen, Milchaufschäumer sowie Bartechnik von der Zitruspresse bis zum Crêpes-Gerät.',
    sections: [
      {
        h2: 'Siebträger, Vollautomat oder Filter?',
        html: p(
          'Siebträgermaschinen (1–3 Brühgruppen) liefern die beste Espressoqualität und gehören in Café und Bar; sie brauchen geschultes Personal und eine separate Mühle. Vollautomaten mahlen, brühen und schäumen auf Knopfdruck – ideal für Hotel, Büro und Selbstbedienung mit 100–300 Tassen am Tag. Filterkaffeemaschinen mit Glaskannen oder Isolierkannen versorgen Kantinen, Tagungen und Frühstücksbuffets mit großen Mengen.',
          'Achten Sie auf Festwasseranschluss (bei über 50 Tassen/Tag), Boilergröße und Wasserfilter – Kalk ist die häufigste Ausfallursache.',
        ),
      },
    ],
    faqs: [
      { q: 'Welche Kaffeemaschine für ein Café mit 200 Tassen am Tag?', a: 'Eine 2-gruppige Siebträgermaschine mit Festwasseranschluss und eine Profi-Mühle. Für Milchgetränke empfiehlt sich ein zusätzlicher Dampfhahn oder ein Milchaufschäumer.' },
      { q: 'Brauche ich einen Wasserfilter?', a: 'Ja, bei Wasserhärte über 7 °dH unbedingt. Ein Filter schützt Boiler und Ventile und verbessert den Geschmack; die Kartusche wird alle 3–6 Monate gewechselt.' },
    ],
    keywords: ['gastro kaffeemaschine', 'siebträgermaschine gastro', 'kaffeevollautomat gastronomie', 'kaffeemaschine gastronomie', 'bartechnik'],
    ggmSlug: 'cafe-eis-und-waffel',
    published: true,
    children: [
      { slug: 'kaffeemaschinen', taxonomySub: 'kaffeemaschinen', name: 'Kaffeemaschinen', h1: 'Gastro Kaffeemaschinen: Siebträger, Vollautomat, Filter', title: 'Gastro Kaffeemaschine kaufen – Siebträger & Vollautomat', description: 'Siebträgermaschinen mit 1–3 Brühgruppen, Kaffeevollautomaten, Filterkaffeemaschinen, Kaffeemühlen und Milchaufschäumer für Café, Hotel und Kantine.', keywords: ['gastro kaffeemaschine', 'siebträgermaschine', 'kaffeevollautomat gastro', 'filterkaffeemaschine gastronomie', 'kaffeemühle gastro'] },
      { slug: 'crepes-und-waffeleisen', taxonomySub: 'crepes-waffeln', name: 'Crêpes & Waffeln', h1: 'Crêpes-Geräte & Waffeleisen', title: 'Waffeleisen & Crêpes Gerät Gastro kaufen', description: 'Profi-Waffeleisen (rund, eckig, belgisch), Crêpes-Geräte und Bubble-Waffle-Eisen für Café, Eisdiele und Weihnachtsmarkt.', keywords: ['waffeleisen gastro', 'crepes gerät gastro', 'crepes platte', 'waffeleisen profi'] },
      { slug: 'saftpressen-und-barmixer', taxonomySub: 'saefte-mixer', name: 'Saftpressen & Barmixer', h1: 'Saftpressen, Barmixer & Zentrifugen', title: 'Saftpresse & Barmixer Gastro kaufen', description: 'Elektrische Zitruspressen, Orangenpressen, Entsafter, Barmixer und Zentrifugen für Bar, Café und Saftbar.', keywords: ['saftpresse gastro', 'orangenpresse gastro', 'barmixer profi', 'entsafter gastronomie'] },
      { slug: 'kuchenvitrinen', taxonomySub: 'coffee-vitrinen', name: 'Kuchen- & Wärmevitrinen', h1: 'Kuchenvitrinen & Wärmevitrinen für das Café', title: 'Kuchenvitrine Café kaufen – gekühlt & neutral', description: 'Kuchenvitrinen, Panoramavitrinen und Wärmevitrinen für Café, Bäckerei und Bar.', keywords: ['kuchenvitrine', 'wärmevitrine gastro', 'panoramavitrine'] },
    ],
  },

  // ── 12. Eismaschinen & Eisvitrinen ────────────────────────────────────────
  {
    slug: 'eismaschinen-und-eisvitrinen',
    taxonomyCat: 'ice_cream',
    name: 'Eismaschinen & Eisvitrinen',
    h1: 'Eismaschinen & Eisvitrinen für Eisdiele und Gastronomie',
    title: 'Eismaschine & Eisvitrine kaufen – Softeis, Speiseeis, Eistheke',
    description: 'Eismaschinen und Eisvitrinen: Speiseeismaschinen, Softeismaschinen, Pasteurisierer, Eistheken mit 6–24 Behältern, Sahnemaschinen und Zubehör für Eisdiele und Gastronomie. Netto-Preise, Lieferung.',
    intro: 'Von der Eistheke mit 12 Behältern bis zur Softeismaschine für den Imbiss: 2MC Gastro führt Eismaschinen und Eisvitrinen für Eisdiele, Café, Hotel und Restaurant – inklusive Pasteurisierern, Sahnemaschinen und Eisbehältern in Standardmaßen.',
    sections: [
      {
        h2: 'Speiseeismaschine oder Softeismaschine?',
        html: p(
          'Speiseeismaschinen (Batch Freezer) produzieren handwerkliches Eis in Chargen von 2–10 Litern für die Eistheke. Softeismaschinen geben pasteurisierten Mix als Softeis direkt aus – 1 bis 3 Sorten, mit Nachtkühlung für hygienische Lagerung. Eisvitrinen (statisch oder ventiliert) halten −14 bis −18 °C; ventilierte Vitrinen sind unempfindlicher gegen Umgebungstemperatur.',
        ),
      },
    ],
    faqs: [
      { q: 'Wie viele Behälter sollte eine Eistheke haben?', a: 'Kleine Eisdielen starten mit 12 Behältern (5 Liter), größere mit 18–24. Rechnen Sie ca. 1 Behälter pro Sorte plus 2 Reserve.' },
      { q: 'Was kostet eine Softeismaschine für den Imbiss?', a: 'Tischgeräte mit 1–2 Sorten beginnen im unteren vierstelligen Bereich; Standgeräte mit 3 Sorten und Nachtkühlung liegen deutlich darüber. Alle Preise netto zzgl. MwSt.' },
    ],
    keywords: ['eismaschine gastro', 'softeismaschine', 'eisvitrine', 'eistheke', 'speiseeismaschine', 'eisdiele ausstattung'],
    ggmSlug: 'cafe-eis-und-waffel',
    published: true,
    children: [
      { slug: 'eisvitrinen', taxonomySub: 'ice-theken', name: 'Eisvitrinen & Eistheken', h1: 'Eisvitrinen & Eistheken', title: 'Eisvitrine kaufen – Eistheke 6–24 Behälter', description: 'Eisvitrinen und Eistheken mit 6 bis 24 Behältern, statisch oder ventiliert, gerade oder gebogene Scheibe, für Eisdiele und Café.', keywords: ['eisvitrine', 'eistheke', 'eisvitrine 12 behälter', 'eistheke kaufen'] },
      { slug: 'eismaschinen', taxonomySub: 'ice-maschinen', name: 'Eismaschinen', h1: 'Eismaschinen, Softeismaschinen & Pasteurisierer', title: 'Eismaschine & Softeismaschine kaufen – Profi', description: 'Speiseeismaschinen, Softeismaschinen 1–3 Sorten, Pasteurisierer und Sahnemaschinen für Eisdiele und Gastronomie.', keywords: ['eismaschine profi', 'softeismaschine', 'speiseeismaschine', 'pasteurisierer eis', 'sahnemaschine'] },
      { slug: 'eis-zubehoer', taxonomySub: 'ice-zubehoer', name: 'Eisbehälter & Zubehör', h1: 'Eisbehälter, Portionierer & Zubehör', title: 'Eisbehälter & Eisportionierer kaufen', description: 'Eisbehälter 5 Liter, Eisportionierer, Waffelhalter und Zubehör für die Eistheke.', keywords: ['eisbehälter 5 liter', 'eisportionierer', 'eisdiele zubehör'], published: false },
    ],
  },

  // ── 13. Wäschereitechnik ──────────────────────────────────────────────────
  {
    slug: 'waeschereitechnik',
    taxonomyCat: 'laundry',
    name: 'Wäschereitechnik',
    h1: 'Gewerbliche Wäschereitechnik für Hotel & Gastronomie',
    title: 'Gewerbliche Waschmaschine kaufen – Hotel, Gastronomie, Pflege',
    description: 'Gewerbliche Waschmaschinen 6–30 kg, Wäschetrockner, Mangeln und Bügelstationen für Hotel, Gastronomie, Pflegeheim und Wäscherei. Netto-Preise, Lieferung deutschlandweit.',
    intro: 'Tischwäsche, Küchentextilien, Hotelbettwäsche: Wer täglich wäscht, braucht Industriemaschinen mit kurzen Programmen, hoher Schleuderdrehzahl und Dauerlaufmotoren. 2MC Gastro liefert gewerbliche Waschmaschinen von 6 bis 30 kg Füllmenge, Ablufttrockner, Muldenmangeln und Bügelstationen – ein Sortiment, das viele Gastro-Händler nicht führen.',
    sections: [
      {
        h2: 'Gewerblich oder Haushaltsgerät?',
        html: p(
          'Haushaltswaschmaschinen sind für ca. 5 Zyklen pro Woche gebaut; im Hotel laufen Maschinen 5–10 Zyklen am Tag. Gewerbliche Geräte haben verstärkte Lager, Edelstahltrommeln, Schleuderdrehzahlen bis 1.200 U/min (kürzere Trocknungszeit) und Programme von 30–45 Minuten. Achten Sie auf Füllmenge in kg Trockenwäsche, Anschluss (230 V / 400 V) und ob eine Ablaufpumpe oder ein Schwerkraftablauf nötig ist.',
        ),
      },
    ],
    faqs: [
      { q: 'Welche Füllmenge brauche ich für ein Hotel mit 30 Zimmern?', a: 'Rechnen Sie ca. 2–3 kg Wäsche pro Zimmer und Tag: bei 30 Zimmern 60–90 kg täglich, also eine 10–13-kg-Maschine mit 6–8 Zyklen oder zwei Maschinen.' },
      { q: 'Kann ich einen gewerblichen Trockner ohne Abluft betreiben?', a: 'Ja, als Kondensations- oder Wärmepumpentrockner. Ablufttrockner sind schneller und günstiger, brauchen aber einen Abluftkanal.' },
    ],
    keywords: ['gewerbliche waschmaschine', 'industriewaschmaschine', 'waschmaschine gastronomie', 'hotel waschmaschine', 'gewerblicher trockner', 'mangel gewerblich'],
    published: true,
    children: [
      { slug: 'gewerbliche-waschmaschinen', taxonomySub: 'waschmaschinen', name: 'Waschmaschinen', h1: 'Gewerbliche Waschmaschinen 6–30 kg', title: 'Gewerbliche Waschmaschine kaufen – 6 bis 30 kg', description: 'Gewerbliche Waschmaschinen mit 6 bis 30 kg Füllmenge, Edelstahltrommel, bis 1.200 U/min, für Hotel, Gastronomie und Pflege.', keywords: ['gewerbliche waschmaschine', 'industriewaschmaschine 10 kg', 'waschmaschine hotel', 'waschschleudermaschine'] },
      { slug: 'waeschetrockner', taxonomySub: 'trockner', name: 'Trockner', h1: 'Gewerbliche Wäschetrockner', title: 'Gewerblicher Trockner kaufen – Abluft & Wärmepumpe', description: 'Gewerbliche Wäschetrockner als Abluft-, Kondensations- oder Wärmepumpentrockner mit 6–30 kg Füllmenge.', keywords: ['gewerblicher trockner', 'industrietrockner', 'ablufttrockner gewerblich'] },
      { slug: 'mangeln-und-buegelstationen', taxonomySub: 'mangel-buegeln', name: 'Mangeln & Bügeln', h1: 'Muldenmangeln & Bügelstationen', title: 'Mangel gewerblich kaufen – Muldenmangel, Bügelstation', description: 'Muldenmangeln, Bügelstationen und Dampfbügeleisen für Hotel- und Gastronomiewäsche.', keywords: ['muldenmangel', 'mangel gewerblich', 'bügelstation profi'] },
    ],
  },

  // ── 14. GN-Behälter & Wagen ───────────────────────────────────────────────
  {
    slug: 'gn-behaelter-und-wagen',
    taxonomyCat: 'trolley_gn',
    name: 'GN-Behälter & Wagen',
    h1: 'GN-Behälter, Transportwagen & Thermoboxen',
    title: 'GN Behälter & Transportwagen Gastro kaufen',
    description: 'Gastronorm-Behälter GN 1/1 bis 1/9 aus Edelstahl und Polycarbonat, Deckel, Hordenwagen, Servierwagen, Tablettwagen und Thermoboxen für Küche und Catering. Netto-Preise, schnelle Lieferung.',
    intro: 'Das Gastronorm-System (GN) ist das Maßraster der Profiküche: GN 1/1 = 530 × 325 mm, teilbar in 1/2, 1/3, 1/4, 1/6 und 1/9. Behälter, Kombidämpfer, Kühltische und Bain-Maries greifen ineinander. 2MC Gastro liefert GN-Behälter in Edelstahl und Polycarbonat, Deckel, Einsätze sowie Wagen für Transport und Lagerung.',
    sections: [
      {
        h2: 'GN-Maße im Überblick',
        html: ul(
          'GN 2/1: 650 × 530 mm · GN 1/1: 530 × 325 mm · GN 1/2: 325 × 265 mm',
          'GN 1/3: 325 × 176 mm · GN 1/4: 265 × 162 mm · GN 1/6: 176 × 162 mm · GN 1/9: 176 × 108 mm',
          'Tiefen: 20, 40, 65, 100, 150, 200 mm – Volumen bei GN 1/1 von 2,5 bis 28 Liter',
        ),
      },
    ],
    faqs: [
      { q: 'Edelstahl oder Polycarbonat GN-Behälter?', a: 'Edelstahl für Kombidämpfer, Bain-Marie und Ofen (hitzebeständig); Polycarbonat (transparent, bis 100 °C) für Kühlung, Lagerung und Saladetten – leichter und Inhalt sichtbar.' },
      { q: 'Wie tief sollte ein GN-Behälter im Kombidämpfer sein?', a: 'Für Gemüse und Beilagen 65 mm, für Braten und Schmorgerichte 100 mm; 20–40 mm für Backwaren und Gratins.' },
    ],
    keywords: ['gn behälter', 'gastronorm behälter', 'gn behälter edelstahl', 'gn behälter maße', 'servierwagen gastro', 'thermobox gastro'],
    ggmSlug: 'kuechenhelfer',
    published: true,
    children: [
      { slug: 'gn-behaelter', taxonomySub: 'gn-behaelter', name: 'GN-Behälter', h1: 'Gastronorm-Behälter GN 1/1 bis 1/9', title: 'GN Behälter kaufen – Edelstahl & Polycarbonat, alle Größen', description: 'GN-Behälter GN 2/1 bis 1/9 aus Edelstahl und Polycarbonat, 20–200 mm tief, mit Deckeln, Griffen und Einsätzen.', keywords: ['gn behälter', 'gn behälter 1/1', 'gastronorm behälter edelstahl', 'gn behälter deckel', 'gn behälter polycarbonat'] },
      { slug: 'transportwagen', taxonomySub: 'wagen', name: 'Transportwagen', h1: 'Servierwagen, Hordenwagen & Tablettwagen', title: 'Servierwagen & Hordenwagen Gastro kaufen', description: 'Servierwagen, Hordenwagen für GN und 600 × 400, Tablettwagen, Tellerstapler und Thermoboxen für Küche und Catering.', keywords: ['servierwagen gastro', 'hordenwagen', 'tablettwagen', 'transportwagen küche', 'thermobox catering'] },
    ],
  },

  // ── 15. Hotelbedarf ───────────────────────────────────────────────────────
  {
    slug: 'hotelbedarf',
    taxonomyCat: 'hospitality',
    name: 'Hotelbedarf',
    h1: 'Hotelbedarf: Roomservice, Frühstück & Housekeeping',
    title: 'Hotelbedarf kaufen – Roomservice-Wagen, Frühstücksbuffet',
    description: 'Hotelausstattung für Roomservice, Frühstück und Housekeeping: Servierwagen, Zimmerservice-Wagen, Frühstücksbuffet-Elemente, Minibar-Kühlschränke und Wäschewagen. Netto-Preise, Lieferung.',
    intro: 'Vom Frühstücksbuffet bis zum Zimmerservice: 2MC Gastro führt Hotelbedarf, den klassische Gastro-Händler selten abdecken – Roomservice-Wagen mit Warmhaltefach, Frühstücksbuffet-Module, Minibar-Kühlschränke, Wäsche- und Housekeeping-Wagen. Kombinieren Sie mit Wäschereitechnik und Kaffeevollautomaten zur kompletten Hotelausstattung.',
    sections: [
      {
        h2: 'Hotelfrühstück planen',
        html: p(
          'Ein Frühstücksbuffet für 50–100 Gäste braucht gekühlte Elemente für Aufschnitt, Käse und Joghurt (max. 7 °C), Warmhaltung für Eier und Speck (min. 65 °C), einen Kaffeevollautomaten mit 200+ Tassen Tagesleistung, Saftdispenser und Toaster mit Durchlauf. Wir stellen das Buffet aus Drop-in-Elementen oder Modulen zusammen und planen es im 3D-Planer in Ihren Frühstücksraum.',
        ),
      },
    ],
    faqs: [
      { q: 'Welche Ausstattung braucht ein Hotelfrühstück für 80 Gäste?', a: 'Gekühlte Buffetelemente (2–3 GN 1/1), Warmhalte-Bain-Marie (2 GN 1/1), Kaffeevollautomat mit Festwasser, Saftdispenser, Durchlauftoaster, Eierkocher und ausreichend Geschirrwagen.' },
    ],
    keywords: ['hotelbedarf', 'hotelausstattung', 'roomservice wagen', 'zimmerservice wagen', 'frühstücksbuffet hotel', 'minibar kühlschrank'],
    published: true,
    children: [
      { slug: 'roomservice-wagen', taxonomySub: 'room-service', name: 'Roomservice & Wagen', h1: 'Roomservice-Wagen & Housekeeping-Wagen', title: 'Roomservice Wagen kaufen – Zimmerservice, Housekeeping', description: 'Roomservice-Wagen mit Warmhaltefach, Housekeeping-Wagen, Wäschewagen und Kofferwagen für Hotels.', keywords: ['roomservice wagen', 'zimmerservice wagen', 'housekeeping wagen', 'hotelwagen'] },
      { slug: 'fruehstuecksservice', taxonomySub: 'fruehstueck', name: 'Frühstücksservice', h1: 'Frühstücksbuffet & Frühstücksservice', title: 'Frühstücksbuffet Hotel kaufen – Buffetmodule', description: 'Frühstücksbuffet-Module, Eierkocher, Durchlauftoaster, Saftdispenser und Buffetzubehör für Hotels und Pensionen.', keywords: ['frühstücksbuffet hotel', 'frühstücksservice hotel', 'buffetmodul frühstück'] },
    ],
  },

  // ── 16. Reinigungsmittel (klein — noindex bis Sortiment wächst) ──────────
  {
    slug: 'reinigungsmittel',
    taxonomyCat: 'cleaning_products',
    name: 'Reinigungsmittel',
    h1: 'Reinigungsmittel für die Gastronomie',
    title: 'Gastro Reinigungsmittel – Spülmaschinenreiniger, Klarspüler',
    description: 'Reinigungsmittel für gewerbliche Küchen: Spülmaschinenreiniger, Klarspüler, Kombidämpfer-Reiniger, Fettlöser und Hygieneprodukte.',
    intro: 'Professionelle Reiniger für Spülmaschine, Kombidämpfer und Edelstahlflächen – abgestimmt auf gewerbliche Dosieranlagen.',
    sections: [],
    faqs: [],
    keywords: ['spülmaschinenreiniger gastro', 'klarspüler gewerblich', 'kombidämpfer reiniger'],
    published: false,
    children: [],
  },
];

/* ─── Yardımcılar ─── */
const _bySlug = new Map(CATEGORY_TREE.map((c) => [c.slug, c]));
const _byTax = new Map(CATEGORY_TREE.map((c) => [c.taxonomyCat, c]));

export function findCategory(slug: string): SeoCategory | undefined {
  return _bySlug.get(slug);
}
export function findSubcategory(catSlug: string, subSlug: string): SeoSubcategory | undefined {
  return _bySlug.get(catSlug)?.children.find((s) => s.slug === subSlug);
}
export function categoryByTaxonomy(taxonomyCat: string | null | undefined): SeoCategory | undefined {
  return taxonomyCat ? _byTax.get(taxonomyCat) : undefined;
}
export function subcategoryByTaxonomy(taxonomyCat: string | null | undefined, taxonomySub: string | null | undefined): SeoSubcategory | undefined {
  const c = categoryByTaxonomy(taxonomyCat);
  if (!c || !taxonomySub) return undefined;
  return c.children.find((s) => s.taxonomySub === taxonomySub);
}
/** Eski Türkçe pSEO kategori slug'ı → yeni Almanca yol (301 haritası). */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'kombi-firin': '/kochgeraete/kombidaempfer',
  'endustriyel-fritoz': '/kochgeraete/fritteusen',
  'endustriyel-ocak': '/kochgeraete/herde-und-kochkessel',
  'blast-chiller': '/kuehlung/schockfroster',
  'bulasik-makinesi': '/spueltechnik',
  'davlumbaz': '/lueftung',
  'sogutucu': '/kuehlung',
  'izgara': '/kochgeraete/grillgeraete',
};
/** Alt-grup ağaçta yoksa null (mega menü → mağaza filtresine düşer). */
export function subcategoryPath(taxonomyCat: string, taxonomySub: string): string | null {
  const c = _byTax.get(taxonomyCat);
  const s = c?.children.find((x) => x.taxonomySub === taxonomySub);
  return c && s ? `/${c.slug}/${s.slug}` : null;
}
/** Mağaza `?cat=` (taksonomi id) → Almanca kategori yolu. */
export function pathForTaxonomy(taxonomyCat: string, taxonomySub?: string | null): string | null {
  const c = _byTax.get(taxonomyCat);
  if (!c) return null;
  if (taxonomySub) {
    const s = c.children.find((x) => x.taxonomySub === taxonomySub);
    if (s) return `/${c.slug}/${s.slug}`;
  }
  return `/${c.slug}`;
}
