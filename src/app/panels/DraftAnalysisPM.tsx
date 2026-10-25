import { useMemo } from 'react';
import { useStore } from '../store';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { DRAFT_COLORS, draftAnalysis, draftGradient, thickColor, geometryAnalysis, thicknessAnalysis, thicknessColor, undercutAnalysis, UNDERCUT_COLORS } from '../../core/features/analysis';

/** Evaluate ▸ Draft Analysis PropertyManager: direction of pull, draft angle, face classification with colours. */
export function DraftAnalysisPM() {
  const st = useStore();
  const a = st.analysis;
  const result = useMemo(() => (a?.kind === 'draft' ? draftAnalysis(st.rebuild.bodies, a.pull, a.angle, a.classify !== false) : null), [a, st.rebuild.bodies]);
  if (!a || a.kind !== 'draft' || !result) return null;
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
    <div className="k-pm" data-testid="draft-analysis-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><Icon.Chamfer /> <b>Draft Analysis</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" onClick={() => st.setAnalysis(null)}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => st.setAnalysis(null)}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Analysis Parameters">
        <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
          <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => st.setAnalysis({ ...a, pull: [-a.pull[0], -a.pull[1], -a.pull[2]], pullLabel: a.pullLabel.startsWith('-') ? a.pullLabel.slice(1) : `-${a.pullLabel}` })}><Icon.Arrow size={14} /></button>
          <div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} onClick={fromFace} title="Click to use the selected planar face">
            <div className="k-selbox-row">Direction of Pull: {a.pullLabel}</div>
          </div>
        </div>
        <div className="k-pm-stylerow" style={{ marginLeft: 30 }}>
          {AX.map(([l, v]) => <button key={l} className="k-pm-stylebtn" onClick={() => st.setAnalysis({ ...a, pull: v, pullLabel: `${l} axis` })}>{l}</button>)}
        </div>
        <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={a.angle} onChange={(v) => st.setAnalysis({ ...a, angle: Math.max(0, Math.min(89, v)) })} unit="°" step={0.5} min={0} /></div>
        <label className="k-check"><input type="checkbox" data-testid="draft-classify" checked={a.classify !== false} onChange={(e) => st.setAnalysis({ ...a, classify: e.target.checked })} /> Face classification</label>
      </Section>
      <Section title="Color Settings">
        {a.classify === false && <div style={{ height: 14, marginBottom: 6, border: '1px solid var(--border)', background: `linear-gradient(90deg, ${draftGradient(-90, a.angle)}, ${draftGradient(0, a.angle)}, ${draftGradient(90, a.angle)})` }} />}
        <div className="k-draft-legend" data-testid="draft-legend">
          <div><span style={{ background: DRAFT_COLORS.positive }} /> {result.counts.positive} faces with positive draft</div>
          <div><span style={{ background: DRAFT_COLORS.requires }} /> {result.counts.requires} faces requiring draft</div>
          <div><span style={{ background: DRAFT_COLORS.negative }} /> {result.counts.negative} faces with negative draft</div>
        </div>
      </Section>
    </div>
  );
}


function AnalysisHead({ title, icon }: { title: string; icon: React.ReactNode }) {
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

/** Evaluate ▸ Thickness Analysis PropertyManager: target thickness, Show thin regions, colour ramp. */
export function ThicknessAnalysisPM() {
  const st = useStore();
  const a = st.analysis;
  const result = useMemo(() => (a?.kind === 'thickness' ? thicknessAnalysis(st.rebuild.bodies, a.target, a.mode, a.resolution) : null), [a, st.rebuild.bodies]);
  if (!a || a.kind !== 'thickness' || !result) return null;
  return (
    <div className="k-pm" data-testid="thickness-pm">
      <AnalysisHead title="Thickness Analysis" icon={<Icon.Shell />} />
      <Section title="Analysis Parameters">
        <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>Target</span><NumberField value={a.target} onChange={(v) => st.setAnalysis({ ...a, target: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} /></div>
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="thk" checked={(a.mode ?? 'thin') === 'thin'} onChange={() => st.setAnalysis({ ...a, mode: 'thin' })} /> Show thin regions</label>
          <label className="k-check"><input type="radio" name="thk" data-testid="thk-thick" checked={a.mode === 'thick'} onChange={() => st.setAnalysis({ ...a, mode: 'thick' })} /> Show thick regions</label>
        </div>
        <div className="k-field"><label>Resolution</label><select className="k-input" data-testid="thk-resolution" value={a.resolution ?? 'medium'} onChange={(e) => st.setAnalysis({ ...a, resolution: e.target.value as 'medium' })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
      </Section>
      <Section title="Color Settings">
        {a.mode === 'thick'
          ? <div className="k-thick-ramp" style={{ height: 14, background: `linear-gradient(90deg, ${thickColor(1.001, 1)}, ${thickColor(1.5, 1)}, ${thickColor(2, 1)})`, border: '1px solid var(--border)' }} />
          : <div className="k-thick-ramp" style={{ height: 14, background: `linear-gradient(90deg, ${thicknessColor(0, 1)}, ${thicknessColor(0.5, 1)}, ${thicknessColor(0.999, 1)})`, border: '1px solid var(--border)' }} />}
        <div className="k-draft-legend" data-testid="thickness-legend">
          {a.mode === 'thick'
            ? <div><span style={{ background: thickColor(2, 1) }} /> {result.thick} faces thicker than {a.target.toFixed(2)}{st.doc.units}</div>
            : <div><span style={{ background: thicknessColor(0, 1) }} /> {result.thin} faces thinner than {a.target.toFixed(2)}{st.doc.units}</div>}
          <div><span style={{ background: thicknessColor(2, 1) }} /> other faces</div>
          <div>{a.mode === 'thick' ? `Maximum thickness: ${result.maximum.toFixed(2)}` : `Minimum thickness: ${result.minimum.toFixed(2)}`}{st.doc.units}</div>
        </div>
      </Section>
    </div>
  );
}

/** Evaluate ▸ Undercut Analysis PropertyManager: direction of pull and the five face classes with their colours. */
export function UndercutAnalysisPM() {
  const st = useStore();
  const a = st.analysis;
  const result = useMemo(() => (a?.kind === 'undercut' ? undercutAnalysis(st.rebuild.bodies, a.pull) : null), [a, st.rebuild.bodies]);
  if (!a || a.kind !== 'undercut' || !result) return null;
  const AX: [string, [number, number, number]][] = [['X', [1, 0, 0]], ['Y', [0, 1, 0]], ['Z', [0, 0, 1]]];
  const labels: [keyof typeof UNDERCUT_COLORS, string][] = [['dir1', 'Direction1 undercut'], ['dir2', 'Direction2 undercut'], ['occluded', 'Occluded undercut'], ['straddle', 'Straddle undercut'], ['none', 'No undercut']];
  return (
    <div className="k-pm" data-testid="undercut-pm">
      <AnalysisHead title="Undercut Analysis" icon={<Icon.Cut />} />
      <Section title="Analysis Parameters">
        <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
          <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => st.setAnalysis({ ...a, pull: [-a.pull[0], -a.pull[1], -a.pull[2]], pullLabel: a.pullLabel.startsWith('-') ? a.pullLabel.slice(1) : `-${a.pullLabel}` })}><Icon.Arrow size={14} /></button>
          <div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }}><div className="k-selbox-row">Direction of Pull: {a.pullLabel}</div></div>
        </div>
        <div className="k-pm-stylerow" style={{ marginLeft: 30 }}>
          {AX.map(([l, v]) => <button key={l} className="k-pm-stylebtn" onClick={() => st.setAnalysis({ ...a, pull: v, pullLabel: `${l} axis` })}>{l}</button>)}
        </div>
      </Section>
      <Section title="Undercut Faces">
        <div className="k-draft-legend" data-testid="undercut-legend">
          {labels.map(([k, l]) => <div key={k}><span style={{ background: UNDERCUT_COLORS[k] }} /> {result.counts[k]} {l}</div>)}
        </div>
      </Section>
    </div>
  );
}

/** Evaluate ▸ Geometry Analysis, as the original: the limits, Calculate, and the lists of what was found. */
export function GeometryAnalysisPM() {
  const st = useStore();
  const a = st.analysis;
  const r0 = useMemo(() => (a?.kind === 'geometry' ? geometryAnalysis(st.rebuild.bodies as never, a) : null), [a, st.rebuild.bodies]);
  // the unchecked checks report nothing
  const r = r0 && a?.kind === 'geometry' ? { shortEdges: a.checkShort === false ? [] : r0.shortEdges, smallFaces: a.checkSmall === false ? [] : r0.smallFaces, sharpEdges: a.checkSharp === false ? [] : r0.sharpEdges } : null;
  if (!a || a.kind !== 'geometry' || !r) return null;
  return (
    <div className="k-pm" data-testid="geometry-pm">
      <AnalysisHead title="Geometry Analysis" icon={<Icon.Measure />} />
      <Section title="Analysis Parameters">
        <label className="k-check"><input type="checkbox" data-testid="geo-short" checked={a.checkShort !== false} onChange={(e) => st.setAnalysis({ ...a, checkShort: e.target.checked })} /> Short edges</label>
        <div className="k-pm-valuerow"><NumberField disabled={a.checkShort === false} value={a.shortEdge} onChange={(v) => st.setAnalysis({ ...a, shortEdge: Math.max(0.0001, v) })} unit={st.doc.units} step={0.1} /></div>
        <label className="k-check"><input type="checkbox" checked={a.checkSmall !== false} onChange={(e) => st.setAnalysis({ ...a, checkSmall: e.target.checked })} /> Small faces</label>
        <div className="k-pm-valuerow"><NumberField disabled={a.checkSmall === false} value={a.smallFace} onChange={(v) => st.setAnalysis({ ...a, smallFace: Math.max(0.0001, v) })} unit={`${st.doc.units}^2`} step={0.5} /></div>
        <label className="k-check"><input type="checkbox" checked={a.checkSharp !== false} onChange={(e) => st.setAnalysis({ ...a, checkSharp: e.target.checked })} /> Knife edges (sharp)</label>
        <div className="k-pm-valuerow"><NumberField disabled={a.checkSharp === false} value={a.sharpAngle} onChange={(v) => st.setAnalysis({ ...a, sharpAngle: Math.max(1, Math.min(90, v)) })} unit="°" step={1} /></div>
      </Section>
      <Section title="Analysis Results">
        <div className="k-draft-legend" data-testid="geometry-results">
          <div className="k-geo-row" onClick={() => useStore.setState({ selectedEdges: r.shortEdges, selectedFaces: [], selectedFace: null })}>Short edges: {r.shortEdges.length}</div>
          <div className="k-geo-row" onClick={() => useStore.setState({ selectedFaces: r.smallFaces, selectedFace: r.smallFaces[0] ?? null, selectedEdges: [] })}>Small faces: {r.smallFaces.length}</div>
          <div className="k-geo-row" onClick={() => useStore.setState({ selectedEdges: r.sharpEdges, selectedFaces: [], selectedFace: null })}>Knife edges: {r.sharpEdges.length}</div>
        </div>
        <p className="k-muted">Click a result to highlight it in the graphics area.</p>
      </Section>
    </div>
  );
}
