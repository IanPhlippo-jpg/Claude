import { useEffect, useRef, useState, type ReactNode, type MouseEvent as RMouseEvent } from 'react';
import { Icon } from './icons';

/* ---------- Button / ToolButton ---------------------------------------------- */

export function Button({
  children,
  variant,
  icon,
  tip,
  ...rest
}: {
  children?: ReactNode;
  variant?: 'primary' | 'danger' | 'ghost' | 'icon';
  icon?: ReactNode;
  tip?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`k-btn ${variant ?? ''} ${tip ? 'k-tip' : ''}`} data-tip={tip} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ToolButton({
  label,
  icon,
  active,
  small,
  shortcut,
  ...rest
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  small?: boolean;
  shortcut?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`k-tool k-tip ${active ? 'active' : ''} ${small ? 'small' : ''}`}
      data-tip={shortcut ? `${label}  (${shortcut})` : label}
      {...rest}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ---------- Dropdown menu ------------------------------------------------------ */

export interface MenuItem {
  label?: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

export function Menu({ items, onClose, style }: { items: MenuItem[]; onClose: () => void; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div className="k-menu" ref={ref} style={style}>
      {items.map((it, i) =>
        it.separator ? (
          <div key={i} className="k-menu-sep" />
        ) : (
          <button
            key={i}
            className="k-menu-item"
            disabled={it.disabled}
            onClick={() => {
              it.onSelect?.();
              onClose();
            }}
          >
            {it.icon}
            <span>{it.label}</span>
            {it.shortcut && <span className="shortcut">{it.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}

export function Dropdown({ label, icon, items, variant }: { label?: string; icon?: ReactNode; items: MenuItem[]; variant?: 'ghost' | 'icon' }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Button variant={variant} icon={icon} onClick={() => setOpen((o) => !o)}>
        {label}
        {label && <Icon.ChevronDown size={12} />}
      </Button>
      {open && <Menu items={items} onClose={() => setOpen(false)} style={{ top: '100%', left: 0, marginTop: 2 }} />}
    </div>
  );
}

/* ---------- Dialog -------------------------------------------------------------- */

export function Dialog({ title, children, actions, onClose }: { title: string; children: ReactNode; actions?: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="k-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="k-dialog" role="dialog" aria-label={title}>
        <div className="k-dialog-title">{title}</div>
        <div className="k-dialog-body">{children}</div>
        {actions && <div className="k-dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------------------------------------------------------------- */

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; disabled?: boolean }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="k-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" className={`k-tab ${t.id === value ? 'active' : ''}`} disabled={t.disabled} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tree ---------------------------------------------------------------- */

export interface TreeNode {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  children?: TreeNode[];
  selected?: boolean;
  active?: boolean;
  suppressed?: boolean;
  tail?: ReactNode;
  onClick?: (e: RMouseEvent) => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: RMouseEvent) => void;
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasKids = !!node.children?.length;
  return (
    <>
      <div
        className={`k-tree-row ${node.selected ? 'selected' : ''} ${node.active ? 'active' : ''} ${node.suppressed ? 'suppressed' : ''}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={node.onClick}
        onDoubleClick={node.onDoubleClick}
        onContextMenu={node.onContextMenu}
      >
        <span
          className="caret"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {hasKids ? open ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} /> : null}
        </span>
        {node.icon}
        <span>{node.label}</span>
        {node.tail}
      </div>
      {hasKids && open && node.children!.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} />)}
    </>
  );
}

export function TreeView({ nodes }: { nodes: TreeNode[] }) {
  return (
    <div className="k-tree">
      {nodes.map((n) => (
        <TreeRow key={n.id} node={n} depth={0} />
      ))}
    </div>
  );
}

/* ---------- Form fields ----------------------------------------------------------- */

export function NumberField({
  value,
  onChange,
  unit,
  step = 1,
  min,
  autoFocus,
  onCommit,
}: {
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  autoFocus?: boolean;
  onCommit?: () => void;
}) {
  const [text, setText] = useState(String(round(value)));
  useEffect(() => setText(String(round(value))), [value]);
  return (
    <div className="k-number">
      <input
        className="k-input"
        type="number"
        step={step}
        min={min}
        value={text}
        autoFocus={autoFocus}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit?.();
          e.stopPropagation();
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <span className={`k-toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} role="switch" aria-checked={value}>
      <span className="track" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="k-section">
      <div className="k-section-title" onClick={() => setOpen((o) => !o)}>
        {open ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />}
        {title}
      </div>
      {open && <div className="k-section-body">{children}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="k-kbd">{children}</span>;
}

export function round(v: number, d = 3): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
