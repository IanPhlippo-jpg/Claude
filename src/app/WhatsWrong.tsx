import { useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';

/**
 * What's Wrong: the features that could not be rebuilt, with the reason, and the rebuild warnings (Show warnings). Opens
 * by itself after a document with rebuild errors is opened (F78), and from the red or yellow marker in the tree.
 */
export function WhatsWrong() {
  const st = useStore(useShallow((s) => ({ rebuild: s.rebuild, whatsWrong: s.whatsWrong, doc: s.doc, setSelectedFeature: s.setSelectedFeature })));
  const [showWarnings, setShowWarnings] = useState(true);
  const errors = Object.entries(st.rebuild.errors);
  const warnings = Object.entries(st.rebuild.warnings ?? {}).filter(([id]) => !st.rebuild.errors[id]);
  if (!st.whatsWrong || (!errors.length && !warnings.length)) return null;
  const rows = [...errors.map(([id, msg]) => ({ id, msg, type: 'Error' })), ...(showWarnings ? warnings.map(([id, msg]) => ({ id, msg, type: 'Warning' })) : [])];
  const close = () => useStore.setState({ whatsWrong: false });
  const name = (id: string) => st.doc.features.find((f) => f.id === id)?.name ?? id;
  return (
    <div className="k-float-dialog k-whatswrong" data-testid="whats-wrong" role="dialog" aria-label="What's Wrong">
      <div className="k-panel">
        <div className="k-panel-header">
          <span className={`status ${errors.length ? 'conflict' : 'warning'} k-ww-mark`}>!</span> <span>What's Wrong</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={close} aria-label="Close"><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8 }}>
          <p className="k-muted" style={{ marginTop: 0 }}>{errors.length ? `${errors.length === 1 ? 'One feature' : `${errors.length} features`} of ${st.doc.name} could not be rebuilt. The model is incomplete until they are repaired, suppressed or deleted.` : `${st.doc.name} rebuilt with ${warnings.length === 1 ? 'one warning' : `${warnings.length} warnings`}.`}</p>
          <label className="k-check" style={{ display: 'block', marginBottom: 6 }}><input type="checkbox" checked={showWarnings} onChange={(e) => setShowWarnings(e.target.checked)} data-testid="whats-wrong-warnings" /> Show warnings</label>
          <table className="k-table" data-testid="whats-wrong-list">
            <thead><tr><th>Type</th><th>Feature</th><th>Description</th></tr></thead>
            <tbody>
              {rows.map(({ id, msg, type }) => (
                <tr key={type + id} style={{ cursor: 'default' }} onClick={() => st.setSelectedFeature(id)}>
                  <td style={{ whiteSpace: 'nowrap' }}><span className={`status ${type === 'Error' ? 'conflict' : 'warning'} k-ww-mark`}>!</span> {type}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{name(id)}</td>
                  <td>{msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="k-dialog-actions" style={{ marginTop: 8 }}><button className="k-btn primary" onClick={close}>Close</button></div>
        </div>
      </div>
    </div>
  );
}
