import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { Button } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { withUnsavedCheck } from '../MenuBar';
import { getPref } from '../prefs';
import { FASTENER_NAMES, fastenerPart, LENGTHS, METRIC } from '../../core/assembly/fasteners';
import { ISO273, LIBRARY_SIZES, screwLengths, type LibrarySize } from '../../core/library/iso';
import { STANDARDS, standardPart, standardPartDimensions, standardPartName, type StandardId } from '../../core/library/parts';

/** a standard of the folder: the library parts (ISO 4762, 4032, 7089) and the other screws of Auto Fasteners */
type Choice = StandardId | 'csk' | 'hex';
const FOLDERS: { folder: string; items: { id: Choice; label: string }[] }[] = [
  { folder: 'Bolts and Screws', items: [...STANDARDS.filter((s) => s.folder === 'Bolts and Screws').map((s) => ({ id: s.id as Choice, label: s.label })), { id: 'csk', label: FASTENER_NAMES.csk }, { id: 'hex', label: FASTENER_NAMES.hex }] },
  { folder: 'Nuts', items: STANDARDS.filter((s) => s.folder === 'Nuts').map((s) => ({ id: s.id as Choice, label: s.label })) },
  { folder: 'Washers', items: STANDARDS.filter((s) => s.folder === 'Washers').map((s) => ({ id: s.id as Choice, label: s.label })) },
];
const isLibrary = (c: Choice): c is StandardId => c === 'iso4762' || c === 'iso4032' || c === 'iso7089';
const sizesOf = (c: Choice): string[] => (isLibrary(c) ? [...LIBRARY_SIZES] : METRIC.map((m) => m.size));
const lengthsOf = (c: Choice, size: string): number[] => (c === 'iso4762' ? screwLengths(size as LibrarySize) : c === 'csk' || c === 'hex' ? LENGTHS : []);
const NOTES: Record<string, string> = { d: 'thread', P: 'pitch', l: 'length', dk: 'head Ø', k: 'head height', s: 'across flats', t: 'socket depth', b: 'thread length', m: 'height', e: 'across corners', dw: 'bearing Ø', d1: 'hole Ø', d2: 'outside Ø', h: 'thickness' };

/**
 * Part Library ▸ Standard Parts: the ISO fasteners made to the dimensions of their standard (screws, nuts and washers
 * of M3 to M12), chosen by standard, size and length, then inserted into the open assembly (placed with a click, the
 * normal Insert Components route) or opened as a part.
 */
export function StandardPartsFolder() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, prefs: s.prefs, setPrefs: s.setPrefs, startInsertComponent: s.startInsertComponent, setInsertGhost: s.setInsertGhost })));
  const [open, setOpen] = useState(true);
  const [choice, setChoice] = useState<Choice>('iso4762');
  const [size, setSize] = useState('M6');
  const [len, setLen] = useState(20);
  // the add-in state: the options (Load now) or the Add-Ins tab of the ribbon
  const loaded = st.prefs['addin.standardParts'] === true || getPref('addin.standardParts') === true;
  const sizes = sizesOf(choice);
  const sz = sizes.includes(size) ? size : sizes[0];
  const lengths = lengthsOf(choice, sz);
  const l = lengths.length ? (lengths.includes(len) ? len : lengths.reduce((b, x) => (Math.abs(x - len) < Math.abs(b - len) ? x : b))) : undefined;
  const spec = isLibrary(choice) ? { standard: choice, size: sz as LibrarySize, length: l } : null;
  const part = () => (spec ? standardPart(spec) : fastenerPart(choice as 'csk' | 'hex', sz, l ?? 20));
  const name = spec ? standardPartName(spec) : `${choice === 'csk' ? 'ISO 10642' : 'ISO 4017'} ${sz} x ${l}`;
  const dims = spec ? standardPartDimensions(spec) : null;
  const hole = ISO273[sz];
  return (
    <div className={`k-library-folder ${open ? 'open' : ''}`} data-testid="toolbox-folder">
      <div className="k-library-folder-row" onClick={() => setOpen(!open)}>
        {open ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />}
        <Icon.Folder />
        <span className="grow">Standard Parts <span className="k-muted">(ISO)</span></span>
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
            <select className="k-input" data-testid="toolbox-type" value={choice} onChange={(e) => setChoice(e.target.value as Choice)}>
              {FOLDERS.map((f) => <optgroup key={f.folder} label={f.folder}>{f.items.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}</optgroup>)}
            </select>
          </div>
          <div className="k-pm-valuerow">
            <select className="k-input" data-testid="toolbox-size" title="Size" value={sz} onChange={(e) => setSize(e.target.value)}>{sizes.map((x) => <option key={x}>{x}</option>)}</select>
            {l !== undefined && <select className="k-input" data-testid="toolbox-length" title="Length" value={l} onChange={(e) => setLen(Number(e.target.value))}>{lengths.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
          </div>
          <div className="k-selbox" style={{ marginTop: 4, fontSize: 11 }} data-testid="stdparts-dims">
            <div className="k-selbox-row"><b data-testid="stdparts-name">{name}</b></div>
            {dims && Object.entries(dims).map(([k, v]) => <div key={k} className="k-selbox-row">{k} = {v} <span className="k-muted">{NOTES[k] ?? ''}</span></div>)}
            {hole && choice !== 'iso4032' && <div className="k-selbox-row k-muted">Clearance hole ISO 273: {hole.fine} / {hole.medium} / {hole.coarse}</div>}
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
