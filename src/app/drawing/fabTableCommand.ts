/**
 * Annotation ▸ Tables ▸ Frame Cut List / Bend Table (docs/36 L2.8, P4.8): the fab analysis of the view's model is loaded
 * on demand (src/fab stays out of the main chunk), its rows are written into the table, the table is saved with the
 * drawing and drawn like a General Table. Inserted again on the same view, the table is refreshed in place.
 */
import type { DrawingSheet, DrawingView } from '../../core/document/types';
import { freeSpot } from '../../core/drawing/tables';
import { newId } from '../../core/sketch/model';
import { bomTableGrid as tableGrid } from '../prefsTables';
import { useStore } from '../store';

type Kind = 'cutList' | 'bendTable';
const LABEL: Record<Kind, string> = { cutList: 'Frame Cut List', bendTable: 'Bend Table' };

/** the selected view, else (bend table) a view showing bend lines, else the first view with a model */
function pickView(sheet: DrawingSheet, kind: Kind, selected: string | null): DrawingView | undefined {
  const views = sheet.views.filter((v) => !v.empty && v.model.kind !== 'drawing');
  return views.find((v) => v.id === selected) ?? (kind === 'bendTable' ? views.find((v) => v.bendLines) : undefined) ?? views[0];
}

/** the cells of a table of the view's model, or a message why there are none */
export async function fabTableCells(kind: Kind, v: DrawingView): Promise<string[][] | string> {
  const m = await import('./fabTables');
  if (kind === 'cutList') return m.cutListCells(v.model)?.cells ?? 'The model of the view has no structural members for a cut list.';
  const { useFab } = await import('../fab/fabStore');
  return m.bendTableCells(v.model, useFab.getState().settings.machines.plooien)?.cells ?? 'The model of the view has no sheet metal part with bends.';
}

export async function insertFabTable(kind: Kind): Promise<void> {
  const st0 = useStore.getState();
  const sheet0 = st0.doc.sheets?.[0];
  const v = sheet0 && pickView(sheet0, kind, st0.selectedDrawingViewId);
  if (!sheet0 || !v) return st0.pushMessage('Insert a drawing view of the part first.', 'warn');
  let cells: string[][] | string;
  try { cells = await fabTableCells(kind, v); } catch (e) { return st0.pushMessage(`${LABEL[kind]} failed: ${(e as Error).message}`, 'error'); }
  if (typeof cells === 'string') return st0.pushMessage(cells, 'warn');
  // the analysis may take a moment: write into the sheet as it is now, if the view is still on it
  const st = useStore.getState();
  const sheet = st.doc.sheets?.[0];
  if (!sheet || !sheet.views.some((x) => x.id === v.id)) return;
  const old = (sheet.tables ?? []).find((t) => t.kind === kind && t.viewId === v.id);
  const t: NonNullable<DrawingSheet['tables']>[number] = { id: old?.id ?? newId('tb'), kind, viewId: v.id, cells, position: old?.position };
  if (!t.position) { const g = tableGrid(sheet, t); t.position = freeSpot(sheet, g?.w ?? 80, g?.h ?? 20); }
  const tables = old ? (sheet.tables ?? []).map((x) => (x.id === old.id ? t : x)) : [...(sheet.tables ?? []), t];
  st.applyDocument(LABEL[kind], { ...st.doc, sheets: [{ ...sheet, tables }, ...(st.doc.sheets ?? []).slice(1)] });
  // a new table follows the cursor until a click places it, like the Hole Table
  if (!old) st.setDrawingTool({ kind: 'placeTable', id: t.id });
}
