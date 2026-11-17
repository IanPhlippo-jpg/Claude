/**
 * Linear-algebra helpers for the constraint solver.
 * Matrices are stored as number[][] (row-major). Sizes in a sketch are
 * small per group; the solver itself uses the sparse/flat helpers at the end.
 */

export type Matrix = number[][];

export function zeros(rows: number, cols: number): Matrix {
  const m: Matrix = new Array(rows);
  for (let i = 0; i < rows; i++) m[i] = new Array(cols).fill(0);
  return m;
}

export function transpose(a: Matrix): Matrix {
  const rows = a.length;
  const cols = rows ? a[0].length : 0;
  const t = zeros(cols, rows);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) t[j][i] = a[i][j];
  return t;
}

/** A^T * A */
export function ata(a: Matrix, n: number): Matrix {
  const out = zeros(n, n);
  for (const row of a) {
    for (let i = 0; i < n; i++) {
      const ri = row[i];
      if (ri === 0) continue;
      for (let j = i; j < n; j++) out[i][j] += ri * row[j];
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) out[i][j] = out[j][i];
  return out;
}

/** A^T * v */
export function atv(a: Matrix, v: number[], n: number): number[] {
  const out = new Array(n).fill(0);
  for (let r = 0; r < a.length; r++) {
    const row = a[r];
    const vr = v[r];
    if (vr === 0) continue;
    for (let i = 0; i < n; i++) out[i] += row[i] * vr;
  }
  return out;
}

/**
 * Solve the symmetric positive (semi)definite system A x = b with a
 * Cholesky factorisation. Returns null when A is not positive definite.
 */
export function solveSPD(a: Matrix, b: number[]): number[] | null {
  const n = b.length;
  const L = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (sum <= 0) return null;
        L[i][i] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }
  // forward substitution L y = b
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
    y[i] = sum / L[i][i];
  }
  // back substitution L^T x = y
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
    x[i] = sum / L[i][i];
  }
  return x;
}

export interface RrefResult {
  /** reduced matrix */
  r: Matrix;
  /** pivot column for each pivot row, in order */
  pivotCols: number[];
  /** indices of columns without a pivot (free variables) */
  freeCols: number[];
  rank: number;
}

/**
 * Reduced row echelon form with partial pivoting and a relative tolerance.
 * Used for rank / null-space analysis of the constraint Jacobian.
 */
export function rref(input: Matrix, tol = 1e-9): RrefResult {
  const r = input.map((row) => row.slice());
  const rows = r.length;
  const cols = rows ? r[0].length : 0;
  // scale tolerance relative to the largest entry
  let maxAbs = 0;
  for (const row of r) for (const v of row) maxAbs = Math.max(maxAbs, Math.abs(v));
  const eps = tol * Math.max(1, maxAbs);
  const pivotCols: number[] = [];
  let lead = 0;
  for (let c = 0; c < cols && lead < rows; c++) {
    // find pivot
    let best = lead;
    let bestAbs = Math.abs(r[lead][c]);
    for (let i = lead + 1; i < rows; i++) {
      const v = Math.abs(r[i][c]);
      if (v > bestAbs) {
        bestAbs = v;
        best = i;
      }
    }
    if (bestAbs <= eps) continue;
    [r[lead], r[best]] = [r[best], r[lead]];
    const pv = r[lead][c];
    for (let j = 0; j < cols; j++) r[lead][j] /= pv;
    for (let i = 0; i < rows; i++) {
      if (i === lead) continue;
      const f = r[i][c];
      if (f === 0) continue;
      for (let j = 0; j < cols; j++) r[i][j] -= f * r[lead][j];
    }
    pivotCols.push(c);
    lead++;
  }
  const pivotSet = new Set(pivotCols);
  const freeCols: number[] = [];
  for (let c = 0; c < cols; c++) if (!pivotSet.has(c)) freeCols.push(c);
  return { r, pivotCols, freeCols, rank: pivotCols.length };
}

/**
 * Returns, for every column (parameter), whether it is determined by the
 * row space of `j` (i.e. orthogonal to the null space). A parameter is free
 * when some null-space basis vector has a non-zero component on it.
 */
export function determinedParams(j: Matrix, n: number, tol = 1e-9): boolean[] {
  if (j.length === 0) return new Array(n).fill(false);
  const { r, pivotCols, freeCols } = rref(j, tol);
  const determined = new Array(n).fill(true);
  for (const f of freeCols) {
    determined[f] = false;
    // null-space vector for free column f: x_f = 1, x_pivot = -r[row][f]
    for (let row = 0; row < pivotCols.length; row++) {
      const v = r[row][f];
      if (Math.abs(v) > 1e-7) determined[pivotCols[row]] = false;
    }
  }
  return determined;
}

/**
 * Indices of rows of `j` that are linearly dependent on the others
 * (found as the free columns of rref(J^T)).
 */
export function dependentRows(j: Matrix, tol = 1e-9): number[] {
  if (j.length === 0) return [];
  const jt = transpose(j);
  return rref(jt, tol).freeCols;
}

/**
 * Cholesky solve of the symmetric positive definite m x m system A x = b, with A stored flat (row-major).
 * `first[i]` is the first column with a non-zero in row i (the envelope): the factor keeps that envelope, so
 * the work skips the zero blocks of loosely coupled systems. Returns null when A is not positive definite.
 */
export function choleskyFlat(a: Float64Array, m: number, b: ArrayLike<number>, first: Int32Array): Float64Array | null {
  const L = new Float64Array(m * m);
  for (let i = 0; i < m; i++) {
    const fi = first[i], ri = i * m;
    for (let j = fi; j <= i; j++) {
      const rj = j * m;
      let sum = a[ri + j];
      for (let k = Math.max(fi, first[j]); k < j; k++) sum -= L[ri + k] * L[rj + k];
      if (i === j) {
        if (!(sum > 0)) return null;
        L[ri + i] = Math.sqrt(sum);
      } else L[ri + j] = sum / L[rj + j];
    }
  }
  const y = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    let sum = b[i];
    for (let k = first[i]; k < i; k++) sum -= L[i * m + k] * y[k];
    y[i] = sum / L[i * m + i];
  }
  const x = new Float64Array(m);
  for (let i = m - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < m; k++) if (first[k] <= i) sum -= L[k * m + i] * x[k];
    x[i] = sum / L[i * m + i];
  }
  return x;
}

/** A sparse Jacobian row: unique column indices and their values. */
export interface SparseRow {
  idx: number[];
  val: number[];
}

export interface RowRank {
  rank: number;
  /** positions of the rows that depend on the rows before them */
  dependent: number[];
  /** per column: true when the rows fix the parameter (the column is orthogonal to the null space) */
  determined: boolean[];
}

/**
 * Second-order check of a row that is linearly dependent on the rows before it. `combo` writes the row's
 * normalised gradient as a combination of earlier normalised rows (positions and coefficients); `projectT` projects
 * a vector onto the null space of the earlier rows. Returns a direction in that null space which the row still
 * fixes at second order (a fold: e.g. a horizontal dimension to the end of a dimensioned line that is level at this
 * moment), or null when the row is truly redundant.
 */
export type FoldTest = (pos: number, combo: { pos: number[]; coef: number[] }, projectT: (v: Float64Array) => void) => Float64Array | null;

/**
 * Rank analysis of rows taken in order: a QR factorisation of J^T by Gram-Schmidt with reorthogonalisation
 * (CGS2) on normalised rows. Every row is scaled to unit length first, so angle rows (small gradients on long
 * lines) and length rows weigh the same, and the thresholds are relative:
 * - a row is dependent when less than `tol` of its unit length is left after removing its components along the
 *   independent rows before it (the same "later row is the redundant one" order as rref(J^T)), unless `fold`
 *   finds that it still fixes a direction at second order;
 * - a column j is determined when e_j lies in the row space: 1 - |projection of e_j|^2 <= `detTol`.
 * Rows shorter than `zeroRow` count as zero rows (dependent).
 */
export function rowRank(rows: SparseRow[], n: number, fold?: FoldTest, tol = 1e-7, detTol = 1e-11, zeroRow = 1e-10): RowRank {
  const basis: Float64Array[] = [];
  const supports: number[][] = [];
  // R of the QR factorisation: per basis vector its source row (-1 for a fold direction), the entries above the
  // diagonal (earlier basis index, value) and the diagonal
  const rowOf: number[] = [], rUp: [number, number][][] = [], rDiag: number[] = [];
  const dependent: number[] = [];
  const w = new Float64Array(n);
  const mark = new Int32Array(n);
  let stamp = 0;
  const project = (supp: number[], coef: Float64Array) => {
    for (let b = 0; b < basis.length; b++) {
      const c = coef[b];
      if (c === 0) continue;
      const q = basis[b];
      for (const i of supports[b]) {
        if (mark[i] !== stamp) {
          mark[i] = stamp;
          supp.push(i);
        }
        w[i] -= c * q[i];
      }
    }
  };
  const norm = (supp: number[]) => {
    let s = 0;
    for (const i of supp) s += w[i] * w[i];
    return Math.sqrt(s);
  };
  const projectT = (v: Float64Array) => {
    for (let pass = 0; pass < 2; pass++) {
      for (let b = 0; b < basis.length; b++) {
        const q = basis[b], sb = supports[b];
        let c = 0;
        for (const i of sb) c += q[i] * v[i];
        if (c !== 0) for (const i of sb) v[i] -= c * q[i];
      }
    }
  };
  const push = (q: Float64Array, qs: number[], row: number, up: [number, number][], diag: number) => {
    basis.push(q);
    supports.push(qs);
    rowOf.push(row);
    rUp.push(up);
    rDiag.push(diag);
  };
  /** the dependent row as a combination of earlier rows; null when it leans on a fold direction */
  const combination = (coef: Float64Array) => {
    const a = Float64Array.from(coef);
    const pos: number[] = [], lam: number[] = [];
    for (let b = basis.length - 1; b >= 0; b--) {
      if (a[b] === 0) continue;
      const l = a[b] / rDiag[b];
      if (rowOf[b] < 0) {
        if (Math.abs(l) > 1e-9) return null;
        continue;
      }
      pos.push(rowOf[b]);
      lam.push(l);
      for (const [b2, v] of rUp[b]) a[b2] -= l * v;
    }
    return { pos, coef: lam };
  };
  for (let r = 0; r < rows.length; r++) {
    const { idx, val } = rows[r];
    let nrm = 0;
    for (const v of val) nrm += v * v;
    nrm = Math.sqrt(nrm);
    if (!(nrm > zeroRow)) {
      dependent.push(r);
      continue;
    }
    stamp++;
    const supp: number[] = [];
    for (let k = 0; k < idx.length; k++) {
      w[idx[k]] = val[k] / nrm;
      mark[idx[k]] = stamp;
      supp.push(idx[k]);
    }
    // pass 1: coefficients against the (sparse) row itself
    const coef = new Float64Array(basis.length);
    for (let b = 0; b < basis.length; b++) {
      const q = basis[b];
      let c = 0;
      for (const i of idx) c += q[i] * w[i];
      coef[b] = c;
    }
    const total = Float64Array.from(coef);
    project(supp, coef);
    let res = norm(supp);
    if (res < 0.7) {
      // pass 2: a large cancellation loses orthogonality, project once more
      for (let b = 0; b < basis.length; b++) {
        const q = basis[b], sb = supports[b];
        let c = 0;
        if (sb.length < supp.length) for (const i of sb) c += q[i] * w[i];
        else for (const i of supp) c += q[i] * w[i];
        coef[b] = c;
        total[b] += c;
      }
      project(supp, coef);
      res = norm(supp);
    }
    if (res >= tol) {
      const q = new Float64Array(n);
      const qs: number[] = [];
      for (const i of supp) {
        if (w[i] === 0) continue;
        q[i] = w[i] / res;
        qs.push(i);
      }
      const up: [number, number][] = [];
      total.forEach((c, b) => {
        if (c !== 0) up.push([b, c]);
      });
      push(q, qs, r, up, res);
    } else {
      const combo = fold ? combination(total) : null;
      const dir = combo && fold ? fold(r, combo, projectT) : null;
      if (dir) {
        projectT(dir);
        let dn = 0;
        for (let i = 0; i < n; i++) dn += dir[i] * dir[i];
        dn = Math.sqrt(dn);
        if (dn > 0.5) {
          const qs: number[] = [];
          for (let i = 0; i < n; i++) {
            if (dir[i] === 0) continue;
            dir[i] /= dn;
            qs.push(i);
          }
          push(dir, qs, -1, [], 1);
        } else dependent.push(r);
      } else dependent.push(r);
    }
    for (const i of supp) w[i] = 0;
  }
  const s = new Float64Array(n);
  for (let b = 0; b < basis.length; b++) {
    const q = basis[b];
    for (const i of supports[b]) s[i] += q[i] * q[i];
  }
  const determined: boolean[] = new Array(n);
  for (let j = 0; j < n; j++) determined[j] = 1 - s[j] <= detTol;
  return { rank: basis.length, dependent, determined };
}
