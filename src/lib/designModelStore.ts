/**
 * 3D Tasarım — kalıcı model kütüphanesi (Storage + `design_models` tablosu).
 *
 * NEDEN: Yüklenen GLB'ler oturumluktu (blob: URL) — yenilemede kayboluyordu.
 * Burada dosya `design-models` kovasına, meta veri `public.design_models`
 * tablosuna yazılır; `designModelRegistry` satırları katalog girişine çevirir.
 *
 * SAHİPLİK: Yükleme Supabase OTURUMU gerektirir (RLS `auth.uid()` ile
 * eşleştirir ve Storage yolunu `{uid}/…` klasörüne kilitler). Oturum yoksa
 * `requireSession()` null döner ve çağıran oturumluk `importGlbFile` akışına
 * düşer. Bu bilinçlidir: design-renders'ın "anon da yazabilir" modeli burada
 * kullanılamaz, çünkü kütüphane kullanıcıya özeldir.
 *
 * İLERLEME: Supabase JS v2 upload'ı ilerleme olayı yaymaz; büyük GLB'lerde
 * kullanıcıyı kör bırakmamak için yükleme XHR ile Storage REST uç noktasına
 * yapılır (`errorReport.ts`/`designRenderStore.ts` deseninin ilerlemeli hâli).
 */
import { supabase } from './supabase';

const BUCKET = 'design-models';

/** Kova sınırı (migration 047 ile aynı): 80 MB. */
export const MAX_MODEL_BYTES = 83_886_080;

/** Kabul edilen uzantılar — `<input accept>` için. */
export const MODEL_ACCEPT_ATTR = '.glb,model/gltf-binary';

export interface DesignModel {
  id: string;
  user_id: string;
  name: string;
  category: string;
  glb_path: string;
  glb_url: string;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  up_axis: 'y' | 'z';
  is_shared: boolean;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export interface DesignModelInput {
  name: string;
  category: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  upAxis: 'y' | 'z';
  /** İsteğe bağlı 256² önizleme (data URL veya Blob). */
  thumbnail?: Blob | null;
}

/**
 * Yükleme/silme sonucu — hata mesajı KULLANICIYA gösterilebilir olmalıdır.
 *
 * NOT: Proje `strict` derlemede değil; ayrık birleşim (discriminated union)
 * daralması `strictNullChecks` olmadan çalışmadığından tek arayüz kullanılır.
 * `ok === true` iken `data` daima doludur.
 */
export interface Result<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const fail = (error: string): Result<never> => ({ ok: false, error });

// ─────────────────────────────────────────────────────────────────────────────
// Oturum
// ─────────────────────────────────────────────────────────────────────────────

/** Geçerli oturumu döndürür; yoksa null (anonim ziyaretçi). */
async function requireSession(): Promise<{ userId: string; accessToken: string } | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session?.user?.id || !session.access_token) return null;
  return { userId: session.user.id, accessToken: session.access_token };
}

/** Kütüphaneye yazma mümkün mü? (UI'da "giriş yapın" ipucu için) */
export async function canUseLibrary(): Promise<boolean> {
  return (await requireSession()) !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Okuma
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Görebildiğim tüm modeller: kendi modellerim + ortak kütüphane.
 * (Filtreleme RLS'te; burada ek koşul yok.)
 */
export async function listDesignModels(): Promise<DesignModel[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('design_models')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[DesignModel] Liste başarısız:', error.message);
    return [];
  }
  return (data ?? []) as DesignModel[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Yükleme
// ─────────────────────────────────────────────────────────────────────────────

/** Storage REST'e XHR ile yükler; `onProgress` 0–100 arası yayınlar. */
function xhrUpload(
  path: string,
  body: Blob,
  contentType: string,
  accessToken: string,
  onProgress?: (percent: number) => void,
): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!baseUrl || !anonKey) return Promise.resolve({ ok: false, error: 'Supabase yapılandırılmamış' });

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${baseUrl}/storage/v1/object/${BUCKET}/${path}`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Content-Type', contentType);
    // Aynı yol yeniden yüklenirse üzerine yaz (yeniden deneme güvenli olsun).
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({ ok: true });
      } else {
        let msg = `HTTP ${xhr.status}`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          msg = parsed.message || parsed.error || msg;
        } catch {
          /* gövde JSON değil — durum kodunu kullan */
        }
        resolve({ ok: false, error: msg });
      }
    };
    xhr.onerror = () => resolve({ ok: false, error: 'Ağ hatası' });
    xhr.onabort = () => resolve({ ok: false, error: 'Yükleme iptal edildi' });
    xhr.send(body);
  });
}

function publicUrl(path: string): string {
  return supabase?.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl ?? '';
}

/**
 * GLB'yi kovaya yükler ve `design_models` satırını oluşturur.
 *
 * Dosya adı `{uid}/{modelId}.glb` — Storage politikası ilk klasörün `auth.uid()`
 * olmasını şart koşar. Satır yazımı başarısız olursa yüklenen dosya silinir
 * (yetim dosya bırakmayız).
 */
export async function uploadDesignModel(
  file: File,
  input: DesignModelInput,
  onProgress?: (percent: number) => void,
): Promise<Result<DesignModel>> {
  if (!supabase) return fail('Supabase yapılandırılmamış');

  const name = input.name.trim();
  if (!name) return fail('Model adı gerekli');
  if (file.size > MAX_MODEL_BYTES) {
    return fail(`Dosya çok büyük (en fazla ${Math.floor(MAX_MODEL_BYTES / 1024 / 1024)} MB)`);
  }
  if (!/\.glb$/i.test(file.name)) return fail('Yalnızca .glb dosyaları yüklenebilir');

  const session = await requireSession();
  if (!session) return fail('Kütüphaneye kaydetmek için giriş yapmalısınız');

  const modelId = crypto.randomUUID();
  const glbPath = `${session.userId}/${modelId}.glb`;

  const uploaded = await xhrUpload(
    glbPath,
    file,
    'model/gltf-binary',
    session.accessToken,
    onProgress,
  );
  if (!uploaded.ok) return fail(`Yükleme başarısız: ${uploaded.error}`);

  // Önizleme (best-effort — başarısız olursa model yine kaydedilir).
  let thumbPath: string | null = null;
  if (input.thumbnail) {
    const p = `${session.userId}/${modelId}_thumb.png`;
    const t = await xhrUpload(p, input.thumbnail, 'image/png', session.accessToken);
    if (t.ok) thumbPath = p;
  }

  const row = {
    id: modelId,
    user_id: session.userId,
    name,
    category: input.category || 'other',
    glb_path: glbPath,
    glb_url: publicUrl(glbPath),
    thumbnail_path: thumbPath,
    thumbnail_url: thumbPath ? publicUrl(thumbPath) : null,
    width_mm: Math.round(input.widthMm),
    depth_mm: Math.round(input.depthMm),
    height_mm: Math.round(input.heightMm),
    up_axis: input.upAxis,
    size_bytes: file.size,
  };

  const { data, error } = await supabase.from('design_models').insert(row).select().single();
  if (error) {
    // Yetim dosyaları temizle.
    const paths = thumbPath ? [glbPath, thumbPath] : [glbPath];
    await supabase.storage.from(BUCKET).remove(paths).catch(() => undefined);
    return fail(`Kayıt başarısız: ${error.message}`);
  }
  return { ok: true, data: data as DesignModel };
}

// ─────────────────────────────────────────────────────────────────────────────
// Değiştirme / silme
// ─────────────────────────────────────────────────────────────────────────────

/** Ad / kategori / ölçü / yönelim güncelle (sahibi veya admin). */
export async function updateDesignModel(
  modelId: string,
  patch: Partial<Pick<DesignModel, 'name' | 'category' | 'width_mm' | 'depth_mm' | 'height_mm' | 'up_axis'>>,
): Promise<Result<DesignModel>> {
  if (!supabase) return fail('Supabase yapılandırılmamış');
  const { data, error } = await supabase
    .from('design_models')
    .update(patch)
    .eq('id', modelId)
    .select()
    .single();
  if (error) return fail(`Güncelleme başarısız: ${error.message}`);
  return { ok: true, data: data as DesignModel };
}

/**
 * Ortak kütüphaneye aç/kapat. YALNIZ admin — admin değilse veritabanı
 * trigger'ı değişikliği sessizce geri alır, bu yüzden dönen satır kontrol
 * edilir ve gerçekten değişmediyse hata döndürülür.
 */
export async function setDesignModelShared(
  modelId: string,
  isShared: boolean,
): Promise<Result<DesignModel>> {
  if (!supabase) return fail('Supabase yapılandırılmamış');
  const { data, error } = await supabase
    .from('design_models')
    .update({ is_shared: isShared })
    .eq('id', modelId)
    .select()
    .single();
  if (error) return fail(`Paylaşım güncellenemedi: ${error.message}`);
  const row = data as DesignModel;
  if (row.is_shared !== isShared) return fail('Bu işlem için yönetici yetkisi gerekli');
  return { ok: true, data: row };
}

/** Modeli sil: önce satır (yetki kapısı), sonra dosyalar (best-effort). */
export async function deleteDesignModel(modelId: string): Promise<Result<true>> {
  if (!supabase) return fail('Supabase yapılandırılmamış');

  const { data: existing } = await supabase
    .from('design_models')
    .select('glb_path, thumbnail_path')
    .eq('id', modelId)
    .maybeSingle();

  const { error } = await supabase.from('design_models').delete().eq('id', modelId);
  if (error) return fail(`Silme başarısız: ${error.message}`);

  if (existing) {
    const paths = [existing.glb_path, existing.thumbnail_path].filter(Boolean) as string[];
    if (paths.length) {
      try {
        await supabase.storage.from(BUCKET).remove(paths);
      } catch (e) {
        console.warn('[DesignModel] Dosya temizliği başarısız:', (e as Error)?.message || e);
      }
    }
  }
  return { ok: true, data: true };
}
