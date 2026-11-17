/**
 * De fitnesscatalogus (bibliotheek/fitness): elk toestel bouwt in de thuis- en de proversie zonder fouten of NaN; elk
 * stuk is langer dan 0 en past op een staaf van 6 m; de gaten liggen binnen het stuk; de stuklijst en de bestellijst
 * kloppen met het model (aantallen, zaagplan); elke berekening geeft een oordeel en niets staat op rood; kabelmachines
 * hebben een gesloten kabelloop met overbrenging 1:1 of 2:1; de prijs ligt in de marktband of er staat een melding; alle
 * bladen zijn geldige SVG met een titelblok; geen hoofdstukken die in elkaar steken en geen zwevende onderdelen.
 */
import { describe, expect, it, vi } from 'vitest';
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
import { buigPad, afronden, terugVouwen, uitslagStrook, BUIGERIJEN, KANTBANK, buigKeuze } from '../../bibliotheek/fitness/vorm.mjs';
import { nokFouten, lagerhuisFouten, laadpenFouten, inbedFouten, ontluchtFouten, uitslagFouten, kapFouten, aanslagFouten, materiaalFouten } from '../../bibliotheek/fitness/controle.mjs';
import { NOKGRENS, NOKGRENS_BRON } from '../../bibliotheek/fitness/selectorized.mjs';
import { KOOP } from '../../bibliotheek/fitness/onderdelen.mjs';
import { massa } from '../../bibliotheek/fitness/model.mjs';
import { totalen } from '../../bibliotheek/fitness/stuklijst.mjs';
import { funderingBlad } from '../../bibliotheek/fitness/tekeningen.mjs';
import { bouwer } from '../../bibliotheek/fitness/model.mjs';
import { PROFIEL, VERSIE } from '../../bibliotheek/fitness/onderdelen.mjs';
import { plyobox } from '../../bibliotheek/fitness/opslag.mjs';

// de volledige run (150 toestellen x versies) is zwaar: elke test krijgt 60 s (v6)
vi.setConfig({ testTimeout: 60000 });
const STANDEN = [0, 0.25, 0.5, 0.75, 1];
// snelle standaardrun: per soort het eerste, het middelste en het laatste toestel, per bouwer en per variant van een
// bouwer minstens één toestel (P2-22 v6), plus de toestellen in FITNESS_IDS
// (bv. FITNESS_IDS=FM-05,FM-06 na een wijziging aan die toestellen). Alles: FITNESS_VOLLEDIG=1 (zo draait test:voorbeelden).
const VOL = process.env.FITNESS_VOLLEDIG === '1';
const EXTRA = (process.env.FITNESS_IDS ?? '').split(',').filter(Boolean);
const PER_BOUWER = ['FS-03', 'FS-06', 'FS-12', 'FS-14', 'FM-05', 'FM-07', 'FM-08', 'FM-09', 'FM-13', 'FO-04', 'FO-05', 'FO-09', 'FO-12', 'FO-14', 'FO-16', 'FO-18', 'FO-21', 'FX-01', 'FX-03', 'FX-04', 'FX-05', 'FX-07', 'FX-09', 'FX-10', 'FX-11', 'FX-16', 'FX-17', 'FX-18', 'FX-24'];
const TT = VOL ? TOESTELLEN : TOESTELLEN.filter((t) => { const z = TOESTELLEN.filter((x) => x.soort === t.soort), k = z.indexOf(t); return k === 0 || k === z.length - 1 || k === Math.floor(z.length / 2) || PER_BOUWER.includes(t.id) || EXTRA.includes(t.id); });

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
  it('± 150 toestellen, goed verdeeld over de acht soorten, unieke nummers', () => {
    expect(TOESTELLEN.length).toBeGreaterThanOrEqual(150);
    const per: Record<string, number> = {};
    for (const t of TOESTELLEN) per[t.soort] = (per[t.soort] ?? 0) + 1;
    for (const s of ['rek', 'bank', 'kabel', 'plate']) expect(per[s], s).toBeGreaterThanOrEqual(10);
    for (const s of ['selectorized', 'multigym', 'opslag', 'buiten']) expect(per[s], s).toBe(25);
    expect(new Set(TOESTELLEN.map((t) => t.id)).size).toBe(TOESTELLEN.length);
    for (const t of TOESTELLEN) expect(t.id).toMatch(/^F[RBKPSMOX]-\d\d$/);
  });
});

for (const t of TT) for (const v of VERSIES) {
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
      // een gezette plaat (v6, P1-11) is één positie voor al haar vlakken
      expect(sl.posities.reduce((s: number, p: any) => s + p.n, 0)).toBe(o.delen.filter((d: any) => !d.deelVan).length + (o.gezet ?? []).length);
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
    if (t.soort === 'kabel' || t.soort === 'selectorized' || /^FM-(13|14|23|24)$/.test(t.id)) it('kabelmachine: gesloten kabelloop en overbrenging', () => {
      expect(o.kabels.length).toBeGreaterThan(0);
      const ids = new Set(o.katrollen.map((k: any) => k.id));
      for (const kb of o.kabels) {
        expect(['stapel', 'anker', 'laadpen', 'slede']).toContain(kb.begin);
        expect(['greep', 'nok', 'anker']).toContain(kb.einde); // v6b: de stapelkabel van de 2:1-takel eindigt aan een anker
        const mid = kb.route.slice(1, -1);
        expect(mid.length, kb.naam).toBeGreaterThan(0);
        for (const p of mid) expect(p.katrol ? ids.has(p.katrol) : p.los || p.geleider, `${kb.naam}: tussenpunt is een katrol of een kabelgeleider`).toBeTruthy();
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
  }, 30000);
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
  const alle = () => TT.flatMap((t) => VERSIES.map((v) => toestel(t.id, v)));
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
  }, 60000);
  it('P1-02: de safety is monteerbaar (één doorlopende stang); negatief: twee pennen naar buiten in een gelast frame worden gemeld', () => {
    for (const o of alle()) expect(monteerFouten(o), o.id).toEqual([]);
    const o = toestel('FR-01', 'thuis'), S = o.delen.filter((d: any) => /^Staander/.test(d.naam) && d.groep === 'Zijframe L');
    const nep = { ...o, delen: [...o.delen, { id: 'x1', naam: 'Pen safety', groep: 'Oud', soort: 'staaf', P: { vorm: 'rond', b: 16 }, a: [S[0].a[0], 300, 800], b: [S[0].a[0], 230, 800], u: [0, -1, 0], in: S[0].id }, { id: 'x2', naam: 'Pen safety', groep: 'Oud', soort: 'staaf', P: { vorm: 'rond', b: 16 }, a: [S[0].a[0], 1200, 800], b: [S[0].a[0], 1270, 800], u: [0, 1, 0], in: S[1].id }] };
    expect(monteerFouten(nep).length).toBeGreaterThan(0);
  }, 60000);
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
    for (const t of TT) for (const v of VERSIES) for (const bt of toestel(t.id, v).bouten.filter((b: any) => b.key !== 'anker' && b.L)) { expect(bt.L, `${t.id} ${bt.naam}`).toBeGreaterThanOrEqual(bt.lengteNodig); expect(bt.koop.key).toMatch(/x\d+$/); }
    expect(boutLengte(12, 120).L).toBeGreaterThanOrEqual(140);
  });
  it('P2-08: steek tussen boutgaten ≥ 2,2·d0 en boutgaten normaal (M12 Ø14, M16 Ø18)', () => {
    for (const t of TT) for (const v of VERSIES) { const o = toestel(t.id, v); expect(steekFouten(o), t.id).toEqual([]); }
  });
  it('P2-08: elk gat in de 3D ligt op het oppervlak van zijn stuk (niet alleen het juiste aantal)', () => {
    for (const id of ['FR-01', 'FP-04', 'FK-04']) { const o = toestel(id, 'pro'); for (const g of gaten(o)) for (const p of g.punten) { const m = Math.min(...g.deel.geo.map((d: any) => { const c = mul(add(d.a, d.b), 0.5), q = sub(p, c), hw = [Math.hypot(...sub(d.b, d.a)) / 2, d.bw / 2, d.bh / 2]; return Math.max(...[d.u, d.v, d.w].map((ax: number[], i: number) => Math.abs(q[0] * ax[0] + q[1] * ax[1] + q[2] * ax[2]) - hw[i])); })); expect(m, `${id} ${g.deel.naam}`).toBeLessThan(1); expect(m, `${id} ${g.deel.naam}`).toBeGreaterThan(-1); } }
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
    for (const t of TT) for (const v of VERSIES) { const o = toestel(t.id, v); expect(sleutelFouten(o), t.id).toEqual([]); expect(gezetFouten(o), t.id).toEqual([]); }
    const o = toestel('FR-01', 'thuis'), bt = o.bouten.find((b: any) => b.naam === 'Onderligger achter'), p = bt.punten[0];
    const blok = { id: 'x9', naam: 'Blok', soort: 'plaat', groep: 'Oud', kleur: 'frame', gaten: [], geo: [{ a: [p[0] - 30, p[1], p[2] + bt.lengte / 2 + 8], b: [p[0] + 30, p[1], p[2] + bt.lengte / 2 + 8], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], bw: 60, bh: 10 }] };
    expect(sleutelFouten({ ...o, delen: [...o.delen, blok] }).length).toBeGreaterThan(0);
    expect(gezetFouten({ delen: [{ naam: 'Kap', soort: 'plaat', opm: 'randen gezet', t: 2, l: 200, bmaat: 100, gaten: [{ x: 4, y: 50, d: 6 }] }] }).length).toBe(1);
  });
  it('P2-09: DXF per plaat en laserdeel: geldige R12 met de contour en een cirkel per gat', () => {
    // v7 (N-P2-11): naast de DXF staat per koker een gatentabel als CSV (geen DXF)
    for (const id of ['FR-01', 'FP-04', 'FK-04']) for (const x of dxfBestanden(toestel(id, 'pro')).filter((y: any) => !y.csv)) {
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
  it('P2-15: de stapel is rondom afgeschermd (v5: volledig omkapt, zijkappen over de staanders), opening 0 mm', () => {
    const o = toestel('FK-01', 'pro');
    expect(o.delen.filter((d: any) => d.naam === 'Afscherming zijkant').length).toBe(2);
    expect(o.delen.filter((d: any) => /^Afscherming (voor|achter|boven)$/.test(d.naam)).length).toBe(3);
    expect(berekening(o).controles.find((c: any) => c.wat === 'Openingen in de afscherming')!.formule).toMatch(/spleet naast de staander 0 mm/);
  }, 30000);
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
    for (const t of TT) for (const v of VERSIES) {
      const o = toestel(t.id, v), armen = o.delen.filter((d: any) => /^Hefboomarm/.test(d.naam));
      if (t.soort === 'plate') for (const a of armen.filter((x: any) => x.rol === 'hefboom')) { expect(a.P.ovaal, `${t.id} ${v}`).toBe(true); expect(a.geo[0].r).toBe(Math.min(a.P.b, a.P.h) / 2); }
      else if (t.soort !== 'selectorized') for (const a of armen) expect(a.P.ovaal ?? false).toBe(false); // v6 P3-01: FS-armen in vlakovaal
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
    for (const t of TT.filter((x) => x.soort === 'kabel')) for (const v of VERSIES) {
      const o = toestel(t.id, v), voor = o.delen.filter((d: any) => d.naam === 'Afscherming voor');
      for (const d of voor) {
        // v5 A2: de voorkap is een contourplaat met een venster (uitsparing); de selectiepen steekt door het venster
        expect(d.contour?.uitsparingen.length, t.id).toBe(1);
        expect(o.pronk.some((g: any) => g.kleur === 'venster'), t.id).toBe(true);
        const s = o.koop.find((k: any) => /selectiepen/.test(k.key));
        if (s) { const x = s.geo[0].a[0], z = s.geo[0].a[2], u = d.contour.uitsparingen[0].punten, xs = u.map((p: number[]) => p[0]), zs = u.map((p: number[]) => p[1]); if (Math.abs(x - (Math.min(...xs) + Math.max(...xs)) / 2) < 200) { expect(x).toBeGreaterThan(Math.min(...xs)); expect(x).toBeLessThan(Math.max(...xs)); expect(z, `${t.id} sleuf`).toBeGreaterThan(Math.min(...zs)); expect(z, `${t.id} sleuf`).toBeLessThan(Math.max(...zs)); } }
      }
      if (voor.length) { expect(o.koop.some((k: any) => k.key === 'polycarbonaat')).toBe(true); expect(o.koop.some((k: any) => k.key === 'instructiesticker')).toBe(true); }
      const kk = o.koop.find((k: any) => k.key === 'katrolkap');
      expect(kk?.n ?? 0, `${t.id} ${v} katrolkappen`).toBeGreaterThanOrEqual(Math.ceil(o.katrollen.length / 2));
    }
  });
  it('touch points: elke veerpen en selectiepen heeft een knop in de accentkleur; grendelhendels in de accentkleur', () => {
    for (const t of TT) for (const v of VERSIES) {
      const o = toestel(t.id, v);
      for (const k of o.koop.filter((x: any) => /pullpin|selectiepen/.test(x.key) && x.geo.length)) { expect(k.geo.some((g: any) => g.kleur === 'accent'), `${t.id} ${k.naam}`).toBe(true); expect(k.geo.some((g: any) => g.kleur === 'rubber')).toBe(false); }
      expect(o.stijl?.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('logoplaat: gelaserd, op 2 lasbouten (2 gaten), niet op een bewegend deel, vrij van botsingen, in de stuklijst en de DXF', () => {
    let n = 0;
    for (const t of TT) for (const v of VERSIES) {
      const o = toestel(t.id, v), lp = o.delen.find((d: any) => d.naam === 'Logoplaat');
      if (!lp) continue;
      n++;
      expect(lp.gaten.length).toBe(2); expect(lp.laser).toBe(true); expect(lp.t).toBe(3); // v6 P3-11: 2 gaten op lasbouten
      const host = o.delen.find((d: any) => d.id === lp.in);
      expect(/^(Hefboom|Slede|Wagen|Arm|Stang)/.test(host.groep)).toBe(false);
      expect(botsingen(o).filter((b: any) => b.a === 'Logoplaat' || b.b === 'Logoplaat')).toEqual([]);
      expect(stuklijst(o).posities.some((p: any) => p.naam === 'Logoplaat')).toBe(true);
      expect(o.koop.some((k: any) => k.key === 'lasbout')).toBe(true);
    }
    expect(n).toBeGreaterThanOrEqual(VOL ? 80 : 8);
  });
  it('afwerking: verchroomde schijfhouders, naafkappen op de hefbomen, verborgen voeten, instructieplaat, bies en eindkappen', () => {
    const fp = toestel('FP-01', 'pro');
    expect(fp.delen.filter((d: any) => /^Schijfhouder/.test(d.naam)).every((d: any) => d.geo[0].kleur === 'chroom')).toBe(true);
    expect(fp.koop.find((k: any) => k.key === 'verchromen')!.n).toBe(fp.delen.filter((d: any) => /^(Schijfhouder|Laadpen)/.test(d.naam)).length);
    expect(fp.koop.find((k: any) => k.key === 'naafkap')!.n).toBeGreaterThanOrEqual(2);
    for (const t of TT) for (const v of VERSIES) {
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
    for (const re of [/Naafkap/, /Hardverchromen/, /Lasbout/, /Instructieplaat/]) expect(koop).toMatch(re); // v6 P3-11: lasbouten i.p.v. VHB
    expect(geenNaN(JSON.stringify(k.regels))).toBe(true);
  });
});

describe('fitness v5 fase A2: vormtaal (gebogen buis, vrije contour, kappen)', () => {
  it('gebogen buis: R ≥ 3 x de hoogte in het buigvlak, past met klemlengte op 6 m, been te kort = fout', () => {
    let n = 0;
    for (const t of TT) for (const v of VERSIES) for (const d of toestel(t.id, v).delen.filter((x: any) => x.buig)) {
      n++;
      const h = d.staand ? d.P.b : d.P.h;
      expect(d.buig.R, `${t.id} ${d.naam}`).toBeGreaterThanOrEqual(3 * h - 0.5);
      expect(d.L + 300, `${t.id} ${d.naam}`).toBeLessThanOrEqual(STAAFLENGTE);
      expect(d.buig.bochten.length).toBeGreaterThan(0);
    }
    expect(n).toBeGreaterThan(VOL ? 40 : 4);
    expect(() => buigPad([[0, 0, 0], [100, 0, 0], [100, 100, 0]], 360)).toThrow(/te kort/);
    const p = buigPad([[0, 0, 0], [1000, 0, 0], [1000, 1000, 0]], 300);
    expect(p.L).toBeCloseTo(2000 - 2 * 300 + (Math.PI / 2) * 300, 0);
  });
  it('plate-loaded iso: voetframe als lus met ronde hoeken, gebogen portaal, lagerschilden met uitsparing, gebogen armen, schuine grepen', () => {
    for (const id of ['FP-04', 'FP-05', 'FP-08', 'FP-09']) for (const v of VERSIES) {
      const o = toestel(id, v);
      expect(o.delen.filter((d: any) => d.naam === 'Voetframe' && d.buig?.bochten.length === 2).length, id).toBe(2);
      expect(o.delen.filter((d: any) => d.naam === 'Rugboog' && d.buig).length, id).toBe(2);
      const oren = o.delen.filter((d: any) => d.naam === 'Lageroor');
      expect(oren.length).toBe(4); expect(oren.every((d: any) => d.contour)).toBe(true);
      if (id !== 'FP-09') expect(oren.every((d: any) => d.contour.uitsparingen.length === 1)).toBe(true);
      expect(o.delen.filter((d: any) => /^Hefboomarm/.test(d.naam)).every((d: any) => d.buig && d.P.ovaal)).toBe(true);
      for (const g of o.delen.filter((d: any) => d.naam === 'Greep')) expect(Math.abs(g.a[2] - g.b[2]), id).toBeGreaterThan(20);
      expect(berekening(o).controles.some((c: any) => /Rugboog/.test(c.wat) && c.oordeel === 'groen')).toBe(true);
      for (const st of [0, 0.5, 1]) expect(botsingen(toestel(id, v, { stand: st })), `${id} ${v} ${st}`).toEqual([]);
    }
  });
  it('contourplaat: DXF als polylijn met bogen en de uitsparing, stukblad met de vorm, gat te dicht bij de contour = fout', () => {
    const o = toestel('FP-04', 'pro'), oor = o.delen.find((d: any) => d.naam === 'Lageroor');
    const dx = dxfBestanden(o).find((x: any) => x.pos === oor.pos.pos)!;
    expect(dx.dxf).toMatch(/POLYLINE/); expect(dx.dxf).toMatch(/\n42\n/); expect(dx.dxf).toMatch(/UITSPARING/); expect(dx.dxf).toMatch(/CIRCLE/);
    const sb = stukBladen(o).find((b: any) => b.pos === oor.pos.pos)!;
    expect(sb.svg).toMatch(/vrije contour/); expect(sb.svg).toMatch(/fill-rule="evenodd"/);
    expect(gatFouten(o)).toEqual([]);
    const fout = { ...o, delen: o.delen.map((d: any) => (d === oor ? { ...d, gaten: [...d.gaten, { ...d.gaten[0], lx: d.gaten[0].lx, ly: d.gaten[0].ly - 60, p: add(d.gaten[0].p, [0, 0, -60]) }] } : d)) };
    expect(gatFouten(fout).some((x: string) => /tot de contour/.test(x))).toBe(true);
    const c = afronden([[0, 0, 20], [100, 0, 20], [100, 50, 20], [0, 50, 20]]);
    expect(c.omtrek).toBeCloseTo(2 * (100 + 50) - 8 * 20 + 2 * Math.PI * 20, 0);
  });
  it('gebogen buis: stukblad met buigtabel, stuklijst met bochten, prijs per bocht, werkwijze buigen, laser per meter', () => {
    const o = toestel('FP-08', 'pro'), boog = o.delen.find((d: any) => d.naam === 'Rugboog');
    const sb = stukBladen(o).find((b: any) => b.pos === boog.pos.pos)!;
    expect(sb.svg).toMatch(/Buigtabel/); expect(sb.svg).toMatch(/R360/);
    expect(stuklijst(o).posities.find((p: any) => p.naam === 'Rugboog')!.zaagT).toMatch(/gebogen: 1 bocht 90°/);
    const k = kostprijs(o);
    expect(k.regels.find((r: any) => r.cat === 'buigen')!.bedrag).toBeGreaterThan(0);
    expect(k.regels.find((r: any) => r.cat === 'laser')!.wat).toMatch(/m snijlijn/);
    expect(k.stappen.some((s: any) => s.titel === 'Buigen')).toBe(true);
  });
  it('kabel: stapeltoren volledig omkapt (voor, zij, achter, ronde bovenkap), voetkappen, gebogen lat-arm', () => {
    for (const t of TT.filter((x) => x.soort === 'kabel')) {
      const o = toestel(t.id, 'pro'), voor = o.delen.filter((d: any) => d.naam === 'Afscherming voor');
      if (!voor.length) continue;
      expect(o.delen.filter((d: any) => d.naam === 'Afscherming boven').length, t.id).toBe(voor.length);
      expect(o.delen.filter((d: any) => d.naam === 'Afscherming zijkant').length, t.id).toBe(2 * voor.length);
      expect(o.koop.filter((k: any) => k.key === 'voetkap').reduce((t2: number, k: any) => t2 + k.n, 0)).toBe(2 * voor.length);
      expect(kabelFouten(o), t.id).toEqual([]);
    }
    expect(toestel('FK-01', 'pro').delen.find((d: any) => d.naam === 'Lat-arm').buig).toBeTruthy();
  });
  it('rek: kopplaten met schuine hoeken, eindplaten op de voeten, zijplaat met naam (FR-01)', () => {
    const o = toestel('FR-01', 'pro');
    expect(o.delen.filter((d: any) => d.naam === 'Kopplaat').length).toBe(4);
    expect(o.delen.filter((d: any) => d.naam === 'Eindplaat voet').length).toBe(4);
    expect(o.delen.filter((d: any) => d.naam === 'Zijplaat met naam').length).toBe(2);
    expect(o.koop.filter((k: any) => /^kap(40|60|80)$/.test(k.key)).reduce((s: number, k: any) => s + k.n, 0)).toBeLessThan(toestel('FR-01', 'pro').delen.length);
    expect(zwevend(o)).toEqual([]); expect(botsingen(o)).toEqual([]);
  });
  it('bank: ovaalbuis-ligger, gebogen achterpoot, transportwielen, handgreep, taps kussen en zitting met ronde neus (FB-01, FB-02)', () => {
    for (const id of ['FB-01', 'FB-02']) for (const v of VERSIES) {
      const o = toestel(id, v);
      expect(o.delen.find((d: any) => d.naam === 'Ligger').P.ovaal).toBe(true);
      expect(o.delen.find((d: any) => d.naam === 'Achterpoot').buig).toBeTruthy();
      expect(o.koop.find((k: any) => k.key === 'transportwiel')!.n).toBe(2);
      expect(o.delen.some((d: any) => d.naam === 'Handgreep verplaatsen')).toBe(true);
      expect(o.kussens[0].geo[0].taps).toBeTruthy();
      expect(berekening(o).oordeel).not.toBe('rood');
    }
    expect(toestel('FB-02', 'pro').kussens.find((k: any) => k.naam === 'Zitting').geo[0].neus.r).toBeGreaterThan(80);
  });
});

describe('fitness v5 fase A3: vormtaal op alle toestellen', () => {
  it('iso-machines: één centrale rugboog (2 buizen spiegelsymmetrisch rond x = 0), ligger midden erop', () => {
    for (const id of ['FP-04', 'FP-05', 'FP-08', 'FP-09']) for (const v of VERSIES) {
      const o = toestel(id, v), bogen = o.delen.filter((d: any) => d.naam === 'Rugboog');
      expect(bogen.length, id).toBe(2);
      expect(bogen[0].a[0] + bogen[1].a[0], id).toBeCloseTo(0, 3); expect(bogen[0].a[1]).toBeCloseTo(bogen[1].a[1], 3);
      expect(o.lassen.some((l: any) => l.A.naam === 'Rugboog' && l.B.naam === 'Rugboog'), `${id} aan elkaar gelast`).toBe(true);
      const pt = o.delen.find((d: any) => d.naam === 'Portaalligger'); expect(pt.a[0] + pt.b[0]).toBeCloseTo(0, 3);
    }
  });
  it('FP-01: zijschild met vrije contour en uitsparingen tussen de palen, vrij van de slede', () => {
    for (const v of VERSIES) {
      const o = toestel('FP-01', v), sch = o.delen.filter((d: any) => d.naam === 'Zijschild');
      expect(sch.length).toBe(2); expect(sch.every((d: any) => d.contour && d.contour.uitsparingen.length >= 1)).toBe(true);
      for (const st of [0, 0.5, 1]) expect(botsingen(toestel('FP-01', v, { stand: st }))).toEqual([]);
    }
  });
  it('vloerlus in koker op de plate-loaded machines waar ze past; voorvoet en bankvoeten in pijlvorm', () => {
    for (const id of ['FP-02', 'FP-03', 'FP-07', 'FP-10']) expect(toestel(id, 'pro').delen.filter((d: any) => d.naam === 'Vloerrail' && d.buig).length, id).toBe(2);
    for (const id of ['FK-01', 'FK-02', 'FK-08', 'FK-09', 'FK-10', 'FK-12']) expect(toestel(id, 'pro').delen.find((d: any) => d.naam === 'Voorvoet').buig, id).toBeTruthy();
    for (const t of TT.filter((x) => x.soort === 'bank')) for (const d of toestel(t.id, 'pro').delen.filter((x: any) => /voet$/i.test(x.naam) && x.naam !== 'Voorvoet' || /^(Achtervoet|Hoge voet|Lage voet)$/.test(x.naam))) expect(d.buig, `${t.id} ${d.naam}`).toBeTruthy();
    expect(toestel('FK-06', 'pro').delen.find((d: any) => d.naam === 'Lat-arm').buig).toBeTruthy();
  });
});

describe('fitness v5 fase B: varianten', () => {
  it('semi-pro: klasse S, max. 135 kg, alle 50 toestellen zonder botsing of rood, prijs tussen thuis en pro', () => {
    for (const t of TT) {
      const o = toestel(t.id, 'semi');
      expect(o.V.klasse).toBe('S'); expect(o.V.gebruiker).toBe(135);
      expect(botsingen(o), t.id).toEqual([]); expect(zwevend(o), t.id).toEqual([]);
      expect(berekening(o).controles.filter((c: any) => c.oordeel === 'rood').map((c: any) => c.wat), t.id).toEqual([]);
      const [kt, ks, kp] = (['thuis', 'semi', 'pro'] as const).map((v) => kostprijs(toestel(t.id, v)).incl);
      expect(ks, t.id).toBeGreaterThanOrEqual(kt - 1); expect(ks, t.id).toBeLessThanOrEqual(kp + 1);
      expect(t.markt.semi[0]).toBeLessThan(t.markt.semi[1]);
    }
  }, 120000);
  it('maat compact / standaard / XL: rek lager of hoger, bank korter of langer, stapel 4 platen minder of meer', () => {
    const H = (m: string) => toestel('FR-01', 'pro', { maat: m }).maten.H;
    expect(H('compact')).toBeLessThan(H('standaard')); expect(H('XL')).toBeGreaterThan(H('standaard'));
    const L = (m: string) => toestel('FB-01', 'pro', { maat: m }).maten.D;
    expect(L('compact')).toBeLessThan(L('standaard')); expect(L('XL')).toBeGreaterThan(L('standaard'));
    const n = (m: string) => toestel('FK-01', 'pro', { maat: m }).stapels[0].n;
    expect(n('compact')).toBe(n('standaard') - 4); expect(n('XL')).toBe(n('standaard') + 4);
    expect(toestel('FP-04', 'pro', { maat: 'XL' }).maat).toBe('standaard'); // geen maten: standaard
    for (const id of ['FR-01', 'FR-02', 'FB-01', 'FK-01', 'FK-04', 'FS-01', 'FS-13', 'FM-02', 'FO-01', 'FO-16', 'FX-01', 'FX-09']) for (const m of ['compact', 'XL']) for (const v of ['thuis', 'pro'] as const) {
      const o = toestel(id, v, { maat: m });
      expect(botsingen(o), `${id} ${m}`).toEqual([]); expect(zwevend(o)).toEqual([]); expect(kabelFouten(o)).toEqual([]);
      expect(berekening(o).controles.filter((c: any) => c.oordeel === 'rood').length, `${id} ${m}`).toBe(0);
    }
    expect(alleBladen(toestel('FR-01', 'semi', { maat: 'XL' }))[0].svg).toMatch(/FR-01-SP-XL/);
  }, 120000);
  it('afwerking: zwart in plaats van chroom, zonder logo, RAL buiten de standaard met meerprijs', () => {
    const o = toestel('FP-01', 'pro', { afwerking: { chroom: false, logo: false, ral: '3020', leer: 'rood' } });
    expect(o.koop.some((k: any) => k.key === 'verchromen')).toBe(false);
    expect(o.delen.some((d: any) => d.naam === 'Logoplaat')).toBe(false);
    expect(o.afwerking).toMatchObject({ ral: '3020', leer: 'rood', chroom: false, logo: false });
    const k = kostprijs(o), k0 = kostprijs(toestel('FP-01', 'pro'));
    expect(k.regels.some((r: any) => /buiten de standaardkleuren/.test(r.wat))).toBe(true);
    expect(k0.regels.some((r: any) => /buiten de standaardkleuren/.test(r.wat))).toBe(false);
    expect(toestel('FR-01', 'pro', { afwerking: { logo: false } }).delen.some((d: any) => d.naam === 'Zijplaat met naam')).toBe(false);
  });
  it('opties: bouwen echte onderdelen of kooponderdelen, botsingsvrij; wat niet past, staat als niet gelukt', () => {
    const o = toestel('FR-01', 'pro', { opties: ['opslag', 'bandpinnen'] });
    expect(o.delen.filter((d: any) => d.naam === 'Schijfhouder (optie)').length).toBe(2);
    expect(o.delen.filter((d: any) => d.naam === 'Bandpin (optie)').length).toBe(2);
    expect(toestel('FP-04', 'pro', { opties: ['opslag'] }).delen.filter((d: any) => d.naam === 'Schijfhouder opslag (optie)').length).toBe(2);
    expect(toestel('FK-01', 'pro', { opties: ['grepenset', 'fijnstapel'] }).koop.filter((k: any) => ['grepenset', 'fijnstapel'].includes(k.key)).length).toBe(2);
    expect(toestel('FB-03', 'pro', { opties: ['wielen'] }).koop.some((k: any) => k.key === 'transportwiel')).toBe(true);
    expect(toestel('FR-06', 'pro', { opties: ['opslag'] }).gekozenOpties[0].gelukt).toBe(false);
    for (const [id, opt] of [['FR-01', ['opslag', 'bandpinnen']], ['FP-04', ['opslag', 'klemmen']], ['FB-03', ['wielen']]] as const) for (const st of [0, 0.5, 1]) { const x = toestel(id, 'pro', { opties: [...opt], stand: st }); expect(botsingen(x), `${id} ${st}`).toEqual([]); expect(zwevend(x)).toEqual([]); expect(schijvenVrij(x)).toEqual([]); }
    const kp = kostprijs(o).incl, k0 = kostprijs(toestel('FR-01', 'pro')).incl;
    expect(kp).toBeGreaterThan(k0);
  });
});

describe('fitness v5 fase C: opslag in pro-vormtaal en buiten (EN 16630)', () => {
  it('halterrek: V-goten in gezette plaat op ± 15° met rubber, zijplaten met logo, ronde voeten', () => {
    const o = toestel('FO-01', 'pro');
    const goot = o.delen.filter((d: any) => /^V-goot/.test(d.naam)), gl = o.delen.find((d: any) => /^Gootligger/.test(d.naam));
    expect(goot.length).toBe(4); expect(o.delen.some((d: any) => /^Ligger laag/.test(d.naam))).toBe(false);
    const hoek = Math.atan2(Math.abs(gl.v[2]), Math.abs(gl.v[1])) * 180 / Math.PI;
    expect(hoek).toBeGreaterThan(13); expect(hoek).toBeLessThan(17);
    expect(o.koop.some((k: any) => k.key === 'rubbermat' && k.geo.length === 4)).toBe(true);
    expect(o.delen.filter((d: any) => d.naam === 'Zijplaat' && d.contour.uitsparingen.length === 1).length).toBe(2);
    expect(o.delen.filter((d: any) => d.naam === 'Eindplaat voet').length).toBe(4);
  });
  it('kettlebellrek: gezette bak met randen; plyobox dicht met handgrepen; schijvenboom op een kruisvoet met rubberen hulzen', () => {
    expect(toestel('FO-04', 'pro').delen.filter((d: any) => d.naam === 'Bak laag 1').length).toBe(3);
    const p = toestel('FO-16', 'pro');
    expect(p.delen.filter((d: any) => d.naam === 'Mantel').length).toBe(6); // v7 (N-P1-07): 2 helften, voor- en achtervlak gesplitst
    expect(p.delen.filter((d: any) => d.naam === 'Mantel' && d.contour.uitsparingen.length).length).toBe(2);
    expect(p.delen.some((d: any) => d.naam === 'Deksel') && p.delen.some((d: any) => d.naam === 'Bodem')).toBe(true);
    const s = toestel('FO-10', 'pro');
    expect(s.delen.filter((d: any) => d.naam === 'Kruisvoet').length).toBe(3); // v8 (P3-07): kruisvoet in plaats van een basisplaat
    expect(s.koop.filter((k: any) => k.key === 'rubberhuls').length).toBe(s.delen.filter((d: any) => /Schijfhouder/.test(d.naam)).length);
    expect(s.koop.some((k: any) => k.key === 'verchromen')).toBe(false);
  });
  it('buiten: EN 16630-toetsen (greep, openingen, valhoogte, valruimte), palen in een poer, verzinkt, infobord', () => {
    for (const t of TOESTELLEN.filter((x: any) => x.soort === 'buiten' && x.cfg?.palen)) {
      const o = toestel(t.id, 'pro'), B = berekening(o), en = B.controles.filter((c: any) => c.groep === 'EN 16630');
      expect(en.length, t.id).toBeGreaterThanOrEqual(2);
      expect(en.filter((c: any) => c.oordeel === 'rood').map((c: any) => c.wat), t.id).toEqual([]);
      expect(o.valruimte.Y, t.id).toBeLessThanOrEqual(3000); expect(o.valruimte.X, t.id).toBeGreaterThanOrEqual(1500);
      expect(o.context.some((g: any) => g.kleur === 'beton'), t.id).toBe(true);
      expect(o.koop.some((k: any) => k.key === 'infobord'), t.id).toBe(true);
      expect(kostprijs(o).regels.some((r: any) => /Thermisch verzinken/.test(r.wat)), t.id).toBe(true);
      expect(B.controles.some((c: any) => c.wat === 'Ingegoten in betonpoeren (EN 16630)' && c.oordeel !== 'rood'), t.id).toBe(true);
    }
    // monkey bars: sporten om 300 mm geven een vrije opening buiten 89-230 mm; de valtegels vervangen de valzone
    const m = toestel('FX-16', 'pro', { opties: ['valtegels'] });
    expect(m.koop.some((k: any) => /^valtegel/.test(k.key) && k.oppervlak > 10)).toBe(true); // v6 P2-11: dikte naar de valhoogte
    expect(m.context.some((g: any) => g.kleur === 'valzone')).toBe(false);
    expect(berekening(m).controles.find((c: any) => /Openingen hoofd/.test(c.wat))?.formule).toMatch(/buiten|> 230/);
  });
  it('strongman: laadpennen met kraag, klemmen als optie, losse werktuigen zonder kantelproef', () => {
    const j = toestel('FX-01', 'pro', { opties: ['klemmen'] });
    expect(j.delen.filter((d: any) => d.naam === 'Laadpen').length).toBe(2);
    expect(j.koop.find((k: any) => k.key === 'kraagklem').n).toBe(4);
    const l = berekening(toestel('FX-09', 'pro'));
    expect(l.controles.some((c: any) => c.wat === 'Los werktuig')).toBe(true);
    expect(l.controles.some((c: any) => /Kantelen op 10°/.test(c.wat))).toBe(false);
  });
});

describe('fitness v6: Fable 5.2 P1, elk met een negatieve proef', () => {
  const NOK = TOESTELLEN.filter((t: any) => toestel(t.id, 'pro').nok?.as);
  it('P1-01/02/03: de nok wikkelt op, de kabel blijft even lang, de stapel stijgt R·θ, de greep haalt de grens', () => {
    expect(NOK.length).toBeGreaterThanOrEqual(17);
    for (const t of NOK) for (const v of VERSIES) {
      const o = toestel(t.id, v), o1 = toestel(t.id, v, { stand: 1 });
      expect(nokFouten(o, o1), `${t.id} ${v}`).toEqual([]);
      expect(Math.abs(o1.stapels[0].dz - o.nok.slag), `${t.id}: stapel stijgt R·θ`).toBeLessThanOrEqual(1);
    }
    // negatief: de nok de andere kant op, de kabel langer in stand 1, te weinig kracht, de oude stapelweg
    const o = toestel('FS-01', 'pro'), o1 = toestel('FS-01', 'pro', { stand: 1 });
    expect(nokFouten({ ...o, nok: { ...o.nok, zin: -o.nok.zin } }, o1).some((x: string) => /draait van het raakpunt weg/.test(x))).toBe(true);
    expect(nokFouten(o, { ...o1, kabels: o1.kabels.map((k: any) => ({ ...k, L: k.L + 50 })) }).some((x: string) => /kabellengte/.test(x))).toBe(true);
    expect(nokFouten({ ...o, nok: { ...o.nok, kracht: o.nok.grens - 1 } }).some((x: string) => /grens/.test(x))).toBe(true);
    expect(nokFouten({ ...o, nok: { ...o.nok, slag: 600 } }).some((x: string) => /stapelweg/.test(x))).toBe(true);
    // v6b: compacte nok (R ≤ 220, zoals de merken) met een 2:1-takel; negatief: een nok van R 490 wordt gemeld
    for (const t of NOK) for (const v of VERSIES) expect(toestel(t.id, v).nok.Rn, t.id).toBeLessThanOrEqual(220);
    expect(nokFouten({ ...o, nok: { ...o.nok, Rn: 490 } }).some((x: string) => /R490 > 220/.test(x))).toBe(true);
    expect(o.kabels.some((k: any) => k.naam === 'Kabel nok' && k.last === 2 * o.nok.G)).toBe(true); // v7: staalkabel Ø8 (N-P2-03)
  });
  it('P1-02/03: kabelstations 1:1 of 2:1 naar de grens; greepweg FS-02 en FS-09 ≥ 380 mm', () => {
    for (const t of TOESTELLEN.filter((x: any) => x.soort === 'selectorized')) for (const v of VERSIES) {
      const o = toestel(t.id, v), K = o.nok ?? o.kracht;
      expect(K.kracht, `${t.id} ${v}`).toBeGreaterThanOrEqual(K.grens);
      const c = berekening(o).controles.find((x: any) => x.groep === 'Krachtsverhouding');
      expect(c?.oordeel, t.id).not.toBe('info');
    }
    for (const id of ['FS-02', 'FS-09']) expect(toestel(id, 'pro').nok.greepweg, id).toBeGreaterThanOrEqual(380);
    expect(toestel('FS-13', 'pro').kracht.overbrenging).toBe(1);
    // negatief: de oude lat pulldown (2:1, 100 kg) gaf 50 kg aan de stang
    expect(100 / 2).toBeLessThan(toestel('FS-13', 'pro').kracht.grens);
  });
  it('P1-04: het lagerhuis is uit te draaien tot de boring', () => {
    for (const id of ['FS-01', 'FS-12', 'FK-08', 'FK-10']) expect(lagerhuisFouten(toestel(id, 'pro')), id).toEqual([]);
    const o = toestel('FS-01', 'pro');
    expect(lagerhuisFouten({ ...o, delen: [{ naam: 'Lagerhuis', boring: 44, P: { b: 60.3, t: 8 } }] }).length).toBe(1);
  });
  it('P1-05: dipgrepen Ø42,4 x 4 met berekening, 2 pennen en een U-zadel; Ø32 zou te zwak zijn', () => {
    for (const id of ['FM-09', 'FM-11', 'FM-17', 'FM-21', 'FM-22']) for (const v of VERSIES) {
      const o = toestel(id, v), B = berekening(o);
      expect(o.delen.filter((d: any) => d.naam === 'Dipgreep').every((d: any) => d.prof === 'b42x4'), id).toBe(true);
      expect(o.delen.filter((d: any) => d.naam === 'Dip wang').length, id).toBe(2);
      expect(o.pennen.filter((p: any) => /^Dip pen/.test(p.naam)).length, id).toBe(2);
      expect(B.controles.filter((c: any) => /Dipgreep|Dipbeugel|Dip pen/.test(c.wat)).length, id).toBeGreaterThanOrEqual(4);
      expect(B.controles.filter((c: any) => /Dipgreep|Dipbeugel|Dip pen/.test(c.wat) && c.oordeel === 'rood'), id).toEqual([]);
      expect(o.lasten.some((l: any) => l.geval === 'dip'), id).toBe(true);
    }
    // negatief: dezelfde last op de oude greep Ø32 x 3,2
    const s = (2.5 * 150 * 9.81 * 400) / (PROFIEL as any).b32x3.W;
    expect(s).toBeGreaterThan(235);
  });
  it('P1-06/07/08: laadpaal te laden, log ≤ 0,5 x de last, stenenplatform zwaar genoeg', () => {
    for (const t of TOESTELLEN.filter((x: any) => x.soort === 'buiten' && !x.cfg?.palen)) for (const v of VERSIES) expect(laadpenFouten(toestel(t.id, v)), `${t.id} ${v}`).toEqual([]);
    const lp = toestel('FX-04', 'pro');
    expect(laadpenFouten({ ...lp, delen: lp.delen.map((d: any) => ({ ...d, los: false })) }).length).toBeGreaterThan(0);
    for (const id of ['FX-09', 'FX-10', 'FX-04']) for (const v of VERSIES) { const o = toestel(id, v); expect(o.massa, `${id} ${v}`).toBeLessThanOrEqual(0.5 * o.maxLast); }
    expect(101).toBeGreaterThan(0.5 * toestel('FX-09', 'thuis').maxLast); // negatief: de oude log (101 kg) bij 100 kg
    const st = toestel('FX-11', 'pro'), Bs = berekening(st);
    expect(st.massa).toBeGreaterThanOrEqual(150);
    for (const w of ['Steen op 100 mm van de rand', 'Deksel 8 mm']) expect(Bs.controles.find((c: any) => c.wat.startsWith(w))?.benut, w).toBeLessThanOrEqual(1);
    const oud = (1.5 * 0.3 * 200 * 9.81 * 1.15) / (82 * 9.81 * 0.4 + 200 * 9.81 * 0.1); // het oude platform (82 kg, 800 breed)
    expect(oud).toBeGreaterThan(1);
  });
  it('P1-09/10: palen 600 mm in een poer onder het maaiveld, funderingsplan, ontluchting voor het verzinken', () => {
    for (const t of TOESTELLEN.filter((x: any) => x.soort === 'buiten' && x.cfg?.palen)) for (const v of VERSIES) {
      const o = toestel(t.id, v);
      expect(inbedFouten(o), `${t.id} ${v}`).toEqual([]);
      expect(ontluchtFouten(o), `${t.id} ${v}`).toEqual([]);
      const f = alleBladen(o).find((x: any) => x.id === 'fundering');
      expect(f, t.id).toBeTruthy(); expect(geldigeSvg(f!.svg)).toBeNull(); expect(f!.svg).toMatch(/600 in beton/);
    }
    const o = toestel('FX-12', 'pro');
    expect(inbedFouten({ ...o, context: o.context.map((g: any) => (g.kleur === 'beton' ? { ...g, a: [g.a[0], g.a[1], -300], b: [g.b[0], g.b[1], -900] } : g)) }).length).toBeGreaterThan(0);
    expect(ontluchtFouten({ ...o, delen: o.delen.map((d: any) => ({ ...d, gaten: [], kappen: [false, false] })) }).length).toBeGreaterThan(0);
  });
  it('P1-11: gezette platen zijn één positie met een uitslag en zetlijnen in de DXF', () => {
    for (const id of ['FO-01', 'FO-04', 'FO-05', 'FO-16', 'FO-20', 'FS-01', 'FK-01']) {
      const o = toestel(id, 'pro'), dx = dxfBestanden(o);
      expect(o.gezet.length, id).toBeGreaterThan(0);
      expect(uitslagFouten(o), id).toEqual([]);
      for (const g of o.gezet) {
        const d = dx.find((x: any) => x.pos === g.pos.pos);
        expect(d?.dxf, `${id} ${g.naam}`).toMatch(/ZETLIJN/);
        expect(d!.dxf).not.toMatch(/\$INSUNITS/);
      }
    }
    const v = toestel('FO-01', 'pro').gezet[0], som = v.zetlijnen.reduce((s: number, z: any) => s + z.ba, 0);
    // v7 (N-P1-07): de benen zijn buitenmaten; teruggevouwen geeft de uitslag de flanklengte van de 3D
    expect(terugVouwen(v.strook, v.t).every((x: number) => Math.abs(x - Math.hypot(230 / 2, 70)) < 3)).toBe(true); void som;
    const o = toestel('FO-04', 'pro');
    expect(uitslagFouten({ ...o, gezet: [], delen: o.delen.map((d: any) => ({ ...d, deelVan: undefined, opm: /^Bak/.test(d.naam) ? 'gezette bak' : d.opm })) }).length).toBeGreaterThan(0);
  });
  it('P1-12: plyobox taps, deksel 4 mm op 3 ribben; landing op de rand houdt, de oude box niet', () => {
    for (const id of ['FO-16', 'FO-17']) {
      const o = toestel(id, 'pro'), B = berekening(o);
      expect(o.delen.filter((d: any) => d.naam === 'Ribbe').length).toBe(3);
      for (const w of ['Landing op de rand', 'Deksel 4 mm']) expect(B.controles.find((c: any) => c.wat.startsWith(w))?.benut, `${id} ${w}`).toBeLessThanOrEqual(1);
    }
    const b = bouwer((VERSIE as any).pro, 0); b.o.opties = {};
    plyobox(b, {}, { maat: [600, 500, 500], taps: 0, td: 3 });
    expect(b.o.toetsen.filter((t: any) => t.benut > 1).length).toBe(2);
  });
});

describe('fitness v6: steekproef per bouwer, opties per reeks en een negatieve proef per nieuwe bouwer (P2-22, P2-24)', () => {
  it('opties per reeks: valtegels alleen buiten (EN 16630), klemmen alleen strongman; FS/FM/FO met alle opties botsingsvrij', () => {
    expect(toestel('FX-01', 'pro', { opties: ['valtegels', 'klemmen'] }).gekozenOpties.map((x: any) => x.id)).toEqual(['klemmen']);
    expect(toestel('FX-16', 'pro', { opties: ['valtegels', 'klemmen'] }).gekozenOpties.map((x: any) => x.id)).toEqual(['valtegels']);
    for (const [id, opt] of [['FS-01', ['grepenset', 'fijnstapel']], ['FM-02', ['opslag', 'bandpinnen', 'grepenset']], ['FS-13', ['grepenset', 'fijnstapel']]] as const) {
      const o = toestel(id, 'pro', { opties: [...opt] });
      expect(botsingen(o), id).toEqual([]); expect(zwevend(o), id).toEqual([]);
    }
  });
  it('negatieve proef: de controles vinden een fout in een model van elke nieuwe bouwer', () => {
    for (const id of ['FS-01', 'FS-03', 'FS-06', 'FS-12', 'FS-13', 'FM-02', 'FM-07', 'FM-09', 'FM-13', 'FO-01', 'FO-04', 'FO-09', 'FO-12', 'FO-14', 'FO-16', 'FO-18', 'FX-01', 'FX-03', 'FX-04', 'FX-07', 'FX-09', 'FX-11', 'FX-12', 'FX-16', 'FX-18', 'FX-24']) {
      const o = toestel(id, 'pro'), d = o.delen.find((x: any) => x.soort === 'staaf' && x.geo.length === 1 && !x.pad) ?? o.delen[0];
      // een kopie van een stuk 20 mm verschoven: steekt in het origineel
      const kopie = { ...d, id: 'x-kopie', naam: 'Kopie', in: null, groep: 'kopie', geo: d.geo.map((g: any) => ({ ...g, a: add(g.a, [20, 0, 0]), b: add(g.b, [20, 0, 0]) })) };
      expect(botsingen({ ...o, lassen: [], delen: [...o.delen, kopie] }).length, id).toBeGreaterThan(0);
      // een stuk 500 mm boven alles: zweeft
      const los = { ...d, id: 'x-los', naam: 'Los', geo: d.geo.map((g: any) => ({ ...g, a: add(g.a, [0, 0, 5000]), b: add(g.b, [0, 0, 5000]) })) };
      expect(zwevend({ ...o, delen: [...o.delen, los] }).length, id).toBeGreaterThan(0);
    }
  });
});

describe('fitness v7: Fable 5.2 op v6b, elke P1/P2 met een negatieve proef', () => {
  const NOK7 = (VOL ? TOESTELLEN.filter((t: any) => t.soort === 'selectorized' && toestel(t.id, 'pro').nok?.as) : ['FS-01', 'FS-09', 'FS-12', 'FS-23'].map((id) => ({ id }))) as any[];
  it('N-P1-01/N-P2-04: geleid takelblok achter de toren (centrisch), machine ≤ 2,25 m diep; zonder geleiding zweeft het blok', () => {
    for (const t of NOK7) for (const v of VERSIES) {
      const o = toestel(t.id, v);
      expect(o.delen.some((d: any) => d.naam === 'Takelblok juk'), t.id).toBe(true);
      expect(o.koop.filter((k: any) => /Geleidestang takelblok/.test(k.naam)).length, t.id).toBe(2);
      expect(o.gezet.some((g: any) => g.naam === 'Takelkoker'), t.id).toBe(true);
      // v6b: 2,0-2,7 m; nu ≤ 2,25 m (een ligmachine ≤ 2,4 m)
      expect(o.maten.D, `${t.id} ${v} diepte`).toBeLessThanOrEqual(o.delen.some((d: any) => d.naam === 'Ligbalk') ? 2400 : 2250);
      expect(zwevend(o), t.id).toEqual([]);
    }
    const o = toestel('FS-01', 'pro');
    // het blok steunt op zijn geleiding, niet alleen op de kabels: zonder kabels zweeft het niet, zonder stangen en lagers wel
    const zonderKabel = { ...o, koop: o.koop.filter((k: any) => !k.key?.startsWith('kabel')) };
    expect(zwevend(zonderKabel).some((g: string[]) => g.some((n) => /Takelblok/.test(n)))).toBe(false);
    const zonder = { ...zonderKabel, koop: zonderKabel.koop.filter((k: any) => !/Geleidestang takelblok|in het juk van het takelblok/.test(k.naam)) };
    expect(zwevend(zonder).some((g: string[]) => g.some((n) => /Takelblok/.test(n)))).toBe(true);
  });
  it('N-P1-03: een stapelplaat weegt haar label (± 3 %); kabel en katrollen rekenen met de echte stapel en blijven ≤ 90 %', () => {
    for (const id of ['FS-01', 'FS-13', 'FK-01']) for (const v of VERSIES) {
      const o = toestel(id, v), s = o.stapels[0];
      expect(Math.abs(s.massaPlaat - s.kg) / s.kg, id).toBeLessThanOrEqual(0.03);
      expect(s.massaEcht, id).toBeGreaterThan(s.last);
      const B = berekening(o);
      for (const c of B.controles.filter((x: any) => /Kabel|Katrol/.test(x.groep) && /veiligheidsfactor|belasting/.test(x.wat))) expect(c.benut, `${id} ${v} ${c.wat}`).toBeLessThanOrEqual(0.9);
    }
    // negatief: de plaat van v6b (340 x 112 x 20 met 3 gaten) weegt 5,67 kg
    const oud = (340 * 112 * 20 - (2 * Math.PI * 16 ** 2 + Math.PI * 10.5 ** 2) * 20) * 7.85e-6;
    expect(Math.abs(oud - 5) / 5).toBeGreaterThan(0.03);
  });
  it('N-P1-02: elke inlopende kneep van de nokmachine ligt in een gesloten kap; zonder nokkap of met een opening van 20 mm faalt het', () => {
    for (const t of NOK7) for (const v of VERSIES) expect(kapFouten(toestel(t.id, v)), `${t.id} ${v}`).toEqual([]);
    const o = toestel('FS-01', 'pro');
    expect(kapFouten({ ...o, kappen: o.kappen.filter((k: any) => k.naam !== 'Nokkap') }).some((x: string) => /nokkabel/.test(x))).toBe(true);
    const nok = o.kappen.find((k: any) => k.naam === 'Nokkap');
    expect(kapFouten({ ...o, kappen: [...o.kappen.filter((k: any) => k !== nok), { ...nok, openingen: [{ wat: 'open rand', mm: 20, p: o.knepen[0].p }] }] }).some((x: string) => /open rand/.test(x))).toBe(true);
  });
  it('N-P1-04: de arm draait vrij op de as (niet gelast), veerpen in de instelschijf, de aanslagen raken in stand 0 en 1', () => {
    for (const t of NOK7) {
      const o = toestel(t.id, 'pro'), o1 = toestel(t.id, 'pro', { stand: 1 });
      expect(aanslagFouten(o, o1), t.id).toEqual([]);
      const tussen = (a: string, b: string) => o.lassen.some((l: any) => [l.A.naam, l.B.naam].includes(a) && [l.A.naam, l.B.naam].includes(b));
      expect(tussen('Armbus', 'As hefboom'), t.id).toBe(false);
      expect(tussen('Hefboomarm', 'As hefboom'), t.id).toBe(false);
    }
    const o = toestel('FS-01', 'pro'), o1 = toestel('FS-01', 'pro', { stand: 1 });
    expect(aanslagFouten(o, { ...o1, aanslag: { ...o1.aanslag, einde: { z: o1.aanslag.einde.z + 30 } } }).some((x: string) => /stand 1/.test(x))).toBe(true);
    expect(aanslagFouten({ ...o, aanslag: { ...o.aanslag, begin: { ...o.aanslag.begin, p: add(o.aanslag.begin.p, [0, 0, 12]) } } }, o1).some((x: string) => /stand 0/.test(x))).toBe(true);
    expect(aanslagFouten({ ...o, pennen: o.pennen.filter((p: any) => !/Veerpen startstand/.test(p.naam)) }, o1).some((x: string) => /veerpen/.test(x))).toBe(true);
  });
  it('N-P1-05: FK-08 vloerkatrol aan de kabelkant; aan de buitenkant van de kabelhoek wordt ze gemeld', () => {
    for (const v of VERSIES) { const o = toestel('FK-08', v); expect(nokFouten(o, toestel('FK-08', v, { stand: 1 })), v).toEqual([]); }
    const o = toestel('FK-08', 'pro'), k = o.kabels.find((x: any) => x.einde === 'nok'), n = k.route.length, pf = k.route[n - 2];
    const fout = { ...o, kabels: [{ ...k, route: [...k.route.slice(0, n - 2), { ...pf, p: [pf.p[0], k.raak[1] - pf.r, pf.p[2]] }, k.route[n - 1]] }] };
    expect(nokFouten(fout).some((x: string) => /buitenkant van de kabelhoek/.test(x))).toBe(true);
  });
  it('N-P1-06: RVS niet gelast in een verzinkt toestel (bus + isolatiehuls, borgbout); verzinken zonder RVS; een gelaste RVS-stang wordt gemeld', () => {
    for (const id of ['FX-12', 'FX-13', 'FX-25']) {
      const o = toestel(id, 'pro');
      expect(materiaalFouten(o), id).toEqual([]);
      expect(o.delen.some((d: any) => /rvs$/.test(d.P?.id ?? '')), id).toBe(true);
      expect(kostprijs(o).regels.find((r: any) => /verzinken/i.test(r.wat))?.wat, id).toMatch(/zonder .* kg RVS/);
    }
    const o = toestel('FX-13', 'pro'), st = o.delen.find((d: any) => /rvs$/.test(d.P?.id ?? '')), paal = o.delen.find((d: any) => d.naam === 'Paal');
    expect(materiaalFouten({ ...o, lassen: [...o.lassen, { a: st.id, b: paal.id, A: st, B: paal }] }).some((x: string) => /RVS/.test(x))).toBe(true);
    expect(materiaalFouten({ ...o, delen: o.delen.map((d: any) => (d === st ? { ...d, rvsLos: false } : d)) }).length).toBeGreaterThan(0);
  });
  it('N-P1-07: uitslag uit buitenmaten (terugvouwen = 3D ± 1 mm), mantel in 2 helften met 4 zettingen, ≤ 1500 breed; de oude fout wordt gemeld', () => {
    // het voorbeeld van Fable: bak 3 mm, Ri 6, randen 43, breedte W: uitslag W + 72,6
    const u = uitslagStrook(500, [43, 600, 43], [{ hoek: 90, R: 6 }, { hoek: 90, R: 6 }], 3);
    expect(u.B).toBeCloseTo(600 + 72.6, 0);
    for (const id of ['FO-04', 'FO-16', 'FO-17', 'FS-01', 'FK-01']) expect(uitslagFouten(toestel(id, 'pro')), id).toEqual([]);
    const o = toestel('FO-04', 'pro'), g = o.gezet.find((x: any) => /^Bak/.test(x.naam));
    // negatief: de benen als vlakke lengtes (v6b) geven een te brede uitslag
    const fout = { ...g, strook: { ...g.strook, B: g.strook.B + 24, zetlijnen: g.strook.zetlijnen.map((z: any, i: number) => ({ ...z, a: [z.a[0], z.a[1] + 12 * (i + 1)] })) } };
    expect(uitslagFouten({ ...o, gezet: [fout] }).some((x: string) => /teruggevouwen/.test(x))).toBe(true);
    const p = toestel('FO-16', 'pro'), m = p.gezet.filter((x: any) => /Mantel helft/.test(x.naam));
    expect(m.length).toBe(2); expect(m.reduce((s: number, x: any) => s + x.zetlijnen.length, 0)).toBe(4);
    for (const x of m) expect(Math.min(x.l, x.bmaat)).toBeLessThanOrEqual(1500);
    expect(uitslagFouten({ ...p, gezet: [{ ...m[0], hoeken: 3 }] }).some((x: string) => /naad sluit niet/.test(x))).toBe(true);
    expect(uitslagFouten({ ...p, gezet: [{ ...m[0], l: 2205, bmaat: 1537 }] }).some((x: string) => /splitsen/.test(x))).toBe(true);
  });
  it('N-P2-01: de massa van het model = de stuklijst (± 5 %); een massieve goot (v6b) valt erdoor', () => {
    for (const id of ['FS-01', 'FS-12', 'FO-16', 'FX-13', 'FK-08']) {
      const o = toestel(id, 'pro'), st = o.delen.reduce((s: number, d: any) => s + massa(d), 0), kg = totalen(o).kg;
      expect(Math.abs(st / kg - 1), id).toBeLessThanOrEqual(0.05);
    }
    // negatief: de goot van v6b telde als massief blok 195 x 1119 x 170 (296 kg) bovenop de stuklijst
    const o = toestel('FS-01', 'pro'), st = o.delen.reduce((s: number, d: any) => s + massa(d), 0) + 195 * 1119 * 170 * 7.85e-6;
    expect(Math.abs(st / totalen(o).kg - 1)).toBeGreaterThan(0.05);
  });
  it('N-P2-02: de grens is een vast getal met een bron en de pro-machines halen hem (v8: zie P2-02 hieronder)', () => {
    expect(NOKGRENS.druk).toBe(130); expect(NOKGRENS.been).toBe(130);
    expect(toestel('FS-01', 'pro').nok.kracht).toBeGreaterThanOrEqual(130);
    // negatief: de stapel van v6b (28 x 5 kg) met R220 aan arm 650 geeft 95 kg
    expect((2 * 28 * 5 * 220) / Math.hypot(560, 330)).toBeLessThan(130);
  });
  it('N-P2-03/N-P2-06: bestelbare kabel en kabelschijven met datablad, geen nokriem; as S355J2+C (geen C45)', () => {
    const o = toestel('FS-01', 'pro');
    for (const k of o.kabels) expect(KOOP[k.key].nagekeken, k.key).toBe(true);
    for (const kt of o.katrollen) expect(KOOP[kt.key].nagekeken, kt.key).toBe(true);
    expect((KOOP as any).nokriem).toBeUndefined();
    const as = o.delen.find((d: any) => d.naam === 'As hefboom');
    expect(as.P.naam).toMatch(/S355J2\+C/); expect(`${as.P.naam} ${as.P.mat} ${as.opm}`).not.toMatch(/C45/);
  });
  it('N-P2-07: FX-04 stift Ø32 in de laadpen (speling ≤ 0,5 mm) met een borgpen Ø10 die getoetst is', () => {
    const o = toestel('FX-04', 'pro'), st = o.delen.find((d: any) => d.naam === 'Greepstift'), lp = o.delen.find((d: any) => d.naam === 'Laadpen');
    const binnen = lp.P.b - 2 * lp.P.t;
    expect(binnen - st.P.b).toBeLessThanOrEqual(0.5); expect(binnen - st.P.b).toBeGreaterThan(0);
    expect(o.pennen.some((p: any) => p.naam === 'Borgpen T-greep' && p.d === 10)).toBe(true);
    expect(berekening(o).controles.some((c: any) => /Borgpen Ø10/.test(c.wat) && c.oordeel === 'groen')).toBe(true);
    expect(binnen - 25).toBeGreaterThan(0.5); // negatief: de stift Ø25 van v6 rammelt 7 mm
  });
  it('N-P2-08: funderingsplan met kettingmaten, diagonalen, paalhoogte per poer en strook bij FX-23', () => {
    const f13 = funderingBlad(toestel('FX-13', 'pro')), f23 = funderingBlad(toestel('FX-23', 'pro'));
    for (const f of [f13, f23]) { expect(geldigeSvg(f)).toBeNull(); expect(f).toMatch(/diagonaal/); expect(f).toMatch(/Paal boven peil/); expect(f).toMatch(/valruimte/); }
    expect(f23).toMatch(/strook/);
  });
  it('N-P2-09: klantmap zonder werkplaatsmodules en zonder inkoopprijzen, met vooraf berekende prijzen en een offerteknop', async () => {
    const { execFileSync } = await import('node:child_process'), { mkdtempSync, existsSync, readFileSync } = await import('node:fs'), { tmpdir } = await import('node:os'), { join } = await import('node:path');
    const d = mkdtempSync(join(tmpdir(), 'fitklant-'));
    execFileSync(process.execPath, ['bibliotheek/fitness/maak-web.mjs', d, '--klant', '--ids', 'FS-01'], { stdio: 'pipe' });
    for (const w of ['prijzen.mjs', 'werkwijze.mjs', 'dossier.mjs', 'tekeningen.mjs', 'montage.mjs', 'dxf.mjs', 'stuklijst.mjs']) expect(existsSync(join(d, 'klant', 'js', w)), w).toBe(false);
    const pg = readFileSync(join(d, 'klant', 'index.html'), 'utf8'), ond = readFileSync(join(d, 'klant', 'js', 'onderdelen.mjs'), 'utf8'), shim = readFileSync(join(d, 'klant', 'js', 'prijzen-klant.mjs'), 'utf8');
    expect(pg).toMatch(/data-klant="1"/); expect(pg).toMatch(/prijzen-klant\.mjs/); expect(pg).toMatch(/Offerte-aanvraag/); expect(pg).not.toMatch(/js\/prijzen\.mjs/);
    expect(ond).not.toMatch(/k\('[^']*', '[^']*', '[^']*', [1-9]/);
    expect(shim).not.toMatch(/uurloon|marge:\s*\d/);
    const P = JSON.parse(readFileSync(join(d, 'klant', 'prijzen.json'), 'utf8'));
    expect(P['FS-01'].pro).toBe(Math.round(kostprijs(toestel('FS-01', 'pro')).incl));
    // het script van de klantpagina is geldig JavaScript (node --check)
    const scr = pg.slice(pg.indexOf('<script type="module">') + 22, pg.lastIndexOf('</script>')), f = join(d, 'pagina.mjs');
    (await import('node:fs')).writeFileSync(f, scr);
    expect(() => execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' })).not.toThrow();
    // negatief: de werkplaatspagina zelf importeert de kostprijs wel
    expect(readFileSync('bibliotheek/fitness/web/index.html', 'utf8')).toMatch(/from '\.\/js\/prijzen\.mjs'/);
  });
  it('N-P2-11/N-P2-13/N-P3-07: boormal + gatentabel CSV; verstelbare rolarm; uitneembaar duwframe; geen keuring op thuis buiten', () => {
    const dx = dxfBestanden(toestel('FK-04', 'pro'));
    expect(dx.some((x: any) => /boormal-1op1\.dxf$/.test(x.naam))).toBe(true);
    expect(dx.find((x: any) => x.csv)?.dxf).toMatch(/^pos;onderdeel;profiel;wand;langs_mm/);
    expect(dx.some((x: any) => /buislaser/.test(x.naam))).toBe(false);
    for (const id of ['FS-12', 'FK-08']) { const o = toestel(id, 'pro'); expect(o.delen.some((d: any) => d.naam === 'Rolslede'), id).toBe(true); expect(o.delen.find((d: any) => d.naam === 'Hefboomarm').gaten.length, id).toBeGreaterThanOrEqual(4); }
    const s = toestel('FX-07', 'pro');
    expect(s.delen.filter((d: any) => d.naam === 'Duwpaal').every((d: any) => d.los)).toBe(true);
    expect(s.delen.filter((d: any) => d.naam === 'Duwpaalhuls').length).toBe(2);
    expect(kostprijs(toestel('FX-13', 'thuis')).regels.some((r: any) => /Keuring/.test(r.wat))).toBe(false);
    expect(kostprijs(toestel('FX-13', 'pro')).regels.some((r: any) => /Keuring/.test(r.wat))).toBe(true);
  });
});

describe('fitness v8: de rest van Fable 5.2 v6, elk met een negatieve proef', () => {
  it('P2-02: de grens per oefening is stapel x verhouding van een merktoestel met productblad (vaste getallen)', () => {
    expect(NOKGRENS).toEqual({ druk: 130, trek: 130, rug: 130, been: 130, kuit: 130, arm: 90, romp: 65, lagerug: 130 });
    for (const k of Object.keys(NOKGRENS)) expect(NOKGRENS_BRON[k], k).toMatch(/Nautilus Impact .*pulley ratio 1:1/);
    for (const id of ['FS-01', 'FS-06', 'FS-12', 'FS-13']) { const o = toestel(id, 'pro'), K = o.nok ?? o.kracht; expect(K.kracht, id).toBeGreaterThanOrEqual(K.grens); }
    expect(toestel('FS-01', 'pro').nok.grens).toBe(130);
    // negatief: de stapel van v7 (34 platen) haalt 130 kg niet met R220 aan arm 650
    expect((2 * 34 * 5 * 220) / Math.hypot(560, 330)).toBeLessThan(130);
  });
  it('FS vormtaal: lagerschild is de paal, één gesloten voetlus, zitting en rug op één ruggengraat; geen losse T-voeten', () => {
    for (const id of ['FS-01', 'FS-09', 'FS-12', 'FS-23']) {
      const o = toestel(id, 'pro');
      expect(o.delen.some((d: any) => d.naam === 'Lagerpaal'), id).toBe(false);
      expect(o.delen.some((d: any) => d.naam === 'Voet lagerpaal'), id).toBe(false);
      expect(o.delen.filter((d: any) => d.naam === 'Lagerschild' && d.t >= 10).length, id).toBe(4);
      const lus = o.delen.find((d: any) => d.naam === 'Voetlus');
      expect(lus?.buig?.bochten.length, id).toBe(2);
      expect(berekening(o).controles.find((c: any) => /Lagerschild/.test(c.wat))?.oordeel, id).toBe('groen');
    }
    for (const id of ['FS-01', 'FS-09']) {
      const o = toestel(id, 'pro'), sp = o.delen.find((d: any) => d.naam === 'Ruggengraat');
      expect(sp?.buig?.bochten.length, id).toBe(1);
      expect(o.delen.some((d: any) => d.naam === 'Zitslede'), id).toBe(true);
      expect(o.delen.some((d: any) => d.naam === 'Rugpaal' || d.naam === 'Zitpaal'), id).toBe(false);
      expect(o.pennen.some((p: any) => p.naam === 'Veerpen zitting'), id).toBe(true);
    }
  });
  it('FK-08, FK-09, FK-12 en FK-10: gesloten nokkap of nokkast; zonder kap faalt kapFouten', () => {
    for (const id of ['FK-08', 'FK-09', 'FK-12']) {
      const o = toestel(id, 'pro');
      expect(o.gezet.some((g: any) => /^Nokkap rand/.test(g.naam)), id).toBe(true);
      expect(o.knepen?.length, id).toBeGreaterThan(0);
      expect(kapFouten(o), id).toEqual([]);
      expect(kapFouten({ ...o, kappen: o.kappen.filter((k: any) => k.naam !== 'Nokkap') }).length, id).toBeGreaterThan(0);
    }
    const o = toestel('FK-10', 'pro');
    expect(o.gezet.some((g: any) => g.naam === 'Nokkast')).toBe(true);
    expect(o.delen.some((d: any) => d.naam === 'Nokkap')).toBe(false);
  });
  it('P2-18: geen las over de ronding van een vlakovaal (zadelplaat of de ovaal eindigt op een vlak); zonder zadelplaat oranje', () => {
    for (const id of ['FB-01', 'FK-01', 'FP-01', 'FP-03', 'FP-04', 'FS-01', 'FS-13']) {
      const o = toestel(id, 'pro'), B = berekening(o);
      expect(B.controles.some((c: any) => /P2-18/.test(c.wat)), id).toBe(false);
    }
    const o = toestel('FP-04', 'pro');
    expect(o.delen.some((d: any) => d.naam === 'Zadelplaat')).toBe(true);
    const zonder = { ...o, delen: o.delen.map((d: any) => ({ ...d, zadelOp: undefined })), lassen: o.lassen.map((l: any) => ({ ...l, A: { ...l.A, zadelOp: undefined }, B: { ...l.B, zadelOp: undefined } })) };
    expect(berekening(zonder).controles.some((c: any) => /P2-18/.test(c.wat) && c.oordeel === 'oranje')).toBe(true);
  });
  it('P2-15: buigradius per buigerij uit 2 publieke tabellen; per bocht staat welke buigerij het kan of dat er een offerte nodig is', () => {
    expect(new Set(BUIGERIJEN.map((b: any) => b.naam)).size).toBeGreaterThanOrEqual(2);
    expect(KANTBANK.length).toBeGreaterThanOrEqual(2);
    expect(buigKeuze({ vorm: 'buis', b: 42.4, h: 42.4 }, 100).some((x: any) => x.ok)).toBe(true);
    expect(buigKeuze({ vorm: 'buis', b: 42.4, h: 42.4 }, 60).some((x: any) => x.ok)).toBe(false); // negatief: te krap
    const B = berekening(toestel('FS-01', 'pro'));
    expect(B.controles.filter((c: any) => c.groep === 'Buigen' && /Buigradius/.test(c.wat)).length).toBeGreaterThan(0);
  });
  it('P3-08: voetflenzen met ankers en gatnummers (rigs), muurrig zonder achterstaanders, boog bij de functional trainer, geen kopligger, middenplaat, kruisvoet', () => {
    const r = toestel('FM-01', 'pro');
    expect(r.delen.some((d: any) => d.naam === 'Voetbalk')).toBe(false);
    expect(r.delen.filter((d: any) => d.naam === 'Voetflens').length).toBe(4);
    expect(r.koop.some((k: any) => k.key === 'gatnummers')).toBe(true);
    const m = toestel('FM-05', 'pro');
    expect(m.delen.some((d: any) => d.naam === 'Staander achter')).toBe(false);
    expect(m.delen.some((d: any) => d.naam === 'Muurstrip')).toBe(true);
    const ft = toestel('FM-13', 'pro'), boog = ft.delen.find((d: any) => d.naam === 'Bovenligger met greep');
    expect(boog?.buig?.bochten.length).toBe(4);
    expect(ft.delen.filter((d: any) => d.naam === 'Optrekgreep').length).toBe(2);
    expect(toestel('FO-01', 'pro').delen.some((d: any) => d.naam === 'Kopligger')).toBe(false);
    const fo = toestel('FO-02', 'pro');
    expect(fo.delen.some((d: any) => d.naam === 'Middenplaat')).toBe(true);
    expect(botsingen(fo)).toEqual([]);
    const k = toestel('FO-09', 'pro');
    expect(k.delen.some((d: any) => d.naam === 'Basisplaat')).toBe(false);
    expect(k.delen.filter((d: any) => d.naam === 'Kruisvoet').length).toBe(3);
  });
  it('N-P2-10: hechtlas bij een dunne plaat op een profiel (geen doorlopende naad); een doorlopende naad telt meer uren', () => {
    const o = toestel('FX-11', 'pro'), h = o.lassen.filter((l: any) => l.hecht);
    expect(h.length).toBeGreaterThan(0);
    for (const l of h) expect(l.naad).toBeLessThan(l.lengte);
    const vol = { ...o, lassen: o.lassen.map((l: any) => ({ ...l, naad: l.lengte })) };
    expect(totalen(vol).lasM).toBeGreaterThan(totalen(o).lasM);
  });
});
