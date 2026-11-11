/**
 * Export and Publish of a model with rebuild errors (QA 0.5.13, F204): the same confirmation as Save (F40), because
 * a STEP, mesh or viewer file of a half-rebuilt part looks complete to whoever opens it.
 */
import { useStore } from './store';
import { warnSaveWithErrors } from './prefsEffects';
import { exportQuestion } from './exportQuestion';

/** runs `go` at once, or after the user confirms exporting a model with rebuild errors */
export function confirmExport(what: string, go: () => void): void {
  const st = useStore.getState();
  const text = exportQuestion(st.doc.name, st.rebuild.errors, what, warnSaveWithErrors());
  if (!text) return go();
  st.setAsk({ title: 'Phlippo CAD', text, yes: go, yesLabel: 'Export Anyway', noLabel: 'Cancel' });
}
