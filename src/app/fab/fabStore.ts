/**
 * The state of the three fabrication tabs (docs/36 W14: a store of its own, as the 3D Print store): the workshop
 * settings (per user, in local storage, never in the model), the last analysis of the model with the key of the model
 * it came from (a result of another model is out of date and blocks its export, F0-6), the open view and command.
 * Saving files goes through the desktop save dialog or a download; nothing is sent.
 */
import { create } from 'zustand';
import { useStore } from '../store';
import { saveFile } from '../print/printStore';
import type { Document } from '../../core/document/types';
import type { FabDocData } from '../../fab/types';
import { analyze, price, settingsKey, type FabResult } from '../../fab/analyze';
import { defaultSettings, exportSettings, importSettings, settingsFromStorage, type FabSettings } from '../../fab/settings';
import { geometryHash } from '../../fab/geom';
import { DXF_DEFAULTS, dxfFileName, plateDxf, type DxfOptions } from '../../fab/dxf';
import type { FlatPart } from '../../fab/flat';
import { plateChecks, blocksExport } from '../../fab/checks';
import { writeZip } from '../../core/document/zip';
import { writeBook } from '../../fab/xlsxBook';
import { sawListPdf, plateListPdf, nestPdf, bendSheetPdf, weldPlanPdf } from '../../fab/sheets';
import { nestRects, nestPieces, nestPiecesShape, nestDxf, validateNest, defaultNestSettings, type Nest, type NestSettings } from '../../fab/nest';
import { bendPlan } from '../../fab/bend';
import { activeJoints, proposeSequence as weldSequence } from '../../fab/weld';
import { weldPlanInput } from '../../fab/analyze';
import { quotePdf } from '../../fab/quotePdf';
import { lineTotal, newQuote, nextNumber, nextRevision, quoteLines, vatProblems, vatTotals, type Grouping } from '../../fab/quote';
import type { Quote } from '../../fab/types';
import { desktop } from '../desktop';
import { companyMissing } from '../../fab/settings';
import { today } from '../../fab/format';
import { profileById } from '../../fab/catalog';
import { withoutCustomerData } from '../../fab/privacy';
import { serializeDocument } from '../../core/document/persistence';
import { useFabOpen } from './fabOpen';

const STORAGE = 'phlippo.fab.settings';
export type FabView = 'none' | 'recognize' | 'saw' | 'plates' | 'nest' | 'bend' | 'welds' | 'cost' | 'quote';
export type FabCommand = 'recognize' | 'barNest' | 'exportDxf' | 'nest' | 'bendSeq' | 'welds' | 'cost' | 'customer' | 'quote' | 'addLine' | null;
export type SettingsPage = 'Company' | 'Rates' | 'Materials' | 'Machines' | 'Finishing' | 'Quote';

export interface FabState {
  settings: FabSettings;
  result: FabResult | null;
  modelKey: string;
  view: FabView;
  command: FabCommand;
  busy: boolean;
  dxf: DxfOptions;
  nestSettings: NestSettings | null;
  nests: Nest[];
  nestKey: string;
  bendIndex: number;
  grouping: Grouping;
  settingsOpen: boolean;
  /** the page the settings dialog opens on (Stock Library and Sheet Library: Materials, Company: Company, …) */
  settingsPage: SettingsPage;
  /** which part of the weld panel a button opened (Weld Joint, Weld Sequence, Execution Class) */
  weldFocus: 'joints' | 'seq' | 'exc';
  /** the cost of the previous calculation (the green or red arrow in the Task Pane) */
  vorigeCent: number | null;
}

export const useFab = create<FabState>()(() => ({
  settings: settingsFromStorage(typeof localStorage !== 'undefined' ? safeGet(STORAGE) : null),
  result: null, modelKey: '', view: 'none', command: null, busy: false, dxf: DXF_DEFAULTS, nestSettings: null, nests: [], nestKey: '', bendIndex: 0, grouping: 'categorie',
    settingsOpen: false, settingsPage: 'Company', weldFocus: 'joints',
    vorigeCent: null,
}));

// the manager pane and the graphics area follow the command and the view through the small store
useFab.subscribe((s) => { const o = useFabOpen.getState(), pm = s.command !== null, view = s.view !== 'none' || s.settingsOpen; if (o.pm !== pm || o.view !== view) useFabOpen.setState({ pm,
  view }); });

function safeGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
const msg = (t: string, level: 'info' | 'warn' | 'error' = 'info') => useStore.getState().pushMessage(t, level);

const keyCache = new WeakMap<Document, string>();
/**
 * The key of the model: the whole document without the quotes and the customer (docs/37 B-10: properties such as
 * fab.soort, configurations and equations change the result too). Cached per document object (documents are immutable).
 */
export function modelKeyOf(doc: Document): string {
  let k = keyCache.get(doc);
  if (k === undefined) {
    // the quote data (quotes, customer, series, VAT per line) do not change the analysis
    const { quotes: _q, klant: _k, reeks: _r, regelBtw: _b, ...fab } = doc.fab ?? {};
    void [_q, _k, _r, _b];
    const { fab: _f, ...rest } = doc;
    void _f;
    k = geometryHash(new Float64Array(0), JSON.stringify([rest, fab]));
    keyCache.set(doc, k);
  }
  return k;
}
/** out of date: the model or the settings changed after the analysis (docs/37 B-1) */
export const isStale = (s: FabState = useFab.getState()) => !!s.result && (s.modelKey !== modelKeyOf(useStore.getState().doc) || s.result.settingsKey !== settingsKey(s.settings));

export function setSettings(next: FabSettings) {
  useFab.setState({ settings: next });
  try { localStorage.setItem(STORAGE, exportSettings(next)); } catch { /* storage unavailable */ }
  // a price, a rate or a time changed: the open result is priced again (the geometry stays), so Cost, the quote and its
  // frozen record never mix old and new values (docs/37 B-1)
  const st = useFab.getState(), doc = useStore.getState().doc;
  if (st.result && st.modelKey === modelKeyOf(doc)) useFab.setState({ result: { ...price(st.result, next, doc.fab ?? {}), tijd: st.result.tijd }, vorigeCent: st.result.cost.totaalCent });
}
export const patchSettings = (f: (s: FabSettings) => void) => { const s = structuredClone(useFab.getState().settings); f(s); setSettings(s); };

let lastDocId = '';

/** analyze the open model (sync: the rebuild of each part is cached by the app's rebuild) */
export function recompute(): FabResult | null {
  const doc = useStore.getState().doc;
  if (doc.kind === 'drawing') return null;
  useFab.setState({ busy: true });
  try {
    // the arrow of the Task Pane compares with the previous calculation of the same document only
    const prev = lastDocId === (doc.id ?? doc.name) ? useFab.getState().result?.cost.totaalCent ?? null : null;
    lastDocId = doc.id ?? doc.name;
    const r = analyze(doc, useFab.getState().settings, doc.fab ?? {});
    useFab.setState({ result: r, modelKey: modelKeyOf(doc), busy: false, vorigeCent: prev, nests: [], nestKey: '' });
    return r;
  } catch (e) {
    useFab.setState({ busy: false });
    msg(`Analysis failed: ${(e as Error).message}`, 'error');
    return null;
  }
}
/** the current result, recomputed when the model changed */
export const fresh = () => (isStale() || !useFab.getState().result ? recompute() : useFab.getState().result);

export function open(view: FabView, command: FabCommand = null) {
  if (!fresh()) return;
  useFab.setState({ view, command });
}
export const closeCommand = () => { snapshot = null; useFab.setState({ command: null }); };

/** what a command may change, taken when it opens: Cancel puts it back (docs/37 P3: the cross undoes, the check keeps) */
let snapshot: { fab: FabDocData | undefined; settings: FabSettings } | null = null;
useFab.subscribe((s, prev) => { if (s.command && s.command !== prev.command) snapshot = { fab: useStore.getState().doc.fab, settings: structuredClone(useFab.getState().settings) }; });
export function cancelCommand() {
  const snap = snapshot;
  snapshot = null;
  useFab.setState({ command: null });
  if (!snap) return;
  const st = useStore.getState();
  if (st.doc.fab !== snap.fab) st.applyDocument('Cancel', { ...st.doc, fab: snap.fab });
  if (JSON.stringify(useFab.getState().settings) !== JSON.stringify(snap.settings)) setSettings(snap.settings);
  if (useFab.getState().result) recompute();
}
/** open the settings dialog on a page */
export const openSettings = (page: SettingsPage) => useFab.setState({ settingsOpen: true, settingsPage: page });

/** a change to doc.fab as one undoable step */
export function patchFab(label: string, f: (fab: FabDocData) => FabDocData) {
  const st = useStore.getState();
  st.applyDocument(label, { ...st.doc, fab: f({ ...(st.doc.fab ?? {}) }) });
}

const base = () => useStore.getState().doc.name.replace(/[\\/:*?"<>|]+/g, '_');
const meta = (r: FabResult) => ({ titel: base(), model: useStore.getState().doc.name, hash: r.hash, eigenaar: r.settings.company.naam.trim() ? `${r.settings.company.naam}` +
  ` ${r.settings.company.rechtsvorm}`.trim() : '' });
/** an export of a stale result is blocked (F0-6) */
function exportable(): FabResult | null {
  const r = useFab.getState().result;
  if (!r) { msg('Run the analysis first.', 'warn'); return null; }
  if (isStale()) { msg('The model or the settings changed after the analysis: recalculate before exporting.', 'warn'); return null; }
  return r;
}

export async function exportSawList(kind: 'pdf' | 'xlsx') {
  const r = exportable(); if (!r) return;
  const z = r.settings.machines.zagen;
  if (kind === 'pdf') return saveFile({ name: `${base()}-zaagstaat.pdf`, data: sawListPdf(r.saw, r.plans, meta(r), z.zaagsnede), mime: 'application/pdf' }, 'pdf', 'PDF');
  const rows = [['Pos', 'Aantal', 'Profiel', 'Staalsoort', 'Zaaglengte (mm)', 'Hoek 1', 'Hoek 2', 'Gaten', 'kg/st', 'kg totaal', 'Opmerking'], ...r.saw.map((l) => [l.pos, l.n, l.profiel,
    l.kwaliteit, l.zaaglengte, l.hoek1, l.hoek2, l.gaten, Math.round(l.kgStuk * 100) / 100, Math.round(l.kgTotaal * 100) / 100, l.opm])];
  const order = [['Profiel', 'Staaflengte (mm)', 'Bij te bestellen', 'Benutting %'], ...r.plans.map((p) => [profileById(p.profielId)?.naam ?? p.profielId, p.staven[0]?.lengte ?? 6000,
    p.teBestellen, Math.round(p.benutting * 1000) / 10])];
  return saveFile({ name: `${base()}-zaagstaat.xlsx`, data: writeBook([{ name: 'Zaagstaat', rows }, { name: 'Bestellijst', rows: order }]),
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, 'xlsx', 'Excel');
}

/** the order list (docs/36 L-11): per profile the bars to order, apart from the saw list */
export async function exportOrderList() {
  const r = exportable(); if (!r) return;
  const rows = [['Profiel', 'Staalsoort', 'Staaflengte (mm)', 'Bij te bestellen', 'Uit voorraad', 'Restanten', 'Benutting %'], ...r.plans.map((p) => [profileById(p.profielId)?.naam ?? p.profielId,
    profileById(p.profielId)?.kwaliteit ?? '', r.settings.materials.staafLengte, p.teBestellen, p.staven.filter((b) => b.bron === 'voorraad').length,
      p.staven.filter((b) => b.bron === 'restant').length,
    Math.round(p.benutting * 1000) / 10])];
  return saveFile({ name: `${base()}-bestellijst.xlsx`, data: writeBook([{ name: 'Bestellijst', rows }]), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, 'xlsx', 'Excel');
}

export async function exportWeldPlan() {
  const r = exportable(); if (!r) return;
  const exc = useStore.getState().doc.fab?.exc ?? 'geen';
  const { naam, view } = weldPlanInput(r);
  return saveFile({ name: `${base()}-lasplan.pdf`, data: weldPlanPdf(r.joints, weldSequence(activeJoints(r.joints)), exc, meta(r), naam, view), mime: 'application/pdf' }, 'pdf', 'PDF');
}

/** the DXF of one plate position, or all as a ZIP with the plate list; refused plates and blocking checks stop it */
export async function exportDxf(which: number | 'all') {
  const r = exportable(); if (!r) return;
  const opt = useFab.getState().dxf;
  const list = which === 'all' ? r.flats.map((f, i) => ({ f, i })) : [{ f: r.flats[which], i: which }];
  const bad = list.filter(({ f }) => f.betrouwbaar === 'geen' || blocksExport(plateChecks(f)));
  const why = (f: FlatPart) => f.fout ?? plateChecks(f).filter((x) => x.blokkeert).map((x) => x.tekst).join(', ');
  if (which !== 'all') {
    if (bad.length) return msg(`No DXF for P${which + 1}: ${why(list[0].f)}.`, 'warn');
    const { f, i } = list[0];
    return saveFile({ name: dxfFileName(i + 1, f.materiaal, f.t, f.n), data: new TextEncoder().encode(plateDxf(f, opt, `P${i + 1}`)), mime: 'application/dxf' }, 'dxf', 'DXF');
  }
  // the good plates go out; a refused plate stays in the list with its reason (docs/37 B-17)
  const good = list.filter((x) => !bad.includes(x));
  if (!good.length) return msg(`No DXF: ${bad.map(({ i, f }) => `P${i + 1} (${why(f)})`).join('; ')}.`, 'warn');
  const files: { name: string; data: Uint8Array }[] = good.map(({ f, i }) => ({ name: dxfFileName(i + 1, f.materiaal, f.t, f.n), data: new TextEncoder().encode(plateDxf(f, opt, `P${i + 1}`)) }));
  const rows = [['Bestand', 'Pos', 'Aantal', 'Materiaal', 'Dikte (mm)', 'Opmerking'], ...list.map(({ f, i }) => {
    const ok = good.find((x) => x.i === i);
    return [ok ? dxfFileName(i + 1, f.materiaal, f.t, f.n) : '', i + 1, f.n, f.materiaal, f.t, ok ? '' : `geen DXF: ${why(f)}`];
  })];
  files.push({ name: `${base()}-plaatlijst.xlsx`, data: writeBook([{ name: 'Plaatlijst', rows }]) }, { name: `${base()}-plaatlijst.pdf`, data: plateListPdf(r.flats, meta(r)) });
  if (bad.length) msg(`${bad.length} plate${bad.length === 1 ? '' : 's'} without DXF, listed in the plate list: ${bad.map(({ i }) => `P${i + 1}`).join(', ')}.`, 'warn');
  return saveFile({ name: `${base()}-laser.zip`, data: writeZip(files), mime: 'application/zip' }, 'zip', 'ZIP');
}

/** nest every material and thickness on the chosen sheet */
export function runNest() {
  const r = fresh(); if (!r) return;
  const st = useFab.getState();
  const groups = new Map<string, number[]>();
  r.flats.forEach((f, i) => { if (f.betrouwbaar !== 'geen') { const k = `${f.materiaal}|${f.t}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(i); } });
  const nests = [...groups.entries()].map(([k, idx]) => {
    const [mat, t] = k.split('|');
    const s = st.nestSettings ?? defaultNestSettings(Number(t));
    // positions keep their number: pieces of the other groups are left out by giving them no copies
    const flats = r.flats.map((f, i) => (idx.includes(i) ? f : { ...f, n: 0 }));
    return nestRects(mat, Number(t), (s.draaien ? nestPiecesShape(flats, s.afstand) : nestPieces(flats)), { ...s, afstand: Math.max(s.afstand, 0) });
  });
  useFab.setState({ nests, nestKey: useFab.getState().modelKey, view: 'nest' });
  const bad = nests.flatMap((n) => validateNest(n, r.flats, new Map(r.flats.map((f, i) => [i + 1, n.t === f.t && n.materiaal === f.materiaal && f.betrouwbaar !== 'geen' ? f.n : 0]))));
  if (bad.length) msg(`Nest check: ${bad.join('; ')}`, 'error');
}

export async function exportNest(kind: 'pdf' | 'dxf') {
  const r = exportable(); if (!r) return;
  const { nests } = useFab.getState();
  if (!nests.length) return msg('Nest the plates first.', 'warn');
  if (kind === 'pdf') return saveFile({ name: `${base()}-legplan.pdf`, data: nestPdf(nests, r.flats, meta(r)), mime: 'application/pdf' }, 'pdf', 'PDF');
  const files = nests.flatMap((n) => n.bladen.map((b, i) => ({ name: `${base()}_${n.materiaal}_${n.t}mm_blad${i + 1}.dxf`, data: new TextEncoder().encode(nestDxf(b, r.flats)) })));
  return saveFile({ name: `${base()}-bladen.zip`, data: writeZip(files), mime: 'application/zip' }, 'zip', 'ZIP');
}

/** the bend lines of a sheet metal part made from a base flange chain (prismatic) */
export function bendInfo(r: FabResult, i: number) {
  const f = r.flats[i];
  const doc = r.bodies.find((b) => b.key === f?.key)?.sheet?.doc;
  return f && doc ? bendPlan(f, doc, r.settings.machines.plooien) : null;
}

export async function exportBendSheet() {
  const r = exportable(); if (!r) return;
  const i = r.flats.findIndex((f) => f.plooien.length);
  const b = i >= 0 ? bendInfo(r, Math.max(i, useFab.getState().bendIndex)) ?? bendInfo(r, i) : null;
  if (!b) return msg('No bent plate with a base flange chain in this model.', 'warn');
  return saveFile({ name: `${base()}-plooiblad.pdf`, data: bendSheetPdf(b.f, b.bends, b.seq.steps, b.checks, b.seq.gecontroleerd, meta(r), b.seq.botsing), mime: 'application/pdf' }, 'pdf', 'PDF');
}

// ---- the quote

const TELLER = 'phlippo.fab.teller';
/** the quote counter of this user, kept apart from the settings (a reset or an older settings file never lowers it) */
const teller = (): { jaar: number; laatste: number } | undefined => { try { return JSON.parse(localStorage.getItem(TELLER) ?? 'null') ?? undefined; } catch { return undefined; } };
const setTeller = (t: { jaar: number; laatste: number }) => { try { localStorage.setItem(TELLER, JSON.stringify(t)); } catch { /* storage unavailable */ } };

/** save a file and say whether it was written (a cancelled save dialog takes no quote number, O3.1) */
export async function saveFab(file: { name: string; data: Uint8Array; mime: string }, ext: string, label: string): Promise<boolean> {
  const api = desktop();
  const buf = file.data.buffer.slice(file.data.byteOffset, file.data.byteOffset + file.data.byteLength) as ArrayBuffer;
  if (api) {
    const r = await api.saveFileAs({ defaultPath: file.name, filters: [{ name: label, extensions: [ext] }], data: buf });
    if (!r) return false;
    msg(r.error ? `Cannot save ${r.name}: ${r.error}` : `${r.name} saved.`, r.error ? 'error' : 'info');
    return !r.error;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: file.mime }));
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  msg(`${file.name} saved.`);
  return true;
}

/** the quote being prepared (not yet numbered); the series quantity of the document prices it (docs/37 B-5) */
export function draftQuote() {
  // no recalculation here: the panels call this while they draw
  const r = useFab.getState().result;
  const st = useStore.getState();
  if (!r) return null;
  const s = r.settings;
  const fab = st.doc.fab ?? {};
  const klant = fab.klant ?? { naam: '', adres: '', soort: 'particulier' as const };
  const lines = quoteLines(r.cost, s.rates.marge.waarde, useFab.getState().grouping, st.doc.name, fab.reeks ?? 1);
  const q = newQuote(`q-${Date.now()}`, klant, lines, s, today(), st.doc.name);
  // the rate and the placing mark per line, as Ian set them in the Quote panel (docs/37 B-13)
  const set = fab.regelBtw ?? {};
  return { ...q, regels: q.regels.map((l) => ({ ...l, ...(set[l.omschrijving] ?? {}) })) };
}

/** the frozen quote in the document that is this same quote (same model, prices, customer and lines): its number is reused */
function sameQuote(q: Quote, r: FabResult): Quote | undefined {
  const sig = (x: Quote) => JSON.stringify([x.klant, x.regels, x.btwRegime]);
  return [...(useStore.getState().doc.fab?.quotes ?? [])].reverse().find((x) => x.bevroren?.hash === r.hash && x.bevroren?.settingsKey === r.settingsKey && sig(x) === sig(q));
}

/** the AANNAME counter and the incomplete total are confirmed before the export; the number is taken only when the file is written */
export function exportQuote(kind: 'pdf' | 'xlsx', image?: { jpeg: Uint8Array; w: number; h: number }) {
  const r = exportable(); if (!r) return;
  const q = draftQuote(); if (!q) return;
  const s = r.settings;
  const problems = vatProblems(q);
  if (problems.some((p) => p.blokkeert)) return msg(problems.map((p) => p.tekst).join(' '), 'warn');
  const reasons = [
    r.cost.aannames ? `${r.cost.aannames} of ${r.cost.regels.length} cost lines rest on assumptions (AANNAME)` : '',
    r.cost.onvolledig ? `${r.cost.geenPrijs} lines have no price: the total is incomplete` : '',
    companyMissing(useFab.getState().settings.company).length ? 'the company data are missing: the quote is marked ONTWERP' : '',
    ...problems.map((p) => p.tekst),
  ].filter(Boolean);
  const go = async () => {
    const before = sameQuote(q, r);
    const used = (useStore.getState().doc.fab?.quotes ?? []).map((x) => x.nummer);
    const next = before ? { nummer: before.nummer, teller: undefined } : nextNumber(s, q.datum, used, teller());
    // the frozen record: the cost lines and the rate of the very same pricing (docs/37 B-1)
    const done: Quote = before ?? { ...q, nummer: next.nummer, bevroren: { op: today(), hash: r.hash, settingsKey: r.settingsKey, kostenregels: r.cost.regels, uurloon: s.rates.uurloon.waarde } };
    const company = useFab.getState().settings.company;
    const data = kind === 'pdf' ? quotePdf(done, { company, verlegdTekst: s.quote.verlegdTekst, vrijgesteldTekst: s.quote.vrijgesteldTekst, image }) : quoteBook(done, r);
    const ok = await saveFab({ name: `Offerte-${done.nummer}${done.revisie && done.revisie !== 'A' ? `-${done.revisie}` : ''}.${kind}`, data,
      mime: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, kind, kind.toUpperCase());
    if (!ok || before) return;
    if (next.teller) setTeller(next.teller);
    patchFab(`Quote ${done.nummer}`, (fab) => ({ ...fab, quotes: [...(fab.quotes ?? []), done] }));
  };
  if (!reasons.length) return void go();
  useStore.getState().setAsk({ title: 'Export Quote', text: `Before the quote goes out: ${reasons.join('; ')}. Export anyway?`, yesLabel: 'Export', yes: () => void go() });
}

/** the workbook of a quote (O3.5): the quote with its totals, the cost price and the parts list; amounts as numbers */
export function quoteBook(q: Quote, r: Pick<FabResult, 'cost' | 'recs'>): Uint8Array {
  const t = vatTotals(q.regels, q.btwRegime);
  return writeBook([
    { name: 'Offerte', rows: [['Offerte', q.nummer, 'Revisie', q.revisie], ['Pos', 'Omschrijving', 'Aantal', 'Eenheid', 'Eenheidsprijs', 'Btw %', 'Bedrag excl. btw'],
      ...q.regels.map((l, i) => [i + 1, l.omschrijving, l.hoeveelheid, l.eenheid, l.prijsCent / 100, l.btw, lineTotal(l) / 100]),
      ['', 'Totaal excl. btw', '', '', '', '', t.exclCent / 100], ...t.perTarief.map((x) => ['', `Btw ${x.tarief} %`, '', '', '', '', x.btwCent / 100]),
      ['', 'Totaal incl. btw', '', '', '', '', t.inclCent / 100]] },
    { name: 'Kostprijs', rows: [['Categorie', 'Omschrijving', 'Hoeveelheid', 'Eenheid', 'Bedrag', 'Bron', 'AANNAME'], ...r.cost.regels.map((l) => [l.categorie, l.omschrijving,
      l.hoeveelheid, l.eenheid, l.bedragCent / 100, l.bron, l.aanname]), ['', 'Totaal', '', '', r.cost.totaalCent / 100, '', '']] },
    { name: 'Stuklijst', rows: [['Naam', 'Onderdeel', 'Aantal', 'Soort'], ...r.recs.map((x) => [x.naam, x.bron.part, x.aantal, x.soort])] },
  ]);
}

/** a new revision of a frozen quote with today's prices (O3.2): the frozen one stays as it was */
export function reviseQuote(nummer: string) {
  const r = fresh(); if (!r) return;
  const old = [...(useStore.getState().doc.fab?.quotes ?? [])].reverse().find((x) => x.nummer === nummer);
  const q = draftQuote(); if (!old || !q) return;
  const rev: Quote = { ...q, nummer, revisie: nextRevision(old.revisie),
    bevroren: { op: today(), hash: r.hash, settingsKey: r.settingsKey, kostenregels: r.cost.regels, uurloon: r.settings.rates.uurloon.waarde } };
  patchFab(`Quote ${nummer} rev. ${rev.revisie}`, (fab) => ({ ...fab, quotes: [...(fab.quotes ?? []), rev] }));
  msg(`Quote ${nummer} revision ${rev.revisie} made with today's prices; revision ${old.revisie} stays as it was.`);
}

/** the frozen quotes whose model changed since (O3.3): "model gewijzigd sinds offerte 2026-001" */
export function quotesOutOfDate(r: FabResult | null, doc: Document): Quote[] {
  if (!r) return [];
  const latest = new Map<string, Quote>();
  for (const x of doc.fab?.quotes ?? []) latest.set(x.nummer, x);
  return [...latest.values()].filter((x) => x.bevroren && x.bevroren.hash !== r.hash);
}

/** O3.6: a copy of the model without customer data and prices */
export function saveCopyWithoutCustomerData() {
  const doc = withoutCustomerData(useStore.getState().doc);
  void saveFile({ name: `${base()}-zonder-klantgegevens.kcad`, data: new TextEncoder().encode(serializeDocument(doc)), mime: 'application/json' }, 'kcad', 'Phlippo CAD');
}

export function exportSettingsFile() { void saveFile({ name: 'werkplaatsinstellingen.json', data: new TextEncoder().encode(exportSettings(useFab.getState().settings)), mime: 'application/json' },
  'json', 'JSON'); }
export function importSettingsText(text: string) {
  try { setSettings(importSettings(text)); msg('Fabrication settings imported.'); } catch (e) { msg((e as Error).message, 'error'); }
}
/** Reset asks first (docs/37 B-6); the quote counter is not part of it */
export const resetSettings = () => useStore.getState().setAsk({ title: 'Reset Fabrication Settings',
  text: 'All prices, rates and company data go back to the start values. The quote numbers already used stay used. Reset?', yesLabel: 'Reset', yes: () => setSettings(defaultSettings()) });
