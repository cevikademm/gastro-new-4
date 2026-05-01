import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, ArrowRight, Clock, TrendingUp, Package, Tag, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import type { DiamondProduct } from '../stores/diamondStore';

const POPULAR = ['Kombi Fırın', 'Soğutucu Dolap', 'Fritöz', 'Bulaşık Makinesi', 'Blast Chiller'];
const RECENT_KEY = 'gastro.search.recent';

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function pushRecent(q: string) {
  if (!q.trim()) return;
  const list = [q, ...getRecent().filter((x) => x !== q)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export default function SearchCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiamondProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery(''); setResults([]); setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(results.length - 1, i + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
      if (e.key === 'Enter' && results[activeIdx]) {
        pushRecent(query);
        navigate(`/product/${results[activeIdx].id}`);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, activeIdx, query, navigate, onClose]);

  useEffect(() => {
    if (!query.trim() || !supabase) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('diamond_products')
          .select('id,name,image_big,image_thumb,price_catalog,price_promo,price_display,product_family_name,currency,stock')
          .or(`name.ilike.%${query}%,product_family_name.ilike.%${query}%`)
          .eq('is_old', false)
          .limit(8);
        if (!cancelled) setResults((data || []) as DiamondProduct[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const suggestions = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => r.product_family_name && set.add(r.product_family_name));
    return Array.from(set).slice(0, 4);
  }, [results]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100">
            <Search size={20} className="text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
              placeholder={t('search.placeholder', 'Ürün, kategori, marka ara...')}
              className="flex-1 outline-none text-slate-900 placeholder:text-slate-400"
            />
            {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
            <kbd className="hidden sm:inline-block text-[10px] px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200">ESC</kbd>
            <button onClick={onClose} className="sm:hidden text-slate-400"><X size={18} /></button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!query && (
              <div className="p-5 space-y-5">
                {recent.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock size={12} /> Son Aramalar
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <button key={r} onClick={() => setQuery(r)}
                          className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full">
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <TrendingUp size={12} /> Popüler
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR.map((p) => (
                      <button key={p} onClick={() => setQuery(p)}
                        className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-[#7B1F26] rounded-full font-medium">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {query && !loading && results.length === 0 && (
              <div className="p-10 text-center">
                <Package className="text-slate-300 mx-auto mb-3" size={48} />
                <p className="text-slate-500 font-medium">Sonuç bulunamadı</p>
                <p className="text-xs text-slate-400 mt-1">Farklı anahtar kelime deneyin</p>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="p-3 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-1">Kategoriler</p>
                {suggestions.map((s) => (
                  <button key={s} onClick={() => { navigate('/diamond'); onClose(); }}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                    <Tag size={14} className="text-slate-400" /> {s}
                  </button>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className="p-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase px-3 pt-2 pb-1">Ürünler</p>
                {results.map((r, i) => {
                  const price = r.price_promo ?? r.price_display ?? r.price_catalog ?? 0;
                  return (
                    <button
                      key={r.id}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => { pushRecent(query); navigate(`/product/${r.id}`); onClose(); }}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition ${
                        activeIdx === i ? 'bg-red-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        {(r.image_thumb || r.image_big) && (
                          <img src={r.image_thumb || r.image_big} alt="" className="w-full h-full object-contain" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                        <p className="text-xs text-slate-500 truncate">{r.product_family_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#7B1F26]">{price.toLocaleString('tr-TR')} €</p>
                      </div>
                      <ArrowRight size={14} className={activeIdx === i ? 'text-[#7B1F26]' : 'text-slate-300'} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 flex items-center gap-4">
            <span>↑↓ Gezin</span>
            <span>↵ Aç</span>
            <span>ESC Kapat</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
