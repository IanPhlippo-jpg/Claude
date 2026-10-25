import { piercePoints, refreshPierce } from '../core/sketch/pierce';
import { massProperties } from '../core/features/measure';
import { keyedPose, simulateBasic } from '../core/assembly/motion';
import type { SectionPlane } from '../core/features/section';
import { sketchDimensionName } from '../core/document/equations';
import { faceOwner } from '../core/features/faceOwner';
import { create } from 'zustand';
import { createDocument, isRoundFeature, isSketchBased, isSolidFeature, type Document, type ExtrudeFeature, type HoleFeature, type MirrorFeature, type PatternFeature, type ImportedFeature, type LoftFeature, type RibFeature, type CombineFeature, type BaseFlangeFeature, type EdgeFlangeFeature, type FlatPatternFeature, type HelixFeature, type HemFeature, type MiterFlangeFeature, type JogFeature, type Sketch3DFeature, type SketchedBendFeature, type DraftFeature, type IntersectFeature, type SurfaceFeature, type CrossBreakFeature, type UnfoldFeature, type WrapFeature, type ThreadFeature, type RevolveFeature, type RoundFeature, type ShellFeature, type SolidFeature, type SweepFeature, type Units, type VentFeature, type FormToolFeature, type GussetFeature, type TabSlotFeature, type RipFeature, type SweptFlangeFeature, type StructuralMemberFeature, type TrimExtendFeature, type EndCapFeature, type WeldGussetFeature, type WeldBeadFeature, type DeformFeature } from '../core/document/types';
import { FORM_TOOL_LIBRARY } from '../core/features/sheetmetal4';
import { autoDimensionScheme, faceDistance, GTOL_SYMBOLS, type DimXpertData, type DimXpertGtol, type FaceRef as DxFaceRef } from '../core/document/dimxpert';
import { edgeRef } from '../core/features/edgesets';
import { rebuildDocument, type RebuildResult } from '../core/features/rebuild';
import { isReferencePlane, planeOnFace } from '../core/features/planes';
import { registerPlanes } from './viewport/camera';
import { History } from '../core/document/history';
import { autosave, loadAutosave, setAutosaveErrorHandler } from '../core/document/persistence';
import { fullyDefineSketch } from '../core/sketch/fullyDefine';
import { faceFilletEdges, fullRoundEdges } from '../core/features/round';
import { freeSpot, tableGrid } from '../core/drawing/tables';
import { addLine as addLineModel } from '../core/sketch/model';

/** Sketch patterns ▸ Add dimensions: the distance from the seed's first point to the same point of the first copy */
function withSpacingDimension(before: Sketch, after: Sketch, seedIds: Id[], on: boolean): Sketch {
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
function pointLineDistance(q: SketchPoint, a: SketchPoint, b: SketchPoint): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.abs((q.x - a.x) * dy - (q.y - a.y) * dx) / (Math.hypot(dx, dy) || 1);
}
import { createSketch, mirrorEntities, newId, ownerOfPoint, removeConstraint, removeEntity, updateConstraint, addConstraint, toggleConstruction, addSpline } from '../core/sketch/model';
import type { StudFeature, SplitLineFeature, ProjectedCurveFeature, ClosedCornerFeature, CornerReliefFeature, LoftedBendFeature, ConvertSheetFeature, BeltFeature, DeleteFaceFeature } from '../core/document/types';
import type { Constraint, ConstraintKind, Id, Sketch, SketchPoint } from '../core/sketch/types';
import { solveSketch, type SolveResult } from '../core/solver/solver';
import { SolverClient } from '../core/solver/solverClient';
import type { SelectionItem } from '../core/sketch/relations';
import { applyEquations, dimensionTable, evaluateExpression, setDimensionValues, type Equation } from '../core/document/equations';
import { activateConfiguration, activeConfiguration, documentForConfiguration, addConfiguration as addConfig, configurations, deleteConfiguration as deleteConfig, setConfigurationDimension as setCfgDim, setConfigurationSuppressed as setCfgSup, updateConfiguration } from '../core/document/configurations';
import { sketchChains } from '../core/features/thin';
import { sketchRegions } from '../core/features/regions';
import { applyColorScheme, DEFAULT_PREFS, getPref, loadPrefs, savePrefs, type PrefValue } from './prefs';
import { cylinderAxis, instanceName, localRef, rebuildAssembly } from '../core/assembly/assembly';
import { referencePlane, resolvePlaneDef } from '../core/features/planes';
import { DEFAULT_SHEET_METAL, type SheetMetalParams } from '../core/features/sheetmetal';
import { circularSketchPattern, convertPolylines, copyEntities, linearSketchPattern, offsetEntities, rotateAbout, scaleAbout, transformEntities, translate, chainOf, dropOutsideRelations, copyEntitiesKeep } from '../core/sketch/edit';
import { planeMatrix } from '../core/features/solid';
import { isAssembly, isDrawing, type DrawingSymbol, type DrawingView as DrawingViewT, type ComponentPattern, type ExplodeStep, type Component, type DrawingDimension, type DrawingSheet, type DrawingView, type DrawingViewType, type Mate, type MateRef } from '../core/document/types';
import { modelItems } from './drawing/modelItems';
import { fitCylinder } from '../core/features/wrap';
import { assemblyHoles, fastenerSlots, placeFasteners } from '../core/assembly/fasteners';
import { circleOfEdge, insideBody, METRIC_THREADS, nearestThread } from '../core/features/thread';

/** A circular edge as a thread start: centre, axis into the material, radius, hole or rod. */
function threadEdge(g: THREE.BufferGeometry, points: THREE.Vector3[], index: number): NonNullable<ThreadFeature['edge']> | null {
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
import { trueLength, viewDepth } from '../core/drawing/sheet';
import { sectionFlipFor, nextViewLabel, viewGeometry, dimensionValue, nextViewName, standardThreeViews as buildThreeViews, threeViewsCentre, autoSheetScale, viewToSheet as _viewToSheet, projectedView as _projectedView } from '../core/drawing/sheet';
import type { Circle2D, Line2D } from '../core/drawing/hlr';
import * as THREE from 'three';
import { extractBlock, insertBlock, type Block } from '../core/sketch/blocks';
import { featureDependents, geometricChildren } from '../core/features/dependents';
import { refGeometryFrom, type RefSelection } from '../core/features/refgeom';
import { faceBoundary, offsetPolygon } from '../core/features/patterns2';

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
export type ManagerTab = 'tree' | 'properties' | 'configurations' | 'dimxpert' | 'display';
export type DisplayStyle = 'wireframe' | 'hiddenVisible' | 'hiddenRemoved' | 'shaded' | 'shadedEdges';
export type UnitSystem = 'MKS' | 'CGS' | 'MMGS' | 'IPS';
export type TaskPaneTab = 'library' | 'relations' | 'properties' | 'resources' | 'marketplace' | 'forum' | 'explorer' | 'palette' | 'appearances' | 'platform' | 'recovery' | null;
export type DialogId = 'welcome' | 'new' | 'options' | 'orientation' | 'mass' | 'measure' | 'equations' | 'bom' | 'interference' | 'sheetFormat' | 'sheetProperties' | 'material' | 'configure' | 'appearance' | 'check' | 'sectionProps' | 'repairSketch' | 'finalRender' | 'designStudy' | 'previewWindow' | 'mirrorComponents' | 'packAndGo' | 'share' | 'comments' | 'componentPreview' | 'relativeView' | 'spellCheck' | 'notePattern' | 'generalTable' | 'featureProps' | 'parentChild' | 'exportOptions' | 'customize' | 'performance' | 'deviation' | 'symmetry' | 'compare' | 'simxpress' | 'edrawings' | 'cutList' | 'saveAs' | null;

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
/** Explode PropertyManager: the steps so far and the step being defined */
/** Linear / Circular Component Pattern PropertyManager */
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
/** ConfigurationManager: Add Configuration / Configuration Properties PropertyManager */
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

/** a solid feature being created or edited in the PropertyManager (yellow preview) */
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

interface State {
  doc: Document;
  /** sketch currently being edited */
  activeSketchId: Id | null;
  solve: Record<Id, SolveResult>;
  /** solid bodies built from the feature history (up to the rollback bar) */
  rebuild: RebuildResult;
  featureEdit: FeatureEdit | null;
  /** assembly: the Mate PropertyManager */
  mateEdit: MateEdit | null;
  /** assembly: Insert Component PropertyManager open */
  insertingComponent: boolean;
  /** Insert Component: the chosen part follows the pointer until a click places it (the original's graphics preview) */
  insertGhost: InsertGhost | null;
  /** Insert Component: the angle of the Rotate context toolbar */
  insertAngle: number;
  /** assembly: Move / Rotate Component tool */
  asmTool: AsmTool;
  /** Interference Detection: the overlap solid to show */
  interferenceHighlight: THREE.BufferGeometry | null;
  /** Reference Geometry ▸ Plane */
  planeEdit: PlaneEdit | null;
  /** ConfigurationManager: Add Configuration / Properties */
  configEdit: ConfigEdit | null;
  /** Material dialog opened for one body of the Solid Bodies folder (null = the part) */
  materialTarget: Id | null;
  /** Sheet-Metal1 PropertyManager (thickness, bend radius, K-factor) */
  sheetMetalEdit: boolean;
  /** sketch editing tool parameters (PropertyManager values) */
  sketchTool: SketchToolParams;
  /** assembly: Explode PropertyManager */
  explodeEdit: ExplodeEdit | null;
  /** Motion Study 1 tab open (MotionManager under the graphics area), playback time and state, motor being defined */
  motionOpen: boolean;
  /** Render Tools: Edit Scene PropertyManager open; the last Final Render image (data URL) */
  sceneEdit: boolean;
  finalImage: string | null;
  setSceneEdit(open: boolean): void;
  setScene(patch: Partial<NonNullable<Document['scene']>>): void;
  setFinalImage(img: string | null): void;
  /** Smart Fasteners being defined: one fastener per group of coaxial Hole Wizard holes */
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
  /** the Spring / Contact / Gravity / Motion Study Properties / Animation Wizard / Results and Plots PropertyManager */
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
  editContext: { assembly: Document; componentName: string; partName: string } | null;
  /** Evaluate ▸ Sensor PropertyManager (Mass Properties: Mass / Volume / Surface Area) */
  sensorEdit: { kind: 'mass' | 'volume' | 'area' | 'dimension' | 'interference'; dim?: string; alert?: { op: '>' | '<'; value: number } } | null;
  setSensorEdit(e: State['sensorEdit']): void;
  /** open the selected component's part for editing (Edit Component) */
  editComponent(id?: Id | null): void;
  /** Edit Component off: every instance of the part takes the edited version, the assembly comes back */
  returnToAssembly(): void;
  /** feature PropertyManager eye: show the model with the feature applied instead of the yellow preview */
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
  /** Section View: the committed section (null = off) and the PropertyManager being edited */
  sectionView: SectionView | null;
  sectionEdit: SectionView | null;
  /** Modify Configurations table: the dimensions (by name) and features shown */
  configure: { dims: string[]; features: Id[] } | null;
  /** drawings */
  drawingEdit: DrawingEdit | null;
  selectedDrawingViewId: Id | null;
  selectedDrawingDimensionId: Id | null;
  /** a dimension on the sheet: select it (its PropertyManager opens) and change it */
  selectDrawingDimension(id: Id | null): void;
  updateDrawingDimension(id: Id, patch: Partial<DrawingSheet['dimensions'][number]>, undoable?: boolean): void;
  /** feature row selected in the FeatureManager */
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
  /** plane selected in the FeatureManager (click); "Sketch" then opens directly on it, like the original */
  selectedPlane: Sketch['plane'] | null;
  displayStyle: DisplayStyle;
  show: { planes: boolean; origin: boolean; sketches: boolean; relations: boolean; grid: boolean; viewSelector: boolean; realView: boolean; shadows: boolean; perspective: boolean; ambientOcclusion: boolean; zebra: boolean };
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
  /** Design Library: user libraries with sketch blocks */
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
  /** Hole Wizard ▸ Stud Wizard: a threaded stud on the selected planar face */
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
  /** MBD Dimensions (DimXpert): the tool being defined, its face picks and parameters */
  dimxpertEdit: { kind: 'auto' | 'datum' | 'size' | 'location' | 'pattern' | 'gtol'; faces: DxFaceRef[]; partType?: 'prismatic' | 'turned'; toleranceType?: 'plusMinus' | 'geometric'; label?: string; basic?: boolean; plus?: number; minus?: number; symbol?: DimXpertGtol['symbol']; value?: number; datums?: string[] } | null;
  startDimXpert(kind: NonNullable<State['dimxpertEdit']>['kind']): void;
  updateDimXpert(patch: Partial<NonNullable<State['dimxpertEdit']>>): void;
  commitDimXpert(): void;
  cancelDimXpert(): void;
  setDimXpertData(d: DimXpertData | undefined): void;
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
  /** Hole Wizard ▸ Thread on a circular edge */
  startThread(): void;
  /** Sheet Metal ▸ Flatten: show the flat pattern (toggles Flat-Pattern1) */
  toggleFlatten(): void;
  setSheetMetalEdit(open: boolean): void;
  setSketchTool(patch: Partial<SketchToolParams>): void;
  /** Edit Appearance: a colour for the part (bodyId null) or one body; null colour removes it */
  setAppearance(color: string | null, bodyId?: Id | null): void;
  /** Appearance on one face (null removes it) */
  setFaceAppearance(face: FaceRef, color: string | null): void;
  /** OK of an editing tool's PropertyManager: Offset, Move/Copy/Rotate/Scale, Linear/Circular Sketch Pattern */
  applySketchTool(): void;
  /** Equation Driven Curve: an explicit curve y = f(x) from x1 to x2 (x in mm, trig in radians); false on an error */
  addEquationCurve(expr: string, x1: number, x2: number, yexpr?: string): boolean;
  /** Fully Define Sketch: add relations and dimensions until the sketch is fully defined */
  /** Pierce: the selected point onto the nearest curve of another sketch that passes through the plane */
  addPierce(pointId: Id): void;
  fullyDefine(opts: { relations: boolean; dimensions: boolean; selected?: boolean; hScheme?: 'baseline' | 'chain' | 'ordinate'; vScheme?: 'baseline' | 'chain' | 'ordinate' }): void;
  /** Convert Entities: the selected model edges (or face) projected onto the sketch plane */
  convertEntities(): void;
  /** Assembly ▸ Exploded View: open the Explode PropertyManager */
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
  /** Hole Wizard: add a hole position on the hole plane */
  addHolePoint(p: SketchPoint): void;
  setHoverEdge(id: string | null): void;
  toggleSelectedEdge(id: string, additive?: boolean): void;
  updateFeatureDraft(patch: Partial<ExtrudeFeature> | Partial<RevolveFeature> | Partial<RoundFeature> | Partial<MirrorFeature> | Partial<PatternFeature> | Partial<HoleFeature> | Partial<ShellFeature> | Partial<SweepFeature> | Partial<LoftFeature> | Partial<RibFeature> | Partial<CombineFeature> | Partial<BaseFlangeFeature> | Partial<EdgeFlangeFeature> | Partial<HelixFeature> | Partial<HemFeature> | Partial<MiterFlangeFeature> | Partial<JogFeature> | Partial<SketchedBendFeature> | Partial<DraftFeature> | Partial<IntersectFeature> | Partial<SurfaceFeature> | Partial<CrossBreakFeature> | Partial<WrapFeature> | Partial<ThreadFeature> | Partial<StudFeature> | Partial<SplitLineFeature> | Partial<ProjectedCurveFeature> | Partial<ClosedCornerFeature> | Partial<CornerReliefFeature> | Partial<LoftedBendFeature> | Partial<ConvertSheetFeature> | Partial<DeleteFaceFeature> | Partial<VentFeature> | Partial<FormToolFeature> | Partial<GussetFeature> | Partial<TabSlotFeature> | Partial<RipFeature> | Partial<SweptFlangeFeature> | Partial<StructuralMemberFeature> | Partial<TrimExtendFeature> | Partial<EndCapFeature> | Partial<WeldGussetFeature> | Partial<WeldBeadFeature> | Partial<DeformFeature>): void;
  commitFeature(): void;
  cancelFeature(): void;
  /** PropertyManager ▸ Keep Visible (pushpin): stays open after OK for the next feature of the same kind */
  pmPinned: boolean;
  togglePmPinned(): void;
  /** Extrude / Revolve ▸ Selected Contours box active: region clicks pick contours */
  contourPick: boolean;
  /** a drag handle (extrude arrow) is being dragged: the preview shows edges only */
  handleDrag: boolean;
  /** the feature under the pointer in the FeatureManager (its faces light up in the model) */
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
  /** Mate PropertyManager > Options */
  mateOpts: { newFolder: boolean; popup: boolean; preview: boolean; positionOnly: boolean };
  /** Interference Detection options */
  interferenceOpts: { coincidence: boolean; showIgnored: boolean; subassemblies: boolean; multibody: boolean; transparent: boolean };
  setContourPick(on: boolean): void;
  toggleContour(index: number): void;
  editFeature(id: Id): void;
  toggleSuppress(id: Id): void;
  /** Instant3D: drag handles on faces (on by default, as the original) */
  instant3d: boolean;
  /** Sketch ▸ Instant2D: drag handles on sketch dimensions */
  instant2d: boolean;
  toggleInstant2D(): void;
  /** Sketch ▸ Rapid Sketch: a sketch tool on another plane or face starts a new sketch there */
  rapidSketch: boolean;
  toggleRapidSketch(): void;
  /** Rapid Sketch: leave the active sketch and start one on this face / plane with the same tool */
  rapidSwitch(target: { face?: FaceRef; plane?: string }): void;
  toggleInstant3D(): void;
  /** Instant3D drag: the new depth of a blind extrusion */
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
  /** Drawing View PropertyManager: display style / scale of a placed view */
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
  /** Reference Geometry ▸ Axis / Point / Coordinate System: the open PropertyManager and the picked planes */
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
  // ---- configurations (ConfigurationManager)
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
  openDocument(doc: Document): void;
  /** Rebuild (Ctrl+B): re-solve and rebuild the open document; undo history and the unsaved flag stay as they are */
  rebuildAll(): void;
  /** a document is shown; false at start-up until New / Open / a recent document, as the original */
  hasDocument: boolean;
  /** show the document already loaded behind the Welcome dialog (its autosave) */
  showDocument(): void;
  /** Enter runs the last CommandManager command again */
  lastCommand: { label: string; run: () => void } | null;
  /** Feature Properties… / Parent/Child… work on this feature */
  dialogFeatureId: Id | null;
  /** Save As ▸ STL / 3MF / AMF: the options page exports in this format */
  exportFormat: 'stl' | '3mf' | 'amf';
  setLastCommand(c: { label: string; run: () => void } | null): void;
  /** counts opened documents: the graphics area zooms to fit each newly opened one, as the original */
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
  importMesh(source: string, positions: number[]): void;
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

const history = new History<Document>();

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

function solveAll(doc0: Document, prev: Record<Id, SolveResult>, only?: Id): { doc: Document; solve: Record<Id, SolveResult> } {
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

function historyFlags() {
  return { canUndo: history.canUndo, canRedo: history.canRedo, undoLabel: history.undoLabel, redoLabel: history.redoLabel };
}

const initialDoc = (typeof localStorage !== 'undefined' && loadAutosave()) || createDocument();
const initialSolve = solveAll(initialDoc, {});

/** rebuild the solids and register the sketch planes of a document */
/** rebuild an assembly and keep the mate-solved transforms in the document (a drag moves only within the free degrees of freedom) */
function explodeStepOf(ee: ExplodeEdit, n: number): ExplodeStep {
  const k = ee.current.reverse ? -1 : 1;
  const dir: [number, number, number] = ee.current.axis === 'x' ? [k, 0, 0] : ee.current.axis === 'y' ? [0, k, 0] : [0, 0, k];
  return { id: newId('ex'), name: `Explode Step${n}`, componentIds: [...ee.current.componentIds], dir, distance: ee.current.distance, ...(ee.current.angle ? { angle: ee.current.angle } : {}), ...(ee.autoSpace && ee.current.componentIds.length > 1 ? { autoSpace: true } : {}) };
}

/** Explode PM: show the steps plus the step being defined */
function previewPattern(pe: PatternEdit) {
  const doc = useStore.getState().doc;
  const pats = (doc.componentPatterns ?? []).filter((p) => p.id !== pe.patternId);
  useStore.setState({ rebuild: rebuildFor({ ...doc, componentPatterns: [...pats, pe.draft] }, null) });
}

/** Mate > Show preview: once the selections are complete the components already move to the mated position */
function refreshMatePreview() {
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
function cfgOpts(d: ConfigEdit['draft']) {
  return { descriptionInBom: d.descriptionInBom, bomName: d.bomName, bomUserName: d.bomUserName, hideChildrenInBom: d.hideChildrenInBom, suppressNew: d.suppressNew, color: d.color };
}

function previewExplode(ee: ExplodeEdit) {
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

function withSolvedComponents(d: Document): { doc: Document; rebuild: RebuildResult } {
  const rebuild = rebuildFor(d, null);
  const solved = (rebuild as unknown as { components?: Component[] }).components;
  const doc = solved ? { ...d, components: (d.components ?? []).map((c) => solved.find((x) => x.id === c.id) ?? c) } : d;
  return { doc, rebuild };
}

function rebuildFor(doc: Document, rollbackIndex: number | null): RebuildResult {
  registerPlanes(doc.planes);
  try {
    if (isDrawing(doc)) return { bodies: [], errors: {}, consumedSketches: new Set() };
    if (isAssembly(doc)) return rebuildAssembly(doc);
    return rebuildDocument(doc, rollbackIndex);
  } catch (err) {
    return { bodies: [], errors: { __all: (err as Error).message }, consumedSketches: new Set() };
  }
}
const initialRebuild = rebuildFor(initialSolve.doc, null);

/** the default decal image: a Phlippo badge */
export const DEFAULT_DECAL = 'data:image/svg+xml;base64,' + (typeof btoa !== 'undefined' ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect x="2" y="2" width="196" height="96" rx="14" fill="#1f4fa8"/><text x="100" y="64" font-family="Arial" font-size="40" font-weight="bold" text-anchor="middle" fill="#ffffff">Phlippo</text></svg>') : '');

/** how many references each mate type takes (in the order the Mate PropertyManager asks for them) */
export function mateRefCount(t: Mate['type']): number {
  return t === 'width' || t === 'hinge' ? 4 : t === 'symmetric' || t === 'slot' ? 3 : 2;
}
export const STANDARD_MATES = new Set<Mate['type']>(['coincident', 'parallel', 'perpendicular', 'tangent', 'concentric', 'lock', 'distance', 'angle']);
export const COUPLING_MATES = new Set<Mate['type']>(['gear', 'rackPinion', 'screw', 'universalJoint', 'linearCoupler']);
/** Mate PropertyManager list -> stored mate: the first pair are the refs, the rest go to extra (width: w1, w2, t1, t2 -> refs [w1, t1], extra [w2, t2]) */
function splitMateRefs(m: Mate): Mate {
  const r = m.refs as unknown as MateRef[];
  if (r.length <= 2) return { ...m, extra: undefined };
  if (m.type === 'width' || m.type === 'slot') return { ...m, refs: [r[0], r[2]] as [MateRef, MateRef], extra: m.type === 'width' ? [r[1], r[3]] : [r[1]] };
  return { ...m, refs: [r[0], r[1]] as [MateRef, MateRef], extra: r.slice(2) };
}
/** stored mate -> the list the Mate PropertyManager shows */
function joinMateRefs(m: Mate): Mate {
  const e = m.extra ?? [];
  if (!e.length) return { ...m, refs: [...m.refs] as [MateRef, MateRef] };
  if (m.type === 'width') return { ...m, refs: [m.refs[0], e[0], m.refs[1], e[1]] as unknown as [MateRef, MateRef] };
  if (m.type === 'slot') return { ...m, refs: [m.refs[0], e[0], m.refs[1]] as unknown as [MateRef, MateRef] };
  return { ...m, refs: [...m.refs, ...e] as unknown as [MateRef, MateRef] };
}

function featureName(doc: Document, type: SolidFeature['type'], op: 'boss' | 'cut' = 'boss', thin = false): string {
  const bases: Record<string, string> = { fillet: 'Fillet', chamfer: 'Chamfer', mirror: 'Mirror', splitLine: 'Split Line', projectedCurve: 'Curve', closedCorner: 'Closed Corner', cornerRelief: 'Corner Relief', loftedBend: 'Lofted-Bend', convertSheet: 'Convert-Solid', linearPattern: 'LPattern', circularPattern: 'CirPattern', sketchPattern: 'Sketch-Pattern', curvePattern: 'CrvPattern', tablePattern: 'TPattern', fillPattern: 'FillPattern', variablePattern: 'VarPattern', hole: 'Hole', shell: 'Shell', imported: 'Imported', rib: 'Rib', combine: 'Combine', baseFlange: 'Base-Flange', edgeFlange: 'Edge-Flange', miterFlange: 'Miter Flange', jog: 'Jog', sketchedBend: 'SketchBend', draft: 'Draft', intersect: 'Intersect', flatPattern: 'Flat-Pattern', helix: 'Helix/Spiral', hem: 'Hem', crossBreak: 'Cross-Break', unfold: 'Unfold', fold: 'Fold', wrap: 'Wrap', thread: 'Thread' };
  const opBase: Record<string, [string, string]> = { extrude: ['Boss-Extrude', 'Cut-Extrude'], revolve: ['Revolve', 'Cut-Revolve'], sweep: ['Sweep', 'Cut-Sweep'], loft: ['Loft', 'Cut-Loft'] };
  const base = bases[type] ?? (opBase[type] ? opBase[type][op === 'boss' ? 0 : 1] : type);
  const n = doc.features.filter((f) => f.type === type && (type in bases || (f as ExtrudeFeature).op === op)).length + 1;
  if (type === 'extrude' && op === 'boss' && thin) return `Extrude-Thin${doc.features.filter((f) => f.type === 'extrude' && f.op === 'boss' && f.thin).length + 1}`;
  return `${base}${n}`;
}

function loadLibraries(): Library[] {
  try {
    const raw = localStorage.getItem('phlippo.libraries');
    return raw ? (JSON.parse(raw) as Library[]) : [];
  } catch {
    return [];
  }
}
function saveLibraries(libs: Library[]): void {
  try {
    localStorage.setItem('phlippo.libraries', JSON.stringify(libs));
  } catch {
    /* ignore */
  }
}

function loadTheme(): Theme {
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
const DRAW_TOOLS = new Set(['line', 'centerline', 'midpointLine', 'rectangle', 'centerRectangle', 'rect3Corner', 'rect3Center', 'parallelogram', 'circle', 'perimeterCircle', 'arcCenter', 'arc3', 'tangentArc', 'polygon', 'slot', 'centerSlot', 'spline', 'ellipse', 'partialEllipse', 'point']);

/** Insert Component: the part on the pointer, its orientation and the PM options */
/** a Motion Study PropertyManager being edited */
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

export const useStore = create<State>((set, get) => ({
  doc: initialSolve.doc,
  activeSketchId: null,
  solve: initialSolve.solve,
  rebuild: initialRebuild,
  featureEdit: null,
  mateEdit: null,
  insertingComponent: false,
  insertGhost: null,
  insertAngle: 90,
  asmTool: 'select',
  interferenceHighlight: null,
  planeEdit: null,
  refEdit: null,
  offsetSurfEdit: null,
  decalEdit: null,
  markupMode: null,
  isolated: null,
  viewportLayout: 'single',
  drawingTool: null,
  openSeq: 0,
  pmPinned: false,
  contourPick: false,
  handleDrag: false,
  hoverFeatureId: null,
  selectionToolbar: true,
  edgePick: null,
  threadFacePick: false,
  flangePick: null,
  dir2Pick: null,
  shellPick: null,
  shellMultiThickness: 2,
  mirrorPick: null,
  fullRoundPick: 'side1',
  mateOpts: { newFolder: false, popup: true, preview: true, positionOnly: false },
  interferenceOpts: { coincidence: false, showIgnored: false, subassemblies: true, multibody: false, transparent: true },
  largeAssembly: false,
  configEdit: null,
  configure: null,
  materialTarget: null,
  sheetMetalEdit: false,
  sectionView: null,
  sectionEdit: null,
  explodeEdit: null,
  motionOpen: false,
  sceneEdit: false,
  finalImage: null,
  setSceneEdit(sceneEdit) {
    set({ sceneEdit, managerTab: 'tree' });
  },
  setScene(patch) {
    const { doc } = get();
    const d: Document = { ...doc, scene: { background: 'gradient', ...(doc.scene ?? {}), ...patch } };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  setFinalImage(finalImage) {
    set({ finalImage, dialog: finalImage ? 'finalRender' : null });
  },
  fastenerEdit: null,
  startSmartFasteners() {
    const { doc, rebuild } = get();
    if (!isAssembly(doc)) return;
    const holes = assemblyHoles(doc, rebuild.bodies);
    if (!holes.length) {
      get().pushMessage('Smart Fasteners needs Hole Wizard holes in the components.', 'warn');
      return;
    }
    set({ fastenerEdit: { slots: fastenerSlots(holes), autoLength: true }, managerTab: 'tree', tab: 'assembly' });
  },
  updateFastenerSlot(i, patch) {
    const fe = get().fastenerEdit;
    if (!fe) return;
    set({ fastenerEdit: { ...fe, slots: fe.slots.map((s, k) => (k === i ? { ...s, ...patch } : s)) } });
  },
  commitSmartFasteners() {
    const { doc, fastenerEdit } = get();
    if (!fastenerEdit || !isAssembly(doc)) return;
    history.push('Smart Fasteners', doc);
    const placed = placeFasteners(doc, fastenerEdit.slots);
    const r = withSolvedComponents({ ...doc, components: [...(doc.components ?? []), ...placed.components], mates: [...(doc.mates ?? []), ...placed.mates] });
    set({ doc: r.doc, rebuild: r.rebuild, fastenerEdit: null, dirty: true, ...historyFlags() });
    get().pushMessage(`${placed.components.length} fastener${placed.components.length === 1 ? '' : 's'} added.`);
    autosave(r.doc);
  },
  cancelSmartFasteners() {
    set({ fastenerEdit: null });
  },
  motionTime: 0,
  motionPlaying: false,
  motorEdit: null,
  motionSim: null,
  triadComponentId: null,
  motionAutokey: false,
  motionEdit: null,
  startMotionEdit(kind) {
    const { doc, selectedFeatureId } = get();
    const comps = (doc.components ?? []).filter((c) => !c.suppressed);
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const free = comps.filter((c) => !c.fixed);
    const sel = comps.find((c) => c.id === selectedFeatureId);
    const n = (k: 'springs' | 'contacts') => (study[k]?.length ?? 0) + 1;
    const draft: MotionEdit = kind === 'spring'
      ? { kind, spring: { id: newId('sp'), name: `LinearSpring${n('springs')}`, a: { componentId: (sel ?? free[0] ?? comps[0])?.id ?? '', point: [0, 0, 0] }, b: { componentId: (comps.find((c) => c.fixed) ?? comps[1] ?? comps[0])?.id ?? '', point: [0, 0, 0] }, k: 0.1, freeLength: 50, damping: 0 } }
      : kind === 'contact' ? { kind, contact: { id: newId('ct'), name: `Contact${n('contacts')}`, componentIds: comps.slice(0, 2).map((c) => c.id) } }
      : kind === 'gravity' ? { kind, gravity: study.gravity ?? { dir: [0, -1, 0], g: 9810 } }
      : kind === 'wizard' ? { kind, wizard: { kind: 'rotate', axis: 'y', turns: 1, start: 0, duration: Math.min(10, study.duration) } }
      : kind === 'plot' ? { kind, plot: { componentId: free[0]?.id ?? comps[0]?.id ?? '', quantity: 'displacement' } }
      : { kind: 'properties', props: { fps: study.fps ?? 25, duration: study.duration } };
    set({ motionEdit: draft, motionPlaying: false, managerTab: 'tree' });
  },
  updateMotionEdit(patch) {
    const me = get().motionEdit;
    if (me) set({ motionEdit: { ...me, ...patch } as MotionEdit });
  },
  commitMotionEdit() {
    const { doc, motionEdit: me } = get();
    if (!me) return;
    if (me.kind === 'plot') {
      set({ motionEdit: null });
      return;
    }
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    let next = study;
    if (me.kind === 'spring' && me.spring) {
      if (!me.spring.a.componentId || !me.spring.b.componentId || me.spring.a.componentId === me.spring.b.componentId) return get().pushMessage('Select two different components for the spring.', 'warn');
      next = { ...study, springs: [...(study.springs ?? []).filter((s) => s.id !== me.spring!.id), me.spring], type: 'basic' };
    } else if (me.kind === 'contact' && me.contact) {
      if (me.contact.componentIds.length < 2) return get().pushMessage('A contact needs at least two components.', 'warn');
      next = { ...study, contacts: [...(study.contacts ?? []).filter((s) => s.id !== me.contact!.id), me.contact], type: 'basic' };
    } else if (me.kind === 'gravity' && me.gravity) next = { ...study, gravity: me.gravity, type: 'basic' };
    else if (me.kind === 'wizard' && me.wizard) {
      // the study grows to hold the wizard's step, as the original
      const end = me.wizard.start + me.wizard.duration;
      next = { ...study, wizard: [...(study.wizard ?? []), me.wizard], duration: Math.max(study.duration, end) };
    } else if (me.kind === 'properties' && me.props) next = { ...study, fps: Math.max(1, Math.round(me.props.fps)), duration: Math.max(0.5, me.props.duration) };
    history.push(me.kind === 'wizard' ? 'Animation Wizard' : me.kind[0].toUpperCase() + me.kind.slice(1), doc);
    const d: Document = { ...doc, motionStudy: next };
    set({ doc: d, motionEdit: null, motionSim: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMotionStudy(patch) {
    const { doc } = get();
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const d: Document = { ...doc, motionStudy: { ...study, ...patch } };
    set({ doc: d, dirty: true, motionSim: patch.type ? null : get().motionSim });
    autosave(d);
  },
  calculateMotion() {
    const { doc, rebuild } = get();
    const study = doc.motionStudy;
    if (!study || (study.type ?? 'animation') !== 'basic') {
      set({ motionSim: null });
      return;
    }
    const comps = (rebuild as unknown as { components?: Component[] }).components ?? doc.components ?? [];
    const bodies = rebuild.bodies.filter((b) => comps.some((c) => c.id === b.id)).map((b) => {
      const comp = comps.find((c) => c.id === b.id)!;
      return { id: b.id, geometry: b.geometry, mass: massProperties(b.geometry, comp.part.material ? comp.part.material.density / 1e6 : 0.001).mass };
    });
    const sim = simulateBasic(comps, bodies, study, doc.mates ?? []);
    set({ motionSim: sim });
    if (!Object.keys(sim.frames).length) get().pushMessage('Basic Motion: nothing moves. Add gravity or a spring to a component without mates.', 'warn');
  },
  setMotionAutokey(motionAutokey) {
    set({ motionAutokey });
  },
  addMotionKey(ids) {
    const { doc, motionTime } = get();
    if (motionTime <= 1e-9) return get().pushMessage('Move the time bar past 0 to add a key there.', 'warn');
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const comps = (doc.components ?? []).filter((c) => !ids || ids.includes(c.id));
    const keys = (study.keys ?? []).filter((k) => !(Math.abs(k.time - motionTime) < 1e-6 && comps.some((c) => c.id === k.componentId)));
    for (const c of comps) {
      const p = keyedPose(c, study.keys ?? [], motionTime);
      keys.push({ componentId: c.id, time: motionTime, position: p ? (p.position.toArray() as [number, number, number]) : c.position, rotation: p ? (p.rotation.toArray() as [number, number, number, number]) : c.rotation });
    }
    history.push('Add Key', doc);
    const d: Document = { ...doc, motionStudy: { ...study, keys } };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteMotionItem(kind, id) {
    const { doc } = get();
    const study = doc.motionStudy;
    if (!study) return;
    history.push('Delete', doc);
    const next = kind === 'spring' ? { ...study, springs: (study.springs ?? []).filter((s) => s.id !== id) }
      : kind === 'contact' ? { ...study, contacts: (study.contacts ?? []).filter((s) => s.id !== id) }
      : kind === 'gravity' ? { ...study, gravity: undefined }
      : kind === 'wizard' ? { ...study, wizard: (study.wizard ?? []).filter((_, i) => String(i) !== id) }
      : { ...study, keys: (study.keys ?? []).filter((k) => k.componentId !== id) };
    const d: Document = { ...doc, motionStudy: next };
    set({ doc: d, dirty: true, motionSim: null, ...historyFlags() });
    autosave(d);
  },
  setMotionOpen(open) {
    set({ motionOpen: open, motionPlaying: false, motionTime: 0 });
  },
  setMotionTime(t) {
    set({ motionTime: t });
  },
  setMotionPlaying(p) {
    set({ motionPlaying: p });
  },
  startMotor() {
    const { doc, selectedFace, selectedFeatureId } = get();
    const selectedComponentId = selectedFace?.bodyId ?? selectedFeatureId;
    const comps = (doc.components ?? []).filter((c) => !c.fixed);
    const comp = comps.find((c) => c.id === selectedComponentId) ?? comps.find((c) => {
      // a part turning on a bearing: concentric with another movable part, not mated to a fixed one
      const mine = (doc.mates ?? []).filter((m) => m.refs.some((r) => r.componentId === c.id));
      const fixedIds = new Set((doc.components ?? []).filter((x) => x.fixed).map((x) => x.id));
      return mine.some((m) => m.type === 'concentric') && !mine.some((m) => m.refs.some((r) => fixedIds.has(r.componentId)));
    }) ?? comps[0];
    if (!comp) {
      get().pushMessage('A motor needs a movable component.', 'warn');
      return;
    }
    const n = (doc.motionStudy?.motors.length ?? 0) + 1;
    set({ motorEdit: { id: newId('mo'), name: `RotaryMotor${n}`, componentId: comp.id, kind: 'rotary', motion: 'constant', rpm: 10, speed: 10, amplitude: 45, frequency: 0.5, reverse: false, distance: 90, start: 0, duration: 1, segments: [{ t0: 0, t1: 1, value: 10 }], expression: '90*sin(2*pi*t)' }, managerTab: 'tree', motionPlaying: false });
  },
  updateMotorDraft(patch) {
    const me = get().motorEdit;
    if (me) set({ motorEdit: { ...me, ...patch } });
  },
  commitMotor() {
    const { doc, motorEdit } = get();
    if (!motorEdit) return;
    history.push('Motor', doc);
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const d: Document = { ...doc, motionStudy: { ...study, motors: [...study.motors.filter((m) => m.id !== motorEdit.id), motorEdit] } };
    set({ doc: d, motorEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancelMotor() {
    set({ motorEdit: null });
  },
  deleteMotor(id) {
    const { doc } = get();
    if (!doc.motionStudy) return;
    history.push('Delete Motor', doc);
    const d: Document = { ...doc, motionStudy: { ...doc.motionStudy, motors: doc.motionStudy.motors.filter((m) => m.id !== id) } };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMotionDuration(s) {
    const { doc } = get();
    const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
    const d: Document = { ...doc, motionStudy: { ...study, duration: Math.max(0.5, s) } };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  patternEdit: null,
  sketch3dEdit: null,
  editContext: null,
  sensorEdit: null,
  setSensorEdit(sensorEdit) {
    set({ sensorEdit, managerTab: 'tree' });
  },
  editComponent(id) {
    const { doc, selectedFeatureId } = get();
    if (!isAssembly(doc)) return;
    const cid = id ?? selectedFeatureId;
    const comp = (doc.components ?? []).find((c) => c.id === cid);
    if (!comp) {
      get().pushMessage('Select a component to edit (in the graphics area or the tree).', 'warn');
      return;
    }
    const ctx = { assembly: doc, componentName: comp.name, partName: comp.part.name };
    get().openDocument({ ...comp.part, kind: 'part' });
    set({ editContext: ctx, tab: 'features' });
    get().pushMessage(`Editing ${comp.name} in ${doc.name}: Edit Component (or Return to Assembly) goes back.`);
  },
  returnToAssembly() {
    const ctx = get().editContext;
    if (!ctx) return;
    const part = get().doc;
    const assembly: Document = { ...ctx.assembly, components: (ctx.assembly.components ?? []).map((c) => (c.part.name === ctx.partName ? { ...c, part: { ...part, kind: 'part' } } : c)) };
    set({ editContext: null });
    get().openDocument(assembly);
    set({ tab: 'assembly', dirty: true });
    autosave(get().doc);
  },
  detailedPreview: false,
  analysis: null,
  setAnalysis(analysis) {
    // the analysis colours show on every face: no selection tint on top
    set(analysis ? { analysis, selectedFace: null, selectedFaces: [], selectedEdges: [] } : { analysis });
  },
  draftFocus: 'neutral',
  setDraftFocus(draftFocus) {
    set({ draftFocus });
  },
  toggleDetailedPreview() {
    set({ detailedPreview: !get().detailedPreview });
  },
  sketchTool: { filletKeepCorners: true, offsetChain: true, keepRelations: true, circEqual: true, infiniteLength: false, lineOrientation: 'sketched', lineAngle: 45, midpointLine: false, addDimensions: false, circleDiameter: true, filletRadius: 5, chamferD1: 5, chamferD2: 5, chamferEqual: true, offsetDistance: 10, offsetReverse: false, offsetConstruction: false, dx: 10, dy: 0, angle: 90, scale: 2, cx: 0, cy: 0, spacing: 20, count: 3, direction: 0, spacing2: 20, count2: 1, direction2: 90, circAngle: 360, circCount: 4, trimMode: 'closest', trimKeep: false, trimIgnore: false, filletDimension: false, chamferMode: 'distance', chamferAngle: 45, offsetBidirectional: false, offsetCapEnds: false, offsetBaseConstruction: false, offsetDimensions: false, forConstruction: false, slotDimensions: false, slotOverall: false, patternDimensions: false, moveMode: 'xy', fromX: 0, fromY: 0, toX: 10, toY: 0 },
  drawingEdit: null,
  selectedDrawingViewId: null,
  selectedDrawingDimensionId: null,
  selectedFeatureId: null,
  hoverFace: null,
  selectedFace: null,
  hoverEdge: null,
  selectedEdges: [],
  selectedFaces: [],
  selection: [],
  selectedConstraint: null,
  hover: null,
  tool: 'select',
  tab: 'features',
  theme: typeof window !== 'undefined' ? loadTheme() : 'light',
  panels: {
    manager: { side: 'left', visible: true },
    relations: { side: 'right', visible: false },
    shortcuts: { side: 'float', visible: false, x: 300, y: 120 },
  },
  dockWidth: { left: 236, right: 300 },
  managerTab: 'tree',
  managerCollapsed: false,
  treeFilter: '',
  planePick: false,
  pendingTool: null,
  hoverPlane: null,
  selectedPlane: null,
  displayStyle: 'shadedEdges',
  show: { planes: false, origin: true, sketches: true, relations: true, grid: false, viewSelector: false, realView: false, shadows: false, perspective: false, ambientOcclusion: false, zebra: false },
  reverseWheel: typeof localStorage !== 'undefined' && localStorage.getItem('phlippo.reverseWheel') === 'true',
  prefs: typeof localStorage !== 'undefined' ? { ...loadPrefs(), ...(initialDoc.properties ?? {}) } : { ...DEFAULT_PREFS },
  unitSystem: 'MMGS',
  lastTool: 'line',
  viewName: '*Trimetric',
  taskPane: null,
  // start-up as the original: the Welcome dialog over an empty window; the autosave waits under Recent Documents
  dialog: typeof localStorage !== 'undefined' && localStorage.getItem('phlippo.welcome.hide') === '1' ? null : 'welcome',
  hasDocument: false,
  lastCommand: null,
  dialogFeatureId: null,
  exportFormat: 'stl',
  confirmDelete: null,
  ask: null,
  confirmAtCursor: null,
  modify: null,
  feedback: null,
  libraries: loadLibraries(),
  placing: null,
  messages: [],
  cursor: null,
  ...historyFlags(),
  dirty: false,
  rollbackIndex: null,
  showRelations: true,
  showGrid: false,
  snapGrid: false,
  gridSize: 10,
  shadedContours: true,

  startFeature(type, op, boundary = false) {
    const { doc, activeSketchId, selectedFeatureId } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    void isSolidFeature;
    const sketch = sketchId ? doc.sketches[sketchId] : null;
    if (!sketch) {
      get().pushMessage('Select a sketch in the FeatureManager design tree (or open one) before adding the feature.', 'warn');
    }
    // an empty sketch gives no feature: the original refuses with "no closed contours"
    if (sketch && (type === 'extrude' || type === 'revolve') && sketchRegions(sketch).length === 0 && sketchChains(sketch).length === 0) {
      get().pushMessage('The sketch is empty: draw a closed contour (or an open chain for a thin feature) first.', 'warn');
      return;
    }
    const id = newId('f');
    const name = featureName(doc, type, op);
    let draft: SolidFeature;
    // a cut on a face of the body goes into the material by default (the face normal points outward), as in the original
    const intoMaterial = op === 'cut' && !!sketch && !isReferencePlane(sketch.plane);
    // an open profile becomes a thin feature automatically, as the original proposes
    const openProfile = !!sketch && type === 'extrude' && sketchRegions(sketch).length === 0 && sketchChains(sketch).length > 0;
    if (type === 'sweep') draft = { id, type: 'sweep', name, sketchId: sketchId ?? '', pathSketchId: '', suppressed: false, op };
    else if (type === 'loft') draft = boundary ? { id, type: 'loft', name: `${op === 'boss' ? 'Boundary-Boss' : 'Boundary-Cut'}${doc.features.filter((f) => f.type === 'loft' && f.boundary && f.op === op).length + 1}`, sketchId: sketchId ?? '', sketchId2: '', suppressed: false, op, boundary: true } : { id, type: 'loft', name, sketchId: sketchId ?? '', sketchId2: '', suppressed: false, op };
    else if (type === 'extrude') draft = { id, type: 'extrude', name: openProfile && op === 'boss' ? featureName(doc, 'extrude', 'boss', true) : name, sketchId: sketchId ?? '', suppressed: false, op, end: 'blind', depth: 10, reverse: intoMaterial, thin: openProfile ? { mode: 'one', thickness: 2 } : undefined };
    else {
      const axis = sketch ? sketch.entityOrder.map((eid) => sketch.entities[eid]).find((e) => e.kind === 'line' && e.construction) ?? sketch.entityOrder.map((eid) => sketch.entities[eid]).find((e) => e.kind === 'line') : undefined;
      draft = { id, type: 'revolve', name, sketchId: sketchId ?? '', suppressed: false, op, axisEntityId: axis?.id ?? '', angle: 360, reverse: false };
    }
    // the sketch stays as it is; the feature PropertyManager replaces the sketch tools (as in the original)
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: isAssembly(doc) ? 'assembly' : 'features', managerTab: 'tree', planePick: false });
  },
  startRound(type) {
    const { doc, rebuild, selectedEdges } = get();
    const body = rebuild.bodies[0];
    if (!body) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const edges = selectedEdges.map((id) => body.edges.find((e) => e.id === id)).filter((e) => !!e).map((e) => edgeRef(e!));
    const draft: RoundFeature = { id: newId('f'), type, name: featureName(doc, type), suppressed: false, size: 10, edges };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null });
  },
  startBreakCorner() {
    const { doc, rebuild, selectedEdges } = get();
    const body = rebuild.bodies[0];
    if (!body) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const edges = selectedEdges.map((id) => body.edges.find((e) => e.id === id)).filter((e) => !!e).map((e) => edgeRef(e!));
    const n = doc.features.filter((f) => (f.type === 'fillet' || f.type === 'chamfer') && f.breakCorner).length + 1;
    const draft: RoundFeature = { id: newId('f'), type: 'chamfer', name: `Break-Corner${n}`, suppressed: false, size: 5, edges, breakCorner: true };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null });
  },
  collectAllCorners() {
    const { doc, rebuild, featureEdit } = get();
    const body = rebuild.bodies[0];
    if (!body || !featureEdit || (featureEdit.draft.type !== 'fillet' && featureEdit.draft.type !== 'chamfer')) return;
    const t = doc.sheetMetal?.thickness ?? 3;
    // corner edges run straight through the thickness of the sheet
    const corners = body.edges.filter((e) => e.straight && Math.abs(e.length - t) < 1e-3).map((e) => edgeRef(e));
    set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges: corners } } });
  },
  startMirror() {
    const { doc, rebuild, selectedPlane, selectedFace } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    let plane = selectedPlane ?? 'right';
    if (!selectedPlane && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (face && face.curved) {
        get().pushMessage('Select a planar face: a sketch cannot be placed on a curved face.', 'warn');
        return;
      }
      if (face) {
        const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
        const d: Document = { ...doc, planes: { ...doc.planes, [def.id]: def } };
        registerPlanes(d.planes);
        set({ doc: d });
        plane = def.id;
      }
    }
    const draft: MirrorFeature = { id: newId('f'), type: 'mirror', name: featureName(doc, 'mirror'), suppressed: false, plane };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null });
  },
  startPattern(type) {
    const { doc, rebuild, selectedFeatureId } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const sel = selectedFeatureId ? doc.features.find((f) => f.id === selectedFeatureId) : undefined;
    const seed = sel && isSketchBased(sel) && sel.type !== 'sketch' ? [sel.id] : sel?.type === 'sketch' ? doc.features.filter((f) => isSketchBased(f) && f.type !== 'sketch' && (f as ExtrudeFeature).sketchId === sel.sketchId).map((f) => f.id) : [];
    // Fill Pattern: the selected planar face is the fill boundary
    let fill: PatternFeature['fill'];
    if (type === 'fillPattern' && get().selectedFace) {
      const sf = get().selectedFace!;
      const b = rebuild.bodies.find((x) => x.id === sf.bodyId);
      const fc = b?.faces.find((x) => x.id === sf.faceId);
      if (b && fc && !fc.curved) fill = { ...faceBoundary(b.geometry, fc.triangles, fc.normal, fc.centroid), spacing: 10, margin: 2, layout: 'square', label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const seedSk = seed.length ? (doc.features.find((f) => f.id === seed[0]) as ExtrudeFeature | undefined)?.sketchId : undefined;
    const seedDims = seedSk && doc.sketches[seedSk] ? doc.sketches[seedSk].constraintOrder.map((id) => doc.sketches[seedSk].constraints[id]).filter((c) => c && c.value !== undefined && !c.driven) : [];
    const curveSk = doc.features.filter((f) => f.type === 'sketch').map((f) => (f as { sketchId: string }).sketchId).find((id) => id !== seedSk) ?? '';
    const draft: PatternFeature =
      type === 'curvePattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, curve: { sketchId: curveSk, count: 4, spacing: 20, equal: true, tangent: false } }
        : type === 'tablePattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, table: [{ x: 20, y: 0 }, { x: 40, y: 0 }] }
        : type === 'fillPattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, fill }
        : type === 'variablePattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, variable: { dir: [1, 0, 0], rows: [{ offset: 25, values: Object.fromEntries(seedDims.map((c) => [c.id, c.value!])) }] } }
        : type === 'sketchPattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, sketchId: '' }
        : type === 'linearPattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, dir1: { axis: [1, 0, 0], spacing: 20, count: 3 } }
        : { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, axis: { origin: [0, 0, 0], dir: [0, 1, 0] }, angle: 360, count: 4 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startHole(advanced = false, simple = false) {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    let plane = '';
    let d = doc;
    if (selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (face && !face.curved) {
        const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
        d = { ...doc, planes: { ...doc.planes, [def.id]: def } };
        registerPlanes(d.planes);
        plane = def.id;
      }
    }
    if (!plane) get().pushMessage('Select a planar face of the body first, then click Hole Wizard.', 'warn');
    const draft: HoleFeature = advanced
      ? { id: newId('f'), type: 'hole', name: `Advanced Hole${doc.features.filter((f) => f.type === 'hole' && f.advanced).length + 1}`, suppressed: false, plane, points: [], holeType: 'counterbore', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.5, csDiameter: 12.6, csAngle: 90, advanced: true, farSide: { kind: 'countersink', diameter: 10, depth: 2, angle: 90 } }
      : { id: newId('f'), type: 'hole', name: simple ? `Hole${doc.features.filter((f) => f.type === 'hole' && f.simple).length + 1}` : featureName(doc, 'hole'), suppressed: false, plane, points: [], holeType: 'simple', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.5, csDiameter: 12.6, csAngle: 90, ...(simple ? { simple: true } : {}) };
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  setOffsetSurfEdit(offsetSurfEdit) {
    set({ offsetSurfEdit });
  },
  commitOffsetOnSurface() {
    const { doc, rebuild, selectedFace, selectedFaces, offsetSurfEdit } = get();
    if (!offsetSurfEdit) return;
    const refs = selectedFaces.length ? selectedFaces : selectedFace ? [selectedFace] : [];
    const segments: [[number, number, number], [number, number, number]][] = [];
    for (const r of refs) {
      const b = rebuild.bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      if (!b || !f || f.curved) continue;
      const fb = faceBoundary(b.geometry, f.triangles, f.normal, f.centroid);
      const poly = offsetPolygon(fb.polygon, offsetSurfEdit.reverse ? -offsetSurfEdit.distance : offsetSurfEdit.distance);
      const W = (p: [number, number]): [number, number, number] => [0, 1, 2].map((k) => fb.origin[k] + fb.u[k] * p[0] + fb.v[k] * p[1]) as [number, number, number];
      poly.forEach((p, i) => segments.push([W(p), W(poly[(i + 1) % poly.length])]));
    }
    if (!segments.length) {
      get().pushMessage('Select a planar face to offset its edges on.', 'warn');
      return;
    }
    history.push('Offset On Surface', doc);
    const n = doc.features.filter((f) => f.type === 'sketch3d').length + 1;
    const feat: Sketch3DFeature = { id: newId('f'), type: 'sketch3d', name: `3DSketch${n}`, suppressed: false, segments };
    const d: Document = { ...doc, features: [...doc.features, feat] };
    set({ doc: d, offsetSurfEdit: null, rebuild: rebuildFor(d, get().rollbackIndex), selectedFace: null, selectedFaces: [], dirty: true, ...historyFlags() });
    autosave(d);
  },
  startClosedCorner(weld = false) {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a sheet metal part first.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'closedCorner' && !!f.weld === weld).length + 1;
    const draft: ClosedCornerFeature = { id: newId('f'), type: 'closedCorner', name: `${weld ? 'Welded Corner' : 'Closed Corner'}${n}`, suppressed: false, faces: [], gap: 0.1, cornerType: 'butt', weld };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startCornerRelief() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a sheet metal part first.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'cornerRelief').length + 1;
    const draft: CornerReliefFeature = { id: newId('f'), type: 'cornerRelief', name: `Corner Relief${n}`, suppressed: false, bends: [], kind: 'rectangular', size: 6 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startLoftedBend() {
    const { doc } = get();
    const sk = doc.features.filter((f) => f.type === 'sketch').map((f) => (f as { sketchId: Id }).sketchId);
    const n = doc.features.filter((f) => f.type === 'loftedBend').length + 1;
    const draft: LoftedBendFeature = { id: newId('f'), type: 'loftedBend', name: `Lofted-Bend${n}`, suppressed: false, sketchId: sk[sk.length - 2] ?? '', sketchId2: sk[sk.length - 1] ?? '', thickness: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startConvertSheet(insertBends = false) {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage(insertBends ? 'Insert Bends needs a (shelled) solid body.' : 'Convert to Sheet Metal needs a solid body.', 'warn');
      return;
    }
    const b = selectedFace ? rebuild.bodies.find((x) => x.id === selectedFace.bodyId) : undefined;
    const fc = b?.faces.find((x) => x.id === selectedFace?.faceId);
    const draft: ConvertSheetFeature = { id: newId('f'), type: 'convertSheet', name: insertBends ? `Process-Bends${doc.features.filter((f) => f.type === 'convertSheet' && f.insertBends).length + 1}` : `Convert-Solid${doc.features.filter((f) => f.type === 'convertSheet' && !f.insertBends).length + 1}`, suppressed: false, ...(insertBends ? { insertBends: true } : {}), fixedFace: fc && !fc.curved ? { normal: fc.normal, point: fc.centroid } : null, thickness: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness, bendRadius: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).bendRadius };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  toggleNoBends() {
    const { doc } = get();
    const fp = doc.features.find((f) => f.type === 'flatPattern');
    if (!fp || fp.type !== 'flatPattern') {
      get().pushMessage('No Bends needs a sheet metal part (Base Flange/Tab from an open sketch).', 'warn');
      return;
    }
    history.push('No Bends', doc);
    const on = !(fp.noBendLines && !fp.suppressed);
    const features = doc.features.map((f) => (f.id === fp.id ? { ...f, suppressed: !on, noBendLines: on } : f)) as Document['features'];
    const d: Document = { ...doc, features };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  startDecal(id) {
    const { doc, selectedFace, rebuild } = get();
    const ex = id ? (doc.decals ?? []).find((d) => d.id === id) : undefined;
    let face = ex?.face ?? null;
    if (!face && selectedFace) {
      const f = rebuild.bodies.find((b) => b.id === selectedFace.bodyId)?.faces.find((x) => x.id === selectedFace.faceId);
      if (f && !f.curved) face = { normal: f.normal, point: f.centroid };
    }
    set({ decalEdit: { id, name: ex?.name ?? `Decal${(doc.decals ?? []).length + 1}`, face, image: ex?.image ?? DEFAULT_DECAL, width: ex?.width ?? 40, rotation: ex?.rotation ?? 0, height: ex?.height, lighting: ex?.lighting, brightness: ex?.brightness, shininess: ex?.shininess }, featureEdit: null, managerTab: 'tree', tab: 'render', selectedFace: null, selectedFaces: [] });
  },
  updateDecalEdit(patch) {
    const e = get().decalEdit;
    if (e) set({ decalEdit: { ...e, ...patch } });
  },
  commitDecal() {
    const { decalEdit: e, doc } = get();
    if (!e) return;
    if (!e.face) {
      get().pushMessage('Select the planar face to put the decal on.', 'warn');
      return;
    }
    history.push(e.id ? `Edit ${e.name}` : e.name, doc);
    const dec = { id: e.id ?? newId('dc'), name: e.name, face: e.face, image: e.image, width: e.width, rotation: e.rotation, ...(e.height !== undefined ? { height: e.height } : {}), ...(e.lighting === 'custom' ? { lighting: e.lighting, brightness: e.brightness, shininess: e.shininess } : {}) };
    const d: Document = { ...doc, decals: [...(doc.decals ?? []).filter((x) => x.id !== dec.id), dec] };
    set({ doc: d, decalEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteDecal(id) {
    const { doc } = get();
    history.push('Delete decal', doc);
    const d: Document = { ...doc, decals: (doc.decals ?? []).filter((x) => x.id !== id) };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setLargeAssembly(largeAssembly) {
    set({ largeAssembly, show: largeAssembly ? { ...get().show, shadows: false, realView: false } : get().show, displayStyle: largeAssembly ? 'shaded' : get().displayStyle });
    get().pushMessage(largeAssembly ? 'Large Assembly Settings on: shaded display without edges, no shadows or RealView.' : 'Large Assembly Settings off.');
  },
  startBelt() {
    const { doc, rebuild, selectedFaces, selectedFace } = get();
    const refs = selectedFaces.length ? selectedFaces : selectedFace ? [selectedFace] : [];
    const pulleys: BeltFeature['pulleys'] = [];
    for (const r of refs) {
      const b = rebuild.bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      if (!b || !f || !f.curved) continue;
      const ax = cylinderAxis(b.geometry, f.triangles);
      if (ax) pulleys.push({ center: [ax.point.x, ax.point.y, ax.point.z], axis: [ax.dir.x, ax.dir.y, ax.dir.z], radius: ax.radius });
    }
    if (pulleys.length < 2) {
      get().pushMessage('Belt/Chain: select two or more cylindrical faces (the pulleys) with Ctrl, then click Belt/Chain.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'belt').length + 1;
    const draft: BeltFeature = { id: newId('f'), type: 'belt', name: `Belt${n}`, suppressed: false, pulleys, thickness: 2 };
    get().applyDocument(draft.name, { ...doc, features: [...doc.features, draft] });
  },
  setViewportLayout(viewportLayout) {
    set({ viewportLayout });
  },
  setIsolated(isolated) {
    set({ isolated });
  },
  deleteBodies(ids) {
    const { doc } = get();
    const n = doc.features.filter((f) => f.type === 'deleteBody').length + 1;
    get().applyDocument(`Body-Delete/Keep${n}`, { ...doc, features: [...doc.features, { id: newId('f'), type: 'deleteBody', name: `Body-Delete/Keep${n}`, suppressed: false, bodies: ids }] });
  },
  setMarkupMode(markupMode) {
    set({ markupMode });
  },
  startStud() {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const body = selectedFace ? rebuild.bodies.find((b) => b.id === selectedFace.bodyId) : undefined;
    const face = body?.faces.find((f) => f.id === selectedFace?.faceId);
    if (!face || face.curved) {
      get().pushMessage('Select a planar face of the body first, then click Stud Wizard.', 'warn');
      return;
    }
    const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
    const d = { ...doc, planes: { ...doc.planes, [def.id]: def } };
    registerPlanes(d.planes);
    const n = doc.features.filter((f) => f.type === 'stud').length + 1;
    const draft: StudFeature = { id: newId('f'), type: 'stud', name: `Stud${n}`, suppressed: false, plane: def.id, point: { x: 0, y: 0 }, size: 'M6', diameter: 6, length: 20, threadLength: 15, pitch: 1 };
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  addSensor(kind, extra = {}) {
    const { doc } = get();
    history.push('Add Sensor', doc);
    const base = kind === 'mass' ? 'Mass' : kind === 'volume' ? 'Volume' : kind === 'area' ? 'Surface Area' : kind === 'dimension' ? 'Dimension' : 'Interference Detection';
    const n = (doc.sensors ?? []).filter((x) => x.kind === kind).length + 1;
    const d: Document = { ...doc, sensors: [...(doc.sensors ?? []), { id: newId('sensor'), name: `${base}${n}`, kind, ...(extra.dim ? { dim: extra.dim } : {}), ...(extra.alert ? { alert: extra.alert } : {}) }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteSensor(id) {
    const { doc } = get();
    history.push('Delete Sensor', doc);
    const d: Document = { ...doc, sensors: (doc.sensors ?? []).filter((x) => x.id !== id) };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startRib() {
    const { doc, rebuild, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base); a rib grows from a sketch until it meets the body.', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) {
      get().pushMessage('Open or select the sketch (a line, arc or chain) that the rib grows from.', 'warn');
    }
    const draft: RibFeature = { id: newId('f'), type: 'rib', name: featureName(doc, 'rib'), sketchId: sketchId ?? '', suppressed: false, thickness: 10, side: 'both', direction: 'parallel', flip: false, draft: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false });
  },
  startShell() {
    const { doc, rebuild, selectedFaces, selectedFace } = get();
    const body = rebuild.bodies[0];
    if (!body) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const refs = [...selectedFaces, ...(selectedFace && !selectedFaces.some((f) => f.faceId === selectedFace.faceId) ? [selectedFace] : [])]
      .map((r) => body.faces.find((f) => f.id === r.faceId))
      .filter((f) => !!f)
      .map((f) => ({ normal: f!.normal, point: f!.centroid }));
    const draft: ShellFeature = { id: newId('f'), type: 'shell', name: featureName(doc, 'shell'), suppressed: false, thickness: 2, faces: refs };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  addHolePoint(p) {
    const fe = get().featureEdit;
    if (!fe || fe.draft.type !== 'hole') return;
    set({ featureEdit: { ...fe, draft: { ...fe.draft, points: [...fe.draft.points, p] } } });
  },
  setHoverEdge(hoverEdge) {
    if (get().hoverEdge !== hoverEdge) set({ hoverEdge });
  },
  toggleSelectedEdge(id, additive = false) {
    const { selectedEdges, featureEdit, rebuild, dialog, planeEdit } = get();
    if (planeEdit && (planeEdit.draft.mode === 'angle' || planeEdit.draft.mode === 'perpendicular')) {
      set({ planeEdit: { ...planeEdit, draft: { ...planeEdit.draft, edgeId: id } }, selectedEdges: [id] });
      return;
    }
    const has = selectedEdges.includes(id);
    const measuring = dialog === 'measure';
    const next = has ? selectedEdges.filter((x) => x !== id) : additive || featureEdit || measuring || get().refEdit ? [...selectedEdges, id] : [id];
    // while measuring, edges and faces are selected together
    set(measuring ? { selectedEdges: next, selectedPlane: null, selectedFeatureId: null } : { selectedEdges: next, selectedFace: null, selectedPlane: null, selectedFeatureId: null });
    // Draft > Parting line / Step draft: the picked edge is the parting line (its middle fixes the hinge plane)
    if (featureEdit && featureEdit.draft.type === 'draft' && get().draftFocus === 'parting' && !has) {
      const edge = rebuild.bodies.flatMap((b) => b.edges).find((e) => e.id === id);
      if (edge) {
        const c = edge.centroid;
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, parting: { point: [c.x, c.y, c.z], label: `Edge<${(rebuild.bodies.flatMap((b) => b.edges).indexOf(edge)) + 1}>` } } }, selectedEdges: [id], draftFocus: 'faces' });
        return;
      }
    }
    // Ruled Surface: the picked edge is the edge to rule from
    if (featureEdit && featureEdit.draft.type === 'surface' && featureEdit.draft.kind === 'ruled' && !has) {
      const edge = rebuild.bodies.flatMap((b) => b.edges).find((e) => e.id === id);
      if (edge) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: edgeRef(edge) } }, selectedEdges: [id] });
        return;
      }
    }
    // Thread: the picked circular edge (rod or hole), the size follows its diameter
    if (featureEdit && featureEdit.draft.type === 'thread') {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const e = body?.edges.find((x) => x.id === id);
      const te = body && e && e.closed && !e.straight ? threadEdge(body.geometry, e.points, body.edges.indexOf(e) + 1) : null;
      if (te) {
        const [size, diameter, pitch] = nearestThread(te.radius * 2, te.internal);
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: te, size, diameter, pitch, name: featureEdit.draft.name.replace(/^M[\d.x]+ /, `${size} `) } }, selectedEdges: [id] });
      } else get().pushMessage('Select a circular edge of a cylinder or hole.', 'warn');
      return;
    }
    // Tab and Slot: the picked straight edge gets the tabs
    if (featureEdit && featureEdit.draft.type === 'tabSlot') {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const e = body?.edges.find((x) => x.id === id);
      if (e && e.straight) set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: edgeRef(e) } }, selectedEdges: [id] });
      else get().pushMessage('Select a straight edge of the sheet.', 'warn');
      return;
    }
    // Rip / Swept Flange: the picked straight edges
    if (featureEdit && (featureEdit.draft.type === 'rip' || featureEdit.draft.type === 'sweptFlange')) {
      const all = rebuild.bodies.flatMap((b) => b.edges);
      const edges = next.map((eid) => all.find((e) => e.id === eid)).filter((e): e is NonNullable<typeof e> => !!e && e.straight).map((e) => edgeRef(e));
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges } } });
      return;
    }
    // Edge Flange: the picked straight edge
    if (featureEdit && (featureEdit.draft.type === 'edgeFlange' || featureEdit.draft.type === 'hem')) {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const e = body?.edges.find((x) => x.id === id);
      if (e && e.straight) set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: edgeRef(e) } }, selectedEdges: [id] });
      else get().pushMessage('Select a straight edge of the sheet.', 'warn');
      return;
    }
    // Miter Flange: the picked straight edges form the chain
    if (featureEdit && featureEdit.draft.type === 'miterFlange') {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const edges = next.map((eid) => body?.edges.find((e) => e.id === eid)).filter((e) => !!e && e.straight).map((e) => edgeRef(e!));
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges } } });
      return;
    }
    // while a fillet/chamfer is being defined, the selection is its edge list (with the click point of each)
    if (featureEdit && isRoundFeature(featureEdit.draft)) {
      const body = rebuild.bodies[0];
      const prev = featureEdit.draft.edges;
      const pick = get().edgePick;
      const edges = next.map((eid) => body?.edges.find((e) => e.id === eid)).filter((e) => !!e).map((e) => {
        const ref = edgeRef(e!);
        const old = prev.find((p) => Math.hypot(p.centroid[0] - ref.centroid[0], p.centroid[1] - ref.centroid[1], p.centroid[2] - ref.centroid[2]) < 1e-6);
        return { ...ref, pick: e!.id === id && pick ? pick : old?.pick };
      });
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges } } });
    }
  },
  updateFeatureDraft(patch) {
    const fe = get().featureEdit;
    if (!fe) return;
    // a number that is not finite (NaN, ∞ from a bad input) never reaches the draft: the preview would draw NaN
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => typeof v !== 'number' || Number.isFinite(v)));
    set({ featureEdit: { ...fe, draft: { ...fe.draft, ...clean } as SolidFeature } });
  },
  commitFeature() {
    const fe = get().featureEdit;
    if (!fe) return;
    const { doc } = get();
    if (isSketchBased(fe.draft) && !doc.sketches[fe.draft.sketchId]) {
      get().pushMessage('Select a sketch for the feature first.', 'warn');
      return;
    }
    if (fe.draft.type === 'chamfer' && fe.draft.roundType === 'vertex') {
      if (!fe.draft.vertex) {
        get().pushMessage('Select the vertex to chamfer.', 'warn');
        return;
      }
    } else if (isRoundFeature(fe.draft) && !fe.draft.edges.length) {
      get().pushMessage(fe.draft.roundType === 'offsetFace' || fe.draft.roundType === 'faceFace' ? 'Select two faces that share an edge.' : 'Select at least one edge.', 'warn');
      return;
    }
    if (fe.draft.type === 'hole' && (!fe.draft.plane || !fe.draft.points.length)) {
      get().pushMessage('Select a face and place at least one hole position.', 'warn');
      return;
    }
    if (fe.draft.type === 'formTool' && (!fe.draft.plane || !fe.draft.points.length)) {
      get().pushMessage('Select the placement face and place at least one position for the forming tool.', 'warn');
      return;
    }
    if (fe.draft.type === 'vent' && !doc.sketches[fe.draft.sketchId]) {
      get().pushMessage('Select the sketch of the vent.', 'warn');
      return;
    }
    if (fe.draft.type === 'gusset' && fe.draft.faces.length < 2) {
      get().pushMessage('Select the two faces on both sides of the bend.', 'warn');
      return;
    }
    if (fe.draft.type === 'tabSlot' && (!fe.draft.edge || !fe.draft.slotFace)) {
      get().pushMessage(!fe.draft.edge ? 'Select the edge that gets the tabs.' : 'Select the face that gets the slots.', 'warn');
      return;
    }
    if (fe.draft.type === 'structuralMember' && !doc.sketches[fe.draft.sketchId] && !doc.features.some((f) => f.id === (fe.draft as StructuralMemberFeature).sketchId && f.type === 'sketch3d')) {
      get().pushMessage('Select the path sketch of the structural members.', 'warn');
      return;
    }
    if (fe.draft.type === 'trimExtend' && (!fe.draft.bodies.length || (fe.draft.trimBy === 'bodies' ? !fe.draft.trimBodies.length : !fe.draft.face))) {
      get().pushMessage(!fe.draft.bodies.length ? 'Select the bodies to be trimmed.' : 'Select the trimming boundary.', 'warn');
      return;
    }
    if (fe.draft.type === 'endCap' && !fe.draft.faces.length) {
      get().pushMessage('Select the end faces to cap.', 'warn');
      return;
    }
    if ((fe.draft.type === 'weldGusset' || fe.draft.type === 'weldBead') && fe.draft.faces.length < 2) {
      get().pushMessage('Select the two faces that meet at the corner.', 'warn');
      return;
    }
    if (fe.draft.type === 'deform' && !fe.draft.point) {
      get().pushMessage('Select the face (its centre is the deform point).', 'warn');
      return;
    }
    if (fe.draft.type === 'rip' && !fe.draft.edges.length) {
      get().pushMessage('Select the edges to rip.', 'warn');
      return;
    }
    if (fe.draft.type === 'sweptFlange' && (!doc.sketches[fe.draft.sketchId] || (!doc.sketches[fe.draft.pathSketchId] && !fe.draft.edges.length))) {
      get().pushMessage('Select the profile sketch and the path (a sketch or edges) of the swept flange.', 'warn');
      return;
    }
    if (fe.draft.type === 'sweep' && !doc.sketches[fe.draft.pathSketchId] && !doc.features.some((f) => f.id === (fe.draft as SweepFeature).pathSketchId && f.type === 'helix')) {
      get().pushMessage('Select the path sketch for the sweep.', 'warn');
      return;
    }
    if (fe.draft.type === 'loft' && !doc.sketches[fe.draft.sketchId2]) {
      get().pushMessage('Select the second profile sketch for the loft.', 'warn');
      return;
    }
    if (fe.draft.type === 'shell' && fe.draft.thickness <= 0) {
      get().pushMessage('The wall thickness must be larger than zero.', 'warn');
      return;
    }
    // numbers: a depth / angle / size is a positive finite number (the original refuses 0, negative, NaN and ∞)
    const bad = (v: unknown) => typeof v === 'number' && !(Number.isFinite(v) && v > 0);
    if (fe.draft.type === 'extrude' && (((fe.draft.end === 'blind' || fe.draft.end === 'midPlane') && bad(fe.draft.depth)) || (fe.draft.direction2 && fe.draft.direction2.end === 'blind' && bad(fe.draft.direction2.depth)))) {
      get().pushMessage('The depth must be a positive number.', 'warn');
      return;
    }
    if (fe.draft.type === 'revolve' && !(Number.isFinite(fe.draft.angle) && fe.draft.angle > 0 && fe.draft.angle <= 360)) {
      get().pushMessage('The angle must lie between 0 and 360 degrees.', 'warn');
      return;
    }
    if (isRoundFeature(fe.draft) && bad(fe.draft.size)) {
      get().pushMessage('The size must be a positive number.', 'warn');
      return;
    }
    // an extrude / revolve needs a closed contour (or an open chain for a thin feature)
    if ((fe.draft.type === 'extrude' || fe.draft.type === 'revolve') && doc.sketches[fe.draft.sketchId] && sketchRegions(doc.sketches[fe.draft.sketchId]).length === 0 && sketchChains(doc.sketches[fe.draft.sketchId]).length === 0) {
      get().pushMessage('The sketch is empty: draw a closed contour first.', 'warn');
      return;
    }
    // instance count: beyond this the rebuild takes minutes (the original warns as well)
    const instances = fe.draft.type === 'linearPattern' ? (fe.draft.dir1?.count ?? 1) * (fe.draft.dir2?.count ?? 1) : fe.draft.type === 'circularPattern' ? (fe.draft.count ?? 1) * (fe.draft.dir2?.count ?? 1) : 0;
    if (instances > 2000) {
      get().pushMessage(`Too many instances (${instances}); the limit is 2000.`, 'warn');
      return;
    }
    if ((fe.draft.type === 'linearPattern' || fe.draft.type === 'circularPattern' || fe.draft.type === 'sketchPattern' || fe.draft.type === 'curvePattern' || fe.draft.type === 'tablePattern' || fe.draft.type === 'fillPattern' || fe.draft.type === 'variablePattern') && !fe.draft.featureIds.length) {
      get().pushMessage('Select the features to pattern in the FeatureManager design tree.', 'warn');
      return;
    }
    if (fe.draft.type === 'hole' && !fe.featureId && !fe.draft.advanced && !fe.draft.simple && /^Hole\d+$/.test(fe.draft.name)) {
      const size = fe.draft.sizeName ?? 'M6';
      const base = fe.draft.holeType === 'counterbore' ? `CBORE for ${size} Hex Head Bolt` : fe.draft.holeType === 'countersink' ? `CSK for ${size} Flat Head Machine Screw` : fe.draft.holeType === 'tap' ? `${size}x${(fe.draft.pitch ?? 1).toFixed(1)} Tapped Hole` : `${size} Clearance Hole`;
      fe.draft.name = `${base}${doc.features.filter((f) => f.type === 'hole' && f.name.startsWith(base)).length + 1}`;
    }
    history.push(fe.featureId ? `Edit ${fe.draft.name}` : fe.draft.name, doc);
    let features = fe.featureId ? doc.features.map((f) => (f.id === fe.featureId ? fe.draft : f)) : [...doc.features, fe.draft];
    let docIn = doc;
    if (fe.draft.type === 'baseFlange' && !fe.featureId && !doc.features.some((f) => f.type === 'flatPattern')) {
      // the first base flange makes the part sheet metal: Sheet-Metal1 parameters and a suppressed Flat-Pattern1 at the end
      const flat: FlatPatternFeature = { id: newId('f'), type: 'flatPattern', name: 'Flat-Pattern1', suppressed: true };
      features = [...features, flat];
      docIn = { ...doc, sheetMetal: doc.sheetMetal ?? DEFAULT_SHEET_METAL };
    } else if (!fe.featureId && features.some((f) => f.type === 'flatPattern')) {
      // Flat-Pattern1 always stays the last feature, as in the original
      const flat = features.find((f) => f.type === 'flatPattern')!;
      features = [...features.filter((f) => f !== flat), flat];
    }
    const d: Document = applyEquations({ ...docIn, features }).doc;
    const rebuild = rebuildFor(d, get().rollbackIndex);
    set({ contourPick: false, doc: d, rebuild, featureEdit: null, selectedFeatureId: null, selectedEdges: [], selectedFaces: [], selectedFace: null, hoverEdge: null, dirty: true, tab: get().tab === 'surfaces' || get().tab === 'sheetmetal' || get().tab === 'evaluate' ? get().tab : 'features', ...historyFlags() });
    const err = rebuild.errors[fe.draft.id];
    if (err) get().pushMessage(`${fe.draft.name}: ${err}`, 'error');
    autosave(d);
    // Keep Visible (the pushpin): the PropertyManager opens again for the next one
    if (get().pmPinned && !fe.featureId && isRoundFeature(fe.draft)) get().startRound(fe.draft.type);
  },
  setContourPick(contourPick) {
    set({ contourPick });
  },
  toggleContour(index) {
    const fe = get().featureEdit;
    if (!fe || (fe.draft.type !== 'extrude' && fe.draft.type !== 'revolve')) return;
    const cur = (fe.draft as { contours?: number[] }).contours ?? [];
    const next = cur.includes(index) ? cur.filter((k) => k !== index) : [...cur, index];
    set({ featureEdit: { ...fe, draft: { ...fe.draft, contours: next.length ? next : undefined } as SolidFeature } });
  },
  togglePmPinned() {
    set({ pmPinned: !get().pmPinned });
  },
  cancelFeature() {
    set({ contourPick: false, featureEdit: null, selectedEdges: [], selectedFaces: [], selectedFace: null, hoverEdge: null });
  },
  editFeature(id) {
    const f = get().doc.features.find((x) => x.id === id);
    if (!f || !isSolidFeature(f)) return;
    const body = get().rebuild.bodies[0];
    const selectedEdges = isRoundFeature(f) && body ? f.edges.map((r) => body.edges.find((e) => Math.hypot(e.centroid.x - r.centroid[0], e.centroid.y - r.centroid[1], e.centroid.z - r.centroid[2]) < 0.5)?.id).filter((x): x is string => !!x) : [];
    set({ featureEdit: { featureId: id, draft: { ...f } }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', selectedEdges });
  },
  instant3d: true,
  instant2d: false,
  rapidSketch: false,
  toggleInstant2D() {
    set({ instant2d: !get().instant2d });
  },
  toggleRapidSketch() {
    set({ rapidSketch: !get().rapidSketch });
  },
  rapidSwitch(target) {
    const tool = get().tool;
    const { activeSketchId, doc } = get();
    if (activeSketchId) {
      const sk = doc.sketches[activeSketchId];
      if (sk && sk.entityOrder.length === 0) get().discardSketch();
      else get().exitSketch();
    }
    set({ pendingTool: tool !== 'select' ? tool : null });
    if (target.face) get().sketchOnFace(target.face);
    else if (target.plane) get().newSketch(target.plane);
  },
  toggleInstant3D() {
    set({ instant3d: !get().instant3d });
  },
  setFeatureDepth(id, depth) {
    const { doc } = get();
    history.push('Instant3D', doc);
    const d: Document = { ...doc, features: doc.features.map((f) => (f.id === id && f.type === 'extrude' ? { ...f, depth } : f)) };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  toggleSuppress(id) {
    const { doc } = get();
    history.push('Suppress', doc);
    const d: Document = { ...doc, features: doc.features.map((f) => (f.id === id ? { ...f, suppressed: !f.suppressed } : f)) };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  setSelectedFeature(selectedFeatureId) {
    set({ selectedFeatureId, selectedFace: null });
  },
  setHoverFace(hoverFace) {
    const cur = get().hoverFace;
    if (cur?.bodyId === hoverFace?.bodyId && cur?.faceId === hoverFace?.faceId) return;
    set({ hoverFace });
  },
  setSelectedFace(selectedFace, additive = false) {
    const { selectedFaces, featureEdit, rebuild, dialog, mateEdit, doc } = get();
    // a click on empty space ends Move with Triad
    if (!selectedFace && get().triadComponentId) set({ triadComponentId: null });
    // Section View ▸ Selected Bodies: a pick adds / removes the body
    const sv = get().sectionEdit;
    if (sv?.pickBodies && selectedFace) {
      const id = selectedFace.bodyId;
      const list = sv.bodies ?? [];
      set({ sectionEdit: { ...sv, bodies: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } });
      return;
    }
    const de = get().decalEdit;
    if (de && selectedFace) {
      const f = rebuild.bodies.find((b) => b.id === selectedFace.bodyId)?.faces.find((x) => x.id === selectedFace.faceId);
      if (!f || f.curved) return get().pushMessage('A decal goes on a planar face.', 'warn');
      set({ decalEdit: { ...de, face: { normal: f.normal, point: f.centroid } }, selectedFace, selectedFaces: [selectedFace] });
      return;
    }
    // Edge Flange > Angle: the face the flange is perpendicular / parallel to
    if (featureEdit && selectedFace && featureEdit.draft.type === 'edgeFlange' && get().flangePick === 'face') {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const f = body?.faces.find((x) => x.id === selectedFace.faceId);
      if (!f || f.curved) return get().pushMessage('Select a planar face.', 'warn');
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, angleFace: { normal: f.normal, mode: featureEdit.draft.angleFace?.mode ?? 'perpendicular', label: `Face<${body!.faces.indexOf(f) + 1}>` } } }, flangePick: null, selectedFace });
      return;
    }
    // Thread > optional start face
    if (featureEdit && selectedFace && featureEdit.draft.type === 'thread' && get().threadFacePick) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const f = body?.faces.find((x) => x.id === selectedFace.faceId);
      if (!f || f.curved) return get().pushMessage('The start face must be planar.', 'warn');
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, startFace: { normal: f.normal, point: f.centroid, label: `Face<${body!.faces.indexOf(f) + 1}>` } } }, threadFacePick: false, selectedFace });
      return;
    }
    if (featureEdit && selectedFace && featureEdit.draft.type === 'deform') {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, point: [...face.centroid] as [number, number, number], direction: [...face.normal] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` } }, selectedFace, selectedFaces: [selectedFace] });
      return;
    }
    const dx = get().dimxpertEdit;
    if (dx && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      if (face.curved) return get().pushMessage('MBD Dimensions work on planar faces in this build.', 'warn');
      const r: DxFaceRef = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number] };
      const max = dx.kind === 'auto' ? 3 : dx.kind === 'datum' || dx.kind === 'gtol' ? 1 : dx.kind === 'pattern' ? 32 : 2;
      const has = dx.faces.some((x) => Math.hypot(x.point[0] - r.point[0], x.point[1] - r.point[1], x.point[2] - r.point[2]) < 1e-6);
      const faces = has ? dx.faces.filter((x) => Math.hypot(x.point[0] - r.point[0], x.point[1] - r.point[1], x.point[2] - r.point[2]) > 1e-6) : [...dx.faces, r].slice(-max);
      set({ dimxpertEdit: { ...dx, faces }, selectedFace, selectedFaces: has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace].slice(-max) });
      return;
    }
    if (featureEdit && selectedFace && (featureEdit.draft.type === 'endCap' || featureEdit.draft.type === 'weldGusset' || featureEdit.draft.type === 'weldBead' || featureEdit.draft.type === 'trimExtend')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      const d = featureEdit.draft;
      if (d.type === 'trimExtend') {
        if (get().trimFocus === 'trimming' && d.trimBy === 'face') {
          if (face.curved) return get().pushMessage('Select a planar face as the trimming boundary.', 'warn');
          set({ featureEdit: { ...featureEdit, draft: { ...d, face: { normal: face.normal, point: face.centroid } } }, selectedFace, selectedFaces: [selectedFace] });
          return;
        }
        const key = get().trimFocus === 'trimming' ? 'trimBodies' : 'bodies';
        const list = d[key];
        const next = list.includes(body.id) ? list.filter((x) => x !== body.id) : [...list, body.id];
        set({ featureEdit: { ...featureEdit, draft: { ...d, [key]: next } }, selectedFace, selectedFaces: [...selectedFaces.filter((f) => f.bodyId !== body.id), ...(list.includes(body.id) ? [] : [selectedFace])] });
        return;
      }
      if (face.curved) return get().pushMessage('Select a planar face.', 'warn');
      const ref = { normal: face.normal, point: face.centroid };
      const same = (r: { point: [number, number, number] }) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) < 1e-6;
      const has = d.faces.some(same);
      const max = d.type === 'endCap' ? 64 : 2;
      const faces = has ? d.faces.filter((r) => !same(r)) : [...d.faces, ref].slice(-max);
      set({ featureEdit: { ...featureEdit, draft: { ...d, faces } }, selectedFace, selectedFaces: has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace].slice(-max) });
      return;
    }
    if (featureEdit && selectedFace && (featureEdit.draft.type === 'gusset' || featureEdit.draft.type === 'tabSlot')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!face) return;
      if (face.curved) return get().pushMessage('Select a planar face of the sheet.', 'warn');
      const ref = { normal: face.normal, point: face.centroid };
      const d = featureEdit.draft;
      if (d.type === 'tabSlot') {
        set({ featureEdit: { ...featureEdit, draft: { ...d, slotFace: ref } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
      const has = d.faces.some((r) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) < 1e-6);
      const faces = has ? d.faces.filter((r) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) > 1e-6) : [...d.faces, ref].slice(-2);
      set({ featureEdit: { ...featureEdit, draft: { ...d, faces } }, selectedFace, selectedFaces: has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace].slice(-2) });
      return;
    }
    if (featureEdit && selectedFace && (featureEdit.draft.type === 'closedCorner' || featureEdit.draft.type === 'cornerRelief' || featureEdit.draft.type === 'convertSheet')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!face) return;
      const ref = { normal: face.normal, point: face.centroid };
      const d = featureEdit.draft;
      if (d.type === 'convertSheet') {
        if (face.curved) return get().pushMessage('Select a planar face as the fixed face.', 'warn');
        set({ featureEdit: { ...featureEdit, draft: { ...d, fixedFace: ref } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
      if (d.type === 'closedCorner' && face.curved) return get().pushMessage('Select the planar end face of a flange.', 'warn');
      if (d.type === 'cornerRelief' && !face.curved) return get().pushMessage('Select the curved faces of the two bends.', 'warn');
      const list = d.type === 'closedCorner' ? d.faces : d.bends;
      const has = selectedFaces.some((f) => f.faceId === selectedFace.faceId);
      const nextFaces = has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace];
      const nextList = has ? list.filter((r) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) > 1e-6) : [...list, ref];
      set({ featureEdit: { ...featureEdit, draft: d.type === 'closedCorner' ? { ...d, faces: nextList } : { ...d, bends: nextList } }, selectedFace, selectedFaces: nextFaces });
      return;
    }
    // Face Fillet (two faces) / Full Round Fillet (the center face): the faces define the edges
    if (featureEdit && selectedFace && isRoundFeature(featureEdit.draft) && (featureEdit.draft.roundType === 'face' || featureEdit.draft.roundType === 'fullRound' || featureEdit.draft.roundType === 'offsetFace' || featureEdit.draft.roundType === 'faceFace')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      if (face.curved) return get().pushMessage('Select a planar face.', 'warn');
      const d = featureEdit.draft;
      if (d.roundType === 'fullRound') {
        // Side Face Set 1 / Center Face Set / Side Face Set 2: the center face gives the two edges, the sides confirm them
        const which = get().fullRoundPick;
        const ref = { label: `Face<${body.faces.indexOf(face) + 1}>`, normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number] };
        const sets = { ...(d.fullRound ?? {}), [which]: ref };
        const next: 'side1' | 'center' | 'side2' = which === 'side1' ? 'center' : which === 'center' ? 'side2' : 'side2';
        const centerFace = sets.center ? body.faces.find((x) => new THREE.Vector3(...x.centroid).distanceTo(new THREE.Vector3(...sets.center!.point)) < 1e-6) : undefined;
        const fr = centerFace ? fullRoundEdges(body.edges, centerFace) : null;
        if (sets.center && !fr) return get().pushMessage('The center face needs two parallel edges.', 'warn');
        set({ featureEdit: { ...featureEdit, draft: { ...d, fullRound: sets, ...(fr ? { edges: fr.edges.map((e) => edgeRef(e)), size: fr.size } : {}) } }, fullRoundPick: next, selectedFace, selectedFaces: [selectedFace], selectedEdges: fr ? fr.edges.map((e) => e.id) : [] });
        return;
      }
      const prev = selectedFaces.filter((f) => f.faceId !== selectedFace.faceId && f.bodyId === selectedFace.bodyId).slice(-1);
      const nextFaces = [...prev, selectedFace];
      if (nextFaces.length === 2) {
        const f1 = body.faces.find((f) => f.id === nextFaces[0].faceId)!;
        const shared = faceFilletEdges(body.edges, f1, face);
        if (!shared.length) get().pushMessage('The two faces do not share an edge.', 'warn');
        set({ featureEdit: { ...featureEdit, draft: { ...d, edges: shared.map((e) => edgeRef(e)) } }, selectedFace, selectedFaces: nextFaces, selectedEdges: shared.map((e) => e.id) });
      } else set({ selectedFace, selectedFaces: nextFaces });
      return;
    }
    const pe = get().patternEdit;
    if (pe && selectedFace) {
      // Pattern Direction / Pattern Axis box: a planar face gives its normal, a cylindrical face its axis
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const isComp = (doc.components ?? []).some((c) => c.id === selectedFace.bodyId);
      if (pe.focus === 'direction' && body && face) {
        const n = body.faces.indexOf(face) + 1;
        const owner = (doc.components ?? []).find((c) => c.id === selectedFace.bodyId)?.name ?? '';
        if (face.curved) {
          const ax = cylinderAxis(body.geometry, face.triangles);
          if (!ax) {
            get().pushMessage('Select a planar face, or a cylindrical face for its axis.', 'warn');
            return;
          }
          get().updatePatternDraft({ dir: [ax.dir.x, ax.dir.y, ax.dir.z], axisPoint: [ax.point.x, ax.point.y, ax.point.z], dirLabel: `Face<${n}>@${owner}` }, 'seeds');
        } else get().updatePatternDraft({ dir: [...face.normal], dirLabel: `Face<${n}>@${owner}` }, 'seeds');
        return;
      }
      // Instances to Skip: a click on an instance of this pattern leaves it out
      if (pe.focus === 'skip') {
        const m = new RegExp(`^${pe.draft.id}~[^~]+~(\\d+)$`).exec(selectedFace.bodyId);
        if (m) get().updatePatternDraft({ skip: [...new Set([...(pe.draft.skip ?? []), Number(m[1])])].sort((x, y) => x - y) }, 'skip');
        return;
      }
      if (isComp) {
        const id = selectedFace.bodyId;
        const has = pe.draft.seeds.includes(id);
        get().updatePatternDraft({ seeds: has ? pe.draft.seeds.filter((x) => x !== id) : [...pe.draft.seeds, id] }, 'seeds');
      }
      return;
    }
    const ex = get().explodeEdit;
    if (ex && selectedFace) {
      const id = selectedFace.bodyId;
      const has = ex.current.componentIds.includes(id);
      get().updateExplodeDraft({ componentIds: has ? ex.current.componentIds.filter((x) => x !== id) : [...ex.current.componentIds, id] });
      return;
    }
    let faces: FaceRef[] = [];
    const measuring = dialog === 'measure';
    // Stud > Apply to cylindrical body: the picked cylinder (fitted)
    if (featureEdit && featureEdit.draft.type === 'stud' && featureEdit.draft.onCylinder !== undefined && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const cyl = body && face && face.curved ? fitCylinder(body.geometry, face.triangles) : null;
      if (!cyl) return get().pushMessage('Select a cylindrical face.', 'warn');
      const near = METRIC_THREADS.reduce((a, t) => (Math.abs(t[1] / 2 - cyl.radius) < Math.abs(a[1] / 2 - cyl.radius) ? t : a), METRIC_THREADS[0]);
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, onCylinder: { ...cyl, label: `Face<${body!.faces.indexOf(face!) + 1}>` }, size: near[0].split('x')[0], diameter: near[1], pitch: near[2] } }, selectedFace });
      return;
    }
    // Wrap > Spline Surface: any face
    if (featureEdit && featureEdit.draft.type === 'wrap' && featureEdit.draft.method === 'spline' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, splineFace: { normal: face.normal, point: face.centroid, label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Wrap: the picked cylindrical face (fitted once)
    if (featureEdit && featureEdit.draft.type === 'wrap' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const cyl = body && face && face.curved ? fitCylinder(body.geometry, face.triangles) : null;
      if (body && face && cyl) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, face: { ...cyl, label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Cross-Break: the picked planar face
    if (featureEdit && featureEdit.draft.type === 'crossBreak' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face && !face.curved) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, face: { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Offset Surface: the picked face
    if (featureEdit && featureEdit.draft.type === 'surface' && featureEdit.draft.kind === 'offset' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, face: { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Patterns > Faces to Pattern: a face picks the feature that made it (toggles it in the seeds)
    if (featureEdit && ['linearPattern', 'circularPattern', 'sketchPattern', 'curvePattern', 'tablePattern', 'fillPattern', 'variablePattern'].includes(featureEdit.draft.type) && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const d = featureEdit.draft as PatternFeature;
      if (face && !(d.type === 'fillPattern' && !d.fill)) {
        const owner = faceOwner(doc, face.centroid, face.normal);
        if (owner && isSketchBased(owner) && owner.type !== 'sketch' && !doc.features.slice(doc.features.indexOf(owner)).some((x) => x.id === d.id)) {
          const has = d.featureIds.includes(owner.id);
          set({ featureEdit: { ...featureEdit, draft: { ...d, featureIds: has ? d.featureIds.filter((x) => x !== owner.id) : [...d.featureIds, owner.id] } }, selectedFace });
          return;
        }
      }
    }
    // Draft: the Neutral Plane box takes one planar face, then Faces to Draft collects faces
    // Shell ▸ Multi-thickness Faces: a pick adds the face with the thickness of the box
    if (featureEdit && featureEdit.draft.type === 'shell' && get().shellPick === 'multi' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face && !face.curved) {
        const d = featureEdit.draft;
        const t = get().shellMultiThickness;
        const has = (d.multi ?? []).some((m) => new THREE.Vector3(...m.point).distanceTo(new THREE.Vector3(...face.centroid)) < 1e-6);
        set({ featureEdit: { ...featureEdit, draft: { ...d, multi: has ? (d.multi ?? []).filter((m) => new THREE.Vector3(...m.point).distanceTo(new THREE.Vector3(...face.centroid)) >= 1e-6) : [...(d.multi ?? []), { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], thickness: t }] } }, selectedFace });
        return;
      }
    }
    // Mirror ▸ Faces to Mirror
    if (featureEdit && featureEdit.draft.type === 'mirror' && get().mirrorPick === 'faces' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        const d = featureEdit.draft;
        const ref = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>@${body.id}` };
        const has = (d.faces ?? []).some((x) => x.label === ref.label);
        set({ featureEdit: { ...featureEdit, draft: { ...d, faces: has ? (d.faces ?? []).filter((x) => x.label !== ref.label) : [...(d.faces ?? []), ref], featureIds: undefined } }, selectedFace });
        return;
      }
    }
    // Replace Face: a face pick adds / removes the face to replace
    if (featureEdit && featureEdit.draft.type === 'surface' && featureEdit.draft.kind === 'replaceFace' && selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (b && fc) {
        const ref = { normal: [...fc.normal] as [number, number, number], point: [...fc.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(fc) + 1}>` };
        const cur = featureEdit.draft.faces ?? [];
        const has = cur.some((x) => x.label === ref.label);
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, faces: has ? cur.filter((x) => x.label !== ref.label) : [...cur, ref] } }, selectedFace });
        return;
      }
    }
    // Fill Pattern: a planar face pick becomes the fill boundary
    if (featureEdit && featureEdit.draft.type === 'fillPattern' && selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (!b || !fc || fc.curved) return get().pushMessage('Select a planar face as the fill boundary.', 'warn');
      const prev = featureEdit.draft.fill;
      const fill: PatternFeature['fill'] = { ...faceBoundary(b.geometry, fc.triangles, fc.normal, fc.centroid), spacing: prev?.spacing ?? 10, margin: prev?.margin ?? 2, layout: prev?.layout ?? 'square', sides: prev?.sides, seedCut: prev?.seedCut, label: `Face<${b.faces.indexOf(fc) + 1}>` };
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, fill } }, selectedFace });
      return;
    }
    // Delete Face: a pick adds / removes the face
    if (featureEdit && featureEdit.draft.type === 'deleteFace' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        const ref = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` };
        const d = featureEdit.draft;
        const has = d.faces.some((x) => x.label === ref.label);
        set({ featureEdit: { ...featureEdit, draft: { ...d, faces: has ? d.faces.filter((x) => x.label !== ref.label) : [...d.faces, ref] } }, selectedFace });
        return;
      }
    }
    if (featureEdit && featureEdit.draft.type === 'draft' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        if (face.curved) {
          get().pushMessage('Select planar faces for the draft.', 'warn');
          return;
        }
        const ref = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` };
        const d = featureEdit.draft;
        if (get().draftFocus === 'neutral') {
          set({ featureEdit: { ...featureEdit, draft: { ...d, neutral: ref } }, draftFocus: d.draftType === 'parting' || d.draftType === 'step' ? 'parting' : 'faces', selectedFace, selectedFaces: [selectedFace] });
        } else {
          const has = d.faces.some((x) => x.label === ref.label);
          set({ featureEdit: { ...featureEdit, draft: { ...d, faces: has ? d.faces.filter((x) => x.label !== ref.label) : [...d.faces, ref] } }, selectedFace });
        }
        return;
      }
    }
    // Up To Body: a face picks its solid body
    if (featureEdit && featureEdit.draft.type === 'extrude' && featureEdit.draft.end === 'upToBody' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      if (body) {
        const owner = doc.features.find((x) => x.id === body.featureIds[0]);
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, upToBody: { bodyId: body.id, label: owner?.name ?? body.id } } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
    }
    // Direction 2 ▸ Up To Surface: the picked planar face ends the second direction
    if (featureEdit && featureEdit.draft.type === 'extrude' && featureEdit.draft.direction2 && get().dir2Pick === 'surface' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!face || face.curved) return get().pushMessage('Select a planar face.', 'warn');
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, direction2: { ...featureEdit.draft.direction2, surface: { normal: face.normal, point: face.centroid, label: `Face<${body!.faces.indexOf(face) + 1}>` } } } }, dir2Pick: null, selectedFace, selectedFaces: [selectedFace] });
      return;
    }
    // Up To Surface / Offset From Surface: the picked planar face ends the extrusion
    if (featureEdit && featureEdit.draft.type === 'extrude' && (featureEdit.draft.end === 'upToSurface' || featureEdit.draft.end === 'offsetFromSurface') && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        if (face.curved) {
          get().pushMessage('Select a planar face for Up To Surface.', 'warn');
          return;
        }
        const n = body.faces.indexOf(face) + 1;
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, surface: { normal: face.normal, point: face.centroid, label: `Face<${n}>` } } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
    }
    if (mateEdit && selectedFace) {
      // a face of a component becomes a mate reference (local frame of the component)
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const comp = (doc.components ?? []).find((c) => c.id === selectedFace.bodyId);
      if (body && face && comp) {
        let normal = new THREE.Vector3(...face.normal), point = new THREE.Vector3(...face.centroid), cylindrical = false, radius: number | undefined;
        if (face.curved) {
          const ax = cylinderAxis(body.geometry, face.triangles);
          if (!ax) {
            get().pushMessage('This curved face is not cylindrical; select a planar or cylindrical face.', 'warn');
            return;
          }
          normal = ax.dir;
          point = ax.point;
          cylindrical = true;
          radius = ax.radius;
        }
        const loc = localRef(normal, point, comp);
        const n = body.faces.indexOf(face) + 1;
        const ref: MateRef = { componentId: comp.id, kind: 'face', label: `Face<${n}>@${comp.name}`, normal: loc.normal, point: loc.point, cylindrical, radius };
        const refs = [...mateEdit.draft.refs.filter((r) => r.label !== ref.label), ref].slice(-mateRefCount(mateEdit.draft.type)) as unknown as [MateRef, MateRef];
        const draft = { ...mateEdit.draft, refs };
        // a sensible default type for the pair
        if (refs.length === 2 && mateRefCount(draft.type) === 2 && STANDARD_MATES.has(draft.type)) {
          const bothCyl = refs.every((r) => r.cylindrical);
          if (bothCyl && draft.type !== 'concentric') draft.type = 'concentric';
          else if (!bothCyl && (draft.type === 'concentric' || draft.type === 'tangent') && !refs.some((r) => r.cylindrical)) draft.type = 'coincident';
          if (!mateEdit.mateId) {
            const base = ({ coincident: 'Coincident', parallel: 'Parallel', perpendicular: 'Perpendicular', tangent: 'Tangent', concentric: 'Concentric', lock: 'Lock', distance: 'Distance', angle: 'Angle', profileCenter: 'ProfileCenter', symmetric: 'Symmetric', width: 'Width', path: 'PathMate', linearCoupler: 'LinearCoupler', distanceLimit: 'LimitDistance', angleLimit: 'LimitAngle', cam: 'CamMate', slot: 'SlotMate', hinge: 'Hinge', gear: 'GearMate', rackPinion: 'RackPinionMate', screw: 'Screw', universalJoint: 'UniversalJoint' } as Record<string, string>)[draft.type];
            draft.name = `${base}${(doc.mates ?? []).filter((m) => m.type === draft.type).length + 1}`;
          }
        }
        set({ mateEdit: { ...mateEdit, draft }, selectedFaces: refs.length === 2 ? [...selectedFaces.slice(-1), selectedFace] : [selectedFace], selectedFace, selectedEdges: [] });
        refreshMatePreview();
        return;
      }
    }
    if (selectedFace) {
      const has = selectedFaces.some((f) => f.faceId === selectedFace.faceId);
      faces = additive || measuring || !!get().refEdit || (featureEdit && featureEdit.draft.type === 'shell') ? (has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace]) : [selectedFace];
    }
    set(measuring ? { selectedFace: faces[faces.length - 1] ?? null, selectedFaces: faces, selectedPlane: null, selectedFeatureId: null } : { selectedFace: faces[faces.length - 1] ?? null, selectedFaces: faces, selectedPlane: null, selectedFeatureId: null, selectedEdges: [] });
    if (featureEdit && featureEdit.draft.type === 'shell') {
      const body = rebuild.bodies[0];
      const refs = faces.map((r) => body?.faces.find((f) => f.id === r.faceId)).filter((f) => !!f).map((f) => ({ normal: f!.normal, point: f!.centroid }));
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, faces: refs } } });
    }
  },
  sketchOnFace(ref) {
    const { doc, rebuild } = get();
    const body = rebuild.bodies.find((b) => b.id === ref.bodyId);
    const face = body?.faces.find((f) => f.id === ref.faceId);
    if (!face) return;
    if (face.curved) {
      get().pushMessage('Select a planar face: a sketch cannot be placed on a curved face.', 'warn');
      return;
    }
    const n = Object.keys(doc.planes).length + 1;
    const plane = { ...planeOnFace(newId('pl'), `Face${n}`, face.centroid, face.normal), kind: 'face' as const };
    const d: Document = { ...doc, planes: { ...doc.planes, [plane.id]: plane } };
    registerPlanes(d.planes);
    set({ doc: d, selectedFace: null, hoverFace: null });
    get().newSketch(plane.id);
  },
  newDocument(kind = 'part') {
    history.clear();
    const n = kind === 'assembly' ? 'Assem1' : kind === 'drawing' ? 'Draw1' : 'Part1';
    const doc = createDocument(n, kind);
    set({ doc, hasDocument: true, solve: {}, rebuild: rebuildFor(doc, null), activeSketchId: null, featureEdit: null, mateEdit: null, insertingComponent: kind === 'assembly', asmTool: 'select', selectedFeatureId: null, selectedFace: null, selectedFaces: [], selection: [], selectedConstraint: null, dirty: false, tab: kind === 'assembly' ? 'assembly' : kind === 'drawing' ? 'viewLayout' : 'features', drawingEdit: null, selectedDrawingViewId: null, rollbackIndex: null, ...historyFlags() });
    autosave(doc);
  },
  startInsertComponent() {
    set({ insertingComponent: true, mateEdit: null, featureEdit: null, managerTab: 'tree', tab: 'assembly' });
  },
  cancelInsertComponent() {
    set({ insertingComponent: false, insertGhost: null });
  },
  setInsertGhost(insertGhost) {
    set({ insertGhost });
  },
  rotateInsertGhost(axis, deg) {
    const g = get().insertGhost;
    if (!g) return;
    const a = ((deg ?? get().insertAngle) * Math.PI) / 180;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0), a).multiply(new THREE.Quaternion(...g.rotation));
    set({ insertGhost: { ...g, rotation: [q.x, q.y, q.z, q.w] } });
  },
  setInsertAngle(insertAngle) {
    set({ insertAngle });
  },
  placeInsertGhost(position) {
    const g = get().insertGhost;
    if (!g) return;
    get().insertComponent(g.part, { fixMode: g.fixMode, configuration: g.configuration, keepOpen: g.keepOpen, atOrigin: !position, position: position ?? undefined, rotation: g.rotation, virtual: g.virtual, envelope: g.envelope });
    // Keep Visible: the same part stays on the pointer for the next copy
    set({ insertGhost: g.keepOpen ? g : null });
  },
  insertComponent(part, opts = {}) {
    const { doc } = get();
    if (!isAssembly(doc)) {
      get().pushMessage('Components can only be inserted in an assembly (File ▸ New ▸ Assembly).', 'warn');
      return;
    }
    history.push('Insert Component', doc);
    const comps = doc.components ?? [];
    const fixMode = opts.fixMode ?? 'first';
    // a sub-assembly: its components (and their mates) come in as one group, placed by the insertion transform
    if (part.kind === 'assembly') {
      const sub = { id: newId('sub'), name: instanceName(doc, part.name), ...(activeConfiguration(part).hideChildrenInBom ? { hideChildren: true } : {}) };
      const T = new THREE.Matrix4().compose(new THREE.Vector3(...(opts.position ?? [0, 0, 0])), new THREE.Quaternion(...(opts.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(1, 1, 1));
      const ids = new Map<string, string>();
      const added: Component[] = [];
      let d0: Document = { ...doc, components: [...comps] };
      for (const c of part.components ?? []) {
        const m = T.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...c.position), new THREE.Quaternion(...c.rotation), new THREE.Vector3(1, 1, 1)));
        const p = new THREE.Vector3(), q = new THREE.Quaternion();
        m.decompose(p, q, new THREE.Vector3());
        const id = newId('comp');
        ids.set(c.id, id);
        const nc: Component = { ...c, id, name: instanceName(d0, c.name.replace(/<\d+>$/, '')), position: [p.x, p.y, p.z], rotation: [q.x, q.y, q.z, q.w], fixed: added.length === 0 && (fixMode === 'fix' || (fixMode === 'first' && comps.length === 0)), subassembly: sub };
        added.push(nc);
        d0 = { ...d0, components: [...(d0.components ?? []), nc] };
      }
      if (!added.length) {
        get().pushMessage(`${part.name} has no components.`, 'warn');
        return;
      }
      const subMates = (part.mates ?? []).filter((m) => m.refs.every((r) => ids.has(r.componentId))).map((m) => ({ ...m, id: newId('mate'), subassembly: sub.id, refs: m.refs.map((r) => ({ ...r, componentId: ids.get(r.componentId)! })) as typeof m.refs }));
      const d: Document = { ...d0, mates: [...(doc.mates ?? []), ...subMates] };
      set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: added[0].id, insertingComponent: !!opts.keepOpen, dirty: true, tab: 'assembly', ...historyFlags() });
      get().pushMessage(`${sub.name} inserted (${added.length} components).`);
      autosave(d);
      return;
    }
    const partDoc: Document = { ...part, kind: 'part' };
    const comp: Component = { id: newId('comp'), name: instanceName(doc, part.name), part: partDoc, position: opts.position ?? [0, 0, 0], rotation: opts.rotation ?? [0, 0, 0, 1], fixed: fixMode === 'fix' || (fixMode === 'first' && comps.length === 0), suppressed: false, configuration: opts.configuration ?? activeConfiguration(partDoc).name, ...(opts.virtual ? { virtual: true } : {}), ...(opts.envelope ? { envelope: true } : {}) };
    // later instances start next to the existing ones so they are visible (OK inserts at the origin)
    if (comps.length && !opts.atOrigin && !opts.position) {
      const r = get().rebuild;
      const box = new THREE.Box3();
      for (const b of r.bodies) {
        b.geometry.computeBoundingBox();
        if (b.geometry.boundingBox) box.union(b.geometry.boundingBox);
      }
      if (!box.isEmpty()) comp.position = [box.max.x + 20, 0, 0];
    }
    const d: Document = { ...doc, components: [...comps, comp] };
    const rebuild = rebuildFor(d, null);
    set({ doc: d, rebuild, selectedFeatureId: comp.id, insertingComponent: !!opts.keepOpen, dirty: true, tab: 'assembly', ...historyFlags() });
    get().pushMessage(`${comp.name} inserted${comp.fixed ? ' (fixed at the origin)' : ''}.`);
    autosave(d);
  },
  selectComponent(id) {
    const pe = get().patternEdit;
    if (pe && id) {
      const has = pe.draft.seeds.includes(id);
      get().updatePatternDraft({ seeds: has ? pe.draft.seeds.filter((x) => x !== id) : [...pe.draft.seeds, id] }, 'seeds');
      return;
    }
    const ex = get().explodeEdit;
    if (ex && id) {
      const has = ex.current.componentIds.includes(id);
      get().updateExplodeDraft({ componentIds: has ? ex.current.componentIds.filter((x) => x !== id) : [...ex.current.componentIds, id] });
      return;
    }
    set({ selectedFeatureId: id, selectedFace: null, selectedFaces: [], selectedEdges: [] });
  },
  setAsmTool(asmTool) {
    set({ asmTool });
    if (asmTool !== 'select') get().pushMessage(asmTool === 'move' ? 'Move Component: drag a component in the graphics area (fixed components do not move).' : 'Rotate Component: drag to rotate the component about its centre.');
  },
  moveComponent(id, delta) {
    const { doc } = get();
    const comps = doc.components ?? [];
    const c = comps.find((x) => x.id === id);
    if (!c || c.fixed) return;
    // Autokey: with the time bar past 0 the move becomes a key of the motion study at that time
    if (get().motionOpen && get().motionAutokey && get().motionTime > 1e-9) {
      const study = doc.motionStudy ?? { name: 'Motion Study 1', duration: 5, motors: [] };
      const t = get().motionTime;
      const p = keyedPose(c, study.keys ?? [], t);
      const pos = (p ? p.position : new THREE.Vector3(...c.position)).add(new THREE.Vector3(...delta));
      const keys = [...(study.keys ?? []).filter((k) => !(k.componentId === id && Math.abs(k.time - t) < 1e-6)), { componentId: id, time: t, position: pos.toArray() as [number, number, number], rotation: p ? (p.rotation.toArray() as [number, number, number, number]) : c.rotation }];
      const d: Document = { ...doc, motionStudy: { ...study, keys } };
      set({ doc: d, dirty: true });
      return;
    }
    const d: Document = { ...doc, components: comps.map((x) => (x.id === id ? { ...x, position: [x.position[0] + delta[0], x.position[1] + delta[1], x.position[2] + delta[2]] } : x)) };
    set({ ...withSolvedComponents(d), dirty: true });
  },
  rotateComponent(id, axis, angleDeg) {
    const { doc, rebuild } = get();
    const comps = doc.components ?? [];
    const c = comps.find((x) => x.id === id);
    if (!c || c.fixed) return;
    const body = rebuild.bodies.find((b) => b.id === id);
    body?.geometry.computeBoundingBox();
    const pivot = body?.geometry.boundingBox ? body.geometry.boundingBox.getCenter(new THREE.Vector3()) : new THREE.Vector3(...c.position);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis).normalize(), (angleDeg * Math.PI) / 180);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...c.position), new THREE.Quaternion(...c.rotation), new THREE.Vector3(1, 1, 1));
    const r = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z)).multiply(m);
    const pos = new THREE.Vector3(), rot = new THREE.Quaternion(), sc = new THREE.Vector3();
    r.decompose(pos, rot, sc);
    const d: Document = { ...doc, components: comps.map((x) => (x.id === id ? { ...x, position: [pos.x, pos.y, pos.z], rotation: [rot.x, rot.y, rot.z, rot.w] } : x)) };
    set({ ...withSolvedComponents(d), dirty: true });
  },
  setComponentFixed(id, fixed) {
    const { doc } = get();
    history.push(fixed ? 'Fix' : 'Float', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => (x.id === id ? { ...x, fixed } : x)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  setComponentHidden(id, hidden) {
    const { doc } = get();
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => (x.id === id ? { ...x, hidden } : x)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true });
  },
  showAllComponents() {
    const { doc } = get();
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => ({ ...x, hidden: false })) };
    set({ doc: d, rebuild: rebuildFor(d, null) });
  },
  deleteComponent(id) {
    const { doc } = get();
    history.push('Delete component', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).filter((x) => x.id !== id), mates: (doc.mates ?? []).filter((m) => m.refs.every((r) => r.componentId !== id)) };
    set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startMate() {
    const { doc } = get();
    if (!isAssembly(doc)) {
      get().pushMessage('Mates are defined in an assembly (File ▸ New ▸ Assembly).', 'warn');
      return;
    }
    const n = (doc.mates ?? []).length + 1;
    const draft: Mate = { id: newId('mate'), type: 'coincident', name: `Coincident${n}`, refs: [] as unknown as [MateRef, MateRef], aligned: false, suppressed: false };
    set({ mateEdit: { mateId: null, draft }, insertingComponent: false, featureEdit: null, selectedFace: null, selectedFaces: [], selectedEdges: [], asmTool: 'select', managerTab: 'tree', tab: 'assembly' });
  },
  cancelMate() {
    set({ mateEdit: null, selectedFace: null, selectedFaces: [], rebuild: rebuildFor(get().doc, null) });
  },
  updateMateDraft(patch) {
    const me = get().mateEdit;
    if (!me) return;
    const draft = { ...me.draft, ...patch };
    if (patch.type) draft.refs = (draft.refs as unknown as MateRef[]).slice(-mateRefCount(patch.type)) as unknown as [MateRef, MateRef];
    if (patch.type && !me.mateId) {
      const base = ({ coincident: 'Coincident', parallel: 'Parallel', perpendicular: 'Perpendicular', tangent: 'Tangent', concentric: 'Concentric', lock: 'Lock', distance: 'Distance', angle: 'Angle', profileCenter: 'ProfileCenter', symmetric: 'Symmetric', width: 'Width', path: 'PathMate', linearCoupler: 'LinearCoupler', distanceLimit: 'LimitDistance', angleLimit: 'LimitAngle', cam: 'CamMate', slot: 'SlotMate', hinge: 'Hinge', gear: 'GearMate', rackPinion: 'RackPinionMate', screw: 'Screw', universalJoint: 'UniversalJoint' } as Record<string, string>)[patch.type];
      draft.name = `${base}${(get().doc.mates ?? []).filter((m) => m.type === patch.type).length + 1}`;
    }
    set({ mateEdit: { ...me, draft } });
    refreshMatePreview();
  },
  removeMateRef(index) {
    const me = get().mateEdit;
    if (!me) return;
    const refs = me.draft.refs.filter((_, i) => i !== index) as unknown as [MateRef, MateRef];
    set({ mateEdit: { ...me, draft: { ...me.draft, refs } }, selectedFaces: get().selectedFaces.filter((_, i) => i !== index), selectedFace: null });
    refreshMatePreview();
  },
  commitMate(keepOpen = false) {
    const { doc, mateEdit } = get();
    if (!mateEdit || mateEdit.draft.refs.length !== mateRefCount(mateEdit.draft.type)) return;
    let draft = splitMateRefs(mateEdit.draft);
    // coupling mates remember where both components were when the mate was made
    if (COUPLING_MATES.has(draft.type)) {
      const ca = (doc.components ?? []).find((c) => c.id === draft.refs[0].componentId), cb = (doc.components ?? []).find((c) => c.id === draft.refs[1].componentId);
      if (ca && cb) draft = { ...draft, base: { a: { position: [...ca.position], rotation: [...ca.rotation] }, b: { position: [...cb.position], rotation: [...cb.rotation] } } };
    }
    if (draft.refs[0].componentId === draft.refs[1].componentId) {
      get().pushMessage('Select faces of two different components.', 'warn');
      return;
    }
    history.push(mateEdit.mateId ? `Edit ${draft.name}` : draft.name, doc);
    // Add to new folder: the new mate goes into a folder of its own under Mates
    const mo = get().mateOpts;
    if (mo.newFolder && !mateEdit.mateId && !draft.folder) draft = { ...draft, folder: `MateGroup${new Set((doc.mates ?? []).map((m) => m.folder).filter(Boolean)).size + 1}` };
    // Use for positioning only: the components move to the mated position, no mate is kept
    if (mo.positionOnly && !mateEdit.mateId) {
      const placed = rebuildFor({ ...doc, mates: [...(doc.mates ?? []), draft] }, null) as unknown as { components?: Component[] };
      const d0: Document = { ...doc, components: (doc.components ?? []).map((c) => placed.components?.find((x) => x.id === c.id) ?? c) };
      set({ doc: d0, rebuild: rebuildFor(d0, null), mateEdit: null, selectedFace: null, selectedFaces: [], dirty: true, ...historyFlags() });
      autosave(d0);
      if (keepOpen) get().startMate();
      return;
    }
    const mates = mateEdit.mateId ? (doc.mates ?? []).map((m) => (m.id === mateEdit.mateId ? draft : m)) : [...(doc.mates ?? []), draft];
    let d: Document = { ...doc, mates };
    const rebuild = rebuildFor(d, null);
    // keep the solved positions so later moves start from the mated state
    const solved = (rebuild as unknown as { components?: Component[] }).components;
    if (solved) d = { ...d, components: (d.components ?? []).map((c) => solved.find((x) => x.id === c.id) ?? c) };
    // the new mate stays selected: its faces light up in cyan, as the original (fr. 365)
    set({ doc: d, rebuild, mateEdit: null, selectedFace: null, selectedFaces: [], selectedFeatureId: draft.id, dirty: true, ...historyFlags() });
    autosave(d);
    // Keep Visible (push pin): the Mate PropertyManager stays open for the next mate
    if (keepOpen) get().startMate();
  },
  editMate(id) {
    const m = (get().doc.mates ?? []).find((x) => x.id === id);
    if (!m) return;
    set({ mateEdit: { mateId: id, draft: joinMateRefs(m) }, featureEdit: null, insertingComponent: false, managerTab: 'tree', tab: 'assembly' });
  },
  deleteMate(id) {
    const { doc } = get();
    history.push('Delete mate', doc);
    const d: Document = { ...doc, mates: (doc.mates ?? []).filter((m) => m.id !== id) };
    set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMateSuppressed(id, suppressed) {
    const { doc } = get();
    const d: Document = { ...doc, mates: (doc.mates ?? []).map((m) => (m.id === id ? { ...m, suppressed } : m)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true });
  },
  setInterferenceHighlight(interferenceHighlight) {
    set({ interferenceHighlight });
  },
  startModelView() {
    if (!isDrawing(get().doc)) {
      get().pushMessage('Drawing views are placed in a drawing (File ▸ New ▸ Drawing).', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'modelView', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'viewLayout' });
  },
  setModelViewSource(model) {
    const de = get().drawingEdit;
    const part: Document = { ...model, kind: model.kind ?? 'part' };
    // Automatic scaling of new drawing views: an empty sheet takes the scale at which the standard views fit
    const sheet = get().doc.sheets?.[0];
    if (sheet && !sheet.views.length && part.kind !== 'drawing') {
      const scale = autoSheetScale(part, sheet);
      if (scale[0] !== sheet.scale[0] || scale[1] !== sheet.scale[1]) set({ doc: { ...get().doc, sheets: [{ ...sheet, scale }, ...(get().doc.sheets ?? []).slice(1)] } });
    }
    set({ drawingEdit: { ...(de ?? { mode: 'modelView', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }), mode: 'modelView', model: part } });
    get().pushMessage(`${model.name}: choose the orientation and click in the sheet to place the view.`);
  },
  setDrawingEdit(patch) {
    const de = get().drawingEdit;
    if (de) set({ drawingEdit: { ...de, ...patch } });
  },
  cancelDrawingEdit() {
    set({ drawingEdit: null });
  },
  placeView(position) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !drawingEdit?.model) return;
    history.push('Model View', doc);
    // Reference Configuration: the model as that configuration
    const model = drawingEdit.configuration ? documentForConfiguration(drawingEdit.model, drawingEdit.configuration) : drawingEdit.model;
    const view: DrawingView = { id: newId('dv'), name: nextViewName(sheet), type: drawingEdit.orientation, position, scale: drawingEdit.useCustomScale ? drawingEdit.scale : undefined, displayStyle: drawingEdit.displayStyle, model, modelName: `${drawingEdit.model.name}<1>`, relative: drawingEdit.relative, empty: drawingEdit.emptyView || undefined, predefined: drawingEdit.predefined || undefined, ...(drawingEdit.configuration ? { configuration: drawingEdit.configuration } : {}), ...(drawingEdit.draftQuality ? { draftQuality: true } : {}), ...(drawingEdit.trueDims ? { trueDims: true } : {}), ...(drawingEdit.threadDraft ? { threadDraft: true } : {}), ...(drawingEdit.bendLines !== false && drawingEdit.model.features.some((f) => f.type === 'flatPattern' && !f.suppressed) ? { bendLines: true } : {}), ...(drawingEdit.bendNotes ? { bendNotes: true } : {}) };
    let d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] };
    // Import options ▸ Import annotations: the model dimensions come into the new view
    if (drawingEdit.importAnnotations && !drawingEdit.emptyView && !drawingEdit.predefined) {
      const dims = modelItems([view], { sketchDims: true, featureDims: true, holeDims: true, eliminateDuplicates: true }, sheet.dimensions);
      if (dims.length) d = { ...d, sheets: [{ ...d.sheets![0], dimensions: [...d.sheets![0].dimensions, ...dims] }] };
    }
    if (drawingEdit.emptyView || drawingEdit.predefined || drawingEdit.relative) {
      // these views stand alone: no projected views follow
      // a Predefined View opens its PropertyManager (Insert Model)
      set({ doc: d, selectedDrawingViewId: view.id, drawingEdit: null, dirty: true, managerTab: drawingEdit.predefined ? 'properties' : get().managerTab, ...historyFlags() });
      autosave(d);
      return;
    }
    // as the original: after placing the view the Projected View command continues from it (Auto-start projected view)
    const auto = getPref('drawing.autoProjected') !== false;
    set({ doc: d, selectedDrawingViewId: view.id, drawingEdit: auto ? { ...drawingEdit, mode: 'projected', parentId: view.id, useParentStyle: true, scaleMode: 'parent' } : null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startDrawingSection(axis: 'h' | 'v' = 'v', removed = false) {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId && !v.section && !v.detail) ?? sheet?.views.find((v) => !v.section && !v.detail && !['isometric', 'trimetric', 'dimetric'].includes(v.type));
    if (!parent) {
      get().pushMessage('Insert a model view first; the section is cut through it.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'section', orientation: parent.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: parent.scale ?? [1, 1], parentId: parent.id, sectionAxis: axis, sectionFlip: false, sectionRemoved: removed }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  setSectionLine(parentId, at) {
    const de = get().drawingEdit;
    // Auto-start section view off: the section view is placed only after "Place section view"
    if (de && de.mode === 'section') set({ drawingEdit: { ...de, parentId, sectionAt: at, sectionHold: getPref('drawing.autoStartSection') === false } });
  },
  placeSectionView(position) {
    const { doc, drawingEdit: de } = get();
    if (de?.sectionHold) {
      get().pushMessage('Click "Place section view" in the PropertyManager first.', 'warn');
      return;
    }
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === de?.parentId);
    if (!sheet || !parent || !de || de.sectionAt === undefined) return;
    history.push('Section View', doc);
    const label = nextViewLabel(sheet);
    const axis = de.sectionAxis ?? 'v';
    // the section stays aligned with its parent (beside it for a vertical line, above/below for a horizontal one)
    // a removed section is placed where it is clicked
    const pos: [number, number] = de.sectionRemoved ? position : axis === 'v' ? [position[0], parent.position[1]] : [parent.position[0], position[1]];
    const view: DrawingView = { id: newId('dv'), name: `Section View ${label}-${label}`, type: parent.type, position: pos, scale: de.useCustomScale ? de.scale : parent.scale, displayStyle: 'hiddenRemoved', model: parent.model, modelName: parent.modelName, section: { parentId: parent.id, parentType: parent.type, axis, at: de.sectionAt, flip: sectionFlipFor(axis, parent.position, pos, !!de.sectionFlip), label, ...(de.sectionRemoved ? { removed: true } : {}), ...(de.sectionSlice ? { slice: true } : {}), ...(de.sectionDepth ? { depth: de.sectionDepth } : {}), ...(de.sectionAutoHatch ? { autoHatch: true } : {}), ...(de.sectionHalf ? { half: de.sectionHalf } : {}) } };
    const d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] };
    set({ doc: d, drawingEdit: null, selectedDrawingViewId: view.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startDetailView() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId && !v.section && !v.detail) ?? sheet?.views.find((v) => !v.section && !v.detail);
    if (!parent) {
      get().pushMessage('Insert a model view first; the detail circle is drawn in it.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'detail', orientation: parent.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: true, scale: [2, 1], parentId: parent.id }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  setDetailCircle(parentId, center, radius, rect) {
    const de = get().drawingEdit;
    if (de && de.mode === 'detail') set({ drawingEdit: { ...de, parentId, detailCenter: center, detailRadius: radius, detailRect: rect } });
  },
  placeDetailView(position) {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === de?.parentId);
    if (!sheet || !parent || !de || !de.detailCenter || !de.detailRadius) return;
    history.push('Detail View', doc);
    const label = nextViewLabel(sheet);
    const ps = parent.scale ?? sheet.scale;
    const scale: [number, number] = de.useCustomScale ? de.scale : [ps[0] * 2, ps[1]];
    const view: DrawingView = { id: newId('dv'), name: `Detail View ${label} (${scale[0]} : ${scale[1]})`, type: parent.type, position, scale, displayStyle: 'hiddenRemoved', model: parent.model, modelName: parent.modelName, detail: { parentId: parent.id, parentType: parent.type, center: de.detailCenter, radius: de.detailRadius, label, outline: de.detailOutline ?? 'none', pinned: de.detailPinned !== false, ...(de.detailStyle && de.detailStyle !== 'perStandard' ? { style: de.detailStyle } : {}), ...(de.detailProfile && de.detailRect ? { rect: de.detailRect } : {}) } };
    const d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] };
    set({ doc: d, drawingEdit: null, selectedDrawingViewId: view.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startProjectedView() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId) ?? sheet?.views[0];
    if (!parent) {
      get().pushMessage('Select a drawing view to project from.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'projected', orientation: parent.type, multiple: false, displayStyle: parent.displayStyle, useCustomScale: !!parent.scale, scale: parent.scale ?? [1, 1], parentId: parent.id, useParentStyle: true, scaleMode: 'parent' }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  placeProjectedView(type, position, parentId) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === parentId);
    if (!sheet || !parent) return;
    history.push('Projected View', doc);
    const de = drawingEdit;
    // Scale: the parent's (default), the sheet's, or the custom one; Display Style: the parent's unless unchecked
    const scale = de?.scaleMode === 'sheet' ? undefined : de?.scaleMode === 'custom' ? de.scale : parent.scale;
    const usedLabels = new Set(sheet.views.map((v) => v.arrowLabel ?? v.section?.label ?? v.detail?.label ?? v.aux?.label).filter(Boolean));
    const arrowLabel = de?.projArrow ? 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('').find((c) => !usedLabels.has(c)) : undefined;
    const model = de?.configuration && de.configuration !== parent.configuration ? documentForConfiguration(parent.model, de.configuration) : parent.model;
    const view: DrawingView = { id: newId('dv'), name: nextViewName(sheet), type, position, scale, parentId, displayStyle: de?.useParentStyle === false ? de.displayStyle : parent.displayStyle, model, modelName: parent.modelName, ...(de?.configuration ?? parent.configuration ? { configuration: de?.configuration ?? parent.configuration } : {}), ...(parent.draftQuality ? { draftQuality: true } : {}), ...(parent.threadDraft ? { threadDraft: true } : {}), ...(arrowLabel ? { arrowLabel } : {}) };
    const d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] };
    set({ doc: d, selectedDrawingViewId: parent.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startStandardThreeViews() {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const model = sheet.views[0]?.model;
    if (!model) {
      // no model yet: the Model View command asks for one first
      get().startModelView();
      get().pushMessage('Browse to a part first; Standard 3 View then places front, top and right views.');
      return;
    }
    history.push('Standard 3 View', doc);
    const firstAngle = get().prefs['doc.standard'] === 'ISO' || get().prefs['doc.standard'] === 'DIN';
    const views: DrawingView[] = buildThreeViews(model, sheet, threeViewsCentre(model, sheet, firstAngle), firstAngle).map((v, i) => ({ ...v, id: newId('dv'), name: `Drawing View${sheet.views.length + i + 1}` }));
    views[1].parentId = views[0].id;
    views[2].parentId = views[0].id;
    const d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, ...views] }] };
    set({ doc: d, dirty: true, drawingEdit: null, ...historyFlags() });
    autosave(d);
  },
  updateDrawingView(id, patch) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Drawing View', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === id ? { ...v, ...patch } : v)) }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  selectDrawingView(id) {
    set({ selectedDrawingViewId: id, selectedDrawingDimensionId: null });
  },
  moveDrawingView(id, position) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const moved = sheet.views.find((v) => v.id === id);
    if (!moved) return;
    const dx = position[0] - moved.position[0], dy = position[1] - moved.position[1];
    // children keep their alignment with the parent
    const views = sheet.views.map((v) => (v.id === id ? { ...v, position } : v.detail?.parentId === id && v.detail.pinned === false ? { ...v, position: [v.position[0] + dx, v.position[1] + dy] as [number, number] } : v.parentId === id ? { ...v, position: [v.position[0] + (Math.abs(v.position[0] - moved.position[0]) < 1e-6 ? dx : 0), v.position[1] + (Math.abs(v.position[1] - moved.position[1]) < 1e-6 ? dy : 0)] as [number, number] } : v));
    // the balloons of the view move with it (leader ends stay on the geometry), and so do their magnetic lines
    const sh = (p: [number, number]): [number, number] => [p[0] + dx, p[1] + dy];
    const own = new Set((sheet.symbols ?? []).filter((s) => s.viewId === id && s.kind !== 'areaHatch').map((s) => s.id));
    const symbols = own.size ? (sheet.symbols ?? []).map((s) => (own.has(s.id) ? { ...s, position: sh(s.position), anchor: s.anchor && sh(s.anchor) } : s)) : sheet.symbols;
    const magneticLines = own.size ? (sheet.magneticLines ?? []).map((l) => (l.balloons.length && l.balloons.every((b) => own.has(b)) ? { ...l, a: sh(l.a), b: sh(l.b) } : l)) : sheet.magneticLines;
    set({ doc: { ...doc, sheets: [{ ...sheet, views, symbols, magneticLines }] }, dirty: true });
  },
  commitViewMove() {
    autosave(get().doc);
  },
  deleteDrawingView(id) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Delete view', doc);
    const gone = new Set([id, ...sheet.views.filter((v) => v.parentId === id).map((v) => v.id)]);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.filter((v) => !gone.has(v.id)), dimensions: sheet.dimensions.filter((x) => !gone.has(x.viewId)), centerMarks: sheet.centerMarks.filter((m) => !gone.has(m.viewId)) }] };
    set({ doc: d, selectedDrawingViewId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startDrawingDimension() {
    set({ drawingEdit: { mode: 'dimension', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'annotation' });
  },
  startDrawingDimensionOnLine(viewId, line) {
    const de = get().drawingEdit;
    if (!de) return;
    let value = Math.hypot(line.b[0] - line.a[0], line.b[1] - line.a[1]);
    // Dimension Type ▸ True: a pictorial view measures the model edge, not its foreshortened projection
    const view = get().doc.sheets?.[0]?.views.find((v) => v.id === viewId);
    if (view?.trueDims && !view.section && !view.detail && !view.aux) value = trueLength(view.model, view.type, line.a, line.b) ?? value;
    set({ drawingEdit: { ...de, dimStart: { viewId, kind: 'linear', a: line.a, b: line.b, value } } });
  },
  startDrawingDimensionOnCircle(viewId, circle) {
    const de = get().drawingEdit;
    if (!de) return;
    set({ drawingEdit: { ...de, dimStart: { viewId, kind: 'diameter', a: circle.c, b: [circle.c[0] + circle.r, circle.c[1]], value: 2 * circle.r } } });
  },
  placeDrawingDimension(sheetPoint) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    const ds = drawingEdit?.dimStart;
    if (!sheet || !ds) return;
    const view = sheet.views.find((v) => v.id === ds.viewId);
    if (!view) return;
    const v2d = viewGeometry(view);
    const s = (view.scale ?? sheet.scale)[0] / (view.scale ?? sheet.scale)[1];
    const c: [number, number] = [(v2d.min[0] + v2d.max[0]) / 2, (v2d.min[1] + v2d.max[1]) / 2];
    const label: [number, number] = [c[0] + (sheetPoint[0] - view.position[0]) / s, c[1] + (sheetPoint[1] - view.position[1]) / s];
    let orientation: DrawingDimension['orientation'];
    if (ds.kind === 'linear') {
      const dx = Math.abs(ds.b[0] - ds.a[0]), dy = Math.abs(ds.b[1] - ds.a[1]);
      if (dx < 1e-6) orientation = 'v';
      else if (dy < 1e-6) orientation = 'h';
      else {
        const minx = Math.min(ds.a[0], ds.b[0]), maxx = Math.max(ds.a[0], ds.b[0]), miny = Math.min(ds.a[1], ds.b[1]), maxy = Math.max(ds.a[1], ds.b[1]);
        orientation = label[0] < minx || label[0] > maxx ? 'v' : label[1] < miny || label[1] > maxy ? 'h' : 'aligned';
      }
    }
    const dim: DrawingDimension = { id: newId('dd'), viewId: ds.viewId, kind: ds.kind, a: ds.a, b: ds.b, label, value: 0, orientation };
    dim.value = dimensionValue(dim);
    history.push('Dimension', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, dimensions: [...sheet.dimensions, dim] }] };
    set({ doc: d, drawingEdit: { ...drawingEdit!, dimStart: undefined }, selectedDrawingDimensionId: dim.id, dirty: true, ...historyFlags() });
    autosave(d);
    void _viewToSheet;
  },
  startViewTool(mode) {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId) ?? sheet?.views[0];
    if (!v) {
      get().pushMessage('Insert a drawing view first.', 'warn');
      return;
    }
    set({ drawingEdit: { mode, orientation: v.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], viewTool: { viewId: v.id, axis: 'x' } }, selectedDrawingViewId: v.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  startBrokenOut() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId && !x.section && !x.detail && !x.aux) ?? sheet?.views.find((x) => !x.section && !x.detail && !x.aux);
    if (!v) {
      get().pushMessage('Insert a model view first; the closed profile is drawn in it.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'brokenOut', orientation: v.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], brokenOut: { viewId: v.id, points: [], closed: false, depth: Math.round(viewDepth(v.model, v.type) / 2) } }, selectedDrawingViewId: v.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  addBrokenOutPoint(viewId, p, close) {
    const de = get().drawingEdit;
    if (!de || de.mode !== 'brokenOut' || !de.brokenOut || de.brokenOut.closed) return;
    const bo = de.brokenOut;
    if (bo.points.length && bo.viewId !== viewId) return;
    set({ drawingEdit: { ...de, brokenOut: close && bo.points.length >= 3 ? { ...bo, closed: true } : { ...bo, viewId, points: [...bo.points, p] } } });
  },
  applyBrokenOut() {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    const bo = de?.brokenOut;
    if (!sheet || !bo || !bo.closed || bo.points.length < 3) {
      set({ drawingEdit: null });
      return;
    }
    history.push('Broken-out Section', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === bo.viewId ? { ...v, brokenOut: { poly: bo.points, depth: Math.max(0.01, bo.depth) } } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  removeBrokenOut(viewId) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Delete Broken-out Section', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === viewId ? { ...v, brokenOut: undefined } : v)) }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startModelItems() {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !sheet.views.length) {
      get().pushMessage('Insert a drawing view of a part first.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'modelItems', orientation: sheet.views[0].type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], modelItems: { source: 'entire', sketchDims: true, featureDims: true, holeDims: true } }, managerTab: 'tree', tab: 'annotation' });
  },
  insertModelItems() {
    const { doc, drawingEdit: de, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !de?.modelItems) return;
    const views = de.modelItems.source === 'selected' ? sheet.views.filter((v) => v.id === selectedDrawingViewId) : sheet.views;
    const dims = modelItems(views, de.modelItems, sheet.dimensions);
    if (!dims.length) {
      get().pushMessage('No model items to insert: the views already show them or no view is parallel to a sketch.', 'warn');
      set({ drawingEdit: null });
      return;
    }
    history.push('Model Items', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, dimensions: [...sheet.dimensions, ...dims] }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startAuxView() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === selectedDrawingViewId && !v.section && !v.detail) ?? sheet?.views.find((v) => !v.section && !v.detail);
    if (!sheet || !parent) {
      get().pushMessage('Insert a model view first; the auxiliary view looks perpendicular to one of its edges.', 'warn');
      return;
    }
    set({ drawingEdit: { mode: 'aux', orientation: parent.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: parent.scale ?? sheet.scale, parentId: parent.id }, selectedDrawingViewId: parent.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  setAuxEdge(viewId, a, b) {
    const de = get().drawingEdit;
    if (de && de.mode === 'aux') set({ drawingEdit: { ...de, parentId: viewId, auxEdge: { viewId, a, b } } });
  },
  placeAuxView(position) {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    const parent = sheet?.views.find((v) => v.id === de?.auxEdge?.viewId);
    if (!sheet || !parent || !de?.auxEdge) return;
    const { a, b } = de.auxEdge;
    const dir: [number, number] = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(dir[0], dir[1]) || 1;
    const n: [number, number] = [-dir[1] / L, dir[0] / L];
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const ms = _viewToSheet(sheet, parent, viewGeometry(parent), mid);
    const off = (position[0] - ms[0]) * n[0] + (position[1] - ms[1]) * n[1];
    const side: 1 | -1 = off >= 0 ? 1 : -1;
    // aligned with the edge: the view centre lies on the normal through the edge midpoint
    const pos: [number, number] = [ms[0] + n[0] * off, ms[1] + n[1] * off];
    history.push('Auxiliary View', doc);
    const label = nextViewLabel(sheet);
    const view: DrawingViewT = { id: newId('dv'), name: `Drawing View${sheet.views.length + 1}`, type: parent.type, position: pos, scale: parent.scale, displayStyle: 'hiddenRemoved', model: parent.model, modelName: parent.modelName, aux: { parentId: parent.id, parentType: parent.type, dir, side, mid, label, ...(de.auxArrow === false ? { noArrow: true } : {}), ...(de.auxLabel === false ? { noLabel: true } : {}) } };
    const d: Document = { ...doc, sheets: [{ ...sheet, views: [...sheet.views, view] }] };
    set({ doc: d, drawingEdit: null, selectedDrawingViewId: view.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setViewCrop(viewId, crop) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Crop View', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === viewId ? { ...v, crop } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setViewBreak(viewId, br) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Break', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === viewId ? { ...v, break: br } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setDrawingTool(drawingTool) {
    set({ drawingTool, drawingEdit: null });
  },
  selectDrawingDimension(id) {
    if (!id) {
      set({ selectedDrawingDimensionId: null, drawingEdit: null });
      return;
    }
    set({ selectedDrawingDimensionId: id, selectedDrawingViewId: null, drawingEdit: null, managerTab: 'properties' });
  },
  updateDrawingDimension(id, patch, undoable = true) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    if (undoable) history.push('Dimension', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, dimensions: sheet.dimensions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }, ...(doc.sheets ?? []).slice(1)] };
    set({ doc: d, dirty: true, ...(undoable ? historyFlags() : {}) });
    if (undoable) autosave(d);
  },
  beginAnnotationMove() {
    history.push('Move', get().doc);
    set({ ...historyFlags() });
  },
  moveAnnotation(target, position) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    let next: DrawingSheet = sheet;
    if (target.kind === 'note') next = { ...sheet, notes: sheet.notes.map((n) => (n.id === target.id ? { ...n, position } : n)) };
    else if (target.kind === 'table') next = { ...sheet, tables: (sheet.tables ?? []).map((t) => (t.id === target.id ? { ...t, position } : t)) };
    else {
      let pos = position;
      let lines = sheet.magneticLines;
      const ml = (sheet.magneticLines ?? []).find((l) => l.balloons.includes(target.id));
      if (ml) {
        // on the line: slide along it; pulled more than 8 mm away: it leaves the line
        const dx = ml.b[0] - ml.a[0], dy = ml.b[1] - ml.a[1], L2 = dx * dx + dy * dy || 1;
        const k = ((position[0] - ml.a[0]) * dx + (position[1] - ml.a[1]) * dy) / L2;
        const q: [number, number] = [ml.a[0] + k * dx, ml.a[1] + k * dy];
        if (Math.hypot(q[0] - position[0], q[1] - position[1]) < 8) pos = q;
        else lines = (sheet.magneticLines ?? []).map((l) => (l.id === ml.id ? { ...l, balloons: l.balloons.filter((b) => b !== target.id) } : l));
      }
      next = { ...sheet, symbols: (sheet.symbols ?? []).map((s) => (s.id === target.id ? { ...s, position: pos } : s)), magneticLines: lines };
    }
    set({ doc: { ...doc, sheets: [next, ...(doc.sheets ?? []).slice(1)] }, dirty: true });
  },
  insertHoleTable() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId) ?? sheet?.views.find((x) => x.type === 'front') ?? sheet?.views[0];
    if (!sheet || !v) {
      get().pushMessage('Insert a drawing view with holes first.', 'warn');
      return;
    }
    // placed on a free spot, then it follows the cursor until a click places it (as the original)
    const t: NonNullable<DrawingSheet['tables']>[number] = { id: newId('tb'), kind: 'hole', viewId: v.id };
    const g = tableGrid(sheet, t);
    t.position = freeSpot(sheet, g?.w ?? 80, g?.h ?? 20);
    get().applyDocument('Hole Table', { ...doc, sheets: [{ ...sheet, tables: [...(sheet.tables ?? []), t] }] });
    set({ drawingTool: { kind: 'placeTable', id: t.id } });
  },
  insertGeneralTable(rows, cols) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 ? String.fromCharCode(65 + c) : '')));
    const t: NonNullable<DrawingSheet['tables']>[number] = { id: newId('tb'), kind: 'general', viewId: '', cells };
    const g = tableGrid(sheet, t);
    t.position = freeSpot(sheet, g?.w ?? 75, g?.h ?? 18);
    get().applyDocument('General Table', { ...doc, sheets: [{ ...sheet, tables: [...(sheet.tables ?? []), t] }] });
    set({ drawingTool: { kind: 'placeTable', id: t.id } });
  },
  setTableCell(tableId, r, c, text) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const tables = (sheet.tables ?? []).map((t) => (t.id === tableId && t.cells ? { ...t, cells: t.cells.map((row, i) => (i === r ? row.map((x, j) => (j === c ? text : x)) : row)) } : t));
    const d: Document = { ...doc, sheets: [{ ...sheet, tables }] };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  addSheet() {
    const { doc } = get();
    const cur = doc.sheets?.[0];
    if (!cur) return;
    const all = [cur, ...(doc.otherSheets ?? [])];
    const n = all.length + 1;
    const sheet: DrawingSheet = { id: newId('sh'), name: `Sheet${n}`, size: cur.size, landscape: cur.landscape, scale: cur.scale, showFormat: cur.showFormat, views: [], dimensions: [], notes: [], centerMarks: [], titleBlock: cur.titleBlock };
    get().applyDocument('Add Sheet', { ...doc, sheets: [sheet], otherSheets: all });
    set({ selectedDrawingViewId: null, drawingEdit: null });
  },
  activateSheet(id) {
    const { doc } = get();
    const cur = doc.sheets?.[0];
    const next = (doc.otherSheets ?? []).find((x) => x.id === id);
    if (!cur || !next) return;
    const d: Document = { ...doc, sheets: [next], otherSheets: [...(doc.otherSheets ?? []).filter((x) => x.id !== id), cur] };
    set({ doc: d, selectedDrawingViewId: null, drawingEdit: null, dirty: true });
    autosave(d);
  },
  insertBomTable() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId && x.model.kind === 'assembly') ?? sheet?.views.find((x) => x.model.kind === 'assembly') ?? sheet?.views[0];
    if (!sheet || !v) {
      get().pushMessage('Insert a drawing view of an assembly first.', 'warn');
      return;
    }
    history.push('Bill of Materials', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, tables: [...(sheet.tables ?? []).filter((t) => t.kind !== 'bom'), { id: newId('tb'), kind: 'bom', viewId: v.id }] }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  addRevision(description) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    const revs = sheet.revisions ?? [];
    const letters = 'ABCDEFGHJKLMNPRTUVWY';
    const rev = letters[Math.min(revs.length, letters.length - 1)];
    const date = new Date().toISOString().slice(0, 10);
    history.push('Revision', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, revisions: [...revs, { rev, description: description || (revs.length ? 'CHANGE' : 'INITIAL RELEASE'), date, approved: '' }] }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startAltPosition() {
    const { doc, selectedDrawingViewId } = get();
    const sheet = doc.sheets?.[0];
    const v = sheet?.views.find((x) => x.id === selectedDrawingViewId && x.model.kind === 'assembly') ?? sheet?.views.find((x) => x.model.kind === 'assembly');
    if (!v) {
      get().pushMessage('Alternate Position View needs a view of an assembly.', 'warn');
      return;
    }
    const motion = !!v.model.motionStudy?.motors.length;
    set({ drawingEdit: { mode: 'altPosition', orientation: v.type, multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], altPosition: { source: motion ? 'motion' : 'exploded', time: motion ? 1 : 0, viewId: v.id } }, selectedDrawingViewId: v.id, managerTab: 'tree', tab: 'viewLayout' });
  },
  applyAltPosition() {
    const { doc, drawingEdit: de } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !de?.altPosition) return;
    history.push('Alternate Position View', doc);
    const ap = de.altPosition;
    const name = de.altExisting ?? ((de.altName ?? '').trim() || 'AltPosition_Default_1');
    const d: Document = { ...doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === ap.viewId ? { ...v, altPosition: { source: ap.source, time: ap.time, name } } : v)) }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startTitleBlock() {
    const sheet = get().doc.sheets?.[0];
    if (!sheet) return;
    set({ drawingEdit: { mode: 'titleBlock', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'sheetFormat' });
  },
  startSymbol(kind) {
    const sheet = get().doc.sheets?.[0];
    const used = new Set((sheet?.symbols ?? []).filter((x) => x.kind === 'datum').map((x) => x.text));
    // Sheet Properties ▸ Next datum label, while it is free
    const letter = sheet?.nextDatumLabel && !used.has(sheet.nextDatumLabel) ? sheet.nextDatumLabel : 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('').find((c) => !used.has(c)) ?? 'A';
    set({ drawingEdit: { mode: 'symbol', symbolKind: kind, orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], gtolSymbol: '⏥', gtolTol: '0.05', gtolDatum: '', finish: '3.2', symbolText: kind === 'datum' ? letter : undefined }, managerTab: 'tree', tab: 'annotation' });
  },
  addSymbol(sym) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push(sym.kind === 'balloon' ? 'Balloon' : sym.kind === 'centerline' ? 'Centerline' : 'Annotation', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, symbols: [...(sheet.symbols ?? []), { ...sym, id: newId('sy') }] }] };
    // stays in the command for the next one (as the original), the first pick is cleared
    set({ doc: d, drawingEdit: drawingEdit ? { ...drawingEdit, symbolAnchor: undefined, symbolLine: undefined, symbolText: sym.kind === 'datum' ? String.fromCharCode((sym.text ?? 'A').charCodeAt(0) + 1) : drawingEdit.symbolText } : null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startNote() {
    set({ drawingEdit: { mode: 'note', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1], noteText: '' }, managerTab: 'tree', tab: 'annotation' });
  },
  placeNote(position) {
    const { doc, drawingEdit } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet || !drawingEdit) return;
    const text = (drawingEdit.noteText ?? '').trim() || 'NOTE';
    // Leader: the first click is the point the arrow touches, the second places the text
    if (drawingEdit.noteLeader === 'leader' && !drawingEdit.noteAnchor) {
      set({ drawingEdit: { ...drawingEdit, noteAnchor: position } });
      return;
    }
    let anchor = drawingEdit.noteLeader === 'leader' ? drawingEdit.noteAnchor : undefined;
    // Auto Leader: to the nearest view, at its edge toward the note
    if (drawingEdit.noteLeader === 'auto' && sheet.views.length) {
      const v = [...sheet.views].sort((a, b) => Math.hypot(a.position[0] - position[0], a.position[1] - position[1]) - Math.hypot(b.position[0] - position[0], b.position[1] - position[1]))[0];
      anchor = [v.position[0] + (position[0] - v.position[0]) * 0.35, v.position[1] + (position[1] - v.position[1]) * 0.35];
    }
    history.push('Note', doc);
    const note = { id: newId('dn'), text, position, ...(drawingEdit.noteAlign && drawingEdit.noteAlign !== 'left' ? { align: drawingEdit.noteAlign } : {}), ...(drawingEdit.noteFont ? { fontSize: drawingEdit.noteFont } : {}), ...(anchor ? { anchor } : {}), ...(drawingEdit.noteBorder && drawingEdit.noteBorder !== 'none' ? { border: drawingEdit.noteBorder } : {}) };
    const d: Document = { ...doc, sheets: [{ ...sheet, notes: [...sheet.notes, note] }] };
    set({ doc: d, drawingEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startCenterMark() {
    set({ drawingEdit: { mode: 'centerMark', orientation: 'front', multiple: false, displayStyle: 'hiddenRemoved', useCustomScale: false, scale: [1, 1] }, managerTab: 'tree', tab: 'annotation' });
  },
  addCenterMark(viewId, circle) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    if (sheet.centerMarks.some((m) => m.viewId === viewId && Math.hypot(m.c[0] - circle.c[0], m.c[1] - circle.c[1]) < 1e-3)) return;
    history.push('Center Mark', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, centerMarks: [...sheet.centerMarks, { id: newId('cm'), viewId, c: circle.c, r: circle.r }] }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setMaterial(material) {
    const { doc, materialTarget } = get();
    history.push('Material', doc);
    let d: Document;
    if (materialTarget) {
      const bodyMaterials = { ...(doc.bodyMaterials ?? {}) };
      if (material) bodyMaterials[materialTarget] = material;
      else delete bodyMaterials[materialTarget];
      d = { ...doc, bodyMaterials };
    } else d = { ...doc, material: material ?? undefined };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setBodyHidden(id, hidden) {
    const { doc } = get();
    history.push(hidden ? 'Hide Body' : 'Show Body', doc);
    const rest = (doc.hiddenBodies ?? []).filter((x) => x !== id);
    const d: Document = { ...doc, hiddenBodies: hidden ? [...rest, id] : rest };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, selectedFace: null, selectedFaces: [], ...historyFlags() });
    autosave(d);
  },
  openMaterialFor(bodyId) {
    set({ materialTarget: bodyId, dialog: 'material' });
  },
  startCurveFeature(type) {
    const { doc, activeSketchId, selectedFeatureId, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a solid body first: the sketch is projected onto it.', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) {
      const used = new Set(doc.features.filter((f) => f.type !== 'sketch' && 'sketchId' in f).map((f) => (f as { sketchId: Id }).sketchId));
      const free = [...doc.features].reverse().find((f) => f.type === 'sketch' && !used.has(f.sketchId));
      if (free && free.type === 'sketch') sketchId = free.sketchId;
    }
    const draft = type === 'splitLine'
      ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, sketchId: sketchId ?? '' }
      : { id: newId('f'), type, name: featureName(doc, type), suppressed: false, sketchId: sketchId ?? '', reverse: false };
    set({ featureEdit: { featureId: null, draft: draft as SolidFeature }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false });
  },
  startHelix() {
    const { doc, activeSketchId, selectedFeatureId } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Open or select a sketch with a circle: the helix starts on that circle.', 'warn');
    const draft: HelixFeature = { id: newId('f'), type: 'helix', name: featureName(doc, 'helix'), sketchId: sketchId ?? '', suppressed: false, definedBy: 'pitchRevolution', pitch: 10, revolutions: 3, height: 30, startAngle: 0, clockwise: true, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false });
  },
  startBaseFlange() {
    const { doc, activeSketchId, selectedFeatureId } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Open or select the sketch of the flange (an open profile bends, a closed one becomes a tab).', 'warn');
    const draft: BaseFlangeFeature = { id: newId('f'), type: 'baseFlange', name: featureName(doc, 'baseFlange'), sketchId: sketchId ?? '', suppressed: false, depth: 60, midPlane: true, reverse: false, flipDir: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startMiterFlange() {
    const { doc, rebuild, selectedEdges, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Select the sketch of the profile (an open chain on a plane across the first edge).', 'warn');
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id))) ?? rebuild.bodies[0];
    const edges = selectedEdges.map((id) => body.edges.find((x) => x.id === id)).filter((x) => x && x.straight).map((e) => edgeRef(e!));
    const draft: MiterFlangeFeature = { id: newId('f'), type: 'miterFlange', name: featureName(doc, 'miterFlange'), sketchId: sketchId ?? '', suppressed: false, edges, reverse: false, gap: 0.25 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startSurface(kind) {
    const { doc, activeSketchId, selectedFeatureId, selectedFace, rebuild } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    const base = { extrude: 'Surface-Extrude', revolve: 'Surface-Revolve', planar: 'Surface-Plane', offset: 'Surface-Offset', knit: 'Surface-Knit', sweep: 'Surface-Sweep', loft: 'Surface-Loft', trim: 'Surface-Trim', filled: 'Surface-Fill', ruled: 'Surface-Ruled', extend: 'Surface-Extend', untrim: 'Surface-Untrim', deleteHole: 'DeleteHole', flatten: 'Surface-Flatten', thicken: 'Thicken', thickenCut: 'Thicken-Cut', cutWithSurface: 'SurfaceCut', replaceFace: 'Replace Face', boundary: 'Boundary-Surface' }[kind];
    const n = doc.features.filter((f) => f.type === 'surface' && f.kind === kind).length + 1;
    let face: SurfaceFeature['face'] = null;
    if (kind === 'offset' && selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (b && fc) face = { normal: [...fc.normal] as [number, number, number], point: [...fc.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const SURFACE_TOOLS: SurfaceFeature['kind'][] = ['filled', 'ruled', 'extend', 'untrim', 'deleteHole', 'flatten', 'thicken', 'thickenCut', 'cutWithSurface', 'replaceFace'];
    // the surface tools work on the selected surface feature (else the last one)
    const surfFeatures = doc.features.filter((f): f is SurfaceFeature => f.type === 'surface' && f.kind !== 'knit');
    const selSurf = surfFeatures.find((f) => f.id === selectedFeatureId) ?? surfFeatures[surfFeatures.length - 1];
    const target = SURFACE_TOOLS.includes(kind) ? selSurf?.id : undefined;
    const draft: SurfaceFeature = { id: newId('f'), type: 'surface', name: `${base}${n}`, suppressed: false, kind, target, thickness: 2, ruledMode: 'tangent', vector: [0, 1, 0], faces: [], fillWhich: 'outer', sketchId: kind === 'offset' || kind === 'knit' || (SURFACE_TOOLS.includes(kind) && kind !== 'filled') ? undefined : sketchId ?? '', depth: 10, angle: 360, distance: 5, face, surfaces: kind === 'knit' ? doc.features.filter((f) => f.type === 'surface' && !f.suppressed && f.kind !== 'knit' && f.kind !== 'trim').map((f) => f.id) : undefined, createSolid: false, ...(kind === 'trim' ? { trimPlane: get().selectedPlane ?? 'front', target: (rebuild.surfaceBodies ?? [])[0]?.featureIds[0], flip: false } : {}) };
    if ((kind === 'extrude' || kind === 'revolve' || kind === 'planar' || kind === 'sweep' || kind === 'loft' || kind === 'boundary') && !sketchId) get().pushMessage('Select the sketch in the FeatureManager design tree (or open it) first.', 'warn');
    if (SURFACE_TOOLS.includes(kind) && kind !== 'ruled' && kind !== 'replaceFace' && !target && !(kind === 'filled' && sketchId)) get().pushMessage('Create a surface first (Extruded, Revolved, Planar … Surface); the tool works on it.', 'warn');
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'surfaces', managerTab: 'tree', planePick: false });
  },
  startIntersect() {
    const { doc, rebuild } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Intersect needs two solid bodies (Boss-Extrude with Merge result off, or an imported body).', 'warn');
      return;
    }
    const draft: IntersectFeature = { id: newId('f'), type: 'intersect', name: featureName(doc, 'intersect'), suppressed: false, bodies: rebuild.bodies.slice(0, 2).map((b) => b.id), exclude: [], merge: true };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startDeleteFace() {
    const { doc, rebuild, selectedFace, selectedFaces } = get();
    if (!rebuild.bodies.length) return get().pushMessage('Delete Face needs a body.', 'warn');
    // faces picked beforehand are taken in
    const refs = [...new Map([...selectedFaces, ...(selectedFace ? [selectedFace] : [])].map((r) => [r.faceId, r])).values()].flatMap((r) => {
      const b = rebuild.bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      return f && b ? [{ normal: [...f.normal] as [number, number, number], point: [...f.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(f) + 1}>` }] : [];
    });
    const n = doc.features.filter((f) => f.type === 'deleteFace').length + 1;
    const draft: DeleteFaceFeature = { id: newId('f'), type: 'deleteFace', name: `DeleteFace${n}`, suppressed: false, faces: refs, option: 'patch' };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startDraft() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const draft: DraftFeature = { id: newId('f'), type: 'draft', name: featureName(doc, 'draft'), suppressed: false, angle: 1, neutral: null, faces: [] };
    set({ featureEdit: { featureId: null, draft }, draftFocus: 'neutral', activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startSketchedBend() {
    const { doc, rebuild, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Select the sketch with the bend line (one line on a face of the sheet).', 'warn');
    const draft: SketchedBendFeature = { id: newId('f'), type: 'sketchedBend', name: featureName(doc, 'sketchedBend'), sketchId: sketchId ?? '', suppressed: false, angle: 90, flipSide: false, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startJog() {
    const { doc, rebuild, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Select the sketch with the jog line (one line on a face of the sheet).', 'warn');
    const draft: JogFeature = { id: newId('f'), type: 'jog', name: featureName(doc, 'jog'), sketchId: sketchId ?? '', suppressed: false, offset: 10, flipSide: false, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startEdgeFlange() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id))) ?? rebuild.bodies[0];
    const e = selectedEdges.map((id) => body.edges.find((x) => x.id === id)).find((x) => x && x.straight);
    const draft: EdgeFlangeFeature = { id: newId('f'), type: 'edgeFlange', name: featureName(doc, 'edgeFlange'), suppressed: false, edge: e ? edgeRef(e) : null, angle: 90, length: 32, lengthMode: 'outerSharp', position: 'materialOutside', flip: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedEdges: e ? [e.id] : [] });
  },
  startThread() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('A thread needs a solid body with a cylinder or a hole.', 'warn');
      return;
    }
    let edge: ThreadFeature['edge'] = null;
    for (const b of rebuild.bodies) {
      const e = b.edges.find((x) => selectedEdges.includes(x.id) && x.closed && !x.straight);
      if (e) { edge = threadEdge(b.geometry, e.points, b.edges.indexOf(e) + 1); break; }
    }
    const [size, dia, pitch] = edge ? nearestThread(edge.radius * 2, edge.internal) : METRIC_THREADS[7];
    const draft: ThreadFeature = { id: newId('f'), type: 'thread', name: `${size} Thread${doc.features.filter((f) => f.type === 'thread').length + 1}`, suppressed: false, edge, size, diameter: dia, pitch, length: 10, method: 'cut', rightHand: true, angle: 0, offset: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startWrap() {
    const { doc, rebuild, activeSketchId, selectedFeatureId, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Wrap needs a solid body with a cylindrical face.', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) sketchId = [...doc.features].reverse().find((f) => f.type === 'sketch' && !doc.features.some((g) => g !== f && 'sketchId' in g && g.type !== 'sketch' && (g as { sketchId?: Id }).sketchId === (f as { sketchId: Id }).sketchId))?.['sketchId' as never] ?? null;
    let face: WrapFeature['face'] = null;
    if (selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      const cyl = b && fc && fc.curved ? fitCylinder(b.geometry, fc.triangles) : null;
      if (cyl && b && fc) face = { ...cyl, label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const draft: WrapFeature = { id: newId('f'), type: 'wrap', name: featureName(doc, 'wrap'), sketchId: sketchId ?? '', suppressed: false, kind: 'emboss', depth: 1, face };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startUnfold(kind) {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length || !doc.features.some((f) => f.type === 'baseFlange' && !f.suppressed)) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const draft: UnfoldFeature = { id: newId('f'), type: kind, name: featureName(doc, kind), suppressed: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startCrossBreak() {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let face: CrossBreakFeature['face'] = null;
    if (selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (b && fc && !fc.curved) face = { normal: [...fc.normal] as [number, number, number], point: [...fc.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const draft: CrossBreakFeature = { id: newId('f'), type: 'crossBreak', name: featureName(doc, 'crossBreak'), suppressed: false, face, radius: 1, angle: 2, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startHem() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id))) ?? rebuild.bodies[0];
    const e = selectedEdges.map((id) => body.edges.find((x) => x.id === id)).find((x) => x && x.straight);
    const draft: HemFeature = { id: newId('f'), type: 'hem', name: featureName(doc, 'hem'), suppressed: false, edge: e ? edgeRef(e) : null, hemType: 'closed', length: 10, gap: 2, position: 'materialInside', flip: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedEdges: e ? [e.id] : [] });
  },
  dimxpertEdit: null,
  startDimXpert(kind) {
    const { rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('MBD Dimensions need a solid body.', 'warn');
      return;
    }
    const blockMinor = Number(get().prefs['doc.blockLength2'] ?? 0.25);
    const n = (get().doc.dimxpert?.datums.length ?? 0);
    set({ dimxpertEdit: { kind, faces: [], partType: 'prismatic', toleranceType: 'plusMinus', label: String.fromCharCode(65 + Math.min(25, n)), basic: false, plus: blockMinor, minus: blockMinor, symbol: 'position', value: 2 * blockMinor, datums: [] }, featureEdit: null, activeSketchId: null, tool: 'select', selection: [], tab: 'mbd', managerTab: 'dimxpert', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  updateDimXpert(patch) {
    const e = get().dimxpertEdit;
    if (e) set({ dimxpertEdit: { ...e, ...patch } });
  },
  cancelDimXpert() {
    set({ dimxpertEdit: null, selectedFace: null, selectedFaces: [] });
  },
  setDimXpertData(dimxpert) {
    get().applyDocument('MBD Dimensions', { ...get().doc, dimxpert });
  },
  deleteAllTolerances() {
    const { doc } = get();
    if (!doc.dimxpert) return;
    get().applyDocument('Delete All Tolerances', { ...doc, dimxpert: undefined });
    set({ analysis: get().analysis?.kind === 'tolerance' ? null : get().analysis });
    get().pushMessage('All DimXpert dimensions and tolerances deleted.', 'info');
  },
  commitDimXpert() {
    const e = get().dimxpertEdit;
    if (!e) return;
    const { doc, rebuild, prefs } = get();
    const block = { length1: Number(prefs['doc.blockLength1'] ?? 0.5), length2: Number(prefs['doc.blockLength2'] ?? 0.25), length3: Number(prefs['doc.blockLength3'] ?? 0.1), angle: Number(prefs['doc.blockAngle'] ?? 0.5) };
    const cur: DimXpertData = doc.dimxpert ?? { partType: e.partType ?? 'prismatic', toleranceType: e.toleranceType ?? 'plusMinus', datums: [], dims: [], gtols: [] };
    const id = newId('dx');
    const r2 = (v: number) => Math.round(v * 100) / 100;
    let next: DimXpertData;
    if (e.kind === 'auto') {
      next = autoDimensionScheme(rebuild.bodies, { partType: e.partType ?? 'prismatic', toleranceType: e.toleranceType ?? 'plusMinus', block, datums: e.faces.slice(0, 3) });
      if (!next.dims.length && !next.datums.length) return get().pushMessage('No planar faces to dimension.', 'warn');
    } else if (e.kind === 'datum') {
      if (!e.faces.length) return get().pushMessage('Select the datum face.', 'warn');
      const label = (e.label || 'A').toUpperCase();
      next = { ...cur, datums: [...cur.datums.filter((d) => d.label !== label), { id, label, face: e.faces[0] }] };
    } else if (e.kind === 'gtol') {
      if (!e.faces.length) return get().pushMessage('Select the face the tolerance applies to.', 'warn');
      const symbol = e.symbol ?? 'position';
      const value = e.value ?? 2 * block.length2;
      const datums = e.datums ?? [];
      next = { ...cur, gtols: [...cur.gtols, { id, symbol, value, datums, face: e.faces[0], label: `${GTOL_SYMBOLS[symbol]} ${r2(value)}${datums.length ? ' | ' + datums.join(' | ') : ''}` }] };
    } else {
      if (e.faces.length < 2) return get().pushMessage(e.kind === 'size' ? 'Select the two opposite faces.' : 'Select the two faces of the dimension.', 'warn');
      const value = faceDistance(e.faces[0], e.faces[1]);
      if (value < 1e-6) return get().pushMessage('The faces lie in the same plane: pick two faces apart from each other.', 'warn');
      const plus = e.basic ? 0 : e.plus ?? block.length2, minus = e.basic ? 0 : e.minus ?? block.length2;
      const datum = cur.datums.find((d) => Math.hypot(d.face.point[0] - e.faces[0].point[0], d.face.point[1] - e.faces[0].point[1], d.face.point[2] - e.faces[0].point[2]) < 0.5)?.label;
      next = { ...cur, dims: [...cur.dims, { id, kind: e.kind, faces: e.faces.slice(0, 2), value, plus, minus, basic: !!e.basic, label: `${r2(value)}`, datum }] };
    }
    get().applyDocument(e.kind === 'auto' ? 'Auto Dimension Scheme' : 'MBD Dimension', { ...doc, dimxpert: next });
    set({ dimxpertEdit: null, selectedFace: null, selectedFaces: [], managerTab: 'dimxpert' });
  },
  startDeform() {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Deform needs a solid body.', 'warn');
      return;
    }
    const b = selectedFace ? rebuild.bodies.find((x) => x.id === selectedFace.bodyId) : undefined;
    const fc = b?.faces.find((x) => x.id === selectedFace?.faceId);
    const n = doc.features.filter((f) => f.type === 'deform').length + 1;
    const draft: DeformFeature = { id: newId('f'), type: 'deform', name: `Deform${n}`, suppressed: false, kind: 'point', point: fc ? [...fc.centroid] as [number, number, number] : null, direction: fc ? [...fc.normal] as [number, number, number] : [0, 1, 0], label: fc && b ? `Face<${b.faces.indexOf(fc) + 1}>` : undefined, distance: 5, radius: 20, stiffness: 'medium', reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startWeldment() {
    const { doc } = get();
    if (doc.weldment) {
      get().pushMessage('This part is already a weldment.', 'info');
      set({ tab: 'weldments' });
      return;
    }
    get().applyDocument('Weldment', { ...doc, weldment: true, features: [...doc.features, { id: newId('f'), type: 'weldment', name: 'Weldment', suppressed: false }] });
    set({ tab: 'weldments', managerTab: 'tree' });
  },
  startStructuralMember() {
    const { doc } = get();
    const paths = doc.features.filter((f) => f.type === 'sketch' || f.type === 'sketch3d');
    const sel = doc.features.find((f) => f.id === get().selectedFeatureId && (f.type === 'sketch' || f.type === 'sketch3d'));
    const last = sel ?? paths[paths.length - 1];
    const sketchId = last ? (last.type === 'sketch' ? last.sketchId : last.id) : '';
    const n = doc.features.filter((f) => f.type === 'structuralMember').length + 1;
    const draft: StructuralMemberFeature = { id: newId('f'), type: 'structuralMember', name: `Structural Member${n}`, suppressed: false, sketchId, standard: 'iso', profileType: 'square tube', size: '40 x 40 x 4', corner: 'endMiter', gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } };
    const d = doc.weldment ? doc : { ...doc, weldment: true, features: [...doc.features, { id: newId('f'), type: 'weldment' as const, name: 'Weldment', suppressed: false }] };
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false });
  },
  startTrimExtend() {
    const { doc, rebuild, selectedFace } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Trim/Extend needs at least two bodies (structural members).', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'trimExtend').length + 1;
    const draft: TrimExtendFeature = { id: newId('f'), type: 'trimExtend', name: `Trim/Extend${n}`, suppressed: false, bodies: selectedFace ? [selectedFace.bodyId] : [], trimBy: 'bodies', trimBodies: [], face: null, allowExtension: true, weldGap: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [], trimFocus: 'bodies' });
  },
  trimFocus: 'bodies',
  setTrimFocus(trimFocus) {
    set({ trimFocus });
  },
  startEndCap() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('End Cap needs a structural member.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'endCap').length + 1;
    const draft: EndCapFeature = { id: newId('f'), type: 'endCap', name: `End Cap${n}`, suppressed: false, faces: [], thickness: 5, outward: false, useRatio: true, ratio: 0.5, offset: 2, chamfer: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startWeldGusset() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Gusset needs structural members that meet at a corner.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'weldGusset').length + 1;
    const draft: WeldGussetFeature = { id: newId('f'), type: 'weldGusset', name: `Gusset${n}`, suppressed: false, faces: [], profile: 'triangular', d1: 30, d2: 30, thickness: 5, location: 'mid', offset: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startWeldBead() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Weld Bead needs bodies that meet at a corner.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'weldBead').length + 1;
    const draft: WeldBeadFeature = { id: newId('f'), type: 'weldBead', name: `Weld Bead${n}`, suppressed: false, faces: [], size: 5, intermittent: null, from: 0, to: 0, bothSides: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  applyNormalCut() {
    const { doc, selectedFeatureId } = get();
    const cuts = doc.features.filter((f): f is ExtrudeFeature => f.type === 'extrude' && f.op === 'cut');
    const target = cuts.find((f) => f.id === selectedFeatureId) ?? (selectedFeatureId ? null : cuts[cuts.length - 1]);
    if (!target) {
      get().pushMessage(cuts.length ? 'Select the Cut-Extrude feature to convert in the FeatureManager design tree.' : 'Normal Cut needs an Extruded Cut on the sheet.', 'warn');
      return;
    }
    const on = target.normalCut === false;
    get().applyDocument('Normal Cut', { ...doc, features: doc.features.map((f) => (f.id === target.id ? { ...f, normalCut: on, optimizeGeometry: on } : f)) });
    get().pushMessage(`${target.name}: Normal cut ${on ? 'on' : 'off'}${on ? ' (optimize geometry)' : ''}.`, 'info');
  },
  startVent() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const sk = doc.features.filter((f) => f.type === 'sketch') as { sketchId: Id }[];
    const sel = get().selectedFeatureId;
    const selSk = doc.features.find((f) => f.id === sel && f.type === 'sketch') as { sketchId: Id } | undefined;
    const draft: VentFeature = { id: newId('f'), type: 'vent', name: `Vent${doc.features.filter((f) => f.type === 'vent').length + 1}`, suppressed: false, sketchId: selSk?.sketchId ?? sk[sk.length - 1]?.sketchId ?? '', ribWidth: 3, sparWidth: 3, fillIn: false, radius: 0, draft: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startFormTool(shape = 'embossRound') {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let plane = '';
    let d = doc;
    if (selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (face && !face.curved) {
        const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
        d = { ...doc, planes: { ...doc.planes, [def.id]: def } };
        registerPlanes(d.planes);
        plane = def.id;
      }
    }
    if (!plane) get().pushMessage('Select the placement face of the sheet first, then the forming tool.', 'warn');
    const lib = FORM_TOOL_LIBRARY.find((x) => x.id === shape) ?? FORM_TOOL_LIBRARY[0];
    const draft: FormToolFeature = { id: newId('f'), type: 'formTool', name: `${lib.label}${doc.features.filter((f) => f.type === 'formTool' && f.shape === lib.id).length + 1}`, suppressed: false, plane, points: [], shape: lib.id, width: lib.width, length: lib.length, height: lib.height, rotation: 0, flip: false, linkToThickness: true };
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  addFormToolPoint(p) {
    const fe = get().featureEdit;
    if (!fe || fe.draft.type !== 'formTool') return;
    set({ featureEdit: { ...fe, draft: { ...fe.draft, points: [...fe.draft.points, p] } } });
  },
  startGusset() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body with a bend first.', 'warn');
      return;
    }
    const draft: GussetFeature = { id: newId('f'), type: 'gusset', name: `Sheet Metal Gusset${doc.features.filter((f) => f.type === 'gusset').length + 1}`, suppressed: false, faces: [], depth: 10, width: 6, offset: null, flip: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startTabSlot() {
    const { doc, rebuild, selectedEdges } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Tab and Slot needs two sheet metal bodies: the tabs on one, the slots in the other.', 'warn');
      return;
    }
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id)));
    const e = selectedEdges.map((id) => body?.edges.find((x) => x.id === id)).find((x) => x && x.straight);
    const draft: TabSlotFeature = { id: newId('f'), type: 'tabSlot', name: `Tab and Slot${doc.features.filter((f) => f.type === 'tabSlot').length + 1}`, suppressed: false, edge: e ? edgeRef(e) : null, slotFace: null, tabLength: 10, tabHeight: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness, linkToThickness: true, count: 3, edgeOffset: 5, clearance: 0.1 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedEdges: e ? [e.id] : [], selectedFace: null, selectedFaces: [] });
  },
  startRip() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Rip needs a (shelled) solid body.', 'warn');
      return;
    }
    const edges = selectedEdges.map((id) => rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x && x.straight).map((e) => edgeRef(e));
    const draft: RipFeature = { id: newId('f'), type: 'rip', name: `Rip${doc.features.filter((f) => f.type === 'rip').length + 1}`, suppressed: false, edges, gap: 0.1, direction: 'both' };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startSweptFlange() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const sk = doc.features.filter((f) => f.type === 'sketch') as { sketchId: Id }[];
    const edges = selectedEdges.map((id) => rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x && x.straight).map((e) => edgeRef(e));
    const draft: SweptFlangeFeature = { id: newId('f'), type: 'sweptFlange', name: `Swept Flange${doc.features.filter((f) => f.type === 'sweptFlange').length + 1}`, suppressed: false, sketchId: sk[sk.length - 1]?.sketchId ?? '', pathSketchId: '', edges, reverse: false, merge: true };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  toggleFlatten() {
    const { doc } = get();
    const fp = doc.features.find((f) => f.type === 'flatPattern');
    if (!fp) {
      get().pushMessage('Flatten needs a sheet metal part (Base Flange/Tab from an open sketch).', 'warn');
      return;
    }
    get().toggleSuppress(fp.id);
  },
  setAppearance(color, bodyId = null) {
    const { doc } = get();
    history.push('Appearance', doc);
    let d: Document;
    if (bodyId) {
      const bodyAppearances = { ...(doc.bodyAppearances ?? {}) };
      if (color) bodyAppearances[bodyId] = color;
      else delete bodyAppearances[bodyId];
      d = { ...doc, bodyAppearances };
    } else d = { ...doc, appearance: color ?? undefined };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setFaceAppearance(face, color) {
    const { doc, rebuild } = get();
    const body = rebuild.bodies.find((b) => b.id === face.bodyId);
    const f = body?.faces.find((x) => x.id === face.faceId);
    if (!f) return;
    history.push('Appearance', doc);
    const same = (a: { normal: number[]; point: number[] }) => Math.hypot(a.point[0] - f.centroid[0], a.point[1] - f.centroid[1], a.point[2] - f.centroid[2]) < 1e-3 && a.normal[0] * f.normal[0] + a.normal[1] * f.normal[1] + a.normal[2] * f.normal[2] > 0.999;
    const list = (doc.faceAppearances ?? []).filter((a) => !same(a));
    if (color) list.push({ normal: [...f.normal] as [number, number, number], point: [...f.centroid] as [number, number, number], color });
    const d: Document = { ...doc, faceAppearances: list };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setSketchTool(patch) {
    set({ sketchTool: { ...get().sketchTool, ...patch } });
  },
  addPierce(pointId) {
    const { activeSketchId, doc } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    const p = sk?.points[pointId];
    if (!sk || !p) return;
    const pts = piercePoints(doc, sk);
    if (!pts.length) return get().pushMessage('No curve of another sketch passes through this sketch plane.', 'warn');
    const best = pts.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    get().commit('Pierce', (k) => {
      const id = newId('c');
      return { ...k, constraints: { ...k.constraints, [id]: { id, kind: 'pierce', refs: [pointId], target: { x: best.x, y: best.y }, pierce: { sketchId: best.sketchId, entityId: best.entityId } } }, constraintOrder: [...k.constraintOrder, id] };
    });
  },
  fullyDefine(opts) {
    const { activeSketchId, doc } = get();
    if (!activeSketchId) return;
    let added = 0, dof = 0;
    get().commit('Fully Define Sketch', (k) => {
      const r = fullyDefineSketch(k, { ...opts, entityIds: opts.selected ? get().selection.filter((x) => x.kind === 'entity').map((x) => x.id) : undefined });
      added = r.added;
      dof = r.dof;
      return r.added ? r.sketch : k;
    });
    void doc;
    get().pushMessage(dof === 0 ? `Fully Define Sketch: ${added} relations and dimensions added; the sketch is fully defined.` : `Fully Define Sketch: ${added} added, ${dof} degrees of freedom left.`, dof === 0 ? 'info' : 'warn');
  },
  addEquationCurve(expr, x1, x2, yexpr) {
    if (!get().activeSketchId) return false;
    if (!(x2 > x1)) {
      get().pushMessage('x2 must be larger than x1.', 'error');
      return false;
    }
    const n = 24;
    const pts: SketchPoint[] = [];
    try {
      for (let i = 0; i <= n; i++) {
        const t = x1 + ((x2 - x1) * i) / n;
        if (yexpr !== undefined) {
          // Parametric: x(t), y(t)
          const look = (name: string) => (name === 't' ? t : name === 'pi' ? Math.PI : name === 'e' ? Math.E : undefined);
          const px = evaluateExpression(expr, look, { radians: true }), py = evaluateExpression(yexpr, look, { radians: true });
          if (!Number.isFinite(px) || !Number.isFinite(py)) throw new Error('the equations have no value at t = ' + t.toFixed(2));
          pts.push({ x: px, y: py });
          continue;
        }
        const x = t;
        const y = evaluateExpression(expr, (name) => (name === 'x' ? x : name === 'pi' ? Math.PI : name === 'e' ? Math.E : undefined), { radians: true });
        if (!Number.isFinite(y)) throw new Error('the equation has no value at x = ' + x.toFixed(2));
        pts.push({ x, y });
      }
    } catch (err) {
      get().pushMessage('Equation Driven Curve: ' + (err as Error).message, 'error');
      return false;
    }
    get().commit('Equation Driven Curve', (s) => addSpline(s, pts, false, { equation: { expr: yexpr !== undefined ? `x=${expr}; y=${yexpr}` : expr, x1, x2 } })[0]);
    return true;
  },
  applySketchTool() {
    const { tool, selection, sketchTool: p } = get();
    const ids = selection.filter((x) => x.kind === 'entity').map((x) => x.id);
    if (!ids.length && tool !== 'select') {
      get().pushMessage('Select the sketch entities first.', 'warn');
      return;
    }
    const rad = (deg: number) => (deg * Math.PI) / 180;
    if (tool === 'offset') get().commit('Offset Entities', (s) => {
      // one side, or both (Bi-directional); Cap ends joins the open ends; Base geometry turns the originals to construction
      const sides = p.offsetBidirectional ? [false, true] : [p.offsetReverse];
      let k = s;
      const before = new Set(s.entityOrder);
      // Select chain: the whole chain joined to the picked entities is offset
      const oids = p.offsetChain ? chainOf(s, ids) : ids;
      for (const rev of sides) k = offsetEntities(k, oids, p.offsetDistance, rev, p.offsetConstruction);
      const added = k.entityOrder.filter((id) => !before.has(id));
      if (p.offsetBidirectional && p.offsetCapEnds) {
        // the two new end points nearest to each free end of the original chain are joined with a line
        const ends: SketchPoint[] = [];
        const count = new Map<string, number>();
        const key = (q: SketchPoint) => `${q.x.toFixed(6)},${q.y.toFixed(6)}`;
        for (const id of ids) {
          const e = s.entities[id];
          if (e?.kind !== 'line' && e?.kind !== 'arc') continue;
          for (const pid of e.kind === 'line' ? [e.p1, e.p2] : [e.start, e.end]) count.set(key(s.points[pid]), (count.get(key(s.points[pid])) ?? 0) + 1);
        }
        for (const [kk, n] of count) if (n === 1) { const [x, y] = kk.split(',').map(Number); ends.push({ x, y }); }
        const newEnds: SketchPoint[] = [];
        for (const id of added) {
          const e = k.entities[id];
          if (e?.kind === 'line') newEnds.push(k.points[e.p1], k.points[e.p2]);
          else if (e?.kind === 'arc') newEnds.push(k.points[e.start], k.points[e.end]);
        }
        for (const end of ends) {
          const near = [...newEnds].sort((a, b) => Math.hypot(a.x - end.x, a.y - end.y) - Math.hypot(b.x - end.x, b.y - end.y)).slice(0, 2);
          if (near.length === 2) k = addLineModel(k, near[0], near[1])[0];
        }
      }
      // Add dimensions: the offset distance of each new line to its original
      if (p.offsetDimensions) {
        for (const id of added) {
          const e = k.entities[id];
          if (e?.kind !== 'line') continue;
          const q = k.points[e.p1];
          const orig = ids.map((o) => s.entities[o]).find((o) => o?.kind === 'line' && Math.abs(pointLineDistance(q, s.points[(o as { p1: string }).p1], s.points[(o as { p2: string }).p2]) - p.offsetDistance) < 1e-6);
          if (orig) k = addConstraint(k, 'distance', [e.p1, orig.id], { value: p.offsetDistance })[0];
          break;
        }
      }
      if (p.offsetBaseConstruction) k = toggleConstruction(k, ids.filter((id) => !k.entities[id]?.construction));
      return k;
    });
    // Keep relations: off, the moved entities let go of the rest; Copy keeps the relations among the copies
    else if (tool === 'moveEntities') get().commit('Move Entities', (s) => transformEntities(p.keepRelations ? s : dropOutsideRelations(s, ids), ids, p.moveMode === 'fromTo' ? translate(p.toX - p.fromX, p.toY - p.fromY) : translate(p.dx, p.dy)));
    else if (tool === 'copyEntities') get().commit('Copy Entities', (s) => (p.keepRelations ? copyEntitiesKeep : copyEntities)(s, ids, p.moveMode === 'fromTo' ? translate(p.toX - p.fromX, p.toY - p.fromY) : translate(p.dx, p.dy)));
    else if (tool === 'rotateEntities') get().commit('Rotate Entities', (s) => transformEntities(p.keepRelations ? s : dropOutsideRelations(s, ids), ids, rotateAbout({ x: p.cx, y: p.cy }, p.angle)));
    else if (tool === 'scaleEntities') get().commit('Scale Entities', (s) => transformEntities(p.keepRelations ? s : dropOutsideRelations(s, ids), ids, scaleAbout({ x: p.cx, y: p.cy }, p.scale)));
    else if (tool === 'linearSketchPattern') get().commit('Linear Sketch Pattern', (s) => withSpacingDimension(s, linearSketchPattern(s, ids, p.spacing * Math.cos(rad(p.direction)), p.spacing * Math.sin(rad(p.direction)), p.count, p.count2, p.spacing2 * Math.cos(rad(p.direction2)), p.spacing2 * Math.sin(rad(p.direction2))), ids, p.patternDimensions));
    else if (tool === 'circularSketchPattern') get().commit('Circular Sketch Pattern', (s) => withSpacingDimension(s, circularSketchPattern(s, ids, { x: p.cx, y: p.cy }, p.circAngle, p.circCount, p.circEqual), ids, p.patternDimensions));
    else return;
    set({ tool: 'select', selection: [] });
  },
  convertEntities() {
    const { doc, activeSketchId, rebuild, selectedEdges, selectedFace } = get();
    const sketch = activeSketchId ? doc.sketches[activeSketchId] : null;
    if (!sketch) {
      get().pushMessage('Convert Entities works inside a sketch: open a sketch and select model edges or a face.', 'warn');
      return;
    }
    const plane = resolvePlaneDef(doc, sketch.plane);
    const M = planeMatrix(plane).invert();
    const toSketch = (v: THREE.Vector3) => { const q = v.clone().applyMatrix4(M); return { x: q.x, y: q.y }; };
    const polylines: { points: { x: number; y: number }[]; closed: boolean }[] = [];
    const edges = rebuild.bodies.flatMap((b) => b.edges);
    for (const id of selectedEdges) {
      const e = edges.find((x) => x.id === id);
      if (e) polylines.push({ points: e.points.map(toSketch), closed: e.closed });
    }
    if (selectedFace) {
      // the boundary of a face: every edge of its body that lies in the face plane
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        const n = new THREE.Vector3(...face.normal), c = new THREE.Vector3(...face.centroid);
        for (const e of body.edges) {
          if (selectedEdges.includes(e.id)) continue;
          if (e.points.every((pt) => Math.abs(pt.clone().sub(c).dot(n)) < 1e-3)) polylines.push({ points: e.points.map(toSketch), closed: e.closed });
        }
      }
    }
    if (!polylines.length) {
      get().pushMessage('Select model edges or a face to convert.', 'warn');
      return;
    }
    get().commit('Convert Entities', (s) => convertPolylines(s, polylines));
    set({ selectedEdges: [], selectedFace: null, selectedFaces: [] });
    get().pushMessage(`${polylines.length} entit${polylines.length === 1 ? 'y' : 'ies'} converted.`);
  },
  start3DSketch() {
    const { doc } = get();
    const n = doc.features.filter((f) => f.type === 'sketch3d').length + 1;
    set({ sketch3dEdit: { featureId: null, name: `3DSketch${n}`, segments: [], plane: 'xy', last: null }, featureEdit: null, activeSketchId: null, planePick: false, tool: 'select', tab: 'sketch', managerTab: 'tree' });
    get().pushMessage('3D Sketch: click points in space; Tab switches the plane (XY, YZ, ZX), double-click ends the chain.');
  },
  edit3DSketch(id) {
    const f = get().doc.features.find((x) => x.id === id);
    if (!f || f.type !== 'sketch3d') return;
    set({ sketch3dEdit: { featureId: id, name: f.name, segments: f.segments.map((s) => [[...s[0]], [...s[1]]] as Sketch3DFeature['segments'][number]), plane: 'xy', last: null }, featureEdit: null, activeSketchId: null, tab: 'sketch', managerTab: 'tree' });
  },
  add3DPoint(p) {
    const e = get().sketch3dEdit;
    if (!e) return;
    if (!e.last) {
      set({ sketch3dEdit: { ...e, last: p } });
      return;
    }
    if (Math.hypot(p[0] - e.last[0], p[1] - e.last[1], p[2] - e.last[2]) < 1e-6) return;
    set({ sketch3dEdit: { ...e, segments: [...e.segments, [e.last, p]], last: p } });
  },
  end3DChain() {
    const e = get().sketch3dEdit;
    if (e) set({ sketch3dEdit: { ...e, last: null } });
  },
  cycle3DPlane() {
    const e = get().sketch3dEdit;
    if (!e) return;
    const next = e.plane === 'xy' ? 'yz' : e.plane === 'yz' ? 'zx' : 'xy';
    set({ sketch3dEdit: { ...e, plane: next } });
  },
  undo3DSegment() {
    const e = get().sketch3dEdit;
    if (!e || !e.segments.length) return;
    const segs = e.segments.slice(0, -1);
    set({ sketch3dEdit: { ...e, segments: segs, last: segs.length ? segs[segs.length - 1][1] : null } });
  },
  commit3DSketch() {
    const e = get().sketch3dEdit;
    if (!e) return;
    const { doc } = get();
    if (!e.segments.length) {
      set({ sketch3dEdit: null });
      return;
    }
    history.push('3D Sketch', doc);
    const f: Sketch3DFeature = { id: e.featureId ?? newId('f'), type: 'sketch3d', name: e.name, suppressed: false, segments: e.segments };
    const features = e.featureId ? doc.features.map((x) => (x.id === e.featureId ? f : x)) : [...doc.features, f];
    const d: Document = { ...doc, features };
    set({ doc: d, sketch3dEdit: null, rebuild: rebuildFor(d, null), selectedFeatureId: f.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancel3DSketch() {
    set({ sketch3dEdit: null });
  },
  startComponentPattern(kind) {
    const { doc, selectedFeatureId } = get();
    if (!isAssembly(doc) || !(doc.components ?? []).length) {
      get().pushMessage('A component pattern needs an assembly with components.', 'warn');
      return;
    }
    const seeds = (doc.components ?? []).some((c) => c.id === selectedFeatureId) ? [selectedFeatureId!] : [];
    const pats = doc.componentPatterns ?? [];
    const n = pats.filter((p) => p.kind === kind).length + 1;
    const draft: ComponentPattern = kind === 'linear'
      ? { id: newId('cp'), name: `LocalLPattern${n}`, kind, seeds, dir: [1, 0, 0], spacing: 50, count: 2, dirLabel: 'X axis' }
      : { id: newId('cp'), name: `LocalCirPattern${n}`, kind, seeds, dir: [0, 1, 0], axisPoint: [0, 0, 0], spacing: 0, count: 4, angle: 360, equal: true, dirLabel: 'Y axis' };
    const patternEdit: PatternEdit = { patternId: null, draft, focus: seeds.length ? 'direction' : 'seeds' };
    set({ patternEdit, explodeEdit: null, mateEdit: null, insertingComponent: false, featureEdit: null, managerTab: 'tree', tab: 'assembly' });
    previewPattern(patternEdit);
  },
  editComponentPattern(id) {
    const p = (get().doc.componentPatterns ?? []).find((x) => x.id === id);
    if (!p) return;
    const patternEdit: PatternEdit = { patternId: id, draft: { ...p }, focus: 'seeds' };
    set({ patternEdit, explodeEdit: null, mateEdit: null, featureEdit: null, managerTab: 'tree' });
    previewPattern(patternEdit);
  },
  updatePatternDraft(patch, focus) {
    const pe = get().patternEdit;
    if (!pe) return;
    const next: PatternEdit = { ...pe, draft: { ...pe.draft, ...patch }, focus: focus ?? pe.focus };
    set({ patternEdit: next });
    previewPattern(next);
  },
  commitComponentPattern() {
    const pe = get().patternEdit;
    if (!pe) return;
    if (!pe.draft.seeds.length) {
      get().pushMessage('Select the components to pattern.', 'warn');
      return;
    }
    const { doc } = get();
    history.push(pe.draft.kind === 'linear' ? 'Linear Component Pattern' : 'Circular Component Pattern', doc);
    const pats = doc.componentPatterns ?? [];
    const list = pe.patternId ? pats.map((p) => (p.id === pe.patternId ? pe.draft : p)) : [...pats, pe.draft];
    const d: Document = { ...doc, componentPatterns: list };
    set({ doc: d, patternEdit: null, rebuild: rebuildFor(d, null), selectedFeatureId: pe.draft.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancelComponentPattern() {
    set({ patternEdit: null, rebuild: rebuildFor(get().doc, null) });
  },
  deleteComponentPattern(id) {
    const { doc } = get();
    history.push('Delete', doc);
    const d: Document = { ...doc, componentPatterns: (doc.componentPatterns ?? []).filter((p) => p.id !== id) };
    set({ doc: d, rebuild: rebuildFor(d, null), selectedFeatureId: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startExplode() {
    const { doc, selectedFeatureId } = get();
    if (!isAssembly(doc) || !(doc.components ?? []).length) {
      get().pushMessage('Exploded View needs an assembly with components.', 'warn');
      return;
    }
    const sel = (doc.components ?? []).some((c) => c.id === selectedFeatureId) ? [selectedFeatureId!] : [];
    const explodeEdit: ExplodeEdit = { steps: [...(doc.explodeSteps ?? [])], current: { componentIds: sel, axis: 'y', reverse: false, distance: 50 } };
    set({ explodeEdit, mateEdit: null, insertingComponent: false, featureEdit: null, managerTab: 'tree', tab: 'assembly' });
    previewExplode(explodeEdit);
  },
  updateExplodeDraft(patch) {
    const ee = get().explodeEdit;
    if (!ee) return;
    const next = { ...ee, current: { ...ee.current, ...patch } };
    set({ explodeEdit: next });
    previewExplode(next);
  },
  addExplodeStep() {
    const ee = get().explodeEdit;
    if (!ee) return;
    if (!ee.current.componentIds.length) {
      get().pushMessage('Select the components to explode (in the graphics area or the tree).', 'warn');
      return;
    }
    const next: ExplodeEdit = { steps: [...ee.steps, explodeStepOf(ee, ee.steps.length + 1)], current: { ...ee.current, componentIds: [] } };
    set({ explodeEdit: next });
    previewExplode(next);
  },
  deleteExplodeStep(id) {
    const ee = get().explodeEdit;
    if (!ee) return;
    const next = { ...ee, steps: ee.steps.filter((x) => x.id !== id) };
    set({ explodeEdit: next });
    previewExplode(next);
  },
  commitExplode() {
    const ee = get().explodeEdit;
    if (!ee) return;
    const { doc } = get();
    const steps = ee.current.componentIds.length ? [...ee.steps, explodeStepOf(ee, ee.steps.length + 1)] : ee.steps;
    history.push('Exploded View', doc);
    const d: Document = { ...doc, explodeSteps: steps, exploded: steps.length > 0 };
    set({ doc: d, explodeEdit: null, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancelExplode() {
    set({ explodeEdit: null, rebuild: rebuildFor(get().doc, null) });
  },
  setExploded(exploded) {
    const { doc } = get();
    const d: Document = { ...doc, exploded };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true });
    autosave(d);
  },
  startSectionView() {
    const { sectionView, sectionEdit } = get();
    if (sectionEdit) return;
    if (sectionView) {
      set({ sectionView: null });
      return;
    }
    // Keep cap color: the last cap colour comes back
    const kept = getPref<string>('section.capColor');
    set({ sectionEdit: { plane: 'front', offset: 0, flip: false, cap: true, ...(kept ? { capColor: kept, keepCapColor: true } : {}) }, featureEdit: null, managerTab: 'tree' });
  },
  updateSectionView(patch) {
    const se = get().sectionEdit;
    if (se) set({ sectionEdit: { ...se, ...patch } });
  },
  commitSectionView() {
    const se = get().sectionEdit;
    if (!se) return;
    savePrefs({ ...loadPrefs(), 'section.capColor': se.keepCapColor && se.capColor ? se.capColor : '' });
    set({ sectionView: { ...se, pickBodies: false }, sectionEdit: null });
  },
  saveSectionView() {
    // Drawing Section View ▸ Save: the section is kept with the document (a named view for drawings)
    const { sectionEdit: se, doc } = get();
    if (!se) return;
    const list = doc.sectionViews ?? [];
    const name = `Section View${list.length + 1}`;
    const d: Document = { ...doc, sectionViews: [...list, { name, view: { ...se, pickBodies: false } }] };
    set({ doc: d, dirty: true });
    autosave(d);
    get().pushMessage(`${name} saved.`);
  },
  cancelSectionView() {
    set({ sectionEdit: null });
  },
  setSheetMetalEdit(sheetMetalEdit) {
    set({ sheetMetalEdit, featureEdit: sheetMetalEdit ? null : get().featureEdit, managerTab: 'tree' });
  },
  setSheetMetal(params) {
    const { doc } = get();
    history.push('Sheet-Metal', doc);
    const d: Document = { ...doc, sheetMetal: params };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, sheetMetalEdit: false, ...historyFlags() });
    autosave(d);
  },
  startCombine() {
    const { doc, rebuild } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Combine needs at least two solid bodies (Boss-Extrude with Merge result off, or an imported body).', 'warn');
      return;
    }
    const draft: CombineFeature = { id: newId('f'), type: 'combine', name: featureName(doc, 'combine'), suppressed: false, op: 'add', bodies: rebuild.bodies.map((b) => b.id) };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startRefGeom(kind, editId) {
    const { doc } = get();
    const all = doc.refGeometry ?? [];
    const prefix = kind === 'axis' ? 'Axis' : kind === 'point' ? 'Point' : 'Coordinate System';
    const n = all.filter((r) => r.kind === kind).length + 1;
    const ex = editId ? all.find((r) => r.id === editId) : undefined;
    set({ refEdit: { kind, name: ex?.name ?? `${prefix}${n}`, planes: get().selectedPlane ? [get().selectedPlane!] : [], id: editId }, featureEdit: null, mateEdit: null, planeEdit: null, managerTab: 'tree', tab: get().doc.kind === 'assembly' ? 'assembly' : 'features' });
  },
  cancelRefGeom() {
    set({ refEdit: null, selectedEdges: [], selectedFaces: [], selectedFace: null });
  },
  refSelection() {
    const { selectedEdges, selectedFaces, selectedFace, rebuild, refEdit, doc } = get();
    const bodies = rebuild.bodies;
    const edges = selectedEdges.map((id) => bodies.flatMap((b) => b.edges).find((e) => e.id === id)).filter(Boolean) as RefSelection['edges'];
    const refs = selectedFaces.length ? selectedFaces : selectedFace ? [selectedFace] : [];
    const faces = refs.map((r) => {
      const b = bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      return b && f ? { face: f, geometry: b.geometry } : null;
    }).filter(Boolean) as RefSelection['faces'];
    const planes = (refEdit?.planes ?? []).map((p) => resolvePlaneDef(doc, p));
    return { edges, faces, planes };
  },
  commitRefGeom() {
    const { refEdit, doc } = get();
    if (!refEdit) return;
    const r = refGeometryFrom(refEdit.kind, get().refSelection(), refEdit.id ?? newId('rg'), refEdit.name);
    if (!r) {
      get().pushMessage(refEdit.kind === 'axis' ? 'Select a straight edge, a circular edge, a cylindrical face, or two planes.' : refEdit.kind === 'point' ? 'Select a circular edge (arc center), a face (center of face) or an edge.' : 'Select a point reference (circular edge or face) and directions.', 'warn');
      return;
    }
    history.push(refEdit.id ? `Edit ${r.name}` : r.name, doc);
    const list = (doc.refGeometry ?? []).filter((x) => x.id !== r.id);
    const d: Document = { ...doc, refGeometry: [...list, r] };
    set({ doc: d, refEdit: null, selectedEdges: [], selectedFaces: [], selectedFace: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteRefGeom(id) {
    const { doc } = get();
    history.push('Delete reference geometry', doc);
    const d: Document = { ...doc, refGeometry: (doc.refGeometry ?? []).filter((r) => r.id !== id) };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startPlane() {
    const { doc } = get();
    const n = Object.values(doc.planes).filter((p) => p.kind === 'reference').length + 1;
    set({ planeEdit: { planeId: null, draft: { name: `Plane${n}`, ref: get().selectedPlane ?? 'front', mode: 'offset', distance: 10, angle: 45, flip: false, count: 1 } }, featureEdit: null, mateEdit: null, selectedEdges: [], managerTab: 'tree', tab: 'features', show: { ...get().show, planes: true } });
  },
  showConfiguration(id) {
    const { doc } = get();
    if (!configurations(doc).some((c) => c.id === id)) return;
    history.push('Show Configuration', doc);
    const r = solveAll(activateConfiguration(doc, id), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, featureEdit: null, selectedFace: null, selectedFaces: [], selectedEdges: [], ...historyFlags() });
    autosave(r.doc);
  },
  startAddConfiguration(parentId) {
    set({ configEdit: { configId: null, draft: { name: '', description: '', comment: '', parentId } }, featureEdit: null, mateEdit: null, planeEdit: null, managerTab: 'configurations' });
  },
  animateCollapse() {
    const { doc } = get();
    if (!doc.exploded) return;
    const t0 = performance.now(), dur = 1200;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const d: Document = k >= 1 ? { ...get().doc, exploded: false, explodeFactor: undefined } : { ...get().doc, explodeFactor: 1 - k };
      set({ doc: d, rebuild: rebuildFor(d, null) });
      if (k < 1) requestAnimationFrame(step);
      else autosave(d);
    };
    requestAnimationFrame(step);
  },
  editConfigurationProperties(id) {
    const c = configurations(get().doc).find((x) => x.id === id);
    if (!c) return;
    set({ configEdit: { configId: id, draft: { name: c.name, description: c.description ?? '', comment: c.comment ?? '', descriptionInBom: c.descriptionInBom, bomName: c.bomName, bomUserName: c.bomUserName, hideChildrenInBom: c.hideChildrenInBom, suppressNew: c.suppressNew, color: c.color } }, featureEdit: null, mateEdit: null, planeEdit: null, managerTab: 'configurations' });
  },
  updateConfigDraft(patch) {
    const ce = get().configEdit;
    if (ce) set({ configEdit: { ...ce, draft: { ...ce.draft, ...patch } } });
  },
  commitConfiguration() {
    const ce = get().configEdit;
    if (!ce) return;
    const { doc } = get();
    if (!ce.draft.name.trim()) {
      get().pushMessage('Enter a configuration name.', 'warn');
      return;
    }
    history.push(ce.configId ? 'Configuration Properties' : 'Add Configuration', doc);
    const d = ce.configId
      ? updateConfiguration(doc, ce.configId, { name: ce.draft.name, description: ce.draft.description, comment: ce.draft.comment, ...cfgOpts(ce.draft) })
      : addConfig(doc, ce.draft.name, { description: ce.draft.description, comment: ce.draft.comment, parentId: ce.draft.parentId, ...cfgOpts(ce.draft) });
    set({ doc: d, configEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
    if (!ce.configId) get().pushMessage(`Configuration "${activeConfiguration(d).name}" added and shown.`);
  },
  cancelConfiguration() {
    set({ configEdit: null });
  },
  deleteConfiguration(id) {
    const { doc } = get();
    if (configurations(doc).length <= 1) {
      get().pushMessage('The last configuration cannot be deleted.', 'warn');
      return;
    }
    history.push('Delete Configuration', doc);
    const r = solveAll(deleteConfig(doc, id), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, configEdit: null, ...historyFlags() });
    autosave(r.doc);
  },
  setConfigurationDimension(cfgId, name, value) {
    const { doc } = get();
    history.push('Modify Configurations', doc);
    const r = solveAll(setCfgDim(doc, cfgId, name, value), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  setConfigurationSuppressed(cfgId, featureId, suppressed) {
    const { doc } = get();
    history.push('Modify Configurations', doc);
    const d = setCfgSup(doc, cfgId, featureId, suppressed);
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  applyConfigurationTable(edits, newNames) {
    const { doc } = get();
    history.push('Modify Configurations', doc);
    let d = doc;
    const active = activeConfiguration(doc).id;
    for (const name of newNames) d = addConfig(d, name);
    if (newNames.length) d = activateConfiguration(d, active);
    for (const e of edits) {
      const cfg = configurations(d).find((c) => c.name === e.name);
      if (!cfg) continue;
      for (const [n, v] of Object.entries(e.dims)) d = setCfgDim(d, cfg.id, n, v);
      for (const [f, sup] of Object.entries(e.suppressed)) d = setCfgSup(d, cfg.id, f, sup);
    }
    const r = solveAll(d, {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  openConfigure(target) {
    set({ configure: { dims: target.dims ?? [], features: target.features ?? [] }, dialog: 'configure', modify: null });
  },
  closeConfigure() {
    set({ configure: null, dialog: null });
  },
  setDimensionInConfigurations(name, value, cfgIds) {
    const { doc } = get();
    history.push('Modify dimension', doc);
    let d = doc;
    const ids = cfgIds === 'all' ? configurations(doc).map((c) => c.id) : cfgIds;
    for (const id of ids) d = setCfgDim(d, id, name, value);
    const r = solveAll(d, {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, modify: null, ...historyFlags() });
    autosave(r.doc);
  },
  setComponentConfiguration(id, name) {
    const { doc } = get();
    history.push('Component configuration', doc);
    const d: Document = { ...doc, components: (doc.components ?? []).map((x) => (x.id === id ? { ...x, configuration: name } : x)) };
    set({ doc: d, rebuild: rebuildFor(d, null), dirty: true, ...historyFlags() });
    autosave(d);
  },
  updatePlaneDraft(patch) {
    const pe = get().planeEdit;
    if (pe) set({ planeEdit: { ...pe, draft: { ...pe.draft, ...patch } } });
  },
  commitPlane() {
    const { doc, planeEdit, rebuild } = get();
    if (!planeEdit) return;
    const d = planeEdit.draft;
    const base = resolvePlaneDef(doc, d.ref);
    let axis: { origin: [number, number, number]; dir: [number, number, number] } | undefined;
    let mid: { origin: [number, number, number]; n: [number, number, number] } | undefined;
    if (d.mode === 'mid') {
      const other = d.ref2 ? resolvePlaneDef(doc, d.ref2) : null;
      const cos = other ? Math.abs(other.n[0] * base.n[0] + other.n[1] * base.n[1] + other.n[2] * base.n[2]) : 0;
      if (!other || d.ref2 === d.ref || cos < 0.9999) {
        get().pushMessage('Mid Plane: select a second plane parallel to the first reference.', 'warn');
        return;
      }
      mid = { origin: other.origin, n: other.n };
    }
    if (d.mode === 'perpendicular' && d.edgeId) {
      const e = rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === d.edgeId);
      if (e?.straight) {
        const a = e.points[0], b = e.points[e.points.length - 1];
        axis = { origin: [a.x, a.y, a.z], dir: [b.x - a.x, b.y - a.y, b.z - a.z] };
      }
    }
    if (d.mode === 'angle') {
      const e = d.edgeId ? rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === d.edgeId) : undefined;
      if (!e || !e.straight) {
        get().pushMessage('Select a straight edge as the second reference for the angle.', 'warn');
        return;
      }
      const a = e.points[0], b = e.points[e.points.length - 1];
      axis = { origin: [a.x, a.y, a.z], dir: [b.x - a.x, b.y - a.y, b.z - a.z] };
    }
    history.push(planeEdit.planeId ? `Edit ${d.name}` : d.name, doc);
    const planes = { ...doc.planes };
    const count = d.mode === 'offset' ? Math.max(1, d.count) : 1;
    const existing = Object.values(doc.planes).filter((p) => p.kind === 'reference').length;
    for (let i = 0; i < count; i++) {
      const id = i === 0 && planeEdit.planeId ? planeEdit.planeId : newId('pl');
      const name = i === 0 ? d.name : `Plane${existing + i + 1}`;
      planes[id] = referencePlane(id, name, base, { ref: d.ref, mode: d.mode, distance: d.distance * (i + 1), angle: d.angle, flip: d.flip, axis, ...(mid ? { mid, ref2: d.ref2 } : {}), ...(d.flipNormal ? { flipNormal: true } : {}) });
    }
    const nd: Document = { ...doc, planes };
    registerPlanes(nd.planes);
    set({ doc: nd, planeEdit: null, selectedEdges: [], dirty: true, ...historyFlags() });
    autosave(nd);
  },
  cancelPlane() {
    set({ planeEdit: null, selectedEdges: [] });
  },
  editPlane(id) {
    const pl = get().doc.planes[id];
    if (!pl?.def) return;
    set({ planeEdit: { planeId: id, draft: { name: pl.name, ref: pl.def.ref, mode: pl.def.mode, distance: pl.def.distance, angle: pl.def.angle, flip: pl.def.flip, count: 1, edgeId: undefined, ref2: pl.def.ref2, flipNormal: pl.def.flipNormal } }, featureEdit: null, managerTab: 'tree', tab: 'features' });
  },
  deletePlane(id) {
    const { doc } = get();
    if (Object.values(doc.sketches).some((s) => s.plane === id)) {
      get().pushMessage('The plane is used by a sketch and cannot be deleted.', 'warn');
      return;
    }
    history.push('Delete plane', doc);
    const planes = { ...doc.planes };
    delete planes[id];
    const nd: Document = { ...doc, planes };
    registerPlanes(nd.planes);
    set({ doc: nd, selectedPlane: null, dirty: true, ...historyFlags() });
    autosave(nd);
  },
  togglePatternSkip(index) {
    const fe = get().featureEdit;
    if (!fe || (fe.draft.type !== 'linearPattern' && fe.draft.type !== 'circularPattern')) return;
    const skip = fe.draft.skip ?? [];
    set({ featureEdit: { ...fe, draft: { ...fe.draft, skip: skip.includes(index) ? skip.filter((i) => i !== index) : [...skip, index] } } });
  },
  setSheet(patch) {
    const { doc } = get();
    const sheet = doc.sheets?.[0];
    if (!sheet) return;
    history.push('Sheet properties', doc);
    const d: Document = { ...doc, sheets: [{ ...sheet, ...patch }] };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  importMesh(source, positions) {
    const { doc } = get();
    const base = source.replace(/\.[^.]+$/, '') || 'Imported';
    const fresh = !doc.features.length && !Object.keys(doc.sketches).length;
    const start: Document = fresh ? { ...doc, name: base } : doc;
    history.push('Import', doc);
    const feature: ImportedFeature = { id: newId('f'), type: 'imported', name: featureName(start, 'imported'), suppressed: false, positions, source };
    const d: Document = { ...start, features: [...start.features, feature] };
    const rebuild = rebuildFor(d, null);
    set({ doc: d, rebuild, activeSketchId: null, featureEdit: null, selectedFeatureId: feature.id, selectedFace: null, selection: [], dirty: true, tab: 'features', rollbackIndex: null, ...historyFlags() });
    const err = rebuild.errors[feature.id];
    if (err) get().pushMessage(`${feature.name}: ${err}`, 'error');
    else get().pushMessage(`${source} imported as ${feature.name} (${positions.length / 9} triangles).`);
    autosave(d);
  },
  setEquations(equations) {
    const { doc } = get();
    history.push('Equations', doc);
    const r = solveAll({ ...doc, equations }, {});
    const rebuild = rebuildFor(r.doc, get().rollbackIndex);
    set({ doc: r.doc, solve: r.solve, rebuild, dirty: true, ...historyFlags() });
    const errs = Object.values(applyEquations(r.doc).result.errors);
    if (errs.length) get().pushMessage(`Equations: ${errs[0]}`, 'warn');
    autosave(r.doc);
  },
  setDimensionEquation(constraintId, expression) {
    const { doc } = get();
    const dim = dimensionTable(doc).find((d) => d.ref.kind === 'sketch' && d.ref.constraintId === constraintId);
    if (!dim) return;
    const rest = doc.equations.filter((e) => e.target !== dim.name);
    const equations = expression === null || !expression.trim() ? rest : [...rest, { id: newId('eq'), target: dim.name, expression: expression.trim() }];
    get().setEquations(equations);
  },
  applyDocument(label, d) {
    history.push(label, get().doc);
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  setDimensionValue(name, value) {
    const { doc } = get();
    history.push(`Change ${name}`, doc);
    const r = solveAll(setDimensionValues(doc, { [name]: value }), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  openDocument(doc) {
    history.clear();
    set({ prefs: { ...loadPrefs(), ...(doc.properties ?? {}) } });
    const r = solveAll(doc, {});
    set({ openSeq: get().openSeq + 1, hasDocument: true, doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, null), activeSketchId: null, featureEdit: null, mateEdit: null, insertingComponent: false, asmTool: 'select', selectedFeatureId: null, selectedFace: null, selectedFaces: [], selection: [], selectedConstraint: null, dirty: false, tab: isAssembly(r.doc) ? 'assembly' : isDrawing(r.doc) ? 'viewLayout' : 'features', drawingEdit: null, selectedDrawingViewId: null, rollbackIndex: null, ...historyFlags() });
    autosave(r.doc);
  },
  rebuildAll() {
    const { doc, rollbackIndex } = get();
    const r = solveAll(doc, {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, rollbackIndex) });
  },
  showDocument() {
    set({ hasDocument: true, dialog: null, openSeq: get().openSeq + 1 });
  },
  setLastCommand(c) {
    set({ lastCommand: c });
  },
  setUnits(units) {
    const { doc } = get();
    history.push('Units', doc);
    const d = { ...doc, units };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  renameDocument(name) {
    const d = { ...get().doc, name };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  newSketch(plane) {
    const { doc } = get();
    history.push('New sketch', doc);
    const n = doc.features.filter((f) => f.type === 'sketch').length + 1;
    const sketch = createSketch(newId('sk'), `Sketch${n}`, plane);
    const d: Document = {
      ...doc,
      sketches: { ...doc.sketches, [sketch.id]: sketch },
      features: [...doc.features, { id: newId('f'), type: 'sketch', name: sketch.name, sketchId: sketch.id, suppressed: false }],
    };
    const r = solveAll(d, get().solve, sketch.id);
    const tool = get().pendingTool ?? 'select';
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), activeSketchId: sketch.id, tab: 'sketch', tool, lastTool: tool !== 'select' ? tool : get().lastTool, selection: [], dirty: true, planePick: false, pendingTool: null, hoverPlane: null, selectedPlane: null, selectedFace: null, hoverFace: null, featureEdit: null, managerTab: 'tree', messages: [], ...historyFlags() });
    autosave(r.doc);
  },
  editSketch(id) {
    if (!get().doc.sketches[id]) return;
    set({ activeSketchId: id, tab: 'sketch', tool: 'select', selection: [], selectedConstraint: null, planePick: false, featureEdit: null, selectedFace: null, managerTab: 'tree' });
  },
  exitSketch() {
    // leaving a sketch rebuilds the features that use it
    const { doc, rollbackIndex } = get();
    set({ activeSketchId: null, tab: 'features', tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, managerTab: 'tree', rebuild: rebuildFor(doc, rollbackIndex) });
  },
  discardSketch() {
    // undo everything back to the moment the sketch was opened is not tracked; discard = delete if empty, else keep
    const { doc, activeSketchId } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    if (sk && sk.entityOrder.length === 0) {
      const f = doc.features.find((x) => x.type === 'sketch' && x.sketchId === activeSketchId);
      if (f) get().deleteFeature(f.id);
    }
    get().exitSketch();
  },
  repeatLastTool() {
    if (get().activeSketchId) get().setTool(get().lastTool);
  },
  createLibrary(name) {
    const lib: Library = { id: newId('lib'), name: name || 'Library', items: [] };
    const libraries = [...get().libraries, lib];
    set({ libraries });
    saveLibraries(libraries);
    return lib.id;
  },
  renameLibrary(id, name) {
    const libraries = get().libraries.map((l) => (l.id === id ? { ...l, name } : l));
    set({ libraries });
    saveLibraries(libraries);
  },
  deleteLibrary(id) {
    const libraries = get().libraries.filter((l) => l.id !== id);
    set({ libraries });
    saveLibraries(libraries);
  },
  addLibraryItem(libraryId, name) {
    const { activeSketchId, doc, selection } = get();
    if (!activeSketchId) {
      get().pushMessage('Open a sketch and select the entities to add to the library.', 'warn');
      return false;
    }
    const sk = doc.sketches[activeSketchId];
    const selIds = selection.filter((s) => s.kind === 'entity').map((s) => s.id);
    const ids = selIds.length ? selIds : sk.entityOrder;
    if (!ids.length) {
      get().pushMessage('The sketch is empty; nothing to add.', 'warn');
      return false;
    }
    const block = extractBlock(sk, ids);
    const item: LibraryItem = { id: newId('li'), name: name || `Block ${Date.now().toString(36)}`, block, created: new Date().toISOString() };
    const libraries = get().libraries.map((l) => (l.id === libraryId ? { ...l, items: [...l.items, item] } : l));
    set({ libraries });
    saveLibraries(libraries);
    get().pushMessage(`"${item.name}" added to the library (${ids.length} entities).`);
    return true;
  },
  deleteLibraryItem(libraryId, itemId) {
    const libraries = get().libraries.map((l) => (l.id === libraryId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l));
    set({ libraries });
    saveLibraries(libraries);
  },
  startPlacing(libraryId, itemId) {
    if (!get().activeSketchId) {
      get().pushMessage('Open a sketch first, then insert the library item.', 'warn');
      return;
    }
    set({ placing: { libraryId, itemId }, tool: 'select', selection: [] });
    get().pushMessage('Click in the graphics area to place the item (Esc cancels).');
  },
  placeItem(at) {
    const { placing, libraries } = get();
    if (!placing) return;
    const item = libraries.find((l) => l.id === placing.libraryId)?.items.find((i) => i.id === placing.itemId);
    if (!item) return;
    let inserted: Id[] = [];
    get().commit(`Insert ${item.name}`, (s) => {
      const [s1, ids] = insertBlock(s, item.block, at);
      inserted = ids;
      return s1;
    });
    set({ placing: null, selection: inserted.map((id) => ({ kind: 'entity' as const, id })) });
  },
  cancelPlacing() {
    set({ placing: null });
  },
  importLibrary(json) {
    try {
      const raw = JSON.parse(json) as { format?: string; library?: Library };
      if (raw.format !== 'phlippo-library' || !raw.library) throw new Error('Not a Phlippo library file');
      const lib: Library = { ...raw.library, id: newId('lib') };
      const libraries = [...get().libraries, lib];
      set({ libraries });
      saveLibraries(libraries);
      get().pushMessage(`Library "${lib.name}" imported (${lib.items.length} items).`);
    } catch (err) {
      get().pushMessage(`Cannot import library: ${(err as Error).message}`, 'error');
    }
  },
  exportLibrary(id) {
    const lib = get().libraries.find((l) => l.id === id);
    return lib ? JSON.stringify({ format: 'phlippo-library', version: 1, library: lib }, null, 2) : null;
  },
  mirrorSelection() {
    const { selection, activeSketchId, doc } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    const ents = selection.filter((s) => s.kind === 'entity').map((s) => sk.entities[s.id]).filter(Boolean);
    const axis = ents.find((e) => e.kind === 'line' && e.construction) ?? [...ents].reverse().find((e) => e.kind === 'line');
    if (!axis) {
      get().pushMessage('Select the entities to mirror and a (construction) line as the mirror axis.', 'warn');
      return;
    }
    const ids = ents.filter((e) => e.id !== axis.id).map((e) => e.id);
    if (!ids.length) return;
    get().commit('Mirror entities', (s) => mirrorEntities(s, ids, axis.id));
    set({ selection: [] });
  },
  deleteFeature(id, opts = {}) {
    const { doc, activeSketchId } = get();
    const f = doc.features.find((x) => x.id === id);
    if (!f) return;
    const withChildren = opts.children ?? true;
    history.push('Delete feature', doc);
    const sketches = { ...doc.sketches };
    const solve = { ...get().solve };
    const remove = new Set<Id>([id]);
    const deps = featureDependents(doc, id);
    if (withChildren) {
      for (const c of deps.children) remove.add(c.id);
      for (const c of geometricChildren(doc, remove, get().rebuild.errors, (d) => rebuildFor(d, null))) remove.add(c.id);
    }
    if (opts.absorbed) for (const a of deps.absorbed) remove.add(a.id);
    // a sketch that goes also takes its sketch data along
    for (const x of doc.features) if (remove.has(x.id) && x.type === 'sketch') { delete sketches[x.sketchId]; delete solve[x.sketchId]; }
    const d: Document = { ...doc, sketches, features: doc.features.filter((x) => !remove.has(x.id)) };
    const goneSketch = activeSketchId && !d.sketches[activeSketchId];
    set({ doc: d, solve, rebuild: rebuildFor(d, get().rollbackIndex), activeSketchId: goneSketch ? null : activeSketchId, tab: goneSketch ? 'features' : get().tab, selection: [], selectedFeatureId: null, featureEdit: null, confirmDelete: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  requestDeleteFeature(id) {
    const { doc } = get();
    if (!doc.features.some((x) => x.id === id)) {
      // an assembly component or mate: no children to list
      if ((doc.components ?? []).some((c) => c.id === id) || (doc.mates ?? []).some((m) => m.id === id) || (doc.refGeometry ?? []).some((r) => r.id === id)) set({ confirmDelete: { id, children: [], absorbed: [], checking: false } });
      return;
    }
    const deps = featureDependents(doc, id);
    set({ confirmDelete: { id, children: deps.children.map((c) => c.id), absorbed: deps.absorbed.map((a) => a.id), checking: true } });
    // the geometric children need a trial rebuild: done after the dialog has been drawn
    setTimeout(() => {
      const cd = get().confirmDelete;
      if (!cd || cd.id !== id) return;
      let extra: Id[] = [];
      try {
        extra = geometricChildren(get().doc, new Set([id, ...cd.children]), get().rebuild.errors, (d) => rebuildFor(d, null)).map((c) => c.id);
      } catch {
        /* the dialog still works with the reference children */
      }
      const now = get().confirmDelete;
      if (now && now.id === id) set({ confirmDelete: { ...now, children: [...now.children, ...extra], checking: false } });
    }, 30);
  },
  closeConfirmDelete() {
    set({ confirmDelete: null });
  },
  setAsk(ask) {
    set({ ask });
  },
  renameFeature(id, name) {
    const { doc } = get();
    const features = doc.features.map((f) => (f.id === id ? { ...f, name } : f)) as Document['features'];
    const sketches = { ...doc.sketches };
    const f = doc.features.find((x) => x.id === id);
    if (f && f.type === 'sketch') sketches[f.sketchId] = { ...sketches[f.sketchId], name };
    const d: Document = { ...doc, features, sketches };
    set({ doc: d, dirty: true });
    autosave(d);
  },
  commit(label, fn) {
    const { doc, activeSketchId } = get();
    if (!activeSketchId) return;
    const sketch = doc.sketches[activeSketchId];
    if (!sketch) return;
    let next = fn(sketch);
    if (next === sketch) return;
    // Options ▸ For construction of a drawing tool: what it draws becomes construction geometry
    if (get().sketchTool.forConstruction && DRAW_TOOLS.has(get().tool)) {
      const fresh = next.entityOrder.filter((id) => !sketch.entities[id] && next.entities[id] && next.entities[id].kind !== 'point');
      if (fresh.length) next = { ...next, entities: { ...next.entities, ...Object.fromEntries(fresh.map((id) => [id, { ...next.entities[id], construction: true }])) } };
    }
    history.push(label, doc);
    const d = { ...doc, sketches: { ...doc.sketches, [activeSketchId]: next } };
    const r = solveAll(d, get().solve, activeSketchId);
    const res = r.solve[activeSketchId];
    set({ doc: r.doc, solve: r.solve, dirty: true, ...historyFlags() });
    if (res.status === 'conflict') get().pushMessage('The sketch is over defined: conflicting relations are shown in red.', 'error');
    else if (res.status === 'over') get().pushMessage('The sketch is over defined: redundant relations are shown in red.', 'warn');
    autosave(r.doc);
  },
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
  undo() {
    const { doc } = get();
    const e = history.undo(doc);
    if (!e) return;
    const r = solveAll(e.state, {});
    const activeSketchId = get().activeSketchId && r.doc.sketches[get().activeSketchId!] ? get().activeSketchId : null;
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), activeSketchId, selection: [], selectedConstraint: null, dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  redo() {
    const { doc } = get();
    const e = history.redo(doc);
    if (!e) return;
    const r = solveAll(e.state, {});
    const activeSketchId = get().activeSketchId && r.doc.sketches[get().activeSketchId!] ? get().activeSketchId : null;
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), activeSketchId, selection: [], selectedConstraint: null, dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  setTool(tool) {
    if (!get().activeSketchId) {
      // like the original: picking a sketch tool first asks for a plane
      if (tool !== 'select') {
        set({ pendingTool: tool });
        get().startPlanePick();
      }
      return;
    }
    set({ tool, selectedConstraint: null, modify: null });
    if (tool !== 'select') set({ selection: [], lastTool: tool });
  },
  setTab(tab) {
    set({ tab });
  },
  setSelection(selection) {
    set({ selection, selectedConstraint: null });
  },
  toggleSelect(item, additive) {
    const { selection } = get();
    const exists = selection.some((s) => s.kind === item.kind && s.id === item.id);
    if (additive) set({ selection: exists ? selection.filter((s) => !(s.kind === item.kind && s.id === item.id)) : [...selection, item], selectedConstraint: null });
    else set({ selection: exists && selection.length === 1 ? [] : [item], selectedConstraint: null });
  },
  selectConstraint(id) {
    set({ selectedConstraint: id, selection: [] });
  },
  setHover(hover) {
    const cur = get().hover;
    if (cur?.id === hover?.id && cur?.kind === hover?.kind) return;
    set({ hover });
  },
  deleteSelection() {
    const { selection, selectedConstraint } = get();
    if (selectedConstraint) {
      get().removeRelation(selectedConstraint);
      return;
    }
    const { activeSketchId, doc } = get();
    if (!activeSketchId && get().selectedFeatureId) {
      get().requestDeleteFeature(get().selectedFeatureId!);
      return;
    }
    const sk = activeSketchId ? doc.sketches[activeSketchId] : null;
    const ids = new Set(selection.filter((s) => s.kind === 'entity').map((s) => s.id));
    // a selected point deletes the entity that owns it (as in the original)
    if (sk) for (const s of selection) if (s.kind === 'point' && s.id !== sk.origin) { const o = ownerOfPoint(sk, s.id); if (o) ids.add(o.id); }
    if (!ids.size) return;
    get().commit('Delete', (s) => {
      let out = s;
      for (const id of ids) out = removeEntity(out, id);
      return out;
    });
    set({ selection: [] });
  },
  addRelation(kind, refs, extra = {}) {
    get().commit(`Add relation: ${kind}`, (s) => addConstraint(s, kind, refs, extra)[0]);
  },
  updateDimension(id, patch) {
    get().commit('Modify dimension', (s) => updateConstraint(s, id, patch));
  },
  renameDimension(id, name) {
    const sk = get().activeSketchId ? get().doc.sketches[get().activeSketchId!] : undefined;
    const clean = name.replace(/@.*$/, '').trim();
    if (!sk || !clean || /["@]/.test(clean)) return;
    const old = sketchDimensionName(sk, id);
    get().commit('Rename dimension', (s) => updateConstraint(s, id, { name: clean }));
    const nk = get().doc.sketches[sk.id];
    const fresh = sketchDimensionName(nk, id);
    if (fresh === old || !get().doc.equations.length) return;
    const swap = (t: string) => t.split(`"${old}"`).join(`"${fresh}"`);
    set({ doc: { ...get().doc, equations: get().doc.equations.map((e) => ({ ...e, target: e.target === old ? fresh : e.target, expression: swap(e.expression) })) } });
  },
  removeRelation(id) {
    get().commit('Delete relation', (s) => removeConstraint(s, id));
    set({ selectedConstraint: null });
  },
  toggleConstructionSelection() {
    const ids = get().selection.filter((s) => s.kind === 'entity').map((s) => s.id);
    if (!ids.length) return;
    get().commit('Construction geometry', (s) => toggleConstruction(s, ids));
  },
  setTheme(theme) {
    set({ theme });
    try {
      localStorage.setItem('phlippo.theme', theme);
    } catch {
      /* ignore */
    }
  },
  setPanel(id, patch) {
    set({ panels: { ...get().panels, [id]: { ...get().panels[id], ...patch } } });
  },
  setDockWidth(side, w) {
    set({ dockWidth: { ...get().dockWidth, [side]: Math.max(200, Math.min(600, w)) } });
  },
  pushMessage(text, level = 'info') {
    const id = ++msgSeq;
    set({ messages: [...get().messages.slice(-4), { id, text, level }] });
    setTimeout(() => set({ messages: get().messages.filter((m) => m.id !== id) }), 6000);
  },
  setCursor(cursor) {
    set({ cursor });
  },
  setRollback(rollbackIndex) {
    if (get().rollbackIndex === rollbackIndex) return;
    set({ rollbackIndex, rebuild: rebuildFor(get().doc, rollbackIndex) });
  },
  toggle(key) {
    set({ [key]: !get()[key] } as Partial<State>);
  },
  setManagerTab(managerTab) {
    set({ managerTab });
  },
  setManagerCollapsed(managerCollapsed) {
    set({ managerCollapsed });
  },
  setTreeFilter(treeFilter) {
    set({ treeFilter });
  },
  startPlanePick() {
    // a plane or face selected beforehand opens the sketch at once (original workflow)
    const pre = get().selectedPlane;
    if (pre) {
      get().newSketch(pre);
      return;
    }
    const face = get().selectedFace;
    if (face) {
      get().sketchOnFace(face);
      return;
    }
    set({ planePick: true, tab: 'sketch', featureEdit: null });
  },
  cancelPlanePick() {
    set({ planePick: false, hoverPlane: null, pendingTool: null });
  },
  setHoverPlane(hoverPlane) {
    if (get().hoverPlane !== hoverPlane) set({ hoverPlane });
  },
  setSelectedPlane(selectedPlane) {
    const re = get().refEdit;
    if (re && selectedPlane) {
      const planes = re.planes.includes(selectedPlane) ? re.planes.filter((p) => p !== selectedPlane) : [...re.planes, selectedPlane].slice(-2);
      set({ refEdit: { ...re, planes }, selectedPlane });
      return;
    }
    const fe = get().featureEdit;
    // Up To Surface / Offset From Surface also accept a reference plane as the end surface
    if (fe && fe.draft.type === 'extrude' && (fe.draft.end === 'upToSurface' || fe.draft.end === 'offsetFromSurface') && selectedPlane) {
      const pl = resolvePlaneDef(get().doc, selectedPlane);
      set({ featureEdit: { ...fe, draft: { ...fe.draft, surface: { normal: pl.n, point: pl.origin, label: pl.name } } }, selectedPlane });
      return;
    }
    if (get().selectedPlane !== selectedPlane) set({ selectedPlane });
  },
  setDisplayStyle(displayStyle) {
    set({ displayStyle });
  },
  toggleShow(key) {
    const show = { ...get().show, [key]: !get().show[key] };
    set({ show, showGrid: show.grid, showRelations: show.relations });
  },
  setReverseWheel(reverseWheel) {
    set({ reverseWheel });
    try {
      localStorage.setItem('phlippo.reverseWheel', String(reverseWheel));
    } catch {
      /* ignore */
    }
  },
  setUnitSystem(unitSystem) {
    const units: Units = unitSystem === 'IPS' ? 'in' : unitSystem === 'CGS' ? 'cm' : unitSystem === 'MKS' ? 'm' : 'mm';
    set({ unitSystem });
    get().setUnits(units);
  },
  setViewName(viewName) {
    if (get().viewName !== viewName) set({ viewName });
  },
  setTaskPane(taskPane) {
    set({ taskPane: get().taskPane === taskPane ? null : taskPane });
  },
  setPrefs(prefs) {
    const { doc } = get();
    const system: Record<string, PrefValue> = {}, docProps: Record<string, PrefValue> = {};
    for (const [k, v] of Object.entries(prefs)) (k.startsWith('doc.') ? docProps : system)[k] = v;
    savePrefs({ ...system, ...docProps });
    const d: Document = { ...doc, properties: docProps };
    // options that drive existing settings
    const theme = prefs['colors.background'] === 'Dark' ? 'dark' : 'light';
    if (theme !== get().theme) get().setTheme(theme);
    applyColorScheme(prefs);
    if (!!prefs['view.reverseWheel'] !== get().reverseWheel) get().setReverseWheel(!!prefs['view.reverseWheel']);
    const unitSys = String(prefs['doc.unitSystem']).split(' ')[0] as UnitSystem;
    if (['MKS', 'CGS', 'MMGS', 'IPS'].includes(unitSys) && unitSys !== get().unitSystem) get().setUnitSystem(unitSys);
    set({ prefs, doc: d, gridSize: Math.max(0.1, Number(prefs['doc.gridMajor']) || 10), show: { ...get().show, grid: !!prefs['doc.displayGrid'] }, dirty: get().dirty || JSON.stringify(docProps) !== JSON.stringify(doc.properties ?? {}) });
    autosave(d);
  },
  setDialog(dialog) {
    set(dialog === 'material' || dialog === 'appearance' ? { dialog } : { dialog, materialTarget: null });
  },
  setConfirmAtCursor(confirmAtCursor) {
    set({ confirmAtCursor });
  },
  setModify(modify) {
    set({ modify });
  },
  setFeedback(feedback) {
    if (get().feedback !== feedback) set({ feedback });
  },
}));

/** A command or selection is active: the PropertyManager replaces the design tree. */
export const isCommandActive = (s: Pick<State, 'activeSketchId' | 'selection' | 'selectedConstraint' | 'tool' | 'planePick' | 'featureEdit' | 'mateEdit' | 'insertingComponent' | 'drawingEdit' | 'planeEdit' | 'configEdit' | 'sheetMetalEdit' | 'sectionEdit' | 'explodeEdit' | 'patternEdit' | 'sketch3dEdit' | 'analysis' | 'sensorEdit'> & Partial<Pick<State, 'motorEdit' | 'motionEdit' | 'fastenerEdit' | 'sceneEdit' | 'refEdit' | 'offsetSurfEdit' | 'decalEdit'>>): boolean =>
  !!s.refEdit || !!s.offsetSurfEdit || !!s.decalEdit || !!s.motorEdit || !!s.motionEdit || !!s.fastenerEdit || !!s.sceneEdit || s.planePick || !!s.featureEdit || !!s.mateEdit || s.insertingComponent || !!s.drawingEdit || !!s.planeEdit || !!s.configEdit || s.sheetMetalEdit || !!s.sectionEdit || !!s.explodeEdit || !!s.patternEdit || !!s.sketch3dEdit || (!!s.analysis && s.analysis.kind !== 'curvature') || !!s.sensorEdit || (!!s.activeSketchId && (s.selection.length > 0 || !!s.selectedConstraint || s.tool !== 'select'));

/** Definition status as the original reports it: an empty sketch counts as under defined. */
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
    const d = st.hasDocument && st.dirty;
    if (d !== lastDirty) {
      lastDirty = d;
      (window as unknown as { phlippoDesktop?: { setDirty?: (v: boolean) => void } }).phlippoDesktop?.setDirty?.(d);
    }
  });
}
