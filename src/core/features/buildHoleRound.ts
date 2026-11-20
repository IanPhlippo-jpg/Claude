/**
 * The builders of holes, fillets and chamfers (moved out of the feature loop of rebuild.ts, QA 0.5.14 P2-14).
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Feature, RoundFeature } from '../document/types';
import type { Body } from './rebuild';
import { applyRoundFeature } from './rebuild';
import { RebuildStopped, type RebuildCtx } from './rebuildState';
import { csg, meshVolume } from './solid';
import { resolvePlaneDef } from './planes';
import { holeTool } from './pattern';
import { brepHoleTool } from './rebuildTools';
import { vertexChamferTool } from './round';
import { bodyEdges, matchEdges, roundEdgeSets } from './edgesets';
import { brepRoundable } from './brepTool';

/** Hole and Hole Wizard holes */
export function buildHole(f: Extract<Feature, { type: 'hole' }>, body: Body | undefined, ctx: RebuildCtx): void {
  const { doc, errors, curves, history, K, removeMaterial, tick } = ctx;
  if (!body) {
    errors[f.id] = 'A hole needs an existing solid body.';
    return;
  }
  if (!f.points.length) {
    errors[f.id] = 'Place at least one hole position.';
    return;
  }
  const pl = resolvePlaneDef(doc, f.plane);
  body.geometry.computeBoundingSphere();
  const extent = Math.max(10, (body.geometry.boundingSphere?.radius ?? 0) * 3 + 10);
  try {
    for (const [i, pt] of f.points.entries()) {
      // many holes in one feature: stop when the rebuild budget is used up (P2-5d)
      tick();
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
        const flip = (a: [number, number, number]): [number, number, number] => [-a[0], -a[1], -a[2]];
        const fpl = { ...pl, origin: [exit.x, exit.y, exit.z] as [number, number, number], v: flip(pl.v), n: flip(pl.n) };
        const farHole = { holeType: fs.kind, diameter: f.diameter, depth: Math.max(0.1, fs.kind === 'counterbore' ? fs.depth : 0.1) };
        const farTool = { ...farHole, cbDiameter: fs.diameter, cbDepth: fs.depth, csDiameter: fs.diameter, csAngle: fs.angle };
        const ft = holeTool(farTool, fpl, { x: 0, y: 0 }, extent);
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
    if (err instanceof RebuildStopped) throw err;
    errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
  }
}

/** Fillet and Chamfer */
export function buildRound(f: RoundFeature, body: Body | undefined, ctx: RebuildCtx): void {
  const { bodies, errors, history, K, addBoss, exactOf, setExact, visibleBodies, holdLineErrors } = ctx;
  if (!body) {
    errors[f.id] = 'A fillet or chamfer needs an existing solid body.';
    return;
  }
  // Face Fillet ▸ Hold line: the size came from the hold line (sizedByHoldLine); a hold line that failed is said
  if (holdLineErrors[f.id]) { errors[f.id] = holdLineErrors[f.id]; return; }
  // Chamfer ▸ Vertex: a tetrahedron at the corner, its three distances along the edges that meet there
  if (f.type === 'chamfer' && f.roundType === 'vertex') {
    if (!f.vertex) { errors[f.id] = 'Select the vertex to chamfer.'; return; }
    const unequal = f.equalDistance === false;
    const corner = new THREE.Vector3(...f.vertex.point);
    const vt = vertexChamferTool(body.geometry, corner, f.size, unequal ? f.size2 ?? f.size : f.size, unequal ? f.size3 ?? f.size : f.size);
    if (!vt) { errors[f.id] = 'The vertex is no longer a corner of three edges (dangling reference).'; return; }
    try {
      body.geometry = csg(body.geometry, vt, 'subtract');
      body.featureIds.push(f.id);
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return;
  }
  // B-rep fillet / chamfer with a constant size on an exact body: the faces of the round are true surfaces
  if (K && brepRoundable(f)) {
    let done = false;
    for (const b of [body, ...visibleBodies().filter((x) => x !== body)]) {
      const ex = exactOf(b);
      if (!b || !ex) continue;
      const edges = bodyEdges(b.geometry, b.id);
      // B-rep rounds are built with Tangent propagation on: each picked edge with its tangent chain (SW edges)
      const { found, lost } = roundEdgeSets(edges, f.edges, true), matched = found.flat();
      const radii = found.flatMap((x, i) => x.map(() => f.radii?.[i] ?? f.size));
      if (!matched.length) continue;
      try {
        const perEdge = f.type === 'fillet' && (!!f.radii?.length || (f.roundType === 'variable' && !!f.variable));
        const shape = perEdge
          ? K.filletEach(ex, matched.map((e, ei) => (f.roundType === 'variable' && f.variable
            ? { edge: e, r1: Math.max(0.01, f.variable.start), r2: Math.max(0.01, f.variable.end) }
            : { edge: e, r1: radii[ei] })))
          : f.type === 'fillet' ? K.fillet(ex, matched, f.size) : K.chamfer(ex, matched, f.size);
        setExact(b, shape);
        b.featureIds.push(f.id);
        if (lost) errors[f.id] = `Warning: ${lost} of the ${f.edges.length} edge references could not be found after the rebuild; the feature uses the rest.`;
        // the edge choice checked independently on the exact topology (F179): same wrong pick, same wrong bodies; the
        // picked edges themselves, not their tangent chains
        else { const other = K.checkEdges?.(ex, f.edges.map((ref) => matchEdges(edges, ref)), f.edges); if (other) errors[f.id] = other; }
        done = true;
      } catch {
        /* the mesh kernel below */
      }
      break;
    }
    if (done) return;
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
    // Keep features (default on): earlier cuts that a fillet would fill are cut again, unless the cut owns the
    // filleted edges. Only material the fillet added (a concave round) can fill a cut: a fillet that only takes
    // material away leaves every cut as it was, and cutting again with a tool whose faceted walls coincide with
    // the body's own broke the body (a stadium slot: a 10 mm spike and 21 mm³ too little, QA 0.5.11 F173)
    if (f.keepFeatures !== false && r.tools && r.tools.adders.length && history.cuts.length) {
      const toolBox = new THREE.Box3();
      for (const t of r.tools.adders) { t.computeBoundingBox(); if (t.boundingBox) toolBox.union(t.boundingBox); }
      // a cut owns an edge when its tool passes through the edge itself: points along the edge, not its centroid
      // (the centroid of the rim of a hole is the hole's axis, and the hole was cut again through its own
      // fillet, which broke the body, QA 0.5.10 F139)
      const samples = roundEdgeSets(r.edges, f.edges, true).found.flat().map((e) => {
        const n = Math.min(12, e.points.length);
        return Array.from({ length: n }, (_, i) => e.points[Math.floor((i * (e.points.length - 1)) / Math.max(1, n - 1))]);
      });
      for (const c of history.cuts) {
        c.computeBoundingBox();
        if (!c.boundingBox || !c.boundingBox.intersectsBox(toolBox)) continue;
        const bvh = new MeshBVH(c.index ? c.toNonIndexed() : c);
        const near = (m: THREE.Vector3) => { const h = bvh.closestPointToPoint(m); return !!h && h.distance < 1e-2; };
        const owns = samples.some((pts) => pts.filter(near).length >= Math.ceil(pts.length * 0.8));
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
}
