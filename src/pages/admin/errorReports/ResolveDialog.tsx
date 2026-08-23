/**
 * ResolveDialog — "Çözüldü" işaretini portal yayınına bağlayan pencere.
 *
 * NEDEN: Eskiden "Çözüldü" tek tıkla yalnızca kaydın durumunu değiştiriyordu;
 * /degisiklikler sayfasına hiçbir şey düşmediği için sorunu bildiren kişi
 * sonucu göremiyordu. Artık kapatırken kullanıcıya görünecek sade dil özeti
 * de alınıyor (migration 043 · publish_manual_resolution).
 *
 * Özet zorunlu değil — "Portalda yayınla" kapatılırsa kayıt sessizce kapanır.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import type { ChangelogCategory } from '../../../lib/changelog';

const CATEGORIES: Array<{ key: ChangelogCategory; label: string; color: string }> = [
  { key: 'fix', label: 'Düzeltme', color: '#16A34A' },
  { key: 'improvement', label: 'İyileştirme', color: '#0EA5E9' },
  { key: 'feature', label: 'Yenilik', color: '#931315' },
];

export interface ResolveResult {
  summary: string;
  detail: string;
  category: ChangelogCategory;
  publish: boolean;
}

export interface ResolveDialogProps {
  open: boolean;
  /** Kaydın kendi metni — özet yazarken referans olsun diye gösterilir. */
  reference?: string | null;
  /** Ajan/AI daha önce özet ürettiyse alan bununla dolu açılır. */
  defaultSummary?: string | null;
  defaultDetail?: string | null;
  /** Sistem logları için varsayılan kapalı — her log portala düşmemeli. */
  defaultPublish?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: (v: ResolveResult) => void;
  onCancel: () => void;
}

export default function ResolveDialog({
  open,
  reference,
  defaultSummary,
  defaultDetail,
  defaultPublish = true,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ResolveDialogProps) {
  const [summary, setSummary] = useState('');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState<ChangelogCategory>('fix');
  const [publish, setPublish] = useState(defaultPublish);

  // Her açılışta ilgili kaydın değerleriyle sıfırlan.
  useEffect(() => {
    if (!open) return;
    setSummary(defaultSummary || '');
    setDetail(defaultDetail || '');
    setCategory('fix');
    setPublish(defaultPublish);
  }, [open, defaultSummary, defaultDetail, defaultPublish]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const summaryOk = summary.trim().length >= 5;
  const canSubmit = !busy && (!publish || summaryOk);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">Çözüldü olarak işaretle</h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">
                Yazdığınız özet <b>/degisiklikler</b> sayfasında yayınlanır ve sorunu bildiren
                kişiye bildirim gider.
              </p>
            </div>
          </div>

          {reference && (
            <div className="mt-4 max-h-24 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600 whitespace-pre-wrap">
              <b className="text-slate-500">Bildirilen sorun:</b> {reference}
            </div>
          )}

          <label className="mt-4 block text-[12px] font-bold text-slate-700">
            Kullanıcıya görünecek açıklama
          </label>
          <textarea
            autoFocus
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Örn: Teklif PDF'inde fiyatlar yanlış hizalanıyordu, düzeltildi."
            className="mt-1 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Sade dilde yazın — dosya adı, kod veya teknik terim kullanmayın.
          </p>

          <label className="mt-3 block text-[12px] font-bold text-slate-700">
            Teknik not <span className="font-normal text-slate-400">(isteğe bağlı — yalnızca admin görür)</span>
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-y rounded-xl border border-slate-200 p-3 text-[13px] text-slate-700 outline-none focus:border-slate-300"
          />

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className="rounded-full border px-3 py-1 text-[11.5px] font-extrabold transition"
                  style={
                    active
                      ? { background: c.color, borderColor: c.color, color: '#fff' }
                      : { background: `${c.color}12`, borderColor: `${c.color}44`, color: c.color }
                  }
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span className="text-[12.5px] leading-relaxed text-slate-600">
              <b className="text-slate-800 inline-flex items-center gap-1">
                <Sparkles size={12} /> Değişiklikler sayfasında yayınla
              </b>
              <br />
              Kapatırsanız kayıt kapanır ama kullanıcı tarafında görünmez.
            </span>
          </label>

          {publish && !summaryOk && (
            <p className="mt-2 text-[12px] font-semibold text-amber-600">
              Yayınlamak için en az birkaç kelimelik bir açıklama yazın.
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[12px] font-semibold text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => onConfirm({ summary: summary.trim(), detail: detail.trim(), category, publish })}
              disabled={!canSubmit}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {publish ? 'Çöz ve Yayınla' : 'Çözüldü İşaretle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
