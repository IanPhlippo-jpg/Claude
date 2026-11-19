/**
 * A resin slice from start to end (the slice worker calls it; the tests too): the parts lifted onto their supports,
 * cut into layers, hollowed with drain holes, the supports and the raft added, islands and suction cups found, each
 * layer rasterized at the LCD resolution into its run-length code, and the print time, resin volume and cost.
 * Then the .goo file. Nothing has been printed with it: "nog te printen".
 */
import { bounds, flipped, signedVolume, transformPositions, translation } from '../mesh';
import { concat } from '../shapes';
import { poly, type Paths } from '../geom/polygons';
import { sliceMesh } from '../slice/contours';
import { renderThumbnail } from '../pack/render';
import { findCups, findIslands, drillDrains, hollowLayers } from './analyze';
import { planSupports, RayGrid, supportMesh, supportPoints, supportSection, type SupportPlan } from './supports';
import { rasterLayer } from './raster';
import { exposureOf, layerTime, settingsProblems } from './profile';
import { fileTime, GOO_BIG, GOO_SMALL, writeGoo } from './goo';
import type { PlateMesh, Printer } from '../types';
import type { Resin, ResinIssue, ResinLayer, ResinMachine, ResinSettings, ResinStats } from './types';

export interface ResinJob {
  meshes: PlateMesh[];
  printer: Printer;
  machine: ResinMachine;
  settings: ResinSettings;
  resin: Resin;
  name: string;
  appVersion: string;
}
export interface ResinOutput {
  layers: ResinLayer[];
  stats: ResinStats;
  /** RGBA previews for the file: 116 and 290 pixels square */
  small: Uint8Array;
  big: Uint8Array;
  /** the supports and the raft for the plate view (triangles, plate coordinates) */
  supports: Float32Array;
  /** how far the parts were lifted onto their supports, mm */
  lift: number;
}
type Progress = (stage: string, fraction: number) => void;

/** the height the parts are lifted to: on the plate without supports, else on the struts */
export const liftOf = (s: ResinSettings) => (s.supports === 'none' ? 0 : Math.max(s.liftHeight, (s.raft ? s.raftThickness : 0) + 2));

/** the reasons the plate cannot be sliced for this resin printer (empty = fine) */
export function resinProblems(job: Pick<ResinJob, 'meshes' | 'machine' | 'settings'> & { resin?: Resin }): string[] {
  const m = job.machine, out = settingsProblems(job.settings, m, job.resin);
  if (!job.meshes.length || job.meshes.every((x) => !x.positions.length)) out.push('The plate is empty: add a part first.');
  const lift = liftOf(job.settings);
  for (const x of job.meshes) {
    if (!x.positions.length) continue;
    const b = bounds(x.positions);
    if (b.min[0] < -0.01 || b.min[1] < -0.01 || b.max[0] > m.size[0] + 0.01 || b.max[1] > m.size[1] + 0.01) {
      out.push(`${x.name} lies outside the LCD of the ${m.name} (${m.size[0]} x ${m.size[1]} mm).`);
    }
    if (b.max[2] - b.min[2] + lift > m.height + 0.01) out.push(`${x.name} is ${(b.max[2] - b.min[2] + lift).toFixed(1)} mm high with its supports; the ${m.name} prints up to ${m.height} mm.`);
    // the plate lifts this far above the last layer: it has to stay within the travel of the printer (docs/35 R-5)
    else if (b.max[2] - b.min[2] + lift + job.settings.liftDistance > m.height + 0.01) {
      out.push(`${x.name} with its supports and a lift of ${job.settings.liftDistance} mm goes above the ${m.height} mm of the ${m.name}: lower the lift distance.`);
    }
  }
  for (const h of job.settings.drainHoles) if (!(h.r >= 0.5 && h.r <= 10)) out.push(`A drain hole of radius ${h.r} mm is outside 0.5 to 10 mm.`);
  return out;
}

export function runResinSlice(job: ResinJob, progress: Progress = () => {}, cancelled: () => boolean = () => false): ResinOutput {
  const problems = resinProblems(job);
  if (problems.length) throw new Error(problems.join('\n'));
  const s = job.settings, m = job.machine, lh = s.layerHeight;
  const lift = liftOf(s);
  progress('Layers', 0.02);
  const warnings: string[] = [];
  // a mesh whose faces point inwards is turned, as on the FDM side (docs/35 R-1): its layers would be empty otherwise
  const meshes = job.meshes.filter((x) => x.positions.length).map((x) => {
    const b = bounds(x.positions);
    const pos = transformPositions(x.positions, translation(0, 0, lift - b.min[2]));
    if (signedVolume(pos) >= 0) return pos;
    warnings.push(`${x.name}: the faces pointed inwards; the mesh was turned outwards. Check the model.`);
    return flipped(pos);
  });
  const all = concat(...meshes);
  const top = bounds(all).max[2];
  const n = Math.max(1, Math.ceil(top / lh - 1e-6));
  const planes = Array.from({ length: n }, (_, i) => (i + 0.5) * lh);
  const zOf = (i: number) => i * lh;
  const per = meshes.map((pos) => sliceMesh(pos, planes));
  const solid: Paths[] = planes.map((_, i) => poly.union(per.flatMap((l) => l[i].contours)));
  const repaired = per.reduce((a, l) => a + l.reduce((b, x) => b + x.repaired, 0), 0);
  if (repaired) warnings.push(`${repaired} open ends of the mesh were joined: check the model.`);
  if (cancelled()) throw new Error('Slicing was cancelled.');
  // hollowing and the drain holes
  let model = solid;
  if (s.hollow) {
    progress('Hollowing', 0.15);
    model = drillDrains(solid, hollowLayers(solid, s.wallThickness, lh), s.drainHoles);
  }
  // supports: under the overhangs and the islands of the part
  progress('Supports', 0.3);
  const grid = new RayGrid(all);
  const islands = s.supports === 'none' ? [] : findIslands(model, zOf, 0).map((i): [number, number, number] => [i.x, i.y, i.z]);
  const points = supportPoints(all, s, islands, grid);
  const plan: SupportPlan = s.supports === 'none' && !s.addedPoints.length ? { struts: [], trunks: [], raft: [], raftTop: 0 } : planSupports(points, s, grid);
  const layersPaths: Paths[] = planes.map((z, i) => {
    const sup = supportSection(plan, z, s);
    return sup.length ? poly.union(model[i], sup) : model[i];
  });
  if (cancelled()) throw new Error('Slicing was cancelled.');
  progress('Islands', 0.4);
  const issues: ResinIssue[] = [...findIslands(layersPaths, zOf, 0), ...findCups(layersPaths, zOf, 0)];
  // the pixel masks
  const layers: ResinLayer[] = [];
  let volume = 0, time = 0, clipped = 0;
  for (let i = 0; i < n; i++) {
    if (cancelled()) throw new Error('Slicing was cancelled.');
    const r = rasterLayer(layersPaths[i], m, s.antiAliasing);
    clipped += r.clipped;
    layers.push({ z: (i + 1) * lh, data: r.data, area: r.area, exposure: exposureOf(s, i) });
    volume += r.area * lh;
    time += layerTime(s, i);
    if (i % 20 === 0) progress('Pixel masks', 0.45 + (0.45 * i) / n);
  }
  if (clipped) warnings.push('Part of the plate lies outside the LCD and is cut off.');
  // not one lit pixel: hours of exposure for nothing (docs/35 R-1)
  if (!(volume > 0)) throw new Error('The slice has no exposed pixel: the parts give no layers (check the mesh: open, flat or turned inside out).');
  const grams = (volume / 1000) * job.resin.density;
  const counts = { island: 0, suction: 0, cavity: 0 };
  for (const x of issues) counts[x.kind]++;
  if (counts.island) warnings.push(`${counts.island} island(s): pieces that rest on nothing below; add supports there.`);
  if (counts.suction) warnings.push(`${counts.suction} suction cup(s): closed towards the plate; tilt the part or add a hole.`);
  if (counts.cavity) warnings.push(`${counts.cavity} closed cavity(ies): they trap resin; add a drain hole.`);
  progress('Previews', 0.92);
  const supports = supportMesh(plan, s);
  const rm = [...meshes.map((positions) => ({ positions, color: '#7fb2e5' })), ...(supports.length ? [{ positions: supports, color: '#c8ccd2' }] : [])];
  const small = renderThumbnail(rm, GOO_SMALL, GOO_SMALL), big = renderThumbnail(rm, GOO_BIG, GOO_BIG);
  progress('Done', 1);
  const stats: ResinStats = { layers: n, printTime: Math.round(time), volume, grams, cost: (grams / 1000) * job.resin.pricePerKg, issues, warnings,
    supportPoints: plan.struts.map((st) => [st.x, st.y, st.zTop]) };
  return { layers, stats, small, big, supports, lift };
}

/** the .goo file of a resin slice */
export function gooFile(out: ResinOutput, job: ResinJob, time = fileTime(new Date())): { name: string; data: Uint8Array; mime: string } {
  const data = writeGoo({ machine: job.machine, settings: job.settings, resin: job.resin, layers: out.layers, stats: out.stats, small: out.small, big: out.big,
    appVersion: job.appVersion, time });
  return { name: `${job.name.replace(/[^\w.-]+/g, '_') || 'plate'}.goo`, data, mime: 'application/octet-stream' };
}
