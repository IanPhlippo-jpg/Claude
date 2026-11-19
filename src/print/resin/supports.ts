/**
 * Resin supports (docs/33 phase 4): contact points under the overhangs and the islands, a strut from each point down
 * to the raft or to the part below, with a thin tip where it touches the part and a wider foot. "tree": struts close
 * together branch at 45 degrees into one trunk. The user adds and removes points by hand (plate coordinates).
 * The struts are cut per layer as discs (no mesh boolean); the 3D view gets tubes. Not printed yet: nog te printen.
 */
import { bounds } from '../mesh';
import { poly, UNITS, type Path, type Paths } from '../geom/polygons';
import { disc } from './analyze';
import type { ResinSettings } from './types';

/** vertical rays through a mesh: the triangles bucketed on an XY grid */
export class RayGrid {
  private cells = new Map<number, number[]>();
  private readonly cell = 2;
  constructor(private pos: Float32Array) {
    for (let t = 0; t + 8 < pos.length; t += 9) {
      const x0 = Math.min(pos[t], pos[t + 3], pos[t + 6]), x1 = Math.max(pos[t], pos[t + 3], pos[t + 6]);
      const y0 = Math.min(pos[t + 1], pos[t + 4], pos[t + 7]), y1 = Math.max(pos[t + 1], pos[t + 4], pos[t + 7]);
      for (let i = Math.floor(x0 / this.cell); i <= Math.floor(x1 / this.cell); i++) for (let j = Math.floor(y0 / this.cell); j <= Math.floor(y1 / this.cell); j++) {
        const k = this.key(i, j), l = this.cells.get(k);
        if (l) l.push(t); else this.cells.set(k, [t]);
      }
    }
  }
  private key(i: number, j: number) { return (i + 50000) * 100000 + (j + 50000); }
  /** the surfaces a vertical line at (x, y) crosses, lowest first: height and the Z of the unit normal */
  hits(x: number, y: number): { z: number; nz: number }[] {
    const p = this.pos, out: { z: number; nz: number }[] = [];
    for (const t of this.cells.get(this.key(Math.floor(x / this.cell), Math.floor(y / this.cell))) ?? []) {
      const ax = p[t], ay = p[t + 1], bx = p[t + 3], by = p[t + 4], cx = p[t + 6], cy = p[t + 7];
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, w = 1 - u - v;
      if (u < -1e-9 || v < -1e-9 || w < -1e-9) continue;
      const ux = bx - ax, uy = by - ay, uz = p[t + 5] - p[t + 2], vx = cx - ax, vy = cy - ay, vz = p[t + 8] - p[t + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const z = u * p[t + 2] + v * p[t + 5] + w * p[t + 8];
      const n = nz / (Math.hypot(nx, ny, nz) || 1);
      if (!out.some((h) => Math.abs(h.z - z) < 1e-4 && Math.sign(h.nz) === Math.sign(n))) out.push({ z, nz: n });
    }
    return out.sort((a, b) => a.z - b.z);
  }
}

export interface Strut {
  x: number; y: number;
  /** where the tip touches the part */
  zTop: number;
  /** where it stands: the raft top, or the part below (onModel) */
  zBase: number;
  onModel: boolean;
  /** tree: the trunk it branches into */
  trunk?: number;
}
export interface Trunk { x: number; y: number; zJoin: number; zBase: number }
export interface SupportPlan { struts: Strut[]; trunks: Trunk[]; raft: Paths; raftTop: number }

export const TIP_LENGTH = 1.5;
const FOOT_LENGTH = 1;

/**
 * The contact points: a lattice of `supportSpacing` under every face that points down flatter than `supportAngle`, the
 * islands of the part, the points the user added; minus the points near the ones the user removed.
 */
export function supportPoints(pos: Float32Array, s: ResinSettings, islands: [number, number, number][], grid = new RayGrid(pos)): [number, number, number][] {
  const out: [number, number, number][] = [];
  if (s.supports !== 'none' && pos.length) {
    const b = bounds(pos), sp = s.supportSpacing, limit = Math.cos((s.supportAngle * Math.PI) / 180);
    for (let x = b.min[0] + sp / 2; x < b.max[0]; x += sp) for (let y = b.min[1] + sp / 2; y < b.max[1]; y += sp) {
      for (const h of grid.hits(x, y)) if (h.nz < -limit) out.push([x, y, h.z]);
    }
    // an island keeps its own point: a lattice point nearby may touch the part higher up, beside the island
    for (const p of islands) if (!out.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.3 && Math.abs(q[2] - p[2]) < 0.1)) out.push(p);
  }
  const kept = out.filter((p) => !s.removedPoints.some(([x, y]) => Math.hypot(p[0] - x, p[1] - y) < 1.5));
  return [...kept, ...s.addedPoints.map((p): [number, number, number] => [p[0], p[1], p[2]])];
}

/** struts from the points down: onto the part where it lies below, else onto the raft; tree: branches into trunks */
export function planSupports(points: [number, number, number][], s: ResinSettings, grid: RayGrid): SupportPlan {
  const raftTop = s.raft ? s.raftThickness : 0;
  const struts: Strut[] = points.map(([x, y, z]) => {
    const below = grid.hits(x, y).filter((h) => h.z < z - 0.05 && h.nz > 0);
    const base = below.length ? below[below.length - 1].z : raftTop;
    return { x, y, zTop: z, zBase: base, onModel: below.length > 0 };
  });
  const trunks: Trunk[] = [];
  if (s.supports === 'tree') {
    // cells of 8 mm: the struts on the raft in a cell join one trunk under their middle, at 45 degrees
    const cells = new Map<string, number[]>();
    struts.forEach((st, i) => { if (!st.onModel) { const k = `${Math.floor(st.x / 8)},${Math.floor(st.y / 8)}`; const l = cells.get(k); if (l) l.push(i); else cells.set(k, [i]); } });
    for (const ids of cells.values()) {
      if (ids.length < 2) continue;
      const cx = ids.reduce((a, i) => a + struts[i].x, 0) / ids.length, cy = ids.reduce((a, i) => a + struts[i].y, 0) / ids.length;
      const zJoin = Math.min(...ids.map((i) => struts[i].zTop - TIP_LENGTH - Math.hypot(struts[i].x - cx, struts[i].y - cy)));
      if (zJoin < raftTop + 2 * FOOT_LENGTH) continue;
      trunks.push({ x: cx, y: cy, zJoin, zBase: raftTop });
      for (const i of ids) struts[i].trunk = trunks.length - 1;
    }
  }
  const feet: Paths = [];
  for (const st of struts) if (!st.onModel && st.trunk === undefined) feet.push(disc(st.x, st.y, s.supportDiameter * 1.5 + 1.5));
  for (const t of trunks) feet.push(disc(t.x, t.y, s.supportDiameter * 2 + 1.5));
  const raft = s.raft && feet.length ? poly.offset(poly.offset(poly.union(feet), 3 * UNITS), -3 * UNITS) : [];
  return { struts, trunks, raft, raftTop };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** the cross-sections of the supports at height z (grid units; not united) */
export function supportSection(plan: SupportPlan, z: number, s: ResinSettings): Paths {
  const out: Path[] = [];
  const r = s.supportDiameter / 2, tip = s.tipDiameter / 2;
  if (z < plan.raftTop) return plan.raft.slice();
  for (const st of plan.struts) {
    if (z > st.zTop || z < st.zBase) continue;
    const t = st.trunk !== undefined ? plan.trunks[st.trunk] : null;
    const below = st.zTop - TIP_LENGTH;
    if (z > below) { out.push(disc(st.x, st.y, lerp(r, tip, (z - below) / TIP_LENGTH), 12)); continue; }
    if (t) {
      if (z < t.zJoin) continue;
      const f = (below - z) / Math.max(1e-6, below - t.zJoin);
      out.push(disc(lerp(st.x, t.x, f), lerp(st.y, t.y, f), r, 12));
      continue;
    }
    // the bottom: a tip on the part, a wider foot on the raft
    if (z < st.zBase + (st.onModel ? TIP_LENGTH : FOOT_LENGTH)) {
      const f = (z - st.zBase) / (st.onModel ? TIP_LENGTH : FOOT_LENGTH);
      out.push(disc(st.x, st.y, st.onModel ? lerp(tip, r, f) : lerp(2 * r, r, f), 12));
      continue;
    }
    out.push(disc(st.x, st.y, r, 12));
  }
  for (const t of plan.trunks) {
    if (z > t.zJoin || z < t.zBase) continue;
    const R = r * 1.5;
    out.push(disc(t.x, t.y, z < t.zBase + FOOT_LENGTH ? lerp(2 * R, R, (z - t.zBase) / FOOT_LENGTH) : R, 16));
  }
  return out;
}

/** a tube between two points (triangles, for the 3D view) */
function tube(out: number[], a: number[], b: number[], ra: number, rb: number, n = 8) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]) || 1;
  const w = d.map((v) => v / L);
  const u = Math.abs(w[2]) < 0.9 ? [-w[1], w[0], 0] : [1, 0, 0];
  const ul = Math.hypot(u[0], u[1], u[2]);
  const U = u.map((v) => v / ul), V = [w[1] * U[2] - w[2] * U[1], w[2] * U[0] - w[0] * U[2], w[0] * U[1] - w[1] * U[0]];
  const ring = (c: number[], r: number, i: number) => {
    const t = (2 * Math.PI * i) / n;
    return [0, 1, 2].map((k) => c[k] + r * (Math.cos(t) * U[k] + Math.sin(t) * V[k]));
  };
  for (let i = 0; i < n; i++) {
    const p0 = ring(a, ra, i), p1 = ring(a, ra, i + 1), q0 = ring(b, rb, i), q1 = ring(b, rb, i + 1);
    out.push(...p0, ...p1, ...q1, ...p0, ...q1, ...q0);
  }
}

/** the supports and the raft as triangles (plate coordinates) for the plate view */
export function supportMesh(plan: SupportPlan, s: ResinSettings): Float32Array {
  const out: number[] = [];
  const r = s.supportDiameter / 2, tip = s.tipDiameter / 2;
  for (const st of plan.struts) {
    const top = [st.x, st.y, st.zTop], under = [st.x, st.y, st.zTop - TIP_LENGTH];
    tube(out, under, top, r, tip);
    const t = st.trunk !== undefined ? plan.trunks[st.trunk] : null;
    if (t) { tube(out, [t.x, t.y, t.zJoin], under, r, r); continue; }
    if (under[2] <= st.zBase) continue;
    // a tip on the part below, or a foot of 1 mm on the raft, then the strut
    const foot = Math.min(under[2], st.zBase + (st.onModel ? TIP_LENGTH : FOOT_LENGTH));
    tube(out, [st.x, st.y, st.zBase], [st.x, st.y, foot], st.onModel ? tip : 2 * r, r);
    if (under[2] > foot) tube(out, [st.x, st.y, foot], under, r, r);
  }
  for (const t of plan.trunks) {
    tube(out, [t.x, t.y, t.zBase], [t.x, t.y, t.zBase + FOOT_LENGTH], r * 3, r * 1.5, 12);
    tube(out, [t.x, t.y, t.zBase + FOOT_LENGTH], [t.x, t.y, t.zJoin], r * 1.5, r * 1.5, 12);
  }
  // the raft: its outline as a low prism, the top as a fan from the middle of each loop (the view only)
  for (const p of plan.raft) {
    let mx = 0, my = 0;
    for (let i = 0; i < p.length; i += 2) { mx += p[i] / UNITS; my += p[i + 1] / UNITS; }
    mx /= p.length / 2; my /= p.length / 2;
    for (let i = 0; i < p.length; i += 2) {
      const j = (i + 2) % p.length;
      const a = [p[i] / UNITS, p[i + 1] / UNITS], b = [p[j] / UNITS, p[j + 1] / UNITS], h = plan.raftTop;
      out.push(a[0], a[1], 0, b[0], b[1], 0, b[0], b[1], h, a[0], a[1], 0, b[0], b[1], h, a[0], a[1], h, mx, my, h, a[0], a[1], h, b[0], b[1], h);
    }
  }
  return Float32Array.from(out);
}
