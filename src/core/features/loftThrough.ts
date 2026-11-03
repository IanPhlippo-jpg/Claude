/**
 * Loft through more than two profiles, and the exact (B-rep) loft (QA 0.5.11, parity row 10, plan P1-4). The profiles
 * are sketchId, sketchId2 and then `profiles` in loft order; Ruled lofts straight from one to the next, smooth runs one
 * surface through all of them, and Close loft (three or more) lofts the last back to the first.
 */
import type * as THREE from 'three';
import type { Document, LoftFeature, PlaneDef } from '../document/types';
import type { Id, Sketch } from '../sketch/types';
import { resolvePlaneDef } from './planes';
import { sketchContourRegions, sketchRegions, type ContourRegion, type Region } from './regions';
import { loftThroughGeometry, LOFT_POLY_SECTIONS } from './sweep';
import type { BrepKernel, BrepShape } from './brepKernel';

/** the profile sketches of a loft in loft order */
export const loftProfileIds = (f: LoftFeature): Id[] => [f.sketchId, f.sketchId2, ...(f.profiles ?? [])].filter((id) => !!id);

/** a centerline or start/end constraints (built by the mesh kernel's loft between two profiles) */
const constrained = (f: LoftFeature) => !!(f.centerline || f.startNormal || f.endNormal || (f.startType && f.startType !== 'normal') || (f.endType && f.endType !== 'normal'));

/** the mesh of a loft through three or more profiles */
export function loftThroughFeature(doc: Document, f: LoftFeature): { geometry: THREE.BufferGeometry | null; error?: string } {
  if (f.face2 || f.guides?.length || constrained(f)) return { geometry: null, error: 'Guide curves, a centerline, start/end constraints and a face as profile work on a loft between two profiles.' };
  const profiles: { region: Region; plane: PlaneDef }[] = [];
  for (const [i, id] of loftProfileIds(f).entries()) {
    const sketch = doc.sketches[id];
    if (!sketch) return { geometry: null, error: `Profile ${i + 1} of the loft no longer exists.` };
    const regions = sketchRegions(sketch);
    if (!regions.length) return { geometry: null, error: `Profile ${i + 1} of the loft has no closed contour.` };
    profiles.push({ region: regions[0], plane: resolvePlaneDef(doc, sketch.plane) });
  }
  const g = loftThroughGeometry(profiles, { ruled: f.ruled, closed: f.closeLoft });
  return g ? { geometry: g } : { geometry: null, error: 'Could not loft through the profiles.' };
}

/** the exact loft (null: the mesh kernel builds it) */
export function loftShape(K: BrepKernel, doc: Document, f: LoftFeature): BrepShape | null {
  if (f.boundary || f.face2 || f.guides?.length || constrained(f)) return null;
  const sections: { sketch: Sketch; plane: PlaneDef; region: ContourRegion }[] = [];
  for (const id of loftProfileIds(f)) {
    const sketch = doc.sketches[id];
    const regions = sketch ? sketchContourRegions(sketch) : [];
    if (!sketch || regions.length !== 1) return null;
    sections.push({ sketch, plane: resolvePlaneDef(doc, sketch.plane), region: regions[0] });
  }
  if (sections.length < 2) return null;
  const closed = !!f.closeLoft && sections.length >= 3;
  // more sections than one polynomial takes: OpenCascade pieces the smooth surface together otherwise than the mesh kernel
  if (!f.ruled && sections.length + (closed ? 1 : 0) > LOFT_POLY_SECTIONS) return null;
  return K.loft(sections, { ruled: f.ruled, closed });
}
