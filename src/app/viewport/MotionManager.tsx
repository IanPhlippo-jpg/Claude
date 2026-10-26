import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { Icon } from '../../ui/icons';
import { NumberField, Section } from '../../ui/components';
import { motionTransforms, motorValue, playbackTime, type MotionStudy } from '../../core/assembly/motion';
import type { Component } from '../../core/document/types';

const EMPTY: MotionStudy = { name: 'Motion Study 1', duration: 5, motors: [] };

/** Save Animation: the graphics area recorded while the study plays from the start (WebM video) */
async function recordAnimation(fps: number, duration: number, name: string): Promise<void> {
  const st = useStore.getState();
  const canvas = document.querySelector('.k-viewport canvas') as HTMLCanvasElement | null;
  if (!canvas || typeof MediaRecorder === 'undefined') {
    st.pushMessage('Recording needs the graphics area and video support.', 'warn');
    return;
  }
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => { rec.onstop = () => res(); });
  rec.start();
  st.setMotionStudy({ playback: 'normal' });
  st.setMotionTime(0);
  st.setMotionPlaying(true);
  await new Promise((r) => setTimeout(r, duration * 1000 + 300));
  rec.stop();
  await done;
  const blob = new Blob(chunks, { type: 'video/webm' });
  const api = (window as unknown as { phlippo?: { saveFileAs: (o: { defaultPath: string; filters: { name: string; extensions: string[] }[]; data: ArrayBuffer }) => Promise<unknown> } }).phlippo;
  if (api) await api.saveFileAs({ defaultPath: `${name}.webm`, filters: [{ name: 'Video', extensions: ['webm'] }], data: await blob.arrayBuffer() });
  else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.webm`;
    a.click();
  }
  useStore.getState().pushMessage(`Animation saved (${duration} s, ${fps} frames/s).`);
}

/**
 * MotionManager of Motion Study 1, docked under the graphics area by design: the toolbar (study type,
 * Calculate, Play from Start, Play, Stop, playback speed and mode, Save Animation, Animation Wizard, Autokey,
 * Add/Update Key, Motor, Spring, Contact, Gravity, Results and Plots, Motion Study Properties), the MotionManager
 * tree on the left and the timeline with the time bar and key points on the right.
 */
export function MotionManager() {
  const st = useStore();
  const study = st.doc.motionStudy ?? EMPTY;
  const speed = useRef(1);
  const raf = useRef(0);
  const last = useRef(0);
  const playT = useRef(0);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!st.motionPlaying) return;
    last.current = performance.now();
    playT.current = st.motionTime;
    const tick = (now: number) => {
      const s = useStore.getState();
      const dt = ((now - last.current) / 1000) * speed.current;
      last.current = now;
      const sd = s.doc.motionStudy ?? EMPTY;
      playT.current += dt;
      // Playback Mode: Normal stops at the end, Loop starts again, Reciprocate runs back and forth
      const { t, done } = playbackTime(sd.playback, playT.current, sd.duration);
      s.setMotionTime(t);
      if (done) {
        s.setMotionPlaying(false);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.motionPlaying]);
  const isAsm = st.doc.kind === 'assembly';
  const dur = study.duration;
  const basic = (study.type ?? 'animation') === 'basic';
  const ticks = Array.from({ length: Math.floor(dur) + 1 }, (_, i) => i);
  const pct = (t: number) => `${(t / dur) * 100}%`;
  const keysOf = (id: string) => (study.keys ?? []).filter((k) => k.componentId === id).map((k) => k.time);
  const rows: { id: string; label: string; icon: React.ReactNode; key?: boolean; bar?: [number, number]; keys?: number[]; del?: () => void; open?: () => void }[] = [
    { id: 'root', label: `${st.doc.name} (Default<Display State-1>)`, icon: isAsm ? <Icon.Component size={13} /> : <Icon.Part size={13} />, key: true },
    { id: 'cam', label: 'Orientation and Camera Views', icon: <Icon.Orientation size={13} />, key: true },
    { id: 'lights', label: 'Lights, Cameras and Scene', icon: <Icon.Appearance size={13} /> },
    ...study.motors.map((m) => ({ id: m.id, label: m.name, icon: m.kind === 'linear' ? <Icon.Arrow size={13} /> : <Icon.Revolve size={13} />, key: true, bar: m.motion === 'distance' ? [m.start ?? 0, (m.start ?? 0) + (m.duration ?? 1)] as [number, number] : [0, dur] as [number, number], del: () => st.deleteMotor(m.id), open: () => useStore.setState({ motorEdit: { ...m } }) })),
    ...(study.springs ?? []).map((s) => ({ id: s.id, label: s.name, icon: <Icon.Spline size={13} />, bar: [0, dur] as [number, number], del: () => st.deleteMotionItem('spring', s.id), open: () => useStore.setState({ motionEdit: { kind: 'spring', spring: { ...s } } }) })),
    ...(study.contacts ?? []).map((c) => ({ id: c.id, label: c.name, icon: <Icon.Interference size={13} />, bar: [0, dur] as [number, number], del: () => st.deleteMotionItem('contact', c.id), open: () => useStore.setState({ motionEdit: { kind: 'contact', contact: { ...c, componentIds: [...c.componentIds] } } }) })),
    ...(study.gravity ? [{ id: 'gravity', label: 'Gravity', icon: <Icon.Arrow size={13} />, bar: [0, dur] as [number, number], del: () => st.deleteMotionItem('gravity'), open: () => useStore.setState({ motionEdit: { kind: 'gravity', gravity: { ...study.gravity! } } }) }] : []),
    ...(study.wizard ?? []).map((w, i) => ({ id: 'wz' + i, label: w.kind === 'rotate' ? `Rotate model (${w.axis?.toUpperCase()})` : w.kind === 'explode' ? 'Explode' : 'Collapse', icon: <Icon.MotionStudy size={13} />, bar: [w.start, w.start + w.duration] as [number, number], del: () => st.deleteMotionItem('wizard', String(i)) })),
    { id: 'mates', label: 'Mates', icon: <Icon.Mate size={13} /> },
    ...(st.doc.components ?? []).map((c) => ({ id: c.id, label: `${c.fixed ? '(f) ' : '(-) '}${c.name}`, icon: <Icon.Part size={13} />, key: true, keys: keysOf(c.id), del: keysOf(c.id).length ? () => st.deleteMotionItem('keys', c.id) : undefined })),
  ];
  const fps = study.fps ?? 25;
  const calc = () => {
    if (basic) st.calculateMotion();
    st.setMotionTime(0);
    st.setMotionPlaying(true);
  };
  const timeAt = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur));
  };
  return (
    <div className="k-motion" data-testid="motion-manager" onPointerDown={(e) => e.stopPropagation()}>
      <div className="k-motion-bar">
        <select className="k-input k-motion-type" data-testid="motion-type" value={study.type ?? 'animation'} title="Type of Study" onChange={(e) => st.setMotionStudy({ type: e.target.value as 'animation' })}>
          <option value="animation">Animation</option>
          <option value="basic">Basic Motion</option>
          <option disabled title="Needs the Motion add-in">Motion Analysis</option>
        </select>
        <button className="k-motion-btn k-tip" data-tip="Calculate" data-testid="motion-calc" onClick={calc}><Icon.Rebuild size={15} /></button>
        <span className="k-motion-sep" />
        <button className="k-motion-btn k-tip" data-tip="Play from Start" onClick={() => { st.setMotionTime(0); st.setMotionPlaying(true); }}>⏮</button>
        <button className="k-motion-btn k-tip" data-tip="Play" data-testid="motion-play" onClick={() => { if (st.motionTime >= dur) st.setMotionTime(0); st.setMotionPlaying(true); }}>▶</button>
        <button className="k-motion-btn k-tip" data-tip="Stop" data-testid="motion-stop" onClick={() => st.setMotionPlaying(false)}>■</button>
        <select className="k-input k-motion-speed" defaultValue="1" title="Playback Speed" onChange={(e) => { speed.current = Number(e.target.value); }}>
          {['0.1', '0.5', '1', '2', '5'].map((v) => <option key={v} value={v}>{v}x</option>)}
        </select>
        <select className="k-input k-motion-speed" data-testid="motion-playback" value={study.playback ?? 'normal'} title="Playback Mode" onChange={(e) => st.setMotionStudy({ playback: e.target.value as 'normal' })}><option value="normal">Normal</option><option value="loop">Loop</option><option value="reciprocate">Reciprocate</option></select>
        <button className={`k-motion-btn k-tip${recording ? ' active' : ''}`} data-tip="Save Animation" data-testid="motion-save" disabled={recording} onClick={async () => { setRecording(true); try { await recordAnimation(fps, dur, `${st.doc.name}-${study.name}`); } finally { setRecording(false); } }}><Icon.Save size={15} /></button>
        <span className="k-motion-sep" />
        <button className="k-motion-btn k-tip" data-tip="Animation Wizard" data-testid="motion-wizard" onClick={() => st.startMotionEdit('wizard')}><Icon.MotionStudy size={15} /></button>
        <button className={`k-motion-btn k-tip${st.motionAutokey ? ' active' : ''}`} data-tip="Autokey" data-testid="motion-autokey" onClick={() => st.setMotionAutokey(!st.motionAutokey)}><Icon.Lock size={15} /></button>
        <button className="k-motion-btn k-tip" data-tip="Add/Update Key" data-testid="motion-addkey" onClick={() => st.addMotionKey(st.selectedFeatureId && (st.doc.components ?? []).some((c) => c.id === st.selectedFeatureId) ? [st.selectedFeatureId] : undefined)}><Icon.Lock size={15} /></button>
        <span className="k-motion-sep" />
        <button className="k-motion-btn k-tip" data-tip="Motor" data-testid="motion-motor" disabled={!isAsm} onClick={st.startMotor}><Icon.Revolve size={15} /></button>
        <button className="k-motion-btn k-tip" data-tip="Spring" data-testid="motion-spring" disabled={!isAsm} onClick={() => st.startMotionEdit('spring')}><Icon.Spline size={15} /></button>
        <button className="k-motion-btn k-tip" data-tip="Contact" data-testid="motion-contact" disabled={!isAsm} onClick={() => st.startMotionEdit('contact')}><Icon.Interference size={15} /></button>
        <button className="k-motion-btn k-tip" data-tip="Gravity" data-testid="motion-gravity" disabled={!isAsm} onClick={() => st.startMotionEdit('gravity')}><Icon.Arrow size={15} /></button>
        <span className="k-motion-sep" />
        <button className="k-motion-btn k-tip" data-tip="Results and Plots" data-testid="motion-plot" disabled={!isAsm} onClick={() => st.startMotionEdit('plot')}><Icon.Measure size={15} /></button>
        <button className="k-motion-btn k-tip" data-tip="Motion Study Properties" data-testid="motion-props" onClick={() => st.startMotionEdit('properties')}><Icon.Options size={15} /></button>
        <span className="grow" />
        <label className="k-muted" style={{ fontSize: 11 }}>Length</label>
        <div style={{ width: 80 }}><NumberField value={dur} onChange={(v) => st.setMotionDuration(v)} unit=" sec" step={1} min={0.5} /></div>
      </div>
      <div className="k-motion-body">
        <div className="k-motion-tree">
          {rows.map((r, i) => (
            <div key={r.id} className="k-motion-row" style={{ paddingLeft: i === 0 ? 4 : 18 }} onDoubleClick={r.open} onContextMenu={(e) => { if (r.del) { e.preventDefault(); r.del(); } }} title={r.del ? 'Double-click to edit, right-click to delete' : undefined}>
              {r.icon}<span>{r.label}</span>
            </div>
          ))}
        </div>
        <div className="k-motion-time" onClick={(e) => { if (!st.motionPlaying) st.setMotionTime(timeAt(e)); }}>
          <div className="k-motion-ruler">
            {ticks.map((t) => <span key={t} className="k-motion-tick" style={{ left: pct(t) }}>{t} sec</span>)}
          </div>
          {rows.map((r) => (
            <div key={r.id} className="k-motion-track">
              {r.bar && <div className="k-motion-span" style={{ left: pct(r.bar[0]), width: `${((r.bar[1] - r.bar[0]) / dur) * 100}%` }} />}
              {r.key && <><span className="k-motion-key" style={{ left: 0 }} />{r.bar && <span className="k-motion-key" style={{ left: pct(r.bar[1]) }} />}</>}
              {r.keys?.map((t) => <span key={t} className="k-motion-key" data-testid="motion-keypoint" style={{ left: pct(t) }} />)}
            </div>
          ))}
          <div className="k-motion-timebar" data-testid="motion-timebar" style={{ left: pct(Math.min(dur, st.motionTime)) }} />
        </div>
      </div>
      {st.motionEdit?.kind === 'plot' && <MotionPlot />}
    </div>
  );
}

/** Results and Plots: a quantity of a component over the study time, as a line graph */
function MotionPlot() {
  const st = useStore();
  const me = st.motionEdit!;
  const p = me.plot!;
  const study = st.doc.motionStudy ?? EMPTY;
  const comps = ((st.rebuild as unknown as { components?: Component[] }).components ?? st.doc.components ?? []) as Component[];
  const data = useMemo(() => {
    const n = 120;
    const out: [number, number][] = [];
    const comp = comps.find((c) => c.id === p.componentId);
    const motor = study.motors.find((m) => m.componentId === p.componentId);
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * study.duration;
      if (p.quantity === 'angle') {
        out.push([t, motor ? motorValue(motor, t) : 0]);
        continue;
      }
      const m = motionTransforms(st.doc, comps, study, t, st.motionSim).get(p.componentId);
      const c0 = comp ? new THREE.Vector3(...comp.position) : new THREE.Vector3();
      const d = m ? c0.clone().applyMatrix4(m).sub(c0) : new THREE.Vector3();
      out.push([t, p.quantity === 'x' ? d.x : p.quantity === 'y' ? d.y : p.quantity === 'z' ? d.z : d.length()]);
    }
    return out;
  }, [p.componentId, p.quantity, st.doc, st.motionSim, comps, study]);
  const W = 420, H = 200, pad = 36;
  const ys = data.map((d) => d[1]);
  const y0 = Math.min(0, ...ys), y1 = Math.max(1e-6, ...ys);
  const X = (t: number) => pad + (t / study.duration) * (W - pad - 8);
  const Y = (v: number) => H - 22 - ((v - y0) / (y1 - y0 || 1)) * (H - 36);
  const unit = p.quantity === 'angle' ? 'deg' : st.doc.units;
  return (
    <div className="k-float-dialog k-motion-plot" data-testid="motion-plot-dialog" style={{ position: 'fixed', right: 60, top: 170, zIndex: 50 }}>
      <div className="k-panel">
        <div className="k-panel-header"><Icon.Measure /> <span>Results and Plots</span><span className="grow" /><button className="k-btn ghost icon" onClick={() => useStore.setState({ motionEdit: null })}><Icon.Close size={12} /></button></div>
        <div className="k-panel-body" style={{ padding: 8 }}>
          <div className="k-pm-valuerow">
            <select className="k-input" value={p.componentId} onChange={(e) => st.updateMotionEdit({ plot: { ...p, componentId: e.target.value } })}>{comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select className="k-input" data-testid="plot-quantity" value={p.quantity} onChange={(e) => st.updateMotionEdit({ plot: { ...p, quantity: e.target.value as 'x' } })}>
              <option value="displacement">Linear Displacement (magnitude)</option><option value="x">Displacement X</option><option value="y">Displacement Y</option><option value="z">Displacement Z</option><option value="angle">Motor angle / stroke</option>
            </select>
          </div>
          <svg width={W} height={H} style={{ background: '#fff', border: '1px solid var(--border)' }} data-testid="plot-svg">
            <line x1={pad} y1={Y(0)} x2={W - 8} y2={Y(0)} stroke="#999" strokeWidth={0.6} />
            <line x1={pad} y1={8} x2={pad} y2={H - 22} stroke="#999" strokeWidth={0.6} />
            <text x={pad - 4} y={Y(y1) + 4} fontSize={9} textAnchor="end">{y1.toFixed(1)}</text>
            <text x={pad - 4} y={Y(y0) + 4} fontSize={9} textAnchor="end">{y0.toFixed(1)}</text>
            <text x={W - 8} y={H - 6} fontSize={9} textAnchor="end">Time (sec) {study.duration}</text>
            <text x={pad + 2} y={14} fontSize={9}>{unit}</text>
            <polyline fill="none" stroke="#1e6fd9" strokeWidth={1.4} points={data.map(([t, v]) => `${X(t)},${Y(v)}`).join(' ')} />
            <line x1={X(Math.min(study.duration, st.motionTime))} y1={8} x2={X(Math.min(study.duration, st.motionTime))} y2={H - 22} stroke="#d0342c" strokeWidth={0.8} />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Spring / Contact / Gravity / Motion Study Properties / Animation Wizard PropertyManagers */
export function MotionEditPM() {
  const st = useStore();
  const me = st.motionEdit;
  if (!me || me.kind === 'plot') return null;
  const comps = st.doc.components ?? [];
  const title = { spring: 'Spring', contact: 'Contact', gravity: 'Gravity', properties: 'Motion Study Properties', wizard: 'Animation Wizard' }[me.kind];
  const hasExplode = (st.doc.explodeSteps ?? []).length > 0;
  return (
    <div className="k-pm" data-testid="motion-edit-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><Icon.MotionStudy /> <b>{title}</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="motion-edit-ok" onClick={st.commitMotionEdit}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => useStore.setState({ motionEdit: null })}><Icon.Close /></button>
        </div>
      </div>
      {me.kind === 'spring' && me.spring && (() => {
        const s = me.spring;
        const up = (p: Partial<typeof s>) => st.updateMotionEdit({ spring: { ...s, ...p } });
        return (
          <>
            <Section title="Spring Parameters">
              <div className="k-field"><label>Component 1</label><select className="k-input" data-testid="spring-a" value={s.a.componentId} onChange={(e) => up({ a: { ...s.a, componentId: e.target.value } })}>{comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="k-field"><label>Component 2</label><select className="k-input" data-testid="spring-b" value={s.b.componentId} onChange={(e) => up({ b: { ...s.b, componentId: e.target.value } })}>{comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="k-field"><label>Spring constant</label><NumberField value={s.k} onChange={(v) => up({ k: Math.max(0, v) })} unit=" N/mm" step={0.05} /></div>
              <div className="k-field"><label>Free length</label><NumberField value={s.freeLength} onChange={(v) => up({ freeLength: Math.max(0, v) })} unit={st.doc.units} step={5} /></div>
            </Section>
            <Section title="Damper" defaultOpen={s.damping > 0} check={s.damping > 0} onCheck={(on) => up({ damping: on ? 0.01 : 0 })}>
              {s.damping > 0 && <div className="k-field"><label>Damping constant</label><NumberField value={s.damping} onChange={(v) => up({ damping: Math.max(0, v) })} unit=" N·s/mm" step={0.005} /></div>}
            </Section>
          </>
        );
      })()}
      {me.kind === 'contact' && me.contact && (
        <Section title="Selections">
          <div className="k-selbox" data-testid="contact-comps" style={{ maxHeight: 180, overflow: 'auto' }}>
            {comps.map((c) => <label key={c.id} className="k-check"><input type="checkbox" checked={me.contact!.componentIds.includes(c.id)} onChange={(e) => st.updateMotionEdit({ contact: { ...me.contact!, componentIds: e.target.checked ? [...me.contact!.componentIds, c.id] : me.contact!.componentIds.filter((x) => x !== c.id) } })} /> {c.name}</label>)}
          </div>
          <p className="k-muted">The components of a contact group do not pass through each other.</p>
        </Section>
      )}
      {me.kind === 'gravity' && me.gravity && (
        <Section title="Gravity Parameters">
          <div className="k-pm-stylerow">
            {(['x', 'y', 'z'] as const).map((a, i) => {
              const on = Math.abs(me.gravity!.dir[i]) > 0.5;
              return <button key={a} data-testid={'gravity-' + a} className={`k-pm-stylebtn ${on ? 'active' : ''}`} onClick={() => { const d: [number, number, number] = [0, 0, 0]; d[i] = -1; st.updateMotionEdit({ gravity: { ...me.gravity!, dir: d } }); }}>{a.toUpperCase()}</button>;
            })}
            <button className="k-pm-stylebtn k-tip" data-tip="Reverse Direction" onClick={() => st.updateMotionEdit({ gravity: { ...me.gravity!, dir: me.gravity!.dir.map((v) => -v) as [number, number, number] } })}><Icon.Arrow size={14} /></button>
          </div>
          <div className="k-field"><label>Numeric gravity value</label><NumberField value={me.gravity.g} onChange={(v) => st.updateMotionEdit({ gravity: { ...me.gravity!, g: Math.max(0, v) } })} unit={` ${st.doc.units}/s^2`} step={100} /></div>
        </Section>
      )}
      {me.kind === 'properties' && me.props && (
        <Section title="Animation">
          <div className="k-field"><label>Frames per second</label><NumberField value={me.props.fps} onChange={(v) => st.updateMotionEdit({ props: { ...me.props!, fps: Math.max(1, Math.min(120, Math.round(v))) } })} step={1} /></div>
          <div className="k-field"><label>Study length</label><NumberField value={me.props.duration} onChange={(v) => st.updateMotionEdit({ props: { ...me.props!, duration: Math.max(0.5, v) } })} unit=" sec" step={1} /></div>
        </Section>
      )}
      {me.kind === 'wizard' && me.wizard && (() => {
        const w = me.wizard;
        const up = (p: Partial<typeof w>) => st.updateMotionEdit({ wizard: { ...w, ...p } });
        return (
          <>
            <Section title="Animation Type">
              <div className="k-pm-radios" data-testid="wizard-kind">
                <label className="k-check"><input type="radio" name="wzk" checked={w.kind === 'rotate'} onChange={() => up({ kind: 'rotate' })} /> Rotate model</label>
                <label className="k-check"><input type="radio" name="wzk" disabled={!hasExplode} checked={w.kind === 'explode'} onChange={() => up({ kind: 'explode' })} /> Explode</label>
                <label className="k-check"><input type="radio" name="wzk" disabled={!hasExplode} checked={w.kind === 'collapse'} onChange={() => up({ kind: 'collapse' })} /> Collapse</label>
              </div>
              {!hasExplode && <p className="k-muted">Explode and Collapse need an exploded view of the assembly.</p>}
            </Section>
            {w.kind === 'rotate' && (
              <Section title="Select an Axis of Rotation">
                <div className="k-pm-radios">{(['x', 'y', 'z'] as const).map((a) => <label key={a} className="k-check"><input type="radio" name="wza" checked={w.axis === a} onChange={() => up({ axis: a })} /> {a.toUpperCase()}-axis</label>)}</div>
                <div className="k-field"><label>Number of rotations</label><NumberField value={w.turns ?? 1} onChange={(v) => up({ turns: Math.max(1, Math.round(v)) })} step={1} /></div>
                <div className="k-pm-radios"><label className="k-check"><input type="radio" name="wzd" checked={!w.clockwise} onChange={() => up({ clockwise: false })} /> Counterclockwise</label><label className="k-check"><input type="radio" name="wzd" checked={!!w.clockwise} onChange={() => up({ clockwise: true })} /> Clockwise</label></div>
              </Section>
            )}
            <Section title="Animation Control Options">
              <div className="k-field"><label>Duration</label><NumberField value={w.duration} onChange={(v) => up({ duration: Math.max(0.1, v) })} unit=" sec" step={1} /></div>
              <div className="k-field"><label>Start time</label><NumberField value={w.start} onChange={(v) => up({ start: Math.max(0, v) })} unit=" sec" step={1} /></div>
            </Section>
          </>
        );
      })()}
    </div>
  );
}

/** Motor PropertyManager (Rotary / Linear Motor on a component, Constant speed, Oscillating, Distance, Segments, Expression), by design. */
export function MotorPM() {
  const st = useStore();
  const m = st.motorEdit;
  const [loadPick, setLoadPick] = useState(false);
  useEffect(() => {
    // Load-bearing faces: a picked face of the motor's component goes into the list
    if (!loadPick || !m || !st.selectedFace) return;
    const f = st.selectedFace;
    if (f.bodyId !== m.componentId) return;
    if (!(m.loadFaces ?? []).includes(f.faceId)) st.updateMotorDraft({ loadFaces: [...(m.loadFaces ?? []), f.faceId] });
  }, [st.selectedFace]);
  if (!m) return null;
  const comps = (st.doc.components ?? []).filter((c) => !c.fixed);
  const linear = m.kind === 'linear';
  const u = linear ? st.doc.units : 'deg';
  return (
    <div className="k-pm" data-testid="motor-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">{linear ? <Icon.Arrow /> : <Icon.Revolve />} <span>Motor</span><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" onClick={st.commitMotor}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelMotor}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Motor Type">
        <div className="k-pm-stylerow">
          <button className={`k-pm-stylebtn k-tip ${!linear ? 'active' : ''}`} data-tip="Rotary Motor" onClick={() => st.updateMotorDraft({ kind: 'rotary', name: m.name.replace(/^LinearMotor/, 'RotaryMotor') })}><Icon.Revolve size={14} /></button>
          <button className={`k-pm-stylebtn k-tip ${linear ? 'active' : ''}`} data-tip="Linear Motor (Actuator)" data-testid="motor-linear" onClick={() => st.updateMotorDraft({ kind: 'linear', name: m.name.replace(/^RotaryMotor/, 'LinearMotor') })}><Icon.Arrow size={14} /></button>
        </div>
      </Section>
      <Section title="Component/Direction">
        <div className="k-field"><label>Motor Location</label>
          <select className="k-input" value={m.componentId} data-testid="motor-comp" onChange={(e) => st.updateMotorDraft({ componentId: e.target.value })}>
            {comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="k-pm-stylerow">
          <button className={`k-pm-stylebtn k-tip ${m.reverse ? 'active' : ''}`} data-tip="Reverse Direction" onClick={() => st.updateMotorDraft({ reverse: !m.reverse })}><Icon.Arrow size={14} /></button>
          <span className="k-muted" style={{ fontSize: 11 }}>{linear ? 'Direction: along the concentric mate axis' : 'Axis: concentric mate of the component'}</span>
        </div>
      </Section>
      <Section title="Motion">
        <select className="k-input" value={m.motion} data-testid="motor-motion" onChange={(e) => st.updateMotorDraft({ motion: e.target.value as 'constant' })}>
          <option value="constant">Constant speed</option>
          <option value="distance">Distance</option>
          <option value="oscillating">Oscillating</option>
          <option value="segments">Segments</option>
          <option value="expression">Expression</option>
        </select>
        {m.motion === 'constant' && (linear
          ? <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>Speed</span><NumberField value={m.speed ?? 10} onChange={(v) => st.updateMotorDraft({ speed: v })} unit={` ${st.doc.units}/s`} step={1} /></div>
          : <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>RPM</span><NumberField value={m.rpm} onChange={(v) => st.updateMotorDraft({ rpm: v })} unit=" RPM" step={1} /></div>)}
        {m.motion === 'oscillating' && (
          <>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>Amp.</span><NumberField value={m.amplitude} onChange={(v) => st.updateMotorDraft({ amplitude: v })} unit={u} step={5} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>Freq.</span><NumberField value={m.frequency} onChange={(v) => st.updateMotorDraft({ frequency: Math.max(0.01, v) })} unit=" Hz" step={0.1} /></div>
          </>
        )}
        {m.motion === 'distance' && (
          <>
            <div className="k-pm-valuerow" data-testid="motor-distance"><span className="k-muted" style={{ minWidth: 30 }}>{linear ? 'Dist.' : 'Angle'}</span><NumberField value={m.distance ?? 90} onChange={(v) => st.updateMotorDraft({ distance: v })} unit={u} step={5} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>Start</span><NumberField value={m.start ?? 0} onChange={(v) => st.updateMotorDraft({ start: Math.max(0, v) })} unit=" sec" step={0.5} /></div>
            <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>Dur.</span><NumberField value={m.duration ?? 1} onChange={(v) => st.updateMotorDraft({ duration: Math.max(0.01, v) })} unit=" sec" step={0.5} /></div>
          </>
        )}
        {m.motion === 'segments' && (
          <div data-testid="motor-segments">
            {(m.segments ?? []).map((s, i) => (
              <div key={i} className="k-pm-xyrow">
                <NumberField value={s.t0} onChange={(v) => st.updateMotorDraft({ segments: (m.segments ?? []).map((x, j) => (j === i ? { ...x, t0: Math.max(0, v) } : x)) })} unit="s" step={0.5} />
                <NumberField value={s.t1} onChange={(v) => st.updateMotorDraft({ segments: (m.segments ?? []).map((x, j) => (j === i ? { ...x, t1: Math.max(x.t0, v) } : x)) })} unit="s" step={0.5} />
                <NumberField value={s.value} onChange={(v) => st.updateMotorDraft({ segments: (m.segments ?? []).map((x, j) => (j === i ? { ...x, value: v } : x)) })} unit={linear ? `${st.doc.units}/s` : 'RPM'} step={1} />
                <button className="k-btn ghost icon" title="Delete segment" onClick={() => st.updateMotorDraft({ segments: (m.segments ?? []).filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button className="k-btn" onClick={() => { const segs = m.segments ?? []; const t0 = segs.length ? segs[segs.length - 1].t1 : 0; st.updateMotorDraft({ segments: [...segs, { t0, t1: t0 + 1, value: 0 }] }); }}>Add segment</button>
          </div>
        )}
        {m.motion === 'expression' && (
          <div className="k-field"><label>{linear ? `Displacement (${st.doc.units}) =` : 'Angle (deg) ='} f(t)</label><input className="k-input mono" data-testid="motor-expression" value={m.expression ?? ''} onChange={(e) => st.updateMotorDraft({ expression: e.target.value })} onKeyDown={(e) => e.stopPropagation()} placeholder="90*sin(2*pi*t)" /></div>
        )}
        <div className="k-muted" style={{ marginTop: 4, fontSize: 11 }}>At 1 sec: {motorValue(m, 1).toFixed(2)} {u}</div>
      </Section>
      <Section title="More Options" defaultOpen={!!m.loadFaces?.length}>
        <label className="k-check"><input type="checkbox" data-testid="motor-loadfaces" checked={loadPick || !!m.loadFaces?.length} onChange={(e) => { setLoadPick(e.target.checked); if (!e.target.checked) st.updateMotorDraft({ loadFaces: undefined }); }} /> Load-bearing faces</label>
        {(loadPick || !!m.loadFaces?.length) && (
          <div className={`k-selbox${loadPick ? ' k-selbox-dir' : ''}`} style={{ minHeight: 28 }}>
            {m.loadFaces?.length ? m.loadFaces.map((f, i) => <div key={f} className="k-selbox-row">Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select faces of the motor's component that carry the load.</span>}
          </div>
        )}
      </Section>
    </div>
  );
}
