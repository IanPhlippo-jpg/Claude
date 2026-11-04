import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rebuildDocument } from './rebuild';
import { setBrepKernel, type BrepKernel } from './brepKernel';
import { occtKernel } from '../occt/brep';
import { edgeRef } from './edgesets';
import { meshVolume } from './solid';
import { shapeMismatch } from './volumeCheck';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Document } from '../document/types';
import { rect } from '../../qa/qaModels';

/**
 * Edge flanges and hems on both kernels against the formulas (QA 0.5.11 F197): the exact (B-rep) body must be the
 * formula volume within 1e-3 mm³, the faceted one the same within its chords (0.5 %), the two surfaces within the
 * tessellation (shapeMismatch null), and no fallback to the mesh. A disagreement that is left is said on the feature.
 */
let kernel: ReturnType<typeof occtKernel>;
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  const replicad = await import('replicad');
  replicad.setOC(OC as never);
  kernel = occtKernel(OC, replicad);
}, 60000);
afterAll(() => setBrepKernel(null));

const T = 2, R = 3, K = 0.5;
type Edge = ReturnType<typeof rebuildDocument>['bodies'][number]['edges'][number];
type Relief = 'rectangle' | 'tear' | 'obround';

/** a 60 x 40 x 2 tab (closed sketch on the top plane) */
function tab(relief?: Relief): Document {
  const doc = createDocument();
  doc.sheetMetal = { thickness: T, bendRadius: R, kFactor: K, ...(relief ? { reliefType: relief } : {}) } as never;
  doc.sketches.s1 = rect('s1', 'top', 0, 0, 60, 40);
  doc.features.push({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false } as never);
  return doc;
}
/** an L sheet from an open chain (legs 60 and 30 to the outer sharp, 40 deep) */
function lsheet(): Document {
  const doc = createDocument();
  doc.sheetMetal = { thickness: T, bendRadius: R, kFactor: K } as never;
  doc.sketches.s1 = addLine(addLine(createSketch('s1', 's1', 'front'), { x: 0, y: 0 }, { x: 60, y: 0 })[0], { x: 60, y: 0 }, { x: 60, y: 30 })[0];
  doc.features.push({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 40, midPlane: false, reverse: false } as never);
  return doc;
}
const TAB = 60 * 40 * T;
const LSHEET = 40 * ((60 - R - T) * T + (30 - R - T) * T + (Math.PI / 4) * ((R + T) ** 2 - R ** 2));
const topLong = (es: Edge[]) => es.filter((x) => x.straight && Math.abs(x.length - 60) < 1e-3).sort((a, b) => b.centroid.y - a.centroid.y || a.centroid.z - b.centroid.z)[0];

/** the formula volume of a flange of angle a (deg), inner radius r, straight leg `leg`, width w, with its trim and reliefs */
function formula(base: number, o: { a: number; r: number; leg: number; w: number; setback: number; reliefs?: { relief: Relief; n: number } }): number {
  const th = (o.a * Math.PI) / 180;
  let v = base - o.setback * T * o.w + o.w * ((th / 2) * ((o.r + T) ** 2 - o.r ** 2) + o.leg * T);
  if (o.reliefs) {
    // the notch behind each inner end of the bend: width rw, depth rd from the edge, through the sheet (+ the obround's round end)
    const tear = o.reliefs.relief === 'tear', rw = tear ? 0.2 : 0.5 * T, e = 0.05;
    const rd = o.r + T + (tear ? 0 : rw / 2) + o.setback;
    let area = rw * rd;
    if (o.reliefs.relief === 'obround') { const h = rw / 2; area += h * h * Math.acos(e / h) - e * Math.sqrt(h * h - e * e); }
    v -= o.reliefs.n * area * T;
  }
  return v;
}
const ossb = (a: number, r = R) => (r + T) * Math.tan((a * Math.PI) / 360);

/** both kernels: the exact volume equals the formula, the faceted one within its chords, the surfaces agree */
function check(label: string, doc: Document, pick: (es: Edge[]) => Edge | undefined, extra: Record<string, unknown>, expected: number) {
  setBrepKernel(null);
  const e = pick(rebuildDocument(doc).bodies[0].edges);
  expect(e, label).toBeDefined();
  doc.features.push({ id: 'ef', name: 'Flange1', suppressed: false, edge: edgeRef(e!), ...extra } as never);
  const mesh = rebuildDocument(doc);
  setBrepKernel(kernel);
  const r = rebuildDocument(doc);
  expect(mesh.errors, `${label} mesh`).toEqual({});
  expect(r.errors, `${label} exact`).toEqual({});
  expect(r.warnings ?? {}, `${label}: ${JSON.stringify(r.warnings)}`).toEqual({});
  expect(r.bodies[0].exact, label).toBe(true);
  expect(Math.abs(r.bodies[0].exactVolume! - expected), `${label}: exact ${r.bodies[0].exactVolume} vs ${expected}`).toBeLessThan(1e-3);
  const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
  expect(Math.abs(mv - expected) / expected, `${label}: faceted ${mv} vs ${expected}`).toBeLessThan(0.005);
  { const sm = shapeMismatch(mesh.bodies[0].geometry, r.bodies[0].geometry); expect(sm, `${label}: ${sm}`).toBeNull(); }
}

describe('edge flanges and hems on both kernels against the formulas', { timeout: 120000 }, () => {
  it('edge flanges 90 / 120 / 45 degrees, Material Inside / Outside / Bend Outside, both directions', () => {
    for (const a of [90, 120, 45]) for (const position of ['materialInside', 'materialOutside', 'bendOutside']) for (const flip of [false, true]) {
      const sb = position === 'materialInside' ? ossb(a) : 0;
      check(`${a} ${position}${flip ? ' flipped' : ''}`, tab(), topLong, { type: 'edgeFlange', angle: a, length: 20, lengthMode: 'outerSharp', position, flip }, formula(TAB, { a, r: R, leg: 20 - ossb(a), w: 60, setback: sb }));
    }
  });

  it('hems open and closed, Material Inside / Outside, both directions', () => {
    for (const hemType of ['closed', 'open']) for (const position of ['materialInside', 'materialOutside']) for (const flip of [false, true]) {
      const r = hemType === 'open' ? 1 : 0.01; // open: half the gap of 2; closed: an (almost) zero radius
      check(`hem ${hemType} ${position}${flip ? ' flipped' : ''}`, tab(), topLong, { type: 'hem', hemType, length: 10, gap: 2, position, flip }, formula(TAB, { a: 180, r, leg: 10, w: 60, setback: position === 'materialInside' ? r + T : 0 }));
    }
  });

  it('flanges narrower than the edge: reliefs (rectangle, tear, obround), a gap, a hem with offsets', () => {
    for (const relief of ['rectangle', 'tear', 'obround'] as const) for (const position of ['materialInside', 'materialOutside']) {
      const sb = position === 'materialInside' ? ossb(90) : 0;
      check(`relief ${relief} ${position}`, tab(relief), topLong, { type: 'edgeFlange', angle: 90, length: 20, lengthMode: 'outerSharp', position, flip: false, startOffset: 5, endOffset: 8 }, formula(TAB, { a: 90, r: R, leg: 20 - ossb(90), w: 47, setback: sb, reliefs: { relief, n: 2 } }));
    }
    check('gap 3', tab(), topLong, { type: 'edgeFlange', angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialInside', flip: false, gap: 3 }, formula(TAB, { a: 90, r: R, leg: 20 - ossb(90), w: 57, setback: ossb(90) }));
    check('hem with offsets', tab('rectangle'), topLong, { type: 'hem', hemType: 'closed', length: 10, gap: 0, position: 'materialInside', flip: false, startOffset: 5, endOffset: 5 }, formula(TAB, { a: 180, r: 0.01, leg: 10, w: 50, setback: 0.01 + T, reliefs: { relief: 'rectangle', n: 2 } }));
  });

  it('on an L sheet: every end edge (outer and inner face, both ends) takes the face the edge lies on', () => {
    const at = (fx: (e: Edge) => boolean) => (es: Edge[]) => es.find((x) => x.straight && Math.abs(x.length - 40) < 1e-3 && fx(x));
    const ends: [string, (es: Edge[]) => Edge | undefined][] = [
      ['upright, outer face', at((e) => e.centroid.y > 29 && Math.abs(e.centroid.x - 60) < 1e-3)],
      ['upright, inner face', at((e) => e.centroid.y > 29 && Math.abs(e.centroid.x - 58) < 1e-3)],
      ['base, outer face', at((e) => Math.abs(e.centroid.x) < 1e-3 && Math.abs(e.centroid.y) < 1e-3)],
      ['base, inner face', at((e) => Math.abs(e.centroid.x) < 1e-3 && Math.abs(e.centroid.y - 2) < 1e-3)],
    ];
    for (const [name, pick] of ends) {
      check(`L ${name}, flange`, lsheet(), pick, { type: 'edgeFlange', angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialInside', flip: false }, formula(LSHEET, { a: 90, r: R, leg: 20 - ossb(90), w: 40, setback: ossb(90) }));
      check(`L ${name}, hem`, lsheet(), pick, { type: 'hem', hemType: 'open', length: 10, gap: 2, position: 'materialOutside', flip: false }, formula(LSHEET, { a: 180, r: 1, leg: 10, w: 40, setback: 0 }));
    }
  });

  it('a disagreement left between the kernels is said on the flange, not hidden behind the general faceted note', () => {
    // a kernel that measures the exact flange 10 % short: the faceted result is kept and the feature says why
    const short: BrepKernel = { ...kernel, volume: (s) => kernel.volume(s) * 0.9 };
    const doc = tab();
    setBrepKernel(null);
    const e = topLong(rebuildDocument(doc).bodies[0].edges);
    doc.features.push({ id: 'ef', type: 'edgeFlange', name: 'Edge-Flange1', suppressed: false, edge: edgeRef(e), angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialInside', flip: false } as never);
    setBrepKernel(short);
    const r = rebuildDocument(doc);
    setBrepKernel(kernel);
    expect(r.errors).toEqual({});
    expect(r.bodies[0].exact).toBeFalsy();
    expect(r.warnings?.ef).toMatch(/^Warning: B-rep and mesh disagree on this flange \(exact [\d.]+ vs faceted [\d.]+ mm³\); the faceted result is kept/);
  });
});
