import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cutList, endCapGeometry, findProfile, memberSegments, placedProfile, profileRegion, profileSizes, profileTypes, structuralMembers, trimByBodies, weldBeadGeometry, weldGussetGeometry, findFaceOnBodies } from './weldments';
import { csg, meshVolume, planarFaces } from './solid';

const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe('weldments', () => {
  it('profile library: ISO and ANSI types and sizes, a square tube region with the right area', () => {
    expect(profileTypes('iso')).toContain('square tube');
    expect(profileTypes('ansi inch')).toContain('pipe');
    expect(profileSizes('iso', 'square tube')).toContain('40 x 40 x 4');
    const p = findProfile('iso', 'square tube', '40 x 40 x 4');
    const r = profileRegion(p);
    expect(r.holes.length).toBe(1);
    // EN 10219-2 corner radii ro = 8, ri = 4: 1600 - 32 * 32 - (4 - pi) * (64 - 16); the arcs as chords lose a little
    expect(Math.abs(r.area - (1600 - 32 * 32 - (4 - Math.PI) * 48))).toBeLessThan(1.5);
    const rot = placedProfile(profileRegion(findProfile('iso', 'rectangular tube', '80 x 40 x 5')), 90, false);
    // a 90 degree rotation swaps the extents
    const xs = rot.outer.map((q) => q.x), ys = rot.outer.map((q) => q.y);
    expect(Math.abs(Math.max(...xs) - Math.min(...xs) - 40)).toBeLessThan(1e-6);
    expect(Math.abs(Math.max(...ys) - Math.min(...ys) - 80)).toBeLessThan(1e-6);
  });

  it('structural members: an L path gives two mitered tubes with the section area times the length', () => {
    const p = findProfile('iso', 'square tube', '40 x 40 x 4');
    const region = profileRegion(p);
    const segs = memberSegments([[V(0, 0, 0), V(200, 0, 0), V(200, 150, 0)]]);
    expect(segs.length).toBe(2);
    const built = structuralMembers(region, segs, 'endMiter');
    expect(built.length).toBe(2);
    // the miter: each member runs to the corner and is cut at 45 degrees: its volume is area * (length) exactly
    // (the triangle added on the outside equals the triangle removed on the inside)
    expect(Math.abs(vol(built[0].geometry) - region.area * 200)).toBeLessThan(region.area * 200 * 0.02);
    expect(Math.abs(vol(built[1].geometry) - region.area * 150)).toBeLessThan(region.area * 150 * 0.02);
    expect(Math.abs(built[0].angle2 - 45)).toBeLessThan(1e-6);
    expect(Math.abs(built[1].angle1 - 45)).toBeLessThan(1e-6);
    // the two members meet on the same miter plane: no real overlap (a coplanar-face sliver of the boolean at most)
    const common = vol(csg(built[0].geometry, built[1].geometry, 'intersect'));
    expect(common).toBeLessThan(region.area * 200 * 0.01);
  });

  it('structural members: End Butt1 runs the first member through and shortens the second', () => {
    const region = profileRegion(findProfile('iso', 'square tube', '40 x 40 x 4'));
    const built = structuralMembers(region, memberSegments([[V(0, 0, 0), V(200, 0, 0), V(200, 150, 0)]]), 'endButt1');
    expect(vol(built[0].geometry)).toBeGreaterThan(region.area * 200 * 1.05);
    expect(vol(built[1].geometry)).toBeLessThan(region.area * 150 * 0.95);
  });

  it('Trim/Extend by bodies removes the overlap', () => {
    const a = new THREE.BoxGeometry(100, 10, 10).toNonIndexed();
    const b = new THREE.BoxGeometry(10, 50, 10).toNonIndexed();
    b.translate(45, 20, 0);
    const trimmed = trimByBodies(a, [b]);
    // the overlap: x 40..50, y -5..5, z -5..5
    expect(Math.abs(vol(a) - vol(trimmed) - 10 * 10 * 10)).toBeLessThan(1);
  });

  it('End Cap closes a square tube end with a plate of the thickness', () => {
    const region = profileRegion(findProfile('iso', 'square tube', '40 x 40 x 4'));
    const [m] = structuralMembers(region, memberSegments([[V(0, 0, 0), V(100, 0, 0)]]), 'none');
    const faces = planarFaces(m.geometry, 'm').filter((f) => !f.curved && Math.abs(f.normal[0]) > 0.99);
    const end = faces.find((f) => f.centroid[0] > 50)!;
    expect(end).toBeDefined();
    const cap = endCapGeometry(m.geometry, end, 5, 0, false)!;
    expect(cap).not.toBeNull();
    // the cap spans the full 40 x 40 outline with its R8 corners (hole filled) and is 5 thick
    expect(Math.abs(vol(cap) - (1600 - (4 - Math.PI) * 64) * 5)).toBeLessThan(10);
    const inset = endCapGeometry(m.geometry, end, 5, 4, false)!;
    expect(Math.abs(vol(inset) - (32 * 32 - (4 - Math.PI) * 16) * 5)).toBeLessThan(10);
  });

  it('Gusset and Weld Bead sit in the corner between two members', () => {
    const region = profileRegion(findProfile('iso', 'square tube', '40 x 40 x 4'));
    const built = structuralMembers(region, memberSegments([[V(0, 0, 0), V(200, 0, 0), V(200, 150, 0)]]), 'endMiter');
    const bodies = built.map((m, i) => ({ id: `b${i}`, geometry: m.geometry }));
    // the inner faces of the corner: the top of the horizontal member (y = 20) and the inner face of the vertical one (x = 180)
    const fa = findFaceOnBodies(bodies, { normal: [0, 1, 0], point: [100, 20, 0] });
    const fb = findFaceOnBodies(bodies, { normal: [-1, 0, 0], point: [180, 80, 0] });
    expect(fa && fb).toBeTruthy();
    const g = weldGussetGeometry(fa!, fb!, { profile: 'triangular', d1: 30, d2: 30, thickness: 5, location: 'mid', offset: 0 });
    expect('error' in g).toBe(false);
    if ('error' in g) return;
    // a right triangle 30 x 30, 5 thick
    expect(Math.abs(vol(g.geometry) - 0.5 * 30 * 30 * 5)).toBeLessThan(30);
    expect(Math.abs(g.centre.z)).toBeLessThan(1e-6);
    const w = weldBeadGeometry(fa!, fb!, { size: 5 });
    expect('error' in w).toBe(false);
    if ('error' in w) return;
    // the corner runs along the flat of the faces: the member width less the R8 corners (24); the bead a 5 x 5 triangle (plus a small bulge) along it
    expect(Math.abs(w.length - 24)).toBeLessThan(0.5);
    expect(vol(w.geometry)).toBeGreaterThan(0.5 * 5 * 5 * 24 * 0.9);
    const wi = weldBeadGeometry(fa!, fb!, { size: 5, intermittent: { length: 10, pitch: 20 } });
    if (!('error' in wi)) expect(wi.pieces).toBe(2);
  });

  it('cut list groups identical bodies', () => {
    const region = profileRegion(findProfile('iso', 'square tube', '40 x 40 x 4'));
    const built = structuralMembers(region, memberSegments([[V(0, 0, 0), V(200, 0, 0)], [V(0, 100, 0), V(200, 100, 0)], [V(0, 200, 0), V(150, 200, 0)]]), 'none');
    const items = cutList(built.map((m, i) => ({ id: `b${i}`, geometry: m.geometry, description: 'TUBE 40x40x4', length: m.length })));
    expect(items.length).toBe(2);
    expect(items[0].quantity).toBe(2);
    expect(items[1].quantity).toBe(1);
    expect(items[0].name).toBe('Cut-List-Item1');
  });
});
