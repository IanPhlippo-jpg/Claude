import { useMemo, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Button, NumberField } from '../ui/components';
import { dimensionTable, setDimensionValues } from '../core/document/equations';
import { rebuildDocument } from '../core/features/rebuild';
import { massProperties } from '../core/features/measure';
import { solveSketch } from '../core/solver/solver';
import type { Document } from '../core/document/types';

type Output = 'mass' | 'volume' | 'area';

/** Mass properties of a variant of the document with one dimension changed. */
function evaluate(doc: Document, dim: string, value: number, density: number): { mass: number; volume: number; area: number; ok: boolean } {
  let d = setDimensionValues(doc, { [dim]: value });
  const sketches = Object.fromEntries(Object.entries(d.sketches).map(([k, s]) => [k, solveSketch(s).sketch]));
  d = { ...d, sketches };
  const r = rebuildDocument(d);
  let mass = 0, volume = 0, area = 0;
  for (const b of r.bodies) {
    const m = massProperties(b.geometry, density);
    mass += m.mass; volume += m.volume; area += m.area;
  }
  return { mass, volume, area, ok: Object.keys(r.errors).length === 0 };
}

/**
 * Evaluate ▸ Design Study, by design (Variable View): a dimension as the variable with a range of
 * values, a sensor (mass, volume or surface area) as the result, Run fills the scenario table; a scenario
 * can be applied to the model.
 */
export function DesignStudyDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, setDialog: s.setDialog, setDimensionValue: s.setDimensionValue })));
  const dims = useMemo(() => dimensionTable(st.doc), [st.doc]);
  const [dim, setDim] = useState(dims[0]?.name ?? '');
  const cur = dims.find((d) => d.name === dim)?.value ?? 0;
  const [range, setRange] = useState({ min: Math.max(0.1, cur * 0.5), max: cur * 1.5 || 10, steps: 5 });
  const [out, setOut] = useState<Output>('mass');
  const [rows, setRows] = useState<{ value: number; mass: number; volume: number; area: number; ok: boolean }[]>([]);
  const density = (st.doc.material?.density ?? 1000) / 1e6;
  const run = () => {
    const n = Math.max(2, Math.min(20, Math.round(range.steps)));
    const res = [];
    for (let i = 0; i < n; i++) {
      const v = range.min + ((range.max - range.min) * i) / (n - 1);
      res.push({ value: v, ...evaluate(st.doc, dim, v, density) });
    }
    setRows(res);
  };
  const unit = out === 'mass' ? 'g' : out === 'volume' ? `${st.doc.units}^3` : `${st.doc.units}^2`;
  const best = rows.length ? rows.reduce((a, b) => (b[out] < a[out] ? b : a)) : null;
  return (
    <div className="k-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && st.setDialog(null)}>
      <div className="k-dialog k-dstudy" role="dialog" aria-label="Design Study" data-testid="design-study">
        <div className="k-dialog-title">Design Study 1 — Variable View</div>
        <div className="k-dialog-body">
          <table className="k-pm-table">
            <thead><tr><th>Variables</th><th>Type</th><th>Min</th><th>Max</th><th>Step count</th></tr></thead>
            <tbody>
              <tr>
                <td>
                  <select className="k-input" data-testid="ds-dim" value={dim} onChange={(e) => { setDim(e.target.value); const v = dims.find((d) => d.name === e.target.value)?.value ?? 1; setRange({ min: Math.max(0.1, v * 0.5), max: v * 1.5, steps: range.steps }); }}>
                    {dims.map((d) => <option key={d.name} value={d.name}>{d.name} ({d.value.toFixed(2)})</option>)}
                  </select>
                </td>
                <td>Range</td>
                <td><NumberField value={range.min} onChange={(v) => setRange({ ...range, min: v })} step={1} /></td>
                <td><NumberField value={range.max} onChange={(v) => setRange({ ...range, max: v })} step={1} /></td>
                <td><NumberField value={range.steps} onChange={(v) => setRange({ ...range, steps: v })} step={1} /></td>
              </tr>
            </tbody>
          </table>
          <table className="k-pm-table">
            <thead><tr><th>Constraints / Goals</th><th>Sensor</th></tr></thead>
            <tbody><tr><td>Minimize</td><td>
              <select className="k-input" data-testid="ds-out" value={out} onChange={(e) => setOut(e.target.value as Output)}>
                <option value="mass">Mass</option><option value="volume">Volume</option><option value="area">Surface Area</option>
              </select>
            </td></tr></tbody>
          </table>
          {rows.length > 0 && (
            <table className="k-pm-table" data-testid="ds-results">
              <thead><tr><th>Scenario</th><th>{dim}</th><th>{out === 'mass' ? 'Mass' : out === 'volume' ? 'Volume' : 'Surface Area'} ({unit})</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r === best ? 'k-ds-best' : ''}>
                    <td>Scenario {i + 1}{r === best ? ' (optimal)' : ''}</td>
                    <td>{r.value.toFixed(2)}</td>
                    <td>{r.ok ? r[out].toFixed(2) : 'rebuild error'}</td>
                    <td><button className="k-btn" onClick={() => st.setDimensionValue(dim, r.value)}>Apply</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!dims.length && <p className="k-muted">The model has no dimensions to vary.</p>}
        </div>
        <div className="k-dialog-actions">
          <Button variant="primary" data-testid="ds-run" disabled={!dims.length} onClick={run}>Run</Button>
          <Button onClick={() => st.setDialog(null)}>Close</Button>
        </div>
      </div>
    </div>
  );
}
