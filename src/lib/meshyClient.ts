/**
 * MeshAI 3D üretim istemcisi (frontend)
 * --------------------------------------
 * Tüm istekler Supabase Edge Function `meshy-3d` üzerinden gider.
 * API key ve service role key client'ta açıkta tutulmaz.
 *
 * Tek endpoint, polling mantığı:
 *   - İlk çağrı: yeni task açar, satırı 'processing' olarak döner
 *   - Sonraki çağrılar (her ~5sn): aynı endpoint'i tekrar çağırırız
 *     edge function Meshy'den son durumu çekip DB'yi günceller
 *   - status='done' olunca polling durur, GLB/USDZ Supabase Storage'da hazırdır
 */

import { supabase } from './supabase';

export interface Product3DModel {
  id: string;
  product_key: string;
  name: string;
  source_image_url: string;
  meshy_task_id: string | null;
  meshy_preview_id?: string | null;
  meshy_refine_id?: string | null;
  stage?: 'preview' | 'refine' | 'done' | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  error: string | null;
  glb_url: string | null;
  usdz_url: string | null;
  fbx_url?: string | null;
  obj_url?: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface MeshyGenerateRequest {
  productKey: string;
  name: string;
  imageUrl: string;
}

const FN_NAME = 'meshy-3d';

/** Tek bir step: edge function'ı çağırır, güncel satırı döner. */
export async function meshyStep(req: MeshyGenerateRequest): Promise<Product3DModel> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış');
  if (!/^https?:\/\//i.test(req.imageUrl)) {
    throw new Error('Görsel public URL olmalı (base64 desteklenmez)');
  }

  const { data, error } = await supabase.functions.invoke(FN_NAME, {
    body: {
      product_key: req.productKey,
      name: req.name,
      image_url: req.imageUrl,
    },
  });

  if (error) {
    // Edge function 4xx/5xx döndüğünde gerçek hata mesajını response body'den oku
    let detail = '';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.text === 'function') {
        const txt = await ctx.text();
        try {
          const j = JSON.parse(txt);
          detail = j.error || txt;
        } catch {
          detail = txt;
        }
      }
    } catch {}
    throw new Error(detail || error.message || 'Edge function hatası');
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.row) throw new Error('Edge function geçerli satır dönmedi');
  return data.row as Product3DModel;
}

/**
 * Meshy kuyruğu dolu (429 NoMorePendingTasks) ya da geçici sunucu hatası →
 * tekrar denenebilir. Bunlar "gerçek hata" değil; bir slot boşalınca geçer.
 */
const RETRIABLE_MESHY_RE = /\b429\b|NoMorePendingTasks|Too Many Requests|\b502\b|\b503\b/i;
function isRetriableMeshyError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return RETRIABLE_MESHY_RE.test(m);
}

/** UI'da "Bekliyor" göstermek için sentetik satır (henüz DB kaydı yokken). */
function queuedRow(req: MeshyGenerateRequest): Product3DModel {
  const now = new Date().toISOString();
  return {
    id: req.productKey, product_key: req.productKey, name: req.name,
    source_image_url: req.imageUrl, meshy_task_id: null, stage: null,
    status: 'pending', progress: 0, error: null,
    glb_url: null, usdz_url: null, thumbnail_url: null,
    created_at: now, updated_at: now, finished_at: null,
  };
}

/**
 * Polling helper: 'done' veya 'error' olana kadar her intervalMs'te bir çağırır.
 * onUpdate her güncellemede tetiklenir (UI için).
 *
 * 429 NoMorePendingTasks (Meshy plan kuyruk limiti) bir HATA olarak değil,
 * "kuyruk dolu" olarak ele alınır: bir slot boşalana kadar beklenip tekrar denenir.
 */
export async function meshyGenerate(
  req: MeshyGenerateRequest,
  onUpdate?: (row: Product3DModel) => void,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<Product3DModel> {
  const interval = options.intervalMs ?? 8000;
  const timeout = options.timeoutMs ?? 12 * 60 * 1000;
  const startedAt = Date.now();

  // Tek adım + kuyruk-dolu (429) durumunda otomatik bekle-tekrar dene.
  const step = async (): Promise<Product3DModel> => {
    while (true) {
      try {
        return await meshyStep(req);
      } catch (err) {
        if (!isRetriableMeshyError(err) || Date.now() - startedAt > timeout) throw err;
        // Meshy kuyruğu dolu — UI'da "Bekliyor" göster, biraz bekle, tekrar dene.
        onUpdate?.(queuedRow(req));
        await new Promise((r) => setTimeout(r, interval));
      }
    }
  };

  let row = await step();
  onUpdate?.(row);
  if (row.status === 'done' || row.status === 'error') return row;

  while (true) {
    if (Date.now() - startedAt > timeout) {
      throw new Error('MeshAI üretim zaman aşımı (12dk)');
    }
    await new Promise((r) => setTimeout(r, interval));
    row = await step();
    onUpdate?.(row);
    if (row.status === 'done' || row.status === 'error') return row;
  }
}

/** Belirli bir ürün için DB'de kayıt var mı? (üretim öncesi cache check) */
export async function getProduct3DModel(productKey: string): Promise<Product3DModel | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('product_3d_models')
    .select('*')
    .eq('product_key', productKey)
    .maybeSingle();
  return (data as Product3DModel | null) || null;
}

/**
 * TÜM MeshAI kayıtlarını getir (katalog paneli için).
 * Tablo yalnızca üretimi başlatılmış modelleri içerir — küçüktür. Binlerce ürün
 * anahtarını 200'lük dev `.in()` GET sorgularına bölmek URL/parse limitlerine
 * takılıp (HTTP 400) satırları sessizce düşürüyordu; tek toplu select sağlamdır.
 */
export async function getAllProduct3DModels(limit = 2000): Promise<Product3DModel[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('product_3d_models')
    .select('*')
    .limit(limit);
  return (data as Product3DModel[] | null) || [];
}

/** Birden fazla ürün için cache'leri toplu çek (kart rozetleri için) */
export async function getProduct3DModelsByKeys(keys: string[]): Promise<Record<string, Product3DModel>> {
  if (!supabase || keys.length === 0) return {};
  const { data } = await supabase
    .from('product_3d_models')
    .select('*')
    .in('product_key', keys);
  const map: Record<string, Product3DModel> = {};
  (data || []).forEach((row: any) => { map[row.product_key] = row; });
  return map;
}

/** Cache key — image URL varsa onu kullan, yoksa equipmentId */
export const productKeyFor = (imageUrl?: string, fallbackId?: string): string =>
  imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : fallbackId || '';
