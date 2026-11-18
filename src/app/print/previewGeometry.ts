/**
 * The layer preview as one three.js geometry. The worker built the positions, normals and indices (docs/35 P2-10); here
 * only the colour per vertex (one pass per colour mode) and, when line types are hidden, a shorter index list. The
 * segments stay in print order, so a layer range and the move slider are a draw range.
 */
import * as THREE from 'three';
import { LINE_TYPES, SEG_STRIDE, type LineType, type PreviewData, type PreviewMeshData } from '../../print/types';
import { hexRgb, LINE_COLORS, scaleColor } from './previewColors';
import type { ColorBy } from './printStore';

export interface PreviewMesh { geometry: THREE.BufferGeometry; layerStart: number[]; range: [number, number] | null; segIndex: Int32Array; count: number }

const VERTS = 8, IDX = 18;
export const indicesPerSegment = IDX;

/** the value of a segment in a continuous colour mode */
function valueOf(segs: Float32Array, o: number, by: ColorBy): number {
  switch (by) {
    case 'speed': return segs[o + 8];
    case 'height': return segs[o + 6];
    case 'width': return segs[o + 5];
    case 'flow': return segs[o + 8] * segs[o + 5] * segs[o + 6];
    case 'fan': return segs[o + 10];
    default: return 0;
  }
}

export function buildPreview(p: PreviewData, mesh: PreviewMeshData, colorBy: ColorBy, hidden: LineType[], slotColors: string[]): PreviewMesh {
  const n = p.segs.length / SEG_STRIDE;
  const hiddenIds = new Set(hidden.map((t) => LINE_TYPES.indexOf(t)));
  const continuous = colorBy !== 'type' && colorBy !== 'filament';
  let lo = Infinity, hi = -Infinity;
  if (continuous) for (let i = 0; i < n; i++) { const o = i * SEG_STRIDE; if (p.segs[o + 7] === 9) continue; const v = valueOf(p.segs, o, colorBy); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const col = new Uint8Array(n * VERTS * 3);
  const typeRgb = LINE_TYPES.map((t) => hexRgb(LINE_COLORS[t]));
  const slotRgb = slotColors.map(hexRgb);
  for (let i = 0; i < n; i++) {
    const o = i * SEG_STRIDE, type = p.segs[o + 7];
    const rgb = colorBy === 'filament' ? slotRgb[p.segs[o + 9]] ?? typeRgb[0]
      : !continuous || type === 9 ? typeRgb[type] ?? typeRgb[0]
      : scaleColor(hi > lo ? (valueOf(p.segs, o, colorBy) - lo) / (hi - lo) : 0.5);
    const r = rgb[0] * 255, g = rgb[1] * 255, b = rgb[2] * 255;
    for (let q = 0; q < VERTS; q++) { const v = (i * VERTS + q) * 3; col[v] = r; col[v + 1] = g; col[v + 2] = b; }
  }
  // the kept segments: all, or without the hidden line types (a shorter index list, same vertex buffers)
  const keep: number[] = [];
  const layerStart: number[] = [];
  let li = 0;
  for (let i = 0; i < n; i++) {
    while (li < p.layerStart.length - 1 && p.layerStart[li] <= i) { layerStart.push(keep.length); li++; }
    if (!hiddenIds.has(p.segs[i * SEG_STRIDE + 7])) keep.push(i);
  }
  while (layerStart.length < p.layerStart.length) layerStart.push(keep.length);
  const index = keep.length === n ? mesh.index : new Uint32Array(keep.length * IDX);
  if (index !== mesh.index) keep.forEach((s, k) => index.set(mesh.index.subarray(s * IDX, s * IDX + IDX), k * IDX));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return { geometry: g, layerStart, range: Number.isFinite(lo) ? [lo, hi] : null, segIndex: Int32Array.from(keep), count: keep.length };
}
