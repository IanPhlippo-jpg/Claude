import { useMemo, useState } from 'react';
import { useStore, type ConfigurationEdit } from './store';
import { Dialog } from '../ui/components';
import { Icon } from '../ui/icons';
import { activeConfiguration, configurationDimension, configurations, isSuppressedIn } from '../core/document/configurations';
import { dimensionTable } from '../core/document/equations';
import { isSolidFeature } from '../core/document/types';

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));

/**
 * Modify Configurations table (Configure Dimension / Configure Feature), as the original: one row
 * per configuration, a column group per sketch or feature with its dimensions (D1, D2 …) or its
 * Suppress state, and a last row "< Creates a new configuration. >". OK applies and closes,
 * Apply keeps the table open.
 */
export function ModifyConfigurationsDialog() {
  const st = useStore();
  const target = st.configure ?? { dims: [], features: [] };
  const dims = useMemo(() => dimensionTable(st.doc), [st.doc]);
  const [dimCols, setDimCols] = useState<string[]>(() => target.dims.filter((n) => dims.some((d) => d.name === n)));
  const [featCols, setFeatCols] = useState<string[]>(() => target.features);
  const [edits, setEdits] = useState<Record<string, ConfigurationEdit>>({});
  const [newRows, setNewRows] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const list = configurations(st.doc);
  const active = activeConfiguration(st.doc);
  const current = new Map(dims.map((d) => [d.name, d.value]));

  const groups = useMemo(() => {
    const g: { owner: string; cols: { kind: 'dim' | 'feature'; key: string; label: string }[] }[] = [];
    const add = (owner: string, col: { kind: 'dim' | 'feature'; key: string; label: string }) => {
      let e = g.find((x) => x.owner === owner);
      if (!e) g.push((e = { owner, cols: [] }));
      e.cols.push(col);
    };
    for (const n of dimCols) {
      const [d, owner] = n.split('@');
      add(owner, { kind: 'dim', key: n, label: d });
    }
    for (const id of featCols) {
      const f = st.doc.features.find((x) => x.id === id);
      if (f) add(f.name, { kind: 'feature', key: id, label: 'Suppress' });
    }
    return g;
  }, [dimCols, featCols, st.doc.features]);

  const edit = (name: string) => edits[name] ?? { name, dims: {}, suppressed: {} };
  const dimValue = (name: string, cfgId: string | null, n: string) => {
    const e = edits[name];
    if (e && n in e.dims) return e.dims[n];
    const cfg = list.find((c) => c.id === cfgId);
    const cur = current.get(n) ?? 0;
    return cfg ? configurationDimension(st.doc, cfg, n, cur) : cur;
  };
  const suppressed = (name: string, cfgId: string | null, fid: string) => {
    const e = edits[name];
    if (e && fid in e.suppressed) return e.suppressed[fid];
    const cfg = list.find((c) => c.id === cfgId);
    const f = st.doc.features.find((x) => x.id === fid);
    if (!f) return false;
    return cfg ? isSuppressedIn(st.doc, cfg, f) : !!f.suppressed;
  };
  const setDim = (name: string, n: string, v: number) => setEdits((e) => ({ ...e, [name]: { ...edit(name), dims: { ...edit(name).dims, [n]: v } } }));
  const setSup = (name: string, fid: string, v: boolean) => setEdits((e) => ({ ...e, [name]: { ...edit(name), suppressed: { ...edit(name).suppressed, [fid]: v } } }));
  const addRow = () => {
    const n = newName.trim();
    if (!n || list.some((c) => c.name === n) || newRows.includes(n)) return;
    setNewRows((r) => [...r, n]);
    setNewName('');
  };
  const apply = () => {
    st.applyConfigurationTable(Object.values(edits), newRows);
    setEdits({});
    setNewRows([]);
  };
  const ok = () => {
    apply();
    st.closeConfigure();
  };
  const rows: { name: string; cfgId: string | null; isActive: boolean; isNew: boolean }[] = [
    ...list.map((c) => ({ name: c.name, cfgId: c.id, isActive: c.id === active.id, isNew: false })),
    ...newRows.map((n) => ({ name: n, cfgId: active.id, isActive: false, isNew: true })),
  ];
  const freeDims = dims.filter((d) => !dimCols.includes(d.name));
  const freeFeatures = st.doc.features.filter((f) => isSolidFeature(f) && !featCols.includes(f.id));

  return (
    <Dialog
      title="Modify Configurations"
      onClose={st.closeConfigure}
      actions={
        <>
          <button className="k-btn primary" onClick={ok}>OK</button>
          <button className="k-btn" onClick={st.closeConfigure}>Cancel</button>
          <button className="k-btn" onClick={apply} disabled={!Object.keys(edits).length && !newRows.length}>Apply</button>
          <button className="k-btn" onClick={() => st.pushMessage('Modify Configurations: type a value per configuration; the last row creates a new configuration.')}>Help</button>
        </>
      }
    >
      <div className="k-cfg-dialog">
        <div className="k-cfg-toolbar">
          <select className="k-input" value="" onChange={(e) => { if (e.target.value) setDimCols((c) => [...c, e.target.value]); }} title="Configure Dimension: add a dimension column">
            <option value="">Add dimension…</option>
            {freeDims.map((d) => <option key={d.name} value={d.name}>{d.name} = {fmt(d.value)}</option>)}
          </select>
          <select className="k-input" value="" onChange={(e) => { if (e.target.value) setFeatCols((c) => [...c, e.target.value]); }} title="Configure Feature: add a feature column (Suppress)">
            <option value="">Add feature…</option>
            {freeFeatures.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <span className="grow" />
          <button className="k-btn ghost" onClick={() => { setDimCols([]); setFeatCols([]); }} title="Hide all columns">Hide/Show columns</button>
        </div>
        <table className="k-bom k-cfg-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ textAlign: 'left' }}>Configuration Name</th>
              {groups.map((g) => <th key={g.owner} colSpan={g.cols.length} className="k-cfg-owner">{g.owner} ▾</th>)}
              {!groups.length && <th rowSpan={2} className="k-muted" style={{ fontWeight: 400 }}>Add a dimension or feature column above.</th>}
            </tr>
            <tr>
              {groups.flatMap((g) => g.cols.map((c) => <th key={c.key}>{c.label}</th>))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={r.isActive ? 'active' : ''} data-config={r.name}>
                <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {r.isActive && <Icon.Check size={11} style={{ color: '#1f9d3a', marginRight: 4 }} />}
                  {r.name}
                  {r.isNew && <span className="k-muted"> (new)</span>}
                </td>
                {groups.flatMap((g) =>
                  g.cols.map((c) =>
                    c.kind === 'dim' ? (
                      <td key={c.key}>
                        <input
                          className="k-input mono"
                          style={{ width: 72, textAlign: 'right' }}
                          type="number"
                          step="any"
                          value={fmt(dimValue(r.name, r.cfgId, c.key))}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) setDim(r.name, c.key, v); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') apply(); e.stopPropagation(); }}
                        />
                        <span className="k-muted" style={{ marginLeft: 3 }}>{c.key.split('@')[0].startsWith('D') && dims.find((d) => d.name === c.key)?.ref.kind === 'sketch' && (dims.find((d) => d.name === c.key)!.ref as { angle?: boolean }).angle ? '°' : st.doc.units}</span>
                      </td>
                    ) : (
                      <td key={c.key}>
                        <select className="k-input" value={suppressed(r.name, r.cfgId, c.key) ? 'suppressed' : 'unsuppressed'} onChange={(e) => setSup(r.name, c.key, e.target.value === 'suppressed')}>
                          <option value="unsuppressed">Unsuppressed</option>
                          <option value="suppressed">Suppressed</option>
                        </select>
                      </td>
                    ),
                  ),
                )}
              </tr>
            ))}
            <tr className="k-cfg-new">
              <td style={{ textAlign: 'left' }}>
                <input
                  className="k-input"
                  placeholder="< Creates a new configuration. >"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={addRow}
                  onKeyDown={(e) => { if (e.key === 'Enter') addRow(); e.stopPropagation(); }}
                  style={{ width: 220 }}
                />
              </td>
              {groups.flatMap((g) => g.cols.map((c) => <td key={c.key} />))}
            </tr>
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
