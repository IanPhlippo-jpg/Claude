import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type DraftFeature, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

const cube = () => {
  const doc = createDocument('Draft');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: -40 }, { x: 0, y: -40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  const box: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false };
  return { doc, base: [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, box] };
};
const frustum = (h: number, a: number, deg: number) => { const t = a - 2 * h * Math.tan((deg * Math.PI) / 180); return (h / 3) * (a * a + t * t + a * t); };
const neutral = { normal: [0, -1, 0] as [number, number, number], point: [20, 0, 20] as [number, number, number], label: 'Face<1>' };
const oneFace = [{ normal: [1, 0, 0] as [number, number, number], point: [40, 20, 20] as [number, number, number], label: 'Face<2>' }];

describe('Draft options of the original', () => {
  it('Face propagation > All faces drafts every side face from one pick', () => {
    const { doc, base } = cube();
    doc.features = [...base, { id: 'd', type: 'draft', name: 'Draft1', suppressed: false, angle: 5, neutral, faces: oneFace, propagation: 'all' } as DraftFeature];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    expect(Math.abs(meshVolume(r.bodies[0].geometry) - frustum(40, 40, 5)) / frustum(40, 40, 5)).toBeLessThan(0.005);
  });
  it('Parting line > both sides tapers away from the parting line up and down', () => {
    const { doc, base } = cube();
    doc.features = [...base, { id: 'd', type: 'draft', name: 'Draft1', suppressed: false, angle: 5, neutral, faces: oneFace, propagation: 'all', draftType: 'parting', parting: { point: [40, 20, 20], label: 'Edge<1>' }, partingSides: 'both' } as DraftFeature];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const exp = 2 * frustum(20, 40, 5);
    expect(Math.abs(meshVolume(r.bodies[0].geometry) - exp) / exp).toBeLessThan(0.005);
  });
  it('Step draft keeps the part below the parting line straight', () => {
    const { doc, base } = cube();
    doc.features = [...base, { id: 'd', type: 'draft', name: 'Draft1', suppressed: false, angle: 5, neutral, faces: oneFace, propagation: 'all', draftType: 'step', parting: { point: [40, 20, 20], label: 'Edge<1>' } } as DraftFeature];
    const r = rebuildDocument(doc, null);
    const exp = 40 * 40 * 20 + frustum(20, 40, 5);
    expect(Math.abs(meshVolume(r.bodies[0].geometry) - exp) / exp).toBeLessThan(0.005);
  });
});
