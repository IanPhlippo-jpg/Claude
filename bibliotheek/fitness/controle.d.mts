// types voor controle.mjs (losjes: het model is plain JavaScript)
/* eslint-disable @typescript-eslint/no-explicit-any */
export declare function obb(g: any, krimp?: number): any;
export declare function botsen(A: any, B: any): boolean;
export declare function botsingen(o: any, krimp?: number): { a: string; b: string; ga: string; gb: string }[];
export declare function schijvenVrij(o: any): string[];
export declare function zwevend(o: any): string[][];
export declare function kabelFouten(o: any): string[];
export declare function ergonomie(o: any): string[];
export declare function gaten(o: any): { deel: any; p: number[]; as: number[]; d: number; door: number; punten: number[][]; g: any }[];
export declare const SPELING: { bout: [number, number]; pen: [number, number]; lager: [number, number] };
export declare function gatFouten(o: any): string[];
export declare function snoeiWestside(o: any): { deel: string; s: number; d: number; reden: string }[];
