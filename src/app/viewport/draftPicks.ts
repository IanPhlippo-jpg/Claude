import { useStore } from '../store';
import { edgeRef } from '../../core/features/edgesets';

/**
 * Clicks in the graphics area that fill the list of a feature being made: Composite Curve takes a model edge,
 * Delete/Keep Body a body (adds it, or takes it off again). True when the click was used.
 */
export function pickForDraft(edgeAt: () => string | null, faceAt: () => { bodyId: string } | null): boolean {
  const st = useStore.getState();
  const d = st.featureEdit?.draft;
  if (d?.type === 'compositeCurve') {
    const id = edgeAt();
    const e = id ? st.rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === id) : undefined;
    if (e) st.updateFeatureDraft({ edges: [...d.edges, edgeRef(e)] });
    return true;
  }
  if (d?.type === 'deleteBody') {
    const face = faceAt();
    if (face) st.updateFeatureDraft({ bodies: d.bodies.includes(face.bodyId) ? d.bodies.filter((x) => x !== face.bodyId) : [...d.bodies, face.bodyId] });
    return true;
  }
  return false;
}
