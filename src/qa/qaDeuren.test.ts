/**
 * De bibliotheek stalen taatsdeuren (bibliotheek/taatsdeuren): elke stijl (100) rekent op een kleine, de standaard- en een
 * grote maat; de ruiten liggen binnen de vleugel en overlappen het staal niet; glas, panelen en staal vullen de vleugel; elk
 * onderdeel bouwt als één lichaam en in de samenstelling botst niets behalve de greep op zijn voeten.
 */
import { describe, expect, it } from 'vitest';
import { rebuildDocument } from './rebuildStreng';
import { parseDocument } from '../core/document/persistence';
import { rebuildAssembly } from '../core/assembly/assembly';
import { echteBotsingen } from './overlap';
import { detectInterferences } from '../core/assembly/interference';
import type { Component, Document } from '../core/document/types';
// @ts-expect-error: de bibliotheek is plain JavaScript
import { STIJLEN, ontwerp, lijsten, opp, kaderVan, veelhoek, minMaat } from '../../bibliotheek/taatsdeuren/deuren.mjs';
// @ts-expect-error: idem
import { band } from '../../bibliotheek/taatsdeuren/teken.mjs';
// @ts-expect-error: idem
import { samenstelling } from '../../bibliotheek/taatsdeuren/model.mjs';

type P = [number, number];
// klein (net boven de kleinste maat), standaard en groot
const maten = (s: { vleugels: number; std: { B: number; H: number } }) => { const m = minMaat(s); return [[m.B + 100, m.H + 200], [s.std.B, s.std.H], [Math.min(2400, m.B + (s.vleugels === 2 ? 900 : 500)), 3000]]; };

describe('taatsdeuren', () => {
  for (const s of STIJLEN) {
    it.each(maten(s))(`${s.id} %i x %i: ruiten binnen de vleugel, glas en staal vullen ze`, (B, H) => {
      const o = ontwerp(s.id, B, H);
      for (const v of [...o.vleugels, ...o.vast]) {
        expect(v.ruiten.length).toBeGreaterThan(0);
        let glas = 0;
        for (const p of v.ruiten as P[][]) {
          const [x0, y0, x1, y1] = kaderVan(p);
          expect(x0).toBeGreaterThanOrEqual(-0.01); expect(y0).toBeGreaterThanOrEqual(-0.01);
          expect(x1).toBeLessThanOrEqual(v.B + 0.01); expect(y1).toBeLessThanOrEqual(v.H + 0.01);
          expect(opp(p)).toBeGreaterThan(5000); // geen splinters glas (> 50 cm²)
          glas += opp(p);
        }
        // staal (de banden) + glas = de vorm van de vleugel, op 2 % (bogen als veelhoek, verstekken)
        const sys = o.sys, z = (d: { soort: string }) => (d.soort === 'roede' || d.soort === 'boog' ? sys.roede.zicht : sys.kader.zicht);
        const staal = v.delen.reduce((t: number, d: { a?: P; soort: string }) => t + opp(d.a ? veelhoek(d, z(d), v.B, v.H) : band(d, z(d))), 0);
        for (const p of (v.panelen ?? []) as P[][]) { expect(opp(p)).toBeGreaterThan(5000); glas += opp(p); } // panelen vullen mee
        const vorm = v.vorm ? opp(v.vorm) : v.B * v.H;
        if (o.vast.includes(v)) continue; // het zijlicht zit in het kozijn (geen eigen kader)
        expect(Math.abs(staal + glas - vorm) / vorm).toBeLessThan(0.02);
      }
      const L = lijsten(o);
      expect(L.zaag.length).toBeGreaterThan(3);
      expect(L.glas.reduce((t: number, r: { n: number }) => t + r.n, 0)).toBe([...o.vleugels, ...o.vast].reduce((t: number, v: { ruiten: unknown[] }) => t + v.ruiten.length, 0));
    });
  }

  it.each(STIJLEN.map((s: { id: string }) => s.id) as string[])('%s: model bouwt en botst niet', (id: string) => {
    const s = STIJLEN.find((x: { id: string }) => x.id === id);
    const doc = parseDocument(JSON.stringify(samenstelling(ontwerp(id, s.std.B, s.std.H), id))) as Document & { components: Component[] };
    for (const c of doc.components) {
      const r = rebuildDocument(c.part) as unknown as { bodies: unknown[]; errors: Record<string, string> };
      expect(r.errors, c.name).toEqual({});
      expect(r.bodies.length, c.name).toBe(1);
    }
    const r = rebuildAssembly(doc);
    const naam = new Map(doc.components.map((c) => [c.id, c.name]));
    // tegen een boog of glas: bogen worden als koorden getekend (mesh) en ronde ruiten zijn veelhoeken; een overlap
    // onder 1 cm³ (staal) of 6 cm³ (glas tegen een boog, langs de hele boog) is daar geen botsing
    const fout = echteBotsingen(detectInterferences(r.bodies), r.bodies).map((t: string) => {
      const [ids, mm] = t.split(':');
      const [a, b] = ids.split(' x ').map((x) => naam.get(x.trim()) ?? x);
      return { t: `${a} x ${b}:${mm}`, a, b, v: parseFloat(mm) };
    }).filter((f: { a: string; b: string; v: number }) => !(/^Greep/.test(f.a) && /^Greep/.test(f.b)) && !((/^Glas|^Paneel|boog/.test(f.a) || /^Glas|^Paneel|boog/.test(f.b)) && f.v < (/^Glas/.test(f.a) || /^Glas/.test(f.b) ? 6000 : 1000))).map((f: { t: string }) => f.t);
    expect(fout).toEqual([]);
  }, 120000);
});
