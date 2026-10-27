import { MAX_PATTERN_INSTANCES } from '../../core/features/pattern';
import { bridge } from '../viewport/bridge';
import { lastPolygon } from '../../core/sketch/lastShape';
import { rotateAbout, scaleAbout, transformEntities, translate } from '../../core/sketch/edit';
import { getPref, loadPrefs, savePrefs } from '../prefs';
import { sketchDimensionName } from '../../core/document/equations';
import { resolvePlaneDef } from '../../core/features/planes';
import { sketchChains } from '../../core/features/thin';
import { isRoundFeature, isSketchBased, type HoleFeature, type ThreadFeature } from '../../core/document/types';
import { METRIC_THREADS } from '../../core/features/thread';
import { useEffect, useState, type ReactNode } from 'react';
import { lastRectangle } from '../../core/sketch/lastShape';
import { useActiveSketch, useActiveSolve, useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Button, NumberField, Section, round } from '../../ui/components';
import { Icon, RelationGlyph } from '../../ui/icons';
import { relationLabel, relationsForSelection } from '../../core/sketch/relations';
import { isDimension, type Constraint } from '../../core/sketch/types';
import { toggleConstruction } from '../../core/sketch/model';
import { PLANE_LABELS } from '../viewport/camera';
import { rebuildDocument } from '../../core/features/rebuild';
import { DEFAULT_SHEET_METAL, GAUGE_TABLES, materialKFactor, type SheetMetalParams } from '../../core/features/sheetmetal';
import { classifyVent, FORM_TOOL_LIBRARY } from '../../core/features/sheetmetal4';
import { profileSizes, profileTypes, type ProfileType } from '../../core/features/weldments';

/** Sheet-Metal1 Property Panel: Bend Parameters (thickness, radius) and Bend Allowance (K-factor). */
function SheetMetalPM({ params, onOk, onCancel }: { params: SheetMetalParams; onOk: (p: SheetMetalParams) => void; onCancel: () => void }) {
  const [p, setP] = useState(params);
  const st = useStore(useShallow((s) => ({ doc: s.doc })));
  return (
    <>
      <Header title="Sheet-Metal1" icon={<Icon.Sheet />} onOk={() => onOk(p)} onCancel={onCancel} />
      <Section title="Sheet Metal Gauges" defaultOpen={!!p.gauge}>
        <label className="k-check"><input type="checkbox" data-testid="sm-gauge" checked={!!p.gauge} onChange={(e) => setP({ ...p, gauge: e.target.checked ? { table: 'Sample Table - Steel', gauge: 'Gauge 14' } : undefined, ...(e.target.checked ? { thickness: 1.897, bendRadius: 1.9 } : {}) })} /> Use gauge table</label>
        {p.gauge && (
          <>
            <select className="k-input" value={p.gauge.table} onChange={(e) => { const g = GAUGE_TABLES[e.target.value][0]; setP({ ...p, gauge: { table: e.target.value, gauge: g.gauge }, thickness: g.thickness, bendRadius: g.radius }); }}>{Object.keys(GAUGE_TABLES).map((t) => <option key={t}>{t}</option>)}</select>
            <select className="k-input" style={{ marginTop: 4 }} value={p.gauge.gauge} onChange={(e) => { const g = GAUGE_TABLES[p.gauge!.table].find((x) => x.gauge === e.target.value)!; setP({ ...p, gauge: { ...p.gauge!, gauge: g.gauge }, thickness: g.thickness, bendRadius: g.radius }); }}>{GAUGE_TABLES[p.gauge.table].map((g) => <option key={g.gauge}>{g.gauge}</option>)}</select>
          </>
        )}
      </Section>
      <Section title="Bend Parameters">
        <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>T1</span><NumberField value={p.thickness} onChange={(v) => setP({ ...p, thickness: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} autoFocus /></div>
        <div className="k-pm-valuerow"><Icon.Arc size={14} /><NumberField value={p.bendRadius} onChange={(v) => setP({ ...p, bendRadius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
      </Section>
      <Section title="Bend Allowance">
          <select className="k-input" data-testid="sm-allowance" value={p.allowanceType ?? 'kFactor'} onChange={(e) => setP({ ...p, allowanceType: e.target.value as 'kFactor', allowanceValue: p.allowanceValue ?? (e.target.value === 'bendAllowance' ? 5 : e.target.value === 'bendDeduction' ? 4 : undefined) })}>
            <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option><option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
          </select>
        {(p.allowanceType ?? 'kFactor') === 'kFactor' && <div className="k-pm-valuerow" style={{ marginTop: 4 }}><span className="k-muted" style={{ minWidth: 18 }}>K</span><NumberField value={p.kFactor} onChange={(v) => setP({ ...p, kFactor: Math.max(0, Math.min(1, v)) })} step={0.05} min={0} /></div>}
        {(p.allowanceType === 'bendAllowance' || p.allowanceType === 'bendDeduction') && <div className="k-pm-valuerow" style={{ marginTop: 4 }}><span className="k-muted" style={{ minWidth: 18 }}>{p.allowanceType === 'bendAllowance' ? 'BA' : 'BD'}</span><NumberField value={p.allowanceValue ?? 0} onChange={(v) => setP({ ...p, allowanceValue: Math.max(0, v) })} unit={st.doc.units} step={0.1} /></div>}
      </Section>
      <Section title="Auto Relief" defaultOpen={false}>
          <select className="k-input" data-testid="sm-relief" value={p.reliefType ?? 'rectangle'} onChange={(e) => setP({ ...p, reliefType: e.target.value as 'rectangle' })}><option value="rectangle">Rectangle</option><option value="tear">Tear</option><option value="obround">Obround</option></select>
          <label className="k-check"><input type="checkbox" checked={p.useReliefRatio !== false} onChange={(e) => setP({ ...p, useReliefRatio: e.target.checked })} /> Use relief ratio</label>
          {p.useReliefRatio !== false
            ? <div className="k-pm-valuerow k-tip" data-tip="Relief ratio"><span className="k-muted" style={{ minWidth: 18 }}>%</span><NumberField value={p.reliefRatio ?? 0.5} onChange={(v) => setP({ ...p, reliefRatio: Math.max(0.05, Math.min(2, v)) })} step={0.05} /></div>
            : <div className="k-pm-valuerow k-tip" data-tip="Relief width"><Icon.Dimension size={14} /><NumberField value={p.reliefWidth ?? p.thickness} onChange={(v) => setP({ ...p, reliefWidth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>}
      </Section>
    </>
  );
}

/**
 * Hole Tool ▸ Type: the sub type sets the sizes as its standard does (drill sizes and dowel holes at the nominal size,
 * screw clearances at the chosen fit, tap drills at the tap drill size; counterbore / countersink heads per screw).
 */
function holeSubtypePatch(t: string, sz: (typeof HOLE_SIZES)[number] | undefined, fit: 'Close' | 'Normal' | 'Loose', d: HoleFeature): Partial<HoleFeature> {
  const nominal = sz ? Number(sz.size.slice(1)) : d.diameter;
  const base: Partial<HoleFeature> = { holeSubtype: t };
  if (!sz) return base;
  switch (t) {
    case 'Drill sizes': case 'Dowel Holes': return { ...base, diameter: nominal };
    case 'Screw Clearances': return { ...base, diameter: sz.fit[fit] };
    case 'Tap Drills': return { ...base, diameter: sz.tap };
    case 'Bottoming tapped hole': return { ...base, threadDepth: d.depth > 0 ? d.depth : d.threadDepth };
    case 'Tapped hole': return { ...base, threadDepth: d.depth > 0 ? Math.max(nominal * 1.5, d.depth - nominal) : d.threadDepth };
    case 'Flat Head Screw - ISO 10642': case 'Raised Countersunk Head - ISO 2010': return { ...base, csDiameter: Math.round(nominal * 2 * 10) / 10 };
    case 'Countersunk Head - ISO 7046': return { ...base, csDiameter: Math.round(nominal * 1.85 * 10) / 10 };
    case 'Socket Head Cap Screw - ISO 4762': return { ...base, cbDiameter: sz.cb, cbDepth: sz.cbDepth };
    case 'Hex Bolt - ISO 4014': case 'Hex Screw - ISO 4017': return { ...base, cbDiameter: Math.round(nominal * 2.2 * 10) / 10, cbDepth: Math.round(nominal * 0.75 * 10) / 10 };
    case 'Pan Cross Head - ISO 7045': return { ...base, cbDiameter: Math.round(nominal * 2.1 * 10) / 10, cbDepth: Math.round(nominal * 0.7 * 10) / 10 };
    default: return base;
  }
}

const HOLE_SIZES: { size: string; fit: { Close: number; Normal: number; Loose: number }; cb: number; cbDepth: number; cs: number; tap: number; pitch: number }[] = [
  { size: 'M3', fit: { Close: 3.2, Normal: 3.4, Loose: 3.6 }, cb: 6.5, cbDepth: 3.4, cs: 6.3, tap: 2.5, pitch: 0.5 },
  { size: 'M4', fit: { Close: 4.3, Normal: 4.5, Loose: 4.8 }, cb: 8, cbDepth: 4.6, cs: 8.4, tap: 3.3, pitch: 0.7 },
  { size: 'M5', fit: { Close: 5.3, Normal: 5.5, Loose: 5.8 }, cb: 10, cbDepth: 5.7, cs: 10.4, tap: 4.2, pitch: 0.8 },
  { size: 'M6', fit: { Close: 6.4, Normal: 6.6, Loose: 7 }, cb: 11, cbDepth: 6.8, cs: 12.6, tap: 5, pitch: 1 },
  { size: 'M8', fit: { Close: 8.4, Normal: 9, Loose: 10 }, cb: 15, cbDepth: 9, cs: 17.3, tap: 6.8, pitch: 1.25 },
  { size: 'M10', fit: { Close: 10.5, Normal: 11, Loose: 12 }, cb: 18, cbDepth: 11, cs: 20, tap: 8.5, pitch: 1.5 },
  { size: 'M12', fit: { Close: 13, Normal: 13.5, Loose: 14.5 }, cb: 20, cbDepth: 13, cs: 24.4, tap: 10.2, pitch: 1.75 },
  { size: 'M16', fit: { Close: 17, Normal: 17.5, Loose: 18.5 }, cb: 26, cbDepth: 17.5, cs: 32.4, tap: 14, pitch: 2 },
  { size: 'M20', fit: { Close: 21, Normal: 22, Loose: 24 }, cb: 33, cbDepth: 21.5, cs: 40.4, tap: 17.5, pitch: 2.5 },
];

/** Hole Tool ▸ Standard ANSI Inch: machine screw and fractional sizes (mm) */
const HOLE_SIZES_INCH: typeof HOLE_SIZES = [
  { size: '#4', fit: { Close: 3.0, Normal: 3.3, Loose: 3.6 }, cb: 5.6, cbDepth: 2.9, cs: 5.6, tap: 2.3, pitch: 0.635 },
  { size: '#6', fit: { Close: 3.7, Normal: 3.9, Loose: 4.4 }, cb: 6.7, cbDepth: 3.5, cs: 6.9, tap: 2.7, pitch: 0.794 },
  { size: '#8', fit: { Close: 4.4, Normal: 4.6, Loose: 5.1 }, cb: 7.9, cbDepth: 4.2, cs: 8.4, tap: 3.5, pitch: 0.794 },
  { size: '#10', fit: { Close: 5.0, Normal: 5.3, Loose: 5.8 }, cb: 9.1, cbDepth: 4.8, cs: 9.8, tap: 3.8, pitch: 1.058 },
  { size: '1/4', fit: { Close: 6.5, Normal: 7.1, Loose: 7.9 }, cb: 11.1, cbDepth: 6.4, cs: 12.7, tap: 5.1, pitch: 1.27 },
  { size: '5/16', fit: { Close: 8.3, Normal: 8.7, Loose: 9.5 }, cb: 13.5, cbDepth: 8.0, cs: 15.9, tap: 6.5, pitch: 1.411 },
  { size: '3/8', fit: { Close: 9.9, Normal: 10.3, Loose: 11.1 }, cb: 15.9, cbDepth: 9.5, cs: 19.1, tap: 8.0, pitch: 1.588 },
  { size: '1/2', fit: { Close: 13.1, Normal: 13.9, Loose: 14.7 }, cb: 20.6, cbDepth: 12.7, cs: 25.4, tap: 10.7, pitch: 1.954 },
];
const holeSizesFor = (std: string) => (std === 'ANSI Inch' ? HOLE_SIZES_INCH : HOLE_SIZES);

/** tools whose Property Panel OK applies the edit (Offset, Move/Copy/Rotate/Scale, patterns) */
const APPLY_TOOLS = new Set(['offset', 'moveEntities', 'copyEntities', 'rotateEntities', 'scaleEntities', 'linearSketchPattern', 'circularSketchPattern']);

const TOOL_TITLE: Record<string, string> = {
  select: 'Sketch',
  line: 'Insert Line',
  centerline: 'Insert Line',
  rectangle: 'Rectangle',
  centerRectangle: 'Rectangle',
  partialEllipse: 'Ellipse',
  parabola: 'Parabola',
  conic: 'Conic',
  styleSpline: 'Style Spline',
  equationCurve: 'Equation Driven Curve',
  fullyDefine: 'Fully Define Sketch',
  rect3Corner: 'Rectangle',
  rect3Center: 'Rectangle',
  parallelogram: 'Rectangle',
  midpointLine: 'Insert Line',
  circle: 'Circle',
  arc3: 'Arc',
  arcCenter: 'Arc',
  polygon: 'Polygon',
  slot: 'Slot',
  centerSlot: 'Slot',
  sketchFillet: 'Sketch Fillet',
  sketchChamfer: 'Sketch Chamfer',
  extend: 'Extend',
  offset: 'Offset Entities',
  moveEntities: 'Move',
  copyEntities: 'Copy',
  rotateEntities: 'Rotate',
  scaleEntities: 'Scale',
  linearSketchPattern: 'Linear Pattern',
  circularSketchPattern: 'Circular Pattern',
  spline: 'Spline',
  point: 'Point',
  dimension: 'Dimension',
  trim: 'Trim',
};

const HOLE_TYPES: { id: string; label: string; enabled: boolean }[] = [
  { id: 'counterbore', label: 'Counterbore', enabled: true },
  { id: 'countersink', label: 'Countersink', enabled: true },
  { id: 'simple', label: 'Hole', enabled: true },
  { id: 'tap', label: 'Straight Tap', enabled: true },
  { id: 'taperedTap', label: 'Tapered Tap', enabled: false },
  { id: 'legacy', label: 'Legacy Hole', enabled: false },
  { id: 'cboreSlot', label: 'Counterbore Slot', enabled: false },
  { id: 'csinkSlot', label: 'Countersink Slot', enabled: false },
  { id: 'slot', label: 'Slot', enabled: false },
];

/** Hole Type buttons: a section through the hole (material grey-blue, the hole white) */
function HoleTypeIcon({ kind }: { kind: string }) {
  const body = '#7aa2c8', edge = '#2f5f8f';
  const slot = kind.endsWith('Slot') || kind === 'slot';
  const profile: Record<string, string> = {
    counterbore: 'M9 3h10v6h-3v16h-4V9H9z',
    countersink: 'M8 3h12l-4 6v16h-4V9z',
    simple: 'M12 3h4v22h-4z',
    straightTap: 'M12 3h4v22h-4z',
    taperedTap: 'M11.5 3h5l-1 22h-3z',
    legacy: 'M12 3h4v18l-2 4-2-4z',
    cboreSlot: 'M7 3h14v6h-4v16h-6V9H7z',
    csinkSlot: 'M6 3h16l-5 6v16h-6V9z',
    slot: 'M11 3h6v22h-6z',
  };
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden>
      <rect x="2" y="3" width="24" height="22" fill={body} stroke={edge} strokeWidth="0.8" />
      <path d={profile[kind] ?? profile.simple} fill="#fff" stroke={edge} strokeWidth="0.8" />
      {(kind === 'straightTap' || kind === 'taperedTap') && [7, 11, 15, 19].map((y) => <line key={y} x1="11" y1={y} x2="17" y2={y + 1.5} stroke={edge} strokeWidth="0.7" />)}
      {slot && <path d="M4 1.5h20" stroke={edge} strokeWidth="1.2" strokeDasharray="2 1.5" />}
    </svg>
  );
}

const TOOL_HELP: Record<string, string> = {
  tangentArc: 'Tangent Arc: click the end point of a line or arc, then the end of the arc.',
  perimeterCircle: 'Perimeter Circle: click three points on the circle.',
  centerArcSlot: 'Centerpoint Arc Slot: click the centre, the start and the end of the centre arc, then the width.',
  hdim: 'Horizontal Dimension: select two points or a line; the dimension is the horizontal distance.',
  vdim: 'Vertical Dimension: select two points or a line; the dimension is the vertical distance.',
  arcSlot: '3 Point Arc Slot: click the start and the end of the centre arc, a point on the arc, then the width.',
  ellipse: 'Click the centre, then the end of the major axis, then a point that sets the minor axis.',
  partialEllipse: 'Click the centre, the end of the major axis, the start point (sets the minor axis), then the end point.',
  parabola: 'Click the focus, then the apex, then the start and the end along the parabola.',
  conic: 'Click the start and the end point, then the top vertex, then move to set rho and click.',
  styleSpline: 'Click the control points of the curve; double-click or Esc to finish. The curve passes through the first and last point.',
  text: 'Type the text, set the font height, then click in the graphics area to place the lower left corner of the text.',
  select: 'Select entities. Drag blue (under defined) entities to explore the sketch. Ctrl for multiple selection. Box select left→right = inside, right→left = crossing.',
  line: 'Click to start and end a line, or drag. Lines chain automatically; double-click or Esc ends the chain. Horizontal/Vertical and Coincident relations are inferred.',
  centerline: 'Construction line: click or drag the start and end point. Use it as mirror or symmetry axis.',
  rectangle: 'Click or drag two opposite corners.',
  centerRectangle: 'Click or drag the center and a corner.',
  rect3Corner: 'Click the two ends of the first side, then a point that sets the width.',
  rect3Center: 'Click the center, the midpoint of one side, then a point that sets the width.',
  parallelogram: 'Click three corners.',
  midpointLine: 'Click the midpoint of the line, then one end.',
  circle: 'Click or drag the center and a point on the circle.',
  arc3: 'Click the start point, the end point and a point on the arc.',
  arcCenter: 'Click the center, the start point and the end point.',
  polygon: 'Click or drag the center and a vertex. Set the number of sides below.',
  slot: 'Click the start and the end of the centerline, then a point for the width.',
  trim: 'Click the part of an entity to trim away; it is trimmed to the closest crossings.',
  sketchFillet: 'Select two lines that meet at a corner (or cross) to round the corner.',
  sketchChamfer: 'Select two lines that meet at a corner (or cross) to chamfer the corner.',
  extend: 'Click the end of a line to extend it to the next entity.',
  offset: 'Select the entities (chains follow automatically), set the distance and click OK.',
  moveEntities: 'Select the entities, set the X/Y step and click OK.',
  copyEntities: 'Select the entities, set the X/Y step for the copy and click OK.',
  rotateEntities: 'Select the entities, set the center and the angle and click OK.',
  scaleEntities: 'Select the entities, set the center and the scale factor and click OK.',
  linearSketchPattern: 'Select the entities to pattern, set the spacing and number of instances and click OK.',
  circularSketchPattern: 'Select the entities to pattern, set the center, angle and number of instances and click OK.',
  centerSlot: 'Click the center and one end of the centerline, then a point for the width.',
  spline: 'Click through points; double-click or Esc finishes.',
  point: 'Click to place a point.',
  dimension: 'Select a line (length), circle (diameter), arc (radius), two points (distance), point + line (distance) or two lines (angle). Click to place the dimension; the Modify box appears.',
};

/** Property Panel header by design: icon + title + help, then a row with OK / Cancel. */
/** the eye of a feature Property Panel: Detailed Preview shows the model with the feature applied */
function DetailedPreviewButton() {
  const on = useStore((s) => s.detailedPreview);
  const toggle = useStore((s) => s.toggleDetailedPreview);
  return (
    <button className={`k-pm-eye k-tip ${on ? 'active' : ''}`} data-tip="Detailed Preview" onClick={toggle}>
      <Icon.Eye />
    </button>
  );
}

/**
 * Selected Contours of the intended design: a selection box listing the picked regions (Sketch1-Region<1> …); while it is
 * active, a click on a region of the profile in the graphics area adds or removes it (shown magenta). Empty = all.
 */
function SelectedContoursBox({ sketchName, contours }: { sketchName: string; contours?: number[] }) {
  const st = useStore(useShallow((s) => ({ contourPick: s.contourPick, setContourPick: s.setContourPick })));
  const active = st.contourPick;
  return (
    <div className="k-pm-selrow">
      <Icon.Sketch size={18} />
      <ul className={`k-list k-pm-edgelist k-pm-selbox${active ? ' active' : ''}`} data-testid="contour-box" onClick={() => st.setContourPick(true)}>
        {(contours ?? []).map((i, k) => <li key={i} className={k === (contours ?? []).length - 1 && active ? 'sel' : ''}>{sketchName}-Region&lt;{i + 1}&gt;</li>)}
      </ul>
    </div>
  );
}

/** Keep Visible: the pushpin of the Fillet / Chamfer Property Panel, by design */
function KeepVisibleButton() {
  const on = useStore((s) => s.pmPinned);
  const toggle = useStore((s) => s.togglePmPinned);
  return (
    <button className={`k-pm-eye k-tip ${on ? 'active' : ''}`} data-tip="Keep Visible" data-testid="pm-pin" onClick={toggle}>
      <Icon.Pin style={{ transform: on ? 'none' : 'rotate(45deg)' }} />
    </button>
  );
}

function Header({ title, icon, onOk, onCancel, okTip = 'OK', cancelTip = 'Cancel', okIcon }: { title: string; icon: ReactNode; onOk?: () => void; onCancel?: () => void; okTip?: string; cancelTip?: string; okIcon?: ReactNode }) {
  return (
    <div className="k-pm-head">
      <div className="k-pm-title">
        {icon} <b>{title}</b>
        <span className="grow" />
        <span className="k-pm-help" title="Help">?</span>
      </div>
      <div className="k-pm-buttons">
        {onOk && (
          <button className="k-pm-ok k-tip" data-tip={okTip} onClick={onOk}>
            {okIcon ?? <Icon.Check />}
          </button>
        )}
        {onCancel && (
          <button className="k-pm-cancel k-tip" data-tip={cancelTip} onClick={onCancel}>
            <Icon.Close />
          </button>
        )}
        {useStore.getState().featureEdit && (isRoundFeature(useStore.getState().featureEdit!.draft) ? <KeepVisibleButton /> : <DetailedPreviewButton />)}
      </div>
    </div>
  );
}

/** Property Panel body: replaces the tree while a command/selection is active. */
/** Polygon parameters of the intended design, greyed until a polygon is drawn */
const POLY_FIELDS: [string, string][] = [['X coordinate of center', 'Cx'], ['Y coordinate of center', 'Cy'], ['Circle diameter', '⌀'], ['Angle', '∠']];

/** dimension Favorites (Dimension Property Panel > Style), kept as JSON text in the preferences */
function dimFavs(): Record<string, Partial<Constraint>> {
  try { return JSON.parse(String(getPref('sketch.dimFavorites') ?? '{}')) ?? {}; } catch { return {}; }
}
function saveDimFavs(f: Record<string, unknown>): void {
  savePrefs({ ...loadPrefs(), 'sketch.dimFavorites': JSON.stringify(f) });
}

export function PropertyPanelBody({ editDimensionId, onEditDone }: { editDimensionId: string | null; onEditDone: () => void }) {
  const st = useStore(useShallow((s) => ({ selectedConstraint: s.selectedConstraint, featureEdit: s.featureEdit, rebuild: s.rebuild, commitFeature: s.commitFeature, cancelFeature: s.cancelFeature, updateFeatureDraft: s.updateFeatureDraft, doc: s.doc, detailedPreview: s.detailedPreview, toggleDetailedPreview: s.toggleDetailedPreview, shellPick: s.shellPick, sheetMetalEdit: s.sheetMetalEdit, setSheetMetal: s.setSheetMetal, setSheetMetalEdit: s.setSheetMetalEdit, pushMessage: s.pushMessage, setAnalysis: s.setAnalysis, setDraftFocus: s.setDraftFocus, draftFocus: s.draftFocus, flangePick: s.flangePick, threadFacePick: s.threadFacePick, selectedFace: s.selectedFace, trimFocus: s.trimFocus, setTrimFocus: s.setTrimFocus, mirrorPick: s.mirrorPick, togglePatternSkip: s.togglePatternSkip, collectAllCorners: s.collectAllCorners, startRound: s.startRound, selectedFaces: s.selectedFaces, fullRoundPick: s.fullRoundPick, selectionToolbar: s.selectionToolbar, show: s.show, toggleShow: s.toggleShow, editSketch: s.editSketch, dir2Pick: s.dir2Pick, planePick: s.planePick, cancelPlanePick: s.cancelPlanePick, renameDocument: s.renameDocument, unitSystem: s.unitSystem, setUnitSystem: s.setUnitSystem, newSketch: s.newSketch, selection: s.selection, updateDimension: s.updateDimension, tool: s.tool, exitSketch: s.exitSketch, addEquationCurve: s.addEquationCurve, setTool: s.setTool, fullyDefine: s.fullyDefine, applySketchTool: s.applySketchTool, discardSketch: s.discardSketch, setAsk: s.setAsk, renameDimension: s.renameDimension, modify: s.modify, removeRelation: s.removeRelation, selectConstraint: s.selectConstraint, addRelation: s.addRelation, commit: s.commit, toggleConstructionSelection: s.toggleConstructionSelection, deleteSelection: s.deleteSelection, addPierce: s.addPierce, sketchTool: s.sketchTool, setSketchTool: s.setSketchTool })));
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  const [value, setValue] = useState(0);
  const [sides, setSides] = useState(6);
  // Polygon > Inscribed circle (default of the intended design) / Circumscribed circle
  const [polyInscribed, setPolyInscribed] = useState(true);
  useEffect(() => {
    bridge.sketchOptions.polygonInscribed = polyInscribed;
  }, [polyInscribed]);
  // Equation Driven Curve and Fully Define Sketch options
  const [eqc, setEqc] = useState({ expr: '10*sin(x/10)', x1: 0, x2: 60, param: false, xt: '20*cos(t)', yt: '20*sin(t)' });
  const [fdef, setFdef] = useState<{ relations: boolean; dimensions: boolean; selected: boolean; hScheme: 'baseline' | 'chain' | 'ordinate'; vScheme: 'baseline' | 'chain' | 'ordinate' }>({ relations: true, dimensions: true, selected: false, hScheme: 'baseline', vScheme: 'baseline' });
  const [multiT, setMultiT0] = useState(2);
  const setMultiT = (v: number) => { setMultiT0(Math.max(0.01, v)); useStore.setState({ shellMultiThickness: Math.max(0.01, v) }); };
  const [threadFavs, setThreadFavs] = useState<Record<string, Partial<ThreadFeature>>>(() => { try { return JSON.parse(String(getPref('thread.favorites') || '{}')); } catch { return {}; } });
  // Rectangle ▸ Add construction lines (the option reaches the sketch tool through the viewport bridge, as the polygon sides do)
  const [rectCons, setRectCons] = useState<{ on: boolean; mode: 'corners' | 'midpoints' }>({ on: false, mode: 'corners' });
  useEffect(() => {
    bridge.sketchOptions.rectConstruction = rectCons;
  }, [rectCons]);
  useEffect(() => {
    bridge.sketchOptions.polygonSides = sides;
  }, [sides]);
  // Sketch Text Property Panel (Text, Font: height, bold; width factor, spacing, rotation)
  const [sketchText, setSketchText] = useState({ text: 'PHLIPPO', height: 10, bold: false, widthFactor: 100, spacing: 100, angle: 0 });
  useEffect(() => {
    bridge.sketchOptions.textOptions = sketchText;
  }, [sketchText]);
  // Hole Tool: standard sizes (ISO 273 clearance holes) with the default counterbore / countersink of the intended design
  const [holeStd, setHoleStd] = useState('ISO');
  const [holeSize, setHoleSize] = useState('M6');
  const [holeFit, setHoleFit] = useState<'Close' | 'Normal' | 'Loose'>('Normal');
  const [filletXpert, setFilletXpert] = useState(false);
  const [autoFixDraft, setAutoFixDraft] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [dimTab, setDimTab] = useState<'value' | 'leaders' | 'other'>('value');
  const [dimFav, setDimFav] = useState('');
  const [customSizing, setCustomSizing] = useState(false);
  const [holeTab, setHoleTab] = useState<'type' | 'positions'>('type');
  const selected = st.selectedConstraint ?? editDimensionId;
  const c: Constraint | null = sketch && selected ? sketch.constraints[selected] ?? null : null;

  // the edited value belongs to one dimension; a newly selected dimension shows its own value at once
  const [valueOf, setValueOf] = useState<string | null>(null);
  useEffect(() => {
    if (c?.value !== undefined) { setValue(c.value); setValueOf(c.id); }
  }, [c?.id, c?.value]);

  if (st.featureEdit && st.featureEdit.draft.type === 'shell') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Shell" icon={<Icon.Shell />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Parameters">
          <div className="k-pm-valuerow">
            <Icon.Dimension size={14} />
            <NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} autoFocus />
          </div>
          <p className="k-muted" style={{ margin: '4px 0' }}>Faces to remove</p>
          {d.faces.length === 0 ? (
            <p className="k-pm-message">Select the faces to remove on the model (Ctrl for more than one). None selected: closed hollow body.</p>
          ) : (
            <ul className="k-list k-pm-edgelist">
              {d.faces.map((_, i) => <li key={i}>Face&lt;{i + 1}&gt;</li>)}
            </ul>
          )}
          <label className="k-check"><input type="checkbox" data-testid="shell-outward" checked={!!d.outward} onChange={(e) => st.updateFeatureDraft({ outward: e.target.checked })} /> Shell outward</label>
          <label className="k-check"><input type="checkbox" data-testid="shell-preview" checked={!!d.preview} onChange={(e) => { st.updateFeatureDraft({ preview: e.target.checked }); if (e.target.checked !== st.detailedPreview) st.toggleDetailedPreview(); }} /> Show preview</label>
        </Section>
        <Section title="Multi-thickness Settings" defaultOpen={!!d.multi?.length}>
          <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={multiT} onChange={setMultiT} unit={st.doc.units} step={0.5} min={0.01} /></div>
          <div className={`k-selbox${st.shellPick === 'multi' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 40, borderColor: '#d8a6d8' }} data-testid="shell-multi" onClick={() => useStore.setState({ shellPick: st.shellPick === 'multi' ? null : 'multi' })} title="Multi-thickness Faces: pick faces that get the thickness above">
            {d.multi?.length ? d.multi.map((m, i) => <div key={i} className="k-selbox-row">Face&lt;{d.faces.length + i + 1}&gt; ({m.thickness}{st.doc.units})<button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ multi: d.multi!.filter((_, j) => j !== i) }); }}>×</button></div>) : <span className="k-muted">Multi-thickness Faces</span>}
          </div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'helix') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const hsk = st.doc.sketches[d.sketchId];
    const hasCircle = !!hsk && hsk.entityOrder.some((id) => hsk.entities[id].kind === 'circle');
    return (
      <>
        <Header title={d.name} icon={<Icon.Spline />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {!hasCircle && (
          <Section title="Message">
            <p className="k-pm-message">Select a sketch that contains a circle: the helix starts on it, the axis is the sketch normal.</p>
          </Section>
        )}
        <Section title="Defined By">
          <select className="k-input" value={d.definedBy} onChange={(e) => st.updateFeatureDraft({ definedBy: e.target.value as 'pitchRevolution' })}>
            <option value="pitchRevolution">Pitch and Revolution</option>
            <option value="heightRevolution">Height and Revolution</option>
            <option value="heightPitch">Height and Pitch</option>
          </select>
        </Section>
        <Section title="Parameters">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="helixpitch" checked={!d.variable} onChange={() => st.updateFeatureDraft({ variable: undefined })} /> Constant pitch</label>
            <label className="k-check"><input type="radio" name="helixpitch" data-testid="helix-variable" checked={!!d.variable} onChange={() => { const sk2 = st.doc.sketches[d.sketchId]; const ci = sk2 && sk2.entityOrder.map((id) => sk2.entities[id]).find((e) => e.kind === 'circle') as { r: string } | undefined; const dia = ci ? 2 * sk2!.scalars[ci.r] : 20; st.updateFeatureDraft({ variable: [{ rev: 0, pitch: d.pitch, diameter: dia }, { rev: d.revolutions, pitch: d.pitch * 2, diameter: dia }] }); }} /> Variable pitch</label>
          </div>
          {d.variable && (
            <table className="k-pm-table" data-testid="helix-regions">
              <thead><tr><th>P</th><th>Rev</th><th>Dia</th><th /></tr></thead>
              <tbody>
                {d.variable.map((r, i) => (
                  <tr key={i}>
                    <td><NumberField value={r.pitch} onChange={(v) => st.updateFeatureDraft({ variable: d.variable!.map((q, j) => (j === i ? { ...q, pitch: Math.max(0.01, v) } : q)) })} step={1} /></td>
                    <td><NumberField value={r.rev} onChange={(v) => st.updateFeatureDraft({ variable: d.variable!.map((q, j) => (j === i ? { ...q, rev: Math.max(0, v) } : q)) })} step={0.5} /></td>
                    <td><NumberField value={r.diameter} onChange={(v) => st.updateFeatureDraft({ variable: d.variable!.map((q, j) => (j === i ? { ...q, diameter: Math.max(0.01, v) } : q)) })} step={1} /></td>
                    <td>{d.variable!.length > 2 && <button className="k-btn ghost icon" onClick={() => st.updateFeatureDraft({ variable: d.variable!.filter((_, j) => j !== i) })}><Icon.Trash size={12} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {d.variable && <Button onClick={() => { const last = d.variable![d.variable!.length - 1]; st.updateFeatureDraft({ variable: [...d.variable!, { ...last, rev: last.rev + 1 }] }); }}>Add region</Button>}
          {d.definedBy !== 'pitchRevolution' && (
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>H</span><NumberField value={d.height} onChange={(v) => st.updateFeatureDraft({ height: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
          )}
          {d.definedBy !== 'heightRevolution' && (
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>P</span><NumberField value={d.pitch} onChange={(v) => st.updateFeatureDraft({ pitch: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          )}
          <label className="k-check"><input type="checkbox" checked={d.reverse} onChange={(e) => st.updateFeatureDraft({ reverse: e.target.checked })} /> Reverse direction</label>
          {d.definedBy !== 'heightPitch' && (
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={d.revolutions} onChange={(v) => st.updateFeatureDraft({ revolutions: Math.max(0.01, v) })} step={0.5} min={0.01} /></div>
          )}
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.startAngle} onChange={(v) => st.updateFeatureDraft({ startAngle: v })} unit="°" step={15} /></div>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="helixdir" checked={d.clockwise} onChange={() => st.updateFeatureDraft({ clockwise: true })} /> Clockwise</label>
            <label className="k-check"><input type="radio" name="helixdir" checked={!d.clockwise} onChange={() => st.updateFeatureDraft({ clockwise: false })} /> Counterclockwise</label>
          </div>
        </Section>
        <Section title="Taper Helix" defaultOpen={!!d.taper} check={!!d.taper} onCheck={(on) => st.updateFeatureDraft({ taper: on ? { angle: 5, outward: false } : undefined })}>
          {d.taper && (
            <>
              <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.taper.angle} onChange={(v) => st.updateFeatureDraft({ taper: { ...d.taper!, angle: Math.max(0, Math.min(80, v)) } })} unit="°" step={1} /></div>
              <label className="k-check"><input type="checkbox" checked={d.taper.outward} onChange={(e) => st.updateFeatureDraft({ taper: { ...d.taper!, outward: e.target.checked } })} /> Taper outward</label>
            </>
          )}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.sheetMetalEdit) {
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    return <SheetMetalPM params={sm} onOk={(p) => st.setSheetMetal(p)} onCancel={() => st.setSheetMetalEdit(false)} />;
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'baseFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const bsk = st.doc.sketches[d.sketchId];
    return (
      <>
        <Header title={d.name} icon={<Icon.Sheet />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {!bsk && (
          <Section title="Message">
            <p className="k-pm-message">Select a sketch in the Feature Tree: an open profile bends into a sheet, a closed contour becomes a tab.</p>
          </Section>
        )}
        {bsk && (() => {
          // Profile Sketch check, by design: one open chain (a bent sheet) or closed contours only (a tab)
          const chains = sketchChains(bsk);
          const open = chains.filter((c) => !c.closed), closed = chains.filter((c) => c.closed);
          const valid = (open.length === 1 && closed.length === 0) || (open.length === 0 && closed.length > 0);
          const why = !chains.length ? 'The sketch has no lines or arcs.' : open.length > 1 ? 'The sketch has more than one open contour.' : open.length === 1 && closed.length ? 'The sketch mixes an open contour with closed contours.' : '';
          return (
            <Section title="Profile Sketch">
              <p className="k-pm-message" data-testid="bf-sketchcheck" style={valid ? undefined : { background: '#ffe3e3', borderColor: '#e0a0a0' }}>{valid ? 'The sketch is valid.' : `The sketch is not valid. ${why} Use a single open profile (sheet) or closed contours (tab).`}</p>
            </Section>
          );
        })()}
        <Section title="Sheet Metal Parameters From Material" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" data-testid="bf-material" checked={!!sm.useMaterial} onChange={(e) => { const k = materialKFactor(st.doc.material?.name); if (e.target.checked && k === null) { st.pushMessage('The part has no material with sheet metal parameters (choose a steel, aluminium or copper material).', 'warn'); return; } st.setSheetMetal({ ...sm, useMaterial: e.target.checked, ...(e.target.checked && k !== null ? { kFactor: k, allowanceType: 'kFactor' } : {}) }); }} /> Use material sheet metal parameters</label>
        </Section>
        <Section title="Direction 1">
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.flipDir ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ flipDir: !d.flipDir })}><Icon.ReverseDir size={16} /></button>
            <select className="k-input" value={d.midPlane ? 'midPlane' : 'blind'} onChange={(e) => st.updateFeatureDraft({ midPlane: e.target.value === 'midPlane' })}>
              <option value="blind">Blind</option>
              <option value="midPlane">Mid Plane</option>
            </select>
          </div>
          <div className="k-pm-valuerow">
            <Icon.Dimension size={14} />
            <NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
          </div>
        </Section>
        <Section title="Sheet Metal Gauges" defaultOpen={!!sm.gauge}>
        <label className="k-check"><input type="checkbox" data-testid="bf-gauge" checked={!!sm.gauge} onChange={(e) => st.setSheetMetal({ ...sm, gauge: e.target.checked ? { table: 'Sample Table - Steel', gauge: 'Gauge 14' } : undefined, ...(e.target.checked ? { thickness: 1.897, bendRadius: 1.9 } : {}) })} /> Use gauge table</label>
        {sm.gauge && (
          <>
            <select className="k-input" value={sm.gauge.table} onChange={(e) => { const g = GAUGE_TABLES[e.target.value][0]; st.setSheetMetal({ ...sm, gauge: { table: e.target.value, gauge: g.gauge }, thickness: g.thickness, bendRadius: g.radius }); }}>{Object.keys(GAUGE_TABLES).map((t) => <option key={t}>{t}</option>)}</select>
            <select className="k-input" style={{ marginTop: 4 }} value={sm.gauge.gauge} onChange={(e) => { const g = GAUGE_TABLES[sm.gauge!.table].find((x) => x.gauge === e.target.value)!; st.setSheetMetal({ ...sm, gauge: { ...sm.gauge!, gauge: g.gauge }, thickness: g.thickness, bendRadius: g.radius }); }}>{GAUGE_TABLES[sm.gauge.table].map((g) => <option key={g.gauge}>{g.gauge}</option>)}</select>
          </>
        )}
        </Section>
        <Section title="Sheet Metal Parameters">
          <div className="k-pm-valuerow">
            <span className="k-muted" style={{ minWidth: 18 }}>T1</span>
            <NumberField value={sm.thickness} onChange={(v) => st.setSheetMetal({ ...sm, thickness: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} />
          </div>
          <label className="k-check"><input type="checkbox" checked={d.reverse} onChange={(e) => st.updateFeatureDraft({ reverse: e.target.checked })} /> Reverse direction</label>
          <div className="k-pm-valuerow">
            <Icon.Arc size={14} />
            <NumberField value={sm.bendRadius} onChange={(v) => st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} />
          </div>
        </Section>
        <Section title="Bend Allowance">
          <select className="k-input" data-testid="bf-allowance" value={sm.allowanceType ?? 'kFactor'} onChange={(e) => st.setSheetMetal({ ...sm, allowanceType: e.target.value as 'kFactor', allowanceValue: sm.allowanceValue ?? (e.target.value === 'bendAllowance' ? 5 : e.target.value === 'bendDeduction' ? 4 : undefined) })}>
            <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option><option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
          </select>
          {(sm.allowanceType ?? 'kFactor') === 'kFactor' && <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
            <span className="k-muted" style={{ minWidth: 18 }}>K</span>
            <NumberField value={sm.kFactor} onChange={(v) => st.setSheetMetal({ ...sm, kFactor: Math.max(0, Math.min(1, v)) })} step={0.05} min={0} />
          </div>}
          {(sm.allowanceType === 'bendAllowance' || sm.allowanceType === 'bendDeduction') && <div className="k-pm-valuerow" style={{ marginTop: 4 }}><span className="k-muted" style={{ minWidth: 18 }}>{sm.allowanceType === 'bendAllowance' ? 'BA' : 'BD'}</span><NumberField value={sm.allowanceValue ?? 0} onChange={(v) => st.setSheetMetal({ ...sm, allowanceValue: Math.max(0, v) })} unit={st.doc.units} step={0.1} /></div>}
        </Section>
        <Section title="Auto Relief" defaultOpen={false}>
          <select className="k-input" data-testid="bf-relief" value={sm.reliefType ?? 'rectangle'} onChange={(e) => st.setSheetMetal({ ...sm, reliefType: e.target.value as 'rectangle' })}><option value="rectangle">Rectangle</option><option value="tear">Tear</option><option value="obround">Obround</option></select>
          <label className="k-check"><input type="checkbox" checked={sm.useReliefRatio !== false} onChange={(e) => st.setSheetMetal({ ...sm, useReliefRatio: e.target.checked })} /> Use relief ratio</label>
          {sm.useReliefRatio !== false
            ? <div className="k-pm-valuerow k-tip" data-tip="Relief ratio"><span className="k-muted" style={{ minWidth: 18 }}>%</span><NumberField value={sm.reliefRatio ?? 0.5} onChange={(v) => st.setSheetMetal({ ...sm, reliefRatio: Math.max(0.05, Math.min(2, v)) })} step={0.05} /></div>
            : <div className="k-pm-valuerow k-tip" data-tip="Relief width"><Icon.Dimension size={14} /><NumberField value={sm.reliefWidth ?? sm.thickness} onChange={(v) => st.setSheetMetal({ ...sm, reliefWidth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'miterFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const sketches = st.doc.features.filter((f): f is import('../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title={d.name} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Miter Parameters">
          <div className="k-field"><label>Profile</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="miter-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="miter-edges">
            {d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the edges of the sheet in the graphics area.</span>}
          </div>
          <label className="k-check"><input type="checkbox" checked={d.radius === undefined} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow"><Icon.Arc size={14} /><NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => d.radius === undefined ? st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) }) : st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction (material side)" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Arrow size={14} /></button>
          </div>
          <div className="k-field"><label>Rip gap</label><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.05} min={0} /></div>
        </Section>
        <Section title="Start/End Offset" defaultOpen={(d.startOffset ?? 0) + (d.endOffset ?? 0) > 0}>
          <div className="k-pm-valuerow k-tip" data-tip="Start offset distance"><span className="k-pm-xy">⇤</span><NumberField value={d.startOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ startOffset: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="End offset distance"><span className="k-pm-xy">⇥</span><NumberField value={d.endOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ endOffset: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'surface') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f): f is import('../../core/document/types').SketchFeature => f.type === 'sketch');
    const surfaceFeatures = st.doc.features.filter((f) => f.type === 'surface' && f.id !== d.id && f.kind !== 'knit');
    const sketchPick = (
      <div className="k-field"><label>Sketch</label>
        <select className="k-input" value={d.sketchId ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="surface-sketch">
          <option value="">—</option>
          {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
        </select>
      </div>
    );
    return (
      <>
        <Header title={d.name.replace(/\d+$/, '')} icon={d.kind === 'revolve' ? <Icon.Revolve /> : d.kind === 'offset' ? <Icon.Offset /> : d.kind === 'knit' ? <Icon.Mirror /> : d.kind === 'thicken' || d.kind === 'replaceFace' ? <Icon.Shell /> : d.kind === 'thickenCut' ? <Icon.Cut /> : d.kind === 'cutWithSurface' ? <Icon.Section /> : d.kind === 'filled' || d.kind === 'untrim' || d.kind === 'deleteHole' ? <Icon.Boundary /> : d.kind === 'ruled' ? <Icon.Curves /> : d.kind === 'flatten' ? <Icon.Sheet /> : <Icon.Extrude />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {d.kind === 'extrude' && (
          <>
            <Section title="From">{sketchPick}</Section>
            <Section title="Direction 1">
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
                <select className="k-input" value={d.midPlane ? 'mid' : 'blind'} onChange={(e) => st.updateFeatureDraft({ midPlane: e.target.value === 'mid' })}><option value="blind">Blind</option><option value="mid">Mid Plane</option></select>
              </div>
              <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.depth ?? 10} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
            </Section>
          </>
        )}
        {d.kind === 'revolve' && (
          <>
            <Section title="Axis of Revolution">{sketchPick}<div className="k-muted">The centerline of the sketch is the axis.</div></Section>
            <Section title="Direction1">
              <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle ?? 360} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(360, v)) })} unit="°" step={15} /></div>
            </Section>
          </>
        )}
        {d.kind === 'planar' && <Section title="Bounding Entities">{sketchPick}</Section>}
        {(d.kind === 'filled' || d.kind === 'extend' || d.kind === 'untrim' || d.kind === 'deleteHole' || d.kind === 'flatten' || d.kind === 'thicken' || d.kind === 'thickenCut' || d.kind === 'cutWithSurface' || d.kind === 'replaceFace') && (
          <Section title={d.kind === 'filled' ? 'Patch Boundary' : d.kind === 'replaceFace' ? 'Replacement Surface' : d.kind === 'thicken' || d.kind === 'thickenCut' ? 'Thicken Parameters' : 'Selections'}>
            <div className="k-field"><label>{d.kind === 'filled' ? 'Surface' : d.kind === 'cutWithSurface' ? 'Surface Cut Parameters' : 'Surface'}</label>
              <select className="k-input" value={d.target ?? ''} onChange={(e) => st.updateFeatureDraft({ target: e.target.value || undefined })} data-testid="surftool-target">
                <option value="">—</option>
                {surfaceFeatures.filter((f) => f.type === 'surface').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {d.kind === 'filled' && (
              <>
                {sketchPick}
                <div className="k-pm-radios" data-testid="fill-which">
                  <label className="k-check"><input type="radio" name="fillwhich" checked={(d.fillWhich ?? 'outer') === 'outer'} onChange={() => st.updateFeatureDraft({ fillWhich: 'outer' })} /> Outer boundary</label>
                  <label className="k-check"><input type="radio" name="fillwhich" checked={d.fillWhich === 'inner'} onChange={() => st.updateFeatureDraft({ fillWhich: 'inner' })} /> Inner loops</label>
                  <label className="k-check"><input type="radio" name="fillwhich" checked={d.fillWhich === 'all'} onChange={() => st.updateFeatureDraft({ fillWhich: 'all' })} /> All boundaries</label>
                </div>
              </>
            )}
            {d.kind === 'extend' && <div className="k-pm-valuerow k-tip" data-tip="Distance"><Icon.Depth size={16} /><NumberField value={d.distance ?? 5} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>}
            {(d.kind === 'thicken' || d.kind === 'thickenCut') && <div className="k-pm-valuerow k-tip" data-tip="Thickness"><Icon.Shell size={16} /><NumberField value={d.thickness ?? 2} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} autoFocus data-testid="thicken-value" /></div>}
            {d.kind === 'thicken' && st.rebuild.bodies.length > 0 && <label className="k-check"><input type="checkbox" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>}
            {d.kind === 'cutWithSurface' && <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Flip cut" data-testid="surfcut-flip" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>}
            {d.kind === 'replaceFace' && (
              <div className="k-pm-selrow"><Icon.Properties size={14} /><div className="k-selbox k-selbox-dir" style={{ minHeight: 40 }} data-testid="replace-faces">{(d.faces ?? []).length ? (d.faces ?? []).map((f) => <div key={f.label} className="k-selbox-row">{f.label}</div>) : <span className="k-muted">Target faces for replacement: select faces in the graphics area.</span>}</div></div>
            )}
            {(d.kind === 'untrim' || d.kind === 'deleteHole') && <p className="k-muted">{d.kind === 'untrim' ? 'The inner loops (holes) of the surface are filled again.' : 'The hole (inner loop) of the surface is closed.'}</p>}
            {d.kind === 'flatten' && <p className="k-muted">The surface is laid flat (rigid unfold, exact for developable surfaces) beside the model.</p>}
          </Section>
        )}
        {(d.kind === 'thickenCut' || d.kind === 'cutWithSurface') && (
          <Section title="Feature Scope" defaultOpen={false}>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="sscope" checked={!d.scope} onChange={() => st.updateFeatureDraft({ scope: undefined })} /> All bodies</label>
              <label className="k-check"><input type="radio" name="sscope" checked={!!d.scope} onChange={() => st.updateFeatureDraft({ scope: st.rebuild.bodies.map((b) => b.id) })} /> Selected bodies</label>
            </div>
            {d.scope && st.rebuild.bodies.map((b, i) => <label key={b.id} className="k-check" style={{ marginLeft: 18 }}><input type="checkbox" checked={d.scope!.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ scope: e.target.checked ? [...d.scope!, b.id] : d.scope!.filter((x) => x !== b.id) })} /> Body{i + 1}</label>)}
          </Section>
        )}
        {d.kind === 'ruled' && (
          <>
            <Section title="Type">
              <div className="k-pm-radios" data-testid="ruled-type">
                <label className="k-check"><input type="radio" name="ruledmode" checked={(d.ruledMode ?? 'tangent') === 'tangent'} onChange={() => st.updateFeatureDraft({ ruledMode: 'tangent' })} /> Tangent to Surface</label>
                <label className="k-check"><input type="radio" name="ruledmode" checked={d.ruledMode === 'normal'} onChange={() => st.updateFeatureDraft({ ruledMode: 'normal' })} /> Normal to Surface</label>
                <label className="k-check"><input type="radio" name="ruledmode" checked={d.ruledMode === 'vector'} onChange={() => st.updateFeatureDraft({ ruledMode: 'vector' })} /> Vector</label>
              </div>
            </Section>
            <Section title="Distance/Direction">
              <div className="k-pm-valuerow k-tip" data-tip="Distance"><Icon.Depth size={16} /><NumberField value={d.distance ?? 5} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
              {d.ruledMode === 'vector' && (
                <div className="k-pm-stylerow">
                  {(['X', 'Y', 'Z'] as const).map((ax, i) => <button key={ax} className={`k-pm-stylebtn ${Math.abs((d.vector ?? [0, 1, 0])[i]) > 0.5 ? 'active' : ''}`} onClick={() => { const v: [number, number, number] = [0, 0, 0]; v[i] = 1; st.updateFeatureDraft({ vector: v }); }}>{ax}</button>)}
                  <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ vector: (d.vector ?? [0, 1, 0]).map((x) => -x) as [number, number, number] })}><Icon.ReverseDir size={16} /></button>
                </div>
              )}
            </Section>
            <Section title="Edge Selection">
              <div className="k-pm-selrow"><Icon.EdgeSelect size={20} /><div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} data-testid="ruled-edge">{d.edge ? <div className="k-selbox-row">Edge&lt;1&gt;</div> : <span className="k-muted">Select an edge of the model.</span>}</div></div>
            </Section>
          </>
        )}
        {d.kind === 'trim' && (
          <>
            <Section title="Trim Type">
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="trimtype" checked={!d.mutual} onChange={() => st.updateFeatureDraft({ mutual: false })} /> Standard</label>
                <label className="k-check"><input type="radio" name="trimtype" data-testid="trim-mutual" checked={!!d.mutual} onChange={() => st.updateFeatureDraft({ mutual: true })} /> Mutual</label>
              </div>
            </Section>
            {d.mutual && (
              <Section title="Selections">
                <div className="k-pm-label">Trimming surfaces:</div>
                <div className="k-selbox" style={{ minHeight: 60 }} data-testid="trim-mutual-surfaces">
                  {surfaceFeatures.filter((f) => f.type === 'surface' && f.kind !== 'trim' && f.kind !== 'knit').map((f) => (
                    <label key={f.id} className="k-check"><input type="checkbox" checked={(d.targets ?? []).includes(f.id)} onChange={(e) => st.updateFeatureDraft({ targets: e.target.checked ? [...(d.targets ?? []), f.id] : (d.targets ?? []).filter((x) => x !== f.id) })} /> {f.name}</label>
                  ))}
                </div>
                <div className="k-pm-radios">
                  <label className="k-check"><input type="radio" name="trimkeepm" checked={!d.flip} onChange={() => st.updateFeatureDraft({ flip: false })} /> Keep selections</label>
                  <label className="k-check"><input type="radio" name="trimkeepm" checked={!!d.flip} onChange={() => st.updateFeatureDraft({ flip: true })} /> Remove selections</label>
                </div>
              </Section>
            )}
            {!d.mutual && <Section title="Selections">
              <div className="k-field"><label>Trim Tool</label>
                <select className="k-input" value={d.trimPlane ?? 'front'} onChange={(e) => st.updateFeatureDraft({ trimPlane: e.target.value })} data-testid="trim-plane">
                  <option value="front">Front Plane</option><option value="top">Top Plane</option><option value="right">Right Plane</option>
                  {Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="k-field"><label>Surface</label>
                <select className="k-input" value={d.target ?? ''} onChange={(e) => st.updateFeatureDraft({ target: e.target.value })} data-testid="trim-target">
                  <option value="">—</option>
                  {surfaceFeatures.filter((f) => f.type === 'surface' && f.kind !== 'trim').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="trimkeep" checked={!d.flip} onChange={() => st.updateFeatureDraft({ flip: false })} /> Keep selections (side of the plane normal)</label>
                <label className="k-check"><input type="radio" name="trimkeep" checked={!!d.flip} onChange={() => st.updateFeatureDraft({ flip: true })} /> Remove selections (other side)</label>
              </div>
            </Section>}
          </>
        )}
        {(d.kind === 'sweep' || d.kind === 'loft' || d.kind === 'boundary') && (
          <Section title={d.kind === 'sweep' ? 'Profile and Path' : 'Profiles'}>
            {sketchPick}
            <div className="k-field"><label>{d.kind === 'sweep' ? 'Path' : 'Profile 2'}</label>
              <select className="k-input" value={d.sketchId2 ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId2: e.target.value })} data-testid="surface-sketch2">
                <option value="">—</option>
                {sketches.filter((s) => s.sketchId !== d.sketchId).map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
              </select>
            </div>
          </Section>
        )}
        {d.kind === 'offset' && (
          <Section title="Offset Parameters">
            <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
              <Icon.Properties size={14} />
              <div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} data-testid="offset-face">{d.face ? <div className="k-selbox-row">{d.face.label}</div> : null}</div>
            </div>
            <div className="k-pm-valuerow">
              <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Flip Offset Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Arrow size={14} /></button>
              <NumberField value={d.distance ?? 5} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus />
            </div>
          </Section>
        )}
        {d.kind === 'knit' && (
          <>
            <Section title="Selections">
              <div className="k-selbox" style={{ minHeight: 60 }} data-testid="knit-surfaces">
                {surfaceFeatures.map((f) => (
                  <label key={f.id} className="k-check"><input type="checkbox" checked={(d.surfaces ?? []).includes(f.id)} onChange={(e) => st.updateFeatureDraft({ surfaces: e.target.checked ? [...(d.surfaces ?? []), f.id] : (d.surfaces ?? []).filter((x) => x !== f.id) })} /> {f.name}</label>
                ))}
              </div>
              <label className="k-check"><input type="checkbox" checked={!!d.createSolid} onChange={(e) => st.updateFeatureDraft({ createSolid: e.target.checked })} /> Create solid</label>
              <label className="k-check"><input type="checkbox" data-testid="knit-merge" checked={d.mergeEntities !== false} onChange={(e) => st.updateFeatureDraft({ mergeEntities: e.target.checked })} /> Merge entities</label>
            </Section>
            <Section title="Edge Display" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" data-testid="knit-openedges" checked={!!d.showOpenEdges} onChange={(e) => st.updateFeatureDraft({ showOpenEdges: e.target.checked })} /> Show open edges</label>
            </Section>
          </>
        )}
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'intersect') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id) ?? (st.rebuild.surfaceBodies ?? []).find((x) => x.id === id); return st.doc.features.find((f) => f.id === b?.featureIds[b.featureIds.length - 1])?.name ?? id; };
    const region = (k: 'common' | 'a' | 'b', label: string) => (
      <label key={k} className="k-check"><input type="checkbox" checked={d.exclude.includes(k)} onChange={(e) => st.updateFeatureDraft({ exclude: e.target.checked ? [...d.exclude, k] : d.exclude.filter((x) => x !== k) })} /> {label}</label>
    );
    return (
      <>
        <Header title={d.name} icon={<Icon.Interference />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selections">
          <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
            <Icon.Part size={14} />
            <div className="k-selbox k-selbox-dir" style={{ minHeight: 40, flex: 1 }} data-testid="intersect-bodies">
              {d.bodies.map((id) => <div key={id} className="k-selbox-row">{bodyName(id)}</div>)}
            </div>
          </div>
          <div className="k-pm-label">Bodies:</div>
          {(st.rebuild.bodies.length > 2 || (st.rebuild.surfaceBodies ?? []).length > 0) && [...st.rebuild.bodies, ...(st.rebuild.surfaceBodies ?? [])].map((b) => (
            <label key={b.id} className="k-check"><input type="checkbox" checked={d.bodies.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...d.bodies, b.id].slice(-2) : d.bodies.filter((x) => x !== b.id) })} /> {bodyName(b.id)}</label>
          ))}
          <label className="k-check"><input type="radio" name="isect" checked={!d.capPlanar} onChange={() => st.updateFeatureDraft({ capPlanar: false })} /> Create internal regions</label>
          <label className="k-check"><input type="radio" name="isect" data-testid="isect-cap" checked={!!d.capPlanar} onChange={() => st.updateFeatureDraft({ capPlanar: true })} /> Cap planar openings</label>
        </Section>
        <Section title="Regions to Exclude">
          {region('common', 'Region 1 (in both bodies)')}
          {region('a', `Region 2 (only in ${bodyName(d.bodies[0] ?? '')})`)}
          {region('b', `Region 3 (only in ${bodyName(d.bodies[1] ?? '')})`)}
        </Section>
        <Section title="Options">
          <label className="k-check"><input type="checkbox" checked={d.merge} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>
          <label className="k-check"><input type="checkbox" checked={!!d.consumeSurfaces} onChange={(e) => st.updateFeatureDraft({ consumeSurfaces: e.target.checked })} /> Consume surfaces</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'draft') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title={d.name} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <div className="k-pm-tabs"><button className={autoFixDraft ? '' : 'active'} onClick={() => setAutoFixDraft(false)}>Manual</button><button className={autoFixDraft ? 'active' : ''} data-testid="draft-xpert" onClick={() => { setAutoFixDraft(true); st.updateFeatureDraft({ draftType: 'neutral' }); }}>Auto-Fix Draft</button></div>
        {autoFixDraft && (
          <Section title="Add / Change">
            <p className="k-pm-message">Auto-Fix Draft: set the angle, pick the neutral plane and the faces, then Apply. Faces that already have enough draft show green in Draft Analysis.</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="k-btn" data-testid="draft-xpert-apply" onClick={() => st.commitFeature()}>Apply</button>
              <button className="k-btn" onClick={() => st.setAnalysis({ kind: 'draft', pull: d.neutral ? (d.neutral.normal.map((x) => -x) as [number, number, number]) : [0, 1, 0], pullLabel: d.neutral?.label ?? 'Top Plane', angle: d.angle })}>Draft Analysis</button>
            </div>
          </Section>
        )}
        {!autoFixDraft && <Section title="Type of Draft">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="drafttype" checked={(d.draftType ?? 'neutral') === 'neutral'} onChange={() => st.updateFeatureDraft({ draftType: 'neutral' })} /> Neutral plane</label>
            <label className="k-check"><input type="radio" name="drafttype" data-testid="draft-parting" checked={d.draftType === 'parting'} onChange={() => { st.updateFeatureDraft({ draftType: 'parting' }); st.setDraftFocus('neutral'); }} /> Parting line</label>
            <label className="k-check"><input type="radio" name="drafttype" data-testid="draft-step" checked={d.draftType === 'step'} onChange={() => { st.updateFeatureDraft({ draftType: 'step' }); st.setDraftFocus('neutral'); }} /> Step draft</label>
          </div>
        </Section>}
        <Section title="Draft Angle">
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(0.01, Math.min(60, v)) })} unit="°" step={0.5} min={0.01} autoFocus /></div>
        </Section>
        <Section title={(d.draftType ?? 'neutral') === 'neutral' ? 'Neutral Plane' : 'Direction of Pull'}>
          <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
            <div className={`k-selbox ${st.draftFocus === 'neutral' ? 'k-selbox-dir' : ''}`} style={{ minHeight: 24, flex: 1 }} onClick={() => st.setDraftFocus('neutral')} data-testid="draft-neutral">
              {d.neutral ? <div className="k-selbox-row">{d.neutral.label}</div> : null}
            </div>
          </div>
        </Section>
        {(d.draftType === 'parting' || d.draftType === 'step') && (
          <Section title="Parting Lines">
            <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
              <Icon.EdgeSelect size={16} />
              <div className={`k-selbox ${st.draftFocus === 'parting' ? 'k-selbox-dir' : ''}`} style={{ minHeight: 24, flex: 1 }} onClick={() => st.setDraftFocus('parting')} data-testid="draft-partingbox">
                {d.parting ? <div className="k-selbox-row">{d.parting.label}</div> : null}
              </div>
            </div>
            {d.draftType === 'parting' && (
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="partsides" checked={(d.partingSides ?? 'one') === 'one'} onChange={() => st.updateFeatureDraft({ partingSides: 'one' })} /> Along the pull</label>
                <label className="k-check"><input type="radio" name="partsides" checked={d.partingSides === 'other'} onChange={() => st.updateFeatureDraft({ partingSides: 'other' })} /> Other Face</label>
                <label className="k-check"><input type="radio" name="partsides" checked={d.partingSides === 'both'} onChange={() => st.updateFeatureDraft({ partingSides: 'both' })} /> Both sides</label>
              </div>
            )}
          </Section>
        )}
        <Section title="Faces to Draft">
          <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
            <Icon.Properties size={14} />
            <div className={`k-selbox ${st.draftFocus === 'faces' ? 'k-selbox-dir' : ''}`} style={{ minHeight: 60, flex: 1 }} onClick={() => st.setDraftFocus('faces')} data-testid="draft-faces">
              {d.faces.map((x) => <div key={x.label} className="k-selbox-row">{x.label}</div>)}
            </div>
          </div>
          <div className="k-pm-label">Face propagation:</div>
          <select className="k-input" data-testid="draft-propagation" value={d.propagation ?? 'none'} onChange={(e) => st.updateFeatureDraft({ propagation: e.target.value as 'none' })}>
            <option value="none">None</option><option value="tangent">Along Tangent</option><option value="all">All Faces</option><option value="inner">Inner Faces</option><option value="outer">Outer Faces</option>
          </select>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'sketchedBend') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const sketches = st.doc.features.filter((f): f is import('../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title={d.name} icon={<Icon.Line />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Bend Parameters">
          <div className="k-field"><label>Sketch</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="sbend-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
          <label className="k-check"><input type="checkbox" checked={d.flipSide} onChange={(e) => st.updateFeatureDraft({ flipSide: e.target.checked })} /> Fixed face on the other side</label>
          <div className="k-pm-stylerow">
            {([['centerline', 'Bend Centerline', '|'], ['materialInside', 'Material Inside', '⌐'], ['materialOutside', 'Material Outside', '¬'], ['bendOutside', 'Bend Outside', '⊓']] as const).map(([v, tip, g]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${(d.position ?? 'centerline') === v ? 'active' : ''}`} data-tip={tip} data-testid={`pos-${v}`} onClick={() => st.updateFeatureDraft({ position: v })}>{g}</button>
            ))}
          </div>
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
            <NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(179, v)) })} unit="°" step={5} min={1} autoFocus />
          </div>
          <label className="k-check"><input type="checkbox" checked={d.radius === undefined} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow"><Icon.Arc size={14} /><NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => d.radius === undefined ? st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) }) : st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'jog') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const sketches = st.doc.features.filter((f): f is import('../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title={d.name} icon={<Icon.Line />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selections">
          <div className="k-field"><label>Sketch</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="jog-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
          <label className="k-check"><input type="checkbox" checked={d.flipSide} onChange={(e) => st.updateFeatureDraft({ flipSide: e.target.checked })} /> Fixed face on the other side</label>
          <label className="k-check"><input type="checkbox" checked={d.radius === undefined} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow"><Icon.Arc size={14} /><NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => d.radius === undefined ? st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) }) : st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        <Section title="Jog Offset">
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
            <select className="k-input" data-testid="jog-end" value={d.offsetEnd ?? 'blind'} onChange={(e) => { st.updateFeatureDraft({ offsetEnd: e.target.value as 'blind' }); useStore.setState({ flangePick: e.target.value === 'upToVertex' ? 'vertex' : null }); }}><option value="blind">Blind</option><option value="upToVertex">Up To Vertex</option></select>
          </div>
          {(d.offsetEnd ?? 'blind') === 'blind'
            ? <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
            : <div className={`k-selbox${st.flangePick === 'vertex' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} onClick={() => useStore.setState({ flangePick: 'vertex' })}>{d.vertex ? <div className="k-selbox-row">{d.vertex.label}</div> : <span className="k-muted">Click a corner of the model.</span>}</div>}
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="jogoff" checked={(d.offsetType ?? 'outside') === 'outside'} onChange={() => st.updateFeatureDraft({ offsetType: 'outside' })} /> Outside offset</label>
            <label className="k-check"><input type="radio" name="jogoff" data-testid="jog-inside" checked={d.offsetType === 'inside'} onChange={() => st.updateFeatureDraft({ offsetType: 'inside' })} /> Inside offset</label>
            <label className="k-check"><input type="radio" name="jogoff" checked={d.offsetType === 'overall'} onChange={() => st.updateFeatureDraft({ offsetType: 'overall' })} /> Overall dimension</label>
          </div>
          <label className="k-check"><input type="checkbox" data-testid="jog-fixprojected" checked={d.fixProjected !== false} onChange={(e) => st.updateFeatureDraft({ fixProjected: e.target.checked })} /> Fix projected length</label>
        </Section>
        <Section title="Jog Position">
          <div className="k-pm-stylerow">
            {([['centerline', 'Bend Centerline', '|'], ['materialInside', 'Material Inside', '⌐'], ['materialOutside', 'Material Outside', '¬'], ['bendOutside', 'Bend Outside', '⊓']] as const).map(([v, tip, g]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${(d.position ?? 'centerline') === v ? 'active' : ''}`} data-tip={tip} data-testid={`pos-${v}`} onClick={() => st.updateFeatureDraft({ position: v })}>{g}</button>
            ))}
          </div>
        </Section>
        <Section title="Jog Angle">
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.jogAngle ?? 90} onChange={(v) => st.updateFeatureDraft({ jogAngle: Math.max(10, Math.min(90, v)) })} unit="°" step={5} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'thread') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const internal = !!d.edge?.internal;
    const pick = (name: string) => {
      const t = METRIC_THREADS.find((x) => x[0] === name);
      if (t) st.updateFeatureDraft({ size: t[0], diameter: t[1], pitch: t[2], name: d.name.replace(/^M[\d.x]+ /, `${t[0]} `) });
    };
    return (
      <>
        <Header title="Thread" icon={<Icon.Hole />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Favorite" defaultOpen={false}>
          <div className="k-pm-valuerow">
            <select className="k-input" data-testid="thread-fav" value="" onChange={(e) => { const f = threadFavs[e.target.value]; if (f) st.updateFeatureDraft(f); }}>
              <option value="">No Favorite Selected</option>
              {Object.keys(threadFavs).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="k-btn ghost icon k-tip" data-tip="Add or Update Favorite" data-testid="thread-fav-add" onClick={() => { const { id: _i, name: _n, edge: _e, upTo: _u, ...rest } = d; void _i; void _n; void _e; void _u; const name = `${d.size} ${d.method === 'cut' ? 'cut' : 'extruded'} ${d.length}`; const list = { ...threadFavs, [name]: rest }; savePrefs({ ...loadPrefs(), 'thread.favorites': JSON.stringify(list) }); setThreadFavs(list); st.pushMessage(`Favorite "${name}" saved.`); }}>+</button>
            <button className="k-btn ghost icon k-tip" data-tip="Delete Favorite" disabled={!Object.keys(threadFavs).length} onClick={() => { const keys = Object.keys(threadFavs); const list = { ...threadFavs }; delete list[keys[keys.length - 1]]; savePrefs({ ...loadPrefs(), 'thread.favorites': JSON.stringify(list) }); setThreadFavs(list); }}>−</button>
          </div>
        </Section>
        <Section title="Thread Location">
          {/* the two selection boxes of the intended design: the start edge (blue tag) and an optional start face (purple tag) */}
          <div className="k-pm-selrow k-tip" data-tip="Edge: a circular edge of a cylinder or hole">
            <Icon.Circle size={18} />
            <div className="k-pm-colorbox active" style={{ ['--tag' as string]: '#5aa8f0' }} data-testid="thread-edge"><i />{d.edge ? d.edge.label : ''}</div>
          </div>
          <div className="k-pm-selrow k-tip" data-tip="Optional start face">
            <Icon.Sheet size={18} />
            <div className={`k-pm-colorbox${st.threadFacePick ? ' active' : ''}`} style={{ ['--tag' as string]: '#7a12e0' }} data-testid="thread-startface" onClick={() => useStore.setState({ threadFacePick: !st.threadFacePick })}><i />{d.startFace?.label ?? ''}{d.startFace && <button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} title="Clear" onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ startFace: null }); }}>×</button>}</div>
          </div>
          {!d.edge && <p className="k-pm-message" style={{ marginTop: 4 }}>Select a circular edge of a cylinder or hole.</p>}
          <label className="k-check"><input type="checkbox" checked={d.offset} onChange={(e) => st.updateFeatureDraft({ offset: e.target.checked, offsetDistance: d.offsetDistance ?? 2 })} /> Offset</label>
          {d.offset && <div className="k-pm-valuerow k-tip" data-tip="Offset distance"><Icon.Dimension size={14} /><NumberField value={d.offsetDistance ?? 0} onChange={(v) => st.updateFeatureDraft({ offsetDistance: v })} unit={st.doc.units} step={0.5} /></div>}
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: v })} unit="deg" step={15} /></div>
        </Section>
        <Section title="End Condition">
          <div className="k-pm-selrow">
          <button className={`k-pm-revbtn k-tip${d.reverse ? ' active' : ''}`} data-tip="Reverse Direction" data-testid="thread-reverse" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Flip size={16} /></button>
          <select className="k-input" data-testid="thread-end" value={d.endCondition ?? 'blind'} onChange={(e) => {
            const v = e.target.value as 'blind' | 'revolutions' | 'upTo';
            if (v === 'upTo') {
              const sf = st.selectedFace;
              const b = sf ? st.rebuild.bodies.find((x) => x.id === sf.bodyId) : undefined;
              const fc = b?.faces.find((x) => x.id === sf?.faceId);
              if (!fc || fc.curved) { st.pushMessage('Up To Selection: select the planar end face first, then choose Up To Selection.', 'warn'); return; }
              st.updateFeatureDraft({ endCondition: 'upTo', upTo: { normal: fc.normal, point: fc.centroid, label: `Face<${b!.faces.indexOf(fc) + 1}>` } });
            } else st.updateFeatureDraft({ endCondition: v, revolutions: d.revolutions ?? 5 });
          }}><option value="blind">Blind</option><option value="revolutions">Revolutions</option><option value="upTo">Up To Selection</option></select>
          </div>
          {(d.endCondition ?? 'blind') === 'blind' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(d.pitch, v) })} unit={st.doc.units} step={1} min={0.5} autoFocus /></div>}
          {d.endCondition === 'revolutions' && <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={d.revolutions ?? 5} onChange={(v) => st.updateFeatureDraft({ revolutions: Math.max(0.5, v) })} step={0.5} /></div>}
          {d.endCondition === 'upTo' && <div className="k-selbox" style={{ minHeight: 24 }}><div className="k-selbox-row"><Icon.Sheet size={12} /> {d.upTo?.label}</div></div>}
        </Section>
        <Section title="Specification">
          <div className="k-pm-label">Type:</div>
          <select className="k-input" value={(d.internalOverride ?? internal) ? 'Metric Tap' : 'Metric Die'} onChange={(e) => st.updateFeatureDraft({ internalOverride: e.target.value === 'Metric Tap' })}><option>Metric Die</option><option>Metric Tap</option></select>
          <div className="k-pm-label">Size:</div>
          <select className="k-input" value={d.size} onChange={(e) => pick(e.target.value)} data-testid="thread-size">
            {METRIC_THREADS.map((t) => <option key={t[0]} value={t[0]}>{t[0]}</option>)}
          </select>
          <div className="k-pm-valuerow k-tip" data-tip="Override Diameter"><Icon.Circle size={14} /><NumberField value={d.diameter} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.5, v) })} unit={st.doc.units} step={0.5} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Override Pitch"><Icon.Pattern size={14} /><NumberField value={d.pitch} onChange={(v) => st.updateFeatureDraft({ pitch: Math.max(0.1, v) })} unit={st.doc.units} step={0.05} /></div>
          <div className="k-pm-label">Thread method:</div>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="thm" checked={d.method === 'cut'} onChange={() => st.updateFeatureDraft({ method: 'cut' })} /> Cut thread</label>
            <label className="k-check"><input type="radio" name="thm" checked={d.method === 'extrude'} onChange={() => st.updateFeatureDraft({ method: 'extrude' })} /> Extrude thread</label>
          </div>
          <label className="k-check"><input type="checkbox" checked={!!d.mirrorProfile} onChange={(e) => st.updateFeatureDraft({ mirrorProfile: e.target.checked })} /> Mirror Profile</label>
          <button className="k-btn" style={{ marginTop: 4 }} disabled={!d.edge} onClick={() => { const cam = bridge.camera; if (cam && d.edge) { cam.target.set(...d.edge.center); cam.scale = Math.min(cam.scale, Math.max(0.02, (d.diameter * 3) / 600)); cam.update(); } st.pushMessage('Locate Profile: zoomed to the start of the thread (' + (d.edge?.label ?? '') + ').'); }}>Locate Profile</button>
        </Section>
        <Section title="Thread Options">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="thh" checked={d.rightHand} onChange={() => st.updateFeatureDraft({ rightHand: true })} /> Right-hand thread</label>
            <label className="k-check"><input type="radio" name="thh" checked={!d.rightHand} onChange={() => st.updateFeatureDraft({ rightHand: false })} /> Left-hand thread</label>
          </div>
          <label className="k-check"><input type="checkbox" checked={(d.starts ?? 1) > 1} onChange={(e) => st.updateFeatureDraft({ starts: e.target.checked ? 2 : 1 })} /> Multiple Start</label>
          {(d.starts ?? 1) > 1 && <div className="k-pm-valuerow k-tip" data-tip="Number of starts"><Icon.Pattern size={14} /><NumberField value={d.starts ?? 2} onChange={(v) => st.updateFeatureDraft({ starts: Math.max(2, Math.min(6, Math.round(v))) })} step={1} /></div>}
          <label className="k-check"><input type="checkbox" checked={!!d.trimStart} onChange={(e) => st.updateFeatureDraft({ trimStart: e.target.checked })} /> Trim with start face</label>
          <label className="k-check"><input type="checkbox" checked={!!d.trimEnd} onChange={(e) => st.updateFeatureDraft({ trimEnd: e.target.checked })} /> Trim with end face</label>
        </Section>
        <Section title="Preview Options" defaultOpen={false}>
          <label className="k-check"><input type="radio" name="thp" data-testid="thread-shaded" checked={d.previewMode === 'shaded'} onChange={() => st.updateFeatureDraft({ previewMode: 'shaded' })} /> Shaded preview</label>
          <label className="k-check"><input type="radio" name="thp" checked={(d.previewMode ?? 'wireframe') === 'wireframe'} onChange={() => st.updateFeatureDraft({ previewMode: 'wireframe' })} /> Wireframe preview</label>
          <label className="k-check"><input type="radio" name="thp" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'wrap') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f): f is import('../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title="Wrap" icon={<Icon.Revolve />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Wrap Type">
          <div className="k-pm-stylerow">
            {([['emboss', 'Emboss'], ['deboss', 'Deboss'], ['scribe', 'Scribe']] as const).map(([k, tip]) => (
              <button key={k} className={`k-pm-stylebtn k-tip ${d.kind === k ? 'active' : ''}`} data-tip={tip} data-testid={`wrap-${k}`} onClick={() => st.updateFeatureDraft({ kind: k })}><Icon.Revolve size={14} /></button>
            ))}
          </div>
        </Section>
        <Section title="Wrap Method">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="wrapm" checked={(d.method ?? 'analytical') === 'analytical'} onChange={() => st.updateFeatureDraft({ method: 'analytical' })} /> Analytical</label>
            <label className="k-check"><input type="radio" name="wrapm" data-testid="wrap-spline" checked={d.method === 'spline'} onChange={() => st.updateFeatureDraft({ method: 'spline' })} /> Spline Surface</label>
          </div>
        </Section>
        <Section title="Wrap Parameters">
          {d.method === 'spline'
            ? <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wrap-face">{d.splineFace ? <div className="k-selbox-row"><Icon.Properties size={12} /> {d.splineFace.label}</div> : <span className="k-muted">Select the face to wrap onto (any face).</span>}</div>
            : <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wrap-face">{d.face ? <div className="k-selbox-row"><Icon.Revolve size={12} /> {d.face.label}</div> : <span className="k-muted">Select a cylindrical face.</span>}</div>}
          {d.kind !== 'scribe' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} autoFocus /></div>}
          <div className="k-field"><label>Source Sketch</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="wrap-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && (st.featureEdit.draft.type === 'unfold' || st.featureEdit.draft.type === 'fold')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const isUnfold = d.type === 'unfold';
    // the bends of the base flange: interior corners of its open sketch chain
    const bf = st.doc.features.find((f) => f.type === 'baseFlange' && !f.suppressed);
    const chain = bf && bf.type === 'baseFlange' && st.doc.sketches[bf.sketchId] ? sketchChains(st.doc.sketches[bf.sketchId]).find((c) => !c.closed) : undefined;
    const nBends = chain ? Math.max(0, chain.points.length - 2) : 0;
    return (
      <>
        <Header title={isUnfold ? 'Unfold' : 'Fold'} icon={<Icon.Sheet />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selections">
          <div className="k-field"><label>Fixed face</label></div>
          <div className="k-selbox" style={{ minHeight: 24 }}><div className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;1&gt;</div></div>
          <div className="k-field" style={{ marginTop: 6 }}><label>{isUnfold ? 'Bends to unfold' : 'Bends to fold'}</label></div>
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="unfold-bends">
            {Array.from({ length: nBends }, (_, i) => <div key={i} className="k-selbox-row"><Icon.Arc size={12} /> BaseBend{i + 1}</div>)}
          </div>
          <button className="k-btn" style={{ marginTop: 4 }}>Collect All Bends</button>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  // Delete Face Property Panel: Selections (Faces to delete) and Options (Delete / Delete and Patch / Delete and Fill)
  if (st.featureEdit && st.featureEdit.draft.type === 'deleteFace') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Delete Face" icon={<Icon.Trash />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {err && <Section title="Rebuild Errors"><p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p></Section>}
        <Section title="Selections">
          <div className="k-selbox k-selbox-dir" style={{ minHeight: 60 }} data-testid="deleteface-faces">
            {d.faces.length ? d.faces.map((f) => <div key={f.label} className="k-selbox-row">{f.label}<button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={() => st.updateFeatureDraft({ faces: d.faces.filter((x) => x.label !== f.label) })}>×</button></div>) : <span className="k-muted">Faces to delete</span>}
          </div>
        </Section>
        <Section title="Options">
          <div className="k-pm-radios" data-testid="deleteface-option">
            <label className="k-check"><input type="radio" name="dfopt" checked={d.option === 'delete'} onChange={() => st.updateFeatureDraft({ option: 'delete' })} /> Delete</label>
            <label className="k-check"><input type="radio" name="dfopt" checked={d.option === 'patch'} onChange={() => st.updateFeatureDraft({ option: 'patch' })} /> Delete and Patch</label>
            <label className="k-check"><input type="radio" name="dfopt" checked={d.option === 'fill'} onChange={() => st.updateFeatureDraft({ option: 'fill' })} /> Delete and Fill</label>
          </div>
        </Section>
      </>
    );
  }

  if (st.featureEdit && (st.featureEdit.draft.type === 'closedCorner' || st.featureEdit.draft.type === 'cornerRelief' || st.featureEdit.draft.type === 'loftedBend' || st.featureEdit.draft.type === 'convertSheet')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f) => f.type === 'sketch') as { id: string; name: string; sketchId: string }[];
    const errBox = err && (
      <Section title="Rebuild Errors">
        <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
      </Section>
    );
    if (d.type === 'closedCorner') {
      return (
        <>
          <Header title={d.weld ? 'Welded Corner' : 'Closed Corner'} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Faces to Extend">
            <div className="k-selbox" style={{ minHeight: 40 }} data-testid="cc-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the end faces of the flanges in the graphics area.</span>}</div>
          </Section>
          <Section title="Corner Type">
            <div className="k-pm-stylerow">
              {(['butt', 'overlap', 'underlap'] as const).map((k) => <button key={k} className={`k-pm-stylebtn k-tip ${d.cornerType === k ? 'active' : ''}`} data-tip={k[0].toUpperCase() + k.slice(1)} onClick={() => st.updateFeatureDraft({ cornerType: k })}><Icon.Chamfer size={14} /></button>)}
            </div>
            <div className="k-pm-valuerow k-tip" data-tip="Gap distance"><Icon.Dimension size={14} /><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.1} /></div>
            <label className="k-check"><input type="checkbox" checked={!!d.weld} onChange={(e) => st.updateFeatureDraft({ weld: e.target.checked })} /> Weld the corner (weld bead)</label>
          </Section>
          {errBox}
        </>
      );
    }
    if (d.type === 'cornerRelief') {
      return (
        <>
          <Header title="Corner Relief" icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Scope">
            <div className="k-selbox" style={{ minHeight: 40 }} data-testid="cr-bends">{d.bends.length ? d.bends.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Arc size={12} /> Bend&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the curved faces of the two bends that meet.</span>}</div>
          </Section>
          <Section title="Relief Options">
            <div className="k-pm-stylerow">
              <button className={`k-pm-stylebtn k-tip ${d.kind === 'rectangular' ? 'active' : ''}`} data-tip="Rectangular Relief" onClick={() => st.updateFeatureDraft({ kind: 'rectangular' })}>▭</button>
              <button className={`k-pm-stylebtn k-tip ${d.kind === 'circular' ? 'active' : ''}`} data-tip="Circular Relief" onClick={() => st.updateFeatureDraft({ kind: 'circular' })}>◯</button>
            </div>
            <div className="k-pm-valuerow k-tip" data-tip="Relief size"><Icon.Dimension size={14} /><NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
          </Section>
          {errBox}
        </>
      );
    }
    if (d.type === 'loftedBend') {
      return (
        <>
          <Header title="Lofted-Bend" icon={<Icon.Loft />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Manufacturing Method">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="lbm" checked={(d.method ?? 'formed') === 'formed'} onChange={() => st.updateFeatureDraft({ method: 'formed' })} /> Formed</label>
              <label className="k-check"><input type="radio" name="lbm" data-testid="lb-bent" checked={d.method === 'bent'} onChange={() => st.updateFeatureDraft({ method: 'bent', facets: d.facets ?? 4 })} /> Bent</label>
            </div>
            {d.method === 'bent' && <div className="k-pm-valuerow k-tip" data-tip="Number of bends (facets per curved part)"><Icon.Pattern size={14} /><NumberField value={d.facets ?? 4} onChange={(v) => st.updateFeatureDraft({ facets: Math.max(1, Math.min(40, Math.round(v))) })} step={1} min={1} /></div>}
          </Section>
          <Section title="Profiles">
            {(['sketchId', 'sketchId2'] as const).map((k, i) => (
              <div key={k} className="k-field"><label>Profile {i + 1}</label>
                <select className="k-input" data-testid={`lb-${k}`} value={d[k]} onChange={(e) => st.updateFeatureDraft({ [k]: e.target.value })}>
                  <option value="">Select a sketch…</option>
                  {sketches.map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
                </select>
              </div>
            ))}
          </Section>
          <Section title="Thickness">
            <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
          </Section>
          {errBox}
        </>
      );
    }
    return (
      <>
        <Header title={d.insertBends ? 'Bends' : 'Convert To Sheet Metal'} icon={<Icon.Sheet />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {d.insertBends && (
          <Section title="Message">
            <p className="k-pm-message">Select the fixed face. The sharp corners of the shelled solid become bends with the default radius (Sheet-Metal, Flatten-Bends and Process-Bends are added to the tree).</p>
          </Section>
        )}
        <Section title="Sheet Metal Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="conv-fixed">{d.fixedFace ? <div className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;1&gt; (fixed)</div> : <span className="k-muted">Select the fixed face of the solid.</span>}</div>
          <div className="k-pm-valuerow k-tip" data-tip="Sheet thickness"><Icon.Dimension size={14} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Default radius for bends"><Icon.Arc size={14} /><NumberField value={d.bendRadius} onChange={(v) => st.updateFeatureDraft({ bendRadius: Math.max(0, v) })} unit={st.doc.units} step={0.5} /></div>
          <label className="k-check"><input type="checkbox" data-testid="conv-keepbody" checked={!!d.keepBody} onChange={(e) => st.updateFeatureDraft({ keepBody: e.target.checked })} /> Keep body</label>
        </Section>
        <Section title="Bend Edges">
          <p className="k-muted">The side faces become flanges; the face opposite the fixed face is left open.</p>
        </Section>
        {errBox}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'vent') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f) => f.type === 'sketch') as { id: string; name: string; sketchId: string }[];
    const vsk = st.doc.sketches[d.sketchId];
    const parts = vsk ? classifyVent(vsk, !!d.fillIn) : null;
    const nOpen = parts?.ribs.length ?? 0, nSpars = parts?.spars.length ?? 0, nClosed = parts ? parts.regions.length : 0;
    return (
      <>
        <Header title="Vent" icon={<Icon.Vent />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Message">
          <p className="k-pm-message">Select a 2D sketch on the sheet: the largest closed contour is the boundary, open chains are ribs and the other closed contours are spars.</p>
        </Section>
        <Section title="Boundary">
          <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="vent-sketch">
            <option value="">(select a sketch)</option>
            {sketches.map((s) => <option key={s.id} value={s.sketchId}>{s.name}</option>)}
          </select>
          <div className="k-selbox" style={{ minHeight: 24, marginTop: 4 }} data-testid="vent-boundary">{nClosed ? <div className="k-selbox-row"><Icon.Sketch size={12} /> Boundary: {vsk?.name} ({round(parts?.boundaryArea ?? 0, 1)} mm²)</div> : <span className="k-muted">No closed contour.</span>}</div>
        </Section>
        <Section title="Geometry Properties">
          <div className="k-pm-valuerow k-tip" data-tip="Draft angle"><Icon.Draft size={16} /><NumberField value={d.draft ?? 0} onChange={(v) => st.updateFeatureDraft({ draft: Math.max(0, Math.min(45, v)) })} unit="°" step={1} min={0} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Fillet radius of the corners"><Icon.Fillet size={16} /><NumberField value={d.radius ?? 0} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        <Section title="Flow Area">
          <p className="k-muted" data-testid="vent-flow">Boundary {round(parts?.boundaryArea ?? 0, 1)} mm² with {nOpen} rib(s) and {nSpars} spar(s){d.fillIn && parts?.fillIn.length ? ' and a fill-in boundary' : ''}: the open area is what is left between them.</p>
        </Section>
        <Section title="Ribs">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="vent-ribs">{nOpen ? Array.from({ length: nOpen }, (_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Rib&lt;{i + 1}&gt;</div>) : <span className="k-muted">Open lines of the sketch become ribs.</span>}</div>
          <div className="k-pm-valuerow k-tip" data-tip="Rib width"><Icon.Dimension size={14} /><NumberField value={d.ribWidth} onChange={(v) => st.updateFeatureDraft({ ribWidth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} data-testid="vent-ribwidth" /></div>
        </Section>
        <Section title="Spars">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="vent-spars">{nSpars ? Array.from({ length: nSpars }, (_, i) => <div key={i} className="k-selbox-row"><Icon.Circle size={12} /> Spar&lt;{i + 1}&gt;</div>) : <span className="k-muted">Closed contours inside the boundary become spars.</span>}</div>
          <div className="k-pm-valuerow k-tip" data-tip="Spar width"><Icon.Dimension size={14} /><NumberField value={d.sparWidth} onChange={(v) => st.updateFeatureDraft({ sparWidth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} /></div>
        </Section>
        <Section title="Fill-In Boundary" defaultOpen={!!d.fillIn}>
          <label className="k-check"><input type="checkbox" data-testid="vent-fillin" checked={!!d.fillIn} onChange={(e) => st.updateFeatureDraft({ fillIn: e.target.checked })} /> The smallest closed contour stays solid</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'formTool') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const lib = FORM_TOOL_LIBRARY.find((x) => x.id === d.shape) ?? FORM_TOOL_LIBRARY[0];
    return (
      <>
        <Header title="Form Tool Feature" icon={<Icon.FormTool />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <div className="k-pm-tabs">
          <button className={holeTab === 'type' ? 'active' : ''} onClick={() => setHoleTab('type')}>Type</button>
          <button className={holeTab === 'positions' ? 'active' : ''} onClick={() => setHoleTab('positions')}>Position</button>
        </div>
        {holeTab === 'type' && (
          <>
            <Section title="Placement Face">
              <div className="k-selbox" style={{ minHeight: 24 }} data-testid="form-face">{d.plane ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {st.doc.planes[d.plane]?.name ?? 'Face<1>'}</div> : <span className="k-muted">Select the face of the sheet the form is pressed into.</span>}</div>
            </Section>
            <Section title="Forming Tool">
              <div className="k-pm-label">Part Library ▸ forming tools:</div>
              <select className="k-input" value={d.shape} data-testid="form-shape" onChange={(e) => { const t = FORM_TOOL_LIBRARY.find((x) => x.id === e.target.value)!; st.updateFeatureDraft({ shape: t.id, width: t.width, length: t.length, height: t.height, name: `${t.label}${st.doc.features.filter((f) => f.type === 'formTool' && f.shape === t.id).length + 1}` }); }}>
                {FORM_TOOL_LIBRARY.map((t) => <option key={t.id} value={t.id}>{t.folder} ▸ {t.label}</option>)}
              </select>
              <div className="k-pm-valuerow k-tip" data-tip="Rotation angle"><Icon.MateAngle size={14} /><NumberField value={d.rotation} onChange={(v) => st.updateFeatureDraft({ rotation: ((v % 360) + 360) % 360 })} unit="°" step={15} /></div>
              <label className="k-check"><input type="checkbox" data-testid="form-flip" checked={d.flip} onChange={(e) => st.updateFeatureDraft({ flip: e.target.checked })} /> Flip tool</label>
              <label className="k-check"><input type="checkbox" checked={d.linkToThickness !== false} onChange={(e) => st.updateFeatureDraft({ linkToThickness: e.target.checked })} /> Link to thickness</label>
            </Section>
            <Section title="Configurations" defaultOpen={false}>
              <p className="k-muted">{lib.folder} ▸ {lib.label}: default configuration.</p>
              <div className="k-pm-valuerow k-tip" data-tip="Length"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
              <div className="k-pm-valuerow k-tip" data-tip="Width"><Icon.Dimension size={14} /><NumberField value={d.width} onChange={(v) => st.updateFeatureDraft({ width: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
              <div className="k-pm-valuerow k-tip" data-tip="Height"><Icon.Depth size={16} /><NumberField value={d.height} onChange={(v) => st.updateFeatureDraft({ height: Math.max(0.5, v) })} unit={st.doc.units} step={0.5} min={0.5} /></div>
            </Section>
            <Section title="Flat Pattern Visibility" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" defaultChecked /> Override document settings</label>
              <label className="k-check"><input type="checkbox" defaultChecked /> Show punch</label>
              <label className="k-check"><input type="checkbox" /> Show profile</label>
              <label className="k-check"><input type="checkbox" /> Show center</label>
            </Section>
          </>
        )}
        {holeTab === 'positions' && (
          <Section title="Positions">
            <p className="k-muted">Click the placement face to place the form. {d.points.length} position(s).</p>
            <div className="k-selbox" style={{ minHeight: 24 }} data-testid="form-points">{d.points.map((p, i) => <div key={i} className="k-selbox-row"><Icon.Point size={12} /> Point{i + 1} ({round(p.x, 2)}, {round(p.y, 2)})</div>)}</div>
            {d.points.length > 0 && <button className="k-btn" style={{ marginTop: 4 }} onClick={() => st.updateFeatureDraft({ points: d.points.slice(0, -1) })}>Remove last</button>}
          </Section>
        )}
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'gusset') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Sheet Metal Gusset" icon={<Icon.Gusset />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Position">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="gusset-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the two faces on both sides of the bend.</span>}</div>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={d.offset === null} onChange={(e) => st.updateFeatureDraft({ offset: e.target.checked ? null : 10 })} /> Centre on the bend</label>
          {d.offset !== null && <div className="k-pm-valuerow k-tip" data-tip="Offset from the start of the bend"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} /></div>}
        </Section>
        <Section title="Profile">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="gusset-profile" defaultChecked /> Indent depth</label>
            <label className="k-check"><input type="radio" name="gusset-profile" disabled /> Profile dimensions</label>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Indent depth"><Icon.Depth size={16} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} data-testid="gusset-depth" /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Indent width"><Icon.Dimension size={14} /><NumberField value={d.width} onChange={(v) => st.updateFeatureDraft({ width: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Side face draft"><Icon.Draft size={16} /><NumberField value={d.sideDraft ?? 0} onChange={(v) => st.updateFeatureDraft({ sideDraft: Math.max(0, Math.min(45, v)) })} unit="°" step={1} min={0} /></div>
          <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Flip gusset side" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>
        </Section>
        <Section title="Dimensions" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" disabled /> Inner corner fillets</label>
          <label className="k-check"><input type="checkbox" disabled /> Outer corner fillets</label>
        </Section>
        <Section title="Preview" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" defaultChecked /> Full preview</label>
        </Section>
        <Section title="Flat Pattern Visibility" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" defaultChecked /> Show gusset profile in flat pattern</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'tabSlot') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Tab and Slot" icon={<Icon.TabSlot />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selection">
          <div className="k-pm-label">Tab edge:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="ts-edge">{d.edge ? <div className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;1&gt;</div> : <span className="k-muted">Select the edge of the sheet that gets the tabs.</span>}</div>
          <div className="k-pm-label">Slot face:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="ts-face">{d.slotFace ? <div className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;1&gt;</div> : <span className="k-muted">Select the face of the other sheet that gets the slots.</span>}</div>
        </Section>
        <Section title="Offset">
          <div className="k-pm-valuerow k-tip" data-tip="Offset of the first and last tab from the edge ends"><Icon.Dimension size={14} /><NumberField value={d.edgeOffset} onChange={(v) => st.updateFeatureDraft({ edgeOffset: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} /></div>
        </Section>
        <Section title="Spacing">
          <div className="k-pm-valuerow k-tip" data-tip="Number of tabs"><Icon.Pattern size={14} /><NumberField value={d.count} onChange={(v) => st.updateFeatureDraft({ count: Math.max(1, Math.round(v)) })} step={1} min={1} data-testid="ts-count" /></div>
        </Section>
        <Section title="Tab">
          <div className="k-pm-valuerow k-tip" data-tip="Tab length"><Icon.Dimension size={14} /><NumberField value={d.tabLength} onChange={(v) => st.updateFeatureDraft({ tabLength: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} data-testid="ts-length" /></div>
          <label className="k-check"><input type="checkbox" checked={d.linkToThickness !== false} onChange={(e) => st.updateFeatureDraft({ linkToThickness: e.target.checked })} /> Link to thickness (height)</label>
          {d.linkToThickness === false && <div className="k-pm-valuerow k-tip" data-tip="Tab height"><Icon.Depth size={16} /><NumberField value={d.tabHeight} onChange={(v) => st.updateFeatureDraft({ tabHeight: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} /></div>}
        </Section>
        <Section title="Slot">
          <div className="k-pm-valuerow k-tip" data-tip="Slot clearance (each side)"><Icon.Dimension size={14} /><NumberField value={d.clearance} onChange={(v) => st.updateFeatureDraft({ clearance: Math.max(0, v) })} unit={st.doc.units} step={0.05} min={0} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'rip') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Rip" icon={<Icon.Rip />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Rip Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="rip-edges">{d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the edges of the solid to rip.</span>}</div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.direction === 'both' ? 'active' : ''}`} data-tip="Change Direction: both sides" data-testid="rip-both" onClick={() => st.updateFeatureDraft({ direction: 'both' })}><Icon.DirArrow size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.direction === 'first' ? 'active' : ''}`} data-tip="Change Direction: first face" onClick={() => st.updateFeatureDraft({ direction: 'first' })}><Icon.ReverseDir size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.direction === 'second' ? 'active' : ''}`} data-tip="Change Direction: second face" onClick={() => st.updateFeatureDraft({ direction: 'second' })}><Icon.Flip size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Rip gap"><Icon.Dimension size={14} /><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0.01, v) })} unit={st.doc.units} step={0.1} min={0.01} data-testid="rip-gap" /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'sweptFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f) => f.type === 'sketch') as { id: string; name: string; sketchId: string }[];
    return (
      <>
        <Header title="Swept Flange" icon={<Icon.SweptFlange />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Profile and Path">
          <div className="k-pm-label">Profile (an open sketch):</div>
          <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="sf-profile">
            <option value="">(select a sketch)</option>
            {sketches.map((s) => <option key={s.id} value={s.sketchId}>{s.name}</option>)}
          </select>
          <div className="k-pm-label">Path (a sketch, or edges of the sheet):</div>
          <select className="k-input" value={d.pathSketchId} onChange={(e) => st.updateFeatureDraft({ pathSketchId: e.target.value })} data-testid="sf-path">
            <option value="">(edges of the sheet)</option>
            {sketches.map((s) => <option key={s.id} value={s.sketchId}>{s.name}</option>)}
          </select>
          <div className="k-selbox" style={{ minHeight: 24, marginTop: 4 }} data-testid="sf-edges">{d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select straight edges of the sheet as the path.</span>}</div>
        </Section>
        <Section title="Sheet Metal Parameters">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction (material on the other side of the profile)" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Sheet thickness"><Icon.Dimension size={14} /><NumberField value={(st.doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness} onChange={(v) => st.setSheetMetal({ ...(st.doc.sheetMetal ?? DEFAULT_SHEET_METAL), thickness: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} /></div>
          <label className="k-check"><input type="checkbox" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>
        </Section>
        <Section title="Flat Pattern Options" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" defaultChecked /> Flatten along path</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'deform') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Deform" icon={<Icon.Deform />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Deform Type">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="deform-type" checked readOnly /> Point</label>
            <label className="k-check"><input type="radio" name="deform-type" disabled /> Curve to curve</label>
            <label className="k-check"><input type="radio" name="deform-type" disabled /> Surface push</label>
          </div>
        </Section>
        <Section title="Deform Point">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="deform-point">{d.point ? <div className="k-selbox-row"><Icon.Point size={12} /> {d.label ?? 'Point'} ({d.point.map((x) => Math.round(x * 10) / 10).join(', ')})</div> : <span className="k-muted">Select a face: its centre is the deform point, its normal the push direction.</span>}</div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Deform direction: push outward" data-testid="deform-reverse" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Deform distance"><Icon.Depth size={16} /><NumberField value={d.distance} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
        </Section>
        <Section title="Deform Region">
          <div className="k-pm-valuerow k-tip" data-tip="Deform radius"><Icon.Dimension size={14} /><NumberField value={d.radius} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0.1, v) })} unit={st.doc.units} step={1} min={0.1} /></div>
          <label className="k-check"><input type="checkbox" defaultChecked /> Deform region</label>
        </Section>
        <Section title="Shape Options">
          <div className="k-pm-label">Stiffness:</div>
          <div className="k-pm-stylerow">
            {(['rigid', 'medium', 'flexible'] as const).map((s) => <button key={s} className={`k-pm-stylebtn ${d.stiffness === s ? 'active' : ''}`} data-testid={`deform-${s}`} onClick={() => st.updateFeatureDraft({ stiffness: s })}>{s === 'rigid' ? 'Rigid' : s === 'medium' ? 'Medium' : 'Flexible'}</button>)}
          </div>
          <label className="k-check"><input type="checkbox" defaultChecked /> Maintain boundary</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'structuralMember') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const paths = st.doc.features.filter((f) => f.type === 'sketch' || f.type === 'sketch3d') as ({ id: string; name: string; type: 'sketch'; sketchId: string } | { id: string; name: string; type: 'sketch3d' })[];
    const types = profileTypes(d.standard);
    const sizes = profileSizes(d.standard, d.profileType);
    // the member count follows the path: every straight segment of the 2D chains, or the 3D sketch segments
    const pathSketch = st.doc.sketches[d.sketchId];
    const path3d = st.doc.features.find((f) => f.id === d.sketchId && f.type === 'sketch3d') as { segments: unknown[] } | undefined;
    const members = pathSketch ? sketchChains(pathSketch).reduce((a, c) => a + Math.max(0, c.points.length - (c.closed ? 0 : 1)), 0) : path3d ? path3d.segments.length : 0;
    return (
      <>
        <Header title="Structural Member" icon={<Icon.StructuralMember />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Message">
          <p className="k-pm-message">Select the path sketch; every straight segment becomes a member. Choose the standard, type and size of the profile, then the corner treatment.</p>
        </Section>
        <Section title="Selections">
          <div className="k-pm-label">Standard:</div>
          <select className="k-input" data-testid="sm-standard" value={d.standard} onChange={(e) => { const std = e.target.value as 'iso' | 'ansi inch'; const t = profileTypes(std)[0]; st.updateFeatureDraft({ standard: std, profileType: t, size: profileSizes(std, t)[0] }); }}>
            <option value="iso">iso</option>
            <option value="ansi inch">ansi inch</option>
          </select>
          <div className="k-pm-label">Type:</div>
          <select className="k-input" data-testid="sm-type" value={d.profileType} onChange={(e) => { const t = e.target.value as ProfileType; st.updateFeatureDraft({ profileType: t, size: profileSizes(d.standard, t)[0] }); }}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="k-pm-label">Size:</div>
          <select className="k-input" data-testid="sm-size" value={d.size} onChange={(e) => st.updateFeatureDraft({ size: e.target.value })}>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" disabled /> Transfer material from profile</label>
          <div className="k-pm-label">Groups:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="sm-groups">{d.sketchId ? <div className="k-selbox-row"><Icon.Sketch size={12} /> Group1 ({paths.find((p) => (p.type === 'sketch' ? p.sketchId : p.id) === d.sketchId)?.name ?? 'path'}){members ? <span className="k-muted"> · {members} member(s)</span> : null}</div> : <span className="k-muted">Select a 2D or 3D sketch as the path.</span>}</div>
          <select className="k-input" style={{ marginTop: 4 }} data-testid="sm-path" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })}>
            <option value="">(select a path sketch)</option>
            {paths.map((p) => <option key={p.id} value={p.type === 'sketch' ? p.sketchId : p.id}>{p.name}</option>)}
          </select>
        </Section>
        <Section title="Settings">
          <label className="k-check"><input type="checkbox" data-testid="sm-corner" checked={d.corner !== 'none'} onChange={(e) => st.updateFeatureDraft({ corner: e.target.checked ? 'endMiter' : 'none' })} /> Apply corner treatment</label>
          {d.corner !== 'none' && (
            <div className="k-pm-stylerow">
              <button className={`k-pm-stylebtn k-tip ${d.corner === 'endMiter' ? 'active' : ''}`} data-tip="End Miter" data-testid="sm-miter" onClick={() => st.updateFeatureDraft({ corner: 'endMiter' })}><Icon.Chamfer size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${d.corner === 'endButt1' ? 'active' : ''}`} data-tip="End Butt1" data-testid="sm-butt1" onClick={() => st.updateFeatureDraft({ corner: 'endButt1' })}><Icon.TrimExtend size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${d.corner === 'endButt2' ? 'active' : ''}`} data-tip="End Butt2" data-testid="sm-butt2" onClick={() => st.updateFeatureDraft({ corner: 'endButt2' })}><Icon.Flip size={16} /></button>
            </div>
          )}
          <div className="k-pm-valuerow k-tip" data-tip="Gap between connected segments"><Icon.Dimension size={14} /><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
          <label className="k-check"><input type="checkbox" checked={!!d.mergeArcs} onChange={(e) => st.updateFeatureDraft({ mergeArcs: e.target.checked })} /> Merge arc segment bodies</label>
          <label className="k-check"><input type="checkbox" data-testid="sm-mirror" checked={!!d.mirror} onChange={(e) => st.updateFeatureDraft({ mirror: e.target.checked })} /> Mirror profile</label>
          <div className="k-pm-valuerow k-tip" data-tip="Rotation angle"><Icon.MateAngle size={14} /><NumberField value={d.rotation} onChange={(v) => st.updateFeatureDraft({ rotation: ((v % 360) + 360) % 360 })} unit="°" step={15} /></div>
          <button className="k-btn" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Locate Profile</button>
          {profileEdit && (
            <div className="k-pm-xyrow">
              <span className="k-pm-xy">X</span><NumberField value={d.locate?.x ?? 0} onChange={(v) => st.updateFeatureDraft({ locate: { x: v, y: d.locate?.y ?? 0 } })} unit={st.doc.units} step={1} />
              <span className="k-pm-xy">Y</span><NumberField value={d.locate?.y ?? 0} onChange={(v) => st.updateFeatureDraft({ locate: { x: d.locate?.x ?? 0, y: v } })} unit={st.doc.units} step={1} />
            </div>
          )}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'trimExtend') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return st.doc.features.find((f) => f.id === b?.featureIds[b.featureIds.length - 1])?.name ?? id; };
    return (
      <>
        <Header title="Trim/Extend" icon={<Icon.TrimExtend />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Corner Type">
          <div className="k-pm-stylerow">
            <button className="k-pm-stylebtn k-tip active" data-tip="End Trim"><Icon.TrimExtend size={16} /></button>
            <button className="k-pm-stylebtn k-tip" data-tip="End Miter (use Structural Member ▸ corner treatment)" onClick={() => st.pushMessage('End Miter, End Butt1 and End Butt2 are the corner treatments of the Structural Member; Trim/Extend trims with bodies or a face.', 'info')}><Icon.Chamfer size={16} /></button>
          </div>
        </Section>
        <Section title="Bodies to be Trimmed">
          <div className={`k-selbox${st.trimFocus === 'bodies' ? ' focus' : ''}`} style={{ minHeight: 24 }} data-testid="te-bodies" onClick={() => st.setTrimFocus('bodies')}>{d.bodies.length ? d.bodies.map((b) => <div key={b} className="k-selbox-row"><Icon.Part size={12} /> {bodyName(b)}</div>) : <span className="k-muted">Select the bodies to trim (click a face).</span>}</div>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={d.allowExtension} onChange={(e) => st.updateFeatureDraft({ allowExtension: e.target.checked })} /> Allow extension</label>
        </Section>
        <Section title="Trimming Boundary">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="te-by" data-testid="te-byface" checked={d.trimBy === 'face'} onChange={() => { st.updateFeatureDraft({ trimBy: 'face' }); st.setTrimFocus('trimming'); }} /> Face/Plane</label>
            <label className="k-check"><input type="radio" name="te-by" data-testid="te-bybodies" checked={d.trimBy === 'bodies'} onChange={() => { st.updateFeatureDraft({ trimBy: 'bodies' }); st.setTrimFocus('trimming'); }} /> Bodies</label>
          </div>
          <div className={`k-selbox${st.trimFocus === 'trimming' ? ' focus' : ''}`} style={{ minHeight: 24 }} data-testid="te-trimming" onClick={() => st.setTrimFocus('trimming')}>
            {d.trimBy === 'bodies'
              ? (d.trimBodies.length ? d.trimBodies.map((b) => <div key={b} className="k-selbox-row"><Icon.Part size={12} /> {bodyName(b)}</div>) : <span className="k-muted">Select the trimming bodies.</span>)
              : (d.face ? <div className="k-selbox-row"><Icon.Plane size={12} /> Face&lt;1&gt;</div> : <span className="k-muted">Select the trimming face or plane.</span>)}
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Weld gap"><Icon.Dimension size={14} /><NumberField value={d.weldGap} onChange={(v) => st.updateFeatureDraft({ weldGap: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
          <label className="k-check"><input type="checkbox" defaultChecked /> Preview</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'endCap') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="End Cap" icon={<Icon.EndCap />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="ec-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the end faces of the tubes.</span>}</div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${!d.outward ? 'active' : ''}`} data-tip="Thickness Direction: Inward" data-testid="ec-inward" onClick={() => st.updateFeatureDraft({ outward: false })}><Icon.ReverseDir size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.outward ? 'active' : ''}`} data-tip="Thickness Direction: Outward" data-testid="ec-outward" onClick={() => st.updateFeatureDraft({ outward: true })}><Icon.DirArrow size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Thickness"><Icon.Depth size={16} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.1, v) })} unit={st.doc.units} step={1} min={0.1} /></div>
        </Section>
        <Section title="Offset">
          <label className="k-check"><input type="checkbox" data-testid="ec-ratio" checked={d.useRatio} onChange={(e) => st.updateFeatureDraft({ useRatio: e.target.checked })} /> Use thickness ratio</label>
          {d.useRatio
            ? <div className="k-pm-valuerow k-tip" data-tip="Thickness ratio (of the wall)"><Icon.Dimension size={14} /><NumberField value={d.ratio} onChange={(v) => st.updateFeatureDraft({ ratio: Math.max(0, Math.min(1, v)) })} step={0.1} min={0} /></div>
            : <div className="k-pm-valuerow k-tip" data-tip="Offset value"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>}
          <label className="k-check"><input type="checkbox" disabled /> Reverse direction</label>
        </Section>
        <Section title="Corner Treatment" check={d.chamfer > 0} onCheck={(on) => st.updateFeatureDraft({ chamfer: on ? 2 : 0 })}>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="ec-corner" checked={d.chamfer > 0} onChange={() => st.updateFeatureDraft({ chamfer: d.chamfer || 2 })} /> Chamfer corners</label>
            <label className="k-check"><input type="radio" name="ec-corner" disabled /> Fillet corners</label>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Chamfer distance"><Icon.Chamfer size={14} /><NumberField value={d.chamfer} onChange={(v) => st.updateFeatureDraft({ chamfer: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'weldGusset') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Gusset" icon={<Icon.Gusset />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Supporting Faces">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wg-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the two faces the gusset spans.</span>}</div>
        </Section>
        <Section title="Profile">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.profile === 'triangular' ? 'active' : ''}`} data-tip="Triangular Profile" data-testid="wg-tri" onClick={() => st.updateFeatureDraft({ profile: 'triangular' })}><Icon.Gusset size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.profile === 'polygonal' ? 'active' : ''}`} data-tip="Polygonal Profile" data-testid="wg-poly" onClick={() => st.updateFeatureDraft({ profile: 'polygonal', d3: d.d3 ?? Math.min(d.d1, d.d2) / 2 })}><Icon.Polygon size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Profile distance 1 (d1)"><span className="k-pm-xy">d1</span><NumberField value={d.d1} onChange={(v) => st.updateFeatureDraft({ d1: Math.max(1, v) })} unit={st.doc.units} step={1} min={1} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Profile distance 2 (d2)"><span className="k-pm-xy">d2</span><NumberField value={d.d2} onChange={(v) => st.updateFeatureDraft({ d2: Math.max(1, v) })} unit={st.doc.units} step={1} min={1} /></div>
          {d.profile === 'polygonal' && <div className="k-pm-valuerow k-tip" data-tip="Profile distance 3 (d3)"><span className="k-pm-xy">d3</span><NumberField value={d.d3 ?? 10} onChange={(v) => st.updateFeatureDraft({ d3: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>}
          <div className="k-pm-valuerow k-tip" data-tip="Gusset thickness"><Icon.Depth size={16} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
          <div className="k-pm-stylerow">
            <button className="k-pm-stylebtn k-tip active" data-tip="Both sides (thickness centred)"><Icon.Mirror size={16} /></button>
          </div>
        </Section>
        <Section title="Parameters">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.location === 'start' ? 'active' : ''}`} data-tip="Profile Locates at Start Point" onClick={() => st.updateFeatureDraft({ location: 'start' })}>⇤</button>
            <button className={`k-pm-stylebtn k-tip ${d.location === 'mid' ? 'active' : ''}`} data-tip="Profile Locates at Mid Point" data-testid="wg-mid" onClick={() => st.updateFeatureDraft({ location: 'mid' })}>↔</button>
            <button className={`k-pm-stylebtn k-tip ${d.location === 'end' ? 'active' : ''}`} data-tip="Profile Locates at End Point" onClick={() => st.updateFeatureDraft({ location: 'end' })}>⇥</button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Offset"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: v })} unit={st.doc.units} step={1} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'weldBead') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Weld Bead" icon={<Icon.WeldBead />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Weld Path">
          <label className="k-check"><input type="checkbox" disabled /> Smart Weld Selection Tool</label>
          <div className="k-pm-label">Weld Geometry:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wb-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the two faces that meet at the weld.</span>}</div>
        </Section>
        <Section title="Settings">
          <div className="k-pm-valuerow k-tip" data-tip="Bead size"><Icon.Dimension size={14} /><NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
          <label className="k-check"><input type="checkbox" data-testid="wb-intermittent" checked={!!d.intermittent} onChange={(e) => st.updateFeatureDraft({ intermittent: e.target.checked ? { length: 20, pitch: 40 } : null })} /> Intermittent weld</label>
          {d.intermittent && (
            <>
              <div className="k-pm-valuerow k-tip" data-tip="Weld length"><Icon.Dimension size={14} /><NumberField value={d.intermittent.length} onChange={(v) => st.updateFeatureDraft({ intermittent: { ...d.intermittent!, length: Math.max(0.5, v) } })} unit={st.doc.units} step={5} min={0.5} /></div>
              <div className="k-pm-valuerow k-tip" data-tip="Pitch"><Icon.Pattern size={14} /><NumberField value={d.intermittent.pitch} onChange={(v) => st.updateFeatureDraft({ intermittent: { ...d.intermittent!, pitch: Math.max(1, v) } })} unit={st.doc.units} step={5} min={1} /></div>
            </>
          )}
          <label className="k-check"><input type="checkbox" checked={!!d.bothSides} onChange={(e) => st.updateFeatureDraft({ bothSides: e.target.checked })} /> Both sides</label>
          <div className="k-pm-xyrow">
            <span className="k-pm-xy k-tip" data-tip="From (start offset)">⇤</span><NumberField value={d.from} onChange={(v) => st.updateFeatureDraft({ from: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} />
            <span className="k-pm-xy k-tip" data-tip="To (end offset)">⇥</span><NumberField value={d.to} onChange={(v) => st.updateFeatureDraft({ to: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} />
          </div>
          <label className="k-check"><input type="checkbox" checked={d.symbol !== undefined} onChange={(e) => st.updateFeatureDraft({ symbol: e.target.checked ? 'fillet' : undefined })} /> Define weld symbol</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'stud') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const SIZES: [string, number, number][] = [['M3', 3, 0.5], ['M4', 4, 0.7], ['M5', 5, 0.8], ['M6', 6, 1], ['M8', 8, 1.25], ['M10', 10, 1.5], ['M12', 12, 1.75], ['M16', 16, 2], ['M20', 20, 2.5]];
    return (
      <>
        <Header title="Stud Tool" icon={<Icon.Hole />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Stud">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="studkind" checked={d.onCylinder === undefined} onChange={() => st.updateFeatureDraft({ onCylinder: undefined })} /> Create stud on surface</label>
            <label className="k-check"><input type="radio" name="studkind" data-testid="stud-cylinder" checked={d.onCylinder !== undefined} onChange={() => st.updateFeatureDraft({ onCylinder: null })} /> Apply to cylindrical body</label>
          </div>
          {d.onCylinder !== undefined && <div className="k-selbox" style={{ minHeight: 24 }} data-testid="stud-cylface">{d.onCylinder ? <div className="k-selbox-row"><Icon.Revolve size={12} /> {d.onCylinder.label}</div> : <span className="k-muted">Select the cylindrical face of the body.</span>}</div>}
        </Section>
        <Section title="Standard">
          <select className="k-input" value={d.standard ?? 'ISO'} onChange={(e) => st.updateFeatureDraft({ standard: e.target.value as 'ISO' })}><option>ISO</option><option>DIN</option></select>
          <div className="k-pm-label">Type:</div>
          <select className="k-input"><option>Machine Threads</option></select>
          <div className="k-pm-label">Size:</div>
          <select className="k-input" data-testid="stud-size" value={d.size} onChange={(e) => { const z = SIZES.find((x) => x[0] === e.target.value)!; st.updateFeatureDraft({ size: z[0], diameter: z[1], pitch: z[2] }); }}>
            {SIZES.map((z) => <option key={z[0]}>{z[0]}</option>)}
          </select>
        </Section>
        <Section title="Stud Parameters">
          <div className="k-pm-valuerow k-tip" data-tip="Stud Length"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0.5, v) })} unit={st.doc.units} step={1} autoFocus /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Thread Length"><Icon.Arrow size={14} /><NumberField value={d.threadLength} onChange={(v) => st.updateFeatureDraft({ threadLength: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
          <div className="k-pm-sub">Position on the face</div>
          <div className="k-pm-xyrow">
            <span className="k-pm-xy">x</span><NumberField value={d.point.x} onChange={(v) => st.updateFeatureDraft({ point: { ...d.point, x: v } })} step={1} />
            <span className="k-pm-xy">y</span><NumberField value={d.point.y} onChange={(v) => st.updateFeatureDraft({ point: { ...d.point, y: v } })} step={1} />
          </div>
        </Section>
        <Section title="Thread">
          <label className="k-check"><input type="checkbox" data-testid="stud-cosmetic" checked={d.cosmetic !== false} onChange={(e) => st.updateFeatureDraft({ cosmetic: e.target.checked })} /> Cosmetic thread</label>
          <div className="k-field"><label>Pitch</label><span>{d.pitch} mm</span></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && (st.featureEdit.draft.type === 'splitLine' || st.featureEdit.draft.type === 'projectedCurve')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const split = d.type === 'splitLine';
    return (
      <>
        <Header title={split ? 'Split Line' : 'Projected Curve'} icon={split ? <Icon.Line /> : <Icon.Spline />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Type of Split">
          <div className="k-pm-radios">
            {split ? (
              <>
                <label className="k-check"><input type="radio" name="splittype" data-testid="split-silhouette" checked={d.splitType === 'silhouette'} onChange={() => st.updateFeatureDraft({ splitType: 'silhouette', plane: d.plane ?? 'top' })} /> Silhouette</label>
                <label className="k-check"><input type="radio" name="splittype" checked={(d.splitType ?? 'projection') === 'projection'} onChange={() => st.updateFeatureDraft({ splitType: 'projection' })} /> Projection</label>
                <label className="k-check"><input type="radio" name="splittype" data-testid="split-intersection" checked={d.splitType === 'intersection'} onChange={() => st.updateFeatureDraft({ splitType: 'intersection', plane: d.plane ?? 'top' })} /> Intersection</label>
              </>
            ) : (
              <>
                <label className="k-check"><input type="radio" name="projtype" data-testid="proj-onsketch" checked={!!d.onSketch} onChange={() => st.updateFeatureDraft({ onSketch: true })} /> Sketch on sketch</label>
                <label className="k-check"><input type="radio" name="projtype" checked={!d.onSketch} onChange={() => st.updateFeatureDraft({ onSketch: false })} /> Sketch on faces</label>
              </>
            )}
          </div>
        </Section>
        <Section title="Selections">
          <div className="k-field"><label>Sketch to project</label>
            <select className="k-input" data-testid="curvefeat-sketch" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })}>
              <option value="">Select a sketch…</option>
              {st.doc.features.filter((f) => f.type === 'sketch').map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
            </select>
          </div>
          {split && d.type === 'splitLine' && d.splitType && d.splitType !== 'projection' && (
            <div className="k-field"><label>{d.splitType === 'silhouette' ? 'Direction of Pull' : 'Splitting Plane'}</label>
              <select className="k-input" data-testid="split-plane" value={d.plane ?? ''} onChange={(e) => st.updateFeatureDraft({ plane: e.target.value })}><option value="">Select a plane…</option><option value="front">Front Plane</option><option value="top">Top Plane</option><option value="right">Right Plane</option>{Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>
          )}
          {!split && d.type === 'projectedCurve' && d.onSketch && (
            <div className="k-field"><label>Second sketch</label>
              <select className="k-input" data-testid="proj-sketch2" value={d.sketchId2 ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId2: e.target.value })}>
                <option value="">Select a sketch…</option>
                {st.doc.features.filter((f) => f.type === 'sketch' && (f as { sketchId: string }).sketchId !== d.sketchId).map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
              </select>
            </div>
          )}
          <div className="k-field"><label>{split ? 'Faces to Split' : 'Projection faces'}</label><div className="k-selbox" style={{ minHeight: 24 }}><span className="k-muted">{split && d.type === 'splitLine' && d.splitType === 'silhouette' ? 'The faces that turn away from the direction of pull' : split && d.type === 'splitLine' && d.splitType === 'intersection' ? 'All faces the plane cuts' : 'All faces the projection crosses'}</span></div></div>
          {!split && d.type === 'projectedCurve' && !d.onSketch && <label className="k-check"><input type="checkbox" checked={!!d.reverse} onChange={(e) => st.updateFeatureDraft({ reverse: e.target.checked })} /> Reverse projection</label>}
          {split && d.type === 'splitLine' && (d.splitType ?? 'projection') === 'projection' && <label className="k-check"><input type="checkbox" data-testid="split-single" checked={!!d.single} onChange={(e) => st.updateFeatureDraft({ single: e.target.checked })} /> Single direction</label>}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'crossBreak') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Cross Break" icon={<Icon.Mirror />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Cross-Break Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="xbreak-face">{d.face ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.face.label}</div> : <span className="k-muted">Select a planar face of the sheet.</span>}</div>
          <button className={`k-btn${profileEdit ? ' active' : ''}`} data-testid="xbreak-edit" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Edit Cross-Break</button>
          {profileEdit && (
            <>
              <select className="k-input" style={{ marginTop: 4 }} value={d.lines ?? 'both'} onChange={(e) => st.updateFeatureDraft({ lines: e.target.value as 'both' })}><option value="both">Both diagonals</option><option value="first">First diagonal</option><option value="second">Second diagonal</option></select>
              <div className="k-pm-valuerow k-tip" data-tip="Distance from the corners"><Icon.Dimension size={14} /><NumberField value={d.inset ?? 0} onChange={(v) => st.updateFeatureDraft({ inset: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
            </>
          )}
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Arrow size={14} /></button>
          </div>
          <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>R</span><NumberField value={d.radius} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} /></div>
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(0.01, Math.min(10, v)) })} unit="°" step={0.5} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'hem') {
    const d = st.featureEdit.draft;
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title={d.name} icon={<Icon.Arc />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Edges">
          <div className="k-selbox" style={{ minHeight: 24 }}>{d.edge ? <div className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;1&gt;</div> : <span className="k-muted">Select a straight edge of the sheet in the graphics area.</span>}</div>
          <button className={`k-btn${profileEdit ? ' active' : ''}`} data-testid="hem-editwidth" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Edit Hem Width</button>
          {profileEdit && (
            <div className="k-pm-xyrow">
              <span className="k-pm-xy k-tip" data-tip="Offset from the start of the edge">⇤</span><NumberField value={d.startOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ startOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
              <span className="k-pm-xy k-tip" data-tip="Offset from the end of the edge">⇥</span><NumberField value={d.endOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ endOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
            </div>
          )}
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.position === 'materialInside' ? 'active' : ''}`} data-tip="Material Inside" onClick={() => st.updateFeatureDraft({ position: 'materialInside' })}><Icon.Sheet size={14} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.position === 'materialOutside' ? 'active' : ''}`} data-tip="Bend Outside" onClick={() => st.updateFeatureDraft({ position: 'materialOutside' })}><Icon.Sheet size={14} /></button>
          </div>
        </Section>
        <Section title="Type and Size">
          <div className="k-pm-stylerow">
            {([['closed', 'Closed'], ['open', 'Open'], ['tearDrop', 'Tear Drop'], ['rolled', 'Rolled']] as const).map(([v, tip]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${d.hemType === v ? 'active' : ''}`} data-tip={tip} disabled={v === 'tearDrop' || v === 'rolled'} onClick={() => st.updateFeatureDraft({ hemType: v })}><Icon.Arc size={14} /></button>
            ))}
          </div>
          <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          {d.hemType === 'open' && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>Gap</span><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} /></div>}
        </Section>
        <Section title="Miter Gap" defaultOpen={(d.miterGap ?? 0) > 0}>
          <div className="k-pm-valuerow k-tip" data-tip="Gap distance"><Icon.Dimension size={14} /><NumberField value={d.miterGap ?? 0.1} onChange={(v) => st.updateFeatureDraft({ miterGap: Math.max(0, v) })} unit={st.doc.units} step={0.1} /></div>
        </Section>
        <Section title="Custom Bend Allowance" defaultOpen={!!d.customAllowance} check={!!d.customAllowance} onCheck={(on) => st.updateFeatureDraft({ customAllowance: on ? { type: 'kFactor', value: sm.kFactor } : undefined })}>
          {d.customAllowance && (
            <>
              <select className="k-input" value={d.customAllowance.type} onChange={(e) => st.updateFeatureDraft({ customAllowance: { type: e.target.value as 'kFactor', value: e.target.value === 'kFactor' ? sm.kFactor : e.target.value === 'bendTable' ? 0 : 5 } })}>
                <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option><option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
              </select>
              {d.customAllowance.type !== 'bendTable' && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>{d.customAllowance.type === 'kFactor' ? 'K' : d.customAllowance.type === 'bendAllowance' ? 'BA' : 'BD'}</span><NumberField value={d.customAllowance.value} onChange={(v) => st.updateFeatureDraft({ customAllowance: { ...d.customAllowance!, value: Math.max(0, d.customAllowance!.type === 'kFactor' ? Math.min(1, v) : v) } })} step={d.customAllowance.type === 'kFactor' ? 0.05 : 0.1} /></div>}
            </>
          )}
        </Section>
        <Section title="Custom Relief Type" defaultOpen={!!d.customRelief} check={!!d.customRelief} onCheck={(on) => st.updateFeatureDraft({ customRelief: on ? { type: 'rectangle', ratio: 0.5 } : undefined })}>
          {d.customRelief && (
            <>
              <select className="k-input" value={d.customRelief.type} onChange={(e) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, type: e.target.value as 'rectangle' } })}><option value="rectangle">Rectangle</option><option value="tear">Tear</option><option value="obround">Obround</option></select>
              <div className="k-pm-valuerow k-tip" data-tip="Relief ratio"><span className="k-muted" style={{ minWidth: 18 }}>%</span><NumberField value={d.customRelief.ratio} onChange={(v) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, ratio: Math.max(0.05, Math.min(2, v)) } })} step={0.05} /></div>
            </>
          )}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'edgeFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const useDefault = d.radius === undefined;
    return (
      <>
        <Header title={d.name} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Flange Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }}>{d.edge ? <div className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;1&gt;</div> : <span className="k-muted">Select a straight edge of the sheet in the graphics area.</span>}</div>
          <button className={`k-btn${profileEdit ? ' active' : ''}`} data-testid="flange-editprofile" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Edit Flange Profile</button>
          {profileEdit && (
            <div className="k-pm-xyrow" data-testid="flange-profile">
              <span className="k-pm-xy k-tip" data-tip="Offset from the start of the edge">⇤</span><NumberField value={d.startOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ startOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
              <span className="k-pm-xy k-tip" data-tip="Offset from the end of the edge">⇥</span><NumberField value={d.endOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ endOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
            </div>
          )}
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={useDefault} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow">
            <Icon.Arc size={14} />
            <NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} disabled={useDefault} />
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Gap distance">
            <Icon.Dimension size={14} />
            <NumberField value={d.gap ?? 0} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} />
          </div>
        </Section>
        <Section title="Angle">
          <div className="k-pm-valuerow">
            <Icon.MateAngle size={14} />
            <NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(179, v)) })} unit="°" step={5} min={1} />
          </div>
          <div className={`k-selbox${st.flangePick === 'face' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} data-testid="flange-angleface" onClick={() => useStore.setState({ flangePick: st.flangePick === 'face' ? null : 'face' })}>{d.angleFace ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.angleFace.label} <button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ angleFace: undefined }); }}>×</button></div> : <span className="k-muted">Face (optional)</span>}</div>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="flangeang" disabled={!d.angleFace} checked={d.angleFace?.mode === 'perpendicular'} onChange={() => d.angleFace && st.updateFeatureDraft({ angleFace: { ...d.angleFace, mode: 'perpendicular' } })} /> Perpendicular to face</label>
            <label className="k-check"><input type="radio" name="flangeang" disabled={!d.angleFace} checked={d.angleFace?.mode === 'parallel'} onChange={() => d.angleFace && st.updateFeatureDraft({ angleFace: { ...d.angleFace, mode: 'parallel' } })} /> Parallel to face</label>
          </div>
        </Section>
        <Section title="Flange Length">
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>
            <select className="k-input" data-testid="flange-lengthend" value={d.lengthEnd ?? 'blind'} onChange={(e) => { st.updateFeatureDraft({ lengthEnd: e.target.value as 'blind' }); useStore.setState({ flangePick: e.target.value === 'upToVertex' ? 'vertex' : null }); }}><option value="blind">Blind</option><option value="upToVertex">Up To Vertex</option></select>
          </div>
          {(d.lengthEnd ?? 'blind') === 'blind'
            ? <div className="k-pm-valuerow">
                <Icon.Dimension size={14} />
                <NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus />
              </div>
            : <div className={`k-selbox${st.flangePick === 'vertex' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} onClick={() => useStore.setState({ flangePick: 'vertex' })}>{d.vertex ? <div className="k-selbox-row">{d.vertex.label}</div> : <span className="k-muted">Click a corner of the model.</span>}</div>}
          <div className="k-pm-stylerow">
            {([['outerSharp', 'Outer Virtual Sharp'], ['innerSharp', 'Inner Virtual Sharp'], ['tangentBend', 'Tangent Bend']] as const).map(([v, tip]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${d.lengthMode === v ? 'active' : ''}`} data-tip={tip} onClick={() => st.updateFeatureDraft({ lengthMode: v })}><Icon.Chamfer size={14} /></button>
            ))}
          </div>
        </Section>
        <Section title="Flange Position">
          <div className="k-pm-stylerow">
            {([['materialInside', 'Material Inside'], ['materialOutside', 'Material Outside'], ['bendOutside', 'Bend Outside']] as const).map(([v, tip]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${d.position === v ? 'active' : ''}`} data-tip={tip} onClick={() => st.updateFeatureDraft({ position: v })}><Icon.Sheet size={14} /></button>
            ))}
          </div>
          <label className="k-check"><input type="checkbox" data-testid="flange-trimside" checked={!!d.trimSideBends} onChange={(e) => st.updateFeatureDraft({ trimSideBends: e.target.checked })} /> Trim side bends</label>
          <label className="k-check"><input type="checkbox" data-testid="flange-offset" checked={(d.offset ?? 0) > 0} onChange={(e) => st.updateFeatureDraft({ offset: e.target.checked ? sm.thickness : 0 })} /> Offset</label>
          {(d.offset ?? 0) > 0 && <div className="k-pm-valuerow k-tip" data-tip="Offset distance"><Icon.Dimension size={14} /><NumberField value={d.offset ?? 0} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={0.5} /></div>}
        </Section>
        <Section title="Custom Bend Allowance" defaultOpen={!!d.customAllowance} check={!!d.customAllowance} onCheck={(on) => st.updateFeatureDraft({ customAllowance: on ? { type: 'kFactor', value: sm.kFactor } : undefined })}>
          {d.customAllowance && (
            <>
              <select className="k-input" value={d.customAllowance.type} onChange={(e) => st.updateFeatureDraft({ customAllowance: { type: e.target.value as 'kFactor', value: e.target.value === 'kFactor' ? sm.kFactor : e.target.value === 'bendTable' ? 0 : 5 } })}>
                <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option><option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
              </select>
              {d.customAllowance.type !== 'bendTable' && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>{d.customAllowance.type === 'kFactor' ? 'K' : d.customAllowance.type === 'bendAllowance' ? 'BA' : 'BD'}</span><NumberField value={d.customAllowance.value} onChange={(v) => st.updateFeatureDraft({ customAllowance: { ...d.customAllowance!, value: Math.max(0, d.customAllowance!.type === 'kFactor' ? Math.min(1, v) : v) } })} step={d.customAllowance.type === 'kFactor' ? 0.05 : 0.1} /></div>}
            </>
          )}
        </Section>
        <Section title="Custom Relief Type" defaultOpen={!!d.customRelief} check={!!d.customRelief} onCheck={(on) => st.updateFeatureDraft({ customRelief: on ? { type: 'rectangle', ratio: 0.5 } : undefined })}>
          {d.customRelief && (
            <>
              <select className="k-input" value={d.customRelief.type} onChange={(e) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, type: e.target.value as 'rectangle' } })}><option value="rectangle">Rectangle</option><option value="tear">Tear</option><option value="obround">Obround</option></select>
              <div className="k-pm-valuerow k-tip" data-tip="Relief ratio"><span className="k-muted" style={{ minWidth: 18 }}>%</span><NumberField value={d.customRelief.ratio} onChange={(v) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, ratio: Math.max(0.05, Math.min(2, v)) } })} step={0.05} /></div>
            </>
          )}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'moveBody') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return b ? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? id : id; };
    const bodies = st.featureEdit.featureId ? rebuildDocument(st.doc, st.doc.features.findIndex((f) => f.id === st.featureEdit!.featureId)).bodies : st.rebuild.bodies;
    const vec = (key: 'translate' | 'rotate' | 'origin', labels: [string, string, string], unit: string) => labels.map((label, i) => (
      <div key={label} className="k-pm-valuerow" data-testid={`move-${key}-${i}`}>
        <span className="k-muted" style={{ minWidth: 28 }}>{label}</span>
        <NumberField value={d[key][i]} unit={unit} onChange={(v) => { const next = [...d[key]] as [number, number, number]; next[i] = v; st.updateFeatureDraft({ [key]: next } as never); }} />
      </div>
    ));
    return (
      <>
        <Header title={d.name} icon={<Icon.MoveComponent />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Bodies to Move/Copy">
          <div className="k-selbox" style={{ minHeight: 28 }}>
            {bodies.map((b) => (
              <label key={b.id} className="k-check">
                <input type="checkbox" checked={d.bodies.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...d.bodies, b.id] : d.bodies.filter((x) => x !== b.id) })} /> {bodyName(b.id)}
              </label>
            ))}
          </div>
          <label className="k-check" style={{ marginTop: 6 }}><input type="checkbox" data-testid="move-copy" checked={d.copy} onChange={(e) => st.updateFeatureDraft({ copy: e.target.checked })} /> Copy</label>
          {d.copy && <div className="k-pm-valuerow" data-testid="move-copies"><span className="k-muted" style={{ minWidth: 28 }}>#</span><NumberField value={d.copies} step={1} min={1} onChange={(v) => st.updateFeatureDraft({ copies: Math.max(1, Math.min(250, Math.round(v))) })} /></div>}
        </Section>
        <Section title="Translate">{vec('translate', ['ΔX', 'ΔY', 'ΔZ'], 'mm')}</Section>
        <Section title="Rotate">
          <div className="k-pm-label">Rotation origin</div>
          {vec('origin', ['X', 'Y', 'Z'], 'mm')}
          <div className="k-pm-label">Angles</div>
          {vec('rotate', ['X', 'Y', 'Z'], '°')}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'combine') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return b ? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? id : id; };
    const bodies = st.featureEdit.featureId ? rebuildDocument(st.doc, st.doc.features.findIndex((f) => f.id === st.featureEdit!.featureId)).bodies : st.rebuild.bodies;
    return (
      <>
        <Header title={d.name} icon={<Icon.Combine />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Operation Type">
          <div className="k-pm-radios">
            {([['add', 'Add'], ['subtract', 'Subtract'], ['common', 'Common']] as const).map(([v, label]) => (
              <label key={v} className="k-check"><input type="radio" name="combop" checked={d.op === v} onChange={() => st.updateFeatureDraft({ op: v })} /> {label}</label>
            ))}
          </div>
        </Section>
        {d.op === 'subtract' && (
          <Section title="Main Body">
            <select className="k-input" value={d.mainBody ?? ''} onChange={(e) => st.updateFeatureDraft({ mainBody: e.target.value || undefined })}>
              <option value="">Select the main body…</option>
              {bodies.map((b) => <option key={b.id} value={b.id}>{bodyName(b.id)}</option>)}
            </select>
          </Section>
        )}
        <Section title={d.op === 'subtract' ? 'Bodies to Subtract' : 'Bodies to Combine'}>
          <div className="k-selbox" style={{ minHeight: 28 }}>
            {bodies.map((b) => (
              <label key={b.id} className="k-check">
                <input type="checkbox" checked={d.bodies.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...d.bodies, b.id] : d.bodies.filter((x) => x !== b.id) })} /> {bodyName(b.id)}
              </label>
            ))}
          </div>
          <button className="k-btn" style={{ marginTop: 6 }} onClick={() => st.pushMessage('The result is shown after OK.')}>Show Preview</button>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && st.featureEdit.draft.type === 'rib') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const rsk = st.doc.sketches[d.sketchId];
    return (
      <>
        <Header title={d.name} icon={<Icon.Rib />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Parameters">
          <p className="k-muted" style={{ margin: '0 0 2px' }}>Thickness:</p>
          <div className="k-pm-radios" style={{ flexDirection: 'row', gap: 4 }}>
            {([['first', 'First Side'], ['both', 'Both Sides'], ['second', 'Second Side']] as const).map(([v, tip]) => (
              <button key={v} className={`k-btn icon k-tip ${d.side === v ? 'active' : ''}`} data-tip={tip} onClick={() => st.updateFeatureDraft({ side: v })}>
                <Icon.RibSide side={v} size={16} />
              </button>
            ))}
          </div>
          <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
            <Icon.Dimension size={14} />
            <NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
          </div>
          <p className="k-muted" style={{ margin: '4px 0 2px' }}>Extrusion direction:</p>
          <div className="k-pm-radios" style={{ flexDirection: 'row', gap: 4 }}>
            <button className={`k-btn icon k-tip ${d.direction === 'parallel' ? 'active' : ''}`} data-tip="Parallel to Sketch" onClick={() => st.updateFeatureDraft({ direction: 'parallel' })}><Icon.RibDir dir="parallel" size={16} /></button>
            <button className={`k-btn icon k-tip ${d.direction === 'normal' ? 'active' : ''}`} data-tip="Normal to Sketch" onClick={() => st.updateFeatureDraft({ direction: 'normal' })}><Icon.RibDir dir="normal" size={16} /></button>
          </div>
          <label className="k-check"><input type="checkbox" checked={d.flip} onChange={(e) => st.updateFeatureDraft({ flip: e.target.checked })} /> Flip material side</label>
          <div className="k-pm-valuerow">
            <Icon.Chamfer size={14} />
            <NumberField value={d.draft} onChange={(v) => st.updateFeatureDraft({ draft: Math.max(0, Math.min(45, v)) })} unit="°" step={1} min={0} />
            <label className="k-check" style={{ marginLeft: 4 }}><input type="checkbox" data-testid="rib-draft-outward" disabled={!d.draft} checked={!!d.draftOutward} onChange={(e) => st.updateFeatureDraft({ draftOutward: e.target.checked })} /> Draft outward</label>
          </div>
        </Section>
        <Section title="Selected Contours" defaultOpen={false}>
          <div className="k-selbox" style={{ minHeight: 24 }}>{rsk ? <div className="k-selbox-row"><Icon.Sketch size={12} /> {rsk.name}</div> : <span className="k-muted">Select the sketch of the rib.</span>}</div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  // Mirror, Linear / Circular Pattern, Hole Tool
  if (st.featureEdit && (st.featureEdit.draft.type === 'mirror' || st.featureEdit.draft.type === 'linearPattern' || st.featureEdit.draft.type === 'circularPattern' || st.featureEdit.draft.type === 'sketchPattern' || st.featureEdit.draft.type === 'curvePattern' || st.featureEdit.draft.type === 'tablePattern' || st.featureEdit.draft.type === 'fillPattern' || st.featureEdit.draft.type === 'variablePattern' || st.featureEdit.draft.type === 'hole')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const axisOptions: { id: string; label: string; v: [number, number, number] }[] = [
      { id: 'x', label: 'X axis', v: [1, 0, 0] },
      { id: 'y', label: 'Y axis', v: [0, 1, 0] },
      { id: 'z', label: 'Z axis', v: [0, 0, 1] },
    ];
    const axisId = (v: [number, number, number]) => axisOptions.find((o) => o.v.every((x, i) => Math.abs(x - Math.abs(v[i])) < 1e-6))?.id ?? 'x';
    const seedFeatures = st.doc.features.filter((f) => f.type === 'extrude' || f.type === 'revolve');
    const planeOptions = [
      { id: 'front', label: 'Front Plane' },
      { id: 'top', label: 'Top Plane' },
      { id: 'right', label: 'Right Plane' },
      ...Object.values(st.doc.planes).map((pl) => ({ id: pl.id, label: pl.name })),
    ];
    const errBox = err ? (
      <Section title="Rebuild Errors">
        <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
      </Section>
    ) : null;
    if (d.type === 'mirror') {
      return (
        <>
          <Header title="Mirror" icon={<Icon.Mirror />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Mirror Face/Plane">
            <select className="k-input" value={d.plane} onChange={(e) => st.updateFeatureDraft({ plane: e.target.value })}>
              {planeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </Section>
          <Section title="Features to Mirror" defaultOpen={!!d.featureIds?.length}>
            <div className="k-selbox" style={{ minHeight: 30 }} data-testid="mirror-features">
              {st.doc.features.filter((f) => isSketchBased(f) && f.type !== 'sketch').map((f) => <label key={f.id} className="k-check"><input type="checkbox" checked={!!d.featureIds?.includes(f.id)} onChange={(e) => st.updateFeatureDraft({ featureIds: e.target.checked ? [...(d.featureIds ?? []), f.id] : (d.featureIds ?? []).filter((x) => x !== f.id), faces: undefined })} /> {f.name}</label>)}
              {!st.doc.features.some((f) => isSketchBased(f) && f.type !== 'sketch') && <span className="k-muted">No features to mirror.</span>}
            </div>
          </Section>
          <Section title="Faces to Mirror" defaultOpen={!!d.faces?.length}>
            <div className={`k-selbox${st.mirrorPick === 'faces' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 30 }} data-testid="mirror-faces" onClick={() => useStore.setState({ mirrorPick: st.mirrorPick === 'faces' ? null : 'faces' })}>
              {d.faces?.length ? d.faces.map((f) => <div key={f.label} className="k-selbox-row">{f.label}<button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ faces: d.faces!.filter((x) => x.label !== f.label) }); }}>×</button></div>) : <span className="k-muted">Select faces in the graphics area.</span>}
            </div>
          </Section>
          <Section title="Bodies to Mirror" defaultOpen={!d.featureIds?.length && !d.faces?.length}>
            <div className="k-selbox" style={{ minHeight: 24 }} data-testid="mirror-bodies">
              {st.rebuild.bodies.length > 1 ? st.rebuild.bodies.map((b, i) => <label key={b.id} className="k-check"><input type="checkbox" checked={!d.bodies?.length || d.bodies.includes(b.id)} onChange={(e) => { const all = st.rebuild.bodies.map((x) => x.id); const cur = d.bodies?.length ? d.bodies : all; const next = e.target.checked ? [...cur, b.id] : cur.filter((x) => x !== b.id); st.updateFeatureDraft({ bodies: next.length === all.length ? undefined : next }); }} /> {st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? `Body${i + 1}`}</label>) : <div className="k-selbox-row">{st.rebuild.bodies[0] ? 'Solid Body' : '—'}</div>}
            </div>
          </Section>
          <Section title="Options">
            <label className="k-check"><input type="checkbox" data-testid="mirror-merge" checked={d.mergeSolids !== false} onChange={(e) => st.updateFeatureDraft({ mergeSolids: e.target.checked })} /> Merge solids</label>
            <label className="k-check"><input type="checkbox" data-testid="mirror-knit" checked={!!d.knitSurfaces} disabled={!d.faces?.length} onChange={(e) => st.updateFeatureDraft({ knitSurfaces: e.target.checked })} /> Knit surfaces</label>
            <label className="k-check"><input type="checkbox" data-testid="mirror-propagate" checked={d.propagateVisual !== false} onChange={(e) => st.updateFeatureDraft({ propagateVisual: e.target.checked })} /> Propagate visual properties</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="mirpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => { st.updateFeatureDraft({ previewMode: 'full' }); if (!st.detailedPreview) st.toggleDetailedPreview(); }} /> Full preview</label>
              <label className="k-check"><input type="radio" name="mirpreview" checked={d.previewMode === 'partial'} onChange={() => { st.updateFeatureDraft({ previewMode: 'partial' }); if (st.detailedPreview) st.toggleDetailedPreview(); }} /> Partial preview</label>
            </div>
          </Section>
          {errBox}
        </>
      );
    }
    if (d.type === 'hole') {
      return (
        <>
          <Header title={d.simple ? 'Hole' : d.advanced ? 'Advanced Hole' : 'Hole Specification'} icon={<Icon.Hole />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          {d.simple && (
            <Section title="Direction 1" data-testid="simplehole">
              <select className="k-input" value={d.depth > 0 ? 'blind' : 'throughAll'} onChange={(e) => st.updateFeatureDraft({ depth: e.target.value === 'blind' ? 10 : 0 })}><option value="blind">Blind</option><option value="throughAll">Through All</option></select>
              {d.depth > 0 && <div className="k-pm-valuerow k-tip" data-tip="Depth"><Icon.Depth size={16} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.1, v) })} unit={st.doc.units} step={1} min={0.1} /></div>}
              <div className="k-pm-valuerow k-tip" data-tip="Hole Diameter"><span className="k-pm-xy">⌀</span><NumberField value={d.diameter} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} autoFocus /></div>
              <p className="k-muted">Click the face to place the hole; drag or dimension it afterwards.</p>
            </Section>
          )}
          {d.advanced && (
            <Section title="Far Side" check={!!d.farSide} onCheck={(on) => st.updateFeatureDraft({ farSide: on ? { kind: 'countersink', diameter: 10, depth: 2, angle: 90 } : undefined })}>
              {d.farSide && (
                <div data-testid="adv-farside">
                  <div className="k-pm-stylerow">
                    <button className={`k-pm-stylebtn k-tip ${d.farSide.kind === 'counterbore' ? 'active' : ''}`} data-tip="Counterbore" onClick={() => st.updateFeatureDraft({ farSide: { ...d.farSide!, kind: 'counterbore' } })}><HoleTypeIcon kind="counterbore" /></button>
                    <button className={`k-pm-stylebtn k-tip ${d.farSide.kind === 'countersink' ? 'active' : ''}`} data-tip="Countersink" onClick={() => st.updateFeatureDraft({ farSide: { ...d.farSide!, kind: 'countersink' } })}><HoleTypeIcon kind="countersink" /></button>
                  </div>
                  <div className="k-pm-valuerow k-tip" data-tip="Far Side Diameter"><Icon.Dimension size={14} /><NumberField value={d.farSide.diameter} onChange={(v) => st.updateFeatureDraft({ farSide: { ...d.farSide!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /></div>
                  {d.farSide.kind === 'counterbore' ? (
                    <div className="k-pm-valuerow k-tip" data-tip="Far Side Depth"><Icon.Arrow size={14} /><NumberField value={d.farSide.depth} onChange={(v) => st.updateFeatureDraft({ farSide: { ...d.farSide!, depth: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /></div>
                  ) : (
                    <div className="k-pm-valuerow k-tip" data-tip="Far Side Angle"><Icon.MateAngle size={14} /><NumberField value={d.farSide.angle} onChange={(v) => st.updateFeatureDraft({ farSide: { ...d.farSide!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={1} /></div>
                  )}
                </div>
              )}
            </Section>
          )}
          <div className="k-pm-tabs">
            <button className={holeTab === 'type' ? 'active' : ''} onClick={() => setHoleTab('type')}>Type</button>
            <button className={holeTab === 'positions' ? 'active' : ''} onClick={() => setHoleTab('positions')}>Positions</button>
          </div>
          {holeTab === 'type' && !d.simple && (<>
          <Section title="Hole Type">
            <div className="k-holetypes" data-testid="hole-types">
              {HOLE_TYPES.map((t) => (
                <button key={t.id} className={`k-pm-typebtn k-tip ${d.holeType === t.id ? 'active' : ''}`} data-tip={t.label} disabled={!t.enabled} onClick={() => { if (!t.enabled) return; const sz = holeSizesFor(holeStd).find((h) => h.size === holeSize); st.updateFeatureDraft(t.id === 'tap' && sz ? { holeType: 'tap', diameter: sz.tap, threadDiameter: Number(sz.size.slice(1)), pitch: sz.pitch, sizeName: sz.size } : { holeType: t.id as 'simple', ...(sz ? { diameter: sz.fit[holeFit] } : {}) }); }}><HoleTypeIcon kind={t.id} /></button>
              ))}
            </div>
            <div className="k-pm-label">Standard:</div>
            <select className="k-input" data-testid="hole-standard" value={holeStd} onChange={(e) => { const std = e.target.value; setHoleStd(std); const first = holeSizesFor(std)[0]; setHoleSize(std === 'ANSI Inch' ? first.size : 'M6'); const sz = holeSizesFor(std).find((h) => h.size === (std === 'ANSI Inch' ? first.size : 'M6')); if (sz) st.updateFeatureDraft({ diameter: sz.fit[holeFit], cbDiameter: sz.cb, cbDepth: sz.cbDepth, csDiameter: sz.cs, sizeName: sz.size }); }}><option>ISO</option><option>ANSI Metric</option><option>ANSI Inch</option><option>DIN</option><option>JIS</option></select>
            <div className="k-pm-label">Type:</div>
            <select className="k-input" data-testid="hole-subtype" value={d.holeSubtype ?? (d.holeType === 'tap' ? 'Tapped hole' : d.holeType === 'simple' ? 'Drill sizes' : d.holeType === 'countersink' ? 'Flat Head Screw - ISO 10642' : 'Socket Head Cap Screw - ISO 4762')} onChange={(e) => st.updateFeatureDraft(holeSubtypePatch(e.target.value, HOLE_SIZES.find((h) => h.size === holeSize), holeFit, d))}>
              {(d.holeType === 'tap' ? ['Tapped hole', 'Bottoming tapped hole'] : d.holeType === 'simple' ? ['Drill sizes', 'Screw Clearances', 'Tap Drills', 'Dowel Holes'] : d.holeType === 'countersink' ? ['Flat Head Screw - ISO 10642', 'Raised Countersunk Head - ISO 2010', 'Countersunk Head - ISO 7046'] : ['Hex Bolt - ISO 4014', 'Socket Head Cap Screw - ISO 4762', 'Pan Cross Head - ISO 7045', 'Hex Screw - ISO 4017']).map((o) => <option key={o}>{o}</option>)}
            </select>
          </Section>
          <Section title="Hole Specifications">
            <div className="k-pm-label">Size:</div>
            <div><select className="k-input" data-testid="hole-size" value={holeSize} onChange={(e) => { setHoleSize(e.target.value); const sz = holeSizesFor(holeStd).find((h) => h.size === e.target.value); if (sz) st.updateFeatureDraft(d.holeType === 'tap' ? { diameter: sz.tap, threadDiameter: Number(sz.size.slice(1)), pitch: sz.pitch, sizeName: sz.size } : { diameter: sz.fit[holeFit], cbDiameter: sz.cb, cbDepth: sz.cbDepth, csDiameter: sz.cs, sizeName: sz.size }); }}>{holeSizesFor(holeStd).map((h) => <option key={h.size}>{h.size}</option>)}</select></div>
            <div className="k-pm-label">Fit:</div>
            <div><select className="k-input" value={holeFit} onChange={(e) => { const f = e.target.value as 'Close' | 'Normal' | 'Loose'; setHoleFit(f); const sz = holeSizesFor(holeStd).find((h) => h.size === holeSize); if (sz) st.updateFeatureDraft({ diameter: sz.fit[f] }); }}><option>Close</option><option>Normal</option><option>Loose</option></select></div>
            <label className="k-check"><input type="checkbox" checked={customSizing} onChange={(e) => setCustomSizing(e.target.checked)} /> Show custom sizing</label>
            {customSizing && <div className="k-pm-valuerow k-tip" data-tip="Through Hole Diameter"><Icon.Hole size={14} /><NumberField value={d.diameter} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>}
            {customSizing && d.holeType === 'counterbore' && (
              <>
                <div className="k-pm-valuerow k-tip" data-tip="Counterbore Diameter"><Icon.Dimension size={14} /><NumberField value={d.cbDiameter} onChange={(v) => st.updateFeatureDraft({ cbDiameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
                <div className="k-pm-valuerow k-tip" data-tip="Counterbore Depth"><Icon.Arrow size={14} /><NumberField value={d.cbDepth} onChange={(v) => st.updateFeatureDraft({ cbDepth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
              </>
            )}
            {customSizing && d.holeType === 'countersink' && (
              <>
                <div className="k-pm-valuerow k-tip" data-tip="Countersink Diameter"><Icon.Dimension size={14} /><NumberField value={d.csDiameter} onChange={(v) => st.updateFeatureDraft({ csDiameter: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
                <div className="k-pm-valuerow k-tip" data-tip="Countersink Angle"><Icon.MateAngle size={14} /><NumberField value={d.csAngle} onChange={(v) => st.updateFeatureDraft({ csAngle: Math.max(10, Math.min(170, v)) })} unit="°" step={1} /></div>
              </>
            )}
            {customSizing && <button className="k-btn" style={{ marginTop: 4 }} onClick={() => { const sz = holeSizesFor(holeStd).find((h) => h.size === holeSize); if (sz) st.updateFeatureDraft({ diameter: sz.fit[holeFit], cbDiameter: sz.cb, cbDepth: sz.cbDepth, csDiameter: sz.cs, csAngle: 90 }); }}>Restore Default Values</button>}
          </Section>
          <Section title="End Condition">
            <div className="k-pm-valuerow">
              <Icon.Arrow size={14} />
              <select className="k-input" value={d.depth > 0 ? 'blind' : 'throughAll'} onChange={(e) => st.updateFeatureDraft({ depth: e.target.value === 'blind' ? 10 : 0 })}>
                <option value="throughAll">Through All</option>
                <option value="blind">Blind</option>
              </select>
            </div>
            {d.depth > 0 && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.1, v) })} unit={st.doc.units} step={1} /></div>}
          </Section>
          <Section title="Options">
            {d.holeType === 'tap' && <label className="k-check"><input type="checkbox" checked={d.cosmeticThread !== false} onChange={(e) => st.updateFeatureDraft({ cosmeticThread: e.target.checked })} /> Cosmetic thread</label>}
            {d.holeType === 'tap' && <label className="k-check"><input type="checkbox" checked={d.threadCallout !== false} onChange={(e) => st.updateFeatureDraft({ threadCallout: e.target.checked })} /> With thread callout</label>}
            {d.holeType === 'counterbore' && <label className="k-check"><input type="checkbox" data-testid="hole-headclear" checked={d.headClearance !== undefined} onChange={(e) => st.updateFeatureDraft({ headClearance: e.target.checked ? 1 : undefined })} /> Head clearance</label>}
            {d.headClearance !== undefined && d.holeType === 'counterbore' && <div className="k-pm-valuerow k-tip" data-tip="Head clearance"><Icon.Dimension size={14} /><NumberField value={d.headClearance} onChange={(v) => st.updateFeatureDraft({ headClearance: Math.max(0, v) })} unit={st.doc.units} step={0.5} /></div>}
            {d.holeType !== 'countersink' && <label className="k-check"><input type="checkbox" data-testid="hole-nearcs" checked={!!d.nearCs} onChange={(e) => st.updateFeatureDraft({ nearCs: e.target.checked ? { diameter: (d.holeType === 'counterbore' ? d.cbDiameter : d.diameter) + 1, angle: 90 } : undefined })} /> Near side countersink</label>}
            {d.nearCs && (
              <div className="k-pm-xyrow"><span className="k-pm-xy">⌀</span><NumberField value={d.nearCs.diameter} onChange={(v) => st.updateFeatureDraft({ nearCs: { ...d.nearCs!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /><span className="k-pm-xy">∠</span><NumberField value={d.nearCs.angle} onChange={(v) => st.updateFeatureDraft({ nearCs: { ...d.nearCs!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={5} /></div>
            )}
            {d.holeType === 'counterbore' && <label className="k-check"><input type="checkbox" data-testid="hole-underhead" checked={!!d.underHeadCs} onChange={(e) => st.updateFeatureDraft({ underHeadCs: e.target.checked ? { diameter: d.diameter + 1, angle: 90 } : undefined })} /> Under head countersink</label>}
            {d.underHeadCs && d.holeType === 'counterbore' && (
              <div className="k-pm-xyrow"><span className="k-pm-xy">⌀</span><NumberField value={d.underHeadCs.diameter} onChange={(v) => st.updateFeatureDraft({ underHeadCs: { ...d.underHeadCs!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /><span className="k-pm-xy">∠</span><NumberField value={d.underHeadCs.angle} onChange={(v) => st.updateFeatureDraft({ underHeadCs: { ...d.underHeadCs!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={5} /></div>
            )}
            <label className="k-check"><input type="checkbox" data-testid="hole-farcs" checked={!!d.farCs} onChange={(e) => st.updateFeatureDraft({ farCs: e.target.checked ? { diameter: d.diameter + 1, angle: 90 } : undefined })} /> Far side countersink</label>
            {d.farCs && (
              <div className="k-pm-xyrow"><span className="k-pm-xy">⌀</span><NumberField value={d.farCs.diameter} onChange={(v) => st.updateFeatureDraft({ farCs: { ...d.farCs!, diameter: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} /><span className="k-pm-xy">∠</span><NumberField value={d.farCs.angle} onChange={(v) => st.updateFeatureDraft({ farCs: { ...d.farCs!, angle: Math.max(10, Math.min(170, v)) } })} unit="°" step={5} /></div>
            )}
          </Section>
          </>)}
          {holeTab === 'positions' && (
          <Section title="Hole Position(s)">
            {!d.plane ? (
              <p className="k-pm-message">Select a planar face first, then click Hole Tool.</p>
            ) : d.points.length === 0 ? (
              <p className="k-pm-message">Click on the face to place the hole positions.</p>
            ) : (
              <ul className="k-list k-pm-edgelist">
                {d.points.map((pt, i) => <li key={i}>Point{i + 1}: {pt.x.toFixed(2)}, {pt.y.toFixed(2)}</li>)}
              </ul>
            )}
            {d.points.length > 0 && <Button onClick={() => st.updateFeatureDraft({ points: [] })}>Clear positions</Button>}
          </Section>
          )}
          {errBox}
        </>
      );
    }
    const isLinear = d.type === 'linearPattern';
    // the seed's sketch: its points (Selected point) and dimensions (Instances to Vary)
    const seedSketch = () => { const f = st.doc.features.find((x) => x.id === d.featureIds[0]) as { sketchId?: string } | undefined; return f?.sketchId ? st.doc.sketches[f.sketchId] : undefined; };
    const seedPoints = () => {
      const sk = seedSketch();
      if (!sk) return [] as { label: string; w: [number, number, number] }[];
      const pl = resolvePlaneDef(st.doc, sk.plane);
      return Object.entries(sk.points).filter(([id]) => id !== sk.origin).map(([, p], i) => ({ label: `Point${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`, w: [0, 1, 2].map((k) => pl.origin[k] + pl.u[k] * p.x + pl.v[k] * p.y) as [number, number, number] }));
    };
    const seedDims = () => { const sk = seedSketch(); return sk ? sk.constraintOrder.map((id) => sk.constraints[id]).filter((c) => c && c.value !== undefined && !c.driven) : []; };
    return (
      <>
        <Header title={({ sketchPattern: 'Sketch Driven Pattern', curvePattern: 'Curve Driven Pattern', tablePattern: 'Table Driven Pattern', fillPattern: 'Fill Pattern', variablePattern: 'Variable Pattern', linearPattern: 'Linear Pattern', circularPattern: 'Circular Pattern' } as Record<string, string>)[d.type] ?? d.name} icon={<Icon.Pattern />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {(() => {
          // more instances than the limit: say so instead of cutting the pattern off silently (F81)
          const n = d.type === 'linearPattern' ? Math.max(1, d.dir1?.count ?? 1) * Math.max(1, d.dir2?.count ?? 1) - 1 : d.type === 'circularPattern' ? Math.max(1, d.count ?? 1) - 1 : 0;
          return n > MAX_PATTERN_INSTANCES ? <p className="k-pm-message warn" data-testid="pattern-limit">{n} instances requested: the maximum is {MAX_PATTERN_INSTANCES}. Lower the counts; OK is refused above the limit.</p> : null;
        })()}
        {d.type === 'curvePattern' ? (
          <Section title="Direction 1">
            <div className="k-field"><label>Pattern Direction (curve)</label>
              <select className="k-input" data-testid="crv-sketch" value={d.curve?.sketchId ?? ''} onChange={(e) => st.updateFeatureDraft({ curve: { ...d.curve!, sketchId: e.target.value } })}>
                <option value="">Select a sketch…</option>
                {st.doc.features.filter((f) => f.type === 'sketch').map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
              </select>
            </div>
            <div className="k-pm-valuerow"><button className={`k-pm-stylebtn k-tip ${d.curve?.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ curve: { ...d.curve!, reverse: !d.curve?.reverse } })}><Icon.ReverseDir size={16} /></button></div>
            <div className="k-field"><label>Number of Instances</label><NumberField value={d.curve?.count ?? 4} onChange={(v) => st.updateFeatureDraft({ curve: { ...d.curve!, count: Math.max(1, Math.min(200, Math.round(v))) } })} step={1} min={1} /></div>
            <label className="k-check"><input type="checkbox" checked={!!d.curve?.equal} onChange={(e) => st.updateFeatureDraft({ curve: { ...d.curve!, equal: e.target.checked } })} /> Equal spacing</label>
            {!d.curve?.equal && <div className="k-field"><label>Spacing</label><NumberField value={d.curve?.spacing ?? 20} onChange={(v) => st.updateFeatureDraft({ curve: { ...d.curve!, spacing: Math.max(0.1, v) } })} unit={st.doc.units} step={1} /></div>}
            <div className="k-pm-sub">Curve method / Alignment method</div>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="crvalign" checked={!d.curve?.tangent} onChange={() => st.updateFeatureDraft({ curve: { ...d.curve!, tangent: false } })} /> Transform curve (align to seed)</label>
              <label className="k-check"><input type="radio" name="crvalign" checked={!!d.curve?.tangent} onChange={() => st.updateFeatureDraft({ curve: { ...d.curve!, tangent: true } })} /> Tangent to curve</label>
            </div>
          </Section>
        ) : d.type === 'tablePattern' ? (
          <Section title="Table">
            <div className="k-field"><label>Coordinate system</label>
              <select className="k-input" value={d.csysId ?? ''} onChange={(e) => st.updateFeatureDraft({ csysId: e.target.value || undefined })}>
                <option value="">Sketch plane of the seed</option>
                {(st.doc.refGeometry ?? []).filter((r) => r.kind === 'csys').map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <table className="k-pm-table" data-testid="tpattern-table">
              <thead><tr><th>Point</th><th>X</th><th>Y</th><th /></tr></thead>
              <tbody>
                <tr><td>0</td><td className="k-muted">0</td><td className="k-muted">0</td><td /></tr>
                {(d.table ?? []).map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td><NumberField value={r.x} onChange={(v) => st.updateFeatureDraft({ table: d.table!.map((q, j) => (j === i ? { ...q, x: v } : q)) })} step={1} /></td>
                    <td><NumberField value={r.y} onChange={(v) => st.updateFeatureDraft({ table: d.table!.map((q, j) => (j === i ? { ...q, y: v } : q)) })} step={1} /></td>
                    <td><button className="k-btn ghost icon" title="Delete row" onClick={() => st.updateFeatureDraft({ table: d.table!.filter((_, j) => j !== i) })}><Icon.Trash size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button data-testid="tpattern-add" onClick={() => { const last = d.table?.[d.table.length - 1] ?? { x: 0, y: 0 }; st.updateFeatureDraft({ table: [...(d.table ?? []), { x: last.x + 20, y: last.y }] }); }}>Add point</Button>
          </Section>
        ) : d.type === 'fillPattern' ? (
          <>
            <Section title="Fill Boundary">
              <div className="k-selbox" style={{ minHeight: 24 }} data-testid="fill-face">{d.fill ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.fill.label}</div> : <span className="k-muted">Select a planar face, then start Fill Pattern again.</span>}</div>
            </Section>
            {d.fill && (
              <Section title="Pattern Layout">
                <div className="k-pm-stylerow">
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'circular' ? 'active' : ''}`} data-tip="Circular" data-testid="fill-circular" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'circular' } })}><Icon.Circle size={14} /></button>
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'polygon' ? 'active' : ''}`} data-tip="Polygon" data-testid="fill-polygon" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'polygon', sides: d.fill!.sides ?? 6 } })}><Icon.Polygon size={14} /></button>
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'hex' ? 'active' : ''}`} data-tip="Perforation" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'hex' } })}>⬡</button>
                  <button className={`k-pm-stylebtn k-tip ${d.fill.layout === 'square' ? 'active' : ''}`} data-tip="Square" onClick={() => st.updateFeatureDraft({ fill: { ...d.fill!, layout: 'square' } })}>▦</button>
                </div>
                <div className="k-field"><label>Instance Spacing</label><NumberField value={d.fill.spacing} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, spacing: Math.max(0.5, v) } })} unit={st.doc.units} step={1} /></div>
                <div className="k-field"><label>Margins</label><NumberField value={d.fill.margin} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, margin: Math.max(0, v) } })} unit={st.doc.units} step={0.5} /></div>
                {d.fill.layout === 'polygon' && <div className="k-field"><label>Polygon sides</label><NumberField value={d.fill.sides ?? 6} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, sides: Math.max(3, Math.round(v)) } })} step={1} min={3} /></div>}
                <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
                  <button className="k-btn" data-testid="fill-validate" onClick={() => st.pushMessage(`The pattern makes ${st.rebuild.bodies.length ? (st.rebuild.errors[d.id] ? 0 : (st.doc.features.find((x) => x.id === d.id) ? 'the shown' : 'the previewed')) : 0} instances; see the preview.`, 'info')}>Validate Count</button>
                  <label className="k-check"><input type="checkbox" data-testid="fill-seedcut" checked={d.fill.seedCut !== undefined} onChange={(e) => st.updateFeatureDraft({ fill: { ...d.fill!, seedCut: e.target.checked ? 3 : undefined } })} /> Create seed cut</label>
                </div>
                {d.fill.seedCut !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Seed cut diameter"><Icon.Circle size={14} /><NumberField value={d.fill.seedCut} onChange={(v) => st.updateFeatureDraft({ fill: { ...d.fill!, seedCut: Math.max(0.1, v) } })} unit={st.doc.units} step={0.5} min={0.1} /></div>}
              </Section>
            )}
          </>
        ) : d.type === 'variablePattern' ? (
          <Section title="Pattern Table">
            <select className="k-input" value={axisId(d.variable?.dir ?? [1, 0, 0])} onChange={(e) => st.updateFeatureDraft({ variable: { ...d.variable!, dir: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
              {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {(() => {
              const seed = st.doc.features.find((f) => f.id === d.featureIds[0]) as { sketchId?: string } | undefined;
              const sk = seed?.sketchId ? st.doc.sketches[seed.sketchId] : undefined;
              const dims = sk ? sk.constraintOrder.map((id) => sk.constraints[id]).filter((c) => c && c.value !== undefined && !c.driven) : [];
              return (
                <>
                  <table className="k-pm-table" data-testid="varpattern-table">
                    <thead><tr><th>#</th><th>Offset</th>{dims.map((c, i) => <th key={c.id}>D{i + 1}</th>)}</tr></thead>
                    <tbody>
                      {(d.variable?.rows ?? []).map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><NumberField value={r.offset} onChange={(v) => st.updateFeatureDraft({ variable: { ...d.variable!, rows: d.variable!.rows.map((q, j) => (j === i ? { ...q, offset: v } : q)) } })} step={1} /></td>
                          {dims.map((c) => <td key={c.id}><NumberField value={r.values[c.id] ?? c.value!} onChange={(v) => st.updateFeatureDraft({ variable: { ...d.variable!, rows: d.variable!.rows.map((q, j) => (j === i ? { ...q, values: { ...q.values, [c.id]: v } } : q)) } })} step={1} /></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button data-testid="varpattern-add" onClick={() => { const rows = d.variable?.rows ?? []; const last = rows[rows.length - 1]; st.updateFeatureDraft({ variable: { ...d.variable!, rows: [...rows, { offset: (last?.offset ?? 0) + 25, values: { ...(last?.values ?? {}) } }] } }); }}>Add Instance</Button>
                  {!dims.length && <p className="k-muted">The seed sketch has no dimensions to vary; instances are copies.</p>}
                </>
              );
            })()}
          </Section>
        ) : d.type === 'sketchPattern' ? (
          <Section title="Selections">
            <div className="k-field"><label>Reference Sketch</label>
              <select className="k-input" value={d.sketchId ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="skpattern-sketch">
                <option value="">Select a sketch…</option>
                {st.doc.features.filter((f) => f.type === 'sketch').map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
              </select>
            </div>
            <div className="k-pm-sub">Reference point</div>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="skpref" checked={!d.refPoint} onChange={() => st.updateFeatureDraft({ refPoint: null })} /> Centroid</label>
              <label className="k-check"><input type="radio" name="skpref" data-testid="skpattern-selpoint" checked={!!d.refPoint} onChange={() => { const pts = seedPoints(); if (pts.length) st.updateFeatureDraft({ refPoint: pts[0].w }); }} /> Selected point</label>
            </div>
            {d.refPoint && (
              <select className="k-input" data-testid="skpattern-point" value={seedPoints().findIndex((p) => p.w.every((x, i) => Math.abs(x - d.refPoint![i]) < 1e-6))} onChange={(e) => st.updateFeatureDraft({ refPoint: seedPoints()[Number(e.target.value)].w })}>
                {seedPoints().map((p, i) => <option key={i} value={i}>{p.label}</option>)}
              </select>
            )}
          </Section>
        ) : isLinear ? (
          <>
            <Section title="Direction 1">
              <select className="k-input" value={axisId(d.dir1?.axis ?? [1, 0, 0])} onChange={(e) => st.updateFeatureDraft({ dir1: { ...(d.dir1 ?? { spacing: 20, count: 3 }), axis: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
                {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <div className="k-pm-valuerow"><button className={`k-pm-stylebtn k-tip ${(d.dir1?.axis[0] ?? 1) + (d.dir1?.axis[1] ?? 0) + (d.dir1?.axis[2] ?? 0) < 0 ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ dir1: { ...d.dir1!, axis: d.dir1!.axis.map((x) => -x) as [number, number, number] } })}><Icon.ReverseDir size={16} /></button><span className="k-muted">Spacing and instances</span></div>
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="lpmode" checked={!d.upTo1} onChange={() => st.updateFeatureDraft({ upTo1: undefined })} /> Spacing and instances</label>
                <label className="k-check"><input type="radio" name="lpmode" data-testid="lpattern-upto" checked={!!d.upTo1} onChange={() => st.updateFeatureDraft({ upTo1: { plane: 'right', offset: 0 } })} /> Up to reference</label>
              </div>
              {d.upTo1 && (
                <>
                  <div className="k-field"><label>Reference</label>
                    <select className="k-input" data-testid="lpattern-ref" value={d.upTo1.plane} onChange={(e) => st.updateFeatureDraft({ upTo1: { ...d.upTo1!, plane: e.target.value } })}>
                      <option value="front">Front Plane</option><option value="top">Top Plane</option><option value="right">Right Plane</option>
                      {Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="k-field"><label>Offset distance</label><NumberField value={d.upTo1.offset} onChange={(v) => st.updateFeatureDraft({ upTo1: { ...d.upTo1!, offset: v } })} unit={st.doc.units} step={1} /></div>
                </>
              )}
              {!d.upTo1 && <div className="k-field"><label>Spacing</label><NumberField value={d.dir1?.spacing ?? 20} onChange={(v) => st.updateFeatureDraft({ dir1: { ...d.dir1!, spacing: Math.max(0.1, v) } })} unit={st.doc.units} step={1} /></div>}
              <div className="k-field"><label>Instances</label><NumberField value={d.dir1?.count ?? 3} onChange={(v) => st.updateFeatureDraft({ dir1: { ...d.dir1!, count: Math.max(1, Math.min(200, Math.round(v))) } })} step={1} min={1} /></div>
            </Section>
            <Section title="Direction 2" defaultOpen={!!d.dir2} check={!!d.dir2} onCheck={(on) => st.updateFeatureDraft({ dir2: on ? { axis: [0, 0, 1], spacing: 20, count: 2 } : undefined })}>
              {d.dir2 && (
                <>
                  <select className="k-input" value={axisId(d.dir2.axis)} onChange={(e) => st.updateFeatureDraft({ dir2: { ...d.dir2!, axis: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
                    {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <div className="k-field"><label>Spacing</label><NumberField value={d.dir2.spacing} onChange={(v) => st.updateFeatureDraft({ dir2: { ...d.dir2!, spacing: Math.max(0.1, v) } })} unit={st.doc.units} step={1} /></div>
                  <div className="k-field"><label>Instances</label><NumberField value={d.dir2.count} onChange={(v) => st.updateFeatureDraft({ dir2: { ...d.dir2!, count: Math.max(1, Math.min(200, Math.round(v))) } })} step={1} min={1} /></div>
                </>
              )}
              <label className="k-check"><input type="checkbox" data-testid="pattern-seedonly" checked={!!d.seedOnly} onChange={(e) => st.updateFeatureDraft({ seedOnly: e.target.checked })} /> Pattern seed only</label>
        </Section>
          </>
        ) : (
          <Section title="Direction 1">
            <select className="k-input" value={axisId(d.axis?.dir ?? [0, 1, 0])} onChange={(e) => st.updateFeatureDraft({ axis: { origin: d.axis?.origin ?? [0, 0, 0], dir: axisOptions.find((o) => o.id === e.target.value)!.v } })}>
              {axisOptions.map((o) => <option key={o.id} value={o.id}>{o.label} (through the origin)</option>)}
            </select>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="cpspacing" data-testid="cpattern-instance" checked={!!d.instanceSpacing} onChange={() => st.updateFeatureDraft({ instanceSpacing: true, angle: Math.min(d.angle ?? 360, 360 / Math.max(1, (d.count ?? 4))) })} /> Instance spacing</label>
              <label className="k-check"><input type="radio" name="cpspacing" checked={!d.instanceSpacing} onChange={() => st.updateFeatureDraft({ instanceSpacing: false, angle: 360 })} /> Equal spacing</label>
            </div>
            <div className="k-field"><label>Angle</label><NumberField value={d.angle ?? 360} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(360, v)) })} unit="°" step={5} /></div>
            <div className="k-field"><label>Instances</label><NumberField value={d.count ?? 4} onChange={(v) => st.updateFeatureDraft({ count: Math.max(1, Math.min(360, Math.round(v))) })} step={1} min={1} /></div>
          </Section>
        )}
        <Section title="Features and Faces">
          {seedFeatures.length === 0 ? (
            <p className="k-pm-message">No extrude or revolve features yet.</p>
          ) : (
            <div className="k-pm-addrel">
              {seedFeatures.map((f) => (
                <label key={f.id} className="k-check">
                  <input type="checkbox" checked={d.featureIds.includes(f.id)} onChange={(e) => st.updateFeatureDraft({ featureIds: e.target.checked ? [...d.featureIds, f.id] : d.featureIds.filter((x) => x !== f.id) })} /> {f.name}
                </label>
              ))}
            </div>
          )}
          <div className="k-field" style={{ marginTop: 4 }}><label>Faces to Pattern</label>
            <div className="k-selbox" style={{ minHeight: 24 }} data-testid="pattern-faces" title="Click faces in the graphics area: the feature that made them is patterned">
              {d.featureIds.map((id) => st.doc.features.find((f) => f.id === id)).filter(Boolean).map((f) => <div key={f!.id} className="k-selbox-row"><Icon.Properties size={12} /> Faces of {f!.name}</div>)}
            </div>
          </div>
        </Section>
        <Section title="Bodies" defaultOpen={(d.bodies ?? []).length > 0}>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="pattern-bodies">
            {st.rebuild.bodies.map((b, i) => (
              <label key={b.id} className="k-check"><input type="checkbox" checked={(d.bodies ?? []).includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...(d.bodies ?? []), b.id] : (d.bodies ?? []).filter((x) => x !== b.id) })} /> {st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? `Body ${i + 1}`}</label>
            ))}
          </div>
        </Section>
        <Section title="Instances to Skip">
          <div className="k-selbox" style={{ minHeight: 40 }}>
            {(d.skip ?? []).length ? (d.skip ?? []).map((i) => <div key={i} className="k-selbox-row" onClick={() => st.togglePatternSkip(i)} title="Click to restore">({i + 2})</div>) : <span className="k-muted">Click the instance markers in the graphics area to skip instances.</span>}
          </div>
        </Section>
        <Section title="Options">
          {isLinear && <label className="k-check"><input type="checkbox" data-testid="pattern-varysketch" checked={!!d.varySketch} onChange={(e) => st.updateFeatureDraft({ varySketch: e.target.checked })} /> Vary sketch</label>}
          <label className="k-check"><input type="checkbox" data-testid="pattern-geometry" checked={!!d.geometryPattern} onChange={(e) => st.updateFeatureDraft({ geometryPattern: e.target.checked })} /> Geometry pattern</label>
          <label className="k-check"><input type="checkbox" checked={d.propagateVisual !== false} onChange={(e) => st.updateFeatureDraft({ propagateVisual: e.target.checked })} /> Propagate visual properties</label>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="ppreview" checked={!d.partialPreview} onChange={() => st.updateFeatureDraft({ partialPreview: false })} /> Full preview</label>
            <label className="k-check"><input type="radio" name="ppreview" checked={!!d.partialPreview} onChange={() => st.updateFeatureDraft({ partialPreview: true })} /> Partial preview</label>
          </div>
        </Section>
        {isLinear && (
          <Section title="Instances to Vary" defaultOpen={(d.varyDims ?? []).length > 0} check={(d.varyDims ?? []).length > 0} onCheck={(on) => st.updateFeatureDraft({ varyDims: on ? seedDims().slice(0, 1).map((c) => ({ constraintId: c.id, increment: 1 })) : [] })}>
            {seedDims().length ? seedDims().map((c, i) => {
              const vd = (d.varyDims ?? []).find((x) => x.constraintId === c.id);
              return (
                <div key={c.id} className="k-pm-valuerow" data-testid="pattern-varydim">
                  <label className="k-check" style={{ minWidth: 70 }}><input type="checkbox" checked={!!vd} onChange={(e) => st.updateFeatureDraft({ varyDims: e.target.checked ? [...(d.varyDims ?? []), { constraintId: c.id, increment: 1 }] : (d.varyDims ?? []).filter((x) => x.constraintId !== c.id) })} /> D{i + 1} ({c.value})</label>
                  <NumberField value={vd?.increment ?? 1} onChange={(v) => st.updateFeatureDraft({ varyDims: (d.varyDims ?? []).map((x) => (x.constraintId === c.id ? { ...x, increment: v } : x)) })} unit={st.doc.units} step={0.5} disabled={!vd} blankWhenDisabled={false} />
                </div>
              );
            }) : <p className="k-muted">The seed sketch has no dimensions to vary.</p>}
            <div className="k-pm-label" style={{ marginTop: 6 }}>Modified Instances:</div>
            <div className="k-selbox" style={{ minHeight: 28 }} data-testid="pattern-modified">
              {(d.modified ?? []).length ? (d.modified ?? []).map((m, k) => (
                <div key={k} className="k-pm-xyrow">
                  <span className="k-pm-xy">({m.i + 1},{m.j + 1})</span>
                  <NumberField value={m.dx ?? 0} onChange={(v) => st.updateFeatureDraft({ modified: d.modified!.map((x, q) => (q === k ? { ...x, dx: v } : x)) })} unit={st.doc.units} step={1} />
                  <NumberField value={m.dy ?? 0} onChange={(v) => st.updateFeatureDraft({ modified: d.modified!.map((x, q) => (q === k ? { ...x, dy: v } : x)) })} unit={st.doc.units} step={1} />
                  <button className="k-btn ghost icon" onClick={() => st.updateFeatureDraft({ modified: d.modified!.filter((_, q) => q !== k) })}>×</button>
                </div>
              )) : <span className="k-muted">Click an instance in the graphics area to move it on its own.</span>}
            </div>
          </Section>
        )}
        {errBox}
      </>
    );
  }

  // solid feature being created / edited: Boss-Extrude, Cut-Extrude, Revolve, Cut-Revolve
  if (st.featureEdit && (st.featureEdit.draft.type === 'fillet' || st.featureEdit.draft.type === 'chamfer') && st.featureEdit.draft.breakCorner) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Break Corner" icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Break Corner Options">
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="bcorner-edges">
            {d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select corner edges or flange faces.</span>}
          </div>
          <button className="k-btn" style={{ marginTop: 4 }} data-testid="collect-corners" onClick={st.collectAllCorners}>Collect all corners</button>
          <div className="k-field" style={{ marginTop: 6 }}><label>Break type</label></div>
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.type === 'chamfer' ? 'active' : ''}`} data-tip="Chamfer" data-testid="bcorner-chamfer" onClick={() => st.updateFeatureDraft({ type: 'chamfer' } as never)}><Icon.Chamfer size={14} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.type === 'fillet' ? 'active' : ''}`} data-tip="Fillet" data-testid="bcorner-fillet" onClick={() => st.updateFeatureDraft({ type: 'fillet' } as never)}><Icon.Arc size={14} /></button>
          </div>
          <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          <label className="k-check"><input type="checkbox" data-testid="bcorner-internal" checked={!!d.internalOnly} onChange={(e) => st.updateFeatureDraft({ internalOnly: e.target.checked })} /> Internal corners only</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit && (st.featureEdit.draft.type === 'fillet' || st.featureEdit.draft.type === 'chamfer')) {
    const d = st.featureEdit.draft as import('../../core/document/types').RoundFeature;
    const isFillet = d.type === 'fillet';
    const xpert = filletXpert, setXpert = setFilletXpert;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title={isFillet ? 'Fillet' : 'Chamfer'} icon={isFillet ? <Icon.FilletConstant size={18} /> : <Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {isFillet && (
          <>
            <div className="k-pm-segment">
              <button className={xpert ? '' : 'active'} onClick={() => setXpert(false)}>Manual</button>
              <button className={xpert ? 'active' : ''} data-testid="fillet-xpert" onClick={() => setXpert(true)}>FilletXpert</button>
            </div>
            {xpert ? (
              <Section title="Items To Fillet">
                <p className="k-pm-message">FilletXpert: select edges, set the radius and press Apply. The fillet is added and the Property Panel stays open for the next set.</p>
                <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
                <button className="k-btn" data-testid="fillet-xpert-apply" disabled={!d.edges.length} onClick={() => { const size = d.size; st.commitFeature(); st.startRound('fillet'); st.updateFeatureDraft({ size }); }}>Apply</button>
              </Section>
            ) : (
            <Section title="Fillet Type">
              <div className="k-pm-typerow">
                {([['constant', 'Constant Size Fillet', Icon.FilletConstant], ['variable', 'Variable Size Fillet', Icon.FilletVariable], ['face', 'Face Fillet', Icon.FilletFace], ['fullRound', 'Full Round Fillet', Icon.FilletFullRound]] as const).map(([k, t, I]) => (
                  <button key={k} className={`k-pm-typebtn k-tip${(d.roundType ?? 'constant') === k ? ' active' : ''}`} data-tip={t} data-testid={`fillet-type-${k}`} onClick={() => st.updateFeatureDraft({ roundType: k, ...(k === 'variable' && !d.variable ? { variable: { start: d.size, end: d.size * 2 } } : {}), ...(k === 'face' || k === 'fullRound' ? { edges: [] } : {}) })}><I size={26} /></button>
                ))}
              </div>
            </Section>
            )}
          </>
        )}
        {!isFillet && (
          <Section title="Chamfer Type">
            {/* Angle Distance, Distance Distance, Vertex, Offset Face, Face Face, by design */}
            <div className="k-pm-typegrid">
              <button className={`k-pm-typebtn${d.roundType === 'angleDistance' ? ' active' : ''}`} title="Angle-Distance" data-testid="chamfer-angle" onClick={() => st.updateFeatureDraft({ roundType: 'angleDistance', angle: d.angle ?? 45 })}><Icon.Chamfer size={22} /></button>
              <button className={`k-pm-typebtn${!d.roundType || d.roundType === 'constant' ? ' active' : ''}`} title="Distance-Distance" data-testid="chamfer-dd" onClick={() => st.updateFeatureDraft({ roundType: undefined })}><Icon.Chamfer size={22} /></button>
              <button className={`k-pm-typebtn${d.roundType === 'vertex' ? ' active' : ''}`} title="Vertex" data-testid="chamfer-vertex" onClick={() => st.updateFeatureDraft({ roundType: 'vertex', edges: [] })}><Icon.ChamferVertex size={22} /></button>
              <button className={`k-pm-typebtn${d.roundType === 'offsetFace' ? ' active' : ''}`} title="Offset Face" data-testid="chamfer-offsetface" onClick={() => st.updateFeatureDraft({ roundType: 'offsetFace', edges: [] })}><Icon.ChamferFace size={22} /></button>
              <button className={`k-pm-typebtn${d.roundType === 'faceFace' ? ' active' : ''}`} title="Face Face" data-testid="chamfer-faceface" onClick={() => st.updateFeatureDraft({ roundType: 'faceFace', edges: [] })}><Icon.ChamferFace size={22} /></button>
            </div>
          </Section>
        )}
        {!isFillet && d.roundType === 'vertex' && (
          <Section title="Items To Chamfer">
            <div className="k-pm-selrow"><Icon.Point size={16} /><div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} data-testid="chamfer-vertex-box">{d.vertex ? <div className="k-selbox-row"><Icon.Point size={12} /> {d.vertex.label}</div> : <span className="k-muted">Select a vertex (a corner of three edges) in the graphics area.</span>}</div></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D1</span><NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D2</span><NumberField value={d.equalDistance === false ? d.size2 ?? d.size : d.size} onChange={(v) => st.updateFeatureDraft({ size2: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} disabled={d.equalDistance !== false} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D3</span><NumberField value={d.equalDistance === false ? d.size3 ?? d.size : d.size} onChange={(v) => st.updateFeatureDraft({ size3: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} disabled={d.equalDistance !== false} /></div>
            <label className="k-check"><input type="checkbox" data-testid="chamfer-equal" checked={d.equalDistance !== false} onChange={(e) => st.updateFeatureDraft({ equalDistance: e.target.checked ? undefined : false, size2: d.size2 ?? d.size, size3: d.size3 ?? d.size })} /> Equal distance</label>
          </Section>
        )}
        {!isFillet && (d.roundType === 'offsetFace' || d.roundType === 'faceFace') && (
          <Section title="Items To Chamfer">
            <div className="k-pm-selrow" title="Face Set 1"><span className="k-pm-tag" style={{ background: '#5aa0e6' }} /><div className="k-selbox" style={{ minHeight: 22 }} data-testid="chamfer-face1">{st.selectedFaces[0] ? <div className="k-selbox-row">Face&lt;1&gt;</div> : <span className="k-muted">Face Set 1</span>}</div></div>
            <div className="k-pm-selrow" title="Face Set 2"><span className="k-pm-tag" style={{ background: '#c06ad0' }} /><div className="k-selbox" style={{ minHeight: 22 }} data-testid="chamfer-face2">{st.selectedFaces[1] ? <div className="k-selbox-row">Face&lt;2&gt;</div> : <span className="k-muted">Face Set 2</span>}</div></div>
            <p className="k-muted" style={{ margin: '4px 0 0' }}>{d.roundType === 'offsetFace' ? 'The chamfer is set off from each face by its distance.' : 'The chamfer runs between the two faces along their common edge.'}{d.edges.length ? ` ${d.edges.length} edge(s) found.` : ''}</p>
          </Section>
        )}
        {(d.roundType === 'face' || d.roundType === 'fullRound') && (
          <Section title={d.roundType === 'face' ? 'Items To Fillet' : 'Items To Fillet'}>
            {d.roundType === 'face' ? (
              <>
                <div className="k-pm-selrow" title="Face Set 1"><span className="k-pm-tag" style={{ background: '#5aa0e6' }} /><div className="k-selbox" style={{ minHeight: 22 }}>{st.selectedFaces[0] ? <div className="k-selbox-row">Face&lt;1&gt;</div> : <span className="k-muted">Face Set 1</span>}</div></div>
                <div className="k-pm-selrow" title="Face Set 2"><span className="k-pm-tag" style={{ background: '#c06ad0' }} /><div className="k-selbox" style={{ minHeight: 22 }}>{st.selectedFaces[1] ? <div className="k-selbox-row">Face&lt;2&gt;</div> : <span className="k-muted">Face Set 2</span>}</div></div>
              </>
            ) : (
              <>
                {/* Full Round: Side Face Set 1 (blue), Center Face Set (purple), Side Face Set 2 (pink), by design */}
                {([['side1', 'Side Face Set 1', '#5aa0e6'], ['center', 'Center Face Set', '#c06ad0'], ['side2', 'Side Face Set 2', '#e98fc0']] as const).map(([k, label, color]) => (
                  <div key={k} className={`k-pm-selrow${st.fullRoundPick === k ? ' active' : ''}`} title={label} onClick={() => useStore.setState({ fullRoundPick: k })}>
                    <span className="k-pm-tag" style={{ background: color }} />
                    <div className={`k-selbox${st.fullRoundPick === k ? ' k-selbox-dir' : ''}`} style={{ minHeight: 22 }} data-testid={'fullround-' + k}>{d.fullRound?.[k] ? <div className="k-selbox-row">{d.fullRound[k]!.label}</div> : <span className="k-muted">{label}</span>}</div>
                  </div>
                ))}
              </>
            )}
            <label className="k-check"><input type="checkbox" checked={d.tangentPropagation !== false} onChange={(e) => st.updateFeatureDraft({ tangentPropagation: e.target.checked })} /> Tangent propagation</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="frpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => st.updateFeatureDraft({ previewMode: 'full' })} /> Full preview</label>
              <label className="k-check"><input type="radio" name="frpreview" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
              <label className="k-check"><input type="radio" name="frpreview" checked={d.previewMode === 'none'} onChange={() => st.updateFeatureDraft({ previewMode: 'none' })} /> No preview</label>
            </div>
          </Section>
        )}
        {(isFillet || !['vertex', 'offsetFace', 'faceFace'].includes(d.roundType ?? '')) && <Section title={isFillet ? 'Items To Fillet' : 'Items To Chamfer'}>
          {/* the selection box of the intended design: its picture on the left, light blue while it takes the picks, the last pick highlighted */}
          <div className="k-pm-selrow">
            <Icon.EdgeSelect size={20} />
            <ul className="k-list k-pm-edgelist k-pm-selbox active" data-testid="round-items" title="Select edges on the model (Ctrl for more than one)">
              {d.edges.map((e, i) => (
                <li key={i} className={i === d.edges.length - 1 ? 'sel' : ''}>Edge&lt;{i + 1}&gt;{e.closed ? ' (circular)' : e.straight ? '' : ' (curved)'}</li>
              ))}
            </ul>
          </div>
          <label className="k-check"><input type="checkbox" data-testid="show-seltoolbar" checked={st.selectionToolbar} onChange={(e) => useStore.setState({ selectionToolbar: e.target.checked })} /> Show selection toolbar</label>
          <label className="k-check"><input type="checkbox" data-testid="fillet-tangent" checked={d.tangentPropagation !== false} onChange={(e) => st.updateFeatureDraft({ tangentPropagation: e.target.checked })} /> Tangent propagation</label>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="fpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => st.updateFeatureDraft({ previewMode: 'full' })} /> Full preview</label>
            <label className="k-check"><input type="radio" name="fpreview" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
            <label className="k-check"><input type="radio" name="fpreview" data-testid="fillet-nopreview" checked={d.previewMode === 'none'} onChange={() => st.updateFeatureDraft({ previewMode: 'none' })} /> No preview</label>
          </div>
        </Section>}
        <Section title={isFillet ? 'Fillet Parameters' : 'Chamfer Parameters'}>
          {isFillet && <select className="k-input" data-testid="fillet-sym" value={d.size2 ? 'asymmetric' : 'symmetric'} onChange={(e) => st.updateFeatureDraft({ size2: e.target.value === 'asymmetric' ? d.size * 1.5 : undefined })} style={{ marginBottom: 4 }}><option value="symmetric">Symmetric</option><option value="asymmetric">Asymmetric</option></select>}
          {d.roundType === 'variable' && isFillet ? (
            <>
              <div className="k-pm-sub">Variable radius parameters</div>
              <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>Start</span><NumberField value={d.variable?.start ?? d.size} onChange={(v) => st.updateFeatureDraft({ variable: { start: Math.max(0.01, v), end: d.variable?.end ?? d.size } })} unit={st.doc.units} step={1} min={0.01} /></div>
              <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>End</span><NumberField value={d.variable?.end ?? d.size} onChange={(v) => st.updateFeatureDraft({ variable: { start: d.variable?.start ?? d.size, end: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} /></div>
            </>
          ) : (
            <div className="k-pm-valuerow">
              <Icon.Dimension size={14} />
              <NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
            </div>
          )}
          {d.roundType === 'angleDistance' && !isFillet && <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle ?? 45} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(89, v)) })} unit="°" step={5} /></div>}
          {(d.size2 !== undefined && (isFillet || d.roundType !== 'angleDistance')) && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D2</span><NumberField value={d.size2} onChange={(v) => st.updateFeatureDraft({ size2: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>}
          {isFillet ? (
            <>
              <label className="k-check"><input type="checkbox" data-testid="fillet-multi" checked={!!d.radii} onChange={(e) => st.updateFeatureDraft({ radii: e.target.checked ? d.edges.map(() => d.size) : undefined })} /> Multi Radius Fillet</label>
              {d.radii && d.edges.map((_, i) => <div key={i} className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 52 }}>Edge&lt;{i + 1}&gt;</span><NumberField value={d.radii![i] ?? d.size} onChange={(v) => { const r = d.edges.map((__, j) => d.radii![j] ?? d.size); r[i] = Math.max(0.01, v); st.updateFeatureDraft({ radii: r }); }} unit={st.doc.units} step={1} min={0.01} /></div>)}
            </>
          ) : d.roundType !== 'angleDistance' && <label className="k-check"><input type="checkbox" checked={d.size2 === undefined} onChange={(e) => st.updateFeatureDraft({ size2: e.target.checked ? undefined : d.size })} /> Equal distance</label>}
          {isFillet && <div className="k-field" style={{ marginTop: 4 }}><label>Profile:</label><select className="k-input" data-testid="fillet-profile" value={d.profile ?? 'circular'} onChange={(e) => st.updateFeatureDraft({ profile: e.target.value as 'circular', rho: d.rho ?? 0.5 })}><option value="circular">Circular</option><option value="conicRho">Conic Rho</option><option value="conicRadius">Conic Radius</option><option value="curvature">Curvature Continuous</option></select></div>}
          {isFillet && (d.profile === 'conicRho' || d.profile === 'conicRadius') && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 26 }}>ρ</span><NumberField value={d.rho ?? 0.5} onChange={(v) => st.updateFeatureDraft({ rho: Math.max(0.05, Math.min(0.95, v)) })} step={0.05} /></div>}
        </Section>
        {!isFillet && (
          <Section title="Chamfer Options" defaultOpen={false}>
            <label className="k-check"><input type="checkbox" checked={d.selectThroughFaces !== false} onChange={(e) => st.updateFeatureDraft({ selectThroughFaces: e.target.checked })} /> Select through faces</label>
            <label className="k-check"><input type="checkbox" data-testid="chamfer-keep" checked={d.keepFeatures !== false} onChange={(e) => st.updateFeatureDraft({ keepFeatures: e.target.checked })} /> Keep features</label>
            <label className="k-check"><input type="checkbox" checked={d.tangentPropagation !== false} onChange={(e) => st.updateFeatureDraft({ tangentPropagation: e.target.checked })} /> Tangent propagation</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="chpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => st.updateFeatureDraft({ previewMode: 'full' })} /> Full preview</label>
              <label className="k-check"><input type="radio" name="chpreview" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
              <label className="k-check"><input type="radio" name="chpreview" checked={d.previewMode === 'none'} onChange={() => st.updateFeatureDraft({ previewMode: 'none' })} /> No preview</label>
            </div>
          </Section>
        )}
        {isFillet && (
          <>
            <Section title="Partial Edge Parameters" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" data-testid="fillet-partial" checked={!!d.partial} onChange={(e) => st.updateFeatureDraft({ partial: e.target.checked ? { start: 0, end: 0.5 } : undefined })} /> Partial Edge Parameters</label>
              <div className="k-field"><label>Start condition:</label><select className="k-input" disabled={!d.partial}><option>Distance Offset</option></select></div>
              {d.partial && (
                <>
                  <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>Start</span><NumberField value={Math.round(d.partial.start * 100)} onChange={(v) => st.updateFeatureDraft({ partial: { ...d.partial!, start: Math.max(0, Math.min(100, v)) / 100 } })} unit="%" step={5} /></div>
                  <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>End</span><NumberField value={Math.round(d.partial.end * 100)} onChange={(v) => st.updateFeatureDraft({ partial: { ...d.partial!, end: Math.max(0, Math.min(100, v)) / 100 } })} unit="%" step={5} /></div>
                </>
              )}
            </Section>
            <Section title="Setback Parameters" defaultOpen={(d.setback ?? 0) > 0}>
              <p className="k-muted" style={{ margin: '0 0 4px' }}>Corners where three filleted edges meet blend over the setback distance.</p>
              <div className="k-pm-valuerow k-tip" data-tip="Distance"><Icon.Dimension size={14} /><NumberField value={d.setback ?? 0} onChange={(v) => st.updateFeatureDraft({ setback: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} /></div>
            </Section>
            <Section title="Fillet Options" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" data-testid="fillet-through" checked={!!d.selectThroughFaces} onChange={(e) => st.updateFeatureDraft({ selectThroughFaces: e.target.checked })} /> Select through faces</label>
              <label className="k-check"><input type="checkbox" data-testid="fillet-keepfeatures" checked={d.keepFeatures !== false} onChange={(e) => st.updateFeatureDraft({ keepFeatures: e.target.checked })} /> Keep features</label>
              <label className="k-check"><input type="checkbox" data-testid="fillet-roundcorners" checked={!!d.roundCorners} onChange={(e) => st.updateFeatureDraft({ roundCorners: e.target.checked })} /> Round corners</label>
              <div className="k-field"><label>Overflow type:</label></div>
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="foverflow" checked={(d.overflow ?? 'default') === 'default'} onChange={() => st.updateFeatureDraft({ overflow: 'default' })} /> Default</label>
                <label className="k-check"><input type="radio" name="foverflow" data-testid="fillet-keepedge" checked={d.overflow === 'keepEdge'} onChange={() => st.updateFeatureDraft({ overflow: 'keepEdge' })} /> Keep edge</label>
                <label className="k-check"><input type="radio" name="foverflow" checked={d.overflow === 'keepSurface'} onChange={() => st.updateFeatureDraft({ overflow: 'keepSurface' })} /> Keep surface</label>
              </div>
            </Section>
          </>
        )}
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  if (st.featureEdit) {
    const fe = st.featureEdit;
    const d = fe.draft as Exclude<import('../../core/document/types').SketchBasedFeature, import('../../core/document/types').RibFeature | import('../../core/document/types').BaseFlangeFeature | import('../../core/document/types').HelixFeature>;
    const fsketch = st.doc.sketches[d.sketchId];
    const titles: Record<string, [string, string]> = { extrude: ['Boss-Extrude', 'Cut-Extrude'], revolve: ['Revolve', 'Cut-Revolve'], sweep: ['Sweep', 'Cut-Sweep'], loft: ['Loft', 'Cut-Loft'] };
    const title = d.type === 'loft' && d.boundary ? (d.op === 'boss' ? 'Boundary' : 'Boundary-Cut') : titles[d.type][d.op === 'boss' ? 0 : 1];
    const icon = d.type === 'extrude' ? (d.op === 'boss' ? <Icon.Extrude /> : <Icon.Cut />) : d.type === 'revolve' ? <Icon.Revolve /> : d.type === 'sweep' ? <Icon.Sweep /> : <Icon.Loft />;
    const otherSketches = st.doc.features.filter((f): f is import('../../core/document/types').SketchFeature => f.type === 'sketch' && f.sketchId !== d.sketchId);
    const err = st.rebuild.errors[d.id];
    const endOptions: { id: import('../../core/document/types').EndCondition; label: string }[] = [
      { id: 'blind', label: 'Blind' },
      { id: 'throughAll', label: 'Through All' },
      { id: 'throughAllBoth', label: 'Through All - Both' },
      { id: 'upToNext', label: 'Up To Next' },
      { id: 'upToVertex', label: 'Up To Vertex' },
      { id: 'upToSurface', label: 'Up To Surface' },
      { id: 'offsetFromSurface', label: 'Offset From Surface' },
      { id: 'upToBody', label: 'Up To Body' },
      { id: 'midPlane', label: 'Mid Plane' },
    ];
    const sketchLines = fsketch ? fsketch.entityOrder.map((id) => fsketch.entities[id]).filter((e) => e.kind === 'line') : [];
    return (
      <>
        <Header title={title} icon={icon} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {!fsketch && (
          <Section title="Message">
            <p className="k-pm-message">Select a sketch in the Feature Tree to create the feature from.</p>
          </Section>
        )}
        {fsketch && (d.type === 'extrude' || d.type === 'revolve') && (
          <Section title="From">
            <select className="k-input k-indent" data-testid="extrude-from" value={d.type === 'extrude' && d.fromOffset !== undefined ? 'offset' : 'sketchPlane'} disabled={d.type !== 'extrude'} onChange={(e) => d.type === 'extrude' && st.updateFeatureDraft({ fromOffset: e.target.value === 'offset' ? 10 : undefined, fromReverse: undefined })}>
              <option value="sketchPlane">Sketch Plane</option>
              <option value="offset">Offset</option>
            </select>
            {d.type === 'extrude' && d.fromOffset !== undefined && (
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.fromReverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ fromReverse: !d.fromReverse })}><Icon.ReverseDir size={16} /></button>
                <NumberField value={d.fromOffset} onChange={(v) => st.updateFeatureDraft({ fromOffset: v })} unit={st.doc.units} step={1} />
              </div>
            )}
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Profile and Path">
            <div className="k-field"><label>Profile</label><span>{fsketch.name}</span></div>
            <div className="k-field">
              <label>Path</label>
              <select className="k-input" value={d.pathSketchId} onChange={(e) => st.updateFeatureDraft({ pathSketchId: e.target.value })}>
                <option value="">Select a sketch…</option>
                {otherSketches.map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
                {st.doc.features.filter((f) => f.type === 'helix' || f.type === 'sketch3d').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <p className="k-muted" style={{ margin: '4px 0 0' }}>The path sketch holds the lines, arcs or splines to sweep along; the profile stays centred on the path start.</p>
            <div className="k-pm-radios" data-testid="sweep-profile">
              <label className="k-check"><input type="radio" name="sweepprof" checked={(d.profileType ?? 'sketch') === 'sketch'} onChange={() => st.updateFeatureDraft({ profileType: 'sketch' })} /> Sketch Profile</label>
              <label className="k-check"><input type="radio" name="sweepprof" checked={d.profileType === 'circular'} onChange={() => st.updateFeatureDraft({ profileType: 'circular', diameter: d.diameter ?? 5, pathSketchId: d.pathSketchId || d.sketchId })} /> Circular Profile</label>
            </div>
            {d.profileType === 'circular' && <div className="k-pm-valuerow k-tip" data-tip="Diameter"><Icon.Circle size={14} /><NumberField value={d.diameter ?? 5} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>}
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Guide Curves" defaultOpen={false}>
            <div className="k-selbox" style={{ minHeight: 30 }} data-testid="sweep-guides">
              {(d.guides ?? []).length ? (d.guides ?? []).map((gid) => <div key={gid} className="k-selbox-row"><Icon.Spline size={12} /> {st.doc.features.find((f) => f.type === 'sketch' && f.sketchId === gid)?.name ?? gid}<span className="grow" /><button className="k-btn ghost icon" title="Remove" onClick={() => st.updateFeatureDraft({ guides: (d.guides ?? []).filter((x) => x !== gid) })}><Icon.Close size={10} /></button></div>) : <span className="k-muted">Guide curves shape the profile along the path.</span>}
            </div>
            <select className="k-input" value="" onChange={(e) => e.target.value && st.updateFeatureDraft({ guides: [...(d.guides ?? []), e.target.value] })}>
              <option value="">Add a guide curve…</option>
              {otherSketches.filter((f) => f.sketchId !== d.pathSketchId && !(d.guides ?? []).includes(f.sketchId)).map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
            </select>
            <label className="k-check"><input type="checkbox" checked={!!d.mergeTangent} onChange={(e) => st.updateFeatureDraft({ mergeTangent: e.target.checked })} /> Merge smooth faces</label>
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Options">
            <div className="k-field"><label>Profile orientation</label>
              <select className="k-input" data-testid="sweep-orientation" value={d.orientation ?? 'followPath'} onChange={(e) => st.updateFeatureDraft({ orientation: e.target.value as 'followPath' })}>
                <option value="followPath">Follow Path</option>
                <option value="keepNormal">Keep normal constant</option>
              </select>
            </div>
            <div className="k-field"><label>Profile Twist</label>
              <select className="k-input" data-testid="sweep-twist" value={d.twist ? 'value' : 'none'} onChange={(e) => st.updateFeatureDraft({ twist: e.target.value === 'value' ? 1 : undefined })}>
                <option value="none">None</option>
                <option value="value">Specify Twist Value</option>
              </select>
            </div>
            {d.twist !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Twist control: revolutions"><Icon.Revolve size={14} /><NumberField value={d.twist} onChange={(v) => st.updateFeatureDraft({ twist: v })} step={0.25} /></div>}
            <label className="k-check"><input type="checkbox" checked={!!d.mergeTangent} onChange={(e) => st.updateFeatureDraft({ mergeTangent: e.target.checked })} /> Merge tangent faces</label>
            <label className="k-check"><input type="checkbox" checked={!!d.alignEnd} onChange={(e) => st.updateFeatureDraft({ alignEnd: e.target.checked })} /> Align with end faces</label>
            <label className="k-check"><input type="checkbox" defaultChecked /> Show preview</label>
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Start and End Tangency" defaultOpen={false}>
            <div className="k-field"><label>Start tangency type</label><select className="k-input" value={d.startTangency ?? 'none'} onChange={(e) => st.updateFeatureDraft({ startTangency: e.target.value as 'none' })}><option value="none">None</option><option value="pathTangent">Path Tangent</option></select></div>
            <div className="k-field"><label>End tangency type</label><select className="k-input" value={d.endTangency ?? 'none'} onChange={(e) => st.updateFeatureDraft({ endTangency: e.target.value as 'none' })}><option value="none">None</option><option value="pathTangent">Path Tangent</option></select></div>
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Curvature Display" defaultOpen={false}>
            <label className="k-check"><input type="checkbox" checked={!!d.curvatureDisplay?.mesh} onChange={(e) => st.updateFeatureDraft({ curvatureDisplay: { ...d.curvatureDisplay, mesh: e.target.checked } })} /> Mesh preview</label>
            <label className="k-check"><input type="checkbox" checked={!!d.curvatureDisplay?.zebra} onChange={(e) => { st.updateFeatureDraft({ curvatureDisplay: { ...d.curvatureDisplay, zebra: e.target.checked } }); if (e.target.checked !== st.show.zebra) st.toggleShow('zebra'); }} /> Zebra stripes</label>
            <label className="k-check"><input type="checkbox" checked={!!d.curvatureDisplay?.combs} onChange={(e) => st.updateFeatureDraft({ curvatureDisplay: { ...d.curvatureDisplay, combs: e.target.checked } })} /> Curvature combs</label>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Profiles">
            <div className="k-field"><label>Profile 1</label><span>{fsketch.name}</span></div>
            <div className="k-field">
              <label>Profile 2</label>
              <select className="k-input" value={d.sketchId2} onChange={(e) => st.updateFeatureDraft({ sketchId2: e.target.value })}>
                <option value="">Select a sketch…</option>
                {otherSketches.map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
              </select>
            </div>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Start/End Constraints" defaultOpen={d.startNormal !== undefined || d.endNormal !== undefined}>
            {(['start', 'end'] as const).map((k) => {
              const w = k === 'start' ? d.startNormal : d.endNormal;
              const type = w === undefined ? 'none' : (k === 'start' ? d.startType : d.endType) ?? 'normal';
              const dir = (k === 'start' ? d.startDir : d.endDir) ?? [0, 0, 1];
              const set = (p: Record<string, unknown>) => st.updateFeatureDraft(p as never);
              return (
                <div key={k}>
                  <div className="k-field"><label>{k === 'start' ? 'Start constraint' : 'End constraint'}</label>
                    <select className="k-input" value={type} data-testid={`loft-${k}`} onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'none') set({ [`${k}Normal`]: undefined, [`${k}Type`]: undefined });
                      else set({ [`${k}Normal`]: w ?? 1, [`${k}Type`]: v === 'normal' ? undefined : v, ...(v === 'direction' ? { [`${k}Dir`]: dir } : {}) });
                    }}>
                      <option value="none">None</option>
                      <option value="direction">Direction Vector</option>
                      <option value="normal">Normal To Profile</option>
                      <option value="tangent">Tangency To Face</option>
                    </select>
                  </div>
                  {type === 'direction' && (
                    <div className="k-pm-stylerow">
                      {(['X', 'Y', 'Z'] as const).map((a, i) => <button key={a} className={`k-pm-stylebtn ${Math.abs(dir[i]) > 0.5 ? 'active' : ''}`} onClick={() => { const v: [number, number, number] = [0, 0, 0]; v[i] = 1; set({ [`${k}Dir`]: v }); }}>{a}</button>)}
                      <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => set({ [`${k}Dir`]: dir.map((x) => -x) })}><Icon.ReverseDir size={16} /></button>
                    </div>
                  )}
                  {w !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Tangent length"><Icon.Dimension size={14} /><NumberField value={w} onChange={(v) => set({ [`${k}Normal`]: Math.max(0, v) })} step={0.1} min={0} /></div>}
                </div>
              );
            })}
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Centerline Parameters" defaultOpen={!!d.centerline}>
            <select className="k-input" data-testid="loft-centerline" value={d.centerline ?? ''} onChange={(e) => st.updateFeatureDraft({ centerline: e.target.value || undefined })}>
              <option value="">No centerline</option>
              {otherSketches.filter((f) => f.sketchId !== d.sketchId2).map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
            </select>
            <p className="k-muted" style={{ margin: '4px 0 0' }}>The section centres follow the centerline sketch from profile 1 to profile 2.</p>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Options">
            <label className="k-check"><input type="checkbox" checked={!!d.mergeTangent} onChange={(e) => st.updateFeatureDraft({ mergeTangent: e.target.checked })} /> Merge tangent faces</label>
            <label className="k-check" title="Needs three or more profiles"><input type="checkbox" disabled checked={!!d.closeLoft} onChange={(e) => st.updateFeatureDraft({ closeLoft: e.target.checked })} /> Close loft</label>
            <label className="k-check"><input type="checkbox" defaultChecked /> Show preview</label>
            <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
              <button className="k-btn" data-testid="loft-dragsketch" onClick={() => { const sid = d.sketchId; st.cancelFeature(); st.editSketch(sid); }}>Drag Sketch</button>
              <button className="k-btn" onClick={() => st.updateFeatureDraft({ applyToAll: !d.applyToAll, ...(d.applyToAll ? {} : { endNormal: d.startNormal, endType: d.startType, endDir: d.startDir }) })}>{d.applyToAll ? '✓ Apply to all' : 'Apply to all'}</button>
            </div>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Guide Curves">
            <div className="k-selbox" style={{ minHeight: 40 }} data-testid="loft-guides">
              {(d.guides ?? []).length ? (d.guides ?? []).map((gid) => (
                <div key={gid} className="k-selbox-row">
                  <Icon.Spline size={12} /> {st.doc.features.find((f) => f.type === 'sketch' && f.sketchId === gid)?.name ?? gid}
                  <span className="grow" />
                  <button className="k-btn ghost icon" title="Remove" onClick={() => st.updateFeatureDraft({ guides: (d.guides ?? []).filter((x) => x !== gid) })}><Icon.Close size={10} /></button>
                </div>
              )) : <span className="k-muted">Guide curves: sketches from profile 1 to profile 2.</span>}
            </div>
            <select className="k-input" value="" onChange={(e) => e.target.value && st.updateFeatureDraft({ guides: [...(d.guides ?? []), e.target.value] })} data-testid="loft-add-guide">
              <option value="">Add a guide curve…</option>
              {otherSketches.filter((f) => f.sketchId !== d.sketchId2 && !(d.guides ?? []).includes(f.sketchId)).map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
            </select>
            <select className="k-input" data-testid="loft-guide-tangency" value={d.type === 'loft' ? d.guideTangency ?? 'none' : 'none'} onChange={(e) => st.updateFeatureDraft({ guideTangency: e.target.value as 'none' })} style={{ marginTop: 4 }}><option value="none">Guide tangency type: None</option><option value="normal">Guide tangency type: Normal To Profile</option></select>
          </Section>
        )}
        {fsketch && d.type === 'extrude' && (
          <>
            <Section title="Direction 1">
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
                <select className="k-input" value={d.end} onChange={(e) => st.updateFeatureDraft({ end: e.target.value as 'blind' })}>
                  {endOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="k-pm-valuerow k-tip" data-tip="Direction of Extrusion: the sketch normal">
                <Icon.DirArrow size={16} />
                <div className="k-selbox k-selbox-dir" />
              </div>
              {d.end === 'upToVertex' && (
                <div className="k-selbox" style={{ minHeight: 24, marginBottom: 4 }}>
                  {d.vertex ? <div className="k-selbox-row"><Icon.Point size={12} /> {d.vertex.label}</div> : <span className="k-muted">Select a vertex in the graphics area.</span>}
                </div>
              )}
              {d.end === 'upToBody' && (
                <div className="k-selbox" style={{ minHeight: 24, marginBottom: 4 }} data-testid="up-to-body">
                  {d.upToBody ? <div className="k-selbox-row"><Icon.Part size={12} /> {d.upToBody.label}</div> : <span className="k-muted">Select a solid body in the graphics area.</span>}
                </div>
              )}
              {(d.end === 'upToSurface' || d.end === 'offsetFromSurface') && (
                <div className="k-selbox" style={{ minHeight: 24, marginBottom: 4 }}>
                  {d.surface ? <div className="k-selbox-row"><Icon.Properties size={12} /> {d.surface.label}</div> : <span className="k-muted">Select a face in the graphics area.</span>}
                </div>
              )}
              {d.end === 'offsetFromSurface' && (
                <>
                  <div className="k-pm-valuerow">
                    <Icon.Dimension size={14} />
                    <NumberField value={d.offset ?? 0} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus />
                  </div>
                  <label className="k-check"><input type="checkbox" checked={!!d.reverseOffset} onChange={(e) => st.updateFeatureDraft({ reverseOffset: e.target.checked })} /> Reverse offset</label>
                  <label className="k-check"><input type="checkbox" data-testid="extrude-translate" checked={!!d.translateSurface} onChange={(e) => st.updateFeatureDraft({ translateSurface: e.target.checked })} /> Translate surface</label>
                </>
              )}
              {d.end === 'blind' || d.end === 'midPlane' ? (
                <div className="k-pm-valuerow k-tip" data-tip="Depth">
                  <Icon.Depth size={16} />
                  <NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
                </div>
              ) : null}
              {d.op === 'cut' && <label className="k-check"><input type="checkbox" checked={!!d.flipSide} onChange={(e) => st.updateFeatureDraft({ flipSide: e.target.checked })} /> Flip side to cut</label>}
              {d.op === 'cut' && st.doc.sheetMetal && (
                <>
                  <label className="k-check"><input type="checkbox" data-testid="cut-linkthickness" checked={!!d.linkToThickness} onChange={(e) => st.updateFeatureDraft({ linkToThickness: e.target.checked, ...(e.target.checked ? { end: 'blind', depth: st.doc.sheetMetal!.thickness } : {}) })} /> Link to thickness</label>
                  <label className="k-check"><input type="checkbox" data-testid="cut-normal" checked={d.normalCut !== false} onChange={(e) => st.updateFeatureDraft({ normalCut: e.target.checked, ...(e.target.checked ? {} : { optimizeGeometry: false }) })} /> Normal cut</label>
                  <label className="k-check" style={{ paddingLeft: 18 }}><input type="checkbox" data-testid="cut-optimize" disabled={d.normalCut === false} checked={d.normalCut !== false && d.optimizeGeometry !== false} onChange={(e) => st.updateFeatureDraft({ optimizeGeometry: e.target.checked })} /> Optimize geometry</label>
                </>
              )}
              {st.rebuild.bodies.length > 0 && d.op === 'boss' && <label className="k-check"><input type="checkbox" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>}
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.draft ? 'active' : ''}`} data-tip="Draft On/Off" onClick={() => st.updateFeatureDraft({ draft: d.draft ? undefined : { angle: 1, outward: false } })}><Icon.Draft size={16} /></button>
                <NumberField value={d.draft?.angle ?? 1} onChange={(v) => st.updateFeatureDraft({ draft: { angle: Math.max(0, Math.min(89, v)), outward: d.draft?.outward ?? false } })} unit="°" step={1} min={0} disabled={!d.draft} blankWhenDisabled />
              </div>
              <label className="k-check"><input type="checkbox" disabled={!d.draft} checked={!!d.draft?.outward} onChange={(e) => st.updateFeatureDraft({ draft: { angle: d.draft?.angle ?? 1, outward: e.target.checked } })} /> Draft outward</label>
            </Section>
            <Section title="Direction 2" defaultOpen={!!d.direction2} check={!!d.direction2} onCheck={(on) => st.updateFeatureDraft({ direction2: on ? { end: 'blind', depth: d.depth } : undefined })}>
              {d.direction2 && (
                <>
                  <select className="k-input" data-testid="dir2-end" value={d.direction2.end} onChange={(e) => { st.updateFeatureDraft({ direction2: { ...d.direction2!, end: e.target.value as 'blind' } }); useStore.setState({ dir2Pick: e.target.value === 'upToVertex' ? 'vertex' : e.target.value === 'upToSurface' || e.target.value === 'offsetFromSurface' ? 'surface' : null }); }}>
                    {endOptions.filter((o) => o.id !== 'midPlane' && o.id !== 'upToBody').map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  {(d.direction2.end === 'upToVertex' || d.direction2.end === 'upToSurface' || d.direction2.end === 'offsetFromSurface') && (
                    <div className={`k-selbox${st.dir2Pick ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} data-testid="dir2-ref" onClick={() => useStore.setState({ dir2Pick: d.direction2!.end === 'upToVertex' ? 'vertex' : 'surface' })}>
                      {d.direction2.end === 'upToVertex' ? (d.direction2.vertex ? <div className="k-selbox-row">{d.direction2.vertex.label}</div> : <span className="k-muted">Click a vertex of the model.</span>) : d.direction2.surface ? <div className="k-selbox-row">{d.direction2.surface.label}</div> : <span className="k-muted">Select a planar face.</span>}
                    </div>
                  )}
                  {d.direction2.end === 'offsetFromSurface' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.direction2.offset ?? 0} onChange={(v) => st.updateFeatureDraft({ direction2: { ...d.direction2!, offset: v } })} unit={st.doc.units} step={1} /></div>}
                  {(d.direction2.end === 'blind' || d.direction2.end === 'midPlane') && (
                    <div className="k-pm-valuerow">
                      <Icon.Dimension size={14} />
                      <NumberField value={d.direction2.depth} onChange={(v) => st.updateFeatureDraft({ direction2: { ...d.direction2!, depth: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                    </div>
                  )}
                </>
              )}
            </Section>
            <Section title="Thin Feature" defaultOpen={!!d.thin} check={!!d.thin} onCheck={(on) => st.updateFeatureDraft({ thin: on ? { mode: 'one', thickness: 2 } : undefined })}>
              {d.thin && (
                <>
                  <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
                    <button className={`k-btn icon k-tip ${d.thin.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ thin: { ...d.thin!, reverse: !d.thin!.reverse } })}><Icon.Flip size={14} /></button>
                    <select className="k-input" value={d.thin.mode} onChange={(e) => st.updateFeatureDraft({ thin: { ...d.thin!, mode: e.target.value as 'one' | 'mid' | 'two' } })}>
                      <option value="one">One-Direction</option>
                      <option value="mid">Mid-Plane</option>
                      <option value="two">Two-Direction</option>
                    </select>
                  </div>
                  <div className="k-pm-valuerow">
                    <Icon.Dimension size={14} />
                    <NumberField value={d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                  </div>
                  {d.thin.mode === 'two' && (
                    <div className="k-pm-valuerow">
                      <Icon.Dimension size={14} />
                      <NumberField value={d.thin.thickness2 ?? d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness2: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                    </div>
                  )}
                  <label className="k-check"><input type="checkbox" data-testid="thin-autofillet" checked={!!d.thin.autoFillet} onChange={(e) => st.updateFeatureDraft({ thin: { ...d.thin!, autoFillet: e.target.checked ? d.thin!.thickness : undefined } })} /> Auto-fillet corners</label>
                  {!!d.thin.autoFillet && <div className="k-pm-valuerow k-tip" data-tip="Fillet radius"><Icon.Arc size={14} /><NumberField value={d.thin.autoFillet} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, autoFillet: Math.max(0.01, v) } })} unit={st.doc.units} step={0.5} /></div>}
                </>
              )}
            </Section>
            <Section title="Selected Contours" defaultOpen={false}>
              {d.thin ? (
                <p className="k-muted">All contours of {fsketch.name} (open profiles allowed).</p>
              ) : (
                <SelectedContoursBox sketchName={fsketch.name} contours={d.contours} />
              )}
            </Section>
          </>
        )}
        {st.rebuild.bodies.length > 1 && (d.op === 'cut' || (d.type === 'extrude' && d.merge !== false)) && (
          <Section title="Feature Scope" defaultOpen={false}>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="fscope" checked={!d.scope} onChange={() => st.updateFeatureDraft({ scope: undefined })} /> {st.doc.kind === 'assembly' ? 'All components' : 'All bodies'}</label>
              <label className="k-check"><input type="radio" name="fscope" checked={!!d.scope} onChange={() => st.updateFeatureDraft({ scope: st.rebuild.bodies.map((b) => b.id) })} /> {st.doc.kind === 'assembly' ? 'Selected components' : 'Selected bodies'}</label>
            </div>
            <label className="k-check"><input type="checkbox" data-testid="scope-auto" checked={!d.scope} onChange={(e) => st.updateFeatureDraft({ scope: e.target.checked ? undefined : st.rebuild.bodies.map((b) => b.id) })} /> Auto-select</label>
            {d.scope && (
              <div className="k-selbox" style={{ minHeight: 24 }}>
                {st.rebuild.bodies.map((b) => (
                  <label key={b.id} className="k-check">
                    <input type="checkbox" checked={d.scope!.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ scope: e.target.checked ? [...d.scope!, b.id] : d.scope!.filter((x) => x !== b.id) })} />
                    {(st.doc.components ?? []).find((c) => c.id === b.id)?.name ?? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? b.id}
                  </label>
                ))}
              </div>
            )}
          </Section>
        )}
        {fsketch && d.type === 'revolve' && (
          <>
            <Section title="Axis of Revolution">
              <select className="k-input" value={d.axisEntityId} onChange={(e) => st.updateFeatureDraft({ axisEntityId: e.target.value })}>
                <option value="">Select a line…</option>
                {sketchLines.map((l, i) => <option key={l.id} value={l.id}>{l.construction ? 'Centerline' : 'Line'}{i + 1}@{fsketch.name}</option>)}
              </select>
            </Section>
            <Section title="Direction 1">
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
                <select className="k-input" data-testid="revolve-type" value={d.end ?? 'blind'} onChange={(e) => st.updateFeatureDraft({ end: e.target.value as 'blind', direction2: e.target.value === 'midPlane' ? undefined : d.direction2 })}><option value="blind">Blind</option><option value="midPlane">Mid-Plane</option></select>
              </div>
              <div className="k-pm-valuerow">
                <Icon.Dimension size={14} />
                <NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(0.1, Math.min(360, v)) })} unit="°" step={5} min={0} autoFocus />
              </div>
            </Section>
            {(d.end ?? 'blind') !== 'midPlane' && (
              <Section title="Direction2" defaultOpen={!!d.direction2} check={!!d.direction2} onCheck={(on) => st.updateFeatureDraft({ direction2: on ? { angle: Math.min(90, 360 - d.angle) } : undefined })}>
                {d.direction2 && (
                  <div className="k-pm-valuerow">
                    <Icon.Dimension size={14} />
                    <NumberField value={d.direction2.angle} onChange={(v) => st.updateFeatureDraft({ direction2: { angle: Math.max(0, Math.min(360 - d.angle, v)) } })} unit="°" step={5} min={0} />
                  </div>
                )}
              </Section>
            )}
            <Section title="Thin Feature" defaultOpen={!!d.thin} check={!!d.thin} onCheck={(on) => st.updateFeatureDraft({ thin: on ? { mode: 'one', thickness: 2 } : undefined })}>
              {d.thin && (
                <>
                  <select className="k-input" value={d.thin.mode} onChange={(e) => st.updateFeatureDraft({ thin: { ...d.thin!, mode: e.target.value as 'one' } })}>
                    <option value="one">One-Direction</option><option value="mid">Mid-Plane</option><option value="two">Two-Direction</option>
                  </select>
                  <div className="k-pm-valuerow">
                    <button className={`k-pm-stylebtn k-tip ${d.thin.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ thin: { ...d.thin!, reverse: !d.thin!.reverse } })}><Icon.ReverseDir size={16} /></button>
                    <NumberField value={d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                  </div>
                  {d.thin.mode === 'two' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.thin.thickness2 ?? d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness2: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} /></div>}
                </>
              )}
            </Section>
            <Section title="Selected Contours" defaultOpen={false}>
              <SelectedContoursBox sketchName={fsketch.name} contours={d.contours} />
            </Section>
          </>
        )}
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }

  // plane pick: "Edit Sketch" with the yellow message, by design shows it
  if (st.planePick) {
    return (
      <>
        <Header title="Edit Sketch" icon={<Icon.Sketch />} onCancel={st.cancelPlanePick} />
        <Section title="Message">
          <p className="k-pm-message">Select a plane on which to create a sketch for the entity.</p>
        </Section>
      </>
    );
  }

  if (!sketch) {
    return (
      <>
        <Header title={st.doc.name} icon={<Icon.Part />} />
        <Section title="Document">
          <div className="k-field">
            <label>Name</label>
            <input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>
          <div className="k-field">
            <label>Unit system</label>
            <select className="k-input" value={st.unitSystem} onChange={(e) => st.setUnitSystem(e.target.value as 'MMGS')}>
              <option value="MKS">MKS (meter, kilogram, second)</option>
              <option value="CGS">CGS (centimeter, gram, second)</option>
              <option value="MMGS">MMGS (millimeter, gram, second)</option>
              <option value="IPS">IPS (inch, pound, second)</option>
            </select>
          </div>
        </Section>
        <Section title="Sketch">
          <p className="k-muted">Click <b>Sketch</b> and select a plane in the graphics area or in the Feature Tree:</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['front', 'top', 'right'] as const).map((p) => (
              <Button key={p} icon={<Icon.Plane />} onClick={() => st.newSketch(p)}>
                {PLANE_LABELS[p]}
              </Button>
            ))}
          </div>
        </Section>
      </>
    );
  }

  const relOptions = relationsForSelection(sketch, st.selection);
  // Pierce: one point selected while a curve of another sketch crosses the plane
  const selPoint = st.selection.length === 1 ? (st.selection[0].kind === 'point' ? st.selection[0].id : sketch.entities[st.selection[0].id]?.kind === 'point' ? (sketch.entities[st.selection[0].id] as { p: string }).p : null) : null;
  const pierceable = selPoint && Object.keys(st.doc.sketches).length > 1 ? selPoint : null;
  const selectedEntities = st.selection.filter((s) => s.kind === 'entity');
  const constraintsOfSelection = sketch.constraintOrder
    .map((id) => sketch.constraints[id])
    .filter((k) => st.selection.some((s) => k.refs.includes(s.id)));

  const commitValue = () => {
    if (!c) return;
    if (valueOf === c.id && c.value !== value) st.updateDimension(c.id, { value });
    onEditDone();
  };

  const dimName = (k: Constraint) => sketchDimensionName(sketch, k.id);
  const isDraw = ['line', 'centerline', 'midpointLine', 'rectangle', 'centerRectangle', 'rect3Corner', 'rect3Center', 'parallelogram', 'circle', 'perimeterCircle', 'arcCenter', 'arc3', 'tangentArc', 'polygon', 'slot', 'centerSlot', 'spline', 'ellipse', 'partialEllipse', 'point'].includes(st.tool);
  const isRect = st.tool === 'rectangle' || st.tool === 'centerRectangle' || st.tool === 'rect3Corner' || st.tool === 'rect3Center' || st.tool === 'parallelogram';
  // after a rectangle is drawn the intended design shows its relations, options and corner coordinates
  const lastRect = isRect ? lastRectangle(sketch) : null;
  const rectCorners = (lastRect ?? []).map((id) => {
    const e = sketch.entities[id];
    if (!e || e.kind !== 'line') return null;
    const p = sketch.points[e.p1];
    return p ? { id: e.p1, x: p.x, y: p.y } : null;
  });
  const rectRefs = new Set<string>([...(lastRect ?? []), ...rectCorners.filter(Boolean).map((c) => c!.id)]);
  const rectRelations = lastRect ? sketch.constraintOrder.map((id) => sketch.constraints[id]).filter((k) => k && k.refs.some((r) => rectRefs.has(r))) : [];
  const rectStatusRaw = lastRect ? lastRect.map((id) => solve?.entityStatus[id]) : [];
  const rectStatus = rectStatusRaw.some((x) => x === 'over') ? 'Over Defined' : rectStatusRaw.every((x) => x === 'full') ? 'Fully Defined' : 'Under Defined';
  const toolIcon: Record<string, ReactNode> = { rectangle: <Icon.Rect />, centerRectangle: <Icon.CenterRect />, rect3Corner: <Icon.Rect3Corner />, rect3Center: <Icon.Rect3Center />, parallelogram: <Icon.Parallelogram />, midpointLine: <Icon.MidLine />, circle: <Icon.Circle />, line: <Icon.Line />, centerline: <Icon.Construction />, arc3: <Icon.Arc />, arcCenter: <Icon.ArcCenter />, polygon: <Icon.Polygon />, slot: <Icon.Slot />, centerSlot: <Icon.Slot />, trim: <Icon.Trim />, extend: <Icon.Arrow />, sketchFillet: <Icon.Fillet2D />, sketchChamfer: <Icon.Chamfer />, offset: <Icon.Offset />, moveEntities: <Icon.Arrow />, copyEntities: <Icon.Arrow />, rotateEntities: <Icon.Rebuild />, scaleEntities: <Icon.Fit />, linearSketchPattern: <Icon.Pattern />, circularSketchPattern: <Icon.Pattern />, spline: <Icon.Spline />, styleSpline: <Icon.Spline />, equationCurve: <Icon.Spline />, partialEllipse: <Icon.Ellipse />, parabola: <Icon.Arc />, conic: <Icon.Arc />, fullyDefine: <Icon.Lock />, point: <Icon.Point />, dimension: <Icon.Dimension />, select: <Icon.Sketch /> };

  return (
    <>
      {c ? (
        <Header title={isDimension(c) ? 'Dimension' : relationLabel(c.kind)} icon={<Icon.Dimension />} onOk={commitValue} />
      ) : (
        <Header title={st.tool === 'select' && selectedEntities.length === 1 && sketch.entities[selectedEntities[0].id] ? `${({ line: 'Line', circle: 'Circle', arc: 'Arc', spline: 'Spline', ellipse: 'Ellipse', ellipseArc: 'Ellipse', conic: 'Conic', text: 'Text', point: 'Point' } as Record<string, string>)[sketch.entities[selectedEntities[0].id].kind] ?? 'Entity'} Properties` : st.tool === 'select' && st.selection.length === 1 && st.selection[0].kind === 'point' ? 'Point Properties' : TOOL_TITLE[st.tool] ?? sketch.name} icon={toolIcon[st.tool] ?? <Icon.Sketch />} onOk={st.tool === 'select' ? st.exitSketch : st.tool === 'equationCurve' ? () => { if ((eqc.param ? st.addEquationCurve(eqc.xt, eqc.x1, eqc.x2, eqc.yt) : st.addEquationCurve(eqc.expr, eqc.x1, eqc.x2))) st.setTool('select'); } : st.tool === 'fullyDefine' ? () => { st.fullyDefine(fdef); st.setTool('select'); } : APPLY_TOOLS.has(st.tool) ? st.applySketchTool : () => st.setTool('select')} onCancel={st.tool === 'select' ? st.discardSketch : () => st.setTool('select')} />
      )}

      {!c && (st.tool === 'line' || st.tool === 'centerline' || st.tool === 'midpointLine') && (
        <Section title="Message">
          <p className="k-pm-message" data-testid="line-message">Edit the settings of the next new line or sketch a new line.</p>
        </Section>
      )}
      {c && isDimension(c) && (
        <>
          <div className="k-pm-tabs">
            {(['value', 'leaders', 'other'] as const).map((t) => <button key={t} className={dimTab === t ? 'active' : ''} data-testid={`dimtab-${t}`} onClick={() => setDimTab(t)}>{t === 'value' ? 'Value' : t === 'leaders' ? 'Leaders' : 'Other'}</button>)}
          </div>
          {dimTab === 'leaders' && (
            <Section title="Witness/Leader Display" defaultOpen>
              <div className="k-pm-stylerow">
                {(['outside', 'inside', 'smart'] as const).map((a) => (
                  <button key={a} className={`k-pm-stylebtn k-tip ${(c.arrows ?? 'smart') === a ? 'active' : ''}`} data-tip={a === 'outside' ? 'Outside' : a === 'inside' ? 'Inside' : 'Smart'} data-testid={`dimarrows-${a}`} onClick={() => st.updateDimension(c.id, { arrows: a })}>{a === 'outside' ? '→|←' : a === 'inside' ? '←→' : '↔'}</button>
                ))}
              </div>
              <div className="k-field"><label>Arrow style</label>
                <select className="k-input" data-testid="dim-arrowstyle" value={c.arrowStyle ?? 'filled'} onChange={(e) => st.updateDimension(c.id, { arrowStyle: e.target.value as 'filled' })}>
                  <option value="filled">Closed filled</option><option value="open">Open</option><option value="dot">Dot</option><option value="slash">Slash</option>
                </select>
              </div>
            </Section>
          )}
          {dimTab === 'other' && (
            <>
              <Section title="Override Units" defaultOpen>
                <label className="k-check"><input type="checkbox" data-testid="dim-unitoverride" checked={!!c.unitOverride} onChange={(e) => st.updateDimension(c.id, { unitOverride: e.target.checked ? 'in' : undefined })} /> Override units</label>
                {c.unitOverride && <select className="k-input" value={c.unitOverride} onChange={(e) => st.updateDimension(c.id, { unitOverride: e.target.value as 'in' })}><option value="mm">millimeters</option><option value="cm">centimeters</option><option value="in">inches</option></select>}
              </Section>
              <Section title="Text Fonts" defaultOpen>
                <label className="k-check"><input type="checkbox" checked={c.fontSize === undefined} onChange={(e) => st.updateDimension(c.id, { fontSize: e.target.checked ? undefined : 15 })} /> Use document font</label>
                {c.fontSize !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Font size (px)"><Icon.Text size={14} /><NumberField value={c.fontSize} onChange={(v) => st.updateDimension(c.id, { fontSize: Math.max(6, Math.min(48, v)) })} step={1} /></div>}
              </Section>
            </>
          )}
          {dimTab === 'value' && <>
          <Section title="Style" defaultOpen>
            {/* Favorites, by design: apply defaults, add/update, delete, save to a file, load from a file */}
            <div className="k-pm-stylerow">
              <button className="k-pm-stylebtn k-tip" data-tip="Apply the default attributes" data-testid="dimfav-default" onClick={() => st.updateDimension(c.id, { tol: undefined, precision: undefined, dual: undefined, arrows: undefined, arrowStyle: undefined, fontSize: undefined, justify: undefined, unitOverride: undefined, dimText: undefined })}><Icon.Undo size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Add or Update a Favorite" data-testid="dimfav-add" onClick={() => st.setAsk({ title: 'Add or Update a Favorite', text: 'Favorite name', input: dimFav || 'Favorite1', yes: (n) => { if (!n) return; const favs = { ...dimFavs(), [n]: { tol: c.tol, precision: c.precision, dual: c.dual, arrows: c.arrows, arrowStyle: c.arrowStyle, fontSize: c.fontSize, justify: c.justify, dimText: c.dimText } }; saveDimFavs(favs); setDimFav(n); } })}><Icon.Save size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Delete a Favorite" disabled={!dimFav} onClick={() => { const favs = { ...dimFavs() }; delete favs[dimFav]; saveDimFavs(favs); setDimFav(''); }}><Icon.Trash size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Save a Favorite" disabled={!dimFav} onClick={() => { const f = dimFavs()[dimFav]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ [dimFav]: f }, null, 2)], { type: 'application/json' })); a.download = `${dimFav}.sldfvt.json`; a.click(); }}><Icon.Open size={14} /></button>
              <button className="k-pm-stylebtn k-tip" data-tip="Load Favorites" onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = async () => { const file = i.files?.[0]; if (!file) return; try { const add = JSON.parse(await file.text()); saveDimFavs({ ...dimFavs(), ...add }); setDimFav(Object.keys(add)[0] ?? ''); } catch { st.pushMessage('That file has no favorites.', 'warn'); } }; i.click(); }}><Icon.Folder size={14} /></button>
            </div>
            <select className="k-input" data-testid="dimfav-select" value={dimFav} onChange={(e) => { const n = e.target.value; setDimFav(n); const f = dimFavs()[n]; if (f) st.updateDimension(c.id, f); }}>
              <option value="">{'<NONE>'}</option>
              {Object.keys(dimFavs()).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Section>
          <Section title="Tolerance/Precision" defaultOpen>
            <div className="k-field"><label>Tolerance</label>
              <select className="k-input" data-testid="dim-tol" value={c.tol?.type ?? 'none'} onChange={(e) => st.updateDimension(c.id, { tol: e.target.value === 'none' ? undefined : { type: e.target.value as 'basic', plus: c.tol?.plus ?? 0.1, minus: c.tol?.minus ?? 0.1 } })}>
                <option value="none">None</option><option value="basic">Basic</option><option value="bilateral">Bilateral</option><option value="limit">Limit</option><option value="symmetric">Symmetric</option><option value="min">MIN</option><option value="max">MAX</option>
              </select>
            </div>
            {c.tol && ['bilateral', 'limit', 'symmetric'].includes(c.tol.type) && (
              <>
                <div className="k-pm-valuerow k-tip" data-tip="Maximum Variation"><span className="k-pm-xy">+</span><NumberField value={c.tol.plus ?? 0} onChange={(v) => st.updateDimension(c.id, { tol: { ...c.tol!, plus: Math.max(0, v) } })} unit={st.doc.units} step={0.01} /></div>
                {c.tol.type !== 'symmetric' && <div className="k-pm-valuerow k-tip" data-tip="Minimum Variation"><span className="k-pm-xy">−</span><NumberField value={c.tol.minus ?? 0} onChange={(v) => st.updateDimension(c.id, { tol: { ...c.tol!, minus: Math.max(0, v) } })} unit={st.doc.units} step={0.01} /></div>}
              </>
            )}
            <div className="k-field"><label>Precision</label>
              <select className="k-input" data-testid="dim-precision" value={c.precision ?? -1} onChange={(e) => st.updateDimension(c.id, { precision: Number(e.target.value) < 0 ? undefined : Number(e.target.value) })}>
                <option value={-1}>.12 (Document)</option><option value={0}>None</option><option value={1}>.1</option><option value={2}>.12</option><option value={3}>.123</option><option value={4}>.1234</option><option value={5}>.12345</option>
              </select>
            </div>
          </Section>
          <Section title="Primary Value" defaultOpen>
            <input className="k-input" data-testid="dim-name" key={`${c.id}:${dimName(c)}`} defaultValue={dimName(c)} onBlur={(e) => { if (e.target.value !== dimName(c)) st.renameDimension(c.id, e.target.value); }} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            <div className="k-pm-valuerow">
              <Icon.Dimension size={14} />
              <NumberField key={c.id} value={valueOf === c.id ? value : c.value ?? 0} onChange={(v) => { setValue(v); setValueOf(c.id); }} unit={c.kind === 'angle' ? '°' : st.doc.units} step={c.kind === 'angle' ? 1 : 0.5} autoFocus={!st.modify} onCommit={commitValue} />
            </div>
            <label className="k-check"><input type="checkbox" checked={!!c.driven} onChange={(e) => st.updateDimension(c.id, { driven: e.target.checked })} /> Driven</label>
          </Section>
          <Section title="Dimension Text" defaultOpen>
            <textarea className="k-input k-pm-dimtext" data-testid="dim-text" value={c.dimText ?? '<DIM>'} onChange={(e) => st.updateDimension(c.id, { dimText: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
            <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
              {(['left', 'center', 'right'] as const).map((j) => <button key={j} className={`k-pm-stylebtn k-tip ${(c.justify ?? 'center') === j ? 'active' : ''}`} data-tip={`Justify ${j}`} data-testid={`dimjust-${j}`} onClick={() => st.updateDimension(c.id, { justify: j === 'center' ? undefined : j })}>{j === 'left' ? '⫷' : j === 'center' ? '≡' : '⫸'}</button>)}
            </div>
            <div className="k-pm-stylerow k-dimsyms" style={{ marginTop: 4 }}>
              {[['Ø', 'Diameter'], ['°', 'Degree'], ['±', 'Plus/Minus'], ['℄', 'Centerline'], ['□', 'Square'], ['⌵', 'Countersink'], ['⊔', 'Counterbore'], ['↧', 'Depth/Deep']].map(([sym, tip]) => (
                <button key={sym} className="k-pm-stylebtn k-tip" data-tip={tip} data-testid={`dimsym-${tip}`} onClick={() => st.updateDimension(c.id, { dimText: (c.dimText ?? '<DIM>').includes('<DIM>') ? (c.dimText ?? '<DIM>').replace('<DIM>', `${sym}<DIM>`) : `${sym}${c.dimText}` })}>{sym}</button>
              ))}
            </div>
          </Section>
          <label className="k-check"><input type="checkbox" data-testid="dim-uppercase" checked={!!c.uppercase} onChange={(e) => st.updateDimension(c.id, { uppercase: e.target.checked || undefined })} /> All uppercase</label>
          <Section title="Dual Dimension" defaultOpen={!!c.dual} check={!!c.dual} onCheck={(on) => st.updateDimension(c.id, { dual: on || undefined })}>
            <p className="k-muted" style={{ margin: 0 }}>The value is shown in inches as well, in brackets.</p>
          </Section>
          </>}
          <div style={{ display: 'flex', gap: 6, padding: '8px 10px' }}>
            <Button variant="danger" icon={<Icon.Trash />} onClick={() => st.removeRelation(c.id)}>
              Delete
            </Button>
          </div>
        </>
      )}

      {c && !isDimension(c) && (
        <Section title="Relation">
          <div className="k-field">
            <label>Type</label>
            <span>{relationLabel(c.kind)}</span>
          </div>
          <div className="k-field">
            <label>Status</label>
            <span className={`status ${solve?.constraintStatus[c.id] ?? 'ok'}`}>{solve?.constraintStatus[c.id] ?? 'ok'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Button variant="danger" icon={<Icon.Trash />} onClick={() => st.removeRelation(c.id)}>
              Delete
            </Button>
          </div>
        </Section>
      )}

      {!c && isRect && (
        <Section title="Rectangle Type">
          <div className="k-pm-typegrid k-pm-recttypes">
            <button className={`k-pm-typebtn ${st.tool === 'rectangle' ? 'active' : ''}`} title="Corner Rectangle" onClick={() => st.setTool('rectangle')}><Icon.Rect size={30} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'centerRectangle' ? 'active' : ''}`} title="Center Rectangle" onClick={() => st.setTool('centerRectangle')}><Icon.CenterRect size={30} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'rect3Corner' ? 'active' : ''}`} title="3 Point Corner Rectangle" data-testid="rect3corner" onClick={() => st.setTool('rect3Corner')}><Icon.Rect3Corner size={30} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'rect3Center' ? 'active' : ''}`} title="3 Point Center Rectangle" data-testid="rect3center" onClick={() => st.setTool('rect3Center')}><Icon.Rect3Center size={30} /></button>
            <button className={`k-pm-typebtn ${st.tool === 'parallelogram' ? 'active' : ''}`} title="Parallelogram" data-testid="parallelogram" onClick={() => st.setTool('parallelogram')}><Icon.Parallelogram size={30} /></button>
          </div>
          <label className="k-check"><input type="checkbox" checked={rectCons.on} onChange={(e) => setRectCons({ ...rectCons, on: e.target.checked })} data-testid="rect-construction" /> Add construction lines</label>
          {rectCons.on && (
            <div className="k-pm-radios" style={{ marginLeft: 18 }}>
              <label className="k-check"><input type="radio" name="rectcons" checked={rectCons.mode === 'corners'} onChange={() => setRectCons({ ...rectCons, mode: 'corners' })} /> From Corners</label>
              <label className="k-check"><input type="radio" name="rectcons" checked={rectCons.mode === 'midpoints'} onChange={() => setRectCons({ ...rectCons, mode: 'midpoints' })} data-testid="rect-midpoints" /> From Midpoints</label>
            </div>
          )}
        </Section>
      )}

      {!c && lastRect && (
        <>
          <Section title="Existing Relations">
            <ul className="k-list k-pm-relations k-pm-relbox" data-testid="rect-relations">
              {rectRelations.map((k) => {
                const G = RelationGlyph[k.kind];
                return (
                  <li key={k.id} onClick={() => st.selectConstraint(k.id)}>
                    {G ? <G size={14} /> : <Icon.Dimension size={14} />}
                    <span>{relationLabel(k.kind)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="k-pm-status"><span className="k-pm-info">i</span> {rectStatus}</div>
          </Section>
          <Section title="Add Relations">
            <div className="k-pm-addrel">
              <button className="k-pm-relbtn" onClick={() => st.addRelation('horizontal', [lastRect[0]])}>{RelationGlyph.horizontal && <RelationGlyph.horizontal size={14} />}<span>Horizontal</span></button>
              <button className="k-pm-relbtn" onClick={() => st.addRelation('vertical', [lastRect[0]])}>{RelationGlyph.vertical && <RelationGlyph.vertical size={14} />}<span>Vertical</span></button>
              <button className="k-pm-relbtn" onClick={() => st.commit('Fix', (k) => rectCorners.reduce((acc, c) => (c ? (Object.values(acc.constraints).some((x) => x.kind === 'fix' && x.refs[0] === c.id) ? acc : { ...acc, constraints: { ...acc.constraints, ['fx' + c.id]: { id: 'fx' + c.id, kind: 'fix', refs: [c.id] } }, constraintOrder: [...acc.constraintOrder, 'fx' + c.id] }) : acc), k))}>{RelationGlyph.fix && <RelationGlyph.fix size={14} />}<span>Fix</span></button>
            </div>
          </Section>
          <Section title="Options">
            <label className="k-check"><input type="checkbox" data-testid="rect-forconstruction" checked={lastRect.every((id) => sketch.entities[id]?.kind === 'line' && (sketch.entities[id] as { construction?: boolean }).construction)} onChange={() => st.commit('Construction geometry', (k) => toggleConstruction(k, lastRect))} /> For construction</label>
          </Section>
          <Section title="Parameters">
            <div className="k-pm-params" data-testid="rect-params">
              {rectCorners.map((c, i) => c && (
                <div key={c.id} className="k-pm-xyrow">
                  <span className="k-pm-xy">x<sub>{i + 1}</sub></span>
                  <NumberField value={round(c.x)} onChange={(v) => st.commit('Rectangle parameters', (k) => ({ ...k, points: { ...k.points, [c.id]: { ...k.points[c.id], x: v } } }))} step={1} />
                  <span className="k-pm-xy">y<sub>{i + 1}</sub></span>
                  <NumberField value={round(c.y)} onChange={(v) => st.commit('Rectangle parameters', (k) => ({ ...k, points: { ...k.points, [c.id]: { ...k.points[c.id], y: v } } }))} step={1} />
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {(st.tool === 'circle' || st.tool === 'perimeterCircle') && !c && (
        <Section title="Circle Type">
          <div className="k-pm-typerow">
            <button className={`k-pm-typebtn k-tip${st.tool === 'circle' ? ' active' : ''}`} data-tip="Circle" onClick={() => st.setTool('circle')}><Icon.Circle size={22} /></button>
            <button className={`k-pm-typebtn k-tip${st.tool === 'perimeterCircle' ? ' active' : ''}`} data-tip="Perimeter Circle" onClick={() => st.setTool('perimeterCircle')}><Icon.PerimeterCircle size={22} /></button>
          </div>
        </Section>
      )}
      {(st.tool === 'arcCenter' || st.tool === 'arc3' || st.tool === 'tangentArc') && !c && (
        <Section title="Arc Type">
          <div className="k-pm-typerow">
            <button className={`k-pm-typebtn k-tip${st.tool === 'arcCenter' ? ' active' : ''}`} data-tip="Centerpoint Arc" onClick={() => st.setTool('arcCenter')}><Icon.ArcCenter size={22} /></button>
            <button className={`k-pm-typebtn k-tip${st.tool === 'tangentArc' ? ' active' : ''}`} data-tip="Tangent Arc" onClick={() => st.setTool('tangentArc')}><Icon.TangentArc size={22} /></button>
            <button className={`k-pm-typebtn k-tip${st.tool === 'arc3' ? ' active' : ''}`} data-tip="3 Point Arc" onClick={() => st.setTool('arc3')}><Icon.Arc size={22} /></button>
          </div>
        </Section>
      )}
      {!c && !isRect && st.tool !== 'equationCurve' && st.tool !== 'fullyDefine' && !['circle', 'perimeterCircle', 'arcCenter', 'arc3', 'tangentArc', 'polygon'].includes(st.tool) && (
        <Section title="Message">
          <p className="k-pm-message">{TOOL_HELP[st.tool]}</p>
          {st.tool === 'text' && (
            <div data-testid="sketch-text-pm" style={{ marginTop: 8 }}>
              <div className="k-pm-sub">Text</div>
              <textarea className="k-input" rows={2} value={sketchText.text} onChange={(e) => setSketchText({ ...sketchText, text: e.target.value })} />
              <label className="k-check"><input type="checkbox" checked={sketchText.bold} onChange={(e) => setSketchText({ ...sketchText, bold: e.target.checked })} /> Bold</label>
              <div className="k-field"><label>Height</label><NumberField value={sketchText.height} onChange={(v) => setSketchText({ ...sketchText, height: Math.max(0.1, v) })} step={1} min={0.1} /></div>
              <div className="k-field"><label>Width Factor (%)</label><NumberField value={sketchText.widthFactor} onChange={(v) => setSketchText({ ...sketchText, widthFactor: Math.max(10, v) })} step={5} min={10} /></div>
              <div className="k-field"><label>Spacing (%)</label><NumberField value={sketchText.spacing} onChange={(v) => setSketchText({ ...sketchText, spacing: Math.max(10, v) })} step={5} min={10} /></div>
              <div className="k-field"><label>Rotate (°)</label><NumberField value={sketchText.angle} onChange={(v) => setSketchText({ ...sketchText, angle: v })} step={15} /></div>
            </div>
          )}
        </Section>
      )}

      {st.selection.length > 0 && (
        <Section title={`Selected Entities (${st.selection.length})`}>
          <ul className="k-list">
            {st.selection.map((s) => {
              const e = sketch.entities[s.id];
              const label = s.kind === 'point' ? (s.id === sketch.origin ? 'Origin' : 'Point') : e ? { point: 'Point', line: 'Line', circle: 'Circle', arc: 'Arc', spline: e.kind === 'spline' && e.style ? 'Style Spline' : e.kind === 'spline' && e.equation ? 'Equation Driven Curve' : 'Spline', ellipse: 'Ellipse', ellipseArc: 'Partial Ellipse', conic: e.kind === 'conic' && e.parabola ? 'Parabola' : 'Conic', text: 'Text' }[e.kind] : s.id;
              const status = e ? solve?.entityStatus[e.id] : undefined;
              return (
                <li key={s.kind + s.id}>
                  <span>{label}</span>
                  {e?.construction && <span className="k-chip">construction</span>}
                  {status && <span className={`status ${status}`}>{status}</span>}
                </li>
              );
            })}
          </ul>
          {selectedEntities.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Button icon={<Icon.Construction />} onClick={st.toggleConstructionSelection}>
                For construction
              </Button>
              <Button variant="danger" icon={<Icon.Trash />} onClick={st.deleteSelection}>
                Delete
              </Button>
            </div>
          )}
        </Section>
      )}

      {!c && st.selection.length === 1 && st.selection[0].kind === 'point' && sketch.points[st.selection[0].id] && (
        <Section title="Control Vertex Parameters">
          {(['x', 'y'] as const).map((ax) => (
            <div key={ax} className="k-pm-valuerow k-tip" data-tip={ax === 'x' ? 'X Coordinate' : 'Y Coordinate'} data-testid={`point-${ax}`}>
              <span className="k-pm-xy">{ax.toUpperCase()}</span>
              <NumberField value={round(sketch.points[st.selection[0].id][ax])} onChange={(v) => { const id = st.selection[0].id; st.commit('Point', (k) => ({ ...k, points: { ...k.points, [id]: { ...k.points[id], [ax]: v } } })); }} unit={st.doc.units} step={1} />
            </div>
          ))}
        </Section>
      )}
      {constraintsOfSelection.length > 0 && !c && (
        <Section title="Existing Relations">
          <ul className="k-list k-pm-relations">
            {constraintsOfSelection.map((k) => {
              const G = RelationGlyph[k.kind];
              return (
                <li key={k.id} onClick={() => st.selectConstraint(k.id)}>
                  {G ? <G size={14} /> : <Icon.Dimension size={14} />}
                  <span>{relationLabel(k.kind)}</span>
                  {k.value !== undefined && <span className="k-muted">{round(k.value)}</span>}
                  <span className="tail">
                    <span className={`status ${solve?.constraintStatus[k.id] ?? 'ok'}`}>{solve?.constraintStatus[k.id] ?? 'ok'}</span>
                    <button className="k-btn ghost icon" onClick={(e) => { e.stopPropagation(); st.removeRelation(k.id); }} title="Delete">
                      <Icon.Trash size={12} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {(relOptions.length > 0 || pierceable) && (
        <Section title="Add Relations">
          <div className="k-pm-addrel">
            {pierceable && <button className="k-pm-relbtn" data-testid="rel-pierce" onClick={() => st.addPierce(pierceable)}><RelationGlyph.pierce size={14} /><span>Pierce</span></button>}
            {relOptions.map((o) => {
              const G = RelationGlyph[o.kind];
              return (
                <button key={o.kind + o.refs.join()} className="k-pm-relbtn" onClick={() => st.addRelation(o.kind, o.refs, { internal: o.internal })}>
                  {G && <G size={14} />}
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {!c && st.tool === 'equationCurve' && (
        <>
          <Section title="Equation Type">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="eqtype" checked={!eqc.param} onChange={() => setEqc({ ...eqc, param: false, x1: 0, x2: 60 })} /> Explicit</label>
              <label className="k-check"><input type="radio" name="eqtype" checked={eqc.param} onChange={() => setEqc({ ...eqc, param: true, x1: 0, x2: 6.283185307 })} /> Parametric</label>
            </div>
          </Section>
          <Section title="Parameters">
            <div className="k-pm-sub">Equation</div>
            {eqc.param ? (
              <>
                <div className="k-pm-valuerow"><span className="k-pm-xy">x<sub>t</sub> =</span><input className="k-input" data-testid="eq-xt" value={eqc.xt} onChange={(e) => setEqc({ ...eqc, xt: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>
                <div className="k-pm-valuerow"><span className="k-pm-xy">y<sub>t</sub> =</span><input className="k-input" data-testid="eq-yt" value={eqc.yt} onChange={(e) => setEqc({ ...eqc, yt: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>
              </>
            ) : <div className="k-pm-valuerow"><span className="k-pm-xy">y<sub>x</sub> =</span><input className="k-input" data-testid="eq-expr" value={eqc.expr} onChange={(e) => setEqc({ ...eqc, expr: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>}
            <div className="k-pm-sub">Parameters</div>
            <div className="k-pm-xyrow">
              <span className="k-pm-xy">{eqc.param ? 't' : 'x'}<sub>1</sub></span><NumberField value={eqc.x1} onChange={(v) => setEqc({ ...eqc, x1: v })} step={1} />
              <span className="k-pm-xy">{eqc.param ? 't' : 'x'}<sub>2</sub></span><NumberField value={eqc.x2} onChange={(v) => setEqc({ ...eqc, x2: v })} step={1} />
            </div>
            <p className="k-muted" style={{ marginTop: 6 }}>x in mm, sin/cos/tan in radians; pi and e are known.</p>
            <Button data-testid="eq-apply" onClick={() => { if ((eqc.param ? st.addEquationCurve(eqc.xt, eqc.x1, eqc.x2, eqc.yt) : st.addEquationCurve(eqc.expr, eqc.x1, eqc.x2))) st.setTool('select'); }}>Apply</Button>
          </Section>
        </>
      )}
      {!c && st.tool === 'fullyDefine' && (
        <>
          <Section title="Entities to Fully Define">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="fdent" checked={!fdef.selected} onChange={() => setFdef({ ...fdef, selected: false })} /> All entities in sketch</label>
              <label className="k-check"><input type="radio" name="fdent" checked={fdef.selected} onChange={() => setFdef({ ...fdef, selected: true })} /> Selected entities ({selectedEntities.length})</label>
            </div>
            <Button data-testid="fd-calc" onClick={() => { st.fullyDefine(fdef); st.setTool('select'); }}>Calculate</Button>
          </Section>
          <Section title="Relations">
            <label className="k-check"><input type="checkbox" checked={fdef.relations} onChange={(e) => setFdef({ ...fdef, relations: e.target.checked })} /> Horizontal and Vertical</label>
          </Section>
          <Section title="Dimensions">
            <label className="k-check"><input type="checkbox" checked={fdef.dimensions} onChange={(e) => setFdef({ ...fdef, dimensions: e.target.checked })} /> Lengths, radii and positions from the origin</label>
            <div className="k-field"><label>Horizontal Dimensions Scheme</label><select className="k-input" data-testid="fd-hscheme" value={fdef.hScheme} onChange={(e) => setFdef({ ...fdef, hScheme: e.target.value as 'baseline' })}><option value="ordinate">Ordinate</option><option value="baseline">Baseline</option><option value="chain">Chain</option></select></div>
            <div className="k-field"><label>Vertical Dimensions Scheme</label><select className="k-input" value={fdef.vScheme} onChange={(e) => setFdef({ ...fdef, vScheme: e.target.value as 'baseline' })}><option value="ordinate">Ordinate</option><option value="baseline">Baseline</option><option value="chain">Chain</option></select></div>
          </Section>
        </>
      )}

      {!c && st.tool === 'trim' && (
        <Section title="Options">
          <div className="k-pm-radios" data-testid="trim-modes">
            {([['power', 'Power trim'], ['corner', 'Corner'], ['inside', 'Trim away inside'], ['outside', 'Trim away outside'], ['closest', 'Trim to closest']] as const).map(([m, l]) => (
              <label key={m} className="k-check"><input type="radio" name="trimmode" data-testid={`trim-${m}`} checked={st.sketchTool.trimMode === m} onChange={() => st.setSketchTool({ trimMode: m })} /> {l}</label>
            ))}
          </div>
          <p className="k-muted" style={{ margin: '4px 0' }}>{({ power: 'Drag across the entities to trim them.', corner: 'Click two lines: they are trimmed or extended to meet.', inside: 'Click two boundary entities, then the entities to trim between them.', outside: 'Click two boundary entities, then the entities to trim outside them.', closest: 'Click the part of an entity to remove.' } as Record<string, string>)[st.sketchTool.trimMode]}</p>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={st.sketchTool.trimKeep} onChange={(e) => st.setSketchTool({ trimKeep: e.target.checked })} /> Keep trimmed entities as construction geometry</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.trimIgnore} onChange={(e) => st.setSketchTool({ trimIgnore: e.target.checked })} /> Ignore trimming of construction geometry</label>
        </Section>
      )}
      {!c && st.tool === 'sketchFillet' && (
        <Section title="Fillet Parameters">
          <div className="k-pm-valuerow">
            <Icon.Arc size={14} />
            <NumberField value={st.sketchTool.filletRadius} onChange={(v) => st.setSketchTool({ filletRadius: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
          </div>
          <label className="k-check"><input type="checkbox" data-testid="skfillet-keep" checked={st.sketchTool.filletKeepCorners} onChange={(e) => st.setSketchTool({ filletKeepCorners: e.target.checked })} /> Keep constrained corners</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.filletDimension} onChange={(e) => st.setSketchTool({ filletDimension: e.target.checked })} /> Dimension each fillet</label>
          <p className="k-muted" style={{ margin: '4px 0 0' }}>{selectedEntities.length ? 'Now click the second line.' : 'Click the first line of the corner.'}</p>
        </Section>
      )}
      {!c && st.tool === 'sketchChamfer' && (
        <Section title="Chamfer Parameters">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="chamfermode" checked={st.sketchTool.chamferMode === 'angle'} onChange={() => st.setSketchTool({ chamferMode: 'angle' })} /> Angle-distance</label>
            <label className="k-check"><input type="radio" name="chamfermode" checked={st.sketchTool.chamferMode === 'distance'} onChange={() => st.setSketchTool({ chamferMode: 'distance' })} /> Distance-distance</label>
          </div>
          {st.sketchTool.chamferMode === 'angle' && <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.chamferAngle} onChange={(v) => st.setSketchTool({ chamferAngle: Math.max(1, Math.min(89, v)) })} unit="°" step={5} /></div>}
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.chamferEqual} onChange={(e) => st.setSketchTool({ chamferEqual: e.target.checked })} /> Equal distance</label>
          <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D1</span><NumberField value={st.sketchTool.chamferD1} onChange={(v) => st.setSketchTool({ chamferD1: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          {!st.sketchTool.chamferEqual && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D2</span><NumberField value={st.sketchTool.chamferD2} onChange={(v) => st.setSketchTool({ chamferD2: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>}
          <p className="k-muted" style={{ margin: '4px 0 0' }}>{selectedEntities.length ? 'Now click the second line.' : 'Click the first line of the corner.'}</p>
        </Section>
      )}
      {!c && st.tool === 'offset' && (
        <Section title="Parameters">
          <div className="k-pm-valuerow">
            <Icon.Dimension size={14} />
            <NumberField value={st.sketchTool.offsetDistance} onChange={(v) => st.setSketchTool({ offsetDistance: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus onCommit={st.applySketchTool} />
          </div>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetDimensions} onChange={(e) => st.setSketchTool({ offsetDimensions: e.target.checked })} /> Add dimensions</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetReverse} onChange={(e) => st.setSketchTool({ offsetReverse: e.target.checked })} /> Reverse</label>
          <label className="k-check"><input type="checkbox" data-testid="offset-chain" checked={st.sketchTool.offsetChain} onChange={(e) => st.setSketchTool({ offsetChain: e.target.checked })} /> Select chain</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetBidirectional} onChange={(e) => st.setSketchTool({ offsetBidirectional: e.target.checked })} /> Bi-directional</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetCapEnds} disabled={!st.sketchTool.offsetBidirectional} onChange={(e) => st.setSketchTool({ offsetCapEnds: e.target.checked })} /> Cap ends</label>
          <p className="k-muted" style={{ margin: '6px 0 2px' }}>Construction geometry:</p>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetBaseConstruction} onChange={(e) => st.setSketchTool({ offsetBaseConstruction: e.target.checked })} /> Base geometry</label>
          <label className="k-check"><input type="checkbox" checked={st.sketchTool.offsetConstruction} onChange={(e) => st.setSketchTool({ offsetConstruction: e.target.checked })} /> Offset geometry</label>
          <p className="k-muted" style={{ margin: '4px 0 0' }}>{selectedEntities.length} entit{selectedEntities.length === 1 ? 'y' : 'ies'} selected.</p>
        </Section>
      )}
      {!c && (st.tool === 'moveEntities' || st.tool === 'copyEntities') && (
        <>
          <Section title={st.tool === 'moveEntities' ? 'Entities to Move' : 'Entities to Copy'}>
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? selectedEntities.map((e, i) => <div key={e.id} className="k-selbox-row">{sketch.entities[e.id]?.kind === 'line' ? 'Line' : sketch.entities[e.id]?.kind === 'circle' ? 'Circle' : sketch.entities[e.id]?.kind === 'arc' ? 'Arc' : 'Entity'}{i + 1}</div>) : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
            <label className="k-check"><input type="checkbox" data-testid="move-keeprel" checked={st.sketchTool.keepRelations} onChange={(e) => st.setSketchTool({ keepRelations: e.target.checked })} /> Keep relations</label>
          </Section>
          <Section title="Parameters">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="movemode" checked={st.sketchTool.moveMode === 'fromTo'} onChange={() => st.setSketchTool({ moveMode: 'fromTo' })} /> From/To</label>
              <label className="k-check"><input type="radio" name="movemode" checked={st.sketchTool.moveMode === 'xy'} onChange={() => st.setSketchTool({ moveMode: 'xy' })} /> X/Y</label>
            </div>
            {st.sketchTool.moveMode === 'fromTo' ? (
              <>
                <div className="k-pm-sub">Base point</div>
                <div className="k-pm-xyrow"><span className="k-pm-xy">X</span><NumberField value={st.sketchTool.fromX} onChange={(v) => st.setSketchTool({ fromX: v })} step={1} /><span className="k-pm-xy">Y</span><NumberField value={st.sketchTool.fromY} onChange={(v) => st.setSketchTool({ fromY: v })} step={1} /></div>
                <div className="k-pm-sub">To point</div>
                <div className="k-pm-xyrow"><span className="k-pm-xy">X</span><NumberField value={st.sketchTool.toX} onChange={(v) => st.setSketchTool({ toX: v })} step={1} /><span className="k-pm-xy">Y</span><NumberField value={st.sketchTool.toY} onChange={(v) => st.setSketchTool({ toY: v })} step={1} /></div>
              </>
            ) : (
              <>
                <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>ΔX</span><NumberField value={st.sketchTool.dx} onChange={(v) => st.setSketchTool({ dx: v })} unit={st.doc.units} step={1} autoFocus /></div>
                <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>ΔY</span><NumberField value={st.sketchTool.dy} onChange={(v) => st.setSketchTool({ dy: v })} unit={st.doc.units} step={1} /></div>
              </>
            )}
            <button className="k-btn" data-testid="move-repeat" disabled={!selectedEntities.length} onClick={() => st.setSketchTool(st.sketchTool.moveMode === 'fromTo' ? { toX: st.sketchTool.toX + (st.sketchTool.toX - st.sketchTool.fromX), toY: st.sketchTool.toY + (st.sketchTool.toY - st.sketchTool.fromY) } : { dx: st.sketchTool.dx * 2, dy: st.sketchTool.dy * 2 })}>Repeat</button>
          </Section>
        </>
      )}
      {!c && (st.tool === 'rotateEntities' || st.tool === 'scaleEntities') && (
        <>
          <Section title={st.tool === 'rotateEntities' ? 'Entities to Rotate' : 'Entities to Scale'}>
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? <span>{selectedEntities.length} selected</span> : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
            <label className="k-check"><input type="checkbox" checked={st.sketchTool.keepRelations} onChange={(e) => st.setSketchTool({ keepRelations: e.target.checked })} /> Keep relations</label>
          </Section>
          <Section title="Parameters">
            <p className="k-muted" style={{ margin: '0 0 2px' }}>{st.tool === 'rotateEntities' ? 'Center of rotation:' : 'Scale about:'}</p>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>X</span><NumberField value={st.sketchTool.cx} onChange={(v) => st.setSketchTool({ cx: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>Y</span><NumberField value={st.sketchTool.cy} onChange={(v) => st.setSketchTool({ cy: v })} unit={st.doc.units} step={1} /></div>
            {st.tool === 'rotateEntities' ? (
              <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.angle} onChange={(v) => st.setSketchTool({ angle: v })} unit="°" step={5} autoFocus /></div>
            ) : (
              <div className="k-pm-valuerow"><Icon.Fit size={14} /><NumberField value={st.sketchTool.scale} onChange={(v) => st.setSketchTool({ scale: Math.max(0.01, v) })} step={0.1} min={0.01} autoFocus /></div>
            )}
          </Section>
        </>
      )}
      {!c && st.tool === 'linearSketchPattern' && (
        <>
          <Section title="Direction 1">
            <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={st.sketchTool.spacing} onChange={(v) => st.setSketchTool({ spacing: v })} unit={st.doc.units} step={1} autoFocus /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={st.sketchTool.count} onChange={(v) => st.setSketchTool({ count: Math.max(1, Math.round(v)) })} step={1} min={1} /></div>
            <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.direction} onChange={(v) => st.setSketchTool({ direction: v })} unit="°" step={15} /></div>
            <label className="k-check"><input type="checkbox" checked={st.sketchTool.patternDimensions} onChange={(e) => st.setSketchTool({ patternDimensions: e.target.checked })} /> Add dimensions</label>
          </Section>
          <Section title="Direction 2" defaultOpen={false}>
            <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={st.sketchTool.spacing2} onChange={(v) => st.setSketchTool({ spacing2: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={st.sketchTool.count2} onChange={(v) => st.setSketchTool({ count2: Math.max(1, Math.round(v)) })} step={1} min={1} /></div>
            <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.direction2} onChange={(v) => st.setSketchTool({ direction2: v })} unit="°" step={15} /></div>
          </Section>
          <Section title="Entities to Pattern">
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? <span>{selectedEntities.length} selected</span> : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
          </Section>
        </>
      )}
      {!c && st.tool === 'circularSketchPattern' && (
        <>
          <Section title="Parameters">
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>X</span><NumberField value={st.sketchTool.cx} onChange={(v) => st.setSketchTool({ cx: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>Y</span><NumberField value={st.sketchTool.cy} onChange={(v) => st.setSketchTool({ cy: v })} unit={st.doc.units} step={1} /></div>
            <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.circAngle} onChange={(v) => st.setSketchTool({ circAngle: v })} unit="°" step={15} /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={st.sketchTool.circCount} onChange={(v) => st.setSketchTool({ circCount: Math.max(1, Math.round(v)) })} step={1} min={1} autoFocus /></div>
            <label className="k-check"><input type="checkbox" data-testid="circpat-equal" checked={st.sketchTool.circEqual} onChange={(e) => st.setSketchTool({ circEqual: e.target.checked })} /> Equal spacing</label>
            <label className="k-check"><input type="checkbox" checked={st.sketchTool.patternDimensions} onChange={(e) => st.setSketchTool({ patternDimensions: e.target.checked })} /> Add dimensions</label>
          </Section>
          <Section title="Entities to Pattern">
            <div className="k-selbox" style={{ minHeight: 24 }}>{selectedEntities.length ? <span>{selectedEntities.length} selected</span> : <span className="k-muted">Select the entities in the graphics area.</span>}</div>
          </Section>
        </>
      )}
      {!c && (st.tool === 'slot' || st.tool === 'centerSlot' || st.tool === 'arcSlot' || st.tool === 'centerArcSlot') && (
        <>
          <Section title="Slot Types">
            <div className="k-pm-stylerow">
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'slot' ? 'active' : ''}`} data-tip="Straight Slot" onClick={() => st.setTool('slot')}><Icon.Slot size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'centerSlot' ? 'active' : ''}`} data-tip="Centerpoint Straight Slot" onClick={() => st.setTool('centerSlot')}><Icon.Slot size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'arcSlot' ? 'active' : ''}`} data-tip="3 Point Arc Slot" onClick={() => st.setTool('arcSlot')}><Icon.Slot size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${st.tool === 'centerArcSlot' ? 'active' : ''}`} data-tip="Centerpoint Arc Slot" onClick={() => st.setTool('centerArcSlot')}><Icon.Slot size={16} /></button>
            </div>
            <label className="k-check"><input type="checkbox" data-testid="slot-dims" checked={st.sketchTool.slotDimensions} onChange={(e) => st.setSketchTool({ slotDimensions: e.target.checked })} /> Add dimensions</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="slotlen" checked={!st.sketchTool.slotOverall} onChange={() => st.setSketchTool({ slotOverall: false })} /> Center to Center</label>
              <label className="k-check"><input type="radio" name="slotlen" checked={st.sketchTool.slotOverall} onChange={() => st.setSketchTool({ slotOverall: true })} /> Overall Length</label>
            </div>
          </Section>
          <Section title="Parameters" defaultOpen={false}>
            <p className="k-muted">Center and width follow the clicks; dimension the slot afterwards with Smart Dimension.</p>
          </Section>
        </>
      )}

      {!c && !lastRect && isDraw && (st.tool === 'line' || st.tool === 'centerline') && (
        <Section title="Orientation">
          <div className="k-pm-radios" data-testid="line-orientation">
            {([['sketched', 'As sketched'], ['horizontal', 'Horizontal'], ['vertical', 'Vertical'], ['angle', 'Angle']] as const).map(([id, label]) => (
              <label key={id} className="k-check"><input type="radio" name="lineori" checked={(st.sketchTool.lineOrientation ?? 'sketched') === id} onChange={() => st.setSketchTool({ lineOrientation: id })} /> {label}</label>
            ))}
            {st.sketchTool.lineOrientation === 'angle' && <div className="k-pm-valuerow k-tip" data-tip="Angle" style={{ marginLeft: 18 }}><Icon.MateAngle size={14} /><NumberField value={st.sketchTool.lineAngle ?? 45} onChange={(v) => st.setSketchTool({ lineAngle: v })} unit="°" step={5} /></div>}
          </div>
        </Section>
      )}
      {!c && !lastRect && (selectedEntities.length > 0 || isDraw) && (
        <Section title="Options">
          {selectedEntities.length > 0 && !isDraw ? (
            <label className="k-check"><input type="checkbox" checked={selectedEntities.every((s) => sketch.entities[s.id]?.construction)} onChange={st.toggleConstructionSelection} /> For construction</label>
          ) : (
            <>
              <label className="k-check"><input type="checkbox" data-testid="tool-construction" checked={st.sketchTool.forConstruction} onChange={(e) => st.setSketchTool({ forConstruction: e.target.checked })} /> For construction</label>
              {st.tool === 'line' && <label className="k-check"><input type="checkbox" data-testid="line-infinite" checked={st.sketchTool.infiniteLength} onChange={(e) => st.setSketchTool({ infiniteLength: e.target.checked })} /> Infinite length</label>}
              {(st.tool === 'line' || st.tool === 'centerline') && <label className="k-check"><input type="checkbox" data-testid="line-midpoint" checked={!!st.sketchTool.midpointLine} onChange={(e) => st.setSketchTool({ midpointLine: e.target.checked })} /> Midpoint line</label>}
              {(st.tool === 'line' || st.tool === 'centerline' || isRect || st.tool === 'circle' || st.tool === 'perimeterCircle') && <label className="k-check"><input type="checkbox" data-testid="tool-adddims" checked={!!st.sketchTool.addDimensions} onChange={(e) => st.setSketchTool({ addDimensions: e.target.checked })} /> Add dimensions</label>}
              {(st.tool === 'circle' || st.tool === 'perimeterCircle') && <label className="k-check"><input type="checkbox" data-testid="circle-diameter" disabled={!st.sketchTool.addDimensions} checked={st.sketchTool.circleDiameter !== false} onChange={(e) => st.setSketchTool({ circleDiameter: e.target.checked })} /> Diameter dimensions</label>}
            </>
          )}
        </Section>
      )}

      {/* Polygon > Parameters by design: sides, inscribed / circumscribed, centre, diameter, angle, New Polygon */}
      {!c && st.tool === 'polygon' && (
        <Section title="Parameters">
          <div className="k-pm-valuerow k-tip" data-tip="Number of sides" data-testid="polygon-sides"><Icon.Polygon size={16} /><NumberField value={sides} onChange={(v) => setSides(Math.max(3, Math.min(40, Math.round(v))))} step={1} min={3} /></div>
          <div className="k-pm-radios" style={{ paddingLeft: 26 }}>
            <label className="k-check"><input type="radio" name="polycirc" data-testid="polygon-inscribed" checked={polyInscribed} onChange={() => setPolyInscribed(true)} /> Inscribed circle</label>
            <label className="k-check"><input type="radio" name="polycirc" data-testid="polygon-circumscribed" checked={!polyInscribed} onChange={() => setPolyInscribed(false)} /> Circumscribed circle</label>
          </div>
          {/* the polygon drawn last: centre, circle diameter and angle can be changed (greyed until there is one) */}
          {(() => {
            const pg = lastPolygon(sketch);
            const vals = pg ? [pg.center.x, pg.center.y, pg.diameter, pg.angle] : [0, 0, 0, 0];
            const edit = (i: number, v: number) => {
              if (!pg) return;
              const ids = [pg.circleId, ...pg.lineIds];
              const xf = i === 0 ? translate(v - pg.center.x, 0) : i === 1 ? translate(0, v - pg.center.y) : i === 2 ? scaleAbout(pg.center, Math.max(0.001, v) / pg.diameter) : rotateAbout(pg.center, v - pg.angle);
              st.commit('Polygon Parameters', (k) => transformEntities(k, ids, xf));
            };
            return POLY_FIELDS.map(([t, l], i) => (
              <div key={t} className="k-pm-valuerow k-tip" data-tip={t} data-testid={`polygon-param-${i}`}><span className="k-pm-xy">{l}</span><NumberField value={Math.round(vals[i] * 1e6) / 1e6} onChange={(v) => edit(i, v)} disabled={!pg} blankWhenDisabled unit={i === 3 ? '°' : st.doc.units} step={i === 3 ? 15 : 1} /></div>
            ));
          })()}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}><button className="k-btn" onClick={() => st.setTool('polygon')}>New Polygon</button></div>
        </Section>
      )}
      {/* Parameters of the entity drawn last, greyed until there is one, by design */}
      {!c && isDraw && !isRect && (st.tool === 'circle' || st.tool === 'perimeterCircle' || st.tool === 'arcCenter' || st.tool === 'arc3' || st.tool === 'tangentArc' || st.tool === 'line' || st.tool === 'centerline') && (() => {
        const kind = st.tool === 'circle' || st.tool === 'perimeterCircle' ? 'circle' : st.tool === 'line' || st.tool === 'centerline' ? 'line' : 'arc';
        const lastId = [...sketch.entityOrder].reverse().find((id) => sketch.entities[id]?.kind === kind);
        const e = lastId ? sketch.entities[lastId] : null;
        const setPt = (pid: string, patch: { x?: number; y?: number }) => st.commit('Parameters', (k) => ({ ...k, points: { ...k.points, [pid]: { ...k.points[pid], ...patch } } }));
        const setR = (sid: string, v: number) => st.commit('Parameters', (k) => ({ ...k, scalars: { ...k.scalars, [sid]: Math.max(0.001, v) } }));
        const row = (label: string, value: number | null, on: (v: number) => void, unitDeg = false) => (
          <div className="k-pm-valuerow" key={label}><span className="k-pm-xy">{label}</span><NumberField value={value ?? 0} onChange={on} disabled={value === null} blankWhenDisabled={false} unit={unitDeg ? '°' : st.doc.units} step={1} /></div>
        );
        if (kind === 'line') {
          const l = e && e.kind === 'line' ? e : null;
          const a = l ? sketch.points[l.p1] : null, b = l ? sketch.points[l.p2] : null;
          const len = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : null;
          const ang = a && b ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI : null;
          return (
            <>
              <Section title="Parameters">
                {row('L', len !== null ? round(len) : null, (v) => { if (!l || !a || !b || !len) return; const k2 = v / len; setPt(l.p2, { x: a.x + (b.x - a.x) * k2, y: a.y + (b.y - a.y) * k2 }); })}
                {row('∠', ang !== null ? round(ang) : null, (v) => { if (!l || !a || !len) return; const t = (v * Math.PI) / 180; setPt(l.p2, { x: a.x + len * Math.cos(t), y: a.y + len * Math.sin(t) }); }, true)}
              </Section>
              {/* Additional Parameters, by design: start and end point, ΔX and ΔY */}
              <Section title="Additional Parameters" defaultOpen={false}>
                {row('x₁', a ? round(a.x) : null, (v) => l && setPt(l.p1, { x: v }))}
                {row('y₁', a ? round(a.y) : null, (v) => l && setPt(l.p1, { y: v }))}
                {row('x₂', b ? round(b.x) : null, (v) => l && setPt(l.p2, { x: v }))}
                {row('y₂', b ? round(b.y) : null, (v) => l && setPt(l.p2, { y: v }))}
                {row('ΔX', a && b ? round(b.x - a.x) : null, (v) => l && a && setPt(l.p2, { x: a.x + v }))}
                {row('ΔY', a && b ? round(b.y - a.y) : null, (v) => l && a && setPt(l.p2, { y: a.y + v }))}
              </Section>
            </>
          );
        }
        const ce = e && (e.kind === 'circle' || e.kind === 'arc') ? e : null;
        const cp = ce ? sketch.points[ce.center] : null;
        const r = ce ? sketch.scalars[ce.r] : null;
        return (
          <Section title="Parameters">
            {row('Cx', cp ? round(cp.x) : null, (v) => ce && setPt(ce.center, { x: v }))}
            {row('Cy', cp ? round(cp.y) : null, (v) => ce && setPt(ce.center, { y: v }))}
            {row('R', r !== null ? round(r) : null, (v) => ce && setR(ce.r, v))}
          </Section>
        );
      })()}
      {!c && isRect && !lastRect && (
        <Section title="Parameters">
          {[1, 2, 3, 4].map((i) => (
            <div className="k-pm-xyrow" key={i}><span className="k-pm-xy">x<sub>{i}</sub></span><NumberField value={0} onChange={() => undefined} disabled blankWhenDisabled step={1} /><span className="k-pm-xy">y<sub>{i}</sub></span><NumberField value={0} onChange={() => undefined} disabled blankWhenDisabled step={1} /></div>
          ))}
        </Section>
      )}
    </>
  );
}
