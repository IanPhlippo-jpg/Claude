import { useState } from 'react';
import { sketchStatus, useActiveSketch, useActiveSolve, useStore, type UnitSystem } from './store';
import { Icon } from '../ui/icons';
import { Menu } from '../ui/components';

const STATUS_TEXT: Record<string, string> = {
  under: 'Under Defined',
  full: 'Fully Defined',
  over: 'Over Defined',
  conflict: 'Over Defined (conflict)',
  invalid: 'Invalid relation',
};

const UNIT_LABEL: Record<UnitSystem, string> = { MKS: 'MKS (meter, kilogram, second)', CGS: 'CGS (centimeter, gram, second)', MMGS: 'MMGS (millimeter, gram, second)', IPS: 'IPS (inch, pound, second)' };

export function StatusBar({ hint }: { hint: string }) {
  const st = useStore();
  const solve = useActiveSolve();
  const sketch = useActiveSketch();
  const [units, setUnits] = useState(false);
  const msg = st.messages[st.messages.length - 1];
  const sketchName = sketch?.name ?? null;
  const status = sketchStatus(sketch, solve);
  const u = st.doc.units;
  const coord = (v: number) => `${Math.round(v * 100) / 100}${u}`;
  return (
    <div className="k-statusbar">
      {msg ? (
        <span className={`k-status-msg ${msg.level}`}>
          {msg.level !== 'info' && <Icon.Warning size={13} />} {msg.text}
        </span>
      ) : (
        <span className="k-muted">{hint || (st.planePick ? '' : st.activeSketchId ? '' : 'Ready')}</span>
      )}
      <span className="grow" />
      {st.cursor && (st.activeSketchId || st.doc.kind === 'drawing') && (
        <span className="k-status-coords">
          <span>{coord(st.cursor.x)}</span>
          <span>{coord(st.cursor.y)}</span>
          <span>0{u}</span>
        </span>
      )}
      {status && st.activeSketchId && (
        <span className={`k-status-cell status ${status}`} title={solve ? `DOF: ${solve.dof} · ${solve.iterations} iterations · ${solve.timeMs.toFixed(1)} ms` : undefined}>
          {STATUS_TEXT[status]}
        </span>
      )}
      {st.doc.kind === 'drawing' && !st.activeSketchId && <span className="k-status-cell status under">Under Defined</span>}
      <span className="k-status-cell">{!st.hasDocument ? '' : sketchName ? `Editing ${sketchName}` : (st.doc.kind === 'assembly' ? 'Editing Assembly' : st.doc.kind === 'drawing' ? `Editing ${st.doc.sheets?.[0]?.views.find((v) => v.id === st.selectedDrawingViewId)?.name ?? st.doc.sheets?.[0]?.name ?? 'Sheet1'}` : 'Editing Part')}</span>
      {st.doc.kind === 'drawing' && st.doc.sheets?.[0] && <span className="k-status-cell" data-testid="sheet-scale">{st.doc.sheets[0].scale[0]} : {st.doc.sheets[0].scale[1]}</span>}
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
              { label: 'Edit Document Units…', onSelect: () => st.setDialog('options') },
            ]}
          />
        )}
      </span>
    </div>
  );
}
