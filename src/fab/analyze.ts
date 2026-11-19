/**
 * Everything the three extensions derive from a model, in one pass (docs/36 2.4): the bodies, their recognition, the
 * saw list and saw plans, the flat parts grouped into plate positions, the weld joints and the cost model, all carrying
 * the hash of the geometry they came from (F0-6: a result with another hash is out of date and blocks its export).
 */
import type { Document } from '../core/document/types';
import type { RebuildResult } from '../core/features/rebuild';
import type { FabDocData, Recognition, WeldJoint } from './types';
import type { FabSettings } from './settings';
import { documentBodies, documentHash, type FabBody } from './bodies';
import { recognizeAll } from './recognize';
import { sawList, sawPlans, type SawLine } from './sawList';
import type { BarPlan } from './barNest';
import { flatOfPlate, flatOfSheet, type FlatPart } from './flat';
import { proposeJoints, proposeSequence, applySequence } from './weld';
import { costModel, type CostModel } from './cost';
import { materialKey } from './catalog';

export interface FabResult {
  hash: string;
  bodies: FabBody[];
  recs: (Recognition & { kenmerk?: string })[];
  saw: SawLine[];
  plans: BarPlan[];
  flats: FlatPart[];
  joints: WeldJoint[];
  cost: CostModel;
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
    const sig = [f.materiaal, f.t.toFixed(2), f.bbox.l.toFixed(1), f.bbox.b.toFixed(1), f.oppervlak.toFixed(0), (f.snijlengte.buiten + f.snijlengte.binnen).toFixed(0), f.plooien.length].join('|');
    const same = out.find((x) => x.sig === sig && x.betrouwbaar !== 'geen' && f.betrouwbaar !== 'geen');
    if (same) same.n += f.n; else out.push({ ...f, sig });
  }
  return out.sort((a, b) => a.materiaal.localeCompare(b.materiaal) || a.t - b.t || b.oppervlak - a.oppervlak).map(({ sig: _s, ...f }) => { void _s; return f; });
}

export function analyze(doc: Document, settings: FabSettings, fab: FabDocData = {}, opts: { rebuild?: (d: Document) => RebuildResult; kBron?: 'model' | 'din6935' } = {}): FabResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const bodies = documentBodies(doc, opts.rebuild);
  const recs = recognizeAll(bodies, fab.overrides ?? {});
  const saw = sawList(recs);
  const M = settings.machines.zagen;
  const plans = sawPlans(saw, settings.materials.voorraad, { zaagsnede: M.zaagsnede, afkorten: M.afkorten, klem: M.klem, staafLengte: settings.materials.staafLengte });
  const flats = platePositions(bodies, recs, opts.kBron ?? 'din6935');
  // weld joints: Ian's (kept in the document) or the proposal for the profiles and plates that touch
  const weldable = bodies.filter((b) => { const r = recs.find((x) => x.key === b.key); return r && (r.soort === 'profiel' || r.soort === 'plaat'); });
  // (per part: the bodies of one part share its coordinates; a part used n times has its joints n times)
  const joints = fab.welds?.length ? fab.welds : (() => {
    const groups = new Map<string, FabBody[]>();
    for (const b of weldable) { const k = b.path.join('/'); (groups.get(k) ?? groups.set(k, []).get(k)!).push(b); }
    let n = 0;
    const j = [...groups.values()].flatMap((g) => proposeJoints(g, recs, fab.exc).map((x) => ({ ...x, id: `W${++n}`, aantal: g[0].aantal })));
    return applySequence(j, proposeSequence(j));
  })();
  const cost = costModel({ recs, saw, plans, flats, joints, settings, overrides: fab.kosten, vrij: fab.vrij });
  return { hash: documentHash(bodies), bodies, recs, saw, plans, flats, joints, cost, tijd: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0 };
}
