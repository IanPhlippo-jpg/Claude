// Plastic part features (QA v0.5.1 F121): Dome, Indent and the fastening features Mounting Boss, Snap Hook and
// Lip/Groove. Kept apart from types.ts (line budget); part of the Feature union there.
import type { Id } from '../sketch/types';

type V3 = [number, number, number];
/** a planar face by its normal and a point on it (its centroid when picked), with the name shown in the panel */
export interface PickedFace { normal: V3; point: V3; label: string }

/** Insert ▸ Features ▸ Dome: a dome on a planar face. */
export interface DomeFeature {
  id: Id;
  type: 'dome';
  name: string;
  suppressed: boolean;
  face: PickedFace | null;
  /** height of the dome above the face (0 on a round face: a half sphere) */
  distance: number;
  /** a dome into the body instead of out of it */
  reverse?: boolean;
  /** round faces: a half ellipsoid with the distance as its height, instead of a sphere segment */
  elliptical?: boolean;
  /** polygon faces (not four-sided): the dome rises evenly from every edge instead of straight up from the edges */
  continuous?: boolean;
}

/** Insert ▸ Features ▸ Indent: the target body wraps around a tool body, with a clearance and a wall thickness. */
export interface IndentFeature {
  id: Id;
  type: 'indent';
  name: string;
  suppressed: boolean;
  target: Id | null;
  tool: Id | null;
  /** wall thickness of the indent */
  thickness: number;
  /** gap between the tool body and the indent */
  clearance: number;
  /** Cut: only the tool (with its clearance) is removed from the target, no wall is added */
  cut: boolean;
}

/** Insert ▸ Fastening Feature ▸ Mounting Boss: a boss with a hole or pin and fins, standing on a planar face. */
export interface MountingBossFeature {
  id: Id;
  type: 'mountingBoss';
  name: string;
  suppressed: boolean;
  plane: string;
  point: { x: number; y: number };
  label: string;
  /** Hardware boss (a screw: head side or thread side) or pin boss (a pin, or the hole it goes in) */
  bossType: 'hardware' | 'pin';
  hardware: 'head' | 'thread';
  pin: 'pin' | 'hole';
  height: number;
  diameter: number;
  /** draft of the boss wall, degrees */
  draft: number;
  /** hole (or pin) diameter and depth (or pin height) */
  holeDiameter: number;
  holeDepth: number;
  holeDraft: number;
  fins: number;
  finLength: number;
  finHeight: number;
  finWidth: number;
  /** direction of the first fin in the face, degrees from the face's first axis */
  finAngle: number;
}

/** Insert ▸ Fastening Feature ▸ Snap Hook: a cantilever with a hook lip, standing on a planar face. */
export interface SnapHookFeature {
  id: Id;
  type: 'snapHook';
  name: string;
  suppressed: boolean;
  plane: string;
  point: { x: number; y: number };
  label: string;
  /** direction of the hook overhang in the face, degrees from the face's first axis */
  angle: number;
  height: number;
  thickness: number;
  width: number;
  lipHeight: number;
  overhang: number;
}

/** Insert ▸ Fastening Feature ▸ Lip/Groove: a lip on the rim of one body and the matching groove in the other. */
export interface LipGrooveFeature {
  id: Id;
  type: 'lipGroove';
  name: string;
  suppressed: boolean;
  /** the rim face that gets the lip, and the rim face that gets the groove */
  lipFace: PickedFace | null;
  grooveFace: PickedFace | null;
  width: number;
  height: number;
  /** extra width and depth of the groove */
  clearance: number;
}

export type PlasticsFeature = DomeFeature | IndentFeature | MountingBossFeature | SnapHookFeature | LipGrooveFeature;
export const PLASTICS_TYPES = ['dome', 'indent', 'mountingBoss', 'snapHook', 'lipGroove'] as const;
export const isPlasticsFeature = (f: { type: string }): f is PlasticsFeature => (PLASTICS_TYPES as readonly string[]).includes(f.type);
