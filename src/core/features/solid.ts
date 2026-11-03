import { FACE_TAG } from './faceNames';
import * as THREE from 'three';
import { TOL } from './tolerance';
import { circleSegments } from '../sketch/geometry';
import { offsetPolyline } from './thin';
import { polyArea } from './regions';
import { ADDITION, Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import type { ExtrudeFeature, PlaneDef, RevolveFeature } from '../document/types';
import type { Sketch, SketchPoint } from '../sketch/types';
import type { Region } from './regions';

/** world transform of a sketch plane: columns u, v, n and the origin */
export function planeMatrix(def: PlaneDef): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  m.makeBasis(new THREE.Vector3(...def.u), new THREE.Vector3(...def.v), new THREE.Vector3(...def.n));
  m.setPosition(new THREE.Vector3(...def.origin));
  return m;
}

const toShape = (r: Region): THREE.Shape => {
  const shape = new THREE.Shape(r.outer.map((p) => new THREE.Vector2(p.x, p.y)));
  for (const h of r.holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y))));
  return shape;
};

/** Depth of a "Through All" extrusion: well past the existing bodies. */
export const THROUGH_ALL = 1e4;

/**
 * Extruded solid of the regions in the sketch plane. Local z = plane normal; the
 * geometry is returned in world coordinates.
 */
export function extrudeGeometry(regions: Region[], plane: PlaneDef, f: Pick<ExtrudeFeature, 'end' | 'depth' | 'reverse' | 'direction2'> & { draft?: { angle: number; outward: boolean } }, throughAll = THROUGH_ALL, overhang = 0): THREE.BufferGeometry | null {
  if (!regions.length) return null;
  const d1 = f.end === 'throughAll' || f.end === 'throughAllBoth' || f.end === 'upToSurface' || f.end === 'offsetFromSurface' || f.end === 'upToNext' ? throughAll : Math.max(0, f.depth);
  // Through All - Both: both directions through everything
  const d2 = f.end === 'throughAllBoth' ? throughAll : f.direction2 ? (f.direction2.end === 'blind' || f.direction2.end === 'midPlane' ? Math.max(0, f.direction2.depth) : throughAll) : 0;
  let zStart: number, total: number;
  if (f.end === 'midPlane') {
    zStart = -d1 / 2;
    total = d1;
  } else {
    // direction 1 along +n (or -n when reversed); direction 2 the other way
    const a = f.reverse ? -d1 : d1;
    const b = f.reverse ? d2 : -d2;
    zStart = Math.min(0, a, b);
    total = Math.max(0, a, b) - zStart;
    // a cut tool starts a little outside the sketch plane so its cap is never coplanar with a face of the body
    if (overhang > 0 && !f.direction2) {
      if (zStart === 0) {
        zStart = -overhang;
        total += overhang;
      } else total += overhang;
    }
  }
  if (total <= 1e-9) return null;
  if (f.draft && f.draft.angle > 0 && f.draft.angle < 89) {
    const g = taperedExtrude(regions, zStart, zStart + total, Math.tan((f.draft.angle * Math.PI) / 180) * (f.draft.outward ? 1 : -1));
    if (!g) return null;
    g.applyMatrix4(planeMatrix(plane));
    g.computeVertexNormals();
    return g;
  }
  const g = new THREE.ExtrudeGeometry(regions.map(toShape), { depth: total, bevelEnabled: false, curveSegments: 12 });
  g.translate(0, 0, zStart);
  g.applyMatrix4(planeMatrix(plane));
  g.computeVertexNormals();
  return g;
}

const ccw = (ring: SketchPoint[]): SketchPoint[] => (polyArea(ring) >= 0 ? ring : ring.slice().reverse());

/**
 * Extrusion with draft: the profile at height z is offset by |z| * slope (positive = outward),
 * so a mid-plane or two-direction extrusion tapers away from the sketch plane on both sides.
 * Sides are planar quads per edge, caps are triangulated with the offset rings.
 */
function taperedExtrude(regions: Region[], z0: number, z1: number, slope: number): THREE.BufferGeometry | null {
  const pos: number[] = [];
  // outward winding, as THREE.ExtrudeGeometry delivers it (the plane basis is right-handed)
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
  const V = (p: SketchPoint, z: number) => new THREE.Vector3(p.x, p.y, z);
  const ringAt = (ring: SketchPoint[], z: number) => offsetPolyline(ring, Math.abs(z) * slope, true);
  // the taper grows away from the sketch plane: a span across z = 0 is built as two segments
  const levels = z0 < 0 && z1 > 0 ? [z0, 0, z1] : [z0, z1];
  for (const r of regions) {
    const rings = [ccw(dedupe(r.outer)), ...r.holes.map((h) => ccw(dedupe(h)))];
    if (rings[0].length < 3) continue;
    for (let L = 0; L + 1 < levels.length; L++) {
      const za = levels[L], zb = levels[L + 1];
      const bottom = rings.map((ring) => ringAt(ring, za));
      const top = rings.map((ring) => ringAt(ring, zb));
      rings.forEach((ring, k) => {
        const b = bottom[k], t = top[k];
        const n = ring.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const a0 = V(b[i], za), b0 = V(b[j], za), a1 = V(t[i], zb), b1 = V(t[j], zb);
          if (k === 0) {
            tri(a0, b0, b1);
            tri(a0, b1, a1);
          } else {
            tri(a0, b1, b0);
            tri(a0, a1, b1);
          }
        }
      });
    }
    // caps at the outer ends; earcut returns triangles wound opposite to the (counter-clockwise) contour
    const capTris = (ringsZ: SketchPoint[][]) => THREE.ShapeUtils.triangulateShape(ringsZ[0].map((p) => new THREE.Vector2(p.x, p.y)), ringsZ.slice(1).map((h) => h.map((p) => new THREE.Vector2(p.x, p.y))));
    const top = rings.map((ring) => ringAt(ring, z1)), bottom = rings.map((ring) => ringAt(ring, z0));
    const tf = top.flat(), bf = bottom.flat();
    for (const [a, b, c] of capTris(top)) tri(V(tf[a], z1), V(tf[c], z1), V(tf[b], z1));
    for (const [a, b, c] of capTris(bottom)) tri(V(bf[a], z0), V(bf[b], z0), V(bf[c], z0));
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** A ring without a repeated closing point or zero-length edges. */
function dedupe(ring: SketchPoint[]): SketchPoint[] {
  const out: SketchPoint[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) out.push(p);
  }
  if (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) <= 1e-6) out.pop();
  return out;
}

/**
 * Up To Surface / Offset From Surface: keep the part of a geometry on the sketch side of a plane
 * (the plane shifted by the offset toward the sketch, or past it when reversed).
 */
export function clipToSurface(g: THREE.BufferGeometry, surface: { normal: [number, number, number]; point: [number, number, number] }, sketchOrigin: [number, number, number], offset = 0, reverseOffset = false, reach = THROUGH_ALL): THREE.BufferGeometry {
  const n = new THREE.Vector3(...surface.normal).normalize();
  const p = new THREE.Vector3(...surface.point);
  // orient the normal away from the sketch
  if (new THREE.Vector3(...sketchOrigin).sub(p).dot(n) > 0) n.negate();
  p.addScaledVector(n, reverseOffset ? offset : -offset);
  const box = new THREE.BoxGeometry(2 * reach, 2 * reach, reach);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  box.applyQuaternion(q);
  box.translate(p.x - n.x * (reach / 2), p.y - n.y * (reach / 2), p.z - n.z * (reach / 2));
  return csg(g, box, 'intersect');
}

/** Axis of a revolve: the line entity of the sketch, in sketch coordinates. */
export function revolveAxis(sketch: Sketch, axisEntityId: string): { a: SketchPoint; b: SketchPoint } | null {
  const e = sketch.entities[axisEntityId];
  if (!e || e.kind !== 'line') return null;
  return { a: sketch.points[e.p1], b: sketch.points[e.p2] };
}

/**
 * Revolved solid of the outer loops around a line of the sketch (holes are not
 * supported in this phase). Partial angles get flat caps.
 */
export function revolveGeometry(regions: Region[], plane: PlaneDef, sketch: Sketch, f: Pick<RevolveFeature, 'axisEntityId' | 'angle' | 'reverse'> & { startAngle?: number }): THREE.BufferGeometry | null {
  const axis = revolveAxis(sketch, f.axisEntityId);
  if (!axis || !regions.length) return null;
  const ax = { x: axis.b.x - axis.a.x, y: axis.b.y - axis.a.y };
  const al = Math.hypot(ax.x, ax.y);
  if (al < 1e-9) return null;
  const dir = { x: ax.x / al, y: ax.y / al };
  const perp = { x: -dir.y, y: dir.x };
  const angle = Math.max(0.1, Math.min(360, f.angle)) * (Math.PI / 180);
  const parts: THREE.BufferGeometry[] = [];
  for (const r of regions) {
    // profile in (radius, height) along the axis; the whole loop must lie on one side
    const prof = r.outer.map((p) => {
      const d = { x: p.x - axis.a.x, y: p.y - axis.a.y };
      return new THREE.Vector2(d.x * perp.x + d.y * perp.y, d.x * dir.x + d.y * dir.y);
    });
    const side = Math.sign(prof.reduce((s, p) => (Math.abs(p.x) > Math.abs(s) ? p.x : s), 0)) || 1;
    const pts = prof.map((p) => new THREE.Vector2(Math.max(0, p.x * side), p.y));
    // close the loop for the lathe; orient the profile so the lathe's triangles face outward
    pts.push(pts[0].clone());
    if (meshVolume(new THREE.LatheGeometry(pts, 12)) < 0) pts.reverse();
    // the turn is divided finely enough for the largest radius of the profile (0.02 mm chord deviation)
    const rMax = Math.max(...pts.map((p) => p.x));
    const segs = Math.max(8, Math.ceil((Math.min(192, circleSegments(rMax, 64)) * angle) / (Math.PI * 2)));
    const phiStart = f.startAngle !== undefined ? (f.startAngle * Math.PI) / 180 : f.reverse ? -angle : 0;
    const lathe = new THREE.LatheGeometry(pts, segs, phiStart, angle);
    const list: THREE.BufferGeometry[] = [lathe.toNonIndexed()];
    if (angle < Math.PI * 2 - 1e-6) {
      // caps at both ends of the sweep
      const shape = new THREE.Shape(pts.slice(0, -1));
      for (const phi of [phiStart, phiStart + angle]) {
        const cap = new THREE.ShapeGeometry(shape).toNonIndexed();
        // the shape faces +phi; the start cap must face the other way
        if (phi === phiStart) flipWinding(cap);
        // shape (x = radius, y = height) -> lathe frame: x = r sin(phi), z = r cos(phi)
        const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)), new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi)));
        cap.applyMatrix4(m);
        list.push(cap);
      }
    }
    const merged = mergeGeometries(list);
    // lathe frame -> sketch plane: Y = axis dir, Z = perp (profile at phi = 0 lies in the plane), X = Y × Z
    const u = new THREE.Vector3(...plane.u), v = new THREE.Vector3(...plane.v), n = new THREE.Vector3(...plane.n);
    const o = new THREE.Vector3(...plane.origin);
    const Y = u.clone().multiplyScalar(dir.x).addScaledVector(v, dir.y);
    const Z = u.clone().multiplyScalar(perp.x * side).addScaledVector(v, perp.y * side);
    const X = Y.clone().cross(Z);
    const m = new THREE.Matrix4().makeBasis(X, Y, Z);
    m.setPosition(o.clone().addScaledVector(u, axis.a.x).addScaledVector(v, axis.a.y));
    merged.applyMatrix4(m);
    if (meshVolume(merged) < 0) flipWinding(merged);
    void n;
    // holes in the profile (a ring, a thin closed profile): their own revolve is taken out
    let solid: THREE.BufferGeometry = merged;
    if (r.holes.length) {
      const holeSolid = revolveGeometry(r.holes.map((h) => ({ outer: h, holes: [], area: 0 })), plane, sketch, f);
      if (holeSolid) solid = csg(merged, holeSolid, 'subtract');
    }
    parts.push(solid);
  }
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

/** Reverse the triangle winding of a non-indexed geometry (normals flip). */
export function flipWinding(g: THREE.BufferGeometry): void {
  const a = g.getAttribute('position');
  for (let i = 0; i + 2 < a.count; i += 3) {
    const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1);
    a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2));
    a.setXYZ(i + 2, x, y, z);
  }
  a.needsUpdate = true;
  g.deleteAttribute('normal');
  g.computeVertexNormals();
}

/** The connected pieces of a triangle soup (vertices welded by position) that touch the plane n·p = d. */
/** the separate pieces of a mesh (triangles connected through shared corner points), largest volume first */
export function meshPieces(g: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const tri = Math.floor(a.count / 3);
  const key = (i: number) => `${Math.round(a.getX(i) * 1e3)},${Math.round(a.getY(i) * 1e3)},${Math.round(a.getZ(i) * 1e3)}`;
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  const union = (x: string, y: string) => {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };
  for (let t = 0; t < tri; t++) {
    union(key(t * 3), key(t * 3 + 1));
    union(key(t * 3 + 1), key(t * 3 + 2));
  }
  const groups = new Map<string, number[]>();
  for (let t = 0; t < tri; t++) {
    const r = find(key(t * 3));
    (groups.get(r) ?? groups.set(r, []).get(r)!).push(t);
  }
  if (groups.size < 2) return [g];
  // boolean results have T-junctions (a corner on the edge of another triangle): such patches belong to one body.
  // Patches whose boxes touch are merged; a real split leaves a gap between the pieces.
  const lists = [...groups.values()];
  const boxOf = (ts: number[]) => {
    const b = new THREE.Box3();
    const v = new THREE.Vector3();
    for (const t of ts) for (let k = 0; k < 3; k++) b.expandByPoint(v.fromBufferAttribute(a, t * 3 + k));
    return b.expandByScalar(1e-3);
  };
  let merged = true;
  const items = lists.map((ts) => ({ ts, box: boxOf(ts) }));
  while (merged && items.length > 1) {
    merged = false;
    outer: for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      if (items[i].box.intersectsBox(items[j].box)) {
        items[i] = { ts: [...items[i].ts, ...items[j].ts], box: items[i].box.clone().union(items[j].box) };
        items.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  if (items.length < 2) return [g];
  const out = items.map((x) => x.ts).map((ts) => {
    const pos = new Float32Array(ts.length * 9);
    ts.forEach((t, i) => { for (let k = 0; k < 3; k++) { pos[i * 9 + k * 3] = a.getX(t * 3 + k); pos[i * 9 + k * 3 + 1] = a.getY(t * 3 + k); pos[i * 9 + k * 3 + 2] = a.getZ(t * 3 + k); } });
    const p = new THREE.BufferGeometry();
    p.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    p.computeVertexNormals();
    return p;
  });
  // slivers of a boolean (no volume) are not pieces of their own
  return out.map((p) => ({ p, v: Math.abs(meshVolume(p)) })).filter((x) => x.v > 1e-6).sort((x, y) => y.v - x.v).map((x) => x.p);
}

export function piecesTouchingPlane(g: THREE.BufferGeometry, n: THREE.Vector3, d: number, tol: number = TOL.plane): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const tri = a.count / 3;
  const key = (i: number) => `${Math.round(a.getX(i) * 1e3)},${Math.round(a.getY(i) * 1e3)},${Math.round(a.getZ(i) * 1e3)}`;
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  const union = (x: string, y: string) => {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };
  for (let t = 0; t < tri; t++) {
    const k0 = key(t * 3), k1 = key(t * 3 + 1), k2 = key(t * 3 + 2);
    union(k0, k1);
    union(k1, k2);
  }
  const touching = new Set<string>();
  const P = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) if (Math.abs(P.fromBufferAttribute(a, i).dot(n) - d) < tol) touching.add(find(key(i)));
  const pos: number[] = [];
  for (let t = 0; t < tri; t++) {
    if (!touching.has(find(key(t * 3)))) continue;
    for (let k = 0; k < 3; k++) pos.push(a.getX(t * 3 + k), a.getY(t * 3 + k), a.getZ(t * 3 + k));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

/** Concatenate non-indexed geometries (position + normal). */
export function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const tags: number[] = [];
  let named = false;
  for (const g of list) {
    const ng = g.index ? g.toNonIndexed() : g;
    const a = ng.getAttribute('position');
    const t = ng.getAttribute(FACE_TAG);
    if (t) named = true;
    for (let i = 0; i < a.count; i++) {
      pos.push(a.getX(i), a.getY(i), a.getZ(i));
      tags.push(t ? t.getX(i) : 0);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // the face names go along (F47)
  if (named) out.setAttribute(FACE_TAG, new THREE.Float32BufferAttribute(tags, 1));
  out.computeVertexNormals();
  return out;
}

const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal', FACE_TAG];
const csgMaterial = new THREE.MeshBasicMaterial();

/**
 * The triangles of a non-indexed geometry without the ones that have two coinciding corners (the poles of a lathe, the
 * tip of a cone): they have no area, but the boolean connects the triangles around them through their zero-length
 * edges and carries an inside/outside decision across the whole fan (a revolved part kept a lid over a cut through
 * its axis). The surface stays closed: the neighbours of such a triangle share their edges with each other.
 */
export function withoutDegenerate(ng: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = ng.getAttribute('position');
  const same = (i: number, j: number) => (p.getX(i) - p.getX(j)) ** 2 + (p.getY(i) - p.getY(j)) ** 2 + (p.getZ(i) - p.getZ(j)) ** 2 < 1e-18;
  const keep: number[] = [];
  for (let i = 0; i + 2 < p.count; i += 3) if (!same(i, i + 1) && !same(i + 1, i + 2) && !same(i, i + 2)) keep.push(i);
  if (keep.length * 3 === p.count) return ng;
  for (const name of Object.keys(ng.attributes)) {
    const a = ng.getAttribute(name) as THREE.BufferAttribute;
    const out = new (a.array.constructor as new (n: number) => THREE.TypedArray)(keep.length * 3 * a.itemSize);
    keep.forEach((t, k) => out.set(a.array.subarray(t * a.itemSize, (t + 3) * a.itemSize), k * 3 * a.itemSize));
    ng.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize, a.normalized));
  }
  return ng;
}

function brush(g: THREE.BufferGeometry): Brush {
  const ng = withoutDegenerate(g.index ? g.toNonIndexed() : g.clone());
  if (!ng.getAttribute('normal')) ng.computeVertexNormals();
  for (const name of Object.keys(ng.attributes)) if (name !== 'position' && name !== 'normal' && name !== FACE_TAG) ng.deleteAttribute(name);
  // both sides of a boolean carry the face names (0 where a face has none), so the result keeps them (F47)
  if (!ng.getAttribute(FACE_TAG)) ng.setAttribute(FACE_TAG, new THREE.BufferAttribute(new Float32Array(ng.getAttribute('position').count), 1));
  const b = new Brush(ng, csgMaterial);
  b.updateMatrixWorld();
  return b;
}

/** Boolean union / subtraction of two solids (world coordinates). */
export function csg(a: THREE.BufferGeometry, b: THREE.BufferGeometry, op: 'union' | 'subtract' | 'intersect'): THREE.BufferGeometry {
  // three-bvh-csg 0.0.18 builds its BVH with the old "maxLeafSize" option name; that one deprecation notice is
  // dropped here (it printed once per boolean, hundreds of times per test run, F35). Other warnings pass through.
  const warn = console.warn;
  console.warn = (...args: unknown[]) => { if (typeof args[0] === 'string' && args[0].includes('"maxLeafSize" option has been deprecated')) return; warn(...args); };
  let r: Brush;
  try {
    r = evaluator.evaluate(brush(a), brush(b), op === 'union' ? ADDITION : op === 'intersect' ? INTERSECTION : SUBTRACTION) as Brush;
  } finally {
    console.warn = warn;
  }
  const g = r.geometry;
  // the result is checked: no triangles (the bodies do not overlap, or the cut takes the whole body) or invalid
  // coordinates would otherwise travel on silently as an "empty body"
  const count = g.getAttribute('position')?.count ?? 0;
  if (!count) throw new Error(op === 'union' ? 'the union produced no geometry' : op === 'intersect' ? 'the bodies do not overlap' : 'the cut leaves nothing of the body');
  g.computeVertexNormals();
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  if (![bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].every(Number.isFinite)) throw new Error('the result has invalid coordinates');
  // volume check (F48): a boolean of two closed solids cannot gain material on a cut or an intersection, nor lose it on
  // a union. A result outside those bounds is a failed boolean and becomes a feature error, not a silent wrong body.
  // Open or inside-out inputs (surfaces, tools) have no meaningful volume and are not checked.
  // (the size of the result is compared: a few tools give a correctly sized but inside-out result)
  const va = meshVolume(a), vb = meshVolume(b), vr = Math.abs(meshVolume(g));
  if (!booleanVolumeOk(op, va, vb, vr)) throw new Error(`the boolean result failed the volume check (${op}: ${va.toFixed(2)} and ${vb.toFixed(2)} gave ${vr.toFixed(2)} mm³)`);
  // closed check (F48): two closed solids give a closed result. A hole in the surface leaves an open area (the sum of
  // the oriented triangle areas is no longer zero); T-junctions of the boolean do not count, they still close.
  // The mesh kernel's boolean leaves such cracks now and then: the body stays (as in the intended design a rebuild
  // warning, not an error) and the rebuild marks the feature with the size of the opening.
  if (isClosed(a) && isClosed(b) && !isClosed(g)) g.userData.openArea = openArea(g);
  return g;
}

/** can a boolean of solids with volumes va and vb give a result of volume vr? (open or inside-out inputs: not judged) */
export function booleanVolumeOk(op: 'union' | 'subtract' | 'intersect', va: number, vb: number, vr: number): boolean {
  if (!(va > 0 && vb > 0)) return true;
  const tol = 1e-3 * Math.max(va, vb) + 1e-6;
  if (op === 'subtract') return vr <= va + tol;
  if (op === 'intersect') return vr <= Math.min(va, vb) + tol;
  return vr >= Math.max(va, vb) - tol && vr <= va + vb + tol;
}

/** the size of the openings of a triangle mesh: the length of the sum of its oriented triangle areas (0 when closed) */
export function openArea(g: THREE.BufferGeometry): number {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  let x = 0, y = 0, z = 0;
  for (let i = 0; i + 2 < a.count; i += 3) {
    const ux = a.getX(i + 1) - a.getX(i), uy = a.getY(i + 1) - a.getY(i), uz = a.getZ(i + 1) - a.getZ(i);
    const vx = a.getX(i + 2) - a.getX(i), vy = a.getY(i + 2) - a.getY(i), vz = a.getZ(i + 2) - a.getZ(i);
    x += (uy * vz - uz * vy) / 2;
    y += (uz * vx - ux * vz) / 2;
    z += (ux * vy - uy * vx) / 2;
  }
  return Math.hypot(x, y, z);
}

/** the total area of a triangle mesh */
export function meshArea(g: THREE.BufferGeometry): number {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  let t = 0;
  for (let i = 0; i + 2 < a.count; i += 3) {
    const ux = a.getX(i + 1) - a.getX(i), uy = a.getY(i + 1) - a.getY(i), uz = a.getZ(i + 1) - a.getZ(i);
    const vx = a.getX(i + 2) - a.getX(i), vy = a.getY(i + 2) - a.getY(i), vz = a.getZ(i + 2) - a.getZ(i);
    t += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return t;
}

/** closed within round-off: the openings are below a thousandth of the area */
export function isClosed(g: THREE.BufferGeometry): boolean {
  const area = meshArea(g);
  return area > 0 && openArea(g) <= 1e-3 * area + 1e-6;
}

/** Signed volume of a closed triangle mesh (positive for outward-facing triangles). */
export function meshVolume(g: THREE.BufferGeometry): number {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  let vol = 0;
  for (let i = 0; i + 2 < a.count; i += 3) {
    const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i);
    const x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1);
    const x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2);
    vol += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6;
  }
  return vol;
}

/** A planar face of a body: coplanar triangles grouped together. */
export interface PlanarFace {
  id: string;
  normal: [number, number, number];
  centroid: [number, number, number];
  /** triangle indices into the non-indexed geometry */
  triangles: number[];
  area: number;
  /** true when the triangles of this face are part of a curved surface (small flat facets) */
  curved: boolean;
}

/**
 * Faces of a body for picking and highlighting: coplanar triangles grouped into planar faces
 * (slivers left by booleans are assigned to the plane their vertices lie on), and the facets
 * of curved surfaces (cylinders, fillets) merged into one face each, by design highlights
 * a whole cylindrical face.
 */
export function planarFaces(g: THREE.BufferGeometry, bodyId: string): PlanarFace[] {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const triCount = Math.floor(a.count / 3);
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  const normals: (THREE.Vector3 | null)[] = [];
  const areas: number[] = [];
  const groups = new Map<string, { n: THREE.Vector3; d: number; tris: number[]; area: number }>();
  let totalArea = 0;
  for (let t = 0; t < triCount; t++) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    const n = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    const area2 = n.length();
    areas.push(area2 / 2);
    totalArea += area2 / 2;
    if (area2 < 1e-12) {
      normals.push(null);
      continue;
    }
    n.divideScalar(area2);
    normals.push(n);
    const d = n.dot(p0);
    const fx = (v: number) => (Math.abs(v) < 0.0005 ? '0.000' : v.toFixed(3));
    const key = `${fx(n.x)},${fx(n.y)},${fx(n.z)}|${d.toFixed(2)}`;
    const gr = groups.get(key) ?? groups.set(key, { n: n.clone(), d, tris: [], area: 0 }).get(key)!;
    gr.tris.push(t);
    gr.area += area2 / 2;
  }
  // big planes: every triangle whose vertices lie on one belongs to that face, whatever its own normal
  const planes = [...groups.values()].filter((gr) => gr.area > totalArea * 0.005 && gr.area > 0.5).map((gr) => ({ n: gr.n, d: gr.d, tris: [] as number[], area: 0, c: new THREE.Vector3() }));
  const onPlane = (pl: { n: THREE.Vector3; d: number }, p: THREE.Vector3) => Math.abs(pl.n.dot(p) - pl.d) < 0.005;
  const facetOf: number[] = new Array(triCount).fill(-1);
  const leftovers: number[] = [];
  for (let t = 0; t < triCount; t++) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    let best = -1, bestDot = -Infinity;
    for (let i = 0; i < planes.length; i++) {
      const pl = planes[i];
      if (!onPlane(pl, p0) || !onPlane(pl, p1) || !onPlane(pl, p2)) continue;
      const dot = normals[t] ? pl.n.dot(normals[t]!) : 0;
      if (dot > bestDot) { bestDot = dot; best = i; }
    }
    if (best >= 0) {
      planes[best].tris.push(t);
      planes[best].area += areas[t];
      planes[best].c.addScaledVector(p0.add(p1).add(p2).divideScalar(3), areas[t]);
      facetOf[t] = best;
    } else if (normals[t]) leftovers.push(t);
  }
  // narrow planar facets of a tessellated cylinder or cone (neighbours meeting at a few degrees) are one curved face
  {
    const vk = (p: THREE.Vector3) => `${Math.round(p.x * 1e3)},${Math.round(p.y * 1e3)},${Math.round(p.z * 1e3)}`;
    const edgeOwners = new Map<string, Set<number>>();
    planes.forEach((pl, pi) => {
      for (const t of pl.tris) for (let k = 0; k < 3; k++) {
        const ka = vk(P(t * 3 + k)), kb = vk(P(t * 3 + ((k + 1) % 3)));
        const ek = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        (edgeOwners.get(ek) ?? edgeOwners.set(ek, new Set()).get(ek)!).add(pi);
      }
    });
    const up = planes.map((_, k) => k);
    const root = (x: number): number => (up[x] === x ? x : (up[x] = root(up[x])));
    const cosFacet = Math.cos((8 * Math.PI) / 180);
    for (const owners of edgeOwners.values()) {
      if (owners.size !== 2) continue;
      const [x, y] = [...owners];
      const dot = planes[x].n.dot(planes[y].n);
      if (dot > cosFacet && dot < 0.99999) up[root(x)] = root(y);
    }
    const size = new Map<number, number>();
    planes.forEach((_, k) => size.set(root(k), (size.get(root(k)) ?? 0) + 1));
    planes.forEach((pl, k) => {
      if ((size.get(root(k)) ?? 0) < 3) return;
      for (const t of pl.tris) { facetOf[t] = -1; if (normals[t]) leftovers.push(t); }
      pl.tris = [];
    });
  }
  const faces: PlanarFace[] = [];
  let i = 0;
  for (const pl of planes) {
    if (!pl.tris.length) continue;
    const c = pl.c.divideScalar(pl.area || 1);
    faces.push({ id: `${bodyId}:${i++}`, normal: [pl.n.x, pl.n.y, pl.n.z], centroid: [c.x, c.y, c.z], triangles: pl.tris, area: pl.area, curved: false });
  }
  // the rest are facets of curved surfaces: merge neighbours (shared edge) that bend gently
  const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e3)},${Math.round(p.y * 1e3)},${Math.round(p.z * 1e3)}`;
  const byVertex = new Map<string, number[]>();
  for (const t of leftovers) for (let k = 0; k < 3; k++) {
    const kk = key(P(t * 3 + k));
    (byVertex.get(kk) ?? byVertex.set(kk, []).get(kk)!).push(t);
  }
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let y = x;
    while (parent.get(y) !== r) { const nx = parent.get(y)!; parent.set(y, r); y = nx; }
    return r;
  };
  for (const t of leftovers) parent.set(t, t);
  const cosSmooth = Math.cos((30 * Math.PI) / 180);
  for (const t of leftovers) {
    const shared = new Map<number, number>();
    for (let k = 0; k < 3; k++) for (const o of byVertex.get(key(P(t * 3 + k))) ?? []) if (o !== t) shared.set(o, (shared.get(o) ?? 0) + 1);
    for (const [o, cnt] of shared) {
      if (cnt < 2) continue;
      if (normals[t]!.dot(normals[o]!) < cosSmooth) continue;
      parent.set(find(o), find(t));
    }
  }
  const curved = new Map<number, { tris: number[]; area: number; c: THREE.Vector3; n: THREE.Vector3 }>();
  for (const t of leftovers) {
    const r = find(t);
    const gr = curved.get(r) ?? curved.set(r, { tris: [], area: 0, c: new THREE.Vector3(), n: new THREE.Vector3() }).get(r)!;
    gr.tris.push(t);
    gr.area += areas[t];
    gr.c.addScaledVector(P(t * 3).add(P(t * 3 + 1)).add(P(t * 3 + 2)).divideScalar(3), areas[t]);
    gr.n.addScaledVector(normals[t]!, areas[t]);
  }
  for (const gr of curved.values()) {
    const c = gr.c.divideScalar(gr.area || 1);
    const n = gr.n.lengthSq() > 1e-12 ? gr.n.normalize() : new THREE.Vector3(0, 1, 0);
    faces.push({ id: `${bodyId}:${i++}`, normal: [n.x, n.y, n.z], centroid: [c.x, c.y, c.z], triangles: gr.tris, area: gr.area, curved: true });
  }
  return faces;
}
