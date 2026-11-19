/**
 * Simple closed test solids as triangle soups (mm, Z up, triangles facing out): the calibration cube and the test
 * pieces of docs/34 3.0. Used by the tests and by the calibration-cube command of the 3D Print tab.
 */
export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Float32Array {
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  // each face counter-clockwise seen from outside
  const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  const out: number[] = [];
  for (const [a, b, c, d] of quads) out.push(...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[d]);
  return Float32Array.from(out);
}

/** a cylinder (or, with rIn > 0, a tube) around a vertical axis */
export function cylinder(cx: number, cy: number, z0: number, r: number, h: number, n = 96, rIn = 0): Float32Array {
  const out: number[] = [];
  const z1 = z0 + h;
  const P = (rr: number, i: number, z: number) => [cx + rr * Math.cos((2 * Math.PI * i) / n), cy + rr * Math.sin((2 * Math.PI * i) / n), z];
  for (let i = 0; i < n; i++) {
    const j = i + 1;
    // outer wall
    out.push(...P(r, i, z0), ...P(r, j, z0), ...P(r, j, z1), ...P(r, i, z0), ...P(r, j, z1), ...P(r, i, z1));
    if (rIn > 0) {
      // inner wall faces the axis
      out.push(...P(rIn, i, z0), ...P(rIn, j, z1), ...P(rIn, j, z0), ...P(rIn, i, z0), ...P(rIn, i, z1), ...P(rIn, j, z1));
      // ring caps
      out.push(...P(r, i, z1), ...P(r, j, z1), ...P(rIn, j, z1), ...P(r, i, z1), ...P(rIn, j, z1), ...P(rIn, i, z1));
      out.push(...P(r, i, z0), ...P(rIn, j, z0), ...P(r, j, z0), ...P(r, i, z0), ...P(rIn, i, z0), ...P(rIn, j, z0));
    } else {
      out.push(cx, cy, z1, ...P(r, i, z1), ...P(r, j, z1));
      out.push(cx, cy, z0, ...P(r, j, z0), ...P(r, i, z0));
    }
  }
  return Float32Array.from(out);
}

/** a UV sphere (T3): `n` segments around, n / 2 from pole to pole */
export function sphere(cx: number, cy: number, cz: number, r: number, n = 96): Float32Array {
  const out: number[] = [];
  const m = n / 2;
  const P = (i: number, j: number) => {
    const th = (Math.PI * j) / m, ph = (2 * Math.PI * i) / n;
    return [cx + r * Math.sin(th) * Math.cos(ph), cy + r * Math.sin(th) * Math.sin(ph), cz - r * Math.cos(th)];
  };
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    if (j > 0) out.push(...a, ...b, ...c);
    if (j < m - 1) out.push(...a, ...c, ...d);
  }
  return Float32Array.from(out);
}

export const concat = (...parts: Float32Array[]): Float32Array => {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** the 20 mm calibration cube at (x, y) on the bed */
export const calibrationCube = (x = 0, y = 0, size = 20) => box(x, y, 0, x + size, y + size, size);

/** a T: a 10 x 10 stem 20 high carrying a 40 x 10 bar 5 thick (15 mm overhangs both sides) */
export const tPiece = (x = 0, y = 0) => concat(box(x + 15, y, 0, x + 25, y + 10, 20), box(x, y, 20, x + 40, y + 10, 25));

/** a box leaning over by `deg` from the horizontal on its +X side (an overhang test piece: docs/34 T5) */
export function leaningBox(x: number, y: number, deg: number, h = 10, w = 10, d = 10): Float32Array {
  const dx = h / Math.tan((deg * Math.PI) / 180);
  const v = [[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0], [x, y, h], [x + w + dx, y, h], [x + w + dx, y + d, h], [x, y + d, h]];
  const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  const out: number[] = [];
  for (const [a, b, c, e] of quads) out.push(...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[e]);
  return Float32Array.from(out);
}

/** two pillars carrying a slab: a bridge of `span` mm along X (docs/34 T6) */
export const bridgePiece = (x: number, y: number, span: number) => concat(box(x, y, 0, x + 10, y + 10, 10), box(x + 10 + span, y, 0, x + 20 + span, y + 10, 10), box(x, y, 10, x + 20 + span,
  y + 10, 12));
