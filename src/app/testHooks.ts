/**
 * The test hooks (window.__phlippoStore, __phlippoKit, __phlippoSnapshot …) let the e2e scripts drive the app.
 * They exist in the dev server and in the browser build (the regression runs on `vite preview`), but not in the
 * packaged desktop app unless it was started with PHLIPPO_E2E=1 (the desktop checks).
 */
const d = (window as unknown as { phlippoDesktop?: { testHooks?: boolean } }).phlippoDesktop;
export const TEST_HOOKS: boolean = import.meta.env.DEV || !d || !!d.testHooks;
