// types voor montage.mjs
/* eslint-disable @typescript-eslint/no-explicit-any */
export declare function montage(o: any): any[];
export declare function montageBladen(o: any, meta?: Record<string, unknown>): { id: string; titel: string; sub: string; scène: any; svg: string }[];
