/**
 * Fabrication Settings (docs/36 F0-2, 2.2, 5.2): per user, never in the repo and never in the model. Every price and
 * time is a Sourced record; the start values come from the price files in bibliotheek/ (looked up 2026-11-10 to
 * 2026-11-13, the source is named per value) and are AANNAME until Ian confirms them. Export and import as JSON.
 */
import type { Sourced, VatRegime } from './types';
import { monthsBetween, today } from './format';

/** the date the start values were looked up (bibliotheek/*\/prijzen.mjs) */
export const START_DATUM = '2026-11-13';
const A = <T>(waarde: T, eenheid: string, bron: string, datum = START_DATUM): Sourced<T> => ({ waarde, eenheid, bron, aanname: true, datum });

export interface Company {
  naam: string;
  rechtsvorm: string;
  adres: string;
  ondernemingsnummer: string;
  btwPlichtig: boolean;
  rpr: string;
  iban: string;
  bic: string;
  telefoon: string;
  email: string;
  website: string;
}

export interface StockBar { profielId: string; lengte: number; aantal: number; restant: boolean; locatie?: string }
export interface StockSheet { id: string; materiaal: string; t: number; l: number; b: number; voorraad: number; restplaat: boolean }
export type MachineMode = 'eigen' | 'uitbesteed';

export interface FabSettings {
  versie: 1;
  company: Company;
  rates: {
    uurloon: Sourced<number>;
    marge: Sourced<number>;
    afvalProfiel: Sourced<number>;
    afvalPlaat: Sourced<number>;
    /** profiles: meters used plus waste, or whole bars bought (the remnant goes back to stock) */
    materiaalModus: 'verbruikt' | 'aangekocht';
    /** plates: bounding rectangle plus waste, or the share of the nested sheet */
    plaatModus: 'rechthoek' | 'nest';
    btwRegime: VatRegime;
    /** a price older than this many months shows "check price" */
    prijsOuderMaanden: number;
  };
  materials: {
    /** steel bars per kg, used when a profile has no price per metre */
    profielKg: Sourced<number>;
    /** price per metre of a stock profile (id) */
    profielM: Record<string, Sourced<number>>;
    /** sheet price per kg per material key ('S235', 'DX51D', ...); null = no price (an RVS part gives "no price") */
    plaatKg: Record<string, Sourced<number> | null>;
    /** purchased parts: price per piece by part name (empty until Ian fills it in: a part without a price says so) */
    koop: Record<string, Sourced<number>>;
    voorraad: StockBar[];
    platen: StockSheet[];
    /** commercial bar length (mm) */
    staafLengte: number;
  };
  machines: {
    zagen: { modus: MachineMode; perStuk: Sourced<number>; perSchuin: Sourced<number>; zaagsnede: number; afkorten: number; klem: number };
    boren: { modus: MachineMode; perGat: Sourced<number>; buislaserGat: Sourced<number> };
    laser: { modus: MachineMode; snijM: { tot: number; prijs: Sourced<number> }[]; insteek: Sourced<number>; startkost: Sourced<number> | null;
      /** own machine: cutting speed mm/min per material and thickness, pierce time, machine rate */
      snelheid: { materiaal: string; t: number; mmPerMin: number }[]; insteekTijd: Sourced<number> | null; machineUur: Sourced<number> | null; laserdeel: Sourced<number> };
    plooien: { modus: MachineMode; perZettingEigen: Sourced<number>; instelEigen: Sourced<number>; perZettingUit: Sourced<number> | null; instelUit: Sourced<number> | null;
      werklengte: number; maxKracht: number; rm: number };
    lassen: { perVerbinding: Sourced<number>; perMeter: Sourced<number> };
    afwerken: { perConstructie: Sourced<number> };
  };
  finishing: {
    poedercoatM2: Sourced<number>;
    verzinkenKg: Sourced<number>;
    ritLakkerij: Sourced<number>;
    transport: Sourced<number>;
    verpakking: Sourced<number>;
    garantiePct: Sourced<number>;
    verzekeringPct: Sourced<number>;
    /** what the construction gets: nothing, powder coat or hot-dip galvanising */
    afwerking: 'geen' | 'poedercoat' | 'verzinken';
  };
  quote: {
    voorvoegsel: string;
    teller: { jaar: number; laatste: number };
    geldigDagen: number;
    voorschotPct: number;
    betaling: string;
    levertermijn: string;
    voorwaarden: string;
    verlegdTekst: string;
    vrijgesteldTekst: string;
  };
}

const FIT = 'bibliotheek/fitness/prijzen.mjs';
const UREN = 'bibliotheek/fitness/werkwijze.mjs UREN';

/** sample terms (docs/36 6.4): to be read by Ian and his accountant or a lawyer before use */
export const VOORBEELD_VOORWAARDEN = [
  'Voorbeeldtekst, na te lezen voor gebruik.',
  'De overeenkomst komt tot stand na ondertekening van deze offerte en ontvangst van het voorschot.',
  'Materiaalprijzen onder voorbehoud van wijzigingen bij de leverancier na de geldigheidsdatum.',
  'De leveringstermijn is een richttermijn vanaf akkoord en voorschot.',
  'Niet inbegrepen: elektriciteit, stellingen, afbraak, schilderwerk, vergunningen.',
  'Maten worden na akkoord ter plaatse opgemeten; afwijkingen van de werf worden verrekend.',
  'De goederen blijven eigendom van de verkoper tot volledige betaling.',
  'Klachten schriftelijk binnen 8 dagen na levering.',
  'Bij verkoop buiten de verkoopruimte of op afstand: het herroepingsrecht geldt doorgaans niet voor werk op maat.',
  'Belgisch recht is van toepassing; bevoegd is de rechtbank van de zetel van de verkoper.',
].join('\n');

export function defaultSettings(): FabSettings {
  return {
    versie: 1,
    company: { naam: '', rechtsvorm: '', adres: '', ondernemingsnummer: '', btwPlichtig: true, rpr: '', iban: '', bic: '', telefoon: '', email: '', website: '' },
    rates: {
      uurloon: A(45, '€/u', 'keuze van Ian (bibliotheek/*/prijzen.mjs); een kostendekkend tarief voor een zelfstandige in België is eerder € 55 tot 70/u (balustrades UURLOON_UITLEG)'),
      marge: A(30, '%', 'bibliotheek: 15 tot 35 % per soort'),
      afvalProfiel: A(15, '%', `${FIT} STANDAARD.afval`),
      afvalPlaat: A(20, '%', 'AANNAME Fable (docs/36 5.2)'),
      materiaalModus: 'verbruikt',
      plaatModus: 'rechthoek',
      btwRegime: 'normaal',
      prijsOuderMaanden: 6,
    },
    materials: {
      profielKg: A(1.8, '€/kg', `${FIT} BRON.staalKg (groothandel S235JRH)`),
      profielM: {},
      plaatKg: {
        S235: A(1.6, '€/kg', `${FIT} STANDAARD.plaatKg`),
        S355: A(1.6, '€/kg', `${FIT} STANDAARD.plaatKg (als S235)`),
        DX51D: A(1.6, '€/kg', `${FIT} STANDAARD.plaatKg (als S235, verzinkt niet apart geprijsd)`),
        'RVS 304': null,
        'RVS 430': null,
        aluminium: null,
        S690QL: null,
      },
      koop: {},
      voorraad: [],
      platen: [
        { id: 'std-1000x2000', materiaal: '*', t: 0, l: 2000, b: 1000, voorraad: 0, restplaat: false },
        { id: 'std-1250x2500', materiaal: '*', t: 0, l: 2500, b: 1250, voorraad: 0, restplaat: false },
        { id: 'std-1500x3000', materiaal: '*', t: 0, l: 3000, b: 1500, voorraad: 0, restplaat: false },
        { id: 'std-2000x4000', materiaal: '*', t: 0, l: 4000, b: 2000, voorraad: 0, restplaat: false },
      ],
      staafLengte: 6000,
    },
    machines: {
      zagen: { modus: 'eigen', perStuk: A(0.07, 'u/stuk', `${UREN}.zaag`), perSchuin: A(0.06, 'u/stuk', `${UREN}.verstek`), zaagsnede: 4, afkorten: 0, klem: 0 },
      boren: { modus: 'eigen', perGat: A(0.025, 'u/gat', `${UREN}.gat`), buislaserGat: A(0.4, '€/gat', `${FIT} buislaserGat`) },
      laser: {
        modus: 'uitbesteed',
        snijM: [
          { tot: 3, prijs: A(0.9, '€/m', `${FIT} snijM`) }, { tot: 6, prijs: A(1.4, '€/m', `${FIT} snijM`) },
          { tot: 10, prijs: A(2.2, '€/m', `${FIT} snijM`) }, { tot: 99, prijs: A(3.2, '€/m', `${FIT} snijM`) },
        ],
        insteek: A(0.25, '€/insteek', `${FIT} insteek`),
        startkost: null,
        snelheid: [],
        insteekTijd: null,
        machineUur: null,
        laserdeel: A(0.03, 'u/stuk', `${UREN}.laser`),
      },
      plooien: { modus: 'uitbesteed', perZettingEigen: A(0.02, 'u/zetting', `${UREN}.zet`), instelEigen: A(0.15, 'u/positie', `${UREN}.zet (instellen)`), perZettingUit: null, instelUit: null,
        werklengte: 3000, maxKracht: 1000, rm: 450 },
      lassen: { perVerbinding: A(0.12, 'u/verbinding', `${UREN}.verbinding`), perMeter: A(0.35, 'u/m', `${UREN}.lasM (a3 tot a4)`) },
      afwerken: { perConstructie: A(0.35, 'u/constructie', `${UREN}.afwerk`) },
    },
    finishing: {
      poedercoatM2: A(25, '€/m²', `${FIT} coatM2`),
      verzinkenKg: A(0.75, '€/kg', `${FIT} verzinkKg`),
      ritLakkerij: A(100, '€/rit', `${FIT} overhead.lakkerijRit`),
      transport: A(60, '€', `${FIT} overhead.transport`),
      verpakking: A(25, '€', `${FIT} overhead.verpakking.thuis`),
      garantiePct: A(3, '%', `${FIT} overhead.garantiePct`),
      verzekeringPct: A(1.5, '%', `${FIT} overhead.verzekeringPct`),
      afwerking: 'geen',
    },
    quote: {
      voorvoegsel: '',
      teller: { jaar: 0, laatste: 0 },
      geldigDagen: 30,
      voorschotPct: 30,
      betaling: 'Voorschot 30 % bij akkoord, saldo binnen 14 dagen na levering.',
      levertermijn: '4 tot 6 weken na akkoord en voorschot.',
      voorwaarden: VOORBEELD_VOORWAARDEN,
      verlegdTekst: '[Wettelijke vermelding btw verlegd, door de boekhouder te leveren]',
      vrijgesteldTekst: '[Wettelijke vermelding vrijstellingsregeling kleine ondernemingen, door de boekhouder te leveren]',
    },
  };
}

/** a value Ian types: no assumption, today's date */
export function confirmed<T>(s: Sourced<T>, waarde: T, now = today()): Sourced<T> {
  return { ...s, waarde, bron: 'ingevuld door de gebruiker', aanname: false, datum: now };
}

/** "check price": older than the limit (F0-3) */
export function isOld(s: Sourced<unknown>, months: number, now = today()): boolean {
  return monthsBetween(s.datum, now) > months;
}

/** every Sourced value in the settings, with its path (the AANNAME counter and the "check price" marks) */
export function sourcedValues(s: FabSettings): { pad: string; v: Sourced<unknown> }[] {
  const out: { pad: string; v: Sourced<unknown> }[] = [];
  const walk = (o: unknown, pad: string) => {
    if (!o || typeof o !== 'object') return;
    if ('waarde' in o && 'bron' in o && 'aanname' in o) { out.push({ pad, v: o as Sourced<unknown> }); return; }
    for (const [k, v] of Object.entries(o)) walk(v, pad ? `${pad}.${k}` : k);
  };
  walk(s, '');
  return out;
}

// ---- export and import (L1.5)

export function exportSettings(s: FabSettings): string {
  return JSON.stringify({ format: 'phlippo-fab-settings', ...s }, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** a deep merge of a stored or imported object onto the defaults: known keys only, types must match */
function mergeInto<T>(base: T, over: unknown): T {
  if (over === undefined) return base;
  if (base === null) return (over === null || isObj(over) ? over : base) as T;
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (!isObj(base)) return (typeof over === typeof base ? over : base) as T;
  if (!isObj(over)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) out[k] = mergeInto((base as Record<string, unknown>)[k], over[k]);
  return out as T;
}

export function importSettings(text: string): FabSettings {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new Error(`Geen geldige JSON: ${(e as Error).message}`); }
  if (!isObj(raw) || raw.format !== 'phlippo-fab-settings') throw new Error('Dit is geen bestand met werkplaatsinstellingen.');
  const { format: _f, ...rest } = raw;
  void _f;
  const s = mergeInto(defaultSettings(), rest);
  const prijsMap = (m: unknown) => isObj(m) ? Object.fromEntries(Object.entries(m).filter(([, v]) => v === null || (isObj(v) && typeof v.waarde === 'number'))) : {};
  s.materials.profielM = prijsMap(rest.materials && (rest.materials as Record<string, unknown>).profielM) as FabSettings['materials']['profielM'];
  s.materials.koop = prijsMap(rest.materials && (rest.materials as Record<string, unknown>).koop) as FabSettings['materials']['koop'];
  s.materials.plaatKg = { ...defaultSettings().materials.plaatKg, ...prijsMap(rest.materials && (rest.materials as Record<string, unknown>).plaatKg) } as FabSettings['materials']['plaatKg'];
  return s;
}

/** the settings kept in storage, merged onto the defaults (a key added in a later version gets its default) */
export function settingsFromStorage(text: string | null): FabSettings {
  if (!text) return defaultSettings();
  try { return importSettings(text); } catch { return defaultSettings(); }
}

// ---- the company (docs/36 6.4): form checks only, no lookup and no connection outside

/** Belgian enterprise number: 10 digits starting with 0 or 1, the last two = 97 - (first eight mod 97) */
export function validEnterpriseNumber(s: string): boolean {
  const d = s.replace(/^BE/i, '').replace(/\D/g, '');
  if (!/^[01]\d{9}$/.test(d)) return false;
  return 97 - (Number(d.slice(0, 8)) % 97) === Number(d.slice(8));
}

/** an IBAN by the ISO 13616 mod-97 check (BE: 16 characters) */
export function validIban(s: string): boolean {
  const v = s.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(v) || (v.startsWith('BE') && v.length !== 16)) return false;
  const moved = (v.slice(4) + v.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const ch of moved) r = (r * 10 + Number(ch)) % 97;
  return r === 1;
}

/** BE 0xxx.xxx.xxx */
export function formatEnterpriseNumber(s: string): string {
  const d = s.replace(/^BE/i, '').replace(/\D/g, '');
  return d.length === 10 ? `BE ${d.slice(0, 4)}.${d.slice(4, 7)}.${d.slice(7)}` : s;
}

const VENNOOTSCHAP = /\b(BV|NV|CV|CommV|VZW|SRL|SA)\b/i;

/** the mandatory company fields that are missing or not valid (an empty list: the quote is no draft) */
export function companyMissing(c: Company): string[] {
  const out: string[] = [];
  if (!c.naam.trim()) out.push('naam');
  if (!c.rechtsvorm.trim()) out.push('rechtsvorm');
  if (!c.adres.trim()) out.push('adres');
  if (!validEnterpriseNumber(c.ondernemingsnummer)) out.push('ondernemingsnummer');
  if (VENNOOTSCHAP.test(c.rechtsvorm) && !c.rpr.trim()) out.push('RPR');
  if (!validIban(c.iban)) out.push('IBAN');
  if (!c.telefoon.trim() && !c.email.trim()) out.push('contact');
  return out;
}
