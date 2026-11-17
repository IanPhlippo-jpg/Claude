import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { Button } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { withUnsavedCheck } from '../MenuBar';
import { getPref } from '../prefs';
import { ISO273 } from '../../core/library/iso';
import { LIBRARY_FOLDERS, STANDARDS, standardLengths, standardPart, standardPartDimensions, standardPartName, standardSizes, type StandardId } from '../../core/library/parts';

/** the standards of each folder of the library */
const FOLDERS = LIBRARY_FOLDERS.map((folder) => ({ folder, items: STANDARDS.filter((s) => s.folder === folder) }));
const NOTES: Record<string, string> = {
  d: 'thread', P: 'pitch', l: 'length', dk: 'head Ø', k: 'head height', s: 'across flats', t: 'socket depth', b: 'thread length',
  m: 'height', e: 'across corners', dw: 'bearing Ø', d1: 'hole Ø', d2: 'outside Ø', h: 'thickness', dp: 'point Ø', c: 'end chamfer',
  D: 'outside Ø', B: 'width', r: 'corner chamfer',
};
const NOTES_OF: Partial<Record<StandardId, Record<string, string>>> = {
  iso10642: { dk: 'head Ø (theoretical)' },
  iso7040: { h: 'overall height', m: 'hexagon height' },
  iso2338: { d: 'nominal Ø' },
  iso8752: { d: 'nominal Ø (hole)', d1: 'Ø before fitting', s: 'wall' },
  din471: { d1: 'shaft Ø', d2: 'groove Ø', d3: 'free inside Ø', b: 'radial width ≈', m: 'groove width', s: 'thickness' },
  din472: { d1: 'bore Ø', d2: 'groove Ø', d3: 'free outside Ø', b: 'radial width ≈', m: 'groove width', s: 'thickness' },
  iso15: { d: 'bore', D: 'outside Ø', B: 'width', r: 'corner chamfer' },
};

/**
 * Part Library ▸ Standard Parts: the parts made to the dimensions of their standard (screws, nuts and washers of M3
 * to M24, pins, retaining rings, ball bearings), chosen by standard, size and length, then inserted into the open
 * assembly (placed with a click, the normal Insert Components route) or opened as a part.
 */
export function StandardPartsFolder() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, prefs: s.prefs, setPrefs: s.setPrefs, startInsertComponent: s.startInsertComponent, setInsertGhost: s.setInsertGhost })));
  const [open, setOpen] = useState(true);
  const [choice, setChoice] = useState<StandardId>('iso4762');
  const [size, setSize] = useState('M6');
  const [len, setLen] = useState(20);
  // the add-in state: the options (Load now) or the Add-Ins tab of the ribbon
  const loaded = st.prefs['addin.standardParts'] === true || getPref('addin.standardParts') === true;
  const sizes = standardSizes(choice);
  const sz = sizes.includes(size) ? size : sizes[0];
  const lengths = standardLengths(choice, sz);
  const l = lengths.length ? (lengths.includes(len) ? len : lengths.reduce((b, x) => (Math.abs(x - len) < Math.abs(b - len) ? x : b))) : undefined;
  const spec = { standard: choice, size: sz, length: l };
  const part = () => standardPart(spec);
  const name = standardPartName(spec);
  const dims = standardPartDimensions(spec);
  const notes = { ...NOTES, ...NOTES_OF[choice] };
  const hole = STANDARDS.find((x) => x.id === choice)?.folder === 'Bolts and Screws' ? ISO273[sz] : undefined;
  return (
    <div className={`k-library-folder ${open ? 'open' : ''}`} data-testid="toolbox-folder">
      <div className="k-library-folder-row" onClick={() => setOpen(!open)}>
        {open ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />}
        <Icon.Folder />
        <span className="grow">Standard Parts <span className="k-muted">(ISO, DIN)</span></span>
      </div>
      {open && !loaded && (
        <div className="k-library-items" style={{ padding: 6 }}>
          <p className="k-muted" style={{ margin: '0 0 6px' }}>Standard Parts is not loaded.</p>
          <Button data-testid="stdparts-load" onClick={() => st.setPrefs({ ...st.prefs, 'addin.standardParts': true })}>Load now</Button>
        </div>
      )}
      {open && loaded && (
        <div className="k-library-items" style={{ padding: 6 }} data-testid="stdparts">
          <div className="k-field"><label>Standard</label>
            <select className="k-input" data-testid="toolbox-type" value={choice} onChange={(e) => setChoice(e.target.value as StandardId)}>
              {FOLDERS.map((f) => <optgroup key={f.folder} label={f.folder}>{f.items.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}</optgroup>)}
            </select>
          </div>
          <div className="k-pm-valuerow">
            <select className="k-input" data-testid="toolbox-size" title="Size" value={sz} onChange={(e) => setSize(e.target.value)}>{sizes.map((x) => <option key={x}>{x}</option>)}</select>
            {l !== undefined && <select className="k-input" data-testid="toolbox-length" title="Length" value={l} onChange={(e) => setLen(Number(e.target.value))}>{lengths.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
          </div>
          <div className="k-selbox" style={{ marginTop: 4, fontSize: 11 }} data-testid="stdparts-dims">
            <div className="k-selbox-row"><b data-testid="stdparts-name">{name}</b></div>
            {Object.entries(dims).map(([k, v]) => <div key={k} className="k-selbox-row">{k} = {v} <span className="k-muted">{notes[k] ?? ''}</span></div>)}
            {hole && <div className="k-selbox-row k-muted">Clearance hole ISO 273: {hole.fine} / {hole.medium} / {hole.coarse}</div>}
          </div>
          <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
            <Button variant="primary" data-testid="toolbox-insert" disabled={st.doc.kind !== 'assembly'} tip="Insert into the assembly (click to place)" onClick={() => { st.startInsertComponent(); st.setInsertGhost({ part: part(), rotation: [0, 0, 0, 1] }); }}>Insert</Button>
            <Button tip="Open the part" onClick={() => withUnsavedCheck(() => useStore.getState().openDocument(part()))}>Open</Button>
          </div>
        </div>
      )}
    </div>
  );
}
