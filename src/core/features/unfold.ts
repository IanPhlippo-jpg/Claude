import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { SketchPoint } from '../sketch/types';
import { bendAllowance, type SheetMetalParams } from './sheetmetal';

/**
 * Unfolding of a base flange made from an open chain, as the intended Flatten / Unfold / Fold:
 * every point of the bent sheet has a developed coordinate s along the neutral surface (the bends count
 * with their bend allowance, neutral radius r + K·t), a thickness coordinate h (0 on the sketch-line face,
 * t on the other) and its depth w along the sketch normal (unchanged). The flat sheet lies in the plane
 * of the first segment, starting at the chain's first point.
 */
export interface SheetMapping {
  /** folded world point -> flat world point */
  toFlat(p: THREE.Vector3): THREE.Vector3;
  /** flat world point -> folded world point */
  toFolded(p: THREE.Vector3): THREE.Vector3;
  /** world-space plane normal of the s direction in the flat state and the s values where triangles must be split to fold */
  sNormal: THREE.Vector3;
  sOffset: number;
  splits: number[];
  /** developed length of the sheet (neutral surface) */
  length: number;
  /** s ranges of the bends (flat state): [start, end] */
  bends: [number, number][];
  /** flat world point at developed position s, thickness h, depth w */
  flatAt(s: number, h: number, w: number): THREE.Vector3;
}

type Zone =
  | { kind: 'line'; s0: number; L: number; start: SketchPoint; d: SketchPoint; nm: SketchPoint; first: boolean; last: boolean }
  | { kind: 'bend'; s0: number; L: number; c: SketchPoint; r0: SketchPoint; theta: number; turn: 1 | -1; toward: boolean; rn: number };

const ARC_SPLITS = 12;

export function sheetMapping(chain: SketchPoint[], plane: PlaneDef, p: SheetMetalParams, reverse = false): SheetMapping | null {
  if (chain.length < 2) return null;
  const t = p.thickness, r = p.bendRadius;
  const m = reverse ? -1 : 1;
  const sub = (a: SketchPoint, b: SketchPoint) => ({ x: a.x - b.x, y: a.y - b.y });
  const unit = (v: SketchPoint) => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: v.y / l }; };
  const left = (v: SketchPoint) => ({ x: -v.y, y: v.x });
  const n = chain.length;
  const dirs: SketchPoint[] = [];
  for (let i = 0; i + 1 < n; i++) dirs.push(unit(sub(chain[i + 1], chain[i])));
  // bends at the interior vertices
  const bendAt: ({ td: number; c: SketchPoint; r0: SketchPoint; theta: number; turn: 1 | -1; toward: boolean } | null)[] = [null];
  for (let i = 1; i < n - 1; i++) {
    const d1 = dirs[i - 1], d2 = dirs[i];
    const cr = d1.x * d2.y - d1.y * d2.x;
    const theta = Math.acos(Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y)));
    if (Math.abs(cr) < 1e-9 || theta < 1e-6) { bendAt.push(null); continue; }
    const turn: 1 | -1 = cr > 0 ? 1 : -1;
    const toward = turn === m;
    const rho0 = toward ? r + t : r;
    const td = rho0 * Math.tan(theta / 2);
    const t1 = { x: chain[i].x - d1.x * td, y: chain[i].y - d1.y * td };
    const nl = left(d1);
    const n1 = { x: nl.x * turn, y: nl.y * turn };
    const c = { x: t1.x + n1.x * rho0, y: t1.y + n1.y * rho0 };
    bendAt.push({ td, c, r0: unit(sub(t1, c)), theta, turn, toward });
  }
  bendAt.push(null);
  const zones: Zone[] = [];
  let s = 0;
  const bends: [number, number][] = [];
  const splits: number[] = [];
  for (let k = 0; k + 1 < n; k++) {
    const tdS = bendAt[k]?.td ?? 0, tdE = bendAt[k + 1]?.td ?? 0;
    const d = dirs[k];
    const segLen = Math.hypot(chain[k + 1].x - chain[k].x, chain[k + 1].y - chain[k].y);
    const L = Math.max(0, segLen - tdS - tdE);
    const nl = left(d);
    zones.push({ kind: 'line', s0: s, L, start: { x: chain[k].x + d.x * tdS, y: chain[k].y + d.y * tdS }, d, nm: { x: nl.x * m, y: nl.y * m }, first: k === 0, last: k === n - 2 });
    s += L;
    const b = bendAt[k + 1];
    if (b) {
      // the bend allowance of the chosen type (K-factor, bend allowance, bend deduction, bend table); its neutral radius
      const BA = bendAllowance((b.theta * 180) / Math.PI, r, p);
      const rn = BA / b.theta;
      zones.push({ kind: 'bend', s0: s, L: BA, c: b.c, r0: b.r0, theta: b.theta, turn: b.turn, toward: b.toward, rn });
      bends.push([s, s + BA]);
      for (let q = 0; q <= ARC_SPLITS; q++) splits.push(s + (BA * q) / ARC_SPLITS);
      s += BA;
    }
  }
  const total = s;
  const o = new THREE.Vector3(...plane.origin), U = new THREE.Vector3(...plane.u), V = new THREE.Vector3(...plane.v), N = new THREE.Vector3(...plane.n);
  const to2 = (q: THREE.Vector3): [SketchPoint, number] => { const d = q.clone().sub(o); return [{ x: d.dot(U), y: d.dot(V) }, d.dot(N)]; };
  const to3 = (q: SketchPoint, w: number) => o.clone().addScaledVector(U, q.x).addScaledVector(V, q.y).addScaledVector(N, w);
  const c0 = chain[0], d0 = dirs[0], nm0 = { x: left(d0).x * m, y: left(d0).y * m };

  // folded sketch point -> (s, h)
  const develop = (q: SketchPoint): [number, number] => {
    let best: [number, number] = [0, 0], bestErr = Infinity;
    for (const z of zones) {
      let sv: number, h: number, err: number;
      if (z.kind === 'line') {
        const a = (q.x - z.start.x) * z.d.x + (q.y - z.start.y) * z.d.y;
        h = (q.x - z.start.x) * z.nm.x + (q.y - z.start.y) * z.nm.y;
        const lo = z.first ? -Infinity : 0, hi = z.last ? Infinity : z.L;
        err = Math.max(0, lo - a, a - hi) + Math.max(0, -h, h - t);
        sv = z.s0 + a;
      } else {
        const v = { x: q.x - z.c.x, y: q.y - z.c.y };
        const rho = Math.hypot(v.x, v.y);
        // angle from the start radius, measured in the turning direction
        const cosA = (v.x * z.r0.x + v.y * z.r0.y) / (rho || 1);
        const sinA = ((z.r0.x * v.y - z.r0.y * v.x) / (rho || 1)) * z.turn;
        let phi = Math.atan2(sinA, cosA);
        if (phi < -Math.PI / 2) phi += 2 * Math.PI;
        h = z.toward ? r + t - rho : rho - r;
        err = Math.max(0, -phi, phi - z.theta) * (r + t) + Math.max(0, -h, h - t);
        sv = z.s0 + Math.max(0, Math.min(z.theta, phi)) * z.rn;
      }
      if (err < bestErr - 1e-9) { bestErr = err; best = [sv, h]; }
    }
    return best;
  };
  // (s, h) -> folded sketch point
  const fold = (sv: number, h: number): SketchPoint => {
    let z = zones[zones.length - 1];
    for (const zz of zones) if (sv <= zz.s0 + zz.L + 1e-9) { z = zz; break; }
    if (sv < 0) z = zones[0];
    if (z.kind === 'line') {
      const a = sv - z.s0;
      return { x: z.start.x + z.d.x * a + z.nm.x * h, y: z.start.y + z.d.y * a + z.nm.y * h };
    }
    const phi = (sv - z.s0) / z.rn;
    const ca = Math.cos(phi), sa = Math.sin(phi) * z.turn;
    const dir = { x: z.r0.x * ca - z.r0.y * sa, y: z.r0.x * sa + z.r0.y * ca };
    const rho = z.toward ? r + t - h : r + h;
    return { x: z.c.x + dir.x * rho, y: z.c.y + dir.y * rho };
  };
  const sNormal = U.clone().multiplyScalar(d0.x).add(V.clone().multiplyScalar(d0.y)).normalize();
  return {
    toFlat(pt) {
      const [q, w] = to2(pt);
      const [sv, h] = develop(q);
      return to3({ x: c0.x + d0.x * sv + nm0.x * h, y: c0.y + d0.y * sv + nm0.y * h }, w);
    },
    toFolded(pt) {
      const [q, w] = to2(pt);
      const sv = (q.x - c0.x) * d0.x + (q.y - c0.y) * d0.y;
      const h = (q.x - c0.x) * nm0.x + (q.y - c0.y) * nm0.y;
      return to3(fold(sv, h), w);
    },
    flatAt: (sv: number, h: number, w: number) => to3({ x: c0.x + d0.x * sv + nm0.x * h, y: c0.y + d0.y * sv + nm0.y * h }, w),
    sNormal,
    sOffset: to3(c0, 0).dot(sNormal),
    splits,
    length: total,
    bends,
  };
}

/** Map every vertex of a (non-indexed) mesh. */
export function mapGeometry(g: THREE.BufferGeometry, f: (p: THREE.Vector3) => THREE.Vector3): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const a = src.getAttribute('position');
  const out = new Float32Array(a.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) {
    const q = f(v.fromBufferAttribute(a, i));
    out[i * 3] = q.x; out[i * 3 + 1] = q.y; out[i * 3 + 2] = q.z;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(out, 3));
  r.computeVertexNormals();
  r.computeBoundingBox();
  return r;
}

/** Split the triangles of a mesh by the parallel planes n·p = values[k] (so a fold maps each piece affinely). */
export function splitByPlanes(g: THREE.BufferGeometry, n: THREE.Vector3, values: number[]): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const a = src.getAttribute('position');
  let tris: THREE.Vector3[][] = [];
  for (let i = 0; i + 2 < a.count; i += 3) tris.push([new THREE.Vector3().fromBufferAttribute(a, i), new THREE.Vector3().fromBufferAttribute(a, i + 1), new THREE.Vector3().fromBufferAttribute(a, i + 2)]);
  for (const c of [...new Set(values.map((x) => Math.round(x * 1e6) / 1e6))]) {
    const next: THREE.Vector3[][] = [];
    for (const tri of tris) {
      const d = tri.map((p) => p.dot(n) - c);
      if ((d[0] >= -1e-7 && d[1] >= -1e-7 && d[2] >= -1e-7) || (d[0] <= 1e-7 && d[1] <= 1e-7 && d[2] <= 1e-7)) { next.push(tri); continue; }
      const above: THREE.Vector3[] = [], below: THREE.Vector3[] = [];
      for (let k = 0; k < 3; k++) {
        const p = tri[k], q = tri[(k + 1) % 3], dp = d[k], dq = d[(k + 1) % 3];
        if (dp >= 0) above.push(p); else below.push(p);
        if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) { const x = p.clone().lerp(q, dp / (dp - dq)); above.push(x); below.push(x.clone()); }
      }
      for (const poly of [above, below]) for (let k = 1; k + 1 < poly.length; k++) next.push([poly[0], poly[k], poly[k + 1]]);
    }
    tris = next;
  }
  const out = new Float32Array(tris.length * 9);
  tris.forEach((tr, i) => tr.forEach((p, k) => { out[i * 9 + k * 3] = p.x; out[i * 9 + k * 3 + 1] = p.y; out[i * 9 + k * 3 + 2] = p.z; }));
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(out, 3));
  r.computeVertexNormals();
  return r;
}

/** Flatten a bent sheet mesh. */
export function unfoldGeometry(g: THREE.BufferGeometry, m: SheetMapping): THREE.BufferGeometry {
  return mapGeometry(g, (p) => m.toFlat(p));
}

/** Fold a flat sheet mesh back (triangles are first split at the bend lines and the bend facets). */
export function foldGeometry(g: THREE.BufferGeometry, m: SheetMapping): THREE.BufferGeometry {
  const split = splitByPlanes(g, m.sNormal, m.splits.map((s) => s + m.sOffset));
  return mapGeometry(split, (p) => m.toFolded(p));
}
