/**
 * RenderGalleryPanel — kaydedilmiş renderların galerisi (ortada modal).
 *
 * NEDEN: Render'ler "proje dosyasının içinde" (project.renders) saklanır.
 * Bu panel onları küçük resim ızgarası olarak gösterir; indir / sil / büyüt
 * (lightbox) sağlar. Silme hem dokümandan hem Storage'dan (best-effort) kaldırır.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Images, Trash2, X } from 'lucide-react';
import { useProjectStore } from '../../../store';
import type { ProjectRender } from '../../../core/types';
import { deleteRender } from '../../../../../lib/designRenderStore';
import { downloadDataUrl } from '../../../../../lib/errorReport';

interface RenderGalleryPanelProps {
  open: boolean;
  onClose: () => void;
}

// Stabil boş-dizi referansı. Selector içinde `?? []` yazmak HER render'da YENİ bir
// [] döndürür; Zustand v5 çıktıyı Object.is ile kıyasladığından bu sonsuz
// re-render'a ("Maximum update depth exceeded") yol açar. Modül sabiti kullanıp
// coalesce'i selector DIŞINDA yaparak referansı sabit tutuyoruz.
const EMPTY_RENDERS: ProjectRender[] = [];

/** Uzak URL veya data URL'i güvenilir şekilde indir (cross-origin dâhil). */
async function downloadRender(r: ProjectRender): Promise<void> {
  const name = `render-${r.id}.png`;
  // data: URL ise doğrudan indir.
  if (r.url.startsWith('data:')) {
    downloadDataUrl(r.url, name);
    return;
  }
  try {
    const res = await fetch(r.url, { mode: 'cors' });
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    downloadDataUrl(obj, name);
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
  } catch {
    // Son çare: fallback yedeği ya da yeni sekmede aç.
    if (r.fallbackDataUrl) downloadDataUrl(r.fallbackDataUrl, name);
    else window.open(r.url, '_blank', 'noopener,noreferrer');
  }
}

export default function RenderGalleryPanel({ open, onClose }: RenderGalleryPanelProps) {
  const { t } = useTranslation();
  const renders = useProjectStore((s) => s.project.renders) ?? EMPTY_RENDERS;
  const update = useProjectStore((s) => s.update);
  const [lightbox, setLightbox] = useState<ProjectRender | null>(null);

  if (!open) return null;

  const handleDelete = (r: ProjectRender) => {
    update((d) => {
      d.renders = (d.renders ?? []).filter((x) => x.id !== r.id);
    });
    void deleteRender(r.path);
    if (lightbox?.id === r.id) setLightbox(null);
  };

  // En yeni önce.
  const ordered = [...renders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200/70 bg-white shadow-2xl overflow-hidden">
        <header className="px-5 h-12 flex items-center gap-2 border-b border-slate-100 shrink-0">
          <Images size={15} className="text-brand-red" />
          <span className="text-[13px] font-semibold text-slate-800 flex-1">
            {t('design3d.gallery.title')} {renders.length > 0 && <span className="text-slate-400 font-normal">· {renders.length}</span>}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title={t('common.close')}
          >
            <X size={15} />
          </button>
        </header>

        <div className="overflow-y-auto p-4">
          {ordered.length === 0 ? (
            <div className="py-16 text-center text-[12px] text-slate-400 leading-relaxed">
              {t('design3d.gallery.emptyTitle')}<br />
              {t('design3d.gallery.emptyBefore')}{' '}
              <span className="font-medium text-slate-500">{t('design3d.gallery.emptyCamera')}</span>{' '}
              {t('design3d.gallery.emptyAfter')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ordered.map((r) => (
                <div
                  key={r.id}
                  className="group relative rounded-xl border border-slate-200/70 overflow-hidden bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => setLightbox(r)}
                    className="block w-full aspect-video overflow-hidden"
                    title={t('design3d.gallery.enlarge')}
                  >
                    <img
                      src={r.fallbackDataUrl || r.url}
                      alt={`Render ${r.id}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition group-hover:scale-[1.02]"
                    />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1.5 bg-gradient-to-t from-slate-900/70 to-transparent opacity-0 group-hover:opacity-100 transition">
                    <span className="text-[9px] text-white/90 tabular-nums pl-1">
                      {r.width}×{r.height}
                      {!r.path && <span className="text-amber-300"> · {t('design3d.gallery.local')}</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void downloadRender(r)}
                        className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white transition"
                        title={t('common.download')}
                      >
                        <Download size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-white transition"
                        title={t('common.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.fallbackDataUrl || lightbox.url}
            alt={`Render ${lightbox.id}`}
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
