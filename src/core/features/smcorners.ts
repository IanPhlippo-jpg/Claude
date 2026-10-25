import * as THREE from 'three';
import { faceBoundary } from './patterns2';
import { planarFaces } from './solid';
import { cylinderAxis } from '../assembly/assembly';

type V3 = [number, number, number];

/** The planar face of a body nearest to a stored reference (normal + point on it). */
export function findFace(g: THREE.BufferGeometry, ref: { normal: V3; point: V3 }) {
  const n = new THREE.Vector3(...ref.normal).normalize();
  const p = new THREE.Vector3(...ref.point);
  let best: ReturnType<typeof planarFaces>[number] | null = null, bestD = Infinity;
  for (const f of planarFaces(g, 'x')) {
    if (f.curved) continue;
    const fn = new THREE.Vector3(...f.normal);
    if (fn.dot(n) < 0.999) continue;
    const d = Math.abs(fn.dot(p) - fn.dot(new THREE.Vector3(...f.centroid))) * 10 + p.distanceTo(new THREE.Vector3(...f.centroid));
    if (d < bestD) { bestD = d; best = f; }
  }
  return best;
}

/** A prism: a planar polygon (in a plane frame) moved along the normal from 0 to `depth`. */
function prism(origin: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, n: THREE.Vector3, poly: [number, number][], from: number, to: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: to - from, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, from);
  const m = new THREE.Matrix4().makeBasis(u, v, n);
  m.setPosition(origin);
  g.applyMatrix4(m);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

/**
 * Closed Corner: the selected end face of a flange is extended along its normal until it closes the gap to the
 * flange beside it (the gap is found by a ray from the face; the extension goes through that flange's thickness).
 * Returns the material to add and the seam polygon (where the extension meets the other flange), or an error.
 */
export function closedCornerTool(g: THREE.BufferGeometry, ref: { normal: V3; point: V3 }, thickness: number, gap: number): { tool: THREE.BufferGeometry; seam: THREE.Vector3[] } | { error: string } {
  const face = findFace(g, ref);
  if (!face) return { error: 'The face to extend is no longer there.' };
  const fb = faceBoundary(g, face.triangles, face.normal, face.centroid);
  const o = new THREE.Vector3(...fb.origin), u = new THREE.Vector3(...fb.u), v = new THREE.Vector3(...fb.v);
  const n = new THREE.Vector3(...face.normal).normalize();
  // where is the neighbouring flange? cast from a few points of the face
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  let hit = Infinity;
  const samples: THREE.Vector3[] = [o.clone(), ...fb.polygon.map(([x, y]) => o.clone().addScaledVector(u, x * 0.8).addScaledVector(v, y * 0.8))];
  for (const s of samples) {
    ray.set(s.clone().addScaledVector(n, 1e-3), n);
    const h = ray.intersectObject(mesh, false).find((x) => x.distance > 1e-3);
    if (h && h.distance < hit) hit = h.distance;
  }
  const reach = Math.max(thickness * 6, 30);
  if (!Number.isFinite(hit) || hit > reach) return { error: 'There is no flange in front of this face to close the corner against.' };
  const depth = Math.max(0.01, hit - gap) + (gap > 0 ? 0 : thickness);
  const tool = prism(o, u, v, n, fb.polygon, -0.01, depth);
  const seam = [...fb.polygon, fb.polygon[0]].map(([x, y]) => o.clone().addScaledVector(u, x).addScaledVector(v, y).addScaledVector(n, Math.max(0.01, hit - gap)));
  return { tool, seam };
}

/**
 * Corner Relief: where two bends meet, a rectangular or circular cut through the sheet, centred where the two
 * bend axes come closest, of the given size.
 */
export function cornerReliefTool(g: THREE.BufferGeometry, faces: { triangles: number[] }[], kind: 'rectangular' | 'circular', size: number): THREE.BufferGeometry | { error: string } {
  if (faces.length < 2) return { error: 'Select the two bend faces that meet at the corner.' };
  const a = cylinderAxis(g, faces[0].triangles), b = cylinderAxis(g, faces[1].triangles);
  if (!a || !b) return { error: 'Select two curved bend faces.' };
  // closest points of the two axis lines
  const d1 = a.dir.clone().normalize(), d2 = b.dir.clone().normalize();
  const r = a.point.clone().sub(b.point);
  const A = d1.dot(d1), B = d1.dot(d2), C = d2.dot(d2), D = d1.dot(r), E = d2.dot(r);
  const den = A * C - B * B;
  if (Math.abs(den) < 1e-9) return { error: 'The two bends are parallel: they do not meet at a corner.' };
  const s = (B * E - C * D) / den, t = (A * E - B * D) / den;
  const p = a.point.clone().addScaledVector(d1, s).add(b.point.clone().addScaledVector(d2, t)).multiplyScalar(0.5);
  const n = d1.clone().cross(d2).normalize();
  const h = size * 8 + 20;
  let tool: THREE.BufferGeometry;
  if (kind === 'circular') {
    tool = new THREE.CylinderGeometry(size / 2, size / 2, h, 40, 1, false);
  } else {
    tool = new THREE.BoxGeometry(size, h, size);
  }
  // local Y along the sheet normal at the corner
  const m = new THREE.Matrix4().makeBasis(d1, n, d1.clone().cross(n).normalize());
  m.setPosition(p);
  tool.applyMatrix4(m);
  const ng = tool.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}
