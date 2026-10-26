import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from '../ui/icons';

/**
 * What's Wrong: the features that could not be rebuilt, with the reason. Opens by itself after a document with
 * rebuild errors is opened (F78), and from the red marker in the tree or the status bar.
 */
export function WhatsWrong() {
  const st = useStore(useShallow((s) => ({ rebuild: s.rebuild, whatsWrong: s.whatsWrong, doc: s.doc, setSelectedFeature: s.setSelectedFeature })));
  const errors = Object.entries(st.rebuild.errors);
  if (!st.whatsWrong || !errors.length) return null;
  const close = () => useStore.setState({ whatsWrong: false });
  const name = (id: string) => st.doc.features.find((f) => f.id === id)?.name ?? id;
  return (
    <div className="k-float-dialog k-whatswrong" data-testid="whats-wrong" role="dialog" aria-label="What's Wrong">
      <div className="k-panel">
        <div className="k-panel-header">
          <span className="status conflict k-ww-mark">!</span> <span>What's Wrong</span>
          <span className="grow" />
          <button className="k-btn ghost icon" onClick={close} aria-label="Close"><Icon.Close size={12} /></button>
        </div>
        <div className="k-panel-body" style={{ padding: 8 }}>
          <p className="k-muted" style={{ marginTop: 0 }}>{errors.length === 1 ? 'One feature' : `${errors.length} features`} of {st.doc.name} could not be rebuilt. The model is incomplete until they are repaired, suppressed or deleted.</p>
          <table className="k-table" data-testid="whats-wrong-list">
            <thead><tr><th>Feature</th><th>Description</th></tr></thead>
            <tbody>
              {errors.map(([id, msg]) => (
                <tr key={id} style={{ cursor: 'default' }} onClick={() => st.setSelectedFeature(id)}>
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
