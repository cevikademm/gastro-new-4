import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, ShoppingCart, Heart, GitCompare, FileDown, Minus, Plus,
  Zap, Ruler, Package, CheckCircle2, AlertCircle, Star, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import type { DiamondProduct } from '../../stores/diamondStore';
import { useCartStore } from '../../stores/cartStore';
import { useCompareStore, equipmentToCompareItem } from '../../stores/compareStore';
import { useEquipmentStore } from '../../stores/equipmentStore';
import { getCompatibleAccessories } from '../../lib/categoryTaxonomy';
import { diamondToEquipment, parseGallery, getStockLabel } from '../../lib/diamondAdapter';
import SEO from '../../components/SEO';
import ReviewWidget from '../../components/ReviewWidget';
import { breadcrumbSchema, productSchema } from '../../lib/seo';

type TabKey = 'specs' | 'tech' | 'reviews' | 'qna';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [product, setProduct] = useState<DiamondProduct | null>(null);
  const [related, setRelated] = useState<DiamondProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<TabKey>('specs');
  const [fav, setFav] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const cartQty = useCartStore((s) =>
    s.items.find((i) => i.product.id === id)?.quantity ?? 0
  );
  const compareAdd = useCompareStore((s: any) => s.addItem);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id || !supabase) { setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const { data, error } = await supabase
          .from('diamond_products').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!active) return;
        setProduct(data as DiamondProduct | null);
        if (data) {
          const { data: rel } = await supabase
            .from('diamond_products')
            .select('*')
            .eq('product_family_name', (data as any).product_family_name)
            .neq('id', id)
            .limit(8);
          if (active) setRelated((rel || []) as DiamondProduct[]);
        }
      } catch (e: any) {
        if (active) setError(e.message || t('common.loadFailed', 'Yüklenemedi'));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const list = [product.image_big, product.image_full, ...parseGallery(product.image_gallery)]
      .filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [product]);

  // Bu cihaza uyumlu aksesuarlar (aynı seri + tip) — katalogda gizli, burada görünür.
  const allEquip = useEquipmentStore((s) => s.allItems);
  const accessories = useMemo(() => {
    if (!product) return [];
    const local = allEquip.find((i) => i.id === String(product.id));
    return getCompatibleAccessories(local, allEquip, 18);
  }, [product, allEquip]);

  const stock = getStockLabel(product?.stock);
  const price = product?.price_promo ?? product?.price_display ?? product?.price_catalog ?? 0;
  const hasPromo = !!product?.price_promo && product.price_promo < (product.price_catalog ?? Infinity);

  const handleAdd = () => {
    if (!product) return;
    addItem(diamondToEquipment(product), qty);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">{t('common.loading', 'Yükleniyor...')}</div>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <p className="text-slate-600">{error || t('product.notFound', 'Ürün bulunamadı')}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-brand-red text-white rounded-lg">
          {t('common.back', 'Geri')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 lg:pb-8">
      <SEO
        title={`${product.name} — ${product.product_family_name}`}
        description={(product as any).description_short || t('product.seoDescription', '{{name}}. Diamond kalitesinde profesyonel endüstriyel mutfak ekipmanı. 2MC Gastro güvencesiyle.', { name: product.name })}
        image={product.image_big || undefined}
        type="product"
        jsonLd={[
          breadcrumbSchema([
            { name: t('nav.home', 'Anasayfa'), url: '/' },
            { name: 'Diamond', url: '/diamond' },
            { name: product.product_family_name || t('product.breadcrumbProducts', 'Ürünler'), url: '/diamond' },
            { name: product.name, url: `/product/${product.id}` },
          ]),
          productSchema({
            name: product.name,
            description: (product as any).description_short || product.name,
            image: [product.image_big, product.image_full].filter(Boolean) as string[],
            sku: String(product.id),
            brand: 'Diamond',
            price: price > 0 ? price : undefined,
            currency: 'EUR',
            availability: stock.tone === 'ok' ? 'InStock' : stock.tone === 'out' ? 'OutOfStock' : 'PreOrder',
            url: `/product/${product.id}`,
            rating: { value: 4.8, count: 24 },
          }),
        ]}
      />
      {/* Breadcrumb */}
      <nav className="max-w-7xl mx-auto px-4 pt-6 text-sm text-slate-500 flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-brand-red">{t('nav.home', 'Anasayfa')}</Link>
        <ChevronRight size={14} />
        <Link to="/diamond" className="hover:text-brand-red">Diamond</Link>
        <ChevronRight size={14} />
        <span className="text-slate-700 truncate max-w-[200px]">{product.product_family_name}</span>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium truncate">{product.name}</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Gallery */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden group">
              {gallery[galleryIdx] ? (
                <motion.img
                  key={gallery[galleryIdx]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={gallery[galleryIdx]}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package size={80} />
                </div>
              )}
              {product.is_new && (
                <span className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t('product.badgeNewCaps', 'YENİ')}
                </span>
              )}
              {hasPromo && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {t('product.badgeDiscount', 'İNDİRİM')}
                </span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {gallery.slice(0, 5).map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setGalleryIdx(i)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                      i === galleryIdx ? 'border-brand-red' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-contain bg-slate-50" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info + CTA */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-brand-red uppercase tracking-wider">
                  {product.product_family_name}
                </p>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">{product.name}</h1>
                <p className="text-xs text-slate-400 mt-1">{t('product.sku', 'SKU')}: {product.id}</p>
              </div>
              <button
                onClick={() => setFav((v) => !v)}
                className={`p-2 rounded-full border transition ${
                  fav ? 'bg-red-50 border-red-200 text-red-500' : 'border-slate-200 text-slate-400 hover:text-red-500'
                }`}
                aria-label={t('product.favorite', 'Favori')}
              >
                <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Rating mock */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} fill="currentColor" />)}
              </div>
              <span className="text-xs text-slate-500">{t('product.ratingSummary', '{{rating}} ({{count}} yorum)', { rating: 4.8, count: 24 })}</span>
            </div>

            {/* Price */}
            <div className="mt-5 pb-5 border-b border-slate-100">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-slate-900">
                  {price.toLocaleString('tr-TR')} {product.currency || '€'}
                </span>
                {hasPromo && (
                  <span className="text-lg text-slate-400 line-through">
                    {product.price_catalog?.toLocaleString('tr-TR')} {product.currency || '€'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{t('product.vatFreeShipping', 'KDV dahil · Ücretsiz kargo')}</p>
            </div>

            {/* Stock */}
            <div className="mt-4 flex items-center gap-2">
              {stock.tone === 'ok' && <CheckCircle2 size={16} className="text-emerald-500" />}
              {stock.tone === 'low' && <AlertCircle size={16} className="text-amber-500" />}
              {stock.tone === 'out' && <AlertCircle size={16} className="text-red-500" />}
              <span className={`text-sm font-semibold ${
                stock.tone === 'ok' ? 'text-emerald-600' :
                stock.tone === 'low' ? 'text-amber-600' : 'text-red-600'
              }`}>{stock.label}</span>
              {product.restock_info && (
                <span className="text-xs text-slate-400">· {product.restock_info}</span>
              )}
            </div>

            {/* Quick specs */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {product.electric_power_kw && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap size={14} className="text-amber-500" />
                  {product.electric_power_kw} kW
                </div>
              )}
              {(product.length_mm || product.width_mm || product.height_mm) && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Ruler size={14} className="text-brand-red" />
                  {product.length_mm}×{product.width_mm}×{product.height_mm} mm
                </div>
              )}
            </div>

            {/* Qty + Add */}
            <div className="mt-6 flex items-center gap-3">
              <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-12 flex items-center justify-center hover:bg-slate-100"
                ><Minus size={16} /></button>
                <span className="w-12 text-center font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-12 flex items-center justify-center hover:bg-slate-100"
                ><Plus size={16} /></button>
              </div>
              <button
                onClick={handleAdd}
                disabled={stock.tone === 'out'}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-brand-red to-[#991B1B] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30 hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={18} />
                {cartQty > 0 ? `${t('cart.inCart', 'Sepette')} (${cartQty})` : t('cart.addToCart', 'Sepete Ekle')}
              </button>
            </div>

            {/* Secondary actions */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => compareAdd?.(equipmentToCompareItem(diamondToEquipment(product)))}
                className="h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <GitCompare size={14} /> {t('product.compare', 'Karşılaştır')}
              </button>
              <button
                onClick={() => window.print()}
                className="h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <FileDown size={14} /> PDF
              </button>
            </div>
          </div>

          {/* Trust badges */}
          <div className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-3 gap-2 text-center">
            <div><div className="text-xs font-bold text-slate-900">{t('product.trustFreeTitle', 'Ücretsiz')}</div><div className="text-[10px] text-slate-500">{t('product.trustFreeSub', 'Kargo')}</div></div>
            <div><div className="text-xs font-bold text-slate-900">{t('product.trustReturnTitle', '30 Gün')}</div><div className="text-[10px] text-slate-500">{t('product.trustReturnSub', 'İade')}</div></div>
            <div><div className="text-xs font-bold text-slate-900">{t('product.trustSupportTitle', '24/7')}</div><div className="text-[10px] text-slate-500">{t('nav.support', 'Destek')}</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 flex overflow-x-auto">
            {([
              ['specs', t('product.tabSpecs', 'Özellikler')],
              ['tech', t('product.tabTech', 'Teknik Spec')],
              ['reviews', t('product.tabReviews', 'Yorumlar')],
              ['qna', t('product.tabQna', 'Sorular')],
            ] as [TabKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                  tab === k ? 'border-brand-red text-brand-red' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >{label}</button>
            ))}
          </div>
          <div className="p-6 text-sm text-slate-600 leading-relaxed min-h-[200px]">
            {tab === 'specs' && (
              <div className="prose prose-slate max-w-none">
                <p>{product.description_tech_spec || t('product.noSpec', 'Açıklama yok.')}</p>
                {product.popup_info && <p className="mt-3 text-slate-500">{product.popup_info}</p>}
              </div>
            )}
            {tab === 'tech' && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {([
                  [t('product.power', 'Güç'), product.electric_power_kw ? `${product.electric_power_kw} kW` : null],
                  [t('product.connection', 'Bağlantı'), product.electric_connection],
                  [t('product.length', 'Uzunluk'), product.length_mm ? `${product.length_mm} mm` : null],
                  [t('product.width', 'Genişlik'), product.width_mm ? `${product.width_mm} mm` : null],
                  [t('product.height', 'Yükseklik'), product.height_mm ? `${product.height_mm} mm` : null],
                  [t('product.weight', 'Ağırlık'), product.weight ? `${product.weight} ${product.weight_unit}` : null],
                  [t('product.volume', 'Hacim'), product.volume_m3 ? `${product.volume_m3} m³` : null],
                  [t('product.vapor', 'Buhar'), product.vapor],
                  [t('product.category', 'Kategori'), product.product_family_name],
                ] as [string, any][]).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-100">
                    <dt className="font-medium text-slate-500">{k}</dt>
                    <dd className="text-slate-900 font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {tab === 'reviews' && (
              <div className="text-center py-8 text-slate-400">
                {t('product.noReviews', 'Henüz yorum yok. İlk siz yazın!')}
              </div>
            )}
            {tab === 'qna' && (
              <div className="text-center py-8 text-slate-400">
                {t('product.noQuestions', 'Henüz soru yok.')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Passendes Zubehör — bu sisteme/seriye uyumlu aksesuarlar (katalogda gizli) */}
      {accessories.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">{t('product.compatibleAccessories', 'Uyumlu Aksesuarlar')}</h2>
          <p className="text-sm text-slate-500 mb-4">
            {t('product.compatibleAccessoriesDesc', 'Bu sisteme uygun sepetler, parçalar ve GN aksesuarları')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {accessories.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition group flex flex-col"
              >
                <Link to={`/product/${a.id}`} className="block">
                  <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden mb-2">
                    {a.img ? (
                      <img
                        src={a.img}
                        alt={a.name}
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={28} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 line-clamp-2 min-h-[2rem]">{a.name}</p>
                </Link>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-sm font-bold text-brand-red">
                    {a.price > 0 ? `${a.price.toLocaleString('de-DE')} €` : '—'}
                  </span>
                  <button
                    onClick={() => addItem(a, 1)}
                    className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#0F2440] text-white hover:bg-brand-red transition inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> {t('cart.add', 'Sepet')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            {t('product.related', 'Birlikte alınır')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                to={`/product/${r.id}`}
                className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition group"
              >
                <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden mb-2">
                  {r.image_big && (
                    <img src={r.image_big} alt={r.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition" />
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-900 line-clamp-2">{r.name}</p>
                <p className="text-sm font-bold text-brand-red mt-1">
                  {(r.price_promo ?? r.price_display ?? r.price_catalog ?? 0).toLocaleString('tr-TR')} €
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4">
        <ReviewWidget productId={String(product.id)} />
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex items-center gap-3 z-40 shadow-2xl">
        <div className="flex-1">
          <p className="text-xs text-slate-500">{stock.label}</p>
          <p className="text-lg font-black text-slate-900">
            {price.toLocaleString('tr-TR')} {product.currency || '€'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={stock.tone === 'out'}
          className="h-12 px-6 rounded-xl bg-gradient-to-r from-brand-red to-[#991B1B] text-white font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <ShoppingCart size={18} />
          {cartQty > 0 ? `${cartQty}` : t('cart.addToCart', 'Sepete Ekle')}
        </button>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="hidden lg:block fixed top-24 left-4 z-30 p-2 bg-white rounded-full shadow-lg hover:bg-slate-50"
        aria-label={t('common.back', 'Geri')}
      >
        <ArrowLeft size={20} />
      </button>
    </div>
  );
}
