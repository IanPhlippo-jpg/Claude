import { useEffect, useState } from 'react';
import { richTipFor } from './richTips';

/**
 * One tooltip for the whole window: any element with data-tip shows it after a short delay, below the element,
 * kept inside the window and never clipped by a panel (the CommandManager, the PropertyManager), as the original.
 */
export function GlobalTooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; above: boolean; rich: boolean } | null>(null);
  useEffect(() => {
    let timer = 0;
    let current: Element | null = null;
    const hide = () => { window.clearTimeout(timer); current = null; setTip(null); };
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-tip]') ?? null;
      if (el === current) return;
      window.clearTimeout(timer);
      current = el;
      setTip(null);
      if (!el) return;
      const text = el.getAttribute('data-tip');
      if (!text) return;
      timer = window.setTimeout(() => {
        if (current !== el || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        const below = r.bottom + 6;
        const above = below + 30 > window.innerHeight;
        // CommandManager buttons get the rich tooltip (title, picture, explanation) below the button, as the original
        const rich = !!el.closest('.k-cm-body') && !!richTipFor(text);
        setTip({ text, x: rich ? r.left + r.width / 2 - 24 : el.classList.contains('tip-right') ? r.right : r.left, y: above && !rich ? r.top - 6 : below + (rich ? 4 : 0), above: above && !rich, rich });
      }, 450);
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('mousedown', hide, true);
    document.addEventListener('wheel', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mousedown', hide, true);
      document.removeEventListener('wheel', hide, true);
      window.removeEventListener('blur', hide);
      window.clearTimeout(timer);
    };
  }, []);
  if (!tip) return null;
  const rt = tip.rich ? richTipFor(tip.text) : null;
  if (rt) {
    return (
      <div className="k-richtip" role="tooltip" data-testid="tooltip" ref={(el) => { if (el) el.style.left = `${Math.max(4, Math.min(tip.x, window.innerWidth - el.offsetWidth - 4))}px`; }} style={{ left: tip.x, top: tip.y }}>
        <span className="k-richtip-tail" style={{ left: 18 }} />
        <b>{rt.title}</b>
        {rt.art && <div className="k-richtip-art">{rt.art}</div>}
        <p>{rt.desc}</p>
      </div>
    );
  }
  return (
    <div
      className="k-tooltip"
      role="tooltip"
      data-testid="tooltip"
      ref={(el) => {
        if (!el) return;
        // keep it inside the window
        const w = el.offsetWidth, h = el.offsetHeight;
        el.style.left = `${Math.max(4, Math.min(tip.x, window.innerWidth - w - 4))}px`;
        el.style.top = `${tip.above ? tip.y - h : tip.y}px`;
      }}
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.text}
    </div>
  );
}
