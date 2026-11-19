/**
 * The workshop sheets as PDF (docs/36 L-11, P-5, P-6, L-7): saw list with the saw plan per bar (A4 landscape), plate
 * list, nested sheets, bend sheet and weld plan. Dutch, Belgian number notation, each with its status ("nog te zagen",
 * "nog te openen bij de lasersnijder", "nog te plooien") until Ian has done it for real. The word "conform" is never
 * written (EN 1090: from EXC2 a fixed warning).
 */
import { PdfDoc, textWidth, type PdfPage } from './pdf';
import { NL } from './nl';
import { date, mm, num, today } from './format';
import type { SawLine } from './sawList';
import { angleText } from './sawList';
import type { BarPlan } from './barNest';
import type { FlatPart } from './flat';
import { arcPoints } from './flat';
import { dxfFileName } from './dxf';
import type { Nest } from './nest';
import { placeFn, placeLoop } from './nest';
import type { ExecutionClass, WeldJoint } from './types';
import { excDefaults, type WeldStep } from './weld';
import { drawWeldSymbol, SYMBOL_EXAMPLES } from './weldSymbol';
import type { BendLine, BendStep } from './bend';
import { profileById } from './catalog';

const GREY: [number, number, number] = [0.45, 0.45, 0.45];
const LIGHT: [number, number, number] = [0.92, 0.92, 0.92];
export interface SheetMeta { titel: string; model: string; hash: string; datum?: string; eigenaar?: string; opsteller?: string; revisie?: string }

function frame(doc: PdfDoc, p: PdfPage, m: SheetMeta, title: string, status: string) {
  const W = doc.width;
  p.text(12, 14, title, { bold: true, size: 14 });
  p.text(12, 20, `${m.model} · ${date(m.datum ?? today())} · model ${m.hash}`, { size: 8, color: GREY });
  p.text(W - 12, 14, status, { size: 8, bold: true, color: [0.7, 0.35, 0], align: 'right' });
}

/**
 * The title block of every sheet (after ISO 7200, docs/37 B-14), bottom right, 170 x 18 mm: owner, title, document
 * type and number, sheet x of n, date of issue, creator, approval (empty), the general tolerances.
 */
function footer(doc: PdfDoc, m: SheetMeta, soort: string) {
  const W = doc.width, H = doc.height, w = 170, h = 18, x = W - 12 - w, y = H - 8 - h;
  doc.pages.forEach((p, k) => {
    p.rect(x, y, w, h, { stroke: [0, 0, 0], w: 0.35, fill: [1, 1, 1] });
    for (const yy of [y + 6, y + 12]) p.line(x, yy, x + w, yy, { w: 0.15 });
    for (const xx of [x + 60, x + 110, x + 140]) p.line(xx, y, xx, y + h, { w: 0.15 });
    const cell = (cx: number, cy: number, label: string, value: string, bold = false) => { p.text(cx + 1, cy + 2.2, label, { size: 4.8, color: GREY }); p.text(cx + 1, cy + 5.2, value,
      { size: 6.8, bold }); };
    cell(x, y, 'Eigenaar', m.eigenaar || '[BEDRIJFSNAAM]', true);
    cell(x + 60, y, 'Documentsoort', soort);
    cell(x + 110, y, 'Blad', `${k + 1} / ${doc.pages.length}`);
    cell(x + 140, y, 'Uitgifte', date(m.datum ?? today()));
    cell(x, y + 6, 'Titel', m.model.slice(0, 40), true);
    cell(x + 60, y + 6, 'Documentnummer', `${m.titel}-${soort.slice(0, 3).toUpperCase()}`.slice(0, 26));
    cell(x + 110, y + 6, 'Revisie', m.revisie ?? 'A');
    cell(x + 140, y + 6, 'Model', m.hash);
    cell(x, y + 12, 'Toleranties', 'EN ISO 13920-BF · ISO 2768-m');
    cell(x + 60, y + 12, 'Opgesteld', m.opsteller || 'Phlippo CAD');
    cell(x + 110, y + 12, 'Goedgekeurd', '');
    cell(x + 140, y + 12, 'Taal', 'nl');
  });
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
    if (y > doc.height - 34) { y = head(newPage()); }
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
    if (y > doc.height - 48) y = newPage();
    pg.p.text(12, y, `${prof?.naam ?? plan.profielId}: ${plan.staven.length} sta${plan.staven.length === 1 ? 'af' : 'ven'}, ${NL.benutting} ${num(plan.benutting * 100, 0)} %,` +
      ` ${NL.ondergrens} ${plan.ondergrens}`, { size: 8.5, bold: true });
    pg.p.text(285, y, NL.bijBestellen(plan.teBestellen), { size: 8, align: 'right' });
    y += 3;
    for (const f of plan.fouten) { pg.p.text(14, y + 3, `FOUT pos ${f.pos}: ${f.tekst}`, { size: 8, color: [0.8, 0.1, 0.1] }); y += 4.5; }
    for (const bar of plan.staven) {
      if (y > doc.height - 36) y = newPage();
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
  footer(doc, m, NL.zaagstaat);
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
  footer(doc, m, NL.plaatlijst);
  return doc.save();
}

const loopPts = (l: { a: { x: number; y: number }; bulge: number }[]) => l.flatMap((s, i) => (s.bulge ? arcPoints(s.a, l[(i + 1) % l.length].a, s.bulge, 12).slice(0, -1) : [s.a]));

/** one page per nested sheet (A4 landscape): the sheet, the pieces with their position, the use */
/** one page per nested sheet of every material and thickness (A4 landscape): the sheet, the pieces, the use (docs/37 B-17) */
export function nestPdf(nests: Nest | Nest[], flats: FlatPart[], m: SheetMeta): Uint8Array {
  const all = Array.isArray(nests) ? nests : [nests];
  const doc = new PdfDoc(297, 210, `${NL.legplan} ${m.model}`);
  for (const nest of all) {
  nest.bladen.forEach((sh, i) => {
    const p = doc.page();
    frame(doc, p, m, `${NL.legplan} ${nest.materiaal} ${num(nest.t, nest.t % 1 ? 1 : 0)} mm · ${NL.blad} ${i + 1} van ${nest.bladen.length}`, NL.status.laser);
    const k = Math.min(270 / sh.l, 140 / sh.b), ox = 14, oy = 32;
    const X = (x: number) => ox + x * k, Y = (y: number) => oy + (sh.b - y) * k;
    p.rect(ox, oy, sh.l * k, sh.b * k, { stroke: [0, 0, 0], w: 0.3, fill: [0.97, 0.97, 0.97] });
    for (const pl of sh.stukken) {
      const f = flats[pl.pos - 1];
      const hue = ((pl.pos * 47) % 360) / 360;
      const col: [number, number, number] = [0.6 + 0.3 * Math.sin(hue * 6.28), 0.7 + 0.2 * Math.cos(hue * 6.28), 0.85];
      p.poly(placeLoop(f.buiten, pl).map((q) => [X(q.x), Y(q.y)] as [number, number]), { closed: true, fill: col, stroke: [0.2, 0.2, 0.3], w: 0.15 });
      const to = placeFn(pl);
      for (const l of f.binnen) p.poly(loopPts(l).map((q) => { const z = to(q); return [X(z.x), Y(z.y)] as [number, number]; }), { closed: true, fill: [1, 1, 1], stroke: [0.2, 0.2, 0.3], w: 0.1 });
      for (const g of f.gaten) { const z = to(g.c); p.circle(X(z.x), Y(z.y), g.r * k, { fill: [1, 1, 1], stroke: [0.2, 0.2, 0.3], w: 0.1 }); }
      // the label at the centre of the outline (two pieces of a pair share their box)
      const ring = placeLoop(f.buiten, pl), cx = ring.reduce((t, q) => t + q.x, 0) / ring.length, cy = ring.reduce((t, q) => t + q.y, 0) / ring.length;
      p.text(X(cx), Y(cy) + 1.2, `P${pl.pos}`, { size: 7, bold: true, align: 'center' });
    }
    p.text(12, 26, `${NL.blad} ${sh.l} x ${sh.b} mm · ${NL.benutting} ${num(sh.benutting * 100, 0)} % · afstand ${nest.instellingen.afstand} mm, rand ${nest.instellingen.rand} mm ·` +
      ` ${nest.status === 'vorm' ? NL.vorm : NL.rechthoek} · ${NL.ondergrens} ${nest.ondergrens} bla${nest.ondergrens === 1 ? 'd' : 'den'}`, { size: 8 });
  });
  if (!nest.bladen.length) { const p = doc.page(); frame(doc, p, m, NL.legplan, NL.status.laser); }
  nest.fouten.forEach((f, i) => doc.pages[doc.pages.length - 1].text(14, 29.5 + 3.5 * i, `FOUT: ${f.tekst}`, { size: 8, color: [0.8, 0.1, 0.1] }));
  }
  footer(doc, m, NL.legplan);
  return doc.save();
}

/** the bend sheet (A4 landscape): the flat pattern to scale with numbered bend lines, their positions from edge a, a
 * legend, and the table of the sequence (docs/37 B-14) */
export function bendSheetPdf(f: FlatPart, bends: BendLine[], steps: BendStep[], checks: string[], prismatic: boolean, m: SheetMeta, botsing: number[]): Uint8Array {
  const doc = new PdfDoc(297, 210, `${NL.plooiblad} ${f.naam}`);
  const p = doc.page();
  frame(doc, p, m, `${NL.plooiblad} ${f.naam} · ${f.materiaal} ${num(f.t, f.t % 1 ? 1 : 0)} mm`, NL.status.plooi);
  // a standard scale (ISO 5455) that fits 150 x 110 mm
  const fit = Math.min(130 / Math.max(1, f.bbox.l), 105 / Math.max(1, f.bbox.b));
  const scales = [2, 1, 0.5, 0.4, 0.25, 0.2, 0.1, 0.05, 0.04, 0.025, 0.02, 0.01];
  const k = scales.find((s) => s <= fit) ?? fit;
  const ox = 22, oy = 36;
  const X = (x: number) => ox + x * k, Y = (y: number) => oy + (f.bbox.b - y) * k;
  p.poly(loopPts(f.buiten).map((q) => [X(q.x), Y(q.y)] as [number, number]), { closed: true, stroke: [0, 0, 0], w: 0.35 });
  for (const l of f.binnen) p.poly(loopPts(l).map((q) => [X(q.x), Y(q.y)] as [number, number]), { closed: true, stroke: [0, 0, 0], w: 0.25 });
  for (const g of f.gaten) p.circle(X(g.c.x), Y(g.c.y), g.r * k, { stroke: [0, 0, 0], w: 0.25 });
  // the bend lines: dash-dot thin lines (ISO 128), green up and red down, numbered after the chain
  for (const b of f.plooien) {
    p.line(X(b.a.x), Y(b.a.y), X(b.b.x), Y(b.b.y), { w: 0.25, color: b.richting === 'op' ? [0, 0.5, 0] : [0.8, 0, 0], dash: [3, 0.8, 0.5, 0.8] });
    p.text(X(b.a.x) + 1, Y(b.a.y) - 1, `${b.id ?? ''}`, { size: 9, bold: true });
  }
  // the positions of the bend lines from edge a (the stop dimensions), as running dimensions under the flat
  if (bends.length && f.plooien.length) {
    const l0 = f.plooien[0];
    const vertical = Math.abs(l0.b.x - l0.a.x) < Math.abs(l0.b.y - l0.a.y);
    const yDim = Y(0) + 7;
    const xDim = X(f.bbox.l) + 7;
    for (const b of bends) {
      const pos = b.s;
      if (vertical) { p.line(X(pos), Y(0) + 1, X(pos), yDim + 1, { w: 0.15 }); p.text(X(pos), yDim + 4, num(pos, 1), { size: 7, align: 'center' }); }
      else { p.line(X(f.bbox.l) + 1, Y(pos), xDim + 1, Y(pos), { w: 0.15 }); p.text(xDim + 2, Y(pos) + 1, num(pos, 1), { size: 7 }); }
    }
    if (vertical) { p.text(X(0) - 2, yDim + 4, 'a', { size: 9, bold: true, align: 'right' }); p.text(X(f.bbox.l) + 2, yDim + 4, 'b', { size: 9, bold: true }); }
    else { p.text(xDim + 2, Y(0) + 4, 'a', { size: 9, bold: true }); p.text(xDim + 2, Y(f.bbox.b) - 2, 'b', { size: 9, bold: true }); }
  }
  p.text(22, oy - 3, `Schaal ${k >= 1 ? `${num(k, 0)}:1` : `1:${num(1 / k, 0)}`} · maten in mm vanaf rand a · uitslag ${num(f.bbox.l, 1)} x ${num(f.bbox.b, 1)}`, { size: 7.5 });
  p.line(22, 152, 30, 152, { w: 0.4, color: [0, 0.5, 0], dash: [3, 0.8, 0.5, 0.8] }); p.text(32, 153, 'plooi op (naar de kijker)', { size: 7.5 });
  p.line(80, 152, 88, 152, { w: 0.4, color: [0.8, 0, 0], dash: [3, 0.8, 0.5, 0.8] }); p.text(90, 153, 'plooi neer', { size: 7.5 });
  const K = NL.plooiKop;
  const cols = [{ t: K[0], w: 8 }, { t: K[1], w: 9 }, { t: K[2], w: 21 }, { t: K[3], w: 9, right: true }, { t: K[4], w: 17, right: true }, { t: K[5], w: 15, right: true },
    { t: K[6], w: 15, right: true }, { t: K[7], w: 8 }, { t: K[8], w: 16, right: true }];
  const rows = steps.map((s) => { const b = bends.find((x) => x.id === s.plooi)!; return [String(s.stap), String(s.plooi), `${b.richting}${s.omkeren ? ' (omkeren)' : ''}`, `${num(b.hoek, 0)}°`,
    `${num(f.plooien[0]?.r ?? 0, 1)} mm`, `${num(s.vOpening, 0)} mm`, `${num(s.aanslag, 1)} mm`, s.aanslagKant, `${num(s.perskracht, 1)} kN`]; });
  const tp = { p: shifted(p, 176) };
  table(doc, tp, 40, cols, rows, () => 30);
  let y = 158;
  p.text(22, y, NL.kBron(f.kBron ?? 'het model'), { size: 8 });
  p.text(22, y + 4.5, prismatic ? NL.beperkt : NL.nietBotsing, { size: 8, bold: !prismatic });
  if (botsing.length) p.text(22, y + 9, `Botsing in stap ${botsing.join(', ')}: kies een andere volgorde.`, { size: 8, bold: true, color: [0.8, 0.1, 0.1] });
  y += botsing.length ? 13.5 : 9;
  // the findings left of the title block (it starts at x 115)
  const short = (c: string) => (textWidth(c, 7) > 88 ? `${c.slice(0, 62)}…` : c);
  checks.slice(0, 4).forEach((c, i) => p.text(22, y + 3.6 * i, short(c), { size: 7, color: [0.7, 0.3, 0] }));
  if (checks.length > 4) p.text(22, y + 14.4, `en ${checks.length - 4} meldingen meer (zie Bend Check)`, { size: 7, color: [0.7, 0.3, 0] });
  footer(doc, m, NL.plooiblad);
  return doc.save();
}

/** a page whose table drawing is moved to the right (the bend table beside the flat) */
function shifted(p: PdfPage, dx: number): PdfPage {
  return {
    text: (x: number, y: number, s: string, o?: Parameters<PdfPage['text']>[3]) => p.text(x + dx - 12, y, s, o),
    rect: (x: number, y: number, w: number, h: number, o?: Parameters<PdfPage['rect']>[4]) => p.rect(x + dx - 12, y, w, h, o),
    line: (x1: number, y1: number, x2: number, y2: number, o?: Parameters<PdfPage['line']>[4]) => p.line(x1 + dx - 12, y1, x2 + dx - 12, y2, o),
  } as PdfPage;
}

export interface WeldView { key: string; lo: [number, number, number]; hi: [number, number, number] }

/**
 * The weld plan (A4 landscape): a view of the construction with the numbered joints, the table with the positions of
 * the saw list and the ISO 2553 symbol per joint, the execution class and its warning, the remark about the rules.
 */
export function weldPlanPdf(joints0: WeldJoint[], steps: WeldStep[], exc: ExecutionClass, m: SheetMeta, naam: (key: string) => string, view: WeldView[] = []): Uint8Array {
  const joints = joints0.filter((j) => j.status !== 'vervallen');
  const doc = new PdfDoc(297, 210, `${NL.lasplan} ${m.model}`);
  const pg = { p: doc.page() };
  const status = exc === 'geen' ? 'Uitvoeringsklasse: niet opgegeven' : `Uitvoeringsklasse ${exc}`;
  frame(doc, pg.p, m, NL.lasplan, status);
  // the view: the two largest directions of the construction, each body as its box, each joint as a numbered balloon
  let yTable = 32;
  if (view.length && joints.some((j) => j.punt)) {
    const lo = [0, 1, 2].map((i) => Math.min(...view.map((v) => v.lo[i]))), hi = [0, 1, 2].map((i) => Math.max(...view.map((v) => v.hi[i])));
    const ext = [0, 1, 2].map((i) => hi[i] - lo[i]);
    const [ax, ay] = [0, 1, 2].sort((a, b) => ext[b] - ext[a]).slice(0, 2).sort((a, b) => a - b);
    const k = Math.min(120 / Math.max(1, ext[ax]), 60 / Math.max(1, ext[ay]));
    const X = (v: number) => 20 + (v - lo[ax]) * k, Y = (v: number) => 30 + 62 - (v - lo[ay]) * k;
    for (const v of view) pg.p.rect(X(v.lo[ax]), Y(v.hi[ay]), (v.hi[ax] - v.lo[ax]) * k, (v.hi[ay] - v.lo[ay]) * k, { stroke: [0.3, 0.3, 0.3], w: 0.2, fill: [0.95, 0.95, 0.95] });
    for (const j of joints) {
      if (!j.punt) continue;
      const cx = X(j.punt[ax]), cy = Y(j.punt[ay]);
      pg.p.circle(cx, cy, 2.6, { stroke: [0.1, 0.2, 0.6], w: 0.25, fill: [1, 1, 1] });
      pg.p.text(cx, cy + 1, String(j.stap), { size: 6.5, align: 'center', bold: true });
    }
    pg.p.text(20, 98, 'Aanzicht met de lassen genummerd volgens de kolom Stap (schets, niet op schaal)', { size: 7, color: GREY });
    yTable = 106;
  }
  const newPage = () => { pg.p = doc.page(); frame(doc, pg.p, m, NL.lasplan, status); return 30; };
  const K = NL.lasKop;
  const cols = [{ t: K[0], w: 11 }, { t: K[1], w: 10, right: true }, { t: K[2], w: 40 }, { t: K[3], w: 16 }, { t: K[4], w: 12 }, { t: K[5], w: 14, right: true }, { t: K[6], w: 13 },
    { t: K[7], w: 13 }, { t: K[8], w: 12 }, { t: 'Symbool (ISO 2553 A)', w: 70 }, { t: K[9], w: 40 }];
  const sorted = [...joints].sort((a, b) => a.stap - b.stap);
  const rows = sorted.map((j) => [j.id, String(j.stap), `${naam(j.bodies[0])} / ${naam(j.bodies[1])}`.slice(0, 28), j.soort, `${j.maat.letter}${num(j.maat.mm, j.maat.mm % 1 ? 1 : 0)}`,
    mm(j.lengte), j.proces, j.positie, j.niveau, '', `${j.bevestigd ? '' : 'voorstel'}${j.status ? ` ${j.status}` : ''}`.trim()]);
  // the symbol rows are taller: draw the table row by row with the symbol in its cell
  const x0 = 12, rowH = 12;
  const head = (yy: number) => {
    pg.p.rect(x0, yy - 4, cols.reduce((t, c) => t + c.w, 0), 5.6, { fill: LIGHT });
    let x = x0;
    for (const c of cols) { pg.p.text(c.right ? x + c.w - 1.5 : x + 1, yy, c.t, { size: 7.5, bold: true, align: c.right ? 'right' : 'left' }); x += c.w; }
    return yy + 6;
  };
  let y = head(yTable);
  sorted.forEach((j, r) => {
    if (y + rowH > doc.height - 34) y = head(newPage());
    let x = x0;
    rows[r].forEach((v, i) => { const c = cols[i]; pg.p.text(c.right ? x + c.w - 1.5 : x + 1, y + 3, v, { size: 7.5, align: c.right ? 'right' : 'left' }); x += c.w; });
    const sx = x0 + cols.slice(0, 9).reduce((t, c) => t + c.w, 0) + 12;
    drawWeldSymbol(pg.p, sx, y + 4, j, 0.8);
    y += rowH;
    pg.p.line(x0, y - 2, x0 + cols.reduce((t, c) => t + c.w, 0), y - 2, { w: 0.08, color: [0.85, 0.85, 0.85] });
  });
  if (y > doc.height - 58) y = newPage();
  const tack = steps.find((s) => s.soort === 'hechten');
  if (tack) { pg.p.text(12, y + 2, `Stap 1: hechten (${tack.joints.join(', ')}), dan aflassen in de volgorde van de kolom Stap.`, { size: 8 }); y += 5; }
  const long = steps.filter((s) => (s.stukken ?? 1) > 1);
  if (long.length) { pg.p.text(12, y + 2, `Terugstapmethode: ${long.map((s) => `stap ${s.stap} in ${s.stukken} stukken`).join(', ')}.`, { size: 8 }); y += 5; }
  pg.p.text(12, y + 2, NL.lasVoorstel, { size: 8 });
  const w = excDefaults(exc).waarschuwing;
  if (w) pg.p.text(12, y + 8, w, { size: 9, bold: true, color: [0.75, 0.1, 0.1] });
  pg.p.text(12, y + 14, NL.toleranties, { size: 8 });
  footer(doc, m, NL.lasplan);
  return doc.save();
}

/** the eight example symbols of L3.3 on one sheet, for the comparison with the norm */
export function weldSymbolsPdf(m: SheetMeta): Uint8Array {
  const doc = new PdfDoc(297, 210, 'Lassymbolen ISO 2553');
  const p = doc.page();
  frame(doc, p, m, 'Lassymbolen ISO 2553 systeem A (voorbeelden)', 'ter vergelijking met de norm');
  SYMBOL_EXAMPLES.forEach((e, i) => {
    const x = 30 + (i % 2) * 130, y = 50 + Math.floor(i / 2) * 32;
    p.text(x - 10, y - 10, `${i + 1}. ${e.naam}`, { size: 8, bold: true });
    drawWeldSymbol(p, x, y, e.j, 1.3);
  });
  footer(doc, m, 'Lassymbolen');
  return doc.save();
}
