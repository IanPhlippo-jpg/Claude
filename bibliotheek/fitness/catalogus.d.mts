// types voor catalogus.mjs (losjes: het model is plain JavaScript)
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ToestelDef { id: string; soort: 'rek' | 'bank' | 'kabel' | 'plate'; naam: string; kort: string; uitleg: string; spieren: string; oefeningen: string[]; maxLast?: Record<string, number>; markt: { thuis: [number, number]; pro: [number, number]; bronT: string; bronP: string }; bouw: (...a: any[]) => void }
export declare const TOESTELLEN: ToestelDef[];
export declare const PER_ID: Record<string, ToestelDef>;
export declare function toestel(id: string, versie?: 'thuis' | 'pro', opt?: { stand?: number; wagen?: number }): any;
export declare function leegCache(): void;
