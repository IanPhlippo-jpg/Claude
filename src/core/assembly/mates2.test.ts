import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { solveMate, solveMates } from './assembly';
import { createDocument, type Component, type Mate, type MateRef } from '../document/types';

const comp = (id: string, fixed: boolean, position: [number, number, number] = [0, 0, 0], rotation: [number, number, number, number] = [0, 0, 0, 1]): Component => ({ id, name: id, part: createDocument(id), position, rotation, fixed, suppressed: false });
const face = (componentId: string, normal: [number, number, number], point: [number, number, number], extra: Partial<MateRef> = {}): MateRef => ({ componentId, kind: 'face', label: componentId, normal, point, ...extra });
const mate = (type: Mate['type'], refs: [MateRef, MateRef], extra: Partial<Mate> = {}): Mate => ({ id: 'm', type, name: 'M', refs, aligned: false, suppressed: false, ...extra });

describe('advanced and mechanical mates', () => {
  it('Width centres the tab between the width faces', () => {
    const A = comp('A', true), B = comp('B', false, [100, 5, 0]);
    const m = mate('width', [face('A', [1, 0, 0], [0, 0, 0]), face('B', [-1, 0, 0], [0, 0, 0])], { extra: [face('A', [-1, 0, 0], [20, 0, 0]), face('B', [1, 0, 0], [6, 0, 0])] });
    const out = solveMate(m, A, B, 1);
    expect(out.position[0]).toBeCloseTo(7, 6);
  });

  it('Profile Center puts the face centres on one line', () => {
    const A = comp('A', true), B = comp('B', false, [30, 40, 50]);
    const out = solveMate(mate('profileCenter', [face('A', [0, 1, 0], [10, 5, 10]), face('B', [0, -1, 0], [0, 0, 0])]), A, B, 1);
    expect(out.position).toEqual([10, 5, 10].map((v) => expect.closeTo(v, 6)));
  });

  it('Distance (limit) only acts outside the limits', () => {
    const A = comp('A', true), B = comp('B', false, [0, 50, 0]);
    const m = mate('distanceLimit', [face('A', [0, 1, 0], [0, 0, 0]), face('B', [0, -1, 0], [0, 0, 0])], { min: 5, max: 20 });
    expect(solveMate(m, A, B, 1).position[1]).toBeCloseTo(20, 6);
    const C = comp('B', false, [0, 12, 0]);
    expect(solveMate(m, A, C, 1).position[1]).toBeCloseTo(12, 6);
  });

  it('Gear: the second gear turns back by the ratio when the first turns', () => {
    const A0 = comp('A', false), B0 = comp('B', false, [40, 0, 0]);
    const m = mate('gear', [face('A', [0, 0, 1], [0, 0, 0], { cylindrical: true, radius: 10 }), face('B', [0, 0, 1], [0, 0, 0], { cylindrical: true, radius: 20 })], { ratio: 0.5, base: { a: { position: [0, 0, 0], rotation: [0, 0, 0, 1] }, b: { position: [40, 0, 0], rotation: [0, 0, 0, 1] } } });
    // turn A by 90° (it acts as the fixed/driving side here)
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    const A = { ...A0, fixed: true, rotation: [q.x, q.y, q.z, q.w] as [number, number, number, number] };
    const out = solveMate(m, A, B0, 1);
    const qb = new THREE.Quaternion(...out.rotation);
    const ang = 2 * Math.atan2(qb.z, qb.w);
    expect(ang).toBeCloseTo(-Math.PI / 4, 6);
    expect(out.position[0]).toBeCloseTo(40, 6);
  });

  it('Symmetric mirrors the second face about the plane (solveMates finds the plane component)', () => {
    const A = comp('A', true), B = comp('B', false, [3, 0, 0]);
    const m = mate('symmetric', [face('A', [1, 0, 0], [-15, 0, 0]), face('B', [-1, 0, 0], [0, 0, 0])], { extra: [face('A', [1, 0, 0], [0, 0, 0])] });
    const out = solveMates([A, B], [m]);
    expect(out[1].position[0]).toBeCloseTo(15, 6);
  });
});
