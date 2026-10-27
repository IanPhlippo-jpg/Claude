import type { Document, Feature } from '../document/types';

type Id = string;

/**
 * Reorder in the design tree (QA v0.5.1 F113): a feature dragged below another feature. The feature takes its
 * absorbed sketches along (the sketches only it uses, shown under it in the tree). A move that would put a feature
 * above something it uses (its parent) or below something that uses it (its child) is not allowed, as the intended
 * design shows with the no-drop cursor.
 */
export interface ReorderResult {
  features?: Feature[];
  /** why the move is not allowed */
  error?: string;
}

const sketchIds = (f: Feature): Id[] => {
  const r = f as unknown as Record<string, unknown>;
  return [r.sketchId, r.pathSketchId, r.sketchId2, ...((r.guides as unknown[] | undefined) ?? [])].filter((x): x is Id => typeof x === 'string' && !!x);
};

/** the feature and the sketch features that only it uses */
export function reorderGroup(doc: Document, id: Id): Id[] {
  const f = doc.features.find((x) => x.id === id);
  if (!f) return [];
  if (f.type === 'sketch') return [id];
  const own = sketchIds(f).filter((sid) => !doc.features.some((x) => x.id !== id && x.type !== 'sketch' && sketchIds(x).includes(sid)));
  return doc.features.filter((x) => x.id === id || (x.type === 'sketch' && own.includes(x.sketchId))).map((x) => x.id);
}

/** the text a feature names its parents in; a sketch names its plane (its entity ids are no references) */
const refText = (doc: Document, f: Feature) => JSON.stringify(f) + (f.type === 'sketch' ? JSON.stringify(doc.sketches[f.sketchId]?.plane ?? '') : '');
const keysOf = (f: Feature): Id[] => (f.type === 'sketch' ? [f.id, f.sketchId] : [f.id]);
const uses = (doc: Document, child: Feature, parent: Feature) => {
  const t = refText(doc, child);
  return keysOf(parent).some((k) => t.includes(`"${k}"`));
};

/** the features with `id` (and its absorbed sketches) moved right below `afterId` (null: to the top) */
export function reorderFeatures(doc: Document, id: Id, afterId: Id | null): ReorderResult {
  const group = reorderGroup(doc, id);
  if (!group.length) return { error: 'The feature no longer exists.' };
  if (afterId && group.includes(afterId)) return { error: 'A feature cannot be moved below itself.' };
  const moving = doc.features.filter((x) => group.includes(x.id));
  const rest = doc.features.filter((x) => !group.includes(x.id));
  const at = afterId ? rest.findIndex((x) => x.id === afterId) + 1 : 0;
  if (afterId && at === 0) return { error: 'The target feature no longer exists.' };
  const features = [...rest.slice(0, at), ...moving, ...rest.slice(at)];
  const main = moving.find((x) => x.id === id)!;
  for (const m of moving) {
    const i = features.indexOf(m);
    const parent = features.slice(i + 1).find((p) => !group.includes(p.id) && uses(doc, m, p));
    if (parent) return { error: `${main.name} cannot be moved above ${parent.name}: ${main.name} is a child of ${parent.name}.` };
    const child = features.slice(0, i).find((c) => !group.includes(c.id) && uses(doc, c, m));
    if (child) return { error: `${main.name} cannot be moved below ${child.name}: ${child.name} is a child of ${main.name}.` };
  }
  return { features };
}
