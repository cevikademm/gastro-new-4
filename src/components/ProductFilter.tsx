import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, X, ChevronDown, RotateCcw, Heart,
  Zap, Ruler, Euro, Package, Sliders, Check,
  Trash2, Save, Download, Upload, Clock, DollarSign,
} from 'lucide-react';

export interface FilterState {
  search: string;
  categories: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  minKw: number;
  maxKw: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  minDepth: number;
  maxDepth: number;
  powerType: 'all' | 'electric' | 'gas' | 'none';
  inStock: boolean;
  sortBy: 'name' | 'price_low' | 'price_high' | 'power' | 'newest';
  savedPresets: SavedPreset[];
}

interface SavedPreset {
  id: string;
  name: string;
  filters: Partial<FilterState>;
  createdAt: number;
}

interface ProductFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  categories: string[];
  brands: string[];
  onClearAll: () => void;
  resultCount: number;
  maxPrice?: number;
  maxKw?: number;
}

const STORAGE_KEY = 'product_filter_presets';

export default function ProductFilter({
  filters,
  onFilterChange,
  categories,
  brands,
  onClearAll,
  resultCount,
  maxPrice = 10000,
  maxKw = 50,
}: ProductFilterProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSavedPresets(JSON.parse(saved));
    }
  }, []);

  // Save presets to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets));
  }, [savedPresets]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search ||
      filters.categories.length > 0 ||
      filters.brands.length > 0 ||
      filters.minPrice > 0 ||
      filters.maxPrice > 0 ||
      filters.minKw > 0 ||
      filters.maxKw > 0 ||
      filters.minWidth > 0 ||
      filters.maxWidth > 0 ||
      filters.minHeight > 0 ||
      filters.maxHeight > 0 ||
      filters.minDepth > 0 ||
      filters.maxDepth > 0 ||
      filters.powerType !== 'all' ||
      filters.inStock
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories.length > 0) count++;
    if (filters.brands.length > 0) count++;
    if (filters.minPrice > 0 || filters.maxPrice > 0) count++;
    if (filters.minKw > 0 || filters.maxKw > 0) count++;
    if (filters.minWidth > 0 || filters.maxWidth > 0 ||
        filters.minHeight > 0 || filters.maxHeight > 0 ||
        filters.minDepth > 0 || filters.maxDepth > 0) count++;
    if (filters.powerType !== 'all') count++;
    if (filters.inStock) count++;
    return count;
  }, [filters]);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: { ...filters },
      createdAt: Date.now(),
    };
    setSavedPresets([newPreset, ...savedPresets]);
    setPresetName('');
    setShowSavePreset(false);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    onFilterChange({ ...filters, ...preset.filters });
  };

  const handleDeletePreset = (presetId: string) => {
    setSavedPresets(savedPresets.filter(p => p.id !== presetId));
  };

  const handleCategoryToggle = (category: string) => {
    const updated = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: updated });
  };

  const handleBrandToggle = (brand: string) => {
    const updated = filters.brands.includes(brand)
      ? filters.brands.filter(b => b !== brand)
      : [...filters.brands, brand];
    onFilterChange({ ...filters, brands: updated });
  };

  return (
    <div className="space-y-4">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
            isOpen || hasActiveFilters
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-200'
          }`}
        >
          <Sliders size={16} />
          {t('filter.filters')} {activeFilterCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 px-3 py-2 text-xs text-red-600 font-bold hover:text-red-800 transition-colors"
          >
            <RotateCcw size={14} /> {t('common.clear')}
          </button>
        )}
      </div>

      {/* Result Count */}
      <div className="text-xs font-medium text-slate-600">
        <span className="text-indigo-600 font-bold">{resultCount}</span> {t('filter.productsFound')}
      </div>

      {/* Filter Panel */}
      {isOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-sm animate-in slide-in-from-top-2">

          {/* Search */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
              <Search size={13} /> {t('filter.searchProducts')}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder={t('filter.searchPlaceholder')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">
                {t('filter.categories')}
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryToggle(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      filters.categories.includes(cat)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    {filters.categories.includes(cat) && <Check size={12} />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brands */}
          {brands.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">
                {t('filter.brands')}
              </label>
              <div className="flex flex-wrap gap-2">
                {brands.slice(0, 12).map(brand => (
                  <button
                    key={brand}
                    onClick={() => handleBrandToggle(brand)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      filters.brands.includes(brand)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    {filters.brands.includes(brand) && <Check size={12} />}
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 block flex items-center gap-1.5">
              <Euro size={13} /> {t('filter.priceRange')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                <input
                  type="number"
                  min={0}
                  value={filters.minPrice || ''}
                  onChange={(e) => onFilterChange({ ...filters, minPrice: Number(e.target.value) || 0 })}
                  placeholder={t('filter.minimum')}
                  className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice || ''}
                  onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) || 0 })}
                  placeholder={t('filter.maximum')}
                  className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Power (kW) Range */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 block flex items-center gap-1.5">
              <Zap size={13} /> {t('filter.powerRange')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={filters.minKw || ''}
                  onChange={(e) => onFilterChange({ ...filters, minKw: Number(e.target.value) || 0 })}
                  placeholder={t('filter.minKw')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={filters.maxKw || ''}
                  onChange={(e) => onFilterChange({ ...filters, maxKw: Number(e.target.value) || 0 })}
                  placeholder={t('filter.maxKw')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 block flex items-center gap-1.5">
              <Ruler size={13} /> {t('filter.dimensions')}
            </label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={filters.minWidth || ''}
                  onChange={(e) => onFilterChange({ ...filters, minWidth: Number(e.target.value) || 0 })}
                  placeholder={t('filter.minWidth')}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={filters.maxWidth || ''}
                  onChange={(e) => onFilterChange({ ...filters, maxWidth: Number(e.target.value) || 0 })}
                  placeholder={t('filter.maxWidth')}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">{t('filter.height')}</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={filters.minHeight || ''}
                  onChange={(e) => onFilterChange({ ...filters, minHeight: Number(e.target.value) || 0 })}
                  placeholder={t('filter.minHeight')}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={filters.maxHeight || ''}
                  onChange={(e) => onFilterChange({ ...filters, maxHeight: Number(e.target.value) || 0 })}
                  placeholder={t('filter.maxHeight')}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">{t('filter.depth')}</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={filters.minDepth || ''}
                  onChange={(e) => onFilterChange({ ...filters, minDepth: Number(e.target.value) || 0 })}
                  placeholder={t('filter.minDepth')}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={filters.maxDepth || ''}
                  onChange={(e) => onFilterChange({ ...filters, maxDepth: Number(e.target.value) || 0 })}
                  placeholder={t('filter.maxDepth')}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Power Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
              <Zap size={13} /> {t('filter.powerType')}
            </label>
            <div className="flex gap-2">
              {(['all', 'electric', 'gas', 'none'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => onFilterChange({ ...filters, powerType: type })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filters.powerType === type
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {t(`filter.powerType_${type}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Status */}
          <div>
            <button
              onClick={() => onFilterChange({ ...filters, inStock: !filters.inStock })}
              className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                filters.inStock
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-emerald-50'
              }`}
            >
              {filters.inStock && <Check size={14} />}
              <Package size={14} /> {t('filter.inStock')}
            </button>
          </div>

          {/* Sort Options */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block">
              {t('filter.sortBy')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'name', label: t('filter.sort_name') },
                { key: 'price_low', label: t('filter.sort_priceLow') },
                { key: 'price_high', label: t('filter.sort_priceHigh') },
                { key: 'power', label: t('filter.sort_power') },
                { key: 'newest', label: t('filter.sort_newest') },
              ].map(sort => (
                <button
                  key={sort.key}
                  onClick={() => onFilterChange({ ...filters, sortBy: sort.key as any })}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    filters.sortBy === sort.key
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200" />

          {/* Saved Presets */}
          {savedPresets.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                <Clock size={13} /> {t('filter.savedPresets')}
              </label>
              <div className="space-y-1.5">
                {savedPresets.map(preset => (
                  <div key={preset.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all text-left truncate"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                      title={t('common.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save as Preset */}
          {!showSavePreset ? (
            <button
              onClick={() => setShowSavePreset(true)}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <Save size={14} /> {t('filter.saveAsPreset')}
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('filter.presetName')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => { setShowSavePreset(false); setPresetName(''); }}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
