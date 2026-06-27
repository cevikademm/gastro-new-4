import type { jsPDF } from 'jspdf';

/**
 * Unicode-capable font for jsPDF. jsPDF's built-in "helvetica" is a standard
 * PDF font with WinAnsi encoding, so Turkish glyphs (İ, ş, ğ, ı, …) render as
 * garbage (e.g. "TEKLİF" → "TEKL0F"). We embed Inter (the app's own font, full
 * Latin-Extended coverage) so TR + DE text renders correctly.
 *
 * Usage:
 *   const FONT = await ensurePdfFont(doc);
 *   doc.setFont(FONT, 'bold');   // or 'normal'
 */
export const PDF_FONT = 'Inter';

let cache: { regular: string; bold: string } | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFontData() {
  if (cache) return cache;
  const [reg, bold] = await Promise.all([
    fetch('/fonts/Inter-Regular.ttf').then((r) => r.arrayBuffer()),
    fetch('/fonts/Inter-Bold.ttf').then((r) => r.arrayBuffer()),
  ]);
  cache = { regular: arrayBufferToBase64(reg), bold: arrayBufferToBase64(bold) };
  return cache;
}

/**
 * Registers Inter (normal + bold) on the given jsPDF document and activates it.
 * Returns the font-family name to pass to doc.setFont(). On any failure (e.g.
 * font files unreachable) it falls back to 'helvetica' so PDF export still works.
 */
export async function ensurePdfFont(doc: jsPDF): Promise<string> {
  try {
    const f = await loadFontData();
    doc.addFileToVFS('Inter-Regular.ttf', f.regular);
    doc.addFont('Inter-Regular.ttf', PDF_FONT, 'normal');
    doc.addFileToVFS('Inter-Bold.ttf', f.bold);
    doc.addFont('Inter-Bold.ttf', PDF_FONT, 'bold');
    doc.setFont(PDF_FONT, 'normal');
    return PDF_FONT;
  } catch (e) {
    console.warn('[pdfFont] Inter embed failed, falling back to helvetica:', e);
    return 'helvetica';
  }
}
