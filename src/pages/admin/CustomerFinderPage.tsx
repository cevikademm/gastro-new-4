import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Users, Search, MapPin, Phone, Globe, Star, Mail, Download, Loader2, Filter,
  X, Trash2, FileSpreadsheet, FileText, Send, StickyNote, CheckSquare, Square,
  SlidersHorizontal, ArrowUpDown, History, MessageSquare, MessageCircle,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  useCustomerFinderStore,
  type CustomerLead,
  type LeadStatus,
  type MailStatus,
  type LeadReview,
  type MailLogEntry,
  type SearchParams,
} from '../../stores/customerFinderStore';

const STATUS_FLOW: LeadStatus[] = ['yeni', 'arandi', 'ilgilendi', 'musteri', 'olumsuz'];

const STATUS_META: Record<LeadStatus, { label: string; cls: string }> = {
  yeni:      { label: 'Yeni',      cls: 'bg-info-container text-on-info-container border-info/20' },
  arandi:    { label: 'Arandı',    cls: 'bg-warning-container text-on-warning-container border-warning/20' },
  ilgilendi: { label: 'İlgilendi', cls: 'bg-primary-fixed text-primary border-primary/20' },
  musteri:   { label: 'Müşteri',   cls: 'bg-success-container text-on-success-container border-success/20' },
  olumsuz:   { label: 'Olumsuz',   cls: 'bg-error-container text-error border-error/20' },
};

const MAIL_META: Record<MailStatus, { label: string; cls: string }> = {
  gonderilmedi: { label: '—',           cls: 'text-on-surface-variant' },
  gonderildi:   { label: 'Gönderildi',  cls: 'text-success' },
  yanit_geldi:  { label: 'Yanıt geldi', cls: 'text-primary' },
};

// İşletmeyi Google kategorisine göre basit bir türe sınıflandırır (Restoran,
// Otel, Berber...). Eşleşme yoksa ham kategoriyi etiket olarak gösterir.
// Renk class'ları birebir literal yazılır ki Tailwind JIT bunları üretsin.
function classifyKategori(kategori: string | null): { label: string; cls: string } | null {
  const k = (kategori || '').toLowerCase().trim();
  if (!k) return null;
  const has = (...xs: string[]) => xs.some((x) => k.includes(x));
  if (has('otel', 'hotel', 'pension', 'hostel', 'motel', 'konaklama', 'unterkunft'))
    return { label: 'Otel', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (has('berber', 'kuaför', 'kuafor', 'friseur', 'barber', 'hairdresser', 'coiffeur', 'saç'))
    return { label: 'Berber / Kuaför', cls: 'bg-teal-100 text-teal-700 border-teal-200' };
  if (has('pastane', 'fırın', 'firin', 'bakery', 'bäckerei', 'baeckerei', 'konditorei', 'patisserie', 'tatlı', 'tatli', 'börek', 'borek'))
    return { label: 'Fırın / Pastane', cls: 'bg-pink-100 text-pink-700 border-pink-200' };
  if (has('kafe', 'café', 'cafe', 'kahve', 'coffee', 'bistro'))
    return { label: 'Kafe', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (has('restoran', 'restaurant', 'lokanta', 'imbiss', 'pizzeria', 'pizza', 'döner', 'doner', 'kebap', 'kebab', 'burger', 'steakhouse', 'sushi', 'fast food', 'gaststätte', 'gaststatte', 'trattoria', 'ristorante'))
    return { label: 'Restoran', cls: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (has('bar', 'pub', 'kneipe', 'biergarten', 'cocktail', 'lounge', 'meyhane'))
    return { label: 'Bar', cls: 'bg-purple-100 text-purple-700 border-purple-200' };
  if (has('market', 'supermarkt', 'supermarket', 'bakkal', 'grocery', 'lebensmittel', 'şarküteri', 'sarkuteri', 'manav', 'kasap', 'metzgerei', 'butcher'))
    return { label: 'Market / Gıda', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (has('catering', 'büfe', 'bufe', 'buffet', 'kantin', 'mensa'))
    return { label: 'Catering / Büfe', cls: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
  // Eşleşme yok → ham kategoriyi tür olarak göster
  return { label: kategori as string, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

const DEFAULT_MAIL_SUBJECT = '2MC Gastro — Profesyonel mutfak ekipmanları';
const DEFAULT_MAIL_BODY =
  `Merhaba {{isim}},\n\n` +
  `2MC Gastro olarak endüstriyel mutfak ekipmanlarında 10.000+ ürünlük katalogumuzla işletmenize özel çözümler sunuyoruz.\n\n` +
  `Dilerseniz size özel bir teklif hazırlayabiliriz. Detaylar için bu e-postayı yanıtlamanız yeterli.\n\n` +
  `Saygılarımızla,\n2MC Gastro`;

// Diller — taslaklar 7 dilde hazır (varsayılan: Almanca). Yer tutucular
// ({{isim}}, {{kategori}}, {{adres}}) her dilde otomatik dolar.
type Lang = 'tr' | 'en' | 'de' | 'nl' | 'fr' | 'es' | 'pt';
const LANGS: { code: Lang; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
];

const MAIL_TEMPLATES: { label: string; subject: Record<Lang, string>; body: Record<Lang, string> }[] = [
  {
    label: 'Genel tanıtım',
    subject: {
      tr: '2MC Gastro — Profesyonel mutfak ekipmanları',
      en: '2MC Gastro — Professional kitchen equipment',
      de: '2MC Gastro — Professionelle Küchenausstattung',
      nl: '2MC Gastro — Professionele keukenapparatuur',
      fr: '2MC Gastro — Équipement de cuisine professionnelle',
      es: '2MC Gastro — Equipamiento de cocina profesional',
      pt: '2MC Gastro — Equipamento de cozinha profissional',
    },
    body: {
      tr: DEFAULT_MAIL_BODY,
      en:
        `Hello {{isim}},\n\n` +
        `At 2MC Gastro we offer tailored solutions for commercial kitchens, with a catalogue of over 10,000 products.\n\n` +
        `We'd be glad to prepare a custom quote for you — just reply to this email.\n\n` +
        `Best regards,\n2MC Gastro`,
      de:
        `Hallo {{isim}},\n\n` +
        `bei 2MC Gastro bieten wir maßgeschneiderte Lösungen für Profiküchen – mit über 10.000 Produkten im Katalog.\n\n` +
        `Gerne erstellen wir Ihnen ein individuelles Angebot. Antworten Sie einfach auf diese E-Mail.\n\n` +
        `Mit freundlichen Grüßen,\n2MC Gastro`,
      nl: `Goedendag {{isim}},\n\nBij 2MC Gastro bieden wij maatwerkoplossingen voor professionele keukens, met een assortiment van meer dan 10.000 producten.\n\nWij stellen graag een offerte op maat voor u op — een antwoord op deze e-mail volstaat.\n\nMet vriendelijke groet,\n2MC Gastro`,
      fr: `Bonjour {{isim}},\n\nChez 2MC Gastro, nous proposons des solutions sur mesure pour les cuisines professionnelles, avec un catalogue de plus de 10 000 produits.\n\nNous serions ravis de vous établir un devis personnalisé — il vous suffit de répondre à cet e-mail.\n\nCordialement,\n2MC Gastro`,
      es: `Buenos días {{isim}},\n\nEn 2MC Gastro ofrecemos soluciones a medida para cocinas profesionales, con un catálogo de más de 10.000 productos.\n\nEstaremos encantados de prepararle un presupuesto personalizado; basta con que responda a este correo.\n\nUn cordial saludo,\n2MC Gastro`,
      pt: `Bom dia {{isim}},\n\nNa 2MC Gastro oferecemos soluções à medida para cozinhas profissionais, com um catálogo de mais de 10.000 produtos.\n\nTeremos todo o gosto em preparar um orçamento personalizado para si — basta responder a este e-mail.\n\nCom os melhores cumprimentos,\n2MC Gastro`,
    },
  },
  {
    label: 'Teklif daveti',
    subject: {
      tr: '{{isim}} için özel ekipman teklifi',
      en: 'A tailored equipment offer for {{isim}}',
      de: 'Ein individuelles Angebot für {{isim}}',
      nl: 'Een aanbod op maat voor {{isim}}',
      fr: "Une offre d'équipement sur mesure pour {{isim}}",
      es: 'Una oferta de equipamiento a medida para {{isim}}',
      pt: 'Uma proposta de equipamento à medida para {{isim}}',
    },
    body: {
      tr:
        `Merhaba {{isim}} ekibi,\n\n` +
        `{{kategori}} alanındaki işletmeniz için endüstriyel mutfak ekipmanlarında bütçenize uygun, size özel bir teklif hazırlamak isteriz.\n\n` +
        `Size en uygun çözümü sunabilmemiz için kısa bir görüşme yeterli. Bu e-postayı yanıtlamanız ya da bizi aramanız yeterli.\n\n` +
        `Saygılarımızla,\n2MC Gastro`,
      en:
        `Hello {{isim}} team,\n\n` +
        `For your business in the {{kategori}} sector, we can prepare a budget-friendly, customised offer for commercial kitchen equipment.\n\n` +
        `A short call is all we need to find the best solution for you. Simply reply to this email or give us a call.\n\n` +
        `Best regards,\n2MC Gastro`,
      de:
        `Hallo Team von {{isim}},\n\n` +
        `für Ihren Betrieb im Bereich {{kategori}} erstellen wir gerne ein budgetgerechtes, individuelles Angebot für die Profiküche.\n\n` +
        `Ein kurzes Gespräch genügt, um die beste Lösung zu finden. Antworten Sie einfach auf diese E-Mail oder rufen Sie uns an.\n\n` +
        `Mit freundlichen Grüßen,\n2MC Gastro`,
      nl: `Goedendag team {{isim}},\n\nVoor uw onderneming in de sector {{kategori}} kunnen wij een voordelig aanbod op maat samenstellen voor professionele keukenapparatuur.\n\nEen kort gesprek volstaat om samen de beste oplossing voor u te vinden. U kunt eenvoudig op deze e-mail antwoorden of ons bellen.\n\nMet vriendelijke groet,\n2MC Gastro`,
      fr: `Bonjour à l'équipe de {{isim}},\n\nPour votre établissement dans le secteur {{kategori}}, nous pouvons élaborer une offre personnalisée et avantageuse pour vos équipements de cuisine professionnelle.\n\nUn bref échange suffira pour identifier ensemble la meilleure solution. Il vous suffit de répondre à cet e-mail ou de nous appeler.\n\nCordialement,\n2MC Gastro`,
      es: `Buenos días, equipo de {{isim}}:\n\nPara su negocio del sector {{kategori}}, podemos preparar una oferta personalizada y ajustada al presupuesto en equipamiento de cocina profesional.\n\nUna breve conversación es todo lo que necesitamos para encontrar juntos la mejor solución para usted. Solo tiene que responder a este correo o llamarnos.\n\nUn cordial saludo,\n2MC Gastro`,
      pt: `Bom dia à equipa da {{isim}},\n\nPara o vosso estabelecimento do setor {{kategori}}, podemos preparar uma proposta personalizada e ajustada ao orçamento em equipamento de cozinha profissional.\n\nBasta uma breve conversa para encontrarmos juntos a melhor solução para si. É só responder a este e-mail ou ligar-nos.\n\nCom os melhores cumprimentos,\n2MC Gastro`,
    },
  },
  {
    label: 'Kısa & hızlı',
    subject: {
      tr: 'Mutfak ekipmanı ihtiyaçlarınızda 2MC Gastro',
      en: '2MC Gastro for your kitchen equipment needs',
      de: '2MC Gastro für Ihren Küchenbedarf',
      nl: '2MC Gastro voor uw keukenapparatuur',
      fr: '2MC Gastro pour vos besoins en équipement de cuisine',
      es: '2MC Gastro para sus necesidades de equipamiento de cocina',
      pt: '2MC Gastro para as suas necessidades de equipamento de cozinha',
    },
    body: {
      tr:
        `Merhaba {{isim}},\n\n` +
        `Mutfak ekipmanı ihtiyaçlarınızda (ocak, fırın, soğutma, hazırlık) yanınızdayız. Hızlı teklif için yanıtlayabilirsiniz.\n\n` +
        `2MC Gastro`,
      en:
        `Hello {{isim}},\n\n` +
        `We're here for all your kitchen equipment needs (cooking, ovens, refrigeration, prep). Reply for a quick quote.\n\n` +
        `2MC Gastro`,
      de:
        `Hallo {{isim}},\n\n` +
        `bei allen Fragen rund um Küchenausstattung (Kochen, Öfen, Kühlung, Vorbereitung) sind wir für Sie da. Antworten Sie für ein schnelles Angebot.\n\n` +
        `2MC Gastro`,
      nl: `Goedendag {{isim}},\n\nWij staan voor u klaar voor al uw keukenapparatuur (koken, ovens, koeling, voorbereiding). Antwoord ons voor een snelle offerte.\n\n2MC Gastro`,
      fr: `Bonjour {{isim}},\n\nNous sommes à votre disposition pour tous vos besoins en équipement de cuisine (cuisson, fours, réfrigération, préparation). Répondez-nous pour un devis rapide.\n\n2MC Gastro`,
      es: `Buenos días {{isim}},\n\nEstamos a su disposición para todas sus necesidades de equipamiento de cocina (cocción, hornos, refrigeración, preparación). Respóndanos y le enviaremos un presupuesto rápido.\n\n2MC Gastro`,
      pt: `Bom dia {{isim}},\n\nEstamos ao seu dispor para todas as suas necessidades de equipamento de cozinha (cocção, fornos, refrigeração, preparação). Responda-nos para receber um orçamento rápido.\n\n2MC Gastro`,
    },
  },
  {
    label: 'Yeniden ziyaret / hatırlatma',
    subject: {
      tr: '{{isim}} — kaldığımız yerden devam edelim mi?',
      en: '{{isim}} — shall we pick up where we left off?',
      de: '{{isim}} — machen wir dort weiter, wo wir aufgehört haben?',
      nl: '{{isim}} — pakken we de draad weer op?',
      fr: '{{isim}} — reprenons-nous là où nous nous étions arrêtés ?',
      es: '{{isim}} — ¿retomamos donde lo dejamos?',
      pt: '{{isim}} — retomamos onde ficámos?',
    },
    body: {
      tr:
        `Merhaba {{isim}},\n\n` +
        `Daha önce ilettiğimiz mutfak ekipmanı çözümleriyle ilgili güncel bir teklif hazırlayabiliriz. İhtiyacınız olursa buradayız.\n\n` +
        `Saygılarımızla,\n2MC Gastro`,
      en:
        `Hello {{isim}},\n\n` +
        `We can prepare an updated quote based on the kitchen equipment solutions we discussed earlier. We're here whenever you need us.\n\n` +
        `Best regards,\n2MC Gastro`,
      de:
        `Hallo {{isim}},\n\n` +
        `gerne erstellen wir Ihnen ein aktualisiertes Angebot zu den zuvor besprochenen Lösungen für die Küchenausstattung. Wir sind für Sie da.\n\n` +
        `Mit freundlichen Grüßen,\n2MC Gastro`,
      nl: `Goedendag {{isim}},\n\nOp basis van de eerder besproken oplossingen voor keukenapparatuur kunnen wij een geactualiseerde offerte voor u opstellen. Wij staan tot uw beschikking wanneer het u uitkomt.\n\nMet vriendelijke groet,\n2MC Gastro`,
      fr: `Bonjour {{isim}},\n\nNous pouvons vous établir un devis actualisé sur la base des solutions d'équipement de cuisine évoquées précédemment. Nous restons à votre disposition dès que vous le souhaitez.\n\nCordialement,\n2MC Gastro`,
      es: `Buenos días {{isim}},\n\nPodemos prepararle un presupuesto actualizado basado en las soluciones de equipamiento de cocina que comentamos anteriormente. Quedamos a su disposición cuando lo necesite.\n\nUn cordial saludo,\n2MC Gastro`,
      pt: `Bom dia {{isim}},\n\nPodemos preparar um orçamento atualizado com base nas soluções de equipamento de cozinha que abordámos anteriormente. Ficamos ao seu dispor quando precisar.\n\nCom os melhores cumprimentos,\n2MC Gastro`,
    },
  },
];

// WhatsApp tıkla-konuş — TR / EN / DE şablonlar ({{isim}}, {{kategori}}, {{adres}} otomatik dolar)
const DEFAULT_WA =
  'Merhaba {{isim}}, 2MC Gastro olarak endüstriyel mutfak ekipmanlarında size özel çözümler sunuyoruz. Kısaca görüşebilir miyiz?';
const WA_TEMPLATES: { label: string; text: Record<Lang, string> }[] = [
  {
    label: 'Kısa selam',
    text: {
      tr: DEFAULT_WA,
      en: 'Hello {{isim}}, at 2MC Gastro we offer tailored solutions for commercial kitchen equipment. Could we have a quick chat?',
      de: 'Hallo {{isim}}, bei 2MC Gastro bieten wir maßgeschneiderte Lösungen für die Profiküche. Könnten wir kurz sprechen?',
      nl: 'Goedendag {{isim}}, bij 2MC Gastro bieden wij maatwerkoplossingen voor professionele keukenapparatuur. Kunnen wij u kort spreken?',
      fr: 'Bonjour {{isim}}, chez 2MC Gastro nous proposons des solutions sur mesure en équipement de cuisine professionnelle. Pourrions-nous en discuter brièvement ?',
      es: 'Buenos días {{isim}}, en 2MC Gastro ofrecemos soluciones a medida en equipamiento de cocina profesional. ¿Podríamos hablar brevemente?',
      pt: 'Bom dia {{isim}}, na 2MC Gastro oferecemos soluções à medida em equipamento de cozinha profissional. Podemos conversar brevemente?',
    },
  },
  {
    label: 'Teklif',
    text: {
      tr: 'Merhaba {{isim}}, {{kategori}} işletmeniz için mutfak ekipmanlarında bütçenize uygun bir teklif hazırlayabiliriz. İlgilenir misiniz?',
      en: 'Hello {{isim}}, we can prepare a budget-friendly offer for kitchen equipment for your {{kategori}} business. Would you be interested?',
      de: 'Hallo {{isim}}, für Ihren {{kategori}}-Betrieb erstellen wir gerne ein budgetgerechtes Angebot für Küchenausstattung. Hätten Sie Interesse?',
      nl: 'Goedendag {{isim}}, wij kunnen een voordelig aanbod voor keukenapparatuur opstellen voor uw onderneming in de sector {{kategori}}. Heeft u hier belangstelling voor?',
      fr: 'Bonjour {{isim}}, nous pouvons préparer une offre avantageuse en équipement de cuisine pour votre établissement du secteur {{kategori}}. Cela vous intéresserait-il ?',
      es: 'Buenos días {{isim}}, podemos preparar una oferta ajustada al presupuesto en equipamiento de cocina para su negocio del sector {{kategori}}. ¿Le interesaría?',
      pt: 'Bom dia {{isim}}, podemos preparar uma proposta ajustada ao orçamento em equipamento de cozinha para o vosso estabelecimento do setor {{kategori}}. Teria interesse?',
    },
  },
  {
    label: 'Hatırlatma',
    text: {
      tr: 'Merhaba {{isim}}, daha önce konuştuğumuz mutfak ekipmanı çözümleri için uygun olduğunuzda görüşebiliriz.',
      en: 'Hello {{isim}}, whenever it suits you, we can continue about the kitchen equipment solutions we discussed earlier.',
      de: 'Hallo {{isim}}, gerne sprechen wir über die zuvor besprochenen Lösungen für die Küchenausstattung, wann immer es Ihnen passt.',
      nl: 'Goedendag {{isim}}, wanneer het u uitkomt, hernemen wij graag het gesprek over de eerder besproken oplossingen voor keukenapparatuur.',
      fr: "Bonjour {{isim}}, quand cela vous conviendra, nous pourrons reprendre notre échange sur les solutions d'équipement de cuisine évoquées précédemment.",
      es: 'Buenos días {{isim}}, cuando le venga bien, podemos retomar la conversación sobre las soluciones de equipamiento de cocina que comentamos anteriormente.',
      pt: 'Bom dia {{isim}}, quando lhe for conveniente, podemos retomar a conversa sobre as soluções de equipamento de cozinha que abordámos anteriormente.',
    },
  },
];

function fillVars(tpl: string, l: CustomerLead): string {
  return tpl
    .replace(/\{\{\s*isim\s*\}\}/gi, l.isim || '')
    .replace(/\{\{\s*kategori\s*\}\}/gi, l.kategori || '')
    .replace(/\{\{\s*adres\s*\}\}/gi, l.adres || '');
}

function waLink(phone: string | null, message: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Heuristic: does this number likely USE WhatsApp?
 *
 * There is no public API to verify WhatsApp registration, so we infer it from
 * the line type — a personal WhatsApp account needs a MOBILE number; landlines
 * (area-code numbers) don't have one. Tuned for German (+49) leads, where mobile
 * prefixes are 15x / 16x / 17x. Non-mobile / unclassifiable numbers fall back to
 * "no WhatsApp" → the UI shows a call icon instead (a tel: link always works).
 */
function phoneIsWhatsapp(phone: string | null): boolean {
  if (!phone) return false;
  let d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+49')) d = '0' + d.slice(3);
  else if (d.startsWith('0049')) d = '0' + d.slice(4);
  else if (d.startsWith('49') && d.length >= 12) d = '0' + d.slice(2);
  // German mobile: 015x / 016x / 017x.
  return /^01[567]/.test(d);
}

function exportRows(leads: CustomerLead[]) {
  return leads.map((l) => ({
    İsim: l.isim || '',
    Kategori: l.kategori || '',
    Adres: l.adres || '',
    Telefon: l.telefon || '',
    'E-posta': l.email || '',
    Website: l.website || '',
    Puan: l.puan ?? '',
    Yorum: l.yorum_sayisi ?? '',
    Durum: STATUS_META[l.durum]?.label || l.durum,
    Mail: MAIL_META[l.mail_durumu]?.label || '',
    WhatsApp: l.whatsapp_durumu === 'gonderildi' ? 'Gönderildi' : '',
  }));
}

export default function CustomerFinderPage() {
  const {
    leads, mailLog, loading, searching, sending, error, lastSearch,
    runSearch, fetchLeads, fetchReviews, updateLeadStatus, updateLeadNote, markWhatsapp, sendMail, fetchMailLog, deleteLeads,
  } = useCustomerFinderStore();

  // Arama formu
  const [ulke, setUlke] = useState('Almanya');
  const [sehir, setSehir] = useState('Köln');
  const [kategori, setKategori] = useState('');
  const [limit, setLimit] = useState(20);
  const [minPuan, setMinPuan] = useState(0);
  const [sadeceEmail, setSadeceEmail] = useState(false);
  const [sadeceTelefon, setSadeceTelefon] = useState(false);
  const [sadeceWeb, setSadeceWeb] = useState(false);

  // Tablo + filtreler
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [mailFilter, setMailFilter] = useState<'all' | MailStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fHasEmail, setFHasEmail] = useState(false);
  const [fHasPhone, setFHasPhone] = useState(false);
  const [fHasWeb, setFHasWeb] = useState(false);
  const [fMinPuan, setFMinPuan] = useState(0);
  const [fMinYorum, setFMinYorum] = useState(0);
  const [sortBy, setSortBy] = useState<'recent' | 'puan' | 'yorum' | 'isim'>('recent');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<CustomerLead | null>(null);

  // Mail + görünüm
  const [mailIds, setMailIds] = useState<string[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<'leads' | 'mail'>('leads');

  useEffect(() => { fetchLeads(); fetchMailLog(); }, [fetchLeads, fetchMailLog]);
  useEffect(() => {
    if (lastSearch) setToast(`${lastSearch.found} işletme bulundu, ${lastSearch.inserted} kayıt güncellendi.`);
  }, [lastSearch]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.kategori) set.add(l.kategori);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = leads.filter((l) => {
      if (statusFilter !== 'all' && l.durum !== statusFilter) return false;
      if (mailFilter !== 'all' && l.mail_durumu !== mailFilter) return false;
      if (categoryFilter !== 'all' && l.kategori !== categoryFilter) return false;
      if (fHasEmail && !l.email) return false;
      if (fHasPhone && !l.telefon) return false;
      if (fHasWeb && !l.website) return false;
      if (fMinPuan > 0 && (l.puan ?? 0) < fMinPuan) return false;
      if (fMinYorum > 0 && (l.yorum_sayisi ?? 0) < fMinYorum) return false;
      if (q) {
        const hit =
          l.isim?.toLowerCase().includes(q) ||
          l.adres?.toLowerCase().includes(q) ||
          l.telefon?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.kategori?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'puan': return (b.puan ?? 0) - (a.puan ?? 0);
        case 'yorum': return (b.yorum_sayisi ?? 0) - (a.yorum_sayisi ?? 0);
        case 'isim': return (a.isim ?? '').localeCompare(b.isim ?? '', 'tr');
        default: return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      }
    });
  }, [leads, search, statusFilter, mailFilter, categoryFilter, fHasEmail, fHasPhone, fHasWeb, fMinPuan, fMinYorum, sortBy]);

  const activeFilters =
    (statusFilter !== 'all' ? 1 : 0) + (mailFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) + (fHasEmail ? 1 : 0) + (fHasPhone ? 1 : 0) +
    (fHasWeb ? 1 : 0) + (fMinPuan > 0 ? 1 : 0) + (fMinYorum > 0 ? 1 : 0) + (search ? 1 : 0);

  function clearFilters() {
    setSearch(''); setStatusFilter('all'); setMailFilter('all'); setCategoryFilter('all');
    setFHasEmail(false); setFHasPhone(false); setFHasWeb(false);
    setFMinPuan(0); setFMinYorum(0); setSortBy('recent');
  }

  const stats = useMemo(() => {
    const by: Record<string, number> = { all: leads.length };
    for (const s of STATUS_FLOW) by[s] = 0;
    for (const l of leads) by[l.durum] = (by[l.durum] || 0) + 1;
    return by;
  }, [leads]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected((prev) => {
      if (filtered.every((l) => prev.has(l.id))) return new Set();
      return new Set(filtered.map((l) => l.id));
    });
  }

  async function handleSearch() {
    if (!kategori.trim() || !sehir.trim()) return;
    const params: SearchParams = {
      ulke: ulke.trim(),
      sehir: sehir.trim(),
      kategori: kategori.trim(),
      limit,
      min_puan: minPuan,
      sadece_email: sadeceEmail,
      sadece_telefon: sadeceTelefon,
      sadece_web: sadeceWeb,
    };
    await runSearch(params);
  }

  function downloadCSV() {
    const csv = Papa.unparse(exportRows(filtered));
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musteriler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function downloadXLSX() {
    const ws = XLSX.utils.json_to_sheet(exportRows(filtered));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');
    XLSX.writeFile(wb, `musteriler-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function handleDeleteSelected() {
    if (!selected.size) return;
    if (!confirm(`${selected.size} kayıt silinecek. Emin misiniz?`)) return;
    await deleteLeads([...selected]);
    setSelected(new Set());
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-2">
            <Users size={28} /> Müşteri Bulma
          </h1>
          <p className="text-on-surface-variant mt-1">
            Google Haritalar'dan sektör ve şehre göre potansiyel müşteri bulun, kaydedin, iletişime geçin.
          </p>
        </div>
        <button
          onClick={fetchLeads}
          className="px-4 py-2 text-sm font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low"
        >
          Yenile
        </button>
      </header>

      {/* Görünüm sekmeleri */}
      <div className="flex gap-1 border-b border-outline-variant/20">
        <ViewTab active={view === 'leads'} onClick={() => setView('leads')} icon={Users} label="Müşteriler" count={leads.length} />
        <ViewTab active={view === 'mail'} onClick={() => { setView('mail'); fetchMailLog(); }} icon={History} label="Mail Geçmişi" count={mailLog.length} />
      </div>

      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">{error}</div>
      )}
      {toast && (
        <div className="bg-success-container text-on-success-container border border-success/20 rounded-xl p-4 text-sm">
          {toast}
        </div>
      )}

      {view === 'mail' && <MailHistory mailLog={mailLog} />}

      {view === 'leads' && (<>

      {/* Arama formu */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
          <Search size={16} /> Yeni Arama
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Ülke">
            <input value={ulke} onChange={(e) => setUlke(e.target.value)} placeholder="Almanya"
              className={inputCls} />
          </Field>
          <Field label="Şehir *">
            <input value={sehir} onChange={(e) => setSehir(e.target.value)} placeholder="Köln"
              className={inputCls} />
          </Field>
          <Field label="Sektör / Kategori *">
            <input value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="restoran, otel, kafe..."
              className={inputCls} />
          </Field>
          <Field label="Sayı (max 120)">
            <input type="number" min={1} max={120} value={limit}
              onChange={(e) => setLimit(Math.min(120, Math.max(1, Number(e.target.value) || 1)))}
              className={inputCls} />
          </Field>
          <Field label="Min. puan">
            <input type="number" min={0} max={5} step={0.1} value={minPuan}
              onChange={(e) => setMinPuan(Math.min(5, Math.max(0, Number(e.target.value) || 0)))}
              className={inputCls} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-4 pt-6">
            <Toggle label="Sadece e-postası olanlar" checked={sadeceEmail} onChange={setSadeceEmail} />
            <Toggle label="Sadece telefonu olanlar" checked={sadeceTelefon} onChange={setSadeceTelefon} />
            <Toggle label="Sadece web sitesi olanlar" checked={sadeceWeb} onChange={setSadeceWeb} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSearch}
            disabled={searching || !kategori.trim() || !sehir.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searching ? 'Aranıyor...' : 'Ara'}
          </button>
          {searching && (
            <span className="text-xs text-on-surface-variant">
              Google Haritalar taranıyor, bu işlem 30–90 saniye sürebilir...
            </span>
          )}
        </div>
      </div>

      {/* Durum chip'leri */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white border-primary'
              : 'bg-surface-container-lowest text-on-surface border-outline-variant/20 hover:bg-surface-container-low'
          }`}
        >
          Tümü · {stats.all}
        </button>
        {STATUS_FLOW.map((s) => {
          const meta = STATUS_META[s];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                active ? 'bg-primary text-white border-primary' : `${meta.cls} hover:opacity-80`
              }`}
            >
              {meta.label} · {stats[s] || 0}
            </button>
          );
        })}
      </div>

      {/* Gelişmiş filtreler */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant mr-1 pb-2">
          <SlidersHorizontal size={14} /> Filtre
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-on-surface-variant">Mail durumu</span>
          <select value={mailFilter} onChange={(e) => setMailFilter(e.target.value as 'all' | MailStatus)} className={selCls}>
            <option value="all">Tümü</option>
            <option value="gonderilmedi">Gönderilmedi</option>
            <option value="gonderildi">Gönderildi</option>
            <option value="yanit_geldi">Yanıt geldi</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-on-surface-variant">Kategori</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${selCls} max-w-[180px]`}>
            <option value="all">Tüm kategoriler</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-on-surface-variant">Min. puan</span>
          <input type="number" min={0} max={5} step={0.1} value={fMinPuan}
            onChange={(e) => setFMinPuan(Math.min(5, Math.max(0, Number(e.target.value) || 0)))}
            className={`${selCls} w-20`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-on-surface-variant">Min. yorum</span>
          <input type="number" min={0} value={fMinYorum}
            onChange={(e) => setFMinYorum(Math.max(0, Number(e.target.value) || 0))}
            className={`${selCls} w-24`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1"><ArrowUpDown size={11} /> Sırala</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={selCls}>
            <option value="recent">En yeni</option>
            <option value="puan">Puan (yüksek→düşük)</option>
            <option value="yorum">Yorum sayısı</option>
            <option value="isim">İsim (A-Z)</option>
          </select>
        </label>
        <div className="flex items-end gap-2 pb-0.5">
          <FilterChip active={fHasEmail} onClick={() => setFHasEmail((v) => !v)} icon={Mail} label="E-posta" />
          <FilterChip active={fHasPhone} onClick={() => setFHasPhone((v) => !v)} icon={Phone} label="Telefon" />
          <FilterChip active={fHasWeb} onClick={() => setFHasWeb((v) => !v)} icon={Globe} label="Web" />
        </div>
        <button onClick={clearFilters} disabled={activeFilters === 0}
          className="ml-auto px-3 py-2 rounded-lg border border-outline-variant/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-surface-container-low disabled:opacity-40">
          <X size={14} /> Temizle{activeFilters ? ` (${activeFilters})` : ''}
        </button>
        <div className="w-full text-xs text-on-surface-variant pt-1">
          {filtered.length} / {leads.length} kayıt gösteriliyor
        </div>
      </div>

      {/* Araç çubuğu: arama + export + toplu işlemler */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, adres, telefon, e-posta veya kategori ara..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs font-bold text-on-surface-variant">{selected.size} seçili</span>
              <button onClick={() => setMailIds([...selected])}
                className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90">
                <Mail size={14} /> Mail gönder
              </button>
              <button onClick={handleDeleteSelected}
                className="px-3 py-2 rounded-lg border border-error/30 text-error text-xs font-bold inline-flex items-center gap-1.5 hover:bg-error-container">
                <Trash2 size={14} /> Sil
              </button>
            </>
          )}
          <button onClick={downloadCSV} disabled={!filtered.length}
            className="px-3 py-2 rounded-lg border border-outline-variant/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-surface-container-low disabled:opacity-40">
            <FileText size={14} /> CSV
          </button>
          <button onClick={downloadXLSX} disabled={!filtered.length}
            className="px-3 py-2 rounded-lg border border-outline-variant/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-surface-container-low disabled:opacity-40">
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant">
            <Loader2 className="animate-spin mx-auto mb-2" /> Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <Filter size={32} className="mx-auto mb-2 opacity-40" />
            Henüz kayıt yok. Yukarıdan bir arama yapın.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <button onClick={toggleSelectAll} className="align-middle">
                      {allVisibleSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="px-4 py-3">İşletme</th>
                  <th className="px-4 py-3">İletişim</th>
                  <th className="px-4 py-3">Puan</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Mail</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((l) => {
                  const tur = classifyKategori(l.kategori);
                  return (
                  <tr key={l.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-3 py-3">
                      <button onClick={() => toggleSelect(l.id)} className="align-middle">
                        {selected.has(l.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-on-surface">{l.isim || '—'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                        {tur && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${tur.cls}`} title={l.kategori || undefined}>
                            {tur.label}
                          </span>
                        )}
                        {l.kategori && (!tur || tur.label.toLowerCase() !== l.kategori.toLowerCase()) && (
                          <span className="text-on-surface-variant/70">{l.kategori}</span>
                        )}
                        {l.adres && <span className="inline-flex items-center gap-0.5"><MapPin size={11} /> {l.adres}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 space-y-0.5">
                      {l.telefon && (
                        <a href={`tel:${l.telefon}`} className="text-xs flex items-center gap-1 text-on-surface hover:text-primary">
                          <Phone size={12} /> {l.telefon}
                        </a>
                      )}
                      {l.email && (
                        <a href={`mailto:${l.email}`} className="text-xs flex items-center gap-1 text-on-surface hover:text-primary">
                          <Mail size={12} /> {l.email}
                        </a>
                      )}
                      {l.website && (
                        <a href={l.website} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                          <Globe size={12} /> Web sitesi
                        </a>
                      )}
                      {!l.telefon && !l.email && !l.website && <span className="text-xs text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {l.puan != null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface">
                          <Star size={13} className="text-warning fill-warning" /> {l.puan}
                          {l.yorum_sayisi != null && <span className="text-on-surface-variant font-normal">({l.yorum_sayisi})</span>}
                        </span>
                      ) : <span className="text-xs text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${STATUS_META[l.durum]?.cls}`}>
                        {STATUS_META[l.durum]?.label || l.durum}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium ${MAIL_META[l.mail_durumu]?.cls}`}>
                      {MAIL_META[l.mail_durumu]?.label}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {l.telefon && (
                        phoneIsWhatsapp(l.telefon) ? (
                          <a href={waLink(l.telefon, fillVars(WA_TEMPLATES[0].text.de, l))} target="_blank" rel="noreferrer"
                            onClick={() => markWhatsapp(l.id)} title="WhatsApp mesajı gönder"
                            className={`inline-flex rounded-lg p-1.5 mr-1 align-middle ${
                              l.whatsapp_durumu === 'gonderildi'
                                ? 'text-success'
                                : 'text-on-surface-variant hover:bg-success/10 hover:text-success'
                            }`}>
                            <MessageCircle size={14} />
                          </a>
                        ) : (
                          <a href={`tel:${l.telefon}`} title="Ara (sabit hat — WhatsApp yok)"
                            className="inline-flex rounded-lg p-1.5 mr-1 align-middle text-on-surface-variant hover:bg-primary/10 hover:text-primary">
                            <Phone size={14} />
                          </a>
                        )
                      )}
                      {l.email && (
                        <button onClick={() => setMailIds([l.id])} title="Hızlı mail gönder"
                          className="text-primary hover:bg-primary/10 rounded-lg p-1.5 mr-1 align-middle">
                          <Send size={14} />
                        </button>
                      )}
                      <button onClick={() => setDetail(l)} className="text-primary font-bold text-xs hover:underline">Aç</button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>)}

      {detail && (
        <LeadDrawer
          lead={detail}
          onClose={() => setDetail(null)}
          onStatus={async (s) => { await updateLeadStatus(detail.id, s); setDetail({ ...detail, durum: s }); }}
          onNote={async (n) => { await updateLeadNote(detail.id, n); setDetail({ ...detail, notlar: n }); }}
          onMail={() => setMailIds([detail.id])}
          onWhatsapp={() => markWhatsapp(detail.id)}
          onFetchReviews={(max) => fetchReviews(detail.id, detail.place_url || '', max)}
        />
      )}

      {mailIds && (
        <MailModal
          count={mailIds.length}
          sending={sending}
          onClose={() => setMailIds(null)}
          onSend={async (subject, body) => {
            const r = await sendMail(mailIds, subject, body);
            setMailIds(null);
            setSelected(new Set());
            setToast(`${r.sent} mail gönderildi · ${r.skipped} atlandı (e-posta yok) · ${r.failed} başarısız.`);
          }}
        />
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none';

const selCls =
  'px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none';

function FilterChip({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-2 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition-colors ${
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-surface-container-lowest text-on-surface border-outline-variant/20 hover:bg-surface-container-low'
      }`}>
      <Icon size={13} /> {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-on-surface-variant mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-primary" />
      {label}
    </label>
  );
}

function LeadDrawer({
  lead, onClose, onStatus, onNote, onMail, onWhatsapp, onFetchReviews,
}: {
  lead: CustomerLead;
  onClose: () => void;
  onStatus: (s: LeadStatus) => Promise<void>;
  onNote: (n: string) => Promise<void>;
  onMail: () => void;
  onWhatsapp: () => void;
  onFetchReviews: (max: number) => Promise<LeadReview[]>;
}) {
  const [note, setNote] = useState(lead.notlar || '');
  const [saving, setSaving] = useState<string | null>(null);
  const [waMsg, setWaMsg] = useState(WA_TEMPLATES[0].text.de);
  const [waLang, setWaLang] = useState<Lang>('de');
  const [waTpl, setWaTpl] = useState(0);

  function applyWa(idx: number, lng: Lang) {
    const t = WA_TEMPLATES[idx];
    if (t) setWaMsg(t.text[lng]);
  }
  const [reviews, setReviews] = useState<LeadReview[] | null>(lead.yorumlar ?? null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewErr, setReviewErr] = useState<string | null>(null);

  async function loadReviews() {
    if (!lead.place_url) return;
    setLoadingReviews(true);
    setReviewErr(null);
    try {
      const r = await onFetchReviews(10);
      setReviews(r);
    } catch (e) {
      setReviewErr((e as Error).message);
    } finally {
      setLoadingReviews(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-surface-container-lowest w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/10 p-5 flex items-start justify-between">
          <div>
            <div className="font-black text-on-surface">{lead.isim || '—'}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
              {(() => {
                const tur = classifyKategori(lead.kategori);
                return (<>
                  {tur && <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${tur.cls}`}>{tur.label}</span>}
                  {lead.kategori && (!tur || tur.label.toLowerCase() !== lead.kategori.toLowerCase()) && <span className="text-on-surface-variant/70">{lead.kategori}</span>}
                </>);
              })()}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container-low"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">İletişim</h3>
            <div className="bg-surface-container-low rounded-xl p-4 space-y-2 text-sm">
              {lead.adres && <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 text-on-surface-variant" /> {lead.adres}</div>}
              {lead.telefon && <a href={`tel:${lead.telefon}`} className="flex items-center gap-2 hover:text-primary"><Phone size={14} /> {lead.telefon}</a>}
              {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2 hover:text-primary"><Mail size={14} /> {lead.email}</a>}
              {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><Globe size={14} /> {lead.website}</a>}
              {lead.place_url && <a href={lead.place_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline"><MapPin size={14} /> Google Haritalar'da aç</a>}
              {lead.puan != null && (
                <div className="flex items-center gap-1"><Star size={14} className="text-warning fill-warning" /> {lead.puan}
                  {lead.yorum_sayisi != null && <span className="text-on-surface-variant">({lead.yorum_sayisi} yorum)</span>}
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Durum</h3>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_FLOW.map((s) => {
                const meta = STATUS_META[s];
                const isActive = lead.durum === s;
                return (
                  <button
                    key={s}
                    disabled={isActive || saving === s}
                    onClick={async () => { setSaving(s); await onStatus(s); setSaving(null); }}
                    className={`px-2 py-2 rounded-lg text-xs font-bold border inline-flex items-center justify-center gap-1 transition-colors ${
                      isActive ? `${meta.cls} opacity-70 cursor-default` : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-high'
                    }`}
                  >
                    {saving === s ? <Loader2 size={12} className="animate-spin" /> : null}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <button onClick={onMail} disabled={!lead.email}
              className="w-full px-3 py-2.5 rounded-lg bg-primary text-white font-bold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              <Send size={15} /> {lead.email ? 'Mail gönder' : 'E-posta adresi yok'}
            </button>
            {lead.mail_durumu === 'gonderildi' && (
              <p className="text-xs text-success mt-2 text-center">
                Bu işletmeye mail gönderildi{lead.mail_sent_at ? ` · ${new Date(lead.mail_sent_at).toLocaleString('tr-TR')}` : ''}.
              </p>
            )}
          </section>

          {/* WhatsApp */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
              <MessageCircle size={12} /> WhatsApp
            </h3>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold text-on-surface-variant">Dil:</span>
              {LANGS.map((L) => (
                <button key={L.code} type="button"
                  onClick={() => { setWaLang(L.code); if (waTpl >= 0) applyWa(waTpl, L.code); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    waLang === L.code ? 'bg-primary text-white border-primary' : 'border-outline-variant/20 hover:bg-surface-container-low'
                  }`}>
                  {L.label}
                </button>
              ))}
            </div>
            <Field label="Hazır mesaj">
              <select className={inputCls} value={waTpl}
                onChange={(e) => { const i = Number(e.target.value); setWaTpl(i); applyWa(i, waLang); }}>
                <option value={-1} disabled>Bir şablon seç...</option>
                {WA_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
              </select>
            </Field>
            <textarea value={waMsg} onChange={(e) => setWaMsg(e.target.value)} rows={3}
              className="w-full mt-2 px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            <a
              href={lead.telefon ? waLink(lead.telefon, fillVars(waMsg, lead)) : undefined}
              target="_blank" rel="noreferrer"
              onClick={() => { if (lead.telefon) onWhatsapp(); }}
              className={`mt-2 w-full px-3 py-2.5 rounded-lg font-bold text-sm inline-flex items-center justify-center gap-2 ${
                lead.telefon
                  ? 'bg-[#25D366] text-white hover:opacity-90'
                  : 'bg-surface-container-low text-on-surface-variant pointer-events-none opacity-60'
              }`}>
              <MessageCircle size={15} /> {lead.telefon ? "WhatsApp'ta aç ve gönder" : 'Telefon numarası yok'}
            </a>
            {lead.whatsapp_durumu === 'gonderildi' && (
              <p className="text-xs text-success mt-2 text-center">
                WhatsApp ile ulaşıldı{lead.whatsapp_sent_at ? ` · ${new Date(lead.whatsapp_sent_at).toLocaleString('tr-TR')}` : ''}.
              </p>
            )}
            <p className="text-[11px] text-on-surface-variant mt-1 text-center">
              WhatsApp açılır, mesaj hazır gelir; "gönder"e sen basarsın. Ücretsiz, kredi harcamaz.
            </p>
          </section>

          {/* Google Yorumları (talep üzerine) */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
              <MessageSquare size={12} /> Google Yorumları
            </h3>
            {reviews && reviews.length > 0 ? (
              <div className="space-y-2">
                {reviews.map((r, i) => (
                  <div key={i} className="bg-surface-container-low rounded-xl p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-on-surface truncate">{r.author || 'Anonim'}</span>
                      {r.stars != null && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-warning shrink-0">
                          <Star size={12} className="fill-warning" /> {r.stars}
                        </span>
                      )}
                    </div>
                    {r.text && <p className="text-on-surface-variant mt-1 whitespace-pre-wrap">{r.text}</p>}
                    {r.date && <div className="text-[11px] text-on-surface-variant mt-1">{new Date(r.date).toLocaleDateString('tr-TR')}</div>}
                  </div>
                ))}
                <button onClick={loadReviews} disabled={loadingReviews || !lead.place_url}
                  className="text-xs text-primary hover:underline disabled:opacity-50">
                  {loadingReviews ? 'Yenileniyor...' : 'Yorumları yenile (ek kredi)'}
                </button>
              </div>
            ) : reviews && reviews.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Bu işletme için yorum bulunamadı.</p>
            ) : (
              <div>
                <button onClick={loadReviews} disabled={loadingReviews || !lead.place_url}
                  className="w-full px-3 py-2.5 rounded-lg border border-outline-variant/20 font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-surface-container-low disabled:opacity-50">
                  {loadingReviews ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                  {loadingReviews ? 'Yorumlar getiriliyor...' : 'Google yorumlarını getir'}
                </button>
                <p className="text-[11px] text-on-surface-variant mt-1 text-center">
                  Bu işlem ~10 yorum çeker ve küçük miktarda Apify kredisi harcar. Bir kez çekilince kaydedilir.
                </p>
                {!lead.place_url && (
                  <p className="text-[11px] text-error mt-1 text-center">Bu işletme için Google Haritalar adresi yok.</p>
                )}
              </div>
            )}
            {reviewErr && <p className="text-xs text-error mt-1">{reviewErr}</p>}
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
              <StickyNote size={12} /> Not
            </h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Bu müşteri hakkında not..."
              className="w-full px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            <button
              disabled={saving === 'note'}
              onClick={async () => { setSaving('note'); await onNote(note.trim()); setSaving(null); }}
              className="mt-2 px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving === 'note' ? 'Kaydediliyor...' : 'Notu kaydet'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function MailModal({
  count, sending, onClose, onSend,
}: {
  count: number;
  sending: boolean;
  onClose: () => void;
  onSend: (subject: string, body: string) => Promise<void>;
}) {
  const [lang, setLang] = useState<Lang>('de');
  const [tplIdx, setTplIdx] = useState(0);
  const [subject, setSubject] = useState(MAIL_TEMPLATES[0].subject.de);
  const [body, setBody] = useState(MAIL_TEMPLATES[0].body.de);

  function applyTpl(idx: number, lng: Lang) {
    const t = MAIL_TEMPLATES[idx];
    if (t) { setSubject(t.subject[lng]); setBody(t.body[lng]); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-black text-on-surface flex items-center gap-2"><Mail size={20} /> Mail gönder</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container-low"><X size={18} /></button>
        </div>
        <p className="text-xs text-on-surface-variant">
          {count} işletmeye gönderilecek. <code className="bg-surface-container-low px-1 rounded">{'{{isim}}'}</code>, <code className="bg-surface-container-low px-1 rounded">{'{{kategori}}'}</code>, <code className="bg-surface-container-low px-1 rounded">{'{{adres}}'}</code> yer tutucuları her işletmenin bilgisiyle otomatik doldurulur. E-postası olmayanlar atlanır.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-on-surface-variant">Dil:</span>
          {LANGS.map((L) => (
            <button key={L.code} type="button"
              onClick={() => { setLang(L.code); if (tplIdx >= 0) applyTpl(tplIdx, L.code); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                lang === L.code ? 'bg-primary text-white border-primary' : 'border-outline-variant/20 hover:bg-surface-container-low'
              }`}>
              {L.label}
            </button>
          ))}
        </div>
        <Field label="Hazır taslak">
          <select className={inputCls} value={tplIdx}
            onChange={(e) => { const i = Number(e.target.value); setTplIdx(i); applyTpl(i, lang); }}>
            <option value={-1} disabled>Bir taslak seç...</option>
            {MAIL_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Konu">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Mesaj">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className={inputCls} />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant/20 text-sm font-bold hover:bg-surface-container-low">İptal</button>
          <button onClick={() => onSend(subject, body)} disabled={sending || !subject.trim() || !body.trim()}
            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewTab({ active, onClick, icon: Icon, label, count }: {
  active: boolean; onClick: () => void; icon: any; label: string; count: number;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 pb-3 -mb-px text-sm font-bold border-b-2 transition-colors ${
        active ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'
      }`}>
      <Icon size={16} /> {label} <span className="text-xs opacity-70">({count})</span>
    </button>
  );
}

function MailHistory({ mailLog }: { mailLog: MailLogEntry[] }) {
  const [view, setView] = useState<MailLogEntry | null>(null);
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
      {mailLog.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant">
          <Mail size={32} className="mx-auto mb-2 opacity-40" />
          Henüz mail gönderilmedi. Müşteriler sekmesinden bir işletmeye mail gönderin.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">İşletme</th>
                <th className="px-4 py-3">Alıcı</th>
                <th className="px-4 py-3">Konu</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {mailLog.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">{new Date(m.created_at).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{m.lead_isim || '—'}</td>
                  <td className="px-4 py-3 text-xs">{m.to_email}</td>
                  <td className="px-4 py-3 text-xs max-w-[260px] truncate">{m.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${
                      m.status === 'gonderildi'
                        ? 'bg-success-container text-on-success-container border-success/20'
                        : 'bg-error-container text-error border-error/20'
                    }`}>
                      {m.status === 'gonderildi' ? 'Gönderildi' : 'Başarısız'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setView(m)} className="text-primary font-bold text-xs hover:underline">Mesajı gör</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setView(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-black text-on-surface">{view.lead_isim || '—'}</div>
                <div className="text-xs text-on-surface-variant">{view.to_email} · {new Date(view.created_at).toLocaleString('tr-TR')}</div>
              </div>
              <button onClick={() => setView(null)} className="p-1.5 rounded-full hover:bg-surface-container-low"><X size={18} /></button>
            </div>
            <div className="text-sm"><span className="font-bold">Konu:</span> {view.subject}</div>
            <div className="bg-surface-container-low rounded-xl p-3 text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto">{view.body}</div>
          </div>
        </div>
      )}
    </div>
  );
}
