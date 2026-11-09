// A part's decals show in the assembly: moved with the component, on its body only, and the image
// direction turned with it.
import { describe, expect, it } from 'vitest';
import { assemblyDecals } from './assembly';
import type { Component, Document } from '../document/types';

const decal = { id: 'dc1', name: 'Opdruk', face: { normal: [0, 1, 0] as [number, number, number], point: [0, 1.6, 0] as [number, number, number] }, image: 'data:image/png;base64,AA==', width: 60, height: 20, rotation: 0 };
const part = { name: 'Print', kind: 'part', decals: [decal] } as unknown as Document;
const comp = (id: string, position: [number, number, number], rotation: [number, number, number, number] = [0, 0, 0, 1], p = part) => ({ id, name: id, part: p, position, rotation, fixed: true }) as unknown as Component;

describe('assemblyDecals', () => {
  it('moves each part decal with its component and keeps it on that body', () => {
    const doc = { kind: 'assembly', components: [comp('b1', [10, 3, -5]), comp('b2', [-40, 3, 20])] } as unknown as Document;
    const d = assemblyDecals(doc);
    expect(d.map((x) => x.id)).toEqual(['b1/dc1', 'b2/dc1']);
    expect(d[0].face.point).toEqual([10, 4.6, -5]);
    expect(d[1].face.point).toEqual([-40, 4.6, 20]);
    expect(d[0].bodies).toEqual(['b1']);
    expect(d[0].rotation).toBeCloseTo(0, 9);
    // the same component list gives the same array: the graphics area does not rebuild the decal meshes
    expect(assemblyDecals(doc)).toBe(d);
  });
  it('turns the plane and the image with a rotated component', () => {
    const s = Math.SQRT1_2;
    // 180 degrees about Y: the image runs along -X
    const [a] = assemblyDecals({ kind: 'assembly', components: [comp('c', [0, 0, 0], [0, 1, 0, 0])] } as unknown as Document);
    expect(a.face.normal[1]).toBeCloseTo(1, 9);
    expect(Math.abs(a.rotation)).toBeCloseTo(180, 6);
    // 90 degrees about X: the top face now faces +Z
    const [b] = assemblyDecals({ kind: 'assembly', components: [comp('c', [0, 0, 0], [s, 0, 0, s])] } as unknown as Document);
    expect(b.face.normal[2]).toBeCloseTo(1, 9);
    expect(b.face.point[2]).toBeCloseTo(1.6, 9);
  });
  it('gives nothing for a part, hidden components or parts without decals', () => {
    expect(assemblyDecals({ kind: 'part' } as unknown as Document)).toEqual([]);
    const plain = { name: 'x', kind: 'part' } as unknown as Document;
    expect(assemblyDecals({ kind: 'assembly', components: [{ ...comp('h', [0, 0, 0]), hidden: true }, comp('p', [0, 0, 0], [0, 0, 0, 1], plain)] } as unknown as Document)).toEqual([]);
  });
});
