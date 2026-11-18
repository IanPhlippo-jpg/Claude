/**
 * The triangle mesh of the layer preview, built in the slice worker (docs/35 P2-10: not on the window's thread): every
 * segment a bead with a rounded-rectangle look (top and two sides, normals tilted at the edges), 8 vertices and 18
 * indices, in print order. The window only fills the colours (one pass) and, when a line type is hidden, an index list.
 */
import { SEG_STRIDE, type PreviewData, type PreviewMeshData } from './types';

export const VERTS_PER_SEG = 8;
export const IDX_PER_SEG = 18;
const FACES = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 3, 0, 4, 3, 4, 7];

export function previewMesh(p: PreviewData): PreviewMeshData {
  const n = p.segs.length / SEG_STRIDE;
  const positions = new Float32Array(n * VERTS_PER_SEG * 3);
  const normals = new Int8Array(n * VERTS_PER_SEG * 3);
  const index = new Uint32Array(n * IDX_PER_SEG);
  for (let k = 0; k < n; k++) {
    const o = k * SEG_STRIDE;
    const x0 = p.segs[o], y0 = p.segs[o + 1], x1 = p.segs[o + 2], y1 = p.segs[o + 3], z = p.segs[o + 4];
    const travel = p.segs[o + 7] === 9;
    const w = travel ? 0.08 : Math.max(0.1, p.segs[o + 5]), h = travel ? 0.08 : Math.max(0.05, p.segs[o + 6]);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, px = nx * (w / 2), py = ny * (w / 2);
    let v = k * VERTS_PER_SEG * 3;
    for (const [ex, ey] of [[x0, y0], [x1, y1]]) {
      // corners: top-left, top-right, bottom-right, bottom-left (the top a little narrower: a rounded bead)
      positions.set([ex + px * 0.8, ey + py * 0.8, z, ex - px * 0.8, ey - py * 0.8, z, ex - px, ey - py, z - h * 0.85, ex + px, ey + py, z - h * 0.85], v);
      normals.set([nx * 76, ny * 76, 101, -nx * 76, -ny * 76, 101, -nx * 127, -ny * 127, -13, nx * 127, ny * 127, -13].map(Math.round), v);
      v += 12;
    }
    const base = k * VERTS_PER_SEG;
    for (let f = 0; f < IDX_PER_SEG; f++) index[k * IDX_PER_SEG + f] = base + FACES[f];
  }
  return { positions, normals, index };
}
