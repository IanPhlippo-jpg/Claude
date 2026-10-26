import { bridge } from './viewport/bridge';
import * as THREE from 'three';
import { useStore } from './store';
import { createDocument, type Component, type ComponentPattern, type Document, type Mate } from '../core/document/types';
import { newId } from '../core/sketch/model';
import { instanceName } from '../core/assembly/assembly';
import { resolvePlaneDef } from '../core/features/planes';
import { serializeDocument } from '../core/document/persistence';

const S = () => useStore.getState();
const comps = (d: Document) => d.components ?? [];
const selectedComponent = () => comps(S().doc).find((c) => c.id === S().selectedFeatureId) ?? null;

/** Insert Components ▸ New Part: an empty part at the origin, edited in the context of the assembly. */
export function insertNewPart(): void {
  const st = S();
  const n = comps(st.doc).filter((c) => /^Part\d+\^/.test(c.part.name)).length + 1;
  const part = createDocument(`Part${n}^${st.doc.name}`);
  st.insertComponent(part, { fixMode: 'float', atOrigin: true });
  const c = comps(S().doc)[comps(S().doc).length - 1];
  if (c) S().editComponent(c.id);
}

/** Insert Components ▸ New Assembly: an empty sub-assembly. */
export function insertNewAssembly(): void {
  const st = S();
  const n = comps(st.doc).filter((c) => /^Assem\d+\^/.test(c.part.name)).length + 2;
  const sub = createDocument(`Assem${n}^${st.doc.name}`, 'assembly');
  const doc = st.doc;
  const comp: Component = { id: newId('comp'), name: instanceName(doc, sub.name), part: sub, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false };
  st.applyDocument('New Assembly', { ...doc, components: [...comps(doc), comp] });
  st.pushMessage(`${comp.name} added (an empty sub-assembly).`);
}

/**
 * Insert Components ▸ Copy with Mates: a copy of the selected component next to it; its mates are repeated for the
 * copy (suppressed, so you pick the new references with Edit Mate), by design asks for new references.
 */
export function copyWithMates(): void {
  const st = S();
  const src = selectedComponent();
  if (!src) {
    st.pushMessage('Select the component to copy (Copy with Mates).', 'warn');
    return;
  }
  const doc = st.doc;
  const copy: Component = { ...src, id: newId('comp'), name: instanceName(doc, src.part.name), position: [src.position[0] + 40, src.position[1], src.position[2]], fixed: false };
  const repeated: Mate[] = (doc.mates ?? []).filter((m) => m.refs.some((r) => r.componentId === src.id)).map((m, i) => ({
    ...m,
    id: newId('mate'),
    name: `${m.name.replace(/\d+$/, '')}${(doc.mates ?? []).length + i + 1}`,
    refs: m.refs.map((r) => (r.componentId === src.id ? { ...r, componentId: copy.id, label: r.label.replace(src.name, copy.name) } : r)) as Mate['refs'],
    suppressed: true,
  }));
  st.applyDocument('Copy with Mates', { ...doc, components: [...comps(doc), copy], mates: [...(doc.mates ?? []), ...repeated] });
  useStore.setState({ selectedFeatureId: copy.id });
  st.pushMessage(`${copy.name} copied with ${repeated.length} mate${repeated.length === 1 ? '' : 's'} (suppressed: edit them to choose the new references).`);
}

/**
 * Pattern Driven Component Pattern: the selected component follows a Linear or Circular Pattern feature of another
 * component's part (its direction, spacing and count, turned into the assembly by that component's placement).
 */
export function patternDrivenPattern(): { ok: boolean; message: string } {
  const st = S();
  const seed = selectedComponent();
  const doc = st.doc;
  if (!seed) return { ok: false, message: 'Select the component to pattern (the seed), e.g. a screw.' };
  for (const host of comps(doc)) {
    if (host.id === seed.id) continue;
    const pf = host.part.features.find((f) => (f.type === 'linearPattern' || f.type === 'circularPattern') && !f.suppressed);
    if (!pf || (pf.type !== 'linearPattern' && pf.type !== 'circularPattern')) continue;
    const q = new THREE.Quaternion(...host.rotation);
    const pos = new THREE.Vector3(...host.position);
    const n = (doc.componentPatterns ?? []).length + 1;
    let pat: ComponentPattern;
    if (pf.type === 'linearPattern' && pf.dir1) {
      const dir = new THREE.Vector3(...pf.dir1.axis).normalize().applyQuaternion(q);
      pat = { id: newId('cp'), name: `DerivedLPattern${n}`, kind: 'linear', seeds: [seed.id], dir: [dir.x, dir.y, dir.z], spacing: pf.dir1.spacing, count: pf.dir1.count, dirLabel: `${pf.name}@${host.name}` };
      if (pf.dir2) {
        const d2 = new THREE.Vector3(...pf.dir2.axis).normalize().applyQuaternion(q);
        pat = { ...pat, dir2: [d2.x, d2.y, d2.z], spacing2: pf.dir2.spacing, count2: pf.dir2.count };
      }
    } else {
      const ax = new THREE.Vector3(...(pf.axis?.dir ?? [0, 1, 0])).normalize().applyQuaternion(q);
      const ap = new THREE.Vector3(...(pf.axis?.origin ?? [0, 0, 0])).applyQuaternion(q).add(pos);
      pat = { id: newId('cp'), name: `DerivedCirPattern${n}`, kind: 'circular', seeds: [seed.id], dir: [ax.x, ax.y, ax.z], axisPoint: [ap.x, ap.y, ap.z], spacing: 0, count: pf.count ?? 4, angle: pf.angle ?? 360, equal: true, dirLabel: `${pf.name}@${host.name}` };
    }
    st.applyDocument(pat.name, { ...doc, componentPatterns: [...(doc.componentPatterns ?? []), pat] });
    return { ok: true, message: `${pat.name} follows ${pf.name} of ${host.name}.` };
  }
  return { ok: false, message: 'No component has a Linear or Circular Pattern feature to drive the pattern.' };
}

/**
 * Mirror Components: copies of the selected component(s) mirrored about a plane (Front/Top/Right or a reference
 * plane). The copies keep the part (Copy, not opposite hand): position reflected, orientation turned to match.
 */
export function mirrorComponents(planeId: string, ids?: string[], oppositeHand = false): number {
  const st = S();
  const doc = st.doc;
  const pick = ids ?? (selectedComponent() ? [selectedComponent()!.id] : []);
  if (!pick.length) {
    st.pushMessage('Select the components to mirror.', 'warn');
    return 0;
  }
  const pl = resolvePlaneDef(doc, planeId);
  const n = new THREE.Vector3(...pl.n).normalize();
  const o = new THREE.Vector3(...pl.origin);
  // reflection S = I - 2nn^T; for a rigid placement R, S R S is a proper rotation giving the mirror-image pose
  const Sm = new THREE.Matrix4().set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 0, -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 0, -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 0, 0, 0, 0, 1);
  let d = doc;
  for (const id of pick) {
    const c = comps(d).find((x) => x.id === id);
    if (!c) continue;
    const p = new THREE.Vector3(...c.position);
    const pm = p.clone().sub(o).addScaledVector(n, -2 * p.clone().sub(o).dot(n)).add(o);
    const R = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(...c.rotation));
    const Rm = Sm.clone().multiply(R).multiply(Sm);
    // Create opposite hand version: a mirrored part (its own name) instead of a copy of the same part;
    // mirroring an opposite-hand part again gives a turned copy of the intended design (two reflections make a rotation)
    let q = new THREE.Quaternion().setFromRotationMatrix(Rm);
    if (oppositeHand && c.mirror) {
      const m0 = new THREE.Vector3(...c.mirror).normalize();
      const S0 = new THREE.Matrix4().set(1 - 2 * m0.x * m0.x, -2 * m0.x * m0.y, -2 * m0.x * m0.z, 0, -2 * m0.y * m0.x, 1 - 2 * m0.y * m0.y, -2 * m0.y * m0.z, 0, -2 * m0.z * m0.x, -2 * m0.z * m0.y, 1 - 2 * m0.z * m0.z, 0, 0, 0, 0, 1);
      q = new THREE.Quaternion().setFromRotationMatrix(Rm.clone().multiply(Sm).multiply(S0));
    }
    const hand = oppositeHand ? { part: { ...c.part, name: c.mirror ? c.part.name.replace(/-mirror$/, '') : `${c.part.name}-mirror` }, mirror: (c.mirror ? undefined : [n.x, n.y, n.z]) as Component['mirror'] } : {};
    const copy: Component = { ...c, ...hand, id: newId('comp'), name: instanceName(d, oppositeHand ? (hand as { part: { name: string } }).part.name : c.part.name), position: [pm.x, pm.y, pm.z], rotation: [q.x, q.y, q.z, q.w], fixed: false };
    d = { ...d, components: [...comps(d), copy] };
  }
  st.applyDocument('Mirror Components', d);
  return pick.length;
}

/** Make Multibody Part: a new part with one body per component (as placed), opened in place of the assembly. */
export function makeMultibodyPart(): Document | null {
  const st = S();
  const bodies = st.rebuild.bodies;
  if (!bodies.length) {
    st.pushMessage('The assembly has no bodies to put in a part.', 'warn');
    return null;
  }
  const part = createDocument(`${st.doc.name}_multibody`);
  part.features = bodies.map((b) => {
    const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const name = comps(st.doc).find((c) => c.id === b.id)?.name ?? b.id;
    return { id: newId('f'), type: 'imported' as const, name, suppressed: false, positions: Array.from(g.getAttribute('position').array as Float32Array), source: name };
  });
  return part;
}

/** Take Snapshot: the current view (orientation, centre, zoom) with a small picture, listed under Snapshots. */
export function takeSnapshot(): void {
  const st = S();
  const cam = bridge.camera;
  if (!cam) return;
  const image = bridge.snapshot?.() ?? undefined;
  const n = (st.doc.snapshots ?? []).length + 1;
  const snap = { id: newId('snap'), name: `Snapshot${n}`, quaternion: [cam.rotation.x, cam.rotation.y, cam.rotation.z, cam.rotation.w] as [number, number, number, number], target: [cam.target.x, cam.target.y, cam.target.z] as [number, number, number], scale: cam.scale, image };
  st.applyDocument(snap.name, { ...st.doc, snapshots: [...(st.doc.snapshots ?? []), snap] });
  st.pushMessage(`${snap.name} taken.`);
}

export function restoreSnapshot(id: string): void {
  const snap = (S().doc.snapshots ?? []).find((x) => x.id === id);
  const cam = bridge.camera;
  if (!snap || !cam) return;
  cam.animateTo(new THREE.Quaternion(...snap.quaternion), new THREE.Vector3(...snap.target), snap.scale);
}

/** Pack and Go: the assembly and every part it uses, each as its own file. */
export function packAndGoFiles(): { name: string; text: string }[] {
  const doc = S().doc;
  const files: { name: string; text: string }[] = [{ name: `${doc.name}.kcad`, text: serializeDocument(doc) }];
  const seen = new Set<string>();
  for (const c of comps(doc)) {
    if (seen.has(c.part.name)) continue;
    seen.add(c.part.name);
    files.push({ name: `${c.part.name}.kcad`, text: serializeDocument(c.part) });
  }
  return files;
}

export function downloadText(name: string, text: string, type = 'application/json'): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Comments: a note on the selected feature or component (or the model). */
export function addComment(text: string): void {
  const st = S();
  if (!text.trim()) return;
  const c = { id: newId('cm'), featureId: st.selectedFeatureId ?? undefined, text: text.trim(), author: 'User', date: new Date().toISOString().slice(0, 16).replace('T', ' ') };
  st.applyDocument('Comment', { ...st.doc, comments: [...(st.doc.comments ?? []), c] });
}
