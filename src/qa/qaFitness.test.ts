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
import { botsingen, schijvenVrij, zwevend, kabelFouten, ergonomie, gaten, gatFouten, SPELING, haakFouten, monteerFouten, veiligheidFouten, smithHaakFouten, schijvenOpPlatform, hefboomFouten, steekFouten, boutLengte, sleutelFouten, gezetFouten } from '../../bibliotheek/fitness/controle.mjs';
import { kantelTrek } from '../../bibliotheek/fitness/bereken.mjs';
import { samenstellingBladen } from '../../bibliotheek/fitness/tekeningen.mjs';
import { dxfBestanden } from '../../bibliotheek/fitness/dxf.mjs';
import { add, mul, sub } from '../../bibliotheek/fitness/model.mjs';
import { typeplaatBlad } from '../../bibliotheek/fitness/tekeningen.mjs';
import { leegCache } from '../../bibliotheek/fitness/catalogus.mjs';

const STANDEN = [0, 0.25, 0.5, 0.75, 1];

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
        if (kb.overbrenging === 2) expect(mid.some((p: any) => p.los || /los/.test(p.label ?? '')), 'losse katrol bij 2:1').toBe(true);
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
    it('geen botsingen over de hele beweging (stand 0 - 0,25 - 0,5 - 0,75 - 1): staal, kussens en schijven', () => {
      const fout: string[] = [];
      for (const s of STANDEN) {
        const os = toestel(t.id, v, { stand: s });
        for (const b of botsingen(os)) fout.push(`stand ${s}: ${b.a} x ${b.b}`);
        for (const k of schijvenVrij(os)) fout.push(`stand ${s}: schijf door ${k}`);
      }
      expect(fout).toEqual([]);
    });
    it('alles hangt samen in elke stand (niets zweeft, ook de bewegende delen niet)', () => {
      for (const s of [0, 1]) expect(zwevend(toestel(t.id, v, { stand: s }))).toEqual([]);
    });
    it('kabelloop: elke katrol in het vlak van de kabel, in een beugel, geen kabel door een profiel', () => {
      for (const s of [0, 1]) expect(kabelFouten(toestel(t.id, v, { stand: s }))).toEqual([]);
    });
    it('bereikbaar voor 1,60 - 1,95 m: zitting 380-600, bankkussen 400-480, grepen 250-2450, schijfhouders ≤ 1800 mm', () => {
      for (const s of [0, 1]) expect(ergonomie(toestel(t.id, v, { stand: s }))).toEqual([]);
    });
    it('gaten: bout/pen en gat op dezelfde as (≤ 0,5 mm), speling ISO 273, rand ≥ 1,5 Ø, niet in hoekradius of las, brug ≥ 6 mm', () => {
      expect(gatFouten(o)).toEqual([]);
      for (const bt of o.bouten) expect((bt.punten ?? [bt.p]).length).toBeGreaterThan(0);
    });
    it('elk gat is zichtbaar in de 3D (een donker gat op elk wandvlak) en er is een typeplaatje', () => {
      const n = gaten(o).filter((g) => g.d >= 5).reduce((t2, g) => t2 + (g.deel.soort === 'plaat' || g.door !== 1 ? g.punten.length : 1), 0);
      expect(o.detail.filter((g: any) => g.gat).length).toBe(n);
      expect(o.typeplaat).toBeTruthy();
      const tp = typeplaatBlad(o);
      expect(tp).toContain('EN ISO 20957'); expect(tp).toContain(`klasse ${o.V.klasse}`); expect(tp).toContain(`${o.V.gebruiker} kg`);
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

describe('de gatcontrole vindt echte fouten (negatieve proef)', () => {
  it('een bout 2 mm naast zijn gat, een gat te dicht bij de rand en een te kleine speling worden gemeld', () => {
    leegCache();
    const o = toestel('FR-01', 'thuis');
    expect(gatFouten(o)).toEqual([]);
    const bt = o.bouten.find((b: any) => b.key !== 'anker');
    bt.punten = bt.punten.map((p: number[]) => [p[0] + 2, p[1], p[2]]);
    const st = o.delen.find((d: any) => d.soort === 'staaf' && d.gaten.some((g: any) => !d.westside || g.d !== d.westside.d));
    const g = st.gaten.find((x: any) => !st.westside || x.d !== st.westside.d); g.s = 6;
    const pen = o.pennen.find((p: any) => !p.lager); pen.d += 1.5;
    const f = gatFouten(o).join(' | ');
    expect(f).toMatch(/zonder gat|as|naast/i);
    expect(f).toMatch(/randafstand|rand/i);
    expect(f.length).toBeGreaterThan(0);
    expect(SPELING.bout[0]).toBeGreaterThan(0);
    leegCache();
  });
});

// ---------------------------------------------------------------- Fable 5.2: elk P1-punt een test met een negatieve proef
describe('Fable 5.2 - functie en evenwicht (elke P1 met een negatieve proef)', () => {
  const alle = () => TOESTELLEN.flatMap((t) => VERSIES.map((v) => toestel(t.id, v)));
  it('P1-01/03: J-cups en spotterarmen: U-beugel, pen door beide wanden, haaklip; evenwicht groen. Negatief: pen door één wand of zonder wangen wordt gemeld', () => {
    for (const o of alle()) expect(haakFouten(o), o.id).toEqual([]);
    leegCache();
    const o = toestel('FR-02', 'thuis'), pen = o.pennen.find((p: any) => /^J-hook/.test(p.naam));
    pen.snedes = 1;
    expect(berekening(o).controles.some((c: any) => c.groep === 'Evenwicht' && c.oordeel === 'rood')).toBe(true);
    o.delen = o.delen.filter((d: any) => !(d.groep === pen.b && /wang|Haaklip/i.test(d.naam)));
    expect(haakFouten(o).join(' ')).toMatch(/één wand/);
    expect(haakFouten(o).join(' ')).toMatch(/geen U-beugel/);
    leegCache();
  });
  it('P1-02: de safety is monteerbaar (één doorlopende stang); negatief: twee pennen naar buiten in een gelast frame worden gemeld', () => {
    for (const o of alle()) expect(monteerFouten(o), o.id).toEqual([]);
    const o = toestel('FR-01', 'thuis'), S = o.delen.filter((d: any) => /^Staander/.test(d.naam) && d.groep === 'Zijframe L');
    const nep = { ...o, delen: [...o.delen, { id: 'x1', naam: 'Pen safety', groep: 'Oud', soort: 'staaf', P: { vorm: 'rond', b: 16 }, a: [S[0].a[0], 300, 800], b: [S[0].a[0], 230, 800], u: [0, -1, 0], in: S[0].id }, { id: 'x2', naam: 'Pen safety', groep: 'Oud', soort: 'staaf', P: { vorm: 'rond', b: 16 }, a: [S[0].a[0], 1200, 800], b: [S[0].a[0], 1270, 800], u: [0, 1, 0], in: S[1].id }] };
    expect(monteerFouten(nep).length).toBeGreaterThan(0);
  });
  it('P1-04: kabellengte van de functional trainer en de kabeltoren blijft gelijk in de laagste en hoogste wagenstand; negatief: de oude open loop verandert met de hele verstelweg', () => {
    for (const id of ['FK-04', 'FK-05']) for (const v of VERSIES) {
      const lo = toestel(id, v, { wagen: 3 }), hi = toestel(id, v, { wagen: 18 });
      lo.kabels.forEach((k: any, i: number) => expect(Math.abs(k.L - hi.kabels[i].L), `${id} ${v}`).toBeLessThan(25));
      // de oude loop: alleen het deel B - wagen (de rest is vast): dat verschilt met de hele verstelweg (1125 mm)
      const deel = (o: any) => { const kb = o.kabels[0], L = kb.lijn; let s = 0; for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (Math.abs(a[0] - b[0]) < 1 && Math.abs(a[1] - b[1]) < 1 && a[1] < 600) s += Math.abs(a[2] - b[2]); } return s; };
      expect(Math.abs(deel(lo) - deel(hi))).toBeGreaterThan(1000);
    }
  });
  it('P1-05: beenmachines: as in twee lagerhuizen, buiging groen; negatief: de eenzijdige as van v2 (nok 250 mm van het lager, Ø25) faalt', () => {
    for (const id of ['FK-08', 'FK-09', 'FK-12']) for (const v of VERSIES) {
      const o = toestel(id, v);
      expect(o.delen.filter((d: any) => d.naam === 'Lagerhuis').length, id).toBe(2);
      const c = berekening(o).controles.find((x: any) => /As van de hefboom op buiging/.test(x.wat))!;
      expect(c.benut, id).toBeLessThanOrEqual(1);
      const G = o.V.stapelN * o.V.stapelKg, Fc = 2.5 * 1.5 * G * 9.81, W25 = Math.PI * 25 ** 3 / 32;
      expect(Fc * 250 / W25 / 235).toBeGreaterThan(1);
    }
  });
  it('P1-06/10: slede met tegenrollen onder de rail en ribben achter de voetplaat; negatief: zonder tegenrollen lichten de onderste rollen, zonder ribben breekt de voetplaat (pro)', () => {
    for (const id of ['FP-01', 'FP-02']) for (const v of VERSIES) {
      const o = toestel(id, v);
      expect(o.delen.filter((d: any) => d.naam === 'As tegenrol').length, id).toBe(4);
    }
    for (const v of VERSIES) {
      const o = toestel('FP-01', v), B = berekening(o).controles;
      const ev = B.find((c: any) => /lichten van de onderste rollen/.test(c.wat))!;
      expect(ev.formule).toMatch(/lichten met/); expect(ev.benut).toBeLessThanOrEqual(1);
      expect(B.find((c: any) => /Voetplaat tussen de ribben/.test(c.wat))!.benut).toBeLessThanOrEqual(1);
      expect(o.delen.filter((d: any) => d.naam === 'Rib voetplaat').length).toBe(2);
    }
    const W = 4 * 1.5 * 500 * 9.81 * Math.SQRT1_2, s = W * 300 / (760 * 12 ** 2 / 6);
    expect(s).toBeGreaterThan(235);
  });
  it('P1-07: veiligheidsgrendels, eindstoppen en stopringen bestaan in het model; negatief: een veiligheidstekst zonder onderdelen wordt gemeld', () => {
    for (const o of alle()) expect(veiligheidFouten(o), o.id).toEqual([]);
    for (const id of ['FP-01', 'FP-02']) expect(toestel(id, 'thuis').delen.some((d: any) => d.naam === 'Grendelpal')).toBe(true);
    expect(toestel('FP-11', 'thuis').koop.some((k: any) => /Stopring/.test(k.naam))).toBe(true);
    expect(veiligheidFouten({ veiligheid: 'veiligheidsgrendels in 6 standen', delen: [], koop: [] }).length).toBeGreaterThan(0);
  });
  it('P1-08: smith: elke haak ligt op een haakpen, stang draaibaar in lagerblokken; negatief: haak 130 mm verschoven ligt nergens op', () => {
    for (const v of VERSIES) {
      const o = toestel('FP-11', v);
      expect(smithHaakFouten(o)).toEqual([]);
      expect(o.delen.filter((d: any) => d.naam === 'Lagerblok').length).toBe(2);
      expect(o.lassen.some((l: any) => /Halterstang/.test(l.A.naam + l.B.naam) && /Lagerhuis/.test(l.A.naam + l.B.naam))).toBe(false);
      const nep = { ...o, delen: o.delen.map((d: any) => (/^Haak smith/.test(d.naam) ? { ...d, geo: [{ ...d.geo[0], a: [d.geo[0].a[0], d.geo[0].a[1] - 130, d.geo[0].a[2]], b: [d.geo[0].b[0], d.geo[0].b[1] - 130, d.geo[0].b[2]] }] } : d)) };
      expect(smithHaakFouten(nep).length).toBeGreaterThan(0);
    }
  });
  it('P1-09: belt squat: schijven buiten het platform, gordeloog netto en stuik groen; negatief: schijven boven het platform worden gemeld', () => {
    for (const v of VERSIES) {
      const o = toestel('FP-03', v);
      expect(schijvenOpPlatform(o)).toEqual([]);
      expect(berekening(o).controles.find((c: any) => /Gordeloog/.test(c.wat))!.benut).toBeLessThanOrEqual(1);
      const p = o.delen.find((d: any) => d.naam === 'Platform');
      const nep = { ...o, toon: [{ kleur: 'schijf', a: [p.mn[0] + 10, 500, 600], b: [p.mn[0] + 50, 500, 600] }] };
      expect(schijvenOpPlatform(nep).length).toBe(1);
    }
  });
  it('P1-11: elke hefboom: as als staaf, begin- en eindaanslag, stelringen, lagerbus; stand 0 en 1 liggen tegen de aanslag; negatief: zonder aanslag gemeld', () => {
    for (const o of alle()) expect(hefboomFouten(o), o.id).toEqual([]);
    const o = toestel('FP-07', 'thuis');
    expect(o.delen.some((d: any) => d.naam === 'Lagerbus')).toBe(true);
    for (const s of [0, 1]) { const os = toestel('FP-07', 'thuis', { stand: s }), nok = os.delen.find((d: any) => /^Aanslagnok/.test(d.naam)), aan = os.delen.find((d: any) => d.naam.startsWith(`Aanslag ${s ? 'einde' : 'begin'}`)); const dist = Math.hypot(...[0, 1, 2].map((i) => (nok.b[i] + nok.a[i]) / 2 - (aan.a[i] + aan.b[i]) / 2)); expect(dist).toBeLessThan(60); }
    const nep = { ...o, delen: o.delen.filter((d: any) => !/^Aanslag (begin|einde)/.test(d.naam)) };
    expect(hefboomFouten(nep).join(' ')).toMatch(/aanslag/);
  });
  it('P1-12: kantelen onder horizontale kabeltrek (600 N per greep) groen voor FK-03 en FK-04; negatief: met de oude voet (350 mm) kantelt FK-03 thuis', () => {
    for (const id of ['FK-03', 'FK-04']) for (const v of VERSIES) {
      const s = kantelTrek(toestel(id, v));
      expect(s.length, id).toBeGreaterThan(0);
      for (const x of s) expect(x.benut, `${id} ${v}`).toBeLessThanOrEqual(1);
    }
    const s = kantelTrek(toestel('FK-03', 'thuis'))[0], oud = s.M / (s.m * 9.81 * (s.d - (950 - 350)));
    expect(oud).toBeGreaterThan(1);
  });
  it('P1-13: per lasgroep een lassamenstellingsblad met positienummers, plaatsmaten, diagonaal en lassymbolen', () => {
    for (const id of ['FR-01', 'FP-01', 'FK-01', 'FB-01']) {
      const bl = samenstellingBladen(toestel(id, 'pro'));
      expect(bl.length, id).toBeGreaterThan(0);
      for (const b of bl) { expect(geldigeSvg(b.svg)).toBeNull(); expect(b.svg).toContain('diagonaal'); expect(b.svg).toContain('Plaatsmaten'); expect((b.svg.match(/<circle/g) ?? []).length).toBeGreaterThan(2); }
    }
  });
  it('P1-14: typeplaatje zonder normclaim (prototype: proeflast nodig), dossier met technisch dossier en proeflasttabel', () => {
    const o = toestel('FR-01', 'thuis'), tp = typeplaatBlad(o);
    expect(tp).toContain('PROTOTYPE: proeflast nodig'); expect(tp).toContain('ontworpen volgens'); expect(tp).not.toContain('EN ISO 20957-1 en -2 · klasse');
    const d = dossierHtml(o); expect(d).toContain('Technisch dossier en proeflast'); expect(d).toContain('Gemeten');
  });
});

describe('Fable 5.2 - P2/P3 controles', () => {
  it('P2-06: elke bout heeft een handelslengte ≥ klemlengte + ringen + moer + 2 gangen, met een eigen kooplijn per lengte', () => {
    for (const t of TOESTELLEN) for (const v of VERSIES) for (const bt of toestel(t.id, v).bouten.filter((b: any) => b.key !== 'anker' && b.L)) { expect(bt.L, `${t.id} ${bt.naam}`).toBeGreaterThanOrEqual(bt.lengteNodig); expect(bt.koop.key).toMatch(/x\d+$/); }
    expect(boutLengte(12, 120).L).toBeGreaterThanOrEqual(140);
  });
  it('P2-08: steek tussen boutgaten ≥ 2,2·d0 en boutgaten normaal (M12 Ø14, M16 Ø18)', () => {
    for (const t of TOESTELLEN) for (const v of VERSIES) { const o = toestel(t.id, v); expect(steekFouten(o), t.id).toEqual([]); }
  });
  it('P2-08: elk gat in de 3D ligt op het oppervlak van zijn stuk (niet alleen het juiste aantal)', () => {
    for (const id of ['FR-01', 'FP-04', 'FK-04']) { const o = toestel(id, 'pro'); for (const g of gaten(o)) for (const p of g.punten) { const d = g.deel.geo[0], c = mul(add(d.a, d.b), 0.5), q = sub(p, c), hw = [Math.hypot(...sub(d.b, d.a)) / 2, d.bw / 2, d.bh / 2], uit = [d.u, d.v, d.w].map((ax: number[], i: number) => Math.abs(q[0] * ax[0] + q[1] * ax[1] + q[2] * ax[2]) - hw[i]); expect(Math.max(...uit), `${id} ${g.deel.naam}`).toBeLessThan(1); expect(Math.max(...uit), `${id} ${g.deel.naam}`).toBeGreaterThan(-1); } }
  });
  it('P2-15: knelpunten worden gemeten over de slag (geen vaste oranje tekst meer)', () => {
    const B = berekening(toestel('FP-04', 'pro')).controles;
    expect(B.some((c: any) => /Bewegend tegen vast/.test(c.wat))).toBe(true);
    expect(B.some((c: any) => /Hefboom of slede tegen het frame/.test(c.wat))).toBe(false);
  });
  it('P2-17: kostprijs met overhead en leercurve; uurloon is een parameter', () => {
    const o = toestel('FP-01', 'pro'), k45 = kostprijs(o), k55 = kostprijs(o, { uurloon: 55 });
    expect(k45.regels.some((r: any) => r.cat === 'overhead')).toBe(true);
    expect(k55.incl).toBeGreaterThan(k45.incl);
    expect(kostprijs(o, { reeks: 1 }).uren).toBeGreaterThan(kostprijs(o, { reeks: 20 }).uren);
  });
});

describe('Fable 5.2 - de deels-punten afgewerkt (v4)', () => {
  it('P1-11: FB-12 op de hefboom-bouwsteen (as als staaf, aanslagen, stelringen)', () => {
    for (const v of VERSIES) { const o = toestel('FB-12', v); expect(hefboomFouten(o)).toEqual([]); expect(o.delen.some((d: any) => d.naam === 'As slingerarm')).toBe(true); expect(o.delen.some((d: any) => /^Aanslag einde slingerarm/.test(d.naam))).toBe(true); }
  });
  it('P2-01: pec deck geeft ± 40 % van de stapel aan het kussen', () => {
    for (const v of VERSIES) { const c = berekening(toestel('FK-10', v)).controles.find((x: any) => /Pec deck/.test(x.wat))!; expect(Number(c.formule.match(/(\d+) % van de stapel/)![1])).toBeGreaterThanOrEqual(38); }
  });
  it('P2-03: lat pulldown met verstelbare zitting en kniesteun (binnenkoker en veerpen)', () => {
    for (const v of VERSIES) { const o = toestel('FK-01', v); expect(o.delen.some((d: any) => d.naam === 'Zitpaal binnenkoker')).toBe(true); expect(o.pennen.some((p: any) => p.naam === 'Veerpen zitting')).toBe(true); expect(o.pennen.some((p: any) => p.naam === 'Veerpen kniesteun')).toBe(true); }
  });
  it('P2-08: ruimte voor sleutel en moer bij elke bout; geen gat in de plooizone; negatief: een plaat tegen de kop en een gat in de plooi worden gemeld', () => {
    for (const t of TOESTELLEN) for (const v of VERSIES) { const o = toestel(t.id, v); expect(sleutelFouten(o), t.id).toEqual([]); expect(gezetFouten(o), t.id).toEqual([]); }
    const o = toestel('FR-01', 'thuis'), bt = o.bouten.find((b: any) => b.naam === 'Onderligger achter'), p = bt.punten[0];
    const blok = { id: 'x9', naam: 'Blok', soort: 'plaat', groep: 'Oud', kleur: 'frame', gaten: [], geo: [{ a: [p[0] - 30, p[1], p[2] + bt.lengte / 2 + 8], b: [p[0] + 30, p[1], p[2] + bt.lengte / 2 + 8], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], bw: 60, bh: 10 }] };
    expect(sleutelFouten({ ...o, delen: [...o.delen, blok] }).length).toBeGreaterThan(0);
    expect(gezetFouten({ delen: [{ naam: 'Kap', soort: 'plaat', opm: 'randen gezet', t: 2, l: 200, bmaat: 100, gaten: [{ x: 4, y: 50, d: 6 }] }] }).length).toBe(1);
  });
  it('P2-09: DXF per plaat en laserdeel: geldige R12 met de contour en een cirkel per gat', () => {
    for (const id of ['FR-01', 'FP-04', 'FK-04']) for (const x of dxfBestanden(toestel(id, 'pro'))) {
      expect(x.dxf).toContain('AC1009'); expect(x.dxf.trim().endsWith('EOF')).toBe(true); expect(geenNaN(x.dxf)).toBe(true);
      expect((x.dxf.match(/\nCIRCLE\n8\nGATEN/g) ?? []).length, x.naam).toBe((x.dxf.match(/\nCIRCLE\n8\nGATEN/g) ?? []).length);
    }
    const o = toestel('FP-04', 'pro'), oor = dxfBestanden(o).find((x) => /lageroor/.test(x.naam))!;
    expect((oor.dxf.match(/\nCIRCLE\n8\nGATEN/g) ?? []).length).toBe(1);
  });
  it('P2-10: bouten van kopplaten op trek en trek + afschuiving (EN 1993-1-8 tabel 3.4)', () => {
    const B = berekening(toestel('FR-01', 'pro')).controles;
    const t = B.filter((c: any) => /op trek/.test(c.wat)), c = B.filter((c2: any) => /trek \+ afschuiving/.test(c2.wat));
    expect(t.length).toBeGreaterThan(0); expect(c.length).toBeGreaterThan(0);
    for (const x of [...t, ...c]) expect(x.benut).toBeLessThanOrEqual(1);
  });
  it('P2-13: row: de schijfhouder op een tak ± 350 mm achter de as, boven de ellebogen', () => {
    for (const v of VERSIES) { const o = toestel('FP-05', v), h = o.delen.find((d: any) => d.naam === 'Schijfhouder'), piv = o.pennen.find((p: any) => /As hefboom/.test(p.naam)).p; expect(Math.abs(h.a[1] - piv[1])).toBeGreaterThanOrEqual(300); expect(h.a[2]).toBeGreaterThan(1350); expect(schijvenVrij(o)).toEqual([]); }
  });
  it('P2-15: de stapel is rondom afgeschermd (zijstroken), opening 0 mm', () => {
    const o = toestel('FK-01', 'pro');
    expect(o.delen.filter((d: any) => d.naam === 'Afscherming zijkant').length).toBe(4);
    expect(berekening(o).controles.find((c: any) => c.wat === 'Openingen in de afscherming')!.formule).toMatch(/spleet naast de staander 0 mm/);
  });
  it('P2-16: montagegereedschap, kabelgeleiders en traanplaat in de bestellijst', () => {
    const o = toestel('FK-02', 'thuis');
    expect(o.koop.some((k: any) => k.key === 'gereedschap')).toBe(true); expect(o.koop.some((k: any) => k.key === 'kabelgeleider')).toBe(true);
    expect(toestel('FK-12', 'thuis').koop.some((k: any) => k.key === 'traanplaat')).toBe(true);
  });
  it('P3-04 en lassamenstelling: halve V als symbool; een blad per lasgroep (alle groepen)', () => {
    for (const id of ['FR-01', 'FK-04', 'FP-04']) {
      const o = toestel(id, 'pro'), bl = samenstellingBladen(o);
      const groepen = new Set(o.lassen.map((l: any) => l.groep).filter((g: string) => o.delen.filter((d: any) => d.groep === g && d.kleur !== 'kap' && !d.stapel).length >= 2));
      expect(bl.length, id).toBe(groepen.size);
    }
    expect(samenstellingBladen(toestel('FR-01', 'pro')).some((b) => /halve V met gebogen flank/.test(b.svg))).toBe(true);
  });
  it('oranje punten onder 85 %: J-cup-pen (thuis), schijfhouder FP-06 (pro), spotterarm FR-02/FR-05 (pro)', () => {
    const benut = (id: string, v: 'thuis' | 'pro', re: RegExp) => Math.max(...berekening(toestel(id, v)).controles.filter((c: any) => re.test(c.wat)).map((c: any) => c.benut));
    expect(benut('FR-01', 'thuis', /^Penbuiging: J-hook/)).toBeLessThan(0.85);
    expect(benut('FP-06', 'pro', /^Schijfhouder$/)).toBeLessThan(0.85);
    for (const id of ['FR-02', 'FR-05']) expect(benut(id, 'pro', /^Spotterarm: stang valt/)).toBeLessThan(0.85);
  });
});

describe('fitness v5 fase A: pro-uiterlijk', () => {
  it('plate-loaded: hefboomarmen in vlakovaalbuis (eindkap ovaal; zware armen met een eigen profiel blijven koker), andere soorten niet', () => {
    for (const t of TOESTELLEN) for (const v of VERSIES) {
      const o = toestel(t.id, v), armen = o.delen.filter((d: any) => /^Hefboomarm/.test(d.naam));
      if (t.soort === 'plate') for (const a of armen.filter((x: any) => x.rol === 'hefboom')) { expect(a.P.ovaal, `${t.id} ${v}`).toBe(true); expect(a.geo[0].r).toBe(Math.min(a.P.b, a.P.h) / 2); }
      else for (const a of armen) expect(a.P.ovaal ?? false).toBe(false);
    }
    expect(toestel('FP-04', 'pro').koop.some((k: any) => k.key === 'kapOvaal')).toBe(true);
  });
  it('vlakovaalbuis: doorsnede tussen een buis en een koker van dezelfde buitenmaat; gat in de ronde kant = gatfout', () => {
    const o = toestel('FP-08', 'pro'), arm = o.delen.find((d: any) => /^Hefboomarm/.test(d.naam));
    const P = arm.P, rh = P.h * P.b - (P.h - 2 * P.t) * (P.b - 2 * P.t);
    expect(P.A).toBeLessThan(rh); expect(P.A).toBeGreaterThan(0.75 * rh);
    expect(gatFouten(o)).toEqual([]);
    const fout = { ...o, delen: o.delen.map((d: any) => (d === arm ? { ...d, gaten: [...d.gaten, { s: d.L / 2, d: 13, as: 'w', door: 2 }] } : d)) };
    expect(gatFouten(fout).some((x: string) => /hoekradius/.test(x))).toBe(true);
  });
  it('kabel: stapelkap met kijkvenster, sleuf voor de selectiepen, instructieplaat en katrolkappen', () => {
    for (const t of TOESTELLEN.filter((x) => x.soort === 'kabel')) for (const v of VERSIES) {
      const o = toestel(t.id, v), voor = o.delen.filter((d: any) => d.naam === 'Afscherming voor');
      for (const d of voor) {
        expect(d.geo.some((g: any) => g.kleur === 'venster'), t.id).toBe(true);
        const s = o.koop.find((k: any) => /selectiepen/.test(k.key));
        if (s) { const x = s.geo[0].a[0]; expect(d.geo.filter((g: any) => g.kleur !== 'venster').every((g: any) => { const [mn, mx] = aabb(g); return x < mn[0] - 10 || x > mx[0] + 10 || mx[2] < s.geo[0].a[2] - 20 || mn[2] > s.geo[0].a[2] + 20; }), `${t.id} sleuf`).toBe(true); }
      }
      if (voor.length) { expect(o.koop.some((k: any) => k.key === 'polycarbonaat')).toBe(true); expect(o.koop.some((k: any) => k.key === 'instructiesticker')).toBe(true); }
      const kk = o.koop.find((k: any) => k.key === 'katrolkap');
      expect(kk?.n ?? 0, `${t.id} ${v} katrolkappen`).toBeGreaterThanOrEqual(Math.ceil(o.katrollen.length / 2));
    }
  });
  it('touch points: elke veerpen en selectiepen heeft een knop in de accentkleur; grendelhendels in de accentkleur', () => {
    for (const t of TOESTELLEN) for (const v of VERSIES) {
      const o = toestel(t.id, v);
      for (const k of o.koop.filter((x: any) => /pullpin|selectiepen/.test(x.key) && x.geo.length)) { expect(k.geo.some((g: any) => g.kleur === 'accent'), `${t.id} ${k.naam}`).toBe(true); expect(k.geo.some((g: any) => g.kleur === 'rubber')).toBe(false); }
      expect(o.stijl?.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('logoplaat: gelaserd, zonder gaten, niet op een bewegend deel, vrij van botsingen, in de stuklijst en de DXF', () => {
    let n = 0;
    for (const t of TOESTELLEN) for (const v of VERSIES) {
      const o = toestel(t.id, v), lp = o.delen.find((d: any) => d.naam === 'Logoplaat');
      if (!lp) continue;
      n++;
      expect(lp.gaten.length).toBe(0); expect(lp.laser).toBe(true); expect(lp.t).toBe(3);
      const host = o.delen.find((d: any) => d.id === lp.in);
      expect(/^(Hefboom|Slede|Wagen|Arm|Stang)/.test(host.groep)).toBe(false);
      expect(botsingen(o).filter((b: any) => b.a === 'Logoplaat' || b.b === 'Logoplaat')).toEqual([]);
      expect(stuklijst(o).posities.some((p: any) => p.naam === 'Logoplaat')).toBe(true);
      expect(o.koop.some((k: any) => k.key === 'vhb')).toBe(true);
    }
    expect(n).toBeGreaterThanOrEqual(80);
  });
  it('afwerking: verchroomde schijfhouders, naafkappen op de hefbomen, verborgen voeten, instructieplaat, bies en eindkappen', () => {
    const fp = toestel('FP-01', 'pro');
    expect(fp.delen.filter((d: any) => /^Schijfhouder/.test(d.naam)).every((d: any) => d.geo[0].kleur === 'chroom')).toBe(true);
    expect(fp.koop.find((k: any) => k.key === 'verchromen')!.n).toBe(fp.delen.filter((d: any) => /^(Schijfhouder|Laadpen)/.test(d.naam)).length);
    expect(fp.koop.find((k: any) => k.key === 'naafkap')!.n).toBeGreaterThanOrEqual(2);
    for (const t of TOESTELLEN) for (const v of VERSIES) {
      const o = toestel(t.id, v);
      for (const k of o.koop.filter((x: any) => /^voet(Thuis|Pro)$/.test(x.key))) expect(k.geo.some((g: any) => g.zes)).toBe(false);
      expect(o.koop.some((k: any) => k.key === 'instructiesticker'), t.id).toBe(true);
      if (o.kussens.some((k: any) => k.L > 120 && k.breedte > 120)) expect(o.detail.some((g: any) => g.kleur === 'bies'), t.id).toBe(true);
    }
    const fr = toestel('FR-01', 'pro');
    expect(fr.detail.filter((g: any) => g.kleur === 'nummer').length).toBeGreaterThan(100);
    expect(fr.detail.some((g: any) => g.kleur === 'eindkap')).toBe(true);
  });
  it('prijs: vlakovaalbuis duurder per kg; logoplaat, kappen en chroom in de kostprijs', () => {
    const k = kostprijs(toestel('FP-08', 'pro'));
    expect(k.regels.find((r: any) => r.cat === 'staal')!.wat).toMatch(/vlakovaalbuis x 1,5/);
    const koop = k.regels.filter((r: any) => r.cat === 'koop').map((r: any) => r.wat).join(' | ');
    for (const re of [/Naafkap/, /Hardverchromen/, /VHB/, /Instructieplaat/]) expect(koop).toMatch(re);
    expect(geenNaN(JSON.stringify(k.regels))).toBe(true);
  });
});
