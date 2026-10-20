import type { Id, Sketch } from '../sketch/types';

export type Units = 'mm' | 'cm' | 'm' | 'in';

/** Feature-history entry. Phase 1 only has sketches; later phases add solid features. */
export interface SketchFeature {
  id: Id;
  type: 'sketch';
  name: string;
  sketchId: Id;
  suppressed: boolean;
}
export type Feature = SketchFeature;

export interface Document {
  version: 1;
  name: string;
  units: Units;
  sketches: Record<Id, Sketch>;
  features: Feature[];
  /** parametric variables (phase 3) */
  variables: Record<string, number>;
}

export function createDocument(name = 'Part1'): Document {
  return { version: 1, name, units: 'mm', sketches: {}, features: [], variables: {} };
}
