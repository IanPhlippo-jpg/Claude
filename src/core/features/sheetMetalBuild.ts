// The rebuild of the sheet metal features (Base Flange to Convert to Sheet Metal), apart from rebuild.ts (line budget,
// QA 0.5.11 F134). The branches of the feature loop moved here unchanged; rebuild.ts hands over its helpers (buildContext.ts).
import { baseFlangeGeometry, baseFlangeLoop, bendAllowance, DEFAULT_SHEET_METAL, flangeLeg, flangeMismatchWarning, flangeSetback, flatPatternGeometry, tabGeometry } from './sheetmetal';
import { resolvePlaneDef } from './planes';
import { sketchChains } from './thin';
import * as THREE from 'three';
import { sketchContourRegions, sketchRegions } from './regions';
import type { BrepShape } from './brepKernel';
import type { Body } from './rebuild';
import { crossBreakLines, edgeFlangeOnBody, type ExactJog, type ExactMiter, flangeParams, hemAsFlange, jogOnBody, miterFlangeOnBody, sketchedBendOnBody } from './sheetMetalOps';
import { csg, meshVolume, planarFaces } from './solid';
import { foldGeometry, sheetMapping, unfoldGeometry } from './unfold';
import { closedCornerTool, cornerReliefTool, findFace } from './smcorners';
import { loftedSurface, thickenSurface } from './surfaces';
import { chainEdges, classifyVent, formToolGeometry, gussetTools, ripTool, sweptFlangeRegions, tabSlotTools, ventTool } from './sheetmetal4';
import { type BodyEdge, bodyEdges, bodyEdges as bodyEdgesOf, matchEdge as matchEdgeRef } from './edgesets';
import { sketchPath, sweepGeometry } from './sweep';
import { applyShellFromHistory } from './shell';
import type { Feature } from '../document/types';
import type { BuildContext } from './buildContext';

/** the sheet metal features: true when f is one of them (built, or marked with an error); false lets rebuild.ts go on */
export function buildSheetMetal(f: Feature, body: Body | undefined, ctx: BuildContext): boolean {
  const { doc, errors, K, addMaterial, addBoss, consumedSketches, visibleBodies, exactOf, setExact, warnings, bodies, newBody, curves, removeMaterial, history, bendCounts, hiddenIds, autoHidden } = ctx;
  if (f.type === 'baseFlange') {
    const sketch = doc.sketches[f.sketchId];
    if (!sketch) {
      errors[f.id] = 'The sketch of this base flange no longer exists.';
      return true;
    }
    const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const plane = resolvePlaneDef(doc, sketch.plane);
    const chains = sketchChains(sketch);
    const open = chains.find((c) => !c.closed && c.points.length >= 2);
    let g: THREE.BufferGeometry | null = null;
    if (open) {
      g = baseFlangeGeometry(open.points, plane, params, f.depth, f.midPlane, f.reverse, f.flipDir);
      ctx.sheet = { chain: open.points, plane, depth: f.depth, midPlane: f.midPlane, extensions: [], reverse: f.reverse, bentOnly: true };
    } else {
      const regions = sketchRegions(sketch);
      if (!regions.length) {
        errors[f.id] = 'The sketch needs an open profile (bent sheet) or a closed contour (tab).';
        return true;
      }
      g = tabGeometry(regions, plane, params, f.reverse);
    }
    if (!g) {
      errors[f.id] = 'The base flange has no volume.';
      return true;
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
    return true;
  }
  if (f.type === 'miterFlange' || f.type === 'jog' || f.type === 'sketchedBend') {
    if (ctx.sheet) ctx.sheet.bentOnly = false;
    consumedSketches.add(f.sketchId);
    if (!body) {
      errors[f.id] = `${f.type === 'jog' ? 'A jog' : f.type === 'sketchedBend' ? 'A sketched bend' : 'A miter flange'} needs a sheet metal body (Base Flange/Tab first).`;
      return true;
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
    return true;
  }
  if (f.type === 'edgeFlange' || f.type === 'hem') {
    if (ctx.sheet) ctx.sheet.bentOnly = false;
    if (!body) {
      errors[f.id] = `${f.type === 'hem' ? 'A hem' : 'An edge flange'} needs a sheet metal body (Base Flange/Tab first).`;
      return true;
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
            for (const x of [r.exact.trim, ...(r.exact.reliefs ?? [])]) if (x) { const tr = prism(x); if (!tr) throw new Error('trim'); sh = K.cut(sh, tr); }
            const fl = prism(r.exact.flange);
            if (!fl) throw new Error('flange');
            const fused = K.fuse(sh, fl);
            // the exact flange must agree with the mesh kernel's (within its chords); a disagreement keeps the mesh result and
            // says so on the feature (QA 0.5.11 F197); a faceted boolean that fails itself leaves the exact flange standing
            const mv = (() => { try { return Math.abs(meshVolume(csg(r.trim ? csg(b.geometry, r.trim, 'subtract') : b.geometry, r.geometry, 'union'))); } catch { return NaN; } })(), ev = Math.abs(K.volume(fused));
            if (Number.isFinite(mv) && (!(mv > 0) || Math.abs(ev - mv) / mv > 0.005)) { warnings[f.id] = flangeMismatchWarning(ev, mv); throw new Error('exact flange'); }
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
        if (ctx.sheet) ctx.sheet.bentOnly = false;
        if (ctx.sheet) ctx.sheet.extensions.push(flangeLeg(ff, rr, fp) + bendAllowance(ff.angle, rr, fp) - flangeSetback(ff.angle, rr, fp, ff.position));
        built = true;
      } catch (err) {
        errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
      }
      break;
    }
    return true;
  }
  if (f.type === 'unfold' || f.type === 'fold') {
    const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const map = ctx.sheet && ctx.sheet.bentOnly ? sheetMapping(ctx.sheet.chain, ctx.sheet.plane, params, ctx.sheet.reverse) : null;
    if (!body || !map) {
      errors[f.id] = !ctx.sheet ? 'Unfold and Fold need a Base Flange made from an open sketch.' : 'Unfold and Fold work on the bends of the base flange (no edge flanges, hems or jogs yet).';
      return true;
    }
    if ((f.type === 'unfold') === ctx.unfolded) {
      errors[f.id] = f.type === 'unfold' ? 'The sheet is already unfolded.' : 'Fold needs an Unfold before it.';
      return true;
    }
    body.geometry = f.type === 'unfold' ? unfoldGeometry(body.geometry, map) : foldGeometry(body.geometry, map);
    body.featureIds.push(f.id);
    ctx.unfolded = f.type === 'unfold';
    return true;
  }
  if (f.type === 'flatPattern') {
    // the developed sheet with its cuts and holes, when the bends all come from the base flange
    const fpParams = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const fpMap = ctx.sheet && ctx.sheet.bentOnly && body && !ctx.unfolded ? sheetMapping(ctx.sheet.chain, ctx.sheet.plane, fpParams, ctx.sheet.reverse) : null;
    if (fpMap && body) {
      const flatBody = unfoldGeometry(body.geometry, fpMap);
      bodies.splice(0, bodies.length);
      newBody(flatBody, f.id);
      // bend lines (Flat-Pattern1 ▸ Bend-Lines) across the face of the sheet at the middle of each bend
      const nrm = new THREE.Vector3(...ctx.sheet!.plane.n), o = new THREE.Vector3(...ctx.sheet!.plane.origin);
      const pa = flatBody.getAttribute('position');
      let w0 = Infinity, w1 = -Infinity;
      for (let k = 0; k < pa.count; k++) { const w = new THREE.Vector3().fromBufferAttribute(pa, k).sub(o).dot(nrm); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
      const tt = fpParams.thickness;
      if (!f.noBendLines) fpMap.bends.forEach(([b0, b1], k) => curves.push({ id: `${f.id}:bend${k}`, name: 'Bend-Lines', points: [fpMap.flatAt((b0 + b1) / 2, tt + 0.02, w0), fpMap.flatAt((b0 + b1) / 2, tt + 0.02, w1)] }));
      return true;
    }
    if (!ctx.sheet) {
      errors[f.id] = 'The flat pattern needs a Base Flange made from an open sketch.';
      return true;
    }
    const params = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const flat = flatPatternGeometry(ctx.sheet.chain, ctx.sheet.plane, params, ctx.sheet.depth, ctx.sheet.midPlane, ctx.sheet.extensions, ctx.sheet.reverse);
    if (!flat) {
      errors[f.id] = 'Could not unfold the sheet.';
      return true;
    }
    bodies.splice(0, bodies.length);
    newBody(flat, f.id);
    return true;
  }
  if (f.type === 'crossBreak') {
    if (!body || !f.face) {
      errors[f.id] = !body ? 'A cross-break needs a sheet metal body.' : 'Select a planar face of the sheet.';
      return true;
    }
    const lines = crossBreakLines(body.geometry, f.face);
    if (!lines) {
      errors[f.id] = 'The selected face was not found on the body.';
      return true;
    }
    // Edit Cross-Break: one or both diagonals, kept off the corners by the inset
    lines.forEach((pts, i) => {
      if ((f.lines === 'first' && i !== 0) || (f.lines === 'second' && i !== 1)) return;
      const a = pts[0], b = pts[pts.length - 1], L = a.distanceTo(b), k = Math.min(0.45, Math.max(0, f.inset ?? 0) / (L || 1));
      curves.push({ id: `${f.id}:x${i}`, name: 'Cross-Break', points: k > 0 ? [a.clone().lerp(b, k), a.clone().lerp(b, 1 - k)] : pts });
    });
    return true;
  }
  if (f.type === 'closedCorner') {
    if (!body) {
      errors[f.id] = 'A closed corner needs a sheet metal body.';
      return true;
    }
    if (!f.faces.length) {
      errors[f.id] = 'Select the end faces of the flange to extend.';
      return true;
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
    return true;
  }
  if (f.type === 'cornerRelief') {
    if (!body) {
      errors[f.id] = 'A corner relief needs a sheet metal body.';
      return true;
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
      return true;
    }
    try {
      removeMaterial(tool, f.id);
      history.cuts.push(tool);
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'loftedBend') {
    if (f.sketchId) consumedSketches.add(f.sketchId);
    if (f.sketchId2) consumedSketches.add(f.sketchId2);
    const surf = loftedSurface(doc, { id: f.id, type: 'surface', kind: 'loft', name: f.name, suppressed: false, sketchId: f.sketchId, sketchId2: f.sketchId2 } as never, f.method === 'bent' ? f.facets ?? 4 : undefined);
    if (!surf) {
      errors[f.id] = 'Select two open profile sketches (the top and the bottom of the transition).';
      return true;
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
    return true;
  }
  if (f.type === 'vent') {
    consumedSketches.add(f.sketchId);
    const sketch = doc.sketches[f.sketchId];
    if (!sketch) {
      errors[f.id] = 'Select the sketch of the vent (boundary, ribs and spars).';
      return true;
    }
    if (!body) {
      errors[f.id] = 'A vent needs a sheet metal body.';
      return true;
    }
    const plane = resolvePlaneDef(doc, sketch.plane);
    const parts = classifyVent(sketch, !!f.fillIn);
    if (!parts.regions.length) {
      errors[f.id] = 'The vent sketch needs a closed boundary contour.';
      return true;
    }
    body.geometry.computeBoundingSphere();
    const extent = Math.max(10, (body.geometry.boundingSphere?.radius ?? 0) * 3 + 10);
    const tool = ventTool({ ...parts, ribWidth: f.ribWidth, sparWidth: f.sparWidth }, plane, extent);
    if (!tool) {
      errors[f.id] = 'The vent has no open area left.';
      return true;
    }
    try {
      if (!removeMaterial(tool, f.id)) errors[f.id] = 'The vent does not touch the sheet.';
      else history.cuts.push(tool);
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'formTool') {
    if (!body) {
      errors[f.id] = 'A forming tool needs a sheet metal body.';
      return true;
    }
    if (!f.plane || !f.points.length) {
      errors[f.id] = 'Select the placement face and place at least one position.';
      return true;
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
    return true;
  }
  if (f.type === 'gusset') {
    if (!body) {
      errors[f.id] = 'A gusset needs a sheet metal body.';
      return true;
    }
    if (f.faces.length < 2) {
      errors[f.id] = 'Select the two faces on both sides of the bend.';
      return true;
    }
    const sm = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const target = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(new THREE.Vector3(...f.faces[0].point)) < 0.5)) ?? body;
    const r = gussetTools(target.geometry, target.id, { faces: f.faces, depth: f.depth, width: f.width, offset: f.offset, flip: f.flip, thickness: sm.thickness, bendRadius: sm.bendRadius });
    if ('error' in r) {
      errors[f.id] = r.error;
      return true;
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
    return true;
  }
  if (f.type === 'tabSlot') {
    if (!f.edge || !f.slotFace) {
      errors[f.id] = !f.edge ? 'Select the edge of the sheet that gets the tabs.' : 'Select the face of the other sheet that gets the slots.';
      return true;
    }
    const sm = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const edgeBody = visibleBodies().find((b) => matchEdgeRef(bodyEdgesOf(b.geometry, b.id), f.edge!));
    const slotBody = visibleBodies().find((b) => planarFaces(b.geometry, b.id).some((fc) => new THREE.Vector3(...fc.centroid).distanceTo(new THREE.Vector3(...f.slotFace!.point)) < 0.5));
    if (!edgeBody || !slotBody) {
      errors[f.id] = !edgeBody ? 'The tab edge is no longer on a body.' : 'The slot face is no longer on a body.';
      return true;
    }
    if (edgeBody === slotBody) {
      errors[f.id] = 'The slot face must be on another body than the tab edge.';
      return true;
    }
    slotBody.geometry.computeBoundingSphere();
    const r = tabSlotTools(edgeBody.geometry, edgeBody.id, { edge: f.edge, slotFace: f.slotFace, tabLength: f.tabLength, tabHeight: f.linkToThickness !== false ? sm.thickness : f.tabHeight, count: f.count, edgeOffset: f.edgeOffset, clearance: f.clearance, thickness: sm.thickness }, (slotBody.geometry.boundingSphere?.radius ?? 10) * 2 + 10);
    if ('error' in r) {
      errors[f.id] = r.error;
      return true;
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
    return true;
  }
  if (f.type === 'rip') {
    if (!body) {
      errors[f.id] = 'Rip needs a (shelled) solid body.';
      return true;
    }
    if (!f.edges.length) {
      errors[f.id] = 'Select the edges to rip.';
      return true;
    }
    const sm = doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const target = visibleBodies().find((b) => f.edges.some((e) => matchEdgeRef(bodyEdgesOf(b.geometry, b.id), e))) ?? body;
    const tool = ripTool(target.geometry, target.id, { edges: f.edges, gap: f.gap, direction: f.direction, thickness: sm.thickness });
    if ('error' in tool) {
      errors[f.id] = tool.error;
      return true;
    }
    try {
      target.geometry = csg(target.geometry, tool, 'subtract');
      target.featureIds.push(f.id);
      history.cuts.push(tool);
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'sweptFlange') {
    consumedSketches.add(f.sketchId);
    if (f.pathSketchId) consumedSketches.add(f.pathSketchId);
    if (ctx.sheet) ctx.sheet.bentOnly = false;
    const sketch = doc.sketches[f.sketchId];
    if (!sketch) {
      errors[f.id] = 'Select the profile sketch of the swept flange (an open chain).';
      return true;
    }
    const chain = sketchChains(sketch).find((c) => !c.closed && c.points.length >= 2);
    if (!chain) {
      errors[f.id] = 'The swept flange profile must be an open chain of lines and arcs.';
      return true;
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
      return true;
    }
    const g = sweepGeometry(sweptFlangeRegions(chain.points, sm.thickness, f.reverse), resolvePlaneDef(doc, sketch.plane), path);
    if (!g) {
      errors[f.id] = 'The swept flange has no volume (the profile must start on the path).';
      return true;
    }
    try {
      addMaterial(g, f.id, f.merge !== false);
      addBoss(g);
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'convertSheet') {
    if (!body) {
      errors[f.id] = 'Convert to Sheet Metal needs a solid body.';
      return true;
    }
    if (!f.fixedFace) {
      errors[f.id] = 'Select the fixed face of the solid.';
      return true;
    }
    const fixed = findFace(body.geometry, f.fixedFace);
    if (!fixed) {
      errors[f.id] = 'The fixed face is no longer there.';
      return true;
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
    return true;
  }
  return false;
}
