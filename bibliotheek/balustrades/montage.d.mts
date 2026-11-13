// types voor montage.mjs
import type { Ontwerp } from './model.mjs';
export declare function montageBladen(o: Ontwerp, meta?: Record<string, any>): { id: string; titel: string; svg: string; scène: { delen: { nr?: number; solids: any[] }[] } }[];
