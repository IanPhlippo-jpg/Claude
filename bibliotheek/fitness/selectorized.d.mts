// types voor selectorized.mjs (losjes: het model is plain JavaScript)
/* eslint-disable @typescript-eslint/no-explicit-any */
export declare const NOKGRENS: Record<string, number>;
export declare const NOKGRENS_BRON: Record<string, string>;
export declare const NOK_RMAX: number, NOK_TAKEL: number;
export declare const NOK_KABEL: { stapel: string; nok: string }, NOK_SCHIJF: { stapel: string; nok: string };
export declare const nokStapel: (b: any) => number;
export declare const kabelStapel: (b: any) => number;
export declare function nokStation(b: any, def: any, c: any): void;
export declare function kabelStation(b: any, def: any, c: any): void;
export declare const SELECTORIZED: any[];
export declare function nokKappen(b: any, c: any): void;
export declare function vloerGoot(b: any, c: any): void;
