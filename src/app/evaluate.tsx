import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import { combineMassProperties, faceMeasure, massProperties, withExactVolume, massPropertiesInFrame, overrideMassProperties, polylineDistance } from '../core/features/measure';
import { rebuildAssembly } from '../core/assembly/assembly';
import { getPref, lengthDecimals, loadPrefs, savePrefs } from './prefs';
import { defaultDensity, docVolumeUnit, formatNumber, massDocUnits } from './prefsFormat';
import { activeConfiguration } from '../core/document/configurations';
import { sampleEntity } from '../core/sketch/geometry';
import type { Sketch } from '../core/sketch/types';

// the rounding method of Document Properties ▸ Units applies here unless it is for dimensions only
const fmt = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : formatNumber(v, d, false));

/**
 * Mass Properties: a modeless window (the model can still be rotated) with the report text in
 * the layout of the intended design: density, mass, volume, surface area, centre of mass, principal
 * axes and moments, inertia at the centre of mass and at the output coordinate system.
 */
const LEN_UNITS = { mm: { f: 1, s: 'millimeter', p: 'millimeters' }, cm: { f: 0.1, s: 'centimeter', p: 'centimeters' }, m: { f: 0.001, s: 'meter', p: 'meters' }, in: { f: 1 / 25.4, s: 'inch', p: 'inches' } } as const;
const MASS_UNITS = { g: { f: 1, s: 'grams' }, kg: { f: 0.001, s: 'kilograms' }, lb: { f: 1 / 453.59237, s: 'pounds' } } as const;
interface MassOpts { useDoc: boolean; len: keyof typeof LEN_UNITS; mass: keyof typeof MASS_UNITS; decimals: number }
const loadMassOpts = (): MassOpts => { try { return { useDoc: true, len: 'mm', mass: 'g', decimals: 2, ...JSON.parse(String(getPref('mass.options') || '{}')) }; } catch { return { useDoc: true, len: 'mm', mass: 'g', decimals: 2 }; } };

export function MassPropertiesDialog() {
  const st = useStore(useShallow((s) => ({ rebuild: s.rebuild, doc: s.doc, applyDocument: s.applyDocument, pushMessage: s.pushMessage, setDialog: s.setDialog })));
  const body = st.rebuild.bodies[0];
  const [tick, setTick] = useState(0);
  const [includeHidden, setIncludeHidden] = useState(true);
  // Selected items: the whole part, or only the bodies picked here (multibody), as the intended design
  const [picked, setPicked] = useState<string[]>([]);
  const nameOf = (b: { id: string; featureIds: string[] }) => st.doc.bodyNames?.[b.id] ?? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? b.id;
  const [weld, setWeld] = useState(false);
  const [frameId, setFrameId] = useState('default');
  const [opts, setOptsState] = useState<MassOpts>(loadMassOpts);
  const [panel, setPanel] = useState<'options' | 'override' | null>(null);
  const setOpts = (o: MassOpts) => { setOptsState(o); savePrefs({ ...loadPrefs(), 'mass.options': JSON.stringify(o) }); };
  const frames = (st.doc.refGeometry ?? []).filter((r) => r.kind === 'csys');
  const ov = st.doc.massOverride ?? {};
  const setOverride = (o: typeof ov) => st.applyDocument('Override Mass Properties', { ...st.doc, massOverride: o.mass === undefined && !o.centroid ? undefined : o });
  const report = useMemo(() => {
    void tick;
    if (!body) return null;
    const comps = st.doc.components ?? [];
    // Include hidden bodies/components: hidden components are rebuilt in place; hidden bodies of a part count or not
    let bodies = st.rebuild.bodies.filter((b) => (includeHidden || !(st.doc.hiddenBodies ?? []).includes(b.id)) && (!picked.length || picked.includes(b.id)));
    if (includeHidden && comps.some((c) => c.hidden && !c.suppressed)) {
      try {
        const all = rebuildAssembly({ ...st.doc, components: comps.map((c) => ({ ...c, hidden: false })) }).bodies;
        bodies = [...bodies, ...all.filter((b) => comps.some((c) => c.id === b.id && c.hidden))];
      } catch {
        /* the visible bodies only */
      }
    }
    // an assembly: every component with its own material, summed (parallel axis theorem)
    const parts = bodies.filter((b) => !comps.some((c) => c.id === b.id && c.envelope)).map((b) => {
      const comp = comps.find((c) => c.id === b.id);
      const mat = comp ? comp.part.material : st.doc.bodyMaterials?.[b.id] ?? st.doc.material;
      // Material <not specified>: the density of Document Properties ▸ Material Properties (1000 kg/m³ by default)
      return withExactVolume(massProperties(b.geometry, mat ? mat.density / 1e6 : defaultDensity()), b.exactVolume);
    });
    let m = combineMassProperties(parts)!;
    // Show weld bead mass: welded corners add a bead (right-angle triangle, legs = sheet thickness) along their seam
    let beadMass = 0;
    if (weld) {
      const t = st.doc.sheetMetal?.thickness ?? 1;
      const dens = (st.doc.material?.density ?? 1000) / 1e6;
      for (const c of st.rebuild.curves ?? []) {
        if (c.name !== 'Weld Bead') continue;
        let len = 0;
        for (let i = 1; i < c.points.length; i++) len += c.points[i].distanceTo(c.points[i - 1]);
        beadMass += ((t * t) / 2) * len * dens;
      }
    }
    if (ov.mass !== undefined || ov.centroid) m = overrideMassProperties(m, ov);
    const frame = frames.find((f) => f.id === frameId);
    if (frame?.x && frame.y && frame.z) m = massPropertiesInFrame(m, new THREE.Vector3(...frame.origin), new THREE.Vector3(...frame.x), new THREE.Vector3(...frame.y), new THREE.Vector3(...frame.z));
    // Options: units and decimals of the report (document settings: Units ▸ Mass/Section Properties, QA v0.5.1 F112)
    const { len: docLen, mass: docMass } = massDocUnits();
    const L = LEN_UNITS[opts.useDoc ? docLen : opts.len], M = MASS_UNITS[opts.useDoc ? docMass : opts.mass];
    const dec = opts.useDoc ? lengthDecimals() : opts.decimals;
    const V = LEN_UNITS[opts.useDoc ? docVolumeUnit() : opts.len];
    const f = (v: number) => fmt(v, dec);
    const fL = (v: number) => f(v * L.f), fI = (v: number) => f(v * M.f * L.f * L.f);
    const g = M.s;
    const line = (k: string, v: number) => `\t${k} = ${fL(v)}`;
    const axis = (name: string, i: number) => `\t ${name} = (${f(m.principalAxes[i].x)}, ${f(m.principalAxes[i].y)}, ${f(m.principalAxes[i].z)})   \tP${name.slice(1)} = ${fI(m.principalMoments[i])}`;
    const row = (p: string, r: number[]) => `\t${p}xx = ${fI(r[0])}\t${p}xy = ${fI(r[1])}\t${p}xz = ${fI(r[2])}`;
    const row2 = (p: string, r: number[]) => `\t${p}yx = ${fI(r[0])}\t${p}yy = ${fI(r[1])}\t${p}yz = ${fI(r[2])}`;
    const row3 = (p: string, r: number[]) => `\t${p}zx = ${fI(r[0])}\t${p}zy = ${fI(r[1])}\t${p}zz = ${fI(r[2])}`;
    const over = (on: boolean) => (on ? ' (user overridden)' : '');
    return [
      `Mass properties of ${st.doc.name}`,
      `     Material: ${st.doc.material?.name ?? '<not specified>'}`,
      `     Configuration: ${activeConfiguration(st.doc).name}`,
      `     Coordinate system: ${frame?.name ?? '-- default --'}`,
      ``,
      `Density = ${((v) => (v !== 0 && Math.abs(v) < 0.001 ? v.toExponential(3) : v.toFixed(Math.max(3, dec))))((m.density * M.f) / (V.f * V.f * V.f))} ${g} per cubic ${V.s}`,
      ``,
      `Mass = ${f(m.mass * M.f)} ${g}${over(ov.mass !== undefined)}`,
      ...(weld ? [``, `Weld bead mass = ${f(beadMass * M.f)} ${g}`] : []),
      ``,
      `Volume = ${f(m.volume * L.f ** 3)} cubic ${L.p}`,
      ``,
      `Surface area = ${f(m.area * L.f ** 2)}  square ${L.p}`,
      ``,
      `Center of mass: ( ${L.p} )${over(!!ov.centroid)}`,
      line('X', m.centroid.x),
      line('Y', m.centroid.y),
      line('Z', m.centroid.z),
      ``,
      `Principal axes of inertia and principal moments of inertia: ( ${g} * square ${L.p} )`,
      `Taken at the center of mass.`,
      axis('Ix', 0),
      axis('Iy', 1),
      axis('Iz', 2),
      ``,
      `Moments of inertia: ( ${g} * square ${L.p} )`,
      `Taken at the center of mass and aligned with the output coordinate system. (Using positive tensor notation.)`,
      row('L', m.inertiaCentroid[0]),
      row2('L', m.inertiaCentroid[1]),
      row3('L', m.inertiaCentroid[2]),
      ``,
      `Moments of inertia: ( ${g} * square ${L.p} )`,
      `Taken at the output coordinate system. (Using positive tensor notation.)`,
      row('I', m.inertiaOrigin[0]),
      row2('I', m.inertiaOrigin[1]),
      row3('I', m.inertiaOrigin[2]),
    ].join('\n');
  }, [body, st.rebuild.bodies, st.rebuild.curves, st.doc, tick, includeHidden, weld, frameId, opts, ov, frames, picked]);
  const copy = () => {
    if (!report) return;
    navigator.clipboard?.writeText(report).then(() => st.pushMessage('Mass properties copied to the clipboard.'));
  };
  return (
    <div className="k-float-dialog k-mass-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Mass /> <span>Mass Properties</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8 }}>
          <div className="k-field" style={{ marginBottom: 6 }}>
            <label>Selected items:</label>
            <input className="k-input" readOnly data-testid="mass-selected" value={!body ? 'No solid body' : picked.length ? st.rebuild.bodies.filter((b) => picked.includes(b.id)).map(nameOf).join(', ') : `${st.doc.name}.kcad`} />
          </div>
          {st.rebuild.bodies.length > 1 && !st.doc.components?.length && (
            <div className="k-selbox" data-testid="mass-bodies" style={{ marginBottom: 6, maxHeight: 90, overflow: 'auto' }}>
              {st.rebuild.bodies.map((b) => (
                <label key={b.id} className="k-check"><input type="checkbox" checked={picked.includes(b.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, b.id] : p.filter((x) => x !== b.id)))} /> {nameOf(b)}</label>
              ))}
            </div>
          )}
          <div className="k-mass-toolbar">
            <button className={`k-btn${panel === 'options' ? ' active' : ''}`} data-testid="mass-options" onClick={() => setPanel(panel === 'options' ? null : 'options')}>Options…</button>
            <button className={`k-btn${panel === 'override' ? ' active' : ''}`} data-testid="mass-override" onClick={() => setPanel(panel === 'override' ? null : 'override')}>Override Mass Properties…</button>
            <button className="k-btn" onClick={() => setTick((t) => t + 1)}>Recalculate</button>
          </div>
          {panel === 'options' && (
            <div className="k-mass-sub" data-testid="mass-options-panel">
              <label className="k-check"><input type="radio" name="massunits" checked={opts.useDoc} onChange={() => setOpts({ ...opts, useDoc: true })} /> Use document settings</label>
              <label className="k-check"><input type="radio" name="massunits" data-testid="mass-custom" checked={!opts.useDoc} onChange={() => setOpts({ ...opts, useDoc: false })} /> Use custom settings</label>
              <div className="k-pm-valuerow"><label style={{ minWidth: 60 }}>Length:</label><select className="k-input" disabled={opts.useDoc} data-testid="mass-len" value={opts.len} onChange={(e) => setOpts({ ...opts, len: e.target.value as MassOpts['len'] })}>{Object.keys(LEN_UNITS).map((k) => <option key={k} value={k}>{LEN_UNITS[k as MassOpts['len']].p}</option>)}</select></div>
              <div className="k-pm-valuerow"><label style={{ minWidth: 60 }}>Mass:</label><select className="k-input" disabled={opts.useDoc} data-testid="mass-mass" value={opts.mass} onChange={(e) => setOpts({ ...opts, mass: e.target.value as MassOpts['mass'] })}>{Object.keys(MASS_UNITS).map((k) => <option key={k} value={k}>{MASS_UNITS[k as MassOpts['mass']].s}</option>)}</select></div>
              <div className="k-pm-valuerow"><label style={{ minWidth: 60 }}>Decimals:</label><input className="k-input" type="number" min={0} max={8} disabled={opts.useDoc} value={opts.decimals} onChange={(e) => setOpts({ ...opts, decimals: Math.max(0, Math.min(8, Math.round(Number(e.target.value)))) })} /></div>
            </div>
          )}
          {panel === 'override' && (
            <div className="k-mass-sub" data-testid="mass-override-panel">
              <label className="k-check"><input type="checkbox" data-testid="mass-ov-mass" checked={ov.mass !== undefined} onChange={(e) => setOverride({ ...ov, mass: e.target.checked ? Number(((combineMassProperties(st.rebuild.bodies.map((b) => withExactVolume(massProperties(b.geometry, st.doc.material ? st.doc.material.density / 1e6 : defaultDensity()), b.exactVolume)))?.mass) ?? 0).toFixed(2)) : undefined })} /> Override mass</label>
              {ov.mass !== undefined && <div className="k-pm-valuerow"><input className="k-input" type="number" data-testid="mass-ov-value" value={ov.mass} onChange={(e) => setOverride({ ...ov, mass: Math.max(0, Number(e.target.value)) })} /> <span>grams</span></div>}
              <label className="k-check"><input type="checkbox" checked={!!ov.centroid} onChange={(e) => setOverride({ ...ov, centroid: e.target.checked ? [0, 0, 0] : undefined })} /> Override center of mass</label>
              {ov.centroid && <div className="k-pm-valuerow">{(['X', 'Y', 'Z'] as const).map((l, i) => <label key={l} style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>{l}<input className="k-input" style={{ width: 64 }} type="number" value={ov.centroid![i]} onChange={(e) => { const c = [...ov.centroid!] as [number, number, number]; c[i] = Number(e.target.value); setOverride({ ...ov, centroid: c }); }} /></label>)}</div>}
            </div>
          )}
          <label className="k-check"><input type="checkbox" data-testid="mass-hidden" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} /> Include hidden bodies/components</label>
          <label className="k-check"><input type="checkbox" data-testid="mass-com" checked={!!st.doc.centerOfMass} onChange={(e) => st.applyDocument(e.target.checked ? 'Center of Mass' : 'Delete Center of Mass', { ...st.doc, centerOfMass: e.target.checked || undefined })} /> Create Center of Mass feature</label>
          <label className="k-check"><input type="checkbox" data-testid="mass-weld" checked={weld} onChange={(e) => setWeld(e.target.checked)} /> Show weld bead mass</label>
          <div className="k-field"><label>Report coordinate values relative to:</label><select className="k-input" data-testid="mass-frame" value={frameId} onChange={(e) => setFrameId(e.target.value)}><option value="default">-- default --</option>{frames.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
          <pre className="k-mass-report">{report ?? 'Create a solid body first (Extruded Boss/Base).'}</pre>
        </div>
        <div className="k-dialog-actions">
          <button className="k-btn" onClick={() => window.print()}>Print…</button>
          <button className="k-btn" onClick={copy}>Copy to Clipboard</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Close</button>
          <button className="k-btn" onClick={() => st.pushMessage('Mass Properties: select bodies in the graphics area; the report updates after Recalculate.')}>Help</button>
        </div>
      </div>
    </div>
  );
}

interface MeasureLine {
  label: string;
  value: string;
}

/** The measurement lines for the current selection (edges and faces of the body, or sketch entities). */
function measureLines(st: ReturnType<typeof useStore.getState>): { items: string[]; lines: MeasureLine[] } {
  const u = st.doc.units;
  const items: string[] = [];
  const lines: MeasureLine[] = [];
  const body = st.rebuild.bodies[0];
  const sketch: Sketch | null = st.activeSketchId ? st.doc.sketches[st.activeSketchId] : null;
  if (sketch && st.selection.length) {
    const pts: THREE.Vector3[][] = [];
    for (const sel of st.selection) {
      if (sel.kind === 'point') {
        const p = sketch.points[sel.id];
        if (!p) continue;
        items.push(`Point${items.length + 1}`);
        pts.push([new THREE.Vector3(p.x, p.y, 0)]);
        continue;
      }
      const e = sketch.entities[sel.id];
      if (!e) continue;
      const n = items.length + 1;
      if (e.kind === 'line') {
        const a = sketch.points[e.p1], b = sketch.points[e.p2];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        items.push(`Line${n}`);
        lines.push({ label: `Length (Line${n})`, value: `${fmt(len)}${u}` });
        pts.push([new THREE.Vector3(a.x, a.y, 0), new THREE.Vector3(b.x, b.y, 0)]);
      } else if (e.kind === 'circle' || e.kind === 'arc') {
        const r = sketch.scalars[e.r] ?? 0;
        items.push(`${e.kind === 'circle' ? 'Arc' : 'Arc'}${n}`);
        lines.push({ label: `Diameter (Arc${n})`, value: `${fmt(2 * r)}${u}` });
        const sample = sampleEntity(sketch, e, 48);
        lines.push({ label: e.kind === 'circle' ? `Circumference (Arc${n})` : `Length (Arc${n})`, value: `${fmt(e.kind === 'circle' ? 2 * Math.PI * r : polyLength(sample))}${u}` });
        pts.push([new THREE.Vector3(sketch.points[e.center].x, sketch.points[e.center].y, 0)]);
      } else {
        const sample = sampleEntity(sketch, e, 48);
        items.push(`Spline${n}`);
        lines.push({ label: `Length (Spline${n})`, value: `${fmt(polyLength(sample))}${u}` });
        pts.push(sample.map((p) => new THREE.Vector3(p.x, p.y, 0)));
      }
    }
    if (pts.length === 2) {
      const d = polylineDistance(pts[0], pts[1]);
      lines.unshift({ label: 'Distance', value: `${fmt(d.distance)}${u}` }, { label: 'Delta X', value: `${fmt(Math.abs(d.pb.x - d.pa.x))}${u}` }, { label: 'Delta Y', value: `${fmt(Math.abs(d.pb.y - d.pa.y))}${u}` });
    }
    return { items, lines };
  }
  if (!body) return { items, lines };
  const edges = st.selectedEdges.map((id) => body.edges.find((e) => e.id === id)).filter((e) => !!e);
  const faces = st.selectedFaces.map((r) => body.faces.find((f) => f.id === r.faceId)).filter((f) => !!f);
  edges.forEach((e, i) => {
    const n = `Edge<${i + 1}>`;
    items.push(n);
    if (e!.closed && !e!.straight) {
      const d = e!.length / Math.PI;
      lines.push({ label: `Diameter (${n})`, value: `${fmt(d)}${u}` });
      lines.push({ label: `Circumference (${n})`, value: `${fmt(e!.length)}${u}` });
    } else lines.push({ label: `Length (${n})`, value: `${fmt(e!.length)}${u}` });
  });
  faces.forEach((f, i) => {
    const n = `Face<${i + 1}>`;
    items.push(n);
    const fm = faceMeasure(body.geometry, f!.triangles);
    lines.push({ label: `Area (${n})`, value: `${fmt(fm.area)}${u}²` });
    lines.push({ label: `Perimeter (${n})`, value: `${fmt(fm.perimeter)}${u}` });
  });
  if (edges.length === 2 && !faces.length) {
    const d = polylineDistance(edges[0]!.points, edges[1]!.points);
    lines.unshift({ label: 'Distance', value: `${fmt(d.distance)}${u}` }, { label: 'Delta X', value: `${fmt(Math.abs(d.pb.x - d.pa.x))}${u}` }, { label: 'Delta Y', value: `${fmt(Math.abs(d.pb.y - d.pa.y))}${u}` }, { label: 'Delta Z', value: `${fmt(Math.abs(d.pb.z - d.pa.z))}${u}` });
    if (edges[0]!.straight && edges[1]!.straight) {
      const dir = (e: typeof edges[0]) => e!.points[e!.points.length - 1].clone().sub(e!.points[0]).normalize();
      const ang = (Math.acos(Math.min(1, Math.abs(dir(edges[0]).dot(dir(edges[1]))))) * 180) / Math.PI;
      if (ang > 0.01) lines.push({ label: 'Angle', value: `${fmt(ang)}°` });
    }
    lines.push({ label: 'Total Length', value: `${fmt(edges[0]!.length + edges[1]!.length)}${u}` });
  }
  // three or more edges: their total length, as the intended design
  if (edges.length > 2 && !faces.length) lines.push({ label: 'Total Length', value: `${fmt(edges.reduce((n, e) => n + e!.length, 0))}${u}` });
  if (faces.length === 2 && !edges.length && !faces[0]!.curved && !faces[1]!.curved) {
    const n0 = new THREE.Vector3(...faces[0]!.normal), n1 = new THREE.Vector3(...faces[1]!.normal);
    const dot = Math.abs(n0.dot(n1));
    if (dot > 0.9999) {
      const c0 = new THREE.Vector3(...faces[0]!.centroid), c1 = new THREE.Vector3(...faces[1]!.centroid);
      lines.unshift({ label: 'Normal Distance', value: `${fmt(Math.abs(c1.clone().sub(c0).dot(n0)))}${u}` });
    } else lines.unshift({ label: 'Angle', value: `${fmt((Math.acos(Math.min(1, dot)) * 180) / Math.PI)}°` });
    lines.push({ label: 'Total Area', value: `${fmt(faceMeasure(body.geometry, faces[0]!.triangles).area + faceMeasure(body.geometry, faces[1]!.triangles).area)}${u}²` });
  }
  if (faces.length === 1 && edges.length === 1 && !faces[0]!.curved) {
    // point-to-plane distance of the edge's closest point
    const n0 = new THREE.Vector3(...faces[0]!.normal), c0 = new THREE.Vector3(...faces[0]!.centroid);
    let best = Infinity;
    for (const p of edges[0]!.points) best = Math.min(best, Math.abs(p.clone().sub(c0).dot(n0)));
    lines.unshift({ label: 'Distance', value: `${fmt(best)}${u}` });
  }
  return { items, lines };
}

const polyLength = (pts: { x: number; y: number }[]) => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
};

/**
 * Measure: a floating window by design (toolbar with Arc/Circle Measurements, Units,
 * Show XYZ, Projected On, History, Sensor), the selected items and their measurements.
 * Selection in the graphics area accumulates while the window is open.
 */
export function MeasureDialog() {
  const st = useStore();
  const { items, lines } = measureLines(st);
  useEffect(() => {
    st.pushMessage('Measure: select edges, faces or sketch entities to measure; click an item again to deselect it.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="k-float-dialog k-measure-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Measure /> <span>Measure - {st.doc.name}</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-measure-toolbar">
          <button className="k-btn ghost icon k-tip" data-tip="Arc/Circle Measurements"><Icon.Circle size={14} /></button>
          <button className="k-btn ghost icon k-tip" data-tip="Units/Precision"><Icon.Options size={14} /></button>
          <button className="k-btn ghost icon k-tip active" data-tip="Show XYZ Measurements"><Icon.Origin size={14} /></button>
          <button className="k-btn ghost icon k-tip" data-tip="XYZ Relative To"><Icon.Plane size={14} /></button>
          <button className="k-btn ghost icon k-tip" data-tip="Projected On"><Icon.Fit size={14} /></button>
          <button className="k-btn ghost icon k-tip" data-tip="Measurement History"><Icon.History size={14} /></button>
          <button className="k-btn ghost icon k-tip" data-tip="Create Sensor"><Icon.Sensor size={14} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8 }}>
          <div className="k-measure-items">
            {items.length ? items.map((it) => <div key={it}>{it}</div>) : <div className="k-muted">Select two entities to measure the distance between them, or one to see its length, diameter or area.</div>}
          </div>
          <div className="k-measure-results">
            {lines.map((l, i) => (
              <div key={i} className="k-measure-row">
                <span>{l.label}:</span>
                <span className="mono">{l.value}</span>
              </div>
            ))}
          </div>
          {/* the document the measurement comes from, as the intended footer */}
          {items.length > 0 && <div className="k-muted" data-testid="measure-file" style={{ marginTop: 6, fontSize: 11 }}>File: {st.doc.name}  Config: {activeConfiguration(st.doc).name}</div>}
        </div>
      </div>
    </div>
  );
}
