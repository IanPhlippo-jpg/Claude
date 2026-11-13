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

// ---------------------------------------------------------------- onder een schuin dak (afschuining begin / einde)
/** onderkant, hart en bovenkant van de handregel op t (lineair binnen het stuk), uit de stukken zelf */
const hartOp = (o: Ontwerp, seg: number, t: number) => {
  const s = o.segs[seg], hr = o.delen.filter((d) => d.rol === 'handregel' && d.seg === seg);
  const proj = (p: number[]) => (p[0] - s.p0[0]) * s.d[0] + (p[1] - s.p0[1]) * s.d[1];
  const hrH = o.k.hr === 'rond' ? 42.4 : o.k.hr === 'plat' ? 8 : 0;
  for (const d of hr) {
    const ta = proj(d.a), tb = proj(d.b);
    if (t >= Math.min(ta, tb) - 0.01 && t <= Math.max(ta, tb) + 0.01) {
      const f = (t - ta) / (tb - ta || 1), z = d.a[2] + (d.b[2] - d.a[2]) * f, hel = Math.atan2(Math.abs(d.b[2] - d.a[2]), Math.abs(tb - ta));
      // de bovenkant: het schuine stuk wordt op de knik door het verstek afgesneden (buitenhoek op H)
      return { hart: z, onder: z - hrH / 2 / Math.cos(hel), boven: Math.min(o.k.H, z + hrH / 2 / Math.cos(hel)) };
    }
  }
  return null;
};
const dakRooster: { naam: string; k: Record<string, unknown> }[] = [];
for (const soort of Object.keys(SOORTEN)) for (const [kant, aan] of Object.entries({ begin: { dakBegin: true }, eind: { dakEind: true }, beide: { dakBegin: true, dakEind: true } }))
  for (const [vorm, v] of Object.entries({ recht: { vorm: 'recht', L1: 5000 }, hoek: { vorm: 'hoek', L1: 4000, L2: 3000, hoek: 90 }, u: { vorm: 'u', L1: 3000, L2: 3000, L3: 3000 } })) for (const helling of [15, 45, 60]) {
    if (helling === 15 && vorm !== 'hoek') continue; // 15°: schuin stuk ± 2 m, alleen met lange lijnen
    const k: Record<string, unknown> = { soort, ...v, ...aan, dakBeginHelling: helling, dakEindHelling: helling, dakBeginMuur: 600, dakEindMuur: 800, ...(helling === 15 ? { L1: 6000, L2: 6000 } : {}) };
    dakRooster.push({ naam: `${soort} ${kant} ${vorm} ${helling}°`, k });
  }
for (const soort of Object.keys(SOORTEN)) for (const st of SOORTEN[soort].stijlen.slice(1)) dakRooster.push({ naam: `${soort} ${st.id} beide 45° zij`, k: { soort, stijl: st.id, L1: 5000, dakBegin: true, dakEind: true, bevestiging: 'zij', vloerdikte: 300 } });

describe('onder een schuin dak: model, normen, stuklijst, prijs, tekeningen', () => {
  it(`${dakRooster.length} combinaties`, () => expect(dakRooster.length).toBeGreaterThan(70));
  for (const { naam, k } of dakRooster) it(naam, () => {
    const o = ontwerp(k), B = berekening(o);
    expect(eindig(o), 'NaN in de geometrie').toBe(true);
    expect(o.dak.filter((e) => e.nodig).length).toBe((k.dakBegin ? 1 : 0) + (k.dakEind ? 1 : 0));
    for (const e of o.dak) {
      expect(e.past, `${e.kant} past`).toBe(true);
      const s = o.segs[e.seg], th = (e.hoek * Math.PI) / 180;
      // lengte van het schuine stuk: daar bereikt het dak H + spleet
      expect(e.muur + e.xs * Math.tan(th) - e.spleet / Math.cos(th)).toBeCloseTo(o.k.H, 3);
      // de bovenkant van de handregel volgt het dak met de spleet en komt nergens in het dak (zonder handregel: het glas)
      if (o.k.hr === 'geen') {
        for (const p of o.panelen.filter((q) => q.seg === e.seg)) for (const q of p.pts) { const t = (q[0] - s.p0[0]) * s.d[0] + (q[1] - s.p0[1]) * s.d[1], x = e.kant === 'begin' ? t : s.Lh - t; expect(q[2], `glas op x = ${Math.round(x)}`).toBeLessThanOrEqual(Math.min(o.k.H, e.muur + x * Math.tan(th) - e.spleet / Math.cos(th)) + 0.6); }
        continue;
      }
      for (let x = 0; x <= Math.min(e.xs + 400, s.Lh); x += 25) {
        const t = e.kant === 'begin' ? x : s.Lh - x, hr = hartOp(o, e.seg, t);
        expect(hr, `handregel op ${t}`).not.toBeNull();
        const dak = e.muur + x * Math.tan(th);
        expect(hr!.boven, `bovenkant op x = ${x}`).toBeLessThanOrEqual(dak - e.spleet / Math.cos(th) + 0.6);
        expect(hr!.boven).toBeLessThanOrEqual(o.k.H + 0.01);
        if (x <= e.xs - 30) expect(dak - e.spleet / Math.cos(th) - hr!.boven, `spleet op x = ${x}`).toBeLessThan(15);
      }
      // de handregel is één lijn: de stukken sluiten en de horizontale lengtes vormen de lijn
      const hr = o.delen.filter((d) => d.rol === 'handregel' && d.seg === e.seg);
      expect(hr.length).toBeGreaterThanOrEqual(2);
      expect(hr.reduce((t, d) => t + Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]), 0)).toBeCloseTo(s.Lh, 3);
      for (let i = 1; i < hr.length; i++) for (let j = 0; j < 3; j++) expect(hr[i].a[j]).toBeCloseTo(hr[i - 1].b[j], 3);
      // het schuine stuk: verstek op de knik (de helft van de helling), schuin tegen de muur
      const schuin = hr.find((d) => d.dak);
      expect(schuin, 'schuin stuk').toBeDefined();
      expect(schuin!.zaag).toContain(Math.round(((e.thE * 180) / Math.PI) * 10) / 10);
    }
    // spijlen, staanders, staven en regels blijven onder de handregel (geen stuk door de regel)
    for (const d of o.delen.filter((x) => ['spijl', 'staander', 'staaf', 'bovenregel'].includes(x.rol))) {
      const s = o.segs[d.seg], t = (d.b[0] - s.p0[0]) * s.d[0] + (d.b[1] - s.p0[1]) * s.d[1], hr = hartOp(o, d.seg, t);
      if (!hr) continue;
      expect(Math.max(d.a[2], d.b[2]), `${d.rol} op ${Math.round(t)}`).toBeLessThanOrEqual(hr.onder + 0.6);
    }
    for (const p of o.panelen) for (const q of p.pts) {
      const s = o.segs[p.seg], t = (q[0] - s.p0[0]) * s.d[0] + (q[1] - s.p0[1]) * s.d[1], hr = hartOp(o, p.seg, t);
      if (!hr) continue;
      if (o.k.soort === 'glasU') expect(q[2], `glas op ${Math.round(t)}`).toBeLessThanOrEqual(hr.boven + 0.6);
      else expect(q[2], `${p.rol} op ${Math.round(t)}`).toBeLessThanOrEqual(hr.onder + 0.6);
    }
    // openingen, hoogte en berekening
    for (const op of o.openingen) if (!op.klim) expect(op.mm, op.wat).toBeLessThanOrEqual(op.max);
    expect(B.controles.filter((c) => c.groep.startsWith('Onder het dak')).length).toBeGreaterThanOrEqual(4 * o.dak.length);
    expect(B.controles.filter((c) => c.groep.startsWith('Onder het dak') && c.oordeel === 'rood').map((c) => c.wat)).toEqual([]);
    if (berekening(ontwerp({ ...k, dakBegin: false, dakEind: false })).oordeel !== 'rood') expect(B.oordeel, B.controles.filter((c) => c.oordeel === 'rood').map((c) => c.wat).join('; ')).not.toBe('rood');
    // stuklijst: alle stukken geteld; vormglas
    const sl = stuklijst(o);
    for (const rol of ['spijl', 'staaf', 'staander', 'handregel']) expect(sl.posities.filter((p) => p.rol === rol && p.soort === 'staaf').reduce((t, p) => t + p.n, 0), rol).toBe(o.delen.filter((d) => d.rol === rol && d.prof !== 'koop').length);
    for (const p of sl.posities) { expect(p.n).toBeGreaterThan(0); expect(Number.isFinite(p.kg) && p.kg > 0, `${p.naam} kg`).toBe(true); }
    if (o.glas) expect(sl.posities.some((p) => p.soort === 'glas' && p.vorm), 'vormglas').toBe(true);
    for (const pr of zaagplan(o).profielen) for (const st of pr.staven) expect(st.stukken.reduce((t, x) => t + x.l, 0)).toBeLessThanOrEqual(pr.lengte);
    // prijs: de toeslag apart
    const kp = kostprijs(o), zonder = kostprijs(ontwerp({ ...k, dakBegin: false, dakEind: false }));
    expect(kp.perCat.dak.verkoop).toBeGreaterThan(0);
    expect(kp.regels.some((r) => r.cat === 'dak') || kp.stappen.some((s: { cats: Record<string, number> }) => s.cats.dak > 0)).toBe(true);
    expect(Number.isFinite(kp.perMeter) && kp.perMeter > 0).toBe(true);
    expect(kp.uren).toBeGreaterThan(zonder.uren);
    // tekeningen: geen NaN, het dak in het vooraanzicht, de glasbestelling met de schuine maten
    const bl = alleBladen(o, { nr: 'BA-T', datum: '2026-11-13' });
    for (const b of bl) expect(geenNaN(b.svg), `blad ${b.id}`).toBe(true);
    expect(bl.find((b) => b.id === 'overzicht')!.svg).toContain('#7a5a2e');
    if (o.glas) expect(bl.find((b) => b.id === 'bestel')!.svg).toContain('Glasbestelling');
    for (const b of stukBladen(o, { nr: 'BA' })) expect(geenNaN(b.svg), `stuk ${b.pos}`).toBe(true);
    for (const b of montageBladen(o, { nr: 'BA-T' })) {
      expect(geenNaN(b.svg), `montage ${b.id}`).toBe(true);
      for (const d of b.scène.delen) for (const s of d.solids) for (const v of vlakken(s) as { pts: number[][] }[]) expect(v.pts.flat().every(Number.isFinite)).toBe(true);
    }
    expect(geenNaN(dossierHtml(o, {}, { nr: 'BA', datum: '2026-11-13' }))).toBe(true);
  });
});

describe('onder een schuin dak: randgevallen', () => {
  it('te lang schuin stuk: rood met uitleg, toch een geldig model', () => {
    const o = ontwerp({ soort: 'spijlen', L1: 1500, dakBegin: true, dakEind: true, dakBeginMuur: 300, dakEindMuur: 300 }), B = berekening(o);
    expect(o.dak.every((e) => !e.past)).toBe(true);
    expect(eindig(o)).toBe(true);
    expect(B.oordeel).toBe('rood');
    expect(B.controles.some((c) => /past in de lijn/.test(c.wat) && c.oordeel === 'rood' && !!c.uitleg)).toBe(true);
    for (const b of alleBladen(o, {})) expect(geenNaN(b.svg)).toBe(true);
  });
  it('lage muur (bovenkant < 300 mm): muurplaat met 2 ankers in plaats van een eindstaander', () => {
    const o = ontwerp({ soort: 'spijlen', L1: 4000, dakBegin: true, dakBeginMuur: 300, dakBeginHelling: 45 });
    expect(o.dak[0].muurplaat).toBe(true);
    expect(o.platen.filter((p) => p.rol === 'muurplaat').length).toBe(1);
    expect(o.muurAnkers.length).toBe(2);
    expect(o.staanders.some((s) => s.t < 40)).toBe(false);
    expect(berekening(o).controles.some((c) => /Muurplaat/.test(c.wat))).toBe(true);
    expect(stuklijst(o).posities.some((p) => p.rol === 'muurplaat')).toBe(true);
    expect(stuklijst(o).koop.some((x) => (x as { cat?: string }).cat === 'dak')).toBe(true);
  });
  it('heel lage muur (bovenkant < 150 mm): rood', () => {
    const o = ontwerp({ soort: 'glasstaal', L1: 4000, dakEind: true, dakEindMuur: 120, dakEindHelling: 45 }), B = berekening(o);
    expect(B.controles.some((c) => /aan de muur/.test(c.wat) && c.oordeel === 'rood')).toBe(true);
    expect(eindig(o)).toBe(true);
    for (const b of alleBladen(o, {})) expect(geenNaN(b.svg)).toBe(true);
  });
  it('15° geeft een lang schuin stuk, 60° een kort', () => {
    const a = ontwerp({ L1: 6000, dakBegin: true, dakBeginHelling: 15, dakBeginMuur: 600 }).dak[0], b = ontwerp({ L1: 6000, dakBegin: true, dakBeginHelling: 60, dakBeginMuur: 600 }).dak[0];
    expect(a.xs).toBeGreaterThan(1900); expect(b.xs).toBeLessThan(400);
    expect(a.past && b.past).toBe(true);
  });
  it('spleet + 10 mm groter dan 110 mm is rood, kleiner dan 20 mm oranje', () => {
    expect(berekening(ontwerp({ dakBegin: true, dakBeginSpleet: 110 })).controles.some((c) => /Opening tussen het dak/.test(c.wat) && c.oordeel === 'rood')).toBe(true);
    expect(berekening(ontwerp({ dakBegin: true, dakBeginSpleet: 15 })).controles.some((c) => /Opening tussen het dak/.test(c.wat) && c.oordeel === 'oranje')).toBe(true);
  });
  it('dak hoog genoeg aan de muur: geen afschuining', () => {
    const o = ontwerp({ dakBegin: true, dakBeginMuur: 1400 });
    expect(o.dak[0].nodig).toBe(false);
    expect(o.delen.filter((d) => d.rol === 'handregel').length).toBe(1);
  });
  it('trap: het begin kan niet, het einde (vide) wel', () => {
    const o = ontwerp({ vorm: 'trap', L1: 3000, L2: 2000, H: 1100, dakBegin: true, dakEind: true });
    expect(o.k.dakBegin).toBe(false); expect(o.k.dakEind).toBe(true);
    expect(o.meldingen.join(' ')).toMatch(/trap/);
    expect(o.dak.length).toBe(1); expect(o.dak[0].seg).toBe(1);
    expect(ontwerp({ vorm: 'trap', L1: 3000, L2: 0, H: 1000, dakEind: true }).k.dakEind).toBe(false);
  });
  it('glas in U-profiel: trapeziumglas, de U-handregel met een verbinder op elke knik', () => {
    const o = ontwerp({ soort: 'glasU', L1: 5000, dakBegin: true, dakEind: true }), sl = stuklijst(o);
    const tr = o.panelen.filter((p) => p.uv);
    expect(tr.length).toBeGreaterThanOrEqual(2);
    expect(tr.filter((p) => Math.abs(p.hA! - p.hB!) > 50).length).toBeGreaterThanOrEqual(2);
    expect(sl.koop.find((x) => x.key === 'qrHandHoek' && (x as { cat?: string }).cat === 'dak')?.n).toBe(2);
    const w = o.panelen.reduce((t, p) => t + p.w, 0);
    expect(w + (o.panelen.length + 1) * 8).toBeCloseTo(o.segs[0].Lh, 3);
  });
});
