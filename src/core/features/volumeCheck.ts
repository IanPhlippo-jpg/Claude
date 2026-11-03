/**
 * The cross-check between the two kernels (QA reports 0.5.10 F159 and 0.5.11 F172): the mesh kernel and the B-rep
 * kernel build the same part, so they agree up to the tessellation's margin. A larger difference means one of them
 * applied a feature wrongly (an edge rounded too many or too few, a boolean that missed): the user is told instead of
 * shown a silent number.
 *
 * Two measures:
 * - the shape: the largest distance between the two surfaces, both ways (every vertex of one body to the surface of
 *   the other). Both tessellations stay within a few hundredths of a millimetre of the true surface (the mesh kernel's
 *   arcs keep their chord under 0.02 mm, the exact one is meshed at 0.01 mm), while a missed fillet of radius R
 *   leaves a corner R·(√2 − 1) away (0.83 mm at R2) whatever the size of the body. This is what catches a feature;
 * - the volume, relative to the body, as a backstop for what has no vertex near the difference.
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

/** the relative volume difference above which the volumes are said to disagree (the tessellation stays well under it) */
export const VOLUME_MISMATCH = 0.005;

/** the surface distance (mm) above which the shapes are said to disagree, at least; large bodies add 0.02 % of their size */
export const SHAPE_MISMATCH_MM = 0.1;

/** the warning text when the exact and the faceted volume disagree, else null */
export function volumeMismatch(meshVolume: number, exactVolume: number, limit = VOLUME_MISMATCH): string | null {
  const ref = Math.max(Math.abs(meshVolume), Math.abs(exactVolume));
  if (!(ref > 1e-9) || !Number.isFinite(meshVolume) || !Number.isFinite(exactVolume)) return null;
  const rel = Math.abs(exactVolume - meshVolume) / ref;
  if (rel <= limit) return null;
  return `Warning: B-rep and mesh disagree: the exact volume (${exactVolume.toFixed(2)} mm³) and the faceted volume (${meshVolume.toFixed(2)} mm³) of this body differ by ${(rel * 100).toFixed(1)} %: one of the kernels built this feature wrongly. Check the geometry before trusting mass properties or STEP.`;
}

export interface ShapeDeviation {
  /** the largest distance found (mm) */
  distance: number;
  /** where: the vertex that lies farthest from the other surface */
  at: [number, number, number];
  /** true when that vertex belongs to the exact body (the exact body has something the faceted one lacks) */
  onExact: boolean;
}

const MAX_SAMPLES = 80_000;

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

/** the farthest vertex of `from` from the surface of `to` (each distinct vertex once; very large bodies sampled) */
function farthest(from: THREE.BufferGeometry, to: MeshBVH): { d: number; at: THREE.Vector3 } {
  const pos = from.getAttribute('position');
  const seen = new Set<string>();
  const p = new THREE.Vector3();
  const best = { d: 0, at: new THREE.Vector3() };
  const step = Math.max(1, Math.floor(pos.count / MAX_SAMPLES));
  for (let i = 0; i < pos.count; i += step) {
    p.fromBufferAttribute(pos, i);
    const key = `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = to.closestPointToPoint(p);
    if (hit && hit.distance > best.d) {
      best.d = hit.distance;
      best.at.copy(p);
    }
  }
  return best;
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
  const dev = shapeDeviation(mesh, exact);
  if (!dev) return null;
  const tol = shapeTolerance(mesh);
  if (dev.distance <= tol) return null;
  const [x, y, z] = dev.at.map((v) => v.toFixed(1));
  return `Warning: B-rep and mesh disagree: the exact and the faceted surface lie ${dev.distance.toFixed(2)} mm apart near (${x}, ${y}, ${z}) mm (the tessellation allows ${tol.toFixed(2)} mm): one of the kernels built this feature wrongly. Check the geometry before trusting mass properties or STEP.`;
}
