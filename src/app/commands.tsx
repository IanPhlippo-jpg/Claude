import { bridge, fitActive } from './viewport/bridge';
import type { ReactNode } from 'react';
import { useStore } from './store';
import { registerTipDescriptions } from '../ui/richTips';
import { Icon } from '../ui/icons';
import type { CadCamera } from './viewport/camera';

type St = ReturnType<typeof useStore.getState>;

/** A command of the Customize dialog's Commands catalog: what the toolbars, shortcut bars, keyboard and mouse gestures bind to. */
export interface Command {
  id: string;
  label: string;
  category: string;
  icon: ReactNode;
  description: string;
  /** a sketch tool: only while sketching (the sketch mouse gestures) */
  sketch?: boolean;
  run: (st: St, cam: CadCamera | null) => void;
}

const zoomFit = () => fitActive();

/** The command catalog, grouped as the intended Customize ▸ Commands categories. */
export const COMMANDS: Command[] = [
  // Standard
  { id: 'file.new', label: 'New', category: 'Standard', icon: <Icon.New />, description: 'Creates a new document.', run: (st) => st.setDialog('new') },
  { id: 'file.open', label: 'Open', category: 'Standard', icon: <Icon.Open />, description: 'Opens an existing document.', run: () => (document.getElementById('phlippo-open-file') as HTMLInputElement | null)?.click() },
  { id: 'file.save', label: 'Save', category: 'Standard', icon: <Icon.Save />, description: 'Saves the active document.', run: () => bridge.save?.() },
  { id: 'file.print', label: 'Print', category: 'Standard', icon: <Icon.Print />, description: 'Prints the active document.', run: () => window.print() },
  { id: 'edit.undo', label: 'Undo', category: 'Standard', icon: <Icon.Undo />, description: 'Reverses the last action.', run: (st) => st.undo() },
  { id: 'edit.redo', label: 'Redo', category: 'Standard', icon: <Icon.Redo />, description: 'Redoes the last undone action.', run: (st) => st.redo() },
  { id: 'std.select', label: 'Select', category: 'Standard', icon: <Icon.Select />, description: 'Selects entities.', run: (st) => st.setTool('select') },
  { id: 'std.rebuild', label: 'Rebuild', category: 'Standard', icon: <Icon.Rebuild />, description: 'Rebuilds the part, assembly or drawing.', run: (st) => st.rebuildAll() },
  { id: 'std.options', label: 'Options', category: 'Standard', icon: <Icon.Options />, description: 'Changes the system and document options.', run: (st) => st.setDialog('options') },
  { id: 'file.recent', label: 'Recent Documents', category: 'Standard', icon: <Icon.Home />, description: 'Shows the recent documents (Welcome dialog).', run: (st) => st.setDialog('welcome') },
  { id: 'std.shortcutBar', label: 'Shortcut Bar', category: 'Standard', icon: <Icon.Keyboard />, description: 'Shows the shortcut bar at the pointer.', run: () => bridge.shortcutBar?.() },
  { id: 'help.shortcuts', label: 'Keyboard Shortcuts', category: 'Standard', icon: <Icon.Help />, description: 'Lists the keyboard shortcuts.', run: (st) => st.setPanel('shortcuts', { visible: !st.panels.shortcuts.visible }) },
  // View
  { id: 'view.front', label: 'Front', category: 'View', icon: <Icon.Orientation />, description: 'Front view.', run: (_s, cam) => cam?.setView('front') },
  { id: 'view.back', label: 'Back', category: 'View', icon: <Icon.Orientation />, description: 'Back view.', run: (_s, cam) => cam?.setView('back') },
  { id: 'view.left', label: 'Left', category: 'View', icon: <Icon.Orientation />, description: 'Left view.', run: (_s, cam) => cam?.setView('left') },
  { id: 'view.right', label: 'Right', category: 'View', icon: <Icon.Orientation />, description: 'Right view.', run: (_s, cam) => cam?.setView('right') },
  { id: 'view.top', label: 'Top', category: 'View', icon: <Icon.Orientation />, description: 'Top view.', run: (_s, cam) => cam?.setView('top') },
  { id: 'view.bottom', label: 'Bottom', category: 'View', icon: <Icon.Orientation />, description: 'Bottom view.', run: (_s, cam) => cam?.setView('bottom') },
  { id: 'view.isometric', label: 'Isometric', category: 'View', icon: <Icon.Orientation />, description: 'Isometric view.', run: (_s, cam) => cam?.setView('isometric') },
  { id: 'view.trimetric', label: 'Trimetric', category: 'View', icon: <Icon.Orientation />, description: 'Trimetric view.', run: (_s, cam) => cam?.setView('trimetric') },
  { id: 'view.dimetric', label: 'Dimetric', category: 'View', icon: <Icon.Orientation />, description: 'Dimetric view.', run: (_s, cam) => cam?.setView('dimetric') },
  { id: 'view.normalTo', label: 'Normal To', category: 'View', icon: <Icon.Orientation />, description: 'Looks normal to the selected plane or the sketch plane.', run: (st, cam) => { const sk = st.activeSketchId ? st.doc.sketches[st.activeSketchId] : null; cam?.normalTo((sk?.plane ?? st.selectedPlane ?? 'front') as never); } },
  { id: 'view.zoomFit', label: 'Zoom to Fit', category: 'View', icon: <Icon.Fit />, description: 'Zooms the model to fit the window.', run: () => zoomFit() },
  { id: 'view.zoomIn', label: 'Zoom In', category: 'View', icon: <Icon.ZoomArea />, description: 'Zooms in.', run: (_s, cam) => cam?.zoomStep(1.25) },
  { id: 'view.zoomOut', label: 'Zoom Out', category: 'View', icon: <Icon.ZoomArea />, description: 'Zooms out.', run: (_s, cam) => cam?.zoomStep(1 / 1.25) },
  { id: 'view.previous', label: 'Previous View', category: 'View', icon: <Icon.Previous />, description: 'Returns to the previous view.', run: (_s, cam) => cam?.previousView() },
  { id: 'view.orientation', label: 'View Orientation', category: 'View', icon: <Icon.Orientation />, description: 'Opens the View Orientation dialog.', run: (st) => st.setDialog(st.dialog === 'orientation' ? null : 'orientation') },
  { id: 'view.selector', label: 'View Selector', category: 'View', icon: <Icon.ViewCube />, description: 'Shows the view selector cube.', run: (st) => st.toggleShow('viewSelector') },
  { id: 'view.section', label: 'Section View', category: 'View', icon: <Icon.Section />, description: 'Displays a cut of the model.', run: (st) => st.startSectionView() },
  // Sketch
  { id: 'sketch.sketch', label: 'Sketch', category: 'Sketch', icon: <Icon.Sketch />, description: 'Creates a new sketch, or edits an existing sketch.', run: (st) => st.startPlanePick() },
  { id: 'sketch.exit', label: 'Exit Sketch', category: 'Sketch', icon: <Icon.ExitSketch />, description: 'Exits the sketch and keeps the changes.', sketch: true, run: (st) => st.exitSketch() },
  { id: 'sketch.dimension', label: 'Smart Dimension', category: 'Sketch', icon: <Icon.SmartDimension />, description: 'Creates a dimension for one or more selected entities.', sketch: true, run: (st) => st.setTool('dimension') },
  { id: 'sketch.line', label: 'Line', category: 'Sketch', icon: <Icon.Line />, description: 'Sketches a line.', sketch: true, run: (st) => st.setTool('line') },
  { id: 'sketch.centerline', label: 'Centerline', category: 'Sketch', icon: <Icon.Line />, description: 'Sketches a centerline.', sketch: true, run: (st) => st.setTool('centerline') },
  { id: 'sketch.rectangle', label: 'Corner Rectangle', category: 'Sketch', icon: <Icon.Rect />, description: 'Sketches a rectangle.', sketch: true, run: (st) => st.setTool('rectangle') },
  { id: 'sketch.centerRectangle', label: 'Center Rectangle', category: 'Sketch', icon: <Icon.CenterRect />, description: 'Sketches a rectangle from its center.', sketch: true, run: (st) => st.setTool('centerRectangle') },
  { id: 'sketch.circle', label: 'Circle', category: 'Sketch', icon: <Icon.Circle />, description: 'Sketches a circle.', sketch: true, run: (st) => st.setTool('circle') },
  { id: 'sketch.perimeterCircle', label: 'Perimeter Circle', category: 'Sketch', icon: <Icon.PerimeterCircle />, description: 'Sketches a circle through three points.', sketch: true, run: (st) => st.setTool('perimeterCircle') },
  { id: 'sketch.arcCenter', label: 'Centerpoint Arc', category: 'Sketch', icon: <Icon.ArcCenter />, description: 'Sketches a centerpoint arc.', sketch: true, run: (st) => st.setTool('arcCenter') },
  { id: 'sketch.tangentArc', label: 'Tangent Arc', category: 'Sketch', icon: <Icon.TangentArc />, description: 'Sketches a tangent arc.', sketch: true, run: (st) => st.setTool('tangentArc') },
  { id: 'sketch.arc3', label: '3 Point Arc', category: 'Sketch', icon: <Icon.Arc3Point />, description: 'Sketches a three point arc.', sketch: true, run: (st) => st.setTool('arc3') },
  { id: 'sketch.polygon', label: 'Polygon', category: 'Sketch', icon: <Icon.Polygon />, description: 'Sketches a polygon.', sketch: true, run: (st) => st.setTool('polygon') },
  { id: 'sketch.slot', label: 'Straight Slot', category: 'Sketch', icon: <Icon.Slot />, description: 'Sketches a straight slot.', sketch: true, run: (st) => st.setTool('slot') },
  { id: 'sketch.spline', label: 'Spline', category: 'Sketch', icon: <Icon.Spline />, description: 'Sketches a spline.', sketch: true, run: (st) => st.setTool('spline') },
  { id: 'sketch.ellipse', label: 'Ellipse', category: 'Sketch', icon: <Icon.Ellipse />, description: 'Sketches an ellipse.', sketch: true, run: (st) => st.setTool('ellipse') },
  { id: 'sketch.point', label: 'Point', category: 'Sketch', icon: <Icon.Point />, description: 'Sketches a point.', sketch: true, run: (st) => st.setTool('point') },
  { id: 'sketch.trim', label: 'Trim Entities', category: 'Sketch', icon: <Icon.TrimEntities />, description: 'Trims or extends a sketch entity.', sketch: true, run: (st) => st.setTool('trim') },
  { id: 'sketch.offset', label: 'Offset Entities', category: 'Sketch', icon: <Icon.OffsetEntities />, description: 'Offsets faces, edges, curves or sketch entities.', sketch: true, run: (st) => st.setTool('offset') },
  { id: 'sketch.fillet', label: 'Sketch Fillet', category: 'Sketch', icon: <Icon.SketchFillet />, description: 'Rounds the corner of two sketch entities.', sketch: true, run: (st) => st.setTool('sketchFillet') },
  { id: 'sketch.mirror', label: 'Mirror Entities', category: 'Sketch', icon: <Icon.MirrorEntities />, description: 'Mirrors selected entities about a centerline.', sketch: true, run: (st) => st.mirrorSelection() },
  { id: 'sketch.linearPattern', label: 'Linear Sketch Pattern', category: 'Sketch', icon: <Icon.SketchPattern />, description: 'Adds a linear pattern of sketch entities.', sketch: true, run: (st) => st.setTool('linearSketchPattern') },
  { id: 'sketch.relations', label: 'Display/Delete Relations', category: 'Sketch', icon: <Icon.DisplayRelations />, description: 'Displays and deletes geometric relations.', sketch: true, run: (st) => st.setTaskPane('relations') },
  // Features
  { id: 'feat.extrude', label: 'Extruded Boss/Base', category: 'Features', icon: <Icon.Extrude />, description: 'Extrudes a sketch to create a solid feature.', run: (st) => st.startFeature('extrude', 'boss') },
  { id: 'feat.revolve', label: 'Revolved Boss/Base', category: 'Features', icon: <Icon.Revolve />, description: 'Revolves a sketch around an axis.', run: (st) => st.startFeature('revolve', 'boss') },
  { id: 'feat.sweep', label: 'Swept Boss/Base', category: 'Features', icon: <Icon.Sweep />, description: 'Sweeps a profile along a path.', run: (st) => st.startFeature('sweep', 'boss') },
  { id: 'feat.loft', label: 'Lofted Boss/Base', category: 'Features', icon: <Icon.Loft />, description: 'Lofts between profiles.', run: (st) => st.startFeature('loft', 'boss') },
  { id: 'feat.extrudeCut', label: 'Extruded Cut', category: 'Features', icon: <Icon.Cut />, description: 'Cuts a solid model by extruding a sketched profile.', run: (st) => st.startFeature('extrude', 'cut') },
  { id: 'feat.revolveCut', label: 'Revolved Cut', category: 'Features', icon: <Icon.RevolveCut />, description: 'Cuts a solid model by revolving a sketched profile.', run: (st) => st.startFeature('revolve', 'cut') },
  { id: 'feat.hole', label: 'Hole Tool', category: 'Features', icon: <Icon.Hole />, description: 'Inserts a hole using a pre-defined cross-section.', run: (st) => st.startHole() },
  { id: 'feat.fillet', label: 'Fillet', category: 'Features', icon: <Icon.Fillet />, description: 'Creates a rounded face along edges.', run: (st) => st.startRound('fillet') },
  { id: 'feat.chamfer', label: 'Chamfer', category: 'Features', icon: <Icon.Chamfer />, description: 'Creates a bevel along edges or at a vertex.', run: (st) => st.startRound('chamfer') },
  { id: 'feat.linearPattern', label: 'Linear Pattern', category: 'Features', icon: <Icon.Pattern />, description: 'Patterns features in one or two directions.', run: (st) => st.startPattern('linearPattern') },
  { id: 'feat.circularPattern', label: 'Circular Pattern', category: 'Features', icon: <Icon.CircularPattern />, description: 'Patterns features around an axis.', run: (st) => st.startPattern('circularPattern') },
  { id: 'feat.mirror', label: 'Mirror', category: 'Features', icon: <Icon.Mirror />, description: 'Mirrors features, faces and bodies.', run: (st) => st.startMirror() },
  { id: 'feat.shell', label: 'Shell', category: 'Features', icon: <Icon.Shell />, description: 'Removes material to create a thin-walled feature.', run: (st) => st.startShell() },
  { id: 'feat.rib', label: 'Rib', category: 'Features', icon: <Icon.Rib />, description: 'Adds a thin-walled support.', run: (st) => st.startRib() },
  { id: 'feat.draft', label: 'Draft', category: 'Features', icon: <Icon.Draft />, description: 'Tapers faces by an angle.', run: (st) => st.startDraft() },
  { id: 'feat.wrap', label: 'Wrap', category: 'Features', icon: <Icon.Wrap />, description: 'Wraps a sketch onto a face.', run: (st) => st.startWrap() },
  { id: 'feat.plane', label: 'Reference Plane', category: 'Features', icon: <Icon.Plane />, description: 'Creates a reference plane.', run: (st) => st.startPlane() },
  // Evaluate
  { id: 'eval.measure', label: 'Measure', category: 'Evaluate', icon: <Icon.Measure />, description: 'Measures distances, angles and sizes.', run: (st) => st.setDialog('measure') },
  { id: 'eval.mass', label: 'Mass Properties', category: 'Evaluate', icon: <Icon.Mass />, description: 'Evaluates the mass properties of the model.', run: (st) => st.setDialog('mass') },
  { id: 'eval.check', label: 'Check', category: 'Evaluate', icon: <Icon.Check />, description: 'Checks the model for geometry errors.', run: (st) => st.setDialog('check') },
  { id: 'eval.interference', label: 'Interference Detection', category: 'Evaluate', icon: <Icon.Interference />, description: 'Detects interferences between components.', run: (st) => st.setDialog('interference') },
  // Sheet Metal
  { id: 'sm.baseFlange', label: 'Base Flange/Tab', category: 'Sheet Metal', icon: <Icon.Sheet />, description: 'Creates a sheet metal part from a sketch.', run: (st) => st.startBaseFlange() },
  { id: 'sm.edgeFlange', label: 'Edge Flange', category: 'Sheet Metal', icon: <Icon.Chamfer />, description: 'Adds a flange on an edge.', run: (st) => st.startEdgeFlange() },
  { id: 'sm.hem', label: 'Hem', category: 'Sheet Metal', icon: <Icon.Arc />, description: 'Folds an edge back over the sheet.', run: (st) => st.startHem() },
  { id: 'sm.flatten', label: 'Flatten', category: 'Sheet Metal', icon: <Icon.Sheet />, description: 'Shows the flat pattern.', run: (st) => st.toggleFlatten() },
];

// the descriptions of the catalogue explain the ribbon buttons too (rich tooltips), by design
registerTipDescriptions(COMMANDS.map((c) => [c.label, c.description]));

export const CATEGORIES = Array.from(new Set(COMMANDS.map((c) => c.category)));
export const commandById = (id: string) => COMMANDS.find((c) => c.id === id);

/** the default single-key shortcuts (Customize ▸ Keyboard), command id -> key */
export const DEFAULT_KEYS: Record<string, string> = {
  'sketch.line': 'l',
  'file.recent': 'r',
  'view.zoomIn': 'z',
  'view.zoomOut': 'shift+z',
  'view.zoomFit': 'f',
  'std.shortcutBar': 's',
  'view.orientation': 'space',
  'help.shortcuts': '?',
  'file.new': 'ctrl+n',
  'file.open': 'ctrl+o',
  'file.save': 'ctrl+s',
  'file.print': 'ctrl+p',
  'edit.undo': 'ctrl+z',
  'edit.redo': 'ctrl+y',
  'std.rebuild': 'ctrl+b',
  'view.front': 'ctrl+1',
  'view.back': 'ctrl+2',
  'view.left': 'ctrl+3',
  'view.right': 'ctrl+4',
  'view.top': 'ctrl+5',
  'view.bottom': 'ctrl+6',
  'view.isometric': 'ctrl+7',
  'view.normalTo': 'ctrl+8',
  'view.previous': 'ctrl+shift+z',
  'view.selector': 'ctrl+space',
  'sketch.sketch': 'ctrl+shift+s',
};

/** the default mouse gestures (4 directions) for the part and sketch contexts */
export const DEFAULT_GESTURES: { part: Record<'up' | 'down' | 'left' | 'right', string>; sketch: Record<'up' | 'down' | 'left' | 'right', string> } = {
  part: { up: 'view.top', down: 'view.front', left: 'view.left', right: 'view.right' },
  sketch: { up: 'sketch.circle', down: 'sketch.rectangle', left: 'sketch.line', right: 'sketch.dimension' },
};

/** the key combination of a keyboard event in the Customize ▸ Keyboard notation (ctrl+shift+x, space, ?) */
export function keyCombo(e: KeyboardEvent | React.KeyboardEvent): string {
  const k = e.key === ' ' ? 'space' : e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  if (['control', 'shift', 'alt', 'meta'].includes(k)) return '';
  return `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.shiftKey && !(e.key.length === 1 && /[^a-z0-9 ]/i.test(e.key)) ? 'shift+' : ''}${k}`;
}

/** the key bindings in effect: the defaults overridden by the Customize ▸ Keyboard preference (JSON command id -> key) */
export function keyBindings(pref: unknown): Record<string, string> {
  let custom: Record<string, string> = {};
  try {
    if (typeof pref === 'string' && pref) custom = JSON.parse(pref) as Record<string, string>;
  } catch {
    custom = {};
  }
  return { ...DEFAULT_KEYS, ...custom };
}

/** the mouse gestures in effect: the defaults overridden by the Customize ▸ Mouse Gestures preference */
export function gestureBindings(pref: unknown): typeof DEFAULT_GESTURES {
  try {
    if (typeof pref === 'string' && pref) {
      const g = JSON.parse(pref) as Partial<typeof DEFAULT_GESTURES>;
      return { part: { ...DEFAULT_GESTURES.part, ...(g.part ?? {}) }, sketch: { ...DEFAULT_GESTURES.sketch, ...(g.sketch ?? {}) } };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_GESTURES;
}

/** a printable key name (Ctrl+Shift+Z, Space, ?) */
export const keyLabel = (combo: string) => combo.split('+').map((p) => (p === 'space' ? 'Space' : p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1))).join('+');
