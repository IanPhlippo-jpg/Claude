// The rebuild of the weldment features (Structural Member, Trim/Extend, End Cap, Gusset, Fillet Bead), apart from
// rebuild.ts (line budget, QA 0.5.11 F134). The branches of the feature loop moved here unchanged; rebuild.ts hands
// over its helpers (buildContext.ts).
import * as THREE from 'three';
import { resolvePlaneDef } from './planes';
import { planeMatrix } from './solid';
import { sketchChains } from './thin';
import { sketch3DChains } from './sweep';
import { endCapGeometry, endCapPrism, findFaceOnBodies, findProfile, memberSegments, placedProfile, profileLoops, profileRegion, structuralMembers, trimByBodies, trimByPlane, weldBeadGeometry, weldGussetGeometry } from './weldments';
import type { BrepShape } from './brepKernel';
import type { Feature } from '../document/types';
import type { BuildContext } from './buildContext';

/** the weldment features: true when f is one of them (built, or marked with an error); false lets rebuild.ts go on */
export function buildFrame(f: Feature, ctx: BuildContext): boolean {
  const { consumedSketches, doc, errors, K, newBody, bodyMeta, addBoss, bodies, exactOf, setExact, isEmpty, visibleBodies } = ctx;
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
      return true;
    }
    const prof = findProfile(f.standard, f.profileType, f.size);
    const region = placedProfile(profileRegion(prof), f.rotation, !!f.mirror, f.locate);
    const segs = memberSegments(paths);
    if (!segs.length) {
      errors[f.id] = 'The path has no straight segments.';
      return true;
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
    return true;
  }
  if (f.type === 'trimExtend') {
    const targets = bodies.filter((b) => f.bodies.includes(b.id));
    if (!targets.length) {
      errors[f.id] = 'Select the bodies to be trimmed.';
      return true;
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
    return true;
  }
  if (f.type === 'endCap') {
    if (!f.faces.length) {
      errors[f.id] = 'Select the end faces of the tubes to cap.';
      return true;
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
        // B-rep: the cap is a prism of its outline (straight sides, the norm corner radii as chords)
        let capShape: BrepShape | null = null;
        if (K && owner && exactOf(owner)) {
          const pr = endCapPrism(hit.body, hit.face, f.thickness, offset, f.outward, f.chamfer);
          if (pr) { try { capShape = K.extrudeLoop(pr.plane, pr.loop, pr.zStart, pr.depth); } catch { capShape = null; } }
        }
        const b = newBody(cap, f.id, capShape);
        bodyMeta[b.id] = { kind: 'cap', description: `End cap ${f.thickness} mm`, length: f.thickness, angle1: 0, angle2: 0 };
        made++;
      }
      if (!made) errors[f.id] = 'None of the selected faces is still on a body.';
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
  }
  if (f.type === 'weldGusset' || f.type === 'weldBead') {
    if (f.faces.length < 2) {
      errors[f.id] = 'Select the two faces that meet at the corner.';
      return true;
    }
    const fa = findFaceOnBodies(visibleBodies(), f.faces[0]), fb = findFaceOnBodies(visibleBodies(), f.faces[1]);
    if (!fa || !fb) {
      errors[f.id] = 'A selected face is no longer on a body.';
      return true;
    }
    try {
      if (f.type === 'weldGusset') {
        const r = weldGussetGeometry(fa, fb, { profile: f.profile, d1: f.d1, d2: f.d2, d3: f.d3, thickness: f.thickness, location: f.location, offset: f.offset });
        if ('error' in r) { errors[f.id] = r.error; return true; }
        const b = newBody(r.geometry, f.id);
        bodyMeta[b.id] = { kind: 'gusset', description: `Gusset ${f.d1} x ${f.d2} x ${f.thickness}`, length: f.d1, angle1: 0, angle2: 0 };
      } else {
        const r = weldBeadGeometry(fa, fb, { size: f.size, intermittent: f.intermittent, from: f.from, to: f.to });
        if ('error' in r) { errors[f.id] = r.error; return true; }
        const b = newBody(r.geometry, f.id);
        bodyMeta[b.id] = { kind: 'bead', description: `Weld bead ${f.size} mm${f.intermittent ? ` intermittent ${f.intermittent.length}/${f.intermittent.pitch}` : ''}`, length: r.length, angle1: 0, angle2: 0 };
      }
    } catch (err) {
      errors[f.id] = `Boolean operation failed: ${(err as Error).message}`;
    }
    return true;
  }
  return false;
}
