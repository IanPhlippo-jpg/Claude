import { LEGAL_NOTICE } from './legal';
import { getPref } from './prefs';
import { sketchDimensionName } from '../core/document/equations';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { listAutosaves, loadAutosaveEntry } from '../core/document/persistence';
import { Button, Dialog, NumberField, Toggle } from '../ui/components';
import { Icon } from '../ui/icons';
import { activeConfiguration, configurations } from '../core/document/configurations';
import { openFileDialog, withUnsavedCheck } from './MenuBar';
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
  const recents = listAutosaves();
  const newPart = () => withUnsavedCheck(() => { useStore.getState().openDocument(createDocument()); useStore.getState().setDialog(null); });
  const [hide, setHide] = useState(() => { try { return localStorage.getItem('phlippo.welcome.hide') === '1'; } catch { return false; } });
  const openRecent = (key: string) => withUnsavedCheck(() => {
    const d = loadAutosaveEntry(key);
    if (!d) return useStore.getState().pushMessage('The recovered document could not be read.', 'error');
    useStore.getState().openDocument(d);
    useStore.getState().setDialog(null);
  });
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
              <button className="k-doctype" onClick={() => withUnsavedCheck(() => { const s = useStore.getState(); s.newDocument('assembly'); s.setDialog(null); if (getPref('assembly.startInsert') !== false) { s.startInsertComponent(); if (getPref('assembly.autoBrowse') !== false) openFileDialog(); } })}>
                <Icon.Component size={40} />
                <b>Assembly</b>
              </button>
              <button className="k-doctype" onClick={() => st.setDialog('sheetFormat')}>
                <Icon.Drawing size={40} />
                <b>Drawing</b>
              </button>
              <button className="k-doctype" onClick={() => { st.setDialog(null); openFileDialog(); }} data-testid="welcome-open">
                <Icon.Open size={40} />
                <b>Open</b>
              </button>
            </div>
            <h4 style={{ marginTop: 14 }}>Recent Documents</h4>
            {recents.length ? recents.map((r, i) => (
              <button key={r.key} className="k-recent" data-testid={`welcome-recent-${i}`} onClick={() => (i === 0 && hasAutosave && !st.hasDocument && st.doc.id === r.id ? st.showDocument() : openRecent(r.key))}>
                {r.kind === 'assembly' ? <Icon.Component /> : r.kind === 'drawing' ? <Icon.Drawing /> : <Icon.Sheet />} {r.name}.kcad <span className="k-muted">{new Date(r.time).toLocaleString()}</span>
              </button>
            )) : hasAutosave && !st.hasDocument ? (
              <button className="k-recent" data-testid="welcome-recent-0" onClick={() => st.showDocument()}>
                <Icon.Sheet /> {st.doc.name}.kcad <span className="k-muted">(autosave)</span>
              </button>
            ) : (
              <p className="k-muted">No recent documents.</p>
            )}
            <label className="k-check" style={{ marginTop: 10 }}><input type="checkbox" checked={hide} onChange={(e) => { setHide(e.target.checked); try { localStorage.setItem('phlippo.welcome.hide', e.target.checked ? '1' : '0'); } catch { /* ignore */ } }} /> Do not show at startup</label>
          </div>
          <div>
            <h4>Resources</h4>
            <ul className="k-list">
              <li onClick={() => { st.setDialog(null); st.setTaskPane('resources'); }}><Icon.Resources /> Tutorials</li>
              <li onClick={() => { st.setDialog(null); st.setPanel('shortcuts', { visible: true }); }}><Icon.Keyboard /> Keyboard shortcuts</li>
              <li onClick={() => { st.setDialog(null); st.setDialog('options'); }}><Icon.Options /> Options</li>
            </ul>
            <p className="k-muted k-legal" data-testid="welcome-legal">{LEGAL_NOTICE}</p>
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
  const [kind, setKind] = useState<'part' | 'assembly' | 'drawing'>('part');
  const [name, setName] = useState('Part1');
  const pick = (k: 'part' | 'assembly' | 'drawing') => { setKind(k); setName(k === 'assembly' ? 'Assem1' : k === 'drawing' ? 'Draw1' : 'Part1'); };
  return (
    <Dialog
      title="New Phlippo CAD Document"
      onClose={() => st.setDialog(null)}
      actions={
        <>
          <Button onClick={() => st.setDialog(null)}>Cancel</Button>
          <Button variant="primary" onClick={() => withUnsavedCheck(() => { if (kind === 'drawing') { st.setDialog('sheetFormat'); return; } st.openDocument(createDocument(name || (kind === 'assembly' ? 'Assem1' : 'Part1'), kind)); if (kind === 'assembly' && getPref('assembly.startInsert') !== false) { st.startInsertComponent(); if (getPref('assembly.autoBrowse') !== false) openFileDialog(); } st.setDialog(null); })}>OK</Button>
        </>
      }
    >
      <div className="k-doctypes">
        <button className={`k-doctype ${kind === 'part' ? 'active' : ''}`} onClick={() => pick('part')}><Icon.Part size={40} /><b>Part</b><span>a 3D representation of a single design component</span></button>
        <button className={`k-doctype ${kind === 'assembly' ? 'active' : ''}`} onClick={() => pick('assembly')}><Icon.Component size={40} /><b>Assembly</b><span>a 3D arrangement of parts and/or other assemblies</span></button>
        <button className={`k-doctype ${kind === 'drawing' ? 'active' : ''}`} onClick={() => pick('drawing')}><Icon.Drawing size={40} /><b>Drawing</b><span>a 2D engineering drawing, typically of a part or assembly</span></button>
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
export function LegacyOptionsDialog() {
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
  // typing "=" turns the box into an equation box ("= "Width" / 2"), as the original
  const existing = c ? st.doc.equations.find((e) => !!sketch && e.target === sketchDimensionName(sketch, c.id)) : undefined;
  const [eqText, setEqText] = useState<string | null>(null);
  const [spinOpen, setSpinOpen] = useState(false);
  // Units: the value can be typed in another unit; it is converted to the document unit
  const LEN: Record<string, number> = { mm: 1, cm: 10, m: 1000, in: 25.4 };
  const [unit, setUnit] = useState<string | null>(null);
  const isAngle = c?.kind === 'angle';
  const shownUnit = unit ?? (isAngle ? 'deg' : st.doc.units);
  const k = isAngle ? (shownUnit === 'rad' ? Math.PI / 180 : 1) : (LEN[st.doc.units] ?? 1) / (LEN[shownUnit] ?? 1);
  // configurations: This Configuration / All Configurations / Specify Configuration(s), as the original
  const cfgs = configurations(st.doc);
  const [scope, setScope] = useState<'this' | 'all' | 'specify'>('this');
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  useEffect(() => setEqText(existing ? `= ${existing.expression}` : null), [c?.id, existing?.id]);
  // the Modify box takes the keyboard focus with the value selected, like the original
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!m) return;
    const t = setTimeout(() => {
      const input = boxRef.current?.querySelector('input');
      input?.focus();
      input?.select();
    }, 30);
    return () => clearTimeout(t);
  }, [m?.id]);
  if (!m || !c) return null;
  const apply = () => {
    if (eqText !== null) {
      st.setDimensionEquation(c.id, eqText.replace(/^\s*=\s*/, ''));
      st.setModify(null);
      return;
    }
    // a length must be a positive number (the original refuses 0 and anything that is not a number); an angle may be 0
    if (!Number.isFinite(value) || (c.kind !== 'angle' && value <= 0) || (c.kind === 'angle' && value < 0)) {
      st.pushMessage(c.kind === 'angle' ? 'Enter an angle of 0 or more.' : 'Enter a value larger than zero.', 'warn');
      return;
    }
    if (cfgs.length > 1 && scope !== 'this') {
      st.setDimensionInConfigurations(name, value, scope === 'all' ? 'all' : [...new Set([activeConfiguration(st.doc).id, ...scopeIds])]);
      return;
    }
    if (value !== c.value) st.updateDimension(c.id, { value });
    st.setModify(null);
  };
  const x = Math.min(m.x, window.innerWidth - 300), y = Math.min(m.y, window.innerHeight - 120);
  // dimension name as the original: D1@Sketch1, D2@Sketch1, …
  const dims = sketch!.constraintOrder.filter((id) => sketch!.constraints[id].value !== undefined);
  const name = sketchDimensionName(sketch!, c.id);
  void dims;
  return (
    <div ref={boxRef} className="k-modify" style={{ left: x, top: y }} onKeyDown={(e) => { if (e.key === 'Escape') st.setModify(null); e.stopPropagation(); }}>
      <div className="k-modify-title">Modify</div>
      <div className="k-modify-actions">
        <button className="k-modify-ic ok k-tip" data-tip="OK" onClick={apply}><Icon.Check /></button>
        <button className="k-modify-ic cancel k-tip" data-tip="Cancel" onClick={() => st.setModify(null)}><Icon.Close /></button>
        <button className="k-modify-ic k-tip" data-tip="Rebuild the model with the current value" onClick={() => value !== c.value && st.updateDimension(c.id, { value })}><Icon.Rebuild /></button>
        <button className="k-modify-ic k-tip" data-tip="Reset spin increment value" onClick={() => setValue(c.value ?? 0)}><Icon.Undo /></button>
        <button className={`k-modify-ic k-tip ${spinOpen ? 'active' : ''}`} data-tip="Spin box increment" onClick={() => setSpinOpen((o) => !o)}><Icon.Options /></button>
      </div>
      <div className="k-modify-name" data-testid="modify-name">{name}</div>
      <div className="k-modify-row k-modify-value">
        {eqText === null ? (
          <div onKeyDownCapture={(e) => { if (e.key === '=') { e.preventDefault(); setEqText('= '); } }}>
            <NumberField value={Math.round(value * k * 1e6) / 1e6} onChange={(v) => setValue(v / k)} unit={c.kind === 'angle' ? (shownUnit === 'rad' ? 'rad' : '°') : shownUnit} step={c.kind === 'angle' ? Number(st.prefs['spin.angle']) || 1 : st.unitSystem === 'IPS' ? Number(st.prefs['spin.lengthEnglish']) || 0.1 : Number(st.prefs['spin.lengthMetric']) || 10} autoFocus onCommit={apply} />
          </div>
        ) : (
          <div style={{ position: 'relative', flex: 1 }}>
            <input className="k-input mono" value={eqText} autoFocus onChange={(e) => setEqText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') st.setModify(null); e.stopPropagation(); }} placeholder='= "Width" / 2' title="Equation: names between double quotes" style={{ width: '100%' }} />
            <div className="k-eq-suggest">
              {st.doc.equations.filter((eq) => !/@/.test(eq.target)).map((eq) => (
                <div key={eq.id} className="k-menu-item" onMouseDown={(ev) => { ev.preventDefault(); setEqText(`${eqText.trimEnd()} "${eq.target}"`); }}>"{eq.target}"</div>
              ))}
              <div className="k-menu-item k-muted">Global Variables ▸</div>
              <div className="k-menu-item" onMouseDown={(ev) => { ev.preventDefault(); setEqText(`${eqText.trimEnd()} sin(`); }}>Functions ▸ sin, cos, tan, sqrt, abs, int</div>
              <div className="k-menu-item k-muted">File Properties ▸</div>
            </div>
          </div>
        )}
      </div>
      {cfgs.length > 1 && (
        <div className="k-modify-row" style={{ gap: 6 }}>
          <select className="k-input" value={scope} onChange={(e) => setScope(e.target.value as 'this' | 'all' | 'specify')} data-testid="modify-scope">
            <option value="this">This Configuration</option>
            <option value="all">All Configurations</option>
            <option value="specify">Specify Configuration(s)</option>
          </select>
          {scope === 'specify' && (
            <div className="k-modify-cfglist">
              {cfgs.map((cfg) => (
                <label key={cfg.id} className="k-check"><input type="checkbox" checked={cfg.id === activeConfiguration(st.doc).id || scopeIds.includes(cfg.id)} disabled={cfg.id === activeConfiguration(st.doc).id} onChange={(e) => setScopeIds((ids) => (e.target.checked ? [...ids, cfg.id] : ids.filter((x) => x !== cfg.id)))} /> {cfg.name}</label>
              ))}
            </div>
          )}
        </div>
      )}
      {spinOpen && (
        <div className="k-modify-row" style={{ gap: 6 }}>
          <span className="k-muted">Increment</span>
          <input className="k-input" style={{ width: 70 }} type="number" step={0.1} value={Number(st.prefs[c.kind === 'angle' ? 'spin.angle' : st.unitSystem === 'IPS' ? 'spin.lengthEnglish' : 'spin.lengthMetric'])} onChange={(e) => st.setPrefs({ ...st.prefs, [c.kind === 'angle' ? 'spin.angle' : st.unitSystem === 'IPS' ? 'spin.lengthEnglish' : 'spin.lengthMetric']: parseFloat(e.target.value) || 1 })} onKeyDown={(e) => e.stopPropagation()} />
        </div>
      )}
      {/* thumbwheel as the original: drag to change the value continuously */}
      <input className="k-modify-wheel" type="range" min={0} max={1000} value={500} onChange={(e) => { const dv = (parseFloat(e.target.value) - 500) / 100; setValue(Math.max(0, Math.round((value + dv * (c.kind === 'angle' ? 1 : 0.5)) * 100) / 100)); }} onPointerUp={(e) => { (e.target as HTMLInputElement).value = '500'; }} title="Thumbwheel" />
      <div className="k-modify-units">
        <span>Units</span>
        <select className="k-modify-unitsel" data-testid="modify-units" value={shownUnit} onChange={(e) => setUnit(e.target.value)} title="Units">
          {c.kind === 'angle' ? <><option value="deg">Degrees</option><option value="rad">Radians</option></> : <><option value="mm">Millimeters</option><option value="cm">Centimeters</option><option value="m">Meters</option><option value="in">Inches</option></>}
        </select>
      </div>
    </div>
  );
}

const CDEL_KEY = 'phlippo.confirmDelete';
const loadCdel = (): { absorbed: boolean; children: boolean } => {
  try {
    // as the original: absorbed features go with the feature, child features stay unless asked
    return { absorbed: true, children: false, ...JSON.parse(localStorage.getItem(CDEL_KEY) ?? '{}') };
  } catch {
    return { absorbed: true, children: false };
  }
};

/** Confirm Delete, as the original: the selected item, its absorbed and dependent items, two options. */
export function ConfirmDeleteDialog() {
  const st = useStore();
  const cd = st.confirmDelete;
  const [opt, setOpt] = useState(loadCdel);
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => yesRef.current?.focus(), []);
  if (!cd) return null;
  const doc = st.doc;
  const feat = doc.features.find((f) => f.id === cd.id);
  const comp = (doc.components ?? []).find((c) => c.id === cd.id);
  const mate = (doc.mates ?? []).find((m) => m.id === cd.id);
  const ref = (doc.refGeometry ?? []).find((r) => r.id === cd.id);
  const nameOf = (id: string) => doc.features.find((f) => f.id === id)?.name ?? id;
  const typeOf = (id: string) => (doc.features.find((f) => f.id === id)?.type === 'sketch' ? 'Sketch' : 'Feature');
  const setO = (patch: Partial<typeof opt>) => {
    const next = { ...opt, ...patch };
    setOpt(next);
    try {
      localStorage.setItem(CDEL_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const yes = () => {
    if (feat) st.deleteFeature(cd.id, { children: opt.children, absorbed: opt.absorbed });
    else if (comp) st.deleteComponent(cd.id);
    else if (mate) st.deleteMate(cd.id);
    else if (ref) st.deleteRefGeom(cd.id);
    st.closeConfirmDelete();
  };
  const rows: { id: string; name: string; type: string; dim?: boolean }[] = [{ id: cd.id, name: feat?.name ?? comp?.name ?? mate?.name ?? ref?.name ?? cd.id, type: feat ? typeOf(cd.id) : comp ? 'Component' : ref ? 'Reference Geometry' : 'Mate' }];
  if (opt.absorbed) for (const a of cd.absorbed) rows.push({ id: a, name: nameOf(a), type: 'Absorbed ' + typeOf(a) });
  return (
    <div className="k-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && st.closeConfirmDelete()} onKeyDown={(e) => { if (e.key === 'Escape') st.closeConfirmDelete(); if (e.key === 'Enter') yes(); e.stopPropagation(); }}>
      <div className="k-dialog k-cdel" role="dialog" aria-label="Confirm Delete" data-testid="confirm-delete">
        <div className="k-dialog-title">Confirm Delete</div>
        <div className="k-cdel-body">
          <div className="k-cdel-main">
            <div className="k-cdel-q">Delete the following items?</div>
            <div className="k-cdel-list" data-testid="cdel-items">
              {rows.map((r) => (
                <div key={r.id} className="k-cdel-row"><span>{r.name}</span><span>{r.type}</span></div>
              ))}
            </div>
            <div className="k-cdel-q">Dependent items:</div>
            <div className="k-cdel-list" data-testid="cdel-children">
              {cd.children.map((c) => (
                <div key={c} className={'k-cdel-row' + (opt.children ? '' : ' off')}><span>{nameOf(c)}</span><span>{typeOf(c)}</span></div>
              ))}
              {!cd.absorbed.length && !cd.children.length && !cd.checking && <div className="k-cdel-none">None</div>}
              {!opt.absorbed && cd.absorbed.map((a) => (
                <div key={a} className="k-cdel-row off"><span>{nameOf(a)}</span><span>Absorbed {typeOf(a)}</span></div>
              ))}
              {cd.checking && <div className="k-cdel-none">Checking…</div>}
            </div>
            <label className="k-check"><input type="checkbox" data-testid="cdel-absorbed" checked={opt.absorbed} disabled={!cd.absorbed.length} onChange={(e) => setO({ absorbed: e.target.checked })} /> Also delete absorbed features</label>
            <label className="k-check"><input type="checkbox" data-testid="cdel-childopt" checked={opt.children} disabled={!cd.children.length} onChange={(e) => setO({ children: e.target.checked })} /> Delete child features</label>
          </div>
          <div className="k-cdel-btns">
            <button ref={yesRef} className="k-btn primary" data-testid="cdel-yes" onClick={yes}>Yes</button>
            <button className="k-btn" onClick={yes}>Yes to All</button>
            <button className="k-btn" onClick={() => st.closeConfirmDelete()}>No</button>
            <button className="k-btn" onClick={() => st.closeConfirmDelete()}>Cancel</button>
            <button className="k-btn" onClick={() => st.pushMessage('Confirm Delete: the selected item is removed from the Feature Tree. Child features use it; absorbed features (the sketch) are consumed by it.', 'info')}>Help</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Message box: Yes/No when there is something to confirm, else OK. */
export function AskDialog() {
  const st = useStore();
  const okRef = useRef<HTMLButtonElement>(null);
  const a = st.ask;
  const [value, setValue] = useState(a?.input ?? '');
  useEffect(() => { if (a?.input === undefined) okRef.current?.focus(); }, [a?.input]);
  if (!a) return null;
  const close = () => st.setAsk(null);
  const yes = () => { close(); a.yes?.(value); };
  return (
    <div className="k-dialog-backdrop" onKeyDown={(e) => { if (e.key === 'Escape') close(); e.stopPropagation(); }}>
      <div className="k-dialog k-ask" role="dialog" aria-label={a.title} data-testid="ask">
        <div className="k-dialog-title">{a.title}</div>
        <div className="k-dialog-body">
          {a.text}
          {a.input !== undefined && <input className="k-input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && yes()} style={{ display: 'block', width: '100%', marginTop: 8 }} />}
        </div>
        <div className="k-dialog-actions">
          {a.input !== undefined ? (
            <>
              <button ref={okRef} className="k-btn primary" onClick={yes}>OK</button>
              <button className="k-btn" onClick={close}>Cancel</button>
            </>
          ) : a.yes && a.no ? (
            <>
              <button ref={okRef} className="k-btn primary" data-testid="ask-yes" onClick={yes}>{a.yesLabel ?? 'Yes'}</button>
              <button className="k-btn" data-testid="ask-no" onClick={() => { close(); a.no?.(); }}>{a.noLabel ?? 'No'}</button>
              <button className="k-btn" data-testid="ask-cancel" onClick={close}>Cancel</button>
            </>
          ) : a.yes ? (
            <>
              <button ref={okRef} className="k-btn primary" data-testid="ask-yes" onClick={yes}>{a.yesLabel ?? 'Yes'}</button>
              <button className="k-btn" data-testid="ask-no" onClick={close}>{a.noLabel ?? 'No'}</button>
            </>
          ) : (
            <button ref={okRef} className="k-btn primary" onClick={close}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}
