/**
 * De robotcel (voorbeelden/robotarm): elk onderdeel bouwt als één lichaam, de kinematica zet de grijper precies op de
 * deur, het bereik klopt met het typeplaatje, en in de cel botst niets behalve de bedoelde verbindingen (pennen van de
 * gewichtscompensatie, de zuigerstang in de cilinder). Draai eerst: node voorbeelden/robotarm/maak-robotarm.mjs
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { rebuildDocument } from './rebuildStreng';
import { parseDocument } from '../core/document/persistence';
import { rebuildAssembly } from '../core/assembly/assembly';
import { echteBotsingen } from './overlap';
import { detectInterferences } from '../core/assembly/interference';
import type { Component, Document } from '../core/document/types';
// @ts-expect-error: de generator is plain JavaScript
import { M, frames, ikNaarBeneden } from '../../voorbeelden/robotarm/maak-robotarm.mjs';

const cel = parseDocument(readFileSync('voorbeelden/robotarm/Robotcel.kcad', 'utf8')) as Document & { components: Component[] };
const pos = (m: number[]) => [m[3], m[7], m[11]];
// bedoelde contacten: de ogen en pennen van de gewichtscompensatie, de stang in de cilinder
const BEDOELD = new Set(['r3|r7', 'r6|r8', 'r7|r8']);
// het slangenpakket: de stukken lopen in elkaar over en de klemmen zitten om de slang
const slang = (id: string) => /^s\d+$/.test(id);

describe('robotcel', () => {
  const delen = [...new Map(cel.components.map((c) => [c.part.name, c])).values()];
  it.each(delen.map((c) => [c.part.name, c] as const))('%s bouwt als één lichaam', (_n, c) => {
    const r = rebuildDocument(c.part) as unknown as { bodies: unknown[]; errors: Record<string, string> };
    expect(r.errors).toEqual({});
    expect(r.bodies.length).toBe(1);
  }, 120000);

  it('de inverse kinematica zet het polsmidden waar gevraagd en de flens recht naar beneden', () => {
    for (const [x, y] of [[1950, 1324], [1500, 900], [2400, 1600]]) {
      const q = ikNaarBeneden(x, y), F = frames(q);
      const w = pos(F.F5);
      expect(w[0]).toBeCloseTo(x, 6);
      expect(w[1]).toBeCloseTo(y, 6);
      // de X-as van de flens wijst naar beneden
      expect(F.F6[4]).toBeCloseTo(-1, 9);
    }
  });

  it('bereik tot het polsmidden = 2700 mm (typeplaatje, R2700)', () => {
    expect(M.a1 + M.a2 + M.d4).toBe(2700);
  });

  it('het schuim van de grijper ligt op de deur en de deur op de rollen', () => {
    const r = rebuildAssembly(cel);
    const box = (id: string) => { const b = r.bodies.find((x) => x.id === id)!; b.geometry.computeBoundingBox(); return b.geometry.boundingBox!; };
    const deur = box('b3'), nappen = box('g3'), rollen = box('b2');
    expect(nappen.min.y).toBeCloseTo(deur.max.y, 1);
    expect(deur.min.y).toBeCloseTo(rollen.max.y, 1);
    // de deur ligt binnen het hek, de robot ook
    expect(deur.max.x).toBeLessThan(M.hek.x1);
    const voet = box('r1');
    expect(voet.min.x).toBeGreaterThan(M.hek.x0);
  }, 300000);

  it('niets botst behalve de bedoelde verbindingen', () => {
    const r = rebuildAssembly(cel);
    const fout = echteBotsingen(detectInterferences(r.bodies), r.bodies).filter((t: string) => {
      const [a, b] = t.split(':')[0].split(' x ').map((s) => s.trim());
      return !BEDOELD.has([a, b].sort().join('|')) && !(slang(a) && slang(b));
    });
    expect(fout).toEqual([]);
  }, 900000);

  it('het bovenaanzicht past in een hal van 8 x 8 m (hek, kast en bedienpaneel)', () => {
    const r = rebuildAssembly(cel), b = new THREE.Box3();
    for (const x of r.bodies) { x.geometry.computeBoundingBox(); b.union(x.geometry.boundingBox!); }
    const s = b.getSize(new THREE.Vector3());
    expect(Math.max(s.x, s.z)).toBeLessThan(8000);
  }, 300000);
});
