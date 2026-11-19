/**
 * The quote as a PDF, A4 portrait (docs/36 6.4): head with name or logo and OFFERTE, number, date, valid until; sender
 * and customer blocks; subject; the table (Pos, Omschrijving, Aantal, Eenheid, Eenheidsprijs, Btw %, Bedrag excl. btw)
 * with its head repeated on every page; totals per VAT rate (never on a page apart from the last lines); lead time,
 * payment, validity, terms; "voor akkoord"; a footer with the company data and "pagina x van y" on every page.
 * While a mandatory company field is empty every page carries the watermark ONTWERP and the line about the missing
 * data, and the empty fields show their placeholders literally. Nothing is sent: this makes a file.
 */
import type { Quote } from './types';
import type { Company } from './settings';
import { companyMissing, formatEnterpriseNumber } from './settings';
import { PdfDoc, textWidth, type PdfPage } from './pdf';
import { date, euro, num } from './format';
import { lineTotal, vatTotals } from './quote';

export const PLACEHOLDERS = {
  naam: '[BEDRIJFSNAAM]', rechtsvorm: '[EENMANSZAAK / BV]', adres: '[STRAAT NR, POSTCODE GEMEENTE]', ondernemingsnummer: '[BTW BE 0___.___.___]',
  rpr: '[RPR + RECHTBANK]', iban: '[IBAN BE__ ____ ____ ____]', telefoon: '[TELEFOON]', email: '[E-MAIL]',
};
export const DRAFT_LINE = 'Geen geldige offerte: ondernemingsgegevens ontbreken';

const GREY: [number, number, number] = [0.45, 0.45, 0.45];
const LIGHT: [number, number, number] = [0.93, 0.93, 0.93];

function companyLines(c: Company): { naam: string; regels: string[]; voet: string } {
  const v = (x: string, ph: string) => x.trim() || ph;
  const btw = c.ondernemingsnummer.trim() ? `${c.btwPlichtig ? 'BTW ' : 'Ondernemingsnummer '}${formatEnterpriseNumber(c.ondernemingsnummer)}` : PLACEHOLDERS.ondernemingsnummer;
  const rpr = /\b(BV|NV|CV|CommV|SRL|SA)\b/i.test(c.rechtsvorm) || !c.rechtsvorm.trim() ? v(c.rpr, PLACEHOLDERS.rpr) : '';
  const naam = `${v(c.naam, PLACEHOLDERS.naam)} ${v(c.rechtsvorm, PLACEHOLDERS.rechtsvorm)}`;
  const regels = [v(c.adres, PLACEHOLDERS.adres), btw, ...(rpr ? [rpr] : []), v(c.iban, PLACEHOLDERS.iban), `${v(c.telefoon, PLACEHOLDERS.telefoon)} · ${v(c.email, PLACEHOLDERS.email)}`];
  return { naam, regels, voet: [naam, v(c.adres, PLACEHOLDERS.adres), btw, rpr, v(c.iban, PLACEHOLDERS.iban)].filter(Boolean).join(' · ') };
}

export interface QuotePdfOptions { company: Company; verlegdTekst: string; vrijgesteldTekst: string; image?: { jpeg: Uint8Array; w: number; h: number } }

export function quotePdf(q: Quote, o: QuotePdfOptions): Uint8Array {
  return quoteDoc(q, o).save();
}

/** the quote as pages (the preview draws the same pages, O2.9) */
export function quoteDoc(q: Quote, o: QuotePdfOptions): PdfDoc {
  const doc = new PdfDoc(210, 297, `Offerte ${q.nummer || 'ontwerp'}`);
  const missing = companyMissing(o.company);
  const draft = missing.length > 0;
  const comp = companyLines(o.company);
  const noVat = q.btwRegime === 'vrijgesteld';
  const L = 18, R = 192;
  // the table columns (right edges for the numbers)
  const cols = noVat
    ? { pos: L, oms: L + 10, aantal: 128, eenh: 132, prijs: 165, btw: 0, bedrag: R }
    : { pos: L, oms: L + 10, aantal: 118, eenh: 121, prijs: 152, btw: 164, bedrag: R };
  const omsWidth = cols.aantal - cols.oms - 14;
  const head = (p: PdfPage, y: number) => {
    p.rect(L, y - 4.2, R - L, 6, { fill: LIGHT });
    p.text(cols.pos, y, 'Pos', { bold: true, size: 8 });
    p.text(cols.oms, y, 'Omschrijving', { bold: true, size: 8 });
    p.text(cols.aantal, y, 'Aantal', { bold: true, size: 8, align: 'right' });
    p.text(cols.eenh, y, 'Eenheid', { bold: true, size: 8 });
    p.text(cols.prijs, y, 'Eenheidsprijs', { bold: true, size: 8, align: 'right' });
    if (!noVat) p.text(cols.btw, y, 'Btw %', { bold: true, size: 8, align: 'right' });
    p.text(cols.bedrag, y, 'Bedrag excl. btw', { bold: true, size: 8, align: 'right' });
    return y + 6;
  };
  // wrap a description into lines that fit the column
  const rows = q.regels.map((l, i) => ({ l, i, lines: wrapAt(l.omschrijving, 8.5, omsWidth) }));
  const rowH = (r: (typeof rows)[number]) => 4.6 * r.lines.length + 1.2;
  const totals = vatTotals(q.regels, q.btwRegime);
  const totalsH = 14 + 5 * Math.max(1, totals.perTarief.length * 2) + (q.btwRegime === 'normaal' ? 0 : 10);
  const BOTTOM = 262;
  // page 1 head
  const pages: PdfPage[] = [];
  const newPage = () => { const p = doc.page(); pages.push(p); return p; };
  let p = newPage();
  p.text(L, 24, comp.naam, { bold: true, size: 15 });
  p.text(R, 22, 'OFFERTE', { bold: true, size: 20, align: 'right' });
  p.text(R, 29, `Nummer ${q.nummer || '(nog geen nummer)'}${q.revisie && q.revisie !== 'A' ? ` rev. ${q.revisie}` : ''}`, { size: 9, align: 'right' });
  p.text(R, 34, `Datum ${date(q.datum)}`, { size: 9, align: 'right' });
  p.text(R, 39, `Geldig tot ${date(q.geldigTot)}`, { size: 9, align: 'right' });
  comp.regels.forEach((t, k) => p.text(L, 31 + 4.4 * k, t, { size: 8.5, color: GREY }));
  // customer block
  const ky = 60;
  p.rect(112, ky - 5, R - 112, 30, { stroke: [0.7, 0.7, 0.7], w: 0.2 });
  p.text(115, ky, 'Klant', { bold: true, size: 8, color: GREY });
  const klant = [q.klant.naam || '[KLANT]', ...q.klant.adres.split('\n'), ...(q.klant.soort === 'bedrijf' && q.klant.btwNummer ? [`BTW ${formatEnterpriseNumber(q.klant.btwNummer)}`] : [])];
  klant.slice(0, 5).forEach((t, k) => p.text(115, ky + 5 + 4.4 * k, t, { size: 9, bold: k === 0 }));
  if (q.klant.werfadres && q.klant.werfadres.trim() && q.klant.werfadres.trim() !== q.klant.adres.trim()) {
    p.text(L, ky, 'Werfadres', { bold: true, size: 8, color: GREY });
    q.klant.werfadres.split('\n').slice(0, 4).forEach((t, k) => p.text(L, ky + 5 + 4.4 * k, t, { size: 9 }));
  }
  let y = 98;
  p.text(L, y, q.onderwerp || 'Offerte', { bold: true, size: 12 });
  y += 4;
  if (q.configuratie) { p.text(L, y + 2, `Configuratie: ${q.configuratie}`, { size: 8, color: GREY }); y += 4; }
  if (o.image) {
    const w = 60, h = (60 * o.image.h) / o.image.w;
    p.jpeg(o.image.jpeg, o.image.w, o.image.h, R - w, y, w, h);
    y += h + 4;
  }
  y = head(p, y + 6);
  // rows; the totals stay with the last rows (O2.8)
  let firstOnPage = true;
  rows.forEach((r, k) => {
    const restIncl = rows.slice(k).reduce((t, x) => t + rowH(x), 0);
    const keepWithTotals = rows.length - k <= 2 && y + restIncl + totalsH > BOTTOM && !firstOnPage;
    if (y + rowH(r) > BOTTOM || keepWithTotals) {
      p = newPage();
      y = head(p, 30);
    }
    firstOnPage = false;
    p.text(cols.pos, y, String(r.i + 1), { size: 8.5 });
    r.lines.forEach((t, j) => p.text(cols.oms, y + 4.6 * j, t, { size: 8.5 }));
    p.text(cols.aantal, y, num(r.l.hoeveelheid, Number.isInteger(r.l.hoeveelheid) ? 0 : 2), { size: 8.5, align: 'right' });
    p.text(cols.eenh, y, r.l.eenheid, { size: 8.5 });
    p.text(cols.prijs, y, euro(r.l.prijsCent), { size: 8.5, align: 'right' });
    if (!noVat) p.text(cols.btw, y, q.btwRegime === 'verlegd' ? 'verlegd' : `${r.l.btw} %`, { size: 8.5, align: 'right' });
    p.text(cols.bedrag, y, euro(lineTotal(r.l)), { size: 8.5, align: 'right' });
    y += rowH(r);
    p.line(L, y - 3.4, R, y - 3.4, { w: 0.1, color: [0.85, 0.85, 0.85] });
  });
  if (y + totalsH > BOTTOM) { p = newPage(); y = 30; }
  // totals
  y += 3;
  const tl = 120;
  const tot = (label: string, v: string, bold = false) => { p.text(tl, y, label, { size: 9, bold }); p.text(R, y, v, { size: 9, bold, align: 'right' }); y += 5; };
  tot('Subtotaal excl. btw', euro(totals.exclCent));
  if (q.btwRegime === 'normaal') {
    for (const t of totals.perTarief) { tot(`Maatstaf ${t.tarief} %`, euro(t.maatstafCent)); tot(`Btw ${t.tarief} %`, euro(t.btwCent)); }
    p.line(tl, y - 3.5, R, y - 3.5, { w: 0.3 });
    tot('Totaal incl. btw', euro(totals.inclCent), true);
  } else {
    p.line(tl, y - 3.5, R, y - 3.5, { w: 0.3 });
    tot('Totaal', euro(totals.inclCent), true);
    y += 1;
    for (const t of wrapAt(q.btwRegime === 'verlegd' ? `Btw verlegd. ${o.verlegdTekst}` : o.vrijgesteldTekst, 9, R - L)) { p.text(L, y, t, { size: 8.5 }); y += 4.4; }
  }
  // conditions block
  const block = (title: string, text: string) => {
    const lines = text.split('\n').flatMap((t) => wrapAt(t, 8.5, R - L));
    if (y + 6 + 4.2 * lines.length > BOTTOM) { p = newPage(); y = 30; }
    y += 3;
    p.text(L, y, title, { bold: true, size: 9 });
    y += 4.6;
    for (const t of lines) { p.text(L, y, t, { size: 8.5 }); y += 4.2; }
  };
  block('Leveringstermijn', q.levertermijn);
  block('Betaling', q.betaling);
  block('Geldigheid', `Deze offerte is geldig tot ${date(q.geldigTot)}.`);
  block('Voorwaarden', q.voorwaarden);
  if (y + 32 > BOTTOM) { p = newPage(); y = 30; }
  y += 6;
  p.rect(L, y, 85, 26, { stroke: [0.6, 0.6, 0.6], w: 0.2 });
  p.text(L + 3, y + 5, 'Voor akkoord (naam, datum, handtekening)', { bold: true, size: 8.5 });
  // every page: footer, page number, draft mark
  pages.forEach((pg, k) => {
    pg.line(L, 280, R, 280, { w: 0.2, color: [0.6, 0.6, 0.6] });
    for (const [j, t] of wrapAt(comp.voet, 7, R - L - 30).entries()) pg.text(L, 284 + 3.4 * j, t, { size: 7, color: GREY });
    pg.text(R, 284, `pagina ${k + 1} van ${pages.length}`, { size: 7, color: GREY, align: 'right' });
    if (draft) {
      pg.text(105, 175, 'ONTWERP', { size: 110, bold: true, color: [0.88, 0.88, 0.88], align: 'center', angle: 45 });
      pg.text(105, 274, DRAFT_LINE, { size: 9, bold: true, color: [0.75, 0.1, 0.1], align: 'center' });
    }
  });
  // the watermark is drawn last on top of the content; move it under by putting its ops first
  if (draft) for (const pg of pages) { const wm = pg.ops.splice(pg.ops.length - 2, 1); pg.ops.unshift(...wm); }
  return doc;
}

function wrapAt(s: string, size: number, width: number): string[] {
  const words = s.split(/\s+/).filter(Boolean), out: string[] = [];
  let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (textWidth(t, size) > width && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}
