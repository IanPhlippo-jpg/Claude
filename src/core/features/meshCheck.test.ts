import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { booleanMissed, isClosed, openArea, volumeUnchanged } from './meshCheck';
import { csg, meshVolume } from './solid';

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).toNonIndexed().translate(x, y, z);

/** a geometry of the given triangles (each three corners) */
function soup(tris: number[][][]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(2), 3));
  return g;
}

describe('closed check by edges (QA 0.5.14 P2-8b)', () => {
  it('finds two opposite holes (their oriented areas cancel)', () => {
    // a box 10 with its +x and -x sides taken away: a tube open at both ends
    const pos = box(10, 10, 10).getAttribute('position').array as Float32Array;
    const tube = new THREE.BufferGeometry();
    tube.setAttribute('position', new THREE.BufferAttribute(pos.slice(36), 3));
    expect(isClosed(tube)).toBe(false);
    expect(openArea(tube)).toBeCloseTo(200, 3);
  });
  it('still counts a closed box, one opening and a mesh with a T-junction correctly', () => {
    const b = box(10, 10, 10);
    expect(isClosed(b)).toBe(true);
    expect(openArea(b)).toBeLessThan(1e-9);
    const pos = b.getAttribute('position').array as Float32Array;
    const open = new THREE.BufferGeometry();
    open.setAttribute('position', new THREE.BufferAttribute(pos.slice(18), 3));
    expect(openArea(open)).toBeCloseTo(100, 3);
    // unit cube whose top face is a fan around a point halfway one top edge: the front face keeps that edge whole
    const c = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    const k = [0.5, 0, 1];
    const quad = (a: number, b: number, cc: number, d: number) => [[c[a], c[b], c[cc]], [c[a], c[cc], c[d]]];
    const t = soup([
      ...quad(0, 3, 2, 1), // bottom (-z)
      ...quad(0, 1, 5, 4), // front (-y): edge 4-5 whole
      ...quad(1, 2, 6, 5), // +x
      ...quad(2, 3, 7, 6), // +y
      ...quad(3, 0, 4, 7), // -x
      [k, c[5], c[6]], [k, c[6], c[7]], [k, c[7], c[4]], // top (+z): edge 4-5 in two pieces
    ]);
    expect(meshVolume(t)).toBeCloseTo(1, 9);
    expect(isClosed(t)).toBe(true);
    expect(openArea(t)).toBeLessThan(1e-9);
  });
  it('keeps calling a boolean result with T-junctions closed', () => {
    expect(isClosed(csg(box(10, 10, 10), box(4, 4, 20), 'subtract'))).toBe(true);
    expect(isClosed(csg(box(10, 10, 10), box(4, 4, 4, 5, 5, 5), 'union'))).toBe(true);
  });
});

describe('overlap check of a boolean whose volume did not change (QA 0.5.14 P2-8a)', () => {
  const body = box(10, 10, 10);
  it('gates on an unchanged volume only', () => {
    expect(volumeUnchanged('subtract', 1000, 160, 1000)).toBe(true);
    expect(volumeUnchanged('subtract', 1000, 160, 840)).toBe(false);
    expect(volumeUnchanged('union', 1000, 2000, 2000)).toBe(true);
    expect(volumeUnchanged('intersect', 1000, 160, 1000)).toBe(false);
    expect(volumeUnchanged('subtract', -1000, 160, 1000)).toBe(false);
  });
  it('refuses a cut that removed nothing although the tool goes through the body', () => {
    const tool = box(4, 4, 20);
    // the boolean "failed": the result is the body unchanged
    expect(booleanMissed('subtract', body, tool, body)).toMatch(/cut left material/);
    // a tool wholly inside (a closed void) that was not cut
    expect(booleanMissed('subtract', body, box(2, 2, 2), body)).toMatch(/cut left material/);
    // a small hole in a long beam: within the volume margin, still caught
    const beam = box(4000, 100, 100), pin = box(5, 5, 200, 1000, 0, 0);
    expect(volumeUnchanged('subtract', meshVolume(beam), meshVolume(pin), meshVolume(beam))).toBe(true);
    expect(booleanMissed('subtract', beam, pin, beam)).toMatch(/cut left material/);
  });
  it('refuses a union that dropped the tool', () => {
    const boss = box(4, 4, 4, 0, 0, 6);
    expect(booleanMissed('union', body, boss, body)).toMatch(/union lost a body/);
    expect(booleanMissed('union', box(1, 1, 1), body, box(1, 1, 1))).toMatch(/union lost a body/);
  });
  it('accepts correct results, tools clear of the body, touching tools and coplanar faces', () => {
    const tool = box(4, 4, 20);
    expect(booleanMissed('subtract', body, tool, csg(body, tool, 'subtract'))).toBeNull();
    // clear of the body: nothing to cut, the body stays as it is
    expect(booleanMissed('subtract', body, box(4, 4, 4, 20, 0, 0), body)).toBeNull();
    // touching one face from outside (a shared face), and only along an edge
    expect(booleanMissed('subtract', body, box(10, 10, 10, 10, 0, 0), body)).toBeNull();
    expect(booleanMissed('subtract', body, box(4, 4, 4, 7, 7, 0), body)).toBeNull();
    // a pocket whose tool is flush with the top face (coplanar faces)
    const pocket = box(4, 4, 3, 0, 0, 3.5);
    expect(booleanMissed('subtract', body, pocket, csg(body, pocket, 'subtract'))).toBeNull();
    // a union with a tool inside the body: the volume stays and that is right
    expect(booleanMissed('union', body, box(2, 2, 2), body)).toBeNull();
    const boss = box(4, 4, 4, 0, 0, 6);
    expect(booleanMissed('union', body, boss, csg(body, boss, 'union'))).toBeNull();
    // a boss sitting on the top face (touching only): the right result has both, the check does not object
    const onTop = box(4, 4, 4, 0, 0, 7);
    expect(booleanMissed('union', body, onTop, csg(body, onTop, 'union'))).toBeNull();
  });
});

describe('the boolean leaves console.warn alone (QA 0.5.14 P3-8)', () => {
  it('prints no deprecation notice and never replaces console.warn', () => {
    const orig = Object.getOwnPropertyDescriptor(console, 'warn')!;
    const calls: unknown[][] = [];
    let replaced = 0;
    let current: (...args: unknown[]) => void = (...args) => { calls.push(args); };
    Object.defineProperty(console, 'warn', { configurable: true, get: () => current, set: (v) => { replaced++; current = v; } });
    let r: THREE.BufferGeometry | undefined;
    try {
      r = csg(box(10, 10, 10), box(4, 4, 20), 'subtract');
      csg(box(10, 10, 10), box(4, 4, 4, 0, 0, 6), 'union');
    } finally {
      Object.defineProperty(console, 'warn', orig);
    }
    expect(Math.abs(meshVolume(r!))).toBeCloseTo(840, 0);
    expect(replaced).toBe(0);
    expect(calls).toEqual([]);
  });
});
