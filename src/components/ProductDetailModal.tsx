import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ShoppingCart, Check, Loader2, Ruler, FolderPlus, Box, Boxes,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProductDetailStore, type ProductSource } from '../stores/productDetailStore';
import { useCartStore } from '../stores/cartStore';
import { useProjectStore } from '../stores/projectStore';
import { useEquipmentStore } from '../stores/equipmentStore';
import Model3DViewer, { has3DModel } from './Model3DViewer';

const TABLE: Record<ProductSource, string> = {
  diamond: 'diamond_products',
  combisteel: 'combisteel_products',
  handi: 'handi_products',
};

const fmtPrice = (p: number | null) =>
  p && p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

const n = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : null;
};

interface VM {
  source: ProductSource;
  id: string;
  brand: string;
  name: string;
  desc: string;
  images: string[];
  price: number | null;
  promo: number | null;
  stockLabel: string;
  inStock: boolean;
  l: number | null; w: number | null; h: number | null; depth: number | null; weight: number | null;
  category: string | null;
  specs: { label: string; value: string }[];
  cart: any;
}

function normalize(source: ProductSource, r: any): VM {
  if (source === 'diamond') {
    const images = [r.image_big, r.image_full, r.image_thumb].filter(Boolean);
    const stockN = n(r.stock);
    const specs: { label: string; value: string }[] = [];
    if (r.electric_power_kw) specs.push({ label: 'Güç', value: `${r.electric_power_kw} kW` });
    if (r.electric_connection) specs.push({ label: 'Bağlantı', value: String(r.electric_connection) });
    if (r.kcal_power) specs.push({ label: 'Isıl güç', value: `${r.kcal_power} kcal` });
    if (r.vapor) specs.push({ label: 'Buhar', value: String(r.vapor) });
    if (r.volume_m3) specs.push({ label: 'Hacim', value: `${r.volume_m3} m³` });
    if (r.product_range_id) specs.push({ label: 'Seri', value: String(r.product_range_id) });
    return {
      source, id: r.id, brand: 'Diamond', name: r.name || r.id, desc: r.description_tech_spec || '',
      images, price: n(r.price_catalog), promo: n(r.price_promo),
      stockLabel: stockN && stockN > 0 ? `Stokta` : (r.stock ? 'Sınırlı' : 'Stok yok'),
      inStock: !!(r.stock && r.stock !== '0'),
      l: n(r.length_mm), w: n(r.width_mm), h: n(r.height_mm), depth: null, weight: n(r.weight),
      category: r.product_family_name || null, specs,
      cart: {
        id: r.id, name: r.name, desc: r.description_tech_spec || '', cat: r.product_family_name || 'other',
        sub: r.product_subfamily_id || '', fam: r.product_family_name || '', brand: 'Diamond', line: '',
        l: n(r.length_mm) || 0, w: n(r.width_mm) || 0, h: String(r.height_mm || 0), kw: n(r.electric_power_kw) || 0,
        price: n(r.price_catalog) || 0, img: images[0] || '', url: images[0] || '',
      },
    };
  }
  if (source === 'combisteel') {
    const images = [r.image_url, ...((Array.isArray(r.extra_images) ? r.extra_images : []))].filter(Boolean);
    const specs = (Array.isArray(r.tech_specs) ? r.tech_specs : [])
      .filter((s: any) => s?.name && s?.value)
      .slice(0, 14)
      .map((s: any) => ({ label: String(s.name), value: `${s.value}${s.unit ? ' ' + s.unit : ''}` }));
    if (r.ean) specs.push({ label: 'EAN', value: String(r.ean) });
    return {
      source, id: r.id, brand: r.brand || 'CombiSteel', name: r.title || r.description || r.id,
      desc: r.long_description || r.description || '', images, price: n(r.price), promo: null,
      stockLabel: (n(r.stock) || 0) > 0 ? `Stokta (${n(r.stock)})` : 'Stok yok',
      inStock: (n(r.stock) || 0) > 0,
      l: n(r.length_mm), w: n(r.width_mm), h: n(r.height_mm), depth: n(r.depth_mm), weight: n(r.gross_weight),
      category: r.category_name || null, specs,
      cart: {
        id: r.sku || r.id, name: r.title || r.description, desc: r.description || '', cat: r.category_name || 'other',
        sub: '', fam: r.category_name || '', brand: r.brand || 'CombiSteel', line: r.product_type || '',
        l: n(r.length_mm) || n(r.width_mm) || 0, w: n(r.depth_mm) || n(r.width_mm) || 0,
        h: String(r.height_mm || 0), kw: 0, price: n(r.price) || 0, img: r.image_url || '', url: r.image_url || '',
      },
    };
  }
  // handi
  const images = [r.image_url].filter(Boolean);
  const specs: { label: string; value: string }[] = [];
  if (r.sub_category) specs.push({ label: 'Alt kategori', value: String(r.sub_category) });
  if (r.colour) specs.push({ label: 'Renk', value: String(r.colour) });
  if (r.material) specs.push({ label: 'Malzeme', value: String(r.material) });
  if (r.ean) specs.push({ label: 'EAN', value: String(r.ean) });
  return {
    source, id: r.id, brand: r.brand || 'HENDI', name: r.name || r.id,
    desc: r.short_desc || r.description || '', images, price: n(r.price), promo: null,
    stockLabel: (n(r.stock) || 0) > 0 ? `Stokta (${n(r.stock)})` : 'Stok yok',
    inStock: (n(r.stock) || 0) > 0,
    l: n(r.length_mm), w: n(r.width_mm), h: n(r.height_mm), depth: null, weight: n(r.net_weight) || n(r.gross_weight),
    category: r.category_name || null, specs,
    cart: {
      id: r.id, name: r.name, desc: r.short_desc || r.description || '', cat: r.category_name || 'other',
      sub: r.sub_category || '', fam: '', brand: r.brand || 'HENDI', line: 'HENDI',
      l: n(r.length_mm) || 0, w: n(r.width_mm) || 0, h: String(r.height_mm || 0), kw: 0,
      price: n(r.price) || 0, img: r.image_url || '', url: r.image_url || '',
    },
  };
}

export default function ProductDetailModal() {
  const current = useProductDetailStore((s) => s.current);
  const close = useProductDetailStore((s) => s.close);
  const navigate = useNavigate();
  const { addItem, isInCart } = useCartStore();
  const projects = useProjectStore((s) => s.projects);
  const setFloorPlanItem = useEquipmentStore((s) => s.setFloorPlanItem);

  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [pickProject, setPickProject] = useState(false);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    if (!current) return;
    setRow(null); setError(null); setImgIdx(0); setPickProject(false); setShow3D(false);
    if (!supabase) { setError('Supabase yapılandırılmamış'); return; }
    let cancelled = false;
    setLoading(true);
    supabase
      .from(TABLE[current.source])
      .select('*')
      .eq('id', current.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else if (!data) setError('Ürün bulunamadı');
        else setRow(data);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [current]);

  // ESC ile kapat
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, close]);

  const vm = useMemo<VM | null>(() => (current && row ? normalize(current.source, row) : null), [current, row]);

  if (!current) return null;

  const activeProjects = projects.filter((p) => p.status !== 'complete');
  const dims = vm ? [
    vm.l != null && { k: 'G', v: `${Math.round(vm.l)} mm` },
    vm.w != null && { k: 'D', v: `${Math.round(vm.w)} mm` },
    vm.h != null && { k: 'Y', v: `${Math.round(vm.h)} mm` },
    vm.depth != null && { k: 'Derinlik', v: `${Math.round(vm.depth)} mm` },
    vm.weight != null && { k: 'Ağırlık', v: `${vm.weight} kg` },
  ].filter(Boolean) as { k: string; v: string }[] : [];

  const can3D = vm?.source === 'diamond' && has3DModel(vm.id);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 md:p-6" onClick={close}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 h-12 bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white shrink-0">
          <span className="text-xs font-black uppercase tracking-widest opacity-90">{vm?.brand || current.source}</span>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-white/20"><X size={18} /></button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20"><Loader2 size={26} className="animate-spin text-[#DC2626]" /></div>
        )}
        {error && !loading && (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        )}

        {vm && !loading && (
          <div className="overflow-y-auto">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Galeri */}
              <div className="bg-gradient-to-b from-slate-50 to-white p-5 flex flex-col items-center justify-center">
                <div className="w-full h-64 flex items-center justify-center">
                  {vm.images[imgIdx] ? (
                    <img src={vm.images[imgIdx]} alt={vm.name} className="max-h-64 max-w-full object-contain" />
                  ) : (
                    <Box size={64} className="text-slate-200" />
                  )}
                </div>
                {vm.images.length > 1 && (
                  <div className="flex gap-2 mt-3 flex-wrap justify-center">
                    {vm.images.slice(0, 6).map((img, i) => (
                      <button key={i} onClick={() => setImgIdx(i)} className={`w-12 h-12 rounded-lg border-2 overflow-hidden bg-white ${i === imgIdx ? 'border-[#DC2626]' : 'border-slate-200'}`}>
                        <img src={img} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
                {can3D && (
                  <button onClick={() => setShow3D(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">
                    <Boxes size={14} /> 3D Görüntüle
                  </button>
                )}
              </div>

              {/* Bilgi */}
              <div className="p-5 flex flex-col">
                {vm.category && <p className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider">{vm.category}</p>}
                <h2 className="text-lg font-black text-slate-800 leading-snug mt-1">{vm.name}</h2>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{vm.id}</p>

                <div className="flex items-end gap-3 mt-3">
                  <span className="text-2xl font-black text-slate-900">{fmtPrice(vm.promo && vm.promo > 0 ? vm.promo : vm.price)}</span>
                  {vm.promo && vm.promo > 0 && vm.price && (
                    <span className="text-sm text-slate-400 line-through mb-0.5">{fmtPrice(vm.price)}</span>
                  )}
                  <span className={`mb-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${vm.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{vm.stockLabel}</span>
                </div>

                {vm.desc && <p className="text-xs text-slate-500 leading-relaxed mt-3 line-clamp-4">{vm.desc}</p>}

                {/* Ölçüler */}
                {dims.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Ruler size={11} /> Ölçüler</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dims.map((d) => (
                        <span key={d.k} className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600"><b className="text-slate-400 font-bold">{d.k}</b> {d.v}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teknik özellikler */}
                {vm.specs.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teknik Özellikler</p>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      {vm.specs.map((s, i) => (
                        <div key={i} className={`flex justify-between gap-3 px-3 py-1.5 text-[11px] ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                          <span className="text-slate-500">{s.label}</span>
                          <span className="text-slate-800 font-medium text-right">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aksiyonlar */}
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={() => addItem(vm.cart)}
                    className={`w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all ${isInCart(vm.cart.id) ? 'bg-emerald-100 text-emerald-700' : 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'}`}
                  >
                    {isInCart(vm.cart.id) ? <><Check size={16} /> Sepette</> : <><ShoppingCart size={16} /> Sepete ekle</>}
                  </button>

                  {!pickProject ? (
                    <button
                      onClick={() => setPickProject(true)}
                      className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold bg-white text-slate-700 border border-slate-200 hover:border-[#DC2626]/40 hover:text-[#DC2626] transition-all"
                    >
                      <FolderPlus size={16} /> Projeye ekle
                    </button>
                  ) : (
                    <div className="rounded-xl border border-slate-200 p-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">Hangi projeye?</p>
                      {activeProjects.length === 0 ? (
                        <p className="text-xs text-slate-400 px-1 py-2">Aktif proje yok. Önce bir proje oluşturun.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {activeProjects.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => { setFloorPlanItem(vm.id); close(); navigate(`/projects/${p.id}/design`); }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-[#DC2626] transition-colors"
                            >
                              {p.name || p.id}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3D (Diamond) — Model3DViewer kendi tam-ekran modal'ını çizer */}
      {show3D && vm && (
        <Model3DViewer productId={vm.id} productName={vm.name} onClose={() => setShow3D(false)} />
      )}
    </div>
  );
}
