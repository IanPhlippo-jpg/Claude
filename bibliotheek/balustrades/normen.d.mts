// types voor normen.mjs
export declare const NORM: Record<string, any>;
export declare function vereisteHoogte(k: Record<string, any>): number;
export declare function piekstuwdruk(vb0: number, terrein: string, zM: number): { qp: number; z: number; kr: number; cr: number; Iv: number; vm: number; qb: number };
export declare function cpNet(lh: number): { A: number; B: number; C: number; D: number };
export declare function trapDriehoek(optrede: number, aantrede: number, v: number): number;
