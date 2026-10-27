/** Property Panels: featurePMs (split from PropertyPanel.tsx, QA F103). */
import { bridge } from '../../viewport/bridge';
import { loadPrefs, savePrefs } from '../../prefs';
import { type ThreadFeature } from '../../../core/document/types';
import { METRIC_THREADS } from '../../../core/features/thread';
import { type ReactNode } from 'react';
import { useStore } from '../../store';
import { Button, NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { rebuildDocument } from '../../../core/features/rebuild';
import { Header } from './shared';
import { NEXT, type PMContext } from './context';

export function shellPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, multiT, setMultiT } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'shell') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title="Shell" icon={<Icon.Shell />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Parameters">
          <div className="k-pm-valuerow">
            <Icon.Dimension size={14} />
            <NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} autoFocus />
          </div>
          <p className="k-muted" style={{ margin: '4px 0' }}>Faces to remove</p>
          {d.faces.length === 0 ? (
            <p className="k-pm-message">Select the faces to remove on the model (Ctrl for more than one). None selected: closed hollow body.</p>
          ) : (
            <ul className="k-list k-pm-edgelist">
              {d.faces.map((_, i) => <li key={i}>Face&lt;{i + 1}&gt;</li>)}
            </ul>
          )}
          <label className="k-check"><input type="checkbox" data-testid="shell-outward" checked={!!d.outward} onChange={(e) => st.updateFeatureDraft({ outward: e.target.checked })} /> Shell outward</label>
          <label className="k-check"><input type="checkbox" data-testid="shell-preview" checked={!!d.preview} onChange={(e) => { st.updateFeatureDraft({ preview: e.target.checked }); if (e.target.checked !== st.detailedPreview) st.toggleDetailedPreview(); }} /> Show preview</label>
        </Section>
        <Section title="Multi-thickness Settings" defaultOpen={!!d.multi?.length}>
          <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={multiT} onChange={setMultiT} unit={st.doc.units} step={0.5} min={0.01} /></div>
          <div className={`k-selbox${st.shellPick === 'multi' ? ' k-selbox-dir' : ''}`} style={{ minHeight: 40, borderColor: '#d8a6d8' }} data-testid="shell-multi" onClick={() => useStore.setState({ shellPick: st.shellPick === 'multi' ? null : 'multi' })} title="Multi-thickness Faces: pick faces that get the thickness above">
            {d.multi?.length ? d.multi.map((m, i) => <div key={i} className="k-selbox-row">Face&lt;{d.faces.length + i + 1}&gt; ({m.thickness}{st.doc.units})<button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ multi: d.multi!.filter((_, j) => j !== i) }); }}>×</button></div>) : <span className="k-muted">Multi-thickness Faces</span>}
          </div>
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

export function helixPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'helix') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const hsk = st.doc.sketches[d.sketchId];
    const hasCircle = !!hsk && hsk.entityOrder.some((id) => hsk.entities[id].kind === 'circle');
    return (
      <>
        <Header title={d.name} icon={<Icon.Spline />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        {!hasCircle && (
          <Section title="Message">
            <p className="k-pm-message">Select a sketch that contains a circle: the helix starts on it, the axis is the sketch normal.</p>
          </Section>
        )}
        <Section title="Defined By">
          <select className="k-input" value={d.definedBy} onChange={(e) => st.updateFeatureDraft({ definedBy: e.target.value as 'pitchRevolution' })}>
            <option value="pitchRevolution">Pitch and Revolution</option>
            <option value="heightRevolution">Height and Revolution</option>
            <option value="heightPitch">Height and Pitch</option>
          </select>
        </Section>
        <Section title="Parameters">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="helixpitch" checked={!d.variable} onChange={() => st.updateFeatureDraft({ variable: undefined })} /> Constant pitch</label>
            <label className="k-check"><input type="radio" name="helixpitch" data-testid="helix-variable" checked={!!d.variable} onChange={() => { const sk2 = st.doc.sketches[d.sketchId]; const ci = sk2 && sk2.entityOrder.map((id) => sk2.entities[id]).find((e) => e.kind === 'circle') as { r: string } | undefined; const dia = ci ? 2 * sk2!.scalars[ci.r] : 20; st.updateFeatureDraft({ variable: [{ rev: 0, pitch: d.pitch, diameter: dia }, { rev: d.revolutions, pitch: d.pitch * 2, diameter: dia }] }); }} /> Variable pitch</label>
          </div>
          {d.variable && (
            <table className="k-pm-table" data-testid="helix-regions">
              <thead><tr><th>P</th><th>Rev</th><th>Dia</th><th /></tr></thead>
              <tbody>
                {d.variable.map((r, i) => (
                  <tr key={i}>
                    <td><NumberField value={r.pitch} onChange={(v) => st.updateFeatureDraft({ variable: d.variable!.map((q, j) => (j === i ? { ...q, pitch: Math.max(0.01, v) } : q)) })} step={1} /></td>
                    <td><NumberField value={r.rev} onChange={(v) => st.updateFeatureDraft({ variable: d.variable!.map((q, j) => (j === i ? { ...q, rev: Math.max(0, v) } : q)) })} step={0.5} /></td>
                    <td><NumberField value={r.diameter} onChange={(v) => st.updateFeatureDraft({ variable: d.variable!.map((q, j) => (j === i ? { ...q, diameter: Math.max(0.01, v) } : q)) })} step={1} /></td>
                    <td>{d.variable!.length > 2 && <button className="k-btn ghost icon" onClick={() => st.updateFeatureDraft({ variable: d.variable!.filter((_, j) => j !== i) })}><Icon.Trash size={12} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {d.variable && <Button onClick={() => { const last = d.variable![d.variable!.length - 1]; st.updateFeatureDraft({ variable: [...d.variable!, { ...last, rev: last.rev + 1 }] }); }}>Add region</Button>}
          {d.definedBy !== 'pitchRevolution' && (
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>H</span><NumberField value={d.height} onChange={(v) => st.updateFeatureDraft({ height: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} /></div>
          )}
          {d.definedBy !== 'heightRevolution' && (
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>P</span><NumberField value={d.pitch} onChange={(v) => st.updateFeatureDraft({ pitch: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus /></div>
          )}
          <label className="k-check"><input type="checkbox" checked={d.reverse} onChange={(e) => st.updateFeatureDraft({ reverse: e.target.checked })} /> Reverse direction</label>
          {d.definedBy !== 'heightPitch' && (
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={d.revolutions} onChange={(v) => st.updateFeatureDraft({ revolutions: Math.max(0.01, v) })} step={0.5} min={0.01} /></div>
          )}
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.startAngle} onChange={(v) => st.updateFeatureDraft({ startAngle: v })} unit="°" step={15} /></div>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="helixdir" checked={d.clockwise} onChange={() => st.updateFeatureDraft({ clockwise: true })} /> Clockwise</label>
            <label className="k-check"><input type="radio" name="helixdir" checked={!d.clockwise} onChange={() => st.updateFeatureDraft({ clockwise: false })} /> Counterclockwise</label>
          </div>
        </Section>
        <Section title="Taper Helix" defaultOpen={!!d.taper} check={!!d.taper} onCheck={(on) => st.updateFeatureDraft({ taper: on ? { angle: 5, outward: false } : undefined })}>
          {d.taper && (
            <>
              <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.taper.angle} onChange={(v) => st.updateFeatureDraft({ taper: { ...d.taper!, angle: Math.max(0, Math.min(80, v)) } })} unit="°" step={1} /></div>
              <label className="k-check"><input type="checkbox" checked={d.taper.outward} onChange={(e) => st.updateFeatureDraft({ taper: { ...d.taper!, outward: e.target.checked } })} /> Taper outward</label>
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

export function draftPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, autoFixDraft, setAutoFixDraft } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'draft') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    return (
      <>
        <Header title={d.name} icon={<Icon.Chamfer />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <div className="k-pm-tabs"><button className={autoFixDraft ? '' : 'active'} onClick={() => setAutoFixDraft(false)}>Manual</button><button className={autoFixDraft ? 'active' : ''} data-testid="draft-xpert" onClick={() => { setAutoFixDraft(true); st.updateFeatureDraft({ draftType: 'neutral' }); }}>Auto-Fix Draft</button></div>
        {autoFixDraft && (
          <Section title="Add / Change">
            <p className="k-pm-message">Auto-Fix Draft: set the angle, pick the neutral plane and the faces, then Apply. Faces that already have enough draft show green in Draft Analysis.</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="k-btn" data-testid="draft-xpert-apply" onClick={() => st.commitFeature()}>Apply</button>
              <button className="k-btn" onClick={() => st.setAnalysis({ kind: 'draft', pull: d.neutral ? (d.neutral.normal.map((x) => -x) as [number, number, number]) : [0, 1, 0], pullLabel: d.neutral?.label ?? 'Top Plane', angle: d.angle })}>Draft Analysis</button>
            </div>
          </Section>
        )}
        {!autoFixDraft && <Section title="Type of Draft">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="drafttype" checked={(d.draftType ?? 'neutral') === 'neutral'} onChange={() => st.updateFeatureDraft({ draftType: 'neutral' })} /> Neutral plane</label>
            <label className="k-check"><input type="radio" name="drafttype" data-testid="draft-parting" checked={d.draftType === 'parting'} onChange={() => { st.updateFeatureDraft({ draftType: 'parting' }); st.setDraftFocus('neutral'); }} /> Parting line</label>
            <label className="k-check"><input type="radio" name="drafttype" data-testid="draft-step" checked={d.draftType === 'step'} onChange={() => { st.updateFeatureDraft({ draftType: 'step' }); st.setDraftFocus('neutral'); }} /> Step draft</label>
          </div>
        </Section>}
        <Section title="Draft Angle">
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: Math.max(0.01, Math.min(60, v)) })} unit="°" step={0.5} min={0.01} autoFocus /></div>
        </Section>
        <Section title={(d.draftType ?? 'neutral') === 'neutral' ? 'Neutral Plane' : 'Direction of Pull'}>
          <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
            <button className={`k-pm-stylebtn k-tip ${d.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.ReverseDir size={16} /></button>
            <div className={`k-selbox ${st.draftFocus === 'neutral' ? 'k-selbox-dir' : ''}`} style={{ minHeight: 24, flex: 1 }} onClick={() => st.setDraftFocus('neutral')} data-testid="draft-neutral">
              {d.neutral ? <div className="k-selbox-row">{d.neutral.label}</div> : null}
            </div>
          </div>
        </Section>
        {(d.draftType === 'parting' || d.draftType === 'step') && (
          <Section title="Parting Lines">
            <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
              <Icon.EdgeSelect size={16} />
              <div className={`k-selbox ${st.draftFocus === 'parting' ? 'k-selbox-dir' : ''}`} style={{ minHeight: 24, flex: 1 }} onClick={() => st.setDraftFocus('parting')} data-testid="draft-partingbox">
                {d.parting ? <div className="k-selbox-row">{d.parting.label}</div> : null}
              </div>
            </div>
            {d.draftType === 'parting' && (
              <div className="k-pm-radios">
                <label className="k-check"><input type="radio" name="partsides" checked={(d.partingSides ?? 'one') === 'one'} onChange={() => st.updateFeatureDraft({ partingSides: 'one' })} /> Along the pull</label>
                <label className="k-check"><input type="radio" name="partsides" checked={d.partingSides === 'other'} onChange={() => st.updateFeatureDraft({ partingSides: 'other' })} /> Other Face</label>
                <label className="k-check"><input type="radio" name="partsides" checked={d.partingSides === 'both'} onChange={() => st.updateFeatureDraft({ partingSides: 'both' })} /> Both sides</label>
              </div>
            )}
          </Section>
        )}
        <Section title="Faces to Draft">
          <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
            <Icon.Properties size={14} />
            <div className={`k-selbox ${st.draftFocus === 'faces' ? 'k-selbox-dir' : ''}`} style={{ minHeight: 60, flex: 1 }} onClick={() => st.setDraftFocus('faces')} data-testid="draft-faces">
              {d.faces.map((x) => <div key={x.label} className="k-selbox-row">{x.label}</div>)}
            </div>
          </div>
          <div className="k-pm-label">Face propagation:</div>
          <select className="k-input" data-testid="draft-propagation" value={d.propagation ?? 'none'} onChange={(e) => st.updateFeatureDraft({ propagation: e.target.value as 'none' })}>
            <option value="none">None</option><option value="tangent">Along Tangent</option><option value="all">All Faces</option><option value="inner">Inner Faces</option><option value="outer">Outer Faces</option>
          </select>
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

export function threadPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st, threadFavs, setThreadFavs, threadFav, setThreadFav } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'thread') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const internal = !!d.edge?.internal;
    const pick = (name: string) => {
      const t = METRIC_THREADS.find((x) => x[0] === name);
      if (t) st.updateFeatureDraft({ size: t[0], diameter: t[1], pitch: t[2], name: d.name.replace(/^M[\d.x]+ /, `${t[0]} `) });
    };
    return (
      <>
        <Header title="Thread" icon={<Icon.Hole />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Favorite">
          {/* Favorites, by design: apply defaults, add/update, delete, save to a file, load from a file; the list below */}
          <div className="k-pm-stylerow" style={{ justifyContent: 'center' }}>
            <button className="k-pm-stylebtn k-tip" data-tip="Apply Defaults / No Favorites" data-testid="thread-fav-default" onClick={() => { setThreadFav(''); pick(d.size); st.updateFeatureDraft({ method: 'cut', mirrorProfile: false, rightHand: true, starts: 1, trimStart: false, trimEnd: false }); }}><Icon.Undo size={14} /></button>
            <button className="k-pm-stylebtn k-tip" data-tip="Add or Update Favorite" data-testid="thread-fav-add" onClick={() => { const { id: _i, name: _n, edge: _e, upTo: _u, ...rest } = d; void _i; void _n; void _e; void _u; const name = `${d.size} ${d.method === 'cut' ? 'cut' : 'extruded'} ${d.length}`; const list = { ...threadFavs, [name]: rest }; savePrefs({ ...loadPrefs(), 'thread.favorites': JSON.stringify(list) }); setThreadFavs(list); setThreadFav(name); st.pushMessage(`Favorite "${name}" saved.`); }}><Icon.Plus size={14} /></button>
            <button className="k-pm-stylebtn k-tip" data-tip="Delete Favorite" disabled={!threadFav} onClick={() => { const list = { ...threadFavs }; delete list[threadFav]; savePrefs({ ...loadPrefs(), 'thread.favorites': JSON.stringify(list) }); setThreadFavs(list); setThreadFav(''); }}><Icon.Trash size={14} /></button>
            <button className="k-pm-stylebtn k-tip" data-tip="Save Favorite" disabled={!threadFav} onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ [threadFav]: threadFavs[threadFav] }, null, 2)], { type: 'application/json' })); a.download = `${threadFav}.json`; a.click(); }}><Icon.Save size={14} /></button>
            <button className="k-pm-stylebtn k-tip" data-tip="Load Favorite" onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = async () => { const file = inp.files?.[0]; if (!file) return; try { const add = JSON.parse(await file.text()) as Record<string, Partial<ThreadFeature>>; const list = { ...threadFavs, ...add }; savePrefs({ ...loadPrefs(), 'thread.favorites': JSON.stringify(list) }); setThreadFavs(list); const n = Object.keys(add)[0] ?? ''; setThreadFav(n); if (add[n]) st.updateFeatureDraft(add[n]); } catch { st.pushMessage('This file is not a thread favorite.', 'error'); } }; inp.click(); }}><Icon.Open size={14} /></button>
          </div>
          <div>
            <select className="k-input" data-testid="thread-fav" value={threadFav} onChange={(e) => { const n = e.target.value; setThreadFav(n); const f = threadFavs[n]; if (f) st.updateFeatureDraft(f); }}>
              <option value="">No Favorite Selected</option>
              {Object.keys(threadFavs).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </Section>
        <Section title="Thread Location">
          {/* the two selection boxes of the intended design: the start edge (blue tag) and an optional start face (purple tag) */}
          <div className="k-pm-selrow k-tip" data-tip="Edge: a circular edge of a cylinder or hole">
            <Icon.Circle size={18} />
            <div className="k-pm-colorbox active" style={{ ['--tag' as string]: '#5aa8f0' }} data-testid="thread-edge"><i />{d.edge ? d.edge.label : ''}</div>
          </div>
          <div className="k-pm-selrow k-tip" data-tip="Optional start face">
            <Icon.Sheet size={18} />
            <div className={`k-pm-colorbox${st.threadFacePick ? ' active' : ''}`} style={{ ['--tag' as string]: '#7a12e0' }} data-testid="thread-startface" onClick={() => useStore.setState({ threadFacePick: !st.threadFacePick })}><i />{d.startFace?.label ?? ''}{d.startFace && <button className="k-btn ghost icon" style={{ marginLeft: 'auto' }} title="Clear" onClick={(e) => { e.stopPropagation(); st.updateFeatureDraft({ startFace: null }); }}>×</button>}</div>
          </div>
          {!d.edge && <p className="k-pm-message" style={{ marginTop: 4 }}>Select a circular edge of a cylinder or hole.</p>}
          <label className="k-check"><input type="checkbox" checked={d.offset} onChange={(e) => st.updateFeatureDraft({ offset: e.target.checked, offsetDistance: d.offsetDistance ?? 2 })} /> Offset</label>
          {d.offset && <div className="k-pm-valuerow k-tip" data-tip="Offset distance"><Icon.Dimension size={14} /><NumberField value={d.offsetDistance ?? 0} onChange={(v) => st.updateFeatureDraft({ offsetDistance: v })} unit={st.doc.units} step={0.5} /></div>}
          <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle} onChange={(v) => st.updateFeatureDraft({ angle: v })} unit="deg" step={15} /></div>
        </Section>
        <Section title="End Condition">
          <div className="k-pm-selrow">
          <button className={`k-pm-revbtn k-tip${d.reverse ? ' active' : ''}`} data-tip="Reverse Direction" data-testid="thread-reverse" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Flip size={16} /></button>
          <select className="k-input" data-testid="thread-end" value={d.endCondition ?? 'blind'} onChange={(e) => {
            const v = e.target.value as 'blind' | 'revolutions' | 'upTo';
            if (v === 'upTo') {
              const sf = st.selectedFace;
              const b = sf ? st.rebuild.bodies.find((x) => x.id === sf.bodyId) : undefined;
              const fc = b?.faces.find((x) => x.id === sf?.faceId);
              if (!fc || fc.curved) { st.pushMessage('Up To Selection: select the planar end face first, then choose Up To Selection.', 'warn'); return; }
              st.updateFeatureDraft({ endCondition: 'upTo', upTo: { normal: fc.normal, point: fc.centroid, label: `Face<${b!.faces.indexOf(fc) + 1}>` } });
            } else st.updateFeatureDraft({ endCondition: v, revolutions: d.revolutions ?? 5 });
          }}><option value="blind">Blind</option><option value="revolutions">Revolutions</option><option value="upTo">Up To Selection</option></select>
          </div>
          {(d.endCondition ?? 'blind') === 'blind' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(d.pitch, v) })} unit={st.doc.units} step={1} min={0.5} autoFocus /></div>}
          {d.endCondition === 'revolutions' && <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={d.revolutions ?? 5} onChange={(v) => st.updateFeatureDraft({ revolutions: Math.max(0.5, v) })} step={0.5} /></div>}
          {d.endCondition === 'upTo' && <div className="k-selbox" style={{ minHeight: 24 }}><div className="k-selbox-row"><Icon.Sheet size={12} /> {d.upTo?.label}</div></div>}
        </Section>
        <Section title="Specification">
          <div className="k-pm-label">Type:</div>
          <div><select className="k-input" value={(d.internalOverride ?? internal) ? 'Metric Tap' : 'Metric Die'} onChange={(e) => st.updateFeatureDraft({ internalOverride: e.target.value === 'Metric Tap' })}><option>Metric Die</option><option>Metric Tap</option></select></div>
          <div className="k-pm-label">Size:</div>
          <div><select className="k-input" value={d.size} onChange={(e) => pick(e.target.value)} data-testid="thread-size">
            {METRIC_THREADS.map((t) => <option key={t[0]} value={t[0]}>{t[0]}</option>)}
          </select></div>
          {/* the diameter and pitch follow the size (grey) until their Override button is pressed, by design */}
          <div className="k-pm-valuerow"><button className={`k-pm-revbtn k-tip${d.overrideDiameter ? ' active' : ''}`} data-tip="Override Diameter" data-testid="thread-ovr-dia" onClick={() => { if (d.overrideDiameter) pick(d.size); st.updateFeatureDraft({ overrideDiameter: !d.overrideDiameter }); }}><Icon.Circle size={14} /></button><NumberField value={d.diameter} disabled={!d.overrideDiameter} onChange={(v) => st.updateFeatureDraft({ diameter: Math.max(0.5, v) })} unit={st.doc.units} step={0.5} /></div>
          <div className="k-pm-valuerow"><button className={`k-pm-revbtn k-tip${d.overridePitch ? ' active' : ''}`} data-tip="Override Pitch" data-testid="thread-ovr-pitch" onClick={() => { if (d.overridePitch) pick(d.size); st.updateFeatureDraft({ overridePitch: !d.overridePitch }); }}><Icon.Pattern size={14} /></button><NumberField value={d.pitch} disabled={!d.overridePitch} onChange={(v) => st.updateFeatureDraft({ pitch: Math.max(0.1, v) })} unit={st.doc.units} step={0.05} /></div>
          <div className="k-pm-label">Thread method:</div>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="thm" checked={d.method === 'cut'} onChange={() => st.updateFeatureDraft({ method: 'cut' })} /> Cut thread</label>
            <label className="k-check"><input type="radio" name="thm" checked={d.method === 'extrude'} onChange={() => st.updateFeatureDraft({ method: 'extrude' })} /> Extrude thread</label>
          </div>
          <div><label className="k-check"><input type="checkbox" checked={!!d.mirrorProfile} onChange={(e) => st.updateFeatureDraft({ mirrorProfile: e.target.checked })} /> Mirror Profile</label></div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><button className="k-btn" style={{ marginTop: 4 }} disabled={!d.edge} onClick={() => { const cam = bridge.camera; if (cam && d.edge) { cam.target.set(...d.edge.center); cam.scale = Math.min(cam.scale, Math.max(0.02, (d.diameter * 3) / 600)); cam.update(); } st.pushMessage('Locate Profile: zoomed to the start of the thread (' + (d.edge?.label ?? '') + ').'); }}>Locate Profile</button></div>
        </Section>
        <Section title="Thread Options">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="thh" checked={d.rightHand} onChange={() => st.updateFeatureDraft({ rightHand: true })} /> Right-hand thread</label>
            <label className="k-check"><input type="radio" name="thh" checked={!d.rightHand} onChange={() => st.updateFeatureDraft({ rightHand: false })} /> Left-hand thread</label>
          </div>
          <label className="k-check"><input type="checkbox" checked={(d.starts ?? 1) > 1} onChange={(e) => st.updateFeatureDraft({ starts: e.target.checked ? 2 : 1 })} /> Multiple Start</label>
          {(d.starts ?? 1) > 1 && <div className="k-pm-valuerow k-tip" data-tip="Number of starts"><Icon.Pattern size={14} /><NumberField value={d.starts ?? 2} onChange={(v) => st.updateFeatureDraft({ starts: Math.max(2, Math.min(6, Math.round(v))) })} step={1} /></div>}
          <label className="k-check"><input type="checkbox" checked={!!d.trimStart} onChange={(e) => st.updateFeatureDraft({ trimStart: e.target.checked })} /> Trim with start face</label>
          <label className="k-check"><input type="checkbox" checked={!!d.trimEnd} onChange={(e) => st.updateFeatureDraft({ trimEnd: e.target.checked })} /> Trim with end face</label>
        </Section>
        <Section title="Preview Options" defaultOpen={false}>
          <label className="k-check"><input type="radio" name="thp" data-testid="thread-shaded" checked={d.previewMode === 'shaded'} onChange={() => st.updateFeatureDraft({ previewMode: 'shaded' })} /> Shaded preview</label>
          <label className="k-check"><input type="radio" name="thp" checked={(d.previewMode ?? 'wireframe') === 'wireframe'} onChange={() => st.updateFeatureDraft({ previewMode: 'wireframe' })} /> Wireframe preview</label>
          <label className="k-check"><input type="radio" name="thp" checked={d.previewMode === 'partial'} onChange={() => st.updateFeatureDraft({ previewMode: 'partial' })} /> Partial preview</label>
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

export function wrapPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'wrap') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const sketches = st.doc.features.filter((f): f is import('../../../core/document/types').SketchFeature => f.type === 'sketch');
    return (
      <>
        <Header title="Wrap" icon={<Icon.Revolve />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Wrap Type">
          <div className="k-pm-stylerow">
            {([['emboss', 'Emboss'], ['deboss', 'Deboss'], ['scribe', 'Scribe']] as const).map(([k, tip]) => (
              <button key={k} className={`k-pm-stylebtn k-tip ${d.kind === k ? 'active' : ''}`} data-tip={tip} data-testid={`wrap-${k}`} onClick={() => st.updateFeatureDraft({ kind: k })}><Icon.Revolve size={14} /></button>
            ))}
          </div>
        </Section>
        <Section title="Wrap Method">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="wrapm" checked={(d.method ?? 'analytical') === 'analytical'} onChange={() => st.updateFeatureDraft({ method: 'analytical' })} /> Analytical</label>
            <label className="k-check"><input type="radio" name="wrapm" data-testid="wrap-spline" checked={d.method === 'spline'} onChange={() => st.updateFeatureDraft({ method: 'spline' })} /> Spline Surface</label>
          </div>
        </Section>
        <Section title="Wrap Parameters">
          {d.method === 'spline'
            ? <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wrap-face">{d.splineFace ? <div className="k-selbox-row"><Icon.Properties size={12} /> {d.splineFace.label}</div> : <span className="k-muted">Select the face to wrap onto (any face).</span>}</div>
            : <div className="k-selbox" style={{ minHeight: 24 }} data-testid="wrap-face">{d.face ? <div className="k-selbox-row"><Icon.Revolve size={12} /> {d.face.label}</div> : <span className="k-muted">Select a cylindrical face.</span>}</div>}
          {d.kind !== 'scribe' && <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.depth} onChange={(v) => st.updateFeatureDraft({ depth: Math.max(0.01, v) })} unit={st.doc.units} step={0.5} min={0.01} autoFocus /></div>}
          <div className="k-field"><label>Source Sketch</label>
            <select className="k-input" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })} data-testid="wrap-sketch">
              <option value="">—</option>
              {sketches.map((s) => <option key={s.sketchId} value={s.sketchId}>{s.name}</option>)}
            </select>
          </div>
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

export function studPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'stud') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const SIZES: [string, number, number][] = [['M3', 3, 0.5], ['M4', 4, 0.7], ['M5', 5, 0.8], ['M6', 6, 1], ['M8', 8, 1.25], ['M10', 10, 1.5], ['M12', 12, 1.75], ['M16', 16, 2], ['M20', 20, 2.5]];
    return (
      <>
        <Header title="Stud Tool" icon={<Icon.Hole />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Stud">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="studkind" checked={d.onCylinder === undefined} onChange={() => st.updateFeatureDraft({ onCylinder: undefined })} /> Create stud on surface</label>
            <label className="k-check"><input type="radio" name="studkind" data-testid="stud-cylinder" checked={d.onCylinder !== undefined} onChange={() => st.updateFeatureDraft({ onCylinder: null })} /> Apply to cylindrical body</label>
          </div>
          {d.onCylinder !== undefined && <div className="k-selbox" style={{ minHeight: 24 }} data-testid="stud-cylface">{d.onCylinder ? <div className="k-selbox-row"><Icon.Revolve size={12} /> {d.onCylinder.label}</div> : <span className="k-muted">Select the cylindrical face of the body.</span>}</div>}
        </Section>
        <Section title="Standard">
          <select className="k-input" value={d.standard ?? 'ISO'} onChange={(e) => st.updateFeatureDraft({ standard: e.target.value as 'ISO' })}><option>ISO</option><option>DIN</option></select>
          <div className="k-pm-label">Type:</div>
          <select className="k-input"><option>Machine Threads</option></select>
          <div className="k-pm-label">Size:</div>
          <select className="k-input" data-testid="stud-size" value={d.size} onChange={(e) => { const z = SIZES.find((x) => x[0] === e.target.value)!; st.updateFeatureDraft({ size: z[0], diameter: z[1], pitch: z[2] }); }}>
            {SIZES.map((z) => <option key={z[0]}>{z[0]}</option>)}
          </select>
        </Section>
        <Section title="Stud Parameters">
          <div className="k-pm-valuerow k-tip" data-tip="Stud Length"><Icon.Dimension size={14} /><NumberField value={d.length} onChange={(v) => st.updateFeatureDraft({ length: Math.max(0.5, v) })} unit={st.doc.units} step={1} autoFocus /></div>
          <div className="k-pm-valuerow k-tip" data-tip="Thread Length"><Icon.Arrow size={14} /><NumberField value={d.threadLength} onChange={(v) => st.updateFeatureDraft({ threadLength: Math.max(0, v) })} unit={st.doc.units} step={1} /></div>
          <div className="k-pm-sub">Position on the face</div>
          <div className="k-pm-xyrow">
            <span className="k-pm-xy">x</span><NumberField value={d.point.x} onChange={(v) => st.updateFeatureDraft({ point: { ...d.point, x: v } })} step={1} />
            <span className="k-pm-xy">y</span><NumberField value={d.point.y} onChange={(v) => st.updateFeatureDraft({ point: { ...d.point, y: v } })} step={1} />
          </div>
        </Section>
        <Section title="Thread">
          <label className="k-check"><input type="checkbox" data-testid="stud-cosmetic" checked={d.cosmetic !== false} onChange={(e) => st.updateFeatureDraft({ cosmetic: e.target.checked })} /> Cosmetic thread</label>
          <div className="k-field"><label>Pitch</label><span>{d.pitch} mm</span></div>
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

export function splitLinePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && (st.featureEdit.draft.type === 'splitLine' || st.featureEdit.draft.type === 'projectedCurve')) {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const split = d.type === 'splitLine';
    return (
      <>
        <Header title={split ? 'Split Line' : 'Projected Curve'} icon={split ? <Icon.Line /> : <Icon.Spline />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Type of Split">
          <div className="k-pm-radios">
            {split ? (
              <>
                <label className="k-check"><input type="radio" name="splittype" data-testid="split-silhouette" checked={d.splitType === 'silhouette'} onChange={() => st.updateFeatureDraft({ splitType: 'silhouette', plane: d.plane ?? 'top' })} /> Silhouette</label>
                <label className="k-check"><input type="radio" name="splittype" checked={(d.splitType ?? 'projection') === 'projection'} onChange={() => st.updateFeatureDraft({ splitType: 'projection' })} /> Projection</label>
                <label className="k-check"><input type="radio" name="splittype" data-testid="split-intersection" checked={d.splitType === 'intersection'} onChange={() => st.updateFeatureDraft({ splitType: 'intersection', plane: d.plane ?? 'top' })} /> Intersection</label>
              </>
            ) : (
              <>
                <label className="k-check"><input type="radio" name="projtype" data-testid="proj-onsketch" checked={!!d.onSketch} onChange={() => st.updateFeatureDraft({ onSketch: true })} /> Sketch on sketch</label>
                <label className="k-check"><input type="radio" name="projtype" checked={!d.onSketch} onChange={() => st.updateFeatureDraft({ onSketch: false })} /> Sketch on faces</label>
              </>
            )}
          </div>
        </Section>
        <Section title="Selections">
          <div className="k-field"><label>Sketch to project</label>
            <select className="k-input" data-testid="curvefeat-sketch" value={d.sketchId} onChange={(e) => st.updateFeatureDraft({ sketchId: e.target.value })}>
              <option value="">Select a sketch…</option>
              {st.doc.features.filter((f) => f.type === 'sketch').map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
            </select>
          </div>
          {split && d.type === 'splitLine' && d.splitType && d.splitType !== 'projection' && (
            <div className="k-field"><label>{d.splitType === 'silhouette' ? 'Direction of Pull' : 'Splitting Plane'}</label>
              <select className="k-input" data-testid="split-plane" value={d.plane ?? ''} onChange={(e) => st.updateFeatureDraft({ plane: e.target.value })}><option value="">Select a plane…</option><option value="front">Front Plane</option><option value="top">Top Plane</option><option value="right">Right Plane</option>{Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </div>
          )}
          {!split && d.type === 'projectedCurve' && d.onSketch && (
            <div className="k-field"><label>Second sketch</label>
              <select className="k-input" data-testid="proj-sketch2" value={d.sketchId2 ?? ''} onChange={(e) => st.updateFeatureDraft({ sketchId2: e.target.value })}>
                <option value="">Select a sketch…</option>
                {st.doc.features.filter((f) => f.type === 'sketch' && (f as { sketchId: string }).sketchId !== d.sketchId).map((f) => <option key={f.id} value={(f as { sketchId: string }).sketchId}>{f.name}</option>)}
              </select>
            </div>
          )}
          <div className="k-field"><label>{split ? 'Faces to Split' : 'Projection faces'}</label><div className="k-selbox" style={{ minHeight: 24 }}><span className="k-muted">{split && d.type === 'splitLine' && d.splitType === 'silhouette' ? 'The faces that turn away from the direction of pull' : split && d.type === 'splitLine' && d.splitType === 'intersection' ? 'All faces the plane cuts' : 'All faces the projection crosses'}</span></div></div>
          {!split && d.type === 'projectedCurve' && !d.onSketch && <label className="k-check"><input type="checkbox" checked={!!d.reverse} onChange={(e) => st.updateFeatureDraft({ reverse: e.target.checked })} /> Reverse projection</label>}
          {split && d.type === 'splitLine' && (d.splitType ?? 'projection') === 'projection' && <label className="k-check"><input type="checkbox" data-testid="split-single" checked={!!d.single} onChange={(e) => st.updateFeatureDraft({ single: e.target.checked })} /> Single direction</label>}
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

export function moveBodyPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'moveBody') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return b ? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? id : id; };
    const bodies = st.featureEdit.featureId ? rebuildDocument(st.doc, st.doc.features.findIndex((f) => f.id === st.featureEdit!.featureId)).bodies : st.rebuild.bodies;
    const vec = (key: 'translate' | 'rotate' | 'origin', labels: [string, string, string], unit: string) => labels.map((label, i) => (
      <div key={label} className="k-pm-valuerow" data-testid={`move-${key}-${i}`}>
        <span className="k-muted" style={{ minWidth: 28 }}>{label}</span>
        <NumberField value={d[key][i]} unit={unit} onChange={(v) => { const next = [...d[key]] as [number, number, number]; next[i] = v; st.updateFeatureDraft({ [key]: next } as never); }} />
      </div>
    ));
    return (
      <>
        <Header title={d.name} icon={<Icon.MoveComponent />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Bodies to Move/Copy">
          <div className="k-selbox" style={{ minHeight: 28 }}>
            {bodies.map((b) => (
              <label key={b.id} className="k-check">
                <input type="checkbox" checked={d.bodies.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...d.bodies, b.id] : d.bodies.filter((x) => x !== b.id) })} /> {bodyName(b.id)}
              </label>
            ))}
          </div>
          <label className="k-check" style={{ marginTop: 6 }}><input type="checkbox" data-testid="move-copy" checked={d.copy} onChange={(e) => st.updateFeatureDraft({ copy: e.target.checked })} /> Copy</label>
          {d.copy && <div className="k-pm-valuerow" data-testid="move-copies"><span className="k-muted" style={{ minWidth: 28 }}>#</span><NumberField value={d.copies} step={1} min={1} onChange={(v) => st.updateFeatureDraft({ copies: Math.max(1, Math.min(250, Math.round(v))) })} /></div>}
        </Section>
        <Section title="Translate">{vec('translate', ['ΔX', 'ΔY', 'ΔZ'], 'mm')}</Section>
        <Section title="Rotate">
          <div className="k-pm-label">Rotation origin</div>
          {vec('origin', ['X', 'Y', 'Z'], 'mm')}
          <div className="k-pm-label">Angles</div>
          {vec('rotate', ['X', 'Y', 'Z'], '°')}
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

export function combinePM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'combine') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const bodyName = (id: string) => { const b = st.rebuild.bodies.find((x) => x.id === id); return b ? st.doc.features.find((f) => f.id === b.featureIds[b.featureIds.length - 1])?.name ?? id : id; };
    const bodies = st.featureEdit.featureId ? rebuildDocument(st.doc, st.doc.features.findIndex((f) => f.id === st.featureEdit!.featureId)).bodies : st.rebuild.bodies;
    return (
      <>
        <Header title={d.name} icon={<Icon.Combine />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Operation Type">
          <div className="k-pm-radios">
            {([['add', 'Add'], ['subtract', 'Subtract'], ['common', 'Common']] as const).map(([v, label]) => (
              <label key={v} className="k-check"><input type="radio" name="combop" checked={d.op === v} onChange={() => st.updateFeatureDraft({ op: v })} /> {label}</label>
            ))}
          </div>
        </Section>
        {d.op === 'subtract' && (
          <Section title="Main Body">
            <select className="k-input" value={d.mainBody ?? ''} onChange={(e) => st.updateFeatureDraft({ mainBody: e.target.value || undefined })}>
              <option value="">Select the main body…</option>
              {bodies.map((b) => <option key={b.id} value={b.id}>{bodyName(b.id)}</option>)}
            </select>
          </Section>
        )}
        <Section title={d.op === 'subtract' ? 'Bodies to Subtract' : 'Bodies to Combine'}>
          <div className="k-selbox" style={{ minHeight: 28 }}>
            {bodies.map((b) => (
              <label key={b.id} className="k-check">
                <input type="checkbox" checked={d.bodies.includes(b.id)} onChange={(e) => st.updateFeatureDraft({ bodies: e.target.checked ? [...d.bodies, b.id] : d.bodies.filter((x) => x !== b.id) })} /> {bodyName(b.id)}
              </label>
            ))}
          </div>
          <button className="k-btn" style={{ marginTop: 6 }} onClick={() => st.pushMessage('The result is shown after OK.')}>Show Preview</button>
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

export function ribPM(ctx: PMContext): ReactNode | typeof NEXT {
  const { st } = ctx;
  if (st.featureEdit && st.featureEdit.draft.type === 'rib') {
    const d = st.featureEdit.draft;
    const err = st.rebuild.errors[d.id];
    const rsk = st.doc.sketches[d.sketchId];
    return (
      <>
        <Header title={d.name} icon={<Icon.Rib />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
        <Section title="Parameters">
          <p className="k-muted" style={{ margin: '0 0 2px' }}>Thickness:</p>
          <div className="k-pm-radios" style={{ flexDirection: 'row', gap: 4 }}>
            {([['first', 'First Side'], ['both', 'Both Sides'], ['second', 'Second Side']] as const).map(([v, tip]) => (
              <button key={v} className={`k-btn icon k-tip ${d.side === v ? 'active' : ''}`} data-tip={tip} onClick={() => st.updateFeatureDraft({ side: v })}>
                <Icon.RibSide side={v} size={16} />
              </button>
            ))}
          </div>
          <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
            <Icon.Dimension size={14} />
            <NumberField value={d.thickness} onChange={(v) => st.updateFeatureDraft({ thickness: Math.max(0.01, v) })} unit={st.doc.units} step={1} min={0.01} autoFocus />
          </div>
          <p className="k-muted" style={{ margin: '4px 0 2px' }}>Extrusion direction:</p>
          <div className="k-pm-radios" style={{ flexDirection: 'row', gap: 4 }}>
            <button className={`k-btn icon k-tip ${d.direction === 'parallel' ? 'active' : ''}`} data-tip="Parallel to Sketch" onClick={() => st.updateFeatureDraft({ direction: 'parallel' })}><Icon.RibDir dir="parallel" size={16} /></button>
            <button className={`k-btn icon k-tip ${d.direction === 'normal' ? 'active' : ''}`} data-tip="Normal to Sketch" onClick={() => st.updateFeatureDraft({ direction: 'normal' })}><Icon.RibDir dir="normal" size={16} /></button>
          </div>
          <label className="k-check"><input type="checkbox" checked={d.flip} onChange={(e) => st.updateFeatureDraft({ flip: e.target.checked })} /> Flip material side</label>
          <div className="k-pm-valuerow">
            <Icon.Chamfer size={14} />
            <NumberField value={d.draft} onChange={(v) => st.updateFeatureDraft({ draft: Math.max(0, Math.min(45, v)) })} unit="°" step={1} min={0} />
            <label className="k-check" style={{ marginLeft: 4 }}><input type="checkbox" data-testid="rib-draft-outward" disabled={!d.draft} checked={!!d.draftOutward} onChange={(e) => st.updateFeatureDraft({ draftOutward: e.target.checked })} /> Draft outward</label>
          </div>
        </Section>
        <Section title="Selected Contours" defaultOpen={false}>
          <div className="k-selbox" style={{ minHeight: 24 }}>{rsk ? <div className="k-selbox-row"><Icon.Sketch size={12} /> {rsk.name}</div> : <span className="k-muted">Select the sketch of the rib.</span>}</div>
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
