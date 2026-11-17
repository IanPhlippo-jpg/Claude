/**
 * B-rep refinement (docs/14, step 2): after every rebuild of a part, the OpenCascade worker builds the same document
 * with the B-rep kernel; the bodies that stay exact replace the mesh bodies (true cylinders and rounds, exact volume).
 * The mesh result shows at once, the exact one follows; a rebuild in between makes the late result void.
 * Selected faces and edges are carried over to the new body by their name or place, not by their number.
 * A newer rebuild stops a stale exact rebuild when that is cheaper than waiting; every failure is said (docs/32 P2-4).
 */
import * as THREE from 'three';
import { transferFace } from './faceTransfer';
import { kernelNotice } from '../core/occt/kernelPolicy';
import { rebuildBudgetMs } from '../core/features/rebuild';
import { copyFaceNames } from '../core/features/faceNames';
import { useStore, rebuildNow, type FaceRef } from './store';
import { partRebuild, setPartRebuild } from '../core/assembly/assembly';
import type { Document } from '../core/document/types';
import type { Body, RebuildResult } from '../core/features/rebuild';
import { bodyEdges, edgeRef, matchEdge } from '../core/features/edgesets';
import { meshVolume, planarFaces } from '../core/features/solid';
import { kernelMismatch } from '../core/features/volumeCheck';
import { splitFaces } from '../core/features/splitline';
import { isAssembly, isDrawing } from '../core/document/types';
import { getPref } from './prefs';
import { serializeDocument } from '../core/document/persistence';
import { TEST_HOOKS } from './testHooks';

const refined = new WeakSet<RebuildResult>();
let timer: number | null = null;
let busy = false;
let again = false;
// e2e: settle() in e2e/lib/wait.mjs waits until no exact rebuild is queued or running
if (TEST_HOOKS && typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__phlippoRefine = { busy: () => busy || timer !== null };

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

/** per document: how long its last exact rebuild took in the worker (ms), to judge whether a stale one is stopped */
const exactMs = new Map<string, number>();
/** the failures said so far (each once) */
const said = new Set<string>();

/** the mesh result with its exact bodies swapped in (null when the worker's bodies do not line up) */
function refinedResult(sent: RebuildResult, bodies: import('../workers/occt.worker').RefinedBody[], doc?: Document): RebuildResult | null {
  if (bodies.length !== sent.bodies.length || bodies.some((b, i) => b.id !== sent.bodies[i].id)) return null;
  if (!bodies.some((b) => (b.exact || b.approximate) && b.positions)) return null;
  const next: Body[] = sent.bodies.map((b, i) => {
    const r = bodies[i];
    if (!(r.exact || r.approximate) || !r.positions) return b;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(r.positions, 3));
    if (r.normals) g.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3));
    else g.computeVertexNormals();
    // the exact body takes the face names of its mesh twin (F47)
    copyFaceNames([b.geometry], g);
    const sf = splitFaces(g, planarFaces(g, b.id), []);
    // the display of the exact body comes from the worker (never the mesh body's: it would draw the faceted edges)
    const geo = (a: Float32Array, n?: Float32Array) => { const x = new THREE.BufferGeometry(); x.setAttribute('position', new THREE.BufferAttribute(a, 3)); if (n) x.setAttribute('normal', new THREE.BufferAttribute(n, 3)); return x; };
    const display = r.display ? { geometry: geo(r.display.positions, r.display.normals), edges: geo(r.display.edges), tangentEdges: geo(r.display.tangentEdges), of: g } : undefined;
    return { ...b, geometry: g, faces: sf.faces, edges: bodyEdges(g, b.id, 20, sf.segments), exact: !!r.exact, exactVolume: r.exact ? r.exactVolume : undefined, display };
  });
  // the openings of the faceted result (F48) are gone where the body is exact now
  const faceted = next.filter((b) => !b.exact);
  const warnings = Object.fromEntries(Object.entries(sent.warnings ?? {}).filter(([id]) => faceted.some((b) => b.featureIds.includes(id))));
  // a B-rep with a faceted part (a wrapped patch) says so on the feature that made it (QA 0.5.11 F175)
  for (const r of bodies) if (r.approximate && !r.exact && r.positions) warnings[r.approximate.featureId] = r.approximate.warning;
  // the exact body is checked against the faceted one (QA F159, F172): the two kernels build the same part, so a
  // body whose surfaces lie farther apart than the tessellation's margin (or whose volumes differ by more than its curved
  // surfaces allow, F172) got a wrong feature on one of them; the feature is marked (yellow in the tree, What's Wrong) and the mismatch is said
  for (const [i, b] of next.entries()) {
    const mismatch = !b.exact ? null : kernelMismatch(sent.bodies[i].geometry, Math.abs(meshVolume(sent.bodies[i].geometry)), b.geometry, b.exactVolume ?? 0, sent.bodies[i].faces);
    if (!mismatch) continue;
    // in the test builds a mismatch is an error in the console, so every e2e script on the B-rep kernel fails on one
    if (TEST_HOOKS) {
      console.error(`kernel cross-check (body ${b.id}): ${mismatch}`);
      // a test run can keep the document, to build it again on both kernels in a unit test (e2e/lib/dump-mismatch.mjs)
      const keep = (window as unknown as { __phlippoOnMismatch?: (kcad: string, info: string) => void }).__phlippoOnMismatch;
      if (keep && doc) keep(serializeDocument(doc), `body ${b.id} features ${b.featureIds.join(',')}
${mismatch}`);
    }
    const fid = b.featureIds[b.featureIds.length - 1];
    if (fid && !sent.errors[fid]) warnings[fid] = mismatch;
  }
  return { ...sent, bodies: next, warnings: Object.keys(warnings).length ? warnings : undefined };
}

function apply(sent: RebuildResult, bodies: import('../workers/occt.worker').RefinedBody[]) {
  if (useStore.getState().rebuild !== sent) return; // rebuilt meanwhile: the next refinement follows
  const result = refinedResult(sent, bodies, useStore.getState().doc);
  if (!result) return;
  refined.add(result);
  useStore.setState({ rebuild: result, ...carrySelection(sent, result) });
  const added = Object.entries(result.warnings ?? {}).filter(([id, w]) => w.startsWith('Warning: B-rep and mesh disagree') && sent.warnings?.[id] !== w);
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
    // a part whose exact rebuild failed or was stopped is tried again with the next rebuild
    const exact = await refineRebuild(part, null, rebuildBudgetMs).catch((err: unknown) => { refinedParts.delete(part); throw err; });
    if (exact.stopped) { stoppedOnBudget(); continue; }
    const r = refinedResult(mesh, exact.bodies, part);
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
    const id = transferFace(ob, of, nb);
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

/** a kernel call that failed or hung: said (a failure once), the faceted (mesh) result stays shown */
function failed(err: unknown) {
  const text = kernelNotice(err, said);
  if (text) useStore.getState().pushMessage(text, 'warn');
}

/** the exact rebuild stopped at the rebuild budget: its bodies lack the features after it, the mesh result stays */
function stoppedOnBudget() {
  failed(new Error(`the exact rebuild stopped after ${Math.round(rebuildBudgetMs / 1000)} s`));
}

async function run() {
  if (busy) {
    again = true;
    // the running exact rebuild is stale: stop it when finishing it would take longer than loading the kernel again
    const { cancelStaleRebuild } = await import('../core/occt/occtClient');
    const d = useStore.getState().doc;
    cancelStaleRebuild(exactMs.get(d?.id ?? d?.name));
    return;
  }
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
      failed(err); /* the mesh parts stay */
    } finally {
      busy = false;
      if (again) { again = false; schedule(); }
    }
    return;
  }
  // Split Lines split the faces after the rebuild: those parts stay on the mesh kernel for now
  // (a document broken on purpose, e.g. the crash-box test, has no feature list: nothing to refine)
  if (!Array.isArray(st.doc.features) || st.doc.features.some((f) => f.type === 'splitLine' && !f.suppressed)) return;
  busy = true;
  try {
    const { refineRebuild } = await import('../core/occt/occtClient');
    const exact = await refineRebuild(st.doc, st.rollbackIndex, rebuildBudgetMs);
    exactMs.set(st.doc.id ?? st.doc.name, exact.ms);
    // a B-rep stopped on the budget is not the whole part: no swap and no cross-check (no false kernel mismatch)
    if (exact.stopped) stoppedOnBudget();
    else apply(sent, exact.bodies);
  } catch (err) {
    failed(err); /* the mesh bodies stay */
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
