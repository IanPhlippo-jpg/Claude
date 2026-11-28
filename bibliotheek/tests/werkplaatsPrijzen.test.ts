/**
 * De werkplaats in één app (bibliotheek/werkplaats, 2026-11-28): het prijsdocument van elk product toont dezelfde bedragen
 * als de vroegere tabellen Kostprijs en Ter vergelijking (opgemaakt zoals die tabellen ze opmaakten, uit dezelfde
 * kostprijs()), voor een paar configuraties per product; de PDF heeft dezelfde totalen; de bladen bij Schema's en
 * Werkvoorbereiding hebben geen prijzen; en het bouwscript maakt van elke configurator een module zonder botsende stijl.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// de bibliotheek is plain JavaScript (deels zonder typen): dynamisch laden
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const laad = (p: string): Promise<any> => import(/* @vite-ignore */ `../${p}`);
const eur = (v: number) => `€ ${(Math.round(v * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const eur0 = (v: number) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
type Rij = string[] | { c: string[]; soort?: string; id?: string };
type Doc = { kern: { id: string; v: string }[]; delen: { id: string; rijen: Rij[] }[] };
const cellen = (r: Rij) => (Array.isArray(r) ? r : r.c);
const kern = (d: Doc, id: string) => d.kern.find((x) => x.id === id)?.v;
const rij = (d: Doc, deel: string, id: string) => { const r = d.delen.find((x) => x.id === deel)?.rijen.find((x) => !Array.isArray(x) && x.id === id); return r ? cellen(r) : undefined; };
const pdfTekst = (b: Uint8Array) => Buffer.from(b).toString('latin1');

describe('taatsdeuren: prijsdocument = de vroegere kostprijstabel', async () => {
  const D = await laad('taatsdeuren/deuren.mjs'), P = await laad('taatsdeuren/prijzen.mjs'), W = await laad('taatsdeuren/werkwijze.mjs');
  const { prijsDocument } = await laad('taatsdeuren/prijsdoc.mjs'), { prijsDocPdf, prijsDocHtml } = await laad('werkplaats/werkdoc.mjs');
  const { bestelBlad } = await laad('taatsdeuren/bestel.mjs');
  const std = { gebruik: 'binnen', systeem: 'auto', opbouw: 'enkel', glas: 'helder', scharnier: 'budget', afwerking: 'poedercoat', kleur: '9005', lak: 'fijnstructuur', plaatsen: true };
  const gevallen = [
    { mat: 'staal', stijl: 'boog', B: 1000, H: 2400, ...std },
    { mat: 'staal', stijl: 'drievak', B: 1100, H: 2500, ...std, scharnier: 'verdekt', afwerking: 'natlak', plaatsen: false },
    { mat: 'staal', stijl: 'drievak', B: 1000, H: 2400, ...std, gebruik: 'buiten', kleur: 'brons', scharnier: 'premium' },
    { mat: 'alu', stijl: 'drievak', B: 1000, H: 2400, ...std, systeem: 'aanvraag', plaatsen: false },
    { mat: 'alu', stijl: 'drievak', B: 900, H: 2300, ...std, systeem: 'darby', plaatsen: false },
  ];
  for (const st of gevallen) it(`${st.mat} ${st.stijl} ${st.B}x${st.H} ${st.systeem} ${st.scharnier}`, () => {
    const inst = { uurloon: 45, marge: 35, margeAlu: 20 }, marge = st.mat === 'alu' ? inst.margeAlu : inst.marge;
    const o = D.ontwerp(st.stijl, st.B, st.H, { gebruik: st.gebruik, systeem: st.systeem, opbouw: st.opbouw, scharnier: st.scharnier, zijlicht: 400 });
    const keuzes = { gebruik: st.gebruik, systeem: st.systeem, opbouw: o.opbouw, glas: st.glas, scharnier: st.scharnier, afwerking: st.afwerking, ral: st.kleur, lak: st.lak, uurloon: inst.uurloon, marge, uren: W.UREN, plaatsen: st.plaatsen };
    const k = P.kostprijs(o, keuzes), s = D.STIJLEN.find((x: { id: string }) => x.id === st.stijl);
    const doc: Doc = prijsDocument({ o, k, L: D.lijsten(o), s, kk: { ...keuzes, scharnierModel: k.scharnier }, meta: { nr: 'TD', datum: '2026-11-28' } }, st.mat, inst, {});
    // de vroegere tabel Kostprijs: elke regel, materiaal, arbeid, kostprijs, verkoop en incl. btw
    const kp = doc.delen.find((x) => x.id === 'kostprijs')!.rijen.map(cellen);
    k.regels.forEach((r: { wat: string; bedrag: number }, i: number) => expect(kp[i].slice(0, 2)).toEqual([r.wat, eur(r.bedrag)]));
    expect(rij(doc, 'kostprijs', 'materiaal')?.[1]).toBe(eur(k.materiaal));
    expect(rij(doc, 'kostprijs', 'arbeid')?.[1]).toBe(eur(k.arbeid));
    expect(rij(doc, 'kostprijs', 'kostprijs')?.[1]).toBe(eur(k.kostprijs));
    expect(kern(doc, 'kostprijs')).toBe(eur(k.kostprijs));
    expect(kern(doc, 'verkoop')).toBe(eur(k.verkoop));
    expect(rij(doc, 'verkoop', 'incl')?.[1]).toBe(eur(k.verkoop * 1.21));
    expect(rij(doc, 'arbeid', 'arbeid')?.[3]).toBe(eur(k.arbeid));
    // de vroegere tabel Ter vergelijking: deze deur zonder plaatsen
    expect(rij(doc, 'markt', 'markt')?.[1]).toBe(eur0(k.verkoop - (k.plaatsen.inbegrepen ? k.plaatsen.verkoop : 0)));
    const pdf = pdfTekst(prijsDocPdf(doc));
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain(eur(k.kostprijs).slice(2)); // het bedrag zonder het euroteken (dat staat als \200 in de PDF)
    expect(prijsDocHtml(doc)).toContain(`data-kern="kostprijs"><span>Kostprijs</span><b>${eur(k.kostprijs)}</b>`);
    // de bestellijst bij Werkvoorbereiding: zonder prijzen
    expect(bestelBlad(o, keuzes, { zonderPrijs: true })).not.toContain('€');
  });
});

describe('balustrades: prijsdocument = de vroegere kostprijstabel', async () => {
  const M = await laad('balustrades/model.mjs'), P = await laad('balustrades/prijzen.mjs'), W = await laad('balustrades/werkwijze.mjs'), Dos = await laad('balustrades/dossier.mjs');
  const { prijsDocument } = await laad('balustrades/prijsdoc.mjs'), { prijsDocPdf } = await laad('werkplaats/werkdoc.mjs'), O = await laad('balustrades/onderdelen.mjs');
  const gevallen = [{}, { soort: 'staven', vorm: 'hoek', L1: 4000, L2: 2500, hoek: 90, plaats: 'buiten' }, { soort: 'glasstaal', vorm: 'recht', L1: 5000, plaatsen: true }, { soort: 'glasU', vorm: 'recht', L1: 3000, bevestiging: 'zij' }, { vorm: 'trap', L1: 3000, L2: 1500, H: 1000 }];
  for (const g of gevallen) it(JSON.stringify(g), () => {
    const inst = { versie: 1, ...JSON.parse(JSON.stringify(P.STANDAARD)), uren: { ...W.UREN } };
    const soort = (g as { soort?: string }).soort, S = soort ? { stijl: O.SOORTEN[soort].stijlen[0].id } : {};
    const o = M.ontwerp({ ...M.STD, ...g, ...S }), kp = P.kostprijs(o, inst), btw = Dos.btwFactor(inst);
    const doc: Doc = prijsDocument({ o, kp, meta: { datum: '2026-11-28' } }, inst);
    const rijen = doc.delen.find((x) => x.id === 'kostprijs')!.rijen.map(cellen);
    kp.regels.forEach((r: { wat: string; bedrag: number }, i: number) => expect([rijen[i][0], rijen[i][2]]).toEqual([r.wat, eur(r.bedrag)]));
    expect(rij(doc, 'kostprijs', 'materiaal')?.[2]).toBe(eur(kp.materiaal));
    expect(rij(doc, 'kostprijs', 'arbeid')?.[2]).toBe(eur(kp.arbeid));
    expect(rij(doc, 'kostprijs', 'kostprijs')?.[2]).toBe(eur(kp.kostprijs));
    expect(kern(doc, 'kostprijs')).toBe(eur(kp.kostprijs));
    expect(kern(doc, 'verkoop')).toBe(eur(kp.verkoop));
    expect(rij(doc, 'verkoop', 'incl')?.[1]).toBe(eur(kp.verkoop * btw));
    expect(rij(doc, 'markt', 'markt')?.[1]).toBe(eur0(kp.perMeterZonder));
    expect(pdfTekst(prijsDocPdf(doc))).toContain(eur(kp.kostprijs).slice(2));
    // de bladen bij Schema's en Werkvoorbereiding: zonder prijzen
    for (const b of Dos.dossierBladen(o, { zonderPrijs: true }).bladen) expect(b.svg, b.id).not.toContain('€');
  });
});

describe('fitness: prijsdocument = de vroegere kostprijstabel', async () => {
  const C = await laad('fitness/catalogus.mjs'), P = await laad('fitness/prijzen.mjs'), W = await laad('fitness/werkwijze.mjs'), T = await laad('fitness/tekeningen.mjs');
  const { prijsDocument } = await laad('fitness/prijsdoc.mjs'), { prijsDocPdf } = await laad('werkplaats/werkdoc.mjs');
  const gevallen: [string, string, object][] = [['FR-01', 'thuis', {}], ['FR-01', 'pro', { maat: 'XL' }], ['FB-01', 'semi', {}], ['FK-01', 'thuis', {}], ['FS-01', 'pro', {}]];
  for (const [id, versie, opt] of gevallen) it(`${id} ${versie} ${JSON.stringify(opt)}`, () => {
    const inst = { versie: 1, ...JSON.parse(JSON.stringify(P.STANDAARD)), uren: { ...W.UREN } };
    const o = C.toestel(id, versie, opt), k = P.kostprijs(o, inst), doc: Doc = prijsDocument(o, k, { datum: '2026-11-28' });
    const rijen = doc.delen.find((x) => x.id === 'kostprijs')!.rijen.map(cellen);
    k.regels.forEach((r: { wat: string; bedrag: number }, i: number) => expect([rijen[i][0], rijen[i][2]]).toEqual([r.wat, eur(r.bedrag)]));
    expect(rij(doc, 'kostprijs', 'kostprijs')?.[2]).toBe(eur(k.kostprijs));
    expect(rij(doc, 'kostprijs', 'arbeid')?.[2]).toBe(eur(k.arbeid));
    expect(kern(doc, 'kostprijs')).toBe(eur(k.kostprijs));
    expect(kern(doc, 'incl')).toBe(eur(k.incl));
    expect(rij(doc, 'verkoop', 'verkoop')?.[1]).toBe(eur(k.verkoop));
    // de vroegere bestellijst: zelfde bedrag per kooponderdeel
    const koop = doc.delen.find((x) => x.id === 'koop')!.rijen.map(cellen);
    k.koop.forEach((x: { bedrag: number; prijs: number }, i: number) => expect([koop[i][3], koop[i][4]]).toEqual([eur(x.prijs), eur(x.bedrag)]));
    expect(pdfTekst(prijsDocPdf(doc))).toContain(eur(k.incl).slice(2));
    for (const b of T.alleBladen(o, { zonderPrijs: true }, inst).filter((x: { id: string }) => x.id === 'bestellijst')) expect(b.svg).not.toMatch(/€ \d/);
  });
});

describe('bouwscript werkplaats-app', () => {
  it('maakt index.html, klant.html en drie apps die als module te lezen zijn', async () => {
    const { schaduwCss } = await laad('werkplaats/maak-werkplaats.mjs');
    expect(schaduwCss(':root { --a: 1 } body[data-soort="x"] { --b: 2 } :root[data-theme="dark"] body[data-soort="x"] { --c: 3 } html, body { margin: 0 } body { color: red }'))
      .toContain(':host { --a: 1 } :host([data-soort="x"]) { --b: 2 } :host([data-theme="dark"][data-soort="x"]) { --c: 3 } :host { margin: 0 } :host { color: red }');
    const d = mkdtempSync(join(tmpdir(), 'werkplaats-'));
    execFileSync(process.execPath, ['bibliotheek/werkplaats/maak-werkplaats.mjs', d], { stdio: 'pipe' });
    for (const f of ['index.html', 'klant.html', 'js/apps/deuren.mjs', 'js/apps/balustrades.mjs', 'js/apps/fitness.mjs', 'js/werkplaats/werkdoc.mjs', 'js/taatsdeuren/prijsdoc.mjs', 'js/balustrades/prijsdoc.mjs', 'js/fitness/prijsdoc.mjs']) expect(existsSync(join(d, f)), f).toBe(true);
    for (const a of ['deuren', 'balustrades', 'fitness']) {
      execFileSync(process.execPath, ['--check', join(d, 'js/apps', `${a}.mjs`)], { stdio: 'pipe' });
      const m = readFileSync(join(d, 'js/apps', `${a}.mjs`), 'utf8');
      expect(m).toContain('export async function mount(ROOT, HOST, CTX)');
      expect(m).not.toContain("'./js/");
    }
    expect(readFileSync(join(d, 'klant.html'), 'utf8')).toContain('data-klant="1"');
  });
});
