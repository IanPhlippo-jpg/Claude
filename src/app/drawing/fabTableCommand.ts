/**
 * Annotation ▸ Tables ▸ Frame Cut List / Bend Table (docs/36 L2.8, P4.8): the fab analysis of the view's model is loaded
 * on demand (src/fab stays out of the main chunk), its rows are written into the table, the table is saved with the
 * drawing and drawn like a General Table. Inserted again on the same view, the table is refreshed in place.
 */
import type { Document, DrawingSheet, DrawingView } from '../../core/document/types';
import { freeSpot } from '../../core/drawing/tables';
import { newId } from '../../core/sketch/model';
import { bomTableGrid as tableGrid } from '../prefsTables';
import { useStore } from '../store';
import { viewFrame } from '../../core/drawing/hlr';
import { layoutBalloons } from '../../core/drawing/balloons';
import { viewBounds, viewGeometry, viewToSheet } from '../../core/drawing/sheet';

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
  if (kind === 'cutList') {
    const c = m.cutListCells(v.model);
    if (c) centresOf.set(v.id, c.centres);
    return c?.cells ?? 'The model of the view has no structural members for a cut list.';
  }
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
  const t: NonNullable<DrawingSheet['tables']>[number] = { id: old?.id ?? newId('tb'), kind, viewId: v.id, cells, position: old?.position, bron: modelKey(v.model) };
  if (!t.position) { const g = tableGrid(sheet, t); t.position = freeSpot(sheet, g?.w ?? 80, g?.h ?? 20); }
  const tables = old ? (sheet.tables ?? []).map((x) => (x.id === old.id ? t : x)) : [...(sheet.tables ?? []), t];
  const withTable = { ...sheet, tables };
  const next = kind === 'cutList' ? withBalloons(withTable, v, t.id) : withTable;
  st.applyDocument(LABEL[kind], { ...st.doc, sheets: [next, ...(st.doc.sheets ?? []).slice(1)] });
  // a new table follows the cursor until a click places it, like the Hole Table
  if (!old) st.setDrawingTool({ kind: 'placeTable', id: t.id });
}

/** the key of a view's model: what changes the cut list or the bend table (features, sketches, parts, sheet metal) */
export function modelKey(m: Document): string {
  const text = JSON.stringify([m.features, m.sketches, m.components, m.sheetMetal, m.properties, m.activeConfiguration, m.material]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

/**
 * docs/37 N-15: a Frame Cut List or Bend Table follows its model. After every change of the drawing (a view updated
 * from its part, a configuration) the tables whose model key changed get new cells; nothing happens without them.
 */
let refreshing = false;
export async function refreshFabTables(): Promise<number> {
  if (refreshing) return 0;
  const doc = useStore.getState().doc;
  const stale = (doc.sheets ?? []).flatMap((sh, si) => (sh.tables ?? []).filter((t) => t.kind === 'cutList' || t.kind === 'bendTable')
    .map((t) => ({ si, t, v: sh.views.find((x) => x.id === t.viewId) })))
    .filter((x) => x.v && x.t.bron !== modelKey(x.v.model));
  if (!stale.length) return 0;
  refreshing = true;
  try {
    const fresh = await Promise.all(stale.map(async (x) => ({ ...x, cells: await fabTableCells(x.t.kind as Kind, x.v!).catch(() => 'error'), bron: modelKey(x.v!.model) })));
    const st = useStore.getState();
    const sheets = (st.doc.sheets ?? []).map((sh, si) => ({ ...sh, tables: (sh.tables ?? []).map((t) => {
      const f = fresh.find((x) => x.si === si && x.t.id === t.id);
      return f ? { ...t, bron: f.bron, ...(typeof f.cells === 'string' ? {} : { cells: f.cells }) } : t;
    }) })).map((sh, si) => fresh.filter((x) => x.si === si && x.t.kind === 'cutList' && typeof x.cells !== 'string')
      .reduce((acc: DrawingSheet, x) => withBalloons(acc, x.v!, x.t.id), sh as DrawingSheet));
    st.applyDocument('Update Tables', { ...st.doc, sheets });
    return fresh.length;
  } finally { refreshing = false; }
}
useStore.subscribe((s, prev) => { if (s.doc !== prev.doc && s.doc.kind === 'drawing') void refreshFabTables(); });

/** the centres of the saw-list positions of the last cut list made for a view (view id -> positions) */
const centresOf = new Map<string, { pos: number; at: [number, number, number] }[]>();

/**
 * L2.8: one balloon per saw-list position on the view of the cut list, with the ITEM NO. of the table (the position of the
 * saw list), laid out round the view as Auto Balloon does. The balloons of a table are its own ("<table id>-b<pos>"):
 * a refresh replaces them, other balloons stay.
 */
export function withBalloons(sheet: DrawingSheet, v: DrawingView, tableId: string): DrawingSheet {
  const centres = centresOf.get(v.id);
  if (!centres?.length) return sheet;
  const fr = viewFrame(v.type as Parameters<typeof viewFrame>[0]);
  const g = viewGeometry(v), b = viewBounds(sheet, v, g);
  const dot = (p: number[], q: { x: number; y: number; z: number }) => p[0] * q.x + p[1] * q.y + p[2] * q.z;
  const anchors = centres.map((c) => viewToSheet(sheet, v, g, [dot(c.at, fr.u), dot(c.at, fr.v)]));
  const lay = layoutBalloons(anchors, { x: b.x, y: b.y, w: b.w, h: b.h }, 'square', { offset: 12, gap: 10 });
  const mine = (id: string) => id.startsWith(`${tableId}-b`);
  const symbols = [...(sheet.symbols ?? []).filter((x) => !mine(x.id)),
    ...centres.map((c, i) => ({ id: `${tableId}-b${c.pos}`, kind: 'balloon' as const, anchor: anchors[i], position: lay.positions[i], text: String(c.pos), viewId: v.id }))];
  return { ...sheet, symbols };
}
