import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { shapesToIges } from './iges';
import { checkIges } from './igesCheck';
import { igesReal, writeIges } from './igesFormat';
import { mapParam, surfacePoint, unitArc } from './igesNurbs';
import { parseParams, readIges } from './igesRead';

// the shape builders are used untyped: their unions (Sketch | Sketches, Shape | Vertex) do not narrow here
let rep: any; // eslint-disable-line @typescript-eslint/no-explicit-any
let OC: any; // eslint-disable-line @typescript-eslint/no-explicit-any

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  rep = await import('replicad');
  rep.setOC(OC as never);
}, 60000);

/**
 * The shape out as IGES and back, every check of the round trip within the bounds of QA F199: surface points within
 * 1e-6 mm of the source surface (or within the reported deviation of an approximated face), trim and edge points
 * within 1e-6 mm beyond the source edge tolerance, closed loops, normals outwards, the area within 0.01 % of the
 * source (or of `area`, a closed-form value, where the source integration is the less accurate one).
 */
async function roundTrip(shape: unknown, opts: { unit?: 'mm' | 'in'; area?: number } = {}) {
  const unit = opts.unit ?? 'mm';
  const out = await shapesToIges(rep, [{ name: 'Body1', shape, exact: true }], unit, 'Test.igs');
  const text = new TextDecoder().decode(out.bytes);
  const c = checkIges(OC, shape, text, unit);
  expect(c.problems).toEqual([]);
  expect(c.surfaceDistance).toBeLessThan(1e-6 + out.stats.maxSurfaceDeviation);
  expect(c.trimExcess).toBeLessThan(1e-6 + 2 * out.stats.maxSurfaceDeviation);
  expect(c.edgeExcess).toBeLessThan(1e-6);
  expect(c.loopGap).toBeLessThan(1e-6);
  expect(c.flippedNormals).toBe(0);
  if (opts.area) expect(Math.abs(c.areaRead - opts.area) / opts.area).toBeLessThan(1e-5);
  else {
    expect(Math.abs(c.areaRead - c.areaSource) / c.areaSource).toBeLessThan(1e-4);
    expect(c.faceAreaError).toBeLessThan(1e-4);
  }
  expect(c.entities[144]).toBe(c.faces);
  expect(c.entities[128]).toBe(c.faces);
  return { out, text, c };
}

const faceCount = (shape: unknown) => {
  let n = 0;
  const ex = new OC.TopExp_Explorer(shape, OC.TopAbs_ShapeEnum.TopAbs_FACE, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; ex.More(); ex.Next()) n++;
  ex.delete();
  return n;
};

describe('IGES 5.3 file format (QA F114/F199)', () => {
  it('reals always carry a decimal point and read back to the same double', () => {
    for (const v of [0, 1, -2, 0.1, 1e-7, 123456.789, -3.4e21, Math.PI]) {
      const s = igesReal(v);
      expect(s).toMatch(/\./);
      expect(Number(s)).toBe(v);
    }
    expect(parseParams('3H,;a,1.5D2,-7;')).toEqual([',;a', 150, -7]);
  });

  it('a rational arc follows the angle through its parameter map', () => {
    const arc = unitArc(0.3, 5.9);
    const curve = { degree: 2, knots: arc.knots, poles: arc.cs.map(([c, s]) => [c, s, 0]), weights: arc.weights };
    const surf = { uDegree: 2, vDegree: 1, uKnots: curve.knots, vKnots: [0, 0, 1, 1], poles: curve.poles.map((p) => [p, [p[0], p[1], 1]]), weights: curve.weights.map((w) => [w, w]) };
    for (const t of [0.3, 1.1, 2.0, 3.3, 4.4, 5.9]) {
      const p = surfacePoint(surf, mapParam(arc.map, t).p, 0.5);
      expect(Math.hypot(p[0] - Math.cos(t), p[1] - Math.sin(t))).toBeLessThan(1e-14);
    }
  });

  it('records are 80 columns with section letters, sequence numbers and the Terminate counts', () => {
    const square = { degree: 1, knots: [0, 0, 1, 1], weights: [1, 1] };
    const face = {
      surface: { uDegree: 1, vDegree: 1, uKnots: [0, 0, 10, 10], vKnots: [0, 0, 10, 10], poles: [[[0, 0, 0], [0, 10, 0]], [[10, 0, 0], [10, 10, 0]]], weights: [[1, 1], [1, 1]] },
      outer: { uv: [[0, 0, 10, 0], [10, 0, 10, 10], [10, 10, 0, 10], [0, 10, 0, 0]].map(([a, b, c, d]) => ({ ...square, poles: [[a, b], [c, d]] })), xyz: [], pref: 1 as const },
      inner: [],
    };
    const text = writeIges([face], { fileName: 'Square.igs', unit: 'mm', resolution: 1e-7, date: new Date(2026, 10, 11, 9, 30, 0) });
    const f = readIges(text);
    expect(f.problems).toEqual([]);
    expect(text.split('\n').filter(Boolean).every((l) => l.length === 80)).toBe(true);
    expect(f.global[13]).toBe(2);
    expect(f.global[14]).toBe('MM');
    expect(f.global[17]).toBe('20261111.093000');
    expect(f.global[22]).toBe(11);
    expect(f.entities.map((e) => e.type)).toEqual([128, 126, 126, 126, 126, 102, 142, 144]);
    expect(f.entities.find((e) => e.type === 144)!.status).toBe('00000000');
    expect(f.entities.find((e) => e.type === 126)!.status).toBe('00010500');
  });
});

describe('IGES 5.3 of B-rep bodies, read back and measured (QA F114/F199)', { timeout: 120000 }, () => {
  it('a box: six planar trimmed surfaces, exact', async () => {
    const box = rep.makeBox([0, 0, 0], [40, 30, 20]).wrapped;
    const { out, c } = await roundTrip(box);
    expect(c.faces).toBe(6);
    expect(out.exact).toBe(1);
    expect(out.stats).toMatchObject({ approximatedSurfaces: 0, fittedTrims: 0, fittedEdges: 0 });
    expect(Math.abs(out.volumes[0] - 24000)).toBeLessThan(1e-6);
    expect(c.areaSource).toBeCloseTo(2 * (1200 + 800 + 600), 6);
  });

  it('a cylinder with an axial and a radial hole: the trim curves of the cross hole on the cylinders are fitted, the surfaces exact', async () => {
    const body = rep.makeCylinder(20, 40).cut(rep.makeCylinder(6, 40)).cut(rep.makeCylinder(4, 60, [-30, 0, 20], [1, 0, 0]));
    const { out, c } = await roundTrip(body.wrapped);
    expect(c.faces).toBe(faceCount(body.wrapped));
    expect(out.stats.approximatedSurfaces).toBe(0);
    expect(out.stats.fittedTrims).toBeGreaterThan(0);
    expect(out.exact).toBe(1);
  });

  it('a box with every edge filleted (planes, cylinders and sphere corners)', async () => {
    const body = rep.makeBox([0, 0, 0], [40, 30, 20]).fillet(4);
    const { out, c } = await roundTrip(body.wrapped);
    expect(c.faces).toBe(26);
    expect(out.stats.approximatedSurfaces).toBe(0);
  });

  it('a torus and a quarter-turn handle bend (doubly curved), and a sphere', async () => {
    const torus = rep.drawCircle(5).translate(20, 0).sketchOnPlane('XZ').revolve();
    await roundTrip(torus.wrapped);
    const bend = rep.drawCircle(6).translate(30, 0).sketchOnPlane('XZ').revolve([0, 0, 1], { angle: 90 }).fuse(rep.makeCylinder(6, 40, [30, 0, 0], [0, -1, 0]));
    const { out } = await roundTrip(bend.wrapped);
    expect(out.stats.approximatedSurfaces).toBe(0);
    await roundTrip(rep.makeSphere(12).wrapped);
  });

  it('a cone between two cylinders with fillets (tori, B-spline blends): trims within the edge tolerance of the source', async () => {
    const body = rep.makeCylinder(10, 5).fuse(rep.drawCircle(10).sketchOnPlane('XY', 5).loftWith(rep.drawCircle(4).sketchOnPlane('XY', 15))).fillet(1);
    const { out } = await roundTrip(body.wrapped);
    expect(out.stats.approximatedSurfaces).toBe(0);
  });

  it('a loft (B-spline surfaces) and an elliptic prism with a hole (extruded ellipse) against its closed-form area', async () => {
    const loft = rep.drawCircle(10).sketchOnPlane('XY').loftWith(rep.drawRoundedRectangle(30, 16, 3).sketchOnPlane('XY', 30));
    expect((await roundTrip(loft.wrapped)).out.stats).toMatchObject({ approximatedSurfaces: 0, fittedTrims: 0 });
    // the perimeter of the ellipse 20 x 8 by the midpoint rule on 200000 steps (converges far beyond 1e-9)
    let perimeter = 0;
    for (let i = 0, n = 200000; i < n; i++) { const t = ((i + 0.5) / n) * 2 * Math.PI; perimeter += (Math.hypot(20 * Math.sin(t), 8 * Math.cos(t)) * 2 * Math.PI) / n; }
    const area = 10 * perimeter + 2 * (Math.PI * 160 - Math.PI * 9) + 2 * Math.PI * 3 * 10;
    const prism = rep.drawEllipse(20, 8).sketchOnPlane('XY').extrude(10).cut(rep.makeCylinder(3, 10));
    expect((await roundTrip(prism.wrapped, { area })).out.exact).toBe(1);
  });

  it('an offset surface has no exact B-spline: it is interpolated, counted as approximated, and the body is not exact', async () => {
    const loft = rep.drawCircle(10).sketchOnPlane('XY').loftWith(rep.drawRoundedRectangle(30, 16, 3).sketchOnPlane('XY', 30)) as unknown as { faces: unknown[] };
    const offset = rep.makeOffset(loft.faces[0] as never, 1).wrapped;
    const { out } = await roundTrip(offset);
    expect(out.stats.approximatedSurfaces).toBe(1);
    expect(out.stats.maxSurfaceDeviation).toBeGreaterThan(0);
    expect(out.stats.maxSurfaceDeviation).toBeLessThan(1e-4);
    expect(out.exact).toBe(0);
  });

  it('the parts of the door handle example (voorbeelden/deurkruk) are exact and read back', async () => {
    const { parseDocument } = await import('../document/persistence');
    const { rebuildDocument } = await import('../features/rebuild');
    const { setBrepKernel } = await import('../features/brepKernel');
    const { occtKernel } = await import('./brep');
    setBrepKernel(occtKernel(OC, rep));
    try {
      for (const name of ['Rozet', 'Kruk']) {
        const r = rebuildDocument(parseDocument(readFileSync(`voorbeelden/deurkruk/${name}.kcad`, 'utf8')));
        for (const b of r.bodies) {
          expect(b.exact, name).toBe(true);
          const { out } = await roundTrip(r.brep![b.id]);
          expect(out.exact, name).toBe(1);
          expect(out.stats.approximatedSurfaces, name).toBe(0);
        }
      }
    } finally {
      setBrepKernel(null);
    }
  });

  it('in inches the coordinates are divided by 25.4 and the unit flag is 1', async () => {
    const { text } = await roundTrip(rep.makeBox([0, 0, 0], [25.4, 50.8, 10]).wrapped, { unit: 'in' });
    const f = readIges(text);
    expect(f.global[13]).toBe(1);
    expect(f.global[14]).toBe('INCH');
    expect(f.global[19]).toBeCloseTo(2, 12);
  });

  it('a mesh body goes out as its sewn planar faces and is not counted exact', async () => {
    const box = rep.makeBox([0, 0, 0], [10, 10, 10]);
    const m = box.mesh({ tolerance: 0.1, angularTolerance: 0.2 });
    const positions = new Float32Array(m.triangles.length * 3);
    m.triangles.forEach((v: number, i: number) => { for (let k = 0; k < 3; k++) positions[i * 3 + k] = m.vertices[v * 3 + k]; });
    const out = await shapesToIges(rep, [{ name: 'Mesh', positions }]);
    expect(out.exact).toBe(0);
    expect(out.volumes).toHaveLength(1);
    expect(Math.abs(out.volumes[0] - 1000)).toBeLessThan(1e-3);
    expect(readIges(new TextDecoder().decode(out.bytes)).entities.filter((e) => e.type === 144)).toHaveLength(6);
  });
});
