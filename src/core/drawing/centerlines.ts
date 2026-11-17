import type { DrawingSheet, DrawingSymbol, DrawingView } from '../document/types';
import { viewArcs } from './arcs';
import { viewGeometry, viewScale, viewToSheet } from './sheet';

type P = [number, number];
const PICTORIAL = new Set(['isometric', 'trimetric', 'dimetric']);

/**
 * Document Properties ▸ Detailing ▸ Auto insert on view creation ▸ Centerlines (0.5.16): a center line along the axis
 * of every cylinder and hole that a view shows from the side (its circular edges are seen edge-on), over the length
 * of the feature and a little beyond it, by design. Coaxial features (a counterbore, a
 * stepped shaft) share one line. Returned as Centerline annotations in sheet millimetres, tied to their view.
 */
export function autoCenterlines(sheet: DrawingSheet, views: DrawingView[], newId: () => string, beyond = 2.5): DrawingSymbol[] {
  const out: DrawingSymbol[] = [];
  for (const v of views) {
    if (PICTORIAL.has(v.type) || v.empty || v.predefined || v.relative || v.section || v.detail || v.aux) continue;
    const { axes } = viewArcs(v.model, v.type);
    const lines: { c: P; d: P; lo: number; hi: number }[] = [];
    for (const a of axes) {
      const line = lines.find((l) => Math.abs(l.d[0] * a.dir[1] - l.d[1] * a.dir[0]) < 1e-3 && Math.abs((a.c[0] - l.c[0]) * l.d[1] - (a.c[1] - l.c[1]) * l.d[0]) < 0.05);
      if (line) {
        const tl = (a.c[0] - line.c[0]) * line.d[0] + (a.c[1] - line.c[1]) * line.d[1];
        line.lo = Math.min(line.lo, tl);
        line.hi = Math.max(line.hi, tl);
      } else lines.push({ c: a.c, d: a.dir, lo: 0, hi: 0 });
    }
    const g = viewGeometry(v);
    const ext = beyond / viewScale(sheet, v);
    const existing = (sheet.symbols ?? []).filter((s) => s.kind === 'centerline' && s.viewId === v.id);
    for (const l of lines) {
      // a single circle has no length along its axis (a flat disc edge): nothing to centre
      if (l.hi - l.lo < 0.5) continue;
      const pa: P = [l.c[0] + l.d[0] * (l.lo - ext), l.c[1] + l.d[1] * (l.lo - ext)];
      const pb: P = [l.c[0] + l.d[0] * (l.hi + ext), l.c[1] + l.d[1] * (l.hi + ext)];
      const a = viewToSheet(sheet, v, g, pa), b = viewToSheet(sheet, v, g, pb);
      if (existing.some((s) => s.a && s.b && Math.hypot(s.a[0] - a[0], s.a[1] - a[1]) < 0.05 && Math.hypot(s.b[0] - b[0], s.b[1] - b[1]) < 0.05)) continue;
      out.push({ id: newId(), kind: 'centerline', position: a, a, b, viewId: v.id });
    }
  }
  return out;
}
