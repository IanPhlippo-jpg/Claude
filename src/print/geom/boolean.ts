/**
 * Polygon booleans on an integer grid (docs/34 2.3), written for the slicer without a library:
 *
 *   1. all edges of both operands, intersections found with a uniform grid of buckets and exact orientation tests
 *   2. intersections rounded to the grid (snap rounding), edges split there; a second round catches the crossings the
 *      rounding made
 *   3. per unique edge the winding numbers of both operands just left and right of its midpoint (a ray to +X through a
 *      strip index of the edges)
 *   4. an edge stays when the fill rule differs on its two sides, turned so the filled side is on its left
 *   5. the edges chained into closed loops: at a vertex with several ways out the sharpest left turn wins, so loops that
 *      touch in a point come out as separate loops
 *
 * Fill rule: positive (winding > 0). Outer loops run counter-clockwise, holes clockwise. Coordinates are integers (the
 * grid of units.ts); a path is a flat array x0, y0, x1, y1, ... without the closing point.
 */
export type Path = number[];
export type Paths = Path[];
export type BoolOp = 'union' | 'intersection' | 'difference' | 'xor';

interface Seg { x0: number; y0: number; x1: number; y1: number; op: 0 | 1; fresh?: boolean }

const inside = (op: BoolOp, a: number, b: number) => {
  const ia = a > 0, ib = b > 0;
  return op === 'union' ? ia || ib : op === 'intersection' ? ia && ib : op === 'difference' ? ia && !ib : ia !== ib;
};

/** the signed area of a path (positive = counter-clockwise), in grid units² */
export function area(p: Path): number {
  let a = 0;
  const n = p.length;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 2) % n;
    a += p[i] * p[j + 1] - p[j] * p[i + 1];
  }
  return a / 2;
}

export const totalArea = (ps: Paths) => ps.reduce((s, p) => s + area(p), 0);

function collect(paths: Paths, op: 0 | 1, out: Seg[]) {
  for (const p of paths) {
    const n = p.length;
    if (n < 6) continue;
    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n;
      const x0 = Math.round(p[i]), y0 = Math.round(p[i + 1]), x1 = Math.round(p[j]), y1 = Math.round(p[j + 1]);
      if (x0 !== x1 || y0 !== y1) out.push({ x0, y0, x1, y1, op });
    }
  }
}

const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** splits the segments at their mutual intersections (snapped to the grid); returns the new list and whether it split */
function splitAll(segs: Seg[], onlyFresh: boolean): { segs: Seg[]; split: boolean } {
  const n = segs.length;
  if (n < 2) return { segs, split: false };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    minX = Math.min(minX, s.x0, s.x1); maxX = Math.max(maxX, s.x0, s.x1);
    minY = Math.min(minY, s.y0, s.y1); maxY = Math.max(maxY, s.y0, s.y1);
  }
  // cells about twice the mean segment length (dense clusters get small cells), at most 256 x 256
  let len = 0;
  for (const s of segs) len += Math.abs(s.x1 - s.x0) + Math.abs(s.y1 - s.y0);
  const size = Math.max(maxX - minX, maxY - minY) + 1;
  const g = Math.max(1, Math.min(256, Math.ceil(size / Math.max(1, (2 * len) / n)), Math.ceil(Math.sqrt(n) * 2)));
  const cw = Math.max(1, (maxX - minX + 1) / g), ch = Math.max(1, (maxY - minY + 1) / g);
  const cells: number[][] = Array.from({ length: g * g }, () => []);
  for (let i = 0; i < n; i++) {
    const s = segs[i];
    const cx0 = Math.min(g - 1, Math.floor((Math.min(s.x0, s.x1) - minX) / cw)), cx1 = Math.min(g - 1, Math.floor((Math.max(s.x0, s.x1) - minX) / cw));
    const cy0 = Math.min(g - 1, Math.floor((Math.min(s.y0, s.y1) - minY) / ch)), cy1 = Math.min(g - 1, Math.floor((Math.max(s.y0, s.y1) - minY) / ch));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) cells[cy * g + cx].push(i);
  }
  const cuts: number[][] = Array.from({ length: n }, () => []);
  const addCut = (i: number, x: number, y: number) => {
    const s = segs[i];
    if ((x === s.x0 && y === s.y0) || (x === s.x1 && y === s.y1)) return;
    cuts[i].push(x, y);
  };
  for (let ci = 0; ci < cells.length; ci++) {
    const cell = cells[ci];
    for (let a = 0; a < cell.length; a++) {
      for (let b = a + 1; b < cell.length; b++) {
        const i = Math.min(cell[a], cell[b]), j = Math.max(cell[a], cell[b]);
        const s = segs[i], t = segs[j];
        if (onlyFresh && !s.fresh && !t.fresh) continue;
        if (Math.max(s.x0, s.x1) < Math.min(t.x0, t.x1) || Math.max(t.x0, t.x1) < Math.min(s.x0, s.x1)) continue;
        if (Math.max(s.y0, s.y1) < Math.min(t.y0, t.y1) || Math.max(t.y0, t.y1) < Math.min(s.y0, s.y1)) continue;
        // each pair once: in the cell of the lower-left corner of the overlap of their boxes
        const ox = Math.max(Math.min(s.x0, s.x1), Math.min(t.x0, t.x1)), oy = Math.max(Math.min(s.y0, s.y1), Math.min(t.y0, t.y1));
        if (Math.min(g - 1, Math.floor((oy - minY) / ch)) * g + Math.min(g - 1, Math.floor((ox - minX) / cw)) !== ci) continue;
        const d1 = orient(s.x0, s.y0, s.x1, s.y1, t.x0, t.y0), d2 = orient(s.x0, s.y0, s.x1, s.y1, t.x1, t.y1);
        const d3 = orient(t.x0, t.y0, t.x1, t.y1, s.x0, s.y0), d4 = orient(t.x0, t.y0, t.x1, t.y1, s.x1, s.y1);
        if (d1 === 0 && d2 === 0) {
          // collinear: the end points of each that lie inside the other split it
          const on = (px: number, py: number, q: Seg) => Math.min(q.x0, q.x1) <= px && px <= Math.max(q.x0, q.x1) && Math.min(q.y0, q.y1) <= py && py <= Math.max(q.y0, q.y1);
          if (on(t.x0, t.y0, s)) addCut(i, t.x0, t.y0);
          if (on(t.x1, t.y1, s)) addCut(i, t.x1, t.y1);
          if (on(s.x0, s.y0, t)) addCut(j, s.x0, s.y0);
          if (on(s.x1, s.y1, t)) addCut(j, s.x1, s.y1);
          continue;
        }
        if ((d1 > 0 && d2 > 0) || (d1 < 0 && d2 < 0) || (d3 > 0 && d4 > 0) || (d3 < 0 && d4 < 0)) continue;
        // a T or an X: the point on both, rounded to the grid
        let x: number, y: number;
        if (d1 === 0) { x = t.x0; y = t.y0; } else if (d2 === 0) { x = t.x1; y = t.y1; } else if (d3 === 0) { x = s.x0; y = s.y0; } else if (d4 === 0) { x = s.x1; y = s.y1; } else {
          const r = d3 / (d3 - d4);
          x = Math.round(s.x0 + (s.x1 - s.x0) * r); y = Math.round(s.y0 + (s.y1 - s.y0) * r);
        }
        addCut(i, x, y);
        addCut(j, x, y);
      }
    }
  }
  let split = false;
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const s = segs[i], c = cuts[i];
    if (!c.length) { out.push(s.fresh ? { ...s, fresh: false } : s); continue; }
    split = true;
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L = dx * dx + dy * dy;
    const pts: { t: number; x: number; y: number }[] = [];
    for (let k = 0; k < c.length; k += 2) pts.push({ t: ((c[k] - s.x0) * dx + (c[k + 1] - s.y0) * dy) / L, x: c[k], y: c[k + 1] });
    pts.sort((a, b) => a.t - b.t);
    let px = s.x0, py = s.y0;
    for (const p of pts) {
      if (p.x === px && p.y === py) continue;
      out.push({ x0: px, y0: py, x1: p.x, y1: p.y, op: s.op, fresh: true });
      px = p.x; py = p.y;
    }
    if (px !== s.x1 || py !== s.y1) out.push({ x0: px, y0: py, x1: s.x1, y1: s.y1, op: s.op, fresh: true });
  }
  return { segs: out, split };
}

/** winding numbers of both operands at a point, through a strip index over Y */
class Winding {
  private strips: number[][];
  private y0: number;
  private sh: number;
  constructor(private segs: Seg[]) {
    let minY = Infinity, maxY = -Infinity;
    for (const s of segs) { minY = Math.min(minY, s.y0, s.y1); maxY = Math.max(maxY, s.y0, s.y1); }
    const k = Math.max(1, Math.min(2048, Math.ceil(segs.length / 4)));
    this.y0 = minY;
    this.sh = Math.max(1e-9, (maxY - minY) / k);
    this.strips = Array.from({ length: k }, () => []);
    segs.forEach((s, i) => {
      if (s.y0 === s.y1) return;
      const a = Math.max(0, Math.min(k - 1, Math.floor((Math.min(s.y0, s.y1) - minY) / this.sh)));
      const b = Math.max(0, Math.min(k - 1, Math.floor((Math.max(s.y0, s.y1) - minY) / this.sh)));
      for (let q = a; q <= b; q++) this.strips[q].push(i);
    });
  }
  at(px: number, py: number): [number, number] {
    const q = Math.floor((py - this.y0) / this.sh);
    if (q < 0 || q >= this.strips.length) return [0, 0];
    let wa = 0, wb = 0;
    for (const i of this.strips[q]) {
      const s = this.segs[i];
      let w = 0;
      if (s.y0 <= py && py < s.y1) w = 1;
      else if (s.y1 <= py && py < s.y0) w = -1;
      else continue;
      const x = s.x0 + ((py - s.y0) * (s.x1 - s.x0)) / (s.y1 - s.y0);
      if (x > px) { if (s.op === 0) wa += w; else wb += w; }
    }
    return [wa, wb];
  }
}

/** how many chains of the last boolean did not close (a gap in the input: the loop was closed straight) */
export let openChains = 0;

/** the edges kept by the rule, chained to closed loops (filled side left) */
function chain(edges: number[]): Paths {
  openChains = 0;
  // edges: flat x0, y0, x1, y1 per kept edge
  const m = edges.length / 4;
  const out = new Map<string, number[]>();
  for (let e = 0; e < m; e++) {
    const k = `${edges[4 * e]},${edges[4 * e + 1]}`;
    const l = out.get(k);
    if (l) l.push(e); else out.set(k, [e]);
  }
  const used = new Uint8Array(m);
  const loops: Paths = [];
  for (let start = 0; start < m; start++) {
    if (used[start]) continue;
    const path: number[] = [];
    let e = start;
    const sx = edges[4 * start], sy = edges[4 * start + 1];
    for (let guard = 0; guard <= m; guard++) {
      used[e] = 1;
      path.push(edges[4 * e], edges[4 * e + 1]);
      const ex = edges[4 * e + 2], ey = edges[4 * e + 3];
      if (ex === sx && ey === sy) break;
      const cand = out.get(`${ex},${ey}`);
      if (!cand) { openChains++; break; }
      const dx = ex - edges[4 * e], dy = ey - edges[4 * e + 1];
      let best = -1, bestTurn = -Infinity;
      for (const c of cand) {
        if (used[c]) continue;
        const ox = edges[4 * c + 2] - ex, oy = edges[4 * c + 3] - ey;
        const turn = Math.atan2(dx * oy - dy * ox, dx * ox + dy * oy);
        if (turn > bestTurn) { bestTurn = turn; best = c; }
      }
      if (best < 0) { openChains++; break; }
      e = best;
    }
    if (path.length >= 6) loops.push(path);
  }
  return loops;
}

/** removes repeated and collinear points */
export function cleanPath(p: Path, tol = 0): Path {
  let pts = p.slice();
  for (let pass = 0; pass < 3; pass++) {
    const n = pts.length / 2;
    if (n < 3) return [];
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const ax = pts[((i + n - 1) % n) * 2], ay = pts[((i + n - 1) % n) * 2 + 1];
      const bx = pts[i * 2], by = pts[i * 2 + 1];
      const cx = pts[((i + 1) % n) * 2], cy = pts[((i + 1) % n) * 2 + 1];
      if (bx === cx && by === cy) continue;
      const cr = orient(ax, ay, bx, by, cx, cy);
      const L = Math.hypot(cx - ax, cy - ay);
      if (Math.abs(cr) <= tol * L && (bx - ax) * (cx - bx) + (by - ay) * (cy - by) >= 0) continue;
      out.push(bx, by);
    }
    if (out.length === pts.length) return out.length >= 6 ? out : [];
    pts = out;
  }
  return pts.length >= 6 ? pts : [];
}

/** the boolean of A and B with the positive fill rule; loops smaller than `minArea` (units²) are dropped */
export function boolean(a: Paths, b: Paths, op: BoolOp, minArea = 1): Paths {
  const segs: Seg[] = [];
  collect(a, 0, segs);
  collect(b, 1, segs);
  return resolve(segs, op, minArea);
}

/**
 * The union (positive rule) of loose directed segments, flat x0, y0, x1, y1: for the contours of a mesh that is not
 * watertight (T-junctions, slivers), where the segments do close geometrically but not through the mesh edges.
 */
export function unionSegments(flat: number[], minArea = 1, snap = 200): Paths {
  // end points closer than `snap` units become one point: the two sides of a T-junction meet the plane up to a few
  // micrometres apart (float32 coordinates), which would leave the loops open
  const cells = new Map<string, number[]>();
  const at = (x: number, y: number): [number, number] => {
    const cx = Math.floor(x / snap), cy = Math.floor(y / snap);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const l = cells.get(`${cx + dx},${cy + dy}`);
      if (l) for (let i = 0; i < l.length; i += 2) if (Math.abs(l[i] - x) <= snap && Math.abs(l[i + 1] - y) <= snap) return [l[i], l[i + 1]];
    }
    const rx = Math.round(x), ry = Math.round(y), k = `${cx},${cy}`;
    const l = cells.get(k);
    if (l) l.push(rx, ry); else cells.set(k, [rx, ry]);
    return [rx, ry];
  };
  const segs: Seg[] = [];
  for (let i = 0; i + 3 < flat.length; i += 4) {
    const [x0, y0] = at(flat[i], flat[i + 1]), [x1, y1] = at(flat[i + 2], flat[i + 3]);
    if (x0 !== x1 || y0 !== y1) segs.push({ x0, y0, x1, y1, op: 0 });
  }
  return resolve(segs, 'union', minArea);
}

function resolve(segs: Seg[], op: BoolOp, minArea: number): Paths {
  if (!segs.length) return [];
  for (let round = 0; round < 3; round++) {
    const r = splitAll(segs, round > 0);
    segs = r.segs;
    if (!r.split) break;
  }
  const wind = new Winding(segs);
  const seen = new Set<string>();
  const kept: number[] = [];
  for (const s of segs) {
    const key = s.x0 < s.x1 || (s.x0 === s.x1 && s.y0 < s.y1) ? `${s.x0},${s.y0},${s.x1},${s.y1}` : `${s.x1},${s.y1},${s.x0},${s.y0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2;
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L = Math.hypot(dx, dy);
    // a point a quarter unit to each side (an odd fraction, so the ray seldom meets a vertex exactly)
    const ox = (-dy / L) * 0.273, oy = (dx / L) * 0.273;
    const [la, lb] = wind.at(mx + ox, my + oy);
    const [ra, rb] = wind.at(mx - ox, my - oy);
    const li = inside(op, la, lb), ri = inside(op, ra, rb);
    if (li === ri) continue;
    if (li) kept.push(s.x0, s.y0, s.x1, s.y1);
    else kept.push(s.x1, s.y1, s.x0, s.y0);
  }
  return chain(kept).map((p) => cleanPath(p)).filter((p) => p.length >= 6 && Math.abs(area(p)) >= minArea);
}

export const union = (a: Paths, b: Paths = []) => boolean(a, b, 'union');
export const intersection = (a: Paths, b: Paths) => (a.length && b.length ? boolean(a, b, 'intersection') : []);
export const difference = (a: Paths, b: Paths) => (!a.length ? [] : !b.length ? boolean(a, [], 'union') : boolean(a, b, 'difference'));

/** point in region by the positive winding rule */
export function contains(region: Paths, x: number, y: number): boolean {
  let w = 0;
  for (const p of region) {
    const n = p.length;
    for (let i = 0; i < n; i += 2) {
      const j = (i + 2) % n;
      const y0 = p[i + 1], y1 = p[j + 1];
      if (y0 <= y && y < y1) { if (p[i] + ((y - y0) * (p[j] - p[i])) / (y1 - y0) > x) w++; } else if (y1 <= y && y < y0) { if (p[i] + ((y - y0) * (p[j] - p[i])) / (y1 - y0) > x) w--; }
    }
  }
  return w > 0;
}
