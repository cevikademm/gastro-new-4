/**
 * pdfImage — bir görsel URL'ini base64 dataURL'e çevirir (PDF gömme için).
 * Cross-origin görseller image-proxy edge function üzerinden geçer (CORS güvenli).
 * Yavaş/erişilemez görsel PDF'i ASLA kilitlemesin diye 7sn timeout var.
 * (Cart.tsx'teki loadImageAsDataURL'in paylaşılan kopyası.)
 */
import { IMAGE_PROXY_URL } from './assets';

export async function loadImageAsDataURL(src: string): Promise<string | null> {
  if (!src) return null;
  // Zaten base64 data URL ise doğrudan kullan, ağ yok.
  if (src.startsWith('data:')) return src;
  const url = src.startsWith('http')
    ? src
    : (typeof window !== 'undefined' ? window.location.origin : '') + (src.startsWith('/') ? '' : '/') + src;

  // Cross-origin URL'leri CORS sorunlarından kaçınmak için proxy'den geçir.
  const sameOrigin = typeof window !== 'undefined' && url.startsWith(window.location.origin);
  const fetchUrl = sameOrigin || !IMAGE_PROXY_URL ? url : `${IMAGE_PROXY_URL}?url=${encodeURIComponent(url)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(fetchUrl, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** dataURL'in mime'ından jsPDF addImage formatını çıkar (PNG/JPEG/WEBP). */
export function imageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const m = /^data:image\/(png|jpe?g|webp)/i.exec(dataUrl);
  if (!m) return 'PNG';
  const t = m[1].toLowerCase();
  if (t === 'jpg' || t === 'jpeg') return 'JPEG';
  if (t === 'webp') return 'WEBP';
  return 'PNG';
}

export interface LoadedImage {
  dataUrl: string;
  /** Doğal en (px). */
  w: number;
  /** Doğal boy (px). */
  h: number;
  format: 'PNG' | 'JPEG' | 'WEBP';
}

/**
 * Görseli dataURL'e çevirip doğal en/boy oranını da döndürür.
 * Logo/ürün görselini bir kutuya ORANI BOZMADAN sığdırmak için kullanılır.
 * Boyut okunamazsa w=h=0 döner (çağıran kareyi varsayar).
 */
export async function loadImageWithSize(src: string): Promise<LoadedImage | null> {
  const dataUrl = await loadImageAsDataURL(src);
  if (!dataUrl) return null;
  const format = imageFormatFromDataUrl(dataUrl);
  const size = await new Promise<{ w: number; h: number }>((resolve) => {
    if (typeof Image === 'undefined') { resolve({ w: 0, h: 0 }); return; }
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = dataUrl;
  });
  return { dataUrl, w: size.w, h: size.h, format };
}

/**
 * Bir kutuya (boxW×boxH) oranı koruyarak SIĞDIRILMIŞ ve ortalanmış yerleşim
 * hesaplar. img boyutu yoksa kutuyu doldurur.
 */
export function fitContain(
  img: { w: number; h: number },
  box: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  if (!img.w || !img.h) return { ...box };
  const scale = Math.min(box.w / img.w, box.h / img.h);
  const w = img.w * scale;
  const h = img.h * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
