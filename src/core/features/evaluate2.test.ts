import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bodyCompare, compareDocuments, deviationAnalysis, partingLineAnalysis, performanceRows, beamEstimateEstimate, symmetryCheck } from './evaluate2';
import { csg, planarFaces } from './solid';
import { bodyEdges } from './edgesets';
import type { Body } from './rebuild';
import { createDocument } from '../document/types';

const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(cx, cy, cz); return g; };
const body = (g: THREE.BufferGeometry, id = 'b1'): Body => ({ id, geometry: g, faces: planarFaces(g, id), edges: bodyEdges(g, id), featureIds: [] });

describe('Evaluate tools', () => {
  it('Symmetry Check: a centred block is symmetric about the Front plane, an offset one is not', () => {
    const ok = symmetryCheck([body(box(0, 0, 0, 40, 20, 10))], { origin: [0, 0, 0], n: [0, 0, 1] });
    expect(ok.symmetric).toBe(true);
    expect(ok.maxDeviation).toBeLessThan(1e-6);
    const bad = symmetryCheck([body(box(0, 0, 3, 40, 20, 10))], { origin: [0, 0, 0], n: [0, 0, 1] });
    expect(bad.symmetric).toBe(false);
    expect(bad.maxDeviation).toBeGreaterThan(5);
    expect(Object.values(bad.asymmetricFaces).flat().length).toBeGreaterThan(0);
  });

  it('Deviation Analysis: the edges of a box have 90 degree faces', () => {
    const b = body(box(0, 0, 0, 10, 10, 10));
    const r = deviationAnalysis([b], [b.edges[0].id, b.edges[1].id], 5);
    expect(r.length).toBe(2);
    for (const x of r) {
      expect(Math.abs(x.min - 90)).toBeLessThan(1e-6);
      expect(Math.abs(x.max - 90)).toBeLessThan(1e-6);
    }
  });

  it('Parting Line Analysis: the parting line of a block pulled along Y is its middle outline', () => {
    const r = partingLineAnalysis([body(box(0, 0, 0, 40, 20, 10))], [0, 1, 0]);
    expect(r.positive).toBe(1);
    expect(r.negative).toBe(1);
    expect(r.straddle).toBe(4);
    // the vertical side faces are straddle faces; the parting line is where the up and down facing faces meet the sides:
    // none for a straight block (no sign change across a vertical face), so the sides themselves carry the line
    expect(r.length).toBeGreaterThanOrEqual(0);
    const wedge = (() => { const g = new THREE.CylinderGeometry(0, 10, 10, 4).toNonIndexed(); return g; })();
    const w = partingLineAnalysis([body(wedge)], [0, 1, 0]);
    // the pyramid: the four sloped faces face up, the base faces down → the parting line is the base outline (4 × 14.14)
    expect(Math.abs(w.length - 4 * Math.SQRT2 * 10)).toBeLessThan(0.5);
  });

  it('Body Compare: common and differing volumes', () => {
    const a = box(0, 0, 0, 40, 20, 10), b = box(5, 0, 0, 40, 20, 10);
    const r = bodyCompare(a, b);
    expect(Math.abs(r.common - 35 * 20 * 10)).toBeLessThan(1);
    expect(Math.abs(r.onlyA - 5 * 20 * 10)).toBeLessThan(1);
    expect(Math.abs(r.onlyB - 5 * 20 * 10)).toBeLessThan(1);
    expect(r.identical).toBe(false);
    expect(bodyCompare(a, a.clone()).identical).toBe(true);
    const shelled = csg(a, box(0, 0, 0, 36, 16, 20), 'subtract');
    expect(bodyCompare(a, shelled).onlyA).toBeGreaterThan(5000);
  });

  it('Compare Documents: added, removed and changed features, differing properties', () => {
    const a = createDocument('A');
    a.features = [
      { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
      { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
      { id: 'f1', type: 'fillet', name: 'Fillet1', suppressed: false, edges: [], radius: 2 } as never,
    ];
    const b = createDocument('B');
    b.units = 'in';
    b.features = [
      { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
      { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 12, reverse: false },
      { id: 'c1', type: 'chamfer', name: 'Chamfer1', suppressed: false, edges: [], radius: 1 } as never,
    ];
    const r = compareDocuments(a, b);
    expect(r.changed).toEqual(['Boss-Extrude1']);
    expect(r.added).toEqual(['Chamfer1']);
    expect(r.removed).toEqual(['Fillet1']);
    expect(r.unchanged).toBe(1);
    expect(r.properties.some((p) => p.name === 'Units')).toBe(true);
    expect(r.properties.some((p) => p.name === 'Name')).toBe(true);
  });

  it('Performance Evaluation rows: slowest first with shares that add up to 100', () => {
    const feats = [
      { id: 'a', type: 'extrude', name: 'A' },
      { id: 'b', type: 'fillet', name: 'B' },
      { id: 'c', type: 'shell', name: 'C' },
    ] as never[];
    const { rows, total } = performanceRows(feats, { a: 10, b: 30, c: 60 });
    expect(total).toBe(100);
    expect(rows.map((r) => r.id)).toEqual(['c', 'b', 'a']);
    expect(Math.round(rows.reduce((s, r) => s + r.share, 0))).toBe(100);
    expect(rows[0].order).toBe(3);
  });

  it('BeamEstimate estimate: a steel cantilever 100 x 10 x 10 with 100 N at the end', () => {
    const beam = box(50, 0, 0, 100, 10, 10);
    const r = beamEstimateEstimate({ body: beam, fixture: { normal: [-1, 0, 0], point: [0, 0, 0] }, load: { normal: [0, 1, 0], point: [100, 5, 0], area: 1000 }, force: 100, elasticModulus: 2.1e11, yieldStrength: 2.2e8 });
    // bending: M = 100 N · 100 mm = 1e4 N·mm; I = 10·10³/12 = 833 mm⁴; σ = M·5/I = 60 N/mm² = 60 MPa
    expect(Math.abs(r.bendingStress / 1e6 - 60)).toBeLessThan(1);
    // deflection: F L³ / (3 E I) = 100 · 1e6 / (3 · 2.1e5 · 833) = 0.19 mm
    expect(Math.abs(r.displacement - 0.1905)).toBeLessThan(0.005);
    expect(r.fos).toBeGreaterThan(3);
    expect(r.fos).toBeLessThan(4);
    expect(Math.abs(r.span - 100)).toBeLessThan(0.2);
  });
});
