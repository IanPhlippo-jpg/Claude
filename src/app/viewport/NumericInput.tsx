import { useEffect, useRef, useState } from 'react';
import { numericInputOn } from '../prefsEffects';
import type { SketchPoint } from '../../core/sketch/types';
import type { ToolContext, ToolController } from './tools';

/**
 * On-screen numeric input on entity creation (Options ▸ Sketch), as the intended design: while a line or circle is
 * being drawn a small box beside the pointer shows its length or radius; a typed value and Enter places the end.
 */
export function NumericInput({ tools, ctx, project, onDone }: { tools: ToolController; ctx: () => ToolContext | null; project: (p: SketchPoint) => { x: number; y: number }; onDone: () => void }) {
  const anchor = numericInputOn() ? tools.numericAnchor() : null;
  const [text, setText] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  // a digit typed while drawing starts the value
  useEffect(() => {
    if (!anchor) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as Element)?.closest?.('input, textarea, select') || !/^[0-9.]$/.test(e.key)) return;
      e.preventDefault();
      setText(e.key);
      // the first digit stays: the caret goes after it instead of selecting it
      requestAnimationFrame(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [!!anchor]);
  if (!anchor) return null;
  const q = project(anchor.at);
  const commit = () => {
    const v = Number((text ?? '').replace(',', '.'));
    const c = ctx();
    setText(null);
    if (c && v > 0 && tools.numericEntry(c, v)) onDone();
  };
  return (
    <div className="k-numeric-input" data-testid="numeric-input" style={{ left: q.x + 18, top: q.y + 18 }}>
      <span>{anchor.label}</span>
      <input ref={ref} className="k-input mono" value={text ?? anchor.value.toFixed(2)} onFocus={(e) => { if (text === null) e.target.select(); }} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setText(null); e.stopPropagation(); }} />
    </div>
  );
}
