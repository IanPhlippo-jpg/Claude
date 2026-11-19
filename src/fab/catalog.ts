/**
 * The profile catalogue of the workshop (docs/36 L-1, 3.3, 3.5): norm, shape, size, steel grade, kg/m, outer
 * perimeter (coating), section area and commercial lengths. The section geometry of the Frames feature stays in
 * src/core/features/weldments.ts (PROFILE_LIBRARY); an entry refers to it with `lib` where the feature has the size.
 *
 * kg/m: for hollow sections, flats and bars computed from the nominal section (EN 10219-2 corner radii: outside 2t up to
 * t = 6, 2.5t up to 10, 3t above; EN 10210-2: outside 1.5t, inside 1.0t) x 7850 kg/m³ (source "berekend"). For rolled
 * sections (UPN, IPE, angles) the table value is written down from memory and is AANNAME until it is checked against
 * the norm table (docs/36 R6): the drawn section of the Frames feature is simplified, so kg/m does not come from it.
 */
import type { Sourced } from './types';
import { PROFILE_LIBRARY, type ProfileType } from '../core/features/weldments';
import { START_DATUM } from './settings';

export type Vorm = 'koker' | 'buis' | 'platstaal' | 'vierkant' | 'rond' | 'hoekstaal' | 'UPN' | 'IPE';
/** the shape class the section analysis can tell apart */
export type SectieKlasse = 'rechthoekHol' | 'rondHol' | 'rechthoekVol' | 'rondVol' | 'open';

export interface StockProfile {
  id: string;
  norm: 'EN 10219' | 'EN 10210' | 'EN 10056' | 'EN 10279' | 'EN 10365' | 'EN 10058' | 'EN 10059' | 'EN 10060' | 'eigen';
  vorm: Vorm;
  klasse: SectieKlasse;
  /** NL name for the output: "Koker 40 x 40 x 3" */
  naam: string;
  maat: string;
  a: number;
  b: number;
  t: number;
  tf?: number;
  ro?: number;
  ri?: number;
  kwaliteit: string;
  kgPerM: Sourced<number>;
  /** outer perimeter, mm (coating area per metre) */
  omtrek: number;
  /** nominal section area, mm² */
  oppervlak: number;
  /** the same section drawn without corner radii (a model drawn simplified), mm² */
  oppervlakScherp: number;
  handelslengtes: number[];
  /** the Frames feature profile with this size */
  lib?: { type: ProfileType; size: string };
}

const STAAL = 7850e-9; // kg/mm³
const berekend = (A: number, how: string): Sourced<number> => ({ waarde: Math.round(A * STAAL * 1e3 * 1000) / 1000, eenheid: 'kg/m', bron: `berekend: ${how} x 7850 kg/m³`, aanname: false,
  datum: START_DATUM });
const tabel = (kg: number, norm: string): Sourced<number> => ({ waarde: kg, eenheid: 'kg/m', bron: `tabelwaarde ${norm}, uit het hoofd, niet nagekeken tegen de normtekst`, aanname: true,
  datum: START_DATUM });
const g = (x: number) => String(x).replace('.', ',');

/** hollow section area with outer / inner corner radius */
export const hollowArea = (a: number, b: number, t: number, ro: number, ri: number) => a * b - (a - 2 * t) * (b - 2 * t) - (4 - Math.PI) * (ro * ro - ri * ri);
export const pipeArea = (d: number, t: number) => (Math.PI / 4) * (d * d - (d - 2 * t) * (d - 2 * t));

function koker(a: number, b: number, t: number, hot = false, eigen = false): StockProfile {
  const [ko, ki] = hot ? [1.5, 1] : t <= 6 ? [2, 1] : t <= 10 ? [2.5, 1.5] : [3, 2];
  const ro = ko * t, ri = ki * t, A = hollowArea(a, b, t, ro, ri);
  const norm = hot ? 'EN 10210' : 'EN 10219';
  const sq = a === b;
  const lib = !hot && !eigen ? { type: (sq ? 'square tube' : 'rectangular tube') as ProfileType, size: `${a} x ${b} x ${t}` } : undefined;
  return {
    id: `${eigen ? 'eigen' : norm.replace(' ', '')}/${sq ? 'SHS' : 'RHS'}/${a}x${b}x${t}${hot ? '/H' : ''}`, norm: eigen ? 'eigen' : norm, vorm: 'koker', klasse: 'rechthoekHol',
    naam: `Koker ${g(a)} x ${g(b)} x ${g(t)}${hot ? ' (warm)' : ''}`, maat: `${a} x ${b} x ${t}`, a, b, t, ro, ri, kwaliteit: hot ? 'S235JRH' : 'S235JRH',
    kgPerM: berekend(A, `doorsnede ${norm}-2 met hoekstralen ${g(ro)}/${g(ri)}`), omtrek: 2 * (a + b) - (8 - 2 * Math.PI) * ro, oppervlak: A,
    oppervlakScherp: a * b - (a - 2 * t) * (b - 2 * t), handelslengtes: [6000], lib,
  };
}

function buis(d: number, t: number, eigen = false): StockProfile {
  const A = pipeArea(d, t);
  return {
    id: `${eigen ? 'eigen' : 'EN10219'}/CHS/${d}x${t}`, norm: eigen ? 'eigen' : 'EN 10219', vorm: 'buis', klasse: 'rondHol', naam: `Buis Ø${g(d)} x ${g(t)}`, maat: `${d} x ${t}`,
    a: d, b: d, t, kwaliteit: 'S235JRH', kgPerM: berekend(A, 'doorsnede'), omtrek: Math.PI * d, oppervlak: A, oppervlakScherp: A, handelslengtes: [6000],
    lib: [21.3, 26.9, 33.7, 48.3, 60.3].includes(d) ? { type: 'pipe', size: `${d} x ${t.toFixed(1)}` } : undefined,
  };
}

const plat = (a: number, t: number): StockProfile => ({
  id: `EN10058/FL/${a}x${t}`, norm: 'EN 10058', vorm: 'platstaal', klasse: 'rechthoekVol', naam: `Platstaal ${a} x ${t}`, maat: `${a} x ${t}`, a, b: t, t,
  kwaliteit: 'S235JR', kgPerM: berekend(a * t, 'doorsnede'), omtrek: 2 * (a + t), oppervlak: a * t, oppervlakScherp: a * t, handelslengtes: [6000],
});
const vierkant = (a: number): StockProfile => ({
  id: `EN10059/SQ/${a}`, norm: 'EN 10059', vorm: 'vierkant', klasse: 'rechthoekVol', naam: `Vierkant ${a}`, maat: `${a}`, a, b: a, t: a,
  kwaliteit: 'S235JR', kgPerM: berekend(a * a, 'doorsnede'), omtrek: 4 * a, oppervlak: a * a, oppervlakScherp: a * a, handelslengtes: [6000],
});
const rond = (d: number): StockProfile => ({
  id: `EN10060/RD/${d}`, norm: 'EN 10060', vorm: 'rond', klasse: 'rondVol', naam: `Rond Ø${d}`, maat: `${d}`, a: d, b: d, t: d / 2,
  kwaliteit: 'S235JR', kgPerM: berekend((Math.PI / 4) * d * d, 'doorsnede'), omtrek: Math.PI * d, oppervlak: (Math.PI / 4) * d * d, oppervlakScherp: (Math.PI / 4) * d * d, handelslengtes: [6000],
});
/** equal angle: area from the table kg/m (the drawn section has the root and toe radii of the Frames library) */
const hoek = (a: number, t: number, kg: number): StockProfile => ({
  id: `EN10056/L/${a}x${a}x${t}`, norm: 'EN 10056', vorm: 'hoekstaal', klasse: 'open', naam: `Hoekstaal ${a} x ${a} x ${t}`, maat: `${a} x ${a} x ${t}`, a, b: a, t,
  kwaliteit: 'S235JR', kgPerM: tabel(kg, 'EN 10056-1'), omtrek: 4 * a, oppervlak: kg / (STAAL * 1e3), oppervlakScherp: t * (2 * a - t), handelslengtes: [6000],
  lib: [25, 40, 50, 75].includes(a) ? { type: 'angle iron', size: `${a} x ${a} x ${t}` } : undefined,
});
/** UPN (EN 10279): drawn in the Frames library with parallel flanges of the mean thickness */
const upn = (h: number, b: number, tw: number, tf: number, kg: number): StockProfile => ({
  id: `EN10279/UPN/${h}`, norm: 'EN 10279', vorm: 'UPN', klasse: 'open', naam: `UPN ${h}`, maat: `${h}`, a: h, b, t: tw, tf,
  kwaliteit: 'S235JR', kgPerM: tabel(kg, 'EN 10279'), omtrek: 2 * h + 4 * b - 2 * tw, oppervlak: kg / (STAAL * 1e3), oppervlakScherp: h * tw + 2 * (b - tw) * tf, handelslengtes: [6000, 12000],
  lib: [80, 100, 120].includes(h) ? { type: 'c channel', size: `CH ${h} x ${h / 10}` } : undefined,
});
const ipe = (h: number, b: number, tw: number, tf: number, kg: number): StockProfile => ({
  id: `EN10365/IPE/${h}`, norm: 'EN 10365', vorm: 'IPE', klasse: 'open', naam: `IPE ${h}`, maat: `${h}`, a: h, b, t: tw, tf,
  kwaliteit: 'S235JR', kgPerM: tabel(kg, 'EN 10365'), omtrek: 2 * h + 4 * b - 2 * tw, oppervlak: kg / (STAAL * 1e3), oppervlakScherp: 2 * b * tf + (h - 2 * tf) * tw, handelslengtes: [6000, 12000],
  lib: [80, 100, 120, 160].includes(h) ? { type: 'sb beam', size: `IPE ${h}` } : undefined,
});

export const CATALOG: StockProfile[] = [
  ...[[20, 2], [25, 2], [30, 2], [30, 3], [40, 2], [40, 3], [40, 4], [50, 3], [50, 4], [50, 5], [60, 2], [60, 3], [60, 4], [60, 5], [70, 4], [70, 5], [80, 4], [80, 5], [80, 6],
    [100, 4], [100, 5], [100, 6], [100, 8], [120, 5], [120, 6], [120, 8]].map(([a, t]) => koker(a, a, t)),
  ...[[30, 20, 2], [40, 20, 2], [50, 30, 2.6], [50, 30, 3], [60, 40, 2], [60, 40, 3], [60, 40, 4], [70, 40, 5], [80, 40, 3], [80, 40, 4], [80, 40, 5], [100, 50, 4], [100, 50, 5],
    [120, 60, 4], [120, 60, 5], [120, 80, 5], [150, 100, 5]].map(([a, b, t]) => koker(a, b, t)),
  // sizes of the example models that are no common EN 10219 size (voorbeelden/lastafel): kept as own sizes
  koker(110, 50, 5, false, true), koker(110, 60, 5, false, true),
  // hot finished (EN 10210): the same outer size as a cold formed one, a different section and mass (docs/36 3.5)
  koker(40, 40, 3, true), koker(40, 40, 4, true), koker(60, 60, 5, true), koker(80, 80, 5, true), koker(100, 100, 5, true),
  ...[[21.3, 2.3], [26.9, 2.3], [33.7, 2.6], [33.7, 4], [42.4, 2.6], [42.4, 3.2], [48.3, 2.6], [48.3, 3.2], [48.3, 4], [60.3, 2.9], [60.3, 4], [76.1, 3.2], [76.1, 5],
    [88.9, 4], [88.9, 5], [101.6, 4], [101.6, 5], [114.3, 5]].map(([d, t]) => buis(d, t)),
  buis(80, 5, true), buis(90, 6, true), buis(60, 8, true), buis(50, 8, true),
  ...[20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150].flatMap((a) => [5, 6, 8, 10, 12, 15, 20, 25].filter((t) => t < a).map((t) => plat(a, t))),
  ...[10, 12, 16, 20, 25, 30, 40, 50].map(vierkant),
  ...[8, 10, 12, 16, 20, 25, 30, 40, 50, 60].map(rond),
  hoek(25, 3, 1.12), hoek(30, 3, 1.36), hoek(40, 4, 2.42), hoek(50, 5, 3.77), hoek(60, 6, 5.42), hoek(75, 8, 8.99), hoek(80, 8, 9.63), hoek(100, 10, 15.0),
  upn(80, 45, 6, 8, 8.64), upn(100, 50, 6, 8.5, 10.6), upn(120, 55, 7, 9, 13.4), upn(140, 60, 7, 10, 16.0), upn(160, 65, 7.5, 10.5, 18.8), upn(200, 75, 8.5, 11.5, 25.3),
  ipe(80, 46, 3.8, 5.2, 6.0), ipe(100, 55, 4.1, 5.7, 8.1), ipe(120, 64, 4.4, 6.3, 10.4), ipe(140, 73, 4.7, 6.9, 12.9), ipe(160, 82, 5, 7.4, 15.8), ipe(200, 100, 5.6, 8.5, 22.4),
];

// a link to the Frames library only where that library has the size
for (const p of CATALOG) if (p.lib && !PROFILE_LIBRARY.some((l) => l.standard === 'iso' && l.type === p.lib!.type && l.size === p.lib!.size)) delete p.lib;
const BY_ID = new Map(CATALOG.map((p) => [p.id, p]));
export const profileById = (id: string | undefined) => (id ? BY_ID.get(id) : undefined);

/** the catalogue entry of a Frames feature profile ("SQUARE TUBE 40 x 40 x 3" in the body meta) */
export function profileOfMember(description: string): StockProfile | undefined {
  return CATALOG.find((p) => p.lib && `${p.lib.type.toUpperCase()} ${p.lib.size}` === description);
}

/** commercial sheet thicknesses (EN 10029 / 10051 / 10131 practice), mm */
export const SHEET_THICKNESSES = [0.5, 0.6, 0.7, 0.8, 1, 1.2, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25, 30, 35, 40, 50];
export const isCommercialThickness = (t: number, tol = 0.02) => SHEET_THICKNESSES.some((x) => Math.abs(x - t) <= tol);

/** the material key of a sheet price from the part's material name ("S355, gepoedercoat zwart" -> S355) */
export function materialKey(name: string | undefined): string {
  const n = (name ?? '').toUpperCase();
  if (/S690/.test(n)) return 'S690QL';
  if (/S355/.test(n)) return 'S355';
  if (/S235|STAAL|STEEL|ST37/.test(n) && !/RVS|INOX|STAINLESS|AISI/.test(n)) return /SENDZIMIR|VERZINKT|DX51/.test(n) ? 'DX51D' : 'S235';
  if (/DX51|SENDZIMIR/.test(n)) return 'DX51D';
  if (/430/.test(n)) return 'RVS 430';
  if (/AISI|RVS|INOX|304|316|STAINLESS/.test(n)) return 'RVS 304';
  if (/ALU/.test(n)) return 'aluminium';
  return n.trim() ? n.split(',')[0].trim() : 'S235';
}
