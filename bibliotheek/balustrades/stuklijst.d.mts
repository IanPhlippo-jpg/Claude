// types voor stuklijst.mjs
import type { Ontwerp } from './model.mjs';
export interface Positie { pos: number; n: number; soort: string; rol: string; naam: string; prof?: string; L?: number; hart?: number; kg: number; b?: number; l?: number }
export declare function stuklijst(o: Ontwerp): { posities: Positie[]; koop: { key: string; n: number; prijs: number; bedrag: number; artikel: string }[] };
export declare function zaagplan(o: Ontwerp): { profielen: { prof: string; lengte: number; n: number; nodig: number; staven: { stukken: { l: number }[]; rest: number }[] }[] };
