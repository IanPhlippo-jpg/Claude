import { magneticOrder } from '../../core/drawing/balloons';
export { holeTableRows, freeSpot } from '../../core/drawing/tables';
export { bomTableGrid as tableGrid } from '../prefsTables';
import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Button, NumberField } from '../../ui/components';
import { modelBodies } from '../../core/drawing/sheet';
import { createDocument, type Document, type DrawingSheet } from '../../core/document/types';
import { newId } from '../../core/sketch/model';

function Frame({ title, testid, children, actions, width = 440 }: { title: string; testid: string; children: React.ReactNode; actions: React.ReactNode; width?: number }) {
  const st = useStore(useShallow((s) => ({ setDialog: s.setDialog })));
  return (
    <div className="k-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && st.setDialog(null)} onKeyDown={(e) => { if (e.key === 'Escape') st.setDialog(null); e.stopPropagation(); }}>
      <div className="k-dialog" style={{ width }} role="dialog" aria-label={title} data-testid={testid}>
        <div className="k-dialog-title">{title}</div>
        <div className="k-dialog-body">{children}</div>
        <div className="k-dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

const sheetOf = (d: Document) => d.sheets?.[0];

/** The models shown on the sheet (for Relative View / Predefined View ▸ Insert Model). */
export function sheetModels(doc: Document): Document[] {
  const out: Document[] = [];
  for (const v of sheetOf(doc)?.views ?? []) if ((v.model.features.length || (v.model.components ?? []).length) && !out.includes(v.model)) out.push(v.model);
  return out;
}

/** Relative View: pick the face that looks at you and the face to the right; then click to place the view. */
export function RelativeViewDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, setDialog: s.setDialog, startModelView: s.startModelView, setModelViewSource: s.setModelViewSource, pushMessage: s.pushMessage })));
  const models = sheetModels(st.doc);
  const [mi, setMi] = useState(0);
  const model = models[mi];
  const faces = useMemo(() => {
    if (!model) return [];
    const out: { label: string; n: [number, number, number] }[] = [];
    for (const b of modelBodies(model)) for (const [i, f] of b.faces.entries()) if (!f.curved && f.area > 1) out.push({ label: `Face<${i + 1}> (${f.normal.map((x) => x.toFixed(2)).join(', ')})`, n: f.normal });
    return out;
  }, [model]);
  const [fi, setFi] = useState(0);
  const [ri, setRi] = useState(1);
  const front = faces[fi], right = faces[ri];
  const ok = !!front && !!right && Math.abs(front.n[0] * right.n[0] + front.n[1] * right.n[1] + front.n[2] * right.n[2]) < 1e-3;
  const place = () => {
    if (!ok || !model) return;
    const w = front.n, u = right.n;
    const v: [number, number, number] = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
    st.setDialog(null);
    st.startModelView();
    st.setModelViewSource(model);
    useStore.setState({ drawingEdit: { ...useStore.getState().drawingEdit!, relative: { u, v, w, label: `${front.label.split(' ')[0]} / ${right.label.split(' ')[0]}` } } });
    st.pushMessage('Relative View: click in the sheet to place the view.');
  };
  return (
    <Frame title="Relative View" testid="relative-view" actions={<><Button variant="primary" data-testid="relview-ok" disabled={!ok} onClick={place}>OK</Button><Button onClick={() => st.setDialog(null)}>Cancel</Button></>}>
      {!models.length ? <p className="k-muted">Insert a model view first: the relative view uses its model.</p> : (
        <>
          <div className="k-field"><label>Model</label><select className="k-input" value={mi} onChange={(e) => setMi(Number(e.target.value))}>{models.map((m, i) => <option key={i} value={i}>{m.name}</option>)}</select></div>
          <div className="k-pm-sub">Orientation</div>
          <div className="k-field"><label>First orientation: Front</label><select className="k-input" data-testid="relview-front" value={fi} onChange={(e) => setFi(Number(e.target.value))}>{faces.map((f, i) => <option key={i} value={i}>{f.label}</option>)}</select></div>
          <div className="k-field"><label>Second orientation: Right</label><select className="k-input" data-testid="relview-right" value={ri} onChange={(e) => setRi(Number(e.target.value))}>{faces.map((f, i) => <option key={i} value={i}>{f.label}</option>)}</select></div>
          {!ok && <p className="k-pm-message">The two faces must be perpendicular.</p>}
        </>
      )}
    </Frame>
  );
}

/** Empty View / Predefined View: a view frame placed with a click; a Predefined View gets its model later. */
export function startEmptyView(predefined: boolean): void {
  const st = useStore.getState();
  st.startModelView();
  st.setModelViewSource(createDocument(predefined ? 'Predefined View' : 'Empty View'));
  useStore.setState({ drawingEdit: { ...useStore.getState().drawingEdit!, emptyView: !predefined, predefined, orientation: predefined ? 'isometric' : 'front' } });
  st.pushMessage(predefined ? 'Predefined View: click to place it; insert the model in its Property Panel.' : 'Empty View: click to place it.');
}

/** Predefined View ▸ Insert Model: give the view one of the sheet's models. */
export function insertModelInView(viewId: string, model: Document): void {
  const st = useStore.getState();
  const sheet = sheetOf(st.doc);
  if (!sheet) return;
  st.applyDocument('Insert Model', { ...st.doc, sheets: [{ ...sheet, views: sheet.views.map((v) => (v.id === viewId ? { ...v, model, modelName: `${model.name}<1>`, predefined: false } : v)) }] });
}

/** Spell Checker: every note in an editable box with the spell checker of the system on. */
export function SpellCheckDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, applyDocument: s.applyDocument, setDialog: s.setDialog })));
  const sheet = sheetOf(st.doc);
  const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries((sheet?.notes ?? []).map((n) => [n.id, n.text])));
  const apply = () => {
    if (!sheet) return;
    st.applyDocument('Spell Checker', { ...st.doc, sheets: [{ ...sheet, notes: sheet.notes.map((n) => ({ ...n, text: texts[n.id] ?? n.text })) }] });
    st.setDialog(null);
  };
  return (
    <Frame title="Spell Checker" testid="spell-check" width={520} actions={<><Button variant="primary" onClick={apply}>Apply</Button><Button onClick={() => st.setDialog(null)}>Close</Button></>}>
      {!(sheet?.notes ?? []).length ? <p className="k-muted">The sheet has no notes to check.</p> : (sheet?.notes ?? []).map((n) => (
        <textarea key={n.id} className="k-input k-spell" spellCheck lang="en" rows={2} value={texts[n.id] ?? ''} onChange={(e) => setTexts({ ...texts, [n.id]: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
      ))}
      <p className="k-muted">Misspelled words are underlined; right-click a word for suggestions.</p>
    </Frame>
  );
}

/** Linear Note Pattern: copies of a note in rows and columns. */
export function LinearNotePatternDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, applyDocument: s.applyDocument, setDialog: s.setDialog })));
  const sheet = sheetOf(st.doc);
  const notes = sheet?.notes ?? [];
  const [noteId, setNoteId] = useState(notes[notes.length - 1]?.id ?? '');
  const [p, setP] = useState({ n1: 3, d1: 20, n2: 1, d2: 10 });
  const apply = () => {
    const src = notes.find((n) => n.id === noteId);
    if (!sheet || !src) return;
    const copies = [];
    for (let i = 0; i < p.n1; i++) for (let j = 0; j < p.n2; j++) {
      if (!i && !j) continue;
      copies.push({ ...src, id: newId('nt'), position: [src.position[0] + i * p.d1, src.position[1] - j * p.d2] as [number, number] });
    }
    st.applyDocument('Linear Note Pattern', { ...st.doc, sheets: [{ ...sheet, notes: [...sheet.notes, ...copies] }] });
    st.setDialog(null);
  };
  return (
    <Frame title="Linear Note Pattern" testid="note-pattern" actions={<><Button variant="primary" data-testid="np-ok" disabled={!noteId} onClick={apply}>OK</Button><Button onClick={() => st.setDialog(null)}>Cancel</Button></>}>
      {!notes.length ? <p className="k-muted">Place a note first.</p> : <div className="k-field"><label>Note to pattern</label><select className="k-input" value={noteId} onChange={(e) => setNoteId(e.target.value)}>{notes.map((n) => <option key={n.id} value={n.id}>{n.text.slice(0, 30)}</option>)}</select></div>}
      <div className="k-pm-sub">Direction 1 (X)</div>
      <div className="k-pm-xyrow"><span className="k-pm-xy">n</span><NumberField value={p.n1} onChange={(v) => setP({ ...p, n1: Math.max(1, Math.round(v)) })} step={1} /><span className="k-pm-xy">d</span><NumberField value={p.d1} onChange={(v) => setP({ ...p, d1: v })} unit="mm" step={1} /></div>
      <div className="k-pm-sub">Direction 2 (Y)</div>
      <div className="k-pm-xyrow"><span className="k-pm-xy">n</span><NumberField value={p.n2} onChange={(v) => setP({ ...p, n2: Math.max(1, Math.round(v)) })} step={1} /><span className="k-pm-xy">d</span><NumberField value={p.d2} onChange={(v) => setP({ ...p, d2: v })} unit="mm" step={1} /></div>
    </Frame>
  );
}

/** General Table: rows and columns, then the cells are edited in this window. */
export function GeneralTableDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, insertGeneralTable: s.insertGeneralTable, setDialog: s.setDialog, setTableCell: s.setTableCell })));
  const sheet = sheetOf(st.doc);
  const tables = (sheet?.tables ?? []).filter((t) => t.kind === 'general');
  const [size, setSize] = useState({ rows: 3, cols: 3 });
  const last = tables[tables.length - 1];
  return (
    <Frame title="General Table" testid="general-table" width={520} actions={<><Button variant="primary" data-testid="gt-insert" onClick={() => st.insertGeneralTable(size.rows, size.cols)}>Insert table</Button><Button onClick={() => st.setDialog(null)}>Close</Button></>}>
      <div className="k-pm-xyrow"><span className="k-pm-xy">rows</span><NumberField value={size.rows} onChange={(v) => setSize({ ...size, rows: Math.max(1, Math.round(v)) })} step={1} /><span className="k-pm-xy">cols</span><NumberField value={size.cols} onChange={(v) => setSize({ ...size, cols: Math.max(1, Math.round(v)) })} step={1} /></div>
      {last?.cells && (
        <table className="k-pm-table" data-testid="gt-cells">
          <tbody>{last.cells.map((row, r) => <tr key={r}>{row.map((c, ci) => <td key={ci}><input className="k-input" value={c} onChange={(e) => st.setTableCell(last.id, r, ci, e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></td>)}</tr>)}</tbody>
        </table>
      )}
    </Frame>
  );
}

/** Drawing blocks of the library, inserted as a group of notes at the click. */
export const DRAWING_BLOCKS: Record<string, string[]> = {
  'General tolerances': ['UNLESS OTHERWISE SPECIFIED:', 'DIMENSIONS ARE IN MILLIMETERS', 'TOLERANCES: LINEAR ±0.1  ANGULAR ±0.5°'],
  'Break sharp edges': ['BREAK ALL SHARP EDGES 0.5 x 45°'],
  'Surface finish': ['Ra 3.2 ALL OVER'],
  'Checked stamp': ['CHECKED ____________   DATE ________'],
};

export function insertBlock(name: string, at: [number, number]): void {
  const st = useStore.getState();
  const sheet = sheetOf(st.doc);
  const lines = DRAWING_BLOCKS[name];
  if (!sheet || !lines) return;
  const notes = lines.map((text, i) => ({ id: newId('nt'), text, position: [at[0], at[1] - i * 5] as [number, number] }));
  st.applyDocument(`Insert Block ${name}`, { ...st.doc, sheets: [{ ...sheet, notes: [...sheet.notes, ...notes] }] });
}

/** Format Painter / Magnetic Line / Blocks: what a click on the sheet does. Returns true when the click was used. */
export function drawingToolClick(p: [number, number]): boolean {
  const st = useStore.getState();
  const t = st.drawingTool;
  const sheet = sheetOf(st.doc);
  if (!t || !sheet) return false;
  if (t.kind === 'placeTable') {
    st.setDrawingTool(null);
    return true;
  }
  if (t.kind === 'block') {
    insertBlock(t.block, p);
    st.setDrawingTool(null);
    return true;
  }
  if (t.kind === 'formatPainter') {
    const near = sheet.notes.map((n) => ({ n, d: Math.hypot(n.position[0] - p[0], n.position[1] - p[1]) })).sort((a, b) => a.d - b.d)[0];
    if (!near || near.d > 12) {
      st.pushMessage('Format Painter: click a note.', 'warn');
      return true;
    }
    if (!t.source) {
      st.setDrawingTool({ kind: 'formatPainter', source: near.n.id });
      st.pushMessage('Format Painter: now click the notes to format (Esc to finish).');
      return true;
    }
    const src = sheet.notes.find((n) => n.id === t.source);
    if (!src) return true;
    st.applyDocument('Format Painter', { ...st.doc, sheets: [{ ...sheet, notes: sheet.notes.map((n) => (n.id === near.n.id ? { ...n, fontSize: src.fontSize, bold: src.bold, italic: src.italic } : n)) }] });
    return true;
  }
  if (t.kind === 'magneticLine') {
    if (!t.a) {
      st.setDrawingTool({ kind: 'magneticLine', a: p });
      return true;
    }
    // the balloons (all of the sheet) are spread evenly along the line
    // in the order of their leaders' ends along the line, so the leaders do not cross
    const all = (sheet.symbols ?? []).filter((s) => s.kind === 'balloon');
    const balloons = magneticOrder(t.a, p, all.map((b) => b.anchor), all.map((b) => b.position)).map((i) => all[i]);
    const n = balloons.length;
    const ml = { id: newId('ml'), a: t.a, b: p, balloons: balloons.map((b) => b.id) };
    const symbols = (sheet.symbols ?? []).map((s) => {
      const i = balloons.indexOf(s);
      if (i < 0) return s;
      const k = n === 1 ? 0.5 : i / (n - 1);
      return { ...s, position: [t.a![0] + (p[0] - t.a![0]) * k, t.a![1] + (p[1] - t.a![1]) * k] as [number, number] };
    });
    st.applyDocument('Magnetic Line', { ...st.doc, sheets: [{ ...sheet, symbols, magneticLines: [...(sheet.magneticLines ?? []), ml] } as DrawingSheet] });
    st.setDrawingTool(null);
    return true;
  }
  return false;
}

