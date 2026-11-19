/**
 * Everything the three extensions derive from a model, in one pass (docs/36 2.4): the bodies, their recognition, the
 * saw list and saw plans, the flat parts grouped into plate positions, the weld joints and the cost model, all carrying
 * the hash of the geometry they came from (F0-6: a result with another hash is out of date and blocks its export).
 */
import type { Document } from '../core/document/types';
import type { RebuildResult } from '../core/features/rebuild';
import type { FabDocData, Recognition, WeldJoint } from './types';
import type { FabSettings } from './settings';
import { sharpEdges } from './weldEdge';
import { documentBodies, documentHash, type FabBody } from './bodies';
import { recognizeAll } from './recognize';
import { sawList, sawPlans, type SawLine } from './sawList';
import type { BarPlan } from './barNest';
import { flatOfPlate, flatOfSheet, type FlatPart } from './flat';
import { proposeJoints, proposeSequence, applySequence, reconcileJoints, jointFromBead } from './weld';
import { costModel, type CostModel } from './cost';
import { materialKey } from './catalog';
import { nestRects, nestPiecesShape, defaultNestSettings, type Nest } from './nest';

export interface FabResult {
  hash: string;
  bodies: FabBody[];
  recs: (Recognition & { kenmerk?: string })[];
  saw: SawLine[];
  plans: BarPlan[];
  flats: FlatPart[];
  joints: WeldJoint[];
  cost: CostModel;
  /** the settings the result was priced with, and their key (docs/37 B-1: a frozen quote takes these, never newer ones) */
  settings: FabSettings;
  settingsKey: string;
  /** ms */
  tijd: number;
}

/** identical plates are one position: material, thickness, size and cut length agree */
function platePositions(bodies: FabBody[], recs: Recognition[], kBron: 'model' | 'din6935'): FlatPart[] {
  const out: (FlatPart & { sig: string })[] = [];
  for (const r of recs) {
    if (r.soort !== 'plaat' && r.soort !== 'gezette plaat') continue;
    const b = bodies.find((x) => x.key === r.key)!;
    const f = r.soort === 'gezette plaat' && b.sheet ? flatOfSheet(b.sheet.doc, b, r.naam, r.aantal, materialKey(r.materiaal), kBron) : flatOfPlate(b, r.naam, r.aantal, materialKey(r.materiaal));
    if (!r.materiaal.trim()) f.materiaalAanname = true;
    const sig = [f.materiaal, f.t.toFixed(2), f.bbox.l.toFixed(1), f.bbox.b.toFixed(1), f.oppervlak.toFixed(0), (f.snijlengte.buiten + f.snijlengte.binnen).toFixed(0), f.plooien.length].join('|');
    const same = out.find((x) => x.sig === sig && x.betrouwbaar !== 'geen' && f.betrouwbaar !== 'geen');
    if (same) { same.n += f.n; same.keys = [...(same.keys ?? [same.key]), r.key]; } else out.push({ ...f, keys: [r.key], sig });
  }
  return out.sort((a, b) => a.materiaal.localeCompare(b.materiaal) || a.t - b.t || b.oppervlak - a.oppervlak).map(({ sig: _s, ...f }) => { void _s; return f; });
}

/** a hash of the settings a result was priced with: a result priced with other settings is out of date (docs/37 B-1) */
export function settingsKey(s: FabSettings): string {
  let h = 0x811c9dc5;
  const t = JSON.stringify(s);
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** the geometry part of the analysis: bodies, recognition, plate positions, weld joints (no prices) */
export function analyzeGeometry(doc: Document, fab: FabDocData = {}, opts: { rebuild?: (d: Document) => RebuildResult; kBron?: 'model' | 'din6935' } = {}) {
  const bodies = documentBodies(doc, opts.rebuild);
  const recs = recognizeAll(bodies, fab.overrides ?? {});
  const flats = platePositions(bodies, recs, opts.kBron ?? 'din6935');
  const weldable = bodies.filter((b) => { const r = recs.find((x) => x.key === b.key); return r && (r.soort === 'profiel' || r.soort === 'plaat'); });
  // the proposal per part: the bodies of one part share its coordinates; a part used n times has its joints n times
  const groups = new Map<string, FabBody[]>();
  for (const b of weldable) { const k = b.path.join('/'); (groups.get(k) ?? groups.set(k, []).get(k)!).push(b); }
  let n = 0;
  const proposed = [...groups.values()].flatMap((g) => proposeJoints(g, recs, fab.exc).map((x) => ({ ...x, id: `W${++n}`, aantal: g[0].aantal })));
  const joints0 = reconcileJoints(fab.welds ?? [], applySequence(proposed, proposeSequence(proposed)), fab.exc);
  // a Weld Bead of an older file gets a joint of the same size (docs/36 L3.7), unless one already refers to it
  const beads = [doc, ...(doc.components ?? []).map((c) => c.part)].flatMap((d) => d.features.filter((f) => f.type === 'weldBead'
    && !f.suppressed)) as unknown as { id: string; size: number; name: string }[];
  const fromBeads = beads.filter((b) => !joints0.some((j) => j.beadFeatureId === b.id)).map((b, i) => jointFromBead(b, joints0.length + i + 1));
  const joints = [...joints0, ...fromBeads];
  return { hash: documentHash(bodies), bodies, recs, flats, joints };
}

/** the prices on a geometry: saw list and plans (stock, saw cut), the cost model; re-run when a setting changes */
export function price(geo: ReturnType<typeof analyzeGeometry>, settings: FabSettings, fab: FabDocData = {}): Omit<FabResult, 'tijd'> {
  const saw = sawList(geo.recs);
  const M = settings.machines.zagen;
  const plans = sawPlans(saw, settings.materials.voorraad, { zaagsnede: M.zaagsnede, afkorten: M.afkorten, klem: M.klem, staafLengte: settings.materials.staafLengte });
  const nests = settings.rates.plaatModus === 'nest' ? nestGroups(geo.flats, settings) : undefined;
  const cost = costModel({ recs: geo.recs, saw, plans, flats: geo.flats, joints: geo.joints, settings, overrides: fab.kosten, vrij: fab.vrij, nests });
  return { ...geo, saw, plans, cost, settings: structuredClone(settings), settingsKey: settingsKey(settings) };
}

export function analyze(doc: Document, settings: FabSettings, fab: FabDocData = {}, opts: { rebuild?: (d: Document) => RebuildResult; kBron?: 'model' | 'din6935' } = {}): FabResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const r = price(analyzeGeometry(doc, fab, opts), settings, fab);
  return { ...r, tijd: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0 };
}

/** the weld plan names the bodies by their position on the saw list (pos 3) or the plate list (P2), and draws their boxes */
export function weldPlanInput(r: Pick<FabResult, 'recs' | 'saw' | 'flats' | 'bodies'>) {
  const label = new Map<string, string>();
  for (const l of r.saw) for (const k of l.keys) label.set(k, `pos ${l.pos}`);
  r.flats.forEach((f, i) => { if (!label.has(f.key)) label.set(f.key, `P${i + 1}`); });
  const names = new Map(r.recs.map((x) => [x.key, x.naam]));
  const naam = (k: string) => label.get(k) ?? names.get(k) ?? k;
  const shown = r.bodies.filter((b) => !b.path.length || b.path.length === 1);
  // the view looks along the smallest extent of the whole construction, as weldPlanPdf draws the two largest
  const glo = [Infinity, Infinity, Infinity], ghi = [-Infinity, -Infinity, -Infinity];
  for (const b of shown) for (let i = 0; i < b.soup.length; i += 3) for (let k = 0; k < 3; k++) { glo[k] = Math.min(glo[k], b.soup[i + k]); ghi[k] = Math.max(ghi[k], b.soup[i + k]); }
  const depth = [0, 1, 2].sort((a, c) => (ghi[a] - glo[a]) - (ghi[c] - glo[c]))[0];
  const along: [number, number, number] = [0, 0, 0];
  along[depth] = 1;
  const view = shown.map((b) => {
    const lo: [number, number, number] = [Infinity, Infinity, Infinity], hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < b.soup.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b.soup[i + k]); hi[k] = Math.max(hi[k], b.soup[i + k]); }
    // the sharp edges of the body for a real projection of the view (docs/37 ch. 9); the longest 1500 per body (CSG seams are short)
    const len = (e: { a: number[]; b: number[] }) => Math.hypot(e.a[0] - e.b[0], e.a[1] - e.b[1], e.a[2] - e.b[2]);
    const randen = sharpEdges(b, along).filter((e) => len(e) > 0.5).sort((x, y) => len(y) - len(x)).slice(0, 1500)
      .map((e) => [e.a, e.b] as [[number, number, number], [number, number, number]]);
    return { key: b.key, lo, hi, randen };
  });
  return { naam, view };
}

/** a rectangle nest of every material and thickness on the first standard sheet of the settings (plate mode 'nest') */
export function nestGroups(flats: FlatPart[], settings: FabSettings): Nest[] {
  const groups = new Map<string, number[]>();
  flats.forEach((f, i) => { if (f.betrouwbaar !== 'geen') { const k = `${f.materiaal}|${f.t}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(i); } });
  const sheet = settings.materials.platen.find((p) => !p.restplaat && p.materiaal === '*') ?? { id: 'std', l: 3000, b: 1500 };
  return [...groups.entries()].map(([k, idx]) => {
    const [mat, t] = k.split('|');
    const s = { ...defaultNestSettings(Number(t)), vlakken: [{ id: sheet.id, l: sheet.l, b: sheet.b }] };
    return nestRects(mat, Number(t), nestPiecesShape(flats.map((f, i) => (idx.includes(i) ? f : { ...f, n: 0 })), s.afstand), s);
  });
}
