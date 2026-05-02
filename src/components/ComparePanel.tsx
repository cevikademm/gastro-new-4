import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompareStore, type CompareItem } from '../stores/compareStore';
import { useUIStore } from '../stores/uiStore';
import { X, GitCompareArrows, Trash2, Package, Diamond, Box, ChevronDown } from 'lucide-react';

function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (error || !src) return <div className={`bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center ${className}`}><Package size={20} className="text-slate-300" /></div>;
  return <img src={src} alt={alt} onError={() => setError(true)} className={`object-contain ${className}`} />;
}

const COMPARE_ROWS: { labelKey: string; key: string; render: (p: CompareItem) => string; bestMode?: 'min' | 'max' }[] = [
  { labelKey: 'compare.source', key: 'source', render: p => p.source === 'diamond' ? 'Diamond EU' : 'CombiSteel' },
  { labelKey: 'compare.brand', key: 'brand', render: p => p.brand || '—' },
  { labelKey: 'compare.category', key: 'category', render: p => p.category || '—' },
  { labelKey: 'compare.price', key: 'price', render: p => p.price && p.price > 0 ? `€${p.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—', bestMode: 'min' },
  { labelKey: 'compare.promoPrice', key: 'promo', render: p => p.promoPrice && p.promoPrice > 0 ? `€${p.promoPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—' },
  { labelKey: 'compare.stock', key: 'stock', render: p => { const s = p.stock; return s != null && s !== '' && s !== '0' && s !== 0 ? String(s) : '—'; } },
  { labelKey: 'compare.width', key: 'width', render: p => p.width_mm ? `${p.width_mm} mm` : '—' },
  { labelKey: 'compare.height', key: 'height', render: p => p.height_mm ? `${p.height_mm} mm` : '—' },
  { labelKey: 'compare.depth', key: 'depth', render: p => p.depth_mm ? `${p.depth_mm} mm` : '—' },
  { labelKey: 'compare.length', key: 'length', render: p => p.length_mm ? `${p.length_mm} mm` : '—' },
  { labelKey: 'compare.weight', key: 'weight', render: p => p.weight ? `${p.weight} kg` : '—' },
  { labelKey: 'compare.electric', key: 'kw', render: p => p.kw && Number(p.kw) > 0 ? `${p.kw} kW` : '—' },
  { labelKey: 'compare.connection', key: 'connection', render: p => p.connection || '—' },
];

const SOURCE_COLORS = {
  diamond: { bg: 'from-[#E85D26] to-[#C44A1A]', badge: 'bg-red-100 text-[#E85D26]', icon: Diamond },
  combisteel: { bg: 'from-[#0F2440] to-[#1E3A5F]', badge: 'bg-blue-50 text-[#0F2440]', icon: Box },
};

export default function ComparePanel() {
  const { t } = useTranslation();
  const { items, showPanel, removeItem, clear, setShowPanel } = useCompareStore();
  const showPromo = useUIStore(s => s.showPromoProducts);
  const [filterSource, setFilterSource] = useState<'all' | 'diamond' | 'combisteel'>('all');

  if (items.length === 0) return null;

  const filteredItems = filterSource === 'all' ? items : items.filter(i => i.source === filterSource);
  const hasMixed = new Set(items.map(i => i.source)).size > 1;

  // Floating bar
  if (!showPanel) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-lg border border-red-200 shadow-2xl shadow-red-100/50 rounded-2xl px-5 py-3 flex items-center gap-3 max-w-[90vw]">
        <div className="flex -space-x-2.5">
          {items.slice(0, 6).map(item => {
            const colors = SOURCE_COLORS[item.source];
            return (
              <div key={item.id} className={`w-10 h-10 rounded-xl border-2 border-white bg-slate-50 overflow-hidden shadow-sm relative`}>
                <ProductImage src={item.image} alt="" className="w-full h-full" />
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.bg}`} />
              </div>
            );
          })}
        </div>
        <div className="text-xs">
          <p className="font-bold text-on-surface">{t('compare.productsSelected', { count: items.length })}</p>
          <p className="text-slate-400">
            {hasMixed && <>
              <span className="text-[#E85D26]">{items.filter(i => i.source === 'diamond').length} Diamond</span>
              {' + '}
              <span className="text-[#0F2440]">{items.filter(i => i.source === 'combisteel').length} CombiSteel</span>
            </>}
            {!hasMixed && `${6 - items.length} ${t('common.moreCanBeAdded')}`}
          </p>
        </div>
        <button
          onClick={() => setShowPanel(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#E85D26] to-[#C44A1A] text-white shadow-lg hover:shadow-xl transition-all"
        >
          <GitCompareArrows size={14} /> {t('compare.compare')}
        </button>
        <button onClick={clear} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  // Full comparison modal
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowPanel(false)}>
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#E85D26] via-[#C44A1A] to-[#0F2440] px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2"><GitCompareArrows size={20} className="text-white" /></div>
            <div>
              <h3 className="text-white font-bold text-lg">{t('compare.title')}</h3>
              <p className="text-white/70 text-xs">
                {t('compare.productsSelected', { count: items.length })}
                {hasMixed && ` — ${t('compare.crossBrand')}`}
              </p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            {/* Source filter tabs */}
            {hasMixed && (
              <div className="flex bg-white/10 rounded-lg p-0.5 mr-2">
                {(['all', 'diamond', 'combisteel'] as const).map(src => (
                  <button
                    key={src}
                    onClick={() => setFilterSource(src)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                      filterSource === src ? 'bg-white text-[#E85D26] shadow-sm' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {src === 'all' ? t('common.all') : src === 'diamond' ? 'Diamond' : 'CombiSteel'}
                  </button>
                ))}
              </div>
            )}
            <button onClick={clear} className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl" title={t('compare.clearAll')}>
              <Trash2 size={16} />
            </button>
            <button onClick={() => setShowPanel(false)} className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[72vh]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="sticky left-0 bg-white w-32 p-4 z-10" />
                {filteredItems.map(item => {
                  const colors = SOURCE_COLORS[item.source];
                  const Icon = colors.icon;
                  return (
                    <th key={item.id} className="p-4 min-w-[190px] max-w-[220px] text-center align-top">
                      <div className="relative group">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white z-10"
                        >
                          <X size={12} />
                        </button>
                        {/* Source badge */}
                        <span className={`inline-flex items-center gap-1 ${colors.badge} text-[9px] font-bold px-2 py-0.5 rounded-full mb-2`}>
                          <Icon size={10} /> {item.source === 'diamond' ? 'Diamond' : 'CombiSteel'}
                        </span>
                        <div className={`bg-gradient-to-br from-slate-50 ${item.source === 'diamond' ? 'to-red-50' : 'to-blue-50'} rounded-2xl p-3 mb-3`}>
                          <ProductImage src={item.image} alt={item.name} className="w-24 h-24 mx-auto" />
                        </div>
                        <p className={`text-[10px] font-mono ${item.source === 'diamond' ? 'text-[#E85D26]/60' : 'text-[#0F2440]/60'}`}>{item.sku}</p>
                        <p className="text-xs font-bold text-on-surface mt-1 line-clamp-2 leading-snug">{item.name}</p>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.filter(row => showPromo || row.key !== 'promo').map((row, ri) => {
                // Find best value for highlighting
                let bestIds: string[] = [];
                if (row.bestMode === 'min') {
                  const prices = filteredItems.filter(i => i.price != null && i.price > 0).map(i => ({ id: i.id, val: i.price! }));
                  if (prices.length > 1) {
                    const minVal = Math.min(...prices.map(p => p.val));
                    bestIds = prices.filter(p => p.val === minVal).map(p => p.id);
                  }
                }

                return (
                  <tr key={row.key} className={ri % 2 === 0 ? 'bg-slate-50/50' : ''}>
                    <td className="sticky left-0 bg-inherit px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap z-10">{t(row.labelKey)}</td>
                    {filteredItems.map(item => {
                      const val = row.render(item);
                      const isBest = bestIds.includes(item.id);
                      return (
                        <td key={item.id} className={`px-4 py-3 text-xs text-center font-medium ${isBest ? 'text-emerald-600 font-bold bg-emerald-50/50' : 'text-on-surface'}`}>
                          {row.key === 'source' ? (
                            <span className={`inline-flex items-center gap-1 ${SOURCE_COLORS[item.source].badge} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                              {val}
                            </span>
                          ) : val}
                          {isBest && <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{t('common.cheapest')}</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
