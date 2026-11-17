// types voor bereken.mjs
import type { Ontwerp } from './model.mjs';
export interface Controle { groep: string; wat: string; formule: string; waarde: number; grens: number; benut: number; oordeel: 'groen' | 'oranje' | 'rood' | 'info'; bron: string; uitleg?: string }
export interface Wind { qp: number; z: number; f: number; cpSt: number; phi: number; dicht: boolean; psiW: number; psiQ: number; cp: { A: number; B: number; C: number; D: number } }
export declare function berekening(o: Ontwerp): { controles: Controle[]; oordeel: 'groen' | 'oranje' | 'rood'; q: { q: number; Q: number; naam: string }; wind: Wind | null; nakijken: { id: string; wat: string }[] };
export declare const BENUT: number;
export declare function lasW(P: Record<string, any>, a: number): number;
export declare function keel(P: Record<string, any>): number;
export declare function keelDun(t: number): number;
export declare function windLast(k: Record<string, any>, lijnLengte?: number | null): Wind | null;
export declare function combineer(Mq: number, Mw: number, w: Wind | null): { M: number; welke: string; M1: number; M2: number };
export declare function armen(k: Record<string, any>): { st: number; anker: number; voet: number; trap: number };
export declare function ankerVoor(k: Record<string, any>, klein?: boolean): string;
export declare function randBreuk(d: number, hef: number, c1: number, s: number): { V0: number; groep: number; VRd: number };
export declare function glasKlemReken(k: Record<string, any>, G: Record<string, any>, wg: number, hg: number): { sig: number; sigP: number; sigW: number; beff: number; Mp: number };
export declare function glasUReken(k: Record<string, any>, G: Record<string, any>, wPlaat?: number): { sig: number; d: number; beff: number; arm: number; he: number };
export declare function hEff(G: Record<string, any>, omega?: number): number;
export declare function nakijkLijst(o: Ontwerp): { id: string; wat: string }[];
export declare function conformiteit(o: Ontwerp, B: { oordeel: string }): { kort: string; sterkte: string; niet: { id: string; wat: string }[]; open: { id: string; wat: string }[]; vrijgegeven: boolean; label: string };
export declare function maxAfstand(k: Record<string, any>, P: Record<string, any>, voet: Record<string, any>, anker: string): { a: number; wat: string; grenzen: Record<string, number> };
export declare function plaatVoor(P: Record<string, any>, zij: boolean, maat?: number | null, t?: number, perRij?: number): Record<string, any>;
