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
// Supabase katmanı (kalıcı, debounced)
// ─────────────────────────────────────────────────────────────────────────────

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const lastSerialized = new Map<string, string>();

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
 * Belgeyi kaydeder: localStorage'a ANINDA, Supabase'e debounced (2s).
 * İçerik değişmediyse hiçbir şey yapmaz (gereksiz yazma önlenir).
 */
export function saveDesignProject(doc: ProjectDocument, projectKey: string): void {
  if (isEmptyDocument(doc)) return;
  const serialized = JSON.stringify(doc);
  if (serialized === lastSerialized.get(projectKey)) return;
  lastSerialized.set(projectKey, serialized);

  // 1) Anlık yerel yedek.
  saveDesignLocal(doc, projectKey);

  // 2) Debounced bulut yedeği.
  const existing = timers.get(projectKey);
  if (existing) clearTimeout(existing);
  timers.set(
    projectKey,
    setTimeout(() => {
      timers.delete(projectKey);
      void syncDesignProject(doc, projectKey);
    }, 2000),
  );
}

/** Bekleyen kaydı hemen gönderir (manuel "Kaydet" / sayfadan ayrılma için). */
export async function flushDesignProject(
  doc: ProjectDocument | undefined,
  projectKey: string,
): Promise<boolean> {
  const existing = timers.get(projectKey);
  if (existing) {
    clearTimeout(existing);
    timers.delete(projectKey);
  }
  if (doc) {
    saveDesignLocal(doc, projectKey);
    return syncDesignProject(doc, projectKey);
  }
  return false;
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
// Sayfadan ayrılırken bekleyen kayıtları temizle (localStorage zaten güncel)
// ─────────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    for (const [key, t] of timers) {
      clearTimeout(t);
      timers.delete(key);
    }
    // Not: localStorage her değişimde anlık yazıldığı için veri zaten güvende.
    // Supabase'in senkron beforeunload çağrısı olmadığından son birkaç saniyelik
    // değişiklik yalnızca yerelde kalabilir; bir sonraki açılışta loadBestDesign
    // onu yine de geri yükler.
  });
}
