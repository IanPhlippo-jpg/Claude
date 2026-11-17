/**
 * Per feature type checks of a file (QA 0.5.14 P2-7): counts and lists that would make a rebuild run away or crash
 * when a damaged file holds them (a pattern of 10^9 instances, a mesh whose positions are not whole triangles, a
 * Feature Scope that is not a list of body ids). The general checks (numbers, depths, sketches) stay in
 * persistence.ts; this module answers with the problem as text, or null.
 */
import { decodePositions } from './positionCodec';

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** the most instances a pattern (or copies a Move/Copy) may make; the input fields stop well below it */
export const MAX_INSTANCES = 10_000;
/** the most triangles one imported mesh may hold (a 64 MB file holds about 1.3 million in the compact form) */
export const MAX_IMPORT_TRIANGLES = 4_000_000;

const PATTERNS = new Set(['linearPattern', 'circularPattern', 'sketchPattern', 'curvePattern', 'tablePattern', 'fillPattern',
  'variablePattern']);
/** fields that hold body or feature ids */
const ID_LISTS = ['scope', 'bodies', 'trimBodies', 'surfaces', 'targets', 'featureIds'] as const;

const isIndex = (x: unknown) => Number.isInteger(x) && (x as number) >= 0;
const countOk = (v: unknown, min = 0) => v === undefined || (isNum(v) && v >= min && v <= MAX_INSTANCES);
const indexList = (v: unknown) => v === undefined || (Array.isArray(v) && v.length <= MAX_INSTANCES && v.every(isIndex));

/** decodes compact imported positions in place; the problem with the feature as text, or null when it is fine */
export function featureProblem(f: Raw): string | null {
  const idList = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
  for (const k of ID_LISTS) if (f[k] !== undefined && !idList(f[k])) return `${k} is not a list of ids`;
  if (f.mainBody !== undefined && f.mainBody !== null && typeof f.mainBody !== 'string') return 'mainBody is not an id';
  const utb = f.upToBody;
  if (utb !== undefined && utb !== null && (!isObj(utb) || typeof utb.bodyId !== 'string')) return 'the Up To Body reference is damaged';
  if (!indexList(f.keepBodies)) return 'Bodies to Keep is not a list of piece numbers';
  if (!countOk(f.count)) return `the count ${String(f.count)} is outside 0 … ${MAX_INSTANCES}`;
  if (!countOk(f.copies)) return `the number of copies ${String(f.copies)} is outside 0 … ${MAX_INSTANCES}`;
  if (PATTERNS.has(f.type as string)) {
    const p = patternProblem(f);
    if (p) return p;
  }
  if (f.type === 'imported') return importedProblem(f);
  return null;
}

function patternProblem(f: Raw): string | null {
  let total = 1;
  for (const k of ['dir1', 'dir2', 'curve'] as const) {
    const d = f[k];
    if (d === undefined || d === null) continue;
    if (!isObj(d) || !isNum(d.count) || !countOk(d.count, 1)) return `${k} has no valid instance count (1 … ${MAX_INSTANCES})`;
    if (k !== 'curve') total *= d.count;
  }
  if (total > MAX_INSTANCES) return `the pattern makes ${total} instances, more than ${MAX_INSTANCES}`;
  if (!indexList(f.skip)) return 'Instances to Skip is not a list of instance numbers';
  const list = (v: unknown) => Array.isArray(v) && v.length <= MAX_INSTANCES;
  for (const k of ['table', 'modified'] as const) if (f[k] !== undefined && !list(f[k])) return `the ${k} list is damaged or too long`;
  if (f.variable !== undefined && (!isObj(f.variable) || !list(f.variable.rows))) return 'the variable pattern table is damaged or too long';
  // a fill pattern with spacing 0 would place instances without end
  const fill = f.fill;
  if (fill !== undefined && fill !== null && (!isObj(fill) || !isNum(fill.spacing) || fill.spacing <= 0)) return 'the fill pattern has no valid spacing';
  return null;
}

function importedProblem(f: Raw): string | null {
  if (typeof f.positions === 'string') {
    const p = decodePositions(f.positions);
    if (!p) return 'the stored mesh is damaged';
    f.positions = p;
  }
  const p = f.positions;
  if (!Array.isArray(p)) return 'the mesh has no positions';
  if (p.length % 9) return 'the mesh positions are not whole triangles';
  if (p.length > MAX_IMPORT_TRIANGLES * 9) return `the mesh has more than ${MAX_IMPORT_TRIANGLES} triangles`;
  for (let i = 0; i < p.length; i++) if (!isNum(p[i]) || Math.abs(p[i]) > 1e12) return 'the mesh holds a number out of range';
  return null;
}
