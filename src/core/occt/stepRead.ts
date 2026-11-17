/**
 * The exact solid of an imported STEP body (docs/32 item 5, QA F161). File ▸ Open of a STEP file keeps, per body, the
 * STEP text of that one solid in the Imported feature (`step`, written by OpenCascade in millimetres); the B-rep
 * kernel reads it back here on every rebuild, so the body has its real faces and edges (planes, cylinders, B-spline
 * surfaces) instead of the triangles. The mesh kernel keeps using the stored triangles.
 *
 * Reading is synchronous (the rebuild is): the text goes into the virtual file system of the WebAssembly module and
 * through STEPControl_Reader. A small cache keeps the solids of the last files, so a rebuild after an edit further down
 * the tree does not parse the file again; a caller gets its own handle on the cached solid, freed with the rebuild.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type OC = any;

let files = 0;
const CACHE_SIZE = 8;
const cache = new Map<string, { oc: OC; solid: any }>();

/** the first solid of a STEP text, or null when the text holds none */
export function readStepSolid(oc: OC, text: string): any | null {
  const name = `/phlippo-exact-${++files}.step`;
  oc.FS.writeFile(name, text);
  const reader = new oc.STEPControl_Reader();
  try {
    if (reader.ReadFile(name) !== oc.IFSelect_ReturnStatus.IFSelect_RetDone) return null;
    const progress = new oc.Message_ProgressRange();
    reader.TransferRoots(progress);
    progress.delete();
    const shape = reader.OneShape();
    const ex = new oc.TopExp_Explorer(shape, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    const solid = ex.More() ? oc.TopoDS.Solid(ex.Current()) : null;
    ex.delete();
    shape.delete();
    return solid;
  } finally {
    reader.delete();
    try { oc.FS.unlink(name); } catch { /* already gone */ }
  }
}

/** the solid of the text through the cache: a new handle (the caller frees it), null when the text holds no solid */
export function cachedStepSolid(oc: OC, text: string): any | null {
  let hit = cache.get(text);
  if (!hit || hit.oc !== oc) {
    const solid = readStepSolid(oc, text);
    if (!solid) return null;
    hit = { oc, solid };
    cache.set(text, hit);
    if (cache.size > CACHE_SIZE) {
      const [oldest, old] = cache.entries().next().value as [string, { solid: any }];
      cache.delete(oldest);
      old.solid.delete();
    }
  } else {
    // most recently used last
    cache.delete(text);
    cache.set(text, hit);
  }
  return oc.TopoDS.Solid(hit.solid);
}

/** a STEP text as stored in a document: line ends without carriage returns */
export function compactStep(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}
