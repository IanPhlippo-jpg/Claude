// types voor tekeningen.mjs
export declare function alleBladen(o: unknown, meta?: Record<string, unknown>, inst?: Record<string, unknown>): { id: string; titel: string; svg: string }[];
export declare function stukBladen(o: unknown, meta?: Record<string, unknown>): { pos: number; naam: string; n: number; svg: string }[];
export declare function boorRijen(o: unknown, d: unknown): { vlak: string; d: number; wanden: number; doel: string; pos: (number | string)[] }[];
export declare function typeplaatBlad(o: unknown, meta?: Record<string, unknown>): string;
