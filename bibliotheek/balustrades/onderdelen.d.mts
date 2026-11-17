// types voor onderdelen.mjs (gebruikt door src/qa/qaBalustrades.test.ts)
export interface Stijl { id: string; naam: string; uitleg: string; handregel: string; spijl?: string; staaf?: string; vulling?: string; patroon?: string; staander?: string }
export declare const SOORTEN: Record<string, { naam: string; kort: string; stijlen: Stijl[]; handregels: string[]; maxAfstand: number }>;
export declare const PROFIEL: Record<string, { naam: string; b: number; h: number; W: number; I: number; Wv?: number; Iv?: number; Wpl?: number; t?: number; E?: number; fy?: number; kgm?: number; vorm: string }>;
export declare const GLASOPBOUW: Record<string, { naam: string; dikte: number; blad: number; n: number; folie: number; kgm2: number; prijs: number }>;
export declare const KOOP: Record<string, { naam: string; artikel: string; prijs: number; bron: string }>;
export declare const ANKER: Record<string, { naam: string; koop: string; koopA4: string; d: number; hef: number; gat: number; diep: number; plaatgat: number; NRd: number | null; VRd: number | null; mortel?: boolean; huls?: string; bron: string }>;
export declare const ONDERGROND: Record<string, { naam: string; anker: string | null; bron: string }>;
export declare const RANDAFSTAND: { c: number; bron: string };
