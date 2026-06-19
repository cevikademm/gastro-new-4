import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore, type OrderItem } from '../stores/orderStore';
import { CATEGORIES } from '../stores/equipmentStore';
import {
  ShoppingCart, Trash2, Plus, Minus, Package,
  Phone, Mail, Globe, MapPin, ChevronDown, ChevronRight,
  FileText, Send, Euro, CheckCircle, X, Lock, Sparkles, Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuthStore } from '../stores/authStore';
import { EmptyState, EmptyCartIllustration } from './illustrations/EmptyState';

const COMPANY_INFO = {
  name: '2MC Werbung & Gastro GmbH',
  address: 'Musterstraße 12, 10115 Berlin, Deutschland',
  phone: '+49 30 1234 5678',
  email: 'info@2mc-gastro.de',
  website: 'www.2mc-gastro.de',
  vat: 'DE123456789',
  tagline: 'Alles rund um deine Marke · Gastronomi Çözümleri',
};

// Image proxy for cross-origin images (S3 etc.)
const IMAGE_PROXY = 'https://ohcytmzyjvpfsqejujzs.supabase.co/functions/v1/image-proxy';

// Load an image URL → base64 dataURL (routes cross-origin through proxy)
async function loadImageAsDataURL(src: string): Promise<string | null> {
  if (!src) return null;
  const url = src.startsWith('http') ? src : window.location.origin + (src.startsWith('/') ? '' : '/') + src;

  // For cross-origin URLs, use proxy to avoid CORS issues
  const fetchUrl = url.startsWith(window.location.origin) ? url : `${IMAGE_PROXY}?url=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);

  if (err || !src) {
    return (
      <div className="w-14 h-14 bg-surface-container-highest flex items-center justify-center rounded-lg flex-shrink-0">
        <Package size={20} className="text-on-surface-variant/30" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 relative flex-shrink-0">
      {loading && (
        <div className="absolute inset-0 bg-surface-container-highest rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onError={() => { setErr(true); setLoading(false); }}
        onLoad={() => setLoading(false)}
        className={`w-14 h-14 object-contain rounded-lg bg-white border border-outline-variant/10 p-1 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice, getItemsByCategory } = useCartStore();
  const { createOrder } = useOrderStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [offerSent, setOfferSent] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Premium gate — PDF Teklif yalnızca 'pro' abonelik için açıktır
  const user = useAuthStore((s) => s.user);
  const isPro = user?.subscription === 'pro';

  const handleExportPDFClick = () => {
    if (!isPro) {
      setPaywallOpen(true);
      return;
    }
    exportPDF();
  };

  const handleCreateOrder = async () => {
    setOrderLoading(true);
    setOrderError('');
    try {
      const orderItems: OrderItem[] = items.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price || 0,
        image: i.product.img || '',
        category: i.product.cat || '',
        brand: i.product.brand || '',
      }));
      console.log('Creating order with', orderItems.length, 'items, total:', getTotalPrice());
      const result = await createOrder(orderItems, getTotalPrice(), getTotalItems(), orderNotes);
      console.log('Order result:', result);
      setOrderLoading(false);
      if (result) {
        setOrderModal(false);
        setOrderSuccess(true);
        setOrderNotes('');
        clearCart();
        setTimeout(() => {
          setOrderSuccess(false);
          navigate('/orders');
        }, 2500);
      } else {
        setOrderError(t('cart.orderCreateFailed'));
      }
    } catch (err) {
      console.error('Order error:', err);
      setOrderLoading(false);
      setOrderError(t('cart.orderError'));
    }
  };

  const grouped = getItemsByCategory();
  const categoryKeys = Object.keys(grouped);
  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  const formatPrice = (p: number) =>
    p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  const getCategoryName = (catId: string) =>
    CATEGORIES.find(c => c.id === catId)?.name || catId;

  const toggleCollapse = (cat: string) =>
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  // ─── PDF Export ────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = 210; // page width mm
      const PH = 297; // page height mm
      const quoteNo = `2MC-${Date.now().toString().slice(-6)}`;
      const dateStr = new Date().toLocaleDateString('tr-TR');

      // ── Load logos ──
      const [logoFull, logoIcon, logoHolo] = await Promise.all([
        loadImageAsDataURL('/logo-werbung.png'),
        loadImageAsDataURL('/logo-icon.png'),
        loadImageAsDataURL('https://ohcytmzyjvpfsqejujzs.supabase.co/storage/v1/object/public/2mcwerbung/logo4.png'),
      ]);

      // ── Helper: draw hologram watermark on current page ──
      // Pre-render hologram once as base64 with low opacity
      let holoPageData: string | null = null;
      if (logoHolo) {
        holoPageData = await new Promise<string | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 794;
            canvas.height = 1123;
            const ctx = canvas.getContext('2d')!;
            const size = Math.min(canvas.width, canvas.height) * 0.92;
            const x = (canvas.width - size) / 2;
            const y = (canvas.height - size) / 2;
            ctx.globalAlpha = 0.055;
            ctx.drawImage(img, x, y, size, size);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => resolve(null);
          img.src = logoHolo;
        });
      }
      const drawHologram = () => {
        if (!holoPageData) return;
        doc.addImage(holoPageData, 'PNG', 0, 0, PW, PH);
      };

      // ── Helper: decorative diagonal stripe ──
      const drawStripe = () => {
        doc.setFillColor(37, 99, 235);
        doc.setGState(doc.GState({ opacity: 0.06 }));
        // Draw 3 thin diagonal bands across page
        for (let i = 0; i < 3; i++) {
          const offset = 60 + i * 25;
          doc.triangle(
            0, PH - offset,
            PW + 20, PH - offset - 80,
            PW + 20, PH - offset - 84,
            'F'
          );
        }
        doc.setGState(doc.GState({ opacity: 1 }));
      };

      // ── Page 1 header ──
      const drawPageHeader = (pageNum: number, totalPages?: number) => {
        // Dark gradient header band
        doc.setFillColor(15, 23, 60);
        doc.rect(0, 0, PW, 38, 'F');

        // Blue accent stripe
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 38, PW, 2, 'F');

        // Logo full (white version via CSS filter won't work in PDF, just place as-is)
        if (logoFull) {
          doc.addImage(logoFull, 'PNG', 10, 5, 72, 20);
        } else {
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.text('2MC WERBUNG', 14, 20);
        }

        // Logo icon on right
        if (logoIcon) {
          doc.addImage(logoIcon, 'PNG', PW - 38, 4, 28, 28);
        }

        // Company details in header
        doc.setTextColor(180, 200, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(COMPANY_INFO.address, PW - 10, 34, { align: 'right' });

        // Page number
        if (totalPages) {
          doc.setTextColor(150, 170, 220);
          doc.setFontSize(7);
          doc.text(`Sayfa ${pageNum}`, PW - 10, 36, { align: 'right' });
        }
      };

      // ── Page 1: cover info ──
      drawHologram();
      drawStripe();
      drawPageHeader(1);

      // Quote title block
      doc.setFillColor(245, 247, 255);
      doc.roundedRect(10, 46, PW - 20, 28, 3, 3, 'F');
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(10, 46, 4, 28, 2, 2, 'F');

      doc.setTextColor(15, 23, 60);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('TEKLİF  /  ANGEBOT', 20, 57);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 90, 120);
      doc.text(`Teklif No: ${quoteNo}`, 20, 65);
      doc.text(`Tarih: ${dateStr}`, 80, 65);
      doc.text(`Toplam Kalem: ${categoryKeys.length}  |  Toplam Adet: ${totalItems}`, 130, 65);

      // Contact row
      doc.setFillColor(15, 23, 60);
      doc.rect(10, 78, PW - 20, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      const contactY = 85;
      doc.text(`✆  ${COMPANY_INFO.phone}`, 14, contactY);
      doc.text(`✉  ${COMPANY_INFO.email}`, 68, contactY);
      doc.text(`⌂  ${COMPANY_INFO.website}`, 128, contactY);
      doc.text(`USt: ${COMPANY_INFO.vat}`, 175, contactY);

      let y = 96;
      let pageNum = 1;

      // Pre-load all product images (try url first, then img)
      const imgCache: Record<string, string | null> = {};
      const imgSources = items.map(i => ({
        key: i.product.id,
        urls: [i.product.url, i.product.img].filter(Boolean) as string[],
      }));
      await Promise.all(
        imgSources.map(async ({ key, urls }) => {
          for (const src of urls) {
            if (imgCache[key]) break;
            const data = await loadImageAsDataURL(src);
            if (data) { imgCache[key] = data; break; }
          }
          if (!imgCache[key]) imgCache[key] = null;
        })
      );

      // ── Draw items by category ──
      for (const cat of categoryKeys) {
        const catItems = grouped[cat];
        if (!catItems?.length) continue;

        // Space check — add page if needed
        if (y > 240) {
          doc.addPage();
          pageNum++;
          drawHologram();
          drawStripe();
          drawPageHeader(pageNum);
          y = 48;
        }

        // Category header
        doc.setFillColor(15, 23, 60);
        doc.roundedRect(10, y, PW - 20, 8, 1.5, 1.5, 'F');
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(10, y, 3, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(getCategoryName(cat).toUpperCase(), 16, y + 5.5);
        const catTotal = catItems.reduce((s, i) => s + i.quantity * (i.product.price || 0), 0);
        if (catTotal > 0) {
          doc.text(formatPrice(catTotal), PW - 12, y + 5.5, { align: 'right' });
        }
        y += 11;

        // Column headers
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 110, 140);
        doc.text('GÖRSEL', 12, y);
        doc.text('ADET', 32, y);
        doc.text('ÜRÜN KODU', 42, y);
        doc.text('ÜRÜN ADI', 78, y);
        doc.text('BİRİM FİYAT', 158, y, { align: 'right' });
        doc.text('TOPLAM', PW - 12, y, { align: 'right' });
        y += 2;
        doc.setDrawColor(200, 210, 230);
        doc.line(10, y, PW - 10, y);
        y += 3;

        // Product rows
        let rowAlt = false;
        for (const { product, quantity } of catItems) {
          const rowH = 18;
          if (y + rowH > 272) {
            doc.addPage();
            pageNum++;
            drawHologram();
            drawStripe();
            drawPageHeader(pageNum);
            y = 48;
          }

          // Alternating row background
          if (rowAlt) {
            doc.setFillColor(245, 247, 255);
            doc.rect(10, y - 1, PW - 20, rowH, 'F');
          }
          rowAlt = !rowAlt;

          // Product image
          const imgData = imgCache[product.id] || null;
          if (imgData) {
            doc.addImage(imgData, 'PNG', 12, y, 14, 14);
          } else {
            doc.setFillColor(230, 235, 245);
            doc.roundedRect(12, y, 14, 14, 2, 2, 'F');
            doc.setTextColor(180, 190, 210);
            doc.setFontSize(6);
            doc.text('N/A', 19, y + 8, { align: 'center' });
          }

          // Quantity badge
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(30, y + 3, 9, 7, 1.5, 1.5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(String(quantity), 34.5, y + 8.5, { align: 'center' });

          // Product code
          doc.setTextColor(37, 99, 235);
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.text(product.id.substring(0, 22), 42, y + 5);

          // Brand
          if (product.brand) {
            doc.setTextColor(140, 150, 170);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.text(product.brand, 42, y + 11);
          }

          // Product name
          doc.setTextColor(15, 23, 60);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          const name = product.name.length > 42 ? product.name.substring(0, 42) + '…' : product.name;
          doc.text(name, 78, y + 5);

          // Dims & kW
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(120, 130, 155);
          const dims = `${product.l}×${product.w}×${product.h} mm${product.kw > 0 ? `  |  ${product.kw} kW` : ''}`;
          doc.text(dims, 78, y + 11);

          // Unit price
          doc.setTextColor(80, 90, 120);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.text(product.price > 0 ? formatPrice(product.price) : '—', 158, y + 7, { align: 'right' });

          // Line total
          const lineTotal = quantity * (product.price || 0);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 60);
          doc.text(lineTotal > 0 ? formatPrice(lineTotal) : '—', PW - 12, y + 7, { align: 'right' });

          // Separator line
          doc.setDrawColor(220, 225, 240);
          doc.line(10, y + rowH - 1, PW - 10, y + rowH - 1);

          y += rowH;
        }

        y += 5;
      }

      // ── Totals block ──
      if (y + 45 > 272) {
        doc.addPage();
        pageNum++;
        drawHologram();
        drawStripe();
        drawPageHeader(pageNum);
        y = 48;
      }

      y += 4;
      doc.setFillColor(245, 247, 255);
      doc.roundedRect(PW / 2, y, PW / 2 - 10, 40, 3, 3, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 90, 120);
      doc.text('Ara Toplam:', PW / 2 + 5, y + 9);
      doc.text(formatPrice(totalPrice), PW - 12, y + 9, { align: 'right' });

      doc.text('KDV (%19):', PW / 2 + 5, y + 17);
      doc.text(formatPrice(totalPrice * 0.19), PW - 12, y + 17, { align: 'right' });

      doc.setDrawColor(37, 99, 235);
      doc.line(PW / 2 + 3, y + 21, PW - 10, y + 21);

      doc.setFillColor(15, 23, 60);
      doc.roundedRect(PW / 2, y + 23, PW / 2 - 10, 13, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('GENEL TOPLAM:', PW / 2 + 5, y + 31);
      doc.text(formatPrice(totalPrice * 1.19), PW - 12, y + 31, { align: 'right' });

      // ── Footer on all pages ──
      const totalPagesCount = doc.getNumberOfPages();
      for (let p = 1; p <= totalPagesCount; p++) {
        doc.setPage(p);
        doc.setFillColor(15, 23, 60);
        doc.rect(0, PH - 12, PW, 12, 'F');
        doc.setFillColor(37, 99, 235);
        doc.rect(0, PH - 12, PW, 1.5, 'F');
        doc.setTextColor(180, 200, 255);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${COMPANY_INFO.name}  ·  ${COMPANY_INFO.address}  ·  ${COMPANY_INFO.phone}  ·  ${COMPANY_INFO.email}`,
          PW / 2, PH - 6,
          { align: 'center' }
        );
        doc.setTextColor(100, 130, 200);
        doc.text(`${p} / ${totalPagesCount}`, PW - 12, PH - 6, { align: 'right' });
      }

      doc.save(`Teklif_2MC_${quoteNo}_${dateStr.replace(/\./g, '-')}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendOffer = () => {
    setOfferSent(true);
    setTimeout(() => setOfferSent(false), 3000);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          illustration={<EmptyCartIllustration />}
          title={t('cart.emptyTitle')}
          description={t('cart.emptyDesc')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-3">
            <ShoppingCart size={28} /> {offerSent ? t('cart.orderQuote') : t('cart.title')}
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">{totalItems} {t('common.products')} · {formatPrice(totalPrice)}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExportPDFClick}
            disabled={pdfLoading}
            title={isPro ? t('cart.pdfDownload') : t('cart.proOnly')}
            className={`relative px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm disabled:opacity-60 ${
              isPro
                ? 'bg-surface-container-low hover:bg-surface-container-high text-primary'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
            }`}
          >
            {isPro ? <FileText size={16} /> : <Lock size={14} />}
            {pdfLoading ? t('cart.preparing') : t('cart.pdfQuote')}
            {!isPro && (
              <span className="ml-1 text-[9px] font-mono uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded">
                PRO
              </span>
            )}
          </button>
          <button
            onClick={handleSendOffer}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            {offerSent ? t('cart.sent') : <><Send size={16} /> {t('cart.requestQuote')}</>}
          </button>
          <button
            onClick={() => navigate('/checkout')}
            className="bg-[#DC2626] hover:bg-[#991B1B] text-white px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <Package size={16} /> {t('cart.checkout', 'Ödemeye Git')}
          </button>
          <button
            onClick={() => setOrderModal(true)}
            className="bg-success hover:bg-success/90 text-white px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <Package size={16} /> {t('cart.placeOrder')}
          </button>
          <button
            onClick={clearCart}
            className="text-error hover:bg-error-container px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
          >
            <Trash2 size={16} /> {t('cart.clearCart')}
          </button>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-xl p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="/logo-icon.png" alt="" className="absolute right-4 top-1/2 -translate-y-1/2 h-24 w-24 object-contain" />
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center relative z-10">
          <div className="flex-1">
            <img src="/logo-werbung.png" alt="2MC Werbung" className="h-8 object-contain mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <p className="text-xs text-red-200">{COMPANY_INFO.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-red-100">
            <span className="flex items-center gap-1.5"><MapPin size={11} className="text-red-300" /> {COMPANY_INFO.address}</span>
            <span className="flex items-center gap-1.5"><Phone size={11} className="text-red-300" /> {COMPANY_INFO.phone}</span>
            <span className="flex items-center gap-1.5"><Mail size={11} className="text-red-300" /> {COMPANY_INFO.email}</span>
            <span className="flex items-center gap-1.5"><Globe size={11} className="text-red-300" /> {COMPANY_INFO.website}</span>
          </div>
        </div>
      </div>

      {/* Items grouped by category */}
      <div className="space-y-4">
        {categoryKeys.map((cat) => {
          const catItems = grouped[cat];
          const catName = getCategoryName(cat);
          const isCollapsed = collapsed[cat];
          const catTotal = catItems.reduce((s, i) => s + i.quantity * (i.product.price || 0), 0);

          return (
            <div key={cat} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
              <button
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight size={16} className="text-on-surface-variant" /> : <ChevronDown size={16} className="text-on-surface-variant" />}
                  <span className="font-headline font-bold text-sm text-primary uppercase tracking-wider">{catName}</span>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {catItems.length} {t('common.products')} · {catItems.reduce((s, i) => s + i.quantity, 0)} {t('common.piece')}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-success">{formatPrice(catTotal)}</span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-outline-variant/10">
                  {catItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-container-high/50 transition-colors">
                      <ProductImage src={product.img} alt={product.name} />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-on-surface truncate">{product.name}</p>
                        <p className="text-xs font-mono text-on-surface-variant mt-0.5">{product.id}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.brand && (
                            <span className="text-[10px] text-on-surface-variant/60 font-medium">{product.brand}</span>
                          )}
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline font-medium truncate max-w-[200px]"
                              title={product.url}
                            >
                              {t('cart.productImage')} ↗
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-on-surface-variant hidden sm:block w-24">
                        <p className="flex items-center justify-end gap-1"><Euro size={10} /> {formatPrice(product.price)}</p>
                        <p className="text-[10px]">{t('cart.unitPrice')}</p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-surface-container rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-on-surface">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right font-mono font-bold text-sm text-primary w-24 hidden sm:block">
                        {formatPrice(quantity * product.price)}
                      </div>

                      <button
                        onClick={() => removeItem(product.id)}
                        className="p-1.5 text-on-surface-variant/50 hover:text-error hover:bg-error-container rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Summary */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-6">
        <div className="flex flex-col gap-3 max-w-sm ml-auto">
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{t('common.subtotal')} ({totalItems} {t('common.piece')})</span>
            <span className="font-mono">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{t('common.vat')} (19%)</span>
            <span className="font-mono">{formatPrice(totalPrice * 0.19)}</span>
          </div>
          <div className="border-t border-outline-variant/20 pt-3 flex justify-between font-headline font-black text-lg text-primary">
            <span>{t('common.total')}</span>
            <span>{formatPrice(totalPrice * 1.19)}</span>
          </div>
        </div>
      </div>

      {offerSent && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 z-50">
          <Send size={16} /> {t('cart.quoteSent')}
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-headline font-black text-on-surface flex items-center gap-2">
                <Package size={20} className="text-success" /> {t('cart.confirmOrderTitle')}
              </h2>
              <button onClick={() => setOrderModal(false)} className="p-1 hover:bg-surface-container-high rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="bg-surface-container-highest rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">{t('cart.itemCount')}</span><span className="font-bold">{totalItems}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">{t('common.subtotal')}</span><span className="font-mono">{formatPrice(totalPrice)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">{t('common.vat')} (19%)</span><span className="font-mono">{formatPrice(totalPrice * 0.19)}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold text-primary"><span>{t('common.total')}</span><span>{formatPrice(totalPrice * 1.19)}</span></div>
            </div>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={t('cart.orderNotePlaceholder')}
              className="w-full bg-surface-container-highest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-20"
            />
            {orderError && (
              <div className="bg-error-container border border-error/20 text-error text-sm rounded-lg px-3 py-2">
                {orderError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setOrderModal(false); setOrderError(''); }}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={orderLoading}
                className="flex-1 py-2.5 rounded-lg bg-success hover:bg-success/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {orderLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><CheckCircle size={16} /> {t('cart.confirmOrder')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Toast */}
      {orderSuccess && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 z-50">
          <CheckCircle size={16} /> {t('cart.orderSuccess')}
        </div>
      )}

      {/* ============ PRO PAYWALL MODAL ============ */}
      {paywallOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPaywallOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-gradient-to-br from-white via-red-50 to-white rounded-3xl overflow-hidden shadow-2xl border border-brand-red/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-[#DC2626]/20 blur-3xl pointer-events-none" />

            <button
              onClick={() => setPaywallOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>

            <div className="relative p-8 text-[#0F2440]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/30 mb-4">
                <Sparkles size={12} className="text-brand-red" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-red">
                  {t('cart.proSubscription')}
                </span>
              </div>

              <h3 className="text-2xl font-black mb-2 leading-tight">
                {t('cart.paywallTitle')}
              </h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                {t('cart.paywallDesc')}
              </p>

              <div className="space-y-3 mb-6">
                {[
                  t('cart.proFeat1'),
                  t('cart.proFeat2'),
                  t('cart.proFeat3'),
                  t('cart.proFeat4'),
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3 text-sm text-slate-700">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-brand-red/10 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-brand-red" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-[#0F2440]">€29</span>
                <span className="text-slate-500 text-sm">/ {t('cart.month')}</span>
                <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-brand-red/80">
                  {t('cart.cancelAnytime')}
                </span>
              </div>

              <button
                onClick={() => {
                  setPaywallOpen(false);
                  navigate('/settings?tab=subscription');
                }}
                className="w-full py-3.5 rounded-xl bg-brand-red hover:bg-[#B91C1C] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-red/30"
              >
                <Sparkles size={16} />
                {t('cart.upgradePro')}
              </button>
              <button
                onClick={() => setPaywallOpen(false)}
                className="w-full mt-2 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
              >
                {t('cart.maybeLater')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
