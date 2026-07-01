/**
 * orderWhatsapp — sipariş için WhatsApp METİN bildirimi ("kalıp").
 * - parseOrderNotes: CheckoutPage'in "Teslimat: ... | ADRES | Tel: ... | Firma: ... | Kargo: ..."
 *   formatını ayırır; Cart serbest metnini tolere eder. (orderPdf.ts de kullanır.)
 * - buildOrderMessage: saf fonksiyon → düzgün biçimli Türkçe sipariş metni.
 * - sendOrderWhatsapp: send-whatsapp edge function'ını çağırır. ASLA throw etmez.
 *   localStorage '2mc-wa-sent' ile çift-gönderim koruması (force ile atlanır → manuel tekrar).
 */
import { supabase } from './supabase';

/** Hem orderStore.Order hem adminStore.AdminOrder bu yapıyı karşılar. */
export interface OrderLike {
  id: string;
  order_number: string;
  created_at: string;
  notes?: string | null;
  total_price: number;
  total_items: number;
  items: Array<{ name: string; quantity: number; price: number; product_id?: string; image?: string; brand?: string }>;
}

export interface ParsedNotes {
  name?: string;
  address?: string;
  phone?: string;
  company?: string;
  kargo?: string;
  raw: string;
  extra: string[];
}

export function parseOrderNotes(notes: string | undefined | null): ParsedNotes {
  const raw = (notes || '').trim();
  const out: ParsedNotes = { raw, extra: [] };
  if (!raw) return out;
  const after = (seg: string) => seg.slice(seg.indexOf(':') + 1).trim();
  for (const seg of raw.split('|').map((s) => s.trim()).filter(Boolean)) {
    const l = seg.toLowerCase();
    if (l.startsWith('teslimat:') || l.startsWith('müşteri:') || l.startsWith('musteri:')) out.name = after(seg);
    else if (l.startsWith('tel:') || l.startsWith('telefon:')) out.phone = after(seg);
    else if (l.startsWith('firma:') || l.startsWith('şirket:')) out.company = after(seg);
    else if (l.startsWith('kargo:')) out.kargo = after(seg);
    else if (!out.address && /\d|stra(ß|ss)e|str\.|cad|sok|mah|,/i.test(seg)) out.address = seg;
    else out.extra.push(seg);
  }
  return out;
}

const fmtPrice = (n: number) => `€${(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;

export function buildOrderMessage(order: OrderLike): string {
  const c = parseOrderNotes(order.notes);
  const date = new Date(order.created_at).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const sub = order.total_price || 0;
  const lines: string[] = [];

  // Not "Teklif Talebi" içeriyorsa müşteri sipariş değil TEKLİF istemiştir.
  const isQuote = /teklif talebi/i.test(order.notes || '');
  lines.push(isQuote ? '📝 *TEKLİF TALEBİ — 2MC Gastro*' : '🧾 *YENİ SİPARİŞ — 2MC Gastro*');
  lines.push(`No: ${order.order_number}`);
  lines.push(`Tarih: ${date}`);
  lines.push('');

  lines.push('👤 *Müşteri*');
  if (c.name) lines.push(c.name);
  if (c.company) lines.push(c.company);
  if (c.address) lines.push(c.address);
  if (c.phone) lines.push(`Tel: ${c.phone}`);
  if (!c.name && !c.address && !c.phone && c.raw) lines.push(c.raw);
  if (!c.name && !c.address && !c.phone && !c.raw) lines.push('—');
  lines.push('');

  lines.push(`📦 *Ürünler (${order.total_items})*`);
  for (const it of order.items || []) {
    const lineTotal = fmtPrice((it.price || 0) * (it.quantity || 1));
    lines.push(`• ${it.quantity}× ${it.name}${it.product_id ? ` (${it.product_id})` : ''} — ${lineTotal}`);
  }
  lines.push('');

  lines.push(`Ara toplam: ${fmtPrice(sub)}`);
  lines.push(`KDV (%19): ${fmtPrice(sub * 0.19)}`);
  lines.push(`*TOPLAM: ${fmtPrice(sub * 1.19)}*`);
  if (c.kargo) {
    lines.push('');
    lines.push(`🚚 Kargo: ${c.kargo}`);
  }
  return lines.join('\n');
}

/* ─── çift-gönderim koruması ─── */
const SENT_KEY = '2mc-wa-sent';
function getSent(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SENT_KEY) || '[]')); } catch { return new Set(); }
}
function markSent(id: string): void {
  try {
    const s = getSent();
    s.add(id);
    localStorage.setItem(SENT_KEY, JSON.stringify([...s].slice(-500)));
  } catch { /* ignore */ }
}

export interface WaSendResult { ok: boolean; skipped?: boolean; error?: string }

/**
 * Siparişi WhatsApp'a (metin) gönderir. force=true manuel tekrar gönderimde guard'ı atlar.
 * Asla throw etmez — sipariş akışını bloke edemez.
 */
export async function sendOrderWhatsapp(order: OrderLike, opts?: { force?: boolean }): Promise<WaSendResult> {
  if (!order) return { ok: false, error: 'Sipariş yok' };
  if (!opts?.force && getSent().has(order.id)) return { ok: true, skipped: true };
  if (!supabase) return { ok: false, error: 'Supabase yapılandırılmadı' };
  try {
    const text = buildOrderMessage(order);

    // PDF üret + WhatsApp'a BELGE olarak gönder (metin = caption). Üretilemezse sadece metin.
    let body: Record<string, unknown> = { text };
    try {
      const { generateOrderPdf } = await import('./orderPdf');
      const doc = await generateOrderPdf(order);
      const fileBase64 = (doc.output('datauristring') as string).split('base64,').pop();
      if (fileBase64) {
        body = { caption: text, fileName: `Siparis_2MC_${order.order_number}.pdf`, fileBase64 };
      }
    } catch { /* PDF olmadan metin gönderilir */ }

    const { data, error } = await supabase.functions.invoke('send-whatsapp', { body });
    if (error) return { ok: false, error: error.message };
    if (data && (data as any).error) return { ok: false, error: String((data as any).error) };
    const ok = !!(data as any)?.ok;
    if (ok) markSent(order.id);
    return { ok, error: ok ? undefined : 'Mesaj gönderilemedi' };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || 'Gönderim hatası' };
  }
}
