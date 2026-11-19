/**
 * Number and date formats of the output (docs/36 F0-9): Belgian notation for the workshop and the customer
 * (€ 1.234,56, comma as decimal sign, dates dd/mm/jjjj); a point and never an exponent in DXF, CSV and JSON.
 * One formatter per kind, and one rounding function for money (half up, whole cents, docs/36 5.3).
 */

/** euro -> whole cents, half up (0,005 -> 1 cent; 1,005 -> 101 cent: the float error of x * 100 is absorbed) */
export function toCent(euro: number): number {
  if (!Number.isFinite(euro)) return 0;
  const a = Math.abs(euro) * 100;
  const c = Math.floor(a + 0.5 + 1e-7);
  return euro < 0 ? -c : c;
}

/** the product of an amount and a unit price in cents, rounded once */
export const lineCent = (qty: number, unitCent: number) => toCent((qty * unitCent) / 100);

/** a number in Belgian notation: thousands with a point, decimals with a comma; NaN and infinity as a dash */
export function num(x: number, decimals = 2, thousands = true): string {
  if (!Number.isFinite(x)) return '–';
  const f = 10 ** decimals;
  let r = Math.round(Math.abs(x) * f + 1e-9) / f;
  if (r === 0) r = 0;
  const [int, dec] = r.toFixed(decimals).split('.');
  const grouped = thousands ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int;
  const neg = x < 0 && r !== 0;
  return `${neg ? '-' : ''}${grouped}${decimals > 0 ? ',' + dec : ''}`;
}

/** € 1.234,56 from cents */
export function euro(cent: number): string {
  if (!Number.isFinite(cent)) return '€ –';
  const neg = cent < 0;
  return `€ ${neg ? '-' : ''}${num(Math.abs(cent) / 100, 2)}`;
}

/** a length in mm for the workshop: whole millimetres unless a decimal matters (0,5 mm steps stay) */
export function mm(x: number): string {
  const r = Math.round(x * 10) / 10;
  return num(r, Number.isInteger(r) ? 0 : 1, false);
}

/** yyyy-mm-dd -> dd/mm/jjjj */
export function date(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** today as yyyy-mm-dd (local time) */
export function today(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** yyyy-mm-dd plus whole days */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return today(new Date(y, m - 1, d + days));
}

/** months between two dates (yyyy-mm-dd), fractional */
export function monthsBetween(a: string, b: string): number {
  const t = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  return (t(b) - t(a)) / (30.44 * 86400000);
}

/** a number for DXF, CSV for machines and JSON: a point, at most 6 decimals, never an exponent, never NaN or -0 */
export function machineNum(x: number, decimals = 6): string {
  if (!Number.isFinite(x)) throw new Error(`not a number in machine output: ${x}`);
  let s = x.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}
