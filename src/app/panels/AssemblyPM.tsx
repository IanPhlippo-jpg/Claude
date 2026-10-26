import { useEffect, useState } from 'react';
import { mateRefCount, STANDARD_MATES, useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import type { Document, MateType } from '../../core/document/types';
import { configurations } from '../../core/document/configurations';
import { openFileDialog } from '../MenuBar';
import { getPref, loadPrefs, savePrefs } from '../prefs';

/** Property Panel header (same look as the feature Property Panels). */
function Header({ title, icon, onOk, onCancel, extra }: { title: string; icon: React.ReactNode; onOk?: () => void; onCancel: () => void; extra?: React.ReactNode }) {
  return (
    <div className="k-pm-head">
      <div className="k-pm-title">
        {icon} <b>{title}</b>
        <span className="grow" />
        <span className="k-pm-help" title="Help">?</span>
      </div>
      <div className="k-pm-buttons">
        {onOk && <button className="k-pm-ok k-tip" data-tip="OK" onClick={onOk}><Icon.Check /></button>}
        <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={onCancel}><Icon.Close /></button>
        {extra}
      </div>
    </div>
  );
}

/** Mate Property Panel by design: Mate Selections, Standard Mates, alignment, Mates list, Options. */
const MATE_LABEL: Record<string, string> = { coincident: 'Coincident', parallel: 'Parallel', perpendicular: 'Perpendicular', tangent: 'Tangent', concentric: 'Concentric', lock: 'Lock', distance: 'Distance', angle: 'Angle', profileCenter: 'Profile Center', symmetric: 'Symmetric', width: 'Width', path: 'Path Mate', linearCoupler: 'Linear/Linear Coupler', distanceLimit: 'Distance (limit)', angleLimit: 'Angle (limit)', cam: 'Cam', slot: 'Slot', hinge: 'Hinge', gear: 'Gear', rackPinion: 'Rack Pinion', screw: 'Screw', universalJoint: 'Universal Joint' };

/**
 * Mate Property Panel as the reference CAD workflow: tabs Advanced / Analysis over Standard / Mechanical, Mate Selections,
 * Mate Type (Coincident … Lock with Lock rotation under Concentric, Distance and Angle as value rows, Mate alignment),
 * Mates, Options; the title names the mate being made (Concentric3); ✓ ✗ ↶ (undo the last selection) and the push pin.
 */
/** The values of the advanced and mechanical mates: what to select, limits, ratio, pitch. */
function MateParams() {
  const st = useStore(useShallow((s) => ({ mateEdit: s.mateEdit, updateMateDraft: s.updateMateDraft, doc: s.doc })));
  const d = st.mateEdit?.draft;
  if (!d || STANDARD_MATES.has(d.type)) return null;
  const n = mateRefCount(d.type);
  const ask: Record<string, string> = {
    profileCenter: 'Select two faces (their centres line up).',
    symmetric: 'Select two entities, then the symmetry plane.',
    width: 'Select the two width faces, then the two tab faces.',
    path: 'Select the path (a cylinder axis or face normal) and the face that follows it.',
    linearCoupler: 'Select a face of each component: its normal is the direction of travel.',
    distanceLimit: 'Select two faces; the distance stays between the limits.',
    angleLimit: 'Select two faces; the angle stays between the limits.',
    cam: 'Select the cam face and the follower face.',
    slot: 'Select the two sides of the slot, then the pin.',
    hinge: 'Select the two cylindrical faces, then two faces to keep coincident.',
    gear: 'Select a cylindrical face of each gear.',
    rackPinion: 'Select the pinion cylinder, then a face of the rack (its normal is the rack travel).',
    screw: 'Select the cylindrical face of the screw and of the nut.',
    universalJoint: 'Select the cylindrical faces of both shafts.',
  };
  return (
    <div className="k-mate-params" data-testid="mate-params">
      <p className="k-pm-message">{ask[d.type]} ({d.refs.length}/{n})</p>
      {(d.type === 'distanceLimit' || d.type === 'angleLimit') && (
        <>
          <div className="k-field"><label>Maximum</label><NumberField value={d.max ?? (d.type === 'angleLimit' ? 90 : 20)} onChange={(v) => st.updateMateDraft({ max: v })} unit={d.type === 'angleLimit' ? '°' : st.doc.units} step={1} /></div>
          <div className="k-field"><label>Minimum</label><NumberField value={d.min ?? 0} onChange={(v) => st.updateMateDraft({ min: v })} unit={d.type === 'angleLimit' ? '°' : st.doc.units} step={1} /></div>
        </>
      )}
      {d.type === 'path' && <div className="k-field"><label>Distance along path</label><NumberField value={d.value ?? 0} onChange={(v) => st.updateMateDraft({ value: v })} unit={st.doc.units} step={1} /></div>}
      {(d.type === 'gear' || d.type === 'linearCoupler') && <div className="k-field"><label>Ratio</label><NumberField value={d.ratio ?? 1} onChange={(v) => st.updateMateDraft({ ratio: v })} step={0.1} /></div>}
      {(d.type === 'screw' || d.type === 'rackPinion') && <div className="k-field"><label>{d.type === 'screw' ? 'Distance/revolution' : 'Rack travel/revolution'}</label><NumberField value={d.pitch ?? (d.type === 'screw' ? 1 : 31.42)} onChange={(v) => st.updateMateDraft({ pitch: v })} unit={st.doc.units} step={0.25} /></div>}
    </div>
  );
}

export function MatePM() {
  const st = useStore(useShallow((s) => ({ mateEdit: s.mateEdit, doc: s.doc, updateMateDraft: s.updateMateDraft, commitMate: s.commitMate, cancelMate: s.cancelMate, removeMateRef: s.removeMateRef, editMate: s.editMate, mateOpts: s.mateOpts })));
  const [tab, setTab] = useState<'standard' | 'advanced' | 'mechanical' | 'analysis'>('standard');
  const [pinned, setPinned] = useState(false);
  const me = st.mateEdit;
  const [firstTransparent, setFirstTransparent] = useState(getPref<boolean>('assembly.mateFirstTransparent') !== false);
  if (!me) return null;
  const d = me.draft;
  const ready = d.refs.length === mateRefCount(d.type);
  const bothCyl = d.refs.length === 2 && d.refs.every((r) => r.cylindrical);
  const anyCyl = d.refs.some((r) => r.cylindrical);
  const allowed = (t: MateType) => {
    if (!STANDARD_MATES.has(t)) return true;
    if (t === 'concentric') return !ready || bothCyl;
    if (t === 'tangent') return !ready || anyCyl;
    if (t === 'coincident' || t === 'distance' || t === 'parallel' || t === 'perpendicular' || t === 'angle') return !ready || !bothCyl;
    return true;
  };
  const nextNo = (st.doc.mates ?? []).filter((m) => m.type === d.type).length + 1;
  const title = me.mateId ? d.name : ready ? `${MATE_LABEL[d.type] ?? 'Mate'}${nextNo}` : 'Mate';
  const typeBtn = (t: MateType, icon: React.ReactNode) => (
    <button key={t} className={`k-mate-type ${d.type === t ? 'active' : ''}`} disabled={!allowed(t)} onClick={() => st.updateMateDraft({ type: t })}>
      <span className="k-mate-ico">{icon}</span> <span>{MATE_LABEL[t]}</span>
    </button>
  );
  return (
    <div className="k-pm" data-testid="mate-pm">
      <Header title={title} icon={<Icon.Mate />} onOk={ready ? () => st.commitMate(pinned) : undefined} onCancel={st.cancelMate} extra={
        <>
          <button className="k-pm-pin k-tip" data-tip="Undo" disabled={!d.refs.length} onClick={() => st.removeMateRef(d.refs.length - 1)}><Icon.Undo size={14} /></button>
          <button className={`k-pm-pin k-tip ${pinned ? 'active' : ''}`} data-tip="Keep Visible" onClick={() => setPinned((p) => !p)}><Icon.Pin /></button>
        </>
      } />
      <div className="k-mate-tabs">
        <button className={tab === 'advanced' ? 'active' : ''} onClick={() => setTab('advanced')}><Icon.Mate size={13} /> Advanced</button>
        <button className={tab === 'analysis' ? 'active' : ''} data-testid="mate-analysis" onClick={() => setTab('analysis')}><Icon.Measure size={13} /> Analysis</button>
        <button className={tab === 'standard' ? 'active' : ''} onClick={() => setTab('standard')}><Icon.MateCoincident size={13} /> Standard</button>
        <button className={tab === 'mechanical' ? 'active' : ''} onClick={() => setTab('mechanical')}><Icon.MateTangent size={13} /> Mechanical</button>
      </div>
      <Section title="Mate Selections">
        <div className="k-pm-valuerow" style={{ alignItems: 'flex-start' }}>
          <Icon.Plane size={14} />
          <div className="k-selbox k-selbox-dir" style={{ minHeight: 40 }} data-testid="mate-selections">
            {d.refs.map((r, i) => (
              <div key={i} className="k-selbox-row" onClick={() => st.removeMateRef(i)} title="Click to remove">{r.label}</div>
            ))}
          </div>
        </div>
      </Section>
      {tab === 'analysis' && (
        <Section title="Analysis">
          <p className="k-muted" style={{ margin: '0 0 4px' }}>Data used by motion and simulation studies.</p>
          <label className="k-check"><input type="checkbox" checked={!!d.analysis?.loadBearing} onChange={(e) => st.updateMateDraft({ analysis: { ...d.analysis, loadBearing: e.target.checked } })} /> Load bearing faces</label>
          <label className="k-check"><input type="checkbox" checked={d.analysis?.friction !== undefined} onChange={(e) => st.updateMateDraft({ analysis: { ...d.analysis, friction: e.target.checked ? 0.2 : undefined } })} /> Friction</label>
          {d.analysis?.friction !== undefined && <div className="k-pm-valuerow k-tip" data-tip="Friction coefficient"><span className="k-pm-xy">μ</span><NumberField value={d.analysis.friction} onChange={(v) => st.updateMateDraft({ analysis: { ...d.analysis, friction: Math.max(0, Math.min(2, v)) } })} step={0.05} /></div>}
          <label className="k-check"><input type="checkbox" checked={!!d.analysis?.bushing} onChange={(e) => st.updateMateDraft({ analysis: { ...d.analysis, bushing: e.target.checked ? { stiffness: 1000, damping: 10 } : undefined } })} /> Bushing</label>
          {d.analysis?.bushing && (
            <>
              <div className="k-pm-valuerow k-tip" data-tip="Stiffness (N/mm)"><span className="k-pm-xy">K</span><NumberField value={d.analysis.bushing.stiffness} onChange={(v) => st.updateMateDraft({ analysis: { ...d.analysis, bushing: { ...d.analysis!.bushing!, stiffness: Math.max(0, v) } } })} step={100} /></div>
              <div className="k-pm-valuerow k-tip" data-tip="Damping (N·s/mm)"><span className="k-pm-xy">C</span><NumberField value={d.analysis.bushing.damping} onChange={(v) => st.updateMateDraft({ analysis: { ...d.analysis, bushing: { ...d.analysis!.bushing!, damping: Math.max(0, v) } } })} step={1} /></div>
            </>
          )}
        </Section>
      )}
      {tab === 'standard' && (
        <Section title="Mate Type">
          <div className="k-mate-types">
            {typeBtn('coincident', <Icon.MateCoincident />)}
            {typeBtn('parallel', <Icon.MateParallel />)}
            {typeBtn('perpendicular', <Icon.MatePerpendicular />)}
            {typeBtn('tangent', <Icon.MateTangent />)}
            {typeBtn('concentric', <Icon.MateConcentric />)}
            {d.type === 'concentric' && <label className="k-check k-mate-sub"><input type="checkbox" checked={!!d.lockRotation} onChange={(e) => st.updateMateDraft({ lockRotation: e.target.checked })} /> Lock rotation</label>}
            {typeBtn('lock', <Icon.MateLock />)}
          </div>
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.type === 'distance' ? 'active' : ''}`} data-tip="Distance" disabled={!allowed('distance')} onClick={() => st.updateMateDraft({ type: 'distance', value: d.value ?? 10 })}><Icon.MateDistance size={14} /></button>
            <NumberField value={d.type === 'distance' ? d.value ?? 10 : 0} onChange={(v) => st.updateMateDraft({ type: 'distance', value: v })} unit={st.doc.units} step={1} disabled={d.type !== 'distance'} />
          </div>
          {d.type === 'distance' && <label className="k-check"><input type="checkbox" checked={!!d.flip} onChange={(e) => st.updateMateDraft({ flip: e.target.checked })} /> Flip dimension</label>}
          <div className="k-pm-valuerow">
            <button className={`k-pm-stylebtn k-tip ${d.type === 'angle' ? 'active' : ''}`} data-tip="Angle" disabled={!allowed('angle')} onClick={() => st.updateMateDraft({ type: 'angle', value: d.value ?? 90 })}><Icon.MateAngle size={14} /></button>
            <NumberField value={d.type === 'angle' ? d.value ?? 90 : 0} onChange={(v) => st.updateMateDraft({ type: 'angle', value: v })} unit="°" step={1} disabled={d.type !== 'angle'} />
          </div>
          <div className="k-pm-label" style={{ marginLeft: 30 }}>Mate alignment:</div>
          <div className="k-pm-stylerow" style={{ marginLeft: 44 }}>
            <button className={`k-pm-stylebtn k-tip ${d.aligned ? 'active' : ''}`} data-tip="Aligned" onClick={() => st.updateMateDraft({ aligned: true })}><Icon.MateAligned size={16} /></button>
            <button className={`k-pm-stylebtn k-tip ${!d.aligned ? 'active' : ''}`} data-tip="Anti-Aligned" onClick={() => st.updateMateDraft({ aligned: false })}><Icon.MateAntiAligned size={16} /></button>
          </div>
        </Section>
      )}
      {tab === 'advanced' && (
        <Section title="Mate Type">
          <div className="k-mate-types" data-testid="advanced-mates">
            {(['profileCenter', 'symmetric', 'width', 'path', 'linearCoupler', 'distanceLimit', 'angleLimit'] as MateType[]).map((t) => typeBtn(t, <Icon.Mate size={14} />))}
          </div>
          <MateParams />
        </Section>
      )}
      {tab === 'mechanical' && (
        <Section title="Mate Type">
          <div className="k-mate-types" data-testid="mechanical-mates">
            {(['cam', 'slot', 'hinge', 'gear', 'rackPinion', 'screw', 'universalJoint'] as MateType[]).map((t) => typeBtn(t, <Icon.Mate size={14} />))}
          </div>
          <MateParams />
        </Section>
      )}
      <Section title="Mates">
        <div className="k-selbox" style={{ minHeight: 40 }}>
          {(st.doc.mates ?? []).length ? (st.doc.mates ?? []).map((m) => (
            <div key={m.id} className="k-selbox-row" onDoubleClick={() => st.editMate(m.id)}>
              <Icon.Mate size={12} /> {m.name} ({st.doc.components?.find((c) => c.id === m.refs[0].componentId)?.name},{st.doc.components?.find((c) => c.id === m.refs[1].componentId)?.name})
            </div>
          )) : <span className="k-muted">No mates yet.</span>}
        </div>
      </Section>
      <Section title="Options">
        <label className="k-check"><input type="checkbox" data-testid="mate-newfolder" checked={st.mateOpts.newFolder} onChange={(e) => useStore.setState({ mateOpts: { ...st.mateOpts, newFolder: e.target.checked } })} /> Add to new folder</label>
        <label className="k-check"><input type="checkbox" data-testid="mate-popup-opt" checked={st.mateOpts.popup} onChange={(e) => useStore.setState({ mateOpts: { ...st.mateOpts, popup: e.target.checked } })} /> Show popup dialog</label>
        <label className="k-check"><input type="checkbox" data-testid="mate-preview-opt" checked={st.mateOpts.preview} onChange={(e) => { useStore.setState({ mateOpts: { ...st.mateOpts, preview: e.target.checked } }); st.updateMateDraft({}); }} /> Show preview</label>
        <label className="k-check"><input type="checkbox" data-testid="mate-positiononly" checked={st.mateOpts.positionOnly} onChange={(e) => useStore.setState({ mateOpts: { ...st.mateOpts, positionOnly: e.target.checked } })} /> Use for positioning only</label>
        <label className="k-check"><input type="checkbox" data-testid="mate-transparent" checked={firstTransparent} onChange={(e) => { setFirstTransparent(e.target.checked); savePrefs({ ...loadPrefs(), 'assembly.mateFirstTransparent': e.target.checked }); useStore.setState({ mateEdit: st.mateEdit ? { ...st.mateEdit } : null }); }} /> Make first selection transparent</label>
      </Section>
    </div>
  );
}

/** Insert Component Property Panel: Browse… opens a part file (.kcad) that is placed at the origin. */
export function InsertComponentPM() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, insertGhost: s.insertGhost, setInsertGhost: s.setInsertGhost, placeInsertGhost: s.placeInsertGhost, pushMessage: s.pushMessage, insertComponent: s.insertComponent, cancelInsertComponent: s.cancelInsertComponent })));
  // the open documents: the parts in the assembly and the part just browsed to (it is open in the session too)
  const parts = st.doc.kind === 'assembly' ? [...new Map([...(st.doc.components ?? []).map((c) => [c.part.name, c.part] as const), ...(st.insertGhost ? [[st.insertGhost.part.name, st.insertGhost.part] as const] : [])]).values()] : [];
  const [sel, setSel] = useState<string | null>(parts[0]?.name ?? null);
  const [pinned, setPinned] = useState(false);
  const [fixMode, setFixMode] = useState<'first' | 'fix' | 'float'>('first');
  const part = parts.find((p) => p.name === sel) ?? null;
  const configs = part ? configurations(part).map((c) => c.name) : [];
  const [config, setConfig] = useState<string>('');
  const [rotBar, setRotBar] = useState(getPref<boolean>('assembly.rotateToolbar') !== false);
  const [virtual, setVirtual] = useState(false);
  const [envelope, setEnvelope] = useState(false);
  // options kept between sessions (System Options ▸ Assemblies in the intended design)
  const [opt, setOptState] = useState(() => ({ startInsert: getPref<boolean>('assembly.startInsert') !== false, autoBrowse: getPref<boolean>('assembly.autoBrowse') !== false, graphicsPreview: getPref<boolean>('assembly.graphicsPreview') !== false }));
  const setOpt = (k: keyof typeof opt, v: boolean) => { setOptState((o) => ({ ...o, [k]: v })); savePrefs({ ...loadPrefs(), ['assembly.' + k]: v }); if (k === 'graphicsPreview' && ghost) st.setInsertGhost({ ...ghost }); };
  // the chosen part follows the pointer (graphics preview); the PM options travel with it
  const ghost = st.insertGhost;
  useEffect(() => {
    const g = useStore.getState().insertGhost;
    if (g && (g.fixMode !== fixMode || g.keepOpen !== pinned || (g.configuration ?? '') !== config || !!g.virtual !== virtual || !!g.envelope !== envelope)) useStore.getState().setInsertGhost({ ...g, fixMode, keepOpen: pinned, configuration: config || undefined, virtual, envelope });
  }, [fixMode, pinned, config, ghost, virtual, envelope]);
  const choose = (p: Document) => { setSel(p.name); st.setInsertGhost({ part: p, rotation: [0, 0, 0, 1], fixMode, keepOpen: pinned, configuration: config || undefined, virtual, envelope }); };
  const insert = (atOrigin: boolean) => {
    // OK: the part on the pointer goes to the origin ("Hit OK button to insert a component at the origin")
    if (ghost) {
      st.placeInsertGhost(null);
      return;
    }
    if (!part) {
      st.pushMessage('Select a part in Open documents or Browse to a file.', 'warn');
      return;
    }
    st.insertComponent(part, { fixMode, configuration: config || undefined, keepOpen: pinned, atOrigin, virtual, envelope });
  };
  return (
    <div className="k-pm">
      <Header title="Insert Component" icon={<Icon.InsertComponent />} onOk={() => insert(true)} onCancel={st.cancelInsertComponent} extra={
        <button className={`k-pm-pin k-tip ${pinned ? 'active' : ''}`} data-tip="Keep Visible" onClick={() => setPinned((p) => !p)}><Icon.Pin /></button>
      } />
      <Section title="Message">
        <p className="k-pm-message">Select a part or assembly to insert and then place the component in the graphics area. Use the push pin to insert multiple copies of the same or different components.<br /><br />Hit OK button to insert a component at the origin.</p>
      </Section>
      <Section title="Part/Assembly to Insert">
        <div className="k-pm-label">Open documents:</div>
        <div className="k-selbox k-doclist" style={{ minHeight: 60 }} data-testid="insert-doclist">
          {parts.length ? parts.map((p) => (
            <div key={p.name} className={`k-selbox-row ${(ghost ? ghost.part.name : sel) === p.name ? 'selected' : ''}`} onClick={() => choose(p)} title="Click, then click in the graphics area to place it">
              <Icon.Part size={12} /> {p.name}
            </div>
          )) : <span className="k-muted">No open documents.</span>}
        </div>
        <div className="k-pm-label" style={{ marginTop: 6 }}>Configuration:</div>
        <select className="k-input" value={config} onChange={(e) => setConfig(e.target.value)} disabled={!configs.length}>
          <option value="">{configs[0] ?? 'Default'}</option>
          {configs.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}><button className="k-btn" onClick={() => openFileDialog()}>Browse...</button></div>
      </Section>
      <Section title="Thumbnail Preview" defaultOpen={false}>
        <div className="k-muted">No preview.</div>
      </Section>
      <Section title="Options">
        <label className="k-check"><input type="checkbox" data-testid="insert-startcmd" checked={opt.startInsert} onChange={(e) => setOpt('startInsert', e.target.checked)} /> Start command when creating new assembly</label>
        <label className="k-check"><input type="checkbox" data-testid="insert-autobrowse" checked={opt.autoBrowse} onChange={(e) => setOpt('autoBrowse', e.target.checked)} /> Automatic Browse when creating new assembly</label>
        <label className="k-check"><input type="checkbox" data-testid="insert-preview" checked={opt.graphicsPreview} onChange={(e) => setOpt('graphicsPreview', e.target.checked)} /> Graphics preview</label>
        <label className="k-check"><input type="checkbox" data-testid="insert-virtual" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} /> Make virtual</label>
        <label className="k-check"><input type="checkbox" data-testid="insert-envelope" checked={envelope} onChange={(e) => setEnvelope(e.target.checked)} /> Envelope</label>
        <label className="k-check"><input type="checkbox" data-testid="insert-rotbar-opt" checked={rotBar} onChange={(e) => { setRotBar(e.target.checked); savePrefs({ ...loadPrefs(), 'assembly.rotateToolbar': e.target.checked }); if (ghost) st.setInsertGhost({ ...ghost }); }} /> Show Rotate context toolbar</label>
        <div className="k-pm-label" style={{ marginTop: 6 }}>Fix / float component on insert:</div>
        <div className="k-pm-radios" data-testid="insert-fixmode">
          <label className="k-check"><input type="radio" name="fixmode" checked={fixMode === 'first'} onChange={() => setFixMode('first')} /> Only fix first component</label>
          <label className="k-check"><input type="radio" name="fixmode" checked={fixMode === 'fix'} onChange={() => setFixMode('fix')} /> Fix</label>
          <label className="k-check"><input type="radio" name="fixmode" checked={fixMode === 'float'} onChange={() => setFixMode('float')} /> Float</label>
        </div>
      </Section>
    </div>
  );
}

/**
 * Explode Property Panel: Explode Steps list, Add a Step (Explode Step
 * Components, direction X/Y/Z with Reverse, distance, Add Step / Reset), Options.
 */
export function ExplodePM() {
  const st = useStore(useShallow((s) => ({ explodeEdit: s.explodeEdit, doc: s.doc, commitExplode: s.commitExplode, cancelExplode: s.cancelExplode, deleteExplodeStep: s.deleteExplodeStep, updateExplodeDraft: s.updateExplodeDraft, addExplodeStep: s.addExplodeStep })));
  const ee = st.explodeEdit;
  if (!ee) return null;
  const comps = st.doc.components ?? [];
  const nameOf = (id: string) => comps.find((c) => c.id === id)?.name ?? id;
  return (
    <div className="k-pm" data-testid="explode-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.Explode /> <b>Explode</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" onClick={st.commitExplode}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelExplode}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Explode Steps">
        <div className="k-selbox" style={{ minHeight: 40 }}>
          {ee.steps.length ? ee.steps.map((s) => (
            <div key={s.id} className="k-selbox-row" data-step={s.name}>
              <Icon.Explode size={12} /> {s.name} <span className="k-muted">({s.componentIds.map(nameOf).join(', ')})</span>
              <span className="grow" />
              <button className="k-btn ghost icon" title="Delete" onClick={() => st.deleteExplodeStep(s.id)}><Icon.Trash size={11} /></button>
            </div>
          )) : <span className="k-muted">No explode steps yet.</span>}
        </div>
      </Section>
      <Section title="Add a Step">
        <div className="k-selbox" style={{ minHeight: 28 }}>
          {ee.current.componentIds.length ? ee.current.componentIds.map((id) => <div key={id} className="k-selbox-row"><Icon.Part size={12} /> {nameOf(id)}</div>) : <span className="k-muted">Select components in the graphics area or the tree.</span>}
        </div>
        <div className="k-pm-stylerow" style={{ marginTop: 6 }}>
          {(['x', 'y', 'z'] as const).map((a) => (
            <button key={a} className={`k-pm-stylebtn k-tip ${ee.current.axis === a ? 'active' : ''}`} data-tip={`Along ${a.toUpperCase()}`} onClick={() => st.updateExplodeDraft({ axis: a })}>{a.toUpperCase()}</button>
          ))}
          <button className={`k-pm-stylebtn k-tip ${ee.current.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateExplodeDraft({ reverse: !ee.current.reverse })}><Icon.Flip size={14} /></button>
        </div>
        <div className="k-pm-valuerow">
          <Icon.Dimension size={14} />
          <NumberField value={ee.current.distance} onChange={(v) => st.updateExplodeDraft({ distance: v })} unit={st.doc.units} step={10} autoFocus />
        </div>
        <div className="k-pm-valuerow k-tip" data-tip="Rotation angle about the direction"><Icon.MateAngle size={14} /><NumberField value={ee.current.angle ?? 0} onChange={(v) => st.updateExplodeDraft({ angle: v })} unit="°" step={5} /></div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button className="k-btn" onClick={st.addExplodeStep}>Add Step</button>
          <button className="k-btn" onClick={() => st.updateExplodeDraft({ componentIds: [], distance: 50, reverse: false, angle: 0 })}>Reset</button>
        </div>
      </Section>
      <Section title="Options" defaultOpen={false}>
        <label className="k-check"><input type="checkbox" data-testid="explode-autospace" checked={!!ee.autoSpace} onChange={(e) => { useStore.setState({ explodeEdit: { ...ee, autoSpace: e.target.checked } }); st.updateExplodeDraft({}); }} /> Auto-space components after drag</label>
        <label className="k-check"><input type="checkbox" checked={!!ee.subParts} onChange={(e) => useStore.setState({ explodeEdit: { ...ee, subParts: e.target.checked } })} /> Select sub-assembly parts</label>
        <label className="k-check"><input type="checkbox" data-testid="explode-rings" checked={!!ee.rings} onChange={(e) => { useStore.setState({ explodeEdit: { ...ee, rings: e.target.checked } }); st.updateExplodeDraft({}); }} /> Show rotation rings</label>
      </Section>
    </div>
  );
}

/** Linear / Circular Component Pattern Property Panel: Direction 1 (2) or Axis, spacing / angle, instances, Components to Pattern. */
export function ComponentPatternPM() {
  const st = useStore(useShallow((s) => ({ patternEdit: s.patternEdit, doc: s.doc, updatePatternDraft: s.updatePatternDraft, commitComponentPattern: s.commitComponentPattern, cancelComponentPattern: s.cancelComponentPattern })));
  const pe = st.patternEdit;
  if (!pe) return null;
  const d = pe.draft;
  // instance number → (row, column) for a linear pattern, by design labels the skipped instances
  const instanceLabel = (n: number) => {
    if (d.kind !== 'linear') return `(${n + 1})`;
    // the seed is position 0 of the grid, instance n is grid position n
    const per = Math.max(1, d.count);
    return `(${(n % per) + 1}, ${Math.floor(n / per) + 1})`;
  };
  const comps = st.doc.components ?? [];
  const nameOf = (id: string) => comps.find((c) => c.id === id)?.name ?? id;
  const linear = d.kind === 'linear';
  const AX: Record<'x' | 'y' | 'z', [number, number, number]> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  const axisButtons = (key: 'dir' | 'dir2', cur?: [number, number, number]) => (
    <div className="k-pm-stylerow" style={{ marginTop: 4 }}>
      {(['x', 'y', 'z'] as const).map((a) => {
        const v = AX[a];
        const on = !!cur && Math.abs(Math.abs(cur[0]) - v[0]) < 1e-9 && Math.abs(Math.abs(cur[1]) - v[1]) < 1e-9 && Math.abs(Math.abs(cur[2]) - v[2]) < 1e-9;
        return (
          <button key={a} className={`k-pm-stylebtn k-tip ${on ? 'active' : ''}`} data-tip={`${a.toUpperCase()} axis`} onClick={() => st.updatePatternDraft(key === 'dir' ? { dir: v, dirLabel: `${a.toUpperCase()} axis`, axisPoint: [0, 0, 0] } : { dir2: v })}>
            {a.toUpperCase()}
          </button>
        );
      })}
      <button
        className="k-pm-stylebtn k-tip"
        data-tip="Reverse Direction"
        onClick={() => {
          const c = (key === 'dir' ? d.dir : d.dir2) ?? [1, 0, 0];
          st.updatePatternDraft(key === 'dir' ? { dir: [-c[0], -c[1], -c[2]] } : { dir2: [-c[0], -c[1], -c[2]] });
        }}
      >
        <Icon.Flip size={14} />
      </button>
    </div>
  );
  return (
    <div className="k-pm" data-testid="component-pattern-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.ComponentPattern /> <b>{linear ? 'Linear Pattern' : 'Circular Pattern'}</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" onClick={st.commitComponentPattern}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelComponentPattern}><Icon.Close /></button>
        </div>
      </div>
      <Section title={linear ? 'Direction 1' : 'Parameters'}>
        <div className={`k-selbox ${pe.focus === 'direction' ? 'focus' : ''}`} style={{ minHeight: 24 }} onClick={() => st.updatePatternDraft({}, 'direction')} data-testid="pattern-direction">
          {d.dirLabel ? <div className="k-selbox-row"><Icon.Line size={12} /> {d.dirLabel}</div> : <span className="k-muted">{linear ? 'Pattern Direction: select a face or an axis' : 'Pattern Axis: select a cylindrical face or an axis'}</span>}
        </div>
        {axisButtons('dir', d.dir)}
        {linear ? (
          <>
            <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.spacing} onChange={(v) => st.updatePatternDraft({ spacing: v })} unit={st.doc.units} step={5} /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={d.count} onChange={(v) => st.updatePatternDraft({ count: Math.max(1, Math.round(v)) })} step={1} min={1} /></div>
          </>
        ) : (
          <>
            <div className="k-pm-valuerow"><Icon.MateAngle size={14} /><NumberField value={d.angle ?? 360} onChange={(v) => st.updatePatternDraft({ angle: v })} unit="°" step={15} /></div>
            <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={d.count} onChange={(v) => st.updatePatternDraft({ count: Math.max(1, Math.round(v)) })} step={1} min={1} /></div>
            <label className="k-check"><input type="checkbox" checked={d.equal !== false} onChange={(e) => st.updatePatternDraft({ equal: e.target.checked })} /> Equal spacing</label>
          </>
        )}
      </Section>
      {linear && (
        <Section title="Direction 2" defaultOpen={!!d.dir2}>
          <label className="k-check"><input type="checkbox" checked={!!d.dir2} onChange={(e) => st.updatePatternDraft(e.target.checked ? { dir2: [0, 0, 1], spacing2: d.spacing2 ?? 50, count2: d.count2 ?? 2 } : { dir2: undefined })} /> Direction 2</label>
          {d.dir2 && (
            <>
              {axisButtons('dir2', d.dir2)}
              <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={d.spacing2 ?? 50} onChange={(v) => st.updatePatternDraft({ spacing2: v })} unit={st.doc.units} step={5} /></div>
              <div className="k-pm-valuerow"><Icon.Pattern size={14} /><NumberField value={d.count2 ?? 2} onChange={(v) => st.updatePatternDraft({ count2: Math.max(1, Math.round(v)) })} step={1} min={1} /></div>
            </>
          )}
        </Section>
      )}
      <Section title="Components to Pattern">
        <div className={`k-selbox ${pe.focus === 'seeds' ? 'focus' : ''}`} style={{ minHeight: 40 }} onClick={() => st.updatePatternDraft({}, 'seeds')} data-testid="pattern-seeds">
          {d.seeds.length ? d.seeds.map((id) => <div key={id} className="k-selbox-row"><Icon.Part size={12} /> {nameOf(id)}</div>) : <span className="k-muted">Select components in the graphics area or the tree.</span>}
        </div>
      </Section>
      <Section title="Instances to Skip" defaultOpen={!!d.skip?.length}>
        <div className={`k-selbox ${pe.focus === 'skip' ? 'focus' : ''}`} style={{ minHeight: 40 }} onClick={() => st.updatePatternDraft({}, 'skip')} data-testid="pattern-skip">
          {d.skip?.length ? d.skip.map((n) => (
            <div key={n} className="k-selbox-row"><Icon.Pattern size={12} /> {instanceLabel(n)}<span className="grow" /><button className="k-btn ghost icon" title="Restore the instance" onClick={(e) => { e.stopPropagation(); st.updatePatternDraft({ skip: d.skip!.filter((x) => x !== n) }, 'skip'); }}>×</button></div>
          )) : <span className="k-muted">Click instances in the graphics area to skip them.</span>}
        </div>
      </Section>
    </div>
  );
}
