import { getPref, loadPrefs, savePrefs } from '../prefs';
import { RibbonBody } from './RibbonOverflow';
import { useState, type ReactNode } from 'react';
import { useStore, type RibbonTab, type ToolId } from '../store';
import { Menu, type MenuItem } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { openFileDialog, saveDocument } from '../MenuBar';
import { AssemblyTab, LifecycleTab } from './AssemblyTab';
import { AnnotationTab, SheetFormatTab, ViewLayoutTab } from './DrawingTabs';

/**
 * CommandManager laid out like the desktop original: a 3×3 block with the menu-bar
 * commands, large icon+text buttons, stacked small buttons, consolidated fly-outs,
 * and the tab strip below (Features · Sketch · Surfaces · Sheet Metal · Evaluate ·
 * Render Tools · Add-Ins).
 */
const DRAWING_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'viewLayout', label: 'Drawing' },
  { id: 'annotation', label: 'Annotation' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'markup', label: 'Markup' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'addins', label: 'Phlippo Add-Ins' },
  { id: 'sheetFormat', label: 'Sheet Format' },
];

const ASSEMBLY_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'assembly', label: 'Assembly' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'markup', label: 'Markup' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'render', label: 'Render Tools' },
  { id: 'lifecycle', label: 'Lifecycle and Collaboration' },
  { id: 'addins', label: 'Phlippo Add-Ins' },
];

const TABS: { id: RibbonTab; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'sheetmetal', label: 'Sheet Metal' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'render', label: 'Render Tools' },
  { id: 'addins', label: 'Phlippo Add-Ins' },
];

export function Group({ children }: { children: ReactNode }) {
  return <div className="k-cm-group">{children}</div>;
}

interface BigProps {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  /** looks enabled but reports that the command is part of a later phase */
  later?: string;
  shortcut?: string;
  onClick?: () => void;
  flyout?: { label: string; icon: ReactNode; onSelect?: () => void; disabled?: boolean }[];
}

function useLater() {
  const push = useStore((s) => s.pushMessage);
  return (label: string, phase: string) => () => push(`${label} is part of ${phase}.`, 'info');
}

export function BigButton({ label, icon, active, disabled, later, shortcut, onClick, flyout }: BigProps) {
  const [open, setOpen] = useState(false);
  const laterFn = useLater();
  const run = later ? laterFn(label, later) : onClick;
  // Enter repeats the last command, as the original
  const click = run ? () => { useStore.getState().setLastCommand({ label, run }); run(); } : undefined;
  return (
    <div className={`k-cm-big ${active ? 'active' : ''} ${disabled ? 'disabled' : ''} ${later ? 'later' : ''}`}>
      <button className="k-cm-main k-tip" data-tip={shortcut ? `${label} (${shortcut})` : label} disabled={disabled} onClick={click}>
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

export function SmallButton({ label, icon, active, disabled, later, onClick, shortcut, flyout }: BigProps) {
  const [open, setOpen] = useState(false);
  const laterFn = useLater();
  const run = later ? laterFn(label, later) : onClick;
  const click = run ? () => { useStore.getState().setLastCommand({ label, run }); run(); } : undefined;
  return (
    <div className="k-cm-smallwrap" style={{ position: 'relative' }}>
      <button className={`k-cm-small k-tip ${active ? 'active' : ''} ${later ? 'later' : ''}`} data-tip={shortcut ? `${label} (${shortcut})` : label} disabled={disabled} onClick={click}>
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

/** icon-only consolidated button (sketch entity grid), like the sketch toolbar */
function IconFly({ icon, tip, active, disabled, later, onClick, flyout }: { icon: ReactNode; tip: string; active?: boolean; disabled?: boolean; later?: string; onClick?: () => void; flyout?: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const laterFn = useLater();
  const click = later ? laterFn(tip, later) : onClick;
  return (
    <div className={`k-cm-iconfly ${active ? 'active' : ''}`} style={{ position: 'relative' }}>
      <button className={`k-cm-iconbtn k-tip ${later ? 'later' : ''}`} data-tip={tip} disabled={disabled} onClick={click}>
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

/** small icon button with optional caret (menu-bar block inside the CommandManager) */
function MbIcon({ icon, tip, onClick, caret, disabled }: { icon: ReactNode; tip: string; onClick?: () => void; caret?: boolean; disabled?: boolean }) {
  return (
    <button className="k-cm-mbbtn k-tip" data-tip={tip} onClick={onClick} disabled={disabled}>
      {icon}
      {caret && <Icon.ChevronDown size={8} className="k-mb-caret" />}
    </button>
  );
}

export function Ribbon() {
  const st = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const inSketch = !!st.activeSketchId;
  const T = (id: ToolId) => ({ active: (st.tool === id && inSketch) || (st.planePick && st.pendingTool === id), onClick: () => st.setTool(id) });
  const mirrorable = inSketch && st.selection.filter((s) => s.kind === 'entity').length >= 2;

  // 3×3 block with the menu-bar commands, present on every tab (as the 2026 CommandManager)
  const menuBlock = (
    <Group>
      <div className="k-cm-mbgrid">
        <MbIcon icon={<Icon.Home />} tip="Home" onClick={() => st.setDialog('welcome')} />
        <MbIcon icon={<Icon.Save />} tip="Save (Ctrl+S)" onClick={() => saveDocument()} caret />
        <MbIcon icon={<Icon.Undo />} tip={st.undoLabel ? `Undo ${st.undoLabel} (Ctrl+Z)` : 'Undo (Ctrl+Z)'} onClick={st.undo} caret disabled={!st.canUndo} />
        <MbIcon icon={<Icon.New />} tip="New (Ctrl+N)" onClick={() => st.setDialog('new')} caret />
        <MbIcon icon={<Icon.Rebuild />} tip="Rebuild (Ctrl+B)" onClick={() => st.rebuildAll()} />
        <MbIcon icon={<Icon.Redo />} tip={st.redoLabel ? `Redo ${st.redoLabel} (Ctrl+Y)` : 'Redo (Ctrl+Y)'} onClick={st.redo} caret disabled={!st.canRedo} />
        <MbIcon icon={<Icon.Open />} tip="Open (Ctrl+O)" onClick={openFileDialog} caret />
        <MbIcon icon={<Icon.Options />} tip="Options" onClick={() => st.setDialog('options')} caret />
        <MbIcon icon={<Icon.Select />} tip="Select (Esc)" onClick={() => st.setTool('select')} caret />
      </div>
    </Group>
  );

  const sketchTab = (
    <>
      {menuBlock}
      <Group>
        {st.sketch3dEdit ? (
          <BigButton label="Exit Sketch" icon={<Icon.ExitSketch />} active onClick={st.commit3DSketch} />
        ) : inSketch ? (
          <BigButton label="Exit Sketch" icon={<Icon.ExitSketch />} active onClick={st.exitSketch} />
        ) : (
          <BigButton label="Sketch" icon={<Icon.Sketch />} shortcut="Ctrl+Shift+S" active={st.planePick} onClick={st.startPlanePick} flyout={[
            { label: 'Sketch', icon: <Icon.Sketch />, onSelect: st.startPlanePick },
            { label: '3D Sketch', icon: <Icon.Sketch />, onSelect: st.start3DSketch },
          ]} />
        )}
        <BigButton label="Smart Dimension" icon={<Icon.SmartDimension />} {...T('dimension')} flyout={[
          { label: 'Smart Dimension', icon: <Icon.Dimension />, onSelect: () => st.setTool('dimension') },
          { label: 'Horizontal Dimension', icon: <Icon.Dimension />, onSelect: () => st.setTool('hdim') },
          { label: 'Vertical Dimension', icon: <Icon.Dimension />, onSelect: () => st.setTool('vdim') },
        ]} />
      </Group>
      <Group>
        <div className="k-cm-grid">
          {/* column 1 */}
          <IconFly icon={<Icon.Line />} tip="Line (L)" {...T('line')} flyout={[
            { label: 'Line', icon: <Icon.Line />, onSelect: () => st.setTool('line') },
            { label: 'Centerline', icon: <Icon.Construction />, onSelect: () => st.setTool('centerline') },
            { label: 'Midpoint Line', icon: <Icon.MidLine />, onSelect: () => st.setTool('midpointLine') },
          ]} />
          {(() => {
            // the button shows the last used rectangle type, as the original
            const R = { rectangle: ['Corner Rectangle', <Icon.Rect key="r" />], centerRectangle: ['Center Rectangle', <Icon.CenterRect key="c" />], rect3Corner: ['3 Point Corner Rectangle', <Icon.Rect3Corner key="3" />], rect3Center: ['3 Point Center Rectangle', <Icon.Rect3Center key="3c" />], parallelogram: ['Parallelogram', <Icon.Parallelogram key="p" />] } as const;
            const last = (st.lastTool in R ? st.lastTool : 'rectangle') as keyof typeof R;
            return (
              <IconFly icon={R[last][1]} tip={R[last][0]} {...T(last)} flyout={(Object.keys(R) as (keyof typeof R)[]).map((k) => ({ label: R[k][0], icon: R[k][1], onSelect: () => st.setTool(k) }))} />
            );
          })()}
          <IconFly icon={<Icon.Slot />} tip="Straight Slot" {...T('slot')} flyout={[{ label: 'Straight Slot', icon: <Icon.Slot />, onSelect: () => st.setTool('slot') }, { label: 'Centerpoint Straight Slot', icon: <Icon.Slot />, onSelect: () => st.setTool('centerSlot') }, { label: '3 Point Arc Slot', icon: <Icon.Slot />, onSelect: () => st.setTool('arcSlot') }, { label: 'Centerpoint Arc Slot', icon: <Icon.Slot />, onSelect: () => st.setTool('centerArcSlot') }]} />
          {/* column 2 */}
          <IconFly icon={<Icon.Circle />} tip="Circle" {...T('circle')} flyout={[
            { label: 'Circle', icon: <Icon.Circle />, onSelect: () => st.setTool('circle') },
            { label: 'Perimeter Circle', icon: <Icon.Circle />, onSelect: () => st.setTool('perimeterCircle') },
          ]} />
          <IconFly icon={<Icon.Slot />} tip="3 Point Arc Slot" {...T('arcSlot')} />
          <IconFly icon={<Icon.Polygon />} tip="Polygon" {...T('polygon')} />
          {/* column 3 */}
          <IconFly icon={<Icon.Spline />} tip="Spline" {...T('spline')} flyout={[
            { label: 'Spline', icon: <Icon.Spline />, onSelect: () => st.setTool('spline') },
            { label: 'Style Spline', icon: <Icon.Spline />, onSelect: () => st.setTool('styleSpline') },
            { label: 'Equation Driven Curve', icon: <Icon.Spline />, onSelect: () => st.setTool('equationCurve') },
          ]} />
          <IconFly icon={<Icon.Ellipse />} tip="Ellipse" {...T('ellipse')} flyout={[{ label: 'Ellipse', icon: <Icon.Ellipse />, onSelect: () => st.setTool('ellipse') }, { label: 'Partial Ellipse', icon: <Icon.Ellipse />, onSelect: () => st.setTool('partialEllipse') }, { label: 'Parabola', icon: <Icon.Arc />, onSelect: () => st.setTool('parabola') }, { label: 'Conic', icon: <Icon.Arc />, onSelect: () => st.setTool('conic') }]} />
          <IconFly icon={st.lastTool === 'arcCenter' ? <Icon.ArcCenter /> : <Icon.Arc />} tip="Arc" {...T(st.lastTool === 'arcCenter' ? 'arcCenter' : 'arc3')} flyout={[
            { label: 'Centerpoint Arc', icon: <Icon.ArcCenter />, onSelect: () => st.setTool('arcCenter') },
            { label: 'Tangent Arc', icon: <Icon.Arc />, onSelect: () => st.setTool('tangentArc') },
            { label: '3 Point Arc', icon: <Icon.Arc />, onSelect: () => st.setTool('arc3') },
          ]} />
          {/* column 4 */}
          <IconFly icon={<Icon.SketchFillet />} tip="Sketch Fillet" {...T('sketchFillet')} flyout={[{ label: 'Sketch Fillet', icon: <Icon.SketchFillet />, onSelect: () => st.setTool('sketchFillet') }, { label: 'Sketch Chamfer', icon: <Icon.SketchChamfer />, onSelect: () => st.setTool('sketchChamfer') }]} />
          <IconFly icon={<Icon.Text />} tip="Text" {...T('text')} />
          <IconFly icon={<Icon.Point />} tip="Point" {...T('point')} />
        </div>
      </Group>
      <Group>
        <BigButton label="Trim Entities" icon={<Icon.TrimEntities />} {...T('trim')} flyout={[{ label: 'Trim Entities', icon: <Icon.Trim />, onSelect: () => st.setTool('trim') }, { label: 'Extend Entities', icon: <Icon.Arrow />, onSelect: () => st.setTool('extend') }]} />
        <BigButton label="Convert Entities" icon={<Icon.ConvertEntities />} disabled={!inSketch} onClick={st.convertEntities} />
        <BigButton label="Offset Entities" icon={<Icon.OffsetEntities />} {...T('offset')} flyout={[{ label: 'Offset Entities', icon: <Icon.Offset />, onSelect: () => st.setTool('offset') }]} />
        <BigButton label="Offset On Surface" icon={<Icon.OffsetOnSurface />} active={!!st.offsetSurfEdit} disabled={!st.rebuild.bodies.length} onClick={() => st.setOffsetSurfEdit(st.offsetSurfEdit ? null : { distance: 5, reverse: false })} />
        <div className="k-cm-col">
          <SmallButton label="Mirror Entities" icon={<Icon.MirrorEntities />} disabled={!mirrorable} onClick={() => st.mirrorSelection()} />
          <SmallButton label="Linear Sketch Pattern" icon={<Icon.SketchPattern />} {...T('linearSketchPattern')} flyout={[{ label: 'Linear Sketch Pattern', icon: <Icon.Pattern />, onSelect: () => st.setTool('linearSketchPattern') }, { label: 'Circular Sketch Pattern', icon: <Icon.Pattern />, onSelect: () => st.setTool('circularSketchPattern') }]} />
          <SmallButton label="Move Entities" icon={<Icon.MoveEntities />} {...T('moveEntities')} flyout={[{ label: 'Move Entities', icon: <Icon.MoveEntities />, onSelect: () => st.setTool('moveEntities') }, { label: 'Copy Entities', icon: <Icon.MoveEntities />, onSelect: () => st.setTool('copyEntities') }, { label: 'Rotate Entities', icon: <Icon.Rebuild />, onSelect: () => st.setTool('rotateEntities') }, { label: 'Scale Entities', icon: <Icon.Fit />, onSelect: () => st.setTool('scaleEntities') }]} />
        </div>
      </Group>
      <Group>
        <BigButton label="Display/Delete Relations" icon={<Icon.DisplayRelations />} disabled={!inSketch} active={st.taskPane === 'relations'} onClick={() => st.setTaskPane('relations')} flyout={[
          { label: 'Display/Delete Relations', icon: <Icon.Lock />, onSelect: () => st.setTaskPane('relations') },
          { label: 'Add Relation', icon: <Icon.Lock />, onSelect: () => st.setManagerTab('properties') },
          { label: 'Fully Define Sketch', icon: <Icon.Lock />, onSelect: () => st.setTool('fullyDefine') },
        ]} />
        <BigButton label="Repair Sketch" icon={<Icon.RepairSketch />} disabled={!inSketch} active={st.dialog === 'repairSketch'} onClick={() => st.setDialog(st.dialog === 'repairSketch' ? null : 'repairSketch')} />
        <BigButton label="Quick Snaps" icon={<Icon.QuickSnaps />} active={st.snapGrid} disabled={!inSketch} onClick={() => st.toggle('snapGrid')} flyout={[{ label: 'Snap to grid', icon: <Icon.Grid />, onSelect: () => st.toggle('snapGrid') }]} />
      </Group>
      <Group>
        <BigButton label="Rapid Sketch" icon={<Icon.RapidSketch />} active={st.rapidSketch} onClick={st.toggleRapidSketch} />
        <BigButton label="Instant2D" icon={<Icon.Instant2D />} active={st.instant2d} onClick={st.toggleInstant2D} />
        <BigButton label="Shaded Sketch Contours" icon={<Icon.ShadedContours />} active={st.shadedContours} disabled={!inSketch} onClick={() => st.toggle('shadedContours')} />
      </Group>
    </>
  );

  // as the original: commands that need a body (or a sketch) are greyed out until there is one
  // an assembly has no Features tab: commands that switch to it show the Assembly tab
  const tabShown = st.doc.kind === 'assembly' && (st.tab === 'features' || st.tab === 'surfaces' || st.tab === 'sheetmetal') ? 'assembly' : st.tab;
  const noBody = st.doc.kind === 'part' && !st.rebuild.bodies.length;
  // while a PropertyManager command runs, the original greys the CommandManager (the running command stays lit)
  const busy = st.doc.kind !== 'drawing' && (!!st.featureEdit || !!st.planeEdit || !!st.sheetMetalEdit || !!st.patternEdit || !!st.sketch3dEdit || !!st.motorEdit || !!st.fastenerEdit || (!!st.analysis && st.analysis.kind !== 'curvature'));
  const noSketch = !st.doc.features.some((f) => f.type === 'sketch');
  const noSurface = !(st.rebuild.surfaceBodies ?? []).length;
  // while a sketch is open the original greys the commands that do not take a sketch
  const inSk = !!st.activeSketchId;
  const featuresTab = (
    <>
      {menuBlock}
      <Group>
        <BigButton label="Extruded Boss/Base" icon={<Icon.Extrude />} active={st.featureEdit?.draft.type === 'extrude' && st.featureEdit.draft.op === 'boss'} onClick={() => st.startFeature('extrude', 'boss')} />
        <BigButton label="Revolved Boss/Base" icon={<Icon.Revolve />} active={st.featureEdit?.draft.type === 'revolve' && st.featureEdit.draft.op === 'boss'} onClick={() => st.startFeature('revolve', 'boss')} />
        <div className="k-cm-col">
          <SmallButton label="Swept Boss/Base" disabled={noSketch} icon={<Icon.Sweep />} active={st.featureEdit?.draft.type === 'sweep' && st.featureEdit.draft.op === 'boss'} onClick={() => st.startFeature('sweep', 'boss')} />
          <SmallButton label="Lofted Boss/Base" disabled={noSketch || inSk} icon={<Icon.Loft />} active={st.featureEdit?.draft.type === 'loft' && st.featureEdit.draft.op === 'boss'} onClick={() => st.startFeature('loft', 'boss')} />
          <SmallButton label="Boundary Boss/Base" disabled={noSketch || inSk} icon={<Icon.Boundary />} active={st.featureEdit?.draft.type === 'loft' && !!st.featureEdit.draft.boundary && st.featureEdit.draft.op === 'boss'} onClick={() => st.startFeature('loft', 'boss', true)} />
        </div>
      </Group>
      <Group>
        <BigButton label="Extruded Cut" disabled={noBody} icon={<Icon.Cut />} active={st.featureEdit?.draft.type === 'extrude' && st.featureEdit.draft.op === 'cut'} onClick={() => st.startFeature('extrude', 'cut')} />
        <BigButton label="Hole Wizard" disabled={noBody || inSk} icon={<Icon.Hole />} active={st.featureEdit?.draft.type === 'hole' || st.featureEdit?.draft.type === 'thread' || st.featureEdit?.draft.type === 'stud'} onClick={() => st.startHole()} flyout={[{ label: 'Hole Wizard', icon: <Icon.Hole />, onSelect: () => st.startHole() }, { label: 'Advanced Hole', icon: <Icon.Hole />, onSelect: () => st.startHole(true) }, { label: 'Thread', icon: <Icon.Hole />, onSelect: st.startThread }, { label: 'Stud Wizard', icon: <Icon.Hole />, onSelect: st.startStud }]} />
        <BigButton label="Revolved Cut" disabled={noBody} icon={<Icon.RevolveCut />} active={st.featureEdit?.draft.type === 'revolve' && st.featureEdit.draft.op === 'cut'} onClick={() => st.startFeature('revolve', 'cut')} />
        <div className="k-cm-col">
          <SmallButton label="Swept Cut" disabled={noBody || inSk} icon={<Icon.SweepCut />} active={st.featureEdit?.draft.type === 'sweep' && st.featureEdit.draft.op === 'cut'} onClick={() => st.startFeature('sweep', 'cut')} />
          <SmallButton label="Lofted Cut" disabled={noBody || inSk} icon={<Icon.LoftCut />} active={st.featureEdit?.draft.type === 'loft' && st.featureEdit.draft.op === 'cut'} onClick={() => st.startFeature('loft', 'cut')} />
          <SmallButton label="Boundary Cut" disabled={noBody || inSk} icon={<Icon.BoundaryCut />} active={st.featureEdit?.draft.type === 'loft' && !!st.featureEdit.draft.boundary && st.featureEdit.draft.op === 'cut'} onClick={() => st.startFeature('loft', 'cut', true)} />
        </div>
      </Group>
      <Group>
        <BigButton label="Fillet" disabled={noBody || inSk} icon={<Icon.Fillet />} active={st.featureEdit?.draft.type === 'fillet'} onClick={() => st.startRound('fillet')} flyout={[{ label: 'Fillet', icon: <Icon.Fillet />, onSelect: () => st.startRound('fillet') }, { label: 'Chamfer', icon: <Icon.Chamfer />, onSelect: () => st.startRound('chamfer') }]} />
        <BigButton label="Linear Pattern" disabled={inSk} icon={<Icon.Pattern />} active={!!st.featureEdit && /Pattern$/.test(st.featureEdit.draft.type)} onClick={() => st.startPattern('linearPattern')} flyout={[{ label: 'Linear Pattern', icon: <Icon.Pattern />, onSelect: () => st.startPattern('linearPattern') }, { label: 'Circular Pattern', icon: <Icon.Pattern />, onSelect: () => st.startPattern('circularPattern') }, { label: 'Curve Driven Pattern', icon: <Icon.Pattern />, onSelect: () => st.startPattern('curvePattern') }, { label: 'Sketch Driven Pattern', icon: <Icon.Pattern />, onSelect: () => st.startPattern('sketchPattern') }, { label: 'Table Driven Pattern', icon: <Icon.Pattern />, onSelect: () => st.startPattern('tablePattern') }, { label: 'Fill Pattern', icon: <Icon.Pattern />, onSelect: () => st.startPattern('fillPattern') }, { label: 'Variable Pattern', icon: <Icon.Pattern />, onSelect: () => st.startPattern('variablePattern') }]} />
        <div className="k-cm-col">
          <SmallButton label="Rib" disabled={noBody} icon={<Icon.Rib />} active={st.featureEdit?.draft.type === 'rib'} onClick={st.startRib} />
          <SmallButton label="Draft" disabled={noBody || inSk} icon={<Icon.Draft />} active={st.featureEdit?.draft.type === 'draft'} onClick={st.startDraft} />
          <SmallButton label="Shell" disabled={noBody || inSk} icon={<Icon.Shell />} active={st.featureEdit?.draft.type === 'shell'} onClick={st.startShell} />
        </div>
        <div className="k-cm-col">
          <SmallButton label="Wrap" disabled={noBody || inSk} icon={<Icon.Wrap />} active={st.featureEdit?.draft.type === 'wrap'} onClick={st.startWrap} />
          <SmallButton label="Intersect" disabled={noBody || inSk} icon={<Icon.Intersect />} active={st.featureEdit?.draft.type === 'intersect'} onClick={st.startIntersect} />
          <SmallButton label="Mirror" disabled={noBody || inSk} icon={<Icon.Mirror />} active={st.featureEdit?.draft.type === 'mirror'} onClick={st.startMirror} />
        </div>
      </Group>
      <Group>
        <BigButton label="Reference Geometry" icon={<Icon.RefGeometry />} active={!!st.planeEdit} onClick={() => st.startPlane()} flyout={[{ label: 'Plane', icon: <Icon.Plane />, onSelect: () => st.startPlane() }, { label: 'Axis', icon: <Icon.Line />, onSelect: () => st.startRefGeom('axis') }, { label: 'Coordinate System', icon: <Icon.Origin />, onSelect: () => st.startRefGeom('csys') }, { label: 'Point', icon: <Icon.Point />, onSelect: () => st.startRefGeom('point') }]} />
        <BigButton label="Curves" icon={<Icon.Curves />} active={st.featureEdit?.draft.type === 'helix'} onClick={st.startHelix} flyout={[{ label: 'Split Line', icon: <Icon.Line />, onSelect: () => st.startCurveFeature('splitLine') }, { label: 'Projected Curve', icon: <Icon.Spline />, onSelect: () => st.startCurveFeature('projectedCurve') }, { label: 'Helix and Spiral', icon: <Icon.Spline />, onSelect: () => st.startHelix() }]} />
        <BigButton label="Instant3D" icon={<Icon.Instant3D />} active={st.instant3d} onClick={st.toggleInstant3D} />
      </Group>
    </>
  );

  const evaluateTab = (
    <>
      {menuBlock}
      <Group>
        <BigButton label="Design Study" icon={<Icon.Config />} active={st.dialog === 'designStudy'} onClick={() => st.setDialog(st.dialog === 'designStudy' ? null : 'designStudy')} />
        <BigButton label="Interference Detection" icon={<Icon.Interference />} active={st.dialog === 'interference'} onClick={() => st.setDialog(st.dialog === 'interference' ? null : 'interference')} />
        <BigButton label="Measure" icon={<Icon.Measure />} active={st.dialog === 'measure'} onClick={() => st.setDialog(st.dialog === 'measure' ? null : 'measure')} />
        <BigButton label="Mass Properties" icon={<Icon.Mass />} active={st.dialog === 'mass'} onClick={() => st.setDialog(st.dialog === 'mass' ? null : 'mass')} />
        <BigButton label="Section Properties" icon={<Icon.Section />} active={st.dialog === 'sectionProps'} onClick={() => st.setDialog(st.dialog === 'sectionProps' ? null : 'sectionProps')} />
        <BigButton label="Sensor" icon={<Icon.Sensor />} active={!!st.sensorEdit} onClick={() => st.setSensorEdit(st.sensorEdit ? null : { kind: 'mass' })} />
      </Group>
      <Group>
        <div className="k-cm-col">
          <SmallButton label="Check" icon={<Icon.Check />} active={st.dialog === 'check'} onClick={() => st.setDialog(st.dialog === 'check' ? null : 'check')} />
          <SmallButton label="Geometry Analysis" icon={<Icon.Measure />} active={st.analysis?.kind === 'geometry'} onClick={() => st.setAnalysis(st.analysis?.kind === 'geometry' ? null : { kind: 'geometry', shortEdge: 0.5, smallFace: 1, sharpAngle: 30 })} />
          <SmallButton label="Curvature" icon={<Icon.Arc />} active={st.analysis?.kind === 'curvature'} onClick={() => st.setAnalysis(st.analysis?.kind === 'curvature' ? null : { kind: 'curvature' })} />
          <SmallButton label="Zebra Stripes" icon={<Icon.Zebra />} active={st.show.zebra} onClick={() => st.toggleShow('zebra')} />
        </div>
        <div className="k-cm-col">
          <SmallButton label="Draft Analysis" icon={<Icon.Chamfer />} active={st.analysis?.kind === 'draft'} onClick={() => st.setAnalysis(st.analysis?.kind === 'draft' ? null : { kind: 'draft', pull: [0, 1, 0], pullLabel: 'Y axis', angle: 1 })} />
          <SmallButton label="Undercut Analysis" icon={<Icon.Cut />} active={st.analysis?.kind === 'undercut'} onClick={() => st.setAnalysis(st.analysis?.kind === 'undercut' ? null : { kind: 'undercut', pull: [0, 1, 0], pullLabel: 'Y axis' })} />
          <SmallButton label="Thickness Analysis" icon={<Icon.Shell />} active={st.analysis?.kind === 'thickness'} onClick={() => st.setAnalysis(st.analysis?.kind === 'thickness' ? null : { kind: 'thickness', target: 2 })} />
        </div>
      </Group>
    </>
  );
  const surfacesTab = (
    <>
      {menuBlock}
      <Group>
        <BigButton label="Extruded Surface" icon={<Icon.Extrude />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'extrude'} onClick={() => st.startSurface('extrude')} />
        <BigButton label="Revolved Surface" icon={<Icon.Revolve />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'revolve'} onClick={() => st.startSurface('revolve')} />
        <BigButton label="Swept Surface" icon={<Icon.Sweep />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'sweep'} onClick={() => st.startSurface('sweep')} />
        <BigButton label="Lofted Surface" icon={<Icon.Loft />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'loft'} onClick={() => st.startSurface('loft')} />
        <BigButton label="Boundary Surface" icon={<Icon.Boundary />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'boundary'} onClick={() => st.startSurface('boundary')} />
        <div className="k-cm-col">
          <SmallButton label="Filled Surface" icon={<Icon.Boundary />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'filled'} onClick={() => st.startSurface('filled')} />
          <SmallButton label="Freeform" icon={<Icon.Curves />} later="a later build (face deformation)" />
        </div>
      </Group>
      <Group>
        <BigButton label="Planar Surface" icon={<Icon.Sheet />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'planar'} onClick={() => st.startSurface('planar')} />
        <BigButton label="Offset Surface" disabled={noBody} icon={<Icon.Offset />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'offset'} onClick={() => st.startSurface('offset')} />
        <BigButton label="Ruled Surface" disabled={noBody} icon={<Icon.Curves />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'ruled'} onClick={() => st.startSurface('ruled')} />
        <BigButton label="Surface Flatten" disabled={noSurface} icon={<Icon.Sheet />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'flatten'} onClick={() => st.startSurface('flatten')} />
      </Group>
      <Group>
        <BigButton label="Fillet" disabled={noBody || inSk} icon={<Icon.Fillet />} active={st.featureEdit?.draft.type === 'fillet'} onClick={() => st.startRound('fillet')} />
        <div className="k-cm-col">
          <SmallButton label="Delete Face" disabled={noBody} icon={<Icon.Trash />} active={st.featureEdit?.draft.type === 'deleteFace'} onClick={st.startDeleteFace} />
          <SmallButton label="Replace Face" disabled={noBody || noSurface} icon={<Icon.Shell />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'replaceFace'} onClick={() => st.startSurface('replaceFace')} />
          <SmallButton label="Delete Hole" disabled={noSurface} icon={<Icon.Hole />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'deleteHole'} onClick={() => st.startSurface('deleteHole')} />
        </div>
        <div className="k-cm-col">
          <SmallButton label="Extend Surface" disabled={noSurface} icon={<Icon.Extrude />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'extend'} onClick={() => st.startSurface('extend')} />
          <SmallButton label="Trim Surface" disabled={noSurface} icon={<Icon.Trim />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'trim'} onClick={() => st.startSurface('trim')} />
          <SmallButton label="Untrim Surface" disabled={noSurface} icon={<Icon.Boundary />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'untrim'} onClick={() => st.startSurface('untrim')} />
        </div>
        <BigButton label="Knit Surface" disabled={noSurface} icon={<Icon.Mirror />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'knit'} onClick={() => st.startSurface('knit')} />
      </Group>
      <Group>
        <BigButton label="Thicken" disabled={noSurface} icon={<Icon.Shell />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'thicken'} onClick={() => st.startSurface('thicken')} />
        <div className="k-cm-col">
          <SmallButton label="Thickened Cut" disabled={noSurface || noBody} icon={<Icon.Cut />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'thickenCut'} onClick={() => st.startSurface('thickenCut')} />
          <SmallButton label="Cut With Surface" disabled={noSurface || noBody} icon={<Icon.Section />} active={st.featureEdit?.draft.type === 'surface' && st.featureEdit.draft.kind === 'cutWithSurface'} onClick={() => st.startSurface('cutWithSurface')} />
        </div>
      </Group>
      <Group>
        <BigButton label="Reference Geometry" icon={<Icon.RefGeometry />} active={!!st.planeEdit} onClick={() => st.startPlane()} />
        <BigButton label="Curves" icon={<Icon.Curves />} active={st.featureEdit?.draft.type === 'helix'} onClick={st.startHelix} />
      </Group>
    </>
  );
  const sheetMetalTab = (
    <>
      {menuBlock}
      <Group>
        <BigButton label="Base Flange/Tab" icon={<Icon.Sheet />} active={st.featureEdit?.draft.type === 'baseFlange'} onClick={st.startBaseFlange} />
        <SmallButton label="Convert to Sheet Metal" icon={<Icon.Sheet />} disabled={noBody} active={st.featureEdit?.draft.type === 'convertSheet'} onClick={st.startConvertSheet} />
        <SmallButton label="Lofted-Bend" icon={<Icon.Loft />} active={st.featureEdit?.draft.type === 'loftedBend'} onClick={st.startLoftedBend} />
      </Group>
      <Group>
        <BigButton label="Edge Flange" disabled={noBody} icon={<Icon.Chamfer />} active={st.featureEdit?.draft.type === 'edgeFlange'} onClick={st.startEdgeFlange} />
        <div className="k-cm-col">
          <SmallButton label="Miter Flange" disabled={noBody} icon={<Icon.Chamfer />} active={st.featureEdit?.draft.type === 'miterFlange'} onClick={st.startMiterFlange} />
          <SmallButton label="Hem" disabled={noBody} icon={<Icon.Arc />} active={st.featureEdit?.draft.type === 'hem'} onClick={st.startHem} />
          <SmallButton label="Jog" disabled={noBody} icon={<Icon.Line />} active={st.featureEdit?.draft.type === 'jog'} onClick={st.startJog} />
        </div>
        <div className="k-cm-col">
          <SmallButton label="Sketched Bend" disabled={noBody} icon={<Icon.Line />} active={st.featureEdit?.draft.type === 'sketchedBend'} onClick={st.startSketchedBend} />
          <SmallButton label="Cross-Break" disabled={noBody} icon={<Icon.Mirror />} active={st.featureEdit?.draft.type === 'crossBreak'} onClick={st.startCrossBreak} />
          <SmallButton label="Corners" disabled={noBody} icon={<Icon.Chamfer />} active={!!(st.featureEdit && (st.featureEdit.draft.type === 'fillet' || st.featureEdit.draft.type === 'chamfer') && st.featureEdit.draft.breakCorner)} onClick={st.startBreakCorner} flyout={[{ label: 'Closed Corner', icon: <Icon.Chamfer />, onSelect: () => st.startClosedCorner() }, { label: 'Welded Corner', icon: <Icon.Chamfer />, onSelect: () => st.startClosedCorner(true) }, { label: 'Break-Corner/Corner-Trim', icon: <Icon.Chamfer />, onSelect: st.startBreakCorner }, { label: 'Corner Relief', icon: <Icon.Chamfer />, onSelect: st.startCornerRelief }]} />
        </div>
      </Group>
      <Group>
        <BigButton label="Flatten" disabled={noBody} icon={<Icon.Sheet />} active={st.doc.features.some((f) => f.type === 'flatPattern' && !f.suppressed)} onClick={st.toggleFlatten} />
        <div className="k-cm-col">
          <SmallButton label="Unfold" disabled={noBody} icon={<Icon.Sheet />} active={st.featureEdit?.draft.type === 'unfold'} onClick={() => st.startUnfold('unfold')} />
          <SmallButton label="Fold" disabled={noBody} icon={<Icon.Sheet />} active={st.featureEdit?.draft.type === 'fold'} onClick={() => st.startUnfold('fold')} />
          <SmallButton label="No Bends" icon={<Icon.Sheet />} disabled={noBody} active={st.doc.features.some((f) => f.type === 'flatPattern' && !f.suppressed && f.noBendLines)} onClick={st.toggleNoBends} />
        </div>
      </Group>
    </>
  );
  const renderTab = (
    <>
      {menuBlock}
      <Group>
        <BigButton label="Edit Appearance" icon={<Icon.Appearance />} onClick={() => st.setDialog('appearance')} />
        <BigButton label="Edit Scene" icon={<Icon.Scene />} active={st.sceneEdit} onClick={() => st.setSceneEdit(!st.sceneEdit)} />
        <BigButton label="Edit Decal" icon={<Icon.Palette />} active={!!st.decalEdit} onClick={() => (st.decalEdit ? useStore.setState({ decalEdit: null }) : st.startDecal())} />
        <BigButton label="Preview Window" icon={<Icon.DisplayStyle />} active={st.dialog === 'previewWindow'} onClick={() => st.setDialog(st.dialog === 'previewWindow' ? null : 'previewWindow')} />
        <BigButton label="Final Render" icon={<Icon.ViewSettings />} onClick={async () => { const img = await (window as unknown as { __phlippoFinalRender?: () => Promise<string | null> }).__phlippoFinalRender?.(); if (img) st.setFinalImage(img); }} />
      </Group>
    </>
  );
  const [toolboxOn, setToolboxOn] = useState(() => getPref('addin.toolbox') === true);
  const addinsTab = (
    <>
      {menuBlock}
      <Group>
        {/* Add-ins load and unload with a click (Toolbox: standard hardware in the Design Library) */}
        <BigButton label="Toolbox" icon={<Icon.Library />} active={toolboxOn} onClick={() => { const on = !toolboxOn; setToolboxOn(on); savePrefs({ ...loadPrefs(), 'addin.toolbox': on }); st.pushMessage(on ? 'Toolbox loaded: Design Library ▸ Toolbox holds the standard hardware.' : 'Toolbox unloaded.'); if (on && st.taskPane !== 'library') st.setTaskPane('library'); }} />
      </Group>
    </>
  );

  const bodies: Partial<Record<RibbonTab, ReactNode>> = {
    sketch: sketchTab,
    features: featuresTab,
    evaluate: evaluateTab,
    assembly: (
      <>
        {menuBlock}
        <AssemblyTab />
      </>
    ),
    lifecycle: (
      <>
        {menuBlock}
        <LifecycleTab />
      </>
    ),
    viewLayout: (
      <>
        {menuBlock}
        <ViewLayoutTab />
      </>
    ),
    annotation: (
      <>
        {menuBlock}
        <AnnotationTab />
      </>
    ),
    sheetFormat: (
      <>
        {menuBlock}
        <SheetFormatTab />
      </>
    ),
    markup: (
      <>
        {menuBlock}
        <Group>
          <BigButton label="Markup" icon={<Icon.Dimension />} active={!!st.markupMode} onClick={() => st.setMarkupMode(st.markupMode ? null : { color: '#d9363e' })} />
          <div className="k-cm-col">
            {(['#d9363e', '#1f6fd1', '#2e9d4a'] as const).map((c) => <SmallButton key={c} label={c === '#d9363e' ? 'Red pen' : c === '#1f6fd1' ? 'Blue pen' : 'Green pen'} icon={<span className="k-swatch" style={{ background: c }} />} active={st.markupMode?.color === c} onClick={() => st.setMarkupMode({ color: c })} />)}
          </div>
          <BigButton label="Clear Markups" icon={<Icon.Trash />} disabled={!(st.doc.markups ?? []).length} onClick={() => st.applyDocument('Clear Markups', { ...st.doc, markups: [] })} />
        </Group>
      </>
    ),
    surfaces: surfacesTab,
    sheetmetal: sheetMetalTab,
    render: renderTab,
    addins: addinsTab,
  };

  return (
    <div className={`k-cm ${collapsed ? 'collapsed' : ''} ${st.hasDocument ? '' : 'k-cm-nodoc'}`}>
      {!collapsed && <RibbonBody className={`k-cm-body ${busy ? 'busy' : ''}`} busy={busy}>{bodies[tabShown] ?? (st.doc.kind === 'assembly' ? bodies.assembly : st.doc.kind === 'drawing' ? bodies.viewLayout : featuresTab)}</RibbonBody>}
      <div className="k-cm-tabs" role="tablist">
        {(st.doc.kind === 'assembly' ? ASSEMBLY_TABS : st.doc.kind === 'drawing' ? DRAWING_TABS : TABS).map((t) => (
          <button
            key={t.id}
            role="tab"
            className={`k-cm-tab ${t.id === tabShown ? 'active' : ''}`}
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
