import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { autoDimensionScheme, blockFor, DEFAULT_BLOCK, faceDistance, toleranceStatus } from './dimxpert';
import { planarFaces } from '../features/solid';
import { bodyEdges } from '../features/edgesets';
import type { Body } from '../features/rebuild';

const box = (sx: number, sy: number, sz: number): Body => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); return { id: 'b1', geometry: g, faces: planarFaces(g, 'b1'), edges: bodyEdges(g, 'b1'), featureIds: [] }; };

describe('DimXpert', () => {
  it('block tolerance by magnitude', () => {
    expect(blockFor(5, DEFAULT_BLOCK)).toBe(0.1);
    expect(blockFor(40, DEFAULT_BLOCK)).toBe(0.25);
    expect(blockFor(150, DEFAULT_BLOCK)).toBe(0.5);
  });

  it('Auto Dimension Scheme on a block: three datums, three size dimensions, plus/minus tolerances', () => {
    const b = box(60, 40, 20);
    const d = autoDimensionScheme([b], { partType: 'prismatic', toleranceType: 'plusMinus', block: DEFAULT_BLOCK });
    expect(d.datums.map((x) => x.label)).toEqual(['A', 'B', 'C']);
    // the datums are mutually perpendicular
    const n = d.datums.map((x) => new THREE.Vector3(...x.face.normal));
    expect(Math.abs(n[0].dot(n[1]))).toBeLessThan(1e-6);
    expect(Math.abs(n[1].dot(n[2]))).toBeLessThan(1e-6);
    const sizes = d.dims.filter((x) => x.kind === 'size').map((x) => x.value).sort((a, b) => a - b);
    expect(sizes).toEqual([20, 40, 60]);
    expect(d.dims.every((x) => x.plus === x.minus && x.plus > 0)).toBe(true);
    expect(d.dims.find((x) => x.value === 60)!.plus).toBe(0.25);
    expect(d.gtols.length).toBe(0);
    // every face of the block is then constrained
    const s = toleranceStatus([b], d);
    expect(s.counts.constrained).toBe(6);
    expect(s.counts.under).toBe(0);
  });

  it('the geometric scheme adds flatness on the datums and profile tolerances, dimensions are basic', () => {
    const d = autoDimensionScheme([box(60, 40, 20)], { partType: 'prismatic', toleranceType: 'geometric', block: DEFAULT_BLOCK });
    expect(d.dims.every((x) => x.basic)).toBe(true);
    expect(d.gtols.filter((g) => g.symbol === 'flatness').length).toBe(3);
    expect(d.gtols.some((g) => g.symbol === 'profile' && g.datums.join('') === 'ABC')).toBe(true);
  });

  it('given datum faces are honoured and the status marks unreferenced faces as under constrained', () => {
    const b = box(60, 40, 20);
    const top = b.faces.find((f) => f.normal[1] > 0.99)!;
    const d = autoDimensionScheme([b], { partType: 'prismatic', toleranceType: 'plusMinus', block: DEFAULT_BLOCK, datums: [{ normal: top.normal, point: top.centroid }] });
    expect(d.datums[0].face.normal[1]).toBeGreaterThan(0.99);
    const partial = { ...d, dims: [], gtols: [], datums: d.datums.slice(0, 1) };
    const s = toleranceStatus([b], partial);
    expect(s.counts.constrained).toBe(1);
    expect(s.counts.under).toBe(5);
  });

  it('faceDistance measures along the first normal', () => {
    expect(faceDistance({ normal: [1, 0, 0], point: [10, 0, 0] }, { normal: [-1, 0, 0], point: [-30, 5, 2] })).toBe(40);
  });
});
