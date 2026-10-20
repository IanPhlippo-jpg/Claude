import { useActiveSolve, useStore } from './store';
import { Icon } from '../ui/icons';

const STATUS_TEXT: Record<string, string> = {
  under: 'Onderbepaald',
  full: 'Volledig bepaald',
  over: 'Overbepaald',
  conflict: 'Overbepaald (conflict)',
  invalid: 'Ongeldige relatie',
};

export function StatusBar({ hint }: { hint: string }) {
  const st = useStore();
  const solve = useActiveSolve();
  const msg = st.messages[st.messages.length - 1];
  return (
    <div className="k-statusbar">
      {msg ? (
        <span className={`k-status-msg ${msg.level}`}>
          {msg.level !== 'info' && <Icon.Warning size={13} />} {msg.text}
        </span>
      ) : (
        <span className="k-muted">{hint || (st.activeSketchId ? 'Schets bewerken' : 'Gereed')}</span>
      )}
      <span className="grow" />
      {st.cursor && st.activeSketchId && (
        <span className="k-status-cell mono">
          {st.cursor.x.toFixed(2)}, {st.cursor.y.toFixed(2)} {st.doc.units}
        </span>
      )}
      {solve && st.activeSketchId && (
        <span className={`k-status-cell status ${solve.status}`} title={`DOF: ${solve.dof} · ${solve.iterations} iteraties · ${solve.timeMs.toFixed(1)} ms`}>
          {STATUS_TEXT[solve.status]} {solve.status === 'under' ? `(${solve.dof} DOF)` : ''}
        </span>
      )}
      {solve && st.activeSketchId && <span className="k-status-cell k-muted mono">{solve.timeMs.toFixed(1)} ms</span>}
      <span className="k-status-cell">{st.doc.units}</span>
    </div>
  );
}
