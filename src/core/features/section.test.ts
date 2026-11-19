import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { capTriangles, chainLoops, sectionBody, sectionPlaneOf } from './section';
import { meshVolume } from './solid';

const cube = () => new THREE.BoxGeometry(20, 20, 20);

describe('section view', () => {
  it('one plane keeps the half behind it, with a cap', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 0, flip: false }]);
    r.body.computeBoundingBox();
    expect(r.body.boundingBox!.max.z).toBeCloseTo(0, 3);
    expect(r.cap).not.toBeNull();
  });
  it('two planes cut a quarter out (planar)', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 0, flip: false }, { plane: 'right', offset: 0, flip: false }]);
    const g = new THREE.BufferGeometry();
    const all = [...(r.body.getAttribute('position').array as Float32Array), ...(r.cap!.getAttribute('position').array as Float32Array)];
    g.setAttribute('position', new THREE.Float32BufferAttribute(all, 3));
    expect(Math.abs(meshVolume(g))).toBeCloseTo(8000 * 0.75, 0);
  });
  it('zonal keeps the slab between two planes', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 5, flip: false }, { plane: 'front', offset: -5, flip: true }], 'zonal');
    r.body.computeBoundingBox();
    expect(r.body.boundingBox!.max.z).toBeCloseTo(5, 3);
    expect(r.body.boundingBox!.min.z).toBeCloseTo(-5, 3);
  });
  it('a tilted plane (45°) cuts diagonally', () => {
    const r = sectionBody(cube(), [{ plane: 'front', offset: 0, flip: false, rotX: 45 }]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...(r.body.getAttribute('position').array as Float32Array), ...(r.cap!.getAttribute('position').array as Float32Array)], 3));
    expect(Math.abs(meshVolume(g))).toBeCloseTo(4000, 0);
  });

  it('offsets a tilted plane perpendicular to the reference plane or to itself', () => {
    const ref = sectionPlaneOf({ plane: 'front', offset: 10, flip: false, rotX: 30 });
    const sel = sectionPlaneOf({ plane: 'front', offset: 10, flip: false, rotX: 30, offsetAlong: 'selected' });
    // Reference plane: the point moves along the front plane's normal (z); Selected plane: along the tilted normal
    expect(ref.point.z).toBeCloseTo(10);
    expect(Math.abs(ref.point.y)).toBeLessThan(1e-9);
    expect(sel.point.length()).toBeCloseTo(10);
    expect(sel.point.clone().normalize().dot(sel.normal)).toBeCloseTo(1);
  });

  // 0.5.14: the section of the fan housing (Afzuiging, stap 6) had a diagonal wedge of cap over the hollow inside. The
  // B-rep mesh is not watertight (T-junctions, float32 noise), the cut segments did not chain into closed loops, and the
  // triangulator closed every open chain with a straight line across the section.
  const area = (g: THREE.BufferGeometry) => {
    const p = g.getAttribute('position'), t = new THREE.Triangle(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let s = 0;
    for (let i = 0; i + 2 < p.count; i += 3) s += t.set(a.fromBufferAttribute(p, i), b.fromBufferAttribute(p, i + 1), c.fromBufferAttribute(p, i + 2)).getArea();
    return s;
  };
  /** a square tube 40 x 40 with a 20 x 20 hole along z (0..40): not indexed, T-junctions and float noise like a B-rep mesh */
  const leakyTube = () => {
    const sh = new THREE.Shape([new THREE.Vector2(-20, -20), new THREE.Vector2(20, -20), new THREE.Vector2(20, 20), new THREE.Vector2(-20, 20)]);
    sh.holes.push(new THREE.Path([new THREE.Vector2(-10, -10), new THREE.Vector2(-10, 10), new THREE.Vector2(10, 10), new THREE.Vector2(10, -10)]));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 40, bevelEnabled: false, steps: 3 }).toNonIndexed();
    const p = g.getAttribute('position'), out: number[] = [];
    let seed = 7;
    const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 8e-4; };
    const V = (i: number) => new THREE.Vector3().fromBufferAttribute(p, i).addScalar(noise());
    for (let i = 0; i + 2 < p.count; i += 3) {
      const [a, b, c] = [V(i), V(i + 1), V(i + 2)];
      // every other triangle split at the middle of an edge: a T-junction with its neighbour
      if ((i / 3) % 2) out.push(...a.toArray(), ...b.toArray(), ...c.toArray());
      else { const m = a.clone().lerp(b, 0.5); out.push(...a.toArray(), ...m.toArray(), ...c.toArray(), ...m.toArray(), ...b.toArray(), ...c.toArray()); }
    }
    const r = new THREE.BufferGeometry();
    r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    r.computeVertexNormals();
    return r;
  };
  it('caps a leaky mesh (T-junctions, float noise) flat over the material only, not over the hole', () => {
    const r = sectionBody(leakyTube(), [{ plane: 'front', offset: 20, flip: false }]);
    expect(area(r.cap!)).toBeCloseTo(40 * 40 - 20 * 20, 0);
    const p = r.cap!.getAttribute('position');
    for (let i = 0; i + 2 < p.count; i += 3) {
      const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
      expect(Math.abs(cx) < 10 && Math.abs(cy) < 10).toBe(false);
      expect(Math.abs(p.getZ(i) - 20)).toBeLessThan(1e-3);
      expect(r.cap!.getAttribute('normal').getZ(i)).toBe(1);
    }
  });
  it('chains shuffled segments with gaps into closed loops (outer and hole), never an open chain', () => {
    const sq = (h: number, z: number) => [[-h, -h], [h, -h], [h, h], [-h, h]].map(([x, y]) => new THREE.Vector3(x, y, z));
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    for (const [h, gap] of [[20, 0.05], [10, 3e-4]] as const) {
      const q = sq(h, 0);
      // every side in 5 pieces, every joint off by up to `gap`, one piece missing on the outer loop
      for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) {
        if (h === 20 && k === 2 && j === 3) continue;
        const a = q[k].clone().lerp(q[(k + 1) % 4], j / 5), b = q[k].clone().lerp(q[(k + 1) % 4], (j + 1) / 5);
        segs.push([a.addScalar(gap * ((j % 3) - 1)), b]);
      }
    }
    segs.reverse();
    const loops = chainLoops(segs);
    expect(loops.length).toBe(2);
    const cut = sectionPlaneOf({ plane: 'front', offset: 0, flip: false });
    const s = capTriangles(loops, cut).reduce((t, [a, b, c]) => t + new THREE.Triangle(a, b, c).getArea(), 0);
    expect(s).toBeCloseTo(1200, -1);
  });
});
