// types voor dossier.mjs
import type { Ontwerp } from './model.mjs';
export declare function dossierHtml(o: Ontwerp, inst?: Record<string, any>, meta?: Record<string, any>): string;
export declare function lijstenCsv(o: Ontwerp, inst?: Record<string, any>): string;
