import { bomDescription, bomPartNumber } from '../core/document/configurations';
import { useMemo, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import type { Component } from '../core/document/types';
import { Icon } from '../ui/icons';
import { detectInterferences } from '../core/assembly/interference';
import { massProperties } from '../core/features/measure';

/** Bill of Materials: ITEM NO. / PART NUMBER / DESCRIPTION / QTY., as the intended default BOM table. */
export function BomDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, rebuild: s.rebuild, pushMessage: s.pushMessage, setDialog: s.setDialog })));
  const rows = useMemo(() => {
    // one row per part AND configuration, by design (PLATES / 210, PLATES / 270 …)
    const byPart = new Map<string, { name: string; description: string; qty: number; mass: number }>();
    const keyOf = (c: Component) => `${c.part.name}\u0000${c.configuration ?? ''}`;
    const subsSeen = new Set<string>();
    for (const c of st.doc.components ?? []) {
      // envelopes are reference geometry, not in the BOM
      if (c.suppressed || c.envelope) continue;
      // a sub-assembly that hides its children: one row for the sub-assembly
      if (c.subassembly?.hideChildren) {
        if (subsSeen.has(c.subassembly.id)) continue;
        subsSeen.add(c.subassembly.id);
        const base = c.subassembly.name.replace(/<\d+>$/, '');
        const row = byPart.get('sub\u0000' + base) ?? { name: base, description: '', qty: 0, mass: 0 };
        row.qty++;
        byPart.set('sub\u0000' + base, row);
        continue;
      }
      const row = byPart.get(keyOf(c)) ?? { name: bomPartNumber(c.part, c.configuration), description: bomDescription(c.part, c.configuration), qty: 0, mass: 0 };
      row.qty++;
      byPart.set(keyOf(c), row);
    }
    for (const b of st.rebuild.bodies) {
      const comp = (st.doc.components ?? []).find((c) => c.id === b.id);
      if (!comp) continue;
      const row = byPart.get(keyOf(comp));
      if (row && !row.mass) row.mass = massProperties(b.geometry, comp.part.material ? comp.part.material.density / 1e6 : 0.001).mass;
    }
    return [...byPart.values()];
  }, [st.doc.components, st.rebuild.bodies]);
  const copy = () => {
    const text = ['ITEM NO.\tPART NUMBER\tDESCRIPTION\tQTY.', ...rows.map((r, i) => `${i + 1}\t${r.name}\t${r.description}\t${r.qty}`)].join('\n');
    navigator.clipboard?.writeText(text).then(() => st.pushMessage('Bill of Materials copied to the clipboard.'));
  };
  return (
    <div className="k-float-dialog k-bom-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Bom /> <span>Bill of Materials - {st.doc.name}</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8 }}>
          <table className="k-bom">
            <thead>
              <tr><th>ITEM NO.</th><th>PART NUMBER</th><th>DESCRIPTION</th><th>QTY.</th><th>MASS (g)</th></tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((r, i) => (
                <tr key={r.name + '/' + r.description}><td>{i + 1}</td><td>{r.name}</td><td>{r.description}</td><td>{r.qty}</td><td>{r.mass ? r.mass.toFixed(2) : ''}</td></tr>
              )) : <tr><td colSpan={5} className="k-muted">Insert components first (Assembly ▸ Insert Components).</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="k-dialog-actions">
          <button className="k-btn" onClick={copy}>Copy to Clipboard</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Close</button>
        </div>
      </div>
    </div>
  );
}

/** Interference Detection: every overlapping pair of components with the volume of the interference. */
export function InterferenceDialog() {
  const st = useStore(useShallow((s) => ({ interferenceOpts: s.interferenceOpts, doc: s.doc, rebuild: s.rebuild, setDialog: s.setDialog, pushMessage: s.pushMessage, setInterferenceHighlight: s.setInterferenceHighlight })));
  const o = st.interferenceOpts;
  const set = (patch: Partial<typeof o>) => useStore.setState({ interferenceOpts: { ...o, ...patch } });
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const comps = st.doc.components ?? [];
  const all = useMemo(() => {
    const envelopes = new Set(comps.filter((c) => c.envelope).map((c) => c.id));
    // Treat subassemblies as components: the parts of one sub-assembly are not checked against each other
    const owner = (id: string) => { const cid = id.split(':')[0]; const sub = comps.find((c) => c.id === cid)?.subassembly; return o.subassemblies && sub ? sub.id : cid; };
    return detectInterferences(st.rebuild.bodies.filter((b) => !envelopes.has(b.id)), 1e-3, { coincidence: o.coincidence, multibody: o.multibody, ownerOf: owner });
  }, [st.rebuild.bodies, o.coincidence, o.multibody, o.subassemblies, comps]);
  const key = (r: { a: string; b: string }) => `${r.a}|${r.b}`;
  const result = all.filter((r) => o.showIgnored || !ignored.has(key(r)));
  const name = (id: string) => (st.doc.components ?? []).find((c) => c.id === id)?.name ?? id;
  return (
    <div className="k-float-dialog k-interference-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Interference /> <span>Interference Detection</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8 }}>
          <div className="k-field"><label>Selected Components</label><div className="k-selbox" style={{ minHeight: 28 }}>{st.doc.name}</div></div>
          <button className="k-btn" style={{ margin: '4px 0 8px' }} onClick={() => st.pushMessage(`${result.length} interference${result.length === 1 ? '' : 's'} found.`)}>Calculate</button>
          <div className="k-field"><label>Results</label></div>
          <div className="k-selbox" style={{ minHeight: 80 }}>
            {result.length ? result.map((r, i) => (
              <div key={i} className={`k-selbox-row${ignored.has(key(r)) ? ' k-muted' : ''}`} onClick={() => st.setInterferenceHighlight(r.geometry)}>
                <Icon.Interference size={12} /> {r.failed ? `Not checked${i + 1} - the boolean failed (${r.failed})` : r.coincident ? `Coincidence${i + 1}` : `Interference${i + 1} - ${r.volume.toFixed(2)} mm^3`} <span className="k-muted">({name(r.a)}, {name(r.b)})</span>
                <span className="grow" />
                <button className="k-btn ghost" style={{ marginLeft: 'auto' }} data-testid="intf-ignore" onClick={(e) => { e.stopPropagation(); const n = new Set(ignored); if (n.has(key(r))) n.delete(key(r)); else n.add(key(r)); setIgnored(n); }}>{ignored.has(key(r)) ? 'Un-ignore' : 'Ignore'}</button>
              </div>
            )) : <span className="k-muted">No Interferences</span>}
          </div>
          <div className="k-field" style={{ marginTop: 8 }}><label>Options</label></div>
          <label className="k-check"><input type="checkbox" data-testid="intf-coincidence" checked={o.coincidence} onChange={(e) => set({ coincidence: e.target.checked })} /> Treat coincidence as interference</label>
          <label className="k-check"><input type="checkbox" checked={o.showIgnored} onChange={(e) => set({ showIgnored: e.target.checked })} /> Show ignored interferences</label>
          <label className="k-check"><input type="checkbox" checked={o.subassemblies} onChange={(e) => set({ subassemblies: e.target.checked })} /> Treat subassemblies as components</label>
          <label className="k-check"><input type="checkbox" checked={o.multibody} onChange={(e) => set({ multibody: e.target.checked })} /> Include multibody part interferences</label>
          <label className="k-check"><input type="checkbox" data-testid="intf-transparent" checked={o.transparent} onChange={(e) => set({ transparent: e.target.checked })} /> Make interfering parts transparent</label>
        </div>
        <div className="k-dialog-actions">
          <button className="k-btn" onClick={() => { st.setInterferenceHighlight(null); st.setDialog(null); }}>Close</button>
        </div>
      </div>
    </div>
  );
}
