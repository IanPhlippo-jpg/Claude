import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cutList, endCapGeometry, findFaceOnBodies, findProfile, memberSegments, profileRegion, structuralMembers, weldGussetGeometry, type CornerTreatment, type ProfileType } from './weldments';
import { csg, meshVolume, planarFaces } from './solid';

/**
 * Frames against the norms and the cut list rules (QA 0.5.11 P2-11, parity row 20): the section areas of the ISO
 * profiles against the norm tables (EN 10219-2, EN 10365, EN 10279, EN 10056-1, EN 10220), and the cut list length of
 * every member of a 400 x 300 frame after its corner treatment.
 */
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));
const box = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); return g.boundingBox!.clone(); };
const close = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tol);

describe('frame profiles against the norm tables', () => {
  // type, size, height, width, the section area of the norm table (mm2)
  const table: [ProfileType, string, number, number, number][] = [
    ['square tube', '40 x 40 x 3', 40, 40, 421], // EN 10219-2 SHS 40 x 40 x 3: 4.21 cm2
    ['rectangular tube', '50 x 30 x 3', 50, 30, 421], // EN 10219-2 RHS 50 x 30 x 3: 4.21 cm2
    ['square tube', '40 x 40 x 4', 40, 40, 535], // EN 10219-2 SHS 40 x 40 x 4: 5.35 cm2
    ['sb beam', 'IPE 100', 100, 55, 1032], // EN 10365 IPE 100: 10.3 cm2
    ['c channel', 'CH 80 x 8', 80, 45, 1100], // EN 10279 UPN 80: 11.0 cm2
    ['angle iron', '40 x 40 x 4', 40, 40, 308], // EN 10056-1 L 40 x 40 x 4: 3.08 cm2
    ['pipe', '48.3 x 4.0', 48.3, 48.3, 557], // EN 10220 48.3 x 4.0: 5.57 cm2
  ];
  for (const [type, size, h, w, area] of table) {
    it(`${type} ${size}: ${w} x ${h}, area ${area} mm2 within 1 %`, () => {
      const p = findProfile('iso', type, size);
      expect(p.size).toBe(size);
      const r = profileRegion(p);
      const xs = r.outer.map((q) => q.x), ys = r.outer.map((q) => q.y);
      const ext = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].sort((x, y) => x - y);
      const want = [w, h].sort((x, y) => x - y);
      close(ext[0], want[0], 0.05);
      close(ext[1], want[1], 0.05);
      // the polygon the solid is built from (outer minus holes)
      const shoelace = (pts: { x: number; y: number }[]) => Math.abs(pts.reduce((s, q, i) => { const n = pts[(i + 1) % pts.length]; return s + q.x * n.y - n.x * q.y; }, 0) / 2);
      const poly = shoelace(r.outer) - r.holes.reduce((s, hh) => s + shoelace(hh), 0);
      expect(Math.abs(poly - area) / area).toBeLessThan(0.01);
      if (type !== 'pipe') expect(Math.abs(r.area - poly)).toBeLessThan(1e-6);
    });
  }
});

describe('cut list lengths of a 400 x 300 frame of 40 x 40 x 3 tube', () => {
  const region = profileRegion(findProfile('iso', 'square tube', '40 x 40 x 3'));
  // the path through the middle of the profile: 360 x 260, so the frame is 400 x 300 outside
  const path = [V(0, 0, 0), V(360, 0, 0), V(360, 260, 0), V(0, 260, 0), V(0, 0, 0)];
  const build = (corner: CornerTreatment, gap = 0) => structuralMembers(region, memberSegments([path]), corner, gap);
  const lengths = (ms: { length: number }[]) => ms.map((m) => m.length);

  it('End Miter: every member as long as the frame side along its outer edge (400, 300, 400, 300), 45 degree cuts', () => {
    const ms = build('endMiter');
    expect(ms).toHaveLength(4);
    [400, 300, 400, 300].forEach((L, i) => close(ms[i].length, L));
    [360, 260, 360, 260].forEach((L, i) => close(ms[i].pathLength, L));
    for (const m of ms) { close(m.angle1, 45, 1e-6); close(m.angle2, 45, 1e-6); }
    // the volume is the section times the path length (what one miter adds outside it takes away inside)
    ms.forEach((m) => expect(Math.abs(vol(m.geometry) / (region.area * m.pathLength) - 1)).toBeLessThan(0.005));
    // the cut list: two items of two
    const items = cutList(ms.map((m, i) => ({ id: `b${i}`, geometry: m.geometry, description: 'SQUARE TUBE 40 x 40 x 3', length: m.length, angle1: m.angle1, angle2: m.angle2 })));
    expect(items.map((it) => [it.quantity, Math.round(it.length * 100) / 100])).toEqual([[2, 400], [2, 300]]);
  });

  it('End Butt1: the first and third member run through (2 x 400), the others fit between them (2 x (300 - 2 x 40))', () => {
    const ms = build('endButt1');
    [400, 220, 400, 220].forEach((L, i) => close(lengths(ms)[i], L));
    // the frame is 400 x 300 outside and the members do not overlap
    const all = ms.map((m) => box(m.geometry)).reduce((a, b) => a.union(b));
    close(all.max.x - all.min.x, 400);
    close(all.max.y - all.min.y, 300);
    const common = (a: THREE.BufferGeometry, b: THREE.BufferGeometry) => { try { return vol(csg(a, b, 'intersect')); } catch { return 0; } };
    for (let i = 0; i < 4; i++) expect(common(ms[i].geometry, ms[(i + 1) % 4].geometry)).toBeLessThan(1);
  });

  it('End Butt2: the other way round (2 x 300, 2 x (400 - 2 x 40)); a weld gap shortens the butting members', () => {
    [320, 300, 320, 300].forEach((L, i) => close(lengths(build('endButt2'))[i], L));
    [400, 216, 400, 216].forEach((L, i) => close(lengths(build('endButt1', 2))[i], L));
  });

  it('an open L with End Butt1: the first member runs through, the second stops at it', () => {
    const ms = structuralMembers(region, memberSegments([[V(0, 0, 0), V(200, 0, 0), V(200, 150, 0)]]), 'endButt1');
    close(ms[0].length, 220);
    close(ms[1].length, 130);
  });
});

describe('end caps and gussets: thickness and place', () => {
  const region = profileRegion(findProfile('iso', 'square tube', '40 x 40 x 3'));
  const [tube] = structuralMembers(region, memberSegments([[V(0, 0, 0), V(100, 0, 0)]]), 'none');
  const end = planarFaces(tube.geometry, 'm').find((f) => !f.curved && f.normal[0] > 0.99 && f.centroid[0] > 50)!;

  it('End Cap outward: 5 thick beyond the end (outer face at x = 105); inward: flush with the end, 5 into the tube', () => {
    const out = box(endCapGeometry(tube.geometry, end, 5, 0, true)!);
    close(out.max.x, 105);
    expect(out.min.x).toBeGreaterThan(99.9); // touches the end face (a hair into it)
    const inw = box(endCapGeometry(tube.geometry, end, 5, 0, false)!);
    close(inw.max.x, 100);
    close(inw.min.x, 95);
    // an offset of 3 (the wall) brings the outline in on every side
    const inset = box(endCapGeometry(tube.geometry, end, 5, 3, false)!);
    close(inset.max.y - inset.min.y, 34, 0.05);
    close(inset.max.z - inset.min.z, 34, 0.05);
  });

  it('Gusset: 5 thick across the corner, the legs on the two faces, at the start of the corner with the offset', () => {
    const ms = structuralMembers(region, memberSegments([[V(0, 0, 0), V(200, 0, 0), V(200, 150, 0)]]), 'endMiter');
    const bodies = ms.map((m, i) => ({ id: `b${i}`, geometry: m.geometry }));
    const fa = findFaceOnBodies(bodies, { normal: [0, 1, 0], point: [100, 20, 0] })!;
    const fb = findFaceOnBodies(bodies, { normal: [-1, 0, 0], point: [180, 80, 0] })!;
    for (const location of ['mid', 'start'] as const) {
      const g = weldGussetGeometry(fa, fb, { profile: 'triangular', d1: 30, d2: 25, thickness: 5, location, offset: location === 'start' ? 2 : 0 });
      if ('error' in g) throw new Error(g.error);
      const b = box(g.geometry);
      // the corner line runs along z; the flats of the faces span z = -(20 - 6) .. (20 - 6) (R6 corners of the tube)
      close(b.max.z - b.min.z, 5, 0.01);
      close((b.max.z + b.min.z) / 2, location === 'mid' ? 0 : -14 + 2 + 2.5, 0.01);
      // the legs: 30 along the top face from the corner at x = 180, 25 up the inner face from y = 20
      close(b.min.x, 180 - 30, 0.05);
      close(b.max.y, 20 + 25, 0.05);
    }
  });
});
