/**
 * ImportModelDialog — GLB'yi KALICI kütüphaneye yükleme akışı.
 *
 * Adımlar: dosya seç → ölçüler otomatik okunur (bounding box) → ad/kategori/
 * yönelim düzenlenir → yükleme (ilerleme %) → kütüphaneye eklenir.
 *
 * Yönelim (up-axis): Meshy/Blender çıktıları Y-up authored'dır ve Z-up
 * sahnemizde yan yatar; 'y' seçilirse katalog girişi `needsUprightTilt` ile
 * kaydedilir ve yükleyici +90° X eğimi uygular. Canlı önizleme seçimi anında
 * yansıtır, böylece kullanıcı doğru olanı gözle seçer.
 *
 * Oturum yoksa yükleme yapılmaz — çağıran taraf bu diyaloğu açmadan önce
 * oturumluk `importGlbFile` akışına yönlendirir.
 */

import { useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Box, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import {
  MAX_MODEL_BYTES,
  MODEL_ACCEPT_ATTR,
  uploadDesignModel,
  type DesignModel,
} from '../../../../../lib/designModelStore';
import { useDesignModelLibrary } from '../../../../../stores/designModelLibraryStore';
import { measureGlb } from '../loaders/customGlb';
import { loadModelViewerScript } from '../../../../../components/Model3DViewer';
import type { EquipmentCategory } from '../../../core/types';

const CATEGORY_OPTIONS: { id: EquipmentCategory; labelKey: string }[] = [
  { id: 'cooking', labelKey: 'design3d.category.cooking' },
  { id: 'refrigeration', labelKey: 'design3d.category.refrigeration' },
  { id: 'preparation', labelKey: 'design3d.category.preparation' },
  { id: 'washing', labelKey: 'design3d.category.washing' },
  { id: 'storage', labelKey: 'design3d.category.storage' },
  { id: 'ventilation', labelKey: 'design3d.category.ventilation' },
  { id: 'furniture', labelKey: 'design3d.category.furniture' },
  { id: 'other', labelKey: 'design3d.category.other' },
];

export interface ImportModelDialogProps {
  open: boolean;
  onClose: () => void;
  /** Yükleme bittiğinde (ör. modeli hemen sahneye yerleştirmek için). */
  onUploaded?: (model: DesignModel) => void;
}

type Step = 'pick' | 'form' | 'uploading' | 'done';

export default function ImportModelDialog({ open, onClose, onUploaded }: ImportModelDialogProps) {
  const { t } = useTranslation();
  const addModel = useDesignModelLibrary((s) => s.addModel);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('other');
  const [width, setWidth] = useState(800);
  const [depth, setDepth] = useState(700);
  const [height, setHeight] = useState(900);
  const [upAxis, setUpAxis] = useState<'y' | 'z'>('y');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState(false);

  useEffect(() => { if (open) loadModelViewerScript(); }, [open]);

  // Önizleme blob URL'i sızmasın.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep('pick');
    setFile(null);
    setPreviewUrl(null);
    setName('');
    setCategory('other');
    setWidth(800);
    setDepth(700);
    setHeight(900);
    setUpAxis('y');
    setPercent(0);
    setError(null);
    setMeasuring(false);
  };

  const close = () => { reset(); onClose(); };

  const pick = async (picked: File | null) => {
    if (!picked) return;
    if (!/\.glb$/i.test(picked.name)) {
      setError(t('design3d.library.errGlbOnly'));
      return;
    }
    if (picked.size > MAX_MODEL_BYTES) {
      setError(t('design3d.library.errTooBig', { mb: Math.floor(MAX_MODEL_BYTES / 1024 / 1024) }));
      return;
    }
    setError(null);
    setFile(picked);
    setName(picked.name.replace(/\.glb$/i, ''));
    const url = URL.createObjectURL(picked);
    setPreviewUrl(url);
    setStep('form');
    // Gerçek ölçüleri modelden oku — kullanıcı körlemesine rakam girmesin.
    setMeasuring(true);
    try {
      const dims = await measureGlb(url);
      setWidth(dims.width);
      setDepth(dims.depth);
      setHeight(dims.height);
    } finally {
      setMeasuring(false);
    }
  };

  const submit = async () => {
    if (!file || !name.trim()) {
      setError(t('design3d.library.errNameRequired'));
      return;
    }
    setStep('uploading');
    setPercent(0);
    setError(null);
    const res = await uploadDesignModel(
      file,
      { name: name.trim(), category, widthMm: width, depthMm: depth, heightMm: height, upAxis },
      setPercent,
    );
    if (!res.ok) {
      setError(res.error);
      setStep('form');
      return;
    }
    addModel(res.data);
    onUploaded?.(res.data);
    setStep('done');
  };

  if (!open) return null;

  // PORTAL ŞART: çağıran paneller `backdrop-blur` kullanıyor; backdrop-filter
  // `position: fixed` çocuklar için kapsayıcı blok oluşturur → portal olmadan
  // diyalog ekranı değil, panelin içini kaplar (ve overflow ile kırpılır).
  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4"
      onPointerDown={(e) => { if (e.target === e.currentTarget && step !== 'uploading') close(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <h3 className="text-[13px] font-semibold text-slate-800">
            {t('design3d.library.importTitle')}
          </h3>
          <button
            type="button"
            onClick={close}
            disabled={step === 'uploading'}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-40"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </header>

        <div className="p-4">
          {/* ── 1) Dosya seç ─────────────────────────────────────────── */}
          {step === 'pick' && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-10 hover:border-brand-red/50 hover:bg-brand-red/5 transition"
              >
                <Upload size={26} className="text-slate-400" />
                <span className="text-[12px] font-semibold text-slate-700">
                  {t('design3d.library.pickFile')}
                </span>
                <span className="text-[10px] text-slate-400">
                  .glb · {t('design3d.library.maxSize', { mb: Math.floor(MAX_MODEL_BYTES / 1024 / 1024) })}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={MODEL_ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => { void pick(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
            </>
          )}

          {/* ── 2) Meta veri ─────────────────────────────────────────── */}
          {step === 'form' && (
            <div className="space-y-3">
              {previewUrl && (
                <div className="h-40 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <ModelPreview src={previewUrl} tilted={upAxis === 'y'} />
                </div>
              )}

              <Field label={t('design3d.props.equipmentName')}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition"
                />
              </Field>

              <Field label={t('design3d.library.category')}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                  className="w-full h-9 px-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-brand-red transition bg-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{t(c.labelKey)}</option>
                  ))}
                </select>
              </Field>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-medium text-slate-600">
                    {t('design3d.dimensions')}
                  </span>
                  {measuring && <Loader2 size={11} className="animate-spin text-slate-400" />}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <NumBox label={t('design3d.props.dimW')} value={width} onChange={setWidth} />
                  <NumBox label={t('design3d.props.dimD')} value={depth} onChange={setDepth} />
                  <NumBox label={t('design3d.props.dimH')} value={height} onChange={setHeight} />
                </div>
                <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                  {t('design3d.props.dimsHelp')}
                </p>
              </div>

              <Field label={t('design3d.library.upAxis')}>
                <div className="flex gap-1.5">
                  <AxisBtn active={upAxis === 'y'} onClick={() => setUpAxis('y')} label={t('design3d.library.upAxisY')} />
                  <AxisBtn active={upAxis === 'z'} onClick={() => setUpAxis('z')} label={t('design3d.library.upAxisZ')} />
                </div>
                <p className="mt-1 text-[10px] text-slate-400 leading-snug">
                  {t('design3d.library.upAxisHelp')}
                </p>
              </Field>

              {error && <ErrorNote text={error} />}

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 h-9 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!name.trim()}
                  className="flex-1 h-9 rounded-xl bg-brand-red text-white text-[12px] font-semibold shadow-sm hover:brightness-110 disabled:opacity-40 transition"
                >
                  {t('design3d.library.upload')}
                </button>
              </div>
            </div>
          )}

          {/* ── 3) Yükleniyor ────────────────────────────────────────── */}
          {step === 'uploading' && (
            <div className="py-6 space-y-3">
              <div className="flex items-center justify-center gap-2 text-[12px] text-slate-600">
                <Loader2 size={14} className="animate-spin" />
                {t('design3d.library.uploading')}
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-red transition-[width] duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-center text-[11px] tabular-nums text-slate-400">{percent}%</p>
            </div>
          )}

          {/* ── 4) Bitti ─────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="py-4 space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50 px-3 py-2.5">
                <CheckCircle2 size={16} className="mt-0.5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-emerald-900">
                    {t('design3d.library.uploadSuccess')}
                  </p>
                  <p className="text-[11px] text-emerald-700 leading-snug">
                    {t('design3d.library.savedHint')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-full h-9 rounded-xl bg-brand-red text-white text-[12px] font-semibold shadow-sm hover:brightness-110 transition"
              >
                {t('common.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── UI atoms ────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[11px] font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function NumBox({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="block mb-0.5 text-[10px] text-slate-500">{label}</span>
      <input
        type="number"
        min={10}
        max={20000}
        step={10}
        value={value}
        onChange={(e) => onChange(Math.max(10, Math.min(20000, Number(e.target.value) || 10)))}
        className="w-full h-8 px-2 rounded-lg border border-slate-200 text-[12px] tabular-nums outline-none focus:border-brand-red transition"
      />
    </label>
  );
}

function AxisBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 h-8 rounded-lg border text-[11px] font-medium transition',
        active ? 'bg-brand-red text-white border-brand-red' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5 rounded-xl border border-red-200/70 bg-red-50 px-2.5 py-2">
      <AlertCircle size={13} className="mt-0.5 text-red-500 shrink-0" />
      <p className="text-[11px] leading-snug text-red-700">{text}</p>
    </div>
  );
}

type ModelViewerProps = {
  src?: string;
  'camera-orbit'?: string;
  'auto-rotate'?: boolean;
  'interaction-prompt'?: string;
  'shadow-intensity'?: string;
  orientation?: string;
  style?: CSSProperties & Record<string, string | number>;
  children?: ReactNode;
};
const ModelViewer = 'model-viewer' as unknown as FC<ModelViewerProps>;

/** Canlı önizleme — 'y' seçiliyse sahnedeki dik duruşu taklit eden eğim uygulanır. */
function ModelPreview({ src, tilted }: { src: string; tilted: boolean }) {
  return (
    <ModelViewer
      src={src}
      camera-orbit="35deg 72deg auto"
      auto-rotate
      interaction-prompt="none"
      shadow-intensity="0.4"
      orientation={tilted ? '0deg 0deg 0deg' : '-90deg 0deg 0deg'}
      style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
    >
      <div slot="poster" className="w-full h-full grid place-items-center">
        <Box size={22} className="text-brand-red/50" />
      </div>
    </ModelViewer>
  );
}
