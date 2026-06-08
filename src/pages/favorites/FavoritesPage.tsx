import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Check, ArrowRight } from 'lucide-react';
import { useEquipmentStore } from '../../stores/equipmentStore';
import { useCartStore } from '../../stores/cartStore';

export default function FavoritesPage() {
  const favorites = useEquipmentStore((s) => s.favorites);
  const getFavoriteItems = useEquipmentStore((s) => s.getFavoriteItems);
  const toggleFavorite = useEquipmentStore((s) => s.toggleFavorite);
  const { addItem, removeItem, isInCart } = useCartStore();

  // favorites is in the dep path so this recomputes when the list changes
  const items = favorites.length ? getFavoriteItems() : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 text-left">
      <div className="mb-8 flex flex-col gap-2 border-b border-slate-200 pb-6">
        <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase">
          <Heart size={13} className="fill-brand-red text-brand-red" />
          Favoriler
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2440] tracking-tight">
          Gemerkte Geräte
          {items.length > 0 && (
            <span className="ml-2 align-middle text-sm font-bold text-slate-400">({items.length})</span>
          )}
        </h1>
        <p className="text-sm text-slate-500">
          Deine gemerkten Produkte — direkt ins Angebot legen oder Projekt anfragen.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
            <Heart size={22} className="text-slate-300" />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-[#0F2440]">Noch keine Favoriten</p>
            <p className="mt-1 text-sm text-slate-500">Markiere Geräte mit dem Herz, um sie hier zu sammeln.</p>
          </div>
          <Link
            to="/kategori"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-red px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-all hover:bg-[#B91C1C]"
          >
            Produkte entdecken
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((prod) => {
            const added = isInCart(prod.id);
            return (
              <div
                key={prod.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-brand-red/40 hover:shadow-[0_12px_28px_rgba(220,38,38,0.07)]"
              >
                <button
                  onClick={() => toggleFavorite(prod.id)}
                  aria-label="Favori kaldır"
                  className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 border border-slate-200 text-brand-red shadow-sm transition-all hover:bg-brand-red hover:text-white"
                >
                  <Heart size={14} className="fill-current" />
                </button>

                <div className="flex h-36 sm:h-44 items-center justify-center overflow-hidden border-b border-slate-100 bg-white p-3">
                  <img
                    src={prod.img}
                    alt={prod.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex flex-1 flex-col p-3.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-red">{prod.sub}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{prod.brand}</span>
                  </div>
                  <h3 className="mb-2 min-h-[32px] text-[12px] sm:text-[13px] font-bold leading-snug text-[#0F2440] line-clamp-2 group-hover:text-brand-red transition-colors">
                    {prod.name}
                  </h3>

                  <div className="mt-auto">
                    <div className="mb-2 flex items-baseline gap-1.5">
                      <span className="font-display text-lg font-black text-[#0F2440]">
                        € {prod.price.toLocaleString('de-DE')}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400">net</span>
                    </div>
                    <button
                      onClick={() => (added ? removeItem(prod.id) : addItem(prod))}
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] transition-colors ${
                        added
                          ? 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'border-brand-red bg-brand-red text-white hover:bg-[#B91C1C]'
                      }`}
                    >
                      {added ? <Check size={12} /> : <ShoppingCart size={12} />}
                      {added ? 'Im Angebot' : 'Zum Angebot'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
