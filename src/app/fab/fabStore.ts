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
import { analyze, type FabResult } from '../../fab/analyze';
import { defaultSettings, exportSettings, importSettings, settingsFromStorage, type FabSettings } from '../../fab/settings';
import { geometryHash } from '../../fab/geom';
import { DXF_DEFAULTS, dxfFileName, plateDxf, type DxfOptions } from '../../fab/dxf';
import { plateChecks, blocksExport } from '../../fab/checks';
import { writeZip } from '../../core/document/zip';
import { writeBook } from '../../fab/xlsxBook';
import { sawListPdf, plateListPdf, nestPdf, bendSheetPdf, weldPlanPdf } from '../../fab/sheets';
import { nestRects, nestPieces, nestDxf, validateNest, defaultNestSettings, type Nest, type NestSettings } from '../../fab/nest';
import { chainBends, bendChecks, proposeSequence } from '../../fab/bend';
import { proposeSequence as weldSequence } from '../../fab/weld';
import { quotePdf } from '../../fab/quotePdf';
import { newQuote, nextNumber, quoteLines, vatProblems, type Grouping } from '../../fab/quote';
import { companyMissing } from '../../fab/settings';
import { today } from '../../fab/format';
import { profileById } from '../../fab/catalog';
import { withoutCustomerData } from '../../fab/privacy';
import { serializeDocument } from '../../core/document/persistence';
import { useFabOpen } from './fabOpen';

const STORAGE = 'phlippo.fab.settings';
export type FabView = 'none' | 'recognize' | 'saw' | 'plates' | 'nest' | 'bend' | 'welds' | 'cost' | 'quote';
export type FabCommand = 'recognize' | 'barNest' | 'exportDxf' | 'nest' | 'bendSeq' | 'welds' | 'cost' | 'customer' | 'quote' | null;

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
  /** the cost of the previous calculation (the green or red arrow in the Task Pane) */
  vorigeCent: number | null;
}

export const useFab = create<FabState>()(() => ({
  settings: settingsFromStorage(typeof localStorage !== 'undefined' ? safeGet(STORAGE) : null),
  result: null, modelKey: '', view: 'none', command: null, busy: false, dxf: DXF_DEFAULTS, nestSettings: null, nests: [], nestKey: '', bendIndex: 0, grouping: 'categorie', settingsOpen: false,
    vorigeCent: null,
}));

// the manager pane and the graphics area follow the command and the view through the small store
useFab.subscribe((s) => { const o = useFabOpen.getState(), pm = s.command !== null, view = s.view !== 'none' || s.settingsOpen; if (o.pm !== pm || o.view !== view) useFabOpen.setState({ pm,
  view }); });

function safeGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
const msg = (t: string, level: 'info' | 'warn' | 'error' = 'info') => useStore.getState().pushMessage(t, level);

/** the key of the model: features, sketches, components and the overrides (the fabrication data without the quotes) */
export function modelKeyOf(doc: Document): string {
  const { quotes: _q, klant: _k, ...fab } = doc.fab ?? {};
  void [_q, _k];
  return geometryHash(new Float64Array(0), JSON.stringify([doc.features, doc.sketches, doc.components ?? null, doc.sheetMetal ?? null, doc.material ?? null, fab]));
}
export const isStale = (s: FabState = useFab.getState()) => !!s.result && s.modelKey !== modelKeyOf(useStore.getState().doc);

export function setSettings(next: FabSettings) {
  useFab.setState({ settings: next });
  try { localStorage.setItem(STORAGE, exportSettings(next)); } catch { /* storage unavailable */ }
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
export const closeCommand = () => useFab.setState({ command: null });

/** a change to doc.fab as one undoable step */
export function patchFab(label: string, f: (fab: FabDocData) => FabDocData) {
  const st = useStore.getState();
  st.applyDocument(label, { ...st.doc, fab: f({ ...(st.doc.fab ?? {}) }) });
}

const base = () => useStore.getState().doc.name.replace(/[\\/:*?"<>|]+/g, '_');
const meta = (r: FabResult) => ({ titel: base(), model: useStore.getState().doc.name, hash: r.hash });
/** an export of a stale result is blocked (F0-6) */
function exportable(): FabResult | null {
  const r = useFab.getState().result;
  if (!r) { msg('Run the analysis first.', 'warn'); return null; }
  if (isStale()) { msg('The model changed after the analysis: recalculate before exporting.', 'warn'); return null; }
  return r;
}

export async function exportSawList(kind: 'pdf' | 'xlsx') {
  const r = exportable(); if (!r) return;
  const z = useFab.getState().settings.machines.zagen;
  if (kind === 'pdf') return saveFile({ name: `${base()}-zaagstaat.pdf`, data: sawListPdf(r.saw, r.plans, meta(r), z.zaagsnede), mime: 'application/pdf' }, 'pdf', 'PDF');
  const rows = [['Pos', 'Aantal', 'Profiel', 'Staalsoort', 'Zaaglengte (mm)', 'Hoek 1', 'Hoek 2', 'Gaten', 'kg/st', 'kg totaal', 'Opmerking'], ...r.saw.map((l) => [l.pos, l.n, l.profiel,
    l.kwaliteit, l.zaaglengte, l.hoek1, l.hoek2, l.gaten, Math.round(l.kgStuk * 100) / 100, Math.round(l.kgTotaal * 100) / 100, l.opm])];
  const order = [['Profiel', 'Staaflengte (mm)', 'Bij te bestellen', 'Benutting %'], ...r.plans.map((p) => [profileById(p.profielId)?.naam ?? p.profielId, p.staven[0]?.lengte ?? 6000,
    p.teBestellen, Math.round(p.benutting * 1000) / 10])];
  return saveFile({ name: `${base()}-zaagstaat.xlsx`, data: writeBook([{ name: 'Zaagstaat', rows }, { name: 'Bestellijst', rows: order }]),
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, 'xlsx', 'Excel');
}

export async function exportWeldPlan() {
  const r = exportable(); if (!r) return;
  const exc = useStore.getState().doc.fab?.exc ?? 'geen';
  const names = new Map(r.recs.map((x) => [x.key, x.naam]));
  return saveFile({ name: `${base()}-lasplan.pdf`, data: weldPlanPdf(r.joints, weldSequence(r.joints), exc, meta(r), (k) => names.get(k) ?? k), mime: 'application/pdf' }, 'pdf', 'PDF');
}

/** the DXF of one plate position, or all as a ZIP with the plate list; refused plates and blocking checks stop it */
export async function exportDxf(which: number | 'all') {
  const r = exportable(); if (!r) return;
  const opt = useFab.getState().dxf;
  const list = which === 'all' ? r.flats.map((f, i) => ({ f, i })) : [{ f: r.flats[which], i: which }];
  const bad = list.filter(({ f }) => f.betrouwbaar === 'geen' || blocksExport(plateChecks(f)));
  if (bad.length) return msg(`No DXF for ${bad.map(({ i, f }) => `P${i + 1} (${f.fout ?? plateChecks(f).filter((x) => x.blokkeert).map((x) => x.tekst).join(', ')})`).join('; ')}.`, 'warn');
  if (which !== 'all') { const { f, i } = list[0]; return saveFile({ name: dxfFileName(i + 1, f.materiaal, f.t, f.n), data: new TextEncoder().encode(plateDxf(f, opt, `P${i + 1}`)),
    mime: 'application/dxf' }, 'dxf', 'DXF'); }
  const files: { name: string; data: Uint8Array }[] = list.map(({ f, i }) => ({ name: dxfFileName(i + 1, f.materiaal, f.t, f.n), data: new TextEncoder().encode(plateDxf(f, opt, `P${i + 1}`)) }));
  const rows = [['Bestand', 'Pos', 'Aantal', 'Materiaal', 'Dikte (mm)'], ...list.map(({ f, i }) => [files[i].name, i + 1, f.n, f.materiaal, f.t])];
  files.push({ name: `${base()}-plaatlijst.xlsx`, data: writeBook([{ name: 'Plaatlijst', rows }]) }, { name: `${base()}-plaatlijst.pdf`, data: plateListPdf(r.flats, meta(r)) });
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
    return nestRects(mat, Number(t), nestPieces(flats), { ...s, afstand: Math.max(s.afstand, 0) });
  });
  useFab.setState({ nests, nestKey: useFab.getState().modelKey, view: 'nest' });
  const bad = nests.flatMap((n) => validateNest(n, r.flats, new Map(r.flats.map((f, i) => [i + 1, n.t === f.t && n.materiaal === f.materiaal && f.betrouwbaar !== 'geen' ? f.n : 0]))));
  if (bad.length) msg(`Nest check: ${bad.join('; ')}`, 'error');
}

export async function exportNest(kind: 'pdf' | 'dxf') {
  const r = exportable(); if (!r) return;
  const { nests } = useFab.getState();
  if (!nests.length) return msg('Nest the plates first.', 'warn');
  if (kind === 'pdf') return saveFile({ name: `${base()}-legplan.pdf`, data: nestPdf(nests[0], r.flats, meta(r)), mime: 'application/pdf' }, 'pdf', 'PDF');
  const files = nests.flatMap((n) => n.bladen.map((b, i) => ({ name: `${base()}_${n.materiaal}_${n.t}mm_blad${i + 1}.dxf`, data: new TextEncoder().encode(nestDxf(b, r.flats)) })));
  return saveFile({ name: `${base()}-bladen.zip`, data: writeZip(files), mime: 'application/zip' }, 'zip', 'ZIP');
}

/** the bend lines of a sheet metal part made from a base flange chain (prismatic) */
export function bendInfo(r: FabResult, i: number) {
  const f = r.flats[i];
  const body = r.bodies.find((b) => b.key === f?.key);
  const doc = body?.sheet?.doc;
  const bf = doc?.features.find((x) => x.type === 'baseFlange') as { sketchId?: string; depth?: number } | undefined;
  const sk = bf?.sketchId ? doc!.sketches[bf.sketchId] : undefined;
  const prismatic = !!sk && !doc!.features.some((x) => !x.suppressed && ['edgeFlange', 'hem', 'miterFlange', 'jog', 'sketchedBend'].includes(x.type));
  if (!f || !sk || !doc) return null;
  const pts = sk.entityOrder.map((id) => sk.entities[id]).filter((e) => e && e.kind === 'line').map((e) => e as { p1: string; p2: string });
  const chain = pts.length ? [sk.points[pts[0].p1], ...pts.map((l) => sk.points[l.p2])] : [];
  const sm = doc.sheetMetal ?? { thickness: 3, bendRadius: 3, kFactor: 0.5 };
  const k = Number(/K = ([\d.]+)/.exec(f.kBron ?? '')?.[1] ?? sm.kFactor);
  const { bends, width } = chainBends(chain, sm.thickness, sm.bendRadius, k, bf?.depth ?? 0);
  const P = useFab.getState().settings.machines.plooien;
  const seq = proposeSequence(bends, width, sm.thickness, P.rm, prismatic);
  const checks = bends.flatMap((b) => bendChecks(b, width, sm.thickness, sm.bendRadius, P, bends));
  return { f, bends, width, seq, checks, prismatic };
}

export async function exportBendSheet() {
  const r = exportable(); if (!r) return;
  const i = r.flats.findIndex((f) => f.plooien.length);
  const b = i >= 0 ? bendInfo(r, Math.max(i, useFab.getState().bendIndex)) ?? bendInfo(r, i) : null;
  if (!b) return msg('No bent plate with a base flange chain in this model.', 'warn');
  return saveFile({ name: `${base()}-plooiblad.pdf`, data: bendSheetPdf(b.f, b.bends, b.seq.steps, b.checks, b.seq.gecontroleerd, meta(r), b.seq.botsing), mime: 'application/pdf' }, 'pdf', 'PDF');
}

// ---- the quote

/** the quote being prepared (not yet numbered) */
export function draftQuote() {
  // no recalculation here: the panels call this while they draw
  const r = useFab.getState().result;
  const st = useStore.getState(), s = useFab.getState().settings;
  if (!r) return null;
  const fab = st.doc.fab ?? {};
  const klant = fab.klant ?? { naam: '', adres: '', soort: 'particulier' as const };
  const lines = quoteLines(r.cost, s.rates.marge.waarde, useFab.getState().grouping, st.doc.name, fab.reeks ?? 1);
  return newQuote(`q-${Date.now()}`, klant, lines, s, today(), st.doc.name);
}

/** the AANNAME counter and the incomplete total are confirmed before the export; the number is taken only on export */
export function exportQuote(kind: 'pdf' | 'xlsx', image?: { jpeg: Uint8Array; w: number; h: number }) {
  const r = exportable(); if (!r) return;
  const q = draftQuote(); if (!q) return;
  const s = useFab.getState().settings;
  const problems = vatProblems(q);
  if (problems.some((p) => p.blokkeert)) return msg(problems.map((p) => p.tekst).join(' '), 'warn');
  const reasons = [
    r.cost.aannames ? `${r.cost.aannames} of ${r.cost.regels.length} cost lines rest on assumptions (AANNAME)` : '',
    r.cost.onvolledig ? `${r.cost.geenPrijs} lines have no price: the total is incomplete` : '',
    companyMissing(s.company).length ? 'the company data are missing: the quote is marked ONTWERP' : '',
    ...problems.map((p) => p.tekst),
  ].filter(Boolean);
  const go = () => {
    const { nummer, teller } = nextNumber(s, q.datum);
    const done = { ...q, nummer, bevroren: { op: today(), hash: r.hash, kostenregels: r.cost.regels, uurloon: s.rates.uurloon.waarde } };
    const data = kind === 'pdf'
      ? quotePdf(done, { company: s.company, verlegdTekst: s.quote.verlegdTekst, vrijgesteldTekst: s.quote.vrijgesteldTekst, image })
      : writeBook([
        { name: 'Offerte', rows: [['Pos', 'Omschrijving', 'Aantal', 'Eenheid', 'Eenheidsprijs', 'Btw %', 'Bedrag excl. btw'], ...done.regels.map((l, i) => [i + 1, l.omschrijving, l.hoeveelheid,
          l.eenheid, l.prijsCent / 100, l.btw, Math.round(l.hoeveelheid * l.prijsCent) / 100])] },
        { name: 'Kostprijs', rows: [['Categorie', 'Omschrijving', 'Hoeveelheid', 'Eenheid', 'Bedrag', 'Bron', 'AANNAME'], ...r.cost.regels.map((l) => [l.categorie, l.omschrijving, l.hoeveelheid,
          l.eenheid, l.bedragCent / 100, l.bron, l.aanname])] },
        { name: 'Stuklijst', rows: [['Naam', 'Onderdeel', 'Aantal', 'Soort'], ...r.recs.map((x) => [x.naam, x.bron.part, x.aantal, x.soort])] },
      ]);
    setSettings({ ...s, quote: { ...s.quote, teller } });
    patchFab(`Quote ${nummer}`, (fab) => ({ ...fab, quotes: [...(fab.quotes ?? []), done] }));
    void saveFile({ name: `Offerte-${nummer}.${kind}`, data, mime: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, kind,
      kind.toUpperCase());
  };
  if (!reasons.length) return go();
  useStore.getState().setAsk({ title: 'Export Quote', text: `Before the quote goes out: ${reasons.join('; ')}. Export anyway?`, yesLabel: 'Export', yes: go });
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
export const resetSettings = () => setSettings(defaultSettings());
