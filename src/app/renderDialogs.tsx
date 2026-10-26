import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../ui/components';
import { Icon } from '../ui/icons';

/** Render Tools ▸ Edit Scene Property Panel (Basic): background, environment, floor, by design. */
export function ScenePM() {
  const st = useStore(useShallow((s) => ({ sceneEdit: s.sceneEdit, doc: s.doc, setSceneEdit: s.setSceneEdit, setScene: s.setScene, show: s.show, toggleShow: s.toggleShow })));
  const [tab, setTab] = useState<'basic' | 'advanced' | 'illumination'>('basic');
  if (!st.sceneEdit) return null;
  const sc = st.doc.scene ?? { background: 'gradient' as const };
  return (
    <div className="k-pm" data-testid="scene-pm">
      <div className="k-pm-head">
        <div className="k-pm-title"><Icon.Scene /> <b>Edit Scene</b><span className="grow" /><span className="k-pm-help" title="Help">?</span></div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" onClick={() => st.setSceneEdit(false)}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => st.setSceneEdit(false)}><Icon.Close /></button>
        </div>
      </div>
      <div className="k-pm-tabs">
        {(['basic', 'advanced', 'illumination'] as const).map((t) => <button key={t} data-testid={'scene-tab-' + t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      {tab === 'advanced' && (
        <>
          <Section title="Floor Size/Rotation">
            <div className="k-field"><label>Floor offset</label><NumberField value={sc.floorOffset ?? 0} onChange={(v) => st.setScene({ floorOffset: v })} unit={st.doc.units} step={1} /></div>
          </Section>
          <Section title="Environment Rotation">
            <div className="k-field"><label>Rotation</label><NumberField value={sc.envRotation ?? 0} onChange={(v) => st.setScene({ envRotation: ((v % 360) + 360) % 360 })} unit="°" step={15} /></div>
            <input type="range" min={0} max={359} step={1} data-testid="scene-envrot" value={sc.envRotation ?? 0} onChange={(e) => st.setScene({ envRotation: Number(e.target.value) })} style={{ width: '100%' }} />
          </Section>
        </>
      )}
      {tab === 'illumination' && (
        <Section title="Illumination">
          <div className="k-field"><label>Rendering brightness</label><input type="range" min={0.2} max={2} step={0.05} data-testid="scene-brightness" value={sc.brightness ?? 1} onChange={(e) => st.setScene({ brightness: Number(e.target.value) })} style={{ width: '100%' }} /></div>
          <div className="k-field"><label>Scene reflectivity</label><input type="range" min={0} max={2} step={0.05} data-testid="scene-reflectivity" value={sc.reflectivity ?? 1} onChange={(e) => st.setScene({ reflectivity: Number(e.target.value) })} style={{ width: '100%' }} /></div>
          <p className="k-muted">Reflectivity shows with Realistic Shading on.</p>
        </Section>
      )}
      {tab === 'basic' && (<>
      <Section title="Background">
        <select className="k-input" value={sc.background} data-testid="scene-bg" onChange={(e) => st.setScene({ background: e.target.value as 'gradient' | 'white' | 'color' | 'studio' })}>
          <option value="gradient">Gradient (document default)</option>
          <option value="white">Plain White</option>
          <option value="color">Color</option>
          <option value="studio">Studio Backdrop</option>
        </select>
        {sc.background === 'color' && <div className="k-field" style={{ marginTop: 4 }}><label>Color</label><input type="color" className="k-input" value={sc.color ?? '#ffffff'} onChange={(e) => st.setScene({ color: e.target.value })} data-testid="scene-color" /></div>}
      </Section>
      <Section title="Environment">
        <select className="k-input" data-testid="scene-env" value={sc.environment ?? 'studio'} onChange={(e) => st.setScene({ environment: e.target.value as 'studio' })}>
          <option value="studio">Studio Room</option>
          <option value="courtyard">Courtyard</option>
          <option value="warehouse">Warehouse</option>
          <option value="none">None</option>
        </select>
      </Section>
      <Section title="Floor">
        <label className="k-check"><input type="checkbox" checked={st.show.shadows} onChange={() => st.toggleShow('shadows')} data-testid="scene-shadows" /> Floor shadows</label>
        <label className="k-check"><input type="checkbox" data-testid="scene-reflect" checked={!!sc.floorReflections} onChange={(e) => st.setScene({ floorReflections: e.target.checked })} /> Floor reflections</label>
        <div className="k-field"><label>Align floor with</label><select className="k-input" data-testid="scene-floor-align" value={sc.floorAlign ?? 'bottom'} onChange={(e) => st.setScene({ floorAlign: e.target.value as 'bottom' })}><option value="bottom">Bottom of model</option><option value="top">Top Plane</option></select></div>
      </Section>
      </>)}
    </div>
  );
}

/** Final Render window: the rendered image, Save Image, Close. */
export function FinalRenderDialog() {
  const st = useStore(useShallow((s) => ({ finalImage: s.finalImage, doc: s.doc, setFinalImage: s.setFinalImage })));
  if (!st.finalImage) return null;
  const save = () => {
    const a = document.createElement('a');
    a.href = st.finalImage!;
    a.download = `${st.doc.name}.png`;
    a.click();
  };
  return (
    <div className="k-float-dialog k-final-render" data-testid="final-render">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Appearance /> <span>Final Render - {st.doc.name}</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setFinalImage(null)}><Icon.Close size={12} /></button>
        </div>
        <div style={{ padding: 8, background: '#2b2b2b' }}>
          <img src={st.finalImage} alt="Final render" style={{ maxWidth: '72vw', maxHeight: '62vh', display: 'block' }} data-testid="final-image" />
        </div>
        <div style={{ display: 'flex', gap: 6, padding: 8, justifyContent: 'flex-end' }}>
          <button className="k-btn" onClick={save} data-testid="final-save"><Icon.Save size={13} /> Save Image</button>
          <button className="k-btn" onClick={() => st.setFinalImage(null)}>Close</button>
        </div>
      </div>
    </div>
  );
}
