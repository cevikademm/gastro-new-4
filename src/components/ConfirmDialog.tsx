/**
 * ConfirmDialog — modern, yeniden kullanılabilir onay penceresi.
 *
 * NEDEN: Yerel `window.confirm()` çok eski/kaba görünüyor ve markayla uyumsuz.
 * Bu bileşen; blur'lu arka plan, animasyonlu ikon rozeti (halka nabzı), degrade
 * tehlike butonu, klavye (Esc = vazgeç, Enter = onayla) ve `busy` (spinner)
 * durumuyla çağdaş bir onay deneyimi verir. Silme gibi geri alınamaz işlemler
 * için `tone="danger"`.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  /** İkon rozetindeki simge (varsayılan: danger→çöp, default→uyarı). */
  icon?: ReactNode;
  /** İşlem sürüyor → butonlar kilitli + spinner. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Sil',
  cancelLabel = 'Vazgeç',
  tone = 'danger',
  icon,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [shown, setShown] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    // Bir kare sonra "shown" → giriş animasyonu (fade + scale) tetiklensin.
    const raf = requestAnimationFrame(() => setShown(true));
    // Yıkıcı işlemde kaza olmasın diye odak "Vazgeç"e.
    const focus = window.setTimeout(() => cancelRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(focus);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onCancel, onConfirm]);

  if (!open) return null;
  const danger = tone === 'danger';
  const defaultIcon = danger ? <Trash2 size={22} /> : <AlertTriangle size={22} />;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Arka plan */}
      <div
        className={[
          'absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200',
          shown ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={busy ? undefined : onCancel}
      />

      {/* Kart */}
      <div
        className={[
          'relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5',
          'transition-all duration-200 ease-out',
          shown ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2',
        ].join(' ')}
      >
        {/* Üst degrade şerit */}
        <div
          className={[
            'h-1.5 w-full',
            danger
              ? 'bg-gradient-to-r from-rose-500 via-[#931315] to-rose-600'
              : 'bg-gradient-to-r from-slate-400 to-slate-500',
          ].join(' ')}
        />

        <div className="p-6 sm:p-7">
          {/* Animasyonlu ikon rozeti (halka nabzı + degrade) */}
          <div className="relative mx-auto mb-5 h-16 w-16">
            <span
              className={[
                'absolute inset-0 rounded-full',
                danger ? 'bg-rose-500/10' : 'bg-slate-500/10',
              ].join(' ')}
              style={{ animation: 'ping 2.2s cubic-bezier(0,0,0.2,1) infinite' }}
            />
            <span
              className={[
                'absolute inset-1.5 rounded-full',
                danger ? 'bg-rose-500/15' : 'bg-slate-500/15',
              ].join(' ')}
            />
            <span
              className={[
                'absolute inset-3 flex items-center justify-center rounded-full text-white shadow-lg',
                danger
                  ? 'bg-gradient-to-br from-rose-500 to-[#931315] shadow-rose-500/30'
                  : 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-500/30',
              ].join(' ')}
            >
              {icon ?? defaultIcon}
            </span>
          </div>

          <h3 className="text-center text-lg font-black text-slate-900">{title}</h3>
          {description && (
            <div className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-slate-500">
              {description}
            </div>
          )}

          {/* Butonlar */}
          <div className="mt-6 flex gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={[
                'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60',
                danger
                  ? 'bg-gradient-to-br from-rose-500 to-[#931315] shadow-rose-500/25 hover:brightness-110'
                  : 'bg-slate-800 shadow-slate-500/20 hover:bg-slate-900',
              ].join(' ')}
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                danger && <Trash2 size={15} />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
