/**
 * The state of one rebuild and the helpers every feature builder shares (QA 0.5.14 P2-5, P2-14), in one object.
 * rebuildDocument (rebuild.ts) creates it empty, or from the state the rebuild cache kept after an unchanged start of
 * the tree (rebuildCache.ts), and hands it to the builder of each feature. The helpers are the closures the feature loop
 * used to define inline; they read and change only the containers of this object.
 */
import * as THREE from 'three';
import type { Document, Feature } from '../document/types';
import type { Id } from '../sketch/types';
import type { BrepKernel, BrepShape } from './brepKernel';
import type { BuildContext } from './buildContext';
import type { Body, RebuildResult } from './rebuild';
import type { SplitRegions } from './splitline';
import type { BuildHistory } from './shell';
import { csg, meshPieces, mergeGeometries } from './solid';
import { TOL } from './tolerance';
import { bodyNamer } from './bodyIds';
import { planarToolOf } from './rebuildTools';
import { brepTool } from './brepTool';
import { bodyEdges, matchEdge } from './edgesets';
import { holdLineRadius } from './round';

/** thrown inside a long feature (a pattern of many instances) once the wall-clock budget of the rebuild is used up */
export class RebuildStopped extends Error {
  constructor() {
    super('The rebuild budget is used up.');
  }
}

/** what a rebuild goes on from: the state after the last feature of an unchanged start of the tree (rebuildCache.ts) */
export interface RebuildSeed {
  bodies: Body[];
  surfaceBodies: Body[];
  errors: Record<Id, string>;
  warnings: Record<Id, string>;
  consumedSketches: Set<Id>;
  curves: NonNullable<RebuildResult['curves']>;
  extraAppearances: NonNullable<Document['faceAppearances']>;
  splits: Map<Id, SplitRegions[]>;
  history: BuildHistory;
  bodyMeta: NonNullable<RebuildResult['bodyMeta']>;
  bendCounts: Record<Id, number>;
  splitCounts: Record<Id, number>;
  times: Record<Id, number>;
  hiddenIds: Set<Id>;
  autoHidden: Id[];
  /** the B-rep solid of every body that is exact (its geometry is the tessellation of that solid) */
  exact: Map<Body, BrepShape>;
  approxBodies: Set<Body>;
  /** the body numbers handed out per feature (bodyIds.ts) */
  bodyNumbers: Map<Id, number>;
  sheet: BuildContext['sheet'];
  unfolded: boolean;
}

export interface RebuildCtx extends BuildContext {
  extraAppearances: NonNullable<Document['faceAppearances']>;
  /** Bodies to Keep: the number of pieces a cut split a body into */
  splitCounts: Record<Id, number>;
  /** Performance Evaluation: rebuild time per feature (ms) */
  times: Record<Id, number>;
  /** the tools of the feature being built (the sources of the face names of its result) */
  featureTools: THREE.BufferGeometry[];
  /** body -> its B-rep solid and the tessellation that belongs to it (exactOf) */
  shapes: Map<Body, { shape: BrepShape; geometry: THREE.BufferGeometry; version: number }>;
  /** the B-rep tool of a feature, or null (no kernel, not supported, or the kernel failed) */
  toolOf: (feature: Feature, ext: number, meshTool?: THREE.BufferGeometry | null) => BrepShape | null;
  /** a B-rep solid moved by a matrix, or null */
  moved: (shape: BrepShape | null, m: THREE.Matrix4) => BrepShape | null;
  /** all visible bodies as one geometry (ray casts, extents) */
  allVisible: () => THREE.BufferGeometry | null;
  /** Face Fillet ▸ Hold line: the error of a hold line that could not size its fillet */
  holdLineErrors: Record<Id, string>;
  /** Face Fillet ▸ Hold line: the fillet with the radius that ends it on the hold line */
  sizedByHoldLine: (x: Feature) => Feature;
  /** in long loops of one feature: throws RebuildStopped once the wall-clock budget is used up (QA 0.5.14 P2-5d) */
  tick: () => void;
  /** the bodies as they are now; the function puts them back (a feature stopped half way leaves nothing behind) */
  checkpoint: () => () => void;
}

const posVersion = (g: THREE.BufferGeometry) => (g.getAttribute('position') as THREE.BufferAttribute | undefined)?.version ?? -1;

export function createRebuildCtx(doc: Document, K: BrepKernel | null, overBudget: () => boolean, seed?: RebuildSeed): RebuildCtx {
  const bodies: Body[] = seed?.bodies ?? [];
  const surfaceBodies: Body[] = seed?.surfaceBodies ?? [];
  const errors: Record<Id, string> = seed?.errors ?? {};
  const history: BuildHistory = seed?.history ?? { boss: null, cuts: [] };
  const curves: NonNullable<RebuildResult['curves']> = seed?.curves ?? [];
  const extraAppearances: NonNullable<Document['faceAppearances']> = seed?.extraAppearances ?? [];
  const splitCounts: Record<Id, number> = seed?.splitCounts ?? {};
  const bodyMeta: NonNullable<RebuildResult['bodyMeta']> = seed?.bodyMeta ?? {};
  const splits = seed?.splits ?? new Map<Id, SplitRegions[]>();
  const hiddenIds = seed?.hiddenIds ?? new Set(doc.hiddenBodies ?? []);
  const autoHidden: Id[] = seed?.autoHidden ?? [];
  const approxBodies = seed?.approxBodies ?? new Set<Body>();
  const featureTools: THREE.BufferGeometry[] = [];
  const holdLineErrors: Record<Id, string> = {};
  const nameBody = bodyNamer(seed?.bodyNumbers);
  // ---- B-rep kernel (docs/14): a body keeps its B-rep solid while every feature that changes it has a B-rep
  // version; a feature without one works on the tessellation (mesh kernel) and the body is a mesh from then on
  const shapes = new Map<Body, { shape: BrepShape; geometry: THREE.BufferGeometry; version: number }>();
  for (const [b, shape] of seed?.exact ?? []) shapes.set(b, { shape, geometry: b.geometry, version: posVersion(b.geometry) });

  // ---- multi-body helpers (Merge result, Feature Scope, hidden bodies), by design; stable body ids: bodyIds.ts
  const newBody = (g: THREE.BufferGeometry, fid: Id, shape?: BrepShape | null): Body => {
    const b: Body = { id: nameBody(fid), geometry: g, faces: [], edges: [], featureIds: [fid] };
    bodies.push(b);
    if (shape) setExact(b, shape);
    return b;
  };
  const addBoss = (g: THREE.BufferGeometry) => {
    // the union of all boss tools is bookkeeping (feature history); when that boolean fails the feature itself stays
    // built, the history keeps its previous state
    try {
      history.boss = history.boss ? csg(history.boss, g, 'union', { checks: false }) : g;
    } catch {
      /* the feature is fine; only its share in the boss history is left out */
    }
  };
  /** the B-rep solid of a body, when its geometry is still the tessellation of that solid */
  const exactOf = (b: Body | undefined): BrepShape | null => {
    if (!b) return null;
    const e = shapes.get(b);
    return e && e.geometry === b.geometry && e.version === posVersion(b.geometry) ? e.shape : null;
  };
  function setExact(b: Body, shape: BrepShape) {
    b.geometry = K!.tessellate(shape);
    shapes.set(b, { shape, geometry: b.geometry, version: posVersion(b.geometry) });
  }
  const visibleBodies = () => bodies.filter((b) => !hiddenIds.has(b.id));
  /** all visible bodies as one geometry (ray casts, extents) */
  const allVisible = (): THREE.BufferGeometry | null => {
    const v = visibleBodies();
    if (!v.length) return null;
    return v.length === 1 ? v[0].geometry : mergeGeometries(v.map((b) => b.geometry));
  };
  const toolOf = (feature: Feature, ext: number, meshTool?: THREE.BufferGeometry | null): BrepShape | null => {
    if (!K) return null;
    try {
      return brepTool(K, doc, feature, ext, meshTool ?? undefined, allVisible());
    } catch {
      return null;
    }
  };
  const moved = (shape: BrepShape | null, m: THREE.Matrix4): BrepShape | null => {
    if (!K || !shape) return null;
    try {
      return K.transform(shape, m.elements);
    } catch {
      return null;
    }
  };
  const boxOf = (g: THREE.BufferGeometry) => {
    g.computeBoundingBox();
    return g.boundingBox!.clone().expandByScalar(TOL.plane);
  };
  const touching = (tool: THREE.BufferGeometry, candidates: Body[]) => {
    const tb = boxOf(tool);
    return candidates.filter((b) => boxOf(b.geometry).intersectsBox(tb));
  };
  const scoped = (scope?: Id[]) => (scope && scope.length ? bodies.filter((b) => scope.includes(b.id)) : visibleBodies());
  const isEmpty = (g: THREE.BufferGeometry) => !g.getAttribute('position') || g.getAttribute('position').count < 3;
  /** a tool without a B-rep version whose faces are all planar becomes an exact solid (gussets, vents, slots …) */
  const planarTool = (tool: THREE.BufferGeometry): BrepShape | null => planarToolOf(K, tool);
  /** boss material: merge into the bodies it touches (several touching bodies become one), else a new body */
  const addMaterial = (tool: THREE.BufferGeometry, fid: Id, merge: boolean, scope?: Id[], toolShape?: BrepShape | null) => {
    featureTools.push(tool);
    const hits = merge ? touching(tool, scoped(scope)) : [];
    if (K && toolShape === undefined && (hits.length ? hits.every((b) => exactOf(b)) : bodies.some((b) => exactOf(b)))) toolShape = planarTool(tool);
    if (!hits.length) {
      newBody(tool, fid, toolShape);
      return;
    }
    // B-rep: every touched body is exact, so the union is exact too
    if (K && toolShape && hits.every((b) => exactOf(b))) {
      try {
        let u = K.fuse(exactOf(hits[0])!, toolShape);
        for (const other of hits.slice(1)) u = K.fuse(u, exactOf(other)!);
        const main = hits[0];
        setExact(main, u);
        main.featureIds.push(fid);
        for (const other of hits.slice(1)) {
          main.featureIds.push(...other.featureIds);
          bodies.splice(bodies.indexOf(other), 1);
        }
        return;
      } catch {
        /* the mesh kernel below */
      }
    }
    // all booleans first, then the bodies change: a failure leaves every body as it was (F48)
    const main = hits[0];
    let g = csg(main.geometry, tool, 'union');
    for (const other of hits.slice(1)) g = csg(g, other.geometry, 'union');
    main.geometry = g;
    main.featureIds.push(fid);
    for (const other of hits.slice(1)) {
      main.featureIds.push(...other.featureIds);
      bodies.splice(bodies.indexOf(other), 1);
    }
  };
  /** cut material: subtract from the bodies the tool touches (Feature Scope, else Auto-select) */
  const removeMaterial = (tool: THREE.BufferGeometry, fid: Id, scope?: Id[], toolShape?: BrepShape | null): boolean => {
    featureTools.push(tool);
    const hits = touching(tool, scoped(scope));
    if (!hits.length) return false;
    if (K && toolShape === undefined && hits.some((b) => exactOf(b))) toolShape = planarTool(tool);
    // every cut is computed before any body changes: when the second body fails, the first is not left half cut (F48)
    // an exact body is cut by the B-rep tool (falling back to the mesh kernel when that fails)
    const results = hits.map((b): { shape: BrepShape } | { mesh: THREE.BufferGeometry } => {
      const ex = exactOf(b);
      if (K && toolShape && ex) {
        try {
          return { shape: K.cut(ex, toolShape) };
        } catch {
          /* mesh kernel */
        }
      }
      return { mesh: csg(b.geometry, tool, 'subtract') };
    });
    // Bodies to Keep: a cut that splits a body makes a body of every piece (largest first); the feature may keep some
    const keep = (doc.features.find((x) => x.id === fid) as { keepBodies?: number[] } | undefined)?.keepBodies;
    hits.forEach((b, k) => {
      const r = results[k];
      if ('shape' in r) {
        if (K!.volume(r.shape) < 1e-9) { bodies.splice(bodies.indexOf(b), 1); return; }
        const parts = K!.solids(r.shape);
        if (parts.length > 1) { splitInto(b, parts.map((s) => ({ shape: s, geometry: K!.tessellate(s) })), fid, keep); return; }
        setExact(b, r.shape);
      } else {
        const parts = meshPieces(r.mesh);
        if (parts.length > 1) { splitInto(b, parts.map((g) => ({ shape: null, geometry: g })), fid, keep); return; }
        b.geometry = r.mesh;
      }
      b.featureIds.push(fid);
      if (isEmpty(b.geometry)) bodies.splice(bodies.indexOf(b), 1);
    });
    return true;
  };
  /** the pieces of a split body: the first kept piece stays this body, every other kept piece becomes a body */
  const splitInto = (b: Body, parts: { shape: BrepShape | null; geometry: THREE.BufferGeometry }[], fid: Id, keep?: number[]) => {
    splitCounts[fid] = Math.max(splitCounts[fid] ?? 0, parts.length);
    const kept = parts.filter((_, i) => !keep || !keep.length || keep.includes(i));
    if (!kept.length) { bodies.splice(bodies.indexOf(b), 1); return; }
    const [first, ...rest] = kept;
    if (first.shape) setExact(b, first.shape);
    else b.geometry = first.geometry;
    b.featureIds.push(fid);
    for (const p of rest) {
      const nb = newBody(p.geometry, fid, p.shape);
      nb.featureIds = [...b.featureIds];
    }
  };
  const sizedByHoldLine = (x: Feature): Feature => {
    if (x.type !== 'fillet' || x.roundType !== 'face' || !x.holdLine || x.suppressed) return x;
    const b = visibleBodies()[0] ?? bodies[0];
    if (!b) return x;
    const edges = bodyEdges(b.geometry, b.id);
    const hold = matchEdge(edges, x.holdLine);
    const edge = x.edges.length ? matchEdge(edges, x.edges[0]) : null;
    const r = !hold ? 'The hold line is no longer on the body.' : !edge ? 'Select the two faces to fillet.' : holdLineRadius(edge, hold);
    if (typeof r === 'string') { holdLineErrors[x.id] = r; return x; }
    return { ...x, size: r };
  };
  const tick = () => {
    if (overBudget()) throw new RebuildStopped();
  };
  const ctx: RebuildCtx = {
    doc, bodies, errors, warnings: seed?.warnings ?? {}, consumedSketches: seed?.consumedSketches ?? new Set<Id>(), curves, surfaceBodies, splits,
    history, bodyMeta, bendCounts: seed?.bendCounts ?? {}, hiddenIds, autoHidden, approxBodies, K, addMaterial, removeMaterial, addBoss,
    newBody, nameBody, exactOf, setExact, visibleBodies, isEmpty, sheet: seed?.sheet ?? null, unfolded: seed?.unfolded ?? false,
    extraAppearances, splitCounts, times: seed?.times ?? {}, featureTools, shapes, toolOf, moved, allVisible, holdLineErrors, sizedByHoldLine,
    tick, checkpoint: () => checkpoint(ctx),
  };
  return ctx;
}

/** the bodies, their B-rep solids and the history as they are now; the function returned puts them back */
function checkpoint(ctx: RebuildCtx): () => void {
  const { bodies, surfaceBodies, shapes, history } = ctx;
  const list = bodies.slice(), surf = surfaceBodies.slice();
  const each = [...list, ...surf].map((b) => ({ b, geometry: b.geometry, featureIds: b.featureIds.slice(), shape: shapes.get(b) }));
  const boss = history.boss, cuts = history.cuts.slice();
  const counts = { curves: ctx.curves.length, extra: ctx.extraAppearances.length, autoHidden: ctx.autoHidden.length };
  const splits = new Map(ctx.splits), meta = new Set(Object.keys(ctx.bodyMeta)), splitCounts = { ...ctx.splitCounts };
  const hidden = new Set(ctx.hiddenIds);
  const sheet = ctx.sheet ? { ...ctx.sheet, extensions: ctx.sheet.extensions.slice() } : null, unfolded = ctx.unfolded;
  return () => {
    bodies.splice(0, bodies.length, ...list);
    surfaceBodies.splice(0, surfaceBodies.length, ...surf);
    for (const e of each) {
      e.b.geometry = e.geometry;
      e.b.featureIds = e.featureIds;
      if (e.shape) shapes.set(e.b, e.shape);
      else shapes.delete(e.b);
    }
    history.boss = boss;
    history.cuts = cuts;
    ctx.curves.length = counts.curves;
    ctx.extraAppearances.length = counts.extra;
    ctx.autoHidden.length = counts.autoHidden;
    ctx.hiddenIds.clear();
    for (const id of hidden) ctx.hiddenIds.add(id);
    ctx.splits.clear();
    for (const [k, v] of splits) ctx.splits.set(k, v);
    for (const k of Object.keys(ctx.bodyMeta)) if (!meta.has(k)) delete ctx.bodyMeta[k];
    for (const k of Object.keys(ctx.splitCounts)) delete ctx.splitCounts[k];
    Object.assign(ctx.splitCounts, splitCounts);
    ctx.sheet = sheet;
    ctx.unfolded = unfolded;
  };
}
