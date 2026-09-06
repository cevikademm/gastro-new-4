// Otomatik üretilir: scripts/seo/bundle-api.ts (kaynak: src/seo/server/render.ts) — ELLE DÜZENLEMEYİN.

// src/seo/server/render.ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// src/lib/locales.ts
var LOCALES = [
  "de",
  "tr",
  "en",
  "fr",
  "nl",
  "it",
  "es",
  "pt",
  "pl",
  "cs",
  "ro",
  "el",
  "sv",
  "da",
  "hu"
];
var DEFAULT_LOCALE = "de";
var INDEXABLE_LOCALES = ["de"];
function isLocale(v) {
  return !!v && LOCALES.includes(v);
}
function splitLocale(pathname) {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const m = clean.match(/^\/([a-z]{2})(?=\/|$)(.*)$/);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) {
    const rest2 = m[2] || "/";
    return { locale: m[1], path: rest2 === "" ? "/" : rest2 };
  }
  return { locale: DEFAULT_LOCALE, path: clean === "" ? "/" : clean };
}
function localePath(locale, path) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

// src/content/seo/categoryTree.de.ts
var p = (...paras) => paras.map((x) => `<p>${x}</p>`).join("");
var ul = (...items) => `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
var CATEGORY_TREE = [
  // ── 1. Kochgeräte ─────────────────────────────────────────────────────────
  {
    slug: "kochgeraete",
    taxonomyCat: "cooking",
    name: "Kochger\xE4te",
    h1: "Kochger\xE4te f\xFCr Gastronomie & Gro\xDFk\xFCche",
    title: "Gastro Kochger\xE4te kaufen \u2013 Herde, Fritteusen, Kombid\xE4mpfer",
    description: "Professionelle Kochger\xE4te f\xFCr Gastronomie und Gro\xDFk\xFCche: Kombid\xE4mpfer, Gastro-Herde, Fritteusen, Grillplatten, Kochkessel und Bain-Maries von Diamond, CombiSteel und HENDI. Netto-Preise, Lieferung in ganz Deutschland.",
    intro: "Die Kochlinie ist das Herz jeder gewerblichen K\xFCche. Ob \xE0-la-carte-Restaurant, Kantine mit 500 Essen pro Tag oder Imbiss mit hohem Durchsatz \u2013 die richtige Kombination aus Herd, Fritteuse, Kombid\xE4mpfer und Grillplatte bestimmt Geschwindigkeit, Energieverbrauch und Arbeitsabl\xE4ufe. Bei 2MC Gastro finden Sie \xFCber 1.400 Kochger\xE4te in den Ger\xE4tetiefen 600, 700 und 900 mm, als Gas- oder Elektroausf\xFChrung, modular kombinierbar zu einer durchgehenden Kochzeile. Alle Preise verstehen sich netto zzgl. MwSt.; auf Wunsch planen wir Ihre Kochzeile kostenlos in 2D und 3D.",
    sections: [
      {
        h2: "Welche Kochger\xE4te braucht eine gewerbliche K\xFCche?",
        html: p(
          "Die Grundausstattung richtet sich nach Speisekarte und Kapazit\xE4t. Ein klassisches Restaurant arbeitet mit einem 4- bis 6-Flammen-Gasherd mit Backofen, einer Doppel-Fritteuse, einer Grillplatte und einem Kombid\xE4mpfer mit 6 bis 10 GN-1/1-Einsch\xFCben. Kantinen und Gro\xDFk\xFCchen setzen zus\xE4tzlich auf Kochkessel, Kippbratpfannen und Kombid\xE4mpfer mit 20 Einsch\xFCben. Imbiss und Fast Food ben\xF6tigen vor allem Fritteusen mit hoher Literleistung, Kontaktgrills und Warmhalteger\xE4te.",
          "Als Faustregel gilt: Serie 600 f\xFCr Bistro und Caf\xE9 mit wenig Platz, Serie 700 f\xFCr den klassischen Restaurantbetrieb, Serie 900 f\xFCr Gro\xDFk\xFCche, Hotel und Catering mit dauerhaft hoher Auslastung. Die Ger\xE4tetiefe bestimmt Leistung, Robustheit und Arbeitsfl\xE4che \u2013 und sie muss innerhalb einer Kochzeile einheitlich sein, damit die Ger\xE4te b\xFCndig abschlie\xDFen."
        )
      },
      {
        h2: "Gas oder Elektro \u2013 was ist wirtschaftlicher?",
        html: p(
          "Gasger\xE4te reagieren schneller, sind im Betrieb meist g\xFCnstiger und funktionieren unabh\xE4ngig vom Stromnetz. Sie erfordern jedoch einen Gasanschluss, eine ausreichend dimensionierte Ablufthaube und die Abnahme durch einen Fachbetrieb. Elektroger\xE4te \u2013 insbesondere Induktion \u2013 sind pr\xE4ziser regelbar, einfacher zu reinigen und erzeugen weniger Abw\xE4rme in der K\xFCche. Bei begrenzter Stromleistung (z. B. 32 A in Ladenlokalen) empfiehlt sich ein Mix: Gasherd plus Induktionsplatte und Elektro-Kombid\xE4mpfer.",
          "Wir geben bei jedem Ger\xE4t Anschlusswert (kW), Anschlussart (230 V / 400 V) und bei Gas die Nennw\xE4rmebelastung an, damit Ihr Installateur die Versorgung vorab pr\xFCfen kann."
        )
      },
      {
        h2: "Kochger\xE4te planen: Arbeitsablauf, L\xFCftung, Hygiene",
        html: p(
          "Eine gute Kochzeile folgt dem Arbeitsfluss: Vorbereitung \u2192 Garen \u2192 Anrichten \u2192 Ausgabe. Ger\xE4te mit offener Flamme oder Fettdampf (Herd, Fritteuse, Grillplatte) geh\xF6ren unter eine Ablufthaube nach VDI 2052; Kombid\xE4mpfer ben\xF6tigen Wasseranschluss, Ablauf und bei hohem Dampfaufkommen eine Kondensationshaube. Alle 2MC-Ger\xE4te aus Edelstahl (AISI 304) sind HACCP-konform und lassen sich ohne Werkzeug reinigen.",
          "Nutzen Sie unseren kostenlosen 3D-K\xFCchenplaner, um Kochzeile, Haube und Arbeitswege ma\xDFstabsgetreu zu pr\xFCfen, bevor Sie bestellen."
        )
      }
    ],
    faqs: [
      { q: "Welche Ger\xE4tetiefe (600/700/900) ist die richtige?", a: "Serie 600 eignet sich f\xFCr kleine K\xFCchen und Bistros, Serie 700 ist der Standard im Restaurant, Serie 900 ist f\xFCr Gro\xDFk\xFCchen, Hotels und Catering mit hoher Dauerlast ausgelegt. Innerhalb einer Kochzeile sollte die Tiefe einheitlich sein." },
      { q: "Brauche ich f\xFCr Gas-Kochger\xE4te eine Abnahme?", a: "Ja. Gasger\xE4te m\xFCssen von einem zugelassenen Installateur angeschlossen und abgenommen werden. Zus\xE4tzlich ist eine Ablufthaube mit ausreichender Absaugleistung erforderlich." },
      { q: "Sind die Preise netto oder brutto?", a: "Alle Preise auf 2MC Gastro sind Netto-Preise f\xFCr Gewerbekunden zzgl. 19 % MwSt. Sie erhalten eine ordnungsgem\xE4\xDFe B2B-Rechnung mit ausgewiesener Umsatzsteuer." },
      { q: "Kann ich meine Kochzeile vorab planen lassen?", a: "Ja. Mit dem kostenlosen 2D/3D-K\xFCchenplaner von 2MC Gastro platzieren Sie Kochger\xE4te in Ihren Raum, pr\xFCfen Ma\xDFe und Arbeitswege und erhalten aus dem Projekt direkt ein Angebot." }
    ],
    keywords: ["gastro kochger\xE4te", "kochger\xE4te gastronomie", "gro\xDFk\xFCchenger\xE4te", "gastro herd", "kochzeile gastronomie"],
    ggmSlug: "kochgeraete",
    published: true,
    children: [
      { slug: "kombidaempfer", taxonomySub: "kombidaempfer", name: "Kombid\xE4mpfer", h1: "Kombid\xE4mpfer f\xFCr Gastronomie kaufen", title: "Kombid\xE4mpfer kaufen \u2013 6, 10 & 20 GN, Elektro & Gas", description: "Kombid\xE4mpfer f\xFCr Gastronomie und Gro\xDFk\xFCche: 6, 10 und 20 GN-1/1-Einsch\xFCbe, Elektro oder Gas, mit Waschsystem und Kerntemperaturf\xFChler. Netto-Preise, Beratung, Lieferung deutschlandweit.", intro: "Der Kombid\xE4mpfer ersetzt Backofen, Dampfgarer und Grill in einem Ger\xE4t: Hei\xDFluft, Dampf und Kombi-Modus f\xFCr Fleisch, Fisch, Gem\xFCse, Backwaren und Regenerieren. Die Kapazit\xE4t richtet sich nach den Gedecken pro Service: 6 GN f\xFCr 50\u201380 Gedecke, 10 GN f\xFCr 80\u2013150, 20 GN f\xFCr Gro\xDFk\xFCche und Catering.", keywords: ["kombid\xE4mpfer", "kombid\xE4mpfer kaufen", "kombid\xE4mpfer 10 gn", "kombid\xE4mpfer gastronomie", "konvektomat"], faqs: [{ q: "Welche Kombid\xE4mpfer-Gr\xF6\xDFe brauche ich?", a: "6 GN 1/1 f\xFCr bis zu 80 Gedecke pro Service, 10 GN f\xFCr 80\u2013150 Gedecke, 20 GN f\xFCr Gro\xDFk\xFCche, Hotel und Catering. Bei B\xE4ckereien wird zus\xE4tzlich nach Blechma\xDF 600 \xD7 400 mm unterschieden." }, { q: "Braucht ein Kombid\xE4mpfer einen Wasseranschluss?", a: "Ja, Kombid\xE4mpfer ben\xF6tigen einen Kaltwasseranschluss (idealerweise enth\xE4rtet) und einen Ablauf. Modelle mit Waschsystem ben\xF6tigen zus\xE4tzlich Reinigerzufuhr." }] },
      { slug: "heissluftoefen", taxonomySub: "oefen", name: "Hei\xDFluft\xF6fen & Back\xF6fen", h1: "Hei\xDFluft\xF6fen & Back\xF6fen f\xFCr die Gastronomie", title: "Hei\xDFluftofen Gastro kaufen \u2013 Konvektions\xF6fen & Back\xF6fen", description: "Hei\xDFluft\xF6fen und Back\xF6fen f\xFCr Gastronomie, B\xE4ckerei und Imbiss: Konvektions\xF6fen 4\u201310 Bleche, Umluft\xF6fen mit Dampfzugabe, Regenerier\xF6fen. Netto-Preise, schnelle Lieferung.", keywords: ["hei\xDFluftofen gastro", "konvektionsofen gastronomie", "backofen gastronomie", "umluftofen gastro"] },
      { slug: "fritteusen", taxonomySub: "friteusen", name: "Fritteusen", h1: "Gastro Fritteusen \u2013 Elektro & Gas", title: "Gastro Fritteuse kaufen \u2013 Elektro & Gas, 8\u20132\xD720 Liter", description: "Professionelle Fritteusen f\xFCr Gastronomie und Imbiss: Tisch- und Standger\xE4te, Einzel- und Doppelbecken, 8 bis 2\xD720 Liter, Elektro oder Gas. Netto-Preise, Lieferung in ganz Deutschland.", intro: "Die Fritteuse ist im Imbiss, Fast Food und Restaurant das meistgenutzte Kochger\xE4t. Entscheidend sind Literleistung, Aufheizzeit und \xD6lwechselkomfort (Ablasshahn, Kaltzone). F\xFCr Pommes im Dauerbetrieb empfehlen wir Standger\xE4te mit mindestens 2\xD710 Litern und 2\xD79 kW.", keywords: ["gastro fritteuse", "fritteuse gastronomie", "gastro fritteuse gas", "doppel fritteuse gastro", "standfritteuse"], faqs: [{ q: "Wie viel Liter Fritteuse brauche ich?", a: "Kleine Karte und Bistro: 8\u201310 Liter Tischger\xE4t. Imbiss und Pommes-Schwerpunkt: Doppelfritteuse 2\xD710 bis 2\xD720 Liter als Standger\xE4t. Faustregel: pro Liter \xD6l ca. 1 kg Frittiergut pro Stunde." }] },
      { slug: "grillgeraete", taxonomySub: "grillgeraete", name: "Grills & Salamander", h1: "Gastro Grills, Grillplatten & Salamander", title: "Gastro Grill kaufen \u2013 Kontaktgrill, Grillplatte, Salamander", description: "Grillger\xE4te f\xFCr die Gastronomie: Kontaktgrills, Grillplatten (glatt/geriffelt), Lavasteingrills, Salamander, D\xF6nergrills und Gyrosgrills, Gas oder Elektro. Netto-Preise, Lieferung deutschlandweit.", keywords: ["gastro grill", "kontaktgrill gastro", "grillplatte gastronomie", "salamander gastro", "d\xF6nergrill", "lavasteingrill"] },
      { slug: "mikrowellen", taxonomySub: "mikrowellen", name: "Mikrowellen", h1: "Gewerbliche Mikrowellen f\xFCr die Gastronomie", title: "Gastro Mikrowelle kaufen \u2013 gewerblich, 1000\u20131800 W", description: "Gewerbliche Mikrowellen f\xFCr Gastronomie und Imbiss: Edelstahlgeh\xE4use, 1000\u20131800 Watt, Programmspeicher, f\xFCr Dauerbetrieb ausgelegt.", keywords: ["gastro mikrowelle", "gewerbliche mikrowelle", "mikrowelle gastronomie"] },
      { slug: "herde-und-kochkessel", taxonomySub: "kessel-pfannen", name: "Herde, Kochkessel & Kippbratpfannen", h1: "Gastro Herde, Kochkessel & Kippbratpfannen", title: "Gastro Herd kaufen \u2013 Gasherd, Induktion, Kochkessel", description: "Gastro-Herde mit 4\u20136 Flammen, Induktionsherde, Kochkessel 50\u2013300 Liter, Kippbratpfannen, Nudelkocher und Sous-Vide-Garer f\xFCr Restaurant und Gro\xDFk\xFCche. Netto-Preise, Beratung, Lieferung.", intro: "Herd, Kochkessel und Kippbratpfanne bilden die Basis der Warmk\xFCche. Gasherde mit 4 bis 6 Brennern und Backofen sind der Restaurant-Standard; Induktionsherde sparen Energie und erleichtern die Reinigung; Kochkessel und Kippbratpfannen sind die Mengenkocher der Gro\xDFk\xFCche.", keywords: ["gastro herd", "gasherd gastronomie", "induktionsherd gastro", "kochkessel gastronomie", "kippbratpfanne", "nudelkocher gastro"], faqs: [{ q: "Gasherd oder Induktionsherd f\xFCr die Gastronomie?", a: "Gas bietet schnelle Reaktion und niedrige Betriebskosten, Induktion pr\xE4zise Regelung, weniger Abw\xE4rme und einfache Reinigung. Bei begrenzter Stromleistung ist Gas oft die einzige Option f\xFCr 6 Kochstellen." }] },
      { slug: "warmhaltegeraete", taxonomySub: "warmegeraete", name: "Warmhalteger\xE4te & Bain-Maries", h1: "Warmhalteger\xE4te & Bain-Maries", title: "Bain-Marie & Warmhalteger\xE4te Gastro kaufen", description: "Bain-Maries, W\xE4rmebr\xFCcken, Speisenw\xE4rmer, Toaster und Hot-Dog-Ger\xE4te f\xFCr Ausgabe und Buffet. Netto-Preise f\xFCr Gewerbekunden.", keywords: ["bain marie", "bain marie gastro", "w\xE4rmebr\xFCcke", "speisenw\xE4rmer gastronomie", "warmhalteger\xE4t"] }
    ]
  },
  // ── 2. Kühlung ────────────────────────────────────────────────────────────
  {
    slug: "kuehlung",
    taxonomyCat: "cooling",
    name: "K\xFChlung",
    h1: "K\xFChlung f\xFCr Gastronomie & Gro\xDFk\xFCche",
    title: "Gastro K\xFChlschrank & K\xFChltechnik kaufen \u2013 K\xFChltische, K\xFChlzellen",
    description: "Gastro-K\xFChltechnik: K\xFChlschr\xE4nke und Tiefk\xFChlschr\xE4nke aus Edelstahl, K\xFChltische, Saladetten, K\xFChlvitrinen, K\xFChlzellen, Schockfroster und Eisw\xFCrfelbereiter. \xDCber 1.700 Ger\xE4te, Netto-Preise, Lieferung in ganz Deutschland.",
    intro: "K\xFChltechnik sichert Warenwert, Hygiene und HACCP-Nachweis. Von der Getr\xE4nkek\xFChlung an der Bar \xFCber den K\xFChltisch am Pass bis zur begehbaren K\xFChlzelle im Lager: 2MC Gastro f\xFChrt \xFCber 1.700 K\xFChlger\xE4te von Diamond, CombiSteel und HENDI. Wir helfen bei der Auswahl nach Volumen, Klimaklasse, Energieeffizienz und Einbausituation \u2013 und planen K\xFChlr\xE4ume und K\xFChlzeilen kostenlos in 2D/3D.",
    sections: [
      {
        h2: "Welche K\xFChlger\xE4te geh\xF6ren in eine Gastrok\xFCche?",
        html: ul(
          "<strong>K\xFChlschr\xE4nke & Tiefk\xFChlschr\xE4nke</strong> (400\u20131.400 Liter, Vollt\xFCr oder Glast\xFCr) f\xFCr Lager und Tagesk\xFChlung",
          "<strong>K\xFChltische & Saladetten</strong> als gek\xFChlte Arbeitsfl\xE4che direkt am Posten \u2013 Pizza, Salat, Belegstation",
          "<strong>K\xFChlzellen</strong> (begehbar, ab 4 m\xB3) f\xFCr Wareneingang und Wochenvorrat",
          "<strong>Schockfroster</strong> f\xFCr Cook & Chill und HACCP-konformes Herunterk\xFChlen von +70 \xB0C auf +3 \xB0C in 90 Minuten",
          "<strong>K\xFChlvitrinen & K\xFChltheken</strong> zur Pr\xE4sentation von Kuchen, Fleisch, Fisch und Getr\xE4nken",
          "<strong>Eisw\xFCrfelbereiter</strong> mit 20\u2013150 kg Tagesleistung f\xFCr Bar und Caf\xE9"
        )
      },
      {
        h2: "Klimaklasse, Energieeffizienz und K\xE4ltemittel",
        html: p(
          "Gewerbliche K\xFChlger\xE4te werden nach Klimaklasse (bis 4 = 30 \xB0C/55 % r. F., Klasse 5 = 40 \xB0C/40 % r. F.) f\xFCr die Umgebungstemperatur der K\xFCche ausgelegt. In hei\xDFen Kochbereichen w\xE4hlen Sie Klimaklasse 4 oder 5, sonst leidet die K\xFChlleistung. Achten Sie auf das EU-Energielabel: Ein Ger\xE4t der Klasse C oder besser spart gegen\xFCber \xE4lteren Ger\xE4ten bis zu 40 % Strom pro Jahr. Moderne Ger\xE4te arbeiten mit den nat\xFCrlichen K\xE4ltemitteln R290 (Propan) oder R600a und erf\xFCllen die F-Gase-Verordnung.",
          "Umluftk\xFChlung (ventiliert) h\xE4lt die Temperatur gleichm\xE4\xDFig und ist Standard f\xFCr K\xFCchen; statische K\xFChlung eignet sich f\xFCr Getr\xE4nke und empfindliche Waren."
        )
      },
      {
        h2: "HACCP: Temperaturen dokumentieren",
        html: p(
          "K\xFChlware muss bei maximal +7 \xB0C (Fleisch +4 \xB0C, Hackfleisch +2 \xB0C, Fisch +2 \xB0C) und Tiefk\xFChlware bei \u221218 \xB0C gelagert werden. Digitale Temperaturanzeigen, optionale Datenlogger und Alarmfunktion erleichtern den Nachweis bei der Lebensmittelkontrolle. Alle Ger\xE4te sind aus Edelstahl AISI 304 mit abgerundeten Innenecken und herausnehmbaren Rosten \u2013 einfach zu reinigen, dauerhaft hygienisch."
        )
      }
    ],
    faqs: [
      { q: "Welcher Gastro-K\xFChlschrank ist der richtige f\xFCr meinen Betrieb?", a: "F\xFCr Tagesk\xFChlung am Posten reicht ein 400\u2013700-Liter-Vollt\xFCrschrank, f\xFCr das Lager sind 1.200\u20131.400 Liter oder eine K\xFChlzelle sinnvoll. Glast\xFCrschr\xE4nke eignen sich zur Pr\xE4sentation von Getr\xE4nken und Kuchen im Gastraum." },
      { q: "Was bedeutet Klimaklasse 4 oder 5?", a: "Die Klimaklasse gibt an, bis zu welcher Umgebungstemperatur das Ger\xE4t seine K\xFChlleistung h\xE4lt: Klasse 4 bis 30 \xB0C, Klasse 5 bis 40 \xB0C. In der N\xE4he der Kochzeile sollte mindestens Klimaklasse 4 gew\xE4hlt werden." },
      { q: "Brauche ich einen Schockfroster?", a: "Wer vorproduziert (Cook & Chill), Speisen einfriert oder HACCP-konform abk\xFChlen muss, braucht einen Schockfroster: Er k\xFChlt von +70 \xB0C auf +3 \xB0C in unter 90 Minuten und verhindert Keimwachstum." },
      { q: "Liefern Sie K\xFChlzellen inklusive Montage?", a: "K\xFChlzellen werden als Paneelbausatz mit Aggregat geliefert; Montage und Inbetriebnahme durch einen K\xE4ltetechniker bieten wir auf Anfrage in NRW und angrenzenden Regionen an." }
    ],
    keywords: ["gastro k\xFChlschrank", "gastronomie k\xFChlschrank", "k\xFChltechnik gastronomie", "gewerbek\xFChlschrank", "gastro k\xFChlung"],
    ggmSlug: "kuehlung",
    published: true,
    children: [
      { slug: "kuehlschraenke", taxonomySub: "kuehlschraenke", name: "K\xFChlschr\xE4nke & Tiefk\xFChlschr\xE4nke", h1: "Gastro K\xFChlschr\xE4nke & Tiefk\xFChlschr\xE4nke aus Edelstahl", title: "Gastro K\xFChlschrank kaufen \u2013 Edelstahl, 400\u20131400 Liter", description: "Gastro-K\xFChlschr\xE4nke und Tiefk\xFChlschr\xE4nke aus Edelstahl: 400 bis 1.400 Liter, Vollt\xFCr oder Glast\xFCr, Umluft, Klimaklasse 4/5, GN 2/1. Netto-Preise, Lieferung in ganz Deutschland.", intro: "Der Gastro-K\xFChlschrank ist das meistverkaufte K\xFChlger\xE4t: Edelstahl innen und au\xDFen, GN-2/1-Roste, Umluftk\xFChlung und digitale Steuerung. W\xE4hlen Sie zwischen Vollt\xFCr (Lager), Glast\xFCr (Pr\xE4sentation), K\xFChl- oder Tiefk\xFChlausf\xFChrung sowie 1- oder 2-t\xFCrigen Modellen mit 700 bis 1.400 Litern.", keywords: ["gastro k\xFChlschrank", "gastro k\xFChlschrank edelstahl", "tiefk\xFChlschrank gastro", "gewerbek\xFChlschrank", "k\xFChlschrank gastronomie 700 liter"], faqs: [{ q: "Wie viel Liter sollte ein Gastro-K\xFChlschrank haben?", a: "F\xFCr den Posten reichen 400\u2013700 Liter (1 T\xFCr), f\xFCr Lager und Wochenware 1.200\u20131.400 Liter (2 T\xFCren). Rechnen Sie ca. 15\u201320 Liter K\xFChlvolumen pro Gedeck und Tag." }, { q: "Was ist der Unterschied zwischen Umluft- und statischer K\xFChlung?", a: "Umluft verteilt die K\xE4lte per Ventilator gleichm\xE4\xDFig und ist Standard f\xFCr K\xFCchen; statische K\xFChlung ist leiser und trocknet Lebensmittel weniger aus, eignet sich aber eher f\xFCr Getr\xE4nke." }] },
      { slug: "kuehltische", taxonomySub: "kuehltische", name: "K\xFChltische", h1: "K\xFChltische f\xFCr Gastronomie & Pizzeria", title: "K\xFChltisch Gastro kaufen \u2013 2\u20134 T\xFCren, GN 1/1, Edelstahl", description: "K\xFChltische mit 2, 3 oder 4 T\xFCren oder Schubladen, GN 1/1, mit oder ohne Aufkantung, Pizzak\xFChltische und Tiefk\xFChltische. Netto-Preise, Lieferung deutschlandweit.", intro: "Ein K\xFChltisch verbindet gek\xFChlten Stauraum mit einer Edelstahl-Arbeitsfl\xE4che direkt am Posten. T\xFCren oder Schubladen, Aufkantung, Granitplatte f\xFCr Pizzerien \u2013 die Auswahl richtet sich nach Arbeitsablauf und Platz.", keywords: ["k\xFChltisch", "k\xFChltisch gastro", "k\xFChltisch 3 t\xFCren", "tiefk\xFChltisch", "k\xFChlwerkbank"] },
      { slug: "saladetten", taxonomySub: "salatkuehlung", name: "Saladetten & Pizzak\xFChltische", h1: "Saladetten & Pizzak\xFChltische", title: "Saladette kaufen \u2013 gek\xFChlte Belegstation, Pizzak\xFChltisch", description: "Saladetten und Pizzak\xFChltische mit GN-Aufsatz f\xFCr Salate, Bel\xE4ge und Zutaten \u2013 die gek\xFChlte Belegstation f\xFCr Pizzeria, Sandwich-Bar und Restaurant.", keywords: ["saladette", "pizzak\xFChltisch", "belegstation k\xFChlung", "salatk\xFChlung"] },
      { slug: "kuehlvitrinen", taxonomySub: "vitrinen", name: "K\xFChlvitrinen", h1: "K\xFChlvitrinen f\xFCr Kuchen, Sushi & Getr\xE4nke", title: "K\xFChlvitrine Gastro kaufen \u2013 Kuchenvitrine, Sushivitrine", description: "K\xFChlvitrinen f\xFCr Caf\xE9, B\xE4ckerei und Gastronomie: Kuchenvitrinen, Aufsatzvitrinen, Sushivitrinen, Panoramavitrinen und Getr\xE4nkevitrinen.", keywords: ["k\xFChlvitrine", "kuchenvitrine gek\xFChlt", "k\xFChlvitrine gastro", "sushi vitrine", "aufsatzk\xFChlvitrine"] },
      { slug: "kuehltheken", taxonomySub: "kuehltheken", name: "K\xFChltheken", h1: "K\xFChltheken f\xFCr Fleisch, Fisch & Feinkost", title: "K\xFChltheke kaufen \u2013 Fleischtheke, Fischtheke, Bedientheke", description: "K\xFChltheken und Bedientheken f\xFCr Metzgerei, Fischhandel, Feinkost und B\xE4ckerei: statische und ventilierte Ausf\xFChrung, gerade oder geschwungene Scheibe.", keywords: ["k\xFChltheke", "fleischtheke", "fischtheke", "bedientheke k\xFChlung", "verkaufsk\xFChlung"] },
      { slug: "kuehlzellen", taxonomySub: "kuehlhaeuser", name: "K\xFChlzellen", h1: "K\xFChlzellen & Tiefk\xFChlzellen (begehbar)", title: "K\xFChlzelle kaufen \u2013 begehbar, 4\u201330 m\xB3, inkl. Aggregat", description: "Begehbare K\xFChlzellen und Tiefk\xFChlzellen ab 4 m\xB3 als Paneelbausatz mit Aggregat, 80\u2013100 mm Isolierung, mit oder ohne Boden. Planung und Montage auf Anfrage.", intro: "K\xFChlzellen sind die wirtschaftlichste L\xF6sung f\xFCr gr\xF6\xDFere Lagermengen: modulare Paneele, Schnellverschluss, Aggregat aufgesetzt oder abgesetzt. Wir planen K\xFChlzellen mit Ihnen nach Raumma\xDF und Bedarf.", keywords: ["k\xFChlzelle", "k\xFChlzelle begehbar", "tiefk\xFChlzelle", "k\xFChlraum gastronomie", "k\xFChlzelle mit aggregat"], faqs: [{ q: "Welche Gr\xF6\xDFe sollte meine K\xFChlzelle haben?", a: "F\xFCr ein Restaurant mit 60\u2013100 Sitzpl\xE4tzen sind 6\u201310 m\xB3 K\xFChlzelle plus 4\u20136 m\xB3 Tiefk\xFChlzelle \xFCblich. Planen Sie ca. 0,1 m\xB3 pro Gedeck und Woche Lagerware." }] },
      { slug: "schockfroster", taxonomySub: "schockfroster", name: "Schockfroster", h1: "Schockfroster & Schnellk\xFChler", title: "Schockfroster kaufen \u2013 3 bis 20 GN, Cook & Chill", description: "Schockfroster und Schnellk\xFChler mit 3, 5, 10 oder 20 GN-1/1-Einsch\xFCben f\xFCr HACCP-konformes Abk\xFChlen und Schockfrosten. Netto-Preise, Beratung, Lieferung.", keywords: ["schockfroster", "schnellk\xFChler gastro", "blast chiller", "schockfroster gastronomie", "cook and chill"] },
      { slug: "eiswuerfelbereiter", taxonomySub: "eiswuerfel", name: "Eisw\xFCrfelbereiter", h1: "Eisw\xFCrfelbereiter & Eismaschinen", title: "Eisw\xFCrfelmaschine Gastro kaufen \u2013 20\u2013150 kg/Tag", description: "Eisw\xFCrfelbereiter f\xFCr Bar, Caf\xE9 und Gastronomie: Hohlkegel- und Vollw\xFCrfel, Crushed Ice, Nugget-Eis, 20 bis 150 kg Tagesleistung, Luft- oder Wasserk\xFChlung.", keywords: ["eisw\xFCrfelmaschine gastro", "eisw\xFCrfelbereiter", "eismaschine gastronomie", "crushed ice maschine"] },
      { slug: "getraenkekuehler", taxonomySub: "getraenke", name: "Getr\xE4nkek\xFChler & Dispenser", h1: "Getr\xE4nkek\xFChler, Dispenser & Granita-Maschinen", title: "Getr\xE4nkek\xFChler & Saftdispenser Gastro kaufen", description: "Getr\xE4nkek\xFChlschr\xE4nke, Saftdispenser, Granita- und Slush-Maschinen sowie Wasserk\xFChler f\xFCr Bar, Caf\xE9 und Buffet.", keywords: ["getr\xE4nkek\xFChlschrank gastro", "saftdispenser", "granita maschine", "slush maschine gastro"] },
      { slug: "tiefkuehltruhen", taxonomySub: "truhen", name: "Tiefk\xFChltruhen", h1: "Gewerbliche Tiefk\xFChltruhen", title: "Tiefk\xFChltruhe Gastro kaufen \u2013 200\u2013600 Liter", description: "Gewerbliche Tiefk\xFChltruhen mit 200 bis 600 Litern, Klappdeckel oder Glasschiebedeckel, f\xFCr Lager, Eisdiele und Verkauf.", keywords: ["tiefk\xFChltruhe gastro", "gewerbliche tiefk\xFChltruhe", "gefriertruhe gastronomie"] }
    ]
  },
  // ── 3. Spültechnik ────────────────────────────────────────────────────────
  {
    slug: "spueltechnik",
    taxonomyCat: "dishwash",
    name: "Sp\xFCltechnik",
    h1: "Gewerbliche Sp\xFClmaschinen f\xFCr die Gastronomie",
    title: "Gastro Sp\xFClmaschine kaufen \u2013 Haubensp\xFCler, Gl\xE4sersp\xFCler",
    description: "Gewerbliche Sp\xFClmaschinen f\xFCr Gastronomie und Gro\xDFk\xFCche: Gl\xE4sersp\xFClmaschinen, Geschirrsp\xFClmaschinen (Fronteinschub), Haubensp\xFClmaschinen, Topfsp\xFCler und Bandsp\xFClmaschinen mit 2-Minuten-Programmen. Netto-Preise, Lieferung in ganz Deutschland.",
    intro: "Eine gewerbliche Sp\xFClmaschine sp\xFClt einen Korb in 90 bis 180 Sekunden bei 60\u201365 \xB0C und klarsp\xFClt mit 85 \xB0C \u2013 hygienisch, schnell und mit weniger Wasser als jede Handsp\xFClung. Die richtige Bauart h\xE4ngt von Geschirrart und Menge ab: Gl\xE4sersp\xFCler f\xFCr Bar und Caf\xE9, Fronteinschub-Geschirrsp\xFCler f\xFCr Restaurants bis ca. 100 Gedecke, Haubensp\xFClmaschine ab 100 Gedecken und Bandsp\xFClmaschine f\xFCr Kantine und Gro\xDFk\xFCche.",
    sections: [
      {
        h2: "Welche Sp\xFClmaschine f\xFCr welchen Betrieb?",
        html: ul(
          "<strong>Gl\xE4sersp\xFClmaschine</strong> (Korb 35\u201340 cm): Bar, Caf\xE9, Bistro \u2013 bis 30 K\xF6rbe/Stunde",
          "<strong>Geschirrsp\xFClmaschine Fronteinschub</strong> (Korb 50 \xD7 50 cm): Restaurant bis ca. 100 Gedecke \u2013 bis 40 K\xF6rbe/Stunde",
          "<strong>Haubensp\xFClmaschine</strong> (Korb 50 \xD7 50 cm, Durchschub): Restaurant und Hotel ab 100 Gedecken \u2013 bis 60 K\xF6rbe/Stunde, mit Zu- und Ablauftisch",
          "<strong>Topfsp\xFClmaschine</strong>: GN-Beh\xE4lter, T\xF6pfe, Bleche \u2013 hohe Einschubh\xF6he",
          "<strong>Bandsp\xFClmaschine</strong>: Kantine, Mensa, Krankenhaus \u2013 \xFCber 1.000 Teller pro Stunde"
        )
      },
      {
        h2: "Anschluss, Wasserh\xE4rte und Dosierung",
        html: p(
          "Gewerbliche Sp\xFClmaschinen ben\xF6tigen 400 V (kleinere Gl\xE4sersp\xFCler 230 V), einen Warm- oder Kaltwasseranschluss und einen Ablauf. Bei Wasserh\xE4rte \xFCber 7 \xB0dH ist ein Enth\xE4rter (eingebaut oder extern) Pflicht, sonst verkalken Boiler und D\xFCsen innerhalb weniger Monate. Dosierpumpen f\xFCr Reiniger und Klarsp\xFCler sind bei den meisten Modellen eingebaut; eine Ablaufpumpe erm\xF6glicht die Aufstellung ohne bodennahen Abfluss.",
          "Achten Sie auf die Tankheizung und Boilerleistung: Nur mit ausreichend Heizleistung erreicht das Ger\xE4t die 85 \xB0C Klarsp\xFCltemperatur auch im Dauerbetrieb."
        )
      },
      {
        h2: "Sp\xFClk\xFCche planen",
        html: p(
          "Die Sp\xFClk\xFCche folgt dem Prinzip \u201Eschmutzig \u2192 sauber\u201C in einer Richtung: Abr\xE4umtisch mit Abfall\xF6ffnung und Vorsp\xFClbrause, Sp\xFClmaschine, Ablauftisch, Regal. F\xFCr Haubensp\xFClmaschinen ben\xF6tigen Sie Zu- und Ablauftische aus Edelstahl, die wir passend anbieten. Im 3D-K\xFCchenplaner pr\xFCfen Sie die Sp\xFClstrecke inklusive T\xFCren und Laufwegen."
        )
      }
    ],
    faqs: [
      { q: "Wie lange dauert ein Sp\xFClgang in einer Gastro-Sp\xFClmaschine?", a: "Je nach Programm 90 bis 180 Sekunden. Gl\xE4sersp\xFCler arbeiten oft mit 2-Minuten-Programmen, Haubensp\xFClmaschinen mit 1\u20133 Minuten je Korb." },
      { q: "Brauche ich einen Enth\xE4rter?", a: "Ab 7 \xB0dH Wasserh\xE4rte ja. Viele Modelle sind mit eingebautem Enth\xE4rter erh\xE4ltlich; alternativ wird ein externer Enth\xE4rter vorgeschaltet. Ohne Enth\xE4rter verkalken Boiler und Heizst\xE4be und die Garantie kann erl\xF6schen." },
      { q: "Kann ich eine gewerbliche Sp\xFClmaschine an 230 V betreiben?", a: "Kleinere Gl\xE4sersp\xFClmaschinen und einige Fronteinschub-Ger\xE4te sind mit 230 V erh\xE4ltlich. Haubensp\xFClmaschinen und Topfsp\xFCler ben\xF6tigen in der Regel 400 V." },
      { q: "Was ist der Unterschied zwischen Haubensp\xFClmaschine und Fronteinschub?", a: "Beim Fronteinschub wird der Korb von vorn eingeschoben (kompakt, unter der Arbeitsplatte). Die Haubensp\xFClmaschine steht zwischen Zu- und Ablauftisch, der Korb wird durchgeschoben \u2013 deutlich schneller bei hohem Aufkommen." }
    ],
    keywords: ["gastro sp\xFClmaschine", "gewerbliche sp\xFClmaschine", "gastronomie sp\xFClmaschine", "sp\xFClmaschine gastro", "industriesp\xFClmaschine"],
    ggmSlug: "spuelen-und-reinigen",
    published: true,
    children: [
      { slug: "haubenspuelmaschinen", taxonomySub: "hauben-spuelmaschinen", name: "Haubensp\xFClmaschinen", h1: "Haubensp\xFClmaschinen (Durchschub)", title: "Haubensp\xFClmaschine kaufen \u2013 Durchschubsp\xFCler 50\xD750", description: "Haubensp\xFClmaschinen f\xFCr Restaurant und Hotel ab 100 Gedecken: Korb 50 \xD7 50 cm, bis 60 K\xF6rbe pro Stunde, Zu- und Ablauftische passend erh\xE4ltlich.", keywords: ["haubensp\xFClmaschine", "durchschubsp\xFClmaschine", "haubensp\xFCler gastro"] },
      { slug: "geschirrspuelmaschinen", taxonomySub: "geschirrspueler", name: "Geschirrsp\xFClmaschinen", h1: "Gewerbliche Geschirrsp\xFClmaschinen (Fronteinschub)", title: "Gewerbliche Geschirrsp\xFClmaschine kaufen \u2013 Fronteinschub", description: "Geschirrsp\xFClmaschinen mit Fronteinschub f\xFCr Restaurant, Caf\xE9 und Imbiss: Korb 50 \xD7 50 cm, 2\u20133-Minuten-Programme, mit Ablaufpumpe und Dosierung.", keywords: ["gewerbliche geschirrsp\xFClmaschine", "geschirrsp\xFCler gastronomie", "unterbau sp\xFClmaschine gastro"] },
      { slug: "glaeserspuelmaschinen", taxonomySub: "glaeserspueler", name: "Gl\xE4sersp\xFClmaschinen", h1: "Gl\xE4sersp\xFClmaschinen f\xFCr Bar & Caf\xE9", title: "Gl\xE4sersp\xFClmaschine kaufen \u2013 Bar, Caf\xE9, 230 V", description: "Gl\xE4sersp\xFClmaschinen mit Korb 35\u201340 cm f\xFCr Bar, Caf\xE9 und Bistro: 230 V, 2-Minuten-Programm, Klarsp\xFClung 85 \xB0C.", keywords: ["gl\xE4sersp\xFClmaschine", "gl\xE4sersp\xFCler gastro", "gl\xE4sersp\xFClmaschine bar"] },
      { slug: "bandspuelmaschinen", taxonomySub: "korbtransport", name: "Bandsp\xFClmaschinen", h1: "Korbtransport- & Bandsp\xFClmaschinen", title: "Bandsp\xFClmaschine kaufen \u2013 Kantine, Mensa, Gro\xDFk\xFCche", description: "Korbtransport- und Bandsp\xFClmaschinen f\xFCr Kantine, Mensa und Krankenhaus mit \xFCber 1.000 Tellern pro Stunde.", keywords: ["bandsp\xFClmaschine", "korbtransportsp\xFClmaschine", "sp\xFClmaschine gro\xDFk\xFCche"] },
      { slug: "spuelmaschinen-zubehoer", taxonomySub: "dishwash-zubehoer", name: "Sp\xFClk\xF6rbe & Zubeh\xF6r", h1: "Sp\xFClk\xF6rbe, Enth\xE4rter & Zubeh\xF6r", title: "Sp\xFClk\xF6rbe & Sp\xFClmaschinen-Zubeh\xF6r kaufen", description: "Sp\xFClk\xF6rbe 50 \xD7 50 cm, Gl\xE4serk\xF6rbe, Besteckk\xF6cher, Enth\xE4rter, Osmoseanlagen und Poliermaschinen f\xFCr die Sp\xFClk\xFCche.", keywords: ["sp\xFClkorb 50x50", "gl\xE4serkorb", "enth\xE4rter sp\xFClmaschine", "gl\xE4serpoliermaschine"] }
    ]
  },
  // ── 4. Edelstahlmöbel ─────────────────────────────────────────────────────
  {
    slug: "edelstahlmoebel",
    taxonomyCat: "prep_hygiene",
    name: "Edelstahlm\xF6bel",
    h1: "Edelstahlm\xF6bel f\xFCr Gastronomie & Gro\xDFk\xFCche",
    title: "Edelstahlm\xF6bel Gastro kaufen \u2013 Arbeitstische, Sp\xFClen, Regale",
    description: "Edelstahlm\xF6bel f\xFCr die Gastronomie: Arbeitstische mit und ohne Aufkantung, Sp\xFCltische und Sp\xFClbecken, Wandregale, Schr\xE4nke und Hygieneausstattung aus Edelstahl AISI 304. Netto-Preise, Lieferung in ganz Deutschland.",
    intro: "Edelstahlm\xF6bel sind die neutrale Basis jeder gewerblichen K\xFCche: Arbeitstische, Sp\xFCltische, Wandborde und Schr\xE4nke aus rostfreiem Edelstahl AISI 304 erf\xFCllen die Hygieneanforderungen der Lebensmittel\xFCberwachung, sind fugenarm und halten Jahrzehnte. 2MC Gastro f\xFChrt \xFCber 600 Edelstahlm\xF6bel in den Standardtiefen 600 und 700 mm sowie in Rasterbreiten von 400 bis 2.400 mm \u2013 auf Wunsch fertigen die Hersteller nach Ma\xDF.",
    sections: [
      {
        h2: "Arbeitstische, Sp\xFCltische, Regale: die Grundausstattung",
        html: p(
          "Arbeitstische gibt es mit Grundboden, Zwischenboden, Aufkantung (Wandanschluss) und Schubladen. Sp\xFCltische mit ein oder zwei Becken bilden mit Vorsp\xFClbrause die Abr\xE4umstrecke; Handwaschbecken mit Kniebedienung sind in jeder K\xFCche Pflicht. Wandborde und Regale nutzen die H\xF6he, Schr\xE4nke mit Schiebet\xFCren sch\xFCtzen Geschirr und Vorr\xE4te vor Verschmutzung.",
          "Alle M\xF6bel werden zerlegt oder verschwei\xDFt geliefert; verschwei\xDFte Ausf\xFChrungen sind stabiler und leichter zu reinigen, zerlegte passen durch jede T\xFCr."
        )
      },
      {
        h2: "Materialst\xE4rke und Edelstahlqualit\xE4t",
        html: p(
          "F\xFCr Arbeitsfl\xE4chen sind 0,8\u20131,2 mm Blechst\xE4rke \xFCblich, f\xFCr Sp\xFCltische und stark belastete Tische 1,2\u20131,5 mm. AISI 304 (V2A) ist der Standard f\xFCr K\xFCchen; AISI 316 (V4A) empfiehlt sich bei aggressiven Reinigern oder Salzwasserkontakt. Wir kennzeichnen Materialst\xE4rke und Legierung bei jedem Produkt."
        )
      },
      {
        h2: "M\xF6bel nach Ma\xDF und K\xFCchenplanung",
        html: p(
          "Nicht jede K\xFCche passt ins Raster. Diamond und CombiSteel fertigen Arbeitstische, Sp\xFCltische und Theken in Sonderma\xDFen; Lieferzeit 3\u20136 Wochen. Mit unserem 3D-K\xFCchenplaner legen Sie M\xF6belzeilen an W\xE4nden entlang, pr\xFCfen T\xFCren und Durchg\xE4nge und exportieren die Ma\xDFliste f\xFCr das Angebot."
        )
      }
    ],
    faqs: [
      { q: "Welche Blechst\xE4rke sollte ein Edelstahl-Arbeitstisch haben?", a: "F\xFCr normale Arbeitsfl\xE4chen 0,8\u20131,0 mm, f\xFCr stark belastete Tische (Fleischverarbeitung, schwere Ger\xE4te) 1,2\u20131,5 mm. Die Unterkonstruktion ist entscheidend f\xFCr die Tragkraft." },
      { q: "Wo ist ein Handwaschbecken vorgeschrieben?", a: "Nach EU-Verordnung 852/2004 muss in jedem Vorbereitungs- und Kochbereich ein separates Handwaschbecken mit Warm-/Kaltwasser, Seife und Papierhandt\xFCchern vorhanden sein \u2013 idealerweise mit Knie- oder Sensorbedienung." },
      { q: "Werden Edelstahlm\xF6bel montiert geliefert?", a: "Verschwei\xDFte M\xF6bel werden montiert geliefert, zerlegte M\xF6bel als Bausatz mit Montageanleitung. Auf Wunsch \xFCbernehmen wir in NRW Aufstellung und Ausrichtung." },
      { q: "Fertigen Sie Edelstahlm\xF6bel nach Ma\xDF?", a: "Ja, \xFCber unsere Hersteller Diamond und CombiSteel. Senden Sie uns Ma\xDFe und Skizze, wir erstellen ein Angebot; Lieferzeit ca. 3\u20136 Wochen." }
    ],
    keywords: ["edelstahlm\xF6bel gastronomie", "edelstahltisch", "arbeitstisch edelstahl", "gastro edelstahl", "edelstahl k\xFCchenm\xF6bel"],
    ggmSlug: "edelstahlmoebel",
    published: true,
    children: [
      { slug: "arbeitstische", taxonomySub: "arbeitstische", name: "Arbeitstische", h1: "Edelstahl Arbeitstische f\xFCr die Gastronomie", title: "Edelstahltisch kaufen \u2013 Arbeitstisch 600/700 mm, mit Aufkantung", description: "Edelstahl-Arbeitstische in 600 und 700 mm Tiefe, 400\u20132.400 mm Breite, mit Grundboden, Aufkantung, Schubladen oder Schneidbrett. AISI 304, Netto-Preise, schnelle Lieferung.", intro: "Der Edelstahl-Arbeitstisch ist das Basism\xF6bel jeder K\xFCche. W\xE4hlen Sie Tiefe (600/700 mm), Breite im 100-mm-Raster, mit oder ohne Aufkantung und Grundboden. Verschwei\xDFte Tische sind stabiler, zerlegte passen durch enge T\xFCren.", keywords: ["edelstahltisch", "arbeitstisch edelstahl", "edelstahl arbeitstisch gastro", "edelstahltisch mit aufkantung", "edelstahltisch 200 cm"] },
      { slug: "spuelbecken-und-armaturen", taxonomySub: "spuelbecken", name: "Sp\xFCltische & Armaturen", h1: "Sp\xFCltische, Sp\xFClbecken & Armaturen", title: "Sp\xFCltisch Edelstahl kaufen \u2013 1 oder 2 Becken, Handwaschbecken", description: "Sp\xFCltische und Sp\xFClbecken aus Edelstahl mit 1 oder 2 Becken, Abtropffl\xE4che links/rechts, Handwaschbecken mit Kniebedienung, Vorsp\xFClbrausen und Mischbatterien.", keywords: ["sp\xFCltisch edelstahl", "gastro sp\xFCle", "handwaschbecken gastronomie", "vorsp\xFClbrause", "sp\xFClbecken edelstahl"] },
      { slug: "regale", taxonomySub: "regale", name: "Regale & Wandborde", h1: "Edelstahl Regale & Wandborde", title: "Edelstahlregal Gastro kaufen \u2013 Wandbord, Lagerregal", description: "Edelstahlregale, Wandborde und Lagerregale f\xFCr K\xFCche, Lager und K\xFChlzelle \u2013 hygienisch, verstellbar, hoch belastbar.", keywords: ["edelstahlregal", "wandregal edelstahl gastro", "wandbord edelstahl", "lagerregal gastronomie"] },
      { slug: "schraenke", taxonomySub: "schraenke", name: "Schr\xE4nke", h1: "Edelstahlschr\xE4nke & Wandh\xE4ngeschr\xE4nke", title: "Edelstahlschrank Gastro kaufen \u2013 Arbeitsschrank, Wandschrank", description: "Edelstahl-Arbeitsschr\xE4nke mit Schiebet\xFCren, Wandh\xE4ngeschr\xE4nke, Geschirrschr\xE4nke und W\xE4rmeschr\xE4nke f\xFCr K\xFCche und Ausgabe.", keywords: ["edelstahlschrank", "arbeitsschrank edelstahl", "wandh\xE4ngeschrank edelstahl", "geschirrschrank gastronomie"] },
      { slug: "abfall-und-hygiene", taxonomySub: "abfall-hygiene", name: "Abfall & Hygiene", h1: "Abfallsysteme & Hygieneausstattung", title: "Abfalleimer & Hygiene Gastronomie kaufen", description: "Abfallsammler, M\xFClltonnenk\xFChler, Insektenvernichter, Ozon-Ger\xE4te, Messersterilisatoren und Hygieneausstattung f\xFCr gewerbliche K\xFCchen.", keywords: ["abfalleimer gastronomie", "insektenvernichter gastro", "messersterilisator", "hygieneausstattung k\xFCche"] }
    ]
  },
  // ── 5. Pizza & Teig ───────────────────────────────────────────────────────
  {
    slug: "pizza-und-teig",
    taxonomyCat: "pizza_pasta",
    name: "Pizza & Teig",
    h1: "Pizza\xF6fen & Teigmaschinen f\xFCr Pizzeria und B\xE4ckerei",
    title: "Pizzaofen Gastro kaufen \u2013 Elektro, Gas, Teigknetmaschinen",
    description: "Pizza\xF6fen f\xFCr die Gastronomie (Elektro, Gas, 1\u20132 Kammern, 4\u201312 Pizzen), Teigknetmaschinen 10\u201360 kg, Teigausrollmaschinen, Teigportionierer und Nudelmaschinen. Netto-Preise, Lieferung deutschlandweit.",
    intro: "F\xFCr Pizzeria, Lieferdienst und italienisches Restaurant z\xE4hlt die Kette Teig \u2192 K\xFChlung \u2192 Belegen \u2192 Backen. 2MC Gastro f\xFChrt \xFCber 400 Ger\xE4te: Elektro-Pizza\xF6fen mit Schamottboden und 400\u2013500 \xB0C f\xFCr Pizza in 3\u20134 Minuten, Gas-Pizza\xF6fen, Spiralkneter von 10 bis 60 kg Teig, Teigausroller, Portionierer und Nudelmaschinen. Dazu passende Pizzak\xFChltische finden Sie in der K\xFChlung.",
    sections: [
      {
        h2: "Elektro- oder Gas-Pizzaofen?",
        html: p(
          "Elektro-Pizza\xF6fen mit separat regelbarer Ober-/Unterhitze und Schamottboden sind der Standard in Pizzerien: 1 oder 2 Kammern f\xFCr je 4, 6 oder 9 Pizzen \xE0 30\u201334 cm, 400 V, Backzeit 3\u20135 Minuten bei 350\u2013450 \xB0C. Gas-Pizza\xF6fen sind bei fehlender Stromleistung oder hohem Durchsatz wirtschaftlicher; Holzofen-Optik-Modelle mit Gasbrenner liefern das Kuppelofen-Ergebnis ohne Holzlager.",
          "F\xFCr Lieferdienste mit \xFCber 300 Pizzen am Abend empfiehlt sich ein Durchlaufofen (Tunnelofen) mit F\xF6rderband."
        )
      },
      {
        h2: "Teigknetmaschinen richtig dimensionieren",
        html: p(
          "Spiralkneter werden nach Teigmenge pro Charge angegeben: 10\u201318 kg f\xFCr kleine Pizzerien, 25\u201340 kg f\xFCr Betriebe mit 150+ Pizzen am Tag, 50\u201360 kg f\xFCr B\xE4ckerei und Produktion. Achten Sie auf Kesselvolumen (Liter) versus Teigkapazit\xE4t (kg) und auf Modelle mit 2 Geschwindigkeiten f\xFCr hydratisierte Teige. Teigausrollmaschinen und Teigportionierer beschleunigen die Vorbereitung und sorgen f\xFCr gleichm\xE4\xDFige B\xF6den."
        )
      }
    ],
    faqs: [
      { q: "Welche Gr\xF6\xDFe Pizzaofen brauche ich?", a: "Bis ca. 100 Pizzen am Abend reicht ein Ofen mit 1 Kammer f\xFCr 4\u20136 Pizzen; bei 100\u2013250 Pizzen ein 2-Kammer-Ofen (2\xD76 oder 2\xD79); dar\xFCber ein Durchlaufofen." },
      { q: "Wie hei\xDF wird ein Gastro-Pizzaofen?", a: "Elektro-Pizza\xF6fen mit Schamottboden erreichen 400\u2013500 \xB0C. Bei 350\u2013400 \xB0C ist eine neapolitanische Pizza in 3\u20134 Minuten fertig." },
      { q: "Welche Teigknetmaschine f\xFCr 200 Pizzen am Tag?", a: "Bei ca. 250 g Teig pro Pizza sind das 50 kg Teig am Tag \u2013 ein Spiralkneter mit 25\u201330 kg Kapazit\xE4t und zwei Chargen reicht; mit 40 kg haben Sie Reserve." },
      { q: "Brauche ich f\xFCr einen Pizzaofen eine Abzugshaube?", a: "Elektro-Pizza\xF6fen ben\xF6tigen in der Regel keine Fettabscheidung, aber eine W\xE4rmeabf\xFChrung; Gas-Pizza\xF6fen und Holz\xF6fen brauchen einen Abzug. Wir beraten nach Ihrer \xF6rtlichen Bauordnung." }
    ],
    keywords: ["pizzaofen gastro", "pizzaofen gastronomie", "pizzaofen elektro gastro", "teigknetmaschine", "pizzeria ausstattung", "pizzaofen kaufen"],
    ggmSlug: "teig-und-mehl",
    published: true,
    children: [
      { slug: "pizzaoefen", taxonomySub: "pizzaoefen", name: "Pizza\xF6fen", h1: "Pizza\xF6fen \u2013 Elektro, Gas & Durchlauf", title: "Pizzaofen kaufen \u2013 Elektro & Gas, 4\u201318 Pizzen", description: "Gastro-Pizza\xF6fen: Elektro mit Schamottboden (1\u20132 Kammern, 4\u201318 Pizzen, bis 500 \xB0C), Gas-Pizza\xF6fen und Durchlauf\xF6fen f\xFCr Pizzeria und Lieferdienst. Netto-Preise, Lieferung deutschlandweit.", intro: "Vom kompakten 4er-Ofen f\xFCr die Bar bis zum 2-Kammer-Ofen mit 18 Pizzen: Elektro-Pizza\xF6fen mit separater Ober-/Unterhitze und Schamottstein liefern bei 400\u2013500 \xB0C in 3\u20135 Minuten eine knusprige Pizza.", keywords: ["pizzaofen", "pizzaofen gastro", "pizzaofen elektro", "pizzaofen gas", "pizzaofen 2 kammern", "durchlaufofen pizza"] },
      { slug: "teigknetmaschinen", taxonomySub: "teigkneter", name: "Teigknetmaschinen", h1: "Teigknetmaschinen & Spiralkneter", title: "Teigknetmaschine kaufen \u2013 Spiralkneter 10\u201360 kg", description: "Spiralkneter und Teigknetmaschinen von 10 bis 60 kg Teigkapazit\xE4t, 1\u20132 Geschwindigkeiten, feste oder abnehmbare Kessel, f\xFCr Pizzeria und B\xE4ckerei.", keywords: ["teigknetmaschine", "spiralkneter", "teigknetmaschine gastro", "teigmaschine pizza", "spiralteigknetmaschine"] },
      { slug: "teigausrollmaschinen", taxonomySub: "teigausroller", name: "Teigausrollmaschinen", h1: "Teigausrollmaschinen & Pizzapressen", title: "Teigausrollmaschine kaufen \u2013 Pizza 26\u201345 cm", description: "Teigausrollmaschinen und Pizzapressen f\xFCr B\xF6den von 26 bis 45 cm \u2013 gleichm\xE4\xDFig, schnell, ohne Kraftaufwand.", keywords: ["teigausrollmaschine", "pizzateig ausrollmaschine", "pizzapresse", "teigausroller"] },
      { slug: "teigportionierer", taxonomySub: "teigportionierer", name: "Teigportionierer", h1: "Teigportionierer & Teigabrunder", title: "Teigportionierer kaufen \u2013 Teigteiler & Rundwirker", description: "Teigportionierer, Teigteiler und Rundwirkmaschinen f\xFCr gleichm\xE4\xDFige Teiglinge in Pizzeria und B\xE4ckerei.", keywords: ["teigportionierer", "teigteiler", "teigabrunder", "rundwirkmaschine"] },
      { slug: "nudelmaschinen", taxonomySub: "nudelmaschinen", name: "Nudelmaschinen", h1: "Nudelmaschinen f\xFCr die Gastronomie", title: "Nudelmaschine Gastro kaufen \u2013 Pasta-Extruder", description: "Elektrische Nudelmaschinen und Pasta-Extruder f\xFCr frische Pasta im Restaurant: 2\u20138 kg Teig pro Stunde, wechselbare Matrizen.", keywords: ["nudelmaschine gastro", "pastamaschine gastronomie", "nudelmaschine elektrisch profi"] },
      { slug: "pizza-zubehoer", taxonomySub: "pizza-zubehoer", name: "Pizza-Zubeh\xF6r", h1: "Pizza-Zubeh\xF6r: Schaufeln, Bleche, Teigbeh\xE4lter", title: "Pizza Zubeh\xF6r Gastro \u2013 Pizzaschaufel, Bleche, Teigboxen", description: "Pizzaschaufeln, Pizzableche und Screens, Teigbeh\xE4lter, Pizzaschneider und Mozzarella-Reiben f\xFCr die Pizzeria.", keywords: ["pizzaschaufel", "pizzablech gastro", "teigbeh\xE4lter pizza", "pizzaschneider profi"], published: false }
    ]
  },
  // ── 6. Lüftung ────────────────────────────────────────────────────────────
  {
    slug: "lueftung",
    taxonomyCat: "ventilation",
    name: "L\xFCftung",
    h1: "L\xFCftungstechnik & Abzugshauben f\xFCr die Gastronomie",
    title: "Dunstabzugshaube Gastro kaufen \u2013 Wandhaube, Inselhaube, Abluft",
    description: "Gastro-L\xFCftungstechnik: Wandhauben und Inselhauben aus Edelstahl mit Flammschutzfiltern, Abluftventilatoren, Motorboxen, Aktivkohlefilter und Zubeh\xF6r nach VDI 2052. Netto-Preise, Planung, Lieferung.",
    intro: "Jede gewerbliche K\xFCche mit Koch- und Bratger\xE4ten ben\xF6tigt eine Abluftanlage: Sie f\xFChrt Fettdampf, W\xE4rme und Feuchtigkeit ab, sch\xFCtzt vor Fettbrand und ist Voraussetzung f\xFCr die Betriebsgenehmigung. 2MC Gastro liefert Edelstahl-Wandhauben und Inselhauben in Breiten von 1.000 bis 4.000 mm, passende Radialventilatoren und Motorboxen sowie Filter und Regler \u2013 und berechnet f\xFCr Sie den n\xF6tigen Luftvolumenstrom nach VDI 2052.",
    sections: [
      {
        h2: "Wandhaube oder Inselhaube \u2013 und wie gro\xDF?",
        html: p(
          "Steht die Kochzeile an der Wand, ist die Wandhaube (Schr\xE4gmodell oder Kastenhaube) die richtige Wahl; freistehende Kochbl\xF6cke erhalten eine Inselhaube mit Absaugung von allen Seiten. Die Haube sollte die Ger\xE4te an jeder Seite um 200\u2013300 mm \xFCberragen und in 1.900\u20132.100 mm H\xF6he h\xE4ngen. Als Faustformel f\xFCr den Volumenstrom gelten 400\u2013600 m\xB3/h pro laufendem Meter Haube bei Elektroger\xE4ten und 600\u20131.000 m\xB3/h bei Gasger\xE4ten \u2013 die genaue Auslegung erfolgt nach VDI 2052 anhand der Anschlussleistung."
        )
      },
      {
        h2: "Filter, Ventilator, Regelung",
        html: p(
          "Flammschutzfilter aus Edelstahl (Typ A nach DIN 18869-5) halten Fett zur\xFCck und sind sp\xFClmaschinengeeignet; sie m\xFCssen regelm\xE4\xDFig gereinigt werden. Der Radialventilator wird als Motorbox in die Abluftleitung oder auf das Dach gesetzt; ein Drehzahlregler passt die Leistung an den Betrieb an. Wo kein Abluftkanal nach au\xDFen m\xF6glich ist, bieten Umlufthauben mit Aktivkohle- oder Plasmafilter eine L\xF6sung \u2013 mit Einschr\xE4nkungen bei Gasger\xE4ten.",
          "Zuluft nicht vergessen: Was abgesaugt wird, muss nachstr\xF6men, sonst entsteht Unterdruck und T\xFCren lassen sich schwer \xF6ffnen."
        )
      }
    ],
    faqs: [
      { q: "Welche Abzugshaube brauche ich f\xFCr eine 3 Meter lange Kochzeile?", a: "Eine Wandhaube mit 3.400\u20133.600 mm Breite (\xDCberstand 200\u2013300 mm je Seite), 1.000\u20131.200 mm Tiefe und ein Ventilator mit ca. 2.000\u20133.000 m\xB3/h bei Gasger\xE4ten. Die exakte Auslegung nach VDI 2052 erstellen wir auf Basis Ihrer Ger\xE4teliste." },
      { q: "Wie oft m\xFCssen Flammschutzfilter gereinigt werden?", a: "Je nach Betrieb w\xF6chentlich bis t\xE4glich in der Sp\xFClmaschine. Verfettete Filter erh\xF6hen das Brandrisiko und senken die Absaugleistung erheblich." },
      { q: "Geht auch eine Umlufthaube ohne Abluftkanal?", a: "F\xFCr Elektroger\xE4te mit geringer Fettentwicklung ja (Aktivkohle-/Plasmafilter). F\xFCr Gasger\xE4te ist eine Abluftf\xFChrung nach au\xDFen fast immer vorgeschrieben." },
      { q: "Planen Sie die L\xFCftungsanlage mit?", a: "Ja. Wir berechnen Volumenstrom und Haubengr\xF6\xDFe f\xFCr Ihre Kochzeile und platzieren die Haube im 3D-K\xFCchenplaner. Die Installation \xFCbernimmt ein L\xFCftungsbauer vor Ort." }
    ],
    keywords: ["dunstabzugshaube gastro", "abzugshaube gastronomie", "l\xFCftung gastronomie", "wandhaube edelstahl", "gastro abluft", "k\xFCchenabluft gewerblich"],
    ggmSlug: "lueftung",
    published: true,
    children: [
      { slug: "wandhauben", taxonomySub: "wandhauben", name: "Wandhauben", h1: "Edelstahl Wandhauben f\xFCr Gastrok\xFCchen", title: "Wandhaube Gastro kaufen \u2013 Schr\xE4g- & Kastenhaube 1\u20134 m", description: "Wandhauben aus Edelstahl (Schr\xE4gmodell, Kastenhaube) in 1.000\u20134.000 mm Breite mit Flammschutzfiltern und LED-Beleuchtung f\xFCr Kochzeilen an der Wand.", keywords: ["wandhaube", "wandhaube edelstahl", "dunstabzugshaube wand gastro", "kastenhaube"] },
      { slug: "inselhauben", taxonomySub: "zentralhauben", name: "Inselhauben", h1: "Inselhauben f\xFCr freistehende Kochbl\xF6cke", title: "Inselhaube Gastro kaufen \u2013 Zentralhaube Edelstahl", description: "Inselhauben und Zentralhauben aus Edelstahl f\xFCr freistehende Kochbl\xF6cke mit Absaugung von allen Seiten.", keywords: ["inselhaube", "zentralhaube gastro", "deckenhaube gastronomie"] },
      { slug: "abluftventilatoren", taxonomySub: "absaugeinheiten", name: "Ventilatoren & Filter", h1: "Abluftventilatoren, Motorboxen & Filter", title: "Abluftventilator Gastro kaufen \u2013 Motorbox, Flammschutzfilter", description: "Radialventilatoren, Motorboxen, Flammschutzfilter, Aktivkohlefilter und Abluftrohre f\xFCr gewerbliche K\xFCchenabluft.", keywords: ["abluftventilator gastro", "motorbox abluft", "flammschutzfilter", "radialventilator k\xFCche"] },
      { slug: "lueftung-zubehoer", taxonomySub: "haube-zubehoer", name: "Regler & Zubeh\xF6r", h1: "Drehzahlregler, Schaltk\xE4sten & Beleuchtung", title: "L\xFCftung Zubeh\xF6r \u2013 Drehzahlregler, Schaltkasten", description: "Drehzahlregler, Schaltk\xE4sten, Haubenbeleuchtung und Montagezubeh\xF6r f\xFCr Gastro-Abzugshauben.", keywords: ["drehzahlregler abluft", "schaltkasten dunstabzug"], published: false }
    ]
  },
  // ── 7. Lebensmittelverarbeitung ───────────────────────────────────────────
  {
    slug: "lebensmittelverarbeitung",
    taxonomyCat: "dynamic_prep",
    name: "Lebensmittelverarbeitung",
    h1: "Lebensmittelverarbeitung & Vorbereitungsger\xE4te",
    title: "Vorbereitungsger\xE4te Gastro \u2013 Vakuumierer, Fleischwolf, Schneidemaschinen",
    description: "Ger\xE4te zur Lebensmittelverarbeitung: Vakuumiermaschinen, Fleischw\xF6lfe, Aufschnittmaschinen, Gem\xFCseschneider, Cutter, Stabmixer und K\xFCchenmaschinen f\xFCr Gastronomie und Metzgerei. Netto-Preise, Lieferung deutschlandweit.",
    intro: "Vorbereitung ist Zeit: Gem\xFCseschneider, Aufschnittmaschinen, Fleischw\xF6lfe und Vakuumierer ersetzen Stunden Handarbeit und liefern gleichm\xE4\xDFige Ergebnisse. 2MC Gastro f\xFChrt \xFCber 350 Ger\xE4te f\xFCr K\xFCche, Metzgerei und Catering \u2013 vom 250-Watt-Stabmixer bis zum Kammervakuumierer mit 20 m\xB3/h Pumpe.",
    sections: [
      {
        h2: "Die wichtigsten Vorbereitungsger\xE4te",
        html: ul(
          "<strong>Gem\xFCseschneider</strong> mit Wechselscheiben f\xFCr Scheiben, W\xFCrfel, Stifte und Reibe \u2013 100 bis 400 kg/h",
          "<strong>Aufschnittmaschinen</strong> mit 250\u2013350 mm Messer f\xFCr Wurst, K\xE4se und Fleisch",
          "<strong>Fleischw\xF6lfe</strong> Gr\xF6\xDFe 12, 22 und 32 mit 150\u2013500 kg/h Leistung",
          "<strong>Vakuumiermaschinen</strong> als Kammerger\xE4t f\xFCr Sous-Vide, Lagerung und Marinieren",
          "<strong>Cutter</strong> und K\xFCchenmaschinen f\xFCr Farcen, Pesto, Dips und Teige",
          "<strong>Stabmixer</strong> mit 250\u2013750 mm Mixstab f\xFCr Suppen und Saucen im Kessel"
        )
      },
      {
        h2: "Kammervakuumierer oder Balkenvakuumierer?",
        html: p(
          "Kammervakuumierer erzeugen ein echtes Vakuum von 99 % und verarbeiten auch Fl\xFCssigkeiten und Marinaden \u2013 Standard f\xFCr Sous-Vide und Cook & Chill. Balkenger\xE4te sind g\xFCnstiger, aber nur f\xFCr trockene Produkte und geringe Mengen geeignet. Achten Sie auf Pumpenleistung (m\xB3/h), Schwei\xDFbalkenl\xE4nge und Kammergr\xF6\xDFe passend zu Ihren Beuteln."
        )
      }
    ],
    faqs: [
      { q: "Welcher Fleischwolf f\xFCr eine Metzgerei?", a: "Gr\xF6\xDFe 22 (ca. 300 kg/h) ist der Standard f\xFCr Metzgereien und D\xF6nerbetriebe; Gr\xF6\xDFe 32 f\xFCr Produktion \xFCber 400 kg/h; Gr\xF6\xDFe 12 f\xFCr Restaurants mit gelegentlichem Bedarf." },
      { q: "Lohnt sich ein Gem\xFCseschneider im Restaurant?", a: "Ab etwa 20 kg Gem\xFCse am Tag amortisiert sich ein Gem\xFCseschneider innerhalb weniger Monate durch Zeitersparnis und gleichm\xE4\xDFigen Schnitt." },
      { q: "Was bedeutet 20 m\xB3/h bei einem Vakuumierer?", a: "Die Pumpenleistung: Je h\xF6her, desto schneller wird die Kammer evakuiert. 8\u201310 m\xB3/h reichen f\xFCr Restaurants, 20 m\xB3/h und mehr f\xFCr Produktion und gro\xDFe Beutel." }
    ],
    keywords: ["vakuumiermaschine gastro", "fleischwolf gastro", "gem\xFCseschneider gastro", "aufschnittmaschine", "stabmixer gastronomie", "k\xFCchenmaschine gastro"],
    ggmSlug: "lebensmittelverarbeitung",
    published: true,
    children: [
      { slug: "vakuumierer", taxonomySub: "vakuummaschinen", name: "Vakuumiermaschinen", h1: "Vakuumiermaschinen f\xFCr die Gastronomie", title: "Vakuumiermaschine Gastro kaufen \u2013 Kammervakuumierer", description: "Kammervakuumierer und Vakuumierger\xE4te f\xFCr Gastronomie und Metzgerei: 8\u201320 m\xB3/h, Schwei\xDFbalken 260\u2013420 mm, Vakuumbeutel und Zubeh\xF6r.", keywords: ["vakuumiermaschine gastro", "kammervakuumierer", "vakuumierer gastronomie", "vakuumierger\xE4t profi"] },
      { slug: "fleischwoelfe", taxonomySub: "fleischwoelfe", name: "Fleischw\xF6lfe & Wurstf\xFCller", h1: "Fleischw\xF6lfe, Wurstf\xFCller & Knochens\xE4gen", title: "Fleischwolf Gastro kaufen \u2013 Gr\xF6\xDFe 12/22/32", description: "Profi-Fleischw\xF6lfe Gr\xF6\xDFe 12, 22 und 32, Wurstf\xFCllmaschinen, Knochens\xE4gen und Fleischmischer f\xFCr Metzgerei, D\xF6nerbetrieb und Gastronomie.", keywords: ["fleischwolf gastro", "fleischwolf profi", "fleischwolf gr\xF6\xDFe 22", "wurstf\xFCller", "knochens\xE4ge"] },
      { slug: "aufschnitt-und-gemueseschneider", taxonomySub: "schneidemaschinen", name: "Schneidemaschinen", h1: "Aufschnittmaschinen, Gem\xFCseschneider & Cutter", title: "Aufschnittmaschine & Gem\xFCseschneider Gastro kaufen", description: "Aufschnittmaschinen 250\u2013350 mm, Gem\xFCseschneider mit Wechselscheiben, Cutter und Kartoffelsch\xE4lmaschinen f\xFCr die Vorbereitung.", keywords: ["aufschnittmaschine gastro", "gem\xFCseschneider gastro", "gem\xFCseschneidemaschine", "cutter gastronomie", "kartoffelsch\xE4lmaschine"] },
      { slug: "mixer-und-stabmixer", taxonomySub: "mixer", name: "Mixer & Stabmixer", h1: "Stabmixer, Standmixer & R\xFChrmaschinen", title: "Stabmixer Gastro kaufen \u2013 Profi Mixer & R\xFChrwerke", description: "Profi-Stabmixer mit 250\u2013750 mm Stab, Standmixer, Planetenr\xFChrmaschinen und Schneebesenaufs\xE4tze f\xFCr die Gastronomie.", keywords: ["stabmixer gastro", "stabmixer profi", "standmixer gastronomie", "r\xFChrmaschine gastro"] },
      { slug: "kuechenkleingeraete", taxonomySub: "dynamic-kleingeraete", name: "K\xFCchenkleinger\xE4te", h1: "K\xFCchenkleinger\xE4te f\xFCr Profis", title: "K\xFCchenkleinger\xE4te Gastro \u2013 Waagen, Reiben, Pressen", description: "Waagen, K\xE4sereiben, Zitruspressen, Zentrifugen, Messersterilisatoren und weitere Kleinger\xE4te f\xFCr die Profik\xFCche.", keywords: ["k\xFCchenwaage gastro", "k\xE4sereibe elektrisch", "zitruspresse gastro"] }
    ]
  },
  // ── 8. Ausgabe & Buffet ───────────────────────────────────────────────────
  {
    slug: "ausgabe-und-buffet",
    taxonomyCat: "self_service",
    name: "Ausgabe & Buffet",
    h1: "Speisenausgabe, Buffets & Self-Service",
    title: "Speisenausgabe & Buffet Gastro \u2013 Drop-in, Salatbar, Ausgabetheke",
    description: "Ausgabesysteme und Buffets: Drop-in-Elemente (warm, kalt, neutral), modulare Self-Service-Theken, Salatbars, Buffetinseln und Ausgabevitrinen f\xFCr Kantine, Hotel und Restaurant. Netto-Preise, Planung, Lieferung.",
    intro: "Fr\xFChst\xFCcksbuffet im Hotel, Kantinenausgabe, Salatbar im Restaurant: Ausgabesysteme pr\xE4sentieren Speisen bei sicherer Temperatur und lenken den G\xE4stefluss. 2MC Gastro bietet \xFCber 490 Elemente \u2013 Drop-in-Bain-Maries und K\xFChlwannen f\xFCr den Einbau in eigene Theken, komplette Self-Service-Module in Modulbreiten sowie Buffetinseln mit Hustenschutz und Beleuchtung.",
    sections: [
      {
        h2: "Drop-in oder komplette Theke?",
        html: p(
          "Drop-in-Elemente werden in Ihre bestehende oder vom Schreiner gefertigte Theke eingebaut: Bain-Marie mit 2\u20136 GN 1/1, K\xFChlwanne, W\xE4rmeplatte, W\xE4rmebr\xFCcke, neutrale Elemente. Komplette Self-Service-Theken aus Edelstahl kommen mit Unterbau, Tablettrutsche und Hustenschutz und werden modular aneinandergereiht. F\xFCr Kantinen und Mensen empfehlen wir Module in einheitlicher Tiefe mit Tablettrutsche auf G\xE4steseite."
        )
      },
      {
        h2: "Temperaturen an der Ausgabe",
        html: p(
          "Warmspeisen m\xFCssen an der Ausgabe mindestens 65 \xB0C halten, kalte Speisen maximal 7 \xB0C \u2013 \xFCber den gesamten Serviceverlauf. Ventilierte K\xFChlwannen und Bain-Maries mit Trocken- oder Wasserbadheizung halten die Temperatur auch bei ge\xF6ffnetem Hustenschutz. Digitale Anzeigen erleichtern die HACCP-Dokumentation an der Ausgabe."
        )
      }
    ],
    faqs: [
      { q: "Was ist ein Drop-in-Element?", a: "Ein Einbauger\xE4t (Bain-Marie, K\xFChlwanne, W\xE4rmeplatte), das von oben in eine Theke eingesetzt wird. Es erm\xF6glicht Buffets in Ihrer eigenen M\xF6beloptik." },
      { q: "Welche Temperatur muss ein Buffet halten?", a: "Warmhaltung mindestens 65 \xB0C, K\xFChlung maximal 7 \xB0C. Ger\xE4te mit Umluft halten die Temperatur auch bei Zugluft und ge\xF6ffnetem Hustenschutz." },
      { q: "Planen Sie Ausgabetheken nach Ma\xDF?", a: "Ja. Wir kombinieren Module in Standardbreiten oder lassen Theken nach Ma\xDF fertigen und stellen die Ausgabestrecke im 3D-Planer dar." }
    ],
    keywords: ["speisenausgabe", "buffet gastronomie", "salatbar gastro", "drop in bain marie", "self service theke", "ausgabetheke"],
    ggmSlug: "warmhalten",
    published: true,
    children: [
      { slug: "drop-in-elemente", taxonomySub: "drop-in", name: "Drop-in-Elemente", h1: "Drop-in Bain-Maries, K\xFChlwannen & W\xE4rmeplatten", title: "Drop-in Bain-Marie & K\xFChlwanne kaufen \u2013 Einbau-Buffet", description: "Drop-in-Elemente zum Einbau in Theken: Bain-Maries, K\xFChlwannen, W\xE4rmeplatten, W\xE4rmebr\xFCcken und neutrale Elemente in GN-Ma\xDFen.", keywords: ["drop in bain marie", "einbau k\xFChlwanne", "drop in k\xFChlwanne", "einbau w\xE4rmeplatte"] },
      { slug: "self-service-module", taxonomySub: "modulare-self", name: "Self-Service-Module", h1: "Modulare Self-Service-Theken", title: "Self-Service Theke kaufen \u2013 modulare Ausgabe Kantine", description: "Modulare Self-Service-Theken aus Edelstahl mit Tablettrutsche und Hustenschutz f\xFCr Kantine, Mensa und Hotel.", keywords: ["self service theke", "ausgabetheke kantine", "speisenausgabe modular"] },
      { slug: "buffets-und-salatbars", taxonomySub: "buffets", name: "Buffets & Salatbars", h1: "Buffetinseln & Salatbars", title: "Salatbar & Buffetinsel Gastro kaufen", description: "Salatbars, Buffetinseln und Fr\xFChst\xFCcksbuffets mit K\xFChlung, W\xE4rme oder neutral, mit Hustenschutz und Beleuchtung.", keywords: ["salatbar gastro", "buffetinsel", "fr\xFChst\xFCcksbuffet hotel", "salatbar k\xFChlung"] },
      { slug: "ausgabevitrinen", taxonomySub: "self-vitrinen", name: "Ausgabevitrinen", h1: "Ausgabevitrinen, Tapas- & Sushi-Vitrinen", title: "Ausgabevitrine Gastro kaufen \u2013 Tapas, Sushi, Snack", description: "Ausgabevitrinen f\xFCr Tapas, Sushi, Snacks und Desserts \u2013 gek\xFChlt, beheizt oder neutral, f\xFCr Theke und Buffet.", keywords: ["tapas vitrine", "sushi vitrine", "snackvitrine gastro"] }
    ]
  },
  // ── 9. Bäckereitechnik ────────────────────────────────────────────────────
  {
    slug: "baeckereitechnik",
    taxonomyCat: "bakery",
    name: "B\xE4ckereitechnik",
    h1: "B\xE4ckereitechnik: Back\xF6fen, G\xE4rschr\xE4nke & Zubeh\xF6r",
    title: "B\xE4ckereiofen & G\xE4rschrank kaufen \u2013 B\xE4ckereitechnik Gastro",
    description: "B\xE4ckereitechnik f\xFCr B\xE4ckerei, Konditorei und Backstation: B\xE4ckerei\xF6fen f\xFCr Bleche 600 \xD7 400 mm, Stikken\xF6fen, G\xE4rschr\xE4nke, Backwagen und Edelstahlm\xF6bel. Netto-Preise, Lieferung deutschlandweit.",
    intro: "B\xE4ckerei\xF6fen im Blechma\xDF 600 \xD7 400 mm, G\xE4rschr\xE4nke mit Feuchteregelung und Backwagen bilden die Aufback- und Produktionsstrecke in B\xE4ckerei, Hotelfr\xFChst\xFCck und Supermarkt-Backstation. 2MC Gastro f\xFChrt Konvektions\xF6fen mit 4 bis 16 Blechen, Etagen\xF6fen und G\xE4rschr\xE4nke von Diamond und CombiSteel.",
    sections: [
      {
        h2: "Konvektionsofen, Etagenofen oder Stikkenofen?",
        html: p(
          "Konvektions\xF6fen (Hei\xDFluft mit Dampfzugabe) f\xFCr 4\u201310 Bleche sind die flexible L\xF6sung f\xFCr Aufbackstationen und kleine B\xE4ckereien. Etagen\xF6fen mit Steinplatte und separater Ober-/Unterhitze backen Brot und Br\xF6tchen traditionell. Stikken\xF6fen nehmen komplette Backwagen mit 15\u201318 Blechen auf und sind der Produktionsstandard. G\xE4rschr\xE4nke halten Teiglinge bei 30\u201335 \xB0C und 80 % Luftfeuchte \u2013 als Unterbau unter dem Ofen oder als separater Schrank."
        )
      }
    ],
    faqs: [
      { q: "Welches Blechma\xDF ist B\xE4ckerei-Standard?", a: "600 \xD7 400 mm (Euronorm). Gastronomie-Kombid\xE4mpfer nutzen dagegen GN 1/1 (530 \xD7 325 mm) \u2013 achten Sie beim Kauf auf das richtige Einschubma\xDF." },
      { q: "Brauche ich einen G\xE4rschrank?", a: "F\xFCr Hefeteige ja: Ein G\xE4rschrank mit Feuchteregelung sorgt f\xFCr gleichm\xE4\xDFige Gare und planbare Backzeiten, besonders bei tiefgek\xFChlten Teiglingen." }
    ],
    keywords: ["b\xE4ckereiofen", "b\xE4ckerei ausstattung", "g\xE4rschrank", "stikkenofen", "backofen b\xE4ckerei 600x400", "konvektionsofen b\xE4ckerei"],
    published: true,
    children: [
      { slug: "baeckereioefen", taxonomySub: "baeckereioefen", name: "B\xE4ckerei\xF6fen", h1: "B\xE4ckerei\xF6fen & Backstationen", title: "B\xE4ckereiofen kaufen \u2013 Konvektions- & Etagen\xF6fen 600\xD7400", description: "B\xE4ckerei\xF6fen f\xFCr Bleche 600 \xD7 400 mm: Konvektions\xF6fen 4\u201316 Bleche, Etagen\xF6fen mit Steinplatte, Stikken\xF6fen und Backstationen.", keywords: ["b\xE4ckereiofen", "backofen b\xE4ckerei", "etagenofen", "stikkenofen", "aufbackofen gastro"] },
      { slug: "gaerschraenke", taxonomySub: "gaerschraenke", name: "G\xE4rschr\xE4nke", h1: "G\xE4rschr\xE4nke & G\xE4runterbauten", title: "G\xE4rschrank kaufen \u2013 Feuchteregelung, 600\xD7400", description: "G\xE4rschr\xE4nke und G\xE4runterbauten mit Temperatur- und Feuchteregelung f\xFCr 8\u201316 Bleche 600 \xD7 400 mm.", keywords: ["g\xE4rschrank", "g\xE4rschrank b\xE4ckerei", "g\xE4runterbau"] },
      { slug: "baeckerei-edelstahlmoebel", taxonomySub: "bakery-moebel", name: "B\xE4ckerei-Edelstahlm\xF6bel", h1: "Edelstahlm\xF6bel f\xFCr die B\xE4ckerei", title: "B\xE4ckerei Edelstahlm\xF6bel \u2013 Backwagen, Blechregale", description: "Backwagen, Blechregale, Arbeitstische und Schr\xE4nke im Ma\xDF 600 \xD7 400 mm f\xFCr B\xE4ckerei und Konditorei.", keywords: ["backwagen", "blechregal 600x400", "b\xE4ckerei arbeitstisch"], published: false }
    ]
  },
  // ── 10. Cook & Chill ──────────────────────────────────────────────────────
  {
    slug: "cook-and-chill",
    taxonomyCat: "cook_chill",
    name: "Cook & Chill",
    h1: "Cook & Chill Systeme: Kombid\xE4mpfer + Schockfroster",
    title: "Cook & Chill System kaufen \u2013 Kombid\xE4mpfer & Schockfroster",
    description: "Cook & Chill Systeme f\xFCr Gro\xDFk\xFCche, Catering und Gemeinschaftsverpflegung: aufeinander abgestimmte Kombid\xE4mpfer und Schockfroster mit Hordenwagen, 10\u201320 GN. Netto-Preise, Beratung, Lieferung.",
    intro: "Cook & Chill trennt Produktion und Ausgabe: Speisen werden im Kombid\xE4mpfer gegart, im Schockfroster innerhalb von 90 Minuten auf +3 \xB0C gek\xFChlt, gelagert und bei Bedarf regeneriert. Das spart Personal in Sto\xDFzeiten, sichert Qualit\xE4t und erf\xFCllt HACCP. 2MC Gastro liefert abgestimmte Systeme mit gemeinsamen Hordenwagen f\xFCr 10 und 20 GN.",
    sections: [
      {
        h2: "So funktioniert Cook & Chill",
        html: p(
          "Garen (Kombid\xE4mpfer) \u2192 Schnellk\xFChlen (+70 \xB0C auf +3 \xB0C in \u2264 90 Minuten) \u2192 Lagern bei 0\u20133 \xB0C bis zu 5 Tage \u2192 Regenerieren (Kombid\xE4mpfer oder Regenerierofen) \u2192 Ausgabe. F\xFCr Tiefk\xFChlung wird auf \u221218 \xB0C schockgefrostet (Cook & Freeze). Hordenwagen wechseln zwischen den Ger\xE4ten ohne Umladen \u2013 Voraussetzung ist ein gemeinsames GN-Raster und passende Wagenaufnahmen."
        )
      }
    ],
    faqs: [
      { q: "F\xFCr welche Betriebe lohnt sich Cook & Chill?", a: "F\xFCr Kantinen, Krankenh\xE4user, Pflegeheime, Caterer und Hotels mit Bankettgesch\xE4ft \u2013 \xFCberall, wo gro\xDFe Mengen vorproduziert und zeitversetzt ausgegeben werden." },
      { q: "Wie lange darf Cook-&-Chill-Ware gelagert werden?", a: "Nach DIN 10536 bei 0 bis +3 \xB0C in der Regel bis zu 5 Tage inklusive Produktions- und Verzehrtag." }
    ],
    keywords: ["cook and chill", "cook & chill system", "schockfroster kombid\xE4mpfer", "cook chill gro\xDFk\xFCche"],
    published: true,
    children: [
      { slug: "kombidaempfer", taxonomySub: "cc-kombidaempfer", name: "Cook & Chill Kombid\xE4mpfer", h1: "Kombid\xE4mpfer f\xFCr Cook & Chill Systeme", title: "Cook & Chill Kombid\xE4mpfer \u2013 10 & 20 GN mit Hordenwagen", description: "Kombid\xE4mpfer mit 10 und 20 GN f\xFCr Cook & Chill, mit Hordenwagen-Aufnahme und Kerntemperaturf\xFChler.", keywords: ["kombid\xE4mpfer hordenwagen", "kombid\xE4mpfer 20 gn"] },
      { slug: "schockfroster", taxonomySub: "cc-schockfroster", name: "Cook & Chill Schockfroster", h1: "Schockfroster f\xFCr Cook & Chill Systeme", title: "Schockfroster mit Hordenwagen \u2013 10 & 20 GN", description: "Schockfroster und Schnellk\xFChler mit Hordenwagen-Einfahrt f\xFCr 10 und 20 GN, abgestimmt auf Kombid\xE4mpfer.", keywords: ["schockfroster hordenwagen", "schnellk\xFChler 20 gn"] },
      { slug: "zubehoer", taxonomySub: "cc-zubehoer", name: "Hordenwagen & Zubeh\xF6r", h1: "Hordenwagen & Cook & Chill Zubeh\xF6r", title: "Hordenwagen kaufen \u2013 10/20 GN f\xFCr Kombid\xE4mpfer", description: "Hordenwagen, Bankettwagen und Zubeh\xF6r f\xFCr Cook & Chill Systeme.", keywords: ["hordenwagen", "hordenwagen kombid\xE4mpfer"], published: false }
    ]
  },
  // ── 11. Kaffee & Bar ──────────────────────────────────────────────────────
  {
    slug: "kaffee-und-bar",
    taxonomyCat: "coffee_tea",
    name: "Kaffee & Bar",
    h1: "Kaffeemaschinen & Bartechnik f\xFCr die Gastronomie",
    title: "Gastro Kaffeemaschine kaufen \u2013 Siebtr\xE4ger, Vollautomat, Bar",
    description: "Kaffee- und Bartechnik: Siebtr\xE4germaschinen, Kaffeevollautomaten, Filterkaffeemaschinen, Kaffeem\xFChlen, Saftpressen, Barmixer, Cr\xEApes- und Waffeleisen. Netto-Preise, Lieferung deutschlandweit.",
    intro: "Kaffee ist die margenst\xE4rkste Position auf fast jeder Karte. Ob Siebtr\xE4germaschine mit zwei Br\xFChgruppen f\xFCr das Caf\xE9, Vollautomat f\xFCr Hotelfr\xFChst\xFCck und B\xFCro oder Filtermaschine f\xFCr die Kantine \u2013 2MC Gastro f\xFChrt Kaffeemaschinen, M\xFChlen, Milchaufsch\xE4umer sowie Bartechnik von der Zitruspresse bis zum Cr\xEApes-Ger\xE4t.",
    sections: [
      {
        h2: "Siebtr\xE4ger, Vollautomat oder Filter?",
        html: p(
          "Siebtr\xE4germaschinen (1\u20133 Br\xFChgruppen) liefern die beste Espressoqualit\xE4t und geh\xF6ren in Caf\xE9 und Bar; sie brauchen geschultes Personal und eine separate M\xFChle. Vollautomaten mahlen, br\xFChen und sch\xE4umen auf Knopfdruck \u2013 ideal f\xFCr Hotel, B\xFCro und Selbstbedienung mit 100\u2013300 Tassen am Tag. Filterkaffeemaschinen mit Glaskannen oder Isolierkannen versorgen Kantinen, Tagungen und Fr\xFChst\xFCcksbuffets mit gro\xDFen Mengen.",
          "Achten Sie auf Festwasseranschluss (bei \xFCber 50 Tassen/Tag), Boilergr\xF6\xDFe und Wasserfilter \u2013 Kalk ist die h\xE4ufigste Ausfallursache."
        )
      }
    ],
    faqs: [
      { q: "Welche Kaffeemaschine f\xFCr ein Caf\xE9 mit 200 Tassen am Tag?", a: "Eine 2-gruppige Siebtr\xE4germaschine mit Festwasseranschluss und eine Profi-M\xFChle. F\xFCr Milchgetr\xE4nke empfiehlt sich ein zus\xE4tzlicher Dampfhahn oder ein Milchaufsch\xE4umer." },
      { q: "Brauche ich einen Wasserfilter?", a: "Ja, bei Wasserh\xE4rte \xFCber 7 \xB0dH unbedingt. Ein Filter sch\xFCtzt Boiler und Ventile und verbessert den Geschmack; die Kartusche wird alle 3\u20136 Monate gewechselt." }
    ],
    keywords: ["gastro kaffeemaschine", "siebtr\xE4germaschine gastro", "kaffeevollautomat gastronomie", "kaffeemaschine gastronomie", "bartechnik"],
    ggmSlug: "cafe-eis-und-waffel",
    published: true,
    children: [
      { slug: "kaffeemaschinen", taxonomySub: "kaffeemaschinen", name: "Kaffeemaschinen", h1: "Gastro Kaffeemaschinen: Siebtr\xE4ger, Vollautomat, Filter", title: "Gastro Kaffeemaschine kaufen \u2013 Siebtr\xE4ger & Vollautomat", description: "Siebtr\xE4germaschinen mit 1\u20133 Br\xFChgruppen, Kaffeevollautomaten, Filterkaffeemaschinen, Kaffeem\xFChlen und Milchaufsch\xE4umer f\xFCr Caf\xE9, Hotel und Kantine.", keywords: ["gastro kaffeemaschine", "siebtr\xE4germaschine", "kaffeevollautomat gastro", "filterkaffeemaschine gastronomie", "kaffeem\xFChle gastro"] },
      { slug: "crepes-und-waffeleisen", taxonomySub: "crepes-waffeln", name: "Cr\xEApes & Waffeln", h1: "Cr\xEApes-Ger\xE4te & Waffeleisen", title: "Waffeleisen & Cr\xEApes Ger\xE4t Gastro kaufen", description: "Profi-Waffeleisen (rund, eckig, belgisch), Cr\xEApes-Ger\xE4te und Bubble-Waffle-Eisen f\xFCr Caf\xE9, Eisdiele und Weihnachtsmarkt.", keywords: ["waffeleisen gastro", "crepes ger\xE4t gastro", "crepes platte", "waffeleisen profi"] },
      { slug: "saftpressen-und-barmixer", taxonomySub: "saefte-mixer", name: "Saftpressen & Barmixer", h1: "Saftpressen, Barmixer & Zentrifugen", title: "Saftpresse & Barmixer Gastro kaufen", description: "Elektrische Zitruspressen, Orangenpressen, Entsafter, Barmixer und Zentrifugen f\xFCr Bar, Caf\xE9 und Saftbar.", keywords: ["saftpresse gastro", "orangenpresse gastro", "barmixer profi", "entsafter gastronomie"] },
      { slug: "kuchenvitrinen", taxonomySub: "coffee-vitrinen", name: "Kuchen- & W\xE4rmevitrinen", h1: "Kuchenvitrinen & W\xE4rmevitrinen f\xFCr das Caf\xE9", title: "Kuchenvitrine Caf\xE9 kaufen \u2013 gek\xFChlt & neutral", description: "Kuchenvitrinen, Panoramavitrinen und W\xE4rmevitrinen f\xFCr Caf\xE9, B\xE4ckerei und Bar.", keywords: ["kuchenvitrine", "w\xE4rmevitrine gastro", "panoramavitrine"] }
    ]
  },
  // ── 12. Eismaschinen & Eisvitrinen ────────────────────────────────────────
  {
    slug: "eismaschinen-und-eisvitrinen",
    taxonomyCat: "ice_cream",
    name: "Eismaschinen & Eisvitrinen",
    h1: "Eismaschinen & Eisvitrinen f\xFCr Eisdiele und Gastronomie",
    title: "Eismaschine & Eisvitrine kaufen \u2013 Softeis, Speiseeis, Eistheke",
    description: "Eismaschinen und Eisvitrinen: Speiseeismaschinen, Softeismaschinen, Pasteurisierer, Eistheken mit 6\u201324 Beh\xE4ltern, Sahnemaschinen und Zubeh\xF6r f\xFCr Eisdiele und Gastronomie. Netto-Preise, Lieferung.",
    intro: "Von der Eistheke mit 12 Beh\xE4ltern bis zur Softeismaschine f\xFCr den Imbiss: 2MC Gastro f\xFChrt Eismaschinen und Eisvitrinen f\xFCr Eisdiele, Caf\xE9, Hotel und Restaurant \u2013 inklusive Pasteurisierern, Sahnemaschinen und Eisbeh\xE4ltern in Standardma\xDFen.",
    sections: [
      {
        h2: "Speiseeismaschine oder Softeismaschine?",
        html: p(
          "Speiseeismaschinen (Batch Freezer) produzieren handwerkliches Eis in Chargen von 2\u201310 Litern f\xFCr die Eistheke. Softeismaschinen geben pasteurisierten Mix als Softeis direkt aus \u2013 1 bis 3 Sorten, mit Nachtk\xFChlung f\xFCr hygienische Lagerung. Eisvitrinen (statisch oder ventiliert) halten \u221214 bis \u221218 \xB0C; ventilierte Vitrinen sind unempfindlicher gegen Umgebungstemperatur."
        )
      }
    ],
    faqs: [
      { q: "Wie viele Beh\xE4lter sollte eine Eistheke haben?", a: "Kleine Eisdielen starten mit 12 Beh\xE4ltern (5 Liter), gr\xF6\xDFere mit 18\u201324. Rechnen Sie ca. 1 Beh\xE4lter pro Sorte plus 2 Reserve." },
      { q: "Was kostet eine Softeismaschine f\xFCr den Imbiss?", a: "Tischger\xE4te mit 1\u20132 Sorten beginnen im unteren vierstelligen Bereich; Standger\xE4te mit 3 Sorten und Nachtk\xFChlung liegen deutlich dar\xFCber. Alle Preise netto zzgl. MwSt." }
    ],
    keywords: ["eismaschine gastro", "softeismaschine", "eisvitrine", "eistheke", "speiseeismaschine", "eisdiele ausstattung"],
    ggmSlug: "cafe-eis-und-waffel",
    published: true,
    children: [
      { slug: "eisvitrinen", taxonomySub: "ice-theken", name: "Eisvitrinen & Eistheken", h1: "Eisvitrinen & Eistheken", title: "Eisvitrine kaufen \u2013 Eistheke 6\u201324 Beh\xE4lter", description: "Eisvitrinen und Eistheken mit 6 bis 24 Beh\xE4ltern, statisch oder ventiliert, gerade oder gebogene Scheibe, f\xFCr Eisdiele und Caf\xE9.", keywords: ["eisvitrine", "eistheke", "eisvitrine 12 beh\xE4lter", "eistheke kaufen"] },
      { slug: "eismaschinen", taxonomySub: "ice-maschinen", name: "Eismaschinen", h1: "Eismaschinen, Softeismaschinen & Pasteurisierer", title: "Eismaschine & Softeismaschine kaufen \u2013 Profi", description: "Speiseeismaschinen, Softeismaschinen 1\u20133 Sorten, Pasteurisierer und Sahnemaschinen f\xFCr Eisdiele und Gastronomie.", keywords: ["eismaschine profi", "softeismaschine", "speiseeismaschine", "pasteurisierer eis", "sahnemaschine"] },
      { slug: "eis-zubehoer", taxonomySub: "ice-zubehoer", name: "Eisbeh\xE4lter & Zubeh\xF6r", h1: "Eisbeh\xE4lter, Portionierer & Zubeh\xF6r", title: "Eisbeh\xE4lter & Eisportionierer kaufen", description: "Eisbeh\xE4lter 5 Liter, Eisportionierer, Waffelhalter und Zubeh\xF6r f\xFCr die Eistheke.", keywords: ["eisbeh\xE4lter 5 liter", "eisportionierer", "eisdiele zubeh\xF6r"], published: false }
    ]
  },
  // ── 13. Wäschereitechnik ──────────────────────────────────────────────────
  {
    slug: "waeschereitechnik",
    taxonomyCat: "laundry",
    name: "W\xE4schereitechnik",
    h1: "Gewerbliche W\xE4schereitechnik f\xFCr Hotel & Gastronomie",
    title: "Gewerbliche Waschmaschine kaufen \u2013 Hotel, Gastronomie, Pflege",
    description: "Gewerbliche Waschmaschinen 6\u201330 kg, W\xE4schetrockner, Mangeln und B\xFCgelstationen f\xFCr Hotel, Gastronomie, Pflegeheim und W\xE4scherei. Netto-Preise, Lieferung deutschlandweit.",
    intro: "Tischw\xE4sche, K\xFCchentextilien, Hotelbettw\xE4sche: Wer t\xE4glich w\xE4scht, braucht Industriemaschinen mit kurzen Programmen, hoher Schleuderdrehzahl und Dauerlaufmotoren. 2MC Gastro liefert gewerbliche Waschmaschinen von 6 bis 30 kg F\xFCllmenge, Ablufttrockner, Muldenmangeln und B\xFCgelstationen \u2013 ein Sortiment, das viele Gastro-H\xE4ndler nicht f\xFChren.",
    sections: [
      {
        h2: "Gewerblich oder Haushaltsger\xE4t?",
        html: p(
          "Haushaltswaschmaschinen sind f\xFCr ca. 5 Zyklen pro Woche gebaut; im Hotel laufen Maschinen 5\u201310 Zyklen am Tag. Gewerbliche Ger\xE4te haben verst\xE4rkte Lager, Edelstahltrommeln, Schleuderdrehzahlen bis 1.200 U/min (k\xFCrzere Trocknungszeit) und Programme von 30\u201345 Minuten. Achten Sie auf F\xFCllmenge in kg Trockenw\xE4sche, Anschluss (230 V / 400 V) und ob eine Ablaufpumpe oder ein Schwerkraftablauf n\xF6tig ist."
        )
      }
    ],
    faqs: [
      { q: "Welche F\xFCllmenge brauche ich f\xFCr ein Hotel mit 30 Zimmern?", a: "Rechnen Sie ca. 2\u20133 kg W\xE4sche pro Zimmer und Tag: bei 30 Zimmern 60\u201390 kg t\xE4glich, also eine 10\u201313-kg-Maschine mit 6\u20138 Zyklen oder zwei Maschinen." },
      { q: "Kann ich einen gewerblichen Trockner ohne Abluft betreiben?", a: "Ja, als Kondensations- oder W\xE4rmepumpentrockner. Ablufttrockner sind schneller und g\xFCnstiger, brauchen aber einen Abluftkanal." }
    ],
    keywords: ["gewerbliche waschmaschine", "industriewaschmaschine", "waschmaschine gastronomie", "hotel waschmaschine", "gewerblicher trockner", "mangel gewerblich"],
    published: true,
    children: [
      { slug: "gewerbliche-waschmaschinen", taxonomySub: "waschmaschinen", name: "Waschmaschinen", h1: "Gewerbliche Waschmaschinen 6\u201330 kg", title: "Gewerbliche Waschmaschine kaufen \u2013 6 bis 30 kg", description: "Gewerbliche Waschmaschinen mit 6 bis 30 kg F\xFCllmenge, Edelstahltrommel, bis 1.200 U/min, f\xFCr Hotel, Gastronomie und Pflege.", keywords: ["gewerbliche waschmaschine", "industriewaschmaschine 10 kg", "waschmaschine hotel", "waschschleudermaschine"] },
      { slug: "waeschetrockner", taxonomySub: "trockner", name: "Trockner", h1: "Gewerbliche W\xE4schetrockner", title: "Gewerblicher Trockner kaufen \u2013 Abluft & W\xE4rmepumpe", description: "Gewerbliche W\xE4schetrockner als Abluft-, Kondensations- oder W\xE4rmepumpentrockner mit 6\u201330 kg F\xFCllmenge.", keywords: ["gewerblicher trockner", "industrietrockner", "ablufttrockner gewerblich"] },
      { slug: "mangeln-und-buegelstationen", taxonomySub: "mangel-buegeln", name: "Mangeln & B\xFCgeln", h1: "Muldenmangeln & B\xFCgelstationen", title: "Mangel gewerblich kaufen \u2013 Muldenmangel, B\xFCgelstation", description: "Muldenmangeln, B\xFCgelstationen und Dampfb\xFCgeleisen f\xFCr Hotel- und Gastronomiew\xE4sche.", keywords: ["muldenmangel", "mangel gewerblich", "b\xFCgelstation profi"] }
    ]
  },
  // ── 14. GN-Behälter & Wagen ───────────────────────────────────────────────
  {
    slug: "gn-behaelter-und-wagen",
    taxonomyCat: "trolley_gn",
    name: "GN-Beh\xE4lter & Wagen",
    h1: "GN-Beh\xE4lter, Transportwagen & Thermoboxen",
    title: "GN Beh\xE4lter & Transportwagen Gastro kaufen",
    description: "Gastronorm-Beh\xE4lter GN 1/1 bis 1/9 aus Edelstahl und Polycarbonat, Deckel, Hordenwagen, Servierwagen, Tablettwagen und Thermoboxen f\xFCr K\xFCche und Catering. Netto-Preise, schnelle Lieferung.",
    intro: "Das Gastronorm-System (GN) ist das Ma\xDFraster der Profik\xFCche: GN 1/1 = 530 \xD7 325 mm, teilbar in 1/2, 1/3, 1/4, 1/6 und 1/9. Beh\xE4lter, Kombid\xE4mpfer, K\xFChltische und Bain-Maries greifen ineinander. 2MC Gastro liefert GN-Beh\xE4lter in Edelstahl und Polycarbonat, Deckel, Eins\xE4tze sowie Wagen f\xFCr Transport und Lagerung.",
    sections: [
      {
        h2: "GN-Ma\xDFe im \xDCberblick",
        html: ul(
          "GN 2/1: 650 \xD7 530 mm \xB7 GN 1/1: 530 \xD7 325 mm \xB7 GN 1/2: 325 \xD7 265 mm",
          "GN 1/3: 325 \xD7 176 mm \xB7 GN 1/4: 265 \xD7 162 mm \xB7 GN 1/6: 176 \xD7 162 mm \xB7 GN 1/9: 176 \xD7 108 mm",
          "Tiefen: 20, 40, 65, 100, 150, 200 mm \u2013 Volumen bei GN 1/1 von 2,5 bis 28 Liter"
        )
      }
    ],
    faqs: [
      { q: "Edelstahl oder Polycarbonat GN-Beh\xE4lter?", a: "Edelstahl f\xFCr Kombid\xE4mpfer, Bain-Marie und Ofen (hitzebest\xE4ndig); Polycarbonat (transparent, bis 100 \xB0C) f\xFCr K\xFChlung, Lagerung und Saladetten \u2013 leichter und Inhalt sichtbar." },
      { q: "Wie tief sollte ein GN-Beh\xE4lter im Kombid\xE4mpfer sein?", a: "F\xFCr Gem\xFCse und Beilagen 65 mm, f\xFCr Braten und Schmorgerichte 100 mm; 20\u201340 mm f\xFCr Backwaren und Gratins." }
    ],
    keywords: ["gn beh\xE4lter", "gastronorm beh\xE4lter", "gn beh\xE4lter edelstahl", "gn beh\xE4lter ma\xDFe", "servierwagen gastro", "thermobox gastro"],
    ggmSlug: "kuechenhelfer",
    published: true,
    children: [
      { slug: "gn-behaelter", taxonomySub: "gn-behaelter", name: "GN-Beh\xE4lter", h1: "Gastronorm-Beh\xE4lter GN 1/1 bis 1/9", title: "GN Beh\xE4lter kaufen \u2013 Edelstahl & Polycarbonat, alle Gr\xF6\xDFen", description: "GN-Beh\xE4lter GN 2/1 bis 1/9 aus Edelstahl und Polycarbonat, 20\u2013200 mm tief, mit Deckeln, Griffen und Eins\xE4tzen.", keywords: ["gn beh\xE4lter", "gn beh\xE4lter 1/1", "gastronorm beh\xE4lter edelstahl", "gn beh\xE4lter deckel", "gn beh\xE4lter polycarbonat"] },
      { slug: "transportwagen", taxonomySub: "wagen", name: "Transportwagen", h1: "Servierwagen, Hordenwagen & Tablettwagen", title: "Servierwagen & Hordenwagen Gastro kaufen", description: "Servierwagen, Hordenwagen f\xFCr GN und 600 \xD7 400, Tablettwagen, Tellerstapler und Thermoboxen f\xFCr K\xFCche und Catering.", keywords: ["servierwagen gastro", "hordenwagen", "tablettwagen", "transportwagen k\xFCche", "thermobox catering"] }
    ]
  },
  // ── 15. Hotelbedarf ───────────────────────────────────────────────────────
  {
    slug: "hotelbedarf",
    taxonomyCat: "hospitality",
    name: "Hotelbedarf",
    h1: "Hotelbedarf: Roomservice, Fr\xFChst\xFCck & Housekeeping",
    title: "Hotelbedarf kaufen \u2013 Roomservice-Wagen, Fr\xFChst\xFCcksbuffet",
    description: "Hotelausstattung f\xFCr Roomservice, Fr\xFChst\xFCck und Housekeeping: Servierwagen, Zimmerservice-Wagen, Fr\xFChst\xFCcksbuffet-Elemente, Minibar-K\xFChlschr\xE4nke und W\xE4schewagen. Netto-Preise, Lieferung.",
    intro: "Vom Fr\xFChst\xFCcksbuffet bis zum Zimmerservice: 2MC Gastro f\xFChrt Hotelbedarf, den klassische Gastro-H\xE4ndler selten abdecken \u2013 Roomservice-Wagen mit Warmhaltefach, Fr\xFChst\xFCcksbuffet-Module, Minibar-K\xFChlschr\xE4nke, W\xE4sche- und Housekeeping-Wagen. Kombinieren Sie mit W\xE4schereitechnik und Kaffeevollautomaten zur kompletten Hotelausstattung.",
    sections: [
      {
        h2: "Hotelfr\xFChst\xFCck planen",
        html: p(
          "Ein Fr\xFChst\xFCcksbuffet f\xFCr 50\u2013100 G\xE4ste braucht gek\xFChlte Elemente f\xFCr Aufschnitt, K\xE4se und Joghurt (max. 7 \xB0C), Warmhaltung f\xFCr Eier und Speck (min. 65 \xB0C), einen Kaffeevollautomaten mit 200+ Tassen Tagesleistung, Saftdispenser und Toaster mit Durchlauf. Wir stellen das Buffet aus Drop-in-Elementen oder Modulen zusammen und planen es im 3D-Planer in Ihren Fr\xFChst\xFCcksraum."
        )
      }
    ],
    faqs: [
      { q: "Welche Ausstattung braucht ein Hotelfr\xFChst\xFCck f\xFCr 80 G\xE4ste?", a: "Gek\xFChlte Buffetelemente (2\u20133 GN 1/1), Warmhalte-Bain-Marie (2 GN 1/1), Kaffeevollautomat mit Festwasser, Saftdispenser, Durchlauftoaster, Eierkocher und ausreichend Geschirrwagen." }
    ],
    keywords: ["hotelbedarf", "hotelausstattung", "roomservice wagen", "zimmerservice wagen", "fr\xFChst\xFCcksbuffet hotel", "minibar k\xFChlschrank"],
    published: true,
    children: [
      { slug: "roomservice-wagen", taxonomySub: "room-service", name: "Roomservice & Wagen", h1: "Roomservice-Wagen & Housekeeping-Wagen", title: "Roomservice Wagen kaufen \u2013 Zimmerservice, Housekeeping", description: "Roomservice-Wagen mit Warmhaltefach, Housekeeping-Wagen, W\xE4schewagen und Kofferwagen f\xFCr Hotels.", keywords: ["roomservice wagen", "zimmerservice wagen", "housekeeping wagen", "hotelwagen"] },
      { slug: "fruehstuecksservice", taxonomySub: "fruehstueck", name: "Fr\xFChst\xFCcksservice", h1: "Fr\xFChst\xFCcksbuffet & Fr\xFChst\xFCcksservice", title: "Fr\xFChst\xFCcksbuffet Hotel kaufen \u2013 Buffetmodule", description: "Fr\xFChst\xFCcksbuffet-Module, Eierkocher, Durchlauftoaster, Saftdispenser und Buffetzubeh\xF6r f\xFCr Hotels und Pensionen.", keywords: ["fr\xFChst\xFCcksbuffet hotel", "fr\xFChst\xFCcksservice hotel", "buffetmodul fr\xFChst\xFCck"] }
    ]
  },
  // ── 16. Reinigungsmittel (klein — noindex bis Sortiment wächst) ──────────
  {
    slug: "reinigungsmittel",
    taxonomyCat: "cleaning_products",
    name: "Reinigungsmittel",
    h1: "Reinigungsmittel f\xFCr die Gastronomie",
    title: "Gastro Reinigungsmittel \u2013 Sp\xFClmaschinenreiniger, Klarsp\xFCler",
    description: "Reinigungsmittel f\xFCr gewerbliche K\xFCchen: Sp\xFClmaschinenreiniger, Klarsp\xFCler, Kombid\xE4mpfer-Reiniger, Fettl\xF6ser und Hygieneprodukte.",
    intro: "Professionelle Reiniger f\xFCr Sp\xFClmaschine, Kombid\xE4mpfer und Edelstahlfl\xE4chen \u2013 abgestimmt auf gewerbliche Dosieranlagen.",
    sections: [],
    faqs: [],
    keywords: ["sp\xFClmaschinenreiniger gastro", "klarsp\xFCler gewerblich", "kombid\xE4mpfer reiniger"],
    published: false,
    children: []
  }
];
var _bySlug = new Map(CATEGORY_TREE.map((c) => [c.slug, c]));
var _byTax = new Map(CATEGORY_TREE.map((c) => [c.taxonomyCat, c]));
function findCategory(slug) {
  return _bySlug.get(slug);
}
function findSubcategory(catSlug, subSlug) {
  return _bySlug.get(catSlug)?.children.find((s) => s.slug === subSlug);
}

// src/content/seo/brands.de.ts
var p2 = (...paras) => paras.map((x) => `<p>${x}</p>`).join("");
var BRANDS_DE = [
  {
    slug: "diamond",
    name: "Diamond",
    brandKeys: ["diamond", "01-diverso", "diverso", "02-diamond silver", "03-diamond gold", "04-diamond platinum"],
    source: "diamond",
    country: "Belgien",
    website: "https://www.diamond-europe.com",
    h1: "Diamond Gastroger\xE4te \u2013 Kochtechnik, K\xFChlung & Edelstahl aus Belgien",
    title: "Diamond Gastro Ger\xE4te kaufen \u2013 H\xE4ndler Deutschland",
    description: "Diamond Europe Gro\xDFk\xFCchentechnik: Serie 600/700/900 Kochger\xE4te, Kombid\xE4mpfer, K\xFChltechnik, Sp\xFCltechnik und Edelstahlm\xF6bel. \xDCber 6.900 Diamond-Produkte netto bei 2MC Gastro, Lieferung in ganz Deutschland.",
    intro: "Diamond Europe aus Belgien ist einer der gro\xDFen europ\xE4ischen Hersteller f\xFCr professionelle K\xFCchentechnik. Das Programm reicht von modularen Kochzeilen der Serien 600, 700 und 900 \xFCber Kombid\xE4mpfer, K\xFChlschr\xE4nke und K\xFChltische bis zu Sp\xFClmaschinen, Pizza\xF6fen und Edelstahlm\xF6beln. 2MC Gastro f\xFChrt \xFCber 6.900 Diamond-Artikel in den Qualit\xE4tslinien Diverso, Silver, Gold und Platinum \u2013 mit deutschen Produktdaten, Netto-Preisen und Lieferung aus dem Zentrallager.",
    sections: [
      {
        h2: "Diamond Qualit\xE4tslinien: Diverso, Silver, Gold, Platinum",
        html: p2(
          "<strong>Diverso</strong> ist die Einstiegslinie f\xFCr Imbiss, Bistro und Start-ups: solide Ger\xE4te zum g\xFCnstigen Preis. <strong>Silver</strong> ist das breite Standardsortiment f\xFCr Restaurants \u2013 K\xFChlschr\xE4nke, K\xFChltische, Fritteusen, Sp\xFClmaschinen. <strong>Gold</strong> umfasst die modularen Kochserien 700 und 900 sowie Kombid\xE4mpfer und K\xFChlzellen f\xFCr den Dauerbetrieb. <strong>Platinum</strong> steht f\xFCr Gro\xDFk\xFCchentechnik der Serie 900+ mit Kochkesseln, Kippbratpfannen und Bandsp\xFClmaschinen."
        )
      },
      {
        h2: "Warum Diamond \xFCber 2MC Gastro?",
        html: p2(
          "Wir pflegen die Diamond-Daten t\xE4glich (Preise, Lagerbestand, Ma\xDFe, technische Daten) und stellen jedes Ger\xE4t mit deutscher Beschreibung, Anschlusswerten und 3D-Modell im K\xFCchenplaner bereit. Kochzeilen der Serien 700 und 900 planen wir modulweise \u2013 inklusive Untergestellen, Neutralelementen und Abzugshaube."
        )
      }
    ],
    subBrands: [
      { name: "Diverso", note: "Einstiegslinie \u2013 Imbiss, Bistro, Start-up" },
      { name: "Diamond Silver", note: "Standardsortiment Restaurant" },
      { name: "Diamond Gold", note: "Modulare Kochserien 700/900, Kombid\xE4mpfer" },
      { name: "Diamond Platinum", note: "Gro\xDFk\xFCchentechnik Serie 900+" }
    ],
    faqs: [
      { q: "Woher kommt Diamond?", a: "Diamond Europe hat seinen Sitz in Belgien und beliefert Fachh\xE4ndler in ganz Europa. 2MC Gastro ist Diamond-H\xE4ndler in Deutschland mit Sitz in K\xF6ln." },
      { q: "Gibt es Ersatzteile f\xFCr Diamond-Ger\xE4te?", a: "Ja. Ersatzteile und Zubeh\xF6r bestellen wir \xFCber den Hersteller; die passenden Zubeh\xF6rartikel sind auf jeder Produktseite verlinkt." }
    ],
    keywords: ["diamond gastro", "diamond europe", "diamond gastroger\xE4te", "diamond kombid\xE4mpfer", "diamond k\xFChlschrank", "diamond serie 700"]
  },
  {
    slug: "combisteel",
    name: "CombiSteel",
    brandKeys: ["combisteel", "c0mbisteel", "combsiteel", "cs professional", "cs budget line", "chefs heat", "giorik", "klarco", "creative kitchen", "ecofrost", "isa", "linum", "chaysol"],
    source: "combisteel",
    country: "Niederlande",
    website: "https://www.combisteel.com",
    h1: "CombiSteel Gastroger\xE4te \u2013 K\xFChltechnik, Edelstahl & Kochger\xE4te",
    title: "CombiSteel kaufen \u2013 Gastro Ger\xE4te H\xE4ndler Deutschland",
    description: "CombiSteel Gro\xDFk\xFCchentechnik aus den Niederlanden: Gastro-K\xFChlschr\xE4nke, K\xFChltische, Edelstahlm\xF6bel, Sp\xFClmaschinen, Fritteusen und Grills. \xDCber 3.500 CombiSteel-Produkte netto bei 2MC Gastro.",
    intro: "CombiSteel aus den Niederlanden steht f\xFCr ein sehr breites Sortiment zu wettbewerbsf\xE4higen Preisen: K\xFChlschr\xE4nke und K\xFChltische, Edelstahl-Arbeitstische und Regale, Fritteusen, Grillplatten, Sp\xFClmaschinen, Abzugshauben und Kleinger\xE4te. 2MC Gastro f\xFChrt \xFCber 3.500 CombiSteel-Artikel inklusive der Linien CS Professional, Budget Line, Ecofrost (K\xFChlung) und Chef\u2019s Heat (Kochger\xE4te).",
    sections: [
      {
        h2: "CombiSteel Sortiment im \xDCberblick",
        html: p2(
          "Die St\xE4rke von CombiSteel liegt in der K\xFChltechnik (Ecofrost: K\xFChlschr\xE4nke, K\xFChltische, Tiefk\xFChlschr\xE4nke mit R290) und den Edelstahlm\xF6beln (Arbeitstische, Sp\xFCltische, Regale, Wandschr\xE4nke im 100-mm-Raster). Dazu kommen Kochger\xE4te der Serien 600/700 (Chef\u2019s Heat), Sp\xFClmaschinen, Pizza\xF6fen, L\xFCftungstechnik und ein gro\xDFes Kleinger\xE4te-Programm f\xFCr Imbiss und Snackbar."
        )
      },
      {
        h2: "Preis-Leistung f\xFCr Imbiss, Restaurant und Start-up",
        html: p2(
          "CombiSteel ist die richtige Wahl, wenn Budget und Lieferzeit z\xE4hlen: viele Ger\xE4te sind ab Lager in wenigen Werktagen lieferbar. F\xFCr Neuer\xF6ffnungen kombinieren wir CombiSteel-K\xFChlung und -M\xF6bel mit Diamond-Kochtechnik zu einer kompletten K\xFCche \u2013 und planen alles im 3D-K\xFCchenplaner."
        )
      }
    ],
    subBrands: [
      { name: "Ecofrost", note: "K\xFChl- und Tiefk\xFChltechnik" },
      { name: "Chef\u2019s Heat", note: "Kochger\xE4te Serie 600/700" },
      { name: "CS Professional", note: "Profilinie Edelstahl & Ger\xE4te" },
      { name: "CS Budget Line", note: "Einstiegslinie" },
      { name: "Giorik", note: "Kombid\xE4mpfer & \xD6fen (Italien)" }
    ],
    faqs: [
      { q: "Ist CombiSteel eine gute Marke f\xFCr die Gastronomie?", a: "CombiSteel ist in den Niederlanden und Deutschland eine der meistverkauften Marken f\xFCr Gastro-K\xFChlung und Edelstahlm\xF6bel \u2013 solide Qualit\xE4t zu g\xFCnstigen Preisen, gute Ersatzteilversorgung." },
      { q: "Wie schnell liefert 2MC Gastro CombiSteel-Ger\xE4te?", a: "Lagerware in der Regel innerhalb von 3\u20137 Werktagen per Spedition; die Lieferzeit wird bei jedem Produkt angezeigt." }
    ],
    keywords: ["combisteel", "combisteel k\xFChlschrank", "combisteel k\xFChltisch", "combisteel h\xE4ndler", "combisteel gastro", "combisteel arbeitstisch"]
  },
  {
    slug: "hendi",
    name: "HENDI",
    brandKeys: ["hendi", "handi", "barup", "arktic", "amerbox", "st\xF6ckel", "stoeckel", "fine dine"],
    source: "handi",
    country: "Niederlande",
    website: "https://www.hendi.eu",
    h1: "HENDI Gastronomiebedarf \u2013 Kleinger\xE4te, Bar & K\xFCchenhelfer",
    title: "HENDI kaufen \u2013 Gastro Kleinger\xE4te & K\xFCchenbedarf H\xE4ndler",
    description: "HENDI Gastronomiebedarf: Kontaktgrills, Fritteusen, Bain-Maries, Bartechnik (BarUp), GN-Beh\xE4lter (Arktic), Buffetzubeh\xF6r (AmerBox) und K\xFCchenhelfer. \xDCber 3.700 HENDI-Produkte netto bei 2MC Gastro.",
    intro: "HENDI aus den Niederlanden ist Europas bekannteste Marke f\xFCr Gastro-Kleinger\xE4te und K\xFCchenbedarf: Kontaktgrills, Tischfritteusen, Bain-Maries, Toaster, Waffeleisen, Saftpressen, GN-Beh\xE4lter, Buffetzubeh\xF6r und Bartechnik. 2MC Gastro f\xFChrt \xFCber 3.700 HENDI-Artikel inklusive der Eigenmarken BarUp (Bar), Arktic (GN & Lagerung), AmerBox (Buffet) und Fine Dine (Geschirr).",
    sections: [
      {
        h2: "HENDI Marken: BarUp, Arktic, AmerBox, Fine Dine",
        html: p2(
          "<strong>BarUp</strong> b\xFCndelt Barzubeh\xF6r und Bartechnik von Shaker bis Eisw\xFCrfelbereiter. <strong>Arktic</strong> steht f\xFCr GN-Beh\xE4lter, Lagerboxen und Thermoboxen. <strong>AmerBox</strong> liefert Buffet- und Pr\xE4sentationszubeh\xF6r, <strong>Fine Dine</strong> Porzellan und Tischkultur. Zusammen mit den HENDI-Elektrokleinger\xE4ten deckt das Sortiment die komplette Ausstattung von Bar, Buffet und Imbiss ab."
        )
      },
      {
        h2: "Artikelnummern schnell finden",
        html: p2(
          "HENDI-Artikel sind unter ihrer sechsstelligen Artikelnummer (z. B. 263600) bekannt. Geben Sie die Nummer in die Suche ein oder nutzen Sie die Kategorieseiten \u2013 jede Produktseite zeigt Artikelnummer, EAN, Ma\xDFe und Anschlusswerte."
        )
      }
    ],
    subBrands: [
      { name: "BarUp", note: "Bartechnik & Barzubeh\xF6r" },
      { name: "Arktic", note: "GN-Beh\xE4lter, Thermoboxen, Lagerung" },
      { name: "AmerBox", note: "Buffet- & Pr\xE4sentationszubeh\xF6r" },
      { name: "Fine Dine", note: "Porzellan & Tischkultur" },
      { name: "St\xF6ckel", note: "Nudel- und Teigmaschinen" }
    ],
    faqs: [
      { q: "Wo finde ich HENDI-Ersatzteile?", a: "Ersatzteile bestellen wir \xFCber die HENDI-Artikelnummer beim Hersteller. Senden Sie uns Artikelnummer und Seriennummer des Ger\xE4ts." },
      { q: "Sind HENDI-Ger\xE4te f\xFCr den Dauerbetrieb geeignet?", a: "HENDI-Profiger\xE4te sind f\xFCr den gewerblichen Einsatz ausgelegt; f\xFCr Dauerbetrieb mit sehr hohem Durchsatz (z. B. Fritteusen in Fast-Food-Ketten) empfehlen wir Standger\xE4te der Serien 700/900 von Diamond." }
    ],
    keywords: ["hendi", "hendi gastro", "hendi kontaktgrill", "hendi fritteuse", "hendi h\xE4ndler", "hendi gastronomiebedarf", "barup", "arktic gn beh\xE4lter"]
  }
];
function findBrand(slug) {
  return BRANDS_DE.find((b) => b.slug === slug);
}

// src/content/seo/branchen.de.ts
var HACCP = { label: "Verordnung (EG) Nr. 852/2004 \u2013 Lebensmittelhygiene", url: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32004R0852", note: "HACCP-Grunds\xE4tze, Trennung rein/unrein, Handwaschbecken" };
var VDI = { label: "VDI 2052 \u2013 Raumlufttechnik K\xFCchen", url: "https://www.vdi.de/richtlinien/details/vdi-2052-blatt-1-raumlufttechnische-anlagen-fuer-kuechen", note: "Auslegung von Abzugshauben und Zuluft" };
var DGUV = { label: "DGUV Regel 110-003 \u2013 Arbeiten in K\xFCchenbetrieben", url: "https://publikationen.dguv.de/regelwerk/dguv-regeln/1029/branche-kuechenbetriebe", note: "Arbeitssicherheit, Verkehrswege, Fritteusen" };
var LMHV = { label: "Lebensmittelhygiene-Verordnung (LMHV)", url: "https://www.gesetze-im-internet.de/lmhv_2007/", note: "Nationale Hygieneanforderungen und Schulungspflicht" };
var DIN10506 = { label: "DIN 10506 \u2013 Lebensmittelhygiene in der Gemeinschaftsverpflegung", url: "https://www.din.de/de/mitwirken/normenausschuesse/nal/veroeffentlichungen/wdc-beuth:din21:296581694", note: "Temperaturen, Warmhaltung, Cook & Chill" };
var BRANCHEN_DE = [
  {
    slug: "restaurant",
    name: "Restaurant",
    h1: "Restaurantk\xFCche einrichten: Ausstattung, Planung, Kosten",
    title: "Restaurant K\xFCche Ausstattung \u2013 Planung & Ger\xE4te vom Profi",
    description: "Restaurantk\xFCche einrichten: Grundausstattung nach Sitzpl\xE4tzen, Kochzeile 700/900, K\xFChlung, Sp\xFCltechnik, L\xFCftung und Edelstahlm\xF6bel \u2013 mit Beispielkonfigurationen, Vorschriften und kostenloser 3D-Planung von 2MC Gastro.",
    intro: "Eine Restaurantk\xFCche muss zu Speisekarte, Sitzpl\xE4tzen und Personal passen \u2013 nicht umgekehrt. Als Faustregel gelten 0,5 bis 0,8 m\xB2 K\xFCchenfl\xE4che pro Sitzplatz und ein Verh\xE4ltnis von etwa 1:3 zwischen K\xFCche und Gastraum. Auf dieser Seite finden Sie die Grundausstattung f\xFCr Restaurants mit 40 bis 150 Sitzpl\xE4tzen, drei Beispielkonfigurationen und die wichtigsten Vorschriften. Alle Ger\xE4te planen wir kostenlos in 2D/3D in Ihren Grundriss.",
    planning: [
      "K\xFCchenfl\xE4che: 0,5\u20130,8 m\xB2 pro Sitzplatz; bei 80 Pl\xE4tzen also 40\u201365 m\xB2 inklusive Lager und Sp\xFClk\xFCche",
      "Zonen in Arbeitsrichtung: Wareneingang \u2192 Lager/K\xFChlung \u2192 Vorbereitung \u2192 Kochzeile \u2192 Pass \u2192 Sp\xFClk\xFCche",
      "Kochzeile Serie 700 f\xFCr bis ca. 100 Gedecke pro Service, Serie 900 dar\xFCber oder bei Bankettgesch\xE4ft",
      "Strom: 400 V mit 32\u201363 A f\xFCr Kombid\xE4mpfer, Sp\xFClmaschine und K\xFChlung; Gas f\xFCr Herd und Grill wenn vorhanden",
      "Abluft nach VDI 2052 \xFCber der gesamten Kochzeile, Zuluft nicht vergessen"
    ],
    equipment: [
      { label: "Kombid\xE4mpfer 10 GN", path: "/kochgeraete/kombidaempfer", note: "Herzst\xFCck f\xFCr Braten, Gem\xFCse, Regenerieren" },
      { label: "Gasherd 4\u20136 Flammen mit Backofen", path: "/kochgeraete/herde-und-kochkessel" },
      { label: "Doppelfritteuse 2\xD710 Liter", path: "/kochgeraete/fritteusen" },
      { label: "Grillplatte & Salamander", path: "/kochgeraete/grillgeraete" },
      { label: "K\xFChltisch am Pass, K\xFChlschr\xE4nke, Tiefk\xFChlschrank", path: "/kuehlung" },
      { label: "Haubensp\xFClmaschine mit Zu-/Ablauftisch", path: "/spueltechnik/haubenspuelmaschinen" },
      { label: "Arbeitstische, Sp\xFCltisch, Handwaschbecken, Regale", path: "/edelstahlmoebel" },
      { label: "Wandhaube mit Ventilator", path: "/lueftung/wandhauben" },
      { label: "Gem\xFCseschneider, Vakuumierer, Stabmixer", path: "/lebensmittelverarbeitung" }
    ],
    configs: [
      { name: "Bistro / kleines Restaurant (40 Pl\xE4tze)", items: ["Kombid\xE4mpfer 6 GN", "Elektroherd 4 Platten Serie 600", "Fritteuse 10 L", "Kontaktgrill", "K\xFChltisch 3 T\xFCren", "K\xFChlschrank 700 L + Tiefk\xFChlschrank 700 L", "Fronteinschub-Sp\xFClmaschine", "Wandhaube 2,0 m"] },
      { name: "Restaurant Standard (80 Pl\xE4tze)", items: ["Kombid\xE4mpfer 10 GN", "Gasherd 6 Flammen mit Backofen Serie 700", "Doppelfritteuse 2\xD710 L", "Grillplatte 800 mm + Salamander", "K\xFChltisch 4 T\xFCren am Pass", "2\xD7 K\xFChlschrank 1.400 L, Tiefk\xFChlschrank 1.400 L", "Haubensp\xFClmaschine + Tische", "Wandhaube 3,5 m", "Gem\xFCseschneider, Vakuumierer"] },
      { name: "Restaurant mit Bankett (150 Pl\xE4tze)", items: ["2\xD7 Kombid\xE4mpfer 10 GN oder 1\xD7 20 GN", "Kochzeile Serie 900: Herd, Kippbratpfanne, Kochkessel", "Schockfroster 10 GN", "K\xFChlzelle 10 m\xB3 + Tiefk\xFChlzelle 6 m\xB3", "Haubensp\xFClmaschine + Topfsp\xFCler", "Inselhaube 4 m", "Bankettwagen, Hordenwagen"] }
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: "Was kostet die K\xFCcheneinrichtung f\xFCr ein Restaurant mit 80 Pl\xE4tzen?", a: "Mit Markenger\xE4ten (Diamond/CombiSteel) liegt eine komplette Neuausstattung inklusive Kochzeile, K\xFChlung, Sp\xFCltechnik, M\xF6beln und L\xFCftung typischerweise im mittleren f\xFCnfstelligen Bereich netto. \xDCber unseren K\xFCchenplaner erhalten Sie ein exaktes Angebot f\xFCr Ihren Grundriss." },
      { q: "Wie gro\xDF muss die K\xFCche f\xFCr 80 Sitzpl\xE4tze sein?", a: "Rechnen Sie mit 40\u201365 m\xB2 inklusive Lager, K\xFChlung und Sp\xFClk\xFCche. Bei kleiner Karte und Cook-&-Chill-Produktion kann es weniger sein." },
      { q: "Kann ich meine Restaurantk\xFCche selbst planen?", a: "Ja. Mit dem kostenlosen 3D-K\xFCchenplaner von 2MC Gastro zeichnen Sie W\xE4nde, T\xFCren und Fenster, platzieren Ger\xE4te in Originalma\xDFen und erzeugen aus dem Projekt ein Angebot." }
    ],
    keywords: ["restaurantk\xFCche einrichten", "restaurant k\xFCche ausstattung", "restaurant einrichtung k\xFCche", "gastronomiek\xFCche planen", "restaurant er\xF6ffnen ausstattung"],
    legacySegments: ["restoran"],
    published: true
  },
  {
    slug: "hotel",
    name: "Hotel",
    h1: "Hotelk\xFCche & Hotelausstattung: Fr\xFChst\xFCck, Bankett, W\xE4scherei",
    title: "Hotelk\xFCche Ausstattung \u2013 Fr\xFChst\xFCcksbuffet, Bankett, W\xE4scherei",
    description: "Hotelk\xFCche einrichten: Fr\xFChst\xFCcksbuffet, \xE0-la-carte- und Bankettk\xFCche, Cook & Chill, Roomservice und W\xE4schereitechnik f\xFCr Hotels von 20 bis 200 Zimmern. Beispielkonfigurationen, Vorschriften, 3D-Planung.",
    intro: "Hotels betreiben mehrere K\xFCchen in einer: Fr\xFChst\xFCck f\xFCr alle G\xE4ste in kurzer Zeit, \xE0 la carte am Abend, Bankett und Tagung mit Spitzenlast. Dazu kommen Roomservice, Bar und W\xE4scherei. Die Ausstattung muss diese Spitzen abfangen \u2013 mit Cook & Chill, ausreichend K\xFChlung und einer Ausgabe, die 100 Fr\xFChst\xFCcksg\xE4ste in 90 Minuten bew\xE4ltigt.",
    planning: [
      "Fr\xFChst\xFCck: pro 50 Zimmer ein Buffetmodul (gek\xFChlt + warm), Kaffeevollautomat mit Festwasser, Durchlauftoaster, Saftdispenser",
      "Produktion: Kombid\xE4mpfer 10/20 GN + Schockfroster f\xFCr Bankettvorbereitung (Cook & Chill)",
      "K\xFChlung: K\xFChlzelle ab 10 m\xB3 und Tiefk\xFChlzelle ab 6 m\xB3 bei \xFCber 50 Zimmern",
      "Sp\xFClk\xFCche: Haubensp\xFClmaschine, bei Bankett Bandsp\xFClmaschine; Gl\xE4sersp\xFCler an der Bar",
      "W\xE4scherei: 2\u20133 kg W\xE4sche pro Zimmer und Tag \u2192 gewerbliche Waschmaschine 10\u201320 kg + Trockner + Mangel"
    ],
    equipment: [
      { label: "Fr\xFChst\xFCcksbuffet-Module & Drop-in-Elemente", path: "/ausgabe-und-buffet" },
      { label: "Kaffeevollautomat, Saftdispenser", path: "/kaffee-und-bar/kaffeemaschinen" },
      { label: "Kombid\xE4mpfer 10/20 GN + Schockfroster", path: "/cook-and-chill" },
      { label: "K\xFChlzellen, K\xFChlschr\xE4nke, Minibar", path: "/kuehlung" },
      { label: "Haubensp\xFClmaschine, Gl\xE4sersp\xFCler", path: "/spueltechnik" },
      { label: "Roomservice-Wagen, Housekeeping", path: "/hotelbedarf" },
      { label: "Gewerbliche Waschmaschine, Trockner, Mangel", path: "/waeschereitechnik" },
      { label: "Edelstahlm\xF6bel & L\xFCftung", path: "/edelstahlmoebel" }
    ],
    configs: [
      { name: "Garni-Hotel (30 Zimmer, nur Fr\xFChst\xFCck)", items: ["Buffetmodul gek\xFChlt 3 GN + warm 2 GN", "Kaffeevollautomat 200 Tassen/Tag", "Durchlauftoaster, Eierkocher", "K\xFChlschrank 1.400 L", "Fronteinschub-Sp\xFClmaschine", "Waschmaschine 10 kg + Trockner"] },
      { name: "Stadthotel (80 Zimmer, Restaurant)", items: ["2 Buffetmodule", "Kombid\xE4mpfer 10 GN + Schockfroster 5 GN", "Kochzeile Serie 700", "K\xFChlzelle 10 m\xB3 + Tiefk\xFChlzelle 6 m\xB3", "Haubensp\xFClmaschine + Gl\xE4sersp\xFCler Bar", "Waschmaschine 20 kg, Trockner, Muldenmangel"] },
      { name: "Tagungshotel (150 Zimmer, Bankett)", items: ["Kombid\xE4mpfer 20 GN + 10 GN, Schockfroster 20 GN", "Kochzeile Serie 900 mit Kessel und Kippbratpfanne", "Bandsp\xFClmaschine", "K\xFChlzellen 20 m\xB3 + 10 m\xB3", "Bankettwagen, Hordenwagen", "2\xD7 Waschmaschine 20 kg, 2\xD7 Trockner, Mangel"] }
    ],
    regulations: [HACCP, DIN10506, VDI, DGUV],
    faqs: [
      { q: "Wie plane ich das Fr\xFChst\xFCcksbuffet f\xFCr 100 G\xE4ste?", a: "Zwei Buffetlinien oder eine Insel mit beidseitigem Zugriff, gek\xFChlte Elemente f\xFCr Aufschnitt/Milchprodukte, Warmhaltung f\xFCr Eierspeisen, Kaffeevollautomat mit mindestens 200 Tassen/Tag und ein Durchlauftoaster. Wir planen das Buffet ma\xDFstabsgetreu im 3D-Planer." },
      { q: "Lohnt sich eine eigene W\xE4scherei im Hotel?", a: "Ab etwa 30\u201340 Zimmern amortisiert sich eine eigene W\xE4scherei mit gewerblicher Waschmaschine, Trockner und Mangel meist innerhalb von 2\u20133 Jahren gegen\xFCber externer W\xE4scherei." }
    ],
    keywords: ["hotelk\xFCche ausstattung", "hotel k\xFCche einrichten", "hotelausstattung", "fr\xFChst\xFCcksbuffet hotel ausstattung", "hotel w\xE4scherei einrichten"],
    legacySegments: ["otel"],
    published: true
  },
  {
    slug: "catering-partyservice",
    name: "Catering & Partyservice",
    h1: "Catering-K\xFCche einrichten: Produktion, Transport, Ausgabe",
    title: "Catering K\xFCche Ausstattung \u2013 Cook & Chill, Thermoboxen, Bankett",
    description: "Cateringk\xFCche und Partyservice ausstatten: Kombid\xE4mpfer, Schockfroster, Vakuumierer, Thermoboxen, Bankettwagen und mobile Ausgabe \u2013 f\xFCr Caterer von 100 bis 2.000 Portionen pro Tag.",
    intro: "Catering bedeutet Produktion an einem Ort und Ausgabe an einem anderen. Die K\xFCche ist auf Vorproduktion (Cook & Chill), sichere Lagerung, Verpackung und Transport ausgelegt; vor Ort braucht es mobile Warmhaltung und Ausgabe. Wir stellen Ausstattungen f\xFCr Partyservice, Eventcatering und Betriebsverpflegung zusammen.",
    planning: [
      "Produktion: Kombid\xE4mpfer 20 GN und Schockfroster im GN-Raster mit gemeinsamen Hordenwagen",
      "Verpackung: Kammervakuumierer, Siegelger\xE4te, GN-Beh\xE4lter mit Deckeln, Thermoboxen",
      "Lager: K\xFChlzelle und Tiefk\xFChlzelle nach Wochenproduktion, Trockenlager",
      "Transport: Thermoboxen, Bankettwagen, K\xFChltransportboxen, Fahrzeugk\xFChlung",
      "Vor Ort: Chafing Dishes, Bain-Maries, mobile Induktion, K\xFChlvitrinen, Kaffeemaschinen"
    ],
    equipment: [
      { label: "Kombid\xE4mpfer 20 GN & Schockfroster", path: "/cook-and-chill" },
      { label: "Kammervakuumierer", path: "/lebensmittelverarbeitung/vakuumierer" },
      { label: "K\xFChlzellen & Tiefk\xFChlzellen", path: "/kuehlung/kuehlzellen" },
      { label: "GN-Beh\xE4lter, Thermoboxen, Bankettwagen", path: "/gn-behaelter-und-wagen" },
      { label: "Chafing Dishes, Bain-Maries, W\xE4rmebr\xFCcken", path: "/kochgeraete/warmhaltegeraete" },
      { label: "Mobile Kochger\xE4te, Induktion", path: "/kochgeraete" },
      { label: "Kaffeemaschinen, Saftdispenser", path: "/kaffee-und-bar" }
    ],
    configs: [
      { name: "Partyservice (bis 200 Portionen)", items: ["Kombid\xE4mpfer 10 GN", "Schockfroster 5 GN", "Vakuumierer 10 m\xB3/h", "K\xFChlschrank 1.400 L + Tiefk\xFChlschrank", "10 Thermoboxen GN 1/1", "Chafing Dishes, Induktionsplatten"] },
      { name: "Eventcatering (bis 800 Portionen)", items: ["Kombid\xE4mpfer 20 GN + 10 GN", "Schockfroster 20 GN", "K\xFChlzelle 15 m\xB3, Tiefk\xFChlzelle 8 m\xB3", "Kippbratpfanne, Kochkessel 100 L", "Bankettwagen, Thermoboxen", "Haubensp\xFClmaschine + Topfsp\xFCler"] },
      { name: "Betriebsverpflegung (2.000 Portionen)", items: ["2\xD7 Kombid\xE4mpfer 20 GN", "2\xD7 Schockfroster 20 GN", "Kochkessel 200 L, Kippbratpfanne 120 L", "K\xFChlzellen 30 m\xB3", "Bandsp\xFClmaschine", "K\xFChltransportboxen, Fahrzeugausr\xFCstung"] }
    ],
    regulations: [HACCP, DIN10506, LMHV],
    faqs: [
      { q: "Wie lange darf Catering-Ware warm gehalten werden?", a: "Warmspeisen m\xFCssen \xFCber 65 \xB0C gehalten und innerhalb von 3 Stunden nach Erhitzen ausgegeben werden. Kaltspeisen maximal 7 \xB0C. Cook & Chill mit Regenerieren vor Ort ist die sicherere Alternative." },
      { q: "Welche Thermoboxen f\xFCr den Transport?", a: "GN-1/1-Thermoboxen aus EPP f\xFCr Frontlader (Kombid\xE4mpfer-Ausgabe) oder Toplader (Buffet); f\xFCr lange Wege Boxen mit Heiz- oder K\xFChlelement." }
    ],
    keywords: ["catering k\xFCche ausstattung", "catering ausstattung", "partyservice ausstattung", "cateringk\xFCche einrichten", "catering equipment"],
    legacySegments: ["catering"],
    published: true
  },
  {
    slug: "cafe-bistro",
    name: "Caf\xE9 & Bistro",
    h1: "Caf\xE9 und Bistro einrichten: Kaffeetechnik, K\xFChlvitrine, Snackk\xFCche",
    title: "Caf\xE9 Ausstattung \u2013 Kaffeemaschine, Kuchenvitrine, Snackger\xE4te",
    description: "Caf\xE9 oder Bistro er\xF6ffnen: Siebtr\xE4germaschine, Kaffeem\xFChle, Kuchenvitrine, Gl\xE4sersp\xFCler, Kontaktgrill und kompakte Snackk\xFCche der Serie 600 \u2013 Beispielkonfigurationen, Vorschriften und kostenlose Planung.",
    intro: "Ein Caf\xE9 lebt von Kaffee, Kuchen und schnellen Snacks auf wenig Fl\xE4che. Die Ausstattung konzentriert sich auf die Theke (Siebtr\xE4ger, M\xFChle, Kuchenvitrine, Gl\xE4sersp\xFCler) und eine kompakte Snackk\xFCche mit Kontaktgrill, Hei\xDFluftofen und K\xFChltisch. Serie-600-Ger\xE4te mit 600 mm Tiefe passen in enge Ladenlokale.",
    planning: [
      "Theke: Siebtr\xE4germaschine 2 Gruppen, M\xFChle, Milchk\xFChlung, Kuchenvitrine gek\xFChlt, Gl\xE4sersp\xFCler unter der Theke",
      "Snackk\xFCche: Kontaktgrill, Hei\xDFluftofen 4 Bleche, K\xFChltisch 2 T\xFCren, Saladette, Mikrowelle",
      "Strom: viele Ger\xE4te mit 230 V erh\xE4ltlich; Siebtr\xE4ger mit Festwasser ab 50 Tassen/Tag",
      "L\xFCftung: bei Kontaktgrill/Panini meist Umlufthaube mit Aktivkohle ausreichend"
    ],
    equipment: [
      { label: "Siebtr\xE4germaschine, M\xFChle, Vollautomat", path: "/kaffee-und-bar/kaffeemaschinen" },
      { label: "Kuchenvitrine gek\xFChlt", path: "/kuehlung/kuehlvitrinen" },
      { label: "Gl\xE4sersp\xFClmaschine", path: "/spueltechnik/glaeserspuelmaschinen" },
      { label: "Kontaktgrill, Panini, Waffeleisen", path: "/kochgeraete/grillgeraete" },
      { label: "Hei\xDFluftofen 4 Bleche", path: "/kochgeraete/heissluftoefen" },
      { label: "K\xFChltisch, Saladette, Getr\xE4nkek\xFChler", path: "/kuehlung" },
      { label: "Eisw\xFCrfelbereiter, Saftpresse", path: "/kuehlung/eiswuerfelbereiter" },
      { label: "Edelstahl-Arbeitstisch, Sp\xFCltisch", path: "/edelstahlmoebel" }
    ],
    configs: [
      { name: "Coffee-Bar (20 Pl\xE4tze)", items: ["Siebtr\xE4ger 2 Gruppen + M\xFChle", "Kuchenvitrine 900 mm", "Gl\xE4sersp\xFCler 230 V", "Milchk\xFChler, Eisw\xFCrfelbereiter 25 kg", "K\xFChlschrank Glast\xFCr"] },
      { name: "Caf\xE9 mit Snacks (40 Pl\xE4tze)", items: ["Siebtr\xE4ger 2 Gruppen + M\xFChle", "Kuchenvitrine 1.200 mm", "Gl\xE4sersp\xFCler + Fronteinschub-Sp\xFClmaschine", "Kontaktgrill doppelt, Hei\xDFluftofen 4 Bleche", "K\xFChltisch 2 T\xFCren + Saladette", "Umlufthaube"] },
      { name: "Bistro mit warmer K\xFCche (60 Pl\xE4tze)", items: ["Siebtr\xE4ger 2 Gruppen, Vollautomat", "K\xFChlvitrine + Getr\xE4nkek\xFChler", "Fronteinschub-Sp\xFClmaschine + Gl\xE4sersp\xFCler", "Serie 600: Herd 4 Platten, Fritteuse, Grillplatte, Kombid\xE4mpfer 6 GN", "K\xFChltisch 3 T\xFCren, K\xFChlschrank 700 L", "Wandhaube 2,0 m"] }
    ],
    regulations: [HACCP, LMHV, VDI],
    faqs: [
      { q: "Welche Kaffeemaschine f\xFCr ein neues Caf\xE9?", a: "F\xFCr Espresso-Qualit\xE4t eine 2-gruppige Siebtr\xE4germaschine mit separater M\xFChle; f\xFCr Personal ohne Barista-Erfahrung ein Profi-Vollautomat mit Festwasser. Beides finden Sie in unserer Kaffeetechnik." },
      { q: "Brauche ich im Caf\xE9 eine Abzugshaube?", a: "Bei Kontaktgrill und Hei\xDFluftofen reicht oft eine Umlufthaube mit Aktivkohlefilter. Sobald Fritteuse oder Herd eingesetzt werden, ist eine Abluft nach au\xDFen erforderlich." }
    ],
    keywords: ["caf\xE9 ausstattung", "caf\xE9 einrichten", "bistro ausstattung", "caf\xE9 er\xF6ffnen ausstattung", "kaffeebar ausstattung"],
    legacySegments: ["kafe"],
    published: true
  },
  {
    slug: "pizzeria",
    name: "Pizzeria",
    h1: "Pizzeria-Ausstattung: Pizzaofen, Teigmaschine, K\xFChltisch",
    title: "Pizzeria Ausstattung \u2013 Pizzaofen, Teigkneter, Pizzak\xFChltisch",
    description: "Pizzeria er\xF6ffnen: Pizzaofen (Elektro/Gas), Spiralkneter, Teigausrollmaschine, Pizzak\xFChltisch mit Belegstation, Nudelkocher und Thermoboxen f\xFCr Lieferdienst \u2013 Beispielkonfigurationen nach Pizzen pro Tag.",
    intro: "Die Pizzeria-K\xFCche folgt der Kette Teig \u2192 K\xFChlung \u2192 Belegen \u2192 Backen \u2192 Ausgabe. Entscheidend sind Pizzen pro Abend, Pizzaformat und ob Sie liefern. Von der kleinen Pizzeria mit 100 Pizzen bis zum Lieferdienst mit 500 Pizzen finden Sie hier die passende Ausstattung \u2013 inklusive Pasta-Linie mit Nudelkocher.",
    planning: [
      "Pizzaofen: 1 Kammer (4\u20136 Pizzen) bis 100 Pizzen/Abend, 2 Kammern (2\xD76 oder 2\xD79) bis 250, Durchlaufofen dar\xFCber",
      "Teig: Spiralkneter 18\u201340 kg, Teigportionierer, G\xE4rboxen; Teigausroller f\xFCr gleichm\xE4\xDFige B\xF6den",
      "Belegstation: Pizzak\xFChltisch mit Granitplatte und gek\xFChltem GN-Aufsatz f\xFCr 8\u201312 Zutaten",
      "Pasta: Nudelkocher 2 Becken, Kombid\xE4mpfer 6 GN, Saladette f\xFCr Antipasti",
      "Lieferung: Thermoboxen, Pizzataschen, Kartonlager, Ausgabez\xE4hler"
    ],
    equipment: [
      { label: "Pizzaofen Elektro / Gas", path: "/pizza-und-teig/pizzaoefen" },
      { label: "Spiralkneter 18\u201340 kg", path: "/pizza-und-teig/teigknetmaschinen" },
      { label: "Teigausrollmaschine, Teigportionierer", path: "/pizza-und-teig/teigausrollmaschinen" },
      { label: "Pizzak\xFChltisch & Saladette", path: "/kuehlung/saladetten" },
      { label: "K\xFChlschrank, Tiefk\xFChlschrank", path: "/kuehlung/kuehlschraenke" },
      { label: "Nudelkocher, Fritteuse", path: "/kochgeraete" },
      { label: "Gl\xE4sersp\xFCler, Geschirrsp\xFCler", path: "/spueltechnik" },
      { label: "Thermoboxen, GN-Beh\xE4lter", path: "/gn-behaelter-und-wagen" }
    ],
    configs: [
      { name: "Kleine Pizzeria (100 Pizzen/Abend)", items: ["Elektro-Pizzaofen 1 Kammer 6\xD7 34 cm", "Spiralkneter 18 kg", "Pizzak\xFChltisch 2 T\xFCren mit Aufsatz", "K\xFChlschrank 700 L, Tiefk\xFChlschrank 700 L", "Fronteinschub-Sp\xFClmaschine", "Teigausroller 40 cm"] },
      { name: "Pizzeria mit Pasta (250 Pizzen/Abend)", items: ["Elektro-Pizzaofen 2 Kammern 2\xD79", "Spiralkneter 40 kg + Teigportionierer", "Pizzak\xFChltisch 3 T\xFCren + Saladette", "Nudelkocher 2\xD726 L, Kombid\xE4mpfer 6 GN, Fritteuse", "K\xFChlschrank 1.400 L, Tiefk\xFChlschrank 1.400 L", "Haubensp\xFClmaschine", "Wandhaube 2,5 m"] },
      { name: "Lieferdienst (500 Pizzen/Abend)", items: ["Durchlaufofen 50 cm Band", "2\xD7 Spiralkneter 40 kg", "2\xD7 Pizzak\xFChltisch 3 T\xFCren", "K\xFChlzelle 8 m\xB3, Tiefk\xFChlzelle 4 m\xB3", "30 Thermoboxen, Warmhalteschrank", "Fronteinschub-Sp\xFClmaschine"] }
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: "Elektro- oder Gas-Pizzaofen f\xFCr die Pizzeria?", a: "Elektro mit Schamottboden ist einfacher zu installieren und pr\xE4zise regelbar; Gas ist bei fehlender Stromleistung oder sehr hohem Durchsatz g\xFCnstiger im Betrieb. Beide erreichen 400\u2013500 \xB0C." },
      { q: "Welche Teigknetmaschine f\xFCr 250 Pizzen am Tag?", a: "Etwa 60 kg Teig am Tag \u2013 ein Spiralkneter mit 40 kg Kapazit\xE4t und zwei Chargen oder zwei Chargen \xE0 25 kg." },
      { q: "Was kostet eine komplette Pizzeria-Ausstattung?", a: "Eine Grundausstattung mit Pizzaofen, Kneter, K\xFChltisch, K\xFChlung und Sp\xFClmaschine beginnt bei Markenger\xE4ten im unteren f\xFCnfstelligen Bereich netto. \xDCber den K\xFCchenplaner erhalten Sie ein exaktes Angebot." }
    ],
    keywords: ["pizzeria ausstattung", "pizzeria einrichten", "pizzeria er\xF6ffnen ausstattung", "pizzeria k\xFCche", "pizzaofen pizzeria"],
    published: true
  },
  {
    slug: "imbiss-fast-food",
    name: "Imbiss & Fast Food",
    h1: "Imbiss-Ausstattung: Fritteusen, Grill, Warmhaltung, K\xFChlung",
    title: "Imbiss Ausstattung \u2013 Fritteuse, Grillplatte, Pommesw\xE4rmer",
    description: "Imbiss oder Fast-Food-Betrieb einrichten: Standfritteusen, Grillplatte, Kontaktgrill, Pommesw\xE4rmer, K\xFChltisch, Getr\xE4nkek\xFChler und L\xFCftung \u2013 Beispielkonfigurationen f\xFCr Imbisswagen, Schnellimbiss und Burger-Laden.",
    intro: "Im Imbiss z\xE4hlen Durchsatz und Geschwindigkeit: Fritteusen mit hoher Literleistung, Grillplatte und Kontaktgrill, Warmhaltung f\xFCr Pommes, ein K\xFChltisch f\xFCr Bel\xE4ge und schnelle Getr\xE4nkek\xFChlung. Die Ger\xE4te m\xFCssen Dauerbetrieb bei Spitzenlast aushalten \u2013 wir empfehlen Standger\xE4te der Serie 700 ab mittlerem Umsatz.",
    planning: [
      "Fritteusen: Doppelfritteuse 2\xD710\u20132\xD720 L als Standger\xE4t, bei Pommes-Schwerpunkt zwei Ger\xE4te",
      "Grill: Grillplatte 600\u2013800 mm (glatt/geriffelt), Kontaktgrill f\xFCr Burger, D\xF6nergrill bei Bedarf",
      "Warmhaltung: Pommesw\xE4rmer, W\xE4rmebr\xFCcke, Warmhaltevitrine f\xFCr Ausgabe",
      "K\xFChlung: K\xFChltisch mit Aufsatz f\xFCr Bel\xE4ge, Getr\xE4nkek\xFChlschrank Glast\xFCr, Tiefk\xFChlschrank f\xFCr Rohware",
      "L\xFCftung: Abzugshaube mit Fettfilter und Abluft nach au\xDFen (Pflicht bei Fritteusen)"
    ],
    equipment: [
      { label: "Standfritteusen Elektro / Gas", path: "/kochgeraete/fritteusen" },
      { label: "Grillplatte, Kontaktgrill, D\xF6nergrill", path: "/kochgeraete/grillgeraete" },
      { label: "Pommesw\xE4rmer, W\xE4rmebr\xFCcke, Bain-Marie", path: "/kochgeraete/warmhaltegeraete" },
      { label: "K\xFChltisch mit Aufsatz, Saladette", path: "/kuehlung/kuehltische" },
      { label: "Getr\xE4nkek\xFChlschrank, Tiefk\xFChlschrank", path: "/kuehlung" },
      { label: "Wandhaube mit Fettfilter", path: "/lueftung/wandhauben" },
      { label: "Gem\xFCseschneider (Pommesschneider)", path: "/lebensmittelverarbeitung/aufschnitt-und-gemueseschneider" }
    ],
    configs: [
      { name: "Imbisswagen / Kiosk", items: ["Doppelfritteuse Tischger\xE4t 2\xD78 L", "Grillplatte 500 mm", "Pommesw\xE4rmer", "K\xFChltisch 2 T\xFCren", "Getr\xE4nkek\xFChlschrank", "Kompakte Haube"] },
      { name: "Schnellimbiss (Standard)", items: ["Standfritteuse 2\xD713 L", "Grillplatte 800 mm + Kontaktgrill", "Pommesw\xE4rmer, W\xE4rmebr\xFCcke", "K\xFChltisch 3 T\xFCren mit Aufsatz", "Tiefk\xFChlschrank 700 L, Getr\xE4nkek\xFChler", "Wandhaube 2,5 m", "Fronteinschub-Sp\xFClmaschine"] },
      { name: "Burger-Restaurant (hoher Durchsatz)", items: ["2\xD7 Standfritteuse 2\xD720 L", "Grillplatte 1.200 mm Chrom, 2\xD7 Kontaktgrill", "Warmhaltevitrine, Bunw\xE4rmer", "2\xD7 K\xFChltisch 3 T\xFCren", "Tiefk\xFChlschrank 1.400 L", "Wandhaube 4 m", "Haubensp\xFClmaschine"] }
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: "Wie viele Liter Fritteuse braucht ein Imbiss?", a: "Mindestens eine Doppelfritteuse mit 2\xD710 Litern; bei Pommes als Hauptprodukt 2\xD713 bis 2\xD720 Liter als Standger\xE4t. Faustregel: pro Liter \xD6l ca. 1 kg Frittiergut pro Stunde." },
      { q: "Muss ein Imbiss eine Abzugshaube haben?", a: "Ja, bei Fritteusen und Grill ist eine Abzugshaube mit Fettabscheidung und Abluft nach au\xDFen vorgeschrieben (VDI 2052, Brandschutz)." }
    ],
    keywords: ["imbiss ausstattung", "imbiss einrichten", "fast food ausstattung", "imbiss er\xF6ffnen ausstattung", "schnellimbiss ger\xE4te", "burger restaurant ausstattung"],
    published: true
  },
  {
    slug: "doener-kebab-betrieb",
    name: "D\xF6nerladen & Kebab",
    h1: "D\xF6nerladen einrichten: D\xF6nergrill, D\xF6nerschneider, K\xFChlung",
    title: "D\xF6nerladen Ausstattung \u2013 D\xF6nergrill, D\xF6nermesser, K\xFChltisch",
    description: "D\xF6nerladen und Kebab-Betrieb ausstatten: D\xF6nergrill Gas/Elektro 3\u20136 Brenner, elektrisches D\xF6nermesser, K\xFChltisch mit Aufsatz, Fritteuse, Salatk\xFChlung, Fleischwolf und Abzugshaube \u2013 Beispielkonfigurationen und Vorschriften.",
    intro: "Deutschland ist der gr\xF6\xDFte D\xF6nermarkt Europas \u2013 und die Ausstattung ist standardisiert: D\xF6nergrill mit 3 bis 6 Brennern f\xFCr 30 bis 120 kg Spie\xDFe, elektrischer D\xF6nerschneider, gek\xFChlte Belegstation, Fritteuse, Getr\xE4nkek\xFChlung und eine Haube, die Fett und Hitze sicher abf\xFChrt. F\xFCr Betriebe, die selbst Spie\xDFe herstellen, kommen Fleischwolf und Spie\xDFpresse hinzu.",
    planning: [
      "D\xF6nergrill: 3 Brenner (bis 40 kg) f\xFCr kleine L\xE4den, 4\u20135 Brenner (bis 80 kg) Standard, 6 Brenner (120 kg) f\xFCr hohen Umsatz; Gas oder Elektro",
      "Schneiden: elektrisches D\xF6nermesser mit Akku oder Kabel, D\xF6nerroboter bei sehr hohem Durchsatz",
      "Belegstation: K\xFChltisch mit GN-Aufsatz (Salat, So\xDFen), Brotw\xE4rmer, Pide-Ofen",
      "Zusatz: Doppelfritteuse, Grillplatte, Ayran-/Getr\xE4nkek\xFChler, Salatschleuder",
      "L\xFCftung: Haube direkt \xFCber D\xF6nergrill mit Fettfilter, Abluft nach au\xDFen zwingend"
    ],
    equipment: [
      { label: "D\xF6nergrill Gas / Elektro", path: "/kochgeraete/grillgeraete" },
      { label: "K\xFChltisch mit Aufsatz (Belegstation)", path: "/kuehlung/kuehltische" },
      { label: "Doppelfritteuse", path: "/kochgeraete/fritteusen" },
      { label: "Fleischwolf, Spie\xDFpresse", path: "/lebensmittelverarbeitung/fleischwoelfe" },
      { label: "Getr\xE4nkek\xFChlschrank, Tiefk\xFChlschrank", path: "/kuehlung/kuehlschraenke" },
      { label: "Wandhaube mit Fettfilter", path: "/lueftung/wandhauben" },
      { label: "Pide-/Brotofen, Kontaktgrill", path: "/kochgeraete" }
    ],
    configs: [
      { name: "Kleiner D\xF6nerladen", items: ["D\xF6nergrill 3 Brenner Gas", "D\xF6nermesser elektrisch", "K\xFChltisch 2 T\xFCren mit Aufsatz", "Doppelfritteuse 2\xD78 L", "Getr\xE4nkek\xFChlschrank", "Wandhaube 1,5 m"] },
      { name: "D\xF6ner-Imbiss Standard", items: ["D\xF6nergrill 4\u20135 Brenner Gas", "D\xF6nermesser + Ersatzmesser", "K\xFChltisch 3 T\xFCren mit Aufsatz", "Standfritteuse 2\xD713 L, Grillplatte", "Tiefk\xFChlschrank 700 L, Getr\xE4nkek\xFChler", "Wandhaube 2,5 m", "Fronteinschub-Sp\xFClmaschine"] },
      { name: "D\xF6ner-Restaurant mit Spie\xDFproduktion", items: ["2\xD7 D\xF6nergrill 6 Brenner", "D\xF6nerroboter", "Fleischwolf Gr\xF6\xDFe 32, Spie\xDFpresse, K\xFChlzelle", "2\xD7 K\xFChltisch 3 T\xFCren", "Standfritteuse 2\xD720 L, Grillplatte 1.000 mm", "Haube 4 m", "Haubensp\xFClmaschine"] }
    ],
    regulations: [HACCP, LMHV, VDI, DGUV],
    faqs: [
      { q: "Gas- oder Elektro-D\xF6nergrill?", a: "Gas ist im Betrieb g\xFCnstiger und heizt schneller; Elektro braucht keinen Gasanschluss und ist in Einkaufszentren oft Pflicht. Beide gibt es mit 3 bis 6 Brennern bzw. Heizzonen." },
      { q: "Wie schwer darf der Spie\xDF sein?", a: "3 Brenner: bis ca. 40 kg, 4 Brenner: bis 60 kg, 5 Brenner: bis 80 kg, 6 Brenner: bis 120 kg. Achten Sie auf die Motorleistung des Spie\xDFantriebs." }
    ],
    keywords: ["d\xF6nerladen ausstattung", "d\xF6nerladen einrichten", "d\xF6nergrill kaufen", "d\xF6ner imbiss ausstattung", "kebab ausstattung", "d\xF6nerladen er\xF6ffnen"],
    published: true
  },
  {
    slug: "baeckerei-konditorei",
    name: "B\xE4ckerei & Konditorei",
    h1: "B\xE4ckerei einrichten: Back\xF6fen, G\xE4rschrank, K\xFChlung, Verkauf",
    title: "B\xE4ckerei Ausstattung \u2013 Backofen, G\xE4rschrank, Kuchenvitrine",
    description: "B\xE4ckerei und Konditorei ausstatten: B\xE4ckerei\xF6fen 600\xD7400, G\xE4rschr\xE4nke, Spiralkneter, Teigausroller, K\xFChlvitrinen, Schockfroster und Verkaufstheke \u2013 f\xFCr Backstube, Backstation und Caf\xE9-B\xE4ckerei.",
    intro: "B\xE4ckereien arbeiten im Blechma\xDF 600 \xD7 400 mm und mit Hefeteigen, die G\xE4rschrank und Schockfroster brauchen. Dazu kommt der Verkauf: Kuchenvitrine, Brotregal, Kaffeemaschine. Wir stellen Ausstattungen f\xFCr Backstationen, Caf\xE9-B\xE4ckereien und Konditoreien zusammen.",
    planning: [
      "Backen: Konvektionsofen 4\u201310 Bleche oder Stikkenofen; Etagenofen f\xFCr Brot",
      "Teig: Spiralkneter 25\u201360 kg, Teigausroller, Teigteiler; G\xE4rschrank mit Feuchteregelung",
      "K\xFChlung: Schockfroster 600\xD7400 f\xFCr Teiglinge, Tiefk\xFChlschrank, K\xFChlvitrine im Verkauf",
      "Konditorei: Planetenr\xFChrmaschine, Schokoladentemperierger\xE4t, K\xFChlvitrine mit Umluft",
      "Verkauf: Kuchenvitrine, Brotregal, Siebtr\xE4ger oder Vollautomat, Gl\xE4sersp\xFCler"
    ],
    equipment: [
      { label: "B\xE4ckerei\xF6fen 600\xD7400", path: "/baeckereitechnik/baeckereioefen" },
      { label: "G\xE4rschr\xE4nke", path: "/baeckereitechnik/gaerschraenke" },
      { label: "Spiralkneter, Teigausroller, Teigportionierer", path: "/pizza-und-teig" },
      { label: "Schockfroster, Tiefk\xFChlschrank", path: "/kuehlung/schockfroster" },
      { label: "Kuchenvitrinen gek\xFChlt", path: "/kuehlung/kuehlvitrinen" },
      { label: "Kaffeemaschinen", path: "/kaffee-und-bar/kaffeemaschinen" },
      { label: "Backwagen, Blechregale, Arbeitstische", path: "/edelstahlmoebel" }
    ],
    configs: [
      { name: "Backstation / Aufback-Caf\xE9", items: ["Konvektionsofen 4 Bleche + G\xE4runterbau", "Tiefk\xFChlschrank 700 L", "Kuchenvitrine 1.200 mm", "Vollautomat 200 Tassen", "Gl\xE4sersp\xFCler"] },
      { name: "Caf\xE9-B\xE4ckerei", items: ["Konvektionsofen 10 Bleche + G\xE4rschrank", "Spiralkneter 25 kg, Teigausroller", "Schockfroster 10\xD7 600\xD7400", "K\xFChlvitrine 1.500 mm, Brotregal", "Siebtr\xE4ger 2 Gruppen", "Arbeitstische, Blechregale"] },
      { name: "Handwerksb\xE4ckerei mit Konditorei", items: ["Stikkenofen + Etagenofen", "Spiralkneter 60 kg, Teigteiler, Rundwirker", "G\xE4rschrank 2 Wagen", "Schockfroster 20 Bleche, Tiefk\xFChlzelle", "Planetenr\xFChrmaschine 40 L, Temperierger\xE4t", "K\xFChlvitrine Umluft 2.000 mm"] }
    ],
    regulations: [HACCP, LMHV, DGUV],
    faqs: [
      { q: "Welcher Ofen f\xFCr eine Backstation im Supermarkt?", a: "Ein Konvektionsofen f\xFCr 4\u201310 Bleche 600 \xD7 400 mm mit Dampfzugabe und G\xE4runterbau \u2013 kompakt, 400 V, mit Programmspeicher f\xFCr Personal ohne B\xE4ckerausbildung." },
      { q: "Brauche ich einen Schockfroster in der B\xE4ckerei?", a: "F\xFCr die Vorproduktion von Teiglingen ja: Schockfrosten erh\xE4lt G\xE4rstabilit\xE4t und Qualit\xE4t und erm\xF6glicht Backen nach Bedarf." }
    ],
    keywords: ["b\xE4ckerei ausstattung", "b\xE4ckerei einrichten", "konditorei ausstattung", "backstube ausstattung", "b\xE4ckerei er\xF6ffnen ausstattung", "b\xE4ckereitechnik"],
    published: true
  },
  {
    slug: "metzgerei",
    name: "Metzgerei & Fleischerei",
    h1: "Metzgerei einrichten: Fleischverarbeitung, K\xFChlung, Verkaufstheke",
    title: "Metzgerei Ausstattung \u2013 Fleischwolf, Cutter, K\xFChltheke, Vakuumierer",
    description: "Metzgerei und Fleischerei ausstatten: Fleischwolf, Cutter, Wurstf\xFCller, Knochens\xE4ge, Vakuumierer, K\xFChlzelle, K\xFChltheke und Reifeschrank \u2013 Beispielkonfigurationen f\xFCr Verkaufsmetzgerei und Produktionsbetrieb.",
    intro: "Die Metzgerei vereint Produktion (Wolf, Cutter, F\xFCller, R\xE4uchern), Lagerung (K\xFChlzellen, Reifeschr\xE4nke) und Verkauf (K\xFChltheke, Aufschnittmaschine, Waage). Hygienevorschriften sind hier besonders streng: separate R\xE4ume f\xFCr Zerlegung, Produktion und Verkauf, Handwaschbecken in jedem Bereich, l\xFCckenlose K\xFChlkette.",
    planning: [
      "Produktion: Fleischwolf Gr\xF6\xDFe 22/32, Cutter 20\u201360 L, Wurstf\xFCllmaschine, Knochens\xE4ge, R\xE4ucherofen",
      "K\xFChlung: K\xFChlzelle Zerlegung (0\u20132 \xB0C), K\xFChlzelle Fertigware, Tiefk\xFChlzelle, Reifeschrank (Dry Aging)",
      "Verpackung: Kammervakuumierer, Siegelger\xE4t, Etikettenwaage",
      "Verkauf: K\xFChltheke ventiliert 2\u20134 m, Aufschnittmaschine 300 mm, Waage, K\xFChlvitrine Feinkost",
      "Hygiene: Handwaschbecken, Messersterilisator, Hackblock, Edelstahltische 1,2\u20131,5 mm"
    ],
    equipment: [
      { label: "Fleischwolf, Wurstf\xFCller, Knochens\xE4ge", path: "/lebensmittelverarbeitung/fleischwoelfe" },
      { label: "Cutter, Aufschnittmaschine", path: "/lebensmittelverarbeitung/aufschnitt-und-gemueseschneider" },
      { label: "Kammervakuumierer", path: "/lebensmittelverarbeitung/vakuumierer" },
      { label: "K\xFChlzellen, Tiefk\xFChlzellen", path: "/kuehlung/kuehlzellen" },
      { label: "K\xFChltheken, Fleischtheken", path: "/kuehlung/kuehltheken" },
      { label: "Edelstahltische, Sp\xFCltische, Hygiene", path: "/edelstahlmoebel" }
    ],
    configs: [
      { name: "Verkaufsmetzgerei (ohne Produktion)", items: ["K\xFChltheke ventiliert 3 m", "Aufschnittmaschine 300 mm", "K\xFChlzelle 8 m\xB3", "Vakuumierer 10 m\xB3/h", "Arbeitstische, Handwaschbecken"] },
      { name: "Metzgerei mit eigener Wurstproduktion", items: ["Fleischwolf Gr\xF6\xDFe 32", "Cutter 40 L", "Wurstf\xFCller 25 L hydraulisch", "K\xFChlzelle Zerlegung 10 m\xB3 + Fertigware 10 m\xB3", "K\xFChltheke 4 m + Feinkostvitrine", "Kammervakuumierer 20 m\xB3/h", "Knochens\xE4ge, Hackblock"] },
      { name: "Produktionsbetrieb / Gro\xDFhandel", items: ["Fleischwolf 32 Industrie, Mischwolf", "Cutter 60 L", "Vakuumf\xFCller", "Tiefk\xFChlzelle 20 m\xB3, K\xFChlzellen 30 m\xB3", "Schockfroster 20 GN", "Bandsp\xFClmaschine, Topfsp\xFCler"] }
    ],
    regulations: [HACCP, LMHV, DGUV],
    faqs: [
      { q: "Welcher Fleischwolf f\xFCr eine Metzgerei?", a: "Gr\xF6\xDFe 22 mit ca. 300 kg/h ist der Standard f\xFCr Verkaufsmetzgereien; Gr\xF6\xDFe 32 mit \xFCber 400 kg/h f\xFCr Produktion und D\xF6nerspie\xDF-Herstellung." },
      { q: "Welche Temperatur muss die Fleischtheke halten?", a: "Frischfleisch maximal +4 \xB0C, Hackfleisch +2 \xB0C, Gefl\xFCgel +4 \xB0C. Ventilierte Theken halten die Temperatur auch bei ge\xF6ffneten Schiebet\xFCren." }
    ],
    keywords: ["metzgerei ausstattung", "metzgerei einrichten", "fleischerei ausstattung", "metzgerei er\xF6ffnen", "fleischverarbeitung maschinen"],
    published: true
  },
  {
    slug: "kantine-betriebsverpflegung",
    name: "Kantine & Betriebsverpflegung",
    h1: "Kantinenk\xFCche einrichten: Gro\xDFk\xFCchentechnik f\xFCr 200\u20132.000 Essen",
    title: "Kantine Ausstattung \u2013 Gro\xDFk\xFCche, Ausgabe, Bandsp\xFClmaschine",
    description: "Kantine und Betriebsrestaurant ausstatten: Kochkessel, Kippbratpfannen, Kombid\xE4mpfer 20 GN, Schockfroster, Ausgabetheken mit Tablettrutsche, Bandsp\xFClmaschine und K\xFChlzellen \u2013 dimensioniert nach Essen pro Tag.",
    intro: "Kantinen produzieren in kurzer Zeit gro\xDFe Mengen und geben sie \xFCber Self-Service-Theken aus. Die K\xFCche wird nach Essen pro Tag dimensioniert: Kochkessel und Kippbratpfannen f\xFCr Mengenkochen, Kombid\xE4mpfer mit Hordenwagen, Schockfroster f\xFCr Cook & Chill, Ausgabelinie mit Tablettrutsche und eine Bandsp\xFClmaschine, die den R\xFCcklauf bew\xE4ltigt.",
    planning: [
      "200 Essen: Kombid\xE4mpfer 20 GN, Kochkessel 100 L, Kippbratpfanne 80 L, Ausgabelinie 4 m",
      "500 Essen: 2\xD7 Kombid\xE4mpfer 20 GN, Kessel 150 + 100 L, Kippbratpfanne 120 L, 2 Ausgabelinien",
      "1.000+ Essen: Cook-&-Chill-Produktion, Schockfroster 40 GN, K\xFChlzellen 40 m\xB3, Bandsp\xFClmaschine",
      "Sp\xFClk\xFCche: Bandsp\xFClmaschine ab 400 Essen; Tablettabr\xE4umband; Topfsp\xFCler separat",
      "Ausgabe: Self-Service-Module mit Tablettrutsche, Hustenschutz, Kassenplatz; Free-Flow ab 500 Essen"
    ],
    equipment: [
      { label: "Kochkessel, Kippbratpfannen", path: "/kochgeraete/herde-und-kochkessel" },
      { label: "Kombid\xE4mpfer 20 GN, Schockfroster", path: "/cook-and-chill" },
      { label: "Self-Service-Theken, Ausgabe", path: "/ausgabe-und-buffet/self-service-module" },
      { label: "Bandsp\xFClmaschine, Topfsp\xFCler", path: "/spueltechnik/bandspuelmaschinen" },
      { label: "K\xFChlzellen, Tiefk\xFChlzellen", path: "/kuehlung/kuehlzellen" },
      { label: "Gem\xFCseschneider, Kartoffelsch\xE4ler", path: "/lebensmittelverarbeitung" },
      { label: "Hordenwagen, Tablettwagen, GN", path: "/gn-behaelter-und-wagen" }
    ],
    configs: [
      { name: "Kantine 200 Essen", items: ["Kombid\xE4mpfer 20 GN", "Kochkessel 100 L, Kippbratpfanne 80 L", "Herd 4 Platten Serie 900", "Ausgabelinie 4 m (warm/kalt/neutral)", "Haubensp\xFClmaschine + Topfsp\xFCler", "K\xFChlzelle 10 m\xB3, Tiefk\xFChlzelle 6 m\xB3"] },
      { name: "Betriebsrestaurant 500 Essen", items: ["2\xD7 Kombid\xE4mpfer 20 GN", "Schockfroster 20 GN", "Kochkessel 150 + 100 L, Kippbratpfanne 120 L", "2 Ausgabelinien \xE0 5 m, Salatbar", "Bandsp\xFClmaschine", "K\xFChlzellen 25 m\xB3"] },
      { name: "Zentralk\xFCche 2.000 Essen", items: ["4\xD7 Kombid\xE4mpfer 20 GN mit Hordenwagen", "2\xD7 Schockfroster 40 GN", "Kesselstra\xDFe 3\xD7 300 L, 2\xD7 Kippbratpfanne 200 L", "Bandsp\xFClmaschine 2.000 Teller/h", "K\xFChlzellen 60 m\xB3, Tiefk\xFChlzelle 30 m\xB3", "Verpackung und Verteilung"] }
    ],
    regulations: [HACCP, DIN10506, VDI, DGUV],
    faqs: [
      { q: "Ab wann brauche ich eine Bandsp\xFClmaschine?", a: "Ab etwa 400 Essen pro Mahlzeit; darunter reicht eine Haubensp\xFClmaschine mit gutem Vorsp\xFClplatz. Bandsp\xFClmaschinen schaffen 1.000\u20133.000 Teller pro Stunde." },
      { q: "Wie gro\xDF muss eine Kantinenk\xFCche f\xFCr 500 Essen sein?", a: "Rechnen Sie mit 120\u2013180 m\xB2 f\xFCr K\xFCche, Lager, K\xFChlung und Sp\xFClk\xFCche plus Ausgabe- und Gastraum." }
    ],
    keywords: ["kantine ausstattung", "kantinenk\xFCche einrichten", "betriebsrestaurant ausstattung", "gro\xDFk\xFCche einrichten", "gemeinschaftsverpflegung k\xFCche"],
    published: true
  },
  {
    slug: "krankenhaus-pflegeheim",
    name: "Krankenhaus & Pflegeheim",
    h1: "K\xFCche f\xFCr Krankenhaus & Pflegeheim: Cook & Chill, Verteilung, Hygiene",
    title: "Krankenhausk\xFCche Ausstattung \u2013 Cook & Chill, Speisenverteilung",
    description: "K\xFCchen f\xFCr Krankenhaus, Pflegeheim und Seniorenresidenz: Cook & Chill mit Kombid\xE4mpfer und Schockfroster, Speisenverteilwagen, Tablettsystem, Bandsp\xFClmaschine und Hygieneausstattung nach DIN 10506.",
    intro: "Krankenh\xE4user und Pflegeheime verpflegen rund um die Uhr, mit Di\xE4tformen und strengen Hygienevorgaben. Cook & Chill ist hier Standard: zentrale Produktion, Schnellk\xFChlung, Regenerieren auf Station. Die Ausstattung reicht vom Kombid\xE4mpfer \xFCber Speisenverteilwagen bis zur Bandsp\xFClmaschine mit Tablettr\xFCcklauf.",
    planning: [
      "Produktion: Kombid\xE4mpfer 20 GN, Schockfroster, Kochkessel; Cook & Chill nach DIN 10536",
      "Verteilung: Tablettsystem mit Bandportionierung, Speisenverteilwagen (kalt/warm), Regenerier\xF6fen auf Station",
      "Hygiene: strikte Trennung rein/unrein, Handwaschbecken, Desinfektionsspender, Bandsp\xFClmaschine mit Tablettr\xFCcklauf",
      "K\xFChlung: K\xFChlzellen mit Temperaturprotokoll, Tiefk\xFChlzelle, Di\xE4tk\xFChlung separat"
    ],
    equipment: [
      { label: "Kombid\xE4mpfer, Schockfroster (Cook & Chill)", path: "/cook-and-chill" },
      { label: "Kochkessel, Kippbratpfannen", path: "/kochgeraete/herde-und-kochkessel" },
      { label: "Speisenverteilwagen, Thermowagen, Tablettwagen", path: "/gn-behaelter-und-wagen/transportwagen" },
      { label: "Bandsp\xFClmaschine", path: "/spueltechnik/bandspuelmaschinen" },
      { label: "K\xFChlzellen mit Protokoll", path: "/kuehlung/kuehlzellen" },
      { label: "Edelstahlm\xF6bel, Hygiene", path: "/edelstahlmoebel" }
    ],
    configs: [
      { name: "Pflegeheim 80 Betten", items: ["Kombid\xE4mpfer 10 GN + 20 GN", "Schockfroster 10 GN", "Kochkessel 100 L, Kippbratpfanne 80 L", "4 Speisenverteilwagen", "Haubensp\xFClmaschine", "K\xFChlzelle 10 m\xB3, Tiefk\xFChlzelle 6 m\xB3"] },
      { name: "Klinik 300 Betten", items: ["3\xD7 Kombid\xE4mpfer 20 GN", "2\xD7 Schockfroster 20 GN", "Kesselstra\xDFe 2\xD7 200 L", "Tablettband, 15 Verteilwagen", "Bandsp\xFClmaschine mit Tablettr\xFCcklauf", "K\xFChlzellen 40 m\xB3"] },
      { name: "Seniorenresidenz mit Restaurant", items: ["Kombid\xE4mpfer 20 GN, Schockfroster 10 GN", "Kochzeile Serie 900", "Ausgabetheke 4 m", "Haubensp\xFClmaschine + Topfsp\xFCler", "K\xFChlzelle 12 m\xB3"] }
    ],
    regulations: [HACCP, DIN10506, LMHV, DGUV],
    faqs: [
      { q: "Warum Cook & Chill im Krankenhaus?", a: "Produktion und Ausgabe werden entkoppelt: gleichbleibende Qualit\xE4t, HACCP-sichere Temperaturf\xFChrung, weniger Personal in Randzeiten und einfache Di\xE4tsteuerung." }
    ],
    keywords: ["krankenhausk\xFCche ausstattung", "pflegeheim k\xFCche einrichten", "klinikk\xFCche", "seniorenheim k\xFCche ausstattung", "speisenverteilung krankenhaus"],
    legacySegments: ["hastane"],
    published: true
  },
  {
    slug: "schule-kita",
    name: "Schule & Kita",
    h1: "Schulk\xFCche & Kita-K\xFCche einrichten: Mensa, Ausgabe, Aufw\xE4rmk\xFCche",
    title: "Schulk\xFCche Ausstattung \u2013 Mensa, Kita-K\xFCche, Aufw\xE4rmk\xFCche",
    description: "K\xFCchen f\xFCr Schule, Kita und Mensa: Aufw\xE4rmk\xFCche mit Kombid\xE4mpfer, Frischk\xFCche mit Kochkessel, kindgerechte Ausgabe, Sp\xFClmaschine und K\xFChlung \u2013 nach DIN 10506 und den Empfehlungen der DGE.",
    intro: "Schul- und Kita-K\xFCchen reichen von der Aufw\xE4rmk\xFCche (Anlieferung Cook & Chill, Regenerieren) bis zur Frischk\xFCche mit 500 Essen. Die Ausgabe muss kindgerecht (niedrige Theken, Tablettrutsche), die Sp\xFClk\xFCche schnell und die Hygiene l\xFCckenlos sein. Wir stellen Ausstattungen nach Verpflegungssystem und Essenszahl zusammen.",
    planning: [
      "Aufw\xE4rmk\xFCche (Cook & Chill / Warmanlieferung): Kombid\xE4mpfer 10 GN zum Regenerieren, K\xFChlschrank, Warmhaltewagen, Sp\xFClmaschine",
      "Mischk\xFCche: Kombid\xE4mpfer 20 GN, Kochkessel 100 L, K\xFChlung, Ausgabe",
      "Frischk\xFCche 300\u2013500 Essen: Kesselstra\xDFe, Kippbratpfanne, 2\xD7 Kombid\xE4mpfer 20 GN, Bandsp\xFClmaschine",
      "Ausgabe: Thekenh\xF6he 750\u2013800 mm f\xFCr Grundschule, Tablettrutsche, Hustenschutz, Wasserspender"
    ],
    equipment: [
      { label: "Kombid\xE4mpfer 10/20 GN", path: "/kochgeraete/kombidaempfer" },
      { label: "Kochkessel, Kippbratpfanne", path: "/kochgeraete/herde-und-kochkessel" },
      { label: "Ausgabetheken, Self-Service", path: "/ausgabe-und-buffet" },
      { label: "Hauben-/Bandsp\xFClmaschine", path: "/spueltechnik" },
      { label: "K\xFChlschr\xE4nke, K\xFChlzelle", path: "/kuehlung" },
      { label: "Thermowagen, Warmhaltewagen", path: "/gn-behaelter-und-wagen/transportwagen" }
    ],
    configs: [
      { name: "Kita 60 Kinder (Aufw\xE4rmk\xFCche)", items: ["Kombid\xE4mpfer 6 GN", "K\xFChlschrank 700 L", "Fronteinschub-Sp\xFClmaschine", "Arbeitstisch, Sp\xFCltisch, Handwaschbecken", "Warmhaltewagen"] },
      { name: "Grundschule 250 Essen (Mischk\xFCche)", items: ["Kombid\xE4mpfer 20 GN", "Kochkessel 100 L", "Ausgabetheke 4 m kindgerecht", "Haubensp\xFClmaschine", "K\xFChlzelle 8 m\xB3, Tiefk\xFChlschrank"] },
      { name: "Schulmensa 500 Essen (Frischk\xFCche)", items: ["2\xD7 Kombid\xE4mpfer 20 GN", "Kochkessel 150 L, Kippbratpfanne 120 L", "2 Ausgabelinien", "Bandsp\xFClmaschine", "K\xFChlzellen 20 m\xB3"] }
    ],
    regulations: [HACCP, DIN10506, LMHV],
    faqs: [
      { q: "Welche Ausstattung braucht eine Kita-K\xFCche f\xFCr 60 Kinder?", a: "Bei Anlieferung: Kombid\xE4mpfer 6 GN zum Regenerieren, K\xFChlschrank 700 L, Sp\xFClmaschine, Arbeits- und Sp\xFCltisch, Handwaschbecken. Bei Frischkochen zus\xE4tzlich Herd 4 Platten und Kochkessel 50 L." }
    ],
    keywords: ["schulk\xFCche ausstattung", "kita k\xFCche einrichten", "mensa ausstattung", "schulmensa k\xFCche", "aufw\xE4rmk\xFCche kita"],
    legacySegments: ["okul"],
    published: true
  },
  {
    slug: "eisdiele",
    name: "Eisdiele",
    h1: "Eisdiele einrichten: Eistheke, Eismaschine, Waffeln, Kaffee",
    title: "Eisdiele Ausstattung \u2013 Eistheke, Eismaschine, Softeis",
    description: "Eisdiele oder Eiscaf\xE9 er\xF6ffnen: Eistheke 12\u201324 Beh\xE4lter, Speiseeismaschine, Pasteurisierer, Softeismaschine, Waffeleisen, Sahnemaschine, Siebtr\xE4ger und Tiefk\xFChllager \u2013 Beispielkonfigurationen nach Gr\xF6\xDFe.",
    intro: "Eine Eisdiele braucht eine Eistheke, die auch bei 35 \xB0C Au\xDFentemperatur h\xE4lt, eine Produktion (Pasteurisierer + Eismaschine) oder Einkauf von Fertigeis, Waffel- und Kaffeetechnik und ausreichend Tiefk\xFChllager. Softeis, Frozen Yogurt und Cr\xEApes erweitern das Angebot im Sommer und Winter.",
    planning: [
      "Theke: Eisvitrine ventiliert 12\u201324 Beh\xE4lter \xE0 5 L, Klimaklasse 5 bei Sonneneinstrahlung",
      "Produktion: Pasteurisierer 60 L, Speiseeismaschine 5\u201310 L/Charge, Reifetank; alternativ Fertigmix",
      "Lager: Tiefk\xFChlschrank/-truhe \u221225 \xB0C, Tiefk\xFChlzelle bei Eigenproduktion",
      "Zusatz: Softeismaschine, Sahnemaschine, Waffeleisen, Cr\xEApes, Siebtr\xE4ger, Gl\xE4sersp\xFCler"
    ],
    equipment: [
      { label: "Eisvitrinen & Eistheken", path: "/eismaschinen-und-eisvitrinen/eisvitrinen" },
      { label: "Eismaschinen, Softeis, Pasteurisierer", path: "/eismaschinen-und-eisvitrinen/eismaschinen" },
      { label: "Waffeleisen, Cr\xEApes", path: "/kaffee-und-bar/crepes-und-waffeleisen" },
      { label: "Siebtr\xE4germaschine, M\xFChle", path: "/kaffee-und-bar/kaffeemaschinen" },
      { label: "Tiefk\xFChltruhen, Tiefk\xFChlschrank", path: "/kuehlung/tiefkuehltruhen" },
      { label: "Gl\xE4sersp\xFCler", path: "/spueltechnik/glaeserspuelmaschinen" }
    ],
    configs: [
      { name: "Eiskiosk (Fertigeis)", items: ["Eisvitrine 12 Beh\xE4lter", "Tiefk\xFChltruhe 400 L", "Waffeleisen", "Softeismaschine Tischger\xE4t", "Kleiner Gl\xE4sersp\xFCler"] },
      { name: "Eisdiele mit Eigenproduktion", items: ["Eisvitrine 18 Beh\xE4lter ventiliert", "Pasteurisierer 60 L + Eismaschine 8 L", "Tiefk\xFChlschrank 700 L, Tiefk\xFChltruhe", "Sahnemaschine, Waffeleisen 2\xD7", "Siebtr\xE4ger 2 Gruppen", "Gl\xE4sersp\xFCler"] },
      { name: "Eiscaf\xE9 (60 Pl\xE4tze)", items: ["Eisvitrine 24 Beh\xE4lter", "Produktion: Pasteurisierer 120 L, 2\xD7 Eismaschine", "Tiefk\xFChlzelle 6 m\xB3", "Softeis 3 Sorten, Cr\xEApes, Waffeln", "Siebtr\xE4ger 2 Gruppen, Vollautomat", "Fronteinschub-Sp\xFClmaschine + Gl\xE4sersp\xFCler"] }
    ],
    regulations: [HACCP, LMHV],
    faqs: [
      { q: "Statische oder ventilierte Eisvitrine?", a: "Ventilierte Vitrinen halten die Temperatur auch bei Hitze und offenem Verkauf gleichm\xE4\xDFig; statische sind g\xFCnstiger und leiser, aber empfindlicher gegen Umgebungstemperatur." }
    ],
    keywords: ["eisdiele ausstattung", "eisdiele einrichten", "eiscaf\xE9 ausstattung", "eisdiele er\xF6ffnen", "eistheke kaufen"],
    published: true
  },
  {
    slug: "bar-club",
    name: "Bar & Club",
    h1: "Bar einrichten: K\xFChlung, Eis, Gl\xE4sersp\xFCler, Bartechnik",
    title: "Bar Ausstattung \u2013 Bark\xFChlschrank, Eisw\xFCrfelmaschine, Gl\xE4sersp\xFCler",
    description: "Bar, Club oder Lounge ausstatten: Bark\xFChlschr\xE4nke, Flaschenk\xFChler, Eisw\xFCrfelbereiter, Gl\xE4sersp\xFClmaschine, Barmixer, Saftpresse, Siebtr\xE4ger und Edelstahl-Bartheke \u2013 Beispielkonfigurationen nach G\xE4stezahl.",
    intro: "Hinter der Bar z\xE4hlt jeder Zentimeter: Unterbau-K\xFChlschr\xE4nke und Flaschenk\xFChler, ein Eisw\xFCrfelbereiter mit ausreichender Tagesleistung, ein Gl\xE4sersp\xFCler mit 2-Minuten-Programm, Barmixer und Zitruspresse. Wir planen Bartheken modular mit Edelstahl-Unterbau, Sp\xFClbecken und Ablagen.",
    planning: [
      "K\xFChlung: Bark\xFChlschrank Unterbau (2\u20133 T\xFCren), Flaschenk\xFChler, Weink\xFChlschrank, Fassk\xFChlung",
      "Eis: 25 kg/Tag f\xFCr kleine Bar, 60\u2013100 kg f\xFCr Cocktailbar, 150 kg f\xFCr Club; Vorratsbeh\xE4lter beachten",
      "Sp\xFClen: Gl\xE4sersp\xFCler 40 cm Korb mit Enth\xE4rter, Gl\xE4serpoliermaschine bei hohem Aufkommen",
      "Bartechnik: Barmixer, Zitruspresse, Crushed-Ice-Maschine, Siebtr\xE4ger f\xFCr Kaffee-Cocktails"
    ],
    equipment: [
      { label: "Bark\xFChlschr\xE4nke, Flaschenk\xFChler", path: "/kuehlung/kuehlschraenke" },
      { label: "Eisw\xFCrfelbereiter, Crushed Ice", path: "/kuehlung/eiswuerfelbereiter" },
      { label: "Gl\xE4sersp\xFClmaschine", path: "/spueltechnik/glaeserspuelmaschinen" },
      { label: "Barmixer, Saftpressen", path: "/kaffee-und-bar/saftpressen-und-barmixer" },
      { label: "Siebtr\xE4germaschine", path: "/kaffee-und-bar/kaffeemaschinen" },
      { label: "Edelstahl-Bartheke, Sp\xFClbecken", path: "/edelstahlmoebel" }
    ],
    configs: [
      { name: "Kleine Bar (40 G\xE4ste)", items: ["Bark\xFChlschrank 2 T\xFCren Glas", "Eisw\xFCrfelbereiter 25 kg", "Gl\xE4sersp\xFCler 40 cm", "Barmixer, Zitruspresse", "Sp\xFClbecken mit Brause"] },
      { name: "Cocktailbar (100 G\xE4ste)", items: ["2\xD7 Bark\xFChlschrank 3 T\xFCren", "Eisw\xFCrfelbereiter 80 kg + Crushed-Ice", "Gl\xE4sersp\xFCler + Poliermaschine", "Barmixer 2\xD7, Saftpresse elektrisch", "Siebtr\xE4ger 1 Gruppe", "Weink\xFChlschrank"] },
      { name: "Club (300+ G\xE4ste)", items: ["4\xD7 Bark\xFChlschrank, 2\xD7 Flaschenk\xFChler", "2\xD7 Eisw\xFCrfelbereiter 150 kg mit Vorratsbeh\xE4lter", "2\xD7 Gl\xE4sersp\xFCler Hauben", "Fassk\xFChlung, Zapfanlage-K\xFChlung", "Lagerk\xFChlzelle Getr\xE4nke"] }
    ],
    regulations: [HACCP, LMHV],
    faqs: [
      { q: "Wie viel Eis braucht eine Cocktailbar?", a: "Rechnen Sie 0,5\u20131 kg Eis pro Gast und Abend. F\xFCr 100 G\xE4ste also 50\u2013100 kg \u2013 ein Eisw\xFCrfelbereiter mit 80\u2013100 kg Tagesleistung und Vorratsbeh\xE4lter." }
    ],
    keywords: ["bar ausstattung", "bar einrichten", "bar equipment gastronomie", "cocktailbar ausstattung", "club ausstattung gastronomie"],
    published: true
  },
  {
    slug: "foodtruck",
    name: "Foodtruck & Verkaufsanh\xE4nger",
    h1: "Foodtruck ausstatten: kompakte Ger\xE4te f\xFCr Anh\xE4nger und Truck",
    title: "Foodtruck Ausstattung \u2013 Ger\xE4te f\xFCr Imbisswagen & Verkaufsanh\xE4nger",
    description: "Foodtruck, Imbisswagen oder Verkaufsanh\xE4nger ausstatten: Gas-Fritteuse, Grillplatte, K\xFChltisch, Getr\xE4nkek\xFChler, Wasserversorgung, Haube und Stromplanung \u2013 kompakte Serie-600-Ger\xE4te, gewichts- und anschlussoptimiert.",
    intro: "Im Foodtruck sind Platz, Gewicht und Energie begrenzt. Gasger\xE4te machen unabh\xE4ngig vom Stromanschluss, Serie-600-Ger\xE4te mit 600 mm Tiefe passen in die K\xFCchenzeile, und K\xFChltische mit Aufkantung dienen als Arbeitsfl\xE4che. Wir planen die Truck-K\xFCche als Zeile mit Gas- und Stromplan.",
    planning: [
      "Energie: Gas f\xFCr Fritteuse, Grill und Herd; 230 V (max. 16 A / 3,6 kW) f\xFCr K\xFChlung und Kleinger\xE4te oder Generator",
      "Ger\xE4te: Tiefe 600 mm, Gewicht beachten (Fritteuse mit \xD6l ca. 40 kg), Sicherung gegen Verrutschen",
      "Wasser: Frischwasser- und Abwassertank 50\u2013100 L, Boiler f\xFCr Handwaschbecken (Pflicht)",
      "L\xFCftung: Kompakthaube mit Fettfilter und Dachventilator; Gasger\xE4te brauchen Abluft"
    ],
    equipment: [
      { label: "Gas-Fritteuse Tischger\xE4t", path: "/kochgeraete/fritteusen" },
      { label: "Grillplatte, Kontaktgrill Gas", path: "/kochgeraete/grillgeraete" },
      { label: "K\xFChltisch mit Aufkantung", path: "/kuehlung/kuehltische" },
      { label: "Getr\xE4nkek\xFChlschrank Unterbau", path: "/kuehlung/kuehlschraenke" },
      { label: "Bain-Marie, Pommesw\xE4rmer", path: "/kochgeraete/warmhaltegeraete" },
      { label: "Kompakthaube, Ventilator", path: "/lueftung" },
      { label: "Handwaschbecken, Sp\xFClbecken", path: "/edelstahlmoebel/spuelbecken-und-armaturen" }
    ],
    configs: [
      { name: "Verkaufsanh\xE4nger (Pommes/Bratwurst)", items: ["Gas-Doppelfritteuse 2\xD78 L", "Gas-Grillplatte 500 mm", "Pommesw\xE4rmer", "K\xFChltisch 2 T\xFCren", "Getr\xE4nkek\xFChlschrank", "Handwaschbecken mit Boiler"] },
      { name: "Burger-Truck", items: ["Gas-Grillplatte 800 mm", "Gas-Fritteuse 2\xD710 L", "K\xFChltisch 3 T\xFCren mit Aufsatz", "Bunw\xE4rmer, Bain-Marie 2 GN", "Kompakthaube 1,5 m", "Tiefk\xFChlschrank Unterbau"] },
      { name: "Pizza-Truck", items: ["Gas-Pizzaofen 4 Pizzen", "Pizzak\xFChltisch 2 T\xFCren", "Spiralkneter 10 kg", "K\xFChlschrank Unterbau", "Getr\xE4nkek\xFChler", "Haube"] }
    ],
    regulations: [HACCP, LMHV, DGUV],
    faqs: [
      { q: "Gas oder Strom im Foodtruck?", a: "Gas f\xFCr alles, was heizt (Fritteuse, Grill, Herd); Strom nur f\xFCr K\xFChlung, Licht und Kleinger\xE4te. So reicht ein 16-A-Anschluss oder ein kleiner Generator." }
    ],
    keywords: ["foodtruck ausstattung", "foodtruck einrichten", "imbisswagen ausstattung", "verkaufsanh\xE4nger ausstattung", "foodtruck ger\xE4te"],
    published: true
  }
];
function findBranche(slug) {
  return BRANCHEN_DE.find((b) => b.slug === slug);
}
var LEGACY_SEGMENT_MAP = Object.fromEntries(
  BRANCHEN_DE.flatMap((b) => (b.legacySegments || []).map((s) => [s, `/branche/${b.slug}`]))
);

// src/content/seo/staedte.de.ts
var eigen = (days = "2\u20134 Werktage") => ({ deliveryZone: "eigen", deliveryDays: days, montageAvailable: true });
var sped = (days = "3\u20137 Werktage") => ({ deliveryZone: "spedition", deliveryDays: days, montageAvailable: false });
var STAEDTE_DE = [
  // ── Welle 1: NRW – eigene Auslieferung & Montage ──
  { slug: "koeln", name: "K\xF6ln", state: "Nordrhein-Westfalen", distanceKm: 0, ...eigen("1\u20133 Werktage"), showroomNote: "Beratung vor Ort in unserem B\xFCro in K\xF6ln-M\xFClheim (Bergisch Gladbacher Str. 172) nach Terminvereinbarung.", localMix: "K\xF6ln ist mit \xFCber 3.000 gastronomischen Betrieben die Gastro-Hauptstadt von NRW: Brauh\xE4user und K\xF6lsch-Kneipen in der Altstadt, D\xF6nerl\xE4den und Imbisse in M\xFClheim, Ehrenfeld und Kalk, Systemgastronomie in den Einkaufszentren, Hotels rund um Messe und Dom. Dazu Kantinen von Ford, RTL und Universit\xE4tsklinik.", nearby: ["leverkusen", "bonn", "duesseldorf", "bergisch-gladbach"], references: [], faqs: [{ q: "Liefern Sie in K\xF6ln selbst aus?", a: "Ja. Im K\xF6lner Stadtgebiet liefern wir Lagerware in 1\u20133 Werktagen mit eigenem Fahrzeug, auf Wunsch mit Vertragen in die K\xFCche und Aufstellung." }, { q: "Kann ich die Ger\xE4te in K\xF6ln ansehen?", a: "Wir sind kein Showroom-H\xE4ndler, beraten aber pers\xF6nlich in unserem B\xFCro in K\xF6ln-M\xFClheim und planen Ihre K\xFCche gemeinsam am Bildschirm in 3D." }], wave: 1, published: true },
  { slug: "bonn", name: "Bonn", state: "Nordrhein-Westfalen", distanceKm: 30, ...eigen(), localMix: "Bonn verbindet Beh\xF6rden- und UN-Kantinen mit einer dichten Restaurant- und Caf\xE9szene in der Innenstadt und Poppelsdorf; im Umland Rhein-Sieg viele Hotels, Landgasth\xF6fe und B\xE4ckereien.", nearby: ["koeln", "siegburg", "koblenz"], references: [], faqs: [{ q: "Wie schnell liefern Sie nach Bonn?", a: "Lagerware in 2\u20134 Werktagen mit eigenem Fahrzeug, inklusive Vertragen und Aufstellung auf Wunsch." }], wave: 1, published: true },
  { slug: "leverkusen", name: "Leverkusen", state: "Nordrhein-Westfalen", distanceKm: 15, ...eigen("1\u20133 Werktage"), localMix: "Leverkusen: Betriebsgastronomie im Chempark und bei Bayer, Stadionsgastronomie, Imbisse und Restaurants in Wiesdorf und Opladen.", nearby: ["koeln", "duesseldorf", "bergisch-gladbach"], references: [], faqs: [{ q: "Lieferung nach Leverkusen?", a: "Leverkusen liegt in unserer Kernzone: Lieferung in 1\u20133 Werktagen, Montage m\xF6glich." }], wave: 1, published: true },
  { slug: "duesseldorf", name: "D\xFCsseldorf", state: "Nordrhein-Westfalen", distanceKm: 45, ...eigen(), localMix: "D\xFCsseldorf: Altstadt-Brauh\xE4user, Japanviertel mit Ramen- und Sushi-Restaurants, Messehotels, Sternegastronomie in Oberkassel, Kantinen der Konzernzentralen und Landesbeh\xF6rden.", nearby: ["koeln", "neuss", "krefeld", "wuppertal"], references: [], faqs: [{ q: "Liefern Sie nach D\xFCsseldorf mit Montage?", a: "Ja, D\xFCsseldorf geh\xF6rt zu unserer Auslieferungszone: 2\u20134 Werktage, Vertragen und Aufstellung auf Wunsch." }], wave: 1, published: true },
  { slug: "aachen", name: "Aachen", state: "Nordrhein-Westfalen", distanceKm: 70, ...eigen("2\u20135 Werktage"), localMix: "Aachen: Studentengastronomie rund um die RWTH, Mensen, Printen-B\xE4ckereien, grenznahe Gastronomie zu Belgien und den Niederlanden, Klinikum Aachen.", nearby: ["koeln", "dueren", "moenchengladbach"], references: [], faqs: [{ q: "Lieferung nach Aachen?", a: "Aachen beliefern wir mit eigenem Fahrzeug in 2\u20135 Werktagen; Montage nach Absprache." }], wave: 1, published: true },
  { slug: "essen", name: "Essen", state: "Nordrhein-Westfalen", distanceKm: 75, ...eigen("2\u20135 Werktage"), localMix: "Essen: Kantinen von RWE, Evonik und Thyssenkrupp, Messe- und Kongressgastronomie, Restaurants in R\xFCttenscheid, Systemgastronomie im Limbecker Platz, Universit\xE4tsklinikum.", nearby: ["duisburg", "bochum", "gelsenkirchen", "dortmund"], references: [], faqs: [{ q: "Wie liefern Sie ins Ruhrgebiet?", a: "Essen und das Ruhrgebiet bedienen wir mit eigenem Fahrzeug in 2\u20135 Werktagen, gr\xF6\xDFere Projekte mit Montageteam." }], wave: 1, published: true },
  { slug: "dortmund", name: "Dortmund", state: "Nordrhein-Westfalen", distanceKm: 95, ...eigen("2\u20135 Werktage"), localMix: "Dortmund: Stadiongastronomie am Signal Iduna Park, Brauereigastst\xE4tten, Kantinen von Logistik und Versicherungen, D\xF6nerl\xE4den in der Nordstadt, Klinikum Dortmund.", nearby: ["bochum", "essen", "hagen"], references: [], faqs: [{ q: "Liefern Sie nach Dortmund?", a: "Ja, mit eigenem Fahrzeug in 2\u20135 Werktagen; Montage auf Anfrage." }], wave: 1, published: true },
  { slug: "duisburg", name: "Duisburg", state: "Nordrhein-Westfalen", distanceKm: 65, ...eigen("2\u20135 Werktage"), localMix: "Duisburg: Hafen- und Industriekantinen, gro\xDFe t\xFCrkische und arabische Gastronomie in Marxloh und Hochfeld, Restaurants am Innenhafen, Universit\xE4t Duisburg-Essen.", nearby: ["essen", "duesseldorf", "krefeld", "oberhausen"], references: [], faqs: [{ q: "Lieferung nach Duisburg?", a: "Duisburg liegt in unserer Auslieferungszone: 2\u20135 Werktage, Vertragen und Aufstellung m\xF6glich." }], wave: 1, published: true },
  { slug: "wuppertal", name: "Wuppertal", state: "Nordrhein-Westfalen", distanceKm: 55, ...eigen("2\u20134 Werktage"), localMix: "Wuppertal: Restaurants und Caf\xE9s in Elberfeld und Barmen, B\xE4ckereien mit Filialnetz im Bergischen Land, Kantinen von Bayer und Vorwerk, Helios Klinikum.", nearby: ["duesseldorf", "solingen", "remscheid", "koeln"], references: [], faqs: [{ q: "Liefern Sie ins Bergische Land?", a: "Ja, Wuppertal, Solingen und Remscheid beliefern wir in 2\u20134 Werktagen mit eigenem Fahrzeug." }], wave: 1, published: true },
  { slug: "moenchengladbach", name: "M\xF6nchengladbach", state: "Nordrhein-Westfalen", distanceKm: 65, ...eigen("2\u20135 Werktage"), localMix: "M\xF6nchengladbach: Stadiongastronomie im Borussia-Park, Restaurants in der Altstadt, Hotels und Tagungsh\xE4user, Betriebsverpflegung im Nordpark, viele Imbisse und B\xE4ckereien im Niederrhein-Umland.", nearby: ["duesseldorf", "krefeld", "aachen"], references: [], faqs: [{ q: "Lieferung nach M\xF6nchengladbach?", a: "M\xF6nchengladbach und der Niederrhein: 2\u20135 Werktage mit eigenem Fahrzeug, Montage nach Absprache." }], wave: 1, published: true },
  { slug: "bochum", name: "Bochum", state: "Nordrhein-Westfalen", distanceKm: 85, ...eigen("2\u20135 Werktage"), localMix: "Bochum: Bermuda3Eck mit \xFCber 60 Gastronomiebetrieben, Mensen der Ruhr-Universit\xE4t, Starlight-Express-Gastronomie, Kantinen und B\xE4ckereien im Ruhrgebiet.", nearby: ["essen", "dortmund", "gelsenkirchen"], references: [], faqs: [{ q: "Liefern Sie nach Bochum?", a: "Ja, in 2\u20135 Werktagen mit eigenem Fahrzeug; Aufstellung und Montage auf Wunsch." }], wave: 1, published: true },
  { slug: "muenster", name: "M\xFCnster", state: "Nordrhein-Westfalen", distanceKm: 150, ...sped("3\u20135 Werktage"), localMix: "M\xFCnster: Studentische Gastronomie und Mensen, Caf\xE9s und Restaurants in der Altstadt, Hotels, Universit\xE4tsklinikum, landwirtschaftlich gepr\xE4gtes Umland mit Hofcaf\xE9s und Landgasth\xF6fen.", nearby: ["dortmund", "osnabrueck", "bielefeld"], references: [], faqs: [{ q: "Wie liefern Sie nach M\xFCnster?", a: "Per Spedition frei Bordsteinkante in 3\u20135 Werktagen; Vertragen und Montage auf Anfrage \xFCber Partnerbetriebe." }], wave: 1, published: true },
  // ── Welle 2: Großstädte bundesweit (Spedition) ──
  { slug: "berlin", name: "Berlin", state: "Berlin", distanceKm: 575, ...sped("3\u20136 Werktage"), localMix: "Berlin ist mit \xFCber 12.000 Gastronomiebetrieben der gr\xF6\xDFte Gastromarkt Deutschlands: D\xF6nerl\xE4den (\xFCber 1.000), Systemgastronomie, Hotels, Clubs, Kantinen von Beh\xF6rden und Start-ups, Streetfood-M\xE4rkte.", nearby: ["potsdam", "leipzig", "hamburg"], references: [], faqs: [{ q: "Liefern Sie nach Berlin?", a: "Ja, per Spedition frei Bordsteinkante in 3\u20136 Werktagen; Vertragen und Aufstellung \xFCber Partnerbetriebe auf Anfrage." }], wave: 2, published: false },
  { slug: "hamburg", name: "Hamburg", state: "Hamburg", distanceKm: 425, ...sped("3\u20136 Werktage"), localMix: "Hamburg: Hafen- und Fischgastronomie, Hotels an Alster und HafenCity, Kantinen von Airbus, Otto und Hafenbetrieben, Schanzenviertel und St. Pauli mit dichter Bar- und Imbissszene.", nearby: ["bremen", "kiel", "hannover"], references: [], faqs: [{ q: "Lieferung nach Hamburg?", a: "Per Spedition in 3\u20136 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  { slug: "muenchen", name: "M\xFCnchen", state: "Bayern", distanceKm: 575, ...sped("3\u20136 Werktage"), localMix: "M\xFCnchen: Bierg\xE4rten und Wirtsh\xE4user, Wiesn-Gastronomie, Hotels der Messe- und Kongressstadt, Kantinen von BMW, Siemens und Allianz, hochpreisige Restaurantszene in Schwabing und Maxvorstadt.", nearby: ["augsburg", "nuernberg", "stuttgart"], references: [], faqs: [{ q: "Liefern Sie nach M\xFCnchen?", a: "Ja, per Spedition in 3\u20136 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  { slug: "frankfurt", name: "Frankfurt am Main", state: "Hessen", distanceKm: 190, ...sped("2\u20135 Werktage"), localMix: "Frankfurt: Messe- und Flughafengastronomie, Bankenkantinen, Apfelweinwirtschaften in Sachsenhausen, internationale K\xFCche im Bahnhofsviertel, gro\xDFe Hotellerie.", nearby: ["wiesbaden", "mainz", "darmstadt"], references: [], faqs: [{ q: "Lieferung nach Frankfurt?", a: "Frankfurt erreichen wir per Spedition in 2\u20135 Werktagen; bei gr\xF6\xDFeren Projekten auch mit eigenem Fahrzeug und Montage." }], wave: 2, published: false },
  { slug: "stuttgart", name: "Stuttgart", state: "Baden-W\xFCrttemberg", distanceKm: 370, ...sped("3\u20135 Werktage"), localMix: "Stuttgart: Kantinen von Daimler, Porsche und Bosch, Weinstuben und Besenwirtschaften, Messe- und Flughafengastronomie, Hotels und Systemgastronomie in der K\xF6nigstra\xDFe.", nearby: ["karlsruhe", "mannheim", "ulm"], references: [], faqs: [{ q: "Liefern Sie nach Stuttgart?", a: "Per Spedition in 3\u20135 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  { slug: "hannover", name: "Hannover", state: "Niedersachsen", distanceKm: 300, ...sped("3\u20135 Werktage"), localMix: "Hannover: Messegastronomie, Hotels, Kantinen von VW Nutzfahrzeuge und Continental, Medizinische Hochschule, Restaurants in der List und Linden.", nearby: ["braunschweig", "bielefeld", "hamburg"], references: [], faqs: [{ q: "Lieferung nach Hannover?", a: "Per Spedition in 3\u20135 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  { slug: "nuernberg", name: "N\xFCrnberg", state: "Bayern", distanceKm: 430, ...sped("3\u20136 Werktage"), localMix: "N\xFCrnberg: Bratwurstk\xFCchen und Altstadtgastronomie, Christkindlesmarkt, Messehotels, Kantinen von Siemens und Datev, Klinikum N\xFCrnberg.", nearby: ["muenchen", "wuerzburg", "regensburg"], references: [], faqs: [{ q: "Lieferung nach N\xFCrnberg?", a: "Per Spedition in 3\u20136 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  { slug: "leipzig", name: "Leipzig", state: "Sachsen", distanceKm: 500, ...sped("3\u20136 Werktage"), localMix: "Leipzig: Wachsende Gastroszene in Plagwitz und S\xFCdvorstadt, Messe- und Kongressgastronomie, Kantinen von BMW, Porsche und DHL, Universit\xE4tsklinikum.", nearby: ["halle", "dresden", "berlin"], references: [], faqs: [{ q: "Liefern Sie nach Leipzig?", a: "Ja, per Spedition in 3\u20136 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  { slug: "dresden", name: "Dresden", state: "Sachsen", distanceKm: 570, ...sped("3\u20136 Werktage"), localMix: "Dresden: Touristische Gastronomie in Altstadt und Neustadt, Hotels, Kantinen von Infineon und Globalfoundries, Universit\xE4tsklinikum, B\xE4ckereien mit Stollen-Tradition.", nearby: ["leipzig", "chemnitz", "berlin"], references: [], faqs: [{ q: "Lieferung nach Dresden?", a: "Per Spedition in 3\u20136 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  { slug: "bremen", name: "Bremen", state: "Bremen", distanceKm: 320, ...sped("3\u20135 Werktage"), localMix: "Bremen: Hafen- und Werftkantinen, Schlachte-Gastronomie an der Weser, Hotels, Mercedes-Werk und Airbus, Universit\xE4t und Klinikum Bremen-Mitte.", nearby: ["hamburg", "hannover", "oldenburg"], references: [], faqs: [{ q: "Lieferung nach Bremen?", a: "Per Spedition in 3\u20135 Werktagen frei Bordsteinkante." }], wave: 2, published: false },
  // ── Welle 3: weitere Städte ──
  { slug: "bielefeld", name: "Bielefeld", state: "Nordrhein-Westfalen", distanceKm: 190, ...sped("3\u20135 Werktage"), localMix: "Bielefeld: Kantinen von Dr. Oetker, Miele-Umland und Sch\xFCco, Universit\xE4t, Restaurants in der Altstadt, B\xE4ckereien in Ostwestfalen-Lippe.", nearby: ["muenster", "hannover", "paderborn"], references: [], faqs: [], wave: 3, published: false },
  { slug: "karlsruhe", name: "Karlsruhe", state: "Baden-W\xFCrttemberg", distanceKm: 300, ...sped("3\u20135 Werktage"), localMix: "Karlsruhe: Studentengastronomie am KIT, Mensen, Kantinen von EnBW und Bundesgerichten, Restaurants in der Oststadt und Durlach.", nearby: ["stuttgart", "mannheim", "heidelberg"], references: [], faqs: [], wave: 3, published: false },
  { slug: "mannheim", name: "Mannheim", state: "Baden-W\xFCrttemberg", distanceKm: 260, ...sped("3\u20135 Werktage"), localMix: "Mannheim: Kantinen von BASF (Ludwigshafen), Roche und John Deere, Universit\xE4tsklinikum, Restaurants in den Quadraten, Jungbusch-Barszene, Hotels der Kongressstadt.", nearby: ["heidelberg", "ludwigshafen", "frankfurt"], references: [], faqs: [], wave: 3, published: false },
  { slug: "augsburg", name: "Augsburg", state: "Bayern", distanceKm: 540, ...sped("3\u20136 Werktage"), localMix: "Augsburg: Altstadtgastronomie, Hotels, Kantinen von MAN, Kuka und Premium Aerotec, Universit\xE4tsklinikum, Brauereigastst\xE4tten.", nearby: ["muenchen", "ulm", "nuernberg"], references: [], faqs: [], wave: 3, published: false },
  { slug: "wiesbaden", name: "Wiesbaden", state: "Hessen", distanceKm: 180, ...sped("2\u20135 Werktage"), localMix: "Wiesbaden: Kur- und Kongressgastronomie, Hotels, Landesbeh\xF6rden-Kantinen, Restaurants in der Innenstadt und im Rheingau-Umland mit Weing\xFCtern.", nearby: ["mainz", "frankfurt", "koblenz"], references: [], faqs: [], wave: 3, published: false },
  { slug: "mainz", name: "Mainz", state: "Rheinland-Pfalz", distanceKm: 170, ...sped("2\u20135 Werktage"), localMix: "Mainz: Weinstuben in der Altstadt, ZDF- und Landesbeh\xF6rden-Kantinen, Universit\xE4tsmedizin, Hotels, B\xE4ckereien und Metzgereien in Rheinhessen.", nearby: ["wiesbaden", "frankfurt", "koblenz"], references: [], faqs: [], wave: 3, published: false },
  { slug: "freiburg", name: "Freiburg", state: "Baden-W\xFCrttemberg", distanceKm: 430, ...sped("3\u20136 Werktage"), localMix: "Freiburg: Touristische Gastronomie in der Altstadt, Studentenmensen, Hotels im Schwarzwald-Umland, Universit\xE4tsklinikum, Weingastronomie im Kaiserstuhl.", nearby: ["karlsruhe", "stuttgart", "basel"], references: [], faqs: [], wave: 3, published: false },
  { slug: "kiel", name: "Kiel", state: "Schleswig-Holstein", distanceKm: 520, ...sped("3\u20136 Werktage"), localMix: "Kiel: Hafen- und Fischgastronomie, Kieler-Woche-Catering, Marine- und Werftkantinen, Universit\xE4tsklinikum, Hotels an der F\xF6rde.", nearby: ["hamburg", "luebeck", "flensburg"], references: [], faqs: [], wave: 3, published: false },
  { slug: "kassel", name: "Kassel", state: "Hessen", distanceKm: 250, ...sped("3\u20135 Werktage"), localMix: "Kassel: documenta-Gastronomie, Kantinen von VW-Werk Baunatal und Bombardier, Klinikum, Restaurants am Bergpark und in der Innenstadt.", nearby: ["goettingen", "hannover", "frankfurt"], references: [], faqs: [], wave: 3, published: false },
  { slug: "koblenz", name: "Koblenz", state: "Rheinland-Pfalz", distanceKm: 110, ...sped("2\u20134 Werktage"), localMix: "Koblenz: Rhein- und Moselgastronomie, Weinhotels, Bundeswehr-Kantinen, Restaurants am Deutschen Eck, B\xE4ckereien und Metzgereien im Mittelrheintal.", nearby: ["bonn", "mainz", "trier"], references: [], faqs: [], wave: 3, published: false }
];
function findCity(slug) {
  return STAEDTE_DE.find((c) => c.slug === slug);
}

// src/seo/routes.ts
var STATIC_PAGES = {
  "ueber-uns": { info: "about", title: "\xDCber uns \u2013 2MC Gastro K\xF6ln", description: "Gewerbliche K\xFCchentechnik aus K\xF6ln: Diamond, CombiSteel und HENDI in einem Katalog, kostenlose 2D/3D-K\xFCchenplanung, projektbezogene Angebote und Lieferung in ganz Deutschland." },
  "karriere": { info: "careers", title: "Karriere bei 2MC Gastro", description: "Initiativbewerbungen in Vertrieb, Projektplanung, Logistik und Software sind jederzeit willkommen." },
  "versand": { info: "shipping", title: "Versand & Lieferung \u2013 Paket, Spedition, Lieferzeiten", description: "Paketversand mit DHL/UPS/DPD, Gro\xDFger\xE4te per Spedition frei Bordsteinkante, auf Wunsch Vertragen und Montage. Lieferzeiten und Versandkosten im \xDCberblick." },
  "newsletter": { info: "newsletter", title: "Newsletter \u2013 Neue Produkte & Aktionen", description: "Neue Produkte, Aktionen und Branchentrends einmal im Monat per E-Mail. Jederzeit abbestellbar." },
  "impressum": { info: "imprint", title: "Impressum \u2013 2MC Gastro GmbH", description: "Anbieterkennzeichnung gem\xE4\xDF \xA7 5 TMG: 2MC Gastro GmbH, Bergisch Gladbacher Str. 172, 51063 K\xF6ln." },
  "datenschutz": { info: "privacy", title: "Datenschutzerkl\xE4rung", description: "Informationen zur Verarbeitung personenbezogener Daten auf www.2mcgastro.de gem\xE4\xDF DSGVO." },
  "agb": { info: "terms", title: "Allgemeine Gesch\xE4ftsbedingungen (AGB)", description: "AGB der 2MC Gastro GmbH f\xFCr Lieferungen und Leistungen an gewerbliche Kunden." },
  "widerruf": { info: "cancellation", title: "Widerrufsbelehrung", description: "Widerrufsrecht und Widerrufsformular f\xFCr Verbraucher." },
  "cookie-richtlinie": { info: "cookies", title: "Cookie-Richtlinie", description: "Welche Cookies www.2mcgastro.de einsetzt und wie Sie Ihre Einwilligung verwalten." }
};
var APP_PREFIXES = [
  "dashboard",
  "design",
  "3d-design",
  "bom",
  "katalog",
  "checkout",
  "kitchen-planner",
  "cart",
  "favorites",
  "orders",
  "teklifler",
  "projects",
  "settings",
  "profile",
  "payment",
  "account",
  "developers",
  "admin",
  "login",
  "register",
  "pending-approval",
  "forgot-password",
  "old-welcome",
  "welcome",
  "degisiklikler",
  "changelog",
  "support",
  "docs",
  "resources",
  "tools",
  "brand",
  "diamond",
  "combisteel",
  "magaza",
  "urunler",
  "kategori",
  "sektor",
  "marka",
  "compare",
  "help",
  "catalog",
  "about",
  "careers",
  "shipping",
  "imprint",
  "privacy",
  "terms",
  "cancellation",
  "cookies",
  "suche"
];
function parseQuery(qs) {
  const out = {};
  if (!qs) return out;
  for (const part of qs.replace(/^\?/, "").split("&")) {
    if (!part) continue;
    const [k, v = ""] = part.split("=");
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      out[k] = v;
    }
  }
  return out;
}
function route(kind, locale, path, params = {}, query = {}) {
  return { kind, locale, path, params, query };
}
function matchSeoRoute(url) {
  const [rawPath, qs = ""] = url.split("?");
  const decoded = (() => {
    try {
      return decodeURIComponent(rawPath);
    } catch {
      return rawPath;
    }
  })();
  const { locale, path: p0 } = splitLocale(decoded);
  const path = p0.length > 1 ? p0.replace(/\/+$/, "") : p0;
  const query = parseQuery(qs);
  const seg = path.split("/").filter(Boolean);
  if (seg.length === 0) return route("home", locale, "/", {}, query);
  const [a2, b, c] = seg;
  if (a2 === "produkte" && seg.length === 1) return route("shop", locale, path, {}, query);
  if (a2 === "produkt" && b && seg.length === 2) return route("product", locale, path, { slug: b }, query);
  if (a2 === "product" && b) return route("legacyProduct", locale, path, { id: seg.slice(1).join("/") }, query);
  if (a2 === "marke") {
    if (seg.length === 1) return route("brandIndex", locale, path, {}, query);
    const brand = BRANDS_DE.find((x) => x.slug === b);
    if (!brand) return route("notFound", locale, path, {}, query);
    if (seg.length === 2) return route("brand", locale, path, { brand: b }, query);
    if (seg.length === 3 && findCategory(c)) return route("brandCategory", locale, path, { brand: b, category: c }, query);
    return route("notFound", locale, path, {}, query);
  }
  if (a2 === "branche") {
    if (seg.length === 1) return route("brancheIndex", locale, path, {}, query);
    if (seg.length === 2 && BRANCHEN_DE.some((x) => x.slug === b)) return route("branche", locale, path, { slug: b }, query);
    return route("notFound", locale, path, {}, query);
  }
  if (a2 === "gastronomiebedarf") {
    if (seg.length === 1) return route("cityIndex", locale, path, {}, query);
    if (seg.length === 2 && STAEDTE_DE.some((x) => x.slug === b)) return route("city", locale, path, { slug: b }, query);
    return route("notFound", locale, path, {}, query);
  }
  if (a2 === "ratgeber") {
    if (seg.length === 1) return route("ratgeberIndex", locale, path, {}, query);
    if (seg.length === 2) return route("ratgeber", locale, path, { slug: b }, query);
    return route("notFound", locale, path, {}, query);
  }
  if (a2 === "blog") {
    if (seg.length === 1) return route("blogIndex", locale, path, {}, query);
    if (seg.length === 2) return route("blogPost", locale, path, { slug: b }, query);
    return route("notFound", locale, path, {}, query);
  }
  if (a2 === "vergleich") {
    if (seg.length === 1) return route("vergleichIndex", locale, path, {}, query);
    if (seg.length === 2) return route("vergleich", locale, path, { slug: b }, query);
    return route("notFound", locale, path, {}, query);
  }
  if (seg.length === 1 && STATIC_PAGES[a2]) return route("static", locale, path, { slug: a2 }, query);
  const cat = findCategory(a2);
  if (cat) {
    if (seg.length === 1) return route("category", locale, path, { category: a2 }, query);
    if (seg.length === 2 && findSubcategory(a2, b)) return route("subcategory", locale, path, { category: a2, subcategory: b }, query);
    return route("notFound", locale, path, {}, query);
  }
  if (APP_PREFIXES.includes(a2)) return route("app", locale, path, {}, query);
  return route("notFound", locale, path, {}, query);
}

// src/lib/companyInfo.ts
var COMPANY_INFO = {
  /** PDF başlığı/altbilgisinde ve sitede görünen marka adı. */
  name: "2MC Gastro",
  /** Yasal unvan (Impressum, AGB, Organization.legalName). */
  legalName: "2MC Gastro GmbH",
  street: "Bergisch Gladbacher Str. 172",
  zip: "51063",
  city: "K\xF6ln",
  region: "NRW",
  country: "DE",
  zipCity: "51063 K\xF6ln",
  /** Geriye dönük tek satır adres. */
  address: "Bergisch Gladbacher Str. 172, 51063 K\xF6ln",
  /** Kullanıcıya gösterilen ulusal biçim. */
  phone: "0176 70295844",
  /** Uluslararası (E.164) — tel: linkleri, JSON-LD, dizin kayıtları. */
  phoneE164: "+4917670295844",
  /** Okunabilir uluslararası biçim. */
  phoneDisplay: "+49 176 70295844",
  email: "info@2mcgastro.de",
  website: "https://www.2mcgastro.de",
  /** USt-IdNr. */
  vat: "DE365660948",
  /** Steuernummer. */
  taxNumber: "217/5338/1052",
  /** Ticaret sicili — Adem'den gelince doldurulacak (boş = Impressum'da gösterilmez). */
  register: {
    court: "",
    // örn. 'Amtsgericht Köln'
    number: "",
    // örn. 'HRB 123456'
    managingDirector: ""
    // örn. 'Metehan Çevik'
  },
  geo: { lat: 50.9648, lng: 7.0273 },
  /** Google/Schema açılış saatleri. */
  openingHours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "09:00", closes: "18:00" }
  ],
  /** YALNIZ 2MC Gastro'ya ait profiller (kardeş marka 2MC Werbung hesapları buraya YAZILMAZ). */
  sameAs: [],
  bank: {
    holder: "2MC Gastro GmbH",
    name: "TARGOBANK",
    iban: "DE96 3002 0900 5300 8138 98",
    bic: "CMCIDEDDXXX"
  },
  /** Sol üst köşedeki ana logo (2MC Gastro — WhatsApp marka görseli). */
  logoUrl: "https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/WhatsApp_Imagaae_2026-04-06_202604062102.jpeg",
  tagline: "Alles aus einer Hand. F\xFCr deine K\xFCche.",
  /** Kuruluş yılı (Organization.foundingDate). */
  foundingYear: "2010"
};

// src/lib/seo.ts
var SITE_URL = "https://www.2mcgastro.de";
var SITE_NAME = "2MC Gastro";
var DEFAULT_OG_IMAGE = `${SITE_URL}/logo-2mc-gastro.jpeg`;
var ORG_ID = `${SITE_URL}/#organization`;
var STORE_ID = `${SITE_URL}/#store`;
var WEBSITE_ID = `${SITE_URL}/#website`;
function absoluteUrl(path) {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
function buildHreflangs(path, opts = {}) {
  const { path: base } = splitLocale(path.split("?")[0]);
  const locales = opts.locales ?? INDEXABLE_LOCALES;
  const out = locales.map((l) => ({ hreflang: l, href: absoluteUrl(localePath(l, base)) }));
  out.push({ hreflang: "x-default", href: absoluteUrl(localePath(DEFAULT_LOCALE, base)) });
  return out;
}
var postalAddress = () => ({
  "@type": "PostalAddress",
  streetAddress: COMPANY_INFO.street,
  addressLocality: COMPANY_INFO.city,
  addressRegion: COMPANY_INFO.region,
  postalCode: COMPANY_INFO.zip,
  addressCountry: COMPANY_INFO.country
});
function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    legalName: COMPANY_INFO.legalName,
    url: `${SITE_URL}/`,
    logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE, width: 512, height: 512 },
    foundingDate: COMPANY_INFO.foundingYear,
    telephone: COMPANY_INFO.phoneE164,
    email: COMPANY_INFO.email,
    vatID: COMPANY_INFO.vat,
    address: postalAddress(),
    ...COMPANY_INFO.sameAs.length ? { sameAs: COMPANY_INFO.sameAs } : {},
    contactPoint: [{
      "@type": "ContactPoint",
      telephone: COMPANY_INFO.phoneE164,
      email: COMPANY_INFO.email,
      contactType: "sales",
      areaServed: ["DE", "AT", "CH", "NL", "FR", "BE", "EU"],
      availableLanguage: ["German", "Turkish", "English", "French", "Dutch"]
    }]
  };
}
function storeSchema(opts = {}) {
  return {
    "@context": "https://schema.org",
    "@type": ["Store", "LocalBusiness"],
    "@id": STORE_ID,
    name: SITE_NAME,
    image: DEFAULT_OG_IMAGE,
    url: `${SITE_URL}/`,
    telephone: COMPANY_INFO.phoneE164,
    email: COMPANY_INFO.email,
    priceRange: "\u20AC\u20AC\u20AC",
    currenciesAccepted: "EUR",
    paymentAccepted: "Vorkasse, Rechnung, PayPal, Kreditkarte, Leasing",
    address: postalAddress(),
    geo: { "@type": "GeoCoordinates", latitude: COMPANY_INFO.geo.lat, longitude: COMPANY_INFO.geo.lng },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(COMPANY_INFO.address)}`,
    openingHoursSpecification: COMPANY_INFO.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes
    })),
    parentOrganization: { "@id": ORG_ID },
    areaServed: opts.areaServedCity ? { "@type": "City", name: opts.areaServedCity } : { "@type": "Country", name: "Deutschland" }
  };
}
function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    inLanguage: "de-DE",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/produkte?q={search_term_string}` },
      "query-input": "required name=search_term_string"
    }
  };
}
function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: absoluteUrl(item.url)
    }))
  };
}
function collectionPageSchema(c) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: c.name,
    url: absoluteUrl(c.url),
    description: c.description,
    inLanguage: "de-DE",
    isPartOf: { "@id": WEBSITE_ID }
  };
}
function itemListSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.url),
      ...it.image ? { image: it.image } : {}
    }))
  };
}
function brandSchema(b) {
  return {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: b.name,
    url: absoluteUrl(b.url),
    ...b.logo ? { logo: b.logo } : {},
    ...b.description ? { description: b.description } : {}
  };
}
function productSchema(p3) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p3.name,
    description: p3.description,
    image: p3.image,
    sku: p3.sku,
    ...p3.mpn ? { mpn: p3.mpn } : {},
    ...p3.gtin13 ? { gtin13: p3.gtin13 } : {},
    ...p3.category ? { category: p3.category } : {},
    brand: p3.brand ? { "@type": "Brand", name: p3.brand } : void 0,
    offers: p3.price != null && p3.price > 0 ? {
      "@type": "Offer",
      price: Number(p3.price.toFixed(2)),
      priceCurrency: p3.currency || "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: Number(p3.price.toFixed(2)),
        priceCurrency: p3.currency || "EUR",
        valueAddedTaxIncluded: false
      },
      availability: `https://schema.org/${p3.availability || "InStock"}`,
      itemCondition: "https://schema.org/NewCondition",
      url: p3.url ? absoluteUrl(p3.url) : void 0,
      seller: { "@id": ORG_ID },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "DE" }
      }
    } : void 0,
    aggregateRating: p3.rating && p3.rating.count > 0 ? {
      "@type": "AggregateRating",
      ratingValue: p3.rating.value,
      reviewCount: p3.rating.count,
      bestRating: 5,
      worstRating: 1
    } : void 0
  };
}
function articleSchema(a2) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a2.title,
    description: a2.description,
    image: a2.image ? absoluteUrl(a2.image) : DEFAULT_OG_IMAGE,
    datePublished: a2.datePublished,
    dateModified: a2.dateModified || a2.datePublished,
    inLanguage: a2.inLanguage || "de-DE",
    author: { "@type": a2.authorType || "Organization", name: a2.author || `${SITE_NAME} Redaktion` },
    publisher: {
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE }
    },
    mainEntityOfPage: absoluteUrl(a2.url)
  };
}
function faqSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer }
    }))
  };
}

// src/content/blog/posts.ts
var BLOG_POSTS = [
  {
    slug: "endustriyel-mutfak-kurulum-rehberi-2026",
    title: "End\xFCstriyel Mutfak Kurulum Rehberi: S\u0131f\u0131rdan Profesyonel Mutfa\u011Fa",
    description: "Restoran, otel ve catering i\xE7in end\xFCstriyel mutfak kurulumunun t\xFCm a\u015Famalar\u0131: alan planlama, ekipman se\xE7imi, HACCP uyumu ve b\xFCt\xE7eleme.",
    excerpt: "Yeni bir restoran m\u0131 a\xE7\u0131yorsunuz ya da mevcut mutfa\u011F\u0131n\u0131z\u0131 yenilemek mi istiyorsunuz? Bu rehber, s\u0131f\u0131rdan profesyonel mutfak kurulumunun her a\u015Famas\u0131n\u0131 ad\u0131m ad\u0131m anlat\u0131yor.",
    category: "Kurulum",
    tags: ["end\xFCstriyel mutfak", "kurulum", "HACCP", "planlama"],
    author: "2MC Gastro",
    datePublished: "2026-01-15",
    readingMinutes: 12,
    image: "/logo-2mc-gastro.jpeg",
    body: `## 1. Alan ve Kapasite Planlamas\u0131

End\xFCstriyel mutfak kurulumunun ilk ad\u0131m\u0131, mek\xE2n\u0131n g\xFCnl\xFCk ka\xE7 ki\u015Fiye hizmet verece\u011Fini netle\u015Ftirmektir. 100 ki\u015Filik bir restoran ile 500 ki\u015Filik bir catering i\u015Fletmesi i\xE7in gereken ekipman, enerji ve alan ihtiyac\u0131 tamamen farkl\u0131d\u0131r.

## 2. B\xF6lgeleme (Zoning) \u0130lkeleri

Profesyonel mutfaklar 5 ana b\xF6lgeye ayr\u0131l\u0131r: teslim alma, depolama, haz\u0131rl\u0131k, pi\u015Firme, servis. HACCP prensipleri gere\u011Fi \xE7i\u011F ve pi\u015Fmi\u015F \xFCr\xFCn ak\u0131\u015Flar\u0131 kesi\u015Fmemelidir.

## 3. Ekipman Se\xE7imi

- Kombi f\u0131r\u0131nlar (kapasite: personel say\u0131s\u0131na g\xF6re 6/10/20 tabak)
- End\xFCstriyel ocaklar ve frit\xF6zler
- So\u011Futma ve \u015Foklama \xFCniteleri
- Bula\u015F\u0131k ve hijyen istasyonlar\u0131

## 4. Enerji ve Havaland\u0131rma

Toplam kurulu g\xFCc\xFCn do\u011Fru hesaplanmas\u0131, hem elektrik altyap\u0131s\u0131 hem de havaland\u0131rma (davlumbaz) tasar\u0131m\u0131 i\xE7in kritiktir. Kural: mutfak alan\u0131n\u0131n her m\xB2 i\xE7in minimum 150-200 W.

## 5. HACCP Uyumu ve Sertifikasyon

CE i\u015Fareti, NSF sertifikas\u0131 ve yerel sa\u011Fl\u0131k m\xFCd\xFCrl\xFC\u011F\xFC onay\u0131 olmadan bir end\xFCstriyel mutfak faaliyete ge\xE7emez.`,
    faq: [
      {
        question: "100 ki\u015Filik bir restoran i\xE7in mutfak alan\u0131 ne kadar olmal\u0131?",
        answer: "Genel kural olarak toplam restoran alan\u0131n\u0131n %30-35'i mutfa\u011Fa ayr\u0131l\u0131r. 100 ki\u015Filik bir restoran i\xE7in 40-60 m\xB2 mutfak alan\u0131 idealdir."
      },
      {
        question: "Kombi f\u0131r\u0131n kapasitesi nas\u0131l se\xE7ilir?",
        answer: "Pik saatte ayn\u0131 anda pi\u015Firilecek tabak say\u0131s\u0131n\u0131 hesaplay\u0131n. 6-GN kombi ~50 ki\u015Fi, 10-GN ~100 ki\u015Fi, 20-GN ~200+ ki\u015Fi i\xE7in uygundur."
      }
    ]
  },
  {
    slug: "kombi-firin-secimi-6-10-20-gn-karsilastirma",
    title: "Kombi F\u0131r\u0131n Se\xE7imi: 6-GN, 10-GN ve 20-GN Kar\u015F\u0131la\u015Ft\u0131rmas\u0131",
    description: "Kombi f\u0131r\u0131n kapasitesi nas\u0131l se\xE7ilir? 6-GN, 10-GN ve 20-GN modellerinin kapasite, enerji t\xFCketimi ve maliyet kar\u015F\u0131la\u015Ft\u0131rmas\u0131.",
    excerpt: "Kombi f\u0131r\u0131n, modern end\xFCstriyel mutfa\u011F\u0131n kalbidir. Ancak yanl\u0131\u015F kapasite se\xE7imi, hem operasyonel verimlili\u011Fi hem de yat\u0131r\u0131m geri d\xF6n\xFC\u015F\xFCn\xFC olumsuz etkiler.",
    category: "Ekipman",
    tags: ["kombi f\u0131r\u0131n", "pi\u015Firme", "ekipman se\xE7imi"],
    author: "2MC Gastro",
    datePublished: "2026-01-22",
    readingMinutes: 8,
    image: "/logo-2mc-gastro.jpeg",
    body: `## 6-GN Kombi F\u0131r\u0131n

K\xFC\xE7\xFCk restoranlar, kafe ve butik oteller i\xE7in idealdir. Tek servis d\xF6neminde ~50 ki\u015Fiye kadar kapasite sunar. Enerji t\xFCketimi d\xFC\u015F\xFCk, tezg\xE2h \xFCst\xFC veya zemin modeli se\xE7ilebilir.

## 10-GN Kombi F\u0131r\u0131n

Orta \xF6l\xE7ekli restoranlar, bistrolar ve oteller i\xE7in en \xE7ok tercih edilen kapasitedir. ~100 ki\u015Filik servisi rahatl\u0131kla kar\u015F\u0131lar.

## 20-GN Kombi F\u0131r\u0131n

B\xFCy\xFCk oteller, catering i\u015Fletmeleri, hastaneler ve okul mutfaklar\u0131 i\xE7in tasarlanm\u0131\u015Ft\u0131r. 200+ ki\u015Filik servisler, \xE7ift kap\u0131l\u0131 ve y\xFCksek enerji verimli modelleri ile standartt\u0131r.

## Karar Matrisi

- G\xFCnl\xFCk < 80 ki\u015Fi \u2192 6-GN
- G\xFCnl\xFCk 80-200 ki\u015Fi \u2192 10-GN
- G\xFCnl\xFCk 200+ ki\u015Fi \u2192 20-GN veya 2\xD710-GN`
  },
  {
    slug: "haccp-uyumlu-mutfak-tasarimi-10-kritik-nokta",
    title: "HACCP Uyumlu Mutfak Tasar\u0131m\u0131: 10 Kritik Nokta",
    description: "HACCP standartlar\u0131na uygun end\xFCstriyel mutfak tasar\u0131m\u0131nda dikkat edilmesi gereken 10 kritik kontrol noktas\u0131.",
    excerpt: "HACCP (Hazard Analysis and Critical Control Points) yaln\u0131zca bir sertifika de\u011Fil, g\u0131da g\xFCvenli\u011Finin temelidir. Mutfak tasar\u0131m\u0131n\u0131z HACCP uyumlu de\u011Filse sertifika alman\u0131z imk\xE2ns\u0131zd\u0131r.",
    category: "HACCP",
    tags: ["HACCP", "g\u0131da g\xFCvenli\u011Fi", "sertifikasyon"],
    author: "2MC Gastro",
    datePublished: "2026-02-01",
    readingMinutes: 10,
    image: "/logo-2mc-gastro.jpeg",
    body: `## 1. Tek Y\xF6nl\xFC Ak\u0131\u015F

\xC7i\u011F malzeme \u2192 haz\u0131rl\u0131k \u2192 pi\u015Firme \u2192 servis yolu kesi\u015Fmemelidir.

## 2. S\u0131cakl\u0131k Kontrol Noktalar\u0131

Her depolama ve pi\u015Firme noktas\u0131nda dijital s\u0131cakl\u0131k loglar\u0131 tutulmal\u0131d\u0131r.

## 3. El Y\u0131kama \u0130stasyonlar\u0131

Her b\xF6lgede ayr\u0131 el y\u0131kama lavabosu bulunmal\u0131d\u0131r.

## 4. Y\xFCzey Malzemeleri

T\xFCm \xE7al\u0131\u015Fma y\xFCzeyleri 304 paslanmaz \xE7elik, g\xF6zeneksiz, dezenfektan dayan\u0131kl\u0131 olmal\u0131d\u0131r.

## 5. Havaland\u0131rma ve Hava Bas\u0131nc\u0131

Temiz alanlar pozitif, kirli alanlar negatif bas\u0131n\xE7ta tutulmal\u0131d\u0131r.

## 6. At\u0131k Y\xF6netimi

At\u0131k ak\u0131\u015F\u0131 hi\xE7bir zaman temiz ak\u0131\u015F\u0131 kesmemelidir.

## 7. Ekipman Aral\u0131klar\u0131

Temizlik i\xE7in ekipmanlar aras\u0131 minimum 5 cm bo\u015Fluk b\u0131rak\u0131lmal\u0131d\u0131r.

## 8. Ayd\u0131nlatma

\xC7al\u0131\u015Fma y\xFCzeyinde minimum 500 lux ayd\u0131nlatma.

## 9. Zemin ve Drenaj

Islak zonlarda %2 e\u011Fimli, drenajl\u0131 zemin.

## 10. Kaydedilebilir Kontroller

T\xFCm kontroller dijital olarak loglanabilir olmal\u0131d\u0131r.`
  }
];

// src/content/compare/competitors.ts
var COMPETITORS = [
  {
    slug: "ggm-gastro",
    name: "GGM Gastro",
    domain: "ggmgastro.com",
    founded: 2007,
    origin: "Almanya",
    monthlyTraffic: "~4M",
    positioning: "Avrupa pazar\u0131nda geni\u015F \xFCr\xFCn yelpazesi, agresif fiyatland\u0131rma",
    strengths: [
      "\xC7ok geni\u015F \xFCr\xFCn katalo\u011Fu (15.000+)",
      "G\xFC\xE7l\xFC Almanya pazar\u0131 varl\u0131\u011F\u0131",
      "H\u0131zl\u0131 kargo a\u011F\u0131",
      "\xC7ok dilli web sitesi"
    ],
    weaknesses: [
      "3D mutfak tasar\u0131m arac\u0131 yok",
      "Anahtar teslim kurulum hizmeti s\u0131n\u0131rl\u0131",
      "T\xFCrk pazar\u0131na yerel destek yok",
      "AI destekli \xFCr\xFCn \xF6nerisi yok",
      "HACCP dan\u0131\u015Fmanl\u0131\u011F\u0131 yok"
    ],
    pricing: "low",
    productCount: 15e3,
    brands: ["GGM (kendi markas\u0131)", "Bartscher", "\xE7o\u011Funlukla white-label"],
    hasDesignTool: false,
    hasROICalc: false,
    hasMultiLang: true,
    hasInstallation: false
  },
  {
    slug: "nisbets",
    name: "Nisbets",
    domain: "nisbets.com",
    founded: 1983,
    origin: "\u0130ngiltere",
    monthlyTraffic: "~1.5M",
    positioning: "\u0130ngiltere pazar\u0131 lideri, premium markalar + servis odakl\u0131",
    strengths: [
      "Premium marka portf\xF6y\xFC (Rational, Hobart, Robot Coupe)",
      "G\xFC\xE7l\xFC B2B servis a\u011F\u0131",
      "40+ y\u0131ll\u0131k marka",
      "Geni\u015F aksesuar katalo\u011Fu"
    ],
    weaknesses: [
      "T\xFCrkiye/EU non-UK pazar\u0131na s\u0131n\u0131rl\u0131 eri\u015Fim",
      "3D tasar\u0131m st\xFCdyosu yok",
      "Brexit sonras\u0131 AB i\xE7i g\xFCmr\xFCk s\xFCrt\xFCnmesi",
      "AI sat\u0131\u015F asistan\u0131 yok",
      "Anahtar teslim mutfak projesi sunumu zay\u0131f"
    ],
    pricing: "premium",
    productCount: 3e4,
    brands: ["Rational", "Hobart", "Robot Coupe", "Vitamix", "KitchenAid"],
    hasDesignTool: false,
    hasROICalc: false,
    hasMultiLang: false,
    hasInstallation: true
  },
  {
    slug: "biggastro",
    name: "BigGastro",
    domain: "biggastro.com",
    founded: 2015,
    origin: "Polonya",
    monthlyTraffic: "~600K",
    positioning: "Do\u011Fu Avrupa odakl\u0131, fiyat-performans odakl\u0131 pazaryeri",
    strengths: [
      "Polonya/Do\u011Fu Avrupa lojistik avantaj\u0131",
      "Rekabet\xE7i fiyatlar",
      "H\u0131zl\u0131 sipari\u015F s\xFCreci"
    ],
    weaknesses: [
      "Marka \xE7e\u015Fitlili\u011Fi s\u0131n\u0131rl\u0131",
      "T\xFCrk\xE7e destek yok",
      "3D tasar\u0131m arac\u0131 yok",
      "Profesyonel proje hizmeti yok",
      "Mobil deneyim zay\u0131f",
      "AI \xFCr\xFCn \xF6nerisi yok"
    ],
    pricing: "low",
    productCount: 8e3,
    brands: ["Hendi", "Stalgast", "jerel markalar"],
    hasDesignTool: false,
    hasROICalc: false,
    hasMultiLang: false,
    hasInstallation: false
  }
];

// src/content/ratgeber/index.generated.ts
var RATGEBER_INDEX = [];

// src/content/ratgeber/types.ts
var RATGEBER_CATEGORY_LABEL = {
  kaufberatung: "Kaufberatung",
  planung: "K\xFCchenplanung",
  "hygiene-haccp": "Hygiene & HACCP",
  technik: "Technik & Betrieb",
  "recht-foerderung": "Recht & F\xF6rderung",
  news: "Neuigkeiten"
};

// src/seo/data/supabase.ts
function env(name) {
  return typeof process !== "undefined" ? process.env[name] : void 0;
}
function supabaseConfig() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) {
    console.warn("[seo/supabase] env eksik: SUPABASE_URL/VITE_SUPABASE_URL + anahtar");
    return null;
  }
  return { url: url.replace(/\/$/, ""), key };
}
async function rest(pathWithQuery, opts = {}) {
  const cfg = supabaseConfig();
  if (!cfg) return { data: [], count: null };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6e3);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${pathWithQuery}`, {
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Accept: "application/json",
        ...opts.count ? { Prefer: "count=exact" } : {}
      },
      signal: ctrl.signal
    });
    if (!res.ok) {
      console.warn(`[seo/supabase] ${res.status} ${res.statusText} for ${pathWithQuery.slice(0, 120)}`);
      return { data: [], count: null };
    }
    const data = await res.json();
    let count = null;
    const cr = res.headers.get("content-range");
    if (cr && cr.includes("/")) {
      const total = cr.split("/")[1];
      count = total === "*" ? null : Number(total);
    }
    return { data: Array.isArray(data) ? data : [], count };
  } catch (err) {
    console.warn(`[seo/supabase] fetch failed for ${pathWithQuery.slice(0, 120)}: ${err?.message || err}`);
    return { data: [], count: null };
  } finally {
    clearTimeout(timer);
  }
}
var PRODUCT_COLS = "slug,source,source_id,sku,brand,brand_slug,name_de,description_de,category_slug,subcategory_slug,price_net,image,images,in_stock,kw,width_mm,depth_mm,height_mm,weight_kg,ean,specs,is_accessory,indexable,updated_at";
var CARD_COLS = "slug,source,source_id,sku,brand,brand_slug,name_de,category_slug,subcategory_slug,price_net,image,in_stock,kw,indexable";
async function getProductBySlug(slug) {
  const { data } = await rest(`product_seo?select=${PRODUCT_COLS}&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return data[0] ?? null;
}
async function getProductByLegacyId(id) {
  const enc = encodeURIComponent(id);
  const { data } = await rest(`product_seo?select=slug&or=(source_id.eq.${enc},sku.eq.${enc})&limit=1`);
  return data[0] ?? null;
}
async function listProducts(o) {
  const page2 = Math.max(1, o.page ?? 1);
  const per = Math.min(48, Math.max(1, o.perPage ?? 24));
  const from = (page2 - 1) * per;
  const q = [`select=${CARD_COLS}`];
  if (o.category) q.push(`category_slug=eq.${encodeURIComponent(o.category)}`);
  if (o.subcategory) q.push(`subcategory_slug=eq.${encodeURIComponent(o.subcategory)}`);
  if (o.brandSlug) q.push(`brand_slug=eq.${encodeURIComponent(o.brandSlug)}`);
  if (o.indexableOnly !== false) q.push("indexable=eq.true");
  q.push("order=sort_rank.asc,price_net.desc.nullslast,name_de.asc");
  q.push(`offset=${from}`, `limit=${per}`);
  const { data, count } = await rest(`product_seo?${q.join("&")}`, { count: true });
  return { rows: data, total: count ?? data.length };
}
var _countsCache = null;
async function getCounts() {
  if (_countsCache && Date.now() - _countsCache.at < 5 * 6e4) return _countsCache.rows;
  const { data } = await rest("product_seo_counts?select=category_slug,subcategory_slug,brand_slug,n&limit=2000");
  _countsCache = { at: Date.now(), rows: data };
  return data;
}
function sumCounts(rows, f) {
  return rows.filter(f).reduce((s, r) => s + Number(r.n || 0), 0);
}
async function getRelated(row, limit = 8) {
  if (!row.category_slug) return [];
  const q = [`select=${CARD_COLS}`, `category_slug=eq.${encodeURIComponent(row.category_slug)}`, "indexable=eq.true", `slug=neq.${encodeURIComponent(row.slug)}`];
  if (row.subcategory_slug) q.push(`subcategory_slug=eq.${encodeURIComponent(row.subcategory_slug)}`);
  q.push("order=sort_rank.asc,price_net.desc.nullslast", `limit=${limit}`);
  const { data } = await rest(`product_seo?${q.join("&")}`);
  return data;
}

// src/seo/render/html.ts
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fmtNet(n) {
  if (n == null || !(n > 0)) return "Preis auf Anfrage";
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20AC zzgl. MwSt.`;
}
function a(locale, path, text, attrs = "") {
  return `<a href="${esc(localePath(locale, path))}"${attrs ? " " + attrs : ""}>${esc(text)}</a>`;
}
function ul2(items) {
  return items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "";
}
function breadcrumbNav(locale, items) {
  const parts = items.map(
    (it, i) => i === items.length - 1 ? `<span aria-current="page">${esc(it.name)}</span>` : a(locale, it.url, it.name)
  );
  return `<nav aria-label="Breadcrumb"><ol>${parts.map((p3) => `<li>${p3}</li>`).join("")}</ol></nav>`;
}
function faqHtml(faqs, heading = "H\xE4ufige Fragen") {
  if (!faqs.length) return "";
  return `<section><h2>${esc(heading)}</h2>${faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}</section>`;
}
function productCardHtml(locale, p3) {
  const img = p3.image ? `<img src="${esc(p3.image)}" alt="${esc(p3.name_de)}" loading="lazy" width="300" height="300">` : "";
  return `<li>${img}<a href="${esc(localePath(locale, `/produkt/${p3.slug}`))}">${esc(p3.name_de)}</a> <small>${esc(p3.brand)} \xB7 ${esc(p3.sku)}</small> <span>${esc(fmtNet(p3.price_net))}</span></li>`;
}
function productGridHtml(locale, rows, heading) {
  if (!rows.length) return "";
  return `<section>${heading ? `<h2>${esc(heading)}</h2>` : ""}<ul>${rows.map((r) => productCardHtml(locale, r)).join("")}</ul></section>`;
}
function paginationHtml(locale, basePath, page2, total, per) {
  const pages = Math.max(1, Math.ceil(total / per));
  if (pages <= 1) return "";
  const link = (n, label) => a(locale, n === 1 ? basePath : `${basePath}?page=${n}`, label);
  const parts = [];
  if (page2 > 1) parts.push(link(page2 - 1, "\u2039 Zur\xFCck"));
  const start = Math.max(1, page2 - 2);
  const end = Math.min(pages, page2 + 2);
  for (let n = start; n <= end; n++) parts.push(n === page2 ? `<strong>${n}</strong>` : link(n, String(n)));
  if (page2 < pages) parts.push(link(page2 + 1, "Weiter \u203A"));
  return `<nav aria-label="Seiten">${parts.join(" ")}</nav>`;
}

// src/seo/model/common.ts
var ROBOTS_INDEX = "index, follow, max-image-preview:large, max-snippet:-1";
var ROBOTS_NOINDEX = "noindex, follow";
function makeModel(route2, o) {
  const indexableLocale = INDEXABLE_LOCALES.includes(route2.locale);
  const noindex = !!o.noindex || !indexableLocale && !o.forceIndex;
  const canonical = absoluteUrl(localePath(route2.locale, o.path)) + (o.canonicalQuery || "");
  return {
    status: o.status ?? 200,
    redirectTo: o.redirectTo,
    lang: route2.locale,
    title: o.rawTitle ? o.title : `${o.title} | ${SITE_NAME}`,
    description: o.description,
    canonical,
    alternates: !noindex && o.hreflang !== false ? buildHreflangs(o.path) : [],
    robots: noindex ? ROBOTS_NOINDEX : ROBOTS_INDEX,
    ogType: o.ogType ?? "website",
    ogImage: o.ogImage ?? DEFAULT_OG_IMAGE,
    jsonLd: o.jsonLd ?? [],
    bodyHtml: o.body,
    cacheSeconds: o.cacheSeconds ?? 3600
  };
}
function siteHeader(locale) {
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => `<li>${a(locale, `/${c.slug}`, c.name)}</li>`).join("");
  return `<header><p>${a(locale, "/", SITE_NAME)} \u2013 Gastronomiebedarf &amp; Gro\xDFk\xFCchentechnik aus K\xF6ln</p><nav aria-label="Produktkategorien"><ul>${cats}</ul></nav><nav aria-label="Service"><ul><li>${a(locale, "/produkte", "Alle Produkte")}</li><li>${a(locale, "/marke", "Marken")}</li><li>${a(locale, "/branche", "Branchenl\xF6sungen")}</li><li>${a(locale, "/ratgeber", "Ratgeber")}</li><li>${a(locale, "/3d-design", "3D-K\xFCchenplaner")}</li><li>${a(locale, "/ueber-uns", "\xDCber uns")}</li></ul></nav></header>`;
}
function siteFooter(locale) {
  const branchen = BRANCHEN_DE.filter((b) => b.published).map((b) => `<li>${a(locale, `/branche/${b.slug}`, b.name)}</li>`).join("");
  const cities = STAEDTE_DE.filter((c) => c.published).map((c) => `<li>${a(locale, `/gastronomiebedarf/${c.slug}`, `Gastronomiebedarf ${c.name}`)}</li>`).join("");
  const brands = BRANDS_DE.map((b) => `<li>${a(locale, `/marke/${b.slug}`, b.name)}</li>`).join("");
  return `<footer><section><h2>Branchen</h2><ul>${branchen}</ul></section><section><h2>Lieferung &amp; Beratung in Ihrer Region</h2><ul>${cities}</ul></section><section><h2>Marken</h2><ul>${brands}</ul></section><address><strong>${esc(COMPANY_INFO.legalName)}</strong><br>${esc(COMPANY_INFO.street)}, ${esc(COMPANY_INFO.zipCity)}, Deutschland<br>Tel.: <a href="tel:${esc(COMPANY_INFO.phoneE164)}">${esc(COMPANY_INFO.phoneDisplay)}</a> \xB7 E-Mail: <a href="mailto:${esc(COMPANY_INFO.email)}">${esc(COMPANY_INFO.email)}</a><br>Mo\u2013Sa 09:00\u201318:00 Uhr \xB7 Alle Preise netto zzgl. MwSt.</address><nav aria-label="Rechtliches"><ul><li>${a(locale, "/impressum", "Impressum")}</li><li>${a(locale, "/datenschutz", "Datenschutz")}</li><li>${a(locale, "/agb", "AGB")}</li><li>${a(locale, "/widerruf", "Widerruf")}</li><li>${a(locale, "/versand", "Versand")}</li><li><a href="${SITE_URL}/sitemap.xml">Sitemap</a></li><li><a href="${SITE_URL}/llms.txt">llms.txt</a></li></ul></nav></footer>`;
}
function page(locale, main) {
  return `${siteHeader(locale)}<main>${main}</main>${siteFooter(locale)}`;
}

// src/seo/model/pages.ts
var RATGEBER = RATGEBER_INDEX.filter((r) => r.status === "published");
var PER_PAGE = 24;
var HOME_CRUMB = { name: "Startseite", url: "/" };
function pageOf(route2) {
  const n = parseInt(route2.query.page || "1", 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}
function hasFilterQuery(route2) {
  return Object.keys(route2.query).some((k) => k !== "page");
}
function pageSuffix(n) {
  return n > 1 ? ` \u2013 Seite ${n}` : "";
}
async function homeModel(route2) {
  const L = route2.locale;
  const counts = await getCounts();
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => {
    const n = sumCounts(counts, (r) => r.category_slug === c.slug);
    return `<li>${a(L, `/${c.slug}`, c.name)}${n ? ` <small>(${n} Produkte)</small>` : ""} \u2013 ${esc(c.description.split(".")[0])}.</li>`;
  }).join("");
  const branchen = BRANCHEN_DE.filter((b) => b.published).map((b) => `<li>${a(L, `/branche/${b.slug}`, b.name)}</li>`).join("");
  const brands = BRANDS_DE.map((b) => `<li>${a(L, `/marke/${b.slug}`, b.name)} \u2013 ${esc(b.country)}</li>`).join("");
  const faqs = [
    { q: "Was ist 2MC Gastro?", a: "2MC Gastro ist ein Fachh\xE4ndler f\xFCr Gastronomiebedarf und Gro\xDFk\xFCchentechnik mit Sitz in K\xF6ln. Wir f\xFChren \xFCber 14.000 Produkte von Diamond, CombiSteel und HENDI, planen K\xFCchen kostenlos in 2D und 3D und liefern in ganz Deutschland." },
    { q: "Sind die Preise netto oder brutto?", a: "Alle Preise sind Netto-Preise f\xFCr Gewerbekunden zzgl. 19 % MwSt. Sie erhalten eine ordnungsgem\xE4\xDFe Rechnung mit ausgewiesener Umsatzsteuer." },
    { q: "Wie schnell liefern Sie?", a: "Lagerware versenden wir in der Regel innerhalb von 1\u20133 Werktagen; Gro\xDFger\xE4te per Spedition frei Bordsteinkante, in NRW mit eigenem Fahrzeug inklusive Vertragen und Aufstellung." },
    { q: "Kann ich meine K\xFCche vorab planen?", a: "Ja. Mit dem kostenlosen 3D-K\xFCchenplaner zeichnen Sie W\xE4nde, T\xFCren und Fenster, platzieren Ger\xE4te in Originalma\xDFen und erhalten aus dem Projekt direkt ein Angebot." },
    { q: "Bieten Sie Leasing oder Finanzierung an?", a: "Ja, auf Anfrage vermitteln wir Leasing und Mietkauf f\xFCr Gewerbekunden \u2013 ab einem Nettowarenwert von 1.000 \u20AC." }
  ];
  const body = page(
    L,
    `<h1>Gastronomiebedarf &amp; Gro\xDFk\xFCchentechnik aus K\xF6ln \u2013 2MC Gastro</h1><p>2MC Gastro ist Ihr Fachh\xE4ndler f\xFCr professionelle K\xFCchentechnik: \xFCber 14.000 Produkte von <strong>Diamond</strong>, <strong>CombiSteel</strong> und <strong>HENDI</strong> \u2013 Kochger\xE4te, K\xFChltechnik, Sp\xFClmaschinen, Edelstahlm\xF6bel, L\xFCftung und Kleinger\xE4te. Netto-Preise f\xFCr Gewerbekunden, kostenlose 2D/3D-K\xFCchenplanung und Lieferung in ganz Deutschland; in Nordrhein-Westfalen mit eigenem Fahrzeug und Montage.</p><section><h2>Produktkategorien</h2><ul>${cats}</ul></section><section><h2>K\xFCche planen in 2D &amp; 3D \u2013 kostenlos</h2><p>Zeichnen Sie Ihren Grundriss, platzieren Sie Ger\xE4te in Originalma\xDFen und erzeugen Sie aus dem Projekt ein Angebot. ${a(L, "/3d-design", "Zum 3D-K\xFCchenplaner")}.</p></section><section><h2>L\xF6sungen nach Branche</h2><ul>${branchen}</ul></section><section><h2>Marken</h2><ul>${brands}</ul></section><section><h2>Warum 2MC Gastro?</h2>${ul2([
      "Netto-Preise mit ordnungsgem\xE4\xDFer B2B-Rechnung, Leasing auf Anfrage",
      "Lagerware in 1\u20133 Werktagen, Gro\xDFger\xE4te per Spedition frei Bordsteinkante",
      "Pers\xF6nliche Beratung in K\xF6ln, Planung und Angebot aus einer Hand",
      "T\xE4glich aktualisierte Preise und Lagerbest\xE4nde direkt vom Hersteller",
      "Vergleich, Merkliste und Projektverwaltung f\xFCr Planer und Betreiber"
    ])}</section>` + faqHtml(faqs) + `<section><h2>Kontakt</h2><p>${esc(COMPANY_INFO.legalName)}, ${esc(COMPANY_INFO.address)} \xB7 Tel. ${esc(COMPANY_INFO.phoneDisplay)} \xB7 ${esc(COMPANY_INFO.email)}</p></section>`
  );
  return makeModel(route2, {
    title: "Gastronomiebedarf & Gro\xDFk\xFCchentechnik kaufen \u2013 K\xF6ln",
    rawTitle: false,
    description: "Gastronomiebedarf und Gro\xDFk\xFCchentechnik von Diamond, CombiSteel und HENDI: Kochger\xE4te, K\xFChlung, Sp\xFClmaschinen, Edelstahlm\xF6bel und L\xFCftung. Netto-Preise, kostenlose 3D-K\xFCchenplanung, Lieferung in ganz Deutschland \u2013 2MC Gastro K\xF6ln.",
    path: "/",
    jsonLd: [organizationSchema(), storeSchema(), websiteSchema(), faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })))],
    body,
    cacheSeconds: 1800
  });
}
async function shopModel(route2) {
  const L = route2.locale;
  const filtered = Object.keys(route2.query).length > 0;
  const counts = await getCounts();
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => {
    const n = sumCounts(counts, (r) => r.category_slug === c.slug);
    const subs = c.children.filter((s) => s.published !== false).map((s) => a(L, `/${c.slug}/${s.slug}`, s.name)).join(", ");
    return `<li>${a(L, `/${c.slug}`, c.name)}${n ? ` (${n})` : ""}<br><small>${subs}</small></li>`;
  }).join("");
  const { rows } = await listProducts({ page: 1, perPage: 24 });
  const body = page(
    L,
    breadcrumbNav(L, [HOME_CRUMB, { name: "Alle Produkte", url: "/produkte" }]) + `<h1>Alle Produkte \u2013 Gastronomiebedarf von A bis Z</h1><p>\xDCber 14.000 Artikel f\xFCr Gastronomie, Hotellerie und Gemeinschaftsverpflegung. W\xE4hlen Sie eine Kategorie oder suchen Sie nach Artikelnummer, Marke oder Ger\xE4tetyp.</p><section><h2>Kategorien</h2><ul>${cats}</ul></section>` + productGridHtml(L, rows, "Empfohlene Produkte")
  );
  return makeModel(route2, {
    title: "Alle Produkte \u2013 Gastronomiebedarf & Gro\xDFk\xFCchentechnik",
    description: "\xDCber 14.000 Produkte f\xFCr Gastronomie und Gro\xDFk\xFCche: Kochger\xE4te, K\xFChlung, Sp\xFCltechnik, Edelstahlm\xF6bel, L\xFCftung, Kleinger\xE4te. Diamond, CombiSteel, HENDI \u2013 Netto-Preise, schnelle Lieferung.",
    path: "/produkte",
    noindex: filtered,
    jsonLd: [breadcrumbSchema([HOME_CRUMB, { name: "Alle Produkte", url: "/produkte" }]), collectionPageSchema({ name: "Alle Produkte", url: "/produkte" })],
    body
  });
}
function categoryText(c) {
  return c.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`).join("");
}
async function categoryModel(route2) {
  const L = route2.locale;
  const cat = findCategory(route2.params.category);
  if (!cat) return notFoundModel(route2);
  const pg = pageOf(route2);
  const filtered = hasFilterQuery(route2);
  const [counts, list] = await Promise.all([
    getCounts(),
    listProducts({ category: cat.slug, page: pg, perPage: PER_PAGE })
  ]);
  const total = list.total;
  const subs = cat.children.filter((s) => s.published !== false).map((s) => {
    const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.subcategory_slug === s.slug);
    return `<li>${a(L, `/${cat.slug}/${s.slug}`, s.name)}${n ? ` <small>(${n})</small>` : ""} \u2013 ${esc(s.description.split(".")[0])}.</li>`;
  }).join("");
  const brands = BRANDS_DE.map((b) => {
    const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.brand_slug === b.slug);
    return n >= 12 ? `<li>${a(L, `/marke/${b.slug}/${cat.slug}`, `${cat.name} von ${b.name}`)} (${n})</li>` : "";
  }).join("");
  const related = RATGEBER.filter((r) => r.relatedCategories.includes(cat.slug)).slice(0, 6).map((r) => `<li>${a(L, `/ratgeber/${r.slug}`, r.title)}</li>`).join("");
  const siblings = CATEGORY_TREE.filter((c) => c.published && c.slug !== cat.slug).map((c) => `<li>${a(L, `/${c.slug}`, c.name)}</li>`).join("");
  const crumbs = [HOME_CRUMB, { name: cat.name, url: `/${cat.slug}` }];
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<h1>${esc(cat.h1)}${esc(pageSuffix(pg))}</h1><p>${esc(cat.intro)}</p>` + (subs ? `<section><h2>Unterkategorien</h2><ul>${subs}</ul></section>` : "") + productGridHtml(L, list.rows, `${cat.name}: ${total ? `${total} Produkte` : "Produkte"}`) + paginationHtml(L, `/${cat.slug}`, pg, total, PER_PAGE) + (pg === 1 ? categoryText(cat) : "") + (pg === 1 ? faqHtml(cat.faqs) : "") + (brands ? `<section><h2>${esc(cat.name)} nach Marke</h2><ul>${brands}</ul></section>` : "") + (related ? `<section><h2>Ratgeber zu ${esc(cat.name)}</h2><ul>${related}</ul></section>` : "") + `<section><h2>Weitere Kategorien</h2><ul>${siblings}</ul></section>`
  );
  const jsonLd = [
    breadcrumbSchema(crumbs),
    collectionPageSchema({ name: cat.h1, url: `/${cat.slug}`, description: cat.description }),
    itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || void 0 }))),
    ...pg === 1 && cat.faqs.length ? [faqSchema(cat.faqs.map((f) => ({ question: f.q, answer: f.a })))] : []
  ];
  return makeModel(route2, {
    title: `${cat.title}${pageSuffix(pg)}`,
    description: cat.description,
    path: `/${cat.slug}`,
    canonicalQuery: pg > 1 && !filtered ? `?page=${pg}` : "",
    noindex: filtered || !cat.published,
    jsonLd,
    body
  });
}
async function subcategoryModel(route2) {
  const L = route2.locale;
  const cat = findCategory(route2.params.category);
  const sub = cat ? findSubcategory(cat.slug, route2.params.subcategory) : void 0;
  if (!cat || !sub) return notFoundModel(route2);
  const pg = pageOf(route2);
  const filtered = hasFilterQuery(route2);
  const [counts, list] = await Promise.all([
    getCounts(),
    listProducts({ category: cat.slug, subcategory: sub.slug, page: pg, perPage: PER_PAGE })
  ]);
  const total = list.total;
  const thin = total < 4;
  const brands = BRANDS_DE.map((b) => {
    const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.subcategory_slug === sub.slug && r.brand_slug === b.slug);
    return n ? `<li>${esc(b.name)}: ${n} Produkte (${a(L, `/marke/${b.slug}/${cat.slug}`, `alle ${cat.name} von ${b.name}`)})</li>` : "";
  }).join("");
  const siblings = cat.children.filter((s) => s.slug !== sub.slug && s.published !== false).map((s) => `<li>${a(L, `/${cat.slug}/${s.slug}`, s.name)}</li>`).join("");
  const related = RATGEBER.filter((r) => r.relatedCategories.includes(cat.slug) || r.relatedCategories.includes(`${cat.slug}/${sub.slug}`)).slice(0, 6).map((r) => `<li>${a(L, `/ratgeber/${r.slug}`, r.title)}</li>`).join("");
  const crumbs = [HOME_CRUMB, { name: cat.name, url: `/${cat.slug}` }, { name: sub.name, url: `/${cat.slug}/${sub.slug}` }];
  const faqs = sub.faqs ?? [];
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<h1>${esc(sub.h1)}${esc(pageSuffix(pg))}</h1><p>${esc(sub.intro || sub.description)}</p>` + productGridHtml(L, list.rows, `${sub.name}: ${total ? `${total} Produkte` : "Produkte"}`) + paginationHtml(L, `/${cat.slug}/${sub.slug}`, pg, total, PER_PAGE) + (pg === 1 ? faqHtml(faqs) : "") + (brands ? `<section><h2>Nach Marke</h2><ul>${brands}</ul></section>` : "") + (related ? `<section><h2>Ratgeber</h2><ul>${related}</ul></section>` : "") + `<section><h2>Weitere ${esc(cat.name)}</h2><ul>${siblings}</ul></section><p>Zur\xFCck zu ${a(L, `/${cat.slug}`, cat.h1)}.</p>`
  );
  return makeModel(route2, {
    title: `${sub.title || sub.h1}${pageSuffix(pg)}`,
    description: sub.description,
    path: `/${cat.slug}/${sub.slug}`,
    canonicalQuery: pg > 1 && !filtered ? `?page=${pg}` : "",
    noindex: filtered || thin || sub.published === false || !cat.published,
    jsonLd: [
      breadcrumbSchema(crumbs),
      collectionPageSchema({ name: sub.h1, url: `/${cat.slug}/${sub.slug}`, description: sub.description }),
      itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || void 0 }))),
      ...pg === 1 && faqs.length ? [faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })))] : []
    ],
    body
  });
}
function productTitle(p3) {
  return `${p3.name_de} | ${p3.brand} ${p3.sku} kaufen`;
}
function productDescription(p3) {
  const bits = [];
  if (p3.kw) bits.push(`${p3.kw} kW`);
  if (p3.width_mm && p3.depth_mm && p3.height_mm) bits.push(`${Math.round(p3.width_mm)}\xD7${Math.round(p3.depth_mm)}\xD7${Math.round(p3.height_mm)} mm`);
  const price = p3.price_net && p3.price_net > 0 ? `${p3.price_net.toLocaleString("de-DE", { minimumFractionDigits: 2 })} \u20AC netto zzgl. MwSt.` : "Preis auf Anfrage";
  const base = `${p3.name_de} von ${p3.brand} (Art.-Nr. ${p3.sku})${bits.length ? " \u2013 " + bits.join(", ") : ""}. ${price}. Lieferung in ganz Deutschland, B2B-Rechnung, Beratung durch 2MC Gastro K\xF6ln.`;
  return base.length > 158 ? base.slice(0, 155).replace(/\s+\S*$/, "") + "\u2026" : base;
}
function productJsonLd(p3, crumbs) {
  return [
    breadcrumbSchema(crumbs),
    productSchema({
      name: p3.name_de,
      description: (p3.description_de || productDescription(p3)).slice(0, 5e3),
      image: p3.images && p3.images.length ? p3.images : p3.image ? [p3.image] : [],
      sku: p3.sku,
      mpn: p3.sku,
      gtin13: p3.ean && /^\d{13}$/.test(p3.ean) ? p3.ean : void 0,
      brand: p3.brand,
      price: p3.price_net && p3.price_net > 0 ? p3.price_net : void 0,
      currency: "EUR",
      availability: p3.in_stock ? "InStock" : "PreOrder",
      url: `/produkt/${p3.slug}`,
      category: p3.category_slug ? findCategory(p3.category_slug)?.name : void 0
    })
  ];
}
function productCrumbs(p3) {
  const crumbs = [HOME_CRUMB];
  const cat = p3.category_slug ? findCategory(p3.category_slug) : void 0;
  if (cat) {
    crumbs.push({ name: cat.name, url: `/${cat.slug}` });
    const sub = p3.subcategory_slug ? findSubcategory(cat.slug, p3.subcategory_slug) : void 0;
    if (sub) crumbs.push({ name: sub.name, url: `/${cat.slug}/${sub.slug}` });
  } else {
    crumbs.push({ name: "Alle Produkte", url: "/produkte" });
  }
  crumbs.push({ name: p3.name_de, url: `/produkt/${p3.slug}` });
  return crumbs;
}
async function productModel(route2) {
  const L = route2.locale;
  const p3 = await getProductBySlug(route2.params.slug);
  if (!p3) return notFoundModel(route2);
  const related = await getRelated(p3, 8);
  const crumbs = productCrumbs(p3);
  const specs = (p3.specs || []).slice(0, 40);
  const dims = [];
  if (p3.width_mm) dims.push(`Breite ${Math.round(p3.width_mm)} mm`);
  if (p3.depth_mm) dims.push(`Tiefe ${Math.round(p3.depth_mm)} mm`);
  if (p3.height_mm) dims.push(`H\xF6he ${Math.round(p3.height_mm)} mm`);
  if (p3.weight_kg) dims.push(`Gewicht ${p3.weight_kg} kg`);
  const imgs = (p3.images && p3.images.length ? p3.images : p3.image ? [p3.image] : []).slice(0, 6).map((src, i) => `<img src="${esc(src)}" alt="${esc(p3.name_de)}${i ? ` \u2013 Bild ${i + 1}` : ""}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="600" height="600">`).join("");
  const desc = p3.description_de ? p3.description_de.split(/\n+/).filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join("") : "";
  const cat = p3.category_slug ? findCategory(p3.category_slug) : void 0;
  const brand = findBrand(p3.brand_slug);
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<article><h1>${esc(p3.name_de)}</h1><p><strong>${esc(p3.brand)}</strong> \xB7 Art.-Nr. ${esc(p3.sku)}${p3.ean ? ` \xB7 EAN ${esc(p3.ean)}` : ""}</p><div>${imgs}</div><p><strong>${esc(fmtNet(p3.price_net))}</strong> \xB7 ${p3.in_stock ? "Lieferbar" : "Auf Anfrage / Bestellware"} \xB7 Lieferung in ganz Deutschland</p>` + (desc ? `<section><h2>Produktbeschreibung</h2>${desc}</section>` : "") + (dims.length || p3.kw ? `<section><h2>Ma\xDFe &amp; Anschluss</h2>${ul2([...p3.kw ? [`Leistung ${p3.kw} kW`] : [], ...dims])}</section>` : "") + (specs.length ? `<section><h2>Technische Daten</h2><table><tbody>${specs.map((s) => `<tr><th scope="row">${esc(s.label)}</th><td>${esc(s.value)}</td></tr>`).join("")}</tbody></table></section>` : "") + `<section><h2>Service von 2MC Gastro</h2>${ul2(["Netto-Preis f\xFCr Gewerbekunden, B2B-Rechnung mit ausgewiesener MwSt.", "Beratung zu Anschluss, Aufstellung und passendem Zubeh\xF6r", "Lieferung per Paket oder Spedition frei Bordsteinkante; in NRW mit Vertragen und Aufstellung", "Leasing und Mietkauf auf Anfrage", "Passt das Ger\xE4t in Ihre K\xFCche? Pr\xFCfen Sie es im kostenlosen 3D-K\xFCchenplaner"])}</section></article>` + productGridHtml(L, related, "\xC4hnliche Produkte") + (cat ? `<p>Alle ${a(L, `/${cat.slug}`, cat.name)}${brand ? ` \xB7 Alle Produkte von ${a(L, `/marke/${brand.slug}`, brand.name)}` : ""}</p>` : "")
  );
  return makeModel(route2, {
    title: productTitle(p3),
    description: productDescription(p3),
    path: `/produkt/${p3.slug}`,
    noindex: !p3.indexable,
    ogType: "product",
    ogImage: p3.image || DEFAULT_OG_IMAGE,
    jsonLd: productJsonLd(p3, crumbs),
    body,
    cacheSeconds: 3600
  });
}
async function legacyProductModel(route2) {
  const hit = await getProductByLegacyId(route2.params.id);
  if (hit) {
    return makeModel(route2, { status: 301, redirectTo: localePath(route2.locale, `/produkt/${hit.slug}`), title: "Weiterleitung", description: "", path: `/produkt/${hit.slug}`, noindex: true, body: "" });
  }
  return notFoundModel(route2);
}
async function brandIndexModel(route2) {
  const L = route2.locale;
  const counts = await getCounts();
  const items = BRANDS_DE.map((b) => {
    const n = sumCounts(counts, (r) => r.brand_slug === b.slug);
    return `<li>${a(L, `/marke/${b.slug}`, b.name)}${n ? ` (${n} Produkte)` : ""} \u2013 ${esc(b.country)}: ${esc(b.description.split(".")[0])}.</li>`;
  }).join("");
  const crumbs = [HOME_CRUMB, { name: "Marken", url: "/marke" }];
  return makeModel(route2, {
    title: "Marken \u2013 Diamond, CombiSteel, HENDI",
    description: "Unsere Hersteller: Diamond (Belgien), CombiSteel und HENDI (Niederlande) \u2013 \xFCber 14.000 Produkte f\xFCr Gastronomie und Gro\xDFk\xFCche zu Netto-Preisen bei 2MC Gastro.",
    path: "/marke",
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Marken bei 2MC Gastro</h1><p>Drei europ\xE4ische Hersteller, ein Katalog: Diamond f\xFCr modulare Kochtechnik, CombiSteel f\xFCr K\xFChlung und Edelstahl, HENDI f\xFCr Kleinger\xE4te und Bar.</p><ul>${items}</ul>`)
  });
}
async function brandModel(route2) {
  const L = route2.locale;
  const b = findBrand(route2.params.brand);
  if (!b) return notFoundModel(route2);
  const pg = pageOf(route2);
  const [counts, list] = await Promise.all([getCounts(), listProducts({ brandSlug: b.slug, page: pg, perPage: PER_PAGE })]);
  const cats = CATEGORY_TREE.filter((c) => c.published).map((c) => {
    const n = sumCounts(counts, (r) => r.brand_slug === b.slug && r.category_slug === c.slug);
    return n >= 12 ? `<li>${a(L, `/marke/${b.slug}/${c.slug}`, `${c.name} von ${b.name}`)} (${n})</li>` : n ? `<li>${a(L, `/${c.slug}`, c.name)} (${n})</li>` : "";
  }).join("");
  const crumbs = [HOME_CRUMB, { name: "Marken", url: "/marke" }, { name: b.name, url: `/marke/${b.slug}` }];
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<h1>${esc(b.h1)}${esc(pageSuffix(pg))}</h1><p>${esc(b.intro)}</p>` + (pg === 1 ? b.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`).join("") : "") + (pg === 1 ? `<section><h2>Linien &amp; Untermarken</h2>${ul2(b.subBrands.map((s) => `<strong>${esc(s.name)}</strong> \u2013 ${esc(s.note)}`))}</section>` : "") + `<section><h2>${esc(b.name)} nach Kategorie</h2><ul>${cats}</ul></section>` + productGridHtml(L, list.rows, `${b.name} Produkte`) + paginationHtml(L, `/marke/${b.slug}`, pg, list.total, PER_PAGE) + (pg === 1 ? faqHtml(b.faqs) : "")
  );
  return makeModel(route2, {
    title: `${b.title}${pageSuffix(pg)}`,
    description: b.description,
    path: `/marke/${b.slug}`,
    canonicalQuery: pg > 1 ? `?page=${pg}` : "",
    noindex: hasFilterQuery(route2),
    jsonLd: [breadcrumbSchema(crumbs), brandSchema({ name: b.name, url: `/marke/${b.slug}`, description: b.description }), itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || void 0 }))), ...pg === 1 && b.faqs.length ? [faqSchema(b.faqs.map((f) => ({ question: f.q, answer: f.a })))] : []],
    body
  });
}
async function brandCategoryModel(route2) {
  const L = route2.locale;
  const b = findBrand(route2.params.brand);
  const c = findCategory(route2.params.category);
  if (!b || !c) return notFoundModel(route2);
  const pg = pageOf(route2);
  const list = await listProducts({ brandSlug: b.slug, category: c.slug, page: pg, perPage: PER_PAGE });
  const thin = list.total < 12;
  const crumbs = [HOME_CRUMB, { name: "Marken", url: "/marke" }, { name: b.name, url: `/marke/${b.slug}` }, { name: c.name, url: `/marke/${b.slug}/${c.slug}` }];
  const subs = c.children.filter((s) => s.published !== false).map((s) => `<li>${a(L, `/${c.slug}/${s.slug}`, s.name)}</li>`).join("");
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<h1>${esc(c.name)} von ${esc(b.name)}${esc(pageSuffix(pg))}</h1><p>${esc(b.name)} (${esc(b.country)}) \u2013 ${esc(c.intro.split(".").slice(0, 2).join("."))}. ${list.total ? `${list.total} Produkte` : "Produkte"} von ${esc(b.name)} in der Kategorie ${esc(c.name)}, Netto-Preise, Lieferung in ganz Deutschland.</p>` + productGridHtml(L, list.rows) + paginationHtml(L, `/marke/${b.slug}/${c.slug}`, pg, list.total, PER_PAGE) + `<section><h2>Unterkategorien ${esc(c.name)}</h2><ul>${subs}</ul></section><p>${a(L, `/${c.slug}`, `Alle ${c.name} (alle Marken)`)} \xB7 ${a(L, `/marke/${b.slug}`, `Alle Produkte von ${b.name}`)}</p>`
  );
  return makeModel(route2, {
    title: `${c.name} von ${b.name} kaufen${pageSuffix(pg)}`,
    description: `${c.name} von ${b.name}: ${list.total ? `${list.total} Produkte` : "Produkte"} zu Netto-Preisen bei 2MC Gastro \u2013 ${c.description.split(".")[0]}. Lieferung in ganz Deutschland.`,
    path: `/marke/${b.slug}/${c.slug}`,
    canonicalQuery: pg > 1 ? `?page=${pg}` : "",
    noindex: thin || hasFilterQuery(route2),
    jsonLd: [breadcrumbSchema(crumbs), collectionPageSchema({ name: `${c.name} von ${b.name}`, url: `/marke/${b.slug}/${c.slug}` }), itemListSchema(list.rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || void 0 })))],
    body
  });
}
async function brancheIndexModel(route2) {
  const L = route2.locale;
  const items = BRANCHEN_DE.filter((b) => b.published).map((b) => `<li>${a(L, `/branche/${b.slug}`, b.h1)} \u2013 ${esc(b.description.split(".")[0])}.</li>`).join("");
  const crumbs = [HOME_CRUMB, { name: "Branchen", url: "/branche" }];
  return makeModel(route2, {
    title: "Branchenl\xF6sungen \u2013 Ausstattung nach Betriebstyp",
    description: "K\xFCchenausstattung nach Branche: Restaurant, Hotel, Pizzeria, D\xF6nerladen, Imbiss, B\xE4ckerei, Metzgerei, Kantine, Krankenhaus, Schule, Eisdiele, Bar, Foodtruck und Catering \u2013 mit Beispielkonfigurationen und Vorschriften.",
    path: "/branche",
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Ausstattung nach Branche</h1><p>Jeder Betriebstyp hat eigene Anforderungen an Kochtechnik, K\xFChlung, Ausgabe und Hygiene. W\xE4hlen Sie Ihre Branche: Sie erhalten die Grundausstattung, drei Beispielkonfigurationen und die geltenden Vorschriften \u2013 und k\xF6nnen alles direkt im 3D-K\xFCchenplaner umsetzen.</p><ul>${items}</ul>`)
  });
}
async function brancheModel(route2) {
  const L = route2.locale;
  const b = findBranche(route2.params.slug);
  if (!b) return notFoundModel(route2);
  const crumbs = [HOME_CRUMB, { name: "Branchen", url: "/branche" }, { name: b.name, url: `/branche/${b.slug}` }];
  const others = BRANCHEN_DE.filter((x) => x.published && x.slug !== b.slug).map((x) => `<li>${a(L, `/branche/${x.slug}`, x.name)}</li>`).join("");
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<article><h1>${esc(b.h1)}</h1><p>${esc(b.intro)}</p><section><h2>Planungsgrundlagen</h2>${ul2(b.planning.map(esc))}</section><section><h2>Grundausstattung</h2>${ul2(b.equipment.map((e) => `${a(L, e.path, e.label)}${e.note ? ` \u2013 ${esc(e.note)}` : ""}`))}</section><section><h2>Beispielkonfigurationen</h2>${b.configs.map((c) => `<h3>${esc(c.name)}</h3>${ul2(c.items.map(esc))}`).join("")}</section><section><h2>Vorschriften &amp; Normen</h2>${ul2(b.regulations.map((r) => `<a href="${esc(r.url)}" rel="noopener" target="_blank">${esc(r.label)}</a> \u2013 ${esc(r.note)}`))}</section><section><h2>Kostenlos planen</h2><p>\xDCbernehmen Sie eine Beispielkonfiguration in den ${a(L, "/3d-design", "3D-K\xFCchenplaner")}, passen Sie Ma\xDFe und Ger\xE4te an und erhalten Sie ein Angebot \u2013 oder ${a(L, "/support", "sprechen Sie mit uns")}.</p></section>` + faqHtml(b.faqs) + `</article><section><h2>Weitere Branchen</h2><ul>${others}</ul></section>`
  );
  return makeModel(route2, {
    title: b.title,
    description: b.description,
    path: `/branche/${b.slug}`,
    noindex: !b.published,
    jsonLd: [breadcrumbSchema(crumbs), ...b.faqs.length ? [faqSchema(b.faqs.map((f) => ({ question: f.q, answer: f.a })))] : []],
    body
  });
}
async function cityIndexModel(route2) {
  const L = route2.locale;
  const items = STAEDTE_DE.filter((c) => c.published).map((c) => `<li>${a(L, `/gastronomiebedarf/${c.slug}`, `Gastronomiebedarf ${c.name}`)} \u2013 ${c.deliveryZone === "eigen" ? "eigene Auslieferung, Montage m\xF6glich" : "Speditionsversand"}, ${esc(c.deliveryDays)}</li>`).join("");
  const crumbs = [HOME_CRUMB, { name: "Lieferregionen", url: "/gastronomiebedarf" }];
  return makeModel(route2, {
    title: "Gastronomiebedarf in Ihrer Stadt \u2013 Lieferung & Beratung",
    description: "Gastronomiebedarf mit Lieferung und Beratung in K\xF6ln, Bonn, D\xFCsseldorf, Essen, Dortmund und ganz Deutschland. Eigene Auslieferung in NRW inklusive Montage, bundesweit per Spedition.",
    path: "/gastronomiebedarf",
    jsonLd: [breadcrumbSchema(crumbs), storeSchema()],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Gastronomiebedarf in Ihrer Region</h1><p>2MC Gastro liefert von K\xF6ln aus in ganz Deutschland. In Nordrhein-Westfalen fahren wir mit eigenem Fahrzeug, vertragen und stellen auf; bundesweit versenden wir per Spedition frei Bordsteinkante. W\xE4hlen Sie Ihre Stadt f\xFCr Lieferzeiten, Montage und Ansprechpartner.</p><ul>${items}</ul>`)
  });
}
async function cityModel(route2) {
  const L = route2.locale;
  const c = findCity(route2.params.slug);
  if (!c) return notFoundModel(route2);
  const crumbs = [HOME_CRUMB, { name: "Lieferregionen", url: "/gastronomiebedarf" }, { name: c.name, url: `/gastronomiebedarf/${c.slug}` }];
  const cats = CATEGORY_TREE.filter((x) => x.published).slice(0, 8).map((x) => `<li>${a(L, `/${x.slug}`, `${x.name} f\xFCr ${c.name}`)}</li>`).join("");
  const branchen = BRANCHEN_DE.filter((b) => b.published).slice(0, 8).map((b) => `<li>${a(L, `/branche/${b.slug}`, `${b.name} in ${c.name} ausstatten`)}</li>`).join("");
  const nearby = c.nearby.map((n) => findCity(n)).filter((x) => !!x && x.published).map((x) => `<li>${a(L, `/gastronomiebedarf/${x.slug}`, x.name)}</li>`).join("");
  const delivery = c.deliveryZone === "eigen" ? `<p>${esc(c.name)} liegt ${c.distanceKm ? `rund ${c.distanceKm} km` : "direkt"} von unserem Standort in K\xF6ln entfernt und geh\xF6rt zu unserer <strong>eigenen Auslieferungszone</strong>: Lagerware liefern wir in ${esc(c.deliveryDays)} mit eigenem Fahrzeug, auf Wunsch mit Vertragen in die K\xFCche, Aufstellung und Ausrichtung${c.montageAvailable ? " sowie Montage durch unser Team" : ""}.</p>` : `<p>${esc(c.name)} liegt rund ${c.distanceKm} km von K\xF6ln entfernt. Wir liefern per <strong>Spedition frei Bordsteinkante</strong> in ${esc(c.deliveryDays)}; Vertragen und Montage organisieren wir auf Anfrage \xFCber Partnerbetriebe vor Ort. Beratung und 3D-Planung erfolgen per Video oder Telefon \u2013 Angebot und Planung sind ortsunabh\xE4ngig.</p>`;
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<article><h1>Gastronomiebedarf ${esc(c.name)} \u2013 Lieferung, Beratung, K\xFCchenplanung</h1><p>Gro\xDFk\xFCchentechnik und Gastronomiebedarf f\xFCr ${esc(c.name)} (${esc(c.state)}): Kochger\xE4te, K\xFChlung, Sp\xFCltechnik, Edelstahlm\xF6bel und L\xFCftung von Diamond, CombiSteel und HENDI \u2013 zu Netto-Preisen, mit kostenloser 2D/3D-K\xFCchenplanung.</p><section><h2>Lieferung nach ${esc(c.name)}</h2>${delivery}${c.showroomNote ? `<p>${esc(c.showroomNote)}</p>` : ""}</section><section><h2>Gastronomie in ${esc(c.name)}</h2><p>${esc(c.localMix)}</p></section><section><h2>Produkte f\xFCr Betriebe in ${esc(c.name)}</h2><ul>${cats}</ul></section><section><h2>Branchen in ${esc(c.name)}</h2><ul>${branchen}</ul></section>` + (c.references.length ? `<section><h2>Referenzen</h2>${ul2(c.references.map((r) => `${esc(r.name)} (${esc(r.type)})`))}</section>` : "") + faqHtml(c.faqs) + `</article>` + (nearby ? `<section><h2>In der N\xE4he</h2><ul>${nearby}</ul></section>` : "")
  );
  return makeModel(route2, {
    title: `Gastronomiebedarf ${c.name} \u2013 Gro\xDFk\xFCchentechnik mit Lieferung`,
    description: `Gastronomiebedarf und Gro\xDFk\xFCchentechnik f\xFCr ${c.name}: ${c.deliveryZone === "eigen" ? `eigene Auslieferung in ${c.deliveryDays}, Montage m\xF6glich` : `Lieferung per Spedition in ${c.deliveryDays}`}, Netto-Preise, kostenlose 3D-K\xFCchenplanung. Diamond, CombiSteel, HENDI \u2013 2MC Gastro K\xF6ln.`,
    path: `/gastronomiebedarf/${c.slug}`,
    noindex: !c.published,
    jsonLd: [breadcrumbSchema(crumbs), storeSchema({ areaServedCity: c.name }), ...c.faqs.length ? [faqSchema(c.faqs.map((f) => ({ question: f.q, answer: f.a })))] : []],
    body
  });
}
async function ratgeberIndexModel(route2) {
  const L = route2.locale;
  const crumbs = [HOME_CRUMB, { name: "Ratgeber", url: "/ratgeber" }];
  const items = RATGEBER.map((r) => `<li>${a(L, `/ratgeber/${r.slug}`, r.title)} <small>${esc(RATGEBER_CATEGORY_LABEL[r.category])} \xB7 ${esc(r.datePublished)}</small><br>${esc(r.description)}</li>`).join("");
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<h1>Ratgeber Gastronomiebedarf &amp; K\xFCchenplanung</h1><p>Kaufberatung, Planungshilfen und Hygiene-Wissen f\xFCr Gastronomie, Hotellerie und Gemeinschaftsverpflegung \u2013 geschrieben von der 2MC Gastro Redaktion auf Basis von Herstellerdaten, Normen und Praxis aus \xFCber 1.000 K\xFCchenprojekten.</p>` + (items ? `<ul>${items}</ul>` : `<p>Die ersten Ratgeber erscheinen in K\xFCrze. Bis dahin: ${a(L, "/branche", "Branchenl\xF6sungen")} und ${a(L, "/produkte", "Produktkategorien")}.</p>`)
  );
  return makeModel(route2, {
    title: "Ratgeber \u2013 Kaufberatung & K\xFCchenplanung f\xFCr die Gastronomie",
    description: "Ratgeber f\xFCr Gastronomiebedarf: Kombid\xE4mpfer, Gastro-K\xFChlschrank, Sp\xFClmaschine, Abzugshaube, K\xFCchenplanung, HACCP und F\xF6rderung \u2013 praxisnah erkl\xE4rt von 2MC Gastro.",
    path: "/ratgeber",
    jsonLd: [breadcrumbSchema(crumbs), collectionPageSchema({ name: "Ratgeber", url: "/ratgeber" })],
    body
  });
}
async function ratgeberModel(route2) {
  const L = route2.locale;
  const r = RATGEBER.find((x) => x.slug === route2.params.slug);
  if (!r) return notFoundModel(route2);
  const crumbs = [HOME_CRUMB, { name: "Ratgeber", url: "/ratgeber" }, { name: r.title, url: `/ratgeber/${r.slug}` }];
  const rel = r.relatedCategories.map((slug) => {
    const [c, s] = slug.split("/");
    const cat = findCategory(c);
    if (!cat) return "";
    const sub = s ? findSubcategory(c, s) : void 0;
    return `<li>${a(L, `/${slug}`, sub ? sub.name : cat.name)}</li>`;
  }).filter(Boolean).join("");
  const sources = r.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.title)}</a>${s.publisher ? ` \u2013 ${esc(s.publisher)}` : ""}</li>`).join("");
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<article><h1>${esc(r.title)}</h1><p><em>${esc(RATGEBER_CATEGORY_LABEL[r.category])} \xB7 ${esc(r.datePublished)} \xB7 ${r.readingMinutes} Min. Lesezeit \xB7 ${esc(r.author)}</em></p>` + (r.image ? `<img src="${esc(r.image)}" alt="${esc(r.imageAlt)}" width="1200" height="630">` : "") + r.html + faqHtml(r.faq) + (sources ? `<section><h2>Quellen</h2><ul>${sources}</ul></section>` : "") + `</article>` + (rel ? `<section><h2>Passende Produkte</h2><ul>${rel}</ul></section>` : "")
  );
  return makeModel(route2, {
    title: r.title,
    description: r.description,
    path: `/ratgeber/${r.slug}`,
    ogType: "article",
    ogImage: r.image ? absoluteUrl(r.image) : DEFAULT_OG_IMAGE,
    jsonLd: [breadcrumbSchema(crumbs), articleSchema({ title: r.title, description: r.description, image: r.image, datePublished: r.datePublished, dateModified: r.dateModified, author: r.author, url: `/ratgeber/${r.slug}` }), ...r.faq.length ? [faqSchema(r.faq.map((f) => ({ question: f.q, answer: f.a })))] : []],
    body
  });
}
async function blogIndexModel(route2) {
  if (route2.locale === "de") {
    return makeModel(route2, { status: 301, redirectTo: "/ratgeber", title: "Weiterleitung", description: "", path: "/ratgeber", noindex: true, body: "" });
  }
  const L = route2.locale;
  const crumbs = [{ name: "Ana Sayfa", url: "/" }, { name: "Blog", url: "/blog" }];
  const items = BLOG_POSTS.map((p3) => `<li>${a(L, `/blog/${p3.slug}`, p3.title)} <small>${esc(p3.datePublished)}</small><br>${esc(p3.description)}</li>`).join("");
  return makeModel(route2, {
    title: "Blog \u2013 End\xFCstriyel Mutfak Rehberleri",
    description: "End\xFCstriyel mutfak kurulumu, ekipman se\xE7imi, HACCP uyumu ve restoran i\u015Fletmecili\u011Fi \xFCzerine T\xFCrk\xE7e rehberler \u2013 2MC Gastro.",
    path: "/blog",
    hreflang: false,
    forceIndex: true,
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Blog \u2013 End\xFCstriyel Mutfak Rehberleri</h1><ul>${items}</ul>`)
  });
}
async function blogPostModel(route2) {
  const post = BLOG_POSTS.find((p3) => p3.slug === route2.params.slug);
  if (!post) return notFoundModel(route2);
  if (route2.locale === "de") {
    return makeModel(route2, { status: 301, redirectTo: localePath("tr", `/blog/${post.slug}`), title: "Weiterleitung", description: "", path: `/blog/${post.slug}`, noindex: true, body: "" });
  }
  const L = route2.locale;
  const crumbs = [{ name: "Ana Sayfa", url: "/" }, { name: "Blog", url: "/blog" }, { name: post.title, url: `/blog/${post.slug}` }];
  const html = post.body.split(/\n\n+/).map((blk) => {
    if (blk.startsWith("## ")) return `<h2>${esc(blk.slice(3))}</h2>`;
    if (blk.startsWith("- ")) return `<ul>${blk.split("\n").map((l) => `<li>${esc(l.replace(/^- /, ""))}</li>`).join("")}</ul>`;
    return `<p>${esc(blk)}</p>`;
  }).join("");
  return makeModel(route2, {
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    hreflang: false,
    forceIndex: true,
    ogType: "article",
    jsonLd: [breadcrumbSchema(crumbs), articleSchema({ title: post.title, description: post.description, image: post.image, datePublished: post.datePublished, author: post.author, url: localePath("tr", `/blog/${post.slug}`), inLanguage: "tr-TR" }), ...post.faq?.length ? [faqSchema(post.faq)] : []],
    body: page(L, breadcrumbNav(L, crumbs) + `<article><h1>${esc(post.title)}</h1><p><em>${esc(post.datePublished)} \xB7 ${post.readingMinutes} dk</em></p>${html}${post.faq ? faqHtml(post.faq.map((f) => ({ q: f.question, a: f.answer })), "S\u0131k sorulan sorular") : ""}</article>`)
  });
}
async function vergleichIndexModel(route2) {
  const L = route2.locale;
  const crumbs = [HOME_CRUMB, { name: "Anbietervergleich", url: "/vergleich" }];
  const items = COMPETITORS.map((c) => `<li>${a(L, `/vergleich/${c.slug}`, `2MC Gastro vs. ${c.name}`)}</li>`).join("");
  return makeModel(route2, {
    title: "Anbietervergleich \u2013 2MC Gastro vs. GGM Gastro, Nisbets, BigGastro",
    description: "Sachlicher Vergleich der Gastronomiebedarf-Anbieter: Sortiment, Planungstools, Beratung, Lieferung und Preise \u2013 2MC Gastro im Vergleich mit GGM Gastro, Nisbets und BigGastro.",
    path: "/vergleich",
    jsonLd: [breadcrumbSchema(crumbs)],
    body: page(L, breadcrumbNav(L, crumbs) + `<h1>Anbietervergleich Gastronomiebedarf</h1><p>Worin unterscheiden sich die gro\xDFen Anbieter? Wir vergleichen nachpr\xFCfbare Kriterien: Sortiment, Marken, Planungswerkzeuge, Beratung, Lieferung und Preisgestaltung.</p><ul>${items}</ul>`)
  });
}
async function vergleichModel(route2) {
  const L = route2.locale;
  const c = COMPETITORS.find((x) => x.slug === route2.params.slug);
  if (!c) return notFoundModel(route2);
  const crumbs = [HOME_CRUMB, { name: "Anbietervergleich", url: "/vergleich" }, { name: `vs. ${c.name}`, url: `/vergleich/${c.slug}` }];
  const rows = [
    ["Sortiment", "\xFCber 14.000 Produkte (Diamond, CombiSteel, HENDI)", `${c.productCount.toLocaleString("de-DE")}+ Produkte`],
    ["Online-3D-K\xFCchenplaner", "ja, kostenlos im Browser", c.hasDesignTool ? "ja" : "nein (Planung nur auf Anfrage)"],
    ["Angebot aus dem Projekt", "ja, per Klick als PDF", "\u2013"],
    ["Preise", "netto zzgl. MwSt., B2B", c.pricing === "low" ? "g\xFCnstig" : c.pricing === "mid" ? "mittel" : "Premium"],
    ["Beratung", "pers\xF6nlich, K\xF6ln + bundesweit per Video", "Helpcenter / Hotline"],
    ["Sprachen", "15 Sprachen", c.hasMultiLang ? "mehrsprachig" : "einsprachig"],
    ["Montage", "NRW eigenes Team, bundesweit Partner", c.hasInstallation ? "ja" : "eingeschr\xE4nkt"]
  ];
  const table = `<table><thead><tr><th>Kriterium</th><th>2MC Gastro</th><th>${esc(c.name)}</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table>`;
  const faqs = [
    { q: `Ist 2MC Gastro eine Alternative zu ${c.name}?`, a: `Ja \u2013 insbesondere wenn Sie K\xFCchenplanung, Angebot und Lieferung aus einer Hand suchen. 2MC Gastro bietet einen kostenlosen 3D-K\xFCchenplaner, pers\xF6nliche Beratung und \xFCber 14.000 Produkte von Diamond, CombiSteel und HENDI zu Netto-Preisen.` },
    { q: "Sind die Angaben im Vergleich aktuell?", a: `Die Angaben zu ${c.name} stammen aus \xF6ffentlich zug\xE4nglichen Quellen (Website, Sitemaps, Bewertungsportale) und werden regelm\xE4\xDFig gepr\xFCft. Hinweise auf \xC4nderungen nehmen wir gern entgegen.` }
  ];
  return makeModel(route2, {
    title: `2MC Gastro vs. ${c.name} \u2013 Vergleich Gastronomiebedarf`,
    description: `2MC Gastro und ${c.name} im Vergleich: Sortiment, 3D-K\xFCchenplaner, Beratung, Preise und Lieferung. Nachpr\xFCfbare Kriterien f\xFCr Gastronomen, die einen Lieferanten f\xFCr Gro\xDFk\xFCchentechnik suchen.`,
    path: `/vergleich/${c.slug}`,
    jsonLd: [breadcrumbSchema(crumbs), faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })))],
    body: page(L, breadcrumbNav(L, crumbs) + `<article><h1>2MC Gastro vs. ${esc(c.name)}</h1><p>${esc(c.name)} (${esc(c.domain)}) ist ein etablierter Anbieter f\xFCr Gastronomiebedarf. Der folgende Vergleich stellt nachpr\xFCfbare Kriterien gegen\xFCber \u2013 ohne Wertung, damit Sie den passenden Lieferanten f\xFCr Ihr Projekt w\xE4hlen k\xF6nnen.</p>${table}${faqHtml(faqs)}</article>`)
  });
}
async function staticModel(route2) {
  const L = route2.locale;
  const sp = STATIC_PAGES[route2.params.slug];
  if (!sp) return notFoundModel(route2);
  const crumbs = [HOME_CRUMB, { name: sp.title.split(" \u2013 ")[0], url: `/${route2.params.slug}` }];
  const legal = ["impressum", "datenschutz", "agb", "widerruf", "cookie-richtlinie"].includes(route2.params.slug);
  const body = page(
    L,
    breadcrumbNav(L, crumbs) + `<h1>${esc(sp.title.split(" \u2013 ")[0])}</h1><p>${esc(sp.description)}</p>` + (route2.params.slug === "impressum" ? `<section><h2>Anbieter</h2><p>${esc(COMPANY_INFO.legalName)}<br>${esc(COMPANY_INFO.street)}<br>${esc(COMPANY_INFO.zipCity)}, Deutschland<br>Telefon: ${esc(COMPANY_INFO.phoneDisplay)}<br>E-Mail: ${esc(COMPANY_INFO.email)}<br>USt-IdNr.: ${esc(COMPANY_INFO.vat)}${COMPANY_INFO.register.number ? `<br>Handelsregister: ${esc(COMPANY_INFO.register.number)}, ${esc(COMPANY_INFO.register.court)}` : ""}${COMPANY_INFO.register.managingDirector ? `<br>Gesch\xE4ftsf\xFChrer: ${esc(COMPANY_INFO.register.managingDirector)}` : ""}</p></section>` : "")
  );
  return makeModel(route2, {
    title: sp.title,
    rawTitle: sp.title.includes("2MC Gastro"),
    description: sp.description,
    path: `/${route2.params.slug}`,
    noindex: false,
    hreflang: !legal,
    jsonLd: [breadcrumbSchema(crumbs), ...route2.params.slug === "ueber-uns" ? [organizationSchema(), storeSchema()] : []],
    body,
    cacheSeconds: legal ? 86400 : 3600
  });
}
async function appModel(route2) {
  return makeModel(route2, {
    title: SITE_NAME,
    rawTitle: true,
    description: "Digitale K\xFCchenplanung, Angebote und Projektverwaltung f\xFCr Gewerbekunden \u2013 2MC Gastro.",
    path: route2.path,
    noindex: true,
    hreflang: false,
    body: "",
    cacheSeconds: 0
  });
}
async function notFoundModel(route2) {
  const L = route2.locale;
  const cats = CATEGORY_TREE.filter((c) => c.published).slice(0, 8).map((c) => `<li>${a(L, `/${c.slug}`, c.name)}</li>`).join("");
  return makeModel(route2, {
    status: 404,
    title: "Seite nicht gefunden (404)",
    description: "Die angeforderte Seite existiert nicht. Zur Startseite, zu den Produktkategorien oder zur Suche.",
    path: route2.path,
    noindex: true,
    hreflang: false,
    body: page(L, `<h1>Seite nicht gefunden</h1><p>Die Adresse ist veraltet oder falsch geschrieben. Vielleicht hilft eine dieser Seiten:</p><ul><li>${a(L, "/", "Startseite")}</li><li>${a(L, "/produkte", "Alle Produkte")}</li>${cats}</ul>`),
    cacheSeconds: 300
  });
}
async function buildModel(route2) {
  void INDEXABLE_LOCALES;
  switch (route2.kind) {
    case "home":
      return homeModel(route2);
    case "shop":
      return shopModel(route2);
    case "category":
      return categoryModel(route2);
    case "subcategory":
      return subcategoryModel(route2);
    case "product":
      return productModel(route2);
    case "legacyProduct":
      return legacyProductModel(route2);
    case "brandIndex":
      return brandIndexModel(route2);
    case "brand":
      return brandModel(route2);
    case "brandCategory":
      return brandCategoryModel(route2);
    case "brancheIndex":
      return brancheIndexModel(route2);
    case "branche":
      return brancheModel(route2);
    case "cityIndex":
      return cityIndexModel(route2);
    case "city":
      return cityModel(route2);
    case "ratgeberIndex":
      return ratgeberIndexModel(route2);
    case "ratgeber":
      return ratgeberModel(route2);
    case "blogIndex":
      return blogIndexModel(route2);
    case "blogPost":
      return blogPostModel(route2);
    case "vergleichIndex":
      return vergleichIndexModel(route2);
    case "vergleich":
      return vergleichModel(route2);
    case "static":
      return staticModel(route2);
    case "app":
      return appModel(route2);
    default:
      return notFoundModel(route2);
  }
}

// src/seo/render/shell.ts
var HEAD_RE = /<!--seo:head-->[\s\S]*?<!--\/seo:head-->/;
var BODY_RE = /<!--seo:body-->[\s\S]*?<!--\/seo:body-->/;
var LANG_RE = /<html lang="[a-zA-Z-]*"/;
var MANAGED_ATTR = 'data-seo-managed="1"';
function buildHeadBlock(m) {
  const lines = [];
  lines.push(`<title>${esc(m.title)}</title>`);
  lines.push(`<meta name="title" content="${esc(m.title)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="description" content="${esc(m.description)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="robots" content="${esc(m.robots)}" ${MANAGED_ATTR}>`);
  if (m.status === 200 && !/noindex/.test(m.robots)) {
    lines.push(`<link rel="canonical" href="${esc(m.canonical)}" ${MANAGED_ATTR}>`);
    for (const alt of m.alternates) {
      lines.push(`<link rel="alternate" hreflang="${esc(alt.hreflang)}" href="${esc(alt.href)}" ${MANAGED_ATTR}>`);
    }
  }
  lines.push(`<meta property="og:type" content="${esc(m.ogType)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:site_name" content="2MC Gastro" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:url" content="${esc(m.canonical)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:title" content="${esc(m.title)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:description" content="${esc(m.description)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:image" content="${esc(m.ogImage)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:locale" content="${m.lang === "de" ? "de_DE" : m.lang === "tr" ? "tr_TR" : m.lang === "en" ? "en_GB" : m.lang}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:card" content="summary_large_image" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:title" content="${esc(m.title)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:description" content="${esc(m.description)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:image" content="${esc(m.ogImage)}" ${MANAGED_ATTR}>`);
  for (const ld of m.jsonLd) {
    const json = JSON.stringify(ld).replace(/<\//g, "<\\/");
    lines.push(`<script type="application/ld+json" ${MANAGED_ATTR}>${json}</script>`);
  }
  return `<!--seo:head-->
${lines.join("\n")}
<!--/seo:head-->`;
}
function injectIntoShell(template, m) {
  let html = template;
  html = html.replace(LANG_RE, `<html lang="${m.lang}"`);
  if (HEAD_RE.test(html)) html = html.replace(HEAD_RE, () => buildHeadBlock(m));
  else html = html.replace("</head>", () => `${buildHeadBlock(m)}
</head>`);
  const body = `<!--seo:body-->
${m.bodyHtml}
<!--/seo:body-->`;
  if (BODY_RE.test(html)) html = html.replace(BODY_RE, () => body);
  else html = html.replace('<div id="root">', () => `<div id="root">${body}`);
  return html;
}

// src/seo/render/page.ts
async function renderPage(url, shell) {
  const route2 = matchSeoRoute(url);
  const model = await buildModel(route2);
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": /noindex/.test(model.robots) ? "noindex" : "all",
    Vary: "Accept-Encoding"
  };
  if (model.status === 301 || model.status === 308) {
    headers.Location = model.redirectTo || "/";
    headers["Cache-Control"] = "public, s-maxage=86400, max-age=3600";
    return { status: model.status, html: "", redirectTo: model.redirectTo, headers, model };
  }
  headers["Cache-Control"] = model.cacheSeconds > 0 ? `public, s-maxage=${model.cacheSeconds}, stale-while-revalidate=86400, max-age=0` : "private, no-cache";
  return { status: model.status, html: injectIntoShell(shell, model), headers, model };
}

// src/seo/server/_shell.generated.ts
var SHELL = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#931315" />
    <meta name="color-scheme" content="dark light" />

    <!--
      SEO kabu\u011Fu \u2014 rota-\xF6zel ba\u015Fl\u0131k/meta/canonical/hreflang/JSON-LD a\u015Fa\u011F\u0131daki
      i\u015Faret\xE7iler aras\u0131na bas\u0131l\u0131r: build'de scripts/seo/prerender.ts (statik
      sayfalar), istek an\u0131nda api/render.ts (\xFCr\xFCnler, sayfalama, 404).
      Buradaki varsay\u0131lanlar yaln\u0131zca \`vite dev\` ve yedek durumlar i\xE7indir.
      Elle canonical/JSON-LD EKLEME \u2014 src/seo/model/* tek kaynakt\u0131r.
    -->
    <!--seo:head--><title>2MC Gastro</title><!--/seo:head-->

    <meta name="author" content="2MC Gastro" />
    <meta name="twitter:site" content="@2mcgastro" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <!-- Google Search Console do\u011Frulamas\u0131: Adem'den gelen token buraya \u2014
         <meta name="google-site-verification" content="\u2026" /> -->

    <!-- Icons & PWA -->
    <link rel="icon" type="image/png" href="https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/2mc%20gastro%20favicon.png" />
    <link rel="apple-touch-icon" href="https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/2mc%20gastro%20favicon.png" />
    <link rel="manifest" href="/site.webmanifest" />

    <!-- Performance hints -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://images.diamond-europe.com" crossorigin />
    <link rel="dns-prefetch" href="https://pim.combisteel.com" />
    <!-- Ekranda ger\xE7ekten render edilen logo bu PNG'dir (Navbar/Layout/Footer). -->
    <link rel="preload" as="image" href="/logo-2mc-gastro.png" fetchpriority="high" />

    <!-- Geo meta (local SEO) -->
    <meta name="geo.region" content="DE-NW" />
    <meta name="geo.placename" content="K\xF6ln" />
    <meta name="geo.position" content="50.9648;7.0273" />
    <meta name="ICBM" content="50.9648, 7.0273" />

    <!-- Feed & AI discovery (GEO) -->
    <link rel="alternate" type="application/rss+xml" title="2MC Gastro \u2014 Ratgeber & Neuigkeiten" href="https://www.2mcgastro.de/rss.xml" />
    <link rel="alternate" type="text/plain" title="llms.txt" href="https://www.2mcgastro.de/llms.txt" />
    <script type="module" crossorigin src="/assets/index-DybW0KMI.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/react-DVs2NkFc.js">
    <link rel="modulepreload" crossorigin href="/assets/pdf-BNMWRwDm.js">
    <link rel="modulepreload" crossorigin href="/assets/i18n-BvNubqYy.js">
    <link rel="modulepreload" crossorigin href="/assets/state-BvHujI36.js">
    <link rel="modulepreload" crossorigin href="/assets/supabase-Dsb38-Dp.js">
    <link rel="modulepreload" crossorigin href="/assets/icons-B0hk7Axr.js">
    <link rel="modulepreload" crossorigin href="/assets/motion-m847y5Lc.js">
    <link rel="modulepreload" crossorigin href="/assets/data-products-C_Sx8pgF.js">
    <link rel="stylesheet" crossorigin href="/assets/index-DNCZGoqW.css">
  </head>
  <body>
    <style>
      html, body { background:#0e0e10; margin:0; padding:0; }
      body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; color:#fff; -webkit-font-smoothing:antialiased; }
      #app-splash {
        position: fixed; inset: 0; z-index: 99999;
        background: #0e0e10;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 18px;
        transition: opacity .5s ease; opacity: 1;
      }
      #app-splash.fade { opacity: 0; pointer-events: none; }
      #app-splash .ring {
        width: 44px; height: 44px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.08);
        border-top-color: #E85D26;
        animation: appspin .9s linear infinite;
        box-shadow: 0 0 18px rgba(232,93,38,0.18);
      }
      #app-splash .brand {
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 900; letter-spacing: .14em;
        font-size: 18px; color: #fff; text-transform: uppercase;
      }
      #app-splash .accent { width: 28px; height: 1px; background: #E85D26; }
      @keyframes appspin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { #app-splash .ring { animation: none; } }
      /* Sunucu g\xF6vdesi (React mount'a kadar): splash alt\u0131nda, ekranda g\xF6r\xFCnmez ama DOM'da */
      #root > header, #root > main, #root > footer { max-width: 72rem; margin: 0 auto; padding: 0 1rem; color: #ddd; }
    </style>
    <div id="app-splash" aria-hidden="true">
      <div class="ring"></div>
      <div class="brand">2MC GASTRO</div>
      <div class="accent"></div>
    </div>
    <!--
      Rota-\xF6zel semantik HTML (Googlebot, Bing, ChatGPT/Perplexity/Claude botlar\u0131 ham
      HTML'i okur). React \`createRoot\` ilk render'da bu d\xFC\u011F\xFCmleri de\u011Fi\u015Ftirir; kullan\u0131c\u0131
      splash arkas\u0131nda hi\xE7 g\xF6rmez. Kaynak: src/seo/model/pages.ts \u2014 elle d\xFCzenleme.
    -->
    <div id="root"><!--seo:body--><!--/seo:body--></div>
    <noscript>
      <div style="padding:40px;font-family:system-ui;text-align:center;background:#020817;color:#fff;min-height:100vh;">
        <p><strong>2MC Gastro \u2014 Gastronomiebedarf &amp; Gro\xDFk\xFCchentechnik</strong></p>
        <p>Diese Anwendung ben\xF6tigt JavaScript. Bitte aktivieren Sie JavaScript in Ihrem Browser.</p>
        <p>\xDCber 14.000 Produkte von Diamond, CombiSteel und HENDI \xB7 2D/3D-K\xFCchenplanung \xB7 Angebote f\xFCr Gewerbekunden.</p>
        <p>2MC Gastro GmbH \xB7 Bergisch Gladbacher Str. 172, 51063 K\xF6ln \xB7 Tel.: +49 176 70295844 \xB7 info@2mcgastro.de</p>
      </div>
    </noscript>
  </body>
</html>
`;

// src/seo/server/render.ts
var cachedShell = null;
function loadShell() {
  if (cachedShell) return cachedShell;
  const candidates = [
    join(process.cwd(), "dist", "index.html"),
    join(process.cwd(), "index.html")
  ];
  for (const p3 of candidates) {
    try {
      if (existsSync(p3)) {
        const s = readFileSync(p3, "utf8");
        if (s.includes("/assets/") || p3.endsWith(join("dist", "index.html"))) {
          cachedShell = s;
          return s;
        }
      }
    } catch {
    }
  }
  cachedShell = SHELL;
  return SHELL;
}
function first(v) {
  return Array.isArray(v) ? v[0] : v;
}
function requestUrl(req) {
  const q = req.query || {};
  const path = first(q.path) || "";
  const rest2 = [];
  for (const [k, v] of Object.entries(q)) {
    if (k === "path" || v === void 0) continue;
    for (const val of Array.isArray(v) ? v : [v]) rest2.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
  }
  const clean = "/" + path.replace(/^\/+/, "");
  return rest2.length ? `${clean}?${rest2.join("&")}` : clean;
}
async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).end("Method not allowed");
    return;
  }
  const shell = loadShell();
  const url = requestUrl(req);
  try {
    const out = await renderPage(url, shell);
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    if (out.redirectTo) {
      res.status(out.status).end();
      return;
    }
    res.status(out.status).send(out.html);
  } catch (err) {
    console.error("[api/render] failed for", url, err);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, max-age=0");
    res.setHeader("X-SEO-Render", "fallback");
    res.status(200).send(shell);
  }
}
export {
  handler as default
};
