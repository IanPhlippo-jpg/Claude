import type { Document, DrawingDimension, DrawingSheet, DrawingView, DrawingViewType } from '../document/types';
import { SHEET_SIZES_MM } from '../document/types';
import { rebuildDocument, type Body } from '../features/rebuild';
import { rebuildAssembly } from '../assembly/assembly';
import { cleanLines, projectView, viewFrame, type Circle2D, type Line2D, type View2D } from './hlr';
import * as THREE from 'three';
import { clipToSurface, csg } from '../features/solid';
import { motionTransforms } from '../assembly/motion';
import { resolvePlaneDef } from '../features/planes';
import { bodyEdges } from '../features/edgesets';
import { MeshBVH } from 'three-mesh-bvh';

/** Sheet width/height in mm for a sheet (landscape or portrait). */
export function sheetSize(sheet: Pick<DrawingSheet, 'size' | 'landscape'> & { customSize?: [number, number] }): [number, number] {
  if (sheet.customSize) return [...sheet.customSize] as [number, number];
  const [w, h] = SHEET_SIZES_MM[sheet.size];
  return sheet.landscape ? [w, h] : [h, w];
}

const bodyCache = new WeakMap<Document, Body[]>();

/** Bodies of the model a view shows (part or assembly), cached by document identity. */
export function modelBodies(model: Document): Body[] {
  let b = bodyCache.get(model);
  if (!b) {
    b = model.kind === 'assembly' ? rebuildAssembly(model).bodies : rebuildDocument(model, null).bodies;
    bodyCache.set(model, b);
  }
  return b;
}

const curveCache = new WeakMap<Document, NonNullable<ReturnType<typeof rebuildDocument>['curves']>>();

/** the reference curves of the model a view shows (bend lines of a flat pattern), cached by document identity */
export function modelCurves(model: Document): NonNullable<ReturnType<typeof rebuildDocument>['curves']> {
  let c = curveCache.get(model);
  if (!c) {
    c = model.kind === 'assembly' ? [] : rebuildDocument(model, null).curves ?? [];
    curveCache.set(model, c);
  }
  return c;
}

/** Flat Pattern Display ▸ Bend lines: the Bend-Lines curves of the flat pattern projected into the view, with the bend note */
export function bendLines(model: Document, fr: { u: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3 }, notes: boolean): Line2D[] {
  const fp = model.features.find((f) => f.type === 'flatPattern' && !f.suppressed);
  if (!fp) return [];
  const sm = model.sheetMetal;
  const out: Line2D[] = [];
  const to2 = (p: THREE.Vector3): [number, number] => [p.dot(fr.u), p.dot(fr.v)];
  let k = 0;
  for (const c of modelCurves(model)) {
    if (c.name !== 'Bend-Lines' || c.points.length < 2) continue;
    k++;
    const a = c.points[0], b = c.points[c.points.length - 1];
    out.push({ a: to2(a), b: to2(b), hidden: false, bend: true, note: notes ? `UP 90° R ${sm ? sm.bendRadius : 1}` : undefined });
  }
  return out;
}

const viewCache = new WeakMap<Document, Map<string, View2D>>();

/** Projected 2D view of a model (model mm, view-centred at the projection of the model's bounds centre). */
export function projectedView(model: Document, type: DrawingViewType, opts: { draft?: boolean; threadDraft?: boolean; bendLines?: boolean; bendNotes?: boolean } = {}): View2D {
  let m = viewCache.get(model);
  if (!m) {
    m = new Map();
    viewCache.set(model, m);
  }
  const key = `${type}|${opts.draft ? 'd' : ''}${opts.threadDraft ? 't' : ''}${opts.bendLines ? 'b' : ''}${opts.bendNotes ? 'n' : ''}`;
  let v = m.get(key);
  if (!v) {
    const bodies = modelBodies(model);
    const fr = viewFrame(type);
    // Draft quality: coarser visibility samples along the edges
    const raw = projectView(bodies, fr, opts.draft ? 2.5 : 0.75);
    v = { ...raw, lines: [...cleanLines(raw.lines), ...threadLines(model, bodies, fr, !opts.threadDraft), ...(opts.bendLines ? bendLines(model, fr, !!opts.bendNotes) : [])] };
    m.set(key, v);
  }
  return v;
}

/**
 * Cosmetic threads of tapped holes in a view: looking along the hole a thin circle on the major diameter,
 * from the side two thin lines over the thread length (internal thread: dashed, as the ANSI simplified convention).
 */
export function threadLines(model: Document, bodies: Body[], fr: { u: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3 }, highQuality = true): Line2D[] {
  const out: Line2D[] = [];
  if (model.kind === 'assembly') return out;
  const to2 = (p: THREE.Vector3): [number, number] => [p.dot(fr.u), p.dot(fr.v)];
  // High quality: a thread line is hidden when material lies in front of it (draft quality draws all of them)
  let bvhs: MeshBVH[] | null = null;
  const visible = (p: THREE.Vector3): boolean => {
    bvhs ??= bodies.map((b) => new MeshBVH(b.geometry.index ? b.geometry.toNonIndexed() : b.geometry));
    const ray = new THREE.Ray(p.clone().addScaledVector(fr.w, 0.05), fr.w.clone());
    return !bvhs.some((bvh) => !!bvh.raycastFirst(ray, THREE.DoubleSide));
  };
  for (const f of model.features) {
    if (f.type !== 'hole' || f.suppressed || f.holeType !== 'tap' || !f.threadDiameter || f.cosmeticThread === false) continue;
    const pl = resolvePlaneDef(model, f.plane);
    const o = new THREE.Vector3(...pl.origin), u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v), n = new THREE.Vector3(...pl.n).normalize();
    const r = f.threadDiameter / 2;
    for (const pt of f.points) {
      const start = o.clone().addScaledVector(u, pt.x).addScaledVector(v, pt.y);
      // thread length: the given thread depth, else the hole depth, else through the material
      let len = f.threadDepth && f.threadDepth > 0 ? f.threadDepth : f.depth > 0 ? f.depth : 0;
      if (!len) {
        const q = new THREE.Vector3();
        for (const b of bodies) {
          const a = b.geometry.getAttribute('position');
          for (let i = 0; i < a.count; i++) len = Math.max(len, start.clone().sub(q.fromBufferAttribute(a, i)).dot(n));
        }
      }
      const along = Math.abs(n.dot(fr.w));
      if (along > 0.999) {
        const N = 48;
        for (let k = 0; k < N; k++) {
          const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
          const p0 = start.clone().addScaledVector(u, r * Math.cos(a0)).addScaledVector(v, r * Math.sin(a0));
          const p1 = start.clone().addScaledVector(u, r * Math.cos(a1)).addScaledVector(v, r * Math.sin(a1));
          out.push({ a: to2(p0), b: to2(p1), hidden: highQuality ? !visible(p0.clone().lerp(p1, 0.5)) : true, cosmetic: true });
        }
      } else if (along < 1e-3) {
        const end = start.clone().addScaledVector(n, -len);
        const side = n.clone().cross(fr.w).normalize().multiplyScalar(r);
        for (const s of [1, -1]) {
          const a3 = start.clone().addScaledVector(side, s), b3 = end.clone().addScaledVector(side, s);
          out.push({ a: to2(a3), b: to2(b3), hidden: highQuality ? !visible(a3.clone().lerp(b3, 0.5)) : true, cosmetic: true });
        }
      }
    }
  }
  return out;
}

/** A view's 2D geometry with optional section hatching (closed loops in view coordinates, filled even-odd). */
export type ViewGeo = View2D & { hatch?: [number, number][][]; /** Auto hatching: the hatch variant (0, 1, 2 …) of each hatch loop */ hatchVar?: number[]; /** the hatch only shows inside this outline (Broken-out Section) */ hatchClip?: [number, number][]; /** placement centre (a cropped view keeps the centre of the whole view, so it stays in place) */ centre?: [number, number] };

/** The 2D geometry a drawing view shows: projection, section or detail. */
export function viewGeometry(view: Pick<DrawingView, 'model' | 'type' | 'section' | 'detail'> & Partial<Pick<DrawingView, 'crop' | 'break' | 'aux' | 'brokenOut' | 'relative' | 'empty' | 'draftQuality' | 'threadDraft' | 'bendLines' | 'bendNotes'>>): ViewGeo {
  // Empty View / Predefined View without a model: a frame of 40 x 30 mm
  if (view.empty || (!view.model.features.length && !(view.model.components ?? []).length)) return { lines: [], circles: [], min: [-20, -15], max: [20, 15] };
  if (view.relative) return relativeGeometry(view.model, view.relative);
  let g: ViewGeo = view.section ? sectionGeometry(view.model, view.section) : view.detail ? detailGeometry(view.model, view.detail) : view.aux ? auxGeometry(view.model, view.aux) : view.brokenOut ? brokenOutGeometry(view.model, view.type, view.brokenOut) : projectedView(view.model, view.type, { draft: view.draftQuality, threadDraft: view.threadDraft, bendLines: view.bendLines, bendNotes: view.bendNotes });
  if (view.crop) g = cropGeometry(g, view.crop.min, view.crop.max);
  if (view.break) g = breakGeometry(g, view.break);
  return g;
}

const auxCache = new WeakMap<Document, Map<string, ViewGeo>>();

/**
 * Auxiliary View: the model seen perpendicular to an edge of the parent view, unfolded about that edge
 * (third angle: the view lies on the side it is looked from; the edge keeps its direction on the sheet).
 */
export function auxGeometry(model: Document, aux: NonNullable<DrawingView['aux']>): ViewGeo {
  let m = auxCache.get(model);
  if (!m) auxCache.set(model, (m = new Map()));
  const key = `${aux.parentType}|${aux.dir[0].toFixed(4)},${aux.dir[1].toFixed(4)}|${aux.side}`;
  const hit = m.get(key);
  if (hit) return hit;
  const pf = viewFrame(aux.parentType);
  const L = Math.hypot(aux.dir[0], aux.dir[1]) || 1;
  const dx = aux.dir[0] / L, dy = aux.dir[1] / L;
  const u = pf.u.clone().multiplyScalar(dx).add(pf.v.clone().multiplyScalar(dy)).normalize();
  const w = pf.u.clone().multiplyScalar(-dy).add(pf.v.clone().multiplyScalar(dx)).normalize().multiplyScalar(aux.side);
  const v = w.clone().cross(u).normalize();
  const raw = projectView(modelBodies(model), { u, v, w });
  // rotate so the edge keeps its direction on the sheet
  const rot = (p: [number, number]): [number, number] => [p[0] * dx - p[1] * dy, p[0] * dy + p[1] * dx];
  const lines = cleanLines(raw.lines).map((l) => ({ ...l, a: rot(l.a), b: rot(l.b) }));
  const circles = raw.circles.map((c) => ({ ...c, c: rot(c.c) }));
  const xs: number[] = [], ys: number[] = [];
  for (const l of lines) { xs.push(l.a[0], l.b[0]); ys.push(l.a[1], l.b[1]); }
  for (const c of circles) { xs.push(c.c[0] - c.r, c.c[0] + c.r); ys.push(c.c[1] - c.r, c.c[1] + c.r); }
  const geo: ViewGeo = { lines, circles, min: [Math.min(...xs), Math.min(...ys)], max: [Math.max(...xs), Math.max(...ys)] };
  m.set(key, geo);
  return geo;
}

const relCache = new WeakMap<Document, Map<string, ViewGeo>>();
/** Relative View: the model projected in the frame of two picked faces (front toward the viewer, right to the right). */
export function relativeGeometry(model: Document, r: NonNullable<DrawingView['relative']>): ViewGeo {
  let m = relCache.get(model);
  if (!m) relCache.set(model, (m = new Map()));
  const key = [...r.u, ...r.v, ...r.w].map((x) => x.toFixed(4)).join(',');
  const hit = m.get(key);
  if (hit) return hit;
  const raw = projectView(modelBodies(model), { u: new THREE.Vector3(...r.u), v: new THREE.Vector3(...r.v), w: new THREE.Vector3(...r.w) });
  const lines = cleanLines(raw.lines);
  const xs: number[] = [], ys: number[] = [];
  for (const l of lines) { xs.push(l.a[0], l.b[0]); ys.push(l.a[1], l.b[1]); }
  for (const c of raw.circles) { xs.push(c.c[0] - c.r, c.c[0] + c.r); ys.push(c.c[1] - c.r, c.c[1] + c.r); }
  const geo: ViewGeo = { lines, circles: raw.circles, min: xs.length ? [Math.min(...xs), Math.min(...ys)] : [-20, -15], max: xs.length ? [Math.max(...xs), Math.max(...ys)] : [20, 15] };
  m.set(key, geo);
  return geo;
}

/** Crop View: lines clipped to the rectangle (Liang-Barsky), circles kept inside or cut into pieces. */
export function cropGeometry(g: ViewGeo, min: [number, number], max: [number, number]): ViewGeo {
  const clip = (a: [number, number], b: [number, number]): [[number, number], [number, number]] | null => {
    let t0 = 0, t1 = 1;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - min[0]], [dx, max[0] - a[0]], [-dy, a[1] - min[1]], [dy, max[1] - a[1]]] as [number, number][]) {
      if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
      if (t0 > t1) return null;
    }
    return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
  };
  const lines: Line2D[] = [];
  for (const l of g.lines) { const c = clip(l.a, l.b); if (c) lines.push({ ...l, a: c[0], b: c[1] }); }
  const circles: Circle2D[] = [];
  for (const c of g.circles) {
    if (c.c[0] - c.r >= min[0] && c.c[0] + c.r <= max[0] && c.c[1] - c.r >= min[1] && c.c[1] + c.r <= max[1]) circles.push(c);
    else for (let i = 0; i < 72; i++) {
      const a0 = (i / 72) * Math.PI * 2, a1 = ((i + 1) / 72) * Math.PI * 2;
      const cc = clip([c.c[0] + c.r * Math.cos(a0), c.c[1] + c.r * Math.sin(a0)], [c.c[0] + c.r * Math.cos(a1), c.c[1] + c.r * Math.sin(a1)]);
      if (cc) lines.push({ a: cc[0], b: cc[1], hidden: c.hidden, silhouette: true });
    }
  }
  return { ...g, lines, circles, min: [...min], max: [...max], hatch: g.hatch, centre: viewCentre(g) };
}

/** Break: everything between a and b along the axis is removed and the far side moves back to leave the gap. */
export function breakGeometry(g: ViewGeo, br: NonNullable<DrawingView['break']>): ViewGeo {
  const k = br.axis === 'x' ? 0 : 1;
  const a = Math.min(br.a, br.b), b = Math.max(br.a, br.b);
  const shift = b - a - br.gap;
  const moved = (p: [number, number]): [number, number] => { const q: [number, number] = [p[0], p[1]]; if (q[k] >= b - 1e-9) q[k] -= shift; return q; };
  const lines: Line2D[] = [];
  const piece = (l: Line2D, lo: number, hi: number) => {
    // the part of the line with lo <= coordinate <= hi
    const p0 = l.a[k], p1 = l.b[k];
    if (Math.max(p0, p1) < lo || Math.min(p0, p1) > hi) return;
    const at = (t: number): [number, number] => [l.a[0] + (l.b[0] - l.a[0]) * t, l.a[1] + (l.b[1] - l.a[1]) * t];
    const d = p1 - p0;
    let t0 = 0, t1 = 1;
    if (Math.abs(d) > 1e-12) {
      const ta = (lo - p0) / d, tb = (hi - p0) / d;
      t0 = Math.max(0, Math.min(ta, tb));
      t1 = Math.min(1, Math.max(ta, tb));
      if (t1 - t0 < 1e-9) return;
    }
    lines.push({ ...l, a: moved(at(t0)), b: moved(at(t1)) });
  };
  for (const l of g.lines) { piece(l, -Infinity, a); piece(l, b, Infinity); }
  const circles: Circle2D[] = [];
  for (const c of g.circles) {
    if (c.c[k] + c.r <= a || c.c[k] - c.r >= b) circles.push({ ...c, c: moved(c.c) });
    else for (let i = 0; i < 72; i++) {
      const a0 = (i / 72) * Math.PI * 2, a1 = ((i + 1) / 72) * Math.PI * 2;
      const seg: Line2D = { a: [c.c[0] + c.r * Math.cos(a0), c.c[1] + c.r * Math.sin(a0)], b: [c.c[0] + c.r * Math.cos(a1), c.c[1] + c.r * Math.sin(a1)], hidden: c.hidden, silhouette: true };
      piece(seg, -Infinity, a); piece(seg, b, Infinity);
    }
  }
  const max: [number, number] = [g.max[0], g.max[1]];
  if (g.max[k] > b) max[k] = g.max[k] - shift;
  return { ...g, lines, circles, min: [...g.min], max, hatch: g.hatch };
}

/** Third-angle side of a section: a section placed right of / above its parent is seen as the right / top view (Flip Direction inverts). */
export function sectionFlipFor(axis: 'h' | 'v', parentPos: [number, number], pos: [number, number], userFlip: boolean): boolean {
  const side = axis === 'v' ? pos[0] > parentPos[0] : pos[1] < parentPos[1];
  return side !== userFlip;
}

/** View frame of a section: the viewer looks across the cutting line (flip: from the other side). */
export function sectionFrame(sec: NonNullable<DrawingView['section']>): { u: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3; n: THREE.Vector3 } {
  const pf = viewFrame(sec.parentType);
  if (sec.axis === 'h') {
    const n = pf.v.clone();
    const w = sec.flip ? pf.v.clone().negate() : pf.v.clone();
    const u = pf.u.clone();
    const v = w.clone().cross(u).normalize();
    return { u, v, w, n };
  }
  const n = pf.u.clone();
  const w = sec.flip ? pf.u.clone() : pf.u.clone().negate();
  const v = pf.v.clone();
  const u = v.clone().cross(w).normalize();
  return { u, v, w, n };
}

/** Cross-section of a mesh with the plane n·p = d: closed loops in (u, v) coordinates (chained triangle/plane intersections). */
export function sliceLoops(g: THREE.BufferGeometry, n: THREE.Vector3, d: number, u: THREE.Vector3, v: THREE.Vector3): [number, number][][] {
  const pos = g.getAttribute('position');
  const idx = g.getIndex();
  const tri = idx ? idx.count / 3 : pos.count / 3;
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  for (let t = 0; t < tri; t++) {
    for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(pos, idx ? idx.getX(t * 3 + k) : t * 3 + k);
    const s = P.map((p) => p.dot(n) - d);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < 3; k++) {
      const a = k, b = (k + 1) % 3;
      if ((s[a] < 0) !== (s[b] < 0)) pts.push(P[a].clone().lerp(P[b], s[a] / (s[a] - s[b])));
    }
    if (pts.length === 2 && pts[0].distanceToSquared(pts[1]) > 1e-12) segs.push([pts[0], pts[1]]);
  }
  const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`;
  const at = new Map<string, number[]>();
  segs.forEach(([a, b], i) => {
    for (const k of [key(a), key(b)]) {
      const l = at.get(k);
      if (l) l.push(i);
      else at.set(k, [i]);
    }
  });
  const used = new Array(segs.length).fill(false);
  const chains: THREE.Vector3[][] = [];
  const grow = (chain: THREE.Vector3[]) => {
    for (;;) {
      const end = chain[chain.length - 1];
      const next = (at.get(key(end)) ?? []).find((j) => !used[j]);
      if (next === undefined) return;
      used[next] = true;
      const [a, b] = segs[next];
      chain.push(key(a) === key(end) ? b : a);
    }
  };
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const chain = [segs[i][0], segs[i][1]];
    grow(chain);
    chain.reverse();
    grow(chain);
    chains.push(chain);
  }
  // join chains across small gaps (seams with T-junctions), then close the loops
  const gap = 0.05;
  const open = chains.filter((c) => c[0].distanceTo(c[c.length - 1]) > 1e-6);
  const closed = chains.filter((c) => c[0].distanceTo(c[c.length - 1]) <= 1e-6);
  while (open.length) {
    const c = open.pop()!;
    for (;;) {
      const end = c[c.length - 1];
      if (c.length > 2 && end.distanceTo(c[0]) < gap) break;
      let best = -1, rev = false, bd = gap;
      open.forEach((o, j) => {
        const d0 = end.distanceTo(o[0]), d1 = end.distanceTo(o[o.length - 1]);
        if (d0 < bd) { bd = d0; best = j; rev = false; }
        if (d1 < bd) { bd = d1; best = j; rev = true; }
      });
      if (best < 0) break;
      const o = open.splice(best, 1)[0];
      c.push(...(rev ? o.reverse() : o));
    }
    closed.push(c);
  }
  const loops: [number, number][][] = [];
  const to2 = (p: THREE.Vector3): [number, number] => [p.dot(u), p.dot(v)];
  for (const c of closed) if (c.length > 3) loops.push(c.map(to2));
  return loops;
}

/** Signed area of a 2D loop (positive = counter-clockwise). */
function loopArea(l: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < l.length; i++) {
    const p = l[i], q = l[(i + 1) % l.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Material at a point? Winding number along a few rays (exits minus entries), so overlapping shells count as one solid. */
function insideMaterial(bvh: MeshBVH, p: THREE.Vector3): boolean {
  const dirs = [new THREE.Vector3(0.577, 0.577, 0.577), new THREE.Vector3(-0.31, 0.82, -0.48), new THREE.Vector3(0.6, -0.7, 0.39)];
  let votes = 0;
  for (const d0 of dirs) {
    const d = d0.clone().normalize();
    let wind = 0;
    for (const hit of bvh.raycast(new THREE.Ray(p, d), THREE.DoubleSide)) if (hit.face) wind += hit.face.normal.dot(d) > 0 ? 1 : -1;
    if (wind > 0) votes++;
  }
  return votes >= 2;
}

const secCache = new WeakMap<Document, Map<string, ViewGeo>>();

/** Section View: the model cut by the plane of the cutting line, seen across it, with the cut faces hatched. */
export function sectionGeometry(model: Document, sec: NonNullable<DrawingView['section']>): ViewGeo {
  let m = secCache.get(model);
  if (!m) secCache.set(model, (m = new Map()));
  const key = `${sec.parentType}|${sec.axis}|${sec.at.toFixed(4)}|${sec.flip}|${sec.removed ? 'r' : ''}|${sec.slice ? 's' : ''}|${sec.depth ?? ''}|${sec.autoHatch ? 'a' : ''}|${sec.half ?? ''}`;
  const hit = m.get(key);
  if (hit) return hit;
  const f = sectionFrame(sec);
  // a cut exactly on mesh vertices (a revolve seam, a symmetry plane) makes the boolean degenerate: nudge it a few microns
  const cutAt = sec.at + 0.0037;
  const plane = f.n.clone().multiplyScalar(cutAt);
  // keep the material beyond the plane, seen from the viewer (the viewer is on the +w side)
  const keep = plane.clone().addScaledVector(f.w, -1);
  const bodies: Body[] = [];
  const hatch: [number, number][][] = [];
  const hatchVar: number[] = [];
  let bodyIndex = -1;
  for (const b of modelBodies(model)) {
    bodyIndex++;
    let g: THREE.BufferGeometry;
    try {
      g = clipToSurface(b.geometry, { normal: [f.n.x, f.n.y, f.n.z], point: [plane.x, plane.y, plane.z] }, [keep.x, keep.y, keep.z]);
      // Partial section: only the material up to the depth behind the cut
      if (sec.depth && sec.depth > 0) {
        const back = f.n.clone().multiplyScalar(cutAt).addScaledVector(f.w, -sec.depth);
        const keep2 = back.clone().addScaledVector(f.w, 1);
        g = clipToSurface(g, { normal: [f.w.x, f.w.y, f.w.z], point: [back.x, back.y, back.z] }, [keep2.x, keep2.y, keep2.z]);
      }
    } catch {
      continue;
    }
    if (!g.getAttribute('position') || g.getAttribute('position').count < 3) continue;
    bodies.push({ ...b, geometry: g, faces: [], edges: bodyEdges(g, b.id) });
    const geom = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const bvh = new MeshBVH(geom);
    for (const l of sliceLoops(geom, f.n, cutAt, f.u, f.v)) {
      // orient counter-clockwise, test the material just left of the longest edge: a hole is reversed (non-zero fill)
      const ccw = loopArea(l) > 0 ? l : [...l].reverse();
      // vote over a few long edges: material just left of the edge?
      const edges = ccw.map((a, i) => { const q = ccw[(i + 1) % ccw.length]; return { a, q, len: Math.hypot(q[0] - a[0], q[1] - a[1]) }; }).filter((e) => e.len > 1e-3).sort((x, y) => y.len - x.len).slice(0, 5);
      let solid = 0;
      for (const e of edges) {
        const ex = (e.q[0] - e.a[0]) / e.len, ey = (e.q[1] - e.a[1]) / e.len;
        const m: [number, number] = [(e.a[0] + e.q[0]) / 2 - ey * 0.05, (e.a[1] + e.q[1]) / 2 + ex * 0.05];
        const p3 = f.u.clone().multiplyScalar(m[0]).addScaledVector(f.v, m[1]).addScaledVector(f.n, cutAt);
        if (insideMaterial(bvh, p3)) solid++;
      }
      hatch.push(solid * 2 >= edges.length ? ccw : [...ccw].reverse());
      hatchVar.push(sec.autoHatch ? bodyIndex % 3 : 0);
    }
  }
  const raw = projectView(bodies, f);
  // the boundary of the cut face is a visible edge
  const cut: Line2D[] = [];
  for (const l of hatch) for (let i = 0; i < l.length; i++) cut.push({ a: l[i], b: l[(i + 1) % l.length], hidden: false, silhouette: false });
  // Removed Section / Slice section: only the cut face (outline and hatch), nothing behind it
  if (sec.removed || sec.slice) {
    const xs = hatch.flat().map((p) => p[0]), ys = hatch.flat().map((p) => p[1]);
    const geoR: ViewGeo = { lines: cleanLines(cut), circles: [], min: [Math.min(...xs), Math.min(...ys)], max: [Math.max(...xs), Math.max(...ys)], hatch, hatchVar };
    m.set(key, geoR);
    return geoR;
  }
  if (sec.half) {
    // Half Section: the cut on one half, the outside (unsectioned) view on the other, split at the middle of the model
    const whole = projectView(modelBodies(model), f);
    const mid = (whole.min[1] + whole.max[1]) / 2;
    const cutSide = (y: number) => (sec.half === 'top' ? y >= mid : y <= mid);
    const clipHalf = (ls: Line2D[], keepCut: boolean) => {
      const out: Line2D[] = [];
      for (const l of ls) {
        const ia = cutSide(l.a[1]) === keepCut, ib = cutSide(l.b[1]) === keepCut;
        if (ia && ib) out.push(l);
        else if (ia !== ib && Math.abs(l.b[1] - l.a[1]) > 1e-9) {
          const t = (mid - l.a[1]) / (l.b[1] - l.a[1]);
          const q: [number, number] = [l.a[0] + (l.b[0] - l.a[0]) * t, mid];
          out.push(ia ? { ...l, b: q } : { ...l, a: q });
        }
      }
      return out;
    };
    const clipPoly = (poly: [number, number][]) => {
      // Sutherland-Hodgman against the half plane
      const out: [number, number][] = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const ia = cutSide(a[1]), ib = cutSide(b[1]);
        if (ia) out.push(a);
        if (ia !== ib && Math.abs(b[1] - a[1]) > 1e-12) { const t = (mid - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, mid]); }
      }
      return out;
    };
    const hh: [number, number][][] = [], hv: number[] = [];
    hatch.forEach((poly, i) => { const c = clipPoly(poly); if (c.length >= 3) { hh.push(c); hv.push(hatchVar[i]); } });
    const cutLines = clipHalf([...raw.lines.filter((l) => !l.hidden), ...cut], true);
    const outside = clipHalf(cleanLines(whole.lines).filter((l) => !l.hidden), false);
    // the centreline between the halves, as the original draws it
    const centre: Line2D = { a: [whole.min[0] - 3, mid], b: [whole.max[0] + 3, mid], hidden: false, silhouette: false, cosmetic: true };
    const geoH: ViewGeo = { ...whole, lines: [...cleanLines([...cutLines, ...outside]), centre], hatch: hh, hatchVar: hv };
    m.set(key, geoH);
    return geoH;
  }
  const geo: ViewGeo = { ...raw, lines: cleanLines([...raw.lines.filter((l) => !l.hidden), ...cut]), hatch, hatchVar };
  m.set(key, geo);
  return geo;
}

const boCache = new WeakMap<Document, Map<string, ViewGeo>>();

/** The Broken-out Section profile as the original's closed spline through the picked points (Catmull-Rom). */
export function brokenOutOutline(poly: [number, number][], segs = 10): [number, number][] {
  const n = poly.length;
  if (n < 3) return poly;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n], p3 = poly[(i + 2) % n];
    for (let k = 0; k < segs; k++) {
      const t = k / segs, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** Front of the model along the view direction (largest w of any vertex). */
function frontDepth(bodies: Body[], w: THREE.Vector3): { front: number; back: number } {
  let front = -Infinity, back = Infinity;
  const p = new THREE.Vector3();
  for (const b of bodies) {
    const a = b.geometry.getAttribute('position');
    for (let i = 0; i < a.count; i++) {
      const d = p.fromBufferAttribute(a, i).dot(w);
      if (d > front) front = d;
      if (d < back) back = d;
    }
  }
  return { front, back };
}

/** Depth through the model along the view direction (for the Broken-out Section default). */
export function viewDepth(model: Document, type: DrawingViewType): number {
  const { front, back } = frontDepth(modelBodies(model), viewFrame(type).w);
  return Number.isFinite(front) ? front - back : 0;
}

/**
 * Broken-out Section: the material inside the closed profile is removed from the front of the model down to
 * the depth; the exposed cut face is hatched (only inside the profile).
 */
export function brokenOutGeometry(model: Document, type: DrawingViewType, bo: NonNullable<DrawingView['brokenOut']>): ViewGeo {
  let m = boCache.get(model);
  if (!m) boCache.set(model, (m = new Map()));
  const key = `${type}|${bo.depth.toFixed(4)}|${bo.poly.map((p) => p[0].toFixed(3) + ',' + p[1].toFixed(3)).join(';')}`;
  const hit = m.get(key);
  if (hit) return hit;
  const fr = viewFrame(type);
  const src = modelBodies(model);
  const { front } = frontDepth(src, fr.w);
  const cutAt = front - bo.depth + 0.0037;
  // the tool: the profile extruded from the cut plane to beyond the front of the model
  const outline = brokenOutOutline(bo.poly);
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p[0], p[1])));
  const tool = new THREE.ExtrudeGeometry(shape, { depth: bo.depth + 10, bevelEnabled: false, curveSegments: 4 });
  tool.deleteAttribute('uv');
  const basis = new THREE.Matrix4().makeBasis(fr.u, fr.v, fr.w);
  basis.setPosition(fr.w.clone().multiplyScalar(cutAt));
  tool.applyMatrix4(basis);
  const bodies: Body[] = [];
  const hatch: [number, number][][] = [];
  for (const b of src) {
    let g: THREE.BufferGeometry;
    try {
      g = csg(b.geometry, tool, 'subtract');
    } catch {
      g = b.geometry;
    }
    bodies.push({ ...b, geometry: g, faces: [], edges: bodyEdges(g, b.id) });
    const geom = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const bvh = new MeshBVH(geom);
    for (const l of sliceLoops(geom, fr.w, cutAt, fr.u, fr.v)) {
      const ccw = loopArea(l) > 0 ? l : [...l].reverse();
      const edges = ccw.map((a, i) => { const q = ccw[(i + 1) % ccw.length]; return { a, q, len: Math.hypot(q[0] - a[0], q[1] - a[1]) }; }).filter((e) => e.len > 1e-3).sort((x, y) => y.len - x.len).slice(0, 5);
      let solid = 0;
      for (const e of edges) {
        const ex = (e.q[0] - e.a[0]) / e.len, ey = (e.q[1] - e.a[1]) / e.len;
        const mm: [number, number] = [(e.a[0] + e.q[0]) / 2 - ey * 0.05, (e.a[1] + e.q[1]) / 2 + ex * 0.05];
        const p3 = fr.u.clone().multiplyScalar(mm[0]).addScaledVector(fr.v, mm[1]).addScaledVector(fr.w, cutAt);
        if (insideMaterial(bvh, p3)) solid++;
      }
      hatch.push(solid * 2 >= edges.length ? ccw : [...ccw].reverse());
    }
  }
  const raw = projectView(bodies, fr);
  const geo: ViewGeo = { ...raw, lines: cleanLines(raw.lines), hatch, hatchClip: outline };
  m.set(key, geo);
  return geo;
}

const detCache = new WeakMap<Document, Map<string, ViewGeo>>();

/** Detail View: the parent's projection inside the detail circle (lines clipped, circles kept or cut into arcs). */
export function detailGeometry(model: Document, det: NonNullable<DrawingView['detail']>): ViewGeo {
  let m = detCache.get(model);
  if (!m) detCache.set(model, (m = new Map()));
  const key = `${det.parentType}|${det.center[0].toFixed(3)},${det.center[1].toFixed(3)}|${det.radius.toFixed(3)}|${det.rect ? det.rect.join(',') : ''}`;
  const hit = m.get(key);
  if (hit) return hit;
  const base = projectedView(model, det.parentType);
  const [cx, cy] = det.center, R = det.radius;
  // Profile: a rectangle (Liang–Barsky clipping) instead of the circle
  const rect = det.rect;
  const clipRect = (a: [number, number], b: [number, number]): [[number, number], [number, number]] | null => {
    const [hw, hh] = rect!;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1;
    for (const [p, q] of [[-dx, a[0] - (cx - hw)], [dx, cx + hw - a[0]], [-dy, a[1] - (cy - hh)], [dy, cy + hh - a[1]]] as const) {
      if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
      if (t0 > t1) return null;
    }
    return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
  };
  const clip = (a: [number, number], b: [number, number]): [[number, number], [number, number]] | null => {
    if (rect) return clipRect(a, b);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const fx = a[0] - cx, fy = a[1] - cy;
    const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - R * R;
    if (A < 1e-12) return C <= 0 ? [a, b] : null;
    const disc = B * B - 4 * A * C;
    if (disc <= 0) return null;
    const sq = Math.sqrt(disc);
    const t0 = Math.max(0, (-B - sq) / (2 * A)), t1 = Math.min(1, (-B + sq) / (2 * A));
    if (t1 <= t0) return null;
    return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
  };
  const lines: Line2D[] = [];
  for (const l of base.lines) {
    const c = clip(l.a, l.b);
    if (c) lines.push({ ...l, a: c[0], b: c[1] });
  }
  const circles: Circle2D[] = [];
  for (const c of base.circles) {
    const d = Math.hypot(c.c[0] - cx, c.c[1] - cy);
    const inside = rect ? Math.abs(c.c[0] - cx) + c.r <= rect[0] && Math.abs(c.c[1] - cy) + c.r <= rect[1] : d + c.r <= R;
    const touches = rect ? Math.abs(c.c[0] - cx) < rect[0] + c.r && Math.abs(c.c[1] - cy) < rect[1] + c.r : d < R + c.r;
    if (inside) circles.push(c);
    else if (touches) {
      // partly inside: as clipped segments
      const n = 72;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        const cc = clip([c.c[0] + c.r * Math.cos(a0), c.c[1] + c.r * Math.sin(a0)], [c.c[0] + c.r * Math.cos(a1), c.c[1] + c.r * Math.sin(a1)]);
        if (cc) lines.push({ a: cc[0], b: cc[1], hidden: c.hidden, silhouette: true });
      }
    }
  }
  const geo: ViewGeo = { lines, circles, min: rect ? [cx - rect[0], cy - rect[1]] : [cx - R, cy - R], max: rect ? [cx + rect[0], cy + rect[1]] : [cx + R, cy + R] };
  m.set(key, geo);
  return geo;
}

/** Next section / detail label: A, B, C … (I, O and Q are skipped, as drafting standards do). */
export function nextViewLabel(sheet: DrawingSheet): string {
  const used = new Set(sheet.views.map((v) => v.section?.label ?? v.detail?.label ?? v.aux?.label ?? v.arrowLabel).filter(Boolean) as string[]);
  // Sheet Properties ▸ Next view label: the label given there, while it is free
  if (sheet.nextViewLabel && !used.has(sheet.nextViewLabel)) return sheet.nextViewLabel;
  for (const ch of 'ABCDEFGHJKLMNPRSTUVWXYZ') if (!used.has(ch)) return ch;
  return 'Z';
}

/** Scale factor of a view on its sheet. */
export function viewScale(sheet: DrawingSheet, view: DrawingView): number {
  const [n, d] = view.scale ?? sheet.scale;
  return n / d;
}

/** Centre of the projection (model mm) that sits at the view's sheet position. */
export function viewCentre(v: View2D): [number, number] {
  const c = (v as ViewGeo).centre;
  if (c) return c;
  return [(v.min[0] + v.max[0]) / 2, (v.min[1] + v.max[1]) / 2];
}

/** model (view) coordinates -> sheet mm */
export function viewToSheet(sheet: DrawingSheet, view: DrawingView, v2d: View2D, p: [number, number]): [number, number] {
  const s = viewScale(sheet, view);
  const c = viewCentre(v2d);
  return [view.position[0] + (p[0] - c[0]) * s, view.position[1] + (p[1] - c[1]) * s];
}

/** sheet mm -> model (view) coordinates */
export function sheetToView(sheet: DrawingSheet, view: DrawingView, v2d: View2D, p: [number, number]): [number, number] {
  const s = viewScale(sheet, view);
  const c = viewCentre(v2d);
  return [c[0] + (p[0] - view.position[0]) / s, c[1] + (p[1] - view.position[1]) / s];
}

/** Sheet-space bounding box of a view (with a small margin), for selection frames. */
export function viewBounds(sheet: DrawingSheet, view: DrawingView, v2d: View2D, margin = 3): { x: number; y: number; w: number; h: number } {
  const a = viewToSheet(sheet, view, v2d, v2d.min), b = viewToSheet(sheet, view, v2d, v2d.max);
  return { x: a[0] - margin, y: a[1] - margin, w: b[0] - a[0] + 2 * margin, h: b[1] - a[1] + 2 * margin };
}

/**
 * Projected view type and placement from a parent view and the direction the cursor moved
 * (third angle: top view above the front view, right view to the right; first angle: mirrored).
 */
export function projectedPlacement(parent: DrawingView, dir: 'up' | 'down' | 'left' | 'right', firstAngle: boolean): DrawingViewType | null {
  const t = parent.type;
  const third: Record<string, Partial<Record<'up' | 'down' | 'left' | 'right', DrawingViewType>>> = {
    front: { up: 'top', down: 'bottom', right: 'right', left: 'left' },
    top: { down: 'front', up: 'back' },
    right: { left: 'front', right: 'back' },
    left: { right: 'front', left: 'back' },
    back: { right: 'left', left: 'right', up: 'top', down: 'bottom' },
    bottom: { up: 'front' },
  };
  const first: Record<string, Partial<Record<'up' | 'down' | 'left' | 'right', DrawingViewType>>> = {
    front: { down: 'top', up: 'bottom', left: 'right', right: 'left' },
    top: { up: 'front' },
    right: { right: 'front' },
    left: { left: 'front' },
    back: { left: 'left', right: 'right', down: 'top', up: 'bottom' },
    bottom: { down: 'front' },
  };
  return (firstAngle ? first : third)[t]?.[dir] ?? null;
}

/** Snap a projected view to the parent's row or column (as the original keeps projections aligned). */
export function alignedPosition(parent: DrawingView, dir: 'up' | 'down' | 'left' | 'right', cursor: [number, number]): [number, number] {
  return dir === 'up' || dir === 'down' ? [parent.position[0], cursor[1]] : [cursor[0], parent.position[1]];
}

/** Lines and circles of a view in sheet mm. */
export function viewOnSheet(sheet: DrawingSheet, view: DrawingView): { lines: Line2D[]; circles: Circle2D[]; v2d: ViewGeo } {
  const v2d = viewGeometry(view);
  const s = viewScale(sheet, view);
  const to = (p: [number, number]) => viewToSheet(sheet, view, v2d, p);
  return {
    v2d,
    lines: v2d.lines.map((l) => ({ ...l, a: to(l.a), b: to(l.b) })),
    circles: v2d.circles.map((c) => ({ ...c, c: to(c.c), r: c.r * s })),
  };
}

/** The visible line nearest to a sheet point (for dimensioning), with its distance in sheet mm. */
export function nearestLine(sheet: DrawingSheet, view: DrawingView, p: [number, number]): { line: Line2D; distance: number; viewLine: Line2D } | null {
  const { lines, v2d } = viewOnSheet(sheet, view);
  let best: { line: Line2D; distance: number; viewLine: Line2D } | null = null;
  lines.forEach((l, i) => {
    if (l.hidden) return;
    const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - l.a[0]) * dx + (p[1] - l.a[1]) * dy) / len2));
    const d = Math.hypot(l.a[0] + dx * t - p[0], l.a[1] + dy * t - p[1]);
    if (!best || d < best.distance) best = { line: l, distance: d, viewLine: v2d.lines[i] };
  });
  return best;
}

/** The circle nearest to a sheet point. */
export function nearestCircle(sheet: DrawingSheet, view: DrawingView, p: [number, number]): { circle: Circle2D; distance: number; viewCircle: Circle2D } | null {
  const { circles, v2d } = viewOnSheet(sheet, view);
  let best: { circle: Circle2D; distance: number; viewCircle: Circle2D } | null = null;
  circles.forEach((c, i) => {
    if (c.hidden) return;
    const d = Math.abs(Math.hypot(c.c[0] - p[0], c.c[1] - p[1]) - c.r);
    if (!best || d < best.distance) best = { circle: c, distance: d, viewCircle: v2d.circles[i] };
  });
  return best;
}

/** Value of a dimension from its view-space points. */
export function dimensionValue(d: Pick<DrawingDimension, 'kind' | 'a' | 'b' | 'orientation'>): number {
  if (d.kind === 'diameter') return 2 * Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
  if (d.kind === 'radius') return Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
  if (d.orientation === 'h') return Math.abs(d.b[0] - d.a[0]);
  if (d.orientation === 'v') return Math.abs(d.b[1] - d.a[1]);
  return Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]);
}

/** Next view name: Drawing View1, Drawing View2, … */
export function nextViewName(sheet: DrawingSheet): string {
  return `Drawing View${sheet.views.length + 1}`;
}

/** Standard three views: front, top (above), right (to the right), spaced by the model size. */
/** the standard drawing scales of the original's list (ISO preferred), largest first */
export const STANDARD_SCALES: [number, number][] = [[10, 1], [5, 1], [2, 1], [1, 1], [1, 2], [1, 5], [1, 10], [1, 20], [1, 50], [1, 100]];

/**
 * Automatic scaling of new drawing views: the largest standard scale at which the front, top and right
 * views (15 mm apart) fit in the sheet above the title block, as the original does for the first view.
 */
export function autoSheetScale(model: Document, sheet: DrawingSheet): [number, number] {
  const [sw, sh] = sheetSize(sheet);
  const W = sw - 20 - 20, H = sh - 20 - 44 - 20;
  const f = projectedView(model, 'front'), t = projectedView(model, 'top'), r = projectedView(model, 'right');
  const w = f.max[0] - f.min[0] + (r.max[0] - r.min[0]), h = f.max[1] - f.min[1] + (t.max[1] - t.min[1]);
  for (const sc of STANDARD_SCALES) {
    const k = sc[0] / sc[1];
    if (w * k + 15 <= W && h * k + 15 <= H) return sc;
  }
  return STANDARD_SCALES[STANDARD_SCALES.length - 1];
}

/** Standard 3 View centred in the sheet above the title block: the front view's position */
export function threeViewsCentre(model: Document, sheet: DrawingSheet, firstAngle: boolean): [number, number] {
  const [sw, sh] = sheetSize(sheet);
  const s = sheet.scale[0] / sheet.scale[1];
  const f = projectedView(model, 'front'), t = projectedView(model, 'top'), r = projectedView(model, 'right');
  const fw = (f.max[0] - f.min[0]) * s, fh = (f.max[1] - f.min[1]) * s, th = (t.max[1] - t.min[1]) * s, rw = (r.max[0] - r.min[0]) * s;
  const gw = fw + 15 + rw, gh = fh + 15 + th;
  const cx = sw / 2, cy = 10 + 44 + (sh - 20 - 44) / 2;
  // first angle: the right view left of the front and the top view below it; third angle the other way
  const fx = firstAngle ? cx + gw / 2 - fw / 2 : cx - gw / 2 + fw / 2;
  const fy = firstAngle ? cy + gh / 2 - fh / 2 : cy - gh / 2 + fh / 2;
  return [fx, fy];
}

export function standardThreeViews(model: Document, sheet: DrawingSheet, at: [number, number], firstAngle: boolean): Omit<DrawingView, 'id' | 'name'>[] {
  const s = sheet.scale[0] / sheet.scale[1];
  const f = projectedView(model, 'front'), t = projectedView(model, 'top'), r = projectedView(model, 'right');
  const gap = 15;
  const fw = (f.max[0] - f.min[0]) * s, fh = (f.max[1] - f.min[1]) * s;
  const th = (t.max[1] - t.min[1]) * s, rw = (r.max[0] - r.min[0]) * s;
  const base = { displayStyle: 'hiddenRemoved' as const, model, modelName: `${model.name}<1>` };
  const dy = fh / 2 + gap + th / 2, dx = fw / 2 + gap + rw / 2;
  return [
    { ...base, type: 'front', position: at },
    { ...base, type: 'top', position: [at[0], at[1] + (firstAngle ? -dy : dy)] },
    { ...base, type: 'right', position: [at[0] + (firstAngle ? -dx : dx), at[1]] },
  ];
}


/**
 * Area Hatch/Fill on a model face: the front-most planar face facing the viewer under the point (view coordinates),
 * grown over its coplanar connected triangles, as triangles in view coordinates.
 */
export function faceRegionAt(model: Document, type: DrawingViewType, q: [number, number]): [number, number][][] | null {
  const fr = viewFrame(type);
  const to2 = (p: THREE.Vector3): [number, number] => [p.dot(fr.u), p.dot(fr.v)];
  const inside = (t: [number, number][], p: [number, number]) => {
    const s = (a: [number, number], b: [number, number]) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const d1 = s(t[0], t[1]), d2 = s(t[1], t[2]), d3 = s(t[2], t[0]);
    return (d1 >= -1e-9 && d2 >= -1e-9 && d3 >= -1e-9) || (d1 <= 1e-9 && d2 <= 1e-9 && d3 <= 1e-9);
  };
  let best: { pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute; tri: number; depth: number } | null = null;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const b of modelBodies(model)) {
    const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const a = g.getAttribute('position');
    for (let t = 0; t + 2 < a.count; t += 3) {
      A.fromBufferAttribute(a, t); B.fromBufferAttribute(a, t + 1); C.fromBufferAttribute(a, t + 2);
      const n = B.clone().sub(A).cross(C.clone().sub(A));
      if (n.lengthSq() < 1e-12 || n.normalize().dot(fr.w) < 0.999) continue;
      if (!inside([to2(A), to2(B), to2(C)], q)) continue;
      const depth = A.dot(fr.w);
      if (!best || depth > best.depth) best = { pos: a, tri: t, depth };
    }
  }
  if (!best) return null;
  // the coplanar triangles connected to the hit one (shared vertices)
  const a = best.pos;
  const key = (i: number) => `${Math.round(a.getX(i) * 1e3)},${Math.round(a.getY(i) * 1e3)},${Math.round(a.getZ(i) * 1e3)}`;
  const tris: number[] = [];
  for (let t = 0; t + 2 < a.count; t += 3) {
    A.fromBufferAttribute(a, t); B.fromBufferAttribute(a, t + 1); C.fromBufferAttribute(a, t + 2);
    const n = B.clone().sub(A).cross(C.clone().sub(A));
    if (n.lengthSq() < 1e-12 || n.normalize().dot(fr.w) < 0.999 || Math.abs(A.dot(fr.w) - best.depth) > 1e-3) continue;
    tris.push(t);
  }
  const byVertex = new Map<string, number[]>();
  for (const t of tris) for (let k = 0; k < 3; k++) (byVertex.get(key(t + k)) ?? byVertex.set(key(t + k), []).get(key(t + k))!).push(t);
  const seen = new Set<number>([best.tri]);
  const queue = [best.tri];
  while (queue.length) {
    const t = queue.pop()!;
    for (let k = 0; k < 3; k++) for (const o of byVertex.get(key(t + k)) ?? []) if (!seen.has(o)) { seen.add(o); queue.push(o); }
  }
  return [...seen].map((t) => [0, 1, 2].map((k) => to2(new THREE.Vector3().fromBufferAttribute(a, t + k))));
}


const altCache = new WeakMap<Document, Map<string, Document>>();

/** The assembly in its alternate position: exploded, or the components moved by the motion study at a time. */
export function alternateModel(model: Document, alt: NonNullable<DrawingView['altPosition']>): Document {
  let m = altCache.get(model);
  if (!m) altCache.set(model, (m = new Map()));
  const key = `${alt.source}|${alt.time}`;
  const hit = m.get(key);
  if (hit) return hit;
  let out: Document = model;
  if (alt.source === 'exploded') out = { ...model, exploded: true };
  else if (model.motionStudy?.motors.length) {
    const tf = motionTransforms(model, model.components ?? [], model.motionStudy, alt.time);
    out = {
      ...model,
      // the moved components are fixed where the motion puts them, so no mate pulls them back
      mates: [],
      components: (model.components ?? []).map((c) => {
        const t = tf.get(c.id);
        if (!t) return { ...c, fixed: true };
        const mm = t.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...c.position), new THREE.Quaternion(...c.rotation), new THREE.Vector3(1, 1, 1)));
        const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
        mm.decompose(p, q, sc);
        return { ...c, fixed: true, position: [p.x, p.y, p.z] as [number, number, number], rotation: [q.x, q.y, q.z, q.w] as [number, number, number, number] };
      }),
    };
  }
  m.set(key, out);
  return out;
}

/** Lines of the alternate position in the view (view coordinates of the main view, so both line up). */
export function alternateLines(view: DrawingView): Line2D[] {
  if (!view.altPosition) return [];
  const alt = alternateModel(view.model, view.altPosition);
  if (alt === view.model) return [];
  return projectedView(alt, view.type).lines.filter((l) => !l.hidden);
}

/**
 * Dimension Type ▸ True: the 3D length of the model edge a view line shows (pictorial views foreshorten edges);
 * null when no straight model edge projects onto the line.
 */
export function trueLength(model: Document, type: DrawingViewType, a: [number, number], b: [number, number]): number | null {
  const fr = viewFrame(type);
  const to2 = (p: THREE.Vector3): [number, number] => [p.dot(fr.u), p.dot(fr.v)];
  const near = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05;
  for (const body of modelBodies(model)) {
    for (const e of body.edges) {
      if (!e.straight || e.points.length < 2) continue;
      const P = e.points[0], Q = e.points[e.points.length - 1];
      const p = to2(P), q = to2(Q);
      if ((near(p, a) && near(q, b)) || (near(p, b) && near(q, a))) return P.distanceTo(Q);
    }
  }
  return null;
}
