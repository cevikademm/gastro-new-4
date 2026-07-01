import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Diamond, Box, Package } from 'lucide-react';
import DiamondPage from '../diamond/DiamondPage';
import CombiSteelPage from '../combisteel/CombiSteelPage';
import HendiPage from '../handi/HendiPage';
import AllProductsGrid from './AllProductsGrid';

/**
 * Ürünler — tüm marka kataloglarını TEK panelde birleştirir.
 * Veri katmanı ayrı kalır (her marka kendi Supabase tablosundan beslenir);
 * "Tümü" sekmesi all_products VIEW ile hepsini toplu gösterir.
 * `?tab=all|diamond|combisteel|handi` ile derin link.
 */
type Tab = 'all' | 'diamond' | 'combisteel' | 'handi';

const TABS: { id: Tab; label: string; Icon: typeof Diamond }[] = [
  { id: 'all', label: 'Tümü', Icon: LayoutGrid },
  { id: 'diamond', label: 'Diamond', Icon: Diamond },
  { id: 'combisteel', label: 'CombiSteel', Icon: Box },
  { id: 'handi', label: 'HENDI', Icon: Package },
];

const isTab = (v: string | null): v is Tab =>
  v === 'all' || v === 'diamond' || v === 'combisteel' || v === 'handi';

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'all');

  const select = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-4">
      {/* Marka sekmeleri — tek "Ürünler" paneli */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mr-1">
          Ürünler
        </span>
        <div className="inline-flex flex-wrap bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-0.5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => select(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === id ? 'bg-[#DC2626] text-white shadow-sm' : 'text-slate-500 hover:text-[#DC2626]'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Aktif görünüm */}
      {tab === 'all' && <AllProductsGrid />}
      {tab === 'diamond' && <DiamondPage />}
      {tab === 'combisteel' && <CombiSteelPage />}
      {tab === 'handi' && <HendiPage />}
      {/* Detay penceresi App kökünde global mount edilir (ProductDetailDrawer). */}
    </div>
  );
}
