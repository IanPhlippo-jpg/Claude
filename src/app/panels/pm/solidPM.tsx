/** Property Panels: solidPM (split from PropertyPanel.tsx, QA F103). */
import { type ReactNode } from 'react';
import { useStore } from '../../store';
import { NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { SelectedContoursBox, Header, fieldEquation } from './shared';
import { NEXT, type PMContext } from './context';

export function genericPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit) {
    const fe = st.featureEdit;
    const d = fe.draft as Exclude<import('../../../core/document/types').SketchBasedFeature, import('../../../core/document/types').RibFeature | import('../../../core/document/types').BaseFlangeFeature | import('../../../core/document/types').HelixFeature>;
    const fsketch = st.doc.sketches[d.sketchId];
    const titles: Record<string, [string, string]> = { extrude: ['Boss-Extrude', 'Cut-Extrude'], revolve: ['Revolve', 'Cut-Revolve'], sweep: ['Sweep', 'Cut-Sweep'], loft: ['Loft', 'Cut-Loft'] };
    const title = d.type === 'loft' && d.boundary ? (d.op === 'boss' ? 'Boundary' : 'Boundary-Cut') : titles[d.type][d.op === 'boss' ? 0 : 1];
    const icon = d.type === 'extrude' ? (d.op === 'boss' ? <Icon.Extrude /> : <Icon.Cut />) : d.type === 'revolve' ? <Icon.Revolve /> : d.type === 'sweep' ? <Icon.Sweep /> : <Icon.Loft />;
    const otherSketches = st.doc.features.filter((f): f is import('../../../core/document/types').SketchFeature => f.type === 'sketch' && f.sketchId !== d.sketchId);
    const err = st.rebuild.errors[d.id];
    // Loft: the selected planar face, as a profile reference (its centre and normal)
    const selBody = st.selectedFace ? st.rebuild.bodies.find((b) => b.id === st.selectedFace!.bodyId) : undefined;
    const selFace = selBody?.faces.find((x) => x.id === st.selectedFace!.faceId);
    const loftFace = selFace && !selFace.curved ? { point: selFace.centroid, normal: selFace.normal } : null;
    const endOptions: { id: import('../../../core/document/types').EndCondition; label: string }[] = [
      { id: 'blind', label: 'Blind' },
      { id: 'throughAll', label: 'Through All' },
      { id: 'throughAllBoth', label: 'Through All - Both' },
      { id: 'upToNext', label: 'Up To Next' },
      { id: 'upToVertex', label: 'Up To Vertex' },
      { id: 'upToSurface', label: 'Up To Surface' },
      { id: 'offsetFromSurface', label: 'Offset From Surface' },
      { id: 'upToBody', label: 'Up To Body' },
      { id: 'midPlane', label: 'Mid Plane' },
    ];
    const sketchLines = fsketch ? fsketch.entityOrder.map((id) => fsketch.entities[id]).filter((e) => e.kind === 'line') : [];
    return (
      <>
        <Header title={title} icon={icon} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {!fsketch && (
          <Section title="Message">
            <p className="k-pm-message">Select a sketch in the Feature Tree to create the feature from.</p>
          </Section>
        )}
        {fsketch && (d.type === 'extrude' || d.type === 'revolve') && (
          <Section title="From">
            <select className="k-input k-indent" data-testid="extrude-from" value={d.type === 'extrude' && d.fromOffset !== undefined ? 'offset' : 'sketchPlane'} disabled={d.type !== 'extrude'} onChange={(e) => d.type === 'extrude' && st.updateFeatureDraft({ fromOffset: e.target.value === 'offset' ? 10 : undefined, fromReverse: undefined })}>
              <option value="sketchPlane">Sketch Plane</option>
              <option value="offset">Offset</option>
            </select>
            {d.type === 'extrude' && d.fromOffset !== undefined && (
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.fromReverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ fromReverse: !d.fromReverse })}><Icon.ReverseDir size={16} /></button>
                <NumberField value={d.fromOffset} onChange={(v) => st.updateFeatureDraft({ fromOffset: v })} unit={st.doc.units} step={1} />
              </div>
            )}
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Profile and Path">
            <div className="k-field"><label>Profile</label><span>{fsketch.name}</span></div>
            <div className="k-field">
              <label>Path</label>
              <select className="k-input" value={d.pathSketchId} onChange={(e) => st.updateFeatureDraft({ pathSketchId: e.target.value })}>
                <option value="">Select a sketch…</option>
                {otherSketches.map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
                {st.doc.features.filter((f) => f.type === 'helix' || f.type === 'sketch3d' || f.type === 'compositeCurve').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <p className="k-muted" style={{ margin: '4px 0 0' }}>The path sketch holds the lines, arcs or splines to sweep along; the profile stays centred on the path start.</p>
            <div className="k-pm-radios" data-testid="sweep-profile">
              <label className="k-check"><input type="radio" name="sweepprof" checked={(d.profileType ?? 'sketch') === 'sketch'} onChange={() => st.updateFeatureDraft({ profileType: 'sketch' })} /> Sketch Profile</label>
              <label className="k-check"><input type="radio" name="sweepprof" checked={d.profileType === 'circular'} onChange={() => st.updateFeatureDraft({ profileType: 'circular', diameter: d.diameter ?? 5, pathSketchId: d.pathSketchId || d.sketchId })} /> Circular Profile</label>
            </div>
            {d.profileType === 'circular' && <div className="k-pm-valuerow k-tip" data-tip="Diameter"><Icon.Circle size={14} /><NumberField value={d.diameter ?? 5} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>}
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Guide Curves" defaultOpen={false}>
            <div className="k-selbox" style={{ minHeight: 30 }} data-testid="sweep-guides">
              {(d.guides ?? []).length ? (d.guides ?? []).map((gid) => <div key={gid} className="k-selbox-row"><Icon.Spline size={12} /> {st.doc.features.find((f) => f.type === 'sketch' && f.sketchId === gid)?.name ?? gid}<span className="grow" /><button className="k-btn ghost icon" title="Remove" onClick={() => st.updateFeatureDraft({ guides: (d.guides ?? []).filter((x) => x !== gid) })}><Icon.Close size={10} /></button></div>) : <span className="k-muted">Guide curves shape the profile along the path.</span>}
            </div>
            <select className="k-input" value="" onChange={(e) => e.target.value && st.updateFeatureDraft({ guides: [...(d.guides ?? []), e.target.value] })}>
              <option value="">Add a guide curve…</option>
              {otherSketches.filter((f) => f.sketchId !== d.pathSketchId && !(d.guides ?? []).includes(f.sketchId)).map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
            </select>
            <label className="k-check"><input type="checkbox" checked={!!d.mergeTangent} onChange={(e) => st.updateFeatureDraft({ mergeTangent: e.target.checked })} /> Merge smooth faces</label>
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Options">
            <div className="k-field"><label>Profile orientation</label>
              <select className="k-input" data-testid="sweep-orientation" value={d.orientation ?? 'followPath'} onChange={(e) => st.updateFeatureDraft({ orientation: e.target.value as 'followPath' })}>
                <option value="followPath">Follow Path</option>
                <option value="keepNormal">Keep normal constant</option>
              </select>
            </div>
            <div className="k-field"><label>Profile Twist</label>
              <select className="k-input" data-testid="sweep-twist" value={d.twist ? 'value' : d.minTwist ? 'minimum' : 'none'} onChange={(e) => st.updateFeatureDraft({ twist: e.target.value === 'value' ? 1 : undefined, minTwist: e.target.value === 'minimum' || undefined })}>
                <option value="none">None</option>
                <option value="value">Specify Twist Value</option>
                <option value="minimum">Minimum Twist</option>
              </select>
            </div>
            {d.twist !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Twist control: revolutions"><Icon.Revolve size={14} /><NumberField value={d.twist} onChange={(v) => st.updateFeatureDraft({ twist: v })} step={0.25} /></div>}
            <label className="k-check"><input type="checkbox" checked={!!d.mergeTangent} onChange={(e) => st.updateFeatureDraft({ mergeTangent: e.target.checked })} /> Merge tangent faces</label>
            <label className="k-check"><input type="checkbox" checked={!!d.alignEnd} onChange={(e) => st.updateFeatureDraft({ alignEnd: e.target.checked })} /> Align with end faces</label>
            <label className="k-check"><input type="checkbox" defaultChecked /> Show preview</label>
            {st.rebuild.bodies.length > 0 && d.op === 'boss' && <label className="k-check"><input type="checkbox" data-testid="sweep-merge" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>}
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Start and End Tangency" defaultOpen={false}>
            <div className="k-field"><label>Start tangency type</label><select className="k-input" value={d.startTangency ?? 'none'} onChange={(e) => st.updateFeatureDraft({ startTangency: e.target.value as 'none' })}><option value="none">None</option><option value="pathTangent">Path Tangent</option></select></div>
            <div className="k-field"><label>End tangency type</label><select className="k-input" value={d.endTangency ?? 'none'} onChange={(e) => st.updateFeatureDraft({ endTangency: e.target.value as 'none' })}><option value="none">None</option><option value="pathTangent">Path Tangent</option></select></div>
          </Section>
        )}
        {fsketch && d.type === 'sweep' && (
          <Section title="Curvature Display" defaultOpen={false}>
            <label className="k-check"><input type="checkbox" checked={!!d.curvatureDisplay?.mesh} onChange={(e) => st.updateFeatureDraft({ curvatureDisplay: { ...d.curvatureDisplay, mesh: e.target.checked } })} /> Mesh preview</label>
            <label className="k-check"><input type="checkbox" checked={!!d.curvatureDisplay?.zebra} onChange={(e) => { st.updateFeatureDraft({ curvatureDisplay: { ...d.curvatureDisplay, zebra: e.target.checked } }); if (e.target.checked !== st.show.zebra) st.toggleShow('zebra'); }} /> Zebra stripes</label>
            <label className="k-check"><input type="checkbox" checked={!!d.curvatureDisplay?.combs} onChange={(e) => st.updateFeatureDraft({ curvatureDisplay: { ...d.curvatureDisplay, combs: e.target.checked } })} /> Curvature combs</label>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Profiles">
            {/* the profiles as a list in loft order with Move Up / Move Down beside it, by design */}
            <div className="k-pm-selrow" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className="k-pm-revbtn k-tip" data-tip="Move Up" data-testid="loft-up" disabled={!d.sketchId2 || !!d.face2} onClick={() => st.updateFeatureDraft({ sketchId: d.sketchId2, sketchId2: d.sketchId })}>▲</button>
                <button className="k-pm-revbtn k-tip" data-tip="Move Down" data-testid="loft-down" disabled={!d.sketchId2 || !!d.face2} onClick={() => st.updateFeatureDraft({ sketchId: d.sketchId2, sketchId2: d.sketchId })}>▼</button>
              </div>
              <div className="k-selbox" style={{ minHeight: 44, flex: 1 }} data-testid="loft-profiles">
                {[d.sketchId, d.sketchId2].filter(Boolean).map((sid, i) => <div key={sid + i} className="k-selbox-row"><Icon.Sketch size={12} /> {st.doc.features.find((f) => f.type === 'sketch' && f.sketchId === sid)?.name ?? sid}</div>)}
                {/* a planar face of the model as a profile */}
                {d.face2 && <div className="k-selbox-row" data-testid="loft-face-row"><Icon.Plane size={12} /> Face&lt;1&gt; <button className="k-btn ghost icon" aria-label="Remove the face" onClick={() => st.updateFeatureDraft({ face2: undefined })}>×</button></div>}
              </div>
            </div>
            <button className="k-btn" data-testid="loft-face2" disabled={!loftFace} title="Select a planar face of the model, then click here: the face becomes the second profile" onClick={() => loftFace && st.updateFeatureDraft({ face2: loftFace, sketchId2: '' })}>Selected face as profile</button>
            <select className="k-input" data-testid="loft-profile2" value={d.sketchId2} onChange={(e) => st.updateFeatureDraft({ sketchId2: e.target.value, face2: undefined })}>
              <option value="">{d.sketchId2 ? 'Second profile…' : 'Select the second profile…'}</option>
              {otherSketches.map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
            </select>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Start/End Constraints" defaultOpen={d.startNormal !== undefined || d.endNormal !== undefined}>
            {(['start', 'end'] as const).map((k) => {
              const w = k === 'start' ? d.startNormal : d.endNormal;
              const type = w === undefined ? 'none' : (k === 'start' ? d.startType : d.endType) ?? 'normal';
              const dir = (k === 'start' ? d.startDir : d.endDir) ?? [0, 0, 1];
              const set = (p: Record<string, unknown>) => st.updateFeatureDraft(p as never);
              return (
                <div key={k}>
                  <div className="k-field"><label>{k === 'start' ? 'Start constraint' : 'End constraint'}</label>
                    <select className="k-input" value={type} data-testid={`loft-${k}`} onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'none') set({ [`${k}Normal`]: undefined, [`${k}Type`]: undefined });
                      else set({ [`${k}Normal`]: w ?? 1, [`${k}Type`]: v === 'normal' ? undefined : v, ...(v === 'direction' ? { [`${k}Dir`]: dir } : {}) });
                    }}>
                      <option value="none">None</option>
                      <option value="direction">Direction Vector</option>
                      <option value="normal">Normal To Profile</option>
                      <option value="tangent">Tangency To Face</option>
                      <option value="curvature">Curvature To Face</option>
                    </select>
                  </div>
                  {(type === 'tangent' || type === 'curvature') && (
                    // Next Face: the loft follows the next of the faces next to the profile
                    <button className="k-btn" data-testid={`loft-${k}-nextface`} onClick={() => set({ [`${k}Face`]: ((k === 'start' ? d.startFace : d.endFace) ?? 0) + 1 })}>Next Face</button>
                  )}
                  {type === 'direction' && (
                    <div className="k-pm-stylerow">
                      {(['X', 'Y', 'Z'] as const).map((a, i) => <button key={a} className={`k-pm-stylebtn ${Math.abs(dir[i]) > 0.5 ? 'active' : ''}`} onClick={() => { const v: [number, number, number] = [0, 0, 0]; v[i] = 1; set({ [`${k}Dir`]: v }); }}>{a}</button>)}
                      <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => set({ [`${k}Dir`]: dir.map((x) => -x) })}><Icon.ReverseDir size={16} /></button>
                    </div>
                  )}
                  {w !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Tangent length"><Icon.Dimension size={14} /><NumberField value={w} onChange={(v) => set({ [`${k}Normal`]: Math.max(0, v) })} step={0.1} min={0} /></div>}
                  {k === 'start' && w !== undefined && <label className="k-check"><input type="checkbox" data-testid="loft-applyall" checked={!!d.applyToAll} onChange={(e) => st.updateFeatureDraft({ applyToAll: e.target.checked, ...(e.target.checked ? { endNormal: d.startNormal, endType: d.startType, endDir: d.startDir } : {}) })} /> Apply to all</label>}
                </div>
              );
            })}
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Centerline Parameters" defaultOpen={!!d.centerline}>
            <select className="k-input" data-testid="loft-centerline" value={d.centerline ?? ''} onChange={(e) => st.updateFeatureDraft({ centerline: e.target.value || undefined })}>
              <option value="">No centerline</option>
              {otherSketches.filter((f) => f.sketchId !== d.sketchId2).map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
            </select>
            <p className="k-muted" style={{ margin: '4px 0 0' }}>The section centres follow the centerline sketch from profile 1 to profile 2.</p>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Options">
            <label className="k-check"><input type="checkbox" checked={!!d.mergeTangent} onChange={(e) => st.updateFeatureDraft({ mergeTangent: e.target.checked })} /> Merge tangent faces</label>
            <label className="k-check" title="Needs three or more profiles"><input type="checkbox" disabled checked={!!d.closeLoft} onChange={(e) => st.updateFeatureDraft({ closeLoft: e.target.checked })} /> Close loft</label>
            <label className="k-check"><input type="checkbox" defaultChecked /> Show preview</label>
            <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
              <button className="k-btn" data-testid="loft-dragsketch" onClick={() => { const sid = d.sketchId; st.cancelFeature(); st.editSketch(sid); }}>Drag Sketch</button>
            </div>
          </Section>
        )}
        {fsketch && d.type === 'loft' && (
          <Section title="Guide Curves">
            <div className="k-selbox" style={{ minHeight: 40 }} data-testid="loft-guides">
              {(d.guides ?? []).length ? (d.guides ?? []).map((gid) => (
                <div key={gid} className="k-selbox-row">
                  <Icon.Spline size={12} /> {st.doc.features.find((f) => f.type === 'sketch' && f.sketchId === gid)?.name ?? gid}
                  <span className="grow" />
                  <button className="k-btn ghost icon" title="Remove" onClick={() => st.updateFeatureDraft({ guides: (d.guides ?? []).filter((x) => x !== gid) })}><Icon.Close size={10} /></button>
                </div>
              )) : <span className="k-muted">Guide curves: sketches from profile 1 to profile 2.</span>}
            </div>
            <select className="k-input" value="" onChange={(e) => e.target.value && st.updateFeatureDraft({ guides: [...(d.guides ?? []), e.target.value] })} data-testid="loft-add-guide">
              <option value="">Add a guide curve…</option>
              {otherSketches.filter((f) => f.sketchId !== d.sketchId2 && !(d.guides ?? []).includes(f.sketchId)).map((f) => <option key={f.id} value={f.sketchId}>{f.name}</option>)}
            </select>
            <select className="k-input" data-testid="loft-guide-tangency" value={d.type === 'loft' ? d.guideTangency ?? 'none' : 'none'} onChange={(e) => st.updateFeatureDraft({ guideTangency: e.target.value as 'none' })} style={{ marginTop: 4 }}><option value="none">Guide tangency type: None</option><option value="normal">Guide tangency type: Normal To Profile</option></select>
          </Section>
        )}
        {fsketch && d.type === 'extrude' && (
          <>
            <Section title="Direction 1">
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
                <select className="k-input" value={d.end} onChange={(e) => st.updateFeatureDraft({ end: e.target.value as 'blind' })}>
                  {endOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="k-pm-valuerow k-tip" data-tip="Direction of Extrusion: the sketch normal">
                <Icon.DirArrow size={16} />
                <div className="k-selbox k-selbox-dir" />
              </div>
              {d.end === 'upToVertex' && (
                <div className="k-selbox" style={{ minHeight: 24, marginBottom: 4 }}>
                  {d.vertex ? <div className="k-selbox-row"><Icon.Point size={12} /> {d.vertex.label}</div> : <span className="k-muted">Select a vertex in the graphics area.</span>}
                </div>
              )}
              {d.end === 'upToBody' && (
                <div className="k-selbox" style={{ minHeight: 24, marginBottom: 4 }} data-testid="up-to-body">
                  {d.upToBody ? <div className="k-selbox-row"><Icon.Part size={12} /> {d.upToBody.label}</div> : <span className="k-muted">Select a solid body in the graphics area.</span>}
                </div>
              )}
              {(d.end === 'upToSurface' || d.end === 'offsetFromSurface') && (
                <div className="k-selbox" style={{ minHeight: 24, marginBottom: 4 }}>
                  {d.surface ? <div className="k-selbox-row"><Icon.Properties size={12} /> {d.surface.label}</div> : <span className="k-muted">Select a face in the graphics area.</span>}
                </div>
              )}
              {d.end === 'offsetFromSurface' && (
                <>
                  <div className="k-pm-valuerow">
                    <Icon.Dimension size={14} />
                    <NumberField value={d.offset ?? 0} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} autoFocus />
                  </div>
                  <label className="k-check"><input type="checkbox" checked={!!d.reverseOffset} onChange={(e) => st.updateFeatureDraft({ reverseOffset: e.target.checked })} /> Reverse offset</label>
                  <label className="k-check"><input type="checkbox" data-testid="extrude-translate" checked={!!d.translateSurface} onChange={(e) => st.updateFeatureDraft({ translateSurface: e.target.checked })} /> Translate surface</label>
                </>
              )}
              {d.end === 'blind' || d.end === 'midPlane' ? (
                <div className="k-pm-valuerow k-tip" data-tip="Depth">
                  <Icon.Depth size={16} />
                  <NumberField equation={fieldEquation(st, 'depth')} value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
                </div>
              ) : null}
              {d.op === 'cut' && <label className="k-check"><input type="checkbox" checked={!!d.flipSide} onChange={(e) => st.updateFeatureDraft({ flipSide: e.target.checked })} /> Flip side to cut</label>}
              {d.op === 'cut' && st.doc.sheetMetal && (
                <>
                  <label className="k-check"><input type="checkbox" data-testid="cut-linkthickness" checked={!!d.linkToThickness} onChange={(e) => st.updateFeatureDraft({ linkToThickness: e.target.checked, ...(e.target.checked ? { end: 'blind', depth: st.doc.sheetMetal!.thickness } : {}) })} /> Link to thickness</label>
                  <label className="k-check"><input type="checkbox" data-testid="cut-normal" checked={d.normalCut !== false} onChange={(e) => st.updateFeatureDraft({ normalCut: e.target.checked, ...(e.target.checked ? {} : { optimizeGeometry: false }) })} /> Normal cut</label>
                  <label className="k-check" style={{ paddingLeft: 18 }}><input type="checkbox" data-testid="cut-optimize" disabled={d.normalCut === false} checked={d.normalCut !== false && d.optimizeGeometry !== false} onChange={(e) => st.updateFeatureDraft({ optimizeGeometry: e.target.checked })} /> Optimize geometry</label>
                </>
              )}
              {st.rebuild.bodies.length > 0 && d.op === 'boss' && <label className="k-check"><input type="checkbox" checked={d.merge !== false} onChange={(e) => st.updateFeatureDraft({ merge: e.target.checked })} /> Merge result</label>}
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.draft ? 'active' : ''}`} data-tip="Draft On/Off" onClick={() => st.updateFeatureDraft({ draft: d.draft ? undefined : { angle: 1, outward: false } })}><Icon.Draft size={16} /></button>
                <NumberField value={d.draft?.angle ?? 1} onChange={(v) => st.updateFeatureDraft({ draft: { angle: Math.max(0, Math.min(89, v)), outward: d.draft?.outward ?? false } })} unit="°" step={1} min={0} disabled={!d.draft} blankWhenDisabled />
              </div>
              <label className="k-check"><input type="checkbox" disabled={!d.draft} checked={!!d.draft?.outward} onChange={(e) => st.updateFeatureDraft({ draft: { angle: d.draft?.angle ?? 1, outward: e.target.checked } })} /> Draft outward</label>
            </Section>
            <Section title="Direction 2" defaultOpen={!!d.direction2} check={!!d.direction2} onCheck={(on) => st.updateFeatureDraft({ direction2: on ? { end: 'blind', depth: d.depth } : undefined })}>
              {d.direction2 && (
                <>
                  <select className="k-input" data-testid="dir2-end" value={d.direction2.end} onChange={(e) => { st.updateFeatureDraft({ direction2: { ...d.direction2!, end: e.target.value as 'blind' } }); useStore.setState({ dir2Pick: e.target.value === 'upToVertex' ? 'vertex' : e.target.value === 'upToSurface' || e.target.value === 'offsetFromSurface' ? 'surface' : null }); }}>
                    {endOptions.filter((o) => o.id !== 'midPlane' && o.id !== 'upToBody').map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  {(d.direction2.end === 'upToVertex' || d.direction2.end === 'upToSurface' || d.direction2.end === 'offsetFromSurface') && (
                    <div className={`k-selbox${st.dir2Pick ? ' k-selbox-dir' : ''}`} style={{ minHeight: 24 }} data-testid="dir2-ref" onClick={() => useStore.setState({ dir2Pick: d.direction2!.end === 'upToVertex' ? 'vertex' : 'surface' })}>
                      {d.direction2.end === 'upToVertex' ? (d.direction2.vertex ? <div className="k-selbox-row">{d.direction2.vertex.label}</div> : <span className="k-muted">Click a vertex of the model.</span>) : d.direction2.surface ? <div className="k-selbox-row">{d.direction2.surface.label}</div> : <span className="k-muted">Select a planar face.</span>}
                    </div>
                  )}
                  {d.direction2.end === 'offsetFromSurface' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.direction2.offset ?? 0} onChange={(v) => st.updateFeatureDraft({ direction2: { ...d.direction2!, offset: v } })} unit={st.doc.units} step={1} /></div>}
                  {(d.direction2.end === 'blind' || d.direction2.end === 'midPlane') && (
                    <div className="k-pm-valuerow">
                      <Icon.Dimension size={14} />
                      <NumberField value={d.direction2.depth} onChange={(v) => st.updateFeatureDraft({ direction2: { ...d.direction2!, depth: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                    </div>
                  )}
                </>
              )}
            </Section>
            <Section title="Thin Feature" defaultOpen={!!d.thin} check={!!d.thin} onCheck={(on) => st.updateFeatureDraft({ thin: on ? { mode: 'one', thickness: 2 } : undefined })}>
              {d.thin && (
                <>
                  <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
                    <button className={`k-btn icon k-tip ${d.thin.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ thin: { ...d.thin!, reverse: !d.thin!.reverse } })}><Icon.Flip size={14} /></button>
                    <select className="k-input" value={d.thin.mode} onChange={(e) => st.updateFeatureDraft({ thin: { ...d.thin!, mode: e.target.value as 'one' | 'mid' | 'two' } })}>
                      <option value="one">One-Direction</option>
                      <option value="mid">Mid-Plane</option>
                      <option value="two">Two-Direction</option>
                    </select>
                  </div>
                  <div className="k-pm-valuerow">
                    <Icon.Dimension size={14} />
                    <NumberField value={d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                  </div>
                  {d.thin.mode === 'two' && (
                    <div className="k-pm-valuerow">
                      <Icon.Dimension size={14} />
                      <NumberField value={d.thin.thickness2 ?? d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness2: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                    </div>
                  )}
                  <label className="k-check"><input type="checkbox" data-testid="thin-autofillet" checked={!!d.thin.autoFillet} onChange={(e) => st.updateFeatureDraft({ thin: { ...d.thin!, autoFillet: e.target.checked ? d.thin!.thickness : undefined } })} /> Auto-fillet corners</label>
                  {!!d.thin.autoFillet && <div className="k-pm-valuerow k-tip" data-tip="Fillet radius"><Icon.Arc size={14} /><NumberField value={d.thin.autoFillet} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, autoFillet: Math.max(0.01, v) } })} unit={st.doc.units} step={0.5} /></div>}
                </>
              )}
            </Section>
            <Section title="Selected Contours" defaultOpen={false}>
              {d.thin ? (
                <p className="k-muted">All contours of {fsketch.name} (open profiles allowed).</p>
              ) : (
                <SelectedContoursBox sketchName={fsketch.name} contours={d.contours} />
              )}
            </Section>
          </>
        )}
        {st.rebuild.bodies.length > 1 && (d.op === 'cut' || ((d.type === 'extrude' || d.type === 'sweep') && d.merge !== false)) && (
          <Section title="Feature Scope" defaultOpen={false}>
            <div className="k-pm-radios">
              <label className="k-check"><input type="radio" name="fscope" checked={!d.scope} onChange={() => st.updateFeatureDraft({ scope: undefined })} /> {st.doc.kind === 'assembly' ? 'All components' : 'All bodies'}</label>
              <label className="k-check"><input type="radio" name="fscope" checked={!!d.scope} onChange={() => st.updateFeatureDraft({ scope: st.rebuild.bodies.map((b) => b.id) })} /> {st.doc.kind === 'assembly' ? 'Selected components' : 'Selected bodies'}</label>
            </div>
            <label className="k-check"><input type="checkbox" data-testid="scope-auto" checked={!d.scope} onChange={(e) => st.updateFeatureDraft({ scope: e.target.checked ? undefined : st.rebuild.bodies.map((b) => b.id) })} /> Auto-select</label>
            {d.scope && (
              <div className="k-selbox" style={{ minHeight: 24 }}>
                {st.rebuild.bodies.map((b) => (
                  <label key={b.id} className="k-check">
                    <input type="checkbox" checked={d.scope!.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ scope: e.target.checked ? [...d.scope!, b.id] : d.scope!.filter((x) => x !== b.id) })} />
                    {(st.doc.components ?? []).find((c) => c.id === b.id)?.name ?? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? b.id}
                  </label>
                ))}
              </div>
            )}
          </Section>
        )}
        {fsketch && d.type === 'revolve' && (
          <>
            <Section title="Axis of Revolution">
              <select className="k-input" value={d.axisEntityId} onChange={(e) => st.updateFeatureDraft({ axisEntityId: e.target.value })}>
                <option value="">Select a line…</option>
                {sketchLines.map((l, i) => <option key={l.id} value={l.id}>{l.construction ? 'Centerline' : 'Line'}{i + 1}@{fsketch.name}</option>)}
              </select>
            </Section>
            <Section title="Direction 1">
              <div className="k-pm-valuerow">
                <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
                <select className="k-input" data-testid="revolve-type" value={d.end ?? 'blind'} onChange={(e) => st.updateFeatureDraft({ end: e.target.value as 'blind', direction2: e.target.value === 'midPlane' ? undefined : d.direction2 })}><option value="blind">Blind</option><option value="midPlane">Mid-Plane</option></select>
              </div>
              <div className="k-pm-valuerow">
                <Icon.Dimension size={14} />
                <NumberField equation={fieldEquation(st, 'angle')} value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(0.1, Math.min(360, v)) })} unit="°" step={5} min={0} autoFocus />
              </div>
            </Section>
            {(d.end ?? 'blind') !== 'midPlane' && (
              <Section title="Direction2" defaultOpen={!!d.direction2} check={!!d.direction2} onCheck={(on) => st.updateFeatureDraft({ direction2: on ? { angle: Math.min(90, 360 - d.angle) } : undefined })}>
                {d.direction2 && (
                  <div className="k-pm-valuerow">
                    <Icon.Dimension size={14} />
                    <NumberField value={d.direction2.angle} onChange={(v) => st.updateFeatureDraft({ direction2: { angle: Math.max(0, Math.min(360 - d.angle, v)) } })} unit="°" step={5} min={0} />
                  </div>
                )}
              </Section>
            )}
            <Section title="Thin Feature" defaultOpen={!!d.thin} check={!!d.thin} onCheck={(on) => st.updateFeatureDraft({ thin: on ? { mode: 'one', thickness: 2 } : undefined })}>
              {d.thin && (
                <>
                  <select className="k-input" value={d.thin.mode} onChange={(e) => st.updateFeatureDraft({ thin: { ...d.thin!, mode: e.target.value as 'one' } })}>
                    <option value="one">One-Direction</option><option value="mid">Mid-Plane</option><option value="two">Two-Direction</option>
                  </select>
                  <div className="k-pm-valuerow">
                    <button className={`k-pm-stylebtn k-tip ${d.thin.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ thin: { ...d.thin!, reverse: !d.thin!.reverse } })}><Icon.ReverseDir size={16} /></button>
                    <NumberField value={d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} />
                  </div>
                  {d.thin.mode === 'two' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.thin.thickness2 ?? d.thin.thickness} onChange={(v) => st.updateFeatureDraft({ thin: { ...d.thin!, thickness2: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} /></div>}
                </>
              )}
            </Section>
            <Section title="Selected Contours" defaultOpen={false}>
              <SelectedContoursBox sketchName={fsketch.name} contours={d.contours} />
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
