/**
 * Weld joints and the weld sequence (docs/36 L-5 to L-8, 3.5, 3.6). A joint is the data layer above the 3D weld bead:
 * type, size with its letter (a or z, always written), length, intermittent n x l (e), all around, field weld,
 * process (ISO 4063), position (ISO 6947), quality level (ISO 5817). Joints are proposed where two bodies touch (planar
 * faces against each other); a proposal stays a proposal until Ian confirms it.
 *
 * The sequence is a rule of thumb, no calculation of shrinkage or distortion (said on the weld plan). Each rule is a
 * function of its own, so a wrong order traces back to one rule. The program never writes that anything conforms to
 * EN 1090: from EXC2 a fixed warning goes on the weld plan.
 */
import { areaD, FillRule, intersectD, unionD, type PathsD } from 'clipper2-ts';
import type { FabBody } from './bodies';
import type { ExecutionClass, Recognition, WeldJoint } from './types';
import { cross, dot, frameOf, hull, planeGroups, triangle, unit, type V3 } from './geom';
import { profileById } from './catalog';
import { lineContact, LINE_GAP, shortWeld } from './weldEdge';

// ---- execution class (EN 1090-2, te verifiëren)

export const EXC_WARNING = (exc: ExecutionClass) => `${exc} vraagt een gecertificeerde FPC, WPS en lascoördinatie. Dit programma controleert dat niet.`;
export function excDefaults(exc: ExecutionClass): { niveau: 'B' | 'C' | 'D'; iso3834: string; wps: boolean; coordinatie: boolean; waarschuwing: string | null } {
  if (exc === 'EXC3') return { niveau: 'B', iso3834: 'deel 2', wps: true, coordinatie: true, waarschuwing: EXC_WARNING(exc) };
  if (exc === 'EXC2') return { niveau: 'C', iso3834: 'deel 3', wps: true, coordinatie: true, waarschuwing: EXC_WARNING(exc) };
  if (exc === 'EXC1') return { niveau: 'D', iso3834: 'deel 4', wps: false, coordinatie: false, waarschuwing: null };
  return { niveau: 'C', iso3834: '–', wps: false, coordinatie: false, waarschuwing: null };
}
/** EXC4 is not offered (outside Ian's work) */
export const EXC_CHOICES: ExecutionClass[] = ['geen', 'EXC1', 'EXC2', 'EXC3'];

/** a = 0.7 x the thinnest wall, rounded to 0.5, at least 3 mm (AANNAME, docs/36 L-6) */
export const proposedThroat = (wall: number) => Math.max(3, Math.round(0.7 * wall * 2) / 2);

// ---- contact faces

interface FaceInfo { n: V3; d: number; poly: PathsD; outer: number; area: number; c: V3; u: V3; v: V3 }

function faceInfos(b: FabBody): FaceInfo[] {
  const out: FaceInfo[] = [];
  for (const g of planeGroups(b.soup, 1)) {
    const n = unit(g.n);
    // one frame for a plane and its opposite face: the normal turned so its largest component is positive
    const big = [0, 1, 2].reduce((m, k) => (Math.abs(n[k]) > Math.abs(n[m]) ? k : m), 0);
    const { u, v } = frameOf(n[big] < 0 ? [-n[0], -n[1], -n[2]] : n);
    const tris: PathsD = g.tris.map((ti) => triangle(b.soup, ti).p.map((p) => ({ x: dot(p, u), y: dot(p, v) })));
    const poly = unionD(tris, [], FillRule.NonZero, 4);
    // the weld runs round the outside of the face: the perimeter of its convex hull (exact for a tube end or a miter;
    // for an open section such as a channel end it counts the outline across the opening, an overestimate)
    const h = hull(tris.flat());
    const outer = h.reduce((s2, p, i) => s2 + Math.hypot(h[(i + 1) % h.length].x - p.x, h[(i + 1) % h.length].y - p.y), 0);
    out.push({ n, d: g.d, poly, outer, area: g.area, c: g.centroid, u, v });
  }
  return out;
}

function box(b: FabBody) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < b.soup.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b.soup[i + k]); hi[k] = Math.max(hi[k], b.soup[i + k]); }
  return { lo, hi };
}

export interface Contact { a: string; b: string; lengte: number; punt: V3; area: number; /** touching along an edge only (one weld along it) */ lijn?: boolean }

/** bodies whose planar faces lie against each other (opposite normals, same plane, overlapping): one contact per pair */
export function contacts(bodies: FabBody[]): Contact[] {
  const infos = bodies.map(faceInfos), boxes = bodies.map(box);
  const out: Contact[] = [];
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const A = boxes[i], B = boxes[j];
    if ([0, 1, 2].some((k) => A.lo[k] > B.hi[k] + LINE_GAP || B.lo[k] > A.hi[k] + LINE_GAP)) continue;
    let best: Contact | null = null;
    for (const fa of infos[i]) for (const fb of infos[j]) {
      if (dot(fa.n, fb.n) > -0.999 || Math.abs(fa.d + fb.d) > 0.05) continue;
      const common = intersectD(fa.poly, fb.poly, FillRule.NonZero, 4);
      const area = common.reduce((s, p) => s + Math.abs(areaD(p)), 0);
      if (area < 1) continue;
      // the weld runs round the smaller face (a tube end on a plate: the outer perimeter of the tube)
      const lengte = fa.area <= fb.area ? fa.outer : fb.outer;
      // the joint point: the centre of the contact itself, not of the whole face (docs/37 P3)
      let cx = 0, cy = 0, w = 0;
      for (const pth of common) for (let q = 0; q < pth.length; q++) { const a0 = pth[q], a1 = pth[(q + 1) % pth.length],
        cr = a0.x * a1.y - a1.x * a0.y; cx += (a0.x + a1.x) * cr; cy += (a0.y + a1.y) * cr; w += cr; }
      const P2c = w ? { x: cx / (3 * w), y: cy / (3 * w) } : { x: dot(fa.c, fa.u), y: dot(fa.c, fa.v) };
      const nC = cross(fa.u, fa.v);
      const along = dot(fa.c, nC);
      const punt: V3 = [0, 1, 2].map((k) => fa.u[k] * P2c.x + fa.v[k] * P2c.y + nC[k] * along) as V3;
      if (!best || area > best.area) best = { a: bodies[i].key, b: bodies[j].key, lengte, punt, area };
    }
    if (best) { out.push(best); continue; }
    // no face against face: a contact along an edge only (a shelf between beams, a corner line), docs/37 ch. 9
    const e = lineContact(bodies[i], bodies[j]) ?? lineContact(bodies[j], bodies[i]);
    if (e) out.push({ a: bodies[i].key, b: bodies[j].key, lengte: e.lengte, punt: e.punt, area: 0, lijn: true });
  }
  return out;
}

/** the proposal (L-6): a fillet weld all around each contact, a from the thinnest wall, marked as proposal */
export function proposeJoints(bodies: FabBody[], recs: Recognition[], exc: ExecutionClass = 'geen'): WeldJoint[] {
  const wall = (key: string) => { const r = recs.find((x) => x.key === key); const p = profileById(r?.profielId); return p ? (p.vorm === 'rond' || p.vorm === 'vierkant'
    || p.vorm === 'platstaal' ? p.t : p.t) : r?.t ?? 3; };
  const niveau = excDefaults(exc).niveau;
  // a line contact has a concave corner on both sides: a fillet on each (two-sided). A thin plate (<= 10 mm) whose
  // seams together run over 400 mm gets stitches of 50 mm every 200 mm, not a continuous seam (AANNAME, the workshop
  // rule of the bibliotheek, docs/37 ch. 9)
  const thinPlate = (key: string) => { const r = recs.find((x) => x.key === key); return !!r && r.soort === 'plaat' && (r.t ?? 99) <= 10; };
  // ISO 2553 writes n x l (e) with e the gap between two stitches: 50 every 200 mm centre to centre is (150) (N-12)
  const stitch = (c: Contact) => (c.lijn && 2 * c.lengte > 400 && (thinPlate(c.a) || thinPlate(c.b)) ? { n: Math.max(2, Math.round(c.lengte / 200)), l: 50, e: 150 } : null);
  return contacts(bodies).map((c, k) => {
    const a = proposedThroat(Math.min(wall(c.a), wall(c.b))), kort = !!c.lijn && shortWeld(c.lengte, a);
    return {
      id: `W${k + 1}`, bodies: [c.a, c.b], soort: 'hoeklas', maat: { letter: 'a', mm: a },
      lengte: Math.round(c.lengte * 10) / 10, tweezijdig: !!c.lijn, rondom: !c.lijn, montage: false, onderbroken: stitch(c), proces: '135', positie: 'PB', niveau,
      stap: 0, hechten: true, bevestigd: false, punt: c.punt, ...(kort ? { kort: true, meetellen: false } : {}),
    };
  });
}

// ---- ISO 2553 system A as text (the drawing symbol is drawn from the same fields)

const SYMBOL: Record<WeldJoint['soort'], string> = { hoeklas: 'hoeklas', I: 'I-naad', V: 'V-naad', HV: 'HV-naad', Y: 'Y-naad', X: 'X-naad', prop: 'propnaad' };
/** the designation: size with its letter, symbol, length or n x l (e), all around, field weld, tail (process / position / level) */
export function weldText(j: WeldJoint): string {
  const size = `${j.maat.letter}${String(j.maat.mm).replace('.', ',')}`;
  const len = j.onderbroken ? `${j.onderbroken.n} x ${j.onderbroken.l} (${j.onderbroken.e})` : `${Math.round(j.lengte)}`;
  const marks = [j.rondom ? 'rondom' : '', j.montage ? 'montagelas' : '', j.tweezijdig ? 'tweezijdig' : ''].filter(Boolean).join(', ');
  return `${size} ${SYMBOL[j.soort]} ${len}${marks ? ` (${marks})` : ''} < ${j.proces} / ${j.positie} / ${j.niveau}`;
}

// ---- the sequence rules (docs/36 3.6), each on its own

type J = WeldJoint & { punt: V3 };
const centre = (js: J[]): V3 => js.reduce((s, j) => [s[0] + j.punt[0] / js.length, s[1] + j.punt[1] / js.length, s[2] + j.punt[2] / js.length] as V3, [0, 0, 0] as V3);
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** rule 1: tack everything first, from the outside in */
export const ruleTackOrder = (js: J[]): J[] => { const c = centre(js); return [...js].sort((a, b) => dist(b.punt, c) - dist(a.punt, c)); };
/** rule 3: butt welds before fillet welds (the largest shrinkage while the piece can still move) */
export const ruleButtFirst = (js: J[]): J[] => [...js].sort((a, b) => Number(a.soort === 'hoeklas') - Number(b.soort === 'hoeklas'));
/** rule 4: from the middle outwards */
export const ruleMiddleOut = (js: J[]): J[] => { const c = centre(js); return [...js].sort((a, b) => dist(a.punt, c) - dist(b.punt, c)); };
/** rule 5: alternate the sides of the symmetry plane (across the longest direction of the construction) */
export function ruleAlternate(js: J[]): J[] {
  const c = centre(js);
  const spread = [0, 1, 2].map((k) => Math.max(...js.map((j) => Math.abs(j.punt[k] - c[k]))));
  const ax = spread.indexOf(Math.max(...spread));
  const left = js.filter((j) => j.punt[ax] < c[ax] - 1e-6), right = js.filter((j) => j.punt[ax] > c[ax] + 1e-6), mid = js.filter((j) => Math.abs(j.punt[ax] - c[ax]) <= 1e-6);
  const out: J[] = [...mid];
  for (let i = 0; i < Math.max(left.length, right.length); i++) { if (left[i]) out.push(left[i]); if (right[i]) out.push(right[i]); }
  return out;
}
/** no two following finishing steps at the same corner: a joint at the same place as the one before moves one on */
export function ruleNotSameCorner(js: J[], minDist = 50): J[] {
  const out = [...js];
  for (let i = 1; i < out.length; i++) {
    if (dist(out[i].punt, out[i - 1].punt) >= minDist) continue;
    const k = out.findIndex((j, x) => x > i && dist(j.punt, out[i - 1].punt) >= minDist);
    if (k > 0) [out[i], out[k]] = [out[k], out[i]];
  }
  return out;
}
/** rule 6: a weld longer than 300 mm (AANNAME) in pieces with the backstep method */
export const backstepPieces = (lengte: number, max = 300) => (lengte > max ? Math.ceil(lengte / max) : 1);

export interface WeldStep { stap: number; soort: 'hechten' | 'aflassen'; joints: string[]; stukken?: number }

/** the proposed plan: one tack step, then the finishing welds by rules 3, 4, 5 and the corner rule */
export function proposeSequence(joints: WeldJoint[]): WeldStep[] {
  const js = joints.filter((j) => j.punt) as J[];
  if (!js.length) return [];
  const tack: WeldStep = { stap: 1, soort: 'hechten', joints: ruleTackOrder(js).map((j) => j.id) };
  const fin = ruleNotSameCorner(ruleAlternate(ruleButtFirst(ruleMiddleOut(js))));
  return [tack, ...fin.map((j, i) => ({ stap: i + 2, soort: 'aflassen' as const, joints: [j.id], stukken: backstepPieces(j.lengte) }))];
}

/** the joints numbered after the plan (stap of each joint = the finishing step) */
export function applySequence(joints: WeldJoint[], steps: WeldStep[]): WeldJoint[] {
  return joints.map((j) => ({ ...j, stap: steps.find((s) => s.soort === 'aflassen' && s.joints.includes(j.id))?.stap ?? j.stap }));
}

/** a weld bead feature of an older file gets a joint of the same size (L3.7) */
export function jointFromBead(bead: { id: string; size: number; name: string }, n: number): WeldJoint {
  return { id: `B${n}`, bodies: ['', ''], soort: 'hoeklas', maat: { letter: 'a', mm: bead.size }, lengte: 0, tweezijdig: false, rondom: false, montage: false, onderbroken: null,
    proces: '135', positie: 'PB', niveau: 'C', stap: n, hechten: true, bevestigd: true, beadFeatureId: bead.id };
}

/**
 * Ian's joints laid against the joints the model gives now (docs/37 B-8): a kept joint follows the length of its contact
 * and the quality level of the execution class (unless Ian set it); a joint whose bodies no longer touch is "vervallen"
 * (shown, not costed); a contact without a kept joint comes as a new proposal.
 */
export function reconcileJoints(saved: WeldJoint[], proposed: WeldJoint[], exc: ExecutionClass = 'geen'): WeldJoint[] {
  const niveau = excDefaults(exc).niveau;
  if (!saved.length) return proposed.map((j) => ({ ...j, niveau }));
  const pair = (j: WeldJoint) => [...j.bodies].sort().join('|');
  const byPair = new Map(proposed.map((j) => [pair(j), j]));
  const used = new Set<string>();
  const out: WeldJoint[] = saved.map((j) => {
    const now = byPair.get(pair(j));
    const lvl = j.niveauHandmatig ? j.niveau : niveau;
    if (!now) return { ...j, niveau: lvl, status: j.bodies[0] === '' ? undefined : 'vervallen' };
    used.add(pair(j));
    const changed = Math.abs(now.lengte - j.lengte) > 0.5;
    return { ...j, niveau: lvl, lengte: now.lengte, punt: now.punt, aantal: now.aantal, status: changed ? 'lengte gewijzigd' : undefined };
  });
  let n = Math.max(0, ...saved.map((j) => Number(j.id.replace(/\D/g, '')) || 0));
  for (const j of proposed) if (!used.has(pair(j))) out.push({ ...j, id: `W${++n}`, niveau, status: 'nieuw', bevestigd: false });
  return out;
}

/** the joints that are costed and printed on the weld plan (a lapsed joint is not) */
export const activeJoints = (js: WeldJoint[]) => js.filter((j) => j.status !== 'vervallen' && !(j.kort && !j.meetellen));

/**
 * L3.5: a weld step moved to place `to` of the order (dragged in the tree or the panel). Step 1 is tacking, the welds
 * are steps 2 … in the new order; every joint becomes confirmed so a new proposal never overwrites the order.
 * Returns null when nothing moves.
 */
export function reorderWelds(joints: WeldJoint[], order: string[], id: string, to: number): WeldJoint[] | null {
  const from = order.indexOf(id);
  if (from < 0 || to < 0 || to >= order.length || to === from) return null;
  const ids = [...order];
  ids.splice(from, 1);
  ids.splice(to, 0, id);
  return joints.map((j) => ({ ...j, bevestigd: true, stap: ids.includes(j.id) ? ids.indexOf(j.id) + 2 : j.stap }));
}
