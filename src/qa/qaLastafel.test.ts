/**
 * De lastafel op de schaarheftafel (voorbeelden/lastafel): elk onderdeel bouwt als één lichaam, de stand van de schaar
 * klopt met DCT's hoogtes (370 tot 1425 mm), de tafel ligt op de steunvlakken, het gatenraster telt 541 gaten, en in de
 * laagste, middelste en hoogste stand botst niets behalve de bedoelde verbindingen (rollen op hun baan, pennen in hun
 * ogen, de stang in de kap). Draai eerst: node voorbeelden/lastafel/maak-lastafel.mjs
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { rebuildDocument } from './rebuildStreng';
import { parseDocument } from '../core/document/persistence';
import { rebuildAssembly } from '../core/assembly/assembly';
import { echteBotsingen } from './overlap';
import { detectInterferences } from '../core/assembly/interference';
import type { Component, Document } from '../core/document/types';
// @ts-expect-error: de generator is plain JavaScript
import { M, stand, STANDEN, TAFELGATEN, samenstelling } from '../../voorbeelden/lastafel/maak-lastafel.mjs';

type Asm = Document & { components: Component[] };
const lees = (f: string) => parseDocument(readFileSync(`voorbeelden/lastafel/${f}`, 'utf8')) as Asm;
const SNEL = process.env.SNEL === '1';
// onderdelen die bewust uit losse stukken bestaan (één onderdeel in de stuklijst, meerdere stuks)
const STUKS: Record<string, number> = { Aanslagpennen: 6, Steunvlakken: 6, Wartels: 2, 'Ontgrendeling valbeveiliging': 2, Pedaalbladen: 2 };

describe('lastafel op heftafel', () => {
  const doc = lees('Lastafel.kcad');
  const delen = [...new Map(doc.components.map((c) => [c.part.name, c])).values()].filter((c) => !SNEL || !/^t\d$/.test(c.id));
  it.each(delen.map((c) => [c.part.name, c] as const))('%s bouwt als één lichaam', (_n, c) => {
    const r = rebuildDocument(c.part) as unknown as { bodies: unknown[]; errors: Record<string, string> };
    expect(r.errors).toEqual({});
    const stuks = Object.entries(STUKS).find(([k]) => c.part.name.startsWith(k))?.[1] ?? 1;
    expect(r.bodies.length).toBe(stuks);
  }, 300000);

  it('de schaar haalt 370 en 1425 mm zoals DCT, de rollen blijven op hun baan', () => {
    for (const H of [M.hMin, M.hMax]) {
      const s = stand(H);
      const rolA = s.FA[11] + Math.cos(s.th) * M.arm, rolB = s.FB[11] + Math.cos(s.th) * M.arm;
      expect(rolA - 45).toBeGreaterThan(450); // rolbaan boven vanaf z 450
      expect(rolA + 45).toBeLessThan(1135);
      expect(rolB - 45).toBeGreaterThan(400);
      expect(rolB + 45).toBeLessThan(1135);
    }
    expect(STANDEN.laag).toBe(370);
    expect(STANDEN.hoog).toBe(1425);
  });

  it('DG-raster: 12 x 24 rastergaten en 11 x 23 diagonale gaten', () => {
    expect(TAFELGATEN.g.length).toBe(288);
    expect(TAFELGATEN.d.length).toBe(253);
  });

  const BEDOELD = (a: string, b: string) => {
    const k = [a, b].sort().join('|');
    // pennen in ogen en bokken, rollen op de buis of astap, stang in de kap, slangen aan het aansluitblok
    return /^(c\d+\|c\d+|o2\|s1|s2\|s[56]|s1\|s[34]|c\d\|s2|c[15]\|o7|c\d\|h\d|h\d\|h\d|h\d\|o4|o5\|o6|p\d\|p\d|t\d\|t\d)$/.test(k);
  };
  it.each(Object.entries(STANDEN))('stand %s: niets botst behalve de bedoelde verbindingen', (_n, H) => {
    const d = samenstelling(H as number, { tafel: !SNEL });
    const r = rebuildAssembly(parseDocument(JSON.stringify(d)) as Asm);
    const fout = echteBotsingen(detectInterferences(r.bodies), r.bodies).filter((t: string) => {
      const [a, b] = t.split(':')[0].split(' x ').map((x) => x.trim());
      return !BEDOELD(a, b);
    });
    expect(fout).toEqual([]);
  }, 900000);
});
