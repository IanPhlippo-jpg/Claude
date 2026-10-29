/** Property Panel building blocks shared by the feature families (split from PropertyPanel.tsx, QA F103). */
import { getPref, loadPrefs, savePrefs } from '../../prefs';
import { isRoundFeature, type HoleFeature } from '../../../core/document/types';
import { useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { type Constraint } from '../../../core/sketch/types';
import { GAUGE_TABLES, type SheetMetalParams } from '../../../core/features/sheetmetal';
import { featureDimensionNames } from '../../../core/document/equations';

/** Sheet-Metal1 Property Panel: Bend Parameters (thickness, radius) and Bend Allowance (K-factor). */
export function SheetMetalPM({ params, onOk, onCancel }: { params: SheetMetalParams; onOk: (p: SheetMetalParams) => void; onCancel: () => void }) {
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
export function holeSubtypePatch(t: string, sz: (typeof HOLE_SIZES)[number] | undefined, fit: 'Close' | 'Normal' | 'Loose', d: HoleFeature): Partial<HoleFeature> {
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

/** the Dimension Text a dimension starts with, as the intended Dimension Property Panel shows it */
export const defaultDimText = (kind: string) => (kind === 'diameter' ? '<MOD-DIAM><DIM>' : kind === 'radius' ? 'R<DIM>' : '<DIM>');

/** the fastener types under ANSI Metric carry the ANSI standard numbers, by design (the value stored stays the ISO name) */
export const ANSI_METRIC_NAMES: Record<string, string> = {
  'Hex Bolt - ISO 4014': 'Hex Bolt - ANSI B18.2.3.5M',
  'Hex Screw - ISO 4017': 'Hex Screw - ANSI B18.2.3.1M',
  'Socket Head Cap Screw - ISO 4762': 'Socket Head Cap Screw - ANSI B18.3.1M',
  'Pan Cross Head - ISO 7045': 'Pan Cross Head - ANSI B18.6.7M',
  'Flat Head Screw - ISO 10642': 'Flat Head Screw - ANSI B18.6.7M',
  'Raised Countersunk Head - ISO 2010': 'Oval Head - ANSI B18.6.7M',
  'Countersunk Head - ISO 7046': 'Flat Head Socket - ANSI B18.3.5M',
};

export const HOLE_SIZES: { size: string; fit: { Close: number; Normal: number; Loose: number }; cb: number; cbDepth: number; cs: number; tap: number; pitch: number }[] = [
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
export const HOLE_SIZES_INCH: typeof HOLE_SIZES = [
  { size: '#4', fit: { Close: 3.0, Normal: 3.3, Loose: 3.6 }, cb: 5.6, cbDepth: 2.9, cs: 5.6, tap: 2.3, pitch: 0.635 },
  { size: '#6', fit: { Close: 3.7, Normal: 3.9, Loose: 4.4 }, cb: 6.7, cbDepth: 3.5, cs: 6.9, tap: 2.7, pitch: 0.794 },
  { size: '#8', fit: { Close: 4.4, Normal: 4.6, Loose: 5.1 }, cb: 7.9, cbDepth: 4.2, cs: 8.4, tap: 3.5, pitch: 0.794 },
  { size: '#10', fit: { Close: 5.0, Normal: 5.3, Loose: 5.8 }, cb: 9.1, cbDepth: 4.8, cs: 9.8, tap: 3.8, pitch: 1.058 },
  { size: '1/4', fit: { Close: 6.5, Normal: 7.1, Loose: 7.9 }, cb: 11.1, cbDepth: 6.4, cs: 12.7, tap: 5.1, pitch: 1.27 },
  { size: '5/16', fit: { Close: 8.3, Normal: 8.7, Loose: 9.5 }, cb: 13.5, cbDepth: 8.0, cs: 15.9, tap: 6.5, pitch: 1.411 },
  { size: '3/8', fit: { Close: 9.9, Normal: 10.3, Loose: 11.1 }, cb: 15.9, cbDepth: 9.5, cs: 19.1, tap: 8.0, pitch: 1.588 },
  { size: '1/2', fit: { Close: 13.1, Normal: 13.9, Loose: 14.7 }, cb: 20.6, cbDepth: 12.7, cs: 25.4, tap: 10.7, pitch: 1.954 },
];
export const holeSizesFor = (std: string) => (std === 'ANSI Inch' ? HOLE_SIZES_INCH : HOLE_SIZES);

/** tools whose Property Panel OK applies the edit (Offset, Move/Copy/Rotate/Scale, patterns) */
export const APPLY_TOOLS = new Set(['offset', 'moveEntities', 'copyEntities', 'rotateEntities', 'scaleEntities', 'linearSketchPattern', 'circularSketchPattern']);

export const TOOL_TITLE: Record<string, string> = {
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
  segment: 'Segment',
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

export const HOLE_TYPES: { id: string; label: string; enabled: boolean }[] = [
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
export function HoleTypeIcon({ kind }: { kind: string }) {
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

export const TOOL_HELP: Record<string, string> = {
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
  segment: 'Select a sketch entity, set the number of segments and click Apply.',
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
export function DetailedPreviewButton() {
  const on = useStore((s) => s.detailedPreview);
  const toggle = useStore((s) => s.toggleDetailedPreview);
  return (
    <button className={`k-pm-eye k-tip ${on ? 'active' : ''}`} data-tip="Detailed Preview" onClick={toggle}>
      <Icon.PreviewEye size={18} />
    </button>
  );
}

/**
 * Selected Contours of the intended design: a selection box listing the picked regions (Sketch1-Region<1> …); while it is
 * active, a click on a region of the profile in the graphics area adds or removes it (shown magenta). Empty = all.
 */
export function SelectedContoursBox({ sketchName, contours }: { sketchName: string; contours?: number[] }) {
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
export function KeepVisibleButton() {
  const on = useStore((s) => s.pmPinned);
  const toggle = useStore((s) => s.togglePmPinned);
  return (
    <button className={`k-pm-eye k-tip ${on ? 'active' : ''}`} data-tip="Keep Visible" data-testid="pm-pin" onClick={toggle}>
      <Icon.Pin style={{ transform: on ? 'none' : 'rotate(45deg)' }} />
    </button>
  );
}

export function Header({ title, icon, onOk, onCancel, okTip = 'OK', cancelTip = 'Cancel', okIcon }: { title: string; icon: ReactNode; onOk?: () => void; onCancel?: () => void; okTip?: string; cancelTip?: string; okIcon?: ReactNode }) {
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
export const POLY_FIELDS: [string, string][] = [['X coordinate of center', 'Cx'], ['Y coordinate of center', 'Cy'], ['Circle diameter', '⌀'], ['Angle', '∠']];

/** dimension Favorites (Dimension Property Panel > Style), kept as JSON text in the preferences */
export function dimFavs(): Record<string, Partial<Constraint>> {
  try { return JSON.parse(String(getPref('sketch.dimFavorites') ?? '{}')) ?? {}; } catch { return {}; }
}
export function saveDimFavs(f: Record<string, unknown>): void {
  savePrefs({ ...loadPrefs(), 'sketch.dimFavorites': JSON.stringify(f) });
}

/** the equation that drives a dimension of the feature being edited (typed in its field, or in Tools ▸ Equations) */
export function fieldEquation(st: { featureEdit: import('../../store').FeatureEdit | null; doc: { equations: { target: string; expression: string }[] } }, prop: string): string | undefined {
  const fe = st.featureEdit;
  if (!fe) return undefined;
  if (fe.equations && prop in fe.equations) return fe.equations[prop] || undefined;
  const dim = featureDimensionNames(fe.draft).find((d) => d.prop === prop);
  return dim ? st.doc.equations.find((e) => e.target === dim.name)?.expression : undefined;
}
