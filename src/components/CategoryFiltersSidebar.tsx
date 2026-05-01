import type React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, X, ChevronDown, RotateCcw, Zap, Tag, Flame, Euro } from 'lucide-react';
import { useDiamondStore } from '../stores/diamondStore';

interface Props {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function CategoryFiltersSidebar({ mobileOpen, onMobileClose }: Props) {
  const { filters, categories, setFilter, resetFilters, totalCount } = useDiamondStore();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true, family: true, status: true, power: false,
  });

  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const uniqueFamilies = Array.from(
    new Set(categories.map((c) => c.product_family_name).filter(Boolean))
  ).slice(0, 20);

  const content = (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#7B1F26]" />
          <h3 className="font-bold text-slate-900">Filtreler</h3>
          <span className="text-xs text-slate-400">({totalCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
            <RotateCcw size={12} /> Sıfırla
          </button>
          {onMobileClose && (
            <button onClick={onMobileClose} className="lg:hidden text-slate-400">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Price */}
      <Section title="Fiyat (€)" icon={Euro} open={openSections.price} onToggle={() => toggle('price')}>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ''}
            onChange={(e) => setFilter('minPrice', +e.target.value || 0)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice || ''}
            onChange={(e) => setFilter('maxPrice', +e.target.value || 0)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm"
          />
        </div>
      </Section>

      {/* Family */}
      <Section title="Ürün Ailesi" icon={Tag} open={openSections.family} onToggle={() => toggle('family')}>
        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
          <FamilyOption label="Tümü" active={!filters.family} onClick={() => setFilter('family', '')} />
          {uniqueFamilies.map((f) => (
            <FamilyOption key={f} label={f} active={filters.family === f} onClick={() => setFilter('family', f)} />
          ))}
        </div>
      </Section>

      {/* Status */}
      <Section title="Durum" icon={Flame} open={openSections.status} onToggle={() => toggle('status')}>
        <Check label="Sadece indirimli"
          checked={filters.promoOnly} onChange={(v) => setFilter('promoOnly', v)} />
        <Check label="Sadece yeni ürünler"
          checked={filters.newOnly} onChange={(v) => setFilter('newOnly', v)} />
        <Check label="Stokta olanlar"
          checked={filters.inStockOnly} onChange={(v) => setFilter('inStockOnly', v)} />
      </Section>

      {/* Power */}
      <Section title="Elektrik Gücü (kW)" icon={Zap} open={openSections.power} onToggle={() => toggle('power')}>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minKw || ''}
            onChange={(e) => setFilter('minKw', +e.target.value || 0)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxKw || ''}
            onChange={(e) => setFilter('maxKw', +e.target.value || 0)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm"
          />
        </div>
      </Section>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden h-fit sticky top-20">
        {content}
      </aside>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 flex items-end"
            onClick={onMobileClose}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[85vh] bg-white rounded-t-3xl overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />
              {content}
              <div className="sticky bottom-0 bg-white p-4 border-t border-slate-100">
                <button
                  onClick={onMobileClose}
                  className="w-full h-12 rounded-xl bg-[#7B1F26] text-white font-bold"
                >
                  {totalCount} Ürünü Göster
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Section({
  title, icon: Icon, open, onToggle, children,
}: { title: string; icon: any; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FamilyOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition ${
        active ? 'bg-red-50 text-[#7B1F26] font-semibold' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#7B1F26] rounded"
      />
      <span className="text-sm text-slate-600">{label}</span>
    </label>
  );
}
