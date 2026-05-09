import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';

/**
 * Floating widgets: WhatsApp button (bottom-right) + live chat bubble (bottom-left).
 */
export function FloatingWidgets() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShowTooltip(true), 4000);
    const t2 = window.setTimeout(() => setShowTooltip(false), 9000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes fw-wobble {
          0%,45% { transform: rotate(0) }
          50% { transform: rotate(-10deg) }
          55% { transform: rotate(10deg) }
          60% { transform: rotate(-8deg) }
          65%,100% { transform: rotate(0) }
        }
        @keyframes fw-ripple {
          0% { transform: scale(1); opacity: .6 }
          100% { transform: scale(1.4); opacity: 0 }
        }
        @keyframes fw-slideup {
          from { opacity:0; transform: translateY(40px) }
          to { opacity:1; transform: translateY(0) }
        }
      `}</style>

      {/* WhatsApp tooltip */}
      {showTooltip && (
        <div
          className="fixed bottom-[36px] right-[100px] z-[89] px-4 py-3 bg-white rounded-xl flex items-center gap-2 text-[13px] font-semibold text-[color:var(--c-ink)] pointer-events-none"
          style={{ boxShadow: '0 24px 64px rgba(11,26,46,0.16)' }}
        >
          💬 Hemen fiyat teklifi al — yanıt 2 dakika
          <span
            className="absolute right-[-6px] top-1/2 -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '6px solid white',
            }}
          />
        </div>
      )}

      {/* WhatsApp */}
      <a
        href="https://wa.me/905555555555"
        aria-label="WhatsApp ile iletişime geç"
        className="fixed bottom-6 right-6 z-[90] w-16 h-16 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
        style={{
          background: '#25D366',
          boxShadow: '0 10px 30px rgba(37,211,102,0.4)',
          animation: 'fw-wobble 4s infinite',
        }}
      >
        <span
          className="absolute inset-[-6px] rounded-full pointer-events-none"
          style={{
            border: '2px solid #25D366',
            opacity: 0.5,
            animation: 'fw-ripple 2s infinite',
          }}
        />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      </a>

      {/* Live chat bubble */}
      {chatOpen && (
        <div
          className="hidden sm:flex fixed bottom-6 left-6 z-[80] items-center gap-3 bg-[#0a0a0a] border border-white/10 p-4 rounded-[20px] max-w-xs"
          style={{
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            animation: 'fw-slideup 0.6s cubic-bezier(.2,.8,.2,1) 2s backwards',
          }}
        >
          <button
            onClick={() => setChatOpen(false)}
            aria-label="Kapat"
            className="absolute top-1.5 right-2 p-1 text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
          <div className="relative w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[18px] shrink-0"
            style={{ background: 'linear-gradient(135deg, #DC2626 0%, #FFD089 100%)' }}>
            AD
            <span
              className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0a]"
              style={{ background: '#2e7d32' }}
            />
          </div>
          <div className="text-[13px]">
            <strong className="block text-white mb-0.5">
              Adem · Gastro Danışmanı
            </strong>
            <p className="text-white/60 leading-snug mb-1.5">
              Merhaba! Mutfak projen için 5 dakikada ücretsiz teklif hazırlayalım.
            </p>
            <Link
              to="/support"
              className="inline-flex items-center gap-1 text-brand-red font-bold text-[12px]"
            >
              Sohbete başla <ArrowRight size={12} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
