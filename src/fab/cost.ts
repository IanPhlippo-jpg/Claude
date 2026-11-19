/**
 * The cost model (docs/36 L-9, P-8, 5.3, O1): cost lines for profiles, plates, purchased parts, operations, finishing
 * and overhead, every line with its source and whether it rests on an assumption. Amounts in cents, rounded once per
 * line; the total is the sum of the rounded lines. A body without a cost (unknown kind, purchased part without a price,
 * a material without a price) gives a line "no price" and the total is marked incomplete: never a silent zero.
 * Excluding VAT; the margin and the VAT come on the quote.
 */
import type { CostCategory, CostLine, Recognition, Sourced, WeldJoint } from './types';
import type { FabSettings } from './settings';
import type { SawLine } from './sawList';
import type { BarPlan } from './barNest';
import type { FlatPart } from './flat';
import { profileById, materialKey } from './catalog';
import { usedSheet } from './nest';
import { euro, toCent } from './format';
import { num } from './format';

export interface CostInput {
  recs: Recognition[];
  saw: SawLine[];
  plans: BarPlan[];
  /** one flat part per plate position, with its count */
  flats: FlatPart[];
  joints: WeldJoint[];
  settings: FabSettings;
  overrides?: Record<string, { bedragCent: number; reden: string }>;
  /** the nested sheets per material and thickness (plate mode 'nest', P5.2) */
  nests?: import('./nest').Nest[];
  /** free lines Ian added */
  vrij?: { omschrijving: string; bedragCent: number }[];
  /** spacing used around a plate for its material share (rectangle mode), mm */
  spacing?: number;
}

export interface CostModel {
  regels: CostLine[];
  totaalCent: number;
  onvolledig: boolean;
  aannames: number;
  /** lines without a price */
  geenPrijs: number;
  /** the bodies that got no cost (unknown kind): the "No cost assigned" folder */
  geenKost: Recognition[];
}

const oldest = (s: Sourced<unknown>[]) => s.map((x) => x.datum).sort()[0];

function line(id: string, categorie: CostCategory, omschrijving: string, hoeveelheid: number, eenheid: string, eenheidsprijs: number | null, bronnen: Sourced<unknown>[], herkomst: string[],
  instel = false): CostLine {
  const geen = eenheidsprijs === null || !Number.isFinite(eenheidsprijs);
  return {
    id, categorie, omschrijving, hoeveelheid: Math.round(hoeveelheid * 1e4) / 1e4, eenheid,
    // the amount is the quantity times the unit price as shown (whole cents), rounded once (docs/37 P3)
    eenheidsprijsCent: geen ? 0 : toCent(eenheidsprijs!), bedragCent: geen ? 0 : toCent((Math.round(hoeveelheid * 1e4) / 1e4) * toCent(eenheidsprijs!) / 100),
    bron: geen ? 'geen prijs in de instellingen' : bronnen.map((b) => b.bron).filter((v, i, a) => a.indexOf(v) === i).join('; '),
    aanname: geen ? false : bronnen.some((b) => b.aanname), herkomst, ...(geen ? { geenPrijs: true } : {}), ...(instel ? { instel: true } : {}),
    ...(bronnen.length ? { prijsDatum: oldest(bronnen) } : {}),
  };
}

/** the hours lines are hours x the hourly rate; the rate is a source of its own */
const labour = (s: FabSettings, id: string, cat: CostCategory, text: string, hours: number, tijd: Sourced<unknown>[], keys: string[], instel = false) =>
  line(id, cat, text, hours, 'u', s.rates.uurloon.waarde, [...tijd, s.rates.uurloon], keys, instel);

export function costModel(inp0: CostInput): CostModel {
  // a weld joint whose bodies no longer touch is not costed (docs/37 B-8)
  // a lapsed joint and an unticked short weld (not load-bearing) are not costed
  const inp = { ...inp0, joints: inp0.joints.filter((j) => j.status !== 'vervallen' && !(j.kort && !j.meetellen)) };
  const S = inp.settings, M = S.machines, regels: CostLine[] = [];
  const profiles = inp.recs.filter((r) => r.soort === 'profiel');
  // ---- material: profiles
  for (const id of [...new Set(inp.saw.map((l) => l.profielId))]) {
    const p = profileById(id)!;
    const lines = inp.saw.filter((l) => l.profielId === id);
    const keys = lines.flatMap((l) => l.keys);
    const perM = S.materials.profielM[id];
    const prijsM = perM ? perM.waarde : p.kgPerM.waarde * S.materials.profielKg.waarde;
    const bron = perM ? [perM] : [p.kgPerM, S.materials.profielKg];
    if (S.rates.materiaalModus === 'aangekocht') {
      const plan = inp.plans.find((x) => x.profielId === id);
      // new bars whole; a bar or a remnant from stock at the set price too (it has a value), the remnant for the length used (docs/37 B-12)
      const kerf = S.machines.zagen.zaagsnede;
      const nieuw = plan?.staven.filter((b) => b.bron === 'nieuw') ?? [], voorraad = plan?.staven.filter((b) => b.bron === 'voorraad') ?? [],
        rest = plan?.staven.filter((b) => b.bron === 'restant') ?? [];
      const m = (nieuw.reduce((t, b) => t + b.lengte, 0) + voorraad.reduce((t, b) => t + b.lengte, 0) + rest.reduce((t, b) => t + b.stukken.reduce((u, x) => u + x.l + kerf, 0), 0)) / 1000;
      const parts = [`${nieuw.length} hele staven nieuw`, voorraad.length ? `${voorraad.length} uit voorraad` : '', rest.length ? `${rest.length} restant${rest.length === 1 ? '' : 'en'}`
        : ''].filter(Boolean);
      regels.push(line(`profiel:${id}`, 'profiel', `${p.naam}: ${parts.join(', ')} (aangekocht${voorraad.length || rest.length ? ', voorraad aan de ingestelde prijs' : ''})`, m, 'm', prijsM,
        bron, keys));
    } else {
      const m = lines.reduce((t, l) => t + l.n * l.zaaglengte, 0) / 1000;
      regels.push(line(`profiel:${id}`, 'profiel', `${p.naam}: ${num(m, 2)} m + ${S.rates.afvalProfiel.waarde} % afval (verbruikt)`, m * (1 + S.rates.afvalProfiel.waarde / 100), 'm', prijsM,
        [...bron, S.rates.afvalProfiel], keys));
    }
  }
  // ---- operations on the profiles: sawing, drilling, welding
  const pieces = inp.saw.reduce((t, l) => t + l.n, 0);
  if (pieces) {
    const schuin = inp.saw.filter((l) => l.hoek1 > 0.05 || l.hoek2 > 0.05).reduce((t, l) => t + l.n, 0);
    const keys = inp.saw.flatMap((l) => l.keys);
    regels.push(labour(S, 'zagen', 'zagen', `Zagen: ${pieces} stuks${schuin ? `, waarvan ${schuin} schuin` : ''}`, pieces * M.zagen.perStuk.waarde + schuin * M.zagen.perSchuin.waarde,
      [M.zagen.perStuk, ...(schuin ? [M.zagen.perSchuin] : [])], keys));
    const gaten = inp.saw.reduce((t, l) => t + l.n * l.gaten, 0);
    if (gaten) {
      regels.push(M.boren.modus === 'uitbesteed'
        ? line('boren', 'boren', `Buislaser: ${gaten} gaten`, gaten, 'gat', M.boren.buislaserGat.waarde, [M.boren.buislaserGat], keys)
        : labour(S, 'boren', 'boren', `Boren: ${gaten} gaten`, gaten * M.boren.perGat.waarde, [M.boren.perGat], keys));
    }
  }
  if (inp.joints.length) {
    const keys = [...new Set(inp.joints.flatMap((j) => j.bodies))];
    const m = inp.joints.reduce((t, j) => t + (j.onderbroken ? (j.onderbroken.n * j.onderbroken.l) : j.lengte) * (j.tweezijdig ? 2 : 1) * (j.aantal ?? 1), 0) / 1000;
    const nj = inp.joints.reduce((t, j) => t + (j.aantal ?? 1), 0);
    regels.push(labour(S, 'hechten', 'lassen', `Passen en hechten: ${nj} verbindingen`, nj * M.lassen.perVerbinding.waarde, [M.lassen.perVerbinding], keys));
    regels.push(labour(S, 'lassen', 'lassen', `Lassen: ${num(m, 2)} m las`, m * M.lassen.perMeter.waarde, [M.lassen.perMeter], keys));
  }
  if (profiles.length || inp.joints.length) regels.push(labour(S, 'afwerken', 'afwerking', 'Afwerken (slijpen, ontbramen)', M.afwerken.perConstructie.waarde, [M.afwerken.perConstructie], [], true));
  // ---- plates: material share, cutting, pierces, finishing of the laser part, bending
  for (const [i, f] of inp.flats.entries()) {
    const pos = `P${i + 1}`;
    const keys = f.keys ?? [f.key];
    const mk = materialKey(f.materiaal);
    const kg = S.materials.plaatKg[mk] ?? null;
    const sp = inp.spacing ?? Math.max(5, f.t);
    const rectKg = ((f.bbox.l + sp) * (f.bbox.b + sp) * f.t * f.dichtheid) / 1e9;
    // P5.2: the share of the nested sheets (the sheets of the group shared out by net area), or the bounding rectangle + waste
    const nest = S.rates.plaatModus === 'nest' ? inp.nests?.find((x) => x.materiaal === f.materiaal && Math.abs(x.t - f.t) < 1e-6 && x.bladen.length) : undefined;
    if (nest) {
      const groupArea = inp.flats.filter((x) => x.materiaal === f.materiaal && Math.abs(x.t - f.t) < 1e-6 && x.betrouwbaar !== 'geen').reduce((t, x) => t + x.n * x.oppervlak, 0);
      // the used part of each sheet: the remnant of the last sheet goes back to stock and is not charged (docs/37 N-6)
      const used = nest.bladen.map((b) => usedSheet(b, nest.instellingen.rand));
      const sheetKg = used.reduce((t, u) => t + (u.l * u.b * f.t * f.dichtheid) / 1e9, 0);
      const share = groupArea ? (f.n * f.oppervlak) / groupArea : 0;
      const last = nest.bladen[nest.bladen.length - 1], lu = used[used.length - 1];
      const [rl, rb] = lu.l < last.l ? [last.l - lu.l, last.b] : [last.l, last.b - lu.b];
      const rest = rl * rb > 1 ? `; restplaat ${num(rl, 0, false)} x ${num(rb, 0, false)} terug naar voorraad` : '';
      regels.push(line(`plaat:${f.key}`, 'plaat', `${pos} ${f.naam}: plaat ${mk} ${num(f.t, f.t % 1 ? 1 : 0)} mm, ${num(share * 100, 0)} % van ${nest.bladen.length} geneste` +
        ` bla${nest.bladen.length === 1 ? 'd' : 'den'} (aandeel van het gebruikte deel${rest})`,
        share * sheetKg, 'kg', kg ? kg.waarde : null, kg ? [kg] : [], keys));
    } else {
      regels.push(line(`plaat:${f.key}`, 'plaat',
        `${pos} ${f.naam}: plaat ${mk} ${num(f.t, f.t % 1 ? 1 : 0)} mm, ${f.n} x ${num(rectKg, 2)} kg (omschreven rechthoek + ${S.rates.afvalPlaat.waarde} % afval)`,
        f.n * rectKg * (1 + S.rates.afvalPlaat.waarde / 100), 'kg', kg ? kg.waarde : null, kg ? [kg, S.rates.afvalPlaat] : [], keys));
    }
    if (f.materiaalAanname) { const l = regels[regels.length - 1]; l.aanname = true; l.bron = `geen materiaal in het model, als S235 gerekend; ${l.bron}`; }
    const snijM = (f.snijlengte.buiten + f.snijlengte.binnen) / 1000;
    if (M.laser.modus === 'uitbesteed') {
      const band = M.laser.snijM.find((b) => f.t <= b.tot + 1e-9);
      regels.push(line(`snijden:${f.key}`, 'laser', `${pos} snijden: ${f.n} x ${num(snijM, 3)} m`, f.n * snijM, 'm', band ? band.prijs.waarde : null, band ? [band.prijs] : [], keys));
      regels.push(line(`insteken:${f.key}`, 'laser', `${pos} insteken: ${f.n} x ${f.insteken}`, f.n * f.insteken, 'insteek', M.laser.insteek.waarde, [M.laser.insteek], keys));
    } else {
      // own machine: time = cut length / speed + pierces x pierce time; no speed for the material and thickness: no price
      const v = M.laser.snelheid.find((x) => x.materiaal === mk && Math.abs(x.t - f.t) < 1e-6);
      const it = M.laser.insteekTijd, mu = M.laser.machineUur;
      const h = v && it ? f.n * ((snijM * 1000) / v.mmPerMin / 60 + (f.insteken * it.waarde) / 3600) : NaN;
      regels.push(line(`snijden:${f.key}`, 'laser', `${pos} snijden eigen machine: ${f.n} x ${num(snijM, 3)} m`, Number.isFinite(h) ? h : 0, 'u', Number.isFinite(h) && mu ? mu.waarde : null,
        mu && it ? [mu, it] : [], keys));
    }
    regels.push(labour(S, `laserdeel:${f.key}`, 'laser', `${pos} afwerken laserdeel: ${f.n} stuks`, f.n * M.laser.laserdeel.waarde, [M.laser.laserdeel], keys));
    if (f.plooien.length) {
      const z = f.n * f.plooien.length;
      if (M.plooien.modus === 'eigen') {
        regels.push(labour(S, `plooien:${f.key}`, 'plooien', `${pos} plooien: ${z} zettingen`, z * M.plooien.perZettingEigen.waarde, [M.plooien.perZettingEigen], keys));
        regels.push(labour(S, `plooiinstel:${f.key}`, 'plooien', `${pos} kantbank instellen`, M.plooien.instelEigen.waarde, [M.plooien.instelEigen], keys, true));
      } else {
        const p = M.plooien.perZettingUit, ins = M.plooien.instelUit;
        regels.push(line(`plooien:${f.key}`, 'plooien', `${pos} plooien (uitbesteed): ${z} zettingen`, z, 'zetting', p ? p.waarde : null, p ? [p] : [], keys));
        regels.push(line(`plooiinstel:${f.key}`, 'plooien', `${pos} instellen (uitbesteed)`, 1, 'positie', ins ? ins.waarde : null, ins ? [ins] : [], keys, true));
      }
    }
  }
  if (inp.flats.length && M.laser.modus === 'uitbesteed' && M.laser.startkost) regels.push(line('laserstart', 'laser', 'Startkost lasersnijder', 1, 'order', M.laser.startkost.waarde,
    [M.laser.startkost], [], true));
  // ---- purchased parts
  const koop = inp.recs.filter((r) => r.soort === 'koop');
  for (const name of [...new Set(koop.map((r) => r.bron.part))]) {
    const rs = koop.filter((r) => r.bron.part === name), n = rs.reduce((t, r) => t + r.aantal, 0);
    const p = S.materials.koop[name];
    regels.push(line(`koop:${name}`, 'koop', `${name}`, n, 'st', p ? p.waarde : null, p ? [p] : [], rs.map((r) => r.key)));
  }
  // ---- finishing
  const area = inp.recs.filter((r) => r.soort === 'profiel' || r.soort === 'plaat' || r.soort === 'gezette plaat').reduce((t, r) => t + (r.oppervlak * r.aantal) / 1e6, 0);
  const kgSteel = inp.saw.reduce((t, l) => t + l.kgTotaal, 0) + inp.flats.reduce((t, f) => t + f.kg * f.n, 0);
  const F = S.finishing;
  if (F.afwerking === 'poedercoat' && area > 0) {
    regels.push(line('coat', 'afwerking', `Poedercoaten: ${num(area, 2)} m²`, area, 'm²', F.poedercoatM2.waarde, [F.poedercoatM2], []));
    regels.push(line('coatrit', 'afwerking', 'Rit naar de lakkerij', 1, 'rit', F.ritLakkerij.waarde, [F.ritLakkerij], [], true));
  }
  if (F.afwerking === 'verzinken' && kgSteel > 0) regels.push(line('verzinken', 'afwerking', `Thermisch verzinken: ${num(kgSteel, 1)} kg`, kgSteel, 'kg', F.verzinkenKg.waarde, [F.verzinkenKg], []));
  // ---- unknown: the "No cost assigned" folder, one line each, incomplete
  const geenKost = inp.recs.filter((r) => r.soort === 'onbekend');
  for (const r of geenKost) regels.push({ ...line(`onbekend:${r.key}`, 'vrij', `Geen kost toegekend: ${r.naam} (${r.bron.part})`, r.aantal, 'st', null, [], [r.key]),
    bron: r.reden || 'onbekend stuk' });
  // ---- overhead on what is there
  if (regels.some((l) => l.bedragCent > 0)) {
    regels.push(line('transport', 'overhead', 'Transport', 1, 'rit', F.transport.waarde, [F.transport], [], true));
    regels.push(line('verpakking', 'overhead', 'Verpakking', 1, 'st', F.verpakking.waarde, [F.verpakking], [], true));
    // the percentages follow Ian's overrides of the other lines (docs/37 P3)
    const sub = regels.reduce((t, l) => t + (inp.overrides?.[l.id]?.bedragCent ?? l.bedragCent), 0) / 100;
    // the amount is the percentage of the subtotal, rounded once (docs/37 N-5); the percentage is in the text
    const pct = (id: string, naam: string, p: typeof F.garantiePct) =>
      line(id, 'overhead', `${naam} ${num(p.waarde, p.waarde % 1 ? 1 : 0)} % van ${euro(toCent(sub))}`, 1, 'post', (sub * p.waarde) / 100, [p], []);
    regels.push(pct('garantie', 'Garantie', F.garantiePct), pct('verzekering', 'Verzekering', F.verzekeringPct));
  }
  for (const [i, v] of (inp.vrij ?? []).entries()) regels.push({ ...line(`vrij:${i}`, 'vrij', v.omschrijving, 1, 'st', v.bedragCent / 100, [{ waarde: v.bedragCent, eenheid: '€',
    bron: 'vrije regel van de gebruiker', aanname: false, datum: '' }], []), prijsDatum: undefined });
  // ---- overrides of Ian (kept over a recalculation, marked)
  for (const l of regels) { const o = inp.overrides?.[l.id]; if (o) { l.override = o; l.bedragCent = o.bedragCent; } }
  return summarize(regels, geenKost);
}

export function summarize(regels: CostLine[], geenKost: Recognition[] = []): CostModel {
  return {
    regels,
    totaalCent: regels.reduce((t, l) => t + l.bedragCent, 0),
    onvolledig: regels.some((l) => l.geenPrijs && !l.override),
    aannames: regels.filter((l) => l.aanname && !l.override).length,
    geenPrijs: regels.filter((l) => l.geenPrijs && !l.override).length,
    geenKost,
  };
}

/** cost per piece in a series of q: set-up lines shared over the series, the rest per piece (O1.5) */
export function perPiece(m: CostModel, q: number): number {
  return Math.round(m.regels.reduce((t, l) => t + (l.instel ? l.bedragCent / Math.max(1, q) : l.bedragCent), 0));
}

/** the groups of the Cost Manager (docs/36 6.2) */
export const COST_GROUPS: { naam: string; cats: CostCategory[] }[] = [
  { naam: 'Material', cats: ['profiel', 'plaat', 'koop'] },
  { naam: 'Operations', cats: ['zagen', 'boren', 'laser', 'plooien', 'lassen'] },
  { naam: 'Finishing', cats: ['afwerking'] },
  { naam: 'Overhead', cats: ['overhead'] },
];
