/**
 * The slicer: meshes on the plate -> tool paths per layer (docs/33 eis 5, docs/34 2.4). Pure TypeScript; runs in the
 * slice worker and under vitest. Grid units inside (geom/polygons UNITS), millimetres in the result.
 *
 * Per layer and filament: the region (union of the contours, positive fill rule), walls by offset (bead spacing from the
 * flow model: w - h (1 - pi/4)), the fill area inside the walls, top and bottom skins from the regions of the
 * neighbouring layers, bridges (skin over air, lines across the shortest span), sparse infill, support, skirt and brim.
 */
import { poly, UNITS, type Paths } from '../geom/polygons';
import { area } from '../geom/boolean';
import { flipped, signedVolume, topology } from '../mesh';
import { sliceMesh } from './contours';
import { boxOf, infill, parallelLines } from './infill';
import { normalSupport, treeSupport, type SupportLayers } from './support';
import type { LineType, PlateMesh, ProcessSettings, SliceLayer, ToolPath } from '../types';

const U = UNITS;

export interface SliceCore { meshes: PlateMesh[]; process: ProcessSettings; nozzle: number }
export type Progress = (stage: string, fraction: number) => void;
export class SliceCancelled extends Error { constructor() { super('Slicing was cancelled.'); } }

/** layer tops and heights (mm). Fixed: 1 + ceil((H - h1) / h) layers. Variable: thinner where the surface is shallow. */
export function layerPlan(maxZ: number, s: ProcessSettings, meshes: PlateMesh[] = []): { z: number[]; h: number[] } {
  const z: number[] = [], h: number[] = [];
  const h1 = Math.min(s.firstLayerHeight, maxZ);
  z.push(h1); h.push(h1);
  if (!s.variableLayerHeight) {
    const n = Math.max(0, Math.ceil((maxZ - h1) / s.layerHeight - 1e-3 / s.layerHeight));
    for (let i = 1; i <= n; i++) { z.push(Math.round((h1 + i * s.layerHeight) * 1e6) / 1e6); h.push(s.layerHeight); }
    return { z, h };
  }
  // wanted height per triangle: cusp height (h x |nz|) at most half the nominal layer height
  const bands: { z0: number; z1: number; want: number }[] = [];
  const cusp = s.layerHeight * 0.5;
  for (const m of meshes) {
    const p = m.positions;
    for (let i = 0; i + 8 < p.length; i += 9) {
      const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2];
      const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz) || 1;
      const c = Math.abs(nz / L);
      if (c < 0.1 || c > 0.995) continue;
      bands.push({ z0: Math.min(p[i + 2], p[i + 5], p[i + 8]), z1: Math.max(p[i + 2], p[i + 5], p[i + 8]), want: cusp / c });
    }
  }
  bands.sort((a, b) => a.z0 - b.z0);
  let top = h1, prev = s.layerHeight;
  while (top < maxZ - 1e-6) {
    let want = s.maxLayerHeight;
    for (const b of bands) { if (b.z0 > top + s.maxLayerHeight) break; if (b.z1 >= top) want = Math.min(want, b.want); }
    let hh = Math.max(s.minLayerHeight, Math.min(s.maxLayerHeight, want, prev * 1.5));
    hh = Math.round(hh * 100) / 100;
    if (top + hh > maxZ) hh = Math.max(s.minLayerHeight, Math.round((maxZ - top) * 100) / 100);
    top = Math.round((top + hh) * 1e6) / 1e6;
    z.push(top); h.push(hh); prev = hh;
  }
  return { z, h };
}

/** a region split into islands: each outer loop with the holes inside it */
export function islands(region: Paths): Paths[] {
  const outers = region.filter((p) => area(p) > 0).map((p) => ({ p, a: area(p), holes: [] as number[][] }));
  outers.sort((a, b) => a.a - b.a);
  for (const hole of region.filter((p) => area(p) < 0)) {
    const o = outers.find((x) => poly.contains([x.p], hole[0], hole[1]));
    if (o) o.holes.push(hole);
  }
  return outers.map((o) => [o.p, ...o.holes]);
}

const toMm = (p: number[]) => p.map((v) => v / U);

export interface SliceOutcome { layers: SliceLayer[]; warnings: string[]; regions: Paths[] }

/** the tool paths of every layer (mm) */
export function slicePaths(core: SliceCore, progress: Progress = () => {}, cancelled: () => boolean = () => false): SliceOutcome {
  const s = core.process;
  const warnings: string[] = [];
  // the meshes facing out; damaged meshes are reported (and repaired per layer)
  const meshes = core.meshes.map((m) => (signedVolume(m.positions) < 0 ? { ...m, positions: flipped(m.positions) } : m));
  let maxZ = 0;
  for (const m of meshes) for (let i = 2; i < m.positions.length; i += 3) maxZ = Math.max(maxZ, m.positions[i]);
  if (maxZ <= 0) return { layers: [], warnings: [...warnings, 'Nothing to slice: the plate is empty.'], regions: [] };
  const plan = layerPlan(maxZ, s, meshes);
  const n = plan.z.length;
  const planes = plan.z.map((z, i) => z - plan.h[i] / 2);
  // contours per mesh, united per filament
  const filaments = [...new Set(meshes.map((m) => m.filament))].sort((a, b) => a - b);
  const perFil: Paths[][] = filaments.map(() => Array.from({ length: n }, () => []));
  let repaired = 0;
  meshes.forEach((m, mi) => {
    const sl = sliceMesh(m.positions, planes);
    const f = filaments.indexOf(m.filament);
    sl.forEach((l, i) => { repaired += l.repaired; if (l.contours.length) perFil[f][i].push(...l.contours); });
    progress('Slicing layers', ((mi + 1) / meshes.length) * 0.15);
    if (cancelled()) throw new SliceCancelled();
  });
  if (repaired) {
    const open = meshes.map((m) => ({ m, t: topology(m.positions) })).filter((x) => x.t.openEdges);
    const which = open.length ? ` (${open.map((x) => `${x.m.name}: ${x.t.openEdges} open edges`).join(', ')})` : '';
    warnings.push(`The mesh is not closed${which}: ${repaired} gap(s) in the layer contours were closed straight. Check the model for holes.`);
  }
  for (const pf of perFil) for (let i = 0; i < n; i++) pf[i] = pf[i].length ? poly.union(pf[i]) : [];
  const all: Paths[] = Array.from({ length: n }, (_, i) => (filaments.length === 1 ? perFil[0][i] : poly.union(perFil.flatMap((pf) => pf[i]))));

  // support from the union of all parts
  let support: SupportLayers | null = null;
  if (s.support !== 'none') {
    progress('Support', 0.2);
    const inp = { regions: all, heights: plan.h, thresholdDeg: s.supportAngle, zGapLayers: s.supportZGapLayers, xyGap: s.supportXYGap, lineWidth: s.lineWidth * U,
      interfaceLayers: s.supportInterfaceLayers };
    support = s.support === 'tree' ? treeSupport(inp) : normalSupport(inp);
  }

  const layers: SliceLayer[] = [];
  for (let i = 0; i < n; i++) {
    if (cancelled()) throw new SliceCancelled();
    const first = i === 0;
    const h = plan.h[i];
    const w = (first ? s.firstLayerLineWidth : s.lineWidth) * U;
    const sp = w - h * U * (1 - Math.PI / 4);
    const paths: ToolPath[] = [];
    const push = (type: LineType, pts: number[], closed: boolean, speed: number, filament: number, width = w) => { if (pts.length >= 4) paths.push({ type, points: toMm(pts), closed,
      width: width / U, speed: first ? Math.min(speed, s.speedFirstLayer) : speed, filament }); };
    filaments.forEach((fil, fi) => {
      const R = perFil[fi][i];
      if (!R.length) return;
      // walls, outer first in the list (the builder prints them inner to outer)
      for (let k = 0; k < s.wallCount; k++) {
        const loops = poly.offset(R, -(w / 2 + k * sp));
        if (!loops.length) break;
        for (const l of loops) push(k === 0 ? 'outerWall' : 'innerWall', l, true, k === 0 ? s.speedOuterWall : s.speedInnerWall, fil);
      }
      const C = poly.offset(R, -(w / 2 + s.wallCount * sp - s.infillOverlap * w));
      if (!C.length) return;
      // top: not covered by all of the next topLayers layers; bottom: the same downwards
      let solid: Paths;
      if (i < s.bottomLayers || i >= n - s.topLayers) solid = C;
      else {
        // covered = the intersection of the topLayers layers above and the bottomLayers layers below
        let covered: Paths | null = null;
        for (let k = 1; k <= s.topLayers && (!covered || covered.length); k++) covered = covered ? poly.intersection(covered, all[i + k]) : all[i + k];
        for (let k = 1; k <= s.bottomLayers && (!covered || covered.length); k++) covered = covered ? poly.intersection(covered, all[i - k]) : all[i - k];
        const exposed = !covered ? [] : covered.length ? poly.difference(C, covered) : C;
        // a little more than the exposed part, so the skin rests on the walls around it (docs/34 2.4)
        solid = exposed.length ? poly.intersection(poly.offset(exposed, w), C) : [];
      }
      const bridge = !first && solid.length ? poly.opening(poly.difference(solid, all[i - 1]), w) : [];
      const skin = bridge.length ? poly.difference(solid, bridge) : solid;
      const sparse = solid.length ? poly.difference(C, solid) : C;
      const skinAngle = i % 2 ? (3 * Math.PI) / 4 : Math.PI / 4;
      if (skin.length) {
        const lines = parallelLines(skin, boxOf(skin), sp, skinAngle);
        for (let q = 0; q < lines.length; q += 4) push('skin', lines.slice(q, q + 4), false, s.speedSkin, fil);
      }
      if (bridge.length) {
        const ang = bridgeAngle(bridge, sp);
        const lines = parallelLines(bridge, boxOf(bridge), sp, ang);
        for (let q = 0; q < lines.length; q += 4) push('bridge', lines.slice(q, q + 4), false, s.speedBridge, fil);
      }
      if (sparse.length && s.infillDensity > 0 && Math.abs(poly.area(sparse)) > (2 * w) ** 2) {
        for (const l of infill(sparse, s.infillPattern, s.infillDensity, sp, i, plan.z[i] * U)) push('infill', l, false, s.speedInfill, fil);
      }
    });
    if (support) {
      const sw = s.lineWidth * U;
      const fil = filaments[0];
      if (support.interface[i].length) {
        const lines = parallelLines(support.interface[i], boxOf(support.interface[i]), sw / 0.7, i % 2 ? 0 : Math.PI / 2);
        for (let q = 0; q < lines.length; q += 4) push('supportInterface', lines.slice(q, q + 4), false, s.speedSupport, fil, sw);
      }
      if (support.base[i].length) {
        if (s.support === 'tree') for (const l of support.base[i]) if (area(l) > 0) push('support', l, true, s.speedSupport, fil, sw);
        const lines = parallelLines(support.base[i], boxOf(support.base[i]), sw / Math.max(0.05, s.supportDensity), 0);
        for (let q = 0; q < lines.length; q += 4) push('support', lines.slice(q, q + 4), false, s.speedSupport, fil, sw);
      }
    }
    if (first) skirtAndBrim(all[0], s, w, sp, (pts) => push('skirt', pts, true, s.speedFirstLayer, filaments[0]));
    layers.push({ z: plan.z[i], height: h, paths });
    if (i % 4 === 0) progress('Walls, skins and infill', 0.25 + (0.6 * (i + 1)) / n);
  }
  return { layers, warnings, regions: all };
}

/** brim loops around the first layer, then the skirt loops at their distance */
function skirtAndBrim(first: Paths, s: ProcessSettings, w: number, sp: number, add: (pts: number[]) => void) {
  if (!first.length) return;
  const brimLoops = Math.round((s.brimWidth * U) / sp);
  for (let k = 0; k < brimLoops; k++) for (const l of poly.offset(first, w / 2 + k * sp)) if (area(l) > 0) add(l);
  if (s.skirtLoops > 0) {
    const d = s.skirtDistance * U + brimLoops * sp + w / 2;
    for (let k = 0; k < s.skirtLoops; k++) for (const l of poly.offset(first, d + k * sp)) if (area(l) > 0) add(l);
  }
}

/** the direction of bridge lines: the angle (of 12) with the shortest mean span */
function bridgeAngle(region: Paths, spacing: number): number {
  let best = 0, bestLen = Infinity;
  for (let k = 0; k < 12; k++) {
    const ang = (k * Math.PI) / 12;
    const segs = parallelLines(region, boxOf(region), spacing * 2, ang);
    if (!segs.length) continue;
    let L = 0;
    for (let q = 0; q < segs.length; q += 4) L += Math.hypot(segs[q + 2] - segs[q], segs[q + 3] - segs[q + 1]);
    const mean = L / (segs.length / 4);
    if (mean < bestLen) { bestLen = mean; best = ang; }
  }
  return best;
}
