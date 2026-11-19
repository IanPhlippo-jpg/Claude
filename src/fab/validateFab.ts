/**
 * The check of doc.fab when a file opens (docs/37 B-15), as validatePrint3d: numbers are numbers, amounts whole cents,
 * lists are lists, VAT rates and kinds from their lists. Returns what is wrong, or null.
 */
type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isCent = (v: unknown) => Number.isInteger(v) && Math.abs(v as number) < 1e12;
const isStr = (v: unknown) => typeof v === 'string';
const KINDS = ['profiel', 'plaat', 'gezette plaat', 'koop', 'onbekend'];
const RATES = [21, 6, 0];
const WELD_KINDS = ['hoeklas', 'I', 'V', 'HV', 'Y', 'X', 'prop'];

export function fabProblem(f: unknown): string | null {
  if (!isObj(f)) return 'no object';
  if (f.overrides !== undefined) {
    if (!isObj(f.overrides)) return 'overrides';
    for (const [k, o] of Object.entries(f.overrides)) if (!isObj(o) || !KINDS.includes(o.soort as string) || (o.t !== undefined && !isNum(o.t)) || (o.profielId !== undefined
      && !isStr(o.profielId))) return `override ${k}`;
  }
  if (f.kosten !== undefined) {
    if (!isObj(f.kosten)) return 'cost overrides';
    for (const [k, o] of Object.entries(f.kosten)) if (!isObj(o) || !isCent(o.bedragCent) || !isStr(o.reden)) return `cost override ${k}`;
  }
  if (f.vrij !== undefined && (!Array.isArray(f.vrij) || f.vrij.some((v) => !isObj(v) || !isStr(v.omschrijving) || !isCent(v.bedragCent)))) return 'free lines';
  if (f.welds !== undefined && (!Array.isArray(f.welds) || f.welds.some((w) => !isObj(w) || !isStr(w.id) || !Array.isArray(w.bodies) || w.bodies.length !== 2 || !isObj(w.maat)
    || !isNum((w.maat as Raw).mm) || !isNum(w.lengte) || !WELD_KINDS.includes(w.soort as string) || !['a', 'z', 's'].includes((w.maat as Raw).letter as string)
    || !isStr(w.proces) || !isStr(w.positie) || !['B', 'C', 'D'].includes(w.niveau as string) || !isNum(w.stap)))) return 'weld joints';
  if (f.exc !== undefined && !['geen', 'EXC1', 'EXC2', 'EXC3'].includes(f.exc as string)) return 'execution class';
  if (f.reeks !== undefined && (!Number.isInteger(f.reeks) || (f.reeks as number) < 1)) return 'series quantity';
  if (f.klant !== undefined && (!isObj(f.klant) || !isStr(f.klant.naam) || !isStr(f.klant.adres))) return 'customer';
  if (f.regelBtw !== undefined && (!isObj(f.regelBtw) || Object.values(f.regelBtw).some((v) => !isObj(v) || (v.btw !== undefined && !RATES.includes(v.btw as number))))) return 'VAT per line';
  if (f.quotes !== undefined) {
    if (!Array.isArray(f.quotes)) return 'quotes';
    for (const [i, q] of f.quotes.entries()) {
      if (!isObj(q) || !isStr(q.nummer) || !isStr(q.datum) || !isObj(q.klant) || !Array.isArray(q.regels)) return `quote ${i + 1}`;
      if (q.regels.some((l) => !isObj(l) || !isStr(l.omschrijving) || !isNum(l.hoeveelheid) || !isCent(l.prijsCent) || !RATES.includes(l.btw as number))) return `quote ${q.nummer}: lines`;
      // the frozen record (docs/37 N-8): its cost lines are what the quote rests on
      const b = q.bevroren;
      if (b !== undefined && (!isObj(b) || !isStr(b.op) || !isStr(b.hash) || !isNum(b.uurloon) || !Array.isArray(b.kostenregels)
        || b.kostenregels.some((l) => !isObj(l) || !isStr(l.id) || !isStr(l.omschrijving) || !isCent(l.bedragCent) || !isNum(l.hoeveelheid)))) return `quote ${q.nummer}: frozen record`;
    }
  }
  return null;
}
