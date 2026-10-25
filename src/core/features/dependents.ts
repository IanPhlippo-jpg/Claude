import type { Document, Feature } from '../document/types';

type Id = string;

/** Items the Confirm Delete dialog lists for a feature: its children (features that use it) and the
 *  absorbed sketch (the sketch only this feature consumes). */
export interface DeleteDependents {
  children: Feature[];
  absorbed: Feature[];
}

const sketchOf = (f: Feature): Id | undefined => ('sketchId' in f ? (f as { sketchId?: Id }).sketchId : undefined);

/** Children by reference: later features whose data names the feature (or its sketch), transitively. */
export function featureDependents(doc: Document, id: Id): DeleteDependents {
  const idx = doc.features.findIndex((f) => f.id === id);
  if (idx < 0) return { children: [], absorbed: [] };
  const f = doc.features[idx];
  const absorbed: Feature[] = [];
  const sid = sketchOf(f);
  if (f.type !== 'sketch' && sid) {
    const sf = doc.features.find((x) => x.type === 'sketch' && x.sketchId === sid);
    const shared = doc.features.some((x) => x.id !== f.id && x.type !== 'sketch' && sketchOf(x) === sid);
    if (sf && !shared) absorbed.push(sf);
  }
  const keys = new Set<string>([id]);
  if (f.type === 'sketch') keys.add(f.sketchId);
  const children: Feature[] = [];
  for (const x of doc.features.slice(idx + 1)) {
    if (absorbed.includes(x)) continue;
    const json = JSON.stringify(x);
    let hit = false;
    for (const k of keys) if (json.includes(`"${k}"`)) { hit = true; break; }
    if (!hit) continue;
    children.push(x);
    keys.add(x.id);
    if (x.type === 'sketch') keys.add(x.sketchId);
  }
  return { children, absorbed };
}

interface TrialBody { faces: { normal: [number, number, number]; centroid: [number, number, number]; curved: boolean }[] }

/** Children by geometry: later features that rebuild fine now but fail once the feature (and the given
 *  children) are gone, e.g. a fillet on the edges of the deleted extrusion, and sketches on one of its faces
 *  (with the features built on them). */
export function geometricChildren(doc: Document, removed: Set<Id>, errorsBefore: Record<Id, string>, rebuild: (d: Document) => { errors: Record<Id, string>; bodies: TrialBody[] }): Feature[] {
  const first = doc.features.findIndex((f) => removed.has(f.id));
  if (first < 0) return [];
  const later = doc.features.slice(first + 1).filter((x) => !removed.has(x.id));
  if (!later.length) return [];
  const r = rebuild({ ...doc, features: doc.features.filter((x) => !removed.has(x.id)) });
  const out: Feature[] = [];
  const gone = new Set<Id>();
  // a sketch on a face plane loses its face when no flat face of the trial bodies lies in that plane
  const faces = r.bodies.flatMap((b) => b.faces.filter((f) => !f.curved));
  for (const x of later) {
    if (x.type !== 'sketch') continue;
    const sk = doc.sketches[x.sketchId];
    const pl = sk && typeof sk.plane === 'string' ? doc.planes?.[sk.plane] : undefined;
    if (!pl || pl.kind !== 'face') continue;
    const onPlane = faces.some((f) => {
      const dot = f.normal[0] * pl.n[0] + f.normal[1] * pl.n[1] + f.normal[2] * pl.n[2];
      const d = (f.centroid[0] - pl.origin[0]) * pl.n[0] + (f.centroid[1] - pl.origin[1]) * pl.n[1] + (f.centroid[2] - pl.origin[2]) * pl.n[2];
      return Math.abs(dot) > 0.999 && Math.abs(d) < 1e-3;
    });
    if (!onPlane) { out.push(x); gone.add(x.sketchId); }
  }
  for (const x of later) {
    if (x.type === 'sketch' || out.includes(x)) continue;
    const sid = sketchOf(x);
    if ((sid && gone.has(sid)) || (r.errors[x.id] && !errorsBefore[x.id])) out.push(x);
  }
  return out;
}
