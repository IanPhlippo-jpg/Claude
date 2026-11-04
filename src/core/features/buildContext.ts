// What rebuildDocument (rebuild.ts) hands to the feature modules that were split off from it for its line budget
// (sheetMetalBuild, frameBuild, surfaceBuild; QA 0.5.11 F134): the containers of the rebuild and its closures, the
// same objects for every feature, and the state of the sheet metal base that the sheet metal features share.
import type * as THREE from 'three';
import type { Document } from '../document/types';
import type { Id } from '../sketch/types';
import type { BrepKernel, BrepShape } from './brepKernel';
import type { Body, RebuildResult } from './rebuild';
import type { BuildHistory } from './shell';
import type { SplitRegions } from './splitline';
import type { resolvePlaneDef } from './planes';

export interface BuildContext {
  doc: Document;
  bodies: Body[];
  errors: Record<Id, string>;
  warnings: Record<Id, string>;
  consumedSketches: Set<Id>;
  curves: NonNullable<RebuildResult['curves']>;
  surfaceBodies: Body[];
  /** Split Lines per body: the faces are split after the faces are found */
  splits: Map<Id, SplitRegions[]>;
  /** what the body is made of, for the shell (added material and the tools of every cut) */
  history: BuildHistory;
  bodyMeta: NonNullable<RebuildResult['bodyMeta']>;
  bendCounts: Record<Id, number>;
  hiddenIds: Set<Id>;
  autoHidden: Id[];
  /** exact shapes with a faceted part (a wrapped patch): kept for STEP, not called exact */
  approxBodies: Set<Body>;
  K: BrepKernel | null;
  /** boss material: merge into the bodies it touches (several touching bodies become one), else a new body */
  addMaterial: (tool: THREE.BufferGeometry, fid: Id, merge: boolean, scope?: Id[], toolShape?: BrepShape | null) => void;
  /** cut material: subtract from the bodies the tool touches (Feature Scope, else Auto-select) */
  removeMaterial: (tool: THREE.BufferGeometry, fid: Id, scope?: Id[], toolShape?: BrepShape | null) => boolean;
  addBoss: (g: THREE.BufferGeometry) => void;
  newBody: (g: THREE.BufferGeometry, fid: Id, shape?: BrepShape | null) => Body;
  /** the B-rep solid of a body, when its geometry is still the tessellation of that solid */
  exactOf: (b: Body | undefined) => BrepShape | null;
  setExact: (b: Body, shape: BrepShape) => void;
  visibleBodies: () => Body[];
  isEmpty: (g: THREE.BufferGeometry) => boolean;
  /** the sheet metal base (for the flat pattern): the open chain, its plane and the flange extensions */
  sheet: { chain: { x: number; y: number }[]; plane: ReturnType<typeof resolvePlaneDef>; depth: number; midPlane: boolean; extensions: number[]; reverse: boolean; bentOnly: boolean } | null;
  /** Unfold … Fold: the body is flat in between */
  unfolded: boolean;
}
