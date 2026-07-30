// ─── AI Düzeltme Prompt'u Modalı ─────────────────────────────────────
// Hem "Bildirimler" (error_reports) hem "Sistem Logları" (error_logs)
// sekmesi aynı modalı kullanır — prompt tek yerde gösterilsin.
import { useState } from 'react';
import { Sparkles, Copy, RefreshCw, Loader2, X } from 'lucide-react';
import { copyText } from '../../../lib/fixPrompt';

const BRAND = '#931315';

export interface PromptModalProps {
  prompt: string;
  model?: string | null;
  subtitle?: string | null;
  busy?: boolean;
  onRegenerate?: () => void;
  onClose: () => void;
}

export default function PromptModal({
  prompt, model, subtitle, busy = false, onRegenerate, onClose,
}: PromptModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(prompt);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI düzeltme prompt'u"
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-surface-container-lowest text-on-surface rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-outline-variant/20">
          <Sparkles size={18} style={{ color: BRAND }} />
          <div className="flex-1 min-w-0">
            <h3 className="font-black leading-tight">Düzeltme Prompt'u</h3>
            <p className="text-[11.5px] text-on-surface-variant mt-0.5 truncate">
              {model || 'claude-haiku-4-5'}{subtitle ? ` · ${subtitle}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="w-8 h-8 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low inline-flex items-center justify-center shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <pre className="flex-1 overflow-y-auto px-5 py-4 text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono">
          {prompt}
        </pre>

        <div className="flex gap-2 px-5 py-3.5 border-t border-outline-variant/20">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-extrabold inline-flex items-center justify-center gap-2"
            style={{ background: BRAND }}
          >
            <Copy size={15} /> {copied ? 'Kopyalandı ✓' : 'Panoya Kopyala'}
          </button>
          {onRegenerate && (
            <button
              disabled={busy}
              onClick={onRegenerate}
              className="px-4 py-2.5 rounded-xl border border-outline-variant/20 text-sm font-semibold hover:bg-surface-container-low disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Yeniden Üret
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
