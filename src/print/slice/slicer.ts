/**
 * The slicer: meshes on the plate -> tool paths per layer (docs/33 eis 5, docs/34 2.4). Pure TypeScript; runs in the
 * slice worker and under vitest. Grid units inside (geom/polygons UNITS), millimetres in the result.
 *
 * Per layer and filament: the region (union of the contours, positive fill rule), walls by offset (bead spacing from the
 * flow model: w - h (1 - pi/4)), the fill area inside the walls, top and bottom skins from the regions of the
 * neighbouring layers, bridges (skin over air, lines across the shortest span), sparse infill, support, skirt and brim.
 */
import { poly, RegionIndex, UNITS, type Paths } from '../geom/polygons';
import { area } from '../geom/boolean';
import { flipped, signedVolume, topology } from '../mesh';
import { sliceMesh } from './contours';
import { boxOf, infill, parallelLines } from './infill';
import { normalSupport, treeSupport, type SupportLayers } from './support';
import type { LineType, PlateMesh, ProcessSettings, SliceLayer, ToolPath } from '../types';

const U = UNITS;

export interface SliceCore {
  meshes: PlateMesh[];
  process: ProcessSettings;
  nozzle: number;
  /** where lines may go: the printable area minus the excluded zones (grid units); skirt, brim and support are cut to it */
  bed?: Paths;
}
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
  for (const pf of perFil) for (let i = 0; i < n; i++) pf[i] = pf[i].length ? poly.unionNonZero(pf[i]) : [];
  const all: Paths[] = Array.from({ length: n }, (_, i) => (filaments.length === 1 ? perFil[0][i] : poly.union(perFil.flatMap((pf) => pf[i]))));

  // support from the union of all parts
  let support: SupportLayers | null = null;
  if (s.support !== 'none') {
    progress('Support', 0.2);
    const inp = { regions: all, heights: plan.h, thresholdDeg: s.supportAngle, zGapLayers: s.supportZGapLayers, xyGap: s.supportXYGap, lineWidth: s.lineWidth * U,
      interfaceLayers: s.supportInterfaceLayers };
    support = s.support === 'tree' ? treeSupport(inp) : normalSupport(inp);
    if (cancelled()) throw new SliceCancelled();
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
      // a bridge: solid area over air; its lines run along the span, anchored 1.5 line widths on the material below
      // (docs/35 P2-3)
      const air = !first && solid.length ? poly.opening(poly.difference(solid, all[i - 1]), w) : [];
      const bridge = air.length ? poly.intersection(poly.offset(air, 1.5 * w), C) : [];
      const skin = bridge.length ? poly.difference(solid, bridge) : solid;
      const sparse = solid.length ? poly.difference(C, solid) : C;
      const skinAngle = i % 2 ? (3 * Math.PI) / 4 : Math.PI / 4;
      if (skin.length) for (const l of connectLines(parallelLines(skin, boxOf(skin), sp, skinAngle), skin, sp)) push('skin', l, false, s.speedSkin, fil);
      if (bridge.length) {
        const ang = bridgeAngle(bridge, all[i - 1], sp);
        for (const l of connectLines(parallelLines(bridge, boxOf(bridge), sp, ang), bridge, sp)) push('bridge', l, false, s.speedBridge, fil);
      }
      if (sparse.length && s.infillDensity > 0 && Math.abs(poly.area(sparse)) > (2 * w) ** 2) {
        const lines = infill(sparse, s.infillPattern, s.infillDensity, sp, i, plan.z[i] * U);
        // sparse lines are not joined (a joining piece along the wall would raise the density); a short hop between
        // them inside the area needs no retraction (build.ts)
        for (const l of lines) push('infill', l, false, s.speedInfill, fil);
      }
    });
    if (support) {
      const sw = s.lineWidth * U;
      const fil = filaments[0];
      // support stays on the bed (docs/35 P1-3)
      const onBed = (a: Paths) => (core.bed && a.length ? poly.intersection(a, core.bed) : a);
      const iface = onBed(support.interface[i]), base = onBed(support.base[i]);
      if (iface.length) {
        for (const l of connectLines(parallelLines(iface, boxOf(iface), sw / 0.7, i % 2 ? 0 : Math.PI / 2), iface, sw / 0.7)) push('supportInterface', l, false, s.speedSupport, fil, sw);
      }
      if (base.length) {
        if (s.support === 'tree') for (const l of base) if (area(l) > 0) push('support', l, true, s.speedSupport, fil, sw);
        const gap = sw / Math.max(0.05, s.supportDensity);
        for (const l of connectLines(parallelLines(base, boxOf(base), gap, 0), base, gap)) push('support', l, false, s.speedSupport, fil, sw);
      }
    }
    if (first) skirtAndBrim(all[0], s, w, sp, core.bed, (pts) => push('skirt', pts, true, s.speedFirstLayer, filaments[0]), warnings);
    layers.push({ z: plan.z[i], height: h, paths });
    if (i % 4 === 0) progress('Walls, skins and infill', 0.25 + (0.6 * (i + 1)) / n);
  }
  return { layers, warnings, regions: all };
}

/**
 * Brim loops around the first layer, then the skirt loops at their distance; each loop is the boundary of its offset
 * area cut to the bed, so nothing leaves the printable area (docs/35 P1-3).
 */
function skirtAndBrim(first: Paths, s: ProcessSettings, w: number, sp: number, bed: Paths | undefined, add: (pts: number[]) => void, warnings: string[]) {
  if (!first.length) return;
  const loops = (d: number) => { const a = poly.offset(first, d); return bed ? poly.intersection(a, bed) : a; };
  const brimLoops = Math.round((s.brimWidth * U) / sp);
  let cut = false;
  for (let k = 0; k < brimLoops; k++) for (const l of loops(w / 2 + k * sp)) add(l);
  if (s.skirtLoops > 0) {
    const d = s.skirtDistance * U + brimLoops * sp + w / 2;
    for (let k = 0; k < s.skirtLoops; k++) {
      const full = poly.offset(first, d + k * sp);
      const inBed = bed ? poly.intersection(full, bed) : full;
      if (Math.abs(poly.area(inBed) - poly.area(full)) > 1) cut = true;
      for (const l of inBed) add(l);
    }
  }
  if (cut) warnings.push('The skirt was cut short at the edge of the bed.');
}

/**
 * Parallel lines joined into zigzags: the end of one line is joined to the nearest end of a line within 1.6 spacings
 * when the joining piece stays inside the area (grown a little), so the nozzle does not travel between them.
 */
export function connectLines(segs: number[], region: Paths, spacing: number): number[][] {
  const n = segs.length / 4;
  if (!n) return [];
  const idx = new RegionIndex(poly.offset(region, spacing * 0.05 + 1));
  const used = new Uint8Array(n);
  const out: number[][] = [];
  const reach = spacing * 1.6;
  for (let s0 = 0; s0 < n; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const pl = [segs[4 * s0], segs[4 * s0 + 1], segs[4 * s0 + 2], segs[4 * s0 + 3]];
    for (;;) {
      const ex = pl[pl.length - 2], ey = pl[pl.length - 1];
      let best = -1, bd = reach, rev = false;
      for (let k = 0; k < n; k++) {
        if (used[k]) continue;
        const d0 = Math.hypot(segs[4 * k] - ex, segs[4 * k + 1] - ey), d1 = Math.hypot(segs[4 * k + 2] - ex, segs[4 * k + 3] - ey);
        if (d0 < bd) { bd = d0; best = k; rev = false; }
        if (d1 < bd) { bd = d1; best = k; rev = true; }
      }
      if (best < 0) break;
      const q = 4 * best;
      const [ax, ay, bx, by] = rev ? [segs[q + 2], segs[q + 3], segs[q], segs[q + 1]] : [segs[q], segs[q + 1], segs[q + 2], segs[q + 3]];
      const cross = idx.crossings(ex, ey, ax, ay).filter((t) => t > 1e-6 && t < 1 - 1e-6);
      if (cross.length || !idx.contains((ex + ax) / 2, (ey + ay) / 2)) break;
      used[best] = 1;
      pl.push(ax, ay, bx, by);
    }
    out.push(pl);
  }
  return out;
}

/**
 * The direction of bridge lines (docs/35 P2-3): the angle (of 24) at which the most lines rest on material of the
 * layer below at both ends; among equals the shortest lines.
 */
function bridgeAngle(region: Paths, below: Paths, spacing: number): number {
  const rest = new RegionIndex(poly.offset(below, spacing * 0.5));
  let best = 0, bestScore = -1, bestLen = Infinity;
  for (let k = 0; k < 24; k++) {
    const ang = (k * Math.PI) / 24;
    const segs = parallelLines(region, boxOf(region), spacing * 2, ang);
    if (!segs.length) continue;
    let both = 0, L = 0;
    for (let q = 0; q < segs.length; q += 4) {
      L += Math.hypot(segs[q + 2] - segs[q], segs[q + 3] - segs[q + 1]);
      if (rest.contains(segs[q], segs[q + 1]) && rest.contains(segs[q + 2], segs[q + 3])) both++;
    }
    const score = both / (segs.length / 4), mean = L / (segs.length / 4);
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) < 1e-9 && mean < bestLen)) { bestScore = score; bestLen = mean; best = ang; }
  }
  return best;
}
