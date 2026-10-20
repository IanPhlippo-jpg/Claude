import { useState, type ReactNode } from 'react';
import { useStore, type RibbonTab, type ToolId } from '../store';
import { Menu, type MenuItem } from '../../ui/components';
import { Icon } from '../../ui/icons';

/**
 * CommandManager laid out like the desktop original: large icon+text buttons,
 * stacked small buttons, consolidated fly-outs, and the tab strip below.
 */
const TABS: { id: RibbonTab; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'markup', label: 'Markup' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'mbd', label: 'MBD Dimensions' },
  { id: 'addins', label: 'Phlippo Add-Ins' },
  { id: 'assembly', label: 'Assembly' },
  { id: 'drawing', label: 'Drawing' },
];

function Group({ children }: { children: ReactNode }) {
  return <div className="k-cm-group">{children}</div>;
}

interface BigProps {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick?: () => void;
  flyout?: { label: string; icon: ReactNode; onSelect: () => void; disabled?: boolean }[];
}

function Big({ label, icon, active, disabled, shortcut, onClick, flyout }: BigProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`k-cm-big ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}>
      <button className="k-cm-main k-tip" data-tip={shortcut ? `${label} (${shortcut})` : label} disabled={disabled} onClick={onClick}>
        <span className="k-cm-icon">{icon}</span>
        <span className="k-cm-label">{label}</span>
      </button>
      {flyout && (
        <>
          <button className="k-cm-arrow" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-label="More">
            <Icon.ChevronDown size={10} />
          </button>
          {open && <Menu items={flyout as MenuItem[]} onClose={() => setOpen(false)} style={{ top: '100%', left: 0 }} />}
        </>
      )}
    </div>
  );
}

function Small({ label, icon, active, disabled, onClick, shortcut, flyout }: BigProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="k-cm-smallwrap" style={{ position: 'relative' }}>
      <button className={`k-cm-small k-tip ${active ? 'active' : ''}`} data-tip={shortcut ? `${label} (${shortcut})` : label} disabled={disabled} onClick={onClick}>
        {icon}
        <span>{label}</span>
      </button>
      {flyout && (
        <button className="k-cm-small-arrow" disabled={disabled} onClick={() => setOpen((o) => !o)}>
          <Icon.ChevronDown size={9} />
        </button>
      )}
      {open && flyout && <Menu items={flyout as MenuItem[]} onClose={() => setOpen(false)} style={{ top: '100%', left: 0 }} />}
    </div>
  );
}

/** icon-only consolidated button (sketch entity column), like the sketch toolbar */
function IconFly({ icon, tip, active, disabled, onClick, flyout }: { icon: ReactNode; tip: string; active?: boolean; disabled?: boolean; onClick?: () => void; flyout?: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`k-cm-iconfly ${active ? 'active' : ''}`} style={{ position: 'relative' }}>
      <button className="k-cm-iconbtn k-tip" data-tip={tip} disabled={disabled} onClick={onClick}>
        {icon}
      </button>
      {flyout && (
        <button className="k-cm-small-arrow" disabled={disabled} onClick={() => setOpen((o) => !o)}>
          <Icon.ChevronDown size={9} />
        </button>
      )}
      {open && flyout && <Menu items={flyout} onClose={() => setOpen(false)} style={{ top: '100%', left: 0 }} />}
    </div>
  );
}

export function Ribbon() {
  const st = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const inSketch = !!st.activeSketchId;
  const T = (id: ToolId) => ({ active: (st.tool === id && inSketch) || (st.planePick && st.pendingTool === id), onClick: () => st.setTool(id) });
  const hasSel = st.selection.length > 0;
  const mirrorable = inSketch && st.selection.filter((s) => s.kind === 'entity').length >= 2;
  const soon = (label: string, icon: ReactNode) => <Small label={label} icon={icon} disabled />;

  const sketchTab = (
    <>
      <Group>
        {inSketch ? (
          <Big label="Exit Sketch" icon={<Icon.Exit />} onClick={st.exitSketch} />
        ) : (
          <Big label="Sketch" icon={<Icon.Sketch />} shortcut="Ctrl+Shift+S" active={st.planePick} onClick={st.startPlanePick} />
        )}
        <Big label="Smart Dimension" icon={<Icon.Dimension />} shortcut="M" {...T('dimension')} flyout={[
          { label: 'Smart Dimension', icon: <Icon.Dimension />, onSelect: () => st.setTool('dimension') },
          { label: 'Horizontal Dimension (phase 2)', icon: <Icon.Dimension />, onSelect: () => {}, disabled: true },
          { label: 'Vertical Dimension (phase 2)', icon: <Icon.Dimension />, onSelect: () => {}, disabled: true },
        ]} />
      </Group>
      <Group>
        <div className="k-cm-grid">
          <IconFly icon={<Icon.Line />} tip="Line (L)" {...T('line')} flyout={[
            { label: 'Line', icon: <Icon.Line />, onSelect: () => st.setTool('line') },
            { label: 'Centerline', icon: <Icon.Construction />, onSelect: () => st.setTool('centerline') },
            { label: 'Midpoint Line (phase 2)', icon: <Icon.Line />, disabled: true },
          ]} />
          <IconFly icon={<Icon.Circle />} tip="Circle (C)" {...T('circle')} flyout={[
            { label: 'Circle', icon: <Icon.Circle />, onSelect: () => st.setTool('circle') },
            { label: 'Perimeter Circle (phase 2)', icon: <Icon.Circle />, disabled: true },
          ]} />
          <IconFly icon={<Icon.Spline />} tip="Spline (N)" {...T('spline')} flyout={[
            { label: 'Spline', icon: <Icon.Spline />, onSelect: () => st.setTool('spline') },
            { label: 'Style Spline (phase 2)', icon: <Icon.Spline />, disabled: true },
          ]} />
          <IconFly icon={<Icon.Fillet2D />} tip="Sketch Fillet (phase 2)" disabled flyout={[{ label: 'Sketch Fillet', icon: <Icon.Fillet2D />, disabled: true }, { label: 'Sketch Chamfer', icon: <Icon.Chamfer />, disabled: true }]} />
          <IconFly icon={<Icon.Text />} tip="Text (phase 2)" disabled />
          <IconFly icon={st.lastTool === 'centerRectangle' ? <Icon.CenterRect /> : <Icon.Rect />} tip="Corner Rectangle (R)" {...T(st.lastTool === 'centerRectangle' ? 'centerRectangle' : 'rectangle')} flyout={[
            { label: 'Corner Rectangle', icon: <Icon.Rect />, onSelect: () => st.setTool('rectangle') },
            { label: 'Center Rectangle', icon: <Icon.CenterRect />, onSelect: () => st.setTool('centerRectangle') },
            { label: '3 Point Corner Rectangle (phase 2)', icon: <Icon.Rect />, disabled: true },
            { label: '3 Point Center Rectangle (phase 2)', icon: <Icon.Rect />, disabled: true },
            { label: 'Parallelogram (phase 2)', icon: <Icon.Rect />, disabled: true },
          ]} />
          <IconFly icon={st.lastTool === 'arcCenter' ? <Icon.ArcCenter /> : <Icon.Arc />} tip="Arc (A)" {...T(st.lastTool === 'arcCenter' ? 'arcCenter' : 'arc3')} flyout={[
            { label: 'Centerpoint Arc', icon: <Icon.ArcCenter />, onSelect: () => st.setTool('arcCenter') },
            { label: 'Tangent Arc (phase 2)', icon: <Icon.Arc />, disabled: true },
            { label: '3 Point Arc', icon: <Icon.Arc />, onSelect: () => st.setTool('arc3') },
          ]} />
          <IconFly icon={<Icon.Ellipse />} tip="Ellipse (phase 2)" disabled flyout={[{ label: 'Ellipse', icon: <Icon.Ellipse />, disabled: true }, { label: 'Partial Ellipse', icon: <Icon.Ellipse />, disabled: true }, { label: 'Parabola', icon: <Icon.Arc />, disabled: true }, { label: 'Conic', icon: <Icon.Arc />, disabled: true }]} />
          <IconFly icon={<Icon.Plane />} tip="Plane (3D sketch, phase 2)" disabled />
          <IconFly icon={<Icon.Point />} tip="Point (P)" {...T('point')} />
          <IconFly icon={<Icon.Slot />} tip="Slot (phase 2)" disabled flyout={[{ label: 'Straight Slot', icon: <Icon.Slot />, disabled: true }, { label: 'Centerpoint Straight Slot', icon: <Icon.Slot />, disabled: true }, { label: '3 Point Arc Slot', icon: <Icon.Slot />, disabled: true }, { label: 'Centerpoint Arc Slot', icon: <Icon.Slot />, disabled: true }]} />
          <IconFly icon={<Icon.Polygon />} tip="Polygon" {...T('polygon')} />
        </div>
      </Group>
      <Group>
        <Big label="Trim Entities" icon={<Icon.Trim />} disabled flyout={[{ label: 'Trim Entities', icon: <Icon.Trim />, onSelect: () => {}, disabled: true }, { label: 'Extend Entities', icon: <Icon.Arrow />, onSelect: () => {}, disabled: true }]} />
        <Big label="Convert Entities" icon={<Icon.Convert />} disabled />
        <Big label="Offset Entities" icon={<Icon.Offset />} disabled flyout={[{ label: 'Offset Entities', icon: <Icon.Offset />, onSelect: () => {}, disabled: true }, { label: 'Offset on Surface', icon: <Icon.Offset />, onSelect: () => {}, disabled: true }]} />
        <div className="k-cm-col">
          <Small label="Mirror Entities" icon={<Icon.Mirror />} disabled={!mirrorable} onClick={() => st.mirrorSelection()} />
          <Small label="Linear Sketch Pattern" icon={<Icon.Pattern />} disabled flyout={[{ label: 'Linear Sketch Pattern', icon: <Icon.Pattern />, onSelect: () => {}, disabled: true }, { label: 'Circular Sketch Pattern', icon: <Icon.Pattern />, onSelect: () => {}, disabled: true }]} />
          <Small label="Move Entities" icon={<Icon.Arrow />} disabled flyout={[{ label: 'Move Entities', icon: <Icon.Arrow />, onSelect: () => {}, disabled: true }, { label: 'Copy Entities', icon: <Icon.Arrow />, onSelect: () => {}, disabled: true }, { label: 'Rotate Entities', icon: <Icon.Rebuild />, onSelect: () => {}, disabled: true }, { label: 'Scale Entities', icon: <Icon.Fit />, onSelect: () => {}, disabled: true }]} />
        </div>
      </Group>
      <Group>
        <Big label="Display/Delete Relations" icon={<Icon.Lock />} disabled={!inSketch} active={st.taskPane === 'relations'} onClick={() => st.setTaskPane('relations')} flyout={[
          { label: 'Display/Delete Relations', icon: <Icon.Lock />, onSelect: () => st.setTaskPane('relations') },
          { label: 'Add Relation', icon: <Icon.Lock />, onSelect: () => st.setManagerTab('properties') },
          { label: 'Fully Define Sketch (phase 2)', icon: <Icon.Lock />, onSelect: () => {}, disabled: true },
        ]} />
        <Big label="Repair Sketch" icon={<Icon.Rebuild />} disabled />
        <Big label="Quick Snaps" icon={<Icon.Grid />} active={st.snapGrid} disabled={!inSketch} onClick={() => st.toggle('snapGrid')} />
      </Group>
      <Group>
        <Big label="Rapid Sketch" icon={<Icon.Sketch />} disabled />
        <div className="k-cm-col">
          <Small label="Construction Geometry" icon={<Icon.Construction />} shortcut="X" disabled={!inSketch || !hasSel} onClick={st.toggleConstructionSelection} />
          <Small label="Instant2D" icon={<Icon.Cursor />} disabled />
          <Small label="Shaded Sketch Contours" icon={<Icon.DisplayStyle />} active={st.shadedContours} disabled={!inSketch} onClick={() => st.toggle('shadedContours')} />
        </div>
      </Group>
    </>
  );

  const featuresTab = (
    <>
      <Group>
        <Big label="Extruded Boss/Base" icon={<Icon.Extrude />} disabled />
        <Big label="Revolved Boss/Base" icon={<Icon.Revolve />} disabled />
        <div className="k-cm-col">
          {soon('Swept Boss/Base', <Icon.Sweep />)}
          {soon('Lofted Boss/Base', <Icon.Loft />)}
          {soon('Boundary Boss/Base', <Icon.Loft />)}
        </div>
      </Group>
      <Group>
        <Big label="Extruded Cut" icon={<Icon.Cut />} disabled />
        <Big label="Hole Wizard" icon={<Icon.Hole />} disabled />
        <Big label="Revolved Cut" icon={<Icon.Revolve />} disabled />
        <div className="k-cm-col">
          {soon('Swept Cut', <Icon.Sweep />)}
          {soon('Lofted Cut', <Icon.Loft />)}
          {soon('Boundary Cut', <Icon.Loft />)}
        </div>
      </Group>
      <Group>
        <Big label="Fillet" icon={<Icon.Arc />} disabled />
        <Big label="Linear Pattern" icon={<Icon.Pattern />} disabled />
        <div className="k-cm-col">
          {soon('Rib', <Icon.Shell />)}
          {soon('Draft', <Icon.Chamfer />)}
          {soon('Shell', <Icon.Shell />)}
        </div>
        <div className="k-cm-col">
          {soon('Wrap', <Icon.Revolve />)}
          {soon('Intersect', <Icon.Interference />)}
          {soon('Mirror', <Icon.Mirror />)}
        </div>
      </Group>
      <Group>
        <Big label="Reference Geometry" icon={<Icon.Plane />} disabled />
        <Big label="Curves" icon={<Icon.Spline />} disabled />
        <Big label="Instant3D" icon={<Icon.Cursor />} disabled />
      </Group>
      <Group>
        <Big label="Sketch" icon={<Icon.Sketch />} active={st.planePick} onClick={() => (inSketch ? st.exitSketch() : st.startPlanePick())} />
      </Group>
      <span className="k-cm-note">Feature tools arrive in phase 2</span>
    </>
  );

  const evaluateTab = (
    <>
      <Group>
        <Big label="Design Study" icon={<Icon.Config />} disabled />
        <Big label="Interference Detection" icon={<Icon.Interference />} disabled />
        <Big label="Measure" icon={<Icon.Measure />} disabled />
        <Big label="Mass Properties" icon={<Icon.Mass />} disabled />
        <Big label="Section Properties" icon={<Icon.Section />} disabled />
        <Big label="Sensor" icon={<Icon.Sensor />} disabled />
      </Group>
      <Group>
        <div className="k-cm-col">
          {soon('Check', <Icon.Check />)}
          {soon('Geometry Analysis', <Icon.Measure />)}
          {soon('Curvature', <Icon.Arc />)}
        </div>
        <div className="k-cm-col">
          {soon('Draft Analysis', <Icon.Chamfer />)}
          {soon('Undercut Analysis', <Icon.Cut />)}
          {soon('Thickness Analysis', <Icon.Shell />)}
        </div>
      </Group>
      <span className="k-cm-note">Evaluate tools arrive in phases 4 and 7</span>
    </>
  );
  const assemblyTab = (
    <Group>
      <Big label="Insert Components" icon={<Icon.Component />} disabled />
      <Big label="Mate" icon={<Icon.Lock />} disabled />
      <Big label="Exploded View" icon={<Icon.Pattern />} disabled />
      <span className="k-cm-note">Assemblies arrive in phase 4</span>
    </Group>
  );
  const drawingTab = (
    <Group>
      <Big label="Model View" icon={<Icon.Drawing />} disabled />
      <Big label="Section View" icon={<Icon.Section />} disabled />
      <Big label="Sheet" icon={<Icon.Sheet />} disabled />
      <span className="k-cm-note">Drawings arrive in phase 5</span>
    </Group>
  );
  const markupTab = (
    <Group>
      <Big label="Exit Markup" icon={<Icon.Exit />} disabled />
      <Big label="Draw" icon={<Icon.Spline />} disabled />
      <Big label="Erase" icon={<Icon.Trash />} disabled />
      <span className="k-cm-note">Markup arrives in phase 5</span>
    </Group>
  );
  const mbdTab = (
    <Group>
      <Big label="Auto Dimension Scheme" icon={<Icon.Dimension />} disabled />
      <Big label="Location Dimension" icon={<Icon.Dimension />} disabled />
      <Big label="Size Dimension" icon={<Icon.Dimension />} disabled />
      <span className="k-cm-note">MBD arrives in phase 5</span>
    </Group>
  );
  const addinsTab = (
    <Group>
      <Big label="Simulation" icon={<Icon.Sensor />} disabled />
      <Big label="Toolbox" icon={<Icon.Library />} disabled />
      <Big label="Routing" icon={<Icon.Spline />} disabled />
      <span className="k-cm-note">Add-ins are not part of the phases</span>
    </Group>
  );

  return (
    <div className={`k-cm ${collapsed ? 'collapsed' : ''}`}>
      {!collapsed && (
        <div className="k-cm-body">
          {st.tab === 'sketch' && sketchTab}
          {st.tab === 'features' && featuresTab}
          {st.tab === 'evaluate' && evaluateTab}
          {st.tab === 'assembly' && assemblyTab}
          {st.tab === 'drawing' && drawingTab}
          {st.tab === 'markup' && markupTab}
          {st.tab === 'mbd' && mbdTab}
          {st.tab === 'addins' && addinsTab}
        </div>
      )}
      <div className="k-cm-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            className={`k-cm-tab ${t.id === st.tab ? 'active' : ''}`}
            onClick={() => {
              st.setTab(t.id);
              setCollapsed(false);
            }}
          >
            {t.label}
          </button>
        ))}
        <span className="grow" />
        <button className="k-btn ghost icon k-tip" data-tip={collapsed ? 'Expand CommandManager' : 'Collapse CommandManager'} onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <Icon.ChevronDown size={12} /> : <Icon.Pin size={12} />}
        </button>
      </div>
    </div>
  );
}
