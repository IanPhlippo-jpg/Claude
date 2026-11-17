import { circleSegments } from '../sketch/geometry';
import * as THREE from 'three';
import { isSketchBased, type Document, type ExtrudeFeature, type Feature, type RoundFeature, type SketchBasedFeature, type SolidFeature } from '../document/types';
import type { DraftFeature, RevolveFeature, PlaneDef } from '../document/types';
import type { Id } from '../sketch/types';
import { isReferencePlane, resolvePlaneDef } from './planes';
import { sketchRegions, type Region } from './regions';
import { clipToSurface, csg, extrudeGeometry, piecesTouchingPlane, planarFaces, planeMatrix, revolveGeometry, THROUGH_ALL, type PlanarFace } from './solid';
import { MeshBVH } from 'three-mesh-bvh';
import { bodyEdges, matchEdges, subEdgeAt, type BodyEdge } from './edgesets';
import { applyTools, cornerTools, keepEdgeRadii, roundTools, roundToolsOpts } from './round';
import { splitFaces } from './splitline';
import { brepKernel, type BrepKernel, type BrepShape } from './brepKernel';
import { loftGeometry, sketchPath, sweepGeometry } from './sweep';
import { loftProfileIds, loftThroughFeature } from './loftThrough';
import { sweepPathOf } from './compositeCurve';
import { sketchChains, thinRegions } from './thin';
import { copyFaceNames, FACE_TAG, nameFeatureFaces } from './faceNames';
import { buildFastening, isFasteningFeature } from './fasteningBuild';
import { buildSheetMetal } from './sheetMetalBuild';
import { buildFrame } from './frameBuild';
import { buildSurfaceFeature } from './surfaceBuild';
export { threadSpecOf } from './rebuildTools';
import { faceOutline, findFaceOnBodies } from './weldments';
import { brepTool } from './brepTool';
import { createRebuildCtx, RebuildStopped, type RebuildCtx } from './rebuildState';
import { planRebuild } from './rebuildCache';
import { buildCombine, buildCompositeCurve, buildDeform, buildDeleteBody, buildDeleteFace, buildDraft, buildHelix, buildImported, buildIntersect, buildMirror,
  buildMoveBody, buildRib, buildShell, buildSketch3d, buildThread } from './buildBodyOps';
import { buildHole, buildRound } from './buildHoleRound';
import { buildPattern } from './buildPatterns';

export interface Body {
  id: Id;
  geometry: THREE.BufferGeometry;
  faces: PlanarFace[];
  edges: BodyEdge[];
  featureIds: Id[];
  /** built by the B-rep kernel up to the last feature (exact surfaces); absent = mesh kernel */
  exact?: boolean;
  /** the volume of the B-rep solid (mm³) when exact */
  exactVolume?: number;
  /** what the viewport draws, worked out in the rebuild worker so the window does not (edges.ts displayOf) */
  display?: import('./edges').BodyDisplay;
}

export interface RebuildResult {
  bodies: Body[];
  /** feature id -> error text for features that could not be built */
  errors: Record<Id, string>;
  /** sketches consumed by a solid feature (shown as children in the tree) */
  consumedSketches: Set<Id>;
  /** Surface Bodies (open surfaces, not part of the solid booleans) */
  surfaceBodies?: Body[];
  /** reference curves (Helix/Spiral) to draw */
  curves?: { id: Id; name: string; points: THREE.Vector3[]; dashed?: boolean; color?: string }[];
  /** bodies the features hide themselves (Convert to Sheet Metal > Keep body) */
  autoHidden?: Id[];
  /** appearances copied by patterns (Propagate visual properties) */
  extraAppearances?: NonNullable<Document['faceAppearances']>;
  /** Performance Evaluation: rebuild time per feature (ms) */
  times?: Record<Id, number>;
  /** Bodies to Keep: per cut feature the number of pieces it split a body into (only cuts that split) */
  splitCounts?: Record<Id, number>;
  /** the B-rep solid of every exact body (only where a B-rep kernel is registered; the caller releases them) */
  brep?: Record<Id, BrepShape>;
  /** Weldments: per body the cut list data (description, length, miter angles) and its kind */
  bodyMeta?: Record<Id, { kind: 'member' | 'cap' | 'gusset' | 'bead' | 'other'; description: string; length: number; angle1: number; angle2: number }>;
  /** feature id -> rebuild warning (the feature is built, but something about it needs a look) */
  warnings?: Record<Id, string>;
  /** Convert to Sheet Metal / Insert Bends: the number of bends per feature (the sharp edges that became bends) */
  bendCounts?: Record<Id, number>;
  /** the wall-clock budget ran out: the features after it were marked, not built */
  stopped?: boolean;
  /** shown while the rebuild runs in the rebuild worker: the previous result, replaced when the worker is done */
  pending?: boolean;
}

/**
 * The end conditions of an extrusion that depend on the model (Up To Next, Up To Vertex, Direction 2 up to …) turned
 * into blind depths, the same for the mesh kernel and the B-rep kernel.
 */
export function resolveExtrudeEnds(f: ExtrudeFeature, regions: Region[], plane: PlaneDef, body: THREE.BufferGeometry | null | undefined): { fe: ExtrudeFeature } | { error: string } {
    let fe: ExtrudeFeature = f;
    // Direction 2 ▸ Up To Next / Up To Vertex / Up To Surface / Offset From Surface: the depth along the second direction
    if (f.direction2 && ['upToNext', 'upToVertex', 'upToSurface', 'offsetFromSurface'].includes(f.direction2.end)) {
      const d2 = f.direction2;
      const c = regionCentre(regions[0]);
      const origin = new THREE.Vector3(c.x, c.y, 0).applyMatrix4(planeMatrix(plane));
      const dir = new THREE.Vector3(...plane.n).multiplyScalar(f.reverse ? 1 : -1);
      let depth: number | null = null;
      if (d2.end === 'upToNext') {
        if (!body) return { error: 'Direction 2 ▸ Up To Next needs an existing solid body.' };
        const hit = new MeshBVH(body).raycastFirst(new THREE.Ray(origin.clone().addScaledVector(dir, 0.01), dir), THREE.DoubleSide);
        if (!hit) return { error: 'Direction 2 ▸ Up To Next: no face of the body in that direction.' };
        depth = hit.distance + 0.01;
      } else if (d2.end === 'upToVertex') {
        if (!d2.vertex) return { error: 'Direction 2: select the vertex.' };
        depth = new THREE.Vector3(...d2.vertex.point).sub(origin).dot(dir);
      } else {
        if (!d2.surface) return { error: 'Direction 2: select the face.' };
        const n = new THREE.Vector3(...d2.surface.normal);
        const den = n.dot(dir);
        if (Math.abs(den) < 1e-9) return { error: 'Direction 2: the face is parallel to the extrusion direction.' };
        depth = new THREE.Vector3(...d2.surface.point).sub(origin).dot(n) / den + (d2.end === 'offsetFromSurface' ? (d2.offset ?? 0) : 0);
      }
      if (depth === null || depth <= 1e-6) return { error: 'Direction 2: the end lies on the side of direction 1.' };
      fe = { ...fe, direction2: { end: 'blind', depth } };
    }
    if (f.end === 'upToNext') {
      // the first face of the body met along the extrusion direction (from the profile centre)
      if (!body) return { error: 'Up To Next needs an existing solid body.' };
      const c = regionCentre(regions[0]);
      const origin = new THREE.Vector3(c.x, c.y, 0).applyMatrix4(planeMatrix(plane));
      const dir = new THREE.Vector3(...plane.n).multiplyScalar(f.reverse ? -1 : 1);
      const hit = new MeshBVH(body).raycastFirst(new THREE.Ray(origin.clone().addScaledVector(dir, 0.01), dir), THREE.DoubleSide);
      if (!hit) return { error: 'Up To Next: no face of the body in the extrusion direction.' };
      fe = { ...fe, end: 'blind', depth: hit.distance + 0.01 };
    }
    if (f.end === 'upToVertex') {
      if (!f.vertex) return { error: 'Select a vertex (an end point of a model edge) for Up To Vertex.' };
      const d = new THREE.Vector3(...f.vertex.point).sub(new THREE.Vector3(...plane.origin)).dot(new THREE.Vector3(...plane.n));
      if (Math.abs(d) < 1e-6) return { error: 'The vertex lies in the sketch plane.' };
      fe = { ...fe, end: 'blind', depth: Math.abs(d), reverse: d < 0 };
    }
    return { fe };
}

/** Geometry of one sketch-based solid feature on its own (also used for the yellow preview). */
const centroid3 = (pts: THREE.Vector3[]) => pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length || 1);

/**
 * Loft ▸ Tangency To Face: the directions of the model faces next to a profile outline (each face that the outline
 * lies on and that is not the profile plane itself), taken in the face and away from the profile, pointing along the
 * loft. Most used first; Next Face steps through them.
 */
export function faceTangents(bodies: Body[], outline: THREE.Vector3[], n: THREE.Vector3, along: THREE.Vector3): THREE.Vector3[] {
  const found: { d: THREE.Vector3; hits: number }[] = [];
  const step = Math.max(1, Math.floor(outline.length / 24));
  for (const b of bodies) {
    for (const face of planarFaces(b.geometry, b.id)) {
      if (face.curved) continue;
      const m = new THREE.Vector3(...face.normal).normalize();
      if (Math.abs(m.dot(n)) > 0.99) continue;
      const c = new THREE.Vector3(...face.centroid);
      let hits = 0;
      for (let i = 0; i < outline.length; i += step) if (Math.abs(outline[i].clone().sub(c).dot(m)) < 0.05) hits++;
      if (!hits) continue;
      const d = n.clone().addScaledVector(m, -n.dot(m)).normalize();
      if (d.dot(along) < 0) d.negate();
      const same = found.find((x) => x.d.dot(d) > 0.999);
      if (same) same.hits += hits;
      else found.push({ d, hits });
    }
  }
  return found.sort((a, b) => b.hits - a.hits).map((x) => x.d);
}

export function featureGeometry(doc: Document, f: SketchBasedFeature, extent = THROUGH_ALL, body?: THREE.BufferGeometry | null, bodyList: Body[] = []): { geometry: THREE.BufferGeometry | null; error?: string } {
  const r = sketchedGeometry(doc, f, extent, body, bodyList);
  // the faces of an extrusion or a revolve are named after the feature and the sketch entities (F47, F110)
  const sketch = doc.sketches[f.sketchId];
  return r.geometry && sketch ? { ...r, geometry: nameFeatureFaces(r.geometry, f, sketch, resolvePlaneDef(doc, sketch.plane)) } : r;
}

function sketchedGeometry(doc: Document, f: SketchBasedFeature, extent = THROUGH_ALL, body?: THREE.BufferGeometry | null, bodyList: Body[] = []): { geometry: THREE.BufferGeometry | null; error?: string } {
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) return { geometry: null, error: 'The sketch of this feature no longer exists.' };
  // From ▸ Offset: the extrusion as from the sketch plane, moved along the plane normal
  if (f.type === 'extrude' && f.fromOffset) {
    const r = featureGeometry(doc, { ...f, fromOffset: undefined }, extent, body, bodyList);
    if (!r.geometry) return r;
    const n = resolvePlaneDef(doc, sketch.plane).n;
    const k = f.fromReverse ? -f.fromOffset : f.fromOffset;
    return { ...r, geometry: r.geometry.clone().translate(n[0] * k, n[1] * k, n[2] * k) };
  }
  let regions = sketchRegions(sketch);
  if ((f.type === 'extrude' || f.type === 'revolve') && f.contours && f.contours.length) regions = regions.filter((_, i) => f.contours!.includes(i));
  const plane = resolvePlaneDef(doc, sketch.plane);
  if (f.type === 'rib') return { geometry: null, error: 'A rib is built against the body (see the rebuild).' };
  if (f.type === 'baseFlange') return { geometry: null, error: 'A base flange is built in the rebuild.' };
  if (f.type === 'helix') return { geometry: null, error: 'A helix is a curve (sweep a profile along it).' };
  if (f.type === 'extrude' && f.thin) {
    // Auto-fillet corners: the sharp corners of the open profile are rounded before the wall is made
    const chains = sketchChains(sketch).map((c) => (f.thin!.autoFillet && f.thin!.autoFillet > 0 ? { ...c, points: roundCorners(c.points, f.thin!.autoFillet, c.closed) } : c));
    if (!chains.length) return { geometry: null, error: 'The sketch has no lines or arcs to make a thin feature from.' };
    regions = thinRegions(chains, f.thin);
  } else if (f.type === 'revolve' && f.thin) {
    // Thin Feature: the profile lines (not the axis) become a wall
    const ax = sketch.entities[f.axisEntityId];
    const axPts = ax && ax.kind === 'line' ? [sketch.points[ax.p1], sketch.points[ax.p2]] : null;
    const onAxis = (p: { x: number; y: number }) => !!axPts && Math.abs((axPts[1].x - axPts[0].x) * (p.y - axPts[0].y) - (axPts[1].y - axPts[0].y) * (p.x - axPts[0].x)) < 1e-6 * Math.hypot(axPts[1].x - axPts[0].x, axPts[1].y - axPts[0].y);
    const chains = sketchChains(sketch).filter((c) => !c.points.every(onAxis));
    if (!chains.length) return { geometry: null, error: 'The sketch has no lines or arcs to make a thin feature from.' };
    regions = thinRegions(chains, f.thin);
  } else if (!regions.length && !(f.type === 'sweep' && f.profileType === 'circular')) {
    return { geometry: null, error: f.type === 'extrude' && sketchChains(sketch).length ? 'The sketch is an open contour: use Thin Feature or close the profile.' : 'The sketch has no closed contour to build a solid from.' };
  }
  if (f.type === 'extrude') {
    const ends = resolveExtrudeEnds(f, regions, plane, body);
    if ('error' in ends) return { geometry: null, error: ends.error };
    const fe = ends.fe;
    if ((f.end === 'upToSurface' || f.end === 'offsetFromSurface') && !f.surface) return { geometry: null, error: 'Select the face the extrusion ends at.' };
    if (f.end === 'upToBody') {
      // through the target body, minus the body; the piece that starts at the sketch plane ends on the body's near side
      if (!f.upToBody) return { geometry: null, error: 'Select the solid body the extrusion runs up to.' };
      const target = bodyList.find((b) => b.id === f.upToBody!.bodyId);
      if (!target) return { geometry: null, error: 'The body for Up To Body no longer exists.' };
      const through = extrudeGeometry(regions, plane, { ...f, end: 'blind', depth: extent, draft: undefined }, extent, 0);
      if (!through) return { geometry: null, error: 'The extrusion has zero depth.' };
      try {
        const n = new THREE.Vector3(...plane.n);
        const rest = csg(through, target.geometry, 'subtract');
        const piece = piecesTouchingPlane(rest, n, n.dot(new THREE.Vector3(...plane.origin)));
        if (piece.getAttribute('position').count < 3) return { geometry: null, error: 'Up To Body: the body is not in the extrusion direction.' };
        piece.computeBoundingBox();
        const len = piece.boundingBox!.getSize(new THREE.Vector3()).dot(new THREE.Vector3(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)));
        if (len > extent * 0.9) return { geometry: null, error: 'Up To Body: the profile does not run into the selected body (flip the direction?).' };
        return { geometry: piece };
      } catch (err) {
        return { geometry: null, error: `Up To Body failed: ${(err as Error).message}` };
      }
    }
    // a cut sketched on a face starts a little outside it (no coplanar boolean); on a reference or offset plane the cut
    // starts at the plane itself, by design (a hair's breadth only, so a face lying in the plane is not coplanar)
    const onFace = !isReferencePlane(sketch.plane) && doc.planes[sketch.plane]?.kind !== 'reference';
    let g = extrudeGeometry(regions, plane, fe, extent, f.op === 'cut' ? (onFace ? 0.5 : 0.002) : 0);
    if (g && f.op === 'cut' && f.flipSide) {
      // Flip side to cut: the slab of the same depth minus the profile prism
      const c = regionCentre(regions[0]);
      const big = extent * 2;
      const square = { outer: [{ x: c.x - big, y: c.y - big }, { x: c.x + big, y: c.y - big }, { x: c.x + big, y: c.y + big }, { x: c.x - big, y: c.y + big }], holes: [], area: 4 * big * big };
      const slab = extrudeGeometry([square], plane, fe, extent, 0.5);
      if (slab) g = csg(slab, g, 'subtract');
    }
    if (g && (f.end === 'upToSurface' || f.end === 'offsetFromSurface') && f.surface) {
      try {
        // Translate surface: the offset runs along the extrusion (shorter along the face normal when it is tilted)
        let off = f.end === 'offsetFromSurface' ? f.offset ?? 0 : 0;
        if (off && f.translateSurface) off *= Math.abs(new THREE.Vector3(...f.surface.normal).normalize().dot(new THREE.Vector3(...plane.n).normalize()));
        g = clipToSurface(g, f.surface, plane.origin, off, !!f.reverseOffset, extent);
      } catch (err) {
        return { geometry: null, error: `Up To Surface failed: ${(err as Error).message}` };
      }
    }
    return g ? { geometry: g } : { geometry: null, error: 'The extrusion has zero depth.' };
  }
  if (f.type === 'sweep') {
    // the path: a sketch, a Helix/Spiral, a 3D sketch or a composite curve
    const { points: path, error: pathError } = sweepPathOf(doc, f.pathSketchId, bodyList);
    if (!path) return { geometry: null, error: pathError };
    const sweepOpts = { keepNormal: f.orientation === 'keepNormal', twist: f.twist };
    if (f.profileType === 'circular') {
      // Circular Profile: a circle of the given diameter on a plane normal to the path at its start
      const d = f.diameter ?? 5;
      if (!(d > 0)) return { geometry: null, error: 'The circular profile needs a diameter larger than zero.' };
      const t0 = path[1].clone().sub(path[0]).normalize();
      const ref = Math.abs(t0.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const u0 = ref.clone().cross(t0).normalize(), v0 = t0.clone().cross(u0).normalize();
      const cplane: PlaneDef = { id: 'sweep-circle', name: 'Profile', origin: [path[0].x, path[0].y, path[0].z], u: [u0.x, u0.y, u0.z], v: [v0.x, v0.y, v0.z], n: [t0.x, t0.y, t0.z] };
      const n = Math.max(24, circleSegments(d / 2, 48));
      const outer = Array.from({ length: n }, (_, i) => ({ x: (d / 2) * Math.cos((2 * Math.PI * i) / n), y: (d / 2) * Math.sin((2 * Math.PI * i) / n) }));
      const gc = sweepGeometry([{ outer, holes: [], area: Math.PI * d * d / 4 }], cplane, path, sweepOpts);
      return gc ? { geometry: gc } : { geometry: null, error: 'Could not sweep the circular profile along the path.' };
    }
    const g = sweepGeometry(regions, plane, path, sweepOpts);
    return g ? { geometry: g } : { geometry: null, error: 'Could not sweep the profile along the path.' };
  }
  if (f.type === 'loft') {
    if (f.profiles?.length) return loftThroughFeature(doc, f);
    // the second profile: a sketch, or a planar face of the model
    let region2: Region, plane2: PlaneDef;
    if (f.face2) {
      const hit = findFaceOnBodies(bodyList, f.face2);
      const outline = hit ? faceOutline(hit.body, hit.face) : null;
      if (!outline) return { geometry: null, error: 'The face of the second profile is no longer on the model.' };
      region2 = outline.region;
      plane2 = outline.plane;
    } else {
      const sketch2 = doc.sketches[f.sketchId2];
      if (!sketch2) return { geometry: null, error: 'Select a second profile sketch.' };
      const regions2 = sketchRegions(sketch2);
      if (!regions2.length) return { geometry: null, error: 'The second sketch has no closed contour.' };
      region2 = regions2[0];
      plane2 = resolvePlaneDef(doc, sketch2.plane);
    }
    const guides: THREE.Vector3[][] = [];
    for (const gid of f.guides ?? []) {
      const gs = doc.sketches[gid];
      if (!gs) return { geometry: null, error: 'A guide curve sketch no longer exists.' };
      let pts = sketchPath(gs, resolvePlaneDef(doc, gs.plane));
      if (!pts) return { geometry: null, error: 'A guide curve sketch has no lines, arcs or splines.' };
      // Guide tangency type > Normal to profile: the guide leaves each profile plane at a right angle
      if (f.guideTangency === 'normal') pts = guideNormalToProfiles(pts, new THREE.Vector3(...plane.n), new THREE.Vector3(...plane2.n));
      guides.push(pts);
    }
    // Centerline Parameters: the sketch curve the section centres follow
    let centerline: THREE.Vector3[] | undefined;
    if (f.centerline) {
      const cs = doc.sketches[f.centerline];
      const pts = cs ? sketchPath(cs, resolvePlaneDef(doc, cs.plane)) : null;
      if (!pts) return { geometry: null, error: 'The centerline sketch has no lines, arcs or splines.' };
      centerline = pts;
    }
    // Tangency / Curvature To Face: the loft leaves (or meets) the profile along the faces next to it; Curvature To Face
    // also carries their bend on, approximated by a longer tangent
    const world = (r: Region, pl: PlaneDef) => r.outer.map((q) => new THREE.Vector3(...pl.origin).addScaledVector(new THREE.Vector3(...pl.u), q.x).addScaledVector(new THREE.Vector3(...pl.v), q.y));
    const w1 = world(regions[0], plane), w2 = world(region2, plane2);
    const axis = centroid3(w2).sub(centroid3(w1));
    const faceDir = (end: 'start' | 'end'): [number, number, number] | undefined => {
      const type = end === 'start' ? f.startType : f.endType;
      if (type === 'direction') return end === 'start' ? f.startDir : f.endDir;
      if (type !== 'tangent' && type !== 'curvature') return undefined;
      const dirs = faceTangents(bodyList, end === 'start' ? w1 : w2, new THREE.Vector3(...(end === 'start' ? plane : plane2).n), axis);
      if (!dirs.length) return undefined;
      const d = dirs[((end === 'start' ? f.startFace : f.endFace) ?? 0) % dirs.length];
      return [d.x, d.y, d.z];
    };
    const weight = (end: 'start' | 'end') => {
      const w = end === 'start' ? f.startNormal : f.endNormal;
      return w !== undefined && (end === 'start' ? f.startType : f.endType) === 'curvature' ? w * 1.5 : w;
    };
    const g = loftGeometry(regions[0], plane, region2, plane2, 64, guides, { centerline, start: weight('start'), end: weight('end'), startDir: faceDir('start'), endDir: faceDir('end') });
    return g ? { geometry: g } : { geometry: null, error: 'Could not loft between the profiles.' };
  }
  // Mid-Plane: half the angle each way; Direction 2: the second angle on the other side
  const a1 = Math.max(0.1, Math.min(360, f.angle));
  let rv: Pick<RevolveFeature, 'axisEntityId' | 'angle' | 'reverse'> & { startAngle?: number } = f;
  if (f.end === 'midPlane') rv = { ...f, angle: a1, startAngle: -a1 / 2 };
  else if (f.direction2) {
    const a2 = Math.max(0, Math.min(360 - a1, f.direction2.angle));
    rv = { ...f, angle: a1 + a2, startAngle: f.reverse ? -a1 : -a2 };
  }
  const g = revolveGeometry(regions, plane, sketch, rv);
  return g ? { geometry: g } : { geometry: null, error: 'Select a line of the sketch as the axis of revolution.' };
}


/**
 * Draft (Neutral Plane): every face turns about its line on the neutral plane so that it leans inward along the
 * direction of pull (the part gets smaller away from the neutral plane); the material outside is cut away.
 */
export function draftOnBody(geometry: THREE.BufferGeometry, f: Pick<DraftFeature, 'angle' | 'neutral' | 'faces' | 'reverse' | 'draftType' | 'parting' | 'partingSides' | 'propagation'>): { geometry: THREE.BufferGeometry | null; error?: string } {
  const type = f.draftType ?? 'neutral';
  if (!f.neutral) return { geometry: null, error: type === 'neutral' ? 'Select the neutral plane (a planar face).' : 'Select the direction of pull (a planar face).' };
  if (type !== 'neutral' && !f.parting) return { geometry: null, error: 'Select the parting line (an edge or a point on it).' };
  const th = (Math.max(0.01, Math.min(60, f.angle)) * Math.PI) / 180;
  // direction of pull: into the part from the neutral face (Reverse flips it)
  const pull = new THREE.Vector3(...f.neutral.normal).negate();
  if (f.reverse) pull.negate();
  // the hinge plane: the neutral face, or the plane through the parting line normal to the pull
  const dp = pull.dot(new THREE.Vector3(...(type === 'neutral' ? f.neutral.point : f.parting!.point)));
  // Face propagation: the side faces of the body (normal to the pull) chosen by the option
  let faces = f.faces;
  const prop = f.propagation ?? 'none';
  if (prop !== 'none') {
    const all = planarFaces(geometry, 'd').filter((fc) => Math.abs(new THREE.Vector3(...fc.normal).dot(pull)) < 0.01);
    const centre = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute('position') as THREE.BufferAttribute).getCenter(new THREE.Vector3());
    const outward = (fc: PlanarFace) => new THREE.Vector3(...fc.centroid).sub(centre).dot(new THREE.Vector3(...fc.normal)) > 0;
    const picked = prop === 'all' ? all : prop === 'outer' ? all.filter(outward) : prop === 'inner' ? all.filter((fc) => !outward(fc)) : all.filter((fc) => f.faces.some((s) => new THREE.Vector3(...s.normal).dot(new THREE.Vector3(...fc.normal)) > 0.99 && Math.abs(new THREE.Vector3(...s.normal).dot(new THREE.Vector3(...fc.centroid).sub(new THREE.Vector3(...s.point)))) < 1e-3));
    const key = (p: number[]) => p.map((x) => x.toFixed(3)).join(',');
    const seen = new Set(faces.map((x) => key(x.point)));
    faces = [...faces, ...picked.filter((fc) => !seen.has(key(fc.centroid))).map((fc, i) => ({ normal: fc.normal, point: fc.centroid, label: `Face<${f.faces.length + i + 1}>` }))];
  }
  if (!faces.length) return { geometry: null, error: 'Select the faces to draft.' };
  // the sides of the hinge that taper: neutral / step: along the pull; parting line: one, the other or both sides
  const sides: number[] = type === 'parting' ? (f.partingSides === 'other' ? [-1] : f.partingSides === 'both' ? [1, -1] : [1]) : [1];
  let g = geometry;
  for (const face of faces) {
    const nf = new THREE.Vector3(...face.normal).normalize();
    if (Math.abs(nf.dot(pull)) > 0.99) return { geometry: null, error: `${face.label} is parallel to the neutral plane and cannot be drafted.` };
    // the hinge line: on the face plane and on the hinge plane
    const c = new THREE.Vector3(...face.point);
    const x0 = c.clone().addScaledVector(pull, dp - pull.dot(c));
    for (const sd of sides) {
      const dir = pull.clone().multiplyScalar(sd);
      const n2 = nf.clone().multiplyScalar(Math.cos(th)).addScaledVector(dir, Math.sin(th)).normalize();
      const keep = x0.clone().addScaledVector(nf, -1);
      g = clipToSurface(g, { normal: [n2.x, n2.y, n2.z], point: [x0.x, x0.y, x0.z] }, [keep.x, keep.y, keep.z]);
    }
  }
  return { geometry: g };
}


/** round the sharp corners of a polyline with arcs of radius r (Auto-fillet corners of a thin feature) */
export function roundCorners(pts: { x: number; y: number }[], r: number, closed: boolean): { x: number; y: number }[] {
  const n = pts.length;
  if (n < 3) return pts;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const end = !closed && (i === 0 || i === n - 1);
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    if (end) { out.push(p); continue; }
    const u = { x: a.x - p.x, y: a.y - p.y }, v = { x: b.x - p.x, y: b.y - p.y };
    const lu = Math.hypot(u.x, u.y), lv = Math.hypot(v.x, v.y);
    if (lu < 1e-9 || lv < 1e-9) { out.push(p); continue; }
    const cos = (u.x * v.x + u.y * v.y) / (lu * lv);
    const ang = Math.acos(Math.max(-1, Math.min(1, cos)));
    // gently turning vertices (arc facets) stay as they are
    if (ang > Math.PI - 0.35) { out.push(p); continue; }
    const t = Math.min(r / Math.tan(ang / 2), lu * 0.49, lv * 0.49);
    const rr = t * Math.tan(ang / 2);
    const p1 = { x: p.x + (u.x / lu) * t, y: p.y + (u.y / lu) * t }, p2 = { x: p.x + (v.x / lv) * t, y: p.y + (v.y / lv) * t };
    const bis = { x: u.x / lu + v.x / lv, y: u.y / lu + v.y / lv };
    const lb = Math.hypot(bis.x, bis.y) || 1;
    const c = { x: p.x + (bis.x / lb) * (rr / Math.sin(ang / 2)), y: p.y + (bis.y / lb) * (rr / Math.sin(ang / 2)) };
    const a0 = Math.atan2(p1.y - c.y, p1.x - c.x), a1 = Math.atan2(p2.y - c.y, p2.x - c.x);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const steps = Math.max(4, Math.ceil(Math.abs(d) / (Math.PI / 16)));
    for (let k = 0; k <= steps; k++) out.push({ x: c.x + rr * Math.cos(a0 + (d * k) / steps), y: c.y + rr * Math.sin(a0 + (d * k) / steps) });
  }
  return out;
}

/** a guide curve bent so it leaves the first profile along n1 and meets the second along n2 (Hermite blend over a third of it) */
function guideNormalToProfiles(pts: THREE.Vector3[], n1: THREE.Vector3, n2: THREE.Vector3): THREE.Vector3[] {
  if (pts.length < 3) return pts;
  const dir = pts[pts.length - 1].clone().sub(pts[0]);
  const a = n1.clone().normalize().multiplyScalar(n1.dot(dir) < 0 ? -1 : 1), b = n2.clone().normalize().multiplyScalar(n2.dot(dir) < 0 ? -1 : 1);
  const k = Math.max(2, Math.floor(pts.length / 3));
  return pts.map((p, i) => {
    if (i <= k) {
      const w = 1 - i / k;
      const straight = pts[0].clone().addScaledVector(a, p.clone().sub(pts[0]).dot(a));
      return p.clone().lerp(straight, w * w);
    }
    if (i >= pts.length - 1 - k) {
      const w = 1 - (pts.length - 1 - i) / k;
      const end = pts[pts.length - 1];
      const straight = end.clone().addScaledVector(b, p.clone().sub(end).dot(b));
      return p.clone().lerp(straight, w * w);
    }
    return p;
  });
}


/** Centre of a region (mean of its outer polygon). */
export function regionCentre(r: Region): { x: number; y: number } {
  let x = 0, y = 0;
  for (const p of r.outer) { x += p.x; y += p.y; }
  const n = r.outer.length || 1;
  return { x: x / n, y: y / n };
}

/** Apply a fillet/chamfer feature to a body geometry; returns the new geometry or an error. */
export function applyRoundFeature(geometry: THREE.BufferGeometry, f: RoundFeature): { geometry: THREE.BufferGeometry | null; error?: string; /** edge references that no longer match after the rebuild (dangling) */ lost?: number; edges: BodyEdge[]; tools?: { cutters: THREE.BufferGeometry[]; adders: THREE.BufferGeometry[] } } {
  const edges = bodyEdges(geometry, 'tmp');
  // Tangent propagation off: only the run (straight or curved) of the chain where the edge was picked
  // an edge split by a feature inserted before this one is rounded in all its pieces (F111); radii follow the pieces
  const found = f.edges.map((r) => matchEdges(edges, r).map((e) => (f.tangentPropagation === false && r.pick ? subEdgeAt(e, new THREE.Vector3(...r.pick)) : e)));
  const matched = found.flat();
  if (!matched.length) return { geometry: null, error: 'None of the selected edges exist on the body any more (dangling references).', edges };
  const lost = found.filter((x) => !x.length).length;
  if (f.radii?.length) f = { ...f, radii: found.flatMap((x, i) => x.map(() => f.radii![i] ?? f.size)) };
  if (f.size <= 0) return { geometry: null, error: 'The size must be larger than zero.', edges };
  try {
    // Overflow type > Keep edge: each radius at most what keeps the tangent lines on the adjacent faces
    let radii = f.radii;
    if (f.overflow === 'keepEdge') {
      const pf = planarFaces(geometry, 'k');
      const src = geometry.index ? geometry.toNonIndexed() : geometry;
      const pa = src.getAttribute('position');
      const faces = pf.map((fc) => ({ normal: fc.normal, points: fc.triangles.flatMap((t) => [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pa, t * 3 + k))) }));
      const lim = keepEdgeRadii(matched, f.size, faces);
      radii = matched.map((_, i) => Math.min(f.radii?.[i] ?? f.size, lim[i]));
    }
    const opts = { size2: f.type === 'chamfer' && f.roundType === 'angleDistance' ? f.size * Math.tan(((f.angle ?? 45) * Math.PI) / 180) : f.size2, profile: f.profile, rho: f.rho, radii, variable: f.roundType === 'variable' ? f.variable : undefined, partial: f.partial };
    const plain = !opts.size2 && (!opts.profile || opts.profile === 'circular') && !opts.radii && !opts.variable && !opts.partial;
    const tools = plain ? roundTools(matched, f.type, f.size) : roundToolsOpts(matched, f.type, f.size, opts);
    // Break Corner > Internal corners only: the convex corners keep their edge
    if (f.internalOnly) tools.cutters = [];
    // Round corners / Setback: sphere corners where filleted edges meet
    if (f.type === 'fillet' && (f.roundCorners || (f.setback ?? 0) > 0)) tools.cutters.push(...cornerTools(matched, f.size, { roundCorners: f.roundCorners, setback: f.setback }));
    return { lost, geometry: applyTools(geometry, tools.cutters, tools.adders), edges, tools };
  } catch (err) {
    return { geometry: null, error: `Boolean operation failed: ${(err as Error).message}`, edges };
  }
}

/** wall-clock budget of one rebuild (ms); the features after it are marked instead of computed */
export let rebuildBudgetMs = 45_000;
export function setRebuildBudget(ms: number): void {
  rebuildBudgetMs = Math.max(0, ms);
}

/** the builder of one feature type: it builds f into ctx (an error goes into ctx.errors); false = not handled here */
type Builder = (f: Feature, body: Body | undefined, ctx: RebuildCtx) => boolean | void;
const builder = <F extends Feature>(b: (f: F, body: Body | undefined, ctx: RebuildCtx) => boolean | void) => b as Builder;

const surface = builder((f, body, ctx) => buildSurfaceFeature(f, body, ctx));
const sheetMetal = builder((f, body, ctx) => buildSheetMetal(f, body, ctx));
const frame = builder((f, _body, ctx) => buildFrame(f, ctx));
const fastening = builder((f, body, ctx) => {
  const { doc, bodies, visibleBodies, errors, curves, K, addMaterial, removeMaterial, addBoss, exactOf, setExact } = ctx;
  const c = { doc, bodies, body, visibleBodies, errors, curves, K, addMaterial, removeMaterial, addBoss, exactOf, setExact };
  if (isFasteningFeature(f)) buildFastening(f, c);
});
const pattern = builder(buildPattern);

/**
 * The builder of every feature type (QA 0.5.14 P2-14); a type that is not listed is a sketch-based solid (extrude,
 * revolve, sweep, loft: buildSketched). Sketches are skipped by the loop itself.
 */
const BUILDERS: Partial<Record<Feature['type'], Builder>> = {
  imported: builder(buildImported), sketch3d: builder(buildSketch3d), compositeCurve: builder(buildCompositeCurve),
  curvePoints: builder(buildCompositeCurve), helix: builder(buildHelix), draft: builder(buildDraft), rib: builder(buildRib),
  mirror: builder(buildMirror), shell: builder(buildShell), thread: builder(buildThread), deleteFace: builder(buildDeleteFace),
  moveBody: builder(buildMoveBody), deleteBody: builder(buildDeleteBody), deform: builder(buildDeform), hole: builder(buildHole),
  fillet: builder(buildRound), chamfer: builder(buildRound), intersect: builder(buildIntersect), combine: builder(buildCombine),
  weldment: () => {},
  linearPattern: pattern, circularPattern: pattern, sketchPattern: pattern, curvePattern: pattern, tablePattern: pattern, fillPattern: pattern,
  variablePattern: pattern,
  splitLine: surface, projectedCurve: surface, wrap: surface, surface,
  structuralMember: frame, trimExtend: frame, endCap: frame, weldGusset: frame, weldBead: frame,
  stud: fastening, dome: fastening, indent: fastening, mountingBoss: fastening, snapHook: fastening, lipGroove: fastening,
};
for (const t of ['baseFlange', 'miterFlange', 'jog', 'sketchedBend', 'edgeFlange', 'hem', 'unfold', 'fold', 'flatPattern', 'crossBreak', 'closedCorner',
  'cornerRelief', 'loftedBend', 'vent', 'formTool', 'gusset', 'tabSlot', 'rip', 'sweptFlange', 'convertSheet'] as const) BUILDERS[t] = sheetMetal;

/** a sketch-based solid (extrude, revolve, sweep, loft …): its tool, added to or cut from the bodies */
function buildSketched(f: Feature, body: Body | undefined, ctx: RebuildCtx): void {
  const { doc, bodies, errors, history, K, addMaterial, removeMaterial, addBoss, exactOf, allVisible } = ctx;
  let extent = THROUGH_ALL;
  const all = allVisible();
  if (all) {
    all.computeBoundingSphere();
    extent = Math.max(10, (all.boundingSphere?.radius ?? 0) * 3 + 10);
  }
  // sheet metal cut: Link to thickness makes the depth the sheet thickness (a normal cut through one sheet)
  const linked = f.type === 'extrude' && f.op === 'cut' && f.linkToThickness && doc.sheetMetal;
  const fx: Feature = linked ? { ...f, end: 'blind', depth: doc.sheetMetal!.thickness } : f;
  const r = featureGeometry(doc, fx as SketchBasedFeature, extent, all, bodies);
  if (!r.geometry) {
    errors[f.id] = r.error ?? 'Could not build the feature.';
    return;
  }
  // the same tool as a B-rep solid, for the features the B-rep kernel builds (null: mesh kernel only)
  let toolShape: BrepShape | null = null;
  if (K) {
    try {
      toolShape = brepTool(K, doc, fx, extent, r.geometry, all, (id) => exactOf(bodies.find((b) => b.id === id)));
    } catch {
      toolShape = null;
    }
  }
  const sf = f as SolidFeature & { op: 'boss' | 'cut'; merge?: boolean; scope?: Id[] };
  try {
    if (sf.op === 'boss') {
      // Merge result (default on): join the bodies the new material touches; off: a separate body
      addMaterial(r.geometry, f.id, sf.merge !== false, sf.scope, toolShape ?? undefined);
      addBoss(r.geometry);
    } else {
      if (!body) {
        errors[f.id] = 'A cut needs an existing solid body.';
        return;
      }
      if (!removeMaterial(r.geometry, f.id, sf.scope, toolShape ?? undefined)) {
        errors[f.id] = 'The cut does not touch any body (check the Feature Scope).';
        return;
      }
      history.cuts.push(r.geometry);
    }
  } catch (err) {
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

const stopMessage = () =>
  `Not rebuilt: the rebuild stopped after ${Math.round(rebuildBudgetMs / 1000)} s. Reduce the pattern counts or suppress heavy features, then rebuild.`;

/** one feature built into ctx, with the bookkeeping around it (time, face names, exactness and openings) */
function runFeature(f: Feature, ctx: RebuildCtx, clock: () => number): void {
  const { bodies, errors, warnings, consumedSketches, K, exactOf, featureTools } = ctx;
  const t0 = clock();
  const before = new Map(bodies.map((b) => [b, b.geometry]));
  const exactBefore = new Set(bodies.filter((b) => exactOf(b)));
  featureTools.length = 0;
  const undo = ctx.checkpoint();
  // one feature failing never takes the whole rebuild down: it is marked and the rest goes on
  try {
    if (isSketchBased(f)) consumedSketches.add(f.sketchId);
    if (f.type === 'sweep') consumedSketches.add(f.pathSketchId);
    if (f.type === 'edgeFlange' && f.profileSketchId) consumedSketches.add(f.profileSketchId);
    if (f.type === 'loft') {
      for (const id of loftProfileIds(f)) consumedSketches.add(id);
      for (const g of f.guides ?? []) consumedSketches.add(g);
    }
    if (f.suppressed) return;
    const body = ctx.visibleBodies()[0] ?? bodies[0];
    const build = BUILDERS[f.type];
    if (!build || build(f, body, ctx) === false) buildSketched(f, body, ctx);
  } catch (err) {
    if (err instanceof RebuildStopped) {
      // the budget ran out inside this feature (a long pattern): it is left out as a whole, like the ones after it
      undo();
      errors[f.id] = stopMessage();
      throw err;
    }
    // an internal error (missing data) is said in words; the technical text stays in brackets for a bug report
    const inWords = err instanceof TypeError || err instanceof RangeError;
    const msg = (err as Error).message;
    const why = inWords ? `its data is incomplete or refers to geometry that no longer exists (${msg}).` : msg;
    if (!errors[f.id]) errors[f.id] = `${f.name} could not be built: ${why}`;
  } finally {
    ctx.times[f.id] = (ctx.times[f.id] ?? 0) + (clock() - t0);
    // face names (F47): a body this feature rebuilt without them (a B-rep tessellation, a fillet) takes them from
    // the body before and the feature's tools
    for (const b of bodies) {
      if (b.geometry === before.get(b) || b.geometry.getAttribute(FACE_TAG)) continue;
      const prev = before.get(b);
      copyFaceNames(prev ? [prev, ...featureTools] : featureTools, b.geometry);
    }
    // a body that was exact and is faceted from this feature on (no B-rep version of it): said once, here (QA F51)
    const last = (b: Body) => b.featureIds[b.featureIds.length - 1] === f.id;
    if (K && !errors[f.id] && !warnings[f.id] && bodies.some((b) => last(b) && !exactOf(b) && exactBefore.has(b))) {
      const faceted = 'from here on this body is a faceted mesh (Faceted in the status bar); its mass properties and STEP are approximate.';
      warnings[f.id] = `${f.name} has no exact (B-rep) version: ${faceted}`;
    }
    // the manifold gate (F48): a boolean of this feature left an opening in a body
    const open = bodies.filter((b) => last(b) && b.geometry.userData.openArea);
    if (open.length && !errors[f.id]) {
      const area = Math.max(...open.map((b) => b.geometry.userData.openArea as number)).toFixed(2);
      warnings[f.id] = `The faceted result is not closed (an opening of about ${area} mm²): mass properties and STEP of this body are approximate.`;
    }
  }
}

/** Evaluate the feature history in order (up to the rollback index) into solid bodies. */
export function rebuildDocument(doc: Document, upTo: number | null = null): RebuildResult {
  const n = upTo === null ? doc.features.length : Math.min(upTo, doc.features.length);
  const K: BrepKernel | null = brepKernel();
  const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  const started = clock();
  const overBudget = () => clock() - started >= rebuildBudgetMs;
  // incremental rebuild (P2-5a): go on from the state after the longest unchanged start of the tree (rebuildCache.ts)
  const plan = planRebuild(doc, n, K, !overBudget());
  const ctx = createRebuildCtx(doc, K, overBudget, plan.seed);
  const { bodies, errors, curves, approxBodies, splits } = ctx;
  let outOfTime = false, built = 0;
  for (let i = plan.start; i < n; i++) {
    const f: Feature = ctx.sizedByHoldLine(doc.features[i]);
    if (f.type === 'sketch') {
      plan.record(i, ctx, true);
      continue;
    }
    // the rebuild never blocks the window for minutes: past the budget the rest is marked and skipped (F46)
    if (!outOfTime && overBudget()) {
      outOfTime = true;
      plan.stop();
    }
    if (outOfTime) {
      if (!f.suppressed) errors[f.id] = stopMessage();
      continue;
    }
    built++;
    try {
      runFeature(f, ctx, clock);
    } catch (err) {
      if (!(err instanceof RebuildStopped)) throw err;
      outOfTime = true;
      plan.stop();
      continue;
    }
    plan.record(i, ctx, false);
  }
  plan.finish(built);
  const brep: Record<Id, BrepShape> = {};
  for (const b of bodies) {
    const ex = ctx.exactOf(b);
    if (ex && K) {
      b.exact = !approxBodies.has(b);
      brep[b.id] = ex;
      try { b.exactVolume = K.volume(ex); } catch { /* the tessellation's volume is used */ }
    }
  }
  // the solids the rebuild cache keeps are kept as well (pinnedShapes)
  K?.release(Object.values(brep));
  for (const b of bodies) {
    const sp = splits.get(b.id) ?? [];
    const r = splitFaces(b.geometry, planarFaces(b.geometry, b.id), sp);
    b.faces = r.faces;
    b.edges = bodyEdges(b.geometry, b.id, 20, r.segments);
  }
  // Create Bounding Box: the box around all solid bodies, as dashed lines
  if (doc.boundingBox && bodies.length) {
    const box = new THREE.Box3();
    for (const b of bodies) { b.geometry.computeBoundingBox(); if (b.geometry.boundingBox) box.union(b.geometry.boundingBox); }
    const { min, max } = box;
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const bottom = [P(min.x, min.y, min.z), P(max.x, min.y, min.z), P(max.x, min.y, max.z), P(min.x, min.y, max.z), P(min.x, min.y, min.z)];
    const top = bottom.map((p) => P(p.x, max.y, p.z));
    curves.push({ id: 'bbox:bottom', name: 'Bounding Box', points: bottom, dashed: true, color: '#5a5a5a' });
    curves.push({ id: 'bbox:top', name: 'Bounding Box', points: top, dashed: true, color: '#5a5a5a' });
    for (let i = 0; i < 4; i++) curves.push({ id: `bbox:v${i}`, name: 'Bounding Box', points: [bottom[i], top[i]], dashed: true, color: '#5a5a5a' });
  }
  const { splitCounts, warnings, bendCounts } = ctx;
  return {
    bodies, errors, consumedSketches: ctx.consumedSketches, curves, surfaceBodies: ctx.surfaceBodies, extraAppearances: ctx.extraAppearances,
    autoHidden: ctx.autoHidden, times: ctx.times, bodyMeta: ctx.bodyMeta, ...(K ? { brep } : {}),
    ...(Object.keys(splitCounts).length ? { splitCounts } : {}), ...(outOfTime ? { stopped: true } : {}),
    ...(Object.keys(warnings).length ? { warnings } : {}), ...(Object.keys(bendCounts).length ? { bendCounts } : {}),
  };
}
