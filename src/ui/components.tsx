import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type MouseEvent as RMouseEvent } from 'react';
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
  // a menu opened inside the CommandManager (which clips its content) is lifted out to the page, at the same place
  const [fixed, setFixed] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (fixed || !ref.current || !ref.current.closest('.k-cm-body, .k-cm')) return;
    const r = ref.current.getBoundingClientRect();
    const left = Math.max(4, Math.min(r.left, window.innerWidth - r.width - 4));
    setFixed({ left, top: r.top });
  }, [fixed]);
  const body = (
    <div className="k-menu" ref={ref} style={fixed ? { ...style, position: 'fixed', left: fixed.left, top: fixed.top, right: 'auto', bottom: 'auto', zIndex: 2000 } : style}>
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
  return fixed ? createPortal(body, document.body) : body;
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
  /** pointing at the row (the model highlights the feature, as the original) */
  onHover?: (on: boolean) => void;
  /** start expanded (default: only the top level) */
  defaultOpen?: boolean;
}

/** a selected or active row somewhere below this node */
function hasSelectedBelow(n: TreeNode): boolean {
  return !!n.children?.some((c) => c.selected || c.active || hasSelectedBelow(c));
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  // as the original: the top node is expanded, features and folders start collapsed (▸) until opened
  const [open, setOpen] = useState(node.defaultOpen ?? depth === 0);
  const hasKids = !!node.children?.length;
  const selectedBelow = hasKids && hasSelectedBelow(node);
  useEffect(() => {
    if (selectedBelow) setOpen(true);
  }, [selectedBelow]);
  return (
    <>
      <div
        className={`k-tree-row ${node.selected ? 'selected' : ''} ${node.active ? 'active' : ''} ${node.suppressed ? 'suppressed' : ''}`}
        data-id={node.id}
        data-depth={depth}
        style={{ paddingLeft: depth === 0 ? 0 : 4 + (depth - 1) * 16 }}
        onClick={node.onClick}
        onDoubleClick={node.onDoubleClick}
        onContextMenu={node.onContextMenu}
        onMouseEnter={node.onHover ? () => node.onHover!(true) : undefined}
        onMouseLeave={node.onHover ? () => node.onHover!(false) : undefined}
      >
        <span
          className="caret"
          data-open={hasKids ? String(open) : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {hasKids && depth > 0 ? <Icon.TreeCaret open={open} /> : null}
        </span>
        {/* as the original: only the icon and name get the hover / selection box, not the whole row */}
        <span className="k-tree-hl">
          {node.icon}
          <span>{node.label}</span>
        </span>
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

/** Value text as the original shows it in a PropertyManager: 10.00mm, 1.00deg, 0.375in; counts without decimals. */
export function formatValue(v: number, unit?: string): string {
  if (!Number.isFinite(v)) return '';
  if (!unit) return String(round(v));
  if (unit === '°' || unit === 'deg') return `${v.toFixed(2)}deg`;
  if (unit === 'in') return `${v.toFixed(3)}in`;
  return `${v.toFixed(2)}${unit}`;
}

/** Leading number of a typed value ("12,5mm" and "12.5 mm" both give 12.5). */
const LEN_MM: Record<string, number> = { mm: 1, cm: 10, m: 1000, in: 25.4, '"': 25.4, ft: 304.8, "'": 304.8 };
/**
 * A typed value: a finite number with an optional unit (10, 2.5cm, 1in, 30deg), converted to the field's unit
 * (mm/cm/m/in or deg). Anything else (letters, ∞, several numbers) is NaN and leaves the value as it was.
 */
export function parseValue(text: string, unit?: string): number {
  const t = text.trim().toLowerCase().replace(',', '.');
  const m = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*([a-z"'°]*)$/.exec(t);
  // 2*25+5, (100-4)/3: plain arithmetic without units, as the equation-style input of the original
  if (!m) return bounded(evalArithmetic(t));
  const v = parseFloat(m[1]);
  if (!Number.isFinite(v)) return NaN;
  const u = m[2];
  if (!u || u === unit) return bounded(v);
  if (unit === '°' || unit === 'deg') {
    if (u === 'deg' || u === '°') return bounded(v);
    if (u === 'rad') return bounded((v * 180) / Math.PI);
    return NaN;
  }
  if (unit && LEN_MM[unit] && LEN_MM[u]) return bounded((v * LEN_MM[u]) / LEN_MM[unit]);
  if (!unit && LEN_MM[u]) return bounded(v * LEN_MM[u]);
  return NaN;
}

/** the largest magnitude a field accepts (1 000 000 mm = 1 km, far beyond the 1000 m of the original); more is refused like ∞ */
export const MAX_FIELD_VALUE = 1e6;
const bounded = (v: number): number => (Number.isFinite(v) && Math.abs(v) <= MAX_FIELD_VALUE ? v : NaN);

/** + - * / and parentheses over plain numbers; anything else is NaN. No eval. */
export function evalArithmetic(expr: string): number {
  if (!/^[\d.\s+\-*/()e]+$/.test(expr) || !/[+\-*/]/.test(expr.replace(/^[-+]/, '').replace(/e[-+]/g, 'e'))) return NaN;
  let i = 0;
  const s = expr.replace(/\s+/g, '');
  const peek = () => s[i];
  const num = (): number => {
    const m2 = /^(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/.exec(s.slice(i));
    if (!m2) return NaN;
    i += m2[0].length;
    return parseFloat(m2[0]);
  };
  const factor = (): number => {
    if (peek() === '-') { i++; return -factor(); }
    if (peek() === '+') { i++; return factor(); }
    if (peek() === '(') { i++; const v = sum(); if (peek() !== ')') return NaN; i++; return v; }
    return num();
  };
  const product = (): number => { let v = factor(); while (peek() === '*' || peek() === '/') { const op = s[i++]; const r = factor(); v = op === '*' ? v * r : v / r; } return v; };
  const sum = (): number => { let v = product(); while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = product(); v = op === '+' ? v + r : v - r; } return v; };
  const v = sum();
  return i === s.length ? v : NaN;
}

export function NumberField({
  value,
  onChange,
  unit,
  step = 1,
  min,
  autoFocus,
  onCommit,
  disabled,
  blankWhenDisabled,
}: {
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  autoFocus?: boolean;
  onCommit?: () => void;
  disabled?: boolean;
  /** an unavailable value shows an empty grey field (as the draft angle while Draft is off) */
  blankWhenDisabled?: boolean;
}) {
  const [text, setText] = useState(formatValue(value, unit));
  const focused = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // the first value field of a PropertyManager takes the focus without scrolling the panel (its top stays in view)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // typed: the user has edited the text since the field got the focus (only then a new outside value is not shown)
  const typed = useRef(false);
  useEffect(() => {
    if (!focused.current || !typed.current) {
      setText(formatValue(value, unit));
      // a focused field keeps its selection, so typing still replaces the value
      if (focused.current) requestAnimationFrame(() => { const el = document.activeElement as HTMLInputElement | null; if (el?.classList.contains('k-num')) el.select(); });
    }
  }, [value, unit]);
  const spin = (dir: 1 | -1) => {
    let v = round((Number.isFinite(value) ? value : 0) + dir * step, 6);
    if (min !== undefined) v = Math.max(min, v);
    onChange(v);
    setText(formatValue(v, unit));
  };
  return (
    <div className={`k-number ${disabled ? 'disabled' : ''}`}>
      <input
        className="k-input k-num"
        type="text"
        inputMode="decimal"
        data-unit={unit ?? ''}
        ref={inputRef}
        value={disabled && blankWhenDisabled ? '' : text}
        disabled={disabled}
        onFocus={(e) => {
          focused.current = true;
          typed.current = false;
          e.target.select();
        }}
        onBlur={() => {
          focused.current = false;
          typed.current = false;
          setText(formatValue(value, unit));
        }}
        onChange={(e) => {
          typed.current = true;
          setText(e.target.value);
          const v = parseValue(e.target.value, unit);
          if (Number.isFinite(v)) onChange(min !== undefined ? Math.max(min, v) : v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setText(formatValue(value, unit));
            onCommit?.();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            spin(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            spin(-1);
          }
          e.stopPropagation();
        }}
      />
      <span className="k-spin">
        <button type="button" tabIndex={-1} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => spin(1)} aria-label="Increase"><svg width={7} height={4} viewBox="0 0 7 4"><path d="M0 4L3.5 0 7 4z" fill="currentColor" /></svg></button>
        <button type="button" tabIndex={-1} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => spin(-1)} aria-label="Decrease"><svg width={7} height={4} viewBox="0 0 7 4"><path d="M0 0l3.5 4L7 0z" fill="currentColor" /></svg></button>
      </span>
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

export function Section({ title, children, defaultOpen = true, check, onCheck }: { title: string; children: ReactNode; defaultOpen?: boolean; check?: boolean; onCheck?: (v: boolean) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  // a PropertyManager that swaps its sections keeps React state by position: reset when the title changes
  useEffect(() => setOpen(defaultOpen), [title, defaultOpen]);
  return (
    <div className={`k-section ${open ? 'open' : ''}`}>
      <div className="k-section-title" onClick={() => setOpen((o) => !o)}>
        {check !== undefined && (
          <input
            type="checkbox"
            className="k-section-check"
            checked={check}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              onCheck?.(e.target.checked);
              setOpen(e.target.checked);
            }}
          />
        )}
        <span className="k-section-name">{title}</span>
        <span className="k-section-caret">{open ? <Icon.ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} /> : <Icon.ChevronDown size={12} />}</span>
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
