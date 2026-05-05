import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrderStore, getUserInfo, type Order } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import {
  Package, Search, Filter, ChevronRight, Clock, CheckCircle, Truck,
  PackageCheck, XCircle, ShoppingCart, Euro, User, Building2, CalendarDays, Hash, Eye
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { labelKey: 'orders.pending', color: 'text-on-warning-container', bg: 'bg-warning-container border-warning/30', icon: Clock },
  confirmed: { labelKey: 'orders.confirmed', color: 'text-on-info-container', bg: 'bg-info-container border-info/30', icon: CheckCircle },
  shipped: { labelKey: 'orders.shipped', color: 'text-primary', bg: 'bg-primary-fixed border-primary/30', icon: Truck },
  delivered: { labelKey: 'orders.delivered', color: 'text-on-success-container', bg: 'bg-success-container border-success/30', icon: PackageCheck },
  cancelled: { labelKey: 'orders.cancelled', color: 'text-error', bg: 'bg-error-container border-error/30', icon: XCircle },
};

const IMAGE_PROXY = 'https://ohcytmzyjvpfsqejujzs.supabase.co/functions/v1/image-proxy';

export default function OrdersPage() {
  const { t } = useTranslation();
  const { orders, loading, fetchOrders } = useOrderStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatPrice = (p: number) =>
    p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const proxyImg = (url: string) =>
    url?.startsWith('http') ? `${IMAGE_PROXY}?url=${encodeURIComponent(url)}` : url;

  // Summary stats
  const totalRevenue = orders.reduce((s, o) => s + (o.status !== 'cancelled' ? o.total_price : 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 reveal">
        <div>
          <h1 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight flex items-center gap-3">
            <Package size={26} className="text-primary" strokeWidth={1.75} /> {t('orders.myOrders')}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1.5">
            {user?.company && <span className="font-medium">{user.company} · </span>}
            {t('orders.orderCount', { count: orders.length })}
          </p>
        </div>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-xl font-bold shadow-lg text-sm"
        >
          <ShoppingCart size={16} /> {t('orders.newOrder')}
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="reveal hover-lift bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-[0_1px_3px_rgba(15,36,64,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{t('orders.totalRevenue')}</p>
          <p className="text-2xl font-black font-mono text-primary mt-2">{formatPrice(totalRevenue)}</p>
        </div>
        <div className="reveal reveal-delay-1 hover-lift bg-warning-container rounded-2xl p-5 border border-warning/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-warning-container/80">{t('orders.pending')}</p>
          <p className="text-2xl font-black text-on-warning-container mt-2">{pendingCount}</p>
        </div>
        <div className="reveal reveal-delay-2 hover-lift bg-info-container rounded-2xl p-5 border border-info/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-info-container/80">{t('orders.confirmedShort')}</p>
          <p className="text-2xl font-black text-on-info-container mt-2">{confirmedCount}</p>
        </div>
        <div className="reveal reveal-delay-3 hover-lift bg-success-container rounded-2xl p-5 border border-success/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-success-container/80">{t('orders.deliveredShort')}</p>
          <p className="text-2xl font-black text-on-success-container mt-2">{deliveredCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('orders.searchPlaceholder')}
            className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 pl-11 pr-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-on-surface-variant" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors"
          >
            <option value="all">{t('common.all')} ({orders.length})</option>
            <option value="pending">{t('orders.pending')} ({pendingCount})</option>
            <option value="confirmed">{t('orders.confirmed')} ({confirmedCount})</option>
            <option value="shipped">{t('orders.shipped')} ({orders.filter(o => o.status === 'shipped').length})</option>
            <option value="delivered">{t('orders.deliveredShort')} ({deliveredCount})</option>
            <option value="cancelled">{t('orders.cancelled')} ({orders.filter(o => o.status === 'cancelled').length})</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filtered.map((order) => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          const isExpanded = expandedOrder === order.id;

          return (
            <div key={order.id} className="bg-surface-container-lowest rounded-2xl shadow-[0_1px_3px_rgba(15,36,64,0.04),0_8px_24px_-12px_rgba(15,36,64,0.06)] border border-outline-variant/40 overflow-hidden hover:border-outline-variant/70 transition-colors">
              {/* Order Header Row */}
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="w-full flex flex-col md:flex-row md:items-center gap-3 md:gap-0 px-5 py-4 hover:bg-surface-container-high/50 transition-colors text-left"
              >
                {/* Order Number & Date */}
                <div className="flex items-center gap-4 md:w-[220px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-primary text-sm">{order.order_number}</p>
                    <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <CalendarDays size={10} /> {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="md:w-[180px] md:px-3">
                  <p className="text-xs font-medium text-on-surface flex items-center gap-1">
                    <User size={11} className="text-on-surface-variant" /> {user?.fullName || '—'}
                  </p>
                  <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <Building2 size={10} /> {user?.company || '—'}
                  </p>
                </div>

                {/* Items Summary */}
                <div className="flex-1 md:px-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {order.total_items} ürün
                    </span>
                    <span className="text-xs text-on-surface-variant truncate max-w-[250px]">
                      {order.items.slice(0, 3).map((i) => i.name.length > 25 ? i.name.slice(0, 25) + '…' : i.name).join(' · ')}
                      {order.items.length > 3 && ` +${order.items.length - 3}`}
                    </span>
                  </div>
                  {order.notes && (
                    <p className="text-[10px] text-on-surface-variant/60 mt-1 italic truncate max-w-[300px]">{t('common.note')}: {order.notes}</p>
                  )}
                </div>

                {/* Price */}
                <div className="md:w-[120px] md:text-right">
                  <p className="font-mono font-black text-on-surface">{formatPrice(order.total_price)}</p>
                  <p className="text-[10px] text-on-surface-variant">{t('common.vatIncluded')}: {formatPrice(order.total_price * 1.19)}</p>
                </div>

                {/* Status */}
                <div className="md:w-[130px] md:text-center flex items-center md:justify-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase rounded-full border ${cfg.bg} ${cfg.color}`}>
                    <StatusIcon size={12} /> {t(cfg.labelKey)}
                  </span>
                </div>

                {/* Expand Arrow */}
                <div className="hidden md:flex md:w-[40px] justify-center">
                  <ChevronRight size={18} className={`text-outline-variant transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Expanded: Product Details */}
              {isExpanded && (
                <div className="border-t border-outline-variant/10 bg-surface-container/30">
                  {/* Product Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-surface-container/50">
                          <th className="px-5 py-2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant w-12"></th>
                          <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{t('orders.productTable')}</th>
                          <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">{t('orders.brandTable')}</th>
                          <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant text-center">{t('orders.quantityTable')}</th>
                          <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant text-right">{t('orders.unitTable')}</th>
                          <th className="px-5 py-2 text-[9px] font-bold uppercase tracking-wider text-on-surface-variant text-right">{t('orders.totalTable')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {order.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-surface-container-high/30 transition-colors">
                            <td className="px-5 py-2.5">
                              {item.image ? (
                                <img src={proxyImg(item.image)} alt="" className="w-9 h-9 object-contain rounded bg-white border border-outline-variant/10 p-0.5"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <div className="w-9 h-9 bg-surface-container-highest rounded flex items-center justify-center">
                                  <Package size={14} className="text-on-surface-variant/30" />
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="text-sm font-medium text-on-surface">{item.name}</p>
                              <p className="text-[10px] font-mono text-on-surface-variant">{item.product_id}</p>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-on-surface-variant">{item.brand || '—'}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="bg-primary/10 text-primary font-bold text-xs px-2 py-0.5 rounded">{item.quantity}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs font-mono text-on-surface-variant">{formatPrice(item.price)}</td>
                            <td className="px-5 py-2.5 text-right text-sm font-mono font-bold text-on-surface">{formatPrice(item.quantity * item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Footer Summary */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-5 py-3 bg-surface-container/50 border-t border-outline-variant/10 gap-3">
                    <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                      {order.notes && (
                        <span className="italic">"{order.notes}"</span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-on-surface-variant text-xs">{t('common.subtotal')}: </span>
                        <span className="font-mono">{formatPrice(order.total_price)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-on-surface-variant text-xs">{t('common.vat')}: </span>
                        <span className="font-mono">{formatPrice(order.total_price * 0.19)}</span>
                      </div>
                      <div className="text-right font-bold text-primary">
                        <span className="text-xs">{t('common.total')}: </span>
                        <span className="font-mono text-base">{formatPrice(order.total_price * 1.19)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detail Page Link */}
                  <div className="px-5 py-2.5 border-t border-outline-variant/5">
                    <Link to={`/orders/${order.id}`} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                      <Eye size={12} /> {t('orders.viewDetail')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 px-6 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center">
                <Package size={28} className="text-on-surface-variant/30" />
              </div>
              <p className="text-on-surface-variant font-medium">
                {orders.length === 0 ? t('orders.noOrders') : t('orders.noFilterMatch')}
              </p>
              <Link to="/cart" className="text-primary text-sm font-bold hover:underline">
                {t('cart.goToCart')} →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
