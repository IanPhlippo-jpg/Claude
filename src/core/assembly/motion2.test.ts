import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { keyedPose, motorValue, playbackTime, simulateBasic, type Motor, type MotionStudy } from './motion';
import type { Component } from '../document/types';

const comp = (id: string, position: [number, number, number], fixed = false): Component => ({ id, name: id, part: { version: 1, name: id, units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [] } as never, position, rotation: [0, 0, 0, 1], fixed, suppressed: false });
const box = (x: number, y: number, z: number, s = 10) => new THREE.BoxGeometry(s, s, s).translate(x, y, z);

describe('motion study', () => {
  it('motor profiles: distance, segments, expression, linear constant', () => {
    const base: Motor = { id: 'm', name: 'M', componentId: 'c', motion: 'constant', rpm: 60, amplitude: 0, frequency: 1, reverse: false };
    expect(motorValue(base, 1)).toBeCloseTo(360, 6);
    expect(motorValue({ ...base, motion: 'distance', distance: 90, start: 1, duration: 2 }, 2)).toBeCloseTo(45, 6);
    expect(motorValue({ ...base, motion: 'segments', segments: [{ t0: 0, t1: 1, value: 10 }, { t0: 1, t1: 2, value: 0 }] }, 2)).toBeCloseTo(60, 6);
    expect(motorValue({ ...base, motion: 'expression', expression: '10*t' }, 3)).toBeCloseTo(30, 6);
    expect(motorValue({ ...base, kind: 'linear', speed: 5 }, 4)).toBeCloseTo(20, 6);
  });
  it('keys interpolate between the document pose and the key', () => {
    const c = comp('c', [0, 0, 0]);
    const p = keyedPose(c, [{ componentId: 'c', time: 2, position: [10, 0, 0], rotation: [0, 0, 0, 1] }], 1)!;
    expect(p.position.x).toBeCloseTo(5, 6);
  });
  it('playback modes', () => {
    expect(playbackTime('loop', 7, 5).t).toBeCloseTo(2, 6);
    expect(playbackTime('reciprocate', 7, 5).t).toBeCloseTo(3, 6);
    expect(playbackTime('normal', 7, 5).done).toBe(true);
  });
  it('Basic Motion: a part falls under gravity and stops on a fixed part in its contact group', () => {
    const comps = [comp('ground', [0, 0, 0], true), comp('block', [0, 50, 0])];
    const bodies = [{ id: 'ground', geometry: new THREE.BoxGeometry(100, 10, 100), mass: 1000 }, { id: 'block', geometry: box(0, 50, 0), mass: 100 }];
    const study: MotionStudy = { name: 'S', duration: 1, motors: [], type: 'basic', gravity: { dir: [0, -1, 0], g: 9810 }, contacts: [{ id: 'c', name: 'Contact1', componentIds: ['ground', 'block'] }], fps: 50 };
    const sim = simulateBasic(comps, bodies, study, []);
    const last = sim.frames.block[sim.frames.block.length - 1];
    // the block (bottom at y = 45) rests on the ground (top at y = 5): it fell about 40 mm, not through
    expect(last[1]).toBeLessThan(-35);
    expect(last[1]).toBeGreaterThan(-41);
    const free = simulateBasic(comps, bodies, { ...study, contacts: [] }, []);
    expect(free.frames.block[free.frames.block.length - 1][1]).toBeLessThan(-4000);
  });
  it('Basic Motion: a spring pulls a part back toward its free length', () => {
    const comps = [comp('wall', [0, 0, 0], true), comp('mass', [100, 0, 0])];
    const bodies = [{ id: 'wall', geometry: box(0, 0, 0), mass: 1000 }, { id: 'mass', geometry: box(100, 0, 0), mass: 100 }];
    const study: MotionStudy = { name: 'S', duration: 0.2, motors: [], type: 'basic', springs: [{ id: 's', name: 'S1', a: { componentId: 'mass', point: [0, 0, 0] }, b: { componentId: 'wall', point: [0, 0, 0] }, k: 1, freeLength: 50, damping: 0 }], fps: 100 };
    const sim = simulateBasic(comps, bodies, study, []);
    const xs = sim.frames.mass.map((f) => f[0]);
    expect(Math.min(...xs)).toBeLessThan(-10);
  });
});
