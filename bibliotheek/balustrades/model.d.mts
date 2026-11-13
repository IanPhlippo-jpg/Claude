// types voor model.mjs (gebruikt door src/qa/qaBalustrades.test.ts); bewust ruim gehouden
export type Punt = [number, number, number];
export interface Deel { rol: string; prof: string; koop?: string; a: Punt; b: Punt; zaag?: [number, number]; zin?: [number, number]; seg: number; cat: string; L?: number; gaten?: { z: number }[] }
export interface Paneel { rol: string; pts: Punt[]; w: number; h: number; dikte: number; seg: number; opbouw?: string; patroon?: string }
export interface Segment { i: number; p0: Punt; Lh: number; L3: number; alfa: number; draai: number; posten?: number[]; veld3?: number; punt(t: number): Punt }
export interface Opening { wat: string; mm: number; max: number; klim?: boolean; trap?: boolean }
export interface Ontwerp {
  k: Record<string, any>; S: Record<string, any>; st: Record<string, any>; segs: Segment[]; meldingen: string[];
  staanders: { seg: number; t: number; p: Punt }[]; delen: Deel[]; panelen: Paneel[]; klemmen: { p: Punt }[]; platen: { p: Punt; w: number; h: number; t: number; gaten: number[][] }[];
  ankers: { p: Punt }[]; openingen: Opening[]; hoeken: number; knikken: number; lengte: number; vereist: number; klim: boolean;
  staander?: { prof: string; a: number; aMax: number; voet: Record<string, any> }; afstand: number; glas: Record<string, any> | null; ankerType: string; ankerAfstand?: number; treden?: number;
}
export declare const STD: Record<string, any>;
export declare const GRENZEN: Record<string, [number, number]>;
export declare const VORMEN: Record<string, string>;
export declare function ontwerp(keuzes?: Record<string, any>): Ontwerp;
export declare function lengtes(d: Deel): { hart: number; lang: number };
