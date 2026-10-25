/**
 * The viewport bridge: what the rest of the app needs from the graphics area (fit, snapshots, the camera, the scene)
 * without going through `window`. The Viewport and the drawing sheet register themselves here while they are mounted;
 * commands, dialogs and the ribbon read from here. The test hooks (`window.__phlippo*`) are only a mirror of this
 * object and exist solely with TEST_HOOKS (see testHooks.ts), so the packaged app works without them.
 */
import type * as THREE from 'three';
import type { CadCamera } from './camera';
import type { BodyScene } from './bodyScene';
import type { ToolController } from './tools';
import type { SketchPoint } from '../../core/sketch/types';

export interface SheetBridge {
  toPx: (p: [number, number]) => { x: number; y: number };
  toSheet: (px: number, py: number) => [number, number];
  viewToSheet: (viewId: string, p: [number, number]) => [number, number] | null;
  bounds: (viewId: string) => { x: number; y: number; w: number; h: number } | null;
}

export interface SketchToolOptions {
  polygonSides: number;
  polygonInscribed: boolean;
  rectConstruction?: { on: boolean; mode: 'corners' | 'midpoints' };
  textOptions?: { text: string; height: number; bold: boolean; widthFactor: number; spacing: number; angle: number };
}

export interface ViewportBridge {
  /** Zoom to Fit of the graphics area (the model) */
  zoomFit?: () => void;
  /** Zoom to Sheet of the drawing sheet; set only while a sheet is shown */
  sheetFit?: () => void;
  /** a picture of the graphics area on the scene background (optionally one component only) */
  snapshot?: (only?: string) => string | null;
  /** Render Tools ▸ Final Render */
  finalRender?: () => Promise<string | null>;
  camera?: CadCamera;
  scene?: THREE.Scene;
  bodies?: BodyScene;
  tools?: ToolController;
  renderer?: THREE.WebGLRenderer | null;
  /** sketch point of the active plane → screen pixel */
  project?: (p: SketchPoint) => { x: number; y: number };
  /** world point → screen pixel */
  projectWorld?: (x: number, y: number, z: number) => { x: number; y: number };
  sheet?: SheetBridge;
  /** File ▸ Save and the shortcut bar, as the command catalog (Customize) reaches them */
  save?: () => void;
  shortcutBar?: () => void;
  /** options of the sketch PropertyManager that the sketch tools read (polygon sides, construction lines, text) */
  sketchOptions: SketchToolOptions;
}

export const bridge: ViewportBridge = { sketchOptions: { polygonSides: 6, polygonInscribed: true } };

/** Zoom to Fit of whatever is shown: the drawing sheet when one is open, otherwise the model. */
export function fitActive(): void {
  (bridge.sheetFit ?? bridge.zoomFit)?.();
}
