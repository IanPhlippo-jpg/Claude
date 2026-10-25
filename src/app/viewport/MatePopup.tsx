import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Icon } from '../../ui/icons';
import type { MateType } from '../../core/document/types';

/**
 * Mate pop-up toolbar (Options ▸ Show popup dialog): once two entities are selected, a small toolbar next to the
 * pointer offers the mate types that fit the selection, Lock rotation for Concentric, and ✓ to add the mate.
 */
export function MatePopup({ at }: { at: { x: number; y: number } | null }) {
  const me = useStore((s) => s.mateEdit);
  const update = useStore((s) => s.updateMateDraft);
  const commit = useStore((s) => s.commitMate);
  const undo = useStore((s) => s.removeMateRef);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const showPopup = useStore((s) => s.mateOpts.popup);
  const ready = !!me && me.draft.refs.length === 2;
  useEffect(() => {
    if (ready && at) setPos({ x: at.x + 16, y: at.y + 12 });
    if (!ready) setPos(null);
    // the toolbar appears where the second pick was made and stays there
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  if (!me || !ready || !pos || !showPopup) return null;
  const d = me.draft;
  const bothCyl = d.refs.every((r) => r.cylindrical);
  const anyCyl = d.refs.some((r) => r.cylindrical);
  const types: { t: MateType; icon: React.ReactNode; tip: string; ok: boolean }[] = [
    { t: 'coincident', icon: <Icon.MateCoincident size={16} />, tip: 'Coincident', ok: !bothCyl },
    { t: 'parallel', icon: <Icon.MateParallel size={16} />, tip: 'Parallel', ok: !bothCyl },
    { t: 'perpendicular', icon: <Icon.MatePerpendicular size={16} />, tip: 'Perpendicular', ok: !bothCyl },
    { t: 'tangent', icon: <Icon.MateTangent size={16} />, tip: 'Tangent', ok: anyCyl },
    { t: 'concentric', icon: <Icon.MateConcentric size={16} />, tip: 'Concentric', ok: bothCyl },
    { t: 'lock', icon: <Icon.MateLock size={16} />, tip: 'Lock', ok: true },
    { t: 'distance', icon: <Icon.MateDistance size={16} />, tip: 'Distance', ok: !bothCyl },
    { t: 'angle', icon: <Icon.MateAngle size={16} />, tip: 'Angle', ok: !bothCyl },
  ];
  return (
    <div className="k-mate-popup" style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => e.stopPropagation()} data-testid="mate-popup">
      <div className="k-mate-popup-row">
        {types.map((x) => (
          <button key={x.t} className={`k-tip ${d.type === x.t ? 'active' : ''}`} data-tip={x.tip} disabled={!x.ok} onClick={() => update({ type: x.t, value: x.t === 'distance' ? d.value ?? 10 : x.t === 'angle' ? d.value ?? 90 : d.value })}>
            {x.icon}
          </button>
        ))}
        <button className="k-tip" data-tip="Undo" onClick={() => undo(1)}><Icon.Undo size={15} /></button>
        <button className="k-tip ok" data-tip="Add/Finish Mate" onClick={() => commit()}><Icon.Check size={16} /></button>
      </div>
      {d.type === 'concentric' && (
        <label className="k-check"><input type="checkbox" checked={!!d.lockRotation} onChange={(e) => update({ lockRotation: e.target.checked })} /> Lock rotation</label>
      )}
    </div>
  );
}
