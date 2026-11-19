/**
 * Recognition of profiles and plates (docs/36 F0-4, 2.3). A proposal with its reason in words; Ian can override it,
 * and an override in doc.fab survives a rebuild. Rules:
 *   profile from a feature   the Frames feature made the body (bodyMeta kind 'member')
 *   profile recognized       a constant section along the longest axis (end cuts excepted) that fits a catalogue
 *                            profile: outer sizes within 0.3 mm, wall within 0.3 mm, area within 2 % of the nominal
 *                            section or of the same section drawn without corner radii (a simplified model)
 *   plate                    two parallel planar main faces at a constant distance t, every other face perpendicular,
 *                            t a commercial thickness
 *   bent sheet               the part is sheet metal (Base Flange / Convert to Sheet Metal)
 *   purchased                the part property fab.soort = koop
 *   unknown                  everything else; it comes as a manual line in the cost, never silently at zero
 * Two catalogue profiles within the tolerance give a choice (kandidaten), not a silent guess.
 */
import type { FabBody } from './bodies';
import type { FabKind, FabOverride, Recognition } from './types';
import { CATALOG, isCommercialThickness, profileById, profileOfMember, type SectieKlasse, type StockProfile } from './catalog';
import { chain, cross, dot, eigenSym3, planeGroups, extent, frameOf, loopArea, minRect, normalScatter, section, surface, triangle, triCount, unit, volume, type P2, type V3 } from './geom';
import { mm, num } from './format';

export interface SectionInfo {
  klasse: SectieKlasse;
  a: number;
  b: number;
  /** wall (hollow) from the hole size */
  t: number;
  area: number;
  holes: number;
}

/** the shape class and sizes of a section */
export function classifySection(segs: [P2, P2][], netArea: number): SectionInfo | null {
  const loops = chain(segs, 1e-3);
  if (!loops.length) return null;
  const withArea = loops.map((l) => ({ l, A: loopArea(l) }));
  const outers = withArea.filter((x) => x.A > 0).sort((x, y) => y.A - x.A);
  const holes = withArea.filter((x) => x.A < 0).sort((x, y) => x.A - y.A);
  if (outers.length !== 1) return null;
  const outer = outers[0];
  const r = minRect(outer.l);
  const cx = outer.l.reduce((s, p) => s + p.x, 0) / outer.l.length, cy = outer.l.reduce((s, p) => s + p.y, 0) / outer.l.length;
  const dist = outer.l.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const round = outer.l.length >= 12 && Math.max(...dist) - Math.min(...dist) < 0.01 * (dist.reduce((s, x) => s + x, 0) / dist.length);
  const rectOuter = outer.A > 0.95 * r.a * r.b;
  let t = 0;
  if (holes.length) {
    const hr = minRect(holes[0].l);
    t = Math.min((r.a - hr.a) / 2, (r.b - hr.b) / 2);
  }
  const klasse: SectieKlasse = holes.length ? (round ? 'rondHol' : rectOuter ? 'rechthoekHol' : 'open') : round ? 'rondVol' : rectOuter ? 'rechthoekVol' : 'open';
  if (holes.length > 1) return { klasse: 'open', a: r.a, b: r.b, t, area: netArea, holes: holes.length };
  return { klasse, a: round ? 2 * (dist.reduce((s, x) => s + x, 0) / dist.length) : r.a, b: round ? 2 * (dist.reduce((s, x) => s + x, 0) / dist.length) : r.b, t, area: netArea, holes: holes.length };
}

/** catalogue profiles that fit a section, best first, with the relative area deviation */
export function matchProfiles(s: SectionInfo, faceted: boolean): { p: StockProfile; dev: number; scherp: boolean }[] {
  const tolL = faceted ? 0.6 : 0.3, tolA = faceted ? 0.03 : 0.02;
  const out: { p: StockProfile; dev: number; scherp: boolean }[] = [];
  for (const p of CATALOG) {
    if (p.klasse !== s.klasse) continue;
    if (Math.abs(p.a - s.a) > tolL || Math.abs(p.b - s.b) > tolL) continue;
    if ((s.klasse === 'rechthoekHol' || s.klasse === 'rondHol') && Math.abs(p.t - s.t) > tolL) continue;
    const dNom = Math.abs(s.area - p.oppervlak) / p.oppervlak, dSharp = Math.abs(s.area - p.oppervlakScherp) / p.oppervlakScherp;
    const dev = Math.min(dNom, dSharp);
    if (dev <= tolA) out.push({ p, dev, scherp: dSharp < dNom });
  }
  return out.sort((x, y) => x.dev - y.dev);
}

/**
 * The axis of a bar: the smallest eigenvector of the normal scatter, refined on the side faces only (normals within 6°
 * of square to the first estimate). The end faces bias the first estimate: a solid 40 x 40 x 2395 with one end mitred
 * 45° tilts it 0,34°, read as angles 0,3° / 45,3° (docs/36 LF4, the stored TD-01). Side normals are square to the axis.
 */
export function barAxis(s: Float64Array): V3 {
  const d0 = eigenSym3(normalScatter(s)).vectors[0];
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let side = 0;
  for (let i = 0; i < triCount(s); i++) {
    const { n, area } = triangle(s, i);
    if (Math.abs(dot(n, d0)) > 0.1) continue;
    side += area;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c] += area * n[r] * n[c];
  }
  if (!side) return d0;
  const d = eigenSym3(m).vectors[0];
  // the refined axis only replaces a close first estimate (a plate or a block has no side faces to refine on)
  return Math.abs(dot(d, d0)) > 0.99 ? (dot(d, d0) < 0 ? [-d[0], -d[1], -d[2]] : d) : d0;
}

/** the axis of a bar, its extent and a section analysis along it */
export function barAnalysis(b: Pick<FabBody, 'soup'>) {
  const d = barAxis(b.soup);
  const [lo, hi] = extent(b.soup, d);
  const L = hi - lo;
  const fr = [0.2, 0.35, 0.5, 0.65, 0.8].map((f) => section(b.soup, d, lo + f * L));
  const areas = fr.map((x) => x.area);
  const med = [...areas].sort((x, y) => x - y)[2];
  const same = areas.filter((a) => Math.abs(a - med) <= 0.01 * Math.abs(med)).length;
  const pick = fr[areas.findIndex((a) => Math.abs(a - med) <= 0.01 * Math.abs(med))] ?? fr[2];
  return { d, lo, hi, L, constant: same >= 4 && med > 0, sec: pick, info: same >= 4 ? classifySection(pick.segs, pick.area) : null };
}

/** two parallel planar main faces at a constant distance, all other faces perpendicular (docs/36 2.3) */
export function plateAnalysis(b: Pick<FabBody, 'soup' | 'faces'>): { n: V3; t: number; lo: number; hi: number } | { reason: string } {
  const main = b.faces.filter((f) => !f.curved).sort((x, y) => y.area - x.area)[0];
  if (!main) return { reason: 'geen vlak hoofdvlak' };
  const n = unit(main.normal as V3);
  const levels: number[] = [];
  for (let i = 0; i < triCount(b.soup); i++) {
    const t = triangle(b.soup, i);
    if (t.area < 1e-3) continue;
    const c = Math.abs(dot(t.n, n));
    if (c > 0.9995) levels.push(dot(t.p[0], n));
    else if (c > 0.02) return { reason: 'niet alle zijvlakken staan loodrecht op het hoofdvlak' };
  }
  levels.sort((x, y) => x - y);
  const lo = levels[0], hi = levels[levels.length - 1];
  if (levels.some((w) => Math.abs(w - lo) > 0.01 && Math.abs(w - hi) > 0.01)) return { reason: 'de dikte is niet overal gelijk (trap of verdieping)' };
  return { n, t: hi - lo, lo, hi };
}

/**
 * A plate-like body whose contour (the section at mid thickness) is more than a plain rectangle: an inner contour, a
 * rounded or cut corner. docs/37 N-3: this is read from the contour, because the kernel marks the small end faces of a
 * long bar as curved.
 */
export function contourShaped(b: Pick<FabBody, 'soup'>, pl: { n: V3; t: number; hi: number }): boolean {
  const { u, v } = frameOf(pl.n);
  const polys = chain(section(b.soup, pl.n, pl.hi - pl.t / 2, { u, v }).segs, 1e-4).filter((p) => p.length >= 3);
  if (polys.length !== 1) return polys.length > 1;
  const p = polys[0];
  let corners = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[(i + p.length - 1) % p.length], c = p[i], d = p[(i + 1) % p.length];
    const e1 = { x: c.x - a.x, y: c.y - a.y }, e2 = { x: d.x - c.x, y: d.y - c.y };
    const l1 = Math.hypot(e1.x, e1.y), l2 = Math.hypot(e2.x, e2.y);
    if (l1 < 1e-6 || l2 < 1e-6) continue;
    if (Math.abs(e1.x * e2.y - e1.y * e2.x) / (l1 * l2) > 0.02) corners++;
  }
  return corners !== 4;
}

/** drilled holes across a bar: curved faces whose cylinder axis is not along the bar, coaxial walls counted once */
export function crossHoles(b: Pick<FabBody, 'soup' | 'faces'>, d: V3): { c: V3; axis: V3 }[] {
  const found: { c: V3; axis: V3 }[] = [];
  for (const f of b.faces) {
    if (!f.curved || f.triangles.length < 6) continue;
    const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const ti of f.triangles) { const t = triangle(b.soup, ti); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c] += t.area * t.n[r] * t.n[c]; }
    const ev = eigenSym3(m);
    // a cylinder: the normals span a plane (two large eigenvalues of similar size), not a flat face marked curved
    if (ev.values[1] < 0.2 * ev.values[2]) continue;
    const axis = ev.vectors[0];
    if (Math.abs(dot(axis, d)) > 0.3) continue;
    const c = f.centroid as V3;
    const same = found.find((h) => Math.abs(dot(h.axis, axis)) > 0.999 && Math.hypot(...cross(unit([c[0] - h.c[0], c[1] - h.c[1], c[2] - h.c[2]]), h.axis)) < 0.02);
    if (!same) found.push({ c, axis });
  }
  return found;
}

/** the miter angle of each end: the angle between the end face and the square cut (0 = square, 45 = miter) */
function endAngles(b: Pick<FabBody, 'soup' | 'faces'>, d: V3, lo: number, hi: number): [number, number] {
  const groups = planeGroups(b.soup, 1).filter((g) => Math.abs(dot(g.n, d)) > 0.1);
  const ang = (end: number) => {
    const g = groups.filter((x) => Math.abs(dot(x.centroid, d) - end) < 0.5 * (hi - lo)).sort((x, y) => Math.abs(dot(x.centroid, d) - end) - Math.abs(dot(y.centroid, d) - end) || y.area - x.area)[0];
    return g ? Math.round(Math.acos(Math.min(1, Math.abs(dot(g.n, d)))) * 180 / Math.PI * 10) / 10 : 0;
  };
  return [ang(lo), ang(hi)];
}

/**
 * Whether the two miters lie in different planes (docs/37 B-16): the normals of the two end faces, seen along the bar,
 * point in different directions. Square ends (or one square end) are never twisted.
 */
export function miterTwisted(b: Pick<FabBody, 'soup'>, d: V3, lo: number, hi: number): boolean {
  const groups = planeGroups(b.soup, 1).filter((g) => Math.abs(dot(g.n, d)) > 0.1 && Math.abs(dot(g.n, d)) < 0.995);
  const end = (w: number) => groups.filter((g) => Math.abs(dot(g.centroid, d) - w) < 0.5 * (hi - lo)).sort((x, y) => y.area - x.area)[0];
  const a = end(lo), c = end(hi);
  if (!a || !c) return false;
  const proj = (n: V3): V3 => { const k = dot(n, d); return unit([n[0] - k * d[0], n[1] - k * d[1], n[2] - k * d[2]]); };
  const pa = proj(a.n), pc = proj(c.n);
  // same plane of the miter: the projected normals are parallel (same or opposite); twisted otherwise
  return Math.hypot(...cross(pa, pc)) > 0.2;
}

/**
 * A canonical description of a bar for the saw list (docs/36 W1, L2.7): end planes and holes in the frame of the bar,
 * the smallest of the rigid turns of the bar (4, or 8 for a square section). Two mirror-image pieces differ.
 */
export function barSignature(b: Pick<FabBody, 'soup' | 'faces'>, d: V3, lo: number, hi: number, sec: { u: V3; v: V3; angle: number; square: boolean }): string {
  const cs = Math.cos(sec.angle), sn = Math.sin(sec.angle);
  const u: V3 = unit([sec.u[0] * cs + sec.v[0] * sn, sec.u[1] * cs + sec.v[1] * sn, sec.u[2] * cs + sec.v[2] * sn]);
  const v = cross(d, u);
  const L = hi - lo;
  const local = (p: V3): V3 => [dot(p, d) - lo, dot(p, u), dot(p, v)];
  const dir = (n: V3): V3 => [dot(n, d), dot(n, u), dot(n, v)];
  const centre = local(b.faces.reduce((s, f) => [s[0] + f.centroid[0] * f.area, s[1] + f.centroid[1] * f.area, s[2] + f.centroid[2] * f.area] as V3, [0, 0, 0] as V3).map((x) => x / Math.max(1e-9,
    b.faces.reduce((s, f) => s + f.area, 0))) as V3);
  const holes = crossHoles(b, d).map((h) => ({ c: local(h.c), a: dir(h.axis) }));
  // the end planes, merged per normal (a face cut into fragments by the triangulation counts once)
  const endMap = new Map<string, { n: V3; c: V3; a: number }>();
  for (const g of planeGroups(b.soup, 1).filter((x) => Math.abs(dot(x.n, d)) > 0.1)) {
    const k = g.n.map((x) => Math.round(x * 20)).join(',') + (dot(g.centroid, d) - lo < L / 2 ? 'a' : 'b');
    const e = endMap.get(k);
    if (!e) endMap.set(k, { n: g.n, c: g.centroid, a: g.area });
    else { const A = e.a + g.area; e.c = [(e.c[0] * e.a + g.centroid[0] * g.area) / A, (e.c[1] * e.a + g.centroid[1] * g.area) / A, (e.c[2] * e.a + g.centroid[2] * g.area) / A]; e.a = A; }
  }
  const ends = [...endMap.values()].filter((e) => e.a >= 10).map((e) => ({ c: local(e.c), n: dir(e.n) }));
  const turns: ((p: V3, isDir: boolean) => V3)[] = [
    (p) => p, (p, isDir) => [p[0], isDir ? -p[1] : 2 * centre[1] - p[1], isDir ? -p[2] : 2 * centre[2] - p[2]],
    (p, isDir) => [isDir ? -p[0] : L - p[0], p[1], isDir ? -p[2] : 2 * centre[2] - p[2]], (p, isDir) => [isDir ? -p[0] : L - p[0], isDir ? -p[1] : 2 * centre[1] - p[1], p[2]],
  ];
  if (sec.square) for (const t of [...turns]) turns.push((p, isDir) => { const q = t(p, isDir); return [q[0], isDir ? q[2] : centre[1] + (q[2] - centre[2]),
    isDir ? -q[1] : centre[2] - (q[1] - centre[1])]; });
  const r = (x: number, step: number) => { const y = Math.round(x / step) * step; return (Object.is(y, -0) ? 0 : y).toFixed(1); };
  const sig = (t: (p: V3, isDir: boolean) => V3) => [
    ...holes.map((h) => { const c = t(h.c, false), a = t(h.a,
      true); const s = Math.sign(a[1] || a[2]) || 1; return `h${r(c[0], 0.5)},${r(c[1] - centre[1], 1)},${r(c[2] - centre[2], 1)},${r(s * a[1], 0.05)},${r(s * a[2], 0.05)}`; }),
    ...ends.map((e) => { const c = t(e.c, false), n = t(e.n, true); return `e${r(c[0] / Math.max(1, L), 0.25)},${r(n[0], 0.02)},${r(n[1], 0.02)},${r(n[2], 0.02)}`; }),
  ].sort().join(';');
  return turns.map(sig).sort()[0];
}

/** catalogue profiles a name designates: "UNP 100", "koker 110 x 50 (x 5)", "buis Ø80 x 5", "platstaal 40 x 20", "IPE 120" */
export function profileFromName(name: string): StockProfile[] {
  const n = name.toLowerCase().replace(/,/g, '.');
  const nums = (s: string) => s.split(/\s*x\s*/).map(Number);
  const out: StockProfile[] = [];
  for (const m of n.matchAll(/\b(unp|upn|ipe)\s*(\d+)/g)) out.push(...CATALOG.filter((p) => p.vorm === (m[1] === 'ipe' ? 'IPE' : 'UPN') && p.a === Number(m[2])));
  for (const m of n.matchAll(/\bkoker\s*(\d+(?:\.\d+)?(?:\s*x\s*\d+(?:\.\d+)?){1,2})/g)) {
    const [a, b, t] = nums(m[1]);
    out.push(...CATALOG.filter((p) => p.vorm === 'koker' && !p.id.endsWith('/H') && p.a === a && p.b === b && (t === undefined || p.t === t)));
  }
  for (const m of n.matchAll(/\bbuis\s*ø?\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/g)) out.push(...CATALOG.filter((p) => p.vorm === 'buis' && p.a === Number(m[1]) && p.t === Number(m[2])));
  for (const m of n.matchAll(/\bplatstaal\s*(\d+)\s*x\s*(\d+)/g)) out.push(...CATALOG.filter((p) => p.vorm === 'platstaal' && p.a === Number(m[1]) && p.t === Number(m[2])));
  return out;
}

/** the material of a profile or a laser plate: steel, stainless, aluminium and the like */
export const isMetal = (m: string) =>
  /staal|steel|\bs\d{3}|\bst\s?\d{2}\b|dx5\d|alu|rvs|inox|aisi|ijzer|iron|metaal|metal|messing|brass|koper|copper|zink|brons|bronze|titaa?n|cortenstaal|weathering|\b\d{4}\s*alloy|hardox/i.test(m);

const kindOfProp = (p: string | undefined): FabKind | null => (p === 'koop' ? 'koop' : p === 'profiel' ? 'profiel' : p === 'plaat' ? 'plaat' : null);

/** recognize one body; an override of Ian wins */
export function recognize(b: FabBody, override?: FabOverride): Recognition & { kenmerk?: string } {
  const vol = volume(b.soup);
  const base: Recognition = {
    key: b.key, bron: { part: b.part, bodyId: b.bodyId, path: b.path, hash: b.hash }, naam: b.naam, aantal: b.aantal, soort: 'onbekend', herkomst: 'herkend', reden: '',
    materiaal: b.materiaal, dichtheid: b.dichtheid, volume: vol, oppervlak: surface(b.soup), gefacetteerd: !b.exact, ...(b.warning ? { warning: b.warning } : {}),
  };
  const bar = barAnalysis(b);
  const [h1, h2] = endAngles(b, bar.d, bar.lo, bar.hi);
  const holes = crossHoles(b, bar.d).length;
  const asProfile = (p: StockProfile, herkomst: Recognition['herkomst'], reden: string, extra: Partial<Recognition> = {}): Recognition & { kenmerk?: string } => {
    // the material of a mitered piece: the longest side less the miter triangles (half the section depth x tan angle)
    const [a1, a2] = b.meta?.kind === 'member' ? [b.meta.angle1, b.meta.angle2] : [h1, h2];
    const tan = (deg: number) => Math.tan((Math.min(80, Math.abs(deg)) * Math.PI) / 180);
    const kg = (p.kgPerM.waarde * (bar.L - (p.a / 2) * (tan(a1) + tan(a2)))) / 1000;
    const kgVol = vol * 1e-9 * b.dichtheid;
    const warning = Math.abs(kg - kgVol) > 0.02 * kg ? `massa uit het model ${num(kgVol, 2)} kg tegen ${num(kg, 2)} kg uit kg/m` +
      ` (${num(100 * (kgVol - kg) / kg, 1)} %)` : undefined;
    const rect = bar.info ? minRect(bar.sec.segs.flatMap((s) => s)) : { angle: 0 };
    const kenmerk = barSignature(b, bar.d, bar.lo, bar.hi, { u: bar.sec.u, v: bar.sec.v, angle: rect.angle, square: Math.abs(p.a - p.b) < 0.5 });
    return { ...base, soort: 'profiel', herkomst, reden, profielId: p.id, lengte: bar.L, hoek1: h1, hoek2: h2, gaten: holes, oppervlak: p.omtrek * bar.L, warning, kenmerk,
      verstekGedraaid: miterTwisted(b, bar.d, bar.lo, bar.hi), ...extra };
  };
  // Ian's choice first
  if (override) {
    if (override.soort === 'profiel' && profileById(override.profielId)) return asProfile(profileById(override.profielId)!, 'handmatig', 'handmatig gekozen');
    const pl = plateAnalysis(b);
    return { ...base, soort: override.soort, herkomst: 'handmatig', reden: 'handmatig gekozen', t: override.t ?? ('t' in pl ? pl.t : undefined) };
  }
  const prop = kindOfProp(b.eigenschap);
  if (prop === 'koop') return { ...base, soort: 'koop', herkomst: 'handmatig', reden: 'eigenschap fab.soort = koop' };
  if (b.meta?.kind === 'member') {
    const p = profileOfMember(b.meta.description);
    if (p) {
      const r = asProfile(p, 'feature', `uit de feature: ${p.naam}`);
      // the feature length is the length of the path segment; the saw length is the longest side (docs/36 W2)
      if (Math.abs(b.meta.length - bar.L) > 0.5) r.reden += `; padlengte ${mm(b.meta.length)}, langste zijde ${mm(bar.L)}`;
      return { ...r, hoek1: Math.round(b.meta.angle1 * 10) / 10, hoek2: Math.round(b.meta.angle2 * 10) / 10 };
    }
    return { ...base, reden: `profiel uit de feature (${b.meta.description}) zit niet in de catalogus`, lengte: bar.L };
  }
  if (b.meta?.kind === 'bead') return { ...base, reden: 'lasrups (wordt als lassen gerekend)' };
  if (b.sheet) return { ...base, soort: 'gezette plaat', herkomst: 'feature', reden: `plaatwerk, dikte ${mm(b.sheet.t)} mm`, t: b.sheet.t };
  // a hose, a rubber pedal or a plastic cover is no steel profile or plate, whatever its shape (docs/37 O1.2)
  if (b.materiaal.trim() && !isMetal(b.materiaal)) return { ...base, reden: `materiaal "${b.materiaal}" is geen metaal: geen profiel of plaat` };
  // a bar with a constant section that fits the catalogue
  if (bar.constant && bar.info) {
    const s = bar.info;
    const solid = s.klasse === 'rechthoekVol' || s.klasse === 'rondVol' || s.klasse === 'open';
    if (!solid || bar.L >= 3 * s.a) {
      const m = matchProfiles(s, !b.exact);
      if (m.length) {
        const best = m[0];
        const why = `${best.p.naam}, doorsnede ${num(100 * best.dev, 1)} % afwijking${best.scherp ? ' (getekend zonder hoekstralen)' : ''}`;
        // a solid strip may as well be a laser-cut plate (docs/37 B-9): with holes or rounded corners it is a plate
        // first, otherwise flat bar first; the other one stays a choice, never a silent guess
        if (s.klasse === 'rechthoekVol') {
          const pl0 = plateAnalysis(b);
          // shaped from the contour, never from faces.curved: the kernel marks the end faces of a long bar as curved (N-3)
          const shaped = holes > 0 || ('t' in pl0 && contourShaped(b, pl0));
          if ('t' in pl0 && isCommercialThickness(pl0.t) && shaped) {
            return { ...base, soort: 'plaat', reden: `plaat ${mm(pl0.t)} mm met gaten of afgeronde hoeken (ook ${best.p.naam} mogelijk)`, t: Math.round(pl0.t * 100) / 100,
              kandidaten: m.map((x) => x.p.id) };
          }
          return asProfile(best.p, 'herkend', `${why}; ook een plaat van ${mm(s.b)} mm mogelijk`, { kandidaten: m.map((x) => x.p.id), alternatief: 'plaat' });
        }
        return asProfile(best.p, 'herkend', why, m.length > 1 ? { kandidaten: m.map((x) => x.p.id) } : {});
      }
    }
  }
  // the name of the part or the piece names the profile ("Onderframe (UNP 100, gelast)") and the outer size fits: a
  // simplified drawing (a tube drawn solid, a channel with other wall sizes); recognized, with the deviation as a warning
  if (bar.constant && bar.info && bar.L >= 3 * bar.info.b) {
    const named = profileFromName(`${b.naam} ${b.part}`);
    const s = bar.info;
    const fit = named.filter((p) => Math.abs(p.a - s.a) <= 1.5 && Math.abs(p.b - s.b) <= 1.5);
    // several walls fit a name without a wall thickness ("koker 40 x 40"): a choice for Ian, no profile picked (B-9)
    if (fit.length > 1) return { ...base, reden: `"${b.part}" noemt ${fit.length} profielen met buitenmaat ${mm(s.a)} x ${mm(s.b)}: kies er een`, lengte: bar.L, kandidaten: fit.map((x) => x.id) };
    if (fit.length) {
      const p = fit[0];
      const dev = (s.area - p.oppervlak) / p.oppervlak;
      return asProfile(p, 'herkend', `${p.naam} uit de naam "${b.part}", buitenmaat ${mm(s.a)} x ${mm(s.b)} past`,
        { warning: `getekende doorsnede ${num(s.area, 0)} mm² tegen ${num(p.oppervlak, 0)} mm² (${num(100 * dev, 0)} %): vereenvoudigd model, kg uit de tabel`,
          ...(fit.length > 1 ? { kandidaten: fit.map((x) => x.id) } : {}) });
    }
  }
  const pl = plateAnalysis(b);
  if ('t' in pl) {
    if (isCommercialThickness(pl.t)) return { ...base, soort: 'plaat', reden: `plaat ${mm(pl.t)} mm`, t: Math.round(pl.t * 100) / 100 };
    return { ...base, reden: `vlak stuk van ${mm(pl.t)} mm: geen handelsdikte`, t: pl.t };
  }
  if (bar.constant && bar.info) return { ...base, reden: `constante doorsnede ${mm(bar.info.a)} x ${mm(bar.info.b)}, geen profiel uit de catalogus`, lengte: bar.L };
  return { ...base, reden: pl.reason };
}

export function recognizeAll(bodies: FabBody[], overrides: Record<string, FabOverride> = {}): (Recognition & { kenmerk?: string })[] {
  return bodies.map((b) => recognize(b, overrides[b.key]));
}

/** a frame vector helper for callers that need the frame of a section */
export { frameOf };
