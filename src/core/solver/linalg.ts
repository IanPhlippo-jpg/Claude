/**
 * Small dense linear-algebra helpers for the constraint solver.
 * Matrices are stored as number[][] (row-major). Sizes in a sketch are
 * small (hundreds of parameters), so dense is fine.
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
