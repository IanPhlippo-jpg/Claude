import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { solveMate, solveMates } from './assembly';
import { mateStatus } from './mateStatus';
import { createDocument, type Component, type Mate, type MateRef } from '../document/types';

// mechanical mates driven by 30° or 10 mm, the driven part checked to 1e-6 (QA 0.5.11 P1-7)
type V3 = [number, number, number];
type Q = [number, number, number, number];
const I: Q = [0, 0, 0, 1];
const comp = (id: string, fixed: boolean, position: V3 = [0, 0, 0], rotation: Q = I): Component => ({ id, name: id, part: createDocument(id), position, rotation, fixed, suppressed: false });
const ref = (componentId: string, normal: V3, point: V3, extra: Partial<MateRef> = {}): MateRef => ({ componentId, kind: 'face', label: componentId, normal, point, ...extra });
const cyl = (componentId: string, normal: V3, point: V3, radius: number) => ref(componentId, normal, point, { cylindrical: true, radius });
const mate = (type: Mate['type'], refs: [MateRef, MateRef], extra: Partial<Mate> = {}): Mate => ({ id: `${type}-${refs[0].componentId}${refs[1].componentId}`, type, name: type, refs, aligned: false, suppressed: false, ...extra });
const turnZ = (deg: number): Q => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (deg * Math.PI) / 180);
  return [q.x, q.y, q.z, q.w];
};
const angleZ = (c: Component) => 2 * Math.atan2(c.rotation[2], c.rotation[3]);
const base = (a: Component, b: Component): Mate['base'] => ({ a: { position: [...a.position], rotation: [...a.rotation] }, b: { position: [...b.position], rotation: [...b.rotation] } });
const close = (v: number[], w: number[]) => expect([...v]).toEqual(w.map((x) => expect.closeTo(x, 6)));
const R30 = Math.PI / 6;

describe('screw', () => {
  // a screw along z through the origin and a nut on it 5 up, pitch 2 mm per turn
  const S0 = comp('S', false), N0 = comp('N', false, [0, 0, 5]);
  const m = mate('screw', [cyl('S', [0, 0, 1], [0, 0, 0], 4), cyl('N', [0, 0, 1], [0, 0, 0], 4)], { pitch: 2, base: base(S0, N0) });
  it('the screw turned 30°: the nut runs 1/6 mm along it (right-hand thread) and does not turn', () => {
    const out = solveMate(m, { ...S0, fixed: true, rotation: turnZ(30) }, N0, 1);
    close(out.position, [0, 0, 5 - 1 / 6]);
    expect(angleZ(out)).toBeCloseTo(0, 6);
  });
  it('the nut turned 30° on a still screw runs 1/6 mm the other way; driven by the nut the screw keeps the same relation', () => {
    close(solveMate(m, S0, { ...N0, rotation: turnZ(30) }, 1).position, [0, 0, 5 + 1 / 6]);
    // the nut drives: the screw moves 1/6 mm down against it
    close(solveMate(m, { ...N0, fixed: true, rotation: turnZ(30) }, S0, 0).position, [0, 0, -1 / 6]);
  });
  it('the screw pushed 10 mm along its axis without turning: the nut goes along (QA 0.5.11: it stayed behind)', () => {
    close(solveMate(m, { ...S0, fixed: true, position: [0, 0, 10] }, N0, 1).position, [0, 0, 15]);
  });
  it('in the assembly: a frame holds the screw on its axis, the screw turned 30° moves the nut', () => {
    const F = comp('F', true), S = { ...S0, rotation: turnZ(30) };
    const hold = mate('concentric', [cyl('F', [0, 0, 1], [0, 0, 0], 4), cyl('S', [0, 0, 1], [0, 0, 0], 4)]);
    const out = solveMates([F, S, N0], [hold, m]);
    expect(angleZ(out[1])).toBeCloseTo(R30, 6);
    close(out[2].position, [0, 0, 5 - 1 / 6]);
  });
});

describe('rack and pinion', () => {
  // a pinion of radius 10 about z at the origin, a rack below it running along x
  const r = 10;
  const P0 = comp('P', false), K0 = comp('K', false, [0, -10, 0]);
  const m = mate('rackPinion', [cyl('P', [0, 0, 1], [0, 0, 0], r), ref('K', [1, 0, 0], [0, 0, 0])], { base: base(P0, K0) });
  it('the pinion turned 30°: the rack travels r·π/6', () => {
    close(solveMate(m, { ...P0, fixed: true, rotation: turnZ(30) }, K0, 1).position, [r * R30, -10, 0]);
  });
  it('the rack pushed 10 mm: the pinion turns 10/r rad and stays in place (QA 0.5.11: the rack could not drive)', () => {
    const out = solveMate(m, { ...K0, fixed: true, position: [10, -10, 0] }, P0, 0);
    expect(angleZ(out)).toBeCloseTo(10 / r, 6);
    close(out.position, [0, 0, 0]);
  });
  it('a travel per revolution given: 12 mm per turn, 30° moves the rack 1 mm', () => {
    close(solveMate({ ...m, pitch: 12 }, { ...P0, fixed: true, rotation: turnZ(30) }, K0, 1).position, [1, -10, 0]);
  });
});

describe('linear coupler', () => {
  // A slides along x, B along y; B moves ratio 2.5 times as far as A
  const A0 = comp('A', false), B0 = comp('B', false, [0, 50, 0]);
  const m = mate('linearCoupler', [ref('A', [1, 0, 0], [0, 0, 0]), ref('B', [0, 1, 0], [0, 0, 0])], { ratio: 2.5, base: base(A0, B0) });
  it('A moved 10 mm: B moves 25 mm along its own direction', () => {
    close(solveMate(m, { ...A0, fixed: true, position: [10, 0, 0] }, B0, 1).position, [0, 75, 0]);
  });
  it('B moved 10 mm: A moves 10 / 2.5 = 4 mm (QA 0.5.11: A moved 25 mm, the ratio the wrong way round)', () => {
    close(solveMate(m, { ...B0, fixed: true, position: [0, 60, 0] }, A0, 0).position, [4, 0, 0]);
  });
});

describe('gear driven from either side', () => {
  it('the second gear turned 30° turns the first back by 30° / ratio', () => {
    const A0 = comp('A', false), B0 = comp('B', false, [30, 0, 0]);
    const m = mate('gear', [cyl('A', [0, 0, 1], [0, 0, 0], 10), cyl('B', [0, 0, 1], [0, 0, 0], 20)], { ratio: 0.5, base: base(A0, B0) });
    expect(angleZ(solveMate(m, { ...B0, fixed: true, rotation: turnZ(30) }, A0, 0))).toBeCloseTo(-2 * R30, 6);
  });
});

describe('hinge', () => {
  // a plate with a pin hole on z and a top face at z = 10; the leaf has the same hole and its bottom face at z = 0
  const A = comp('A', true);
  const m = mate('hinge', [cyl('A', [0, 0, 1], [0, 0, 0], 3), cyl('B', [0, 0, 1], [0, 0, 0], 3)], { extra: [ref('A', [0, 0, 1], [0, 0, 10]), ref('B', [0, 0, -1], [0, 0, 0])] });
  it('the leaf lands on the axis and on the face and keeps any turn about the axis: turned 30°, it stays at 30°', () => {
    const out = solveMates([A, comp('B', false, [3, 4, 25], turnZ(30))], [m])[1];
    close(out.position, [0, 0, 10]);
    expect(angleZ(out)).toBeCloseTo(R30, 6);
  });
  it('pushed 10 mm along the axis or off it, it comes back; the leaf is free only to turn: (-)', () => {
    const B = comp('B', false, [0, 0, 10], turnZ(30));
    close(solveMates([A, { ...B, position: [0, 0, 20] }], [m])[1].position, [0, 0, 10]);
    close(solveMates([A, { ...B, position: [10, 0, 10] }], [m])[1].position, [0, 0, 10]);
    const st = mateStatus([A, B], [m]);
    expect(st.violated.size).toBe(0);
    expect(st.components.B).toBe('under');
  });
});

describe('cam', () => {
  // an eccentric round cam: a disc of radius 20 whose centre is 5 off the axis it turns about (z through the origin);
  // a flat follower above it, its bottom face down
  const C0 = comp('C', false), F0 = comp('F', false, [0, 25, 0]);
  const m = mate('cam', [cyl('C', [0, 0, 1], [5, 0, 0], 20), ref('F', [0, -1, 0], [0, 0, 0])]);
  it('the cam turned 30° lifts the follower to 20 + 5·sin 30° on the profile', () => {
    const out = solveMate(m, { ...C0, fixed: true, rotation: turnZ(30) }, F0, 1);
    close(out.position, [0, 20 + 5 * Math.sin(R30), 0]);
    expect(angleZ(out)).toBeCloseTo(0, 6);
  });
  it('a whole turn in 30° steps: the follower stays on the profile, 20 + 5·sin θ', () => {
    for (let k = 0; k <= 12; k++) {
      const out = solveMate(m, { ...C0, fixed: true, rotation: turnZ(30 * k) }, F0, 1);
      expect(out.position[1]).toBeCloseTo(20 + 5 * Math.sin(k * R30), 6);
    }
  });
  it('a roller follower (radius 5) runs on the profile at 25 from the disc centre', () => {
    const roll = mate('cam', [cyl('C', [0, 0, 1], [5, 0, 0], 20), cyl('F', [0, 0, 1], [0, 0, 0], 5)]);
    const out = solveMate(roll, { ...C0, fixed: true, rotation: turnZ(30) }, comp('F', false, [5 * Math.cos(R30), 40, 0]), 1);
    const c = [5 * Math.cos(R30), 5 * Math.sin(R30)];
    expect(Math.hypot(out.position[0] - c[0], out.position[1] - c[1])).toBeCloseTo(25, 6);
  });
});
