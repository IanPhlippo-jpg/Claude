/**
 * Face names (QA F47): every face a feature makes carries a name, kept through the booleans as a per-triangle
 * attribute. An extruded face is named after its feature and the sketch entity it was swept from ("Boss-Extrude1,
 * Line3"), the two caps after the feature and their side. An edge is then known by the names of its two faces, which
 * stay the same when a dimension changes, so a fillet or chamfer finds its edge again after an earlier feature was
 * edited, even where an equal edge lies nearer to where the old one was.
 *
 * The attribute holds a 20-bit hash of the name (0 = no name): it crosses workers as it is, and a boolean that
 * interpolates it inside a split triangle stays within rounding of the whole number.
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { PlaneDef, SketchBasedFeature } from '../document/types';
import type { Sketch } from '../sketch/types';
import type { FaceSource } from './sweep';
import { distanceToEntity, entityLoops, sampleEntity } from '../sketch/geometry';

export const FACE_TAG = 'ftag';

/** the face name as a number: FNV-1a, folded to 20 bits, never 0 */
export function faceTag(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const t = ((h >>> 20) ^ h) & 0xfffff;
  return t || 1;
}

/** the face tag of triangle t of a non-indexed geometry (0 = none) */
export function triangleTag(g: THREE.BufferGeometry, t: number): number {
  const a = g.getAttribute(FACE_TAG);
  return a ? Math.round(a.getX(t * 3)) : 0;
}

/** sets the tag of every triangle (non-indexed geometry) */
function setTags(g: THREE.BufferGeometry, tags: number[]): void {
  const arr = new Float32Array(tags.length * 3);
  tags.forEach((t, i) => arr.fill(t, i * 3, i * 3 + 3));
  g.setAttribute(FACE_TAG, new THREE.BufferAttribute(arr, 1));
}

const segDist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};

/**
 * the named geometry of a sketched feature; From ▸ Offset is named by the extrusion it moves, thin walls not at all; a
 * sweep or a loft by the profile point each triangle was swept from (QA 0.5.11 T4: a fillet on a sweep edge went to
 * the edge on the other side of the profile after the path changed)
 */
export function nameFeatureFaces(g: THREE.BufferGeometry, f: SketchBasedFeature, sketch: Sketch, plane: PlaneDef): THREE.BufferGeometry {
  if (f.type === 'extrude' && !f.fromOffset && !f.thin) return nameExtrudedFaces(g, f.id, sketch, plane);
  const src = g.userData.faceSrc as FaceSource[] | undefined;
  if ((f.type === 'sweep' || f.type === 'loft') && src && !g.index) return nameFaces(g, f.id, sketch, null, (_c, _n, t) => src[t]);
  const axis = f.type === 'revolve' && !f.thin ? sketch.entities[f.axisEntityId] : null;
  if (f.type === 'revolve' && axis?.kind === 'line') return nameRevolvedFaces(g, f.id, sketch, plane, f.axisEntityId, { a: sketch.points[axis.p1], b: sketch.points[axis.p2] });
  return g;
}

/**
 * Names the faces of an extruded solid: a cap after its side of the sketch plane, a side face after the nearest
 * sketch entity (the one it was swept from). Returns the geometry non-indexed with the tags set.
 */
export function nameExtrudedFaces(g: THREE.BufferGeometry, featureId: string, sketch: Sketch, plane: PlaneDef): THREE.BufferGeometry {
  const o = new THREE.Vector3(...plane.origin), u = new THREE.Vector3(...plane.u), v = new THREE.Vector3(...plane.v), n = new THREE.Vector3(...plane.n);
  const c = new THREE.Vector3();
  return nameFaces(g, featureId, sketch, null, (centroid, normal) => {
    const d = normal.dot(n);
    if (Math.abs(d) > 0.98) return d > 0 ? '+' : '-';
    c.copy(centroid).sub(o);
    return { x: c.dot(u), y: c.dot(v) };
  });
}

/**
 * Names the faces of a revolved solid (QA v0.5.1 F110): a face after the profile entity it was turned from (found by
 * turning the face back into the sketch plane), the start and end faces of a revolve under 360° as caps.
 */
export function nameRevolvedFaces(g: THREE.BufferGeometry, featureId: string, sketch: Sketch, plane: PlaneDef, axisEntityId: string, axis: { a: { x: number; y: number }; b: { x: number; y: number } }): THREE.BufferGeometry {
  const o = new THREE.Vector3(...plane.origin), u = new THREE.Vector3(...plane.u), v = new THREE.Vector3(...plane.v);
  const d2 = { x: axis.b.x - axis.a.x, y: axis.b.y - axis.a.y };
  const dl = Math.hypot(d2.x, d2.y);
  if (dl < 1e-9) return g.index ? g.toNonIndexed() : g;
  d2.x /= dl; d2.y /= dl;
  // the profile lies on one side of the axis in the sketch: the side of most of its points
  let side = 0;
  for (const [id, e] of Object.entries(sketch.entities)) {
    if (id === axisEntityId || e.kind === 'point') continue;
    for (const q of sampleEntity(sketch, e)) side += Math.sign(d2.x * (q.y - axis.a.y) - d2.y * (q.x - axis.a.x));
  }
  const perp = side >= 0 ? { x: -d2.y, y: d2.x } : { x: d2.y, y: -d2.x };
  const A = o.clone().addScaledVector(u, axis.a.x).addScaledVector(v, axis.a.y);
  const D = u.clone().multiplyScalar(d2.x).addScaledVector(v, d2.y).normalize();
  const rad = new THREE.Vector3(), tan = new THREE.Vector3();
  return nameFaces(g, featureId, sketch, axisEntityId, (centroid, normal) => {
    rad.copy(centroid).sub(A);
    const h = rad.dot(D);
    rad.addScaledVector(D, -h);
    const r = rad.length();
    if (r > 1e-9) {
      tan.crossVectors(D, rad).divideScalar(r);
      const t = normal.dot(tan);
      if (Math.abs(t) > 0.98) return t > 0 ? '+' : '-';
    }
    return { x: axis.a.x + h * d2.x + r * perp.x, y: axis.a.y + h * d2.y + r * perp.y };
  });
}

/**
 * The tags of a solid made from a sketch: `where` gives per triangle (centroid, unit normal) a cap side or the sketch
 * point it came from, and that point takes the name of the nearest sketch entity.
 */
function nameFaces(g: THREE.BufferGeometry, featureId: string, sketch: Sketch, skip: string | null, where: (centroid: THREE.Vector3, normal: THREE.Vector3, t: number) => '+' | '-' | { x: number; y: number }): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const tris = Math.floor(pos.count / 3);
  const entities = Object.entries(sketch.entities).filter(([id, e]) => id !== skip && e.kind !== 'point' && !(e as { construction?: boolean }).construction);
  // a sketch with very many entities (text) is not worth the time: its faces stay unnamed
  if (!tris || !entities.length || tris * entities.length > 4e6) return ng;
  // the curves that are not simple are sampled once
  const polylines = new Map<string, { x: number; y: number }[][]>();
  for (const [id, e] of entities) {
    if (e.kind === 'line' || e.kind === 'circle' || e.kind === 'arc') continue;
    polylines.set(id, e.kind === 'spline' ? [sampleEntity(sketch, e)] : entityLoops(sketch, e, 64));
  }
  const dist = (id: string, e: (typeof entities)[number][1], p: { x: number; y: number }) => {
    const pl = polylines.get(id);
    if (!pl) return distanceToEntity(sketch, e, p);
    let best = Infinity;
    for (const pts of pl) for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, segDist(p, pts[i], pts[i + 1]));
    return best;
  };
  const capPlus = faceTag(`${featureId}:cap+`), capMinus = faceTag(`${featureId}:cap-`);
  const sideTags = new Map(entities.map(([id]) => [id, faceTag(`${featureId}:${id}`)]));
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), c = new THREE.Vector3(), tn = new THREE.Vector3();
  const tags: number[] = [];
  for (let t = 0; t < tris; t++) {
    p0.fromBufferAttribute(pos, t * 3);
    p1.fromBufferAttribute(pos, t * 3 + 1);
    p2.fromBufferAttribute(pos, t * 3 + 2);
    tn.subVectors(p1, p0).cross(c.subVectors(p2, p0));
    const l = tn.length();
    if (l < 1e-12) { tags.push(0); continue; }
    c.copy(p0).add(p1).add(p2).divideScalar(3);
    const q = where(c, tn.divideScalar(l), t);
    if (q === '+' || q === '-') { tags.push(q === '+' ? capPlus : capMinus); continue; }
    let best = '', bd = Infinity;
    for (const [id, e] of entities) {
      const dd = dist(id, e, q);
      if (dd < bd) { bd = dd; best = id; }
    }
    tags.push(sideTags.get(best) ?? 0);
  }
  const out = ng === g ? g.clone() : ng;
  setTags(out, tags);
  return out;
}

/**
 * Gives the triangles of a new geometry the names of the nearest triangles of named geometries (the body before the
 * feature, the feature's tools): a B-rep tessellation, a fillet or another feature that builds its result anew keeps
 * the names of the faces it did not touch, and its new faces take the name of the face they grew from.
 */
export function copyFaceNames(sources: THREE.BufferGeometry[], target: THREE.BufferGeometry): void {
  const named = sources.filter((g) => g.getAttribute(FACE_TAG));
  const pos = target.getAttribute('position');
  if (!named.length || !pos || target.index || pos.count > 450_000) return;
  let n = 0;
  const flat = named.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of flat) n += g.getAttribute('position').count;
  const all = new Float32Array(n * 3), allTags = new Float32Array(n);
  let o = 0;
  for (const g of flat) {
    const p = g.getAttribute('position'), t = g.getAttribute(FACE_TAG);
    for (let i = 0; i < p.count; i++, o++) {
      all[o * 3] = p.getX(i); all[o * 3 + 1] = p.getY(i); all[o * 3 + 2] = p.getZ(i);
      allTags[o] = t.getX(i);
    }
  }
  const src = new THREE.BufferGeometry();
  src.setAttribute('position', new THREE.BufferAttribute(all, 3));
  const bvh = new MeshBVH(src);
  // the BVH reorders an index of its own; the triangle a hit reports is that of the index
  const index = src.index;
  const out = new Float32Array(pos.count);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t + 2 < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t);
    b.fromBufferAttribute(pos, t + 1);
    c.fromBufferAttribute(pos, t + 2);
    const hit = bvh.closestPointToPoint(a.add(b).add(c).divideScalar(3));
    const v = hit ? (index ? index.getX(hit.faceIndex * 3) : hit.faceIndex * 3) : -1;
    out[t] = out[t + 1] = out[t + 2] = v >= 0 ? Math.round(allTags[v]) : 0;
  }
  target.setAttribute(FACE_TAG, new THREE.BufferAttribute(out, 1));
}
