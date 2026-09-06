/**
 * ProductSeoCard — product_seo satırından ürün kartı.
 * <a href="/produkt/{slug}"> tarayıcılar/orta tık için gerçek sayfa; normal tıkta
 * global ProductDetailDrawer açılır (CLAUDE.md: tek detay bileşeni).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, ShoppingCart } from 'lucide-react';
import { useLocalePath } from '../../lib/useLocalePath';
import { useProductDetailStore } from '../../stores/productDetailStore';
import { productSeoToEquipment, type ProductSeoCardRow } from '../../lib/productSeoAdapter';

export default function ProductSeoCard({ p }: { p: ProductSeoCardRow }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const open = useProductDetailStore((s) => s.open);
  const [imgErr, setImgErr] = useState(false);
  const href = lp(`/produkt/${p.slug}`);
  const price = p.price_net && p.price_net > 0
    ? `${p.price_net.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
    : null;

  const onClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // yeni sekme
    e.preventDefault();
    open(p.source, p.source_id, productSeoToEquipment(p));
  };

  return (
    <a href={href} onClick={onClick} className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-brand-red/40 hover:shadow-lg transition-all">
      <div className="aspect-square bg-gradient-to-b from-slate-50 to-white grid place-items-center p-4 overflow-hidden">
        {p.image && !imgErr
          ? <img src={p.image} alt={p.name_de} loading="lazy" decoding="async" width={300} height={300} onError={() => setImgErr(true)} className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105" />
          : <Package size={40} className="text-slate-300" />}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-red">{p.brand}</span>
        <h3 className="text-sm font-bold text-[#0F2440] leading-snug line-clamp-2 min-h-[2.5rem]">{p.name_de}</h3>
        <span className="text-[11px] text-slate-400 font-mono">{p.sku}</span>
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            {price
              ? <><span className="text-lg font-display font-black text-[#0F2440]">{price}</span><span className="block text-[10px] text-slate-500">{t('seo.netPrice', 'netto zzgl. MwSt.')}</span></>
              : <span className="text-sm font-bold text-slate-500">{t('product.priceOnRequest', 'Preis auf Anfrage')}</span>}
          </div>
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-[#0F2440] text-white group-hover:bg-brand-red transition-colors"><ShoppingCart size={16} /></span>
        </div>
      </div>
    </a>
  );
}
