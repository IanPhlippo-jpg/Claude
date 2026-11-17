/**
 * Standard Parts: dimension tables of pins, retaining rings and deep groove ball bearings, taken from the published
 * tables of their standards. All sizes in mm; the size key is the nominal diameter (pins, rings: the shaft or bore
 * diameter d1) or the bearing designation. Fasteners are in iso.ts.
 */

const series = (from: number, to: number, list: number[]) => list.filter((l) => l >= from && l <= to);

/** the nominal lengths of ISO 2338 and ISO 8752 pins */
export const PIN_LENGTHS = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 120, 140, 160, 180, 200];

/** ISO 2338 parallel pin (unhardened steel, tolerance m6): nominal diameter d, end chamfer c (≈), range of lengths */
export const ISO2338: Record<string, { d: number; c: number; lmin: number; lmax: number }> = {
  '3': { d: 3, c: 0.5, lmin: 8, lmax: 30 },
  '4': { d: 4, c: 0.63, lmin: 8, lmax: 40 },
  '5': { d: 5, c: 0.8, lmin: 10, lmax: 50 },
  '6': { d: 6, c: 1.2, lmin: 12, lmax: 60 },
  '8': { d: 8, c: 1.6, lmin: 14, lmax: 80 },
  '10': { d: 10, c: 2, lmin: 18, lmax: 95 },
  '12': { d: 12, c: 2.5, lmin: 22, lmax: 140 },
  '16': { d: 16, c: 3, lmin: 26, lmax: 180 },
  '20': { d: 20, c: 3.5, lmin: 35, lmax: 200 },
};

/**
 * ISO 8752 slotted spring pin, heavy duty: nominal diameter d (the hole), outside diameter before fitting d1 (max), wall
 * thickness s, the range of lengths. The model is the pin as fitted in its hole (outside d).
 */
export const ISO8752: Record<string, { d: number; d1: number; s: number; lmin: number; lmax: number }> = {
  '3': { d: 3, d1: 3.5, s: 0.6, lmin: 4, lmax: 40 },
  '4': { d: 4, d1: 4.6, s: 0.8, lmin: 4, lmax: 50 },
  '5': { d: 5, d1: 5.6, s: 1, lmin: 5, lmax: 80 },
  '6': { d: 6, d1: 6.7, s: 1.2, lmin: 10, lmax: 100 },
  '8': { d: 8, d1: 8.8, s: 1.5, lmin: 10, lmax: 120 },
  '10': { d: 10, d1: 10.8, s: 2, lmin: 10, lmax: 160 },
  '12': { d: 12, d1: 12.8, s: 2.5, lmin: 10, lmax: 180 },
  '16': { d: 16, d1: 16.8, s: 3, lmin: 10, lmax: 200 },
  '20': { d: 20, d1: 20.9, s: 4, lmin: 10, lmax: 200 },
};

export const pinLengths = (table: Record<string, { lmin: number; lmax: number }>, size: string): number[] => {
  const row = table[size];
  return row ? series(row.lmin, row.lmax, PIN_LENGTHS) : [];
};

/**
 * DIN 471 retaining ring for shafts: shaft diameter d1, ring thickness s, inside diameter of the free ring d3, radial
 * width b (≈, as the standard gives it), groove diameter d2 and groove width m. The model is a plain split ring
 * (the lugs and their holes are left out).
 */
export const DIN471: Record<string, { d1: number; s: number; d3: number; b: number; d2: number; m: number }> = {
  '10': { d1: 10, s: 1, d3: 9.3, b: 1.8, d2: 9.6, m: 1.1 },
  '12': { d1: 12, s: 1, d3: 11, b: 1.8, d2: 11.5, m: 1.1 },
  '15': { d1: 15, s: 1, d3: 13.8, b: 2.2, d2: 14.3, m: 1.1 },
  '16': { d1: 16, s: 1, d3: 14.7, b: 2.2, d2: 15.2, m: 1.1 },
  '20': { d1: 20, s: 1.2, d3: 18.5, b: 2.6, d2: 19, m: 1.3 },
  '25': { d1: 25, s: 1.2, d3: 23.2, b: 3, d2: 23.9, m: 1.3 },
  '30': { d1: 30, s: 1.5, d3: 27.9, b: 3.5, d2: 28.6, m: 1.6 },
  '35': { d1: 35, s: 1.5, d3: 32.2, b: 3.9, d2: 33, m: 1.6 },
  '40': { d1: 40, s: 1.75, d3: 36.5, b: 4.4, d2: 37.5, m: 1.85 },
};

/**
 * DIN 472 retaining ring for bores: bore diameter d1, ring thickness s, outside diameter of the free ring d3, radial
 * width b (≈), groove diameter d2 and groove width m. The model is a plain split ring, as for DIN 471.
 */
export const DIN472: Record<string, { d1: number; s: number; d3: number; b: number; d2: number; m: number }> = {
  '12': { d1: 12, s: 1, d3: 13, b: 1.7, d2: 12.5, m: 1.1 },
  '16': { d1: 16, s: 1, d3: 17.3, b: 2, d2: 16.8, m: 1.1 },
  '20': { d1: 20, s: 1, d3: 21.5, b: 2.3, d2: 21, m: 1.1 },
  '25': { d1: 25, s: 1.2, d3: 26.9, b: 2.7, d2: 26.2, m: 1.3 },
  '30': { d1: 30, s: 1.2, d3: 32.1, b: 3, d2: 31.4, m: 1.3 },
  '35': { d1: 35, s: 1.5, d3: 37.8, b: 3.4, d2: 37, m: 1.6 },
  '40': { d1: 40, s: 1.75, d3: 43.5, b: 3.9, d2: 42.5, m: 1.85 },
};

/**
 * Deep groove ball bearings, series 60 and 62: the boundary dimensions of ISO 15 (bore d, outside diameter D, width B,
 * smallest chamfer r_s min). The model is one body: the two rings with the shields between them, a shallow recess on
 * each face, the corners r as 45° chamfers.
 */
export const BEARINGS: Record<string, { d: number; D: number; B: number; r: number }> = {
  '6000': { d: 10, D: 26, B: 8, r: 0.3 },
  '6001': { d: 12, D: 28, B: 8, r: 0.3 },
  '6002': { d: 15, D: 32, B: 9, r: 0.3 },
  '6003': { d: 17, D: 35, B: 10, r: 0.3 },
  '6004': { d: 20, D: 42, B: 12, r: 0.6 },
  '6005': { d: 25, D: 47, B: 12, r: 0.6 },
  '6006': { d: 30, D: 55, B: 13, r: 1 },
  '6007': { d: 35, D: 62, B: 14, r: 1 },
  '6008': { d: 40, D: 68, B: 15, r: 1 },
  '6009': { d: 45, D: 75, B: 16, r: 1 },
  '6010': { d: 50, D: 80, B: 16, r: 1 },
  '6200': { d: 10, D: 30, B: 9, r: 0.6 },
  '6201': { d: 12, D: 32, B: 10, r: 0.6 },
  '6202': { d: 15, D: 35, B: 11, r: 0.6 },
  '6203': { d: 17, D: 40, B: 12, r: 0.6 },
  '6204': { d: 20, D: 47, B: 14, r: 1 },
  '6205': { d: 25, D: 52, B: 15, r: 1 },
  '6206': { d: 30, D: 62, B: 16, r: 1 },
  '6207': { d: 35, D: 72, B: 17, r: 1.1 },
  '6208': { d: 40, D: 80, B: 18, r: 1.1 },
  '6209': { d: 45, D: 85, B: 19, r: 1.1 },
  '6210': { d: 50, D: 90, B: 20, r: 1.1 },
};

/** the bearing profile: the rings' lands at 30 % of the section from each side, the recess 5 % of the width deep */
export const bearingLands = (b: { d: number; D: number; B: number }) => {
  const w = (b.D - b.d) / 2;
  return { r1: b.d / 2 + 0.3 * w, r2: b.D / 2 - 0.3 * w, e: 0.05 * b.B };
};

/** the opening of a split ring (not given by the standard): a quarter of the nominal diameter */
export const ringGap = (d1: number) => 0.25 * d1;
/** the slot of a spring pin as fitted (not given by the standard): half the wall thickness */
export const springSlot = (s: number) => s / 2;
