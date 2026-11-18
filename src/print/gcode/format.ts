/**
 * The one number formatter of the G-code writer (docs/34 E14): toFixed, trailing zeros cut, never an exponent, never
 * "-0", never a comma, never NaN or Infinity (a bad number is a bug and throws). And the ASCII guard for comments
 * (docs/34 E13): part names with accents become plain letters.
 */
export function fmt(v: number, decimals: number): string {
  if (!Number.isFinite(v)) throw new Error(`G-code number is not finite: ${v}`);
  let s = v.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}
export const fx = (v: number) => fmt(v, 3);
export const fe = (v: number) => fmt(v, 5);
export const ff = (mmPerS: number) => fmt(Math.round(mmPerS * 60), 0);

/** text for a G-code comment: ASCII 32..126 only */
export function ascii(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?');
}

/** fills {name} variables; an unknown variable is an error, not empty text (docs/34 2.7) */
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (_, k: string) => {
    if (!(k in vars)) throw new Error(`Unknown variable {${k}} in the start or end G-code.`);
    const v = vars[k];
    return typeof v === 'number' ? fmt(v, 3) : v;
  });
}
