import type { Document } from '../document/types';
import type { Body } from './rebuild';

/**
 * Face appearances of a document matched to the faces of rebuilt bodies: same orientation, same plane
 * (or surface) and the nearest centroid. Returns bodyId -> faceId -> colour.
 */
export function matchFaceAppearances(doc: Pick<Document, 'faceAppearances'>, bodies: Body[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const fa of doc.faceAppearances ?? []) {
    let best: { body: string; face: string; d: number } | null = null;
    for (const b of bodies) {
      for (const f of b.faces) {
        const dot = f.normal[0] * fa.normal[0] + f.normal[1] * fa.normal[1] + f.normal[2] * fa.normal[2];
        if (dot < 0.995) continue;
        const d = Math.hypot(f.centroid[0] - fa.point[0], f.centroid[1] - fa.point[1], f.centroid[2] - fa.point[2]);
        const off = Math.abs((fa.point[0] - f.centroid[0]) * f.normal[0] + (fa.point[1] - f.centroid[1]) * f.normal[1] + (fa.point[2] - f.centroid[2]) * f.normal[2]);
        if (!f.curved && off > 1e-3) continue;
        if (!best || d < best.d) best = { body: b.id, face: f.id, d };
      }
    }
    if (best) (out[best.body] ??= {})[best.face] = fa.color;
  }
  return out;
}
