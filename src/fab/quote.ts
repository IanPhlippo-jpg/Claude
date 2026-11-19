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

/** the problems that block or warn about a quote: 6 % without the conditions, 6 % without placing */
export function vatProblems(q: Pick<Quote, 'regels' | 'klant' | 'btwRegime'>): { blokkeert: boolean; tekst: string }[] {
  const out: { blokkeert: boolean; tekst: string }[] = [];
  if (q.btwRegime !== 'normaal') return out;
  const six = q.regels.filter((l) => l.btw === 6);
  if (!six.length) return out;
  const c = q.klant.zesProcent;
  if (!c || !c.woningOuderDan10 || !c.prive || !c.geplaatstEindgebruiker) out.push({ blokkeert: true,
    tekst: '6 % btw kan alleen met de drie voorwaarden aangevinkt (woning ouder dan 10 jaar, privégebruik, geplaatst en rechtstreeks aan de eindgebruiker gefactureerd).' });
  if (q.klant.soort !== 'particulier') out.push({ blokkeert: true, tekst: '6 % btw geldt alleen voor een particuliere eindgebruiker.' });
  if (!q.regels.some((l) => l.plaatsing)) out.push({ blokkeert: false, tekst: '6 % btw op een offerte zonder plaatsingsregel: alleen leveren is 21 %.' });
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

/**
 * Quote lines from the cost model with the margin (verkoop = kostprijs x (1 + marge)); the margin is spread over the
 * lines, so no line shows the cost price. The text of a line never names a source or an assumption.
 */
export function quoteLines(m: CostModel, marge: number, group: Grouping, onderwerp: string, qty = 1): QuoteLine[] {
  const f = 1 + marge / 100;
  const priced = m.regels.filter((l) => l.bedragCent > 0);
  const sell = (ls: CostLine[]) => toCent((ls.reduce((t, l) => t + l.bedragCent, 0) * f) / 100);
  if (group === 'een') return [{ omschrijving: onderwerp || 'Constructie volgens tekening', hoeveelheid: qty, eenheid: 'st', prijsCent: sell(priced), btw: 21, uit: priced.map((l) => l.id) }];
  if (group === 'categorie') {
    return COST_GROUPS.map((g) => ({ g, ls: priced.filter((l) => g.cats.includes(l.categorie)) })).filter((x) => x.ls.length)
      .map((x) => ({ omschrijving: GROUP_NL[x.g.naam] ?? x.g.naam, hoeveelheid: qty, eenheid: 'st', prijsCent: sell(x.ls), btw: 21 as VatRate, uit: x.ls.map((l) => l.id) }));
  }
  return priced.map((l) => ({ omschrijving: customerText(l), hoeveelheid: qty, eenheid: 'st', prijsCent: sell([l]), btw: 21 as VatRate, uit: [l.id] }));
}

/** the customer text of a cost line: the words for the workshop (afval %, verbruikt, uurloon) left out */
export function customerText(l: CostLine): string {
  return l.omschrijving.replace(/\s*\((verbruikt|aangekocht[^)]*|omschreven rechthoek[^)]*)\)/g, '').replace(/\s*\+\s*\d+(,\d+)?\s*%\s*afval/g, '').replace(/\buurloon\b/gi, '').trim();
}

/** the next number: per year, with the prefix, never twice (the counter is only raised on export) */
export function nextNumber(s: FabSettings, isoDate: string): { nummer: string; teller: FabSettings['quote']['teller'] } {
  const jaar = Number(isoDate.slice(0, 4));
  const laatste = s.quote.teller.jaar === jaar ? s.quote.teller.laatste : 0;
  const n = laatste + 1;
  return { nummer: `${s.quote.voorvoegsel}${jaar}-${String(n).padStart(3, '0')}`, teller: { jaar, laatste: n } };
}

/** the next revision letter of a frozen quote: A, B, C, ... */
export const nextRevision = (r: string) => String.fromCharCode((r || '@').charCodeAt(0) + 1);

export function newQuote(id: string, klant: Customer, regels: QuoteLine[], s: FabSettings, isoDate: string, onderwerp: string): Quote {
  return {
    id, nummer: '', revisie: 'A', datum: isoDate, geldigTot: addDays(isoDate, s.quote.geldigDagen), klant, onderwerp, regels,
    btwRegime: s.rates.btwRegime, voorwaarden: s.quote.voorwaarden, betaling: s.quote.betaling, levertermijn: s.quote.levertermijn,
  };
}

/** words that must never reach the customer (O2.6) */
export const FORBIDDEN_FOR_CUSTOMER = ['AANNAME', 'marge', 'kostprijs', 'bron', 'uurloon'];
