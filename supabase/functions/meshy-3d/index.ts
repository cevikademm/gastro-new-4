// MeshAI (Meshy) image-to-3D Edge Function — TEK AŞAMA (HIZLI)
// =============================================================
// Tek task: Meshy 6 + PBR doku (preview ve refine birleşik)
// Dosyalar Supabase Storage'a indirilmez — Meshy CDN URL'leri direkt DB'ye yazılır
// (worker bellek limiti / WORKER_LIMIT hatasını engeller)
//
// Endpoint: POST /meshy-3d
// Body: { product_key, name, image_url }
//
// Frontend bu endpoint'i polling ile çağırır (her ~5sn).
// Her çağrıda mevcut aşamaya göre Meshy'den durum çekilir, gerekirse sıradaki
// aşamaya geçilir, son aşamada dosyalar indirilip Storage'a yüklenir.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MESHY_API_KEY = Deno.env.get("MESHY_API_KEY") || "";
const MESHY_API_URL = "https://api.meshy.ai";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface MeshyStatus {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "CANCELED";
  progress: number;
  model_urls?: { glb?: string; fbx?: string; obj?: string; usdz?: string };
  thumbnail_url?: string;
  task_error?: { message?: string };
}

const meshyHeaders = () => ({
  Authorization: `Bearer ${MESHY_API_KEY}`,
  "Content-Type": "application/json",
});

// --- TEK AŞAMA: Meshy 6 + yüksek kalite PBR + HD doku ---
// Kalite kaldıraçları (Meshy image-to-3d dokümanı):
//   should_texture+enable_pbr+hd_texture → gerçekçi 4K PBR doku (gri/dokusuz modeli önler)
//   image_enhancement+remove_lighting    → girdi fotoyu temizleyip ışığı söker (daha temiz doku)
//   target_polycount/quad/remesh         → geometri detayı
// NOT: hd_texture + doku üretimi EK KREDİ harcar.
async function meshyCreatePreview(imageUrl: string): Promise<string> {
  const res = await fetch(`${MESHY_API_URL}/openapi/v1/image-to-3d`, {
    method: "POST",
    headers: meshyHeaders(),
    body: JSON.stringify({
      image_url: imageUrl,
      ai_model: "meshy-6",
      topology: "quad",
      target_polycount: 150000,
      should_remesh: true,
      should_texture: true,
      enable_pbr: true,
      hd_texture: true,
      image_enhancement: true,
      remove_lighting: true,
      license: "CC_BY_4",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Meshy create failed (${res.status}): ${t}`);
  }
  const j = await res.json();
  return j.result;
}


async function meshyGetStatus(taskId: string): Promise<MeshyStatus> {
  const res = await fetch(
    `${MESHY_API_URL}/openapi/v1/image-to-3d/${taskId}`,
    { headers: { Authorization: `Bearer ${MESHY_API_KEY}` } },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Meshy status failed (${res.status}): ${t}`);
  }
  return (await res.json()) as MeshyStatus;
}

// Meshy CDN URL'lerini Supabase Storage'a stream'leyerek indir.
// Stream upload kullanıldığı için worker bellek limitine takılmaz.
const BUCKET = "product-3d";

const MIME_BY_EXT: Record<string, string> = {
  glb: "model/gltf-binary",
  usdz: "model/vnd.usdz+zip",
  fbx: "application/octet-stream",
  obj: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

async function streamToStorage(
  sourceUrl: string,
  destPath: string,
  ext: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok || !res.body) {
      console.error(`fetch failed for ${sourceUrl}: ${res.status}`);
      return null;
    }
    const contentType = MIME_BY_EXT[ext] || res.headers.get("content-type") || "application/octet-stream";

    // Supabase JS storage client Body stream'i destekler.
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(destPath, res.body, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });
    if (upErr) {
      console.error(`upload failed for ${destPath}: ${upErr.message}`);
      return null;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(destPath);
    return data.publicUrl;
  } catch (e) {
    console.error(`streamToStorage error for ${destPath}:`, e);
    return null;
  }
}

async function finalizeRefined(row: any, status: MeshyStatus) {
  const baseDir = `models/${row.id}`;
  const urls = status.model_urls || {};

  // Sırayla indir — paralel yapsak da Edge Function CPU/network limiti var.
  const glb_url = urls.glb ? await streamToStorage(urls.glb, `${baseDir}/model.glb`, "glb") : null;
  const usdz_url = urls.usdz ? await streamToStorage(urls.usdz, `${baseDir}/model.usdz`, "usdz") : null;
  const fbx_url = urls.fbx ? await streamToStorage(urls.fbx, `${baseDir}/model.fbx`, "fbx") : null;
  const obj_url = urls.obj ? await streamToStorage(urls.obj, `${baseDir}/model.obj`, "obj") : null;
  const thumbnail_url = status.thumbnail_url
    ? await streamToStorage(status.thumbnail_url, `${baseDir}/thumb.png`, "png")
    : null;

  // Zorunlu olan glb yoksa fallback olarak Meshy CDN URL'ini yaz (en azından indirilebilir).
  const finalGlb = glb_url || urls.glb || null;

  const { data, error } = await supabase
    .from("product_3d_models")
    .update({
      status: "done",
      stage: "done",
      progress: 100,
      glb_url: finalGlb,
      usdz_url: usdz_url || urls.usdz || null,
      fbx_url: fbx_url || urls.fbx || null,
      obj_url: obj_url || urls.obj || null,
      thumbnail_url: thumbnail_url || status.thumbnail_url || null,
      finished_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", row.id)
    .select()
    .single();

  if (error) throw new Error(`DB update failed: ${error.message}`);
  return data;
}

async function setError(rowId: string, message: string) {
  const { data } = await supabase
    .from("product_3d_models")
    .update({ status: "error", error: message })
    .eq("id", rowId)
    .select()
    .single();
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!MESHY_API_KEY) return json({ error: "MESHY_API_KEY tanımlı değil" }, 500);

  let body: { product_key?: string; name?: string; image_url?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz JSON" }, 400);
  }

  const product_key = (body.product_key || "").trim();
  const name = (body.name || "").trim();
  const image_url = (body.image_url || "").trim();

  if (!product_key || !name || !image_url) {
    return json({ error: "product_key, name ve image_url zorunludur" }, 400);
  }
  if (!/^https?:\/\//i.test(image_url)) {
    return json({ error: "image_url public bir http(s) URL olmalıdır" }, 400);
  }

  try {
    const { data: existing } = await supabase
      .from("product_3d_models")
      .select("*")
      .eq("product_key", product_key)
      .maybeSingle();

    // ============ CACHE HIT ============
    if (existing && existing.status === "done" && existing.glb_url) {
      return json({ row: existing, cached: true });
    }

    // ============ YENİ KAYIT — STAGE 1 başlat ============
    if (!existing || existing.status === "error" || !existing.meshy_preview_id) {
      const previewId = await meshyCreatePreview(image_url);

      if (existing) {
        const { data: row } = await supabase
          .from("product_3d_models")
          .update({
            name,
            source_image_url: image_url,
            meshy_preview_id: previewId,
            meshy_refine_id: null,
            meshy_task_id: previewId,
            stage: "preview",
            status: "processing",
            progress: 0,
            error: null,
          })
          .eq("id", existing.id)
          .select()
          .single();
        return json({ row });
      } else {
        const { data: row, error: insErr } = await supabase
          .from("product_3d_models")
          .insert({
            product_key,
            name,
            source_image_url: image_url,
            meshy_preview_id: previewId,
            meshy_task_id: previewId,
            stage: "preview",
            status: "processing",
            progress: 0,
          })
          .select()
          .single();
        if (insErr) throw new Error(`DB insert failed: ${insErr.message}`);
        return json({ row });
      }
    }

    // ============ STAGE 1: PREVIEW devam ediyor ============
    if (existing.stage === "preview" && existing.meshy_preview_id) {
      const s = await meshyGetStatus(existing.meshy_preview_id);

      if (s.status === "FAILED" || s.status === "EXPIRED" || s.status === "CANCELED") {
        const errRow = await setError(
          existing.id,
          `Preview ${s.status}: ${s.task_error?.message || ""}`,
        );
        return json({ row: errRow });
      }

      if (s.status === "SUCCEEDED") {
        const finalized = await finalizeRefined(existing, s);
        return json({ row: finalized });
      }

      // İşleniyor — 0..100% direkt
      const mapped = Math.round(s.progress || 0);
      const { data: row } = await supabase
        .from("product_3d_models")
        .update({ progress: mapped })
        .eq("id", existing.id)
        .select()
        .single();
      return json({ row });
    }

    // Düşülemeyen durum — sıfırdan başlat
    const previewId = await meshyCreatePreview(image_url);
    const { data: row } = await supabase
      .from("product_3d_models")
      .update({
        meshy_preview_id: previewId,
        meshy_refine_id: null,
        meshy_task_id: previewId,
        stage: "preview",
        status: "processing",
        progress: 0,
        error: null,
      })
      .eq("id", existing.id)
      .select()
      .single();
    return json({ row });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
