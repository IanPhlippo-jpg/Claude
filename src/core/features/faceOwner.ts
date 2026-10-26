import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { isRoundFeature, isSketchBased, type Document, type Feature } from '../document/types';
import { applyRoundFeature, featureGeometry, rebuildDocument } from './rebuild';

/**
 * The feature that made a face, for the hover tag of the intended design ("Boss-Extrude1"): going from the newest
 * feature back, the first whose own geometry (an extrusion's prism, a fillet's rounding tool …) has a surface
 * through the face's centre with the same direction. Each feature's geometry is built once and cached.
 */
const cache = new WeakMap<Feature, { bvh: MeshBVH; geo: THREE.BufferGeometry } | null>();

function featureSurface(doc: Document, f: Feature, index: number): { bvh: MeshBVH; geo: THREE.BufferGeometry } | null {
  if (cache.has(f)) return cache.get(f)!;
  let geo: THREE.BufferGeometry | null = null;
  try {
    if (isSketchBased(f) && (f.type === 'extrude' || f.type === 'revolve' || f.type === 'sweep' || f.type === 'loft')) geo = featureGeometry(doc, f).geometry;
    else if (isRoundFeature(f)) {
      // the rounding tools as they were made on the body just before the fillet / chamfer
      const before = rebuildDocument(doc, index).bodies[0];
      const r = before ? applyRoundFeature(before.geometry, f) : null;
      const tools = r?.tools ? [...r.tools.cutters, ...r.tools.adders] : [];
      if (tools.length) {
        const pos: number[] = [];
        for (const t of tools) { const p = (t.index ? t.toNonIndexed() : t).getAttribute('position'); for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
        geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      }
    }
  } catch {
    geo = null;
  }
  const out = geo && geo.getAttribute('position')?.count ? { geo: geo.index ? geo.toNonIndexed() : geo, bvh: new MeshBVH(geo.index ? geo.toNonIndexed() : geo) } : null;
  cache.set(f, out);
  return out;
}

export function faceOwner(doc: Document, centroid: [number, number, number], normal: [number, number, number]): Feature | null {
  const c = new THREE.Vector3(...centroid);
  const n = new THREE.Vector3(...normal).normalize();
  const hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  for (let i = doc.features.length - 1; i >= 0; i--) {
    const f = doc.features[i];
    if (f.suppressed || f.type === 'sketch') continue;
    const s = featureSurface(doc, f, i);
    if (!s) continue;
    const r = s.bvh.closestPointToPoint(c, hit as never) as { point: THREE.Vector3; distance: number; faceIndex: number } | null;
    if (!r || r.distance > 1e-3) continue;
    // the triangle there faces the same way (or the opposite way for a cut)
    const p = s.geo.getAttribute('position');
    const a = new THREE.Vector3().fromBufferAttribute(p, r.faceIndex * 3), b = new THREE.Vector3().fromBufferAttribute(p, r.faceIndex * 3 + 1), d = new THREE.Vector3().fromBufferAttribute(p, r.faceIndex * 3 + 2);
    const tn = b.sub(a).cross(d.sub(a)).normalize();
    if (Math.abs(tn.dot(n)) > 0.95) return f;
  }
  return null;
}
