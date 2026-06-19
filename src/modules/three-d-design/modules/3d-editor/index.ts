export { default as Editor3D } from './Editor3D';
export { SceneManager } from './scene/SceneManager';
export { InteractionController } from './interaction/InteractionController';
export {
  EQUIPMENT_CATALOG,
  getCatalogEntry,
  listCatalog,
  type CatalogEntry,
  type CatalogAnchor,
} from './loaders/equipmentCatalog';
export { loadEquipment, snapRotationDeg } from './loaders/GLBLoader';
export { placeEquipment, snapToFloorZ } from './loaders/placeEquipment';
export {
  buildSceneFromDescription,
  buildWallMesh,
  buildFloorMesh,
  buildEquipmentPlaceholder,
} from './builders/sceneBuilders';
