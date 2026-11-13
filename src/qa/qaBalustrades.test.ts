/**
 * De balustrade-configurator (bibliotheek/balustrades): voor een rooster van soort x stijl x plaats x bevestiging x vorm
 * (recht, hoek, U, schuine hoek, trap) x maten bouwt het model zonder NaN; de openingen zijn ≤ 110 mm en niet beklimbaar
 * waar vereist, de hoogte haalt de norm, de stuklijst sluit met de geometrie (lengtes per lijn), de prijzen liggen in de
 * marktband en de tekeningen (bladen, stukken, montage) hebben geen NaN.
 */
import { describe, expect, it } from 'vitest';
import { ontwerp, lengtes, type Ontwerp } from '../../bibliotheek/balustrades/model.mjs';
import { berekening } from '../../bibliotheek/balustrades/bereken.mjs';
import { kostprijs, MARKTBAND } from '../../bibliotheek/balustrades/prijzen.mjs';
import { stuklijst, zaagplan } from '../../bibliotheek/balustrades/stuklijst.mjs';
import { alleBladen, stukBladen } from '../../bibliotheek/balustrades/tekeningen.mjs';
import { montageBladen } from '../../bibliotheek/balustrades/montage.mjs';
import { dossierHtml, lijstenCsv } from '../../bibliotheek/balustrades/dossier.mjs';
import { SOORTEN, PROFIEL } from '../../bibliotheek/balustrades/onderdelen.mjs';
// @ts-expect-error: de taatsdeuren zijn plain JavaScript
import { vlakken } from '../../bibliotheek/taatsdeuren/verbinding.mjs';

const VORM: Record<string, Record<string, unknown>> = {
  recht: { vorm: 'recht', L1: 3500 }, hoek: { vorm: 'hoek', L1: 4000, L2: 2500, hoek: 90 }, u: { vorm: 'u', L1: 2000, L2: 3200, L3: 2000, hoek: 90 },
  schuin: { vorm: 'hoek', L1: 3000, L2: 3000, hoek: 135 }, trap: { vorm: 'trap', L1: 3000, L2: 1500, H: 1000 },
};
const MATEN = [{ schaal: 1, H: 0 }, { schaal: 2.4, H: 1200 }];
const eindig = (o: Ontwerp) => [...o.delen.flatMap((d) => [...d.a, ...d.b]), ...o.panelen.flatMap((p) => p.pts.flat()), ...o.platen.flatMap((p) => p.p), ...o.klemmen.flatMap((k) => k.p), ...o.ankers.flatMap((a) => a.p)].every(Number.isFinite);
const geenNaN = (s: string) => !/NaN|undefined|Infinity/.test(s);

const rooster: { naam: string; k: Record<string, unknown> }[] = [];
for (const [soort, S] of Object.entries(SOORTEN)) for (const st of S.stijlen) for (const plaats of ['binnen', 'buiten']) for (const bevestiging of ['boven', 'zij']) for (const [vorm, v] of Object.entries(VORM)) for (const [mi, m] of MATEN.entries()) {
  // de eerste stijl in elke vorm, de andere stijlen recht en langs de trap
  if (st !== S.stijlen[0] && !['recht', 'trap'].includes(vorm)) continue;
  const k: Record<string, unknown> = { soort, stijl: st.id, plaats, bevestiging, ...v, vloerdikte: 300 };
  for (const L of ['L1', 'L2', 'L3']) if (typeof k[L] === 'number') k[L] = Math.round((k[L] as number) * m.schaal);
  if (m.H) k.H = vorm === 'trap' ? 1100 : m.H;
  rooster.push({ naam: `${soort} ${st.id} ${plaats} ${bevestiging} ${vorm} ${mi ? 'groot' : 'klein'}`, k });
}

describe('rooster: model, normen, stuklijst, prijs, tekeningen', () => {
  it(`${rooster.length} combinaties`, () => expect(rooster.length).toBeGreaterThan(300));
  for (const { naam, k } of rooster) it(naam, () => {
    const o = ontwerp(k);
    expect(eindig(o), 'NaN in de geometrie').toBe(true);
    expect(o.delen.length).toBeGreaterThan(0);
    // hoogte en openingen (NBN B 03-004)
    expect(o.k.H).toBeGreaterThanOrEqual(o.vereist);
    for (const op of o.openingen) {
      if (op.klim) { if (o.klim && o.st.patroon !== 'cirkel') expect(op.mm, op.wat).toBeLessThan(op.max); }
      else expect(op.mm, op.wat).toBeLessThanOrEqual(op.max);
    }
    // de stuklijst sluit met de geometrie: per lijn de handregel of het U-profiel = de lengte langs de lijn;
    // de vrije velden + de staanders = de lijn; het glas + de voegen = de lijn
    for (const s of o.segs) {
      const hr = o.delen.filter((d) => (d.rol === 'handregel' || d.rol === 'uprofiel') && d.seg === s.i && d.prof !== 'koop' || ((d.rol === 'uprofiel') && d.seg === s.i));
      expect(hr.length, `lijn ${s.i}`).toBe(1);
      expect(lengtes(hr[0]).hart).toBeCloseTo(s.L3, 0);
      if (o.staander && s.posten) {
        const P = PROFIEL[o.staander.prof], eerste = s.i === 0, laatste = s.i === o.segs.length - 1;
        const velden = (s.posten.length - 1) * (s.posten[1] - s.posten[0] - P.b), staanders = (s.posten.length - 1) * P.b + (eerste ? P.b / 2 : 0) + (laatste ? P.b / 2 : 0);
        expect(velden + staanders, `lijn ${s.i}: velden + staanders`).toBeCloseTo(s.Lh, 3);
        const onder = o.delen.filter((d) => d.rol === 'onderregel' && d.seg === s.i);
        if (onder.length) expect(onder.reduce((t, d) => t + lengtes(d).hart * Math.cos(s.alfa), 0)).toBeCloseTo(velden, 0);
      } else if (o.k.soort === 'glasU') {
        const gl = o.panelen.filter((p) => p.rol === 'glas' && p.seg === s.i);
        expect(gl.reduce((t, p) => t + p.w, 0) + (gl.length + 1) * 8).toBeCloseTo(s.Lh, 3);
      }
    }
    const sl = stuklijst(o);
    for (const rol of ['spijl', 'staaf', 'staander', 'handregel']) expect(sl.posities.filter((p) => p.rol === rol && p.soort === 'staaf').reduce((t, p) => t + p.n, 0), rol).toBe(o.delen.filter((d) => d.rol === rol && d.prof !== 'koop').length);
    for (const p of sl.posities) { expect(p.n).toBeGreaterThan(0); expect(Number.isFinite(p.kg) && p.kg > 0, `${p.naam} kg`).toBe(true); if (p.L) expect(p.L).toBeGreaterThan(20); }
    // zaagplan: alle stukken passen in hun staaf
    for (const pr of zaagplan(o).profielen) for (const st of pr.staven) expect(st.stukken.reduce((t, x) => t + x.l, 0)).toBeLessThanOrEqual(pr.lengte);
    // prijs en berekening
    const kp = kostprijs(o), B = berekening(o);
    expect(Number.isFinite(kp.perMeter) && kp.perMeter > 0).toBe(true);
    expect(kp.perMeter).toBeGreaterThanOrEqual(kp.perMeterZonder);
    expect(['groen', 'oranje', 'rood']).toContain(B.oordeel);
    for (const c of B.controles) expect(Number.isFinite(c.benut), c.wat).toBe(true);
    // tekeningen
    for (const b of alleBladen(o, { nr: 'BA-T', datum: '2026-11-13' })) expect(geenNaN(b.svg), `blad ${b.id}`).toBe(true);
    for (const b of montageBladen(o, { nr: 'BA-T' })) {
      expect(geenNaN(b.svg), `montage ${b.id}`).toBe(true);
      for (const d of b.scène.delen) for (const s of d.solids) for (const v of vlakken(s) as { pts: number[][] }[]) expect(v.pts.flat().every(Number.isFinite)).toBe(true);
    }
  });
});

describe('stukbladen en dossier', () => {
  for (const soort of Object.keys(SOORTEN)) for (const vorm of ['recht', 'hoek', 'trap']) it(`${soort} ${vorm}`, () => {
    const o = ontwerp({ soort, vorm, L1: 3000, L2: 1500 });
    for (const b of stukBladen(o, { nr: 'BA' })) expect(geenNaN(b.svg), `stuk ${b.pos}`).toBe(true);
    expect(geenNaN(dossierHtml(o, {}, { nr: 'BA', datum: '2026-11-13' }))).toBe(true);
    expect(lijstenCsv(o)).toContain('Stuklijst');
  });
});

describe('prijzen in de marktband (eerste stijl, recht, binnen, bovenop de vloer, woning)', () => {
  for (const soort of Object.keys(SOORTEN)) for (const L1 of [3000, 4500, 6000]) it(`${soort} ${L1} mm`, () => {
    const kp = kostprijs(ontwerp({ soort, L1, plaatsen: false })), mb = MARKTBAND[soort];
    expect(kp.perMeterZonder).toBeGreaterThanOrEqual(mb.laag);
    expect(kp.perMeterZonder).toBeLessThanOrEqual(mb.hoog);
    const met = kostprijs(ontwerp({ soort, L1, plaatsen: true }));
    expect(met.perMeter).toBeLessThanOrEqual(mb.hoogPl);
    expect(met.perMeter - kp.perMeterZonder).toBeCloseTo(met.plaatsen.perMeter, 0);
  });
});

describe('veiligheid', () => {
  it('standaard per soort (woning, recht) is niet rood', () => { for (const soort of Object.keys(SOORTEN)) expect(berekening(ontwerp({ soort })).oordeel, soort).not.toBe('rood'); });
  it('horizontale staven zonder plint zijn beklimbaar: rood in een woning, niet rood in de industrie', () => {
    expect(berekening(ontwerp({ soort: 'staven', stijl: 'H1', plint: false, cat: 'A' })).oordeel).toBe('rood');
    const e = berekening(ontwerp({ soort: 'staven', stijl: 'H1', plint: false, cat: 'E' }));
    expect(e.controles.filter((c) => /opstap|beklimbaar/i.test(c.wat)).every((c) => c.oordeel !== 'rood')).toBe(true);
    expect(berekening(ontwerp({ soort: 'staven', stijl: 'H1', cat: 'A' })).oordeel).not.toBe('rood');
  });
  it('lasergesneden cirkels Ø60 zijn een opstap in een woning', () => expect(berekening(ontwerp({ soort: 'staven', stijl: 'H6' })).oordeel).toBe('rood'));
  it('tussenruimte 120 mm is te groot', () => expect(berekening(ontwerp({ soort: 'spijlen', tussenruimte: 120 })).oordeel).toBe('rood'));
  it('te lage balustrade is rood', () => expect(berekening(ontwerp({ H: 1000 })).oordeel).toBe('rood'));
  it('glas: U-profiel 88.4 in een woning, 1010.4 publiek; tussen staanders 55.2 en 66.2', () => {
    expect(ontwerp({ soort: 'glasU', cat: 'A' }).glas?.opbouw).toBe('88.4');
    expect(ontwerp({ soort: 'glasU', cat: 'C' }).glas?.opbouw).toBe('1010.4');
    expect(ontwerp({ soort: 'glasstaal', cat: 'A' }).glas?.opbouw).toBe('55.2');
    expect(ontwerp({ soort: 'glasstaal', cat: 'B' }).glas?.opbouw).toBe('66.2');
  });
  it('publiek vraagt een zwaardere staander of een kleinere afstand dan een woning', () => {
    const sterkte = (o: Ontwerp) => (o.staander ? PROFIEL[o.staander.prof].W / o.afstand : 0);
    expect(sterkte(ontwerp({ cat: 'C' }))).toBeGreaterThan(sterkte(ontwerp({ cat: 'A' })));
  });
  it('trap: spijlen verticaal, schuin gezaagd op de helling', () => {
    const o = ontwerp({ vorm: 'trap', L1: 3000, L2: 0, optrede: 180, aantrede: 250 }), hel = (Math.atan(180 / 250) * 180) / Math.PI;
    const sp = o.delen.filter((d) => d.rol === 'spijl');
    expect(sp.length).toBeGreaterThan(10);
    for (const d of sp) { expect(d.a[0]).toBeCloseTo(d.b[0], 6); expect(d.zaag?.[0]).toBeCloseTo(hel, 6); }
  });
});
