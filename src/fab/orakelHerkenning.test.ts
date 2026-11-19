/**
 * Two corrections of the recognition found next to the library oracles (src/qa/fabOrakel.test.ts, docs/36 LF4): the
 * axis of a bar with one mitred end, and the glass laths of the pivot doors in the catalogue.
 */
import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../core/sketch/model';
import { createDocument, type Document, type Feature } from '../core/document/types';
import { documentBodies } from './bodies';
import { recognizeAll } from './recognize';
import { profileById } from './catalog';

/** a closed polygon in the front plane (x, y), extruded `depth` along z */
function prism(name: string, pts: [number, number][], depth: number): Document {
  const d = createDocument(name);
  d.material = { name: 'S235', density: 7850, color: '#888888' };
  let s = createSketch('s1', 's1', 'front');
  for (let i = 0; i < pts.length; i++) s = addLine(s, { x: pts[i][0], y: pts[i][1] }, { x: pts[(i + 1) % pts.length][0], y: pts[(i + 1) % pts.length][1] })[0];
  d.sketches.s1 = s;
  d.features.push({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false } as unknown as Feature,
    { id: 'e1', type: 'extrude', name: name, sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth, reverse: false } as unknown as Feature);
  return d;
}
const rec = (d: Document) => recognizeAll(documentBodies(d))[0];

describe('recognition corrections from the oracle comparison', () => {
  it('a solid 40 x 40 with one end mitred 45°: angles 0 and 45 and the long side, not 0,3 / 45,3 (axis tilted by the mitre face)', () => {
    // the post of the frame of TD-01: square on the floor, mitred at the top
    const r = rec(prism('Stijl', [[0, 0], [40, 0], [40, 2355], [0, 2395]], 40));
    expect([r.hoek1, r.hoek2]).toEqual([0, 45]);
    expect(Math.abs((r.lengte ?? 0) - 2395)).toBeLessThan(0.05);
    // the same with both ends square stays square
    const q = rec(prism('Recht', [[0, 0], [40, 0], [40, 2395], [0, 2395]], 40));
    expect([q.hoek1, q.hoek2, Math.round(q.lengte ?? 0)]).toEqual([0, 0, 2395]);
  });

  it('the glass laths of the pivot doors: platstaal 15 x 4 and hoeklijn 15 x 15 x 3; a strip 16 x 4 is no catalogue profile', () => {
    const lat = rec(prism('Glaslat voor', [[0, 0], [822, 0], [822, 15], [0, 15]], 4));
    expect([lat.soort, profileById(lat.profielId)?.naam, Math.round(lat.lengte ?? 0)]).toEqual(['profiel', 'Platstaal 15 x 4', 822]);
    const hoek = rec(prism('Glaslat achter', [[0, 0], [15, 0], [15, 3], [3, 3], [3, 15], [0, 15]], 822));
    expect([hoek.soort, profileById(hoek.profielId)?.naam]).toEqual(['profiel', 'Hoekstaal 15 x 15 x 3']);
    // the kg/m of the small angle comes from the door library and says so: no norm table behind it
    expect(profileById(hoek.profielId)?.kgPerM.bron).toMatch(/taatsdeuren/);
    const breed = rec(prism('Strip', [[0, 0], [822, 0], [822, 16], [0, 16]], 4));
    expect(breed.soort).not.toBe('profiel');
  });
});
