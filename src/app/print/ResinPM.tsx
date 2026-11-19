/**
 * The resin sections of the 3D Print Property Panel (docs/33 phase 4): Resin · Exposure · Lift · Hollow · Supports, and
 * the resin preview: summary (time, resin, cost), islands and suction cups, the layer. Values outside the limits of the
 * printer are shown in red and the slice refuses them (docs/34 3.4).
 */
import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { machineOf, settingsProblems } from '../../print/resin/profile';
import type { ResinSettings, ResinSupportKind } from '../../print/resin/types';
import type { Printer } from '../../print/types';
import { fmtTime, usePrint } from './printStore';
import {
  addDrainHole, addSupportPoint, addTestPiece, clearManual, currentMachine, currentResin, currentResinSettings, patchResin, removeSupportsNear, resetResin, resins, resinStale, setResin, setResinLayer,
  useResin,
} from './resinStore';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="k-pm-valuerow k-print-row"><span className="k-print-label">{label}</span>{children}</div>;
}
const LAYERS = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1];

/** the LCD of the printer and the file it takes */
export function ResinFacts({ printer }: { printer: Printer }) {
  const m = machineOf(printer);
  if (!m) return <div className="k-muted">No LCD data for this printer.</div>;
  return (
    <div className="k-muted k-print-facts" data-testid="print-resin-facts">{m.resolution.join(' x ')} px · {(m.pitch[0] * 1000).toFixed(1)} x {(m.pitch[1] * 1000).toFixed(1)} µm
      {' · '}{m.size.map((v) => v.toFixed(1)).join(' x ')} x {m.height} mm{' · '}{printer.fileFormat === 'goo' ? '.goo' : `.${printer.fileFormat} (not written; .goo only)`} · not print-tested</div>
  );
}

export function ResinSections() {
  const st = useResin(useShallow((x) => ({ resinId: x.resinId, layerHeight: x.layerHeight, overrides: x.overrides })));
  const s = currentResinSettings();
  const m = currentMachine();
  const problems = m ? settingsProblems(s, m, currentResin()) : [];
  const [pt, setPt] = useState<[number, number, number]>([0, 0, 5]);
  const tool = usePrint((x) => x.tool);
  const num = (k: keyof ResinSettings, label: string, opts: { unit?: string; step?: number; min?: number } = {}) => (
    <Row label={label}><NumberField value={s[k] as number} unit={opts.unit} step={opts.step ?? 1} min={opts.min ?? 0}
      onChange={(v) => patchResin({ [k]: Math.max(opts.min ?? 0, v) } as Partial<ResinSettings>)} /></Row>
  );
  return (
    <>
      <Section title="Resin">
        <button className="k-btn" data-testid="print-resin-testpiece" title="An L with a raised F: a mirrored print shows at once (the release test of a resin printer)"
          onClick={addTestPiece} style={{ marginBottom: 4 }}>Add Test Piece (L with F)</button>
        <select className="k-input" data-testid="print-resin" value={st.resinId} onChange={(e) => setResin(e.target.value)}>
          {resins().map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Row label="Layer height">
          <select className="k-input" data-testid="print-resin-layer" value={st.layerHeight} onChange={(e) => setResinLayer(Number(e.target.value))}>
            {LAYERS.map((h) => <option key={h} value={h}>{h.toFixed(2)} mm</option>)}
          </select>
        </Row>
        <Row label="Anti-aliasing">
          <select className="k-input" data-testid="print-resin-aa" value={s.antiAliasing} onChange={(e) => patchResin({ antiAliasing: Number(e.target.value) as 1 | 2 | 4 | 8 })}>
            <option value={1}>Off</option><option value={2}>2x</option><option value={4}>4x</option><option value={8}>8x</option>
          </select>
        </Row>
      </Section>
      <Section title="Exposure">
        {num('exposure', 'Normal (s)', { step: 0.1 })}
        {num('bottomExposure', 'Bottom (s)', { step: 1 })}
        {num('bottomLayers', 'Bottom layers', { min: 1 })}
        {num('transitionLayers', 'Transition layers')}
        {num('lightOffDelay', 'Light-off delay (s)', { step: 0.1 })}
        {num('lightPwm', 'Light power (0-255)', { step: 5 })}
      </Section>
      <Section title="Lift and Retract" defaultOpen={false}>
        {num('bottomLiftDistance', 'Bottom lift', { unit: 'mm', step: 0.5 })}
        {num('bottomLiftSpeed', 'Bottom lift (mm/min)', { step: 10 })}
        {num('liftDistance', 'Lift', { unit: 'mm', step: 0.5 })}
        {num('liftSpeed', 'Lift (mm/min)', { step: 10 })}
        {num('retractSpeed', 'Retract (mm/min)', { step: 10 })}
      </Section>
      {problems.length > 0 && <div data-testid="print-resin-problems">{problems.map((p) => <p key={p} className="k-pm-message k-print-error">{p}</p>)}</div>}
      <Section title="Hollow" check={s.hollow} onCheck={(v) => patchResin({ hollow: v })} checkTestId="print-resin-hollow" defaultOpen={s.hollow}>
        {num('wallThickness', 'Wall thickness', { unit: 'mm', step: 0.5 })}
        {s.drainHoles.map((h, i) => (
          <div key={i} className="k-pm-valuerow k-print-row">
            <span className="k-print-label">Drain {i + 1}</span>
            <span className="k-muted">X {h.x} · Y {h.y} · Ø {(h.r * 2).toFixed(1)} mm</span>
            <button className="k-btn ghost icon k-tip" data-tip="Remove the drain hole" onClick={() => patchResin({ drainHoles: s.drainHoles.filter((_, k) => k !== i) })}><Icon.Trash
              size={12} /></button>
          </div>
        ))}
        <button className="k-btn" data-testid="print-resin-drain" onClick={addDrainHole}>Add Drain Hole</button>
      </Section>
      <Section title="Supports">
        <Row label="Type">
          <select className="k-input" data-testid="print-resin-support" value={s.supports} onChange={(e) => patchResin({ supports: e.target.value as ResinSupportKind })}>
            <option value="none">None (on the plate)</option><option value="normal">Normal</option><option value="tree">Tree</option>
          </select>
        </Row>
        {s.supports !== 'none' && (
          <>
            {num('supportAngle', 'Threshold angle (°)', { step: 5 })}
            {num('supportSpacing', 'Spacing', { unit: 'mm', step: 0.5 })}
            {num('tipDiameter', 'Contact tip', { unit: 'mm', step: 0.1 })}
            {num('supportDiameter', 'Strut', { unit: 'mm', step: 0.1 })}
            {num('liftHeight', 'Lift part', { unit: 'mm', step: 1 })}
            <label className="k-check"><input type="checkbox" checked={s.raft} onChange={(e) => patchResin({ raft: e.target.checked })} /> Raft</label>
            {s.raft && num('raftThickness', 'Raft', { unit: 'mm', step: 0.1 })}
          </>
        )}
        <div className="k-print-subtitle">Points by hand</div>
        <button className={`k-btn ${tool === 'supportPoint' ? 'active' : ''}`} data-testid="print-resin-pick"
          onClick={() => usePrint.setState({ tool: tool === 'supportPoint' ? 'select' : 'supportPoint' })}>{tool === 'supportPoint' ? 'Done Picking' : 'Pick Points on the Part'}</button>
        <div className="k-muted">{tool === 'supportPoint' ? 'Click on the part: a support point there. Shift+click: the points near it go.' : 'Or type a point:'}</div>
        <Row label="X / Y / Z">
          {[0, 1, 2].map((k) => <NumberField key={k} value={pt[k]} step={1} onChange={(v) => setPt((p) => p.map((x, j) => (j === k ? v : x)) as [number, number, number])} />)}
        </Row>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className="k-btn" data-testid="print-resin-addpoint" onClick={() => addSupportPoint(pt[0], pt[1], pt[2])}>Add Point</button>
          <button className="k-btn" onClick={() => removeSupportsNear(pt[0], pt[1])}>Remove Near X/Y</button>
          <button className="k-btn" disabled={!s.addedPoints.length && !s.removedPoints.length} onClick={clearManual}>Clear</button>
        </div>
        <div className="k-muted">{s.addedPoints.length} added · {s.removedPoints.length} removed by hand</div>
      </Section>
      <Section title="Others" defaultOpen={false}>
        <button className="k-btn" onClick={resetResin} disabled={!Object.keys(st.overrides).some((k) => !['drainHoles', 'addedPoints', 'removedPoints'].includes(k))}>Back to Profile</button>
      </Section>
    </>
  );
}

export function ResinPreview() {
  const r = useResin(useShallow((x) => ({ result: x.result, layer: x.layer })));
  const st = r.result?.stats;
  if (!st) return <Section title="Summary"><div className="k-muted">Slice the plate first.</div></Section>;
  const s = currentResinSettings();
  const issues = st.issues.slice(0, 30);
  return (
    <>
      <Section title="Summary">
        <table className="k-print-summary" data-testid="print-resin-summary"><tbody>
          <tr><td>Print time</td><td>{fmtTime(st.printTime)}</td></tr>
          <tr><td>Layers</td><td>{st.layers} × {s.layerHeight.toFixed(2)} mm</td></tr>
          <tr><td>Resin</td><td>{(st.volume / 1000).toFixed(2).replace('.', ',')} ml · {st.grams.toFixed(1)} g · € {st.cost.toFixed(2).replace('.', ',')}</td></tr>
          <tr><td>Support points</td><td>{st.supportPoints.length}</td></tr>
        </tbody></table>
        {resinStale() && <p className="k-pm-message">The plate or the settings changed: slice again.</p>}
        {st.warnings.map((w, i) => <p key={i} className="k-pm-message">{w}</p>)}
      </Section>
      <Section title={`Islands and Cups (${st.issues.length})`}>
        {!issues.length && <div className="k-muted" data-testid="print-resin-noissues">No islands, suction cups or closed cavities.</div>}
        <div data-testid="print-resin-issues">
          {issues.map((x, i) => (
            <button key={i} type="button" className="k-tree-row k-print-issue" title={x.text}
              onClick={() => useResin.setState({ layer: Math.min(st.layers - 1, Math.round(x.z / s.layerHeight)) })}>
              <span className={`k-print-issue-${x.kind}`}>{x.kind === 'island' ? 'Island' : x.kind === 'suction' ? 'Suction cup' : 'Cavity'}</span>
              <span className="grow" /><span className="k-muted">Z {x.z.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
