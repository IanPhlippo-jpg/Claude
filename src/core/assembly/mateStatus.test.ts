import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CYCLING_RATE, rebuildAssembly, solveMates, solveMatesReport } from './assembly';
import { MATE_TOLERANCE, mateStatus, reportOf } from './mateStatus';
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

describe('conflicting and unsettled mates (QA 0.5.10 F141, F166)', () => {
  it('two distance mates that disagree: the mate added last is the one marked, the first one is met', () => {
    const A = comp('A', true), B = comp('B', false, 50);
    const mates = [mate('distance', [top('A'), bottom('B')], { value: 10 }), mate('distance', [top('A'), bottom('B')], { value: 20 })];
    const solved = solveMates([A, B], mates);
    const st = mateStatus(solved, mates);
    expect([...st.violated]).toEqual([mates[1].id]);
    expect(st.unconverged.size).toBe(0);
    expect(st.components.B).toBe('over');
  });
  it('mates the solver has not settled yet read as not converged, not as a conflict', () => {
    const A = comp('A', true), C = comp('C', false, 40), B = comp('B', false, 100);
    const mates = [mate('coincident', [top('A'), bottom('C')]), mate('distance', [bottom('B'), top('C')], { value: 5 })];
    // no pass at all: nothing is met yet, and every mate would be met once the solver runs
    const st = mateStatus(solveMates([A, C, B], mates, 0), mates);
    expect(st.violated.size).toBe(0);
    expect(st.unconverged.size).toBe(2);
    expect(st.residual).toBeGreaterThan(1);
    const st2 = mateStatus(solveMates([A, C, B], mates), mates);
    expect(st2.unconverged.size).toBe(0);
    expect(st2.residual).toBeLessThan(1e-3);
  });
});

describe('chains and closed loops (QA 0.5.11 P0-3, F130, F141)', () => {
  it('M3: a chain of four blocks is solved whatever the order of the mates and of their references', () => {
    const parts = () => [comp('A', true), comp('B', false, 70), comp('C', false, -40), comp('D', false, 200)];
    const ab = mate('coincident', [top('A'), bottom('B')]), bc = mate('coincident', [top('B'), bottom('C')]), cd = mate('coincident', [top('C'), bottom('D')]);
    // the same chain with every mate's references the other way round
    const ba = mate('coincident', [bottom('B'), top('A')]), cb = mate('coincident', [bottom('C'), top('B')]), dc = mate('coincident', [bottom('D'), top('C')]);
    for (const mates of [[ab, bc, cd], [cd, bc, ab], [bc, cd, ab], [dc, cb, ba], [ba, dc, cb]]) {
      const out = solveMates(parts(), mates);
      expect(out.map((c) => c.position[1])).toEqual([0, 10, 20, 30].map((v) => expect.closeTo(v, 6)));
      const st = mateStatus(out, mates);
      expect(st.violated.size).toBe(0);
      expect(st.unconverged.size).toBe(0);
      // coincident faces leave every block free to slide and turn in the plane: (-)
      expect([st.components.A, st.components.B, st.components.C, st.components.D]).toEqual(['fixed', 'under', 'under', 'under']);
    }
  });

  it('M5: a closed loop that conflicts marks the newest mate; the part it moves is (+), the other one (-)', () => {
    const parts = () => [comp('A', true), comp('B', false, 40), comp('C', false, 90)];
    // B 10 above A, C on B (so 20 above A), and then C 25 above A: the loop A-B-C-A cannot close
    const ab = mate('distance', [top('A'), bottom('B')], { value: 10 }), bc = mate('coincident', [top('B'), bottom('C')]);
    const ac = mate('distance', [top('A'), bottom('C')], { value: 25 });
    const st = mateStatus(solveMates(parts(), [ab, bc, ac]), [ab, bc, ac]);
    expect([...st.violated]).toEqual([ac.id]);
    expect(st.components.C).toBe('over');
    expect(st.components.B).toBe('under');
    expect(st.components.A).toBe('fixed');
    // the loop made in another order: the mate added last is the one marked, the part it holds is (+)
    const st2 = mateStatus(solveMates(parts(), [bc, ac, ab]), [bc, ac, ab]);
    expect([...st2.violated]).toEqual([ab.id]);
    expect(st2.components.B).toBe('over');
    expect(st2.components.C).toBe('under');
  });

  it('F141: of two mates that disagree the newest is marked, whichever value it has', () => {
    for (const [first, last] of [[10, 20], [20, 10]]) {
      const A = comp('A', true), B = comp('B', false, 50);
      const mates = [mate('distance', [top('A'), bottom('B')], { value: first }), mate('distance', [top('A'), bottom('B')], { value: last })];
      const solved = solveMates([A, B], mates);
      const st = mateStatus(solved, mates);
      expect([...st.violated]).toEqual([mates[1].id]);
      // the older mate is the one the part keeps
      expect(solved[1].position[1]).toBeCloseTo(10 + first, 6);
    }
  });
});

describe('the convergence rule (QA 0.5.11 F186)', () => {
  it('a mate the solver has not settled yet is "not converged", never a conflict', () => {
    const A = comp('A', true), B = comp('B', false, 50);
    const mates = [mate('coincident', [top('A'), bottom('B')])];
    // the parts as they stand before any solve: B is 40 mm off
    const st = mateStatus([A, B], mates);
    expect(st.violated.size).toBe(0);
    expect([...st.unconverged]).toEqual([mates[0].id]);
    expect(st.residual).toBeGreaterThan(MATE_TOLERANCE);
  });
  it('a mate within the tolerance is met; just over it, not yet', () => {
    const A = comp('A', true);
    const met = [mate('coincident', [top('A'), bottom('B')])];
    expect(mateStatus([A, comp('B', false, 10 + MATE_TOLERANCE * 0.5)], met).unconverged.size).toBe(0);
    expect(mateStatus([A, comp('B', false, 10 + MATE_TOLERANCE * 2)], met).unconverged.size).toBe(1);
  });
  it('a conflict stays a conflict however long the solver runs', () => {
    const A = comp('A', true), B = comp('B', false, 50);
    const mates = [mate('distance', [top('A'), bottom('B')], { value: 10 }), mate('distance', [top('A'), bottom('B')], { value: 20 })];
    const st = mateStatus(solveMates([A, B], mates, 1000), mates);
    expect(st.violated.size).toBe(1);
    expect(st.unconverged.size).toBe(0);
  });
});

describe('conflict and not converged from the solver report (QA 0.5.13 F186)', () => {
  const pair = () => [comp('A', true), comp('B', false, 50)];
  it('CONFLICT: the solver itself names the mate it had to leave out; mateStatus marks that one', () => {
    const mates = [mate('distance', [top('A'), bottom('B')], { value: 10 }), mate('distance', [top('A'), bottom('B')], { value: 20 })];
    const rep = solveMatesReport(pair(), mates);
    expect(rep.conflict).toBe(mates[1].id);
    expect(rep.settled).toBe(true);
    const st = mateStatus(rep.out, mates, rep);
    expect([...st.violated]).toEqual([mates[1].id]);
    expect(st.unconverged.size).toBe(0);
    expect(st.components.B).toBe('over');
  });
  it('not converged: positions not solved yet, the solver settles and meets every mate, no conflict named', () => {
    const mates = [mate('coincident', [top('A'), bottom('B')])];
    const rep = solveMatesReport(pair(), mates);
    expect(rep).toMatchObject({ settled: true, conflict: null });
    const st = mateStatus(pair(), mates, rep);
    expect(st.violated.size).toBe(0);
    expect([...st.unconverged]).toEqual([mates[0].id]);
  });
  it('a stopped solve that still contracts is not converged, one that goes back and forth is a conflict', () => {
    const mates = [mate('coincident', [top('A'), bottom('B')])];
    const off = pair();
    const stopped = (rate: number) => ({ out: off, settled: false, conflict: null, passes: 16, last: 0.01, rate });
    const contracting = mateStatus(off, mates, stopped(0.5));
    expect([...contracting.unconverged]).toEqual([mates[0].id]);
    expect(contracting.violated.size).toBe(0);
    const cycling = mateStatus(off, mates, stopped(CYCLING_RATE));
    expect([...cycling.violated]).toEqual([mates[0].id]);
    expect(cycling.unconverged.size).toBe(0);
  });
  it('a given report is used as it is: no solve of its own inside mateStatus', () => {
    // two fixed blocks 40 mm apart with a coincident mate: no solve can meet it, a conflict ...
    const fixedPair = [comp('A', true), comp('B', true, 50)];
    const mates = [mate('coincident', [top('A'), bottom('B')])];
    const real = solveMatesReport(fixedPair, mates);
    expect(real).toMatchObject({ settled: true, conflict: null });
    expect([...mateStatus(fixedPair, mates).violated]).toEqual([mates[0].id]);
    // ... but a report whose solved positions meet it reads as not converged: the answer is the report's
    const met = [comp('A', true), comp('B', true, 10)];
    expect([...mateStatus(fixedPair, mates, { ...real, out: met }).unconverged]).toEqual([mates[0].id]);
  });
  it('the assembly rebuild keeps the report of its own solve; mateStatus takes it only for the same document', () => {
    const mates = [mate('distance', [top('A'), bottom('B')], { value: 10 }), mate('distance', [top('A'), bottom('B')], { value: 20 })];
    const doc = { ...createDocument('Asm'), kind: 'assembly' as const, components: pair(), mates };
    const rb = rebuildAssembly(doc);
    const rep = reportOf(rb, doc.components, doc.mates);
    expect(rep?.conflict).toBe(mates[1].id);
    expect([...mateStatus(rb.components, mates, rep).violated]).toEqual([mates[1].id]);
    expect(reportOf(rb, doc.components, [...mates])).toBeUndefined();
  });
});
