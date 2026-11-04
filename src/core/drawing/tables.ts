import type { Document } from '../document/types';
import { bomDescription, bomPartNumber, descriptionProperty } from '../document/configurations';
import type { DrawingSheet, DrawingView } from '../document/types';
import { sheetSize, viewBounds, viewGeometry } from './sheet';

/** Hole Table rows of a view: tag, X/Y from the lower left of the view, size (concentric circles together). */
export function holeTableRows(v: DrawingView): { tag: string; x: number; y: number; size: string }[] {
  const g = viewGeometry(v);
  const groups: { c: [number, number]; r: number[] }[] = [];
  for (const c of g.circles) {
    const grp = groups.find((x) => Math.hypot(x.c[0] - c.c[0], x.c[1] - c.c[1]) < 0.05);
    if (grp) { if (!grp.r.some((r) => Math.abs(r - c.r) < 0.01)) grp.r.push(c.r); }
    else groups.push({ c: c.c, r: [c.r] });
  }
  groups.sort((a, b) => b.c[1] - a.c[1] || a.c[0] - b.c[0]);
  return groups.map((grp, i) => {
    const rs = [...grp.r].sort((a, b) => a - b);
    return { tag: `A${i + 1}`, x: grp.c[0] - g.min[0], y: grp.c[1] - g.min[1], size: rs.map((r, k) => `Ø${(2 * r).toFixed(2)}${k ? ' ⌴' : ' THRU'}`).join(' ') };
  });
}

/** width of a table column that fits its texts (2.8 mm Century Gothic: about 1.75 mm per character), as the intended auto-fit */
function fitCols(rows: string[][], min: number[]): number[] {
  return min.map((m, ci) => Math.max(m, ...rows.map((r) => (r[ci] ?? '').length * 1.75 + 3)));
}

/** A table's cells and frame on the sheet: top-left corner, column widths, rows (first row = header). */
export function tableGrid(sheet: DrawingSheet, t: NonNullable<DrawingSheet['tables']>[number], descProp = 'Description'): { pos: [number, number]; cols: number[]; rows: string[][]; rowH: number; w: number; h: number } | null {
  const rowH = 6;
  const done = (pos: [number, number], cols: number[], rows: string[][]) => ({ pos, cols, rows, rowH, w: cols.reduce((a, b) => a + b, 0), h: rows.length * rowH });
  if (t.kind === 'general') {
    const rows = t.cells ?? [];
    return done(t.position ?? [30, 80], fitCols(rows, (rows[0] ?? []).map(() => 25)), rows);
  }
  const v = sheet.views.find((x) => x.id === t.viewId);
  if (!v) return null;
  if (t.kind === 'hole') {
    const rows = [['TAG', 'X LOC', 'Y LOC', 'SIZE'], ...holeTableRows(v).map((r) => [r.tag, r.x.toFixed(2), r.y.toFixed(2), r.size])];
    return done(t.position ?? [20, 60], fitCols(rows, [12, 18, 18, 30]), rows);
  }
  const rows: string[][] = [['ITEM NO.', 'PART NUMBER', 'DESCRIPTION', 'QTY.']];
  if (v.model.kind === 'assembly') {
    const counts = new Map<string, number>();
    const first = new Map<string, { part: Document; cfg?: string }>();
    for (const c of v.model.components ?? []) {
      if (c.envelope || c.suppressed) continue;
      const pn = bomPartNumber(c.part, c.configuration);
      counts.set(pn, (counts.get(pn) ?? 0) + 1);
      if (!first.has(pn)) first.set(pn, { part: c.part, cfg: c.configuration });
    }
    [...counts].forEach(([name, n], i) => rows.push([String(i + 1), name, bomDescription(first.get(name)!.part, first.get(name)!.cfg, descProp), String(n)]));
  } else rows.push(['1', v.model.name, descriptionProperty(v.model, descProp), '1']);
  const cols = fitCols(rows, [14, 50, 40, 12]);
  const W = cols.reduce((a, b) => a + b, 0);
  const [sw, sh] = sheetSize(sheet);
  // anchored at the top right of the border (below a revision table), until it is dragged elsewhere
  const top = sh - 10 - ((sheet.revisions ?? []).length ? (sheet.revisions!.length + 2) * 6 + 4 : 0);
  return done(t.position ?? [sw - 10 - W, top], cols, rows);
}

/** a free spot for a new table or block: inside the border, clear of the views, the title block and other tables */
export function freeSpot(sheet: DrawingSheet, w: number, h: number): [number, number] {
  const [sw, sh] = sheetSize(sheet);
  const busy: { x: number; y: number; w: number; h: number }[] = sheet.views.map((v) => viewBounds(sheet, v, viewGeometry(v)));
  // the title block of the format (bottom right, 180 x 56 on A3/A4 like the intended ISO format)
  busy.push({ x: sw - 10 - Math.min(180, sw - 20), y: 10, w: Math.min(180, sw - 20), h: 56 });
  for (const t of sheet.tables ?? []) { const g = tableGrid(sheet, t); if (g) busy.push({ x: g.pos[0], y: g.pos[1] - g.h, w: g.w, h: g.h }); }
  for (const n of sheet.notes) busy.push({ x: n.position[0], y: n.position[1] - 1, w: n.text.length * (n.fontSize ?? 3.5) * 0.6, h: (n.fontSize ?? 3.5) + 2 });
  const free = (x: number, y: number) => busy.every((b) => x + w + 3 < b.x || x - 3 > b.x + b.w || y - 3 < b.y || y - h + 3 > b.y + b.h);
  // top left first, then along the rows: the corner the intended tables are usually dragged to
  for (let y = sh - 15; y - h > 12; y -= 5)
    for (let x = 15; x + w < sw - 12; x += 5) if (free(x, y)) return [x, y];
  return [15, sh - 15];
}
