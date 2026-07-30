// fixPromptCore — hata bildirimini/log'unu "geliştirici prompt'una" çeviren
// ortak çekirdek. İki function kullanır:
//   · fix-prompt     → admin panelden ELLE tetiklenen üretim
//   · error-webhook  → yeni kayıt düşünce OTOMATİK tetiklenen triyaj
// Tek kaynak olsun ki proje bağlamı iki yerde ayrışmasın.

// SDK 0.115.0 gerekli: structured outputs (output_config.format) 0.27'de yok.
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.115.0";

export const DEFAULT_MODEL = "claude-haiku-4-5";

// ─── Proje bağlamı ────────────────────────────────────────────────────
// Modelin "hangi dosyaya bakılmalı" sorusunu doğru cevaplayabilmesi için
// rota→dosya haritası ve projeye özgü tuzaklar burada veriliyor.
export const PROJECT_CONTEXT = `# 2MC Gastro — proje bağlamı

Endüstriyel mutfak ekipmanları için B2B web uygulaması.

## Teknoloji
- React 18 + TypeScript + Vite · React Router v6 (SPA)
- Tailwind CSS v4 (oklch renkler — klasik html2canvas patlar, html2canvas-pro kullanılır)
- Zustand (store'lar: src/stores/*) — v5'te selector her çağrıda yeni dizi/nesne
  döndürürse sonsuz render döngüsü olur; useMemo / useShallow şart
- Supabase (Postgres + Auth + Storage + Edge Functions) · RLS aktif
- i18next — 15 dil (tr, en, de, fr, nl, it, es, pt, pl, cs, ro, el, sv, da, hu),
  dosyalar src/i18n/*.json
- Three.js (imperatif 3B editör) + Konva (2B plan) — src/modules/three-d-design
- Deploy: Vercel (prod www.2mcgastro.de)

## Klasör düzeni
- src/pages/**      → sayfa bileşenleri (rota hedefleri)
- src/components/** → paylaşılan bileşenler (Layout, Dashboard, Cart, BOM, DesignStudio…)
- src/lib/**        → iş mantığı yardımcıları (supabase, quote/pdf, errorReport, designDelete…)
- src/stores/**     → Zustand store'ları
- src/modules/three-d-design/** → 2B/3B mutfak tasarım aracı
- supabase/migrations/** → SQL migration'ları (sıralı numaralı)
- supabase/functions/**  → Deno edge function'ları

## Rota → dosya haritası
/ , /welcome                    → src/pages/landing/LandingPage.tsx
/magaza , /urunler              → src/pages/shop/ShopPage.tsx
/login , /forgot-password       → src/pages/auth/LoginPage.tsx
/register                       → src/pages/auth/RegisterPage.tsx
/pending-approval               → src/pages/auth/PendingApprovalPage.tsx
/dashboard                      → src/components/Dashboard.tsx
/design                         → src/components/DesignStudio.tsx
/design/3d , /projects/:id/design/3d → src/pages/design/FloorPlan3DPage.tsx
/3d-design , /projects/:id/design    → src/pages/design/ThreeDDesignPage.tsx (+ src/modules/three-d-design/**)
/bom , /bom/:id                 → src/components/BOM.tsx
/katalog                        → src/pages/products/ProductsPage.tsx
/product/:id                    → src/pages/product/ProductDetailPage.tsx
/checkout                       → src/pages/checkout/CheckoutPage.tsx
/kitchen-planner                → src/pages/planner/KitchenPlannerPage.tsx
/cart                           → src/components/Cart.tsx
/favorites                      → src/pages/favorites/FavoritesPage.tsx
/orders , /orders/:id           → src/pages/orders/OrdersPage.tsx · OrderDetailPage.tsx
/teklifler                      → src/pages/projects/QuotesPage.tsx
/projects , /projects/new , /projects/:id → src/pages/projects/{ProjectListPage,NewProjectPage,ProjectDetailPage}.tsx
/projects/:id/products/add|new  → src/pages/products/{SelectProductPage,AddProductPage}.tsx
/settings /support /docs /profile /payment /brand /resources
                                → src/pages/{settings,support,docs,profile,payment,brand,resources}/*.tsx
/blog , /blog/:slug             → src/pages/blog/{BlogListPage,BlogPostPage}.tsx
/tools/kitchen-calculator       → src/pages/tools/KitchenCalculatorPage.tsx
/sektor/** , /kategori/** , /marka/** → src/pages/pseo/*.tsx
/compare , /compare/:slug       → src/pages/compare/*.tsx
/account/api-keys               → src/pages/account/ApiKeysPage.tsx
/developers/api                 → src/pages/developers/ApiDocsPage.tsx
/admin/orders /admin/users /admin/blog → src/pages/admin/*.tsx
/admin/error-reports            → src/pages/admin/ErrorReportsPage.tsx

## src/lib (TAM liste — burada olmayan bir lib dosyası YOKTUR. Yol: src/lib/<ad>.ts)
abTest ai analytics angebotPdf assets b2b-payments categoryTaxonomy companyInfo
consent-log content-policy csrf designDelete designProductSync designQuoteLines
designRenderStore diamondAdapter dims email email-footer error-reporting errorReport
fixPrompt gastroDesignSync gastroSync htmlText iban invoice leadCapture meilisearch
meshyClient order-confirmation orderPdf orderWhatsapp payment pdfFont pdfImage
pdfWatermark posthog pricing productCopy productDetailVM rfq secure-storage security
seo stripe supabase supabaseGastro utils validation vat webVitals
İşlev ipuçları: teklif/Angebot PDF → angebotPdf · sipariş PDF → orderPdf ·
PDF font/görsel/filigran → pdfFont, pdfImage, pdfWatermark · fiyat/KDV → pricing, vat ·
tasarım↔teklif satırları → designQuoteLines · tasarımdan silme → designDelete ·
ürün detay verisi → productDetailVM · kategori ağacı → categoryTaxonomy

## src/stores (TAM liste, Zustand — yol: src/stores/<ad>.ts)
adminStore allProductsStore authStore bannerStore bomStore cartStore catalogStore
combisteelStore compareStore customerFinderStore diamondStore equipmentStore
handiStore meshStore orderStore productDetailStore projectStore rfqStore uiStore
welcomeOrderStore

## src/components (TAM liste — yol: src/components/<Ad>.tsx)
AdminGuard AnalyticsListener BOM Background3D Cart CartDrawer CartQuantityButton
Catalog CategoryFilterPanel CategoryFiltersSidebar ComparePanel ConfirmDialog
CookieBanner Dashboard DesignStudio ErrorReportWidget FloorPlan3DViewer GDPRActions
GradientDots Hero LanguageSelector Layout LeadCaptureModal LiveChatWidget
Logo3DBackground Model3DViewer Navbar NewsletterSignup NotificationPanel
ParticlesSwarm PriceDisplay ProductDetailDrawer ProductDetailModal ProductFilter
ProductsMegaMenu RevealOnScroll ReviewWidget RouteErrorBoundary SEO SafeModelViewer
SalesChatWidget ScrollProgress SearchCommand Sections Showcase3D SiteFooter
TestimonialsSection ThreeBackground WithdrawalButton

## Projeye özgü kurallar (ihlal edilirse regresyon olur)
- Ürün detayı TEK standart bileşenden açılır: src/components/ProductDetailDrawer.tsx
  (App kökünde global; openFromItem ile açılır). Paralel detay görünümü yazma.
- Karşılaştırma paneli global: src/components/ComparePanel.tsx —
  yeni gridlerde equipmentToCompareItem / brandToSource yardımcıları kullanılır.
- Tasarımda ürün silme her yerden silmeli: src/lib/designDelete.ts →
  removeEquipmentEverywhere (teklif + Ürünler listesi de temizlenir).
- Onay pencereleri window.confirm değil src/components/ConfirmDialog.tsx.
- 2B/3B aynalama src/modules/three-d-design/.../renderSpace.ts üzerinden yapılır;
  contentRoot saf dönüş kalmalı.
- Kategori menüsü/mağaza/baloncuklar tek kaynaktan: src/lib/categoryTaxonomy.ts
- Yeni kullanıcıya görünen metin eklenirse 15 dilin tamamına çeviri gerekir.
  src/i18n: tr.json ve en.json LF, diğer 13 dosya CRLF — satır sonunu koru.
- Marka kırmızısı #931315. Mavi logo-werbung.png kardeş marka, Gastro tekliflerinde kullanılmaz.
- Ekran görüntüsü alan her yerde html2canvas-pro kullanılır (klasik html2canvas DEĞİL).
- Windows'ta npm install rollup hatası verirse \`--force\` ile kurulur.`;

export const SYSTEM_PROMPT = `Sen 2MC Gastro projesinin teknik triyaj asistanısın.

GÖREVİN: Kullanıcının (çoğunlukla teknik olmayan bir admin'in) kendi cümleleriyle
anlattığı sorunu/isteği — ya da uygulamanın otomatik yakaladığı ham bir JavaScript
hatasını — YORUMLA ve bunu, bir yazılım geliştiricinin (ya da Claude Code'un)
doğrudan uygulayabileceği NET BİR GELİŞTİRME PROMPT'una çevir.

Sana verilen ham bildirim genelde eksik ve belirsizdir ("buton çalışmıyor",
"liste bozuk"). Senin işin tahmin yürütmek değil, ELDEKİ İPUÇLARINDAN
(rota, ekran boyutu, stack trace, konsol hatası, önem derecesi) en olası kök nedeni
daraltmak ve doğrulanabilir bir iş tarifi yazmaktır.

${PROJECT_CONTEXT}

ALAN KURALLARI:
- Türkçe yaz (istenen dil farklıysa o dilde yaz). Yalnızca Türkçe harf kullan;
  başka alfabelerden (Kiril, Yunan) harf karıştırma.
- Stack trace verilmişse önce ONU oku: dosya/satır bilgisi varsa oradan başla.
- task: tek cümle, emir kipinde, net.
  Örn. "Teklif PDF'inde boş görünen fiyat sütunlarını düzelt."
- detailedDescription: kullanıcının kısa/dağınık anlatımının DETAYLANDIRILMIŞ hali.
  Bu alan hem geliştiriciye hem de kaydı sonradan okuyacak insana gidiyor; kaydın
  kalıcı "detaylı açıklama"sı olarak saklanacak. 3-6 cümle, düz paragraf
  (madde işareti/başlık kullanma) ve şunları kapsasın:
    · Kullanıcı ne yapmaya çalışıyordu, hangi ekranda/akışta,
    · Ne olmasını bekliyordu (beklenen davranış),
    · Bunun yerine ne oldu (gerçekleşen davranış),
    · Ne zaman/hangi koşulda oluşuyor (her seferinde mi, belirli veride mi,
      "geçen hafta çalışıyordu" gibi bir regresyon ipucu var mı),
    · İşe etkisi (teklif gönderilemiyor, sipariş alınamıyor vb.).
  KURALLAR: Kullanıcının söylediğini KORU ve genişlet — söylediğini değiştirme,
  çelişme, küçümseme. Bilmediğin bir ayrıntıyı olmuş gibi anlatma; çıkarımsa
  "Varsayım: ..." diye işaretle. Teknik kök neden tahminini buraya değil
  risks/steps alanlarına yaz.
- files: 2-5 kayıt. path YALNIZCA yukarıdaki rota haritası ve dosya
  listelerinden seçilir. Listede olmayan dosya adı YAZMA — "src/lib/pdfGenerator.ts"
  diye bir dosya YOKTUR. Doğru dosyadan emin değilsen bu diziye ekleme; bunun
  yerine searchHints'e grep'lenecek terimi koy.
- steps: 3-5 somut adım; her adım tek bir iş.
- acceptance: 2-4 GÖZLE DOĞRULANABİLİR kriter ("X sayfasında Y butonuna basınca
  Z görünür"). "Düzgün çalışmalı" gibi muğlak kriter yazma.
- risks: 1-3 madde — bu projede kırılabilecek şey / regresyon riski
  (yukarıdaki "Projeye özgü kurallar"dan ilgili olanı hatırlat).
- searchHints: SADECE files'a güvenle dosya koyamadığında doldur. files'da 3+
  kayıt varsa bu diziyi BOŞ bırak — zaten doğru yeri gösterdin, ayrıca arama
  ipucu vermek gürültü olur. En fazla 3 terim.
- Emin olmadığın bir çıkarımı "Varsayım: ..." diye işaretle.
- Kısa yaz: detailedDescription dışındaki alanların toplamı 350 kelimeyi
  geçmesin. Doldurma metni yazma.`;

// ─── Çıktı şeması ─────────────────────────────────────────────────────
// NEDEN ŞEMA? Haiku serbest metinde markdown şablonunu güvenilir tutturamıyor
// (kendi başlıklarını uyduruyor, uzunluğu kaçırıyor — testlerde doğrulandı).
// Bu yüzden modelden ALANLAR isteniyor, markdown iskeleti aşağıda renderPrompt
// içinde KODDA kuruluyor. Böylece biçim %100 deterministik.
// Not: structured outputs minItems/maxItems desteklemez; adet sınırları
// yukarıdaki ALAN KURALLARI'nda prose olarak veriliyor.
export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    task: { type: "string", description: "Tek cümlelik, emir kipinde net görev" },
    detailedDescription: {
      type: "string",
      description:
        "Kullanıcının anlatımının detaylandırılmış hali: ne yapılıyordu, ne bekleniyordu, " +
        "ne oldu, hangi koşulda tekrarlıyor, işe etkisi. 3-6 cümlelik düz paragraf. " +
        "Kayda kalıcı açıklama olarak yazılır.",
    },
    files: {
      type: "array",
      description: "İncelenecek dosyalar (yalnızca gerçek, listede olan yollar)",
      items: {
        type: "object",
        properties: {
          path: { type: "string", description: "Repo köküne göre yol, ör. src/lib/angebotPdf.ts" },
          why: { type: "string", description: "Bu dosyaya neden bakılmalı" },
        },
        required: ["path", "why"],
        additionalProperties: false,
      },
    },
    steps: { type: "array", description: "Somut yapılacaklar", items: { type: "string" } },
    acceptance: { type: "array", description: "Gözle doğrulanabilir kabul kriterleri", items: { type: "string" } },
    risks: { type: "array", description: "Regresyon riskleri / dikkat edilecekler", items: { type: "string" } },
    searchHints: {
      type: "array",
      description: "Dosya belirsizse grep'lenecek terimler; belirsizlik yoksa boş dizi",
      items: { type: "string" },
    },
  },
  required: ["task", "detailedDescription", "files", "steps", "acceptance", "risks", "searchHints"],
  additionalProperties: false,
};

export interface PromptFields {
  task: string;
  /** Kullanıcının anlatımının AI ile detaylandırılmış hali — kayda da yazılır. */
  detailedDescription: string;
  files: Array<{ path: string; why: string }>;
  steps: string[];
  acceptance: string[];
  risks: string[];
  searchHints: string[];
}

/**
 * JSON alanlardan markdown prompt'u kurar — biçim burada, modelde değil.
 * @param rawDescription Kullanıcının/log'un ham metni. Prompt'a AYNEN eklenir ki
 *   geliştirici modelin yorumuna değil, bildirilen asıl ifadeye de bakabilsin.
 */
export function renderPrompt(f: PromptFields, rawDescription = ""): string {
  const files = f.files.filter((x) => x?.path);
  // Dosyalar zaten netse arama ipuçları gürültü — modele söylüyoruz ama
  // uymadığında burada da kısıyoruz (en fazla 3, dosya listesi zayıfsa).
  const hints = files.length >= 3 ? [] : f.searchHints.filter(Boolean).slice(0, 3);
  const filesBlock = [
    ...files.map((x) => `- \`${x.path}\` — ${x.why}`),
    ...hints.map((h) => `- 🔎 Aranacak: \`${h}\` — ilgili dosyayı bul.`),
  ].join("\n");

  return [
    "## 🎯 Görev",
    f.task,
    "",
    "## 🔍 Belirti",
    f.detailedDescription,
    // Ham ifade her zaman prompt'ta kalsın — AI yanlış yorumladıysa geliştirici
    // asıl cümleden yakalayabilsin.
    ...(rawDescription ? ["", `> Bildirenin kendi ifadesi: "${rawDescription}"`] : []),
    "",
    "## 📂 İncelenecek dosyalar",
    filesBlock || "- Belirsiz — önce hatayı üreten akışı tespit et.",
    "",
    "## 🛠️ Yapılacaklar",
    f.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") || "1. Hatayı yerelde üret ve akışı izle.",
    "",
    "## ✅ Kabul kriterleri",
    f.acceptance.map((s) => `- [ ] ${s}`).join("\n") || "- [ ] Bildirilen adımlar hatasız tamamlanır.",
    "",
    "## ⚠️ Dikkat",
    f.risks.map((s) => `- ${s}`).join("\n") || "- Değişikliği ilgili sayfada gözle doğrula.",
  ].join("\n");
}

// Aşırı uzun alanlar prompt'u şişirmesin.
export const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

export interface ReportInput {
  description?: string;
  pagePath?: string;
  pageUrl?: string;
  severity?: string;
  screenSize?: string;
  userAgent?: string;
  consoleErrors?: string;
  reporter?: string;
  locale?: string;
  /** Otomatik loglarda: JS stack trace. */
  stack?: string;
  /** Otomatik loglarda: hatanın kaç kez tekrarladığı. */
  occurrences?: number;
  /** 'report' (elle bildirim) | 'log' (otomatik yakalama) */
  kind?: "report" | "log";
}

export function buildUserMessage(r: ReportInput): string {
  const isLog = r.kind === "log";
  const lines = [
    isLog
      ? "Aşağıdaki OTOMATİK YAKALANMIŞ çalışma zamanı hatasını yorumla ve şablona göre geliştirme prompt'unu yaz."
      : "Aşağıdaki ham hata bildirimini yorumla ve şablona göre geliştirme prompt'unu yaz.",
    "",
    isLog ? "### Hata mesajı" : "### Kullanıcının anlattığı",
    clip(r.description, 4000) || "—",
    "",
    "### Bağlam",
    `- Rota: ${clip(r.pagePath, 300) || "—"}`,
    r.pageUrl ? `- Tam URL: ${clip(r.pageUrl, 500)}` : null,
    `- Önem: ${clip(r.severity, 20) || "normal"}`,
    `- Ekran: ${clip(r.screenSize, 40) || "—"}`,
    r.userAgent ? `- Tarayıcı: ${clip(r.userAgent, 300)}` : null,
    r.reporter ? `- Bildiren: ${clip(r.reporter, 120)}` : null,
    r.occurrences && r.occurrences > 1 ? `- Tekrar sayısı: ${r.occurrences}` : null,
    r.stack ? `\n### Stack trace\n\`\`\`\n${clip(r.stack, 3000)}\n\`\`\`` : null,
    r.consoleErrors ? `\n### Konsol hataları\n${clip(r.consoleErrors, 3000)}` : null,
  ].filter(Boolean);

  const locale = clip(r.locale, 10) || "tr";
  if (locale !== "tr") lines.push("", `Çıktı dili: ${locale}`);
  return lines.join("\n");
}

export interface FixPromptOutput {
  prompt: string;
  fields: PromptFields | null;
  model: string;
  stopReason: string | null;
  usage: { input: number; output: number; cacheRead: number };
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => clip(x, 500)).filter(Boolean) : [];

/**
 * Claude'a tek çağrı atıp markdown düzeltme prompt'unu döndürür.
 * Model şemaya uymak zorunda (output_config.format); markdown kodda kurulur.
 * Boş prompt = başarısız üretim (çağıran taraf hata olarak yorumlar).
 * @throws Anthropic SDK hatası — çağıran taraf statüyü kendisi yorumlar.
 */
export async function generateFixPrompt(
  apiKey: string,
  input: ReportInput,
  model = DEFAULT_MODEL,
): Promise<FixPromptOutput> {
  const anthropic = new Anthropic({ apiKey });

  const res = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Not: Haiku 4.5'te cache alt sınırı 4096 token; bu prefix daha kısaysa
        // sessizce cache'lenmez (hata değil). Sistem prompt'u büyürse devreye girer.
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const usage = {
    input: res.usage?.input_tokens ?? 0,
    output: res.usage?.output_tokens ?? 0,
    cacheRead: res.usage?.cache_read_input_tokens ?? 0,
  };
  const base = { model: res.model, stopReason: res.stop_reason ?? null, usage };

  // max_tokens'a takılan yanıt yarım JSON'dur — parse etmeye çalışma.
  if (res.stop_reason === "max_tokens") return { prompt: "", fields: null, ...base };

  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return { prompt: "", fields: null, ...base };

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    return { prompt: "", fields: null, ...base };
  }

  const fields: PromptFields = {
    task: clip(parsed.task, 500),
    detailedDescription: clip(parsed.detailedDescription, 3000),
    files: Array.isArray(parsed.files)
      ? (parsed.files as Array<Record<string, unknown>>)
          .map((x) => ({ path: clip(x?.path, 300), why: clip(x?.why, 400) }))
          .filter((x) => x.path)
      : [],
    steps: asArray(parsed.steps),
    acceptance: asArray(parsed.acceptance),
    risks: asArray(parsed.risks),
    searchHints: asArray(parsed.searchHints),
  };

  if (!fields.task) return { prompt: "", fields: null, ...base };
  // Ham metin hem prompt'a gömülür hem de fields ile geri döner; çağıran taraf
  // description_ai'yi yazarken kullanıcının orijinal description'ına dokunmaz.
  return { prompt: renderPrompt(fields, clip(input.description, 1000)), fields, ...base };
}
