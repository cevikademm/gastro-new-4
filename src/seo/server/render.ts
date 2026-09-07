// Vercel serverless — rota-özel, içerik taşıyan HTML kabuğu (SEO renderer).
//
// vercel.json: { "source": "/(.*)", "destination": "/api/render?path=$1" }  (catch-all)
// Statik dosyalar (assets, prerender edilmiş dist/*.html) Vercel'de ÖNCE eşleşir;
// buraya yalnızca dosya sistemi karşılamayan istekler düşer: ürün sayfaları
// (14K+), sayfalanmış kategori listeleri, eski /product/:id yönlendirmeleri,
// uygulama rotaları (noindex kabuk) ve 404'ler.
//
// Kullanıcı ve bot AYNI HTML'i alır (cloaking yok). React mount olunca #root
// içeriğini değiştirir; SEO.tsx sunucu etiketlerini (data-seo-managed) temizler.
//
// Güvenlik ağı: her hata ham kabuk + 200 döndürür — site renderer yüzünden düşmez.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderPage } from '../render/page';
import { SHELL as FALLBACK_SHELL } from './_shell.generated';
import { geoRedirect } from './geoLocale';

type Req = { url?: string; method?: string; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => Res;
  send: (body: string) => void;
  end: (body?: string) => void;
};

let cachedShell: string | null = null;

function loadShell(): string {
  if (cachedShell) return cachedShell;
  const candidates = [
    join(process.cwd(), 'dist', 'index.html'),
    join(process.cwd(), 'index.html'),
  ];
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        const s = readFileSync(p, 'utf8');
        // Kaynak index.html (dev) değil, build çıktısı olduğundan emin ol: /assets/ referansı.
        if (s.includes('/assets/') || p.endsWith(join('dist', 'index.html'))) {
          cachedShell = s;
          return s;
        }
      }
    } catch { /* sıradaki adaya geç */ }
  }
  cachedShell = FALLBACK_SHELL;
  return FALLBACK_SHELL;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Rewrite `?path=$1` + orijinal query'yi tek URL'ye birleştir. */
function requestUrl(req: Req): string {
  const q = req.query || {};
  const path = first(q.path) || '';
  const rest: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (k === 'path' || v === undefined) continue;
    for (const val of Array.isArray(v) ? v : [v]) rest.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
  }
  const clean = '/' + path.replace(/^\/+/, '');
  return rest.length ? `${clean}?${rest.join('&')}` : clean;
}

export default async function handler(req: Req, res: Res) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end('Method not allowed');
    return;
  }
  const shell = loadShell();
  const url = requestUrl(req);

  // Ülkeye göre dil yönlendirmesi — botlar ve tercihini yapmış kullanıcılar hariç.
  // Yanıt ziyaretçiye özel: CDN paylaşırsa herkes aynı dile giderdi, o yüzden private.
  const geo = geoRedirect(req, url);
  if (geo) {
    res.setHeader('Location', geo.to);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'X-Vercel-IP-Country, Accept-Language, Cookie, User-Agent');
    res.setHeader('Set-Cookie', `2mc_lang=${geo.locale}; Path=/; Max-Age=31536000; SameSite=Lax`);
    res.status(302).end();
    return;
  }

  try {
    const out = await renderPage(url, shell);
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    if (out.redirectTo) {
      res.status(out.status).end();
      return;
    }
    res.status(out.status).send(out.html);
  } catch (err) {
    // Son çare: ham kabuk (SPA çalışır), 200, kısa cache.
    console.error('[api/render] failed for', url, err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=0');
    res.setHeader('X-SEO-Render', 'fallback');
    res.status(200).send(shell);
  }
}
