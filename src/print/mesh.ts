/**
 * Mesh helpers for the plate and the slicer (pure TypeScript, no three.js): 4x4 matrices (column-major, as three.js),
 * transforms, bounds, volume, and the topology check that finds open and non-manifold edges (docs/34 2.2 step 3).
 */
export type Mat4 = number[];

export const identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}

export const translation = (x: number, y: number, z: number): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
export const scaling = (s: number): Mat4 => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];

/** rotation about a unit axis by an angle (radians) */
export function rotation(ax: number, ay: number, az: number, angle: number): Mat4 {
  const L = Math.hypot(ax, ay, az) || 1;
  const x = ax / L, y = ay / L, z = az / L, c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1];
}

/** the rotation that turns unit vector a onto unit vector b */
export function rotationBetween(a: [number, number, number], b: [number, number, number]): Mat4 {
  const [ax, ay, az] = a, [bx, by, bz] = b;
  const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  const s = Math.hypot(cx, cy, cz);
  if (s < 1e-12) {
    if (dot > 0) return identity();
    // opposite: any perpendicular axis
    const p: [number, number, number] = Math.abs(ax) < 0.9 ? [0, -az, ay] : [-az, 0, ax];
    return rotation(p[0], p[1], p[2], Math.PI);
  }
  return rotation(cx, cy, cz, Math.atan2(s, dot));
}

/** CAD (Y up) to printer (Z up): +90° about X, so the Top Plane of the part lies on the bed */
export const CAD_TO_PLATE: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];

export function transformPositions(pos: Float32Array | number[], m: Mat4): Float32Array {
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    out[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  }
  // a mirroring matrix turns the triangles inside out: swap two corners to keep them facing out
  const det = m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
  if (det < 0) {
    for (let i = 0; i < out.length; i += 9) for (let k = 0; k < 3; k++) { const t = out[i + 3 + k]; out[i + 3 + k] = out[i + 6 + k]; out[i + 6 + k] = t; }
  }
  return out;
}

export interface Bounds { min: [number, number, number]; max: [number, number, number] }
export function bounds(pos: Float32Array | number[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { const v = pos[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  return { min, max };
}

/** the signed volume (mm³): positive when the triangles face out */
export function signedVolume(pos: Float32Array | number[]): number {
  let v = 0;
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i], ay = pos[i + 1], az = pos[i + 2], bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5], cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v / 6;
}

/** the mesh with every triangle turned over (for a mesh whose normals point in) */
export function flipped(pos: Float32Array): Float32Array {
  const out = pos.slice();
  for (let i = 0; i < out.length; i += 9) for (let k = 0; k < 3; k++) { const t = out[i + 3 + k]; out[i + 3 + k] = out[i + 6 + k]; out[i + 6 + k] = t; }
  return out;
}

export interface Topology { triangles: number; degenerate: number; openEdges: number; nonManifoldEdges: number; volume: number }

/** welds the vertices on a 0.1 µm grid and counts the defects (docs/34 2.2 step 3) */
export function topology(pos: Float32Array | number[], grid = 1e4): Topology {
  const ids = new Map<string, number>();
  const vid = (i: number) => {
    const k = `${Math.round(pos[i] * grid)},${Math.round(pos[i + 1] * grid)},${Math.round(pos[i + 2] * grid)}`;
    let v = ids.get(k);
    if (v === undefined) ids.set(k, (v = ids.size));
    return v;
  };
  const tris: number[] = [];
  let degenerate = 0;
  for (let i = 0; i < pos.length; i += 9) {
    const a = vid(i), b = vid(i + 3), c = vid(i + 6);
    if (a === b || b === c || a === c) { degenerate++; continue; }
    tris.push(a, b, c);
  }
  const N = ids.size + 1;
  const count = new Map<number, number>();
  for (let t = 0; t < tris.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const p = tris[t + e], q = tris[t + ((e + 1) % 3)];
      const key = Math.min(p, q) * N + Math.max(p, q);
      count.set(key, (count.get(key) ?? 0) + 1);
    }
  }
  let openEdges = 0, nonManifoldEdges = 0;
  for (const c of count.values()) { if (c === 1) openEdges++; else if (c > 2) nonManifoldEdges++; }
  return { triangles: tris.length / 3, degenerate, openEdges, nonManifoldEdges, volume: signedVolume(pos) };
}
