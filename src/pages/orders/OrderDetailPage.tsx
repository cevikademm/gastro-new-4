import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrderStore } from '../../stores/orderStore';
import {
  Package, ArrowLeft, Clock, CheckCircle, Truck, PackageCheck, XCircle, Euro
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'Beklemede', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  confirmed: { label: 'Onaylandı', color: 'text-[#DC2626]', bg: 'bg-red-50 border-red-200', icon: CheckCircle },
  shipped: { label: 'Kargoda', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: PackageCheck },
  cancelled: { label: 'İptal Edildi', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

const IMAGE_PROXY = 'https://ohcytmzyjvpfsqejujzs.supabase.co/functions/v1/image-proxy';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, fetchOrders, getOrderById } = useOrderStore();

  useEffect(() => {
    if (orders.length === 0) fetchOrders();
  }, [orders.length, fetchOrders]);

  const order = id ? getOrderById(id) : undefined;

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center">
        <p className="text-on-surface-variant">Sipariş bulunamadı</p>
        <Link to="/orders" className="text-primary font-bold text-sm mt-4 inline-block hover:underline">← Siparişlere Dön</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  const formatPrice = (p: number) =>
    p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const proxyImg = (url: string) =>
    url?.startsWith('http') ? `${IMAGE_PROXY}?url=${encodeURIComponent(url)}` : url;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Back */}
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium">
        <ArrowLeft size={16} /> Siparişlerim
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-headline text-on-surface tracking-tight flex items-center gap-3">
            <Package size={24} className="text-primary" />
            {order.order_number}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">{formatDate(order.created_at)}</p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${cfg.bg} ${cfg.color}`}>
          <StatusIcon size={18} /> {cfg.label}
        </div>
      </div>

      {/* Items */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant/10">
          <h2 className="font-headline font-bold text-sm text-primary uppercase tracking-wider">
            Ürünler ({order.total_items} adet)
          </h2>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 px-5 py-4">
              {item.image ? (
                <img
                  src={proxyImg(item.image)}
                  alt={item.name}
                  className="w-14 h-14 object-contain rounded-lg bg-white border border-outline-variant/10 p-1 flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-14 h-14 bg-surface-container-highest flex items-center justify-center rounded-lg flex-shrink-0">
                  <Package size={20} className="text-on-surface-variant/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-on-surface truncate">{item.name}</p>
                <p className="text-xs font-mono text-on-surface-variant mt-0.5">{item.product_id}</p>
                {item.brand && <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{item.brand}</p>}
              </div>
              <div className="text-right text-xs text-on-surface-variant hidden sm:block">
                <p className="flex items-center justify-end gap-1"><Euro size={10} /> {formatPrice(item.price)}</p>
                <p className="text-[10px]">birim fiyat</p>
              </div>
              <div className="bg-primary/10 text-primary font-bold text-sm px-3 py-1 rounded-lg">
                ×{item.quantity}
              </div>
              <div className="text-right font-mono font-bold text-sm text-primary w-24 hidden sm:block">
                {formatPrice(item.quantity * item.price)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 p-5">
          <h3 className="font-headline font-bold text-sm text-on-surface mb-2">Notlar</h3>
          <p className="text-sm text-on-surface-variant">{order.notes}</p>
        </div>
      )}

      {/* Total */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-6">
        <div className="flex flex-col gap-3 max-w-sm ml-auto">
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>Ara Toplam ({order.total_items} adet)</span>
            <span className="font-mono">{formatPrice(order.total_price)}</span>
          </div>
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>KDV (%19)</span>
            <span className="font-mono">{formatPrice(order.total_price * 0.19)}</span>
          </div>
          <div className="border-t border-outline-variant/20 pt-3 flex justify-between font-headline font-black text-lg text-primary">
            <span>Genel Toplam</span>
            <span>{formatPrice(order.total_price * 1.19)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
