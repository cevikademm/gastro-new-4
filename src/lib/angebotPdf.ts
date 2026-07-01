/**
 * angebotPdf — sipariş ve teklif PDF'leri için TEK paylaşılan A4 şablon.
 * Ekteki resmi "Angebot/Teklif" düzenini birebir kurar: sol üst logo, sağ üst
 * başlık + meta kutusu, gönderen/alıcı blokları, sağda firma iletişimi, ince
 * çerçeveli ürün tablosu (Pos. + görsel), Zwischensumme/USt/Gesamtbetrag,
 * ödeme şartları ve 3 sütunlu altbilgi (firma · vergi · banka).
 *
 * Marka rengi #931315 (rgb 147,19,21) yalnızca vurguda (başlık, tablo başlığı,
 * Gesamtbetrag). Eski kırmızı bant/hologram/şerit tasarımı bilinçli olarak yok.
 *
 * Tüm gövde try/catch korumalı — görsel/font hatası PDF üretimini bozmaz.
 */
import { jsPDF } from 'jspdf';
import { ensurePdfFont } from './pdfFont';
import { loadImageWithSize, fitContain, type LoadedImage } from './pdfImage';
import { COMPANY_INFO } from './companyInfo';
import i18n from '../i18n';

const PW = 210;
const PH = 297;
const M = 15; // sol/sağ kenar boşluğu
const RED: [number, number, number] = [147, 19, 21];
const INK: [number, number, number] = [25, 28, 30];
const GRAY: [number, number, number] = [110, 114, 120];
const GRID: [number, number, number] = [203, 206, 210];
const FOOTER_TOP = PH - 22; // altbilgi üst sınırı
const CONTENT_BOTTOM = FOOTER_TOP - 4;

// Tablo kolon ayraçları (mm). 7 kolon: Pos | Bild | Bezeichnung | Menge | Einheit | Einzel € | Gesamt €
const SEP = [M, 27, 47, 120, 137, 158, 178, PW - M];
const COL = {
  pos: 21,        // ortalı
  bild: { x: 28.5, w: 17 }, // 28.5..45.5 görsel kutusu (oranı korunur)
  bez: 49,        // metin sol
  menge: 128.5,   // ortalı
  einheit: 147.5, // ortalı
  einzel: 176,    // sağ
  gesamt: PW - M - 2, // 193 sağ
} as const;

export interface DocLine {
  pos: number;
  name: string;
  /** Ad altındaki gri satır: marka · ölçü · kW vb. */
  sub?: string;
  qty: number;
  /** Einheit (varsayılan "Stück"). */
  unit?: string;
  /** Birim fiyat (€). null => "Auf Anfrage". */
  unitPrice: number | null;
  imageUrl?: string | null;
}

export interface DocMeta {
  kind: 'angebot' | 'bestellung';
  /** Belge no (AG…/2MC-…/TKF-… veya sipariş no). */
  number: string;
  /** Kundennr. — yoksa satır gizlenir. */
  customerNumber?: string;
  /** Gösterim tarihi (zaten biçimlenmiş). */
  date: string;
  /** gültig bis — yalnız tekliflerde (biçimlenmiş). */
  validUntil?: string;
  /** Alıcı bloğu satırları (ad + adres vb.). */
  recipient: string[];
  /** Başlık metni override (varsayılan kind'e göre). */
  title?: string;
}

export interface DocOpts {
  vatRate?: number;
}

const num = (n: number) =>
  (n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function buildAngebotPdf(
  meta: DocMeta,
  lines: DocLine[],
  opts: DocOpts = {},
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let font = 'helvetica';
  try { font = await ensurePdfFont(doc); } catch { /* helvetica fallback */ }

  const vatRate = opts.vatRate ?? 0.19;
  const isOffer = meta.kind === 'angebot';
  const title = meta.title ?? (isOffer ? 'Angebot / Teklif' : 'Bestellung / Sipariş');
  const numberLabel = isOffer ? 'Angebotsnr.:' : 'Bestellnr.:';

  // ── Görselleri paralel ön-yükle (logo + ürünler) ──
  const logo = await loadImageWithSize(COMPANY_INFO.logoUrl).catch(() => null);
  const imgCache: Record<string, LoadedImage | null> = {};
  await Promise.all(
    lines.map(async (l) => {
      if (!l.imageUrl || imgCache[l.imageUrl] !== undefined) return;
      imgCache[l.imageUrl] = await loadImageWithSize(l.imageUrl).catch(() => null);
    }),
  );

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  // ── Logo çiz (oran korunur) ──
  const drawLogo = (box: { x: number; y: number; w: number; h: number }) => {
    if (logo) {
      try {
        const f = fitContain({ w: logo.w, h: logo.h }, box);
        doc.addImage(logo.dataUrl, logo.format, f.x, f.y, f.w, f.h);
        return;
      } catch { /* metne düş */ }
    }
    setColor(RED); doc.setFont(font, 'bold'); doc.setFontSize(16);
    doc.text('2MC GASTRO', box.x, box.y + box.h * 0.6);
  };

  // ── Tablo başlığı ──
  const vlines = (y1: number, y2: number) => { for (const x of SEP) doc.line(x, y1, x, y2); };
  const hline = (y: number) => doc.line(M, y, PW - M, y);

  const drawTableHead = (top: number): number => {
    const h = 8;
    doc.setDrawColor(GRID[0], GRID[1], GRID[2]); doc.setLineWidth(0.1);
    doc.setFillColor(248, 246, 246); doc.rect(M, top, PW - 2 * M, h, 'F');
    vlines(top, top + h); hline(top);
    // başlık alt çizgisi — kırmızı vurgu
    doc.setDrawColor(RED[0], RED[1], RED[2]); doc.setLineWidth(0.4); hline(top + h);
    doc.setDrawColor(GRID[0], GRID[1], GRID[2]); doc.setLineWidth(0.1);
    setColor(RED); doc.setFont(font, 'bold'); doc.setFontSize(7.5);
    const ty = top + 5.4;
    doc.text('Pos.', COL.pos, ty, { align: 'center' });
    doc.text('Bild', (SEP[1] + SEP[2]) / 2, ty, { align: 'center' });
    doc.text('Bezeichnung', COL.bez, ty);
    doc.text('Menge', COL.menge, ty, { align: 'center' });
    doc.text('Einheit', COL.einheit, ty, { align: 'center' });
    doc.text('Einzel €', COL.einzel, ty, { align: 'right' });
    doc.text('Gesamt €', COL.gesamt, ty, { align: 'right' });
    return top + h;
  };

  // ── Altbilgi (her sayfa) ──
  const ci = COMPANY_INFO;
  const drawFooter = () => {
    doc.setDrawColor(GRID[0], GRID[1], GRID[2]); doc.setLineWidth(0.2);
    doc.line(M, FOOTER_TOP, PW - M, FOOTER_TOP);
    doc.setFont(font, 'normal'); doc.setFontSize(6.6); setColor(GRAY);
    let fy = FOOTER_TOP + 4.5;
    // sol — firma + iletişim
    doc.text([ci.name, ci.street, ci.zipCity, `Tel.: ${ci.phone}`, ci.email, ci.website], M, fy, { lineHeightFactor: 1.35 });
    // orta — vergi
    doc.text([`USt-IdNr.: ${ci.vat}`, `Steuernummer: ${ci.taxNumber}`], 82, fy, { lineHeightFactor: 1.35 });
    // sağ — banka
    doc.text([ci.bank.holder, ci.bank.name, `IBAN: ${ci.bank.iban}`, `BIC: ${ci.bank.bic}`], 150, fy, { lineHeightFactor: 1.35 });
  };

  // ── Devam sayfası başlığı (sayfa ≥ 2) ──
  const drawContinuationHeader = (): number => {
    drawLogo({ x: M, y: 7, w: 34, h: 17 });
    setColor(GRAY); doc.setFont(font, 'normal'); doc.setFontSize(8);
    doc.text(`${numberLabel} ${meta.number}`, PW - M, 16, { align: 'right' });
    doc.setDrawColor(GRID[0], GRID[1], GRID[2]); doc.setLineWidth(0.2);
    doc.line(M, 24, PW - M, 24);
    return 30;
  };

  // ── Sayfa 1 başlığı (tam) ──
  const drawMainHeader = (): number => {
    drawLogo({ x: M, y: 10, w: 60, h: 36 });

    // Başlık (sağ üst)
    setColor(RED); doc.setFont(font, 'bold'); doc.setFontSize(19);
    doc.text(title, PW - M, 22, { align: 'right' });

    // Meta kutusu (etiket · değer, sağa yaslı)
    const rows: Array<[string, string]> = [[numberLabel, meta.number]];
    if (meta.customerNumber) rows.push(['Kundennr.:', meta.customerNumber]);
    rows.push(['Datum:', meta.date]);
    if (isOffer && meta.validUntil) rows.push(['gültig bis:', meta.validUntil]);
    doc.setFont(font, 'normal'); doc.setFontSize(8.5);
    let my = 31;
    for (const [label, val] of rows) {
      setColor(GRAY); doc.text(label, 162, my, { align: 'right' });
      setColor(INK); doc.text(val, PW - M, my, { align: 'right' });
      my += 5;
    }

    // Sağ — firma iletişim bloğu
    doc.setFontSize(8.2);
    const contact = [ci.name, ci.street, ci.zipCity, `Tel.: ${ci.phone}`, ci.email, ci.website];
    let ry = 56;
    setColor(INK); doc.setFont(font, 'bold'); doc.text(contact[0], PW - M, ry, { align: 'right' }); ry += 4.4;
    doc.setFont(font, 'normal'); setColor(GRAY);
    for (const line of contact.slice(1)) { doc.text(line, PW - M, ry, { align: 'right' }); ry += 4.4; }

    // Sol — gönderen satırı (altı çizili) + alıcı bloğu
    doc.setFont(font, 'normal'); doc.setFontSize(7); setColor(GRAY);
    const senderLine = `${ci.name}, ${ci.street}, ${ci.zipCity}`;
    doc.text(senderLine, M, 56);
    doc.setDrawColor(GRID[0], GRID[1], GRID[2]); doc.setLineWidth(0.2);
    doc.line(M, 58, M + 95, 58);

    setColor(INK); doc.setFontSize(10);
    let cy = 67;
    for (const line of meta.recipient.filter(Boolean)) {
      const wrapped = doc.splitTextToSize(line, 90) as string[];
      doc.text(wrapped, M, cy); cy += 4.8 * wrapped.length;
    }

    // "Gerne bieten wir Ihnen an:"
    const introY = Math.max(cy + 6, ry + 6, 96);
    setColor(INK); doc.setFont(font, 'normal'); doc.setFontSize(9.5);
    doc.text(isOffer ? 'Gerne bieten wir Ihnen an:' : 'Ihre Bestellung:', M, introY);
    return introY + 6;
  };

  // ── Sayfa 1 ──
  let y = drawMainHeader();
  y = drawTableHead(y);

  // ── Ürün satırları ──
  setColor(INK);
  for (const l of lines) {
    // satır yüksekliği (ada göre)
    doc.setFont(font, 'bold'); doc.setFontSize(8.5);
    const bezW = SEP[3] - COL.bez - 2;
    const nameLines = (doc.splitTextToSize(l.name || '—', bezW) as string[]).slice(0, 3);
    const textH = nameLines.length * 4.4 + (l.sub ? 4.2 : 0);
    const rowH = Math.max(20, textH + 7);

    if (y + rowH > CONTENT_BOTTOM) {
      doc.addPage();
      y = drawContinuationHeader();
      y = drawTableHead(y);
      setColor(INK);
    }

    const top = y;
    // hücre kenarları
    doc.setDrawColor(GRID[0], GRID[1], GRID[2]); doc.setLineWidth(0.1);
    vlines(top, top + rowH); hline(top + rowH);

    // Pos.
    setColor(INK); doc.setFont(font, 'normal'); doc.setFontSize(9);
    doc.text(String(l.pos), COL.pos, top + rowH / 2 + 1.5, { align: 'center' });

    // Görsel (oranı korunarak kutuya ortalı)
    const box = { x: COL.bild.x, y: top + (rowH - COL.bild.w) / 2, w: COL.bild.w, h: COL.bild.w };
    const im = l.imageUrl ? imgCache[l.imageUrl] : null;
    if (im) {
      try {
        const f = fitContain({ w: im.w, h: im.h }, box);
        doc.addImage(im.dataUrl, im.format, f.x, f.y, f.w, f.h);
      } catch { /* atla */ }
    } else {
      doc.setDrawColor(220, 220, 220);
      doc.rect(box.x, box.y, box.w, box.h);
      doc.setFontSize(5); setColor(GRAY);
      doc.text('N/A', box.x + box.w / 2, box.y + box.h / 2 + 1, { align: 'center' });
      doc.setDrawColor(GRID[0], GRID[1], GRID[2]);
    }

    // Bezeichnung: ad (kalın) + alt satır (gri)
    const textTop = top + (rowH - textH) / 2 + 3.4;
    setColor(INK); doc.setFont(font, 'bold'); doc.setFontSize(8.5);
    doc.text(nameLines, COL.bez, textTop);
    if (l.sub) {
      doc.setFont(font, 'normal'); doc.setFontSize(6.8); setColor(GRAY);
      doc.text(l.sub, COL.bez, textTop + nameLines.length * 4.4);
    }

    // Menge / Einheit
    const midY = top + rowH / 2 + 1.5;
    setColor(INK); doc.setFont(font, 'normal'); doc.setFontSize(8.5);
    doc.text(String(l.qty ?? 1), COL.menge, midY, { align: 'center' });
    doc.text(l.unit || 'Stück', COL.einheit, midY, { align: 'center' });

    // Einzel / Gesamt
    if (l.unitPrice === null) {
      setColor(GRAY); doc.setFont(font, 'normal');
      doc.text('Auf Anfrage', COL.einzel, midY, { align: 'right' });
      doc.text('—', COL.gesamt, midY, { align: 'right' });
    } else {
      setColor(INK); doc.setFont(font, 'normal');
      doc.text(num(l.unitPrice), COL.einzel, midY, { align: 'right' });
      doc.setFont(font, 'bold');
      doc.text(num(l.unitPrice * (l.qty ?? 1)), COL.gesamt, midY, { align: 'right' });
    }

    y = top + rowH;
  }

  // ── Toplamlar ──
  const net = lines.reduce((s, l) => s + (l.unitPrice ?? 0) * (l.qty ?? 1), 0);
  const vat = net * vatRate;
  const gross = net + vat;

  const totalsH = 7 * 3;
  if (y + totalsH + 4 > CONTENT_BOTTOM) {
    doc.addPage();
    y = drawContinuationHeader();
  }
  y += 2;
  const tLabelX = 120, tValX = PW - M - 2, tRight = PW - M, tLeft = 120;
  doc.setDrawColor(GRID[0], GRID[1], GRID[2]); doc.setLineWidth(0.1);
  const totalRow = (label: string, val: string, bold: boolean, fill?: boolean) => {
    const h = 7.5;
    if (fill) { doc.setFillColor(250, 244, 244); doc.rect(tLeft, y, tRight - tLeft, h, 'F'); }
    doc.rect(tLeft, y, tRight - tLeft, h);
    doc.setFont(font, bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 10 : 8.5);
    setColor(bold ? RED : INK);
    doc.text(label, tLabelX + 2, y + 5);
    doc.text(val, tValX, y + 5, { align: 'right' });
    y += h;
  };
  totalRow('Zwischensumme (netto)', num(net), false);
  totalRow(`Umsatzsteuer ${Math.round(vatRate * 100)} %`, num(vat), false);
  totalRow('Gesamtbetrag', num(gross), true, true);

  // ── Ödeme şartları ──
  y += 8;
  if (y + 22 > CONTENT_BOTTOM) { doc.addPage(); y = drawContinuationHeader(); }
  doc.setFont(font, 'bold'); doc.setFontSize(9); setColor(INK);
  doc.text('Zahlbar sofort ohne Abzug.', M, y); y += 6;
  doc.setFont(font, 'normal'); doc.setFontSize(8.5); setColor(INK);
  doc.text('Wir freuen uns auf die gute Zusammenarbeit.', M, y); y += 6;
  setColor(GRAY); doc.setFontSize(7.5);
  const retention = doc.splitTextToSize(
    `Alle Warenlieferungen erfolgen unter Eigentumsvorbehalt. Die Ware bleibt bis zur vollständigen Bezahlung Eigentum von ${ci.name}.`,
    PW - 2 * M,
  ) as string[];
  doc.text(retention, M, y);

  // ── Altbilgi + sayfa no (tüm sayfalar) ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    drawFooter();
    doc.setFont(font, 'normal'); doc.setFontSize(7); setColor(GRAY);
    doc.text(`Seite ${p}/${pages}`, PW / 2, PH - 6, { align: 'center' });
  }

  return doc;
}
