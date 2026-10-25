import { applyColorScheme, loadPrefs as loadColorPrefs } from './app/prefs';
import { createDocument } from './core/document/types';
import { addArc, addCircle, addConstraint, addLine, addPoint, addSpline, createSketch, newId } from './core/sketch/model';
import { referencePlane, REFERENCE_PLANE_DEFS } from './core/features/planes';
import { findMaterial } from './core/document/materials';
import { projectedView } from './core/drawing/sheet';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { GlobalTooltip } from './ui/Tooltip';
import { useStore } from './app/store';
import { TEST_HOOKS } from './app/testHooks';
// test hooks: the dev server and the browser build (regression on vite preview) have them; the packaged desktop app only with PHLIPPO_E2E=1
if (TEST_HOOKS) {
  (window as unknown as { __phlippoStore?: typeof useStore }).__phlippoStore = useStore;
  // building blocks for scripted example documents (voorbeelden/) and tests
  (window as unknown as { __phlippoKit?: unknown }).__phlippoKit = { createDocument, createSketch, addConstraint, addLine, addCircle, addArc, addPoint, addSpline, referencePlane, REFERENCE_PLANE_DEFS, findMaterial, newId, projectedView };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <GlobalTooltip />
    </ErrorBoundary>
  </StrictMode>,
);

// the saved colour scheme and edited colours (System Options ▸ Colors)
try {
  applyColorScheme(loadColorPrefs());
} catch {
  /* defaults */
}
