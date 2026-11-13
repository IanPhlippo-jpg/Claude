// types voor bereken.mjs
import type { Ontwerp } from './model.mjs';
export interface Controle { groep: string; wat: string; formule: string; waarde: number; grens: number; benut: number; oordeel: 'groen' | 'oranje' | 'rood' | 'info'; bron: string; uitleg?: string }
export declare function berekening(o: Ontwerp): { controles: Controle[]; oordeel: 'groen' | 'oranje' | 'rood'; q: { q: number; Q: number; naam: string } };
export declare const BENUT: number;
