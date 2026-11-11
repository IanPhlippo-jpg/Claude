/**
 * Strict QA tests on the B-rep kernel (QA report 0.5.10, F152): the exact volume after a fillet must be the known
 * closed-form value to 0.01 mm³ (F140: a fillet on a split edge must round both pieces and nothing else).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { edgeRef } from '../core/features/edgesets';
import { meshVolume } from '../core/features/solid';
import { extrude, fillet, holeVariant, PI, rect, setCircleRadius, t1, T1_EXPECT, t3, t3Slot, T3_WITH_SLOT_EXPECT, TOP_FACE } from './qaModels';
import { addCircle, addConic, addEllipse, addEllipseArc, addLine, addSpline, createSketch } from '../core/sketch/model';
import { createDocument, type Document } from '../core/document/types';
import { sampleBezier, sampleCatmullRom, sampleConic, type Pt } from '../core/sketch/geometry';
import { shapesToStep, stepItems, stepToMeshes } from '../core/occt/step';
import { shapesToIges } from '../core/occt/iges';
import { checkIges } from '../core/occt/igesCheck';
import { kernelMismatch, shapeMismatch } from '../core/features/volumeCheck';

let kernel: ReturnType<typeof occtKernel>;
let rep: typeof import('replicad');
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  const replicad = await import('replicad');
  replicad.setOC(OC as never);
  rep = replicad;
  kernel = occtKernel(OC, replicad);
  setBrepKernel(kernel);
}, 60000);
afterAll(() => setBrepKernel(null));

const exact = (doc: Parameters<typeof rebuildDocument>[0]) => {
  const r = rebuildDocument(doc);
  expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
  expect(r.bodies[0].exact).toBe(true);
  return r.bodies[0].exactVolume!;
};

describe('QA T1 on the B-rep kernel', { timeout: 60000 }, () => {
  it('fillet R2 on the rim of a Ø35 hole is exact and follows the hole to Ø50', () => {
    const { doc, rim } = t1(17.5);
    doc.features.push(fillet('r1', 2, [rim]));
    expect(Math.abs(exact(doc) - T1_EXPECT(17.5))).toBeLessThan(0.01);
    setCircleRadius(doc, 's1', 25);
    expect(Math.abs(exact(doc) - T1_EXPECT(25))).toBeLessThan(0.01);
  });
  for (const how of ['cut', 'holeTool', 'bottomRim'] as const) {
    it(`the same on the rim of a hole made by ${how}`, () => {
      const { doc, rim } = holeVariant(how);
      doc.features.push(fillet('r1', 2, [rim]));
      expect(Math.abs(exact(doc) - T1_EXPECT(17.5))).toBeLessThan(0.01);
    });
  }
  it('an edge picked on the mesh body (its reference carries the face names) is found on the exact body', () => {
    setBrepKernel(null);
    const { doc, rim } = t1(17.5);
    setBrepKernel(kernel);
    doc.features.push({ id: 'r1', type: 'fillet', name: 'r1', suppressed: false, size: 2, edges: [edgeRef(rim)] } as never);
    expect(Math.abs(exact(doc) - T1_EXPECT(17.5))).toBeLessThan(0.01);
  });
});

describe('QA T1 as IGES 5.3 (F114/F199)', { timeout: 60000 }, () => {
  it('the plate with the R2 fillet on the hole rim: exact trimmed surfaces, read back within 1e-6 mm and 0.01 % area', async () => {
    const { doc, rim } = t1(17.5);
    doc.features.push(fillet('r1', 2, [rim]));
    const r = rebuildDocument(doc);
    expect(r.bodies[0].exact).toBe(true);
    const shape = r.brep![r.bodies[0].id];
    const out = await shapesToIges(rep, stepItems(r));
    expect(out.exact).toBe(1);
    expect(out.stats.approximatedSurfaces).toBe(0);
    expect(Math.abs(out.volumes[0] - T1_EXPECT(17.5))).toBeLessThan(0.01);
    const c = checkIges(rep.getOC(), shape, new TextDecoder().decode(out.bytes));
    expect(c.problems).toEqual([]);
    expect(c.entities[144]).toBe(c.faces);
    expect(c.surfaceDistance).toBeLessThan(1e-6);
    expect(c.trimExcess).toBeLessThan(1e-6);
    expect(c.flippedNormals).toBe(0);
    expect(Math.abs(c.areaRead - c.areaSource) / c.areaSource).toBeLessThan(1e-4);
  });
});

describe('QA T3 on the B-rep kernel', { timeout: 60000 }, () => {
  for (const slot of ['through', 'throughFromFace', 'blind5', 'stadium'] as const) {
    it(`a fillet on an edge split by a slot inserted before it rounds both pieces and nothing else (${slot}: ${T3_WITH_SLOT_EXPECT(slot).toFixed(2)} mm³)`, () => {
      const { doc, edge } = t3();
      doc.features.push(fillet('r1', 2, [edge]));
      t3Slot(doc, slot);
      doc.features.splice(1, 0, doc.features.pop()!);
      const v = exact(doc);
      expect(Math.abs(v - T3_WITH_SLOT_EXPECT(slot)), `${v.toFixed(3)} vs ${T3_WITH_SLOT_EXPECT(slot).toFixed(3)}`).toBeLessThan(0.01);
    });
  }
  it('the same with the edge picked on the mesh body', () => {
    setBrepKernel(null);
    const { doc, edge } = t3();
    setBrepKernel(kernel);
    doc.features.push({ id: 'r1', type: 'fillet', name: 'r1', suppressed: false, size: 2, edges: [edgeRef(edge)] } as never);
    t3Slot(doc, 'through');
    doc.features.splice(1, 0, doc.features.pop()!);
    expect(Math.abs(exact(doc) - T3_WITH_SLOT_EXPECT('through'))).toBeLessThan(0.01);
  });
});

describe('plastic part features on the B-rep kernel (QA F51/F121)', { timeout: 60000 }, () => {
  it('a Dome on a round pad is an exact sphere segment', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60);
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    let c = createSketch('s2', 's2', 'f1');
    doc.planes.f1 = TOP_FACE as never;
    c = addCircle(c, { x: 40, y: 30 }, 15)[0];
    doc.sketches.s2 = c;
    doc.features.push(extrude('e2', 's2', 'boss', 5));
    const b0 = rebuildDocument(doc).bodies[0];
    expect(b0.exact).toBe(true);
    // the top face of the pad: planar, at y = 15
    const face = b0.faces.find((f) => !f.curved && Math.abs(f.centroid[1] - 15) < 1e-3)!;
    doc.features.push({ id: 'd1', type: 'dome', name: 'Dome1', suppressed: false, face: { normal: face.normal, point: face.centroid }, distance: 6 } as never);
    const v = exact(doc);
    // a cap of height 6 on a circle of radius 15: sphere radius (15² + 6²) / 12 = 21.75
    const cap = (PI * 36 * (3 * 21.75 - 6)) / 3;
    expect(Math.abs(v - (80 * 60 * 10 + PI * 225 * 5 + cap))).toBeLessThan(0.01);
    // the tessellation of the exact body (what the viewport and the e2e measure) carries the dome too
    const shown = Math.abs(meshVolume(rebuildDocument(doc).bodies[0].geometry));
    expect(Math.abs(shown - v) / v, `tessellation ${shown.toFixed(1)} vs exact ${v.toFixed(1)}`).toBeLessThan(0.01);
    (doc.features[2] as { reverse?: boolean }).reverse = true;
    const v2 = exact(doc);
    expect(Math.abs(v2 - (80 * 60 * 10 + PI * 225 * 5 - cap))).toBeLessThan(0.01);
  });
});

describe('QA wrap on the B-rep kernel', { timeout: 60000 }, () => {
  // the e2e model (e2e/wrap.mjs): a Ø40 x 60 roll along Y, a 10 x 10 patch on the Front plane at y 25..35 wrapped on it
  const roll = (kind: 'emboss' | 'deboss') => {
    const s1 = addCircle(createSketch('s1', 's1', 'top'), { x: 0, y: 0 }, 20)[0];
    const s2 = rect('s2', 'front', -5, 25, 5, 35);
    const doc = { ...createDocument('Rol'), sketches: { s1, s2 } };
    doc.features = [
      { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false } as never,
      extrude('f1', 's1', 'boss', 60),
      { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false } as never,
      { id: 'w1', type: 'wrap', name: 'Wrap1', sketchId: 's2', suppressed: false, kind, depth: 2, face: { center: [0, 0, 0], axis: [0, 1, 0], radius: 20, label: 'Face<1>' } } as never,
    ];
    return doc;
  };
  const cylinder = PI * 20 * 20 * 60;
  // the patch is polyhedral: the body is honestly not called exact and the feature says so (QA 0.5.11 F175, P0-1);
  // its B-rep shape (kept for STEP) has the right volume: the roll exact, the patch within its facets
  const wrapped = (kind: 'emboss' | 'deboss') => {
    const r = rebuildDocument(roll(kind));
    expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
    expect(r.bodies[0].exact).toBe(false);
    expect(r.warnings?.w1 ?? '').toMatch(/made of flat facets/);
    return r.bodies[0].exactVolume!;
  };
  it('Emboss 2 mm: the wrapped patch is added (was 138 of 210 as a faceted body) and the body says it is faceted', () => {
    const add = (10 / 20) * ((22 * 22 - 20 * 20) / 2) * 10;
    expect(Math.abs(wrapped('emboss') - cylinder - add) / add).toBeLessThan(0.05);
  });
  it('STEP of the wrapped roll (QA 0.5.13, F204): the shape goes out, but it is not counted exact, so the export warns', async () => {
    const r = rebuildDocument(roll('emboss'));
    const out = await shapesToStep(rep, stepItems(r));
    expect(out.volumes).toHaveLength(1);
    expect(out.exact).toBe(0);
    expect(Math.abs(out.volumes[0] - r.bodies[0].exactVolume!)).toBeLessThan(1e-3);
  });
  it('IGES of the wrapped roll (QA F114/F199): written and read back, but not counted exact, as STEP', async () => {
    const r = rebuildDocument(roll('emboss'));
    const shape = r.brep![r.bodies[0].id];
    const out = await shapesToIges(rep, stepItems(r));
    expect(out.exact).toBe(0);
    const c = checkIges(rep.getOC(), shape, new TextDecoder().decode(out.bytes));
    expect(c.problems).toEqual([]);
    expect(c.surfaceDistance).toBeLessThan(1e-6);
    expect(Math.abs(c.areaRead - c.areaSource) / c.areaSource).toBeLessThan(1e-4);
  });
  it('Deboss 2 mm: the patch is cut (was 262 of 190) and the body says it is faceted', () => {
    const cut = (10 / 20) * ((20 * 20 - 18 * 18) / 2) * 10;
    expect(Math.abs(cylinder - wrapped('deboss') - cut) / cut).toBeLessThan(0.05);
  });
});

describe('QA F175: ellipses, splines and conics are exact curves on the B-rep kernel', { timeout: 60000 }, () => {
  const H = 10;
  type Sk = ReturnType<typeof createSketch>;
  /** a document with one sketch on Top extruded (boss) over H, or cut through an 80 x 60 plate */
  const extrudeOf = (build: (s: Sk) => Sk, plate = false): Document => {
    const doc = createDocument();
    if (plate) {
      doc.sketches.p = rect('p', 'top', -40, -30, 40, 30);
      doc.features.push(extrude('e0', 'p', 'boss', H));
    }
    doc.sketches.s1 = build(createSketch('s1', 's1', 'top'));
    doc.features.push(extrude('e1', 's1', plate ? 'cut' : 'boss', H, plate ? { end: 'throughAll' } : {}));
    return doc;
  };
  /** the area of a closed polygon (shoelace) */
  const area = (pts: Pt[]) => Math.abs(pts.reduce((acc, p, i) => { const q = pts[(i + 1) % pts.length]; return acc + p.x * q.y - q.x * p.y; }, 0)) / 2;
  const meshOf = (doc: Document) => {
    setBrepKernel(null);
    try { return Math.abs(meshVolume(rebuildDocument(doc).bodies[0].geometry)); } finally { setBrepKernel(kernel); }
  };
  const stepOf = async (doc: Document) => {
    const r = rebuildDocument(doc);
    const shape = r.brep?.[r.bodies[0].id];
    expect(shape).toBeTruthy();
    const out = await shapesToStep(rep, [{ name: 'Body', shape, exact: r.bodies[0].exact === true }]);
    expect(out.exact).toBe(1);
    return { text: new TextDecoder().decode(out.bytes), bytes: out.bytes };
  };
  const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

  it('an ellipse with semi-axes 20 and 10 extruded 10 mm is pi * 20 * 10 * 10 = 6283.185 mm³ (also turned, and with the minor radius the larger)', () => {
    const v = exact(extrudeOf((s) => addEllipse(s, { x: 0, y: 0 }, { x: 20, y: 0 }, 10)[0]));
    expect(Math.abs(v - PI * 20 * 10 * H), v.toFixed(6)).toBeLessThan(1e-3);
    const turned = exact(extrudeOf((s) => addEllipse(s, { x: 5, y: -3 }, { x: 5 + 20 * Math.cos(0.5), y: -3 + 20 * Math.sin(0.5) }, 10)[0]));
    expect(Math.abs(turned - PI * 20 * 10 * H)).toBeLessThan(1e-3);
    const tall = exact(extrudeOf((s) => addEllipse(s, { x: 0, y: 0 }, { x: 20, y: 0 }, 25)[0]));
    expect(Math.abs(tall - PI * 20 * 25 * H)).toBeLessThan(1e-3);
  });

  it('an elliptic hole cut through a plate leaves exactly the plate minus the ellipse', () => {
    const v = exact(extrudeOf((s) => addEllipse(s, { x: 0, y: 0 }, { x: 20 * Math.cos(PI / 6), y: 20 * Math.sin(PI / 6) }, 10)[0], true));
    expect(Math.abs(v - (80 * 60 * H - PI * 20 * 10 * H)), v.toFixed(6)).toBeLessThan(1e-3);
  });

  it('a partial ellipse closed by lines is exact, counter-clockwise and clockwise', () => {
    const half = (ccw: boolean) => extrudeOf((s) => {
      const [a, b] = ccw ? [{ x: 20, y: 0 }, { x: -20, y: 0 }] : [{ x: -20, y: 0 }, { x: 20, y: 0 }];
      const [s1, arc] = addEllipseArc(s, { x: 0, y: 0 }, { x: 20, y: 0 }, 10, a, b, ccw);
      return addLine(s1, arc.end, arc.start)[0];
    });
    for (const ccw of [true, false]) {
      const v = exact(half(ccw));
      expect(Math.abs(v - (PI * 20 * 10 * H) / 2), `${ccw}: ${v.toFixed(6)}`).toBeLessThan(1e-3);
    }
    // a quarter: the arc and two radii
    const quarter = extrudeOf((s) => {
      const [s1, arc] = addEllipseArc(s, { x: 0, y: 0 }, { x: 20, y: 0 }, 10, { x: 20, y: 0 }, { x: 0, y: 10 }, true);
      const [s2, l1] = addLine(s1, arc.end, { x: 0, y: 0 });
      return addLine(s2, l1.p2, arc.start)[0];
    });
    const v = exact(quarter);
    expect(Math.abs(v - (PI * 20 * 10 * H) / 4), v.toFixed(6)).toBeLessThan(1e-3);
  });

  it('a half ellipse revolved about a line 5 mm away is the exact solid of Pappus', () => {
    const doc = createDocument();
    const [s0, arc] = addEllipseArc(createSketch('s1', 's1', 'front'), { x: 0, y: 5 }, { x: 20, y: 5 }, 10, { x: 20, y: 5 }, { x: -20, y: 5 }, true);
    let s = addLine(s0, arc.end, arc.start)[0];
    s = addLine(s, { x: -30, y: 0 }, { x: 30, y: 0 }, true)[0];
    const axisId = s.entityOrder[s.entityOrder.length - 1];
    doc.sketches.s1 = s;
    doc.features.push({ id: 'v1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axisId, angle: 360, reverse: false } as never);
    const v = exact(doc);
    const expectV = ((PI * 20 * 10) / 2) * 2 * PI * (5 + (4 * 10) / (3 * PI));
    expect(Math.abs(v - expectV), `${v.toFixed(6)} vs ${expectV.toFixed(6)}`).toBeLessThan(1e-3);
  });

  // a closed profile of one curve from (0, 0) to (40, 0) and the line back
  const SPLINE = [{ x: 0, y: 0 }, { x: 10, y: 8 }, { x: 25, y: 12 }, { x: 33, y: 4 }, { x: 40, y: 0 }];
  const curveCases: { name: string; build: (s: Sk) => Sk; sample: (n: number) => Pt[] }[] = [
    { name: 'spline (through points)', build: (s) => addSpline(s, SPLINE)[0], sample: (n) => sampleCatmullRom(SPLINE, n) },
    { name: 'style spline (Bezier)', build: (s) => addSpline(s, SPLINE, false, { style: true })[0], sample: (n) => sampleBezier(SPLINE, n) },
    { name: 'conic (rho 0.4)', build: (s) => addConic(s, { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 15, y: 20 }, 0.4)[0], sample: (n) => sampleConic({ x: 0, y: 0 }, { x: 15, y: 20 }, { x: 40, y: 0 }, 0.4, n) },
  ];
  for (const c of curveCases) {
    it(`a ${c.name} closed by a line: the exact volume is the limit of an ever finer segmentation`, () => {
      const doc = extrudeOf((s) => addLine(c.build(s), { x: 40, y: 0 }, { x: 0, y: 0 })[0]);
      const v = exact(doc);
      // a fine numerical integration of the same curve (shoelace on 20000 samples)
      const fine = area(c.sample(20000)) * H;
      expect(Math.abs(v - fine), `${v.toFixed(6)} vs ${fine.toFixed(6)}`).toBeLessThan(1e-3);
      // finer segments converge on the exact value (error ~ 1/n²); the exact value does not depend on them
      const errs = [8, 32, 128].map((n) => Math.abs(area(c.sample(n)) * H - v));
      expect(errs[1]).toBeLessThan(errs[0] / 8);
      expect(errs[2]).toBeLessThan(errs[1] / 8);
      // the mesh kernel (its own segmentation) lies within its facet margin of the exact value
      const mesh = meshOf(doc);
      expect(Math.abs(mesh - v), `mesh ${mesh.toFixed(4)} vs exact ${v.toFixed(4)}`).toBeLessThan(errs[0] + 0.01);
    });
  }

  it('STEP of the ellipse body carries ELLIPSE curves (three faces, three edges: no polyline) and reads back exactly', async () => {
    const { text, bytes } = await stepOf(extrudeOf((s) => addEllipse(s, { x: 0, y: 0 }, { x: 20, y: 0 }, 10)[0]));
    // the edges, the base curve of the side face and the curves in the faces' parameter space
    expect(count(text, /\bELLIPSE\(/g)).toBeGreaterThanOrEqual(2);
    expect(count(text, /ADVANCED_FACE/g)).toBe(3);
    // the top and bottom ellipse and the seam of the side face
    expect(count(text, /EDGE_CURVE\(/g)).toBe(3);
    const back = await stepToMeshes(rep, bytes);
    expect(Math.abs(back[0].volume - PI * 20 * 10 * H)).toBeLessThan(1e-3);
  });

  it('STEP of the spline body carries B_SPLINE_CURVE_WITH_KNOTS (four faces, six edges: no polyline) and reads back exactly', async () => {
    const doc = extrudeOf((s) => addLine(addSpline(s, SPLINE)[0], { x: 40, y: 0 }, { x: 0, y: 0 })[0]);
    const v = exact(doc);
    const { text, bytes } = await stepOf(doc);
    expect(count(text, /B_SPLINE_CURVE_WITH_KNOTS\(/g)).toBeGreaterThanOrEqual(2);
    expect(count(text, /ADVANCED_FACE/g)).toBe(4);
    expect(count(text, /EDGE_CURVE\(/g)).toBe(6);
    const back = await stepToMeshes(rep, bytes);
    expect(Math.abs(back[0].volume - v)).toBeLessThan(1e-3);
  });
});

describe('QA plastics on the B-rep kernel (0.5.11 F51 / F121, parity rows 16 and 31)', { timeout: 120000 }, () => {
  /** an 80 x 60 x 10 plate with the plane of its top face (y = 10) */
  const plate = () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60);
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    doc.planes.f1 = TOP_FACE as never;
    return doc;
  };
  /**
   * every body is exact, has the closed-form volume to 1e-3 mm³ and no warning, its tessellation lies within 1 % of
   * it, and the mesh kernel builds the same part (the cross-check of the e2e builds, src/app/brepRefine.ts)
   */
  const check = (doc: Document, expected: Record<string, number>) => {
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
    expect(r.warnings ?? {}).toEqual({});
    setBrepKernel(null);
    const mesh = rebuildDocument(doc);
    setBrepKernel(kernel);
    for (const [first, v] of Object.entries(expected)) {
      const i = r.bodies.findIndex((b) => b.featureIds[0] === first);
      const b = r.bodies[i], m = mesh.bodies.find((x) => x.featureIds[0] === first)!;
      expect(b.exact, first).toBe(true);
      expect(Math.abs(b.exactVolume! - v), `${first}: ${b.exactVolume!.toFixed(4)} vs ${v.toFixed(4)}`).toBeLessThan(1e-3);
      const shown = Math.abs(meshVolume(b.geometry));
      expect(Math.abs(shown - v) / v, `tessellation ${shown.toFixed(2)} vs ${v.toFixed(2)}`).toBeLessThan(0.01);
      expect(kernelMismatch(m.geometry, Math.abs(meshVolume(m.geometry)), b.geometry, b.exactVolume!)).toBeNull();
      expect(shapeMismatch(m.geometry, b.geometry)).toBeNull();
    }
  };
  const boss = (extra: Record<string, unknown> = {}) => ({ id: 'mb', type: 'mountingBoss', name: 'Mounting Boss1', suppressed: false, plane: 'f1', point: { x: 20, y: 20 }, label: '', bossType: 'hardware', hardware: 'thread', pin: 'hole', height: 20, diameter: 10, draft: 0, holeDiameter: 4, holeDepth: 15, holeDraft: 0, fins: 4, finLength: 6, finHeight: 12, finWidth: 2, finAngle: 0, ...extra }) as never;

  it('Mounting Boss: a Ø10 x 20 cylinder, four fins 6 x 12 x 2 and a Ø4 x 15 hole', () => {
    const doc = plate();
    doc.features.push(boss());
    // a fin outside the cylinder: the triangle 6 x 12 times its width, plus the sliver between the fin's flat end
    // (at r = 5) and the cylinder over its width (|y| <= 1) at the full fin height
    const a = 1, r = 5;
    const sliver = 2 * a * r - a * Math.sqrt(r * r - a * a) - r * r * Math.asin(a / r);
    check(doc, { e1: 48000 + PI * 25 * 20 + 4 * (0.5 * 6 * 12 * 2 + 12 * sliver) - PI * 4 * 15 });
  });
  it('Mounting Boss with a 2° draft and a 1° hole draft (no fins): a frustum less a frustum', () => {
    const doc = plate();
    doc.features.push(boss({ draft: 2, holeDraft: 1, fins: 0 }));
    const r1 = 5 - 20 * Math.tan((2 * PI) / 180), rb = 2 - 15 * Math.tan(PI / 180);
    check(doc, { e1: 48000 + (PI * 20 * (25 + 5 * r1 + r1 * r1)) / 3 - (PI * 15 * (4 + 2 * rb + rb * rb)) / 3 });
  });
  it('Snap Hook: the beam 2 x 15 and the lip (1.5 x 0.6 plus the lead-in triangle 1.5 x 2.4), 6 wide, turned 30°', () => {
    const doc = plate();
    doc.features.push({ id: 'sh', type: 'snapHook', name: 'Snap Hook1', suppressed: false, plane: 'f1', point: { x: 20, y: 20 }, label: '', angle: 30, height: 15, thickness: 2, width: 6, lipHeight: 3, overhang: 1.5 } as never);
    check(doc, { e1: 48000 + (2 * 15 + 1.5 * 0.6 + 0.5 * 1.5 * 2.4) * 6 });
  });

  /** two open frames 60 x 40 around a 56 x 36 opening (upper 15 high, lower 10 deep), or two tubes Ø40 / Ø36 */
  const halves = (round: boolean) => {
    const doc = createDocument();
    const frame = (id: string) => {
      let s = createSketch(id, id, 'top');
      if (round) return addCircle(addCircle(s, { x: 0, y: 0 }, 20)[0], { x: 0, y: 0 }, 18)[0];
      for (const [x0, y0, x1, y1] of [[-30, -20, 30, 20], [-28, -18, 28, 18]]) {
        const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
        for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
      }
      return s;
    };
    doc.sketches.s1 = frame('s1');
    doc.sketches.s2 = frame('s2');
    doc.features.push(extrude('e1', 's1', 'boss', 15), extrude('e2', 's2', 'boss', 10, { reverse: true, merge: false }));
    const at: [number, number, number] = round ? [19, 0, 0] : [29, 0, 0];
    doc.features.push({ id: 'lg', type: 'lipGroove', name: 'Lip&Groove1', suppressed: false, grooveFace: { normal: [0, -1, 0], point: at, label: '' }, lipFace: { normal: [0, 1, 0], point: at, label: '' }, width: 1, height: 2, clearance: 0.1 } as never);
    return doc;
  };
  it('Lip/Groove on straight rims: lip 1 x 2 and groove 1.1 x 2.1 along the 56 x 36 opening (mitred corners)', () => {
    // band area = the grown rectangle minus the opening = rim length x width + the four corner squares
    const lip = (58 * 38 - 56 * 36) * 2, groove = (58.2 * 38.2 - 56 * 36) * 2.1;
    expect(lip).toBeCloseTo((2 * (56 + 36) * 1 + 4 * 1) * 2, 9);
    check(halves(false), { e1: 15 * (60 * 40 - 56 * 36) - groove, e2: 10 * (60 * 40 - 56 * 36) + lip });
  });
  it('Lip/Groove on a round rim: rings between true cylinders', () => {
    const lip = PI * (19 * 19 - 18 * 18) * 2, groove = PI * (19.1 * 19.1 - 18 * 18) * 2.1;
    check(halves(true), { e1: 15 * PI * (400 - 324) - groove, e2: 10 * PI * (400 - 324) + lip });
  });

  /** a 100 x 100 x 4 plate and a 10 x 10 block from y = -2 to 12 (a second body) pressed through it */
  const indent = (clearance: number, thickness: number, cut: boolean) => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', -50, -50, 50, 50);
    doc.sketches.s2 = rect('s2', 'top', -5, -5, 5, 5);
    doc.features.push(extrude('e1', 's1', 'boss', 4), extrude('e2', 's2', 'boss', 12, { merge: false, direction2: { end: 'blind', depth: 2 } }));
    doc.features.push({ id: 'in', type: 'indent', name: 'Indent1', suppressed: false, target: 'body1', tool: 'body2', thickness, clearance, cut } as never);
    return doc;
  };
  it('Indent with a block tool: the plate wraps around it (pocket of the clearance, wall of the thickness)', () => {
    // pocket: the block grown 0.5 (11 x 11, y -2.5..12.5); wall: grown 1.5 (13 x 13, y -3.5..13.5)
    const v = 40000 + 13 * 13 * (17 - 4) - 11 * 11 * 15;
    check(indent(0.5, 1, false), { e1: v, e2: 10 * 10 * 14 });
  });
  it('Indent with Cut: only the grown block comes out of the plate', () => {
    check(indent(0.5, 1, true), { e1: 40000 - 11 * 11 * 4, e2: 1400 });
    check(indent(0, 1, true), { e1: 40000 - 10 * 10 * 4, e2: 1400 });
  });
});

describe('QA 0.5.11 parity row 10: loft through more than two profiles on the B-rep kernel', { timeout: 120000 }, () => {
  /** a plane parallel to Top at height y */
  const level = (id: string, y: number) => ({ id, name: id, origin: [0, y, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] });
  /** a loft through the profiles (one sketch per entry, on a Top-parallel plane at its height) in this order */
  const loftDoc = (profiles: { y: number; sketch: (id: string, plane: string) => ReturnType<typeof createSketch> }[], opts: { ruled?: boolean; closeLoft?: boolean } = {}): Document => {
    const doc = createDocument();
    const ids = profiles.map((p, k) => {
      doc.planes['p' + k] = level('p' + k, p.y) as never;
      doc.sketches['s' + k] = p.sketch('s' + k, 'p' + k);
      return 's' + k;
    });
    doc.features.push({ id: 'l1', type: 'loft', name: 'Loft1', sketchId: ids[0], sketchId2: ids[1], profiles: ids.slice(2), suppressed: false, op: 'boss', ...opts } as never);
    return doc;
  };
  const square = (h: number) => (id: string, plane: string) => rect(id, plane, -h, -h, h, h);
  const circle = (r: number) => (id: string, plane: string) => addCircle(createSketch(id, id, plane), { x: 0, y: 0 }, r)[0];
  /** the exact volume, with no Faceted warning on the loft */
  const exactLoft = (doc: Document) => {
    const r = rebuildDocument(doc);
    expect(r.warnings?.l1, r.warnings?.l1).toBeUndefined();
    return { v: exact(doc), shown: Math.abs(meshVolume(r.bodies[0].geometry)) };
  };
  /** the volume the mesh kernel builds */
  const meshOf = (doc: Document) => {
    setBrepKernel(null);
    try {
      const r = rebuildDocument(doc);
      expect(Object.keys(r.errors)).toHaveLength(0);
      return Math.abs(meshVolume(r.bodies[0].geometry));
    } finally { setBrepKernel(kernel); }
  };
  /** frustum of a pyramid between parallel faces of areas a1 and a2, height h */
  const frustum = (a1: number, a2: number, h: number) => (h / 3) * (a1 + a2 + Math.sqrt(a1 * a2));

  it('ruled through three squares (40 at 0, 20 at 30, 40 at 60) is exactly two frustums', () => {
    const doc = loftDoc([{ y: 0, sketch: square(20) }, { y: 30, sketch: square(10) }, { y: 60, sketch: square(20) }], { ruled: true });
    const { v, shown } = exactLoft(doc);
    const expectV = 2 * frustum(1600, 400, 30);
    expect(Math.abs(v - expectV), `${v.toFixed(6)} vs ${expectV}`).toBeLessThan(1e-3);
    expect(Math.abs(shown - v) / v).toBeLessThan(0.01);
    // the mesh kernel builds the same straight walls
    expect(Math.abs(meshOf(doc) - expectV)).toBeLessThan(1e-3);
  });

  it('ruled through four squares at uneven heights: three frustums', () => {
    const doc = loftDoc([{ y: 0, sketch: square(20) }, { y: 20, sketch: square(10) }, { y: 40, sketch: square(15) }, { y: 60, sketch: square(20) }], { ruled: true });
    const expectV = frustum(1600, 400, 20) + frustum(400, 900, 20) + frustum(900, 1600, 20);
    expect(Math.abs(exactLoft(doc).v - expectV)).toBeLessThan(1e-3);
  });

  it('smooth through three circles (r 20, 10, 20) is exact; volume within 0.5 % of a fine integration, tessellation within 1 %', () => {
    const doc = loftDoc([{ y: 0, sketch: circle(20) }, { y: 30, sketch: circle(10) }, { y: 60, sketch: circle(20) }]);
    const { v, shown } = exactLoft(doc);
    // a fine numerical integration of the smooth loft: the radius runs along the parabola through the three profiles
    // (the polynomial through the sections at their chord-length parameters, here 0, 1/2, 1), summed over 20000 slices
    const N = 20000;
    let fine = 0;
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) / N, r = 20 - 40 * s + 40 * s * s;
      fine += PI * r * r * (60 / N);
    }
    expect(Math.abs(v - fine) / fine, `${v.toFixed(3)} vs ${fine.toFixed(3)}`).toBeLessThan(0.005);
    expect(Math.abs(shown - v) / v, `tessellation ${shown.toFixed(1)} vs exact ${v.toFixed(1)}`).toBeLessThan(0.01);
    // the mesh kernel's loft (64 facets around) lies within the cross-check margin of the exact one (0.5 %)
    const mesh = meshOf(doc);
    expect(Math.abs(mesh - v) / v, `mesh ${mesh.toFixed(1)} vs exact ${v.toFixed(1)}`).toBeLessThan(0.005);
  });

  it('smooth through squares at uneven heights and through circles off the axis: the mesh kernel agrees within 0.5 %', () => {
    const docs = [
      loftDoc([{ y: 0, sketch: square(20) }, { y: 20, sketch: square(10) }, { y: 40, sketch: square(15) }, { y: 60, sketch: square(20) }]),
      loftDoc([0, 10, 25, 45, 60].map((y, k) => ({ y, sketch: (id: string, plane: string) => addCircle(createSketch(id, id, plane), { x: 4 * k, y: 0 }, [20, 10, 15, 12, 20][k])[0] }))),
      // a 40 x 20 rectangle to a 20 x 30 one and back: corner to corner
      loftDoc([{ y: 0, sketch: (id, pl) => rect(id, pl, -20, -10, 20, 10) }, { y: 25, sketch: (id, pl) => rect(id, pl, -10, -15, 10, 15) }, { y: 60, sketch: (id, pl) => rect(id, pl, -20, -10, 20, 10) }]),
    ];
    for (const doc of docs) {
      const { v } = exactLoft(doc);
      const mesh = meshOf(doc);
      expect(Math.abs(mesh - v) / v, `mesh ${mesh.toFixed(1)} vs exact ${v.toFixed(1)}`).toBeLessThan(0.005);
    }
    // ruled, the rectangles are the prismatoids: h/6 (A1 + 4 Am + A2) per piece
    const ruled = loftDoc([{ y: 0, sketch: (id, pl) => rect(id, pl, -20, -10, 20, 10) }, { y: 25, sketch: (id, pl) => rect(id, pl, -10, -15, 10, 15) }, { y: 60, sketch: (id, pl) => rect(id, pl, -20, -10, 20, 10) }], { ruled: true });
    const prismatoid = (h: number) => (h / 6) * (800 + 4 * (30 * 25) + 600);
    expect(Math.abs(exactLoft(ruled).v - prismatoid(25) - prismatoid(35))).toBeLessThan(1e-3);
  });

  it('Close loft: four circles around the Y axis loft back to the first, exact and as the mesh kernel', () => {
    const doc = createDocument();
    const ids = [0, 1, 2, 3].map((k) => {
      const a = (k * PI) / 2;
      doc.planes['p' + k] = { id: 'p' + k, name: 'p' + k, origin: [0, 0, 0], u: [Math.cos(a), 0, -Math.sin(a)], v: [0, 1, 0], n: [Math.sin(a), 0, Math.cos(a)] } as never;
      doc.sketches['s' + k] = addCircle(createSketch('s' + k, 's' + k, 'p' + k), { x: 30, y: 0 }, 5 + k)[0];
      return 's' + k;
    });
    for (const ruled of [true, false]) {
      doc.features = [{ id: 'l1', type: 'loft', name: 'Loft1', sketchId: ids[0], sketchId2: ids[1], profiles: ids.slice(2), closeLoft: true, ruled, suppressed: false, op: 'boss' } as never];
      const { v } = exactLoft(doc);
      const mesh = meshOf(doc);
      expect(Math.abs(mesh - v) / v, `${ruled ? 'ruled' : 'smooth'}: mesh ${mesh.toFixed(1)} vs exact ${v.toFixed(1)}`).toBeLessThan(0.005);
    }
  });
});
