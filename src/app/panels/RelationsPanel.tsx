import { useActiveSketch, useActiveSolve, useStore } from '../store';
import { DockPanel } from './Dock';
import { Icon, RelationGlyph } from '../../ui/icons';
import { relationLabel } from '../../core/sketch/relations';
import { round } from '../../ui/components';

/** Display/Delete relations — list of every relation in the sketch. */
export function RelationsPanel() {
  const st = useStore();
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  return (
    <DockPanel id="relations" title="Relaties weergeven/verwijderen">
      {!sketch ? (
        <p className="k-muted" style={{ padding: 10 }}>Geen actieve schets.</p>
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
                  <span className={`status ${status}`}>{status}</span>
                  <button className="k-btn ghost icon" onClick={(e) => { e.stopPropagation(); st.removeRelation(id); }} title="Verwijderen">
                    <Icon.Trash size={12} />
                  </button>
                </span>
              </li>
            );
          })}
          {sketch.constraintOrder.length === 0 && <li className="k-muted">Nog geen relaties.</li>}
        </ul>
      )}
    </DockPanel>
  );
}
