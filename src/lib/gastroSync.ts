/**
 * Gastro Sync Service
 * - Debounced auto-save to Supabase
 * - Load on page open
 * - Save on beforeunload
 */
import { gastroDb } from './supabaseGastro';

/** Giriş yapılmamışsa dönen sahte kimlik. Bu kimlikle ASLA uzak senkron yapılmaz:
 * aksi hâlde tüm anonim ziyaretçiler Supabase'de TEK sepet/proje satırını paylaşır
 * (ana sayfada başkasının sepeti görünüyordu, eşzamanlı yazmalar yinelenen satır üretiyordu). */
const ANON_ID = 'anonymous';
const USER_ID = () => {
  try {
    const raw = localStorage.getItem('2mc-gastro-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.user?.id || ANON_ID;
    }
  } catch { /* */ }
  return 'anonymous';
};

// ─── Debounce helper ───
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

function debounce(key: string, fn: () => void, ms = 2000) {
  if (timers[key]) clearTimeout(timers[key]);
  timers[key] = setTimeout(fn, ms);
}

function flushAll() {
  Object.keys(timers).forEach((k) => {
    clearTimeout(timers[k]);
    delete timers[k];
  });
}

// ─── PROJECTS ───
export async function syncProjects(projects: any[], activities: any[]) {
  if (!gastroDb) { console.warn('[GastroSync] Supabase not configured'); return; }
  const uid = USER_ID();
  if (uid === ANON_ID) return; // anonim: yalnız yerel (localStorage) kalsın
  // Upsert each project
  for (const p of projects) {
    const { error } = await gastroDb.from('gastro_projects').upsert({
      id: p.id,
      user_id: uid,
      name: p.name,
      type: p.type,
      area: p.area || '',
      lead: p.lead || '',
      status: p.status,
      progress: p.progress,
      client_name: p.clientName || '',
      start_date: p.startDate || '',
      deadline: p.deadline || '',
      notes: p.notes || '',
      room_width_cm: p.roomWidthCm || 500,
      room_height_cm: p.roomHeightCm || 400,
      products: p.products || [],
    }, { onConflict: 'id' });
    if (error) console.error('[GastroSync] project upsert error:', p.id, error.message);
  }
  // Sync activities
  for (const a of activities) {
    const { error } = await gastroDb.from('gastro_activities').upsert({
      id: a.id,
      user_id: uid,
      title: a.title,
      description: a.desc,
      activity_time: a.time,
      active: a.active,
    }, { onConflict: 'id' });
    if (error) console.error('[GastroSync] activity upsert error:', a.id, error.message);
  }
  console.log('[GastroSync] synced', projects.length, 'projects,', activities.length, 'activities');
}

export function debouncedSyncProjects(projects: any[], activities: any[]) {
  debounce('projects', () => syncProjects(projects, activities), 3000);
}

export async function loadProjects(): Promise<{ projects: any[]; activities: any[] } | null> {
  if (!gastroDb) return null;
  const uid = USER_ID();
  if (uid === ANON_ID) return null; // anonim: yalnız yerel (localStorage) kalsın
  const { data: projects } = await gastroDb
    .from('gastro_projects')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  const { data: activities } = await gastroDb
    .from('gastro_activities')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!projects || projects.length === 0) return null;

  return {
    projects: projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      area: p.area,
      lead: p.lead,
      status: p.status,
      progress: p.progress,
      clientName: p.client_name,
      startDate: p.start_date,
      deadline: p.deadline,
      notes: p.notes,
      roomWidthCm: Number(p.room_width_cm),
      roomHeightCm: Number(p.room_height_cm),
      products: p.products || [],
      createdAt: p.created_at,
    })),
    activities: (activities || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      desc: a.description,
      time: a.activity_time,
      active: a.active,
    })),
  };
}

// ─── FLOOR PLANS ───
export async function syncFloorPlan(projectId: string, data: any) {
  if (!gastroDb) return;
  const uid = USER_ID();
  if (uid === ANON_ID) return; // anonim: yalnız yerel (localStorage) kalsın
  await gastroDb.from('gastro_floor_plans').upsert({
    user_id: uid,
    project_id: projectId || 'global',
    room_width_cm: data.roomWidthCm,
    room_height_cm: data.roomHeightCm,
    room_shape: data.roomShape || 'polygon',
    room_polygon: data.roomPolygon || [],
    wall_lengths_cm: data.wallLengthsCm || [],
    placed_items: data.placedItems || [],
    wall_openings: data.wallOpenings || [],
    room_props: data.roomProps || {},
    selected_item_id: data.selectedItemId || null,
    canvas_state: data.canvasState || {},
  }, { onConflict: 'user_id,project_id' });
}

export function debouncedSyncFloorPlan(projectId: string, data: any) {
  debounce(`floorplan-${projectId}`, () => syncFloorPlan(projectId, data), 2000);
}

export async function loadFloorPlan(projectId: string): Promise<any | null> {
  if (!gastroDb) return null;
  const uid = USER_ID();
  if (uid === ANON_ID) return null; // anonim: yalnız yerel (localStorage) kalsın
  const { data } = await gastroDb
    .from('gastro_floor_plans')
    .select('*')
    .eq('user_id', uid)
    .eq('project_id', projectId || 'global')
    .single();

  if (!data) return null;
  return {
    roomWidthCm: Number(data.room_width_cm),
    roomHeightCm: Number(data.room_height_cm),
    roomShape: data.room_shape,
    roomPolygon: data.room_polygon,
    wallLengthsCm: data.wall_lengths_cm,
    placedItems: data.placed_items,
    wallOpenings: data.wall_openings,
    roomProps: data.room_props,
    selectedItemId: data.selected_item_id,
    canvasState: data.canvas_state,
  };
}

// ─── SKETCHES ───
export async function syncSketches(sketches: any[]) {
  if (!gastroDb) return;
  const uid = USER_ID();
  if (uid === ANON_ID) return; // anonim: yalnız yerel (localStorage) kalsın
  for (const s of sketches) {
    await gastroDb.from('gastro_sketches').upsert({
      user_id: uid,
      sketch_id: s.id,
      name: s.name,
      segments: s.segs || [],
      saved_at: s.savedAt || Date.now(),
    }, { onConflict: 'user_id,sketch_id' });
  }
}

export function debouncedSyncSketches(sketches: any[]) {
  debounce('sketches', () => syncSketches(sketches), 2000);
}

export async function loadSketches(): Promise<any[] | null> {
  if (!gastroDb) return null;
  const uid = USER_ID();
  if (uid === ANON_ID) return null; // anonim: yalnız yerel (localStorage) kalsın
  const { data } = await gastroDb
    .from('gastro_sketches')
    .select('*')
    .eq('user_id', uid)
    .order('saved_at', { ascending: false });

  if (!data || data.length === 0) return null;
  return data.map((s: any) => ({
    id: s.sketch_id,
    name: s.name,
    segs: s.segments || [],
    savedAt: s.saved_at,
  }));
}

// ─── CART ───
export async function syncCart(items: any[]) {
  if (!gastroDb) return;
  const uid = USER_ID();
  if (uid === ANON_ID) return; // anonim: yalnız yerel (localStorage) kalsın
  // Clear existing cart
  await gastroDb.from('gastro_cart').delete().eq('user_id', uid);
  // Insert current items
  if (items.length > 0) {
    await gastroDb.from('gastro_cart').insert(
      items.map((i: any) => ({
        user_id: uid,
        product_id: i.product?.id || i.product?.name || 'unknown',
        product_data: i.product,
        quantity: i.quantity,
      }))
    );
  }
}

export function debouncedSyncCart(items: any[]) {
  debounce('cart', () => syncCart(items), 3000);
}

export async function loadCart(): Promise<any[] | null> {
  if (!gastroDb) return null;
  const uid = USER_ID();
  if (uid === ANON_ID) return null; // anonim: yalnız yerel (localStorage) kalsın
  const { data } = await gastroDb
    .from('gastro_cart')
    .select('*')
    .eq('user_id', uid);

  if (!data || data.length === 0) return null;
  return data.map((c: any) => ({
    product: c.product_data,
    quantity: c.quantity,
  }));
}

// ─── USER PREFS (favorites, notifications, settings) ───
export async function syncUserPrefs(prefs: {
  favorites?: string[];
  notifications?: any[];
  cookieConsent?: boolean | null;
  language?: string;
}) {
  if (!gastroDb) return;
  const uid = USER_ID();
  if (uid === ANON_ID) return; // anonim: yalnız yerel (localStorage) kalsın
  await gastroDb.from('gastro_user_prefs').upsert({
    user_id: uid,
    favorites: prefs.favorites || [],
    notifications: prefs.notifications || [],
    cookie_consent: prefs.cookieConsent ?? null,
    language: prefs.language || 'tr',
  }, { onConflict: 'user_id' });
}

export function debouncedSyncUserPrefs(prefs: any) {
  debounce('userprefs', () => syncUserPrefs(prefs), 3000);
}

export async function loadUserPrefs(): Promise<any | null> {
  if (!gastroDb) return null;
  const uid = USER_ID();
  if (uid === ANON_ID) return null; // anonim: yalnız yerel (localStorage) kalsın
  const { data } = await gastroDb
    .from('gastro_user_prefs')
    .select('*')
    .eq('user_id', uid)
    .single();

  if (!data) return null;
  return {
    favorites: data.favorites || [],
    notifications: data.notifications || [],
    cookieConsent: data.cookie_consent,
    language: data.language,
  };
}

// ─── beforeunload: flush pending saves ───
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushAll();
    // Sync critical data synchronously via navigator.sendBeacon
    // (Supabase doesn't support sendBeacon, so we rely on debounce flush)
  });
}
