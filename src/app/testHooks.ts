/**
 * The test hooks (window.__phlippoStore, __phlippoKit, __phlippoCamera …) let the e2e scripts drive the app.
 * They exist in the dev server, in the e2e build (VITE_TEST_HOOKS=1) and in the unpackaged desktop shell with PHLIPPO_E2E=1.
 *
 * The app itself never reads them: everything the viewport offers goes through the bridge (viewport/bridge.ts), and
 * `exposeTestHooks` only mirrors that bridge on `window` as getters.
 */
import { bridge, fitActive } from './viewport/bridge';

const d = (window as unknown as { phlippoDesktop?: { testHooks?: boolean } }).phlippoDesktop;
// on only in the dev server, in a build made with VITE_TEST_HOOKS=1 (npm run build:e2e, the browser regression) and in the
// unpackaged desktop shell started with PHLIPPO_E2E=1. A normal build (hosted or packaged) has none (F89).
export const TEST_HOOKS: boolean = import.meta.env.DEV || import.meta.env.VITE_TEST_HOOKS === '1' || !!d?.testHooks;

const MIRROR: Record<string, () => unknown> = {
  __phlippoZoomFit: () => fitActive,
  __phlippoSnapshot: () => bridge.snapshot,
  __phlippoFinalRender: () => bridge.finalRender,
  __phlippoCamera: () => bridge.camera,
  __phlippoScene: () => bridge.scene,
  __phlippoBodies: () => bridge.bodies,
  __phlippoBodyScene: () => bridge.bodies,
  __phlippoTools: () => bridge.tools,
  __phlippoRenderer: () => bridge.renderer,
  __phlippoProject: () => bridge.project,
  __phlippoProjectWorld: () => bridge.projectWorld,
  __phlippoSheet: () => bridge.sheet,
  __phlippoSave: () => bridge.save,
  __phlippoShortcutBar: () => bridge.shortcutBar,
};

/** Mirrors the viewport bridge on `window` (test builds only). */
export function exposeTestHooks(extra: Record<string, unknown>): void {
  if (!TEST_HOOKS) return;
  const w = window as unknown as Record<string, unknown>;
  for (const [k, get] of Object.entries(MIRROR)) Object.defineProperty(w, k, { get, configurable: true, enumerable: false });
  for (const [k, v] of Object.entries(extra)) w[k] = v;
}
