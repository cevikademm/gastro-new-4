/**
 * ProductPage — /produkt/{slug}: SEO ürün sayfası.
 * Gövde = ProductDetailBody (drawer ile AYNI bileşen, CLAUDE.md tek-detay kuralı).
 * Veri: product_seo (slug → kaynak) + kaynak tablo satırı (zengin VM).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import SEO from '../../components/SEO';
import NotFoundPage from '../NotFoundPage';
import Breadcrumbs from '../../components/seo/Breadcrumbs';
import ProductSeoCard from '../../components/seo/ProductSeoCard';
import Model3DViewer from '../../components/Model3DViewer';
import { ProductDetailBody, ProductDetailActions, useAccessoriesAndRelated } from '../../components/ProductDetailDrawer';
import { useLocalePath } from '../../lib/useLocalePath';
import { supabase } from '../../lib/supabase';
import { useEquipmentStore, type EquipmentItem } from '../../stores/equipmentStore';
import { normalizeRow, vmFromEquipment, TABLE, type VM } from '../../lib/productDetailVM';
import { fetchProductBySlug, fetchProductList, productSeoToEquipment, equipmentIdFor, type ProductSeoCardRow } from '../../lib/productSeoAdapter';
import { productTitle, productDescription, productJsonLd, productCrumbs } from '../../seo/model/pages';
import { findCategory } from '../../content/seo/categoryTree.de';
import { findBrand } from '../../content/seo/brands.de';
import type { ProductSeoRow } from '../../seo/types';

export default function ProductPage() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { slug = '' } = useParams<{ slug: string }>();
  const allItems = useEquipmentStore((s) => s.allItems);
  const [seo, setSeo] = useState<ProductSeoRow | null | undefined>(undefined);
  const [row, setRow] = useState<any | null>(null);
  const [related, setRelated] = useState<ProductSeoCardRow[]>([]);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    let alive = true;
    setSeo(undefined); setRow(null); setRelated([]);
    (async () => {
      const p = await fetchProductBySlug(slug);
      if (!alive) return;
      setSeo(p);
      if (!p) return;
      if (supabase) {
        const { data } = await supabase.from(TABLE[p.source]).select('*').eq('id', p.source_id).limit(1).maybeSingle();
        if (alive && data) setRow(data);
      }
      if (p.category_slug) {
        const r = await fetchProductList({ category: p.category_slug, subcategory: p.subcategory_slug || undefined, perPage: 9 });
        if (alive) setRelated(r.rows.filter((x) => x.slug !== p.slug).slice(0, 8));
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [slug]);

  const vm = useMemo<VM | null>(() => {
    if (!seo) return null;
    if (row) return normalizeRow(seo.source, row);
    return vmFromEquipment(productSeoToEquipment(seo));
  }, [seo, row]);

  const localItem = useMemo<EquipmentItem | null>(() => {
    if (!seo) return null;
    return allItems.find((i) => i.id === equipmentIdFor(seo)) ?? (vm ? vm.cart : null);
  }, [seo, allItems, vm]);
  const { accessories, related: relatedLocal, catId } = useAccessoriesAndRelated(localItem, allItems);
  const openFromItem = useEquipmentStoreOpen();

  if (seo === undefined) return <div className="py-32 grid place-items-center"><Loader2 className="animate-spin text-brand-red" /></div>;
  if (!seo || !vm) return <NotFoundPage />;

  const crumbs = productCrumbs(seo).map((c, i, arr) => (i === 0 ? { ...c, name: t('seo.home', 'Startseite') } : i === arr.length - 1 ? { ...c, name: seo.name_de } : c));
  const cat = seo.category_slug ? findCategory(seo.category_slug) : undefined;
  const brand = findBrand(seo.brand_slug);

  return (
    <>
      <SEO
        title={productTitle(seo)}
        rawTitle
        description={productDescription(seo)}
        type="product"
        image={seo.image || undefined}
        noindex={!seo.indexable}
        jsonLd={productJsonLd(seo, productCrumbs(seo))}
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-6">
        <Breadcrumbs items={crumbs} dark={false} />
      </div>
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-10 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <ProductDetailBody
            vm={vm}
            catId={catId}
            accessories={accessories}
            related={relatedLocal}
            onOpenItem={openFromItem}
            onShow3D={vm.can3D ? () => setShow3D(true) : undefined}
            variant="page"
          />
        </div>
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-[120px] p-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <ProductDetailActions vm={vm} shareUrl={typeof window !== 'undefined' ? `${window.location.origin}${lp(`/produkt/${seo.slug}`)}` : undefined} />
            <ul className="mt-5 space-y-2 text-[12px] text-slate-600">
              <li>• {t('seo.serviceNet', 'Netto-Preis für Gewerbekunden, B2B-Rechnung mit ausgewiesener MwSt.')}</li>
              <li>• {t('seo.serviceDelivery', 'Lieferung per Paket oder Spedition frei Bordsteinkante; in NRW mit Vertragen und Aufstellung.')}</li>
              <li>• {t('seo.serviceLeasing', 'Leasing und Mietkauf auf Anfrage.')}</li>
              <li>• <Link to="/3d-design" className="text-brand-red font-bold">{t('seo.servicePlanner', 'Passt das Gerät in Ihre Küche? Im 3D-Küchenplaner prüfen.')}</Link></li>
            </ul>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
          <h2 className="text-xl font-display font-black text-[#0F2440] mb-4">{t('product.relatedProducts', 'Ähnliche Produkte')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{related.map((p) => <ProductSeoCard key={`${p.source}-${p.source_id}`} p={p} />)}</div>
        </section>
      )}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12 text-sm text-slate-600 flex flex-wrap gap-4">
        {cat && <Link to={lp(`/${cat.slug}`)} className="font-bold text-brand-red hover:underline">{t('seo.allIn', 'Alle')} {cat.name} →</Link>}
        {brand && <Link to={lp(`/marke/${brand.slug}`)} className="font-bold text-brand-red hover:underline">{t('seo.allFrom', 'Alle Produkte von')} {brand.name} →</Link>}
      </section>

      {show3D && vm.can3D && <Model3DViewer productId={vm.id} productName={vm.name} onClose={() => setShow3D(false)} />}
    </>
  );
}

/** Aksesuar/benzer ürün mini kartından global drawer'ı aç. */
function useEquipmentStoreOpen() {
  // ProductDetailDrawer store'u — döngüsel import olmaması için burada lazy alınır
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useProductDetailStore } = require('../../stores/productDetailStore') as typeof import('../../stores/productDetailStore');
  return useProductDetailStore((s) => s.openFromItem);
}
