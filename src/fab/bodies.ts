/**
 * The bodies the workshop works on (docs/36 2.3, O-1, P-10): every body of a part, and of an assembly every component
 * once, counted like the BOM (a suppressed or envelope component does not count). The example models are built by
 * generators as plain extrusions that merge into one welded body; the recognition needs the pieces, so a part without
 * frame or sheet metal features is rebuilt once with every boss extrusion kept as its own body (Merge result off).
 */
import type { Document, Feature } from '../core/document/types';
import { rebuildDocument, type RebuildResult } from '../core/features/rebuild';
import type { PlanarFace } from '../core/features/solid';
import { bomPartNumber, documentForConfiguration } from '../core/document/configurations';
import { geometryHash, soup } from './geom';

export interface FabBody {
  /** unique within the document: component path + body id */
  key: string;
  part: string;
  bodyId: string;
  path: string[];
  /** the name of the feature that made the body (the generators name each piece: "Langsligger") */
  naam: string;
  aantal: number;
  soup: Float64Array;
  faces: PlanarFace[];
  hash: string;
  meta?: NonNullable<RebuildResult['bodyMeta']>[string];
  materiaal: string;
  dichtheid: number;
  /** custom property fab.soort of the part (koop, profiel, plaat): wins over the recognition */
  eigenschap?: string;
  /** the part is sheet metal (Base Flange or Convert to Sheet Metal) with this thickness */
  sheet?: { t: number; doc: Document };
  exact: boolean;
  /** the rebuild of the part gave errors: the body may be incomplete (docs/37 B-10) */
  warning?: string;
}

const SHEET_TYPES = new Set(['baseFlange', 'convertSheet', 'insertBends', 'sweptFlange']);
const FRAME_TYPES = new Set(['structuralMember', 'weldment']);

/** a part with every boss extrusion as a body of its own (frames and sheet metal stay as they are built) */
export function splitForRecognition(doc: Document): Document {
  if (doc.features.some((f) => SHEET_TYPES.has(f.type) || FRAME_TYPES.has(f.type))) return doc;
  return { ...doc, features: doc.features.map((f) => (f.type === 'extrude' && f.op === 'boss' && f.merge !== false ? { ...f, merge: false } as Feature : f)) };
}

const sheetOf = (doc: Document): FabBody['sheet'] => (doc.features.some((f) => !f.suppressed && SHEET_TYPES.has(f.type)) ? { t: doc.sheetMetal?.thickness ?? 3, doc } : undefined);

/** the bodies of one part document */
export function partBodies(doc: Document, path: string[] = [], aantal = 1, rebuild: (d: Document) => RebuildResult = rebuildDocument): FabBody[] {
  const r = rebuild(splitForRecognition(doc));
  const names = new Map(doc.features.map((f) => [f.id, f.name]));
  const sheet = sheetOf(doc);
  const mat = doc.material;
  const prop = doc.properties?.['fab.soort'];
  const errs = Object.values(r.errors ?? {});
  // a warning that the geometry itself is wrong (an open mesh) counts as an error for the flat (docs/37 N-11); the
  // note that a body has no exact B-rep version does not
  const open = Object.values(r.warnings ?? {}).filter((w) => /not closed|opening/i.test(w));
  return r.bodies.map((b) => {
    const s = soup(b.geometry);
    return {
      key: [...path, b.id].join('/'),
      part: doc.name,
      bodyId: b.id,
      path,
      naam: names.get(b.featureIds[0]) ?? b.id,
      aantal,
      soup: s,
      faces: b.faces,
      hash: geometryHash(s),
      meta: r.bodyMeta?.[b.id],
      materiaal: mat?.name ?? '',
      dichtheid: mat?.density ?? 7850,
      eigenschap: typeof prop === 'string' ? prop : undefined,
      sheet,
      exact: !!b.exact,
      ...(errs.length ? { warning: `herbouw met fouten: ${errs[0]}` } : open.length ? { warning: `herbouw met waarschuwing: ${open[0]}` } : {}),
    };
  });
}

/** the bodies of a part or an assembly (each different component once, with its count) */
export function documentBodies(doc: Document, rebuild?: (d: Document) => RebuildResult): FabBody[] {
  if (doc.kind !== 'assembly') return partBodies(doc, [], 1, rebuild);
  const groups = new Map<string, { part: Document; ids: string[] }>();
  const walk = (d: Document, path: string[]) => {
    for (const c of d.components ?? []) {
      if (c.suppressed || c.envelope) continue;
      if (c.part.kind === 'assembly') { walk(c.part, [...path, c.id]); continue; }
      const k = `${bomPartNumber(c.part, c.configuration)}|${c.configuration ?? ''}`;
      const g = groups.get(k);
      if (g) g.ids.push([...path, c.id].join('/'));
      else groups.set(k, { part: c.configuration ? documentForConfiguration(c.part, c.configuration) : c.part, ids: [[...path, c.id].join('/')] });
    }
  };
  walk(doc, []);
  // each component in its own configuration (docs/37 B-10)
  return [...groups.values()].flatMap((g) => partBodies(g.part, g.ids[0].split('/'), g.ids.length, rebuild));
}

/** one hash over all bodies: a result made from another hash is out of date (F0-6) */
export function documentHash(bodies: FabBody[]): string {
  return geometryHash(new Float64Array(0), bodies.map((b) => `${b.key}:${b.hash}:${b.aantal}`).join('|'));
}
