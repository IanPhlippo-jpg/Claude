/**
 * A small software renderer for the plate thumbnails (no WebGL: it runs in the slice worker and under Node). An
 * orthographic view from the front right above, a depth buffer, flat Lambert shading; the background stays transparent.
 */
export interface RenderMesh { positions: Float32Array; color: string }

const hex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const v = m ? parseInt(m[1], 16) : 0xd0d0d0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

export function renderThumbnail(meshes: RenderMesh[], width: number, height: number, background?: string): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  if (background) { const [r, g, b] = hex(background); for (let i = 0; i < width * height; i++) rgba.set([r, g, b, 255], i * 4); }
  // view basis: looking from (1, -1.3, 1.1) towards the origin
  const d = norm([-1, 1.3, -1.1]);
  const r = norm(cross(d, [0, 0, 1]));
  const u = cross(r, d);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const m of meshes) for (let i = 0; i < m.positions.length; i += 3) {
    const p = [m.positions[i], m.positions[i + 1], m.positions[i + 2]];
    const sx = dot(p, r), sy = dot(p, u);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  if (!Number.isFinite(x0)) return rgba;
  const scale = (Math.min(width, height) * 0.86) / Math.max(x1 - x0, y1 - y0, 1e-6);
  const ox = width / 2 - ((x0 + x1) / 2) * scale, oy = height / 2 + ((y0 + y1) / 2) * scale;
  const depth = new Float32Array(width * height).fill(Infinity);
  const light = norm([0.4, -0.6, 0.9]);
  for (const m of meshes) {
    const [cr, cg, cb] = hex(m.color);
    const P = m.positions;
    for (let i = 0; i + 8 < P.length; i += 9) {
      const a = [P[i], P[i + 1], P[i + 2]], b = [P[i + 3], P[i + 4], P[i + 5]], c = [P[i + 6], P[i + 7], P[i + 8]];
      const n = norm(cross(sub(b, a), sub(c, a)));
      if (dot(n, d) > 0) continue;
      const shade = 0.35 + 0.65 * Math.max(0, dot(n, light));
      const col = [Math.min(255, cr * shade + 20), Math.min(255, cg * shade + 20), Math.min(255, cb * shade + 20)];
      const pts = [a, b, c].map((p) => [ox + dot(p, r) * scale, oy - dot(p, u) * scale, dot(p, d)]);
      fill(pts, col);
    }
  }
  return rgba;

  function fill(p: number[][], col: number[]) {
    const minX = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0]))), maxX = Math.min(width - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1]))), maxY = Math.min(height - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])));
    const area = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1]);
    if (Math.abs(area) < 1e-9) return;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((p[1][0] - px) * (p[2][1] - py) - (p[2][0] - px) * (p[1][1] - py)) / area;
      const w1 = ((p[2][0] - px) * (p[0][1] - py) - (p[0][0] - px) * (p[2][1] - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const z = w0 * p[0][2] + w1 * p[1][2] + w2 * p[2][2];
      const k = y * width + x;
      if (z >= depth[k]) continue;
      depth[k] = z;
      rgba[k * 4] = col[0]; rgba[k * 4 + 1] = col[1]; rgba[k * 4 + 2] = col[2]; rgba[k * 4 + 3] = 255;
    }
  }
}

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: number[]) => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
