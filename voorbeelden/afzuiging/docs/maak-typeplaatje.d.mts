// types voor maak-typeplaatje.mjs (gebruikt door src/qa/typeplaatjeAfzuiging.test.ts)
export declare const LABEL: { b: number; h: number; rand: number };
export declare const REGELS: [number, number, number, string, { anchor?: string; vet?: boolean }?][];
export declare const SYMBOLEN: Record<string, [number, number, number, number]>;
export declare function maakTypeplaatje(): string;
