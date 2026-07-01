import { useEffect } from 'react';
import { X } from 'lucide-react';

// Map of product IDs to their 3D model files (placed in /public/models/)
export const PRODUCT_3D_MODELS: Record<string, string> = {
  'PSB-202MI/2V': '/models/PSB-202MI-2V.glb',
};

export function has3DModel(productId?: string | null): boolean {
  if (!productId) return false;
  return Boolean(PRODUCT_3D_MODELS[productId]);
}

let modelViewerLoaded = false;
export function loadModelViewerScript() {
  if (modelViewerLoaded || typeof document === 'undefined') return;
  if (document.querySelector('script[data-model-viewer]')) {
    modelViewerLoaded = true;
    return;
  }
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  s.setAttribute('data-model-viewer', 'true');
  document.head.appendChild(s);
  modelViewerLoaded = true;
}

interface Props {
  productId: string;
  productName?: string;
  onClose: () => void;
}

export default function Model3DViewer({ productId, productName, onClose }: Props) {
  const src = PRODUCT_3D_MODELS[productId];

  useEffect(() => {
    loadModelViewerScript();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900">3D Görünüm</h3>
            <p className="text-xs text-slate-500">{productName || productId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 bg-gradient-to-b from-slate-50 to-slate-100">
          {/* @ts-expect-error model-viewer is a custom element */}
          <model-viewer
            src={src}
            alt={productName || productId}
            camera-controls
            auto-rotate
            shadow-intensity="1"
            exposure="1"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
          />
        </div>
        <div className="px-5 py-2 border-t border-slate-200 text-[11px] text-slate-500 text-center">
          Döndürmek için sürükleyin · Yakınlaştırmak için kaydırın
        </div>
      </div>
    </div>
  );
}
