import { deleteFaces } from './deleteface';
import { extendSurface, fillLoops, flattenSurface, halfSpaceBox, ruledSurface } from './surfaces2';
import { circleSegments } from '../sketch/geometry';
import * as THREE from 'three';
import { TOL } from './tolerance';
import { isRoundFeature, isSketchBased, type Document, type ExtrudeFeature, type Feature, type RoundFeature, type SketchBasedFeature, type SolidFeature } from '../document/types';
import type { Id } from '../sketch/types';
import { isReferencePlane, resolvePlaneDef } from './planes';
import { sketchRegions } from './regions';
import { clipToSurface, csg, extrudeGeometry, flipWinding, meshPieces, meshVolume, mergeGeometries, piecesTouchingPlane, planarFaces, planeMatrix, revolveGeometry, THROUGH_ALL, type PlanarFace } from './solid';
import { MeshBVH } from 'three-mesh-bvh';
import type { Region } from './regions';
import { bodyEdges, matchEdge, matchEdges, subEdgeAt, type BodyEdge } from './edgesets';
import { applyTools, cornerTools, keepEdgeRadii, roundTools, roundToolsOpts, vertexChamferTool, holdLineRadius } from './round';
import { holeTool, mirrorGeometry, patternInstances, translated } from './pattern';
import { curveInstances, fillInstances, tableInstances } from './patterns2';
import { solveSketch } from '../solver/solver';
import { splitBodySurface, splitFaces, type SplitRegions } from './splitline';
import { brepKernel, type BrepKernel, type BrepShape } from './brepKernel';
import { sketchContourRegions, polyArea, type ContourRegion } from './regions';
import { closedCornerTool, cornerReliefTool, findFace } from './smcorners';
import { thickenSurface } from './surfaces';
import { applyShellFromHistory, applyShellOutward, type BuildHistory } from './shell';
import { helixPath, loftGeometry, sketch3DChains, sketchPath, sweepGeometry } from './sweep';
import { compositePath, curveThroughPoints, sweepPathOf } from './compositeCurve';
import { extrudedSurface, fitPlane, loftedSurface, offsetSurface, openEdges, orientShell, planarSurface, revolvedSurface, surfaceCentroid, sweptSurface, trimSurface } from './surfaces';
import { geometryFromPositions } from '../document/stl';
import { sketchChains, thinRegions } from './thin';
import { ribGeometry } from './rib';
import { foldGeometry, sheetMapping, unfoldGeometry } from './unfold';
import { wrapSplineTool, wrapTool } from './wrap';
import { threadSweeps, threadTool } from './thread';
import { baseFlangeGeometry, baseFlangeLoop, baseFlangeRegion, bendAllowance, DEFAULT_SHEET_METAL, edgeFlangeGeometry, flangeLeg, flangeSetback, flatPatternGeometry, hemFlangeParams, tabGeometry, type SheetMetalParams } from './sheetmetal';
import type { DraftFeature, PatternFeature, RevolveFeature, EdgeFlangeFeature, HemFeature, JogFeature, MiterFlangeFeature, PlaneDef, SketchedBendFeature } from '../document/types';
import { chainEdges, classifyVent, formToolGeometry, gussetTools, ripTool, sweptFlangeRegions, tabSlotTools, ventTool } from './sheetmetal4';
import { bodyEdges as bodyEdgesOf, matchEdge as matchEdgeRef } from './edgesets';
import { copyFaceNames, FACE_TAG, nameFeatureFaces } from './faceNames';
import { pointDeform } from './deform';
import { buildFastening, isFasteningFeature } from './fasteningBuild';
import { brepHoleTool, meshToolOf, planarToolOf, threadSpecOf } from './rebuildTools';
export { threadSpecOf } from './rebuildTools';
import { endCapGeometry, faceOutline, findFaceOnBodies, findProfile, memberSegments, placedProfile, profileLoops, profileRegion, structuralMembers, trimByBodies, trimByPlane, weldBeadGeometry, weldGussetGeometry } from './weldments';

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
 * Edge Flange on a body: the matched edge, the sheet face it belongs to (the larger of its two
 * faces) and the flange geometry.
 */
/** A hem as edge-flange parameters (180 degrees, tangent-bend length, radius from the gap). */
export function hemAsFlange(h: HemFeature): Pick<EdgeFlangeFeature, 'edge' | 'angle' | 'length' | 'lengthMode' | 'position' | 'flip' | 'radius'> & Partial<EdgeFlangeFeature> {
  return { edge: h.edge, ...hemFlangeParams(h), gap: h.miterGap, customAllowance: h.customAllowance, customRelief: h.customRelief, startOffset: h.startOffset, endOffset: h.endOffset };
}

export function edgeFlangeOnBody(geometry: THREE.BufferGeometry, bodyId: string, f: Pick<EdgeFlangeFeature, 'edge' | 'angle' | 'length' | 'lengthMode' | 'position' | 'flip' | 'radius'> & Partial<EdgeFlangeFeature> & { profile?: Region[] }, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; error?: string; edge?: BodyEdge; trim?: THREE.BufferGeometry | null; exact?: ReturnType<typeof edgeFlangeGeometry>['exact'] } {
  const params = flangeParams(params0, f);
  if (!f.edge) return { geometry: null, error: 'Select a straight edge of the sheet.' };
  const edges = bodyEdges(geometry, bodyId);
  const e = matchEdge(edges, f.edge);
  if (!e || !e.straight || e.points.length < 2) return { geometry: null, error: 'The selected edge no longer exists on the sheet (or is not straight).' };
  const faces = planarFaces(geometry, bodyId);
  const seg = e.segments[0];
  const pick = (n: THREE.Vector3) => faces.filter((face) => new THREE.Vector3(...face.normal).dot(n) > 0.999).reduce((best, face) => (face.area > (best?.area ?? -1) ? face : best), null as PlanarFace | null);
  const f1 = pick(seg.n1), f2 = pick(seg.n2);
  const face = (f1?.area ?? 0) >= (f2?.area ?? 0) ? f1 : f2;
  if (!face) return { geometry: null, error: 'Could not find the sheet face of the edge.' };
  const a = e.points[0], b = e.points[e.points.length - 1];
  const r = edgeFlangeGeometry({ a: [a.x, a.y, a.z], b: [b.x, b.y, b.z], faceNormal: face.normal, faceCentroid: face.centroid, angle: f.angle, length: f.length, lengthMode: f.lengthMode, position: f.position, flip: f.flip, radius: f.radius, startOffset: f.startOffset, endOffset: f.endOffset, gap: f.gap, trimSideBends: f.trimSideBends, offset: f.offset, angleFace: f.angleFace, upToVertex: f.lengthEnd === 'upToVertex' ? f.vertex?.point : undefined, profile: f.profile }, params);
  return { ...r, edge: e };
}

/**
 * Miter Flange on a body: the open profile of the sketch (drawn on a plane across the first edge, at
 * one of its ends) is swept along the chain of selected straight edges; adjacent flanges meet in a
 * miter plane (bisector of the corner), with half the gap on each side.
 */
/** a miter flange for the B-rep kernel: the exact profile and per leg its plane, length and the two cut planes */
export interface ExactMiter {
  loop: NonNullable<ReturnType<typeof baseFlangeLoop>>;
  legs: { plane: PlaneDef; depth: number; clips: { point: [number, number, number]; normal: [number, number, number] }[] }[];
}

export function miterFlangeOnBody(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, f: Pick<MiterFlangeFeature, 'sketchId' | 'edges' | 'reverse' | 'gap'> & Partial<MiterFlangeFeature>, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; error?: string; exact?: ExactMiter } {
  const params = f.radius !== undefined ? { ...params0, bendRadius: f.radius } : params0;
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) return { geometry: null, error: 'Select the sketch of the miter flange profile (an open line/arc chain).' };
  const chain = sketchChains(sketch).find((c) => !c.closed && c.points.length >= 2);
  if (!chain) return { geometry: null, error: 'The miter flange profile must be an open chain of lines and arcs.' };
  if (!f.edges.length) return { geometry: null, error: 'Select the edges of the sheet the flange runs along.' };
  const edges = bodyEdges(geometry, bodyId);
  const faces = planarFaces(geometry, bodyId);
  const picked: BodyEdge[] = [];
  for (const ref of f.edges) {
    const e = matchEdge(edges, ref);
    if (!e || !e.straight || e.points.length < 2) return { geometry: null, error: 'A selected edge no longer exists on the sheet (or is not straight).' };
    picked.push(e);
  }
  const plane = resolvePlaneDef(doc, sketch.plane);
  const pm = planeMatrix(plane);
  const P3 = chain.points.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(pm));
  // the first edge starts at the end nearest to the sketch plane
  const sheetNormal = (e: BodyEdge): THREE.Vector3 | null => {
    const seg = e.segments[0];
    const pick = (n: THREE.Vector3) => faces.filter((face) => new THREE.Vector3(...face.normal).dot(n) > 0.999).reduce((best, face) => (face.area > (best?.area ?? -1) ? face : best), null as PlanarFace | null);
    const f1 = pick(seg.n1), f2 = pick(seg.n2);
    const face = (f1?.area ?? 0) >= (f2?.area ?? 0) ? f1 : f2;
    return face ? new THREE.Vector3(...face.normal) : null;
  };
  interface Leg { a: THREE.Vector3; b: THREE.Vector3; dir: THREE.Vector3; n: THREE.Vector3 }
  const ends = (e: BodyEdge) => [e.points[0].clone(), e.points[e.points.length - 1].clone()];
  const planeN = new THREE.Vector3(...plane.n), planeO = new THREE.Vector3(...plane.origin);
  let [a0, b0] = ends(picked[0]);
  if (Math.abs(b0.clone().sub(planeO).dot(planeN)) < Math.abs(a0.clone().sub(planeO).dot(planeN))) [a0, b0] = [b0, a0];
  const n0 = sheetNormal(picked[0]);
  if (!n0) return { geometry: null, error: 'Could not find the sheet face of the first edge.' };
  const legs: Leg[] = [{ a: a0, b: b0, dir: b0.clone().sub(a0).normalize(), n: n0 }];
  // chain the other edges on both ends of the first one
  const rest = picked.slice(1);
  const tol = 1e-3;
  for (let guard = 0; rest.length && guard < 64; guard++) {
    const last = legs[legs.length - 1], first = legs[0];
    let used = false;
    for (let i = 0; i < rest.length; i++) {
      const [p, q] = ends(rest[i]);
      const n = sheetNormal(rest[i]);
      if (!n) continue;
      if (p.distanceTo(last.b) < tol || q.distanceTo(last.b) < tol) {
        const [s, t] = p.distanceTo(last.b) < tol ? [p, q] : [q, p];
        legs.push({ a: s, b: t, dir: t.clone().sub(s).normalize(), n });
      } else if (p.distanceTo(first.a) < tol || q.distanceTo(first.a) < tol) {
        const [s, t] = p.distanceTo(first.a) < tol ? [q, p] : [p, q];
        legs.unshift({ a: s, b: t, dir: t.clone().sub(s).normalize(), n });
      } else continue;
      rest.splice(i, 1);
      used = true;
      break;
    }
    if (!used) return { geometry: null, error: 'The selected edges must form one connected chain along the sheet.' };
  }
  // profile in the frame of the first leg: u across (n × dir), v along the sheet normal
  const L0 = legs[legs.findIndex((l) => l.a.equals(a0))] ?? legs[0];
  const b1 = L0.n.clone().cross(L0.dir).normalize();
  const prof = P3.map((p) => ({ x: p.clone().sub(L0.a).dot(b1), y: p.clone().sub(L0.a).dot(L0.n) }));
  const region = baseFlangeRegion(prof, params, !!f.reverse);
  if (!region) return { geometry: null, error: 'The profile has no length.' };
  let size = 0;
  for (const p of region.outer) size = Math.max(size, Math.hypot(p.x, p.y));
  const ext = size * 2 + 10;
  const gap = Math.max(0, f.gap ?? 0.25);
  const parts: THREE.BufferGeometry[] = [];
  // exact only for a profile of straight lines (a chain with arcs is sampled into many corners here)
  const linesOnly = !Object.values(sketch.entities).some((e) => !e.construction && e.kind !== 'line' && e.kind !== 'point');
  const exactLoop = linesOnly ? baseFlangeLoop(prof, params, !!f.reverse) : null;
  const exactLegs: ExactMiter['legs'] = [];
  /** the cut plane of clipToSurface as a half-space normal: away from the side that stays */
  const cutAway = (p: THREE.Vector3, n: THREE.Vector3, keep: THREE.Vector3) => {
    const m = keep.clone().sub(p).dot(n) > 0 ? n.clone().negate() : n.clone();
    return { point: [p.x, p.y, p.z] as [number, number, number], normal: [m.x, m.y, m.z] as [number, number, number] };
  };
  for (let k = 0; k < legs.length; k++) {
    const L = legs[k];
    const u = L.n.clone().cross(L.dir).normalize();
    const start = L.a.clone().addScaledVector(L.dir, -ext);
    const len = L.a.distanceTo(L.b) + 2 * ext;
    const pl: PlaneDef = { id: 'mf', name: 'mf', origin: [start.x, start.y, start.z], u: [u.x, u.y, u.z], v: [L.n.x, L.n.y, L.n.z], n: [L.dir.x, L.dir.y, L.dir.z] };
    let g = extrudeGeometry([region], pl, { end: 'blind', depth: len, reverse: false }, len + 10, 0);
    if (!g) continue;
    const prev = legs[k - 1], next = legs[k + 1];
    // start: miter with the previous leg, or square at the edge end
    const mS = prev ? prev.dir.clone().add(L.dir).normalize() : L.dir.clone();
    const pS = L.a.clone().addScaledVector(mS, prev ? gap / 2 : Math.max(0, f.startOffset ?? 0));
    g = clipToSurface(g, { normal: [mS.x, mS.y, mS.z], point: [pS.x, pS.y, pS.z] }, [L.b.x, L.b.y, L.b.z]);
    const mE = next ? L.dir.clone().add(next.dir).normalize() : L.dir.clone();
    const pE = L.b.clone().addScaledVector(mE, next ? -gap / 2 : -Math.max(0, f.endOffset ?? 0));
    g = clipToSurface(g, { normal: [mE.x, mE.y, mE.z], point: [pE.x, pE.y, pE.z] }, [L.a.x, L.a.y, L.a.z]);
    parts.push(g);
    exactLegs.push({ plane: pl, depth: len, clips: [cutAway(pS, mS, L.b), cutAway(pE, mE, L.a)] });
  }
  if (!parts.length) return { geometry: null, error: 'Could not build the miter flange.' };
  let out = parts[0];
  for (const g of parts.slice(1)) out = csg(out, g, 'union');
  return { geometry: out, ...(exactLoop && exactLegs.length === parts.length ? { exact: { loop: exactLoop, legs: exactLegs } } : {}) };
}

/**
 * Jog: a sketch line on a planar face of the sheet; the sheet on one side of the line is raised (or
 * lowered) by the jog offset with two bends (inner radius of the sheet metal parameters).
 */
/** a jog or sketched bend for the B-rep kernel: the cut plane, the move of the far side (matrix) and the exact bend region */
export interface ExactJog {
  origin: [number, number, number];
  m: [number, number, number];
  move: number[];
  plane: PlaneDef;
  loop: ReturnType<typeof baseFlangeLoop>;
  depth: number;
}

export function jogOnBody(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, f: Pick<JogFeature, 'sketchId' | 'offset' | 'flipSide' | 'reverse'> & Partial<JogFeature>, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; region?: THREE.BufferGeometry; error?: string; exact?: ExactJog } {
  // Up To Vertex: the offset is the height of the picked corner above the sketch (face) plane
  if (f.offsetEnd === 'upToVertex') {
    const sk = doc.sketches[f.sketchId];
    if (!f.vertex || !sk) return { geometry: null, error: 'Select a vertex for Up To Vertex.' };
    const pl = resolvePlaneDef(doc, sk.plane);
    const d = Math.abs((f.vertex.point[0] - pl.origin[0]) * pl.n[0] + (f.vertex.point[1] - pl.origin[1]) * pl.n[1] + (f.vertex.point[2] - pl.origin[2]) * pl.n[2]);
    if (d < 1e-6) return { geometry: null, error: 'The vertex lies in the sketch plane.' };
    return jogOnBody(doc, geometry, bodyId, { ...f, offsetEnd: undefined, offset: d }, params0);
  }
  const params = f.radius !== undefined ? { ...params0, bendRadius: f.radius } : params0;
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) return { geometry: null, error: 'Select the sketch with the jog line.' };
  const line = sketch.entityOrder.map((id) => sketch.entities[id]).find((e) => e.kind === 'line' && !e.construction);
  if (!line || line.kind !== 'line') return { geometry: null, error: 'The jog sketch needs one line on a face of the sheet.' };
  const plane = resolvePlaneDef(doc, sketch.plane);
  const pm = planeMatrix(plane);
  const A = new THREE.Vector3(sketch.points[line.p1].x, sketch.points[line.p1].y, 0).applyMatrix4(pm);
  const B = new THREE.Vector3(sketch.points[line.p2].x, sketch.points[line.p2].y, 0).applyMatrix4(pm);
  const l = B.clone().sub(A).normalize();
  // the face the line lies on: a planar face whose plane contains both end points and whose normal is across the line
  const faces = planarFaces(geometry, bodyId);
  const onFace = faces
    .filter((fc) => {
      const n = new THREE.Vector3(...fc.normal), c = new THREE.Vector3(...fc.centroid);
      return Math.abs(n.dot(l)) < 1e-6 && Math.abs(A.clone().sub(c).dot(n)) < 1e-3 && Math.abs(B.clone().sub(c).dot(n)) < 1e-3;
    })
    .sort((x, y) => y.area - x.area)[0];
  if (!onFace) return { geometry: null, error: 'Sketch the jog line on a planar face of the sheet.' };
  const t = params.thickness;
  let nf = new THREE.Vector3(...onFace.normal);
  let origin = A.clone();
  if (f.reverse) {
    // jog the other way: work from the opposite face of the sheet
    origin = origin.addScaledVector(nf, -t);
    nf = nf.negate();
  }
  let m = nf.clone().cross(l).normalize();
  if (f.flipSide) m = m.negate();
  // Jog Offset measured to the outside face (default), the inside face, or the overall height
  const D = Math.max(t, f.offsetType === 'inside' ? f.offset + t : f.offsetType === 'overall' ? f.offset - t : f.offset);
  const r = params.bendRadius;
  const run = r + 2 * t + 2;
  // Jog Position: where the bends lie against the line
  origin.addScaledVector(m, positionShift(f.position, r, t));
  // Jog Angle: the middle leg leans when the angle is under 90 degrees
  const ja = Math.max(10, Math.min(90, f.jogAngle ?? 90));
  const lean = D / Math.tan((ja * Math.PI) / 180);
  // Z profile along the top surface (m, n): material below the chain
  const chain = [{ x: -run, y: 0 }, { x: 0, y: 0 }, { x: lean, y: D }, { x: lean + run, y: D }];
  const region = baseFlangeRegion(chain, params, true);
  if (!region) return { geometry: null, error: 'The jog has no size.' };
  // the width of the sheet along the line: the cut of the body at the line
  const loops = sliceMeshLoops(geometry, m, m.dot(origin), l, nf);
  if (!loops.length) return { geometry: null, error: 'The jog line does not cross the sheet.' };
  let s0 = Infinity, s1 = -Infinity;
  for (const loop of loops) for (const p of loop) { s0 = Math.min(s0, p[0]); s1 = Math.max(s1, p[0]); }
  // right-handed frame (u = m, v = nf, n = m × nf): extrude from the end of the sheet the normal points away from
  const nn = m.clone().cross(nf).normalize();
  const startP = origin.clone().addScaledVector(l, (nn.dot(l) > 0 ? s0 : s1) - l.dot(origin));
  const pl: PlaneDef = { id: 'jog', name: 'jog', origin: [startP.x, startP.y, startP.z], u: [m.x, m.y, m.z], v: [nf.x, nf.y, nf.z], n: [nn.x, nn.y, nn.z] };
  const zg = extrudeGeometry([region], pl, { end: 'blind', depth: s1 - s0, reverse: false }, s1 - s0 + 10, 0);
  if (!zg) return { geometry: null, error: 'Could not build the jog.' };
  // the fixed side stays, the other side moves up by the offset
  const behind = origin.clone().addScaledVector(m, -1);
  const ahead = origin.clone().addScaledVector(m, 1);
  const fixed = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [origin.x, origin.y, origin.z] }, [behind.x, behind.y, behind.z]);
  const moving = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [origin.x, origin.y, origin.z] }, [ahead.x, ahead.y, ahead.z]);
  moving.translate(nf.x * D, nf.y * D, nf.z * D);
  // the moving side shifts with the leaning leg; Fix projected length off keeps the flat length instead
  const along = lean + (f.fixProjected === false ? -D : 0);
  if (Math.abs(along) > 1e-9) moving.translate(m.x * along, m.y * along, m.z * along);
  let out = csg(fixed, zg, 'union');
  out = csg(out, moving, 'union');
  const mv = nf.clone().multiplyScalar(D).addScaledVector(m, along);
  const exact: ExactJog = { origin: [origin.x, origin.y, origin.z], m: [m.x, m.y, m.z], move: new THREE.Matrix4().makeTranslation(mv.x, mv.y, mv.z).elements.slice(), plane: pl, loop: baseFlangeLoop(chain, params, true), depth: s1 - s0 };
  return { geometry: out, region: zg, exact };
}

/**
 * Sketched Bend: the sketch line on a face of the sheet is the bend line; the side away from the fixed
 * face turns by the bend angle around it (inner radius of the sheet metal parameters).
 */
export function sketchedBendOnBody(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, f: Pick<SketchedBendFeature, 'sketchId' | 'angle' | 'flipSide' | 'reverse'> & Partial<SketchedBendFeature>, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; region?: THREE.BufferGeometry; error?: string; exact?: ExactJog } {
  const params = f.radius !== undefined ? { ...params0, bendRadius: f.radius } : params0;
  const fr = sheetLineFrame(doc, geometry, bodyId, f.sketchId, f.reverse, f.flipSide, params);
  if ('error' in fr) return { geometry: null, error: fr.error };
  const { l, nf, m, s0, s1 } = fr;
  // Bend Position: where the bend lies against the line
  const origin = fr.origin.clone().addScaledVector(m, positionShift(f.position, params.bendRadius, params.thickness));
  const th = (Math.max(1, Math.min(179, f.angle)) * Math.PI) / 180;
  const run = params.bendRadius + 2 * params.thickness + 2;
  const chain = [{ x: -run, y: 0 }, { x: 0, y: 0 }, { x: run * Math.cos(th), y: run * Math.sin(th) }];
  const region = baseFlangeRegion(chain, params, true);
  if (!region) return { geometry: null, error: 'The bend has no size.' };
  const nn = m.clone().cross(nf).normalize();
  const startP = origin.clone().addScaledVector(l, (nn.dot(l) > 0 ? s0 : s1) - l.dot(origin));
  const pl: PlaneDef = { id: 'sb', name: 'sb', origin: [startP.x, startP.y, startP.z], u: [m.x, m.y, m.z], v: [nf.x, nf.y, nf.z], n: [nn.x, nn.y, nn.z] };
  const zg = extrudeGeometry([region], pl, { end: 'blind', depth: s1 - s0, reverse: false }, s1 - s0 + 10, 0);
  if (!zg) return { geometry: null, error: 'Could not build the bend.' };
  const behind = origin.clone().addScaledVector(m, -1), ahead = origin.clone().addScaledVector(m, 1);
  const fixed = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [origin.x, origin.y, origin.z] }, [behind.x, behind.y, behind.z]);
  const moving = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [origin.x, origin.y, origin.z] }, [ahead.x, ahead.y, ahead.z]);
  // turn the moving side about the bend line (through the outer corner of the bend): +m goes toward +nf
  const rot = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z).multiply(new THREE.Matrix4().makeRotationAxis(nn, th)).multiply(new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z));
  moving.applyMatrix4(rot);
  let out = csg(fixed, zg, 'union');
  out = csg(out, moving, 'union');
  return { geometry: out, region: zg, exact: { origin: [origin.x, origin.y, origin.z], m: [m.x, m.y, m.z], move: rot.elements.slice(), plane: pl, loop: baseFlangeLoop(chain, params, true), depth: s1 - s0 } };
}

/** Frame of a sheet-metal sketch line on a face: origin on the line (top face), l along it, nf the face normal, m across. */
function sheetLineFrame(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, sketchId: Id, reverse: boolean, flipSide: boolean, params: SheetMetalParams): { origin: THREE.Vector3; l: THREE.Vector3; nf: THREE.Vector3; m: THREE.Vector3; s0: number; s1: number } | { error: string } {
  const sketch = doc.sketches[sketchId];
  if (!sketch) return { error: 'Select the sketch with the bend line.' };
  const line = sketch.entityOrder.map((id) => sketch.entities[id]).find((e) => e.kind === 'line' && !e.construction);
  if (!line || line.kind !== 'line') return { error: 'The sketch needs one line on a face of the sheet.' };
  const plane = resolvePlaneDef(doc, sketch.plane);
  const pm = planeMatrix(plane);
  const A = new THREE.Vector3(sketch.points[line.p1].x, sketch.points[line.p1].y, 0).applyMatrix4(pm);
  const B = new THREE.Vector3(sketch.points[line.p2].x, sketch.points[line.p2].y, 0).applyMatrix4(pm);
  const l = B.clone().sub(A).normalize();
  const onFace = planarFaces(geometry, bodyId)
    .filter((fc) => {
      const n = new THREE.Vector3(...fc.normal), c = new THREE.Vector3(...fc.centroid);
      return Math.abs(n.dot(l)) < 1e-6 && Math.abs(A.clone().sub(c).dot(n)) < 1e-3 && Math.abs(B.clone().sub(c).dot(n)) < 1e-3;
    })
    .sort((x, y) => y.area - x.area)[0];
  if (!onFace) return { error: 'Sketch the line on a planar face of the sheet.' };
  let nf = new THREE.Vector3(...onFace.normal);
  let origin = A.clone();
  if (reverse) {
    origin = origin.addScaledVector(nf, -params.thickness);
    nf = nf.negate();
  }
  let m = nf.clone().cross(l).normalize();
  if (flipSide) m = m.negate();
  const loops = sliceMeshLoops(geometry, m, m.dot(origin), l, nf);
  if (!loops.length) return { error: 'The line does not cross the sheet.' };
  let s0 = Infinity, s1 = -Infinity;
  for (const loop of loops) for (const p of loop) { s0 = Math.min(s0, p[0]); s1 = Math.max(s1, p[0]); }
  return { origin, l, nf, m, s0, s1 };
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

/** Plane cut of a mesh as loops of (s, n) points (s along l, n along nf) — the extent of a sheet along a line. */
function sliceMeshLoops(g: THREE.BufferGeometry, n: THREE.Vector3, d: number, l: THREE.Vector3, nf: THREE.Vector3): [number, number][][] {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const pts: [number, number][] = [];
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i + 2 < a.count; i += 3) {
    for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(a, i + k);
    const s = P.map((p) => p.dot(n) - d);
    for (let k = 0; k < 3; k++) {
      const x = k, y = (k + 1) % 3;
      if ((s[x] < 0) !== (s[y] < 0)) {
        const q = P[x].clone().lerp(P[y], s[x] / (s[x] - s[y]));
        pts.push([q.dot(l), q.dot(nf)]);
      }
    }
  }
  return pts.length ? [pts] : [];
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

/** the sheet metal parameters of one flange: its Custom Bend Allowance and Custom Relief Type over the document's */
export function flangeParams(p: SheetMetalParams, f: Partial<EdgeFlangeFeature>): SheetMetalParams {
  let out = p;
  if (f.customAllowance) out = { ...out, allowanceType: f.customAllowance.type, allowanceValue: f.customAllowance.value, kFactor: f.customAllowance.type === 'kFactor' ? f.customAllowance.value : out.kFactor };
  if (f.customRelief) out = { ...out, reliefType: f.customRelief.type, reliefRatio: f.customRelief.ratio, useReliefRatio: true };
  return out;
}

/** Bend / Jog Position: the shift of the bend against the sketch line (centerline, material inside / outside, bend outside) */
function positionShift(p: 'centerline' | 'materialInside' | 'materialOutside' | 'bendOutside' | undefined, r: number, t: number): number {
  return p === 'materialInside' ? -(r + t) / 2 : p === 'materialOutside' ? (r + t) / 2 : p === 'bendOutside' ? r + t : 0;
}

/** the rigid transform an instance function applies (read off three probe points) */
function instanceMatrix(inst: (g: THREE.BufferGeometry) => THREE.BufferGeometry): THREE.Matrix4 {
  const probe = new THREE.BufferGeometry();
  probe.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
  const a = inst(probe).getAttribute('position');
  const p = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  const o = p(0);
  return new THREE.Matrix4().makeBasis(p(1).sub(o), p(2).sub(o), p(3).sub(o)).setPosition(o);
}

/** the pattern as patternInstances takes it: Up to reference turns into a spacing, Instance spacing into a total angle */
function patternSpec(doc: Document, f: PatternFeature, seed: SketchBasedFeature | undefined): PatternFeature {
  let out = f;
  if (f.type === 'linearPattern' && f.upTo1 && f.dir1 && seed) {
    const sk = doc.sketches[seed.sketchId];
    const rg = sk ? sketchRegions(sk) : [];
    if (sk && rg.length) {
      const cs = regionCentre(rg[0]);
      const c0 = new THREE.Vector3(cs.x, cs.y, 0).applyMatrix4(planeMatrix(resolvePlaneDef(doc, sk.plane)));
      const pl = resolvePlaneDef(doc, f.upTo1.plane);
      const n = new THREE.Vector3(...pl.n), ax = new THREE.Vector3(...f.dir1.axis).normalize();
      const den = n.dot(ax);
      if (Math.abs(den) > 1e-6) {
        const dist = n.dot(new THREE.Vector3(...pl.origin).sub(c0)) / den - f.upTo1.offset;
        const cnt = Math.max(2, f.dir1.count);
        if (dist > 1e-6) out = { ...out, dir1: { ...f.dir1, spacing: dist / (cnt - 1) } };
      }
    }
  }
  return out;
}

/** Centre of a region (mean of its outer polygon). */
function regionCentre(r: Region): { x: number; y: number } {
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

/** Evaluate the feature history in order (up to the rollback index) into solid bodies. */
/** wall-clock budget of one rebuild (ms); the features after it are marked instead of computed */
export let rebuildBudgetMs = 45_000;
export function setRebuildBudget(ms: number): void {
  rebuildBudgetMs = Math.max(0, ms);
}


/** a fillet or chamfer the B-rep kernel builds: one constant size on picked edges (the other options: mesh kernel) */
function brepRoundable(f: RoundFeature): boolean {
  const plainType = !f.roundType || f.roundType === 'constant' || (f.type === 'chamfer' && f.roundType === 'angleDistance' && (f.angle ?? 45) === 45);
  // multi radius and variable size (fillets): one radius per edge, or a linear change along the edge
  const perEdge = f.type === 'fillet' && (!!f.radii?.length || (f.roundType === 'variable' && !!f.variable));
  return (plainType || perEdge) && !f.size2 && (!f.profile || f.profile === 'circular') && (f.type === 'fillet' || (!f.radii?.length && !f.variable)) && !f.partial && !f.setback && (!f.overflow || f.overflow === 'default') && !f.internalOnly && f.tangentPropagation !== false && f.edges.length > 0 && f.size > 0;
}

/**
 * The tool of a sketch-based feature as a B-rep solid, for the cases the B-rep kernel builds; null for the rest
 * (the feature is then built by the mesh kernel). The extents are those of extrudeGeometry, without the overhang that
 * the mesh kernel needs against coplanar faces.
 */
function brepTool(K: BrepKernel, doc: Document, f: Feature, extent: number, meshTool?: THREE.BufferGeometry, bodyGeom?: THREE.BufferGeometry | null, targetShape?: (bodyId: Id) => BrepShape | null): BrepShape | null {
  if (f.type === 'sweep') {
    // a sketch profile along a sketch path, following it (no twist, guides, tangency or circular profile yet)
    if (f.profileType === 'circular' || f.twist || f.guides?.length || f.orientation === 'keepNormal' || f.alignEnd || (f.startTangency && f.startTangency !== 'none') || (f.endTangency && f.endTangency !== 'none')) return null;
    const prof = doc.sketches[f.sketchId], path = doc.sketches[f.pathSketchId];
    if (!prof || !path) return null;
    const regions = sketchContourRegions(prof);
    if (!regions.length) return null;
    const shape = K.sweep(prof, resolvePlaneDef(doc, prof.plane), regions, path, resolvePlaneDef(doc, path.plane));
    // the B-rep sweep must agree with the mesh kernel's (orientation conventions): else the mesh kernel builds it
    if (shape && meshTool) {
      const mv = Math.abs(meshVolume(meshTool)), bv = Math.abs(K.volume(shape));
      if (!(mv > 0) || Math.abs(bv - mv) / mv > 0.03) return null;
    }
    return shape;
  }
  if (f.type === 'loft') {
    // a loft between two single-region profiles; guides, centerline, end constraints and boundary: mesh kernel
    if (f.boundary || f.face2 || f.guides?.length || f.centerline || f.closeLoft || f.startNormal || f.endNormal || (f.startType && f.startType !== 'normal') || (f.endType && f.endType !== 'normal')) return null;
    const s1 = doc.sketches[f.sketchId], s2 = doc.sketches[f.sketchId2];
    if (!s1 || !s2) return null;
    const r1 = sketchContourRegions(s1), r2 = sketchContourRegions(s2);
    if (r1.length !== 1 || r2.length !== 1) return null;
    const shape = K.loft(s1, resolvePlaneDef(doc, s1.plane), r1[0], s2, resolvePlaneDef(doc, s2.plane), r2[0]);
    if (shape && meshTool) {
      const mv = Math.abs(meshVolume(meshTool)), bv = Math.abs(K.volume(shape));
      if (!(mv > 0) || Math.abs(bv - mv) / mv > 0.03) return null;
    }
    return shape;
  }
  if (f.type !== 'extrude' && f.type !== 'revolve') return null;
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) return null;
  let regions: ContourRegion[];
  if (f.thin) {
    // Thin Feature: the wall around the open (or closed) profile; exact when the profile is made of lines only
    if ((f.type === 'extrude' && f.thin.autoFillet)) return null;
    if (Object.values(sketch.entities).some((e) => !e.construction && e.kind !== 'line' && e.kind !== 'point')) return null;
    let chains = sketchChains(sketch);
    if (f.type === 'revolve') {
      // the axis is not part of the wall (as featureGeometry)
      const ax = sketch.entities[f.axisEntityId];
      const axPts = ax && ax.kind === 'line' ? [sketch.points[ax.p1], sketch.points[ax.p2]] : null;
      const onAxis = (p: { x: number; y: number }) => !!axPts && Math.abs((axPts[1].x - axPts[0].x) * (p.y - axPts[0].y) - (axPts[1].y - axPts[0].y) * (p.x - axPts[0].x)) < 1e-6 * Math.hypot(axPts[1].x - axPts[0].x, axPts[1].y - axPts[0].y);
      chains = chains.filter((c) => !c.points.every(onAxis));
    }
    if (!chains.length) return null;
    regions = thinRegions(chains, f.thin).map((r) => ({ outer: { points: r.outer, area: Math.abs(polyArea(r.outer)), entityIds: [] }, holes: r.holes.map((h) => ({ points: h, area: Math.abs(polyArea(h)), entityIds: [] })) }));
  } else {
    regions = sketchContourRegions(sketch);
    if (f.contours && f.contours.length) regions = regions.filter((_, i) => f.contours!.includes(i));
  }
  if (!regions.length) return null;
  const plane = resolvePlaneDef(doc, sketch.plane);
  if (f.type === 'revolve') {
    const ax = sketch.entities[f.axisEntityId];
    if (!ax || ax.kind !== 'line') return null;
    const axis: [{ x: number; y: number }, { x: number; y: number }] = [sketch.points[ax.p1], sketch.points[ax.p2]];
    const a1 = Math.max(0.1, Math.min(360, f.angle)), a2 = f.direction2 ? Math.max(0, f.direction2.angle) : 0;
    if (a1 + a2 >= 360 - 1e-9 && !(f.end === 'midPlane')) return K.revolve(sketch, plane, regions, axis, 360, 0);
    // a partial turn: the side the mesh kernel turns to (start angle and sense), found by the centre of its tool
    const cands = f.end === 'midPlane' ? [{ s: -a1 / 2, a: a1 }] : f.direction2 ? [{ s: -a2, a: a1 + a2 }, { s: -a1, a: a1 + a2 }] : [{ s: 0, a: a1 }, { s: -a1, a: a1 }];
    if (cands.length === 1 || !meshTool) return K.revolve(sketch, plane, regions, axis, cands[0].a, cands[0].s);
    meshTool.computeBoundingBox();
    const target = meshTool.boundingBox!.getCenter(new THREE.Vector3());
    let best: BrepShape | null = null, bd = Infinity;
    for (const c of cands) {
      const sh = K.revolve(sketch, plane, regions, axis, c.a, c.s);
      if (!sh) continue;
      const g = K.tessellate(sh);
      g.computeBoundingBox();
      const d = g.boundingBox!.getCenter(new THREE.Vector3()).distanceTo(target);
      if (d < bd) { bd = d; best = sh; }
    }
    return best;
  }
  if (f.normalCut) return null;
  // Up To Body: through the target body, minus the body; the piece that starts at the sketch plane ends on its near side
  if (f.end === 'upToBody') {
    const target = f.upToBody && targetShape ? targetShape(f.upToBody.bodyId) : null;
    if (!target || f.draft || f.direction2 || f.flipSide || f.fromOffset) return null;
    const through = K.extrude(sketch, plane, regions, f.reverse ? -extent : 0, extent);
    if (!through) return null;
    const dir = f.reverse ? -1 : 1;
    return K.cutKeepTouching(through, target, plane.origin, [plane.n[0] * dir, plane.n[1] * dir, plane.n[2] * dir]);
  }
  // the model-dependent ends (Up To Next, Up To Vertex, Direction 2 up to …) as blind depths, as the mesh kernel has them
  let polyRegions = sketchRegions(sketch);
  if (f.contours && f.contours.length) polyRegions = polyRegions.filter((_, i) => f.contours!.includes(i));
  const ends = resolveExtrudeEnds(f, polyRegions, plane, bodyGeom ?? null);
  if ('error' in ends) return null;
  const fe = ends.fe;
  const surfaceEnd = (fe.end === 'upToSurface' || fe.end === 'offsetFromSurface') && !!fe.surface;
  if ((fe.end === 'upToSurface' || fe.end === 'offsetFromSurface') && !fe.surface) return null;
  // Draft On/Off: one-sided extrusions only (the mesh kernel tapers both sides away from the sketch plane)
  if (fe.draft && (fe.end === 'midPlane' || fe.end === 'throughAllBoth' || fe.direction2 || fe.flipSide || surfaceEnd || !(fe.draft.angle > 0 && fe.draft.angle < 89))) return null;
  if (fe.direction2 && !['blind', 'throughAll'].includes(fe.direction2.end)) return null;
  const d1 = fe.end === 'throughAll' || fe.end === 'throughAllBoth' || surfaceEnd ? extent : Math.max(0, fe.depth);
  const d2 = fe.end === 'throughAllBoth' ? extent : fe.direction2 ? (fe.direction2.end === 'blind' ? Math.max(0, fe.direction2.depth) : extent) : 0;
  let zStart: number, total: number;
  if (fe.end === 'midPlane') {
    zStart = -d1 / 2;
    total = d1;
  } else {
    const a = fe.reverse ? -d1 : d1;
    const b = fe.reverse ? d2 : -d2;
    zStart = Math.min(0, a, b);
    total = Math.max(0, a, b) - zStart;
  }
  if (total <= 1e-9) return null;
  // From ▸ Offset: the extrusion starts at this distance from the sketch plane
  if (fe.fromOffset) zStart += fe.fromReverse ? -fe.fromOffset : fe.fromOffset;
  let shape = K.extrude(sketch, plane, regions, zStart, total);
  if (!shape) return null;
  if (fe.draft) {
    const dirSign = fe.reverse ? -1 : 1;
    const pull: [number, number, number] = [plane.n[0] * dirSign, plane.n[1] * dirSign, plane.n[2] * dirSign];
    const neutral = { origin: plane.origin, normal: plane.n };
    const prism = shape;
    return pickByVolume(K, [fe.draft.angle, -fe.draft.angle].map((a) => () => K.draft(prism, 'sides', pull, a, neutral)), meshTool ? Math.abs(meshVolume(meshTool)) : 0, 0.1);
  }
  // Flip side to cut: the slab of the same depth minus the profile prism
  if (fe.op === 'cut' && fe.flipSide) {
    const c = polyRegions.length ? polyRegions[0].outer.reduce((acc, p) => ({ x: acc.x + p.x / polyRegions[0].outer.length, y: acc.y + p.y / polyRegions[0].outer.length }), { x: 0, y: 0 }) : { x: 0, y: 0 };
    const big = extent * 2;
    const sq = [{ x: c.x - big, y: c.y - big }, { x: c.x + big, y: c.y - big }, { x: c.x + big, y: c.y + big }, { x: c.x - big, y: c.y + big }];
    const slabRegion = { outer: { points: sq, area: 4 * big * big, entityIds: [] }, holes: [] };
    const slab = K.extrude(sketch, plane, [slabRegion], zStart, total);
    if (!slab) return null;
    shape = K.cut(slab, shape);
  }
  // Up To Surface / Offset From Surface: through all, cut back at the (offset) face plane
  if (surfaceEnd && fe.surface) {
    const n = new THREE.Vector3(...fe.surface.normal).normalize();
    const p = new THREE.Vector3(...fe.surface.point);
    if (new THREE.Vector3(...plane.origin).sub(p).dot(n) > 0) n.negate();
    let off = fe.end === 'offsetFromSurface' ? fe.offset ?? 0 : 0;
    if (off && fe.translateSurface) off *= Math.abs(new THREE.Vector3(...fe.surface.normal).normalize().dot(new THREE.Vector3(...plane.n).normalize()));
    p.addScaledVector(n, fe.reverseOffset ? off : -off);
    shape = K.clipByPlane(shape, [p.x, p.y, p.z], [n.x, n.y, n.z]);
  }
  return shape;
}

/** of candidate B-rep results, the one whose volume is nearest the mesh kernel's (within the tolerance); null if none */
function pickByVolume(K: BrepKernel, makers: (() => BrepShape)[], meshVol: number, tol: number): BrepShape | null {
  if (!(meshVol > 0)) return null;
  let best: BrepShape | null = null, bd = Infinity;
  for (const make of makers) {
    try {
      const sh = make();
      const d = Math.abs(Math.abs(K.volume(sh)) - meshVol) / meshVol;
      if (d < bd) { bd = d; best = sh; }
    } catch {
      /* this candidate failed */
    }
  }
  return bd <= tol ? best : null;
}

export function rebuildDocument(doc: Document, upTo: number | null = null): RebuildResult {
  const bodies: Body[] = [];
  const errors: Record<Id, string> = {};
  const consumedSketches = new Set<Id>();
  const curves: { id: Id; name: string; points: THREE.Vector3[]; dashed?: boolean; color?: string }[] = [];
  const extraAppearances: NonNullable<Document['faceAppearances']> = [];
  // Split Lines per body: the faces are split after the faces are found
  const splits = new Map<Id, SplitRegions[]>();
  const surfaceBodies: Body[] = [];
  const n = upTo === null ? doc.features.length : Math.min(upTo, doc.features.length);
  // what the body is made of, for the shell (added material and the tools of every cut)
  const history: BuildHistory = { boss: null, cuts: [] };
  const addBoss = (g: THREE.BufferGeometry) => {
    // the union of all boss tools is bookkeeping (feature history); when that boolean fails the feature itself stays
    // built, the history keeps its previous state
    try {
      history.boss = history.boss ? csg(history.boss, g, 'union') : g;
    } catch {
      /* the feature is fine; only its share in the boss history is left out */
    }
  };
  // ---- multi-body helpers (Merge result, Feature Scope, hidden bodies), by design
  const hiddenIds = new Set(doc.hiddenBodies ?? []);
  const autoHidden: Id[] = [];
  // the sheet metal base (for the flat pattern): the open chain, its plane and the flange extensions
  let sheet: { chain: { x: number; y: number }[]; plane: ReturnType<typeof resolvePlaneDef>; depth: number; midPlane: boolean; extensions: number[]; reverse: boolean; bentOnly: boolean } | null = null;
  /** Unfold … Fold: the body is flat in between */
  let unfolded = false;
  let bodySeq = 0;
  const newBody = (g: THREE.BufferGeometry, fid: Id, shape?: BrepShape | null): Body => {
    const b: Body = { id: `body${++bodySeq}`, geometry: g, faces: [], edges: [], featureIds: [fid] };
    bodies.push(b);
    if (shape) setExact(b, shape);
    return b;
  };
  // ---- B-rep kernel (docs/14): a body keeps its B-rep solid while every feature that changes it has a B-rep
  // version; a feature without one works on the tessellation (mesh kernel) and the body is a mesh from then on
  const K: BrepKernel | null = brepKernel();
  const shapes = new Map<Body, { shape: BrepShape; geometry: THREE.BufferGeometry; version: number }>();
  const posVersion = (g: THREE.BufferGeometry) => (g.getAttribute('position') as THREE.BufferAttribute | undefined)?.version ?? -1;
  /** the B-rep solid of a body, when its geometry is still the tessellation of that solid */
  const exactOf = (b: Body | undefined): BrepShape | null => {
    if (!b) return null;
    const e = shapes.get(b);
    return e && e.geometry === b.geometry && e.version === posVersion(b.geometry) ? e.shape : null;
  };
  function setExact(b: Body, shape: BrepShape) {
    b.geometry = K!.tessellate(shape);
    shapes.set(b, { shape, geometry: b.geometry, version: posVersion(b.geometry) });
  }
  /** the B-rep tool of a feature, or null (no kernel, not supported, or the kernel failed) */
  const toolOf = (feature: Feature, ext: number, meshTool?: THREE.BufferGeometry | null): BrepShape | null => {
    if (!K) return null;
    try {
      return brepTool(K, doc, feature, ext, meshTool ?? undefined, allVisible());
    } catch {
      return null;
    }
  };
  const moved = (shape: BrepShape | null, m: THREE.Matrix4): BrepShape | null => {
    if (!K || !shape) return null;
    try {
      return K.transform(shape, m.elements);
    } catch {
      return null;
    }
  };
  const visibleBodies = () => bodies.filter((b) => !hiddenIds.has(b.id));
  const boxOf = (g: THREE.BufferGeometry) => {
    g.computeBoundingBox();
    return g.boundingBox!.clone().expandByScalar(TOL.plane);
  };
  const touching = (tool: THREE.BufferGeometry, candidates: Body[]) => {
    const tb = boxOf(tool);
    return candidates.filter((b) => boxOf(b.geometry).intersectsBox(tb));
  };
  const scoped = (scope?: Id[]) => (scope && scope.length ? bodies.filter((b) => scope.includes(b.id)) : visibleBodies());
  const isEmpty = (g: THREE.BufferGeometry) => !g.getAttribute('position') || g.getAttribute('position').count < 3;
  /** boss material: merge into the bodies it touches (several touching bodies become one), else a new body */
  /** a tool without a B-rep version whose faces are all planar becomes an exact solid (gussets, vents, slots …) */
  const planarTool = (tool: THREE.BufferGeometry): BrepShape | null => planarToolOf(K, tool);
  const addMaterial = (tool: THREE.BufferGeometry, fid: Id, merge: boolean, scope?: Id[], toolShape?: BrepShape | null) => {
    featureTools.push(tool);
    const hits = merge ? touching(tool, scoped(scope)) : [];
    if (K && toolShape === undefined && (hits.length ? hits.every((b) => exactOf(b)) : bodies.some((b) => exactOf(b)))) toolShape = planarTool(tool);
    if (!hits.length) {
      newBody(tool, fid, toolShape);
      return;
    }
    // B-rep: every touched body is exact, so the union is exact too
    if (K && toolShape && hits.every((b) => exactOf(b))) {
      try {
        let u = K.fuse(exactOf(hits[0])!, toolShape);
        for (const other of hits.slice(1)) u = K.fuse(u, exactOf(other)!);
        const main = hits[0];
        setExact(main, u);
        main.featureIds.push(fid);
        for (const other of hits.slice(1)) {
          main.featureIds.push(...other.featureIds);
          bodies.splice(bodies.indexOf(other), 1);
        }
        return;
      } catch {
        /* the mesh kernel below */
      }
    }
    // all booleans first, then the bodies change: a failure leaves every body as it was (F48)
    const main = hits[0];
    let g = csg(main.geometry, tool, 'union');
    for (const other of hits.slice(1)) g = csg(g, other.geometry, 'union');
    main.geometry = g;
    main.featureIds.push(fid);
    for (const other of hits.slice(1)) {
      main.featureIds.push(...other.featureIds);
      bodies.splice(bodies.indexOf(other), 1);
    }
  };
  /** cut material: subtract from the bodies the tool touches (Feature Scope, else Auto-select) */
  const removeMaterial = (tool: THREE.BufferGeometry, fid: Id, scope?: Id[], toolShape?: BrepShape | null): boolean => {
    featureTools.push(tool);
    const hits = touching(tool, scoped(scope));
    if (!hits.length) return false;
    if (K && toolShape === undefined && hits.some((b) => exactOf(b))) toolShape = planarTool(tool);
    // every cut is computed before any body changes: when the second body fails, the first is not left half cut (F48)
    // an exact body is cut by the B-rep tool (falling back to the mesh kernel when that fails)
    const results = hits.map((b): { shape: BrepShape } | { mesh: THREE.BufferGeometry } => {
      const ex = exactOf(b);
      if (K && toolShape && ex) {
        try {
          return { shape: K.cut(ex, toolShape) };
        } catch {
          /* mesh kernel */
        }
      }
      return { mesh: csg(b.geometry, tool, 'subtract') };
    });
    // Bodies to Keep: a cut that splits a body makes a body of every piece (largest first); the feature may keep some
    const keep = (doc.features.find((x) => x.id === fid) as { keepBodies?: number[] } | undefined)?.keepBodies;
    hits.forEach((b, k) => {
      const r = results[k];
      if ('shape' in r) {
        if (K!.volume(r.shape) < 1e-9) { bodies.splice(bodies.indexOf(b), 1); return; }
        const parts = K!.solids(r.shape);
        if (parts.length > 1) { splitInto(b, parts.map((s) => ({ shape: s, geometry: K!.tessellate(s) })), fid, keep); return; }
        setExact(b, r.shape);
      } else {
        const parts = meshPieces(r.mesh);
        if (parts.length > 1) { splitInto(b, parts.map((g) => ({ shape: null, geometry: g })), fid, keep); return; }
        b.geometry = r.mesh;
      }
      b.featureIds.push(fid);
      if (isEmpty(b.geometry)) bodies.splice(bodies.indexOf(b), 1);
    });
    return true;
  };
  /** the pieces of a split body: the first kept piece stays this body, every other kept piece becomes a body */
  const splitInto = (b: Body, parts: { shape: BrepShape | null; geometry: THREE.BufferGeometry }[], fid: Id, keep?: number[]) => {
    splitCounts[fid] = Math.max(splitCounts[fid] ?? 0, parts.length);
    const kept = parts.filter((_, i) => !keep || !keep.length || keep.includes(i));
    if (!kept.length) { bodies.splice(bodies.indexOf(b), 1); return; }
    const [first, ...rest] = kept;
    if (first.shape) setExact(b, first.shape);
    else b.geometry = first.geometry;
    b.featureIds.push(fid);
    for (const p of rest) {
      const nb = newBody(p.geometry, fid, p.shape);
      nb.featureIds = [...b.featureIds];
    }
  };
  /** all visible bodies as one geometry (ray casts, extents) */
  const allVisible = (): THREE.BufferGeometry | null => {
    const v = visibleBodies();
    if (!v.length) return null;
    return v.length === 1 ? v[0].geometry : mergeGeometries(v.map((b) => b.geometry));
  };
  const times: Record<Id, number> = {};
  const warnings: Record<Id, string> = {};
  const bendCounts: Record<Id, number> = {};
  /** Face Fillet ▸ Hold line: the fillet with the radius that ends it on the hold line */
  const holdLineErrors: Record<Id, string> = {};
  const sizedByHoldLine = (x: Feature): Feature => {
    if (x.type !== 'fillet' || x.roundType !== 'face' || !x.holdLine || x.suppressed) return x;
    const b = visibleBodies()[0] ?? bodies[0];
    if (!b) return x;
    const edges = bodyEdges(b.geometry, b.id);
    const hold = matchEdge(edges, x.holdLine);
    const edge = x.edges.length ? matchEdge(edges, x.edges[0]) : null;
    const r = !hold ? 'The hold line is no longer on the body.' : !edge ? 'Select the two faces to fillet.' : holdLineRadius(edge, hold);
    if (typeof r === 'string') { holdLineErrors[x.id] = r; return x; }
    return { ...x, size: r };
  };
  /** the tools of the feature being built (the sources of the face names of its result) */
  const featureTools: THREE.BufferGeometry[] = [];
  /** Bodies to Keep: the number of pieces a cut split a body into */
  const splitCounts: Record<Id, number> = {};
  const bodyMeta: NonNullable<RebuildResult['bodyMeta']> = {};
  const clock = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  const started = clock();
  let outOfTime = false;
  for (let i = 0; i < n; i++) {
    const f: Feature = sizedByHoldLine(doc.features[i]);
    if (f.type === 'sketch') continue;
    // the rebuild never blocks the window for minutes: past the budget the rest is marked and skipped (F46)
    if (outOfTime || clock() - started >= rebuildBudgetMs) {
      outOfTime = true;
      if (!f.suppressed) errors[f.id] = `Not rebuilt: the rebuild stopped after ${Math.round(rebuildBudgetMs / 1000)} s. Reduce the pattern counts or suppress heavy features, then rebuild.`;
      continue;
    }
    const t0 = clock();
    const before = new Map(bodies.map((b) => [b, b.geometry]));
    const exactBefore = new Set(bodies.filter((b) => exactOf(b)));
    featureTools.length = 0;
    // one feature failing never takes the whole rebuild down: it is marked and the rest goes on
    try {
    if (isSketchBased(f)) consumedSketches.add(f.sketchId);
    if (f.type === 'sweep') consumedSketches.add(f.pathSketchId);
    if (f.type === 'edgeFlange' && f.profileSketchId) consumedSketches.add(f.profileSketchId);
    if (f.type === 'loft') {
      consumedSketches.add(f.sketchId2);
      for (const g of f.guides ?? []) consumedSketches.add(g);
    }
    if (f.suppressed) continue;
    const body = visibleBodies()[0] ?? bodies[0];
    if (f.type === 'imported') {
      if (f.positions.length < 9) {
        errors[f.id] = 'The imported file has no triangles.';
        continue;
      }
      const g = geometryFromPositions(f.positions);
      try {
        // an imported mesh is its own body (merge it with Combine)
        newBody(g, f.id);
        addBoss(g);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'splitLine' && (f.splitType === 'silhouette' || f.splitType === 'intersection')) {
      // Silhouette (direction of pull = the plane normal) / Intersection (the plane cuts the faces)
      if (!body) { errors[f.id] = 'A split line needs an existing solid body.'; continue; }
      if (!f.plane) { errors[f.id] = f.splitType === 'silhouette' ? 'Select the direction of pull (a plane).' : 'Select the splitting plane.'; continue; }
      try {
        const sr: SplitRegions = { plane: resolvePlaneDef(doc, f.plane), regions: [], kind: f.splitType };
        body.geometry = splitBodySurface(body.geometry, sr);
        splits.set(body.id, [...(splits.get(body.id) ?? []), sr]);
        body.featureIds.push(f.id);
      } catch (err) {
        errors[f.id] = `Split failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'splitLine') {
      const sketch = doc.sketches[f.sketchId];
      if (!sketch) {
        errors[f.id] = 'The sketch of this split line no longer exists.';
        continue;
      }
      consumedSketches.add(f.sketchId);
      if (!body) {
        errors[f.id] = 'A split line needs an existing solid body.';
        continue;
      }
      const regions = sketchRegions(sketch);
      if (!regions.length) {
        errors[f.id] = 'The split line sketch needs a closed profile.';
        continue;
      }
      try {
        const sr: SplitRegions = { plane: resolvePlaneDef(doc, sketch.plane), regions, single: !!f.single };
        body.geometry = splitBodySurface(body.geometry, sr);
        splits.set(body.id, [...(splits.get(body.id) ?? []), sr]);
        body.featureIds.push(f.id);
      } catch (err) {
        errors[f.id] = `Split failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'projectedCurve' && f.onSketch) {
      // Sketch on sketch: each point of the first sketch moves along its normal until it lies over the second sketch
      const s1 = doc.sketches[f.sketchId], s2 = f.sketchId2 ? doc.sketches[f.sketchId2] : undefined;
      if (!s1 || !s2) { errors[f.id] = 'Select the two sketches (on planes that are not parallel).'; continue; }
      consumedSketches.add(s1.id);
      consumedSketches.add(s2.id);
      const p1 = resolvePlaneDef(doc, s1.plane), p2 = resolvePlaneDef(doc, s2.plane);
      const m1 = planeMatrix(p1);
      const n1 = new THREE.Vector3(...p1.n).normalize();
      const o2 = new THREE.Vector3(...p2.origin), u2 = new THREE.Vector3(...p2.u), v2 = new THREE.Vector3(...p2.v);
      const du = n1.dot(u2), dv = n1.dot(v2);
      if (Math.hypot(du, dv) < 1e-6) { errors[f.id] = 'The two sketch planes are parallel: the curves cannot meet.'; continue; }
      const segs2 = sketchChains(s2).flatMap((c) => c.points.slice(1).map((q, i) => [c.points[i], q] as const));
      let k = 0;
      for (const chain of sketchChains(s1)) {
        const pts: THREE.Vector3[] = [];
        const dense: { x: number; y: number }[] = [];
        chain.points.forEach((q, i) => {
          const nx = chain.points[i + 1];
          dense.push(q);
          if (!nx) return;
          const steps = Math.min(200, Math.ceil(Math.hypot(nx.x - q.x, nx.y - q.y) / 0.5));
          for (let j = 1; j < steps; j++) dense.push({ x: q.x + ((nx.x - q.x) * j) / steps, y: q.y + ((nx.y - q.y) * j) / steps });
        });
        for (const q of dense) {
          const w = new THREE.Vector3(q.x, q.y, 0).applyMatrix4(m1);
          // in the second sketch the normal line is the 2D line a + s * (du, dv)
          const ax = w.clone().sub(o2).dot(u2), ay = w.clone().sub(o2).dot(v2);
          let best: number | null = null;
          for (const [a, b] of segs2) {
            const ex = b.x - a.x, ey = b.y - a.y;
            const den = du * ey - dv * ex;
            if (Math.abs(den) < 1e-12) continue;
            const s = ((a.x - ax) * ey - (a.y - ay) * ex) / den;
            const t = ((a.x - ax) * dv - (a.y - ay) * du) / den;
            if (t < -1e-9 || t > 1 + 1e-9) continue;
            if (best === null || Math.abs(s) < Math.abs(best)) best = s;
          }
          if (best !== null) pts.push(w.clone().addScaledVector(n1, best));
          else if (pts.length > 1) curves.push({ id: `${f.id}:${k++}`, name: f.name, points: pts.splice(0) });
          else pts.length = 0;
        }
        if (pts.length > 1) curves.push({ id: k ? `${f.id}:${k}` : f.id, name: f.name, points: pts });
        k++;
      }
      if (!curves.some((c) => c.id === f.id || c.id.startsWith(f.id + ':'))) errors[f.id] = 'The two sketches do not meet.';
      continue;
    }
    if (f.type === 'projectedCurve') {
      const sketch = doc.sketches[f.sketchId];
      if (!sketch) {
        errors[f.id] = 'The sketch of this curve no longer exists.';
        continue;
      }
      consumedSketches.add(f.sketchId);
      const targets = bodies;
      if (!targets.length) {
        errors[f.id] = 'A projected curve needs a body to project onto.';
        continue;
      }
      const pl = resolvePlaneDef(doc, sketch.plane);
      const m4 = planeMatrix(pl);
      const n = new THREE.Vector3(...pl.n).normalize();
      const dirs = f.reverse ? [n.clone().negate()] : [n.clone(), n.clone().negate()];
      const meshes = targets.map((b) => new THREE.Mesh(b.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
      const ray = new THREE.Raycaster();
      let k = 0;
      for (const chain of sketchChains(sketch)) {
        const pts: THREE.Vector3[] = [];
        // dense samples, so the curve follows the faces and breaks only where there is no material (holes)
        const dense: { x: number; y: number }[] = [];
        chain.points.forEach((q, i) => {
          const nx = chain.points[i + 1];
          dense.push(q);
          if (!nx) return;
          const steps = Math.min(200, Math.ceil(Math.hypot(nx.x - q.x, nx.y - q.y) / 1));
          for (let k = 1; k < steps; k++) dense.push({ x: q.x + ((nx.x - q.x) * k) / steps, y: q.y + ((nx.y - q.y) * k) / steps });
        });
        for (const q of dense) {
          const w = new THREE.Vector3(q.x, q.y, 0).applyMatrix4(m4);
          let hit: THREE.Vector3 | null = null;
          for (const d of dirs) {
            ray.set(w.clone().addScaledVector(d, -1e-4), d);
            for (const mesh of meshes) {
              const h = ray.intersectObject(mesh, false)[0];
              if (h && (!hit || h.point.distanceTo(w) < hit.distanceTo(w))) hit = h.point.clone();
            }
            if (hit) break;
          }
          if (hit) pts.push(hit);
          else if (pts.length > 1) { curves.push({ id: `${f.id}:${k++}`, name: f.name, points: pts.splice(0) }); }
          else pts.length = 0;
        }
        if (pts.length > 1) curves.push({ id: k ? `${f.id}:${k}` : f.id, name: f.name, points: pts });
        k++;
      }
      if (!curves.some((c) => c.id === f.id || c.id.startsWith(f.id + ':'))) errors[f.id] = 'The sketch does not project onto the body.';
      continue;
    }
    if (f.type === 'sketch3d') {
      for (const [i, chain] of sketch3DChains(f.segments, f.fillets).entries()) curves.push({ id: i ? `${f.id}:${i}` : f.id, name: f.name, points: chain });
      continue;
    }
    if (f.type === 'compositeCurve' || f.type === 'curvePoints') {
      const cp = f.type === 'curvePoints' ? curveThroughPoints(doc, f) : compositePath(doc, f, bodies);
      if (cp.points) curves.push({ id: f.id, name: f.name, points: cp.points });
      else errors[f.id] = cp.error!;
      if (f.type === 'compositeCurve') for (const id of f.sketches) consumedSketches.add(id);
      continue;
    }
    if (f.type === 'helix') {
      const sketch = doc.sketches[f.sketchId];
      if (!sketch) {
        errors[f.id] = 'The sketch of this helix no longer exists.';
        continue;
      }
      const pts = helixPath(sketch, resolvePlaneDef(doc, sketch.plane), f);
      if (!pts) errors[f.id] = 'The helix needs a circle in its sketch and a pitch, height or number of revolutions above zero.';
      else curves.push({ id: f.id, name: f.name, points: pts });
      continue;
    }
    if (f.type === 'baseFlange') {
      const sketch = doc.sketches[f.sketchId];
      if (!sketch) {
        errors[f.id] = 'The sketch of this base flange no longer exists.';
        continue;
      }
      const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const plane = resolvePlaneDef(doc, sketch.plane);
      const chains = sketchChains(sketch);
      const open = chains.find((c) => !c.closed && c.points.length >= 2);
      let g: THREE.BufferGeometry | null = null;
      if (open) {
        g = baseFlangeGeometry(open.points, plane, params, f.depth, f.midPlane, f.reverse, f.flipDir);
        sheet = { chain: open.points, plane, depth: f.depth, midPlane: f.midPlane, extensions: [], reverse: f.reverse, bentOnly: true };
      } else {
        const regions = sketchRegions(sketch);
        if (!regions.length) {
          errors[f.id] = 'The sketch needs an open profile (bent sheet) or a closed contour (tab).';
          continue;
        }
        g = tabGeometry(regions, plane, params, f.reverse);
      }
      if (!g) {
        errors[f.id] = 'The base flange has no volume.';
        continue;
      }
      // B-rep: the bent wall with true bend cylinders (a sketch of lines), or the tab as an exact plate
      let flangeShape: BrepShape | null = null;
      if (K) {
        try {
          const linesOnly = !Object.values(sketch.entities).some((e) => !e.construction && e.kind !== 'line' && e.kind !== 'point');
          if (open && linesOnly) {
            const loop = baseFlangeLoop(open.points, params, f.reverse);
            const z0 = f.midPlane ? -f.depth / 2 : f.flipDir ? -f.depth : 0;
            if (loop) flangeShape = K.extrudeLoop(plane, loop, z0, f.depth);
          } else if (!open) {
            flangeShape = K.extrude(sketch, plane, sketchContourRegions(sketch), f.reverse ? -params.thickness : 0, params.thickness);
          }
        } catch {
          flangeShape = null;
        }
      }
      try {
        addMaterial(g, f.id, f.merge !== false, undefined, flangeShape ?? undefined);
        addBoss(g);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'draft') {
      const target = visibleBodies().find((b) => f.faces.length && planarFaces(b.geometry, b.id).some((fc) => Math.hypot(fc.centroid[0] - f.faces[0].point[0], fc.centroid[1] - f.faces[0].point[1], fc.centroid[2] - f.faces[0].point[2]) < 1e-2)) ?? body;
      if (!target) {
        errors[f.id] = 'A draft needs a solid body.';
        continue;
      }
      try {
        const r = draftOnBody(target.geometry, f);
        if (!r.geometry) {
          errors[f.id] = r.error ?? 'Could not build the draft.';
          continue;
        }
        // B-rep draft about the neutral plane: the side of the angle that agrees with the mesh kernel
        const exD = exactOf(target);
        let drafted: BrepShape | null = null;
        if (K && exD && f.neutral && (!f.draftType || f.draftType === 'neutral') && (!f.propagation || f.propagation === 'none')) {
          const nn = f.neutral.normal;
          // direction of pull: into the part from the neutral face (Reverse flips it), as draftOnBody
          const pull: [number, number, number] = f.reverse ? [nn[0], nn[1], nn[2]] : [-nn[0], -nn[1], -nn[2]];
          drafted = pickByVolume(K, [f.angle, -f.angle].map((a) => () => K.draft(exD, f.faces, pull, a, { origin: f.neutral!.point, normal: nn })), Math.abs(meshVolume(r.geometry)), 0.03);
        }
        if (drafted) setExact(target, drafted);
        else target.geometry = r.geometry;
        target.featureIds.push(f.id);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'miterFlange' || f.type === 'jog' || f.type === 'sketchedBend') {
      if (sheet) sheet.bentOnly = false;
      consumedSketches.add(f.sketchId);
      if (!body) {
        errors[f.id] = `${f.type === 'jog' ? 'A jog' : f.type === 'sketchedBend' ? 'A sketched bend' : 'A miter flange'} needs a sheet metal body (Base Flange/Tab first).`;
        continue;
      }
      const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      let built = false, lastErr = '';
      for (const b of visibleBodies()) {
        try {
          const r = f.type === 'jog' ? jogOnBody(doc, b.geometry, b.id, f, params) : f.type === 'sketchedBend' ? sketchedBendOnBody(doc, b.geometry, b.id, f, params) : miterFlangeOnBody(doc, b.geometry, b.id, f, params);
          if (!r.geometry) {
            lastErr = r.error ?? '';
            continue;
          }
          // B-rep jog: the fixed side, the moved side and the exact Z with its two bend cylinders
          const exJ = exactOf(b);
          const ej = f.type === 'miterFlange' ? undefined : (r as { exact?: ExactJog }).exact;
          let jogDone = false;
          const em = f.type === 'miterFlange' ? (r as { exact?: ExactMiter }).exact : undefined;
          if (K && exJ && em) {
            try {
              let acc: BrepShape = exJ;
              for (const leg of em.legs) {
                let piece = K.extrudeLoop(leg.plane, em.loop, 0, leg.depth);
                if (!piece) throw new Error('leg');
                for (const c of leg.clips) piece = K.clipByPlane(piece, c.point, c.normal);
                acc = K.fuse(acc, piece);
              }
              setExact(b, acc);
              jogDone = true;
            } catch {
              jogDone = false;
            }
          }
          if (!jogDone && K && exJ && ej && ej.loop) {
            try {
              const fixed = K.clipByPlane(exJ, ej.origin, ej.m);
              const moving0 = K.clipByPlane(exJ, ej.origin, [-ej.m[0], -ej.m[1], -ej.m[2]]);
              const moving = K.transform(moving0, ej.move);
              const z = K.extrudeLoop(ej.plane, ej.loop, 0, ej.depth);
              if (moving && z) {
                setExact(b, K.fuse(K.fuse(fixed, z), moving));
                jogDone = true;
              }
            } catch {
              jogDone = false;
            }
          }
          if (!jogDone) b.geometry = f.type === 'miterFlange' ? csg(b.geometry, r.geometry, 'union') : r.geometry;
          b.featureIds.push(f.id);
          addBoss(f.type !== 'miterFlange' ? (r as { region?: THREE.BufferGeometry }).region ?? r.geometry : r.geometry);
          built = true;
          break;
        } catch (err) {
          lastErr = `Boolean operation failed: ${(err as Error).message}`;
        }
      }
      if (!built) errors[f.id] = lastErr || 'Could not build the feature.';
      continue;
    }
    if (f.type === 'edgeFlange' || f.type === 'hem') {
      if (sheet) sheet.bentOnly = false;
      if (!body) {
        errors[f.id] = `${f.type === 'hem' ? 'A hem' : 'An edge flange'} needs a sheet metal body (Base Flange/Tab first).`;
        continue;
      }
      const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const prof = f.type === 'edgeFlange' && f.profileSketchId ? doc.sketches[f.profileSketchId] : undefined;
      const ff = f.type === 'hem' ? hemAsFlange(f) : prof ? { ...f, profile: sketchRegions(prof) } : f;
      let built = false;
      for (const b of visibleBodies()) {
        const r = edgeFlangeOnBody(b.geometry, b.id, ff, params);
        if (!r.geometry) {
          if (b === visibleBodies()[visibleBodies().length - 1] && !built) errors[f.id] = r.error ?? 'Could not build the flange.';
          continue;
        }
        try {
          // B-rep: the flange with a true bend cylinder on an exact sheet
          const exF = exactOf(b);
          let done = false;
          if (K && exF && r.exact) {
            try {
              const prism = (x: NonNullable<typeof r.exact>['flange']) => K.extrudeLoop(x.plane, x.loop, x.reverse ? -x.depth : 0, x.depth);
              let sh = exF;
              if (r.exact.trim) { const tr = prism(r.exact.trim); if (!tr) throw new Error('trim'); sh = K.cut(sh, tr); }
              const fl = prism(r.exact.flange);
              if (!fl) throw new Error('flange');
              const fused = K.fuse(sh, fl);
              // the exact flange must agree with the mesh kernel's (the one the tests measure): the release pass showed
              // an edge flange and a hem short of material on the exact path; a disagreement keeps the mesh result
              const meshResult = csg(r.trim ? csg(b.geometry, r.trim, 'subtract') : b.geometry, r.geometry, 'union');
              const mv = Math.abs(meshVolume(meshResult)), ev = Math.abs(K.volume(fused));
              if (!(mv > 0) || Math.abs(ev - mv) / mv > 0.005) throw new Error(`exact flange ${ev.toFixed(1)} vs mesh ${mv.toFixed(1)}`);
              setExact(b, fused);
              done = true;
            } catch {
              done = false;
            }
          }
          if (!done) {
            if (r.trim) b.geometry = csg(b.geometry, r.trim, 'subtract');
            b.geometry = csg(b.geometry, r.geometry, 'union');
          }
          b.featureIds.push(f.id);
          addBoss(r.geometry);
          const rr = ff.radius ?? params.bendRadius;
          const fp = flangeParams(params, ff);
          if (sheet) sheet.bentOnly = false;
          if (sheet) sheet.extensions.push(flangeLeg(ff, rr, fp) + bendAllowance(ff.angle, rr, fp) - flangeSetback(ff.angle, rr, fp, ff.position));
          built = true;
        } catch (err) {
          errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
        }
        break;
      }
      continue;
    }
    if (f.type === 'unfold' || f.type === 'fold') {
      const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const map = sheet && sheet.bentOnly ? sheetMapping(sheet.chain, sheet.plane, params, sheet.reverse) : null;
      if (!body || !map) {
        errors[f.id] = !sheet ? 'Unfold and Fold need a Base Flange made from an open sketch.' : 'Unfold and Fold work on the bends of the base flange (no edge flanges, hems or jogs yet).';
        continue;
      }
      if ((f.type === 'unfold') === unfolded) {
        errors[f.id] = f.type === 'unfold' ? 'The sheet is already unfolded.' : 'Fold needs an Unfold before it.';
        continue;
      }
      body.geometry = f.type === 'unfold' ? unfoldGeometry(body.geometry, map) : foldGeometry(body.geometry, map);
      body.featureIds.push(f.id);
      unfolded = f.type === 'unfold';
      continue;
    }
    if (f.type === 'flatPattern') {
      // the developed sheet with its cuts and holes, when the bends all come from the base flange
      const fpParams = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const fpMap = sheet && sheet.bentOnly && body && !unfolded ? sheetMapping(sheet.chain, sheet.plane, fpParams, sheet.reverse) : null;
      if (fpMap && body) {
        const flatBody = unfoldGeometry(body.geometry, fpMap);
        bodies.splice(0, bodies.length);
        newBody(flatBody, f.id);
        // bend lines (Flat-Pattern1 ▸ Bend-Lines) across the face of the sheet at the middle of each bend
        const nrm = new THREE.Vector3(...sheet!.plane.n), o = new THREE.Vector3(...sheet!.plane.origin);
        const pa = flatBody.getAttribute('position');
        let w0 = Infinity, w1 = -Infinity;
        for (let k = 0; k < pa.count; k++) { const w = new THREE.Vector3().fromBufferAttribute(pa, k).sub(o).dot(nrm); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
        const tt = fpParams.thickness;
        if (!f.noBendLines) fpMap.bends.forEach(([b0, b1], k) => curves.push({ id: `${f.id}:bend${k}`, name: 'Bend-Lines', points: [fpMap.flatAt((b0 + b1) / 2, tt + 0.02, w0), fpMap.flatAt((b0 + b1) / 2, tt + 0.02, w1)] }));
        continue;
      }
      if (!sheet) {
        errors[f.id] = 'The flat pattern needs a Base Flange made from an open sketch.';
        continue;
      }
      const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const flat = flatPatternGeometry(sheet.chain, sheet.plane, params, sheet.depth, sheet.midPlane, sheet.extensions);
      if (!flat) {
        errors[f.id] = 'Could not unfold the sheet.';
        continue;
      }
      bodies.splice(0, bodies.length);
      newBody(flat, f.id);
      continue;
    }
    if (f.type === 'rib') {
      const sketch = doc.sketches[f.sketchId];
      if (!body) {
        errors[f.id] = 'A rib needs an existing solid body.';
        continue;
      }
      if (!sketch) {
        errors[f.id] = 'The sketch of this rib no longer exists.';
        continue;
      }
      const r = ribGeometry(sketch, resolvePlaneDef(doc, sketch.plane), allVisible() ?? body.geometry, f);
      if (!r.geometry) {
        errors[f.id] = r.error ?? 'The rib could not be built.';
        continue;
      }
      // B-rep: a rib of straight lines has planar faces only; its solid joins an exact body exactly
      let ribShape: BrepShape | null = null;
      if (K && !Object.values(sketch.entities).some((e) => !e.construction && e.kind !== 'line' && e.kind !== 'point')) {
        try { ribShape = K.fromMesh(r.geometry); } catch { ribShape = null; }
      }
      try {
        addMaterial(r.geometry, f.id, true, undefined, ribShape ?? undefined);
        addBoss(r.geometry);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'mirror') {
      if (!body) {
        errors[f.id] = 'A mirror needs an existing solid body.';
        continue;
      }
      const pl = resolvePlaneDef(doc, f.plane);
      try {
        // Faces to Mirror: the picked faces, mirrored, as a surface body (knit onto the body's own surface when asked)
        if (f.faces?.length) {
          const tris: number[] = [];
          for (const ref of f.faces) {
            const p = new THREE.Vector3(...ref.point);
            for (const b of visibleBodies()) {
              const fc = planarFaces(b.geometry, b.id).find((x) => new THREE.Vector3(...x.centroid).distanceTo(p) < 0.5);
              if (!fc) continue;
              const src = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
              const pos = src.getAttribute('position');
              for (const t of fc.triangles) for (let k = 0; k < 3; k++) tris.push(pos.getX(t * 3 + k), pos.getY(t * 3 + k), pos.getZ(t * 3 + k));
              break;
            }
          }
          if (tris.length) {
            const g0 = new THREE.BufferGeometry();
            g0.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
            const mirrored = mirrorGeometry(g0, pl.origin, pl.n);
            const knit = f.knitSurfaces ? surfaceBodies.find((s) => s.featureIds.some((id) => f.faces!.some((x) => x.label.includes(id)))) : undefined;
            if (knit) {
              knit.geometry = mergeGeometries([knit.geometry.index ? knit.geometry.toNonIndexed() : knit.geometry, mirrored].map((g) => { const x = g.clone(); for (const k of Object.keys(x.attributes)) if (k !== 'position') x.deleteAttribute(k); return x; })) ?? knit.geometry;
              knit.featureIds.push(f.id);
            } else surfaceBodies.push({ id: `surf${surfaceBodies.length + 1}`, geometry: mirrored, faces: [], edges: [], featureIds: [f.id] });
          }
          // Propagate visual properties: the face appearances come along
          if (f.propagateVisual !== false) for (const fa of doc.faceAppearances ?? []) {
            const p = new THREE.Vector3(...fa.point), n = new THREE.Vector3(...fa.normal);
            const o = new THREE.Vector3(...pl.origin), nn = new THREE.Vector3(...pl.n).normalize();
            const mp = p.clone().sub(o).addScaledVector(nn, -2 * p.clone().sub(o).dot(nn)).add(o), mn = n.clone().addScaledVector(nn, -2 * n.dot(nn));
            extraAppearances.push({ normal: [mn.x, mn.y, mn.z], point: [mp.x, mp.y, mp.z], color: fa.color });
          }
          continue;
        }
        // Features to Mirror: only those features' tool geometry, added (boss) or taken away (cut)
        if (f.featureIds?.length) {
          for (const fid of f.featureIds) {
            const src = doc.features.find((x) => x.id === fid);
            if (!src || !isSketchBased(src) || src.type === 'sketch') continue;
            const tool = featureGeometry(doc, src, THROUGH_ALL, body?.geometry, bodies).geometry;
            if (!tool) continue;
            const m = mirrorGeometry(tool, pl.origin, pl.n);
            const cut = (src as { op?: string }).op === 'cut';
            // the mirrored B-rep tool, for the bodies that are exact
            const srcShape = toolOf(src, THROUGH_ALL, tool);
            let mShape: BrepShape | null = null;
            if (K && srcShape) { try { mShape = K.mirror(srcShape, pl.origin, pl.n); } catch { mShape = null; } }
            for (const b of visibleBodies()) {
              if (f.bodies?.length && !f.bodies.includes(b.id)) continue;
              const ex = exactOf(b);
              if (K && ex && mShape) {
                try {
                  setExact(b, cut ? K.cut(ex, mShape) : K.fuse(ex, mShape));
                  b.featureIds.push(f.id);
                  continue;
                } catch {
                  /* the mesh kernel below */
                }
              }
              b.geometry = csg(b.geometry, m, cut ? 'subtract' : 'union');
              b.featureIds.push(f.id);
            }
            if (cut) history.cuts.push(m); else if (history.boss) addBoss(m);
          }
          if (f.propagateVisual !== false) for (const fa of doc.faceAppearances ?? []) {
            const p = new THREE.Vector3(...fa.point), n = new THREE.Vector3(...fa.normal);
            const o = new THREE.Vector3(...pl.origin), nn = new THREE.Vector3(...pl.n).normalize();
            const mp = p.clone().sub(o).addScaledVector(nn, -2 * p.clone().sub(o).dot(nn)).add(o), mn = n.clone().addScaledVector(nn, -2 * n.dot(nn));
            extraAppearances.push({ normal: [mn.x, mn.y, mn.z], point: [mp.x, mp.y, mp.z], color: fa.color });
          }
          continue;
        }
        for (const b of visibleBodies()) {
          // Bodies to Mirror: only the listed bodies (absent: every body)
          if (f.bodies?.length && !f.bodies.includes(b.id)) continue;
          // Merge solids off: the mirrored half becomes a body of its own
          const ex = exactOf(b);
          let mirrored: BrepShape | null = null;
          if (K && ex) { try { mirrored = K.mirror(ex, pl.origin, pl.n); } catch { mirrored = null; } }
          if (f.mergeSolids === false) newBody(mirrorGeometry(b.geometry, pl.origin, pl.n), f.id, mirrored);
          else {
            let done = false;
            if (K && ex && mirrored) {
              try { setExact(b, K.fuse(ex, mirrored)); done = true; } catch { done = false; }
            }
            if (!done) b.geometry = csg(b.geometry, mirrorGeometry(b.geometry, pl.origin, pl.n), 'union');
          }
          b.featureIds.push(f.id);
        }
        if (f.propagateVisual !== false) for (const fa of doc.faceAppearances ?? []) {
          const p = new THREE.Vector3(...fa.point), n = new THREE.Vector3(...fa.normal);
          const o = new THREE.Vector3(...pl.origin), nn = new THREE.Vector3(...pl.n).normalize();
          const mp = p.clone().sub(o).addScaledVector(nn, -2 * p.clone().sub(o).dot(nn)).add(o), mn = n.clone().addScaledVector(nn, -2 * n.dot(nn));
          extraAppearances.push({ normal: [mn.x, mn.y, mn.z], point: [mp.x, mp.y, mp.z], color: fa.color });
        }
        if (history.boss) addBoss(mirrorGeometry(history.boss, pl.origin, pl.n));
        history.cuts = [...history.cuts, ...history.cuts.map((c) => mirrorGeometry(c, pl.origin, pl.n))];
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'linearPattern' || f.type === 'circularPattern' || f.type === 'sketchPattern' || f.type === 'curvePattern' || f.type === 'tablePattern' || f.type === 'fillPattern' || f.type === 'variablePattern') {
      if (!body) {
        errors[f.id] = 'A pattern needs an existing solid body.';
        continue;
      }
      const seeds = f.featureIds.map((id) => doc.features.find((x) => x.id === id)).filter((x): x is SketchBasedFeature => !!x && isSketchBased(x) && x.type !== 'sketch');
      const patBodies = (f.bodies ?? []).map((id) => bodies.find((b) => b.id === id)).filter((b): b is Body => !!b);
      if (!seeds.length && !patBodies.length) {
        errors[f.id] = 'Select the features or bodies to pattern.';
        continue;
      }
      // Bodies to pattern: copies of whole bodies (linear / circular), then the features (if any)
      if (patBodies.length && (f.type === 'linearPattern' || f.type === 'circularPattern')) {
        const insts = patternInstances(patternSpec(doc, f, seeds[0]));
        for (const b of patBodies) for (const [k, inst] of insts.entries()) if (!f.skip?.includes(k)) newBody(inst(b.geometry), f.id, moved(exactOf(b), instanceMatrix(inst)));
        if (!seeds.length) continue;
      }
      body.geometry.computeBoundingSphere();
      const extent = Math.max(10, (body.geometry.boundingSphere?.radius ?? 0) * 3 + 10);
      let instances: ((g: THREE.BufferGeometry) => THREE.BufferGeometry)[];
      if (f.type === 'sketchPattern') {
        // every point of the reference sketch gets an instance, moved from the centroid of the seed's profile
        const ref = f.sketchId ? doc.sketches[f.sketchId] : undefined;
        if (!ref) {
          errors[f.id] = 'Select the reference sketch with the points.';
          continue;
        }
        const seedSketch = doc.sketches[seeds[0].sketchId];
        const seedRegions = seedSketch ? sketchRegions(seedSketch) : [];
        if (!seedSketch || !seedRegions.length) {
          errors[f.id] = 'The seed feature has no profile.';
          continue;
        }
        const cs = regionCentre(seedRegions[0]);
        // Reference point: the seed's centroid, or the selected point
        const c0 = f.refPoint ? new THREE.Vector3(...f.refPoint) : new THREE.Vector3(cs.x, cs.y, 0).applyMatrix4(planeMatrix(resolvePlaneDef(doc, seedSketch.plane)));
        const rm = planeMatrix(resolvePlaneDef(doc, ref.plane));
        const pts = ref.entityOrder.map((id) => ref.entities[id]).filter((e) => e.kind === 'point').map((e) => {
          const q = ref.points[(e as { p: string }).p];
          return new THREE.Vector3(q.x, q.y, 0).applyMatrix4(rm);
        });
        instances = pts
          .map((p) => p.clone().sub(c0))
          .filter((v) => v.length() > 1e-6)
          .map((v) => (g: THREE.BufferGeometry) => { const c = g.clone(); c.translate(v.x, v.y, v.z); return c; });
      } else if (f.type === 'curvePattern' || f.type === 'tablePattern' || f.type === 'fillPattern' || f.type === 'variablePattern') {
        // the seed's position: the centroid of its first profile
        const seedSketch = doc.sketches[seeds[0].sketchId];
        const seedRegions = seedSketch ? sketchRegions(seedSketch) : [];
        if (!seedSketch || !seedRegions.length) {
          errors[f.id] = 'The seed feature has no profile.';
          continue;
        }
        const cs = regionCentre(seedRegions[0]);
        const c0 = new THREE.Vector3(cs.x, cs.y, 0).applyMatrix4(planeMatrix(resolvePlaneDef(doc, seedSketch.plane)));
        if (f.type === 'curvePattern') {
          const r = curveInstances(doc, f, c0);
          if (r.error) {
            errors[f.id] = r.error;
            continue;
          }
          instances = r.instances;
        } else if (f.type === 'tablePattern') instances = tableInstances(doc, f, seedSketch.plane);
        else if (f.type === 'fillPattern') {
          if (!f.fill) {
            errors[f.id] = 'Select the fill boundary (a planar face).';
            continue;
          }
          instances = fillInstances(f, c0);
        } else {
          // Variable Pattern: every row is the seed rebuilt with its own dimension values, moved along the direction
          const rows = f.variable?.rows ?? [];
          const dir = new THREE.Vector3(...(f.variable?.dir ?? [1, 0, 0])).normalize();
          try {
            for (const seed of seeds) {
              for (const [k, row] of rows.entries()) {
                if (f.skip?.includes(k)) continue;
                const sk = doc.sketches[seed.sketchId];
                let vdoc = doc;
                if (sk && Object.keys(row.values).length) {
                  const constraints = { ...sk.constraints };
                  for (const [cid, val] of Object.entries(row.values)) if (constraints[cid]) constraints[cid] = { ...constraints[cid], value: val };
                  const solved = solveSketch({ ...sk, constraints }).sketch;
                  vdoc = { ...doc, sketches: { ...doc.sketches, [sk.id]: solved } };
                }
                if (seed.type === 'helix') continue;
                const g = featureGeometry(vdoc, seed, extent, body?.geometry).geometry;
                if (!g) continue;
                const ig = translated(g, dir.clone().multiplyScalar(row.offset));
                const boss = seed.type === 'rib' || seed.type === 'baseFlange' || seed.op === 'boss';
                if (boss) {
                  addMaterial(ig, f.id, true);
                  addBoss(ig);
                } else {
                  removeMaterial(ig, f.id);
                  history.cuts.push(ig);
                }
              }
            }
            body.featureIds.push(f.id);
          } catch (err) {
            errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
          }
          continue;
        }
      } else instances = patternInstances(patternSpec(doc, f, seeds[0]));
      if (!instances.length) {
        errors[f.id] = 'The pattern needs at least two instances.';
        continue;
      }
      // Propagate visual properties: appearances on the seed's faces are copied to every instance
      if (f.propagateVisual !== false && doc.faceAppearances?.length) {
        for (const seed of seeds) {
          const sg = featureGeometry(doc, seed, extent, body?.geometry).geometry;
          if (!sg) continue;
          sg.computeBoundingBox();
          const box = sg.boundingBox!.clone().expandByScalar(0.05);
          for (const fa of doc.faceAppearances) {
            if (!box.containsPoint(new THREE.Vector3(...fa.point))) continue;
            for (const [k, inst] of instances.entries()) {
              if (f.skip?.includes(k)) continue;
              const m = instanceMatrix(inst);
              const p = new THREE.Vector3(...fa.point).applyMatrix4(m);
              const n = new THREE.Vector3(...fa.normal).transformDirection(m);
              extraAppearances.push({ ...fa, point: [p.x, p.y, p.z], normal: [n.x, n.y, n.z] });
            }
          }
        }
      }
      try {
        for (const seed of seeds) {
          const g = featureGeometry(doc, seed, extent, body?.geometry).geometry;
          if (!g) continue;
          // the seed's tool as a B-rep solid: every instance is that solid moved (exact patterns)
          const seedShape = toolOf(seed, extent, g);
          const sk = doc.sketches[seed.sketchId];
          const bodyBound = seed.type === 'extrude' && ['upToNext', 'upToSurface', 'offsetFromSurface', 'upToBody', 'upToVertex'].includes(seed.end);
          const perInstance = !!sk && (f.varySketch || !!f.varyDims?.length || (!f.geometryPattern && bodyBound));
          // mesh kernel: the cut tools of the instances are gathered and, when no two overlap, cut as one tool (one
          // boolean instead of one per instance: a 8 × 8 hole pattern went from 30 s to about a second, QA F46)
          const batch: THREE.BufferGeometry[] = [];
          for (const [k, inst] of instances.entries()) {
            if (f.skip?.includes(k)) continue;
            let ig: THREE.BufferGeometry | null = null;
            let ish: BrepShape | null = null;
            if (perInstance && sk) {
              // the instance's own sketch: dimensions varied, moved (and solved again) to the instance place
              const m = instanceMatrix(inst);
              const pl = resolvePlaneDef(doc, sk.plane);
              const o = new THREE.Vector3(...pl.origin).applyMatrix4(m), u = new THREE.Vector3(...pl.u).transformDirection(m), v = new THREE.Vector3(...pl.v).transformDirection(m), n = new THREE.Vector3(...pl.n).transformDirection(m);
              let isk = sk;
              if (f.varyDims?.length) {
                const constraints = { ...isk.constraints };
                for (const vd of f.varyDims) { const c = constraints[vd.constraintId]; if (c && c.value !== undefined) constraints[vd.constraintId] = { ...c, value: c.value + vd.increment * (k + 1) }; }
                isk = solveSketch({ ...isk, constraints }).sketch;
              }
              let idoc: Document;
              if (f.varySketch) {
                // Vary sketch: the free points move with the instance, points fixed to the origin / Fix stay: solve again
                const t = new THREE.Vector3(...pl.origin).applyMatrix4(m).sub(new THREE.Vector3(...pl.origin));
                const du = t.dot(new THREE.Vector3(...pl.u)), dv = t.dot(new THREE.Vector3(...pl.v));
                const fixed = new Set<Id>([isk.origin, ...Object.values(isk.constraints).filter((c) => c.kind === 'fix').flatMap((c) => c.refs)]);
                for (const c of Object.values(isk.constraints)) if (c.kind === 'coincident' && c.refs.includes(isk.origin)) for (const r of c.refs) fixed.add(r);
                const points = Object.fromEntries(Object.entries(isk.points).map(([id, p]) => [id, fixed.has(id) ? p : { ...p, x: p.x + du, y: p.y + dv }]));
                isk = solveSketch({ ...isk, points }).sketch;
                idoc = { ...doc, sketches: { ...doc.sketches, [sk.id]: isk } };
              } else {
                const pid = `${sk.plane}@${f.id}:${k}`;
                idoc = { ...doc, planes: { ...doc.planes, [pid]: { id: pid, name: pid, origin: [o.x, o.y, o.z], u: [u.x, u.y, u.z], v: [v.x, v.y, v.z], n: [n.x, n.y, n.z], kind: 'face' } }, sketches: { ...doc.sketches, [sk.id]: { ...isk, plane: pid } } };
              }
              ig = featureGeometry(idoc, seed, extent, body?.geometry).geometry;
            } else {
              ig = inst(g);
              ish = moved(seedShape, instanceMatrix(inst));
            }
            if (!ig) continue;
            if (seed.type === 'helix') continue;
            const boss = seed.type === 'rib' || seed.type === 'baseFlange' || seed.op === 'boss';
            if (boss) {
              addMaterial(ig, f.id, true, undefined, ish ?? undefined);
              addBoss(ig);
            } else {
              if (!K) batch.push(ig);
              else removeMaterial(ig, f.id, undefined, ish ?? undefined);
              history.cuts.push(ig);
            }
          }
          if (batch.length) {
            const boxes = batch.map((g) => { g.computeBoundingBox(); return g.boundingBox!.clone().expandByScalar(1e-4); });
            const apart = boxes.every((a, i) => boxes.every((b, j) => j <= i || !a.intersectsBox(b)));
            if (apart && batch.length > 1) removeMaterial(mergeGeometries(batch.map((g) => (g.index ? g.toNonIndexed() : g))), f.id);
            else for (const g of batch) removeMaterial(g, f.id);
          }
        }
        body.featureIds.push(f.id);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'shell') {
      if (!body) {
        errors[f.id] = 'A shell needs an existing solid body.';
        continue;
      }
      if (f.thickness <= 0) {
        errors[f.id] = 'The wall thickness must be larger than zero.';
        continue;
      }
      try {
        let target = body;
        if (f.faces.length && bodies.length > 1) {
          const p = new THREE.Vector3(...f.faces[0].point);
          let best = Infinity;
          for (const b of visibleBodies()) {
            for (const face of planarFaces(b.geometry, b.id)) {
              const d = p.distanceTo(new THREE.Vector3(...face.centroid));
              if (d < best) { best = d; target = b; }
            }
          }
        }
        const exShell = exactOf(target);
        const meshShell = f.outward ? applyShellOutward(target.geometry, f.thickness, f.faces) : applyShellFromHistory(target.geometry, f.thickness, f.faces, history, f.multi ?? []);
        // B-rep shell (offset surfaces, true inner rounds): kept when it agrees with the mesh kernel's wall
        let brepShell: BrepShape | null = null;
        if (K && exShell && !f.multi?.length) {
          try {
            const sh = K.shell(exShell, f.faces, f.thickness, !!f.outward);
            const mv = Math.abs(meshVolume(meshShell)), bv = Math.abs(K.volume(sh));
            if (mv > 0 && Math.abs(bv - mv) / mv < 0.03) brepShell = sh;
          } catch {
            /* the mesh shell */
          }
        }
        if (brepShell) setExact(target, brepShell);
        else target.geometry = meshShell;
        // later features work on the shelled body
        history.boss = target.geometry;
        history.cuts = [];
        target.featureIds.push(f.id);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'thread') {
      if (!body || !f.edge) {
        errors[f.id] = !body ? 'A thread needs a solid body.' : 'Select a circular edge of a cylinder or hole.';
        continue;
      }
      const spec = threadSpecOf(f)!;
      const ax = new THREE.Vector3(...spec.axis).normalize();
      const c0 = new THREE.Vector3(...spec.center);
      const length = spec.length;
      let tool = threadTool(spec);
      // Trim with start / end face: only the part between the faces (a slab across the axis)
      if (f.trimStart || f.trimEnd) {
        const big = f.diameter * 4 + 20;
        const from = f.trimStart ? 0 : -length, to = f.trimEnd ? length : 2 * length;
        const slab = new THREE.CylinderGeometry(big, big, to - from, 48, 1, false);
        slab.translate(0, (to + from) / 2, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax);
        slab.applyQuaternion(q);
        slab.translate(c0.x, c0.y, c0.z);
        try { tool = csg(tool, slab.toNonIndexed(), 'intersect'); } catch { /* keep the untrimmed tool */ }
      }
      // B-rep: the V profile swept along a true helix (every start), trimmed like the mesh tool; kept when it agrees
      let threadShape: BrepShape | null = null;
      if (K && body && exactOf(body)) {
        try {
          let sh: BrepShape | null = null;
          for (const sw of threadSweeps(spec)) {
            const one = K.helixSweep(sw.center, sw.axis, sw.xdir, sw.radius, sw.lead, sw.length, sw.sign, sw.startAngle, sw.profile);
            if (!one) { sh = null; break; }
            sh = sh ? K.fuse(sh, one) : one;
          }
          if (sh && (f.trimStart || f.trimEnd)) {
            const big = f.diameter * 4 + 20;
            const from = f.trimStart ? 0 : -length, to = f.trimEnd ? length : 2 * length;
            const ref = Math.abs(ax.x) < 0.9 ? new THREE.Vector3(1, 0, 0).cross(ax).normalize() : new THREE.Vector3(0, 1, 0).cross(ax).normalize();
            sh = K.common(sh, K.axisymmetric([c0.x, c0.y, c0.z], [ax.x, ax.y, ax.z], [ref.x, ref.y, ref.z], [{ t0: from, t1: to, r0: big, r1: big }]));
          }
          if (sh) {
            const mv = Math.abs(meshVolume(tool)), bv = Math.abs(K.volume(sh));
            if (mv > 0 && Math.abs(bv - mv) / mv < 0.05) threadShape = sh;
          }
        } catch {
          threadShape = null;
        }
      }
      try {
        if (f.method === 'cut') {
          if (!removeMaterial(tool, f.id, undefined, threadShape)) errors[f.id] = 'The thread does not touch the body.';
        } else addMaterial(tool, f.id, true, undefined, threadShape);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'wrap' && f.method === 'spline') {
      // Wrap > Spline Surface: the sketch projected onto any face
      const sketch = doc.sketches[f.sketchId];
      const regions = sketch ? sketchRegions(sketch) : [];
      if (!body || !sketch || !f.splineFace || !regions.length) {
        errors[f.id] = !body ? 'Wrap needs a solid body.' : !sketch ? 'Select the sketch to wrap.' : !f.splineFace ? 'Select the face to wrap onto.' : 'The wrap sketch needs closed contours.';
        continue;
      }
      consumedSketches.add(f.sketchId);
      const fn = new THREE.Vector3(...f.splineFace.normal), fp = new THREE.Vector3(...f.splineFace.point);
      const target = visibleBodies().map((b) => ({ b, f: planarFaces(b.geometry, b.id).filter((x) => new THREE.Vector3(...x.normal).dot(fn) > 0.9).sort((x, y) => new THREE.Vector3(...x.centroid).distanceTo(fp) - new THREE.Vector3(...y.centroid).distanceTo(fp))[0] })).find((x) => x.f);
      if (!target) { errors[f.id] = 'The face to wrap onto is gone.'; continue; }
      const src = target.b.geometry.index ? target.b.geometry.toNonIndexed() : target.b.geometry;
      const pa = src.getAttribute('position');
      const fpos: number[] = [];
      for (const t of target.f!.triangles) for (let k = 0; k < 3; k++) fpos.push(pa.getX(t * 3 + k), pa.getY(t * 3 + k), pa.getZ(t * 3 + k));
      const fgeo = new THREE.BufferGeometry();
      fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
      try {
        const tool = wrapSplineTool(regions, resolvePlaneDef(doc, sketch.plane), fgeo, f.kind === 'emboss' ? 'emboss' : 'deboss', f.kind === 'scribe' ? 0.02 : f.depth);
        if (!tool) { errors[f.id] = 'The sketch does not project onto the face.'; continue; }
        if (f.kind === 'emboss') { target.b.geometry = csg(target.b.geometry, tool, 'union'); addBoss(tool); }
        else { target.b.geometry = csg(target.b.geometry, tool, 'subtract'); history.cuts.push(tool); }
        target.b.featureIds.push(f.id);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'wrap') {
      const sketch = doc.sketches[f.sketchId];
      if (!body || !sketch || !f.face) {
        errors[f.id] = !body ? 'Wrap needs a solid body with a cylindrical face.' : !sketch ? 'Select the sketch to wrap.' : 'Select a cylindrical face.';
        continue;
      }
      const regions = sketchRegions(sketch);
      if (!regions.length) {
        errors[f.id] = 'The wrap sketch needs closed contours.';
        continue;
      }
      const plane = resolvePlaneDef(doc, sketch.plane);
      if (f.kind === 'scribe') {
        // split lines: the contours drawn on the face
        const tool = wrapTool(regions, plane, f.face, 'emboss', 0.02);
        if (tool) {
          const C = new THREE.Vector3(...f.face.center), ax = new THREE.Vector3(...f.face.axis).normalize();
          const o = new THREE.Vector3(...plane.origin), U = new THREE.Vector3(...plane.u), V = new THREE.Vector3(...plane.v);
          const toPlane = o.clone().sub(C);
          const d0 = toPlane.clone().addScaledVector(ax, -toPlane.dot(ax));
          if (d0.lengthSq() < 1e-9) d0.copy(new THREE.Vector3(...plane.n));
          d0.addScaledVector(ax, -d0.dot(ax)).normalize();
          const e = ax.clone().cross(d0).normalize();
          const foot = C.clone().addScaledVector(d0, d0.dot(o.clone().sub(C)));
          const R = f.face.radius + 0.02;
          const map = (q: { x: number; y: number }) => {
            const P = o.clone().addScaledVector(U, q.x).addScaledVector(V, q.y);
            const z = P.clone().sub(C).dot(ax), th = P.clone().sub(foot).dot(e) / f.face!.radius;
            return C.clone().addScaledVector(ax, z).addScaledVector(d0, R * Math.cos(th)).addScaledVector(e, R * Math.sin(th));
          };
          regions.forEach((r, ri) => [r.outer, ...r.holes].forEach((loop, li) => {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= loop.length; i++) {
              const p = loop[i % loop.length], q = loop[(i + 1) % loop.length];
              for (let k = 0; k < 8 && i < loop.length; k++) pts.push(map({ x: p.x + ((q.x - p.x) * k) / 8, y: p.y + ((q.y - p.y) * k) / 8 }));
            }
            pts.push(pts[0]);
            curves.push({ id: `${f.id}:s${ri}-${li}`, name: 'Split Line', points: pts });
          }));
        }
        continue;
      }
      const tool = wrapTool(regions, plane, f.face, f.kind, f.depth);
      if (!tool) {
        errors[f.id] = 'Could not wrap the sketch.';
        continue;
      }
      // an exact body keeps its exact cylinder: the patch becomes a polyhedral B-rep tool (else the mesh kernel)
      const wrapShape = K && exactOf(body) ? meshToolOf(K, tool) : undefined;
      try {
        if (f.kind === 'emboss') addMaterial(tool, f.id, true, undefined, wrapShape);
        else if (!removeMaterial(tool, f.id, undefined, wrapShape)) errors[f.id] = 'The deboss does not touch the body.';
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'crossBreak') {
      if (!body || !f.face) {
        errors[f.id] = !body ? 'A cross-break needs a sheet metal body.' : 'Select a planar face of the sheet.';
        continue;
      }
      const lines = crossBreakLines(body.geometry, f.face);
      if (!lines) {
        errors[f.id] = 'The selected face was not found on the body.';
        continue;
      }
      // Edit Cross-Break: one or both diagonals, kept off the corners by the inset
      lines.forEach((pts, i) => {
        if ((f.lines === 'first' && i !== 0) || (f.lines === 'second' && i !== 1)) return;
        const a = pts[0], b = pts[pts.length - 1], L = a.distanceTo(b), k = Math.min(0.45, Math.max(0, f.inset ?? 0) / (L || 1));
        curves.push({ id: `${f.id}:x${i}`, name: 'Cross-Break', points: k > 0 ? [a.clone().lerp(b, k), a.clone().lerp(b, 1 - k)] : pts });
      });
      continue;
    }
    if (f.type === 'deleteFace') {
      if (!f.faces.length) {
        errors[f.id] = 'Select the faces to delete.';
        continue;
      }
      // the body holding the first face (its centroid on that body's surface)
      const p0 = new THREE.Vector3(...f.faces[0].point);
      const target = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(p0) < 0.5)) ?? body;
      if (!target) {
        errors[f.id] = 'Delete Face needs a body.';
        continue;
      }
      const r = deleteFaces(target.geometry, f.faces, f.option);
      if (!r.geometry) {
        errors[f.id] = r.error ?? 'Could not delete the faces.';
        continue;
      }
      target.geometry = r.geometry;
      target.featureIds.push(f.id);
      continue;
    }
    if (f.type === 'moveBody') {
      const targets = bodies.filter((b) => f.bodies.includes(b.id));
      if (!targets.length) {
        errors[f.id] = 'Select the bodies to move or copy.';
        continue;
      }
      // one step: rotate about X, then Y, then Z through the origin point, then translate
      const o = new THREE.Vector3(...f.origin);
      const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(f.rotate.map((a) => (a * Math.PI) / 180) as [number, number, number]), 'XYZ'));
      const step = new THREE.Matrix4().makeTranslation(...f.translate).multiply(new THREE.Matrix4().makeTranslation(o.x, o.y, o.z)).multiply(rot).multiply(new THREE.Matrix4().makeTranslation(-o.x, -o.y, -o.z));
      for (const b of targets) {
        const ex = exactOf(b);
        if (f.copy) {
          const m = new THREE.Matrix4();
          for (let k = 0; k < Math.max(1, Math.min(250, Math.round(f.copies))); k++) {
            m.premultiply(step);
            const nb = newBody(b.geometry.clone().applyMatrix4(m), f.id, moved(ex, m));
            nb.featureIds = [...b.featureIds, f.id];
          }
        } else {
          const sh = moved(ex, step);
          if (sh) setExact(b, sh);
          else b.geometry = b.geometry.clone().applyMatrix4(step);
          b.featureIds.push(f.id);
        }
      }
      continue;
    }
    if (f.type === 'deleteBody') {
      const before = bodies.length;
      if (f.keep) { // Keep Bodies: every body that is not listed goes
        if (!f.bodies.some((id) => bodies.some((b) => b.id === id))) errors[f.id] = 'The bodies to keep are no longer there.';
        else for (let i = bodies.length - 1; i >= 0; i--) if (!f.bodies.includes(bodies[i].id)) bodies.splice(i, 1);
        continue;
      }
      for (const id of f.bodies) {
        const i = bodies.findIndex((b) => b.id === id);
        if (i >= 0) bodies.splice(i, 1);
      }
      if (bodies.length === before) errors[f.id] = 'The bodies to delete are no longer there.';
      continue;
    }
    if (f.type === 'closedCorner') {
      if (!body) {
        errors[f.id] = 'A closed corner needs a sheet metal body.';
        continue;
      }
      if (!f.faces.length) {
        errors[f.id] = 'Select the end faces of the flange to extend.';
        continue;
      }
      const t = (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness;
      try {
        for (const [i, ref] of f.faces.entries()) {
          const r = closedCornerTool(body.geometry, ref, t, f.gap);
          if ('error' in r) {
            errors[f.id] = r.error;
            continue;
          }
          addMaterial(r.tool, f.id, true);
          addBoss(r.tool);
          if (f.weld) curves.push({ id: `${f.id}:weld${i}`, name: 'Weld Bead', points: r.seam });
        }
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'cornerRelief') {
      if (!body) {
        errors[f.id] = 'A corner relief needs a sheet metal body.';
        continue;
      }
      const faces = planarFaces(body.geometry, body.id).filter((x) => x.curved);
      const picked = f.bends.map((b) => {
        const p = new THREE.Vector3(...b.point);
        let best: (typeof faces)[number] | null = null, bd = Infinity;
        for (const fc of faces) { const d = p.distanceTo(new THREE.Vector3(...fc.centroid)); if (d < bd) { bd = d; best = fc; } }
        return best;
      }).filter((x): x is (typeof faces)[number] => !!x);
      const tool = cornerReliefTool(body.geometry, picked, f.kind, f.size);
      if ('error' in tool) {
        errors[f.id] = tool.error;
        continue;
      }
      try {
        removeMaterial(tool, f.id);
        history.cuts.push(tool);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'loftedBend') {
      if (f.sketchId) consumedSketches.add(f.sketchId);
      if (f.sketchId2) consumedSketches.add(f.sketchId2);
      const surf = loftedSurface(doc, { id: f.id, type: 'surface', kind: 'loft', name: f.name, suppressed: false, sketchId: f.sketchId, sketchId2: f.sketchId2 } as never, f.method === 'bent' ? f.facets ?? 4 : undefined);
      if (!surf) {
        errors[f.id] = 'Select two open profile sketches (the top and the bottom of the transition).';
        continue;
      }
      try {
        const g = thickenSurface(surf, f.thickness);
        if (body) {
          addMaterial(g, f.id, true);
          addBoss(g);
        } else {
          newBody(g, f.id);
          addBoss(g);
        }
      } catch (err) {
        errors[f.id] = `Could not build the lofted bend: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'vent') {
      consumedSketches.add(f.sketchId);
      const sketch = doc.sketches[f.sketchId];
      if (!sketch) {
        errors[f.id] = 'Select the sketch of the vent (boundary, ribs and spars).';
        continue;
      }
      if (!body) {
        errors[f.id] = 'A vent needs a sheet metal body.';
        continue;
      }
      const plane = resolvePlaneDef(doc, sketch.plane);
      const parts = classifyVent(sketch, !!f.fillIn);
      if (!parts.regions.length) {
        errors[f.id] = 'The vent sketch needs a closed boundary contour.';
        continue;
      }
      body.geometry.computeBoundingSphere();
      const extent = Math.max(10, (body.geometry.boundingSphere?.radius ?? 0) * 3 + 10);
      const tool = ventTool({ ...parts, ribWidth: f.ribWidth, sparWidth: f.sparWidth }, plane, extent);
      if (!tool) {
        errors[f.id] = 'The vent has no open area left.';
        continue;
      }
      try {
        if (!removeMaterial(tool, f.id)) errors[f.id] = 'The vent does not touch the sheet.';
        else history.cuts.push(tool);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'formTool') {
      if (!body) {
        errors[f.id] = 'A forming tool needs a sheet metal body.';
        continue;
      }
      if (!f.plane || !f.points.length) {
        errors[f.id] = 'Select the placement face and place at least one position.';
        continue;
      }
      const pl = resolvePlaneDef(doc, f.plane);
      const t = (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness;
      try {
        for (const pt of f.points) {
          const g = formToolGeometry({ shape: f.shape, plane: pl, at: pt, rotation: f.rotation, flip: f.flip, width: f.width, length: f.length, height: f.height, thickness: f.linkToThickness === false ? Math.min(t, f.height / 2) : t });
          addMaterial(g.add, f.id, true);
          addBoss(g.add);
          removeMaterial(g.cut, f.id);
          history.cuts.push(g.cut);
        }
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'gusset') {
      if (!body) {
        errors[f.id] = 'A gusset needs a sheet metal body.';
        continue;
      }
      if (f.faces.length < 2) {
        errors[f.id] = 'Select the two faces on both sides of the bend.';
        continue;
      }
      const sm = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const target = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(new THREE.Vector3(...f.faces[0].point)) < 0.5)) ?? body;
      const r = gussetTools(target.geometry, target.id, { faces: f.faces, depth: f.depth, width: f.width, offset: f.offset, flip: f.flip, thickness: sm.thickness, bendRadius: sm.bendRadius });
      if ('error' in r) {
        errors[f.id] = r.error;
        continue;
      }
      try {
        target.geometry = csg(target.geometry, r.add, 'union');
        target.geometry = csg(target.geometry, r.cut, 'subtract');
        target.featureIds.push(f.id);
        addBoss(r.add);
        history.cuts.push(r.cut);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'tabSlot') {
      if (!f.edge || !f.slotFace) {
        errors[f.id] = !f.edge ? 'Select the edge of the sheet that gets the tabs.' : 'Select the face of the other sheet that gets the slots.';
        continue;
      }
      const sm = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const edgeBody = visibleBodies().find((b) => matchEdgeRef(bodyEdgesOf(b.geometry, b.id), f.edge!));
      const slotBody = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(new THREE.Vector3(...f.slotFace!.point)) < 0.5));
      if (!edgeBody || !slotBody) {
        errors[f.id] = !edgeBody ? 'The tab edge is no longer on a body.' : 'The slot face is no longer on a body.';
        continue;
      }
      if (edgeBody === slotBody) {
        errors[f.id] = 'The slot face must be on another body than the tab edge.';
        continue;
      }
      slotBody.geometry.computeBoundingSphere();
      const r = tabSlotTools(edgeBody.geometry, edgeBody.id, { edge: f.edge, slotFace: f.slotFace, tabLength: f.tabLength, tabHeight: f.linkToThickness !== false ? sm.thickness : f.tabHeight, count: f.count, edgeOffset: f.edgeOffset, clearance: f.clearance, thickness: sm.thickness }, (slotBody.geometry.boundingSphere?.radius ?? 10) * 2 + 10);
      if ('error' in r) {
        errors[f.id] = r.error;
        continue;
      }
      try {
        edgeBody.geometry = csg(edgeBody.geometry, r.tabs, 'union');
        edgeBody.featureIds.push(f.id);
        slotBody.geometry = csg(slotBody.geometry, r.slots, 'subtract');
        slotBody.featureIds.push(f.id);
        addBoss(r.tabs);
        history.cuts.push(r.slots);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'rip') {
      if (!body) {
        errors[f.id] = 'Rip needs a (shelled) solid body.';
        continue;
      }
      if (!f.edges.length) {
        errors[f.id] = 'Select the edges to rip.';
        continue;
      }
      const sm = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const target = visibleBodies().find((b) => f.edges.some((e) => matchEdgeRef(bodyEdgesOf(b.geometry, b.id), e))) ?? body;
      const tool = ripTool(target.geometry, target.id, { edges: f.edges, gap: f.gap, direction: f.direction, thickness: sm.thickness });
      if ('error' in tool) {
        errors[f.id] = tool.error;
        continue;
      }
      try {
        target.geometry = csg(target.geometry, tool, 'subtract');
        target.featureIds.push(f.id);
        history.cuts.push(tool);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'sweptFlange') {
      consumedSketches.add(f.sketchId);
      if (f.pathSketchId) consumedSketches.add(f.pathSketchId);
      if (sheet) sheet.bentOnly = false;
      const sketch = doc.sketches[f.sketchId];
      if (!sketch) {
        errors[f.id] = 'Select the profile sketch of the swept flange (an open chain).';
        continue;
      }
      const chain = sketchChains(sketch).find((c) => !c.closed && c.points.length >= 2);
      if (!chain) {
        errors[f.id] = 'The swept flange profile must be an open chain of lines and arcs.';
        continue;
      }
      const sm = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      let path: THREE.Vector3[] | null = null;
      if (f.pathSketchId && doc.sketches[f.pathSketchId]) path = sketchPath(doc.sketches[f.pathSketchId], resolvePlaneDef(doc, doc.sketches[f.pathSketchId].plane));
      else if (f.edges.length) {
        const owner = visibleBodies().find((b) => f.edges.some((e) => matchEdgeRef(bodyEdgesOf(b.geometry, b.id), e))) ?? body;
        if (owner) {
          const all = bodyEdgesOf(owner.geometry, owner.id);
          const picked = f.edges.map((e) => matchEdgeRef(all, e)).filter((e): e is NonNullable<typeof e> => !!e);
          path = chainEdges(picked);
        }
      }
      if (!path || path.length < 2) {
        errors[f.id] = 'Select the path of the swept flange: a sketch or edges of the sheet.';
        continue;
      }
      const g = sweepGeometry(sweptFlangeRegions(chain.points, sm.thickness, f.reverse), resolvePlaneDef(doc, sketch.plane), path);
      if (!g) {
        errors[f.id] = 'The swept flange has no volume (the profile must start on the path).';
        continue;
      }
      try {
        addMaterial(g, f.id, f.merge !== false);
        addBoss(g);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'weldment') continue;
    if (f.type === 'deform') {
      if (!f.point) {
        errors[f.id] = 'Select the face of the deform point.';
        continue;
      }
      const p0 = new THREE.Vector3(...f.point);
      const target = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(p0) < 0.5)) ?? body;
      if (!target) {
        errors[f.id] = 'Deform needs a solid body.';
        continue;
      }
      try {
        // the push goes into the body (against the face normal) unless reversed
        const dir = f.direction.map((x) => (f.reverse ? x : -x)) as [number, number, number];
        target.geometry = pointDeform(target.geometry, { point: f.point, direction: dir, distance: f.distance, radius: f.radius, stiffness: f.stiffness });
        target.featureIds.push(f.id);
        history.boss = target.geometry;
        history.cuts = [];
      } catch (err) {
        errors[f.id] = `Could not deform the body: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'structuralMember') {
      consumedSketches.add(f.sketchId);
      const sk2 = doc.sketches[f.sketchId];
      const f3 = doc.features.find((x) => x.id === f.sketchId && x.type === 'sketch3d');
      let paths: THREE.Vector3[][] = [];
      if (sk2) {
        const pl = resolvePlaneDef(doc, sk2.plane);
        const pm = planeMatrix(pl);
        paths = sketchChains(sk2).map((c) => { const pts = c.points.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(pm)); if (c.closed) pts.push(pts[0].clone()); return pts; });
      } else if (f3 && f3.type === 'sketch3d') paths = sketch3DChains(f3.segments, f3.fillets);
      if (!paths.length) {
        errors[f.id] = 'Select the path sketch (2D or 3D) of the structural members.';
        continue;
      }
      const prof = findProfile(f.standard, f.profileType, f.size);
      const region = placedProfile(profileRegion(prof), f.rotation, !!f.mirror, f.locate);
      const segs = memberSegments(paths);
      if (!segs.length) {
        errors[f.id] = 'The path has no straight segments.';
        continue;
      }
      try {
        const built = structuralMembers(region, segs, f.corner, f.gap, f.mergeArcs);
        const loops = K ? profileLoops(prof, f.rotation, !!f.mirror, f.locate) : null;
        for (const m of built) {
          // B-rep: the profile prism (true circles for a pipe), cut back on the miter planes
          let memberShape: BrepShape | null = null;
          if (K && loops && m.exact) {
            try {
              const ex = m.exact;
              let sh = K.extrudeLoop(ex.plane, loops.outer, 0, ex.length);
              for (const h of loops.holes) { const hs = sh && K.extrudeLoop(ex.plane, h, -1, ex.length + 2); if (sh && hs) sh = K.cut(sh, hs); }
              for (const c of ex.clips) if (sh) sh = K.clipByPlane(sh, c.point, c.normal);
              memberShape = sh;
            } catch {
              memberShape = null;
            }
          }
          const b = newBody(m.geometry, f.id, memberShape);
          bodyMeta[b.id] = { kind: 'member', description: `${prof.type.toUpperCase()} ${prof.size}`, length: m.length, angle1: m.angle1, angle2: m.angle2 };
          addBoss(m.geometry);
        }
        if (!built.length) errors[f.id] = 'No members could be built from the path.';
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'trimExtend') {
      const targets = bodies.filter((b) => f.bodies.includes(b.id));
      if (!targets.length) {
        errors[f.id] = 'Select the bodies to be trimmed.';
        continue;
      }
      try {
        for (const t of targets) {
          // B-rep: an exact member cut by exact trimming bodies (no weld gap) or by the plane
          const exT = exactOf(t);
          if (K && exT) {
            try {
              let sh: BrepShape | null = null;
              if (f.trimBy === 'bodies' && !(f.weldGap > 0)) {
                const tb = bodies.filter((b) => f.trimBodies.includes(b.id) && b !== t);
                if (tb.length && tb.every((b) => exactOf(b))) sh = tb.reduce((acc, b) => K.cut(acc, exactOf(b)!), exT);
              } else if (f.trimBy !== 'bodies' && f.face) sh = K.clipByPlane(exT, f.face.point, f.face.normal);
              if (sh) {
                if (K.volume(sh) < 1e-9) bodies.splice(bodies.indexOf(t), 1);
                else setExact(t, sh);
                t.featureIds.push(f.id);
                continue;
              }
            } catch {
              /* the mesh kernel below */
            }
          }
          if (f.trimBy === 'bodies') {
            const tools = bodies.filter((b) => f.trimBodies.includes(b.id) && b !== t).map((b) => b.geometry);
            if (!tools.length) { errors[f.id] = 'Select the trimming bodies.'; break; }
            t.geometry = trimByBodies(t.geometry, tools, f.weldGap);
          } else {
            if (!f.face) { errors[f.id] = 'Select the trimming face or plane.'; break; }
            t.geometry = trimByPlane(t.geometry, { origin: f.face.point, n: f.face.normal });
          }
          t.featureIds.push(f.id);
          if (isEmpty(t.geometry)) bodies.splice(bodies.indexOf(t), 1);
        }
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'endCap') {
      if (!f.faces.length) {
        errors[f.id] = 'Select the end faces of the tubes to cap.';
        continue;
      }
      try {
        let made = 0;
        for (const ref of f.faces) {
          const hit = findFaceOnBodies(visibleBodies(), ref);
          if (!hit) continue;
          const owner = visibleBodies().find((b) => b.geometry === hit.body)!;
          const wall = owner ? Math.max(1, Math.min(...[3])) : 3;
          const offset = f.useRatio ? Math.max(0, f.ratio) * (bodyMeta[owner?.id ?? '']?.kind === 'member' ? wall : 1) * 1 : Math.max(0, f.offset);
          const cap = endCapGeometry(hit.body, hit.face, f.thickness, offset, f.outward, f.chamfer);
          if (!cap) continue;
          // B-rep: the cap of a straight-sided tube (a polygon outline) is an exact plate
          let capShape: BrepShape | null = null;
          if (K && owner && exactOf(owner)) {
            const outline = faceOutline(hit.body, hit.face);
            if (outline && outline.region.outer.length <= 16) { try { capShape = K.fromMesh(cap); } catch { capShape = null; } }
          }
          const b = newBody(cap, f.id, capShape);
          bodyMeta[b.id] = { kind: 'cap', description: `End cap ${f.thickness} mm`, length: f.thickness, angle1: 0, angle2: 0 };
          made++;
        }
        if (!made) errors[f.id] = 'None of the selected faces is still on a body.';
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'weldGusset' || f.type === 'weldBead') {
      if (f.faces.length < 2) {
        errors[f.id] = 'Select the two faces that meet at the corner.';
        continue;
      }
      const fa = findFaceOnBodies(visibleBodies(), f.faces[0]), fb = findFaceOnBodies(visibleBodies(), f.faces[1]);
      if (!fa || !fb) {
        errors[f.id] = 'A selected face is no longer on a body.';
        continue;
      }
      try {
        if (f.type === 'weldGusset') {
          const r = weldGussetGeometry(fa, fb, { profile: f.profile, d1: f.d1, d2: f.d2, d3: f.d3, thickness: f.thickness, location: f.location, offset: f.offset });
          if ('error' in r) { errors[f.id] = r.error; continue; }
          const b = newBody(r.geometry, f.id);
          bodyMeta[b.id] = { kind: 'gusset', description: `Gusset ${f.d1} x ${f.d2} x ${f.thickness}`, length: f.d1, angle1: 0, angle2: 0 };
        } else {
          const r = weldBeadGeometry(fa, fb, { size: f.size, intermittent: f.intermittent, from: f.from, to: f.to });
          if ('error' in r) { errors[f.id] = r.error; continue; }
          const b = newBody(r.geometry, f.id);
          bodyMeta[b.id] = { kind: 'bead', description: `Weld bead ${f.size} mm${f.intermittent ? ` intermittent ${f.intermittent.length}/${f.intermittent.pitch}` : ''}`, length: r.length, angle1: 0, angle2: 0 };
        }
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'convertSheet') {
      if (!body) {
        errors[f.id] = 'Convert to Sheet Metal needs a solid body.';
        continue;
      }
      if (!f.fixedFace) {
        errors[f.id] = 'Select the fixed face of the solid.';
        continue;
      }
      const fixed = findFace(body.geometry, f.fixedFace);
      if (!fixed) {
        errors[f.id] = 'The fixed face is no longer there.';
        continue;
      }
      // the open side: the planar face opposite the fixed face, farthest away
      const fn = new THREE.Vector3(...fixed.normal);
      const opp = planarFaces(body.geometry, body.id).filter((x) => !x.curved && new THREE.Vector3(...x.normal).dot(fn) < -0.999).sort((a, b) => new THREE.Vector3(...b.centroid).dot(fn) - new THREE.Vector3(...a.centroid).dot(fn))[0];
      // the bends: the straight sharp edges of the solid that run along the fixed face (not up from it: those are the
      // corners) and do not lie on the open face; with Ignore beveled faces not the edges of a face at a slant to the
      // fixed face (a chamfer stays a cut face)
      {
        const on = (face: { normal: [number, number, number]; centroid: [number, number, number] }) => (e: BodyEdge) => {
          const n = new THREE.Vector3(...face.normal), c = new THREE.Vector3(...face.centroid);
          return e.segments.some((s) => (s.n1.dot(n) > 0.999 || s.n2.dot(n) > 0.999) && Math.abs(s.a.clone().sub(c).dot(n)) < 1e-3);
        };
        const beveled = (v: THREE.Vector3) => { const k = Math.abs(v.clone().normalize().dot(fn)); return k > 0.01 && k < 0.99; };
        const onOpen = opp ? on(opp) : () => false;
        const along = (e: BodyEdge) => Math.abs(e.points[e.points.length - 1].clone().sub(e.points[0]).normalize().dot(fn)) < 0.01;
        const bends = bodyEdges(body.geometry, body.id).filter((e) => !onOpen(e) && e.straight && along(e) && !(f.ignoreBeveled && e.segments.some((s) => beveled(s.n1) || beveled(s.n2))));
        bendCounts[f.id] = bends.length;
      }
      try {
        // Keep body: the solid stays as a second body (hidden, by design)
        if (f.keepBody) {
          const kept = newBody(body.geometry.clone(), f.id);
          hiddenIds.add(kept.id);
          autoHidden.push(kept.id);
        }
        body.geometry = applyShellFromHistory(body.geometry, f.thickness, opp ? [{ normal: opp.normal, point: opp.centroid }] : [], history);
        history.boss = body.geometry;
        history.cuts = [];
        body.featureIds.push(f.id);
      } catch (err) {
        errors[f.id] = `Could not convert the solid: ${(err as Error).message}`;
      }
      continue;
    }
    if (isFasteningFeature(f)) {
      buildFastening(f, { doc, bodies, body, visibleBodies, errors, curves, K, addMaterial, removeMaterial, addBoss });
      continue;
    }
    if (f.type === 'hole') {
      if (!body) {
        errors[f.id] = 'A hole needs an existing solid body.';
        continue;
      }
      if (!f.points.length) {
        errors[f.id] = 'Place at least one hole position.';
        continue;
      }
      const pl = resolvePlaneDef(doc, f.plane);
      body.geometry.computeBoundingSphere();
      const extent = Math.max(10, (body.geometry.boundingSphere?.radius ?? 0) * 3 + 10);
      try {
        for (const [i, pt] of f.points.entries()) {
          // Advanced Hole: where the hole leaves the body (before cutting), for the far side element
          let exit: THREE.Vector3 | null = null;
          if (f.farSide || f.farCs) {
            const n = new THREE.Vector3(...pl.n).normalize();
            const start = new THREE.Vector3(...pl.origin).addScaledVector(new THREE.Vector3(...pl.u), pt.x).addScaledVector(new THREE.Vector3(...pl.v), pt.y);
            const ray = new THREE.Raycaster(start.clone().addScaledVector(n, 1e-3), n.clone().negate());
            const hits = ray.intersectObject(new THREE.Mesh(body.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), false);
            const out = hits.find((h) => h.distance > 0.01 && h.face && h.face.normal.dot(n) < 0);
            if (out) exit = out.point.clone();
          }
          const tool = holeTool(f, pl, pt, extent);
          removeMaterial(tool, f.id, undefined, K && !f.farSide && !f.farCs ? brepHoleTool(K, f, pl, pt, extent) : null);
          history.cuts.push(tool);
          // Far side countersink (Options): the same as an Advanced Hole far side countersink
          const far = f.farSide ?? (f.farCs ? { kind: 'countersink' as const, diameter: f.farCs.diameter, depth: 0, angle: f.farCs.angle } : undefined);
          if (far && exit) {
            const fs = far;
            const fpl = { ...pl, origin: [exit.x, exit.y, exit.z] as [number, number, number], v: pl.v.map((x) => -x) as [number, number, number], n: pl.n.map((x) => -x) as [number, number, number] };
            const ft = holeTool({ holeType: fs.kind, diameter: f.diameter, depth: Math.max(0.1, fs.kind === 'counterbore' ? fs.depth : 0.1), cbDiameter: fs.diameter, cbDepth: fs.depth, csDiameter: fs.diameter, csAngle: fs.angle }, fpl, { x: 0, y: 0 }, extent);
            removeMaterial(ft, f.id);
            history.cuts.push(ft);
          } else if (far) errors[f.id] = 'The hole does not come out of the body: the far side element is left out.';
          // Straight Tap: the cosmetic thread (major diameter) is shown as a dashed circle at the hole entry
          if (f.holeType === 'tap' && f.threadDiameter && f.cosmeticThread !== false) {
            const o = new THREE.Vector3(...pl.origin), u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v);
            const ring: THREE.Vector3[] = [];
            for (let k = 0; k <= 48; k++) {
              const a = (k / 48) * Math.PI * 2;
              ring.push(o.clone().addScaledVector(u, pt.x + (f.threadDiameter / 2) * Math.cos(a)).addScaledVector(v, pt.y + (f.threadDiameter / 2) * Math.sin(a)));
            }
            curves.push({ id: `${f.id}:thread${i}`, name: 'Cosmetic Thread', points: ring, dashed: true });
          }
        }
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (isRoundFeature(f)) {
      if (!body) {
        errors[f.id] = 'A fillet or chamfer needs an existing solid body.';
        continue;
      }
      // Face Fillet ▸ Hold line: the size came from the hold line (sizedByHoldLine); a hold line that failed is said
      if (holdLineErrors[f.id]) { errors[f.id] = holdLineErrors[f.id]; continue; }
      // Chamfer ▸ Vertex: a tetrahedron at the corner, its three distances along the edges that meet there
      if (f.type === 'chamfer' && f.roundType === 'vertex') {
        if (!f.vertex) { errors[f.id] = 'Select the vertex to chamfer.'; continue; }
        const vt = vertexChamferTool(body.geometry, new THREE.Vector3(...f.vertex.point), f.size, f.equalDistance === false ? f.size2 ?? f.size : f.size, f.equalDistance === false ? f.size3 ?? f.size : f.size);
        if (!vt) { errors[f.id] = 'The vertex is no longer a corner of three edges (dangling reference).'; continue; }
        try {
          body.geometry = csg(body.geometry, vt, 'subtract');
          body.featureIds.push(f.id);
        } catch (err) {
          errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
        }
        continue;
      }
      // B-rep fillet / chamfer with a constant size on an exact body: the faces of the round are true surfaces
      if (K && brepRoundable(f)) {
        let done = false;
        for (const b of [body, ...visibleBodies().filter((x) => x !== body)]) {
          const ex = exactOf(b);
          if (!b || !ex) continue;
          const edges = bodyEdges(b.geometry, b.id);
          const found = f.edges.map((ref) => matchEdges(edges, ref)), matched = found.flat();
          const radii = found.flatMap((x, i) => x.map(() => f.radii?.[i] ?? f.size));
          if (!matched.length) continue;
          try {
            const perEdge = f.type === 'fillet' && (!!f.radii?.length || (f.roundType === 'variable' && !!f.variable));
            const shape = perEdge
              ? K.filletEach(ex, matched.map((e, ei) => (f.roundType === 'variable' && f.variable ? { edge: e, r1: Math.max(0.01, f.variable.start), r2: Math.max(0.01, f.variable.end) } : { edge: e, r1: radii[ei] })))
              : f.type === 'fillet' ? K.fillet(ex, matched, f.size) : K.chamfer(ex, matched, f.size);
            setExact(b, shape);
            b.featureIds.push(f.id);
            const lost = found.filter((x) => !x.length).length;
            if (lost) errors[f.id] = `Warning: ${lost} of the ${f.edges.length} edge references could not be found after the rebuild; the feature uses the rest.`;
            done = true;
          } catch {
            /* the mesh kernel below */
          }
          break;
        }
        if (done) continue;
      }
      // the body that owns the selected edges (the first one where they match)
      let target = body;
      let r = applyRoundFeature(target.geometry, f);
      if (!r.geometry && bodies.length > 1) {
        for (const b of visibleBodies()) {
          if (b === body) continue;
          const rb = applyRoundFeature(b.geometry, f);
          if (rb.geometry) { target = b; r = rb; break; }
        }
      }
      if (!r.geometry) errors[f.id] = r.error ?? 'Could not build the feature.';
      else {
        // dangling references: the feature builds with the edges that are left and says so (yellow in the tree)
        if (r.lost) errors[f.id] = `Warning: ${r.lost} of the ${f.edges.length} edge references could not be found after the rebuild; the feature uses the rest.`;
        // Keep features (default on): earlier cuts that a fillet would fill or swallow are cut again,
        // unless the cut owns the filleted edges
        if (f.keepFeatures !== false && r.tools && history.cuts.length) {
          const toolBox = new THREE.Box3();
          for (const t of [...r.tools.cutters, ...r.tools.adders]) { t.computeBoundingBox(); if (t.boundingBox) toolBox.union(t.boundingBox); }
          // a cut owns an edge when its tool passes through the edge itself: points along the edge, not its centroid
          // (the centroid of the rim of a hole is the hole's axis, and the hole was cut again through its own
          // fillet, which broke the body, QA 0.5.10 F139)
          const samples = f.edges.flatMap((ref) => matchEdges(r.edges, ref)).map((e) => { const n = Math.min(12, e.points.length); return Array.from({ length: n }, (_, i) => e.points[Math.floor((i * (e.points.length - 1)) / Math.max(1, n - 1))]); });
          for (const c of history.cuts) {
            c.computeBoundingBox();
            if (!c.boundingBox || !c.boundingBox.intersectsBox(toolBox)) continue;
            const bvh = new MeshBVH(c.index ? c.toNonIndexed() : c);
            const owns = samples.some((pts) => pts.filter((m) => { const h = bvh.closestPointToPoint(m); return !!h && h.distance < 1e-2; }).length >= Math.ceil(pts.length * 0.8));
            if (owns) continue;
            // the cut is only kept when the boolean gives a closed body that did not grow: a tool whose faces
            // coincide with the rounded body now and then breaks the boolean, and the fillet stays as it is then
            try {
              const again = csg(r.geometry, c, 'subtract');
              if (!again.userData.openArea && Math.abs(meshVolume(again)) <= Math.abs(meshVolume(r.geometry)) + 1e-6) r.geometry = again;
            } catch { /* keep the fillet as it is */ }
          }
        }
        target.geometry = r.geometry;
        for (const c of r.tools?.cutters ?? []) history.cuts.push(c);
        for (const a of r.tools?.adders ?? []) addBoss(a);
        target.featureIds.push(f.id);
      }
      continue;
    }
    if (f.type === 'surface') {
      try {
        let g: THREE.BufferGeometry | null = null;
        if (f.sketchId) consumedSketches.add(f.sketchId);
        if (f.kind === 'extrude') g = extrudedSurface(doc, f);
        else if (f.kind === 'revolve') g = revolvedSurface(doc, f);
        else if (f.kind === 'planar') g = planarSurface(doc, f);
        else if (f.kind === 'offset') g = offsetSurface(bodies, f);
        else if (f.kind === 'trim' && f.mutual) {
          // Mutual: every selected surface is trimmed by the (flat) other surfaces, keeping the side towards them
          const parts = (f.targets ?? []).map((id) => surfaceBodies.find((s) => s.featureIds[0] === id)).filter((x): x is Body => !!x);
          if (parts.length < 2) {
            errors[f.id] = 'Select two or more surfaces that trim each other.';
            continue;
          }
          const planes = parts.map((p) => fitPlane(p.geometry));
          const cents = parts.map((p) => surfaceCentroid(p.geometry));
          if (planes.every((p) => !p)) {
            errors[f.id] = 'Mutual trim needs at least one flat surface among the selections.';
            continue;
          }
          const next = parts.map((p, i) => {
            let g: THREE.BufferGeometry | null = p.geometry;
            parts.forEach((_, j) => {
              const pl = planes[j];
              if (j === i || !pl || !g) return;
              const n = new THREE.Vector3(...pl.n);
              // keep the side of this surface where most of it lies (its centroid), the other side with Flip
              const side = cents[i].clone().sub(new THREE.Vector3(...pl.origin)).dot(n) >= 0;
              const keep = f.flip ? !side : side;
              g = trimSurface(g, { id: 'm', name: 'm', origin: pl.origin, u: [1, 0, 0], v: [0, 1, 0], n: pl.n }, !keep);
            });
            return g;
          });
          if (next.some((g) => !g)) {
            errors[f.id] = 'Nothing of a surface is left on the kept side.';
            continue;
          }
          parts.forEach((p, i) => { p.geometry = next[i]!; p.featureIds.push(f.id); });
          continue;
        }
        else if (f.kind === 'trim') {
          const target = surfaceBodies.find((x) => x.featureIds[0] === f.target);
          if (!target || !f.trimPlane) {
            errors[f.id] = 'Select the trim plane and the surface to trim.';
            continue;
          }
          const tg = trimSurface(target.geometry, resolvePlaneDef(doc, f.trimPlane), !!f.flip);
          if (!tg) {
            errors[f.id] = 'Nothing of the surface is left on the kept side of the trim tool.';
            continue;
          }
          target.geometry = tg;
          target.featureIds.push(f.id);
          continue;
        }
        else if (f.kind === 'filled' || f.kind === 'untrim' || f.kind === 'deleteHole' || f.kind === 'extend' || f.kind === 'flatten' || f.kind === 'thicken' || f.kind === 'thickenCut' || f.kind === 'cutWithSurface' || f.kind === 'ruled' || f.kind === 'replaceFace') {
          const target = surfaceBodies.find((x) => x.featureIds[0] === f.target);
          const needsTarget = f.kind !== 'ruled' && f.kind !== 'replaceFace' && !(f.kind === 'filled' && f.sketchId && !f.target);
          if (needsTarget && !target) {
            errors[f.id] = 'Select the surface.';
            continue;
          }
          if (f.kind === 'filled') {
            // Filled Surface: a patch over a surface's boundary (or a planar patch over a sketch)
            if (!target) g = planarSurface(doc, f);
            else {
              g = fillLoops(target.geometry, f.fillWhich ?? 'outer');
              if (!g) { errors[f.id] = 'The surface has no open boundary to fill.'; continue; }
            }
          } else if (f.kind === 'untrim' || f.kind === 'deleteHole') {
            const patchG = fillLoops(target!.geometry, 'inner');
            if (!patchG) { errors[f.id] = 'The surface has no inner loop (hole) to close.'; continue; }
            target!.geometry = mergeGeometries([target!.geometry, patchG]);
            target!.featureIds.push(f.id);
            continue;
          } else if (f.kind === 'extend') {
            const strip = extendSurface(target!.geometry, Math.max(0.01, f.distance ?? 5));
            if (!strip) { errors[f.id] = 'The surface has no open edges to extend.'; continue; }
            target!.geometry = mergeGeometries([target!.geometry, strip]);
            target!.featureIds.push(f.id);
            continue;
          } else if (f.kind === 'flatten') {
            const flat = flattenSurface(target!.geometry);
            if (!flat) { errors[f.id] = 'The surface could not be flattened.'; continue; }
            // laid down beside the surface (to the +X side of its bounding box)
            target!.geometry.computeBoundingBox();
            flat.computeBoundingBox();
            const tb = target!.geometry.boundingBox!, fb = flat.boundingBox!;
            flat.translate(tb.max.x - fb.min.x + 10, tb.min.y - fb.min.y, tb.min.z - fb.min.z);
            g = flat;
          } else if (f.kind === 'thicken') {
            const tg = thickenSurface(target!.geometry, Math.max(0.01, f.thickness ?? 2));
            if (body && f.merge !== false) {
              addMaterial(tg, f.id, true);
              addBoss(tg);
            } else {
              newBody(tg, f.id);
              addBoss(tg);
            }
            continue;
          } else if (f.kind === 'thickenCut') {
            const tool = thickenSurface(target!.geometry, Math.max(0.01, f.thickness ?? 2));
            if (!removeMaterial(tool, f.id, f.scope)) { errors[f.id] = 'The thickened surface does not touch any body (check the Feature Scope).'; continue; }
            history.cuts.push(tool);
            continue;
          } else if (f.kind === 'cutWithSurface') {
            const pl = fitPlane(target!.geometry);
            if (!pl) { errors[f.id] = 'Cut With Surface needs a flat surface in this build.'; continue; }
            const box = new THREE.Box3();
            for (const b of visibleBodies()) { b.geometry.computeBoundingBox(); if (b.geometry.boundingBox) box.union(b.geometry.boundingBox); }
            const size = box.isEmpty() ? 1000 : box.getSize(new THREE.Vector3()).length() * 2 + 10;
            const tool = halfSpaceBox(pl, size, !!f.flip);
            if (!removeMaterial(tool, f.id, f.scope)) { errors[f.id] = 'The surface does not cut any body (check the Feature Scope and the direction).'; continue; }
            history.cuts.push(tool);
            continue;
          } else if (f.kind === 'ruled') {
            if (!f.edge) { errors[f.id] = 'Select an edge of the model.'; continue; }
            let found: { e: BodyEdge; faceN: THREE.Vector3; faceC: THREE.Vector3 } | null = null;
            for (const b of visibleBodies()) {
              const e = matchEdge(bodyEdges(b.geometry, b.id), f.edge);
              if (!e) continue;
              const faces = planarFaces(b.geometry, b.id);
              // the face the edge lies on (its centroid nearest the edge's middle)
              const mid = e.centroid;
              const fc = faces.map((x) => ({ x, d: new THREE.Vector3(...x.centroid).distanceTo(mid) })).sort((p, q) => p.d - q.d)[0];
              found = { e, faceN: new THREE.Vector3(...(fc?.x.normal ?? [0, 1, 0])), faceC: new THREE.Vector3(...(fc?.x.centroid ?? [0, 0, 0])) };
              break;
            }
            if (!found) { errors[f.id] = 'The edge no longer exists on the model (dangling reference).'; continue; }
            const { e, faceN, faceC } = found;
            const dirAt = (i: number): THREE.Vector3 => {
              if (f.ruledMode === 'vector' && f.vector) return new THREE.Vector3(...f.vector);
              if (f.ruledMode === 'normal') return faceN.clone();
              // tangent to the face: perpendicular to the edge, within the face, away from the face
              const a = e.points[Math.max(0, i - 1)], b2 = e.points[Math.min(e.points.length - 1, i + 1)];
              const t = b2.clone().sub(a).normalize();
              const d = faceN.clone().cross(t).normalize();
              if (d.dot(e.points[i].clone().sub(faceC)) < 0) d.negate();
              return d;
            };
            g = ruledSurface(e.points, dirAt, Math.max(0.01, f.distance ?? 5));
          } else if (f.kind === 'replaceFace') {
            if (!f.faces?.length || !target) { errors[f.id] = 'Select the faces to replace and the replacement surface.'; continue; }
            const p0 = new THREE.Vector3(...f.faces[0].point);
            const owner = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(p0) < 0.5)) ?? body;
            if (!owner) { errors[f.id] = 'Replace Face needs a solid body.'; continue; }
            const pl = fitPlane(target.geometry);
            if (!pl) { errors[f.id] = 'The replacement surface must be flat in this build.'; continue; }
            const r = deleteFaces(owner.geometry, f.faces, 'patch');
            if (!r.geometry) { errors[f.id] = r.error ?? 'Could not remove the faces.'; continue; }
            // the body keeps the side of the surface where its centre lies
            r.geometry.computeBoundingBox();
            const c = r.geometry.boundingBox!.getCenter(new THREE.Vector3());
            const n = new THREE.Vector3(...pl.n);
            const keepSide = c.clone().sub(new THREE.Vector3(...pl.origin)).dot(n) >= 0;
            const size = r.geometry.boundingBox!.getSize(new THREE.Vector3()).length() * 2 + 10;
            owner.geometry = csg(r.geometry, halfSpaceBox(pl, size, keepSide), 'subtract');
            owner.featureIds.push(f.id);
            continue;
          }
        }
        else if (f.kind === 'sweep') { g = sweptSurface(doc, f); if (f.sketchId2) consumedSketches.add(f.sketchId2); }
        else if (f.kind === 'loft' || f.kind === 'boundary') { g = loftedSurface(doc, f); if (f.sketchId2) consumedSketches.add(f.sketchId2); }
        else if (f.kind === 'knit') {
          const parts = (f.surfaces ?? []).map((id) => surfaceBodies.find((s) => s.featureIds[0] === id)).filter((x): x is Body => !!x);
          if (parts.length < 1) {
            errors[f.id] = 'Select the surfaces to knit.';
            continue;
          }
          g = mergeGeometries(parts.map((x) => x.geometry));
          for (const x of parts) surfaceBodies.splice(surfaceBodies.indexOf(x), 1);
          // Show open edges: the boundary of the knitted surface (where nothing is knitted on)
          if (f.showOpenEdges) openEdges(g).forEach(([a, b], k) => curves.push({ id: `${f.id}:open${k}`, name: 'Open edge', points: [a, b], color: '#d0189a' }));
          // Merge entities off: the surfaces stay separate bodies
          if (f.mergeEntities === false && !f.createSolid) {
            for (const x of parts) surfaceBodies.push({ ...x, featureIds: [...x.featureIds, f.id] });
            continue;
          }
          // Create solid: a closed knit becomes a solid body (outward triangles)
          if (f.createSolid) {
            const shell = orientShell(g);
            if (!shell.closed) {
              errors[f.id] = 'The knitted surfaces do not enclose a volume, so no solid can be made.';
              continue;
            }
            const ng = shell.geometry;
            if (meshVolume(ng) < 0) flipWinding(ng);
            newBody(ng, f.id);
            continue;
          }
        }
        if (!g) {
          errors[f.id] = f.kind === 'sweep' ? 'Select the profile sketch and the path sketch.' : f.kind === 'loft' || f.kind === 'boundary' ? 'Select two profile sketches.' : f.kind === 'revolve' ? 'Draw a centerline as the axis of revolution and a curve to revolve.' : f.kind === 'offset' ? 'Select the face to offset.' : f.kind === 'planar' ? 'The sketch needs a closed contour.' : 'Select a sketch with curves.';
          continue;
        }
        surfaceBodies.push({ id: `surf${surfaceBodies.length + 1}`, geometry: g, faces: [], edges: [], featureIds: [f.id] });
      } catch (err) {
        errors[f.id] = `Could not build the surface: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'intersect') {
      // Cap planar openings: a flat surface in the selection splits the solid into two closed regions
      const surfPick = f.bodies.map((id) => surfaceBodies.find((s) => s.id === id)).find((s): s is Body => !!s);
      if (surfPick) {
        const solid = f.bodies.map((id) => bodies.find((b) => b.id === id)).find((b): b is Body => !!b);
        const pl = fitPlane(surfPick.geometry);
        if (!solid || !pl) {
          errors[f.id] = !solid ? 'Select a solid body and a surface.' : 'The surface must be flat to cap the openings.';
          continue;
        }
        if (!f.capPlanar) {
          errors[f.id] = 'Choose Cap planar openings to split a solid with a surface.';
          continue;
        }
        try {
          const big = 1e4;
          const n = new THREE.Vector3(...pl.n), o = new THREE.Vector3(...pl.origin);
          const half = (s: number) => {
            const box = new THREE.BoxGeometry(big, big, big).toNonIndexed();
            box.translate(0, 0, (s * big) / 2);
            box.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
            box.translate(o.x, o.y, o.z);
            return box;
          };
          const regions: { key: 'common' | 'a' | 'b'; g: THREE.BufferGeometry }[] = [
            { key: 'a', g: csg(solid.geometry, half(1), 'intersect') },
            { key: 'b', g: csg(solid.geometry, half(-1), 'intersect') },
          ];
          const kept = regions.filter((r) => !f.exclude.includes(r.key) && !isEmpty(r.g));
          if (!kept.length) { errors[f.id] = 'All regions are excluded.'; continue; }
          bodies.splice(bodies.indexOf(solid), 1);
          if (f.consumeSurfaces) surfaceBodies.splice(surfaceBodies.indexOf(surfPick), 1);
          if (f.merge) {
            let g = kept[0].g;
            for (const r of kept.slice(1)) g = csg(g, r.g, 'union');
            const nb = newBody(g, f.id);
            nb.featureIds = [...solid.featureIds, f.id];
          } else for (const r of kept) newBody(r.g, f.id);
        } catch (err) {
          errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
        }
        continue;
      }
      const picked = f.bodies.map((id) => bodies.find((b) => b.id === id)).filter((b): b is Body => !!b);
      if (picked.length !== 2) {
        errors[f.id] = 'Select two solid bodies to intersect.';
        continue;
      }
      // B-rep: two exact bodies give exact regions
      if (K && exactOf(picked[0]) && exactOf(picked[1])) {
        try {
          const [A, B] = picked;
          const ea = exactOf(A)!, eb = exactOf(B)!;
          const regs: { key: 'common' | 'a' | 'b'; s: BrepShape }[] = [
            { key: 'common', s: K.common(ea, eb) },
            { key: 'a', s: K.cut(ea, eb) },
            { key: 'b', s: K.cut(eb, ea) },
          ];
          const kept = regs.filter((r) => !f.exclude.includes(r.key) && K.volume(r.s) > 1e-9);
          if (!kept.length) { errors[f.id] = 'All regions are excluded.'; continue; }
          // every OpenCascade step first: a failure leaves the bodies as they were (mesh kernel below)
          const merged = f.merge ? kept.slice(1).reduce((u, r) => K.fuse(u, r.s), kept[0].s) : null;
          const tess = kept.map((r) => K.tessellate(r.s));
          bodies.splice(bodies.indexOf(A), 1);
          bodies.splice(bodies.indexOf(B), 1);
          if (merged) {
            const nb = newBody(tess[0], f.id, merged);
            nb.featureIds = [...A.featureIds, ...B.featureIds, f.id];
          } else kept.forEach((r, i) => newBody(tess[i], f.id, r.s));
          continue;
        } catch {
          /* the mesh kernel below */
        }
      }
      try {
        const [A, B] = picked;
        const regions: { key: 'common' | 'a' | 'b'; g: THREE.BufferGeometry }[] = [
          { key: 'common', g: csg(A.geometry, B.geometry, 'intersect') },
          { key: 'a', g: csg(A.geometry, B.geometry, 'subtract') },
          { key: 'b', g: csg(B.geometry, A.geometry, 'subtract') },
        ];
        const kept = regions.filter((r) => !f.exclude.includes(r.key) && !isEmpty(r.g));
        if (!kept.length) {
          errors[f.id] = 'All regions are excluded.';
          continue;
        }
        bodies.splice(bodies.indexOf(A), 1);
        bodies.splice(bodies.indexOf(B), 1);
        if (f.merge) {
          let g = kept[0].g;
          for (const r of kept.slice(1)) g = csg(g, r.g, 'union');
          const nb = newBody(g, f.id);
          nb.featureIds = [...A.featureIds, ...B.featureIds, f.id];
        } else for (const r of kept) newBody(r.g, f.id);
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    if (f.type === 'combine') {
      const picked = f.bodies.map((id) => bodies.find((b) => b.id === id)).filter((b): b is Body => !!b);
      if (picked.length < (f.op === 'subtract' ? 1 : 2) || (f.op === 'subtract' && !f.mainBody)) {
        errors[f.id] = f.op === 'subtract' ? 'Select a main body and the bodies to subtract.' : 'Select at least two bodies to combine.';
        continue;
      }
      // B-rep: every picked body exact → the combination is exact
      if (K && picked.every((b) => exactOf(b)) && (f.op !== 'subtract' || exactOf(bodies.find((b) => b.id === f.mainBody)))) {
        try {
          if (f.op === 'subtract') {
            const main = bodies.find((b) => b.id === f.mainBody)!;
            let sh = exactOf(main)!;
            for (const b of picked) if (b !== main) sh = K.cut(sh, exactOf(b)!);
            const gone = picked.filter((b) => b !== main);
            setExact(main, sh);
            for (const b of gone) { history.cuts.push(b.geometry); bodies.splice(bodies.indexOf(b), 1); }
            main.featureIds.push(f.id);
          } else {
            const main = picked[0];
            let sh = exactOf(main)!;
            for (const b of picked.slice(1)) sh = f.op === 'add' ? K.fuse(sh, exactOf(b)!) : K.common(sh, exactOf(b)!);
            const empty = K.volume(sh) < 1e-9;
            for (const b of picked.slice(1)) bodies.splice(bodies.indexOf(b), 1);
            if (empty) { bodies.splice(bodies.indexOf(main), 1); errors[f.id] = 'The bodies have nothing in common.'; }
            else { setExact(main, sh); main.featureIds.push(f.id); }
          }
          continue;
        } catch {
          /* the mesh kernel below */
        }
      }
      try {
        if (f.op === 'subtract') {
          const main = bodies.find((b) => b.id === f.mainBody);
          if (!main) { errors[f.id] = 'The main body no longer exists.'; continue; }
          for (const b of picked) {
            if (b === main) continue;
            main.geometry = csg(main.geometry, b.geometry, 'subtract');
            history.cuts.push(b.geometry);
            bodies.splice(bodies.indexOf(b), 1);
          }
          main.featureIds.push(f.id);
        } else {
          const main = picked[0];
          for (const b of picked.slice(1)) {
            main.geometry = csg(main.geometry, b.geometry, f.op === 'add' ? 'union' : 'intersect');
            bodies.splice(bodies.indexOf(b), 1);
          }
          main.featureIds.push(f.id);
          if (isEmpty(main.geometry)) { bodies.splice(bodies.indexOf(main), 1); errors[f.id] = 'The bodies have nothing in common.'; }
        }
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      continue;
    }
    let extent = THROUGH_ALL;
    const all = allVisible();
    if (all) {
      all.computeBoundingSphere();
      extent = Math.max(10, (all.boundingSphere?.radius ?? 0) * 3 + 10);
    }
    // sheet metal cut: Link to thickness makes the depth the sheet thickness (a normal cut through one sheet)
    const fx: Feature = f.type === 'extrude' && f.op === 'cut' && f.linkToThickness && doc.sheetMetal ? { ...f, end: 'blind', depth: doc.sheetMetal.thickness } : f;
    const r = featureGeometry(doc, fx as SketchBasedFeature, extent, all, bodies);
    if (!r.geometry) {
      errors[f.id] = r.error ?? 'Could not build the feature.';
      continue;
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
          continue;
        }
        if (!removeMaterial(r.geometry, f.id, sf.scope, toolShape ?? undefined)) {
          errors[f.id] = 'The cut does not touch any body (check the Feature Scope).';
          continue;
        }
        history.cuts.push(r.geometry);
      }
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    } catch (err) {
      // an internal error (missing data) is said in words; the technical text stays in brackets for a bug report
      if (!errors[f.id]) errors[f.id] = err instanceof TypeError || err instanceof RangeError ? `${f.name} could not be built: its data is incomplete or refers to geometry that no longer exists (${(err as Error).message}).` : `${f.name} could not be built: ${(err as Error).message}`;
    } finally {
      times[f.id] = (times[f.id] ?? 0) + (clock() - t0);
      // face names (F47): a body this feature rebuilt without them (a B-rep tessellation, a fillet) takes them from
      // the body before and the feature's tools
      for (const b of bodies) {
        if (b.geometry === before.get(b) || b.geometry.getAttribute(FACE_TAG)) continue;
        const prev = before.get(b);
        copyFaceNames(prev ? [prev, ...featureTools] : featureTools, b.geometry);
      }
      // a body that was exact and is faceted from this feature on (no B-rep version of it): said once, here (QA F51)
      if (K && !errors[f.id] && !warnings[f.id]) for (const b of bodies) if (b.featureIds[b.featureIds.length - 1] === f.id && !exactOf(b) && exactBefore.has(b)) warnings[f.id] = `${f.name} has no exact (B-rep) version: from here on this body is a faceted mesh (Faceted in the status bar); its mass properties and STEP are approximate.`;
      // the manifold gate (F48): a boolean of this feature left an opening in a body
      const open = bodies.filter((b) => b.featureIds[b.featureIds.length - 1] === f.id && b.geometry.userData.openArea);
      if (open.length && !errors[f.id]) warnings[f.id] = `The faceted result is not closed (an opening of about ${Math.max(...open.map((b) => b.geometry.userData.openArea as number)).toFixed(2)} mm²): mass properties and STEP of this body are approximate.`;
    }
  }
  const brep: Record<Id, BrepShape> = {};
  for (const b of bodies) {
    const ex = exactOf(b);
    if (ex && K) {
      b.exact = true;
      brep[b.id] = ex;
      try { b.exactVolume = K.volume(ex); } catch { /* the tessellation's volume is used */ }
    }
  }
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
  return { bodies, errors, consumedSketches, curves, surfaceBodies, extraAppearances, autoHidden, times, bodyMeta, ...(K ? { brep } : {}), ...(Object.keys(splitCounts).length ? { splitCounts } : {}), ...(outOfTime ? { stopped: true } : {}), ...(Object.keys(warnings).length ? { warnings } : {}), ...(Object.keys(bendCounts).length ? { bendCounts } : {}) };
}


/**
 * Cross-Break lines: the planar face through the picked point is collected from the body's triangles,
 * its outline is boxed along its longest hull edge and the two diagonals of that box are returned (slightly inset).
 */
export function crossBreakLines(g: THREE.BufferGeometry, face: { normal: [number, number, number]; point: [number, number, number] }): THREE.Vector3[][] | null {
  const n = new THREE.Vector3(...face.normal).normalize();
  const p0 = new THREE.Vector3(...face.point);
  const u = (Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(n).normalize();
  const v = n.clone().cross(u).normalize();
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const pts: [number, number][] = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  for (let t = 0; t + 2 < a.count; t += 3) {
    A.fromBufferAttribute(a, t); B.fromBufferAttribute(a, t + 1); C.fromBufferAttribute(a, t + 2);
    N.subVectors(B, A).cross(C.clone().sub(A));
    if (N.lengthSq() < 1e-12) continue;
    N.normalize();
    if (N.dot(n) < 0.999 || Math.abs(A.clone().sub(p0).dot(n)) > 1e-3) continue;
    for (const P of [A, B, C]) { const d = P.clone().sub(p0); pts.push([d.dot(u), d.dot(v)]); }
  }
  if (pts.length < 3) return null;
  // convex hull (monotone chain)
  const sorted = [...pts].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: [number, number], p: [number, number], q: [number, number]) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...sorted].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  let best = 0, ang = 0;
  for (let i = 0; i < hull.length; i++) {
    const p = hull[i], q = hull[(i + 1) % hull.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > best) { best = l; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); }
  }
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of hull) { const x = p[0] * ca + p[1] * sa, y = -p[0] * sa + p[1] * ca; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const lift = 0.02;
  const to3 = (x: number, y: number) => { const px = x * ca - y * sa, py = x * sa + y * ca; return p0.clone().addScaledVector(u, px).addScaledVector(v, py).addScaledVector(n, lift); };
  return [[to3(x0, y0), to3(x1, y1)], [to3(x0, y1), to3(x1, y0)]];
}
