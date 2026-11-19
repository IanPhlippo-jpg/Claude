// The findings of the review docs/37: each test fails on the code of f9a4f8a and passes with the fix.
import { describe, expect, it } from 'vitest';
import { setRebuildBudget } from '../core/features/rebuild';
import { createDocument, type Document } from '../core/document/types';
import { addCircle, addLine, createSketch } from '../core/sketch/model';
import { parseDocument, serializeDocument, FAB_FILE_VERSION, FILE_VERSION } from '../core/document/persistence';
import { analyze, nestGroups } from './analyze';
import { defaultSettings } from './settings';
import { lf1, chainSheet, pp2 } from './fixtures';
import { perPiece } from './cost';
import { usedSheet } from './nest';
import { lineTotal, nextNumber, nextRevision, quoteLines, salePerPiece, vatProblems, newQuote } from './quote';
import { withoutCustomerData, hasCustomerData } from './privacy';
import { partBodies } from './bodies';
import { flatOfSheet } from './flat';
import { plateDxf, DXF_DEFAULTS } from './dxf';
import { bendPlan, chainBends, din6935K } from './bend';
import { reconcileJoints, reorderWelds } from './weld';
import { barNest } from './barNest';
import { sawList, sawPlans } from './sawList';
import { recognizeAll } from './recognize';
import { quotePdf } from './quotePdf';
import { pdfText } from './pdf';
import type { Quote, WeldJoint } from './types';

setRebuildBudget(Infinity);
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
const HAT = [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 40 }, { x: 75, y: 40 }, { x: 75, y: 0 }, { x: 90, y: 0 }];
const Z = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 120, y: 40 }];

describe('B-5 series pricing: the quote of a series charges the per-piece price of that series', () => {
  const m = analyze(lf1(), defaultSettings()).cost;
  it('one line: 5 x the sale price per piece of the series, the same number as the Cost panel', () => {
    const [l] = quoteLines(m, 30, 'een', 'LF1', 5);
    expect(l.hoeveelheid).toBe(5);
    expect(l.prijsCent).toBe(salePerPiece(m, 30, 5));
    near(l.prijsCent, (perPiece(m, 5) * 1.3), 0.5);
    // never the full single price: set-up shared over the five
    expect(l.prijsCent).toBeLessThan(salePerPiece(m, 30, 1));
    expect(lineTotal(l)).toBe(5 * salePerPiece(m, 30, 5));
  });
  it('N-4: the panel shows the sum of the grouping the quote uses: panel x series = quote, to the cent, in every grouping', () => {
    for (const g of ['een', 'categorie', 'detail'] as const) {
      expect(5 * salePerPiece(m, 30, 5, g), g).toBe(quoteLines(m, 30, g, 'LF1', 5).reduce((t, l) => t + lineTotal(l), 0));
    }
  });
  it('the other groupings give the same subtotal within a cent per line', () => {
    const total = (g: 'categorie' | 'detail') => quoteLines(m, 30, g, 'LF1', 5).reduce((t, l) => t + lineTotal(l), 0);
    for (const g of ['categorie', 'detail'] as const) near(total(g), 5 * salePerPiece(m, 30, 5), 5 * quoteLines(m, 30, g, '', 5).length);
  });
});

describe('B-7 a free line with a negative amount stays on the quote', () => {
  it('a discount of € 50 is a line of -€ 50, without margin', () => {
    const s = defaultSettings();
    const with50 = analyze(lf1(), s, { vrij: [{ omschrijving: 'Korting', bedragCent: -5000 }] }).cost;
    const lines = quoteLines(with50, 30, 'een', 'LF1', 1);
    const korting = lines.find((l) => l.omschrijving === 'Korting')!;
    expect(korting.prijsCent).toBe(-5000);
    const without = quoteLines(analyze(lf1(), s).cost, 30, 'een', 'LF1', 1);
    expect(lines.reduce((t, l) => t + lineTotal(l), 0)).toBe(without.reduce((t, l) => t + lineTotal(l), 0) - 5000);
  });
});

describe('B-2 / B-3 / B-11 one source for bend line, direction, angle and stop', () => {
  const plan = (pts: { x: number; y: number }[], name: string) => {
    const d = chainSheet(name, pts, 300);
    const f = flatOfSheet(d, partBodies(d)[0], name, 1, 'S235', 'din6935');
    expect(f.betrouwbaar, f.fout).toBe('exact');
    return { f, p: bendPlan(f, d, { rm: 450, werklengte: 3000, maxKracht: 1000 }) };
  };
  it('hat profile: the stops are the bend lines of the flat (12.12 / 49.37 / 109.61 / 146.85, width 158.98), not 46.4', () => {
    const { p } = plan(HAT, 'Hoed');
    const s = [...p.bends].sort((a, b) => a.s - b.s).map((b) => b.s);
    const hand = [12.12, 49.37, 109.61, 146.85];
    s.forEach((x, i) => near(x, hand[i], 0.05));
    near(p.width, 158.98, 0.05);
    // the independent hand formula: outside setback at a bend toward the material, inside setback at one away from it
    const c = chainBends(HAT, 3, 3, din6935K(3, 3), 300);
    c.bends.forEach((b, i) => near(b.s, hand[i], 0.05));
    // the stop of each step is the distance to the stop edge on the flat
    for (const st of p.seq.steps) { const b = p.bends.find((x) => x.id === st.plooi)!; near(st.aanslag, st.aanslagKant === 'a' ? b.s : p.width - b.s, 1e-9); }
    expect(p.seq.steps.map((x) => x.aanslag).some((a) => Math.abs(a - 46.37) < 0.1)).toBe(false);
  });
  it('Z profile: one bend up, one down, in the flat, on the DXF layers and in the plan; positions 12.1 and 114.4', () => {
    const { f, p } = plan(Z, 'Z');
    expect(f.plooien.map((b) => b.richting).sort()).toEqual(['neer', 'op']);
    const text = plateDxf(f, DXF_DEFAULTS, 'Z').split('\r\n');
    const layers = text.map((v, i) => (v === 'LINE' && text[i - 1] === '0' ? text[text.indexOf('8', i) + 1] : null)).filter(Boolean);
    expect(layers.sort()).toEqual(['ZETLIJN_NEER', 'ZETLIJN_OP']);
    const s = [...p.bends].sort((a, b) => a.s - b.s).map((b) => b.s);
    const c = chainBends(Z, 3, 3, din6935K(3, 3), 300).bends.map((b) => b.s);
    s.forEach((x, i) => near(x, c[i], 0.05));
    expect(p.seq.steps.filter((x) => x.omkeren).length).toBe(1);
  });
  it('hat profile on the DXF: two lines up and two down, the outer pair alike and the inner pair alike', () => {
    const { f } = plan(HAT, 'Hoed');
    const byId = [...f.plooien].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).map((b) => b.richting);
    expect(byId[0]).toBe(byId[3]);
    expect(byId[1]).toBe(byId[2]);
    expect(byId[0]).not.toBe(byId[1]);
    const text = plateDxf(f, DXF_DEFAULTS, 'H');
    expect((text.match(/\r\nZETLIJN_OP\r\n/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((text.match(/\r\nZETLIJN_NEER\r\n/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it('L profile: one bend, angle 90 from the chain', () => {
    const d = pp2();
    const f = flatOfSheet(d, partBodies(d)[0], 'L', 1, 'S235');
    expect(f.plooien.map((b) => [b.id, b.hoek])).toEqual([[1, 90]]);
  });
  it('B-11 the label says the allowance the flat was made with', () => {
    const d = pp2();
    d.sheetMetal = { ...d.sheetMetal!, allowanceType: 'bendDeduction', allowanceValue: 5 } as never;
    const f = flatOfSheet(d, partBodies(d)[0], 'L', 1, 'S235', 'din6935');
    expect(f.kBron).toMatch(/buigaftrek 5/);
    expect(f.kBron).not.toMatch(/DIN/);
  });
});

describe('B-4 customer data in an assembly', () => {
  const asm = (): Document => {
    const part = lf1();
    part.fab = { klant: { naam: 'Geheime Klant', adres: 'x', soort: 'particulier' }, quotes: [], kosten: { zagen: { bedragCent: 1, reden: 'r' } }, overrides: {} };
    const a = createDocument('Samenstelling', 'assembly');
    a.components = [{ id: 'c1', name: 'LF1<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
    return a;
  };
  it('the copy without customer data has no customer, quote or price in any part', () => {
    const a = asm();
    expect(hasCustomerData(a)).toBe(true);
    const text = serializeDocument(withoutCustomerData(a));
    expect(text).not.toContain('Geheime Klant');
    expect(text).not.toContain('bedragCent');
    expect(hasCustomerData(withoutCustomerData(a))).toBe(false);
  });
  it('a file whose fab sits only in a component is format 5; an empty fab is no fab', () => {
    expect(JSON.parse(serializeDocument(asm())).version).toBe(FAB_FILE_VERSION);
    const d = lf1(); d.fab = {};
    expect(JSON.parse(serializeDocument(d)).version).toBe(FILE_VERSION);
  });
});

describe('B-6 quote numbers', () => {
  it('above every number the document used and above the counter; a reset settings file never brings a number back', () => {
    const s = defaultSettings();
    expect(nextNumber(s, '2026-11-19', ['2026-001', '2026-007']).nummer).toBe('2026-008');
    expect(nextNumber(s, '2026-11-19', [], { jaar: 2026, laatste: 12 }).nummer).toBe('2026-013');
    expect(nextRevision('Z')).toBe('AA');
    expect(nextRevision('AZ')).toBe('BA');
  });
});

describe('B-8 kept weld joints follow the model and the execution class', () => {
  const J = (id: string, a: string, b: string, lengte = 100): WeldJoint => ({ id, bodies: [a, b], soort: 'hoeklas', maat: { letter: 'a', mm: 3 }, lengte, tweezijdig: false, rondom: true, montage: false,
    onderbroken: null, proces: '135', positie: 'PB', niveau: 'C', stap: 1, hechten: true, bevestigd: true });
  it('a removed contact lapses, a new one comes as proposal, a changed length follows, EXC3 gives level B', () => {
    const out = reconcileJoints([J('W1', 'a', 'b'), J('W2', 'a', 'c')], [{ ...J('x', 'b', 'a', 120), bevestigd: false }, { ...J('y', 'c', 'd'), bevestigd: false }], 'EXC3');
    expect(out.find((j) => j.id === 'W1')).toMatchObject({ lengte: 120, status: 'lengte gewijzigd', niveau: 'B' });
    expect(out.find((j) => j.id === 'W2')!.status).toBe('vervallen');
    expect(out.find((j) => j.bodies.includes('d'))).toMatchObject({ status: 'nieuw', bevestigd: false });
    expect(reconcileJoints([{ ...J('W1', 'a', 'b'), niveau: 'D', niveauHandmatig: true }], [J('x', 'a', 'b')], 'EXC3')[0].niveau).toBe('D');
  });
  it('a lapsed joint is not costed', () => {
    const s = defaultSettings();
    const a = analyze(lf1(), s);
    const kept = a.joints.map((j) => ({ ...j, bevestigd: true }));
    const gone = [...kept, { ...kept[0], id: 'W99', bodies: ['niets#0', 'nergens#0'] as [string, string] }];
    const b = analyze(lf1(), s, { welds: gone });
    expect(b.joints.find((j) => j.id === 'W99')!.status).toBe('vervallen');
    expect(b.cost.regels.find((l) => l.id === 'lassen')!.bedragCent).toBe(a.cost.regels.find((l) => l.id === 'lassen')!.bedragCent);
  });
});

describe('B-13 VAT rules', () => {
  const q = (extra: Partial<Quote>): Quote => ({ ...newQuote('q', { naam: 'K', adres: 'a', soort: 'particulier' }, [{ omschrijving: 'x', hoeveelheid: 1, eenheid: 'st', prijsCent: 100, btw: 21, uit: [] }],
    defaultSettings(), '2026-11-19', 'o'), ...extra });
  it('reverse charge only for a company with a valid VAT number', () => {
    expect(vatProblems(q({ btwRegime: 'verlegd' })).some((p) => p.blokkeert)).toBe(true);
    expect(vatProblems(q({ btwRegime: 'verlegd', klant: { naam: 'B', adres: 'a', soort: 'bedrijf', btwNummer: 'BE 0123.456.749' } }))).toEqual([]);
  });
  it('a 6 % quote carries the note with the conditions', () => {
    const six = q({ klant: { naam: 'K', adres: 'a', soort: 'particulier', zesProcent: { woningOuderDan10: true, prive: true, geplaatstEindgebruiker: true } },
      regels: [{ omschrijving: 'Plaatsen', hoeveelheid: 1, eenheid: 'st', prijsCent: 10000, btw: 6, uit: [], plaatsing: true }] });
    expect(vatProblems(six)).toEqual([]);
    expect(pdfText(quotePdf(six, { company: defaultSettings().company, verlegdTekst: '', vrijgesteldTekst: '' }))).toContain('minstens 10 jaar in gebruik');
  });
});

describe('B-15 doc.fab is checked when a file opens', () => {
  const file = (fab: unknown) => JSON.stringify({ ...JSON.parse(serializeDocument(lf1())), fab });
  it('a text amount, a free-line list that is no list, a bad VAT rate are refused', () => {
    expect(() => parseDocument(file({ kosten: { zagen: { bedragCent: 'abc', reden: 'x' } } }))).toThrow(/fabrication data/);
    expect(() => parseDocument(file({ vrij: 'x' }))).toThrow(/fabrication data/);
    expect(() => parseDocument(file({ quotes: [{ nummer: '1', datum: 'd', klant: { naam: 'a' }, regels: [{ omschrijving: 'a', hoeveelheid: 1, prijsCent: 1, btw: 12 }] }] }))).toThrow(/fabrication data/);
    expect(parseDocument(file({ vrij: [{ omschrijving: 'Korting', bedragCent: -500 }] })).fab?.vrij?.[0].bedragCent).toBe(-500);
  });
});

describe('N-8 materials and the file check', () => {
  it('St37, bronze, titanium and a numbered aluminium alloy are metal; cast, spring and alloy steel are no S235', async () => {
    const { isMetal } = await import('./recognize');
    const { materialKey } = await import('./catalog');
    for (const m of ['St37', 'St 52', 'Brons', 'Titaan', 'Titanium', '1060 Alloy', '6061 Alloy']) expect(isMetal(m), m).toBe(true);
    for (const m of ['Eik', 'PLA', 'Rubber']) expect(isMetal(m), m).toBe(false);
    expect(materialKey('1060 Alloy')).toBe('aluminium');
    for (const m of ['Gietstaal', 'Verenstaal', 'Alloy Steel', 'Cast Carbon Steel']) expect(materialKey(m), m).not.toBe('S235');
    expect(materialKey('Staal S235')).toBe('S235');
  });
  it('a weld joint without kind or process and a damaged frozen record are refused when the file opens', () => {
    const file = (fab: unknown) => JSON.stringify({ ...JSON.parse(serializeDocument(lf1())), fab });
    const a = analyze(lf1(), defaultSettings());
    const j = a.joints[0];
    expect(parseDocument(file({ welds: [j] })).fab?.welds?.length).toBe(1);
    const { soort: _s, proces: _p, ...bare } = j;
    expect(() => parseDocument(file({ welds: [bare] }))).toThrow(/fabrication data/);
    const q = { nummer: '2026-001', datum: '2026-11-19', klant: { naam: 'a', adres: 'b' }, regels: [], bevroren: { op: 'x', hash: 'h', uurloon: 45, kostenregels: [{ id: 'zagen', omschrijving: 'z', bedragCent: 'veel', hoeveelheid: 1 }] } };
    expect(() => parseDocument(file({ quotes: [q] }))).toThrow(/fabrication data/);
  });
});

describe('B-16 saw plan', () => {
  const S = { zaagsnede: 4, afkorten: 0, klem: 0, staafLengte: 6000 };
  it('one piece of 5998 is one bar with lower bound 1; 2998 + 4 + 2998 = 6000 fits one bar', () => {
    const a = barNest('x', [{ pos: 1, l: 5998 }], [], S);
    expect([a.staven.length, a.ondergrens]).toEqual([1, 1]);
    expect(barNest('x', [{ pos: 1, l: 2998 }, { pos: 2, l: 2998 }], [], S).staven.length).toBe(1);
  });
  it('the bar length set by Ian is used for a tube (12000)', () => {
    const saw = sawList(recognizeAll(partBodies(lf1())));
    const [plan] = sawPlans(saw, [], { ...S, staafLengte: 12000 });
    expect(plan.staven[0].lengte).toBe(12000);
  });
});

describe('B-12 bought material from stock is priced', () => {
  it('a bar from stock costs the set price per metre and the line says so', () => {
    const s = defaultSettings();
    s.rates.materiaalModus = 'aangekocht';
    s.materials.profielM['EN10219/SHS/40x40x3'] = { waarde: 5, eenheid: '€/m', bron: 't', aanname: false, datum: '2026-11-19' };
    s.materials.voorraad = [{ profielId: 'EN10219/SHS/40x40x3', lengte: 6000, aantal: 1, restant: false }];
    const l = analyze(lf1(), s).cost.regels.find((x) => x.categorie === 'profiel')!;
    expect(l.bedragCent).toBe(3000);
    expect(l.omschrijving).toMatch(/uit voorraad/);
  });
});

describe('B-16 the miter twist on the saw list', () => {
  it('two miters in one plane are not twisted (LF1); a miter in xz at one end and in yz at the other is', async () => {
    const { ConvexGeometry } = await import('three/examples/jsm/geometries/ConvexGeometry.js');
    const THREE = await import('three');
    const pts: InstanceType<typeof THREE.Vector3>[] = [];
    for (const x of [0, 40]) for (const y of [0, 40]) { pts.push(new THREE.Vector3(x, y, x)); pts.push(new THREE.Vector3(x, y, 500 + y)); }
    const { soup } = await import('./geom');
    const { miterTwisted } = await import('./recognize');
    expect(miterTwisted({ soup: soup(new ConvexGeometry(pts)) }, [0, 0, 1], 0, 540)).toBe(true);
    const recs = recognizeAll(partBodies(lf1()));
    expect(recs.every((r) => !r.verstekGedraaid)).toBe(true);
  });
});

describe('B-9 recognition that chose silently', () => {
  const strip = (name: string, holes: boolean, w = 400, h = 100, t = 5) => {
    const d = createDocument(name);
    d.material = { name: 'S235', density: 7850, color: '#888' };
    let s = createSketch('s1', 's1', 'top');
    const c = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    if (holes) { s = addCircle(s, { x: 50, y: 50 }, 4.5)[0]; s = addCircle(s, { x: 350, y: 50 }, 4.5)[0]; }
    d.sketches.s1 = s;
    d.features.push({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false } as never, { id: 'e1', type: 'extrude', name: name, sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: t, reverse: false } as never);
    return d;
  };
  it('a strip 400 x 100 x 5 with two holes is a plate (flat bar offered), with a DXF', () => {
    const r = recognizeAll(partBodies(strip('Strook', true)))[0];
    expect(r.soort).toBe('plaat');
    expect(r.kandidaten).toContain('EN10058/FL/100x5');
    const a = analyze(strip('Strook', true), defaultSettings());
    expect(a.flats.length).toBe(1);
    expect(a.saw.length).toBe(0);
  });
  it('the same strip without holes is flat bar, with the plate as the other choice', () => {
    const r = recognizeAll(partBodies(strip('Strook', false)))[0];
    expect(r.soort).toBe('profiel');
    expect(r.alternatief).toBe('plaat');
  });
  // N-3 (docs/37 ch. 9): the kernel marks the end faces of a long bar as curved; that never makes it a plate
  for (const [w, h, t] of [[400, 40, 8], [900, 40, 8], [2000, 40, 8], [800, 50, 6], [1200, 60, 10], [2000, 100, 5]] as const) {
    it(`N-3: plain flat bar ${h} x ${t} x ${w} stays on the saw list`, () => {
      const r = recognizeAll(partBodies(strip('Platstaaf', false, w, h, t)))[0];
      expect(r.soort, r.reden).toBe('profiel');
      expect(r.alternatief).toBe('plaat');
      expect(analyze(strip('Platstaaf', false, w, h, t), defaultSettings()).saw.length).toBe(1);
    });
  }
  it('N-3: the same 2000 mm bar with two holes is still a plate', () => {
    const r = recognizeAll(partBodies(strip('Strook', true, 2000, 100, 5)))[0];
    expect(r.soort).toBe('plaat');
  });
  it('a solid 41 x 41 named "koker 40 x 40" picks no wall: unknown with the candidates', () => {
    const d = strip('Staaf', false, 41, 41, 1200);
    d.name = 'Paal (koker 40 x 40)';
    const r = recognizeAll(partBodies(d))[0];
    expect(r.soort).toBe('onbekend');
    expect((r.kandidaten ?? []).length).toBeGreaterThan(1);
  });
  it('stainless named in Dutch is no S235; a plate without material is priced as an assumption', async () => {
    const { materialKey } = await import('./catalog');
    expect(materialKey('Roestvast staal 304')).toBe('RVS 304');
    expect(materialKey('Roestvrij staal')).toBe('RVS 304');
    expect(materialKey('Inox 430 geborsteld')).toBe('RVS 430');
    const d = strip('Strook', true); delete d.material;
    const l = analyze(d, defaultSettings()).cost.regels.find((x) => x.categorie === 'plaat')!;
    expect(l.aanname).toBe(true);
    expect(l.bron).toMatch(/geen materiaal/);
  });
});

describe('B-14 the workshop sheets are drawings', () => {
  it('the weld plan names saw-list positions, draws the symbol (no "?"), has the title block and never says "conform"', async () => {
    const { weldPlanPdf, bendSheetPdf } = await import('./sheets');
    const { weldPlanInput } = await import('./analyze');
    const { proposeSequence } = await import('./weld');
    const a = analyze(lf1(), defaultSettings());
    const { naam, view } = weldPlanInput(a);
    const text = pdfText(weldPlanPdf(a.joints, proposeSequence(a.joints), 'EXC2', { titel: 'LF1', model: 'LF1', hash: a.hash }, naam, view));
    expect(text).toMatch(/pos \d+ \/ pos \d+/);
    expect(text).not.toMatch(/\?/);
    expect(text).toContain('Eigenaar');
    expect(text).toContain('[BEDRIJFSNAAM]');
    expect(text.toLowerCase()).not.toContain('conform');
    const d = chainSheet('Hoed', HAT, 300);
    const f = flatOfSheet(d, partBodies(d)[0], 'Hoed', 1, 'S235');
    const pl = bendPlan(f, d, { rm: 450, werklengte: 3000, maxKracht: 1000 });
    const bt = pdfText(bendSheetPdf(f, pl.bends, pl.seq.steps, pl.checks, pl.prismatic, { titel: 'H', model: 'H', hash: 'x' }, pl.seq.botsing));
    expect(bt).toMatch(/Schaal 1:\d+/);
    expect(bt).toContain('plooi op (naar de kijker)');
    expect(bt).toContain('49,4');
  });
});

describe('B-17 the nest PDF holds every material and thickness', () => {
  it('two groups give pages for both', async () => {
    const { nestPdf } = await import('./sheets');
    const { nestRects, nestPieces, defaultNestSettings } = await import('./nest');
    const sq = (key: string, mat: string, t: number) => ({ key, naam: key, n: 1, materiaal: mat, t, dichtheid: 7850, buiten: [{ a: { x: 0, y: 0 }, bulge: 0 }, { a: { x: 100, y: 0 }, bulge: 0 },
      { a: { x: 100, y: 50 }, bulge: 0 }, { a: { x: 0, y: 50 }, bulge: 0 }], binnen: [], gaten: [], plooien: [], bbox: { l: 100, b: 50, draai: 0 }, oppervlak: 5000,
      snijlengte: { buiten: 300, binnen: 0 }, insteken: 1, kg: 0, betrouwbaar: 'exact' as const });
    const flats = [sq('a', 'S235', 3), sq('b', 'RVS 304', 2)];
    const n1 = nestRects('S235', 3, nestPieces([flats[0], { ...flats[1], n: 0 }]), defaultNestSettings(3));
    const n2 = nestRects('RVS 304', 2, nestPieces([{ ...flats[0], n: 0 }, flats[1]]), defaultNestSettings(2));
    const t = pdfText(nestPdf([n1, n2], flats, { titel: 'x', model: 'x', hash: 'x' }));
    expect(t).toContain('Legplan S235 3 mm');
    expect(t).toContain('Legplan RVS 304 2 mm');
  });
});

describe('P3 money and small fixes', () => {
  it('every cost line: quantity x shown unit price = amount (to the cent); warranty follows an override', () => {
    const s = defaultSettings();
    const a = analyze(lf1(), s);
    for (const l of a.cost.regels.filter((x) => !x.geenPrijs)) near(l.bedragCent, Math.round(l.hoeveelheid * l.eenheidsprijsCent), 1);
    const g0 = a.cost.regels.find((l) => l.id === 'garantie')!.bedragCent;
    const b = analyze(lf1(), s, { kosten: { zagen: { bedragCent: 100000, reden: 'test' } } });
    expect(b.cost.regels.find((l) => l.id === 'garantie')!.bedragCent).toBeGreaterThan(g0);
  });
  it('N-5: warranty and insurance are the percentage of the subtotal, rounded once (not 3 x a rounded 1 %)', () => {
    const s = defaultSettings();
    s.finishing.garantiePct = { ...s.finishing.garantiePct, waarde: 3 };
    const a = analyze(lf1(), s);
    const i = a.cost.regels.findIndex((l) => l.id === 'garantie');
    const sub = a.cost.regels.slice(0, i).reduce((t, l) => t + l.bedragCent, 0);
    expect(a.cost.regels[i].bedragCent).toBe(Math.round((sub * 3) / 100));
    expect(a.cost.regels[i].hoeveelheid).toBe(1);
    expect(a.cost.regels[i].omschrijving).toMatch(/3 % van € /);
  });
  it('the degree sign reaches the DXF text as %%d; a VZW needs no RPR', async () => {
    const { DxfWriter } = await import('./dxf');
    const w = new DxfWriter(); w.text('TEKST', { x: 0, y: 0 }, 3, 'hoek 45°');
    expect(w.toString()).toContain('hoek 45%%d');
    const { companyMissing } = await import('./settings');
    expect(companyMissing({ ...defaultSettings().company, rechtsvorm: 'VZW' })).not.toContain('RPR');
  });
});

describe('P3 the weld point is the centre of the contact', () => {
  it('LF1: the post joints sit on the post, at x = 500', () => {
    const b = partBodies(lf1());
    const post = b.find((x) => x.bodyId.startsWith('sm2'))!;
    const j = reconcileJoints([], analyze(lf1(), defaultSettings()).joints).filter((x) => x.bodies.includes(post.key));
    expect(j.length).toBe(2);
    for (const x of j) near(x.punt![0], 500, 0.5);
  });
});

describe('P3 an imported settings file is checked list by list', () => {
  it('a damaged stock entry refuses the file', async () => {
    const { exportSettings, importSettings } = await import('./settings');
    const s = defaultSettings();
    s.materials.voorraad = [{ profielId: 'EN10219/SHS/40x40x3', lengte: 1840, aantal: 1, restant: true }];
    const ok = JSON.parse(exportSettings(s));
    expect(importSettings(JSON.stringify(ok)).materials.voorraad.length).toBe(1);
    ok.materials.voorraad[0].lengte = 'lang';
    expect(() => importSettings(JSON.stringify(ok))).toThrow(/voorraadregel 1/);
  });
});

describe('P5 price per plate', () => {
  const plate = async () => (await import('./fixtures')).pp1();
  it('P5.1 PP1 outsourced, on the cent: rectangle with spacing x t x density x €/kg; cut length x €/m of the band; pierces x price', async () => {
    const s = defaultSettings();
    s.rates.afvalPlaat.waarde = 0;
    const a = analyze(await plate(), s);
    const f = a.flats[0];
    const L = (id: string) => a.cost.regels.find((x) => x.id === `${id}:${f.key}`)!.bedragCent;
    const kg = ((200 + 5) * (100 + 5) * 5 * 7850) / 1e9;
    expect(L('plaat')).toBe(Math.round(Math.round(kg * 1e4) / 1e4 * 160));
    const snij = (2 * (180 + 80) + 2 * Math.PI * 10 + 4 * Math.PI * 9) / 1000;
    expect(L('snijden')).toBe(Math.round(Math.round(snij * 1e4) / 1e4 * 140));
    expect(L('insteken')).toBe(5 * 25);
  });
  it('P5.2 / N-6 the share of the nested sheet: one small plate pays the used strip, the remnant goes back to stock', async () => {
    const s = defaultSettings();
    s.rates.plaatModus = 'nest';
    s.materials.platen = [{ id: 'k', materiaal: '*', t: 0, l: 2000, b: 1000, voorraad: 0, restplaat: false }];
    const a = analyze(await plate(), s);
    const l = a.cost.regels.find((x) => x.categorie === 'plaat')!;
    expect(l.omschrijving).toMatch(/geneste blad.*restplaat \d+ x \d+ terug naar voorraad/);
    const whole = (2000 * 1000 * 5 * 7850) / 1e9;
    // never the whole sheet for one plate (was 78.5 kg); at least the plate itself
    expect(l.hoeveelheid).toBeLessThan(whole / 4);
    const f = a.flats[0];
    expect(l.hoeveelheid).toBeGreaterThanOrEqual((f.oppervlak * 5 * 7850) / 1e9);
    const n0 = nestGroups(a.flats, s)[0], u = usedSheet(n0.bladen[0], n0.instellingen.rand);
    near(l.hoeveelheid, (u.l * u.b * 5 * 7850) / 1e9, 1e-3);
  });
  it('P5.3 own machine: time = cut length / speed + pierces x pierce time; no speed is "no price"', async () => {
    const s = defaultSettings();
    s.machines.laser.modus = 'eigen';
    s.machines.laser.machineUur = { waarde: 120, eenheid: '€/u', bron: 't', aanname: false, datum: '2026-11-19' };
    s.machines.laser.insteekTijd = { waarde: 2, eenheid: 's', bron: 't', aanname: false, datum: '2026-11-19' };
    const none = analyze(await plate(), s).cost;
    expect(none.regels.find((x) => x.id.startsWith('snijden'))!.geenPrijs).toBe(true);
    s.machines.laser.snelheid = [{ materiaal: 'S235', t: 5, mmPerMin: 2000 }];
    const a = analyze(await plate(), s);
    const f = a.flats[0], l = a.cost.regels.find((x) => x.id === `snijden:${f.key}`)!;
    const h = (f.snijlengte.buiten + f.snijlengte.binnen) / 2000 / 60 + (5 * 2) / 3600;
    near(l.hoeveelheid, h, 1e-4);
  });
});

describe('L3.7 a Weld Bead of an older file gets a joint of the same size', () => {
  it('the bead of 5 mm becomes a joint a5 that refers to it', () => {
    const d = lf1();
    d.features.push({ id: 'wb1', type: 'weldBead', name: 'Weld Bead1', suppressed: false, faces: [], size: 5, intermittent: null, from: 0, to: 0 } as never);
    const j = analyze(d, defaultSettings()).joints.find((x) => x.beadFeatureId === 'wb1')!;
    expect(j.maat).toEqual({ letter: 'a', mm: 5 });
  });
});

describe('L3.5 dragging a weld step renumbers the order and keeps it', () => {
  it('step 4 dragged to the front becomes step 2; the rest shift; the order survives saving', () => {
    const a = analyze(lf1(), defaultSettings(), { exc: 'EXC2' });
    const order = [...a.joints].sort((x, y) => x.stap - y.stap).map((j) => j.id);
    const moved = reorderWelds(a.joints, order, order[2], 0)!;
    const after = [...moved].sort((x, y) => x.stap - y.stap).map((j) => j.id);
    expect(after).toEqual([order[2], order[0], order[1], ...order.slice(3)]);
    expect(moved.every((j) => j.bevestigd)).toBe(true);
    expect(reorderWelds(a.joints, order, order[0], 0)).toBeNull();
    const d = lf1();
    d.fab = { exc: 'EXC2', lasvolgordeHandmatig: true, welds: moved };
    const back = parseDocument(serializeDocument(d));
    const b = analyze(back, defaultSettings(), back.fab);
    expect([...b.joints].sort((x, y) => x.stap - y.stap).map((j) => j.id)).toEqual(after);
  });
});

describe('weld plan view: a real projection (docs/37 ch. 9)', () => {
  it('LF1: every member has its projected edges; the post is drawn 40 wide at x = 500, the view looks along the depth', async () => {
    const { weldPlanInput } = await import('./analyze');
    const a = analyze(lf1(), defaultSettings(), { exc: 'EXC2' });
    const { view } = weldPlanInput(a);
    expect(view.length).toBe(5);
    for (const v of view) expect(v.randen.length).toBeGreaterThan(4);
    const post = view.find((v) => v.hi[0] - v.lo[0] < 50 && v.lo[0] > 400 && v.hi[0] < 600)!;
    const xs = post.randen.flatMap(([p, q]) => [p[0], q[0]]);
    near(Math.max(...xs) - Math.min(...xs), 40, 0.5);
    near((Math.max(...xs) + Math.min(...xs)) / 2, 500, 0.5);
  });
});
