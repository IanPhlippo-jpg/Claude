// types voor model.mjs (gebruikt door src/qa/qaBalustrades.test.ts); bewust ruim gehouden
export type Punt = [number, number, number];
export interface Deel { rol: string; prof: string; koop?: string; a: Punt; b: Punt; zaag?: [number, number]; zin?: [number, number]; seg: number; cat: string; L?: number; gaten?: { z: number }[]; dak?: { hoek: number; horizontaal?: number; tegen?: boolean }; snijA?: Punt | null; snijB?: Punt | null }
export interface Paneel { rol: string; pts: Punt[]; w: number; h: number; dikte: number; seg: number; opbouw?: string; patroon?: string; uv?: [number, number][] | null; hA?: number; hB?: number; schuin?: number }
export interface DakEinde { kant: 'begin' | 'eind'; seg: number; hoek: number; muur: number; spleet: number; xs: number; xk: number; xkE: number; tKnik: number; top0: number; topWand: number; nodig: boolean; past: boolean; muurplaat: boolean; beschikbaar: number; x110: number; thE: number; tanE: number }
export interface Segment { i: number; p0: Punt; d: Punt; N: Punt; Lh: number; L3: number; alfa: number; draai: number; posten?: number[]; veld3?: number; velden?: { ta: number; tb: number; muurA: boolean; muurB: boolean }[]; steunen?: { t: number; w: number; muur?: boolean; knik?: boolean }[]; punt(t: number): Punt }
export interface Opening { wat: string; mm: number; max: number; klim?: boolean; trap?: boolean }
export interface Ontwerp {
  k: Record<string, any>; S: Record<string, any>; st: Record<string, any>; segs: Segment[]; meldingen: string[];
  staanders: { seg: number; t: number; p: Punt }[]; delen: Deel[]; panelen: Paneel[]; klemmen: { p: Punt; muur?: boolean }[]; platen: { rol: string; p: Punt; w: number; h: number; t: number; gaten: number[][]; z: [number, number] }[];
  ankers: { p: Punt }[]; muurAnkers: { p: Punt }[]; dak: DakEinde[]; dakKnikken: number; openingen: Opening[]; hoeken: number; knikken: number; lengte: number; vereist: number; klim: boolean;
  staander?: { prof: string; a: number; aMax: number; voet: Record<string, any> }; afstand: number; glas: Record<string, any> | null; ankerType: string; ankerAfstand?: number; treden?: number;
}
export declare const STD: Record<string, any>;
export declare const GRENZEN: Record<string, [number, number]>;
export declare const VORMEN: Record<string, string>;
export declare const MUURPLAAT: { b: number; t: number; onder: number };
export declare function verlaging(o: Ontwerp, s: Segment, t: number): { v: number; d: number; th: number; sig: number };
export declare function ontwerp(keuzes?: Record<string, any>): Ontwerp;
export declare function lengtes(d: Deel): { hart: number; lang: number };
