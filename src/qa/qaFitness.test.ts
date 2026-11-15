/**
 * De fitnesscatalogus (bibliotheek/fitness): elk toestel bouwt in de thuis- en de proversie zonder fouten of NaN; elk
 * stuk is langer dan 0 en past op een staaf van 6 m; de gaten liggen binnen het stuk; de stuklijst en de bestellijst
 * kloppen met het model (aantallen, zaagplan); elke berekening geeft een oordeel en niets staat op rood; kabelmachines
 * hebben een gesloten kabelloop met overbrenging 1:1 of 2:1; de prijs ligt in de marktband of er staat een melding; alle
 * bladen zijn geldige SVG met een titelblok; geen hoofdstukken die in elkaar steken en geen zwevende onderdelen.
 */
import { describe, expect, it } from 'vitest';
import { TOESTELLEN, toestel } from '../../bibliotheek/fitness/catalogus.mjs';
import { aabb, contact, lengteStuk, type Balk } from '../../bibliotheek/fitness/model.mjs';
import { berekening } from '../../bibliotheek/fitness/bereken.mjs';
import { stuklijst, zaagplan, nesting, STAAFLENGTE, ZAAGSNEDE } from '../../bibliotheek/fitness/stuklijst.mjs';
import { kostprijs } from '../../bibliotheek/fitness/prijzen.mjs';
import { alleBladen, stukBladen } from '../../bibliotheek/fitness/tekeningen.mjs';
import { montageBladen } from '../../bibliotheek/fitness/montage.mjs';
import { dossierHtml, lijstenCsv } from '../../bibliotheek/fitness/dossier.mjs';
import { miniatuur } from '../../bibliotheek/fitness/aanzicht.mjs';

/* eslint-disable @typescript-eslint/no-explicit-any */
const VERSIES = ['thuis', 'pro'] as const;
const geenNaN = (s: string) => !/NaN|undefined|Infinity/.test(s);
/** eenvoudige XML-controle: elke tag gesloten in de juiste volgorde, één wortel <svg> */
function geldigeSvg(s: string): string | null {
  if (!s.startsWith('<svg') || !s.trimEnd().endsWith('</svg>')) return 'geen <svg>-wortel';
  const stapel: string[] = [];
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)) {
    const [, sluit, naam, , zelf] = m;
    if (zelf) continue;
    if (sluit) { if (stapel.pop() !== naam) return `tag </${naam}> past niet`; } else stapel.push(naam);
  }
  if (stapel.length) return `open tags: ${stapel.join(',')}`;
  const ruw = s.replace(/<[^>]*>/g, '');
  if (/[<>]/.test(ruw)) return 'losse < of > in de tekst';
  return null;
}
const isRecht = (g: Balk) => [g.u, g.v].every((d) => Math.max(...d.map(Math.abs)) > 0.9999);

describe('catalogus', () => {
  it('± 50 toestellen, goed verdeeld over de vier soorten, unieke nummers', () => {
    expect(TOESTELLEN.length).toBeGreaterThanOrEqual(48);
    const per: Record<string, number> = {};
    for (const t of TOESTELLEN) per[t.soort] = (per[t.soort] ?? 0) + 1;
    for (const s of ['rek', 'bank', 'kabel', 'plate']) expect(per[s], s).toBeGreaterThanOrEqual(10);
    expect(new Set(TOESTELLEN.map((t) => t.id)).size).toBe(TOESTELLEN.length);
    for (const t of TOESTELLEN) expect(t.id).toMatch(/^F[RBKP]-\d\d$/);
  });
});

for (const t of TOESTELLEN) for (const v of VERSIES) {
  describe(`${t.id} ${t.naam} (${v})`, () => {
    const o = toestel(t.id, v);
    it('bouwt zonder NaN, met maten en massa', () => {
      expect(o.delen.length).toBeGreaterThan(0);
      for (const d of o.delen) for (const g of d.geo) expect([...g.a, ...g.b, g.bw, g.bh].every(Number.isFinite), d.naam).toBe(true);
      expect(o.maten.B).toBeGreaterThan(100); expect(o.maten.H).toBeGreaterThan(100); expect(o.massa).toBeGreaterThan(5);
      expect(o.vloer).toBeGreaterThan(0);
    });
    it('elk stuk is langer dan 0, past op 6 m en de gaten liggen binnen het stuk', () => {
      for (const d of o.delen) {
        if (d.soort === 'staaf') {
          const L = lengteStuk(d);
          expect(L, d.naam).toBeGreaterThan(0); expect(L + ZAAGSNEDE, d.naam).toBeLessThanOrEqual(STAAFLENGTE);
          for (const gt of d.gaten) { expect(gt.s, `${d.naam} gat`).toBeGreaterThanOrEqual(0); expect(gt.s, `${d.naam} gat`).toBeLessThanOrEqual(d.L + 0.5); expect(gt.d, `${d.naam} gat Ø`).toBeLessThan(Math.max(d.P.b, d.P.h)); }
        } else {
          expect(d.t, d.naam).toBeGreaterThan(0); expect(d.l, d.naam).toBeGreaterThan(0); expect(d.bmaat, d.naam).toBeGreaterThan(0);
          for (const gt of d.gaten) { expect(gt.x, `${d.naam} gat x`).toBeGreaterThanOrEqual(-0.5); expect(gt.x, `${d.naam} gat x`).toBeLessThanOrEqual(d.l + 0.5); expect(gt.y, `${d.naam} gat y`).toBeGreaterThanOrEqual(-0.5); expect(gt.y, `${d.naam} gat y`).toBeLessThanOrEqual(d.bmaat + 0.5); }
        }
      }
    });
    it('stuklijst en bestellijst kloppen met het model', () => {
      const sl = stuklijst(o), zp = zaagplan(o, sl);
      expect(sl.posities.reduce((s: number, p: any) => s + p.n, 0)).toBe(o.delen.length);
      expect(sl.posities.map((p: any) => p.pos)).toEqual(sl.posities.map((_: unknown, i: number) => i + 1));
      const staven = o.delen.filter((d: any) => d.soort === 'staaf').length;
      expect(zp.profielen.reduce((s, p) => s + p.stukken.length, 0)).toBe(staven);
      for (const p of zp.profielen) {
        expect(p.staven.reduce((s, x) => s + x.stukken.length, 0)).toBe(p.stukken.length);
        for (const st of p.staven) expect(st.stukken.reduce((s, x) => s + x.l + ZAAGSNEDE, 0), p.naam).toBeLessThanOrEqual(p.lengte + 0.01);
      }
      const ns = nesting(o, sl), laser = sl.posities.filter((p: any) => p.soort === 'plaat' && p.laser).reduce((s: number, p: any) => s + p.n, 0);
      expect(ns.reduce((s, x) => s + x.platen.reduce((t, pl) => t + pl.stukken.length, 0), 0)).toBe(laser);
      for (const k of sl.koop) { expect(k.hoeveelheid, k.naam).toBeGreaterThan(0); expect(Number.isFinite(k.bedrag), k.naam).toBe(true); expect(k.winkel, k.naam).toBeTruthy(); }
      if (o.kussens.length) { expect(sl.bekleding.length).toBe(o.kussens.length); expect(sl.koop.some((k: any) => k.key === 'multiplex')).toBe(true); }
    });
    it('elke berekening geeft een oordeel; niets op rood', () => {
      const B = berekening(o);
      expect(B.controles.length).toBeGreaterThan(3);
      for (const c of B.controles) { expect(['groen', 'oranje', 'rood', 'info'], c.wat).toContain(c.oordeel); expect(Number.isFinite(c.benut), c.wat).toBe(true); expect(c.bron, c.wat).toBeTruthy(); }
      expect(B.controles.filter((c) => c.oordeel === 'rood').map((c) => `${c.groep}: ${c.wat} ${Math.round(c.benut * 100)} %`)).toEqual([]);
      expect(B.controles.filter((c) => c.groep === 'Sterkte').length, 'sterkte').toBeGreaterThan(0);
      expect(B.controles.some((c) => c.groep === 'Stabiliteit'), 'stabiliteit of verankering').toBe(true);
    });
    if (t.soort === 'kabel') it('kabelmachine: gesloten kabelloop en overbrenging', () => {
      expect(o.kabels.length).toBeGreaterThan(0);
      const ids = new Set(o.katrollen.map((k: any) => k.id));
      for (const kb of o.kabels) {
        expect(['stapel', 'anker', 'laadpen', 'slede']).toContain(kb.begin);
        expect(['greep', 'nok']).toContain(kb.einde);
        const mid = kb.route.slice(1, -1);
        expect(mid.length, kb.naam).toBeGreaterThan(0);
        for (const p of mid) expect(p.katrol ? ids.has(p.katrol) : p.los, `${kb.naam}: tussenpunt is een katrol`).toBeTruthy();
        expect([1, 2]).toContain(kb.overbrenging);
        if (kb.overbrenging === 2) expect(mid.some((p: any) => p.los), 'losse katrol bij 2:1').toBe(true);
        expect(kb.L).toBeGreaterThan(500);
      }
      for (const k of o.katrollen) if (k.c[2] < 1800) expect(k.kap, `kap ${k.label}`).toBeTruthy();
    });
    it('prijs: eindig, in de marktband of met een melding', () => {
      const k = kostprijs(o);
      expect(Number.isFinite(k.incl) && k.incl > 0).toBe(true);
      expect(k.uren).toBeGreaterThan(0.5);
      if (k.markt.status !== 'in') expect(k.markt.melding.length).toBeGreaterThan(10);
      expect(k.markt.band[0]).toBeLessThan(k.markt.band[1]);
    });
    it('alle bladen zijn geldige SVG met titelblok, zonder NaN', () => {
      const bl = [...alleBladen(o, { datum: '2026-11-15' }), ...montageBladen(o, { datum: '2026-11-15' }), ...stukBladen(o, { datum: '2026-11-15' })];
      expect(bl.length).toBeGreaterThan(5);
      for (const b of bl) {
        const naam = (b as any).titel ?? (b as any).naam;
        expect(geldigeSvg(b.svg), naam).toBeNull();
        expect(geenNaN(b.svg), naam).toBe(true);
        expect(b.svg, naam).toContain('Tekeningnummer');
        expect(b.svg, naam).toContain('Fitnesstoestellen');
      }
      if (t.soort === 'kabel') expect(bl.some((b) => (b as any).id === 'kabel')).toBe(true);
      if (o.kussens.length) expect(bl.some((b) => (b as any).id === 'bekleding')).toBe(true);
      expect(geenNaN(miniatuur(o))).toBe(true);
    });
    it('geen hoofdstukken die in elkaar steken (AABB, 0,5 mm speling)', () => {
      const stukken = o.delen.filter((d: any) => isRecht(d.geo[0]) && !d.in && !d.stapel && d.kleur !== 'kap');
      const fout: string[] = [];
      for (let i = 0; i < stukken.length; i++) for (let j = i + 1; j < stukken.length; j++) {
        const [a0, a1] = aabb(stukken[i].geo[0]), [b0, b1] = aabb(stukken[j].geo[0]);
        const s = [0, 1, 2].map((k) => Math.min(a1[k], b1[k]) - Math.max(a0[k], b0[k]));
        if (s.every((x) => x > 0.5)) fout.push(`${stukken[i].naam} x ${stukken[j].naam} (${s.map((x) => Math.round(x)).join('/')})`);
      }
      expect(fout).toEqual([]);
    });
    it('geen zwevende onderdelen: alles hangt samen met de vloer, de muur of het rack', () => {
      const items = [...o.delen.map((d: any) => d.geo), ...o.kussens.map((d: any) => d.geo), ...o.koop.filter((k: any) => k.geo.length).map((k: any) => k.geo)];
      const n = items.length, ouder = items.map((_: unknown, i: number) => i);
      const vind = (i: number): number => (ouder[i] === i ? i : (ouder[i] = vind(ouder[i])));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (items[i].some((g: Balk) => items[j].some((h: Balk) => contact(g, h, 1.5)))) ouder[vind(i)] = vind(j);
      const anker = (geo: Balk[]) => geo.some((g) => { const [mn, mx] = aabb(g); return mn[2] <= 15 || (o.muur != null && mx[1] >= o.muur - 2) || (o.context ?? []).some((c: Balk) => contact(g, c, 2)); });
      const groepen = new Map<number, number[]>();
      for (let i = 0; i < n; i++) { const r = vind(i); if (!groepen.has(r)) groepen.set(r, []); groepen.get(r)!.push(i); }
      const los = [...groepen.values()].filter((gr) => !gr.some((i) => anker(items[i])));
      expect(los.map((gr) => gr.map((i) => (o.delen[i]?.naam ?? `item ${i}`)).slice(0, 4).join(', '))).toEqual([]);
    });
  });
}

describe('dossier en CSV', () => {
  it('dossier en lijsten voor een rek, een bank, een kabelmachine en een plate-loaded machine', () => {
    for (const id of ['FR-01', 'FB-02', 'FK-01', 'FP-01']) {
      const o = toestel(id, 'pro'), d = dossierHtml(o, {}, { datum: '2026-11-15' }), c = lijstenCsv(o);
      expect(d).toContain('<section class="a4">'); expect(geenNaN(d)).toBe(true);
      expect(c.split('\r\n').length).toBeGreaterThan(20); expect(geenNaN(c)).toBe(true);
    }
  });
});
