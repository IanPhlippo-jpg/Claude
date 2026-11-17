/**
 * Body id migration (QA 0.5.14 P1-3). Up to format 2 a body was named `body<N>` after the order in which the
 * rebuild made it (a surface body `surf<N>`); from format 3 it is named after the feature that made it
 * (`<featureId>#<k>`, bodyIds.ts).
 * A document that still refers to old names (Feature Scope, hidden bodies, appearances, materials, Combine,
 * Move/Copy, face and edge ids, labels …) is rebuilt once with the old naming; that rebuild says which new id
 * every old name belongs to, and the references are rewritten with it. Nested documents (the parts of an
 * assembly, the models of drawing views) are migrated on their own when they are validated.
 */
import type { Document } from './types';
import { rebuildDocument } from '../features/rebuild';
import { legacyBodyIds } from '../features/bodyIds';

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const isDoc = (v: unknown): v is Raw => isObj(v) && Array.isArray(v.features) && isObj(v.sketches);

/** an old body name as a whole word: "body2", "body2:5" (face), "Face<1>@body2" (label), "surf1" (a surface body,
 * e.g. the surface of an Intersect); not "body2#0" or "body25" */
const OLD_NAME = /(^|[^A-Za-z0-9_])(body\d+|surf\d+)(?![A-Za-z0-9_#])/g;
const mayHold = (s: string) => s.includes('body') || s.includes('surf');
/** texts the user typed and embedded data are never rewritten */
const SKIP = new Set(['name', 'text', 'description', 'author', 'expression', 'image', 'positions', 'source']);

/** every string value and key of the document (nested documents left out) passes through `fix` */
function rewrite(node: unknown, fix: (s: string) => string, root: Raw): unknown {
  if (typeof node === 'string') return fix(node);
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = rewrite(node[i], fix, root);
    return node;
  }
  if (!isObj(node) || (node !== root && isDoc(node))) return node;
  for (const k of Object.keys(node)) {
    if (SKIP.has(k)) continue;
    const value = rewrite(node[k], fix, root);
    const nk = fix(k);
    if (nk !== k && !(nk in node)) {
      delete node[k];
      node[nk] = value;
    } else node[k] = value;
  }
  return node;
}

/**
 * Rewrites the old body names of a part document in place. Returns the names it could not place (a reference to
 * a body that the rebuild no longer makes keeps its old name, as it pointed to nothing before either).
 */
export function migrateBodyIds(d: Raw): string[] {
  if (d.kind === 'assembly' || d.kind === 'drawing' || !Array.isArray(d.features)) return [];
  const used = new Set<string>();
  rewrite(d, (s) => {
    if (mayHold(s)) for (const m of s.matchAll(OLD_NAME)) used.add(m[2]);
    return s;
  }, d);
  // a feature whose own id looks like an old name is not a body reference
  for (const f of d.features as Raw[]) if (isObj(f)) used.delete(f.id as string);
  if (!used.size) return [];
  let map: Map<string, string>;
  try {
    map = legacyBodyIds(() => rebuildDocument(d as unknown as Document));
  } catch {
    return [...used];
  }
  const renamed = (all: string, pre: string, old: string) => (used.has(old) && map.has(old) ? pre + map.get(old) : all);
  rewrite(d, (s) => (mayHold(s) ? s.replace(OLD_NAME, renamed) : s), d);
  return [...used].filter((n) => !map.has(n));
}
