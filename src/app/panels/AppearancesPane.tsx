import { useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../../ui/icons';
import { getPref, loadPrefs, savePrefs } from '../prefs';
import { activeConfiguration, configurations } from '../../core/document/configurations';

/**
 * Appearances, Scenes, and Decals task pane, laid out by design: a navigation bar, a folder tree
 * (Appearances / Scenes / Decals with their sub folders), the "Default Appearance" line with the yellow hint, and the
 * swatches of the chosen folder as shaded spheres. Click selects, double-click or the right-click menu applies to the
 * part, and a swatch can be dragged onto the model.
 */
type Kind = 'metal' | 'gloss' | 'matte' | 'glass';
type Swatch = { name: string; color: string; kind: Kind };
type Folder = { name: string; items?: Swatch[]; children?: Folder[] };

const m = (name: string, color: string, kind: Kind = 'metal'): Swatch => ({ name, color, kind });

export const APPEARANCE_TREE: Folder[] = [
  {
    name: 'Appearances(color)',
    children: [
      { name: 'Plastic', children: [
        // the folders and names of the intended Plastic library (53/0068)
        { name: 'High Gloss', items: [m('white high gloss plastic', '#f4f4f2', 'gloss'), m('cream high gloss plastic', '#efe6cf', 'gloss'), m('beige high gloss plastic', '#dccbab', 'gloss'), m('light grey high gloss plastic', '#c9cbcd', 'gloss'), m('high gloss black plastic', '#1b1b1b', 'gloss'), m('high gloss red plastic', '#c4232a', 'gloss'), m('high gloss white plastic', '#f2f2f2', 'gloss')] },
        { name: 'Medium Gloss', items: [m('medium gloss black plastic', '#262626', 'gloss'), m('medium gloss grey plastic', '#8a8d91', 'gloss')] },
        { name: 'Low Gloss', items: [m('low gloss black plastic', '#2b2b2b', 'matte'), m('low gloss beige plastic', '#d8c8a8', 'matte')] },
        { name: 'Soft Touch', items: [m('soft touch black plastic', '#232323', 'matte'), m('soft touch grey plastic', '#6d7074', 'matte')] },
        { name: 'Textured', items: [m('textured black plastic', '#2a2a2a', 'matte'), m('textured white plastic', '#e8e8e6', 'matte')] },
        { name: 'Clear Plastic', items: [m('clear plastic', '#dfe9ee', 'glass'), m('smoke clear plastic', '#8f969b', 'glass')] },
        { name: 'Satin Finish', items: [m('satin finish black plastic', '#2d2d2d', 'matte'), m('satin finish white plastic', '#eeeeec', 'matte')] },
        { name: 'EDM', items: [m('EDM black plastic', '#303030', 'matte'), m('EDM grey plastic', '#7a7d81', 'matte')] },
        { name: 'Patterned', items: [m('patterned black plastic', '#292929', 'matte'), m('patterned blue plastic', '#2f5fa8', 'matte')] },
        { name: 'Matte', items: [m('matte black plastic', '#2a2a2a', 'matte'), m('matte white plastic', '#ececec', 'matte'), m('matte blue plastic', '#2f5fa8', 'matte')] },
      ] },
      { name: 'Metal', children: [
        { name: 'Steel', items: [m('polished steel', '#c9ccd0'), m('brushed steel', '#b8bcc2'), m('cast carbon steel', '#8c8f93'), m('satin finish stainless steel', '#c2c5c9'), m('galvanized steel', '#a9adb2')] },
        { name: 'Chrome', items: [m('chrome', '#e3e6ea'), m('satin chrome', '#c9ccd1'), m('black chrome', '#4a4c50')] },
        { name: 'Aluminum', items: [m('polished aluminum', '#d6d8db'), m('brushed aluminum', '#c8cacd'), m('satin finish aluminum', '#cfd1d4'), m('matte aluminum', '#bfc1c4'), m('sand blasted aluminum', '#b9bbbe'), m('anodized aluminum', '#c3c5c8'), m('cast aluminum', '#b2b4b7'), m('blue anodized aluminum', '#2f63b4'), m('aluminum treadplate', '#bcbec1')] },
        { name: 'Bronze', items: [m('polished bronze', '#b9874b'), m('cast bronze', '#8f6a3e')] },
        { name: 'Brass', items: [m('polished brass', '#d4ad55'), m('satin brass', '#c09a4c')] },
        { name: 'Copper', items: [m('polished copper', '#c27a4f'), m('oxidized copper', '#5f9c86')] },
        { name: 'Nickel', items: [m('polished nickel', '#c8c3b6')] },
        { name: 'Zinc', items: [m('zinc', '#b4b9bd')] },
        { name: 'Magnesium', items: [m('magnesium', '#c5c8cb')] },
        { name: 'Iron', items: [m('cast iron', '#5f6164'), m('wrought iron', '#4c4d50')] },
        { name: 'Titanium', items: [m('polished titanium', '#aeb0ae'), m('satin titanium', '#9fa19f')] },
        { name: 'Tungsten', items: [m('tungsten', '#8e9093')] },
        { name: 'Gold', items: [m('polished gold', '#e0b445'), m('satin gold', '#c9a240')] },
        { name: 'Silver', items: [m('polished silver', '#d9dadc')] },
        { name: 'Platinum', items: [m('platinum', '#d2d2cf')] },
      ] },
      { name: 'Painted', children: [
        { name: 'Car', items: [m('car paint yellow', '#f0c419', 'gloss'), m('car paint red', '#b51d22', 'gloss'), m('metallic blue', '#244c8f', 'gloss')] },
        { name: 'Powder Coat', items: [m('powder coat green', '#3f8f4f', 'matte'), m('powder coat grey', '#7d8288', 'matte'), m('powder coat black', '#252525', 'matte')] },
      ] },
      { name: 'Rubber', children: [{ name: 'Matte', items: [m('matte rubber', '#2a2a2a', 'matte'), m('textured rubber', '#333333', 'matte')] }] },
      { name: 'Glass', children: [{ name: 'Gloss', items: [m('clear glass', '#cfe3ea', 'glass'), m('blue glass', '#7fb0d6', 'glass'), m('green glass', '#8fc4a0', 'glass')] }] },
      { name: 'Organic', children: [{ name: 'Wood', items: [m('oak', '#b98a4e', 'matte'), m('walnut', '#6e4a2c', 'matte'), m('maple', '#d9b98a', 'matte'), m('beech', '#c8996a', 'matte')] }] },
      { name: 'Stone', children: [{ name: 'Architectural', items: [m('concrete', '#a3a3a0', 'matte'), m('granite', '#7b7671', 'matte'), m('marble', '#e6e2dc', 'gloss')] }] },
    ],
  },
  { name: 'Scenes', children: [{ name: 'Basic Scenes', items: [m('Plain White', '#ffffff', 'matte'), m('Studio Room', '#8b9097', 'matte'), m('Grey Gradient', '#e9eaec', 'matte')] }] },
  { name: 'Decals', items: [m('Phlippo badge', '#1f4fa8', 'gloss')] },
];

/** a shaded sphere as the intended swatch thumbnails: highlight, body colour, dark rim */
function sphere(s: Swatch) {
  const hi = s.kind === 'metal' || s.kind === 'gloss' ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)';
  const alpha = s.kind === 'glass' ? 0.65 : 1;
  return {
    background: `radial-gradient(circle at 35% 30%, ${hi} 0%, ${s.color} ${s.kind === 'metal' ? 38 : 30}%, ${s.color} 58%, rgba(0,0,0,${s.kind === 'metal' ? 0.55 : 0.4}) 100%)`,
    opacity: alpha,
  };
}

function findFolder(list: Folder[], path: string): Folder | null {
  for (const f of list) {
    const p = f.name;
    if (p === path) return f;
    if (path.startsWith(p + '/')) return findFolder(f.children ?? [], path.slice(p.length + 1));
  }
  return null;
}

/** the user's own library (Add to Library / New Folder), kept between sessions */
const loadMine = (): Folder[] => { try { return JSON.parse(String(getPref('appearance.custom') || '[]')); } catch { return []; } };
const saveMine = (f: Folder[]) => savePrefs({ ...loadPrefs(), 'appearance.custom': JSON.stringify(f) });
const MINE = 'My Appearances';

export function AppearancesPane() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, pushMessage: s.pushMessage, setScene: s.setScene, startDecal: s.startDecal, setAppearance: s.setAppearance, setDialog: s.setDialog, applyDocument: s.applyDocument })));
  const [path, setPathRaw] = useState('Appearances(color)/Metal/Aluminum');
  // Back / Forward: the folders visited
  const [hist, setHist] = useState<{ list: string[]; at: number }>({ list: ['Appearances(color)/Metal/Aluminum'], at: 0 });
  const setPath = (p: string | ((x: string) => string)) => {
    const next = typeof p === 'function' ? p(path) : p;
    if (next === path) return;
    setPathRaw(next);
    setHist((h) => ({ list: [...h.list.slice(0, h.at + 1), next], at: h.at + 1 }));
  };
  const go = (d: -1 | 1) => setHist((h) => {
    const at = Math.max(0, Math.min(h.list.length - 1, h.at + d));
    setPathRaw(h.list[at]);
    return { ...h, at };
  });
  const [mine, setMine] = useState<Folder[]>(loadMine);
  const tree: Folder[] = [...(mine.length ? [{ name: MINE, children: mine }] : []), ...APPEARANCE_TREE];
  const updateMine = (f: Folder[]) => { setMine(f); saveMine(f); };
  // New Folder: in My Appearances (inside the chosen folder of it)
  const newFolder = () => {
    let n = 1;
    while (mine.some((f) => f.name === `New Folder${n}`)) n++;
    updateMine([...mine, { name: `New Folder${n}`, items: [] }]);
    setOpen((o) => new Set([...o, MINE]));
    setPath(`${MINE}/New Folder${n}`);
  };
  // Add to Library: the part's current appearance into the chosen My Appearances folder (or a new one)
  const addToLibrary = () => {
    const color = st.doc.appearance ?? st.doc.material?.color;
    if (!color) {
      st.pushMessage('The part has no appearance to add; apply one first.', 'warn');
      return;
    }
    const target = path.startsWith(MINE + '/') ? path.slice(MINE.length + 1).split('/')[0] : null;
    const list = mine.length ? mine : [{ name: 'Custom', items: [] }];
    const name = target && list.some((f) => f.name === target) ? target : list[0].name;
    const sw: Swatch = { name: `${st.doc.name} appearance ${color}`, color, kind: 'gloss' };
    updateMine(list.map((f) => (f.name === name ? { ...f, items: [...(f.items ?? []).filter((x) => x.color !== color), sw] } : f)));
    setOpen((o) => new Set([...o, MINE]));
    setPath(`${MINE}/${name}`);
    st.pushMessage(`Appearance added to ${MINE}/${name}.`);
  };
  const [dsMenu, setDsMenu] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set(['Appearances(color)', 'Appearances(color)/Metal']));
  const [sel, setSel] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; s: Swatch } | null>(null);
  const folder = findFolder(tree, path);
  const items = folder?.items ?? [];
  const isScene = path.startsWith('Scenes');
  const isDecal = path.startsWith('Decals');
  const apply = (s: Swatch) => {
    if (isScene) st.setScene(s.name === 'Plain White' ? { background: 'white' } : s.name === 'Studio Room' ? { background: 'studio' } : { background: 'gradient' });
    else if (isDecal) st.startDecal();
    else st.setAppearance(s.color, null);
  };
  const row = (f: Folder, base: string, depth: number) => {
    const p = base ? `${base}/${f.name}` : f.name;
    const kids = f.children ?? [];
    const isOpen = open.has(p);
    return (
      <div key={p}>
        <div className={`k-ap-row${path === p ? ' active' : ''}`} style={{ paddingLeft: 4 + depth * 16 }} onClick={() => setPath(p)} onDoubleClick={() => setOpen((o) => { const n = new Set(o); if (n.has(p)) n.delete(p); else n.add(p); return n; })}>
          <span className="k-ap-caret" onClick={(e) => { e.stopPropagation(); setOpen((o) => { const n = new Set(o); if (n.has(p)) n.delete(p); else n.add(p); return n; }); }}>{kids.length ? <Icon.TreeCaret open={isOpen} /> : null}</span>
          {/* the categories are folders with a colour ball, by design; the root of each library its own sign */}
          <span className="k-ap-hl">{depth === 0 ? (f.name.startsWith('Scenes') ? <Icon.TPPalette size={16} /> : f.name.startsWith('Decals') ? <Icon.Palette size={16} /> : <Icon.TPAppearances size={16} />) : <span className="k-ap-folder"><Icon.Folder size={16} /><Icon.TPAppearances size={9} /></span>}<span>{f.name}</span></span>
        </div>
        {isOpen && kids.map((k) => row(k, p, depth + 1))}
      </div>
    );
  };
  return (
    <div className="k-ap" onClick={() => setMenu(null)}>
      <div className="k-ap-nav">
        <button className="k-tip" data-tip="Back" data-testid="ap-back" disabled={hist.at === 0} onClick={() => go(-1)}><Icon.Undo size={14} /></button>
        <button className="k-tip" data-tip="Forward" data-testid="ap-forward" disabled={hist.at >= hist.list.length - 1} onClick={() => go(1)}><Icon.Redo size={14} /></button>
        <button className="k-tip" data-tip="Add to Library" data-testid="ap-addlib" onClick={addToLibrary}><Icon.TPAppearances size={14} /></button>
        <button className="k-tip" data-tip="New Folder" data-testid="ap-newfolder" onClick={newFolder}><Icon.Folder size={14} /></button>
        <button className="k-tip" data-tip="Refresh" onClick={() => setSel(null)}><Icon.Rebuild size={14} /></button>
        <button className="k-tip" data-tip="Up One Level" onClick={() => setPath((p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : p))}><Icon.ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} /></button>
      </div>
      <div className="k-ap-tree" data-testid="appearance-tree">{tree.map((f) => row(f, '', 0))}</div>
      <div className="k-ap-split">
        <div className="k-ap-default">Default Appearance: {st.doc.appearance ? 'custom' : 'color'}</div>
        <div className="k-ap-hint">Drag and drop appearances onto the model or Feature Tree. Double-click to apply to the part.</div>
      </div>
      <div className="k-ap-grid" data-testid="appearance-grid">
        {items.map((s) => (
          <div
            key={s.name}
            className={`k-ap-swatch${sel === s.name ? ' selected' : ''}`}
            data-testid="appearance-swatch"
            draggable={!isScene && !isDecal}
            onDragStart={(e) => { e.dataTransfer.setData('application/x-phlippo-appearance', s.color); e.dataTransfer.effectAllowed = 'copy'; setSel(s.name); }}
            onClick={(e) => { e.stopPropagation(); setSel(s.name); setMenu(null); }}
            onDoubleClick={() => apply(s)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSel(s.name); setMenu({ x: e.clientX, y: e.clientY, s }); }}
          >
            <div className="k-ap-ball" style={sphere(s)} />
            <span>{s.name}</span>
          </div>
        ))}
        {!items.length && <span className="k-muted" style={{ padding: 6 }}>Select a folder with appearances.</span>}
      </div>
      {st.doc.appearance && <button className="k-btn" style={{ margin: '6px 8px' }} onClick={() => st.setAppearance(null, null)}>Remove Appearance</button>}
      {menu && (
        <div className="k-ap-menu" style={{ left: Math.min(menu.x, window.innerWidth - 250), top: Math.min(menu.y, window.innerHeight - 190) }} data-testid="appearance-menu" onClick={(e) => e.stopPropagation()}>
          <button className="k-ap-menu-item" onClick={() => { apply(menu.s); setMenu(null); }}><Icon.Appearance size={14} /> {isScene ? 'Apply Scene' : isDecal ? 'Add Decal to part' : 'Add Appearance to part'}</button>
          <button className="k-ap-menu-item" onClick={() => { void navigator.clipboard?.writeText(menu.s.color); setMenu(null); }}><Icon.Properties size={14} /> Copy Appearance File</button>
          <button className="k-ap-menu-item" onClick={() => { apply(menu.s); setMenu(null); }}><span style={{ width: 14 }} /> Set as default appearance</button>
          <button className="k-ap-menu-item" onClick={() => { st.setDialog('appearance'); setMenu(null); }}><Icon.Properties size={14} /> Properties</button>
          <button className="k-ap-menu-item" data-testid="ap-ds" onClick={() => setDsMenu((x) => !x)}><span style={{ width: 14 }} /> Display States Target ▸</button>
          {dsMenu && (
            <>
              <button className="k-ap-menu-item" style={{ paddingLeft: 28 }} data-testid="ap-ds-this" onClick={() => { const a = activeConfiguration(st.doc); st.applyDocument('Appearance', { ...st.doc, configurations: configurations(st.doc).map((c) => (c.id === a.id ? { ...c, color: menu.s.color } : c)) }); setMenu(null); setDsMenu(false); }}>This display state ({activeConfiguration(st.doc).name})</button>
              <button className="k-ap-menu-item" style={{ paddingLeft: 28 }} onClick={() => { st.applyDocument('Appearance', { ...st.doc, appearance: menu.s.color, configurations: st.doc.configurations?.map((c) => ({ ...c, color: undefined })) }); setMenu(null); setDsMenu(false); }}>All display states</button>
            </>
          )}
          <button className="k-ap-menu-item" onClick={() => { apply(menu.s); setMenu(null); }}><span style={{ width: 14 }} /> Set as default for '{folder?.name}'</button>
        </div>
      )}
    </div>
  );
}
