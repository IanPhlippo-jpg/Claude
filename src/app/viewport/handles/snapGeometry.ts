import * as THREE from 'three';
import type { Body } from '../../../core/features/rebuild';
import { valueAtPoint, type ModelHandle, type SnapFace } from './handleMath';

/**
 * Snapping of a drag handle to the model, by design: while dragging, the pointer over a vertex, over an edge that lies
 * level with the moving face, or over a planar face parallel to it sets the value so the moving face reaches that
 * geometry (shown on the ruler). Only what is in view counts (a vertex behind a face is no target), and the geometry
 * that moves with the handle (its own face) is left out. The model as it was when the drag began is used, so the live
 * preview does not snap to itself.
 */
export interface SnapHit {
  kind: 'vertex' | 'edge' | 'face';
  point: THREE.Vector3;
  value: number;
  face?: SnapFace;
}

interface SnapMesh { bodyId: string; mesh: THREE.Mesh; triToFace: string[]; faces: Body['faces'] }
export interface SnapScene { meshes: SnapMesh[]; vertices: THREE.Vector3[]; edges: THREE.Vector3[][] }

const TOL = 1e-4;

export function snapScene(bodies: Body[], h: Pick<ModelHandle, 'anchor' | 'dir' | 'snap'>): SnapScene {
  const pl = h.snap?.plane;
  const onPlane = (p: THREE.Vector3) => !!pl && Math.abs(p.clone().sub(pl.point).dot(pl.normal)) < TOL;
  const level = (p: THREE.Vector3) => p.clone().sub(h.anchor).dot(h.dir);
  const seen = new Set<string>();
  const vertices: THREE.Vector3[] = [];
  const edges: THREE.Vector3[][] = [];
  const meshes: SnapMesh[] = [];
  for (const b of bodies) {
    for (const e of b.edges) {
      const pts = e.points;
      if (!pts.length) continue;
      if (!e.closed) for (const p of [pts[0], pts[pts.length - 1]]) {
        const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
        if (seen.has(key) || onPlane(p)) continue;
        seen.add(key);
        vertices.push(p.clone());
      }
      const l0 = level(pts[0]);
      if (pts.length > 1 && !onPlane(pts[0]) && pts.every((p) => Math.abs(level(p) - l0) < TOL)) edges.push(pts.map((p) => p.clone()));
    }
    const triToFace: string[] = [];
    for (const f of b.faces) for (const t of f.triangles) triToFace[t] = f.id;
    meshes.push({ bodyId: b.id, mesh: new THREE.Mesh(b.geometry), triToFace, faces: b.faces });
  }
  return { meshes, vertices, edges };
}

/** the nearest face hit along the ray: its distance, face and point */
function firstHit(scene: SnapScene, ray: THREE.Ray): { d: number; m: SnapMesh; faceId: string; point: THREE.Vector3 } | null {
  const rc = new THREE.Raycaster();
  rc.ray.copy(ray);
  rc.near = -1e6;
  rc.far = 1e6;
  let best: { d: number; m: SnapMesh; faceId: string; point: THREE.Vector3 } | null = null;
  for (const m of scene.meshes) {
    for (const hit of rc.intersectObject(m.mesh, false)) {
      const faceId = hit.faceIndex != null ? m.triToFace[hit.faceIndex] : undefined;
      if (!faceId) continue;
      if (!best || hit.distance < best.d) best = { d: hit.distance, m, faceId, point: hit.point.clone() };
    }
  }
  return best;
}

/**
 * The snap under the pointer (px, py): a vertex within `radius` pixels first, then an edge, then the face. `project`
 * maps world to pixels and `rayAt` pixels to the view ray.
 */
export function findSnap(scene: SnapScene, h: Pick<ModelHandle, 'anchor' | 'dir' | 'toValue' | 'min' | 'max' | 'snap'>, px: number, py: number,
  project: (v: THREE.Vector3) => { x: number; y: number }, rayAt: (x: number, y: number) => THREE.Ray, radius = 8): SnapHit | null {
  const inRange = (v: number) => v >= h.min - 1e-9 && v <= h.max + 1e-9;
  // in view: nothing of the model lies in front of the point along its own view ray
  const visible = (p: THREE.Vector3) => {
    const q = project(p);
    const ray = rayAt(q.x, q.y);
    const t = p.clone().sub(ray.origin).dot(ray.direction);
    const hit = firstHit(scene, ray);
    return !hit || hit.d >= t - 0.05;
  };
  let vBest: { d: number; p: THREE.Vector3 } | null = null;
  for (const p of scene.vertices) {
    const q = project(p);
    const d = Math.hypot(q.x - px, q.y - py);
    if (d <= radius && (!vBest || d < vBest.d) && inRange(valueAtPoint(h, p)) && visible(p)) vBest = { d, p };
  }
  if (vBest) return { kind: 'vertex', point: vBest.p, value: valueAtPoint(h, vBest.p) };
  let eBest: { d: number; p: THREE.Vector3 } | null = null;
  for (const pts of scene.edges) {
    for (let i = 1; i < pts.length; i++) {
      const a = project(pts[i - 1]), b = project(pts[i]);
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const t = l2 > 1e-12 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2)) : 0;
      const d = Math.hypot(a.x + dx * t - px, a.y + dy * t - py);
      if (d > radius - 2 || (eBest && d >= eBest.d)) continue;
      const p = pts[i - 1].clone().lerp(pts[i], t);
      if (inRange(valueAtPoint(h, p)) && visible(p)) eBest = { d, p };
    }
  }
  if (eBest) return { kind: 'edge', point: eBest.p, value: valueAtPoint(h, eBest.p) };
  const hit = firstHit(scene, rayAt(px, py));
  if (!hit) return null;
  const face = hit.m.faces.find((f) => f.id === hit.faceId);
  if (!face || face.curved) return null;
  const n = new THREE.Vector3(...face.normal).normalize();
  if (Math.abs(n.dot(h.dir)) < 0.999) return null;
  // the moving face itself covers what lies behind it
  const pl = h.snap?.plane;
  if (pl && Math.abs(hit.point.clone().sub(pl.point).dot(pl.normal)) < 1e-3) return null;
  const value = valueAtPoint(h, hit.point);
  if (!inRange(value)) return null;
  const label = `Face<${hit.m.faces.indexOf(face) + 1}>`;
  return { kind: 'face', point: hit.point, value, face: { bodyId: hit.m.bodyId, faceId: face.id, normal: face.normal, point: face.centroid, label } };
}
