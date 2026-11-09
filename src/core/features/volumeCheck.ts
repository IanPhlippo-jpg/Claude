/**
 * The cross-check between the two kernels (QA reports 0.5.10 F159 and 0.5.11 F172): the mesh kernel and the B-rep
 * kernel build the same part, so they agree up to the tessellation's margin. A larger difference means one of them
 * applied a feature wrongly (an edge rounded too many or too few, a boolean that missed): the user is told instead of
 * shown a silent number.
 *
 * Two measures:
 * - the shape: the largest distance between the two surfaces, both ways (every vertex of one body to the surface of
 *   the other, every vertex: no sampling, QA 0.5.12 F202). Both tessellations stay within a few hundredths of a
 *   millimetre of the true surface (the mesh kernel's arcs keep their chord under 0.02 mm, the exact one is meshed at
 *   0.01 mm), while a missed fillet of radius R leaves a corner R·(√2 − 1) away (0.83 mm at R2) whatever the size of
 *   the body. This is what catches a feature;
 * - the volume, as a backstop for what has no vertex near the difference. Its limit follows the body (QA 0.5.12 F172):
 *   only curved surfaces are faceted, and a facet lies at most a few hundredths from the true surface, so two correct
 *   bodies differ by at most (curved area) × 0.05 mm, plus 0.01 % for rounding; never more than 0.5 %. A prismatic body
 *   that differs by 0.03 % (one 10 mm edge rounded too many) speaks on the volume alone.
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { planarFaces, type PlanarFace } from './solid';

/** the relative volume difference above which the volumes always disagree (a body of curved surfaces only) */
export const VOLUME_MISMATCH = 0.005;
/** the relative volume difference a body without curved surfaces may have (rounding only) */
export const VOLUME_MISMATCH_FLAT = 1e-4;
/** how far a facet of a curved surface may lie from the true one, both kernels together, with a margin (mm) */
const FACET_DEVIATION = 0.05;

/** the surface distance (mm) above which the shapes are said to disagree, at least; large bodies add 0.02 % of their size */
export const SHAPE_MISMATCH_MM = 0.1;

/** the warning text when the exact and the faceted volume disagree, else null */
export function volumeMismatch(meshVolume: number, exactVolume: number, limit = VOLUME_MISMATCH): string | null {
  const ref = Math.max(Math.abs(meshVolume), Math.abs(exactVolume));
  if (!(ref > 1e-9) || !Number.isFinite(meshVolume) || !Number.isFinite(exactVolume)) return null;
  const rel = Math.abs(exactVolume - meshVolume) / ref;
  if (rel <= limit) return null;
  return `Warning: B-rep and mesh disagree: the exact volume (${exactVolume.toFixed(2)} mm³) and the faceted volume (${meshVolume.toFixed(2)} mm³) of this body differ by ${(rel * 100).toPrecision(2)} % (the tessellation allows ${(limit * 100).toPrecision(2)} %): one of the kernels built this feature wrongly. Check the geometry before trusting mass properties or STEP.`;
}

/** the area of the curved surfaces of a body (the faces made of facets) */
export function curvedArea(g: THREE.BufferGeometry, faces?: PlanarFace[]): number {
  return (faces ?? planarFaces(g, 'v')).reduce((a, f) => a + (f.curved ? f.area : 0), 0);
}

/** the relative volume difference this body may show between the kernels (F172): its curved area times the facet deviation */
export function volumeLimit(mesh: THREE.BufferGeometry, volume: number, faces?: PlanarFace[]): number {
  if (!(volume > 1e-9)) return VOLUME_MISMATCH;
  return Math.min(VOLUME_MISMATCH, VOLUME_MISMATCH_FLAT + (curvedArea(mesh, faces) * FACET_DEVIATION) / volume);
}

export interface ShapeDeviation {
  /** the largest distance found (mm) */
  distance: number;
  /** where: the vertex that lies farthest from the other surface */
  at: [number, number, number];
  /** true when that vertex belongs to the exact body (the exact body has something the faceted one lacks) */
  onExact: boolean;
}

/** the bounding-box diagonal of a geometry */
function diagonal(g: THREE.BufferGeometry): number {
  if (!g.boundingBox) g.computeBoundingBox();
  const b = g.boundingBox!;
  return b.isEmpty() ? 0 : b.min.distanceTo(b.max);
}

/** a geometry with only the positions of g, for a BVH (the BVH sets an index of its own; g stays untouched) */
function bvhOf(g: THREE.BufferGeometry): MeshBVH {
  const src = new THREE.BufferGeometry();
  src.setAttribute('position', g.getAttribute('position'));
  if (g.index) src.setIndex(g.index);
  return new MeshBVH(src);
}

/** the indices of the distinct vertices of a geometry, each position once (to 0.1 µm; an open-addressing table on the
 * rounded coordinates: a set of strings took seconds on a large body) */
function distinct(g: THREE.BufferGeometry): Int32Array {
  const pos = g.getAttribute('position');
  const n = pos.count;
  const q = new Int32Array(n * 3);
  for (let i = 0; i < n; i++) { q[i * 3] = Math.round(pos.getX(i) * 1e4); q[i * 3 + 1] = Math.round(pos.getY(i) * 1e4); q[i * 3 + 2] = Math.round(pos.getZ(i) * 1e4); }
  const size = 1 << Math.ceil(Math.log2(n * 2 + 2));
  const table = new Int32Array(size).fill(-1);
  const out = new Int32Array(n);
  let m = 0;
  for (let i = 0; i < n; i++) {
    const a = q[i * 3], b = q[i * 3 + 1], c = q[i * 3 + 2];
    let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) & (size - 1);
    let dup = false;
    for (let j = table[h]; j !== -1; h = (h + 1) & (size - 1), j = table[h]) {
      if (q[j * 3] === a && q[j * 3 + 1] === b && q[j * 3 + 2] === c) { dup = true; break; }
    }
    if (dup) continue;
    table[h] = i;
    out[m++] = i;
  }
  return out.subarray(0, m);
}

/** the farthest vertex of `from` from the surface of `to` (every distinct vertex) */
function farthest(from: THREE.BufferGeometry, to: MeshBVH): { d: number; at: THREE.Vector3 } {
  const pos = from.getAttribute('position');
  const p = new THREE.Vector3();
  const hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  const best = { d: 0, at: new THREE.Vector3() };
  for (const i of distinct(from)) {
    p.fromBufferAttribute(pos, i);
    const r = to.closestPointToPoint(p, hit);
    if (r && r.distance > best.d) {
      best.d = r.distance;
      best.at.copy(p);
    }
  }
  return best;
}

/** whether a vertex of `from` lies farther than tol from the surface of `to`: every vertex, each search cut off at tol
 * and stopped at the first point within it (fast enough for every vertex of a large body) */
function anyBeyond(from: THREE.BufferGeometry, to: MeshBVH, tol: number): boolean {
  const pos = from.getAttribute('position');
  const p = new THREE.Vector3();
  const hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  // null: nothing within tol; a hit can still lie beyond it (a box within tol whose triangle is not)
  for (const i of distinct(from)) {
    const r = to.closestPointToPoint(p.fromBufferAttribute(pos, i), hit, tol, tol);
    if (!r || r.distance > tol) return true;
  }
  return false;
}

/** the largest distance between the faceted and the exact surface of one body, both ways */
export function shapeDeviation(mesh: THREE.BufferGeometry, exact: THREE.BufferGeometry): ShapeDeviation | null {
  if (!mesh.getAttribute('position')?.count || !exact.getAttribute('position')?.count) return null;
  const a = farthest(mesh, bvhOf(exact));
  const b = farthest(exact, bvhOf(mesh));
  const w = b.d > a.d ? { r: b, onExact: true } : { r: a, onExact: false };
  return { distance: w.r.d, at: w.r.at.toArray() as [number, number, number], onExact: w.onExact };
}

/** the distance two bodies of this size may lie apart and still be the same shape */
export function shapeTolerance(g: THREE.BufferGeometry): number {
  return Math.max(SHAPE_MISMATCH_MM, diagonal(g) * 2e-4);
}

/** the warning text when the exact and the faceted body do not have the same shape, else null */
export function shapeMismatch(mesh: THREE.BufferGeometry, exact: THREE.BufferGeometry): string | null {
  if (!mesh.getAttribute('position')?.count || !exact.getAttribute('position')?.count) return null;
  const tol = shapeTolerance(mesh);
  // every vertex both ways against the tolerance first; the largest distance only when one lies beyond it
  if (!anyBeyond(mesh, bvhOf(exact), tol) && !anyBeyond(exact, bvhOf(mesh), tol)) return null;
  const dev = shapeDeviation(mesh, exact);
  if (!dev || dev.distance <= tol) return null;
  const [x, y, z] = dev.at.map((v) => v.toFixed(1));
  return `Warning: B-rep and mesh disagree: the exact and the faceted surface lie ${dev.distance.toFixed(2)} mm apart near (${x}, ${y}, ${z}) mm (the tessellation allows ${tol.toFixed(2)} mm): one of the kernels built this feature wrongly. Check the geometry before trusting mass properties or STEP.`;
}

/**
 * The cross-check as the app runs it on every exact body (brepRefine) and the tests run it: the volume against the
 * limit of this body, then the shape. `faces` are the faces of the faceted body when they are known already.
 */
export function kernelMismatch(mesh: THREE.BufferGeometry, meshVolume: number, exact: THREE.BufferGeometry, exactVolume: number, faces?: PlanarFace[]): string | null {
  return volumeMismatch(meshVolume, exactVolume, volumeLimit(mesh, Math.max(meshVolume, exactVolume), faces)) ?? shapeMismatch(mesh, exact);
}
