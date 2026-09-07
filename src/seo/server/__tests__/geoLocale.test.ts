/**
 * geoLocale — ülkeye göre otomatik dil yönlendirmesi.
 *
 * Bu testin varlık sebebi (2026-09-07): Almanya'daki ziyaretçi tarayıcısı Almanca
 * değilse /en veya /tr'ye atılıyordu. Yani hedef pazarımızdaki kullanıcı, tek
 * indekslenen Almanca siteden çıkarılıyordu. Aşağıdaki "hedef pazar" bloğu bunu
 * kalıcı olarak kilitler.
 */
import { describe, it, expect } from 'vitest';
import { geoRedirect } from '../geoLocale';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/** Tarayıcı isteği kısayolu. */
function req(country: string, accept: string, extra: Record<string, string> = {}) {
  return {
    method: 'GET',
    headers: { 'x-vercel-ip-country': country, 'accept-language': accept, 'user-agent': CHROME, ...extra },
  };
}

describe('hedef pazar: Almanca konuşulan ülkeler kök URL"de kalır', () => {
  it('DE + Almanca tarayıcı → yönlendirme yok', () => {
    expect(geoRedirect(req('DE', 'de-DE,de;q=0.9'), '/')).toBeNull();
  });

  it('DE + İngilizce tarayıcı → yönlendirme yok (regresyon)', () => {
    expect(geoRedirect(req('DE', 'en-GB,en;q=0.9,de;q=0.8'), '/')).toBeNull();
  });

  it('DE + Türkçe tarayıcı → yönlendirme yok (regresyon)', () => {
    expect(geoRedirect(req('DE', 'tr-TR,tr;q=0.9'), '/')).toBeNull();
  });

  it('DE + Felemenkçe tarayıcı, derin sayfa → yönlendirme yok', () => {
    expect(geoRedirect(req('DE', 'nl-NL,nl;q=0.9'), '/kuehlung')).toBeNull();
  });

  it('AT + İngilizce tarayıcı → yönlendirme yok', () => {
    expect(geoRedirect(req('AT', 'en-US,en;q=0.9'), '/')).toBeNull();
  });

  it('LI + Fransızca tarayıcı → yönlendirme yok', () => {
    expect(geoRedirect(req('LI', 'fr-FR,fr;q=0.9'), '/')).toBeNull();
  });
});

describe('ülkeye göre yönlendirme', () => {
  it('TR → /tr', () => {
    expect(geoRedirect(req('TR', 'tr-TR,tr;q=0.9'), '/')).toEqual({ to: '/tr', locale: 'tr' });
  });

  it('US → /en', () => {
    expect(geoRedirect(req('US', 'en-US,en;q=0.9'), '/')).toEqual({ to: '/en', locale: 'en' });
  });

  it('NL → /nl', () => {
    expect(geoRedirect(req('NL', 'nl-NL,nl;q=0.9'), '/')).toEqual({ to: '/nl', locale: 'nl' });
  });

  it('ülke, tarayıcı dilinden üstündür (TR ülkesi + İngilizce tarayıcı → /tr)', () => {
    expect(geoRedirect(req('TR', 'en-US,en;q=0.9'), '/')).toEqual({ to: '/tr', locale: 'tr' });
  });

  it('derin yol korunur', () => {
    expect(geoRedirect(req('TR', 'tr'), '/branche/pizzeria')?.to).toBe('/tr/branche/pizzeria');
  });

  it('query korunur (reklam UTM parametreleri kaybolmaz)', () => {
    expect(geoRedirect(req('TR', 'tr'), '/kuehlung?utm_source=google&page=2')?.to)
      .toBe('/tr/kuehlung?utm_source=google&page=2');
  });
});

describe('çok dilli ülkeler Accept-Language ile karar verir', () => {
  it('CH + Almanca → yönlendirme yok', () => {
    expect(geoRedirect(req('CH', 'de-CH,de;q=0.9'), '/')).toBeNull();
  });

  it('CH + Fransızca → /fr', () => {
    expect(geoRedirect(req('CH', 'fr-CH,fr;q=0.9'), '/')).toEqual({ to: '/fr', locale: 'fr' });
  });

  it('BE + Felemenkçe → /nl', () => {
    expect(geoRedirect(req('BE', 'nl-BE,nl;q=0.9'), '/')).toEqual({ to: '/nl', locale: 'nl' });
  });
});

describe('yönlendirilmeyen durumlar', () => {
  it('bot asla yönlendirilmez (Almanca indekslemeyi korur)', () => {
    const bot = { method: 'GET', headers: { 'x-vercel-ip-country': 'US', 'accept-language': 'en', 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } };
    expect(geoRedirect(bot, '/')).toBeNull();
  });

  it('kullanıcının kendi seçimi (çerez) üstündür', () => {
    expect(geoRedirect(req('TR', 'tr', { cookie: '2mc_lang=de' }), '/')).toBeNull();
  });

  it('zaten dil önekindeyse dokunulmaz', () => {
    expect(geoRedirect(req('TR', 'tr'), '/en/kuehlung')).toBeNull();
  });

  it('API ve statik dosyalar hariç', () => {
    expect(geoRedirect(req('TR', 'tr'), '/api/render')).toBeNull();
    expect(geoRedirect(req('TR', 'tr'), '/assets/index-abc.js')).toBeNull();
    expect(geoRedirect(req('TR', 'tr'), '/robots.txt')).toBeNull();
  });

  it('GET dışı istekler hariç', () => {
    expect(geoRedirect({ ...req('TR', 'tr'), method: 'POST' }, '/')).toBeNull();
  });

  it('eşlenmemiş ülke + çevirisi tam olmayan dil → Almanca kalır', () => {
    expect(geoRedirect(req('JP', 'ja-JP,ja;q=0.9'), '/')).toBeNull();
    expect(geoRedirect(req('IT', 'it-IT,it;q=0.9'), '/')).toBeNull();
  });

  it('ülke ve dil bilgisi yoksa yönlendirme yok', () => {
    expect(geoRedirect({ method: 'GET', headers: { 'user-agent': CHROME } }, '/')).toBeNull();
  });
});
