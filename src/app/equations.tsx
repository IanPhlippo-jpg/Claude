import { useMemo, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Button, Dialog } from '../ui/components';
import { Icon } from '../ui/icons';
import { dimensionTable, equationsFromText, equationsToText, evaluateEquations, type Equation } from '../core/document/equations';
import { downloadText } from './assemblyCommands';
import { newId } from '../core/sketch/model';

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, ''));

/**
 * Equations, Global Variables, and Dimensions (Tools ▸ Equations…), laid out by design:
 * the Equation View with the sections Global Variables, Features (dimensions) and Equations,
 * each a table Name · Value / Equation · Evaluates to · Comments, a placeholder row to add
 * entries, the Automatically rebuild and angular units options, OK / Cancel / Help.
 */
export function EquationsDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, pushMessage: s.pushMessage, applyDocument: s.applyDocument, setEquations: s.setEquations, setDialog: s.setDialog })));
  const [rows, setRows] = useState<Equation[]>(() => st.doc.equations.map((e) => ({ ...e })));
  const [view, setView] = useState<'equation' | 'dimension' | 'ordered'>('equation');
  const [autoRebuild, setAutoRebuild] = useState(true);
  const [autoSolve, setAutoSolve] = useState(true);
  const [angleUnits, setAngleUnits] = useState<'deg' | 'rad'>(st.doc.equationAngleUnits ?? 'deg');
  const [linkFile, setLinkFile] = useState<string | undefined>(st.doc.equationsFile);
  const preview = useMemo(() => evaluateEquations({ ...st.doc, equations: rows, equationAngleUnits: angleUnits }), [st.doc, rows, angleUnits]);
  // Import… / Link to external file: equations read from a text file ("Name" = expression per line)
  const readFile = (link: boolean) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      f.text().then((t) => {
        const list = equationsFromText(t, () => newId('eq'));
        setRows((rs) => [...rs.filter((r) => !list.some((x) => x.target === r.target)), ...list]);
        if (link) setLinkFile(f.name);
        st.pushMessage(`${list.length} equation${list.length === 1 ? '' : 's'} read from ${f.name}.`);
      });
    };
    input.click();
  };
  const dims = useMemo(() => dimensionTable(st.doc), [st.doc]);
  const dimNames = useMemo(() => new Set(dims.map((d) => d.name)), [dims]);
  const globals = rows.filter((r) => !dimNames.has(r.target));
  const dimEqs = rows.filter((r) => dimNames.has(r.target));
  const update = (id: string, patch: Partial<Equation>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const add = (target: string, expression = '') => {
    const t = target.replace(/^"|"$/g, '').trim();
    if (!t) return;
    if (rows.some((r) => r.target === t)) {
      st.pushMessage(`"${t}" already has an equation.`, 'warn');
      return;
    }
    setRows((rs) => [...rs, { id: newId('eq'), target: t, expression }]);
  };
  const ok = () => {
    if (angleUnits !== (st.doc.equationAngleUnits ?? 'deg') || linkFile !== st.doc.equationsFile) st.applyDocument('Equations', { ...st.doc, equationAngleUnits: angleUnits === 'deg' ? undefined : angleUnits, equationsFile: linkFile });
    st.setEquations(rows);
    st.setDialog(null);
  };
  const evalText = (r: Equation) => (r.id in preview.errors ? preview.errors[r.id] : r.id in preview.values ? fmt(preview.values[r.id]) : '');
  const hasErrors = Object.keys(preview.errors).length > 0;

  const table = (title: string, list: Equation[], placeholder: string, isDim: boolean) => (
    <table className="k-eq-table">
      <thead>
        <tr>
          <th style={{ width: '32%' }}>Name</th>
          <th style={{ width: '34%' }}>Value / Equation</th>
          <th style={{ width: '16%' }}>Evaluates to</th>
          <th>Comments</th>
          <th style={{ width: 24 }} />
        </tr>
      </thead>
      <tbody>
        <tr className="k-eq-section"><td colSpan={5}>{title}</td></tr>
        {list.map((r) => (
          <tr key={r.id} className={r.id in preview.errors ? 'error' : ''}>
            <td>
              {isDim ? <span className="mono">"{r.target}"</span> : <input className="k-input mono" value={`"${r.target}"`} onChange={(e) => update(r.id, { target: e.target.value.replace(/"/g, '') })} onKeyDown={(e) => e.stopPropagation()} />}
            </td>
            <td><input className="k-input mono" value={r.expression.startsWith('=') ? r.expression : `= ${r.expression}`} onChange={(e) => update(r.id, { expression: e.target.value.replace(/^\s*=\s*/, '') })} onKeyDown={(e) => e.stopPropagation()} /></td>
            <td className="mono">{evalText(r)}{isDim && !(r.id in preview.errors) ? (dims.find((d) => d.name === r.target)?.ref.kind === 'sketch' && dims.find((d) => d.name === r.target)?.ref.kind === 'sketch' && (dims.find((d) => d.name === r.target)!.ref as { angle?: boolean }).angle ? '°' : st.doc.units) : ''}</td>
            <td><input className="k-input" value={r.comment ?? ''} onChange={(e) => update(r.id, { comment: e.target.value })} onKeyDown={(e) => e.stopPropagation()} /></td>
            <td><button className="k-btn ghost icon k-tip" data-tip="Delete" onClick={() => remove(r.id)}><Icon.Trash size={12} /></button></td>
          </tr>
        ))}
        <tr className="k-eq-add">
          <td colSpan={5}>
            {isDim ? (
              <select className="k-input" value="" onChange={(e) => e.target.value && add(e.target.value, fmt(dims.find((d) => d.name === e.target.value)?.value ?? 0))}>
                <option value="">{placeholder}</option>
                {dims.filter((d) => !rows.some((r) => r.target === d.name)).map((d) => <option key={d.name} value={d.name}>"{d.name}" = {fmt(d.value)}</option>)}
              </select>
            ) : (
              <input
                className="k-input"
                placeholder={placeholder}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    const t = (e.target as HTMLInputElement).value;
                    const m = /^\s*"?([^"=]+?)"?\s*(?:=\s*(.*))?$/.exec(t);
                    if (m) add(m[1], (m[2] ?? '0').trim() || '0');
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <Dialog
      title="Equations, Global Variables, and Dimensions"
      onClose={() => st.setDialog(null)}
      actions={
        <>
          <span className="k-muted" style={{ marginRight: 'auto', fontSize: 11 }}>{hasErrors ? 'Some equations have errors; fix them or they are ignored on rebuild.' : `${rows.length} equation${rows.length === 1 ? '' : 's'}`}</span>
          <Button variant="primary" onClick={ok}>OK</Button>
          <Button onClick={() => st.setDialog(null)}>Cancel</Button>
          <Button onClick={() => st.pushMessage('Write names between double quotes: "Width" = 80, "D1@Sketch1" = "Width" / 2. Functions: sin cos tan sqrt abs int (degrees).')}>Help</Button>
        </>
      }
    >
      <div className="k-eq-dialog">
        <div className="k-eq-views">
          <button className={`k-btn ${view === 'equation' ? 'active' : ''}`} onClick={() => setView('equation')}><Icon.Config size={13} /> Equation View</button>
          <button className={`k-btn ${view === 'dimension' ? 'active' : ''}`} onClick={() => setView('dimension')}><Icon.Dimension size={13} /> Dimension View</button>
          <button className={`k-btn ${view === 'ordered' ? 'active' : ''}`} onClick={() => setView('ordered')}><Icon.History size={13} /> Ordered View</button>
          <span className="grow" />
          <input className="k-input" placeholder="Filter All Fields" style={{ width: 160 }} onKeyDown={(e) => e.stopPropagation()} />
        </div>
        {view === 'equation' && (
          <>
            {table('Global Variables', globals, 'Add global variable', false)}
            {table('Equations', dimEqs, 'Add equation', true)}
          </>
        )}
        {view === 'dimension' && (
          <table className="k-eq-table">
            <thead><tr><th>Name</th><th>Value / Equation</th><th>Evaluates to</th><th>Comments</th></tr></thead>
            <tbody>
              {dims.map((d) => {
                const eq = rows.find((r) => r.target === d.name);
                return (
                  <tr key={d.name}>
                    <td className="mono">"{d.name}"</td>
                    <td className="mono">{eq ? `= ${eq.expression}` : fmt(d.value)}</td>
                    <td className="mono">{eq ? evalText(eq) : fmt(d.value)}{d.ref.kind === 'sketch' && d.ref.angle ? '°' : st.doc.units}</td>
                    <td>{eq?.comment ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {view === 'ordered' && (
          <table className="k-eq-table">
            <thead><tr><th>Name</th><th>Value / Equation</th><th>Evaluates to</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id in preview.errors ? 'error' : ''}>
                  <td className="mono">"{r.target}"</td>
                  <td className="mono">= {r.expression}</td>
                  <td className="mono">{evalText(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="k-eq-options">
          <label className="k-check"><input type="checkbox" checked={autoRebuild} onChange={(e) => setAutoRebuild(e.target.checked)} /> Automatically rebuild</label>
          <label className="k-check" title="Equations are evaluated in dependency order; off keeps the list order"><input type="checkbox" data-testid="eq-autosolve" checked={autoSolve} onChange={(e) => setAutoSolve(e.target.checked)} /> Automatic solve order</label>
          <label className="k-check" title={linkFile ? `Linked to ${linkFile}` : undefined}><input type="checkbox" data-testid="eq-link" checked={!!linkFile} onChange={(e) => (e.target.checked ? readFile(true) : setLinkFile(undefined))} /> Link to external file{linkFile ? <span className="k-muted"> ({linkFile})</span> : null}</label>
          <button className="k-btn" data-testid="eq-import" onClick={() => readFile(false)}>Import…</button>
          <button className="k-btn" data-testid="eq-export" onClick={() => downloadText(`${st.doc.name}-equations.txt`, equationsToText(rows))}>Export…</button>
          <span className="grow" />
          <label>Angular equation units: <select className="k-input" data-testid="eq-angle" value={angleUnits} onChange={(e) => setAngleUnits(e.target.value as 'deg')}><option value="deg">Degrees</option><option value="rad">Radians</option></select></label>
        </div>
      </div>
    </Dialog>
  );
}
