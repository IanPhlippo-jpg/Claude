/** Property Panels: surfacePMs (split from PropertyPanel.tsx, QA F103). */
import { type ReactNode } from 'react';
import { useStore } from '../../store';
import { NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { Header } from './shared';
import { NEXT, type PMContext } from './context';

export function surfacePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'surface') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f): f is import('../../../core/document/types').SketchFeature => f.type === 'sketch');
    const surfaceFeatures = st.doc.features.filter((f) => f.type === 'surface' && f.id !== d.id && f.kind !== 'knit');
    const sketchPick = (
      <div className="k-field"><label>Sketch</label>
        <select className="k-input" value={d.sketchId ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="surface-sketch">
          <option value="">—</option>
          {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
        </select>
      </div>
    );
    return (
      <>
        <Header title={d.name.replace(/\d+$/, '')} icon={d.kind === 'revolve' ? <Icon.Revolve /> : d.kind === 'offset' ? <Icon.Offset /> : d.kind === 'knit' ? <Icon.Mirror /> : d.kind === 'thicken' || d.kind === 'replaceFace' ? <Icon.Shell /> : d.kind === 'thickenCut' ? <Icon.Cut /> : d.kind === 'cutWithSurface' ? <Icon.Section /> : d.kind === 'filled' || d.kind === 'untrim' || d.kind === 'deleteHole' ? <Icon.Boundary /> : d.kind === 'ruled' ? <Icon.Curves /> : d.kind === 'flatten' ? <Icon.Sheet /> : <Icon.Extrude />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {d.kind === 'extrude' && (
          <>
            <Section title="From">{sketchPick}</Section>
            <Section title="Direction 1">
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
                <select className="k-input" value={d.midPlane ? 'mid' : 'blind'} onChange={(e) => st.updateFeatureDraft({ midPlane: e.target.value === 'mid' })}><option value="blind">Blind</option><option value="mid">Mid Plane</option></select>
              </div>
              <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.depth ?? 10} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
            </Section>
          </>
        )}
        {d.kind === 'revolve' && (
          <>
            <Section title="Axis of Revolution">{sketchPick}<div className="k-muted">The centerline of the sketch is the axis.</div></Section>
            <Section title="Direction1">
              <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle ?? 360} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(1, Math.min(360, v)) })} unit="°" step={15} /></div>
            </Section>
          </>
        )}
        {d.kind === 'planar' && <Section title="Bounding Entities">{sketchPick}</Section>}
        {(d.kind === 'filled' || d.kind === 'extend' || d.kind === 'untrim' || d.kind === 'deleteHole' || d.kind === 'flatten' || d.kind === 'thicken' || d.kind === 'thickenCut' || d.kind === 'cutWithSurface' || d.kind === 'replaceFace') && (
          <Section title={d.kind === 'filled' ? 'Patch Boundary' : d.kind === 'replaceFace' ? 'Replacement Surface' : d.kind === 'thicken' || d.kind === 'thickenCut' ? 'Thicken Parameters' : 'Selections'}>
            <div className="k-field"><label>{d.kind === 'filled' ? 'Surface' : d.kind === 'cutWithSurface' ? 'Surface Cut Parameters' : 'Surface'}</label>
              <select className="k-input" value={d.target ?? ''} onChange={(e) => st.updateFeatureDraft({ target: e.target.value || undefined })} data-testid="surftool-target">
                <option value="">—</option>
                {surfaceFeatures.filter((f) => f.type === 'surface').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {d.kind === 'filled' && (
              <>
                {sketchPick}
                <div className="k-pm-radios" data-testid="fill-which">
                  <label className="k-check"><input type="radio" name="fillwhich" checked={(d.fillWhich ?? 'outer') === 'outer'} onChange={() => st.updateFeatureDraft({ fillWhich: 'outer' })} /> Outer boundary</label>
                  <label className="k-check"><input type="radio" name="fillwhich" checked={d.fillWhich === 'inner'} onChange={() => st.updateFeatureDraft({ fillWhich: 'inner' })} /> Inner loops</label>
                  <label className="k-check"><input type="radio" name="fillwhich" checked={d.fillWhich === 'all'} onChange={() => st.updateFeatureDraft({ fillWhich: 'all' })} /> All boundaries</label>
                </div>
              </>
            )}
            {d.kind === 'extend' && <div className="k-pm-valuerow k-tip" data-tip="Distance"><Icon.Depth size={16} /><NumberField value={d.distance ?? 5} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>}
            {(d.kind === 'thicken' || d.kind === 'thickenCut') && <div className="k-pm-valuerow k-tip" data-tip="Thickness"><Icon.Shell size={16} /><NumberField value={d.thickness ?? 2} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} autoFocus data-testid="thicken-value" /></div>}
            {d.kind === 'thicken' && st.rebuild.bodies.length > 0 && <label className="k-check"><input type="checkbox" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>}
            {d.kind === 'cutWithSurface' && <button className={`k-pm-stylebtn k-tip ${d.flip ? 'active' : ''}`} data-tip="Flip cut" data-testid="surfcut-flip" onClick={() => st.updateFeatureDraft({ flip: !d.flip })}><Icon.ReverseDir size={16} /></button>}
            {d.kind === 'replaceFace' && (
              <div className="k-pm-selrow"><Icon.Properties size={14} /><div className="k-selbox k-selbox-dir" style={{ minHeight: 40 }} data-testid="replace-faces">{(d.faces ?? []).length ? (d.faces ?? []).map((f) => <div key={f.label} className="k-selbox-row">{f.label}</div>) : <span className="k-muted">Target faces for replacement: select faces in the graphics area.</span>}</div></div>
            )}
            {(d.kind === 'untrim' || d.kind === 'deleteHole') && <p className="k-muted">{d.kind === 'untrim' ? 'The inner loops (holes) of the surface are filled again.' : 'The hole (inner loop) of the surface is closed.'}</p>}
            {d.kind === 'flatten' && <p className="k-muted">The surface is laid flat (rigid unfold, exact for developable surfaces) beside the model.</p>}
          </Section>
        )}
        {(d.kind === 'thickenCut' || d.kind === 'cutWithSurface') && (
          <Section title="Feature Scope" defaultOpen={false}>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="sscope" checked={!d.scope} onChange={() => st.updateFeatureDraft({ scope: undefined })} /> All bodies</label>
              <label className="k-check"><input type="radio" name="sscope" checked={!!d.scope} onChange={() => st.updateFeatureDraft({ scope: st.rebuild.bodies.map((b) => b.id) })} /> Selected bodies</label>
            </div>
            {d.scope && st.rebuild.bodies.map((b, i) => <label key={b.id} className="k-check" style={{ marginLeft: 18 }}><input type="checkbox" checked={d.scope!.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ scope: e.target.checked ? [...d.scope!, b.id] : d.scope!.filter((x) => x !== b.id) })} /> Body{i + 1}</label>)}
          </Section>
        )}
        {d.kind === 'ruled' && (
          <>
            <Section title="Type">
              <div className="k-pm-radios" data-testid="ruled-type">
                <label className="k-check"><input type="radio" name="ruledmode" checked={(d.ruledMode ?? 'tangent') === 'tangent'} onChange={() => st.updateFeatureDraft({ ruledMode: 'tangent' })} /> Tangent to Surface</label>
                <label className="k-check"><input type="radio" name="ruledmode" checked={d.ruledMode === 'normal'} onChange={() => st.updateFeatureDraft({ ruledMode: 'normal' })} /> Normal to Surface</label>
                <label className="k-check"><input type="radio" name="ruledmode" checked={d.ruledMode === 'vector'} onChange={() => st.updateFeatureDraft({ ruledMode: 'vector' })} /> Vector</label>
              </div>
            </Section>
            <Section title="Distance/Direction">
              <div className="k-pm-valuerow k-tip" data-tip="Distance"><Icon.Depth size={16} /><NumberField value={d.distance ?? 5} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
              {d.ruledMode === 'vector' && (
                <div className="k-pm-stylerow">
                  {(['X', 'Y', 'Z'] as const).map((ax, i) => <button key={ax} className={`k-pm-stylebtn ${Math.abs((d.vector ?? [0, 1, 0])[i]) > 0.5 ? 'active' : ''}`} onClick={() => { const v: [number, number, number] = [0, 0, 0]; v[i] = 1; st.updateFeatureDraft({ vector: v }); }}>{ax}</button>)}
                  <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ vector: (d.vector ?? [0, 1, 0]).map((x) => -x) as [number, number, number] })}><Icon.ReverseDir size={16} /></button>
                </div>
              )}
            </Section>
            <Section title="Edge Selection">
              <div className="k-pm-selrow"><Icon.EdgeSelect size={20} /><div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} data-testid="ruled-edge">{d.edge ? <div className="k-selbox-row">Edge&lt;1&gt;</div> : <span className="k-muted">Select an edge of the model.</span>}</div></div>
            </Section>
          </>
        )}
        {d.kind === 'trim' && (
          <>
            <Section title="Trim Type">
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="trimtype" checked={!d.mutual} onChange={() => st.updateFeatureDraft({ mutual: false })} /> Standard</label>
                <label className="k-check"><input type="radio" name="trimtype" data-testid="trim-mutual" checked={!!d.mutual} onChange={() => st.updateFeatureDraft({ mutual: true })} /> Mutual</label>
              </div>
            </Section>
            {d.mutual && (
              <Section title="Selections">
                <div className="k-pm-label">Trimming surfaces:</div>
                <div className="k-selbox" style={{ minHeight: 60 }} data-testid="trim-mutual-surfaces">
                  {surfaceFeatures.filter((f) => f.type === 'surface' && f.kind !== 'trim' && f.kind !== 'knit').map((f) => (
                    <label key={f.id} className="k-check"><input type="checkbox" checked={(d.targets ?? []).includes(f.id)} onChange={(e) => st.updateFeatureDraft({ targets: e.target.checked ? [...(d.targets ?? []), f.id] : (d.targets ?? []).filter((x) => x !== f.id) })} /> {f.name}</label>
                  ))}
                </div>
                <div className="k-pm-radios">
                  <label className="k-check"><input type="radio" name="trimkeepm" checked={!d.flip} onChange={() => st.updateFeatureDraft({ flip: false })} /> Keep selections</label>
                  <label className="k-check"><input type="radio" name="trimkeepm" checked={!!d.flip} onChange={() => st.updateFeatureDraft({ flip: true })} /> Remove selections</label>
                </div>
              </Section>
            )}
            {!d.mutual && <Section title="Selections">
              <div className="k-field"><label>Trim Tool</label>
                <select className="k-input" value={d.trimPlane ?? 'front'} onChange={(e) => st.updateFeatureDraft({ trimPlane: e.target.value })} data-testid="trim-plane">
                  <option value="front">Front Plane</option><option value="top">Top Plane</option><option value="right">Right Plane</option>
                  {Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="k-field"><label>Surface</label>
                <select className="k-input" value={d.target ?? ''} onChange={(e) => st.updateFeatureDraft({ target: e.target.value })} data-testid="trim-target">
                  <option value="">—</option>
                  {surfaceFeatures.filter((f) => f.type === 'surface' && f.kind !== 'trim').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="trimkeep" checked={!d.flip} onChange={() => st.updateFeatureDraft({ flip: false })} /> Keep selections (side of the plane normal)</label>
                <label className="k-check"><input type="radio" name="trimkeep" checked={!!d.flip} onChange={() => st.updateFeatureDraft({ flip: true })} /> Remove selections (other side)</label>
              </div>
            </Section>}
          </>
        )}
        {(d.kind === 'sweep' || d.kind === 'loft' || d.kind === 'boundary') && (
          <Section title={d.kind === 'sweep' ? 'Profile and Path' : 'Profiles'}>
            {sketchPick}
            <div className="k-field"><label>{d.kind === 'sweep' ? 'Path' : 'Profile 2'}</label>
              <select className="k-input" value={d.sketchId2 ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId2: e.target.value })} data-testid="surface-sketch2">
                <option value="">—</option>
                {sketches.filter((s) => s.sketchId !== d.sketchId).map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
              </select>
            </div>
          </Section>
        )}
        {d.kind === 'offset' && (
          <Section title="Offset Parameters">
            <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
              <Icon.Properties size={14} />
              <div className="k-selbox k-selbox-dir" style={{ minHeight: 24 }} data-testid="offset-face">{d.face ? <div className="k-selbox-row">{d.face.label}</div> : null}</div>
            </div>
            <div className="k-pm-valuerow">
              <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Flip Offset Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Arrow size={14} /></button>
              <NumberField value={d.distance ?? 5} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus />
            </div>
          </Section>
        )}
        {d.kind === 'knit' && (
          <>
            <Section title="Selections">
              <div className="k-selbox" style={{ minHeight: 60 }} data-testid="knit-surfaces">
                {surfaceFeatures.map((f) => (
                  <label key={f.id} className="k-check"><input type="checkbox" checked={(d.surfaces ?? []).includes(f.id)} onChange={(e) => st.updateFeatureDraft({ surfaces: e.target.checked ? [...(d.surfaces ?? []), f.id] : (d.surfaces ?? []).filter((x) => x !== f.id) })} /> {f.name}</label>
                ))}
              </div>
              <label className="k-check"><input type="checkbox" checked={!!d.createSolid} onChange={(e) => st.updateFeatureDraft({ createSolid: e.target.checked })} /> Create solid</label>
              <label className="k-check"><input type="checkbox" data-testid="knit-merge" checked={d.mergeEntities !== false} onChange={(e) => st.updateFeatureDraft({ mergeEntities: e.target.checked })} /> Merge entities</label>
            </Section>
            <Section title="Edge Display" defaultOpen={false}>
              <label className="k-check"><input type="checkbox" data-testid="knit-openedges" checked={!!d.showOpenEdges} onChange={(e) => st.updateFeatureDraft({ showOpenEdges: e.target.checked })} /> Show open edges</label>
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

export function intersectPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'intersect') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id) ?? (st.rebuild.surfaceBodies ?? []).find((x) => x.id === id); return st.doc.features.find((f) => f.id === b?.featureIds[b.featureIds.length - 1])?.name ?? id; };
    const region = (k: 'common' | 'a' | 'b', label: string) => (
      <label key={k} className="k-check"><input type="checkbox" checked={d.exclude.includes(k)} onChange={(e) => st.updateFeatureDraft({ exclude: e.target.checked ? [...d.exclude, k] : d.exclude.filter((x) => x !== k) })} /> {label}</label>
    );
    return (
      <>
        <Header title={d.name} icon={<Icon.Interference />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Selections">
          <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
            <Icon.Part size={14} />
            <div className="k-selbox k-selbox-dir" style={{ minHeight: 40, flex: 1 }} data-testid="intersect-bodies">
              {d.bodies.map((id) => <div key={id} className="k-selbox-row">{bodyName(id)}</div>)}
            </div>
          </div>
          <div className="k-pm-label">Bodies:</div>
          {(st.rebuild.bodies.length > 2 || (st.rebuild.surfaceBodies ?? []).length > 0) && [...st.rebuild.bodies, ...(st.rebuild.surfaceBodies ?? [])].map((b) => (
            <label key={b.id} className="k-check"><input type="checkbox" checked={d.bodies.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...d.bodies, b.id].slice(-2) : d.bodies.filter((x) => x !== b.id) })} /> {bodyName(b.id)}</label>
          ))}
          <label className="k-check"><input type="radio" name="isect" checked={!d.capPlanar} onChange={() => st.updateFeatureDraft({ capPlanar: false })} /> Create internal regions</label>
          <label className="k-check"><input type="radio" name="isect" data-testid="isect-cap" checked={!!d.capPlanar} onChange={() => st.updateFeatureDraft({ capPlanar: true })} /> Cap planar openings</label>
        </Section>
        <Section title="Regions to Exclude">
          {region('common', 'Region 1 (in both bodies)')}
          {region('a', `Region 2 (only in ${bodyName(d.bodies[0] ?? '')})`)}
          {region('b', `Region 3 (only in ${bodyName(d.bodies[1] ?? '')})`)}
        </Section>
        <Section title="Options">
          <label className="k-check"><input type="checkbox" checked={d.merge} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>
          <label className="k-check"><input type="checkbox" checked={!!d.consumeSurfaces} onChange={(e) => st.updateFeatureDraft({ consumeSurfaces: e.target.checked })} /> Consume surfaces</label>
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

export function deleteFacePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  // Delete Face Property Panel: Selections (Faces to delete) and Options (Delete / Delete and Patch / Delete and Fill)
  if (st.featureEdit && st.featureEdit.draft.type === 'deleteFace') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Delete Face" icon={<Icon.Trash />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {err && <Section title="Rebuild Errors"><p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p></Section>}
        <Section title="Selections">
          <div className="k-selbox k-selbox-dir" style={{ minHeight: 60 }} data-testid="deleteface-faces">
            {d.faces.length ? d.faces.map((f) => <div key={f.label} className="k-selbox-row">{f.label}<button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={() => st.updateFeatureDraft({ faces: d.faces.filter((x) => x.label !== f.label) })}>×</button></div>) : <span className="k-muted">Faces to delete</span>}
          </div>
          <label className="k-check"><input type="checkbox" data-testid="deleteface-seltoolbar" checked={st.selectionToolbar} onChange={(e) => useStore.setState({ selectionToolbar: e.target.checked })} /> Show selection toolbar</label>
        </Section>
        <Section title="Options">
          <div className="k-pm-radios" data-testid="deleteface-option">
            <label className="k-check"><input type="radio" name="dfopt" checked={d.option === 'delete'} onChange={() => st.updateFeatureDraft({ option: 'delete' })} /> Delete</label>
            <label className="k-check"><input type="radio" name="dfopt" checked={d.option === 'patch'} onChange={() => st.updateFeatureDraft({ option: 'patch' })} /> Delete and Patch</label>
            <label className="k-check"><input type="radio" name="dfopt" checked={d.option === 'fill'} onChange={() => st.updateFeatureDraft({ option: 'fill' })} /> Delete and Fill</label>
          </div>
          <label className="k-check"><input type="checkbox" data-testid="deleteface-preview" checked={!!d.preview} onChange={(e) => { st.updateFeatureDraft({ preview: e.target.checked }); if (e.target.checked !== st.detailedPreview) st.toggleDetailedPreview(); }} /> Show preview</label>
        </Section>
      </>
    );
  }
  return NEXT;
}

export function deformPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'deform') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Deform" icon={<Icon.Deform />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Deform Type">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="deform-type" checked readOnly /> Point</label>
            <label className="k-check"><input type="radio" name="deform-type" disabled /> Curve to curve</label>
            <label className="k-check"><input type="radio" name="deform-type" disabled /> Surface push</label>
          </div>
        </Section>
        <Section title="Deform Point">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="deform-point">{d.point ? <div className="k-selbox-row"><Icon.Point size={12} /> {d.label ?? 'Point'} ({d.point.map((x) => Math.round(x * 10) / 10).join(', ')})</div> : <span className="k-muted">Select a face: its centre is the deform point, its normal the push direction.</span>}</div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Deform direction: push outward" data-testid="deform-reverse" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Deform distance"><Icon.Depth size={16} /><NumberField value={d.distance} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
        </Section>
        <Section title="Deform Region">
          <div className="k-pm-valuerow k-tip" data-tip="Deform radius"><Icon.Dimension size={14} /><NumberField value={d.radius} onChange={(v) => st.updateFeatureDraft({ radius: Math.max(0.1, v) })} unit={st.doc.units} step={1} min={0.1} /></div>
          <label className="k-check"><input type="checkbox" defaultChecked /> Deform region</label>
        </Section>
        <Section title="Shape Options">
          <div className="k-pm-label">Stiffness:</div>
          <div className="k-pm-stylerow">
            {(['rigid', 'medium', 'flexible'] as const).map((s) => <button key={s} className={`k-pm-stylebtn ${d.stiffness === s ? 'active' : ''}`} data-testid={`deform-${s}`} onClick={() => st.updateFeatureDraft({ stiffness: s })}>{s === 'rigid' ? 'Rigid' : s === 'medium' ? 'Medium' : 'Flexible'}</button>)}
          </div>
          <label className="k-check"><input type="checkbox" defaultChecked /> Maintain boundary</label>
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
