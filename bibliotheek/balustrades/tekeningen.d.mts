// types voor tekeningen.mjs
import type { Ontwerp } from './model.mjs';
export declare function alleBladen(o: Ontwerp, meta?: Record<string, any>): { id: string; titel: string; svg: string }[];
export declare function stukBladen(o: Ontwerp, meta?: Record<string, any>): { pos: number; svg: string }[];
