// types voor catalogus.mjs (losjes: het model is plain JavaScript)
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Uitvoering = 'thuis' | 'semi' | 'pro';
export interface ToestelDef { id: string; soort: 'rek' | 'bank' | 'kabel' | 'plate' | string; naam: string; kort: string; uitleg: string; spieren: string; oefeningen: string[]; maxLast?: Record<string, number>; maten?: string[]; markt: { thuis: [number, number]; pro: [number, number]; semi: [number, number]; bronT: string; bronP: string; bronS?: string }; bouw: (...a: any[]) => void }
export interface ToestelOpties { stand?: number; wagen?: number; maat?: string; opties?: string[]; afwerking?: { ral?: string; leer?: string; chroom?: boolean; logo?: boolean } }
export declare const TOESTELLEN: ToestelDef[];
export declare const PER_ID: Record<string, ToestelDef>;
export declare const UITVOERINGEN: Uitvoering[];
export declare function toestel(id: string, versie?: Uitvoering, opt?: ToestelOpties): any;
export declare function leegCache(): void;
