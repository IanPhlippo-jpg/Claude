import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { csg, meshVolume } from '../features/solid';
import type { Body } from '../features/rebuild';

export interface Interference {
  a: string;
  b: string;
  /** overlapping volume (mm³) */
  volume: number;
  /** the overlap solid, for highlighting */
  geometry: THREE.BufferGeometry;
  /** Treat coincidence as interference: the bodies only touch (no volume) */
  coincident?: boolean;
  /** the boolean failed: the pair could not be checked (message) */
  failed?: string;
}

export interface InterferenceOptions {
  /** report bodies that only touch as well (volume 0) */
  coincidence?: boolean;
  /** check the bodies of one multibody part against each other (else only bodies of different components) */
  multibody?: boolean;
  /** the component a body belongs to (bodies of one component are a multibody part) */
  ownerOf?: (bodyId: string) => string;
}

/**
 * Interference Detection: every pair of bodies whose bounding boxes overlap is intersected with a
 * boolean; pairs with a real overlapping volume are reported (as the original lists them with the
 * volume of each interference).
 */
export function detectInterferences(bodies: Body[], minVolume = 1e-3, opts: InterferenceOptions = {}): Interference[] {
  const out: Interference[] = [];
  const owner = opts.ownerOf ?? ((id: string) => id);
  const boxes = bodies.map((b) => {
    b.geometry.computeBoundingBox();
    return b.geometry.boundingBox ?? new THREE.Box3();
  });
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    // bodies of one multibody part are only checked with Include multibody part interferences
    if (!opts.multibody && owner(bodies[i].id) === owner(bodies[j].id)) continue;
    const touch = boxes[i].clone().expandByScalar(1e-3).intersectsBox(boxes[j]);
    const bi = boxes[i].clone().expandByScalar(-1e-4), bj = boxes[j];
    if (!bi.intersectsBox(bj) && !(opts.coincidence && touch)) continue;
    try {
      const g = csg(bodies[i].geometry, bodies[j].geometry, 'intersect');
      const v = Math.abs(meshVolume(g));
      if (v > minVolume) out.push({ a: bodies[i].id, b: bodies[j].id, volume: v, geometry: g });
      else if (opts.coincidence && touchDistance(bodies[i].geometry, bodies[j].geometry) < 1e-3) out.push({ a: bodies[i].id, b: bodies[j].id, volume: 0, geometry: g, coincident: true });
    } catch (err) {
      // a failed boolean is not 'no interference': the pair is listed as unchecked
      out.push({ a: bodies[i].id, b: bodies[j].id, volume: NaN, geometry: new THREE.BufferGeometry(), failed: String((err as Error).message ?? err) });
    }
  }
  return out;
}

/** the smallest distance between the surfaces of two bodies (sampled on the vertices of the first) */
function touchDistance(a: THREE.BufferGeometry, b: THREE.BufferGeometry): number {
  const bvh = new MeshBVH(b.index ? b.toNonIndexed() : b);
  const pa = a.getAttribute('position');
  let best = Infinity;
  const v = new THREE.Vector3();
  for (let i = 0; i < pa.count; i++) {
    const h = bvh.closestPointToPoint(v.fromBufferAttribute(pa, i));
    if (h && h.distance < best) best = h.distance;
    if (best < 1e-6) break;
  }
  return best;
}
