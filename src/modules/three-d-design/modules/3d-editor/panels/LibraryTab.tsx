/**
 * LibraryTab — "Kütüphanem" sekmesi (kalıcı kullanıcı GLB'leri).
 *
 * Katalog sekmesiyle AYNI kart etkileşimi: tek tık → sahneye yerleştir,
 * Shift+tık → zemine tıklayarak hassas yerleştirme (arm). Fark, kaynağın
 * Supabase `design_models` tablosu olması ve kartların sahip/paylaşım
 * eylemleri taşıması.
 *
 * Yetki:
 *   • Anonim ziyaretçi — yalnız ortak kütüphaneyi görür, yükleyemez.
 *   • Sahip — kendi modelini siler / yeniden adlandırır.
 *   • Admin — her modeli siler ve "ortak kütüphaneye" açar/kapatır.
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Box, Globe, Loader2, Lock, Trash2, Upload, User as UserIcon } from 'lucide-react';
import type { EquipmentItem } from '../../../../../stores/equipmentStore';
import { useAuthStore } from '../../../../../stores/authStore';
import { useDesignModelLibrary } from '../../../../../stores/designModelLibraryStore';
import type { DesignModel } from '../../../../../lib/designModelStore';
import { catalogIdForModel } from '../loaders/designModelRegistry';
import ConfirmDialog from '../../../../../components/ConfirmDialog';

/** Kütüphane satırını, yerleştirme yolunun beklediği ürün öğesine çevir. */
export function modelToEquipmentItem(model: DesignModel, brandLabel: string): EquipmentItem {
  return {
    id: catalogIdForModel(model.id),
    name: model.name,
    desc: '',
    cat: '',
    sub: '',
    fam: '',
    img: model.thumbnail_url ?? '',
    brand: brandLabel,
    l: Math.round(model.width_mm),
    w: Math.round(model.depth_mm),
    h: String(Math.round(model.height_mm)),
    kw: 0,
    price: 0,
    line: 'Library',
  };
}

type ScopeFilter = 'all' | 'mine' | 'shared';

export interface LibraryTabProps {
  armedProductId: string | null;
  onArm: (item: EquipmentItem | null) => void;
  onPlace?: (item: EquipmentItem) => void;
  onPreload?: (item: EquipmentItem) => void;
  /** Yükleme diyaloğunu aç (oturum varsa kalıcı, yoksa oturumluk akış). */
  onUploadClick: () => void;
  /** Arama kutusundaki metin (üst panelle paylaşılır). */
  search: string;
}

export default function LibraryTab({
  armedProductId,
  onArm,
  onPlace,
  onPreload,
  onUploadClick,
  search,
}: LibraryTabProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const models = useDesignModelLibrary((s) => s.models);
  const loading = useDesignModelLibrary((s) => s.loading);
  const error = useDesignModelLibrary((s) => s.error);
  const refresh = useDesignModelLibrary((s) => s.refresh);
  const removeModel = useDesignModelLibrary((s) => s.remove);
  const setShared = useDesignModelLibrary((s) => s.setShared);
  const loadedAt = useDesignModelLibrary((s) => s.loadedAt);

  const [scope, setScope] = useState<ScopeFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<DesignModel | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Sekme ilk açıldığında bir kez çek (Editor3D mount'ta da tazeler).
  useEffect(() => {
    if (loadedAt === 0) void refresh();
  }, [loadedAt, refresh]);

  const brandLabel = t('design3d.library.brand');

  const visible = useMemo(() => {
    let list = models;
    if (scope === 'mine') list = list.filter((m) => m.user_id === user?.id);
    else if (scope === 'shared') list = list.filter((m) => m.is_shared);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [models, scope, search, user?.id]);

  const mineCount = useMemo(
    () => (user ? models.filter((m) => m.user_id === user.id).length : 0),
    [models, user],
  );
  const sharedCount = useMemo(() => models.filter((m) => m.is_shared).length, [models]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setBusyId(target.id);
    await removeModel(target.id);
    setBusyId(null);
  };

  const handleShareToggle = async (model: DesignModel) => {
    setBusyId(model.id);
    await setShared(model.id, !model.is_shared);
    setBusyId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* ── Kapsam çipleri ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <ScopeChip label={t('common.all')} active={scope === 'all'} onClick={() => setScope('all')} />
        <ScopeChip
          label={t('design3d.library.mine')}
          count={mineCount}
          icon={<UserIcon size={10} />}
          active={scope === 'mine'}
          onClick={() => setScope('mine')}
        />
        <ScopeChip
          label={t('design3d.library.shared')}
          count={sharedCount}
          icon={<Globe size={10} />}
          active={scope === 'shared'}
          onClick={() => setScope('shared')}
        />
      </div>

      {/* ── Yükleme düğmesi ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onUploadClick}
        className="w-full h-9 mb-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-red/40 text-[11px] font-semibold text-brand-red hover:bg-brand-red/5 transition"
      >
        <Upload size={12} />
        {t('design3d.library.uploadModel')}
      </button>

      {!user && (
        <p className="mb-2.5 rounded-xl bg-amber-50 border border-amber-200/70 px-2.5 py-2 text-[10px] leading-snug text-amber-800">
          {t('design3d.library.anonymousHint')}
        </p>
      )}

      {error && (
        <p className="mb-2.5 rounded-xl bg-red-50 border border-red-200/70 px-2.5 py-2 text-[10px] leading-snug text-red-700">
          {error}
        </p>
      )}

      {/* ── Liste ──────────────────────────────────────────────────── */}
      {loading && models.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-[11px] text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          {t('common.loading')}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-[11px] text-slate-400 px-2 py-6 text-center leading-relaxed">
          {t('design3d.library.empty')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((model) => {
            const item = modelToEquipmentItem(model, brandLabel);
            const armed = item.id === armedProductId;
            const canDelete = isAdmin || model.user_id === user?.id;
            const busy = busyId === model.id;
            return (
              <li key={model.id} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    if (onPlace && !e.shiftKey) {
                      onPlace(item);
                      return;
                    }
                    onArm(armed ? null : item);
                  }}
                  onMouseEnter={() => onPreload?.(item)}
                  className={[
                    'w-full flex gap-2.5 p-2 rounded-xl border text-left transition',
                    canDelete || isAdmin ? 'pr-16' : 'pr-2',
                    armed
                      ? 'bg-brand-red/5 border-brand-red/40 ring-1 ring-brand-red/20'
                      : 'bg-white border-slate-200/70 hover:border-brand-red/40 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className="relative flex-shrink-0 w-12 h-12 xl:w-14 xl:h-14 bg-slate-50 border border-slate-200/70 rounded-lg overflow-hidden flex items-center justify-center">
                    {model.thumbnail_url ? (
                      <img src={model.thumbnail_url} alt="" className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <Box size={20} className="text-brand-red/60" />
                    )}
                    <span className="absolute top-0.5 left-0.5 z-10 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase bg-brand-red text-white shadow-sm leading-none">
                      3D
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] xl:text-[13px] font-semibold text-slate-800 truncate">
                      {model.name}
                    </div>
                    <div className="text-[10px] xl:text-[11px] text-slate-400 truncate flex items-center gap-1">
                      {model.is_shared ? <Globe size={9} /> : <Lock size={9} />}
                      {model.is_shared ? t('design3d.library.shared') : t('design3d.library.private')}
                    </div>
                    <div className="text-[10px] xl:text-[11px] text-slate-500 tabular-nums">
                      {Math.round(model.width_mm)}×{Math.round(model.depth_mm)}×{Math.round(model.height_mm)} mm
                    </div>
                  </div>
                </button>

                {/* Kart eylemleri — kardeş overlay (button-içinde-button olmasın) */}
                <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleShareToggle(model)}
                      disabled={busy}
                      title={
                        model.is_shared
                          ? t('design3d.library.unshareTitle')
                          : t('design3d.library.shareTitle')
                      }
                      className={[
                        'p-1.5 rounded-lg transition disabled:opacity-40',
                        model.is_shared
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-300 hover:bg-slate-100 hover:text-emerald-500',
                      ].join(' ')}
                    >
                      <Globe size={12} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(model)}
                      disabled={busy}
                      title={t('common.delete')}
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Portal: katalog paneli `backdrop-blur` kullanıyor — bu, sabit konumlu
          çocuklar için kapsayıcı blok oluşturur ve onay penceresi panelin
          içinde kalırdı. */}
      {createPortal(
      <ConfirmDialog
        open={!!pendingDelete}
        title={t('design3d.library.deleteTitle')}
        description={t('design3d.library.deleteMessage', { name: pendingDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />,
      document.body,
      )}
    </div>
  );
}

function ScopeChip({
  label,
  count,
  icon,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium border transition whitespace-nowrap',
        active
          ? 'bg-brand-red text-white border-brand-red'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
      ].join(' ')}
    >
      {icon}
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className={['tabular-nums', active ? 'opacity-90' : 'text-slate-400'].join(' ')}>
          {count}
        </span>
      )}
    </button>
  );
}
