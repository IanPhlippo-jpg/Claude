import { useMemo, useState } from 'react';
import { useStore } from './store';
import { Icon } from '../ui/icons';
import { type PrefValue } from './prefs';
import { CATEGORIES, COMMANDS, DEFAULT_GESTURES, DEFAULT_KEYS, commandById, gestureBindings, keyBindings, keyCombo, keyLabel } from './commands';
import { SHORTCUT_BAR_COMMANDS } from './ShortcutBar';

const TABS = ['Toolbars', 'Shortcut Bars', 'Commands', 'Menus', 'Keyboard', 'Mouse Gestures', 'Customization'] as const;
type Tab = (typeof TABS)[number];

export const RIBBON_TABS: { id: string; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'sketch', label: 'Sketch' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'sheetmetal', label: 'Sheet Metal' },
  { id: 'weldments', label: 'Weldments' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'mbd', label: 'MBD Dimensions' },
  { id: 'render', label: 'Render Tools' },
  { id: 'addins', label: 'Phlippo Add-Ins' },
];
export const QAT_BUTTONS = ['Home', 'New', 'Open', 'Save', 'Undo', 'Redo', 'Select', 'Rebuild', 'Options'];
export const MENU_ITEMS: Record<string, string[]> = {
  File: ['New…', 'Open…', 'Close', 'Save', 'Save As…', 'Print…', 'Pack and Go…', 'Exit'],
  Edit: ['Undo', 'Redo', 'Delete', 'Suppress', 'Unsuppress', 'Rebuild', 'Appearance ▸ Edit Appearance…'],
  View: ['Redraw', 'Display ▸ Zebra Stripes', 'Hide/Show ▸ Planes', 'Hide/Show ▸ Origins', 'Hide/Show ▸ Sketches', 'Lights and Cameras', 'Toolbars'],
  Insert: ['Boss/Base ▸ Extrude…', 'Boss/Base ▸ Revolve…', 'Cut ▸ Extrude…', 'Features ▸ Fillet/Round…', 'Features ▸ Shell…', 'Features ▸ Rib…', 'Features ▸ Combine…', 'Sheet Metal ▸ Vent…', 'Reference Geometry ▸ Plane…'],
  Tools: ['Measure…', 'Mass Properties…', 'Equations…', 'Options…'],
  Window: ['Viewport ▸ Single View', 'Viewport ▸ Two View - Horizontal', 'Viewport ▸ Two View - Vertical', 'Viewport ▸ Four View'],
  Help: ['Phlippo CAD Help', 'Keyboard shortcuts', 'About Phlippo CAD'],
};

const splitList = (v: PrefValue | undefined) => String(v ?? '').split('|').filter(Boolean);
const joinList = (xs: string[]) => xs.join('|');

/**
 * Tools ▸ Customize: the dialog of the original with its seven tabs. Every setting here is a real preference:
 * the CommandManager tabs and Quick Access buttons shown, the commands in the S shortcut bars, the menu items,
 * the keyboard shortcuts, the mouse gestures and the tooltip / lock options.
 */
export function CustomizeDialog() {
  const st = useStore();
  const [tab, setTab] = useState<Tab>('Toolbars');
  const [draft, setDraft] = useState<Record<string, PrefValue>>(() => ({ ...st.prefs }));
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [recording, setRecording] = useState<string | null>(null);
  const [sbContext, setSbContext] = useState<'sketch' | 'part' | 'assembly'>('part');
  const [keyCat, setKeyCat] = useState('All Commands');
  const get = (k: string) => draft[k];
  const set = (k: string, v: PrefValue) => setDraft((d) => ({ ...d, [k]: v }));
  const hiddenTabs = splitList(get('customize.tabs.hidden'));
  const hiddenQat = splitList(get('customize.qat.hidden'));
  const hiddenMenus = splitList(get('customize.menus.hidden'));
  const hiddenSb = splitList(get('customize.shortcutbar.hidden'));
  const keys = useMemo(() => keyBindings(get('customize.keys')), [draft['customize.keys']]); // eslint-disable-line react-hooks/exhaustive-deps
  const gestures = useMemo(() => gestureBindings(get('customize.gestures')), [draft['customize.gestures']]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleIn = (key: string, id: string, on: boolean) => {
    const list = splitList(get(key));
    set(key, joinList(on ? list.filter((x) => x !== id) : Array.from(new Set([...list, id]))));
  };
  const ok = () => {
    st.setPrefs(draft);
    st.setDialog(null);
  };
  const setKey = (id: string, combo: string) => {
    const custom = { ...keys, [id]: combo };
    // a key bound to another command is taken away from it, as the original's "Reassign" question
    for (const [cid, k] of Object.entries(custom)) if (cid !== id && k === combo) custom[cid] = '';
    set('customize.keys', JSON.stringify(custom));
  };
  const resetKeys = () => set('customize.keys', JSON.stringify(DEFAULT_KEYS));
  const copyKeys = () => {
    const text = COMMANDS.filter((c) => keys[c.id]).map((c) => `${c.category}\t${c.label}\t${keyLabel(keys[c.id])}`).join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    st.pushMessage('Shortcut list copied to the clipboard.', 'info');
  };
  const setGesture = (ctx: 'part' | 'sketch', dir: 'up' | 'down' | 'left' | 'right', id: string) => set('customize.gestures', JSON.stringify({ ...gestures, [ctx]: { ...gestures[ctx], [dir]: id } }));
  const q = filter.trim().toLowerCase();
  const visibleCommands = COMMANDS.filter((c) => (q ? c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) : c.category === category));
  const sbCommands = SHORTCUT_BAR_COMMANDS[sbContext];

  return (
    <div className="k-dialog-backdrop" data-testid="customize-dialog">
      <div className="k-dialog k-options k-customize" role="dialog" aria-label="Customize">
        <div className="k-dialog-title k-options-title">
          <span>Customize</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-options-top">
          <div className="k-options-tabs k-customize-tabs">
            {TABS.map((t) => <button key={t} className={tab === t ? 'active' : ''} data-testid={`cz-tab-${t.toLowerCase().replace(/ /g, '')}`} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </div>
        <div className="k-options-body k-customize-body">
          {tab === 'Toolbars' && (
            <div className="k-customize-cols">
              <fieldset className="k-fieldset"><legend>CommandManager tabs</legend>
                {RIBBON_TABS.map((t) => (
                  <label key={t.id} className="k-check"><input type="checkbox" data-testid={`cz-tab-${t.id}`} checked={!hiddenTabs.includes(t.id)} onChange={(e) => toggleIn('customize.tabs.hidden', t.id, e.target.checked)} /> {t.label}</label>
                ))}
                <label className="k-check" style={{ marginTop: 8 }}><input type="checkbox" data-testid="cz-largebuttons" checked={get('customize.largeButtons') !== false} onChange={(e) => set('customize.largeButtons', e.target.checked)} /> Use large buttons with text</label>
                <label className="k-check"><input type="checkbox" checked={!!get('customize.cmDescriptions')} onChange={(e) => set('customize.cmDescriptions', e.target.checked)} /> Show tooltip descriptions in the CommandManager</label>
              </fieldset>
              <fieldset className="k-fieldset"><legend>Quick Access Toolbar</legend>
                {QAT_BUTTONS.map((b) => (
                  <label key={b} className="k-check"><input type="checkbox" data-testid={`cz-qat-${b.toLowerCase()}`} checked={!hiddenQat.includes(b)} onChange={(e) => toggleIn('customize.qat.hidden', b, e.target.checked)} /> {b}</label>
                ))}
                <div className="k-pm-label" style={{ marginTop: 8 }}>Icon size:</div>
                <select className="k-input" value={String(get('customize.iconSize') ?? 'Medium')} onChange={(e) => set('customize.iconSize', e.target.value)}><option>Small</option><option>Medium</option><option>Large</option></select>
              </fieldset>
            </div>
          )}
          {tab === 'Shortcut Bars' && (
            <div>
              <p className="k-muted">The S key shows a shortcut bar with the commands below. Uncheck a command to remove it from the bar.</p>
              <div className="k-pm-tabs" style={{ marginBottom: 6 }}>
                {(['sketch', 'part', 'assembly'] as const).map((c) => <button key={c} className={sbContext === c ? 'active' : ''} data-testid={`cz-sb-${c}`} onClick={() => setSbContext(c)}>{c === 'sketch' ? 'Sketch' : c === 'part' ? 'Part' : 'Assembly'}</button>)}
              </div>
              <div className="k-customize-grid" data-testid="cz-sb-list">
                {sbCommands.map((label) => (
                  <label key={label} className="k-check"><input type="checkbox" checked={!hiddenSb.includes(`${sbContext}:${label}`)} onChange={(e) => toggleIn('customize.shortcutbar.hidden', `${sbContext}:${label}`, e.target.checked)} /> {label}</label>
                ))}
              </div>
            </div>
          )}
          {tab === 'Commands' && (
            <div className="k-customize-cols">
              <div style={{ width: 150 }}>
                <div className="k-pm-label">Categories:</div>
                <ul className="k-list k-customize-cats" data-testid="cz-categories">
                  {CATEGORIES.map((c) => <li key={c} className={c === category && !q ? 'selected' : ''} onClick={() => { setCategory(c); setFilter(''); }}>{c}</li>)}
                </ul>
                <input className="k-input" placeholder="Search" style={{ marginTop: 6 }} value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="cz-search" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="k-pm-label">Buttons:</div>
                <div className="k-customize-buttons" data-testid="cz-buttons">
                  {visibleCommands.map((c) => <button key={c.id} className={`k-customize-cmd k-tip ${picked === c.id ? 'active' : ''}`} data-tip={c.label} onClick={() => setPicked(c.id)}>{c.icon}</button>)}
                </div>
                <div className="k-pm-label" style={{ marginTop: 6 }}>Description:</div>
                <div className="k-selbox" style={{ minHeight: 44 }} data-testid="cz-description">{picked ? <><b>{commandById(picked)?.label}</b><div>{commandById(picked)?.description}</div><div className="k-muted">Shortcut: {keys[picked] ? keyLabel(keys[picked]) : 'none'} · Press Add to Quick Access to put it on the toolbar.</div></> : <span className="k-muted">Select a command to see its description. Commands are added to the Quick Access Toolbar from here.</span>}</div>
                {picked && <button className="k-btn" style={{ marginTop: 6 }} data-testid="cz-addqat" onClick={() => { const extra = splitList(get('customize.qat.extra')); set('customize.qat.extra', joinList(Array.from(new Set([...extra, picked])))); }}>Add to Quick Access Toolbar</button>}
                {splitList(get('customize.qat.extra')).length > 0 && (
                  <div className="k-selbox" style={{ marginTop: 6 }} data-testid="cz-qat-extra">
                    {splitList(get('customize.qat.extra')).map((id) => <div key={id} className="k-selbox-row">{commandById(id)?.icon} {commandById(id)?.label ?? id}<span className="grow" /><button className="k-btn ghost icon" onClick={() => set('customize.qat.extra', joinList(splitList(get('customize.qat.extra')).filter((x) => x !== id)))}><Icon.Close size={10} /></button></div>)}
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === 'Menus' && (
            <div>
              <p className="k-muted">Uncheck a menu item to hide it from the menu bar.</p>
              <div className="k-customize-cols" style={{ flexWrap: 'wrap' }}>
                {Object.entries(MENU_ITEMS).map(([menu, items]) => (
                  <fieldset key={menu} className="k-fieldset" style={{ minWidth: 200 }}><legend>{menu}</legend>
                    {items.map((label) => <label key={label} className="k-check"><input type="checkbox" data-testid={`cz-menu-${menu}-${label}`} checked={!hiddenMenus.includes(`${menu}:${label}`)} onChange={(e) => toggleIn('customize.menus.hidden', `${menu}:${label}`, e.target.checked)} /> {label}</label>)}
                  </fieldset>
                ))}
              </div>
            </div>
          )}
          {tab === 'Keyboard' && (
            <div>
              <div className="k-customize-cols" style={{ alignItems: 'center', marginBottom: 6 }}>
                <span className="k-muted">Category:</span>
                <select className="k-input" style={{ width: 160 }} data-testid="cz-keycat" value={keyCat} onChange={(e) => { setKeyCat(e.target.value); setFilter(''); }}><option>All Commands</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                <input className="k-input" placeholder="Search for:" style={{ flex: 1 }} value={filter} onChange={(e) => setFilter(e.target.value)} />
                <button className="k-btn" onClick={resetKeys} data-testid="cz-keys-reset">Reset to Defaults</button>
                <button className="k-btn" onClick={copyKeys}>Copy List</button>
              </div>
              <div className="k-customize-keys">
                <table className="k-table" data-testid="cz-keys">
                  <thead><tr><th>Category</th><th>Command</th><th>Shortcut(s)</th></tr></thead>
                  <tbody>
                    {COMMANDS.filter((c) => (q ? c.label.toLowerCase().includes(q) : keyCat === 'All Commands' || c.category === keyCat)).map((c) => (
                      <tr key={c.id}>
                        <td>{c.category}</td>
                        <td>{c.label}</td>
                        <td>
                          <input
                            className={`k-input k-customize-key${recording === c.id ? ' recording' : ''}`}
                            data-testid={`cz-key-${c.id}`}
                            readOnly
                            value={recording === c.id ? 'Press a key…' : keys[c.id] ? keyLabel(keys[c.id]) : ''}
                            onFocus={() => setRecording(c.id)}
                            onBlur={() => setRecording(null)}
                            onKeyDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.key === 'Escape') { setRecording(null); (e.target as HTMLInputElement).blur(); return; }
                              if (e.key === 'Backspace' || e.key === 'Delete') { setKey(c.id, ''); return; }
                              const combo = keyCombo(e);
                              if (combo) { setKey(c.id, combo); setRecording(null); (e.target as HTMLInputElement).blur(); }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="k-muted">Click a shortcut cell and press the key (with Ctrl / Shift / Alt). Backspace clears it; a key already in use moves to the new command.</p>
            </div>
          )}
          {tab === 'Mouse Gestures' && (
            <div className="k-customize-cols">
              <div style={{ flex: 1 }}>
                <label className="k-check"><input type="checkbox" data-testid="cz-gestures-on" checked={get('customize.gestures.enabled') !== false} onChange={(e) => set('customize.gestures.enabled', e.target.checked)} /> Enable mouse gestures</label>
                <div className="k-pm-label" style={{ marginTop: 6 }}>Number of gestures:</div>
                <select className="k-input" style={{ width: 120 }} value="4" onChange={() => st.pushMessage('This build shows 4 gestures (the 8 and 12 rings are a later build).')}><option>4</option><option>8</option><option>12</option></select>
                {(['part', 'sketch'] as const).map((ctx) => (
                  <fieldset key={ctx} className="k-fieldset" style={{ marginTop: 8 }}><legend>{ctx === 'part' ? 'Part / Assembly' : 'Sketch'}</legend>
                    {(['up', 'right', 'down', 'left'] as const).map((dir) => (
                      <div key={dir} className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 50 }}>{dir[0].toUpperCase() + dir.slice(1)}</span>
                        <select className="k-input" data-testid={`cz-gesture-${ctx}-${dir}`} value={gestures[ctx][dir]} onChange={(e) => setGesture(ctx, dir, e.target.value)}>
                          {COMMANDS.filter((c) => (ctx === 'sketch' ? c.sketch || c.category === 'View' : !c.sketch)).map((c) => <option key={c.id} value={c.id}>{c.category} ▸ {c.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </fieldset>
                ))}
                <button className="k-btn" style={{ marginTop: 6 }} onClick={() => set('customize.gestures', JSON.stringify(DEFAULT_GESTURES))}>Reset to Defaults</button>
              </div>
              <div className="k-customize-ring" data-testid="cz-gesture-ring">
                {(['up', 'right', 'down', 'left'] as const).map((dir) => <div key={dir} className={`k-gesture-item ${dir}`}>{commandById(gestures[sbContext === 'sketch' ? 'sketch' : 'part'][dir])?.icon}<span>{commandById(gestures[sbContext === 'sketch' ? 'sketch' : 'part'][dir])?.label}</span></div>)}
                <div className="k-customize-ring-center">{sbContext === 'sketch' ? 'Sketch' : 'Part'}</div>
                <div className="k-pm-tabs" style={{ position: 'absolute', bottom: -34, left: 0 }}>
                  <button className={sbContext !== 'sketch' ? 'active' : ''} onClick={() => setSbContext('part')}>Part</button>
                  <button className={sbContext === 'sketch' ? 'active' : ''} onClick={() => setSbContext('sketch')}>Sketch</button>
                </div>
              </div>
            </div>
          )}
          {tab === 'Customization' && (
            <div className="k-customize-cols">
              <fieldset className="k-fieldset"><legend>Tooltips</legend>
                <label className="k-check"><input type="checkbox" data-testid="cz-tooltips" checked={get('customize.tooltips') !== false} onChange={(e) => set('customize.tooltips', e.target.checked)} /> Show tooltips</label>
                <label className="k-check" style={{ marginLeft: 18 }}><input type="checkbox" data-testid="cz-largetooltips" disabled={get('customize.tooltips') === false} checked={get('customize.tooltips') !== false && get('customize.largeTooltips') !== false} onChange={(e) => set('customize.largeTooltips', e.target.checked)} /> Use large tooltips</label>
              </fieldset>
              <fieldset className="k-fieldset"><legend>CommandManager and toolbars</legend>
                <label className="k-check"><input type="checkbox" data-testid="cz-lock" checked={!!get('customize.lock')} onChange={(e) => set('customize.lock', e.target.checked)} /> Lock CommandManager and toolbars</label>
                <label className="k-check"><input type="checkbox" checked={get('customize.showMenus') !== false} onChange={(e) => set('customize.showMenus', e.target.checked)} /> Show the menu bar when the pointer is over the logo</label>
                <button className="k-btn" style={{ marginTop: 8 }} data-testid="cz-reset-all" onClick={() => setDraft((d) => { const n = { ...d }; for (const k of Object.keys(n)) if (k.startsWith('customize.')) delete n[k]; return n; })}>Reset All Customization</button>
              </fieldset>
            </div>
          )}
        </div>
        <div className="k-dialog-actions k-options-actions">
          <span className="grow" />
          <button className="k-btn primary" data-testid="cz-ok" onClick={ok}>OK</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Cancel</button>
          <button className="k-btn" onClick={() => st.pushMessage('Customize: Toolbars, Shortcut Bars, Commands, Menus, Keyboard, Mouse Gestures and Customization, as the original.')}>Help</button>
        </div>
      </div>
    </div>
  );
}
