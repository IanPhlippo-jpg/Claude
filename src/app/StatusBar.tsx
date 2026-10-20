import { useState } from 'react';
import { useActiveSolve, useStore, type UnitSystem } from './store';
import { Icon } from '../ui/icons';
import { Menu } from '../ui/components';

const STATUS_TEXT: Record<string, string> = {
  under: 'Under Defined',
  full: 'Fully Defined',
  over: 'Over Defined',
  conflict: 'Over Defined (conflict)',
  invalid: 'Ongeldige relatie',
};

const UNIT_LABEL: Record<UnitSystem, string> = { MKS: 'MKS (meter, kilogram, second)', CGS: 'CGS (centimeter, gram, second)', MMGS: 'MMGS (millimeter, gram, second)', IPS: 'IPS (inch, pound, second)' };

export function StatusBar({ hint }: { hint: string }) {
  const st = useStore();
  const solve = useActiveSolve();
  const [units, setUnits] = useState(false);
  const msg = st.messages[st.messages.length - 1];
  const sketchName = st.activeSketchId ? st.doc.sketches[st.activeSketchId]?.name : null;
  return (
    <div className="k-statusbar">
      {msg ? (
        <span className={`k-status-msg ${msg.level}`}>
          {msg.level !== 'info' && <Icon.Warning size={13} />} {msg.text}
        </span>
      ) : (
        <span className="k-muted">{hint || (st.planePick ? 'Selecteer een vlak voor de schets' : 'Gereed')}</span>
      )}
      <span className="grow" />
      {st.cursor && st.activeSketchId && (
        <span className="k-status-cell mono">
          {st.cursor.x.toFixed(2)}, {st.cursor.y.toFixed(2)} {st.doc.units}
        </span>
      )}
      {solve && st.activeSketchId && (
        <span className={`k-status-cell status ${solve.status}`} title={`DOF: ${solve.dof} · ${solve.iterations} iteraties · ${solve.timeMs.toFixed(1)} ms`}>
          {STATUS_TEXT[solve.status]}
        </span>
      )}
      <span className="k-status-cell">{sketchName ? `Editing ${sketchName}` : 'Editing Part'}</span>
      <span className="k-status-cell" style={{ position: 'relative' }}>
        <button className="k-status-units" onClick={() => setUnits(true)}>
          {st.unitSystem} <Icon.ChevronDown size={10} />
        </button>
        {units && (
          <Menu
            onClose={() => setUnits(false)}
            style={{ bottom: '100%', right: 0, top: 'auto' }}
            items={[
              ...(['MKS', 'CGS', 'MMGS', 'IPS'] as UnitSystem[]).map((u) => ({ label: `${st.unitSystem === u ? '✓ ' : ''}${UNIT_LABEL[u]}`, onSelect: () => st.setUnitSystem(u) })),
              { separator: true },
              { label: 'Documenteenheden bewerken…', onSelect: () => st.setDialog('options') },
            ]}
          />
        )}
      </span>
    </div>
  );
}
