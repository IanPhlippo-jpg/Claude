import { describe, expect, it } from 'vitest';
import { setRebuildBudget } from '../core/features/rebuild';
import { partBodies } from './bodies';
import { recognize, recognizeAll } from './recognize';
import { CATALOG, hollowArea, profileById } from './catalog';
import { sawList, sawPlans, angleText } from './sawList';
import { barNest, lowerBound } from './barNest';
import { lf1 } from './fixtures';
import { defaultSettings, exportSettings, importSettings } from './settings';
import { analyze } from './analyze';
import { costModel, perPiece } from './cost';
import { contacts, proposeJoints, proposeSequence, ruleAlternate, ruleButtFirst, ruleMiddleOut, ruleNotSameCorner, ruleTackOrder, backstepPieces, excDefaults, EXC_CHOICES, weldText, proposedThroat } from './weld';
import type { WeldJoint } from './types';

setRebuildBudget(Infinity);
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
const SHS = 'EN10219/SHS/40x40x3';

describe('L1 stock and recognition', () => {
  const bodies = partBodies(lf1());
  const recs = recognizeAll(bodies);

  it('L1.1 LF1: 5 bodies tube 40 x 40 x 3 from the feature; 4 with 45/45, 1 with 0/0', () => {
    expect(recs.length).toBe(5);
    for (const r of recs) { expect(r.soort).toBe('profiel'); expect(r.herkomst).toBe('feature'); expect(r.profielId).toBe(SHS); }
    expect(recs.filter((r) => r.hoek1 === 45 && r.hoek2 === 45).length).toBe(4);
    expect(recs.filter((r) => r.hoek1 === 0 && r.hoek2 === 0).length).toBe(1);
  });

  it('L1.4 kg/m of every tube recomputed from the section with corner radii x 7850 within 1 %; table values without source are AANNAME', () => {
    for (const p of CATALOG.filter((x) => x.vorm === 'koker')) {
      const kg = hollowArea(p.a, p.b, p.t, p.ro!, p.ri!) * 7850e-9 * 1000;
      near(p.kgPerM.waarde, kg, 0.01 * kg);
      expect(p.kgPerM.bron).toMatch(/berekend/);
    }
    for (const p of CATALOG.filter((x) => x.vorm === 'UPN' || x.vorm === 'IPE' || x.vorm === 'hoekstaal')) expect(p.kgPerM.aanname).toBe(true);
    // the cold formed and the hot finished tube of one size are two entries with a different mass
    expect(profileById('EN10219/SHS/40x40x4')!.kgPerM.waarde).not.toBe(profileById('EN10210/SHS/40x40x4/H')!.kgPerM.waarde);
  });

  it('L1.5 settings: export and import give the same JSON back; a remnant of 1840 mm stays', () => {
    const s = defaultSettings();
    s.materials.voorraad.push({ profielId: SHS, lengte: 1840, aantal: 1, restant: true });
    const text = exportSettings(s);
    const back = importSettings(text);
    expect(exportSettings(back)).toBe(text);
    expect(back.materials.voorraad).toEqual([{ profielId: SHS, lengte: 1840, aantal: 1, restant: true }]);
    expect(() => importSettings('{"format":"iets anders"}')).toThrow();
    expect(() => importSettings('niet json')).toThrow();
  });

  it('L1.7 override: a recognized tube set by hand to 40 x 40 x 4 keeps that choice', () => {
    const r = recognize(bodies[0], { soort: 'profiel', profielId: 'EN10219/SHS/40x40x4' });
    expect(r.herkomst).toBe('handmatig');
    expect(r.profielId).toBe('EN10219/SHS/40x40x4');
    // the override sits in doc.fab and survives a new analysis
    const a = analyze(lf1(), defaultSettings(), { overrides: { [bodies[0].key]: { soort: 'profiel', profielId: 'EN10219/SHS/40x40x4' } } });
    expect(a.recs.find((x) => x.key === bodies[0].key)!.profielId).toBe('EN10219/SHS/40x40x4');
  });
});

describe('L2 saw list and saw plan', () => {
  const recs = recognizeAll(partBodies(lf1()));
  const saw = sawList(recs);

  it('L2.1 LF1: 3 positions (2 x 1000, 2 x 600, 1 x 520), the longest side; 3.72 m; kg = 3.72 x kg/m within 0.5 %', () => {
    expect(saw.map((l) => [l.n, Math.round(l.zaaglengte)])).toEqual([[2, 1000], [2, 600], [1, 520]]);
    const m = saw.reduce((t, l) => t + l.n * l.zaaglengte, 0) / 1000;
    near(m, 3.72, 0.001);
    const kg = saw.reduce((t, l) => t + l.kgTotaal, 0);
    near(kg, 3.72 * profileById(SHS)!.kgPerM.waarde, 0.005 * kg);
    expect(angleText(45, 45)).toBe('schuin 45°');
    expect(angleText(0, 0)).toBe('haaks');
  });

  it('L2.2 LF1 on 6000 with a 4 mm cut: 1 bar, rest 6000 - 3720 - 5 x 4 = 2260 exactly', () => {
    const [plan] = sawPlans(saw, [], { zaagsnede: 4, afkorten: 0, klem: 0, staafLengte: 6000 });
    expect(plan.staven.length).toBe(1);
    expect(plan.staven[0].rest).toBe(2260);
    expect(plan.teBestellen).toBe(1);
  });

  it('L2.3 200 random lists: never under the lower bound, no bar overfull, every piece once, on average within 1 bar or 5 %', () => {
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const s = { zaagsnede: 4, afkorten: 0, klem: 0, staafLengte: 6000 };
    let excess = 0, lb = 0;
    for (let k = 0; k < 200; k++) {
      const pieces = Array.from({ length: 3 + Math.floor(rnd() * 30) }, (_, i) => ({ pos: i + 1, l: Math.round(100 + rnd() * 2900) }));
      const p = barNest('x', pieces, [], s);
      expect(p.staven.length).toBeGreaterThanOrEqual(p.ondergrens);
      // the cut behind the last piece may fall off the end (docs/37 B-16)
      for (const b of p.staven) expect(b.stukken.reduce((t, x) => t + x.l + 4, 0) - 4).toBeLessThanOrEqual(6000 + 1e-9);
      expect(p.staven.flatMap((b) => b.stukken).map((x) => x.pos).sort((a, b) => a - b)).toEqual(pieces.map((x) => x.pos));
      expect(p.ondergrens).toBe(lowerBound(pieces, s));
      excess += p.staven.length - p.ondergrens; lb += p.ondergrens;
    }
    expect(excess / 200 <= 1 || excess / lb <= 0.05).toBe(true);
  });

  it('L2.4 remnants first: with a remnant of 1100 in stock a piece of 1000 comes from it and the plan says "restant"', () => {
    const p = barNest('x', [{ pos: 1, l: 1000 }, { pos: 2, l: 2000 }], [{ lengte: 1100, aantal: 1, restant: true }], { zaagsnede: 4, afkorten: 0, klem: 0, staafLengte: 6000 });
    const r = p.staven.find((b) => b.bron === 'restant')!;
    expect(r.stukken.map((x) => x.l)).toEqual([1000]);
    expect(p.teBestellen).toBe(1);
  });

  it('L2.5 a piece longer than the commercial length gives an error on that position, no silent plan', () => {
    const p = barNest('x', [{ pos: 7, l: 6500 }, { pos: 1, l: 500 }], [], { zaagsnede: 4, afkorten: 0, klem: 0, staafLengte: 6000 });
    expect(p.fouten.map((f) => f.pos)).toEqual([7]);
    expect(p.staven.flatMap((b) => b.stukken).map((x) => x.pos)).toEqual([1]);
  });
});

describe('L4 cost per piece (LF1 with fixed test settings)', () => {
  const settings = () => {
    const s = defaultSettings();
    s.materials.profielM[SHS] = { waarde: 5, eenheid: '€/m', bron: 'test', aanname: false, datum: '2026-11-19' };
    s.rates.afvalProfiel.waarde = 10;
    return s;
  };

  it('L4.1 every line recomputed by hand, total to the cent', () => {
    const a = analyze(lf1(), settings());
    const L = (id: string) => a.cost.regels.find((l) => l.id === id)!;
    // material: 3.72 m x 1.10 x € 5
    expect(L(`profiel:${SHS}`).bedragCent).toBe(Math.round(3.72 * 1.1 * 5 * 100));
    // sawing: 5 pieces x 0.07 h + 4 miter pieces x 0.06 h, x € 45
    expect(L('zagen').bedragCent).toBe(Math.round((5 * 0.07 + 4 * 0.06) * 45 * 100));
    // welding: metres of weld x 0.35 h/m x € 45
    const m = a.joints.reduce((t, j) => t + j.lengte, 0) / 1000;
    expect(L('lassen').bedragCent).toBe(Math.round(m * 0.35 * 45 * 100));
    expect(L('hechten').bedragCent).toBe(Math.round(a.joints.length * 0.12 * 45 * 100));
    expect(a.cost.totaalCent).toBe(a.cost.regels.reduce((t, l) => t + l.bedragCent, 0));
  });

  it('L4.2 consumed or bought: the line says which', () => {
    const s = settings();
    const used = analyze(lf1(), s).cost.regels.find((l) => l.categorie === 'profiel')!;
    expect(used.omschrijving).toMatch(/verbruikt/);
    s.rates.materiaalModus = 'aangekocht';
    const bought = analyze(lf1(), s).cost.regels.find((l) => l.categorie === 'profiel')!;
    expect(bought.omschrijving).toMatch(/hele staven/);
    expect(bought.bedragCent).toBe(6 * 5 * 100);
  });

  it('L4.3 the AANNAME count of the cost head', () => {
    const a = analyze(lf1(), settings());
    expect(a.cost.aannames).toBe(a.cost.regels.filter((l) => l.aanname).length);
    expect(a.cost.aannames).toBeGreaterThan(0);
    expect(a.cost.regels.find((l) => l.id === `profiel:${SHS}`)!.aanname).toBe(true); // the waste % is an assumption
  });

  it('L4.5 hourly rate 45 -> 60: every labour line scales exactly (to the cent), material stays', () => {
    const s = settings();
    const a = analyze(lf1(), s).cost;
    s.rates.uurloon.waarde = 60;
    const b = analyze(lf1(), s).cost;
    for (const l of a.regels) {
      const k = b.regels.find((x) => x.id === l.id)!;
      if (l.eenheid === 'u') near(k.bedragCent, (l.bedragCent * 60) / 45, 1);
      else if (l.categorie === 'profiel') expect(k.bedragCent).toBe(l.bedragCent);
    }
  });

  it('O1.8 no euro without a source', () => {
    for (const l of analyze(lf1(), settings()).cost.regels) expect(l.bron.trim(), l.id).not.toBe('');
  });

  it('O1.5 quantity 1, 5, 20: set-up shared, material per piece equal', () => {
    const m = analyze(lf1(), settings()).cost;
    const setup = m.regels.filter((l) => l.instel).reduce((t, l) => t + l.bedragCent, 0);
    const rest = m.totaalCent - setup;
    expect(perPiece(m, 1)).toBe(m.totaalCent);
    // whole cents (docs/37 P3: no half cents)
    expect(perPiece(m, 5)).toBe(Math.round(rest + setup / 5));
    expect(perPiece(m, 20)).toBe(Math.round(rest + setup / 20));
    expect(Number.isInteger(perPiece(m, 20))).toBe(true);
  });

  it('O1.4 an override of € 100 with a reason: the total follows and the override stays after a recalculation', () => {
    const s = settings();
    const fab = { kosten: { zagen: { bedragCent: 10000, reden: 'eigen meting' } } };
    const a = analyze(lf1(), s, fab);
    expect(a.cost.regels.find((l) => l.id === 'zagen')!.bedragCent).toBe(10000);
    expect(a.cost.regels.find((l) => l.id === 'zagen')!.override?.reden).toBe('eigen meting');
    const b = analyze(lf1(), s, fab);
    expect(b.cost.totaalCent).toBe(a.cost.totaalCent);
    void costModel;
  });
});

describe('L3 weld joints and sequence', () => {
  const bodies = partBodies(lf1());
  const recs = recognizeAll(bodies);

  it('L3.1 LF1 auto weld joints: 6 joints (4 corners, 2 of the post), each a proposal', () => {
    const c = contacts(bodies);
    expect(c.length).toBe(6);
    const j = proposeJoints(bodies, recs);
    expect(j.every((x) => !x.bevestigd)).toBe(true);
    expect(j.every((x) => x.maat.letter === 'a' && x.maat.mm === 3)).toBe(true);
  });

  it('L3.2 the weld length of a tube 40 x 40 square on a face: the outer perimeter of the section within 1 mm', () => {
    const p = profileById(SHS)!;
    const hand = 4 * 40 - (8 - 2 * Math.PI) * p.ro!;
    const post = contacts(bodies).filter((c) => Math.abs(c.area - 2 * 0) >= 0).map((c) => c.lengte).sort((a, b) => a - b)[0];
    near(post, hand, 1);
  });

  it('L3.4 tack before finishing, and no two following finishing steps at the same corner', () => {
    const j = proposeJoints(bodies, recs);
    const steps = proposeSequence(j);
    expect(steps[0].soort).toBe('hechten');
    expect(steps[0].joints.length).toBe(6);
    const fin = steps.slice(1).map((s) => j.find((x) => x.id === s.joints[0])!.punt!);
    for (let i = 1; i < fin.length; i++) expect(Math.hypot(fin[i][0] - fin[i - 1][0], fin[i][1] - fin[i - 1][1], fin[i][2] - fin[i - 1][2])).toBeGreaterThan(50);
  });

  const J = (id: string, punt: [number, number, number], soort: WeldJoint['soort'] = 'hoeklas'): WeldJoint & { punt: [number, number, number] } =>
    ({ id, bodies: ['a', 'b'], soort, maat: { letter: 'a', mm: 3 }, lengte: 100, tweezijdig: false, rondom: false, montage: false, onderbroken: null, proces: '135', positie: 'PB', niveau: 'C', stap: 0, hechten: true, bevestigd: false, punt });
  it('each sequence rule on its own (3.6)', () => {
    const js = [J('mid', [0, 0, 0]), J('far', [1000, 0, 0]), J('left', [-500, 0, 0]), J('butt', [400, 0, 0], 'V')];
    expect(ruleTackOrder(js)[0].id).toBe('far');
    expect(ruleMiddleOut(js)[0].id).toBe('butt');
    expect(ruleButtFirst(js)[0].id).toBe('butt');
    const alt = ruleAlternate([J('l1', [-100, 0, 0]), J('l2', [-200, 0, 0]), J('r1', [100, 0, 0]), J('r2', [200, 0, 0])]);
    expect(alt.map((x) => Math.sign(x.punt[0]))).toEqual([-1, 1, -1, 1]);
    const corner = ruleNotSameCorner([J('a', [0, 0, 0]), J('b', [10, 0, 0]), J('c', [500, 0, 0])]);
    expect(corner.map((x) => x.id)).toEqual(['a', 'c', 'b']);
    expect(backstepPieces(250)).toBe(1);
    expect(backstepPieces(700)).toBe(3);
  });

  it('L3.6 EXC2 sets level C and the fixed line; EXC4 is not offered; the designation always has its letter', () => {
    expect(excDefaults('EXC2').niveau).toBe('C');
    expect(excDefaults('EXC2').waarschuwing).toMatch(/gecertificeerde FPC, WPS en lascoördinatie\. Dit programma controleert dat niet\./);
    expect(excDefaults('EXC1').waarschuwing).toBeNull();
    expect(EXC_CHOICES).not.toContain('EXC4' as never);
    expect(weldText(J('w', [0, 0, 0]))).toMatch(/^a3 /);
    expect(proposedThroat(3)).toBe(3);
    expect(proposedThroat(8)).toBe(5.5);
    expect(excDefaults('EXC2').waarschuwing).not.toMatch(/conform/i);
  });
});
