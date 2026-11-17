/**
 * The geometry of a DXF file (dxfRead.ts) as sketch entities: lines, arcs, circles, ellipses, partial ellipses,
 * splines and points. End points that meet (within a tolerance that follows the size of the drawing) become one sketch
 * point, so the outlines of the drawing are closed contours that extrude.
 *
 * The entities come from the sketch model API (model.ts), each made on a small scratch sketch and then moved into the
 * target: adding them one by one to the full sketch copies its maps every time, which is slow for a drawing of
 * thousands of entities.
 */
import { addArc, addCircle, addEllipse, addEllipseArc, addLine, addPoint, addPointParam, addSpline, createSketch } from '../sketch/model';
import type { Id, Sketch, SketchPoint } from '../sketch/types';
import type { DxfDrawing, DxfShape, P2 } from './dxfRead';

export interface DxfSketchResult {
  sketch: Sketch;
  /** entities added per kind */
  counts: Record<string, number>;
  /** end points merged with another end point */
  merged: number;
  /** the size of the drawing (mm) */
  size: { w: number; h: number };
}

/** the box around the end points and centres of the shapes */
function extent(shapes: DxfShape[]): { min: P2; max: P2 } {
  const min = { x: Infinity, y: Infinity }, max = { x: -Infinity, y: -Infinity };
  const add = (p: P2) => { min.x = Math.min(min.x, p.x); min.y = Math.min(min.y, p.y); max.x = Math.max(max.x, p.x); max.y = Math.max(max.y, p.y); };
  for (const s of shapes) {
    if (s.kind === 'line') { add(s.a); add(s.b); } else if (s.kind === 'point') add(s.p);
    else if (s.kind === 'spline') s.pts.forEach(add);
    else { const r = Math.hypot(s.major.x, s.major.y); add({ x: s.c.x - r, y: s.c.y - r }); add({ x: s.c.x + r, y: s.c.y + r }); }
  }
  return { min, max };
}

/**
 * Adds the drawing to the sketch, moved by `offset` (sketch coordinates). `tolerance` is the distance below which end
 * points merge (default: 1e-5 of the drawing size, between 1e-6 and 0.01 mm).
 */
export function addDxfToSketch(target: Sketch, d: DxfDrawing, opts: { offset?: P2; tolerance?: number } = {}): DxfSketchResult {
  const off = opts.offset ?? { x: 0, y: 0 };
  const { min, max } = extent(d.shapes);
  const size = Number.isFinite(min.x) ? { w: max.x - min.x, h: max.y - min.y } : { w: 0, h: 0 };
  const tol = opts.tolerance ?? Math.min(0.01, Math.max(1e-6, Math.max(size.w, size.h) * 1e-5));
  const points = { ...target.points }, scalars = { ...target.scalars }, entities = { ...target.entities };
  const order = [...target.entityOrder];
  const counts: Record<string, number> = {};
  let merged = 0;
  const put = (tmp: Sketch, kind: string) => {
    Object.assign(points, tmp.points);
    Object.assign(scalars, tmp.scalars);
    for (const id of tmp.entityOrder) { entities[id] = tmp.entities[id]; order.push(id); }
    counts[kind] = (counts[kind] ?? 0) + 1;
  };
  const scratch = (pts: Record<Id, SketchPoint> = {}): Sketch => ({ ...createSketch('dxf', 'dxf'), points: pts, origin: '' });
  // end points on a grid of the tolerance: a point merges with one in its own or a neighbouring cell
  const grid = new Map<string, Id[]>();
  const at = (q: P2): P2 => ({ x: q.x + off.x, y: q.y + off.y });
  const endPoint = (q0: P2): Id => {
    const q = at(q0);
    const gx = Math.round(q.x / tol), gy = Math.round(q.y / tol);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const id of grid.get(`${gx + i},${gy + j}`) ?? []) {
        if (Math.hypot(points[id].x - q.x, points[id].y - q.y) <= tol) { merged++; return id; }
      }
    }
    const [tmp, id] = addPointParam(scratch(), q);
    points[id] = tmp.points[id];
    const key = `${gx},${gy}`;
    grid.set(key, [...(grid.get(key) ?? []), id]);
    return id;
  };
  for (const s of d.shapes) {
    if (s.kind === 'point') { put(addPoint(scratch(), at(s.p))[0], 'point'); continue; }
    if (s.kind === 'line') {
      const a = endPoint(s.a), b = endPoint(s.b);
      if (a !== b) put(addLine(scratch(), a, b)[0], 'line');
      continue;
    }
    if (s.kind === 'spline') {
      const a = endPoint(s.pts[0]);
      const b = s.closed ? a : endPoint(s.pts[s.pts.length - 1]);
      const inner = s.pts.slice(1, -1).map(at);
      if (a === b && !s.closed && inner.length < 2) continue;
      put(addSpline(scratch(), [a, ...inner, b])[0], 'spline');
      continue;
    }
    const r = Math.hypot(s.major.x, s.major.y);
    if (!(r > 1e-9)) continue;
    const pt = (t: number): P2 => {
      const ux = s.major.x / r, uy = s.major.y / r, b = r * s.ratio;
      return { x: s.c.x + r * Math.cos(t) * ux - b * Math.sin(t) * uy, y: s.c.y + r * Math.cos(t) * uy + b * Math.sin(t) * ux };
    };
    const circular = Math.abs(1 - s.ratio) < 1e-9;
    if (s.full) {
      if (circular) put(addCircle(scratch(), at(s.c), r)[0], 'circle');
      else put(addEllipse(scratch(), at(s.c), at({ x: s.c.x + s.major.x, y: s.c.y + s.major.y }), r * s.ratio)[0], 'ellipse');
      continue;
    }
    const a = endPoint(pt(s.t0)), b = endPoint(pt(s.t1));
    if (a === b && s.t1 - s.t0 < Math.PI) continue;
    if (circular) {
      put(addArc(scratch({ [a]: points[a], [b]: points[b] }), at(s.c), a, b, true)[0], 'arc');
      continue;
    }
    // a partial ellipse gets its own end points from the model API; they are swapped for the shared ones
    const [tmp, e] = addEllipseArc(scratch(), at(s.c), at({ x: s.c.x + s.major.x, y: s.c.y + s.major.y }), r * s.ratio, points[a], points[b], true);
    const own = { ...tmp.points };
    delete own[e.start];
    delete own[e.end];
    put({ ...tmp, points: own, entities: { [e.id]: { ...e, start: a, end: b } } }, 'ellipseArc');
  }
  return { sketch: { ...target, points, scalars, entities, entityOrder: order }, counts, merged, size };
}

/** "12 lines, 4 arcs, 1 circle" */
export function describeCounts(counts: Record<string, number>): string {
  const names: Record<string, [string, string]> = {
    line: ['line', 'lines'], arc: ['arc', 'arcs'], circle: ['circle', 'circles'], ellipse: ['ellipse', 'ellipses'],
    ellipseArc: ['partial ellipse', 'partial ellipses'], spline: ['spline', 'splines'], point: ['point', 'points'],
  };
  return Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${(names[k] ?? [k, k])[n === 1 ? 0 : 1]}`).join(', ');
}
