/**
 * Standard Parts: dimension tables of the open ISO standards for metric fasteners (M3 to M12), taken from the published
 * tables of the standards themselves. All sizes in mm. The values are the nominal (or, where the standard gives only
 * limits, the maximum outline / minimum hole) dimensions that a simplified model needs.
 */

export const LIBRARY_SIZES = ['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'] as const;
export type LibrarySize = (typeof LIBRARY_SIZES)[number];

/** nominal diameter d and coarse thread pitch P (ISO 261 / ISO 262) */
export const THREAD: Record<LibrarySize, { d: number; P: number }> = {
  M3: { d: 3, P: 0.5 }, M4: { d: 4, P: 0.7 }, M5: { d: 5, P: 0.8 }, M6: { d: 6, P: 1 },
  M8: { d: 8, P: 1.25 }, M10: { d: 10, P: 1.5 }, M12: { d: 12, P: 1.75 },
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
};

/** the preferred nominal lengths l of ISO 4762 (and ISO 4014/4017), from 5 to 120 mm */
export const ISO4762_LENGTHS = [5, 6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110, 120];

/** the nominal lengths of ISO 4762 for one size (the range of the standard) */
export const screwLengths = (size: LibrarySize): number[] => ISO4762_LENGTHS.filter((l) => l >= ISO4762[size].lmin && l <= ISO4762[size].lmax);

/** ISO 4032 hexagon nut, style 1: across flats s, height m (max), across corners e (min), bearing face dw (min) */
export const ISO4032: Record<LibrarySize, { s: number; m: number; e: number; dw: number }> = {
  M3: { s: 5.5, m: 2.4, e: 6.01, dw: 4.6 },
  M4: { s: 7, m: 3.2, e: 7.66, dw: 5.9 },
  M5: { s: 8, m: 4.7, e: 8.79, dw: 6.9 },
  M6: { s: 10, m: 5.2, e: 11.05, dw: 8.9 },
  M8: { s: 13, m: 6.8, e: 14.38, dw: 11.6 },
  M10: { s: 16, m: 8.4, e: 17.77, dw: 14.6 },
  M12: { s: 18, m: 10.8, e: 20.03, dw: 16.6 },
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
};

export type ClearanceSeries = 'fine' | 'medium' | 'coarse';
export const CLEARANCE_SERIES: ClearanceSeries[] = ['fine', 'medium', 'coarse'];

/** ISO 273 clearance holes for bolts and screws: fine, medium and coarse series (M16 and M20 for the larger screws) */
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
  const ls = screwLengths(size);
  return ls.find((l) => l >= need - 1e-6) ?? ls[ls.length - 1];
}

export const isLibrarySize = (size: string): size is LibrarySize => (LIBRARY_SIZES as readonly string[]).includes(size);
