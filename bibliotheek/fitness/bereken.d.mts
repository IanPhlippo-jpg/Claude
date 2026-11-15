// types voor bereken.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Controle { groep: string; wat: string; formule: string; benut: number; oordeel: 'groen' | 'oranje' | 'rood' | 'info'; bron: string; uitleg?: string }
export declare function berekening(o: any): { controles: Controle[]; oordeel: 'groen' | 'oranje' | 'rood' };
export declare function stabiliteit(o: any): { geval: string; richting: string; h: number; d: number; m: number; benut: number }[];
export declare function kantelTrek(o: any): { wat: string; F: number; h: number; richting: string; M: number; Mr: number; d: number; m: number; anker: boolean; benut: number }[];
