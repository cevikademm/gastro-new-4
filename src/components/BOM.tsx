import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBOMStore } from '../stores/bomStore';
import { useEquipmentStore, CATEGORIES, type EquipmentItem } from '../stores/equipmentStore';
import {
  FileText, FileSpreadsheet, Search, X, Heart, MapPin,
  Package, Zap, Ruler, Euro, ExternalLink, ChevronDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { drawPdfHologram } from '../lib/pdfWatermark';
import { ensurePdfFont } from '../lib/pdfFont';

function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return <div className={`bg-surface-container-highest flex items-center justify-center ${className}`}><Package size={16} className="text-on-surface-variant/30" /></div>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setError(true)} className={`object-contain ${className}`} />;
}

export default function BOM() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, searchQuery, setSearch, getFilteredItems, getTotalItems, getUniqueSKUs, projectId } = useBOMStore();
  const totalValue = getFilteredItems().reduce((sum, i) => sum + i.quantity * (i.unitPrice || 0), 0);
  const equipmentStore = useEquipmentStore();
  const filtered = getFilteredItems();
  const [detailItem, setDetailItem] = useState<EquipmentItem | null>(null);

  const statusColors: Record<string, string> = {
    inStock: 'bg-secondary-container text-on-secondary-container',
    ordered: 'bg-tertiary-fixed text-on-tertiary-fixed',
    processing: 'bg-amber-100 text-amber-900',
  };

  const statusLabels: Record<string, string> = {
    inStock: t('bom.inStock'),
    ordered: t('bom.ordered'),
    processing: t('bom.processing'),
  };

  const formatPrice = (p: number) => p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '';

  const handleShowOnFloorPlan = (itemCode: string) => {
    // Try to find matching equipment from catalog
    const eq = equipmentStore.allItems.find(i => i.id === itemCode);
    if (eq) {
      equipmentStore.setFloorPlanItem(eq.id);
      navigate('/design');
    }
  };

  const handleToggleFavorite = (itemCode: string) => {
    const eq = equipmentStore.allItems.find(i => i.id === itemCode);
    if (eq) {
      equipmentStore.toggleFavorite(eq.id);
    }
  };

  const isFavorite = (itemCode: string) => {
    return equipmentStore.favorites.includes(itemCode);
  };

  const getEquipmentItem = (itemCode: string): EquipmentItem | undefined => {
    return equipmentStore.allItems.find(i => i.id === itemCode);
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const FONT = await ensurePdfFont(doc); // Unicode font so Turkish/German render correctly
    const pageCount = { current: 1 };

    // Draw hologram on first page
    await drawPdfHologram(doc);

    doc.setFontSize(18);
    doc.text('2MC Gastro - ' + t('bom.title'), 14, 20);
    doc.setFontSize(10);
    doc.text(`${t('bom.subtitle')} #${projectId}`, 14, 28);
    doc.setFontSize(8);

    let y = 40;
    doc.setFont(FONT, 'bold');
    doc.text(t('bom.quantity'), 14, y);
    doc.text(t('bom.articleCode'), 35, y);
    doc.text(t('bom.designation'), 80, y);
    doc.text(t('common.status'), 170, y);
    y += 2;
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFont(FONT, 'normal');
    for (const item of filtered) {
      if (y > 270) {
        doc.addPage();
        await drawPdfHologram(doc);
        y = 20;
      }
      doc.text(String(item.quantity).padStart(2, '0'), 14, y);
      doc.text(item.code, 35, y);
      doc.text(item.description.substring(0, 50), 80, y);
      doc.text(statusLabels[item.status], 170, y);
      y += 7;
    }

    doc.save(`BOM_${projectId}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportCSV = () => {
    const headers = [t('bom.quantity'), t('bom.articleCode'), t('bom.designation'), t('common.status')];
    const rows = filtered.map((item) => [item.quantity, item.code, `"${item.description}"`, statusLabels[item.status]]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight">{t('bom.title')}</h1>
          <p className="text-on-surface-variant font-medium">{t('bom.subtitle')} #{projectId}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportPDF} className="bg-surface-container-low hover:bg-surface-container-high text-primary px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm">
            <FileText size={18} /> {t('bom.exportPDF')}
          </button>
          <button onClick={exportCSV} className="bg-surface-container-low hover:bg-surface-container-high text-primary px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm">
            <FileSpreadsheet size={18} /> {t('bom.exportCSV')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-2">{t('bom.totalItems')}</p>
          <p className="text-4xl font-headline font-black text-primary">{getTotalItems()}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-2">{t('bom.uniqueSKUs')}</p>
          <p className="text-4xl font-headline font-black text-primary">{getUniqueSKUs()}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-2">Favoriler</p>
          <p className="text-4xl font-headline font-black text-pink-500">{equipmentStore.favorites.length}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-2">Toplam Değer</p>
          <p className="text-2xl font-headline font-black text-emerald-600">{formatPrice(totalValue)}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 bg-primary opacity-5"></div>
          <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-2">{t('bom.revisionStatus')}</p>
          <div className="flex items-center gap-2 relative z-10">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <p className="text-4xl font-headline font-black text-primary">{t('bom.final')}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
        <div className="bg-surface-container px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-outline-variant/10">
          <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-sm">{t('bom.componentsHardware')}</h3>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('bom.filterCode')}
              className="pl-10 pr-10 py-2 bg-surface-container-highest border-none rounded-md text-sm focus:ring-2 focus:ring-primary/20 w-full sm:w-64 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-surface-container text-on-surface-variant uppercase text-[10px] font-black tracking-[1.5px]">
              <tr>
                <th className="px-4 py-4 w-16"></th>
                <th className="px-4 py-4 w-20">{t('bom.quantity')}</th>
                <th className="px-4 py-4 w-48">{t('bom.articleCode')}</th>
                <th className="px-4 py-4">{t('bom.designation')}</th>
                <th className="px-4 py-4 text-right w-32">Birim Fiyat</th>
                <th className="px-4 py-4 text-right w-32">Toplam</th>
                <th className="px-4 py-4 text-center w-32">İşlemler</th>
                <th className="px-4 py-4 text-right w-28">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map((item) => {
                const eqItem = getEquipmentItem(item.code);
                const isFav = isFavorite(item.code);
                return (
                  <tr key={item.id} className="hover:bg-surface-container-high transition-colors group">
                    {/* Product image thumbnail */}
                    <td className="px-4 py-3">
                      {eqItem ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-outline-variant/10 cursor-pointer hover:border-primary/30 transition-all" onClick={() => setDetailItem(eqItem)}>
                          <ProductImage src={eqItem.img} alt={eqItem.name} className="w-full h-full" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center">
                          <Package size={14} className="text-on-surface-variant/30" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-headline font-bold text-primary text-lg">{String(item.quantity).padStart(2, '0')}</td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">{item.code}</td>
                    <td className="px-4 py-3 font-medium text-sm">{item.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-on-surface-variant">
                      {item.unitPrice > 0 ? formatPrice(item.unitPrice) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-primary">
                      {item.unitPrice > 0 ? formatPrice(item.quantity * item.unitPrice) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Show on floor plan button */}
                        <button
                          onClick={() => handleShowOnFloorPlan(item.code)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                          title="Kat planinda goster"
                        >
                          <MapPin size={16} />
                        </button>

                        {/* Favorite button */}
                        <button
                          onClick={() => handleToggleFavorite(item.code)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isFav ? 'text-pink-500 bg-pink-50' : 'text-slate-400 hover:text-pink-500 hover:bg-pink-50'
                          }`}
                          title={isFav ? 'Favorilerden cikar' : 'Favorilere ekle'}
                        >
                          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`${statusColors[item.status]} px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider`}>
                        {statusLabels[item.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-surface-container-low text-xs text-on-surface-variant/70 italic text-center border-t border-outline-variant/10">
          {t('bom.endOfList')}
        </div>
      </div>

      {/* Product Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <div className="w-full h-56 bg-white flex items-center justify-center">
                <ProductImage src={detailItem.img} alt={detailItem.name} className="w-full h-full p-4" />
              </div>
              <button onClick={() => setDetailItem(null)} className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-2 hover:bg-black/60">
                <X size={16} />
              </button>
              {detailItem.brand && (
                <span className="absolute top-3 left-3 bg-black/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{detailItem.brand}</span>
              )}
              {/* Favorite on modal */}
              <button
                onClick={() => equipmentStore.toggleFavorite(detailItem.id)}
                className="absolute bottom-3 right-3 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg transition-all"
              >
                <Heart size={18} fill={equipmentStore.favorites.includes(detailItem.id) ? '#ec4899' : 'none'} className={equipmentStore.favorites.includes(detailItem.id) ? 'text-pink-500' : 'text-slate-300'} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-lg font-headline font-black text-on-surface">{detailItem.name}</h2>
                <p className="text-xs font-mono text-on-surface-variant mt-1">{detailItem.id}</p>
              </div>
              {detailItem.desc && <p className="text-sm text-on-surface-variant leading-relaxed">{detailItem.desc}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Ruler size={14} /> Boyutlar (mm)</div>
                  <p className="font-bold text-on-surface text-sm">{detailItem.l} x {detailItem.w} x {detailItem.h}</p>
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Zap size={14} /> Elektrik Gucu</div>
                  <p className="font-bold text-on-surface text-sm">{detailItem.kw > 0 ? `${detailItem.kw} kW` : 'Yok'}</p>
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Euro size={14} /> Katalog Fiyati</div>
                  <p className="font-bold text-primary text-sm">{formatPrice(detailItem.price)}</p>
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Package size={14} /> Kategori</div>
                  <p className="font-bold text-on-surface text-sm">{CATEGORIES.find(c => c.id === detailItem.cat)?.name || detailItem.cat}</p>
                </div>
              </div>

              {/* Floor plan button */}
              <button
                onClick={() => { setDetailItem(null); handleShowOnFloorPlan(detailItem.id); }}
                className="w-full py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <MapPin size={16} /> Kat Planina Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
