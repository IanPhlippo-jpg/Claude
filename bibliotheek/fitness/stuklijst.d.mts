// types voor stuklijst.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
export declare const ZAAGSNEDE: number;
export declare const STAAFLENGTE: number;
export declare function stuklijst(o: any): { posities: any[]; koop: any[]; bekleding: any[] };
export declare function zaagplan(o: any, sl?: any): { profielen: { prof: string; naam: string; lengte: number; n: number; staven: { stukken: { pos: number; l: number }[]; rest: number }[]; stukken: { pos: number; l: number }[] }[] };
export declare function nesting(o: any, sl?: any): { t: number; platen: { stukken: { x: number; y: number; w: number; h: number }[] }[] }[];
export declare function totalen(o: any, sl?: any): Record<string, number>;
