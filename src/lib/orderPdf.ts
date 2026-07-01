/**
 * orderPdf — bir sipariş için A4 PDF üretir. Tüm çizim paylaşılan
 * `angebotPdf` (buildAngebotPdf) şablonuna devredilmiştir; burada yalnızca
 * sipariş verisi normalize edilir (alıcı + görselli ürün satırları).
 * İmzalar değişmedi: WhatsApp gönderimi (orderWhatsapp.ts) bozulmaz.
 */
import { jsPDF } from 'jspdf';
import { buildAngebotPdf, type DocLine } from './angebotPdf';
import { parseOrderNotes, type OrderLike } from './orderWhatsapp';
import { useEquipmentStore } from '../stores/equipmentStore';

export async function generateOrderPdf(order: OrderLike): Promise<jsPDF> {
  const dateStr = new Date(order.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const c = parseOrderNotes(order.notes);
  const getItem = useEquipmentStore.getState().getItemById;

  const recipient = [
    c.name, c.company, c.address, c.phone ? `Tel.: ${c.phone}` : '',
    (!c.name && !c.address && !c.phone) ? c.raw : '',
  ].filter(Boolean) as string[];

  const lines: DocLine[] = (order.items || []).map((it, i) => ({
    pos: i + 1,
    name: it.name || '—',
    sub: [it.product_id, it.brand].filter(Boolean).join('  ·  ') || undefined,
    qty: it.quantity || 1,
    unit: 'Stück',
    unitPrice: it.price ?? 0,
    imageUrl: it.image || getItem(it.product_id)?.img || null,
  }));

  return buildAngebotPdf(
    { kind: 'bestellung', number: order.order_number, date: dateStr, recipient },
    lines,
  );
}

export async function downloadOrderPdf(order: OrderLike): Promise<void> {
  const doc = await generateOrderPdf(order);
  doc.save(`Bestellung_2MC_${order.order_number}.pdf`);
}
