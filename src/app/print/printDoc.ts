/**
 * The parts of the 3D Print plates and the open model (docs/35 P2-8, P2-12): every part keeps where its mesh comes
 * from (the part, one body, a component, the assembly), so
 *   - after a rebuild the mesh is taken again and a changed part makes the slice stale;
 *   - the plates are stored in the document (file format 4) without meshes, and come back from the model on open.
 */
import type { BufferGeometry } from 'three';
import { useStore } from '../store';
import { componentBody, componentMatrix, partRebuild } from '../../core/assembly/assembly';
import { documentForConfiguration } from '../../core/document/configurations';
import { meshHash, newItemId } from '../../print/plate';
import { transformPositions } from '../../print/mesh';
import type { ItemSource, Plate, PlateItem, PrintDocData } from '../../print/types';

const posOf = (g: BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; return new Float32Array(n.getAttribute('position').array as ArrayLike<number>); };
const join = (parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of parts) { out.set(a, o); o += a.length; }
  return out;
};

/** the mesh (CAD coordinates) of a source in the open document, or null when the model no longer has it */
export function positionsFor(source: ItemSource): Float32Array | null {
  const st = useStore.getState();
  if (st.doc.kind === 'assembly') {
    const comps = (st.doc.components ?? []).filter((c) => !c.suppressed && !c.hidden);
    const meshOf = (c: (typeof comps)[number]) => {
      const body = componentBody(partRebuild(documentForConfiguration(c.part, c.configuration)));
      return body ? transformPositions(posOf(body.geometry), Array.from(componentMatrix(c).elements)) : null;
    };
    if (source.kind === 'component') { const c = comps.find((x) => x.id === source.id); return c ? meshOf(c) : null; }
    if (source.kind === 'assembly') { const all = comps.map(meshOf).filter((m): m is Float32Array => !!m); return all.length ? join(all) : null; }
    return null;
  }
  const bodies = st.rebuild.bodies.filter((b) => !(st.rebuild.autoHidden ?? []).includes(b.id));
  if (source.kind === 'part') return bodies.length ? join(bodies.map((b) => posOf(b.geometry))) : null;
  if (source.kind === 'body') return bodies[source.index] ? posOf(bodies[source.index].geometry) : null;
  return null;
}

/** what Add to Plate puts on the plate: name, mesh and source */
export function sourcesToAdd(mode: 'part' | 'bodies' | 'components' | 'assembly'): { name: string; positions: Float32Array; source: ItemSource }[] {
  const st = useStore.getState();
  if (st.doc.kind === 'assembly') {
    if (mode === 'assembly') { const p = positionsFor({ kind: 'assembly' }); return p ? [{ name: st.doc.name, positions: p, source: { kind: 'assembly' } }] : []; }
    return (st.doc.components ?? []).filter((c) => !c.suppressed && !c.hidden).flatMap((c) => {
      const p = positionsFor({ kind: 'component', id: c.id });
      return p ? [{ name: c.name ?? c.part.name, positions: p, source: { kind: 'component', id: c.id } as ItemSource }] : [];
    });
  }
  const bodies = st.rebuild.bodies.filter((b) => !(st.rebuild.autoHidden ?? []).includes(b.id));
  if (mode === 'bodies') return bodies.map((b, i) => ({ name: `${st.doc.name} body ${i + 1}`, positions: posOf(b.geometry), source: { kind: 'body', index: i } as ItemSource }));
  const p = positionsFor({ kind: 'part' });
  return p ? [{ name: st.doc.name, positions: p, source: { kind: 'part' } }] : [];
}

/** the parts whose mesh changed in the model get the new mesh (same placement); returns null when nothing changed */
export function refreshPlates(plates: Plate[]): Plate[] | null {
  let changed = false;
  const out = plates.map((pl) => ({ ...pl, items: pl.items.map((it) => {
    if (!it.source || it.source.kind === 'mesh') return it;
    const p = positionsFor(it.source);
    if (!p) return it;
    const h = meshHash(p);
    if (h === it.hash) return it;
    changed = true;
    return { ...it, positions: p, hash: h };
  }) }));
  return changed ? out : null;
}

/** the plates as the document stores them */
export function toDocData(plates: Plate[], printerId: string, nozzle: number): PrintDocData {
  return { printerId, nozzle, plates: plates.map((p) => ({ name: p.name, items: p.items.filter((it) => it.source).map((it) => ({ name: it.name, source: it.source!, matrix: it.matrix.slice(),
    filament: it.filament })) })) };
}

/** the plates of a document, the meshes taken from the model (parts whose source is gone are left out) */
export function fromDocData(d: PrintDocData): { plates: Plate[]; missing: number } {
  let missing = 0;
  const plates = d.plates.map((p, i) => ({ id: `plate${i + 1}`, name: p.name, items: p.items.flatMap((it): PlateItem[] => {
    const pos = positionsFor(it.source);
    if (!pos) { missing++; return []; }
    return [{ id: newItemId(), name: it.name, positions: pos, matrix: it.matrix.slice(), filament: it.filament, source: it.source, hash: meshHash(pos) }];
  }) }));
  return { plates: plates.length ? plates : [{ id: 'plate1', name: 'Plate 1', items: [] }], missing };
}

/** writes the plates into the open document (marks it unsaved; no undo step: the plate has its own undo) */
export function saveToDocument(plates: Plate[], printerId: string, nozzle: number): void {
  const st = useStore.getState();
  if (st.doc.kind === 'drawing') return;
  const data = toDocData(plates, printerId, nozzle);
  const empty = !data.plates.some((p) => p.items.length);
  if (empty && !st.doc.print3d) return;
  if (JSON.stringify(st.doc.print3d ?? null) === JSON.stringify(empty ? null : data)) return;
  const { print3d: _old, ...rest } = st.doc;
  void _old;
  useStore.setState({ doc: empty ? rest : { ...st.doc, print3d: data }, dirty: true });
}
