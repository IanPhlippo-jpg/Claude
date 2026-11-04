/**
 * Number and dimension text by the options (QA v0.5.11 F112): Document Properties ▸ Units (decimals, angle unit,
 * rounding), ▸ Dimensions (zeros, units, parentheses, dual display, uppercase, arrows, font) and System Options ▸
 * General ▸ decimal separator. Pure functions of the options, used by the sketch dimensions, the drawing and Mass
 * Properties; prefsFormat.test.ts proves each option changes the result.
 */
import { getPref } from './prefs';
export { lengthDecimals } from './prefs';

/** '.12' → 2, 'None' → 0 (the precision lists of the Units and Dimensions pages) */
export const decimalsOf = (v: unknown): number => (String(v) === 'None' ? 0 : Math.max(0, String(v).length - 1));

/**
 * The decimal separator of dimensions (System Options ▸ General ▸ Use system separator for dimensions). The program
 * runs in English, so its own number format (the "system" separator) is the point; switched off, the character typed
 * next to the option is used.
 */
export function decimalSeparator(): string {
  if (getPref('general.systemSeparator') !== false) return '.';
  const s = String(getPref('general.separator') ?? '.');
  return s.length === 1 ? s : '.';
}

/**
 * Round to the given decimals by Units ▸ Decimal rounding. `forDims` false: a value outside a dimension (Mass
 * Properties), which follows the method only when "Only apply rounding method to dimensions" is off.
 */
export function roundValue(v: number, decimals: number, forDims = true): number {
  const method = forDims || getPref('doc.roundingOnlyDims') !== true ? String(getPref('doc.rounding')) : 'Round half away from zero';
  const f = 10 ** decimals, s = Math.abs(v) * f, fl = Math.floor(s), frac = s - fl, eps = 1e-7;
  let n: number;
  if (method === 'Truncate without rounding') n = frac > 1 - eps ? fl + 1 : fl;
  else if (method === 'Round half towards zero') n = frac > 0.5 + eps ? fl + 1 : fl;
  else if (method === 'Round half to even') n = Math.abs(frac - 0.5) <= eps ? (fl % 2 === 0 ? fl : fl + 1) : frac > 0.5 ? fl + 1 : fl;
  else n = frac >= 0.5 - eps ? fl + 1 : fl;
  return (Math.sign(v) || 1) * (n / f);
}

/**
 * A number as text: rounded, with the decimal separator; a dimension (`forDims`) also follows Leading zeroes and
 * Trailing zeroes of Document Properties ▸ Annotations.
 */
export function formatNumber(v: number, decimals: number, forDims = true): string {
  const r = roundValue(v, decimals, forDims);
  let s = Math.abs(r).toFixed(decimals);
  if (forDims && getPref('doc.trailingZeroes') === false && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (forDims && getPref('doc.leadingZeroes') === false && s.startsWith('0.')) s = s.slice(1);
  const neg = r < 0 && Number(s.replace(/[^0-9]/g, '')) !== 0;
  return (neg ? '-' : '') + (forDims ? s.replace('.', decimalSeparator()) : s);
}

/** Units ▸ Mass/Section Properties ▸ Length and Mass: the units of Mass Properties with "Use document settings" */
export const massDocUnits = (): { len: 'mm' | 'cm' | 'm' | 'in'; mass: 'g' | 'kg' | 'lb' } => ({
  len: ({ millimeters: 'mm', centimeters: 'cm', meters: 'm', inches: 'in' } as const)[String(getPref('doc.massLengthUnit')) as 'millimeters'] ?? 'mm',
  mass: ({ grams: 'g', kilograms: 'kg', pounds: 'lb' } as const)[String(getPref('doc.massUnit')) as 'grams'] ?? 'g',
});

/** Units ▸ Mass/Section Properties ▸ Per Unit Volume: the volume unit of the density in Mass Properties */
export const docVolumeUnit = (): 'mm' | 'cm' | 'm' | 'in' => (({ 'millimeters^3': 'mm', 'centimeters^3': 'cm', 'meters^3': 'm', 'inches^3': 'in' } as const)[String(getPref('doc.volumeUnit')) as 'millimeters^3'] ?? 'mm');

/** Material Properties ▸ Density: the density (g/mm³) of a part without a material */
export const defaultDensity = (): number => Math.max(0, Number(getPref('doc.density'))) || 0.001;


/** An angle in degrees as dimension text by Units ▸ Angle and Angle decimals ("90.00°", "30°15'", "1.57rad"). */
export function formatAngle(deg: number, decimals?: number): string {
  const unit = String(getPref('doc.angleUnit'));
  const dec = decimals ?? decimalsOf(getPref('doc.angleDecimals'));
  if (unit === 'radians') return `${formatNumber((deg * Math.PI) / 180, dec)}rad`;
  if (unit === 'deg/min' || unit === 'deg/min/sec') {
    const sign = deg < 0 ? '-' : '';
    const totalSec = Math.round(Math.abs(deg) * 3600);
    if (unit === 'deg/min') {
      const totalMin = Math.round(Math.abs(deg) * 60);
      return `${sign}${Math.floor(totalMin / 60)}°${totalMin % 60}'`;
    }
    return `${sign}${Math.floor(totalSec / 3600)}°${Math.floor((totalSec % 3600) / 60)}'${totalSec % 60}"`;
  }
  return `${formatNumber(deg, dec)}°`;
}

/** Dimensions ▸ Show units for dimension: the unit after a length value ("80mm") */
export const lengthUnitSuffix = (unit: string): string => (getPref('doc.showUnits') === true ? unit : '');

/** Dimensions ▸ Add parentheses by default: a driven (reference) dimension in brackets */
export const drivenText = (text: string): string => (getPref('doc.addParentheses') === false ? text : `(${text})`);

/** the precision of a tolerance (Dimensions ▸ Primary precision ▸ Tolerance; "Same as nominal" follows the value) */
export function toleranceDecimals(nominal: number): number {
  const v = String(getPref('doc.toleranceDecimals'));
  return v === 'Same as nominal' ? nominal : decimalsOf(v);
}

const DUAL_UNITS: Record<string, { k: number; s: string }> = { inches: { k: 1 / 25.4, s: 'in' }, millimeters: { k: 1, s: 'mm' }, centimeters: { k: 0.1, s: 'cm' }, meters: { k: 0.001, s: 'm' } };

/**
 * Dual dimensions (Dimensions ▸ Dual dimensions display, Units ▸ Dual Dimension Length, Show units for dual display
 * and the position): the main text with the value in the second unit beside, above or below it. `mm` is the value in
 * millimetres; `on` the dimension's own Dual Dimension box (the document option turns it on for all).
 */
export function withDual(text: string, mm: number, decimals: number, on = false): string {
  if (!text || !(on || getPref('doc.dualDims') === true)) return text;
  const u = DUAL_UNITS[String(getPref('doc.dualLengthUnit'))] ?? DUAL_UNITS.inches;
  const dual = `[${formatNumber(mm * u.k, u.k < 1 ? Math.max(2, decimals + 1) : decimals)}${getPref('doc.dualUnitsInPlace') === true ? u.s : ''}]`;
  const pos = String(getPref('doc.dualPosition'));
  if (pos === 'Top') return `${dual}\n${text}`;
  if (pos === 'Bottom') return `${text}\n${dual}`;
  if (pos === 'Left') return `${dual} ${text}`;
  return `${text} ${dual}`;
}

/** Drafting Standard ▸ All uppercase for dimensions, keeping the words of the exclusion list (mm, deg …) as typed */
export function uppercaseDims(text: string, own = false): string {
  if (!(own || getPref('doc.upperDims') === true)) return text;
  let out = text.toUpperCase();
  const words = String(getPref('doc.exclusionList') || 'm;mm;cm;km;um;μm;nm;s;Hz;Pa;kPa;MPa;GPa;N;kN;mN;rad;deg;').split(';').map((w) => w.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  for (const w of words) out = out.replace(new RegExp(`(?<![A-Za-z])${w.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'g'), w);
  return out;
}

export type ArrowStyle = 'filled' | 'open' | 'dot' | 'slash';
/** Dimensions ▸ Arrows: the style of a dimension that has none of its own */
export const defaultArrowStyle = (): ArrowStyle => (({ Filled: 'filled', Open: 'open', Dot: 'dot', Slash: 'slash' } as const)[String(getPref('doc.arrowStyle')) as 'Filled'] ?? 'filled');

/**
 * Dimensions ▸ Arrows Height / Width / Length as screen sizes of the arrow head: the default 1 × 3 mm head is 8 px
 * long and 5.6 px wide; Length scales the stub of arrows placed outside the extension lines (default 6 mm).
 */
export function arrowSize(base = 8): { length: number; halfWidth: number; stubScale: number } {
  const h = Number(getPref('doc.arrowHeight')) || 1, w = Number(getPref('doc.arrowWidth')) || 3, l = Number(getPref('doc.arrowLength')) || 6;
  return { length: base * (w / 3), halfWidth: base * 0.35 * h, stubScale: l / 6 };
}

/** Dimensions ▸ Text ▸ Font: the CSS font of the dimension text */
export const dimFontFamily = (): string => `'${String(getPref('doc.dimFont') || 'Century Gothic')}', 'Segoe UI', Arial, sans-serif`;

/* ---------- Drawing tables and hatching (Document Properties ▸ Tables, ▸ Material Properties; Drawings ▸ Area Hatch/Fill) */

/** Annotations ▸ Text ▸ Font: the font of notes and symbols on a drawing */
export const annotationFont = (): string => `${String(getPref('doc.annotationFont') || 'Century Gothic')}, Arial, sans-serif`;

/** Drafting Standard ▸ All uppercase for notes: the note text in capitals, the exclusion list kept */
export const noteText = (text: string): string => (getPref('doc.upperNotes') === true ? uppercaseDims(text, true) : text);

/** Drafting Standard ▸ All uppercase for tables: the cell text in capitals, the exclusion list kept */
export const tableText = (text: string): string => (getPref('doc.upperTables') === true ? uppercaseDims(text, true) : text);

/** Tables ▸ Text ▸ Font */
export const tableFont = (): string => `${String(getPref('doc.tableFont') || 'Century Gothic')}, Arial, sans-serif`;

/** Tables ▸ Border / Grid: the line widths on the sheet (the default 0.18 mm is 0.9 px for the border, 0.5 px inside) */
export function tableLine(border: boolean): number {
  const mmOf = (key: string) => parseFloat(String(getPref(key))) || 0.18;
  return border ? 0.9 * (mmOf('doc.tableBorder') / 0.18) : 0.5 * (mmOf('doc.tableGrid') / 0.18);
}

export interface HatchSpec { fill: 'none' | 'solid' | 'hatch'; spacing: number; angle: number; lines: { at: number; dash?: string }[] }
/** the hatch lines of each pattern within one period (fractions of the spacing; ANSI32 a double line, ANSI33 every other one dashed …) */
const HATCH_LINES: Record<string, { at: number; dash?: string }[]> = {
  'ANSI32 (Steel)': [{ at: 0 }, { at: 0.25 }],
  'ANSI33 (Bronze Brass Copper)': [{ at: 0 }, { at: 0.5, dash: '3 1.5' }],
  'ANSI34 (Plastic Rubber)': [{ at: 0 }, { at: 0.2 }, { at: 0.4 }],
  'ANSI35 (Fire Brick Refractory)': [{ at: 0 }, { at: 0.5, dash: '1 1' }],
};
/**
 * The hatch of a section (Document Properties ▸ Material Properties ▸ Area hatch/fill) or of an Area Hatch
 * (System Options ▸ Drawings ▸ Area Hatch/Fill): None, Solid or a pattern with its scale and angle.
 */
export function hatchSpec(kind: 'section' | 'area', base = 2.5): HatchSpec {
  const k = kind === 'section' ? { fill: 'doc.hatchKind', pattern: 'doc.hatchPattern', scale: 'doc.hatchScale', angle: 'doc.hatchAngle' } : { fill: 'drawings.hatch', pattern: 'drawings.hatchPattern', scale: 'drawings.hatchScale', angle: 'drawings.hatchAngle' };
  const f = String(getPref(k.fill));
  const scale = Number(getPref(k.scale)) > 0 ? Number(getPref(k.scale)) : 1;
  return { fill: f === 'None' ? 'none' : f === 'Solid' ? 'solid' : 'hatch', spacing: base * scale, angle: 45 + (Number(getPref(k.angle)) || 0), lines: HATCH_LINES[String(getPref(k.pattern))] ?? [{ at: 0 }] };
}
