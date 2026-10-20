import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Button, Dialog, NumberField, Toggle } from '../ui/components';
import { Icon } from '../ui/icons';
import { openFileDialog } from './MenuBar';
import { createDocument } from '../core/document/types';
import { ViewGrid } from './viewport/Hud';
import { getCamera } from './viewport/Viewport';

/** Welcome dialog at start-up: Home / Recent / Learn / Alerts, like the original. */
export function WelcomeDialog() {
  const st = useStore();
  const [tab, setTab] = useState<'home' | 'recent' | 'learn' | 'alerts'>('home');
  const hasAutosave = (() => {
    try {
      return !!localStorage.getItem('phlippo.autosave');
    } catch {
      return false;
    }
  })();
  const newPart = () => { st.openDocument(createDocument()); st.setDialog(null); };
  return (
    <Dialog title="Welcome - Phlippo CAD" onClose={() => st.setDialog(null)}>
      <div className="k-welcome-tabs">
        {(['home', 'recent', 'learn', 'alerts'] as const).map((id) => (
          <button key={id} className={`k-welcome-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {{ home: 'Home', recent: 'Recent', learn: 'Learn', alerts: 'Alerts' }[id]}
          </button>
        ))}
      </div>
      {tab === 'home' && (
        <div className="k-welcome">
          <div>
            <h4>New</h4>
            <div className="k-doctypes">
              <button className="k-doctype" onClick={newPart}>
                <Icon.Part size={40} />
                <b>Part</b>
              </button>
              <button className="k-doctype" disabled>
                <Icon.Component size={40} />
                <b>Assembly</b>
              </button>
              <button className="k-doctype" disabled>
                <Icon.Drawing size={40} />
                <b>Drawing</b>
              </button>
              <button className="k-doctype" onClick={() => { st.setDialog(null); openFileDialog(); }}>
                <Icon.Open size={40} />
                <b>Open</b>
              </button>
            </div>
            <h4 style={{ marginTop: 14 }}>Recent Documents</h4>
            {hasAutosave ? (
              <button className="k-recent" onClick={() => st.setDialog(null)}>
                <Icon.Sheet /> {st.doc.name}.kcad <span className="k-muted">(autosave)</span>
              </button>
            ) : (
              <p className="k-muted">No recent documents.</p>
            )}
          </div>
          <div>
            <h4>Resources</h4>
            <ul className="k-list">
              <li onClick={() => { st.setDialog(null); st.setTaskPane('resources'); }}><Icon.Resources /> Tutorials</li>
              <li onClick={() => { st.setDialog(null); st.setPanel('shortcuts', { visible: true }); }}><Icon.Keyboard /> Keyboard shortcuts</li>
              <li onClick={() => { st.setDialog(null); st.setDialog('options'); }}><Icon.Options /> Options</li>
            </ul>
          </div>
        </div>
      )}
      {tab === 'recent' && (
        <div style={{ minWidth: 560 }}>
          <h4>Documents</h4>
          {hasAutosave ? <button className="k-recent" onClick={() => st.setDialog(null)}><Icon.Sheet /> {st.doc.name}.kcad</button> : <p className="k-muted">No recent documents.</p>}
          <Button icon={<Icon.Open />} onClick={() => { st.setDialog(null); openFileDialog(); }}>Browse…</Button>
        </div>
      )}
      {tab === 'learn' && (
        <div style={{ minWidth: 560 }}>
          <p>Phase 1 covers the 2D sketcher: entities, relations, Smart Dimension, Display/Delete Relations.</p>
          <p className="k-muted">Tutorials: Task Pane ▸ Resources. Shortcuts: press <b>?</b>.</p>
        </div>
      )}
      {tab === 'alerts' && <p className="k-muted" style={{ minWidth: 560 }}>No alerts.</p>}
    </Dialog>
  );
}

/** New document dialog (Part / Assembly / Drawing). */
export function NewDocumentDialog() {
  const st = useStore();
  const [name, setName] = useState('Part1');
  return (
    <Dialog
      title="New Phlippo CAD Document"
      onClose={() => st.setDialog(null)}
      actions={
        <>
          <Button onClick={() => st.setDialog(null)}>Cancel</Button>
          <Button variant="primary" onClick={() => { st.openDocument(createDocument(name || 'Part1')); st.setDialog(null); }}>OK</Button>
        </>
      }
    >
      <div className="k-doctypes">
        <button className="k-doctype active"><Icon.Part size={40} /><b>Part</b><span>a 3D representation of a single design component</span></button>
        <button className="k-doctype" disabled><Icon.Component size={40} /><b>Assembly</b><span>a 3D arrangement of parts (phase 4)</span></button>
        <button className="k-doctype" disabled><Icon.Drawing size={40} /><b>Drawing</b><span>a 2D engineering drawing (phase 5)</span></button>
      </div>
      <div className="k-field" style={{ marginTop: 12 }}>
        <label>Name</label>
        <input className="k-input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} autoFocus />
      </div>
      <p className="k-muted">Template: Y-up, MMGS.</p>
    </Dialog>
  );
}

/** System options / document properties. */
export function OptionsDialog() {
  const st = useStore();
  return (
    <Dialog title="System Options - Document Properties" onClose={() => st.setDialog(null)} actions={<Button variant="primary" onClick={() => st.setDialog(null)}>OK</Button>}>
      <h4 style={{ margin: '0 0 6px' }}>System Options</h4>
      <div className="k-field"><label>Theme</label><Toggle value={st.theme === 'dark'} onChange={(v) => st.setTheme(v ? 'dark' : 'light')} label={st.theme === 'dark' ? 'Dark' : 'Light'} /></div>
      <div className="k-field"><label>Reverse mouse wheel zoom direction</label><Toggle value={st.reverseWheel} onChange={st.setReverseWheel} /></div>
      <div className="k-field"><label>Display grid</label><Toggle value={st.show.grid} onChange={() => st.toggleShow('grid')} /></div>
      <div className="k-field"><label>Snap to grid</label><Toggle value={st.snapGrid} onChange={() => st.toggle('snapGrid')} /></div>
      <div className="k-field"><label>Major grid spacing</label><NumberField value={st.gridSize} onChange={(v) => useStore.setState({ gridSize: Math.max(0.1, v) })} unit={st.doc.units} /></div>
      <h4 style={{ margin: '14px 0 6px' }}>Document Properties</h4>
      <div className="k-field"><label>Name</label><input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
      <div className="k-field">
        <label>Unit system</label>
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
          <Icon.Orientation /> <span>Orientation</span>
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
        <span className="k-muted" style={{ minWidth: 60 }}>{c.kind === 'angle' ? 'A' : c.kind === 'radius' ? 'R' : c.kind === 'diameter' ? '⌀' : 'D'}</span>
        <NumberField value={value} onChange={setValue} unit={c.kind === 'angle' ? '°' : st.doc.units} step={c.kind === 'angle' ? 1 : 0.5} autoFocus onCommit={apply} />
      </div>
      <div className="k-modify-actions">
        <button className="k-btn icon k-tip" data-tip="OK" onClick={apply}><Icon.Check /></button>
        <button className="k-btn icon k-tip" data-tip="Cancel" onClick={() => st.setModify(null)}><Icon.Close /></button>
        <button className="k-btn icon k-tip" data-tip="Rebuild the model with the current value" onClick={() => value !== c.value && st.updateDimension(c.id, { value })}><Icon.Rebuild /></button>
        <button className="k-btn icon k-tip" data-tip="Reset" onClick={() => setValue(c.value ?? 0)}><Icon.Undo /></button>
        <button className={`k-btn icon k-tip ${c.driven ? 'active' : ''}`} data-tip="Driven" onClick={() => st.updateDimension(c.id, { driven: !c.driven })}><Icon.Lock /></button>
      </div>
    </div>
  );
}
