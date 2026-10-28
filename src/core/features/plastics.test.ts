import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { csg, meshVolume, planarFaces } from './solid';
import { domeOptions, domeTool, faceLoops, growPolygon, indentGeometry, mountingBossTools, offsetMesh, pickedFaceOn, rimBand, snapHookTool } from './plastics';
import type { MountingBossFeature, SnapHookFeature } from '../document/plasticsTypes';
import type { PlaneDef } from '../document/types';

const box = (x: number, y: number, z: number, at = new THREE.Vector3()) => { const g = new THREE.BoxGeometry(x, y, z).toNonIndexed(); g.translate(at.x, at.y, at.z); return g; };
const topFace = (g: THREE.BufferGeometry) => planarFaces(g, 'b').filter((f) => f.normal[1] > 0.99).sort((a, b) => b.centroid[1] - a.centroid[1])[0];
const SINK = 0.02;
const XZ: PlaneDef = { id: 't', name: 't', origin: [0, 5, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] };

describe('Dome (QA v0.5.1 F121)', () => {
  it('on a round face: a sphere segment of the given height', () => {
    const cyl = new THREE.CylinderGeometry(20, 20, 10, 64).toNonIndexed();
    const fl = faceLoops(cyl, topFace(cyl))!;
    expect(domeOptions(fl.loops[0])).toEqual({ round: true, continuous: false });
    const t = domeTool(fl.loops[0], fl.plane, { distance: 5 }) as THREE.BufferGeometry;
    // cap of height 5 on radius 20: pi h^2 (3 Rs - h) / 3 with Rs = 42.5, plus the sunk base
    const cap = (Math.PI * 25 * (3 * 42.5 - 5)) / 3;
    const base = Math.PI * 400 * SINK;
    expect(Math.abs(meshVolume(t) - cap - base) / cap).toBeLessThan(0.02);
    t.computeBoundingBox();
    expect(t.boundingBox!.max.y).toBeCloseTo(10, 1);
  });
  it('Elliptical dome: a half ellipsoid; distance 0: a half sphere', () => {
    const cyl = new THREE.CylinderGeometry(20, 20, 10, 64).toNonIndexed();
    const fl = faceLoops(cyl, topFace(cyl))!;
    const e = domeTool(fl.loops[0], fl.plane, { distance: 5, elliptical: true }) as THREE.BufferGeometry;
    expect(Math.abs(meshVolume(e) - (2 / 3) * Math.PI * 400 * 5) / 4189).toBeLessThan(0.03);
    const hemi = domeTool(fl.loops[0], fl.plane, { distance: 0 }) as THREE.BufferGeometry;
    expect(Math.abs(meshVolume(hemi) - (2 / 3) * Math.PI * 8000) / 16755).toBeLessThan(0.03);
  });
  it('on a square face: rises straight up from the edges to the distance at the centre; Reverse cuts in', () => {
    const b = box(40, 10, 40);
    const fl = faceLoops(b, topFace(b))!;
    expect(fl.loops[0].length).toBe(4);
    expect(domeOptions(fl.loops[0]).continuous).toBe(false);
    const t = domeTool(fl.loops[0], fl.plane, { distance: 8 }) as THREE.BufferGeometry;
    t.computeBoundingBox();
    expect(t.boundingBox!.max.y).toBeCloseTo(13, 1);
    // the corners stay on the face, the middle of an edge is already raised (a wall)
    const u = csg(b, t, 'union');
    expect(meshVolume(u)).toBeGreaterThan(16000 + 5000);
    const r = domeTool(fl.loops[0], fl.plane, { distance: 4, reverse: true }) as THREE.BufferGeometry;
    expect(meshVolume(csg(b, r, 'subtract'))).toBeLessThan(16000 - 2000);
  }, 30000);
  it('Continuous dome on a hexagon rises evenly from every edge', () => {
    const hex = new THREE.CylinderGeometry(20, 20, 10, 6).toNonIndexed();
    const fl = faceLoops(hex, topFace(hex))!;
    expect(domeOptions(fl.loops[0])).toEqual({ round: false, continuous: true });
    const t = domeTool(fl.loops[0], fl.plane, { distance: 6, continuous: true }) as THREE.BufferGeometry;
    const s = domeTool(fl.loops[0], fl.plane, { distance: 6 }) as THREE.BufferGeometry;
    // the continuous dome starts at height 0 on the edges: less material than the one with walls
    expect(meshVolume(t)).toBeLessThan(meshVolume(s));
    expect(meshVolume(t)).toBeGreaterThan(0);
  });
  it('a distance of 0 on a polygon is refused', () => {
    const b = box(10, 10, 10);
    const fl = faceLoops(b, topFace(b))!;
    expect(domeTool(fl.loops[0], fl.plane, { distance: 0 })).toHaveProperty('error');
  });
});

describe('Indent (QA v0.5.1 F121)', () => {
  it('offsetMesh grows a box exactly', () => {
    expect(meshVolume(offsetMesh(box(10, 10, 10), 1))).toBeCloseTo(1728, 3);
  });
  it('a plate wraps around a block pressed into it: pocket of the clearance, wall of the thickness', () => {
    const plate = box(100, 4, 100);
    const tool = box(10, 10, 10, new THREE.Vector3(0, 5, 0)); // half in the plate's top region, half above
    const cut = indentGeometry(plate, tool, 1, 2, true);
    // the cut takes out the tool grown by 1 inside the plate: 12 x 2(+1 below... top half) x 12
    const pocket = 12 * 12 * (2 - (5 - 6)); // grown tool spans y -1..11, the plate y -2..2: overlap 3
    expect(meshVolume(cut)).toBeCloseTo(40000 - pocket, 0);
    const ind = indentGeometry(plate, tool, 1, 2, false);
    // the wall: grown by 3 minus grown by 1, outside the plate, plus the plate minus the pocket
    const wallOutside = 16 * 16 * (13 - 2) - 12 * 12 * (11 - 2);
    const wallInside = 16 * 16 * 1; // y -3..-2 under the plate: the outer wall reaches y = -3, the pocket only y = -1
    expect(meshVolume(ind)).toBeCloseTo(40000 - pocket + wallOutside + wallInside, 0);
  });
});

describe('Mounting Boss (QA v0.5.1 F121)', () => {
  const f: MountingBossFeature = { id: 'mb', type: 'mountingBoss', name: 'Mounting Boss1', suppressed: false, plane: 't', point: { x: 0, y: 0 }, label: 'Face<1>', bossType: 'hardware', hardware: 'thread', pin: 'hole', height: 20, diameter: 10, draft: 0, holeDiameter: 4, holeDepth: 15, holeDraft: 0, fins: 4, finLength: 6, finHeight: 12, finWidth: 2, finAngle: 0 };
  it('a boss, four fins and the screw hole', () => {
    const t = mountingBossTools(f, XZ);
    if ('error' in t) throw new Error(t.error);
    expect(t.add.length).toBe(5);
    expect(t.cut.length).toBe(1);
    const boss = t.add[0].tool;
    expect(Math.abs(meshVolume(boss) - Math.PI * 25 * (20 + SINK)) / 1571).toBeLessThan(0.01);
    boss.computeBoundingBox();
    expect(boss.boundingBox!.max.y).toBeCloseTo(25, 3);
    // a fin: the profile (from 0.6 r1 to r0 + 6, full height at the boss, sloping to the face) times its width
    const fin = meshVolume(t.add[1].tool);
    const prof = (5 - 3) * (12 + SINK) + 0.5 * 6 * 12 + 6 * SINK;
    expect(fin).toBeCloseTo(prof * 2, 1);
  });
  it('draft makes the top narrower; a pin boss adds a pin; a head boss cuts through', () => {
    const d = mountingBossTools({ ...f, draft: 2, fins: 0 }, XZ) as Exclude<ReturnType<typeof mountingBossTools>, { error: string }>;
    expect(d.add[0].axis!.r1).toBeCloseTo(5 - 20 * Math.tan((2 * Math.PI) / 180), 6);
    const pin = mountingBossTools({ ...f, bossType: 'pin', pin: 'pin', fins: 0 }, XZ) as typeof d;
    expect(pin.add.length).toBe(2);
    expect(pin.cut.length).toBe(0);
    const head = mountingBossTools({ ...f, hardware: 'head', fins: 0 }, XZ) as typeof d;
    expect(head.cut[0].axis!.z0).toBeLessThan(-100);
  });
});

describe('Snap Hook and Lip/Groove (QA v0.5.1 F121)', () => {
  it('a snap hook: beam plus the overhanging lip', () => {
    const f: SnapHookFeature = { id: 'sh', type: 'snapHook', name: 'Snap Hook1', suppressed: false, plane: 't', point: { x: 0, y: 0 }, label: '', angle: 0, height: 15, thickness: 2, width: 6, lipHeight: 3, overhang: 1.5 };
    const g = snapHookTool(f, XZ) as THREE.BufferGeometry;
    const beam = 2 * (15 + SINK), lip = 1.5 * 0.6 + 0.5 * 1.5 * 2.4;
    expect(meshVolume(g)).toBeCloseTo((beam + lip) * 6, 1);
    expect(snapHookTool({ ...f, lipHeight: 20 }, XZ)).toHaveProperty('error');
  });
  it('lip on the rim of a shelled box, the groove matches it with the clearance', () => {
    const shelled = csg(box(40, 20, 30), box(36, 20, 26, new THREE.Vector3(0, 2, 0)), 'subtract');
    const rim = pickedFaceOn(shelled, 'b', { normal: [0, 1, 0], point: [19, 10, 0] })!;
    expect(rim).toBeTruthy();
    const lip = rimBand(shelled, rim, 1, 2, false) as THREE.BufferGeometry;
    // band 1 wide around the 36 x 26 opening, 2 high (+ the sunk part)
    const band = 38 * 28 - 36 * 26;
    expect(meshVolume(lip)).toBeCloseTo(band * (2 + SINK), 0);
    const groove = rimBand(shelled, rim, 1.2, 2.2, true) as THREE.BufferGeometry;
    groove.computeBoundingBox();
    expect(groove.boundingBox!.max.y).toBeLessThan(10.1);
    expect(groove.boundingBox!.min.y).toBeCloseTo(10 - 2.2 - SINK, 1);
    expect(rimBand(box(10, 10, 10), topFace(box(10, 10, 10)), 1, 1, false)).toHaveProperty('error');
  });
  it('growPolygon moves a square out by d', () => {
    expect(growPolygon([[0, 0], [10, 0], [10, 10], [0, 10]], 1)).toEqual([[-1, -1], [11, -1], [11, 11], [-1, 11]]);
  });
});
