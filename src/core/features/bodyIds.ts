/**
 * Stable body ids (QA 0.5.14 P1-3). A body is named after the feature that made it plus its number within that
 * feature: `<featureId>#<k>` (k from 0). Inserting a body-making feature earlier in the tree no longer renames the
 * bodies after it, so Feature Scope, hidden bodies, appearances and materials stay on the same body.
 *
 * Surface bodies are named the same way (they were `surf<N>`, N their place in the list of surface bodies).
 *
 * Files of format 2 and older named bodies `body<N>` in creation order over the whole tree. `legacyBodyIds` runs a
 * rebuild that still hands out those old names and records which new id each one belongs to (the migration in
 * document/migrate.ts rewrites the references with it).
 */
import type { Id } from '../sketch/types';

/** between the feature id and the body number; feature ids are alphanumeric, and ':' / '~' / '@' are taken by
 * face ids (`<bodyId>:3`), edge ids (`<bodyId>:e2~1`) and face labels (`Face<1>@<bodyId>`) */
export const BODY_ID_SEP = '#';
export const bodyIdOf = (featureId: Id, k: number): Id => `${featureId}${BODY_ID_SEP}${k}`;

let legacyRun: Map<string, Id> | null = null;

/** the body names of one rebuild */
export interface BodyNamer {
  /** a solid body: call it with the id of the feature that makes the body */
  (featureId: Id): Id;
  /** a surface body: the same `<featureId>#<k>` names (a legacy run hands out the old `surf<count + 1>`) */
  surface(featureId: Id, count: number): Id;
  /** the numbers handed out per feature so far (the rebuild cache keeps them with each state) */
  numbers(): Map<Id, number>;
}

/** the names of one rebuild; `from`: the numbers handed out before (a rebuild that goes on from a kept state) */
export function bodyNamer(from?: Map<Id, number>): BodyNamer {
  const perFeature = new Map<Id, number>(from ?? []);
  // only the outermost rebuild of a legacy run uses the old names; a rebuild nested in it names as usual
  const legacy = legacyRun;
  legacyRun = null;
  let seq = 0;
  const next = (fid: Id) => {
    const k = perFeature.get(fid) ?? 0;
    perFeature.set(fid, k + 1);
    return bodyIdOf(fid, k);
  };
  const named = (fid: Id): Id => {
    const id = next(fid);
    if (!legacy) return id;
    const old = `body${++seq}`;
    legacy.set(old, id);
    return old;
  };
  named.surface = (fid: Id, count: number): Id => {
    const id = next(fid);
    if (!legacy) return id;
    // format 2 named a surface body after its place in the list of surface bodies at the time
    const old = `surf${count + 1}`;
    legacy.set(old, id);
    return old;
  };
  named.numbers = () => new Map(perFeature);
  return named;
}

/** a legacy run is about to start: that rebuild names with the old names and must not use or fill the rebuild cache */
export const legacyNaming = (): boolean => legacyRun !== null;

/** runs `rebuild` with the old creation-order names; the result maps every old name (body1 …, surf1 …) to the new id */
export function legacyBodyIds(rebuild: () => void): Map<string, Id> {
  const map = new Map<string, Id>();
  legacyRun = map;
  try {
    rebuild();
  } finally {
    legacyRun = null;
  }
  return map;
}
