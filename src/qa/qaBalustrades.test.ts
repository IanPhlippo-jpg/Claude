/**
 * De balustrade-configurator (bibliotheek/balustrades): voor een rooster van soort x stijl x plaats x bevestiging x vorm
 * (recht, hoek, U, schuine hoek, trap) x maten bouwt het model zonder NaN; de openingen zijn ≤ 110 mm en niet beklimbaar
 * waar vereist, de hoogte haalt de norm, de stuklijst sluit met de geometrie (lengtes per lijn), de prijzen liggen in de
 * marktband en de tekeningen (bladen, stukken, montage) hebben geen NaN.
 */
import { describe, expect, it } from 'vitest';
import { ontwerp, lengtes, type Ontwerp } from '../../bibliotheek/balustrades/model.mjs';
import { berekening, combineer, windLast, lasW, keel, keelDun, randBreuk, glasKlemReken, conformiteit, maxAfstand, plaatVoor } from '../../bibliotheek/balustrades/bereken.mjs';
import { kostprijs, MARKTBAND } from '../../bibliotheek/balustrades/prijzen.mjs';
import { stuklijst, zaagplan } from '../../bibliotheek/balustrades/stuklijst.mjs';
import { alleBladen, stukBladen } from '../../bibliotheek/balustrades/tekeningen.mjs';
import { montageBladen } from '../../bibliotheek/balustrades/montage.mjs';
import { dossierHtml, lijstenCsv, dossierBladen, btwFactor } from '../../bibliotheek/balustrades/dossier.mjs';
import { SOORTEN, PROFIEL, ANKER, GLASOPBOUW } from '../../bibliotheek/balustrades/onderdelen.mjs';
import { NORM, piekstuwdruk, cpNet, trapDriehoek } from '../../bibliotheek/balustrades/normen.mjs';
import { readFileSync } from 'node:fs';
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
    // glas in een U-profiel bovenop de treden: de driehoek blijft open (geen trapplint mogelijk) en het oordeel is rood (P1-7)
    const uTrap = o.k.soort === 'glasU' && o.k.vorm === 'trap' && o.k.bevestiging === 'boven';
    if (uTrap) expect(berekening(o).oordeel).toBe('rood');
    for (const op of o.openingen) {
      if (op.klim) { if (o.klim && o.st.patroon !== 'cirkel') expect(op.mm, op.wat).toBeLessThan(op.max); }
      else if (!(uTrap && /driehoek/.test(op.wat))) expect(op.mm, op.wat).toBeLessThanOrEqual(op.max);
    }
    // de stuklijst sluit met de geometrie: per lijn de handregel of het U-profiel = de lengte langs de lijn;
    // de vrije velden + de staanders = de lijn; het glas + de voegen = de lijn
    for (const s of o.segs) {
      // de handregel (in stukken per sectie, P2-11) of het U-profiel = de lengte langs de lijn
      const hr = o.delen.filter((d) => (d.rol === 'handregel' || d.rol === 'uprofiel') && d.seg === s.i && d.prof !== 'koop' || ((d.rol === 'uprofiel') && d.seg === s.i));
      expect(hr.length, `lijn ${s.i}`).toBeGreaterThanOrEqual(1);
      expect(hr.reduce((t, d) => t + lengtes(d).hart, 0)).toBeCloseTo(s.L3, 0);
      for (const d of hr) if (d.prof !== 'koop') expect(lengtes(d).lang, 'handregelstuk past in een staaf van 6 m').toBeLessThanOrEqual(6000);
      if (o.staander && s.posten && s.velden) {
        // de velden sluiten op de staanders: tussen twee velden zit precies één staander
        const P = PROFIEL[o.staander.prof];
        for (let j = 1; j < s.velden.length; j++) if (!s.velden[j].muurA) expect(s.velden[j].ta - s.velden[j - 1].tb, `lijn ${s.i} veld ${j}`).toBeCloseTo(P.b, 3);
        expect(s.velden[0].ta).toBeGreaterThanOrEqual(-400); expect(s.velden.at(-1)!.tb).toBeLessThanOrEqual(s.Lh + 0.01);
        const velden = s.velden.reduce((t, v) => t + v.tb - v.ta, 0);
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

// P3-12: geen test meer dat de prijs in de (geschatte) marktband valt; wel dat de prijs uit de kosten volgt
describe('prijs uit de kosten (eerste stijl, recht, binnen, bovenop de vloer, woning)', () => {
  for (const soort of Object.keys(SOORTEN)) for (const L1 of [3000, 4500, 6000]) it(`${soort} ${L1} mm`, () => {
    const kp = kostprijs(ontwerp({ soort, L1, plaatsen: true })), I = kp.instellingen;
    expect(I.uurloon, 'uurloon blijft de instelling van Ian').toBe(45);
    // kostprijs = materiaal + uren x uurloon (met de vaste post per opdracht erin)
    expect(kp.kostprijs).toBeCloseTo(kp.materiaal + kp.uren * I.uurloon, 0);
    expect(kp.vast.uren, 'vaste post: opmeten, tekenen, ritten, opruimen').toBeGreaterThanOrEqual(5);
    expect(kp.perCat.opdracht.kost).toBeGreaterThanOrEqual(kp.vast.uren * I.uurloon);
    expect(kp.verkoop).toBeCloseTo(kp.kostprijs * (1 + kp.marge / 100), 0);
    const zonder = kostprijs(ontwerp({ soort, L1, plaatsen: false }));
    expect(kp.perMeter - zonder.perMeterZonder).toBeCloseTo(kp.plaatsen.perMeter, 0);
    expect(MARKTBAND[soort].laag).toBeGreaterThan(0); // de band blijft ter vergelijking
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
  it('glas: U-profiel 1010.4 (88.4 haalt de doorbuiging niet met ω = 0,1); tussen staanders 55.2 en 66.2', () => {
    expect(ontwerp({ soort: 'glasU', cat: 'A' }).glas?.opbouw).toBe('1010.4');
    const b = berekening(ontwerp({ soort: 'glasU', cat: 'A', glas: '88.4' }));
    expect(b.controles.find((c) => /Doorbuiging bovenaan het glas/.test(c.wat))?.oordeel, '88.4 met ω = 0,1').toBe('rood');
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
  const hrH = o.k.hr === 'rond' ? 42.4 : o.k.hr === 'plat' ? 8 : o.k.hr === 'koker' ? 30 : 0;
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
      // (het schuine stuk kan op een werfnaad in twee stukken liggen, P2-11)
      const schuin = hr.filter((d) => d.dak);
      expect(schuin.length, 'schuin stuk').toBeGreaterThan(0);
      expect(schuin.flatMap((d) => d.zaag ?? [])).toContain(Math.round(((e.thE * 180) / Math.PI) * 10) / 10);
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
    expect(o.delen.filter((d) => d.rol === 'handregel' && d.dak).length).toBe(0);
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

// ---------------------------------------------------------------- Fable 5.2 v1: handberekeningen (P2-17)
const ctl = (o: Ontwerp, re: RegExp) => berekening(o).controles.find((c) => re.test(`${c.groep}: ${c.wat}`));
const BAL = 'bibliotheek/balustrades/';
const bron = (p: string) => readFileSync(BAL + p, 'utf8');
/** alle tekst van een blad als één regel (tekst die over regels loopt) */
const tekst = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ').replace(/\s+/g, ' ');

describe('handberekeningen naast de code', () => {
  it('piekstuwdruk EN 1991-1-4: 26 m/s, terrein II, 6 m = 0,861 kN/m²; terrein III = 0,587', () => {
    // kr = 0,19; ln(6/0,05) = 4,7875; cr = 0,9096; vm = 23,650; Iv = 0,2089; qp = (1 + 7 Iv) · ½ · 1,25 · vm² = 860,7 N/m²
    expect(piekstuwdruk(26, 'II', 6).qp).toBeCloseTo(0.861, 2);
    // kr = 0,19 · 6^0,07 = 0,2154; ln(20) = 2,9957; cr = 0,6453; vm = 16,776; Iv = 0,3338; qp = 586,9 N/m²
    expect(piekstuwdruk(26, 'III', 6).qp).toBeCloseTo(0.587, 2);
    expect(piekstuwdruk(23, 'IV', 3).z, 'z ≥ zmin').toBe(10);
  });
  it('cp,net tabel 7.9: l/h ≥ 10 → A 3,4, B 2,1; l/h = 4 → A 2,6, B 1,6', () => {
    expect(cpNet(12)).toEqual({ A: 3.4, B: 2.1, C: 1.7, D: 1.2 });
    expect(cpNet(4).A).toBeCloseTo(2.6, 6); expect(cpNet(4).B).toBeCloseTo(1.6, 6);
  });
  it('combinatie wind: max(q + 0,6 w; w + 0,7 q)', () => {
    const w = windLast({ ...ontwerp({ soort: 'glasstaal', plaats: 'buiten' }).k })!;
    expect(combineer(1, 1, w).M).toBeCloseTo(1.7, 6);
    expect(combineer(1, 0.2, w).M).toBeCloseTo(1.12, 6);
    expect(windLast(ontwerp({}).k)).toBeNull();
  });
  it('staander koker 40x40x3 op 990 mm, H 1100, woning: σ = 1,5 · 0,55 kNm / 5099 mm³ = 161,8 N/mm²', () => {
    const o = ontwerp({ staander: 'koker40x40x3', afstand: 990 }), c = ctl(o, /Staander: Buiging/)!;
    // W = (40⁴ − 34⁴) / 12 / 20 = 5098,6 mm³; puntlast 0,5 · 1,1 = 0,55 kNm > lijnlast 0,5 · 0,99 · 1,1 = 0,5445
    expect(c.waarde).toBeCloseTo(161.81, 1);
    // ankers: N = 0,825 kNm / (105 mm · 2) = 3,93 kN
    expect(ctl(o, /Trek per anker/)!.waarde).toBeCloseTo(3.93, 2);
  });
  it('spijl Ø14 tussen onderregel en handregel (L 1002): Pu = 8 · 457,3 · 235 / 1002 = 858 N ≥ 750 N', () => {
    const c = ctl(ontwerp({}), /Vulling: Spijl/)!;
    expect(c.grens).toBeCloseTo(858.1, 0); expect(c.waarde).toBe(750); expect(c.oordeel).toBe('groen');
  });
  it('handregel horizontaal: γQ · max(q a²/8; Q a/4) / W (P2-4)', () => {
    const o = ontwerp({ staander: 'koker40x40x3', afstand: 990 }), c = ctl(o, /Handregel: platstaal 50x8 horizontaal/)!, a = o.afstand;
    expect(c.waarde).toBeCloseTo((1.5 * Math.max((0.5 * a * a) / 8, (500 * a) / 4)) / PROFIEL.plat50x8.W, 1);
  });
  it('glas tussen klemmen: beff = min(h; w / 2), σ = 6 · 1,5 · Q · w / 4 / (beff · 2 · t²)', () => {
    const G = GLASOPBOUW['55.2'], x = glasKlemReken(ontwerp({ soort: 'glasstaal' }).k, G, 1100, 950);
    expect(x.beff).toBe(550);
    expect(x.sigP).toBeCloseTo((6 * 1.5 * 500 * 1100) / 4 / (550 * 2 * 25), 6);
  });
  it('driehoek langs de trap 180/250, regel 50 mm boven de neuslijn: ingeschreven cirkel Ø156 (P1-7)', () => {
    // a = 250 · (1 + 50/180) = 319,4; b = 230; c = 393,6; 2ρ = a + b − c = 155,8
    expect(trapDriehoek(180, 250, 50)).toBeCloseTo(155.8, 0);
    expect(trapDriehoek(180, 250, -100)).toBeCloseTo(54, 0);
  });
  it('betonrand EN 1992-4: M12, hef 110, c 100 → V⁰Rk,c ≈ 13,4 kN', () => expect(randBreuk(12, 110, 100, 90).V0).toBeCloseTo(13420, -2));
  it('las: plat profiel W = a h² / 3 (P3-1); keel op dunne wand a ≤ 0,7 t (P3-3)', () => {
    expect(lasW(PROFIEL.plat50x8, 3)).toBeCloseTo(2500, 6);
    expect(keelDun(2)).toBe(2); expect(keelDun(4)).toBe(2.5); expect(keel(PROFIEL.koker40x40x4)).toBe(4);
  });
});

// ---------------------------------------------------------------- Fable 5.2 v1: negatieve tests (falen zonder de oplossing)
describe('Fable 5.2 v1: P1', () => {
  it('P1-1 buiten rekent de wind mee en combineert hem met de lijnlast', () => {
    const b = berekening(ontwerp({ soort: 'glasstaal', plaats: 'buiten', staander: 'koker60x60x4', afstand: 1000 })), i = berekening(ontwerp({ soort: 'glasstaal', staander: 'koker60x60x4', afstand: 1000 }));
    expect(b.controles.some((c) => c.wat === 'Wind (buiten)')).toBe(true);
    const s = (x: typeof b) => x.controles.find((c) => /Buiging/.test(c.wat))!.waarde;
    expect(s(b)).toBeGreaterThan(s(i) * 1.3);
    expect(b.controles.find((c) => /Buiging/.test(c.wat))!.formule).toMatch(/wind/);
    expect(berekening(ontwerp({ soort: 'glasU', plaats: 'buiten', windVb: 26, terrein: '0', windHoogte: 20 })).oordeel, 'kust, 20 m: volglas rood').toBe('rood');
  });
  it('P1-2 ondergrond: opbouw, welfsels, hout en staal', () => {
    const o = ontwerp({ opbouw: 120 }), st = o.delen.find((d) => d.rol === 'staander')!;
    expect(st.a[2]).toBeCloseTo(-120 + (o.staander?.voet.t ?? 0), 6); // voetplaat op de draagvloer, onder de chape
    expect(o.ankers.every((a) => a.p[2] === -120)).toBe(true);
    expect(ctl(o, /Staander: Buiging/)!.formule).toMatch(/1,22/); // hefboom H + opbouw
    expect(ontwerp({ anker: 'keil', opbouw: 30 }).ankerType, 'geen keilbout door een opbouw').toBe('chem12');
    expect(ontwerp({ opbouw: 30 }).ankerLengte).toBe(210);
    expect(berekening(ontwerp({ ondergrond: 'hout' })).oordeel).toBe('rood');
    expect(berekening(ontwerp({ ondergrond: 'welfsel', bevestiging: 'zij' })).oordeel).toBe('rood');
    expect(ontwerp({ ondergrond: 'welfsel' }).ankerType).toBe('zeef12');
    expect(stuklijst(ontwerp({ ondergrond: 'welfsel' })).koop.some((x) => x.key === 'fish16')).toBe(true);
    expect(ontwerp({ ondergrond: 'staal' }).ankerType).toBe('bout12');
    expect(berekening(ontwerp({ soort: 'glasU', opbouw: 100 })).oordeel).toBe('rood');
  });
  it('P1-3 verticale last 1 kN: platte handregel vrij tussen staanders is rood; koker 50x30 haalt het', () => {
    expect(NORM.verticaal.Q).toBe(1);
    expect(ctl(ontwerp({ soort: 'staven', stijl: 'H2', handregel: 'plat' }), /Verticale last/)!.oordeel).toBe('rood');
    expect(ctl(ontwerp({ soort: 'glasstaal', stijl: 'G1', handregel: 'plat' }), /Verticale last/)!.oordeel).toBe('rood');
    expect(ontwerp({ soort: 'glasstaal', stijl: 'G1' }).k.hr).toBe('koker');
    expect(ctl(ontwerp({ soort: 'glasstaal', stijl: 'G1' }), /Verticale last/)!.oordeel).toBe('groen');
    expect(ctl(ontwerp({}), /Verticale last/)!.oordeel, 'spijlen dragen de platte handregel').toBe('groen');
  });
  it('P1-4 glas tussen klemmen: maatgrens, MOD 2500 met borgpen, oranje zonder attest', () => {
    const groot = ontwerp({ soort: 'glasstaal', afstand: 1500 });
    expect(ctl(groot, /Ruitmaat/)!.oordeel).toBe('rood');
    const o = ontwerp({ soort: 'glasstaal' }), sl = stuklijst(o);
    expect(ctl(o, /Ruitmaat/)!.oordeel).toBe('oranje');
    expect(sl.koop.find((x) => x.key === 'borgpen')?.n).toBe(o.klemmen.length);
    expect(sl.koop.find((x) => x.key === 'klemVlak')?.naam).toMatch(/MOD 2500.*12,76/);
  });
  it('P1-5 randafstand: het ontwerp en het plaatsingsblad zeggen hetzelfde', () => {
    const o = ontwerp({}), bl = alleBladen(o, {}), pl = tekst(bl.find((b) => b.id === 'plaatsing')!.svg), bo = tekst(bl.find((b) => b.id === 'boringen')!.svg);
    expect(o.rand.c).toBe(100); expect(o.rand.hart).toBe(100 + (o.staander?.voet.b ?? 0) / 2 - 25);
    expect(pl).toContain(`op ${Math.round(o.rand.hart)} mm van de vloerrand`); expect(pl).toContain('c = 100 mm');
    expect(pl).not.toContain('Randafstand ≥ 100 mm'); expect(bo).not.toContain('randafstand ≥ 100 mm');
    expect(ctl(o, /Dwarskracht naar de rand/)).toBeDefined();
  });
  it('P1-6 de vulling onder 0,5 kN: Ø12 is rood, Ø14 haalt het', () => {
    const o = ontwerp({}); expect(o.st.spijl).toBe('rond14');
    const o12 = { ...o, st: { ...o.st, spijl: 'rond12' }, vulling: o.vulling.map((v) => (v.prof === 'rond14' ? { ...v, prof: 'rond12' } : v)) };
    expect(ctl(o12, /Vulling: Spijl/)!.oordeel).toBe('rood');
    expect(ctl(ontwerp({ soort: 'staven', stijl: 'H1' }), /Vulling: Plint/)!.oordeel).toBe('groen');
  });
  it('P1-7 driehoek langs de trap: zonder trapplint rood, met trapplint dicht', () => {
    const zonder = ontwerp({ vorm: 'trap', L1: 3000, L2: 1500, trapPlint: false }), met = ontwerp({ vorm: 'trap', L1: 3000, L2: 1500 });
    expect(zonder.openingen.find((x) => /driehoek/.test(x.wat))!.mm).toBeCloseTo(155.8, 0);
    expect(berekening(zonder).oordeel).toBe('rood');
    expect(met.panelen.filter((p) => p.rol === 'trapplint').length).toBeGreaterThan(0);
    expect(met.openingen.find((x) => /driehoek/.test(x.wat))!.mm).toBeLessThanOrEqual(110);
    expect(ontwerp({ vorm: 'trap', L1: 3000, trapboom: true, trapPlint: false }).openingen.find((x) => /driehoek/.test(x.wat))!.mm).toBe(0);
  });
  it('P1-8 de tekst belooft alleen wat gecontroleerd is', () => {
    const o = ontwerp({}), B = berekening(o), C = conformiteit(o, B);
    expect(C.kort).not.toMatch(/Voldoet aan NBN/); expect(C.kort).toMatch(/Hoogte, openingen en beklimbaarheid/);
    expect(C.niet.map((x) => x.id)).toEqual(expect.arrayContaining(['norm', 'schok', 'ondergrond', 'ankers']));
    expect(C.vrijgegeven).toBe(false);
    expect(conformiteit(ontwerp({ nagekeken: C.niet.map((x) => x.id) }), B).vrijgegeven).toBe(true);
    expect(bron('presentatie/app.mjs')).not.toContain('Voldoet aan NBN B 03-004');
    expect(bron('web/index.html')).not.toContain('Voldoet aan NBN B 03-004 en de berekening');
    expect(alleBladen(o, {})[0].svg).not.toContain('groen: voldoet');
  });
});

describe('Fable 5.2 v1: P2', () => {
  it('P2-1 trap: elke voetplaat ligt volledig op een trede, op het niveau van die trede', () => {
    const o = ontwerp({ vorm: 'trap', L1: 3000, L2: 1500 }), { g, r } = o.trede!, pl = o.platen.filter((x) => x.rol === 'voetplaat' && x.trede);
    expect(pl.length).toBeGreaterThan(3);
    for (const p of pl) {
      const sp = o.staanders.find((s) => s.trede === p.trede && Math.abs(s.p[0] - p.p[0]) < 1)!, i = p.trede! - 1;
      expect(p.z[0]).toBeCloseTo(i * r, 3);
      expect(sp.t - p.w / 2).toBeGreaterThanOrEqual(i * g - 0.01); expect(sp.t + p.w / 2).toBeLessThanOrEqual((i + 1) * g + 0.01);
    }
  });
  it('P2-2 valhoogte 12 m geldt ook langs de trap; de presentatie vraagt ze', () => {
    expect(berekening(ontwerp({ vorm: 'trap', L1: 3000, L2: 0, H: 1000, valhoogte: 12 })).oordeel).toBe('rood');
    expect(bron('presentatie/sjabloon.html')).toContain('id="hoog"');
  });
  it('P2-3 zijmontage: de spleet aan de vloerrand is een opening; de bron van 110 mm is eerlijk', () => {
    expect(ontwerp({ bevestiging: 'zij' }).openingen.some((x) => /vloerrand/.test(x.wat))).toBe(true);
    expect(NORM.opening.bron).toMatch(/AANNAME/);
  });
  it('P2-5 een vrije staanderafstand boven de grens is rood', () => expect(ctl(ontwerp({ afstand: 2000 }), /Staanderafstand/)!.oordeel).toBe('rood'));
  it('P2-6 zijmontage: afstandhouders 170 mm uit elkaar, las per afstandhouder', () => {
    const o = ontwerp({ bevestiging: 'zij' }), z = o.delen.filter((d) => d.rol === 'afstandhouder').slice(0, 2).map((d) => d.a[2]).sort((a, b) => a - b);
    expect(z).toEqual([-210, -40]);
    expect(ctl(o, /Las van een afstandhouder/)).toBeDefined();
  });
  it('P2-7 M10 in het U-profiel buiten: de bestellijst geeft M10-ankers', () => {
    const o = ontwerp({ soort: 'glasU', plaats: 'buiten' }), A = ANKER[o.ankerType], k = stuklijst(o).koop;
    expect(A.d).toBe(10);
    expect(k.some((x) => /M10/.test(x.naam) && /A4/.test(x.naam))).toBe(true);
    expect(k.some((x) => /M12/.test(x.naam))).toBe(false);
  });
  it('P2-8 ω = 0,1, puntlast per plaat en de glashoogte van het systeem', () => {
    expect(NORM.glas.omega).toBe(0.1);
    expect(ctl(ontwerp({ soort: 'glasU' }), /Spanning/)!.formule).toMatch(/één plaat/);
    expect(ctl(ontwerp({ soort: 'glasU', H: 1300 }), /Systeem Q-railing/)!.oordeel).toBe('rood');
  });
  it('P2-9 glasbestelling met 1B1, EN 12150, EN 14449 en heat-soak', () => {
    const o = ontwerp({ soort: 'glasstaal' }), g = stuklijst(o).posities.find((p) => p.soort === 'glas')!;
    expect(g.opm).toMatch(/1B1.*12600/); expect(g.opm).toMatch(/14179/); expect(g.opm).toMatch(/12150/);
    expect(kostprijs(o).regels.some((r) => /Heat-soak/.test(r.wat))).toBe(true);
    expect(alleBladen(o, {}).find((b) => b.id === 'bestel')!.svg).toContain('1B1');
  });
  it('P2-10 ontluchtingsgaten in elke koker, op het stukblad en het boringenblad', () => {
    const o = ontwerp({ plaats: 'buiten' }), st = o.delen.filter((d) => d.rol === 'staander');
    for (const d of st) { expect(d.ontlucht!.length).toBeGreaterThanOrEqual(3); expect(d.ontlucht![0].d).toBe(10); }
    expect(alleBladen(o, {}).find((b) => b.id === 'boringen')!.svg).toMatch(/ontluchting/);
    expect(stukBladen(o, {})[0].svg).toMatch(/ontluchtingsgaten/);
    expect(ontwerp({ soort: 'staven', stijl: 'H3', plaats: 'buiten' }).panelen.find((p) => p.rol === 'plaat')!.dikte).toBe(4);
  });
  it('P2-11 lange lijn: secties ≤ 3 m, werfnaden, uitzetvoeg buiten', () => {
    const o = ontwerp({ L1: 12000, plaats: 'buiten' });
    expect(Math.max(...o.secties.map((x) => x.lengte))).toBeLessThanOrEqual(3000);
    expect(o.werfnaden.length).toBeGreaterThanOrEqual(3);
    expect(o.werfnaden.some((x) => x.uitzet)).toBe(true);
    expect(stuklijst(o).koop.find((x) => x.key === 'werfnaad')?.n).toBe(o.werfnaden.length);
  });
  it('P2-12 geen EXC2 op het lasblad; wel ISO 9606-1 en ISO 5817-C', () => {
    const l = alleBladen(ontwerp({}), {}).find((b) => b.id === 'lassen')!.svg;
    expect(l).not.toContain('EXC2'); expect(l).toContain('ISO 9606-1'); expect(l).toContain('ISO 5817-C');
  });
  it('P2-13 doorlopende tekeningnummers, blad n / totaal, datum en alleen ISO 5455-schalen', () => {
    const D = dossierBladen(ontwerp({ vorm: 'trap', L1: 3000, L2: 1500 }), { nr: 'BA' }), alle = [...D.bladen, ...D.montage, ...D.stukken].map((b) => b.svg);
    const nrs = alle.map((s) => s.match(/>(BA-\d\d)</)?.[1]);
    expect(new Set(nrs).size).toBe(alle.length); expect(nrs.every(Boolean)).toBe(true);
    alle.forEach((s, i) => expect(s).toContain(`>${i + 1} / ${D.totaal}<`));
    for (const s of alle) { expect(s).toMatch(/>\d{4}-\d{2}-\d{2}</); for (const m of s.matchAll(/1:(\d+(?:,\d+)?)/g)) expect([1, 2, 5, 10, 20, 50, 100, 200], `schaal 1:${m[1]}`).toContain(Number(m[1].replace(',', '.'))); }
  });
  it('P2-14 een samenstellingstekening per sectie met de controlematen', () => {
    const o = ontwerp({ L1: 5000 }), s = alleBladen(o, {}).filter((b) => b.id.startsWith('sectie'));
    expect(s.length).toBe(o.secties.length);
    for (const b of s) { expect(b.svg).toContain('Diagonaal'); expect(b.svg).toContain('Spijlsteek'); }
  });
  it('P2-15 prijs: vaste post, coat per m² aanzicht, glas met 2 personen en een post risico', () => {
    const k = kostprijs(ontwerp({ soort: 'glasstaal' }));
    expect(k.perCat.opdracht.kost).toBeGreaterThan(0);
    expect(k.regels.some((r) => /Risico glasbreuk/.test(r.wat))).toBe(true);
    expect(kostprijs(ontwerp({})).regels.find((r) => /Poedercoaten/.test(r.wat))!.wat).toMatch(/aanzicht/);
    expect(k.stappen.find((s) => s.titel === 'Plaatsen')!.cats.plaatsen).toBeGreaterThan(4 * 1.5 + 4 * 0.4 * 2 - 0.01);
  });
  it('P2-16 klantmodus: uurloon en marge achter een code, klantversie van de web', () => {
    expect(bron('presentatie/sjabloon.html')).toMatch(/id="ianDeel" hidden/);
    expect(bron('presentatie/app.mjs')).toMatch(/codeHash/);
    expect(bron('maak-web.mjs')).toContain('klant.html');
    expect(bron('web/index.html')).toContain('KLANT');
  });
});

describe('Fable 5.2 v1: P3', () => {
  it('P3-2 de lasmaat in de werkwijze = die van de berekening', () => {
    const k = kostprijs(ontwerp({ staander: 'koker40x40x4' })) as unknown as { stappen: { titel: string; tekst: string }[] };
    expect(k.stappen.find((s) => s.titel === 'Staanders op de voetplaat')!.tekst).toMatch(/hoeklas a4/);
  });
  it('P3-4 een profiel dat de puntlast niet haalt, valt af', () => {
    const P = PROFIEL.koker40x20x2, k = ontwerp({ cat: 'C5' }).k;
    expect(maxAfstand(k, P, plaatVoor(P, false), 'chem12').grenzen.puntlast).toBe(0);
  });
  it('P3-5 E-modulus inox uit het profiel', () => expect(PROFIEL.inox48.E).toBe(200000));
  it('P3-7 de doorbuiging telt de handregel mee', () => expect(ctl(ontwerp({}), /Doorbuiging bovenaan/)!.formule).toMatch(/handregel/));
  it('P3-8 overzicht van glas in U-profiel: geanodiseerd, geen staanders', () => {
    const s = alleBladen(ontwerp({ soort: 'glasU' }), {})[0].svg;
    expect(s).toContain('alu geanodiseerd'); expect(s).toContain('geen (U-profiel)'); expect(s).not.toContain('>poedercoat<');
  });
  it('P3-9 inox buiten in 1.4404', () => expect(stuklijst(ontwerp({ soort: 'glasstaal', stijl: 'G3', plaats: 'buiten' })).posities.find((p) => p.rol === 'staander')!.mat).toBe('RVS 1.4404'));
  it('P3-10 btw 6 % kan gekozen worden', () => { expect(btwFactor({ btw: 6 })).toBeCloseTo(1.06, 6); expect(btwFactor({})).toBeCloseTo(1.21, 6); });
  it('P3-11 presentatie: oordeel en prijs bovenaan, offerte', () => { const s = bron('presentatie/sjabloon.html'); expect(s.indexOf('id="samen"')).toBeLessThan(s.indexOf('id="soorten"')); expect(s).toContain('id="offerteKnop"'); });
  it('verplichte controles per soort zijn er alle', () => {
    for (const soort of Object.keys(SOORTEN)) {
      const g = new Set(berekening(ontwerp({ soort })).controles.map((c) => c.groep));
      for (const x of ['Belasting', 'NBN B 03-004', 'Verankering']) expect(g.has(x), `${soort}: ${x}`).toBe(true);
      if (soort !== 'glasU') for (const x of ['Staander', 'Handregel']) expect(g.has(x), `${soort}: ${x}`).toBe(true);
      if (soort === 'spijlen' || soort === 'staven') expect(g.has('Vulling'), `${soort}: Vulling`).toBe(true);
      if (soort.startsWith('glas')) expect(g.has('Glas'), `${soort}: Glas`).toBe(true);
    }
  });
});
