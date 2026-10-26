import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Hidden { label: string; icon: string; disabled: boolean; button: HTMLButtonElement }

/**
 * The Command Ribbon body. When the window is too narrow for all commands, the ones at the right are
 * hidden and a » button at the right edge lists them in a flyout, by design does.
 */
export function RibbonBody({ className, busy, children }: { className: string; busy?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<Hidden[]>([]);
  const [open, setOpen] = useState<{ top: number; right: number } | null>(null);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    const body = ref.current;
    if (!body) return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const body = ref.current;
    if (!body) return;
    // start from everything shown
    body.querySelectorAll('.k-cm-overflow').forEach((el) => el.classList.remove('k-cm-overflow'));
    const items = [...body.querySelectorAll<HTMLElement>(':scope > .k-cm-group > *, :scope > * > .k-cm-group > *')].filter((el) => !el.classList.contains('k-cm-mbgrid'));
    const out: HTMLElement[] = [];
    const room = () => body.clientWidth - 26;
    const used = () => {
      let right = 0;
      const left = body.getBoundingClientRect().left;
      for (const g of body.querySelectorAll<HTMLElement>('.k-cm-group')) {
        if (g.offsetParent === null) continue;
        right = Math.max(right, g.getBoundingClientRect().right - left);
      }
      return right;
    };
    if (used() > body.clientWidth + 0.5) {
      for (let i = items.length - 1; i >= 0 && used() > room(); i--) {
        items[i].classList.add('k-cm-overflow');
        out.unshift(items[i]);
        // a group with nothing left goes too (its separator line)
        const g = items[i].parentElement;
        if (g && [...g.children].every((c) => c.classList.contains('k-cm-overflow'))) g.classList.add('k-cm-overflow');
      }
    }
    const list: Hidden[] = [];
    for (const el of out) {
      const buttons = el.matches('button') ? [el as HTMLButtonElement] : [...el.querySelectorAll<HTMLButtonElement>('button.k-cm-main, button.k-cm-small')];
      for (const b of buttons) {
        const label = (b.querySelector('.k-cm-label') ?? b.querySelector(':scope > span:last-child'))?.textContent?.trim() || b.textContent?.trim() || '';
        if (!label) continue;
        list.push({ label, icon: (b.querySelector('.k-cm-icon svg') ?? b.querySelector('svg'))?.outerHTML ?? '', disabled: b.disabled, button: b });
      }
    }
    setHidden((prev) => (prev.length === list.length && prev.every((h, i) => h.button === list[i].button && h.disabled === list[i].disabled) ? prev : list));
  });

  return (
    <div ref={ref} className={className} data-busy={busy ? '1' : undefined} data-tick={tick}>
      {children}
      {hidden.length > 0 && (
        <div className="k-cm-more">
          <button className="k-cm-more-btn k-tip" data-tip="More commands" data-testid="ribbon-more" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOpen((o) => (o ? null : { top: r.bottom + 2, right: window.innerWidth - r.right })); }}>»</button>
          {open && (
            <div className="k-cm-more-list" style={{ top: open.top, right: open.right }} onMouseLeave={() => setOpen(null)}>
              {hidden.map((h, i) => (
                <button key={i} className="k-cm-more-item" disabled={h.disabled} onClick={() => { setOpen(null); h.button.click(); }}>
                  <span className="k-cm-more-icon" dangerouslySetInnerHTML={{ __html: h.icon }} />
                  <span>{h.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
