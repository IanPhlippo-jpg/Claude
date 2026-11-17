/**
 * The Document Properties and Options that drawings read (0.5.16): auto insert on view creation, the tangent edges of
 * new views, the Detailing display filter, dangling annotations and the model colour of the lines.
 */
import { getPref } from '../prefs';
import type { DrawingNote, DrawingSheet, DrawingSymbol, DrawingView, Document } from '../../core/document/types';
import { newViewTangent } from '../../core/drawing/autoMarks';

const on = (k: string) => getPref(k) !== false;

/** Auto insert on view creation ▸ Center marks-holes / Center marks-fillets */
export const autoMarkOptions = () => ({ holes: on('doc.autoCenterMarks'), fillets: getPref('doc.autoCenterMarksFillets') === true });
/** Auto insert on view creation ▸ Centerlines */
export const autoCenterlinesOn = () => getPref('doc.autoCenterlines') === true;
/** Auto insert on view creation ▸ Balloons (views of an assembly) */
export const autoBalloonsOn = () => getPref('doc.autoBalloons') === true;
/** Options ▸ Drawings ▸ Display Style ▸ Tangent edges in new views */
export const newViewTangentEdges = (): NonNullable<DrawingView['tangentEdges']> => newViewTangent(getPref('drawings.tangentEdges'));
/** Options ▸ Drawings ▸ Performance ▸ Show model in detailed preview when inserting views (off: the view frame only) */
export const detailedPreview = () => on('drawings.perf.detailedPreview');

/** Detailing ▸ Display filter: a type shows when its box is checked, or with Display all types */
const shownType = (k: string) => getPref('doc.detDisplayAll') === true || on(k);
/** Detailing ▸ Display annotations (off: no dimensions, notes or annotation symbols on the sheet) */
const annotationsOn = () => on('doc.displayAnnotations');
/** Detailing ▸ Hide dangling dimensions and annotations */
const hideDangling = () => getPref('doc.hideDanglingDims') === true;

const SYMBOL_FILTER: Partial<Record<DrawingSymbol['kind'], string>> = {
  datum: 'doc.detDatums',
  datumTarget: 'doc.detDatumTargets',
  gtol: 'doc.detGtol',
  surfaceFinish: 'doc.detSurfaceFinish',
  weld: 'doc.detWelds',
};

export function dimensionShown(d: DrawingSheet['dimensions'][number]): boolean {
  if (!annotationsOn() || (d.dangling && hideDangling())) return false;
  // dimensions inserted from the model are feature dimensions, the ones made on the sheet reference dimensions
  return shownType(d.model ? 'doc.detFeatureDims' : 'doc.detRefDims');
}

export function symbolShown(s: DrawingSymbol): boolean {
  // an Area Hatch is no annotation: it stays
  if (s.kind === 'areaHatch') return true;
  if (!annotationsOn() || (s.dangling && hideDangling())) return false;
  const k = SYMBOL_FILTER[s.kind];
  return !k || shownType(k);
}

export const noteShown = (n: DrawingNote): boolean => annotationsOn() && shownType('doc.detNotes') && !!n;
export const centerMarkShown = (m: DrawingSheet['centerMarks'][number]): boolean => !(m.dangling && hideDangling());
/** Display filter ▸ Cosmetic threads */
export const cosmeticThreadsShown = () => shownType('doc.detCosmeticThreads');

/** Use model color for HLR/HLV in drawings: the colour of the part (its appearance, else its material), else black */
export function lineColour(model: Document): string {
  if (getPref('doc.useModelColor') !== true || model.kind === 'assembly') return '#000';
  return model.appearance ?? model.material?.color ?? '#000';
}

/** the colour of a dangling dimension or annotation (by design olive) */
export const DANGLING = '#8a7a1e';
