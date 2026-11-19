/**
 * The slicer's own tessellation of the exact bodies (docs/35 H-6): the screen and the rebuild keep 0.1 rad; the 3D Print
 * tab asks the OpenCascade worker for the exact bodies of the part at PRINT_ANGULAR_TOLERANCE (0.07 rad), once per
 * rebuild, and uses them on the plate as soon as they are there (until then the screen mesh). A part rebuilt in
 * between makes the late answer void. Assembly components keep the screen mesh of their part.
 */
import { useStore } from '../store';
import { brepEnabled } from '../brepRefine';
import type { RebuildResult } from '../../core/features/rebuild';

const fine = new WeakMap<RebuildResult, Map<string, Float32Array>>();
const asked = new WeakSet<RebuildResult>();

/** the fine mesh of a body of the current rebuild, when it is there */
export function fineMesh(bodyId: string): Float32Array | null {
  return fine.get(useStore.getState().rebuild)?.get(bodyId) ?? null;
}

/** asks once per rebuild for the fine meshes of the exact bodies; `arrived` runs when they are in */
export function requestFineMeshes(arrived: () => void): void {
  const st = useStore.getState(), r = st.rebuild;
  if (st.doc.kind !== 'part' || asked.has(r) || r.pending || !r.bodies.some((b) => b.exact) || !brepEnabled()) return;
  asked.add(r);
  const doc = st.doc;
  void import('../../core/occt/occtClient').then(({ printMeshes }) => printMeshes(doc)).then((bodies) => {
    // the model was rebuilt meanwhile: this answer is for an older part
    if (useStore.getState().rebuild !== r) return;
    const m = new Map<string, Float32Array>();
    for (const b of bodies) if (b.positions && r.bodies.some((x) => x.id === b.id && x.exact)) m.set(b.id, b.positions);
    if (!m.size) return;
    fine.set(r, m);
    arrived();
  }).catch(() => { /* the screen mesh stays; the B-rep kernel says its own failures */ });
}
