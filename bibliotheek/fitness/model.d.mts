// types voor model.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
export type V3 = [number, number, number];
export interface Balk { a: V3; b: V3; u: V3; v: V3; w: V3; bw: number; bh: number; rond: boolean; kleur: string }
export declare function aabb(g: Balk): [V3, V3];
export declare function contact(g1: Balk, g2: Balk, tol?: number): { lengte: number; p: V3 } | null;
export declare function lengteStuk(d: any): number;
export declare function massa(d: any): number;
export declare function add(a: number[], b: number[]): number[];
export declare function sub(a: number[], b: number[]): number[];
export declare function mul(a: number[], k: number): number[];
export declare function bouwer(V: any, stand?: number): any;
