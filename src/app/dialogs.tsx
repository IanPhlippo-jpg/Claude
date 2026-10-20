import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Button, Dialog, NumberField, Toggle } from '../ui/components';
import { Icon } from '../ui/icons';
import { openFileDialog } from './MenuBar';
import { createDocument } from '../core/document/types';
import { ViewGrid } from './viewport/Hud';
import { getCamera } from './viewport/Viewport';

/** Welcome dialog at start-up: new document / recent / learn. */
export function WelcomeDialog() {
  const st = useStore();
  const hasAutosave = (() => {
    try {
      return !!localStorage.getItem('phlippo.autosave');
    } catch {
      return false;
    }
  })();
  return (
    <Dialog title="Welkom bij Phlippo CAD" onClose={() => st.setDialog(null)}>
      <div className="k-welcome">
        <div>
          <h4>Nieuw</h4>
          <div className="k-doctypes">
            <button className="k-doctype" onClick={() => { st.openDocument(createDocument()); st.setDialog(null); }}>
              <Icon.Part size={40} />
              <b>Part</b>
              <span>een 3D-weergave van één ontwerpcomponent</span>
            </button>
            <button className="k-doctype" disabled>
              <Icon.Component size={40} />
              <b>Assembly</b>
              <span>een 3D-samenstelling van parts (fase 4)</span>
            </button>
            <button className="k-doctype" disabled>
              <Icon.Drawing size={40} />
              <b>Drawing</b>
              <span>een 2D-tekening van een part of assembly (fase 5)</span>
            </button>
          </div>
        </div>
        <div>
          <h4>Recent</h4>
          {hasAutosave ? (
            <button className="k-recent" onClick={() => st.setDialog(null)}>
              <Icon.Sheet /> {st.doc.name} <span className="k-muted">(autosave)</span>
            </button>
          ) : (
            <p className="k-muted">Nog geen recente documenten.</p>
          )}
          <Button icon={<Icon.Open />} onClick={() => { st.setDialog(null); openFileDialog(); }}>Openen…</Button>
        </div>
        <div>
          <h4>Leren</h4>
          <p className="k-muted">Tutorials en sneltoetsen vind je in de Task Pane ▸ Resources, of druk op <b>?</b>.</p>
        </div>
      </div>
    </Dialog>
  );
}

/** New document dialog (Part / Assembly / Drawing). */
export function NewDocumentDialog() {
  const st = useStore();
  const [name, setName] = useState('Part1');
  return (
    <Dialog
      title="Nieuw Phlippo-document"
      onClose={() => st.setDialog(null)}
      actions={
        <>
          <Button onClick={() => st.setDialog(null)}>Annuleren</Button>
          <Button variant="primary" onClick={() => { st.openDocument(createDocument(name || 'Part1')); st.setDialog(null); }}>OK</Button>
        </>
      }
    >
      <div className="k-doctypes">
        <button className="k-doctype active"><Icon.Part size={40} /><b>Part</b><span>een 3D-weergave van één ontwerpcomponent</span></button>
        <button className="k-doctype" disabled><Icon.Component size={40} /><b>Assembly</b><span>fase 4</span></button>
        <button className="k-doctype" disabled><Icon.Drawing size={40} /><b>Drawing</b><span>fase 5</span></button>
      </div>
      <div className="k-field" style={{ marginTop: 12 }}>
        <label>Naam</label>
        <input className="k-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} autoFocus />
      </div>
      <p className="k-muted">Sjabloon: Y-up (Y-as wijst omhoog), MMGS.</p>
    </Dialog>
  );
}

/** System options / document properties. */
export function OptionsDialog() {
  const st = useStore();
  return (
    <Dialog title="Opties" onClose={() => st.setDialog(null)} actions={<Button variant="primary" onClick={() => st.setDialog(null)}>OK</Button>}>
      <h4 style={{ margin: '0 0 6px' }}>Systeemopties</h4>
      <div className="k-field"><label>Thema</label><Toggle value={st.theme === 'dark'} onChange={(v) => st.setTheme(v ? 'dark' : 'light')} label={st.theme === 'dark' ? 'Donker' : 'Licht'} /></div>
      <div className="k-field"><label>Muiswiel omkeren</label><Toggle value={st.reverseWheel} onChange={st.setReverseWheel} label={st.reverseWheel ? 'Naar je toe = uitzoomen' : 'Naar je toe = inzoomen'} /></div>
      <div className="k-field"><label>Raster tonen</label><Toggle value={st.show.grid} onChange={() => st.toggleShow('grid')} /></div>
      <div className="k-field"><label>Raster-snap</label><Toggle value={st.snapGrid} onChange={() => st.toggle('snapGrid')} /></div>
      <div className="k-field"><label>Rasterafstand</label><NumberField value={st.gridSize} onChange={(v) => useStore.setState({ gridSize: Math.max(0.1, v) })} unit={st.doc.units} /></div>
      <h4 style={{ margin: '14px 0 6px' }}>Documenteigenschappen</h4>
      <div className="k-field"><label>Naam</label><input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
      <div className="k-field">
        <label>Eenhedenstelsel</label>
        <select className="k-input" value={st.unitSystem} onChange={(e) => st.setUnitSystem(e.target.value as 'MMGS')}>
          <option value="MKS">MKS</option>
          <option value="CGS">CGS</option>
          <option value="MMGS">MMGS</option>
          <option value="IPS">IPS</option>
        </select>
      </div>
    </Dialog>
  );
}

/** Orientation dialog (spacebar). */
export function OrientationDialog() {
  const st = useStore();
  return (
    <div className="k-orientation-dialog">
      <div className="k-panel">
        <div className="k-panel-header">
          <Icon.Orientation /> <span>Oriëntatie</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 6 }}>
          <ViewGrid camera={getCamera()} onPick={() => st.setDialog(null)} />
        </div>
      </div>
    </div>
  );
}

/** Modify dialog: appears at the pointer after a dimension is placed (or on double-click). */
export function ModifyDialog() {
  const st = useStore();
  const m = st.modify;
  const sketch = st.activeSketchId ? st.doc.sketches[st.activeSketchId] : null;
  const c = m && sketch ? sketch.constraints[m.id] : null;
  const [value, setValue] = useState(c?.value ?? 0);
  useEffect(() => setValue(c?.value ?? 0), [c?.id, c?.value]);
  if (!m || !c) return null;
  const apply = () => {
    if (value !== c.value) st.updateDimension(c.id, { value });
    st.setModify(null);
  };
  const x = Math.min(m.x, window.innerWidth - 300), y = Math.min(m.y, window.innerHeight - 120);
  return (
    <div className="k-modify" style={{ left: x, top: y }} onKeyDown={(e) => { if (e.key === 'Escape') st.setModify(null); e.stopPropagation(); }}>
      <div className="k-modify-title">Modify</div>
      <div className="k-modify-row">
        <span className="k-muted" style={{ minWidth: 60 }}>{c.kind === 'angle' ? 'Hoek' : c.kind === 'radius' ? 'R' : c.kind === 'diameter' ? '⌀' : 'D'}</span>
        <NumberField value={value} onChange={setValue} unit={c.kind === 'angle' ? '°' : st.doc.units} step={c.kind === 'angle' ? 1 : 0.5} autoFocus onCommit={apply} />
      </div>
      <div className="k-modify-actions">
        <button className="k-btn icon k-tip" data-tip="OK" onClick={apply}><Icon.Check /></button>
        <button className="k-btn icon k-tip" data-tip="Annuleren" onClick={() => st.setModify(null)}><Icon.Close /></button>
        <button className="k-btn icon k-tip" data-tip="Rebuild met huidige waarde" onClick={() => value !== c.value && st.updateDimension(c.id, { value })}><Icon.Rebuild /></button>
        <button className="k-btn icon k-tip" data-tip="Reset" onClick={() => setValue(c.value ?? 0)}><Icon.Undo /></button>
        <button className={`k-btn icon k-tip ${c.driven ? 'active' : ''}`} data-tip="Driven (referentie)" onClick={() => st.updateDimension(c.id, { driven: !c.driven })}><Icon.Lock /></button>
      </div>
    </div>
  );
}
