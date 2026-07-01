import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Package, Search, Filter, CheckCircle, Clock, Truck, XCircle,
  Box, StickyNote, ChevronDown, X, Loader2, MessageCircle, FileText, Check,
} from 'lucide-react';
import { useAdminStore, type AdminOrder, type AdminOrderStatus } from '../../stores/adminStore';
import { sendOrderWhatsapp } from '../../lib/orderWhatsapp';
import { downloadOrderPdf } from '../../lib/orderPdf';

const STATUS_FLOW: AdminOrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const STATUS_META: Record<AdminOrderStatus, { label: string; icon: any; cls: string }> = {
  pending:   { label: 'Beklemede',   icon: Clock,       cls: 'bg-warning-container text-on-warning-container border-warning/20' },
  confirmed: { label: 'Onaylandı',   icon: CheckCircle, cls: 'bg-info-container text-on-info-container border-info/20' },
  shipped:   { label: 'Kargoda',     icon: Truck,       cls: 'bg-primary-fixed text-primary border-primary/20' },
  delivered: { label: 'Teslim edildi', icon: Box,       cls: 'bg-success-container text-on-success-container border-success/20' },
  cancelled: { label: 'İptal edildi',  icon: XCircle,   cls: 'bg-error-container text-error border-error/20' },
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminOrdersPage() {
  const { orders, ordersLoading, error, fetchAllOrders, updateOrderStatus, addOrderNote, updateOrderTracking } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminOrderStatus>('all');
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  useEffect(() => { fetchAllOrders(); }, [fetchAllOrders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        o.order_number?.toLowerCase().includes(q) ||
        o.profile?.full_name?.toLowerCase().includes(q) ||
        o.profile?.company?.toLowerCase().includes(q) ||
        o.profile?.email?.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const by: Record<string, number> = { all: orders.length };
    for (const s of STATUS_FLOW) by[s] = 0;
    for (const o of orders) by[o.status] = (by[o.status] || 0) + 1;
    return by;
  }, [orders]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-2">
            <Package size={28} /> Yönetici — Siparişler
          </h1>
          <p className="text-on-surface-variant mt-1">Tüm siparişleri görüntüle, durum değiştir, not ekle.</p>
        </div>
        <button
          onClick={fetchAllOrders}
          className="px-4 py-2 text-sm font-bold rounded-lg border border-outline-variant/20 hover:bg-surface-container-low"
        >
          Yenile
        </button>
      </header>

      {error && (
        <div className="bg-error-container text-error border border-error/20 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white border-primary'
              : 'bg-surface-container-lowest text-on-surface border-outline-variant/20 hover:bg-surface-container-low'
          }`}
        >
          Tümü · {stats.all}
        </button>
        {STATUS_FLOW.map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors inline-flex items-center gap-1.5 ${
                active ? 'bg-primary text-white border-primary' : `${meta.cls} hover:opacity-80`
              }`}
            >
              <Icon size={13} /> {meta.label} · {stats[s] || 0}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sipariş no, müşteri, firma veya e-posta ara..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
        />
      </div>

      {/* Orders table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
        {ordersLoading ? (
          <div className="p-12 text-center text-on-surface-variant">
            <Loader2 className="animate-spin mx-auto mb-2" />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <Filter size={32} className="mx-auto mb-2 opacity-40" />
            Sipariş bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Sipariş No</th>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">Toplam</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((o) => {
                  const meta = STATUS_META[o.status];
                  const Icon = meta.icon;
                  return (
                    <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-on-surface">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-on-surface">{o.profile?.full_name || '—'}</div>
                        <div className="text-xs text-on-surface-variant">{o.profile?.company || o.profile?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${meta.cls}`}>
                          <Icon size={12} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-on-surface">{fmtMoney(o.total_price)}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelected(o)}
                          className="text-primary font-bold text-xs hover:underline"
                        >
                          Aç
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <OrderDetailDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={async (s, note) => {
            await updateOrderStatus(selected.id, s, note);
            setSelected({ ...selected, status: s });
          }}
          onAddNote={async (note) => {
            await addOrderNote(selected.id, note);
            const fresh = useAdminStore.getState().orders.find((x) => x.id === selected.id);
            if (fresh) setSelected(fresh);
          }}
          onSetTracking={async (carrier, number) => {
            await updateOrderTracking(selected.id, carrier, number);
            setSelected({ ...selected, tracking_carrier: carrier, tracking_number: number });
          }}
        />
      )}
    </div>
  );
}

function OrderDetailDrawer({
  order, onClose, onStatusChange, onAddNote, onSetTracking,
}: {
  order: AdminOrder;
  onClose: () => void;
  onStatusChange: (s: AdminOrderStatus, note?: string) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  onSetTracking: (carrier: string, number: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [carrier, setCarrier] = useState(order.tracking_carrier || '');
  const [trackingNo, setTrackingNo] = useState(order.tracking_number || '');
  const [saving, setSaving] = useState<string | null>(null);
  const [waState, setWaState] = useState<'idle' | 'sending' | 'sent' | 'err'>('idle');
  const [pdfState, setPdfState] = useState<'idle' | 'gen' | 'err'>('idle');

  const handleWa = async () => {
    setWaState('sending');
    const r = await sendOrderWhatsapp(order, { force: true });
    setWaState(r.ok ? 'sent' : 'err');
  };
  const handlePdf = async () => {
    setPdfState('gen');
    try { await downloadOrderPdf(order); setPdfState('idle'); } catch { setPdfState('err'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-surface-container-lowest w-full max-w-xl h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/10 p-5 flex items-start justify-between">
          <div>
            <div className="font-mono font-black text-on-surface">{order.order_number}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{fmtDate(order.created_at)}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container-low">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Customer */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Müşteri</h3>
            <div className="bg-surface-container-low rounded-xl p-4 space-y-1 text-sm">
              <div className="font-bold text-on-surface">{order.profile?.full_name || '—'}</div>
              {order.profile?.company && <div className="text-on-surface-variant">{order.profile.company}</div>}
              {order.profile?.email && <div className="text-on-surface-variant">{order.profile.email}</div>}
            </div>
          </section>

          {/* Items */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Ürünler ({order.total_items})
            </h3>
            <div className="bg-surface-container-low rounded-xl divide-y divide-outline-variant/10">
              {order.items?.map((it, i) => (
                <div key={i} className="p-3 flex justify-between text-sm">
                  <div className="flex-1 truncate">
                    <div className="font-medium text-on-surface truncate">{it.name}</div>
                    <div className="text-xs text-on-surface-variant">× {it.quantity}</div>
                  </div>
                  <div className="font-bold text-on-surface">{fmtMoney(it.price * it.quantity)}</div>
                </div>
              ))}
              <div className="p-3 flex justify-between font-black text-on-surface">
                <span>Toplam</span>
                <span>{fmtMoney(order.total_price)}</span>
              </div>
            </div>
          </section>

          {/* Bildirim & Belge */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Bildirim &amp; Belge</h3>
            <div className="flex gap-2">
              <button
                onClick={handleWa}
                disabled={waState === 'sending'}
                className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {waState === 'sending' ? <Loader2 size={14} className="animate-spin" /> : waState === 'sent' ? <Check size={14} /> : <MessageCircle size={14} />}
                {waState === 'sent' ? 'Gönderildi' : waState === 'err' ? 'Hata — tekrar' : 'WhatsApp gönder'}
              </button>
              <button
                onClick={handlePdf}
                disabled={pdfState === 'gen'}
                className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/30 font-bold text-sm hover:bg-surface-container-high disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {pdfState === 'gen' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {pdfState === 'err' ? 'PDF hata' : 'PDF indir'}
              </button>
            </div>
          </section>

          {/* Status change */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Durum değiştir</h3>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_FLOW.map((s) => {
                const meta = STATUS_META[s];
                const Icon = meta.icon;
                const isActive = order.status === s;
                return (
                  <button
                    key={s}
                    disabled={isActive || saving === s}
                    onClick={async () => {
                      setSaving(s);
                      await onStatusChange(s);
                      setSaving(null);
                    }}
                    className={`px-3 py-2.5 rounded-lg text-xs font-bold border inline-flex items-center gap-2 transition-colors ${
                      isActive
                        ? `${meta.cls} opacity-60 cursor-default`
                        : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-high'
                    }`}
                  >
                    {saving === s ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tracking */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Kargo takip</h3>
            <div className="space-y-2">
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Kargo firması (DHL, UPS...)"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
              <input
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Takip numarası"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
              <button
                disabled={!carrier || !trackingNo || saving === 'tracking'}
                onClick={async () => {
                  setSaving('tracking');
                  await onSetTracking(carrier, trackingNo);
                  setSaving(null);
                }}
                className="w-full px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving === 'tracking' ? 'Kaydediliyor...' : 'Takip bilgisini kaydet'}
              </button>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
              <StickyNote size={12} /> Notlar
            </h3>
            {order.notes && (
              <div className="bg-surface-container-low rounded-xl p-3 text-sm text-on-surface whitespace-pre-wrap mb-2">
                {order.notes}
              </div>
            )}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Yeni not ekle..."
              className="w-full px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
            <button
              disabled={!note.trim() || saving === 'note'}
              onClick={async () => {
                setSaving('note');
                await onAddNote(note.trim());
                setNote('');
                setSaving(null);
              }}
              className="mt-2 px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving === 'note' ? 'Ekleniyor...' : 'Not ekle'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
