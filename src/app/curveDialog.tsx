import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Button, Dialog } from '../ui/components';
import { newId } from '../core/sketch/model';
import { downloadText } from './assemblyCommands';

type Row = [string, string, string];

/** the point rows of a curve file: "x y z" per line (spaces, tabs or commas), as the .sldcrv / .txt the design reads */
export function parseCurveFile(text: string): [number, number, number][] {
  return text.split(/\r?\n/).map((l) => l.trim().split(/[\s,;]+/).map(Number)).filter((v) => v.length >= 3 && v.slice(0, 3).every(Number.isFinite)).map((v) => [v[0], v[1], v[2]]);
}

/**
 * Curves ▸ Curve Through XYZ Points (the Curve File dialog: Point / X / Y / Z, Browse…, Save, Insert) and Curve Through
 * Reference Points (the reference points in the order picked). OK adds Curve1 to the tree.
 */
export function CurveDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, dialog: s.dialog, setDialog: s.setDialog, applyDocument: s.applyDocument, pushMessage: s.pushMessage })));
  const refMode = st.dialog === 'curveRefPoints';
  const [rows, setRows] = useState<Row[]>([['0', '0', '0'], ['', '', '']]);
  const [refs, setRefs] = useState<string[]>([]);
  const points = (st.doc.refGeometry ?? []).filter((r) => r.kind === 'point');
  const values = rows.map((r) => r.map((v) => Number(v.replace(',', '.'))) as [number, number, number]).filter((r, i) => rows[i].every((v) => v.trim() !== '') && r.every(Number.isFinite));
  const close = () => st.setDialog(null);
  const ok = () => {
    if (refMode ? refs.length < 2 : values.length < 2) { st.pushMessage('The curve needs at least two points.', 'warn'); return; }
    const name = `Curve${st.doc.features.filter((f) => f.type === 'curvePoints' || f.type === 'projectedCurve').length + 1}`;
    st.applyDocument(name, { ...st.doc, features: [...st.doc.features, { id: newId('f'), type: 'curvePoints', name, suppressed: false, ...(refMode ? { refPoints: refs } : { points: values }) }] });
    close();
  };
  const browse = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.sldcrv,.txt,.csv';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      const pts = parseCurveFile(await f.text());
      if (!pts.length) { st.pushMessage(`${f.name} holds no "x y z" rows.`, 'warn'); return; }
      setRows([...pts.map((p) => p.map(String) as Row), ['', '', '']]);
    };
    inp.click();
  };
  const setCell = (i: number, k: number, v: string) => {
    const next = rows.map((r, j) => (j === i ? (r.map((c, m) => (m === k ? v : c)) as Row) : r));
    // a filled last row gets an empty one below it, as the table of the intended design
    if (next[next.length - 1].some((c) => c.trim() !== '')) next.push(['', '', '']);
    setRows(next);
  };
  return (
    <Dialog title={refMode ? 'Curve Through Reference Points' : 'Curve File'} onClose={close} actions={<>
      {!refMode && <Button onClick={browse}>Browse…</Button>}
      {!refMode && <Button onClick={() => downloadText('curve.sldcrv', values.map((p) => p.join(' ')).join('\n'), 'text/plain')}>Save</Button>}
      {!refMode && <Button onClick={() => setRows([...rows.slice(0, -1), ['', '', ''], rows[rows.length - 1]])}>Insert</Button>}
      <Button variant="primary" data-testid="curve-ok" onClick={ok}>OK</Button>
      <Button onClick={close}>Cancel</Button>
    </>}>
      {refMode ? (
        <div className="k-selbox" data-testid="curve-refpoints" style={{ minHeight: 80 }}>
          {points.length ? points.map((p) => (
            <label key={p.id} className="k-check"><input type="checkbox" checked={refs.includes(p.id)} onChange={(e) => setRefs(e.target.checked ? [...refs, p.id] : refs.filter((x) => x !== p.id))} /> {p.name}{refs.includes(p.id) ? ` (${refs.indexOf(p.id) + 1})` : ''}</label>
          )) : <span className="k-muted">Insert Reference Geometry ▸ Points first.</span>}
        </div>
      ) : (
        <table className="k-table" data-testid="curve-table">
          <thead><tr><th>Point</th><th>X</th><th>Y</th><th>Z</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                {r.map((c, k) => <td key={k}><input className="k-input mono" data-testid={`curve-${i}-${k}`} value={c} onChange={(e) => setCell(i, k, e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ width: 80 }} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Dialog>
  );
}
