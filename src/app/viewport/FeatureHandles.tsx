import type * as THREE from 'three';
import { HandleLayer } from './handles/HandleLayer';

/**
 * Drag Handles on the model (QA 0.5.11 P2-6, docs/32 item 6): the end faces of extrusions (Blind, Mid Plane,
 * Direction 2, thin, cuts, Offset From Surface), the edges of an extrusion's sketch, and the main value of fillets,
 * chamfers, revolves, shells, drafts, holes, patterns and ribs. See handles/ for the parts: which handles show
 * (modelHandles.ts), the drag with its ruler, snapping and undo step (HandleLayer.tsx).
 */
export function ModelHandles({ project }: { project: (v: THREE.Vector3) => { x: number; y: number } }) {
  return <HandleLayer project={project} />;
}
