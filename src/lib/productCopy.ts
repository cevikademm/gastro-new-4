// productCopy.ts — yapısal üründen pefra.de tarzı pazarlama metni ÜRETİR.
// Giriş paragrafı + "Ürün Avantajları" listesi; tamamı i18n şablonlarından,
// 15 dilde, tüm ürünler için anında ve ücretsiz. Gerçek üretici verisi (özellik
// satırları, güç, ölçü) varsa öne çıkarılır; yoksa kategoriye göre jenerik kalite
// maddeleriyle doldurulur. Teknik veriler ayrıca specs/ölçü bölümlerinde gösterilir.

import type { VM } from './productDetailVM';

type TFunc = (key: string, opts?: any) => string;

export interface ProductCopy {
  intro: string;
  advantages: string[];
}

/** Ölçü chip'lerinden "1020 × 575 × 1010 mm" özet dizesi (ağırlık hariç). */
function dimsString(vm: VM): string {
  const parts = vm.dims
    .filter((d) => d.key !== 'weight')
    .map((d) => d.value.replace(/\s*mm$/i, '').trim())
    .filter(Boolean);
  return parts.length ? `${parts.join(' × ')} mm` : '';
}

/**
 * Bir ürün için giriş metni + avantaj listesi üretir.
 * @param catId  Taksonomi kategori id'si (resolvedOf().cat) — kategoriye özel isim için.
 */
export function buildProductCopy(vm: VM, catId: string | null, t: TFunc): ProductCopy {
  const noun = t(`product.catNoun.${catId || 'default'}`, t('product.catNoun.default', 'profesyonel mutfak ekipmanı'));
  // defaultValue: i18n anahtarı (eski/eksik sözlük) çözülmese bile metin HER ZAMAN görünür.
  const intro = t('product.copyIntro', {
    brand: vm.brand, noun,
    defaultValue: `${vm.brand} ${noun}, profesyonel mutfaklar, restoranlar ve catering işletmeleri için tasarlanmıştır. Dayanıklı yapısı, kolay kullanımı ve güvenilir performansıyla yoğun ticari kullanımda üstün sonuçlar sunar.`,
  });

  // Üreticinin gerçek özellik satırları yalnızca desc bir LİSTE ise (çok satır) kullanılır;
  // tek paragraf desc, açıklama metni olarak ayrıca gösterilir (drawer), burada tekrar etmeyiz.
  const realBullets = vm.features.length > 1 ? vm.features.filter((f) => f.length > 3) : [];

  const adv: string[] = [...realBullets];

  if (vm.kw && vm.kw > 0) adv.push(t('product.advPower', { kw: vm.kw, defaultValue: `Güçlü ${vm.kw} kW motor` }));
  const dStr = dimsString(vm);
  if (dStr) adv.push(t('product.advDimensions', { dims: dStr, defaultValue: `Ölçüler: ${dStr}` }));

  // Gerçek madde azsa jenerik kalite maddeleriyle doldur.
  if (realBullets.length < 4) {
    adv.push(t('product.advProfessional', 'Profesyonel ve yoğun kullanım için tasarım'));
    adv.push(t('product.advDurable', 'Dayanıklı, paslanmaz çelik yapı'));
    adv.push(t('product.advEasyClean', 'Kolay temizlik ve bakım'));
    adv.push(t('product.advCe', 'CE uyumlu, güvenli tasarım'));
  }
  adv.push(t('product.advBrand', { brand: vm.brand, defaultValue: `${vm.brand} orijinal ürün` }));

  // Tekrarları ele (büyük/küçük harf duyarsız) + sınırla.
  const seen = new Set<string>();
  const advantages = adv.filter((a) => {
    const k = a.toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 14);

  return { intro, advantages };
}

/** Üreticinin desc'i gerçek bir açıklama paragrafı mı (kuru "mm (W×D×H)…" değil)? */
export function isProseDesc(desc: string | null | undefined): boolean {
  if (!desc) return false;
  const s = desc.trim();
  if (s.length < 50) return false;
  if (/^\s*mm\s*\(/i.test(s)) return false; // Diamond'ın kuru ölçü satırı
  return s.split(/\s+/).length >= 8;
}
