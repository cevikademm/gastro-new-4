/**
 * Render orkestrasyonu — sahneyi yakala, Storage'a yükle, dokümana eklenecek
 * `ProjectRender` metadata'sını üret.
 *
 * Akış:
 *   1. SceneManager.capture() ile yüksek kaliteli (süper-örneklenmiş) PNG al.
 *   2. designRenderStore.uploadRender() ile Supabase Storage'a yükle.
 *   3. Başarılıysa public URL'i, başarısızsa küçültülmüş jpeg yedeğini sakla.
 *   4. { render, dataUrl } döndür — çağıran orijinal dataUrl'ü indirir + render'ı
 *      store'a ekler.
 */
import type { SceneManager } from '../scene/SceneManager';
import type { ProjectRender } from '../../../core/types';
import { newId } from '../../../core/id';
import { uploadRender, downscaleJpeg } from '../../../../../lib/designRenderStore';

export interface CaptureOptions {
  /** Süper-örnekleme oranı (varsayılan 4 = Ultra ~4K). */
  scale?: number;
  /** Saydam PNG arka planı. */
  transparent?: boolean;
  /** Kalıcılık anahtarı (Storage yolu için). */
  projectKey: string;
}

export async function captureAndStoreRender(
  manager: SceneManager,
  opts: CaptureOptions,
): Promise<{ render: ProjectRender; dataUrl: string }> {
  const { scale = 4, transparent = false, projectKey } = opts;

  const { dataUrl, width, height } = manager.capture({
    scale,
    transparent,
    hideGrid: true,
    mime: 'image/png',
  });

  const id = newId('rnd');
  const uploaded = await uploadRender(dataUrl, projectKey, id);

  const render: ProjectRender = {
    id,
    url: uploaded?.url ?? dataUrl,
    path: uploaded?.path,
    width,
    height,
    createdAt: new Date().toISOString(),
    // Yalnızca upload başarısızsa: dokümana taşınabilir küçük yedek göm.
    fallbackDataUrl: uploaded ? undefined : await downscaleJpeg(dataUrl),
  };

  return { render, dataUrl };
}
