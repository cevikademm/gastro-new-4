// apify-google-maps — Google Maps lead scraper for "Müşteri Bulma"
// =================================================================
// POST /apify-google-maps
// Body: { ulke, sehir, kategori, limit?, min_puan?, sadece_email?, sadece_telefon?, sadece_web? }
//
// Admin-only. Calls the Apify Google Maps actor (compass~crawler-google-places),
// normalizes the businesses, applies filters, then persists them to
// customer_searches + customer_leads (upsert on place_id). The APIFY token and
// the service-role key stay server-side — never exposed to the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const APIFY_ACTOR = "compass~crawler-google-places";
const MAX_LIMIT = 120;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface ApifyPlace {
  placeId?: string;
  cid?: string;
  title?: string;
  categoryName?: string;
  address?: string;
  phone?: string;
  phoneUnformatted?: string;
  emails?: string[];
  email?: string;
  website?: string;
  url?: string;
  totalScore?: number;
  reviewsCount?: number;
  location?: { lat?: number; lng?: number };
  [k: string]: unknown;
}

interface Body {
  mode?: "search" | "reviews";
  ulke?: string;
  sehir?: string;
  kategori?: string;
  limit?: number;
  min_puan?: number;
  sadece_email?: boolean;
  sadece_telefon?: boolean;
  sadece_web?: boolean;
  // reviews modu için
  lead_id?: string;
  place_url?: string;
  max_reviews?: number;
}

function normalizeReview(r: Record<string, unknown>) {
  return {
    author: (r.name ?? r.reviewerName ?? null) as string | null,
    text: (r.text ?? r.reviewText ?? r.comment ?? null) as string | null,
    stars: (r.stars ?? r.rating ?? null) as number | null,
    date: (r.publishedAtDate ?? r.publishAt ?? r.date ?? null) as string | null,
  };
}

// Kazınan metin: satır sonu/sekme/çift boşluk ve görünmez karakterler (NBSP,
// zero-width, BOM) tek boşluğa iner. Ham hâliyle tabloya basılınca kopuk
// görünüyordu; temizlik veri kaydedilirken yapılır ki tek kaynak temiz olsun.
const cleanText = (v: unknown): string | null => {
  // \u00A0 kırılmaz boşluk · \u200B-\u200D sıfır genişlikli · \uFEFF BOM
  const s = String(v ?? "").replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, " ").trim();
  return s || null;
};

// E-posta: "mailto:" öneki, ?subject=… eki, sarmalayan/sondaki noktalama atılır.
// Yerel kısım büyük/küçük harfe duyarlı olabilir → harf dönüşümü YAPILMAZ.
const cleanEmail = (v: unknown): string | null => {
  let s = cleanText(v) || "";
  s = s.replace(/^mailto:/i, "").split("?")[0].replace(/\s+/g, "");
  s = s.replace(/^[<("']+|[>)"'.,;:]+$/g, "");
  return s || null;
};

function normalize(d: ApifyPlace) {
  return {
    place_id: d.placeId || d.cid || `${d.title ?? ""}|${d.address ?? ""}`,
    isim: cleanText(d.title),
    kategori: cleanText(d.categoryName),
    adres: cleanText(d.address),
    telefon: cleanText(d.phone ?? d.phoneUnformatted),
    email: cleanEmail(Array.isArray(d.emails) ? d.emails[0] : d.email),
    website: cleanText(d.website),
    place_url: d.url ?? null,
    puan: typeof d.totalScore === "number" ? d.totalScore : null,
    yorum_sayisi: typeof d.reviewsCount === "number" ? d.reviewsCount : null,
    lat: d.location?.lat ?? null,
    lng: d.location?.lng ?? null,
    raw_data: d,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!APIFY_API_TOKEN) return json({ error: "APIFY_API_TOKEN not configured" }, 500);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: "Supabase env not configured" }, 500);

  // ── Admin doğrulama ──────────────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Yetkilendirme gerekli" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Geçersiz oturum" }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") return json({ error: "Bu işlem yalnızca yöneticilere açıktır" }, 403);

  // ── Girdi ────────────────────────────────────────────────
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "Geçersiz istek gövdesi" }, 400);
  }

  // ── Mod: tek işletme için Google yorumlarını çek (talep üzerine) ──
  if (body.mode === "reviews") {
    const placeUrl = (body.place_url || "").trim();
    if (!placeUrl) return json({ error: "Bu işletme için Google Haritalar adresi yok" }, 400);
    const maxReviews = Math.min(Math.max(Number(body.max_reviews) || 10, 1), 20);

    let reviewPlaces: ApifyPlace[] = [];
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startUrls: [{ url: placeUrl }],
            maxReviews,
            reviewsSort: "newest",
            language: "tr",
            maxCrawledPlacesPerSearch: 1,
            scrapeContacts: false,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        return json({ error: `Apify hatası (${res.status}): ${text.slice(0, 300)}` }, 502);
      }
      reviewPlaces = (await res.json()) as ApifyPlace[];
    } catch (err) {
      return json({ error: `Apify çağrısı başarısız: ${(err as Error).message}` }, 502);
    }

    const place = reviewPlaces[0] as (ApifyPlace & { reviews?: Record<string, unknown>[] }) | undefined;
    const reviews = (place?.reviews ?? []).map(normalizeReview).slice(0, maxReviews);

    if (body.lead_id) {
      await admin
        .from("customer_leads")
        .update({ yorumlar: reviews, updated_at: new Date().toISOString() })
        .eq("id", body.lead_id);
    }
    return json({ ok: true, reviews });
  }

  const ulke = (body.ulke || "").trim();
  const sehir = (body.sehir || "").trim();
  const kategori = (body.kategori || "").trim();
  if (!kategori || !sehir) return json({ error: "Sektör ve şehir zorunludur" }, 400);

  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), MAX_LIMIT);
  const minPuan = Number(body.min_puan) || 0;

  // ── Apify çağrısı ────────────────────────────────────────
  const apifyInput = {
    searchStringsArray: [kategori],
    locationQuery: ulke ? `${sehir}, ${ulke}` : sehir,
    maxCrawledPlacesPerSearch: limit,
    language: "tr",
    skipClosedPlaces: true,
    scrapeContacts: true,
  };

  let places: ApifyPlace[] = [];
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInput),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Apify hatası (${res.status}): ${text.slice(0, 300)}` }, 502);
    }
    places = (await res.json()) as ApifyPlace[];
  } catch (err) {
    return json({ error: `Apify çağrısı başarısız: ${(err as Error).message}` }, 502);
  }

  // ── Normalize + filtre ───────────────────────────────────
  const leads = places
    .map(normalize)
    .filter((r) => r.place_id && r.place_id !== "|")
    .filter((r) => (minPuan ? (r.puan ?? 0) >= minPuan : true))
    .filter((r) => (body.sadece_email ? !!r.email : true))
    .filter((r) => (body.sadece_telefon ? !!r.telefon : true))
    .filter((r) => (body.sadece_web ? !!r.website : true));

  // ── Persist ──────────────────────────────────────────────
  const { data: searchRow, error: searchErr } = await admin
    .from("customer_searches")
    .insert({
      ulke,
      sehir,
      kategori,
      limit_count: limit,
      min_puan: minPuan,
      results_count: leads.length,
      created_by: userData.user.id,
    })
    .select("id")
    .single();

  if (searchErr) return json({ error: `Arama kaydı oluşturulamadı: ${searchErr.message}` }, 500);

  const searchId = searchRow.id as string;
  const now = new Date().toISOString();
  const rows = leads.map((r) => ({ ...r, search_id: searchId, updated_at: now }));

  let inserted = 0;
  if (rows.length) {
    const { data: up, error: upErr } = await admin
      .from("customer_leads")
      .upsert(rows, { onConflict: "place_id" })
      .select("id");
    if (upErr) return json({ error: `Kayıtlar yazılamadı: ${upErr.message}` }, 500);
    inserted = up?.length ?? rows.length;
  }

  return json({ ok: true, search_id: searchId, found: leads.length, inserted });
});
