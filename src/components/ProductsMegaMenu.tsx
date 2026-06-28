import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../stores/equipmentStore';
import { CategoryIcon, type CategoryKey } from './icons/CategoryIcon';

/**
 * Diamond-Europe tarzı ürün kategori mega-menüsü.
 * Navbar'daki "ÜRÜNLER" öğesine tıklanınca / üzerine gelince açılır.
 * Her satır: ikon + kategori adı + ürün sayısı + chevron → /magaza?cat=<id>.
 */

// equipmentStore kategori id'si → CategoryIcon anahtarı
const ICON_FOR: Record<string, CategoryKey> = {
  cooking: 'cooking',
  cooling: 'cooling',
  dishwash: 'washing',
  prep_hygiene: 'prep',
  self_service: 'service',
  pizza_pasta: 'oven',
  dynamic_prep: 'prep',
  cook_chill: 'cooling',
  ventilation: 'ventilation',
  bakery: 'oven',
  trolley_gn: 'storage',
  coffee_tea: 'beverage',
  laundry: 'washing',
  ice_cream: 'cooling',
  hospitality: 'service',
  cleaning_products: 'washing',
};

interface Props {
  onClose: () => void;
}

export function ProductsMegaMenu({ onClose }: Props) {
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="w-[min(46rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_60px_-24px_rgba(15,36,64,0.45)]"
      role="menu"
    >
      {/* Başlık şeridi */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-black tracking-tight text-brand-red">ÜRÜNLER</span>
          <span className="text-[11px] font-medium text-slate-400">Tüm kategoriler</span>
        </div>
        <button
          type="button"
          onClick={() => go('/magaza')}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2440] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-brand-red"
        >
          Tüm Ürünler
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* İki sütunlu kategori listesi */}
      <div className="grid grid-cols-1 gap-0.5 p-2 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => go(`/magaza?cat=${cat.id}`)}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-brand-red/[0.06]"
            role="menuitem"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-brand-red transition-colors group-hover:border-brand-red/30 group-hover:bg-brand-red/5">
              <CategoryIcon category={ICON_FOR[cat.id] ?? 'other'} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-[#0F2440] transition-colors group-hover:text-brand-red">
                {cat.name}
              </span>
              {cat.count > 0 && (
                <span className="block text-[10px] font-medium text-slate-400">{cat.count} ürün</span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-red" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
