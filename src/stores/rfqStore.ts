import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuoteRequest, Quote } from '../lib/rfq';

interface RFQState {
  quoteRequests: QuoteRequest[];
  quotes: Quote[];
  loading: boolean;
  error: string | null;

  // Quote Requests
  createQuoteRequest: (request: QuoteRequest) => void;
  getQuoteRequests: (customerId: string) => QuoteRequest[];
  getQuoteRequestById: (id: string) => QuoteRequest | undefined;
  updateQuoteRequestStatus: (id: string, status: QuoteRequest['status']) => void;

  // Quotes
  createQuote: (quote: Quote) => void;
  getQuotesForRequest: (requestId: string) => Quote[];
  getQuoteById: (id: string) => Quote | undefined;
  updateQuoteStatus: (id: string, status: Quote['status']) => void;
  sendQuote: (id: string) => void;

  // Bulk operations
  deleteQuoteRequest: (id: string) => void;
  deleteQuote: (id: string) => void;
}

export const useRFQStore = create<RFQState>()(
  persist(
    (set, get) => ({
      quoteRequests: [],
      quotes: [],
      loading: false,
      error: null,

      createQuoteRequest: (request) => {
        set((state) => ({
          quoteRequests: [request, ...state.quoteRequests],
          error: null,
        }));
      },

      getQuoteRequests: (customerId) => {
        return get().quoteRequests.filter((r) => r.customerId === customerId);
      },

      getQuoteRequestById: (id) => {
        return get().quoteRequests.find((r) => r.id === id);
      },

      updateQuoteRequestStatus: (id, status) => {
        set((state) => ({
          quoteRequests: state.quoteRequests.map((r) =>
            r.id === id ? { ...r, status, updatedAt: new Date() } : r
          ),
        }));
      },

      createQuote: (quote) => {
        set((state) => ({
          quotes: [quote, ...state.quotes],
          error: null,
        }));
      },

      getQuotesForRequest: (requestId) => {
        return get().quotes.filter((q) => q.requestId === requestId);
      },

      getQuoteById: (id) => {
        return get().quotes.find((q) => q.id === id);
      },

      updateQuoteStatus: (id, status) => {
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, status } : q
          ),
        }));
      },

      sendQuote: (id) => {
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id
              ? { ...q, status: 'sent' as const, sentAt: new Date() }
              : q
          ),
        }));
      },

      deleteQuoteRequest: (id) => {
        set((state) => ({
          quoteRequests: state.quoteRequests.filter((r) => r.id !== id),
        }));
      },

      deleteQuote: (id) => {
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
        }));
      },
    }),
    {
      name: '2mc-rfq',
      version: 1,
      partialize: (state) => ({
        quoteRequests: state.quoteRequests,
        quotes: state.quotes,
      }),
    }
  )
);
