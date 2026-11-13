// types voor onderdelen.mjs (gebruikt door src/qa/qaBalustrades.test.ts)
export interface Stijl { id: string; naam: string; uitleg: string; handregel: string; spijl?: string; staaf?: string; vulling?: string; patroon?: string; staander?: string }
export declare const SOORTEN: Record<string, { naam: string; kort: string; stijlen: Stijl[]; handregels: string[]; maxAfstand: number }>;
export declare const PROFIEL: Record<string, { naam: string; b: number; h: number; W: number; I: number; kgm?: number; vorm: string }>;
export declare const GLASOPBOUW: Record<string, { naam: string; dikte: number }>;
export declare const KOOP: Record<string, { naam: string; artikel: string; prijs: number; bron: string }>;
