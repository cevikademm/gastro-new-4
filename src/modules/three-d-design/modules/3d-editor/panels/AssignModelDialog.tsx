/**
 * AssignModelDialog — bir ÜRÜN ÖRNEĞİNE 3B model atar (`Equipment.modelRef`).
 *
 * Neden ayrı bir alan: `catalogId` ticari kimliktir (teklif satırı, "her yerden
 * sil" köprüsü). Kullanıcı ürünün görselini değiştirmek istediğinde ticari
 * kimliği bozmadan yalnız `modelRef` yazılır; model silinirse çözümleme
 * sessizce `catalogId`'ye geri düşer.
 *
 * Kaynaklar:
 *   • Kütüphanem — kalıcı GLB'ler (kendi + ortak)
 *   • Yükle       — yeni .glb (oturum varsa kalıcı, yoksa oturumluk)
 *   • MeshAI      — ürün fotoğrafından üretim; YALNIZ admin (kredi harcar)
 *   • Varsayılan  — atamayı kaldır
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Box, Check, Loader2, RotateCcw, Sparkles, Upload, X } from 'lucide-react';
import type { Equipment } from '../../../core/types';
import { useAuthStore } from '../../../../../stores/authStore';
import { useDesignModelLibrary } from '../../../../../stores/designModelLibraryStore';
import { useEquipmentStore } from '../../../../../stores/equipmentStore';
import { meshyGenerate, productKeyFor } from '../../../../../lib/meshyClient';
import { registerCustomGlb } from '../loaders/equipmentCatalog';
import { catalogIdForModel } from '../loaders/designModelRegistry';
import ImportModelDialog from './ImportModelDialog';

export interface AssignModelDialogProps {
  open: boolean;
  equipment: Equipment | null;
  onClose: () => void;
  /** `null` → atamayı kaldır (varsayılan modele dön). */
  onAssign: (modelRef: string | null) => void;
}

export default function AssignModelDialog({ open, equipment, onClose, onAssign }: AssignModelDialogProps) {
  const { t } = useTranslation();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const models = useDesignModelLibrary((s) => s.models);
  const loading = useDesignModelLibrary((s) => s.loading);
  const refresh = useDesignModelLibrary((s) => s.refresh);
  const loadedAt = useDesignModelLibrary((s) => s.loadedAt);

  const [importOpen, setImportOpen] = useState(false);
  const [meshyBusy, setMeshyBusy] = useState(false);
  const [meshyMsg, setMeshyMsg] = useState<string | null>(null);
  const [meshyErr, setMeshyErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && loadedAt === 0) void refresh();
  }, [open, loadedAt, refresh]);

  // Ürünün katalog kaydı — MeshAI üretimi için fotoğraf gerekir.
  const productItem = useEquipmentStore((s) => s.getItemById);
  const sourceImage = useMemo(() => {
    if (!equipment) return '';
    return productItem(equipment.catalogId)?.img ?? '';
  }, [equipment, productItem]);

  if (!open || !equipment) return null;

  const currentRef = equipment.modelRef ?? null;

  const runMeshy = async () => {
    if (!sourceImage) {
      setMeshyErr(t('design3d.assign.meshyNoImage'));
      return;
    }
    setMeshyBusy(true);
    setMeshyErr(null);
    setMeshyMsg(t('design3d.assign.meshyStarted'));
    try {
      const row = await meshyGenerate(
        {
          productKey: productKeyFor(sourceImage, equipment.catalogId),
          name: equipment.name,
          imageUrl: sourceImage,
        },
        (r) => setMeshyMsg(t('design3d.assign.meshyProgress', { percent: Math.round(r.progress || 0) })),
      );
      if (row.status !== 'done' || !row.glb_url) {
        setMeshyErr(row.error || t('design3d.assign.meshyFailed'));
        return;
      }
      // Üretilen GLB'yi oturum kaydına al ve bu örneğe ata.
      const refId = `meshy-${row.id}`;
      registerCustomGlb({
        id: refId,
        name: equipment.name,
        category: equipment.category,
        dimensionsMm: {
          width: equipment.footprint.width,
          depth: equipment.footprint.depth,
          height: equipment.heightMm,
        },
        glbUrl: row.glb_url,
        anchor: 'bottom-center',
        thumbnailUrl: row.thumbnail_url ?? undefined,
        defaultRotationDeg: 0,
        needsUprightTilt: true, // MeshAI çıktısı Y-up
      });
      onAssign(refId);
      onClose();
    } catch (e) {
      setMeshyErr((e as Error)?.message || t('design3d.assign.meshyFailed'));
    } finally {
      setMeshyBusy(false);
      setMeshyMsg(null);
    }
  };

  // PORTAL ŞART: özellik paneli `backdrop-blur` kullanıyor; backdrop-filter
  // `position: fixed` çocuklar için kapsayıcı blok oluşturur → portal olmadan
  // diyalog ekranı değil, dar paneli kaplar.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4"
      onPointerDown={(e) => { if (e.target === e.currentTarget && !meshyBusy) onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-slate-800 truncate">
              {t('design3d.assign.title')}
            </h3>
            <p className="text-[11px] text-slate-400 truncate">{equipment.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={meshyBusy}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-40"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </header>

        {/* ── Eylemler ─────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Upload size={12} />
            {t('design3d.assign.uploadNew')}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => void runMeshy()}
              disabled={meshyBusy || !sourceImage}
              title={sourceImage ? t('design3d.assign.meshyTitle') : t('design3d.assign.meshyNoImage')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-slate-900 text-white text-[11px] font-semibold hover:brightness-125 disabled:opacity-40 transition"
            >
              {meshyBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {t('design3d.assign.meshyGenerate')}
            </button>
          )}
          {currentRef && (
            <button
              type="button"
              onClick={() => { onAssign(null); onClose(); }}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <RotateCcw size={12} />
              {t('design3d.assign.reset')}
            </button>
          )}
        </div>

        {(meshyMsg || meshyErr) && (
          <div className="px-4 pt-3">
            <p
              className={[
                'rounded-xl px-2.5 py-2 text-[11px] leading-snug border',
                meshyErr
                  ? 'bg-red-50 border-red-200/70 text-red-700'
                  : 'bg-slate-50 border-slate-200/70 text-slate-600',
              ].join(' ')}
            >
              {meshyErr ?? meshyMsg}
            </p>
          </div>
        )}

        {/* ── Kütüphane seçici ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-2 text-[11px] font-medium text-slate-600">
            {t('design3d.assign.fromLibrary')}
          </p>
          {loading && models.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[11px] text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              {t('common.loading')}
            </div>
          ) : models.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-400 leading-relaxed">
              {t('design3d.library.empty')}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-1.5">
              {models.map((m) => {
                const refId = catalogIdForModel(m.id);
                const active = refId === currentRef;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => { onAssign(refId); onClose(); }}
                      className={[
                        'w-full flex items-center gap-2 p-2 rounded-xl border text-left transition',
                        active
                          ? 'bg-brand-red/5 border-brand-red/40 ring-1 ring-brand-red/20'
                          : 'bg-white border-slate-200/70 hover:border-brand-red/40 hover:shadow-sm',
                      ].join(' ')}
                    >
                      <div className="relative flex-shrink-0 w-10 h-10 bg-slate-50 border border-slate-200/70 rounded-lg overflow-hidden grid place-items-center">
                        {m.thumbnail_url ? (
                          <img src={m.thumbnail_url} alt="" className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <Box size={16} className="text-brand-red/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-slate-800 truncate">{m.name}</div>
                        <div className="text-[10px] text-slate-500 tabular-nums truncate">
                          {Math.round(m.width_mm)}×{Math.round(m.depth_mm)}×{Math.round(m.height_mm)}
                        </div>
                      </div>
                      {active && <Check size={13} className="text-brand-red shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Yükleme bitince yeni model doğrudan bu örneğe atanır. */}
      <ImportModelDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onUploaded={(model) => {
          setImportOpen(false);
          onAssign(catalogIdForModel(model.id));
          onClose();
        }}
      />
    </div>,
    document.body,
  );
}
