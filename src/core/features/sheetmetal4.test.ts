import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { formToolGeometry, gussetTools, ripTool, tabSlotTools, ventOpenArea, ventTool, chainEdges } from './sheetmetal4';
import { csg, meshVolume } from './solid';
import { bodyEdges, edgeRef } from './edgesets';
import type { PlaneDef } from '../document/types';

const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));
const XY: PlaneDef = { id: 'p', name: 'p', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
const circle = (cx: number, cy: number, r: number, n = 48) => Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos((2 * Math.PI * i) / n), y: cy + r * Math.sin((2 * Math.PI * i) / n) }));
const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(cx, cy, cz); return g; };

describe('sheet metal extras', () => {
  it('Vent: the cut is the boundary minus the ribs and the spar', () => {
    const boundary = { outer: circle(0, 0, 15), holes: [], area: Math.PI * 225 };
    const input = { regions: [boundary], ribs: [[{ x: -15, y: 0 }, { x: 15, y: 0 }], [{ x: 0, y: -15 }, { x: 0, y: 15 }]], spars: [circle(0, 0, 8)], fillIn: [], ribWidth: 3, sparWidth: 3 };
    const tool = ventTool(input, XY, 20)!;
    expect(tool).not.toBeNull();
    // through all both: the tool is 40 long; its volume / 40 is the open area
    const open = vol(tool) / 40;
    const est = ventOpenArea(input);
    expect(open).toBeGreaterThan(est * 0.9);
    expect(open).toBeLessThan(Math.PI * 225 * 0.8);
  });

  it('Forming Tool: a circular emboss adds a hollow bump of the sheet thickness', () => {
    const g = formToolGeometry({ shape: 'embossRound', plane: XY, at: { x: 0, y: 0 }, rotation: 0, flip: false, width: 20, length: 20, height: 4, thickness: 3 });
    // outer: r 10 from -3 to 4 (7 high); hollow: r 7 from below the sheet to 1
    expect(Math.abs(vol(g.add) - Math.PI * 100 * 7)).toBeLessThan(Math.PI * 100 * 7 * 0.02);
    expect(Math.abs(vol(g.cut) - Math.PI * 49 * 4.02)).toBeLessThan(Math.PI * 49 * 4.02 * 0.02);
    const sheet = box(0, 0, -1.5, 60, 60, 3);
    const pressed = csg(csg(sheet, g.add, 'union'), g.cut, 'subtract');
    // net: the bump above the sheet minus the hollow above the sheet (inside r 7 up to 1): pi(100·4 - 49·1) - the opened sheet pi·49·3
    const expected = 60 * 60 * 3 + Math.PI * (100 * 4 - 49 * 1) - Math.PI * 49 * 3;
    expect(Math.abs(vol(pressed) - expected)).toBeLessThan(expected * 0.01);
  });

  it('Rip: one corner edge of an open box is cut back by the gap on both faces', () => {
    const outer = box(0, 0, 0, 40, 40, 40), inner = box(0, 0, 0, 36, 60, 36);
    const tube = csg(outer, inner, 'subtract');
    const edges = bodyEdges(tube, 'b');
    const corner = edges.find((e) => e.straight && Math.abs(e.length - 40) < 0.1 && Math.abs(e.centroid.x - 20) < 0.1 && Math.abs(e.centroid.z - 20) < 0.1)!;
    expect(corner).toBeDefined();
    const tool = ripTool(tube, 'b', { edges: [edgeRef(corner)], gap: 0.5, direction: 'both', thickness: 2 });
    expect('error' in tool).toBe(false);
    const ripped = csg(tube, tool as THREE.BufferGeometry, 'subtract');
    // removed: len · t · (t + g)
    const removed = vol(tube) - vol(ripped);
    expect(Math.abs(removed - 40 * 2 * 2.5)).toBeLessThan(40 * 2 * 2.5 * 0.05);
  });

  it('Tab and Slot: tabs on the plate edge, matching slots through the upright', () => {
    const plate = box(0, 1.5, 0, 60, 3, 40); // x in [-30, 30], y in [0, 3]
    const upright = box(31.5, 0, 0, 3, 40, 40); // x in [30, 33]
    const edges = bodyEdges(plate, 'a');
    const top = edges.find((e) => e.straight && Math.abs(e.centroid.x - 30) < 0.1 && Math.abs(e.centroid.y - 3) < 0.1)!;
    expect(top).toBeDefined();
    const r = tabSlotTools(plate, 'a', { edge: edgeRef(top), slotFace: { normal: [-1, 0, 0], point: [30, 0, 0] }, tabLength: 10, tabHeight: 3, count: 3, edgeOffset: 2, clearance: 0.1, thickness: 3 }, 50);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    const withTabs = csg(plate, r.tabs, 'union');
    const slotted = csg(upright, r.slots, 'subtract');
    expect(Math.abs(vol(withTabs) - vol(plate) - 3 * 10 * 3 * 3)).toBeLessThan(10);
    expect(Math.abs(vol(upright) - vol(slotted) - 3 * 10.2 * 3.2 * 3)).toBeLessThan(10);
    expect(r.positions.length).toBe(3);
  });

  it('Gusset: a stiffener is pressed across the inside corner of an L', () => {
    const leg1 = box(20, 1.5, 0, 40, 3, 40); // horizontal, top face y = 3
    const leg2 = box(38.5, 20, 0, 3, 40, 40); // vertical at x in [37, 40], inner face x = 37
    const L = csg(leg1, leg2, 'union');
    const r = gussetTools(L, 'b', { faces: [{ normal: [0, 1, 0], point: [18, 3, 0] }, { normal: [-1, 0, 0], point: [37, 21, 0] }], depth: 10, width: 6, offset: null, flip: false, thickness: 3, bendRadius: 0 });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    const out = csg(csg(L, r.add, 'union'), r.cut, 'subtract');
    expect(vol(out)).toBeGreaterThan(0);
    expect(Math.abs(vol(out) - vol(L))).toBeGreaterThan(5);
    // the gusset sits in the middle of the bend line
    expect(Math.abs(r.centre.z)).toBeLessThan(1e-6);
  });

  it('Gusset: parallel faces are refused', () => {
    const r = gussetTools(box(0, 0, 0, 10, 10, 10), 'b', { faces: [{ normal: [0, 1, 0], point: [0, 5, 0] }, { normal: [0, -1, 0], point: [0, -5, 0] }], depth: 5, width: 3, offset: null, flip: false, thickness: 1, bendRadius: 0 });
    expect('error' in r).toBe(true);
  });

  it('chainEdges joins edges end to end', () => {
    const e = (a: [number, number, number], b: [number, number, number]) => ({ id: '', segments: [], points: [new THREE.Vector3(...a), new THREE.Vector3(...b)], closed: false, straight: true, length: 1, centroid: new THREE.Vector3() });
    const pts = chainEdges([e([0, 0, 0], [10, 0, 0]), e([10, 10, 0], [10, 0, 0]), e([-5, 0, 0], [0, 0, 0])]);
    expect(pts.length).toBe(4);
    expect(pts[0].x).toBe(-5);
    expect(pts[3].y).toBe(10);
  });
});
