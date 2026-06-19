/**
 * Public surface of the 3D Design module. Pages should import only from here.
 */

export * from './core';
export * from './store';
export { Editor2D, useEditor2DState } from './modules/2d-editor';
export {
  Editor3D,
  SceneManager,
  InteractionController,
  EQUIPMENT_CATALOG,
  getCatalogEntry,
  listCatalog,
  loadEquipment,
  placeEquipment,
  type CatalogEntry,
  type CatalogAnchor,
} from './modules/3d-editor';
export {
  analyzeCadFile,
  analyzeDxf,
  applyCadImport,
  detectWallLayers,
  guessUnitFromBounds,
  importDxfFile,
  importDxfIntoDraft,
  importCadFile,
  readCadFileToDxfText,
  detectCadKind,
  SUPPORTED_CAD_EXTENSIONS,
  CAD_ACCEPT_ATTR,
  useImageBackground,
  type CadAnalysis,
  type DxfImportOptions,
  type DxfImportResult,
  type CadFileKind,
  type CadImportOptions,
  type CadImportResult,
  type ImageBackground,
} from './modules/shared/import';
export { default as ToolbarButton } from './components/ui/ToolbarButton';
export * from './lib/format';
