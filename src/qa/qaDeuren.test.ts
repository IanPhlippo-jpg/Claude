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
// @ts-expect-error: idem
import { stukBladen } from '../../bibliotheek/taatsdeuren/stukblad.mjs';
// @ts-expect-error: idem
import { STAAF } from '../../bibliotheek/taatsdeuren/prijzen.mjs';
// @ts-expect-error: idem
import { verbindingen, explodeBlad } from '../../bibliotheek/taatsdeuren/explode.mjs';
// @ts-expect-error: idem
import { gewicht } from '../../bibliotheek/taatsdeuren/deuren.mjs';
// @ts-expect-error: idem
import { detailBladen, vorm3d, volume3d, profiel } from '../../bibliotheek/taatsdeuren/detail.mjs';
// @ts-expect-error: idem
import { zaagplan, bestelBlad } from '../../bibliotheek/taatsdeuren/bestel.mjs';
// @ts-expect-error: idem
import { kostprijs } from '../../bibliotheek/taatsdeuren/prijzen.mjs';

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

  // stuklijst: elk recht staafdeel (en de latten op de roeden) is een stuk; het gewicht van alle posities is dat van het
  // model; de bladen (stuklijst en onderdelen) worden getekend, met een kaart per positie
  it.each(STIJLEN.map((s: { id: string }) => s.id) as string[])('%s: stuklijst is volledig', (id: string) => {
    const s = STIJLEN.find((x: { id: string }) => x.id === id);
    // eigen kokers (enkel, dubbel glas met verdekte scharnieren) en de deurprofielen: Jansen Economy 50 (binnen), buiten
    // automatisch (Janisol Arte 2.0, of een koker als de stijl een boog heeft) en Forster unico met FritsJurgens
    for (const k of [{}, { scharnier: 'verdekt', opbouw: 'dubbel' }, { systeem: 'systeem' }, { gebruik: 'buiten' }, { systeem: 'forster', scharnier: 'premium' }, { systeem: 'darby' }]) {
      const o = ontwerp(id, s.std.B, s.std.H, k), { bladen, posities } = stukBladen(o, k);
      type Pos = { soort: string; naam: string; n: number; kg: number; pos: number };
      const delen = [o.kozijn, ...o.vleugels, ...o.vast].flatMap((g: { delen: { a?: P; soort: string }[] }) => g.delen.filter((d) => d.a));
      const roeden = delen.filter((d: { soort: string }) => d.soort === 'roede').length, lat = o.sys.roede.lat ? 1 : 0;
      const staven = (posities as Pos[]).filter((p) => p.soort === 'staaf' && /^(Kozijn|Kader|Roede)/.test(p.naam)).reduce((t, p) => t + p.n, 0);
      expect(staven, id).toBe(delen.length + roeden * 2 * lat);
      const kg = (posities as Pos[]).reduce((t, p) => t + p.kg * p.n, 0), G = gewicht(o, STAAF).totaal;
      expect(Math.abs(kg - G) / G, `${id} ${kg} tegen ${G}`).toBeLessThan(0.03);
      expect((posities as Pos[]).map((p) => p.pos)).toEqual((posities as Pos[]).map((_, i) => i + 1));
      const kaarten = (posities as Pos[]).filter((p) => p.soort !== 'inkoop').length;
      expect(bladen.length).toBe(1 + (posities.length > 57 ? 1 : 0) + Math.ceil(kaarten / 6));
      for (const b of bladen) expect(b).not.toMatch(/NaN|undefined/);
      // opengewerkte tekening: elk uiteinde (behalve de kozijnstijlen op de vloer) komt tegen een ander stuk; elke hoek
      // van het kader en de 2 bovenhoeken van een recht kozijn zijn een verstek
      const v = verbindingen(o, k), V = v.verbindingen.filter((j: { soort: string }) => j.soort === 'V').length;
      expect(v.los.map((l: { stuk: { d: { soort: string } }; q: P }) => `${l.stuk.d.soort}@${l.q.map(Math.round)}`), id).toEqual([]);
      expect(V, id).toBe(o.vleugels.reduce((t: number, l: { aanzet?: number }) => t + (l.aanzet !== undefined ? 2 : 4), 0) + (o.stijl.vorm === 'volleBoog' ? 0 : 2));
      expect(explodeBlad(o, k)).not.toMatch(/NaN|undefined/);
      // stuk per stuk: een detailblad A4 per positie (geen inkoop); de 3D-vorm weegt wat de stuklijst zegt (een staaf met
      // verstek of schuin uiteinde: gewicht per meter x gemiddelde lengte = oppervlakte van de vorm / zichtbreedte)
      const det = detailBladen(o, k);
      expect(det.bladen.length, id).toBe(kaarten);
      for (const b of det.bladen) expect(b.svg, `${id} pos ${b.pos}`).not.toMatch(/NaN|undefined|Infinity/);
      const opv = (q: P[]) => Math.abs(q.reduce((s2, a, i) => { const b = q[(i + 1) % q.length]; return s2 + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
      type PosV = Pos & { prof?: string; vorm?: { pts: P[]; V: number } };
      for (const p of posities as PosV[]) {
        if (p.soort === 'inkoop' || p.soort === 'glas' || (p.soort === 'staaf' && (profiel(p.prof, p.vorm!.V).soort === 'systeem' || profiel(p.prof, p.vorm!.V).koop))) continue;
        const kg3 = volume3d(vorm3d(p, o)) * 7.85e-6, verwacht = p.soort === 'staaf' ? (STAAF[p.prof!].kgm * opv(p.vorm!.pts)) / p.vorm!.V / 1000 : p.kg;
        expect(Math.abs(kg3 - verwacht) / verwacht, `${id} pos ${p.pos} ${p.naam}: ${kg3} tegen ${verwacht}`).toBeLessThan(0.08);
      }
      // bestellijst: elk staafstuk zit in het zaagplan, geen staaf te vol; koopprofielen met hun artikelnummer
      const z = zaagplan(o, k), stukken = (posities as (Pos & { L?: number })[]).filter((p) => p.soort === 'staaf' && p.L).reduce((t, p) => t + p.n, 0);
      expect(z.profielen.reduce((t: number, p: { staven: { stukken: unknown[] }[] }) => t + p.staven.reduce((u, s) => u + s.stukken.length, 0), 0), id).toBe(stukken);
      for (const p of z.profielen) for (const s of p.staven) if (!s.opMaat) expect(s.rest, `${id} ${p.naam}`).toBeGreaterThanOrEqual(0);
      if (o.sys.koop) expect(z.profielen.filter((p: { artikel: string }) => p.artikel).length, id).toBeGreaterThan(1);
      expect(bestelBlad(o, k)).not.toMatch(/NaN|undefined/);
      const kp = kostprijs(o, k);
      expect(kp.kostprijs, id).toBeGreaterThan(300);
      // buiten: geïsoleerd profiel en isolerend glas, behalve bij een boog (dan een koker); het systeem kiest zijn scharnier
      if ((k as { gebruik?: string }).gebruik === 'buiten') { expect(o.opbouw).toBe('dubbel'); expect(!!o.sys.iso, id).toBe(!(s.boven !== 'recht' || s.vorm === 'volleBoog' || s.zon)); }
      // deurprofielen: altijd een taatsdeur (pivot)
      if (o.sys.koop) expect(o.scharnier, id).toBe('pivot');
    }
  });

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
