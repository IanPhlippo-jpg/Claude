// types voor dossier.mjs
import type { Ontwerp } from './model.mjs';
export declare function dossierHtml(o: Ontwerp, inst?: Record<string, any>, meta?: Record<string, any>): string;
export declare function lijstenCsv(o: Ontwerp, inst?: Record<string, any>): string;
export declare function dossierBladen(o: Ontwerp, meta?: Record<string, any>): { bladen: { id: string; titel: string; svg: string }[]; montage: { id: string; svg: string }[]; stukken: { pos: number; svg: string }[]; totaal: number };
export declare function btwFactor(inst?: Record<string, any>): number;
