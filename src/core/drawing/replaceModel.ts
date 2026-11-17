import type { Document, DrawingSheet, DrawingView } from '../document/types';
import { configurations, documentForConfiguration } from '../document/configurations';
import { dimensionValue, sheetToView, viewGeometry, viewToSheet, type ViewGeo } from './sheet';
import { viewArcs } from './arcs';

type P = [number, number];
const TOL = 0.02;
const near = (a: P, b: P, tol = TOL) => Math.hypot(a[0] - b[0], a[1] - b[1]) < tol;

/** distance from a point to the nearest line of the view (hidden ones too: a dimension may sit on a hidden edge) */
function onLine(g: ViewGeo, p: P): number {
  let best = Infinity;
  for (const l of g.lines) {
    const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - l.a[0]) * dx + (p[1] - l.a[1]) * dy) / L2)) : 0;
    best = Math.min(best, Math.hypot(l.a[0] + dx * t - p[0], l.a[1] + dy * t - p[1]));
  }
  for (const c of g.circles) best = Math.min(best, Math.abs(Math.hypot(p[0] - c.c[0], p[1] - c.c[1]) - c.r));
  return best;
}

const circleAt = (g: ViewGeo, c: P, r?: number) => g.circles.some((k) => near(k.c, c) && (r === undefined || Math.abs(k.r - r) < TOL));

/**
 * Replace Model (the drawing keeps a copy of its model): every view that shows the model of view `viewId` gets the new
 * model, keeping its place, scale, orientation and settings. Annotations whose geometry is still there stay as they
 * are; the others are marked dangling (drawn in the dangling colour, hidden with Hide dangling dimensions and
 * annotations), by design. Annotations kept in sheet millimetres (balloons, centerlines) move
 * with the model point they were at when the new model's view centre shifts.
 */
export function replaceViewModels(sheet: DrawingSheet, viewId: string, model: Document): { sheet: DrawingSheet; views: number; dangling: number } {
  const target = sheet.views.find((v) => v.id === viewId);
  if (!target) return { sheet, views: 0, dangling: 0 };
  const shows = (v: DrawingView) => v.model === target.model || v.modelName === target.modelName;
  const names = new Set(configurations(model).map((c) => c.name));
  const modelName = `${model.name}<1>`;
  const before = new Map<string, { v: DrawingView; g: ViewGeo }>();
  const views = sheet.views.map((v) => {
    if (!shows(v)) return v;
    before.set(v.id, { v, g: viewGeometry(v) });
    const keepCfg = !!v.configuration && names.has(v.configuration);
    const next: DrawingView = { ...v, model: keepCfg ? documentForConfiguration(model, v.configuration) : model, modelName };
    if (!keepCfg) delete next.configuration;
    return next;
  });
  const after = new Map(views.filter((v) => before.has(v.id)).map((v) => [v.id, { v, g: viewGeometry(v) }]));
  let dangling = 0;
  const flag = <T extends { dangling?: boolean }>(x: T, gone: boolean): T => {
    if (gone) dangling++;
    if (gone === !!x.dangling) return x;
    const y = { ...x };
    if (gone) y.dangling = true;
    else delete y.dangling;
    return y;
  };
  const dimensions = sheet.dimensions.map((d) => {
    const n = after.get(d.viewId);
    if (!n) return d;
    const gone = d.kind === 'linear' ? onLine(n.g, d.a) > TOL || onLine(n.g, d.b) > TOL : !circleAt(n.g, d.a, Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1])) && onLine(n.g, d.b) > TOL;
    const out = flag(d, gone);
    return gone ? out : { ...out, value: dimensionValue(out) };
  });
  const centerMarks = sheet.centerMarks.map((m) => {
    const n = after.get(m.viewId);
    if (!n) return m;
    const v = n.v, type = v.detail ? v.detail.parentType : v.type;
    const arcs = () => (v.section || v.aux ? { arcs: [], slots: [] } : viewArcs(v.model, type));
    let ok: boolean;
    if (m.kind === 'slot') ok = arcs().slots.some((s) => near(s.c1, m.c) && !!m.c2 && near(s.c2, m.c2));
    else if (m.kind === 'linear') ok = circleAt(n.g, m.c) && !!m.c2 && circleAt(n.g, m.c2);
    else if (m.kind === 'circular') ok = n.g.circles.some((k) => Math.abs(Math.hypot(k.c[0] - m.c[0], k.c[1] - m.c[1]) - m.r) < TOL);
    else ok = circleAt(n.g, m.c, m.r) || arcs().arcs.some((a) => near(a.c, m.c) && Math.abs(a.r - m.r) < TOL);
    return flag(m, !ok);
  });
  const symbols = (sheet.symbols ?? []).map((s) => {
    const n = s.viewId ? after.get(s.viewId) : undefined;
    const o = s.viewId ? before.get(s.viewId) : undefined;
    if (!n || !o || s.kind === 'areaHatch') return s;
    // the same model point on the sheet, after the view centre moved with the new model's size
    const move = (p: P): P => viewToSheet(sheet, n.v, n.g, sheetToView(sheet, o.v, o.g, p));
    const d0 = s.anchor ?? s.a ?? s.position;
    const d1 = move(d0);
    const dx = d1[0] - d0[0], dy = d1[1] - d0[1];
    const sh = (p: P): P => [p[0] + dx, p[1] + dy];
    const moved = { ...s, position: sh(s.position), ...(s.anchor ? { anchor: sh(s.anchor) } : {}), ...(s.a ? { a: sh(s.a) } : {}), ...(s.b ? { b: sh(s.b) } : {}) };
    if (!s.anchor || s.kind === 'centerline') return moved;
    const q = sheetToView(sheet, n.v, n.g, moved.anchor!);
    // a balloon's dot sits on a face (inside the view's outline), every other leader on an edge
    const gone = s.kind === 'balloon' && s.head !== 'arrow' ? q[0] < n.g.min[0] - TOL || q[0] > n.g.max[0] + TOL || q[1] < n.g.min[1] - TOL || q[1] > n.g.max[1] + TOL : onLine(n.g, q) > 0.1;
    return flag(moved, gone);
  });
  return { sheet: { ...sheet, views, dimensions, centerMarks, ...(sheet.symbols ? { symbols } : {}) }, views: after.size, dangling };
}
