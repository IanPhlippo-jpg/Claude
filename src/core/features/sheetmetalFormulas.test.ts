import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument, type Document } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { edgeRef } from './edgesets';
import { REFERENCE_PLANE_DEFS } from './planes';
import { baseFlangeGeometry, bendAllowance, bendDeduction, edgeFlangeGeometry, flatLength, innerSetback, outerSetback, type SheetMetalParams } from './sheetmetal';
import { sheetMapping, unfoldGeometry } from './unfold';

/**
 * Sheet metal against the standard formulas (QA 0.5.11 P1-6, parity row 19), with numbers worked out by hand:
 *   BA  = (pi / 180) * angle * (R + K * T)
 *   OSSB = (R + T) * tan(angle / 2)          (outer setback, from the outer virtual sharp to the bend tangent line)
 *   BD  = 2 * OSSB - BA
 *   flat = legs to the outer virtual sharps - BD per bend  (= straight parts between the tangent lines + BA per bend)
 */
const TOL = 0.01;
const DEG = Math.PI / 180;
const cases = [
  // angle, R, T, K and the hand-worked BA / OSSB / BD
  { angle: 90, R: 1, T: 2, K: 0.5, BA: 3.14159, OSSB: 3, BD: 2.85841 },
  { angle: 90, R: 2, T: 1.5, K: 0.44, BA: 4.17832, OSSB: 3.5, BD: 2.82168 },
  { angle: 120, R: 3, T: 2, K: 0.4, BA: 7.95870, OSSB: 8.66025, BD: 9.36180 },
];
const params = (c: (typeof cases)[number]): SheetMetalParams => ({ thickness: c.T, bendRadius: c.R, kFactor: c.K });
const close = (a: number, b: number, tol = TOL) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(tol);
const size = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); return g.boundingBox!.getSize(new THREE.Vector3()); };

/** an L chain: leg a along +x, then a bend of `angle`, then leg b (both legs to the sketch-line virtual sharp) */
const lChain = (a: number, b: number, angle: number) => [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a + b * Math.cos(angle * DEG), y: b * Math.sin(angle * DEG) }];

/** a flat strip from one straight sketch line (the edge flange / hem goes on its far end at x = 100) */
function strip(c: (typeof cases)[number]): Document {
  const doc = createDocument();
  doc.sheetMetal = params(c);
  doc.sketches.s1 = addLine(createSketch('s1', 's1', 'front'), { x: 0, y: 0 }, { x: 100, y: 0 })[0];
  doc.features.push({ id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 40, midPlane: false, reverse: false } as never);
  return doc;
}
/** the far end edge (x = 100) on the upper face of the strip */
function endEdge(doc: Document) {
  const b = rebuildDocument(doc).bodies[0];
  const ends = b.edges.filter((e) => e.straight && Math.abs(e.length - 40) < 1e-3 && Math.abs(e.centroid.x - 100) < 1e-3);
  return edgeRef(ends.reduce((a, e) => (e.centroid.y > a.centroid.y ? e : a)));
}
function flatOf(doc: Document): THREE.Vector3 {
  doc.features.push({ id: 'fp', type: 'flatPattern', name: 'Flat-Pattern1', suppressed: false } as never);
  const r = rebuildDocument(doc);
  expect(r.errors).toEqual({});
  doc.features.pop();
  return size(r.bodies[0].geometry);
}

describe('sheet metal against the standard formulas', () => {
  for (const c of cases) {
    const tag = `${c.angle} deg R${c.R} T${c.T} K${c.K}`;
    it(`${tag}: bend allowance, setbacks and bend deduction`, () => {
      const p = params(c);
      close(bendAllowance(c.angle, c.R, p), c.BA, 1e-4);
      close(outerSetback(c.angle, c.R, p), c.OSSB, 1e-4);
      close(bendDeduction(c.angle, c.R, p), c.BD, 1e-4);
      close(innerSetback(c.angle, c.R), c.R * Math.tan((c.angle * DEG) / 2), 1e-9);
    });

    it(`${tag}: base flange flat length = legs - BD (sketch on the outer face) and the unfolded sheet has that length`, () => {
      const p = params(c);
      const chain = lChain(60, 50, c.angle);
      // material on the left: the L turns towards it, the sketch lines are the outer face
      const outer = 110 - c.BD;
      close(flatLength(chain, p), outer);
      const m = sheetMapping(chain, REFERENCE_PLANE_DEFS.front, p, false)!;
      close(m.length, outer);
      close(size(unfoldGeometry(baseFlangeGeometry(chain, REFERENCE_PLANE_DEFS.front, p, 40, false)!, m)).x, outer);
      // material on the right: the sketch lines are the inner face, legs to the inner virtual sharp
      const inner = 110 - 2 * c.R * Math.tan((c.angle * DEG) / 2) + c.BA;
      close(flatLength(chain, p, true), inner);
      const mr = sheetMapping(chain, REFERENCE_PLANE_DEFS.front, p, true)!;
      close(mr.length, inner);
      close(size(unfoldGeometry(baseFlangeGeometry(chain, REFERENCE_PLANE_DEFS.front, p, 40, false, true)!, mr)).x, inner);
    });

    it(`${tag}: Flat-Pattern of a base flange in the rebuild`, () => {
      const doc = createDocument();
      doc.sheetMetal = params(c);
      const ch = lChain(60, 50, c.angle);
      doc.sketches.s1 = addLine(addLine(createSketch('s1', 's1', 'front'), ch[0], ch[1])[0], ch[1], ch[2])[0];
      doc.features.push({ id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 40, midPlane: false, reverse: false } as never);
      const s = flatOf(doc);
      close(s.x, 110 - c.BD);
      close(s.z, 40);
      close(s.y, c.T);
    });

    it(`${tag}: edge flange (Material Inside, outer virtual sharp 30) folded 100 x 30, flat = 100 + 30 - BD`, () => {
      const doc = strip(c);
      doc.features.push({ id: 'ef', type: 'edgeFlange', name: 'Edge-Flange1', suppressed: false, edge: endEdge(doc), angle: c.angle, length: 30, lengthMode: 'outerSharp', position: 'materialInside', flip: false } as never);
      const r = rebuildDocument(doc);
      expect(r.errors).toEqual({});
      if (c.angle === 90) {
        // the part's sizes are the dimensions to the outer virtual sharps
        const folded = size(r.bodies[0].geometry);
        close(folded.x, 100);
        close(folded.y, 30);
      }
      close(flatOf(doc).x, 100 + 30 - c.BD);
    });
  }

  it('edge flange Material Outside: the bend starts at the edge, flat = (100 + OSSB) + 30 - BD', () => {
    const c = cases[1];
    const doc = strip(c);
    doc.features.push({ id: 'ef', type: 'edgeFlange', name: 'Edge-Flange1', suppressed: false, edge: endEdge(doc), angle: 90, length: 30, lengthMode: 'outerSharp', position: 'materialOutside', flip: false } as never);
    close(flatOf(doc).x, 100 + c.OSSB + 30 - c.BD);
  });

  it('flange length to the outer / inner virtual sharp (90 and 120 degrees)', () => {
    for (const c of [cases[0], cases[2]]) {
      const p = params(c);
      // sheet: y in [-T, 0], the edge at x = 0 on the face y = 0; the flange bends up (+y), Material Inside
      const base = { a: [0, 0, -20] as [number, number, number], b: [0, 0, 20] as [number, number, number], faceNormal: [0, 1, 0] as [number, number, number], faceCentroid: [-50, 0, 0] as [number, number, number], angle: c.angle, length: 30, position: 'materialInside' as const, flip: false };
      const th = c.angle * DEG;
      // the leg runs along (cos th, sin th); Material Inside moves the bend back by the outer setback
      const dir = new THREE.Vector2(Math.cos(th), Math.sin(th));
      const shift = -outerSetback(c.angle, c.R, p);
      for (const mode of ['outerSharp', 'innerSharp'] as const) {
        const g = edgeFlangeGeometry({ ...base, lengthMode: mode }, p).geometry!;
        const pos = g.getAttribute('position');
        // outer virtual sharp: the outer face y = -T meets the outer leg face (at the edge, x = 0); inner: y = 0 meets the inner leg face
        const sharp = mode === 'outerSharp' ? new THREE.Vector2(shift + (c.R + c.T) * Math.tan(th / 2), -c.T) : new THREE.Vector2(shift + c.R * Math.tan(th / 2), 0);
        if (mode === 'outerSharp') close(sharp.x, 0, 1e-9);
        let far = -Infinity;
        for (let i = 0; i < pos.count; i++) far = Math.max(far, (pos.getX(i) - sharp.x) * dir.x + (pos.getY(i) - sharp.y) * dir.y);
        close(far, 30);
      }
    }
  });

  it('hems: closed (Material Inside) and open (Material Outside) add length + BA(180) - setback to the flat', () => {
    const c = cases[0];
    const closed = strip(c);
    closed.features.push({ id: 'h', type: 'hem', name: 'Hem1', suppressed: false, edge: endEdge(closed), hemType: 'closed', length: 12, gap: 0, position: 'materialInside', flip: false } as never);
    expect(rebuildDocument(closed).errors).toEqual({});
    const r0 = 0.01; // a closed hem: an (almost) zero inner radius
    close(flatOf(closed).x, 100 + 12 + Math.PI * (r0 + c.K * c.T) - (r0 + c.T));
    const open = strip(c);
    open.features.push({ id: 'h', type: 'hem', name: 'Hem1', suppressed: false, edge: endEdge(open), hemType: 'open', length: 12, gap: 2, position: 'materialOutside', flip: false } as never);
    expect(rebuildDocument(open).errors).toEqual({});
    // gap 2: inner radius 1, the bend starts at the edge
    close(flatOf(open).x, 100 + 12 + Math.PI * (1 + c.K * c.T));
  });

  it('Bend Allowance and Bend Deduction types: the unfolded sheet follows the given value', () => {
    const c = cases[1];
    const chain = lChain(60, 50, 90);
    const plane = REFERENCE_PLANE_DEFS.front;
    const g = baseFlangeGeometry(chain, plane, params(c), 40, false)!;
    // Bend Deduction 3.1 (per 90 degrees): flat = 110 - 3.1
    const pd: SheetMetalParams = { ...params(c), allowanceType: 'bendDeduction', allowanceValue: 3.1 };
    close(size(unfoldGeometry(g, sheetMapping(chain, plane, pd)!)).x, 110 - 3.1);
    close(flatLength(chain, pd), 110 - 3.1);
    // Bend Allowance 4.5 (per 90 degrees): flat = 110 - 2 * OSSB + 4.5
    const pa: SheetMetalParams = { ...params(c), allowanceType: 'bendAllowance', allowanceValue: 4.5 };
    close(size(unfoldGeometry(g, sheetMapping(chain, plane, pa)!)).x, 110 - 2 * c.OSSB + 4.5);
    close(flatLength(chain, pa), 110 - 2 * c.OSSB + 4.5);
  });
});
