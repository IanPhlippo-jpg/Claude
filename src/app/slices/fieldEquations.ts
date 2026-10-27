import type { Document } from '../../core/document/types';
import { featureDimensionNames } from '../../core/document/equations';
import { newId } from '../../core/sketch/model';
import type { FeatureEdit } from '../store';

/**
 * Equations typed in a Property Panel value field ("= "Width" / 2"), as the intended design: the dimension the field
 * edits (D1@Boss-Extrude1) is driven by the equation once the feature is committed.
 */

// an equation just committed in a value field: the draft change that follows in the same task is driven by it
let pendingEquation: string | null = null;
export function notePendingEquation(expression: string): void {
  pendingEquation = expression;
  queueMicrotask(() => { pendingEquation = null; });
}

/** the equations of a draft after a change: the edited dimension gets the pending equation; a plain value typed
 *  over an equation-driven dimension removes its equation ('') */
export function draftEquations(fe: FeatureEdit, draft: FeatureEdit['draft'], patch: Record<string, unknown>, doc: Document): FeatureEdit['equations'] {
  let equations = fe.equations;
  for (const dim of featureDimensionNames(draft)) {
    if (!(dim.prop.split('.')[0] in patch)) continue;
    const before = featureDimensionNames(fe.draft).find((x) => x.prop === dim.prop);
    if (pendingEquation !== null) equations = { ...equations, [dim.prop]: pendingEquation };
    else if (before?.value !== dim.value && (equations?.[dim.prop] || doc.equations.some((e) => e.target === dim.name))) equations = { ...equations, [dim.prop]: '' };
  }
  pendingEquation = null;
  return equations;
}

/** the document's equations with those typed in the panel of a committed feature */
export function withFieldEquations(doc: Document, fe: FeatureEdit): Document {
  if (!fe.equations) return doc;
  const names = featureDimensionNames(fe.draft).filter((n) => n.prop in fe.equations!);
  const targets = new Set(names.map((n) => n.name));
  const add = names.filter((n) => fe.equations![n.prop]).map((n) => ({ id: newId('eq'), target: n.name, expression: fe.equations![n.prop] }));
  return { ...doc, equations: [...doc.equations.filter((e) => !targets.has(e.target)), ...add] };
}
