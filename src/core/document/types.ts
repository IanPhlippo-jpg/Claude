import type { Id, Sketch } from '../sketch/types';
import type { Equation } from './equations';
import type { Configuration } from './configurations';
import type { SheetMetalParams, FlangeLengthMode, FlangePosition, HemType } from '../features/sheetmetal';
import type { EdgeRef } from '../features/edgesets';

export type Units = 'mm' | 'cm' | 'm' | 'in';

/** Feature-history entries: sketches (phase 1) and solid features (phase 2). */
export interface SketchFeature {
  id: Id;
  type: 'sketch';
  name: string;
  sketchId: Id;
  suppressed: boolean;
}

/** Direction 1 / 2 end conditions (Up To Vertex / Up To Body are not available yet) */
export type EndCondition = 'blind' | 'midPlane' | 'throughAll' | 'throughAllBoth' | 'upToNext' | 'upToVertex' | 'upToSurface' | 'offsetFromSurface' | 'upToBody';

/** Extruded Boss/Base or Extruded Cut of the closed regions of a sketch. */
export interface ExtrudeFeature {
  /** From: the extrusion starts at the sketch plane (default) or at this offset from it */
  fromOffset?: number;
  fromReverse?: boolean;
  id: Id;
  type: 'extrude';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  op: 'boss' | 'cut';
  /** Direction 1 */
  end: EndCondition;
  depth: number;
  /** flip direction 1 (along -normal of the sketch plane) */
  reverse: boolean;
  /** Direction 2 (optional second extrusion the other way) */
  direction2?: { end: EndCondition; depth: number; /** Up To Vertex / Up To Surface (+ offset) of direction 2 */ vertex?: { point: [number, number, number]; label: string }; surface?: { normal: [number, number, number]; point: [number, number, number]; label: string }; offset?: number };
  /** Draft On/Off: the walls taper by this angle (degrees), inward unless outward */
  draft?: { angle: number; outward: boolean };
  /** Merge result (boss): false keeps the new material as a separate body */
  merge?: boolean;
  /** Feature Scope: the bodies this feature works on (absent = Auto-select among the visible bodies) */
  scope?: Id[];
  /** Up To Surface / Offset From Surface: the planar face the extrusion ends at */
  surface?: { normal: [number, number, number]; point: [number, number, number]; label: string };
  /** Up To Vertex: the model point the extrusion ends at (depth along the sketch normal) */
  vertex?: { point: [number, number, number]; label: string };
  /** Extruded Cut ▸ Flip side to cut: remove the material outside the profile (within the depth) */
  flipSide?: boolean;
  /** Up To Body: the solid body the extrusion runs into (its near side shapes the end) */
  upToBody?: { bodyId: Id; label: string };
  /** Offset From Surface: distance before the surface (Reverse offset = past it) */
  offset?: number;
  reverseOffset?: boolean;
  /** Offset From Surface > Translate surface: the offset is measured along the extrusion, not along the face normal */
  translateSurface?: boolean;
  /** Selected Contours: indices of the sketch regions to use (absent = all closed contours) */
  contours?: number[];
  /** Thin Feature: the profile (open or closed) becomes a wall of this thickness; Auto-fillet corners rounds its corners */
  thin?: { mode: 'one' | 'mid' | 'two'; thickness: number; thickness2?: number; reverse?: boolean; autoFillet?: number };
}

/** Sheet Metal ▸ Base Flange/Tab: an open sketch becomes a bent sheet (closed sketch: a flat tab). */
export interface BaseFlangeFeature {
  id: Id;
  type: 'baseFlange';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  depth: number;
  midPlane: boolean;
  /** material on the other side of the sketch */
  reverse: boolean;
  /** extrude the other way (Direction 1 reverse) */
  flipDir: boolean;
  merge?: boolean;
}

/** Sheet Metal ▸ Edge Flange: a bend and a straight leg along a straight edge of the sheet. */
export interface EdgeFlangeFeature {
  id: Id;
  type: 'edgeFlange';
  name: string;
  suppressed: boolean;
  edge: EdgeRef | null;
  angle: number;
  length: number;
  lengthMode: FlangeLengthMode;
  position: FlangePosition;
  flip: boolean;
  /** Use default radius off: the bend radius of this flange */
  radius?: number;
  /** Edit Flange Profile offsets, Gap distance, Trim side bends, position Offset, angle against a face, Up To Vertex */
  startOffset?: number;
  endOffset?: number;
  gap?: number;
  trimSideBends?: boolean;
  offset?: number;
  angleFace?: { normal: [number, number, number]; mode: 'perpendicular' | 'parallel'; label: string };
  lengthEnd?: 'blind' | 'upToVertex';
  vertex?: { point: [number, number, number]; label: string };
  /** Custom Bend Allowance / Custom Relief Type of this flange */
  customAllowance?: { type: 'kFactor' | 'bendAllowance' | 'bendDeduction' | 'bendTable'; value: number };
  customRelief?: { type: 'rectangle' | 'tear' | 'obround'; ratio: number };
}

/** 3D Sketch: lines in space (drawn on the XY / YZ / ZX plane through the last point, Tab switches). */
export interface Sketch3DFeature {
  id: Id;
  type: 'sketch3d';
  name: string;
  suppressed: boolean;
  segments: [[number, number, number], [number, number, number]][];
}

/** Sheet Metal ▸ Miter Flange: an open profile swept along a chain of sheet edges, mitered at the corners. */
export interface MiterFlangeFeature {
  id: Id;
  type: 'miterFlange';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  edges: EdgeRef[];
  /** material on the other side of the profile */
  reverse: boolean;
  /** Rip gap between neighbouring flanges */
  gap: number;
  /** Use default radius off: this radius; Start/End Offset: the flange stops short of the chain's ends */
  radius?: number;
  startOffset?: number;
  endOffset?: number;
}

/** Sheet Metal ▸ Jog: a sketch line on the sheet; one side is offset with two bends. */
export interface JogFeature {
  id: Id;
  type: 'jog';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  /** Jog Offset (outside offset) */
  offset: number;
  /** the other side of the line moves (Fixed Face on the other side) */
  flipSide: boolean;
  /** jog the other way (Reverse Direction) */
  reverse: boolean;
  /** Use default radius off: this radius */
  radius?: number;
  /** Jog Offset: measured to the outside or the inside face, or the overall height; Fix projected length (default on) */
  offsetType?: 'outside' | 'inside' | 'overall';
  fixProjected?: boolean;
  /** Jog Position and Jog Angle */
  position?: 'centerline' | 'materialInside' | 'materialOutside' | 'bendOutside';
  jogAngle?: number;
  /** Jog Offset end condition: Blind (the offset) or Up To Vertex (the height of a picked corner) */
  offsetEnd?: 'blind' | 'upToVertex';
  vertex?: { point: [number, number, number]; label: string };
}

/** Sheet Metal ▸ Sketched Bend: a sketch line on the sheet; one side bends up by the angle around it. */
export interface SketchedBendFeature {
  id: Id;
  type: 'sketchedBend';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  angle: number;
  /** the other side of the line stays fixed (Fixed face) */
  flipSide: boolean;
  /** bend the other way (Reverse Direction) */
  reverse: boolean;
  radius?: number;
  position?: 'centerline' | 'materialInside' | 'materialOutside' | 'bendOutside';
}

/**
 * Surfaces: open surface bodies (Surface Bodies folder). Extruded / Revolved Surface from a sketch's curves,
 * Planar Surface from a closed sketch, Offset Surface of a face, Knit Surface of several surfaces (closed -> solid).
 */
export interface SurfaceFeature {
  id: Id;
  type: 'surface';
  name: string;
  suppressed: boolean;
  kind: 'extrude' | 'revolve' | 'planar' | 'offset' | 'knit' | 'sweep' | 'loft' | 'trim' | 'boundary' | 'filled' | 'ruled' | 'extend' | 'untrim' | 'deleteHole' | 'flatten' | 'thicken' | 'thickenCut' | 'cutWithSurface' | 'replaceFace';
  /** Ruled Surface: the model edge, the direction type and (for Vector) the direction */
  edge?: EdgeRefData;
  ruledMode?: 'tangent' | 'normal' | 'vector';
  vector?: [number, number, number];
  /** Replace Face: the faces of the solid that the surface (target) replaces */
  faces?: { normal: [number, number, number]; point: [number, number, number]; label: string }[];
  /** Thicken / Thickened Cut: the wall thickness; Thicken: Merge result */
  thickness?: number;
  merge?: boolean;
  /** Thickened Cut / Cut With Surface: Feature Scope (absent: all bodies) */
  scope?: Id[];
  /** Filled Surface: which boundary loops of the surface to close */
  fillWhich?: 'outer' | 'inner' | 'all';
  /** trim: the trim tool (a plane) and the surface it cuts; flip keeps the other side */
  trimPlane?: string;
  target?: Id;
  flip?: boolean;
  sketchId?: Id;
  /** sweep: the path sketch; loft: the second profile */
  sketchId2?: Id;
  depth?: number;
  midPlane?: boolean;
  reverse?: boolean;
  angle?: number;
  /** offset: the face (by its normal and centroid) and the distance */
  face?: { normal: [number, number, number]; point: [number, number, number]; label: string } | null;
  distance?: number;
  /** knit: the surface features to knit; Create solid when they close a volume */
  surfaces?: Id[];
  createSolid?: boolean;
  /** knit > Merge entities (default on): coincident edges become one; Show open edges: the boundary in the graphics */
  mergeEntities?: boolean;
  showOpenEdges?: boolean;
  /** trim > Mutual: the selected surfaces trim each other (each by the plane of the others); flip keeps the other side */
  mutual?: boolean;
  targets?: Id[];
}

/**
 * Features ▸ Intersect: two solid bodies split into their regions (the common part and what is only in one of
 * them); excluded regions are removed, the rest is merged into one body (Merge result) or kept as bodies.
 */
export interface IntersectFeature {
  id: Id;
  type: 'intersect';
  name: string;
  suppressed: boolean;
  bodies: Id[];
  /** Regions to Exclude: 'common' (in both), 'a' / 'b' (only in the first / second body) */
  exclude: ('common' | 'a' | 'b')[];
  merge: boolean;
  /** Cap planar openings: a planar surface in the selection splits the solid into two closed regions */
  capPlanar?: boolean;
  /** Consume surfaces: the surfaces used are removed after the feature */
  consumeSurfaces?: boolean;
}

/** Features ▸ Draft (Neutral Plane): the faces taper by the angle away from the neutral plane (direction of pull). */
export interface DraftFeature {
  id: Id;
  type: 'draft';
  name: string;
  suppressed: boolean;
  angle: number;
  neutral: { normal: [number, number, number]; point: [number, number, number]; label: string } | null;
  faces: { normal: [number, number, number]; point: [number, number, number]; label: string }[];
  /** flip the direction of pull */
  reverse?: boolean;
  /** Type of Draft: Neutral plane (default), Parting line (hinge on the parting line), Step draft (one side, from the parting line) */
  draftType?: 'neutral' | 'parting' | 'step';
  /** parting line / step: a point on the parting line (the hinge lies in the plane through it, normal to the pull) */
  parting?: { point: [number, number, number]; label: string } | null;
  /** parting line: which side of the parting line is drafted */
  partingSides?: 'one' | 'other' | 'both';
  /** Face propagation: None, Along tangent, All faces, Inner faces, Outer faces */
  propagation?: 'none' | 'tangent' | 'all' | 'inner' | 'outer';
}

/** Sheet Metal ▸ Hem: the edge folds back 180 degrees over the sheet (closed or with a gap). */
/** Sheet Metal ▸ Cross-Break: the two diagonals of a planar face shown as break lines (cosmetic, no geometry change). */
export interface CrossBreakFeature {
  id: Id;
  type: 'crossBreak';
  name: string;
  suppressed: boolean;
  face: { normal: [number, number, number]; point: [number, number, number]; label: string } | null;
  radius: number;
  angle: number;
  reverse: boolean;
  /** Edit Cross-Break: which diagonals and how far they stay off the corners */
  lines?: 'both' | 'first' | 'second';
  inset?: number;
}

export interface HemFeature {
  id: Id;
  type: 'hem';
  name: string;
  suppressed: boolean;
  edge: EdgeRef | null;
  hemType: HemType;
  length: number;
  gap: number;
  position: FlangePosition;
  flip: boolean;
  /** Miter Gap between hems that meet at a corner (half off each end) */
  miterGap?: number;
  /** Edit Hem Width: the hem starts / ends this far from the edge ends */
  startOffset?: number;
  endOffset?: number;
  customAllowance?: { type: 'kFactor' | 'bendAllowance' | 'bendDeduction' | 'bendTable'; value: number };
  customRelief?: { type: 'rectangle' | 'tear' | 'obround'; ratio: number };
}

/** Flat-Pattern1: unsuppressed, the sheet is shown unfolded. */
/** Features ▸ Hole Wizard ▸ Thread: a helical thread on a cylindrical edge (Metric Die outside, Metric Tap inside). */
export interface ThreadFeature {
  id: Id;
  type: 'thread';
  name: string;
  suppressed: boolean;
  /** the picked circular edge: centre, axis into the material, radius; internal = a hole */
  edge: { center: [number, number, number]; axis: [number, number, number]; radius: number; internal: boolean; label: string } | null;
  size: string;
  diameter: number;
  pitch: number;
  length: number;
  method: 'cut' | 'extrude';
  rightHand: boolean;
  angle: number;
  offset: boolean;
  /** Offset: the thread starts this far from the edge (along the axis) */
  offsetDistance?: number;
  /** End Condition: Blind (length), Revolutions, Up To Selection (a plane across the axis) */
  endCondition?: 'blind' | 'revolutions' | 'upTo';
  revolutions?: number;
  upTo?: { normal: [number, number, number]; point: [number, number, number]; label: string };
  /** Specification: Metric Tap (internal) / Metric Die (external) chosen by the user */
  internalOverride?: boolean;
  /** Mirror Profile (horizontally: the flanks swap) */
  mirrorProfile?: boolean;
  /** Multiple Start: number of thread starts (lead = starts x pitch) */
  starts?: number;
  /** trim the thread at the start / end face */
  trimStart?: boolean;
  trimEnd?: boolean;
  /** End Condition > Reverse Direction: the thread runs the other way along the axis */
  reverse?: boolean;
  /** Thread Location > optional start face: the thread starts where the axis meets this face */
  startFace?: { normal: [number, number, number]; point: [number, number, number]; label: string } | null;
  /** Preview Options: Wireframe (cyan lines, default), Shaded or Partial (the first turns) */
  previewMode?: 'wireframe' | 'shaded' | 'partial';
}

/** Features ▸ Wrap: a closed sketch wrapped onto a cylindrical face (Emboss / Deboss / Scribe, analytical method). */
export interface WrapFeature {
  id: Id;
  type: 'wrap';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  kind: 'emboss' | 'deboss' | 'scribe';
  depth: number;
  /** the picked cylindrical face (fitted when picked) */
  face: { center: [number, number, number]; axis: [number, number, number]; radius: number; label: string } | null;
  /** Wrap Method: Analytical (cylinders, default) or Spline Surface (any face: the sketch is projected onto it) */
  method?: 'analytical' | 'spline';
  splineFace?: { normal: [number, number, number]; point: [number, number, number]; label: string } | null;
}

/** Sheet Metal ▸ Unfold / Fold: the bends are flattened (Unfold) so cuts can be made across them, then bent back (Fold). */
export interface UnfoldFeature {
  id: Id;
  type: 'unfold' | 'fold';
  name: string;
  suppressed: boolean;
}

export interface FlatPatternFeature {
  id: Id;
  type: 'flatPattern';
  name: string;
  suppressed: boolean;
  /** No Bends: the flat state without the bend lines */
  noBendLines?: boolean;
}

/** Sheet Metal ▸ Corners ▸ Closed Corner (Welded Corner when weld is set): the end faces of a flange extended to the flange beside it. */
export interface ClosedCornerFeature {
  id: Id;
  type: 'closedCorner';
  name: string;
  suppressed: boolean;
  faces: { normal: [number, number, number]; point: [number, number, number] }[];
  /** gap left between the faces (0 = touching) */
  gap: number;
  cornerType: 'butt' | 'overlap' | 'underlap';
  /** Welded Corner: a weld bead along the seam */
  weld?: boolean;
}

/** Sheet Metal ▸ Corners ▸ Corner Relief: a rectangular or circular cut where two bends meet. */
export interface CornerReliefFeature {
  id: Id;
  type: 'cornerRelief';
  name: string;
  suppressed: boolean;
  bends: { normal: [number, number, number]; point: [number, number, number] }[];
  kind: 'rectangular' | 'circular';
  size: number;
}

/** Sheet Metal ▸ Lofted-Bend: a sheet lofted between two open profiles, with the sheet thickness. */
export interface LoftedBendFeature {
  id: Id;
  type: 'loftedBend';
  name: string;
  suppressed: boolean;
  sketchId: Id;
  sketchId2: Id;
  thickness: number;
  /** Manufacturing Method: Formed (smooth, default) or Bent (the curved parts become this many flat facets) */
  method?: 'formed' | 'bent';
  facets?: number;
}

/** Sheet Metal ▸ Convert to Sheet Metal: the solid becomes a sheet of the given thickness, open opposite the fixed face. */
export interface ConvertSheetFeature {
  id: Id;
  type: 'convertSheet';
  name: string;
  suppressed: boolean;
  fixedFace: { normal: [number, number, number]; point: [number, number, number] } | null;
  thickness: number;
  bendRadius: number;
  /** Keep body: the original solid stays as a second (hidden) body */
  keepBody?: boolean;
}

/** Curves ▸ Split Line (Projection): the closed sketch regions projected through the body split the faces they cross. */
export interface SplitLineFeature {
  id: Id;
  type: 'splitLine';
  name: string;
  suppressed: boolean;
  sketchId: Id;
  /** Type of Split: Projection (a sketch, default), Silhouette (where the faces turn away from the direction of
   *  pull), Intersection (where a plane cuts the faces) */
  splitType?: 'projection' | 'silhouette' | 'intersection';
  /** silhouette: the direction of pull (plane normal); intersection: the splitting plane */
  plane?: string;
  /** Projection > Single direction: only on the far side of the sketch plane */
  single?: boolean;
}

/** Curves ▸ Projected Curve (Sketch on faces): the sketch projected along its normal onto the body, a 3D curve. */
export interface ProjectedCurveFeature {
  id: Id;
  type: 'projectedCurve';
  name: string;
  suppressed: boolean;
  sketchId: Id;
  /** project in the opposite direction */
  reverse?: boolean;
  /** Sketch on sketch: the 3D curve where the two sketches, each pulled along its own normal, meet */
  onSketch?: boolean;
  sketchId2?: Id;
}

/** Curves ▸ Helix and Spiral: a helix on a circle sketch (axis = sketch normal through the circle centre). */
export interface HelixFeature {
  id: Id;
  type: 'helix';
  name: string;
  /** sketch with the base circle */
  sketchId: Id;
  suppressed: boolean;
  definedBy: 'pitchRevolution' | 'heightRevolution' | 'heightPitch';
  pitch: number;
  revolutions: number;
  height: number;
  startAngle: number;
  clockwise: boolean;
  reverse: boolean;
  /** Variable pitch: region parameters (revolution count from the start, pitch, diameter) */
  variable?: { rev: number; pitch: number; diameter: number }[];
  /** Taper Helix: the radius changes along the height by this angle (outward or inward) */
  taper?: { angle: number; outward: boolean };
}

/** Combine (Insert ▸ Features ▸ Combine): Add / Subtract / Common of solid bodies. */
export interface CombineFeature {
  id: Id;
  type: 'combine';
  name: string;
  suppressed: boolean;
  op: 'add' | 'subtract' | 'common';
  /** Subtract: the body that keeps its name */
  mainBody?: Id;
  /** Bodies to Combine */
  bodies: Id[];
}

/** Rib: an open sketch grows into a thin wall until it meets the body (Features ▸ Rib). */
export interface RibFeature {
  id: Id;
  type: 'rib';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  thickness: number;
  /** thickness on the first side of the sketch plane, both sides (mid-plane) or the second side */
  side: 'first' | 'both' | 'second';
  /** parallel: the material grows in the sketch plane; normal: along the plane normal */
  direction: 'parallel' | 'normal';
  /** Flip material side */
  flip: boolean;
  /** draft angle in degrees: the rib gets thinner away from the sketch (Draft outward: thicker) */
  draft: number;
  draftOutward?: boolean;
}

/** Revolved Boss/Base or Revolved Cut around a (construction) line of the sketch. */
export interface RevolveFeature {
  id: Id;
  type: 'revolve';
  name: string;
  sketchId: Id;
  suppressed: boolean;
  op: 'boss' | 'cut';
  /** id of the line entity in the sketch that is the axis */
  axisEntityId: Id;
  /** degrees, 0 < angle <= 360 */
  angle: number;
  reverse: boolean;
  /** Selected Contours: indices of the sketch regions to use (absent = all) */
  contours?: number[];
  merge?: boolean;
  scope?: Id[];
  /** Revolve Type: Blind (from the sketch plane, default) or Mid-Plane (half the angle each way) */
  end?: 'blind' | 'midPlane';
  /** Direction 2: the revolve also turns this angle the other way */
  direction2?: { angle: number };
  /** Thin Feature: the profile lines become a wall of this thickness */
  thin?: { mode: 'one' | 'mid' | 'two'; thickness: number; thickness2?: number; reverse?: boolean };
}

/** Reference to a body edge that survives a rebuild (matched by centroid, length and shape). */
export interface EdgeRefData {
  centroid: [number, number, number];
  length: number;
  closed: boolean;
  straight: boolean;
  /** where the edge was clicked (Tangent propagation off: only the straight or curved run there) */
  pick?: [number, number, number];
}

/** Fillet (radius) or Chamfer (equal distance) on edges of the body. */
export interface RoundFeature {
  id: Id;
  type: 'fillet' | 'chamfer';
  name: string;
  suppressed: boolean;
  size: number;
  edges: EdgeRefData[];
  /** Sheet Metal ▸ Corners ▸ Break-Corner/Corner-Trim (same geometry, its own name and PropertyManager) */
  breakCorner?: boolean;
  /** Fillet / Chamfer options: asymmetric second distance, profile, multi radius, variable size, partial edge */
  size2?: number;
  profile?: 'circular' | 'conicRho' | 'conicRadius' | 'curvature';
  rho?: number;
  radii?: number[];
  variable?: { start: number; end: number };
  partial?: { start: number; end: number };
  /** Fillet Type / Chamfer Type shown in the PropertyManager */
  roundType?: 'constant' | 'variable' | 'face' | 'fullRound' | 'angleDistance' | 'vertex' | 'offsetFace' | 'faceFace';
  /** Chamfer ▸ Vertex: the corner and the three distances along its edges (equal distance: D1 for all) */
  vertex?: { point: [number, number, number]; label: string };
  size3?: number;
  equalDistance?: boolean;
  /** Full Round Fillet: the three face sets */
  fullRound?: { side1?: { label: string; normal: [number, number, number]; point: [number, number, number] }; center?: { label: string; normal: [number, number, number]; point: [number, number, number] }; side2?: { label: string; normal: [number, number, number]; point: [number, number, number] } };
  /** chamfer Angle-Distance: the angle (degrees) */
  angle?: number;
  /** Tangent propagation (default on): picking an edge also picks the edges tangent to it */
  tangentPropagation?: boolean;
  /** Full / Partial (last edge only) / No preview */
  previewMode?: 'full' | 'partial' | 'none';
  /** Setback Parameters: corners where three filleted edges meet blend over this extra distance */
  setback?: number;
  /** Fillet Options */
  selectThroughFaces?: boolean;
  keepFeatures?: boolean;
  roundCorners?: boolean;
  overflow?: 'default' | 'keepEdge' | 'keepSurface';
  /** Break Corner > Internal corners only: only the concave corners are broken */
  internalOnly?: boolean;
}

/** Mirror the body about a reference plane or a face plane and merge. */
export interface MirrorFeature {
  id: Id;
  type: 'mirror';
  name: string;
  suppressed: boolean;
  plane: string;
  /** Merge solids (default on): the mirrored half joins the body; off: it is a body of its own */
  mergeSolids?: boolean;
  /** Features to Mirror: only these features' tool geometry is mirrored (absent: the whole body) */
  featureIds?: Id[];
  /** Faces to Mirror: the mirrored faces become a surface body */
  faces?: { normal: [number, number, number]; point: [number, number, number]; label: string }[];
  /** Bodies to Mirror (multibody): only these bodies */
  bodies?: Id[];
  /** Knit surfaces: mirrored faces are knit to the surface body they came from */
  knitSurfaces?: boolean;
  /** Propagate visual properties (default on): face appearances are mirrored too */
  propagateVisual?: boolean;
  /** Full / Partial preview of the PropertyManager */
  previewMode?: 'full' | 'partial';
}

/** Linear or circular pattern of sketch-based features (their tool geometry is repeated). */
export interface PatternFeature {
  id: Id;
  type: 'linearPattern' | 'circularPattern' | 'sketchPattern' | 'curvePattern' | 'tablePattern' | 'fillPattern' | 'variablePattern';
  name: string;
  suppressed: boolean;
  featureIds: Id[];
  /** Sketch Driven Pattern: the reference sketch whose points place the instances (reference point: the seed's centroid) */
  sketchId?: Id;
  /** linear: direction 1 / 2 */
  dir1?: { axis: [number, number, number]; spacing: number; count: number };
  dir2?: { axis: [number, number, number]; spacing: number; count: number };
  /** circular: axis through origin, total angle (degrees) and number of instances */
  axis?: { origin: [number, number, number]; dir: [number, number, number] };
  angle?: number;
  count?: number;
  /** Instances to Skip: indices into the instance list (seed excluded) */
  skip?: number[];
  /** Curve Driven Pattern: the curve sketch, instances, spacing (or equal spacing over the curve), tangent alignment */
  curve?: { sketchId: Id; count: number; spacing: number; equal: boolean; tangent: boolean; reverse?: boolean };
  /** Table Driven Pattern: X/Y offsets of the instances in a coordinate system (reference csys or the seed's sketch plane) */
  table?: { x: number; y: number }[];
  csysId?: Id;
  /** Fill Pattern: the fill boundary (outer loop of a planar face, in its plane frame) and the layout */
  fill?: { origin: [number, number, number]; u: [number, number, number]; v: [number, number, number]; polygon: [number, number][]; spacing: number; margin: number; layout: 'square' | 'hex' | 'circular' | 'polygon'; label: string; /** Polygon layout: number of sides */ sides?: number; /** Create seed cut: a round cut of this diameter at the boundary centre is the seed */ seedCut?: number };
  /** Variable Pattern: instances at offsets along a direction, each with its own values for seed sketch dimensions */
  variable?: { dir: [number, number, number]; rows: { offset: number; values: Record<Id, number> }[] };
  /** linear > Up to reference: the instances fill the distance from the seed to a plane (minus the offset) */
  upTo1?: { plane: string; offset: number };
  /** circular > Instance spacing: the angle is the step between instances (else the total angle, equal spacing) */
  instanceSpacing?: boolean;
  /** Sketch Driven Pattern > Selected point: the instances are placed from this point instead of the seed's centroid */
  refPoint?: [number, number, number] | null;
  /** Bodies to pattern (multibody): copies of whole bodies */
  bodies?: Id[];
  /** Geometry pattern: copy the seed's geometry only (no end conditions evaluated per instance) */
  geometryPattern?: boolean;
  /** Vary sketch: every instance's sketch is moved and solved again (it follows its relations to fixed geometry) */
  varySketch?: boolean;
  /** Instances to Vary: seed dimensions that change by an increment from instance to instance */
  varyDims?: { constraintId: Id; increment: number }[];
  /** Instances to Vary ▸ Modified Instances: single instances (i, j) with their own spacing offsets and dimension values */
  modified?: { i: number; j: number; dx?: number; dy?: number; dims?: Record<Id, number> }[];
  /** Direction 2 ▸ Pattern seed only: only the seed's copies along direction 2, no full grid */
  seedOnly?: boolean;
  /** Propagate visual properties (default on): appearances of the seed faces are copied to the instances */
  propagateVisual?: boolean;
  /** Partial preview: only every second instance in the preview */
  partialPreview?: boolean;
}

export type HoleType = 'simple' | 'counterbore' | 'countersink' | 'tap';

/** Hole Wizard: holes normal to a plane (usually a face plane) at sketch positions. */
export interface HoleFeature {
  /** Hole Type ▸ Type: the hole standard's sub type (Drill sizes, Screw Clearances, Socket Head Cap Screw …) */
  holeSubtype?: string;
  id: Id;
  type: 'hole';
  name: string;
  suppressed: boolean;
  plane: string;
  points: { x: number; y: number }[];
  holeType: HoleType;
  diameter: number;
  /** 0 = through all */
  depth: number;
  cbDiameter: number;
  cbDepth: number;
  csDiameter: number;
  csAngle: number;
  /** Hole Wizard size name (M6, …) for the feature name */
  sizeName?: string;
  /** Straight Tap: nominal thread diameter and pitch (cosmetic thread), thread depth (0 = through) */
  threadDiameter?: number;
  pitch?: number;
  threadDepth?: number;
  /** Advanced Hole: an element on the far side (where the hole leaves the body) */
  farSide?: { kind: 'counterbore' | 'countersink'; diameter: number; depth: number; angle: number };
  advanced?: boolean;
  /** Options: Head clearance (deeper counterbore), near side / under head / far side countersinks, cosmetic thread, thread callout */
  headClearance?: number;
  nearCs?: { diameter: number; angle: number };
  underHeadCs?: { diameter: number; angle: number };
  farCs?: { diameter: number; angle: number };
  cosmeticThread?: boolean;
  threadCallout?: boolean;
}

/** Stud Wizard: a threaded stud standing on a planar face (cosmetic thread). */
export interface StudFeature {
  id: Id;
  type: 'stud';
  name: string;
  suppressed: boolean;
  plane: string;
  point: { x: number; y: number };
  size: string;
  diameter: number;
  length: number;
  threadLength: number;
  pitch: number;
  /** Apply to cylindrical body: no new stud, the thread goes on an existing cylinder (from its end) */
  onCylinder?: { center: [number, number, number]; axis: [number, number, number]; radius: number; label: string } | null;
  /** Cosmetic thread (default on) */
  cosmetic?: boolean;
  standard?: 'ISO' | 'DIN';
}

/** Shell: hollow the body with a wall thickness; the listed faces are removed (open). */
export interface ShellFeature {
  id: Id;
  type: 'shell';
  name: string;
  suppressed: boolean;
  thickness: number;
  faces: { normal: [number, number, number]; point: [number, number, number] }[];
  /** Shell outward: the wall grows outside the body */
  outward?: boolean;
  /** Multi-thickness Settings: faces with their own wall thickness */
  multi?: { normal: [number, number, number]; point: [number, number, number]; thickness: number }[];
  /** Show preview */
  preview?: boolean;
}

/** Swept Boss/Base or Cut: the profile sketch along the path sketch. */
export interface SweepFeature {
  id: Id;
  type: 'sweep';
  name: string;
  sketchId: Id;
  pathSketchId: Id;
  suppressed: boolean;
  op: 'boss' | 'cut';
  merge?: boolean;
  scope?: Id[];
  /** Profile and Path ▸ Circular Profile: a round profile of this diameter at the path start (no profile sketch needed) */
  profileType?: 'sketch' | 'circular';
  diameter?: number;
  /** Options ▸ Profile orientation: Follow Path (default) or Keep normal constant */
  orientation?: 'followPath' | 'keepNormal';
  /** Options ▸ Profile Twist ▸ Specify Twist Value: revolutions over the path */
  twist?: number;
  /** Options ▸ Merge tangent faces, Align with end faces, Show preview */
  mergeTangent?: boolean;
  alignEnd?: boolean;
  /** Guide Curves (sketches); the profile scales so its nearest point follows the first guide */
  guides?: Id[];
  /** Start and End Tangency: None or Path Tangent */
  startTangency?: 'none' | 'pathTangent';
  endTangency?: 'none' | 'pathTangent';
  /** Curvature Display options (display only) */
  curvatureDisplay?: { mesh?: boolean; zebra?: boolean; combs?: boolean };
}

/** Lofted Boss/Base or Cut between two profile sketches. */
export interface LoftFeature {
  id: Id;
  type: 'loft';
  name: string;
  sketchId: Id;
  sketchId2: Id;
  /** Guide Curves: sketches whose curve runs from profile 1 to profile 2 and shapes the loft */
  guides?: Id[];
  /** Boundary Boss/Base or Boundary Cut (built with the loft between the two profiles) */
  boundary?: boolean;
  /** Start/End Constraints: Normal To Profile with its tangent length (absent = None) */
  startNormal?: number;
  /** Start/End Constraints: Normal To Profile (default when a weight is set), Direction Vector, Tangency To Face */
  startType?: 'normal' | 'direction' | 'tangent';
  endType?: 'normal' | 'direction' | 'tangent';
  startDir?: [number, number, number];
  endDir?: [number, number, number];
  endNormal?: number;
  /** Guide tangency type: None (default) or Normal to profile (the guides leave the profiles at right angles) */
  guideTangency?: 'none' | 'normal';
  /** Centerline Parameters: a sketch whose curve the section centres follow */
  centerline?: Id;
  /** Options: Merge tangent faces, Close loft (needs three or more profiles), Show preview */
  mergeTangent?: boolean;
  closeLoft?: boolean;
  /** Start/End Constraints ▸ Apply to all: the same constraint for every profile */
  applyToAll?: boolean;
  suppressed: boolean;
  op: 'boss' | 'cut';
  merge?: boolean;
  scope?: Id[];
}

/** Imported mesh body (STL): the triangles are stored in the document, in model units. */
export interface ImportedFeature {
  id: Id;
  type: 'imported';
  name: string;
  suppressed: boolean;
  /** flat xyz triangle positions */
  positions: number[];
  /** source file name */
  source: string;
}

export type SolidFeature = ExtrudeFeature | RevolveFeature | RoundFeature | MirrorFeature | PatternFeature | HoleFeature | ShellFeature | SweepFeature | LoftFeature | ImportedFeature | RibFeature | CombineFeature | BaseFlangeFeature | EdgeFlangeFeature | FlatPatternFeature | HelixFeature | HemFeature | MiterFlangeFeature | JogFeature | Sketch3DFeature | SketchedBendFeature | DraftFeature | IntersectFeature | SurfaceFeature | CrossBreakFeature | UnfoldFeature | WrapFeature | ThreadFeature | SplitLineFeature | ProjectedCurveFeature | StudFeature | ClosedCornerFeature | CornerReliefFeature | LoftedBendFeature | ConvertSheetFeature | BeltFeature | DeleteBodyFeature | DeleteFaceFeature;
export type SketchBasedFeature = ExtrudeFeature | RevolveFeature | SweepFeature | LoftFeature | RibFeature | BaseFlangeFeature | HelixFeature;
export type Feature = SketchFeature | SolidFeature;

export const isSketchBased = (f: Feature): f is SketchFeature | SketchBasedFeature => f.type === 'sketch' || f.type === 'extrude' || f.type === 'revolve' || f.type === 'sweep' || f.type === 'loft' || f.type === 'rib' || f.type === 'baseFlange' || f.type === 'helix' || f.type === 'wrap';

/** A sketch plane: the three reference planes or a planar face of a body. Vectors are world xyz. */
export interface PlaneDef {
  id: Id;
  name: string;
  origin: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
  n: [number, number, number];
  /** face: created for a sketch on a face (hidden); reference: Reference Geometry ▸ Plane (shown in the tree) */
  kind?: 'face' | 'reference';
  /** how a reference plane was defined */
  def?: { ref: string; mode: 'offset' | 'angle' | 'parallel' | 'coincident' | 'perpendicular' | 'mid'; distance: number; angle: number; flip: boolean; axis?: { origin: [number, number, number]; dir: [number, number, number] }; ref2?: string; mid?: { origin: [number, number, number]; n: [number, number, number] }; flipNormal?: boolean };
}

/** A decal: an image projected on a planar face (matched by its normal and a point), width in mm, rotation in degrees. */
export interface Decal {
  id: Id;
  name: string;
  face: { normal: [number, number, number]; point: [number, number, number] };
  image: string;
  width: number;
  rotation: number;
  /** Fixed aspect ratio off: its own height */
  height?: number;
  /** Illumination: lit like the face below it (default) or its own brightness / shininess */
  lighting?: 'appearance' | 'custom';
  brightness?: number;
  shininess?: number;
}

/** Assembly Features ▸ Belt/Chain: a belt around pulleys (cylinders with parallel axes), drawn as its path. */
export interface BeltFeature {
  id: Id;
  type: 'belt';
  name: string;
  suppressed: boolean;
  /** pulley circles in the order the belt runs: centre, axis direction, radius (world) */
  pulleys: { center: [number, number, number]; axis: [number, number, number]; radius: number }[];
  /** belt thickness (added to the pulley radius) */
  thickness: number;
}

/** Solid Bodies ▸ Delete Body: bodies removed from the part from this point on (Body-Delete/Keep). */
/** Delete Face (Surfaces ▸ Delete Face): faces taken out of the body — left open, patched or filled */
export interface DeleteFaceFeature {
  id: Id;
  type: 'deleteFace';
  name: string;
  suppressed: boolean;
  faces: { normal: [number, number, number]; point: [number, number, number]; label: string }[];
  option: 'delete' | 'patch' | 'fill';
}

export interface DeleteBodyFeature {
  id: Id;
  type: 'deleteBody';
  name: string;
  suppressed: boolean;
  bodies: Id[];
}

/** Reference Geometry: an axis (origin + direction), a point, or a coordinate system (origin + x/y/z). World xyz. */
export interface RefGeometry {
  id: Id;
  name: string;
  kind: 'axis' | 'point' | 'csys';
  origin: [number, number, number];
  dir?: [number, number, number];
  x?: [number, number, number];
  y?: [number, number, number];
  z?: [number, number, number];
  /** how it was defined (the PropertyManager option), shown as a tooltip */
  how?: string;
}

/** A part placed in an assembly: an embedded copy of its part document and a rigid transform. */
export interface Component {
  id: Id;
  /** instance name as the original: Part1<1> */
  name: string;
  /** the part document (embedded, so the assembly file is self-contained) */
  part: Document;
  /** world position and rotation (unit quaternion x y z w) */
  position: [number, number, number];
  rotation: [number, number, number, number];
  /** (f) fixed in place; the first component is fixed by default */
  fixed: boolean;
  suppressed: boolean;
  hidden?: boolean;
  /** name of the part configuration this instance shows (absent = the part's active configuration) */
  configuration?: string;
  /** the sub-assembly this component belongs to (an inserted assembly: Assem2<1>) */
  subassembly?: { id: Id; name: string; hideChildren?: boolean };
  /** Make virtual: the part is saved inside the assembly only ([Part1^Assem1]) */
  virtual?: boolean;
  /** Envelope: a reference component (transparent, not in mass properties, interference or the BOM) */
  envelope?: boolean;
  /** Mirror Components ▸ opposite hand: the part geometry mirrored about this plane normal (through its origin) */
  mirror?: [number, number, number];
}

/**
 * Linear / Circular Component Pattern of an assembly (LocalLPattern1 / LocalCirPattern1): copies of the seed
 * components along one or two directions, or around an axis. The instances follow their seeds.
 */
export interface ComponentPattern {
  id: Id;
  name: string;
  kind: 'linear' | 'circular';
  seeds: Id[];
  /** linear: direction 1 (unit vector), spacing, instances (seed included) */
  dir: [number, number, number];
  spacing: number;
  count: number;
  /** linear: optional direction 2 */
  dir2?: [number, number, number];
  spacing2?: number;
  count2?: number;
  /** circular: axis through point, total angle (equal spacing) or angle between instances */
  axisPoint?: [number, number, number];
  angle?: number;
  equal?: boolean;
  /** label of the picked direction / axis reference */
  dirLabel?: string;
  suppressed?: boolean;
  /** Instances to Skip: instance numbers (1 = first copy after the seed) that are left out */
  skip?: number[];
}

/** Exploded View: one step moves components along a direction by a distance. */
export interface ExplodeStep {
  id: Id;
  name: string;
  componentIds: Id[];
  dir: [number, number, number];
  distance: number;
  /** rotation about the step direction through each component's centre (degrees) */
  angle?: number;
  /** Auto-space components after drag: the components of the step are spread evenly along the direction */
  autoSpace?: boolean;
}

export type MateType = 'coincident' | 'parallel' | 'perpendicular' | 'tangent' | 'concentric' | 'lock' | 'distance' | 'angle'
  // advanced
  | 'profileCenter' | 'symmetric' | 'width' | 'path' | 'linearCoupler' | 'distanceLimit' | 'angleLimit'
  // mechanical
  | 'cam' | 'slot' | 'hinge' | 'gear' | 'rackPinion' | 'screw' | 'universalJoint';

/** Geometry a mate references, in the component's local frame. */
export interface MateRef {
  componentId: Id;
  kind: 'face' | 'plane' | 'origin';
  /** display name as the original: Face<1>@Part1<1>, Front Plane@Part2<1> */
  label: string;
  /** plane: unit normal + point; cylinder: axis direction + point on the axis */
  normal: [number, number, number];
  point: [number, number, number];
  /** cylindrical face (concentric mates) */
  cylindrical?: boolean;
  radius?: number;
}

export interface Mate {
  id: Id;
  type: MateType;
  name: string;
  refs: [MateRef, MateRef];
  /** anti-aligned (face normals opposite) is the default for coincident faces, as the original */
  aligned: boolean;
  /** distance (mm) or angle (degrees) */
  value?: number;
  /** distance: flip to the other side */
  flip?: boolean;
  /** concentric: Lock rotation */
  lockRotation?: boolean;
  /** lock: relative transform of the second component in the first one's frame */
  relative?: { position: [number, number, number]; rotation: [number, number, number, number] };
  suppressed: boolean;
  /** symmetric: the symmetry plane; width: the second width face and the second tab face; hinge: the two coincident faces; slot: the second slot side */
  extra?: MateRef[];
  /** limits (distance mm / angle degrees) */
  min?: number;
  max?: number;
  /** gear / linear coupler / universal joint: ratio; screw: pitch (mm per revolution); rack pinion: travel per revolution */
  ratio?: number;
  pitch?: number;
  /** coupling mates: both placements when the mate was made */
  base?: { a: { position: [number, number, number]; rotation: [number, number, number, number] }; b: { position: [number, number, number]; rotation: [number, number, number, number] } };
  /** Options > Add to new folder: the mate sits in this folder under Mates */
  folder?: string;
  /** a mate of an inserted sub-assembly (shown under the sub-assembly) */
  subassembly?: Id;
  /** Analysis tab: friction and bushing data of the mate (for motion / simulation studies) */
  analysis?: { friction?: number; loadBearing?: boolean; bushing?: { stiffness: number; damping: number } };
}

/** Drawing sheet sizes as the original's Sheet Format/Size dialog (mm). */
export type SheetSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'A' | 'B' | 'C' | 'D';

export type DrawingViewType = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric' | 'trimetric' | 'dimetric';

/** A view on a sheet: a projection of the embedded model document, placed at a sheet position (mm). */
export interface DrawingView {
  id: Id;
  /** Drawing View1, … */
  name: string;
  type: DrawingViewType;
  /** sheet position of the view centre (mm from the bottom-left corner) */
  position: [number, number];
  /** view scale numerator/denominator; absent = sheet scale */
  scale?: [number, number];
  /** parent view for projected views (keeps the alignment) */
  parentId?: Id;
  displayStyle: 'hiddenRemoved' | 'hiddenVisible' | 'wireframe' | 'shaded' | 'shadedEdges';
  /** the model (part or assembly) this view shows, embedded */
  model: Document;
  /** model name shown in the tree: Plate<1> */
  modelName: string;
  /** Section View: cut by a line through the parent view (h = horizontal, v = vertical, at = parent view coordinate) */
  section?: { parentId: Id; parentType: DrawingViewType; axis: 'h' | 'v'; at: number; flip: boolean; label: string; /** Removed Section: the cut face only, placed anywhere */ removed?: boolean; /** Section View ▸ Slice section: the cut face only, aligned */ slice?: boolean; /** Partial section: only the material up to this depth behind the cut */ depth?: number; /** Auto hatching: another hatch per component */ autoHatch?: boolean; /** Half Section: only this half (of the view's v direction) is cut, the other half shows the outside */ half?: 'top' | 'bottom' };
  /** Broken-out Section: material inside the closed profile (view coordinates) removed to this depth from the front of the model */
  brokenOut?: { poly: [number, number][]; depth: number };
  /** Alternate Position View: the assembly in another position (exploded, or a time of the motion study), drawn in phantom lines */
  altPosition?: { source: 'exploded' | 'motion'; time: number; name: string };
  /** Crop View: only this rectangle of the view (view coordinates) */
  crop?: { min: [number, number]; max: [number, number] };
  /** Break: the part of the view between a and b along the axis is taken out, leaving a gap (view coordinates) */
  break?: { axis: 'x' | 'y'; a: number; b: number; gap: number; /** Break line style */ style?: 'straight' | 'curve' | 'zigzag' | 'smallZigzag' };
  /** Auxiliary View: looking perpendicular to an edge of the parent view (edge direction in parent view coordinates, side 1 = to the left of the edge) */
  aux?: { parentId: Id; parentType: DrawingViewType; dir: [number, number]; side: 1 | -1; mid: [number, number]; label: string; /** Arrow / Label off */ noArrow?: boolean; noLabel?: boolean };
  /** Relative View: the model seen with one face toward the viewer and another to the right (world unit vectors) */
  relative?: { u: [number, number, number]; v: [number, number, number]; w: [number, number, number]; label: string };
  /** Empty View (sketch in it) / Predefined View (orientation placed first, model inserted later) */
  empty?: boolean;
  predefined?: boolean;
  /** Detail View: a circle of the parent view, enlarged */
  detail?: { parentId: Id; parentType: DrawingViewType; center: [number, number]; radius: number; label: string; /** Detail View ▸ outline around the view */ outline?: 'none' | 'full' | 'jagged'; /** Pin position: stays put when its parent view is moved */ pinned?: boolean; /** Detail Circle style: how the circle and its label are drawn */ style?: 'perStandard' | 'broken' | 'leader' | 'noLeader' | 'connected'; /** Profile: a rectangle (half sizes) instead of the circle */ rect?: [number, number] };
  /** Reference Configuration of the model shown */
  configuration?: string;
  /** Display Style ▸ Draft quality: a coarser visibility sampling (faster, less exact) */
  draftQuality?: boolean;
  /** Dimension Type ▸ True: dimensions in a pictorial view measure the true 3D length */
  trueDims?: boolean;
  /** Cosmetic Thread Display ▸ Draft quality: the end view of a thread as a full circle instead of the 3/4 arc */
  threadDraft?: boolean;
  /** Projected View ▸ Arrow: a viewing arrow at the parent view and VIEW X under this view */
  arrowLabel?: string;
}

/** A dimension on a drawing view (view coordinates in model mm). */
export interface DrawingDimension {
  id: Id;
  viewId: Id;
  kind: 'linear' | 'diameter' | 'radius';
  /** linear: the two points measured; diameter/radius: the circle centre and a point on it */
  a: [number, number];
  b: [number, number];
  /** label position (view units) */
  label: [number, number];
  value: number;
  /** horizontal / vertical / aligned */
  orientation?: 'h' | 'v' | 'aligned';
  /** Dimension PropertyManager: Tolerance/Precision, Override value, Dimension Text, Dual dimension */
  tol?: import('../drawing/dimtext').DimTolerance;
  precision?: number;
  override?: string;
  prefix?: string;
  suffix?: string;
  dual?: boolean;
  /** Leaders tab: arrows outside / inside / smart; Other tab: text height (mm) */
  arrows?: 'outside' | 'inside' | 'smart';
  fontSize?: number;
  /** Use document second arrow off: the style of the second arrowhead */
  secondArrow?: 'closed' | 'open' | 'dot' | 'slash';
}

export interface DrawingNote {
  id: Id;
  text: string;
  position: [number, number];
  /** text height (mm, default 3.5), bold, italic (Format Painter copies these) */
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  /** Text Format: alignment of the lines */
  align?: 'left' | 'center' | 'right';
  /** Leader: the point the leader arrow points to */
  anchor?: [number, number];
  /** Border around the text */
  border?: 'circular' | 'triangle' | 'box';
}

/** Drawing annotations: Balloon, Surface Finish, Geometric Tolerance, Datum Feature, Hole Callout, Centerline (sheet mm). */
export interface DrawingSymbol {
  id: Id;
  kind: 'balloon' | 'surfaceFinish' | 'gtol' | 'datum' | 'holeCallout' | 'centerline' | 'revision' | 'cloud' | 'weld' | 'datumTarget' | 'areaHatch';
  position: [number, number];
  /** leader end on the geometry */
  anchor?: [number, number];
  text?: string;
  /** Balloon Settings: shape and size (characters) */
  shape?: 'circular' | 'triangle' | 'box';
  size?: 'tight' | '1' | '2';
  /** Geometric Tolerance: characteristic symbol, tolerance and datum */
  symbol?: string;
  tol?: string;
  datum?: string;
  /** Area Hatch/Fill: the view and the hatched face as triangles in view coordinates */
  viewId?: Id;
  tris?: [number, number][][];
  /** Centerline end points */
  a?: [number, number];
  b?: [number, number];
  /** Weld Symbol ▸ contour; balloon leader end (dot on a face, arrow on an edge) */
  contour?: 'fillet' | 'square' | 'vgroove';
  head?: 'dot' | 'arrow';
}

export interface DrawingSheet {
  id: Id;
  name: string;
  size: SheetSize;
  landscape: boolean;
  /** sheet scale numerator/denominator */
  scale: [number, number];
  /** show the title block / sheet format */
  showFormat: boolean;
  views: DrawingView[];
  dimensions: DrawingDimension[];
  notes: DrawingNote[];
  centerMarks: { id: Id; viewId: Id; c: [number, number]; r: number }[];
  symbols?: DrawingSymbol[];
  /** Tables: Bill of Materials (anchored top right), Hole Table of a view, General Table (cells) at a position */
  tables?: { id: Id; kind: 'bom' | 'hole' | 'general'; viewId: Id; position?: [number, number]; cells?: string[][] }[];
  /** Magnetic Lines: balloons attached to them are spread evenly along the line */
  magneticLines?: { id: Id; a: [number, number]; b: [number, number]; balloons: Id[] }[];
  /** Custom sheet size (mm, as given; landscape / portrait does not turn it) */
  customSize?: [number, number];
  /** Sheet Properties ▸ Next view label / Next datum label */
  nextViewLabel?: string;
  nextDatumLabel?: string;
  /** Edit Sheet Format: zone labels and border margin */
  format?: { zones: boolean; margin: number };
  /** Title Block Fields (the sheet format's NAME / DATE cells, title, drawing number, company) */
  titleBlock?: { drawnBy?: string; drawnDate?: string; checkedBy?: string; approvedBy?: string; title?: string; dwgNo?: string; company?: string };
  /** Revision Table rows (REV. / DESCRIPTION / DATE / APPROVED); the last one is the current revision */
  revisions?: { rev: string; description: string; date: string; approved: string }[];
}

export const SHEET_SIZES_MM: Record<SheetSize, [number, number]> = {
  A4: [297, 210],
  A3: [420, 297],
  A2: [594, 420],
  A1: [841, 594],
  A0: [1189, 841],
  A: [279.4, 215.9],
  B: [431.8, 279.4],
  C: [558.8, 431.8],
  D: [863.6, 558.8],
};

export interface Document {
  /** stable id (autosave per document, Document Recovery); files from older builds get one when opened */
  id?: string;
  /** Equations ▸ Angular equation units (default degrees) */
  equationAngleUnits?: 'deg' | 'rad';
  /** Equations ▸ Link to external file: the text file the equations were read from */
  equationsFile?: string;
  /** Mass Properties ▸ Override Mass Properties: user mass and / or centre of mass */
  massOverride?: { mass?: number; centroid?: [number, number, number] };
  /** Mass Properties ▸ Create Center of Mass feature: the Center of Mass point in the tree and the graphics area */
  centerOfMass?: boolean;
  /** Section View ▸ Drawing Section View ▸ Save: named section views (for drawings) */
  sectionViews?: { name: string; view: { plane: 'front' | 'top' | 'right'; offset: number; flip: boolean; cap: boolean; [k: string]: unknown } }[];
  version: 1;
  name: string;
  /** part (default), assembly or drawing */
  kind?: 'part' | 'assembly' | 'drawing';
  /** drawing: the sheets */
  sheets?: DrawingSheet[];
  /** assembly: the placed parts and their mates */
  components?: Component[];
  mates?: Mate[];
  units: Units;
  sketches: Record<Id, Sketch>;
  features: Feature[];
  /** sketch planes created on body faces (the three reference planes are implicit) */
  planes: Record<Id, PlaneDef>;
  /** Exploded View ▸ Animate collapse: how far exploded (0..1) while animating */
  explodeFactor?: number;
  /** drawings: the sheets that are not the active one (sheets[0] is the active sheet) */
  otherSheets?: DrawingSheet[];
  /** Assembly ▸ Take Snapshot: saved views (camera) with a thumbnail */
  snapshots?: { id: Id; name: string; quaternion: [number, number, number, number]; target: [number, number, number]; scale: number; image?: string }[];
  /** Lifecycle ▸ Comments: notes on the model or on a feature */
  comments?: { id: Id; featureId?: Id; text: string; author: string; date: string }[];
  /** FeatureManager folders (Create New Folder / Add to New Folder) */
  featureFolders?: { id: Id; name: string; featureIds: Id[] }[];
  bodyFolders?: { id: Id; name: string; bodyIds: Id[] }[];
  /** Add to Favorites: the Favorites folder at the top of the tree */
  favorites?: Id[];
  /** Feature Properties: description and creation date per feature */
  featureMeta?: Record<Id, { description?: string; created?: string }>;
  /** Body Display ▸ Change Transparency */
  transparentBodies?: Id[];
  /** Create Bounding Box: the box around all bodies, shown as dashed lines and a tree item */
  boundingBox?: boolean;
  /** Markup: freehand strokes over the graphics area (screen fractions 0..1), per document */
  markups?: { id: Id; color: string; points: [number, number][] }[];
  /** Render Tools ▸ Edit Decal: images on planar faces (DisplayManager ▸ Decals) */
  decals?: Decal[];
  /** Reference Geometry ▸ Axis / Point / Coordinate System (shown in the tree after the planes) */
  refGeometry?: RefGeometry[];
  /** parametric variables (legacy, unused) */
  variables: Record<string, number>;
  /** global variables and dimension equations (Tools > Equations) */
  equations: Equation[];
  /** Document Properties (Tools > Options), keys 'doc.*' */
  properties?: Record<string, boolean | number | string>;
  /** applied material (Edit Material): density in kg/m³, colour of the body */
  material?: { name: string; density: number; color: string };
  /** material of the configurations without their own (once a configuration has a specific material; null = not specified) */
  materialBase?: { name: string; density: number; color: string } | null;
  /** assembly: Exploded View (ExplView1) steps and whether the view is exploded */
  explodeSteps?: ExplodeStep[];
  /** Render Tools ▸ Edit Scene: background of the graphics area (and of Final Render) */
  scene?: {
    background: 'gradient' | 'white' | 'color' | 'studio';
    color?: string;
    /** Environment: what RealView reflects (Studio Room, Courtyard, Warehouse, or none) */
    environment?: 'studio' | 'courtyard' | 'warehouse' | 'none';
    /** Floor: reflections of the model, alignment (bottom of the model or the Top Plane) and offset */
    floorReflections?: boolean;
    floorAlign?: 'bottom' | 'top';
    floorOffset?: number;
    /** Advanced: environment rotation (degrees) */
    envRotation?: number;
    /** Illumination: rendering brightness and scene reflectivity (1 = default) */
    brightness?: number;
    reflectivity?: number;
  };
  /** Motion Study 1 (Animation): motors and the study length */
  motionStudy?: import('../assembly/motion').MotionStudy;
  /** Appearances on single faces: the face is found again by its normal and centroid */
  faceAppearances?: { normal: [number, number, number]; point: [number, number, number]; color: string }[];
  /** assembly: Linear / Circular Component Patterns */
  componentPatterns?: ComponentPattern[];
  exploded?: boolean;
  /** Sheet-Metal1: thickness, bend radius, K-factor (set by the first Base Flange) */
  sheetMetal?: SheetMetalParams;
  /** Solid Bodies ▸ Hide: bodies not shown and not used for Merge result */
  hiddenBodies?: Id[];
  /** Edit Appearance: colour of the part and per body (wins over the material colour) */
  appearance?: string;
  bodyAppearances?: Record<Id, string>;
  /** material per body (Solid Bodies ▸ body ▸ Material); absent = the part material */
  bodyMaterials?: Record<Id, { name: string; density: number; color: string }>;
  /** Sensors folder: mass-property sensors that show the current value in the tree */
  sensors?: { id: Id; name: string; kind: 'mass' | 'volume' | 'area' | 'dimension' | 'interference'; /** Dimension sensor: the dimension watched (D1@Sketch1) */ dim?: string; /** Notifications: alert when the value is above / below the limit */ alert?: { op: '>' | '<'; value: number } }[];
  /** ConfigurationManager: named sets of dimension values and suppressed features (absent = only Default) */
  configurations?: Configuration[];
  /** id of the active configuration (absent = the first one / Default) */
  activeConfiguration?: Id;
}

export function createDocument(name = 'Part1', kind: 'part' | 'assembly' | 'drawing' = 'part', sheet?: Partial<Pick<DrawingSheet, 'size' | 'landscape' | 'scale' | 'showFormat'>>): Document {
  const doc: Document = { version: 1, name, units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [] };
  if (kind === 'assembly') return { ...doc, kind, components: [], mates: [] };
  if (kind === 'drawing') return { ...doc, kind, sheets: [{ id: 'sheet1', name: 'Sheet1', size: sheet?.size ?? 'A4', landscape: sheet?.landscape ?? true, scale: sheet?.scale ?? [1, 2], showFormat: sheet?.showFormat ?? true, views: [], dimensions: [], notes: [], centerMarks: [] }] };
  return doc;
}

export const isDrawing = (doc: Document): boolean => doc.kind === 'drawing';

export const isAssembly = (doc: Document): boolean => doc.kind === 'assembly';

export const isSolidFeature = (f: Feature): f is SolidFeature => f.type !== 'sketch';
export const isRoundFeature = (f: Feature): f is RoundFeature => f.type === 'fillet' || f.type === 'chamfer';
