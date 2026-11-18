/**
 * Mesh -> closed contours per layer (docs/34 2.2):
 *   - vertices welded on the integer grid; Z of the vertices on the grid, the cutting plane half a unit beside it, so no
 *     vertex lies on the plane and the special cases (point on plane, edge in plane, flat triangle) cannot happen
 *   - a sweep over Z: triangles sorted by their lowest Z, an active list per plane
 *   - segments chained through the mesh edge they cross (exact for a manifold mesh), not through coordinates
 *   - open ends of a damaged mesh joined by distance (up to 2 mm), and counted for the warning
 * The contours of a layer run counter-clockwise around material; the caller unites them (positive fill rule).
 */
import { UNITS, type Paths } from '../geom/polygons';
import { openChains, unionSegments } from '../geom/boolean';

export interface SlicedLayer { contours: Paths; repaired: number }

interface Prepared {
  /** welded vertices, integer grid units */
  vx: Float64Array; vy: Float64Array; vz: Float64Array;
  /** triangles: vertex ids */
  tri: Int32Array;
  /** triangle order by lowest Z */
  order: Int32Array;
  zmin: Float64Array; zmax: Float64Array;
  nv: number;
}

function prepare(pos: Float32Array): Prepared {
  const ids = new Map<string, number>();
  const xs: number[] = [], ys: number[] = [], zs: number[] = [];
  const vid = (i: number) => {
    const x = Math.round(pos[i] * UNITS), y = Math.round(pos[i + 1] * UNITS), z = Math.round(pos[i + 2] * UNITS);
    const k = `${x},${y},${z}`;
    let v = ids.get(k);
    if (v === undefined) { v = xs.length; ids.set(k, v); xs.push(x); ys.push(y); zs.push(z); }
    return v;
  };
  const tl: number[] = [];
  for (let i = 0; i + 8 < pos.length; i += 9) {
    const a = vid(i), b = vid(i + 3), c = vid(i + 6);
    if (a !== b && b !== c && a !== c) tl.push(a, b, c);
  }
  const tri = Int32Array.from(tl);
  const n = tri.length / 3;
  const vz = Float64Array.from(zs);
  const zmin = new Float64Array(n), zmax = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const a = vz[tri[3 * t]], b = vz[tri[3 * t + 1]], c = vz[tri[3 * t + 2]];
    zmin[t] = Math.min(a, b, c); zmax[t] = Math.max(a, b, c);
  }
  const order = Int32Array.from({ length: n }, (_, i) => i).sort((p, q) => zmin[p] - zmin[q]);
  return { vx: Float64Array.from(xs), vy: Float64Array.from(ys), vz, tri, order, zmin, zmax, nv: xs.length };
}

/**
 * Slices one mesh (plate coordinates, mm) at the given plane heights (mm, ascending). Returns the contours per plane in
 * grid units, and how many open ends were joined.
 */
export function sliceMesh(pos: Float32Array, planes: number[]): SlicedLayer[] {
  const m = prepare(pos);
  const N = m.nv + 1;
  const out: SlicedLayer[] = [];
  let next = 0;
  let active: number[] = [];
  const nTri = m.order.length;
  for (const zmm of planes) {
    const zc = Math.floor(zmm * UNITS) + 0.5;
    while (next < nTri && m.zmin[m.order[next]] < zc) active.push(m.order[next++]);
    active = active.filter((t) => m.zmax[t] > zc);
    // segments: start on the edge going down through the plane, end on the edge going up
    const sx: number[] = [], sy: number[] = [], ex: number[] = [], ey: number[] = [], startKey: number[] = [], endKey: number[] = [];
    const point = (p: number, q: number): [number, number] => {
      // the same point from both triangles: computed from the lower vertex id
      const a = Math.min(p, q), b = Math.max(p, q);
      const t = (zc - m.vz[a]) / (m.vz[b] - m.vz[a]);
      return [m.vx[a] + (m.vx[b] - m.vx[a]) * t, m.vy[a] + (m.vy[b] - m.vy[a]) * t];
    };
    for (const t of active) {
      let down = -1, up = -1, dp = 0, dq = 0, up0 = 0, up1 = 0;
      for (let e = 0; e < 3; e++) {
        const p = m.tri[3 * t + e], q = m.tri[3 * t + ((e + 1) % 3)];
        const zp = m.vz[p], zq = m.vz[q];
        if (zp > zc && zq < zc) { down = Math.min(p, q) * N + Math.max(p, q); dp = p; dq = q; }
        else if (zp < zc && zq > zc) { up = Math.min(p, q) * N + Math.max(p, q); up0 = p; up1 = q; }
      }
      if (down < 0 || up < 0) continue;
      const [x, y] = point(dp, dq);
      const [x2, y2] = point(up0, up1);
      sx.push(x); sy.push(y); ex.push(x2); ey.push(y2); startKey.push(down); endKey.push(up);
    }
    out.push(chain(sx, sy, ex, ey, startKey, endKey));
  }
  return out;
}

/** the segments of one plane chained into loops (by edge key), open chains joined by distance */
function chain(sx: number[], sy: number[], ex: number[], ey: number[], startKey: number[], endKey: number[]): SlicedLayer {
  const n = sx.length;
  const byStart = new Map<number, number[]>();
  for (let i = 0; i < n; i++) { const l = byStart.get(startKey[i]); if (l) l.push(i); else byStart.set(startKey[i], [i]); }
  const used = new Uint8Array(n);
  const loops: Paths = [];
  const open: number[][] = [];
  for (let s = 0; s < n; s++) {
    if (used[s]) continue;
    const pts: number[] = [];
    let i = s, closed = false;
    for (;;) {
      used[i] = 1;
      pts.push(sx[i], sy[i]);
      const cand = byStart.get(endKey[i]);
      if (endKey[i] === startKey[s] && cand?.includes(s)) { closed = true; break; }
      const nxt = cand?.find((c) => !used[c]);
      if (nxt === undefined) break;
      i = nxt;
    }
    if (closed) { if (pts.length >= 6) loops.push(pts); } else open.push(pts);
  }
  // a mesh that is not watertight (T-junctions of a boolean, slivers): the chains through the mesh edges break off,
  // but the segments still close geometrically; their union (positive winding) gives the contours
  if (open.length) {
    const flat: number[] = [];
    for (let k = 0; k < n; k++) flat.push(sx[k], sy[k], ex[k], ey[k]);
    const contours = unionSegments(flat, UNITS * UNITS * 1e-4);
    // only gaps that stay open after joining the T-junctions count as repairs
    return { contours, repaired: openChains };
  }
  return { contours: loops.map((p) => p.map((v) => Math.round(v))), repaired: 0 };
}
