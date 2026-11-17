/**
 * Incremental rebuild (QA 0.5.14 P2-5a). After every feature the rebuild keeps the state it needs to go on (bodies with
 * their geometry and B-rep solids, surface bodies, history, curves, errors, splits, hidden bodies, body numbers …),
 * keyed on a fingerprint of the features up to there and of everything they read: the sketches, planes and features
 * they name by id, and the document settings outside the feature tree. The next rebuild of the same document goes on
 * from the state after the longest start of the tree whose fingerprint did not change: only the first changed
 * feature and the ones after it are built again.
 *
 * Correctness first:
 * - the cache holds its own copies of every geometry (taken when the state is kept) and hands out fresh copies of
 *   them when a rebuild goes on from a state, so nothing the rebuild or the window does to a geometry later (bounding
 *   boxes, BVH indices, transfers to the window) reaches a kept state;
 * - B-rep solids are shared, not copied (OpenCascade objects are not changed by the operations that use them); the
 *   kernel's release() keeps every solid a kept state holds (pinnedShapes), and a state whose solid was freed anyway
 *   is not used;
 * - the fingerprint covers the whole content of each feature and of what it refers to; a fingerprint that cannot be
 *   made (a body id migration run) turns the cache off for that rebuild.
 *
 * Memory: one chain of states per document and kernel (the last rebuild of it), at most MAX_CHAINS chains (least
 * recently used goes first); the geometry of a chain at most MAX_CHAIN_BYTES (states nearest the end of the tree are
 * kept first), all chains together at most MAX_TOTAL_BYTES. The cache lives per JavaScript context (window, rebuild
 * worker, OpenCascade worker).
 */
import * as THREE from 'three';
import type { Document } from '../document/types';
import type { Id } from '../sketch/types';
import { setPinnedShapes, type BrepKernel, type BrepShape } from './brepKernel';
import type { Body, RebuildResult } from './rebuild';
import type { RebuildCtx, RebuildSeed } from './rebuildState';
import { legacyNaming } from './bodyIds';

export const MAX_CHAINS = 4;
export const MAX_CHAIN_BYTES = 128 * 2 ** 20;
export const MAX_TOTAL_BYTES = 256 * 2 ** 20;

/** a geometry as the cache keeps it: its own copy, a cheap signature of the live one it was copied from, its size */
interface Kept { g: THREE.BufferGeometry; sig: string; bytes: number }
interface KeptBody { id: Id; featureIds: Id[]; faces: Body['faces']; edges: Body['edges']; geom: Kept; shape?: BrepShape; approx: boolean }
type Curve = NonNullable<RebuildResult['curves']>[number];
interface KeptCurve { id: Id; name: string; points: Float64Array; dashed?: boolean; color?: string }
interface State {
  bodies: KeptBody[];
  surfaceBodies: KeptBody[];
  curves: KeptCurve[];
  boss: Kept | null;
  cuts: Kept[];
  /** the plain data, copied with structuredClone (copied again when a rebuild goes on from it) */
  plain: {
    errors: Record<Id, string>; warnings: Record<Id, string>; bodyMeta: RebuildSeed['bodyMeta']; bendCounts: Record<Id, number>;
    splitCounts: Record<Id, number>; times: Record<Id, number>; extraAppearances: RebuildSeed['extraAppearances']; splits: RebuildSeed['splits'];
    consumed: Id[]; hidden: Id[]; autoHidden: Id[]; numbers: [Id, number][]; sheet: RebuildSeed['sheet']; unfolded: boolean;
  };
}
interface Chain { keys: string[]; states: (State | undefined)[] }

const chains = new Map<string, Chain>();
let enabled = true;
let stats = { built: 0, resumedAt: 0, features: 0 };

/** every B-rep solid a kept state holds: the kernel never frees them (brepKernel.ts, occt/brep.ts release) */
setPinnedShapes(function* () {
  for (const c of chains.values()) for (const s of c.states) if (s) for (const b of [...s.bodies, ...s.surfaceBodies]) if (b.shape) yield b.shape;
});

/** turn the cache on or off (tests compare against a rebuild from scratch); what it holds stays */
export function setRebuildCache(on: boolean): void {
  enabled = on;
}
export function clearRebuildCache(): void {
  chains.clear();
}
/** the last rebuild: how many features it built, the first one it built, how many it covered */
export function lastRebuildStats(): { built: number; resumedAt: number; features: number } {
  return { ...stats };
}
/** the geometry the cache holds now (bytes) and the number of kept states */
export function rebuildCacheSize(): { bytes: number; states: number } {
  let bytes = 0, states = 0;
  for (const c of chains.values()) {
    bytes += chainBytes(c);
    states += c.states.filter(Boolean).length;
  }
  return { bytes, states };
}

// ---- fingerprints

const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
class Hash {
  private a = 0x811c9dc5 | 0;
  private b = 0x9747b28c | 0;
  word(w: number) {
    this.a = Math.imul(this.a ^ w, 0x01000193);
    this.b = Math.imul(this.b ^ w, 0x5bd1e995);
    this.b ^= this.b >>> 13;
  }
  str(s: string) {
    this.word(s.length);
    for (let i = 0; i < s.length; i++) this.word(s.charCodeAt(i));
  }
  num(x: number) {
    f64[0] = x;
    this.word(u32[0]);
    this.word(u32[1]);
  }
  /** a JSON-like value; every string goes past `seen` too (the ids a feature refers to) */
  value(v: unknown, seen: (s: string) => void): void {
    if (v === null || v === undefined) return this.word(v === null ? 1 : 2);
    switch (typeof v) {
      case 'number': this.word(3); return this.num(v);
      case 'boolean': return this.word(v ? 4 : 5);
      case 'string': this.word(6); seen(v); return this.str(v);
      case 'object': break;
      default: this.word(7); return this.str(String(v));
    }
    if (ArrayBuffer.isView(v)) {
      const a = v as unknown as ArrayLike<number>;
      this.word(8);
      this.word(a.length);
      for (let i = 0; i < a.length; i++) this.num(a[i]);
      return;
    }
    if (Array.isArray(v)) {
      this.word(9);
      this.word(v.length);
      for (const x of v) this.value(x, seen);
      return;
    }
    this.word(10);
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x === undefined) continue;
      this.str(k);
      this.value(x, seen);
    }
  }
  digest(): string {
    return (this.a >>> 0).toString(36) + '.' + (this.b >>> 0).toString(36);
  }
}

/**
 * Document fields the rebuild never reads (checked against src/core/features: they are display, bookkeeping or
 * assembly/drawing data, or applied to the features and sketches before the rebuild, like configurations and
 * equations). Every other field outside the tree goes into the fingerprint of every state. `boundingBox` is drawn
 * after the last feature, which always runs.
 */
const NOT_READ = new Set(['features', 'sketches', 'planes', 'id', 'name', 'version', 'app', 'commit', 'comments', 'markups', 'snapshots', 'scene',
  'decals', 'appearance', 'bodyAppearances', 'appearanceProps', 'bodyMaterials', 'material', 'materialBase', 'bodyNames', 'planeNames',
  'planeVisibility', 'transparentBodies', 'featureFolders', 'bodyFolders', 'favorites', 'featureMeta', 'sensors', 'sectionViews', 'massOverride',
  'centerOfMass', 'autoTolerance', 'motionStudy', 'explodeFactor', 'explodeSteps', 'exploded', 'sheets', 'otherSheets', 'equationsFile',
  'configurations', 'activeConfiguration', 'equations', 'variables', 'equationAngleUnits', 'boundingBox', 'components', 'mates', 'componentPatterns']);

/** the key of the state after each feature: a chain over the features, each with what it refers to */
export function stateKeys(doc: Document, kernelTag: string): string[] {
  const byId = new Map<string, unknown>();
  for (const f of doc.features) byId.set(f.id, f);
  const own = (m: object, s: string) => (Object.prototype.hasOwnProperty.call(m, s) ? (m as Record<string, unknown>)[s] : undefined);
  const lookup = (s: string) => own(doc.sketches, s) ?? own(doc.planes, s) ?? byId.get(s);
  const memo = new Map<unknown, string>();
  /** the digest of an object (a feature, a sketch, a plane) and of everything it names by id, recursively */
  const digest = (obj: unknown, open: Set<unknown>): string => {
    const known = memo.get(obj);
    if (known) return known;
    const h = new Hash();
    const refs: unknown[] = [];
    h.value(obj, (s) => {
      const r = lookup(s);
      if (r && r !== obj) refs.push(r);
    });
    open.add(obj);
    for (const r of refs) h.str(open.has(r) ? 'cycle' : digest(r, open));
    open.delete(obj);
    const d = h.digest();
    // a digest made while an object up the chain was open left that object out: not remembered
    if (!refs.some((r) => open.has(r))) memo.set(obj, d);
    return d;
  };
  const top = new Hash();
  top.str(kernelTag);
  const rest = Object.fromEntries(Object.entries(doc).filter(([k]) => !NOT_READ.has(k)));
  const refs: unknown[] = [];
  top.value(rest, (s) => {
    const r = lookup(s);
    if (r) refs.push(r);
  });
  for (const r of refs) top.str(digest(r, new Set()));
  let key = top.digest();
  return doc.features.map((f) => {
    const h = new Hash();
    h.str(key);
    h.str(digest(f, new Set()));
    key = h.digest();
    return key;
  });
}

// ---- states

const kernelIds = new WeakMap<object, number>();
let nextKernel = 1;
const kernelTag = (K: BrepKernel | null) => {
  if (!K) return 'mesh';
  if (!kernelIds.has(K)) kernelIds.set(K, nextKernel++);
  return 'brep' + kernelIds.get(K);
};

const bytesOf = (g: THREE.BufferGeometry) => {
  let n = g.index ? g.index.array.byteLength : 0;
  for (const a of Object.values(g.attributes)) n += ('data' in a ? (a as THREE.InterleavedBufferAttribute).data.array : a.array).byteLength;
  return n;
};
/** what changes when a geometry is changed in place: the attribute objects and versions, and a sample of the values */
function signature(g: THREE.BufferGeometry): string {
  const part = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
    const arr = ('data' in a ? a.data.array : a.array) as ArrayLike<number>;
    const version = 'data' in a ? a.data.version : a.version;
    let s = `${a.count}/${version}/${arr.length}:`;
    const step = Math.max(1, Math.floor(arr.length / 48));
    for (let i = 0; i < arr.length; i += step) s += arr[i] + ',';
    return s + (arr.length ? arr[arr.length - 1] : '');
  };
  let s = g.index ? 'i' + part(g.index) : '-';
  for (const [k, a] of Object.entries(g.attributes)) s += `|${k}=${part(a)}`;
  return s + `|g${g.groups.length}|${JSON.stringify(g.userData)}`;
}

const shapeAlive = (s: BrepShape) => {
  const x = s as unknown as { isDeleted?: () => boolean };
  try {
    return typeof x.isDeleted !== 'function' || !x.isDeleted();
  } catch {
    return false;
  }
};
const stateAlive = (s: State) => [...s.bodies, ...s.surfaceBodies].every((b) => !b.shape || shapeAlive(b.shape));

function chainBytes(c: Chain): number {
  const seen = new Set<Kept>();
  let n = 0;
  for (const s of c.states) if (s) for (const k of keptOf(s)) if (!seen.has(k)) { seen.add(k); n += k.bytes; }
  return n;
}
function keptOf(s: State): Kept[] {
  const out = [...s.bodies, ...s.surfaceBodies].map((b) => b.geom);
  if (s.boss) out.push(s.boss);
  return out.concat(s.cuts);
}

/** the bookkeeping of one rebuild: live geometry and curves -> their kept copies, the bytes copied so far */
interface Session { seen: Map<THREE.BufferGeometry, Kept>; curves: Map<Curve, KeptCurve>; added: number }

export interface RebuildPlan {
  /** the first feature to build (0: from the start) */
  start: number;
  /** the state to go on from (absent: an empty one) */
  seed?: RebuildSeed;
  /** feature i is done: the state in ctx is the state after it (`unchanged`: a sketch, the state of i - 1) */
  record(i: number, ctx: RebuildCtx, unchanged: boolean): void;
  /** the rebuild stopped at feature i (budget): no state from there on */
  stop(): void;
  /** the rebuild is done; `built`: the number of features it built */
  finish(built: number): void;
}

const OFF: RebuildPlan = { start: 0, record() {}, stop() {}, finish() {} };

/**
 * The plan of a rebuild of the first n features: where to start, from which state, and the bookkeeping of the
 * states it makes. `mayResume` false (the budget is already used up) builds from the start.
 */
export function planRebuild(doc: Document, n: number, K: BrepKernel | null, mayResume: boolean): RebuildPlan {
  if (!enabled || legacyNaming()) {
    stats = { built: 0, resumedAt: 0, features: n };
    return { ...OFF, finish: (built) => { stats.built = built; } };
  }
  const tag = kernelTag(K);
  const id = `${doc.id ?? ''}\u0000${tag}`;
  const keys = stateKeys(doc, tag);
  const old = chains.get(id);
  // the longest start of the tree whose state is kept and still matches
  let start = 0;
  let seed: RebuildSeed | undefined;
  const session: Session = { seen: new Map(), curves: new Map(), added: 0 };
  if (old && mayResume) {
    for (let i = Math.min(n, old.keys.length) - 1; i >= 0; i--) {
      if (old.keys[i] !== keys[i] || !old.states[i]) continue;
      if (!stateAlive(old.states[i]!)) { old.states[i] = undefined; continue; }
      start = i + 1;
      seed = restore(old.states[i]!, session);
      break;
    }
  }
  const made: (State | undefined)[] = [];
  let recording = true;
  return {
    start,
    seed,
    record(i, ctx, unchanged) {
      if (!recording) return;
      const prev = i === start ? (start ? old?.states[start - 1] : undefined) : made[i - 1];
      made[i] = unchanged && (prev || i === 0) ? prev ?? snapshot(ctx, session) : snapshot(ctx, session);
      // a long rebuild of a heavy model does not pile up copies until it ends: the earliest states go first
      if (session.added > 2 * MAX_CHAIN_BYTES) {
        const kept: Chain = { keys: [], states: made };
        thin(kept);
        session.added = chainBytes(kept);
      }
    },
    stop() {
      recording = false;
    },
    finish(built) {
      stats = { built, resumedAt: start, features: n };
      const states = keys.map((k, i) => made[i] ?? (old && old.keys[i] === k ? old.states[i] : undefined));
      const chain: Chain = { keys, states };
      thin(chain);
      chains.delete(id);
      chains.set(id, chain);
      while (chains.size > MAX_CHAINS) chains.delete(chains.keys().next().value!);
      let total = 0;
      for (const c of chains.values()) total += chainBytes(c);
      for (const [k, c] of chains) {
        if (total <= MAX_TOTAL_BYTES || c === chain) continue;
        total -= chainBytes(c);
        chains.delete(k);
      }
    },
  };
}

/** a chain over its byte budget keeps the states nearest the end of the tree */
function thin(c: Chain): void {
  const seen = new Set<Kept>();
  let n = 0;
  for (let i = c.states.length - 1; i >= 0; i--) {
    const s = c.states[i];
    if (!s) continue;
    let add = 0;
    const mine = keptOf(s).filter((k) => !seen.has(k));
    for (const k of new Set(mine)) add += k.bytes;
    if (n + add > MAX_CHAIN_BYTES) {
      for (let j = i; j >= 0; j--) c.states[j] = undefined;
      return;
    }
    n += add;
    for (const k of mine) seen.add(k);
  }
}

/** the state in ctx, as the cache keeps it (geometry copied once and shared by the states after it while unchanged) */
function snapshot(ctx: RebuildCtx, session: Session): State {
  const keep = (g: THREE.BufferGeometry): Kept => {
    const sig = signature(g);
    const prev = session.seen.get(g);
    if (prev && prev.sig === sig) return prev;
    const k = { g: g.clone(), sig, bytes: bytesOf(g) };
    session.seen.set(g, k);
    session.added += k.bytes;
    return k;
  };
  const body = (b: Body): KeptBody => {
    const shape = ctx.exactOf(b);
    const kb: KeptBody = { id: b.id, featureIds: b.featureIds.slice(), faces: b.faces.slice(), edges: b.edges.slice(), geom: keep(b.geometry), approx: false };
    kb.approx = ctx.approxBodies.has(b);
    if (shape) kb.shape = shape;
    return kb;
  };
  const curve = (c: Curve): KeptCurve => {
    let k = session.curves.get(c);
    if (!k) {
      const points = new Float64Array(c.points.length * 3);
      c.points.forEach((p, i) => points.set([p.x, p.y, p.z], i * 3));
      k = { id: c.id, name: c.name, points, ...(c.dashed !== undefined ? { dashed: c.dashed } : {}), ...(c.color !== undefined ? { color: c.color } : {}) };
      session.curves.set(c, k);
    }
    return k;
  };
  return {
    bodies: ctx.bodies.map(body),
    surfaceBodies: ctx.surfaceBodies.map(body),
    curves: ctx.curves.map(curve),
    boss: ctx.history.boss ? keep(ctx.history.boss) : null,
    cuts: ctx.history.cuts.map(keep),
    plain: structuredClone({
      errors: ctx.errors, warnings: ctx.warnings, bodyMeta: ctx.bodyMeta, bendCounts: ctx.bendCounts, splitCounts: ctx.splitCounts, times: ctx.times,
      extraAppearances: ctx.extraAppearances, splits: ctx.splits, consumed: [...ctx.consumedSketches], hidden: [...ctx.hiddenIds],
      autoHidden: ctx.autoHidden, numbers: [...ctx.nameBody.numbers()], sheet: ctx.sheet, unfolded: ctx.unfolded,
    }),
  };
}

/** fresh live copies of a kept state, for a rebuild that goes on from it */
function restore(s: State, session: Session): RebuildSeed {
  const live = new Map<Kept, THREE.BufferGeometry>();
  const geo = (k: Kept) => {
    let g = live.get(k);
    if (!g) {
      g = k.g.clone();
      live.set(k, g);
      session.seen.set(g, k);
    }
    return g;
  };
  const exact = new Map<Body, BrepShape>();
  const approxBodies = new Set<Body>();
  const body = (kb: KeptBody): Body => {
    const b: Body = { id: kb.id, geometry: geo(kb.geom), faces: kb.faces.slice(), edges: kb.edges.slice(), featureIds: kb.featureIds.slice() };
    if (kb.shape) exact.set(b, kb.shape);
    if (kb.approx) approxBodies.add(b);
    return b;
  };
  const curves = s.curves.map((k) => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < k.points.length; i += 3) points.push(new THREE.Vector3(k.points[i], k.points[i + 1], k.points[i + 2]));
    const c: Curve = { id: k.id, name: k.name, points };
    if (k.dashed !== undefined) c.dashed = k.dashed;
    if (k.color !== undefined) c.color = k.color;
    session.curves.set(c, k);
    return c;
  });
  const p = structuredClone(s.plain);
  return {
    bodies: s.bodies.map(body), surfaceBodies: s.surfaceBodies.map(body), curves, exact, approxBodies,
    history: { boss: s.boss ? geo(s.boss) : null, cuts: s.cuts.map(geo) },
    errors: p.errors, warnings: p.warnings, bodyMeta: p.bodyMeta, bendCounts: p.bendCounts, splitCounts: p.splitCounts, times: p.times,
    extraAppearances: p.extraAppearances, splits: p.splits, consumedSketches: new Set(p.consumed), hiddenIds: new Set(p.hidden), autoHidden: p.autoHidden,
    bodyNumbers: new Map(p.numbers), sheet: p.sheet, unfolded: p.unfolded,
  };
}
