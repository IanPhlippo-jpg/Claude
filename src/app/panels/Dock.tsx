import { useRef, useState, type ReactNode } from 'react';
import { useStore, type DockSide, type PanelId } from '../store';
import { Icon } from '../../ui/icons';
import { Menu } from '../../ui/components';

/** A dockable panel: header with a menu to dock left/right, float or close. */
export function DockPanel({ id, title, children, actions, header }: { id: PanelId; title: string; children: ReactNode; actions?: ReactNode; header?: ReactNode }) {
  const layout = useStore((s) => s.panels[id]);
  const setPanel = useStore((s) => s.setPanel);
  const [menu, setMenu] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const floating = layout.side === 'float';
  const move = (side: DockSide) => setPanel(id, { side, x: layout.x ?? 320, y: layout.y ?? 120 });
  const onHeaderDown = (e: React.PointerEvent) => {
    if (!floating) return;
    drag.current = { x: e.clientX, y: e.clientY, px: layout.x ?? 0, py: layout.y ?? 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHeaderMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPanel(id, { x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y });
  };
  return (
    <div className={`k-panel ${floating ? 'floating' : ''}`} style={floating ? { left: layout.x, top: layout.y } : undefined}>
      <div className="k-panel-header" onPointerDown={onHeaderDown} onPointerMove={onHeaderMove} onPointerUp={() => (drag.current = null)}>
        {header ?? <span>{title}</span>}
        {!header && <span className="grow" />}
        {actions}
        <div style={{ position: 'relative' }}>
          <button className="k-btn ghost icon" onClick={() => setMenu(true)} title="Panel options">
            <Icon.Dots />
          </button>
          {menu && (
            <Menu
              onClose={() => setMenu(false)}
              style={{ right: 0, top: '100%' }}
              items={[
                { label: 'Dock left', onSelect: () => move('left'), disabled: layout.side === 'left' },
                { label: 'Dock right', onSelect: () => move('right'), disabled: layout.side === 'right' },
                { label: 'Float', onSelect: () => move('float'), disabled: floating },
                { separator: true },
                { label: 'Close', onSelect: () => setPanel(id, { visible: false }) },
              ]}
            />
          )}
        </div>
        <button className="k-btn ghost icon" onClick={() => setPanel(id, { visible: false })} title="Close">
          <Icon.Close size={12} />
        </button>
      </div>
      <div className="k-panel-body">{children}</div>
    </div>
  );
}

/** Resizable dock column. */
export function DockColumn({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  const width = useStore((s) => s.dockWidth[side]);
  const setWidth = useStore((s) => s.setDockWidth);
  const start = useRef<{ x: number; w: number } | null>(null);
  const kids = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (!kids.length) return null;
  return (
    <div className={`k-dock k-dock-${side}`} style={{ width }}>
      <div
        className={`k-dock-handle ${side}`}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, w: width };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          setWidth(side, start.current.w + (side === 'left' ? dx : -dx));
        }}
        onPointerUp={() => (start.current = null)}
      />
      <div className="k-dock-stack">{children}</div>
    </div>
  );
}
