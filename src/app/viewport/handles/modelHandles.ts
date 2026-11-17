import * as THREE from 'three';
import type { Document } from '../../../core/document/types';
import type { RebuildResult } from '../../../core/features/rebuild';
import type { ModelHandle } from './handleMath';
import { endHandle, endOfFace, extrudeEndsOf } from './extrudeHandles';
import { profileHandles } from './profileHandles';
import { valueHandles } from './valueHandles';

/**
 * Which drag handles the model shows, by design:
 * - a picked end face of an extrusion: its handle on that face (the primary one), with the other ends of the same
 *   extrusion (Mid Plane: both faces; Direction 2: its end);
 * - a picked side face of an extrusion whose sketch line lies under it: the handle that moves that line;
 * - a feature selected in the tree: an extrusion shows all its ends and the edges of its profile; other features the
 *   handle of their main value (valueHandles.ts).
 * `layer` keeps the names the drag handles had: dragHandles for a picked face, featureHandles for a tree selection.
 */
export interface HandleSet { layer: 'dragHandles' | 'featureHandles'; handles: ModelHandle[]; featureType: string }

export function handlesFor(doc: Document, rebuild: RebuildResult, selectedFace: { bodyId: string; faceId: string } | null, selectedFeatureId: string | null): HandleSet | null {
  if (doc.kind === 'assembly' || doc.kind === 'drawing') return null;
  if (selectedFace) {
    const face = rebuild.bodies.find((b) => b.id === selectedFace.bodyId)?.faces.find((x) => x.id === selectedFace.faceId);
    if (face && !face.curved) {
      const fc = new THREE.Vector3(...face.centroid), fn = new THREE.Vector3(...face.normal).normalize();
      const hit = endOfFace(doc, face.normal, face.centroid);
      if (hit) {
        const handles = [endHandle(hit.f, hit.e, fc), ...hit.ends.filter((e) => e !== hit.e).map((e) => endHandle(hit.f, e))];
        return { layer: 'dragHandles', handles, featureType: 'extrude' };
      }
      for (let i = doc.features.length - 1; i >= 0; i--) {
        const f = doc.features[i];
        if (f.type !== 'extrude' || f.suppressed) continue;
        const side = profileHandles(doc, f, { normal: fn, point: fc });
        if (side.length) return { layer: 'dragHandles', handles: side.slice(0, 1), featureType: 'extrude' };
      }
    }
  }
  const f = selectedFeatureId ? doc.features.find((x) => x.id === selectedFeatureId) : undefined;
  if (!f || f.suppressed) return null;
  const handles = f.type === 'extrude' ? [...extrudeEndsOf(doc, f).map((e) => endHandle(f, e)), ...profileHandles(doc, f)] : valueHandles(doc, rebuild.bodies, f);
  return handles.length ? { layer: 'featureHandles', handles, featureType: f.type } : null;
}
