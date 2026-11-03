/**
 * Relations of the lines of a 3D sketch: Along X, Along Y and Along Z (the line parallel to that axis of the model).
 * A relation ties the two coordinates across the axis of both end points of its line (Along Z: x and y the same), so
 * the relations are solved exactly per coordinate: the end points tied together, over lines and the points lines
 * share, move as one in that coordinate. Dragging an end point (or typing its coordinates) moves every point tied to
 * it in the tied coordinates; the free coordinate stays where it was.
 */

export type P3 = [number, number, number];
export type Seg3 = [P3, P3];
export type Along = 'alongX' | 'alongY' | 'alongZ';
export interface Relation3D {
  kind: Along;
  /** index of the line in the sketch's segments */
  line: number;
}

export const ALONG: Along[] = ['alongX', 'alongY', 'alongZ'];
export const alongLabel = (k: Along) => ({ alongX: 'Along X', alongY: 'Along Y', alongZ: 'Along Z' })[k];
const AXIS: Record<Along, number> = { alongX: 0, alongY: 1, alongZ: 2 };
const TOL = 1e-6;
const same = (p: P3, q: P3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < TOL;

/** the AlongX/Y/Z relation a line already meets (both cross coordinates equal), or null */
export function alongOf(seg: Seg3): Along | null {
  const d = [0, 1, 2].map((k) => Math.abs(seg[1][k] - seg[0][k]));
  for (const k of ALONG) {
    const a = AXIS[k];
    if (d[a] > TOL && d.every((v, i) => i === a || v < TOL)) return k;
  }
  return null;
}

/** the relations of a line */
export const relationsOfLine = (rels: Relation3D[] | undefined, line: number) => (rels ?? []).filter((r) => r.line === line);

/**
 * The end points as shared points (lines that end in one point share it) and, per coordinate, the group each point
 * is tied to by the relations.
 */
function structure(segs: Seg3[], rels: Relation3D[]) {
  const pts: P3[] = [];
  const at = (p: P3) => {
    let i = pts.findIndex((q) => same(p, q));
    if (i < 0) i = pts.push([...p] as P3) - 1;
    return i;
  };
  const ends = segs.map((s) => [at(s[0]), at(s[1])] as [number, number]);
  const groups = [0, 1, 2].map(() => pts.map((_, i) => i));
  const find = (g: number[], i: number): number => (g[i] === i ? i : (g[i] = find(g, g[i])));
  for (const r of rels) {
    const e = ends[r.line];
    if (!e) continue;
    for (let k = 0; k < 3; k++) if (k !== AXIS[r.kind]) groups[k][find(groups[k], e[0])] = find(groups[k], e[1]);
  }
  const groupOf = (k: number, i: number) => find(groups[k], i);
  return { pts, ends, groupOf };
}

/** what drag3DPoint gives back: the lines and where any former point (a fillet corner, the last point) went */
export interface Moved3D {
  segments: Seg3[];
  map: (p: P3) => P3;
}

/**
 * The end point at `from` dragged to `to`: every line ending there follows, and the relations hold: the points tied to
 * it in a coordinate take that coordinate of `to`. With from = to it settles the relations around that point.
 */
export function drag3DPoint(segs: Seg3[], rels: Relation3D[] | undefined, from: P3, to: P3): Moved3D {
  const { pts, ends, groupOf } = structure(segs, rels ?? []);
  const i = pts.findIndex((q) => same(from, q));
  if (i < 0) return { segments: segs, map: (p) => p };
  const next = pts.map((p, j) => p.map((v, k) => (groupOf(k, j) === groupOf(k, i) ? to[k] : v)) as P3);
  const map = (p: P3): P3 => {
    const j = pts.findIndex((q) => same(p, q));
    return j < 0 ? p : ([...next[j]] as P3);
  };
  return { segments: ends.map(([a, b]) => [[...next[a]], [...next[b]]] as Seg3), map };
}

/**
 * A relation added to a line (a line has at most one AlongX/Y/Z relation; the new one replaces the old one): the
 * line's start point holds and its end point, with everything tied to it, comes onto the axis through the start.
 */
export function addAlong(segs: Seg3[], rels: Relation3D[] | undefined, line: number, kind: Along): { segments: Seg3[]; relations: Relation3D[]; map: (p: P3) => P3 } {
  const relations = [...(rels ?? []).filter((r) => r.line !== line), { kind, line }];
  const [a, b] = segs[line];
  const to = [...b] as P3;
  for (let k = 0; k < 3; k++) if (k !== AXIS[kind]) to[k] = a[k];
  const moved = drag3DPoint(segs, relations, b, to);
  return { segments: moved.segments, relations, map: moved.map };
}

/** the relations that still hold after the last line is removed (Undo last line) */
export const withoutLine = (rels: Relation3D[] | undefined, line: number) => (rels ?? []).filter((r) => r.line !== line).map((r) => (r.line > line ? { ...r, line: r.line - 1 } : r));

// ---- dimensions of a 3D sketch: the length of a line and the distance between two end points

/** an end point of a line: [line index, 0 = start / 1 = end] */
export type End3D = [number, 0 | 1];
export type Dim3D = { kind: 'length'; line: number; value: number } | { kind: 'distance'; a: End3D; b: End3D; value: number };
/** Under / Fully / Over Defined, as a 2D sketch reports it ('conflict': the dimensions and relations cannot all hold) */
export type Status3D = 'under' | 'full' | 'over' | 'conflict';
export interface Solved3D extends Moved3D {
  ok: boolean;
  status: Status3D;
  /** degrees of freedom left (end points not on the origin, minus the independent relations and dimensions) */
  dof: number;
}

const ORIGIN: P3 = [0, 0, 0];
const dist = (p: P3, q: P3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
type Eq = (x: number[]) => { f: number; g: [number, number][] };

/** the equations of the relations and dimensions over the point coordinates (x[3i + k]): value and gradient */
function equations(ends: [number, number][], rels: Relation3D[], dims: Dim3D[]): Eq[] {
  const eqs: Eq[] = [];
  for (const r of rels) {
    const e = ends[r.line];
    if (!e) continue;
    for (let k = 0; k < 3; k++) if (k !== AXIS[r.kind]) eqs.push((x) => ({ f: x[e[0] * 3 + k] - x[e[1] * 3 + k], g: [[e[0] * 3 + k, 1], [e[1] * 3 + k, -1]] }));
  }
  const between = (i: number, j: number, v: number): Eq => (x) => {
    const d = [0, 1, 2].map((k) => x[i * 3 + k] - x[j * 3 + k]);
    const L = Math.hypot(d[0], d[1], d[2]) || 1e-12;
    return { f: L - v, g: [0, 1, 2].flatMap((k) => [[i * 3 + k, d[k] / L], [j * 3 + k, -d[k] / L]] as [number, number][]) };
  };
  for (const d of dims) {
    if (d.kind === 'length') {
      const e = ends[d.line];
      if (e) eqs.push(between(e[0], e[1], d.value));
    } else {
      const a = ends[d.a[0]]?.[d.a[1]], b = ends[d.b[0]]?.[d.b[1]];
      if (a !== undefined && b !== undefined) eqs.push(between(a, b, d.value));
    }
  }
  return eqs;
}

/** the number of independent rows of a dense matrix (reduced in place) */
function rank(rows: number[][]): number {
  let r = 0;
  const n = rows[0]?.length ?? 0;
  for (let c = 0; c < n && r < rows.length; c++) {
    let best = r;
    for (let i = r + 1; i < rows.length; i++) if (Math.abs(rows[i][c]) > Math.abs(rows[best][c])) best = i;
    if (Math.abs(rows[best][c]) < 1e-9) continue;
    [rows[r], rows[best]] = [rows[best], rows[r]];
    for (let i = r + 1; i < rows.length; i++) {
      const f = rows[i][c] / rows[r][c];
      if (f) for (let k = c; k < n; k++) rows[i][k] -= f * rows[r][k];
    }
    r++;
  }
  return r;
}

/** A y = b for a small square system (Gaussian elimination with pivoting) */
function linSolve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[best][c])) best = i;
    [M[c], M[best]] = [M[best], M[c]];
    const p = M[c][c] || 1e-12;
    for (let i = c + 1; i < n; i++) {
      const f = M[i][c] / p;
      if (f) for (let k = c; k <= n; k++) M[i][k] -= f * M[c][k];
    }
  }
  const y = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let k = i + 1; k < n; k++) s -= M[i][k] * y[k];
    y[i] = s / (M[i][i] || 1e-12);
  }
  return y;
}

const residual = (eqs: Eq[], x: number[]) => Math.hypot(...eqs.map((q) => q(x).f), 0);

/** Newton steps of least change (minimum norm) until every equation holds; the fixed points do not move */
function newton(x0: number[], eqs: Eq[], fixed: Set<number>): { x: number[]; ok: boolean } {
  const x = [...x0];
  for (let it = 0; it < 60; it++) {
    const ev = eqs.map((q) => q(x));
    if (Math.hypot(...ev.map((e) => e.f), 0) < 1e-10) return { x, ok: true };
    const rows = ev.map((e) => e.g.filter(([v]) => !fixed.has(Math.floor(v / 3))));
    const A = rows.map((ri) => rows.map((rj) => ri.reduce((s, [v, a]) => s + a * (rj.find(([w]) => w === v)?.[1] ?? 0), 0)));
    A.forEach((row, i) => (row[i] += 1e-10));
    const y = linSolve(A, ev.map((e) => -e.f));
    rows.forEach((ri, i) => ri.forEach(([v, a]) => (x[v] += a * y[i])));
  }
  return { x, ok: residual(eqs, x) < 1e-7 };
}

/** status and degrees of freedom at the points `x` (the fixed points do not count) */
function statusOf(x: number[], eqs: Eq[], fixed: Set<number>, ok: boolean): { status: Status3D; dof: number } {
  const vars = [...Array(x.length / 3).keys()].filter((i) => !fixed.has(i)).flatMap((i) => [i * 3, i * 3 + 1, i * 3 + 2]);
  const col = new Map(vars.map((v, i) => [v, i]));
  const J = eqs.map((q) => {
    const row = new Array(vars.length).fill(0);
    for (const [v, a] of q(x).g) if (col.has(v)) row[col.get(v)!] += a;
    return row;
  });
  const rk = J.length && vars.length ? rank(J) : 0;
  const dof = vars.length - rk;
  if (!ok) return { status: 'conflict', dof };
  return { status: eqs.length > rk ? 'over' : dof === 0 ? 'full' : 'under', dof };
}

/**
 * The 3D sketch solved with its relations and dimensions. With `drag`, the end point at `from` goes to `to` (the
 * points tied to it by the relations follow, the dimensions hold); a drag the dimensions do not allow leaves the point
 * where they let it go or, failing that, the sketch as it was (ok false). End points on the origin stay there
 * (coincident with the origin), except the one dragged away from it.
 */
export function solve3D(segs: Seg3[], rels: Relation3D[] | undefined, dims: Dim3D[] | undefined, drag?: { from: P3; to: P3 }): Solved3D {
  const { pts, ends } = structure(segs, rels ?? []);
  const eqs = equations(ends, rels ?? [], dims ?? []);
  const di = drag ? pts.findIndex((q) => same(drag.from, q)) : -1;
  const onOrigin = new Set(pts.map((p, i) => (same(p, ORIGIN) && i !== di ? i : -1)).filter((i) => i >= 0));
  let start = pts;
  if (drag && di >= 0) {
    const moved = drag3DPoint(segs, rels, drag.from, drag.to);
    start = pts.map((p, i) => (onOrigin.has(i) ? ([...ORIGIN] as P3) : moved.map(p)));
  }
  const x0 = start.flat();
  const pinned = di >= 0 ? new Set([...onOrigin, di]) : onOrigin;
  let r = newton(x0, eqs, pinned);
  // a start where a dimension has no gradient (a symmetric position) is nudged once before the drag gives way
  if (!r.ok) r = newton(x0.map((v, i) => (pinned.has(Math.floor(i / 3)) ? v : v + 1e-3 * Math.sin(i + 1))), eqs, pinned);
  if (!r.ok && di >= 0) r = newton(x0, eqs, onOrigin);
  // a drag that cannot be met at all leaves the sketch as it was
  const x = !r.ok && di >= 0 ? pts.flat() : r.x;
  const next = pts.map((_, i) => [x[i * 3], x[i * 3 + 1], x[i * 3 + 2]] as P3);
  const map = (p: P3): P3 => {
    const j = pts.findIndex((q) => same(p, q));
    return j < 0 ? p : ([...next[j]] as P3);
  };
  return { segments: ends.map(([a, b]) => [[...next[a]], [...next[b]]] as Seg3), map, ok: r.ok, ...statusOf(x, eqs, onOrigin, residual(eqs, x) < 1e-7) };
}

/** the definition status of a 3D sketch (an empty one is under defined) */
export const status3D = (segs: Seg3[], rels: Relation3D[] | undefined, dims: Dim3D[] | undefined): Status3D => (segs.length ? solve3D(segs, rels, dims).status : 'under');

/** the value a dimension measures on the lines as they are */
export function measure3D(segs: Seg3[], d: Dim3D): number {
  if (d.kind === 'length') return segs[d.line] ? dist(segs[d.line][0], segs[d.line][1]) : 0;
  const a = segs[d.a[0]]?.[d.a[1]], b = segs[d.b[0]]?.[d.b[1]];
  return a && b ? dist(a, b) : 0;
}

/** the dimensions that still hold after the last line is removed (Undo last line) */
export const dimsWithoutLine = (dims: Dim3D[] | undefined, line: number): Dim3D[] =>
  (dims ?? []).filter((d) => (d.kind === 'length' ? d.line !== line : d.a[0] !== line && d.b[0] !== line)).map((d) => {
    const f = (i: number) => (i > line ? i - 1 : i);
    return d.kind === 'length' ? { ...d, line: f(d.line) } : { ...d, a: [f(d.a[0]), d.a[1]] as End3D, b: [f(d.b[0]), d.b[1]] as End3D };
  });

/** the end points of the lines, each once (named by the first line end that lies there), for the distance dimension */
export function endPoints3D(segs: Seg3[]): { ref: End3D; p: P3 }[] {
  const out: { ref: End3D; p: P3 }[] = [];
  segs.forEach((s, i) => ([0, 1] as const).forEach((k) => { if (!out.some((o) => same(o.p, s[k]))) out.push({ ref: [i, k], p: s[k] }); }));
  return out;
}
