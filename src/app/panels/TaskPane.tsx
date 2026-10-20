import { useActiveSketch, useActiveSolve, useStore } from '../store';
import { Icon, RelationGlyph } from '../../ui/icons';
import { relationLabel } from '../../core/sketch/relations';
import { round, Kbd } from '../../ui/components';
import { SHORTCUTS } from '../shortcuts';

/**
 * Task Pane: vertical icon strip on the right (Design Library, Relations,
 * Custom Properties, Resources) with a fly-out panel.
 */
export function TaskPane() {
  const st = useStore();
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  const tabs = [
    { id: 'resources' as const, icon: <Icon.Resources />, tip: 'Phlippo CAD Resources' },
    { id: 'library' as const, icon: <Icon.Library />, tip: 'Design Library' },
    { id: 'relations' as const, icon: <Icon.Lock />, tip: 'Display/Delete Relations' },
    { id: 'properties' as const, icon: <Icon.Properties />, tip: 'Custom Properties' },
  ];
  return (
    <div className="k-taskpane">
      {st.taskPane && (
        <div className="k-taskpane-panel">
          <div className="k-panel-header">
            <span>{tabs.find((t) => t.id === st.taskPane)?.tip}</span>
            <span className="grow" />
            <button className="k-btn ghost icon" onClick={() => st.setTaskPane(null)}><Icon.Close size={12} /></button>
          </div>
          <div className="k-panel-body">
            {st.taskPane === 'library' && (
              <div style={{ padding: 10 }}>
                <p className="k-muted">Design Library (phase 4/7): standard parts, materials and appearances.</p>
                <ul className="k-list">
                  <li><Icon.Folder /> annotations</li>
                  <li><Icon.Folder /> features</li>
                  <li><Icon.Folder /> parts</li>
                  <li><Icon.Folder /> materials</li>
                </ul>
              </div>
            )}
            {st.taskPane === 'relations' &&
              (!sketch ? (
                <p className="k-muted" style={{ padding: 10 }}>No active sketch.</p>
              ) : (
                <ul className="k-list" style={{ padding: 4 }}>
                  {sketch.constraintOrder.map((id) => {
                    const k = sketch.constraints[id];
                    const G = RelationGlyph[k.kind];
                    const status = solve?.constraintStatus[id] ?? 'ok';
                    return (
                      <li key={id} className={st.selectedConstraint === id ? 'selected' : ''} onClick={() => st.selectConstraint(id)}>
                        {G ? <G size={14} /> : <Icon.Dimension size={14} />}
                        <span>{relationLabel(k.kind)}</span>
                        {k.value !== undefined && <span className="k-muted">{round(k.value)}</span>}
                        <span className="tail">
                          <span className={`status ${status}`}>{status === 'ok' ? 'Satisfied' : status}</span>
                          <button className="k-btn ghost icon" onClick={(e) => { e.stopPropagation(); st.removeRelation(id); }} title="Delete">
                            <Icon.Trash size={12} />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                  {sketch.constraintOrder.length === 0 && <li className="k-muted">No relations yet.</li>}
                </ul>
              ))}
            {st.taskPane === 'properties' && (
              <div style={{ padding: 10 }}>
                <div className="k-field"><label>Name</label><input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
                <div className="k-field"><label>Units</label><span>{st.unitSystem}</span></div>
                <div className="k-field"><label>Features</label><span>{st.doc.features.length}</span></div>
                <div className="k-field"><label>Material</label><span className="k-muted">not specified (phase 7)</span></div>
              </div>
            )}
            {st.taskPane === 'resources' && (
              <div style={{ padding: 10 }}>
                <p><b>Getting Started</b></p>
                <ol style={{ paddingLeft: 18, margin: '4px 0 10px' }}>
                  <li>Click <b>Sketch</b> and select a plane.</li>
                  <li>Draw with <Kbd>L</Kbd>, <Kbd>R</Kbd>, <Kbd>C</Kbd>, <Kbd>A</Kbd>.</li>
                  <li>Dimension with <b>Smart Dimension</b> (<Kbd>M</Kbd>).</li>
                  <li>Exit the sketch with the Confirmation Corner (top right).</li>
                </ol>
                <p><b>Keyboard shortcuts</b></p>
                <table className="k-shortcuts">
                  <tbody>
                    {SHORTCUTS.map((s, i) => (
                      <tr key={i}><td><Kbd>{s.keys}</Kbd></td><td>{s.label}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="k-taskpane-strip">
        {tabs.map((t) => (
          <button key={t.id} className={`k-taskpane-btn k-tip ${st.taskPane === t.id ? 'active' : ''}`} data-tip={t.tip} onClick={() => st.setTaskPane(t.id)}>
            {t.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
