import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { chatWithAI, type ChatMessage } from '../lib/ai';
import { trackEvent } from '../lib/analytics';

const STORAGE_KEY = '2mc-sales-chat-history';

const INTRO =
  'Merhaba! 2MC Gastro satış asistanıyım. Size hangi ekipmanı önereceğimi bulmam için işletme tipinizi, kapasiteyi ve bütçenizi paylaşabilirsiniz. Kombi fırın, fritöz, buzdolabı… ne arıyorsunuz?';

export default function SalesChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setSending(true);
    trackEvent('sales_chat_message', { len: text.length });

    try {
      let acc = '';
      for await (const chunk of chatWithAI({ messages: history, context: 'catalog' })) {
        acc += chunk;
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: 'assistant', content: acc };
          return next;
        });
      }
    } catch (e: any) {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: 'assistant',
          content: 'Üzgünüm, şu an yanıt veremiyorum. Lütfen WhatsApp +49 176 70295844 numarasından ulaşın.',
        };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          trackEvent('sales_chat_open');
        }}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 px-4 py-3 bg-[#DC2626] text-white rounded-full shadow-lg hover:bg-[#991B1B] transition"
        aria-label="Satış asistanı"
      >
        <MessageCircle size={20} />
        <span className="font-semibold text-sm hidden sm:inline">Satış Asistanı</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-2.5rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white">
        <div className="flex items-center gap-2">
          <Sparkles size={18} />
          <div>
            <div className="font-bold text-sm">2MC Gastro Asistanı</div>
            <div className="text-[11px] text-red-100">Anında ürün önerisi</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded">
          <X size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-700">
            {INTRO}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'ml-auto bg-[#DC2626] text-white'
                : 'bg-white border border-slate-200 text-slate-800'
            }`}
          >
            {m.content || (sending && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Sorunuzu yazın…"
            disabled={sending}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#DC2626]"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="p-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#991B1B] disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="mt-2 text-[11px] text-slate-400 hover:text-slate-600">
            Konuşmayı sıfırla
          </button>
        )}
      </div>
    </div>
  );
}
