/**
 * The tool paths of a slice as one triangle mesh for the layer preview: every extrusion segment a bead with a
 * rounded-rectangle look (top and two sides, normals tilted at the edges), the colour per vertex by line type, speed,
 * layer height or filament. Segments are kept in print order, so a layer range and the move slider are a draw range.
 */
import * as THREE from 'three';
import { LINE_TYPES, SEG_STRIDE, type LineType, type PreviewData } from '../../print/types';
import { hexRgb, LINE_COLORS, scaleColor } from './previewColors';
import type { ColorBy } from './printStore';

export interface PreviewMesh { geometry: THREE.BufferGeometry; layerStart: number[]; range: [number, number] | null; segIndex: Int32Array; count: number }

const IDX_PER_SEG = 18;
export const indicesPerSegment = IDX_PER_SEG;

export function buildPreview(p: PreviewData, colorBy: ColorBy, hidden: LineType[], slotColors: string[]): PreviewMesh {
  const n = p.segs.length / SEG_STRIDE;
  const hiddenIds = new Set(hidden.map((t) => LINE_TYPES.indexOf(t)));
  const keep: number[] = [];
  const layerStart: number[] = [];
  let li = 0;
  for (let i = 0; i < n; i++) {
    while (li < p.layerStart.length - 1 && p.layerStart[li] <= i) { layerStart.push(keep.length); li++; }
    if (!hiddenIds.has(p.segs[i * SEG_STRIDE + 7])) keep.push(i);
  }
  while (layerStart.length < p.layerStart.length) layerStart.push(keep.length);
  // the range of the continuous colour modes
  let lo = Infinity, hi = -Infinity;
  if (colorBy === 'speed' || colorBy === 'height') {
    for (const i of keep) { const v = colorBy === 'speed' ? p.segs[i * SEG_STRIDE + 8] : p.segs[i * SEG_STRIDE + 6]; if (p.segs[i * SEG_STRIDE + 7] === 9) continue; lo = Math.min(lo,
      v); hi = Math.max(hi, v); }
  }
  const m = keep.length;
  const pos = new Float32Array(m * 8 * 3), nor = new Float32Array(m * 8 * 3), col = new Uint8Array(m * 8 * 3);
  const index = new Uint32Array(m * IDX_PER_SEG);
  const typeRgb = LINE_TYPES.map((t) => hexRgb(LINE_COLORS[t]));
  const slotRgb = slotColors.map(hexRgb);
  const faces = [[0, 1, 5, 0, 5, 4], [1, 2, 6, 1, 6, 5], [3, 0, 4, 3, 4, 7]];
  keep.forEach((i, k) => {
    const o = i * SEG_STRIDE;
    const x0 = p.segs[o], y0 = p.segs[o + 1], x1 = p.segs[o + 2], y1 = p.segs[o + 3], z = p.segs[o + 4];
    const type = p.segs[o + 7];
    const travel = type === 9;
    const w = travel ? 0.08 : Math.max(0.1, p.segs[o + 5]), h = travel ? 0.08 : Math.max(0.05, p.segs[o + 6]);
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const px = (-dy / L) * (w / 2), py = (dx / L) * (w / 2);
    // corners per end: top-left, top-right, bottom-right, bottom-left (top a little narrower: a rounded bead)
    const ends = [[x0, y0], [x1, y1]];
    let v = k * 8;
    for (const [ex, ey] of ends) {
      const c = [[ex + px * 0.8, ey + py * 0.8, z], [ex - px * 0.8, ey - py * 0.8, z], [ex - px, ey - py, z - h * 0.85], [ex + px, ey + py, z - h * 0.85]];
      const nl = [[px / (w / 2) * 0.6, py / (w / 2) * 0.6, 0.8], [-px / (w / 2) * 0.6, -py / (w / 2) * 0.6, 0.8], [-px / (w / 2), -py / (w / 2), -0.1], [px / (w / 2), py / (w / 2), -0.1]];
      for (let q = 0; q < 4; q++) { pos.set(c[q], (v + q) * 3); nor.set(nl[q], (v + q) * 3); }
      v += 4;
    }
    let rgb: [number, number, number];
    if (colorBy === 'filament') rgb = slotRgb[p.segs[o + 9]] ?? typeRgb[0];
    else if (colorBy === 'type' || travel) rgb = typeRgb[type] ?? typeRgb[0];
    else rgb = scaleColor(hi > lo ? ((colorBy === 'speed' ? p.segs[o + 8] : p.segs[o + 6]) - lo) / (hi - lo) : 0.5);
    for (let q = 0; q < 8; q++) col.set([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255], (k * 8 + q) * 3);
    let t = k * IDX_PER_SEG;
    for (const f of faces) for (const a of f) index[t++] = k * 8 + a;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return { geometry: g, layerStart, range: Number.isFinite(lo) ? [lo, hi] : null, segIndex: Int32Array.from(keep), count: m };
}
