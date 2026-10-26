import type { DrawingDimension } from '../document/types';

/** Dimension PropertyManager ▸ Tolerance/Precision: the tolerance types of the intended design (reduced) */
export type DimTolerance = { type: 'none' | 'basic' | 'bilateral' | 'symmetric' | 'limit' | 'min' | 'max'; plus: number; minus: number };

/** The texts of a drawing dimension: the value (with prefix, suffix, Ø / R), the stacked tolerance and the dual value. */
export function dimensionText(d: DrawingDimension, decimals: number): { main: string; upper?: string; lower?: string; dual?: string; boxed?: boolean } {
  const dec = d.precision ?? decimals;
  const f = (x: number) => x.toFixed(dec);
  const sym = d.kind === 'diameter' ? 'Ø' : d.kind === 'radius' ? 'R' : '';
  const tol = d.tol ?? { type: 'none', plus: 0, minus: 0 };
  // Override value replaces the measured number, by design
  const val = d.override !== undefined && d.override !== '' ? d.override : f(d.value);
  const wrap = (core: string) => `${d.prefix ?? ''}${sym}${core}${d.suffix ?? ''}`;
  const tf = (x: number) => x.toFixed(Math.max(dec, 2));
  let main = wrap(val), upper: string | undefined, lower: string | undefined;
  if (tol.type === 'symmetric') main = wrap(`${val} ±${tf(tol.plus)}`);
  else if (tol.type === 'bilateral') { upper = `+${tf(tol.plus)}`; lower = `-${tf(tol.minus)}`; }
  else if (tol.type === 'limit') { main = ''; upper = wrap(f(d.value + tol.plus)); lower = wrap(f(d.value - tol.minus)); }
  else if (tol.type === 'min') main = wrap(`${val} MIN`);
  else if (tol.type === 'max') main = wrap(`${val} MAX`);
  // Dual dimension: the value in inches in brackets below
  const dual = d.dual ? `[${(d.value / 25.4).toFixed(Math.max(2, dec + 1))}]` : undefined;
  return { main, upper, lower, dual, boxed: tol.type === 'basic' };
}
