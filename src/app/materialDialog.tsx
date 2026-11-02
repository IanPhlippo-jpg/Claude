import { useMemo, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';
import { MATERIAL_LIBRARIES, MATERIAL_LIBRARY, materialInfo, type MaterialDef } from '../core/document/materials';
import { getPref, loadPrefs, savePrefs } from './prefs';
import { activeConfiguration, configurations } from '../core/document/configurations';

/** the custom material library (kept between sessions) */
const loadCustom = (): MaterialDef[] => { try { return JSON.parse(String(getPref('material.custom') || '[]')); } catch { return []; } };
const saveCustom = (list: MaterialDef[]) => savePrefs({ ...loadPrefs(), 'material.custom': JSON.stringify(list) });
/** Favorites: material names kept between sessions (the right-click material menu of the tree lists them) */
import { materialFavorites as loadFavorites } from './prefs';
const saveFavorites = (list: string[]) => savePrefs({ ...loadPrefs(), 'material.favorites': JSON.stringify(list) });
/** stress units of the Properties table: factor from N/m² */
const STRESS = { pa: { f: 1, u: 'N/m^2' }, mpa: { f: 1e-6, u: 'N/mm^2' }, psi: { f: 1 / 6894.757, u: 'psi' } } as const;

const TABS = ['Properties', 'Appearance', 'CrossHatch', 'Custom', 'Application Data', 'Favorites', 'Sheet Metal'];

const fmtNum = (v?: number) => (v === undefined ? '' : v >= 1e6 || v < 1e-3 ? v.toExponential(3).replace('e+', 'e+') : String(v));

/**
 * Material dialog by design: the library tree on the left (categories ▸ materials, with a
 * search box), the tabs on the right with the Properties table, and Save / Config… / Apply /
 * Close / Help. Apply sets the document material (density for Mass Properties, colour of the body).
 */
export function MaterialDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, applyDocument: s.applyDocument, setMaterial: s.setMaterial, pushMessage: s.pushMessage, setDialog: s.setDialog })));
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({ Steel: true });
  const [sel, setSel] = useState<MaterialDef | null>(() => (st.doc.material ? MATERIAL_LIBRARIES.flatMap((l) => l.categories.flatMap((c) => c.materials)).find((m) => m.name === st.doc.material!.name) ?? null : null));
  const [tab, setTab] = useState('Properties');
  const [custom, setCustom] = useState<MaterialDef[]>(loadCustom);
  const [edit, setEdit] = useState<MaterialDef | null>(null);
  const [units, setUnits] = useState<keyof typeof STRESS>('pa');
  const [applyLook, setApplyLook] = useState(true);
  const [cfgPanel, setCfgPanel] = useState(false);
  const [cfgScope, setCfgScope] = useState<'this' | 'all'>('all');
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [favSel, setFavSel] = useState<string | null>(null);
  const allMaterials = useMemo(() => [...MATERIAL_LIBRARIES.flatMap((l) => l.categories.flatMap((c) => c.materials)), ...custom], [custom]);
  const setFavs = (list: string[]) => { setFavorites(list); saveFavorites(list); };
  const q = query.trim().toLowerCase();
  const cats = useMemo(() => [...MATERIAL_LIBRARY, ...(custom.length ? [{ name: 'Custom Materials', materials: custom }] : [])].map((c) => ({ ...c, materials: c.materials.filter((m) => !q || m.name.toLowerCase().includes(q)) })).filter((c) => c.materials.length), [q, custom]);
  const isCustom = !!sel && custom.some((m) => m.name === sel.name);
  const cur = edit ?? sel;
  const apply = () => {
    if (!cur) return;
    // Apply appearance of the material off: the body keeps the colour it has
    const m = { name: cur.name, density: cur.density, color: applyLook ? cur.color : st.doc.appearance ?? st.doc.material?.color ?? '#c8c8cc' };
    // Config…: This configuration only keeps the other configurations' material
    if (cfgScope === 'this' && configurations(st.doc).length > 1) {
      const active = activeConfiguration(st.doc);
      const base = st.doc.materialBase !== undefined ? st.doc.materialBase : st.doc.material ?? null;
      st.applyDocument('Material', { ...st.doc, material: m, materialBase: base, configurations: configurations(st.doc).map((c) => (c.id === active.id ? { ...c, material: m } : c)) });
    } else if (st.doc.materialBase !== undefined) {
      st.applyDocument('Material', { ...st.doc, material: m, materialBase: undefined, configurations: configurations(st.doc).map((c) => ({ ...c, material: undefined })) });
    } else st.setMaterial(m);
    st.pushMessage(`Material ${cur.name} applied${cfgScope === 'this' && configurations(st.doc).length > 1 ? ` to ${activeConfiguration(st.doc).name}` : ''}.`);
  };
  // Copy to the custom library: an editable copy
  const copyToCustom = () => {
    if (!sel) return;
    let name = `${sel.name} (custom)`;
    for (let i = 2; custom.some((m) => m.name === name); i++) name = `${sel.name} (custom ${i})`;
    const copy = { ...sel, name };
    const list = [...custom, copy];
    setCustom(list);
    saveCustom(list);
    setSel(copy);
    setEdit(null);
    setOpen({ ...open, 'Custom Materials': true });
  };
  const save = () => {
    if (!edit || !sel) return;
    const list = custom.map((m) => (m.name === sel.name ? edit : m));
    setCustom(list);
    saveCustom(list);
    setSel(edit);
    setEdit(null);
    st.pushMessage(`${edit.name} saved in Custom Materials.`);
  };
  const S = STRESS[units];
  const stress = (v?: number) => (v === undefined ? '' : fmtNum(Number((v * S.f).toPrecision(6))));
  type Key = 'elasticModulus' | 'poisson' | 'shearModulus' | 'density' | 'tensile' | 'compressive' | 'yield' | 'thermalExpansion' | 'conductivity' | 'specificHeat';
  const rows: [string, string, string, Key, number][] = cur
    ? [
        ['Elastic Modulus', stress(cur.elasticModulus), S.u, 'elasticModulus', S.f],
        ["Poisson's Ratio", fmtNum(cur.poisson), 'N/A', 'poisson', 1],
        ['Shear Modulus', stress(cur.shearModulus), S.u, 'shearModulus', S.f],
        ['Mass Density', String(cur.density), 'kg/m^3', 'density', 1],
        ['Tensile Strength', stress(cur.tensile), S.u, 'tensile', S.f],
        ['Compressive Strength', stress(cur.compressive), S.u, 'compressive', S.f],
        ['Yield Strength', stress(cur.yield), S.u, 'yield', S.f],
        ['Thermal Expansion Coefficient', fmtNum(cur.thermalExpansion), '/K', 'thermalExpansion', 1],
        ['Thermal Conductivity', fmtNum(cur.conductivity), 'W/(m·K)', 'conductivity', 1],
        ['Specific Heat', fmtNum(cur.specificHeat), 'J/(kg·K)', 'specificHeat', 1],
      ]
    : [];
  return (
    <div className="k-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && st.setDialog(null)}>
      <div className="k-dialog k-material" role="dialog" aria-label="Material">
        <div className="k-dialog-title k-options-title">
          <span>Material</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={12} /></button>
        </div>
        <div className="k-material-body">
          <div className="k-material-tree">
            <div className="k-material-search">
              <input className="k-input" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
              <Icon.Search size={13} />
            </div>
            <div className="k-material-list">
              {MATERIAL_LIBRARIES.filter((l) => l.categories !== MATERIAL_LIBRARY).map((lib) => (
                // the other libraries, each its own root (DIN, Additional Materials)
                <div key={lib.name}>
                  <div className="k-material-root" onClick={() => setOpen({ ...open, [lib.name]: !open[lib.name] })}>{open[lib.name] || q ? <Icon.ChevronDown size={10} /> : <Icon.ChevronRight size={10} />} <Icon.Material size={14} /> {lib.name}</div>
                  {(open[lib.name] || q) && lib.categories.map((c) => ({ ...c, materials: c.materials.filter((x) => !q || x.name.toLowerCase().includes(q)) })).filter((c) => c.materials.length).map((c) => (
                    <div key={c.name} style={{ paddingLeft: 12 }}>
                      <div className="k-material-cat" onClick={() => setOpen({ ...open, [lib.name + c.name]: !open[lib.name + c.name] })}>{open[lib.name + c.name] || q ? <Icon.ChevronDown size={10} /> : <Icon.ChevronRight size={10} />} <Icon.Folder size={14} /> {c.name}</div>
                      {(open[lib.name + c.name] || q) && c.materials.map((mat) => (
                        <div key={mat.name} className={`k-material-item ${sel?.name === mat.name ? 'active' : ''}`} onClick={() => { setSel(mat); setEdit(null); }}><span className="swatch" style={{ background: mat.color }} /> {mat.name}</div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div className="k-material-root"><Icon.Material size={14} /> Phlippo CAD Materials</div>
              {cats.map((c) => (
                <div key={c.name}>
                  <div className="k-material-cat" onClick={() => setOpen({ ...open, [c.name]: !open[c.name] })}>
                    {open[c.name] || q ? <Icon.ChevronDown size={10} /> : <Icon.ChevronRight size={10} />} <Icon.Folder size={14} /> {c.name}
                  </div>
                  {(open[c.name] || q) && c.materials.map((mat) => (
                    <div key={mat.name} className={`k-material-item ${sel?.name === mat.name ? 'active' : ''}`} onClick={() => { setSel(mat); setEdit(null); }} onDoubleClick={() => { setSel(mat); st.setMaterial({ name: mat.name, density: mat.density, color: mat.color }); st.setDialog(null); }}>
                      <span className="swatch" style={{ background: mat.color }} /> {mat.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="k-material-right">
            <div className="k-material-tabs">
              {TABS.map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
            </div>
            <div className="k-material-page">
              {!cur && tab !== 'Favorites' ? (
                <div className="k-material-empty">Select a material to Apply/Edit</div>
              ) : tab === 'Properties' && cur ? (
                <>
                  <div className="k-field"><label>Material properties</label>{isCustom ? <span className="k-muted">A custom material: edit the values, then Save.</span> : <span className="k-muted">Materials in the default library can not be edited. You must first copy the material to a custom library to edit it.</span>}</div>
                  {!isCustom && <button className="k-btn" data-testid="mat-copy" style={{ alignSelf: 'flex-start', marginBottom: 4 }} onClick={copyToCustom}>Copy to Custom Materials</button>}
                  <div className="k-pm-valuerow"><label>Model Type:</label><input className="k-input" readOnly value="Linear Elastic Isotropic" /></div>
                  <label className="k-check" style={{ marginLeft: 92 }}><input type="checkbox" data-testid="mat-savemodeltype" disabled={!isCustom} defaultChecked={isCustom} /> Save model type in library</label>
                  <div className="k-pm-valuerow"><label>Units:</label><select className="k-input" data-testid="mat-units" value={units} onChange={(e) => setUnits(e.target.value as 'pa')}><option value="pa">SI - N/m^2 (Pa)</option><option value="mpa">SI - N/mm^2 (MPa)</option><option value="psi">English (IPS)</option></select></div>
                  <div className="k-pm-valuerow"><label>Category:</label><input className="k-input" value={isCustom ? 'Custom Materials' : MATERIAL_LIBRARIES.flatMap((l) => l.categories).find((c) => c.materials.some((m) => m.name === cur.name))?.name ?? ''} readOnly /></div>
                  <div className="k-pm-valuerow"><label>Name:</label><input className="k-input" data-testid="mat-name" value={cur.name} readOnly={!isCustom} onChange={(e) => setEdit({ ...cur, name: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>
                  <div className="k-pm-valuerow"><label>Description:</label><input className="k-input" data-testid="mat-description" value={isCustom ? (cur.description ?? '') : materialInfo(cur).description} readOnly={!isCustom} onChange={(e) => setEdit({ ...cur, description: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>
                  <div className="k-pm-valuerow"><label>Source:</label><input className="k-input" data-testid="mat-source" value={isCustom ? (cur.source ?? '') : materialInfo(cur).source} readOnly={!isCustom} onChange={(e) => setEdit({ ...cur, source: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></div>
                  <div className="k-pm-valuerow"><label>Environmental Class:</label><input className="k-input" data-testid="mat-sustainability" value={isCustom ? (cur.sustainability ?? '') : materialInfo(cur).sustainability} readOnly={!isCustom} onChange={(e) => setEdit({ ...cur, sustainability: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />{!isCustom && <button className="k-btn" onClick={() => st.pushMessage('Environmental Class: the class groups materials for an environmental impact estimate; set it on a custom material.', 'info')}>Select…</button>}</div>
                  <table className="k-material-props">
                    <thead><tr><th>Property</th><th>Value</th><th>Units</th></tr></thead>
                    <tbody>{rows.map(([p, v, u, k, f]) => <tr key={p} className={v ? '' : 'k-muted'}><td>{p}</td><td>{isCustom ? <input className="k-input" data-testid={'mat-' + k} style={{ width: 110 }} type="number" value={v} onChange={(e) => setEdit({ ...cur, [k]: e.target.value === '' ? undefined : Number(e.target.value) / f })} onKeyDown={(e) => e.stopPropagation()} /> : v}</td><td>{u}</td></tr>)}</tbody>
                  </table>
                </>
              ) : tab === 'Appearance' && cur ? (
                <div className="k-field"><label>Appearance</label><div className="k-pm-valuerow"><span className="swatch" style={{ background: cur.color, width: 40, height: 20, display: 'inline-block', border: '1px solid #888' }} /> <span>{cur.name} (color)</span>{isCustom && <input type="color" value={cur.color} onChange={(e) => setEdit({ ...cur, color: e.target.value })} />}</div><label className="k-check"><input type="checkbox" data-testid="mat-applylook" checked={applyLook} onChange={(e) => setApplyLook(e.target.checked)} /> Apply appearance of the material</label></div>
              ) : tab === 'Favorites' ? (
                <div className="k-field" data-testid="mat-favorites">
                  <label>Favorites</label>
                  <p className="k-muted">Favorite materials appear in the material menu of the Feature Tree (right-click the Material item). Select a material in the tree on the left and click Add.</p>
                  <div className="k-selbox" style={{ minHeight: 120 }}>
                    {favorites.map((n) => <div key={n} className={`k-selbox-row${favSel === n ? ' selected' : ''}`} style={favSel === n ? { background: 'var(--bg-selected)' } : undefined} onClick={() => setFavSel(n)}><span className="swatch" style={{ background: allMaterials.find((m) => m.name === n)?.color ?? '#ccc', width: 12, height: 12, display: 'inline-block', marginRight: 6 }} />{n}</div>)}
                    {!favorites.length && <span className="k-muted">No favorites yet.</span>}
                  </div>
                  <div className="k-pm-stylerow" style={{ marginTop: 6 }}>
                    <button className="k-btn" data-testid="mat-fav-add" disabled={!sel || favorites.includes(sel.name)} onClick={() => sel && setFavs([...favorites, sel.name])}>Add</button>
                    <button className="k-btn" data-testid="mat-fav-remove" disabled={!favSel} onClick={() => { setFavs(favorites.filter((n) => n !== favSel)); setFavSel(null); }}>Remove</button>
                    <button className="k-btn" disabled={!favSel || favorites.indexOf(favSel) <= 0} onClick={() => { const i = favorites.indexOf(favSel!); const l = favorites.slice(); [l[i - 1], l[i]] = [l[i], l[i - 1]]; setFavs(l); }}>Up</button>
                    <button className="k-btn" disabled={!favSel || favorites.indexOf(favSel) >= favorites.length - 1} onClick={() => { const i = favorites.indexOf(favSel!); const l = favorites.slice(); [l[i + 1], l[i]] = [l[i], l[i + 1]]; setFavs(l); }}>Down</button>
                  </div>
                </div>
              ) : (
                <div className="k-material-empty">No {tab} data for this material.</div>
              )}
            </div>
          </div>
        </div>
        <div className="k-dialog-actions">
          {cfgPanel && (
            <span className="k-mat-cfg" data-testid="mat-cfg-panel" style={{ marginRight: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <label className="k-check"><input type="radio" name="matcfg" checked={cfgScope === 'this'} data-testid="mat-cfg-this" onChange={() => setCfgScope('this')} /> This configuration ({activeConfiguration(st.doc).name})</label>
              <label className="k-check"><input type="radio" name="matcfg" checked={cfgScope === 'all'} onChange={() => setCfgScope('all')} /> All configurations</label>
            </span>
          )}
          <button className="k-btn" data-testid="mat-save" disabled={!isCustom || !edit} onClick={save}>Save</button>
          <button className={`k-btn${cfgPanel ? ' active' : ''}`} data-testid="mat-config" onClick={() => setCfgPanel((x) => !x)}>Config...</button>
          <button className="k-btn primary" disabled={!cur} onClick={apply}>Apply</button>
          <button className="k-btn" onClick={() => st.setDialog(null)}>Close</button>
          <button className="k-btn" onClick={() => st.pushMessage('Pick a material in the tree and click Apply; the density drives Mass Properties.')}>Help</button>
        </div>
      </div>
    </div>
  );
}
