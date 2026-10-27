/** Property Panels: weldmentPMs (split from PropertyPanel.tsx, QA F103). */
import { sketchChains } from '../../../core/features/thin';
import { type ReactNode } from 'react';
import { NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { profileSizes, profileTypes, type ProfileType } from '../../../core/features/weldments';
import { Header } from './shared';
import { NEXT, type PMContext } from './context';

export function structuralMemberPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, profileEdit, setProfileEdit } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'structuralMember') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const paths = st.doc.features.filter((f) => f.type === 'sketch' || f.type === 'sketch3d') as ({ id: string; name: string; type: 'sketch'; sketchId: string } | { id: string; name: string; type: 'sketch3d' })[];
    const types = profileTypes(d.standard);
    const sizes = profileSizes(d.standard, d.profileType);
    // the member count follows the path: every straight segment of the 2D chains, or the 3D sketch segments
    const pathSketch = st.doc.sketches[d.sketchId];
    const path3d = st.doc.features.find((f) => f.id === d.sketchId && f.type === 'sketch3d') as { segments: unknown[] } | undefined;
    const members = pathSketch ? sketchChains(pathSketch).reduce((a, c) => a + Math.max(0, c.points.length - (c.closed ? 0 : 1)), 0) : path3d ? path3d.segments.length : 0;
    return (
      <>
        <Header title="Structural Member" icon={<Icon.StructuralMember />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Message">
          <p className="k-pm-message">Select the path sketch; every straight segment becomes a member. Choose the standard, type and size of the profile, then the corner treatment.</p>
        </Section>
        <Section title="Selections">
          <div className="k-pm-label">Standard:</div>
          <select className="k-input" data-testid="sm-standard" value={d.standard} onChange={(e) => { const std = e.target.value as 'iso' | 'ansi inch'; const t = profileTypes(std)[0]; st.updateFeatureDraft({ standard: std, profileType: t, size: profileSizes(std, t)[0] }); }}>
            <option value="iso">iso</option>
            <option value="ansi inch">ansi inch</option>
          </select>
          <div className="k-pm-label">Type:</div>
          <select className="k-input" data-testid="sm-type" value={d.profileType} onChange={(e) => { const t = e.target.value as ProfileType; st.updateFeatureDraft({ profileType: t, size: profileSizes(d.standard, t)[0] }); }}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="k-pm-label">Size:</div>
          <select className="k-input" data-testid="sm-size" value={d.size} onChange={(e) => st.updateFeatureDraft({ size: e.target.value })}>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" disabled /> Transfer material from profile</label>
          <div className="k-pm-label">Groups:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="sm-groups">{d.sketchId ? <div className="k-selbox-row"><Icon.Sketch size={12} /> Group1 ({paths.find((p) => (p.type === 'sketch' ? p.sketchId : p.id) === d.sketchId)?.name ?? 'path'}){members ? <span className="k-muted"> · {members} member(s)</span> : null}</div> : <span className="k-muted">Select a 2D or 3D sketch as the path.</span>}</div>
          <select className="k-input" style={{ marginTop: 4 }} data-testid="sm-path" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })}>
            <option value="">(select a path sketch)</option>
            {paths.map((p) => <option key={p.id} value={p.type === 'sketch' ? p.sketchId : p.id}>{p.name}</option>)}
          </select>
        </Section>
        <Section title="Settings">
          <label className="k-check"><input type="checkbox" data-testid="sm-corner" checked={d.corner !== 'none'} onChange={(e) => st.updateFeatureDraft({ corner: e.target.checked ? 'endMiter' : 'none' })} /> Apply corner treatment</label>
          {d.corner !== 'none' && (
            <div className="k-pm-stylerow">
              <button className={`k-pm-stylebtn k-tip ${d.corner === 'endMiter' ? 'active' : ''}`} data-tip="End Miter" data-testid="sm-miter" onClick={() => st.updateFeatureDraft({ corner: 'endMiter' })}><Icon.Chamfer size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${d.corner === 'endButt1' ? 'active' : ''}`} data-tip="End Butt1" data-testid="sm-butt1" onClick={() => st.updateFeatureDraft({ corner: 'endButt1' })}><Icon.TrimExtend size={16} /></button>
              <button className={`k-pm-stylebtn k-tip ${d.corner === 'endButt2' ? 'active' : ''}`} data-tip="End Butt2" data-testid="sm-butt2" onClick={() => st.updateFeatureDraft({ corner: 'endButt2' })}><Icon.Flip size={16} /></button>
            </div>
          )}
          <div className="k-pm-valuerow k-tip" data-tip="Gap between connected segments"><Icon.Dimension size={14} /><NumberField value={d.gap} onChange={(v) => st.updateFeatureDraft({ gap: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
          <label className="k-check"><input type="checkbox" checked={!!d.mergeArcs} onChange={(e) => st.updateFeatureDraft({ mergeArcs: e.target.checked })} /> Merge arc segment bodies</label>
          <label className="k-check"><input type="checkbox" data-testid="sm-mirror" checked={!!d.mirror} onChange={(e) => st.updateFeatureDraft({ mirror: e.target.checked })} /> Mirror profile</label>
          <div className="k-pm-valuerow k-tip" data-tip="Rotation angle"><Icon.MateAngle size={14} /><NumberField value={d.rotation} onChange={(v) => st.updateFeatureDraft({ rotation: ((v % 360) + 360) % 360 })} unit="°" step={15} /></div>
          <button className="k-btn" style={{ marginTop: 4 }} onClick={() => setProfileEdit((x) => !x)}>Locate Profile</button>
          {profileEdit && (
            <div className="k-pm-xyrow">
              <span className="k-pm-xy">X</span><NumberField value={d.locate?.x ?? 0} onChange={(v) => st.updateFeatureDraft({ locate: { x: v, y: d.locate?.y ?? 0 } })} unit={st.doc.units} step={1} />
              <span className="k-pm-xy">Y</span><NumberField value={d.locate?.y ?? 0} onChange={(v) => st.updateFeatureDraft({ locate: { x: d.locate?.x ?? 0, y: v } })} unit={st.doc.units} step={1} />
            </div>
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

export function trimExtendPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'trimExtend') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return st.doc.features.find((f) => f.id === b?.featureIds[b.featureIds.length - 1])?.name ?? id; };
    return (
      <>
        <Header title="Trim/Extend" icon={<Icon.TrimExtend />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Corner Type">
          <div className="k-pm-stylerow">
            <button className="k-pm-stylebtn k-tip active" data-tip="End Trim"><Icon.TrimExtend size={16} /></button>
            <button className="k-pm-stylebtn k-tip" data-tip="End Miter (use Structural Member ▸ corner treatment)" onClick={() => st.pushMessage('End Miter, End Butt1 and End Butt2 are the corner treatments of the Structural Member; Trim/Extend trims with bodies or a face.', 'info')}><Icon.Chamfer size={16} /></button>
          </div>
        </Section>
        <Section title="Bodies to be Trimmed">
          <div className={`k-selbox${st.trimFocus === 'bodies' ? ' focus' : ''}`} style={{ minHeight: 24 }} data-testid="te-bodies" onClick={() => st.setTrimFocus('bodies')}>{d.bodies.length ? d.bodies.map((b) => <div key={b} className="k-selbox-row"><Icon.Part size={12} /> {bodyName(b)}</div>) : <span className="k-muted">Select the bodies to trim (click a face).</span>}</div>
          <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" checked={d.allowExtension} onChange={(e) => st.updateFeatureDraft({ allowExtension: e.target.checked })} /> Allow extension</label>
        </Section>
        <Section title="Trimming Boundary">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="te-by" data-testid="te-byface" checked={d.trimBy === 'face'} onChange={() => { st.updateFeatureDraft({ trimBy: 'face' }); st.setTrimFocus('trimming'); }} /> Face/Plane</label>
            <label className="k-check"><input type="radio" name="te-by" data-testid="te-bybodies" checked={d.trimBy === 'bodies'} onChange={() => { st.updateFeatureDraft({ trimBy: 'bodies' }); st.setTrimFocus('trimming'); }} /> Bodies</label>
          </div>
          <div className={`k-selbox${st.trimFocus === 'trimming' ? ' focus' : ''}`} style={{ minHeight: 24 }} data-testid="te-trimming" onClick={() => st.setTrimFocus('trimming')}>
            {d.trimBy === 'bodies'
              ? (d.trimBodies.length ? d.trimBodies.map((b) => <div key={b} className="k-selbox-row"><Icon.Part size={12} /> {bodyName(b)}</div>) : <span className="k-muted">Select the trimming bodies.</span>)
              : (d.face ? <div className="k-selbox-row"><Icon.Plane size={12} /> Face&lt;1&gt;</div> : <span className="k-muted">Select the trimming face or plane.</span>)}
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Weld gap"><Icon.Dimension size={14} /><NumberField value={d.weldGap} onChange={(v) => st.updateFeatureDraft({ weldGap: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
          <label className="k-check"><input type="checkbox" defaultChecked /> Preview</label>
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

export function endCapPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'endCap') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="End Cap" icon={<Icon.EndCap />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Parameters">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="ec-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the end faces of the tubes.</span>}</div>
          <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
            <button className={`k-pm-stylebtn k-tip ${!d.outward ? 'active' : ''}`} data-tip="Thickness Direction: Inward" data-testid="ec-inward" onClick={() => st.updateFeatureDraft({ outward: false })}><Icon.ReverseDir size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.outward ? 'active' : ''}`} data-tip="Thickness Direction: Outward" data-testid="ec-outward" onClick={() => st.updateFeatureDraft({ outward: true })}><Icon.DirArrow size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Thickness"><Icon.Depth size={16} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.1, v) })} unit={st.doc.units} step={1} min={0.1} /></div>
        </Section>
        <Section title="Offset">
          <label className="k-check"><input type="checkbox" data-testid="ec-ratio" checked={d.useRatio} onChange={(e) => st.updateFeatureDraft({ useRatio: e.target.checked })} /> Use thickness ratio</label>
          {d.useRatio
            ? <div className="k-pm-valuerow k-tip" data-tip="Thickness ratio (of the wall)"><Icon.Dimension size={14} /><NumberField value={d.ratio} onChange={(v) => st.updateFeatureDraft({ ratio: Math.max(0, Math.min(1, v)) })} step={0.1} min={0} /></div>
            : <div className="k-pm-valuerow k-tip" data-tip="Offset value"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>}
          <label className="k-check"><input type="checkbox" disabled /> Reverse direction</label>
        </Section>
        <Section title="Corner Treatment" check={d.chamfer > 0} onCheck={(on) => st.updateFeatureDraft({ chamfer: on ? 2 : 0 })}>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="ec-corner" checked={d.chamfer > 0} onChange={() => st.updateFeatureDraft({ chamfer: d.chamfer || 2 })} /> Chamfer corners</label>
            <label className="k-check"><input type="radio" name="ec-corner" disabled /> Fillet corners</label>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Chamfer distance"><Icon.Chamfer size={14} /><NumberField value={d.chamfer} onChange={(v) => st.updateFeatureDraft({ chamfer: Math.max(0, v) })} unit={st.doc.units} step={0.5} min={0} /></div>
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

export function weldGussetPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'weldGusset') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Gusset" icon={<Icon.Gusset />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Supporting Faces">
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wg-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the two faces the gusset spans.</span>}</div>
        </Section>
        <Section title="Profile">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.profile === 'triangular' ? 'active' : ''}`} data-tip="Triangular Profile" data-testid="wg-tri" onClick={() => st.updateFeatureDraft({ profile: 'triangular' })}><Icon.Gusset size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${d.profile === 'polygonal' ? 'active' : ''}`} data-tip="Polygonal Profile" data-testid="wg-poly" onClick={() => st.updateFeatureDraft({ profile: 'polygonal', d3: d.d3 ?? Math.min(d.d1, d.d2) / 2 })}><Icon.Polygon size={16} /></button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Profile distance 1 (d1)"><span className="k-pm-xy">d1</span><NumberField value={d.d1} onChange={(v) => st.updateFeatureDraft({ d1: Math.max(1, v) })} unit={st.doc.units} step={1} min={1} /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Profile distance 2 (d2)"><span className="k-pm-xy">d2</span><NumberField value={d.d2} onChange={(v) => st.updateFeatureDraft({ d2: Math.max(1, v) })} unit={st.doc.units} step={1} min={1} /></div>
          {d.profile === 'polygonal' && <div className="k-pm-valuerow k-tip" data-tip="Profile distance 3 (d3)"><span className="k-pm-xy">d3</span><NumberField value={d.d3 ?? 10} onChange={(v) => st.updateFeatureDraft({ d3: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>}
          <div className="k-pm-valuerow k-tip" data-tip="Gusset thickness"><Icon.Depth size={16} /><NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
          <div className="k-pm-stylerow">
            <button className="k-pm-stylebtn k-tip active" data-tip="Both sides (thickness centred)"><Icon.Mirror size={16} /></button>
          </div>
        </Section>
        <Section title="Parameters">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${d.location === 'start' ? 'active' : ''}`} data-tip="Profile Locates at Start Point" onClick={() => st.updateFeatureDraft({ location: 'start' })}>⇤</button>
            <button className={`k-pm-stylebtn k-tip ${d.location === 'mid' ? 'active' : ''}`} data-tip="Profile Locates at Mid Point" data-testid="wg-mid" onClick={() => st.updateFeatureDraft({ location: 'mid' })}>↔</button>
            <button className={`k-pm-stylebtn k-tip ${d.location === 'end' ? 'active' : ''}`} data-tip="Profile Locates at End Point" onClick={() => st.updateFeatureDraft({ location: 'end' })}>⇥</button>
          </div>
          <div className="k-pm-valuerow k-tip" data-tip="Offset"><Icon.Dimension size={14} /><NumberField value={d.offset} onChange={(v) => st.updateFeatureDraft({ offset: v })} unit={st.doc.units} step={1} /></div>
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

export function weldBeadPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'weldBead') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Weld Bead" icon={<Icon.WeldBead />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Weld Path">
          <label className="k-check"><input type="checkbox" disabled /> Smart Weld Selection Tool</label>
          <div className="k-pm-label">Weld Geometry:</div>
          <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wb-faces">{d.faces.length ? d.faces.map((_, i) => <div key={i} className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select the two faces that meet at the weld.</span>}</div>
        </Section>
        <Section title="Settings">
          <div className="k-pm-valuerow k-tip" data-tip="Bead size"><Icon.Dimension size={14} /><NumberField value={d.size} onChange={(v) => st.updateFeatureDraft({ size: Math.max(0.5, v) })} unit={st.doc.units} step={1} min={0.5} /></div>
          <label className="k-check"><input type="checkbox" data-testid="wb-intermittent" checked={!!d.intermittent} onChange={(e) => st.updateFeatureDraft({ intermittent: e.target.checked ? { length: 20, pitch: 40 } : null })} /> Intermittent weld</label>
          {d.intermittent && (
            <>
              <div className="k-pm-valuerow k-tip" data-tip="Weld length"><Icon.Dimension size={14} /><NumberField value={d.intermittent.length} onChange={(v) => st.updateFeatureDraft({ intermittent: { ...d.intermittent!, length: Math.max(0.5, v) } })} unit={st.doc.units} step={5} min={0.5} /></div>
              <div className="k-pm-valuerow k-tip" data-tip="Pitch"><Icon.Pattern size={14} /><NumberField value={d.intermittent.pitch} onChange={(v) => st.updateFeatureDraft({ intermittent: { ...d.intermittent!, pitch: Math.max(1, v) } })} unit={st.doc.units} step={5} min={1} /></div>
            </>
          )}
          <label className="k-check"><input type="checkbox" checked={!!d.bothSides} onChange={(e) => st.updateFeatureDraft({ bothSides: e.target.checked })} /> Both sides</label>
          <div className="k-pm-xyrow">
            <span className="k-pm-xy k-tip" data-tip="From (start offset)">⇤</span><NumberField value={d.from} onChange={(v) => st.updateFeatureDraft({ from: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} />
            <span className="k-pm-xy k-tip" data-tip="To (end offset)">⇥</span><NumberField value={d.to} onChange={(v) => st.updateFeatureDraft({ to: Math.max(0, v) })} unit={st.doc.units} step={1} min={0} />
          </div>
          <label className="k-check"><input type="checkbox" checked={d.symbol !== undefined} onChange={(e) => st.updateFeatureDraft({ symbol: e.target.checked ? 'fillet' : undefined })} /> Define weld symbol</label>
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
