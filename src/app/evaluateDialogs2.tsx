import { useMemo, useRef, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import { NumberField, round } from '../ui/components';
import { bodyCompare, compareDocuments, performanceRows, beamEstimateEstimate, symmetryCheck, type DocCompareResult } from '../core/features/evaluate2';
import { parseDocument } from '../core/document/persistence';
import { findMaterial, MATERIAL_LIBRARY, type MaterialDef } from '../core/document/materials';
import { desktop } from './desktop';
import { REFERENCE_PLANE_DEFS as PLANES } from '../core/features/planes';
import type { Document } from '../core/document/types';
import { frameCutList as cutList } from './prefsTables';
import { saveDocumentWith } from './MenuBar';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? round(v, d).toLocaleString('en-US', { maximumFractionDigits: d }) : '∞');

function Shell({ title, icon, testid, width = 420, children, onClose, footer }: { title: string; icon: React.ReactNode; testid: string; width?: number; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode }) {
  return (
    <div className="k-float-dialog" data-testid={testid}>
      <div className="k-panel">
        <div className="k-panel-header">
          {icon} <span>{title}</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={onClose}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8, width }}>{children}</div>
        {footer && <div className="k-panel-footer" style={{ padding: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

/** File ▸ Save As (browser build): file name, Save as copy and continue / and open, Include all referenced components. */
export function SaveAsDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, setDialog: s.setDialog, renameDocument: s.renameDocument })));
  const [name, setName] = useState(st.doc.name);
  const [copy, setCopy] = useState<'none' | 'continue' | 'open'>('none');
  const [refs, setRefs] = useState(false);
  const [suffix, setSuffix] = useState('');
  const finalName = `${name}${suffix}`;
  return (
    <Shell title="Save As" icon={<Icon.Save />} testid="saveas-dialog" width={460} onClose={() => st.setDialog(null)} footer={<><button className="k-btn primary" data-testid="saveas-ok" disabled={!finalName.trim()} onClick={() => { saveDocumentWith({ name: finalName.trim(), copy: copy !== 'none', includeRefs: refs }); if (copy === 'open') st.renameDocument(finalName.trim()); st.setDialog(null); }}>Save</button><button className="k-btn" onClick={() => st.setDialog(null)}>Cancel</button></>}>
      <div className="k-pm-label">File name:</div>
      <div className="k-pm-valuerow"><input className="k-input" data-testid="saveas-name" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /><span className="k-muted">.kcad</span></div>
      <div className="k-pm-label">Save as type:</div>
      <select className="k-input" defaultValue="kcad" onChange={(e) => { if (e.target.value !== 'kcad') { useStore.setState({ exportFormat: e.target.value as 'stl' }); st.setDialog('exportOptions'); } }}>
        <option value="kcad">Phlippo CAD Part (*.kcad)</option>
        <option value="stl">STL (*.stl)</option>
        <option value="3mf">3MF (*.3mf)</option>
        <option value="amf">AMF (*.amf)</option>
        <option value="step">STEP AP214 (*.step)</option>
        <option value="iges">IGES (*.igs)</option>
      </select>
      <fieldset className="k-fieldset" style={{ marginTop: 8 }}><legend>Save as</legend>
        <label className="k-check"><input type="radio" name="saveas" checked={copy === 'none'} onChange={() => setCopy('none')} /> Save as (the open document takes the new name)</label>
        <label className="k-check"><input type="radio" name="saveas" data-testid="saveas-copy" checked={copy === 'continue'} onChange={() => setCopy('continue')} /> Save as copy and continue</label>
        <label className="k-check"><input type="radio" name="saveas" checked={copy === 'open'} onChange={() => setCopy('open')} /> Save as copy and open</label>
        <label className="k-check" style={{ marginTop: 6 }}><input type="checkbox" checked={refs} onChange={(e) => setRefs(e.target.checked)} /> Include all referenced components</label>
        <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 80 }}>Add suffix</span><input className="k-input" style={{ width: 120 }} value={suffix} placeholder="-copy" onChange={(e) => setSuffix(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
      </fieldset>
      <p className="k-muted">Preview: {finalName.trim() || '…'}.kcad</p>
    </Shell>
  );
}

/** Weldments ▸ Cut list properties: the Cut-List-Items with quantity, description, length and the miter angles. */
export function CutListDialog() {
  const st = useStore(useShallow((s) => ({ rebuild: s.rebuild, pushMessage: s.pushMessage, setDialog: s.setDialog })));
  const meta = st.rebuild.bodyMeta ?? {};
  const items = useMemo(() => cutList(st.rebuild.bodies.filter((b) => meta[b.id]?.kind !== 'bead').map((b) => ({ id: b.id, geometry: b.geometry, description: meta[b.id]?.description, length: meta[b.id]?.length, angle1: meta[b.id]?.angle1, angle2: meta[b.id]?.angle2 }))), [st.rebuild.bodies, meta]);
  const beads = st.rebuild.bodies.filter((b) => meta[b.id]?.kind === 'bead');
  const copy = () => {
    const text = ['ITEM NO.\tQTY.\tDESCRIPTION\tLENGTH\tANGLE1\tANGLE2', ...items.map((it, i) => `${i + 1}\t${it.quantity}\t${it.description}\t${fmt(it.length, 1)}\t${fmt(it.angle1, 1)}\t${fmt(it.angle2, 1)}`)].join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    st.pushMessage('Cut list copied to the clipboard.', 'info');
  };
  return (
    <Shell title="Cut-List Properties" icon={<Icon.Weldment />} testid="cutlist-dialog" width={560} onClose={() => st.setDialog(null)} footer={<><button className="k-btn" onClick={copy}>Copy Table</button><button className="k-btn primary" onClick={() => st.setDialog(null)}>OK</button></>}>
      <div className="k-pm-tabs">
        <button className="active">Cut List Summary</button>
        <button onClick={() => st.pushMessage('Properties Summary and Cut List Table follow the summary in this build.', 'info')}>Properties Summary</button>
        <button onClick={() => st.pushMessage('Properties Summary and Cut List Table follow the summary in this build.', 'info')}>Cut List Table</button>
      </div>
      <table className="k-table" data-testid="cutlist-table">
        <thead><tr><th>Item</th><th>Qty.</th><th>Description</th><th>Length</th><th>Angle1</th><th>Angle2</th><th>Volume</th></tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{it.name}</td><td>{it.quantity}</td><td>{it.description || '—'}</td><td>{it.length ? `${fmt(it.length, 1)} mm` : '—'}</td><td>{fmt(it.angle1, 1)}°</td><td>{fmt(it.angle2, 1)}°</td><td>{fmt(it.volume, 0)} mm³</td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={7} className="k-muted">No bodies yet. Add structural members along a sketch.</td></tr>}
        </tbody>
      </table>
      <p className="k-muted" style={{ marginTop: 6 }}>{items.length} cut list item(s), {st.rebuild.bodies.length - beads.length} body(ies){beads.length ? `, ${beads.length} weld bead(s) in the Weld Folder` : ''}. Identical bodies (same size and volume) share one item.</p>
      <label className="k-check"><input type="checkbox" defaultChecked /> Automatically update cut lists</label>
      <label className="k-check"><input type="checkbox" defaultChecked /> Automatically create cut lists</label>
    </Shell>
  );
}

/** Evaluate ▸ Performance Evaluation: the rebuild time of every feature, slowest first, with the model statistics. */
export function PerformanceDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, rebuild: s.rebuild, setDialog: s.setDialog, rebuildAll: s.rebuildAll, pushMessage: s.pushMessage, selectedFeatureId: s.selectedFeatureId, setSelectedFeature: s.setSelectedFeature })));
  const [tab, setTab] = useState<'rebuild' | 'stats'>('rebuild');
  const { rows, total } = useMemo(() => performanceRows(st.doc.features.filter((f) => f.type !== 'sketch'), st.rebuild.times ?? {}), [st.doc.features, st.rebuild.times]);
  const tris = st.rebuild.bodies.reduce((a, b) => a + b.geometry.getAttribute('position').count / 3, 0);
  const faces = st.rebuild.bodies.reduce((a, b) => a + b.faces.length, 0);
  return (
    <Shell title="Performance Evaluation" icon={<Icon.Performance />} testid="performance-dialog" width={520} onClose={() => st.setDialog(null)} footer={<><button className="k-btn" onClick={() => st.rebuildAll()}>Rebuild</button><button className="k-btn" onClick={() => { const text = rows.map((r) => `${r.name}\t${r.time.toFixed(2)} ms\t${r.share.toFixed(1)} %`).join('\n'); navigator.clipboard?.writeText(text).catch(() => {}); st.pushMessage('Performance report copied to the clipboard.', 'info'); }}>Copy to Clipboard</button><button className="k-btn primary" onClick={() => st.setDialog(null)}>Close</button></>}>
      <div className="k-pm-tabs">
        <button className={tab === 'rebuild' ? 'active' : ''} onClick={() => setTab('rebuild')}>Rebuild</button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Statistics</button>
      </div>
      {tab === 'rebuild' && (
        <>
          <div className="k-pm-label" data-testid="perf-total">Total rebuild time: {fmt(total / 1000, 3)} s · {rows.length} feature(s)</div>
          <table className="k-table" data-testid="perf-table">
            <thead><tr><th>Feature Order</th><th>Feature</th><th>Time %</th><th>Time (s)</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === st.selectedFeatureId ? 'selected' : ''} onClick={() => st.setSelectedFeature(r.id)}>
                  <td>{r.order}</td><td>{r.name}</td><td>{fmt(r.share, 1)}</td><td>{fmt(r.time / 1000, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="k-muted">The time is the last rebuild of each feature (booleans and face finding included).</p>
        </>
      )}
      {tab === 'stats' && (
        <table className="k-table" data-testid="perf-stats">
          <tbody>
            <tr><td>Features</td><td>{st.doc.features.filter((f) => f.type !== 'sketch').length}</td></tr>
            <tr><td>Sketches</td><td>{Object.keys(st.doc.sketches).length}</td></tr>
            <tr><td>Solid bodies</td><td>{st.rebuild.bodies.length}</td></tr>
            <tr><td>Surface bodies</td><td>{st.rebuild.surfaceBodies?.length ?? 0}</td></tr>
            <tr><td>Faces</td><td>{faces}</td></tr>
            <tr><td>Triangles</td><td>{Math.round(tris)}</td></tr>
            <tr><td>Rebuild errors</td><td>{Object.keys(st.rebuild.errors).length}</td></tr>
          </tbody>
        </table>
      )}
    </Shell>
  );
}

/** Evaluate ▸ Symmetry Check: the bodies mirrored across a plane must lie on themselves. */
export function SymmetryDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, rebuild: s.rebuild, setDialog: s.setDialog })));
  const [planeId, setPlaneId] = useState('front');
  const [tol, setTol] = useState(0.05);
  const [ran, setRan] = useState(0);
  const planes = [...Object.values(PLANES), ...Object.values(st.doc.planes).filter((p) => p.kind === 'reference')];
  const result = useMemo(() => {
    if (!ran) return null;
    const p = planes.find((x) => x.id === planeId) ?? PLANES.front;
    return symmetryCheck(st.rebuild.bodies, { origin: p.origin, n: p.n }, tol);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ran]);
  const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return st.doc.features.find((f) => f.id === b?.featureIds[b.featureIds.length - 1])?.name ?? id; };
  return (
    <Shell title="Symmetry Check" icon={<Icon.Symmetry />} testid="symmetry-dialog" onClose={() => st.setDialog(null)} footer={<><button className="k-btn primary" data-testid="symmetry-run" onClick={() => setRan((n) => n + 1)}>Check</button><button className="k-btn" onClick={() => st.setDialog(null)}>Close</button></>}>
      <fieldset className="k-fieldset"><legend>Symmetry plane</legend>
        <select className="k-input" data-testid="symmetry-plane" value={planeId} onChange={(e) => setPlaneId(e.target.value)}>
          {planes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="k-pm-valuerow" style={{ marginTop: 4 }}><span className="k-muted" style={{ minWidth: 70 }}>Tolerance</span><NumberField value={tol} onChange={(v) => setTol(Math.max(0.001, v))} unit={st.doc.units} step={0.01} min={0.001} /></div>
        <label className="k-check"><input type="checkbox" defaultChecked /> Highlight asymmetric faces</label>
      </fieldset>
      <div className="k-pm-label">Result</div>
      <div className="k-selbox" style={{ minHeight: 70 }} data-testid="symmetry-result">
        {!result && <span className="k-muted">Pick the plane and click Check.</span>}
        {result && !st.rebuild.bodies.length && <div className="k-selbox-row">No solid bodies to check.</div>}
        {result && st.rebuild.bodies.length > 0 && (
          <>
            <div className="k-selbox-row" style={{ color: result.symmetric ? '#1f7a37' : '#b42318' }}>{result.symmetric ? 'The model is symmetric about the plane.' : 'The model is not symmetric about the plane.'}</div>
            <div className="k-selbox-row">Maximum deviation: {fmt(result.maxDeviation, 3)} {st.doc.units} · mean {fmt(result.meanDeviation, 3)} · {result.samples} sample points</div>
            {Object.entries(result.asymmetricFaces).map(([b, faces]) => <div key={b} className="k-selbox-row">{bodyName(b)}: {faces.length} asymmetric face(s)</div>)}
          </>
        )}
      </div>
    </Shell>
  );
}

/** Evaluate ▸ Compare: Body Compare (two bodies of the model) and Compare Documents (the open model against a file). */
export function CompareDialog() {
  const st = useStore(useShallow((s) => ({ rebuild: s.rebuild, doc: s.doc, setDialog: s.setDialog })));
  const [tab, setTab] = useState<'bodies' | 'documents'>(st.rebuild.bodies.length >= 2 ? 'bodies' : 'documents');
  const [a, setA] = useState(st.rebuild.bodies[0]?.id ?? '');
  const [b, setB] = useState(st.rebuild.bodies[1]?.id ?? '');
  const [ran, setRan] = useState(0);
  const [other, setOther] = useState<{ name: string; doc: Document } | null>(null);
  const [docResult, setDocResult] = useState<DocCompareResult | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyName = (id: string) => { const bd = st.rebuild.bodies.find((x) => x.id === id); return st.doc.features.find((f) => f.id === bd?.featureIds[bd.featureIds.length - 1])?.name ?? id; };
  const result = useMemo(() => {
    if (!ran) return null;
    const ga = st.rebuild.bodies.find((x) => x.id === a), gb = st.rebuild.bodies.find((x) => x.id === b);
    if (!ga || !gb) return null;
    return bodyCompare(ga.geometry, gb.geometry);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ran]);
  const loadOther = (name: string, text: string) => {
    try {
      const doc = parseDocument(text);
      setOther({ name, doc });
      setDocResult(compareDocuments(st.doc, doc));
      setDocError(null);
    } catch (err) {
      setDocError(`Cannot read ${name}: ${(err as Error).message}`);
      setDocResult(null);
    }
  };
  const browse = () => {
    const api = desktop();
    if (api) {
      api.openFile([{ name: 'Phlippo CAD files', extensions: ['kcad', 'json'] }]).then((f) => { if (f && f.data) loadOther(f.name, new TextDecoder().decode(f.data)); });
      return;
    }
    fileRef.current?.click();
  };
  return (
    <Shell title="Compare" icon={<Icon.Compare />} testid="compare-dialog" width={480} onClose={() => st.setDialog(null)} footer={<>{tab === 'bodies' && <button className="k-btn primary" data-testid="compare-run" onClick={() => setRan((n) => n + 1)}>Run Comparison</button>}<button className="k-btn" onClick={() => st.setDialog(null)}>Close</button></>}>
      <div className="k-pm-tabs">
        <button className={tab === 'bodies' ? 'active' : ''} onClick={() => setTab('bodies')}>Body Compare</button>
        <button className={tab === 'documents' ? 'active' : ''} onClick={() => setTab('documents')}>Compare Documents</button>
      </div>
      {tab === 'bodies' && (
        <>
          <fieldset className="k-fieldset"><legend>Bodies</legend>
            <div className="k-pm-label">Reference body:</div>
            <select className="k-input" data-testid="compare-a" value={a} onChange={(e) => setA(e.target.value)}>{st.rebuild.bodies.map((x) => <option key={x.id} value={x.id}>{bodyName(x.id)}</option>)}</select>
            <div className="k-pm-label">Modified body:</div>
            <select className="k-input" data-testid="compare-b" value={b} onChange={(e) => setB(e.target.value)}>{st.rebuild.bodies.map((x) => <option key={x.id} value={x.id}>{bodyName(x.id)}</option>)}</select>
            {st.rebuild.bodies.length < 2 && <p className="k-muted">Body Compare needs two bodies (Merge result off, or a split body). Use Compare Documents for another file.</p>}
          </fieldset>
          <div className="k-pm-label">Result</div>
          <div className="k-selbox" style={{ minHeight: 80 }} data-testid="compare-result">
            {!result && <span className="k-muted">Pick two bodies and run the comparison.</span>}
            {result && (
              <>
                <div className="k-selbox-row" style={{ color: result.identical ? '#1f7a37' : '#b42318' }}>{result.identical ? 'The bodies are identical.' : 'The bodies differ.'}</div>
                <div className="k-selbox-row">Common volume: {fmt(result.common, 1)} mm³</div>
                <div className="k-selbox-row">Material removed (only in the reference): {fmt(result.onlyA, 1)} mm³</div>
                <div className="k-selbox-row">Material added (only in the modified body): {fmt(result.onlyB, 1)} mm³</div>
                <div className="k-selbox-row">Bounding box deviation: {fmt(result.boxDeviation, 2)} mm</div>
              </>
            )}
          </div>
        </>
      )}
      {tab === 'documents' && (
        <>
          <fieldset className="k-fieldset"><legend>Documents</legend>
            <div className="k-pm-label">Reference document: {st.doc.name}</div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ flex: 1 }}>Modified document: {other ? other.name : '(none)'}</span><button className="k-btn" data-testid="compare-browse" onClick={browse}>Browse…</button></div>
            <input ref={fileRef} type="file" accept=".kcad,.json" style={{ display: 'none' }} data-testid="compare-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then((t) => loadOther(f.name, t)); e.target.value = ''; }} />
            <label className="k-check"><input type="checkbox" defaultChecked /> Document properties</label>
            <label className="k-check"><input type="checkbox" defaultChecked /> Features</label>
            <label className="k-check"><input type="checkbox" defaultChecked /> Geometry</label>
          </fieldset>
          <div className="k-pm-label">Result</div>
          <div className="k-selbox" style={{ minHeight: 80 }} data-testid="compare-docs">
            {docError && <div className="k-selbox-row" style={{ color: '#b42318' }}>{docError}</div>}
            {!docResult && !docError && <span className="k-muted">Browse to the document to compare with.</span>}
            {docResult && (
              <>
                <div className="k-selbox-row">{docResult.unchanged} unchanged · {docResult.changed.length} modified · {docResult.added.length} added · {docResult.removed.length} removed</div>
                {docResult.changed.map((n) => <div key={`c${n}`} className="k-selbox-row" style={{ color: '#9a6700' }}>Modified: {n}</div>)}
                {docResult.added.map((n) => <div key={`a${n}`} className="k-selbox-row" style={{ color: '#1f7a37' }}>Added: {n}</div>)}
                {docResult.removed.map((n) => <div key={`r${n}`} className="k-selbox-row" style={{ color: '#b42318' }}>Removed: {n}</div>)}
                {docResult.properties.map((p) => <div key={p.name} className="k-selbox-row">{p.name}: {p.a} → {p.b}</div>)}
              </>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

const STEPS = ['Welcome', 'Fixtures', 'Loads', 'Material', 'Run', 'Results'] as const;

/** Evaluate ▸ Quick Beam Estimate Analysis Wizard: fixtures, loads, material, a beam-model estimate and the results. */
export function BeamEstimateDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, selectedFace: s.selectedFace, rebuild: s.rebuild, pushMessage: s.pushMessage, setDialog: s.setDialog, setMaterial: s.setMaterial })));
  const [step, setStep] = useState(0);
  const [fixture, setFixture] = useState<{ normal: [number, number, number]; point: [number, number, number]; label: string } | null>(null);
  const [load, setLoad] = useState<{ normal: [number, number, number]; point: [number, number, number]; area: number; label: string } | null>(null);
  const [force, setForce] = useState(100);
  const [materialName, setMaterialName] = useState(st.doc.material?.name ?? 'Plain Carbon Steel');
  const [ran, setRan] = useState(false);
  const mat: MaterialDef | undefined = findMaterial(materialName);
  const pickedFace = () => {
    const sf = st.selectedFace;
    const b = sf ? st.rebuild.bodies.find((x) => x.id === sf.bodyId) : undefined;
    const f = b?.faces.find((x) => x.id === sf?.faceId);
    if (!b || !f) {
      st.pushMessage('Select a face of the part in the graphics area first.', 'warn');
      return null;
    }
    return { normal: [...f.normal] as [number, number, number], point: [...f.centroid] as [number, number, number], area: f.area, label: `Face<${b.faces.indexOf(f) + 1}>` };
  };
  const result = useMemo(() => {
    if (!ran || !fixture || !load || !mat || !st.rebuild.bodies.length) return null;
    return beamEstimateEstimate({ body: st.rebuild.bodies[0].geometry, fixture, load, force, elasticModulus: mat.elasticModulus ?? 2e11, yieldStrength: mat.yield ?? mat.tensile ?? 2.2e8 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ran]);
  const canNext = step === 0 || (step === 1 && !!fixture) || (step === 2 && !!load) || (step === 3 && !!mat) || (step === 4 && ran) || step === 5;
  return (
    <Shell title="Quick Beam Estimate" icon={<Icon.Simulation />} testid="beamEstimate-dialog" width={460} onClose={() => st.setDialog(null)} footer={<><button className="k-btn" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</button><button className="k-btn primary" data-testid="beam-next" disabled={!canNext || step === STEPS.length - 1} onClick={() => setStep((s) => s + 1)}>Next</button><button className="k-btn" onClick={() => st.setDialog(null)}>Close</button></>}>
      <div className="k-beam-steps" data-testid="beam-steps" style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => <span key={s} className={`k-pill${i === step ? ' active' : ''}`} style={{ padding: '2px 8px', borderRadius: 10, background: i === step ? 'var(--accent)' : 'var(--bg-2)', color: i === step ? '#fff' : 'inherit', fontSize: 11 }}>{i + 1}. {s}</span>)}
      </div>
      {step === 0 && (
        <>
          <p className="k-pm-message">Quick Beam Estimate: define fixtures and loads on the part, assign a material and get an indicative stress, displacement and yield-to-stress ratio from a beam model. Not for design decisions.</p>
          <fieldset className="k-fieldset"><legend>Options</legend>
            <div className="k-pm-label">System of units:</div>
            <select className="k-input" defaultValue="SI"><option>SI</option><option>English (IPS)</option><option>Metric (G)</option></select>
            <label className="k-check"><input type="checkbox" defaultChecked /> Show annotation for maximum and minimum in the result plots</label>
          </fieldset>
          <p className="k-muted" data-testid="beam-disclaimer">Indicative only: the part is treated as a beam between the fixed and loaded faces (bending plus shear). This is not a finite element analysis and not a safety assessment; stress concentrations, buckling, fatigue and contact are not included.</p>
        </>
      )}
      {step === 1 && (
        <fieldset className="k-fieldset"><legend>Fixtures</legend>
          <p className="k-muted">Select the face that is held fixed and click Add a fixture.</p>
          <button className="k-btn" data-testid="beam-addfixture" onClick={() => { const f = pickedFace(); if (f) setFixture(f); }}>Add a fixture</button>
          <div className="k-selbox" style={{ minHeight: 24, marginTop: 4 }} data-testid="beam-fixture">{fixture ? <div className="k-selbox-row"><Icon.Lock size={12} /> Fixed-1: {fixture.label}</div> : <span className="k-muted">No fixture yet.</span>}</div>
        </fieldset>
      )}
      {step === 2 && (
        <fieldset className="k-fieldset"><legend>Loads</legend>
          <p className="k-muted">Select the face the force acts on, enter the force and click Add a force.</p>
          <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 60 }}>Force</span><NumberField value={force} onChange={(v) => setForce(Math.max(0, v))} unit="N" step={10} min={0} /></div>
          <button className="k-btn" data-testid="beam-addforce" onClick={() => { const f = pickedFace(); if (f) setLoad(f); }}>Add a force</button>
          <div className="k-selbox" style={{ minHeight: 24, marginTop: 4 }} data-testid="beam-load">{load ? <div className="k-selbox-row"><Icon.Arrow size={12} /> Force-1: {force} N normal to {load.label}</div> : <span className="k-muted">No load yet.</span>}</div>
        </fieldset>
      )}
      {step === 3 && (
        <fieldset className="k-fieldset"><legend>Material</legend>
          <select className="k-input" data-testid="beam-material" value={materialName} onChange={(e) => setMaterialName(e.target.value)}>
            {MATERIAL_LIBRARY.map((c) => <optgroup key={c.name} label={c.name}>{c.materials.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}</optgroup>)}
          </select>
          {mat && (
            <table className="k-table" style={{ marginTop: 6 }}>
              <tbody>
                <tr><td>Elastic modulus</td><td>{fmt((mat.elasticModulus ?? 0) / 1e9, 1)} GPa</td></tr>
                <tr><td>Yield strength</td><td>{fmt((mat.yield ?? mat.tensile ?? 0) / 1e6, 1)} MPa</td></tr>
                <tr><td>Mass density</td><td>{fmt(mat.density, 0)} kg/m³</td></tr>
              </tbody>
            </table>
          )}
          <button className="k-btn" style={{ marginTop: 6 }} onClick={() => mat && st.setMaterial({ name: mat.name, density: mat.density, color: mat.color })}>Apply to the part</button>
        </fieldset>
      )}
      {step === 4 && (
        <fieldset className="k-fieldset"><legend>Run</legend>
          <p className="k-muted">Fixed: {fixture?.label} · Force: {force} N on {load?.label} · Material: {materialName}</p>
          <button className="k-btn primary" data-testid="beam-run" onClick={() => setRan(true)}>Run Simulation</button>
          {ran && <p className="k-pm-message" style={{ marginTop: 6 }}>The analysis is complete. Continue to the results.</p>}
        </fieldset>
      )}
      {step === 5 && (
        <fieldset className="k-fieldset"><legend>Results</legend>
          {!result && <span className="k-muted">Run the simulation first.</span>}
          {result && (
            <table className="k-table" data-testid="beam-results">
              <tbody>
                <tr><td>Indicative ratio yield / stress</td><td data-testid="beam-ratio">{fmt(result.fos, 2)} <span className="k-muted">(not a safety factor)</span></td></tr>
                <tr><td>von Mises stress (max)</td><td>{fmt(result.stress / 1e6, 2)} MPa</td></tr>
                <tr><td>Displacement (max)</td><td>{fmt(result.displacement, 4)} mm</td></tr>
                <tr><td>Bending / shear stress</td><td>{fmt(result.bendingStress / 1e6, 2)} / {fmt(result.shearStress / 1e6, 2)} MPa</td></tr>
                <tr><td>Beam model</td><td>span {fmt(result.span, 1)} mm, section {fmt(result.width, 1)} × {fmt(result.height, 1)} mm</td></tr>
              </tbody>
            </table>
          )}
          {result && <p className="k-pm-message" data-testid="beam-warning" style={{ marginTop: 6 }}><b>Not for design decisions.</b> Indicative estimate (beam model): the yield strength is {fmt(result.fos, 2)} times the estimated maximum stress. This does not show that the part is safe; verify the design with a full analysis or a qualified engineer.</p>}
          <p className="k-muted">Estimate from the beam formulas on the part's cross-section (not a finite element result).</p>
        </fieldset>
      )}
    </Shell>
  );
}
