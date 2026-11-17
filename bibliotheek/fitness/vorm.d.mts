// types voor vorm.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
export declare function padVlak(pts: number[][]): number[] | null;
export declare function buigPad(pts: number[][], R: number, stap?: number): { stalen: { p: number[]; t: number[]; s: number; boog?: boolean }[]; L: number; bochten: number[]; benen: number[]; T: number[]; dirs: number[][] };
export declare function puntOp(d: any, s: number): { p: number[]; u: number[]; v: number[]; w: number[] };
export declare function afronden(hoekpunten: number[][], perKwart?: number): { punten: number[][]; segmenten: { x: number; y: number; bulge: number }[]; omtrek: number };
export declare function cirkelPunten(x: number, y: number, r: number, n?: number): number[][];
export declare function binnen(q: number[], poly: number[][]): boolean;
export declare function randAfstand(q: number[], poly: number[][]): number;
export declare function banden(poly: number[][], n?: number): { y0: number; y1: number; x0: number; x1: number }[];
export declare const buigToeslag: (hoek: number, R: number, t: number, K?: number) => number;
export declare const terugzet: (hoek: number, R: number, t: number) => number;
export declare function uitslagStrook(L: number, benen: number[], zet: { hoek: number; R: number; richting?: string }[], t: number, K?: number): { punten: number[][]; zetlijnen: any[]; B: number; buiten: number[]; zet: any[]; K: number };
export declare function terugVouwen(ui: any, t: number): number[];
export declare function ontvouw(panelen: { q: number[][]; gaten?: number[][][] }[], zet: { hoek: number; R: number; richting?: string }[], t: number, K?: number): { punten: number[][]; zetlijnen: any[]; uitsparingen: number[][][] };
