import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useRFQStore } from '../../stores/rfqStore';
import {
  FileText, Search, Filter, Send, CheckCircle, Clock, XCircle,
  AlertCircle, ChevronDown, X, Download, Mail, Eye
} from 'lucide-react';
import type { Quote, QuoteRequest } from '../../lib/rfq';
import { createQuoteFromRequest } from '../../lib/rfq';

type TabType = 'requests' | 'quotes';

interface QuoteForm {
  volumeDiscount: number;
  paymentTerms: string;
  deliveryTerms: string;
  deliveryDate: string;
  notes: string;
}

const REQUEST_STATUS_CONFIG = {
  pending: { label: 'Ausstehend', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  quoted: { label: 'Angeboten', icon: FileText, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  accepted: { label: 'Akzeptiert', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Abgelehnt', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' },
  expired: { label: 'Abgelaufen', icon: AlertCircle, color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const QUOTE_STATUS_CONFIG = {
  draft: { label: 'Entwurf', icon: FileText, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent: { label: 'Versendet', icon: Send, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  accepted: { label: 'Akzeptiert', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Abgelehnt', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' },
  expired: { label: 'Abgelaufen', icon: AlertCircle, color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function formatPrice(p: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(p || 0);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString('de-DE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminRFQPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { quoteRequests, quotes, createQuote, updateQuoteRequestStatus, updateQuoteStatus, sendQuote } = useRFQStore();

  const [tab, setTab] = useState<TabType>('requests');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showCreateQuoteModal, setShowCreateQuoteModal] = useState(false);
  const [showQuoteDetailsModal, setShowQuoteDetailsModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>({
    volumeDiscount: 0,
    paymentTerms: 'net-30',
    deliveryTerms: 'ex works',
    deliveryDate: '',
    notes: '',
  });

  const filteredRequests = useMemo(() => {
    return quoteRequests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.companyName?.toLowerCase().includes(q) ||
        r.contactName?.toLowerCase().includes(q) ||
        r.contactEmail?.toLowerCase().includes(q)
      );
    });
  }, [quoteRequests, search, statusFilter]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const request = quoteRequests.find((r) => r.id === q.requestId);
      return (
        q.quoteNumber?.toLowerCase().includes(searchLower) ||
        request?.companyName?.toLowerCase().includes(searchLower) ||
        request?.contactName?.toLowerCase().includes(searchLower)
      );
    });
  }, [quotes, quoteRequests, search, statusFilter]);

  const requestStats = useMemo(() => {
    const stats: Record<string, number> = { all: quoteRequests.length };
    for (const status in REQUEST_STATUS_CONFIG) {
      stats[status] = quoteRequests.filter((r) => r.status === status).length;
    }
    return stats;
  }, [quoteRequests]);

  const quoteStats = useMemo(() => {
    const stats: Record<string, number> = { all: quotes.length };
    for (const status in QUOTE_STATUS_CONFIG) {
      stats[status] = quotes.filter((q) => q.status === status).length;
    }
    return stats;
  }, [quotes]);

  const handleCreateQuote = () => {
    if (!selectedRequest) return;

    const newQuote = createQuoteFromRequest(
      selectedRequest,
      quoteForm.volumeDiscount,
      quoteForm.paymentTerms,
      quoteForm.deliveryTerms,
      quoteForm.deliveryDate ? new Date(quoteForm.deliveryDate) : undefined,
      quoteForm.notes
    );

    createQuote(newQuote);
    updateQuoteRequestStatus(selectedRequest.id, 'quoted');

    setShowCreateQuoteModal(false);
    setSelectedRequest(null);
    setQuoteForm({
      volumeDiscount: 0,
      paymentTerms: 'net-30',
      deliveryTerms: 'ex works',
      deliveryDate: '',
      notes: '',
    });
  };

  const handleSendQuote = (quoteId: string) => {
    sendQuote(quoteId);
    updateQuoteStatus(quoteId, 'sent');
  };

  const handleRejectRequest = (requestId: string) => {
    updateQuoteRequestStatus(requestId, 'rejected');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-2">
            <FileText size={28} /> {t('admin.rfq.title', 'Angebotsverwaltung')}
          </h1>
          <p className="text-on-surface-variant mt-1">{t('admin.rfq.description', 'Verwalten Sie Anfragen und erstellen Sie Angebote')}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-outline-variant/20">
        <button
          onClick={() => {
            setTab('requests');
            setStatusFilter('all');
            setSearch('');
          }}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            tab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {t('admin.rfq.requests', 'Anfragen')} ({requestStats.all})
        </button>
        <button
          onClick={() => {
            setTab('quotes');
            setStatusFilter('all');
            setSearch('');
          }}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            tab === 'quotes'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {t('admin.rfq.quotes', 'Angebote')} ({quoteStats.all})
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder={t('common.search', 'Suchen...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20 focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="all">{t('common.all', 'Alle')}</option>
            {tab === 'requests'
              ? Object.entries(REQUEST_STATUS_CONFIG).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))
              : Object.entries(QUOTE_STATUS_CONFIG).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('admin.rfq.noRequests', 'Keine Anfragen gefunden')}</p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const statusConfig = REQUEST_STATUS_CONFIG[request.status as keyof typeof REQUEST_STATUS_CONFIG];
              return (
                <div
                  key={request.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${statusConfig.color}`}>
                          {statusConfig.icon && <statusConfig.icon size={14} />}
                          {statusConfig.label}
                        </span>
                        <span className="text-xs text-on-surface-variant">{formatDateTime(request.createdAt)}</span>
                      </div>
                      <h3 className="font-bold text-on-surface mb-1">{request.companyName}</h3>
                      <div className="text-sm text-on-surface-variant space-y-1 mb-3">
                        <p><span className="font-medium">{request.contactName}</span> · {request.contactEmail}</p>
                        <p className="flex items-center gap-1">
                          <FileText size={12} /> {request.items.length} {t('common.products', 'Produkte')}
                        </p>
                        {request.message && <p className="italic text-xs">"{request.message}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowCreateQuoteModal(true);
                            }}
                            className="px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors flex items-center gap-1"
                          >
                            <FileText size={14} /> {t('admin.rfq.createQuote', 'Angebot erstellen')}
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="px-3 py-2 rounded-lg border border-error/30 text-error font-bold text-sm hover:bg-error-container/20 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Quotes Tab */}
      {tab === 'quotes' && (
        <div className="space-y-3">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('admin.rfq.noQuotes', 'Keine Angebote gefunden')}</p>
            </div>
          ) : (
            filteredQuotes.map((quote) => {
              const request = quoteRequests.find((r) => r.id === quote.requestId);
              const statusConfig = QUOTE_STATUS_CONFIG[quote.status as keyof typeof QUOTE_STATUS_CONFIG];
              return (
                <div
                  key={quote.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${statusConfig.color}`}>
                          {statusConfig.icon && <statusConfig.icon size={14} />}
                          {statusConfig.label}
                        </span>
                        <span className="text-xs font-mono text-on-surface-variant">{quote.quoteNumber}</span>
                        <span className="text-xs text-on-surface-variant">{formatDate(quote.createdAt)}</span>
                      </div>
                      <h3 className="font-bold text-on-surface mb-1">{request?.companyName || 'Unknown'}</h3>
                      <div className="text-sm text-on-surface-variant space-y-1">
                        <p className="flex items-center gap-1">
                          <FileText size={12} /> {quote.items.length} {t('common.products', 'Produkte')} · {formatPrice(quote.total)}
                        </p>
                        <p className="text-xs">
                          {t('admin.rfq.validUntil', 'Gültig bis')} {formatDate(quote.validUntil)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedQuote(quote);
                          setShowQuoteDetailsModal(true);
                        }}
                        className="px-3 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors flex items-center gap-1"
                      >
                        <Eye size={14} />
                      </button>
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => handleSendQuote(quote.id)}
                          className="px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors flex items-center gap-1"
                        >
                          <Send size={14} /> {t('admin.rfq.send', 'Versenden')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Quote Modal */}
      {showCreateQuoteModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">{t('admin.rfq.createQuote', 'Angebot erstellen')}</h2>
              <button
                onClick={() => setShowCreateQuoteModal(false)}
                className="p-1 hover:bg-surface-container-low rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Request Summary */}
            <div className="bg-surface-container-lowest rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-sm text-on-surface">{selectedRequest.companyName}</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-sm text-on-surface-variant">
                <div>
                  <p className="text-xs font-bold uppercase mb-1">{t('common.contact', 'Kontakt')}</p>
                  <p>{selectedRequest.contactName}</p>
                  <p className="text-xs">{selectedRequest.contactEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase mb-1">{t('common.products', 'Produkte')}</p>
                  <p>{selectedRequest.items.length} {t('common.items', 'Artikel')}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-on-surface uppercase">{t('common.products', 'Produkte')}</h3>
              <div className="bg-surface-container-lowest rounded-lg overflow-hidden">
                {selectedRequest.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border-b border-outline-variant/10 last:border-b-0">
                    <div>
                      <p className="font-medium text-sm text-on-surface">{item.productName}</p>
                      <p className="text-xs text-on-surface-variant">{item.productId}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-on-surface">{item.quantity}x</p>
                      <p className="text-xs text-on-surface-variant">{formatPrice(item.unitPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quote Form */}
            <div className="space-y-4 border-t border-outline-variant/20 pt-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">
                    {t('admin.rfq.volumeDiscount', 'Mengenrabatt (%)')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={quoteForm.volumeDiscount}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, volumeDiscount: Number(e.target.value) })
                    }
                    className="w-full bg-surface-container-highest rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">
                    {t('admin.rfq.paymentTerms', 'Zahlungsbedingungen')}
                  </label>
                  <select
                    value={quoteForm.paymentTerms}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, paymentTerms: e.target.value })
                    }
                    className="w-full bg-surface-container-highest rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="prepaid">{t('admin.rfq.prepaid', 'Vorkasse')}</option>
                    <option value="net-30">{t('admin.rfq.net30', 'Netto 30 Tage')}</option>
                    <option value="net-60">{t('admin.rfq.net60', 'Netto 60 Tage')}</option>
                    <option value="cod">{t('admin.rfq.cod', 'Nachnahme')}</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">
                    {t('admin.rfq.deliveryTerms', 'Lieferbedingungen')}
                  </label>
                  <select
                    value={quoteForm.deliveryTerms}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, deliveryTerms: e.target.value })
                    }
                    className="w-full bg-surface-container-highest rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="ex works">EXW (Ab Werk)</option>
                    <option value="fob">FOB (Frei an Bord)</option>
                    <option value="cif">CIF (Kosten, Versicherung und Fracht)</option>
                    <option value="dap">DAP (Delivered at Place)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">
                    {t('admin.rfq.deliveryDate', 'Lieferdatum')}
                  </label>
                  <input
                    type="date"
                    value={quoteForm.deliveryDate}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, deliveryDate: e.target.value })
                    }
                    className="w-full bg-surface-container-highest rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">
                  {t('admin.rfq.notes', 'Notizen')}
                </label>
                <textarea
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  className="w-full bg-surface-container-highest rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                  placeholder={t('admin.rfq.notesPlaceholder', 'Besondere Bedingungen, Lieferbedingungen, etc.')}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-outline-variant/20 pt-4">
              <button
                onClick={() => setShowCreateQuoteModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold hover:bg-surface-container-low transition-colors"
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
              <button
                onClick={handleCreateQuote}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={16} /> {t('admin.rfq.create', 'Erstellen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Details Modal */}
      {showQuoteDetailsModal && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">{selectedQuote.quoteNumber}</h2>
              <button
                onClick={() => setShowQuoteDetailsModal(false)}
                className="p-1 hover:bg-surface-container-low rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-on-surface uppercase">{t('common.products', 'Produkte')}</h3>
              <div className="bg-surface-container-lowest rounded-lg overflow-hidden">
                {selectedQuote.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border-b border-outline-variant/10 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-on-surface">{item.productName}</p>
                      <p className="text-xs text-on-surface-variant">{item.productId}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-mono text-on-surface">{item.quantity}x {formatPrice(item.unitPrice)}</p>
                      <p className="text-xs text-on-surface-variant">{formatPrice(item.quantity * item.unitPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-surface-container-lowest rounded-lg p-4 space-y-3 border-t border-outline-variant/20 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('common.subtotal', 'Zwischensumme')}</span>
                <span className="font-mono">{formatPrice(selectedQuote.subtotal)}</span>
              </div>
              {selectedQuote.volumeDiscount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>-{selectedQuote.volumeDiscount}% {t('admin.rfq.discount', 'Rabatt')}</span>
                  <span className="font-mono">-{formatPrice(selectedQuote.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">{t('common.vat', 'MwSt')} ({selectedQuote.vatRate}%)</span>
                <span className="font-mono">{formatPrice(selectedQuote.vatAmount)}</span>
              </div>
              <div className="border-t border-outline-variant/20 pt-3 flex justify-between font-bold text-lg">
                <span>{t('common.total', 'Gesamt')}</span>
                <span className="text-primary">{formatPrice(selectedQuote.total)}</span>
              </div>
            </div>

            {/* Details */}
            <div className="grid sm:grid-cols-2 gap-4 border-t border-outline-variant/20 pt-4">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">{t('admin.rfq.paymentTerms', 'Zahlungsbedingungen')}</p>
                <p className="text-sm text-on-surface">{selectedQuote.paymentTerms}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">{t('admin.rfq.deliveryTerms', 'Lieferbedingungen')}</p>
                <p className="text-sm text-on-surface">{selectedQuote.deliveryTerms}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">{t('admin.rfq.validUntil', 'Gültig bis')}</p>
                <p className="text-sm text-on-surface">{formatDate(selectedQuote.validUntil)}</p>
              </div>
              {selectedQuote.deliveryDate && (
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">{t('admin.rfq.deliveryDate', 'Lieferdatum')}</p>
                  <p className="text-sm text-on-surface">{formatDate(selectedQuote.deliveryDate)}</p>
                </div>
              )}
            </div>

            {selectedQuote.notes && (
              <div className="bg-surface-container-lowest rounded-lg p-4 border-t border-outline-variant/20 pt-4">
                <p className="text-xs font-bold text-on-surface-variant uppercase mb-2">{t('admin.rfq.notes', 'Notizen')}</p>
                <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{selectedQuote.notes}</p>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowQuoteDetailsModal(false)}
              className="w-full py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold hover:bg-surface-container-low transition-colors"
            >
              {t('common.close', 'Schließen')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
