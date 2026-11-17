/**
 * Splits a sketch's equation system into independent parts (union-find over the parameters of each equation).
 *
 * Fixed parameters do not connect parts. A parameter p is "pinned" when an equation that depends on p alone is
 * linear with a non-zero slope (the origin, a Fix relation, a radius dimension): its Jacobian row is a unit
 * vector, so p drops out of every other row and the system is block diagonal around it. Each part that touches p
 * carries p as a column together with p's pin rows; the pinned parameters themselves form "pin parts" (connected
 * only by rows on pinned parameters alone), which are solved first.
 *
 * The status analysis per part equals the analysis of the whole system:
 * - rank(J) = sum(rank of pin parts) + sum(rank(part) - pinned columns of the part);
 * - a column is free in J exactly when it is free in its part (the null space is the direct sum of the parts');
 * - a row depends on the rows before it in J exactly when it does in its part, provided p's first pin row comes
 *   before every reported row that could combine with p. Hence p only counts as pinned when no row touches p
 *   before its first pin row, or when that pin row comes before every user relation (the origin: only internal
 *   arc rows come earlier).
 */
import type { Equation } from './equations';
import type { Part } from './lm';

export interface SharedPart extends Part {
  /** pinned parameters this part shares with other parts (each has its pin rows among `rows`) */
  pinned: number[];
}

export interface Partition {
  /** parts made of pinned parameters only (with the rows that touch nothing else) */
  pinParts: Part[];
  parts: SharedPart[];
  /** rows without parameters (constant residuals) */
  emptyRows: number[];
}

/**
 * @param eqs all rows: the first `nAnalysis` are the sketch's equations, the rest are solve-only rows (dragging)
 * @param joint one part with every row (the former whole-sketch behaviour)
 */
export function partition(eqs: Equation[], deps: number[][], nAnalysis: number, x: number[], n: number, joint = false): Partition {
  const emptyRows: number[] = [];
  for (let r = 0; r < eqs.length; r++) if (!deps[r].length) emptyRows.push(r);
  if (joint) {
    const rows: number[] = [], seen = new Uint8Array(n), cols: number[] = [];
    for (let r = 0; r < eqs.length; r++) {
      if (!deps[r].length) continue;
      rows.push(r);
      for (const c of deps[r]) {
        if (seen[c]) continue;
        seen[c] = 1;
        cols.push(c);
      }
    }
    return { pinParts: [], parts: rows.length ? [{ rows, cols, pinned: [] }] : [], emptyRows };
  }

  // pin rows: one parameter, linear, non-zero slope (tested with unit steps, exact for x - c)
  const pinRows = new Map<number, number[]>();
  const xs = x.slice();
  for (let r = 0; r < nAnalysis; r++) {
    if (deps[r].length !== 1) continue;
    const p = deps[r][0], f = eqs[r].f;
    const f0 = f(xs);
    xs[p] = x[p] + 1;
    const f1 = f(xs);
    xs[p] = x[p] - 1;
    const fm = f(xs);
    xs[p] = x[p];
    const d1 = f1 - f0, d2 = f0 - fm;
    if (!(Math.abs(d1) > 1e-9) || !(Math.abs(d1 - d2) <= 1e-9 * Math.max(1, Math.abs(d1)))) continue;
    const list = pinRows.get(p);
    if (list) list.push(r);
    else pinRows.set(p, [r]);
  }
  let firstReported = Infinity;
  for (let r = 0; r < nAnalysis; r++) {
    if (eqs[r].constraintId !== null) {
      firstReported = r;
      break;
    }
  }
  const firstTouch = new Map<number, number>();
  for (let r = 0; r < nAnalysis; r++) for (const c of deps[r]) if (!firstTouch.has(c)) firstTouch.set(c, r);
  const pinned = new Uint8Array(n);
  for (const [p, list] of pinRows) if (firstTouch.get(p) === list[0] || list[0] < firstReported) pinned[p] = 1;

  // union-find: rows join their free parameters; rows on pinned parameters only join those
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const anchor = (r: number) => {
    for (const c of deps[r]) if (!pinned[c]) return c;
    return -1;
  };
  for (let r = 0; r < eqs.length; r++) {
    const d = deps[r];
    if (!d.length) continue;
    const a = anchor(r);
    if (a < 0) for (const c of d) union(d[0], c);
    else for (const c of d) if (!pinned[c]) union(a, c);
  }

  const partOf = new Map<number, { rows: number[]; pins: Set<number> }>();
  const pinOf = new Map<number, number[]>();
  for (let r = 0; r < eqs.length; r++) {
    const d = deps[r];
    if (!d.length) continue;
    const a = anchor(r);
    if (a < 0) {
      const root = find(d[0]);
      const list = pinOf.get(root);
      if (list) list.push(r);
      else pinOf.set(root, [r]);
      continue;
    }
    const root = find(a);
    let g = partOf.get(root);
    if (!g) partOf.set(root, (g = { rows: [], pins: new Set() }));
    g.rows.push(r);
    for (const c of d) if (pinned[c]) g.pins.add(c);
  }
  const colsOf = (rows: number[]) => {
    const seen = new Set<number>(), cols: number[] = [];
    for (const r of rows) {
      for (const c of deps[r]) {
        if (seen.has(c)) continue;
        seen.add(c);
        cols.push(c);
      }
    }
    return cols;
  };
  const parts: SharedPart[] = [];
  for (const g of partOf.values()) {
    let rows = g.rows;
    if (g.pins.size) {
      const extra: number[] = [];
      for (const p of g.pins) extra.push(...(pinRows.get(p) as number[]));
      rows = [...rows, ...extra].sort((a, b) => a - b);
    }
    parts.push({ rows, cols: colsOf(rows), pinned: [...g.pins] });
  }
  const pinParts: Part[] = [...pinOf.values()].map((rows) => ({ rows, cols: colsOf(rows) }));
  return { pinParts, parts, emptyRows };
}
