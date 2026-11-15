// types voor prijzen.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
export declare const STANDAARD: any;
export declare function kostprijs(o: any, inst?: any): { regels: any[]; materiaal: number; uren: number; arbeid: number; kostprijs: number; marge: number; verkoop: number; incl: number; koop: any[]; markt: { band: [number, number]; status: 'in' | 'onder' | 'boven'; bron: string; melding: string }; [k: string]: any };
