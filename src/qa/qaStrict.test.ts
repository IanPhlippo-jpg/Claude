/**
 * Strict QA tests on the mesh kernel (QA report 0.5.10, F152): the volume after a fillet must be the known exact value
 * within the tessellation's margin, and a fillet must never add material to a convex edge (F139).
 */
import { describe, expect, it } from 'vitest';
import { rebuildDocument } from '../core/features/rebuild';
import { meshVolume } from '../core/features/solid';
import { fillet, holeVariant, setCircleRadius, t1, T1_EXPECT, t3, t3Slot, T3_WITH_SLOT_EXPECT, RIM_LOSS, CORNER, T3_SHARP } from './qaModels';

const vol = (doc: Parameters<typeof rebuildDocument>[0]) => {
  const r = rebuildDocument(doc);
  expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
  return { v: Math.abs(meshVolume(r.bodies[0].geometry)), r };
};
/** the volume of the same part without its fillet: the loss is measured against the part's own faceted hole */
const sharpOf = (doc: Parameters<typeof rebuildDocument>[0]) => Math.abs(meshVolume(rebuildDocument({ ...doc, features: doc.features.filter((f) => (f as { type: string }).type !== 'fillet') }).bodies[0].geometry));

describe('QA T1: fillet R2 on the rim of a hole (mesh kernel)', { timeout: 60000 }, () => {
  it('removes the Pappus volume at Ø35 and follows the hole to Ø50 (hole in the plate sketch)', () => {
    const { doc, rim, sharp } = t1(17.5);
    doc.features.push(fillet('r1', 2, [rim]));
    const a = vol(doc);
    const loss35 = sharpOf(doc) - a.v;
    expect(loss35, `loss at Ø35: ${loss35.toFixed(2)} (expected ${RIM_LOSS(17.5, 2).toFixed(2)})`).toBeGreaterThan(RIM_LOSS(17.5, 2) * 0.95);
    expect(loss35).toBeLessThan(RIM_LOSS(17.5, 2) * 1.05);
    expect(Math.abs(a.v - T1_EXPECT(17.5)) / sharp).toBeLessThan(0.003);
    expect(a.r.warnings ?? {}).toEqual({});
    setCircleRadius(doc, 's1', 25);
    const b = vol(doc);
    const loss50 = sharpOf(doc) - b.v;
    expect(loss50, `loss at Ø50: ${loss50.toFixed(2)} (expected ${RIM_LOSS(25, 2).toFixed(2)})`).toBeGreaterThan(RIM_LOSS(25, 2) * 0.95);
    expect(loss50).toBeLessThan(RIM_LOSS(25, 2) * 1.05);
    expect(b.r.warnings ?? {}).toEqual({});
  });

  // F139: a hole cut by a second feature leaves a rim of facets a few thousandths apart; the fillet used to fall back
  // to a tool per facet, some of which failed, and the plate gained volume with only a "not closed" warning
  for (const how of ['cut', 'holeTool', 'bottomRim'] as const) {
    it(`removes the Pappus volume on the rim of a hole made by ${how === 'cut' ? 'an extruded cut' : how === 'holeTool' ? 'the Hole Tool' : 'the plate sketch, on the bottom face'}`, () => {
      const { doc, rim } = holeVariant(how);
      doc.features.push(fillet('r1', 2, [rim]));
      const a = vol(doc);
      const loss = sharpOf(doc) - a.v;
      expect(loss, `loss: ${loss.toFixed(2)} (expected ${RIM_LOSS(17.5, 2).toFixed(2)})`).toBeGreaterThan(RIM_LOSS(17.5, 2) * 0.95);
      expect(loss).toBeLessThan(RIM_LOSS(17.5, 2) * 1.05);
      expect(a.r.warnings ?? {}).toEqual({});
      if (how === 'cut') {
        setCircleRadius(doc, 's2', 25);
        const b = vol(doc);
        const loss50 = sharpOf(doc) - b.v;
        expect(loss50, `loss at Ø50: ${loss50.toFixed(2)}`).toBeGreaterThan(RIM_LOSS(25, 2) * 0.95);
        expect(loss50).toBeLessThan(RIM_LOSS(25, 2) * 1.05);
        expect(b.r.warnings ?? {}).toEqual({});
      }
    });
  }
});

describe('QA T3: fillet on an edge that a later inserted slot splits (mesh kernel)', { timeout: 60000 }, () => {
  for (const slot of ['through', 'throughFromFace', 'blind5', 'stadium'] as const) {
    it(`rounds both pieces of the split edge and nothing else (${slot})`, () => {
      const { doc, edge } = t3();
      doc.features.push(fillet('r1', 2, [edge]));
      t3Slot(doc, slot);
      doc.features.splice(1, 0, doc.features.pop()!);
      const { v } = vol(doc);
      const expect3 = T3_WITH_SLOT_EXPECT(slot);
      // the facets of the round and of the half round of the stadium keep the mesh a little under the exact value
      expect(Math.abs(v - expect3), `${v.toFixed(2)} vs ${expect3.toFixed(2)}`).toBeLessThan(slot === 'stadium' ? 25 : 1.5);
      expect(v).toBeLessThan(T3_SHARP - 2 * 35 * CORNER(2) + 1.5);
    });
  }
});
