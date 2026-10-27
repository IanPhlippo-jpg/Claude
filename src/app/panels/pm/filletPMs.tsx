/** Property Panels: filletPMs (split from PropertyPanel.tsx, QA F103). */
import { type ReactNode } from 'react';
import { useStore } from '../../store';
import { NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { Header, fieldEquation } from './shared';
import { NEXT, type PMContext } from './context';

export function filletPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  // solid feature being created / edited: Boss-Extrude, Cut-Extrude, Revolve, Cut-Revolve
  if (st.featureEdit && (st.featureEdit.draft.type === 'fillet' || st.featureEdit.draft.type === 'chamfer') && st.featureEdit.draft.breakCorner) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Break Corner" icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Break Corner Options">
          <div className="k-selbox" style={{ minHeight: 40 }} data-testid="bcorner-edges">
            {d.edges.length ? d.edges.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Line size={12} /> Edge&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select corner edges or flange faces.</span>}
          </div>
          <button className="k-btn" style={{ marginTop: 4 }} data-testid="collect-corners" onClick={st.collectAllCorners}>Collect all corners</button>
          <div className="k-field" style={{ marginTop: 6 }}><label>Break type</label></div>
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.type === 'chamfer' ? 'active' : ''}`} data-tip="Chamfer" data-testid="bcorner-chamfer" onClick={() => st.updateFeatureDraft({ type: 'chamfer' } as never)}><Icon.Chamfer size={14} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.type === 'fillet' ? 'active' : ''}`} data-tip="Fillet" data-testid="bcorner-fillet" onClick={() => st.updateFeatureDraft({ type: 'fillet' } as never)}><Icon.Arc size={14} /></button>
          </div>
          <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField equation={fieldEquation(st, 'size')} value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          <label className="k-check"><input type="checkbox" data-testid="bcorner-internal" checked={!!d.internalOnly} onChange={(e) => st.updateFeatureDraft({ internalOnly: e.target.checked })} /> Internal corners only</label>
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

export function filletPM2(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, filletXpert, setFilletXpert } = ctx;
  if (st.featureEdit && (st.featureEdit.draft.type === 'fillet' || st.featureEdit.draft.type === 'chamfer')) {
    const d = st.featureEdit.draft as import('../../../core/document/types').RoundFeature;
    const isFillet = d.type === 'fillet';
    const xpert = filletXpert, setXpert = setFilletXpert;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title={isFillet ? 'Fillet' : 'Chamfer'} icon={isFillet ? <Icon.FilletConstant size={18} /> : <Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {isFillet && (
          <>
            <div className="k-pm-segment">
              <button className={xpert ? '' : 'active'} onClick={() => setXpert(false)}>Manual</button>
              <button className={xpert ? 'active' : ''} data-testid="fillet-xpert" onClick={() => setXpert(true)}>FilletXpert</button>
            </div>
            {xpert ? (
              <Section title="Items To Fillet">
                <p className="k-pm-message">FilletXpert: select edges, set the radius and press Apply. The fillet is added and the Property Panel stays open for the next set.</p>
                <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField equation={fieldEquation(st, 'size')} value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
                <button className="k-btn" data-testid="fillet-xpert-apply" disabled={!d.edges.length} onClick={() => { const size = d.size; st.commitFeature(); st.startRound('fillet'); st.updateFeatureDraft({ size }); }}>Apply</button>
              </Section>
            ) : (
            <Section title="Fillet Type">
              <div className="k-pm-typerow">
                {([['constant', 'Constant Size Fillet', Icon.FilletConstant], ['variable', 'Variable Size Fillet', Icon.FilletVariable], ['face', 'Face Fillet', Icon.FilletFace], ['fullRound', 'Full Round Fillet', Icon.FilletFullRound]] as const).map(([k, t, I]) => (
                  <button key={k} className={`k-pm-typebtn k-tip${(d.roundType ?? 'constant') === k ? ' active' : ''}`} data-tip={t} data-testid={`fillet-type-${k}`} onClick={() => st.updateFeatureDraft({ roundType: k, ...(k === 'variable' && !d.variable ? { variable: { start: d.size, end: d.size * 2 } } : {}), ...(k === 'face' || k === 'fullRound' ? { edges: [] } : {}) })}><I size={26} /></button>
                ))}
              </div>
            </Section>
            )}
          </>
        )}
        {!isFillet && (
          <Section title="Chamfer Type">
            {/* Angle Distance, Distance Distance, Vertex, Offset Face, Face Face, by design */}
            <div className="k-pm-typegrid">
              <button className={`k-pm-typebtn${d.roundType === 'angleDistance' ? ' active' : ''}`} title="Angle-Distance" data-testid="chamfer-angle" onClick={() => st.updateFeatureDraft({ roundType: 'angleDistance', angle: d.angle ?? 45 })}><Icon.Chamfer size={22} /></button>
              <button className={`k-pm-typebtn${!d.roundType || d.roundType === 'constant' ? ' active' : ''}`} title="Distance-Distance" data-testid="chamfer-dd" onClick={() => st.updateFeatureDraft({ roundType: undefined })}><Icon.Chamfer size={22} /></button>
              <button className={`k-pm-typebtn${d.roundType === 'vertex' ? ' active' : ''}`} title="Vertex" data-testid="chamfer-vertex" onClick={() => st.updateFeatureDraft({ roundType: 'vertex', edges: [] })}><Icon.ChamferVertex size={22} /></button>
              <button className={`k-pm-typebtn${d.roundType === 'offsetFace' ? ' active' : ''}`} title="Offset Face" data-testid="chamfer-offsetface" onClick={() => st.updateFeatureDraft({ roundType: 'offsetFace', edges: [] })}><Icon.ChamferFace size={22} /></button>
              <button className={`k-pm-typebtn${d.roundType === 'faceFace' ? ' active' : ''}`} title="Face Face" data-testid="chamfer-faceface" onClick={() => st.updateFeatureDraft({ roundType: 'faceFace', edges: [] })}><Icon.ChamferFace size={22} /></button>
            </div>
          </Section>
        )}
        {!isFillet && d.roundType === 'vertex' && (
          <Section title="Items To Chamfer">
            <div className="k-pm-selrow"><Icon.Point size={16} /><div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} data-testid="chamfer-vertex-box">{d.vertex ? <div className="k-selbox-row"><Icon.Point size={12} /> {d.vertex.label}</div> : <span className="k-muted">Select a vertex (a corner of three edges) in the graphics area.</span>}</div></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D1</span><NumberField equation={fieldEquation(st, 'size')} value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D2</span><NumberField value={d.equalDistance === false ? d.size2 ?? d.size : d.size} onChange={(v) => st.updateFeatureDraft({ size2: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} disabled={d.equalDistance !== false} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D3</span><NumberField value={d.equalDistance === false ? d.size3 ?? d.size : d.size} onChange={(v) => st.updateFeatureDraft({ size3: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} disabled={d.equalDistance !== false} /></div>
            <label className="k-check"><input type="checkbox" data-testid="chamfer-equal" checked={d.equalDistance !== false} onChange={(e) => st.updateFeatureDraft({ equalDistance: e.target.checked ? undefined : false, size2: d.size2 ?? d.size, size3: d.size3 ?? d.size })} /> Equal distance</label>
          </Section>
        )}
        {!isFillet && (d.roundType === 'offsetFace' || d.roundType === 'faceFace') && (
          <Section title="Items To Chamfer">
            <div className="k-pm-selrow" title="Face Set 1"><span className="k-pm-tag" style={{ background: '#5aa0e6' }} /><div className="k-selbox" style={{ minHeight: 22 }} data-testid="chamfer-face1">{st.selectedFaces[0] ? <div className="k-selbox-row">Face&lt;1&gt;</div> : <span className="k-muted">Face Set 1</span>}</div></div>
            <div className="k-pm-selrow" title="Face Set 2"><span className="k-pm-tag" style={{ background: '#c06ad0' }} /><div className="k-selbox" style={{ minHeight: 22 }} data-testid="chamfer-face2">{st.selectedFaces[1] ? <div className="k-selbox-row">Face&lt;2&gt;</div> : <span className="k-muted">Face Set 2</span>}</div></div>
            <p className="k-muted" style={{ margin: '4px 0 0' }}>{d.roundType === 'offsetFace' ? 'The chamfer is set off from each face by its distance.' : 'The chamfer runs between the two faces along their common edge.'}{d.edges.length ? ` ${d.edges.length} edge(s) found.` : ''}</p>
          </Section>
        )}
        {(d.roundType === 'face' || d.roundType === 'fullRound') && (
          <Section title={d.roundType === 'face' ? 'Items To Fillet' : 'Items To Fillet'}>
            {d.roundType === 'face' ? (
              <>
                <div className="k-pm-selrow" title="Face Set 1"><span className="k-pm-tag" style={{ background: '#5aa0e6' }} /><div className="k-selbox" style={{ minHeight: 22 }}>{st.selectedFaces[0] ? <div className="k-selbox-row">Face&lt;1&gt;</div> : <span className="k-muted">Face Set 1</span>}</div></div>
                <div className="k-pm-selrow" title="Face Set 2"><span className="k-pm-tag" style={{ background: '#c06ad0' }} /><div className="k-selbox" style={{ minHeight: 22 }}>{st.selectedFaces[1] ? <div className="k-selbox-row">Face&lt;2&gt;</div> : <span className="k-muted">Face Set 2</span>}</div></div>
              </>
            ) : (
              <>
                {/* Full Round: Side Face Set 1 (blue), Center Face Set (purple), Side Face Set 2 (pink), by design */}
                {([['side1', 'Side Face Set 1', '#5aa0e6'], ['center', 'Center Face Set', '#c06ad0'], ['side2', 'Side Face Set 2', '#e98fc0']] as const).map(([k, label, color]) => (
                  <div key={k} className={`k-pm-selrow${st.fullRoundPick === k ? ' active' : ''}`} title={label} onClick={() => useStore.setState({ fullRoundPick: k })}>
                    <span className="k-pm-tag" style={{ background: color }} />
                    <div className={`k-selbox${st.fullRoundPick === k ? ' k-selbox-dir' : ''}`} style={{ minHeight: 22 }} data-testid={'fullround-' + k}>{d.fullRound?.[k] ? <div className="k-selbox-row">{d.fullRound[k]!.label}</div> : <span className="k-muted">{label}</span>}</div>
                  </div>
                ))}
              </>
            )}
            <label className="k-check"><input type="checkbox" checked={d.tangentPropagation !== false} onChange={(e) => st.updateFeatureDraft({ tangentPropagation: e.target.checked })} /> Tangent propagation</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="frpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => st.updateFeatureDraft({ previewMode: 'full' })} /> Full preview</label>
              <label className="k-check"><input type="radio" name="frpreview" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
              <label className="k-check"><input type="radio" name="frpreview" checked={d.previewMode === 'none'} onChange={() => st.updateFeatureDraft({ previewMode: 'none' })} /> No preview</label>
            </div>
          </Section>
        )}
        {(isFillet || !['vertex', 'offsetFace', 'faceFace'].includes(d.roundType ?? '')) && <Section title={isFillet ? 'Items To Fillet' : 'Items To Chamfer'}>
          {/* the selection box of the intended design: its picture on the left, light blue while it takes the picks, the last pick highlighted */}
          <div className="k-pm-selrow">
            <Icon.EdgeSelect size={20} />
            <ul className="k-list k-pm-edgelist k-pm-selbox active" data-testid="round-items" title="Select edges on the model (Ctrl for more than one)">
              {d.edges.map((e, i) => (
                <li key={i} className={i === d.edges.length - 1 ? 'sel' : ''}>Edge&lt;{i + 1}&gt;{e.closed ? ' (circular)' : e.straight ? '' : ' (curved)'}</li>
              ))}
            </ul>
          </div>
          <label className="k-check"><input type="checkbox" data-testid="show-seltoolbar" checked={st.selectionToolbar} onChange={(e) => useStore.setState({ selectionToolbar: e.target.checked })} /> Show selection toolbar</label>
          <label className="k-check"><input type="checkbox" data-testid="fillet-tangent" checked={d.tangentPropagation !== false} onChange={(e) => st.updateFeatureDraft({ tangentPropagation: e.target.checked })} /> Tangent propagation</label>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="fpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => st.updateFeatureDraft({ previewMode: 'full' })} /> Full preview</label>
            <label className="k-check"><input type="radio" name="fpreview" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
            <label className="k-check"><input type="radio" name="fpreview" data-testid="fillet-nopreview" checked={d.previewMode === 'none'} onChange={() => st.updateFeatureDraft({ previewMode: 'none' })} /> No preview</label>
          </div>
        </Section>}
        <Section title={isFillet ? 'Fillet Parameters' : 'Chamfer Parameters'}>
          {isFillet && d.roundType === 'face' && (
            // Face Fillet ▸ Fillet Method: Symmetric (a radius) or Hold line (the fillet runs up to an edge)
            <>
              <select className="k-input" data-testid="fillet-method" value={d.holdLineMode ? 'hold' : 'radius'} onChange={(e) => st.updateFeatureDraft({ holdLineMode: e.target.value === 'hold', ...(e.target.value === 'hold' ? {} : { holdLine: undefined }) })} style={{ marginBottom: 4 }}>
                <option value="radius">Symmetric</option>
                <option value="hold">Hold line</option>
              </select>
              {d.holdLineMode && (
                <div className="k-selbox k-selbox-dir" style={{ minHeight: 22, marginBottom: 4 }} data-testid="fillet-holdline">{d.holdLine ? <div className="k-selbox-row"><Icon.Line size={12} /> Hold line: Edge&lt;1&gt;</div> : <span className="k-muted">Select the hold line edge.</span>}</div>
              )}
            </>
          )}
          {isFillet && <select className="k-input" data-testid="fillet-sym" value={d.size2 ? 'asymmetric' : 'symmetric'} onChange={(e) => st.updateFeatureDraft({ size2: e.target.value === 'asymmetric' ? d.size * 1.5 : undefined })} style={{ marginBottom: 4 }}><option value="symmetric">Symmetric</option><option value="asymmetric">Asymmetric</option></select>}
          {d.roundType === 'variable' && isFillet ? (
            <>
              <div className="k-pm-sub">Variable radius parameters</div>
              <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>Start</span><NumberField value={d.variable?.start ?? d.size} onChange={(v) => st.updateFeatureDraft({ variable: { start: Math.max(0.01, v), end: d.variable?.end ?? d.size } })} unit={st.doc.units} step={1} min={0.01} /></div>
              <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>End</span><NumberField value={d.variable?.end ?? d.size} onChange={(v) => st.updateFeatureDraft({ variable: { start: d.variable?.start ?? d.size, end: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} /></div>
            </>
          ) : (
            <div className="k-pm-valuerow">
              <Icon.Dimension size={14} />
              <NumberField equation={fieldEquation(st, 'size')} value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
            </div>
          )}
          {d.roundType === 'angleDistance' && !isFillet && <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle ?? 45} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(89, v)) })} unit="°" step={5} /></div>}
          {(d.size2 !== undefined && (isFillet || d.roundType !== 'angleDistance')) && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>D2</span><NumberField value={d.size2} onChange={(v) => st.updateFeatureDraft({ size2: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>}
          {isFillet ? (
            <>
              <label className="k-check"><input type="checkbox" data-testid="fillet-multi" checked={!!d.radii} onChange={(e) => st.updateFeatureDraft({ radii: e.target.checked ? d.edges.map(() => d.size) : undefined })} /> Multi Radius Fillet</label>
              {d.radii && d.edges.map((_, i) => <div key={i} className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 52 }}>Edge&lt;{i + 1}&gt;</span><NumberField value={d.radii![i] ?? d.size} onChange={(v) => { const r = d.edges.map((__, j) => d.radii![j] ?? d.size); r[i] = Math.max(0.01, v); st.updateFeatureDraft({ radii: r }); }} unit={st.doc.units} step={1} min={0.01} /></div>)}
            </>
          ) : d.roundType !== 'angleDistance' && <label className="k-check"><input type="checkbox" checked={d.size2 === undefined} onChange={(e) => st.updateFeatureDraft({ size2: e.target.checked ? undefined : d.size })} /> Equal distance</label>}
          {isFillet && <div className="k-field" style={{ marginTop: 4 }}><label>Profile:</label><select className="k-input" data-testid="fillet-profile" value={d.profile ?? 'circular'} onChange={(e) => st.updateFeatureDraft({ profile: e.target.value as 'circular', rho: d.rho ?? 0.5 })}><option value="circular">Circular</option><option value="conicRho">Conic Rho</option><option value="conicRadius">Conic Radius</option><option value="curvature">Curvature Continuous</option></select></div>}
          {isFillet && (d.profile === 'conicRho' || d.profile === 'conicRadius') && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 26 }}>ρ</span><NumberField value={d.rho ?? 0.5} onChange={(v) => st.updateFeatureDraft({ rho: Math.max(0.05, Math.min(0.95, v)) })} step={0.05} /></div>}
        </Section>
        {!isFillet && (
          <Section title="Chamfer Options" defaultOpen={false}>
            <label className="k-check"><input type="checkbox" checked={d.selectThroughFaces !== false} onChange={(e) => st.updateFeatureDraft({ selectThroughFaces: e.target.checked })} /> Select through faces</label>
            <label className="k-check"><input type="checkbox" data-testid="chamfer-keep" checked={d.keepFeatures !== false} onChange={(e) => st.updateFeatureDraft({ keepFeatures: e.target.checked })} /> Keep features</label>
            <label className="k-check"><input type="checkbox" checked={d.tangentPropagation !== false} onChange={(e) => st.updateFeatureDraft({ tangentPropagation: e.target.checked })} /> Tangent propagation</label>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="chpreview" checked={(d.previewMode ?? 'full') === 'full'} onChange={() => st.updateFeatureDraft({ previewMode: 'full' })} /> Full preview</label>
              <label className="k-check"><input type="radio" name="chpreview" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
              <label className="k-check"><input type="radio" name="chpreview" checked={d.previewMode === 'none'} onChange={() => st.updateFeatureDraft({ previewMode: 'none' })} /> No preview</label>
            </div>
          </Section>
        )}
        {isFillet && (
          <>
            <Section title="Partial Edge Parameters" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" data-testid="fillet-partial" checked={!!d.partial} onChange={(e) => st.updateFeatureDraft({ partial: e.target.checked ? { start: 0, end: 0.5 } : undefined })} /> Partial Edge Parameters</label>
              <div className="k-field"><label>Start condition:</label><select className="k-input" disabled={!d.partial}><option>Distance Offset</option></select></div>
              {d.partial && (
                <>
                  <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>Start</span><NumberField value={Math.round(d.partial.start * 100)} onChange={(v) => st.updateFeatureDraft({ partial: { ...d.partial!, start: Math.max(0, Math.min(100, v)) / 100 } })} unit="%" step={5} /></div>
                  <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 34 }}>End</span><NumberField value={Math.round(d.partial.end * 100)} onChange={(v) => st.updateFeatureDraft({ partial: { ...d.partial!, end: Math.max(0, Math.min(100, v)) / 100 } })} unit="%" step={5} /></div>
                </>
              )}
            </Section>
            <Section title="Setback Parameters" defaultOpen={(d.setback ?? 0) > 0}>
              <p className="k-muted" style={{ margin: '0 0 4px' }}>Corners where three filleted edges meet blend over the setback distance.</p>
              <div className="k-pm-valuerow k-tip" data-tip="Distance"><Icon.Dimension size={14} /><NumberField value={d.setback ?? 0} onChange={(v) => st.updateFeatureDraft({ setback: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} /></div>
            </Section>
            <Section title="Fillet Options" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" data-testid="fillet-through" checked={!!d.selectThroughFaces} onChange={(e) => st.updateFeatureDraft({ selectThroughFaces: e.target.checked })} /> Select through faces</label>
              <label className="k-check"><input type="checkbox" data-testid="fillet-keepfeatures" checked={d.keepFeatures !== false} onChange={(e) => st.updateFeatureDraft({ keepFeatures: e.target.checked })} /> Keep features</label>
              <label className="k-check"><input type="checkbox" data-testid="fillet-roundcorners" checked={!!d.roundCorners} onChange={(e) => st.updateFeatureDraft({ roundCorners: e.target.checked })} /> Round corners</label>
              <div className="k-field"><label>Overflow type:</label></div>
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="foverflow" checked={(d.overflow ?? 'default') === 'default'} onChange={() => st.updateFeatureDraft({ overflow: 'default' })} /> Default</label>
                <label className="k-check"><input type="radio" name="foverflow" data-testid="fillet-keepedge" checked={d.overflow === 'keepEdge'} onChange={() => st.updateFeatureDraft({ overflow: 'keepEdge' })} /> Keep edge</label>
                <label className="k-check"><input type="radio" name="foverflow" checked={d.overflow === 'keepSurface'} onChange={() => st.updateFeatureDraft({ overflow: 'keepSurface' })} /> Keep surface</label>
              </div>
            </Section>
          </>
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
