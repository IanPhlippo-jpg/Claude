// Commands of the plastic part features (QA v0.5.1 F121): Insert ▸ Features ▸ Dome / Indent and Insert ▸ Fastening
// Feature ▸ Mounting Boss / Snap Hook / Lip/Groove. A face picked before the command is used; otherwise the panel waits
// for a click on a face (or a body, for Indent).
import type { StoreGet, StoreSet, FaceRef } from '../store';
import type { DomeFeature, IndentFeature, LipGrooveFeature, MountingBossFeature, PickedFace, SnapHookFeature } from '../../core/document/plasticsTypes';
import type { Document } from '../../core/document/types';
import { newId } from '../../core/sketch/model';
import { planeOnFace } from '../../core/features/planes';
import { registerPlanes } from '../viewport/camera';

export interface PlasticsActions {
  startDome(): void;
  startIndent(): void;
  startMountingBoss(): void;
  startSnapHook(): void;
  startLipGroove(): void;
  /** which selection box of the open panel a click fills (Indent: target/tool, Lip/Groove: lip/groove face) */
  plasticsFocus: 'target' | 'tool' | 'lip' | 'groove' | null;
  setPlasticsFocus(focus: PlasticsActions['plasticsFocus']): void;
}

const nextName = (doc: Document, type: string, base: string) => `${base}${doc.features.filter((f) => f.type === type).length + 1}`;

export const plasticsSlice = (set: StoreSet, get: StoreGet): PlasticsActions => {
  /** the picked planar face of a body, with its tree label, or null with a message */
  const planarPick = (sel: FaceRef | null, quiet = false): (PickedFace & { centroid: [number, number, number] }) | null => {
    const body = sel ? get().rebuild.bodies.find((b) => b.id === sel.bodyId) : undefined;
    const face = body?.faces.find((f) => f.id === sel?.faceId);
    if (!body || !face) return null;
    if (face.curved) {
      if (!quiet) get().pushMessage('Select a planar face.', 'warn');
      return null;
    }
    return { normal: face.normal, point: face.centroid, centroid: face.centroid, label: `Face<${body.faces.indexOf(face) + 1}>` };
  };
  /** a stud-like feature stands on a plane made on the picked face, at its centre */
  const facePlane = (face: PickedFace & { centroid: [number, number, number] }) => {
    const { doc } = get();
    const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
    const d = { ...doc, planes: { ...doc.planes, [def.id]: def } };
    registerPlanes(d.planes);
    return { d, plane: def.id };
  };
  const open = (draft: DomeFeature | IndentFeature | MountingBossFeature | SnapHookFeature | LipGrooveFeature, doc?: Document, focus: PlasticsActions['plasticsFocus'] = null) =>
    set({ ...(doc ? { doc } : {}), featureEdit: { featureId: null, draft }, plasticsFocus: focus, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  const needBody = () => {
    if (get().rebuild.bodies.length) return true;
    get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
    return false;
  };
  return {
    plasticsFocus: null,
    setPlasticsFocus(plasticsFocus) {
      set({ plasticsFocus });
    },
    startDome() {
      if (!needBody()) return;
      const face = planarPick(get().selectedFace);
      const { doc } = get();
      open({ id: newId('f'), type: 'dome', name: nextName(doc, 'dome', 'Dome'), suppressed: false, face: face ? { normal: face.normal, point: face.point, label: face.label } : null, distance: 10 });
    },
    startIndent() {
      if (!needBody()) return;
      const { doc, rebuild } = get();
      if (rebuild.bodies.length < 2) get().pushMessage('Indent needs two bodies: the target and the tool body (make the tool with Merge result off).', 'warn');
      open({ id: newId('f'), type: 'indent', name: nextName(doc, 'indent', 'Indent'), suppressed: false, target: null, tool: null, thickness: 2, clearance: 0.5, cut: false }, undefined, 'target');
    },
    startMountingBoss() {
      if (!needBody()) return;
      const face = planarPick(get().selectedFace);
      if (!face) return get().pushMessage('Select a planar face of the body first, then click Mounting Boss.', 'warn');
      const { d, plane } = facePlane(face);
      open({ id: newId('f'), type: 'mountingBoss', name: nextName(d, 'mountingBoss', 'Mounting Boss'), suppressed: false, plane, point: { x: 0, y: 0 }, label: face.label, bossType: 'hardware', hardware: 'thread', pin: 'hole', height: 20, diameter: 8, draft: 1, holeDiameter: 3.5, holeDepth: 15, holeDraft: 0.5, fins: 4, finLength: 5, finHeight: 12, finWidth: 1.5, finAngle: 0 }, d);
    },
    startSnapHook() {
      if (!needBody()) return;
      const face = planarPick(get().selectedFace);
      if (!face) return get().pushMessage('Select a planar face of the body first, then click Snap Hook.', 'warn');
      const { d, plane } = facePlane(face);
      open({ id: newId('f'), type: 'snapHook', name: nextName(d, 'snapHook', 'Snap Hook'), suppressed: false, plane, point: { x: 0, y: 0 }, label: face.label, angle: 0, height: 15, thickness: 2, width: 6, lipHeight: 3, overhang: 1.5 }, d);
    },
    startLipGroove() {
      if (!needBody()) return;
      const { doc } = get();
      open({ id: newId('f'), type: 'lipGroove', name: nextName(doc, 'lipGroove', 'Lip&Groove'), suppressed: false, lipFace: null, grooveFace: null, width: 1, height: 2, clearance: 0.1 }, undefined, 'groove');
    },
  };
};

/** a click on a face while a plastic feature's panel is open: fills its face or body box. true when it took the click */
export function plasticsFacePick(get: StoreGet, set: StoreSet, sel: FaceRef): boolean {
  const fe = get().featureEdit;
  if (!fe) return false;
  const d = fe.draft;
  if (d.type !== 'dome' && d.type !== 'indent' && d.type !== 'lipGroove') return false;
  const update = (patch: Partial<DomeFeature> | Partial<IndentFeature> | Partial<LipGrooveFeature>, focus = get().plasticsFocus) =>
    set({ featureEdit: { ...fe, draft: { ...d, ...patch } as typeof d }, plasticsFocus: focus, selectedFace: sel });
  if (d.type === 'indent') {
    const focus = get().plasticsFocus ?? (d.target ? 'tool' : 'target');
    if (focus === 'tool') update({ tool: sel.bodyId }, null);
    else update({ target: sel.bodyId }, d.tool ? null : 'tool');
    return true;
  }
  const body = get().rebuild.bodies.find((b) => b.id === sel.bodyId);
  const face = body?.faces.find((f) => f.id === sel.faceId);
  if (!body || !face) return false;
  if (face.curved) {
    get().pushMessage('Select a planar face.', 'warn');
    return true;
  }
  const picked: PickedFace = { normal: face.normal, point: face.centroid, label: `Face<${body.faces.indexOf(face) + 1}>` };
  if (d.type === 'dome') update({ face: picked });
  else if ((get().plasticsFocus ?? (d.grooveFace ? 'lip' : 'groove')) === 'groove') update({ grooveFace: picked }, d.lipFace ? null : 'lip');
  else update({ lipFace: picked }, null);
  return true;
}
