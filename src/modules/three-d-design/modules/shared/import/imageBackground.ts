/**
 * Image-as-tracing-background.
 *
 * The user uploads a PNG/JPG of an existing floor plan; we mount it as a
 * positioned background image in the 2D editor and provide controls to
 * scale/rotate/calibrate it against a known measurement (a "two-point scale"
 * so the user can click two ends of a known wall and type its real length).
 *
 * Persistence
 *   The image lives in editor view-state (not the project document) by
 *   default — it's a tracing aid, not part of the deliverable. If the user
 *   wants it in the project, they can promote it via projectStore.update.
 *
 * Output
 *   Plain serializable record consumed by a future BackgroundLayer in the
 *   2D editor (Phase 8.5+).
 */

import { create } from 'zustand';

export interface ImageBackground {
  /** Object-URL of the loaded image. Caller is responsible for revoking. */
  url: string;
  /** Mime type (image/png, image/jpeg). */
  mime: string;
  /** Natural pixel size — used by the calibration math. */
  pixelWidth: number;
  pixelHeight: number;
  /** Position of the image's top-left corner in WORLD MM. */
  origin: { x: number; y: number };
  /** mm per source pixel — drives display size & calibration. */
  mmPerPixel: number;
  /** Rotation around image center, radians. */
  rotation: number;
  /** Display opacity (0..1). Tracing aids work best around 0.4. */
  opacity: number;
  /** Whether the image is hidden but kept loaded. */
  visible: boolean;
}

export interface ImageBackgroundState {
  background: ImageBackground | null;

  /** Load a File from an <input type="file"> or drag-drop event. */
  loadFile: (file: File) => Promise<void>;
  /** Replace settings without reloading. */
  update: (patch: Partial<ImageBackground>) => void;
  /** Calibrate by matching two clicked points to a known mm distance. */
  calibrate: (
    pixelStart: { x: number; y: number },
    pixelEnd: { x: number; y: number },
    realDistanceMm: number,
  ) => void;
  /** Free the object URL and clear state. */
  clear: () => void;
}

export const useImageBackground = create<ImageBackgroundState>((set, get) => ({
  background: null,

  loadFile: async (file) => {
    const url = URL.createObjectURL(file);
    const img = await loadImageMetadata(url);
    // Default 1 mm per pixel — the user calibrates afterward.
    set({
      background: {
        url,
        mime: file.type,
        pixelWidth: img.width,
        pixelHeight: img.height,
        origin: { x: 0, y: 0 },
        mmPerPixel: 1,
        rotation: 0,
        opacity: 0.4,
        visible: true,
      },
    });
  },

  update: (patch) => {
    const cur = get().background;
    if (!cur) return;
    set({ background: { ...cur, ...patch } });
  },

  calibrate: (pixelStart, pixelEnd, realDistanceMm) => {
    const cur = get().background;
    if (!cur) return;
    const dx = pixelEnd.x - pixelStart.x;
    const dy = pixelEnd.y - pixelStart.y;
    const pixelDist = Math.hypot(dx, dy);
    if (pixelDist <= 0 || realDistanceMm <= 0) return;
    set({ background: { ...cur, mmPerPixel: realDistanceMm / pixelDist } });
  },

  clear: () => {
    const cur = get().background;
    if (cur) URL.revokeObjectURL(cur.url);
    set({ background: null });
  },
}));

function loadImageMetadata(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}
