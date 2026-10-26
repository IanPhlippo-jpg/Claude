import { useEffect, useState } from 'react';
import { useStore } from '../store';

/**
 * The Rotate context toolbar of Insert Component: an angle box with spin buttons and X / Y / Z buttons that
 * turn the part on the pointer by that angle before it is placed. It stands at the bottom left of the graphics area.
 */
export function InsertRotateBar() {
  const angle = useStore((s) => s.insertAngle);
  const setAngle = useStore((s) => s.setInsertAngle);
  const rotate = useStore((s) => s.rotateInsertGhost);
  const [text, setText] = useState(`${angle.toFixed(2)}deg`);
  useEffect(() => setText(`${angle.toFixed(2)}deg`), [angle]);
  const commit = () => {
    const v = parseFloat(text);
    if (Number.isFinite(v)) setAngle(v);
    else setText(`${angle.toFixed(2)}deg`);
  };
  const step = (d: number) => setAngle(Math.round((angle + d) * 100) / 100);
  const btn = (axis: 'x' | 'y' | 'z') => (
    <button key={axis} className="k-rotbar-btn k-tip" data-tip={`Rotate about ${axis.toUpperCase()}`} data-testid={`rotbar-${axis}`} onClick={() => rotate(axis)}>
      <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
        <text x="10" y="10" textAnchor="middle" fontSize="10.5" fontWeight="700" fontFamily="Segoe UI, Arial, sans-serif" fill="#2a2a2a">{axis.toUpperCase()}</text>
        <path d="M3.5 12.5c1.6 3 4 4.3 6.5 4.3s4.9-1.3 6.5-4.3" fill="none" stroke="#2a2a2a" strokeWidth={1.3} />
        <path d="M2 11.3l1.6 1.4 1.5-1.8M18 11.3l-1.6 1.4-1.5-1.8" fill="none" stroke="#2a2a2a" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </button>
  );
  return (
    <div className="k-rotbar" data-testid="insert-rotate-bar" onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()}>
      <div className="k-rotbar-grip" />
      <div className="k-rotbar-body">
        <input className="k-rotbar-input" data-testid="rotbar-angle" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); e.stopPropagation(); }} />
        <span className="k-rotbar-spin">
          <button aria-label="Increase" onClick={() => step(15)}><svg width={7} height={4} viewBox="0 0 7 4"><path d="M0 4L3.5 0 7 4z" fill="#333" /></svg></button>
          <button aria-label="Decrease" onClick={() => step(-15)}><svg width={7} height={4} viewBox="0 0 7 4"><path d="M0 0l3.5 4L7 0z" fill="#333" /></svg></button>
        </span>
        {btn('x')}
        {btn('y')}
        {btn('z')}
      </div>
    </div>
  );
}
