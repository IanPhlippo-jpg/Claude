import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addArc, addLine, createSketch } from '../sketch/model';
import { REFERENCE_PLANE_DEFS } from './planes';
import { csg, meshVolume } from './solid';
import { ribGeometry } from './rib';

/** U-channel: floor 100 x 5 x 60 (x, y, z) with walls 5 thick at x = ±50, 30 high. */
function channel(): THREE.BufferGeometry {
  const outer = new THREE.BoxGeometry(100, 30, 60).translate(0, 15, 0);
  const inner = new THREE.BoxGeometry(90, 30, 61).translate(0, 20, 0);
  return csg(outer, inner, 'subtract');
}

describe('rib', () => {
  it('grows a wall from a line down to the floor and out to the walls (parallel to sketch)', () => {
    const body = channel();
    let s = createSketch('s', 'Sketch2', 'front');
    s = addLine(s, { x: -30, y: 20 }, { x: 30, y: 20 })[0];
    const r = ribGeometry(s, REFERENCE_PLANE_DEFS.front, body, { thickness: 4, side: 'both', direction: 'parallel', flip: false });
    expect(r.error).toBeUndefined();
    expect(r.geometry).not.toBeNull();
    const added = Math.abs(meshVolume(csg(body, r.geometry!, 'union'))) - Math.abs(meshVolume(body));
    // 90 (between the walls) x 15 (from y = 5 to 20) x 4
    expect(added).toBeGreaterThan(5400 * 0.95);
    expect(added).toBeLessThan(5400 * 1.05);
    r.geometry!.computeBoundingBox();
    const bb = r.geometry!.boundingBox!;
    expect(bb.min.z).toBeCloseTo(-2, 1);
    expect(bb.max.z).toBeCloseTo(2, 1);
    expect(bb.max.y).toBeCloseTo(20, 1);
  });

  it('First Side puts the thickness on one side of the plane; Flip toward the open top is an error', () => {
    const body = channel();
    let s = createSketch('s', 'Sketch2', 'front');
    s = addLine(s, { x: -30, y: 20 }, { x: 30, y: 20 })[0];
    const r = ribGeometry(s, REFERENCE_PLANE_DEFS.front, body, { thickness: 4, side: 'first', direction: 'parallel', flip: false });
    expect(r.geometry).not.toBeNull();
    r.geometry!.computeBoundingBox();
    const bb = r.geometry!.boundingBox!;
    expect(bb.max.y).toBeCloseTo(20, 1);
    expect(bb.min.z).toBeCloseTo(0, 1);
    expect(bb.max.z).toBeCloseTo(4, 1);
    // above a plain plate nothing can be reached
    const plate = new THREE.BoxGeometry(100, 10, 60).translate(0, 5, 0);
    expect(ribGeometry(s, REFERENCE_PLANE_DEFS.front, plate, { thickness: 4, side: 'first', direction: 'parallel', flip: true }).error).toMatch(/does not reach/);
  });

  it('a fin above a plate grows down to the plate only (nothing sticks through)', () => {
    const plate = new THREE.BoxGeometry(100, 10, 60).translate(0, 5, 0);
    let s = createSketch('s', 'Sketch2', 'front');
    s = addLine(s, { x: -30, y: 25 }, { x: 30, y: 25 })[0];
    const r = ribGeometry(s, REFERENCE_PLANE_DEFS.front, plate, { thickness: 4, side: 'both', direction: 'parallel', flip: false });
    expect(r.error).toBeUndefined();
    const added = Math.abs(meshVolume(csg(plate, r.geometry!, 'union'))) - Math.abs(meshVolume(plate));
    expect(added).toBeGreaterThan(3600 * 0.97);
    expect(added).toBeLessThan(3600 * 1.03);
    r.geometry!.computeBoundingBox();
    expect(r.geometry!.boundingBox!.min.y).toBeGreaterThan(9.9);
  });

  it('reports an error without a usable sketch', () => {
    const s = createSketch('s', 'Sketch2', 'front');
    expect(ribGeometry(s, REFERENCE_PLANE_DEFS.front, channel(), { thickness: 4, side: 'both', direction: 'parallel', flip: false }).error).toMatch(/line, arc or chain/);
  });
});

describe('rib draft', () => {
  it('a 4 mm rib with 2 degrees of draft gets thinner toward the floor; Draft outward makes it thicker', () => {
    const body = channel();
    let s = createSketch('s', 'Sketch2', 'front');
    s = addLine(s, { x: -30, y: 20 }, { x: 30, y: 20 })[0];
    const base = { thickness: 4, side: 'both' as const, direction: 'parallel' as const, flip: false };
    const vol = (o: object) => Math.abs(meshVolume(csg(body, ribGeometry(s, REFERENCE_PLANE_DEFS.front, body, { ...base, ...o }).geometry!, 'union'))) - Math.abs(meshVolume(body));
    const plain = vol({}), inward = vol({ draft: 2 }), outward = vol({ draft: 2, draftOutward: true });
    // over 15 mm the wall loses 2 x 15 x tan 2deg ~ 1.05 mm at the floor: about 13 % less volume on average
    expect(inward).toBeLessThan(plain * 0.9);
    expect(outward).toBeGreaterThan(plain * 1.1);
  });

  it('Rib Thickness At wall interface keeps the 4 mm where the drafted rib meets the floor, so it starts thicker', () => {
    const body = channel();
    let s = createSketch('s', 'Sketch2', 'front');
    s = addLine(s, { x: -30, y: 20 }, { x: 30, y: 20 })[0];
    const base = { thickness: 4, side: 'both' as const, direction: 'parallel' as const, flip: false, draft: 2 };
    const vol = (o: object) => Math.abs(meshVolume(csg(body, ribGeometry(s, REFERENCE_PLANE_DEFS.front, body, { ...base, ...o }).geometry!, 'union'))) - Math.abs(meshVolume(body));
    const plain = vol({ draft: 0 }), atSketch = vol({}), atWall = vol({ thicknessAt: 'wall' });
    expect(atWall).toBeGreaterThan(atSketch * 1.1);
    // 4 mm at the floor, thicker above: more than the undrafted rib
    expect(atWall).toBeGreaterThan(plain);
  });

  it('Type Natural continues an arc on its circle until the wall; Linear only goes on along the end tangents', () => {
    const body = channel();
    // an arc (centre x = 20, r = 30) on a plane 20 above the floor; its circle meets the wall at x = 45
    const plane = { ...REFERENCE_PLANE_DEFS.top, origin: [0, 20, 0] as [number, number, number] };
    const c = { x: 20, y: 0 }, at = (deg: number) => ({ x: c.x + 30 * Math.cos((deg * Math.PI) / 180), y: c.y + 30 * Math.sin((deg * Math.PI) / 180) });
    const s = addArc(createSketch('s', 'Sketch2', 'top'), c, at(150), at(210), true)[0];
    const base = { thickness: 2, side: 'both' as const, direction: 'normal' as const, flip: false };
    const vol = (o: object) => {
      const r = ribGeometry(s, plane, body, { ...base, ...o });
      expect(r.error).toBeUndefined();
      return Math.abs(meshVolume(csg(body, r.geometry!, 'union'))) - Math.abs(meshVolume(body));
    };
    const linear = vol({}), natural = vol({ ribType: 'natural' });
    // linear: the 60 degree arc (31 mm); natural: the circle from wall to wall (about 293 degrees, 153 mm)
    expect(natural).toBeGreaterThan(linear * 3);
  });
});
