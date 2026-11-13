// types voor prijzen.mjs
import type { Ontwerp } from './model.mjs';
export interface Band { laag: number; hoog: number; laagPl: number; hoogPl: number; tekst: string }
export declare const MARKTBAND: Record<string, Band>;
export declare const MARKT: { soort: string; wat: string; prijs: number; montage: boolean; bron: string }[];
export declare const STANDAARD: Record<string, any>;
export declare function kostprijs(o: Ontwerp, inst?: Record<string, any>): { regels: { wat: string; bedrag: number; bron: string; cat: string }[]; kostprijs: number; verkoop: number; perMeter: number; perMeterZonder: number; meter: number; plaatsen: { uren: number; verkoop: number; perMeter: number; inbegrepen: boolean }; perCat: Record<string, { verkoop: number }>; uren: number; stuklijst: any; stappen: { titel: string; uren: number; cats: Record<string, number> }[] };
