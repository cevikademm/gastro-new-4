/**
 * Multi-format CAD import — DXF natively, DWG via libredwg-web (WASM, lazy).
 *
 * The DWG path dynamically imports `@mlightcad/libredwg-web` so its ~24MB WASM
 * payload is fetched only when a user actually opens a DWG file.
 */

import {
  analyzeDxf,
  detectWallLayers,
  importDxfIntoDraft,
  type DxfImportOptions,
  type DxfImportResult,
} from './dxfImport';
import type { ProjectDocument, Vec2 } from '../../../core';
import i18n from '@/i18n';

export type CadFileKind = 'dxf' | 'dwg';

export function detectCadKind(filename: string): CadFileKind | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'dxf') return 'dxf';
  // .dwt = AutoCAD template (same binary container as .dwg)
  if (ext === 'dwg' || ext === 'dwt') return 'dwg';
  return null;
}

export const SUPPORTED_CAD_EXTENSIONS = ['.dxf', '.dwg', '.dwt'] as const;
export const CAD_ACCEPT_ATTR = SUPPORTED_CAD_EXTENSIONS.join(',');

export interface CadImportOptions extends DxfImportOptions {
  /** Called with progress hints while loading WASM / parsing. */
  onProgress?: (msg: string) => void;
}

export interface CadImportResult extends DxfImportResult {
  kind: CadFileKind;
  filename: string;
}

/** Convert a DWG ArrayBuffer to DXF text using libredwg-web. */
async function dwgBufferToDxfText(
  buffer: ArrayBuffer,
  onProgress?: (msg: string) => void,
): Promise<string> {
  onProgress?.(i18n.t('design3d.cad.loadingEngine'));
  const mod = await import('@mlightcad/libredwg-web');
  const { LibreDwg } = mod as unknown as {
    LibreDwg: { create: () => Promise<{ dwg_write_dxf: (b: ArrayBuffer) => Uint8Array | null }> };
  };
  onProgress?.(i18n.t('design3d.cad.converting'));
  const lib = await LibreDwg.create();
  const dxfBytes = lib.dwg_write_dxf(buffer);
  if (!dxfBytes) throw new Error(i18n.t('design3d.cad.convertFailed'));
  return new TextDecoder('utf-8').decode(dxfBytes);
}

/** Read a CAD file and produce normalized DXF text. */
export async function readCadFileToDxfText(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<{ kind: CadFileKind; dxfText: string }> {
  const kind = detectCadKind(file.name);
  if (!kind) {
    throw new Error(
      i18n.t('design3d.cad.unsupportedFormat', {
        name: file.name,
        list: SUPPORTED_CAD_EXTENSIONS.join(', '),
      }),
    );
  }
  if (kind === 'dxf') {
    onProgress?.(i18n.t('design3d.cad.readingDxf'));
    return { kind, dxfText: await file.text() };
  }
  const buf = await file.arrayBuffer();
  const dxfText = await dwgBufferToDxfText(buf, onProgress);
  return { kind, dxfText };
}

/**
 * Read a CAD file (DXF or DWG) and import its geometry into the project draft.
 * Returns parsed wall ids, bounds, layers, and the detected file kind.
 */
export async function importCadFile(
  storeUpdate: (recipe: (d: ProjectDocument) => void) => void,
  file: File,
  opts: CadImportOptions = {},
): Promise<CadImportResult> {
  const { kind, dxfText } = await readCadFileToDxfText(file, opts.onProgress);
  opts.onProgress?.(i18n.t('design3d.cad.addingGeometry'));
  let result: DxfImportResult = { wallIds: [], bounds: null, layersFound: [], skippedShort: 0 };
  storeUpdate((draft) => {
    result = importDxfIntoDraft(draft, dxfText, opts);
  });
  return { ...result, kind, filename: file.name };
}

/**
 * CAD analysis result — used by the layer picker before commit.
 */
export interface CadAnalysis {
  kind: CadFileKind;
  filename: string;
  /** Pre-converted DXF text — pass back into `applyCadImport` to skip re-conversion. */
  dxfText: string;
  layers: Array<{ name: string; entityCount: number; segmentCount: number }>;
  totalEntities: number;
  bounds: { min: Vec2; max: Vec2 } | null;
  /** Layers that match common wall-layer naming (recommended pre-selection). */
  suggestedLayers: string[];
  /** Heuristic unit guess from drawing extents — default selection in UI. */
  guessedUnit: 'mm' | 'cm' | 'm' | 'inch';
}

/**
 * Guess the DXF unit from drawing extents. Architectural floor plans are
 * typically 5–200 m wide; the raw extent in file units betrays the unit:
 *   m   → 5–200
 *   cm  → 500–20 000
 *   inch→ 200–8 000
 *   mm  → 5 000–200 000
 */
export function guessUnitFromBounds(
  bounds: { min: Vec2; max: Vec2 } | null,
): 'mm' | 'cm' | 'm' | 'inch' {
  if (!bounds) return 'mm';
  const span = Math.max(
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
  );
  if (!isFinite(span) || span <= 0) return 'mm';
  if (span < 500) return 'm';
  if (span < 12000) return 'cm';
  return 'mm';
}

/**
 * Read + parse a CAD file but DO NOT mutate the project. The caller can
 * present a layer picker, then call `applyCadImport` with the user's choices.
 */
export async function analyzeCadFile(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<CadAnalysis> {
  const { kind, dxfText } = await readCadFileToDxfText(file, onProgress);
  onProgress?.(i18n.t('design3d.cad.analyzingLayers'));
  const { layers, totalEntities, bounds } = analyzeDxf(dxfText);
  const suggestedLayers = detectWallLayers(layers.map((l) => l.name));
  const guessedUnit = guessUnitFromBounds(bounds);
  return {
    kind,
    filename: file.name,
    dxfText,
    layers,
    totalEntities,
    bounds,
    suggestedLayers,
    guessedUnit,
  };
}

/**
 * Apply a previously-analyzed CAD file with the user's chosen layer subset.
 */
export function applyCadImport(
  storeUpdate: (recipe: (d: ProjectDocument) => void) => void,
  analysis: CadAnalysis,
  opts: DxfImportOptions = {},
): CadImportResult {
  let result: DxfImportResult = { wallIds: [], bounds: null, layersFound: [], skippedShort: 0 };
  storeUpdate((draft) => {
    result = importDxfIntoDraft(draft, analysis.dxfText, opts);
  });
  return { ...result, kind: analysis.kind, filename: analysis.filename };
}
