import { useState } from 'react';
import { CategoryIcon } from './icons/CategoryIcon';

interface Cat { name: string; count: number }
interface Props {
  categories: Cat[];
  /** '' = Tümü */
  selected: string;
  onSelect: (name: string) => void;
  /** Katlanmadan önce gösterilecek çip sayısı. */
  initial?: number;
}

/**
 * Görünür kategori çipleri (HENDI sayfasındaki stil). Kategoriler her zaman
 * pill olarak görünür: "Tümü" + ikon + ad + sayaç. Çok kategori varsa "+N daha"
 * ile genişler. Diamond / CombiSteel / HENDI sekmelerinde ortak kullanılır.
 */
export default function CategoryFilterPanel({ categories, selected, onSelect, initial = 14 }: Props) {
  const [showAll, setShowAll] = useState(false);
  if (!categories.length) return null;

  const visible = showAll ? categories : categories.slice(0, initial);
  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
      active
        ? 'bg-[#DC2626] text-white shadow-md shadow-red-200'
        : 'bg-white text-slate-500 border border-slate-200 hover:border-red-300 hover:text-[#DC2626]'
    }`;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <button type="button" onClick={() => onSelect('')} className={chip(!selected)}>
        Tümü
      </button>
      {visible.map((c) => {
        const active = selected === c.name;
        return (
          <button
            key={c.name || 'other'}
            type="button"
            onClick={() => onSelect(active ? '' : c.name)}
            className={chip(active)}
            title={c.name}
          >
            <CategoryIcon category={c.name} size={15} className="shrink-0" />
            <span className="truncate max-w-[170px]">{c.name || 'Diğer'}</span>
            <span className="opacity-50">({c.count})</span>
          </button>
        );
      })}
      {categories.length > initial && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 px-3 py-2 text-xs text-[#DC2626] font-bold hover:text-[#991B1B] transition-colors"
        >
          {showAll ? 'Daha az' : `+${categories.length - initial} daha`}
        </button>
      )}
    </div>
  );
}
