/**
 * B-rep refinement (docs/14, step 2): after every rebuild of a part, the OpenCascade worker builds the same document
 * with the B-rep kernel; the bodies that stay exact replace the mesh bodies (true cylinders and rounds, exact volume).
 * The mesh result shows at once, the exact one follows; a rebuild in between makes the late result void.
 * Selected faces and edges are carried over to the new body by their place, not by their number.
 */
import * as THREE from 'three';
import { copyFaceNames } from '../core/features/faceNames';
import { useStore, rebuildNow, type FaceRef } from './store';
import { partRebuild, setPartRebuild } from '../core/assembly/assembly';
import type { Document } from '../core/document/types';
import type { Body, RebuildResult } from '../core/features/rebuild';
import { bodyEdges, edgeRef, matchEdge } from '../core/features/edgesets';
import { meshVolume, planarFaces } from '../core/features/solid';
import { volumeMismatch } from '../core/features/volumeCheck';
import { splitFaces } from '../core/features/splitline';
import { isAssembly, isDrawing } from '../core/document/types';
import { getPref } from './prefs';
import { TEST_HOOKS } from './testHooks';

const refined = new WeakSet<RebuildResult>();
let timer: number | null = null;
let busy = false;
let again = false;

/** on by default; off in Tools ▸ Options ▸ Performance. The e2e builds use the mesh kernel unless a test asks for it
 * (localStorage phlippo.kernel = brep, or ?kernel=brep in the address). */
export function brepEnabled(): boolean {
  if (getPref('perf.brepKernel') === false) return false;
  if (TEST_HOOKS) {
    try {
      // ?kernel=brep runs a whole e2e script on the B-rep kernel (the CI's B-rep pass, QA F105)
      return localStorage.getItem('phlippo.kernel') === 'brep' || new URLSearchParams(location.search).get('kernel') === 'brep';
    } catch {
      return false;
    }
  }
  return true;
}

function nearestFace(body: Body, old: { normal: [number, number, number]; centroid: [number, number, number] }): string | null {
  const n = new THREE.Vector3(...old.normal), c = new THREE.Vector3(...old.centroid);
  let best: string | null = null, bd = Infinity;
  for (const f of body.faces) {
    if (new THREE.Vector3(...f.normal).dot(n) < 0.95) continue;
    const d = new THREE.Vector3(...f.centroid).distanceTo(c);
    if (d < bd) { bd = d; best = f.id; }
  }
  return best;
}

/** the mesh result with its exact bodies swapped in (null when the worker's bodies do not line up) */
function refinedResult(sent: RebuildResult, bodies: import('../workers/occt.worker').RefinedBody[]): RebuildResult | null {
  if (bodies.length !== sent.bodies.length || bodies.some((b, i) => b.id !== sent.bodies[i].id)) return null;
  if (!bodies.some((b) => b.exact && b.positions)) return null;
  const next: Body[] = sent.bodies.map((b, i) => {
    const r = bodies[i];
    if (!r.exact || !r.positions) return b;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(r.positions, 3));
    if (r.normals) g.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3));
    else g.computeVertexNormals();
    // the exact body takes the face names of its mesh twin (F47)
    copyFaceNames([b.geometry], g);
    const sf = splitFaces(g, planarFaces(g, b.id), []);
    return { ...b, geometry: g, faces: sf.faces, edges: bodyEdges(g, b.id, 20, sf.segments), exact: true, exactVolume: r.exactVolume };
  });
  // the openings of the faceted result (F48) are gone where the body is exact now
  const faceted = next.filter((b) => !b.exact);
  const warnings = Object.fromEntries(Object.entries(sent.warnings ?? {}).filter(([id]) => faceted.some((b) => b.featureIds.includes(id))));
  // the exact volume is checked against the faceted one (QA F159): the two kernels build the same part, so a body
  // whose volumes differ by more than the tessellation's margin got a wrong feature on one of them; the feature is
  // marked (yellow in the tree, What's Wrong) and the mismatch is said
  for (const [i, b] of next.entries()) {
    const mismatch = b.exact ? volumeMismatch(Math.abs(meshVolume(sent.bodies[i].geometry)), b.exactVolume ?? 0) : null;
    if (!mismatch) continue;
    const fid = b.featureIds[b.featureIds.length - 1];
    if (fid && !sent.errors[fid]) warnings[fid] = mismatch;
  }
  return { ...sent, bodies: next, warnings: Object.keys(warnings).length ? warnings : undefined };
}

function apply(sent: RebuildResult, bodies: import('../workers/occt.worker').RefinedBody[]) {
  if (useStore.getState().rebuild !== sent) return; // rebuilt meanwhile: the next refinement follows
  const result = refinedResult(sent, bodies);
  if (!result) return;
  refined.add(result);
  useStore.setState({ rebuild: result, ...carrySelection(sent, result) });
  const added = Object.entries(result.warnings ?? {}).filter(([id, w]) => w.startsWith('Warning: the exact') && sent.warnings?.[id] !== w);
  if (added.length) useStore.getState().pushMessage(`${added.length === 1 ? 'One feature differs' : `${added.length} features differ`} between the exact and the faceted result: see What's Wrong.`, 'warn');
}

/** an assembly: every part is refined once (by document identity), then the assembly is rebuilt from the exact parts */
const refinedParts = new WeakSet<Document>();
function partsOf(doc: Document, out = new Set<Document>()): Set<Document> {
  for (const c of doc.components ?? []) {
    if (isAssembly(c.part)) partsOf(c.part, out);
    else if (!isDrawing(c.part)) out.add(c.part);
  }
  return out;
}
async function refineAssembly(doc: Document): Promise<boolean> {
  const { refineRebuild } = await import('../core/occt/occtClient');
  let changed = false;
  for (const part of partsOf(doc)) {
    if (refinedParts.has(part)) continue;
    refinedParts.add(part);
    if (part.features.some((f) => f.type === 'splitLine' && !f.suppressed)) continue;
    const mesh = partRebuild(part);
    if (!mesh.bodies.length) continue;
    const r = refinedResult(mesh, await refineRebuild(part, null));
    if (r) { setPartRebuild(part, r); changed = true; }
  }
  return changed;
}

/** the selected faces and edges of one rebuild result found again on another (by place, not by number) */
function carrySelection(from: RebuildResult, to: RebuildResult) {
  const st = useStore.getState();
  const byId = (list: Body[]) => new Map(list.map((b) => [b.id, b]));
  const oldB = byId(from.bodies), newB = byId(to.bodies);
  const mapFace = (f: FaceRef | null): FaceRef | null => {
    if (!f) return null;
    const ob = oldB.get(f.bodyId), nb = newB.get(f.bodyId);
    const of = ob?.faces.find((x) => x.id === f.faceId);
    if (!ob || !nb || !of || ob === nb) return f;
    const id = nearestFace(nb, of);
    return id ? { bodyId: f.bodyId, faceId: id } : null;
  };
  const mapEdge = (id: string): string | null => {
    const bodyId = id.split(':')[0];
    const ob = oldB.get(bodyId), nb = newB.get(bodyId);
    if (!ob || !nb || ob === nb) return id;
    const oe = ob.edges.find((e) => e.id === id);
    const ne = oe ? matchEdge(nb.edges, edgeRef(oe)) : null;
    return ne ? ne.id : null;
  };
  return {
    selectedFace: mapFace(st.selectedFace),
    selectedFaces: st.selectedFaces.map(mapFace).filter((f): f is FaceRef => !!f),
    hoverFace: null,
    selectedEdges: st.selectedEdges.map(mapEdge).filter((e): e is string => !!e),
    hoverEdge: null,
  };
}

/** a kernel call that hung: say so once, the faceted (mesh) result stays shown */
function timedOut(err: unknown) {
  if (err instanceof Error && err.name === 'KernelTimeout') useStore.getState().pushMessage('Exact geometry timed out; showing the faceted (mesh) result.', 'warn');
}

async function run() {
  if (busy) { again = true; return; }
  const st = useStore.getState();
  const sent = st.rebuild;
  if (refined.has(sent) || sent.pending || !st.hasDocument || isDrawing(st.doc) || !sent.bodies.length) return;
  if (isAssembly(st.doc)) {
    busy = true;
    try {
      if (await refineAssembly(st.doc)) {
        const now = useStore.getState();
        if (now.doc === st.doc && now.rebuild === sent) {
          const r = rebuildNow(st.doc, st.rollbackIndex);
          refined.add(r);
          useStore.setState({ rebuild: r, ...carrySelection(sent, r) });
        }
      }
    } catch (err) {
      timedOut(err); /* the mesh parts stay */
    } finally {
      busy = false;
      if (again) { again = false; schedule(); }
    }
    return;
  }
  // Split Lines split the faces after the rebuild: those parts stay on the mesh kernel for now
  if (st.doc.features.some((f) => f.type === 'splitLine' && !f.suppressed)) return;
  busy = true;
  try {
    const { refineRebuild } = await import('../core/occt/occtClient');
    const bodies = await refineRebuild(st.doc, st.rollbackIndex);
    apply(sent, bodies);
  } catch (err) {
    timedOut(err); /* the mesh bodies stay */
  } finally {
    busy = false;
    if (again) { again = false; schedule(); }
  }
}

function schedule() {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => { timer = null; void run(); }, 120);
}

/** starts following the rebuilds of the store (once, at start-up) */
export function startBrepRefinement(): () => void {
  return useStore.subscribe((s, prev) => {
    if (s.rebuild === prev.rebuild || refined.has(s.rebuild) || s.rebuild.pending) return;
    if (!brepEnabled()) return;
    // the next rebuild starts from the mesh again: the selection made on the exact body moves with it
    // (only what the update left as it was: a selection the action set itself already refers to the new rebuild)
    if (prev.rebuild.bodies.some((b) => b.exact) && (s.selectedFace || s.selectedFaces.length || s.selectedEdges.length)) {
      const c = carrySelection(prev.rebuild, s.rebuild);
      const patch: Partial<typeof c> = {};
      if (s.selectedFace === prev.selectedFace) patch.selectedFace = c.selectedFace;
      if (s.selectedFaces === prev.selectedFaces) patch.selectedFaces = c.selectedFaces;
      if (s.selectedEdges === prev.selectedEdges) patch.selectedEdges = c.selectedEdges;
      if (Object.keys(patch).length) useStore.setState(patch);
    }
    schedule();
  });
}
