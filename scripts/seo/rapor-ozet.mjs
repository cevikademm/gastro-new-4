#!/usr/bin/env node
/**
 * Unlighthouse rapor ayrıştırıcı — SEO Agent skill'i için.
 *
 * Kullanım:
 *   node rapor-ozet.mjs [outputDir=.unlighthouse] [--md <cikti.md>] [--budget 75]
 *
 * Okur:
 *   <outputDir>/ci-result.json      → jsonExpanded veya jsonSimple çıktısı
 *   <outputDir>/**\/lighthouse.json → rota başına ham Lighthouse raporu (varsa)
 *
 * Üretir: Türkçe skor tablosu, Core Web Vitals özeti, bütçe ihlalleri ve
 * tüm sayfalarda birleştirilmiş başarısız denetim (audit) listesi.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const outputDir = args.find(a => !a.startsWith('--')) ?? '.unlighthouse'
const mdIndex = args.indexOf('--md')
const mdPath = mdIndex !== -1 ? args[mdIndex + 1] : null
const budgetIndex = args.indexOf('--budget')
const budget = budgetIndex !== -1 ? Number(args[budgetIndex + 1]) : null

const CATEGORY_ORDER = ['performance', 'accessibility', 'best-practices', 'seo']
const CATEGORY_TR = {
  'performance': 'Performans',
  'accessibility': 'Erişilebilirlik',
  'best-practices': 'En İyi Pratikler',
  'seo': 'SEO',
  'pwa': 'PWA',
}
// [iyi eşiği, kötü eşiği] — Google Core Web Vitals sınıflandırması
const METRIC_THRESHOLDS = {
  'largest-contentful-paint': { good: 2500, poor: 4000, unit: 'ms', tr: 'LCP (En Büyük İçerik Boyaması)' },
  'cumulative-layout-shift': { good: 0.1, poor: 0.25, unit: '', tr: 'CLS (Kümülatif Düzen Kayması)' },
  'total-blocking-time': { good: 200, poor: 600, unit: 'ms', tr: 'TBT (Toplam Engelleme Süresi)' },
  'first-contentful-paint': { good: 1800, poor: 3000, unit: 'ms', tr: 'FCP (İlk İçerik Boyaması)' },
  'interactive': { good: 3800, poor: 7300, unit: 'ms', tr: 'TTI (Etkileşime Hazır)' },
  'max-potential-fid': { good: 130, poor: 250, unit: 'ms', tr: 'Maks. Olası FID' },
}

const out = []
const say = line => out.push(line)

function fail(msg) {
  console.error(`HATA: ${msg}`)
  process.exit(1)
}

function pct(score) {
  if (score === null || score === undefined || Number.isNaN(score))
    return '—'
  return String(Math.round(score * 100))
}

function durum(score) {
  if (score === null || score === undefined)
    return '—'
  const v = score * 100
  if (v >= 90)
    return 'İYİ'
  if (v >= 50)
    return 'ORTA'
  return 'ZAYIF'
}

function metrikDurum(id, value) {
  const t = METRIC_THRESHOLDS[id]
  if (!t || value === null || value === undefined)
    return '—'
  if (value <= t.good)
    return 'İYİ'
  if (value <= t.poor)
    return 'ORTA'
  return 'ZAYIF'
}

function fmtMetric(id, value) {
  const t = METRIC_THRESHOLDS[id]
  if (value === null || value === undefined)
    return '—'
  if (!t)
    return String(value)
  if (t.unit === 'ms')
    return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
  return value.toFixed(3)
}

// ---------------------------------------------------------------- ci-result
const ciPath = join(outputDir, 'ci-result.json')
if (!existsSync(ciPath)) {
  fail(`${ciPath} bulunamadı. Tarama tamamlanmamış olabilir.\n`
    + `      Çalıştır: npx -y unlighthouse-ci --site <URL> --output-path ${outputDir} --reporter jsonExpanded`)
}

let ci
try {
  ci = JSON.parse(readFileSync(ciPath, 'utf8'))
}
catch (e) {
  fail(`${ciPath} okunamadı/ayrıştırılamadı: ${e.message}`)
}

// jsonExpanded: { summary, routes, metadata } · jsonSimple: [ {path, score, ...} ]
const expanded = !Array.isArray(ci) && Array.isArray(ci.routes)
const routes = expanded
  ? ci.routes
  : (Array.isArray(ci) ? ci : [])

if (!routes.length)
  fail('Raporda hiç rota yok. Crawler sayfa bulamamış olabilir (--urls ile açıkça belirt).')

function routeCategoryScore(route, key) {
  if (expanded)
    return route.categories?.[key]?.score ?? null
  return route[key] ?? null
}

const presentCategories = CATEGORY_ORDER.filter(k =>
  routes.some(r => routeCategoryScore(r, k) !== null && routeCategoryScore(r, k) !== undefined),
)

say(`## Skor Özeti — ${routes.length} sayfa taranmış`)
say('')
say(`| Sayfa | Toplam | ${presentCategories.map(k => CATEGORY_TR[k] ?? k).join(' | ')} |`)
say(`|---|---|${presentCategories.map(() => '---').join('|')}|`)
for (const r of [...routes].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))) {
  const cells = presentCategories.map(k => pct(routeCategoryScore(r, k)))
  say(`| \`${r.path}\` | ${pct(r.score)} | ${cells.join(' | ')} |`)
}
say('')

// Ortalamalar
const avg = {}
for (const k of presentCategories) {
  const vals = routes.map(r => routeCategoryScore(r, k)).filter(v => typeof v === 'number')
  avg[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}
say('### Site Ortalaması')
say('')
say('| Kategori | Ortalama | Durum |')
say('|---|---|---|')
for (const k of presentCategories)
  say(`| ${CATEGORY_TR[k] ?? k} | ${pct(avg[k])} | ${durum(avg[k])} |`)
say('')

// ------------------------------------------------------------ bütçe kontrolü
if (budget !== null && !Number.isNaN(budget)) {
  const ihlaller = []
  for (const r of routes) {
    for (const k of presentCategories) {
      const s = routeCategoryScore(r, k)
      if (typeof s === 'number' && s * 100 < budget)
        ihlaller.push({ path: r.path, kategori: CATEGORY_TR[k] ?? k, skor: Math.round(s * 100) })
    }
  }
  say(`### Bütçe Kontrolü (eşik: ${budget})`)
  say('')
  if (!ihlaller.length) {
    say(`Tüm sayfalar tüm kategorilerde ${budget} eşiğini geçti. **GEÇTİ**`)
  }
  else {
    say(`**KALDI** — ${ihlaller.length} ihlal:`)
    say('')
    say('| Sayfa | Kategori | Skor | Fark |')
    say('|---|---|---|---|')
    for (const i of ihlaller.sort((a, b) => a.skor - b.skor))
      say(`| \`${i.path}\` | ${i.kategori} | ${i.skor} | -${budget - i.skor} |`)
  }
  say('')
}

// ------------------------------------------------------------ Core Web Vitals
if (expanded && ci.summary?.metrics) {
  say('### Core Web Vitals (site ortalaması)')
  say('')
  say('| Metrik | Ortalama | İyi eşiği | Durum |')
  say('|---|---|---|---|')
  for (const [id, m] of Object.entries(ci.summary.metrics)) {
    const t = METRIC_THRESHOLDS[id]
    const v = m.averageNumericValue
    say(`| ${t?.tr ?? id} | ${fmtMetric(id, v)} | ${t ? fmtMetric(id, t.good) : '—'} | ${metrikDurum(id, v)} |`)
  }
  say('')

  // En kötü sayfalar (LCP'ye göre)
  const worst = routes
    .filter(r => typeof r.metrics?.['largest-contentful-paint']?.numericValue === 'number')
    .sort((a, b) => b.metrics['largest-contentful-paint'].numericValue - a.metrics['largest-contentful-paint'].numericValue)
    .slice(0, 5)
  if (worst.length) {
    say('**En yavaş 5 sayfa (LCP):**')
    say('')
    say('| Sayfa | LCP | CLS | TBT |')
    say('|---|---|---|---|')
    for (const r of worst) {
      say(`| \`${r.path}\` | ${fmtMetric('largest-contentful-paint', r.metrics['largest-contentful-paint']?.numericValue)} `
        + `| ${fmtMetric('cumulative-layout-shift', r.metrics['cumulative-layout-shift']?.numericValue)} `
        + `| ${fmtMetric('total-blocking-time', r.metrics['total-blocking-time']?.numericValue)} |`)
    }
    say('')
  }
}

// -------------------------------------------- ham lighthouse.json birleştirme
function findLighthouseReports(dir) {
  const found = []
  let entries
  try {
    entries = readdirSync(dir, { recursive: true, withFileTypes: true })
  }
  catch {
    return found
  }
  for (const e of entries) {
    // Unlighthouse rota başına `lighthouse.html` yazar (tam JSON içine gömülüdür).
    // Bazı sürümler ayrıca `lighthouse.json` bırakır; ikisini de topla.
    if (e.isFile() && (e.name === 'lighthouse.json' || e.name === 'lighthouse.html'))
      found.push(join(e.parentPath ?? e.path ?? dir, e.name))
  }
  // Aynı klasörde hem .json hem .html varsa .json'u tercih et
  const dirs = new Set(found.filter(f => f.endsWith('.json')).map(f => f.slice(0, -'lighthouse.json'.length)))
  return found.filter(f => f.endsWith('.json') || !dirs.has(f.slice(0, -'lighthouse.html'.length)))
}

/** `lighthouse.html` içine gömülü `window.__LIGHTHOUSE_JSON__` nesnesini çıkarır. */
function extractEmbeddedJson(html) {
  const marker = '__LIGHTHOUSE_JSON__'
  const at = html.indexOf(marker)
  if (at === -1)
    return null
  const start = html.indexOf('{', at)
  if (start === -1)
    return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (esc) {
      esc = false
      continue
    }
    if (inStr) {
      if (c === '\\')
        esc = true
      else if (c === '"')
        inStr = false
      continue
    }
    if (c === '"')
      inStr = true
    else if (c === '{')
      depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1))
        }
        catch {
          return null
        }
      }
    }
  }
  return null
}

function readLighthouseReport(file) {
  const raw = readFileSync(file, 'utf8')
  if (file.endsWith('.json')) {
    try {
      return JSON.parse(raw)
    }
    catch {
      return null
    }
  }
  return extractEmbeddedJson(raw)
}

const lhFiles = findLighthouseReports(outputDir)
if (lhFiles.length) {
  const auditMap = new Map() // id -> { title, description, sayfalar:[], skorlar:[], msKazanc, byteKazanc, kategoriler:Set }
  const auditCategory = new Map() // auditId -> kategori anahtarı

  let parsedCount = 0
  for (const file of lhFiles) {
    let lh
    try {
      lh = readLighthouseReport(file)
    }
    catch {
      lh = null
    }
    if (!lh?.audits)
      continue
    parsedCount++
    const sayfa = lh.finalDisplayedUrl ?? lh.finalUrl ?? lh.requestedUrl ?? file

    // audit -> kategori eşlemesi
    for (const [catKey, cat] of Object.entries(lh.categories ?? {})) {
      for (const ref of cat.auditRefs ?? []) {
        if (!auditCategory.has(ref.id))
          auditCategory.set(ref.id, catKey)
      }
    }

    for (const audit of Object.values(lh.audits ?? {})) {
      // sadece puanlanabilir ve başarısız denetimler
      if (audit.score === null || audit.score === undefined)
        continue
      if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'manual')
        continue
      if (audit.score >= 0.9)
        continue

      if (!auditMap.has(audit.id)) {
        auditMap.set(audit.id, {
          id: audit.id,
          title: audit.title,
          sayfalar: [],
          skorlar: [],
          msKazanc: 0,
          byteKazanc: 0,
        })
      }
      const rec = auditMap.get(audit.id)
      rec.sayfalar.push(sayfa)
      rec.skorlar.push(audit.score)
      const ms = audit.details?.overallSavingsMs ?? audit.metricSavings?.LCP ?? 0
      const bytes = audit.details?.overallSavingsBytes ?? 0
      if (typeof ms === 'number')
        rec.msKazanc += ms
      if (typeof bytes === 'number')
        rec.byteKazanc += bytes
    }
  }

  const audits = [...auditMap.values()]
    .map(a => ({
      ...a,
      kategori: auditCategory.get(a.id) ?? '—',
      ortSkor: a.skorlar.reduce((x, y) => x + y, 0) / a.skorlar.length,
      ortMs: a.msKazanc / a.sayfalar.length,
    }))
    // sıralama: yaygınlık × düşük skor × kazanç
    .sort((a, b) => {
      const w = x => x.sayfalar.length * (1 - x.ortSkor) * (1 + x.ortMs / 1000)
      return w(b) - w(a)
    })

  say(`### Başarısız Denetimler (${parsedCount}/${lhFiles.length} ham rapordan birleştirildi)`)
  say('')
  if (!audits.length) {
    say('Skoru 0.9 altında olan denetim yok.')
  }
  else {
    say('Sıralama: etkilenen sayfa sayısı × düşük skor × tahmini kazanç.')
    say('')
    say('| # | Denetim | Kategori | Etkilenen | Ort. skor | Tahmini kazanç |')
    say('|---|---|---|---|---|---|')
    audits.slice(0, 30).forEach((a, i) => {
      const kazanc = a.msKazanc >= 1
        ? `${Math.round(a.ortMs)} ms/sayfa`
        : (a.byteKazanc >= 1024 ? `${Math.round(a.byteKazanc / 1024)} KB` : '—')
      say(`| ${i + 1} | ${a.title} <br>\`${a.id}\` | ${CATEGORY_TR[a.kategori] ?? a.kategori} `
        + `| ${a.sayfalar.length}/${parsedCount} | ${pct(a.ortSkor)} | ${kazanc} |`)
    })
    if (audits.length > 30)
      say(`\n_(${audits.length - 30} denetim daha listelenmedi.)_`)
  }
  say('')
}
else {
  say('### Başarısız Denetimler')
  say('')
  say(`\`${outputDir}\` altında ham \`lighthouse.json\` bulunamadı — denetim bazında `
    + 'kırılım üretilemedi. Kategori skorları yukarıdaki tablolardan okunmalı.')
  say('')
}

const rapor = out.join('\n')
console.log(rapor)

if (mdPath) {
  writeFileSync(mdPath, `${rapor}\n`, 'utf8')
  console.log(`\n[✓] Markdown özet yazıldı: ${mdPath}`)
}
