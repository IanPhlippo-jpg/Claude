/** Property Panels: Sheet Metal ▸ Jog (split from sheetMetalPMs.tsx): Selections, Jog Offset, Jog Position, Jog Angle, Custom Bend Allowance as SW 2025. */
import { type ReactNode } from 'react';
import { useStore } from '../../store';
import { NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { DEFAULT_SHEET_METAL } from '../../../core/features/sheetmetal';
import { Header } from './shared';
import { NEXT, type PMContext } from './context';

export function jogPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'jog') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sm = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
    const sketches = st.doc.features.filter((f): f is import('../../../core/document/types').SketchFeature => f.type === 'sketch');
    const ca = d.customAllowance, end = d.offsetEnd ?? 'blind';
    // as the core (jogOnBody): gauge table on unless the jog has its own radius; the angle of old files counts as overridden
    const gaugeOn = !!sm.gauge && (d.useGauge ?? d.radius === undefined);
    const angleOn = !sm.gauge || (d.overrideAngle ?? (d.jogAngle !== undefined && d.jogAngle !== 90));
    const radiusOff = gaugeOn || d.radius === undefined, upd = st.updateFeatureDraft;
    const box = (p: 'fixedFace' | 'vertex' | 'surface') => `k-selbox${st.flangePick === p ? ' k-selbox-dir' : ''}`;
    const pick = (p: 'fixedFace' | 'vertex' | 'surface') => () => useStore.setState({ flangePick: p });
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
          {/* Fixed Face: a click on the face on the side of the line that stays (old files: flipSide) */}
          <div className={box('fixedFace')} style={{ minHeight: 24 }} data-testid="jog-fixedface" onClick={pick('fixedFace')}>
            {d.fixedFace
              ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.fixedFace.label}</div>
              : <span className="k-muted">{d.flipSide ? 'Fixed: the other side of the line. ' : ''}Select the fixed face.</span>}
          </div>
          {/* Use gauge table (a part with a gauge table) and Use default radius grey the radius out, as SW */}
          {!!sm.gauge && <label className="k-check">
            <input type="checkbox" data-testid="jog-usegauge" checked={gaugeOn} onChange={(e) => upd({ useGauge: e.target.checked })} /> Use gauge table</label>}
          <label className="k-check" style={gaugeOn ? { opacity: 0.5 } : undefined}>
            <input type="checkbox" data-testid="jog-defaultradius" disabled={gaugeOn} checked={d.radius === undefined}
              onChange={(e) => upd({ radius: e.target.checked ? undefined : sm.bendRadius })} /> Use default radius</label>
          <div className="k-pm-valuerow" data-testid="jog-radius"><Icon.Arc size={14} />
            <NumberField value={radiusOff ? sm.bendRadius : d.radius!} disabled={radiusOff} onChange={(v) => upd({ radius: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
        </Section>
        <Section title="Jog Offset">
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => upd({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
            <select className="k-input" data-testid="jog-end" value={end}
              onChange={(e) => { const v = e.target.value; upd({ offsetEnd: v as 'blind' }); useStore.setState({ flangePick: v === 'upToVertex' ? 'vertex' : v === 'blind' ? null : 'surface' }); }}>
              <option value="blind">Blind</option><option value="upToVertex">Up To Vertex</option>
              <option value="upToSurface">Up To Surface</option><option value="offsetFromSurface">Offset From Surface</option>
            </select>
          </div>
          {end === 'blind' && <div className="k-pm-valuerow"><Icon.Dimension size={14} />
            <NumberField value={d.offset} onChange={(v) => upd({ offset: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>}
          {end === 'upToVertex' && <div className={box('vertex')} style={{ minHeight: 24 }} onClick={pick('vertex')}>
            {d.vertex ? <div className="k-selbox-row">{d.vertex.label}</div> : <span className="k-muted">Click a corner of the model.</span>}</div>}
          {(end === 'upToSurface' || end === 'offsetFromSurface') && <div className={box('surface')} style={{ minHeight: 24 }} data-testid="jog-surface" onClick={pick('surface')}>
            {d.surface ? <div className="k-selbox-row"><Icon.Sheet size={12} /> {d.surface.label}</div> : <span className="k-muted">Select a face parallel to the sheet.</span>}</div>}
          {end === 'offsetFromSurface' && <>
            <div className="k-pm-valuerow k-tip" data-tip="Offset Distance"><Icon.Dimension size={14} />
              <NumberField value={d.surfaceOffset ?? 0} onChange={(v) => upd({ surfaceOffset: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} /></div>
            <label className="k-check">
              <input type="checkbox" data-testid="jog-reverseoffset" checked={!!d.reverseOffset} onChange={(e) => upd({ reverseOffset: e.target.checked })} /> Reverse offset</label>
          </>}
          <div className="k-pm-radios">
            {([['outside', 'Outside Offset'], ['inside', 'Inside Offset'], ['overall', 'Overall Dimension']] as const).map(([v, label]) => (
              <label key={v} className="k-check">
                <input type="radio" name="jogoff" data-testid={`jog-${v}`} checked={(d.offsetType ?? 'outside') === v} onChange={() => upd({ offsetType: v })} /> {label}</label>
            ))}
          </div>
          <label className="k-check">
            <input type="checkbox" data-testid="jog-fixprojected" checked={d.fixProjected !== false} onChange={(e) => upd({ fixProjected: e.target.checked })} /> Fix projected length</label>
        </Section>
        <Section title="Jog Position">
          <div className="k-pm-stylerow">
            {([['centerline', 'Bend Centerline', '|'], ['materialInside', 'Material Inside', '⌐'], ['materialOutside', 'Material Outside', '¬'],
              ['bendOutside', 'Bend Outside', '⊓']] as const).map(([v, tip, g]) => (
              <button key={v} className={`k-pm-stylebtn k-tip ${(d.position ?? 'centerline') === v ? 'active' : ''}`} data-tip={tip} data-testid={`pos-${v}`}
                onClick={() => upd({ position: v })}>{g}</button>
            ))}
          </div>
        </Section>
        <Section title="Jog Angle">
          {/* a part with a gauge table: the 90 degree preset, Override value lets the angle be set */}
          {!!sm.gauge && <label className="k-check">
            <input type="checkbox" data-testid="jog-overrideangle" checked={angleOn} onChange={(e) => upd({ overrideAngle: e.target.checked })} /> Override value</label>}
          <div className="k-pm-valuerow" data-testid="jog-angle"><Icon.MateAngle size={14} />
            <NumberField value={angleOn ? d.jogAngle ?? 90 : 90} disabled={!angleOn} onChange={(v) => upd({ jogAngle: Math.max(10, Math.min(90, v)) })} unit="°" step={5} /></div>
        </Section>
        <Section title="Custom Bend Allowance" defaultOpen={!!ca} check={!!ca}
          onCheck={(on) => st.updateFeatureDraft({ customAllowance: on ? { type: 'kFactor', value: sm.kFactor } : undefined })}>
          {ca && (
            <>
              <select className="k-input" value={ca.type}
                onChange={(e) => {
                  const ty = e.target.value as 'kFactor';
                  st.updateFeatureDraft({ customAllowance: { type: ty, value: ty === 'kFactor' ? sm.kFactor : ty === 'bendTable' ? 0 : 5 } });
                }}>
                <option value="bendTable">Bend Table</option><option value="kFactor">K-Factor</option>
                <option value="bendAllowance">Bend Allowance</option><option value="bendDeduction">Bend Deduction</option>
              </select>
              {ca.type !== 'bendTable' && <div className="k-pm-valuerow">
                <span className="k-muted" style={{ minWidth: 18 }}>{ca.type === 'kFactor' ? 'K' : ca.type === 'bendAllowance' ? 'BA' : 'BD'}</span>
                <NumberField value={ca.value} onChange={(v) => st.updateFeatureDraft({ customAllowance: { ...ca, value: Math.max(0, ca.type === 'kFactor' ? Math.min(1, v) : v) } })}
                  step={ca.type === 'kFactor' ? 0.05 : 0.1} /></div>}
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
