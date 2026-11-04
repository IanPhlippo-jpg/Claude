import { Fragment, useEffect, useMemo, useState } from 'react';
import { WIRED_PREFS } from './prefsWired';

import { applySoftwareGL, SoftwareGLNote } from './softwareGL';
import { RecoverFolderRow } from './recoverFolder';
/** the length unit of each unit system (Document Properties ▸ Units) */
const SYSTEM_LENGTH: Record<string, string> = { MKS: 'meters', CGS: 'centimeters', MMGS: 'millimeters', IPS: 'inches' };
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import { COLOR_SCHEME_ITEMS, customColors, DEFAULT_PREFS, type PrefValue, savedSchemes } from './prefs';
import { type Category, type Control, DOCUMENT_CATEGORIES, SYSTEM_CATEGORIES } from './prefsSchema';

/**
 * Options dialog laid out by design: the title follows the page ("System Options - General"),
 * two tabs (System Options / Document Properties), the category list on the left with the page on
 * the right, "Search Options" at the top right, Reset… at the bottom left and OK / Cancel / Help.
 */
export function OptionsDialog() {
  const st = useStore(useShallow((s) => ({ prefs: s.prefs, setPrefs: s.setPrefs, setDialog: s.setDialog, pushMessage: s.pushMessage })));
  const [tab, setTab] = useState<'system' | 'document'>('system');
  const [cat, setCat] = useState<string>('general');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Record<string, PrefValue>>(() => ({ ...st.prefs }));
  const [schemeName, setSchemeName] = useState<string | null>(null);
  const [resetMenu, setResetMenu] = useState(false);
  const cats = tab === 'system' ? SYSTEM_CATEGORIES : DOCUMENT_CATEGORIES;
  const active = cats.find((c) => c.id === cat) ?? cats[0];
  useEffect(() => {
    if (!cats.some((c) => c.id === cat)) setCat(cats[0].id);
  }, [tab, cats, cat]);
  const title = `${tab === 'system' ? 'System Options' : 'Document Properties'} - ${active.label}`;
  const set = (key: string, v: PrefValue) => setDraft((d) => {
    const n = { ...d, [key]: v };
    if (key === 'doc.unitSystem' && SYSTEM_LENGTH[String(v).split(' ')[0]]) n['doc.lengthUnit'] = SYSTEM_LENGTH[String(v).split(' ')[0]];
    if (key === 'doc.lengthUnit' && SYSTEM_LENGTH[String(d['doc.unitSystem'] ?? '').split(' ')[0]] !== v) n['doc.unitSystem'] = 'Custom';
    return n;
  });
  const get = (key: string) => draft[key] ?? DEFAULT_PREFS[key];
  // search: categories whose labels or control labels match
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    const hit = new Set<string>();
    for (const list of [SYSTEM_CATEGORIES, DOCUMENT_CATEGORIES]) for (const c of list) {
      if (c.label.toLowerCase().includes(q)) hit.add(c.id);
      for (const s of c.sections) for (const ctl of s.controls) if ('label' in ctl && ctl.label?.toLowerCase().includes(q)) hit.add(c.id);
    }
    return hit;
  }, [q]);
  const ok = () => {
    st.setPrefs(draft);
    void applySoftwareGL(draft['perf.softwareOpenGL'] === true);
    st.setDialog(null);
  };
  const resetAll = () => setDraft({ ...DEFAULT_PREFS });
  const resetPage = () => {
    const next = { ...draft };
    for (const s of active.sections) for (const ctl of s.controls) if ('key' in ctl && ctl.key in DEFAULT_PREFS) next[ctl.key] = DEFAULT_PREFS[ctl.key];
    setDraft(next);
  };
  const action = (name?: string) => {
    const msgs: Record<string, string> = {
      fileAssociations: 'File associations are set by the installer (.kcad opens with Phlippo CAD).',
      resetColors: 'Colors follow the Blue scheme of the intended design; Dark background switches the dark theme.',
      docColors: 'Switch to Document Properties ▸ Model Display for the model colors.',
      goSnaps: 'See System Options ▸ Sketch ▸ Relations/Snaps.',
      goSystemColors: 'See System Options ▸ Colors.',
      restoreMessages: 'All dismissed messages are shown again.',
    };
    if (name === 'docColors') { setTab('document'); setCat('modelDisplay'); return; }
    if (name === 'goSnaps') { setTab('system'); setCat('sketch.relations'); return; }
    if (name === 'goSystemColors') { setTab('system'); setCat('colors'); return; }
    if (name === 'resetColors') { setDraft((d) => ({ ...d, 'colors.background': 'Light', 'colors.scheme': 'Blue', 'colors.iconColors': 'Default', 'colors.custom': '{}' })); return; }
    if (name === 'saveScheme') { setSchemeName(''); return; }
    st.pushMessage(msgs[name ?? ''] ?? 'This option has no effect in this build.');
  };

  // an option the program does not read yet is shown greyed out (QA v0.5.1 F112)
  const OFF_TIP = 'Not available in this version of Phlippo CAD.';
  const off = (key: string) => !WIRED_PREFS.has(key);
  const render = (ctl: Control, i: number) => {
    const indent = { marginLeft: ('indent' in ctl && ctl.indent ? ctl.indent * 18 : 0) };
    switch (ctl.kind) {
      case 'check':
        return (
          <Fragment key={i}>
            <label className={`k-opt-check ${ctl.disabled || off(ctl.key) ? 'disabled' : ''}`} style={indent} title={off(ctl.key) ? OFF_TIP : undefined}>
              <input type="checkbox" checked={!!get(ctl.key)} disabled={ctl.disabled || off(ctl.key)} onChange={(e) => set(ctl.key, e.target.checked)} />
              <span>{ctl.label}</span>
              {ctl.textAfter && <input className="k-input k-opt-tiny" value={String(get(ctl.textAfter) ?? '')} disabled={!get(ctl.key)} maxLength={1} onChange={(e) => set(ctl.textAfter!, e.target.value)} onKeyDown={(e) => e.stopPropagation()} />}
            </label>
            {ctl.key === 'perf.softwareOpenGL' && <SoftwareGLNote />}
          </Fragment>
        );
      case 'select':
        return (
          <div key={i} className={`k-opt-row ${ctl.inline ? 'inline' : ''} ${off(ctl.key) ? 'disabled' : ''}`} title={off(ctl.key) ? OFF_TIP : undefined}>
            {ctl.label && <label>{ctl.label}</label>}
            <select className="k-input" value={String(get(ctl.key))} disabled={off(ctl.key)} onChange={(e) => { set(ctl.key, e.target.value); if (ctl.key === 'colors.scheme') set('colors.custom', '{}'); }}>
              {[...ctl.options, ...(ctl.key === 'colors.scheme' ? Object.keys(savedSchemes(draft)) : [])].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        );
      case 'radio':
        return (
          <div key={i} className={`k-opt-radios ${off(ctl.key) ? 'disabled' : ''}`} title={off(ctl.key) ? OFF_TIP : undefined}>
            {ctl.label && <label>{ctl.label}</label>}
            {ctl.options.map((o) => (
              <label key={o} className={`k-opt-check ${off(ctl.key) ? 'disabled' : ''}`}>
                <input type="radio" name={ctl.key} checked={get(ctl.key) === o} disabled={off(ctl.key)} onChange={() => set(ctl.key, o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        );
      case 'number':
        return (
          <div key={i} className={`k-opt-row inline ${off(ctl.key) ? 'disabled' : ''}`} title={off(ctl.key) ? OFF_TIP : undefined}>
            {ctl.label && <label>{ctl.label}</label>}
            <input className="k-input k-opt-number" type="number" disabled={off(ctl.key)} value={Number(get(ctl.key))} min={ctl.min} max={ctl.max} step={ctl.step ?? 1} onChange={(e) => set(ctl.key, parseFloat(e.target.value) || 0)} onKeyDown={(e) => e.stopPropagation()} />
            {ctl.unit && <span className="k-muted">{ctl.unit}</span>}
            {ctl.after && <span>{ctl.after}</span>}
          </div>
        );
      case 'slider':
        return (
          <div key={i} className={`k-opt-row inline k-opt-slider ${off(ctl.key) ? 'disabled' : ''}`} title={off(ctl.key) ? OFF_TIP : undefined}>
            {ctl.label && <label>{ctl.label}</label>}
            {ctl.left && <span className="k-muted">{ctl.left}</span>}
            <input type="range" disabled={off(ctl.key)} min={ctl.min} max={ctl.max} value={Number(get(ctl.key))} onChange={(e) => set(ctl.key, parseFloat(e.target.value))} />
            {ctl.right && <span className="k-muted">{ctl.right}</span>}
          </div>
        );
      case 'text':
        // the auto-recover folder is kept by the desktop shell and chosen in its folder dialog (QA F156)
        if (ctl.key === 'backup.autoRecoverFolder') return <RecoverFolderRow key={i} label={ctl.label} />;
        return (
          <div key={i} className={`k-opt-row ${off(ctl.key) ? 'disabled' : ''}`} title={off(ctl.key) ? OFF_TIP : undefined}>
            <label>{ctl.label}</label>
            <div className="k-opt-text">
              <input className="k-input" disabled={off(ctl.key)} value={String(get(ctl.key) ?? '')} placeholder={ctl.placeholder} onChange={(e) => set(ctl.key, e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
              {ctl.browse && <button className="k-btn" onClick={() => st.pushMessage('Folders are chosen in the desktop app through the Windows dialogs.')}>Browse...</button>}
            </div>
          </div>
        );
      case 'button':
        return <button key={i} className="k-btn k-opt-btn" onClick={() => action(ctl.action)}>{ctl.label}</button>;
      case 'note':
        return <div key={i} className="k-opt-note">{ctl.text}</div>;
      case 'colors':
        return (
          <div key={i} className="k-opt-colors">
            <ColorList custom={customColors(draft)} onEdit={(token, color) => set('colors.custom', JSON.stringify({ ...customColors(draft), [token]: color }))} />
            <div className="k-opt-colors-side">
              <button className="k-btn" onClick={() => action('resetColors')}>Reset</button>
              {schemeName !== null && (
                <div className="k-opt-savescheme" data-testid="save-scheme">
                  <input className="k-input" placeholder="Scheme name" value={schemeName} autoFocus onChange={(e) => setSchemeName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                  <button className="k-btn" disabled={!schemeName.trim()} onClick={() => { const n = schemeName.trim(); const cs = getComputedStyle(document.documentElement); const all = Object.fromEntries(COLOR_SCHEME_ITEMS.map((it) => [it.token, cs.getPropertyValue(it.token).trim()])); setDraft((d) => ({ ...d, 'colors.schemes': JSON.stringify({ ...savedSchemes(d), [n]: { ...all, ...customColors(d) } }), 'colors.scheme': n, 'colors.custom': '{}' })); setSchemeName(null); }}>Save</button>
                </div>
              )}
            </div>
          </div>
        );
      case 'treeItems':
        return (
          <div key={i} className="k-opt-tree">
            {ctl.items.map((it) => (
              <div key={it} className="k-opt-row inline">
                <label>{it}</label>
                <select className="k-input" value={String(get(`${ctl.key}.${it}`) ?? 'Automatic')} onChange={(e) => set(`${ctl.key}.${it}`, e.target.value)}>
                  <option>Automatic</option>
                  <option>Hide</option>
                  <option>Show</option>
                </select>
              </div>
            ))}
          </div>
        );
    }
  };

  const catRow = (c: Category) => (
    <div key={c.id} className={`k-opt-cat ${c.child ? 'child' : ''} ${active.id === c.id ? 'active' : ''} ${matches && !matches.has(c.id) ? 'dim' : ''}`} onClick={() => setCat(c.id)}>
      {c.label}
    </div>
  );

  return (
    <div className="k-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && st.setDialog(null)}>
      <div className="k-dialog k-options" role="dialog" aria-label={title}>
        <div className="k-dialog-title k-options-title">
          <span>{title}</span>
          <span className="grow" />
          <button className="k-btn ghost icon k-tip" data-tip="Help" onClick={() => st.pushMessage('Options by design: System Options apply to the program, Document Properties to this document.')}><Icon.Help size={13} /></button>
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-options-top">
          <div className="k-options-tabs">
            <button className={tab === 'system' ? 'active' : ''} onClick={() => setTab('system')}>System Options</button>
            <button className={tab === 'document' ? 'active' : ''} onClick={() => setTab('document')}>Document Properties</button>
          </div>
          <span className="grow" />
          <div className="k-options-search">
            <Icon.Search size={13} />
            <input className="k-input" placeholder="Search Options" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          </div>
        </div>
        <div className="k-options-body">
          <div className="k-options-cats">{cats.map(catRow)}</div>
          <div className="k-options-page">
            {active.sections.map((s, i) => (
              <fieldset key={i} className={`k-opt-section ${s.title ? 'boxed' : ''}`}>
                {s.title && <legend className="k-opt-section-title">{s.title}</legend>}
                <div className="k-opt-section-body">{s.controls.map(render)}</div>
              </fieldset>
            ))}
          </div>
        </div>
        <div className="k-dialog-actions k-options-actions">
          <div style={{ position: 'relative' }}>
            <button className="k-btn" onClick={() => setResetMenu(!resetMenu)}>Reset...</button>
            {resetMenu && (
              <div className="k-menu k-options-reset">
                <div className="k-menu-item" onClick={() => { resetPage(); setResetMenu(false); }}>Reset options on this page</div>
                <div className="k-menu-item" onClick={() => { resetAll(); setResetMenu(false); }}>Reset all options</div>
              </div>
            )}
          </div>
          <span className="grow" />
          <button className="k-btn primary" onClick={ok}>OK</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Cancel</button>
          <button className="k-btn" onClick={() => st.pushMessage('Help: every page follows the intended design Tools ▸ Options page of the same name.')}>Help</button>
        </div>
      </div>
    </div>
  );
}

/** Color scheme settings list with the current colors of the interface. */
function ColorList({ custom, onEdit }: { custom: Record<string, string>; onEdit: (token: string, color: string) => void }) {
  const [sel, setSel] = useState(0);
  const colors = useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    return COLOR_SCHEME_ITEMS.map((it) => ({ ...it, value: custom[it.token] ?? (cs.getPropertyValue(it.token).trim() || '#808080') }));
  }, [custom]);
  const hex = (v: string) => (/^#[0-9a-f]{6}$/i.test(v) ? v : '#808080');
  return (
    <>
      <div className="k-opt-colorlist">
        {colors.map((c, i) => (
          <div key={c.label} className={`k-opt-colorrow ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>
            <span className="swatch" style={{ background: c.value }} />
            <span>{c.label}</span>
          </div>
        ))}
      </div>
      {/* Edit…: the colour of the selected entry (all entries with the same colour token follow) */}
      <label className="k-btn" style={{ position: 'relative', alignSelf: 'flex-start' }} data-testid="color-edit">
        Edit...
        <input type="color" style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} value={hex(colors[sel].value)} onChange={(e) => onEdit(colors[sel].token, e.target.value)} />
      </label>
    </>
  );
}
