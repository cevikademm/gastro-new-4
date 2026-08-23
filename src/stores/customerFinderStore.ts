import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export type LeadStatus = 'yeni' | 'arandi' | 'ilgilendi' | 'musteri' | 'olumsuz';
export type MailStatus = 'gonderilmedi' | 'gonderildi' | 'yanit_geldi';

/**
 * Kazınan (Apify → Google Haritalar) metin alanlarını görüntülemeye hazırlar:
 * satır sonu/sekme/çift boşluk tek boşluğa iner, baş-son boşluk atılır.
 * Kaynak siteden gelen veri her zaman temiz gelmiyor; ham hâliyle basınca
 * hücrede kopuk/biçimsiz görünüyor.
 */
export const cleanText = (v: string | null | undefined): string | null => {
  // \u00A0 kırılmaz boşluk · \u200B-\u200D sıfır genişlikli · \uFEFF BOM
  const s = String(v ?? '').replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, ' ').trim();
  return s || null;
};

/**
 * E-posta temizliği: "mailto:" öneki, sorgu eki (?subject=…), sondaki
 * noktalama ve boşluklar atılır. Yerel kısım büyük/küçük harfe duyarlı
 * olabildiği için harf dönüşümü YAPILMAZ (H5008@accor.com gerçek bir adres).
 * Adres hiç kalmazsa null döner.
 */
export const cleanEmail = (v: string | null | undefined): string | null => {
  let s = cleanText(v) || '';
  s = s.replace(/^mailto:/i, '').split('?')[0].replace(/\s+/g, '');
  s = s.replace(/^[<("']+|[>)"'.,;:]+$/g, '');
  return s || null;
};

/** Kayıttaki serbest metin alanlarını normalize eder (liste + dışa aktarım). */
const normalizeLead = (l: CustomerLead): CustomerLead => ({
  ...l,
  isim: cleanText(l.isim),
  kategori: cleanText(l.kategori),
  adres: cleanText(l.adres),
  telefon: cleanText(l.telefon),
  email: cleanEmail(l.email),
  website: cleanText(l.website),
});

export interface LeadReview {
  author: string | null;
  text: string | null;
  stars: number | null;
  date: string | null;
}

export interface MailLogEntry {
  id: string;
  lead_id: string | null;
  lead_isim: string | null;
  to_email: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  created_at: string;
}

/** Bir arama kaydı (customer_searches) — ülke/şehir gruplaması + sekmeler için. */
export interface CustomerSearch {
  id: string;
  ulke: string | null;
  sehir: string | null;
  kategori: string | null;
  created_at: string;
}

export interface CustomerLead {
  id: string;
  search_id: string | null;
  place_id: string | null;
  isim: string | null;
  kategori: string | null;
  adres: string | null;
  telefon: string | null;
  email: string | null;
  website: string | null;
  place_url: string | null;
  puan: number | null;
  yorum_sayisi: number | null;
  lat: number | null;
  lng: number | null;
  durum: LeadStatus;
  mail_durumu: MailStatus;
  mail_sent_at: string | null;
  whatsapp_durumu: 'gonderilmedi' | 'gonderildi';
  whatsapp_sent_at: string | null;
  notlar: string | null;
  yorumlar: LeadReview[] | null;
  created_at: string;
  updated_at: string;
}

export interface SearchParams {
  ulke: string;
  sehir: string;
  kategori: string;
  limit: number;
  min_puan: number;
  sadece_email: boolean;
  sadece_telefon: boolean;
  sadece_web: boolean;
}

export interface SendMailResult {
  sent: number;
  failed: number;
  skipped: number;
}

interface CustomerFinderState {
  leads: CustomerLead[];
  searches: CustomerSearch[];
  mailLog: MailLogEntry[];
  loading: boolean;
  searching: boolean;
  sending: boolean;
  error: string | null;
  lastSearch: { found: number; inserted: number } | null;

  runSearch: (params: SearchParams) => Promise<boolean>;
  fetchLeads: () => Promise<void>;
  fetchReviews: (leadId: string, placeUrl: string, max?: number) => Promise<LeadReview[]>;
  updateLeadStatus: (id: string, durum: LeadStatus) => Promise<boolean>;
  updateLeadNote: (id: string, notlar: string) => Promise<boolean>;
  markWhatsapp: (id: string) => Promise<void>;
  sendMail: (ids: string[], subject: string, bodyTemplate: string) => Promise<SendMailResult>;
  fetchMailLog: () => Promise<void>;
  deleteLeads: (ids: string[]) => Promise<boolean>;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const token = data?.session?.access_token || SUPABASE_ANON_KEY || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY || '',
  };
}

// {{isim}}, {{kategori}}, {{sehir}}, {{adres}} placeholder'larını doldurur.
function fillTemplate(tpl: string, lead: CustomerLead): string {
  return tpl
    .replace(/\{\{\s*isim\s*\}\}/gi, lead.isim || '')
    .replace(/\{\{\s*kategori\s*\}\}/gi, lead.kategori || '')
    .replace(/\{\{\s*adres\s*\}\}/gi, lead.adres || '')
    .replace(/\{\{\s*website\s*\}\}/gi, lead.website || '');
}

export const useCustomerFinderStore = create<CustomerFinderState>((set, get) => ({
  leads: [],
  searches: [],
  mailLog: [],
  loading: false,
  searching: false,
  sending: false,
  error: null,
  lastSearch: null,

  runSearch: async (params) => {
    if (!SUPABASE_URL) {
      set({ error: 'Supabase yapılandırılmamış' });
      return false;
    }
    set({ searching: true, error: null, lastSearch: null });
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/apify-google-maps`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(params),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || `Arama başarısız (${res.status})`);
      set({ searching: false, lastSearch: { found: payload.found, inserted: payload.inserted } });
      await get().fetchLeads();
      return true;
    } catch (err) {
      set({ searching: false, error: (err as Error).message });
      return false;
    }
  },

  fetchLeads: async () => {
    if (!supabase) return;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('customer_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    // Aramaların ülke/şehir bilgisini de çek (satır gruplama + sekmeler için).
    let searches: CustomerSearch[] = [];
    try {
      const { data: sData } = await supabase
        .from('customer_searches')
        .select('id, ulke, sehir, kategori, created_at')
        .order('created_at', { ascending: false });
      searches = (sData || []) as CustomerSearch[];
    } catch { /* aramalar alınamazsa gruplama adresten türetilir */ }
    // Kazınan veri ham hâliyle basılmaz — tek giriş noktasında normalize edilir,
    // böylece liste, detay, mail gönderimi ve dışa aktarım aynı temiz değeri görür.
    const leads = ((data || []) as CustomerLead[]).map(normalizeLead);
    set({ leads, searches, loading: false });
  },

  fetchReviews: async (leadId, placeUrl, max = 10) => {
    if (!SUPABASE_URL) throw new Error('Supabase yapılandırılmamış');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/apify-google-maps`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ mode: 'reviews', lead_id: leadId, place_url: placeUrl, max_reviews: max }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error || `Yorumlar alınamadı (${res.status})`);
    const reviews = (payload.reviews || []) as LeadReview[];
    set((s) => ({ leads: s.leads.map((l) => (l.id === leadId ? { ...l, yorumlar: reviews } : l)) }));
    return reviews;
  },

  updateLeadStatus: async (id, durum) => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('customer_leads')
      .update({ durum, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, durum } : l)) }));
    return true;
  },

  updateLeadNote: async (id, notlar) => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('customer_leads')
      .update({ notlar, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      set({ error: error.message });
      return false;
    }
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, notlar } : l)) }));
    return true;
  },

  markWhatsapp: async (id) => {
    const now = new Date().toISOString();
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, whatsapp_durumu: 'gonderildi', whatsapp_sent_at: now } : l,
      ),
    }));
    if (supabase) {
      await supabase
        .from('customer_leads')
        .update({ whatsapp_durumu: 'gonderildi', whatsapp_sent_at: now })
        .eq('id', id);
    }
  },

  sendMail: async (ids, subject, bodyTemplate) => {
    set({ sending: true, error: null });
    const result: SendMailResult = { sent: 0, failed: 0, skipped: 0 };
    const headers = await authHeaders();
    const targets = get().leads.filter((l) => ids.includes(l.id));

    for (const lead of targets) {
      if (!lead.email) {
        result.skipped++;
        continue;
      }
      const filledSubject = fillTemplate(subject, lead);
      const filledBody = fillTemplate(bodyTemplate, lead);
      let ok = false;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            template: 'cold-outreach',
            to: lead.email,
            data: { subject: filledSubject, body: filledBody },
          }),
        });
        ok = res.ok;
      } catch {
        ok = false;
      }

      // Her denemeyi mail geçmişine yaz (gönderildi / başarısız)
      if (supabase) {
        await supabase.from('customer_mail_log').insert({
          lead_id: lead.id,
          lead_isim: lead.isim,
          to_email: lead.email,
          subject: filledSubject,
          body: filledBody,
          status: ok ? 'gonderildi' : 'basarisiz',
        });
      }

      if (ok) {
        result.sent++;
        const now = new Date().toISOString();
        if (supabase) {
          await supabase
            .from('customer_leads')
            .update({ mail_durumu: 'gonderildi', mail_sent_at: now })
            .eq('id', lead.id);
        }
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === lead.id ? { ...l, mail_durumu: 'gonderildi', mail_sent_at: now } : l,
          ),
        }));
      } else {
        result.failed++;
      }
    }

    set({ sending: false });
    await get().fetchMailLog();
    return result;
  },

  fetchMailLog: async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('customer_mail_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      set({ error: error.message });
      return;
    }
    set({ mailLog: (data || []) as MailLogEntry[] });
  },

  deleteLeads: async (ids) => {
    if (!supabase) return false;
    const { error } = await supabase.from('customer_leads').delete().in('id', ids);
    if (error) {
      set({ error: error.message });
      return false;
    }
    set((s) => ({ leads: s.leads.filter((l) => !ids.includes(l.id)) }));
    return true;
  },
}));
