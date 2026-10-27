import { documentSlice } from './slices/document';
import { sketchSlice } from './slices/sketch';
import { featuresSlice } from './slices/features';
import { assemblySlice } from './slices/assembly';
import { drawingSlice } from './slices/drawing';
import { uiSlice } from './slices/ui';
import { sheetMetalSlice } from './slices/sheetMetal';
import { tolerancingSlice } from './slices/tolerancing';
import { weldmentsSlice } from './slices/weldments';
import type { StoreApi } from 'zustand';
import { refreshPierce } from '../core/sketch/pierce';
import type { SectionPlane } from '../core/features/section';
import { create } from 'zustand';
import { createDocument, type Document, type ExtrudeFeature, type HoleFeature, type MirrorFeature, type PatternFeature, type LoftFeature, type RibFeature, type CombineFeature, type BaseFlangeFeature, type EdgeFlangeFeature, type HelixFeature, type HemFeature, type MiterFlangeFeature, type JogFeature, type Sketch3DFeature, type SketchedBendFeature, type DraftFeature, type IntersectFeature, type SurfaceFeature, type CrossBreakFeature, type WrapFeature, type ThreadFeature, type RevolveFeature, type RoundFeature, type ShellFeature, type SolidFeature, type SweepFeature, type Units, type VentFeature, type FormToolFeature, type GussetFeature, type TabSlotFeature, type RipFeature, type SweptFlangeFeature, type StructuralMemberFeature, type TrimExtendFeature, type EndCapFeature, type WeldGussetFeature, type WeldBeadFeature, type DeformFeature, type MoveBodyFeature } from '../core/document/types';
import { type AutoToleranceData, type AutoToleranceGtol, type FaceRef as DxFaceRef } from '../core/document/autoTolerance';
import { rebuildDocument, type RebuildResult } from '../core/features/rebuild';
import { registerPlanes } from './viewport/camera';
import { History } from '../core/document/history';
import { autosave, loadAutosave, setAutosaveErrorHandler } from '../core/document/persistence';

/** Sketch patterns ▸ Add dimensions: the distance from the seed's first point to the same point of the first copy */
export function withSpacingDimension(before: Sketch, after: Sketch, seedIds: Id[], on: boolean): Sketch {
  if (!on) return after;
  const seed = before.entities[seedIds[0]];
  const firstNew = after.entityOrder.find((id) => !before.entities[id] && after.entities[id]?.kind === seed?.kind);
  if (!seed || !firstNew) return after;
  const pt = (sk: Sketch, id: Id) => { const e = sk.entities[id] as { p1?: Id; center?: Id; p?: Id; start?: Id }; return e.p1 ?? e.center ?? e.start ?? e.p; };
  const a = pt(before, seed.id), b = pt(after, firstNew);
  if (!a || !b) return after;
  const pa = after.points[a], pb = after.points[b];
  return addConstraint(after, 'distance', [a, b], { value: Math.hypot(pb.x - pa.x, pb.y - pa.y) })[0];
}

/** distance from a point to the infinite line through a and b */
export function pointLineDistance(q: SketchPoint, a: SketchPoint, b: SketchPoint): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.abs((q.x - a.x) * dy - (q.y - a.y) * dx) / (Math.hypot(dx, dy) || 1);
}
import { newId, addConstraint } from '../core/sketch/model';
import type { StudFeature, SplitLineFeature, ProjectedCurveFeature, ClosedCornerFeature, CornerReliefFeature, LoftedBendFeature, ConvertSheetFeature, DeleteFaceFeature } from '../core/document/types';
import type { Constraint, ConstraintKind, Id, Sketch, SketchPoint } from '../core/sketch/types';
import { solveSketch, type SolveResult } from '../core/solver/solver';
import { SolverClient } from '../core/solver/solverClient';
import type { SelectionItem } from '../core/sketch/relations';
import { applyEquations, type Equation } from '../core/document/equations';
import { type PrefValue } from './prefs';
import { rebuildAssembly } from '../core/assembly/assembly';
import { type SheetMetalParams } from '../core/features/sheetmetal';
import { isAssembly, isDrawing, type DrawingSymbol, type DrawingView as DrawingViewT, type ComponentPattern, type ExplodeStep, type Component, type DrawingDimension, type DrawingSheet, type DrawingView, type DrawingViewType, type Mate, type MateRef } from '../core/document/types';
import { circleOfEdge, insideBody } from '../core/features/thread';

/** A circular edge as a thread start: centre, axis into the material, radius, hole or rod. */
export function threadEdge(g: THREE.BufferGeometry, points: THREE.Vector3[], index: number): NonNullable<ThreadFeature['edge']> | null {
  const c = circleOfEdge(points);
  if (!c) return null;
  const side = (Math.abs(c.normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(c.normal).normalize();
  // a point a little way along ±normal, at half the radius (inside a rod) or beyond the radius (around a hole)
  const probe = (sign: number, r: number) => insideBody(g, c.center.clone().addScaledVector(c.normal, sign * Math.min(1, c.radius * 0.2)).addScaledVector(side, r));
  let sign = 1, internal = false;
  if (probe(1, c.radius * 0.5)) sign = 1;
  else if (probe(-1, c.radius * 0.5)) sign = -1;
  else if (probe(1, c.radius * 1.3)) { sign = 1; internal = true; }
  else { sign = -1; internal = true; }
  const ax = c.normal.clone().multiplyScalar(sign);
  return { center: [c.center.x, c.center.y, c.center.z], axis: [ax.x, ax.y, ax.z], radius: c.radius, internal, label: `Edge<${index}>` };
}
import type { Circle2D, Line2D } from '../core/drawing/hlr';
import * as THREE from 'three';
import { type Block } from '../core/sketch/blocks';
import { type RefSelection } from '../core/features/refgeom';

export type ToolId =
  | 'select'
  | 'line'
  | 'centerline'
  | 'rectangle'
  | 'centerRectangle'
  | 'rect3Corner'
  | 'rect3Center'
  | 'parallelogram'
  | 'midpointLine'
  | 'circle'
  | 'arc3'
  | 'arcCenter'
  | 'spline'
  | 'point'
  | 'polygon'
  | 'slot'
  | 'centerSlot'
  | 'arcSlot'
  | 'centerArcSlot'
  | 'tangentArc'
  | 'perimeterCircle'
  | 'hdim'
  | 'vdim'
  | 'dimension'
  | 'trim'
  | 'sketchFillet'
  | 'offset'
  | 'moveEntities'
  | 'copyEntities'
  | 'rotateEntities'
  | 'scaleEntities'
  | 'linearSketchPattern'
  | 'circularSketchPattern'
  | 'sketchChamfer'
  | 'extend'
  | 'ellipse'
  | 'partialEllipse'
  | 'parabola'
  | 'conic'
  | 'styleSpline'
  | 'equationCurve'
  | 'fullyDefine'
  | 'text';

export type RibbonTab = 'sketch' | 'features' | 'surfaces' | 'sheetmetal' | 'weldments' | 'evaluate' | 'render' | 'addins' | 'assembly' | 'drawing' | 'markup' | 'mbd' | 'viewLayout' | 'annotation' | 'sheetFormat' | 'lifecycle';
export type Theme = 'light' | 'dark';
export type PanelId = 'manager' | 'relations' | 'shortcuts';
export type ManagerTab = 'tree' | 'properties' | 'configurations' | 'autoTolerance' | 'display';
export type DisplayStyle = 'wireframe' | 'hiddenVisible' | 'hiddenRemoved' | 'shaded' | 'shadedEdges';
export type UnitSystem = 'MKS' | 'CGS' | 'MMGS' | 'IPS';
export type TaskPaneTab = 'library' | 'relations' | 'properties' | 'resources' | 'marketplace' | 'forum' | 'explorer' | 'palette' | 'appearances' | 'platform' | 'recovery' | null;
export type DialogId = 'welcome' | 'new' | 'options' | 'orientation' | 'mass' | 'measure' | 'equations' | 'bom' | 'interference' | 'sheetFormat' | 'sheetProperties' | 'material' | 'configure' | 'appearance' | 'check' | 'sectionProps' | 'repairSketch' | 'finalRender' | 'designStudy' | 'previewWindow' | 'mirrorComponents' | 'packAndGo' | 'share' | 'comments' | 'componentPreview' | 'relativeView' | 'spellCheck' | 'notePattern' | 'generalTable' | 'featureProps' | 'parentChild' | 'exportOptions' | 'customize' | 'performance' | 'deviation' | 'symmetry' | 'compare' | 'beamEstimate' | 'bodiesToKeep' | 'phlippoViewer' | 'cutList' | 'saveAs' | null;

/** drawing commands: Model View, Projected View, Smart Dimension, Note, Center Mark */
export interface DrawingEdit {
  /** Edit Sheet Format: the title block PM also shows the format options */
  editFormat?: boolean;
  /** Model View / Projected View options */
  configuration?: string;
  preview?: boolean;
  importAnnotations?: boolean;
  draftQuality?: boolean;
  trueDims?: boolean;
  threadDraft?: boolean;
  /** Flat Pattern Display: bend lines / bend notes of a sheet metal model view */
  bendLines?: boolean;
  bendNotes?: boolean;
  useParentStyle?: boolean;
  scaleMode?: 'parent' | 'sheet' | 'custom';
  projArrow?: boolean;
  /** Section View ▸ Auto-start section view off: the view waits for "Place section view" */
  sectionHold?: boolean;
  /** Detail Circle style / Profile (rectangle) */
  detailStyle?: NonNullable<DrawingViewT['detail']>['style'];
  detailProfile?: boolean;
  detailRect?: [number, number];
  /** Note: alignment, document font / height, leader, border; the leader point picked first */
  noteAlign?: 'left' | 'center' | 'right';
  noteFont?: number;
  noteLeader?: 'leader' | 'none' | 'auto';
  noteBorder?: 'none' | 'circular' | 'triangle' | 'box';
  noteAnchor?: [number, number];
  /** Balloon Settings */
  balloonShape?: 'circular' | 'triangle' | 'box';
  balloonSize?: 'tight' | '1' | '2';
  balloonText?: 'item' | 'quantity' | 'custom';
  /** Broken View: line style and gap */
  breakStyle?: 'straight' | 'curve' | 'zigzag' | 'smallZigzag';
  breakGap?: number;
  /** Auxiliary View: arrow and label */
  auxArrow?: boolean;
  auxLabel?: boolean;
  /** Alternate Position: the new configuration's name, or an existing configuration */
  altName?: string;
  altExisting?: string;
  /** Relative View frame, Empty View, Predefined View for the view placed next */
  relative?: DrawingViewT['relative'];
  emptyView?: boolean;
  predefined?: boolean;
  mode: 'modelView' | 'projected' | 'dimension' | 'note' | 'centerMark' | 'section' | 'detail' | 'symbol' | 'crop' | 'break' | 'aux' | 'modelItems' | 'brokenOut' | 'titleBlock' | 'altPosition';
  /** Alternate Position View: source and time */
  altPosition?: { source: 'exploded' | 'motion'; time: number; viewId: Id };
  /** Broken-out Section: the view, the profile points so far (view coordinates), closed?, depth */
  brokenOut?: { viewId: Id; points: [number, number][]; closed: boolean; depth: number };
  /** Model Items: source (entire model / selected view) and the dimension types to import */
  modelItems?: { source: 'entire' | 'selected'; sketchDims: boolean; featureDims: boolean; holeDims: boolean; includeHidden?: boolean; sketchPlacement?: boolean; eliminateDuplicates?: boolean };
  /** Auxiliary View: the picked edge (parent view coordinates) */
  auxEdge?: { viewId: Id; a: [number, number]; b: [number, number] };
  /** Crop View / Break: the view and the first pick (view coordinates); break direction */
  viewTool?: { viewId: Id; first?: [number, number]; axis?: 'x' | 'y' };
  /** Annotation ▸ symbols: which one, its first pick (leader end / first line) and its values */
  symbolKind?: DrawingSymbol['kind'] | 'autoBalloon';
  symbolAnchor?: [number, number];
  symbolText?: string;
  symbolLine?: [[number, number], [number, number]];
  /** Auto Balloon ▸ Balloon Layout, Ignore multiple instances, Insert magnetic line(s) */
  balloonLayout?: import('../core/drawing/balloons').BalloonLayout;
  balloonAttach?: 'faces' | 'edges';
  weldContour?: 'fillet' | 'square' | 'vgroove';
  /** Broken-out Section ▸ Preview */
  brokenOutPreview?: boolean;
  ignoreMultiple?: boolean;
  insertMagnetic?: boolean;
  gtolSymbol?: string;
  gtolTol?: string;
  gtolDatum?: string;
  finish?: string;
  model?: Document;
  orientation: DrawingViewType;
  multiple: boolean;
  displayStyle: DrawingView['displayStyle'];
  useCustomScale: boolean;
  scale: [number, number];
  parentId?: Id;
  noteText?: string;
  /** dimension in progress: what was picked, waiting for the label placement */
  dimStart?: { viewId: Id; kind: DrawingDimension['kind']; a: [number, number]; b: [number, number]; value: number };
  /** Section View: cutting line direction and, once clicked, its position in the parent view */
  sectionAxis?: 'h' | 'v';
  sectionAt?: number;
  sectionFlip?: boolean;
  /** Removed Section: the cut face only, placed freely */
  sectionRemoved?: boolean;
  /** Section View PM: Half Section (which half is cut), Slice section, Partial section depth, Auto hatching */
  sectionHalf?: 'top' | 'bottom';
  sectionSlice?: boolean;
  sectionDepth?: number;
  sectionAutoHatch?: boolean;
  /** Detail View PM: outline and Pin position */
  detailOutline?: 'none' | 'full' | 'jagged';
  detailPinned?: boolean;
  /** Detail View: circle centre (parent view coordinates) and radius, then the placement */
  detailCenter?: [number, number];
  detailRadius?: number;
}

export type AsmTool = 'select' | 'move' | 'rotate';

/** Reference Geometry ▸ Plane being defined */
export interface PlaneEdit {
  planeId: Id | null;
  draft: { name: string; ref: string; mode: 'offset' | 'angle' | 'parallel' | 'coincident' | 'perpendicular' | 'mid'; distance: number; angle: number; flip: boolean; count: number; edgeId?: string; ref2?: string; flipNormal?: boolean };
}
export interface MateEdit {
  mateId: Id | null;
  draft: Mate;
}
/** parameters of the sketch editing tools (Sketch Fillet, Offset, Move/Copy/Rotate/Scale, patterns) */
export interface SketchToolParams {
  /** Sketch Fillet > Keep constrained corners; Offset > Select chain; Move/Copy > Keep relations; Circular pattern > Equal spacing; Line > Infinite length */
  filletKeepCorners: boolean;
  offsetChain: boolean;
  keepRelations: boolean;
  circEqual: boolean;
  infiniteLength: boolean;
  /** Insert Line ▸ Orientation: As sketched / Horizontal / Vertical / Angle (with the angle) */
  lineOrientation: 'sketched' | 'horizontal' | 'vertical' | 'angle';
  lineAngle: number;
  /** Insert Line ▸ Options ▸ Midpoint line: the first click is the middle of the line */
  midpointLine: boolean;
  /** Line / Rectangle / Circle ▸ Options ▸ Add dimensions (Circle: diameter instead of radius) */
  addDimensions: boolean;
  circleDiameter: boolean;
  filletRadius: number;
  chamferD1: number;
  chamferD2: number;
  chamferEqual: boolean;
  offsetDistance: number;
  offsetReverse: boolean;
  offsetConstruction: boolean;
  dx: number;
  dy: number;
  angle: number;
  scale: number;
  cx: number;
  cy: number;
  spacing: number;
  count: number;
  direction: number;
  spacing2: number;
  count2: number;
  direction2: number;
  circAngle: number;
  circCount: number;
  /** Trim Entities options */
  trimMode: 'closest' | 'power' | 'corner' | 'inside' | 'outside';
  trimKeep: boolean;
  trimIgnore: boolean;
  /** Sketch Fillet ▸ Dimension each fillet; Sketch Chamfer ▸ Angle-distance */
  filletDimension: boolean;
  chamferMode: 'distance' | 'angle';
  chamferAngle: number;
  /** Offset Entities ▸ Bi-directional, Cap ends (arcs), base geometry as construction */
  offsetBidirectional: boolean;
  offsetCapEnds: boolean;
  offsetBaseConstruction: boolean;
  offsetDimensions: boolean;
  /** Options ▸ For construction of the drawing tools */
  forConstruction: boolean;
  /** Slot ▸ Add dimensions (Center to Center / Overall Length); patterns, move/copy ▸ Add dimensions */
  slotDimensions: boolean;
  slotOverall: boolean;
  patternDimensions: boolean;
  /** Move / Copy ▸ From/To: base point and destination */
  moveMode: 'xy' | 'fromTo';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}
/** Explode Property Panel: the steps so far and the step being defined */
/** Linear / Circular Component Pattern Property Panel */
export interface PatternEdit {
  /** existing pattern being edited */
  patternId: Id | null;
  draft: ComponentPattern;
  /** which selection box takes the next pick: the direction / axis or the components */
  focus: 'direction' | 'seeds' | 'skip';
}
/** 3D Sketch in progress: its lines, the active plane of the space handle and the end of the chain */
export interface Sketch3DEdit {
  featureId: Id | null;
  name: string;
  segments: Sketch3DFeature['segments'];
  plane: 'xy' | 'yz' | 'zx';
  last: [number, number, number] | null;
}
export interface ExplodeEdit {
  steps: ExplodeStep[];
  current: { componentIds: Id[]; axis: 'x' | 'y' | 'z'; reverse: boolean; distance: number; angle?: number };
  /** Options: Auto-space components after drag, Select sub-assembly parts, Show rotation rings */
  autoSpace?: boolean;
  subParts?: boolean;
  rings?: boolean;
}
/** View ▸ Display ▸ Section View: a planar section through the model (display only) */
export interface SectionView {
  plane: 'front' | 'top' | 'right';
  offset: number;
  flip: boolean;
  cap: boolean;
  /** Section 1 tilted about the plane's two in-plane axes (degrees) */
  rotX?: number;
  rotY?: number;
  /** Section Method: Planar (cut away) or Zonal (keep the zone between the planes) */
  method?: 'planar' | 'zonal';
  /** Edit Color: the colour of the section cap (absent: the body colour) */
  capColor?: string;
  /** Keep cap color: the cap colour is kept for the next section views */
  keepCapColor?: boolean;
  /** Graphics-only section: clipped on the graphics card, no cap, fast */
  graphicsOnly?: boolean;
  /** Section 2 / Section 3 */
  s2?: SectionPlane;
  s3?: SectionPlane;
  /** Selected bodies: only these bodies / components are sectioned */
  selectedOnly?: boolean;
  bodies?: string[];
  /** the Selected Bodies box takes the next pick */
  pickBodies?: boolean;
}
/** Configurations panel: Add Configuration / Configuration Properties Property Panel */
export interface ConfigEdit {
  configId: Id | null;
  draft: { name: string; description: string; comment: string; parentId?: Id; descriptionInBom?: boolean; bomName?: 'document' | 'configuration' | 'user'; bomUserName?: string; hideChildrenInBom?: boolean; suppressNew?: boolean; color?: string };
}
/** Modify Configurations table: one row of edits for a configuration (by name; new rows are created first) */
export interface ConfigurationEdit {
  name: string;
  dims: Record<string, number>;
  suppressed: Record<Id, boolean>;
}

export interface LibraryItem {
  id: Id;
  name: string;
  block: Block;
  created: string;
}
export interface Library {
  id: Id;
  name: string;
  items: LibraryItem[];
}
export type DockSide = 'left' | 'right' | 'float';

/** a planar face of a body, for hover / selection / sketching on it */
export interface FaceRef {
  bodyId: Id;
  faceId: string;
}

/** a solid feature being created or edited in the Property Panel (yellow preview) */
export interface FeatureEdit {
  /** id of the existing feature when editing, null when creating */
  featureId: Id | null;
  draft: SolidFeature;
}

export interface PanelLayout {
  side: DockSide;
  visible: boolean;
  /** floating position */
  x?: number;
  y?: number;
}

export interface StatusMessage {
  id: number;
  text: string;
  level: 'info' | 'warn' | 'error';
}

export interface State {
  doc: Document;
  /** sketch currently being edited */
  activeSketchId: Id | null;
  solve: Record<Id, SolveResult>;
  /** solid bodies built from the feature history (up to the rollback bar) */
  rebuild: RebuildResult;
  featureEdit: FeatureEdit | null;
  /** assembly: the Mate Property Panel */
  mateEdit: MateEdit | null;
  /** assembly: Insert Component Property Panel open */
  insertingComponent: boolean;
  /** Insert Component: the chosen part follows the pointer until a click places it (the intended graphics preview) */
  insertGhost: InsertGhost | null;
  /** Insert Component: the angle of the Rotate context toolbar */
  insertAngle: number;
  /** assembly: Move / Rotate Component tool */
  asmTool: AsmTool;
  /** Interference Detection: the overlap solid to show */
  interferenceHighlight: THREE.BufferGeometry | null;
  /** Reference Geometry ▸ Plane */
  planeEdit: PlaneEdit | null;
  /** Configurations panel: Add Configuration / Properties */
  configEdit: ConfigEdit | null;
  /** Material dialog opened for one body of the Solid Bodies folder (null = the part) */
  materialTarget: Id | null;
  /** Sheet-Metal1 Property Panel (thickness, bend radius, K-factor) */
  sheetMetalEdit: boolean;
  /** sketch editing tool parameters (Property Panel values) */
  sketchTool: SketchToolParams;
  /** assembly: Explode Property Panel */
  explodeEdit: ExplodeEdit | null;
  /** Motion Study 1 tab open (Motion Timeline under the graphics area), playback time and state, motor being defined */
  motionOpen: boolean;
  /** Render Tools: Edit Scene Property Panel open; the last Final Render image (data URL) */
  sceneEdit: boolean;
  finalImage: string | null;
  setSceneEdit(open: boolean): void;
  setScene(patch: Partial<NonNullable<Document['scene']>>): void;
  setFinalImage(img: string | null): void;
  /** Auto Fasteners being defined: one fastener per group of coaxial Hole Tool holes */
  fastenerEdit: { slots: import('../core/assembly/fasteners').FastenerSlot[]; autoLength: boolean } | null;
  startSmartFasteners(): void;
  updateFastenerSlot(i: number, patch: Partial<import('../core/assembly/fasteners').FastenerSlot>): void;
  commitSmartFasteners(): void;
  cancelSmartFasteners(): void;
  motionTime: number;
  motionPlaying: boolean;
  motorEdit: import('../core/assembly/motion').RotaryMotor | null;
  /** Move with Triad: the component the triad sits on */
  triadComponentId: Id | null;
  /** Basic Motion: the calculated frames (Calculate) */
  motionSim: import('../core/assembly/motion').MotionSim | null;
  /** Autokey: moving a component with the time bar past 0 records a key there */
  motionAutokey: boolean;
  /** the Spring / Contact / Gravity / Motion Study Properties / Animation Wizard / Results and Plots Property Panel */
  motionEdit: MotionEdit | null;
  startMotionEdit(kind: MotionEdit['kind']): void;
  updateMotionEdit(patch: Partial<MotionEdit>): void;
  commitMotionEdit(): void;
  /** Type of Study, Playback Mode, … */
  setMotionStudy(patch: Partial<import('../core/assembly/motion').MotionStudy>): void;
  /** Basic Motion ▸ Calculate */
  calculateMotion(): void;
  setMotionAutokey(on: boolean): void;
  /** Add/Update Key: the pose of the components (all, or the given ones) at the time bar */
  addMotionKey(ids?: Id[]): void;
  /** remove a spring / contact / gravity / wizard step / key of the study */
  deleteMotionItem(kind: 'spring' | 'contact' | 'gravity' | 'wizard' | 'keys', id?: string): void;
  setMotionOpen(open: boolean): void;
  setMotionTime(t: number): void;
  setMotionPlaying(p: boolean): void;
  startMotor(): void;
  updateMotorDraft(patch: Partial<import('../core/assembly/motion').RotaryMotor>): void;
  commitMotor(): void;
  cancelMotor(): void;
  deleteMotor(id: Id): void;
  setMotionDuration(s: number): void;
  patternEdit: PatternEdit | null;
  sketch3dEdit: Sketch3DEdit | null;
  /** Assembly ▸ Edit Component: the assembly waiting while one of its parts is edited */
  editContext: { assembly: Document; componentName: string; partName: string; history?: ReturnType<History<Document>['save']> } | null;
  /** What's Wrong: the list of rebuild errors (opens after opening a document that has them) */
  whatsWrong: boolean;
  /** Evaluate ▸ Sensor Property Panel (Mass Properties: Mass / Volume / Surface Area) */
  sensorEdit: { kind: 'mass' | 'volume' | 'area' | 'dimension' | 'interference'; dim?: string; alert?: { op: '>' | '<'; value: number } } | null;
  setSensorEdit(e: State['sensorEdit']): void;
  /** open the selected component's part for editing (Edit Component) */
  editComponent(id?: Id | null): void;
  /** Edit Component off: every instance of the part takes the edited version, the assembly comes back */
  returnToAssembly(): void;
  /** feature Property Panel eye: show the model with the feature applied instead of the yellow preview */
  detailedPreview: boolean;
  /** Evaluate ▸ Draft Analysis / Curvature: faces coloured by the analysis */
  analysis: { kind: 'draft'; pull: [number, number, number]; pullLabel: string; angle: number; classify?: boolean } | { kind: 'curvature' } | { kind: 'geometry'; shortEdge: number; smallFace: number; sharpAngle: number; checkShort?: boolean; checkSmall?: boolean; checkSharp?: boolean } | { kind: 'thickness'; target: number; mode?: 'thin' | 'thick'; resolution?: 'low' | 'medium' | 'high' } | { kind: 'undercut'; pull: [number, number, number]; pullLabel: string } | { kind: 'parting'; pull: [number, number, number]; pullLabel: string; angle: number } | { kind: 'deviation'; samples: number } | { kind: 'tolerance' } | null;
  setAnalysis(a: State['analysis']): void;
  toggleDetailedPreview(): void;
  /** Sketch ▸ 3D Sketch: start a new 3D sketch (or edit one) */
  start3DSketch(): void;
  edit3DSketch(id: Id): void;
  /** a click: a line from the last point (or the start of a chain) */
  add3DPoint(p: [number, number, number]): void;
  end3DChain(): void;
  /** Tab: the space handle switches XY -> YZ -> ZX */
  cycle3DPlane(): void;
  undo3DSegment(): void;
  commit3DSketch(): void;
  cancel3DSketch(): void;
  startComponentPattern(kind: 'linear' | 'circular'): void;
  editComponentPattern(id: Id): void;
  updatePatternDraft(patch: Partial<ComponentPattern>, focus?: PatternEdit['focus']): void;
  commitComponentPattern(): void;
  cancelComponentPattern(): void;
  deleteComponentPattern(id: Id): void;
  /** Section View: the committed section (null = off) and the Property Panel being edited */
  sectionView: SectionView | null;
  sectionEdit: SectionView | null;
  /** Modify Configurations table: the dimensions (by name) and features shown */
  configure: { dims: string[]; features: Id[] } | null;
  /** drawings */
  drawingEdit: DrawingEdit | null;
  selectedDrawingViewId: Id | null;
  selectedDrawingDimensionId: Id | null;
  /** a dimension on the sheet: select it (its Property Panel opens) and change it */
  selectDrawingDimension(id: Id | null): void;
  updateDrawingDimension(id: Id, patch: Partial<DrawingSheet['dimensions'][number]>, undoable?: boolean): void;
  /** feature row selected in the Feature Tree */
  selectedFeatureId: Id | null;
  hoverFace: FaceRef | null;
  selectedFace: FaceRef | null;
  /** body edge under the pointer / selected edges (ids of the current rebuild) */
  hoverEdge: string | null;
  selectedEdges: string[];
  selection: SelectionItem[];
  selectedConstraint: Id | null;
  hover: SelectionItem | null;
  tool: ToolId;
  tab: RibbonTab;
  theme: Theme;
  panels: Record<PanelId, PanelLayout>;
  dockWidth: { left: number; right: number };
  managerTab: ManagerTab;
  managerCollapsed: boolean;
  treeFilter: string;
  /** "Sketch" was clicked without an active sketch: user picks a plane in the graphics area */
  planePick: boolean;
  /** tool to activate once the plane is picked */
  pendingTool: ToolId | null;
  hoverPlane: Sketch['plane'] | null;
  /** plane selected in the Feature Tree (click); "Sketch" then opens directly on it, by design */
  selectedPlane: Sketch['plane'] | null;
  displayStyle: DisplayStyle;
  show: { planes: boolean; origin: boolean; sketches: boolean; relations: boolean; grid: boolean; viewSelector: boolean; realisticShading: boolean; shadows: boolean; perspective: boolean; ambientOcclusion: boolean; zebra: boolean };
  reverseWheel: boolean;
  /** Tools > Options (system options + the document's properties) */
  prefs: Record<string, PrefValue>;
  unitSystem: UnitSystem;
  lastTool: ToolId;
  viewName: string;
  taskPane: TaskPaneTab;
  dialog: DialogId;
  /** Confirm Delete dialog: the feature and the items that go with it */
  confirmDelete: { id: Id; children: Id[]; absorbed: Id[]; checking: boolean } | null;
  /** confirmation corner moved to the cursor by the D key */
  confirmAtCursor: { x: number; y: number } | null;
  /** Modify-dialog for a dimension, screen position */
  modify: { id: Id; x: number; y: number } | null;
  /** cursor system-feedback symbol */
  feedback: string | null;
  /** Part Library: user libraries with sketch blocks */
  libraries: Library[];
  /** item being placed in the active sketch (click to position) */
  placing: { libraryId: Id; itemId: Id } | null;
  messages: StatusMessage[];
  cursor: SketchPoint | null;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  dirty: boolean;
  /** rollback: index into features; features after it are hidden */
  rollbackIndex: number | null;
  showRelations: boolean;
  showGrid: boolean;
  snapGrid: boolean;
  gridSize: number;
  shadedContours: boolean;

  // actions
  /** start creating a solid feature from the active sketch or the selected sketch feature */
  startFeature(type: 'extrude' | 'revolve' | 'sweep' | 'loft', op: 'boss' | 'cut', boundary?: boolean): void;
  /** start a fillet or chamfer on the selected edges */
  startRound(type: 'fillet' | 'chamfer'): void;
  /** Sheet Metal ▸ Corners ▸ Break-Corner/Corner-Trim */
  startBreakCorner(): void;
  /** Break-Corner: all corner edges through the sheet thickness */
  collectAllCorners(): void;
  startMirror(): void;
  /** Curves ▸ Split Line / Projected Curve from the open or selected sketch */
  startCurveFeature(type: 'splitLine' | 'projectedCurve'): void;
  startPattern(type: 'linearPattern' | 'circularPattern' | 'sketchPattern' | 'curvePattern' | 'tablePattern' | 'fillPattern' | 'variablePattern'): void;
  startHole(advanced?: boolean, simple?: boolean): void;
  /** Hole Tool ▸ Stud Tool: a threaded stud on the selected planar face */
  startStud(): void;
  /** Markup: freehand pen over the graphics area */
  markupMode: { color: string } | null;
  /** Isolate: only these bodies/components are shown */
  isolated: Id[] | null;
  /** Window ▸ Viewport: one view, two side by side / above each other, or four */
  viewportLayout: 'single' | 'twoH' | 'twoV' | 'four';
  setViewportLayout(l: State['viewportLayout']): void;
  setIsolated(ids: Id[] | null): void;
  /** Solid Bodies ▸ Delete Body: a Body-Delete/Keep feature */
  deleteBodies(ids: Id[]): void;
  /** Large Assembly Settings: lighter display (no edges on curved faces, no shadows) */
  largeAssembly: boolean;
  setLargeAssembly(on: boolean): void;
  /** Assembly Features ▸ Belt/Chain from the selected cylindrical faces */
  startBelt(): void;
  setMarkupMode(m: { color: string } | null): void;
  /** Render Tools ▸ Edit Decal: the decal being placed or edited */
  decalEdit: { id?: Id; name: string; face: { normal: [number, number, number]; point: [number, number, number] } | null; image: string; width: number; rotation: number; height?: number; lighting?: 'appearance' | 'custom'; brightness?: number; shininess?: number } | null;
  startDecal(id?: Id): void;
  updateDecalEdit(patch: Partial<NonNullable<State['decalEdit']>>): void;
  commitDecal(): void;
  deleteDecal(id: Id): void;
  /** Sheet Metal: Closed / Welded Corner, Corner Relief, Lofted-Bend, Convert to Sheet Metal, No Bends */
  startClosedCorner(weld?: boolean): void;
  startCornerRelief(): void;
  startLoftedBend(): void;
  startConvertSheet(insertBends?: boolean): void;
  toggleNoBends(): void;
  /** Sheet Metal: Vent, Forming Tool, Sheet Metal Gusset, Tab and Slot, Rip, Swept Flange */
  startVent(): void;
  startFormTool(shape?: FormToolFeature['shape']): void;
  startGusset(): void;
  startTabSlot(): void;
  startRip(): void;
  startSweptFlange(): void;
  /** Forming Tool: a click on the placement face adds a position */
  addFormToolPoint(p: SketchPoint): void;
  /** Sheet Metal ▸ Normal Cut: the selected Cut-Extrude becomes a normal cut (walls perpendicular to the sheet, geometry optimized) */
  applyNormalCut(): void;
  /** Trim/Extend: which box the next body pick fills (bodies to trim / trimming bodies) */
  trimFocus: 'bodies' | 'trimming';
  setTrimFocus(f: 'bodies' | 'trimming'): void;
  /** MBD Dimensions (Auto Tolerancing): the tool being defined, its face picks and parameters */
  autoToleranceEdit: { kind: 'auto' | 'datum' | 'size' | 'location' | 'pattern' | 'gtol'; faces: DxFaceRef[]; partType?: 'prismatic' | 'turned'; toleranceType?: 'plusMinus' | 'geometric'; label?: string; basic?: boolean; plus?: number; minus?: number; symbol?: AutoToleranceGtol['symbol']; value?: number; datums?: string[] } | null;
  startAutoTolerance(kind: NonNullable<State['autoToleranceEdit']>['kind']): void;
  updateAutoTolerance(patch: Partial<NonNullable<State['autoToleranceEdit']>>): void;
  commitAutoTolerance(): void;
  cancelAutoTolerance(): void;
  setAutoToleranceData(d: AutoToleranceData | undefined): void;
  deleteAllTolerances(): void;
  /** Features ▸ Deform (Point) */
  startDeform(): void;
  /** Weldments: Weldment, Structural Member, Trim/Extend, End Cap, Gusset, Weld Bead */
  startWeldment(): void;
  startStructuralMember(): void;
  startTrimExtend(): void;
  startEndCap(): void;
  startWeldGusset(): void;
  startWeldBead(): void;
  /** Sketch ▸ Offset On Surface: the edges of the selected face moved over the face (a 3D sketch) */
  offsetSurfEdit: { distance: number; reverse: boolean } | null;
  setOffsetSurfEdit(e: { distance: number; reverse: boolean } | null): void;
  commitOffsetOnSurface(): void;
  /** start a shell; the selected faces (Ctrl for more) are the faces to remove */
  startShell(): void;
  /** Features ▸ Rib: an open sketch grows into a wall until it meets the body */
  startRib(): void;
  /** Solid Bodies folder: Hide / Show Body (hidden bodies are not used for Merge result) */
  setBodyHidden(id: Id, hidden: boolean): void;
  /** Solid Bodies ▸ body ▸ Material…: the Material dialog for one body */
  openMaterialFor(bodyId: Id | null): void;
  /** Insert ▸ Features ▸ Combine… */
  startCombine(): void;
  /** Insert ▸ Features ▸ Move/Copy: the Body-Move/Copy Property Panel */
  startMoveBody(): void;
  /** Curves ▸ Helix and Spiral on a circle sketch */
  startHelix(): void;
  /** Sheet Metal ▸ Base Flange/Tab (an open sketch bends, a closed one is a tab) */
  startBaseFlange(): void;
  /** Sheet Metal ▸ Edge Flange on the selected straight edge */
  startEdgeFlange(): void;
  /** Sheet Metal ▸ Miter Flange: the selected sketch profile along the selected edges */
  startMiterFlange(): void;
  /** Sheet Metal ▸ Jog: the selected sketch line */
  startJog(): void;
  /** Sheet Metal ▸ Sketched Bend: the selected sketch line */
  startSketchedBend(): void;
  /** Features ▸ Draft: Neutral Plane / Faces to Draft picked in the graphics area */
  startDraft(): void;
  /** Surfaces ▸ Delete Face */
  startDeleteFace(): void;
  /** Features ▸ Intersect: two bodies, Regions to Exclude, Merge result */
  startIntersect(): void;
  /** Surfaces tab: Extruded / Revolved / Planar / Offset / Knit Surface */
  startSurface(kind: SurfaceFeature['kind']): void;
  /** which Draft selection box takes the next face */
  draftFocus: 'neutral' | 'faces' | 'parting';
  setDraftFocus(f: 'neutral' | 'faces' | 'parting'): void;
  /** Sheet Metal ▸ Hem on the selected straight edge */
  startHem(): void;
  /** Sheet Metal ▸ Cross-Break on a planar face */
  startCrossBreak(): void;
  /** Sheet Metal ▸ Unfold / Fold (all bends of the base flange) */
  startUnfold(kind: 'unfold' | 'fold'): void;
  /** Features ▸ Wrap */
  startWrap(): void;
  /** Hole Tool ▸ Thread on a circular edge */
  startThread(): void;
  /** Sheet Metal ▸ Flatten: show the flat pattern (toggles Flat-Pattern1) */
  toggleFlatten(): void;
  setSheetMetalEdit(open: boolean): void;
  setSketchTool(patch: Partial<SketchToolParams>): void;
  /** Edit Appearance: a colour for the part (bodyId null) or one body; null colour removes it */
  setAppearance(color: string | null, bodyId?: Id | null): void;
  /** Appearance on one face (null removes it) */
  setFaceAppearance(face: FaceRef, color: string | null): void;
  /** OK of an editing tool's Property Panel: Offset, Move/Copy/Rotate/Scale, Linear/Circular Sketch Pattern */
  applySketchTool(): void;
  /** Equation Driven Curve: an explicit curve y = f(x) from x1 to x2 (x in mm, trig in radians); false on an error */
  addEquationCurve(expr: string, x1: number, x2: number, yexpr?: string): boolean;
  /** Fully Define Sketch: add relations and dimensions until the sketch is fully defined */
  /** Pierce: the selected point onto the nearest curve of another sketch that passes through the plane */
  addPierce(pointId: Id): void;
  fullyDefine(opts: { relations: boolean; dimensions: boolean; selected?: boolean; hScheme?: 'baseline' | 'chain' | 'ordinate'; vScheme?: 'baseline' | 'chain' | 'ordinate' }): void;
  /** Convert Entities: the selected model edges (or face) projected onto the sketch plane */
  convertEntities(): void;
  /** Assembly ▸ Exploded View: open the Explode Property Panel */
  startExplode(): void;
  updateExplodeDraft(patch: Partial<ExplodeEdit['current']>): void;
  addExplodeStep(): void;
  deleteExplodeStep(id: Id): void;
  commitExplode(): void;
  cancelExplode(): void;
  /** Explode / Collapse the exploded view */
  setExploded(exploded: boolean): void;
  /** heads-up Section View: open the PM (or switch a committed section off) */
  startSectionView(): void;
  updateSectionView(patch: Partial<SectionView>): void;
  commitSectionView(): void;
  /** Drawing Section View ▸ Save */
  saveSectionView(): void;
  cancelSectionView(): void;
  setSheetMetal(params: SheetMetalParams): void;
  /** Sensors folder: add a Mass Properties sensor (Mass1, Volume1, Surface Area1) */
  addSensor(kind: 'mass' | 'volume' | 'area' | 'dimension' | 'interference', extra?: { dim?: string; alert?: { op: '>' | '<'; value: number } }): void;
  deleteSensor(id: Id): void;
  /** multi-selection of faces (Ctrl+click) */
  selectedFaces: FaceRef[];
  /** Hole Tool: add a hole position on the hole plane */
  addHolePoint(p: SketchPoint): void;
  setHoverEdge(id: string | null): void;
  toggleSelectedEdge(id: string, additive?: boolean): void;
  updateFeatureDraft(patch: Partial<ExtrudeFeature> | Partial<RevolveFeature> | Partial<RoundFeature> | Partial<MirrorFeature> | Partial<PatternFeature> | Partial<HoleFeature> | Partial<ShellFeature> | Partial<SweepFeature> | Partial<LoftFeature> | Partial<RibFeature> | Partial<CombineFeature> | Partial<BaseFlangeFeature> | Partial<EdgeFlangeFeature> | Partial<HelixFeature> | Partial<HemFeature> | Partial<MiterFlangeFeature> | Partial<JogFeature> | Partial<SketchedBendFeature> | Partial<DraftFeature> | Partial<IntersectFeature> | Partial<SurfaceFeature> | Partial<CrossBreakFeature> | Partial<WrapFeature> | Partial<ThreadFeature> | Partial<StudFeature> | Partial<SplitLineFeature> | Partial<ProjectedCurveFeature> | Partial<ClosedCornerFeature> | Partial<CornerReliefFeature> | Partial<LoftedBendFeature> | Partial<ConvertSheetFeature> | Partial<DeleteFaceFeature> | Partial<VentFeature> | Partial<FormToolFeature> | Partial<GussetFeature> | Partial<TabSlotFeature> | Partial<RipFeature> | Partial<SweptFlangeFeature> | Partial<StructuralMemberFeature> | Partial<TrimExtendFeature> | Partial<EndCapFeature> | Partial<WeldGussetFeature> | Partial<WeldBeadFeature> | Partial<DeformFeature> | Partial<MoveBodyFeature>): void;
  commitFeature(): void;
  cancelFeature(): void;
  /** Property Panel ▸ Keep Visible (pushpin): stays open after OK for the next feature of the same kind */
  pmPinned: boolean;
  togglePmPinned(): void;
  /** Extrude / Revolve ▸ Selected Contours box active: region clicks pick contours */
  contourPick: boolean;
  /** a drag handle (extrude arrow) is being dragged: the preview shows edges only */
  handleDrag: boolean;
  /** the feature under the pointer in the Feature Tree (its faces light up in the model) */
  hoverFeatureId: Id | null;
  /** Fillet / Chamfer ▸ Show selection toolbar */
  selectionToolbar: boolean;
  /** the world point where the last edge was clicked */
  edgePick: [number, number, number] | null;
  /** Thread: the optional start face box takes the next face pick */
  threadFacePick: boolean;
  /** Edge Flange: the angle face box or the Up To Vertex box takes the next pick */
  flangePick: 'face' | 'vertex' | null;
  /** Extrude ▸ Direction 2: the vertex or face box takes the next pick */
  dir2Pick: 'vertex' | 'surface' | null;
  /** Shell ▸ Multi-thickness Faces box takes the next pick */
  shellPick: 'multi' | null;
  shellMultiThickness: number;
  /** Mirror ▸ Faces to Mirror box takes the next pick */
  mirrorPick: 'faces' | null;
  /** Full Round Fillet: which face set takes the next pick */
  fullRoundPick: 'side1' | 'center' | 'side2';
  /** Mate Property Panel > Options */
  mateOpts: { newFolder: boolean; popup: boolean; preview: boolean; positionOnly: boolean };
  /** Interference Detection options */
  interferenceOpts: { coincidence: boolean; showIgnored: boolean; subassemblies: boolean; multibody: boolean; transparent: boolean };
  setContourPick(on: boolean): void;
  toggleContour(index: number): void;
  editFeature(id: Id): void;
  toggleSuppress(id: Id): void;
  /** Drag Handles: drag handles on faces (on by default, by design) */
  dragHandles: boolean;
  /** Sketch ▸ Drag Dimensions: drag handles on sketch dimensions */
  dragDimensions: boolean;
  toggleDragDimensions(): void;
  /** Sketch ▸ Rapid Sketch: a sketch tool on another plane or face starts a new sketch there */
  rapidSketch: boolean;
  toggleRapidSketch(): void;
  /** Rapid Sketch: leave the active sketch and start one on this face / plane with the same tool */
  rapidSwitch(target: { face?: FaceRef; plane?: string }): void;
  toggleDragHandles(): void;
  /** Drag Handles drag: the new depth of a blind extrusion */
  setFeatureDepth(id: Id, depth: number): void;
  setSelectedFeature(id: Id | null): void;
  setHoverFace(f: FaceRef | null): void;
  setSelectedFace(f: FaceRef | null, additive?: boolean): void;
  /** new sketch on a planar face of a body */
  sketchOnFace(f: FaceRef): void;
  newDocument(kind?: 'part' | 'assembly' | 'drawing'): void;
  // ---- assemblies
  startInsertComponent(): void;
  cancelInsertComponent(): void;
  /** place a part document as a component (first one fixed at the origin) */
  insertComponent(part: Document, opts?: { fixMode?: 'first' | 'fix' | 'float'; configuration?: string; keepOpen?: boolean; atOrigin?: boolean; position?: [number, number, number]; rotation?: [number, number, number, number]; virtual?: boolean; envelope?: boolean }): void;
  /** Insert Component: a part was chosen; it follows the pointer (null: none) */
  setInsertGhost(g: InsertGhost | null): void;
  /** the Rotate context toolbar: turn the component being placed about X / Y / Z by the angle */
  rotateInsertGhost(axis: 'x' | 'y' | 'z', deg?: number): void;
  setInsertAngle(deg: number): void;
  /** place the component being placed: at the point (a click in the graphics area) or at the origin (OK) */
  placeInsertGhost(position?: [number, number, number] | null): void;
  selectComponent(id: Id | null): void;
  setAsmTool(t: AsmTool): void;
  moveComponent(id: Id, delta: [number, number, number]): void;
  rotateComponent(id: Id, axis: [number, number, number], angleDeg: number): void;
  setComponentFixed(id: Id, fixed: boolean): void;
  setComponentHidden(id: Id, hidden: boolean): void;
  showAllComponents(): void;
  deleteComponent(id: Id): void;
  startMate(): void;
  cancelMate(): void;
  updateMateDraft(patch: Partial<Mate>): void;
  removeMateRef(index: number): void;
  commitMate(keepOpen?: boolean): void;
  editMate(id: Id): void;
  deleteMate(id: Id): void;
  setMateSuppressed(id: Id, suppressed: boolean): void;
  setInterferenceHighlight(g: THREE.BufferGeometry | null): void;
  // ---- drawings
  startModelView(): void;
  setModelViewSource(model: Document): void;
  setDrawingEdit(patch: Partial<DrawingEdit>): void;
  cancelDrawingEdit(): void;
  placeView(position: [number, number]): void;
  startProjectedView(): void;
  /** View Layout ▸ Section View: cutting line in the parent view, then place the section */
  startDrawingSection(axis?: 'h' | 'v', removed?: boolean): void;
  setSectionLine(parentId: Id, at: number): void;
  placeSectionView(position: [number, number]): void;
  /** View Layout ▸ Detail View: circle in the parent view, then place the enlarged view */
  startDetailView(): void;
  setDetailCircle(parentId: Id, center: [number, number], radius?: number, rect?: [number, number]): void;
  placeDetailView(position: [number, number]): void;
  placeProjectedView(type: DrawingViewType, position: [number, number], parentId: Id): void;
  startStandardThreeViews(): void;
  selectDrawingView(id: Id | null): void;
  /** Drawing View Property Panel: display style / scale of a placed view */
  updateDrawingView(id: Id, patch: Partial<Pick<DrawingViewT, 'displayStyle' | 'scale' | 'configuration' | 'model' | 'draftQuality' | 'trueDims' | 'threadDraft'>>): void;
  moveDrawingView(id: Id, position: [number, number]): void;
  commitViewMove(id: Id): void;
  deleteDrawingView(id: Id): void;
  startDrawingDimension(): void;
  startDrawingDimensionOnLine(viewId: Id, line: Line2D): void;
  startDrawingDimensionOnCircle(viewId: Id, circle: Circle2D): void;
  placeDrawingDimension(sheetPoint: [number, number]): void;
  startNote(): void;
  /** Annotation ▸ Balloon / Auto Balloon / Surface Finish / Geometric Tolerance / Datum Feature / Hole Callout / Centerline */
  startSymbol(kind: NonNullable<DrawingEdit['symbolKind']>): void;
  /** Revision Table: add the next revision (A, B, C …) with its description and today's date */
  addRevision(description: string): void;
  /** Sheet Format ▸ Title Block Fields */
  startTitleBlock(): void;
  /** View Layout ▸ Alternate Position View on an assembly view */
  startAltPosition(): void;
  applyAltPosition(): void;
  /** View Layout ▸ Crop View / Break on the selected view */
  startViewTool(mode: 'crop' | 'break'): void;
  startAuxView(): void;
  /** Annotation ▸ Model Items: the model's dimensions into the drawing views */
  startModelItems(): void;
  /** View Layout ▸ Broken-out Section */
  startBrokenOut(): void;
  addBrokenOutPoint(viewId: Id, p: [number, number], close: boolean): void;
  applyBrokenOut(): void;
  removeBrokenOut(viewId: Id): void;
  insertModelItems(): void;
  setAuxEdge(viewId: Id, a: [number, number], b: [number, number]): void;
  placeAuxView(position: [number, number]): void;
  setViewCrop(viewId: Id, crop: DrawingViewT['crop'] | undefined): void;
  setViewBreak(viewId: Id, br: DrawingViewT['break'] | undefined): void;
  /** Tables ▸ Bill of Materials on the sheet for the first assembly view (or the first view) */
  insertBomTable(): void;
  /** drawing tools that work by clicking on the sheet: Format Painter, Magnetic Line, Linear Note Pattern, Blocks */
  drawingTool: { kind: 'formatPainter'; source?: Id } | { kind: 'magneticLine'; a?: [number, number] } | { kind: 'block'; block: string } | { kind: 'placeTable'; id: Id } | null;
  /** dragging annotations on the sheet: one undo step per drag; a balloon on a magnetic line slides along it */
  beginAnnotationMove(): void;
  moveAnnotation(target: { kind: 'symbol' | 'note' | 'table'; id: Id }, position: [number, number]): void;
  setDrawingTool(t: State['drawingTool']): void;
  /** Tables ▸ Hole Table of a view, General Table */
  insertHoleTable(): void;
  insertGeneralTable(rows: number, cols: number): void;
  setTableCell(tableId: Id, r: number, c: number, text: string): void;
  /** sheets: add a sheet, make another one active */
  addSheet(): void;
  activateSheet(id: Id): void;
  addSymbol(sym: Omit<DrawingSymbol, 'id'>): void;
  placeNote(position: [number, number]): void;
  startCenterMark(): void;
  addCenterMark(viewId: Id, circle: Circle2D): void;
  setSheet(patch: Partial<DrawingSheet>): void;
  /** pattern being edited: toggle an instance in Instances to Skip */
  togglePatternSkip(index: number): void;
  // ---- reference planes
  startPlane(): void;
  /** Reference Geometry ▸ Axis / Point / Coordinate System: the open Property Panel and the picked planes */
  refEdit: { kind: 'axis' | 'point' | 'csys'; name: string; planes: string[]; id?: Id } | null;
  startRefGeom(kind: 'axis' | 'point' | 'csys', editId?: Id): void;
  cancelRefGeom(): void;
  commitRefGeom(): void;
  deleteRefGeom(id: Id): void;
  /** the current selection as references for Reference Geometry */
  refSelection(): RefSelection;
  updatePlaneDraft(patch: Partial<PlaneEdit['draft']>): void;
  commitPlane(): void;
  cancelPlane(): void;
  editPlane(id: Id): void;
  deletePlane(id: Id): void;
  // ---- configurations (Configurations panel)
  /** Show Configuration: apply its dimension values and suppression states */
  showConfiguration(id: Id): void;
  startAddConfiguration(parentId?: Id): void;
  /** Exploded View ▸ Animate collapse */
  animateCollapse(): void;
  editConfigurationProperties(id: Id): void;
  updateConfigDraft(patch: Partial<ConfigEdit['draft']>): void;
  commitConfiguration(): void;
  cancelConfiguration(): void;
  deleteConfiguration(id: Id): void;
  setConfigurationDimension(cfgId: Id, name: string, value: number): void;
  setConfigurationSuppressed(cfgId: Id, featureId: Id, suppressed: boolean): void;
  /** Modify Configurations: apply the table (new rows are added as copies of the active configuration) */
  applyConfigurationTable(edits: ConfigurationEdit[], newNames: string[]): void;
  /** Configure Dimension / Configure Feature: open the Modify Configurations table */
  openConfigure(target: { dims?: string[]; features?: Id[] }): void;
  closeConfigure(): void;
  /** Modify box: a value for this / all / the given configurations */
  setDimensionInConfigurations(name: string, value: number, cfgIds: Id[] | 'all'): void;
  /** assembly: the part configuration an instance shows */
  setComponentConfiguration(id: Id, name: string): void;
  /** Edit Material: apply a material of the library (null = <not specified>) */
  setMaterial(m: { name: string; density: number; color: string } | null): void;
  /** opens a document in place of the current one; the undo stack starts empty unless keepHistory is set (Return to Assembly) */
  openDocument(doc: Document, opts?: { keepHistory?: boolean }): void;
  /** Rebuild (Ctrl+B): re-solve and rebuild the open document; undo history and the unsaved flag stay as they are */
  rebuildAll(): void;
  /** a document is shown; false at start-up until New / Open / a recent document, by design */
  hasDocument: boolean;
  /** the parts open earlier in this session (File ▸ New / Open replaced them): Insert Component lists them under Open documents */
  sessionParts: Document[];
  /** show the document already loaded behind the Welcome dialog (its autosave) */
  showDocument(): void;
  /** Enter runs the last Command Ribbon command again */
  lastCommand: { label: string; run: () => void } | null;
  /** Feature Properties… / Parent/Child… work on this feature */
  dialogFeatureId: Id | null;
  /** Save As ▸ STL / 3MF / AMF: the options page exports in this format */
  exportFormat: 'stl' | '3mf' | 'amf' | 'step';
  setLastCommand(c: { label: string; run: () => void } | null): void;
  /** counts opened documents: the graphics area zooms to fit each newly opened one, by design */
  openSeq: number;
  /** replace the document as one undoable step (commands outside the store) */
  applyDocument(label: string, d: Document): void;
  /** set one model dimension by name (D1@Sketch1), re-solve and rebuild (Design Study ▸ Apply) */
  setDimensionValue(name: string, value: number): void;
  /** Tools > Equations: replace the equation list, re-solve and rebuild */
  setEquations(equations: Equation[]): void;
  /** Modify box: "= expression" links a sketch dimension to an equation (empty expression unlinks) */
  setDimensionEquation(constraintId: Id, expression: string | null): void;
  /** add an imported mesh (STL) as a feature; a fresh document is named after the file */
  /** an imported file (STL: one mesh; STEP: one mesh per solid) as Imported features, one per body */
  importMesh(source: string, positions: number[] | number[][]): void;
  setUnits(u: Units): void;
  renameDocument(name: string): void;
  newSketch(plane: Sketch['plane']): void;
  editSketch(id: Id): void;
  exitSketch(): void;
  /** delete a feature; children: also its child features, absorbed: also the sketch it consumed */
  deleteFeature(id: Id, opts?: { children?: boolean; absorbed?: boolean }): void;
  /** Delete key / menu: open the Confirm Delete dialog for a feature */
  requestDeleteFeature(id: Id): void;
  closeConfirmDelete(): void;
  /** an in-app message box (the native confirm/alert steal the keyboard in the desktop app) */
  ask: AskOptions | null;
  setAsk(ask: AskOptions | null): void;
  renameFeature(id: Id, name: string): void;
  commit(label: string, fn: (s: Sketch) => Sketch): void;
  dragPoint(pointId: Id, target: SketchPoint, phase: 'start' | 'move' | 'end'): void;
  undo(): void;
  redo(): void;
  setTool(t: ToolId): void;
  setTab(t: RibbonTab): void;
  setSelection(sel: SelectionItem[]): void;
  toggleSelect(item: SelectionItem, additive: boolean): void;
  selectConstraint(id: Id | null): void;
  setHover(h: SelectionItem | null): void;
  deleteSelection(): void;
  addRelation(kind: ConstraintKind, refs: Id[], extra?: Partial<Constraint>): void;
  updateDimension(id: Id, patch: Partial<Constraint>): void;
  /** Primary Value name: rename a sketch dimension (equations that use it follow) */
  renameDimension(id: Id, name: string): void;
  removeRelation(id: Id): void;
  toggleConstructionSelection(): void;
  setTheme(t: Theme): void;
  setPanel(id: PanelId, patch: Partial<PanelLayout>): void;
  setDockWidth(side: 'left' | 'right', w: number): void;
  pushMessage(text: string, level?: StatusMessage['level']): void;
  setCursor(p: SketchPoint | null): void;
  setRollback(i: number | null): void;
  toggle(key: 'showRelations' | 'showGrid' | 'snapGrid' | 'shadedContours'): void;
  setManagerTab(t: ManagerTab): void;
  setManagerCollapsed(v: boolean): void;
  setTreeFilter(v: string): void;
  startPlanePick(): void;
  cancelPlanePick(): void;
  setHoverPlane(p: Sketch['plane'] | null): void;
  setSelectedPlane(p: Sketch['plane'] | null): void;
  setDisplayStyle(s: DisplayStyle): void;
  toggleShow(key: keyof State['show']): void;
  setReverseWheel(v: boolean): void;
  setUnitSystem(u: UnitSystem): void;
  setViewName(n: string): void;
  setTaskPane(t: TaskPaneTab): void;
  setDialog(d: DialogId): void;
  /** Tools > Options OK: store system options per user and document properties in the document */
  setPrefs(prefs: Record<string, PrefValue>): void;
  setConfirmAtCursor(p: { x: number; y: number } | null): void;
  setModify(m: { id: Id; x: number; y: number } | null): void;
  setFeedback(f: string | null): void;
  discardSketch(): void;
  repeatLastTool(): void;
  createLibrary(name: string): Id;
  renameLibrary(id: Id, name: string): void;
  deleteLibrary(id: Id): void;
  /** add the current selection (or the whole active sketch) as an item */
  addLibraryItem(libraryId: Id, name: string): boolean;
  deleteLibraryItem(libraryId: Id, itemId: Id): void;
  startPlacing(libraryId: Id, itemId: Id): void;
  placeItem(at: SketchPoint): void;
  cancelPlacing(): void;
  importLibrary(json: string): void;
  exportLibrary(id: Id): string | null;
  mirrorSelection(): void;
}

export const history = new History<Document>();

/** a question box: Yes / No, or Yes / No / Cancel when `no` is given (Save changes to Part1?), or OK with an input */
export interface AskOptions {
  title: string;
  text: string;
  input?: string;
  yes?: (value: string) => void;
  /** a third answer: the action goes on without saving (Cancel keeps everything as it is) */
  no?: () => void;
  yesLabel?: string;
  noLabel?: string;
}
const solver = new SolverClient();
let dragBase: Document | null = null;
let msgSeq = 0;

export function solveAll(doc0: Document, prev: Record<Id, SolveResult>, only?: Id): { doc: Document; solve: Record<Id, SolveResult> } {
  // equations first: a changed global variable changes the dimension values the solver works with
  const applied = applyEquations(doc0);
  const doc = applied.doc;
  const solve = { ...prev };
  const sketches = { ...doc.sketches };
  if (applied.doc !== doc0 && only) only = undefined;
  for (const id of Object.keys(sketches)) {
    if (only && id !== only && prev[id]) continue;
    // Pierce: the point follows where its curve crosses the plane
    sketches[id] = refreshPierce({ ...doc, sketches }, sketches[id]);
    const r = solver.solveSync(sketches[id]);
    solve[id] = r;
    sketches[id] = r.sketch;
  }
  return { doc: { ...doc, sketches }, solve };
}

export function historyFlags() {
  return { canUndo: history.canUndo, canRedo: history.canRedo, undoLabel: history.undoLabel, redoLabel: history.redoLabel };
}

export const initialDoc = (typeof localStorage !== 'undefined' && loadAutosave()) || createDocument();
export const initialSolve = solveAll(initialDoc, {});

/** rebuild the solids and register the sketch planes of a document */
/** rebuild an assembly and keep the mate-solved transforms in the document (a drag moves only within the free degrees of freedom) */
export function explodeStepOf(ee: ExplodeEdit, n: number): ExplodeStep {
  const k = ee.current.reverse ? -1 : 1;
  const dir: [number, number, number] = ee.current.axis === 'x' ? [k, 0, 0] : ee.current.axis === 'y' ? [0, k, 0] : [0, 0, k];
  return { id: newId('ex'), name: `Explode Step${n}`, componentIds: [...ee.current.componentIds], dir, distance: ee.current.distance, ...(ee.current.angle ? { angle: ee.current.angle } : {}), ...(ee.autoSpace && ee.current.componentIds.length > 1 ? { autoSpace: true } : {}) };
}

/** Explode PM: show the steps plus the step being defined */
export function previewPattern(pe: PatternEdit) {
  const doc = useStore.getState().doc;
  const pats = (doc.componentPatterns ?? []).filter((p) => p.id !== pe.patternId);
  useStore.setState({ rebuild: rebuildFor({ ...doc, componentPatterns: [...pats, pe.draft] }, null) });
}

/** Mate > Show preview: once the selections are complete the components already move to the mated position */
export function refreshMatePreview() {
  const { mateEdit, doc, mateOpts } = useStore.getState();
  if (!mateEdit) return;
  const draft = mateEdit.draft;
  const ready = draft.refs.length === mateRefCount(draft.type) && draft.refs[0]?.componentId !== draft.refs[1]?.componentId;
  if (!ready || !mateOpts.preview) {
    useStore.setState({ rebuild: rebuildFor(doc, null) });
    return;
  }
  try {
    const m = splitMateRefs(draft);
    const mates = mateEdit.mateId ? (doc.mates ?? []).map((x) => (x.id === mateEdit.mateId ? m : x)) : [...(doc.mates ?? []), m];
    useStore.setState({ rebuild: rebuildFor({ ...doc, mates }, null) });
  } catch {
    /* an impossible mate shows no preview */
  }
}

/** the Configuration Properties options stored on the configuration */
export function cfgOpts(d: ConfigEdit['draft']) {
  return { descriptionInBom: d.descriptionInBom, bomName: d.bomName, bomUserName: d.bomUserName, hideChildrenInBom: d.hideChildrenInBom, suppressNew: d.suppressNew, color: d.color };
}

export function previewExplode(ee: ExplodeEdit) {
  const doc = useStore.getState().doc;
  const steps = ee.current.componentIds.length ? [...ee.steps, explodeStepOf(ee, ee.steps.length + 1)] : ee.steps;
  const rebuild = rebuildFor({ ...doc, explodeSteps: steps, exploded: true }, null);
  // Show rotation rings: a ring about the step direction around every selected component
  if (ee.rings && ee.current.componentIds.length) {
    const k = ee.current.reverse ? -1 : 1;
    const axis = new THREE.Vector3(ee.current.axis === 'x' ? k : 0, ee.current.axis === 'y' ? k : 0, ee.current.axis === 'z' ? k : 0);
    const u = Math.abs(axis.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const e1 = u.clone().cross(axis).normalize(), e2 = axis.clone().cross(e1).normalize();
    for (const id of ee.current.componentIds) {
      const b = rebuild.bodies.find((x) => x.id === id);
      if (!b) continue;
      b.geometry.computeBoundingSphere();
      const s = b.geometry.boundingSphere!;
      const pts = Array.from({ length: 65 }, (_, i) => { const t = (i / 64) * Math.PI * 2; return s.center.clone().addScaledVector(e1, Math.cos(t) * s.radius * 1.1).addScaledVector(e2, Math.sin(t) * s.radius * 1.1); });
      rebuild.curves = [...(rebuild.curves ?? []), { id: 'explode-ring-' + id, name: 'Rotation ring', points: pts, color: ee.current.axis === 'x' ? '#d0342c' : ee.current.axis === 'y' ? '#2e9d3a' : '#2f62d9' }];
    }
  }
  useStore.setState({ rebuild });
}

export function withSolvedComponents(d: Document): { doc: Document; rebuild: RebuildResult } {
  const rebuild = rebuildFor(d, null);
  const solved = (rebuild as unknown as { components?: Component[] }).components;
  const doc = solved ? { ...d, components: (d.components ?? []).map((c) => solved.find((x) => x.id === c.id) ?? c) } : d;
  return { doc, rebuild };
}

export function rebuildFor(doc: Document, rollbackIndex: number | null): RebuildResult {
  registerPlanes(doc.planes);
  try {
    if (isDrawing(doc)) return { bodies: [], errors: {}, consumedSketches: new Set() };
    if (isAssembly(doc)) return rebuildAssembly(doc);
    return rebuildDocument(doc, rollbackIndex);
  } catch (err) {
    return { bodies: [], errors: { __all: (err as Error).message }, consumedSketches: new Set() };
  }
}
export const initialRebuild = rebuildFor(initialSolve.doc, null);

/** the default decal image: a Phlippo badge */
export const DEFAULT_DECAL = 'data:image/svg+xml;base64,' + (typeof btoa !== 'undefined' ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect x="2" y="2" width="196" height="96" rx="14" fill="#1f4fa8"/><text x="100" y="64" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" fill="#ffffff">Phlippo</text></svg>') : '');

/** how many references each mate type takes (in the order the Mate Property Panel asks for them) */
export function mateRefCount(t: Mate['type']): number {
  return t === 'width' || t === 'hinge' ? 4 : t === 'symmetric' || t === 'slot' ? 3 : 2;
}
export const STANDARD_MATES = new Set<Mate['type']>(['coincident', 'parallel', 'perpendicular', 'tangent', 'concentric', 'lock', 'distance', 'angle']);
export const COUPLING_MATES = new Set<Mate['type']>(['gear', 'rackPinion', 'screw', 'universalJoint', 'linearCoupler']);
/** Mate Property Panel list -> stored mate: the first pair are the refs, the rest go to extra (width: w1, w2, t1, t2 -> refs [w1, t1], extra [w2, t2]) */
export function splitMateRefs(m: Mate): Mate {
  const r = m.refs as unknown as MateRef[];
  if (r.length <= 2) return { ...m, extra: undefined };
  if (m.type === 'width' || m.type === 'slot') return { ...m, refs: [r[0], r[2]] as [MateRef, MateRef], extra: m.type === 'width' ? [r[1], r[3]] : [r[1]] };
  return { ...m, refs: [r[0], r[1]] as [MateRef, MateRef], extra: r.slice(2) };
}
/** stored mate -> the list the Mate Property Panel shows */
export function joinMateRefs(m: Mate): Mate {
  const e = m.extra ?? [];
  if (!e.length) return { ...m, refs: [...m.refs] as [MateRef, MateRef] };
  if (m.type === 'width') return { ...m, refs: [m.refs[0], e[0], m.refs[1], e[1]] as unknown as [MateRef, MateRef] };
  if (m.type === 'slot') return { ...m, refs: [m.refs[0], e[0], m.refs[1]] as unknown as [MateRef, MateRef] };
  return { ...m, refs: [...m.refs, ...e] as unknown as [MateRef, MateRef] };
}

export function featureName(doc: Document, type: SolidFeature['type'], op: 'boss' | 'cut' = 'boss', thin = false): string {
  const bases: Record<string, string> = { fillet: 'Fillet', chamfer: 'Chamfer', mirror: 'Mirror', splitLine: 'Split Line', projectedCurve: 'Curve', closedCorner: 'Closed Corner', cornerRelief: 'Corner Relief', loftedBend: 'Lofted-Bend', convertSheet: 'Convert-Solid', linearPattern: 'LPattern', circularPattern: 'CirPattern', sketchPattern: 'Sketch-Pattern', curvePattern: 'CrvPattern', tablePattern: 'TPattern', fillPattern: 'FillPattern', variablePattern: 'VarPattern', hole: 'Hole', shell: 'Shell', imported: 'Imported', rib: 'Rib', combine: 'Combine', moveBody: 'Body-Move/Copy', baseFlange: 'Base-Flange', edgeFlange: 'Edge-Flange', miterFlange: 'Miter Flange', jog: 'Jog', sketchedBend: 'SketchBend', draft: 'Draft', intersect: 'Intersect', flatPattern: 'Flat-Pattern', helix: 'Helix/Spiral', hem: 'Hem', crossBreak: 'Cross-Break', unfold: 'Unfold', fold: 'Fold', wrap: 'Wrap', thread: 'Thread' };
  const opBase: Record<string, [string, string]> = { extrude: ['Boss-Extrude', 'Cut-Extrude'], revolve: ['Revolve', 'Cut-Revolve'], sweep: ['Sweep', 'Cut-Sweep'], loft: ['Loft', 'Cut-Loft'] };
  const base = bases[type] ?? (opBase[type] ? opBase[type][op === 'boss' ? 0 : 1] : type);
  const n = doc.features.filter((f) => f.type === type && (type in bases || (f as ExtrudeFeature).op === op)).length + 1;
  if (type === 'extrude' && op === 'boss' && thin) return `Extrude-Thin${doc.features.filter((f) => f.type === 'extrude' && f.op === 'boss' && f.thin).length + 1}`;
  return `${base}${n}`;
}

export function loadLibraries(): Library[] {
  try {
    const raw = localStorage.getItem('phlippo.libraries');
    return raw ? (JSON.parse(raw) as Library[]) : [];
  } catch {
    return [];
  }
}
export function saveLibraries(libs: Library[]): void {
  try {
    localStorage.setItem('phlippo.libraries', JSON.stringify(libs));
  } catch {
    /* ignore */
  }
}

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem('phlippo.theme');
    if (t === 'light' || t === 'dark') return t;
    // the desktop original has no dark mode: always start light (dark stays available via Ctrl+Shift+D)
    return 'light';
  } catch {
    return 'light';
  }
}

/** the sketch tools that draw entities (their Options ▸ For construction applies) */
export const DRAW_TOOLS = new Set(['line', 'centerline', 'midpointLine', 'rectangle', 'centerRectangle', 'rect3Corner', 'rect3Center', 'parallelogram', 'circle', 'perimeterCircle', 'arcCenter', 'arc3', 'tangentArc', 'polygon', 'slot', 'centerSlot', 'spline', 'ellipse', 'partialEllipse', 'point']);

/** Insert Component: the part on the pointer, its orientation and the PM options */
/** a Motion Study Property Panel being edited */
export interface MotionEdit {
  kind: 'spring' | 'contact' | 'gravity' | 'properties' | 'wizard' | 'plot';
  spring?: import('../core/assembly/motion').MotionSpring;
  contact?: { id: Id; name: string; componentIds: Id[] };
  gravity?: { dir: [number, number, number]; g: number };
  wizard?: import('../core/assembly/motion').WizardStep;
  props?: { fps: number; duration: number };
  plot?: { componentId: Id; quantity: 'displacement' | 'x' | 'y' | 'z' | 'angle' };
}

export interface InsertGhost {
  part: Document;
  rotation: [number, number, number, number];
  configuration?: string;
  fixMode?: 'first' | 'fix' | 'float';
  keepOpen?: boolean;
  virtual?: boolean;
  envelope?: boolean;
}

export type StoreSet = StoreApi<State>['setState'];
export type StoreGet = StoreApi<State>['getState'];

export const useStore = create<State>((set, get) => ({
  // the slices of src/app/slices (split by subject, QA F36); the properties below use module state of this file
  ...documentSlice(set, get),
  ...sketchSlice(set, get),
  ...featuresSlice(set, get),
  ...assemblySlice(set, get),
  ...drawingSlice(set, get),
  ...uiSlice(set, get),
  ...sheetMetalSlice(set, get),
  ...tolerancingSlice(set, get),
  ...weldmentsSlice(set, get),
  ...historyFlags(),
  dragPoint(pointId, target, phase) {
    const { doc, activeSketchId, solve } = get();
    if (!activeSketchId) return;
    if (phase === 'start') {
      dragBase = doc;
      return;
    }
    const sketch = doc.sketches[activeSketchId];
    const r = solver.solveSync(sketch, { drag: { point: pointId, target }, skipAnalysis: phase !== 'end', maxIterations: 30 });
    const d = { ...doc, sketches: { ...doc.sketches, [activeSketchId]: r.sketch } };
    if (phase === 'end') {
      if (dragBase) history.push('Drag', dragBase);
      dragBase = null;
      const full = solver.solveSync(r.sketch);
      const d2 = { ...d, sketches: { ...d.sketches, [activeSketchId]: full.sketch } };
      set({ doc: d2, solve: { ...solve, [activeSketchId]: full }, rebuild: rebuildFor(d2, get().rollbackIndex), dirty: true, ...historyFlags() });
      autosave(d2);
    } else {
      set({ doc: d, solve: { ...solve, [activeSketchId]: { ...solve[activeSketchId], sketch: r.sketch } } });
    }
  },
  pushMessage(text, level = 'info') {
    const id = ++msgSeq;
    set({ messages: [...get().messages.slice(-4), { id, text, level }] });
    setTimeout(() => set({ messages: get().messages.filter((m) => m.id !== id) }), 6000);
  },
}));

/** A command or selection is active: the Property Panel replaces the design tree. */
export const isCommandActive = (s: Pick<State, 'activeSketchId' | 'selection' | 'selectedConstraint' | 'tool' | 'planePick' | 'featureEdit' | 'mateEdit' | 'insertingComponent' | 'drawingEdit' | 'planeEdit' | 'configEdit' | 'sheetMetalEdit' | 'sectionEdit' | 'explodeEdit' | 'patternEdit' | 'sketch3dEdit' | 'analysis' | 'sensorEdit'> & Partial<Pick<State, 'motorEdit' | 'motionEdit' | 'fastenerEdit' | 'sceneEdit' | 'refEdit' | 'offsetSurfEdit' | 'decalEdit'>>): boolean =>
  !!s.refEdit || !!s.offsetSurfEdit || !!s.decalEdit || !!s.motorEdit || !!s.motionEdit || !!s.fastenerEdit || !!s.sceneEdit || s.planePick || !!s.featureEdit || !!s.mateEdit || s.insertingComponent || !!s.drawingEdit || !!s.planeEdit || !!s.configEdit || s.sheetMetalEdit || !!s.sectionEdit || !!s.explodeEdit || !!s.patternEdit || !!s.sketch3dEdit || (!!s.analysis && s.analysis.kind !== 'curvature') || !!s.sensorEdit || (!!s.activeSketchId && (s.selection.length > 0 || !!s.selectedConstraint || s.tool !== 'select'));

/** Definition status by design reports it: an empty sketch counts as under defined. */
export const sketchStatus = (sketch: Sketch | null | undefined, solve: SolveResult | null | undefined): SolveResult['status'] | null => {
  if (!sketch || !solve) return null;
  if (solve.status === 'full' && sketch.entityOrder.length === 0) return 'under';
  return solve.status;
};

/** Convenience selectors */
export const useActiveSketch = () =>
  useStore((s) => (s.activeSketchId ? s.doc.sketches[s.activeSketchId] ?? null : null));
export const useActiveSolve = () => useStore((s) => (s.activeSketchId ? s.solve[s.activeSketchId] ?? null : null));

export { solveSketch };

// autosave failures (storage full / blocked) show as a message; the desktop shell learns about unsaved changes
if (typeof window !== 'undefined') {
  setAutosaveErrorHandler((m) => useStore.getState().pushMessage(m, 'warn'));
  let lastDirty: boolean | null = null;
  useStore.subscribe((st) => {
    // a component edit counts as unsaved: closing the window asks first (F74)
    const d = st.hasDocument && (st.dirty || !!st.editContext);
    if (d !== lastDirty) {
      lastDirty = d;
      (window as unknown as { phlippoDesktop?: { setDirty?: (v: boolean) => void } }).phlippoDesktop?.setDirty?.(d);
    }
  });
}
