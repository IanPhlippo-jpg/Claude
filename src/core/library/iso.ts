/**
 * Standard Parts: dimension tables of the open ISO standards for metric fasteners (M3 to M24, the first-choice sizes
 * each standard defines), taken from the published tables of the standards themselves. All sizes in mm. The values are
 * the nominal (or, where the standard gives only limits, the maximum outline / minimum hole) dimensions that a
 * simplified model needs. Pins, retaining rings and bearings are in pinsRingsBearings.ts.
 */

export const LIBRARY_SIZES = ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20', 'M24'] as const;
export type LibrarySize = (typeof LIBRARY_SIZES)[number];

/** nominal diameter d and coarse thread pitch P (ISO 261 / ISO 262) */
export const THREAD: Record<LibrarySize, { d: number; P: number }> = {
  M3: { d: 3, P: 0.5 }, M4: { d: 4, P: 0.7 }, M5: { d: 5, P: 0.8 }, M6: { d: 6, P: 1 }, M8: { d: 8, P: 1.25 },
  M10: { d: 10, P: 1.5 }, M12: { d: 12, P: 1.75 }, M16: { d: 16, P: 2 }, M20: { d: 20, P: 2.5 }, M24: { d: 24, P: 3 },
};

/**
 * ISO 4762 hexagon socket head cap screw: head diameter dk (max, plain head), head height k (max = d), socket across
 * flats s (nominal), socket depth t (min), reference thread length b and the range of nominal lengths of the standard.
 */
export const ISO4762: Record<LibrarySize, { dk: number; k: number; s: number; t: number; b: number; lmin: number; lmax: number }> = {
  M3: { dk: 5.5, k: 3, s: 2.5, t: 1.3, b: 18, lmin: 5, lmax: 30 },
  M4: { dk: 7, k: 4, s: 3, t: 2, b: 20, lmin: 6, lmax: 40 },
  M5: { dk: 8.5, k: 5, s: 4, t: 2.5, b: 22, lmin: 8, lmax: 50 },
  M6: { dk: 10, k: 6, s: 5, t: 3, b: 24, lmin: 10, lmax: 60 },
  M8: { dk: 13, k: 8, s: 6, t: 4, b: 28, lmin: 12, lmax: 80 },
  M10: { dk: 16, k: 10, s: 8, t: 5, b: 32, lmin: 16, lmax: 100 },
  M12: { dk: 18, k: 12, s: 10, t: 6, b: 36, lmin: 20, lmax: 120 },
  M16: { dk: 24, k: 16, s: 14, t: 8, b: 44, lmin: 25, lmax: 160 },
  M20: { dk: 30, k: 20, s: 17, t: 10, b: 52, lmin: 30, lmax: 200 },
  M24: { dk: 36, k: 24, s: 19, t: 12, b: 60, lmin: 40, lmax: 200 },
};

/** the preferred nominal lengths l of ISO 4762 (and ISO 4017, 7380-1, 10642), from 5 to 200 mm */
export const ISO4762_LENGTHS = [5, 6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200];

const inRange = (series: number[], lmin: number, lmax: number) => series.filter((l) => l >= lmin && l <= lmax);

/** the nominal lengths of ISO 4762 for one size (the range of the standard) */
export const screwLengths = (size: LibrarySize): number[] => inRange(ISO4762_LENGTHS, ISO4762[size].lmin, ISO4762[size].lmax);

/**
 * ISO 4017 hexagon head screw, fully threaded, product grade A: across flats s (max), head height k (nominal), across
 * corners e (min), bearing face dw (min); the lengths of grade A (l up to 10 d and 150 mm).
 */
export const ISO4017: Record<LibrarySize, { s: number; k: number; e: number; dw: number; lmin: number; lmax: number }> = {
  M3: { s: 5.5, k: 2, e: 6.01, dw: 4.57, lmin: 6, lmax: 30 },
  M4: { s: 7, k: 2.8, e: 7.66, dw: 5.88, lmin: 8, lmax: 40 },
  M5: { s: 8, k: 3.5, e: 8.79, dw: 6.88, lmin: 10, lmax: 50 },
  M6: { s: 10, k: 4, e: 11.05, dw: 8.88, lmin: 12, lmax: 60 },
  M8: { s: 13, k: 5.3, e: 14.38, dw: 11.63, lmin: 16, lmax: 80 },
  M10: { s: 16, k: 6.4, e: 17.77, dw: 14.63, lmin: 20, lmax: 100 },
  M12: { s: 18, k: 7.5, e: 20.03, dw: 16.63, lmin: 25, lmax: 120 },
  M16: { s: 24, k: 10, e: 26.75, dw: 22.49, lmin: 30, lmax: 150 },
  M20: { s: 30, k: 12.5, e: 33.53, dw: 28.19, lmin: 40, lmax: 150 },
  M24: { s: 36, k: 15, e: 39.98, dw: 33.61, lmin: 50, lmax: 150 },
};

/**
 * ISO 7380-1 hexagon socket button head screw (M3 to M16, the sizes of the standard): head diameter dk (max), head
 * height k (max), socket across flats s (nominal), socket depth t (min), the range of nominal lengths.
 */
export const ISO7380: Partial<Record<LibrarySize, { dk: number; k: number; s: number; t: number; lmin: number; lmax: number }>> = {
  M3: { dk: 5.7, k: 1.65, s: 2, t: 1.04, lmin: 6, lmax: 12 },
  M4: { dk: 7.6, k: 2.2, s: 2.5, t: 1.3, lmin: 8, lmax: 16 },
  M5: { dk: 9.5, k: 2.75, s: 3, t: 1.56, lmin: 10, lmax: 20 },
  M6: { dk: 10.5, k: 3.3, s: 4, t: 2.08, lmin: 10, lmax: 30 },
  M8: { dk: 14, k: 4.4, s: 5, t: 2.6, lmin: 10, lmax: 40 },
  M10: { dk: 17.5, k: 5.5, s: 6, t: 3.12, lmin: 16, lmax: 40 },
  M12: { dk: 21, k: 6.6, s: 8, t: 4.16, lmin: 20, lmax: 50 },
  M16: { dk: 28, k: 8.8, s: 10, t: 5.2, lmin: 25, lmax: 50 },
};

/**
 * ISO 10642 hexagon socket countersunk head screw (M3 to M20): theoretical head diameter dk (max, the sharp 90° cone),
 * head height k (max), socket across flats s (nominal), socket depth t (min), the range of nominal lengths (l is the
 * overall length, head included).
 */
export const ISO10642: Partial<Record<LibrarySize, { dk: number; k: number; s: number; t: number; lmin: number; lmax: number }>> = {
  M3: { dk: 6.72, k: 1.86, s: 2, t: 1.1, lmin: 8, lmax: 30 },
  M4: { dk: 8.96, k: 2.48, s: 2.5, t: 1.5, lmin: 8, lmax: 40 },
  M5: { dk: 11.2, k: 3.1, s: 3, t: 1.9, lmin: 8, lmax: 50 },
  M6: { dk: 13.44, k: 3.72, s: 4, t: 2.2, lmin: 8, lmax: 60 },
  M8: { dk: 17.92, k: 4.96, s: 5, t: 3, lmin: 10, lmax: 80 },
  M10: { dk: 22.4, k: 6.2, s: 6, t: 3.6, lmin: 12, lmax: 100 },
  M12: { dk: 26.88, k: 7.44, s: 8, t: 4.3, lmin: 20, lmax: 100 },
  M16: { dk: 33.6, k: 8.8, s: 10, t: 4.5, lmin: 30, lmax: 100 },
  M20: { dk: 40.32, k: 10.16, s: 12, t: 5.6, lmin: 35, lmax: 100 },
};

/** the nominal lengths of ISO 4026 set screws */
export const SET_SCREW_LENGTHS = [3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60];

/**
 * ISO 4026 hexagon socket set screw with flat point: socket across flats s (nominal), socket depth t (min, the longer
 * lengths), flat point diameter dp (max), the range of nominal lengths.
 */
export const ISO4026: Record<LibrarySize, { s: number; t: number; dp: number; lmin: number; lmax: number }> = {
  M3: { s: 1.5, t: 1.2, dp: 2, lmin: 3, lmax: 16 },
  M4: { s: 2, t: 1.5, dp: 2.5, lmin: 4, lmax: 20 },
  M5: { s: 2.5, t: 2, dp: 3.5, lmin: 5, lmax: 25 },
  M6: { s: 3, t: 2, dp: 4, lmin: 6, lmax: 30 },
  M8: { s: 4, t: 3, dp: 5.5, lmin: 8, lmax: 40 },
  M10: { s: 5, t: 4, dp: 7, lmin: 10, lmax: 50 },
  M12: { s: 6, t: 4.8, dp: 8.5, lmin: 12, lmax: 60 },
  M16: { s: 8, t: 6.4, dp: 12, lmin: 16, lmax: 60 },
  M20: { s: 10, t: 8, dp: 15, lmin: 20, lmax: 60 },
  M24: { s: 12, t: 10, dp: 18, lmin: 25, lmax: 60 },
};

/** ISO 4032 hexagon nut, style 1: across flats s, height m (max), across corners e (min), bearing face dw (min) */
export const ISO4032: Record<LibrarySize, { s: number; m: number; e: number; dw: number }> = {
  M3: { s: 5.5, m: 2.4, e: 6.01, dw: 4.6 },
  M4: { s: 7, m: 3.2, e: 7.66, dw: 5.9 },
  M5: { s: 8, m: 4.7, e: 8.79, dw: 6.9 },
  M6: { s: 10, m: 5.2, e: 11.05, dw: 8.9 },
  M8: { s: 13, m: 6.8, e: 14.38, dw: 11.6 },
  M10: { s: 16, m: 8.4, e: 17.77, dw: 14.6 },
  M12: { s: 18, m: 10.8, e: 20.03, dw: 16.6 },
  M16: { s: 24, m: 14.8, e: 26.75, dw: 22.5 },
  M20: { s: 30, m: 18, e: 32.95, dw: 27.7 },
  M24: { s: 36, m: 21.5, e: 39.55, dw: 33.3 },
};

/**
 * ISO 7040 prevailing torque hexagon nut with non-metallic insert, style 1: overall height h (max); the hexagon s and
 * the bearing face dw are those of ISO 4032, the wrenching height is taken as the ISO 4032 height m.
 */
export const ISO7040: Record<LibrarySize, { h: number }> = {
  M3: { h: 4.5 }, M4: { h: 6 }, M5: { h: 6.8 }, M6: { h: 8 }, M8: { h: 9.5 },
  M10: { h: 11.5 }, M12: { h: 14 }, M16: { h: 18 }, M20: { h: 22 }, M24: { h: 26.5 },
};

/** ISO 7089 plain washer, normal series (200 HV): hole d1 (min), outside d2 (max), thickness h (nominal) */
export const ISO7089: Record<LibrarySize, { d1: number; d2: number; h: number }> = {
  M3: { d1: 3.2, d2: 7, h: 0.5 },
  M4: { d1: 4.3, d2: 9, h: 0.8 },
  M5: { d1: 5.3, d2: 10, h: 1 },
  M6: { d1: 6.4, d2: 12, h: 1.6 },
  M8: { d1: 8.4, d2: 16, h: 1.6 },
  M10: { d1: 10.5, d2: 20, h: 2 },
  M12: { d1: 13, d2: 24, h: 2.5 },
  M16: { d1: 17, d2: 30, h: 3 },
  M20: { d1: 21, d2: 37, h: 3 },
  M24: { d1: 25, d2: 44, h: 4 },
};

export type ClearanceSeries = 'fine' | 'medium' | 'coarse';
export const CLEARANCE_SERIES: ClearanceSeries[] = ['fine', 'medium', 'coarse'];

/** ISO 273 clearance holes for bolts and screws: fine, medium and coarse series */
export const ISO273: Record<string, Record<ClearanceSeries, number>> = {
  M3: { fine: 3.2, medium: 3.4, coarse: 3.6 },
  M4: { fine: 4.3, medium: 4.5, coarse: 4.8 },
  M5: { fine: 5.3, medium: 5.5, coarse: 5.8 },
  M6: { fine: 6.4, medium: 6.6, coarse: 7 },
  M8: { fine: 8.4, medium: 9, coarse: 10 },
  M10: { fine: 10.5, medium: 11, coarse: 12 },
  M12: { fine: 13, medium: 13.5, coarse: 14.5 },
  M16: { fine: 17, medium: 17.5, coarse: 18.5 },
  M20: { fine: 21, medium: 22, coarse: 24 },
  M24: { fine: 25, medium: 26, coarse: 28 },
};

/**
 * The screw size for a clearance hole of diameter D (ISO 273): the largest screw whose fine, medium or coarse clearance
 * hole is not larger than D (Ø6.6 is the medium hole of M6, Ø9 the medium hole of M8, Ø7 the coarse hole of M6).
 * null when D is smaller than the fine hole of M3.
 */
export function sizeForClearanceHole(D: number): { size: string; series: ClearanceSeries; clearance: number } | null {
  let best: { size: string; series: ClearanceSeries; clearance: number } | null = null;
  for (const [size, row] of Object.entries(ISO273)) {
    for (const series of CLEARANCE_SERIES) {
      const c = row[series];
      if (c <= D + 0.05 && (!best || c > best.clearance)) best = { size, series, clearance: c };
    }
  }
  return best;
}

/** the length a screw needs through a clamped thickness (grip): a washer and a nut under it and two pitches beyond */
export function requiredScrewLength(size: string, grip: number, tapped = false): number {
  if (tapped) return grip;
  const z = size as LibrarySize;
  if (!THREAD[z]) return grip + parseFloat(size.slice(1));
  return grip + ISO7089[z].h + ISO4032[z].m + 2 * THREAD[z].P;
}

/** the shortest nominal length of ISO 4762 for the size that reaches the given length (the longest when none does) */
export function screwLengthFor(size: LibrarySize, need: number): number {
  return lengthFor(screwLengths(size), need);
}

/** the shortest length of a series that reaches the given length (the longest when none does) */
export function lengthFor(series: number[], need: number): number {
  return series.find((l) => l >= need - 1e-6) ?? series[series.length - 1];
}

/** the nominal lengths of a screw standard for one size (empty when the standard has no such size) */
export function lengthsOf(table: Partial<Record<LibrarySize, { lmin: number; lmax: number }>>, size: string, series = ISO4762_LENGTHS): number[] {
  const row = table[size as LibrarySize];
  return row ? inRange(series, row.lmin, row.lmax) : [];
}

export const isLibrarySize = (size: string): size is LibrarySize => (LIBRARY_SIZES as readonly string[]).includes(size);
