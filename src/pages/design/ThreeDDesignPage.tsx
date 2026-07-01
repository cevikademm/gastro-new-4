import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { setActiveDesignProjectKey } from '../../lib/designDelete';
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
  const { t } = useTranslation();
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
    // Silme yardımcısı (Delete tuşu dâhil) aktif projeyi bilsin → teklif satırını
    // da kaldırabilsin. Standalone'da STANDALONE_KEY olur, teklif tarafı atlanır.
    setActiveDesignProjectKey(projectKey);
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
        throw new Error(t('design3d.invalidDesignFile'));
      }
      loadProject(doc);
      saveDesignLocal(doc, projectKey);
      void syncDesignProject(doc, projectKey);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(t('design3d.jsonImportFailed', { message: err instanceof Error ? err.message : String(err) }));
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
    setImportStatus(t('design3d.preparing'));
    try {
      const a = await analyzeCadFile(file, (msg) => setImportStatus(msg));
      if (a.totalEntities === 0) {
        // eslint-disable-next-line no-alert
        alert(t('design3d.noImportableGeometry', { filename: file.name }));
        return;
      }
      setAnalysis(a);
    } catch (err) {
      console.error('CAD analysis error:', err);
      // eslint-disable-next-line no-alert
      alert(t('design3d.importError', { message: err instanceof Error ? err.message : String(err) }));
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
          <h1 className="text-[12px] font-semibold text-slate-800 truncate">{t('design3d.pageTitle')}</h1>
          <span className="text-[12px] text-slate-400 truncate">· {projectName}</span>
          {importing && (
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-brand-red/10 text-brand-red">
              <Loader2 size={12} className="animate-spin" />
              {importStatus || t('design3d.importing')}
            </span>
          )}
          <SaveStatusBadge status={saveStatus} />
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton onClick={() => void onManualSave()} title={t('design3d.saveToSupabase')}>
            <Save size={14} />
            <span className="text-[11px]">{t('common.save')}</span>
          </ToolbarButton>
          <ToolbarButton onClick={onExportJson} title={t('design3d.exportJsonTitle')}>
            <Download size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => jsonInputRef.current?.click()} title={t('design3d.importJsonTitle')}>
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
          <ToolbarButton onClick={undo} disabled={!canUndo} title={t('design3d.undo')}>
            <Undo2 size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title={t('design3d.redo')}>
            <Redo2 size={14} />
          </ToolbarButton>
          <div className="w-px h-5 bg-slate-200 mx-1.5" />
          <ToolbarButton
            onClick={() => cadInputRef.current?.click()}
            disabled={importing}
            title={t('design3d.importCadTitle')}
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
              {t('design3d.splitView')}
            </button>
          </div>
        </div>
      </header>

      <div ref={editorAreaRef} className="flex-1 min-h-0">
        {tab === '2d' && <Editor2D />}
        {tab === '3d' && <Editor3D projectKey={projectKey} />}
        {tab === 'split' && (
          <div className="grid grid-cols-2 h-full">
            <div className="border-r border-slate-200/70"><Editor2D /></div>
            <Editor3D projectKey={projectKey} />
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
  const { t } = useTranslation();
  if (status === 'idle') return null;
  if (status === 'saving') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500">
        <Loader2 size={12} className="animate-spin" />
        {t('common.saving')}
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
        <Check size={12} />
        {t('design3d.savedBadge')}
      </span>
    );
  }
  // 'local' | 'error' — Supabase'e ulaşılamadı ama yerel yedek alındı.
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100"
      title={t('design3d.localOnlyTitle')}
    >
      <CloudOff size={12} />
      {t('design3d.localOnly')}
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
  const { t } = useTranslation();
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
          ? t('design3d.allSegmentsBelowMin', { count: skipped })
          : t('design3d.noLinesInSelectedLayers');
        // eslint-disable-next-line no-alert
        alert(`${t('design3d.noImportableLines')}\n\n${hint}`);
        setBusy(false);
        return;
      }
      onComplete(result);
    } catch (err) {
      console.error(err);
      // eslint-disable-next-line no-alert
      alert(t('design3d.importError', { message: err instanceof Error ? err.message : String(err) }));
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
              <h2 className="text-[14px] font-semibold text-slate-800">{t('design3d.cadImportTitle')}</h2>
              <p className="text-[11px] text-slate-400">
                {analysis.filename} · {analysis.kind.toUpperCase()} · {t('design3d.layersSegmentsSummary', { layers: analysis.layers.length, segments: totalSegments.toLocaleString('tr-TR') })}
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
              {t('design3d.unit')} {unit === analysis.guessedUnit && <span className="text-emerald-600 normal-case">· {t('design3d.auto')}</span>}
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-[11px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition"
            >
              <option value="mm">{t('design3d.unitMm')}</option>
              <option value="cm">{t('design3d.unitCm')}</option>
              <option value="m">{t('design3d.unitM')}</option>
              <option value="inch">{t('design3d.unitInch')}</option>
            </select>
            {boundsSpan > 0 && (
              <p className="text-[9px] text-slate-400 mt-1">
                {t('design3d.drawingArea')}: {boundsSpan.toFixed(1)} {unit} →{' '}
                <span className="font-semibold text-slate-600">
                  {(boundsSpan * unitScale / 1000).toFixed(1)} m
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-2">
              {t('design3d.wallThickness', { value: thicknessMm })}
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
              {t('design3d.minLine', { value: minSegmentMm })}
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
          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">{t('design3d.positioning')}</span>

          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={normalizeOrigin}
              onChange={(e) => setNormalizeOrigin(e.target.checked)}
              className="h-4 w-4 rounded accent-[#931315]"
            />
            <span className="font-medium text-slate-700">{t('design3d.moveToOrigin')}</span>
            <span className="text-[10px] text-slate-400">{t('design3d.moveToOriginHint')}</span>
          </label>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-slate-400">{t('design3d.rotateLabel')}</span>
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
            <span className="text-[10px] font-semibold text-slate-400">{t('design3d.mirrorLabel')}</span>
            <button
              type="button"
              onClick={() => setMirrorY((v) => !v)}
              className={`h-7 px-2.5 text-[11px] font-medium rounded-lg transition ${
                mirrorY ? 'bg-brand-red text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={t('design3d.mirrorXTitle')}
            >
              ⇆ X
            </button>
            <button
              type="button"
              onClick={() => setMirrorX((v) => !v)}
              className={`h-7 px-2.5 text-[11px] font-medium rounded-lg transition ${
                mirrorX ? 'bg-brand-red text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={t('design3d.mirrorYTitle')}
            >
              ⇅ Y
            </button>
          </div>
        </div>

        {/* Suggested-layer hint */}
        {analysis.suggestedLayers.length > 0 ? (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-2">
            <span className="font-semibold">{t('design3d.autoDetect')}</span>
            <span>
              {t('design3d.wallLayersFound', { count: analysis.suggestedLayers.length })}
            </span>
            <button onClick={selectSuggested} className="ml-auto font-semibold underline">
              {t('design3d.selectOnlyThese')}
            </button>
          </div>
        ) : (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 flex items-center gap-2">
            <AlertTriangle size={12} />
            <span>
              {t('design3d.noWallLayerDetected')}
            </span>
          </div>
        )}

        {/* Layer list */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
            {t('design3d.layersHeader', { selected: selected.size, total: analysis.layers.length, segments: selectedSegments.toLocaleString('tr-TR') })}
          </div>
          <div className="flex gap-2 text-[11px]">
            <button onClick={selectAll} className="text-brand-red font-semibold hover:underline">{t('common.all')}</button>
            <span className="text-slate-300">·</span>
            <button onClick={selectNone} className="text-slate-500 font-semibold hover:underline">{t('design3d.selectNone')}</button>
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
                        {t('design3d.wallBadge')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t('design3d.entitySegmentLine', { entities: layer.entityCount, segments: layer.segmentCount.toLocaleString('tr-TR') })}
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
            {t('design3d.minLineTip')}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-xl text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleImport}
              disabled={busy || selected.size === 0}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-5 rounded-xl text-[11px] font-semibold bg-brand-red text-white shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {t('design3d.importCount', { count: selected.size })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
