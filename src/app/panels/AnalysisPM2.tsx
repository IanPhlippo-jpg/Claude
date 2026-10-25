import { useMemo } from 'react';
import { useStore } from '../store';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { DRAFT_COLORS } from '../../core/features/analysis';
import { deviationAnalysis, partingLineAnalysis } from '../../core/features/evaluate2';

function Head({ title, icon }: { title: string; icon: React.ReactNode }) {
  const st = useStore();
  return (
    <div className="k-pm-head">
      <div className="k-pm-title">{icon} <b>{title}</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
      <div className="k-pm-buttons">
        <button className="k-pm-ok k-tip" data-tip="OK" onClick={() => st.setAnalysis(null)}><Icon.Check /></button>
        <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => st.setAnalysis(null)}><Icon.Close /></button>
      </div>
    </div>
  );
}

/** Evaluate ▸ Parting Line Analysis PropertyManager: direction of pull, the faces on each side and the parting line. */
export function PartingLinePM() {
  const st = useStore();
  const a = st.analysis;
  const result = useMemo(() => (a?.kind === 'parting' ? partingLineAnalysis(st.rebuild.bodies, a.pull, a.angle) : null), [a, st.rebuild.bodies]);
  if (!a || a.kind !== 'parting' || !result) return null;
  const AX: [string, [number, number, number]][] = [['X', [1, 0, 0]], ['Y', [0, 1, 0]], ['Z', [0, 0, 1]]];
  const fromFace = () => {
    const f = st.selectedFace ? st.rebuild.bodies.find((b) => b.id === st.selectedFace!.bodyId)?.faces.find((x) => x.id === st.selectedFace!.faceId) : undefined;
    if (!f || f.curved) {
      st.pushMessage('Select a planar face for the direction of pull.', 'warn');
      return;
    }
    st.setAnalysis({ ...a, pull: [...f.normal] as [number, number, number], pullLabel: 'Face' });
  };
  return (
    <div className="k-pm" data-testid="parting-pm">
      <Head title="Parting Line Analysis" icon={<Icon.PartingLine />} />
      <Section title="Analysis Parameters">
        <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
          <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => st.setAnalysis({ ...a, pull: [-a.pull[0], -a.pull[1], -a.pull[2]] })}><Icon.ReverseDir size={16} /></button>
          <div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} onClick={fromFace} title="Click to use the selected planar face">
            <div className="k-selbox-row">Direction of Pull: {a.pullLabel}</div>
          </div>
        </div>
        <div className="k-pm-stylerow" style={{ marginLeft: 30 }}>
          {AX.map(([l, v]) => <button key={l} className="k-pm-stylebtn" onClick={() => st.setAnalysis({ ...a, pull: v, pullLabel: `${l} axis` })}>{l}</button>)}
        </div>
        <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={a.angle} onChange={(v) => st.setAnalysis({ ...a, angle: Math.max(0, Math.min(89, v)) })} unit="°" step={0.5} min={0} /></div>
        <label className="k-check"><input type="checkbox" defaultChecked /> Show parting line</label>
      </Section>
      <Section title="Color Settings">
        <div className="k-draft-legend" data-testid="parting-legend">
          <div><span style={{ background: DRAFT_COLORS.positive }} /> {result.positive} faces with positive draft</div>
          <div><span style={{ background: DRAFT_COLORS.negative }} /> {result.negative} faces with negative draft</div>
          <div><span style={{ background: DRAFT_COLORS.requires }} /> {result.straddle} straddle faces</div>
        </div>
      </Section>
      <Section title="Parting Line">
        <div className="k-selbox" style={{ minHeight: 24 }} data-testid="parting-result">
          <div className="k-selbox-row">{result.lines.length} edge(s), total length {result.length.toFixed(2)} {st.doc.units}</div>
        </div>
      </Section>
    </div>
  );
}

/** Evaluate ▸ Deviation Analysis PropertyManager: the angle between the faces along the selected edges. */
export function DeviationPM() {
  const st = useStore();
  const a = st.analysis;
  const result = useMemo(() => (a?.kind === 'deviation' ? deviationAnalysis(st.rebuild.bodies, st.selectedEdges, a.samples) : []), [a, st.rebuild.bodies, st.selectedEdges]);
  if (!a || a.kind !== 'deviation') return null;
  const all = result.flatMap((r) => [r.min, r.max]);
  return (
    <div className="k-pm" data-testid="deviation-pm">
      <Head title="Deviation Analysis" icon={<Icon.Deviation />} />
      <Section title="Edges">
        <div className="k-selbox" style={{ minHeight: 24 }} data-testid="deviation-edges">{st.selectedEdges.length ? st.selectedEdges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the edges between the faces to analyze.</span>}</div>
        <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 90 }}>Sample points</span><NumberField value={a.samples} onChange={(v) => st.setAnalysis({ ...a, samples: Math.max(2, Math.min(100, Math.round(v))) })} step={1} min={2} /></div>
        <button className="k-btn" data-testid="deviation-calc" onClick={() => st.setAnalysis({ ...a })}>Calculate</button>
      </Section>
      <Section title="Deviation Analysis">
        <div className="k-selbox" style={{ minHeight: 40 }} data-testid="deviation-result">
          {!result.length && <span className="k-muted">No edges.</span>}
          {result.length > 0 && (
            <>
              <div className="k-selbox-row">Maximum deviation: {Math.max(...all).toFixed(2)}°</div>
              <div className="k-selbox-row">Minimum deviation: {Math.min(...all).toFixed(2)}°</div>
              <div className="k-selbox-row">Average deviation: {(result.reduce((s, r) => s + r.avg, 0) / result.length).toFixed(2)}°</div>
              {result.map((r, i) => <div key={r.edgeId} className="k-selbox-row k-muted">Edge&lt;{i + 1}&gt;: {r.min.toFixed(2)}° – {r.max.toFixed(2)}° ({r.samples} points)</div>)}
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
