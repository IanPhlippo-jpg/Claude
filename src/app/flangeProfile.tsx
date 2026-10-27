import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import type { EdgeFlangeFeature } from '../core/document/types';
import { addConstraint, addLine, addPointParam, createSketch, newId } from '../core/sketch/model';
import { bodyEdges, matchEdge } from '../core/features/edgesets';
import { planarFaces, type PlanarFace } from '../core/features/solid';
import { flangeProfilePlane } from '../core/features/sheetmetal';
import { sketchChains } from '../core/features/thin';
import { DEFAULT_SHEET_METAL } from '../core/features/sheetmetal';
import * as THREE from 'three';

/**
 * Edit Flange Profile, as the intended design: the flange's outline opens as a sketch on its outer face (the
 * rectangle of the flange as it is), with the Profile Sketch dialog: < Back returns to the panel, Finish makes the
 * flange, Cancel leaves the profile as it was. The sketch's closed outline sets the width and length; holes cut.
 */
export function startFlangeProfile(): void {
  const st = useStore.getState();
  const fe = st.featureEdit;
  if (!fe || fe.draft.type !== 'edgeFlange') return;
  const d = fe.draft;
  if (!d.edge) { st.pushMessage('Select the edge of the flange first.', 'warn'); return; }
  const params = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
  // the edge and its sheet face, as the flange finds them (edgeFlangeOnBody)
  for (const b of st.rebuild.bodies) {
    const e = matchEdge(bodyEdges(b.geometry, b.id), d.edge);
    if (!e || !e.straight) continue;
    const faces = planarFaces(b.geometry, b.id), seg = e.segments[0];
    const pick = (n: THREE.Vector3) => faces.filter((f) => new THREE.Vector3(...f.normal).dot(n) > 0.999).reduce((best, f) => (f.area > (best?.area ?? -1) ? f : best), null as PlanarFace | null);
    const f1 = pick(seg.n1), f2 = pick(seg.n2);
    const face = (f1?.area ?? 0) >= (f2?.area ?? 0) ? f1 : f2;
    if (!face) continue;
    const a = e.points[0], z = e.points[e.points.length - 1];
    const fp = flangeProfilePlane({ a: [a.x, a.y, a.z], b: [z.x, z.y, z.z], faceNormal: face.normal, faceCentroid: face.centroid, angle: d.angle, length: d.length, lengthMode: d.lengthMode, position: d.position, flip: d.flip, radius: d.radius, offset: d.offset }, params);
    if (!fp) break;
    let doc = st.doc;
    let sketchId = d.profileSketchId && doc.sketches[d.profileSketchId] ? d.profileSketchId : null;
    const planeId = sketchId ? doc.sketches[sketchId].plane : newId('pl');
    doc = { ...doc, planes: { ...doc.planes, [planeId]: { ...fp.plane, id: planeId, name: `Profile of ${d.name}`, kind: 'face' } } };
    if (!sketchId) {
      // the flange as it is now: its width (the offsets) and its leg
      sketchId = newId('sk');
      const x0 = Math.max(0, d.startOffset ?? 0), x1 = fp.length - Math.max(0, d.endOffset ?? 0), y1 = Math.max(1, fp.leg);
      let s = createSketch(sketchId, `Sketch of ${d.name}`, planeId);
      const c = [{ x: x0, y: 0 }, { x: x1, y: 0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
      // four corners shared by the four lines (a closed outline)
      const pid: string[] = [];
      for (const q of c) { const r = addPointParam(s, q); s = r[0]; pid.push(r[1]); }
      const ids: string[] = [];
      for (let i = 0; i < 4; i++) { const r = addLine(s, pid[i], pid[(i + 1) % 4]); s = r[0]; ids.push(r[1].id); }
      s = addConstraint(s, 'horizontal', [ids[0]])[0];
      s = addConstraint(s, 'horizontal', [ids[2]])[0];
      s = addConstraint(s, 'vertical', [ids[1]])[0];
      s = addConstraint(s, 'vertical', [ids[3]])[0];
      doc = { ...doc, sketches: { ...doc.sketches, [sketchId]: s } };
    }
    st.applyDocument('Edit Flange Profile', doc);
    useStore.setState({ flangeProfileEdit: { featureId: fe.featureId, draft: { ...d, profileSketchId: sketchId }, before: d.profileSketchId } });
    st.editSketch(sketchId);
    return;
  }
  st.pushMessage('The edge of the flange is not on the sheet.', 'warn');
}

/** the Profile Sketch check: one closed outline (holes allowed) and nothing open */
export function profileCheck(st: { doc: { sketches: Record<string, Parameters<typeof sketchChains>[0]> } }, sketchId: string): { valid: boolean; text: string } {
  const sk = st.doc.sketches[sketchId];
  const chains = sk ? sketchChains(sk) : [];
  const open = chains.filter((c) => !c.closed && c.points.length >= 2).length, closed = chains.filter((c) => c.closed).length;
  if (!chains.length) return { valid: false, text: 'The sketch is empty.' };
  if (open && closed) return { valid: false, text: 'The sketch has both open and closed contours.' };
  if (open) return { valid: false, text: 'The sketch has open contours.' };
  return { valid: true, text: 'The sketch is valid.' };
}

/** the Profile Sketch dialog over the graphics area while the flange's profile is edited */
export function ProfileSketchDialog() {
  const st = useStore(useShallow((s) => ({ pe: s.flangeProfileEdit, activeSketchId: s.activeSketchId, doc: s.doc })));
  if (!st.pe || st.activeSketchId !== st.pe.draft.profileSketchId) return null;
  const pe = st.pe;
  const chk = profileCheck(st, pe.draft.profileSketchId!);
  const back = (draft: EdgeFlangeFeature) => {
    const s = useStore.getState();
    s.exitSketch();
    useStore.setState({ flangeProfileEdit: null, featureEdit: { featureId: pe.featureId, draft }, managerTab: 'tree', tab: 'sheetmetal' });
  };
  return (
    <div className="k-profile-dialog" data-testid="profile-sketch">
      <div className="k-dialog-title">Profile Sketch</div>
      <div className={`k-profile-msg ${chk.valid ? '' : 'bad'}`} data-testid="profile-msg">{chk.text}</div>
      <div className="k-dialog-actions">
        <button className="k-btn" data-testid="profile-back" onClick={() => back(pe.draft)}>&lt; Back</button>
        <button className="k-btn primary" data-testid="profile-finish" disabled={!chk.valid} onClick={() => { back(pe.draft); useStore.getState().commitFeature(); }}>Finish</button>
        <button className="k-btn" data-testid="profile-cancel" onClick={() => back({ ...pe.draft, profileSketchId: pe.before })}>Cancel</button>
        <button className="k-btn" disabled>Help</button>
      </div>
    </div>
  );
}
