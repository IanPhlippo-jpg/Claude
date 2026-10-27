import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { PlaneDef, RibFeature } from '../document/types';
import type { Sketch, SketchPoint } from '../sketch/types';
import { sketchChains, thinRegions } from './thin';
import { extrudeGeometry, planeMatrix, THROUGH_ALL } from './solid';
import type { Region } from './regions';

/**
 * Rib (Features ▸ Rib), by design: an open sketch (a line, an arc, a chain) on a plane
 * becomes a thin wall that grows from the sketch until it meets the body. The ends of the
 * sketch are extended to the body automatically and the far side follows the body's surface.
 *
 *   direction 'parallel' — the material grows in the sketch plane, away from the sketch,
 *                          toward the body (Flip material side picks the other side);
 *                          thickness across the plane: First Side / Both Sides / Second Side
 *   direction 'normal'   — the material grows along the plane normal (a band of the thickness
 *                          around the sketch, extruded until it meets the body)
 */
export function ribGeometry(sketch: Sketch, plane: PlaneDef, body: THREE.BufferGeometry, f: Pick<RibFeature, 'thickness' | 'side' | 'direction' | 'flip'> & Partial<Pick<RibFeature, 'draft' | 'draftOutward' | 'thicknessAt' | 'ribType'>>): { geometry: THREE.BufferGeometry | null; error?: string } {
  const chains = sketchChains(sketch).filter((c) => c.points.length >= 2);
  if (!chains.length) return { geometry: null, error: 'The rib sketch needs a line, arc or chain to grow the rib from.' };
  const t = Math.max(1e-3, f.thickness);
  const M = planeMatrix(plane);
  const Minv = M.clone().invert();
  // the body in sketch coordinates (z = plane normal), for the ray casts
  const local = body.clone().applyMatrix4(Minv);
  local.computeBoundingBox();
  const lb = local.boundingBox!;
  const reach = lb.max.distanceTo(lb.min) * 2 + 1;
  const bvh = new MeshBVH(local);
  const hitDistance = (origin: THREE.Vector3, dir: THREE.Vector3): number | null => {
    const ray = new THREE.Ray(origin, dir.clone().normalize());
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
    return hit && hit.distance <= reach ? hit.distance : null;
  };
  const OVER = 0.05; // a little into the body so the rib merges with it
  // Rib Thickness ▸ At wall interface: the drafted rib has the thickness where it meets the body, so it starts
  // thicker (inward draft) or thinner (outward) at the sketch by the draft over the rib's depth
  const tan = f.draft ? Math.tan((Math.min(45, Math.max(0, f.draft)) * Math.PI) / 180) * (f.draftOutward ? -1 : 1) : 0;
  const atSketch = (depth: number) => (f.thicknessAt === 'wall' && tan ? Math.max(0.01, t + 2 * depth * tan) : t);
  const natural = f.direction === 'normal' && f.ribType === 'natural';

  const parts: THREE.BufferGeometry[] = [];
  for (const chain of chains) {
    const pts = chain.points.map((p) => ({ x: p.x, y: p.y }));
    const mid = midpoint(pts);
    if (!chain.closed) {
      // extend both ends to the body (the intended design extends the sketch automatically)
      if (natural) {
        extendNatural(pts, true, hitDistance);
        extendNatural(pts, false, hitDistance);
      } else {
        extendEnd(pts, true, hitDistance);
        extendEnd(pts, false, hitDistance);
      }
    }
    const dense = resample(pts, 64);
    let geom: THREE.BufferGeometry | null;
    if (f.direction === 'normal') {
      const up = hitDistance(new THREE.Vector3(mid.x, mid.y, 0), new THREE.Vector3(0, 0, 1));
      const down = hitDistance(new THREE.Vector3(mid.x, mid.y, 0), new THREE.Vector3(0, 0, -1));
      let reverse = up === null && down !== null ? true : up !== null && down === null ? false : (down ?? Infinity) < (up ?? Infinity);
      if (f.flip) reverse = !reverse;
      const dir = new THREE.Vector3(0, 0, reverse ? -1 : 1);
      const hits = dense.map((p) => hitDistance(new THREE.Vector3(p.x, p.y, 0), dir)).filter((d): d is number => d !== null);
      if (!hits.length) return { geometry: null, error: 'The rib does not reach the body: sketch it so that the material can grow into the part.' };
      const depth = Math.max(...hits);
      const ts = atSketch(depth);
      const regions = thinRegions([{ points: pts, closed: chain.closed }], { mode: 'mid', thickness: ts });
      geom = extrudeGeometry(regions, plane, { end: 'blind', depth: depth + OVER, reverse }, THROUGH_ALL, 0);
      if (geom && f.draft) geom = ribDraft(geom, M, Minv, dense, f.draft, !!f.draftOutward, ts / 2, 'normal', 0);
    } else {
      let regions: Region[];
      let ts = t;
      if (chain.closed) {
        regions = [{ outer: pts, holes: [], area: 0 }];
      } else {
        // growth direction in the plane: perpendicular to the chord, toward the body
        const a = pts[0], b = pts[pts.length - 1];
        const chord = { x: b.x - a.x, y: b.y - a.y };
        const len = Math.hypot(chord.x, chord.y) || 1;
        const nrm = { x: -chord.y / len, y: chord.x / len };
        const plus = hitDistance(new THREE.Vector3(mid.x, mid.y, 0), new THREE.Vector3(nrm.x, nrm.y, 0));
        const minus = hitDistance(new THREE.Vector3(mid.x, mid.y, 0), new THREE.Vector3(-nrm.x, -nrm.y, 0));
        let sign = plus === null && minus === null ? 1 : plus === null ? -1 : minus === null ? 1 : plus <= minus ? 1 : -1;
        if (f.flip) sign = -sign;
        const dir = new THREE.Vector3(nrm.x * sign, nrm.y * sign, 0);
        // the far side follows the body: one ray per sample, gaps take the deepest hit
        const hits = dense.map((p) => hitDistance(new THREE.Vector3(p.x, p.y, 0), dir));
        const valid = hits.filter((d): d is number => d !== null);
        if (!valid.length) return { geometry: null, error: 'The rib does not reach the body: sketch it so that the material can grow into the part (or Flip material side).' };
        const dmax = Math.max(...valid);
        ts = atSketch(dmax);
        const farSide = dense.map((p, i) => ({ x: p.x + dir.x * ((hits[i] ?? dmax) + OVER), y: p.y + dir.y * ((hits[i] ?? dmax) + OVER) }));
        regions = [{ outer: [...dense, ...farSide.reverse()], holes: [], area: 0 }];
      }
      const ext = f.side === 'both' ? { end: 'midPlane' as const, depth: ts, reverse: false } : { end: 'blind' as const, depth: ts, reverse: f.side === 'second' };
      geom = extrudeGeometry(regions, plane, ext, THROUGH_ALL, 0);
      if (geom && f.draft) geom = ribDraft(geom, M, Minv, dense, f.draft, !!f.draftOutward, ts / 2, 'parallel', f.side === 'both' ? 0 : f.side === 'second' ? -ts / 2 : ts / 2);
    }
    if (geom) parts.push(geom);
  }
  if (!parts.length) return { geometry: null, error: 'The rib has no volume.' };
  if (parts.length === 1) return { geometry: parts[0] };
  // several chains: one geometry (overlaps are absorbed by the union with the body)
  const merged = new THREE.BufferGeometry();
  const pos: number[] = [];
  for (const p of parts) pos.push(...Array.from(p.getAttribute('position').array as Float32Array));
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.computeVertexNormals();
  return { geometry: merged };
}

/**
 * Rib draft: the wall tapers by the angle as it moves away from the sketch. Parallel ribs: the thickness across the
 * plane shrinks with the in-plane distance from the sketch; normal ribs: the band around the sketch narrows with the
 * height above the plane. Draft outward makes it grow instead.
 */
function ribDraft(g: THREE.BufferGeometry, M: THREE.Matrix4, Minv: THREE.Matrix4, chain: SketchPoint[], deg: number, outward: boolean, half: number, dir: 'parallel' | 'normal', zMid: number): THREE.BufferGeometry {
  const out = (g.index ? g.toNonIndexed() : g).clone();
  out.applyMatrix4(Minv);
  const a = out.getAttribute('position');
  const tan = Math.tan((Math.min(45, Math.max(0, deg)) * Math.PI) / 180) * (outward ? -1 : 1);
  const v = new THREE.Vector3();
  const closest = (x: number, y: number) => {
    let best = { d: Infinity, x: 0, y: 0 };
    for (let i = 1; i < chain.length; i++) {
      const p = chain[i - 1], q = chain[i];
      const dx = q.x - p.x, dy = q.y - p.y;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / l2));
      const cx = p.x + dx * t, cy = p.y + dy * t;
      const d = Math.hypot(x - cx, y - cy);
      if (d < best.d) best = { d, x: cx, y: cy };
    }
    return best;
  };
  for (let i = 0; i < a.count; i++) {
    v.fromBufferAttribute(a, i);
    if (dir === 'parallel') {
      const k = Math.max(0.05, (half - closest(v.x, v.y).d * tan) / half);
      v.z = zMid + (v.z - zMid) * k;
    } else {
      const c = closest(v.x, v.y);
      const k = Math.max(0.05, (half - Math.abs(v.z) * tan) / half);
      v.x = c.x + (v.x - c.x) * k;
      v.y = c.y + (v.y - c.y) * k;
    }
    a.setXYZ(i, v.x, v.y, v.z);
  }
  out.applyMatrix4(M);
  out.computeVertexNormals();
  return out;
}

/** Point halfway along a polyline (by length). */
function midpoint(pts: SketchPoint[]): SketchPoint {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (run + seg >= total / 2) {
      const t = seg > 0 ? (total / 2 - run) / seg : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    run += seg;
  }
  return pts[0];
}

/** The polyline with (at least) n points evenly spaced by length; the original vertices are kept. */
function resample(pts: SketchPoint[], n: number): SketchPoint[] {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  if (total < 1e-9) return pts.slice();
  const step = total / n;
  const out: SketchPoint[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const k = Math.max(1, Math.round(seg / step));
    for (let j = 1; j <= k; j++) out.push({ x: a.x + ((b.x - a.x) * j) / k, y: a.y + ((b.y - a.y) * j) / k });
  }
  return out;
}

/**
 * Type ▸ Natural: the end of the chain runs on along its own curve until the body is hit. A curved end (the last
 * three points not in line, as on an arc) follows its circle in small steps; a straight end goes on straight, as Linear.
 */
function extendNatural(pts: SketchPoint[], first: boolean, hitDistance: (o: THREE.Vector3, d: THREE.Vector3) => number | null): void {
  if (pts.length < 3) return extendEnd(pts, first, hitDistance);
  const [a, b, c] = first ? [pts[2], pts[1], pts[0]] : [pts[pts.length - 3], pts[pts.length - 2], pts[pts.length - 1]];
  const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
  const span = Math.hypot(c.x - a.x, c.y - a.y);
  if (Math.abs(cross) < 1e-6 * span * span) return extendEnd(pts, first, hitDistance);
  // the circle through a, b, c
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  const r = Math.hypot(c.x - cx, c.y - cy);
  const sense = cross > 0 ? 1 : -1;
  const step = (2 * Math.PI) / 180;
  const added: SketchPoint[] = [];
  let p = c;
  let ang = Math.atan2(c.y - cy, c.x - cx);
  for (let i = 0; i < 180; i++) {
    ang += sense * step;
    const q = { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
    const dir = new THREE.Vector3(q.x - p.x, q.y - p.y, 0);
    const len = dir.length();
    const hit = hitDistance(new THREE.Vector3(p.x, p.y, 0), dir);
    if (hit !== null && hit <= len) {
      const e = hit + 0.05;
      added.push({ x: p.x + (dir.x / len) * e, y: p.y + (dir.y / len) * e });
      if (first) pts.unshift(...added.reverse());
      else pts.push(...added);
      return;
    }
    added.push(q);
    p = q;
  }
  // a full turn without meeting the body: the curve stays as sketched, like Linear
  extendEnd(pts, first, hitDistance);
}

/** Extend the first (or last) point of a polyline along its end tangent until the body is hit. */
function extendEnd(pts: SketchPoint[], first: boolean, hitDistance: (o: THREE.Vector3, d: THREE.Vector3) => number | null): void {
  const i = first ? 0 : pts.length - 1;
  const j = first ? 1 : pts.length - 2;
  const dir = { x: pts[i].x - pts[j].x, y: pts[i].y - pts[j].y };
  const len = Math.hypot(dir.x, dir.y);
  if (len < 1e-9) return;
  const d = hitDistance(new THREE.Vector3(pts[i].x, pts[i].y, 0), new THREE.Vector3(dir.x / len, dir.y / len, 0));
  if (d === null) return;
  // a little past the face so the rib merges with the wall
  const e = d + 0.05;
  pts[i] = { x: pts[i].x + (dir.x / len) * e, y: pts[i].y + (dir.y / len) * e };
}
