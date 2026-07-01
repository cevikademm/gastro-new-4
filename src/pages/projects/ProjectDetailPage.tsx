import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectStore, type ProductItem } from '../../stores/projectStore';
import { useAuthStore } from '../../stores/authStore';
import {
  ArrowLeft, ClipboardList, Calendar, Building,
  Plus, Trash2, Package, Flame, Droplets, Refrigerator,
  Table, Microwave, Waves, Eye, Settings2, Users, FileText, Download, Loader2,
  Box, Boxes, Sparkles, CheckCircle2, X
} from 'lucide-react';
import { meshyGenerate, getProduct3DModelsByKeys, productKeyFor, type Product3DModel } from '../../lib/meshyClient';
import { useMeshStore } from '../../stores/meshStore';
import SafeModelViewer from '../../components/SafeModelViewer';
import { buildAngebotPdf, type DocLine } from '../../lib/angebotPdf';
import { designQuoteLines, quoteLinesFromDoc, type DesignQuoteLine } from '../../lib/designQuoteLines';
import { loadBestDesign } from '../../lib/gastroDesignSync';
import { removeQuoteItemEverywhere } from '../../lib/designDelete';
import ConfirmDialog from '../../components/ConfirmDialog';

// Kat planından placedItems okuma
interface FloorPlanItem {
  id: string;
  equipmentId?: string;
  name: string;
  icon: string;
  imageData?: string;
  width: number;
  height: number;
  category: string;
  kw: number;
  price?: number;
  brand?: string;
  desc?: string;
  qty?: number;            // 2D/3D tasarımda aynı üründen kaç adet
  priceOnRequest?: boolean; // katalog fiyatı yok → "Fiyat sorulacak"
}

function getFloorPlanItems(projectId: string): FloorPlanItem[] {
  try {
    const key = `2mc-floorplan-${projectId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return data.items || [];
  } catch { return []; }
}

const ICON_MAP: Record<string, any> = {
  refrigerator: Refrigerator, flame: Flame, droplets: Droplets,
  microwave: Microwave, waves: Waves, table: Table,
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  cooking: 'projects.catCooking', cold: 'projects.catCold', cleaning: 'projects.catCleaning', neutral: 'projects.catNeutral', other: 'projects.catOther',
};

const CATEGORY_COLORS: Record<string, string> = {
  cooking: '#ef4444', cold: '#3b82f6', cleaning: '#06b6d4', neutral: '#6b7280', other: '#8b5cf6',
};

function QuoteTab({ project, floorItems, designLines, onRemove }: { project: import('../../stores/projectStore').Project; floorItems: FloorPlanItem[]; designLines: DesignQuoteLine[]; onRemove?: (key: string) => void | Promise<void> }) {
  const { t } = useTranslation();
  const { name, clientName, id } = project;
  // Nakliye oranı (% kontrolü) yalnızca adminlere görünür; PDF'te oran asla yazılmaz.
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  // Satır silme yalnızca yöneticiye açık (teklif = para belgesi; müşteri görünümünde gizli).
  const canEdit = isAdmin && !!onRemove;
  // Sil sütunu varken tabloya dar bir kolon ekle.
  const gridCols = canEdit ? '64px 1fr 80px 90px 60px 90px 36px' : '64px 1fr 80px 90px 60px 90px';
  // Modern onay penceresi (native window.confirm yerine) — geri alınamaz silme.
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  // İyimser gizleme: onay verilir verilmez satır listeden düşsün (kalıcılık
  // katmanlarının tazelenme gecikmesinden bağımsız → "silinmiyor" hissi olmasın).
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(() => new Set());
  const askRemove = (row: { id: string; name: string }) => {
    if (!onRemove) return;
    setPendingRemove({ id: row.id, name: row.name });
  };
  const confirmRemove = async () => {
    if (!pendingRemove || !onRemove) return;
    const key = pendingRemove.id;
    setRemovedKeys((prev) => new Set(prev).add(key)); // anında gizle
    setRemoving(true);
    try {
      await onRemove(key);
    } finally {
      setRemoving(false);
      setPendingRemove(null);
    }
  };

  // Teklif satırı = ProductItem + adet + "fiyat sorulacak".
  type QuoteRow = ProductItem & { qty: number; priceOnRequest: boolean };
  // Tasarım aracı (2D/3D) ekipmanı ÖNCELİKLİ; aynı catalogId floor-plan'dan tekrar eklenmez.
  const designIds = new Set(designLines.map((l) => l.catalogId));
  const designRows: QuoteRow[] = designLines.map((l) => ({
    id: l.catalogId,
    name: l.name,
    code: l.catalogId,
    category: (l.category as any) || 'other',
    icon: 'package',
    imageData: l.img,
    dimensions: { width: l.dimsCm.width, height: l.dimsCm.height, depth: l.dimsCm.depth },
    kw: l.kw,
    powerType: l.kw > 0 ? 'electric' : 'none',
    price: l.unitPrice,
    description: '',
    brand: l.brand,
    series: '',
    features: [],
    qty: l.qty,
    priceOnRequest: l.priceOnRequest,
  }));
  // Kat planı + elle eklenen ürünler (allItems) → satır (adet 1); tasarım satırının kapsadığını atla.
  const floorRows: QuoteRow[] = floorItems
    .filter((fi) => !designIds.has(fi.equipmentId || fi.id))
    .map((fi) => ({
      id: fi.equipmentId || fi.id,
      name: fi.name,
      code: fi.equipmentId || fi.id,
      category: (fi.category as any) || 'other',
      icon: fi.icon || 'package',
      imageData: fi.imageData,
      dimensions: { width: Math.round(fi.width / 10), height: Math.round(fi.height / 10), depth: 0 },
      kw: fi.kw || 0,
      powerType: fi.kw > 0 ? 'electric' : 'none',
      price: fi.price || 0,
      description: fi.desc || '',
      brand: fi.brand || '',
      series: '',
      features: [],
      qty: 1,
      priceOnRequest: false,
    }));
  const products: QuoteRow[] = [...designRows, ...floorRows].filter((p) => !removedKeys.has(p.id));
  const quoteNo = `TKF-${id.slice(-6).toUpperCase()}-${new Date().getFullYear()}`;
  const subtotal = products.reduce((sum, p) => sum + (p.priceOnRequest ? 0 : p.price * p.qty), 0);
  // Nakliye gideri (Versandkosten) — net ara toplamın %'si. Teklif bazında
  // düzenlenebilir; localStorage'da saklanır (store/şema/sync'e dokunmaz).
  const SHIP_KEY = `2mc-quote-ship:${id}`;
  const [shipRate, setShipRate] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(SHIP_KEY);
      if (raw === null) return 6;
      const v = Number(raw);
      return Number.isFinite(v) && v >= 0 ? v : 6;
    } catch { return 6; }
  });
  const setShip = (v: number) => {
    const r = Math.max(0, Math.min(100, Math.round(Number.isFinite(v) ? v : 0)));
    setShipRate(r);
    try { localStorage.setItem(SHIP_KEY, String(r)); } catch { /* ignore */ }
  };
  const shipping = subtotal * (shipRate / 100);
  const vatRate = 0.19;
  const vat = (subtotal + shipping) * vatRate; // KDV nakliye dahil
  const total = subtotal + shipping + vat;
  const fmt = (n: number) => n > 0 ? `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';
  const quoteRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const exportQuotePDF = async () => {
    // Nakliye gideri (Versandkosten) — teklif sayfasındaki orandan (shipRate)
    // türetilir: net ara toplamın %'si → son satır olarak eklenir. Çizim ortak
    // angebotPdf şablonuna devredilmiştir.
    setExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('de-DE');
      const validTo = new Date(now);
      validTo.setDate(validTo.getDate() + 30);

      const lines: DocLine[] = products.map((p, i) => {
        const sub = [
          p.code,
          p.brand,
          `${p.dimensions.width}×${p.dimensions.height} cm`,
          p.kw > 0 ? `${p.kw} kW` : '',
        ].filter(Boolean).join('  ·  ');
        return {
          pos: i + 1,
          name: p.name || '—',
          sub,
          qty: p.qty,
          unit: 'Stück',
          unitPrice: p.priceOnRequest ? null : (p.price > 0 ? p.price : null),
          imageUrl: p.imageData || null,
        };
      });
      if (shipping > 0) {
        lines.push({
          pos: lines.length + 1,
          name: 'Versandkosten', // PDF'te (müşteriye) oran YAZILMAZ
          qty: 1,
          unit: 'Pauschal',
          unitPrice: shipping,
        });
      }

      const recipient = [clientName, `Projekt: ${name}`].filter(Boolean) as string[];

      const doc = await buildAngebotPdf(
        {
          kind: 'angebot',
          number: quoteNo,
          date: dateStr,
          validUntil: validTo.toLocaleDateString('de-DE'),
          recipient,
        },
        lines,
        { vatRate },
      );

      doc.save(`Angebot_${quoteNo}_${dateStr.replace(/\./g, '-')}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert(t('projects.pdfExportError'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline font-black text-xl text-on-surface">{t('projects.quoteForm')}</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{clientName || t('projects.customer')} — {name} <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded ml-1">{quoteNo}</span></p>
        </div>
        <div className="flex items-center gap-3 self-start">
          {/* Nakliye (Versand) oranı — YALNIZCA ADMİN; forma + PDF'e canlı yansır (PDF'te oran yazılmaz). */}
          {isAdmin && (
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/40 rounded-lg pl-3 pr-2 py-1.5">
              <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">{t('projects.shipping')}</span>
              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/40 rounded-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={shipRate}
                  onChange={(e) => setShip(Number(e.target.value))}
                  className="w-12 bg-transparent text-right text-sm font-bold text-on-surface px-2 py-1 outline-none"
                  aria-label={t('projects.shippingRate')}
                />
                <span className="text-sm font-bold text-on-surface-variant pr-2">%</span>
              </div>
              <span className="text-xs font-semibold text-primary tabular-nums whitespace-nowrap min-w-[64px] text-right">{shipping > 0 ? fmt(shipping) : '—'}</span>
            </div>
          )}
          <button
            onClick={exportQuotePDF}
            disabled={exporting}
            className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-primary px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm border border-primary/20 disabled:opacity-60"
          >
            {exporting ? <><Loader2 size={16} className="animate-spin" /> {t('cart.preparing')}</> : <><Download size={16} /> {t('projects.downloadPdf')}</>}
          </button>
        </div>
      </div>

      {/* Quote Document — captured by html2canvas for PDF */}
      <div ref={quoteRef} className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative" style={{ fontFamily: 'Arial, sans-serif', '--color-primary': '#931315' } as React.CSSProperties}>
        {/* Hologram watermark — new circular logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <img
            src="/logo-icon.png"
            alt=""
            className="w-80 h-80 object-contain select-none"
            style={{ opacity: 0.1 }}
          />
        </div>

        {/* Document header with logo */}
        <div className="relative z-10 bg-primary px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-icon.png" alt="2MC" className="h-12 w-12 object-contain bg-white rounded-full p-1.5 shadow" />
            <div>
              <img src="/logo-2mc-gastro.png" alt="2MC Gastro" className="h-7 object-contain brightness-0 invert" />
              <p className="text-white/70 text-[10px] mt-0.5">{t('projects.companyTagline')}</p>
            </div>
          </div>
          <div className="text-right text-white">
            <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{t('projects.quoteNoLabel')}</p>
            <p className="font-black text-lg font-mono">{quoteNo}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{new Date().toLocaleDateString('de-DE')}</p>
          </div>
        </div>

        {/* Client info bar */}
        <div className="relative z-10 bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">{t('projects.customerLabel')}</span>
            <span className="font-bold text-slate-700">{clientName || '—'}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">{t('projects.projectLabel')}</span>
            <span className="font-bold text-slate-700">{name}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">{t('projects.quoteDate')}</span>
            <span className="font-bold text-slate-700">{new Date().toLocaleDateString('de-DE')}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">{t('projects.validity')}</span>
            <span className="font-bold text-slate-700">{t('projects.validity30Days')}</span>
          </div>
        </div>

        {/* Product list */}
        {products.length === 0 ? (
          <div className="relative z-10 py-20 text-center">
            <Package size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium">{t('projects.addProductsForQuote')}</p>
            <Link to={`/projects/${project.id}/products/add`} className="text-primary text-sm font-bold hover:underline mt-2 inline-block">
              {t('projects.addProductArrow')}
            </Link>
          </div>
        ) : (
          <div className="relative z-10">
            {/* Table header */}
            <div className="hidden sm:grid px-6 py-2.5 bg-primary/5 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-primary" style={{ gridTemplateColumns: gridCols }}>
              <div>{t('projects.colImage')}</div>
              <div>{t('common.product')}</div>
              <div>{t('projects.colDimensions')}</div>
              <div>{t('projects.colPowerType')}</div>
              <div className="text-center">{t('common.quantity')}</div>
              <div className="text-right">{t('common.price')}</div>
              {canEdit && <div></div>}
            </div>

            <div className="divide-y divide-slate-100">
              {products.map((prod, idx) => {
                const Icon = ICON_MAP[prod.icon] || Package;
                return (
                  <div key={prod.id} className={`px-4 sm:px-6 py-4 ${idx % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                    {/* Mobile */}
                    <div className="flex items-start gap-4 sm:hidden">
                      <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {prod.imageData ? (
                          <img src={prod.imageData} alt={prod.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Icon size={24} style={{ color: CATEGORY_COLORS[prod.category] }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-slate-800">{prod.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{prod.code}</p>
                        {prod.brand && <p className="text-[10px] text-slate-400">{prod.brand}</p>}
                        {prod.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{prod.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                          <span className="font-bold">{prod.dimensions.width}×{prod.dimensions.height}cm</span>
                          {prod.kw > 0 && <><span>·</span><span>{prod.kw}kW</span></>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {prod.priceOnRequest ? (
                          <p className="text-[11px] font-bold text-amber-600">{t('projects.onRequest')}</p>
                        ) : (
                          <p className="font-black text-base text-primary">{prod.price > 0 ? fmt(prod.price * prod.qty) : '—'}</p>
                        )}
                        <p className="text-[9px] text-slate-400">{t('projects.quantityLabel', { count: prod.qty })}</p>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => askRemove(prod)}
                            title={t('projects.removeFromQuote')}
                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 size={12} /> {t('common.delete')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden sm:grid items-center gap-4" style={{ gridTemplateColumns: gridCols }}>
                      <div className="w-14 h-14 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                        {prod.imageData ? (
                          <img src={prod.imageData} alt={prod.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Icon size={20} style={{ color: CATEGORY_COLORS[prod.category] }} />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-800">{prod.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{prod.code}{prod.brand ? ` · ${prod.brand}` : ''}</p>
                        {prod.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{prod.description}</p>}
                        {prod.imageData && prod.imageData.startsWith('http') && (
                          <a href={prod.imageData} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-medium mt-0.5 inline-block">{t('projects.productImageLink')}</a>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">{prod.dimensions.width}×{prod.dimensions.height}</span>
                        {prod.dimensions.depth > 0 && <span className="text-[10px] text-slate-400">×{prod.dimensions.depth}</span>}
                      </div>
                      <div className="text-sm text-slate-600">
                        {prod.kw > 0 ? <><span className="font-medium">{prod.kw} kW</span><span className="text-[10px] text-slate-400 block">{prod.powerType}</span></> : <span className="text-slate-300">—</span>}
                      </div>
                      <div className="text-center">
                        <span className="font-black text-primary text-lg">{prod.qty}</span>
                      </div>
                      <div className="text-right">
                        {prod.priceOnRequest ? (
                          <span className="text-xs font-bold text-amber-600">{t('projects.onRequest')}</span>
                        ) : prod.price > 0 ? (
                          <span className="font-black text-sm text-primary">{fmt(prod.price * prod.qty)}</span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => askRemove(prod)}
                            title={t('projects.removeFromQuoteFull')}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-200">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{t('common.subtotal')}</span>
                  <span className="font-bold">{fmt(subtotal)}</span>
                </div>
                {shipRate > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{t('projects.shippingCosts')}{isAdmin ? ` (${shipRate}%)` : ''}</span>
                    <span className="font-bold">{fmt(shipping)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{t('projects.vatWithRate')}</span>
                  <span className="font-bold">{fmt(vat)}</span>
                </div>
                <div className="flex justify-between items-center bg-primary rounded-xl px-4 py-3 mt-3">
                  <span className="font-black text-sm text-white uppercase tracking-wide">{t('projects.grandTotal')}</span>
                  <span className="font-black text-2xl text-white">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with logo */}
        <div className="relative z-10 px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="2MC" className="h-7 w-7 object-contain opacity-60" />
            <span className="text-[10px] text-slate-400">2MC Gastro · info@2mcgastro.com</span>
          </div>
          <div className="text-[10px] text-slate-400 text-right">
            {t('projects.footerValidity')}<br />{t('projects.footerPricesExclVat')}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-5">
        <h3 className="font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-3">{t('projects.notesConditions')}</h3>
        <ul className="text-xs text-on-surface-variant space-y-1.5">
          <li>• {t('projects.note1Validity')}</li>
          <li>• {t('projects.note2Prices')}</li>
          <li>• {t('projects.note3Delivery')}</li>
          <li>• {t('projects.note4Installation')}</li>
        </ul>
      </div>

      {/* Modern silme onayı (native window.confirm yerine) */}
      <ConfirmDialog
        open={!!pendingRemove}
        tone="danger"
        title={t('projects.removeFromQuoteTitle')}
        description={
          pendingRemove && (
            <>
              <span className="font-bold text-slate-700">“{pendingRemove.name}”</span> {t('projects.removeEverywhereDesc')}{' '}
              <span className="font-semibold text-rose-600">{t('projects.cannotUndo')}</span>
            </>
          )
        }
        confirmLabel={t('projects.yesDelete')}
        cancelLabel={t('projects.giveUp')}
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => { if (!removing) setPendingRemove(null); }}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects, selectedProject, selectProject, clearSelection, removeProductFromProject } = useProjectStore();
  // ?tab=quote ile (Teklifler sayfasından) doğrudan Teklif sekmesini aç.
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'quote' | 'settings'>(() => {
    const t = searchParams.get('tab');
    return t === 'quote' || t === 'products' || t === 'settings' ? t : 'overview';
  });
  const [viewProduct, setViewProduct] = useState<ProductItem | null>(null);
  const [selected3D, setSelected3D] = useState<Set<string>>(new Set());
  const [meshModalOpen, setMeshModalOpen] = useState(false);
  const [view3DModel, setView3DModel] = useState<Product3DModel | null>(null);
  const meshRows = useMeshStore(s => s.rows);
  const meshActiveKeys = useMeshStore(s => s.activeKeys);
  const setMeshRow = useMeshStore(s => s.setRow);
  const setMeshRows = useMeshStore(s => s.setRows);
  const setMeshActiveKeys = useMeshStore(s => s.setActiveKeys);

  const toggle3DSelect = (itemId: string) => {
    setSelected3D(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const startMeshGeneration = async () => {
    if (selected3D.size === 0) return;
    // Seçim ürünler sekmesindeki TÜM ürünler (kat planı + "Ürün Ekle" ile eklenen
    // store ürünleri = allItems) üzerinden yapılır. Sadece floorItems filtrelersek
    // store ürünleri eşleşmez, istek hiç gitmez ve modal boş açılırdı.
    const items = unifiedItems.filter(fi => selected3D.has(fi.id));
    const keys = items.map(fi => productKeyFor(fi.imageData, fi.equipmentId || fi.id)).filter(Boolean);
    setMeshActiveKeys(keys);
    setMeshModalOpen(true);

    const processOne = async (fi: FloorPlanItem) => {
      const key = productKeyFor(fi.imageData, fi.equipmentId || fi.id);
      if (!key) return;

      // Frontend cache check
      const cached = useMeshStore.getState().rows[key];
      if (cached && cached.status === 'done' && cached.glb_url) return;

      const imageUrl = fi.imageData && /^https?:\/\//i.test(fi.imageData) ? fi.imageData : '';
      if (!imageUrl) {
        setMeshRow({
          id: key, product_key: key, name: fi.name,
          source_image_url: fi.imageData || '',
          meshy_task_id: null, status: 'error', progress: 0,
          error: 'Ürün görseli public URL değil (base64). MeshAI için katalog görseli gerekli.',
          glb_url: null, usdz_url: null, thumbnail_url: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          finished_at: null,
        });
        return;
      }

      try {
        await meshyGenerate(
          { productKey: key, name: fi.name, imageUrl },
          (row) => setMeshRow(row),
        );
      } catch (err) {
        const raw = err instanceof Error ? err.message : 'Bilinmeyen hata';
        const friendly = /NoMorePendingTasks|\b429\b/i.test(raw)
          ? 'Meshy kuyruğu dolu (plan limiti). Diğer modeller bitince otomatik denenir — ya da meshy.ai planını yükseltin.'
          : raw;
        setMeshRow({
          id: key, product_key: key, name: fi.name,
          source_image_url: imageUrl,
          meshy_task_id: null, status: 'error', progress: 0,
          error: friendly,
          glb_url: null, usdz_url: null, thumbnail_url: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          finished_at: null,
        });
      }
    };

    // Meshy planı aynı anda sınırlı sayıda "pending" task'a izin verir (429 NoMorePendingTasks).
    // Ücretsiz/başlangıç planında bu limit genelde 1'dir; hepsini birden ateşlersek çoğu 429 yer.
    // Bu yüzden TEK TEK (sıralı) gönderiyoruz: aynı anda Meshy'de en fazla 1 task olur → 429 oluşmaz,
    // her ürün sırayla üretilir. Plan yükseltilirse bu sayı artırılıp üretim hızlandırılabilir.
    // (Ek güvence: meshyGenerate yine de 429'da kuyruk boşalana kadar bekleyip otomatik tekrar dener.)
    const MESHY_CONCURRENCY = 1;
    const queue = [...items];
    const worker = async () => {
      while (queue.length) {
        const fi = queue.shift();
        if (fi) await processOne(fi);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(MESHY_CONCURRENCY, items.length) }, worker),
    );
  };

  useEffect(() => {
    if (id) selectProject(id);
    return () => clearSelection();
  }, [id, projects]);

  const project = projects.find(p => p.id === id);

  // Teklif satırı silindiğinde türetilmiş listeleri (kat planı + tasarım) yeniden
  // okumak için sayaç — silme kaynakları (localStorage/tasarım belgesi) React
  // dışında değiştiğinden bu tick olmadan ekran güncellenmez.
  const [refreshTick, setRefreshTick] = useState(0);

  // Bir teklif satırını kaynağı ne olursa olsun HER YERDEN kaldır, sonra tazele.
  const handleRemoveQuoteItem = useCallback(async (key: string) => {
    if (!id) return;
    await removeQuoteItemEverywhere(id, key);
    setRefreshTick((t) => t + 1);
  }, [id]);

  // ── Ürünler sekmesi silme onayı (Teklif sekmesiyle aynı UX + iyimser gizleme) ──
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [pendingProductRemove, setPendingProductRemove] = useState<{ id: string; name: string } | null>(null);
  const [productRemoving, setProductRemoving] = useState(false);
  const [productRemovedKeys, setProductRemovedKeys] = useState<Set<string>>(() => new Set());
  const confirmProductRemove = async () => {
    if (!pendingProductRemove) return;
    const key = pendingProductRemove.id;
    setProductRemovedKeys((prev) => new Set(prev).add(key)); // anında gizle
    setProductRemoving(true);
    try {
      await handleRemoveQuoteItem(key);
    } finally {
      setProductRemoving(false);
      setPendingProductRemove(null);
    }
  };

  // Kat planındaki ürünleri oku
  const floorItems = useMemo(() => id ? getFloorPlanItems(id) : [], [id, activeTab, refreshTick]);

  // project.products → FloorPlanItem formatına çevir (AddProductPage'den eklenen ürünler)
  const storeProductItems: FloorPlanItem[] = useMemo(() => {
    if (!project) return [];
    return project.products.map((prod) => ({
      id: prod.id,
      equipmentId: prod.code,
      name: prod.name,
      icon: prod.icon,
      imageData: prod.imageData,
      width: (prod.dimensions?.width || 80) * 10, // cm → mm (floorplan format)
      height: (prod.dimensions?.height || 70) * 10,
      category: prod.category || 'other',
      kw: prod.kw || 0,
      price: prod.price || 0,
      brand: prod.brand || '',
      desc: prod.description || '',
    }));
  }, [project?.products]);

  // Birleşik ürün listesi (floorplan + store products, çakışmaları filtrele)
  const allItems: FloorPlanItem[] = useMemo(() => {
    const floorIds = new Set(floorItems.map(fi => fi.equipmentId || fi.id));
    const uniqueStoreItems = storeProductItems.filter(sp => !floorIds.has(sp.equipmentId || sp.id));
    return [...floorItems, ...uniqueStoreItems];
  }, [floorItems, storeProductItems]);

  // 2D/3D tasarım aracında yerleştirilen ekipmanı teklif satırlarına çevir.
  // Hızlı yol: yerel (senkron, localStorage); ardından loadBestDesign ile
  // (Supabase dahil) en güncel sürümle tazele → cihazlar arası da doğru.
  const [designLines, setDesignLines] = useState<DesignQuoteLine[]>([]);
  useEffect(() => {
    if (!id) { setDesignLines([]); return; }
    setDesignLines(designQuoteLines(id));
    let cancelled = false;
    loadBestDesign(id)
      .then((res) => { if (!cancelled && res) setDesignLines(quoteLinesFromDoc(res.doc)); })
      .catch(() => { /* yoksay — yerel sürüm kalır */ });
    return () => { cancelled = true; };
  }, [id, activeTab, refreshTick]);

  // ─── BİRLEŞİK ÜRÜN LİSTESİ ───
  // Ürünler sekmesi = Teklif sekmesi = AYNI küme:
  //   2D/3D tasarımda yerleştirilen ekipman (designLines) + kat planı + "Ürün Ekle" ürünleri (allItems).
  // Böylece 2D/3D'de eklenen/çıkarılan ürün anında Ürünler sekmesinde de görünür.
  // (QuoteTab kendi içinde allItems + designLines'ı aynı kuralla birleştirdiği için iki sekme eşittir.)
  const unifiedItems: FloorPlanItem[] = useMemo(() => {
    const designIds = new Set(designLines.map((l) => l.catalogId));
    const designAsFloor: FloorPlanItem[] = designLines.map((l) => ({
      id: l.catalogId,
      equipmentId: l.catalogId,
      name: l.name,
      icon: 'package',
      imageData: l.img,
      width: (l.dimsCm.width || 0) * 10,   // cm → mm (kart "÷10" ile cm gösteriyor)
      height: (l.dimsCm.height || 0) * 10,
      category: l.category || 'other',
      kw: l.kw || 0,
      price: l.unitPrice || 0,
      brand: l.brand || '',
      desc: '',
      qty: l.qty,
      priceOnRequest: l.priceOnRequest,
    }));
    const rest = allItems.filter((fi) => !designIds.has(fi.equipmentId || fi.id));
    return [...designAsFloor, ...rest];
  }, [allItems, designLines]);

  // Gösterilecek toplam adet (tasarım satırları adetli olabilir).
  const totalUnits = unifiedItems.reduce((sum, fi) => sum + (fi.qty || 1), 0);

  // model-viewer script'ini bir kez yükle (çift register'ı önle)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.querySelector('script[data-model-viewer]')) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    s.setAttribute('data-model-viewer', 'true');
    document.head.appendChild(s);
  }, []);

  // Mevcut 3D modelleri Supabase'den çek (rozetler için)
  useEffect(() => {
    if (floorItems.length === 0) return;
    const keys = floorItems
      .map(fi => productKeyFor(fi.imageData, fi.equipmentId || fi.id))
      .filter(Boolean);
    if (keys.length === 0) return;
    getProduct3DModelsByKeys(keys).then(map => {
      const rows = Object.values(map);
      if (rows.length > 0) setMeshRows(rows);
    }).catch(() => {});
  }, [floorItems.length]);

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto w-full text-center py-20">
        <p className="text-on-surface-variant">{t('common.noData')}</p>
        <Link to="/projects" className="text-primary font-medium hover:underline mt-4 inline-block">{t('common.back')}</Link>
      </div>
    );
  }

  const p = project;
  const statusColors: Record<string, string> = {
    drafting: 'bg-red-100 text-primary',
    quoted: 'bg-amber-100 text-amber-900',
    complete: 'bg-emerald-100 text-emerald-900',
    inProgress: 'bg-violet-100 text-violet-900',
  };

  const statusLabels: Record<string, string> = {
    drafting: t('dashboard.drafting'),
    quoted: t('dashboard.quoted'),
    complete: t('dashboard.complete'),
    inProgress: t('dashboard.inProgress'),
  };

  const totalKW = unifiedItems.reduce((sum, fi) => sum + (fi.kw || 0) * (fi.qty || 1), 0);
  const totalPrice = unifiedItems.reduce((sum, fi) => sum + (fi.priceOnRequest ? 0 : (fi.price || 0) * (fi.qty || 1)), 0);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft size={18} /> {t('projects.title')}
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-black text-on-surface tracking-tight">{p.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${statusColors[p.status]}`}>
              {statusLabels[p.status] ?? p.status}
            </span>
            <span className="text-sm text-on-surface-variant">{t('projects.productCount', { count: totalUnits })}</span>
            <span className="text-sm text-on-surface-variant">•</span>
            <span className="text-sm text-on-surface-variant">{p.area} m²</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/projects/${p.id}/products/add`}
            className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-primary px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm border border-primary/20"
          >
            <Plus size={18} /> {t('projects.addProduct')}
          </Link>
          <Link
            to={`/projects/${p.id}/design`}
            className="flex items-center gap-2 brushed-metal text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg hover:opacity-90 transition-all"
          >
            <Boxes size={18} /> {t('projects.design3d')}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant/20">
        <div className="flex gap-6">
          {[
            { key: 'overview', label: t('projects.tabOverview'), icon: Building },
            { key: 'products', label: t('projects.tabProducts', { count: totalUnits }), icon: Package },
            { key: 'quote', label: t('projects.tabQuote'), icon: FileText },
            { key: 'settings', label: t('projects.tabSettings'), icon: Settings2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all border-b-2 ${
                  isActive ? 'text-primary border-primary' : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.statProductCount')}</div>
                <div className="text-2xl font-black text-primary mt-1">{totalUnits}</div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.statTotalPower')}</div>
                <div className="text-2xl font-black text-primary mt-1">{totalKW.toFixed(1)} <span className="text-sm">kW</span></div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.statTotalPrice')}</div>
                <div className="text-2xl font-black text-primary mt-1">€{totalPrice.toLocaleString()}</div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.statArea')}</div>
                <div className="text-2xl font-black text-primary mt-1">{p.area} <span className="text-sm">m²</span></div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
              <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">{t('projects.details')}</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Building size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">{t('projects.projectType')}</div>
                    <div className="text-sm font-medium mt-1 capitalize">{p.type}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">{t('dashboard.lead')}</div>
                    <div className="text-sm font-medium mt-1">{p.lead || '-'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">{t('projects.deadline')}</div>
                    <div className="text-sm font-medium mt-1">{p.deadline || '-'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">{t('projects.customer')}</div>
                    <div className="text-sm font-medium mt-1">{p.clientName || '-'}</div>
                  </div>
                </div>
              </div>
              {p.notes && (
                <div className="mt-4 pt-4 border-t border-outline-variant/10">
                  <div className="text-xs text-on-surface-variant font-bold uppercase mb-1">{t('projects.notes')}</div>
                  <p className="text-sm text-on-surface">{p.notes}</p>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
              <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">{t('projects.progress')}</h2>
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${p.progress}%` }} />
              </div>
              <div className="flex justify-between mt-3 text-xs text-on-surface-variant">
                <span>{p.startDate || '-'}</span>
                <span className="font-bold text-primary">{p.progress}%</span>
                <span>{p.deadline || '-'}</span>
              </div>
            </div>
          </div>

          {/* Quick product preview */}
          <div className="space-y-6">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider">{t('projects.productsHeading')}</h2>
                <button onClick={() => setActiveTab('products')} className="text-xs text-primary font-bold hover:underline">{t('projects.viewAll')}</button>
              </div>
              {unifiedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">{t('projects.noProductsYet')}</p>
                  <Link to={`/projects/${p.id}/products/add`} className="text-xs text-primary font-bold hover:underline mt-2 inline-block">
                    {t('projects.addProductArrow')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {unifiedItems.slice(0, 5).map((fi) => {
                    const Icon = ICON_MAP[fi.icon] || Package;
                    return (
                      <div key={fi.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        {fi.imageData ? (
                          <img src={fi.imageData} alt={fi.name} className="w-10 h-10 object-contain rounded-lg border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Icon size={16} style={{ color: CATEGORY_COLORS[fi.category] || '#6b7280' }} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-700 truncate">{fi.name}</div>
                          <div className="text-[10px] text-slate-400">{Math.round(fi.width / 10)}×{Math.round(fi.height / 10)}cm</div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{fi.kw || 0}kW</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Tab — Kat planındaki ürünler */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <p className="text-sm text-on-surface-variant">
              {t('projects.productCount', { count: totalUnits })}
              {selected3D.size > 0 && <span className="ml-2 text-primary font-bold">{t('projects.selectedCount', { count: selected3D.size })}</span>}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={startMeshGeneration}
                disabled={selected3D.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('projects.meshGenerateTitle')}
              >
                <Sparkles size={16} /> {t('projects.model3dMeshAI')}
                {selected3D.size > 0 && <span className="bg-white/25 px-1.5 rounded-full text-[10px]">{selected3D.size}</span>}
              </button>
              <Link
                to={`/projects/${p.id}/design`}
                className="flex items-center gap-2 brushed-metal text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:opacity-90 transition-all"
              >
                <Boxes size={16} /> {t('projects.goToDesign3d')}
              </Link>
            </div>
          </div>

          {unifiedItems.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-16 text-center border border-outline-variant/10">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="font-bold text-lg text-slate-500 mb-2">{t('projects.noProductsAdded')}</h3>
              <p className="text-sm text-slate-400 mb-6">{t('projects.addProductHint')}</p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to={`/projects/${p.id}/products/add`}
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all"
                >
                  <Plus size={18} /> {t('projects.addProduct')}
                </Link>
                <Link
                  to={`/projects/${p.id}/design`}
                  className="inline-flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all"
                >
                  <Boxes size={18} /> {t('projects.design3dShort')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {unifiedItems.filter((fi) => !productRemovedKeys.has(fi.equipmentId || fi.id)).map((fi) => {
                const Icon = ICON_MAP[fi.icon] || Package;
                const catColor = CATEGORY_COLORS[fi.category] || '#6b7280';
                const catLabelKey = CATEGORY_LABEL_KEYS[fi.category];
                const catLabel = catLabelKey ? t(catLabelKey) : (fi.category || t('projects.catOther'));
                const meshKey = productKeyFor(fi.imageData, fi.equipmentId || fi.id);
                const meshRow = meshRows[meshKey];
                const has3D = meshRow?.status === 'done' && !!meshRow.glb_url;
                return (
                  <div key={fi.id} className={`bg-surface-container-lowest rounded-xl shadow-sm border overflow-hidden group transition-all ${selected3D.has(fi.id) ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-outline-variant/10'}`}>
                    {/* Product Image */}
                    <div className="h-40 bg-slate-50 relative flex items-center justify-center">
                      {fi.imageData ? (
                        <img src={fi.imageData} alt={fi.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <Icon size={40} style={{ color: catColor }} className="opacity-30" />
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full text-white" style={{ backgroundColor: catColor }}>
                          {catLabel}
                        </span>
                      </div>
                      {has3D ? (
                        <button
                          onClick={() => setView3DModel(meshRow!)}
                          className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide shadow-lg ring-2 ring-white bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:scale-105 active:scale-95 transition-all"
                          title="3D modeli görüntüle"
                        >
                          <Box size={14} className="drop-shadow" />
                          3D ✓
                        </button>
                      ) : (
                        <button
                          onClick={() => toggle3DSelect(fi.id)}
                          className={`absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide shadow-lg ring-2 transition-all hover:scale-105 active:scale-95 ${
                            selected3D.has(fi.id)
                              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white ring-white animate-pulse'
                              : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white ring-white/70 hover:ring-white shadow-violet-400/50'
                          }`}
                          title="3D modelleme için seç"
                        >
                          {selected3D.has(fi.id) ? <CheckCircle2 size={14} className="drop-shadow" /> : <Sparkles size={14} className="drop-shadow" />}
                          3D
                        </button>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-on-surface">
                        {fi.name}
                        {(fi.qty || 1) > 1 && (
                          <span className="ml-1.5 align-middle text-[10px] font-black text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">×{fi.qty}</span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{fi.equipmentId || fi.id}</p>
                      {fi.brand && <p className="text-[10px] text-primary font-medium mt-1">{fi.brand}</p>}
                      {fi.desc && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{fi.desc}</p>}

                      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
                        <span className="font-bold">{Math.round(fi.width / 10)}×{Math.round(fi.height / 10)}cm</span>
                        {fi.kw > 0 && <><span>•</span><span className="font-bold">{fi.kw} kW</span></>}
                        {fi.priceOnRequest
                          ? <><span>•</span><span className="font-bold text-amber-600">Fiyat sorulacak</span></>
                          : (fi.price || 0) > 0 && <><span>•</span><span className="font-bold text-primary">€{(fi.price || 0).toLocaleString()}</span></>}
                      </div>

                      {isAdmin && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setPendingProductRemove({ id: fi.equipmentId || fi.id, name: fi.name })}
                            title="Ürünü projeden kaldır (tasarım + kat planı + teklif)"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={13} /> Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quote Tab */}
      {activeTab === 'quote' && (
        <QuoteTab project={p} floorItems={allItems} designLines={designLines} onRemove={handleRemoveQuoteItem} />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
            <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">Oda Boyutları</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Uzunluk (cm)</label>
                <input type="number" defaultValue={p.roomWidthCm} className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Genişlik (cm)</label>
                <input type="number" defaultValue={p.roomHeightCm} className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Model Viewer Modal */}
      {view3DModel && view3DModel.glb_url && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setView3DModel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Box size={20} />
                <div>
                  <h2 className="font-bold text-base">{view3DModel.name}</h2>
                  <p className="text-[11px] text-white/80">3D Model — sürükle: döndür, kaydır: yakınlaştır</p>
                </div>
              </div>
              <button onClick={() => setView3DModel(null)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100" style={{ minHeight: 480 }}>
              <SafeModelViewer
                src={view3DModel.glb_url}
                iosSrc={view3DModel.usdz_url || undefined}
                alt={view3DModel.name}
              />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-between items-center gap-3 flex-wrap">
              <p className="text-[11px] text-slate-400">MeshAI ile üretildi • Supabase'de saklı</p>
              <div className="flex gap-2">
                {view3DModel.glb_url && (
                  <a href={view3DModel.glb_url} download={`${view3DModel.name}.glb`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-colors">
                    <Download size={12} /> GLB
                  </a>
                )}
                {view3DModel.usdz_url && (
                  <a href={view3DModel.usdz_url} download={`${view3DModel.name}.usdz`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-colors">
                    <Download size={12} /> USDZ
                  </a>
                )}
                {view3DModel.fbx_url && (
                  <a href={view3DModel.fbx_url} download={`${view3DModel.name}.fbx`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-colors">
                    <Download size={12} /> FBX
                  </a>
                )}
                {view3DModel.obj_url && (
                  <a href={view3DModel.obj_url} download={`${view3DModel.name}.obj`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-colors">
                    <Download size={12} /> OBJ
                  </a>
                )}
                <button onClick={() => setView3DModel(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MeshAI 3D Generation Modal */}
      {meshModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setMeshModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles size={22} />
                <div>
                  <h2 className="font-bold text-lg">MeshAI 3D Üretimi</h2>
                  <p className="text-xs text-white/80">Seçilen ürünler için GLB modelleri oluşturuluyor</p>
                </div>
              </div>
              <button onClick={() => setMeshModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3">
              {meshActiveKeys.map((jobKey) => {
                const job = meshRows[jobKey];
                if (!job) return null;
                return (
                <div key={jobKey} className="border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {job.thumbnail_url || job.source_image_url ? <img src={job.thumbnail_url || job.source_image_url} alt={job.name} className="w-full h-full object-contain" /> : <Box size={24} className="text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-slate-800 truncate">{job.name}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {job.status === 'pending' && 'Bekliyor'}
                        {job.status === 'processing' && (
                          <>
                            {job.stage === 'preview' && '1/2 Model'}
                            {job.stage === 'refine' && '2/2 Doku'}
                            {!job.stage && 'İşleniyor'} • {job.progress}%
                          </>
                        )}
                        {job.status === 'done' && 'Tamam'}
                        {job.status === 'error' && 'Hata'}
                      </span>
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${job.status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {job.status === 'processing' && <Loader2 size={18} className="animate-spin text-violet-600" />}
                    {job.status === 'done' && job.glb_url && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setView3DModel(job)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-xs font-bold transition-colors"
                        >
                          <Eye size={12} /> Önizle
                        </button>
                        <a
                          href={job.glb_url}
                          download={`${job.name}.glb`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-colors"
                          title="GLB indir"
                        >
                          <Download size={12} />
                        </a>
                      </div>
                    )}
                    {job.status === 'error' && <X size={18} className="text-red-500" />}
                  </div>
                </div>
                );
              })}
              {meshActiveKeys.some(k => meshRows[k]?.status === 'error') && (
                <p className="text-[11px] text-red-500 px-1">
                  {meshActiveKeys.map(k => meshRows[k]).filter(j => j?.status === 'error').map(j => j!.error).join(' • ')}
                </p>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[11px] text-slate-400">Üretilen modeller cache'lenir; aynı ürün için tekrar istek atılmaz.</p>
              <button onClick={() => setMeshModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {viewProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {viewProduct.imageData && (
              <img src={viewProduct.imageData} alt={viewProduct.name} className="w-full h-56 object-contain bg-slate-50 rounded-t-2xl" />
            )}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="font-bold text-xl text-on-surface">{viewProduct.name}</h2>
                <p className="text-sm text-slate-400 font-mono">{viewProduct.code}</p>
              </div>
              {viewProduct.description && <p className="text-sm text-slate-600">{viewProduct.description}</p>}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Boyutlar</span>
                  <p className="font-medium">{viewProduct.dimensions.width} × {viewProduct.dimensions.height} × {viewProduct.dimensions.depth} cm</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Güç</span>
                  <p className="font-medium">{viewProduct.kw} kW ({viewProduct.powerType})</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Marka</span>
                  <p className="font-medium">{viewProduct.brand || '-'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Fiyat</span>
                  <p className="font-medium text-primary">€{viewProduct.price.toLocaleString()}</p>
                </div>
              </div>
              {viewProduct.features.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Özellikler</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {viewProduct.features.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setViewProduct(null)} className="w-full py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ürünler sekmesi — modern silme onayı */}
      <ConfirmDialog
        open={!!pendingProductRemove}
        tone="danger"
        title="Ürünü projeden kaldır?"
        description={
          pendingProductRemove && (
            <>
              <span className="font-bold text-slate-700">“{pendingProductRemove.name}”</span> tasarımdan,
              kat planından ve teklif listesinden kalıcı olarak silinecek.{' '}
              <span className="font-semibold text-rose-600">Bu işlem geri alınamaz.</span>
            </>
          )
        }
        confirmLabel="Evet, sil"
        cancelLabel="Vazgeç"
        busy={productRemoving}
        onConfirm={confirmProductRemove}
        onCancel={() => { if (!productRemoving) setPendingProductRemove(null); }}
      />
    </div>
  );
}
