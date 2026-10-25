import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { baseFlangeGeometry } from './sheetmetal';
import { REFERENCE_PLANE_DEFS } from './planes';
import { meshVolume } from './solid';
import { foldGeometry, sheetMapping, unfoldGeometry } from './unfold';

const p = { thickness: 3, bendRadius: 3, kFactor: 0.5 };
const plane = REFERENCE_PLANE_DEFS.front;

describe('Unfold / Fold of a base flange', () => {
  for (const reverse of [false, true]) {
    it(`L sheet (material ${reverse ? 'right' : 'left'}): flat length = neutral length, round trip returns the folded sheet`, () => {
      const chain = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 30 }];
      const g = baseFlangeGeometry(chain, plane, p, 60, false, reverse)!;
      const m = sheetMapping(chain, plane, p, reverse)!;
      const flat = unfoldGeometry(g, m);
      flat.computeBoundingBox();
      const size = flat.boundingBox!.getSize(new THREE.Vector3());
      expect(size.y).toBeCloseTo(3, 2);
      expect(size.x).toBeCloseTo(m.length, 1);
      // K = 0.5: the neutral length times the thickness is the folded cross-section area
      const rel = (x: number, y: number) => Math.abs(Math.abs(x) - Math.abs(y)) / Math.abs(y);
      expect(rel(meshVolume(flat), meshVolume(g))).toBeLessThan(0.005);
      const back = foldGeometry(flat, m);
      expect(rel(meshVolume(back), meshVolume(g))).toBeLessThan(0.005);
      const a = g.index ? g.toNonIndexed().getAttribute('position') : g.getAttribute('position');
      const q = new THREE.Vector3();
      let worst = 0;
      for (let i = 0; i < a.count; i++) { q.fromBufferAttribute(a, i); worst = Math.max(worst, m.toFolded(m.toFlat(q)).distanceTo(q)); }
      expect(worst).toBeLessThan(1e-3);
    });
  }
});
