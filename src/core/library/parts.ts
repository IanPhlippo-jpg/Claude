/**
 * Standard Parts: the catalog of the library. Every part is an ordinary part document (sketches and features, built in
 * partBuilders.ts), so the normal rebuild builds it and it can be opened, edited and inserted like any part. A part is
 * chosen by its standard, its size and (screws and pins) its nominal length; its name is the designation of the
 * standard, which the component and the BOM show.
 */
import type { Document } from '../document/types';
import {
  ISO10642, ISO4017, ISO4026, ISO4032, ISO4762, ISO7040, ISO7089, ISO7380, LIBRARY_SIZES, lengthsOf, screwLengths, SET_SCREW_LENGTHS,
  THREAD, type LibrarySize,
} from './iso';
import { BEARINGS, DIN471, DIN472, ISO2338, ISO8752, pinLengths } from './pinsRingsBearings';
import {
  buildBallBearing, buildButtonHeadScrew, buildCountersunkScrew, buildHexHeadScrew, buildHexNut, buildLockNut, buildParallelPin, buildPlainWasher,
  buildRetainingRing, buildSetScrew, buildSocketHeadCapScrew, buildSpringPin,
} from './partBuilders';

export { axisProfile, screwChamfers } from './partBuilders';

export type StandardId = 'iso4762' | 'iso4017' | 'iso7380' | 'iso10642' | 'iso4026' | 'iso4032' | 'iso7040' | 'iso7089' | 'iso2338' | 'iso8752' | 'din471' | 'din472' | 'iso15';
export type LibraryFolder = 'Bolts and Screws' | 'Nuts' | 'Washers' | 'Pins' | 'Retaining Rings' | 'Bearings';

export interface StandardPartSpec {
  standard: StandardId;
  /** M size (fasteners), nominal diameter (pins, rings) or designation (bearings) */
  size: string;
  /** nominal length (screws and pins only) */
  length?: number;
}

interface StandardDef {
  id: StandardId;
  label: string;
  folder: LibraryFolder;
  sizes: string[];
  /** the nominal lengths of a size; absent for parts without a length */
  lengths?: (size: string) => number[];
  name: (size: string, l: number) => string;
  dims: (size: string, l: number) => Record<string, number>;
  build: (name: string, size: string, l: number) => Document;
}

const M = (size: string) => size as LibrarySize;
const sizesOf = (table: Partial<Record<LibrarySize, unknown>>) => LIBRARY_SIZES.filter((z) => table[z]) as string[];
const thread = (size: string) => ({ d: THREAD[M(size)].d, P: THREAD[M(size)].P });
const withoutRange = <T extends { lmin: number; lmax: number }>(row: T) => {
  const { lmin: _a, lmax: _b, ...rest } = row;
  return rest;
};

const DEFS: StandardDef[] = [
  {
    id: 'iso4762', label: 'Socket Head Cap Screw ISO 4762', folder: 'Bolts and Screws', sizes: [...LIBRARY_SIZES], lengths: (z) => screwLengths(M(z)),
    name: (z, l) => `ISO 4762 ${z} x ${l}`,
    dims: (z, l) => { const t = ISO4762[M(z)]; return { ...thread(z), l, dk: t.dk, k: t.k, s: t.s, t: t.t, b: t.b }; },
    build: (n, z, l) => buildSocketHeadCapScrew(n, M(z), l),
  },
  {
    id: 'iso4017', label: 'Hex Head Screw ISO 4017', folder: 'Bolts and Screws', sizes: [...LIBRARY_SIZES], lengths: (z) => lengthsOf(ISO4017, z),
    name: (z, l) => `ISO 4017 ${z} x ${l}`,
    dims: (z, l) => ({ ...thread(z), l, ...withoutRange(ISO4017[M(z)]) }),
    build: (n, z, l) => buildHexHeadScrew(n, M(z), l),
  },
  {
    id: 'iso7380', label: 'Button Head Socket Screw ISO 7380-1', folder: 'Bolts and Screws', sizes: sizesOf(ISO7380), lengths: (z) => lengthsOf(ISO7380, z),
    name: (z, l) => `ISO 7380-1 ${z} x ${l}`,
    dims: (z, l) => ({ ...thread(z), l, ...withoutRange(ISO7380[M(z)]!) }),
    build: (n, z, l) => buildButtonHeadScrew(n, M(z), l),
  },
  {
    id: 'iso10642', label: 'Countersunk Socket Screw ISO 10642', folder: 'Bolts and Screws', sizes: sizesOf(ISO10642), lengths: (z) => lengthsOf(ISO10642, z),
    name: (z, l) => `ISO 10642 ${z} x ${l}`,
    dims: (z, l) => ({ ...thread(z), l, ...withoutRange(ISO10642[M(z)]!) }),
    build: (n, z, l) => buildCountersunkScrew(n, M(z), l),
  },
  {
    id: 'iso4026', label: 'Set Screw, Flat Point ISO 4026', folder: 'Bolts and Screws', sizes: [...LIBRARY_SIZES], lengths: (z) => lengthsOf(ISO4026, z, SET_SCREW_LENGTHS),
    name: (z, l) => `ISO 4026 ${z} x ${l}`,
    dims: (z, l) => ({ ...thread(z), l, ...withoutRange(ISO4026[M(z)]) }),
    build: (n, z, l) => buildSetScrew(n, M(z), l),
  },
  {
    id: 'iso4032', label: 'Hex Nut ISO 4032 (style 1)', folder: 'Nuts', sizes: [...LIBRARY_SIZES],
    name: (z) => `ISO 4032 ${z}`, dims: (z) => ({ ...thread(z), ...ISO4032[M(z)] }), build: (n, z) => buildHexNut(n, M(z)),
  },
  {
    id: 'iso7040', label: 'Nylon Insert Lock Nut ISO 7040', folder: 'Nuts', sizes: [...LIBRARY_SIZES],
    name: (z) => `ISO 7040 ${z}`, dims: (z) => ({ ...thread(z), s: ISO4032[M(z)].s, h: ISO7040[M(z)].h, m: ISO4032[M(z)].m, dw: ISO4032[M(z)].dw }),
    build: (n, z) => buildLockNut(n, M(z)),
  },
  {
    id: 'iso7089', label: 'Plain Washer ISO 7089 (normal series)', folder: 'Washers', sizes: [...LIBRARY_SIZES],
    name: (z) => `ISO 7089 ${z.slice(1)} - 200 HV`, dims: (z) => ({ ...ISO7089[M(z)] }), build: (n, z) => buildPlainWasher(n, M(z)),
  },
  {
    id: 'iso2338', label: 'Parallel Pin ISO 2338 (m6)', folder: 'Pins', sizes: Object.keys(ISO2338), lengths: (z) => pinLengths(ISO2338, z),
    name: (z, l) => `ISO 2338 ${z} m6 x ${l}`, dims: (z, l) => ({ l, ...withoutRange(ISO2338[z]) }), build: (n, z, l) => buildParallelPin(n, z, l),
  },
  {
    id: 'iso8752', label: 'Spring Pin ISO 8752 (heavy duty)', folder: 'Pins', sizes: Object.keys(ISO8752), lengths: (z) => pinLengths(ISO8752, z),
    name: (z, l) => `ISO 8752 ${z} x ${l}`, dims: (z, l) => ({ l, ...withoutRange(ISO8752[z]) }), build: (n, z, l) => buildSpringPin(n, z, l),
  },
  {
    id: 'din471', label: 'Retaining Ring for Shafts DIN 471', folder: 'Retaining Rings', sizes: Object.keys(DIN471),
    name: (z) => `DIN 471 ${z} x ${DIN471[z].s}`, dims: (z) => ({ ...DIN471[z] }), build: (n, z) => buildRetainingRing(n, 'shaft', z),
  },
  {
    id: 'din472', label: 'Retaining Ring for Bores DIN 472', folder: 'Retaining Rings', sizes: Object.keys(DIN472),
    name: (z) => `DIN 472 ${z} x ${DIN472[z].s}`, dims: (z) => ({ ...DIN472[z] }), build: (n, z) => buildRetainingRing(n, 'bore', z),
  },
  {
    id: 'iso15', label: 'Deep Groove Ball Bearing 60, 62 (ISO 15)', folder: 'Bearings', sizes: Object.keys(BEARINGS),
    name: (z) => `Ball Bearing ${z}`, dims: (z) => ({ ...BEARINGS[z] }), build: (n, z) => buildBallBearing(n, z),
  },
];

const BY_ID = new Map(DEFS.map((d) => [d.id, d]));
const def = (id: StandardId): StandardDef => BY_ID.get(id)!;

/** the standards of the library, grouped as the library folders show them */
export const STANDARDS: { id: StandardId; label: string; folder: LibraryFolder }[] = DEFS.map(({ id, label, folder }) => ({ id, label, folder }));
export const LIBRARY_FOLDERS: LibraryFolder[] = ['Bolts and Screws', 'Nuts', 'Washers', 'Pins', 'Retaining Rings', 'Bearings'];

/** the sizes a standard defines */
export const standardSizes = (id: StandardId): string[] => def(id).sizes;
/** the nominal lengths of a size (empty for a part without a length or a size the standard does not define) */
export const standardLengths = (id: StandardId, size: string): number[] => (def(id).sizes.includes(size) ? def(id).lengths?.(size) ?? [] : []);
const lengthOf = (p: StandardPartSpec) => p.length ?? standardLengths(p.standard, p.size)[0] ?? 0;

/** the designation of the part, as its file and component name */
export function standardPartName(p: StandardPartSpec): string {
  return def(p.standard).name(p.size, lengthOf(p));
}

/** every part of the library: each size of each standard in each of its nominal lengths */
export function standardPartCatalog(): StandardPartSpec[] {
  const out: StandardPartSpec[] = [];
  for (const d of DEFS) {
    for (const size of d.sizes) {
      if (d.lengths) for (const length of d.lengths(size)) out.push({ standard: d.id, size, length });
      else out.push({ standard: d.id, size });
    }
  }
  return out;
}

/** the main dimensions of the part from the standard's table (shown in the library, checked by the tests) */
export function standardPartDimensions(p: StandardPartSpec): Record<string, number> {
  return def(p.standard).dims(p.size, lengthOf(p));
}

/** the part document of a library entry */
export function standardPart(p: StandardPartSpec): Document {
  return def(p.standard).build(standardPartName(p), p.size, lengthOf(p));
}

/** ISO 4762 socket head cap screw M(d) x l (the screw Auto Fasteners puts in a clearance hole) */
export const socketHeadCapScrew = (size: LibrarySize, length: number): Document => standardPart({ standard: 'iso4762', size, length });
/** ISO 4032 hexagon nut M(d) */
export const hexNut = (size: LibrarySize): Document => standardPart({ standard: 'iso4032', size });
/** ISO 7089 plain washer for M(d) */
export const plainWasher = (size: LibrarySize): Document => standardPart({ standard: 'iso7089', size });
