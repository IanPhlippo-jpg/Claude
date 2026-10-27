import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { solveMates } from './assembly';
import { mateStatus } from './mateStatus';
import { createDocument, type Component, type Mate, type MateRef } from '../document/types';

// blocks 10 high: bottom face y = 0 (normal -y), top face y = 10 (normal +y), in their own frame
const comp = (id: string, fixed: boolean, y = 0): Component => ({ id, name: id, part: createDocument(id), position: [0, y, 0], rotation: [0, 0, 0, 1], fixed, suppressed: false });
const top = (c: string): MateRef => ({ componentId: c, kind: 'face', label: `top@${c}`, normal: [0, 1, 0], point: [0, 10, 0] });
const bottom = (c: string): MateRef => ({ componentId: c, kind: 'face', label: `bottom@${c}`, normal: [0, -1, 0], point: [0, 0, 0] });
const axis = (c: string): MateRef => ({ componentId: c, kind: 'face', label: `hole@${c}`, normal: [0, 1, 0], point: [0, 0, 0], cylindrical: true, radius: 5 });
let n = 0;
const mate = (type: Mate['type'], refs: [MateRef, MateRef], extra: Partial<Mate> = {}): Mate => ({ id: `m${++n}`, type, name: `${type}${n}`, refs, aligned: false, suppressed: false, ...extra });

describe('mate solver order (QA v0.5.1 F109)', () => {
  it('M1: a free part picked as the first reference of a mate is moved, not the part it is mated to', () => {
    const A = comp('A', true), C = comp('C', false, 40), B = comp('B', false, 100);
    // C sits on A; B stands 5 above C, with B picked first
    const mates = [mate('coincident', [top('A'), bottom('C')]), mate('distance', [bottom('B'), top('C')], { value: 5 })];
    const out = solveMates([A, C, B], mates);
    expect(out[1].position[1]).toBeCloseTo(10, 6);
    expect(out[2].position[1]).toBeCloseTo(25, 6);
    // and the same with the references the other way round
    const out2 = solveMates([A, C, B], [mates[0], mate('distance', [top('C'), bottom('B')], { value: 5 })]);
    expect(out2[2].position[1]).toBeCloseTo(25, 6);
  });
});

describe('mate status (QA v0.5.1 F108)', () => {
  it('M2: two distance mates of 10 and 20 between the same faces conflict: one is flagged, the part is (+)', () => {
    const A = comp('A', true), B = comp('B', false, 50);
    const mates = [mate('distance', [top('A'), bottom('B')], { value: 10 }), mate('distance', [top('A'), bottom('B')], { value: 20 })];
    const solved = solveMates([A, B], mates);
    const st = mateStatus(solved, mates);
    expect(st.violated.size).toBe(1);
    expect(st.components.B).toBe('over');
    expect(st.components.A).toBe('fixed');
  });

  it('a part with only a coincident mate can still slide and turn: (-)', () => {
    const A = comp('A', true), B = comp('B', false, 30);
    const mates = [mate('coincident', [top('A'), bottom('B')])];
    const st = mateStatus(solveMates([A, B], mates), mates);
    expect(st.violated.size).toBe(0);
    expect(st.components.B).toBe('under');
  });

  it('a pin on a plate with coincident and concentric can still turn: (-); locked, it is fully defined', () => {
    const A = comp('A', true), B = comp('B', false, 30);
    const mates = [mate('coincident', [top('A'), bottom('B')]), mate('concentric', [axis('A'), axis('B')])];
    expect(mateStatus(solveMates([A, B], mates), mates).components.B).toBe('under');
    const solved = solveMates([A, B], mates);
    const locked = [mates[0], { ...mates[1], lockRotation: true, base: { a: { position: solved[0].position, rotation: solved[0].rotation }, b: { position: solved[1].position, rotation: solved[1].rotation } } }];
    expect(mateStatus(solveMates([A, B], locked), locked).components.B).toBe('full');
  });

  it('a lock mate defines a part fully; a part locked to a free part stays (-)', () => {
    const A = comp('A', true), B = comp('B', false, 30), C = comp('C', false, 60);
    const lock = mate('lock', [top('A'), bottom('B')], { relative: { position: [0, 30, 0], rotation: [0, 0, 0, 1] } });
    expect(mateStatus([A, B], [lock]).components.B).toBe('full');
    const free = mate('lock', [top('C'), bottom('B')], { relative: { position: [0, -30, 0], rotation: [0, 0, 0, 1] } });
    expect(mateStatus([A, B, C], [free]).components.B).toBe('under');
  });

  it('a mate without reference geometry (an old or partial file) is left out instead of failing', () => {
    const A = comp('A', true), B = comp('B', false, 30);
    const bare = { id: 'mx', type: 'distance', name: 'Distance1', refs: [{ componentId: 'A' }, { componentId: 'B' }], aligned: false, suppressed: false, value: 60 } as unknown as Mate;
    expect(mateStatus([A, B], [bare]).components.B).toBe('under');
  });

  it('the Deurkruk example has no conflicting mates: concentric screws flipped by their coincident mate are no conflict', () => {
    const d = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8'));
    const st = mateStatus(solveMates(d.components, d.mates), d.mates);
    expect(st.violated.size).toBe(0);
    expect(Object.values(st.components).filter((x) => x === 'over')).toHaveLength(0);
  });
});
