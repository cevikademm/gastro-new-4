/**
 * 3D Tasarım — render (yüksek kaliteli görüntü) Storage katmanı.
 *
 * NEDEN: /3d-design sahnesinden alınan render'ler "proje dosyasının içinde"
 * kalmalı. Görüntü verisi büyük olduğundan doküman JSONB'sine base64 gömmek
 * her autosave'i şişirir. Bunun yerine PNG'yi Supabase Storage'a yükleyip
 * dokümanda yalnızca KÜÇÜK URL metadata'sı ('renders') tutuyoruz.
 *
 * `errorReport.ts`'teki kanıtlanmış yükleme desenini izler (dataUrlToBlob +
 * storage.upload + getPublicUrl). Bucket herkese açık; migration 020 anon
 * yazmaya izin verir (uygulama herkes için anon anahtarı kullanıyor).
 */
import { supabase } from './supabase';
import { dataUrlToBlob } from './errorReport';

const RENDER_BUCKET = 'design-renders';

/**
 * Render data URL'ini Storage'a yükler.
 * @returns başarılıysa {path, url}, aksi halde null (çağıran fallback'e düşer).
 */
export async function uploadRender(
  dataUrl: string,
  projectKey: string,
  renderId: string,
): Promise<{ path: string; url: string } | null> {
  if (!supabase || !dataUrl) return null;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  // Dosya adında güvenli projectKey (segment kaçışı olmasın).
  const safeKey = String(projectKey || 'standalone').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `${safeKey}/${renderId}.${ext}`;
  try {
    const { error } = await supabase.storage.from(RENDER_BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || 'image/png',
    });
    if (error) {
      console.warn('[DesignRender] Storage upload başarısız:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(RENDER_BUCKET).getPublicUrl(path);
    const url = data?.publicUrl || null;
    if (!url) return null;
    return { path, url };
  } catch (e) {
    console.warn('[DesignRender] Storage upload exception:', (e as Error)?.message || e);
    return null;
  }
}

/** Render'i Storage'dan siler (best-effort; hata yutulur). */
export async function deleteRender(path?: string): Promise<void> {
  if (!supabase || !path) return;
  try {
    await supabase.storage.from(RENDER_BUCKET).remove([path]);
  } catch (e) {
    console.warn('[DesignRender] Storage silme başarısız:', (e as Error)?.message || e);
  }
}

/**
 * Büyük bir PNG data URL'ini KÜÇÜK bir JPEG data URL'ine indirger. Yalnızca
 * Storage upload başarısız olduğunda, dokümana taşınabilir bir yedek gömmek
 * için kullanılır (galeri en azından yerelde çalışsın). Sınır ~1280px, q0.7.
 */
export async function downscaleJpeg(
  dataUrl: string,
  maxEdge = 1280,
  quality = 0.7,
): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined;
  return new Promise<string | undefined>((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || 1;
          const h = img.naturalHeight || 1;
          const ratio = Math.min(1, maxEdge / Math.max(w, h));
          const cw = Math.max(1, Math.round(w * ratio));
          const ch = Math.max(1, Math.round(h * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(undefined);
          // Saydam PNG'lerde beyaz zemin (jpeg saydamlığı desteklemez).
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(undefined);
        }
      };
      img.onerror = () => resolve(undefined);
      img.src = dataUrl;
    } catch {
      resolve(undefined);
    }
  });
}
