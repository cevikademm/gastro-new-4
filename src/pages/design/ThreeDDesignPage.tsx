import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Boxes, Undo2, Redo2, Upload, Loader2, X, Layers, AlertTriangle,
  Save, Download, FileUp, Check, CloudOff,
} from 'lucide-react';
import {
  Editor2D,
  Editor3D,
  ToolbarButton,
  analyzeCadFile,
  applyCadImport,
  CAD_ACCEPT_ATTR,
  useEditor2DState,
  useProjectStore,
  type EditorMode,
  type CadAnalysis,
  type CadImportResult,
  type ProjectDocument,
} from '../../modules/three-d-design';
import {
  saveDesignLocal,
  syncDesignProject,
  saveDesignProject,
  flushDesignProject,
  flushDesignProjectBeacon,
  loadBestDesign,
  isEmptyDocument,
  STANDALONE_KEY,
} from '../../lib/gastroDesignSync';
import { reconcileProductsIntoDesign, type ProductLike } from '../../lib/designProductSync';
import { useProjectStore as useDiamondProjectStore } from '../../stores/projectStore';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'local' | 'error';

const FIT_PADDING = 0.1;

/**
 * Teklif/Ürünler tarafındaki ürünleri (diamond projectStore.project.products)
 * tasarım belgesine (ProjectDocument.equipment) ODA İÇİNE ekler — yalnızca
 * eksik olanları (catalogId dedup), yalnızca-EKLE. SADECE proje kapsamında
 * (standalone /3d-design'da çalışmaz). `loadBestDesign` ile belge yüklenip
 * hydrate olduktan SONRA bir kez çağrılır.
 */
function syncProductsIntoDesign(
  projectId: string | undefined,
  projectKey: string,
  loadProject: (doc: ProjectDocument) => void,
  reconciledKeyRef: { current: string | null },
): void {
  if (!projectId) return; // standalone — teklif ürünü kavramı yok
  if (reconciledKeyRef.current === projectKey) return; // bu açılış için zaten koştu
  reconciledKeyRef.current = projectKey;

  const diamond = useDiamondProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  const sourceProducts = diamond?.products ?? [];
  if (sourceProducts.length === 0) return;

  // ProductItem (cm) → ProductLike (mm).
  const products: ProductLike[] = sourceProducts.map((p) => ({
    code: p.code,
    name: p.name,
    category: p.category,
    widthMm: (p.dimensions?.width ?? 0) * 10,
    depthMm: (p.dimensions?.depth ?? 0) * 10,
    heightMm: (p.dimensions?.height ?? 0) * 10,
  }));

  const current = useProjectStore.getState().project;
  const { doc, added } = reconcileProductsIntoDesign(current, products);
  if (added > 0) {
    loadProject(doc);
    saveDesignLocal(doc, projectKey);
    void syncDesignProject(doc, projectKey);
  }
}

function fitViewportToBounds(
  bounds: { min: { x: number; y: number }; max: { x: number; y: number } },
  viewportW: number,
  viewportH: number,
) {
  const dx = Math.max(1, bounds.max.x - bounds.min.x);
  const dy = Math.max(1, bounds.max.y - bounds.min.y);
  const usableW = viewportW * (1 - FIT_PADDING * 2);
  const usableH = viewportH * (1 - FIT_PADDING * 2);
  const scale = Math.max(0.0005, Math.min(usableW / dx, usableH / dy));
  const cx = (bounds.min.x + bounds.max.x) / 2;
  const cy = (bounds.min.y + bounds.max.y) / 2;
  const offsetX = viewportW / 2 - cx * scale;
  const offsetY = viewportH / 2 - cy * scale;
  return { scale, offsetX, offsetY };
}

export default function ThreeDDesignPage() {
  const mode = useProjectStore((s) => s.view.mode);
  const setMode = useProjectStore((s) => s.setMode);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo());
  const canRedo = useProjectStore((s) => s.canRedo());
  const update = useProjectStore((s) => s.update);
  const projectName = useProjectStore((s) => s.project.name);
  const loadProject = useProjectStore((s) => s.loadProject);
  // `project` referansı yalnızca belge mutasyonlarında değişir → otomatik
  // kaydetmeyi buna bağlamak gerçek değişiklikleri yakalar (seçim/görünüm değil).
  const project = useProjectStore((s) => s.project);

  // Proje-bağlı anahtar: /projects/:id/design → URL id'si (her proje kendi
  // tasarımını saklar); /3d-design (bağımsız) → 'standalone'.
  const params = useParams<{ id?: string }>();
  const projectKey = params.id ?? STANDALONE_KEY;

  const [tab, setTab] = useState<EditorMode>(mode);
  const switchTab = (next: EditorMode) => {
    setTab(next);
    setMode(next);
  };

  // ── Kalıcı saklama (persistence) ───────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const hydratedRef = useRef(false);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  // Teklif→tasarım senkronu yalnızca her proje açılışında BİR KEZ koşsun
  // (kendi yazdığımız equipment değişimi reconcile'ı tekrar tetiklemesin).
  const reconciledKeyRef = useRef<string | null>(null);

  // Açılışta: bu projeye ait yerel + Supabase belgesini yükle. Kullanıcı yükleme
  // bitmeden çizmeye başladıysa ONUN çalışmasını ASLA ezmeyiz. projectKey
  // değişince (başka projeye geçince) yeniden yüklenir.
  useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    reconciledKeyRef.current = null;
    loadBestDesign(projectKey)
      .then((res) => {
        if (cancelled) return;
        const current = useProjectStore.getState().project;
        if (isEmptyDocument(current)) {
          if (res) loadProject(res.doc);
        } else {
          // Yükleme bitmeden çizilmeye başlanmış — mevcut çalışmayı koru + kaydet.
          saveDesignLocal(current, projectKey);
          void syncDesignProject(current, projectKey);
        }
      })
      .catch(() => { /* yükleme başarısız — boş projeyle devam */ })
      .finally(() => {
        if (cancelled) return;
        hydratedRef.current = true;
        // Belge hazır → teklifteki ürünlerden eksik olanları belgeye ekle.
        syncProductsIntoDesign(params.id, projectKey, loadProject, reconciledKeyRef);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey, params.id]);

  // Otomatik kaydetme: belge her değiştiğinde localStorage'a ANINDA, Supabase'e
  // ~400ms içinde (coalesced kuyruk + retry + çevrimdışı dayanıklılık). Sürükleme
  // ARA kareleri store'a yazılmaz (yalnız bırakışta commit) → yalnız gerçek
  // değişiklikler kaydedilir. Boş belge ya da henüz yükleme bitmemişse atlanır.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (isEmptyDocument(project)) return;
    saveDesignProject(project, projectKey, setSaveStatus);
  }, [project, projectKey]);

  // Sayfadan ayrılırken (route değişimi) bekleyen Supabase kaydını gönder.
  useEffect(() => {
    return () => {
      const current = useProjectStore.getState().project;
      if (!isEmptyDocument(current)) void flushDesignProject(current, projectKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  // Tab kapanışı / arka plana alma: canlı belgeyi keepalive ile zorunlu flush et
  // (localStorage zaten anlık; bu son birkaç yüz ms'lik değişikliğin uzak yedeğini
  // de garanti eder → veri-kaybı penceresi kapanır).
  useEffect(() => {
    const flush = () => {
      const current = useProjectStore.getState().project;
      if (!isEmptyDocument(current)) flushDesignProjectBeacon(current, projectKey);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [projectKey]);

  const onManualSave = async () => {
    const current = useProjectStore.getState().project;
    if (isEmptyDocument(current)) return;
    setSaveStatus('saving');
    const ok = await flushDesignProject(current, projectKey);
    setSaveStatus(ok ? 'saved' : 'local');
  };

  // Ekstra güvenlik ağı: çizimi .json dosyası olarak indir / dosyadan geri yükle.
  const onExportJson = () => {
    const doc = useProjectStore.getState().project;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (doc.name || '3d-tasarim').replace(/[^\w.-]+/g, '_');
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportJson = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const doc = JSON.parse(text) as ProjectDocument;
      if (!doc || typeof doc !== 'object' || !('order' in doc)) {
        throw new Error('Geçersiz 3D tasarım dosyası');
      }
      loadProject(doc);
      saveDesignLocal(doc, projectKey);
      void syncDesignProject(doc, projectKey);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`JSON içe aktarılamadı: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const editorAreaRef = useRef<HTMLDivElement | null>(null);
  const cadInputRef = useRef<HTMLInputElement | null>(null);

  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [analysis, setAnalysis] = useState<CadAnalysis | null>(null);

  const onCadPick = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    setImportStatus('Hazırlanıyor…');
    try {
      const a = await analyzeCadFile(file, (msg) => setImportStatus(msg));
      if (a.totalEntities === 0) {
        // eslint-disable-next-line no-alert
        alert(`${file.name}: İçe aktarılabilir geometri bulunamadı (LINE/POLYLINE bekleniyor).`);
        return;
      }
      setAnalysis(a);
    } catch (err) {
      console.error('CAD analysis error:', err);
      // eslint-disable-next-line no-alert
      alert(`İçe aktarma hatası: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
      setImportStatus('');
      if (cadInputRef.current) cadInputRef.current.value = '';
    }
  };

  const onConfirmImport = (result: CadImportResult) => {
    if (mode !== '2d' && mode !== 'split') switchTab('2d');
    if (result.bounds) {
      const host = editorAreaRef.current;
      const rect = host?.getBoundingClientRect();
      const vw = (rect?.width ?? 1200) / (mode === 'split' ? 2 : 1);
      const vh = rect?.height ?? 800;
      const { scale, offsetX, offsetY } = fitViewportToBounds(result.bounds, vw, vh);
      useEditor2DState.getState().setViewport(scale, offsetX, offsetY);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between gap-3 px-4 h-14 border-b border-slate-200/70 bg-white/95 backdrop-blur shadow-sm shadow-slate-900/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
            <Boxes size={16} />
          </div>
          <h1 className="text-[12px] font-semibold text-slate-800 truncate">3D Design</h1>
          <span className="text-[12px] text-slate-400 truncate">· {projectName}</span>
          {importing && (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-brand-red/10 text-brand-red">
              <Loader2 size={12} className="animate-spin" />
              {importStatus || 'İçe aktarılıyor…'}
            </span>
          )}
          <SaveStatusBadge status={saveStatus} />
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton onClick={() => void onManualSave()} title="Supabase'e kaydet">
            <Save size={14} />
            <span className="text-[11px]">Kaydet</span>
          </ToolbarButton>
          <ToolbarButton onClick={onExportJson} title="Çizimi .json olarak indir (yedek)">
            <Download size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => jsonInputRef.current?.click()} title="Yedek .json dosyasından geri yükle">
            <FileUp size={14} />
          </ToolbarButton>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportJson(e.target.files?.[0] ?? null)}
          />
          <div className="w-px h-5 bg-slate-200 mx-1.5" />
          <ToolbarButton onClick={undo} disabled={!canUndo} title="Geri al (Ctrl+Z)">
            <Undo2 size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title="Yinele (Ctrl+Y)">
            <Redo2 size={14} />
          </ToolbarButton>
          <div className="w-px h-5 bg-slate-200 mx-1.5" />
          <ToolbarButton
            onClick={() => cadInputRef.current?.click()}
            disabled={importing}
            title="CAD dosyası içe aktar (DXF, DWG, DWT)"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span className="text-[11px]">CAD</span>
          </ToolbarButton>
          <input
            ref={cadInputRef}
            type="file"
            accept={CAD_ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => void onCadPick(e.target.files?.[0] ?? null)}
          />
          <div className="w-px h-5 bg-slate-200 mx-1.5" />
          <div className="inline-flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => switchTab('2d')}
              className={
                tab === '2d'
                  ? 'h-7 px-3 rounded-lg text-[12px] font-semibold bg-white text-brand-red shadow-sm transition'
                  : 'h-7 px-3 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 transition'
              }
            >
              2D
            </button>
            <button
              type="button"
              onClick={() => switchTab('3d')}
              className={
                tab === '3d'
                  ? 'h-7 px-3 rounded-lg text-[12px] font-semibold bg-white text-brand-red shadow-sm transition'
                  : 'h-7 px-3 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 transition'
              }
            >
              3D
            </button>
            <button
              type="button"
              onClick={() => switchTab('split')}
              className={
                tab === 'split'
                  ? 'h-7 px-3 rounded-lg text-[12px] font-semibold bg-white text-brand-red shadow-sm transition'
                  : 'h-7 px-3 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 transition'
              }
            >
              Split
            </button>
          </div>
        </div>
      </header>

      <div ref={editorAreaRef} className="flex-1 min-h-0">
        {tab === '2d' && <Editor2D />}
        {tab === '3d' && <Editor3D />}
        {tab === 'split' && (
          <div className="grid grid-cols-2 h-full">
            <div className="border-r border-slate-200/70"><Editor2D /></div>
            <Editor3D />
          </div>
        )}
      </div>

      {analysis && (
        <CadImportDialog
          analysis={analysis}
          update={update}
          onClose={() => setAnalysis(null)}
          onComplete={(result) => {
            onConfirmImport(result);
            setAnalysis(null);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Kaydetme durumu rozeti
// ────────────────────────────────────────────────────────────────────────────

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500">
        <Loader2 size={12} className="animate-spin" />
        Kaydediliyor…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
        <Check size={12} />
        Kaydedildi
      </span>
    );
  }
  // 'local' | 'error' — Supabase'e ulaşılamadı ama yerel yedek alındı.
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100"
      title="Buluta kaydedilemedi — değişiklik bu cihazda (localStorage) güvende. Bağlantı gelince tekrar deneyin."
    >
      <CloudOff size={12} />
      Yalnızca bu cihazda
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Layer-picker dialog
// ────────────────────────────────────────────────────────────────────────────

interface CadImportDialogProps {
  analysis: CadAnalysis;
  update: (recipe: (d: any) => void) => void;
  onClose: () => void;
  onComplete: (result: CadImportResult) => void;
}

function CadImportDialog({ analysis, update, onClose, onComplete }: CadImportDialogProps) {
  // Pre-select wall-likely layers if any; otherwise pre-select top-3 by segment count
  const initialSelection = useMemo<Set<string>>(() => {
    if (analysis.suggestedLayers.length > 0) {
      return new Set(analysis.suggestedLayers);
    }
    return new Set(analysis.layers.slice(0, 3).map((l) => l.name));
  }, [analysis]);

  const [selected, setSelected] = useState<Set<string>>(initialSelection);
  const [thicknessMm, setThicknessMm] = useState<number>(100);
  const [minSegmentMm, setMinSegmentMm] = useState<number>(150);
  const [unit, setUnit] = useState<'mm' | 'cm' | 'm' | 'inch'>(analysis.guessedUnit);
  const [normalizeOrigin, setNormalizeOrigin] = useState<boolean>(true);
  const [rotateDeg, setRotateDeg] = useState<0 | 90 | 180 | 270>(0);
  const [mirrorX, setMirrorX] = useState<boolean>(false);
  const [mirrorY, setMirrorY] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  const boundsSpan = analysis.bounds
    ? Math.max(
        analysis.bounds.max.x - analysis.bounds.min.x,
        analysis.bounds.max.y - analysis.bounds.min.y,
      )
    : 0;

  const totalSegments = useMemo(
    () => analysis.layers.reduce((a, l) => a + l.segmentCount, 0),
    [analysis.layers],
  );
  const selectedSegments = useMemo(
    () =>
      analysis.layers
        .filter((l) => selected.has(l.name))
        .reduce((a, l) => a + l.segmentCount, 0),
    [analysis.layers, selected],
  );

  const toggleLayer = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(analysis.layers.map((l) => l.name)));
  const selectNone = () => setSelected(new Set());
  const selectSuggested = () => setSelected(new Set(analysis.suggestedLayers));

  const unitScale = unit === 'mm' ? 1 : unit === 'cm' ? 10 : unit === 'm' ? 1000 : 25.4;

  const handleImport = () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const result = applyCadImport(update, analysis, {
        layers: Array.from(selected),
        thicknessMm,
        minSegmentMm,
        unitScale,
        normalizeOrigin,
        rotateDeg,
        mirrorX,
        mirrorY,
      });
      if (result.wallIds.length === 0) {
        const skipped = result.skippedShort;
        const hint = skipped > 0
          ? `Tüm ${skipped} segment "Min. Çizgi" filtresinin altında kaldı. Birim seçimini değiştir (örn. mm → metre) ya da Min. Çizgi'yi 0 yap.`
          : 'Seçili katmanlarda LINE/POLYLINE bulunamadı.';
        // eslint-disable-next-line no-alert
        alert(`İçe aktarılabilir çizgi bulunamadı.\n\n${hint}`);
        setBusy(false);
        return;
      }
      onComplete(result);
    } catch (err) {
      console.error(err);
      // eslint-disable-next-line no-alert
      alert(`İçe aktarma hatası: ${err instanceof Error ? err.message : String(err)}`);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200/70 shadow-2xl shadow-slate-900/10 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
              <Layers size={18} />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-slate-800">CAD İçe Aktarma — Katman Seçimi</h2>
              <p className="text-[11px] text-slate-400">
                {analysis.filename} · {analysis.kind.toUpperCase()} · {analysis.layers.length} katman · {totalSegments.toLocaleString('tr-TR')} segment
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Birim {unit === analysis.guessedUnit && <span className="text-emerald-600 normal-case">· otomatik</span>}
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-[11px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition"
            >
              <option value="mm">Milimetre (mm)</option>
              <option value="cm">Santimetre (cm)</option>
              <option value="m">Metre (m)</option>
              <option value="inch">İnç (inch)</option>
            </select>
            {boundsSpan > 0 && (
              <p className="text-[9px] text-slate-400 mt-1">
                Çizim alanı: {boundsSpan.toFixed(1)} {unit} →{' '}
                <span className="font-semibold text-slate-600">
                  {(boundsSpan * unitScale / 1000).toFixed(1)} m
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Duvar Kalınlığı: {thicknessMm}mm
            </label>
            <input
              type="range"
              min={10}
              max={400}
              step={10}
              value={thicknessMm}
              onChange={(e) => setThicknessMm(Number(e.target.value))}
              className="w-full accent-[#931315]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Min. Çizgi: {minSegmentMm}mm
            </label>
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={minSegmentMm}
              onChange={(e) => setMinSegmentMm(Number(e.target.value))}
              className="w-full accent-[#931315]"
            />
          </div>
        </div>

        {/* Konumlandırma */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-50/60">
          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Konumlandırma</span>

          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={normalizeOrigin}
              onChange={(e) => setNormalizeOrigin(e.target.checked)}
              className="h-4 w-4 rounded accent-[#931315]"
            />
            <span className="font-medium text-slate-700">Origin'e taşı</span>
            <span className="text-[10px] text-slate-400">(planı 0,0'a hizala)</span>
          </label>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400">Döndür:</span>
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => setRotateDeg(deg as 0 | 90 | 180 | 270)}
                className={`h-7 px-2.5 text-[11px] font-medium rounded-lg transition ${
                  rotateDeg === deg
                    ? 'bg-brand-red text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400">Yansıt:</span>
            <button
              type="button"
              onClick={() => setMirrorY((v) => !v)}
              className={`h-7 px-2.5 text-[11px] font-medium rounded-lg transition ${
                mirrorY ? 'bg-brand-red text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="X ekseninde yansıt (sol-sağ)"
            >
              ⇆ X
            </button>
            <button
              type="button"
              onClick={() => setMirrorX((v) => !v)}
              className={`h-7 px-2.5 text-[11px] font-medium rounded-lg transition ${
                mirrorX ? 'bg-brand-red text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Y ekseninde yansıt (üst-alt)"
            >
              ⇅ Y
            </button>
          </div>
        </div>

        {/* Suggested-layer hint */}
        {analysis.suggestedLayers.length > 0 ? (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
            <span className="font-semibold">Otomatik tespit:</span>
            <span>
              {analysis.suggestedLayers.length} duvar katmanı bulundu — varsayılan olarak işaretlendi.
            </span>
            <button onClick={selectSuggested} className="ml-auto font-semibold underline">
              Sadece bunları seç
            </button>
          </div>
        ) : (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 flex items-center gap-2">
            <AlertTriangle size={12} />
            <span>
              Otomatik duvar katmanı tespit edilemedi. En çok segment içeren ilk 3 katman ön seçili — sadece duvar layer'larını seçtiğinden emin ol.
            </span>
          </div>
        )}

        {/* Layer list */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            Katmanlar ({selected.size}/{analysis.layers.length} seçili · {selectedSegments.toLocaleString('tr-TR')} segment)
          </div>
          <div className="flex gap-2 text-[11px]">
            <button onClick={selectAll} className="text-brand-red font-semibold hover:underline">Tümü</button>
            <span className="text-slate-300">·</span>
            <button onClick={selectNone} className="text-slate-500 font-semibold hover:underline">Hiçbiri</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1 min-h-0">
          {analysis.layers.map((layer) => {
            const isSelected = selected.has(layer.name);
            const isSuggested = analysis.suggestedLayers.includes(layer.name);
            return (
              <label
                key={layer.name}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer transition ${
                  isSelected ? 'bg-brand-red/5 ring-1 ring-brand-red/15' : 'hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleLayer(layer.name)}
                  className="h-4 w-4 rounded accent-[#931315]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-800 truncate">{layer.name}</span>
                    {isSuggested && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase bg-emerald-100 text-emerald-700">
                        Duvar
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {layer.entityCount} entity · {layer.segmentCount.toLocaleString('tr-TR')} segment
                  </div>
                </div>
                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-red/70"
                    style={{ width: `${(layer.segmentCount / Math.max(1, totalSegments)) * 100}%` }}
                  />
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/60">
          <p className="text-[10px] text-slate-400">
            İpucu: Hatching/mobilya çizgilerini elemek için "Min. Çizgi" değerini artır.
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-xl text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition">
              İptal
            </button>
            <button
              onClick={handleImport}
              disabled={busy || selected.size === 0}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-5 rounded-xl text-[11px] font-semibold bg-brand-red text-white shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              İçe Aktar ({selected.size} katman)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
