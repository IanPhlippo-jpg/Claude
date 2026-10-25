import { fitActive } from './viewport/bridge';
import { useState, type ReactNode } from 'react';
import { useStore } from './store';
import { Icon } from '../ui/icons';
import { Menu, type MenuItem } from '../ui/components';
import { getPref } from './prefs';

/** the commands of the three shortcut bars, as Customize ▸ Shortcut Bars lists them */
export const SHORTCUT_BAR_COMMANDS: Record<'sketch' | 'part' | 'assembly', string[]> = {
  sketch: ['Select', 'Smart Dimension', 'Exit Sketch', 'Extruded Boss/Base', 'Line', 'Line', 'Centerline', 'Corner Rectangle', 'Corner Rectangle', 'Center Rectangle', 'Circle', 'Centerpoint Arc', 'Centerpoint Arc', '3 Point Arc', 'Polygon', 'Straight Slot', 'Trim Entities', 'Offset Entities', 'Sketch Fillet', 'Spline', 'Point', 'Linear Sketch Pattern', 'Mirror Entities', 'Construction Geometry', 'Display/Delete Relations', 'Circular Sketch Pattern'],
  part: ['Select', 'Sketch', 'Extruded Boss/Base', 'Revolved Boss/Base', 'Extruded Cut', 'Hole Wizard', 'Revolved Cut', 'Fillet', 'Chamfer', 'Linear Pattern', 'Mirror', 'Shell', 'Rib', 'Measure', 'Mass Properties', 'Zoom to Fit', 'Options'],
  assembly: ['Select', 'Insert Components', 'Mate', 'Move Component', 'Rotate Component', 'Interference Detection', 'Bill of Materials', 'Measure'],
};

interface Cmd {
  label: string;
  icon: ReactNode;
  description?: string;
  onSelect?: () => void;
  flyout?: MenuItem[];
  disabled?: boolean;
}

/**
 * The S-key shortcut bar as the original: a compact floating palette of icons (with carets for
 * fly-outs) that depends on the context — sketch tools while sketching, feature tools in a part,
 * assembly tools in an assembly — and a tooltip with the command's description.
 */
export function ShortcutBar({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const [open, setOpen] = useState<number | null>(null);
  const [tip, setTip] = useState<Cmd | null>(null);
  const inSketch = !!st.activeSketchId;
  const close = () => { setOpen(null); onClose(); };
  const t = (fn: () => void) => () => { fn(); close(); };
  const sketchCmds: Cmd[] = [
    { label: 'Select', icon: <Icon.Select />, description: 'Selects sketch entities, edges, vertices, faces and so on.', onSelect: t(() => st.setTool('select')) },
    { label: 'Smart Dimension', icon: <Icon.Dimension />, description: 'Creates a dimension for one or more selected entities.', onSelect: t(() => st.setTool('dimension')) },
    { label: 'Exit Sketch', icon: <Icon.Sketch />, description: 'Exits the sketch and keeps the changes.', onSelect: t(() => st.exitSketch()) },
    { label: 'Extruded Boss/Base', icon: <Icon.Extrude />, description: 'Extrudes a sketch or selected sketch contours in one or two directions to create a solid feature. Use the Extrude Property Panel to control where the extrude starts from, and the Property Panel or the Instant 3D drag handle to define its direction and extent.', onSelect: t(() => { st.exitSketch(); st.startFeature('extrude', 'boss'); }) },
    { label: 'Line', icon: <Icon.Line />, description: 'Sketches a line.', onSelect: t(() => st.setTool('line')), flyout: [{ label: 'Line', icon: <Icon.Line />, onSelect: t(() => st.setTool('line')) }, { label: 'Centerline', icon: <Icon.Construction />, onSelect: t(() => st.setTool('centerline')) }] },
    { label: 'Corner Rectangle', icon: <Icon.Rect />, description: 'Sketches a rectangle.', onSelect: t(() => st.setTool('rectangle')), flyout: [{ label: 'Corner Rectangle', icon: <Icon.Rect />, onSelect: t(() => st.setTool('rectangle')) }, { label: 'Center Rectangle', icon: <Icon.Rect />, onSelect: t(() => st.setTool('centerRectangle')) }] },
    { label: 'Circle', icon: <Icon.Circle />, description: 'Sketches a circle. Select the center of the circle, then drag to set its radius.', onSelect: t(() => st.setTool('circle')) },
    { label: 'Centerpoint Arc', icon: <Icon.Arc />, description: 'Sketches a centerpoint arc.', onSelect: t(() => st.setTool('arcCenter')), flyout: [{ label: 'Centerpoint Arc', icon: <Icon.Arc />, onSelect: t(() => st.setTool('arcCenter')) }, { label: '3 Point Arc', icon: <Icon.Arc />, onSelect: t(() => st.setTool('arc3')) }] },
    { label: 'Polygon', icon: <Icon.Polygon />, description: 'Sketches a polygon.', onSelect: t(() => st.setTool('polygon')) },
    { label: 'Straight Slot', icon: <Icon.Slot />, description: 'Sketches a straight slot.', onSelect: t(() => st.setTool('slot')) },
    { label: 'Trim Entities', icon: <Icon.Trim />, description: 'Trims or extends a sketch entity to be coincident to another.', onSelect: t(() => st.setTool('trim')) },
    { label: 'Offset Entities', icon: <Icon.Offset />, description: 'Adds sketch entities by offsetting faces, edges, curves or sketch entities.', onSelect: t(() => st.setTool('offset')) },
    { label: 'Sketch Fillet', icon: <Icon.Fillet2D />, description: 'Rounds the corner at the intersection of two sketch entities.', onSelect: t(() => st.setTool('sketchFillet')) },
    { label: 'Spline', icon: <Icon.Spline />, description: 'Sketches a spline.', onSelect: t(() => st.setTool('spline')) },
    { label: 'Point', icon: <Icon.Point />, description: 'Sketches a point.', onSelect: t(() => st.setTool('point')) },
    { label: 'Linear Sketch Pattern', icon: <Icon.Pattern />, description: 'Adds a linear pattern of sketch entities.', onSelect: t(() => st.setTool('linearSketchPattern')) },
    { label: 'Mirror Entities', icon: <Icon.Mirror />, description: 'Mirrors selected entities about a centerline.', onSelect: t(() => st.mirrorSelection()) },
    { label: 'Construction Geometry', icon: <Icon.Construction />, description: 'Toggles sketch entities to construction geometry.', onSelect: t(() => st.toggleConstructionSelection()) },
    { label: 'Display/Delete Relations', icon: <Icon.Lock />, description: 'Displays and deletes geometric relations.', onSelect: t(() => st.setTaskPane('relations')) },
    { label: 'Circular Sketch Pattern', icon: <Icon.Pattern />, description: 'Adds a circular pattern of sketch entities.', onSelect: t(() => st.setTool('circularSketchPattern')) },
  ];
  const partCmds: Cmd[] = [
    { label: 'Select', icon: <Icon.Select />, description: 'Selects entities.', onSelect: close },
    { label: 'Sketch', icon: <Icon.Sketch />, description: 'Creates a new sketch, or edits an existing sketch.', onSelect: t(() => st.startPlanePick()) },
    { label: 'Extruded Boss/Base', icon: <Icon.Extrude />, description: 'Extrudes a sketch or selected sketch contours in one or two directions to create a solid feature.', onSelect: t(() => st.startFeature('extrude', 'boss')) },
    { label: 'Revolved Boss/Base', icon: <Icon.Revolve />, description: 'Revolves a sketch or selected sketch contours around an axis to create a solid feature.', onSelect: t(() => st.startFeature('revolve', 'boss')) },
    { label: 'Extruded Cut', icon: <Icon.Cut />, description: 'Cuts a solid model by extruding a sketched profile in one or two directions.', onSelect: t(() => st.startFeature('extrude', 'cut')) },
    { label: 'Hole Wizard', icon: <Icon.Hole />, description: 'Inserts a hole using a pre-defined cross-section.', onSelect: t(() => st.startHole()) },
    { label: 'Revolved Cut', icon: <Icon.Revolve />, description: 'Cuts a solid model by revolving a sketched profile around an axis.', onSelect: t(() => st.startFeature('revolve', 'cut')) },
    { label: 'Fillet', icon: <Icon.Arc />, description: 'Creates a rounded internal or external face along one or more edges in solid or surface features.', onSelect: t(() => st.startRound('fillet')) },
    { label: 'Chamfer', icon: <Icon.Chamfer />, description: 'Creates a bevel feature along an edge, a chain of tangent edges or a vertex.', onSelect: t(() => st.startRound('chamfer')) },
    { label: 'Linear Pattern', icon: <Icon.Pattern />, description: 'Patterns features, faces and bodies in one or two linear directions.', onSelect: t(() => st.startPattern('linearPattern')) },
    { label: 'Mirror', icon: <Icon.Mirror />, description: 'Mirrors features, faces and bodies about a face or plane.', onSelect: t(() => st.startMirror()) },
    { label: 'Shell', icon: <Icon.Shell />, description: 'Removes material from a solid body to create a thin-walled feature.', onSelect: t(() => st.startShell()) },
    { label: 'Rib', icon: <Icon.Rib />, description: 'Adds a thin-walled support between a sketched contour and the body.', onSelect: t(() => st.startRib()) },
    { label: 'Measure', icon: <Icon.Measure />, description: 'Measures distance, angle, radius and size of and between lines, points, surfaces and planes.', onSelect: t(() => st.setDialog('measure')) },
    { label: 'Mass Properties', icon: <Icon.Mass />, description: 'Evaluates the mass properties of the model.', onSelect: t(() => st.setDialog('mass')) },
    { label: 'Zoom to Fit', icon: <Icon.Fit />, description: 'Zooms the model to fit the window.', onSelect: t(() => fitActive()) },
    { label: 'Options', icon: <Icon.Options />, description: 'Changes the system and document options.', onSelect: t(() => st.setDialog('options')) },
  ];
  const asmCmds: Cmd[] = [
    { label: 'Select', icon: <Icon.Select />, description: 'Selects entities.', onSelect: close },
    { label: 'Insert Components', icon: <Icon.InsertComponent />, description: 'Adds an existing part or assembly to the assembly.', onSelect: t(() => st.startInsertComponent()) },
    { label: 'Mate', icon: <Icon.Mate />, description: 'Positions two components relative to one another.', onSelect: t(() => st.startMate()) },
    { label: 'Move Component', icon: <Icon.MoveComponent />, description: 'Moves a component within the degrees of freedom defined by its mates.', onSelect: t(() => st.setAsmTool('move')) },
    { label: 'Rotate Component', icon: <Icon.RotateComponent />, description: 'Rotates a component within the degrees of freedom defined by its mates.', onSelect: t(() => st.setAsmTool('rotate')) },
    { label: 'Interference Detection', icon: <Icon.Interference />, description: 'Detects interferences between components.', onSelect: t(() => st.setDialog('interference')) },
    { label: 'Bill of Materials', icon: <Icon.Bom />, description: 'Inserts a bill of materials.', onSelect: t(() => st.setDialog('bom')) },
    { label: 'Measure', icon: <Icon.Measure />, description: 'Measures distances and angles.', onSelect: t(() => st.setDialog('measure')) },
  ];
  // Customize ▸ Shortcut Bars: the unchecked commands are left out
  const ctx = inSketch ? 'sketch' : st.doc.kind === 'assembly' ? 'assembly' : 'part';
  const hidden = String(getPref('customize.shortcutbar.hidden') ?? '').split('|');
  const cmds = (inSketch ? sketchCmds : st.doc.kind === 'assembly' ? asmCmds : partCmds).filter((c) => !hidden.includes(`${ctx}:${c.label}`));
  return (
    <div className="k-skey" onMouseLeave={() => setTip(null)}>
      <div className="k-skey-grid">
        {cmds.map((c, i) => (
          <div key={c.label} className="k-skey-cell" onMouseEnter={() => setTip(c)}>
            <button className="k-skey-btn" disabled={c.disabled} onClick={c.onSelect}>{c.icon}</button>
            {c.flyout && (
              <button className="k-skey-caret" onClick={() => setOpen(open === i ? null : i)}>
                <Icon.ChevronDown size={8} />
              </button>
            )}
            {open === i && c.flyout && <Menu items={c.flyout} onClose={() => setOpen(null)} style={{ top: '100%', left: 0 }} />}
          </div>
        ))}
      </div>
      {tip && (
        <div className="k-skey-tip">
          <b>{tip.label}</b>
          {tip.description && <p>{tip.description}</p>}
        </div>
      )}
    </div>
  );
}
