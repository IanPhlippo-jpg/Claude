// types voor dxf.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
export declare function plaatDxf(d: any, pos?: string | number): string;
export declare function stripDxf(d: any, L: number, pos?: string | number): string;
export declare function dxfBestanden(o: any): { naam: string; pos: number; n: number; dxf: string }[];
