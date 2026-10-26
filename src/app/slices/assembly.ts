/**
 * Store slice "assembly" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { massProperties } from '../../core/features/measure';
import { keyedPose, simulateBasic } from '../../core/assembly/motion';
import { type Document } from '../../core/document/types';
import { autosave } from '../../core/document/persistence';
import { newId } from '../../core/sketch/model';
import type { BeltFeature } from '../../core/document/types';
import { activeConfiguration } from '../../core/document/configurations';
import { cylinderAxis, instanceName } from '../../core/assembly/assembly';
import { isAssembly, type ComponentPattern, type Component, type Mate, type MateRef } from '../../core/document/types';
import { modelItems } from '../drawing/modelItems';
import { assemblyHoles, fastenerSlots, placeFasteners } from '../../core/assembly/fasteners';
import * as THREE from 'three';
import type { State, StoreSet, StoreGet, MotionEdit, PatternEdit, ExplodeEdit } from '../store';
import { history, withSolvedComponents, historyFlags, rebuildFor, mateRefCount, refreshMatePreview, splitMateRefs, COUPLING_MATES, joinMateRefs, previewPattern, previewExplode, explodeStepOf } from '../store';

type AssemblyKeys =
  | 'mateEdit' | 'insertingComponent' | 'insertGhost' | 'insertAngle' | 'asmTool' | 'interferenceHighlight'
  | 'isolated' | 'mateOpts' | 'interferenceOpts' | 'largeAssembly' | 'materialTarget' | 'explodeEdit'
  | 'motionOpen' | 'fastenerEdit' | 'startSmartFasteners' | 'updateFastenerSlot' | 'commitSmartFasteners' | 'cancelSmartFasteners'
  | 'motionTime' | 'motionPlaying' | 'motorEdit' | 'motionSim' | 'triadComponentId' | 'motionAutokey'
  | 'motionEdit' | 'startMotionEdit' | 'updateMotionEdit' | 'commitMotionEdit' | 'setMotionStudy' | 'calculateMotion'
  | 'setMotionAutokey' | 'addMotionKey' | 'deleteMotionItem' | 'setMotionOpen' | 'setMotionTime' | 'setMotionPlaying'
  | 'startMotor' | 'updateMotorDraft' | 'commitMotor' | 'cancelMotor' | 'deleteMotor' | 'setMotionDuration'
  | 'editContext' | 'editComponent' | 'returnToAssembly' | 'setLargeAssembly' | 'startBelt' | 'setIsolated'
  | 'startInsertComponent' | 'cancelInsertComponent' | 'setInsertGhost' | 'rotateInsertGhost' | 'setInsertAngle' | 'placeInsertGhost'
  | 'insertComponent' | 'selectComponent' | 'setAsmTool' | 'moveComponent' | 'rotateComponent' | 'setComponentFixed'
  | 'setComponentHidden' | 'showAllComponents' | 'deleteComponent' | 'startMate' | 'cancelMate' | 'updateMateDraft'
  | 'removeMateRef' | 'commitMate' | 'editMate' | 'deleteMate' | 'setMateSuppressed' | 'setInterferenceHighlight'
  | 'insertModelItems' | 'setMaterial' | 'openMaterialFor' | 'startComponentPattern' | 'editComponentPattern' | 'commitComponentPattern'
  | 'cancelComponentPattern' | 'deleteComponentPattern' | 'startExplode' | 'updateExplodeDraft' | 'addExplodeStep' | 'deleteExplodeStep'
  | 'commitExplode' | 'cancelExplode' | 'setExploded' | 'animateCollapse' | 'setComponentConfiguration';

export const assemblySlice = (set: StoreSet, get: StoreGet): Pick<State, AssemblyKeys> => ({
  mateEdit: null,
  insertingComponent: false,
  insertGhost: null,
  insertAngle: 90,
  asmTool: 'select',
  interferenceHighlight: null,
  isolated: null,
  mateOpts: { newFolder: false, popup: true, preview: true, positionOnly: false },
  interferenceOpts: { coincidence: false, showIgnored: false, subassemblies: true, multibody: false, transparent: true },
  largeAssembly: false,
  materialTarget: null,
  explodeEdit: null,
  motionOpen: false,
  fastenerEdit: null,
  startSmartFasteners() {
    const { doc, rebuild } = get();
    if (!isAssembly(doc)) return;
    const holes = assemblyHoles(doc, rebuild.bodies);
    if (!holes.length) {
      get().pushMessage('Auto Fasteners needs Hole Tool holes in the components.', 'warn');
      return;
    }
    set({ fastenerEdit: { slots: fastenerSlots(holes), autoLength: true }, managerTab: 'tree', tab: 'assembly' });
  },
  updateFastenerSlot(i, patch) {
    const fe = get().fastenerEdit;
    if (!fe) return;
    set({ fastenerEdit: { ...fe, slots: fe.slots.map((s, k) => (k === i ? { ...s, ...patch } : s)) } });
  },
  commitSmartFasteners() {
    const { doc, fastenerEdit } = get();
    if (!fastenerEdit || !isAssembly(doc)) return;
    history.push('Auto Fasteners', doc);
    const placed = placeFasteners(doc, fastenerEdit.slots);
    const r = withSolvedComponents({ ...doc, components: [...(doc.components ?? []), ...placed.components], mates: [...(doc.mates ?? []), ...placed.mates] });
    set({ doc: r.doc, rebuild: r.rebuild, fastenerEdit: null, dirty: true, ...historyFlags() });
    get().pushMessage(`${placed.components.length} fastener${placed.components.length === 1 ? '' : 's'} added.`);
    autosave(r.doc);
  },
  cancelSmartFasteners() {
    set({ fastenerEdit: null });
  },
  motionTime: 0,
  motionPlaying: false,
  motorEdit: null,
  motionSim: null,
  triadComponentId: null,
  motionAutokey: false,
  motionEdit: null,
  startMotionEdit(kind) {
    const { doc, selectedFeatureId } = get();
    const comps = (doc.components ?? []).filter((c) => !c.suppressed);
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const free = comps.filter((c) => !c.fixed);
    const sel = comps.find((c) => c.id === selectedFeatureId);
    const n = (k: 'springs' | 'contacts') => (study[k]?.length ?? 0) + 1;
    const draft: MotionEdit = kind === 'spring'
      ? { kind, spring: { id: newId('sp'), name: `LinearSpring${n('springs')}`, a: { componentId: (sel ?? free[0] ?? comps[0])?.id ?? '', point: [0, 0, 0] }, b: { componentId: (comps.find((c) => c.fixed) ?? comps[1] ?? comps[0])?.id ?? '', point: [0, 0, 0] }, k: 0.1, freeLength: 50, damping: 0 } }
      : kind === 'contact' ? { kind, contact: { id: newId('ct'), name: `Contact${n('contacts')}`, componentIds: comps.slice(0, 2).map((c) => c.id) } }
      : kind === 'gravity' ? { kind, gravity: study.gravity ?? { dir: [0, -1, 0], g: 9810 } }
      : kind === 'wizard' ? { kind, wizard: { kind: 'rotate', axis: 'y', turns: 1, start: 0, duration: Math.min(10, study.duration) } }
      : kind === 'plot' ? { kind, plot: { componentId: free[0]?.id ?? comps[0]?.id ?? '', quantity: 'displacement' } }
      : { kind: 'properties', props: { fps: study.fps ?? 25, duration: study.duration } };
    set({ motionEdit: draft, motionPlaying: false, managerTab: 'tree' });
  },
  updateMotionEdit(patch) {
    const me = get().motionEdit;
    if (me) set({ motionEdit: { ...me, ...patch } as MotionEdit });
  },
  commitMotionEdit() {
    const { doc, motionEdit: me } = get();
    if (!me) return;
    if (me.kind === 'plot') {
      set({ motionEdit: null });
      return;
    }
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    let next = study;
    if (me.kind === 'spring' && me.spring) {
      if (!me.spring.a.componentId || !me.spring.b.componentId || me.spring.a.componentId === me.spring.b.componentId) return get().pushMessage('Select two different components for the spring.', 'warn');
      next = { ...study, springs: [...(study.springs ?? []).filter((s) => s.id !== me.spring!.id), me.spring], type: 'basic' };
    } else if (me.kind === 'contact' && me.contact) {
      if (me.contact.componentIds.length < 2) return get().pushMessage('A contact needs at least two components.', 'warn');
      next = { ...study, contacts: [...(study.contacts ?? []).filter((s) => s.id !== me.contact!.id), me.contact], type: 'basic' };
    } else if (me.kind === 'gravity' && me.gravity) next = { ...study, gravity: me.gravity, type: 'basic' };
    else if (me.kind === 'wizard' && me.wizard) {
      // the study grows to hold the wizard's step, by design
      const end = me.wizard.start + me.wizard.duration;
      next = { ...study, wizard: [...(study.wizard ?? []), me.wizard], duration: Math.max(study.duration, end) };
    } else if (me.kind === 'properties' && me.props) next = { ...study, fps: Math.max(1, Math.round(me.props.fps)), duration: Math.max(0.5, me.props.duration) };
    history.push(me.kind === 'wizard' ? 'Animation Wizard' : me.kind[0].toUpperCase() + me.kind.slice(1), doc);
    const d: Document = { ...doc, motionStudy: next };
    set({ doc: d, motionEdit: null, motionSim: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMotionStudy(patch) {
    const { doc } = get();
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const d: Document = { ...doc, motionStudy: { ...study, ...patch } };
    set({ doc: d, dirty: true, motionSim: patch.type ? null : get().motionSim });
    autosave(d);
  },
  calculateMotion() {
    const { doc, rebuild } = get();
    const study = doc.motionStudy;
    if (!study || (study.type ?? 'animation') !== 'basic') {
      set({ motionSim: null });
      return;
    }
    const comps = (rebuild as unknown as { components?: Component[] }).components ?? doc.components ?? [];
    const bodies = rebuild.bodies.filter((b) => comps.some((c) => c.id === b.id)).map((b) => {
      const comp = comps.find((c) => c.id === b.id)!;
      return { id: b.id, geometry: b.geometry, mass: massProperties(b.geometry, comp.part.material ? comp.part.material.density / 1e6 : 0.001).mass };
    });
    const sim = simulateBasic(comps, bodies, study, doc.mates ?? []);
    set({ motionSim: sim });
    if (!Object.keys(sim.frames).length) get().pushMessage('Basic Motion: nothing moves. Add gravity or a spring to a component without mates.', 'warn');
  },
  setMotionAutokey(motionAutokey) {
    set({ motionAutokey });
  },
  addMotionKey(ids) {
    const { doc, motionTime } = get();
    if (motionTime <= 1e-9) return get().pushMessage('Move the time bar past 0 to add a key there.', 'warn');
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const comps = (doc.components ?? []).filter((c) => !ids || ids.includes(c.id));
    const keys = (study.keys ?? []).filter((k) => !(Math.abs(k.time - motionTime) < 1e-6 && comps.some((c) => c.id === k.componentId)));
    for (const c of comps) {
      const p = keyedPose(c, study.keys ?? [], motionTime);
      keys.push({ componentId: c.id, time: motionTime, position: p ? (p.position.toArray() as [number, number, number]) : c.position, rotation: p ? (p.rotation.toArray() as [number, number, number, number]) : c.rotation });
    }
    history.push('Add Key', doc);
    const d: Document = { ...doc, motionStudy: { ...study, keys } };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteMotionItem(kind, id) {
    const { doc } = get();
    const study = doc.motionStudy;
    if (!study) return;
    history.push('Delete', doc);
    const next = kind === 'spring' ? { ...study, springs: (study.springs ?? []).filter((s) => s.id !== id) }
      : kind === 'contact' ? { ...study, contacts: (study.contacts ?? []).filter((s) => s.id !== id) }
      : kind === 'gravity' ? { ...study, gravity: undefined }
      : kind === 'wizard' ? { ...study, wizard: (study.wizard ?? []).filter((_, i) => String(i) !== id) }
      : { ...study, keys: (study.keys ?? []).filter((k) => k.componentId !== id) };
    const d: Document = { ...doc, motionStudy: next };
    set({ doc: d, dirty: true, motionSim: null, ...historyFlags() });
    autosave(d);
  },
  setMotionOpen(open) {
    set({ motionOpen: open, motionPlaying: false, motionTime: 0 });
  },
  setMotionTime(t) {
    set({ motionTime: t });
  },
  setMotionPlaying(p) {
    set({ motionPlaying: p });
  },
  startMotor() {
    const { doc, selectedFace, selectedFeatureId } = get();
    const selectedComponentId = selectedFace?.bodyId ?? selectedFeatureId;
    const comps = (doc.components ?? []).filter((c) => !c.fixed);
    const comp = comps.find((c) => c.id === selectedComponentId) ?? comps.find((c) => {
      // a part turning on a bearing: concentric with another movable part, not mated to a fixed one
      const mine = (doc.mates ?? []).filter((m) => m.refs.some((r) => r.componentId === c.id));
      const fixedIds = new Set((doc.components ?? []).filter((x) => x.fixed).map((x) => x.id));
      return mine.some((m) => m.type === 'concentric') && !mine.some((m) => m.refs.some((r) => fixedIds.has(r.componentId)));
    }) ?? comps[0];
    if (!comp) {
      get().pushMessage('A motor needs a movable component.', 'warn');
      return;
    }
    const n = (doc.motionStudy?.motors.length ?? 0) + 1;
    set({ motorEdit: { id: newId('mo'), name: `RotaryMotor${n}`, componentId: comp.id, kind: 'rotary', motion: 'constant', rpm: 10, speed: 10, amplitude: 45, frequency: 0.5, reverse: false, distance: 90, start: 0, duration: 1, segments: [{ t0: 0, t1: 1, value: 10 }], expression: '90*sin(2*pi*t)' }, managerTab: 'tree', motionPlaying: false });
  },
  updateMotorDraft(patch) {
    const me = get().motorEdit;
    if (me) set({ motorEdit: { ...me, ...patch } });
  },
  commitMotor() {
    const { doc, motorEdit } = get();
    if (!motorEdit) return;
    history.push('Motor', doc);
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const d: Document = { ...doc, motionStudy: { ...study, motors: [...study.motors.filter((m) => m.id !== motorEdit.id), motorEdit] } };
    set({ doc: d, motorEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancelMotor() {
    set({ motorEdit: null });
  },
  deleteMotor(id) {
    const { doc } = get();
    if (!doc.motionStudy) return;
    history.push('Delete Motor', doc);
    const d: Document = { ...doc, motionStudy: { ...doc.motionStudy, motors: doc.motionStudy.motors.filter((m) => m.id !== id) } };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMotionDuration(s) {
    const { doc } = get();
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const d: Document = { ...doc, motionStudy: { ...study, duration: Math.max(0.5, s) } };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  editContext: null,
  editComponent(id) {
    const { doc, selectedFeatureId } = get();
    if (!isAssembly(doc)) return;
    const cid = id ?? selectedFeatureId;
    const comp = (doc.components ?? []).find((c) => c.id === cid);
    if (!comp) {
      get().pushMessage('Select a component to edit (in the graphics area or the tree).', 'warn');
      return;
    }
    const ctx = { assembly: doc, componentName: comp.name, partName: comp.part.name, history: history.save() };
    const seq = get().openSeq;
    get().openDocument({ ...comp.part, kind: 'part' });
    if (get().openSeq === seq) return; // the part could not be opened; the assembly stays
    set({ editContext: ctx, tab: 'features' });
    get().pushMessage(`Editing ${comp.name} in ${doc.name}: Edit Component (or Return to Assembly) goes back.`);
  },
  returnToAssembly() {
    const ctx = get().editContext;
    if (!ctx) return;
    const part = get().doc;
    const assembly: Document = { ...ctx.assembly, components: (ctx.assembly.components ?? []).map((c) => (c.part.name === ctx.partName ? { ...c, part: { ...part, kind: 'part' } } : c)) };
    // the assembly's undo stack comes back, with the component edit as one undoable step
    if (ctx.history) history.restore(ctx.history);
    else history.clear();
    history.push(`Edit Component ${ctx.componentName}`, ctx.assembly);
    set({ editContext: null });
    get().openDocument(assembly, { keepHistory: true });
    set({ tab: 'assembly', dirty: true, ...historyFlags() });
    autosave(get().doc);
  },
  setLargeAssembly(largeAssembly) {
    set({ largeAssembly, show: largeAssembly ? { ...get().show, shadows: false, realisticShading: false } : get().show, displayStyle: largeAssembly ? 'shaded' : get().displayStyle });
    get().pushMessage(largeAssembly ? 'Large Assembly Settings on: shaded display without edges, no shadows or Realistic Shading.' : 'Large Assembly Settings off.');
  },
  startBelt() {
    const { doc, rebuild, selectedFaces, selectedFace } = get();
    const refs = selectedFaces.length ? selectedFaces : selectedFace ? [selectedFace] : [];
    const pulleys: BeltFeature['pulleys'] = [];
    for (const r of refs) {
      const b = rebuild.bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      if (!b || !f || !f.curved) continue;
      const ax = cylinderAxis(b.geometry, f.triangles);
      if (ax) pulleys.push({ center: [ax.point.x, ax.point.y, ax.point.z], axis: [ax.dir.x, ax.dir.y, ax.dir.z], radius: ax.radius });
    }
    if (pulleys.length < 2) {
      get().pushMessage('Belt/Chain: select two or more cylindrical faces (the pulleys) with Ctrl, then click Belt/Chain.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'belt').length + 1;
    const draft: BeltFeature = { id: newId('f'), type: 'belt', name: `Belt${n}`, suppressed: false, pulleys, thickness: 2 };
    get().applyDocument(draft.name, { ...doc, features: [...doc.features, draft] });
  },
  setIsolated(isolated) {
    set({ isolated });
  },
  startInsertComponent() {
    set({ insertingComponent: true, mateEdit: null, featureEdit: null, managerTab: 'tree', tab: 'assembly' });
  },
  cancelInsertComponent() {
    set({ insertingComponent: false, insertGhost: null });
  },
  setInsertGhost(insertGhost) {
    set({ insertGhost });
  },
  rotateInsertGhost(axis, deg) {
    const g = get().insertGhost;
    if (!g) return;
    const a = ((deg ?? get().insertAngle) * Math.PI) / 180;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0), a).multiply(new THREE.Quaternion(...g.rotation));
    set({ insertGhost: { ...g, rotation: [q.x, q.y, q.z, q.w] } });
  },
  setInsertAngle(insertAngle) {
    set({ insertAngle });
  },
  placeInsertGhost(position) {
    const g = get().insertGhost;
    if (!g) return;
    get().insertComponent(g.part, { fixMode: g.fixMode, configuration: g.configuration, keepOpen: g.keepOpen, atOrigin: !position, position: position ?? undefined, rotation: g.rotation, virtual: g.virtual, envelope: g.envelope });
    // Keep Visible: the same part stays on the pointer for the next copy
    set({ insertGhost: g.keepOpen ? g : null });
  },
  insertComponent(part, opts = {}) {
    const { doc } = get();
    if (!isAssembly(doc)) {
      get().pushMessage('Components can only be inserted in an assembly (File ▸ New ▸ Assembly).', 'warn');
      return;
    }
    history.push('Insert Component', doc);
    const comps = doc.components ?? [];
    const fixMode = opts.fixMode ?? 'first';
    // a sub-assembly: its components (and their mates) come in as one group, placed by the insertion transform
    if (part.kind === 'assembly') {
      const sub = { id: newId('sub'), name: instanceName(doc, part.name), ...(activeConfiguration(part).hideChildrenInBom ? { hideChildren: true } : {}) };
      const T = new THREE.Matrix4().compose(new THREE.Vector3(...(opts.position ?? [0, 0, 0])), new THREE.Quaternion(...(opts.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(1, 1, 1));
      const ids = new Map<string, string>();
      const added: Component[] = [];
      let d0: Document = { ...doc, components: [...comps] };
      for (const c of part.components ?? []) {
        const m = T.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...c.position), new THREE.Quaternion(...c.rotation), new THREE.Vector3(1, 1, 1)));
        const p = new THREE.Vector3(), q = new THREE.Quaternion();
        m.decompose(p, q, new THREE.Vector3());
        const id = newId('comp');
        ids.set(c.id, id);
        const nc: Component = { ...c, id, name: instanceName(d0, c.name.replace(/<\d+>$/, '')), position: [p.x, p.y, p.z], rotation: [q.x, q.y, q.z, q.w], fixed: added.length === 0 && (fixMode === 'fix' || (fixMode === 'first' && comps.length === 0)), subassembly: sub };
        added.push(nc);
        d0 = { ...d0, components: [...(d0.components ?? []), nc] };
      }
      if (!added.length) {
        get().pushMessage(`${part.name} has no components.`, 'warn');
        return;
      }
      const subMates = (part.mates ?? []).filter((m) => m.refs.every((r) => ids.has(r.componentId))).map((m) => ({ ...m, id: newId('mate'), subassembly: sub.id, refs: m.refs.map((r) => ({ ...r, componentId: ids.get(r.componentId)! })) as typeof m.refs }));
      const d: Document = { ...d0, mates: [...(doc.mates ?? []), ...subMates] };
      set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: added[0].id, insertingComponent: !!opts.keepOpen, dirty: true, tab: 'assembly', ...historyFlags() });
      get().pushMessage(`${sub.name} inserted (${added.length} components).`);
      autosave(d);
      return;
    }
    const partDoc: Document = { ...part, kind: 'part' };
    const comp: Component = { id: newId('comp'), name: instanceName(doc, part.name), part: partDoc, position: opts.position ?? [0, 0, 0], rotation: opts.rotation ?? [0, 0, 0, 1], fixed: fixMode === 'fix' || (fixMode === 'first' && comps.length === 0), suppressed: false, configuration: opts.configuration ?? activeConfiguration(partDoc).name, ...(opts.virtual ? { virtual: true } : {}), ...(opts.envelope ? { envelope: true } : {}) };
    // later instances start next to the existing ones so they are visible (OK inserts at the origin)
    if (comps.length && !opts.atOrigin && !opts.position) {
      const r = get().rebuild;
      const box = new THREE.Box3();
      for (const b of r.bodies) {
        b.geometry.computeBoundingBox();
        if (b.geometry.boundingBox) box.union(b.geometry.boundingBox);
      }
      if (!box.isEmpty()) comp.position = [box.max.x + 20, 0, 0];
    }
    const d: Document = { ...doc, components: [...comps, comp] };
    const rebuild = rebuildFor(d, null);
    set({ doc: d, rebuild, selectedFeatureId: comp.id, insertingComponent: !!opts.keepOpen, dirty: true, tab: 'assembly', ...historyFlags() });
    get().pushMessage(`${comp.name} inserted${comp.fixed ? ' (fixed at the origin)' : ''}.`);
    autosave(d);
  },
  selectComponent(id) {
    const pe = get().patternEdit;
    if (pe && id) {
      const has = pe.draft.seeds.includes(id);
      get().updatePatternDraft({ seeds: has ? pe.draft.seeds.filter((x) => x !== id) : [...pe.draft.seeds, id] }, 'seeds');
      return;
    }
    const ex = get().explodeEdit;
    if (ex && id) {
      const has = ex.current.componentIds.includes(id);
      get().updateExplodeDraft({ componentIds: has ? ex.current.componentIds.filter((x) => x !== id) : [...ex.current.componentIds, id] });
      return;
    }
    set({ selectedFeatureId: id, selectedFace: null, selectedFaces: [], selectedEdges: [] });
  },
  setAsmTool(asmTool) {
    set({ asmTool });
    if (asmTool !== 'select') get().pushMessage(asmTool === 'move' ? 'Move Component: drag a component in the graphics area (fixed components do not move).' : 'Rotate Component: drag to rotate the component about its centre.');
  },
  moveComponent(id, delta) {
    const { doc } = get();
    const comps = doc.components ?? [];
    const c = comps.find((x) => x.id === id);
    if (!c || c.fixed) return;
    // Autokey: with the time bar past 0 the move becomes a key of the motion study at that time
    if (get().motionOpen && get().motionAutokey && get().motionTime > 1e-9) {
      const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
      const t = get().motionTime;
      const p = keyedPose(c, study.keys ?? [], t);
      const pos = (p ? p.position : new THREE.Vector3(...c.position)).add(new THREE.Vector3(...delta));
      const keys = [...(study.keys ?? []).filter((k) => !(k.componentId === id && Math.abs(k.time - t) < 1e-6)), { componentId: id, time: t, position: pos.toArray() as [number, number, number], rotation: p ? (p.rotation.toArray() as [number, number, number, number]) : c.rotation }];
      const d: Document = { ...doc, motionStudy: { ...study, keys } };
      set({ doc: d, dirty: true });
      return;
    }
    const d: Document = { ...doc, components: comps.map((x) => (x.id === id ? { ...x, position: [x.position[0] + delta[0], x.position[1] + delta[1], x.position[2] + delta[2]] } : x)) };
    set({ ...withSolvedComponents(d), dirty: true });
  },
  rotateComponent(id, axis, angleDeg) {
    const { doc, rebuild } = get();
    const comps = doc.components ?? [];
    const c = comps.find((x) => x.id === id);
    if (!c || c.fixed) return;
    const body = rebuild.bodies.find((b) => b.id === id);
    body?.geometry.computeBoundingBox();
    const pivot = body?.geometry.boundingBox ? body.geometry.boundingBox.getCenter(new THREE.Vector3()) : new THREE.Vector3(...c.position);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis).normalize(), (angleDeg * Math.PI) / 180);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...c.position), new THREE.Quaternion(...c.rotation), new THREE.Vector3(1, 1, 1));
    const r = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z)).multiply(m);
    const pos = new THREE.Vector3(), rot = new THREE.Quaternion(), sc = new THREE.Vector3();
    r.decompose(pos, rot, sc);
    const d: Document = { ...doc, components: comps.map((x) => (x.id === id ? { ...x, position: [pos.x, pos.y, pos.z], rotation: [rot.x, rot.y, rot.z, rot.w] } : x)) };
    set({ ...withSolvedComponents(d), dirty: true });
  },
  setComponentFixed(id, fixed) {
    const { doc } = get();
    history.push(fixed ? 'Fix' : 'Float', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => (x.id === id ? { ...x, fixed } : x)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  setComponentHidden(id, hidden) {
    const { doc } = get();
    history.push(hidden ? 'Hide component' : 'Show component', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => (x.id === id ? { ...x, hidden } : x)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  showAllComponents() {
    const { doc } = get();
    if (!(doc.components ?? []).some((x) => x.hidden)) return;
    history.push('Show all components', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => ({ ...x, hidden: false })) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteComponent(id) {
    const { doc } = get();
    history.push('Delete component', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).filter((x) => x.id !== id), mates: (doc.mates ?? []).filter((m) => m.refs.every((r) => r.componentId !== id)) };
    set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startMate() {
    const { doc } = get();
    if (!isAssembly(doc)) {
      get().pushMessage('Mates are defined in an assembly (File ▸ New ▸ Assembly).', 'warn');
      return;
    }
    const n = (doc.mates ?? []).length + 1;
    const draft: Mate = { id: newId('mate'), type: 'coincident', name: `Coincident${n}`, refs: [] as unknown as [MateRef, MateRef], aligned: false, suppressed: false };
    set({ mateEdit: { mateId: null, draft }, insertingComponent: false, featureEdit: null, selectedFace: null, selectedFaces: [], selectedEdges: [], asmTool: 'select', managerTab: 'tree', tab: 'assembly' });
  },
  cancelMate() {
    set({ mateEdit: null, selectedFace: null, selectedFaces: [], rebuild: rebuildFor(get().doc, null) });
  },
  updateMateDraft(patch) {
    const me = get().mateEdit;
    if (!me) return;
    const draft = { ...me.draft, ...patch };
    if (patch.type) draft.refs = (draft.refs as unknown as MateRef[]).slice(-mateRefCount(patch.type)) as unknown as [MateRef, MateRef];
    if (patch.type && !me.mateId) {
      const base = ({ coincident: 'Coincident', parallel: 'Parallel', perpendicular: 'Perpendicular', tangent: 'Tangent', concentric: 'Concentric', lock: 'Lock', distance: 'Distance', angle: 'Angle', profileCenter: 'ProfileCenter', symmetric: 'Symmetric', width: 'Width', path: 'PathMate', linearCoupler: 'LinearCoupler', distanceLimit: 'LimitDistance', angleLimit: 'LimitAngle', cam: 'CamMate', slot: 'SlotMate', hinge: 'Hinge', gear: 'GearMate', rackPinion: 'RackPinionMate', screw: 'Screw', universalJoint: 'UniversalJoint' } as Record<string, string>)[patch.type];
      draft.name = `${base}${(get().doc.mates ?? []).filter((m) => m.type === patch.type).length + 1}`;
    }
    set({ mateEdit: { ...me, draft } });
    refreshMatePreview();
  },
  removeMateRef(index) {
    const me = get().mateEdit;
    if (!me) return;
    const refs = me.draft.refs.filter((_, i) => i !== index) as unknown as [MateRef, MateRef];
    set({ mateEdit: { ...me, draft: { ...me.draft, refs } }, selectedFaces: get().selectedFaces.filter((_, i) => i !== index), selectedFace: null });
    refreshMatePreview();
  },
  commitMate(keepOpen = false) {
    const { doc, mateEdit } = get();
    if (!mateEdit || mateEdit.draft.refs.length !== mateRefCount(mateEdit.draft.type)) return;
    let draft = splitMateRefs(mateEdit.draft);
    // coupling mates remember where both components were when the mate was made
    if (COUPLING_MATES.has(draft.type)) {
      const ca = (doc.components ?? []).find((c) => c.id === draft.refs[0].componentId), cb = (doc.components ?? []).find((c) => c.id === draft.refs[1].componentId);
      if (ca && cb) draft = { ...draft, base: { a: { position: [...ca.position], rotation: [...ca.rotation] }, b: { position: [...cb.position], rotation: [...cb.rotation] } } };
    }
    if (draft.refs[0].componentId === draft.refs[1].componentId) {
      get().pushMessage('Select faces of two different components.', 'warn');
      return;
    }
    history.push(mateEdit.mateId ? `Edit ${draft.name}` : draft.name, doc);
    // Add to new folder: the new mate goes into a folder of its own under Mates
    const mo = get().mateOpts;
    if (mo.newFolder && !mateEdit.mateId && !draft.folder) draft = { ...draft, folder: `MateGroup${new Set((doc.mates ?? []).map((m) => m.folder).filter(Boolean)).size + 1}` };
    // Use for positioning only: the components move to the mated position, no mate is kept
    if (mo.positionOnly && !mateEdit.mateId) {
      const placed = rebuildFor({ ...doc, mates: [...(doc.mates ?? []), draft] }, null) as unknown as { components?: Component[] };
      const d0: Document = { ...doc, components: (doc.components ?? []).map((c) => placed.components?.find((x) => x.id === c.id) ?? c) };
      set({ doc: d0, rebuild: rebuildFor(d0, null), mateEdit: null, selectedFace: null, selectedFaces: [], dirty: true, ...historyFlags() });
      autosave(d0);
      if (keepOpen) get().startMate();
      return;
    }
    const mates = mateEdit.mateId ? (doc.mates ?? []).map((m) => (m.id === mateEdit.mateId ? draft : m)) : [...(doc.mates ?? []), draft];
    let d: Document = { ...doc, mates };
    const rebuild = rebuildFor(d, null);
    // keep the solved positions so later moves start from the mated state
    const solved = (rebuild as unknown as { components?: Component[] }).components;
    if (solved) d = { ...d, components: (d.components ?? []).map((c) => solved.find((x) => x.id === c.id) ?? c) };
    // the new mate stays selected: its faces light up in cyan, by design
    set({ doc: d, rebuild, mateEdit: null, selectedFace: null, selectedFaces: [], selectedFeatureId: draft.id, dirty: true, ...historyFlags() });
    autosave(d);
    // Keep Visible (push pin): the Mate Property Panel stays open for the next mate
    if (keepOpen) get().startMate();
  },
  editMate(id) {
    const m = (get().doc.mates ?? []).find((x) => x.id === id);
    if (!m) return;
    set({ mateEdit: { mateId: id, draft: joinMateRefs(m) }, featureEdit: null, insertingComponent: false, managerTab: 'tree', tab: 'assembly' });
  },
  deleteMate(id) {
    const { doc } = get();
    history.push('Delete mate', doc);
    const d: Document = { ...doc, mates: (doc.mates ?? []).filter((m) => m.id !== id) };
    set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMateSuppressed(id, suppressed) {
    const { doc } = get();
    history.push(suppressed ? 'Suppress mate' : 'Unsuppress mate', doc);
    const d: Document = { ...doc, mates: (doc.mates ?? []).map((m) => (m.id === id ? { ...m, suppressed } : m)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  setInterferenceHighlight(interferenceHighlight) {
    set({ interferenceHighlight });
  },
  insertModelItems() {
    const { doc, drawingEdit: de, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !de?.modelItems) return;
    const views = de.modelItems.source === 'selected' ? sheet.views.filter((v) => v.id === selectedDrawingViewId) : sheet.views;
    const dims = modelItems(views, de.modelItems, sheet.dimensions);
    if (!dims.length) {
      get().pushMessage('No model items to insert: the views already show them or no view is parallel to a sketch.', 'warn');
      set({ drawingEdit: null });
      return;
    }
    history.push('Model Items', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, dimensions: [...sheet.dimensions, ...dims] }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMaterial(material) {
    const { doc, materialTarget } = get();
    history.push('Material', doc);
    let d: Document;
    if (materialTarget) {
      const bodyMaterials = { ...(doc.bodyMaterials ?? {}) };
      if (material) bodyMaterials[materialTarget] = material;
      else delete bodyMaterials[materialTarget];
      d = { ...doc, bodyMaterials };
    } else d = { ...doc, material: material ?? undefined };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  openMaterialFor(bodyId) {
    set({ materialTarget: bodyId, dialog: 'material' });
  },
  startComponentPattern(kind) {
    const { doc, selectedFeatureId } = get();
    if (!isAssembly(doc) || !(doc.components ?? []).length) {
      get().pushMessage('A component pattern needs an assembly with components.', 'warn');
      return;
    }
    const seeds = (doc.components ?? []).some((c) => c.id === selectedFeatureId) ? [selectedFeatureId!] : [];
    const pats = doc.componentPatterns ?? [];
    const n = pats.filter((p) => p.kind === kind).length + 1;
    const draft: ComponentPattern = kind === 'linear'
      ? { id: newId('cp'), name: `LocalLPattern${n}`, kind, seeds, dir: [1, 0, 0], spacing: 50, count: 2, dirLabel: 'X axis' }
      : { id: newId('cp'), name: `LocalCirPattern${n}`, kind, seeds, dir: [0, 1, 0], axisPoint: [0, 0, 0], spacing: 0, count: 4, angle: 360, equal: true, dirLabel: 'Y axis' };
    const patternEdit: PatternEdit = { patternId: null, draft, focus: seeds.length ? 'direction' : 'seeds' };
    set({ patternEdit, explodeEdit: null, mateEdit: null, insertingComponent: false, featureEdit: null, managerTab: 'tree', tab: 'assembly' });
    previewPattern(patternEdit);
  },
  editComponentPattern(id) {
    const p = (get().doc.componentPatterns ?? []).find((x) => x.id === id);
    if (!p) return;
    const patternEdit: PatternEdit = { patternId: id, draft: { ...p }, focus: 'seeds' };
    set({ patternEdit, explodeEdit: null, mateEdit: null, featureEdit: null, managerTab: 'tree' });
    previewPattern(patternEdit);
  },
  commitComponentPattern() {
    const pe = get().patternEdit;
    if (!pe) return;
    if (!pe.draft.seeds.length) {
      get().pushMessage('Select the components to pattern.', 'warn');
      return;
    }
    const { doc } = get();
    history.push(pe.draft.kind === 'linear' ? 'Linear Component Pattern' : 'Circular Component Pattern', doc);
    const pats = doc.componentPatterns ?? [];
    const list = pe.patternId ? pats.map((p) => (p.id === pe.patternId ? pe.draft : p)) : [...pats, pe.draft];
    const d: Document = { ...doc, componentPatterns: list };
    set({ doc: d, patternEdit: null, rebuild: rebuildFor(d, null), selectedFeatureId: pe.draft.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancelComponentPattern() {
    set({ patternEdit: null, rebuild: rebuildFor(get().doc, null) });
  },
  deleteComponentPattern(id) {
    const { doc } = get();
    history.push('Delete', doc);
    const d: Document = { ...doc, componentPatterns: (doc.componentPatterns ?? []).filter((p) => p.id !== id) };
    set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startExplode() {
    const { doc, selectedFeatureId } = get();
    if (!isAssembly(doc) || !(doc.components ?? []).length) {
      get().pushMessage('Exploded View needs an assembly with components.', 'warn');
      return;
    }
    const sel = (doc.components ?? []).some((c) => c.id === selectedFeatureId) ? [selectedFeatureId!] : [];
    const explodeEdit: ExplodeEdit = { steps: [...(doc.explodeSteps ?? [])], current: { componentIds: sel, axis: 'y', reverse: false, distance: 50 } };
    set({ explodeEdit, mateEdit: null, insertingComponent: false, featureEdit: null, managerTab: 'tree', tab: 'assembly' });
    previewExplode(explodeEdit);
  },
  updateExplodeDraft(patch) {
    const ee = get().explodeEdit;
    if (!ee) return;
    const next = { ...ee, current: { ...ee.current, ...patch } };
    set({ explodeEdit: next });
    previewExplode(next);
  },
  addExplodeStep() {
    const ee = get().explodeEdit;
    if (!ee) return;
    if (!ee.current.componentIds.length) {
      get().pushMessage('Select the components to explode (in the graphics area or the tree).', 'warn');
      return;
    }
    const next: ExplodeEdit = { steps: [...ee.steps, explodeStepOf(ee, ee.steps.length + 1)], current: { ...ee.current, componentIds: [] } };
    set({ explodeEdit: next });
    previewExplode(next);
  },
  deleteExplodeStep(id) {
    const ee = get().explodeEdit;
    if (!ee) return;
    const next = { ...ee, steps: ee.steps.filter((x) => x.id !== id) };
    set({ explodeEdit: next });
    previewExplode(next);
  },
  commitExplode() {
    const ee = get().explodeEdit;
    if (!ee) return;
    const { doc } = get();
    const steps = ee.current.componentIds.length ? [...ee.steps, explodeStepOf(ee, ee.steps.length + 1)] : ee.steps;
    history.push('Exploded View', doc);
    const d: Document = { ...doc, explodeSteps: steps, exploded: steps.length > 0 };
    set({ doc: d, explodeEdit: null, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancelExplode() {
    set({ explodeEdit: null, rebuild: rebuildFor(get().doc, null) });
  },
  setExploded(exploded) {
    const { doc } = get();
    const d: Document = { ...doc, exploded };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true });
    autosave(d);
  },
  animateCollapse() {
    const { doc } = get();
    if (!doc.exploded) return;
    const t0 = performance.now(), dur = 1200;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const d: Document = k >= 1 ? { ...get().doc, exploded: false, explodeFactor: undefined } : { ...get().doc, explodeFactor: 1 - k };
      set({ doc: d, rebuild: rebuildFor(d, null) });
      if (k < 1) requestAnimationFrame(step);
      else autosave(d);
    };
    requestAnimationFrame(step);
  },
  setComponentConfiguration(id, name) {
    const { doc } = get();
    history.push('Component configuration', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => (x.id === id ? { ...x, configuration: name } : x)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
});
