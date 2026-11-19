import { describe, expect, it } from 'vitest';
import { euro, date, num, toCent, machineNum, mm } from './format';
import { PdfDoc, pdfText, textWidth } from './pdf';
import { DRAFT_LINE, PLACEHOLDERS, quotePdf } from './quotePdf';
import { defaultSettings, companyMissing, validEnterpriseNumber, validIban, type Company } from './settings';
import { FORBIDDEN_FOR_CUSTOMER, lineTotal, newQuote, nextNumber, nextRevision, quoteLines, setRate, vatProblems, vatTotals } from './quote';
import type { Customer, Quote, QuoteLine } from './types';
import { analyze } from './analyze';
import { lf1, pp1 } from './fixtures';
import { setRebuildBudget } from '../core/features/rebuild';
import { parseDocument, serializeDocument, FILE_VERSION, FAB_FILE_VERSION, readDocument } from '../core/document/persistence';
import { withoutCustomerData } from './privacy';
import { writeBook } from './xlsxBook';
import { readZip } from '../core/document/zip';
import { sawListPdf, weldPlanPdf, plateListPdf } from './sheets';

setRebuildBudget(Infinity);

const L = (prijsCent: number, btw: 21 | 6 | 0 = 21, extra: Partial<QuoteLine> = {}): QuoteLine => ({ omschrijving: 'Regel', hoeveelheid: 1, eenheid: 'st', prijsCent, btw, uit: [], ...extra });
const klant: Customer = { naam: 'Klant Test', adres: 'Teststraat 1\n9000 Gent', soort: 'particulier' };
const TEST_COMPANY: Company = { naam: 'Testbedrijf', rechtsvorm: 'BV', adres: 'Fictieve straat 1, 9000 Gent', ondernemingsnummer: 'BE 0123.456.749', btwPlichtig: true, rpr: 'RPR Gent, afdeling Gent',
  iban: 'BE68 5390 0754 7034', bic: '', telefoon: '09 000 00 00', email: 'test@voorbeeld.invalid', website: '' };
const quote = (regels: QuoteLine[], extra: Partial<Quote> = {}): Quote => ({ ...newQuote('q1', klant, regels, defaultSettings(), '2026-11-19', 'Balustrade'), nummer: '2026-001', ...extra });
const pdfOf = (q: Quote, c: Company) => pdfText(quotePdf(q, { company: c, verlegdTekst: 'Btw verlegd: medecontractant (test).', vrijgesteldTekst: 'Bijzondere vrijstellingsregeling kleine ondernemingen (test).' }));

describe('F0-9 formats', () => {
  it('Belgian notation, the money rounding and the machine numbers', () => {
    expect(euro(123456)).toBe('€ 1.234,56');
    expect(euro(50)).toBe('€ 0,50');
    expect(date('2026-11-19')).toBe('19/11/2026');
    expect(num(NaN)).toBe('–');
    expect(num(-0)).toBe('0,00');
    expect(num(1e-7)).toBe('0,00');
    expect(num(-0.001, 2)).toBe('0,00');
    expect(toCent(0.005)).toBe(1);
    expect(toCent(1.005)).toBe(101);
    expect(toCent(-1.005)).toBe(-101);
    expect(machineNum(1e-7)).toBe('0');
    expect(machineNum(-0)).toBe('0');
    expect(machineNum(1234.5)).toBe('1234.5');
    expect(() => machineNum(NaN)).toThrow();
    expect(mm(1000)).toBe('1000');
  });
});

describe('O2 quote layout and PDF', () => {
  it('O2.3 VAT: 100,00 + 33,33 + 0,01 at 21 %, 250,00 at 6 %: to the cent', () => {
    const t = vatTotals([L(10000), L(3333), L(1), L(25000, 6)], 'normaal');
    const r21 = t.perTarief.find((x) => x.tarief === 21)!, r6 = t.perTarief.find((x) => x.tarief === 6)!;
    expect(r21.maatstafCent).toBe(13334);
    expect(r21.btwCent).toBe(2800);
    expect(r6.maatstafCent).toBe(25000);
    expect(r6.btwCent).toBe(1500);
    expect(t.inclCent).toBe(42634);
  });

  it('O2.4 6 % without the three conditions is not possible; 6 % without a placing line is refused', () => {
    const q = quote([L(10000)]);
    expect('fout' in setRate(q, 0, 6)).toBe(true);
    const ok = { ...q, klant: { ...klant, zesProcent: { woningOuderDan10: true, prive: true, geplaatstEindgebruiker: true } } };
    const r = setRate(ok, 0, 6) as Quote;
    expect(r.regels[0].btw).toBe(6);
    // docs/37 B-13: 6 % without a placing line is refused, not only reported
    expect(vatProblems(r).map((p) => p.blokkeert)).toEqual([true]);
    expect(vatProblems({ ...r, regels: [{ ...r.regels[0], plaatsing: true }] })).toEqual([]);
    // two of three ticked: refused
    expect('fout' in setRate({ ...q, klant: { ...klant, zesProcent: { woningOuderDan10: true, prive: true, geplaatstEindgebruiker: false } } }, 0, 6)).toBe(true);
  });

  it('O2.1 empty company data: watermark ONTWERP on every page, the line about the missing data, the placeholders literally', () => {
    const empty = defaultSettings().company;
    expect(companyMissing(empty).length).toBeGreaterThan(0);
    const q = quote(Array.from({ length: 60 }, (_, i) => L(1000 + i)));
    const bytes = quotePdf(q, { company: empty, verlegdTekst: '', vrijgesteldTekst: '' });
    const text = pdfText(bytes);
    const pages = (text.match(/pagina \d+ van \d+/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(2);
    expect((text.match(/^ONTWERP$/gm) ?? []).length).toBe(pages);
    expect((text.match(new RegExp(DRAFT_LINE, 'g')) ?? []).length).toBe(pages);
    for (const ph of [PLACEHOLDERS.naam, PLACEHOLDERS.rechtsvorm, PLACEHOLDERS.adres, PLACEHOLDERS.ondernemingsnummer, PLACEHOLDERS.iban, PLACEHOLDERS.telefoon, PLACEHOLDERS.email]) expect(text).toContain(ph);
    // "Eventus" is never a default
    expect(text).not.toMatch(/Eventus/i);
  });

  it('O2.2 fictional test company with a valid enterprise number: no watermark, every mandatory mention present', () => {
    expect(validEnterpriseNumber(TEST_COMPANY.ondernemingsnummer)).toBe(true);
    expect(validEnterpriseNumber('BE 0123.456.789')).toBe(false);
    expect(validIban(TEST_COMPANY.iban)).toBe(true);
    expect(validIban('BE68 5390 0754 7035')).toBe(false);
    expect(companyMissing(TEST_COMPANY)).toEqual([]);
    const text = pdfOf(quote([L(10000)]), TEST_COMPANY);
    expect(text).not.toContain('ONTWERP');
    expect(text).not.toContain(DRAFT_LINE);
    for (const s of ['Testbedrijf BV', 'BTW BE 0123.456.749', 'RPR Gent', 'BE68 5390 0754 7034', 'Fictieve straat 1, 9000 Gent']) expect(text).toContain(s);
  });

  it('O2.5 regime verlegd: no VAT amount, the note; vrijgesteld: no VAT column, the note', () => {
    const v = vatTotals([L(10000)], 'verlegd');
    expect(v.btwCent).toBe(0);
    const tv = pdfOf(quote([L(10000)], { btwRegime: 'verlegd' }), TEST_COMPANY);
    expect(tv).toContain('Btw verlegd');
    expect(tv).not.toMatch(/Btw 21 %/);
    const tf = pdfOf(quote([L(10000)], { btwRegime: 'vrijgesteld' }), TEST_COMPANY);
    expect(tf).toContain('vrijstellingsregeling');
    expect(tf).not.toContain('Btw %');
  });

  it('O2.6 the customer PDF never says AANNAME, marge, kostprijs, bron or uurloon (from the cost model of LF1)', () => {
    const a = analyze(lf1(), defaultSettings());
    const lines = quoteLines(a.cost, 30, 'detail', 'Proefraam');
    expect(lines.length).toBeGreaterThan(3);
    const text = pdfOf(quote(lines), TEST_COMPANY);
    for (const w of FORBIDDEN_FOR_CUSTOMER) expect(text.toLowerCase()).not.toContain(w.toLowerCase());
    // the margin is in the prices: the sum of the lines is the cost x 1.3
    const sum = lines.reduce((t, l) => t + lineTotal(l), 0);
    expect(Math.abs(sum - a.cost.totaalCent * 1.3)).toBeLessThanOrEqual(lines.length);
  });

  it('O2.7 notation and the characters € ë é ï ç ° in the PDF (WinAnsi, not ?)', () => {
    const doc = new PdfDoc();
    doc.page().text(10, 10, '€ 1.234,56 · ë é ï ç ° Ø');
    const bytes = doc.save();
    expect(pdfText(bytes)).toContain('€ 1.234,56 · ë é ï ç ° Ø'.replace('·', '·'));
    const raw = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    expect(raw).toContain('\\200 1.234,56');
    expect(raw).not.toMatch(/\(\? /);
    expect(textWidth('1.234,56', 10)).toBeGreaterThan(textWidth('1,56', 10));
  });

  it('O2.8 a quote of 60 lines runs over more pages: head repeated, totals not alone, footer and "pagina x van n" on each', () => {
    const text = pdfOf(quote(Array.from({ length: 60 }, (_, i) => L(1000 + i))), TEST_COMPANY);
    const n = Number(/pagina 1 van (\d+)/.exec(text)![1]);
    expect(n).toBeGreaterThanOrEqual(2);
    for (let k = 1; k <= n; k++) expect(text).toContain(`pagina ${k} van ${n}`);
    expect((text.match(/^Bedrag excl\. btw$/gm) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((text.match(/Testbedrijf BV · Fictieve/g) ?? []).length).toBe(n);
    // the totals stand on the page of the last line, right after it
    const last = text.lastIndexOf('€ 10,59'), tot = text.indexOf('Subtotaal excl. btw');
    expect(tot).toBeGreaterThan(last);
    expect(text.slice(last, tot)).not.toMatch(/pagina \d+ van/);
  });

  it('O3.1 numbers per year: 2026-001 then 2026-002; a cancelled export takes no number', () => {
    const s = defaultSettings();
    const a = nextNumber(s, '2026-11-19');
    expect(a.nummer).toBe('2026-001');
    // the dialog was cancelled: the counter in the settings is not raised, the next one is again 001
    expect(nextNumber(s, '2026-11-19').nummer).toBe('2026-001');
    s.quote.teller = a.teller;
    expect(nextNumber(s, '2026-11-20').nummer).toBe('2026-002');
    expect(nextNumber(s, '2027-01-02').nummer).toBe('2027-001');
    expect(nextRevision('A')).toBe('B');
  });
});

describe('F0-7 / O3 the document and privacy', () => {
  it('a file without fab stays format 4; with fab it is format 5 and opens again; an older build reads 5 with a warning', () => {
    const d = pp1();
    expect(JSON.parse(serializeDocument(d)).version).toBe(FILE_VERSION);
    d.fab = { overrides: { 'e1#0': { soort: 'plaat', t: 5 } }, quotes: [quote([L(100)])], klant };
    const text = serializeDocument(d);
    expect(JSON.parse(text).version).toBe(FAB_FILE_VERSION);
    const back = parseDocument(text);
    expect(back.fab?.quotes?.[0].nummer).toBe('2026-001');
    expect(back.fab?.overrides?.['e1#0'].t).toBe(5);
    expect(readDocument(text).warnings).toEqual([]);
    expect(() => parseDocument(JSON.stringify({ ...JSON.parse(text), fab: { quotes: 'kapot' } }))).toThrow(/fabrication data/);
  });

  it('O3.6 "save a copy without customer data": no quotes, no customer, no prices; the workshop data stay', () => {
    const d = pp1();
    d.fab = { overrides: { 'e1#0': { soort: 'plaat', t: 5 } }, quotes: [quote([L(100)])], klant, kosten: { zagen: { bedragCent: 1, reden: 'x' } }, reeks: 5 };
    const out = withoutCustomerData(d);
    const text = serializeDocument(out);
    expect(text).not.toContain('Klant Test');
    expect(text).not.toContain('prijsCent');
    expect(text).not.toContain('bedragCent');
    expect(out.fab?.overrides).toEqual(d.fab.overrides);
  });

  it('O3.5 workbook: sheets with numbers as numbers', async () => {
    const book = writeBook([{ name: 'Offerte', rows: [['Pos', 'Bedrag'], [1, 12.5]] }, { name: 'Kostprijs', rows: [['x', 1]] }, { name: 'Stuklijst', rows: [['y']] }]);
    const files = await readZip(book);
    expect([...files.keys()]).toContain('xl/worksheets/sheet3.xml');
    const s1 = new TextDecoder().decode(files.get('xl/worksheets/sheet1.xml')!);
    expect(s1).toContain('<c r="B2"><v>12.5</v></c>');
  });
});

describe('workshop sheets', () => {
  it('L2.9 / L3.6 the saw list PDF prints € ë ° Ø; the weld plan with EXC2 has the warning and never the word "conform"', () => {
    const a = analyze(lf1(), defaultSettings());
    const meta = { titel: 'x', model: 'LF1 Proefraam ë', hash: a.hash };
    const saw = pdfText(sawListPdf(a.saw, a.plans, meta, 4));
    expect(saw).toContain('Koker 40 x 40 x 3');
    expect(saw).toContain('45°');
    expect(saw).toContain('ë');
    const weld = pdfText(weldPlanPdf(a.joints, [], 'EXC2', meta, (k) => k));
    expect(weld).toContain('EXC2 vraagt een gecertificeerde FPC, WPS en lascoördinatie. Dit programma controleert dat niet.');
    for (const t of [saw, weld, pdfText(plateListPdf(analyze(pp1(), defaultSettings()).flats, meta))]) expect(t.toLowerCase()).not.toContain('conform');
  });
});

describe('N-8 docs/37 ch. 9: small things of the quote', () => {
  it('a quote of 4 lines with the model picture is one page, with the totals, the conditions and "voor akkoord"', () => {
    const q = quote([L(120000), L(35000), L(8000), L(-5000)]);
    const text = pdfText(quotePdf(q, { company: defaultSettings().company, verlegdTekst: '', vrijgesteldTekst: '', image: { jpeg: new Uint8Array([255, 216, 255, 217]), w: 800, h: 600 } }));
    expect(text).toContain('pagina 1 van 1');
    for (const t of ['Totaal incl. btw', 'Leveringstermijn', 'Betaling', 'Geldigheid', 'Voorwaarden', 'Voor akkoord']) expect(text).toContain(t);
  });
  it('reverse charge to a company with a VAT number of another EU country is a warning to check in VIES, not a refusal', () => {
    const nl: Customer = { ...klant, soort: 'bedrijf', btwNummer: 'NL123456789B01' };
    const p = vatProblems(quote([L(1000)], { klant: nl, btwRegime: 'verlegd' }));
    expect(p.length).toBe(1);
    expect(p[0].blokkeert).toBe(false);
    expect(p[0].tekst).toMatch(/VIES/);
    // nonsense is still refused
    expect(vatProblems(quote([L(1000)], { klant: { ...nl, btwNummer: 'XX12' }, btwRegime: 'verlegd' }))[0].blokkeert).toBe(true);
  });
});
