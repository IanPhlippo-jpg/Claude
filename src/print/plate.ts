/**
 * The plate (docs/33 eis 4): parts placed with a matrix, lay flat on a face, auto orient, arrange, scale, and the check
 * against the build volume. Pure functions on PlateItem; the 3D Print store keeps the state.
 */
import { bounds, CAD_TO_PLATE, multiply, rotation, rotationBetween, scaling, transformPositions, translation, type Bounds, type Mat4 } from './mesh';
import { printableArea } from './database';
import { contains } from './geom/boolean';
import type { ItemSource, PlateItem, Printer } from './types';

/** a fingerprint of a mesh: count and a sampled sum (cheap; a change of the part changes it) */
export function meshHash(p: Float32Array): string {
  let a = 0, b = 0;
  const step = Math.max(1, Math.floor(p.length / 4096));
  for (let i = 0; i < p.length; i += step) { a = (a + p[i] * (i + 1)) % 1e9; b = (b * 31 + Math.round(p[i] * 1000)) % 2147483647; }
  return `${p.length}:${a.toFixed(3)}:${b}`;
}

/** a new id for an item read back from the document */
export const newItemId = () => `pi${nextId++}`;

let nextId = 1;
export const worldPositions = (it: PlateItem) => transformPositions(it.positions, it.matrix);
export const worldBounds = (it: PlateItem): Bounds => bounds(worldPositions(it));

/** a part from CAD (Y up) onto the plate: Z up, centred at (cx, cy), resting on the bed */
export function makeItem(name: string, cadPositions: Float32Array, cx: number, cy: number, filament = 0, source?: ItemSource): PlateItem {
  const it: PlateItem = { id: `pi${nextId++}`, name, positions: cadPositions, matrix: CAD_TO_PLATE.slice(), filament, source, hash: meshHash(cadPositions) };
  return placeAt(dropToBed(it), cx, cy);
}

/** moved so its lowest point is on the bed */
export function dropToBed(it: PlateItem): PlateItem {
  const b = worldBounds(it);
  return { ...it, matrix: multiply(translation(0, 0, -b.min[2]), it.matrix) };
}

/** moved so the centre of its footprint is at (x, y) */
export function placeAt(it: PlateItem, x: number, y: number): PlateItem {
  const b = worldBounds(it);
  return { ...it, matrix: multiply(translation(x - (b.min[0] + b.max[0]) / 2, y - (b.min[1] + b.max[1]) / 2, 0), it.matrix) };
}

export const moveBy = (it: PlateItem, dx: number, dy: number): PlateItem => ({ ...it, matrix: multiply(translation(dx, dy, 0), it.matrix) });

/** a rotation of the world matrix about the centre of the footprint, then back on the bed */
export function rotateAboutCentre(it: PlateItem, r: Mat4): PlateItem {
  const b = worldBounds(it);
  const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
  const m = multiply(translation(cx, cy, cz), multiply(r, multiply(translation(-cx, -cy, -cz), it.matrix)));
  return placeAt(dropToBed({ ...it, matrix: m }), cx, cy);
}

/** rotation about Z (degrees) */
export const rotateZ = (it: PlateItem, deg: number) => rotateAboutCentre(it, rotation(0, 0, 1, (deg * Math.PI) / 180));

/** Lay Flat: the face with world normal n faces the bed */
export const layFlat = (it: PlateItem, n: [number, number, number]) => rotateAboutCentre(it, rotationBetween(norm(n), [0, 0, -1]));

/** uniform scale about the centre of the footprint, on the bed */
export function scaleItem(it: PlateItem, factor: number): PlateItem {
  const b = worldBounds(it);
  const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
  const m = multiply(translation(cx, cy, 0), multiply(scaling(factor), multiply(translation(-cx, -cy, -b.min[2]), it.matrix)));
  return { ...it, matrix: m };
}

const norm = (v: number[]): [number, number, number] => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L]; };

/** planar face groups of a mesh (world): normal and area, largest first */
export function faceGroups(pos: Float32Array, limit = 24): { n: [number, number, number]; area: number }[] {
  const groups = new Map<string, { n: [number, number, number]; area: number }>();
  for (let i = 0; i + 8 < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, L = Math.hypot(cx, cy, cz);
    if (L < 1e-9) continue;
    const n: [number, number, number] = [cx / L, cy / L, cz / L];
    const key = n.map((v) => Math.round(v * 50)).join(',');
    const g = groups.get(key);
    if (g) g.area += L / 2; else groups.set(key, { n, area: L / 2 });
  }
  return [...groups.values()].sort((a, b) => b.area - a.area).slice(0, limit);
}

/**
 * The orientation score (lower is better): the area that would need support (faces pointing down steeper than the
 * threshold, not on the bed), plus a little for the height, minus a little for the area on the bed.
 */
export function orientationScore(pos: Float32Array, thresholdDeg = 30): { overhang: number; height: number; contact: number; score: number } {
  const b = bounds(pos);
  // a face at angle b from the horizontal facing down has nz = -cos b; it needs support when b < threshold
  const limit = Math.cos((thresholdDeg * Math.PI) / 180);
  let overhang = 0, contact = 0;
  for (let i = 0; i + 8 < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2];
    const vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, L = Math.hypot(cx, cy, cz);
    if (L < 1e-9) continue;
    const nz = cz / L, a = L / 2;
    const zmax = Math.max(pos[i + 2], pos[i + 5], pos[i + 8]);
    if (nz < -0.999 && zmax - b.min[2] < 0.05) { contact += a; continue; }
    // the face points down more steeply than the threshold allows (its angle from the horizontal is below it)
    if (nz < -limit) overhang += a * -nz;
  }
  const height = b.max[2] - b.min[2];
  // a tall, narrow stand (height over 2.5 x the square root of the footprint) wobbles and takes many layers
  const foot = Math.max(1, (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]));
  const tall = height / Math.sqrt(foot) > 2.5 ? 20 * height * height : 0;
  return { overhang, height, contact, score: overhang + height * 2 + tall - contact * 0.05 };
}

/** Auto Orient: the candidate (largest faces down, then the six axis directions) with the best score */
export function autoOrient(it: PlateItem, thresholdDeg = 30): PlateItem {
  const w = worldPositions(it);
  const cands: [number, number, number][] = [[0, 0, -1], ...faceGroups(w).map((g) => g.n), [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
  let best = it, bestScore = orientationScore(w, thresholdDeg).score - 1e-6;
  for (const n of cands) {
    const r = rotationBetween(norm(n), [0, 0, -1]);
    const cand = rotateAboutCentre(it, r);
    const s = orientationScore(worldPositions(cand), thresholdDeg).score;
    if (s < bestScore - 1e-6) { best = cand; bestScore = s; }
  }
  return best;
}

/**
 * Arrange: footprints packed in rows (deepest first) from the front left, `gap` mm apart, around the excluded zones
 * (docs/35 P3-8); what does not fit is returned apart (the caller puts it on a new plate). Deterministic.
 */
export function arrangeFit(items: PlateItem[], printer: Printer, gap = 6): { placed: PlateItem[]; overflow: PlateItem[] } {
  const [bx, by] = printer.buildVolume;
  const zones = (printer.excludeAreas ?? []).map((z) => {
    const xs = z.map((p) => p[0]), ys = z.map((p) => p[1]);
    return { x0: Math.min(...xs) - gap, y0: Math.min(...ys) - gap, x1: Math.max(...xs) + gap, y1: Math.max(...ys) + gap };
  });
  const fp = items.map((it, i) => { const b = worldBounds(it); return { i, w: b.max[0] - b.min[0], d: b.max[1] - b.min[1] }; });
  const order = fp.slice().sort((a, b) => b.d - a.d || b.w - a.w || a.i - b.i);
  const placed: { i: number; x: number; y: number }[] = [];
  const overflow: number[] = [];
  let x = 0, y = 0, rowD = 0;
  const hit = (x0: number, y0: number, w: number, d: number) => zones.find((z) => x0 < z.x1 && x0 + w > z.x0 && y0 < z.y1 && y0 + d > z.y0);
  for (const f of order) {
    let tries = 0;
    for (;;) {
      if (x > 0 && x + f.w > bx) { y += rowD + gap; x = 0; rowD = 0; }
      const z = hit(x, y, f.w, f.d);
      if (z && tries++ < 50) { x = z.x1; continue; }
      break;
    }
    if (y + f.d > by || f.w > bx || hit(x, y, f.w, f.d)) { overflow.push(f.i); continue; }
    placed.push({ i: f.i, x: x + f.w / 2, y: y + f.d / 2 });
    x += f.w + gap; rowD = Math.max(rowD, f.d);
  }
  // centre the block on the bed when no zone is in the way
  let ux = 0, uy = 0;
  for (const p of placed) { const f = fp[p.i]; ux = Math.max(ux, p.x + f.w / 2); uy = Math.max(uy, p.y + f.d / 2); }
  const ox = zones.length ? 0 : Math.max(0, (bx - ux) / 2), oy = zones.length ? 0 : Math.max(0, (by - uy) / 2);
  return { placed: placed.map((p) => placeAt(items[p.i], ox + p.x, oy + p.y)), overflow: overflow.map((i) => items[i]) };
}

/** Arrange within one plate (parts that do not fit stay where they were) */
export function arrange(items: PlateItem[], printer: Printer, gap = 6): PlateItem[] {
  const r = arrangeFit(items, printer, gap);
  const byId = new Map(r.placed.map((p) => [p.id, p]));
  return items.map((it) => byId.get(it.id) ?? it);
}

/** inside the printable area and below the build height (with 0.01 mm of slack) */
export function insideVolume(it: PlateItem, printer: Printer): boolean {
  const b = worldBounds(it);
  const [bx, by, bz] = printer.buildVolume;
  if (b.min[0] < -0.01 || b.min[1] < -0.01 || b.max[0] > bx + 0.01 || b.max[1] > by + 0.01 || b.max[2] > bz + 0.01 || b.min[2] < -0.01) return false;
  if (printer.printableArea) {
    const area = printableArea(printer).flat();
    for (const [x, y] of [[b.min[0], b.min[1]], [b.max[0], b.min[1]], [b.max[0], b.max[1]], [b.min[0], b.max[1]]]) if (!contains([area], x, y) && !onEdge(area, x, y)) return false;
  }
  for (const ex of printer.excludeAreas ?? []) {
    const e = ex.flat();
    for (const [x, y] of [[b.min[0], b.min[1]], [b.max[0], b.min[1]], [b.max[0], b.max[1]], [b.min[0], b.max[1]]]) if (contains([e], x, y)) return false;
  }
  return true;
}

const onEdge = (p: number[], x: number, y: number) => {
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length;
    const dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - p[i]) * dx + (y - p[i + 1]) * dy) / L));
    if (Math.hypot(p[i] + dx * t - x, p[i + 1] + dy * t - y) < 0.02) return true;
  }
  return false;
};
