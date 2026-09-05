#!/usr/bin/env node
// scripts/dns/godaddy-sync.mjs
// ─────────────────────────────────────────────────────────────────────────────
// GoDaddy DNS kayıtlarını bildirilen hedef duruma getirir.
//
// VARSAYILAN --check'tir: hiçbir şey yazmaz, sadece mevcut ile hedefi karşılaştırır.
// Yazmak için AÇIKÇA --apply gerekir.
//
// GÜVENLİK KURALI: yalnızca aşağıdaki DESIRED tablosunda adı geçen
// (tip + ad) çiftlerine dokunur. MX, TXT, SPF, NS, SOA ve e-posta kayıtlarına
// (autodiscover / msoid / lyncdiscover / sip / email) ASLA dokunmaz —
// bozulursa info@2mcgastro.de çalışmaz.
//
// Kullanım:
//   node scripts/dns/godaddy-sync.mjs            # denetle (yazmaz)
//   node scripts/dns/godaddy-sync.mjs --apply    # uygula
//   node scripts/dns/godaddy-sync.mjs --apply --domain 2mcgastro.de
import { loadEnv } from '../shopify/lib.mjs';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ONLY = argv.includes('--domain') ? argv[argv.indexOf('--domain') + 1] : null;

const VERCEL_A = '76.76.21.21';
const VERCEL_CNAME = 'cname.vercel-dns.com';
const SHOPIFY_CNAME = 'shops.myshopify.com';

// Hedef durum. Buraya yazılmayan hiçbir kayda dokunulmaz.
const DESIRED = {
  // Ana site — canonical adres. Zaten doğru, değişiklik beklenmiyor.
  '2mcgastro.de': [
    { type: 'A', name: '@', data: VERCEL_A, ttl: 3600 },
    { type: 'CNAME', name: 'www', data: VERCEL_CNAME, ttl: 3600 },
    { type: 'CNAME', name: 'shop', data: SHOPIFY_CNAME, ttl: 3600 },
  ],
  // Bu ikisi www.2mcgastro.de'ye 301 yönlendirecek.
  // ÖNKOŞUL: alan adları önce Vercel projesine eklenmeli, yoksa Vercel 404 döner.
  '2mcgastro.com': [
    { type: 'A', name: '@', data: VERCEL_A, ttl: 3600 },
    { type: 'CNAME', name: 'www', data: VERCEL_CNAME, ttl: 3600 },
  ],
  // TTL 600: GoDaddy zone yayinini tazelemek + ileride hizli yayilma icin.
  '2mcgastro.eu': [
    { type: 'A', name: '@', data: VERCEL_A, ttl: 600 },
    { type: 'CNAME', name: 'www', data: VERCEL_CNAME, ttl: 600 },
  ],
};

// Bu tiplere hiçbir koşulda dokunulmaz.
const FORBIDDEN_TYPES = new Set(['MX', 'TXT', 'NS', 'SOA', 'SRV', 'CAA']);
// Bu adlara hiçbir koşulda dokunulmaz (e-posta altyapısı).
const FORBIDDEN_NAMES = new Set([
  'autodiscover', 'msoid', 'lyncdiscover', 'sip', 'email',
  '_dmarc', '_domainkey', 'selector1._domainkey', 'selector2._domainkey',
]);

function guard(rec) {
  if (FORBIDDEN_TYPES.has(rec.type)) {
    throw new Error(`GUVENLIK: ${rec.type} tipine dokunulmaz (${rec.name})`);
  }
  if (FORBIDDEN_NAMES.has(rec.name)) {
    throw new Error(`GUVENLIK: "${rec.name}" e-posta kaydidir, dokunulmaz`);
  }
}

function auth(env) {
  const pat = env.GODADDY_PAT;
  if (!pat) throw new Error('GODADDY_PAT .env icinde bulunamadi');
  // GoDaddy Personal Access Token -> Bearer (eski sso-key bicimi degil)
  return { Authorization: `Bearer ${pat}`, Accept: 'application/json', 'Content-Type': 'application/json' };
}

async function readRecords(H, domain) {
  const r = await fetch(`https://api.godaddy.com/v1/domains/${domain}/records`, { headers: H });
  if (!r.ok) throw new Error(`${domain} okunamadi: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/** Yalnizca o tip+ad ciftini degistirir; digerlerine dokunmaz. */
async function putRecord(H, domain, rec) {
  guard(rec);
  const url = `https://api.godaddy.com/v1/domains/${domain}/records/${rec.type}/${encodeURIComponent(rec.name)}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify([{ data: rec.data, ttl: rec.ttl }]),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}

async function main() {
  const env = loadEnv();
  const H = auth(env);

  console.log('');
  console.log('==================================================================');
  console.log(`  GODADDY DNS  ·  ${APPLY ? 'UYGULAMA (yazar)' : 'DENETIM (yazmaz)'}`);
  console.log('==================================================================');

  let changes = 0;
  let applied = 0;

  for (const [domain, wanted] of Object.entries(DESIRED)) {
    if (ONLY && ONLY !== domain) continue;

    let current;
    try {
      current = await readRecords(H, domain);
    } catch (e) {
      console.log(`\n${domain}: ${e.message}`);
      continue;
    }

    console.log(`\n=== ${domain} === (${current.length} kayit)`);

    for (const rec of wanted) {
      const found = current.find((c) => c.type === rec.type && c.name === rec.name);
      const now = found ? found.data : null;
      const nowTtl = found ? found.ttl : null;

      if (now === rec.data && nowTtl === rec.ttl) {
        console.log(`  = ${rec.type.padEnd(6)} ${rec.name.padEnd(6)} ${rec.data}   (dogru)`);
        continue;
      }

      changes++;
      const label = now === null ? 'EKLE ' : 'DEGIS';
      const what = now === rec.data
        ? `TTL ${nowTtl} -> ${rec.ttl}`
        : `${now ?? '(yok)'}  ->  ${rec.data}`;
      console.log(`  ${label} ${rec.type.padEnd(6)} ${rec.name.padEnd(6)} ${what}`);

      if (APPLY) {
        try {
          await putRecord(H, domain, rec);
          applied++;
          console.log(`        ^ yazildi`);
        } catch (e) {
          console.log(`        ^ HATA: ${e.message}`);
        }
      }
    }
  }

  console.log('');
  console.log('------------------------------------------------------------------');
  if (!APPLY) {
    console.log(`  ${changes} degisiklik gerekiyor. Hicbir sey yazilmadi.`);
    console.log('  Uygulamak icin: node scripts/dns/godaddy-sync.mjs --apply');
  } else {
    console.log(`  ${applied}/${changes} kayit yazildi.`);
    console.log('  DNS yayilmasi TTL kadar surebilir (3600 sn = 1 saat).');
  }
  console.log('');
}

main().catch((e) => {
  console.error('\nHATA:', e.message);
  process.exit(1);
});
