/**
 * The quote (docs/36 O-1 to O-10, 6.4): two views of the same data. Ian sees cost price, margin, sources and
 * assumptions; the customer sees lines with a price excluding VAT, the VAT per rate and the total including VAT, and
 * never the cost price, the margin, the sources or the word AANNAME.
 *
 * VAT (te verifiëren met de boekhouder): the rate is a choice per line, 21 % by default; 6 % only with the three
 * conditions ticked (house older than 10 years, private use, placed and invoiced directly to the end user) and only on
 * a quote with a placing line; the program never decides the rate. VAT is computed per rate on the sum of the base,
 * rounded to the cent. Regime "verlegd": no VAT amount, the legal note; "vrijgesteld": no VAT column, the legal note.
 * Numbering: per year (2026-001), settable prefix, never twice the same number, no gaps from a cancelled dialog (the
 * number is taken only when the export is written).
 */
import type { CostLine, Customer, Quote, QuoteLine, VatRate, VatRegime } from './types';
import type { CostModel } from './cost';
import { COST_GROUPS } from './cost';
import type { FabSettings } from './settings';
import { addDays, toCent } from './format';
import { validEnterpriseNumber } from './settings';

export interface VatTotals { perTarief: { tarief: VatRate; maatstafCent: number; btwCent: number }[]; exclCent: number; btwCent: number; inclCent: number }

export function vatTotals(lines: QuoteLine[], regime: VatRegime): VatTotals {
  const excl = lines.reduce((t, l) => t + lineTotal(l), 0);
  if (regime !== 'normaal') return { perTarief: [], exclCent: excl, btwCent: 0, inclCent: excl };
  const rates = [...new Set(lines.map((l) => l.btw))].sort((a, b) => b - a);
  const perTarief = rates.map((tarief) => {
    const maatstafCent = lines.filter((l) => l.btw === tarief).reduce((t, l) => t + lineTotal(l), 0);
    return { tarief, maatstafCent, btwCent: toCent((maatstafCent * tarief) / 100 / 100) };
  });
  const btw = perTarief.reduce((t, x) => t + x.btwCent, 0);
  return { perTarief, exclCent: excl, btwCent: btw, inclCent: excl + btw };
}

/** a quote line amount: quantity x unit price, rounded once */
export const lineTotal = (l: QuoteLine) => toCent((l.hoeveelheid * l.prijsCent) / 100);

/** the form of a VAT number of another EU member state (country code + 2 to 13 letters or digits); BE is checked by mod 97 */
export function foreignVat(nr: string): boolean {
  const n = nr.toUpperCase().replace(/[\s.\-]/g, '');
  return /^(AT|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI)[0-9A-Z]{2,13}$/.test(n) && /\d{2}/.test(n);
}

/** the problems that block or warn about a quote: 6 % without the conditions, 6 % without placing */
export function vatProblems(q: Pick<Quote, 'regels' | 'klant' | 'btwRegime'>): { blokkeert: boolean; tekst: string }[] {
  const out: { blokkeert: boolean; tekst: string }[] = [];
  // reverse charge only to a company with a valid VAT number (docs/37 B-13)
  if (q.btwRegime === 'verlegd') {
    const nr = q.klant.btwNummer ?? '';
    // a VAT number of another EU country: its form is checked here, its validity only in VIES (docs/37 N-8)
    if (q.klant.soort === 'bedrijf' && !validEnterpriseNumber(nr) && foreignVat(nr)) {
      out.push({ blokkeert: false, tekst: `Buitenlands btw-nummer ${nr}: controleer het in VIES; vermelding "Btw verlegd, art. 196 Richtlijn 2006/112/EG". Na te lezen met de boekhouder.` });
    } else if (q.klant.soort !== 'bedrijf' || !validEnterpriseNumber(nr)) {
      out.push({ blokkeert: true, tekst: 'Btw verlegd kan alleen voor een btw-plichtige klant met een geldig btw-nummer.' });
    }
  }
  if (q.btwRegime !== 'normaal') return out;
  const six = q.regels.filter((l) => l.btw === 6);
  if (!six.length) return out;
  const c = q.klant.zesProcent;
  if (!c || !c.woningOuderDan10 || !c.prive || !c.geplaatstEindgebruiker) out.push({ blokkeert: true,
    tekst: '6 % btw kan alleen met de drie voorwaarden aangevinkt (woning ouder dan 10 jaar, privégebruik, geplaatst en rechtstreeks aan de eindgebruiker gefactureerd).' });
  if (q.klant.soort !== 'particulier') out.push({ blokkeert: true, tekst: '6 % btw geldt alleen voor een particuliere eindgebruiker.' });
  // docs/36 6.4: the program does not allow 6 % on a quote without placing (docs/37 B-13)
  if (!q.regels.some((l) => l.plaatsing)) out.push({ blokkeert: true, tekst: '6 % btw op een offerte zonder plaatsingsregel: alleen leveren is 21 %.' });
  return out;
}

/** set the rate of a line; 6 % is refused unless the conditions are ticked (O2.4) */
export function setRate(q: Quote, i: number, btw: VatRate): Quote | { fout: string } {
  if (btw === 6) {
    const c = q.klant.zesProcent;
    if (!c || !c.woningOuderDan10 || !c.prive || !c.geplaatstEindgebruiker) return { fout: 'Vink eerst de drie voorwaarden voor 6 % aan bij de klant.' };
  }
  return { ...q, regels: q.regels.map((l, k) => (k === i ? { ...l, btw } : l)) };
}

export type Grouping = 'een' | 'categorie' | 'detail';

const GROUP_NL: Record<string, string> = { Material: 'Materiaal', Operations: 'Werkplaats (zagen, snijden, plooien, lassen)', Finishing: 'Afwerking', Overhead: 'Transport en verpakking' };

/** the amount of a cost line per piece in a series of q: set-up lines shared over the series (docs/37 B-5) */
export const perPieceCent = (l: CostLine, q: number) => (l.instel ? l.bedragCent / Math.max(1, q) : l.bedragCent);

/**
 * Quote lines from the cost model for a series of q pieces, with the margin (sale = cost x (1 + margin)) spread over the
 * lines, so no line shows the cost price. The unit price is the price per piece of that series, the same number as the
 * Cost panel (docs/37 B-5). Free lines (placing, a discount) keep their own amount, without margin, also when negative
 * (B-7). The text of a line never names a source or an assumption.
 */
export function quoteLines(m: CostModel, marge: number, group: Grouping, onderwerp: string, qty = 1): QuoteLine[] {
  const f = 1 + marge / 100, q = Math.max(1, qty);
  const priced = m.regels.filter((l) => l.categorie !== 'vrij' && l.bedragCent > 0);
  const free = m.regels.filter((l) => l.categorie === 'vrij' && !l.geenPrijs && l.bedragCent !== 0);
  const sell = (ls: CostLine[]) => toCent((ls.reduce((t, l) => t + perPieceCent(l, q), 0) * f) / 100);
  const extra: QuoteLine[] = free.map((l) => ({ omschrijving: l.omschrijving, hoeveelheid: 1, eenheid: 'st', prijsCent: l.bedragCent, btw: 21 as VatRate, uit: [l.id] }));
  if (!priced.length) return extra;
  if (group === 'een') return [{ omschrijving: onderwerp || 'Constructie volgens tekening', hoeveelheid: q, eenheid: 'st', prijsCent: sell(priced), btw: 21, uit: priced.map((l) => l.id) }, ...extra];
  if (group === 'categorie') {
    return [...COST_GROUPS.map((g) => ({ g, ls: priced.filter((l) => g.cats.includes(l.categorie)) })).filter((x) => x.ls.length)
      .map((x) => ({ omschrijving: GROUP_NL[x.g.naam] ?? x.g.naam, hoeveelheid: q, eenheid: 'st', prijsCent: sell(x.ls), btw: 21 as VatRate, uit: x.ls.map((l) => l.id) })), ...extra];
  }
  return [...priced.map((l) => ({ omschrijving: customerText(l), hoeveelheid: q, eenheid: 'st', prijsCent: sell([l]), btw: 21 as VatRate, uit: [l.id] })), ...extra];
}

/** the sale price per piece of a series (excl. VAT, rounded to the cent): what the Cost panel shows and the quote charges */
export function salePerPiece(m: CostModel, marge: number, q: number, group: Grouping = 'een'): number {
  // the sum of the lines of the grouping the quote uses, each rounded as on the quote (docs/37 N-4): panel x series = quote
  const free = new Set(m.regels.filter((l) => l.categorie === 'vrij').map((l) => l.id));
  return quoteLines(m, marge, group, '', q).filter((l) => !(l.uit ?? []).some((id) => free.has(id))).reduce((t, l) => t + l.prijsCent, 0);
}

/** the customer text of a cost line: the words for the workshop (afval %, verbruikt, uurloon) left out */
export function customerText(l: CostLine): string {
  return l.omschrijving.replace(/\s*\((verbruikt|aangekocht[^)]*|omschreven rechthoek[^)]*)\)/g, '').replace(/\s*\+\s*\d+(,\d+)?\s*%\s*afval/g, '').replace(/\buurloon\b/gi, '').trim();
}

/**
 * The next number: per year, with the prefix, never twice (docs/37 B-6): above the counter and above every number of
 * that year already used in the document, so neither a reset nor an older settings file brings a number back.
 */
export function nextNumber(s: FabSettings, isoDate: string, used: string[] = [], teller?: { jaar: number; laatste: number }): { nummer: string; teller: FabSettings['quote']['teller'] } {
  const jaar = Number(isoDate.slice(0, 4));
  const fromDoc = used.map((x) => new RegExp(`${jaar}-(\\d+)$`).exec(x)).filter(Boolean).map((m) => Number(m![1]));
  const counters = [s.quote.teller, teller].filter((t): t is { jaar: number; laatste: number } => !!t && t.jaar === jaar).map((t) => t.laatste);
  const laatste = Math.max(0, ...counters, ...fromDoc);
  const n = laatste + 1;
  return { nummer: `${s.quote.voorvoegsel}${jaar}-${String(n).padStart(3, '0')}`, teller: { jaar, laatste: n } };
}

/** the next revision letter of a frozen quote: A, B, C, ... */
export function nextRevision(r: string): string {
  // A … Z, then AA, AB … (never "[" after Z)
  if (!r) return 'A';
  const last = r[r.length - 1];
  if (last !== 'Z') return r.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
  return `${r.length === 1 ? 'A' : nextRevision(r.slice(0, -1))}A`;
}

export function newQuote(id: string, klant: Customer, regels: QuoteLine[], s: FabSettings, isoDate: string, onderwerp: string): Quote {
  return {
    id, nummer: '', revisie: 'A', datum: isoDate, geldigTot: addDays(isoDate, s.quote.geldigDagen), klant, onderwerp, regels,
    btwRegime: s.rates.btwRegime, voorwaarden: s.quote.voorwaarden, betaling: s.quote.betaling, levertermijn: s.quote.levertermijn,
  };
}

/** words that must never reach the customer (O2.6) */
/** the note on the quote with a 6 % line (docs/36 6.4, to be checked with the accountant) */
export const SIX_NOTE = 'Btw 6 %: werk in onroerende staat aan een privéwoning die minstens 10 jaar in gebruik is, geplaatst en rechtstreeks aan de eindgebruiker'
  + ' gefactureerd. De klant staat in voor de juistheid van deze gegevens.';

export const FORBIDDEN_FOR_CUSTOMER = ['AANNAME', 'marge', 'kostprijs', 'bron', 'uurloon'];
