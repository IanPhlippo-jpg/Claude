import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { smoothNormals } from './edges';
import { createDocument } from '../document/types';
import { addCircle, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';

/**
 * QA 0.5.10 F161: a shading seam on cylinders and revolved bodies. The normals of a closed surface must be the same on
 * both sides of its seam (the column where the tessellation starts and ends) and follow the true surface normal, also
 * when the seam vertices differ by a rounding error and the triangles around a vertex are not symmetric.
 */

/** the side wall of a cylinder (axis Y, radius r, centre (cx, cz)) as loose triangles, the seam at angle a0 */
function cylinderWall(r: number, h: number, n: number, a0: number, cx: number, cz: number, seamNoise: number): THREE.BufferGeometry {
  const pts: number[] = [];
  const at = (i: number, y: number): [number, number, number] => {
    const a = a0 + (i / n) * Math.PI * 2;
    // the last column is the first one again, computed through a different path (as a boolean or a tessellator leaves it)
    const e = i === n ? seamNoise : 0;
    return [cx + r * Math.cos(a) + e, y, cz + r * Math.sin(a) - e];
  };
  for (let i = 0; i < n; i++) {
    const a = at(i, 0), b = at(i + 1, 0), c = at(i + 1, h), d = at(i, h);
    // one diagonal for every quad: the corners of a vertex see one triangle on one side and two on the other
    pts.push(...a, ...c, ...b, ...a, ...d, ...c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/** the largest angle (degrees) between the normals of vertices at the same place, and from the radial direction */
function seamReport(g: THREE.BufferGeometry, cx: number, cz: number, onWall: (y: number) => boolean) {
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  const groups = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    if (!onWall(pos.getY(i))) continue;
    const k = `${Math.round(pos.getX(i) * 100)},${Math.round(pos.getY(i) * 100)},${Math.round(pos.getZ(i) * 100)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(i);
  }
  let spread = 0, radial = 0;
  const n = new THREE.Vector3(), m = new THREE.Vector3(), rad = new THREE.Vector3();
  for (const idx of groups.values()) {
    for (const i of idx) {
      n.fromBufferAttribute(nor, i);
      rad.set(pos.getX(i) - cx, 0, pos.getZ(i) - cz).normalize();
      // a wall vertex on a rim also belongs to the cap (a crease): only the wall's own normals count
      if (Math.abs(n.y) > 0.5) continue;
      radial = Math.max(radial, (n.angleTo(rad) * 180) / Math.PI);
      for (const j of idx) {
        m.fromBufferAttribute(nor, j);
        if (Math.abs(m.y) > 0.5) continue;
        spread = Math.max(spread, (n.angleTo(m) * 180) / Math.PI);
      }
    }
  }
  return { spread, radial, groups: groups.size };
}

describe('smooth normals across the seam of a closed surface (F161)', () => {
  it('welds the seam of a cylinder wall whose seam vertices straddle the weld grid', () => {
    // the seam lies at x = 0.00005 (half a step of a 1e-4 grid): a rounding error of 1e-9 puts the two copies of the
    // seam column in different cells of a plain rounding key
    const r = 10;
    const g = cylinderWall(r, 20, 48, 0, 0.00005 - 1e-9 - r, 0, 2e-9);
    const out = smoothNormals(g, 30);
    const rep = seamReport(out, 0.00005 - 1e-9 - r, 0, () => true);
    expect(rep.spread).toBeLessThan(0.05);
    // the wall normal is the true surface normal everywhere (one diagonal per quad must not twist it)
    expect(rep.radial).toBeLessThan(0.05);
  });

  it('gives a radial normal at every vertex of a coarse wall with one diagonal per quad', () => {
    const g = cylinderWall(5, 8, 12, 0.3, 2, -3, 0);
    const rep = seamReport(smoothNormals(g, 40), 2, -3, () => true);
    expect(rep.spread).toBeLessThan(0.05);
    expect(rep.radial).toBeLessThan(0.05);
  });

  it('shows no seam on an extruded cylinder of the mesh kernel', () => {
    const doc = createDocument();
    doc.sketches.sk1 = addCircle(createSketch('sk1', 'Sketch1', 'top'), { x: 3.7, y: -1.2 }, 12.5)[0];
    doc.features.push({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 15, reverse: false });
    const body = rebuildDocument(doc).bodies[0];
    const g = smoothNormals(body.geometry, 30);
    // the wall away from the rims (the sketch's y is -z in the world)
    const rep = seamReport(g, 3.7, 1.2, (y) => y > 0.5 && y < 14.5);
    expect(rep.spread).toBeLessThan(0.5);
    const rimRep = seamReport(g, 3.7, 1.2, () => true);
    expect(rimRep.spread).toBeLessThan(0.5);
    expect(rimRep.radial).toBeLessThan(1);
  });
});
