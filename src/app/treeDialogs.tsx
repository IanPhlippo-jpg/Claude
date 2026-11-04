import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Button, Dialog, NumberField } from '../ui/components';
import { featureDependents } from '../core/features/dependents';
import { exportMesh, type MeshExportOptions } from '../core/document/export3d';
import { desktop } from './desktop';
import { getPref } from './prefs';
import { exportDefaults, exportPrefs } from './prefsEffects';

/** Feature Properties: name, description, suppressed, the dates — as the intended dialog */
export function FeaturePropertiesDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, dialogFeatureId: s.dialogFeatureId, applyDocument: s.applyDocument, setDialog: s.setDialog })));
  const f = st.doc.features.find((x) => x.id === st.dialogFeatureId);
  const meta = (f && st.doc.featureMeta?.[f.id]) || {};
  const [name, setName] = useState(f?.name ?? '');
  const [desc, setDesc] = useState(meta.description ?? '');
  const [suppressed, setSuppressed] = useState(!!f?.suppressed);
  if (!f) return null;
  const created = meta.created ?? new Date().toISOString();
  const apply = () => {
    const d = { ...st.doc, features: st.doc.features.map((x) => (x.id === f.id ? { ...x, name: name.trim() || x.name, suppressed } : x)), featureMeta: { ...(st.doc.featureMeta ?? {}), [f.id]: { description: desc, created } } };
    st.applyDocument('Feature Properties', d);
    st.setDialog(null);
  };
  return (
    <Dialog title="Feature Properties" onClose={() => st.setDialog(null)} data-testid="feature-props">
      <div className="k-form" style={{ minWidth: 380 }}>
        <div className="k-field"><label>Name</label><input className="k-input" data-testid="fp-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
        <div className="k-field"><label>Description</label><input className="k-input" data-testid="fp-desc" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
        <label className="k-check"><input type="checkbox" data-testid="fp-suppressed" checked={suppressed} onChange={(e) => setSuppressed(e.target.checked)} /> Suppressed</label>
        <div className="k-field"><label>Created by</label><span>Ian</span></div>
        <div className="k-field"><label>Date created</label><span>{new Date(created).toLocaleString()}</span></div>
        <div className="k-field"><label>Last modified</label><span>{new Date().toLocaleString()}</span></div>
        <p className="k-muted">Suppress this configuration only: use Configure Feature.</p>
      </div>
      <div className="k-dialog-actions">
        <Button variant="primary" data-testid="fp-ok" onClick={apply}>OK</Button>
        <Button onClick={() => st.setDialog(null)}>Cancel</Button>
      </div>
    </Dialog>
  );
}

/** Parent/Child relationships of a feature: what it needs, what needs it */
export function ParentChildDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, dialogFeatureId: s.dialogFeatureId, setDialog: s.setDialog })));
  const f = st.doc.features.find((x) => x.id === st.dialogFeatureId);
  if (!f) return null;
  const nameOf = (id: string) => st.doc.features.find((x) => x.id === id)?.name ?? id;
  const parents: string[] = [];
  const asRec = f as unknown as Record<string, unknown>;
  for (const k of ['sketchId', 'pathSketchId', 'sketchId2']) {
    const sid = asRec[k];
    if (typeof sid === 'string' && sid) { const sk = st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === sid); if (sk) parents.push(sk.name); }
  }
  if (f.type === 'sketch') { const pl = st.doc.sketches[f.sketchId]?.plane; if (pl) parents.push(st.doc.planes[pl]?.name ?? ({ front: 'Front Plane', top: 'Top Plane', right: 'Right Plane' } as Record<string, string>)[pl] ?? pl); }
  for (const g of [...((asRec.profiles as string[] | undefined) ?? []), ...((asRec.guides as string[] | undefined) ?? [])]) { const sk = st.doc.features.find((x) => x.type === 'sketch' && x.sketchId === g); if (sk) parents.push(sk.name); }
  const deps = featureDependents(st.doc, f.id);
  const childIds = [...new Set([...deps.children, ...deps.absorbed].map((x) => (typeof x === 'string' ? x : (x as { id: string }).id)))];
  const children = childIds.filter((id) => id !== f.id).map(nameOf);
  return (
    <Dialog title="Parent/Child Relationships" onClose={() => st.setDialog(null)} data-testid="parent-child">
      <div style={{ display: 'flex', gap: 16, minWidth: 420 }}>
        <div style={{ flex: 1 }}>
          <div className="k-pm-sub">Parents</div>
          <ul className="k-list" data-testid="pc-parents">{parents.length ? parents.map((p, i) => <li key={i}>{p}</li>) : <li className="k-muted">None</li>}</ul>
        </div>
        <div style={{ flex: 1 }}>
          <div className="k-pm-sub">Children</div>
          <ul className="k-list" data-testid="pc-children">{children.length ? children.map((p, i) => <li key={i}>{p}</li>) : <li className="k-muted">None</li>}</ul>
        </div>
      </div>
      <p className="k-muted" style={{ marginTop: 8 }}>{f.name}</p>
      <div className="k-dialog-actions"><Button variant="primary" onClick={() => st.setDialog(null)}>Close</Button></div>
    </Dialog>
  );
}

/** Save As ▸ STL / 3MF / AMF: the Export Options page of the intended design */
export function ExportOptionsDialog() {
  const st = useStore(useShallow((s) => ({ exportFormat: s.exportFormat, doc: s.doc, rebuild: s.rebuild, setPrefs: s.setPrefs, prefs: s.prefs, pushMessage: s.pushMessage, setDialog: s.setDialog, setAsk: s.setAsk })));
  const fmt = st.exportFormat;
  // the page starts from System Options ▸ Export and writes the choices back there
  const [ascii, setAscii] = useState(() => exportDefaults().ascii);
  const [unit, setUnit] = useState<MeshExportOptions['unit']>(() => exportDefaults().unit);
  const [resolution, setResolution] = useState<'coarse' | 'fine' | 'custom'>(() => exportDefaults().resolution);
  const [deviation, setDeviation] = useState(Number(getPref('export.deviation')) || 0.02);
  const [angle, setAngle] = useState(Number(getPref('export.angle')) || 10);
  const [showInfo, setShowInfo] = useState(() => exportDefaults().showInfo);
  const [positive, setPositive] = useState(getPref<boolean>('export.keepPosition') !== true);
  const [single, setSingle] = useState(() => exportDefaults().single);
  const bodies = st.rebuild.bodies.map((b, i) => ({ geometry: b.geometry, name: `Body${i + 1}` }));
  // STEP (QA F51): every body becomes a B-rep solid in OpenCascade (worker), planar faces merged
  const runStep = () => {
    st.setDialog(null);
    st.pushMessage('Writing STEP…', 'info');
    const name = `${st.doc.name}.step`;
    const list = st.rebuild.bodies.map((b, i) => {
      const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
      return { name: `Body${i + 1}`, positions: new Float32Array(g.getAttribute('position').array) };
    });
    const u = (unit ?? 'mm') as 'mm' | 'cm' | 'm' | 'in';
    // a part goes through the B-rep rebuild (true cylinders and rounds); an assembly as sewn meshes
    const part = st.doc.kind !== 'assembly' && st.doc.kind !== 'drawing' && getPref('perf.brepKernel') !== false;
    import('../core/occt/occtClient')
      .then((m) => (part ? m.exportStepDoc(st.doc, useStore.getState().rollbackIndex, u) : m.exportStep(list, u)))
      .then(async (res: { bytes: Uint8Array; volumes: number[]; exact?: number }) => {
        const { bytes, volumes } = res;
        // bodies the B-rep kernel could not rebuild are written as sewn facets: say so (QA F99)
        const faceted = part ? volumes.length - (res.exact ?? 0) : volumes.length;
        const facetNote = faceted > 0 ? ` ${faceted} of ${volumes.length} ${volumes.length === 1 ? 'solid is' : 'solids are'} faceted (sewn from the mesh), not exact surfaces.` : '';
        const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const save = async () => {
          const api = desktop();
          if (api) await api.saveFileAs({ defaultPath: name, filters: [{ name: 'STEP AP214', extensions: ['step', 'stp'] }], data });
          else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([data], { type: 'model/step' }));
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
          }
          st.pushMessage(`${name} saved (${volumes.length} ${volumes.length === 1 ? 'solid' : 'solids'}).${facetNote}`, faceted > 0 ? 'warn' : 'info');
        };
        if (showInfo) st.setAsk({ title: 'STEP Info', text: `${volumes.length} ${volumes.length === 1 ? 'solid' : 'solids'}, AP214, unit ${unit}; volume ${volumes.map((v) => v.toFixed(2)).join(', ')} mm³.${facetNote} Save?`, yes: () => { void save(); } });
        else await save();
      })
      .catch((err: Error) => st.pushMessage(`Cannot write STEP: ${err.message}`, 'error'));
  };
  const run = () => {
    st.setPrefs({ ...st.prefs, ...exportPrefs({ ascii, unit: unit ?? 'mm', resolution, showInfo }), 'export.deviation': deviation, 'export.angle': angle, 'export.keepPosition': !positive, 'export.singleFile': single });
    if (!bodies.length) return st.pushMessage('There is no solid body to export; create one first (Extruded Boss/Base).', 'warn');
    if (fmt === 'step') return runStep();
    const r = exportMesh(bodies, st.doc.name, { format: fmt, ascii, unit, keepPosition: !positive, singleFile: single });
    const save = async () => {
      const api = desktop();
      for (const file of r.files) {
        const data = typeof file.data === 'string' ? (new TextEncoder().encode(file.data).buffer as ArrayBuffer) : file.data;
        if (api) await api.saveFileAs({ defaultPath: file.name, filters: [{ name: fmt.toUpperCase(), extensions: [fmt] }], data });
        else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([data], { type: file.mime }));
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
      st.pushMessage(`${r.files.map((x) => x.name).join(', ')} saved.`, 'info');
    };
    st.setDialog(null);
    if (showInfo) st.setAsk({ title: `${fmt.toUpperCase()} Info`, text: `${r.triangles} triangles, ${bodies.length} ${bodies.length === 1 ? 'body' : 'bodies'}, ${r.files.length} file(s), unit ${unit}${positive ? ', translated to positive space' : ''}. Save?`, yes: () => { void save(); } });
    else void save();
  };
  return (
    <Dialog title={`Export Options — ${fmt.toUpperCase()}`} onClose={() => st.setDialog(null)} data-testid="export-options">
      <div className="k-form" style={{ minWidth: 420 }}>
        {fmt === 'step' && (
          <div className="k-field"><label>Output as</label>
            <select className="k-input" data-testid="export-step-schema" value="ap214" onChange={() => undefined}>
              <option value="ap214">AP214</option>
            </select>
          </div>
        )}
        {fmt === 'stl' && (
          <div className="k-field"><label>Output as</label>
            <div className="k-pm-radios" data-testid="export-output">
              <label className="k-check"><input type="radio" name="stlout" checked={!ascii} onChange={() => setAscii(false)} /> Binary</label>
              <label className="k-check"><input type="radio" name="stlout" checked={ascii} onChange={() => setAscii(true)} /> ASCII</label>
            </div>
          </div>
        )}
        <div className="k-field"><label>Unit</label>
          <select className="k-input" data-testid="export-unit" value={unit} onChange={(e) => setUnit(e.target.value as MeshExportOptions['unit'])}>
            <option value="mm">Millimeters</option><option value="cm">Centimeters</option><option value="m">Meters</option><option value="in">Inches</option>
          </select>
        </div>
        <div className="k-field"><label>Resolution</label>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="res" checked={resolution === 'coarse'} onChange={() => setResolution('coarse')} /> Coarse</label>
            <label className="k-check"><input type="radio" name="res" checked={resolution === 'fine'} onChange={() => setResolution('fine')} /> Fine</label>
            <label className="k-check"><input type="radio" name="res" checked={resolution === 'custom'} onChange={() => setResolution('custom')} /> Custom</label>
          </div>
        </div>
        {resolution === 'custom' && (
          <>
            <div className="k-field"><label>Deviation Tolerance</label><NumberField value={deviation} onChange={setDeviation} unit="mm" step={0.01} min={0.001} /></div>
            <div className="k-field"><label>Angle Tolerance</label><NumberField value={angle} onChange={setAngle} unit="°" step={1} min={0.5} /></div>
          </>
        )}
        <p className="k-muted">The mesh follows the document's Image Quality; Coarse/Fine/Custom are kept with the file options.</p>
        <label className="k-check"><input type="checkbox" data-testid="export-showinfo" checked={showInfo} onChange={(e) => setShowInfo(e.target.checked)} /> Show {fmt.toUpperCase()} info before file saving</label>
        <label className="k-check"><input type="checkbox" checked={!positive} onChange={(e) => setPositive(!e.target.checked)} /> Do not translate {fmt.toUpperCase()} output data to positive space</label>
        <label className="k-check"><input type="checkbox" data-testid="export-single" checked={single} onChange={(e) => setSingle(e.target.checked)} /> Save all components of an assembly in a single file</label>
      </div>
      <div className="k-dialog-actions">
        <Button variant="primary" data-testid="export-ok" onClick={run}>OK</Button>
        <Button onClick={() => st.setDialog(null)}>Cancel</Button>
      </div>
    </Dialog>
  );
}

/**
 * Bodies to Keep, as the intended dialog: a cut split a body into pieces. All bodies keeps every piece as a body of its
 * own; Selected bodies keeps the checked ones (largest first). The choice is stored in the feature.
 */
export function BodiesToKeepDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, rebuild: s.rebuild, dialogFeatureId: s.dialogFeatureId, applyDocument: s.applyDocument, setDialog: s.setDialog })));
  const f = st.doc.features.find((x) => x.id === st.dialogFeatureId);
  const n = (f && st.rebuild.splitCounts?.[f.id]) || 0;
  const all = Array.from({ length: n }, (_, i) => i);
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const [sel, setSel] = useState<number[]>(all);
  if (!f || n < 2) return null;
  const close = (keep: number[]) => {
    st.applyDocument('Bodies to Keep', { ...st.doc, features: st.doc.features.map((x) => (x.id === f.id ? ({ ...x, keepBodies: keep } as typeof x) : x)) });
    st.setDialog(null);
  };
  return (
    <Dialog title="Bodies to Keep" onClose={() => close(all)} data-testid="bodies-to-keep">
      <div className="k-form" style={{ minWidth: 340 }}>
        <p className="k-muted" style={{ margin: '0 0 6px' }}>{f.name} split the body into {n} bodies.</p>
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="keep" data-testid="keep-all" checked={mode === 'all'} onChange={() => setMode('all')} /> All bodies</label>
          <label className="k-check"><input type="radio" name="keep" data-testid="keep-selected" checked={mode === 'selected'} onChange={() => setMode('selected')} /> Selected bodies</label>
        </div>
        <div className="k-selbox" style={{ minHeight: 28, marginTop: 6, opacity: mode === 'all' ? 0.5 : 1 }}>
          {all.map((i) => (
            <label key={i} className="k-check">
              <input type="checkbox" data-testid={`keep-body-${i}`} disabled={mode === 'all'} checked={mode === 'all' || sel.includes(i)} onChange={(e) => setSel(e.target.checked ? [...sel, i].sort((a, b) => a - b) : sel.filter((x) => x !== i))} /> Body {i + 1}{i === 0 ? ' (largest)' : ''}
            </label>
          ))}
        </div>
      </div>
      <div className="k-dialog-actions">
        <Button variant="primary" data-testid="keep-ok" disabled={mode === 'selected' && !sel.length} onClick={() => close(mode === 'all' ? all : sel)}>OK</Button>
        <Button onClick={() => close(all)}>Cancel</Button>
      </div>
    </Dialog>
  );
}
