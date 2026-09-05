#!/usr/bin/env node
// scripts/dns/vercel-domains.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Vercel projesine alan adı ekler ve 301 yönlendirmesini kurar.
//
// VARSAYILAN --check'tir: hiçbir şey yazmaz. Yazmak için --apply gerekir.
//
// Amaç: 2mcgastro.com ve 2mcgastro.eu, canonical adres olan
// www.2mcgastro.de'ye kalıcı olarak yönlensin. Aynı içeriği birden çok alan
// adında SUNMAK değil — o duplicate content olur ve SEO gücünü böler.
//
// Kullanım:
//   node scripts/dns/vercel-domains.mjs           # denetle
//   node scripts/dns/vercel-domains.mjs --apply   # uygula
import { loadEnv } from '../shopify/lib.mjs';

const APPLY = process.argv.includes('--apply');

const CANONICAL = 'www.2mcgastro.de';
const REDIRECT_CODE = 301;

// Bu alan adları CANONICAL'e yönlendirilecek.
// www.2mcgastro.de ve 2mcgastro.de'ye DOKUNULMAZ — onlar zaten doğru kurulu.
const DESIRED = [
  '2mcgastro.com',
  'www.2mcgastro.com',
  '2mcgastro.eu',
  'www.2mcgastro.eu',
];

// Bu alan adlarına hiçbir koşulda dokunulmaz.
const PROTECTED = new Set([CANONICAL, '2mcgastro.de', 'gastro-new-4.vercel.app']);

function cfg() {
  const e = loadEnv();
  for (const k of ['VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_TEAM_ID']) {
    if (!e[k]) throw new Error(`${k} .env icinde bulunamadi`);
  }
  return {
    H: { Authorization: `Bearer ${e.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    base: `https://api.vercel.com/v10/projects/${e.VERCEL_PROJECT_ID}/domains`,
    read: `https://api.vercel.com/v9/projects/${e.VERCEL_PROJECT_ID}/domains`,
    q: `teamId=${e.VERCEL_TEAM_ID}`,
  };
}

async function main() {
  const { H, base, read, q } = cfg();

  console.log('');
  console.log('==================================================================');
  console.log(`  VERCEL ALAN ADLARI  ·  ${APPLY ? 'UYGULAMA (yazar)' : 'DENETIM (yazmaz)'}`);
  console.log(`  hedef: 301 -> ${CANONICAL}`);
  console.log('==================================================================');

  const res = await fetch(`${read}?${q}`, { headers: H });
  if (!res.ok) throw new Error(`Alan adlari okunamadi: HTTP ${res.status}`);
  const existing = (await res.json()).domains || [];
  const byName = new Map(existing.map((d) => [d.name, d]));

  console.log('\n=== MEVCUT ===');
  existing.forEach((d) => {
    const how = d.redirect ? `-> ${d.redirect} (${d.redirectStatusCode})` : '(site sunuyor)';
    console.log(`  ${d.name.padEnd(30)} ${how}`);
  });

  console.log('\n=== YAPILACAK ===');
  let todo = 0;
  let done = 0;

  for (const name of DESIRED) {
    if (PROTECTED.has(name)) {
      console.log(`  ATLA  ${name}  (korumali)`);
      continue;
    }
    const cur = byName.get(name);
    if (cur && cur.redirect === CANONICAL) {
      console.log(`  =     ${name.padEnd(24)} zaten -> ${CANONICAL}`);
      continue;
    }

    todo++;
    console.log(`  ${cur ? 'DUZELT' : 'EKLE  '} ${name.padEnd(24)} -> ${CANONICAL} (${REDIRECT_CODE})`);

    if (!APPLY) continue;

    // Varsa once kaldir (yonlendirmesi farkli olabilir), sonra dogru haliyle ekle.
    if (cur) {
      await fetch(`${base}/${name}?${q}`, { method: 'DELETE', headers: H });
    }
    const r = await fetch(`${base}?${q}`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ name, redirect: CANONICAL, redirectStatusCode: REDIRECT_CODE }),
    });
    if (r.ok) {
      done++;
      console.log('        ^ eklendi');
    } else {
      console.log(`        ^ HATA: HTTP ${r.status} ${(await r.text()).slice(0, 180)}`);
    }
  }

  console.log('');
  console.log('------------------------------------------------------------------');
  if (!APPLY) {
    console.log(`  ${todo} islem gerekiyor. Hicbir sey yazilmadi.`);
    console.log('  Uygulamak icin: node scripts/dns/vercel-domains.mjs --apply');
  } else {
    console.log(`  ${done}/${todo} alan adi eklendi.`);
    console.log('  SIRADAKI: node scripts/dns/godaddy-sync.mjs --apply  (DNS yonlendirmesi)');
    console.log('  Vercel "Invalid Configuration" gosterebilir — DNS yayilinca duzelir.');
  }
  console.log('');
}

main().catch((e) => {
  console.error('\nHATA:', e.message);
  process.exit(1);
});
