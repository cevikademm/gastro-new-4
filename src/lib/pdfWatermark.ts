import type { jsPDF } from 'jspdf';

const LOGO_URL = '/logo-icon.png';

let cachedLogoDataURL: string | null = null;

async function loadLogoDataURL(): Promise<string | null> {
  if (cachedLogoDataURL) return cachedLogoDataURL;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = LOGO_URL;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    cachedLogoDataURL = canvas.toDataURL('image/png');
    return cachedLogoDataURL;
  } catch {
    return null;
  }
}

/**
 * Draws a hologram watermark on the current page of a jsPDF document.
 * Call this for each page after adding content.
 * @param doc - jsPDF instance
 * @param pageWidth - page width in mm (default 210 for A4 portrait)
 * @param pageHeight - page height in mm (default 297 for A4 portrait)
 */
export async function drawPdfHologram(
  doc: jsPDF,
  pageWidth = 210,
  pageHeight = 297,
): Promise<void> {
  const logoData = await loadLogoDataURL();
  if (!logoData) return;

  const canvas = document.createElement('canvas');
  // A4-ish resolution
  const pxW = Math.round(pageWidth * 3.78); // ~96dpi
  const pxH = Math.round(pageHeight * 3.78);
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d')!;

  const img = new Image();
  img.src = logoData;
  await new Promise<void>((r) => { img.onload = () => r(); if (img.complete) r(); });

  const size = Math.min(pxW, pxH) * 0.85;
  const x = (pxW - size) / 2;
  const y = (pxH - size) / 2;
  ctx.globalAlpha = 0.055;
  ctx.drawImage(img, x, y, size, size);

  const holoData = canvas.toDataURL('image/png');
  doc.addImage(holoData, 'PNG', 0, 0, pageWidth, pageHeight);
}
