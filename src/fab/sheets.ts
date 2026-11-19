/**
 * The workshop sheets as PDF (docs/36 L-11, P-5, P-6, L-7): saw list with the saw plan per bar (A4 landscape), plate
 * list, nested sheets, bend sheet and weld plan. Dutch, Belgian number notation, each with its status ("nog te zagen",
 * "nog te openen bij de lasersnijder", "nog te plooien") until Ian has done it for real. The word "conform" is never
 * written (EN 1090: from EXC2 a fixed warning).
 */
import { PdfDoc, type PdfPage } from './pdf';
import { NL } from './nl';
import { date, mm, num, today } from './format';
import type { SawLine } from './sawList';
import { angleText } from './sawList';
import type { BarPlan } from './barNest';
import type { FlatPart } from './flat';
import { arcPoints } from './flat';
import { dxfFileName } from './dxf';
import type { Nest } from './nest';
import { placeLoop } from './nest';
import type { ExecutionClass, WeldJoint } from './types';
import { excDefaults, weldText, type WeldStep } from './weld';
import { withBends, type BendLine, type BendStep } from './bend';
import { profileById } from './catalog';

const GREY: [number, number, number] = [0.45, 0.45, 0.45];
const LIGHT: [number, number, number] = [0.92, 0.92, 0.92];
export interface SheetMeta { titel: string; model: string; hash: string; datum?: string }

function frame(doc: PdfDoc, p: PdfPage, m: SheetMeta, title: string, status: string) {
  const W = doc.width;
  p.text(12, 14, title, { bold: true, size: 14 });
  p.text(12, 20, `${m.model} · ${date(m.datum ?? today())} · model ${m.hash}`, { size: 8, color: GREY });
  p.text(W - 12, 14, status, { size: 8, bold: true, color: [0.7, 0.35, 0], align: 'right' });
}
function footer(doc: PdfDoc) {
  doc.pages.forEach((p, k) => p.text(doc.width - 12, doc.height - 6, NL.pagina(k + 1, doc.pages.length), { size: 7, color: GREY, align: 'right' }));
}

/** a table with a head row; returns the y below it; a new page when it runs over */
function table(doc: PdfDoc, pg: { p: PdfPage }, y: number, cols: { t: string; w: number; right?: boolean }[], rows: string[][], newPage: () => number): number {
  const x0 = 12;
  const head = (yy: number) => {
    pg.p.rect(x0, yy - 4, cols.reduce((t, c) => t + c.w, 0), 5.6, { fill: LIGHT });
    let x = x0;
    for (const c of cols) { pg.p.text(c.right ? x + c.w - 1.5 : x + 1, yy, c.t, { size: 7.5, bold: true, align: c.right ? 'right' : 'left' }); x += c.w; }
    return yy + 5.6;
  };
  y = head(y);
  for (const r of rows) {
    if (y > doc.height - 14) { y = head(newPage()); }
    let x = x0;
    r.forEach((v, i) => { const c = cols[i]; pg.p.text(c.right ? x + c.w - 1.5 : x + 1, y, v, { size: 7.5, align: c.right ? 'right' : 'left' }); x += c.w; });
    y += 4.6;
    pg.p.line(x0, y - 3.4, x0 + cols.reduce((t, c) => t + c.w, 0), y - 3.4, { w: 0.08, color: [0.85, 0.85, 0.85] });
  }
  return y;
}

/** saw list and saw plan (A4 landscape) */
export function sawListPdf(lines: SawLine[], plans: BarPlan[], m: SheetMeta, zaagsnede: number): Uint8Array {
  const doc = new PdfDoc(297, 210, `${NL.zaagstaat} ${m.model}`);
  const pg = { p: doc.page() };
  frame(doc, pg.p, m, NL.zaagstaat, NL.status.zaag);
  const newPage = () => { pg.p = doc.page(); frame(doc, pg.p, m, NL.zaagstaat, NL.status.zaag); return 30; };
  const K = NL.zaagKop;
  const cols = [{ t: K[0], w: 11 }, { t: K[1], w: 14, right: true }, { t: K[2], w: 50 }, { t: K[3], w: 22 }, { t: K[4], w: 22, right: true }, { t: K[5], w: 16, right: true },
    { t: K[6], w: 16, right: true }, { t: K[7], w: 22 }, { t: K[8], w: 13, right: true }, { t: K[9], w: 16, right: true }, { t: K[10], w: 19, right: true }, { t: K[11], w: 52 }];
  const rows = lines.map((l) => [String(l.pos), String(l.n), l.profiel, l.kwaliteit, mm(l.zaaglengte), `${num(l.hoek1, l.hoek1 % 1 ? 1 : 0)}°`, `${num(l.hoek2, l.hoek2 % 1 ? 1 : 0)}°`,
    l.hoek1 || l.hoek2 ? (l.verstekGedraaid ? NL.verstek.gedraaid : NL.verstek.zelfde) : angleText(0, 0), String(l.gaten), num(l.kgStuk, 2), num(l.kgTotaal, 2), l.opm.slice(0, 40)]);
  let y = table(doc, pg, 32, cols, rows, newPage);
  const kg = lines.reduce((t, l) => t + l.kgTotaal, 0), meters = lines.reduce((t, l) => t + l.n * l.zaaglengte, 0) / 1000;
  pg.p.text(12, y + 2, `Totaal ${num(meters, 2)} m, ${num(kg, 1)} kg · zaagsnede ${zaagsnede} mm · ${NL.toleranties}`, { size: 8, bold: true });
  // the saw plan: one bar per row, pieces in proportion, the remnant hatched
  y += 10;
  pg.p.text(12, y, NL.zaagplan, { bold: true, size: 11 });
  y += 6;
  const BAR = 220;
  for (const plan of plans) {
    const prof = profileById(plan.profielId);
    if (y > doc.height - 30) y = newPage();
    pg.p.text(12, y, `${prof?.naam ?? plan.profielId}: ${plan.staven.length} sta${plan.staven.length === 1 ? 'af' : 'ven'}, ${NL.benutting} ${num(plan.benutting * 100, 0)} %,` +
      ` ${NL.ondergrens} ${plan.ondergrens}`, { size: 8.5, bold: true });
    pg.p.text(285, y, NL.bijBestellen(plan.teBestellen), { size: 8, align: 'right' });
    y += 3;
    for (const f of plan.fouten) { pg.p.text(14, y + 3, `FOUT pos ${f.pos}: ${f.tekst}`, { size: 8, color: [0.8, 0.1, 0.1] }); y += 4.5; }
    for (const bar of plan.staven) {
      if (y > doc.height - 16) y = newPage();
      const k = BAR / bar.lengte;
      let x = 40;
      pg.p.text(12, y + 4.2, `${mm(bar.lengte)} ${bar.bron === 'restant' ? NL.restant : bar.bron === 'voorraad' ? NL.voorraad : NL.nieuw}`, { size: 7.5 });
      pg.p.rect(x, y, BAR, 6, { stroke: [0.3, 0.3, 0.3], w: 0.2 });
      for (const s of bar.stukken) {
        pg.p.rect(x, y, s.l * k, 6, { fill: [0.75, 0.85, 0.95], stroke: [0.2, 0.3, 0.5], w: 0.15 });
        if (s.l * k > 12) pg.p.text(x + (s.l * k) / 2, y + 4.2, `${s.pos}: ${mm(s.l)}`, { size: 6.5, align: 'center' });
        x += (s.l + zaagsnede) * k;
      }
      if (bar.rest > 0) pg.p.text(40 + BAR - 1, y + 4.2, `${NL.rest} ${mm(bar.rest)}`, { size: 6.5, align: 'right', color: GREY });
      y += 8;
    }
    y += 3;
  }
  footer(doc);
  return doc.save();
}

/** the plate list for the laser (A4 landscape) */
export function plateListPdf(flats: FlatPart[], m: SheetMeta): Uint8Array {
  const doc = new PdfDoc(297, 210, `${NL.plaatlijst} ${m.model}`);
  const pg = { p: doc.page() };
  frame(doc, pg.p, m, NL.plaatlijst, NL.status.laser);
  const newPage = () => { pg.p = doc.page(); frame(doc, pg.p, m, NL.plaatlijst, NL.status.laser); return 30; };
  const K = NL.plaatKop;
  const cols = [{ t: K[0], w: 11 }, { t: K[1], w: 14, right: true }, { t: K[2], w: 40 }, { t: K[3], w: 22 }, { t: K[4], w: 14, right: true }, { t: K[5], w: 30, right: true },
    { t: K[6], w: 22, right: true }, { t: K[7], w: 22, right: true }, { t: K[8], w: 16, right: true }, { t: K[9], w: 15, right: true }, { t: K[10], w: 16, right: true }, { t: K[11], w: 51 }];
  const rows = flats.map((f, i) => [`P${i + 1}`, String(f.n), f.naam, f.materiaal, num(f.t, f.t % 1 ? 1 : 0), `${mm(f.bbox.l)} x ${mm(f.bbox.b)}`, `${num(f.oppervlak / 1e6, 4)} m²`,
    `${num((f.snijlengte.buiten + f.snijlengte.binnen) / 1000, 3)} m`, String(f.insteken), String(f.plooien.length), num(f.kg, 2), f.betrouwbaar === 'geen' ? `GEEN DXF: ${f.fout ?? ''}`.slice(0,
      44) : dxfFileName(i + 1, f.materiaal, f.t, f.n)]);
  const y = table(doc, pg, 32, cols, rows, newPage);
  pg.p.text(12, y + 2, `${NL.kerf} ${NL.thermisch}`, { size: 8 });
  footer(doc);
  return doc.save();
}

const loopPts = (l: { a: { x: number; y: number }; bulge: number }[]) => l.flatMap((s, i) => (s.bulge ? arcPoints(s.a, l[(i + 1) % l.length].a, s.bulge, 12).slice(0, -1) : [s.a]));

/** one page per nested sheet (A4 landscape): the sheet, the pieces with their position, the use */
export function nestPdf(nest: Nest, flats: FlatPart[], m: SheetMeta): Uint8Array {
  const doc = new PdfDoc(297, 210, `${NL.legplan} ${m.model}`);
  nest.bladen.forEach((sh, i) => {
    const p = doc.page();
    frame(doc, p, m, `${NL.legplan} ${nest.materiaal} ${num(nest.t, nest.t % 1 ? 1 : 0)} mm · ${NL.blad} ${i + 1} van ${nest.bladen.length}`, NL.status.laser);
    const k = Math.min(270 / sh.l, 160 / sh.b), ox = 14, oy = 30;
    const X = (x: number) => ox + x * k, Y = (y: number) => oy + (sh.b - y) * k;
    p.rect(ox, oy, sh.l * k, sh.b * k, { stroke: [0, 0, 0], w: 0.3, fill: [0.97, 0.97, 0.97] });
    for (const pl of sh.stukken) {
      const f = flats[pl.pos - 1];
      const hue = ((pl.pos * 47) % 360) / 360;
      const col: [number, number, number] = [0.6 + 0.3 * Math.sin(hue * 6.28), 0.7 + 0.2 * Math.cos(hue * 6.28), 0.85];
      p.poly(placeLoop(f.buiten, pl).map((q) => [X(q.x), Y(q.y)] as [number, number]), { closed: true, fill: col, stroke: [0.2, 0.2, 0.3], w: 0.15 });
      for (const l of f.binnen) p.poly(loopPts(l).map((q) => { const z = pl.draai === 90 ? { x: pl.x + pl.b - q.y, y: pl.y + q.x } : { x: pl.x + q.x, y: pl.y + q.y }; return [X(z.x),
        Y(z.y)] as [number, number]; }), { closed: true, fill: [1, 1, 1], stroke: [0.2, 0.2, 0.3], w: 0.1 });
      for (const g of f.gaten) { const z = pl.draai === 90 ? { x: pl.x + pl.b - g.c.y, y: pl.y + g.c.x } : { x: pl.x + g.c.x, y: pl.y + g.c.y }; p.circle(X(z.x), Y(z.y), g.r * k, { fill: [1, 1, 1],
        stroke: [0.2, 0.2, 0.3], w: 0.1 }); }
      const cx = pl.draai === 90 ? pl.x + pl.b / 2 : pl.x + pl.l / 2, cy = pl.draai === 90 ? pl.y + pl.l / 2 : pl.y + pl.b / 2;
      p.text(X(cx), Y(cy) + 1.2, `P${pl.pos}`, { size: 7, bold: true, align: 'center' });
    }
    p.text(14, 200, `${NL.blad} ${sh.l} x ${sh.b} mm · ${NL.benutting} ${num(sh.benutting * 100, 0)} % · afstand ${nest.instellingen.afstand} mm, rand ${nest.instellingen.rand} mm ·` +
      ` ${NL.rechthoek} · ${NL.ondergrens} ${nest.ondergrens} bla${nest.ondergrens === 1 ? 'd' : 'den'}`, { size: 8 });
  });
  if (!nest.bladen.length) { const p = doc.page(); frame(doc, p, m, NL.legplan, NL.status.laser); }
  for (const f of nest.fouten) doc.pages[0].text(14, 26, `FOUT: ${f.tekst}`, { size: 8, color: [0.8, 0.1, 0.1] });
  footer(doc);
  return doc.save();
}

/** the bend sheet (A4 landscape): the flat pattern with numbered bend lines and the table */
export function bendSheetPdf(f0: FlatPart, bends: BendLine[], steps: BendStep[], checks: string[], prismatic: boolean, m: SheetMeta, botsing: number[]): Uint8Array {
  const f = withBends(f0, bends);
  const doc = new PdfDoc(297, 210, `${NL.plooiblad} ${f.naam}`);
  const p = doc.page();
  frame(doc, p, m, `${NL.plooiblad} ${f.naam} · ${f.materiaal} ${num(f.t, f.t % 1 ? 1 : 0)} mm`, NL.status.plooi);
  const k = Math.min(150 / Math.max(1, f.bbox.l), 120 / Math.max(1, f.bbox.b)), ox = 14, oy = 30;
  const X = (x: number) => ox + x * k, Y = (y: number) => oy + (f.bbox.b - y) * k;
  p.poly(loopPts(f.buiten).map((q) => [X(q.x), Y(q.y)] as [number, number]), { closed: true, stroke: [0, 0, 0], w: 0.3 });
  for (const l of f.binnen) p.poly(loopPts(l).map((q) => [X(q.x), Y(q.y)] as [number, number]), { closed: true, stroke: [0, 0, 0], w: 0.2 });
  for (const g of f.gaten) p.circle(X(g.c.x), Y(g.c.y), g.r * k, { stroke: [0, 0, 0], w: 0.2 });
  f.plooien.forEach((b, i) => {
    p.line(X(b.a.x), Y(b.a.y), X(b.b.x), Y(b.b.y), { w: 0.3, color: b.richting === 'op' ? [0, 0.5, 0] : [0.8, 0, 0], dash: [2, 1] });
    p.text(X(b.a.x) + 1, Y(b.a.y) - 1, `${i + 1}`, { size: 9, bold: true });
  });
  const K = NL.plooiKop;
  const cols = [{ t: K[0], w: 10 }, { t: K[1], w: 11 }, { t: K[2], w: 24 }, { t: K[3], w: 13, right: true }, { t: K[4], w: 20, right: true }, { t: K[5], w: 18, right: true }, { t: K[6], w: 17,
    right: true }, { t: K[7], w: 10 }, { t: K[8], w: 18, right: true }];
  const rows = steps.map((s) => { const b = bends.find((x) => x.id === s.plooi)!; return [String(s.stap), String(s.plooi), `${b.richting}${s.omkeren ? ' (omkeren)' : ''}`, `${num(b.hoek, 0)}°`,
    `${num(f.plooien[0]?.r ?? 0, 1)} mm`, `${num(s.vOpening, 0)} mm`, `${num(s.aanslag, 1)} mm`, s.aanslagKant, `${num(s.perskracht, 1)} kN`]; });
  const pg = { p };
  // the table to the right of the drawing
  const shift = 170;
  const tp = { p: { ...p, text: (x: number, y: number, s: string, o?: Parameters<PdfPage['text']>[3]) => p.text(x + shift - 12, y, s, o), rect: (x: number, y: number, w: number, h: number,
    o?: Parameters<PdfPage['rect']>[4]) => p.rect(x + shift - 12, y, w, h, o), line: (x1: number, y1: number, x2: number, y2: number, o?: Parameters<PdfPage['line']>[4]) => p.line(x1 + shift - 12,
      y1, x2 + shift - 12, y2, o) } as PdfPage };
  let y = table(doc, tp, 34, cols.map((c) => ({ ...c, w: c.w * 0.85 })), rows, () => 30);
  void pg;
  y = Math.max(y, 160);
  p.text(14, y, NL.kBron(f.kBron ?? 'het model'), { size: 8 });
  if (!prismatic) p.text(14, y + 5, NL.nietBotsing, { size: 8, bold: true });
  if (botsing.length) p.text(14, y + 10, `Botsing in stap ${botsing.join(', ')}: kies een andere volgorde.`, { size: 8, bold: true, color: [0.8, 0.1, 0.1] });
  checks.forEach((c, i) => p.text(14, y + 15 + 4.4 * i, c, { size: 8, color: [0.7, 0.3, 0] }));
  footer(doc);
  return doc.save();
}

/** the weld plan (A4 landscape): table, execution class and its warning, the remark about the rules of thumb */
export function weldPlanPdf(joints: WeldJoint[], steps: WeldStep[], exc: ExecutionClass, m: SheetMeta, naam: (key: string) => string): Uint8Array {
  const doc = new PdfDoc(297, 210, `${NL.lasplan} ${m.model}`);
  const pg = { p: doc.page() };
  frame(doc, pg.p, m, NL.lasplan, exc === 'geen' ? 'Uitvoeringsklasse: niet opgegeven' : `Uitvoeringsklasse ${exc}`);
  const newPage = () => { pg.p = doc.page(); frame(doc, pg.p, m, NL.lasplan, exc); return 30; };
  const K = NL.lasKop;
  const cols = [{ t: K[0], w: 12 }, { t: K[1], w: 12, right: true }, { t: K[2], w: 70 }, { t: K[3], w: 18 }, { t: K[4], w: 14 }, { t: K[5], w: 16, right: true }, { t: K[6], w: 16 }, { t: K[7],
    w: 16 }, { t: K[8], w: 14 }, { t: K[9], w: 85 }];
  const rows = [...joints].sort((a, b) => a.stap - b.stap).map((j) => [j.id, String(j.stap), `${naam(j.bodies[0])} / ${naam(j.bodies[1])}`.slice(0, 48), j.soort,
    `${j.maat.letter}${num(j.maat.mm, j.maat.mm % 1 ? 1 : 0)}`, mm(j.lengte), j.proces, j.positie, j.niveau,
    `${weldText(j)}${j.bevestigd ? '' : ' · voorstel'}`.slice(0, 60)]);
  let y = table(doc, pg, 32, cols, rows, newPage);
  const tack = steps.find((s) => s.soort === 'hechten');
  if (tack) { pg.p.text(12, y + 2, `Stap 1: hechten (${tack.joints.join(', ')}), dan aflassen in de volgorde van de kolom Stap.`, { size: 8 }); y += 5; }
  const long = steps.filter((s) => (s.stukken ?? 1) > 1);
  if (long.length) { pg.p.text(12, y + 2, `Terugstapmethode: ${long.map((s) => `stap ${s.stap} in ${s.stukken} stukken`).join(', ')}.`, { size: 8 }); y += 5; }
  pg.p.text(12, y + 2, NL.lasVoorstel, { size: 8 });
  const w = excDefaults(exc).waarschuwing;
  if (w) pg.p.text(12, y + 8, w, { size: 9, bold: true, color: [0.75, 0.1, 0.1] });
  pg.p.text(12, y + 14, NL.toleranties, { size: 8 });
  footer(doc);
  return doc.save();
}
