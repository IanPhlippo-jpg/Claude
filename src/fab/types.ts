/**
 * The shared workshop core of the three fabrication extensions (docs/36 F0): Frames+ (saw list, bar nesting, weld
 * joints), Laser & Bend (flat patterns, DXF, nesting, bend sequence) and Quote (cost model, quote PDF). Pure
 * TypeScript: no React, no store. The tabs in src/app/fab/ are thin layers on top.
 */

/** a price or a time with where it comes from (F0-3): a value Ian types himself is no assumption and carries today's date */
export interface Sourced<T> {
  waarde: T;
  eenheid: string;
  bron: string;
  aanname: boolean;
  /** yyyy-mm-dd */
  datum: string;
}

/** what a body is for the workshop (F0-4) */
export type FabKind = 'profiel' | 'plaat' | 'gezette plaat' | 'koop' | 'onbekend';
/** where the kind comes from: a feature (Structural Member, Base Flange), the geometry, or Ian */
export type Herkomst = 'feature' | 'herkend' | 'handmatig';

/** a body in a part or in a component of an assembly, with the hash of the geometry it was taken from (F0-6) */
export interface BodySource {
  /** the part document name */
  part: string;
  bodyId: string;
  /** the component ids from the assembly root down to the part (empty for a part) */
  path: string[];
  hash: string;
}

/** a recognized body: kind, origin, the reason in words, and the stock profile or the sheet thickness */
export interface Recognition {
  key: string;
  bron: BodySource;
  naam: string;
  /** how many times this body occurs (component count in an assembly) */
  aantal: number;
  soort: FabKind;
  herkomst: Herkomst;
  reden: string;
  /** stock profile id (profiel) */
  profielId?: string;
  /** other profiles within the tolerance: a choice for Ian, never a silent guess */
  kandidaten?: string[];
  /** the two miters lie in different planes (saw list column Verstek) */
  verstekGedraaid?: boolean;
  /** the body may also be a plate (a solid strip): offered as the other choice */
  alternatief?: 'plaat';
  /** sheet thickness (plaat, gezette plaat) */
  t?: number;
  /** saw length = the longest side along the axis (profiel), mm */
  lengte?: number;
  hoek1?: number;
  hoek2?: number;
  /** holes through the body (profiel: drilled holes; plaat: inner contours) */
  gaten?: number;
  materiaal: string;
  dichtheid: number;
  volume: number;
  /** the outer surface for coating (mm²) */
  oppervlak: number;
  /** the mesh only (no exact kernel): a looser tolerance and a warning */
  gefacetteerd: boolean;
  warning?: string;
}

/** a manual override of the recognition (kept in doc.fab, survives a rebuild) */
export interface FabOverride {
  soort: FabKind;
  profielId?: string;
  t?: number;
}

export type CostCategory = 'profiel' | 'plaat' | 'koop' | 'zagen' | 'boren' | 'laser' | 'plooien' | 'lassen' | 'afwerking' | 'overhead' | 'vrij';

/** one cost line (F0-5): amounts in euro cent, rounded once on the line */
export interface CostLine {
  id: string;
  categorie: CostCategory;
  omschrijving: string;
  hoeveelheid: number;
  eenheid: string;
  eenheidsprijsCent: number;
  bedragCent: number;
  bron: string;
  aanname: boolean;
  /** the bodies this line comes from (Recognition.key) */
  herkomst: string[];
  /** a value Ian overrode, with his reason */
  override?: { bedragCent: number; reden: string };
  /** a price was missing: the line is 0 and the total is incomplete (never a silent zero) */
  geenPrijs?: boolean;
  /** set-up cost: shared over the series */
  instel?: boolean;
  /** the date of the oldest price the line rests on (yyyy-mm-dd) */
  prijsDatum?: string;
}

export type VatRate = 21 | 6 | 0;
export type VatRegime = 'normaal' | 'verlegd' | 'vrijgesteld';

export interface QuoteLine {
  omschrijving: string;
  hoeveelheid: number;
  eenheid: string;
  prijsCent: number;
  btw: VatRate;
  /** cost line ids this quote line groups */
  uit: string[];
  /** the line is placing work on site (needed for 6 %) */
  plaatsing?: boolean;
}

export interface Customer {
  naam: string;
  adres: string;
  btwNummer?: string;
  soort: 'particulier' | 'bedrijf';
  werfadres?: string;
  /** the three conditions of the 6 % rate, ticked by Ian */
  zesProcent?: { woningOuderDan10: boolean; prive: boolean; geplaatstEindgebruiker: boolean };
}

export interface Quote {
  id: string;
  nummer: string;
  revisie: string;
  /** yyyy-mm-dd */
  datum: string;
  geldigTot: string;
  klant: Customer;
  onderwerp: string;
  regels: QuoteLine[];
  btwRegime: VatRegime;
  voorwaarden: string;
  betaling: string;
  levertermijn: string;
  configuratie?: string;
  bevroren?: { op: string; hash: string; settingsKey?: string; kostenregels: CostLine[]; uurloon: number };
}

export interface WeldJoint {
  id: string;
  bodies: [string, string];
  soort: 'hoeklas' | 'I' | 'V' | 'HV' | 'Y' | 'X' | 'prop';
  maat: { letter: 'a' | 'z' | 's'; mm: number };
  lengte: number;
  tweezijdig: boolean;
  rondom: boolean;
  montage: boolean;
  onderbroken: { n: number; l: number; e: number } | null;
  proces: string;
  positie: string;
  niveau: 'B' | 'C' | 'D';
  stap: number;
  hechten: boolean;
  bevestigd: boolean;
  beadFeatureId?: string;
  /** the joint point (for the order rules and the weld plan view) */
  punt?: [number, number, number];
  /** how many times the part with this joint occurs (assembly) */
  aantal?: number;
  /** the quality level was set by Ian (otherwise it follows the execution class) */
  niveauHandmatig?: boolean;
  /** compared with the model at the last analysis: a confirmed joint whose bodies no longer touch, or whose length changed */
  status?: 'nieuw' | 'vervallen' | 'lengte gewijzigd';
}

export type ExecutionClass = 'geen' | 'EXC1' | 'EXC2' | 'EXC3';

/** what a document keeps of the fabrication extensions (file format 5, key doc.fab) */
export interface FabDocData {
  overrides?: Record<string, FabOverride>;
  /** cost overrides per cost line id */
  kosten?: Record<string, { bedragCent: number; reden: string }>;
  welds?: WeldJoint[];
  /** the weld order was dragged by Ian: a new proposal never overwrites it without asking */
  lasvolgordeHandmatig?: boolean;
  exc?: ExecutionClass;
  quotes?: Quote[];
  /** the customer of the next quote */
  klant?: Customer;
  /** quantity of the series */
  reeks?: number;
  /** the VAT rate and the placing mark Ian set per quote line (by its text) */
  regelBtw?: Record<string, { btw?: VatRate; plaatsing?: boolean }>;
  /** free lines of the quote (text and amount excluding VAT) */
  vrij?: { omschrijving: string; bedragCent: number }[];
}
