// Vercel Edge Middleware — ülkeye göre dil yönlendirmesi.
//
// NEDEN BURADA: api/render.js içindeki aynı kontrol, prerender edilmiş 16 statik
// sayfada (dist/index.html, produkte.html, agb.html …) HİÇ çalışmıyor; Vercel
// statik dosyayı catch-all rewrite'tan ÖNCE eşleştiriyor. Middleware ise her
// isteği statik dosyadan da önce görür, dolayısıyla ana sayfa dahil her yerde
// çalışır. render.ts'teki kopya savunma amaçlı duruyor (middleware devre dışı
// kalırsa dinamik yollar yine korunur).
//
// Karar mantığı ve güvenlik kuralları (bot hariç tutma, çerez önceliği, yalnızca
// çevirisi tam diller) tek kaynakta: src/seo/server/geoLocale.ts — 22 senaryoluk
// test setiyle doğrulandı.
import { next } from '@vercel/edge';
import { geoRedirect } from './src/seo/server/geoLocale';

export const config = {
  // Sayfa istekleri: /api, /assets, _vercel ve uzantılı dosyalar hariç.
  matcher: ['/((?!api/|assets/|_vercel|.*\\.[a-zA-Z0-9]+$).*)'],
};

export default function middleware(request: Request): Response {
  const url = new URL(request.url);

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => { headers[key] = value; });

  const hit = geoRedirect({ method: request.method, headers }, url.pathname + url.search);
  if (!hit) return next();

  // Yanıt ziyaretçiye özel: CDN paylaşırsa herkes aynı dile yönlendirilirdi.
  return new Response(null, {
    status: 302,
    headers: {
      Location: hit.to,
      'Cache-Control': 'private, no-store',
      Vary: 'X-Vercel-IP-Country, Accept-Language, Cookie, User-Agent',
      'Set-Cookie': `2mc_lang=${hit.locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
    },
  });
}
