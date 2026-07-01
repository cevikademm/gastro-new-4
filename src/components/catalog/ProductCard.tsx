/**
 * ProductCard — katalog ürün kartının TEK kaynağı (Diamond tasarımı).
 * Tüm marka gridleri (Tümü / Diamond / CombiSteel / HENDI) bu sunum bileşenini
 * kullanır; veri/handler'lar grid'de kalır, kart yalnız çizer → görsel bütünlük.
 *
 * Marka farkı sadece VERİDE: kod/kW/ölçü/rozet varsa görünür, yoksa o slot
 * atlanır ama hizalama (min-h, flex-1) korunur.
 */
import { useState } from 'react';
import { Package, GitCompareArrows, Zap, MapPin, Box } from 'lucide-react';
import CartQuantityButton from '../CartQuantityButton';
import type { EquipmentItem } from '../../stores/equipmentStore';

export interface ProductCardBadges {
  /** "YENİ" (emerald) */
  new?: string;
  /** "Kampanyalı" (amber) */
  deal?: string;
  /** "Promo" (kırmızı) */
  promo?: string;
  /** "Stokta" (emerald) */
  stock?: string;
}

export interface ProductCardProps {
  /** Küçük marka çipi (Diamond / CombiSteel / HENDI …). */
  brand?: string;
  /** Kırmızı üst satır: ürün kodu / SKU. */
  code?: string;
  codeMono?: boolean;
  name: string;
  /** Gri alt satır: family / marka / kategori. */
  subtitle?: string;
  price: number | null;
  pricePromo?: number | null;
  /** Spec çipi — kW (öncelikli). */
  kw?: number;
  /** Spec çipi — kW yoksa ölçü metni ("1000×1100 mm"). */
  dims?: string;
  imageUrl?: string;
  badges?: ProductCardBadges;
  has3D?: boolean;
  inCompare: boolean;
  /** CartQuantityButton için sepet öğesi. */
  cartProduct: EquipmentItem;
  formatPrice: (n: number | null) => string;
  onOpenDetail: () => void;
  onToggleCompare: () => void;
  /** Verilmezse aksiyon satırı yalnız sepet butonundan oluşur. */
  onFloorPlan?: () => void;
  /** has3D true iken çizilir. */
  on3D?: () => void;
  floorPlanTitle?: string;
  compareTitle?: string;
}

function CardImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div className="w-full h-32 bg-surface-container-highest flex items-center justify-center">
        <Package size={32} className="text-on-surface-variant/30" />
      </div>
    );
  }
  return (
    <div className="relative w-full h-32 group-hover:scale-105 transition-transform duration-300">
      {loading && (
        <div className="absolute inset-0 bg-surface-container-highest flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => { setError(true); setLoading(false); }}
        onLoad={() => setLoading(false)}
        className={`w-full h-full object-contain transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}

export default function ProductCard({
  brand, code, codeMono = true, name, subtitle, price, pricePromo,
  kw, dims, imageUrl, badges, has3D, inCompare, cartProduct, formatPrice,
  onOpenDetail, onToggleCompare, onFloorPlan, on3D,
  floorPlanTitle = 'Kat Planına Ekle', compareTitle = 'Karşılaştır',
}: ProductCardProps) {
  const hasPromo = (pricePromo ?? 0) > 0;
  const hasBadge = !!(badges?.new || badges?.deal || badges?.promo || badges?.stock);

  return (
    <div
      onClick={onOpenDetail}
      className={`bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative flex flex-col ${inCompare ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200/80'}`}
    >
      {/* Rozetler (sol-üst) */}
      {hasBadge && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {badges?.new && <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{badges.new}</span>}
          {badges?.deal && <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{badges.deal}</span>}
          {badges?.promo && <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{badges.promo}</span>}
          {badges?.stock && <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{badges.stock}</span>}
        </div>
      )}

      {/* Karşılaştır (sağ-üst) */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
        title={compareTitle}
        aria-pressed={inCompare}
        className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${inCompare ? 'bg-violet-500 border-violet-500 text-white' : 'bg-white/80 border-slate-300 text-transparent opacity-0 group-hover:opacity-100'}`}
      >
        {inCompare && <GitCompareArrows size={12} />}
      </button>

      {/* Görsel + opsiyonel 3D */}
      <div className="bg-gradient-to-b from-slate-50/50 to-white p-2 pt-4 relative">
        <CardImage src={imageUrl} alt={name} />
        {has3D && on3D && (
          <button
            onClick={(e) => { e.stopPropagation(); on3D(); }}
            className="absolute bottom-1 right-1 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-[#DC2626] text-white text-[9px] font-black uppercase tracking-wider shadow-md hover:bg-[#991B1B] transition-all"
            title="3D"
          >
            <Box size={10} /> 3D
          </button>
        )}
      </div>

      {/* Bilgi */}
      <div className="p-3 pt-2 flex flex-col flex-1">
        {/* Marka çipi + ürün kodu */}
        {(brand || code) && (
          <div className="flex items-center justify-between gap-2 min-h-[16px]">
            {brand ? (
              <span className="bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded truncate max-w-[62%]">{brand}</span>
            ) : <span />}
            {code && (
              <span className={`text-[9px] text-[#A04654] truncate ${codeMono ? 'font-mono tracking-wide' : 'font-bold uppercase tracking-wider'}`}>{code}</span>
            )}
          </div>
        )}
        <h3 className="text-[11px] font-bold text-on-surface mt-1 line-clamp-2 leading-snug min-h-[2rem]">{name}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>}
        {dims && <p className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">{dims}</p>}

        <div className="flex items-end justify-between mt-auto pt-2 border-t border-slate-100/80">
          <div>
            {hasPromo ? (
              <>
                <p className="text-[9px] text-slate-400 line-through">{formatPrice(price)}</p>
                <p className="text-base font-black text-red-600 tracking-tight">{formatPrice(pricePromo!)}</p>
              </>
            ) : (
              <p className="text-base font-black text-[#DC2626] tracking-tight">{formatPrice(price)}</p>
            )}
          </div>
          {kw && kw > 0 ? (
            <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md"><Zap size={9} />{kw}kW</span>
          ) : null}
        </div>

        {/* Aksiyonlar */}
        <div className="flex gap-1.5 mt-2.5">
          <CartQuantityButton product={cartProduct as any} size="sm" className="flex-1" />
          {onFloorPlan && (
            <button
              onClick={(e) => { e.stopPropagation(); onFloorPlan(); }}
              className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
              title={floorPlanTitle}
            >
              <MapPin size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
