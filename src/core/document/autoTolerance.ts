import * as THREE from 'three';
import type { Body } from '../features/rebuild';
import type { PlanarFace } from '../features/solid';

/**
 * Auto Tolerancing / MBD Dimensions, as the intended MBD Dimensions tab: datums, size and location dimensions, geometric
 * tolerances and the Auto Dimension Scheme that derives them from the model faces. Tolerances follow the document's
 * block tolerance (Document Properties ▸ Auto Tolerancing) or the geometric method.
 */

export interface FaceRef { normal: [number, number, number]; point: [number, number, number] }
export interface AutoToleranceDatum { id: string; label: string; face: FaceRef }
export interface AutoToleranceDim {
  id: string;
  kind: 'size' | 'location' | 'pattern' | 'angle';
  faces: FaceRef[];
  value: number;
  plus: number;
  minus: number;
  /** a basic (boxed) dimension of the geometric scheme */
  basic?: boolean;
  label: string;
  /** the datum the location dimension is measured from */
  datum?: string;
}
export interface AutoToleranceGtol {
  id: string;
  symbol: 'position' | 'flatness' | 'perpendicularity' | 'parallelism' | 'profile' | 'cylindricity';
  value: number;
  datums: string[];
  face: FaceRef;
  label: string;
}
export interface AutoToleranceData {
  partType: 'prismatic' | 'turned';
  toleranceType: 'plusMinus' | 'geometric';
  datums: AutoToleranceDatum[];
  dims: AutoToleranceDim[];
  gtols: AutoToleranceGtol[];
}

export const GTOL_SYMBOLS: Record<AutoToleranceGtol['symbol'], string> = { position: '⌖', flatness: '⏥', perpendicularity: '⟂', parallelism: '∥', profile: '⌓', cylindricity: '⌭' };

export interface BlockTolerance { length1: number; length2: number; length3: number; angle: number }
export const DEFAULT_BLOCK: BlockTolerance = { length1: 0.5, length2: 0.25, length3: 0.1, angle: 0.5 };

const v3 = (a: [number, number, number]) => new THREE.Vector3(...a);
let seq = 0;
const nid = (p: string) => `${p}${++seq}`;
const sameFace = (a: FaceRef, b: FaceRef) => v3(a.point).distanceTo(v3(b.point)) < 0.5 && v3(a.normal).dot(v3(b.normal)) > 0.99;
const ref = (f: PlanarFace): FaceRef => ({ normal: [...f.normal] as [number, number, number], point: [...f.centroid] as [number, number, number] });

/** the planar faces of the bodies (the curved pieces left out) */
export function planarFaceList(bodies: Body[]): PlanarFace[] {
  return bodies.flatMap((b) => b.faces.filter((f) => !f.curved && f.area > 1));
}

/** the block tolerance of a dimension by its magnitude: the intended "precision" classes */
export function blockFor(value: number, block: BlockTolerance): number {
  if (value < 10) return block.length3;
  if (value < 100) return block.length2;
  return block.length1;
}

/**
 * Auto Dimension Scheme: datums A/B/C (the largest mutually perpendicular faces, unless given), a size dimension for
 * every pair of opposite parallel faces, a location dimension for every other face parallel to a datum, and with the
 * geometric method a flatness on the datums and a profile tolerance on the located faces.
 */
export function autoDimensionScheme(bodies: Body[], opts: { partType: 'prismatic' | 'turned'; toleranceType: 'plusMinus' | 'geometric'; block: BlockTolerance; datums?: FaceRef[] }): AutoToleranceData {
  const faces = planarFaceList(bodies).slice().sort((a, b) => b.area - a.area);
  const data: AutoToleranceData = { partType: opts.partType, toleranceType: opts.toleranceType, datums: [], dims: [], gtols: [] };
  if (!faces.length) return data;
  // datums
  const labels = ['A', 'B', 'C'];
  const datumFaces: PlanarFace[] = [];
  if (opts.datums?.length) {
    for (const r of opts.datums) {
      const f = faces.find((x) => sameFace(ref(x), r));
      if (f) datumFaces.push(f);
    }
  }
  if (!datumFaces.length) {
    datumFaces.push(faces[0]);
    const perp = (f: PlanarFace) => datumFaces.every((d) => Math.abs(v3(d.normal).dot(v3(f.normal))) < 0.05);
    const b = faces.find((f) => f !== faces[0] && perp(f));
    if (b) datumFaces.push(b);
    const c = faces.find((f) => !datumFaces.includes(f) && perp(f));
    if (c) datumFaces.push(c);
  }
  data.datums = datumFaces.slice(0, 3).map((f, i) => ({ id: nid('dat'), label: labels[i], face: ref(f) }));
  // size dimensions: opposite parallel faces
  const used = new Set<PlanarFace>();
  for (let i = 0; i < faces.length; i++) {
    const a = faces[i];
    if (used.has(a)) continue;
    const na = v3(a.normal);
    const partner = faces.find((b, j) => j > i && !used.has(b) && v3(b.normal).dot(na) < -0.99 && Math.abs(v3(b.centroid).sub(v3(a.centroid)).dot(na)) > 0.01);
    if (!partner) continue;
    const dist = Math.abs(v3(partner.centroid).sub(v3(a.centroid)).dot(na));
    used.add(a);
    used.add(partner);
    const tol = blockFor(dist, opts.block);
    data.dims.push({ id: nid('dim'), kind: 'size', faces: [ref(a), ref(partner)], value: dist, plus: tol, minus: tol, basic: opts.toleranceType === 'geometric', label: `${round(dist)}` });
  }
  // location dimensions: faces parallel to a datum (not the datum itself, not a size pair partner of it)
  for (const f of faces) {
    if (datumFaces.includes(f)) continue;
    const dat = data.datums.find((d) => Math.abs(v3(d.face.normal).dot(v3(f.normal))) > 0.99);
    if (!dat) continue;
    const dist = Math.abs(v3(f.centroid).sub(v3(dat.face.point)).dot(v3(dat.face.normal)));
    if (dist < 0.01) continue;
    // the size pairs already carry the distance between opposite faces: a location only for faces not in a pair with the datum
    const inPairWithDatum = data.dims.some((d) => d.kind === 'size' && d.faces.some((r) => sameFace(r, ref(f))) && d.faces.some((r) => sameFace(r, dat.face)));
    if (inPairWithDatum) continue;
    const tol = blockFor(dist, opts.block);
    data.dims.push({ id: nid('dim'), kind: 'location', faces: [dat.face, ref(f)], value: dist, plus: tol, minus: tol, basic: opts.toleranceType === 'geometric', label: `${round(dist)}`, datum: dat.label });
  }
  if (opts.toleranceType === 'geometric') {
    for (const d of data.datums) data.gtols.push({ id: nid('gt'), symbol: 'flatness', value: opts.block.length3, datums: [], face: d.face, label: `${GTOL_SYMBOLS.flatness} ${opts.block.length3}` });
    for (const dim of data.dims) {
      const f = dim.faces[dim.faces.length - 1];
      if (data.gtols.some((g) => sameFace(g.face, f))) continue;
      data.gtols.push({ id: nid('gt'), symbol: 'profile', value: opts.block.length2 * 2, datums: data.datums.map((d) => d.label), face: f, label: `${GTOL_SYMBOLS.profile} ${opts.block.length2 * 2} | ${data.datums.map((d) => d.label).join(' | ')}` });
    }
  }
  return data;
}

const round = (v: number) => Math.round(v * 100) / 100;

export type ToleranceStatus = 'constrained' | 'under' | 'over';
export const STATUS_COLORS: Record<ToleranceStatus, string> = { constrained: '#2fb34a', under: '#f2d13a', over: '#d93b3b' };

/** Show Tolerance Status: a face is fully constrained when a datum, dimension or tolerance refers to it; more than two make it over-constrained. */
export function toleranceStatus(bodies: Body[], data: AutoToleranceData | undefined): { colors: Record<string, Record<string, string>>; counts: Record<ToleranceStatus, number> } {
  const colors: Record<string, Record<string, string>> = {};
  const counts: Record<ToleranceStatus, number> = { constrained: 0, under: 0, over: 0 };
  const refs: FaceRef[] = data ? [...data.datums.map((d) => d.face), ...data.dims.flatMap((d) => d.faces), ...data.gtols.map((g) => g.face)] : [];
  for (const b of bodies) {
    const c: Record<string, string> = {};
    for (const f of b.faces) {
      if (f.curved) continue;
      const n = refs.filter((r) => sameFace(r, ref(f))).length;
      const status: ToleranceStatus = n === 0 ? 'under' : n > 3 ? 'over' : 'constrained';
      counts[status]++;
      c[f.id] = STATUS_COLORS[status];
    }
    colors[b.id] = c;
  }
  return { colors, counts };
}

/** the size of a dimension between two picked faces (their distance along the first normal), for the Size / Location tools */
export function faceDistance(a: FaceRef, b: FaceRef): number {
  return Math.abs(v3(b.point).sub(v3(a.point)).dot(v3(a.normal).normalize()));
}
