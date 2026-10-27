/** Property Panels: sheetMetalPMs (split from PropertyPanel.tsx, QA F103). */
import { sketchChains } from '../../../core/features/thin';
import { type ReactNode } from 'react';
import { useStore } from '../../store';
import { NumberField, Section, round } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { DEFAULT_SHEET_METAL, GAUGE_TABLES, materialKFactor } from '../../../core/features/sheetmetal';
import { classifyVent, FORM_TOOL_LIBRARY } from '../../../core/features/sheetmetal4';
import { SheetMetalPM, Header, fieldEquation } from './shared';
import { NEXT, type PMContext } from './context';

export function sheetMetalEditPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.sheetMetalEdit) {
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    return <SheetMetalPM params={sm} onOk={(p) => st.setSheetMetal(p)} onCancel={() => st.setSheetMetalEdit(false)} />;
  }
  return NEXT;
}

export function baseFlangePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'baseFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const bsk = st.doc.sketches[d.sketchId];
    // a tab on a part that is sheet metal already: only the Sheet Metal Parameters (the thickness is the part's)
    const own = st.doc.features.findIndex((f) => f.id === d.id);
    const isTab = st.doc.features.some((f, i) => f.type === 'baseFlange' && f.id !== d.id && (own < 0 || i < own));
    if (isTab) {
      return (
        <>
          <Header title="Base Flange" icon={<Icon.Sheet />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          {!bsk && <Section title="Message"><p className="k-pm-message">Select a sketch with closed contours for the tab.</p></Section>}
          <Section title="Sheet Metal Parameters">
            <div className="k-pm-valuerow" data-testid="tab-thickness">
              <span className="k-muted" style={{ minWidth: 18 }}>T1</span>
              <NumberField value={sm.thickness} onChange={() => undefined} unit={st.doc.units} disabled />
            </div>
            <label className="k-check"><input type="checkbox" checked={d.reverse} onChange={(e) => st.updateFeatureDraft({ reverse: e.target.checked })} /> Reverse direction</label>
            <label className="k-check"><input type="checkbox" data-testid="tab-merge" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>
          </Section>
          {err && <Section title="Rebuild Errors"><p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p></Section>}
        </>
      );
    }
    return (
      <>
        <Header title={d.name} icon={<Icon.Sheet />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {!bsk && (
          <Section title="Message">
            <p className="k-pm-message">Select a sketch in the Feature Tree: an open profile bends into a sheet, a closed contour becomes a tab.</p>
          </Section>
        )}
        {bsk && (() => {
          // Profile Sketch check, by design: one open chain (a bent sheet) or closed contours only (a tab)
          const chains = sketchChains(bsk);
          const open = chains.filter((c) => !c.closed), closed = chains.filter((c) => c.closed);
          const valid = (open.length === 1 && closed.length === 0) || (open.length === 0 && closed.length > 0);
          const why = !chains.length ? 'The sketch has no lines or arcs.' : open.length > 1 ? 'The sketch has more than one open contour.' : open.length === 1 && closed.length ? 'The sketch mixes an open contour with closed contours.' : '';
          return (
            <Section title="Profile Sketch">
              <p className="k-pm-message" data-testid="bf-sketchcheck" style={valid ? undefined : { background: '#ffe3e3', borderColor: '#e0a0a0' }}>{valid ? 'The sketch is valid.' : `The sketch is not valid. ${why} Use a single open profile (sheet) or closed contours (tab).`}</p>
            </Section>
          );
        })()}
        <Section title="Sheet Metal Parameters From Material" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" data-testid="bf-material" checked={!!sm.useMaterial} onChange={(e) => { const k = materialKFactor(st.doc.material?.name); if (e.target.checked && k === null) { st.pushMessage('The part has no material with sheet metal parameters (choose a steel, aluminium or copper material).', 'warn'); return; } st.setSheetMetal({ ...sm, useMaterial: e.target.checked, ...(e.target.checked && k !== null ? { kFactor: k, allowanceType: 'kFactor' } : {}) }); }} /> Use material sheet metal parameters</label>
        </Section>
        <Section title="Direction 1">
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.flipDir ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ flipDir: !d.flipDir })}><Icon.ReverseDir size={16} /></button>
            <select className="k-input" value={d.midPlane ? 'midPlane' : 'blind'} onChange={(e) => st.updateFeatureDraft({ midPlane: e.target.value === 'midPlane' })}>
              <option value="blind">Blind</option>
              <option value="midPlane">Mid Plane</option>
            </select>
          </div>
          <div className="k-pm-valuerow">
            <Icon.Dimension size={14} />
            <NumberField equation={fieldEquation(st, 'depth')} value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
          </div>
        </Section>
        <Section title="Sheet Metal Gauges" defaultOpen={!!sm.gauge}>
        <label className="k-check"><input type="checkbox" data-testid="bf-gauge" checked={!!sm.gauge} onChange={(e) => st.setSheetMetal({ ...sm, gauge: e.target.checked ? { table: 'Sample Table - Steel', gauge: 'Gauge 14' } : undefined, ...(e.target.checked ? { thickness: 1.897, bendRadius: 1.9 } : {}) })} /> Use gauge table</label>
        {sm.gauge && (
          <>
            <select className="k-input" value={sm.gauge.table} onChange={(e) => { const g = GAUGE_TABLES[e.target.value][0]; st.setSheetMetal({ ...sm, gauge: { table: e.target.value, gauge: g.gauge }, thickness: g.thickness, bendRadius: g.radius }); }}>{Object.keys(GAUGE_TABLES).map((t) => <option key={t}>{t}</option>)}</select>
            <select className="k-input" style={{ marginTop: 4 }} value={sm.gauge.gauge} onChange={(e) => { const g = GAUGE_TABLES[sm.gauge!.table].find((x) => x.gauge === e.target.value)!; st.setSheetMetal({ ...sm, gauge: { ...sm.gauge!, gauge: g.gauge }, thickness: g.thickness, bendRadius: g.radius }); }}>{GAUGE_TABLES[sm.gauge.table].map((g) => <option key={g.gauge}>{g.gauge}</option>)}</select>
          </>
        )}
        </Section>
        <Section title="Sheet Metal Parameters">
          <div className="k-pm-valuerow">
            <span className="k-muted" style={{ minWidth: 18 }}>T1</span>
            <NumberField value={sm.thickness} onChange={(v) => st.setSheetMetal({ ...sm, thickness: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} />
          </div>
          <label className="k-check"><input type="checkbox" checked={d.reverse} onChange={(e) => st.updateFeatureDraft({ reverse: e.target.checked })} /> Reverse direction</label>
          <div className="k-pm-valuerow">
            <Icon.Arc size={14} />
            <NumberField value={sm.bendRadius} onChange={(v) => st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} />
          </div>
        </Section>
        <Section title="Bend Allowance">
          <select className="k-input" data-testid="bf-allowance" value={sm.allowanceType ?? 'kFactor'} onChange={(e) => st.setSheetMetal({ ...sm, allowanceType: e.target.value as 'kFactor', allowanceValue: sm.allowanceValue ?? (e.target.value === 'bendAllowance' ? 5 : e.target.value === 'bendDeduction' ? 4 : undefined) })}>
            <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option><option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
          </select>
          {(sm.allowanceType ?? 'kFactor') === 'kFactor' && <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
            <span className="k-muted" style={{ minWidth: 18 }}>K</span>
            <NumberField value={sm.kFactor} onChange={(v) => st.setSheetMetal({ ...sm, kFactor: Math.max(0, Math.min(1, v)) })} step={0.05} min={0} />
          </div>}
          {(sm.allowanceType === 'bendAllowance' || sm.allowanceType === 'bendDeduction') && <div className="k-pm-valuerow" style={{ marginTop: 4 }}><span className="k-muted" style={{ minWidth: 18 }}>{sm.allowanceType === 'bendAllowance' ? 'BA' : 'BD'}</span><NumberField value={sm.allowanceValue ?? 0} onChange={(v) => st.setSheetMetal({ ...sm, allowanceValue: Math.max(0, v) })} unit={st.doc.units} step={0.1} /></div>}
        </Section>
        <Section title="Auto Relief" defaultOpen={false}>
          <select className="k-input" data-testid="bf-relief" value={sm.reliefType ?? 'rectangle'} onChange={(e) => st.setSheetMetal({ ...sm, reliefType: e.target.value as 'rectangle' })}><option value="rectangle">Rectangle</option><option value="tear">Tear</option><option value="obround">Obround</option></select>
          <label className="k-check"><input type="checkbox" checked={sm.useReliefRatio !== false} onChange={(e) => st.setSheetMetal({ ...sm, useReliefRatio: e.target.checked })} /> Use relief ratio</label>
          {sm.useReliefRatio !== false
            ? <div className="k-pm-valuerow k-tip" data-tip="Relief ratio"><span className="k-muted" style={{ minWidth: 18 }}>%</span><NumberField value={sm.reliefRatio ?? 0.5} onChange={(v) => st.setSheetMetal({ ...sm, reliefRatio: Math.max(0.05, Math.min(2, v)) })} step={0.05} /></div>
            : <div className="k-pm-valuerow k-tip" data-tip="Relief width"><Icon.Dimension size={14} /><NumberField value={sm.reliefWidth ?? sm.thickness} onChange={(v) => st.setSheetMetal({ ...sm, reliefWidth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function miterFlangePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'miterFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const sketches = st.doc.features.filter((f): f is import('../../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title={d.name} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Miter Parameters">
          <div className="k-field"><label>Profile</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="miter-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="miter-edges">
            {d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the edges of the sheet in the graphics area.</span>}
          </div>
          <label className="k-check"><input type="checkbox" checked={d.radius === undefined} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow"><Icon.Arc size={14} /><NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => d.radius === undefined ? st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) }) : st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction (material side)" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Arrow size={14} /></button>
          </div>
          <div className="k-field"><label>Rip gap</label><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.05} min={0} /></div>
        </Section>
        <Section title="Start/End Offset" defaultOpen={(d.startOffset ?? 0) + (d.endOffset ?? 0) > 0}>
          <div className="k-pm-valuerow k-tip" data-tip="Start offset distance"><span className="k-pm-xy">⇤</span><NumberField value={d.startOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ startOffset: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="End offset distance"><span className="k-pm-xy">⇥</span><NumberField value={d.endOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ endOffset: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function sketchedBendPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'sketchedBend') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const sketches = st.doc.features.filter((f): f is import('../../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title={d.name} icon={<Icon.Line />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Bend Parameters">
          <div className="k-field"><label>Sketch</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="sbend-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
          <label className="k-check"><input type="checkbox" checked={d.flipSide} onChange={(e) => st.updateFeatureDraft({ flipSide: e.target.checked })} /> Fixed face on the other side</label>
          <div className="k-pm-stylerow">
            {([['centerline', 'Bend Centerline', '|'], ['materialInside', 'Material Inside', '⌐'], ['materialOutside', 'Material Outside', '¬'], ['bendOutside', 'Bend Outside', '⊓']] as const).map(([v, tip, g]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${(d.position ?? 'centerline') === v ? 'active' : ''}`} data-tip={tip} data-testid={`pos-${v}`} onClick={() => st.updateFeatureDraft({ position: v })}>{g}</button>
            ))}
          </div>
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
            <NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(179, v)) })} unit="°" step={5} min={1} autoFocus />
          </div>
          <label className="k-check"><input type="checkbox" checked={d.radius === undefined} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow"><Icon.Arc size={14} /><NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => d.radius === undefined ? st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) }) : st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function jogPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'jog') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const sketches = st.doc.features.filter((f): f is import('../../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title={d.name} icon={<Icon.Line />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selections">
          <div className="k-field"><label>Sketch</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="jog-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
          <label className="k-check"><input type="checkbox" checked={d.flipSide} onChange={(e) => st.updateFeatureDraft({ flipSide: e.target.checked })} /> Fixed face on the other side</label>
          <label className="k-check"><input type="checkbox" checked={d.radius === undefined} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow"><Icon.Arc size={14} /><NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => d.radius === undefined ? st.setSheetMetal({ ...sm, bendRadius: Math.max(0, v) }) : st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        <Section title="Jog Offset">
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
            <select className="k-input" data-testid="jog-end" value={d.offsetEnd ?? 'blind'} onChange={(e) => { st.updateFeatureDraft({ offsetEnd: e.target.value as 'blind' }); useStore.setState({ flangePick: e.target.value === 'upToVertex' ? 'vertex' : null }); }}><option value="blind">Blind</option><option value="upToVertex">Up To Vertex</option></select>
          </div>
          {(d.offsetEnd ?? 'blind') === 'blind'
            ? <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
            : <div className={`k-selbox${st.flangePick === 'vertex' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} onClick={() => useStore.setState({ flangePick: 'vertex' })}>{d.vertex ? <div className="k-selbox-row">{d.vertex.label}</div> : <span className="k-muted">Click a corner of the model.</span>}</div>}
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="jogoff" checked={(d.offsetType ?? 'outside') === 'outside'} onChange={() => st.updateFeatureDraft({ offsetType: 'outside' })} /> Outside offset</label>
            <label className="k-check"><input type="radio" name="jogoff" data-testid="jog-inside" checked={d.offsetType === 'inside'} onChange={() => st.updateFeatureDraft({ offsetType: 'inside' })} /> Inside offset</label>
            <label className="k-check"><input type="radio" name="jogoff" checked={d.offsetType === 'overall'} onChange={() => st.updateFeatureDraft({ offsetType: 'overall' })} /> Overall dimension</label>
          </div>
          <label className="k-check"><input type="checkbox" data-testid="jog-fixprojected" checked={d.fixProjected !== false} onChange={(e) => st.updateFeatureDraft({ fixProjected: e.target.checked })} /> Fix projected length</label>
        </Section>
        <Section title="Jog Position">
          <div className="k-pm-stylerow">
            {([['centerline', 'Bend Centerline', '|'], ['materialInside', 'Material Inside', '⌐'], ['materialOutside', 'Material Outside', '¬'], ['bendOutside', 'Bend Outside', '⊓']] as const).map(([v, tip, g]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${(d.position ?? 'centerline') === v ? 'active' : ''}`} data-tip={tip} data-testid={`pos-${v}`} onClick={() => st.updateFeatureDraft({ position: v })}>{g}</button>
            ))}
          </div>
        </Section>
        <Section title="Jog Angle">
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.jogAngle ?? 90} onChange={(v) => st.updateFeatureDraft({ jogAngle: Math.max(10, Math.min(90, v)) })} unit="°" step={5} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function unfoldPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && (st.featureEdit.draft.type === 'unfold' || st.featureEdit.draft.type === 'fold')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const isUnfold = d.type === 'unfold';
    // the bends of the base flange: interior corners of its open sketch chain
    const bf = st.doc.features.find((f) => f.type === 'baseFlange' && !f.suppressed);
    const chain = bf && bf.type === 'baseFlange' && st.doc.sketches[bf.sketchId] ? sketchChains(st.doc.sketches[bf.sketchId]).find((c) => !c.closed) : undefined;
    const nBends = chain ? Math.max(0, chain.points.length - 2) : 0;
    return (
      <>
        <Header title={isUnfold ? 'Unfold' : 'Fold'} icon={<Icon.Sheet />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selections">
          <div className="k-field"><label>Fixed face</label></div>
          <div className="k-selbox" style={{ minHeight: 24 }}><div className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;1&gt;</div></div>
          <div className="k-field" style={{ marginTop: 6 }}><label>{isUnfold ? 'Bends to unfold' : 'Bends to fold'}</label></div>
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="unfold-bends">
            {Array.from({ length: nBends }, (_, i) => <div key={i} className="k-selbox-row"><Icon.Arc size={12} /> BaseBend{i + 1}</div>)}
          </div>
          <button className="k-btn" style={{ marginTop: 4 }}>Collect All Bends</button>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function closedCornerPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && (st.featureEdit.draft.type === 'closedCorner' || st.featureEdit.draft.type === 'cornerRelief' || st.featureEdit.draft.type === 'loftedBend' || st.featureEdit.draft.type === 'convertSheet')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f) => f.type === 'sketch') as { id: string; name: string; sketchId: string }[];
    const errBox = err && (
      <Section title="Rebuild Errors">
        <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
      </Section>
    );
    if (d.type === 'closedCorner') {
      return (
        <>
          <Header title={d.weld ? 'Welded Corner' : 'Closed Corner'} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Faces to Extend">
            <div className="k-selbox" style={{ minHeight: 40 }} data-testid="cc-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the end faces of the flanges in the graphics area.</span>}</div>
          </Section>
          <Section title="Corner Type">
            <div className="k-pm-stylerow">
              {(['butt', 'overlap', 'underlap'] as const).map((k) => <button key={k} className={`k-pm-stylebtn k-tip ${d.cornerType === k ? 'active' : ''}`} data-tip={k[0].toUpperCase() + k.slice(1)} onClick={() => st.updateFeatureDraft({ cornerType: k })}><Icon.Chamfer size={14} /></button>)}
            </div>
            <div className="k-pm-valuerow k-tip" data-tip="Gap distance"><Icon.Dimension size={14} /><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.1} /></div>
            <label className="k-check"><input type="checkbox" checked={!!d.weld} onChange={(e) => st.updateFeatureDraft({ weld: e.target.checked })} /> Weld the corner (weld bead)</label>
          </Section>
          {errBox}
        </>
      );
    }
    if (d.type === 'cornerRelief') {
      return (
        <>
          <Header title="Corner Relief" icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Scope">
            <div className="k-selbox" style={{ minHeight: 40 }} data-testid="cr-bends">{d.bends.length ? d.bends.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Arc size={12} /> Bend&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the curved faces of the two bends that meet.</span>}</div>
          </Section>
          <Section title="Relief Options">
            <div className="k-pm-stylerow">
              <button className={`k-pm-stylebtn k-tip ${d.kind === 'rectangular' ? 'active' : ''}`} data-tip="Rectangular Relief" onClick={() => st.updateFeatureDraft({ kind: 'rectangular' })}>▭</button>
              <button className={`k-pm-stylebtn k-tip ${d.kind === 'circular' ? 'active' : ''}`} data-tip="Circular Relief" onClick={() => st.updateFeatureDraft({ kind: 'circular' })}>◯</button>
            </div>
            <div className="k-pm-valuerow k-tip" data-tip="Relief size"><Icon.Dimension size={14} /><NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
          </Section>
          {errBox}
        </>
      );
    }
    if (d.type === 'loftedBend') {
      return (
        <>
          <Header title="Lofted-Bend" icon={<Icon.Loft />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
          <Section title="Manufacturing Method">
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="lbm" checked={(d.method ?? 'formed') === 'formed'} onChange={() => st.updateFeatureDraft({ method: 'formed' })} /> Formed</label>
              <label className="k-check"><input type="radio" name="lbm" data-testid="lb-bent" checked={d.method === 'bent'} onChange={() => st.updateFeatureDraft({ method: 'bent', facets: d.facets ?? 4 })} /> Bent</label>
            </div>
            {d.method === 'bent' && <div className="k-pm-valuerow k-tip" data-tip="Number of bends (facets per curved part)"><Icon.Pattern size={14} /><NumberField value={d.facets ?? 4} onChange={(v) => st.updateFeatureDraft({ facets: Math.max(1, Math.min(40, Math.round(v))) })} step={1} min={1} /></div>}
          </Section>
          <Section title="Profiles">
            {(['sketchId', 'sketchId2'] as const).map((k, i) => (
              <div key={k} className="k-field"><label>Profile {i + 1}</label>
                <select className="k-input" data-testid={`lb-${k}`} value={d[k]} onChange={(e) => st.updateFeatureDraft({ [k]: e.target.value })}>
                  <option value="">Select a sketch…</option>
                  {sketches.map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
                </select>
              </div>
            ))}
          </Section>
          <Section title="Thickness">
            <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
          </Section>
          {errBox}
        </>
      );
    }
    return (
      <>
        <Header title={d.insertBends ? 'Bends' : 'Convert To Sheet Metal'} icon={<Icon.Sheet />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {d.insertBends && (
          <Section title="Message">
            <p className="k-pm-message">Select the fixed face. The sharp corners of the shelled solid become bends with the default radius (Sheet-Metal, Flatten-Bends and Process-Bends are added to the tree).</p>
          </Section>
        )}
        <Section title="Sheet Metal Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="conv-fixed">{d.fixedFace ? <div className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;1&gt; (fixed)</div> : <span className="k-muted">Select the fixed face of the solid.</span>}</div>
          <div className="k-pm-valuerow k-tip" data-tip="Sheet thickness"><Icon.Dimension size={14} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Default radius for bends"><Icon.Arc size={14} /><NumberField value={d.bendRadius} onChange={(v) => st.updateFeatureDraft({ bendRadius: Math.max(0, v) })} unit={st.doc.units} step={0.5} /></div>
          <label className="k-check"><input type="checkbox" data-testid="conv-keepbody" checked={!!d.keepBody} onChange={(e) => st.updateFeatureDraft({ keepBody: e.target.checked })} /> Keep body</label>
          {d.insertBends && <label className="k-check"><input type="checkbox" data-testid="conv-ignorebeveled" checked={!!d.ignoreBeveled} onChange={(e) => st.updateFeatureDraft({ ignoreBeveled: e.target.checked })} /> Ignore beveled faces</label>}
          {st.rebuild.bendCounts?.[d.id] !== undefined && <p className="k-muted" data-testid="conv-bends">{st.rebuild.bendCounts[d.id]} bend(s).</p>}
        </Section>
        <Section title="Bend Edges">
          <p className="k-muted">The side faces become flanges; the face opposite the fixed face is left open.</p>
        </Section>
        {errBox}
      </>
    );
  }
  return NEXT;
}

export function ventPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'vent') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f) => f.type === 'sketch') as { id: string; name: string; sketchId: string }[];
    const vsk = st.doc.sketches[d.sketchId];
    const parts = vsk ? classifyVent(vsk, !!d.fillIn) : null;
    const nOpen = parts?.ribs.length ?? 0, nSpars = parts?.spars.length ?? 0, nClosed = parts ? parts.regions.length : 0;
    return (
      <>
        <Header title="Vent" icon={<Icon.Vent />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Message">
          <p className="k-pm-message">Select a 2D sketch on the sheet: the largest closed contour is the boundary, open chains are ribs and the other closed contours are spars.</p>
        </Section>
        <Section title="Boundary">
          <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="vent-sketch">
            <option value="">(select a sketch)</option>
            {sketches.map((s) => <option key={s.id} value={s.sketchId}>{s.name}</option>)}
          </select>
          <div className="k-selbox" style={{ minHeight: 24, marginTop: 4 }} data-testid="vent-boundary">{nClosed ? <div className="k-selbox-row"><Icon.Sketch size={12} /> Boundary: {vsk?.name} ({round(parts?.boundaryArea ?? 0, 1)} mm²)</div> : <span className="k-muted">No closed contour.</span>}</div>
        </Section>
        <Section title="Geometry Properties">
          <div className="k-pm-valuerow k-tip" data-tip="Draft angle"><Icon.Draft size={16} /><NumberField value={d.draft ?? 0} onChange={(v) => st.updateFeatureDraft({ draft: Math.max(0, Math.min(45, v)) })} unit="°" step={1} min={0} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Fillet radius of the corners"><Icon.Fillet size={16} /><NumberField value={d.radius ?? 0} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        <Section title="Flow Area">
          <p className="k-muted" data-testid="vent-flow">Boundary {round(parts?.boundaryArea ?? 0, 1)} mm² with {nOpen} rib(s) and {nSpars} spar(s){d.fillIn && parts?.fillIn.length ? ' and a fill-in boundary' : ''}: the open area is what is left between them.</p>
        </Section>
        <Section title="Ribs">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="vent-ribs">{nOpen ? Array.from({ length: nOpen }, (_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Rib&lt;{i + 1}&gt;</div>) : <span className="k-muted">Open lines of the sketch become ribs.</span>}</div>
          <div className="k-pm-valuerow k-tip" data-tip="Rib width"><Icon.Dimension size={14} /><NumberField value={d.ribWidth} onChange={(v) => st.updateFeatureDraft({ ribWidth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} data-testid="vent-ribwidth" /></div>
        </Section>
        <Section title="Spars">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="vent-spars">{nSpars ? Array.from({ length: nSpars }, (_, i) => <div key={i} className="k-selbox-row"><Icon.Circle size={12} /> Spar&lt;{i + 1}&gt;</div>) : <span className="k-muted">Closed contours inside the boundary become spars.</span>}</div>
          <div className="k-pm-valuerow k-tip" data-tip="Spar width"><Icon.Dimension size={14} /><NumberField value={d.sparWidth} onChange={(v) => st.updateFeatureDraft({ sparWidth: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} /></div>
        </Section>
        <Section title="Fill-In Boundary" defaultOpen={!!d.fillIn}>
          <label className="k-check"><input type="checkbox" data-testid="vent-fillin" checked={!!d.fillIn} onChange={(e) => st.updateFeatureDraft({ fillIn: e.target.checked })} /> The smallest closed contour stays solid</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function formToolPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, holeTab, setHoleTab } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'formTool') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const lib = FORM_TOOL_LIBRARY.find((x) => x.id === d.shape) ?? FORM_TOOL_LIBRARY[0];
    return (
      <>
        <Header title="Form Tool Feature" icon={<Icon.FormTool />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <div className="k-pm-tabs">
          <button className={holeTab === 'type' ? 'active' : ''} onClick={() => setHoleTab('type')}>Type</button>
          <button className={holeTab === 'positions' ? 'active' : ''} onClick={() => setHoleTab('positions')}>Position</button>
        </div>
        {holeTab === 'type' && (
          <>
            <Section title="Placement Face">
              <div className="k-selbox" style={{ minHeight: 24 }} data-testid="form-face">{d.plane ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {st.doc.planes[d.plane]?.name ?? 'Face<1>'}</div> : <span className="k-muted">Select the face of the sheet the form is pressed into.</span>}</div>
            </Section>
            <Section title="Forming Tool">
              <div className="k-pm-label">Part Library ▸ forming tools:</div>
              <select className="k-input" value={d.shape} data-testid="form-shape" onChange={(e) => { const t = FORM_TOOL_LIBRARY.find((x) => x.id === e.target.value)!; st.updateFeatureDraft({ shape: t.id, width: t.width, length: t.length, height: t.height, name: `${t.label}${st.doc.features.filter((f) => f.type === 'formTool' && f.shape === t.id).length + 1}` }); }}>
                {FORM_TOOL_LIBRARY.map((t) => <option key={t.id} value={t.id}>{t.folder} ▸ {t.label}</option>)}
              </select>
              <div className="k-pm-valuerow k-tip" data-tip="Rotation angle"><Icon.MateAngle size={14} /><NumberField value={d.rotation} onChange={(v) => st.updateFeatureDraft({ rotation: ((v % 360) + 360) % 360 })} unit="°" step={15} /></div>
              <label className="k-check"><input type="checkbox" data-testid="form-flip" checked={d.flip} onChange={(e) => st.updateFeatureDraft({ flip: e.target.checked })} /> Flip tool</label>
              <label className="k-check"><input type="checkbox" checked={d.linkToThickness !== false} onChange={(e) => st.updateFeatureDraft({ linkToThickness: e.target.checked })} /> Link to thickness</label>
            </Section>
            <Section title="Configurations" defaultOpen={false}>
              <p className="k-muted">{lib.folder} ▸ {lib.label}: default configuration.</p>
              <div className="k-pm-valuerow k-tip" data-tip="Length"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
              <div className="k-pm-valuerow k-tip" data-tip="Width"><Icon.Dimension size={14} /><NumberField value={d.width} onChange={(v) => st.updateFeatureDraft({ width: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
              <div className="k-pm-valuerow k-tip" data-tip="Height"><Icon.Depth size={16} /><NumberField value={d.height} onChange={(v) => st.updateFeatureDraft({ height: Math.max(0.5, v) })} unit={st.doc.units} step={0.5} min={0.5} /></div>
            </Section>
            <Section title="Flat Pattern Visibility" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" defaultChecked /> Override document settings</label>
              <label className="k-check"><input type="checkbox" defaultChecked /> Show punch</label>
              <label className="k-check"><input type="checkbox" /> Show profile</label>
              <label className="k-check"><input type="checkbox" /> Show center</label>
            </Section>
          </>
        )}
        {holeTab === 'positions' && (
          <Section title="Positions">
            <p className="k-muted">Click the placement face to place the form. {d.points.length} position(s).</p>
            <div className="k-selbox" style={{ minHeight: 24 }} data-testid="form-points">{d.points.map((p, i) => <div key={i} className="k-selbox-row"><Icon.Point size={12} /> Point{i + 1} ({round(p.x, 2)}, {round(p.y, 2)})</div>)}</div>
            {d.points.length > 0 && <button className="k-btn" style={{ marginTop: 4 }} onClick={() => st.updateFeatureDraft({ points: d.points.slice(0, -1) })}>Remove last</button>}
          </Section>
        )}
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function gussetPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'gusset') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Sheet Metal Gusset" icon={<Icon.Gusset />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Position">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="gusset-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the two faces on both sides of the bend.</span>}</div>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={d.offset === null} onChange={(e) => st.updateFeatureDraft({ offset: e.target.checked ? null : 10 })} /> Centre on the bend</label>
          {d.offset !== null && <div className="k-pm-valuerow k-tip" data-tip="Offset from the start of the bend"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} /></div>}
        </Section>
        <Section title="Profile">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="gusset-profile" defaultChecked /> Indent depth</label>
            <label className="k-check"><input type="radio" name="gusset-profile" disabled /> Profile dimensions</label>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Indent depth"><Icon.Depth size={16} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} data-testid="gusset-depth" /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Indent width"><Icon.Dimension size={14} /><NumberField value={d.width} onChange={(v) => st.updateFeatureDraft({ width: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Side face draft"><Icon.Draft size={16} /><NumberField value={d.sideDraft ?? 0} onChange={(v) => st.updateFeatureDraft({ sideDraft: Math.max(0, Math.min(45, v)) })} unit="°" step={1} min={0} /></div>
          <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Flip gusset side" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>
        </Section>
        <Section title="Dimensions" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" disabled /> Inner corner fillets</label>
          <label className="k-check"><input type="checkbox" disabled /> Outer corner fillets</label>
        </Section>
        <Section title="Preview" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" defaultChecked /> Full preview</label>
        </Section>
        <Section title="Flat Pattern Visibility" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" defaultChecked /> Show gusset profile in flat pattern</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function tabSlotPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'tabSlot') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Tab and Slot" icon={<Icon.TabSlot />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selection">
          <div className="k-pm-label">Tab edge:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="ts-edge">{d.edge ? <div className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;1&gt;</div> : <span className="k-muted">Select the edge of the sheet that gets the tabs.</span>}</div>
          <div className="k-pm-label">Slot face:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="ts-face">{d.slotFace ? <div className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;1&gt;</div> : <span className="k-muted">Select the face of the other sheet that gets the slots.</span>}</div>
        </Section>
        <Section title="Offset">
          <div className="k-pm-valuerow k-tip" data-tip="Offset of the first and last tab from the edge ends"><Icon.Dimension size={14} /><NumberField value={d.edgeOffset} onChange={(v) => st.updateFeatureDraft({ edgeOffset: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} /></div>
        </Section>
        <Section title="Spacing">
          <div className="k-pm-valuerow k-tip" data-tip="Number of tabs"><Icon.Pattern size={14} /><NumberField value={d.count} onChange={(v) => st.updateFeatureDraft({ count: Math.max(1, Math.round(v)) })} step={1} min={1} data-testid="ts-count" /></div>
        </Section>
        <Section title="Tab">
          <div className="k-pm-valuerow k-tip" data-tip="Tab length"><Icon.Dimension size={14} /><NumberField value={d.tabLength} onChange={(v) => st.updateFeatureDraft({ tabLength: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} data-testid="ts-length" /></div>
          <label className="k-check"><input type="checkbox" checked={d.linkToThickness !== false} onChange={(e) => st.updateFeatureDraft({ linkToThickness: e.target.checked })} /> Link to thickness (height)</label>
          {d.linkToThickness === false && <div className="k-pm-valuerow k-tip" data-tip="Tab height"><Icon.Depth size={16} /><NumberField value={d.tabHeight} onChange={(v) => st.updateFeatureDraft({ tabHeight: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} /></div>}
        </Section>
        <Section title="Slot">
          <div className="k-pm-valuerow k-tip" data-tip="Slot clearance (each side)"><Icon.Dimension size={14} /><NumberField value={d.clearance} onChange={(v) => st.updateFeatureDraft({ clearance: Math.max(0, v) })} unit={st.doc.units} step={0.05} min={0} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function ripPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'rip') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Rip" icon={<Icon.Rip />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Rip Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="rip-edges">{d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the edges of the solid to rip.</span>}</div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.direction === 'both' ? 'active' : ''}`} data-tip="Change Direction: both sides" data-testid="rip-both" onClick={() => st.updateFeatureDraft({ direction: 'both' })}><Icon.DirArrow size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.direction === 'first' ? 'active' : ''}`} data-tip="Change Direction: first face" onClick={() => st.updateFeatureDraft({ direction: 'first' })}><Icon.ReverseDir size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.direction === 'second' ? 'active' : ''}`} data-tip="Change Direction: second face" onClick={() => st.updateFeatureDraft({ direction: 'second' })}><Icon.Flip size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Rip gap"><Icon.Dimension size={14} /><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0.01, v) })} unit={st.doc.units} step={0.1} min={0.01} data-testid="rip-gap" /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function sweptFlangePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'sweptFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f) => f.type === 'sketch') as { id: string; name: string; sketchId: string }[];
    return (
      <>
        <Header title="Swept Flange" icon={<Icon.SweptFlange />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Profile and Path">
          <div className="k-pm-label">Profile (an open sketch):</div>
          <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="sf-profile">
            <option value="">(select a sketch)</option>
            {sketches.map((s) => <option key={s.id} value={s.sketchId}>{s.name}</option>)}
          </select>
          <div className="k-pm-label">Path (a sketch, or edges of the sheet):</div>
          <select className="k-input" value={d.pathSketchId} onChange={(e) => st.updateFeatureDraft({ pathSketchId: e.target.value })} data-testid="sf-path">
            <option value="">(edges of the sheet)</option>
            {sketches.map((s) => <option key={s.id} value={s.sketchId}>{s.name}</option>)}
          </select>
          <div className="k-selbox" style={{ minHeight: 24, marginTop: 4 }} data-testid="sf-edges">{d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select straight edges of the sheet as the path.</span>}</div>
        </Section>
        <Section title="Sheet Metal Parameters">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction (material on the other side of the profile)" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Sheet thickness"><Icon.Dimension size={14} /><NumberField value={(st.doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness} onChange={(v) => st.setSheetMetal({ ...(st.doc.sheetMetal ?? DEFAULT_SHEET_METAL), thickness: Math.max(0.1, v) })} unit={st.doc.units} step={0.5} min={0.1} /></div>
          <label className="k-check"><input type="checkbox" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>
        </Section>
        <Section title="Flat Pattern Options" defaultOpen={false}>
          <label className="k-check"><input type="checkbox" defaultChecked /> Flatten along path</label>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function crossBreakPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, profileEdit, setProfileEdit } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'crossBreak') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Cross Break" icon={<Icon.Mirror />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Cross-Break Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="xbreak-face">{d.face ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.face.label}</div> : <span className="k-muted">Select a planar face of the sheet.</span>}</div>
          <button className={`k-btn${profileEdit ? ' active' : ''}`} data-testid="xbreak-edit" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Edit Cross-Break</button>
          {profileEdit && (
            <>
              <select className="k-input" style={{ marginTop: 4 }} value={d.lines ?? 'both'} onChange={(e) => st.updateFeatureDraft({ lines: e.target.value as 'both' })}><option value="both">Both diagonals</option><option value="first">First diagonal</option><option value="second">Second diagonal</option></select>
              <div className="k-pm-valuerow k-tip" data-tip="Distance from the corners"><Icon.Dimension size={14} /><NumberField value={d.inset ?? 0} onChange={(v) => st.updateFeatureDraft({ inset: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
            </>
          )}
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Arrow size={14} /></button>
          </div>
          <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>R</span><NumberField value={d.radius} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} /></div>
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(0.01, Math.min(10, v)) })} unit="°" step={0.5} /></div>
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function hemPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, profileEdit, setProfileEdit } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'hem') {
    const d = st.featureEdit.draft;
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title={d.name} icon={<Icon.Arc />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Edges">
          <div className="k-selbox" style={{ minHeight: 24 }}>{d.edge ? <div className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;1&gt;</div> : <span className="k-muted">Select a straight edge of the sheet in the graphics area.</span>}</div>
          <button className={`k-btn${profileEdit ? ' active' : ''}`} data-testid="hem-editwidth" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Edit Hem Width</button>
          {profileEdit && (
            <div className="k-pm-xyrow">
              <span className="k-pm-xy k-tip" data-tip="Offset from the start of the edge">⇤</span><NumberField value={d.startOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ startOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
              <span className="k-pm-xy k-tip" data-tip="Offset from the end of the edge">⇥</span><NumberField value={d.endOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ endOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
            </div>
          )}
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.position === 'materialInside' ? 'active' : ''}`} data-tip="Material Inside" onClick={() => st.updateFeatureDraft({ position: 'materialInside' })}><Icon.Sheet size={14} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.position === 'materialOutside' ? 'active' : ''}`} data-tip="Bend Outside" onClick={() => st.updateFeatureDraft({ position: 'materialOutside' })}><Icon.Sheet size={14} /></button>
          </div>
        </Section>
        <Section title="Type and Size">
          <div className="k-pm-stylerow">
            {([['closed', 'Closed'], ['open', 'Open'], ['tearDrop', 'Tear Drop'], ['rolled', 'Rolled']] as const).map(([v, tip]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${d.hemType === v ? 'active' : ''}`} data-tip={tip} disabled={v === 'tearDrop' || v === 'rolled'} onClick={() => st.updateFeatureDraft({ hemType: v })}><Icon.Arc size={14} /></button>
            ))}
          </div>
          <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          {d.hemType === 'open' && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>Gap</span><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} /></div>}
        </Section>
        <Section title="Miter Gap" defaultOpen={(d.miterGap ?? 0) > 0}>
          <div className="k-pm-valuerow k-tip" data-tip="Gap distance"><Icon.Dimension size={14} /><NumberField value={d.miterGap ?? 0.1} onChange={(v) => st.updateFeatureDraft({ miterGap: Math.max(0, v) })} unit={st.doc.units} step={0.1} /></div>
        </Section>
        <Section title="Custom Bend Allowance" defaultOpen={!!d.customAllowance} check={!!d.customAllowance} onCheck={(on) => st.updateFeatureDraft({ customAllowance: on ? { type: 'kFactor', value: sm.kFactor } : undefined })}>
          {d.customAllowance && (
            <>
              <select className="k-input" value={d.customAllowance.type} onChange={(e) => st.updateFeatureDraft({ customAllowance: { type: e.target.value as 'kFactor', value: e.target.value === 'kFactor' ? sm.kFactor : e.target.value === 'bendTable' ? 0 : 5 } })}>
                <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option><option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
              </select>
              {d.customAllowance.type !== 'bendTable' && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>{d.customAllowance.type === 'kFactor' ? 'K' : d.customAllowance.type === 'bendAllowance' ? 'BA' : 'BD'}</span><NumberField value={d.customAllowance.value} onChange={(v) => st.updateFeatureDraft({ customAllowance: { ...d.customAllowance!, value: Math.max(0, d.customAllowance!.type === 'kFactor' ? Math.min(1, v) : v) } })} step={d.customAllowance.type === 'kFactor' ? 0.05 : 0.1} /></div>}
            </>
          )}
        </Section>
        <Section title="Custom Relief Type" defaultOpen={!!d.customRelief} check={!!d.customRelief} onCheck={(on) => st.updateFeatureDraft({ customRelief: on ? { type: 'rectangle', ratio: 0.5 } : undefined })}>
          {d.customRelief && (
            <>
              <select className="k-input" value={d.customRelief.type} onChange={(e) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, type: e.target.value as 'rectangle' } })}><option value="rectangle">Rectangle</option><option value="tear">Tear</option><option value="obround">Obround</option></select>
              <div className="k-pm-valuerow k-tip" data-tip="Relief ratio"><span className="k-muted" style={{ minWidth: 18 }}>%</span><NumberField value={d.customRelief.ratio} onChange={(v) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, ratio: Math.max(0.05, Math.min(2, v)) } })} step={0.05} /></div>
            </>
          )}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}

export function edgeFlangePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, profileEdit, setProfileEdit } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'edgeFlange') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const useDefault = d.radius === undefined;
    return (
      <>
        <Header title={d.name} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Flange Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }}>{d.edge ? <div className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;1&gt;</div> : <span className="k-muted">Select a straight edge of the sheet in the graphics area.</span>}</div>
          <button className={`k-btn${profileEdit ? ' active' : ''}`} data-testid="flange-editprofile" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Edit Flange Profile</button>
          {profileEdit && (
            <div className="k-pm-xyrow" data-testid="flange-profile">
              <span className="k-pm-xy k-tip" data-tip="Offset from the start of the edge">⇤</span><NumberField value={d.startOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ startOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
              <span className="k-pm-xy k-tip" data-tip="Offset from the end of the edge">⇥</span><NumberField value={d.endOffset ?? 0} onChange={(v) => st.updateFeatureDraft({ endOffset: Math.max(0, v) })} unit={st.doc.units} step={1} />
            </div>
          )}
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={useDefault} onChange={(e) => st.updateFeatureDraft({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow">
            <Icon.Arc size={14} />
            <NumberField value={d.radius ?? sm.bendRadius} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} disabled={useDefault} />
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Gap distance">
            <Icon.Dimension size={14} />
            <NumberField value={d.gap ?? 0} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} />
          </div>
        </Section>
        <Section title="Angle">
          <div className="k-pm-valuerow">
            <Icon.MateAngle size={14} />
            <NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(179, v)) })} unit="°" step={5} min={1} />
          </div>
          <div className={`k-selbox${st.flangePick === 'face' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} data-testid="flange-angleface" onClick={() => useStore.setState({ flangePick: st.flangePick === 'face' ? null : 'face' })}>{d.angleFace ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.angleFace.label} <button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ angleFace: undefined }); }}>×</button></div> : <span className="k-muted">Face (optional)</span>}</div>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="flangeang" disabled={!d.angleFace} checked={d.angleFace?.mode === 'perpendicular'} onChange={() => d.angleFace && st.updateFeatureDraft({ angleFace: { ...d.angleFace, mode: 'perpendicular' } })} /> Perpendicular to face</label>
            <label className="k-check"><input type="radio" name="flangeang" disabled={!d.angleFace} checked={d.angleFace?.mode === 'parallel'} onChange={() => d.angleFace && st.updateFeatureDraft({ angleFace: { ...d.angleFace, mode: 'parallel' } })} /> Parallel to face</label>
          </div>
        </Section>
        <Section title="Flange Length">
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>
            <select className="k-input" data-testid="flange-lengthend" value={d.lengthEnd ?? 'blind'} onChange={(e) => { st.updateFeatureDraft({ lengthEnd: e.target.value as 'blind' }); useStore.setState({ flangePick: e.target.value === 'upToVertex' ? 'vertex' : null }); }}><option value="blind">Blind</option><option value="upToVertex">Up To Vertex</option></select>
          </div>
          {(d.lengthEnd ?? 'blind') === 'blind'
            ? <div className="k-pm-valuerow">
                <Icon.Dimension size={14} />
                <NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus />
              </div>
            : <div className={`k-selbox${st.flangePick === 'vertex' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} onClick={() => useStore.setState({ flangePick: 'vertex' })}>{d.vertex ? <div className="k-selbox-row">{d.vertex.label}</div> : <span className="k-muted">Click a corner of the model.</span>}</div>}
          <div className="k-pm-stylerow">
            {([['outerSharp', 'Outer Virtual Sharp'], ['innerSharp', 'Inner Virtual Sharp'], ['tangentBend', 'Tangent Bend']] as const).map(([v, tip]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${d.lengthMode === v ? 'active' : ''}`} data-tip={tip} onClick={() => st.updateFeatureDraft({ lengthMode: v })}><Icon.Chamfer size={14} /></button>
            ))}
          </div>
        </Section>
        <Section title="Flange Position">
          <div className="k-pm-stylerow">
            {([['materialInside', 'Material Inside'], ['materialOutside', 'Material Outside'], ['bendOutside', 'Bend Outside']] as const).map(([v, tip]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${d.position === v ? 'active' : ''}`} data-tip={tip} onClick={() => st.updateFeatureDraft({ position: v })}><Icon.Sheet size={14} /></button>
            ))}
          </div>
          <label className="k-check"><input type="checkbox" data-testid="flange-trimside" checked={!!d.trimSideBends} onChange={(e) => st.updateFeatureDraft({ trimSideBends: e.target.checked })} /> Trim side bends</label>
          <label className="k-check"><input type="checkbox" data-testid="flange-offset" checked={(d.offset ?? 0) > 0} onChange={(e) => st.updateFeatureDraft({ offset: e.target.checked ? sm.thickness : 0 })} /> Offset</label>
          {(d.offset ?? 0) > 0 && <div className="k-pm-valuerow k-tip" data-tip="Offset distance"><Icon.Dimension size={14} /><NumberField value={d.offset ?? 0} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={0.5} /></div>}
        </Section>
        <Section title="Custom Bend Allowance" defaultOpen={!!d.customAllowance} check={!!d.customAllowance} onCheck={(on) => st.updateFeatureDraft({ customAllowance: on ? { type: 'kFactor', value: sm.kFactor } : undefined })}>
          {d.customAllowance && (
            <>
              <select className="k-input" value={d.customAllowance.type} onChange={(e) => st.updateFeatureDraft({ customAllowance: { type: e.target.value as 'kFactor', value: e.target.value === 'kFactor' ? sm.kFactor : e.target.value === 'bendTable' ? 0 : 5 } })}>
                <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option><option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
              </select>
              {d.customAllowance.type !== 'bendTable' && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>{d.customAllowance.type === 'kFactor' ? 'K' : d.customAllowance.type === 'bendAllowance' ? 'BA' : 'BD'}</span><NumberField value={d.customAllowance.value} onChange={(v) => st.updateFeatureDraft({ customAllowance: { ...d.customAllowance!, value: Math.max(0, d.customAllowance!.type === 'kFactor' ? Math.min(1, v) : v) } })} step={d.customAllowance.type === 'kFactor' ? 0.05 : 0.1} /></div>}
            </>
          )}
        </Section>
        <Section title="Custom Relief Type" defaultOpen={!!d.customRelief} check={!!d.customRelief} onCheck={(on) => st.updateFeatureDraft({ customRelief: on ? { type: 'rectangle', ratio: 0.5 } : undefined })}>
          {d.customRelief && (
            <>
              <select className="k-input" value={d.customRelief.type} onChange={(e) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, type: e.target.value as 'rectangle' } })}><option value="rectangle">Rectangle</option><option value="tear">Tear</option><option value="obround">Obround</option></select>
              <div className="k-pm-valuerow k-tip" data-tip="Relief ratio"><span className="k-muted" style={{ minWidth: 18 }}>%</span><NumberField value={d.customRelief.ratio} onChange={(v) => st.updateFeatureDraft({ customRelief: { ...d.customRelief!, ratio: Math.max(0.05, Math.min(2, v)) } })} step={0.05} /></div>
            </>
          )}
        </Section>
        {err && (
          <Section title="Rebuild Errors">
            <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
          </Section>
        )}
      </>
    );
  }
  return NEXT;
}
