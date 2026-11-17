import * as THREE from 'three';
import { FACE_TAG } from '../features/faceNames';

/** A piece of a mesh edge with the triangles that share it. */
export interface EdgePiece {
  a: THREE.Vector3;
  b: THREE.Vector3;
  tris: number[];
  /** cut out of unmatched edges at a T-junction (CSG meshes): the triangles lie on both sides of the piece */
  split: boolean;
}

/** The edges of a mesh with their triangles, the unit normal and the face tag (face name) of every triangle. */
export interface EdgeAdjacency {
  pieces: EdgePiece[];
  normals: THREE.Vector3[];
  tags: number[];
}

const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e3)},${Math.round(p.y * 1e3)},${Math.round(p.z * 1e3)}`;
const cache = new WeakMap<THREE.BufferGeometry, EdgeAdjacency>();

/**
 * Edge adjacency of a mesh, worked out once per geometry (every view of a model uses it). Edges that two triangles
 * share are paired by their end points; CSG meshes have T-junctions (an edge on one side meets several shorter
 * edges on the other), so the unmatched edges are split at every vertex lying on them and the pieces paired again.
 */
export function edgeAdjacency(g: THREE.BufferGeometry): EdgeAdjacency {
  const hit = cache.get(g);
  if (hit) return hit;
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const tagAttr = ng.getAttribute(FACE_TAG);
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  const normals: THREE.Vector3[] = [];
  const tags: number[] = [];
  const edges = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; tris: number[] }>();
  for (let t = 0; t * 3 + 2 < a.count; t++) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    const n = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    tags.push(tagAttr ? Math.round(tagAttr.getX(t * 3)) : 0);
    if (n.lengthSq() < 1e-14) {
      normals.push(new THREE.Vector3());
      continue;
    }
    normals.push(n.normalize());
    for (const [x, y] of [[p0, p1], [p1, p2], [p2, p0]] as [THREE.Vector3, THREE.Vector3][]) {
      const kx = key(x), ky = key(y);
      const k = kx < ky ? kx + '|' + ky : ky + '|' + kx;
      const e = edges.get(k) ?? edges.set(k, { a: x, b: y, tris: [] }).get(k)!;
      e.tris.push(t);
    }
  }
  const pieces: EdgePiece[] = [];
  const open: { a: THREE.Vector3; b: THREE.Vector3; tris: number[] }[] = [];
  for (const e of edges.values()) {
    if (e.tris.length === 1) open.push(e);
    else pieces.push({ ...e, split: false });
  }
  if (open.length) splitOpen(open, pieces);
  const out = { pieces, normals, tags };
  cache.set(g, out);
  return out;
}

function splitOpen(open: { a: THREE.Vector3; b: THREE.Vector3; tris: number[] }[], into: EdgePiece[]): void {
  const pts = new Map<string, THREE.Vector3>();
  for (const e of open) {
    pts.set(key(e.a), e.a);
    pts.set(key(e.b), e.b);
  }
  const box = new THREE.Box3();
  for (const p of pts.values()) box.expandByPoint(p);
  const cell = Math.max(box.getSize(new THREE.Vector3()).length() / 64, 1e-3);
  const grid = new Map<string, THREE.Vector3[]>();
  const ck = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (const p of pts.values()) {
    const k = ck(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell));
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(p);
  }
  const pieces = new Map<string, EdgePiece>();
  const d = new THREE.Vector3(), q = new THREE.Vector3();
  for (const e of open) {
    d.subVectors(e.b, e.a);
    const L2 = d.lengthSq();
    if (L2 < 1e-14) continue;
    const ts: { t: number; p: THREE.Vector3 }[] = [{ t: 0, p: e.a }, { t: 1, p: e.b }];
    const lo = new THREE.Vector3().copy(e.a).min(e.b), hi = new THREE.Vector3().copy(e.a).max(e.b);
    for (let x = Math.floor(lo.x / cell); x <= Math.floor(hi.x / cell); x++)
      for (let y = Math.floor(lo.y / cell); y <= Math.floor(hi.y / cell); y++)
        for (let z = Math.floor(lo.z / cell); z <= Math.floor(hi.z / cell); z++) {
          for (const p of grid.get(ck(x, y, z)) ?? []) {
            const t = q.subVectors(p, e.a).dot(d) / L2;
            if (t <= 1e-6 || t >= 1 - 1e-6) continue;
            const foot = e.a.clone().addScaledVector(d, t);
            if (foot.distanceToSquared(p) < 1e-8) ts.push({ t, p });
          }
        }
    ts.sort((u, v) => u.t - v.t);
    for (let i = 0; i + 1 < ts.length; i++) {
      const x = ts[i].p, y = ts[i + 1].p;
      const kx = key(x), ky = key(y);
      if (kx === ky) continue;
      const k = kx < ky ? kx + '|' + ky : ky + '|' + kx;
      const pc = pieces.get(k) ?? pieces.set(k, { a: x, b: y, tris: [], split: true }).get(k)!;
      pc.tris.push(...e.tris);
    }
  }
  for (const pc of pieces.values()) if (pc.tris.length >= 2) into.push(pc);
}

/**
 * Silhouette segments for a view direction: edges between a front- and a back-facing triangle. An edge that more
 * than two triangles share (a boolean can leave doubled slivers along a hole wall) counts the same way: one triangle
 * on it facing the viewer and one facing away make it an outline.
 */
export function silhouettePieces(g: THREE.BufferGeometry, w: THREE.Vector3): [THREE.Vector3, THREE.Vector3][] {
  const { pieces, normals } = edgeAdjacency(g);
  const out: [THREE.Vector3, THREE.Vector3][] = [];
  for (const p of pieces) {
    let front = 0, back = 0;
    for (const t of p.tris) {
      if (normals[t].dot(w) > 0) front++;
      else back++;
    }
    if (front >= 1 && back >= 1) out.push([p.a, p.b]);
  }
  return out;
}

/**
 * Tangent edges: where two faces meet smoothly (a fillet on the face it rounds off, an arc of a profile on the line
 * that runs into it). The faces are told apart by their face names; the bend between the two triangles is below the
 * angle at which an edge counts as a crease (those are the model edges already) and above coplanar (two faces of
 * one plane that only differ in name are no edge).
 */
export function tangentSegments(g: THREE.BufferGeometry, creaseDeg = 20): [THREE.Vector3, THREE.Vector3][] {
  const { pieces, normals, tags } = edgeAdjacency(g);
  const lo = Math.cos((creaseDeg * Math.PI) / 180), hi = Math.cos((0.3 * Math.PI) / 180);
  const out: [THREE.Vector3, THREE.Vector3][] = [];
  for (const p of pieces) {
    let tangent = false;
    for (let i = 0; i < p.tris.length && !tangent; i++)
      for (let j = i + 1; j < p.tris.length && !tangent; j++) {
        const s = p.tris[i], t = p.tris[j];
        if (tags[s] === tags[t]) continue;
        const c = normals[s].dot(normals[t]);
        tangent = c > lo && c < hi;
      }
    if (tangent) out.push([p.a, p.b]);
  }
  return out;
}
