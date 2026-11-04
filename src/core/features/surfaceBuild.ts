// The rebuild of Split Line, Projected Curve, Wrap and the surface features, apart from rebuild.ts (line budget,
// QA 0.5.11 F134). The branches of the feature loop moved here unchanged; rebuild.ts hands over its helpers (buildContext.ts).
import { splitBodySurface, type SplitRegions } from './splitline';
import { resolvePlaneDef } from './planes';
import { sketchRegions } from './regions';
import { csg, flipWinding, mergeGeometries, meshVolume, planarFaces, planeMatrix } from './solid';
import * as THREE from 'three';
import { sketchChains } from './thin';
import { wrapSplineTool, wrapTool } from './wrap';
import { meshToolOf } from './rebuildTools';
import { extrudedSurface, fitPlane, loftedSurface, offsetSurface, openEdges, orientShell, planarSurface, revolvedSurface, surfaceCentroid, sweptSurface, thickenSurface, trimSurface } from './surfaces';
import type { Body } from './rebuild';
import { extendSurface, fillLoops, flattenSurface, halfSpaceBox, ruledSurface } from './surfaces2';
import { type BodyEdge, bodyEdges, matchEdge } from './edgesets';
import { deleteFaces } from './deleteface';
import type { Feature } from '../document/types';
import type { BuildContext } from './buildContext';

/** Split Line, Projected Curve, Wrap and the surface features: true when f is one of them (built, or marked with an error); false lets rebuild.ts go on */
export function buildSurfaceFeature(f: Feature, body: Body | undefined, ctx: BuildContext): boolean {
  const { errors, doc, splits, consumedSketches, curves, bodies, visibleBodies, addBoss, history, K, exactOf, addMaterial, removeMaterial, approxBodies, warnings, surfaceBodies, newBody } = ctx;
  if (f.type === 'splitLine' && (f.splitType === 'silhouette' || f.splitType === 'intersection')) {
    // Silhouette (direction of pull = the plane normal) / Intersection (the plane cuts the faces)
    if (!body) { errors[f.id] = 'A split line needs an existing solid body.'; return true; }
    if (!f.plane) { errors[f.id] = f.splitType === 'silhouette' ? 'Select the direction of pull (a plane).' : 'Select the splitting plane.'; return true; }
    try {
      const sr: SplitRegions = { plane: resolvePlaneDef(doc, f.plane), regions: [], kind: f.splitType };
      body.geometry = splitBodySurface(body.geometry, sr);
      splits.set(body.id, [...(splits.get(body.id) ?? []), sr]);
      body.featureIds.push(f.id);
    } catch (err) {
      errors[f.id] = `Split failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'splitLine') {
    const sketch = doc.sketches[f.sketchId];
    if (!sketch) {
      errors[f.id] = 'The sketch of this split line no longer exists.';
      return true;
    }
    consumedSketches.add(f.sketchId);
    if (!body) {
      errors[f.id] = 'A split line needs an existing solid body.';
      return true;
    }
    const regions = sketchRegions(sketch);
    if (!regions.length) {
      errors[f.id] = 'The split line sketch needs a closed profile.';
      return true;
    }
    try {
      const sr: SplitRegions = { plane: resolvePlaneDef(doc, sketch.plane), regions, single: !!f.single };
      body.geometry = splitBodySurface(body.geometry, sr);
      splits.set(body.id, [...(splits.get(body.id) ?? []), sr]);
      body.featureIds.push(f.id);
    } catch (err) {
      errors[f.id] = `Split failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'projectedCurve' && f.onSketch) {
    // Sketch on sketch: each point of the first sketch moves along its normal until it lies over the second sketch
    const s1 = doc.sketches[f.sketchId], s2 = f.sketchId2 ? doc.sketches[f.sketchId2] : undefined;
    if (!s1 || !s2) { errors[f.id] = 'Select the two sketches (on planes that are not parallel).'; return true; }
    consumedSketches.add(s1.id);
    consumedSketches.add(s2.id);
    const p1 = resolvePlaneDef(doc, s1.plane), p2 = resolvePlaneDef(doc, s2.plane);
    const m1 = planeMatrix(p1);
    const n1 = new THREE.Vector3(...p1.n).normalize();
    const o2 = new THREE.Vector3(...p2.origin), u2 = new THREE.Vector3(...p2.u), v2 = new THREE.Vector3(...p2.v);
    const du = n1.dot(u2), dv = n1.dot(v2);
    if (Math.hypot(du, dv) < 1e-6) { errors[f.id] = 'The two sketch planes are parallel: the curves cannot meet.'; return true; }
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
    return true;
  }
  if (f.type === 'projectedCurve') {
    const sketch = doc.sketches[f.sketchId];
    if (!sketch) {
      errors[f.id] = 'The sketch of this curve no longer exists.';
      return true;
    }
    consumedSketches.add(f.sketchId);
    const targets = bodies;
    if (!targets.length) {
      errors[f.id] = 'A projected curve needs a body to project onto.';
      return true;
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
    return true;
  }
  if (f.type === 'wrap' && f.method === 'spline') {
    // Wrap > Spline Surface: the sketch projected onto any face
    const sketch = doc.sketches[f.sketchId];
    const regions = sketch ? sketchRegions(sketch) : [];
    if (!body || !sketch || !f.splineFace || !regions.length) {
      errors[f.id] = !body ? 'Wrap needs a solid body.' : !sketch ? 'Select the sketch to wrap.' : !f.splineFace ? 'Select the face to wrap onto.' : 'The wrap sketch needs closed contours.';
      return true;
    }
    consumedSketches.add(f.sketchId);
    const fn = new THREE.Vector3(...f.splineFace.normal), fp = new THREE.Vector3(...f.splineFace.point);
    const target = visibleBodies().map((b) => ({ b, f: planarFaces(b.geometry, b.id).filter((x) => new THREE.Vector3(...x.normal).dot(fn) > 0.9).sort((x, y) => new THREE.Vector3(...x.centroid).distanceTo(fp) - new THREE.Vector3(...y.centroid).distanceTo(fp))[0] })).find((x) => x.f);
    if (!target) { errors[f.id] = 'The face to wrap onto is gone.'; return true; }
    const src = target.b.geometry.index ? target.b.geometry.toNonIndexed() : target.b.geometry;
    const pa = src.getAttribute('position');
    const fpos: number[] = [];
    for (const t of target.f!.triangles) for (let k = 0; k < 3; k++) fpos.push(pa.getX(t * 3 + k), pa.getY(t * 3 + k), pa.getZ(t * 3 + k));
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
    try {
      const tool = wrapSplineTool(regions, resolvePlaneDef(doc, sketch.plane), fgeo, f.kind === 'emboss' ? 'emboss' : 'deboss', f.kind === 'scribe' ? 0.02 : f.depth);
      if (!tool) { errors[f.id] = 'The sketch does not project onto the face.'; return true; }
      if (f.kind === 'emboss') { target.b.geometry = csg(target.b.geometry, tool, 'union'); addBoss(tool); }
      else { target.b.geometry = csg(target.b.geometry, tool, 'subtract'); history.cuts.push(tool); }
      target.b.featureIds.push(f.id);
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'wrap') {
    const sketch = doc.sketches[f.sketchId];
    if (!body || !sketch || !f.face) {
      errors[f.id] = !body ? 'Wrap needs a solid body with a cylindrical face.' : !sketch ? 'Select the sketch to wrap.' : 'Select a cylindrical face.';
      return true;
    }
    const regions = sketchRegions(sketch);
    if (!regions.length) {
      errors[f.id] = 'The wrap sketch needs closed contours.';
      return true;
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
      return true;
    }
    const tool = wrapTool(regions, plane, f.face, f.kind, f.depth);
    if (!tool) {
      errors[f.id] = 'Could not wrap the sketch.';
      return true;
    }
    // an exact body keeps its exact cylinder: the patch becomes a polyhedral B-rep tool (else the mesh kernel)
    const wrapShape = K && exactOf(body) ? meshToolOf(K, tool) : undefined;
    try {
      if (f.kind === 'emboss') addMaterial(tool, f.id, true, undefined, wrapShape);
      else if (!removeMaterial(tool, f.id, undefined, wrapShape)) errors[f.id] = 'The deboss does not touch the body.';
      // the patch is made of flat facets: the body is not called exact (QA 0.5.11 F175, P0-1), its STEP keeps the rest exact
      if (wrapShape && !errors[f.id]) { approxBodies.add(body); warnings[f.id] = `Warning: the wrapped patch of ${f.name} is made of flat facets: this body counts as faceted (Faceted in the status bar), its mass properties are approximate; the rest of it stays exact in STEP.`; }
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
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
          return true;
        }
        const planes = parts.map((p) => fitPlane(p.geometry));
        const cents = parts.map((p) => surfaceCentroid(p.geometry));
        if (planes.every((p) => !p)) {
          errors[f.id] = 'Mutual trim needs at least one flat surface among the selections.';
          return true;
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
          return true;
        }
        parts.forEach((p, i) => { p.geometry = next[i]!; p.featureIds.push(f.id); });
        return true;
      }
      else if (f.kind === 'trim') {
        const target = surfaceBodies.find((x) => x.featureIds[0] === f.target);
        if (!target || !f.trimPlane) {
          errors[f.id] = 'Select the trim plane and the surface to trim.';
          return true;
        }
        const tg = trimSurface(target.geometry, resolvePlaneDef(doc, f.trimPlane), !!f.flip);
        if (!tg) {
          errors[f.id] = 'Nothing of the surface is left on the kept side of the trim tool.';
          return true;
        }
        target.geometry = tg;
        target.featureIds.push(f.id);
        return true;
      }
      else if (f.kind === 'filled' || f.kind === 'untrim' || f.kind === 'deleteHole' || f.kind === 'extend' || f.kind === 'flatten' || f.kind === 'thicken' || f.kind === 'thickenCut' || f.kind === 'cutWithSurface' || f.kind === 'ruled' || f.kind === 'replaceFace') {
        const target = surfaceBodies.find((x) => x.featureIds[0] === f.target);
        const needsTarget = f.kind !== 'ruled' && f.kind !== 'replaceFace' && !(f.kind === 'filled' && f.sketchId && !f.target);
        if (needsTarget && !target) {
          errors[f.id] = 'Select the surface.';
          return true;
        }
        if (f.kind === 'filled') {
          // Filled Surface: a patch over a surface's boundary (or a planar patch over a sketch)
          if (!target) g = planarSurface(doc, f);
          else {
            g = fillLoops(target.geometry, f.fillWhich ?? 'outer');
            if (!g) { errors[f.id] = 'The surface has no open boundary to fill.'; return true; }
          }
        } else if (f.kind === 'untrim' || f.kind === 'deleteHole') {
          const patchG = fillLoops(target!.geometry, 'inner');
          if (!patchG) { errors[f.id] = 'The surface has no inner loop (hole) to close.'; return true; }
          target!.geometry = mergeGeometries([target!.geometry, patchG]);
          target!.featureIds.push(f.id);
          return true;
        } else if (f.kind === 'extend') {
          const strip = extendSurface(target!.geometry, Math.max(0.01, f.distance ?? 5));
          if (!strip) { errors[f.id] = 'The surface has no open edges to extend.'; return true; }
          target!.geometry = mergeGeometries([target!.geometry, strip]);
          target!.featureIds.push(f.id);
          return true;
        } else if (f.kind === 'flatten') {
          const flat = flattenSurface(target!.geometry);
          if (!flat) { errors[f.id] = 'The surface could not be flattened.'; return true; }
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
          return true;
        } else if (f.kind === 'thickenCut') {
          const tool = thickenSurface(target!.geometry, Math.max(0.01, f.thickness ?? 2));
          if (!removeMaterial(tool, f.id, f.scope)) { errors[f.id] = 'The thickened surface does not touch any body (check the Feature Scope).'; return true; }
          history.cuts.push(tool);
          return true;
        } else if (f.kind === 'cutWithSurface') {
          const pl = fitPlane(target!.geometry);
          if (!pl) { errors[f.id] = 'Cut With Surface needs a flat surface in this build.'; return true; }
          const box = new THREE.Box3();
          for (const b of visibleBodies()) { b.geometry.computeBoundingBox(); if (b.geometry.boundingBox) box.union(b.geometry.boundingBox); }
          const size = box.isEmpty() ? 1000 : box.getSize(new THREE.Vector3()).length() * 2 + 10;
          const tool = halfSpaceBox(pl, size, !!f.flip);
          if (!removeMaterial(tool, f.id, f.scope)) { errors[f.id] = 'The surface does not cut any body (check the Feature Scope and the direction).'; return true; }
          history.cuts.push(tool);
          return true;
        } else if (f.kind === 'ruled') {
          if (!f.edge) { errors[f.id] = 'Select an edge of the model.'; return true; }
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
          if (!found) { errors[f.id] = 'The edge no longer exists on the model (dangling reference).'; return true; }
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
          if (!f.faces?.length || !target) { errors[f.id] = 'Select the faces to replace and the replacement surface.'; return true; }
          const p0 = new THREE.Vector3(...f.faces[0].point);
          const owner = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(p0) < 0.5)) ?? body;
          if (!owner) { errors[f.id] = 'Replace Face needs a solid body.'; return true; }
          const pl = fitPlane(target.geometry);
          if (!pl) { errors[f.id] = 'The replacement surface must be flat in this build.'; return true; }
          const r = deleteFaces(owner.geometry, f.faces, 'patch');
          if (!r.geometry) { errors[f.id] = r.error ?? 'Could not remove the faces.'; return true; }
          // the body keeps the side of the surface where its centre lies
          r.geometry.computeBoundingBox();
          const c = r.geometry.boundingBox!.getCenter(new THREE.Vector3());
          const n = new THREE.Vector3(...pl.n);
          const keepSide = c.clone().sub(new THREE.Vector3(...pl.origin)).dot(n) >= 0;
          const size = r.geometry.boundingBox!.getSize(new THREE.Vector3()).length() * 2 + 10;
          owner.geometry = csg(r.geometry, halfSpaceBox(pl, size, keepSide), 'subtract');
          owner.featureIds.push(f.id);
          return true;
        }
      }
      else if (f.kind === 'sweep') { g = sweptSurface(doc, f); if (f.sketchId2) consumedSketches.add(f.sketchId2); }
      else if (f.kind === 'loft' || f.kind === 'boundary') { g = loftedSurface(doc, f); if (f.sketchId2) consumedSketches.add(f.sketchId2); }
      else if (f.kind === 'knit') {
        const parts = (f.surfaces ?? []).map((id) => surfaceBodies.find((s) => s.featureIds[0] === id)).filter((x): x is Body => !!x);
        if (parts.length < 1) {
          errors[f.id] = 'Select the surfaces to knit.';
          return true;
        }
        g = mergeGeometries(parts.map((x) => x.geometry));
        for (const x of parts) surfaceBodies.splice(surfaceBodies.indexOf(x), 1);
        // Show open edges: the boundary of the knitted surface (where nothing is knitted on)
        if (f.showOpenEdges) openEdges(g).forEach(([a, b], k) => curves.push({ id: `${f.id}:open${k}`, name: 'Open edge', points: [a, b], color: '#d0189a' }));
        // Merge entities off: the surfaces stay separate bodies
        if (f.mergeEntities === false && !f.createSolid) {
          for (const x of parts) surfaceBodies.push({ ...x, featureIds: [...x.featureIds, f.id] });
          return true;
        }
        // Create solid: a closed knit becomes a solid body (outward triangles)
        if (f.createSolid) {
          const shell = orientShell(g);
          if (!shell.closed) {
            errors[f.id] = 'The knitted surfaces do not enclose a volume, so no solid can be made.';
            return true;
          }
          const ng = shell.geometry;
          if (meshVolume(ng) < 0) flipWinding(ng);
          newBody(ng, f.id);
          return true;
        }
      }
      if (!g) {
        errors[f.id] = f.kind === 'sweep' ? 'Select the profile sketch and the path sketch.' : f.kind === 'loft' || f.kind === 'boundary' ? 'Select two profile sketches.' : f.kind === 'revolve' ? 'Draw a centerline as the axis of revolution and a curve to revolve.' : f.kind === 'offset' ? 'Select the face to offset.' : f.kind === 'planar' ? 'The sketch needs a closed contour.' : 'Select a sketch with curves.';
        return true;
      }
      surfaceBodies.push({ id: `surf${surfaceBodies.length + 1}`, geometry: g, faces: [], edges: [], featureIds: [f.id] });
    } catch (err) {
      errors[f.id] = `Could not build the surface: ${(err as Error).message}`;
    }
    return true;
  }
  return false;
}
