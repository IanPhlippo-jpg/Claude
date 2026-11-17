/**
 * Replace Model (View Layout ▸ Replace Model): the drawing keeps a copy of its model, so a changed part or assembly
 * file is brought in by choosing it again. The selected view's model (all views that show it) is replaced by the
 * chosen .kcad; see core/drawing/replaceModel.ts for what stays and what turns dangling.
 */
import { useStore } from '../store';
import { desktop } from '../desktop';
import { FILE_EXTENSION, readDocument } from '../../core/document/persistence';
import { replaceViewModels } from '../../core/drawing/replaceModel';
import type { Document } from '../../core/document/types';

/** the view whose model is replaced: the selected one, else the first view with a model */
function targetView() {
  const st = useStore.getState();
  const sheet = st.doc.sheets?.[0];
  const hasModel = (v: NonNullable<typeof sheet>['views'][number]) => !v.empty && (v.model.features.length > 0 || (v.model.components ?? []).length > 0);
  return sheet?.views.find((v) => v.id === st.selectedDrawingViewId && hasModel(v)) ?? sheet?.views.find(hasModel);
}

/** replaces the model of the target view (and every view showing it) by `model` */
export function replaceModelWith(model: Document): boolean {
  const st = useStore.getState();
  const sheet = st.doc.sheets?.[0];
  const view = targetView();
  if (!sheet || !view) {
    st.pushMessage('Replace Model: insert a view of a part or assembly first.', 'warn');
    return false;
  }
  if (model.kind === 'drawing') {
    st.pushMessage('Replace Model: choose a part or assembly file.', 'warn');
    return false;
  }
  const r = replaceViewModels(sheet, view.id, model);
  st.applyDocument('Replace Model', { ...st.doc, sheets: [r.sheet, ...(st.doc.sheets ?? []).slice(1)] });
  const views = `${r.views} view${r.views === 1 ? '' : 's'}`;
  const dangling = r.dangling ? `; ${r.dangling} annotation${r.dangling === 1 ? ' is' : 's are'} dangling (their geometry is gone).` : '.';
  st.pushMessage(`Replace Model: ${views} now show ${model.name}${dangling}`, r.dangling ? 'warn' : 'info');
  return true;
}

function fromFile(name: string, data: ArrayBuffer): void {
  try {
    const { doc, warnings } = readDocument(new TextDecoder().decode(data));
    for (const w of warnings) useStore.getState().pushMessage(w, 'warn');
    replaceModelWith(doc);
  } catch (err) {
    useStore.getState().pushMessage(`Cannot open ${name}: ${(err as Error).message}`, 'error');
  }
}

/** asks for the new model file (the desktop file dialog, or the browser's file picker) */
export function startReplaceModel(): void {
  if (!targetView()) {
    useStore.getState().pushMessage('Replace Model: insert a view of a part or assembly first.', 'warn');
    return;
  }
  const api = desktop();
  if (api) {
    api.openFile([{ name: 'Phlippo CAD part or assembly', extensions: ['kcad', 'json'] }]).then((f) => {
      if (f?.data) fromFile(f.name, f.data);
      else if (f?.error) useStore.getState().pushMessage(`Cannot open ${f.name}: ${f.error}`, 'error');
    });
    return;
  }
  let input = document.getElementById('phlippo-replace-model') as HTMLInputElement | null;
  if (!input) {
    input = document.createElement('input');
    input.id = 'phlippo-replace-model';
    input.type = 'file';
    input.accept = FILE_EXTENSION + ',.json';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const f = input!.files?.[0];
      if (f) fromFile(f.name, await f.arrayBuffer());
      input!.value = '';
    });
    document.body.appendChild(input);
  }
  input.click();
}
