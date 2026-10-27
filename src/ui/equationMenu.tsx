import { useState } from 'react';

/**
 * Equations in a value field, as the intended design: typing = in a Property Panel field or the Modify box turns it
 * into an equation and opens a menu with Global Variables ▸, Functions ▸ and File Properties ▸. The app supplies the
 * names, evaluates the expression and records the equation for the dimension the field edits.
 */
export interface EquationEnv {
  globals: () => string[];
  fileProperties: () => string[];
  /** the value of an expression (names between double quotes); throws with the reason */
  evaluate: (expression: string) => number;
  /** the field committed an equation; the next value change it makes is driven by it */
  onEquation: (expression: string) => void;
}

export const equationEnv: { current: EquationEnv | null } = { current: null };

/** the functions an equation knows, as the menu lists them */
export const EQUATION_FUNCTIONS = ['sin()', 'cos()', 'tan()', 'asin()', 'acos()', 'atan()', 'abs()', 'exp()', 'log()', 'sqrt()', 'int()', 'sgn()', 'min(,)', 'max(,)'];

/** Global Variables ▸ / Functions ▸ / File Properties ▸; a pick is appended to the expression */
export function EquationMenu({ text, setText }: { text: string; setText: (t: string) => void }) {
  const [open, setOpen] = useState<'globals' | 'functions' | 'props' | null>(null);
  const env = equationEnv.current;
  const globals = env?.globals() ?? [];
  const props = env?.fileProperties() ?? [];
  const add = (s: string) => setText(`${text.trimEnd()} ${s}`);
  const sub = (key: 'globals' | 'functions' | 'props', label: string, items: string[], quote: boolean) => (
    <div className={`k-menu-item k-eq-sub ${items.length ? '' : 'k-muted'}`} data-testid={`eq-${key}`} onMouseEnter={() => setOpen(key)} onMouseDown={(e) => { e.preventDefault(); setOpen(open === key ? null : key); }}>
      {label} ▸
      {open === key && items.length > 0 && (
        <div className="k-eq-subitems">
          {items.map((n) => (
            <div key={n} className="k-menu-item" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); add(quote ? `"${n}"` : n.slice(0, n.indexOf('(') + 1)); setOpen(null); }}>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div className="k-eq-suggest" data-testid="eq-menu">
      {sub('globals', 'Global Variables', globals, true)}
      {sub('functions', 'Functions', EQUATION_FUNCTIONS, false)}
      {sub('props', 'File Properties', props, true)}
    </div>
  );
}
