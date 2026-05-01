import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectStore, type ProductItem } from '../../stores/projectStore';
import {
  ArrowLeft, Ruler, ClipboardList, Calendar, Building,
  Plus, Trash2, Package, Flame, Droplets, Refrigerator,
  Table, Microwave, Waves, Eye, Settings2, Users, FileText, Download, Loader2,
  Box, Sparkles, CheckCircle2, X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { meshyGenerate, getProduct3DModelsByKeys, productKeyFor, type Product3DModel } from '../../lib/meshyClient';
import { useMeshStore } from '../../stores/meshStore';
import SafeModelViewer from '../../components/SafeModelViewer';

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

const CATEGORY_LABELS: Record<string, string> = {
  cooking: 'Pişirme', cold: 'Soğutma', cleaning: 'Temizlik', neutral: 'Nötr', other: 'Diğer',
};

const CATEGORY_COLORS: Record<string, string> = {
  cooking: '#ef4444', cold: '#3b82f6', cleaning: '#06b6d4', neutral: '#6b7280', other: '#8b5cf6',
};

function QuoteTab({ project, floorItems }: { project: import('../../stores/projectStore').Project; floorItems: FloorPlanItem[] }) {
  const { name, clientName, id } = project;
  // Kat planındaki ürünleri ProductItem formatına çevir
  const products = floorItems.map((fi): ProductItem => ({
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
  }));
  const quoteNo = `TKF-${id.slice(-6).toUpperCase()}-${new Date().getFullYear()}`;
  const subtotal = products.reduce((sum, p) => sum + p.price, 0);
  const vatRate = 0.19;
  const vat = subtotal * vatRate;
  const total = subtotal + vat;
  const fmt = (n: number) => n > 0 ? `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';
  const quoteRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const COMPANY = {
    name: '2MC Werbung & Gastro GmbH',
    address: 'Musterstraße 12, 10115 Berlin, Deutschland',
    phone: '+49 30 1234 5678',
    email: 'info@2mc-gastro.de',
    website: 'www.2mc-gastro.de',
    vat: 'DE123456789',
  };

  const IMAGE_PROXY = 'https://ohcytmzyjvpfsqejujzs.supabase.co/functions/v1/image-proxy';

  async function loadImgBase64(src: string): Promise<string | null> {
    if (!src) return null;
    const url = src.startsWith('http') ? src : window.location.origin + (src.startsWith('/') ? '' : '/') + src;
    const fetchUrl = url.startsWith(window.location.origin) ? url : `${IMAGE_PROXY}?url=${encodeURIComponent(url)}`;
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  const exportQuotePDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = 210;
      const PH = 297;
      const dateStr = new Date().toLocaleDateString('tr-TR');

      // Load logos
      const [logoFull, logoIcon, logoHolo] = await Promise.all([
        loadImgBase64('/logo-werbung.png'),
        loadImgBase64('/logo-icon.png'),
        loadImgBase64('https://ohcytmzyjvpfsqejujzs.supabase.co/storage/v1/object/public/2mcwerbung/logo4.png'),
      ]);

      // Hologram watermark
      let holoPageData: string | null = null;
      if (logoHolo) {
        holoPageData = await new Promise<string | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = 794; c.height = 1123;
            const ctx = c.getContext('2d')!;
            const sz = Math.min(c.width, c.height) * 0.92;
            ctx.globalAlpha = 0.055;
            ctx.drawImage(img, (c.width - sz) / 2, (c.height - sz) / 2, sz, sz);
            resolve(c.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null);
          img.src = logoHolo;
        });
      }
      const drawHologram = () => { if (holoPageData) doc.addImage(holoPageData, 'PNG', 0, 0, PW, PH); };

      const drawStripe = () => {
        doc.setFillColor(37, 99, 235);
        doc.setGState(doc.GState({ opacity: 0.06 }));
        for (let i = 0; i < 3; i++) {
          const off = 60 + i * 25;
          doc.triangle(0, PH - off, PW + 20, PH - off - 80, PW + 20, PH - off - 84, 'F');
        }
        doc.setGState(doc.GState({ opacity: 1 }));
      };

      const drawPageHeader = (pg: number) => {
        doc.setFillColor(15, 23, 60);
        doc.rect(0, 0, PW, 38, 'F');
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 38, PW, 2, 'F');
        if (logoFull) doc.addImage(logoFull, 'PNG', 10, 5, 72, 20);
        else { doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text('2MC WERBUNG', 14, 20); }
        if (logoIcon) doc.addImage(logoIcon, 'PNG', PW - 38, 4, 28, 28);
        doc.setTextColor(180, 200, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text(COMPANY.address, PW - 10, 34, { align: 'right' });
      };

      // Page 1
      drawHologram(); drawStripe(); drawPageHeader(1);

      // Title block
      doc.setFillColor(245, 247, 255);
      doc.roundedRect(10, 46, PW - 20, 28, 3, 3, 'F');
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(10, 46, 4, 28, 2, 2, 'F');
      doc.setTextColor(15, 23, 60); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('TEKLİF  /  ANGEBOT', 20, 57);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 90, 120);
      doc.text(`Teklif No: ${quoteNo}`, 20, 65);
      doc.text(`Tarih: ${dateStr}`, 80, 65);
      doc.text(`Müşteri: ${clientName || '—'}`, 120, 65);

      // Client info bar
      doc.setFillColor(15, 23, 60);
      doc.rect(10, 78, PW - 20, 10, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7.5);
      doc.text(`Proje: ${name}`, 14, 85);
      doc.text(`✆ ${COMPANY.phone}`, 80, 85);
      doc.text(`✉ ${COMPANY.email}`, 130, 85);
      doc.text(`USt: ${COMPANY.vat}`, 175, 85);

      let y = 96;
      let pageNum = 1;

      // Pre-load product images
      const imgCache: Record<string, string | null> = {};
      await Promise.all(
        products.map(async (p) => {
          const src = p.imageData || '';
          if (src) imgCache[p.id] = await loadImgBase64(src);
          else imgCache[p.id] = null;
        })
      );

      // Column headers
      const drawColumnHeaders = () => {
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 110, 140);
        doc.text('GÖRSEL', 12, y);
        doc.text('ADET', 32, y);
        doc.text('ÜRÜN KODU', 42, y);
        doc.text('ÜRÜN ADI', 78, y);
        doc.text('BİRİM FİYAT', 158, y, { align: 'right' });
        doc.text('TOPLAM', PW - 12, y, { align: 'right' });
        y += 2;
        doc.setDrawColor(200, 210, 230); doc.line(10, y, PW - 10, y);
        y += 3;
      };
      drawColumnHeaders();

      // Product rows
      let rowAlt = false;
      for (const product of products) {
        const rowH = 18;
        if (y + rowH > 272) {
          doc.addPage(); pageNum++;
          drawHologram(); drawStripe(); drawPageHeader(pageNum);
          y = 48; drawColumnHeaders();
        }

        if (rowAlt) { doc.setFillColor(245, 247, 255); doc.rect(10, y - 1, PW - 20, rowH, 'F'); }
        rowAlt = !rowAlt;

        // Image
        const imgData = imgCache[product.id];
        if (imgData) {
          doc.addImage(imgData, 'PNG', 12, y, 14, 14);
        } else {
          doc.setFillColor(230, 235, 245); doc.roundedRect(12, y, 14, 14, 2, 2, 'F');
          doc.setTextColor(180, 190, 210); doc.setFontSize(6); doc.text('N/A', 19, y + 8, { align: 'center' });
        }

        // Quantity badge
        doc.setFillColor(37, 99, 235); doc.roundedRect(30, y + 3, 9, 7, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('1', 34.5, y + 8.5, { align: 'center' });

        // Code
        doc.setTextColor(37, 99, 235); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(product.code.substring(0, 22), 42, y + 5);
        if (product.brand) {
          doc.setTextColor(140, 150, 170); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
          doc.text(product.brand, 42, y + 11);
        }

        // Name
        doc.setTextColor(15, 23, 60); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        const pName = product.name.length > 42 ? product.name.substring(0, 42) + '…' : product.name;
        doc.text(pName, 78, y + 5);

        // Dims & kW
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(120, 130, 155);
        const dims = `${product.dimensions.width}×${product.dimensions.height}cm${product.kw > 0 ? `  |  ${product.kw} kW` : ''}`;
        doc.text(dims, 78, y + 11);

        // Price
        doc.setTextColor(80, 90, 120); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
        doc.text(product.price > 0 ? fmt(product.price) : '—', 158, y + 7, { align: 'right' });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 60);
        doc.text(product.price > 0 ? fmt(product.price) : '—', PW - 12, y + 7, { align: 'right' });

        doc.setDrawColor(220, 225, 240); doc.line(10, y + rowH - 1, PW - 10, y + rowH - 1);
        y += rowH;
      }

      // Totals
      if (y + 45 > 272) {
        doc.addPage(); pageNum++;
        drawHologram(); drawStripe(); drawPageHeader(pageNum);
        y = 48;
      }
      y += 4;
      doc.setFillColor(245, 247, 255); doc.roundedRect(PW / 2, y, PW / 2 - 10, 40, 3, 3, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 90, 120);
      doc.text('Ara Toplam:', PW / 2 + 5, y + 9);
      doc.text(fmt(subtotal), PW - 12, y + 9, { align: 'right' });
      doc.text('KDV (%19):', PW / 2 + 5, y + 17);
      doc.text(fmt(vat), PW - 12, y + 17, { align: 'right' });
      doc.setDrawColor(37, 99, 235); doc.line(PW / 2 + 3, y + 21, PW - 10, y + 21);
      doc.setFillColor(15, 23, 60); doc.roundedRect(PW / 2, y + 23, PW / 2 - 10, 13, 2, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text('GENEL TOPLAM:', PW / 2 + 5, y + 31);
      doc.text(fmt(total), PW - 12, y + 31, { align: 'right' });

      // Footer on all pages
      const totalPg = doc.getNumberOfPages();
      for (let pg = 1; pg <= totalPg; pg++) {
        doc.setPage(pg);
        doc.setFillColor(15, 23, 60); doc.rect(0, PH - 12, PW, 12, 'F');
        doc.setFillColor(37, 99, 235); doc.rect(0, PH - 12, PW, 1.5, 'F');
        doc.setTextColor(180, 200, 255); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(`${COMPANY.name}  ·  ${COMPANY.address}  ·  ${COMPANY.phone}  ·  ${COMPANY.email}`, PW / 2, PH - 6, { align: 'center' });
        doc.setTextColor(100, 130, 200);
        doc.text(`${pg} / ${totalPg}`, PW - 12, PH - 6, { align: 'right' });
      }

      doc.save(`Teklif_${quoteNo}_${dateStr.replace(/\./g, '-')}.pdf`);
    } catch (err) {
      console.error('PDF export hatası:', err);
      alert('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline font-black text-xl text-on-surface">Teklif Formu</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">{clientName || 'Müşteri'} — {name} <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded ml-1">{quoteNo}</span></p>
        </div>
        <button
          onClick={exportQuotePDF}
          disabled={exporting}
          className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-primary px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm border border-primary/20 self-start disabled:opacity-60"
        >
          {exporting ? <><Loader2 size={16} className="animate-spin" /> Hazırlanıyor...</> : <><Download size={16} /> PDF İndir</>}
        </button>
      </div>

      {/* Quote Document — captured by html2canvas for PDF */}
      <div ref={quoteRef} className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Hologram watermark — new circular logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <img
            src="https://ohcytmzyjvpfsqejujzs.supabase.co/storage/v1/object/public/2mcwerbung/logo4.png"
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo-icon.png'; }}
            className="w-80 h-80 object-contain select-none"
            style={{ opacity: 0.06, filter: 'saturate(0.3) hue-rotate(200deg)' }}
          />
        </div>

        {/* Document header with logo */}
        <div className="relative z-10 bg-primary px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo-icon.png" alt="2MC" className="h-12 w-12 object-contain bg-white rounded-full p-1.5 shadow" />
            <div>
              <img src="/logo-werbung.png" alt="2MC Werbung" className="h-7 object-contain brightness-0 invert" />
              <p className="text-white/70 text-[10px] mt-0.5">Professionelle Großküchentechnik</p>
            </div>
          </div>
          <div className="text-right text-white">
            <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">Teklif No</p>
            <p className="font-black text-lg font-mono">{quoteNo}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{new Date().toLocaleDateString('tr-TR')}</p>
          </div>
        </div>

        {/* Client info bar */}
        <div className="relative z-10 bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Müşteri</span>
            <span className="font-bold text-slate-700">{clientName || '—'}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Proje</span>
            <span className="font-bold text-slate-700">{name}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Teklif Tarihi</span>
            <span className="font-bold text-slate-700">{new Date().toLocaleDateString('tr-TR')}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Geçerlilik</span>
            <span className="font-bold text-slate-700">30 Gün</span>
          </div>
        </div>

        {/* Product list */}
        {products.length === 0 ? (
          <div className="relative z-10 py-20 text-center">
            <Package size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 font-medium">Teklif için ürün ekleyin</p>
            <Link to={`/projects/${project.id}/products/add`} className="text-primary text-sm font-bold hover:underline mt-2 inline-block">
              Ürün ekle →
            </Link>
          </div>
        ) : (
          <div className="relative z-10">
            {/* Table header */}
            <div className="hidden sm:grid px-6 py-2.5 bg-primary/5 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-primary" style={{ gridTemplateColumns: '64px 1fr 80px 90px 60px 90px' }}>
              <div>Görsel</div>
              <div>Ürün Bilgileri</div>
              <div>Ölçü (cm)</div>
              <div>Güç / Tip</div>
              <div className="text-center">Adet</div>
              <div className="text-right">Fiyat</div>
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
                        <p className="font-black text-base text-primary">{prod.price > 0 ? fmt(prod.price) : '—'}</p>
                        <p className="text-[9px] text-slate-400">Adet: 1</p>
                      </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden sm:grid items-center gap-4" style={{ gridTemplateColumns: '64px 1fr 80px 90px 60px 90px' }}>
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
                          <a href={prod.imageData} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-medium mt-0.5 inline-block">Ürün Görseli ↗</a>
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
                        <span className="font-black text-primary text-lg">1</span>
                      </div>
                      <div className="text-right">
                        {prod.price > 0 ? (
                          <span className="font-black text-sm text-primary">{fmt(prod.price)}</span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-200">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Ara Toplam</span>
                  <span className="font-bold">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>KDV (%19)</span>
                  <span className="font-bold">{fmt(vat)}</span>
                </div>
                <div className="flex justify-between items-center bg-primary rounded-xl px-4 py-3 mt-3">
                  <span className="font-black text-sm text-white uppercase tracking-wide">Genel Toplam</span>
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
            Bu teklif 30 gün geçerlidir.<br />Fiyatlara KDV dahil değildir.
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-5">
        <h3 className="font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-3">Notlar & Koşullar</h3>
        <ul className="text-xs text-on-surface-variant space-y-1.5">
          <li>• Bu teklif hazırlanış tarihinden itibaren 30 gün geçerlidir.</li>
          <li>• Fiyatlara KDV dahil değildir. %19 KDV ayrıca uygulanır.</li>
          <li>• Teslimat süresi sipariş tarihinden itibaren 4-8 haftadır.</li>
          <li>• Montaj ve devreye alma hizmetleri ayrıca fiyatlandırılır.</li>
        </ul>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, selectedProject, selectProject, clearSelection, removeProductFromProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'quote' | 'settings'>('overview');
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
    const items = floorItems.filter(fi => selected3D.has(fi.id));
    const keys = items.map(fi => productKeyFor(fi.imageData, fi.equipmentId || fi.id)).filter(Boolean);
    setMeshActiveKeys(keys);
    setMeshModalOpen(true);

    await Promise.all(items.map(async (fi) => {
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
        setMeshRow({
          id: key, product_key: key, name: fi.name,
          source_image_url: imageUrl,
          meshy_task_id: null, status: 'error', progress: 0,
          error: err instanceof Error ? err.message : 'Bilinmeyen hata',
          glb_url: null, usdz_url: null, thumbnail_url: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          finished_at: null,
        });
      }
    }));
  };

  useEffect(() => {
    if (id) selectProject(id);
    return () => clearSelection();
  }, [id, projects]);

  const project = projects.find(p => p.id === id);

  // Kat planındaki ürünleri oku
  const floorItems = useMemo(() => id ? getFloorPlanItems(id) : [], [id, activeTab]);

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

  const totalKW = allItems.reduce((sum, fi) => sum + (fi.kw || 0), 0);
  const totalPrice = allItems.reduce((sum, fi) => sum + (fi.price || 0), 0);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
        <ArrowLeft size={18} /> Projeler
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl font-black text-on-surface tracking-tight">{p.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${statusColors[p.status]}`}>
              {p.status}
            </span>
            <span className="text-sm text-on-surface-variant">{allItems.length} ürün</span>
            <span className="text-sm text-on-surface-variant">•</span>
            <span className="text-sm text-on-surface-variant">{p.area} m²</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/projects/${p.id}/products/add`}
            className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container-high text-primary px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm border border-primary/20"
          >
            <Plus size={18} /> Ürün Ekle
          </Link>
          <Link
            to={`/projects/${p.id}/design`}
            className="flex items-center gap-2 brushed-metal text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg hover:opacity-90 transition-all"
          >
            <Ruler size={18} /> Kat Planı
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant/20">
        <div className="flex gap-6">
          {[
            { key: 'overview', label: 'Genel Bakış', icon: Building },
            { key: 'products', label: `Ürünler (${allItems.length})`, icon: Package },
            { key: 'quote', label: 'Teklif', icon: FileText },
            { key: 'settings', label: 'Ayarlar', icon: Settings2 },
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
                <div className="text-[10px] font-bold text-slate-400 uppercase">Ürün Sayısı</div>
                <div className="text-2xl font-black text-primary mt-1">{allItems.length}</div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Toplam Güç</div>
                <div className="text-2xl font-black text-primary mt-1">{totalKW.toFixed(1)} <span className="text-sm">kW</span></div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Toplam Fiyat</div>
                <div className="text-2xl font-black text-primary mt-1">€{totalPrice.toLocaleString()}</div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Alan</div>
                <div className="text-2xl font-black text-primary mt-1">{p.area} <span className="text-sm">m²</span></div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
              <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">Proje Detayları</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Building size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">Proje Tipi</div>
                    <div className="text-sm font-medium mt-1 capitalize">{p.type}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">Sorumlu</div>
                    <div className="text-sm font-medium mt-1">{p.lead || '-'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">Teslim Tarihi</div>
                    <div className="text-sm font-medium mt-1">{p.deadline || '-'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package size={18} className="text-on-surface-variant mt-0.5" />
                  <div>
                    <div className="text-xs text-on-surface-variant font-bold uppercase">Müşteri</div>
                    <div className="text-sm font-medium mt-1">{p.clientName || '-'}</div>
                  </div>
                </div>
              </div>
              {p.notes && (
                <div className="mt-4 pt-4 border-t border-outline-variant/10">
                  <div className="text-xs text-on-surface-variant font-bold uppercase mb-1">Notlar</div>
                  <p className="text-sm text-on-surface">{p.notes}</p>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 border border-outline-variant/10">
              <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider mb-4">İlerleme</h2>
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
                <h2 className="font-headline font-bold text-primary text-sm uppercase tracking-wider">Ürünler</h2>
                <button onClick={() => setActiveTab('products')} className="text-xs text-primary font-bold hover:underline">Tümü →</button>
              </div>
              {allItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Henüz ürün eklenmedi</p>
                  <Link to={`/projects/${p.id}/products/add`} className="text-xs text-primary font-bold hover:underline mt-2 inline-block">
                    Ürün ekle →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {allItems.slice(0, 5).map((fi) => {
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
              {allItems.length} ürün
              {selected3D.size > 0 && <span className="ml-2 text-primary font-bold">• {selected3D.size} seçili</span>}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={startMeshGeneration}
                disabled={selected3D.size === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Seçilen ürünlerden MeshAI ile 3D model üret"
              >
                <Sparkles size={16} /> 3D Modelle (MeshAI)
                {selected3D.size > 0 && <span className="bg-white/25 px-1.5 rounded-full text-[10px]">{selected3D.size}</span>}
              </button>
              <Link
                to={`/projects/${p.id}/design`}
                className="flex items-center gap-2 brushed-metal text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:opacity-90 transition-all"
              >
                <Ruler size={16} /> Kat Planına Git
              </Link>
            </div>
          </div>

          {allItems.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-16 text-center border border-outline-variant/10">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="font-bold text-lg text-slate-500 mb-2">Henüz ürün eklenmedi</h3>
              <p className="text-sm text-slate-400 mb-6">Ürün Ekle butonu veya kat planından ürün ekleyebilirsiniz.</p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to={`/projects/${p.id}/products/add`}
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all"
                >
                  <Plus size={18} /> Ürün Ekle
                </Link>
                <Link
                  to={`/projects/${p.id}/design`}
                  className="inline-flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all"
                >
                  <Ruler size={18} /> Kat Planı
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allItems.map((fi) => {
                const Icon = ICON_MAP[fi.icon] || Package;
                const catColor = CATEGORY_COLORS[fi.category] || '#6b7280';
                const catLabel = CATEGORY_LABELS[fi.category] || fi.category || 'Diğer';
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
                      <h3 className="font-bold text-sm text-on-surface">{fi.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{fi.equipmentId || fi.id}</p>
                      {fi.brand && <p className="text-[10px] text-primary font-medium mt-1">{fi.brand}</p>}
                      {fi.desc && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{fi.desc}</p>}

                      <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400">
                        <span className="font-bold">{Math.round(fi.width / 10)}×{Math.round(fi.height / 10)}cm</span>
                        {fi.kw > 0 && <><span>•</span><span className="font-bold">{fi.kw} kW</span></>}
                        {(fi.price || 0) > 0 && <><span>•</span><span className="font-bold text-primary">€{(fi.price || 0).toLocaleString()}</span></>}
                      </div>
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
        <QuoteTab project={p} floorItems={allItems} />
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
    </div>
  );
}
