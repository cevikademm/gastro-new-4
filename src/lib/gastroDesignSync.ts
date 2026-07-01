/**
 * 3D Tasarım — kalıcı saklama (persistence).
 *
 * NEDEN: /3d-design ve /projects/:id/design araçları çizimi HİÇBİR yere
 * kaydetmiyordu; sayfadan giriş/çıkış yapınca proje kayboluyordu. Bu modül iki
 * katmanlı, kayıp-önleyici (belt-and-suspenders) kaydetme sağlar —
 * `DesignStudio.tsx`'teki kanıtlanmış deseni izler:
 *   1. localStorage — anlık, senkron, çevrimdışı bile çalışır, yenilemeye dayanır.
 *   2. Supabase (gastro_design_projects) — kalıcı, cihazlar arası, debounced (2s).
 *
 * Anahtarlama: (user_id, projectKey).
 *   • /projects/:id/design  → projectKey = URL'deki proje id'si (her proje kendi
 *     tasarımını saklar; projeler birbirini EZMEZ).
 *   • /3d-design (bağımsız)  → projectKey = 'standalone'.
 *
 * Yükleme: yerel + uzak sürüm `updatedAt`'e göre kıyaslanır; en yeni VE boş
 * olmayan sürüm kazanır. Boş belge asla yazılmaz — iyi bir projenin, henüz
 * yüklenmemiş boş bir başlangıç belgesiyle ezilmesini önler.
 */
import { gastroDb } from './supabaseGastro';
import type { ProjectDocument } from '../modules/three-d-design';

export const STANDALONE_KEY = 'standalone';

const USER_ID = (): string => {
  try {
    const raw = localStorage.getItem('2mc-gastro-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.user?.id || 'anonymous';
    }
  } catch {
    /* localStorage erişilemiyor — anonymous'a düş */
  }
  return 'anonymous';
};

const localKey = (projectKey: string) => `2mc-3d-design:${USER_ID()}:${projectKey}`;

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────────────────────────────────────

/** Belge "boş" mu? (hiç köşe/duvar/ekipman/açıklık/oda yok) — boşsa yazmayız. */
export function isEmptyDocument(doc: ProjectDocument | null | undefined): boolean {
  if (!doc) return true;
  const count = (r?: Record<string, unknown>) => (r ? Object.keys(r).length : 0);
  return (
    count(doc.vertices) === 0 &&
    count(doc.walls) === 0 &&
    count(doc.equipment) === 0 &&
    count(doc.openings) === 0 &&
    count(doc.rooms) === 0
  );
}

function safeTime(iso?: string): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage katmanı (anlık, senkron)
// ─────────────────────────────────────────────────────────────────────────────

export function saveDesignLocal(doc: ProjectDocument, projectKey: string): void {
  if (isEmptyDocument(doc)) return;
  try {
    localStorage.setItem(localKey(projectKey), JSON.stringify(doc));
  } catch {
    /* kota dolu / erişilemiyor — sessizce geç, Supabase yedeği var */
  }
}

export function loadDesignLocal(projectKey: string): ProjectDocument | null {
  try {
    const raw = localStorage.getItem(localKey(projectKey));
    if (!raw) return null;
    const doc = JSON.parse(raw) as ProjectDocument;
    return isEmptyDocument(doc) ? null : doc;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase katmanı (kalıcı) — coalesce + tek-uçuşlu kuyruk + retry + çevrimdışı
// ─────────────────────────────────────────────────────────────────────────────
//
// NEDEN: Eski 2 saniyelik debounce, tab kapanışında son birkaç saniyelik
// değişikliğin yalnız localStorage'da kalmasına yol açıyordu. Artık her commit
// kısa bir coalesce penceresinde (varsayılan 400ms) Supabase'e yazılır; yazma
// kuyruğu + retry veri kaybını önler, 'online' olayı çevrimdışı dönüşte otomatik
// senkronlar, pagehide/visibilitychange keepalive ile kapanışta zorunlu flush eder.

/** Uzak yazımı coalesce penceresi (ms). Rate-limit için 300–500 arası ayarlanabilir. */
const REMOTE_COALESCE_MS = 400;
/** Hata sonrası retry backoff basamakları (ms). */
const RETRY_BACKOFF_MS = [1000, 2000, 5000];

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'local' | 'error';
type StatusCb = (s: SaveStatus) => void;

interface QueueState {
  /** Yazılmayı bekleyen EN YENİ belge (coalesce). */
  pending: ProjectDocument | null;
  pendingSerialized: string | null;
  inFlight: boolean;
  coalesceTimer: ReturnType<typeof setTimeout> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
  retryIdx: number;
  onStatus: StatusCb | null;
}

const queues = new Map<string, QueueState>();
const lastSerialized = new Map<string, string>();

function getQueue(projectKey: string): QueueState {
  let q = queues.get(projectKey);
  if (!q) {
    q = {
      pending: null, pendingSerialized: null, inFlight: false,
      coalesceTimer: null, retryTimer: null, retryIdx: 0, onStatus: null,
    };
    queues.set(projectKey, q);
  }
  return q;
}

function emit(q: QueueState, s: SaveStatus): void {
  try { q.onStatus?.(s); } catch { /* status callback hatası önemsiz */ }
}

/** Belgeyi Supabase'e (user_id, project_key) anahtarıyla upsert eder. */
export async function syncDesignProject(
  doc: ProjectDocument,
  projectKey: string,
): Promise<boolean> {
  if (!gastroDb) {
    console.warn('[DesignSync] Supabase yapılandırılmadı — sadece localStorage kullanılıyor');
    return false;
  }
  if (isEmptyDocument(doc)) return false;
  const { error } = await gastroDb.from('gastro_design_projects').upsert(
    {
      user_id: USER_ID(),
      project_key: projectKey,
      name: doc.name || 'Untitled Project',
      document: doc,
    },
    { onConflict: 'user_id,project_key' },
  );
  if (error) {
    console.error('[DesignSync] upsert hatası:', error.message);
    return false;
  }
  return true;
}

/**
 * Belgeyi kaydeder: localStorage'a ANINDA, Supabase'e ~`REMOTE_COALESCE_MS`
 * içinde (coalesced). İçerik değişmediyse hiçbir şey yapmaz.
 * `onStatus` verilirse kayıt durumu (saving/saved/local/error) bildirilir.
 */
export function saveDesignProject(
  doc: ProjectDocument,
  projectKey: string,
  onStatus?: StatusCb,
): void {
  if (isEmptyDocument(doc)) return;
  const serialized = JSON.stringify(doc);
  // İçerik değişmediyse (ör. seçim/görünüm) hiçbir şey yapma.
  if (serialized === lastSerialized.get(projectKey)) return;
  lastSerialized.set(projectKey, serialized);

  // 1) Anlık yerel yedek (senkron, çevrimdışı bile çalışır).
  saveDesignLocal(doc, projectKey);

  // 2) Uzak yazımı coalesce et.
  const q = getQueue(projectKey);
  if (onStatus) q.onStatus = onStatus;
  q.pending = doc;
  q.pendingSerialized = serialized;
  emit(q, 'saving');

  if (q.coalesceTimer) clearTimeout(q.coalesceTimer);
  q.coalesceTimer = setTimeout(() => {
    q.coalesceTimer = null;
    void drainQueue(projectKey);
  }, REMOTE_COALESCE_MS);
}

/** Kuyruktaki en yeni belgeyi tek-uçuşlu olarak Supabase'e yazar. */
async function drainQueue(projectKey: string): Promise<void> {
  const q = queues.get(projectKey);
  if (!q || q.inFlight || !q.pending) return;

  // Çevrimdışıysa erteleme — 'online' olayında yeniden denenecek.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    emit(q, 'local');
    return;
  }

  const doc = q.pending;
  const writingSerialized = q.pendingSerialized;
  q.inFlight = true;

  const ok = await syncDesignProject(doc, projectKey);
  q.inFlight = false;

  if (ok) {
    q.retryIdx = 0;
    if (q.retryTimer) { clearTimeout(q.retryTimer); q.retryTimer = null; }
    // Uçuş sırasında daha yeni bir doc geldiyse onu da yaz.
    if (q.pendingSerialized !== writingSerialized && q.pending) {
      void drainQueue(projectKey);
    } else {
      q.pending = null;
      q.pendingSerialized = null;
      emit(q, 'saved');
    }
  } else {
    // Başarısız — localStorage güvende. Backoff ile retry; pending korunur.
    emit(q, 'local');
    scheduleRetry(projectKey);
  }
}

function scheduleRetry(projectKey: string): void {
  const q = queues.get(projectKey);
  if (!q || q.retryTimer) return;
  const delay = RETRY_BACKOFF_MS[Math.min(q.retryIdx, RETRY_BACKOFF_MS.length - 1)];
  q.retryIdx += 1;
  q.retryTimer = setTimeout(() => {
    q.retryTimer = null;
    void drainQueue(projectKey);
  }, delay);
}

/** Bekleyen kaydı hemen gönderir (manuel "Kaydet" / route değişimi için). */
export async function flushDesignProject(
  doc: ProjectDocument | undefined,
  projectKey: string,
): Promise<boolean> {
  const q = queues.get(projectKey);
  if (q) {
    if (q.coalesceTimer) { clearTimeout(q.coalesceTimer); q.coalesceTimer = null; }
    if (q.retryTimer) { clearTimeout(q.retryTimer); q.retryTimer = null; }
  }
  const finalDoc = doc ?? q?.pending ?? undefined;
  if (finalDoc && !isEmptyDocument(finalDoc)) {
    saveDesignLocal(finalDoc, projectKey);
    const ok = await syncDesignProject(finalDoc, projectKey);
    if (q && ok) { q.pending = null; q.pendingSerialized = null; emit(q, 'saved'); }
    return ok;
  }
  return false;
}

/**
 * Sayfa kapanışında (pagehide / visibilitychange:hidden) senkron-güvenli uzak
 * yazım. supabase-js'in async upsert'i unload'da iptal olabileceğinden, PostgREST'e
 * `keepalive: true` fetch ile doğrudan gönderir — tarayıcı isteği kapanıştan sonra
 * tamamlar. localStorage zaten anlık güncel; bu uzak yedeği garanti eder.
 */
export function flushDesignProjectBeacon(
  doc: ProjectDocument | undefined,
  projectKey: string,
): void {
  const q = queues.get(projectKey);
  const finalDoc = doc ?? q?.pending ?? undefined;
  if (!finalDoc || isEmptyDocument(finalDoc)) return;
  saveDesignLocal(finalDoc, projectKey); // her halükarda yerelde güvende

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return;
  try {
    void fetch(`${url}/rest/v1/gastro_design_projects?on_conflict=user_id,project_key`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: USER_ID(),
        project_key: projectKey,
        name: finalDoc.name || 'Untitled Project',
        document: finalDoc,
      }),
      keepalive: true,
    });
    if (q) { q.pending = null; q.pendingSerialized = null; }
  } catch {
    /* unload sırasında hata yutulur — localStorage yedeği var */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Yükleme — yerel + uzak; en yeni (boş olmayan) kazanır
// ─────────────────────────────────────────────────────────────────────────────

/** Bu projeye ait Supabase'deki belgeyi çeker. */
export async function loadRemoteDesign(projectKey: string): Promise<ProjectDocument | null> {
  if (!gastroDb) return null;
  const { data, error } = await gastroDb
    .from('gastro_design_projects')
    .select('document')
    .eq('user_id', USER_ID())
    .eq('project_key', projectKey)
    .maybeSingle();
  if (error) {
    console.error('[DesignSync] load hatası:', error.message);
    return null;
  }
  const doc = (data?.document as ProjectDocument | undefined) ?? null;
  return doc && !isEmptyDocument(doc) ? doc : null;
}

/**
 * Açılışta çağrılır. localStorage ve Supabase'i kıyaslar, en yeni (updatedAt'e
 * göre) ve boş olmayan belgeyi döndürür. Hiçbir kaynak veri vermezse null.
 */
export async function loadBestDesign(projectKey: string): Promise<{
  doc: ProjectDocument;
  source: 'local' | 'remote';
} | null> {
  const local = loadDesignLocal(projectKey);
  const remote = await loadRemoteDesign(projectKey);

  if (local && remote) {
    return safeTime(remote.updatedAt) > safeTime(local.updatedAt)
      ? { doc: remote, source: 'remote' }
      : { doc: local, source: 'local' };
  }
  if (remote) return { doc: remote, source: 'remote' };
  if (local) return { doc: local, source: 'local' };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global dayanıklılık: çevrimdışı dönüşte otomatik senkron + kapanışta beacon flush
// ─────────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // Bağlantı dönünce bekleyen tüm yazımları gönder (çevrimdışı dayanıklılık).
  window.addEventListener('online', () => {
    for (const key of queues.keys()) void drainQueue(key);
  });

  // Sayfa gizlenince/kapanınca bekleyen yazımları keepalive ile gönder —
  // localStorage zaten anlık güncel; bu uzak yedeği de garanti eder.
  const flushAllBeacon = () => {
    for (const [key, q] of queues) {
      if (q.pending) flushDesignProjectBeacon(q.pending, key);
    }
  };
  window.addEventListener('pagehide', flushAllBeacon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllBeacon();
  });
}
