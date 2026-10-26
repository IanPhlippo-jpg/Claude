import { useMemo, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import { bodyCheck, sectionProperties } from '../core/features/inspect';
import { findSketchProblems, repairSketch } from '../core/sketch/repair';

export function CheckDialog() {
  const st = useStore(useShallow((s) => ({ selectedFace: s.selectedFace, selectedFaces: s.selectedFaces, selectedEdges: s.selectedEdges, rebuild: s.rebuild, selectedFeatureId: s.selectedFeatureId, doc: s.doc, setDialog: s.setDialog })));
  const [shortLen, setShortLen] = useState(0.01);
  const [ran, setRan] = useState(0);
  const [strict, setStrict] = useState(true);
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [look, setLook] = useState({ faces: true, edges: true, short: true });
  // Selected items: the bodies of the selected faces / edges / feature
  const selectedBodies = useMemo(() => {
    const ids = new Set<string>();
    if (st.selectedFace) ids.add(st.selectedFace.bodyId);
    for (const f of st.selectedFaces) ids.add(f.bodyId);
    for (const e of st.selectedEdges) ids.add(e.split(':')[0]);
    for (const b of st.rebuild.bodies) if (st.selectedFeatureId && b.featureIds.includes(st.selectedFeatureId)) ids.add(b.id);
    return ids;
  }, [st.selectedFace, st.selectedFaces, st.selectedEdges, st.selectedFeatureId, st.rebuild.bodies]);
  const result = useMemo(() => bodyCheck(scope === 'selected' ? st.rebuild.bodies.filter((b) => selectedBodies.has(b.id)) : st.rebuild.bodies, shortLen).map((r) => ({
    ...r,
    // the unchecked kinds are not looked for; without the strict check slivers (degenerate pieces) are tolerated
    degenerate: look.faces && strict ? r.degenerate : 0,
    openEdges: look.edges ? r.openEdges : 0,
    nonManifold: look.edges ? r.nonManifold : 0,
    short: look.short ? r.short : 0,
  })), [st.rebuild.bodies, shortLen, ran, scope, selectedBodies, look, strict]);
  const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return st.doc.features.find((f) => f.id === b?.featureIds[b.featureIds.length - 1])?.name ?? id; };
  const problems = result.reduce((n, r) => n + r.openEdges + r.nonManifold + r.degenerate, 0);
  return (
    <div className="k-float-dialog k-check-dialog" data-testid="check-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Check /> <span>Check Entity</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8, width: 360 }}>
          <fieldset className="k-fieldset"><legend>Check</legend>
            <label className="k-check"><input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /> Strict solid/surface check</label>
            <label className="k-check"><input type="radio" name="chkscope" checked={scope === 'all'} onChange={() => setScope('all')} /> All</label>
            <label className="k-check"><input type="radio" name="chkscope" data-testid="check-selected" checked={scope === 'selected'} onChange={() => setScope('selected')} /> Selected items {scope === 'selected' && <span className="k-muted">({selectedBodies.size ? `${selectedBodies.size} body` : 'select a face or feature'})</span>}</label>
          </fieldset>
          <fieldset className="k-fieldset"><legend>Look for</legend>
            <label className="k-check"><input type="checkbox" checked={look.faces} onChange={(e) => setLook({ ...look, faces: e.target.checked })} /> Invalid faces</label>
            <label className="k-check"><input type="checkbox" checked={look.edges} onChange={(e) => setLook({ ...look, edges: e.target.checked })} /> Invalid edges</label>
            <label className="k-check"><input type="checkbox" checked={look.short} onChange={(e) => setLook({ ...look, short: e.target.checked })} /> Short edges <input className="k-input" style={{ width: 70, marginLeft: 6 }} type="number" step={0.01} value={shortLen} onChange={(e) => setShortLen(Math.max(0, Number(e.target.value)))} /> mm</label>
          </fieldset>
          <div className="k-pm-label">Result list</div>
          <div className="k-selbox" style={{ minHeight: 70 }} data-testid="check-result">
            {problems === 0 ? <div className="k-selbox-row">No invalid faces or edges found.</div> : null}
            {result.map((r) => (
              <div key={r.body}>
                {r.openEdges > 0 && <div className="k-selbox-row">{bodyName(r.body)}: {r.openEdges} open edge(s) — the body is not closed</div>}
                {r.nonManifold > 0 && <div className="k-selbox-row">{bodyName(r.body)}: {r.nonManifold} non-manifold edge(s)</div>}
                {r.degenerate > 0 && <div className="k-selbox-row">{bodyName(r.body)}: {r.degenerate} invalid (degenerate) face piece(s)</div>}
                {r.short > 0 && <div className="k-selbox-row">{bodyName(r.body)}: {r.short} short edge(s)</div>}
              </div>
            ))}
          </div>
          <div className="k-muted" style={{ marginTop: 4 }}>Bodies checked: {result.length}</div>
        </div>
        <div className="k-dialog-actions">
          <button className="k-btn primary" onClick={() => setRan((n) => n + 1)}>Check</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function SectionPropertiesDialog() {
  const st = useStore(useShallow((s) => ({ selectedFace: s.selectedFace, rebuild: s.rebuild, doc: s.doc, setDialog: s.setDialog })));
  const face = st.selectedFace;
  const body = face ? st.rebuild.bodies.find((b) => b.id === face.bodyId) : undefined;
  const f = face ? body?.faces.find((x) => x.id === face.faceId) : undefined;
  const props = useMemo(() => (body && f && !f.curved ? sectionProperties(body.geometry, f.triangles, f.normal) : null), [body, f]);
  const u = st.doc.units;
  const fmt = (x: number) => x.toFixed(2);
  return (
    <div className="k-float-dialog k-sectionprops-dialog" data-testid="section-properties">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Section /> <span>Section Properties</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8, width: 470 }}>
          <div className="k-selbox" style={{ minHeight: 24, marginBottom: 6 }}>{f ? <div className="k-selbox-row">Face&lt;{(body?.faces.indexOf(f) ?? 0) + 1}&gt;</div> : <span className="k-muted">Select a planar face, then Recalculate.</span>}</div>
          {props ? (
            <div className="k-mass-report" data-testid="section-report">
              <div>Section properties of selected face of {st.doc.name}</div>
              <div>Area = {fmt(props.area)} {u}^2</div>
              <div>Centroid relative to output coordinate system origin: ( {u} )</div>
              <div style={{ paddingLeft: 12 }}>X = {fmt(props.centroid.x)}</div>
              <div style={{ paddingLeft: 12 }}>Y = {fmt(props.centroid.y)}</div>
              <div style={{ paddingLeft: 12 }}>Z = {fmt(props.centroid.z)}</div>
              <div>Moments of inertia of the area, at the centroid: ( {u} ^ 4 )</div>
              <div style={{ paddingLeft: 12 }}>Lxx = {fmt(props.ixx)}{'    '}Lxy = {fmt(props.ixy)}</div>
              <div style={{ paddingLeft: 12 }}>Lyx = {fmt(props.ixy)}{'    '}Lyy = {fmt(props.iyy)}</div>
              <div>Polar moment of inertia of the area, at the centroid = {fmt(props.ixx + props.iyy)} {u} ^ 4</div>
            </div>
          ) : f?.curved ? <p className="k-pm-message">Section properties need a planar face.</p> : null}
        </div>
        <div className="k-dialog-actions">
          <button className="k-btn primary" onClick={() => st.setDialog('sectionProps')}>Recalculate</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Close</button>
        </div>
      </div>
    </div>
  );
}

/** Sketch ▸ Repair Sketch: the problems found in the active sketch and a Repair button (gap tolerance adjustable). */
export function RepairSketchDialog() {
  const st = useStore(useShallow((s) => ({ activeSketchId: s.activeSketchId, doc: s.doc, setDialog: s.setDialog, commit: s.commit })));
  const [gap, setGap] = useState(0.05);
  const sketch = st.activeSketchId ? st.doc.sketches[st.activeSketchId] : null;
  const problems = useMemo(() => (sketch ? findSketchProblems(sketch, gap) : []), [sketch, gap]);
  return (
    <div className="k-float-dialog k-repair-dialog" data-testid="repair-sketch">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Rebuild /> <span>Repair Sketch</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8, width: 360 }}>
          <div className="k-field"><label>Show gaps smaller than</label><input className="k-input" style={{ width: 80 }} type="number" step={0.01} value={gap} onChange={(e) => setGap(Math.max(0, Number(e.target.value)))} /> {st.doc.units}</div>
          <div className="k-selbox" style={{ minHeight: 60 }} data-testid="repair-list">
            {!sketch ? <span className="k-muted">Open a sketch first.</span> : problems.length ? problems.map((p, i) => <div key={i} className="k-selbox-row">{p.label}</div>) : <div className="k-selbox-row">No problems found in {sketch.name}.</div>}
          </div>
        </div>
        <div className="k-dialog-actions">
          <button className="k-btn primary" disabled={!problems.length} onClick={() => { st.commit('Repair Sketch', (s) => repairSketch(s, gap).sketch); }}>Repair</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Close</button>
        </div>
      </div>
    </div>
  );
}
