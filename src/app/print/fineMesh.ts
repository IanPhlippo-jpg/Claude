/**
 * The slicer's own tessellation of the exact bodies (docs/35 H-6): the screen and the rebuild keep 0.1 rad; the 3D Print
 * tab asks the OpenCascade worker for the exact bodies at PRINT_ANGULAR_TOLERANCE (0.07 rad), once per rebuild of a
 * part, and uses them on the plate as soon as they are there (until then the screen mesh). For an assembly the same
 * for the part of every component (its configuration included). A part rebuilt in between makes a late answer void.
 */
import { useStore } from '../store';
import { brepEnabled } from '../brepRefine';
import { partRebuild } from '../../core/assembly/assembly';
import { documentForConfiguration } from '../../core/document/configurations';
import type { Document } from '../../core/document/types';
import type { RebuildResult } from '../../core/features/rebuild';

const fine = new WeakMap<RebuildResult, Map<string, Float32Array>>();
const asked = new WeakSet<RebuildResult>();

/** the fine mesh of a body of a rebuild (the open part's by default), when it is there */
export function fineMesh(bodyId: string, r: RebuildResult = useStore.getState().rebuild): Float32Array | null {
  return fine.get(r)?.get(bodyId) ?? null;
}

/** one part: asked once per rebuild result; `current` says whether the answer still belongs to the model */
function ask(doc: Document, r: RebuildResult, current: () => boolean, arrived: () => void) {
  if (asked.has(r) || r.pending || !r.bodies.some((b) => b.exact)) return;
  asked.add(r);
  void import('../../core/occt/occtClient').then(({ printMeshes }) => printMeshes(doc)).then((bodies) => {
    if (!current()) return;
    const m = new Map<string, Float32Array>();
    for (const b of bodies) if (b.positions && r.bodies.some((x) => x.id === b.id && x.exact)) m.set(b.id, b.positions);
    if (!m.size) return;
    fine.set(r, m);
    arrived();
  }).catch(() => { /* the screen mesh stays; the B-rep kernel says its own failures */ });
}

/** asks for the fine meshes of the open part, or of the parts of the open assembly; `arrived` runs when some are in */
export function requestFineMeshes(arrived: () => void): void {
  const st = useStore.getState();
  if (!brepEnabled()) return;
  if (st.doc.kind === 'part') {
    const r = st.rebuild;
    ask(st.doc, r, () => useStore.getState().rebuild === r, arrived);
    return;
  }
  if (st.doc.kind !== 'assembly') return;
  for (const c of (st.doc.components ?? []).filter((x) => !x.suppressed && !x.hidden && x.part.kind !== 'assembly' && x.part.kind !== 'drawing')) {
    const doc = documentForConfiguration(c.part, c.configuration), r = partRebuild(doc);
    ask(doc, r, () => partRebuild(doc) === r, arrived);
  }
}
