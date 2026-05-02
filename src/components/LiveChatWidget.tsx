import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, X, Send, Bot, User as UserIcon, Loader2, Sparkles,
  ThumbsUp, ThumbsDown, RefreshCw, Minimize2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { chatWithAI, type ChatMessage } from '../lib/ai';

interface Message extends ChatMessage {
  id: string;
  streaming?: boolean;
  error?: boolean;
}

const STORAGE_KEY = 'gastro.chat.history';
const QUICK_REPLIES = [
  'Kombi fırın önerir misin?',
  'Kargo ne kadar sürer?',
  'İade koşulları nedir?',
  'Mutfak planlayıcı nasıl çalışır?',
];

function uid() { return Math.random().toString(36).slice(2, 10); }

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveHistory(msgs: Message[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30))); } catch {}
}

export default function LiveChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [unread, setUnread] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMessages(loadHistory()); }, []);
  useEffect(() => { saveHistory(messages); }, [messages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;

    const userMsg: Message = { id: uid(), role: 'user', content };
    const assistantId = uid();
    const placeholder: Message = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput('');
    setStreaming(true);

    try {
      const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role, content: m.content,
      }));

      let full = '';
      for await (const chunk of chatWithAI({ messages: history, context: 'support' })) {
        full += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
        );
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      if (!open) setUnread((n) => n + 1);
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, streaming: false, error: true, content: 'Bağlantı kurulamadı. Lütfen tekrar deneyin.' }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {/* Floating Bubble */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="bubble"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            onClick={() => { setOpen(true); setMinimized(false); }}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[90] group"
            aria-label="Canlı destek"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#E85D26] to-[#C44A1A] rounded-full blur-xl opacity-50 group-hover:opacity-75 transition" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#E85D26] to-[#C44A1A] shadow-2xl flex items-center justify-center text-white hover:scale-110 transition">
              <MessageCircle size={24} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unread}
                </span>
              )}
              <motion.span
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-white/40"
              />
            </div>
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none">
              AI Asistan · 7/24
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="window"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`fixed z-[95] bg-white shadow-2xl flex flex-col overflow-hidden ${
              minimized
                ? 'bottom-4 right-4 w-72 h-14 rounded-2xl'
                : 'bottom-0 right-0 w-full h-[100dvh] md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] md:max-h-[85vh] md:rounded-3xl'
            }`}
          >
            {/* Header */}
            <div
              onClick={() => minimized && setMinimized(false)}
              className={`flex items-center justify-between px-4 py-3 bg-gradient-to-br from-[#E85D26] via-[#6B1A22] to-[#C44A1A] text-white ${minimized ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Bot size={18} />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <div>
                  <p className="font-bold text-sm flex items-center gap-1">
                    2MC Gastro Asistan
                    <Sparkles size={12} className="text-yellow-300" />
                  </p>
                  <p className="text-[10px] text-white/80">
                    {streaming ? 'Yazıyor...' : 'Çevrimiçi · Anında yanıt'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!minimized && messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition"
                    title="Sohbeti temizle"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                <button
                  onClick={() => setMinimized((v) => !v)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition hidden md:block"
                  title="Küçült"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition"
                  title="Kapat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Body */}
                <div
                  ref={bodyRef}
                  className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3"
                >
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-50 to-rose-100 rounded-full flex items-center justify-center mb-3">
                        <Bot className="text-[#E85D26]" size={28} />
                      </div>
                      <h3 className="font-bold text-slate-900">Merhaba! 👋</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto">
                        Mutfak ekipmanları, sipariş durumu, teknik destek — ne sorarsan sor. AI asistanınız anında yanıtlar.
                      </p>
                    </div>
                  )}

                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E85D26] to-[#C44A1A] flex-shrink-0 flex items-center justify-center text-white">
                          <Bot size={14} />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          m.role === 'user'
                            ? 'bg-[#E85D26] text-white rounded-br-sm'
                            : m.error
                            ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {m.content || (m.streaming && (
                          <span className="inline-flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </span>
                        ))}
                        {m.role === 'assistant' && m.content && !m.streaming && !m.error && (
                          <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                            <button className="text-slate-300 hover:text-emerald-500 transition">
                              <ThumbsUp size={11} />
                            </button>
                            <button className="text-slate-300 hover:text-red-500 transition">
                              <ThumbsDown size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                      {m.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500">
                          <UserIcon size={14} />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {messages.length === 0 && (
                    <div className="space-y-2 mt-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                        Hızlı sorular
                      </p>
                      {QUICK_REPLIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-xl text-xs text-slate-700 transition"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                  className="p-3 border-t border-slate-100 bg-white"
                >
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={streaming ? 'AI düşünüyor...' : 'Mesajınızı yazın...'}
                      disabled={streaming}
                      className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:border-[#E85D26] focus:ring-2 focus:ring-red-100 outline-none transition disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || streaming}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E85D26] to-[#C44A1A] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition"
                    >
                      {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 text-center mt-2">
                    Claude AI ile güçlendirildi · Yanıtlar yönlendirme amaçlıdır
                  </p>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
