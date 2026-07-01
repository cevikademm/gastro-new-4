import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES, useEquipmentStore } from '../stores/equipmentStore';
import { getSubGroupsFor } from '../lib/categoryTaxonomy';
import { CategoryIcon, type CategoryKey } from './icons/CategoryIcon';

/**
 * Diamond/Combisteel tarzı iki panelli ürün kategori mega-menüsü.
 * Sol sütun: üst kategoriler (üzerine gelince seçilir).
 * Sağ panel: seçili kategorinin üreticiye dayalı alt-grupları (Serie 600/700/900,
 * Kombidämpfer, Vitrinen, Teigmaschinen...) → /magaza?cat=<id>&sub=<grup>.
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
  const allItems = useEquipmentStore((s) => s.allItems);

  // Yalnızca ürünü olan kategoriler
  const cats = useMemo(() => CATEGORIES.filter((c) => c.count > 0), []);
  const [activeCat, setActiveCat] = useState<string>(cats[0]?.id ?? '');

  const activeCategory = cats.find((c) => c.id === activeCat) ?? cats[0];
  const subGroups = useMemo(
    () => (activeCategory ? getSubGroupsFor(activeCategory.id, allItems) : []),
    [activeCategory, allItems],
  );

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
      className="w-[min(58rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_60px_-24px_rgba(15,36,64,0.45)]"
      role="menu"
    >
      {/* Başlık şeridi */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg font-black tracking-tight text-brand-red">ÜRÜNLER</span>
          <span className="text-[11px] font-medium text-slate-400">Kategorie &amp; Serie wählen</span>
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

      <div className="flex">
        {/* Sol: üst kategoriler */}
        <div className="w-[15.5rem] shrink-0 border-r border-slate-100 bg-slate-50/40 p-2">
          <div className="max-h-[26rem] space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {cats.map((cat) => {
              const isActive = cat.id === activeCategory?.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onMouseEnter={() => setActiveCat(cat.id)}
                  onFocus={() => setActiveCat(cat.id)}
                  onClick={() => go(`/magaza?cat=${cat.id}`)}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    isActive ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70'
                  }`}
                  role="menuitem"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors ${
                      isActive
                        ? 'border-brand-red/30 bg-brand-red/5 text-brand-red'
                        : 'border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-500'
                    }`}
                  >
                    <CategoryIcon category={ICON_FOR[cat.id] ?? 'other'} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[13px] font-bold ${
                        isActive ? 'text-brand-red' : 'text-[#0F2440]'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">{cat.count}</span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-brand-red' : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Sağ: seçili kategorinin alt-grupları */}
        <div className="min-w-0 flex-1 p-3">
          {activeCategory && (
            <>
              <button
                type="button"
                onClick={() => go(`/magaza?cat=${activeCategory.id}`)}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-brand-red/[0.06]"
              >
                <span className="text-[12px] font-black uppercase tracking-[0.1em] text-[#0F2440]">
                  Alle {activeCategory.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-red">
                  Ansehen <ArrowRight className="h-3 w-3" />
                </span>
              </button>

              {subGroups.length > 0 ? (
                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                  {subGroups.map((sg) => (
                    <button
                      key={sg.id}
                      type="button"
                      onClick={() => go(`/magaza?cat=${activeCategory.id}&sub=${encodeURIComponent(sg.id)}`)}
                      className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-brand-red/[0.06]"
                      role="menuitem"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700 transition-colors group-hover:text-brand-red">
                        {sg.label}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">{sg.count}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-red" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2.5 py-6 text-center text-[12px] text-slate-400">
                  {activeCategory.count} Produkte — alle anzeigen
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
