import * as THREE from 'three';
import type { Document, DrawingDimension, DrawingView } from '../../core/document/types';
import { isDimension, type SketchPoint } from '../../core/sketch/types';
import { resolvePlaneDef } from '../../core/features/planes';
import { planeMatrix } from '../../core/features/solid';
import { viewFrame } from '../../core/drawing/hlr';
import { viewGeometry } from '../../core/drawing/sheet';
import { dimensionDrawing } from '../viewport/annotations';
import { newId } from '../../core/sketch/model';

/** The dimension types the Model Items Property Panel can import. */
export interface ModelItemsOptions {
  /** 'Marked for drawing' sketch dimensions (all driving sketch dimensions here) */
  sketchDims: boolean;
  /** feature dimensions such as the depth of an extrusion */
  featureDims: boolean;
  /** Hole Tool / circle diameters are imported as diameter dimensions */
  holeDims: boolean;
  /** Include items from hidden features (a hidden sketch); off: only shown sketches */
  includeHidden?: boolean;
  /** Use dimension placement in sketch (default on); off: the texts are set outside the view's outline */
  sketchPlacement?: boolean;
  /** Eliminate duplicates (default on): each dimension in one view only; off: in every view that can show it */
  eliminateDuplicates?: boolean;
}

const ORTHO = new Set(['front', 'back', 'top', 'bottom', 'left', 'right']);

/**
 * Model Items: the model's dimensions shown in the drawing views, each once, in the first view
 * whose plane is parallel to the sketch (sketch dimensions) or that shows the feature edge-on (extrude depth).
 */
export function modelItems(views: DrawingView[], opts: ModelItemsOptions, existing: DrawingDimension[] = []): DrawingDimension[] {
  const out: DrawingDimension[] = [];
  const targets = views.filter((v) => ORTHO.has(v.type) && !v.section && !v.detail && !v.aux && v.model.kind !== 'assembly');
  const done = new Set<string>();
  const once = opts.eliminateDuplicates !== false;
  // a cropped or broken view only takes dimensions whose geometry it still shows
  const shows = (v: DrawingView, d: DrawingDimension) => {
    if (v.break) return false;
    if (!v.crop) return true;
    const inC = (p: [number, number]) => p[0] >= v.crop!.min[0] - 1e-6 && p[0] <= v.crop!.max[0] + 1e-6 && p[1] >= v.crop!.min[1] - 1e-6 && p[1] <= v.crop!.max[1] + 1e-6;
    return inC(d.a) && inC(d.b);
  };
  const dupe = (viewId: string, a: [number, number], b: [number, number], value: number) =>
    [...existing, ...out].some((d) => d.viewId === viewId && Math.abs(d.value - value) < 1e-6 && ((near(d.a, a) && near(d.b, b)) || (near(d.a, b) && near(d.b, a))));
  for (const v of targets) {
    const model: Document = v.model;
    const fr = viewFrame(v.type);
    const to2 = (p: THREE.Vector3): [number, number] => [p.dot(fr.u), p.dot(fr.v)];
    for (const f of model.features) {
      if (f.suppressed) continue;
      // sketch dimensions in a view parallel to the sketch plane
      if (f.type === 'sketch' && (opts.sketchDims || opts.holeDims)) {
        if ((f as { hidden?: boolean }).hidden && !opts.includeHidden) continue;
        const s = model.sketches[f.sketchId];
        if (!s) continue;
        const pd = resolvePlaneDef(model, s.plane);
        const n = new THREE.Vector3(...pd.n).normalize();
        if (Math.abs(n.dot(fr.w)) < 0.999) continue;
        const m = planeMatrix(pd);
        const P = (q: SketchPoint) => to2(new THREE.Vector3(q.x, q.y, 0).applyMatrix4(m));
        for (const cid of s.constraintOrder) {
          const c = s.constraints[cid];
          if (!c || !isDimension(c) || c.driven || c.markForDrawing === false || (once && done.has(s.id + cid))) continue;
          const isCircle = c.kind === 'radius' || c.kind === 'diameter';
          if (isCircle ? !opts.holeDims : !opts.sketchDims) continue;
          if (c.kind === 'angle') continue;
          const dd = dimensionDrawing(s, c, 'mm', false);
          if (!dd) continue;
          let dim: DrawingDimension;
          if (isCircle) {
            const ln = dd.lines[0];
            const centre = c.kind === 'radius' ? ln.a : { x: (ln.a.x + ln.b.x) / 2, y: (ln.a.y + ln.b.y) / 2 };
            const onCircle = ln.b;
            dim = { id: newId('dd'), viewId: v.id, kind: c.kind === 'radius' ? 'radius' : 'diameter', a: P(centre), b: P(onCircle), label: P(dd.label), value: c.value ?? 0 };
          } else {
            const a = P(dd.lines[0].a), b = P(dd.lines[1].a), label = P(dd.label);
            const orientation: DrawingDimension['orientation'] = c.kind === 'hDistance' || c.kind === 'vDistance' ? (Math.abs(a[0] - b[0]) > Math.abs(a[1] - b[1]) ? 'h' : 'v') : Math.abs(a[1] - b[1]) < 1e-6 ? 'h' : Math.abs(a[0] - b[0]) < 1e-6 ? 'v' : 'aligned';
            dim = { id: newId('dd'), viewId: v.id, kind: 'linear', a, b, label, value: c.value ?? 0, orientation };
          }
          if (!shows(v, dim)) continue;
          if (opts.sketchPlacement === false) dim = { ...dim, label: offsetLabel(v, dim) };
          done.add(s.id + cid);
          if (!dupe(v.id, dim.a, dim.b, dim.value)) out.push(dim);
        }
      }
      // extrusion depth in a view that shows the sketch plane edge-on
      if (f.type === 'extrude' && opts.featureDims && !(once && done.has(f.id)) && (f.end === 'blind' || f.end === 'midPlane')) {
        const s = model.sketches[f.sketchId];
        if (!s) continue;
        const pd = resolvePlaneDef(model, s.plane);
        const n = new THREE.Vector3(...pd.n).normalize();
        if (Math.abs(n.dot(fr.w)) > 1e-3) continue;
        const m = planeMatrix(pd);
        const pts = Object.values(s.points).map((q) => new THREE.Vector3(q.x, q.y, 0).applyMatrix4(m));
        if (!pts.length) continue;
        // the view axis along the sketch normal, and the profile's extreme point across it (dimension outside the outline)
        const along = Math.abs(n.dot(fr.u)) > Math.abs(n.dot(fr.v)) ? 0 : 1;
        const across = 1 - along;
        let ext = pts[0];
        for (const p of pts) if (to2(p)[across] > to2(ext)[across]) ext = p;
        const sign = f.reverse ? -1 : 1;
        const start = f.end === 'midPlane' ? ext.clone().addScaledVector(n, (-sign * f.depth) / 2) : ext.clone();
        const end = start.clone().addScaledVector(n, sign * f.depth);
        const a = to2(start), b = to2(end);
        const label: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        label[across] += 10;
        let dim: DrawingDimension = { id: newId('dd'), viewId: v.id, kind: 'linear', a, b, label, value: f.depth, orientation: along === 0 ? 'h' : 'v' };
        if (!shows(v, dim)) continue;
        if (opts.sketchPlacement === false) dim = { ...dim, label: offsetLabel(v, dim) };
        done.add(f.id);
        if (!dupe(v.id, a, b, f.depth)) out.push(dim);
      }
    }
  }
  return out;
}

/** a dimension text set outside the view: beyond the outline on the side of the measured points, 10 mm out */
function offsetLabel(v: DrawingView, d: DrawingDimension): [number, number] {
  const g = viewGeometry(v);
  if (d.kind !== 'linear') {
    const dx = d.b[0] - d.a[0], dy = d.b[1] - d.a[1], L = Math.hypot(dx, dy) || 1;
    const R = Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1]) / 2 + 8;
    const cx = (g.min[0] + g.max[0]) / 2, cy = (g.min[1] + g.max[1]) / 2;
    return [cx + (dx / L) * R, cy + (dy / L) * R];
  }
  const mid: [number, number] = [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2];
  if (d.orientation === 'h') return [mid[0], mid[1] > (g.min[1] + g.max[1]) / 2 ? g.max[1] + 10 : g.min[1] - 10];
  if (d.orientation === 'v') return [mid[0] > (g.min[0] + g.max[0]) / 2 ? g.max[0] + 10 : g.min[0] - 10, mid[1]];
  // aligned: the dimension line parallel to the measured points, beyond the outline on their side
  const cx = (g.min[0] + g.max[0]) / 2, cy = (g.min[1] + g.max[1]) / 2;
  const R = Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1]) / 2 + 8;
  const dx = d.b[0] - d.a[0], dy = d.b[1] - d.a[1], L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L;
  if ((mid[0] - cx) * nx + (mid[1] - cy) * ny < 0) { nx = -nx; ny = -ny; }
  return [cx + nx * R, cy + ny * R];
}

function near(p: [number, number], q: [number, number]) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-3;
}
